/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Gasto, NuevoGasto, getGastos, getMetas, insertMeta, deleteMeta } from './db';
import { eliminarMovimiento, restaurarMovimiento } from './movimientos';

// Datos de ejemplo para ver cómo queda la app con movimientos de un par de meses. Todos llevan un id que empieza por
// "ejemplo-", así se pueden quitar de golpe sin tocar nada de lo que hayas apuntado tú.
const PREFIJO = 'ejemplo-';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hace = (dias: number) => iso(new Date(Date.now() - dias * 86400000));

type Fila = [descripcion: string, categoria: string, importe: number, dias: number, tipo?: 'gasto' | 'ingreso', metodo?: string, nota?: string];

const FILAS: Fila[] = [
  ['Mercadona', 'Alimentación', 54.3, 0, 'gasto', 'tarjeta'],
  ['Gasolina', 'Transporte', 48, 1, 'gasto', 'tarjeta'],
  ['Netflix', 'Suscripciones', 12.99, 2, 'gasto', 'domiciliacion'],
  ['Café con Marta', 'Comidas fuera', 4.5, 2, 'gasto', 'efectivo'],
  ['Farmacia', 'Salud', 18.2, 3, 'gasto', 'tarjeta'],
  ['Nómina', 'Nómina', 1850, 4, 'ingreso', 'transferencia'],
  ['Cena en el italiano', 'Comidas fuera', 62.4, 5, 'gasto', 'tarjeta', 'Cumpleaños de Laura'],
  ['Alquiler', 'Vivienda', 640, 6, 'gasto', 'domiciliacion'],
  ['Carrefour', 'Alimentación', 87.15, 7, 'gasto', 'tarjeta'],
  ['Spotify', 'Suscripciones', 10.99, 9, 'gasto', 'domiciliacion'],
  ['Abono de transporte', 'Transporte', 30, 10, 'gasto', 'tarjeta'],
  ['Cine', 'Ocio', 19, 11, 'gasto', 'bizum', 'Con los amigos'],
  ['Camiseta', 'Ropa', 24.95, 12, 'gasto', 'tarjeta'],
  ['Lámpara del salón', 'Hogar', 39.9, 13, 'gasto', 'tarjeta'],
  ['Regalo de cumpleaños', 'Regalos', 35, 15, 'gasto', 'efectivo'],
  ['Mercadona', 'Alimentación', 71.8, 16, 'gasto', 'tarjeta'],
  ['Luz', 'Vivienda', 58.4, 18, 'gasto', 'domiciliacion'],
  ['Trabajo de diseño', 'Freelance', 320, 20, 'ingreso', 'bizum'],
  ['Dentista', 'Salud', 90, 22, 'gasto', 'tarjeta'],
  ['Gimnasio', 'Suscripciones', 29.9, 25, 'gasto', 'domiciliacion'],
  ['Mercadona', 'Alimentación', 64.2, 27, 'gasto', 'tarjeta'],
  ['Nómina', 'Nómina', 1850, 34, 'ingreso', 'transferencia'],
  ['Alquiler', 'Vivienda', 640, 36, 'gasto', 'domiciliacion'],
  ['Restaurante', 'Comidas fuera', 45, 38, 'gasto', 'tarjeta'],
  ['Netflix', 'Suscripciones', 12.99, 32, 'gasto', 'domiciliacion'],
  ['Mercadona', 'Alimentación', 92.6, 41, 'gasto', 'tarjeta'],
  ['Zapatillas', 'Ropa', 69.9, 44, 'gasto', 'tarjeta'],
  ['Gasolina', 'Transporte', 52.3, 46, 'gasto', 'tarjeta'],
  ['Regalo de aniversario', 'Regalos', 48, 49, 'gasto', 'tarjeta'],
  ['Reparación del grifo', 'Hogar', 85, 52, 'gasto', 'efectivo'],
  ['Extra de verano', 'Extras', 150, 55, 'ingreso', 'efectivo'],
  ['Nómina', 'Nómina', 1850, 64, 'ingreso', 'transferencia'],
  ['Alquiler', 'Vivienda', 640, 66, 'gasto', 'domiciliacion'],
  ['Mercadona', 'Alimentación', 110.3, 70, 'gasto', 'tarjeta'],
];

export function hayDatosDeEjemplo(): boolean {
  return getGastos().some((g) => g.id.startsWith(PREFIJO)) || getMetas().some((m) => m.id.startsWith(PREFIJO));
}

/** Añade unos dos meses de movimientos y una meta de ejemplo. Devuelve cuántos movimientos ha creado. */
export function cargarDatosDeEjemplo(): number {
  if (hayDatosDeEjemplo()) return 0;
  FILAS.forEach(([descripcion, categoria, importe, dias, tipo = 'gasto', metodo = '', nota = ''], i) => {
    const g: NuevoGasto = {
      id: `${PREFIJO}${i + 1}`,
      descripcion,
      categoria,
      importe,
      fecha: hace(dias),
      tipo,
      metodo,
      nota,
      etiquetas: 'ejemplo',
      cuenta: metodo === 'efectivo' ? 'efectivo' : 'banco',
    };
    restaurarMovimiento(g as Gasto);
  });
  insertMeta({ id: `${PREFIJO}meta`, nombre: 'Viaje a Japón (ejemplo)', objetivo: 1500, ahorrado: 420, icono: 'airplane-outline', fecha: '', aporte: 0, ultimaAporte: '' });
  return FILAS.length;
}

/** Quita todo lo de ejemplo y deja intacto lo que hayas apuntado tú. Devuelve cuántos movimientos ha borrado. */
export function quitarDatosDeEjemplo(): number {
  const mios = getGastos().filter((g) => g.id.startsWith(PREFIJO));
  mios.forEach((g) => eliminarMovimiento(g.id));
  getMetas()
    .filter((m) => m.id.startsWith(PREFIJO))
    .forEach((m) => deleteMeta(m.id));
  return mios.length;
}
