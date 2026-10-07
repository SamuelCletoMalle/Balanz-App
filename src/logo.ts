/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Geometría del logo de Balanz (rejilla 100x100). La "Z" de Balanz se construye con tres trazos redondeados
// (barra de arriba, diagonal y barra de abajo) y una moneda en el centro, que hace de pivote de la balanza.
// Si se cambia algo aquí, hay que regenerar los iconos (ver README).

const BARRA = 46;
const DIAGONAL = Math.hypot(46, 42);

export const LOGO = {
  trazo: 9,
  barraArriba: { d: 'M27 29 H73', largo: BARRA },
  diagonal: { d: 'M73 29 L27 71', largo: DIAGONAL },
  barraAbajo: { d: 'M27 71 H73', largo: BARRA },
  moneda: { cx: 50, cy: 50, r: 8, hueco: 11.5 },
  colores: { inicio: '#18181b', fin: '#000000', marca: '#bef264', moneda: '#ffffff', aro: '#0a0a0a' },
} as const;

// Curvas de la guía de animación (salida fuerte para entradas, ease-in-out para movimiento en pantalla).
export const CURVAS = {
  salida: [0.23, 1, 0.32, 1] as const,
  movimiento: [0.77, 0, 0.175, 1] as const,
};
