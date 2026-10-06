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
} from './db';
import { interpretarTexto } from './captura';

const COLS_BASE = 'id, descripcion, categoria, importe, fecha';
const COLS_EXT = `${COLS_BASE}, tipo, etiquetas, moneda, importe_original, divisiones`;

// Si la nube todavía no tiene las columnas nuevas (migración SQL sin ejecutar) se sigue
// sincronizando solo lo básico, sin romper nada.
let nubeExtendida = true;

async function usuarioId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function descargarGastosDeLaNube(): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;

  let extendido = true;
  let res = await supabase.from('gastos').select(COLS_EXT).eq('user_id', userId);
  if (res.error) {
    extendido = false;
    res = (await supabase.from('gastos').select(COLS_BASE).eq('user_id', userId)) as typeof res;
  }
  if (res.error || !res.data) return;
  nubeExtendida = extendido;

  (res.data as unknown as Record<string, unknown>[]).forEach((f) => {
    upsertGastoLocal(
      {
        id: f.id as string,
        descripcion: f.descripcion as string,
        categoria: f.categoria as string,
        importe: Number(f.importe),
        fecha: f.fecha as string,
        ...(extendido
          ? {
              tipo: (f.tipo as Gasto['tipo']) ?? 'gasto',
              etiquetas: (f.etiquetas as string) ?? '',
              moneda: (f.moneda as string) ?? 'EUR',
              importe_original: f.importe_original == null ? null : Number(f.importe_original),
              divisiones: (f.divisiones as string) ?? '',
            }
          : {}),
      },
      extendido
    );
  });
}

export async function subirGastoANube(nuevo: NuevoGasto): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;
  const g = normalizar(nuevo);

  const base = {
    id: g.id,
    user_id: userId,
    descripcion: g.descripcion,
    categoria: g.categoria,
    importe: g.importe,
    fecha: g.fecha,
  };

  if (nubeExtendida) {
    const { error } = await supabase.from('gastos').upsert({
      ...base,
      tipo: g.tipo,
      etiquetas: g.etiquetas,
      moneda: g.moneda,
      importe_original: g.importe_original,
      divisiones: g.divisiones,
    });
    if (!error) return;
    nubeExtendida = false;
  }
  await supabase.from('gastos').upsert(base);
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

/**
 * Deja el perfil igual en todos los dispositivos: si la nube ya tiene uno, manda la nube (dinero inicial, límite);
 * si no tiene ninguno y este dispositivo ya hizo el alta, lo sube desde aquí.
 */
export async function sincronizarPerfil(): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;
  const { data, error } = await supabase
    .from('perfiles')
    .select('fondos, onboarding, limite')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return;
  if (!data) {
    if (onboardingHecho()) await subirPerfil().catch(() => {});
    return;
  }
  if (!data.onboarding) return;
  setFondosIniciales(leerFondos(data.fondos as string | null));
  const limite = Number(data.limite);
  if (limite > 0) setLimite(limite);
  if (!onboardingHecho()) marcarOnboarding();
}

export async function subirPerfil(): Promise<void> {
  const userId = await usuarioId();
  if (!userId) return;
  await supabase.from('perfiles').upsert({
    user_id: userId,
    fondos: JSON.stringify(getFondosIniciales()),
    onboarding: true,
    limite: getLimite() || null,
  });
}
