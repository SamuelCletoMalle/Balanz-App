/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movimientosACsv, celdaCsv } from '../src/csv';
import type { Gasto } from '../src/db-comun';

const base: Gasto = {
  id: '1', descripcion: 'Mercadona', categoria: 'Alimentación', importe: 54.3, fecha: '2026-10-05', tipo: 'gasto', cuenta: 'banco',
  metodo: 'tarjeta', nota: '', etiquetas: 'casa,compra', moneda: 'EUR', importe_original: null, divisiones: '', foto: '',
};

test('el CSV lleva cabecera, BOM, decimales con coma y gastos en negativo', () => {
  const csv = movimientosACsv([base, { ...base, id: '2', tipo: 'ingreso', descripcion: 'Nómina', categoria: 'Nómina', importe: 1850, metodo: 'transferencia' }]);
  const lineas = csv.split('\r\n');
  assert.equal(lineas[0], '﻿Fecha;Tipo;Categoría;Descripción;Importe;Cuenta;Método de pago;Nota;Etiquetas');
  assert.equal(lineas[1], '2026-10-05;Gasto;Alimentación;Mercadona;-54,30;Cuenta bancaria;Tarjeta;;#casa #compra');
  assert.equal(lineas[2], '2026-10-05;Ingreso;Nómina;Nómina;1850,00;Cuenta bancaria;Transferencia;;#casa #compra');
});

test('las celdas con ; comillas o saltos de línea van entre comillas', () => {
  assert.equal(celdaCsv('hola'), 'hola');
  assert.equal(celdaCsv('a;b'), '"a;b"');
  assert.equal(celdaCsv('dijo "ok"'), '"dijo ""ok"""');
  assert.equal(celdaCsv('uno\ndos'), '"uno\ndos"');
});
