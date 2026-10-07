/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearFecha, rangoPeriodo } from '../src/periodo';

test('fechas en varios formatos', () => {
  assert.equal(parsearFecha('5/3/2026'), '2026-03-05');
  assert.equal(parsearFecha('05-03-26'), '2026-03-05');
  assert.equal(parsearFecha('2026-03-05'), '2026-03-05');
  assert.equal(parsearFecha('31/02/2026'), null);
  assert.equal(parsearFecha('hola'), null);
});

test('periodos', () => {
  const hoy = new Date(2026, 0, 15); // 15 ene 2026
  assert.deepEqual(rangoPeriodo('mes', hoy), { desde: '2026-01-01', hasta: '2026-01-31' });
  assert.deepEqual(rangoPeriodo('anterior', hoy), { desde: '2025-12-01', hasta: '2025-12-31' });
  assert.deepEqual(rangoPeriodo('anio', hoy), { desde: '2026-01-01', hasta: '2026-12-31' });
  assert.equal(rangoPeriodo('todo', hoy), null);
  assert.deepEqual(rangoPeriodo('personal', hoy, '1/2/2026', ''), { desde: '2026-02-01', hasta: '9999-12-31' });
});
