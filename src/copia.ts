/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  getGastos,
  getMetas,
  getRecurrentes,
  getReglas,
  getFondosIniciales,
  getLimite,
  getPresupuestosCategoria,
  setFondosIniciales,
  setLimite,
  setPresupuestoCategoria,
  sumaFondos,
  upsertGastoLocal,
  insertMeta,
  updateMeta,
  insertRecurrente,
  updateRecurrente,
  aprenderRegla,
  fechaHoy,
  normalizarMeta,
  normalizarRecurrente,
} from './db';
import { categoriasExtraJson, reemplazarCategoriasExtra } from './categorias';
import { subirGastoANube, subirPerfil } from './sync';

export type Copia = {
  app: 'balanz';
  version: 1;
  fecha: string;
  gastos: ReturnType<typeof getGastos>;
  metas: ReturnType<typeof getMetas>;
  recurrentes: ReturnType<typeof getRecurrentes>;
  reglas: ReturnType<typeof getReglas>;
  ajustes: {
    fondos: ReturnType<typeof getFondosIniciales>;
    limite: number;
    presupuestos: Record<string, number>;
    categorias: { nombre: string; icono: string; color: string }[];
  };
};

/** Todo lo de la cuenta en un solo objeto: movimientos, metas, recurrentes, reglas y ajustes. */
export function crearCopia(): Copia {
  return {
    app: 'balanz',
    version: 1,
    fecha: new Date().toISOString(),
    gastos: getGastos(),
    metas: getMetas(),
    recurrentes: getRecurrentes(),
    reglas: getReglas(),
    ajustes: {
      fondos: getFondosIniciales(),
      limite: getLimite(),
      presupuestos: getPresupuestosCategoria(),
      categorias: JSON.parse(categoriasExtraJson()),
    },
  };
}

export async function exportarCopia(): Promise<void> {
  const texto = JSON.stringify(crearCopia(), null, 2);
  const nombre = `balanz-copia-${fechaHoy()}.json`;
  if (Platform.OS === 'web') {
    const blob = new Blob([texto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  const ruta = FileSystem.cacheDirectory + nombre;
  await FileSystem.writeAsStringAsync(ruta, texto);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(ruta, { mimeType: 'application/json', dialogTitle: 'Guardar copia de seguridad' });
  }
}

export type ResultadoRestauracion = { gastos: number; metas: number; recurrentes: number; reglas: number };

/** Valida el contenido de un archivo de copia. Lanza un error con un mensaje claro si no sirve. */
export function leerCopia(texto: string): Copia {
  let c: Partial<Copia>;
  try {
    c = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es una copia de Balanz (no se puede leer).');
  }
  if (c.app !== 'balanz' || c.version !== 1 || !Array.isArray(c.gastos)) {
    throw new Error('El archivo no es una copia de Balanz.');
  }
  return {
    app: 'balanz',
    version: 1,
    fecha: c.fecha ?? '',
    gastos: c.gastos,
    metas: Array.isArray(c.metas) ? c.metas : [],
    recurrentes: Array.isArray(c.recurrentes) ? c.recurrentes : [],
    reglas: Array.isArray(c.reglas) ? c.reglas : [],
    ajustes: {
      fondos: c.ajustes?.fondos ?? { efectivo: 0, banco: 0, ahorros: 0 },
      limite: c.ajustes?.limite ?? 0,
      presupuestos: c.ajustes?.presupuestos ?? {},
      categorias: c.ajustes?.categorias ?? [],
    },
  };
}

/** Mezcla la copia con lo que ya hay: lo que existe se actualiza y lo que falta se añade. No borra nada. */
export async function restaurarCopia(c: Copia): Promise<ResultadoRestauracion> {
  const res: ResultadoRestauracion = { gastos: 0, metas: 0, recurrentes: 0, reglas: 0 };

  for (const g of c.gastos) {
    if (!g || !g.id || !g.descripcion || !(Number(g.importe) > 0) || !g.fecha) continue;
    upsertGastoLocal(g, true);
    subirGastoANube(g).catch(() => {});
    res.gastos++;
  }

  const metasActuales = new Set(getMetas().map((m) => m.id));
  for (const m of c.metas) {
    if (!m || !m.id || !m.nombre) continue;
    const meta = normalizarMeta(m);
    if (metasActuales.has(meta.id)) updateMeta(meta);
    else insertMeta(meta);
    res.metas++;
  }

  const recActuales = new Set(getRecurrentes().map((r) => r.id));
  for (const r of c.recurrentes) {
    if (!r || !r.id || !r.descripcion) continue;
    const rec = normalizarRecurrente(r);
    if (recActuales.has(rec.id)) updateRecurrente(rec);
    else insertRecurrente(rec);
    res.recurrentes++;
  }

  for (const r of c.reglas) {
    if (!r || !r.clave || !r.categoria) continue;
    aprenderRegla(r.clave, r.categoria);
    res.reglas++;
  }

  const a = c.ajustes;
  if (sumaFondos(getFondosIniciales()) === 0 && sumaFondos(a.fondos) > 0) setFondosIniciales(a.fondos);
  if (!getLimite() && a.limite > 0) setLimite(a.limite);
  Object.entries(a.presupuestos).forEach(([cat, v]) => Number(v) > 0 && setPresupuestoCategoria(cat, Number(v)));
  if (a.categorias.length) {
    const propias = JSON.parse(categoriasExtraJson()) as { nombre: string }[];
    const nuevas = a.categorias.filter((x) => !propias.some((p) => p.nombre.toLowerCase() === x.nombre.toLowerCase()));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reemplazarCategoriasExtra([...(propias as any[]), ...(nuevas as any[])]);
  }
  subirPerfil().catch(() => {});
  return res;
}

export async function elegirYRestaurarCopia(): Promise<ResultadoRestauracion | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  const uri = r.assets[0].uri;
  const texto = Platform.OS === 'web' ? await (await fetch(uri)).text() : await FileSystem.readAsStringAsync(uri);
  return restaurarCopia(leerCopia(texto));
}
