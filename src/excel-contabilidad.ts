/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import JSZip from 'jszip';
import type { Gasto } from './db-comun';

/**
 * Libro de contabilidad anual con el mismo formato de siempre:
 *  - "Inicio": dinero a principio de año, dinero actual y resumen mensual (con colores verde/rojo).
 *  - Una hoja por mes con INGRESOS a la izquierda y GASTOS a la derecha (Fecha · Cantidad · Concepto) y sus totales.
 * Se escribe el .xlsx a mano (XML dentro de un zip) para poder dar formato sin librerías pesadas, en web y en móvil.
 */

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const FILAS_MIN = 103; // las hojas traen formato hasta la fila 103 como la plantilla original

// Índices de estilo (cellXfs) definidos en estilosXml().
const E = {
  base: 0,
  etiquetaInicio: 1,
  euroCentro: 2,
  cabecera14: 3,
  cabecera11: 4,
  mes: 5,
  titulo: 6,
  totalEtiqueta: 7,
  totalEuro: 8,
  cabeceraTabla: 9,
  fechaIngreso: 10,
  fechaGasto: 11,
  euroBorde: 12,
  textoBorde: 13,
};

const esc = (t: string) =>
  t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // caracteres de control que romperían el XML
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

function columna(i: number): string {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const serialExcel = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

type Celda = { c: number; xml: string };
class Hoja {
  filas = new Map<number, { alto?: number; celdas: Celda[] }>();
  fusiones: string[] = [];
  extra = '';
  ancho: (number | undefined)[] = [];
  ultimaCol = 0;
  private fila(r: number) {
    let f = this.filas.get(r);
    if (!f) this.filas.set(r, (f = { celdas: [] }));
    return f;
  }
  alto(r: number, h: number) {
    this.fila(r).alto = h;
  }
  texto(r: number, c: number, t: string, estilo: number) {
    this.poner(r, c, `<c r="${columna(c)}${r}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`);
  }
  numero(r: number, c: number, n: number, estilo: number) {
    this.poner(r, c, `<c r="${columna(c)}${r}" s="${estilo}"><v>${n}</v></c>`);
  }
  formula(r: number, c: number, f: string, valor: number, estilo: number) {
    this.poner(r, c, `<c r="${columna(c)}${r}" s="${estilo}"><f>${esc(f)}</f><v>${valor}</v></c>`);
  }
  vacia(r: number, c: number, estilo: number) {
    this.poner(r, c, `<c r="${columna(c)}${r}" s="${estilo}"/>`);
  }
  private poner(r: number, c: number, xml: string) {
    this.ultimaCol = Math.max(this.ultimaCol, c);
    this.fila(r).celdas.push({ c, xml });
  }
  xml(): string {
    const filas = Array.from(this.filas.entries()).sort((a, b) => a[0] - b[0]);
    const ultimaFila = filas.length ? filas[filas.length - 1][0] : 1;
    const cols = this.ancho
      .map((w, i) => (w ? `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>` : ''))
      .join('');
    const datos = filas
      .map(([r, f]) => {
        const celdas = f.celdas.sort((a, b) => a.c - b.c).map((x) => x.xml).join('');
        return `<row r="${r}"${f.alto ? ` ht="${f.alto}" customHeight="1"` : ''}>${celdas}</row>`;
      })
      .join('');
    const fus = this.fusiones.length ? `<mergeCells count="${this.fusiones.length}">${this.fusiones.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<dimension ref="A1:${columna(this.ultimaCol)}${ultimaFila}"/>` +
      '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      (cols ? `<cols>${cols}</cols>` : '') +
      `<sheetData>${datos}</sheetData>` +
      fus +
      this.extra +
      '</worksheet>'
    );
  }
}

function estilosXml(): string {
  const borde = '<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>';
  const centro = '<alignment horizontal="center" vertical="center"/>';
  const xf = (numFmt: number, font: number, fill: number, border: number) =>
    `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${centro}</xf>`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="[$EUR ]#,##0.00_-"/><numFmt numFmtId="165" formatCode="d\\-mmm"/></numFmts>' +
    '<fonts count="6">' +
    '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="20"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="12"/><name val="Calibri"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF003366"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF002060"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${borde}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="14">' +
    xf(0, 0, 0, 0) + // 0 base
    xf(0, 3, 2, 0) + // 1 etiqueta Inicio (blanco sobre azul)
    xf(164, 0, 0, 0) + // 2 euros centrado
    xf(0, 4, 3, 0) + // 3 cabecera grande
    xf(0, 3, 3, 0) + // 4 cabecera
    xf(0, 5, 0, 0) + // 5 mes
    xf(0, 2, 0, 0) + // 6 INGRESOS / GASTOS
    xf(0, 1, 0, 1) + // 7 etiqueta total
    xf(164, 1, 0, 1) + // 8 total en euros
    xf(0, 3, 2, 1) + // 9 cabecera de tabla
    xf(14, 0, 0, 1) + // 10 fecha ingresos
    xf(165, 0, 0, 1) + // 11 fecha gastos
    xf(164, 0, 0, 1) + // 12 euros con borde
    xf(0, 0, 0, 1) + // 13 texto con borde
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '<dxfs count="2">' +
    '<dxf><font><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>' +
    '<dxf><font><color rgb="FF006100"/></font><fill><patternFill><bgColor rgb="FFC6EFCE"/></patternFill></fill></dxf>' +
    '</dxfs></styleSheet>'
  );
}

export type DatosLibro = {
  anio: number;
  /** Dinero con el que empezó el año (dinero inicial + lo ocurrido en años anteriores). */
  dineroInicioAnio: number;
  gastos: Gasto[];
};

export function datosDeAnio(todos: Gasto[], dineroInicial: number, anio: number): DatosLibro {
  const prefijo = `${anio}-`;
  const antes = todos.filter((g) => g.fecha < prefijo);
  const neto = antes.reduce((s, g) => s + (g.tipo === 'ingreso' ? g.importe : -g.importe), 0);
  return {
    anio,
    dineroInicioAnio: Math.round((dineroInicial + neto) * 100) / 100,
    gastos: todos.filter((g) => g.fecha.startsWith(prefijo)),
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function hojaMes(mes: number, gastos: Gasto[]): { hoja: Hoja; ingresos: number; gastosTotal: number } {
  const delMes = gastos
    .filter((g) => Number(g.fecha.slice(5, 7)) === mes + 1)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const ingresos = delMes.filter((g) => g.tipo === 'ingreso');
  const salidas = delMes.filter((g) => g.tipo !== 'ingreso');
  const ultima = Math.max(FILAS_MIN, 4 + Math.max(ingresos.length, salidas.length));
  const totalIng = r2(ingresos.reduce((s, g) => s + g.importe, 0));
  const totalGas = r2(salidas.reduce((s, g) => s + g.importe, 0));

  const h = new Hoja();
  h.ancho = [22.2, 22.2, 22.2, undefined, undefined, 22.2, 22.2, 22.2];
  h.alto(1, 25.2);
  h.texto(1, 0, 'INGRESOS', E.titulo);
  h.texto(1, 5, 'GASTOS', E.titulo);
  h.fusiones.push('A1:C1', 'F1:H1');
  h.texto(2, 0, 'Total Ingresos en Mes:', E.totalEtiqueta);
  h.formula(2, 1, `SUM(B5:B${ultima})`, totalIng, E.totalEuro);
  h.texto(2, 5, 'Total Gastos en Mes:', E.totalEtiqueta);
  h.formula(2, 6, `SUM(G5:G${ultima})`, totalGas, E.totalEuro);
  ['Fecha', 'Cantidad (€)', 'Concepto'].forEach((t, i) => {
    h.texto(4, i, t, E.cabeceraTabla);
    h.texto(4, 5 + i, t, E.cabeceraTabla);
  });
  for (let r = 5; r <= ultima; r++) {
    const i = ingresos[r - 5];
    const g = salidas[r - 5];
    if (i) {
      h.numero(r, 0, serialExcel(i.fecha), E.fechaIngreso);
      h.numero(r, 1, r2(i.importe), E.euroBorde);
      h.texto(r, 2, i.descripcion, E.textoBorde);
    } else {
      h.vacia(r, 0, E.fechaIngreso);
      h.vacia(r, 1, E.euroBorde);
      h.vacia(r, 2, E.textoBorde);
    }
    if (g) {
      h.numero(r, 5, serialExcel(g.fecha), E.fechaGasto);
      h.numero(r, 6, r2(g.importe), E.euroBorde);
      h.texto(r, 7, g.descripcion, E.textoBorde);
    } else {
      h.vacia(r, 5, E.fechaGasto);
      h.vacia(r, 6, E.euroBorde);
      h.vacia(r, 7, E.textoBorde);
    }
  }
  return { hoja: h, ingresos: totalIng, gastosTotal: totalGas };
}

function hojaInicio(d: DatosLibro, totales: { ingresos: number; gastos: number }[]): Hoja {
  const h = new Hoja();
  h.ancho = [22.1, 14.9, 13.2];
  h.texto(1, 0, 'Dinero inicio de año (€)', E.etiquetaInicio);
  h.numero(1, 1, d.dineroInicioAnio, E.euroCentro);
  const sumaIng = totales.reduce((s, t) => s + t.ingresos, 0);
  const sumaGas = totales.reduce((s, t) => s + t.gastos, 0);
  h.texto(2, 0, 'Dinero actual (€)', E.etiquetaInicio);
  h.formula(2, 1, 'B1+SUM(B6:B18)-SUM(C6:C18)', r2(d.dineroInicioAnio + sumaIng - sumaGas), E.euroCentro);
  h.alto(4, 28.2);
  h.alto(5, 28.2);
  h.texto(4, 0, 'Resumen mensual', E.cabecera14);
  h.vacia(4, 1, E.cabecera14);
  h.vacia(4, 2, E.cabecera14);
  h.fusiones.push('A4:C4');
  h.texto(5, 0, 'Mes', E.cabecera14);
  h.texto(5, 1, 'Ingresos', E.cabecera11);
  h.texto(5, 2, 'Gastos', E.cabecera11);
  let cf = '';
  let prioridad = 1;
  MESES.forEach((mes, i) => {
    const r = 6 + i;
    h.alto(r, 28.2);
    h.texto(r, 0, mes, E.mes);
    h.formula(r, 1, `${mes}!B2`, totales[i].ingresos, E.euroCentro);
    h.formula(r, 2, `${mes}!G2`, totales[i].gastos, E.euroCentro);
    cf +=
      `<conditionalFormatting sqref="B${r}">` +
      `<cfRule type="cellIs" dxfId="0" priority="${prioridad++}" operator="lessThan"><formula>$C$${r}</formula></cfRule>` +
      `<cfRule type="cellIs" dxfId="1" priority="${prioridad++}" operator="greaterThan"><formula>$C$${r}</formula></cfRule>` +
      '</conditionalFormatting>';
  });
  h.extra = cf;
  return h;
}

/** Devuelve el .xlsx ya generado, en el formato que se pida (base64 para el móvil, blob para el navegador). */
export async function generarLibroContabilidad<T extends 'base64' | 'blob'>(d: DatosLibro, salida: T): Promise<T extends 'blob' ? Blob : string> {
  const meses = MESES.map((_, i) => hojaMes(i, d.gastos));
  const inicio = hojaInicio(
    d,
    meses.map((m) => ({ ingresos: m.ingresos, gastos: m.gastosTotal }))
  );
  const hojas = [{ nombre: 'Inicio', hoja: inicio }, ...MESES.map((nombre, i) => ({ nombre, hoja: meses[i].hoja }))];

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  );
  zip.file(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets>${hojas.map((h, i) => `<sheet name="${h.nombre}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
      '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>'
  );
  zip.file('xl/styles.xml', estilosXml());
  hojas.forEach((h, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, h.hoja.xml()));

  const opciones = { compression: 'DEFLATE' as const };
  return (salida === 'blob' ? await zip.generateAsync({ ...opciones, type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) : await zip.generateAsync({ ...opciones, type: 'base64' })) as T extends 'blob' ? Blob : string;
}
