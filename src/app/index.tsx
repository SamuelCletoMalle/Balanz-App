/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback, useMemo } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput } from '../components/Texto';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { getGastos, getTotalMesActual, getIngresosMesActual, getLimite, getEtiquetas, getSaldoTotal, Gasto } from '../db';
import { usePreferencias } from '../accesibilidad';
import { CURVAS } from '../logo';
import Presionable from '../components/Presionable';
import { toque } from '../haptics';
import { descargarGastosDeLaNube } from '../sync';
import { guardarMovimiento, eliminarMovimiento } from '../movimientos';
import { CATEGORIAS, infoCategoria, formatoEuro, formatoFecha, useTema } from '../tema';
import GastoModal, { DatosGasto } from '../components/GastoModal';

const SALIDA = Easing.bezier(...CURVAS.salida);

export default function GastosScreen() {
  const tema = useTema();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const { reducirMovimiento, altoContraste } = usePreferencias();
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

  const secciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = gastos.filter(
      (g) =>
        (!filtro || g.categoria === filtro) &&
        (!filtroEtiqueta || g.etiquetas.split(',').includes(filtroEtiqueta)) &&
        (!q || g.descripcion.toLowerCase().includes(q) || g.etiquetas.includes(q.replace('#', '')))
    );
    const porDia = new Map<string, Gasto[]>();
    filtrados.forEach((g) => porDia.set(g.fecha, [...(porDia.get(g.fecha) ?? []), g]));
    return Array.from(porDia.entries()).map(([fecha, data]) => ({
      fecha,
      total: data.reduce((s, g) => s + (g.tipo === 'ingreso' ? g.importe : -g.importe), 0),
      data,
    }));
  }, [gastos, busqueda, filtro, filtroEtiqueta]);

  const porcentaje = limite > 0 ? Math.min(totalMes / limite, 1) : 0;
  const colorBarra = limite > 0 && totalMes > limite ? tema.peligro : porcentaje > 0.8 ? tema.aviso : tema.exito;

  const abrirNuevo = () => {
    setEditando(null);
    setModalVisible(true);
  };

  const abrirEdicion = (g: Gasto) => {
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
    eliminarMovimiento(editando.id);
    recargar();
    setModalVisible(false);
  };

  const cabecera = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <Animated.View entering={reducirMovimiento ? undefined : FadeInDown.duration(380).easing(SALIDA)}>
        <LinearGradient
          colors={altoContraste ? [tema.primario, tema.primario] : ['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroBrillo} />
          <Text style={[styles.heroEtiqueta, { color: tema.primarioTexto }]}>
            Saldo total {sincronizando ? '· sincronizando…' : ''}
          </Text>
          <Text
            accessibilityLabel={`Saldo total ${formatoEuro(saldo)}`}
            style={[styles.heroImporte, { color: tema.primarioTexto }]}
          >
            {formatoEuro(saldo)}
          </Text>
          <View style={styles.heroFila}>
            <View style={styles.heroDato}>
              <View style={styles.heroPunto}>
                <Ionicons name="arrow-up" size={13} color={tema.primarioTexto} />
              </View>
              <View>
                <Text style={[styles.heroMini, { color: tema.primarioTexto }]}>Gastado este mes</Text>
                <Text style={[styles.heroMiniImporte, { color: tema.primarioTexto }]}>{formatoEuro(totalMes)}</Text>
              </View>
            </View>
            <View style={styles.heroDato}>
              <View style={styles.heroPunto}>
                <Ionicons name="arrow-down" size={13} color={tema.primarioTexto} />
              </View>
              <View>
                <Text style={[styles.heroMini, { color: tema.primarioTexto }]}>Ingresos del mes</Text>
                <Text style={[styles.heroMiniImporte, { color: tema.primarioTexto }]}>{formatoEuro(ingresosMes)}</Text>
              </View>
            </View>
          </View>
          {limite > 0 ? (
            <View style={{ gap: 6 }}>
              <View style={styles.heroBarraFondo}>
                <View style={[styles.heroBarra, { width: `${porcentaje * 100}%`, backgroundColor: colorBarra }]} />
              </View>
              <Text style={[styles.heroPie, { color: tema.primarioTexto }]}>
                {totalMes <= limite
                  ? `Te quedan ${formatoEuro(limite - totalMes)} de tu límite de ${formatoEuro(limite)}`
                  : `Te has pasado ${formatoEuro(totalMes - limite)} de tu límite`}
              </Text>
            </View>
          ) : (
            <Text style={[styles.heroPie, { color: tema.primarioTexto }]}>Fija un límite mensual en Resumen</Text>
          )}
        </LinearGradient>
      </Animated.View>

      <View style={[styles.buscador, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {CATEGORIAS.map((c) => {
          const activa = filtro === c.nombre;
          return (
            <TouchableOpacity accessibilityRole="button"
              key={c.nombre}
              onPress={() => setFiltro(activa ? null : c.nombre)}
              style={[styles.chip, { backgroundColor: activa ? c.color : tema.tarjeta, borderColor: tema.borde }]}
            >
              <Ionicons name={c.icono} size={15} color={activa ? '#fff' : c.color} />
              <Text style={{ color: activa ? '#fff' : tema.texto, fontSize: 12, fontWeight: '600' }}>{c.nombre}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {etiquetasLista.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {etiquetasLista.map((e) => {
            const activa = filtroEtiqueta === e;
            return (
              <TouchableOpacity accessibilityRole="button"
                key={e}
                onPress={() => setFiltroEtiqueta(activa ? null : e)}
                style={[styles.chip, { backgroundColor: activa ? tema.primario : tema.tarjeta, borderColor: tema.borde }]}
              >
                <Text style={{ color: activa ? tema.primarioTexto : tema.textoSuave, fontSize: 12, fontWeight: '600' }}>#{e}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <Text style={[styles.titulo, { color: tema.texto }]}>Movimientos</Text>

      <SectionList
        sections={secciones}
        keyExtractor={(g) => g.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="receipt-outline" size={48} color={tema.textoSuave} />
            <Text style={[styles.vacioTexto, { color: tema.textoSuave }]}>
              {gastos.length === 0 ? 'Aún no hay gastos. Pulsa + para añadir el primero.' : 'Ningún gasto coincide con el filtro.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.diaCabecera}>
            <Text style={[styles.diaTexto, { color: tema.textoSuave }]}>{formatoFecha(section.fecha)}</Text>
            <Text style={[styles.diaTexto, { color: tema.textoSuave }]}>{formatoEuro(section.total)}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const cat = infoCategoria(item.categoria);
          const primero = index === 0;
          const ultimo = index === section.data.length - 1;
          return (
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
              <View style={[styles.icono, { backgroundColor: (item.tipo === 'ingreso' ? tema.exito : cat.color) + '22' }]}>
                <Ionicons name={item.tipo === 'ingreso' ? 'arrow-down-circle-outline' : cat.icono} size={20} color={item.tipo === 'ingreso' ? tema.exito : cat.color} />
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
                  {item.categoria}
                  {item.etiquetas ? ` · ${item.etiquetas.split(',').map((e) => `#${e}`).join(' ')}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.importe, { color: item.tipo === 'ingreso' ? tema.exito : tema.texto }]}>
                  {item.tipo === 'ingreso' ? '+' : '-'}
                  {formatoEuro(item.importe)}
                </Text>
                {item.moneda !== 'EUR' && item.importe_original ? (
                  <Text style={{ color: tema.textoSuave, fontSize: 11 }}>
                    {item.importe_original} {item.moneda}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

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
        <Ionicons name="add" size={32} color={tema.primarioTexto} />
      </Presionable>

      <GastoModal
        visible={modalVisible}
        titulo={editando ? 'Editar movimiento' : 'Nuevo movimiento'}
        inicial={editando ?? undefined}
        onGuardar={guardar}
        onCancelar={() => setModalVisible(false)}
        onEliminar={editando ? eliminar : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
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
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, height: 44 },
  buscadorInput: { flex: 1, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  diaCabecera: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  diaTexto: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icono: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  descripcion: { fontSize: 16, fontWeight: '600' },
  categoria: { fontSize: 12, marginTop: 2 },
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
