/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import * as Crypto from 'expo-crypto';
import { Gasto, insertGasto, updateGasto, deleteGasto, aprenderRegla, fechaHoy, nombreCuenta } from './db';
import { subirGastoANube, borrarGastoDeLaNube } from './sync';
import { comprobarPresupuestos } from './avisos';
import type { DatosGasto } from './components/GastoModal';

/** Crea o actualiza un movimiento, aprende la categoría, lo sube a la nube y revisa los presupuestos. */
export function guardarMovimiento(datos: DatosGasto, existente?: Gasto | null, fecha?: string): Gasto {
  const final: Gasto = existente
    ? { ...existente, ...datos }
    : { id: Crypto.randomUUID(), ...datos, fecha: fecha ?? fechaHoy() };

  if (existente) updateGasto(final);
  else insertGasto(final);

  if (final.tipo === 'gasto') aprenderRegla(final.descripcion, final.categoria);
  subirGastoANube(final).catch(() => {});
  comprobarPresupuestos();
  return final;
}

export function eliminarMovimiento(id: string) {
  deleteGasto(id);
  borrarGastoDeLaNube(id).catch(() => {});
}

/** Vuelve a crear un movimiento borrado (para "Deshacer"). */
export function restaurarMovimiento(g: Gasto) {
  insertGasto(g);
  subirGastoANube(g).catch(() => {});
}

/** Copia de un movimiento con otra id y la fecha de hoy ("Duplicar"). */
export function duplicarMovimiento(g: Gasto): Gasto {
  const copia: Gasto = { ...g, id: Crypto.randomUUID(), fecha: fechaHoy(), foto: '' };
  insertGasto(copia);
  subirGastoANube(copia).catch(() => {});
  return copia;
}

/** Mueve dinero entre cuentas (por ejemplo del banco a ahorros). No cuenta como gasto ni como ingreso. */
export function crearTraspaso(origen: string, destino: string, importe: number): Gasto {
  const t: Gasto = {
    id: Crypto.randomUUID(),
    descripcion: `${nombreCuenta(origen)} → ${nombreCuenta(destino)}`,
    categoria: destino,
    importe,
    fecha: fechaHoy(),
    tipo: 'traspaso',
    cuenta: origen,
    etiquetas: '',
    moneda: 'EUR',
    importe_original: null,
    divisiones: '',
    foto: '',
  };
  insertGasto(t);
  subirGastoANube(t).catch(() => {});
  return t;
}
