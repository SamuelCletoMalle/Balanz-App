/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { getMetas, updateMeta, mesActual } from './db';
export { aportacionNecesaria } from './metas-calculo';

const mesSiguiente = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Suma a cada meta su aportación mensual por los meses que lleguen sin sumar (máx. 12 de golpe). */
export function aplicarAportesAutomaticos(actual: string = mesActual()): number {
  let sumas = 0;
  for (const m of getMetas()) {
    if (m.aporte <= 0 || m.ahorrado >= m.objetivo) continue;
    const [ay, am] = actual.split('-').map(Number);
    const minimo = new Date(ay, am - 12, 1);
    const tope = `${minimo.getFullYear()}-${String(minimo.getMonth() + 1).padStart(2, '0')}`;
    let mes = m.ultimaAporte ? mesSiguiente(m.ultimaAporte) : actual;
    if (mes < tope) mes = tope;
    let ahorrado = m.ahorrado;
    let ultima = m.ultimaAporte;
    while (mes <= actual && ahorrado < m.objetivo) {
      ahorrado = Math.min(m.objetivo, Math.round((ahorrado + m.aporte) * 100) / 100);
      ultima = mes;
      mes = mesSiguiente(mes);
      sumas++;
    }
    if (ultima !== m.ultimaAporte) updateMeta({ ...m, ahorrado, ultimaAporte: ultima });
  }
  return sumas;
}
