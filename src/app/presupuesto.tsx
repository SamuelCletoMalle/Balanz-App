/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback, useMemo } from 'react';
import { useDisposicion, arriba } from '../layout';
import GraficoSaldo from '../components/GraficoSaldo';
import { saldosPorCuenta } from '../cuentas';
import { crearTraspaso } from '../movimientos';
import { Alert } from '../dialogos';
import { saldoPorMes, proyectarSaldo, comparativaMismoMes } from '../evolucion';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { usePreferencias } from '../accesibilidad';
import { Text, TextInput } from '../components/Texto';
import { useFocusEffect, useRouter } from 'expo-router';
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

export default function ResumenScreen() {
  const { amplio } = useDisposicion();
  // En pantallas anchas las tarjetas se reparten en dos columnas; el título, el saldo y el resumen ocupan todo el ancho.
  const abarcar = amplio ? ({ gridColumn: '1 / -1' } as object) : null;
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const router = useRouter();
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

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <View style={styles.fila}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>PRESUPUESTO DEL MES</Text>
          {limite > 0 && !editando ? (
            <TouchableOpacity accessibilityRole="button"
              onPress={() => {
                setNuevoLimite(String(limite).replace('.', ','));
                setEditando(true);
              }}
            >
              <Ionicons name="create-outline" size={20} color={tema.primario} />
            </TouchableOpacity>
          ) : null}
        </View>

        {editando || limite === 0 ? (
          <View style={{ gap: 10 }}>
            {limite === 0 && !editando ? (
              <Text style={{ color: tema.textoSuave, fontSize: 14 }}>
                Fija cuánto quieres gastar al mes y te avisaremos de cómo vas.
              </Text>
            ) : null}
            {editando ? (
              <TextInput
                style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
                placeholder="Límite mensual (€)"
                placeholderTextColor={tema.textoSuave}
                keyboardType="decimal-pad"
                value={nuevoLimite}
                onChangeText={setNuevoLimite}
                autoFocus
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {editando ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} onPress={() => setEditando(false)}>
                  <Text style={{ color: tema.texto, fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button"
                style={[styles.boton, { backgroundColor: tema.primario, flex: 1 }]}
                onPress={editando ? guardarLimite : () => setEditando(true)}
              >
                <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>{editando ? 'Guardar' : 'Fijar límite'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.grande, { color: tema.texto }]}>
              {formatoEuro(gastado)}
              <Text style={{ fontSize: 16, color: tema.textoSuave, fontWeight: '600' }}> / {formatoEuro(limite)}</Text>
            </Text>
            <View style={[styles.barraFondo, { backgroundColor: tema.tarjetaSuave }]}>
              <View style={[styles.barra, { width: `${porcentaje * 100}%`, backgroundColor: colorEstado }]} />
            </View>
            <Text style={{ color: colorEstado, fontWeight: '700', fontSize: 15 }}>
              {restante >= 0 ? `Te quedan ${formatoEuro(restante)}` : `Te has pasado ${formatoEuro(Math.abs(restante))}`}
            </Text>
            <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
              A este ritmo terminarás el mes en {formatoEuro(proyeccion)}.
            </Text>
          </>
        )}
      </View>

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>PRESUPUESTO POR CATEGORÍA (toca para fijar)</Text>
        {getCategorias().map((cat) => {
          const gasto = gastoCat(cat.nombre);
          const lim = presupuestos[cat.nombre];
          if (!lim && gasto === 0) {
            return (
              <TouchableOpacity accessibilityRole="button"
                key={cat.nombre}
                style={styles.fila}
                onPress={() => {
                  setCatEditando(cat.nombre);
                  setValorCat('');
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={14} color={cat.color} />
                  </View>
                  <Text style={{ color: tema.textoSuave, fontSize: 14 }}>{cat.nombre}</Text>
                </View>
                <Text style={{ color: tema.primario, fontSize: 12, fontWeight: '700' }}>Fijar límite</Text>
              </TouchableOpacity>
            );
          }
          const pct = lim ? Math.min(gasto / lim, 1) : gastado > 0 ? gasto / gastado : 0;
          const color = lim ? (gasto > lim ? tema.peligro : gasto / lim > 0.8 ? tema.aviso : cat.color) : cat.color;
          return (
            <TouchableOpacity accessibilityRole="button"
              key={cat.nombre}
              style={{ gap: 6 }}
              onPress={() => {
                setCatEditando(cat.nombre);
                setValorCat(lim ? String(lim).replace('.', ',') : '');
              }}
            >
              <View style={styles.fila}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={14} color={cat.color} />
                  </View>
                  <Text style={{ color: tema.texto, fontWeight: '600', fontSize: 14 }}>{cat.nombre}</Text>
                </View>
                <Text style={{ color: gasto > (lim ?? Infinity) ? tema.peligro : tema.texto, fontWeight: '700', fontSize: 14 }}>
                  {formatoEuro(gasto)}
                  {lim ? <Text style={{ color: tema.textoSuave, fontWeight: '500' }}> / {formatoEuro(lim)}</Text> : null}
                </Text>
              </View>
              <View style={[styles.barraFina, { backgroundColor: tema.tarjetaSuave }]}>
                <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

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

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <View style={styles.fila}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>PRÓXIMOS 30 DÍAS</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/recurrentes')}>
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

      <Modal visible={!!catEditando} transparent animationType={reducirMovimiento ? 'none' : 'fade'} onRequestClose={() => setCatEditando(null)}>
        <KeyboardAvoidingView style={styles.modalFondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCaja, { backgroundColor: tema.tarjeta }]}>
            <Text style={{ color: tema.texto, fontSize: 18, fontWeight: '800' }}>Límite de {catEditando}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
              placeholder="Importe mensual (€)"
              placeholderTextColor={tema.textoSuave}
              keyboardType="decimal-pad"
              value={valorCat}
              onChangeText={setValorCat}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {catEditando && presupuestos[catEditando] ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} onPress={() => guardarCategoria(true)}>
                  <Ionicons name="trash-outline" size={18} color={tema.peligro} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave, flex: 1 }]} onPress={() => setCatEditando(null)}>
                <Text style={{ color: tema.texto, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.primario, flex: 1 }]} onPress={() => guardarCategoria()}>
                <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
