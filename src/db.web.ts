/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Versión web de db.ts: misma API, pero los datos se guardan en el navegador (localStorage) en vez
// de SQLite, que en web depende de workers y cabeceras que no funcionan igual en todos los móviles.
// Metro elige este archivo automáticamente en web.
import {
  Gasto,
  NuevoGasto,
  Pendiente,
  Recurrente,
  Meta,
  Tipo,
  normalizar,
  fechaHoy,
  mesActual,
  mesDesplazado,
  claveRegla,
  FondosIniciales,
  leerFondos,
  sumaFondos,
  normalizarRecurrente,
} from './db-comun';

export * from './db-comun';

type Datos = {
  gastos: Gasto[];
  pendientes: Pendiente[];
  config: Record<string, string>;
  reglas: Record<string, string>;
  recurrentes: Recurrente[];
  metas: Meta[];
};

const BASE_ANTIGUA = 'balanz.db';
const PREFIJO = 'balanz:datos:';

let nombreActual = BASE_ANTIGUA;
let duenoBaseAntigua: string | null | undefined; // undefined = todavía sin consultar
let datos: Datos = cargar(BASE_ANTIGUA);

function vacio(): Datos {
  return { gastos: [], pendientes: [], config: {}, reglas: {}, recurrentes: [], metas: [] };
}

function cargar(nombre: string): Datos {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREFIJO + nombre) : null;
    if (raw) return { ...vacio(), ...JSON.parse(raw) };
  } catch {
    // datos corruptos o almacenamiento no disponible: se empieza de cero
  }
  return vacio();
}

function guardar() {
  try {
    localStorage.setItem(PREFIJO + nombreActual, JSON.stringify(datos));
  } catch {
    // almacenamiento lleno o bloqueado (p. ej. navegación privada): la app sigue funcionando en memoria
  }
}

export function initDB() {
  // Nada que crear: la estructura es un objeto JSON.
}

/** Cada cuenta tiene sus propios datos locales; ver db.ts. */
export function usarBaseDeUsuario(userId: string) {
  if (duenoBaseAntigua === undefined) {
    duenoBaseAntigua = getConfig('usuario');
    if (duenoBaseAntigua === null) {
      setConfig('usuario', userId);
      duenoBaseAntigua = userId;
    }
  }
  const destino = duenoBaseAntigua === userId ? BASE_ANTIGUA : `balanz-${userId.replace(/[^a-zA-Z0-9-]/g, '')}.db`;
  if (destino === nombreActual) return;
  nombreActual = destino;
  datos = cargar(destino);
  avisarPendientes();
}

// ───────────────────────── Gastos / ingresos ─────────────────────────

function ordenarGastos(lista: Gasto[]): Gasto[] {
  return [...lista].sort((a, b) => (a.fecha === b.fecha ? b.id.localeCompare(a.id) : b.fecha.localeCompare(a.fecha)));
}

export function getGastos(): Gasto[] {
  return ordenarGastos(datos.gastos);
}

export function insertGasto(nuevo: NuevoGasto) {
  const g = normalizar(nuevo);
  if (datos.gastos.some((x) => x.id === g.id)) throw new Error('gasto duplicado');
  datos.gastos.push(g);
  guardar();
}

export function updateGasto(nuevo: NuevoGasto) {
  const g = normalizar(nuevo);
  datos.gastos = datos.gastos.map((x) => (x.id === g.id ? g : x));
  guardar();
}

export function upsertGastoLocal(g: NuevoGasto, extendido: boolean) {
  const n = normalizar(g);
  const previo = datos.gastos.find((x) => x.id === n.id);
  if (!previo) {
    datos.gastos.push(n);
  } else if (extendido) {
    Object.assign(previo, {
      descripcion: n.descripcion, categoria: n.categoria, importe: n.importe, fecha: n.fecha, tipo: n.tipo,
      etiquetas: n.etiquetas, moneda: n.moneda, importe_original: n.importe_original, divisiones: n.divisiones,
    });
  } else {
    Object.assign(previo, { descripcion: n.descripcion, categoria: n.categoria, importe: n.importe, fecha: n.fecha });
  }
  guardar();
}

export function deleteGasto(id: string) {
  datos.gastos = datos.gastos.filter((g) => g.id !== id);
  guardar();
}

export function contarGastos(): number {
  return datos.gastos.length;
}

export function getTotalMes(mes: string, tipo: Tipo = 'gasto'): number {
  return datos.gastos.filter((g) => g.tipo === tipo && g.fecha.startsWith(mes)).reduce((s, g) => s + g.importe, 0);
}

export function getTotalMesActual(): number {
  return getTotalMes(mesActual(), 'gasto');
}

export function getIngresosMesActual(): number {
  return getTotalMes(mesActual(), 'ingreso');
}

export function getGastosPorCategoria(mes: string): { categoria: string; total: number }[] {
  const mapa = new Map<string, number>();
  datos.gastos
    .filter((g) => g.tipo === 'gasto' && g.fecha.startsWith(mes))
    .forEach((g) => mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.importe));
  return Array.from(mapa.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

export function getGastosPorCategoriaMesActual() {
  return getGastosPorCategoria(mesActual());
}

export function getTotalesUltimosMeses(n: number): { mes: string; total: number; ingresos: number }[] {
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) meses.push(mesDesplazado(-i));
  return meses.map((mes) => ({ mes, total: getTotalMes(mes, 'gasto'), ingresos: getTotalMes(mes, 'ingreso') }));
}

export function getEtiquetas(): string[] {
  const set = new Set<string>();
  datos.gastos.forEach((g) => g.etiquetas.split(',').forEach((e) => e.trim() && set.add(e.trim())));
  return Array.from(set).sort();
}

// ───────────────────────── Configuración y límites ─────────────────────────

export function getConfig(clave: string): string | null {
  return Object.prototype.hasOwnProperty.call(datos.config, clave) ? datos.config[clave] : null;
}

export function setConfig(clave: string, valor: string) {
  datos.config[clave] = valor;
  guardar();
}

export function delConfig(clave: string) {
  delete datos.config[clave];
  guardar();
}

export function getLimite(): number {
  const v = getConfig('limite_mensual');
  return v ? parseFloat(v) : 0;
}

export function setLimite(valor: number) {
  setConfig('limite_mensual', valor.toString());
}

export function getPresupuestosCategoria(): Record<string, number> {
  const r: Record<string, number> = {};
  Object.entries(datos.config)
    .filter(([k]) => k.startsWith('presupuesto:'))
    .forEach(([k, v]) => (r[k.slice('presupuesto:'.length)] = parseFloat(v)));
  return r;
}

export function setPresupuestoCategoria(categoria: string, valor: number | null) {
  if (valor === null || valor <= 0) delConfig(`presupuesto:${categoria}`);
  else setConfig(`presupuesto:${categoria}`, valor.toString());
}

// ───────────────────────── Reglas de categoría (aprendizaje) ─────────────────────────

export function aprenderRegla(descripcion: string, categoria: string) {
  const clave = claveRegla(descripcion);
  if (clave.length < 3) return;
  datos.reglas[clave] = categoria;
  guardar();
}

export function buscarRegla(descripcion: string): string | null {
  const clave = claveRegla(descripcion);
  if (clave.length < 3) return null;
  if (datos.reglas[clave]) return datos.reglas[clave];
  const parcial = Object.entries(datos.reglas).find(([k]) => clave.includes(k) || k.includes(clave));
  return parcial ? parcial[1] : null;
}

export function getReglas(): { clave: string; categoria: string }[] {
  return Object.entries(datos.reglas)
    .map(([clave, categoria]) => ({ clave, categoria }))
    .sort((a, b) => a.clave.localeCompare(b.clave));
}

export function borrarRegla(clave: string) {
  delete datos.reglas[clave];
  guardar();
}

// ───────────────────────── Pendientes (captados del banco) ─────────────────────────

const oyentesPendientes = new Set<() => void>();

export function onCambioPendientes(cb: () => void): () => void {
  oyentesPendientes.add(cb);
  return () => {
    oyentesPendientes.delete(cb);
  };
}

function avisarPendientes() {
  oyentesPendientes.forEach((cb) => cb());
}

export function getPendientes(): Pendiente[] {
  return [...datos.pendientes].sort((a, b) => (a.fecha === b.fecha ? b.id.localeCompare(a.id) : b.fecha.localeCompare(a.fecha)));
}

export function contarPendientes(): number {
  return datos.pendientes.length;
}

export function insertPendiente(p: Pendiente): boolean {
  if (datos.pendientes.some((x) => x.id === p.id)) return false;
  datos.pendientes.push(p);
  guardar();
  avisarPendientes();
  return true;
}

export function deletePendiente(id: string) {
  datos.pendientes = datos.pendientes.filter((p) => p.id !== id);
  guardar();
  avisarPendientes();
}

// ───────────────────────── Gastos recurrentes ─────────────────────────

export function getRecurrentes(): Recurrente[] {
  return datos.recurrentes.map(normalizarRecurrente).sort((a, b) => a.dia - b.dia || a.descripcion.localeCompare(b.descripcion));
}

export function insertRecurrente(r: Recurrente) {
  datos.recurrentes.push({ ...r });
  guardar();
}

export function updateRecurrente(r: Recurrente) {
  datos.recurrentes = datos.recurrentes.map((x) => (x.id === r.id ? { ...x, ...r, ultima: x.ultima } : x));
  guardar();
}

export function marcarRecurrenteGenerada(id: string, mes: string) {
  datos.recurrentes = datos.recurrentes.map((x) => (x.id === id ? { ...x, ultima: mes } : x));
  guardar();
}

export function deleteRecurrente(id: string) {
  datos.recurrentes = datos.recurrentes.filter((r) => r.id !== id);
  guardar();
}

// ───────────────────────── Metas de ahorro ─────────────────────────

export function getMetas(): Meta[] {
  return [...datos.metas].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function insertMeta(m: Meta) {
  datos.metas.push({ ...m });
  guardar();
}

export function updateMeta(m: Meta) {
  datos.metas = datos.metas.map((x) => (x.id === m.id ? { ...m } : x));
  guardar();
}

export function deleteMeta(id: string) {
  datos.metas = datos.metas.filter((m) => m.id !== id);
  guardar();
}

// ───────────────────────── Borrado total ─────────────────────────

export function borrarTodosLosDatos() {
  const usuario = datos.config['usuario'];
  datos = vacio();
  if (usuario !== undefined) datos.config['usuario'] = usuario;
  guardar();
  avisarPendientes();
}

// ───────────────────────── Dinero inicial y saldo ─────────────────────────

export function getFondosIniciales(): FondosIniciales {
  return leerFondos(getConfig('fondos_iniciales'));
}

export function setFondosIniciales(f: FondosIniciales) {
  setConfig('fondos_iniciales', JSON.stringify(f));
}

export function onboardingHecho(): boolean {
  return getConfig('onboarding') === '1';
}

export function marcarOnboarding() {
  setConfig('onboarding', '1');
}

/** Dinero inicial + todos los ingresos − todos los gastos. */
export function getSaldoTotal(): number {
  const ingresos = datos.gastos.filter((g) => g.tipo === 'ingreso').reduce((s, g) => s + g.importe, 0);
  const gastos = datos.gastos.filter((g) => g.tipo === 'gasto').reduce((s, g) => s + g.importe, 0);
  return sumaFondos(getFondosIniciales()) + ingresos - gastos;
}