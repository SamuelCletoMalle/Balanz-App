/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useSyncExternalStore } from 'react';

// Estado compartido de "apuntar un movimiento nuevo": cualquier pantalla puede abrir la hoja (botón "+", accesos
// rápidos de Inicio…) y, al guardar, avisa para que las pantallas que muestran datos se vuelvan a leer.

type Nuevo = { abierto: boolean; tipo: 'gasto' | 'ingreso' };
let nuevo: Nuevo = { abierto: false, tipo: 'gasto' };
let version = 0;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());
const suscribir = (cb: () => void) => {
  oyentes.add(cb);
  return () => {
    oyentes.delete(cb);
  };
};

export function abrirNuevoMovimiento(tipo: 'gasto' | 'ingreso' = 'gasto') {
  nuevo = { abierto: true, tipo };
  avisar();
}

export function cerrarNuevoMovimiento() {
  if (!nuevo.abierto) return;
  nuevo = { ...nuevo, abierto: false };
  avisar();
}

/** Se llama tras guardar, borrar o importar datos desde fuera de la pantalla que los muestra. */
export function notificarCambioDatos() {
  version++;
  avisar();
}

export function useNuevoMovimiento(): Nuevo {
  return useSyncExternalStore(suscribir, () => nuevo, () => nuevo);
}

/** Número que cambia cada vez que se guardan datos: las pantallas lo usan para volver a leerlos. */
export function useVersionDatos(): number {
  return useSyncExternalStore(suscribir, () => version, () => 0);
}
