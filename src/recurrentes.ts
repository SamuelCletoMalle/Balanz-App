/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import * as Crypto from 'expo-crypto';
import {
  getRecurrentes,
  marcarRecurrenteGenerada,
  insertGasto,
  getGastos,
  mesActual,
  fechaHoy,
  claveRegla,
  tocaEnMes,
  sumarMeses,
  getMetas,
  Gasto,
  Recurrente,
} from './db';
import { subirGastoANube } from './sync';
import { notificar } from './avisos';
import { formatoEuro } from './tema';

function diasDelMes(año: number, mes: number): number {
  return new Date(año, mes, 0).getDate(); // mes en 1-12
}

function fechaDe(mes: string, dia: number): string {
  const [a, m] = mes.split('-').map(Number);
  return `${mes}-${String(Math.min(dia, diasDelMes(a, m))).padStart(2, '0')}`;
}

function siguienteMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * UUID que sale siempre igual para la misma semilla. Si dos dispositivos generan el mismo cobro del mes, los dos
 * crean el mismo movimiento y al sincronizar queda uno solo (en vez de dos).
 */
function idDeterminista(semilla: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  let h3 = 0xdeadbeef;
  let h4 = 0x9e3779b9;
  for (let i = 0; i < semilla.length; i++) {
    const c = semilla.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
    h3 = Math.imul(h3 + c, 3266489917);
    h4 = Math.imul(h4 ^ c, 668265263);
  }
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
}

/** Crea los gastos/ingresos recurrentes que tocan hasta hoy (mensuales, cada 6 meses, anuales…; máximo 12 meses atrás o un ciclo). */
export async function generarRecurrentes(): Promise<number> {
  const hoy = fechaHoy();
  const actual = mesActual();
  let creados = 0;

  for (const r of getRecurrentes()) {
    if (!r.activo) continue;

    let mes = r.ultima ? siguienteMes(r.ultima) : actual;
    // límite de seguridad: no más de 12 meses de golpe (o un ciclo entero si es más largo)
    const [ay, am] = actual.split('-').map(Number);
    const tope = new Date(ay, am - 1 - Math.max(12, r.cada), 1);
    const minimo = `${tope.getFullYear()}-${String(tope.getMonth() + 1).padStart(2, '0')}`;
    if (mes < minimo) mes = minimo;

    while (mes <= actual) {
      if (!tocaEnMes(r, mes)) {
        mes = siguienteMes(mes);
        continue;
      }
      const fecha = fechaDe(mes, r.dia);
      if (fecha > hoy) break;
      const gasto = {
        id: idDeterminista(`${r.id}|${mes}`),
        descripcion: r.descripcion,
        categoria: r.categoria,
        importe: r.importe,
        fecha,
        tipo: r.tipo,
      };
      try {
        insertGasto(gasto);
      } catch {
        // ya lo había creado otro dispositivo y ha llegado con la sincronización
      }
      marcarRecurrenteGenerada(r.id, mes);
      subirGastoANube(gasto).catch(() => {});
      creados++;
      mes = siguienteMes(mes);
    }
  }

  if (creados > 0) {
    notificar('Movimientos recurrentes registrados', `Se han añadido ${creados} movimiento${creados > 1 ? 's' : ''} automáticos.`);
  }
  return creados;
}

export type ProximoCobro = { recurrente: Recurrente; fecha: string; enDias: number };

/** Próximos movimientos recurrentes de los siguientes `dias` días. */
export function proximosCobros(dias = 30): ProximoCobro[] {
  const hoy = new Date();
  const resultado: ProximoCobro[] = [];

  for (const r of getRecurrentes()) {
    if (!r.activo) continue;
    // se miran los meses necesarios para cubrir el plazo pedido, saltando los que no le tocan
    for (let i = 0; i <= Math.ceil(dias / 28) + 1; i++) {
      const f = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const mes = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
      if (!tocaEnMes(r, mes)) continue;
      const fecha = fechaDe(mes, r.dia);
      const [y, m, d] = fecha.split('-').map(Number);
      const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86400000);
      // solo cuenta lo que aún no se ha generado ese mes
      if (diff >= 0 && diff <= dias && !(r.ultima >= mes)) {
        resultado.push({ recurrente: r, fecha, enDias: diff });
      }
    }
  }
  return resultado.sort((a, b) => a.enDias - b.enDias);
}

export type Sospechosa = {
  clave: string;
  descripcion: string;
  categoria: string;
  importe: number;
  mesesVistos: number;
  dia: number;
  variacion: number | null; // % de cambio del último cobro respecto al anterior
  anterior: number | null;
};

/** Detecta gastos que se repiten mes a mes y aún no están registrados como recurrentes. */
export function detectarSuscripciones(): Sospechosa[] {
  const claves = new Set(getRecurrentes().map((r) => claveRegla(r.descripcion)));
  const porClave = new Map<string, Gasto[]>();

  getGastos()
    .filter((g) => g.tipo === 'gasto')
    .forEach((g) => {
      const k = claveRegla(g.descripcion);
      if (k.length < 3) return;
      porClave.set(k, [...(porClave.get(k) ?? []), g]);
    });

  const salida: Sospechosa[] = [];
  porClave.forEach((lista, clave) => {
    if (claves.has(clave)) return;
    const meses = new Set(lista.map((g) => g.fecha.slice(0, 7)));
    if (meses.size < 3) return;
    const ordenados = [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultimo = ordenados[0];
    const media = lista.reduce((s, g) => s + g.importe, 0) / lista.length;
    // importes parecidos: todos dentro de ±35 % de la media
    if (!lista.every((g) => Math.abs(g.importe - media) <= media * 0.35)) return;
    const previo = ordenados.find((g) => g.fecha.slice(0, 7) !== ultimo.fecha.slice(0, 7));
    const variacion = previo && previo.importe > 0 ? ((ultimo.importe - previo.importe) / previo.importe) * 100 : null;
    salida.push({
      clave,
      descripcion: ultimo.descripcion,
      categoria: ultimo.categoria,
      importe: ultimo.importe,
      mesesVistos: meses.size,
      dia: parseInt(ultimo.fecha.slice(8, 10), 10),
      variacion,
      anterior: previo?.importe ?? null,
    });
  });
  return salida.sort((a, b) => b.mesesVistos - a.mesesVistos);
}

export function textoVariacion(s: Sospechosa): string | null {
  if (s.variacion === null || s.anterior === null || Math.abs(s.variacion) < 2) return null;
  return `${s.variacion > 0 ? 'Ha subido' : 'Ha bajado'} de ${formatoEuro(s.anterior)} a ${formatoEuro(s.importe)}`;
}

export type ItemPlan = { id: string; descripcion: string; importe: number; tipo: 'gasto' | 'ingreso' | 'ahorro'; dia: number; categoria: string };
export type MesPlan = { mes: string; items: ItemPlan[]; gastos: number; ingresos: number; ahorro: number; neto: number };

/**
 * Lo que está previsto mes a mes: pagos e ingresos fijos (con sus plazos) y lo que se aparta solo para las metas.
 * El mes actual solo cuenta lo que aún no se ha apuntado.
 */
export function planPorMeses(n = 12): MesPlan[] {
  const actual = mesActual();
  const recurrentes = getRecurrentes().filter((r) => r.activo);
  // Lo que le falta a cada meta con aportación automática: el plan se para cuando la completa.
  const metas = getMetas()
    .filter((m) => m.aporte > 0 && m.objetivo - m.ahorrado > 0)
    .map((m) => ({ meta: m, restante: m.objetivo - m.ahorrado }));

  const plan: MesPlan[] = [];
  for (let i = 0; i < n; i++) {
    const mes = sumarMeses(actual, i);
    const items: ItemPlan[] = [];
    for (const r of recurrentes) {
      if (!tocaEnMes(r, mes)) continue;
      if (i === 0 && r.ultima >= mes) continue;
      items.push({ id: r.id, descripcion: r.descripcion, importe: r.importe, tipo: r.tipo === 'ingreso' ? 'ingreso' : 'gasto', dia: r.dia, categoria: r.categoria });
    }
    for (const m of metas) {
      if (m.restante <= 0) continue;
      if (i === 0 && m.meta.ultimaAporte >= mes) continue;
      const aporte = Math.min(m.meta.aporte, m.restante);
      m.restante -= aporte;
      items.push({ id: m.meta.id, descripcion: m.meta.nombre, importe: aporte, tipo: 'ahorro', dia: 0, categoria: '' });
    }
    items.sort((a, b) => a.dia - b.dia || a.descripcion.localeCompare(b.descripcion));
    const suma = (t: ItemPlan['tipo']) => Math.round(items.filter((x) => x.tipo === t).reduce((s, x) => s + x.importe, 0) * 100) / 100;
    const gastos = suma('gasto');
    const ingresos = suma('ingreso');
    plan.push({ mes, items, gastos, ingresos, ahorro: suma('ahorro'), neto: Math.round((ingresos - gastos) * 100) / 100 });
  }
  return plan;
}
