/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import * as SQLite from 'expo-sqlite';
import { Gasto, NuevoGasto, Pendiente, Recurrente, Meta, Tipo, FondosIniciales, normalizar, fechaHoy, mesActual, mesDesplazado, claveRegla, leerFondos, sumaFondos } from './db-comun';

export * from './db-comun';

const BASE_ANTIGUA = 'balanz.db';

let nombreActual = BASE_ANTIGUA;
let duenoBaseAntigua: string | null | undefined; // undefined = todavía sin consultar
let actual: SQLite.SQLiteDatabase = SQLite.openDatabaseSync(BASE_ANTIGUA);

// El resto de la app usa `db` como siempre; por debajo apunta a la base del usuario con sesión.
export const db: SQLite.SQLiteDatabase = new Proxy({} as SQLite.SQLiteDatabase, {
  get(_, prop) {
    const valor = (actual as unknown as Record<string | symbol, unknown>)[prop];
    return typeof valor === 'function' ? valor.bind(actual) : valor;
  },
});

/**
 * Cada cuenta tiene su propia base local, así varias personas pueden usar el mismo móvil o navegador
 * sin pisarse ni perder sus datos. La base antigua (`balanz.db`) se queda con el primer usuario que
 * entre, para no perder nada de quien ya usaba la app.
 */
export function usarBaseDeUsuario(userId: string) {
  if (duenoBaseAntigua === undefined) {
    // Primera llamada: la base abierta es la antigua. Si nadie la reclamó, es de este usuario.
    initDB();
    duenoBaseAntigua = getConfig('usuario');
    if (duenoBaseAntigua === null) {
      setConfig('usuario', userId);
      duenoBaseAntigua = userId;
    }
  }
  const destino = duenoBaseAntigua === userId ? BASE_ANTIGUA : `balanz-${userId.replace(/[^a-zA-Z0-9-]/g, '')}.db`;
  if (destino === nombreActual) return;
  try {
    actual.closeSync();
  } catch {
    // si no se puede cerrar no pasa nada, simplemente se abre la otra
  }
  actual = SQLite.openDatabaseSync(destino);
  nombreActual = destino;
  initDB();
  avisarPendientes();
}

// ───────────────────────── Esquema ─────────────────────────

function columnas(tabla: string): string[] {
  return db.getAllSync<{ name: string }>(`PRAGMA table_info(${tabla});`).map((c) => c.name);
}

function anadirColumna(tabla: string, existentes: string[], nombre: string, definicion: string) {
  if (!existentes.includes(nombre)) db.execSync(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${definicion};`);
}

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY NOT NULL,
      descripcion TEXT NOT NULL,
      categoria TEXT NOT NULL,
      importe REAL NOT NULL,
      fecha TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pendientes (
      id TEXT PRIMARY KEY NOT NULL,
      texto TEXT NOT NULL,
      importe REAL,
      comercio TEXT NOT NULL,
      categoria TEXT NOT NULL,
      fecha TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY NOT NULL,
      valor TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reglas (
      clave TEXT PRIMARY KEY NOT NULL,
      categoria TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recurrentes (
      id TEXT PRIMARY KEY NOT NULL,
      descripcion TEXT NOT NULL,
      categoria TEXT NOT NULL,
      importe REAL NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'gasto',
      dia INTEGER NOT NULL,
      ultima TEXT NOT NULL DEFAULT '',
      activo INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS metas (
      id TEXT PRIMARY KEY NOT NULL,
      nombre TEXT NOT NULL,
      objetivo REAL NOT NULL,
      ahorrado REAL NOT NULL DEFAULT 0,
      icono TEXT NOT NULL DEFAULT 'flag-outline'
    );
  `);

  const cg = columnas('gastos');
  anadirColumna('gastos', cg, 'tipo', "TEXT NOT NULL DEFAULT 'gasto'");
  anadirColumna('gastos', cg, 'etiquetas', "TEXT NOT NULL DEFAULT ''");
  anadirColumna('gastos', cg, 'moneda', "TEXT NOT NULL DEFAULT 'EUR'");
  anadirColumna('gastos', cg, 'importe_original', 'REAL');
  anadirColumna('gastos', cg, 'divisiones', "TEXT NOT NULL DEFAULT ''");
  anadirColumna('gastos', cg, 'foto', "TEXT NOT NULL DEFAULT ''");

  const cp = columnas('pendientes');
  anadirColumna('pendientes', cp, 'tipo', "TEXT NOT NULL DEFAULT 'gasto'");
}

initDB();

// ───────────────────────── Gastos / ingresos ─────────────────────────

export function getGastos(): Gasto[] {
  return db.getAllSync<Gasto>('SELECT * FROM gastos ORDER BY fecha DESC, id DESC;');
}

export function insertGasto(nuevo: NuevoGasto) {
  const g = normalizar(nuevo);
  db.runSync(
    `INSERT INTO gastos (id, descripcion, categoria, importe, fecha, tipo, etiquetas, moneda, importe_original, divisiones, foto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    g.id, g.descripcion, g.categoria, g.importe, g.fecha, g.tipo, g.etiquetas, g.moneda, g.importe_original, g.divisiones, g.foto
  );
}

export function updateGasto(nuevo: NuevoGasto) {
  const g = normalizar(nuevo);
  db.runSync(
    `UPDATE gastos SET descripcion = ?, categoria = ?, importe = ?, fecha = ?, tipo = ?, etiquetas = ?, moneda = ?,
       importe_original = ?, divisiones = ?, foto = ? WHERE id = ?;`,
    g.descripcion, g.categoria, g.importe, g.fecha, g.tipo, g.etiquetas, g.moneda, g.importe_original, g.divisiones, g.foto, g.id
  );
}

/** Inserta o actualiza un gasto que viene de la nube (no toca la foto local). */
export function upsertGastoLocal(g: NuevoGasto, extendido: boolean) {
  const n = normalizar(g);
  if (extendido) {
    db.runSync(
      `INSERT INTO gastos (id, descripcion, categoria, importe, fecha, tipo, etiquetas, moneda, importe_original, divisiones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET descripcion=excluded.descripcion, categoria=excluded.categoria, importe=excluded.importe,
         fecha=excluded.fecha, tipo=excluded.tipo, etiquetas=excluded.etiquetas, moneda=excluded.moneda,
         importe_original=excluded.importe_original, divisiones=excluded.divisiones;`,
      n.id, n.descripcion, n.categoria, n.importe, n.fecha, n.tipo, n.etiquetas, n.moneda, n.importe_original, n.divisiones
    );
  } else {
    db.runSync(
      `INSERT INTO gastos (id, descripcion, categoria, importe, fecha) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET descripcion=excluded.descripcion, categoria=excluded.categoria, importe=excluded.importe, fecha=excluded.fecha;`,
      n.id, n.descripcion, n.categoria, n.importe, n.fecha
    );
  }
}

export function deleteGasto(id: string) {
  db.runSync('DELETE FROM gastos WHERE id = ?;', id);
}

export function contarGastos(): number {
  const fila = db.getFirstSync<{ total: number }>('SELECT COUNT(*) as total FROM gastos;');
  return fila?.total ?? 0;
}

export function getTotalMes(mes: string, tipo: Tipo = 'gasto'): number {
  const r = db.getFirstSync<{ total: number | null }>(
    'SELECT SUM(importe) as total FROM gastos WHERE tipo = ? AND fecha LIKE ?;',
    tipo, `${mes}%`
  );
  return r?.total ?? 0;
}

export function getTotalMesActual(): number {
  return getTotalMes(mesActual(), 'gasto');
}

export function getIngresosMesActual(): number {
  return getTotalMes(mesActual(), 'ingreso');
}

export function getGastosPorCategoria(mes: string): { categoria: string; total: number }[] {
  return db.getAllSync<{ categoria: string; total: number }>(
    "SELECT categoria, SUM(importe) as total FROM gastos WHERE tipo = 'gasto' AND fecha LIKE ? GROUP BY categoria ORDER BY total DESC;",
    `${mes}%`
  );
}

export function getGastosPorCategoriaMesActual() {
  return getGastosPorCategoria(mesActual());
}

export function getTotalesUltimosMeses(n: number): { mes: string; total: number; ingresos: number }[] {
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) meses.push(mesDesplazado(-i));
  const filas = db.getAllSync<{ mes: string; tipo: string; total: number }>(
    'SELECT substr(fecha, 1, 7) as mes, tipo, SUM(importe) as total FROM gastos GROUP BY mes, tipo;'
  );
  return meses.map((mes) => ({
    mes,
    total: filas.find((f) => f.mes === mes && f.tipo === 'gasto')?.total ?? 0,
    ingresos: filas.find((f) => f.mes === mes && f.tipo === 'ingreso')?.total ?? 0,
  }));
}

export function getEtiquetas(): string[] {
  const filas = db.getAllSync<{ etiquetas: string }>("SELECT DISTINCT etiquetas FROM gastos WHERE etiquetas != '';");
  const set = new Set<string>();
  filas.forEach((f) => f.etiquetas.split(',').forEach((e) => e.trim() && set.add(e.trim())));
  return Array.from(set).sort();
}

// ───────────────────────── Configuración y límites ─────────────────────────

export function getConfig(clave: string): string | null {
  return db.getFirstSync<{ valor: string }>('SELECT valor FROM config WHERE clave = ?;', clave)?.valor ?? null;
}

export function setConfig(clave: string, valor: string) {
  db.runSync(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor;',
    clave, valor
  );
}

export function delConfig(clave: string) {
  db.runSync('DELETE FROM config WHERE clave = ?;', clave);
}

export function getLimite(): number {
  const v = getConfig('limite_mensual');
  return v ? parseFloat(v) : 0;
}

export function setLimite(valor: number) {
  setConfig('limite_mensual', valor.toString());
}

export function getPresupuestosCategoria(): Record<string, number> {
  const filas = db.getAllSync<{ clave: string; valor: string }>("SELECT clave, valor FROM config WHERE clave LIKE 'presupuesto:%';");
  const r: Record<string, number> = {};
  filas.forEach((f) => (r[f.clave.slice('presupuesto:'.length)] = parseFloat(f.valor)));
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
  db.runSync(
    'INSERT INTO reglas (clave, categoria) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET categoria = excluded.categoria;',
    clave, categoria
  );
}

export function buscarRegla(descripcion: string): string | null {
  const clave = claveRegla(descripcion);
  if (clave.length < 3) return null;
  const exacta = db.getFirstSync<{ categoria: string }>('SELECT categoria FROM reglas WHERE clave = ?;', clave);
  if (exacta) return exacta.categoria;
  const todas = db.getAllSync<{ clave: string; categoria: string }>('SELECT clave, categoria FROM reglas;');
  const parcial = todas.find((r) => clave.includes(r.clave) || r.clave.includes(clave));
  return parcial?.categoria ?? null;
}

export function getReglas(): { clave: string; categoria: string }[] {
  return db.getAllSync<{ clave: string; categoria: string }>('SELECT clave, categoria FROM reglas ORDER BY clave;');
}

export function borrarRegla(clave: string) {
  db.runSync('DELETE FROM reglas WHERE clave = ?;', clave);
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
  return db.getAllSync<Pendiente>('SELECT * FROM pendientes ORDER BY fecha DESC, id DESC;');
}

export function contarPendientes(): number {
  const fila = db.getFirstSync<{ total: number }>('SELECT COUNT(*) as total FROM pendientes;');
  return fila?.total ?? 0;
}

export function insertPendiente(p: Pendiente): boolean {
  const r = db.runSync(
    'INSERT OR IGNORE INTO pendientes (id, texto, importe, comercio, categoria, fecha, tipo) VALUES (?, ?, ?, ?, ?, ?, ?);',
    p.id, p.texto, p.importe, p.comercio, p.categoria, p.fecha, p.tipo
  );
  if (r.changes > 0) avisarPendientes();
  return r.changes > 0;
}

export function deletePendiente(id: string) {
  db.runSync('DELETE FROM pendientes WHERE id = ?;', id);
  avisarPendientes();
}

// ───────────────────────── Gastos recurrentes ─────────────────────────

export function getRecurrentes(): Recurrente[] {
  return db.getAllSync<Recurrente>('SELECT * FROM recurrentes ORDER BY dia, descripcion;');
}

export function insertRecurrente(r: Recurrente) {
  db.runSync(
    'INSERT INTO recurrentes (id, descripcion, categoria, importe, tipo, dia, ultima, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
    r.id, r.descripcion, r.categoria, r.importe, r.tipo, r.dia, r.ultima, r.activo
  );
}

export function updateRecurrente(r: Recurrente) {
  db.runSync(
    'UPDATE recurrentes SET descripcion = ?, categoria = ?, importe = ?, tipo = ?, dia = ?, activo = ? WHERE id = ?;',
    r.descripcion, r.categoria, r.importe, r.tipo, r.dia, r.activo, r.id
  );
}

export function marcarRecurrenteGenerada(id: string, mes: string) {
  db.runSync('UPDATE recurrentes SET ultima = ? WHERE id = ?;', mes, id);
}

export function deleteRecurrente(id: string) {
  db.runSync('DELETE FROM recurrentes WHERE id = ?;', id);
}

// ───────────────────────── Metas de ahorro ─────────────────────────

export function getMetas(): Meta[] {
  return db.getAllSync<Meta>('SELECT * FROM metas ORDER BY nombre;');
}

export function insertMeta(m: Meta) {
  db.runSync(
    'INSERT INTO metas (id, nombre, objetivo, ahorrado, icono) VALUES (?, ?, ?, ?, ?);',
    m.id, m.nombre, m.objetivo, m.ahorrado, m.icono
  );
}

export function updateMeta(m: Meta) {
  db.runSync('UPDATE metas SET nombre = ?, objetivo = ?, ahorrado = ?, icono = ? WHERE id = ?;', m.nombre, m.objetivo, m.ahorrado, m.icono, m.id);
}

export function deleteMeta(id: string) {
  db.runSync('DELETE FROM metas WHERE id = ?;', id);
}

// ───────────────────────── Borrado total ─────────────────────────

export function borrarTodosLosDatos() {
  db.execSync(`
    DELETE FROM gastos;
    DELETE FROM pendientes;
    DELETE FROM config WHERE clave != 'usuario';
    DELETE FROM reglas;
    DELETE FROM recurrentes;
    DELETE FROM metas;
  `);
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
  const filas = db.getAllSync<{ tipo: string; total: number | null }>('SELECT tipo, SUM(importe) as total FROM gastos GROUP BY tipo;');
  const ingresos = filas.find((f) => f.tipo === 'ingreso')?.total ?? 0;
  const gastos = filas.find((f) => f.tipo === 'gasto')?.total ?? 0;
  return sumaFondos(getFondosIniciales()) + ingresos - gastos;
}