/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { getConfig, setConfig } from './db';
import { Categoria, CATEGORIAS_BASE, IconoNombre, getCategorias, setCategoriasExtra } from './tema';

const CLAVE = 'categorias_extra';

// Colores elegidos para que el texto blanco encima cumpla el contraste AA.
export const COLORES_CATEGORIA = ['#15803d', '#1d4ed8', '#7e22ce', '#b91c1c', '#b45309', '#0f766e', '#be185d', '#4338ca', '#0e7490', '#a16207', '#9f1239', '#475569'];

export const ICONOS_CATEGORIA: IconoNombre[] = [
  'paw-outline', 'gift-outline', 'school-outline', 'airplane-outline', 'shirt-outline', 'fitness-outline',
  'wine-outline', 'book-outline', 'construct-outline', 'heart-outline', 'happy-outline', 'musical-notes-outline',
  'cafe-outline', 'bus-outline', 'phone-portrait-outline', 'bandage-outline', 'leaf-outline', 'briefcase-outline',
];

function leer(): Categoria[] {
  try {
    const lista = JSON.parse(getConfig(CLAVE) ?? '[]');
    return Array.isArray(lista) ? lista.filter((c) => c && typeof c.nombre === 'string' && typeof c.color === 'string') : [];
  } catch {
    return [];
  }
}

/** Carga las categorías propias de la cuenta activa (llamar tras cambiar de usuario). */
export function cargarCategoriasExtra() {
  setCategoriasExtra(leer());
}

/** Categorías propias como JSON, para la copia de seguridad y la sincronización. */
export function categoriasExtraJson(): string {
  return JSON.stringify(leer());
}

export function reemplazarCategoriasExtra(lista: Categoria[]) {
  const limpia = lista.filter((c) => c && c.nombre && !CATEGORIAS_BASE.some((b) => b.nombre.toLowerCase() === c.nombre.toLowerCase()));
  setConfig(CLAVE, JSON.stringify(limpia));
  setCategoriasExtra(limpia);
}

export type ResultadoCategoria = { ok: true } | { ok: false; motivo: string };

export function anadirCategoria(nombre: string, icono: IconoNombre, color: string): ResultadoCategoria {
  const limpio = nombre.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (limpio.length < 2) return { ok: false, motivo: 'Ponle un nombre de al menos 2 letras.' };
  if (getCategorias().some((c) => c.nombre.toLowerCase() === limpio.toLowerCase())) {
    return { ok: false, motivo: 'Ya existe una categoría con ese nombre.' };
  }
  reemplazarCategoriasExtra([...leer(), { nombre: limpio, icono, color }]);
  return { ok: true };
}

/** Los movimientos que ya usaban la categoría borrada se quedan como están y se ven como "Otros". */
export function quitarCategoria(nombre: string) {
  reemplazarCategoriasExtra(leer().filter((c) => c.nombre !== nombre));
}

export function esCategoriaPropia(nombre: string): boolean {
  return leer().some((c) => c.nombre === nombre);
}
