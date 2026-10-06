/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Interpreta el texto de una notificación / SMS / pago de banco y extrae importe y comercio.

export type Captacion = {
  importe: number | null;
  comercio: string;
  categoria: string;
  esIngreso: boolean;
};

const NUM = String.raw`\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const RE_IMPORTE_ETIQUETA = new RegExp(String.raw`importe\s*[:=]?\s*(?:€|eur)?\s*(${NUM})`, 'i');
const RE_IMPORTE_DESPUES = new RegExp(String.raw`(${NUM})\s*(?:€|eur\b|euros?\b)`, 'i');
const RE_IMPORTE_ANTES = new RegExp(String.raw`(?:€|eur\b)\s*(${NUM})`, 'i');

const RE_INGRESO = /\b(ingreso|abono|has recibido|te han (?:enviado|ingresado)|bizum recibido|recibido|transferencia recibida|devoluci[oó]n|n[oó]mina|reembolso)\b/i;

const CATEGORIAS_PALABRAS: [string, RegExp][] = [
  ['Alimentación', /mercadona|carrefour|lidl|aldi|dia\b|eroski|alcampo|consum|supermercado|panader|carnicer|fruter|restaurante|bar\b|cafeter|burger|mcdonald|telepizza|glovo|uber eats|just eat|starbucks/i],
  ['Transporte', /gasolin|repsol|cepsa|bp\b|shell|galp|renfe|metro|taxi|uber\b|cabify|bolt|parking|peaje|emt\b|ave\b|alsa|ryanair|vueling|iberia|blablacar/i],
  ['Suscripciones', /netflix|spotify|hbo|disney|prime video|amazon prime|apple\.com|icloud|youtube|google one|adobe|openai|chatgpt|dazn|suscrip/i],
  ['Salud', /farmacia|cl[ií]nica|hospital|dentist|m[eé]dic|optic|sanitas|adeslas|fisio/i],
  ['Ocio', /cine|teatro|steam|playstation|nintendo|xbox|concierto|ticketmaster|entradas|gym|gimnasio|decathlon|zara|h&m|primark|amazon/i],
  ['Vivienda', /alquiler|hipoteca|iberdrola|endesa|naturgy|agua\b|luz\b|gas\b|vodafone|movistar|orange|digi\b|ikea|leroy|comunidad|seguro hogar/i],
];

export function numeroDesdeTexto(bruto: string): number | null {
  let s = bruto.replace(/\s/g, '');
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  if (coma !== -1 && punto !== -1) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma !== -1) {
    s = s.replace(',', '.');
  } else if (punto !== -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

export function adivinarCategoria(texto: string): string {
  for (const [cat, re] of CATEGORIAS_PALABRAS) {
    if (re.test(texto)) return cat;
  }
  return 'Otros';
}

function limpiarComercio(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s:*\-–]+|[\s.,;:*\-–]+$/g, '')
    .slice(0, 60);
}

export function interpretarTexto(texto: string): Captacion {
  const t = texto.replace(/\r/g, '\n');

  let importe: number | null = null;
  for (const re of [RE_IMPORTE_ETIQUETA, RE_IMPORTE_DESPUES, RE_IMPORTE_ANTES]) {
    const m = t.match(re);
    if (m) {
      const n = numeroDesdeTexto(m[1]);
      if (n !== null) {
        importe = Math.abs(n);
        break;
      }
    }
  }

  let comercio = '';
  const etiqueta = t.match(/(?:comercio|merchant|establecimiento|concepto)\s*[:=]\s*(.+?)(?=\s+(?:importe|amount|tarjeta|card)\s*[:=]|\n|$)/i);
  if (etiqueta) {
    comercio = limpiarComercio(etiqueta[1]);
  } else {
    const en = t.match(/\b(?:en|at)\s+([^\n.,;]+?)(?=\s+(?:con|el|a las|saldo|tarjeta|\d{1,2}[/-]\d{1,2})\b|[.,;\n]|$)/i);
    if (en) comercio = limpiarComercio(en[1]);
  }

  // Texto libre y corto, como el que se escribe en un atajo: "Café 3,50", "3,50 café", "Ingreso 20 Abuela".
  if (importe === null && !comercio && t.length <= 80 && !t.includes('\n')) {
    const palabras = t.trim().split(/\s+/);
    const i = palabras.findIndex((p) => /^\d+(?:[.,]\d+)*€?$/.test(p));
    if (i !== -1) {
      const n = numeroDesdeTexto(palabras[i].replace('€', ''));
      if (n !== null) {
        importe = Math.abs(n);
        comercio = limpiarComercio(palabras.filter((_, k) => k !== i && !/^(?:ingresos?|gastos?)[.:]?$/i.test(palabras[k])).join(' '));
      }
    }
  }

  const esIngreso = RE_INGRESO.test(t);
  if (esIngreso && !comercio) {
    const de = t.match(/\bde\s+([A-ZÁÉÍÓÚÑ][^\n.,;]*?)(?=\s+(?:con|el|a las|concepto)\b|[.,;\n]|$)/);
    if (de) comercio = limpiarComercio(de[1]);
  }

  return {
    importe,
    comercio,
    categoria: adivinarCategoria(`${comercio} ${t}`),
    esIngreso,
  };
}
