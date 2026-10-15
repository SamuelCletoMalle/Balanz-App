/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

/**
 * A dónde vuelve el usuario al abrir el enlace de un correo (confirmar cuenta, recuperar contraseña, cambiar correo).
 * En la web es la propia página; en el móvil, el esquema `balanz://`. Esta dirección tiene que estar en la lista de
 * "Redirect URLs" de Supabase (Authentication → URL Configuration).
 */
export function urlRedireccion(): string {
  if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.location.origin : '';
  return Linking.createURL('/');
}

export function correoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim());
}

/** La misma regla que el servidor: mínimo 10 caracteres, con letras y números. Devuelve el motivo o null si vale. */
export function problemaContrasena(contrasena: string): string | null {
  if (contrasena.length < 10) return 'La contraseña necesita al menos 10 caracteres.';
  if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) return 'Mezcla letras y números en la contraseña.';
  return null;
}

/** Los errores de Supabase vienen en inglés: aquí se pasan a frases que se entienden. */
export function traducirError(mensaje: string | undefined | null): string {
  const m = (mensaje ?? '').toLowerCase();
  if (!m) return 'Ha pasado algo inesperado. Inténtalo de nuevo.';
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (m.includes('email not confirmed')) return 'Aún no has confirmado tu correo. Abre el enlace que te enviamos (mira también en spam).';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera la contraseña.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes') || m.includes('for security')) return 'Has hecho demasiados intentos. Espera unos minutos y vuelve a probar.';
  if (m.includes('same password') || m.includes('different from the old')) return 'La nueva contraseña tiene que ser distinta de la anterior.';
  if (m.includes('password should') || m.includes('weak password') || m.includes('at least')) return 'La contraseña es demasiado débil: mínimo 10 caracteres, con letras y números.';
  if (m.includes('expired') || m.includes('invalid or has expired') || m.includes('otp') || m.includes('invalid token')) return 'El enlace ha caducado o ya se usó. Pide uno nuevo.';
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('invalid email')) return 'Ese correo no parece válido.';
  if (m.includes('network') || m.includes('failed to fetch') || m.includes('load failed')) return 'No hay conexión. Revisa internet y vuelve a intentarlo.';
  if (m.includes('session') && m.includes('missing')) return 'La sesión ha caducado. Vuelve a abrir el enlace del correo.';
  return mensaje as string;
}

export type EnlaceAuth = {
  tipo: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  mensaje: string | null;
};

/** Saca los datos de un enlace de Supabase: vienen detrás del # (o del ?), p. ej. `#access_token=…&type=recovery`. */
export function leerEnlace(url: string | null | undefined): EnlaceAuth | null {
  if (!url) return null;
  const partes: string[] = [];
  const almohadilla = url.indexOf('#');
  if (almohadilla >= 0) partes.push(url.slice(almohadilla + 1));
  const interrogacion = url.indexOf('?');
  if (interrogacion >= 0) partes.push(url.slice(interrogacion + 1, almohadilla >= 0 && almohadilla > interrogacion ? almohadilla : undefined));
  if (partes.length === 0) return null;
  const p = new URLSearchParams(partes.join('&'));
  const enlace: EnlaceAuth = {
    tipo: p.get('type'),
    accessToken: p.get('access_token'),
    refreshToken: p.get('refresh_token'),
    error: p.get('error_description') ?? p.get('error_code') ?? p.get('error'),
    mensaje: p.get('message'),
  };
  if (!enlace.tipo && !enlace.accessToken && !enlace.error && !enlace.mensaje) return null;
  return enlace;
}
