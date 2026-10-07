/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Aviso de errores: cuando la app falla en el móvil de alguien, el fallo llega a una tabla de Supabase para poder
// verlo y arreglarlo. Solo se manda el mensaje, el lugar del fallo y la plataforma: nunca movimientos ni importes.
// Si la tabla no existe todavía (supabase/errores.sql), no pasa nada.
const VERSION_APP = '1.0.0';
const vistos = new Set<string>();
let enviados = 0;

export async function registrarError(error: unknown, origen = 'app') {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const clave = `${e.message}`.slice(0, 120);
    if (vistos.has(clave) || enviados >= 5) return; // evita inundar con el mismo fallo
    vistos.add(clave);
    enviados++;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // la tabla solo admite avisos de cuentas con sesión
    await supabase.from('errores').insert({
      mensaje: e.message.slice(0, 500),
      pila: (e.stack ?? '').slice(0, 2000),
      origen,
      plataforma: Platform.OS,
      version: VERSION_APP,
    });
  } catch {
    // el aviso de errores nunca debe provocar otro error
  }
}

/** Engancha los errores no controlados (en web y en móvil). Se llama una vez al arrancar. */
export function vigilarErrores() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => {
      registrarError(ev.error ?? ev.message, 'window');
    });
    window.addEventListener('unhandledrejection', (ev) => {
      registrarError(ev.reason, 'promesa');
    });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils = (globalThis as any).ErrorUtils;
  if (utils?.setGlobalHandler) {
    const anterior = utils.getGlobalHandler?.();
    utils.setGlobalHandler((error: unknown, esFatal?: boolean) => {
      registrarError(error, esFatal ? 'fatal' : 'js');
      anterior?.(error, esFatal);
    });
  }
}
