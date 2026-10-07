/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useSyncExternalStore } from 'react';

// La intro termina "aterrizando" el logo en la cabecera de Movimientos. Este aviso le dice a la cabecera cuándo
// puede enseñar su propio logo (justo donde el de la intro acaba), para que el relevo no se note.
let listo = false;
const oyentes = new Set<() => void>();

export function marcarIntroLista() {
  if (listo) return;
  listo = true;
  oyentes.forEach((f) => f());
}

export function useIntroLista(): boolean {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => listo,
    () => true
  );
}
