/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Tipos y utilidades que comparten la base nativa (SQLite, db.ts) y la de web (db.web.ts).

export type Tipo = 'gasto' | 'ingreso';

/** Un movimiento guardado puede ser además un traspaso entre cuentas (origen en `cuenta`, destino en `categoria`). */
export type TipoMovimiento = Tipo | 'traspaso';

export const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', icono: 'cash-outline' },
  { id: 'banco', nombre: 'Cuenta bancaria', icono: 'card-outline' },
  { id: 'ahorros', nombre: 'Ahorros', icono: 'wallet-outline' },
] as const;

export type CuentaId = (typeof CUENTAS)[number]['id'];

export const nombreCuenta = (id: string) => CUENTAS.find((x) => x.id === id)?.nombre ?? 'Cuenta bancaria';

export type Division = { nombre: string; importe: number; pagado: boolean };

export type Gasto = {
  id: string;
  descripcion: string;
  categoria: string;
  importe: number; // siempre en EUR
  fecha: string;
  tipo: TipoMovimiento;
  cuenta: string; // 'efectivo' | 'banco' | 'ahorros': de dónde sale o a dónde entra el dinero
  etiquetas: string; // "vacaciones,trabajo"
  moneda: string;
  importe_original: number | null;
  divisiones: string; // JSON de Division[] ('' si no se divide)
  foto: string; // ruta local del ticket ('' si no hay)
};

export type NuevoGasto = Partial<Gasto> & Pick<Gasto, 'id' | 'descripcion' | 'categoria' | 'importe' | 'fecha'>;

export type Pendiente = {
  id: string;
  texto: string;
  importe: number | null;
  comercio: string;
  categoria: string;
  fecha: string;
  tipo: Tipo;
};

export type Recurrente = {
  id: string;
  descripcion: string;
  categoria: string;
  importe: number;
  tipo: Tipo;
  dia: number; // día del mes (1-31)
  ultima: string; // 'YYYY-MM' del último mes generado ('' si ninguno)
  activo: number; // 0/1
  cada: number; // cada cuántos meses se repite: 1 (mensual), 2, 3, 6, 12 (anual)…
  inicio: string; // 'YYYY-MM' del primer pago; ancla de las repeticiones ('' si es mensual)
};

export const FRECUENCIAS: { cada: number; nombre: string }[] = [
  { cada: 1, nombre: 'Cada mes' },
  { cada: 2, nombre: 'Cada 2 meses' },
  { cada: 3, nombre: 'Cada 3 meses' },
  { cada: 4, nombre: 'Cada 4 meses' },
  { cada: 6, nombre: 'Cada 6 meses' },
  { cada: 12, nombre: 'Cada año' },
];

export const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Meses de diferencia entre dos 'YYYY-MM' (positivo si `b` es posterior a `a`). */
export function mesesEntre(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** Rellena los campos nuevos de un recurrente guardado antes de existir las frecuencias. */
export function normalizarRecurrente(r: Recurrente): Recurrente {
  return { ...r, cada: r.cada >= 1 ? r.cada : 1, inicio: r.inicio ?? '' };
}

/** ¿Le toca pagar a este recurrente en el mes `mes` ('YYYY-MM')? */
export function tocaEnMes(r: Recurrente, mes: string): boolean {
  const cada = r.cada >= 1 ? r.cada : 1;
  if (cada === 1 || !r.inicio) return true;
  const d = mesesEntre(r.inicio, mes);
  return d >= 0 && d % cada === 0;
}

/** Texto para la lista: "Día 5 de cada mes", "El 15 de marzo, cada año"… */
export function textoFrecuencia(r: Recurrente): string {
  const cada = r.cada >= 1 ? r.cada : 1;
  if (cada === 1) return `Día ${r.dia} de cada mes`;
  const mesInicio = r.inicio ? NOMBRES_MES[Number(r.inicio.slice(5, 7)) - 1] : '';
  if (cada === 12) return mesInicio ? `El ${r.dia} de ${mesInicio}, cada año` : `Día ${r.dia}, cada año`;
  return `Día ${r.dia}, cada ${cada} meses${mesInicio ? ` (desde ${mesInicio})` : ''}`;
}

export type Meta = {
  id: string;
  nombre: string;
  objetivo: number;
  ahorrado: number;
  icono: string;
  fecha: string; // 'YYYY-MM' en el que quieres tenerla lista ('' si no hay fecha)
  aporte: number; // € que se suman solos cada mes (0 = sin aportación automática)
  ultimaAporte: string; // 'YYYY-MM' del último mes ya sumado
};

export function normalizarMeta(m: Meta): Meta {
  return { ...m, fecha: m.fecha ?? '', aporte: m.aporte > 0 ? m.aporte : 0, ultimaAporte: m.ultimaAporte ?? '' };
}

export function normalizar(g: NuevoGasto): Gasto {
  return {
    tipo: 'gasto',
    cuenta: 'banco',
    etiquetas: '',
    moneda: 'EUR',
    importe_original: null,
    divisiones: '',
    foto: '',
    ...g,
  };
}

export function leerDivisiones(g: Pick<Gasto, 'divisiones'>): Division[] {
  if (!g.divisiones) return [];
  try {
    const d = JSON.parse(g.divisiones);
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mesActual(): string {
  return fechaHoy().slice(0, 7);
}

export function mesDesplazado(delta: number): string {
  const d = new Date();
  const f = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
}

export function claveRegla(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dinero con el que se empieza, repartido en dónde está. */
export type FondosIniciales = { efectivo: number; banco: number; ahorros: number };

export const SIN_FONDOS: FondosIniciales = { efectivo: 0, banco: 0, ahorros: 0 };

export function sumaFondos(f: FondosIniciales): number {
  return f.efectivo + f.banco + f.ahorros;
}

export function leerFondos(raw: string | null): FondosIniciales {
  if (!raw) return { ...SIN_FONDOS };
  try {
    const d = JSON.parse(raw);
    const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
    return { efectivo: n(d.efectivo), banco: n(d.banco), ahorros: n(d.ahorros) };
  } catch {
    return { ...SIN_FONDOS };
  }
}
