/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput } from '../components/Texto';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { getGastos, getTotalMesActual, getIngresosMesActual, getLimite, getEtiquetas, getSaldoTotal, Gasto, nombreCuenta } from '../db';
import { usePreferencias, cambiarPreferencias } from '../accesibilidad';
import { CURVAS } from '../logo';
import Presionable from '../components/Presionable';
import { toque, exito } from '../haptics';
import { descargarGastosDeLaNube } from '../sync';
import { guardarMovimiento, eliminarMovimiento, restaurarMovimiento, duplicarMovimiento } from '../movimientos';
import { useDisposicion, arriba } from '../layout';
import { getCategorias, infoCategoria, formatoEuro, formatoFecha, tintaCategoria, useTema, Tema } from '../tema';
import GastoModal, { DatosGasto } from '../components/GastoModal';
import Aviso from '../components/Aviso';
import Logo from '../components/Logo';
import { LOGO_CABECERA } from '../components/Intro';
import { useIntroLista } from '../intro-estado';
import { Chip, EstadoVacio, Esqueleto, useContador, Barra } from '../components/ui';
import { Alert } from '../dialogos';
import { Periodo, PERIODOS, rangoPeriodo } from '../periodo';

const SALIDA = Easing.bezier(...CURVAS.salida);

// Con el ratón, al soltar un arrastre se dispara también el clic de la fila; así se ignora justo después de deslizar.
let deslizadoEn = 0;

/**
 * Fila que se desliza: hacia la derecha duplica (con la fecha de hoy) y hacia la izquierda borra.
 * Al soltar pasado el umbral se ejecuta la acción y la fila vuelve a su sitio; borrar siempre se puede deshacer.
 */
function FilaDeslizable({ children, tema, onBorrar, onDuplicar }: { children: ReactNode; tema: Tema; onBorrar: () => void; onDuplicar?: () => void }) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={72}
      rightThreshold={72}
      renderLeftActions={
        onDuplicar
          ? () => (
              <View style={[styles.accionFila, { backgroundColor: tema.acento }]}>
                <Ionicons name="copy-outline" size={22} color={tema.acentoTexto} />
              </View>
            )
          : undefined
      }
      renderRightActions={() => (
        <View style={[styles.accionFila, { backgroundColor: tema.peligro }]}>
          <Ionicons name="trash-outline" size={22} color="#ffffff" />
        </View>
      )}
      onSwipeableOpenStartDrag={() => {
        deslizadoEn = Date.now();
      }}
      onSwipeableCloseStartDrag={() => {
        deslizadoEn = Date.now();
      }}
      onSwipeableWillOpen={() => {
        deslizadoEn = Date.now();
      }}
      onSwipeableOpen={(direccion) => {
        deslizadoEn = Date.now();
        ref.current?.close();
        exito();
        if (direccion === 'left') onDuplicar?.();
        else onBorrar();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

export default function GastosScreen() {
  const tema = useTema();
  const { amplio } = useDisposicion();
  const introLista = useIntroLista();
  const { escritorio } = useDisposicion();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const { reducirMovimiento, ocultarImportes } = usePreferencias();
  const [saldo, setSaldo] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [etiquetasLista, setEtiquetasLista] = useState<string[]>([]);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null);
  const [limite, setLimite] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('todo');
  const [verFiltros, setVerFiltros] = useState(false);
  // El "+" gira 45° (queda como una "×") mientras la hoja de nuevo movimiento está abierta.
  const giro = useSharedValue(0);
  const estiloGiro = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.get() * 45}deg` }] }));
  const [desdeTexto, setDesdeTexto] = useState('');
  const [hastaTexto, setHastaTexto] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: Gasto } | null>(null);

  const recargar = useCallback(() => {
    setGastos(getGastos());
    setSaldo(getSaldoTotal());
    setTotalMes(getTotalMesActual());
    setIngresosMes(getIngresosMesActual());
    setEtiquetasLista(getEtiquetas());
    setLimite(getLimite());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      recargar();
      setSincronizando(true);
      descargarGastosDeLaNube()
        .catch(() => {})
        .finally(() => {
          if (activo) {
            recargar();
            setSincronizando(false);
          }
        });
      return () => {
        activo = false;
      };
    }, [recargar])
  );

  const rango = useMemo(() => rangoPeriodo(periodo, new Date(), desdeTexto, hastaTexto), [periodo, desdeTexto, hastaTexto]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return gastos.filter(
      (g) =>
        (!filtro || g.categoria === filtro) &&
        (!filtroEtiqueta || g.etiquetas.split(',').includes(filtroEtiqueta)) &&
        (!rango || (g.fecha >= rango.desde && g.fecha <= rango.hasta)) &&
        (!q || g.descripcion.toLowerCase().includes(q) || g.etiquetas.includes(q.replace('#', '')))
    );
  }, [gastos, busqueda, filtro, filtroEtiqueta, rango]);

  const hayFiltro = !!(filtro || filtroEtiqueta || rango || busqueda.trim());
  const filtrosActivos = (filtro ? 1 : 0) + (filtroEtiqueta ? 1 : 0) + (periodo !== 'todo' ? 1 : 0);
  const limpiarFiltros = () => {
    setFiltro(null);
    setFiltroEtiqueta(null);
    setPeriodo('todo');
    setDesdeTexto('');
    setHastaTexto('');
  };
  const totalesFiltro = useMemo(
    () => ({
      gastos: filtrados.filter((g) => g.tipo === 'gasto').reduce((a, g) => a + g.importe, 0),
      ingresos: filtrados.filter((g) => g.tipo === 'ingreso').reduce((a, g) => a + g.importe, 0),
    }),
    [filtrados]
  );

  const secciones = useMemo(() => {
    const porDia = new Map<string, Gasto[]>();
    filtrados.forEach((g) => porDia.set(g.fecha, [...(porDia.get(g.fecha) ?? []), g]));
    return Array.from(porDia.entries()).map(([fecha, data]) => ({
      fecha,
      total: data.reduce((s, g) => s + (g.tipo === 'ingreso' ? g.importe : g.tipo === 'gasto' ? -g.importe : 0), 0),
      data,
    }));
  }, [filtrados]);

  const porcentaje = limite > 0 ? Math.min(totalMes / limite, 1) : 0;
  // El saldo se lee en blanco sobre el degradado oscuro y en negro sobre uno claro, según el modo (o el del sistema).
  const tinta = tema.marcaTexto;
  const heroClaro = tinta !== '#ffffff';
  const puntoHero = heroClaro ? 'rgba(10,10,10,0.10)' : 'rgba(255,255,255,0.2)';
  const barraHero = heroClaro ? 'rgba(10,10,10,0.14)' : 'rgba(255,255,255,0.25)';
  // Sobre la lima los colores de estado necesitan ser más oscuros que en el resto de la app.
  const colorBarra = limite > 0 && totalMes > limite ? '#b91c1c' : porcentaje > 0.8 ? '#b45309' : '#166534';
  const saldoAnimado = useContador(saldo);
  const gastadoAnimado = useContador(totalMes);
  const ingresosAnimados = useContador(ingresosMes);

  const abrirNuevo = () => {
    setEditando(null);
    setModalVisible(true);
    giro.set(withSpring(1, { duration: 320, dampingRatio: 0.7 }));
  };
  useEffect(() => {
    if (!modalVisible) giro.set(withSpring(0, { duration: 320, dampingRatio: 0.8 }));
  }, [modalVisible, giro]);

  const borrarFila = (g: Gasto) => {
    eliminarMovimiento(g.id);
    recargar();
    setAviso({ texto: g.tipo === 'traspaso' ? 'Traspaso borrado' : 'Movimiento borrado', deshacer: g });
  };
  const duplicarFila = (g: Gasto) => {
    duplicarMovimiento(g);
    recargar();
    setAviso({ texto: 'Duplicado con la fecha de hoy' });
  };

  const abrirEdicion = (g: Gasto) => {
    if (Date.now() - deslizadoEn < 450) return;
    if (g.tipo === 'traspaso') {
      Alert.alert('Traspaso entre cuentas', `${g.descripcion} · ${formatoEuro(g.importe)}\nNo es un gasto ni un ingreso: solo mueve dinero de una cuenta a otra.`, [
        { text: 'Cerrar', style: 'cancel' },
        {
          text: 'Borrar traspaso',
          style: 'destructive',
          onPress: () => {
            eliminarMovimiento(g.id);
            recargar();
            setAviso({ texto: 'Traspaso borrado', deshacer: g });
          },
        },
      ]);
      return;
    }
    setEditando(g);
    setModalVisible(true);
  };

  const guardar = (datos: DatosGasto) => {
    guardarMovimiento(datos, editando);
    recargar();
    setModalVisible(false);
  };

  const eliminar = () => {
    if (!editando) return;
    const borrado = editando;
    eliminarMovimiento(borrado.id);
    recargar();
    setModalVisible(false);
    setAviso({ texto: 'Movimiento borrado', deshacer: borrado });
  };

  const deshacer = () => {
    if (!aviso?.deshacer) return;
    restaurarMovimiento(aviso.deshacer);
    recargar();
    setAviso({ texto: 'Movimiento recuperado' });
  };

  const duplicar = () => {
    if (!editando) return;
    duplicarMovimiento(editando);
    recargar();
    setModalVisible(false);
    setAviso({ texto: 'Duplicado con la fecha de hoy' });
  };

  const heroBloque = (
      <Animated.View entering={reducirMovimiento ? undefined : FadeInDown.duration(380).easing(SALIDA)}>
        <LinearGradient
          colors={tema.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroBrillo} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={ocultarImportes ? 'Mostrar los importes' : 'Ocultar los importes'}
            onPress={() => cambiarPreferencias({ ocultarImportes: !ocultarImportes })}
            hitSlop={12}
            style={styles.heroOjo}
          >
            <Ionicons name={ocultarImportes ? 'eye-off-outline' : 'eye-outline'} size={22} color={tinta} />
          </TouchableOpacity>
          <Text style={[styles.heroEtiqueta, { color: tinta }]}>
            Saldo total {sincronizando ? '· sincronizando…' : ''}
          </Text>
          <Text
            accessibilityLabel={`Saldo total ${formatoEuro(saldo)}`}
            style={[styles.heroImporte, { color: tinta }]}
          >
            {formatoEuro(saldoAnimado)}
          </Text>
          <View style={styles.heroFila}>
            <View style={styles.heroDato}>
              <View style={[styles.heroPunto, { backgroundColor: puntoHero }]}>
                <Ionicons name="arrow-up" size={13} color={tinta} />
              </View>
              <View>
                <Text style={[styles.heroMini, { color: tinta }]}>Gastado este mes</Text>
                <Text style={[styles.heroMiniImporte, { color: tinta }]}>{formatoEuro(gastadoAnimado)}</Text>
              </View>
            </View>
            <View style={styles.heroDato}>
              <View style={[styles.heroPunto, { backgroundColor: puntoHero }]}>
                <Ionicons name="arrow-down" size={13} color={tinta} />
              </View>
              <View>
                <Text style={[styles.heroMini, { color: tinta }]}>Ingresos del mes</Text>
                <Text style={[styles.heroMiniImporte, { color: tinta }]}>{formatoEuro(ingresosAnimados)}</Text>
              </View>
            </View>
          </View>
          {limite > 0 ? (
            <View style={{ gap: 6 }}>
              <View style={[styles.heroBarraFondo, { backgroundColor: barraHero }]}>
                <Barra p={porcentaje} color={colorBarra} radio={4} />
              </View>
              <Text style={[styles.heroPie, { color: tinta }]}>
                {totalMes <= limite
                  ? `Te quedan ${formatoEuro(limite - totalMes)} de tu límite de ${formatoEuro(limite)}`
                  : `Te has pasado ${formatoEuro(totalMes - limite)} de tu límite`}
              </Text>
            </View>
          ) : (
            <Text style={[styles.heroPie, { color: tinta }]}>Fija un límite mensual en Resumen</Text>
          )}
        </LinearGradient>
      </Animated.View>
  );

  // Gasto del mes por categoría (columna izquierda en pantallas anchas).
  const porCategoria = useMemo(() => {
    const mes = new Date().toISOString().slice(0, 7);
    const sumas = new Map<string, number>();
    gastos.forEach((g) => {
      if (g.tipo === 'gasto' && g.fecha.startsWith(mes)) sumas.set(g.categoria, (sumas.get(g.categoria) ?? 0) + g.importe);
    });
    const filas = Array.from(sumas.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { filas, max: filas[0]?.[1] ?? 0 };
  }, [gastos]);

  const panelCategorias = (
    <View style={[styles.panel, { backgroundColor: tema.tarjeta }]}>
      <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>Gasto por categoría este mes</Text>
      {porCategoria.filas.length === 0 ? (
        <Text style={{ color: tema.textoSuave, fontSize: 13 }}>Cuando añadas gastos este mes, verás aquí en qué se te va el dinero.</Text>
      ) : (
        porCategoria.filas.map(([nombre, total]) => {
          const cat = infoCategoria(nombre);
          return (
            <View key={nombre} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={cat.icono} size={16} color={tintaCategoria(cat.color, tema.oscuro)} />
                <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '600', flex: 1 }}>{nombre}</Text>
                <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatoEuro(total)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: tema.tarjetaSuave, overflow: 'hidden' }}>
                <Barra p={total / porCategoria.max} color={cat.color} radio={3} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const cabecera = (
    <View style={{ gap: 20, paddingBottom: 8 }}>
      {amplio ? null : heroBloque}

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={[styles.buscador, { backgroundColor: tema.tarjeta, borderColor: tema.borde, flex: 1 }]}>
          <Ionicons name="search-outline" size={18} color={tema.textoSuave} />
          <TextInput
            style={[styles.buscadorInput, { color: tema.texto }]}
            placeholder="Buscar gasto"
            placeholderTextColor={tema.textoSuave}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={18} color={tema.textoSuave} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={verFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
          accessibilityState={{ expanded: verFiltros }}
          onPress={() => setVerFiltros((v) => !v)}
          style={[styles.botonFiltros, { backgroundColor: verFiltros || filtrosActivos > 0 ? tema.primario : tema.tarjeta, borderColor: tema.borde }]}
        >
          <Ionicons name="options-outline" size={20} color={verFiltros || filtrosActivos > 0 ? tema.primarioTexto : tema.texto} />
          {filtrosActivos > 0 ? (
            <Text style={{ color: tema.primarioTexto, fontSize: 13, fontWeight: '800' }}>{filtrosActivos}</Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {verFiltros ? (
      <View style={[styles.panelFiltros, { backgroundColor: tema.tarjeta }]}>
      <Text style={[styles.filtroTitulo, { color: tema.textoSuave }]}>Categoría</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {getCategorias().map((c) => (
          <Chip key={c.nombre} texto={c.nombre} icono={c.icono} color={c.color} activo={filtro === c.nombre} onPress={() => setFiltro(filtro === c.nombre ? null : c.nombre)} />
        ))}
      </ScrollView>

      <Text style={[styles.filtroTitulo, { color: tema.textoSuave }]}>Fecha</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {PERIODOS.map((p) => (
          <Chip key={p.id} texto={p.nombre} icono={p.id === 'todo' ? 'infinite-outline' : 'calendar-outline'} activo={periodo === p.id} onPress={() => setPeriodo(p.id)} />
        ))}
      </ScrollView>

      {periodo === 'personal' ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            accessibilityLabel="Desde (día/mes/año)"
            style={[styles.fechaInput, { backgroundColor: tema.tarjetaSuave, borderColor: tema.borde, color: tema.texto }]}
            placeholder="Desde 1/3/2026"
            placeholderTextColor={tema.textoSuave}
            value={desdeTexto}
            onChangeText={setDesdeTexto}
            autoCapitalize="none"
          />
          <TextInput
            accessibilityLabel="Hasta (día/mes/año)"
            style={[styles.fechaInput, { backgroundColor: tema.tarjetaSuave, borderColor: tema.borde, color: tema.texto }]}
            placeholder="Hasta 31/3/2026"
            placeholderTextColor={tema.textoSuave}
            value={hastaTexto}
            onChangeText={setHastaTexto}
            autoCapitalize="none"
          />
        </View>
      ) : null}

      {etiquetasLista.length > 0 ? (
        <>
        <Text style={[styles.filtroTitulo, { color: tema.textoSuave }]}>Etiquetas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {etiquetasLista.map((e) => (
            <Chip key={e} texto={`#${e}`} activo={filtroEtiqueta === e} onPress={() => setFiltroEtiqueta(filtroEtiqueta === e ? null : e)} />
          ))}
        </ScrollView>
        </>
      ) : null}

      {filtrosActivos > 0 ? (
        <TouchableOpacity accessibilityRole="button" onPress={limpiarFiltros} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
          <Text style={{ color: tema.primario, fontSize: 14, fontWeight: '700' }}>Quitar filtros</Text>
        </TouchableOpacity>
      ) : null}
      </View>
      ) : null}

      {hayFiltro ? (
        <View style={[styles.resumenFiltro, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '700' }}>{filtrados.length} movimientos</Text>
          <Text style={{ color: tema.texto, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            Gastos {formatoEuro(totalesFiltro.gastos)} · Ingresos {formatoEuro(totalesFiltro.ingresos)}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <Text style={[styles.titulo, { color: tema.texto }]}>Movimientos</Text>
      {escritorio ? null : (
        <View pointerEvents="none" style={[styles.logoCabecera, { opacity: introLista ? 1 : 0 }]}>
          <Logo size={LOGO_CABECERA.tamano} aro={tema.oscuro ? '#0a0a0a' : '#000000'} />
        </View>
      )}

      <View style={amplio ? { flex: 1, flexDirection: 'row', gap: 28 } : { flex: 1 }}>
        {amplio ? (
          <ScrollView style={{ width: 400, flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Presionable
              accessibilityLabel="Añadir movimiento"
              style={[styles.botonNuevo, { backgroundColor: tema.primario }]}
              onPress={() => {
                toque();
                abrirNuevo();
              }}
            >
              <Ionicons name="add" size={22} color={tema.primarioTexto} />
              <Text style={{ color: tema.primarioTexto, fontSize: 16, fontWeight: '700' }}>Añadir movimiento</Text>
            </Presionable>
            {heroBloque}
            {panelCategorias}
          </ScrollView>
        ) : null}
      <SectionList
        sections={secciones}
        keyExtractor={(g) => g.id}
        stickySectionHeadersEnabled
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          gastos.length === 0 && sincronizando ? (
            <View style={{ backgroundColor: tema.tarjeta, borderRadius: 18, marginTop: 22 }} accessibilityLabel="Cargando movimientos">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.esqueletoFila}>
                  <Esqueleto ancho={42} alto={42} radio={14} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Esqueleto ancho="55%" alto={14} />
                    <Esqueleto ancho="30%" alto={11} />
                  </View>
                  <Esqueleto ancho={60} alto={16} />
                </View>
              ))}
            </View>
          ) : gastos.length === 0 ? (
            <EstadoVacio icono="receipt-outline" titulo="Aún no hay movimientos" texto="Apunta tu primer gasto con el botón +, o importa tu Excel desde Más." accion={{ texto: 'Añadir el primero', onPress: abrirNuevo }} />
          ) : (
            <EstadoVacio icono="funnel-outline" titulo="Nada con esos filtros" texto="Prueba a quitar alguno o a cambiar las fechas." accion={{ texto: 'Quitar filtros', onPress: limpiarFiltros }} />
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.diaCabecera, { backgroundColor: tema.fondo }]}>
            <Text style={[styles.diaTexto, { color: tema.textoSuave }]}>{formatoFecha(section.fecha)}</Text>
            <Text style={[styles.diaTexto, { color: tema.textoSuave }]}>{formatoEuro(section.total)}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const cat = infoCategoria(item.categoria);
          const primero = index === 0;
          const ultimo = index === section.data.length - 1;
          return (
            <FilaDeslizable tema={tema} onBorrar={() => borrarFila(item)} onDuplicar={item.tipo === 'traspaso' ? undefined : () => duplicarFila(item)}>
            <TouchableOpacity accessibilityRole="button"
              activeOpacity={0.7}
              onPress={() => abrirEdicion(item)}
              style={[
                styles.fila,
                {
                  backgroundColor: tema.tarjeta,
                  borderTopLeftRadius: primero ? 18 : 0,
                  borderTopRightRadius: primero ? 18 : 0,
                  borderBottomLeftRadius: ultimo ? 18 : 0,
                  borderBottomRightRadius: ultimo ? 18 : 0,
                  borderBottomWidth: ultimo ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: tema.borde,
                },
              ]}
            >
              <View style={[styles.icono, { backgroundColor: (item.tipo === 'traspaso' ? tema.textoSuave : item.tipo === 'ingreso' ? tema.exito : cat.color) + '33' }]}>
                <Ionicons name={item.tipo === 'traspaso' ? 'swap-horizontal-outline' : item.tipo === 'ingreso' ? 'arrow-down-circle-outline' : cat.icono} size={20} color={item.tipo === 'traspaso' ? tema.textoSuave : item.tipo === 'ingreso' ? tema.exito : tintaCategoria(cat.color, tema.oscuro)} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.descripcion, { color: tema.texto, flexShrink: 1 }]} numberOfLines={1}>
                    {item.descripcion}
                  </Text>
                  {item.divisiones ? <Ionicons name="people" size={13} color={tema.textoSuave} /> : null}
                  {item.foto ? <Ionicons name="image" size={13} color={tema.textoSuave} /> : null}
                </View>
                <Text style={[styles.categoria, { color: tema.textoSuave }]} numberOfLines={1}>
                  {item.tipo === 'traspaso' ? 'Traspaso entre cuentas' : item.categoria}
                  {item.cuenta && item.cuenta !== 'banco' && item.tipo !== 'traspaso' ? ` · ${nombreCuenta(item.cuenta)}` : ''}
                  {item.etiquetas ? ` · ${item.etiquetas.split(',').map((e) => `#${e}`).join(' ')}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.importe, { color: item.tipo === 'ingreso' ? tema.exito : tema.texto }]}>
                  {item.tipo === 'traspaso' ? '' : item.tipo === 'ingreso' ? '+' : '-'}
                  {formatoEuro(item.importe)}
                </Text>
                {item.moneda !== 'EUR' && item.importe_original ? (
                  <Text style={{ color: tema.textoSuave, fontSize: 11 }}>
                    {item.importe_original} {item.moneda}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
            </FilaDeslizable>
          );
        }}
      />
      </View>

      {amplio ? null : (
        <Presionable
          accessibilityLabel="Añadir movimiento"
          contenedor={styles.fabContenedor}
          style={[styles.fab, { backgroundColor: tema.primario, shadowColor: tema.sombra }]}
          escala={0.94}
          onPress={() => {
            toque();
            abrirNuevo();
          }}
        >
          <Animated.View style={estiloGiro}>
            <Ionicons name="add" size={32} color={tema.primarioTexto} />
          </Animated.View>
        </Presionable>
      )}

      {aviso ? (
        <Aviso tema={tema} texto={aviso.texto} accion={aviso.deshacer ? 'Deshacer' : undefined} onAccion={deshacer} onCerrar={() => setAviso(null)} />
      ) : null}

      <GastoModal
        visible={modalVisible}
        titulo={editando ? 'Editar movimiento' : 'Nuevo movimiento'}
        inicial={editando ?? undefined}
        onGuardar={guardar}
        onCancelar={() => setModalVisible(false)}
        onEliminar={editando ? eliminar : undefined}
        onDuplicar={editando ? duplicar : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 24, padding: 18, gap: 14 },
  heroOjo: { position: 'absolute', top: 16, right: 16, zIndex: 2, padding: 4 },
  fechaInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  resumenFiltro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexWrap: 'wrap' },
  botonNuevo: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  container: { flex: 1, paddingTop: arriba(60), paddingHorizontal: 16 },
  logoCabecera: { position: 'absolute', top: arriba(60) + 2, right: LOGO_CABECERA.margen },
  titulo: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginBottom: 14 },
  hero: { borderRadius: 28, padding: 22, gap: 14, overflow: 'hidden' },
  heroBrillo: { position: 'absolute', top: -70, right: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroEtiqueta: { fontSize: 13, fontWeight: '600', opacity: 0.85, letterSpacing: 0.2 },
  heroImporte: { fontSize: 42, fontWeight: '800', letterSpacing: -1.2, marginTop: -8, fontVariant: ['tabular-nums'] },
  heroFila: { flexDirection: 'row', gap: 12 },
  heroDato: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroPunto: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroMini: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  heroMiniImporte: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroBarraFondo: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 6 },
  heroBarra: { height: '100%', borderRadius: 4 },
  heroPie: { fontSize: 13, fontWeight: '600', opacity: 0.85 },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  botonFiltros: { minWidth: 48, height: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  panelFiltros: { borderRadius: 22, padding: 18, gap: 14 },
  filtroTitulo: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: -4 },
  buscadorInput: { flex: 1, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, marginRight: 10, borderWidth: 1 },
  diaCabecera: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 22, paddingBottom: 10, paddingHorizontal: 6 },
  accionFila: { width: 88, alignItems: 'center', justifyContent: 'center' },
  esqueletoFila: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  diaTexto: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  icono: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  descripcion: { fontSize: 16, fontWeight: '600' },
  categoria: { fontSize: 13, marginTop: 4 },
  importe: { fontSize: 16, fontWeight: '700' },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 50 },
  vacioTexto: { fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  fabContenedor: { position: 'absolute', right: 20, bottom: 24 },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
