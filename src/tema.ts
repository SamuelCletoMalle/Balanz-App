/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useColorScheme } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { usePreferencias, getPreferencias } from './accesibilidad';

export type IconoNombre = keyof typeof Ionicons.glyphMap;

// Colores elegidos para que el texto blanco sobre ellos cumpla el contraste AA (4,5:1).
export type Categoria = { nombre: string; icono: IconoNombre; color: string };

export const CATEGORIAS_BASE: Categoria[] = [
  { nombre: 'Alimentación', icono: 'cart-outline', color: '#15803d' },
  { nombre: 'Transporte', icono: 'car-outline', color: '#1d4ed8' },
  { nombre: 'Suscripciones', icono: 'repeat-outline', color: '#7e22ce' },
  { nombre: 'Salud', icono: 'medkit-outline', color: '#b91c1c' },
  { nombre: 'Ocio', icono: 'game-controller-outline', color: '#b45309' },
  { nombre: 'Vivienda', icono: 'home-outline', color: '#0f766e' },
  { nombre: 'Otros', icono: 'ellipsis-horizontal-circle-outline', color: '#475569' },
];
// Categorías propias de la cuenta (se cargan desde categorias.ts). "Otros" siempre va la última.
let categoriasExtra: Categoria[] = [];

export function setCategoriasExtra(lista: Categoria[]) {
  categoriasExtra = lista;
}

export function getCategorias(): Categoria[] {
  const otros = CATEGORIAS_BASE[CATEGORIAS_BASE.length - 1];
  return [...CATEGORIAS_BASE.slice(0, -1), ...categoriasExtra, otros];
}

export function infoCategoria(nombre: string): Categoria {
  const todas = getCategorias();
  return todas.find((c) => c.nombre === nombre) ?? todas[todas.length - 1];
}

const claro = {
  fondo: '#f4f5f9',
  tarjeta: '#ffffff',
  tarjetaSuave: '#eceef5',
  texto: '#0f172a',
  textoSuave: '#556073',
  borde: '#d9dce6',
  primario: '#4f46e5',
  primarioTexto: '#ffffff',
  peligro: '#dc2626',
  exito: '#15803d',
  aviso: '#b45309',
  sombra: '#0f172a',
};

const oscuro: typeof claro = {
  fondo: '#0b1020',
  tarjeta: '#151b2f',
  tarjetaSuave: '#1d2540',
  texto: '#f1f5f9',
  textoSuave: '#a3b1c6',
  borde: '#2c3659',
  primario: '#818cf8',
  primarioTexto: '#0b1020',
  peligro: '#f87171',
  exito: '#4ade80',
  aviso: '#fbbf24',
  sombra: '#000000',
};

// Alto contraste: negro sobre blanco (o al revés) y bordes marcados.
const claroContraste: typeof claro = {
  fondo: '#ffffff',
  tarjeta: '#ffffff',
  tarjetaSuave: '#e5e7eb',
  texto: '#000000',
  textoSuave: '#1f2937',
  borde: '#000000',
  primario: '#312e81',
  primarioTexto: '#ffffff',
  peligro: '#991b1b',
  exito: '#14532d',
  aviso: '#78350f',
  sombra: '#000000',
};

const oscuroContraste: typeof claro = {
  fondo: '#000000',
  tarjeta: '#000000',
  tarjetaSuave: '#1f2937',
  texto: '#ffffff',
  textoSuave: '#e5e7eb',
  borde: '#ffffff',
  primario: '#c7d2fe',
  primarioTexto: '#000000',
  peligro: '#fca5a5',
  exito: '#86efac',
  aviso: '#fde68a',
  sombra: '#000000',
};

export type Tema = typeof claro;

export function useEsOscuro(): boolean {
  const sistema = useColorScheme();
  const { tema } = usePreferencias();
  return tema === 'sistema' ? sistema === 'dark' : tema === 'oscuro';
}

export function useTema(): Tema {
  const oscuroActivo = useEsOscuro();
  const { altoContraste } = usePreferencias();
  if (altoContraste) return oscuroActivo ? oscuroContraste : claroContraste;
  return oscuroActivo ? oscuro : claro;
}
/** Importe en euros. En modo privado se oculta (••••) para poder enseñar el móvil sin enseñar el dinero. */
export function formatoEuro(n: number): string {
  if (getPreferencias().ocultarImportes) return '•••• €';
  return formatoEuroReal(n);
}

/** Igual, pero siempre con la cifra (informes y archivos que se exportan). */
export function formatoEuroReal(n: number): string {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatoFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (iso === hoyIso) return 'Hoy';
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  const ayerIso = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
  if (iso === ayerIso) return 'Ayer';
  return `${d} ${MESES_CORTOS[m - 1]}${y !== hoy.getFullYear() ? ` ${y}` : ''}`;
}
