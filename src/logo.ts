/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// El logo es la cartera de cristal y cromo (assets/images/simbolo.png, con transparencia) sobre un cuadrado redondeado
// carbón. Si cambia el símbolo, hay que regenerar los iconos (ver README).

export const LOGO = {
  colores: { inicio: '#14171d', fin: '#08090c' },
} as const;

// Curvas de la guía de animación (salida fuerte para entradas, ease-in-out para movimiento en pantalla).
export const CURVAS = {
  salida: [0.23, 1, 0.32, 1] as const,
  movimiento: [0.77, 0, 0.175, 1] as const,
};
