/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { mesActual, mesesEntre, type Meta } from './db-comun';

/**
 * Cuánto hay que apartar cada mes para llegar a la fecha de la meta (contando el mes actual y el de la fecha).
 * Devuelve null si no hay fecha, ya se ha alcanzado o la fecha ya pasó.
 */
export function aportacionNecesaria(m: Meta, actual: string = mesActual()): number | null {
  if (!m.fecha) return null;
  const faltan = m.objetivo - m.ahorrado;
  if (faltan <= 0) return null;
  const meses = mesesEntre(actual, m.fecha) + 1;
  if (meses < 1) return null;
  return Math.ceil((faltan / meses) * 100) / 100;
}
