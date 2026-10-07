/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saldosPorCuenta } from '../src/cuentas';

const fondos = { efectivo: 100, banco: 1000, ahorros: 500 };

test('cada cuenta suma sus ingresos y resta sus gastos', () => {
  const s = saldosPorCuenta(
    [
      { tipo: 'ingreso', importe: 200, cuenta: 'banco' },
      { tipo: 'gasto', importe: 30, cuenta: 'efectivo' },
      { tipo: 'gasto', importe: 50, cuenta: 'banco' },
    ],
    fondos
  );
  assert.deepEqual(s, { efectivo: 70, banco: 1150, ahorros: 500 });
});

test('un traspaso mueve dinero sin cambiar el total', () => {
  const s = saldosPorCuenta([{ tipo: 'traspaso', importe: 300, cuenta: 'banco', categoria: 'ahorros' }], fondos);
  assert.deepEqual(s, { efectivo: 100, banco: 700, ahorros: 800 });
  assert.equal(Object.values(s).reduce((a, b) => a + b, 0), 1600);
});

test('movimientos antiguos sin cuenta van a la cuenta bancaria', () => {
  const s = saldosPorCuenta([{ tipo: 'gasto', importe: 10 }, { tipo: 'gasto', importe: 5, cuenta: 'rara' }], fondos);
  assert.equal(s.banco, 985);
});
