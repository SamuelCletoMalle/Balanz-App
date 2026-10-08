/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */

// Las pantallas secundarias no tienen pestaña propia: al estar en ellas, la barra resalta la pestaña de la que cuelgan.
const PADRE: Record<string, string> = {
  pendientes: 'index',
  nuevo: 'index',
  bienvenida: 'index',
  categorias: 'ajustes',
  reglas: 'ajustes',
  compartidos: 'ajustes',
  atajos: 'ajustes',
  informe: 'presupuesto',
  metas: 'planes',
  recurrentes: 'planes',
};

/** Nombre de la pestaña que debe verse activa cuando la ruta actual es `ruta`. */
export function pestanaActiva(ruta: string): string {
  return PADRE[ruta] ?? ruta;
}
