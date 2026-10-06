/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import * as Crypto from 'expo-crypto';
import { Gasto, insertGasto, updateGasto, deleteGasto, aprenderRegla, fechaHoy } from './db';
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
