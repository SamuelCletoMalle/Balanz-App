/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Cálculos puros para las gráficas y los avisos inteligentes (se pueden probar sin la app).

export type Mov = { fecha: string; importe: number; tipo: string };
export type PuntoSaldo = { mes: string; saldo: number; proyectado: boolean };

const dos = (n: number) => String(n).padStart(2, '0');

export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}`;
}

const firmado = (g: Mov) => (g.tipo === 'ingreso' ? g.importe : g.tipo === 'gasto' ? -g.importe : 0);

/** Saldo a final de cada uno de los últimos `n` meses (el último es `hasta`). */
export function saldoPorMes(gastos: Mov[], dineroInicial: number, hasta: string, n: number): PuntoSaldo[] {
  const puntos: PuntoSaldo[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const mes = sumarMeses(hasta, -i);
    const limite = `${mes}-31`;
    const saldo = dineroInicial + gastos.filter((g) => g.fecha <= limite).reduce((s, g) => s + firmado(g), 0);
    puntos.push({ mes, saldo: Math.round(saldo * 100) / 100, proyectado: false });
  }
  return puntos;
}

/** Media de lo que cambia el saldo cada mes, mirando los últimos meses completos con movimientos. */
export function variacionMensualMedia(gastos: Mov[], hasta: string, meses = 3): number {
  const cambios: number[] = [];
  for (let i = 1; i <= meses; i++) {
    const mes = sumarMeses(hasta, -i);
    const delMes = gastos.filter((g) => g.fecha.startsWith(mes));
    if (delMes.length) cambios.push(delMes.reduce((s, g) => s + firmado(g), 0));
  }
  return cambios.length ? cambios.reduce((a, b) => a + b, 0) / cambios.length : 0;
}

/** Continúa el saldo `meses` meses más allá del último punto, al ritmo medio reciente. */
export function proyectarSaldo(puntos: PuntoSaldo[], gastos: Mov[], meses: number): PuntoSaldo[] {
  if (!puntos.length || meses <= 0) return [];
  const ultimo = puntos[puntos.length - 1];
  const media = variacionMensualMedia(gastos, ultimo.mes);
  const salida: PuntoSaldo[] = [];
  for (let i = 1; i <= meses; i++) {
    salida.push({ mes: sumarMeses(ultimo.mes, i), saldo: Math.round((ultimo.saldo + media * i) * 100) / 100, proyectado: true });
  }
  return salida;
}

export type Comparativa = { actual: number; anioPasado: number; variacion: number | null };

/** Gastos de un mes frente a los del mismo mes del año anterior. */
export function comparativaMismoMes(gastos: Mov[], mes: string): Comparativa {
  const [a, m] = mes.split('-');
  const previo = `${Number(a) - 1}-${m}`;
  const suma = (p: string) => gastos.filter((g) => g.tipo === 'gasto' && g.fecha.startsWith(p)).reduce((s, g) => s + g.importe, 0);
  const actual = suma(mes);
  const anioPasado = suma(previo);
  return { actual, anioPasado, variacion: anioPasado > 0 ? ((actual - anioPasado) / anioPasado) * 100 : null };
}

/**
 * ¿Se está gastando más deprisa de lo que da el presupuesto? Compara lo gastado con lo "esperado" a estas alturas del mes
 * y devuelve cuántas veces se va por encima (1,4 = un 40 % más), o null si aún es pronto o va bien.
 */
export function ritmoExcesivo(gastado: number, limite: number, dia: number, diasDelMes: number): number | null {
  if (limite <= 0 || dia < 5 || gastado < limite * 0.25 || gastado >= limite) return null;
  const esperado = limite * (dia / diasDelMes);
  const veces = gastado / esperado;
  return veces >= 1.3 ? Math.round(veces * 10) / 10 : null;
}
