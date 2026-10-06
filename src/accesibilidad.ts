/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ModoTema = 'sistema' | 'claro' | 'oscuro';
export type TamanoTexto = 'normal' | 'grande' | 'muygrande';

export type Preferencias = {
  tema: ModoTema;
  tamanoTexto: TamanoTexto;
  altoContraste: boolean;
  reducirMovimiento: boolean;
};

export const ESCALAS: Record<TamanoTexto, number> = { normal: 1, grande: 1.2, muygrande: 1.4 };

const CLAVE = 'balanz:accesibilidad';
const POR_DEFECTO: Preferencias = { tema: 'sistema', tamanoTexto: 'normal', altoContraste: false, reducirMovimiento: false };

// Las preferencias son del dispositivo (no de la cuenta) para que también valgan en la pantalla de login.
let actuales: Preferencias = { ...POR_DEFECTO };
const oyentes = new Set<() => void>();
let cargadas = false;

function emitir() {
  oyentes.forEach((cb) => cb());
}

async function cargar() {
  if (cargadas) return;
  cargadas = true;
  try {
    const raw = await AsyncStorage.getItem(CLAVE);
    if (raw) {
      actuales = { ...POR_DEFECTO, ...JSON.parse(raw) };
      emitir();
    }
  } catch {
    // sin almacenamiento: se usan los valores por defecto
  }
}

export function getPreferencias(): Preferencias {
  return actuales;
}

export function cambiarPreferencias(cambio: Partial<Preferencias>) {
  actuales = { ...actuales, ...cambio };
  emitir();
  AsyncStorage.setItem(CLAVE, JSON.stringify(actuales)).catch(() => {});
}

export function usePreferencias(): Preferencias {
  const [, forzar] = useState(0);
  useEffect(() => {
    cargar();
    const cb = () => forzar((n) => n + 1);
    oyentes.add(cb);
    return () => {
      oyentes.delete(cb);
    };
  }, []);
  return actuales;
}
