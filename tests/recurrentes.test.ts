/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tocaEnMes, textoFrecuencia, normalizarRecurrente, mesesEntre, sumarMeses, numeroDePagos, type Recurrente } from '../src/db-comun';

const base: Recurrente = { id: '1', descripcion: 'x', categoria: 'Otros', importe: 10, tipo: 'gasto', dia: 15, ultima: '', activo: 1, cada: 1, inicio: '', hasta: '' };

test('mensual toca todos los meses', () => {
  assert.equal(tocaEnMes(base, '2026-01'), true);
  assert.equal(tocaEnMes(base, '2026-12'), true);
});

test('anual toca solo en su mes', () => {
  const r = { ...base, cada: 12, inicio: '2026-03' };
  assert.equal(tocaEnMes(r, '2026-03'), true);
  assert.equal(tocaEnMes(r, '2026-09'), false);
  assert.equal(tocaEnMes(r, '2027-03'), true);
  assert.equal(tocaEnMes(r, '2025-03'), false);
});

test('cada 6 meses toca dos veces al año', () => {
  const r = { ...base, cada: 6, inicio: '2026-03' };
  assert.deepEqual(['2026-03', '2026-09', '2027-03', '2026-04'].map((m) => tocaEnMes(r, m)), [true, true, true, false]);
});

test('recurrentes antiguos (sin frecuencia) se tratan como mensuales', () => {
  const viejo = normalizarRecurrente({ ...base, cada: undefined as unknown as number, inicio: undefined as unknown as string });
  assert.equal(viejo.cada, 1);
  assert.equal(tocaEnMes(viejo, '2026-10'), true);
});

test('textos de frecuencia', () => {
  assert.equal(textoFrecuencia(base), 'Día 15 de cada mes');
  assert.equal(textoFrecuencia({ ...base, cada: 12, inicio: '2026-03' }), 'El 15 de marzo, cada año');
  assert.equal(textoFrecuencia({ ...base, cada: 6, inicio: '2026-03' }), 'Día 15, cada 6 meses (desde marzo)');
});

test('meses entre fechas', () => {
  assert.equal(mesesEntre('2026-03', '2027-03'), 12);
  assert.equal(mesesEntre('2026-03', '2026-01'), -2);
});

test('un pago a plazos empieza en su mes y acaba solo', () => {
  const r = { ...base, inicio: '2026-11', hasta: sumarMeses('2026-11', 11) };
  assert.equal(r.hasta, '2027-10');
  assert.equal(numeroDePagos(r), 12);
  assert.equal(tocaEnMes(r, '2026-10'), false);
  assert.equal(tocaEnMes(r, '2026-11'), true);
  assert.equal(tocaEnMes(r, '2027-10'), true);
  assert.equal(tocaEnMes(r, '2027-11'), false);
  assert.equal(textoFrecuencia(r), 'Día 15 de cada mes · 12 pagos, hasta oct 2027');
});

test('plazos cada 3 meses', () => {
  const r = { ...base, cada: 3, inicio: '2026-01', hasta: sumarMeses('2026-01', 3 * 3) };
  assert.equal(numeroDePagos(r), 4);
  assert.deepEqual(['2026-01', '2026-04', '2026-07', '2026-10', '2027-01'].map((m) => tocaEnMes(r, m)), [true, true, true, true, false]);
});

test('sumar meses cruza el año', () => {
  assert.equal(sumarMeses('2026-11', 3), '2027-02');
  assert.equal(sumarMeses('2026-01', -1), '2025-12');
});
