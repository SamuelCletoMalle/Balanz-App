/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { type Gasto, nombreCuenta, nombreMetodo } from './db-comun';

/** Una celda de CSV: entre comillas si lleva ; comillas o saltos de línea. */
export function celdaCsv(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Todos los movimientos en un CSV que Excel abre bien en español (separador ;, decimales con coma, con BOM). */
export function movimientosACsv(gastos: Gasto[]): string {
  const cab = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Importe', 'Cuenta', 'Método de pago', 'Nota', 'Etiquetas'];
  const filas = gastos.map((g) =>
    [
      g.fecha,
      g.tipo === 'ingreso' ? 'Ingreso' : g.tipo === 'traspaso' ? 'Traspaso' : 'Gasto',
      g.tipo === 'traspaso' ? '' : g.categoria,
      g.descripcion,
      (g.tipo === 'gasto' ? -g.importe : g.importe).toFixed(2).replace('.', ','),
      nombreCuenta(g.cuenta),
      nombreMetodo(g.metodo),
      g.nota,
      g.etiquetas
        .split(',')
        .filter(Boolean)
        .map((e) => `#${e}`)
        .join(' '),
    ]
      .map(celdaCsv)
      .join(';')
  );
  return '﻿' + [cab.join(';'), ...filas].join('\r\n');
}
