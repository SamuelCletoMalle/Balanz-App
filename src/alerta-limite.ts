/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useSyncExternalStore } from 'react';
import type { IconoNombre } from './tema';

// Cola de avisos en pantalla "has superado el límite". Los pone `comprobarPresupuestos` y los enseña <AlertaLimite />.
export type AvisoLimite = { id: string; titulo: string; icono: IconoNombre; color: string | null; gastado: number; limite: number };

let cola: AvisoLimite[] = [];
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());
const suscribir = (cb: () => void) => {
  oyentes.add(cb);
  return () => {
    oyentes.delete(cb);
  };
};

export function mostrarAlertaLimite(aviso: AvisoLimite) {
  if (cola.some((a) => a.id === aviso.id)) return;
  cola = [...cola, aviso];
  avisar();
}

export function cerrarAlertaLimite() {
  cola = cola.slice(1);
  avisar();
}

export function useAlertaLimite(): AvisoLimite | null {
  return useSyncExternalStore(suscribir, () => cola[0] ?? null, () => null);
}
