/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { CUENTAS, type FondosIniciales } from './db-comun';

type Mov = { tipo: string; importe: number; cuenta?: string; categoria?: string };

/**
 * Dinero que hay en cada cuenta: lo que tenías al empezar + ingresos − gastos de esa cuenta,
 * y los traspasos (salen de `cuenta` y entran en la cuenta guardada en `categoria`).
 */
export function saldosPorCuenta(movimientos: Mov[], fondos: FondosIniciales): Record<string, number> {
  const saldos: Record<string, number> = {};
  CUENTAS.forEach((c) => (saldos[c.id] = fondos[c.id] ?? 0));
  const sumar = (id: string | undefined, valor: number) => {
    const clave = id && id in saldos ? id : 'banco';
    saldos[clave] += valor;
  };
  movimientos.forEach((m) => {
    if (m.tipo === 'ingreso') sumar(m.cuenta, m.importe);
    else if (m.tipo === 'gasto') sumar(m.cuenta, -m.importe);
    else if (m.tipo === 'traspaso') {
      sumar(m.cuenta, -m.importe);
      sumar(m.categoria, m.importe);
    }
  });
  CUENTAS.forEach((c) => (saldos[c.id] = Math.round(saldos[c.id] * 100) / 100));
  return saldos;
}
