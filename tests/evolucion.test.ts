/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saldoPorMes, proyectarSaldo, comparativaMismoMes, ritmoExcesivo, sumarMeses, variacionMensualMedia } from '../src/evolucion';

const mov = (fecha: string, importe: number, tipo: 'gasto' | 'ingreso') => ({ fecha, importe, tipo });
const datos = [
  mov('2026-01-10', 1000, 'ingreso'),
  mov('2026-01-15', 200, 'gasto'),
  mov('2026-02-10', 1000, 'ingreso'),
  mov('2026-02-20', 400, 'gasto'),
  mov('2026-03-10', 1000, 'ingreso'),
  mov('2026-03-20', 600, 'gasto'),
];

test('meses', () => {
  assert.equal(sumarMeses('2026-11', 3), '2027-02');
  assert.equal(sumarMeses('2026-01', -2), '2025-11');
});

test('saldo a final de cada mes', () => {
  const p = saldoPorMes(datos, 500, '2026-03', 3);
  assert.deepEqual(p.map((x) => x.saldo), [1300, 1900, 2300]);
  assert.deepEqual(p.map((x) => x.mes), ['2026-01', '2026-02', '2026-03']);
});

test('proyección con la media de los meses anteriores', () => {
  const p = saldoPorMes(datos, 500, '2026-03', 3);
  // variación media de ene-feb-(mar no cuenta: es el mes actual): 800 y 600 -> 700/mes
  assert.equal(variacionMensualMedia(datos, '2026-03'), 700);
  const futuro = proyectarSaldo(p, datos, 2);
  assert.deepEqual(futuro.map((x) => [x.mes, x.saldo, x.proyectado]), [['2026-04', 3000, true], ['2026-05', 3700, true]]);
});

test('sin datos no proyecta nada raro', () => {
  assert.deepEqual(proyectarSaldo([], [], 3), []);
  assert.equal(variacionMensualMedia([], '2026-03'), 0);
});

test('comparativa con el mismo mes del año pasado', () => {
  const c = comparativaMismoMes([mov('2025-03-05', 100, 'gasto'), mov('2026-03-05', 150, 'gasto'), mov('2026-03-06', 999, 'ingreso')], '2026-03');
  assert.deepEqual([c.actual, c.anioPasado, c.variacion], [150, 100, 50]);
  assert.equal(comparativaMismoMes([], '2026-03').variacion, null);
});

test('aviso de ritmo de gasto', () => {
  // día 10 de 30: esperado 100 de 300; gastar 200 es el doble
  assert.equal(ritmoExcesivo(200, 300, 10, 30), 2);
  assert.equal(ritmoExcesivo(110, 300, 10, 30), null); // va bien
  assert.equal(ritmoExcesivo(200, 300, 3, 30), null); // muy pronto
  assert.equal(ritmoExcesivo(310, 300, 10, 30), null); // ya superado: avisa el otro aviso
  assert.equal(ritmoExcesivo(20, 300, 10, 30), null); // poca cantidad
});
