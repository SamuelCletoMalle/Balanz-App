/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { arriba } from '../layout';
import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPendientes, deletePendiente, onCambioPendientes, Pendiente } from '../db';
import { sincronizarCaptaciones } from '../sync';
import { guardarMovimiento } from '../movimientos';
import { infoCategoria, formatoEuro, formatoFecha, useTema } from '../tema';
import GastoModal, { DatosGasto } from '../components/GastoModal';

export default function PendientesScreen() {
  const tema = useTema();
  const router = useRouter();
  const [lista, setLista] = useState<Pendiente[]>([]);
  const [refrescando, setRefrescando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Pendiente | null>(null);

  const recargar = useCallback(() => setLista(getPendientes()), []);

  useFocusEffect(
    useCallback(() => {
      recargar();
      sincronizarCaptaciones().catch(() => {});
      return onCambioPendientes(recargar);
    }, [recargar])
  );

  const refrescar = async () => {
    setRefrescando(true);
    await sincronizarCaptaciones().catch(() => {});
    recargar();
    setRefrescando(false);
  };

  const confirmar = (datos: DatosGasto) => {
    if (!seleccionado) return;
    guardarMovimiento(datos, null, seleccionado.fecha);
    deletePendiente(seleccionado.id);
    setSeleccionado(null);
  };

  const descartar = (p: Pendiente) => {
    Alert.alert('Descartar', '¿Quieres descartar este gasto detectado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          deletePendiente(p.id);
          setSeleccionado(null);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -6, marginBottom: 4 }}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: tema.texto }]}>Pagos por revisar</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/atajos')} style={[styles.ayuda, { backgroundColor: tema.tarjeta }]}>
          <Ionicons name="flash-outline" size={18} color={tema.primario} />
          <Text style={{ color: tema.primario, fontWeight: '700', fontSize: 13 }}>Configurar</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.subtitulo, { color: tema.textoSuave }]}>
        Gastos detectados en pagos y avisos del banco. Confírmalos con un toque.
      </Text>

      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 40, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={tema.primario} />}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={tema.exito} />
            <Text style={[styles.vacioTitulo, { color: tema.texto }]}>Todo al día</Text>
            <Text style={[styles.vacioTexto, { color: tema.textoSuave }]}>
              Cuando pagues con tarjeta o te llegue un aviso del banco aparecerá aquí.{'\n'}Desliza hacia abajo para actualizar.
            </Text>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.botonGrande, { backgroundColor: tema.primario }]}
              onPress={() => router.push('/atajos')}
            >
              <Ionicons name="flash" size={18} color={tema.primarioTexto} />
              <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Activar captura automática</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const cat = infoCategoria(item.categoria);
          return (
            <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
              <View style={styles.tarjetaTop}>
                <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icono} size={20} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.comercio, { color: tema.texto }]} numberOfLines={1}>
                    {item.comercio || 'Sin comercio'}
                  </Text>
                  <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
                    {item.categoria} · {formatoFecha(item.fecha)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.importe,
                    { color: !item.importe ? tema.aviso : item.tipo === 'ingreso' ? tema.exito : tema.texto },
                  ]}
                >
                  {item.importe ? `${item.tipo === 'ingreso' ? '+' : '-'}${formatoEuro(item.importe)}` : '¿Importe?'}
                </Text>
              </View>
              <Text style={[styles.original, { color: tema.textoSuave, backgroundColor: tema.tarjetaSuave }]} numberOfLines={3}>
                “{item.texto}”
              </Text>
              <View style={styles.acciones}>
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.accion, { backgroundColor: tema.tarjetaSuave }]}
                  onPress={() => descartar(item)}
                >
                  <Ionicons name="close" size={18} color={tema.peligro} />
                  <Text style={{ color: tema.peligro, fontWeight: '700' }}>Descartar</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.accion, { backgroundColor: tema.primario, flex: 1.4 }]}
                  onPress={() => setSeleccionado(item)}
                >
                  <Ionicons name="checkmark" size={18} color={tema.primarioTexto} />
                  <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Revisar y añadir</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <GastoModal
        visible={!!seleccionado}
        titulo="Añadir gasto detectado"
        textoGuardar="Añadir"
        inicial={
          seleccionado
            ? {
                descripcion: seleccionado.comercio,
                categoria: seleccionado.categoria,
                importe: seleccionado.importe,
                tipo: seleccionado.tipo,
              }
            : undefined
        }
        nota="Revisa que el importe y el comercio sean correctos."
        onGuardar={confirmar}
        onCancelar={() => setSeleccionado(null)}
        onEliminar={seleccionado ? () => descartar(seleccionado) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(60), paddingHorizontal: 16 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 32, fontWeight: '800' },
  subtitulo: { fontSize: 13, marginTop: 4 },
  ayuda: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  tarjeta: { borderRadius: 20, padding: 14, gap: 12 },
  tarjetaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  comercio: { fontSize: 16, fontWeight: '700' },
  importe: { fontSize: 17, fontWeight: '800' },
  original: { fontSize: 12, padding: 10, borderRadius: 12, overflow: 'hidden', fontStyle: 'italic' },
  acciones: { flexDirection: 'row', gap: 10 },
  accion: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 20 },
  vacioTitulo: { fontSize: 20, fontWeight: '800' },
  vacioTexto: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  botonGrande: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, marginTop: 14 },
});
