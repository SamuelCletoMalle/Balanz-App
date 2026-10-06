/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  getTotalMes,
  getGastosPorCategoria,
  getGastos,
  mesDesplazado,
  getLimite,
} from './db';
import { formatoEuro, MESES_CORTOS } from './tema';

export type DatosInforme = {
  mes: string;
  gastos: number;
  ingresos: number;
  gastosPrevios: number;
  ingresosPrevios: number;
  porCategoria: { categoria: string; total: number; previo: number }[];
  mayores: { descripcion: string; importe: number; fecha: string }[];
  limite: number;
};

export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES_LARGOS[m - 1]} ${a}`;
}

export function datosInforme(mes: string): DatosInforme {
  const [a, m] = mes.split('-').map(Number);
  const previo = (() => {
    const d = new Date(a, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const actual = getGastosPorCategoria(mes);
  const anterior = getGastosPorCategoria(previo);
  const categorias = new Set([...actual.map((c) => c.categoria), ...anterior.map((c) => c.categoria)]);

  return {
    mes,
    gastos: getTotalMes(mes, 'gasto'),
    ingresos: getTotalMes(mes, 'ingreso'),
    gastosPrevios: getTotalMes(previo, 'gasto'),
    ingresosPrevios: getTotalMes(previo, 'ingreso'),
    porCategoria: Array.from(categorias)
      .map((categoria) => ({
        categoria,
        total: actual.find((c) => c.categoria === categoria)?.total ?? 0,
        previo: anterior.find((c) => c.categoria === categoria)?.total ?? 0,
      }))
      .sort((x, y) => y.total - x.total),
    mayores: getGastos()
      .filter((g) => g.tipo === 'gasto' && g.fecha.startsWith(mes))
      .sort((x, y) => y.importe - x.importe)
      .slice(0, 5)
      .map((g) => ({ descripcion: g.descripcion, importe: g.importe, fecha: g.fecha })),
    limite: mes === mesDesplazado(0) ? getLimite() : 0,
  };
}

export function variacionTexto(actual: number, previo: number): string {
  if (previo === 0) return actual === 0 ? '—' : 'nuevo';
  const pct = ((actual - previo) / previo) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)} %`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export function htmlInforme(d: DatosInforme): string {
  const balance = d.ingresos - d.gastos;
  const filas = d.porCategoria
    .map(
      (c) => `<tr><td>${esc(c.categoria)}</td><td class="n">${formatoEuro(c.total)}</td><td class="n">${formatoEuro(c.previo)}</td><td class="n">${variacionTexto(c.total, c.previo)}</td></tr>`
    )
    .join('');
  const mayores = d.mayores
    .map((g) => `<tr><td>${esc(g.descripcion)}</td><td>${g.fecha.slice(8, 10)} ${MESES_CORTOS[Number(g.fecha.slice(5, 7)) - 1]}</td><td class="n">${formatoEuro(g.importe)}</td></tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f172a;padding:28px}
    h1{margin:0;font-size:26px} h2{font-size:15px;margin:26px 0 8px;color:#475569;text-transform:uppercase;letter-spacing:.6px}
    .sub{color:#64748b;margin:2px 0 18px}
    .kpis{display:flex;gap:12px}.kpi{flex:1;background:#f1f5f9;border-radius:12px;padding:14px}
    .kpi b{display:block;font-size:22px;margin-top:4px}.verde{color:#16a34a}.rojo{color:#dc2626}
    table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:left}
    th{color:#64748b;font-weight:600}.n{text-align:right}
    .pie{margin-top:28px;color:#94a3b8;font-size:11px}
  </style></head><body>
    <h1>Informe de ${esc(nombreMes(d.mes))}</h1>
    <div class="sub">Balanz · generado el ${new Date().toLocaleDateString('es-ES')}</div>
    <div class="kpis">
      <div class="kpi">Gastos<b class="rojo">${formatoEuro(d.gastos)}</b><small>${variacionTexto(d.gastos, d.gastosPrevios)} vs. mes anterior</small></div>
      <div class="kpi">Ingresos<b class="verde">${formatoEuro(d.ingresos)}</b><small>${variacionTexto(d.ingresos, d.ingresosPrevios)} vs. mes anterior</small></div>
      <div class="kpi">Balance<b class="${balance >= 0 ? 'verde' : 'rojo'}">${balance >= 0 ? '+' : ''}${formatoEuro(balance)}</b></div>
    </div>
    ${d.limite > 0 ? `<p>Presupuesto mensual: ${formatoEuro(d.limite)} (${Math.round((d.gastos / d.limite) * 100)} % utilizado)</p>` : ''}
    <h2>Por categoría</h2>
    <table><tr><th>Categoría</th><th class="n">Este mes</th><th class="n">Mes anterior</th><th class="n">Cambio</th></tr>${filas || '<tr><td colspan="4">Sin gastos</td></tr>'}</table>
    <h2>Mayores gastos</h2>
    <table><tr><th>Concepto</th><th>Fecha</th><th class="n">Importe</th></tr>${mayores || '<tr><td colspan="3">Sin gastos</td></tr>'}</table>
    <div class="pie">Informe generado con Balanz.</div>
  </body></html>`;
}

export async function exportarInformePDF(mes: string): Promise<void> {
  const html = htmlInforme(datosInforme(mes));
  if (Platform.OS === 'web') {
    // En web se abre el diálogo de impresión del navegador: ahí se elige "Guardar como PDF".
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Informe ${nombreMes(mes)}`, UTI: 'com.adobe.pdf' });
  }
}
