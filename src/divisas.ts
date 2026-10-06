/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MONEDAS = ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'JPY', 'CAD', 'AUD'] as const;

export const SIMBOLOS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', MXN: 'MX$', JPY: '¥', CAD: 'C$', AUD: 'A$',
};

type Tasas = { fecha: string; tasas: Record<string, number> };

const CLAVE = 'balanz:tasas';
// Respaldo aproximado por si nunca ha habido conexión (1 EUR = X moneda).
const RESPALDO: Record<string, number> = { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.95, MXN: 20, JPY: 165, CAD: 1.48, AUD: 1.65 };

async function leerCache(): Promise<Tasas | null> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Tasas) : null;
  } catch {
    return null;
  }
}

/** Tasas de cambio con base EUR (Banco Central Europeo vía frankfurter.dev), con caché diaria. */
export async function obtenerTasas(): Promise<Tasas> {
  const hoy = new Date().toISOString().slice(0, 10);
  const cache = await leerCache();
  if (cache && cache.fecha === hoy) return cache;

  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${MONEDAS.filter((m) => m !== 'EUR').join(',')}`);
    if (r.ok) {
      const json = await r.json();
      const nuevo: Tasas = { fecha: hoy, tasas: { EUR: 1, ...json.rates } };
      await AsyncStorage.setItem(CLAVE, JSON.stringify(nuevo));
      return nuevo;
    }
  } catch {
    // sin conexión: se usa la última caché o el respaldo
  }
  return cache ?? { fecha: 'aprox.', tasas: RESPALDO };
}

export async function convertirAEuros(importe: number, moneda: string): Promise<number> {
  if (moneda === 'EUR') return importe;
  const { tasas } = await obtenerTasas();
  const tasa = tasas[moneda] ?? RESPALDO[moneda] ?? 1;
  return Math.round((importe / tasa) * 100) / 100;
}
