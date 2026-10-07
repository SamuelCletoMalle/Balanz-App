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

/** Las categorías usan tonos oscuros (para llevar texto blanco encima); sobre fondo oscuro se mezclan con blanco para que el icono se vea. */
export function tintaCategoria(color: string, oscuro: boolean): string {
  if (!oscuro || !/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const mezcla = (i: number) => Math.round(parseInt(color.slice(i, i + 2), 16) * 0.45 + 255 * 0.55).toString(16).padStart(2, '0');
  return `#${mezcla(1)}${mezcla(3)}${mezcla(5)}`;
}

export function infoCategoria(nombre: string): Categoria {
  const todas = getCategorias();
  return todas.find((c) => c.nombre === nombre) ?? todas[todas.length - 1];
}

// Marca: negro profundo + lima eléctrica (el color del logo). En claro, la lima va de acento y la tinta es casi negra,
// porque la lima sobre blanco no cumple el contraste AA; en oscuro la lima es el primario.
export type Tema = {
  /** Nivel 0: fondo de la pantalla. */
  fondo: string;
  /** Nivel 1: tarjetas. */
  tarjeta: string;
  /** Nivel 2: elementos dentro de una tarjeta (campos, chips). */
  tarjetaSuave: string;
  /** Nivel 3: hojas, menús y todo lo que flota. */
  elevada: string;
  texto: string;
  textoSuave: string;
  borde: string;
  primario: string;
  primarioTexto: string;
  /** Lima de la marca, igual en claro y en oscuro (para destacar, nunca como texto sobre claro). */
  acento: string;
  acentoTexto: string;
  peligro: string;
  exito: string;
  aviso: string;
  sombra: string;
  /** Degradado de las tarjetas de marca (saldo, splash). */
  marca: [string, string];
  /** Color del texto sobre el degradado de marca. */
  marcaTexto: string;
  /** Fondo translúcido para barras y hojas de vidrio. */
  vidrio: string;
  oscuro: boolean;
};

const claro: Tema = {
  fondo: '#f5f5f2',
  tarjeta: '#ffffff',
  tarjetaSuave: '#eeeeea',
  elevada: '#ffffff',
  texto: '#0a0a0a',
  textoSuave: '#5b5b56',
  borde: '#e1e1db',
  primario: '#18181b',
  primarioTexto: '#ffffff',
  acento: '#bef264',
  acentoTexto: '#0a0a0a',
  peligro: '#dc2626',
  exito: '#15803d',
  aviso: '#b45309',
  sombra: '#0a0a0a',
  marca: ['#d9f99d', '#bef264'],
  marcaTexto: '#0a0a0a',
  vidrio: 'rgba(255,255,255,0.78)',
  oscuro: false,
};

const oscuro: Tema = {
  fondo: '#09090b',
  tarjeta: '#141416',
  tarjetaSuave: '#1e1e22',
  elevada: '#1a1a1e',
  texto: '#fafafa',
  textoSuave: '#a1a1aa',
  borde: '#27272a',
  primario: '#bef264',
  primarioTexto: '#0a0a0a',
  acento: '#bef264',
  acentoTexto: '#0a0a0a',
  peligro: '#fb7185',
  exito: '#4ade80',
  aviso: '#fbbf24',
  sombra: '#000000',
  marca: ['#d9f99d', '#bef264'],
  marcaTexto: '#0a0a0a',
  vidrio: 'rgba(20,20,22,0.74)',
  oscuro: true,
};

// Alto contraste: negro sobre blanco (o al revés) y bordes marcados.
const claroContraste: Tema = {
  ...claro,
  fondo: '#ffffff',
  tarjetaSuave: '#e5e7eb',
  textoSuave: '#1f2937',
  borde: '#000000',
  primario: '#000000',
  peligro: '#991b1b',
  exito: '#14532d',
  aviso: '#78350f',
  sombra: '#000000',
  marca: ['#bef264', '#bef264'],
  vidrio: '#ffffff',
};

const oscuroContraste: Tema = {
  ...oscuro,
  fondo: '#000000',
  tarjeta: '#000000',
  tarjetaSuave: '#1f2937',
  elevada: '#000000',
  textoSuave: '#e5e7eb',
  borde: '#ffffff',
  primario: '#d9f99d',
  peligro: '#fca5a5',
  exito: '#86efac',
  aviso: '#fde68a',
  marca: ['#000000', '#000000'],
  marcaTexto: '#ffffff',
  vidrio: '#000000',
};

// Escalas únicas: ninguna pantalla debería escribir un número suelto de espaciado, radio o tipografía.
export const ESPACIO = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const RADIO = { campo: 14, boton: 16, chip: 999, tarjeta: 24, hoja: 28 } as const;
export const FUENTE = {
  titulo: 'Manrope_800ExtraBold',
  subtitulo: 'Manrope_700Bold',
  normal: 'Inter_400Regular',
  medio: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  negrita: 'Inter_700Bold',
} as const;
/** Sombras suaves en capas (iOS/web) más elevación en Android. */
export const SOMBRA = {
  s: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  m: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  l: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
} as const;


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
