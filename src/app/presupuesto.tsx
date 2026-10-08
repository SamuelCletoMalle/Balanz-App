/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback, useMemo, ReactNode } from 'react';
import { useDisposicion, arriba } from '../layout';
import GraficoSaldo from '../components/GraficoSaldo';
import { saldosPorCuenta } from '../cuentas';
import { crearTraspaso } from '../movimientos';
import { Alert } from '../dialogos';
import { saldoPorMes, proyectarSaldo, comparativaMismoMes } from '../evolucion';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { usePreferencias } from '../accesibilidad';
import { Text, TextInput } from '../components/Texto';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getTotalMesActual,
  getIngresosMesActual,
  getLimite,
  setLimite,
  getGastosPorCategoriaMesActual,
  getTotalesUltimosMeses,
  getPresupuestosCategoria,
  setPresupuestoCategoria,
  getGastos,
  getSaldoTotal,
  getFondosIniciales,
  sumaFondos,
  mesActual,
  NOMBRES_MES,
  CUENTAS,
} from '../db';
import { proximosCobros, ProximoCobro } from '../recurrentes';
import { comprobarPresupuestos } from '../avisos';
import { getCategorias, infoCategoria, formatoEuro, formatoFecha, MESES_CORTOS, useTema } from '../tema';
import { Escalonado, Segmentos, useQuieto } from '../components/ui';
import GastoPorCategoria from '../components/GastoPorCategoria';
import Animated, { FadeIn } from 'react-native-reanimated';

type Vista = 'mes' | 'cuentas' | 'evolucion';

/**
 * Agrupa las tarjetas de una vista del Resumen. En pantallas anchas no hace nada (se ven todas y la cuadrícula de CSS
 * usa cada tarjeta como celda); en el móvil solo se enseña la vista elegida, que aparece con un fundido corto.
 */
function Grupo({ amplio, clave, activo, children }: { amplio: boolean; clave: string; activo: boolean; children: ReactNode }) {
  const quieto = useQuieto();
  if (amplio) return <>{children}</>;
  if (!activo) return null;
  return (
    <Animated.View key={clave} entering={quieto ? undefined : FadeIn.duration(240)} style={{ gap: 14 }}>
      {children}
    </Animated.View>
  );
}

export default function ResumenScreen() {
  const { amplio } = useDisposicion();
  // En pantallas anchas las tarjetas se reparten en dos columnas; el título, el saldo y el resumen ocupan todo el ancho.
  const abarcar = amplio ? ({ gridColumn: '1 / -1' } as object) : null;
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const router = useRouter();
  const { vista: pedida } = useLocalSearchParams<{ vista?: string }>();
  const [elegida, setElegida] = useState<{ para?: string; v: Vista } | null>(null);
  const deLaRuta: Vista = pedida === 'cuentas' || pedida === 'evolucion' ? pedida : 'mes';
  const vista: Vista = elegida && elegida.para === pedida ? elegida.v : deLaRuta;
  const setVista = (v: Vista) => setElegida({ para: pedida, v });
  const [gastado, setGastado] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [limite, setLimiteState] = useState(0);
  const [editando, setEditando] = useState(false);
  const [nuevoLimite, setNuevoLimite] = useState('');
  const [porCategoria, setPorCategoria] = useState<{ categoria: string; total: number }[]>([]);
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>({});
  const [meses, setMeses] = useState<{ mes: string; total: number; ingresos: number }[]>([]);
  const [cobros, setCobros] = useState<ProximoCobro[]>([]);
  const [cuentas, setCuentas] = useState({ inicial: 0, ingresos: 0, gastos: 0, saldo: 0 });
  const [moviendo, setMoviendo] = useState(false);
  const [origen, setOrigen] = useState<string>('banco');
  const [destino, setDestino] = useState<string>('ahorros');
  const [importeTraspaso, setImporteTraspaso] = useState('');
  const saldosCuentas = useMemo(
    () => saldosPorCuenta(getGastos(), getFondosIniciales()),
    // se recalcula al volver a la pantalla (cuentas cambia en recargar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cuentas]
  );

  const hacerTraspaso = () => {
    const v = parseFloat(importeTraspaso.replace(',', '.'));
    if (origen === destino) {
      Alert.alert('Elige dos cuentas distintas', 'El dinero tiene que salir de una cuenta y entrar en otra.');
      return;
    }
    if (!isFinite(v) || v <= 0) {
      Alert.alert('Revisa el importe', 'Pon cuántos euros quieres mover.');
      return;
    }
    crearTraspaso(origen, destino, Math.round(v * 100) / 100);
    setMoviendo(false);
    setImporteTraspaso('');
    cargar();
  };

  const evolucion = useMemo(() => {
    const todos = getGastos();
    const inicial = sumaFondos(getFondosIniciales());
    const reales = saldoPorMes(todos, inicial, mesActual(), 12);
    return { puntos: [...reales, ...proyectarSaldo(reales, todos, 3)], comparativa: comparativaMismoMes(todos, mesActual()), hayDatos: todos.length > 0 };
    // se recalcula al volver a la pantalla (cuentas cambia en recargar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas]);
  const [catEditando, setCatEditando] = useState<string | null>(null);
  const [valorCat, setValorCat] = useState('');

  const cargar = useCallback(() => {
    setGastado(getTotalMesActual());
    setIngresos(getIngresosMesActual());
    setLimiteState(getLimite());
    setPorCategoria(getGastosPorCategoriaMesActual());
    setPresupuestos(getPresupuestosCategoria());
    setMeses(getTotalesUltimosMeses(6));
    setCobros(proximosCobros(30));
    const todos = getGastos();
    setCuentas({
      inicial: sumaFondos(getFondosIniciales()),
      ingresos: todos.filter((g) => g.tipo === 'ingreso').reduce((s, g) => s + g.importe, 0),
      gastos: todos.filter((g) => g.tipo === 'gasto').reduce((s, g) => s + g.importe, 0),
      saldo: getSaldoTotal(),
    });
  }, []);

  useFocusEffect(cargar);

  const restante = limite - gastado;
  const porcentaje = limite > 0 ? Math.min(gastado / limite, 1) : 0;
  const colorEstado = limite > 0 && gastado > limite ? tema.peligro : porcentaje > 0.8 ? tema.aviso : tema.exito;
  const maxMes = Math.max(...meses.map((m) => Math.max(m.total, m.ingresos)), 1);
  const hoy = new Date();
  const diaDelMes = hoy.getDate();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const proyeccion = (gastado / diaDelMes) * diasMes;
  const balance = ingresos - gastado;
  const gastoCat = (c: string) => porCategoria.find((x) => x.categoria === c)?.total ?? 0;

  const guardarLimite = () => {
    const valor = parseFloat(nuevoLimite.replace(',', '.'));
    if (!isNaN(valor) && valor > 0) {
      setLimite(valor);
      setLimiteState(valor);
      setEditando(false);
      setNuevoLimite('');
      comprobarPresupuestos();
    }
  };

  const guardarCategoria = (quitar = false) => {
    if (!catEditando) return;
    const v = parseFloat(valorCat.replace(',', '.'));
    setPresupuestoCategoria(catEditando, quitar ? null : isNaN(v) ? null : v);
    setPresupuestos(getPresupuestosCategoria());
    setCatEditando(null);
    comprobarPresupuestos();
  };

  return (
    <ScrollView
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={amplio ? [styles.container, styles.rejilla] : styles.container}
      showsVerticalScrollIndicator={false}
    >
<Escalonado>
      <Text style={[styles.titulo, { color: tema.texto }, abarcar]}>Resumen</Text>

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }, abarcar]} accessible accessibilityLabel={`Tu saldo: ${formatoEuro(cuentas.saldo)}`}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>TU SALDO</Text>
        <Text style={{ color: cuentas.saldo >= 0 ? tema.texto : tema.peligro, fontSize: 34, fontWeight: '800', letterSpacing: -0.9, fontVariant: ['tabular-nums'] }}>
          {formatoEuro(cuentas.saldo)}
        </Text>
        {[
          { t: 'Dinero inicial', v: cuentas.inicial, signo: '' },
          { t: 'Ingresos', v: cuentas.ingresos, signo: '+' },
          { t: 'Gastos', v: cuentas.gastos, signo: '−' },
        ].map((f) => (
          <View key={f.t} style={styles.fila}>
            <Text style={{ color: tema.textoSuave, fontSize: 14 }}>{f.t}</Text>
            <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {f.signo} {formatoEuro(f.v)}
            </Text>
          </View>
        ))}
      </View>

      {amplio ? null : (
        <Segmentos
          opciones={[
            { id: 'mes', texto: 'Este mes' },
            { id: 'cuentas', texto: 'Cuentas' },
            { id: 'evolucion', texto: 'Evolución' },
          ]}
          valor={vista}
          onChange={setVista}
        />
      )}

      <Grupo amplio={amplio} clave="mes" activo={vista === 'mes'}>
      <View style={[styles.dosColumnas, abarcar]}>
        <View style={[styles.mini, { backgroundColor: tema.tarjeta }]}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>INGRESOS</Text>
          <Text style={{ color: tema.exito, fontSize: 20, fontWeight: '800' }}>{formatoEuro(ingresos)}</Text>
        </View>
        <View style={[styles.mini, { backgroundColor: tema.tarjeta }]}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>BALANCE</Text>
          <Text style={{ color: balance >= 0 ? tema.exito : tema.peligro, fontSize: 20, fontWeight: '800' }}>
            {balance >= 0 ? '+' : ''}
            {formatoEuro(balance)}
          </Text>
        </View>
      </View>
      {ingresos > 0 ? (
        <Text style={[{ color: tema.textoSuave, fontSize: 12, marginTop: -6, marginLeft: 6 }, abarcar]}>
          Has ahorrado el {Math.max(0, Math.round((balance / ingresos) * 100))} % de tus ingresos este mes.
        </Text>
      ) : null}

      <GastoPorCategoria filas={porCategoria} />

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <View style={styles.fila}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>PRÓXIMOS 30 DÍAS</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/planes?vista=fijos')}>
            <Text style={{ color: tema.primario, fontWeight: '700', fontSize: 12 }}>Gestionar</Text>
          </TouchableOpacity>
        </View>
        {cobros.length === 0 ? (
          <Text style={{ color: tema.textoSuave, fontSize: 14 }}>No hay cobros recurrentes programados.</Text>
        ) : (
          cobros.slice(0, 6).map((c) => {
            const cat = infoCategoria(c.recurrente.categoria);
            return (
              <View key={c.recurrente.id + c.fecha} style={styles.fila}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={14} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                      {c.recurrente.descripcion}
                    </Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 11 }}>
                      {c.enDias === 0 ? 'Hoy' : c.enDias === 1 ? 'Mañana' : `${formatoFecha(c.fecha)} · en ${c.enDias} días`}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: c.recurrente.tipo === 'ingreso' ? tema.exito : tema.texto, fontWeight: '700' }}>
                  {c.recurrente.tipo === 'ingreso' ? '+' : '-'}
                  {formatoEuro(c.recurrente.importe)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      </Grupo>

      <Grupo amplio={amplio} clave="cuentas" activo={vista === 'cuentas'}>
      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }, abarcar]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>TUS CUENTAS</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setMoviendo((v) => !v)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="swap-horizontal-outline" size={16} color={tema.primario} />
            <Text style={{ color: tema.primario, fontWeight: '700', fontSize: 13 }}>{moviendo ? 'Cerrar' : 'Mover dinero'}</Text>
          </TouchableOpacity>
        </View>
        {CUENTAS.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tema.primario + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={c.icono} size={18} color={tema.primario} />
            </View>
            <Text style={{ flex: 1, color: tema.texto, fontSize: 15, fontWeight: '600' }}>{c.nombre}</Text>
            <Text style={{ color: saldosCuentas[c.id] >= 0 ? tema.texto : tema.peligro, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {formatoEuro(saldosCuentas[c.id])}
            </Text>
          </View>
        ))}
        {moviendo ? (
          <View style={{ gap: 10, backgroundColor: tema.tarjetaSuave, borderRadius: 16, padding: 12 }}>
            <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>DE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CUENTAS.map((c) => (
                <TouchableOpacity accessibilityRole="button" key={c.id} accessibilityState={{ selected: origen === c.id }} onPress={() => setOrigen(c.id)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: origen === c.id ? tema.primario : tema.tarjeta }}>
                  <Text style={{ color: origen === c.id ? tema.primarioTexto : tema.texto, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>A</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CUENTAS.map((c) => (
                <TouchableOpacity accessibilityRole="button" key={c.id} accessibilityState={{ selected: destino === c.id }} onPress={() => setDestino(c.id)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: destino === c.id ? tema.primario : tema.tarjeta }}>
                  <Text style={{ color: destino === c.id ? tema.primarioTexto : tema.texto, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              accessibilityLabel="Importe a mover en euros"
              style={[styles.input, { backgroundColor: tema.tarjeta, color: tema.texto }]}
              placeholder="Importe (€)"
              placeholderTextColor={tema.textoSuave}
              keyboardType="decimal-pad"
              value={importeTraspaso}
              onChangeText={setImporteTraspaso}
            />
            <TouchableOpacity accessibilityRole="button" onPress={hacerTraspaso} style={[styles.boton, { backgroundColor: tema.primario }]}>
              <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Mover dinero</Text>
            </TouchableOpacity>
            <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Un traspaso no es un gasto ni un ingreso: tu saldo total no cambia.</Text>
          </View>
        ) : null}
      </View>

      </Grupo>

      <Grupo amplio={amplio} clave="evolucion" activo={vista === 'evolucion'}>
      {evolucion.hayDatos ? (
        <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }, abarcar]}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>EVOLUCIÓN DEL SALDO</Text>
          <GraficoSaldo tema={tema} puntos={evolucion.puntos} />
          <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
            La línea discontinua es una previsión de los próximos 3 meses, siguiendo lo que ha cambiado tu saldo de media los últimos meses.
          </Text>
        </View>
      ) : null}

      {evolucion.comparativa.anioPasado > 0 ? (
        <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>COMPARADO CON EL AÑO PASADO</Text>
          <Text style={{ color: tema.texto, fontSize: 15, lineHeight: 22 }}>
            Este mes llevas <Text style={{ fontWeight: '800' }}>{formatoEuro(evolucion.comparativa.actual)}</Text> en gastos. En {NOMBRES_MES[new Date().getMonth()]} del año pasado fueron{' '}
            <Text style={{ fontWeight: '800' }}>{formatoEuro(evolucion.comparativa.anioPasado)}</Text>.
          </Text>
          {evolucion.comparativa.variacion !== null ? (
            <Text style={{ color: evolucion.comparativa.variacion > 0 ? tema.peligro : tema.exito, fontWeight: '800', fontSize: 14 }}>
              {evolucion.comparativa.variacion > 0 ? '▲' : '▼'} {Math.abs(Math.round(evolucion.comparativa.variacion))} % {evolucion.comparativa.variacion > 0 ? 'más' : 'menos'}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>ÚLTIMOS 6 MESES</Text>
        <View style={styles.grafico}>
          {meses.map((m, i) => {
            const esActual = i === meses.length - 1;
            const altoG = Math.max((m.total / maxMes) * 100, m.total > 0 ? 4 : 0);
            const altoI = Math.max((m.ingresos / maxMes) * 100, m.ingresos > 0 ? 4 : 0);
            return (
              <View key={m.mes} style={styles.columna}>
                <View style={styles.columnaHueco}>
                  <View style={styles.parBarras}>
                    <View style={[styles.columnaBarra, { height: `${altoG}%`, backgroundColor: esActual ? tema.primario : tema.tarjetaSuave }]} />
                    <View style={[styles.columnaBarra, { height: `${altoI}%`, backgroundColor: tema.exito, opacity: esActual ? 1 : 0.45 }]} />
                  </View>
                </View>
                <Text style={{ color: esActual ? tema.texto : tema.textoSuave, fontSize: 11, fontWeight: '600' }}>
                  {MESES_CORTOS[Number(m.mes.slice(5)) - 1]}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={{ color: tema.textoSuave, fontSize: 11 }}>
            <Text style={{ color: tema.primario }}>■</Text> Gastos
          </Text>
          <Text style={{ color: tema.textoSuave, fontSize: 11 }}>
            <Text style={{ color: tema.exito }}>■</Text> Ingresos
          </Text>
        </View>
      </View>

      </Grupo>

      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/informe')} style={[styles.enlaceInforme, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
        <Ionicons name="document-text-outline" size={22} color={tema.oscuro ? tema.acento : tema.texto} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: tema.texto, fontSize: 15, fontWeight: '700' }}>Informe mensual</Text>
          <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Comparativa con el mes pasado y PDF para compartir</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tema.textoSuave} />
      </TouchableOpacity>


    </Escalonado>
</ScrollView>
  );
}

const styles = StyleSheet.create({
  enlaceInforme: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  container: { paddingTop: arriba(60), paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  titulo: { fontSize: 32, fontWeight: '800' },
  dosColumnas: { flexDirection: 'row', gap: 12 },
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'start' } as object,
  mini: { flex: 1, borderRadius: 20, padding: 16, gap: 4 },
  tarjeta: { borderRadius: 22, padding: 18, gap: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  etiqueta: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  grande: { fontSize: 32, fontWeight: '800' },
  barraFondo: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 7 },
  input: { borderRadius: 14, padding: 14, fontSize: 18 },
  boton: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 10 },
  columna: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  columnaHueco: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  parBarras: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  columnaBarra: { flex: 1, borderRadius: 6 },
  icono: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  barraFina: { height: 8, borderRadius: 4, overflow: 'hidden' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCaja: { borderRadius: 22, padding: 20, gap: 14 },
});
