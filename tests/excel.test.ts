/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { datosDeAnio, generarLibroContabilidad } from '../src/excel-contabilidad';
import type { Gasto } from '../src/db-comun';

const g = (id: string, fecha: string, importe: number, tipo: 'gasto' | 'ingreso', descripcion: string): Gasto => ({
  id, fecha, importe, tipo, descripcion, categoria: 'Otros', cuenta: 'banco', etiquetas: '', moneda: 'EUR', importe_original: null, divisiones: '', foto: '',
});

test('el libro anual tiene Inicio y 12 meses, con totales y fórmulas', async () => {
  const gastos = [
    g('1', '2026-01-06', 220, 'ingreso', 'Reyes'),
    g('2', '2026-01-02', 2.5, 'gasto', 'Zumo'),
    g('3', '2026-02-14', 10, 'gasto', 'San Valentín'),
    g('4', '2025-12-31', 100, 'ingreso', 'Del año pasado'),
  ];
  const datos = datosDeAnio(gastos, 1000, 2026);
  assert.equal(datos.dineroInicioAnio, 1100); // 1000 + 100 de 2025
  const b64 = await generarLibroContabilidad(datos, 'base64');
  const libro = XLSX.read(b64, { type: 'base64' });
  assert.equal(libro.SheetNames.length, 13);
  assert.equal(libro.SheetNames[0], 'Inicio');
  assert.equal(libro.Sheets.Enero.B2.v, 220);
  assert.equal(libro.Sheets.Enero.G2.v, 2.5);
  assert.equal(libro.Sheets.Enero.B2.f, 'SUM(B5:B103)');
  assert.equal(libro.Sheets.Inicio.B2.v, 1100 + 220 - 2.5 - 10);
});
