/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { filasPlanas, filasPorBloques, leerCsv, decodificarTexto } from '../src/excel-lectura';

const hojaDeCsv = (csv: string) => {
  const libro = leerCsv(csv);
  return libro.Sheets[libro.SheetNames[0]];
};

test('extracto del banco con importe con signo y separador ;', () => {
  const csv = 'Fecha;Concepto;Importe;Saldo\n05/03/2026;COMPRA MERCADONA;-12,50;1000,00\n06/03/2026;NOMINA EMPRESA;1.250,40;2250,00\n';
  const f = filasPlanas(hojaDeCsv(csv));
  assert.equal(f.length, 2);
  assert.deepEqual([f[0].tipo, f[0].importe, f[0].fecha, f[0].descripcion], ['gasto', 12.5, '2026-03-05', 'COMPRA MERCADONA']);
  assert.deepEqual([f[1].tipo, f[1].importe], ['ingreso', 1250.4]);
});

test('extracto con columnas Cargo y Abono', () => {
  const csv = 'Fecha operación,Descripción,Cargo,Abono\n2026-03-05,Recibo luz,45.20,\n2026-03-06,Bizum Ana,,20\n';
  const f = filasPlanas(hojaDeCsv(csv));
  assert.deepEqual(f.map((x) => [x.tipo, x.importe]), [['gasto', 45.2], ['ingreso', 20]]);
});

test('tabla plana de Balanz (con columna Tipo y todo en positivo)', () => {
  const csv = 'Descripcion,Categoria,Importe,Tipo,Fecha\nCafé,Alimentación,3.5,Gasto,2026-03-05\nAbuela,Otros,20,Ingreso,2026-03-06\n';
  const f = filasPlanas(hojaDeCsv(csv));
  assert.deepEqual(f.map((x) => [x.tipo, x.importe, x.categoria]), [['gasto', 3.5, 'Alimentación'], ['ingreso', 20, 'Otros']]);
});

test('sin importes no inventa filas', () => {
  assert.equal(filasPlanas(hojaDeCsv('Fecha,Concepto\n2026-01-01,algo\n')).length, 0);
});

test('libro por meses con INGRESOS y GASTOS lado a lado', () => {
  const aoa = [
    ['INGRESOS', '', '', '', '', 'GASTOS', '', ''],
    ['Total', '', '', '', '', 'Total', '', ''],
    [],
    ['Fecha', 'Cantidad (€)', 'Concepto', '', '', 'Fecha', 'Cantidad (€)', 'Concepto'],
    ['2026-01-06', 220, 'Reyes', '', '', '2026-01-02', 2.5, 'Zumo'],
  ];
  const hoja = XLSX.utils.aoa_to_sheet(aoa);
  const f = filasPorBloques(hoja, 'Enero');
  assert.deepEqual(f.map((x) => [x.tipo, x.importe, x.descripcion]), [['ingreso', 220, 'Reyes'], ['gasto', 2.5, 'Zumo']]);
});

test('extracto con títulos antes de la cabecera', () => {
  const csv = 'Cuenta;ES00 0000 0000\nExtracto de marzo\n\nFecha;Concepto;Importe\n05/03/2026;Recibo agua;-30,10\n';
  const f = filasPlanas(hojaDeCsv(csv));
  assert.deepEqual(f.map((x) => [x.tipo, x.importe, x.fecha]), [['gasto', 30.1, '2026-03-05']]);
});

test('CSV en Latin-1 (como los de muchos bancos)', () => {
  const bytes = Uint8Array.from([...'Fecha;Concepto;Importe\n05/03/2026;Caf'].map((c) => c.charCodeAt(0)).concat([0xe9], [...';-3,50\n'].map((c) => c.charCodeAt(0))));
  const texto = decodificarTexto(bytes);
  assert.ok(texto.includes('Café'));
  assert.equal(filasPlanas(hojaDeCsv(texto))[0].descripcion, 'Café');
});
