/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretarTexto, numeroDesdeTexto, adivinarCategoria } from '../src/captura';

test('números en formato español e inglés', () => {
  assert.equal(numeroDesdeTexto('12,50'), 12.5);
  assert.equal(numeroDesdeTexto('1.234,56'), 1234.56);
  assert.equal(numeroDesdeTexto('1,234.56'), 1234.56);
  assert.equal(numeroDesdeTexto('1.234'), 1234);
  assert.equal(numeroDesdeTexto('abc'), null);
});

test('SMS del banco', () => {
  const c = interpretarTexto('Compra de 12,50 € en MERCADONA con tu tarjeta *1234');
  assert.equal(c.importe, 12.5);
  assert.equal(c.comercio, 'MERCADONA');
  assert.equal(c.categoria, 'Alimentación');
  assert.equal(c.esIngreso, false);
});

test('texto del atajo de Apple Pay', () => {
  const c = interpretarTexto('Comercio: Café Importe: 3,5');
  assert.equal(c.importe, 3.5);
  assert.equal(c.comercio, 'Café');
});

test('texto libre y corto', () => {
  assert.deepEqual(
    [interpretarTexto('Café 3,50').importe, interpretarTexto('Café 3,50').comercio],
    [3.5, 'Café']
  );
  const g = interpretarTexto('Gasolina 40');
  assert.equal(g.importe, 40);
  assert.equal(g.categoria, 'Transporte');
});

test('ingresos', () => {
  const i = interpretarTexto('Ingreso 20 Abuela');
  assert.equal(i.esIngreso, true);
  assert.equal(i.importe, 20);
  assert.equal(i.comercio, 'Abuela');
  assert.equal(interpretarTexto('Nómina 1.250,40').esIngreso, true);
});

test('sin importe no inventa nada', () => {
  assert.equal(interpretarTexto('hola').importe, null);
});

test('categorías por palabras clave', () => {
  assert.equal(adivinarCategoria('Netflix'), 'Suscripciones');
  assert.equal(adivinarCategoria('Farmacia Lopez'), 'Salud');
  assert.equal(adivinarCategoria('zzz'), 'Otros');
});
