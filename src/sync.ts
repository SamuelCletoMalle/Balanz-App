/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { supabase } from './supabase';
import {
  Gasto,
  NuevoGasto,
  fechaHoy,
  getGastos,
  insertPendiente,
  normalizar,
  buscarRegla,
  upsertGastoLocal,
  getFondosIniciales,
  setFondosIniciales,
  onboardingHecho,
  marcarOnboarding,
  getLimite,
  setLimite,
  leerFondos,
  getPresupuestosCategoria,
  setPresupuestoCategoria,
  deleteGasto,
  getConfig,
  setConfig,
  getMetas,
  insertMeta,
  updateMeta,
  deleteMeta,
  getRecurrentes,
  insertRecurrente,
  updateRecurrente,
  deleteRecurrente,
  getReglas,
  aprenderRegla,
  borrarRegla,
  normalizarMeta,
  normalizarRecurrente,
} from './db';
import { categoriasExtraJson, reemplazarCategoriasExtra } from './categorias';
import { interpretarTexto } from './captura';
import type { Categoria } from './tema';

const COLS_BASE = 'id, descripcion, categoria, importe, fecha';
const COLS_EXT = `${COLS_BASE}, tipo, etiquetas, moneda, importe_original, divisiones`;
const COLS_CUENTA = `${COLS_EXT}, cuenta`;

// Si la nube todavía no tiene las columnas nuevas (migración SQL sin ejecutar) se sigue
// sincronizando solo lo básico, sin romper nada.
let nubeNivel: 0 | 1 | 2 = 2;

async function usuarioId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// PostgREST devuelve como mucho 1000 filas por petición: se pide por páginas para no dar por borrado lo que no llegó.
const PAGINA = 1000;

async function leerTodosLosGastos(columnas: string, userId: string) {
  const filas: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase.from('gastos').select(columnas).eq('user_id', userId).order('id').range(desde, desde + PAGINA - 1);
    if (error) return { error, filas: null };
    const trozo = (data ?? []) as unknown as Record<string, unknown>[];
    filas.push(...trozo);
    if (trozo.length < PAGINA) break;
  }
  return { error: null, filas };
}

// Ids que ya se sabe que están en la nube. Sirve para distinguir "lo he creado aquí y aún no se ha subido"
// de "lo han borrado desde otro dispositivo".
const CLAVE_IDS = 'sync_ids';

function idsSincronizados(): Set<string> {
  try {
    const lista = JSON.parse(getConfig(CLAVE_IDS) ?? '[]');
    return new Set(Array.isArray(lista) ? (lista as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Deja este dispositivo igual que la nube: baja lo nuevo y lo modificado, quita lo que se borró en otro dispositivo
 * y sube lo que se creó aquí sin conexión.
 */
export async function descargarGastosDeLaNube(): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;

  // Según lo que tenga la tabla en la nube: 2 = con cuenta, 1 = con tipo/etiquetas/divisas, 0 = lo básico.
  let nivel: 0 | 1 | 2 = 2;
  let filas: Record<string, unknown>[] | null = null;
  for (const [columnas, n] of [
    [COLS_CUENTA, 2],
    [COLS_EXT, 1],
    [COLS_BASE, 0],
  ] as const) {
    const r = await leerTodosLosGastos(columnas, userId);
    if (!r.error && r.filas) {
      filas = r.filas;
      nivel = n;
      break;
    }
  }
  if (!filas) return;
  nubeNivel = nivel;

  const remotos = new Set<string>();
  filas.forEach((f) => {
    remotos.add(f.id as string);
    upsertGastoLocal(
      {
        id: f.id as string,
        descripcion: f.descripcion as string,
        categoria: f.categoria as string,
        importe: Number(f.importe),
        fecha: f.fecha as string,
        ...(nivel >= 1
          ? {
              tipo: (f.tipo as Gasto['tipo']) ?? 'gasto',
              etiquetas: (f.etiquetas as string) ?? '',
              moneda: (f.moneda as string) ?? 'EUR',
              importe_original: f.importe_original == null ? null : Number(f.importe_original),
              divisiones: (f.divisiones as string) ?? '',
            }
          : {}),
        ...(nivel === 2 ? { cuenta: (f.cuenta as string) || 'banco' } : {}),
      },
      nivel >= 1
    );
  });

  const conocidos = idsSincronizados();
  // Si la nube no devuelve nada pero aquí había datos sincronizados, es más probable un fallo que un borrado total.
  const puedeBorrar = remotos.size > 0 || conocidos.size === 0;
  const subidos: string[] = [];
  for (const g of getGastos()) {
    if (remotos.has(g.id)) continue;
    if (conocidos.has(g.id)) {
      if (puedeBorrar) deleteGasto(g.id);
      else subidos.push(g.id);
      continue;
    }
    if (await subirGastoANube(g).catch(() => false)) subidos.push(g.id);
  }
  setConfig(CLAVE_IDS, JSON.stringify([...remotos, ...subidos]));
}

export async function subirGastoANube(nuevo: NuevoGasto): Promise<boolean> {
  const userId = await usuarioId();
  if (!userId) return false;
  const g = normalizar(nuevo);

  const base = {
    id: g.id,
    user_id: userId,
    descripcion: g.descripcion,
    categoria: g.categoria,
    importe: g.importe,
    fecha: g.fecha,
  };
  const ext = {
    ...base,
    tipo: g.tipo,
    etiquetas: g.etiquetas,
    moneda: g.moneda,
    importe_original: g.importe_original,
    divisiones: g.divisiones,
  };

  if (nubeNivel === 2) {
    const { error } = await supabase.from('gastos').upsert({ ...ext, cuenta: g.cuenta });
    if (!error) return true;
    nubeNivel = 1;
  }
  if (nubeNivel === 1) {
    const { error } = await supabase.from('gastos').upsert(ext);
    if (!error) return true;
    nubeNivel = 0;
  }
  const { error } = await supabase.from('gastos').upsert(base);
  return !error;
}

export async function borrarGastoDeLaNube(id: string): Promise<void> {
  await supabase.from('gastos').delete().eq('id', id);
}

export async function borrarTodosLosGastosDeLaNube(): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;
  const { error } = await supabase.from('gastos').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function obtenerTokenCaptacion(): Promise<string> {
  const userId = await usuarioId();
  if (!userId) throw new Error('Sin sesión');

  const existente = await supabase
    .from('captacion_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle();
  if (existente.error) throw existente.error;
  if (existente.data) return existente.data.token as string;

  const creado = await supabase
    .from('captacion_tokens')
    .insert({ user_id: userId })
    .select('token')
    .single();
  if (creado.error) throw creado.error;
  return creado.data.token as string;
}

/** Recoge los avisos enviados por los Atajos y los convierte en pendientes. Devuelve cuántos nuevos hay. */
export async function sincronizarCaptaciones(): Promise<number> {
  const userId = await usuarioId();
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('captaciones')
    .select('id, texto, creado')
    .eq('user_id', userId)
    .order('creado', { ascending: true });
  if (error || !data) return 0;

  let nuevos = 0;
  for (const fila of data) {
    const c = interpretarTexto(fila.texto ?? '');
    const f = new Date(fila.creado);
    const creado = insertPendiente({
      id: fila.id,
      texto: fila.texto ?? '',
      importe: c.importe,
      comercio: c.comercio,
      categoria: (c.comercio && buscarRegla(c.comercio)) || c.categoria,
      tipo: c.esIngreso ? 'ingreso' : 'gasto',
      fecha: Number.isNaN(f.getTime())
        ? fechaHoy()
        : `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`,
    });
    if (creado) nuevos++;
    await supabase.from('captaciones').delete().eq('id', fila.id);
  }
  return nuevos;
}

export async function subirTodosLosGastosLocales(): Promise<void> {
  for (const g of getGastos()) {
    await subirGastoANube(g);
  }
}

// ───────────────────────── Perfil (dinero inicial y límite) ─────────────────────────
// Se guarda también en la nube para no volver a pedir el alta en otro dispositivo.
// Si la tabla `perfiles` no existe todavía (supabase/perfil.sql sin ejecutar), todo sigue funcionando en local.

type Ajustes = {
  categorias: Categoria[];
  presupuestos: Record<string, number>;
  metas: ReturnType<typeof getMetas>;
  recurrentes: ReturnType<typeof getRecurrentes>;
  reglas: { clave: string; categoria: string }[];
  limite: number;
  fondos: ReturnType<typeof getFondosIniciales>;
};

/** Todo lo que viaja con la cuenta además de los movimientos, en un orden fijo para poder compararlo. */
function ajustesActuales(): Ajustes {
  return {
    categorias: JSON.parse(categoriasExtraJson()),
    presupuestos: getPresupuestosCategoria(),
    metas: [...getMetas()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    recurrentes: [...getRecurrentes()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    reglas: [...getReglas()].sort((a, b) => (a.clave < b.clave ? -1 : 1)),
    limite: getLimite(),
    fondos: getFondosIniciales(),
  };
}

/** JSON con las claves ordenadas: dos objetos iguales dan siempre el mismo texto. */
function canonico(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val as object).sort(([a], [b]) => (a < b ? -1 : 1))) : val
  );
}

function ajustesJson(): string {
  return canonico(ajustesActuales());
}

/** Iguala una lista local a la de la nube. Con `reemplazar` se borra lo que ya no está; si no, solo se mezcla. */
function igualarLista<T>(
  remotos: T[],
  locales: T[],
  clave: (x: T) => string,
  guardar: (x: T, existe: boolean) => void,
  borrar: (x: T) => void,
  reemplazar: boolean
) {
  const claves = new Set(remotos.map(clave));
  const existentes = new Set(locales.map(clave));
  remotos.forEach((r) => guardar(r, existentes.has(clave(r))));
  if (reemplazar) locales.forEach((l) => !claves.has(clave(l)) && borrar(l));
}

function aplicarAjustes(a: Partial<Ajustes>, reemplazar: boolean) {
  if (Array.isArray(a.categorias)) reemplazarCategoriasExtra(a.categorias);
  if (a.presupuestos && typeof a.presupuestos === 'object') {
    const remotos = a.presupuestos as Record<string, number>;
    Object.keys(getPresupuestosCategoria()).forEach((k) => {
      if (!(k in remotos)) setPresupuestoCategoria(k, null);
    });
    Object.entries(remotos).forEach(([k, v]) => Number(v) > 0 && setPresupuestoCategoria(k, Number(v)));
  }
  if (typeof a.limite === 'number' && a.limite > 0) setLimite(a.limite);
  if (a.fondos && typeof a.fondos === 'object') setFondosIniciales(leerFondos(JSON.stringify(a.fondos)));
  if (Array.isArray(a.metas)) {
    igualarLista(
      a.metas.filter((m) => m && m.id && m.nombre).map(normalizarMeta),
      getMetas(),
      (m) => m.id,
      (m, existe) => (existe ? updateMeta(m) : insertMeta(m)),
      (m) => deleteMeta(m.id),
      reemplazar
    );
  }
  if (Array.isArray(a.recurrentes)) {
    igualarLista(
      a.recurrentes.filter((r) => r && r.id && r.descripcion).map(normalizarRecurrente),
      getRecurrentes(),
      (r) => r.id,
      (r, existe) => (existe ? updateRecurrente(r) : insertRecurrente(r)),
      (r) => deleteRecurrente(r.id),
      reemplazar
    );
  }
  if (Array.isArray(a.reglas)) {
    igualarLista(
      a.reglas.filter((r) => r && r.clave && r.categoria),
      getReglas(),
      (r) => r.clave,
      (r) => aprenderRegla(r.clave, r.categoria),
      (r) => borrarRegla(r.clave),
      reemplazar
    );
  }
}

// Último estado de los ajustes que este dispositivo y la nube tenían igual. Sirve para saber quién ha cambiado qué.
const CLAVE_BASE = 'ajustes_base';

/**
 * Deja el perfil igual en todos los dispositivos. Si aquí no ha cambiado nada desde la última vez, manda la nube
 * (dinero inicial, límite, categorías, presupuestos, metas, recurrentes y reglas); si aquí hay cambios sin subir,
 * se suben. Devuelve true si ha cambiado algo en este dispositivo.
 */
export async function sincronizarPerfil(): Promise<boolean> {
  const userId = await usuarioId();
  if (!userId) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any = await supabase.from('perfiles').select('fondos, onboarding, limite, ajustes').eq('user_id', userId).maybeSingle();
  // Si la columna "ajustes" aún no existe en la nube, se sigue con lo básico.
  if (res.error) res = await supabase.from('perfiles').select('fondos, onboarding, limite').eq('user_id', userId).maybeSingle();
  const { data, error } = res;
  if (error) return false;
  if (!data) {
    if (onboardingHecho()) await subirPerfil().catch(() => {});
    return false;
  }
  if (!data.onboarding) return false;

  const antes = ajustesJson();
  const base = getConfig(CLAVE_BASE);
  if (base !== null && antes !== base) {
    // Hay cambios hechos aquí que la nube aún no tiene: se suben.
    await subirPerfil().catch(() => {});
    return false;
  }

  let remoto: Partial<Ajustes> = {};
  try {
    const crudo = typeof data.ajustes === 'string' ? JSON.parse(data.ajustes) : data.ajustes;
    if (crudo && typeof crudo === 'object') remoto = crudo as Partial<Ajustes>;
  } catch {
    // ajustes ilegibles: se usan solo las columnas básicas
  }
  if (remoto.fondos === undefined) remoto.fondos = leerFondos(data.fondos as string | null);
  if (remoto.limite === undefined && Number(data.limite) > 0) remoto.limite = Number(data.limite);

  // Primera vez en este dispositivo (sin base): se mezcla en vez de reemplazar, para no perder lo que solo había aquí.
  aplicarAjustes(remoto, base !== null);
  if (!onboardingHecho()) marcarOnboarding();
  if (base === null) await subirPerfil().catch(() => {});
  else setConfig(CLAVE_BASE, ajustesJson());
  return ajustesJson() !== antes;
}

export async function subirPerfil(): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;
  const base = {
    user_id: userId,
    fondos: JSON.stringify(getFondosIniciales()),
    onboarding: true,
    limite: getLimite() || null,
  };
  const json = ajustesJson();
  const { error } = await supabase.from('perfiles').upsert({ ...base, ajustes: json });
  if (error) {
    await supabase.from('perfiles').upsert(base);
    return;
  }
  setConfig(CLAVE_BASE, json);
}

function firma(): string {
  return canonico([getGastos().map((g) => [g.id, g.descripcion, g.categoria, g.importe, g.fecha, g.tipo, g.cuenta, g.etiquetas]), ajustesActuales()]);
}

/** Pone al día movimientos y ajustes con la nube. Devuelve true si ha cambiado algo en este dispositivo. */
export async function sincronizarTodo(): Promise<boolean> {
  const antes = firma();
  await descargarGastosDeLaNube().catch(() => {});
  await sincronizarPerfil().catch(() => {});
  return firma() !== antes;
}
