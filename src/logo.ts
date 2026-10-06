/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Geometría del logo de Balanz (rejilla 100x100). La "B" se construye con tres trazos redondeados:
// un tallo y dos medios aros —como los platos de una balanza— más una moneda como acento.
// Si se cambia algo aquí, hay que regenerar los iconos (ver README).

export const LOGO = {
  trazo: 11,
  tallo: { d: 'M34 24 V76', largo: 52 },
  arriba: { d: 'M34 24 H48 A13 13 0 0 1 48 50 H34', largo: 14 + Math.PI * 13 + 14 },
  abajo: { d: 'M34 50 H51 A13 13 0 0 1 51 76 H34', largo: 17 + Math.PI * 13 + 17 },
  moneda: { cx: 72, cy: 25, r: 5.5 },
  colores: { inicio: '#6366f1', fin: '#7c3aed', marca: '#ffffff', marcaFin: '#e0e7ff', moneda: '#fbbf24' },
} as const;

// Curvas de la guía de animación (salida fuerte para entradas, ease-in-out para movimiento en pantalla).
export const CURVAS = {
  salida: [0.23, 1, 0.32, 1] as const,
  movimiento: [0.77, 0, 0.175, 1] as const,
};
