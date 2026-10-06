/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { Gasto, NuevoGasto, fechaHoy, getFondosIniciales, getGastos, insertGasto, setFondosIniciales, sumaFondos } from './db';
import { adivinarCategoria, numeroDesdeTexto } from './captura';
import { datosDeAnio, generarLibroContabilidad } from './excel-contabilidad';
import { subirGastoANube } from './sync';

/**
 * Exporta la contabilidad del año con el formato de siempre: hoja "Inicio" con el resumen y una hoja por mes
 * con INGRESOS a la izquierda y GASTOS a la derecha. Si hay movimientos en varios años, se exporta el año actual
 * (o el más reciente que tenga datos).
 */
export async function exportarGastosAExcel() {
  const gastos = getGastos();
  const actual = Number(fechaHoy().slice(0, 4));
  const anios = Array.from(new Set(gastos.map((g) => Number(g.fecha.slice(0, 4))).filter((n) => n > 1900)));
  const anio = anios.includes(actual) || anios.length === 0 ? actual : Math.max(...anios);
  const datos = datosDeAnio(gastos, sumaFondos(getFondosIniciales()), anio);
  const nombre = `CONTABILIDAD_${anio}.xlsx`;

  if (Platform.OS === 'web') {
    // En web no hay sistema de archivos: se descarga directamente desde el navegador.
    const blob = await generarLibroContabilidad(datos, 'blob');
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return '';
  }

  const base64 = await generarLibroContabilidad(datos, 'base64');
  const ruta = FileSystem.cacheDirectory + nombre;
  await FileSystem.writeAsStringAsync(ruta, base64, { encoding: FileSystem.EncodingType.Base64 });

  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(ruta, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar contabilidad',
    });
  }
  return ruta;
}

function esDuplicado(a: Gasto, b: { descripcion: string; importe: number; fecha: string }) {
  return (
    a.descripcion.trim().toLowerCase() === b.descripcion.trim().toLowerCase() &&
    Math.abs(a.importe - b.importe) < 0.01 &&
    a.fecha === b.fecha
  );
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

type Fila = { descripcion: string; categoria?: string; importe: number; fecha: string; tipo: 'gasto' | 'ingreso'; etiquetas: string };

const sinTildes = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

function aNumero(celda: XLSX.CellObject | undefined): number {
  if (!celda || celda.v === undefined || celda.v === null || celda.v === '') return 0;
  if (typeof celda.v === 'number') return celda.v;
  return numeroDesdeTexto(String(celda.v)) ?? 0;
}

/** Fecha de una celda (número de serie de Excel, fecha o texto) como AAAA-MM-DD. */
function aFecha(celda: XLSX.CellObject | undefined, mesHoja: number | null): string {
  if (!celda || celda.v === undefined || celda.v === '') return '';
  let y = 0;
  let m = 0;
  let d = 0;
  if (typeof celda.v === 'number') {
    const f = XLSX.SSF.parse_date_code(celda.v);
    if (!f) return '';
    y = f.y;
    m = f.m;
    d = f.d;
  } else if (celda.v instanceof Date) {
    y = celda.v.getFullYear();
    m = celda.v.getMonth() + 1;
    d = celda.v.getDate();
  } else {
    const t = String(celda.v).trim();
    const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const dm = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (iso) {
      y = +iso[1];
      m = +iso[2];
      d = +iso[3];
    } else if (dm) {
      d = +dm[1];
      m = +dm[2];
      y = +dm[3] < 100 ? 2000 + +dm[3] : +dm[3];
    } else return '';
  }
  // En un libro por meses, una fecha de otro mes suele ser un día/mes tecleado al revés: manda la hoja.
  if (mesHoja && m !== mesHoja && d >= 1 && d <= 28) m = mesHoja;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Hojas tipo "INGRESOS | GASTOS" lado a lado, con cabecera Fecha / Cantidad / Concepto. */
function filasPorBloques(hoja: XLSX.WorkSheet, nombre: string): Fila[] {
  const ref = hoja['!ref'];
  if (!ref) return [];
  const rango = XLSX.utils.decode_range(ref);
  const mesHoja = MESES.indexOf(sinTildes(nombre)) + 1 || null;
  const celda = (r: number, c: number) => hoja[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
  const filas: Fila[] = [];

  for (let r = rango.s.r; r <= rango.e.r; r++) {
    for (let c = rango.s.c; c <= rango.e.c - 2; c++) {
      if (sinTildes(celda(r, c)?.v) !== 'fecha') continue;
      if (!/cantidad|importe/.test(sinTildes(celda(r, c + 1)?.v))) continue;
      if (!/concepto|descripcion/.test(sinTildes(celda(r, c + 2)?.v))) continue;

      // El título del bloque (INGRESOS / GASTOS) está encima de la cabecera, en la misma columna.
      let tipo: 'gasto' | 'ingreso' = 'gasto';
      for (let rr = r - 1; rr >= rango.s.r; rr--) {
        const t = sinTildes(celda(rr, c)?.v);
        if (t.startsWith('ingreso')) {
          tipo = 'ingreso';
          break;
        }
        if (t.startsWith('gasto')) break;
      }

      for (let rr = r + 1; rr <= rango.e.r; rr++) {
        const importe = aNumero(celda(rr, c + 1));
        const descripcion = String(celda(rr, c + 2)?.v ?? '').replace(/\s+/g, ' ').trim();
        if (!importe || !descripcion) continue;
        const fecha = aFecha(celda(rr, c), mesHoja) || fechaHoy();
        filas.push({ descripcion, importe: Math.abs(importe), fecha, tipo, etiquetas: '' });
      }
    }
  }
  return filas;
}

/** Hoja plana, una fila por movimiento (el formato que exporta Balanz). */
function filasPlanas(hoja: XLSX.WorkSheet): Fila[] {
  const filas: Fila[] = [];
  XLSX.utils.sheet_to_json<any>(hoja).forEach((fila) => {
    const pick = (...claves: string[]) => {
      const k = Object.keys(fila).find((x) => claves.includes(sinTildes(x)));
      return k === undefined ? undefined : fila[k];
    };
    const descripcion = String(pick('descripcion', 'concepto') ?? '').trim();
    const crudo = pick('importe', 'cantidad');
    const importe = typeof crudo === 'number' ? crudo : (numeroDesdeTexto(String(crudo ?? '')) ?? 0);
    if (!descripcion || !importe) return;
    const f = pick('fecha');
    const fecha = aFecha({ t: typeof f === 'number' ? 'n' : 's', v: f }, null);
    filas.push({
      descripcion,
      categoria: String(pick('categoria') ?? '').trim() || undefined,
      importe: Math.abs(importe),
      fecha: fecha || String(f ?? '').trim() || fechaHoy(),
      tipo: /ingreso/i.test(String(pick('tipo') ?? '')) ? 'ingreso' : 'gasto',
      etiquetas: String(pick('etiquetas') ?? '').trim(),
    });
  });
  return filas;
}

/** Hoja "Inicio": el dinero con el que empezó el año, si el libro lo trae. */
function dineroInicioDeAnio(libro: XLSX.WorkBook): number | null {
  const hoja = libro.Sheets[libro.SheetNames.find((n) => sinTildes(n) === 'inicio') ?? ''];
  if (!hoja?.['!ref']) return null;
  const rango = XLSX.utils.decode_range(hoja['!ref']);
  for (let r = rango.s.r; r <= rango.e.r; r++) {
    const etiqueta = sinTildes((hoja[XLSX.utils.encode_cell({ r, c: 0 })] as XLSX.CellObject | undefined)?.v);
    if (etiqueta.startsWith('dinero inicio')) return aNumero(hoja[XLSX.utils.encode_cell({ r, c: 1 })] as XLSX.CellObject | undefined) || null;
  }
  return null;
}

export async function importarGastosDesdeExcel(): Promise<{ importados: number; duplicados: number; dineroInicial: number | null }> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
  });

  if (resultado.canceled || !resultado.assets?.[0]) {
    return { importados: 0, duplicados: 0, dineroInicial: null };
  }

  // La librería xlsx tiene avisos de seguridad con archivos manipulados: se limita el tamaño y solo se abre lo que elige el usuario.
  if ((resultado.assets[0].size ?? 0) > 5 * 1024 * 1024) throw new Error('El archivo es demasiado grande (máximo 5 MB).');

  let libro: XLSX.WorkBook;
  if (Platform.OS === 'web') {
    const buffer = await (await fetch(resultado.assets[0].uri)).arrayBuffer();
    libro = XLSX.read(buffer, { type: 'array' });
  } else {
    const base64 = await FileSystem.readAsStringAsync(resultado.assets[0].uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    libro = XLSX.read(base64, { type: 'base64' });
  }

  // Cada hoja se lee como bloques "Fecha / Cantidad / Concepto" (libro por meses) o, si no los tiene, como tabla plana.
  const filas: Fila[] = [];
  libro.SheetNames.forEach((nombre) => {
    const hoja = libro.Sheets[nombre];
    const porBloques = filasPorBloques(hoja, nombre);
    filas.push(...(porBloques.length ? porBloques : sinTildes(nombre) === 'inicio' ? [] : filasPlanas(hoja)));
  });

  // Un movimiento ya guardado cuenta como duplicado; los repetidos dentro del propio archivo son compras distintas.
  const existentes = getGastos();
  let importados = 0;
  let duplicados = 0;
  const nuevos: NuevoGasto[] = [];

  filas.forEach((fila) => {
    if (existentes.some((g) => esDuplicado(g, fila))) {
      duplicados++;
      return;
    }
    const categoria = fila.categoria ?? (fila.tipo === 'ingreso' ? 'Otros' : adivinarCategoria(fila.descripcion));
    const nuevo: NuevoGasto = {
      id: Crypto.randomUUID(),
      descripcion: fila.descripcion,
      categoria,
      importe: fila.importe,
      fecha: fila.fecha,
      tipo: fila.tipo,
      etiquetas: fila.etiquetas,
    };
    insertGasto(nuevo);
    nuevos.push(nuevo);
    importados++;
  });

  // Si el libro trae el dinero de inicio de año y aún no hay dinero inicial, se usa como punto de partida.
  let dineroInicial: number | null = null;
  const inicio = dineroInicioDeAnio(libro);
  if (inicio && importados > 0 && sumaFondos(getFondosIniciales()) === 0) {
    setFondosIniciales({ efectivo: 0, banco: inicio, ahorros: 0 });
    dineroInicial = inicio;
  }

  for (const g of nuevos) {
    await subirGastoANube(g).catch(() => {});
  }

  return { importados, duplicados, dineroInicial };
}
