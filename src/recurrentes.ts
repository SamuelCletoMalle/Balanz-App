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

/** Crea los gastos/ingresos recurrentes que tocan hasta hoy (con un máximo de 12 meses atrás). */
export async function generarRecurrentes(): Promise<number> {
  const hoy = fechaHoy();
  const actual = mesActual();
  let creados = 0;

  for (const r of getRecurrentes()) {
    if (!r.activo) continue;

    let mes = r.ultima ? siguienteMes(r.ultima) : actual;
    // límite de seguridad: no más de 12 meses de golpe
    const [ay, am] = actual.split('-').map(Number);
    const tope = new Date(ay, am - 13, 1);
    const minimo = `${tope.getFullYear()}-${String(tope.getMonth() + 1).padStart(2, '0')}`;
    if (mes < minimo) mes = minimo;

    while (mes <= actual) {
      const fecha = fechaDe(mes, r.dia);
      if (fecha > hoy) break;
      const gasto = {
        id: Crypto.randomUUID(),
        descripcion: r.descripcion,
        categoria: r.categoria,
        importe: r.importe,
        fecha,
        tipo: r.tipo,
      };
      insertGasto(gasto);
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
    for (let i = 0; i < 2; i++) {
      const f = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const mes = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
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
