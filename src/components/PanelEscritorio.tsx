/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { ReactNode, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from './Texto';
import { Tarjeta } from './ui';
import FormularioRapido from './FormularioRapido';
import DonutCategorias from './DonutCategorias';
import BarrasMeses from './BarrasMeses';
import PresupuestosCategorias from './PresupuestosCategorias';
import { useVersionDatos } from '../nuevo-estado';
import { Gasto, getGastos, getPresupuestosCategoria, getTotalesUltimosMeses, mesActual } from '../db';
import { formatoEuro, formatoFecha, infoCategoria, tintaCategoria, useTema } from '../tema';

type Props = {
  tarjetaSaldo: ReactNode;
  avisoPendientes: ReactNode;
  tarjetaCobro: ReactNode;
  totalMes: number;
  ingresosMes: number;
  categorias: { categoria: string; total: number }[];
};

function fechaLarga(): string {
  const t = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * El panel principal en ordenador, en tres columnas: a la izquierda el saldo y el formulario para apuntar al momento;
 * en el centro lo que importa del mes (ingresos, gastos, lo que queda, reparto, evolución y presupuestos); a la derecha,
 * los movimientos del mes.
 */
export default function PanelEscritorio({ tarjetaSaldo, avisoPendientes, tarjetaCobro, totalMes, ingresosMes, categorias }: Props) {
  const tema = useTema();
  const router = useRouter();
  const version = useVersionDatos();
  const [meses, setMeses] = useState<{ mes: string; total: number }[]>([]);
  const [movimientos, setMovimientos] = useState<Gasto[]>([]);
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      const mes = mesActual();
      setMeses(getTotalesUltimosMeses(6));
      setMovimientos(getGastos().filter((g) => g.fecha.startsWith(mes) && g.tipo !== 'traspaso'));
      setPresupuestos(getPresupuestosCategoria());
      // `version` vuelve a leer todo cuando se apunta algo desde el formulario del panel o la hoja global.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version])
  );

  const queda = ingresosMes - totalMes;
  const verde = tema.oscuro ? tema.acento : tema.exito;
  const colorQueda = queda >= 0 ? verde : tema.peligro;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.pagina} showsVerticalScrollIndicator={false}>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: tema.texto }]}>Inicio</Text>
        <Text style={{ color: tema.textoSuave, fontSize: 14 }}>{fechaLarga()}</Text>
      </View>

      <View style={styles.columnas}>
        <View style={styles.izquierda}>
          {tarjetaSaldo}
          <FormularioRapido />
        </View>

        <View style={styles.centro}>
          {avisoPendientes}
          <View style={styles.fila}>
            <Tarjeta style={styles.kpi}>
              <Text style={[styles.kpiEtiqueta, { color: tema.textoSuave }]}>INGRESOS DEL MES</Text>
              <Text style={[styles.kpiValor, { color: tema.texto }]} numberOfLines={1}>{formatoEuro(ingresosMes)}</Text>
            </Tarjeta>
            <Tarjeta style={styles.kpi}>
              <Text style={[styles.kpiEtiqueta, { color: tema.textoSuave }]}>GASTOS DEL MES</Text>
              <Text style={[styles.kpiValor, { color: tema.texto }]} numberOfLines={1}>{formatoEuro(totalMes)}</Text>
            </Tarjeta>
            <Tarjeta style={[styles.kpi, { borderColor: colorQueda, backgroundColor: colorQueda + '14' }]}>
              <Text style={[styles.kpiEtiqueta, { color: tema.textoSuave }]}>TE QUEDA</Text>
              <Text style={[styles.kpiValor, { color: colorQueda }]} numberOfLines={1}>{formatoEuro(queda)}</Text>
            </Tarjeta>
          </View>

          <View style={styles.fila}>
            <View style={{ flex: 1.5 }}>
              <DonutCategorias filas={categorias} titulo="Gastos por categoría" horizontal />
            </View>
            <View style={{ flex: 1 }}>
              <BarrasMeses meses={meses} />
            </View>
          </View>

          <PresupuestosCategorias presupuestos={presupuestos} gastado={categorias} />
          {tarjetaCobro}
        </View>

        <View style={styles.derecha}>
          <Tarjeta style={{ padding: 0, gap: 0 }}>
            <View style={styles.cabeceraLista}>
              <Text style={[styles.kpiEtiqueta, { color: tema.textoSuave }]}>MOVIMIENTOS DEL MES</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/movimientos')} style={[styles.todos, { borderColor: tema.borde }]}>
                <Text style={{ color: tema.texto, fontSize: 12, fontWeight: '700' }}>Todos</Text>
              </TouchableOpacity>
            </View>
            {movimientos.length === 0 ? (
              <Text style={{ color: tema.textoSuave, fontSize: 14, padding: 16, paddingTop: 4 }}>Todavía no hay movimientos este mes. Apunta el primero con el formulario de la izquierda.</Text>
            ) : (
              movimientos.slice(0, 12).map((g, i) => {
                const cat = infoCategoria(g.categoria);
                const ingreso = g.tipo === 'ingreso';
                return (
                  <TouchableOpacity
                    key={g.id}
                    accessibilityRole="button"
                    onPress={() => router.push('/movimientos')}
                    style={[styles.movimiento, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tema.borde } : null]}
                  >
                    <View style={[styles.punto, { backgroundColor: tintaCategoria(cat.color, tema.oscuro) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                        {g.descripcion}
                      </Text>
                      <Text style={{ color: tema.textoSuave, fontSize: 12 }} numberOfLines={1}>
                        {formatoFecha(g.fecha)} · {g.nota || g.categoria}
                      </Text>
                    </View>
                    <Text style={{ color: ingreso ? tema.exito : tema.texto, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      {ingreso ? '+' : '−'}
                      {formatoEuro(g.importe)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </Tarjeta>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pagina: { paddingBottom: 48 },
  cabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 },
  titulo: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  columnas: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  izquierda: { width: 310, gap: 14 },
  centro: { flex: 1, minWidth: 0, gap: 14 },
  derecha: { width: 310 },
  fila: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  kpi: { flex: 1, gap: 6 },
  kpiEtiqueta: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  kpiValor: { fontSize: 22, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  cabeceraLista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  todos: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  movimiento: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  punto: { width: 8, height: 8, borderRadius: 4 },
});
