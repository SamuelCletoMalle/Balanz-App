/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Comprobación solo de tipos: la base de web (db.web.ts) debe exponer lo mismo que la nativa (db.ts).
// Si alguien añade una función a una y no a la otra, `npx tsc --noEmit` falla aquí.
import type * as Nativa from './db';
import type * as Web from './db.web';

type ApiNativa = Omit<typeof Nativa, 'db'>;

export const paridadWebNativa = (web: typeof Web): ApiNativa => web;
