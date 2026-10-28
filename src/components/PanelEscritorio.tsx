/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { ReactNode, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Texto';
import { Tarjeta } from './ui';
import DonutCategorias from './DonutCategorias';
import BarrasMeses from './BarrasMeses';
import PresupuestosCategorias from './PresupuestosCategorias';
import FormularioRapido from './FormularioRapido';
import { cambiarPreferencias, usePreferencias } from '../accesibilidad';
import { useVersionDatos } from '../nuevo-estado';
import { Gasto, getGastos, getPresupuestosCategoria, getTotalesUltimosMeses, mesActual, nombreMetodo } from '../db';
import { formatoEuro, formatoFecha, infoCategoria, tintaCategoria, useTema } from '../tema';

type Props = {
  saldo: number;
  cuentas: Record<string, number>;
  avisoPendientes: ReactNode;
  tarjetaCobro: ReactNode;
  totalMes: number;
  ingresosMes: number;
  categorias: { categoria: string; total: number }[];
};

// Medidas del panel. El ancho útil es el de la ventana menos el menú lateral, con un tope, y menos los márgenes.
const MENU = 220;
const TOPE = 1500;
const MARGEN = 32;
const SEPARACION = 22;
const COLUMNA_FORMULARIO = 330;
const FILAS_TABLA = 14;

const CUENTAS_PANEL = [
  { id: 'banco', nombre: 'Cuenta bancaria', icono: 'card-outline' },
  { id: 'efectivo', nombre: 'Efectivo', icono: 'cash-outline' },
  { id: 'ahorros', nombre: 'Ahorros', icono: 'wallet-outline' },
] as const;

function fechaLarga(): string {
  const t = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * El panel principal en ordenador. Arriba, a la izquierda, lo del mes (dinero por cuenta, ingresos, gastos y lo que
 * queda, reparto, evolución y presupuestos); a la derecha, el formulario para apuntar al momento; y debajo, a todo
 * lo ancho, los movimientos del mes en una tabla. Con poco ancho todo pasa a una sola columna para que nada se apriete.
 */
export default function PanelEscritorio({ saldo, cuentas, avisoPendientes, tarjetaCobro, totalMes, ingresosMes, categorias }: Props) {
  const tema = useTema();
  const router = useRouter();
  const version = useVersionDatos();
  const { ocultarImportes } = usePreferencias();
  const { width } = useWindowDimensions();
  const [meses, setMeses] = useState<{ mes: string; total: number }[]>([]);
  const [movimientos, setMovimientos] = useState<Gasto[]>([]);
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      const mes = mesActual();
      setMeses(getTotalesUltimosMeses(6));
      setMovimientos(getGastos().filter((g) => g.fecha.startsWith(mes) && g.tipo !== 'traspaso'));
      setPresupuestos(getPresupuestosCategoria());
      // `version` vuelve a leer todo cuando se apunta algo desde el formulario o la hoja global.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version])
  );

  const util = Math.min(width - MENU, TOPE) - MARGEN;
  const estrecho = util < 940;
  const conMetodo = util >= 880;
  const centro = estrecho ? util : util - COLUMNA_FORMULARIO - SEPARACION;
  const apilar = centro < 700;

  const queda = ingresosMes - totalMes;
  const verde = tema.oscuro ? tema.acento : tema.exito;
  const colorQueda = queda >= 0 ? verde : tema.peligro;
  const hayAvisos = !!(avisoPendientes || tarjetaCobro);

  const dinero = (
    <Tarjeta style={{ gap: 14 }}>
      <View style={styles.cabeceraDinero}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>TU DINERO</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={{ color: tema.textoSuave, fontSize: 13, fontVariant: ['tabular-nums'] }}>Total {formatoEuro(saldo)}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={ocultarImportes ? 'Mostrar los importes' : 'Ocultar los importes'}
            hitSlop={10}
            onPress={() => cambiarPreferencias({ ocultarImportes: !ocultarImportes })}
          >
            <Ionicons name={ocultarImportes ? 'eye-off-outline' : 'eye-outline'} size={19} color={tema.textoSuave} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.fila, { gap: 12 }]}>
        {CUENTAS_PANEL.map((c) => (
          <View key={c.id} style={[styles.cuenta, { backgroundColor: tema.tarjetaSuave }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={c.icono} size={14} color={tema.textoSuave} />
              <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {c.nombre}
              </Text>
            </View>
            <Text style={[styles.cuentaValor, { color: tema.texto }]} numberOfLines={1}>
              {formatoEuro(cuentas[c.id] ?? 0)}
            </Text>
          </View>
        ))}
      </View>
    </Tarjeta>
  );

  const kpis = (
    <View style={[styles.fila, { gap: SEPARACION }]}>
      <Tarjeta style={styles.kpi}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>INGRESOS DEL MES</Text>
        <Text style={[styles.kpiValor, { color: tema.texto }]} numberOfLines={1}>
          {formatoEuro(ingresosMes)}
        </Text>
      </Tarjeta>
      <Tarjeta style={styles.kpi}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>GASTOS DEL MES</Text>
        <Text style={[styles.kpiValor, { color: tema.texto }]} numberOfLines={1}>
          {formatoEuro(totalMes)}
        </Text>
      </Tarjeta>
      <Tarjeta style={[styles.kpi, { borderColor: colorQueda, backgroundColor: colorQueda + '14' }]}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>TE QUEDA</Text>
        <Text style={[styles.kpiValor, { color: colorQueda }]} numberOfLines={1}>
          {formatoEuro(queda)}
        </Text>
      </Tarjeta>
    </View>
  );

  const principal = (
    <View style={{ flex: 1, minWidth: 0, gap: SEPARACION }}>
      {dinero}
      {kpis}
      {estrecho ? <FormularioRapido /> : null}

      <View style={[apilar ? styles.columna : styles.fila, { gap: SEPARACION }]}>
        <View style={apilar ? null : { flex: 1.4 }}>
          <DonutCategorias filas={categorias} titulo="Gastos por categoría" horizontal />
        </View>
        <View style={apilar ? null : { flex: 1 }}>
          <BarrasMeses meses={meses} />
        </View>
      </View>

      <View style={[apilar || !hayAvisos ? styles.columna : styles.fila, { gap: SEPARACION }]}>
        <View style={apilar || !hayAvisos ? null : { flex: 1.5 }}>
          <PresupuestosCategorias presupuestos={presupuestos} gastado={categorias} />
        </View>
        {hayAvisos ? (
          <View style={[{ gap: SEPARACION }, apilar ? null : { flex: 1 }]}>
            {avisoPendientes}
            {tarjetaCobro}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pagina} showsVerticalScrollIndicator={false}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: tema.texto }]}>Inicio</Text>
        <Text style={{ color: tema.textoSuave, fontSize: 14 }}>{fechaLarga()}</Text>
      </View>

      <View style={{ gap: SEPARACION }}>
        <View style={[styles.fila, { gap: SEPARACION, alignItems: 'flex-start' }]}>
          {principal}
          {estrecho ? null : (
            <View style={{ width: COLUMNA_FORMULARIO }}>
              <FormularioRapido />
            </View>
          )}
        </View>

        <Tarjeta style={{ padding: 0, gap: 0 }}>
          <View style={styles.cabeceraTabla}>
            <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>MOVIMIENTOS DEL MES</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/movimientos')} style={[styles.todos, { borderColor: tema.borde }]}>
              <Text style={{ color: tema.texto, fontSize: 12, fontWeight: '700' }}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {movimientos.length === 0 ? (
            <Text style={{ color: tema.textoSuave, fontSize: 14, lineHeight: 20, padding: 20, paddingTop: 4 }}>
              Todavía no hay movimientos este mes. Apunta el primero con el formulario.
            </Text>
          ) : (
            <>
              <View style={[styles.filaTabla, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tema.borde, paddingVertical: 8 }]}>
                <Text style={[styles.cabecera1, styles.colFecha, { color: tema.textoSuave }]}>FECHA</Text>
                <Text style={[styles.cabecera1, { flex: 1, color: tema.textoSuave }]}>DESCRIPCIÓN</Text>
                <Text style={[styles.cabecera1, styles.colCategoria, { color: tema.textoSuave }]}>CATEGORÍA</Text>
                {conMetodo ? <Text style={[styles.cabecera1, styles.colMetodo, { color: tema.textoSuave }]}>MÉTODO</Text> : null}
                <Text style={[styles.cabecera1, styles.colImporte, { color: tema.textoSuave }]}>IMPORTE</Text>
              </View>
              {movimientos.slice(0, FILAS_TABLA).map((g, i) => {
                const cat = infoCategoria(g.categoria);
                const ingreso = g.tipo === 'ingreso';
                return (
                  <TouchableOpacity
                    key={g.id}
                    accessibilityRole="button"
                    onPress={() => router.push('/movimientos')}
                    style={[styles.filaTabla, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tema.borde } : null]}
                  >
                    <Text style={[styles.colFecha, { color: tema.textoSuave, fontSize: 13 }]}>{formatoFecha(g.fecha)}</Text>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                        {g.descripcion}
                      </Text>
                      {g.nota ? (
                        <Text style={{ color: tema.textoSuave, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {g.nota}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.colCategoria, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                      <View style={[styles.punto, { backgroundColor: tintaCategoria(cat.color, tema.oscuro) }]} />
                      <Text style={{ color: tema.texto, fontSize: 13 }} numberOfLines={1}>
                        {g.categoria}
                      </Text>
                    </View>
                    {conMetodo ? (
                      <Text style={[styles.colMetodo, { color: tema.textoSuave, fontSize: 13 }]} numberOfLines={1}>
                        {nombreMetodo(g.metodo) || '—'}
                      </Text>
                    ) : null}
                    <Text style={[styles.colImporte, { color: ingreso ? tema.exito : tema.texto, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>
                      {ingreso ? '+' : '−'}
                      {formatoEuro(g.importe)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {movimientos.length > FILAS_TABLA ? (
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/movimientos')} style={[styles.pieTabla, { borderTopColor: tema.borde }]}>
                  <Text style={{ color: tema.oscuro ? tema.acento : tema.texto, fontSize: 13, fontWeight: '700' }}>Ver los {movimientos.length} movimientos del mes</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </Tarjeta>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pagina: { paddingBottom: 64 },
  cabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 26 },
  titulo: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  fila: { flexDirection: 'row', alignItems: 'stretch' },
  columna: { flexDirection: 'column' },
  etiqueta: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cabeceraDinero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cuenta: { flex: 1, borderRadius: 14, padding: 14, gap: 6 },
  cuentaValor: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  kpi: { flex: 1, gap: 8, padding: 20 },
  kpiValor: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  cabeceraTabla: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  todos: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  filaTabla: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  cabecera1: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  colFecha: { width: 96 },
  colCategoria: { width: 170 },
  colMetodo: { width: 130 },
  colImporte: { width: 120, textAlign: 'right' },
  punto: { width: 8, height: 8, borderRadius: 4 },
  pieTabla: { alignItems: 'center', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
