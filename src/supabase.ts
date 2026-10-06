/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Los datos de conexión viven en el entorno (.env en local, variables de Vercel en la web), no en el código.
// La clave es la "publishable" de Supabase: va en la app por diseño y la protección real son las políticas RLS (supabase/seguridad.sql).
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY: copia .env.example a .env y rellénalos.');
}

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'sin-clave', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
