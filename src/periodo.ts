/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
export type Periodo = 'todo' | 'mes' | 'anterior' | 'anio' | 'personal';

export const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: 'todo', nombre: 'Todo' },
  { id: 'mes', nombre: 'Este mes' },
  { id: 'anterior', nombre: 'Mes pasado' },
  { id: 'anio', nombre: 'Este año' },
  { id: 'personal', nombre: 'Fechas…' },
];

const dos = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${dos(m)}-${dos(d)}`;

/** Admite 5/3/2026, 05-03-2026, 5.3.26 y 2026-03-05. Devuelve AAAA-MM-DD o null. */
export function parsearFecha(texto: string): string | null {
  const t = texto.trim();
  let y: number, m: number, d: number;
  const a = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const b = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (a) [y, m, d] = [+a[1], +a[2], +a[3]];
  else if (b) [d, m, y] = [+b[1], +b[2], +b[3] < 100 ? 2000 + +b[3] : +b[3]];
  else return null;
  const f = new Date(y, m - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== m - 1 || f.getDate() !== d) return null;
  return iso(y, m, d);
}

/** Rango de fechas (ambas incluidas) del periodo, o null si no filtra. */
export function rangoPeriodo(periodo: Periodo, hoy: Date, desdeTexto = '', hastaTexto = ''): { desde: string; hasta: string } | null {
  const y = hoy.getFullYear();
  const m = hoy.getMonth() + 1;
  if (periodo === 'mes') return { desde: iso(y, m, 1), hasta: iso(y, m, 31) };
  if (periodo === 'anterior') {
    const ant = new Date(y, m - 2, 1);
    return { desde: iso(ant.getFullYear(), ant.getMonth() + 1, 1), hasta: iso(ant.getFullYear(), ant.getMonth() + 1, 31) };
  }
  if (periodo === 'anio') return { desde: iso(y, 1, 1), hasta: iso(y, 12, 31) };
  if (periodo === 'personal') {
    const desde = parsearFecha(desdeTexto) ?? '0000-01-01';
    const hasta = parsearFecha(hastaTexto) ?? '9999-12-31';
    return desde === '0000-01-01' && hasta === '9999-12-31' ? null : { desde, hasta };
  }
  return null;
}

/** Admite 6/2027, 06/27, 06-2027 y 2027-06. Devuelve AAAA-MM o null. */
export function parsearMes(texto: string): string | null {
  const t = texto.trim();
  let y: number, m: number;
  const a = t.match(/^(\d{4})-(\d{1,2})$/);
  const b = t.match(/^(\d{1,2})[/.-](\d{2,4})$/);
  if (a) [y, m] = [+a[1], +a[2]];
  else if (b) [m, y] = [+b[1], +b[2] < 100 ? 2000 + +b[2] : +b[2]];
  else return null;
  if (m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return `${y}-${dos(m)}`;
}
