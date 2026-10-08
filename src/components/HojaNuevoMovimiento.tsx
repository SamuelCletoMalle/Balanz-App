/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import GastoModal, { DatosGasto } from './GastoModal';
import { guardarMovimiento } from '../movimientos';
import { cerrarNuevoMovimiento, notificarCambioDatos, useNuevoMovimiento } from '../nuevo-estado';

/** La hoja para apuntar un movimiento nuevo. Se coloca una sola vez en la raíz y se abre desde cualquier pantalla. */
export default function HojaNuevoMovimiento() {
  const { abierto, tipo } = useNuevoMovimiento();
  const guardar = (datos: DatosGasto) => {
    guardarMovimiento(datos, null);
    cerrarNuevoMovimiento();
    notificarCambioDatos();
  };
  return <GastoModal visible={abierto} titulo="Nuevo movimiento" tipoInicial={tipo} onGuardar={guardar} onCancelar={cerrarNuevoMovimiento} />;
}
