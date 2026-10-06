/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Tipos y utilidades que comparten la base nativa (SQLite, db.ts) y la de web (db.web.ts).

export type Tipo = 'gasto' | 'ingreso';

export type Division = { nombre: string; importe: number; pagado: boolean };

export type Gasto = {
  id: string;
  descripcion: string;
  categoria: string;
  importe: number; // siempre en EUR
  fecha: string;
  tipo: Tipo;
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
};

export type Meta = { id: string; nombre: string; objetivo: number; ahorrado: number; icono: string };

export function normalizar(g: NuevoGasto): Gasto {
  return {
    tipo: 'gasto',
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
