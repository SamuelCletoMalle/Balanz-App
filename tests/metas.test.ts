/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aportacionNecesaria } from '../src/metas-calculo';
import { parsearMes } from '../src/periodo';
import type { Meta } from '../src/db-comun';

const meta: Meta = { id: '1', nombre: 'Viaje', objetivo: 1200, ahorrado: 0, icono: 'flag-outline', fecha: '2026-12', aporte: 0, ultimaAporte: '' };

test('cuánto apartar al mes para llegar a la fecha', () => {
  // de enero a diciembre de 2026 son 12 meses: 1200 / 12 = 100
  assert.equal(aportacionNecesaria(meta, '2026-01'), 100);
  assert.equal(aportacionNecesaria({ ...meta, ahorrado: 600 }, '2026-07'), 100); // 600 en 6 meses
});

test('sin fecha, conseguida o pasada no hay aportación', () => {
  assert.equal(aportacionNecesaria({ ...meta, fecha: '' }, '2026-01'), null);
  assert.equal(aportacionNecesaria({ ...meta, ahorrado: 1200 }, '2026-01'), null);
  assert.equal(aportacionNecesaria(meta, '2027-01'), null);
});

test('meses en varios formatos', () => {
  assert.equal(parsearMes('6/2027'), '2027-06');
  assert.equal(parsearMes('06-27'), '2027-06');
  assert.equal(parsearMes('2027-06'), '2027-06');
  assert.equal(parsearMes('13/2027'), null);
  assert.equal(parsearMes('hola'), null);
});
