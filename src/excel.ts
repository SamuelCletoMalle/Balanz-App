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
import { adivinarCategoria } from './captura';
import { datosDeAnio, generarLibroContabilidad } from './excel-contabilidad';
import { filasPorBloques, filasPlanas, dineroInicioDeAnio, sinTildes, leerCsv, decodificarTexto, parecenCsv, type Fila } from './excel-lectura';
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

  const archivo = resultado.assets[0];
  const esCsv = parecenCsv(archivo.name, archivo.mimeType);
  let libro: XLSX.WorkBook;
  if (esCsv) {
    // Extractos del banco en CSV: se leen como texto (UTF-8 o Latin-1) y en crudo.
    let bytes: Uint8Array;
    if (Platform.OS === 'web') {
      bytes = new Uint8Array(await (await fetch(archivo.uri)).arrayBuffer());
    } else {
      const b64 = await FileSystem.readAsStringAsync(archivo.uri, { encoding: FileSystem.EncodingType.Base64 });
      const bin = atob(b64);
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    }
    libro = leerCsv(decodificarTexto(bytes));
  } else if (Platform.OS === 'web') {
    const buffer = await (await fetch(archivo.uri)).arrayBuffer();
    libro = XLSX.read(buffer, { type: 'array' });
  } else {
    const base64 = await FileSystem.readAsStringAsync(archivo.uri, { encoding: FileSystem.EncodingType.Base64 });
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
