/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Conexión con los bancos (Open Banking, vía Enable Banking). Todo pasa por la función `banco` de Supabase: la app nunca
// ve claves del banco ni del proveedor, solo pide acciones con la sesión del usuario.
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type BancoDisponible = { nombre: string; pais: string; logo: string | null; dias: number | null };
export type CuentaBancaria = { uid: string; nombre: string; iban: string; moneda: string; saldo?: number };
export type Conexion = {
  id: string;
  banco: string;
  pais: string;
  cuentas: CuentaBancaria[];
  valido_hasta: string | null;
  estado: 'activa' | 'caducada';
  ultimo_sync: string | null;
};

/** Dirección a la que vuelve el banco tras autorizar: tiene que estar registrada en Enable Banking. */
export function direccionDeRetorno(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/bancos`;
  return 'https://balanz-app.vercel.app/bancos';
}

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('banco', { body: cuerpo });
  if (error) {
    // Cuando la función responde con un error, el mensaje útil viene en el cuerpo de la respuesta.
    let mensaje = error.message;
    if (/failed to send a request|fetch/i.test(error.message)) mensaje = 'La conexión con bancos aún no está activada en tu Supabase: falta desplegar la función «banco». Sigue docs/BANCOS.md.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') mensaje = (await ctx.json())?.error ?? mensaje;
    } catch {
      // se queda con el mensaje genérico
    }
    throw new Error(mensaje);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const listarBancos = (pais = 'ES') => llamar<{ bancos: BancoDisponible[] }>({ accion: 'bancos', pais }).then((r) => r.bancos);
export const empezarConexion = (b: BancoDisponible) =>
  llamar<{ url: string }>({ accion: 'conectar', banco: b.nombre, pais: b.pais, redirect: direccionDeRetorno() }).then((r) => r.url);
export const confirmarConexion = (code: string, state: string) =>
  llamar<{ ok: boolean; banco: string; cuentas: number; nuevos: number }>({ accion: 'confirmar', code, state });
export const sincronizarBancos = () => llamar<{ nuevos: number; avisos: string[] }>({ accion: 'sincronizar' });
export const desconectarBanco = (id: string) => llamar<{ ok: boolean }>({ accion: 'desconectar', id });

export async function listarConexiones(): Promise<Conexion[]> {
  const { data, error } = await supabase
    .from('banco_conexiones')
    .select('id, banco, pais, cuentas, valido_hasta, estado, ultimo_sync')
    .order('creado', { ascending: true });
  // Sin la tabla (supabase/bancos.sql sin ejecutar) simplemente no hay bancos conectados.
  if (error || !data) return [];
  return data as Conexion[];
}

/** Días que le quedan al permiso del banco (negativo si ya caducó). */
export function diasRestantes(c: Pick<Conexion, 'valido_hasta'>): number | null {
  if (!c.valido_hasta) return null;
  return Math.ceil((new Date(c.valido_hasta).getTime() - Date.now()) / 86400000);
}

let ultimoRepaso = 0;
/** Trae los movimientos nuevos de los bancos conectados, como mucho una vez cada 10 minutos (el banco limita las consultas). */
export async function repasarBancos(forzar = false): Promise<number> {
  if (!forzar && Date.now() - ultimoRepaso < 10 * 60 * 1000) return 0;
  ultimoRepaso = Date.now();
  const conexiones = await listarConexiones();
  if (conexiones.length === 0) return 0;
  const r = await sincronizarBancos();
  return r.nuevos;
}
