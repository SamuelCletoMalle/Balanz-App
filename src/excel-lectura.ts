/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import * as XLSX from 'xlsx';
import { numeroDesdeTexto } from './captura';

// Lectura de archivos de movimientos (Excel o CSV): libros por meses con INGRESOS y GASTOS lado a lado,
// tablas planas y extractos del banco. No depende de la app, así se puede probar aparte.

const fechaHoyIso = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export type Fila = { descripcion: string; categoria?: string; importe: number; fecha: string; tipo: 'gasto' | 'ingreso'; etiquetas: string };

export const sinTildes = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

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
export function filasPorBloques(hoja: XLSX.WorkSheet, nombre: string): Fila[] {
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
        const fecha = aFecha(celda(rr, c), mesHoja) || fechaHoyIso();
        filas.push({ descripcion, importe: Math.abs(importe), fecha, tipo, etiquetas: '' });
      }
    }
  }
  return filas;
}

/** Nombres de columna aceptados (sin tildes, en minúsculas) para cada dato. */
const COLUMNAS = {
  descripcion: ['descripcion', 'concepto', 'movimiento', 'detalle', 'descripcion del movimiento', 'concepto del movimiento', 'referencia'],
  importe: ['importe', 'cantidad', 'importe (€)', 'importe eur', 'importe (eur)', 'cantidad (€)', 'monto'],
  cargo: ['cargo', 'cargos', 'debe', 'gasto', 'gastos', 'salida', 'salidas'],
  abono: ['abono', 'abonos', 'haber', 'ingreso', 'ingresos', 'entrada', 'entradas'],
  fecha: ['fecha', 'fecha operacion', 'fecha de operacion', 'fecha valor', 'f. operacion', 'f. valor', 'fecha contable', 'dia'],
  tipo: ['tipo'],
  categoria: ['categoria'],
  etiquetas: ['etiquetas'],
};

/**
 * Hoja plana: una fila por movimiento. Vale tanto para lo que exporta Balanz como para un extracto del banco
 * (importe con signo, o columnas Cargo / Abono). En un extracto, lo negativo es gasto y lo positivo ingreso.
 */
export function filasPlanas(hoja: XLSX.WorkSheet): Fila[] {
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: '', raw: true });
  const conocidas = new Set(Object.values(COLUMNAS).flat());
  // La cabecera es la primera fila con al menos dos nombres de columna conocidos (los extractos traen títulos antes).
  const filaCabecera = matriz.findIndex((fila) => fila.filter((c) => conocidas.has(sinTildes(c))).length >= 2);
  if (filaCabecera < 0) return [];
  const cabecera = matriz[filaCabecera].map((c) => String(c ?? '').trim());
  const registros: Record<string, unknown>[] = matriz.slice(filaCabecera + 1).map((fila) => {
    const o: Record<string, unknown> = {};
    cabecera.forEach((nombre, i) => {
      if (nombre) o[nombre] = fila[i];
    });
    return o;
  });
  const pick = (fila: Record<string, unknown>, claves: string[]) => {
    const k = Object.keys(fila).find((x) => claves.includes(sinTildes(x)));
    return k === undefined ? undefined : fila[k];
  };
  const numero = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (v === undefined || v === null || v === '') return 0;
    return numeroDesdeTexto(String(v).replace(/[^\d.,-]/g, '')) ?? 0;
  };
  const hayTipo = registros.some((r) => pick(r, COLUMNAS.tipo) !== undefined && String(pick(r, COLUMNAS.tipo)).trim() !== '');
  const haySignos = registros.some((r) => numero(pick(r, COLUMNAS.importe)) < 0);

  const filas: Fila[] = [];
  registros.forEach((fila) => {
    const descripcion = String(pick(fila, COLUMNAS.descripcion) ?? '').replace(/\s+/g, ' ').trim();
    const cargo = numero(pick(fila, COLUMNAS.cargo));
    const abono = numero(pick(fila, COLUMNAS.abono));
    const bruto = numero(pick(fila, COLUMNAS.importe));
    let importe = 0;
    let tipo: 'gasto' | 'ingreso' = 'gasto';
    if (cargo || abono) {
      // columnas separadas Cargo / Abono
      if (abono && !cargo) {
        importe = Math.abs(abono);
        tipo = 'ingreso';
      } else {
        importe = Math.abs(cargo || abono);
      }
    } else if (bruto) {
      importe = Math.abs(bruto);
      if (hayTipo) tipo = /ingreso/i.test(String(pick(fila, COLUMNAS.tipo) ?? '')) ? 'ingreso' : 'gasto';
      else if (haySignos) tipo = bruto > 0 ? 'ingreso' : 'gasto';
    }
    if (!descripcion || !importe) return;
    const f = pick(fila, COLUMNAS.fecha);
    const fecha = aFecha({ t: typeof f === 'number' ? 'n' : 's', v: f as string | number }, null);
    filas.push({
      descripcion,
      categoria: String(pick(fila, COLUMNAS.categoria) ?? '').trim() || undefined,
      importe,
      fecha: fecha || String(f ?? '').trim() || fechaHoyIso(),
      tipo,
      etiquetas: String(pick(fila, COLUMNAS.etiquetas) ?? '').trim(),
    });
  });
  return filas;
}

/** Hoja "Inicio": el dinero con el que empezó el año, si el libro lo trae. */
export function dineroInicioDeAnio(libro: XLSX.WorkBook): number | null {
  const hoja = libro.Sheets[libro.SheetNames.find((n) => sinTildes(n) === 'inicio') ?? ''];
  if (!hoja?.['!ref']) return null;
  const rango = XLSX.utils.decode_range(hoja['!ref']);
  for (let r = rango.s.r; r <= rango.e.r; r++) {
    const etiqueta = sinTildes((hoja[XLSX.utils.encode_cell({ r, c: 0 })] as XLSX.CellObject | undefined)?.v);
    if (etiqueta.startsWith('dinero inicio')) return aNumero(hoja[XLSX.utils.encode_cell({ r, c: 1 })] as XLSX.CellObject | undefined) || null;
  }
  return null;
}


/** Decodifica bytes de un CSV: UTF-8 si es válido y, si no (muchos bancos), Latin-1. */
export function decodificarTexto(bytes: Uint8Array): string {
  try {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    // no es UTF-8
  }
  let t = '';
  for (let i = 0; i < bytes.length; i++) t += String.fromCharCode(bytes[i]);
  return t;
}

/** Los CSV se leen "en crudo": así 05/03/2026 es 5 de marzo y -12,50 es -12,50, no una fecha ni un millar de otro país. */
export function leerCsv(texto: string): XLSX.WorkBook {
  return XLSX.read(texto.replace(/^\uFEFF/, ''), { type: 'string', raw: true });
}

export function parecenCsv(nombre?: string | null, mime?: string | null): boolean {
  return /\.(csv|txt)$/i.test(nombre ?? '') || /csv|text\/plain/i.test(mime ?? '');
}
