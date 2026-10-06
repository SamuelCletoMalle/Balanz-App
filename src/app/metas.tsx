/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { usePreferencias } from '../accesibilidad';
import { Text, TextInput } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { getMetas, insertMeta, updateMeta, deleteMeta, Meta } from '../db';
import { formatoEuro, useTema, IconoNombre } from '../tema';

const ICONOS: IconoNombre[] = ['airplane-outline', 'home-outline', 'car-outline', 'laptop-outline', 'gift-outline', 'school-outline', 'shield-checkmark-outline', 'flag-outline'];

export default function MetasScreen() {
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const router = useRouter();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [editando, setEditando] = useState<Meta | null>(null);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [icono, setIcono] = useState<string>('flag-outline');
  const [aportando, setAportando] = useState<Meta | null>(null);
  const [aporte, setAporte] = useState('');

  const recargar = useCallback(() => setMetas(getMetas()), []);
  useFocusEffect(recargar);

  const abrir = (m: Meta | null) => {
    setEditando(m ?? { id: '', nombre: '', objetivo: 0, ahorrado: 0, icono: 'flag-outline' });
    setNombre(m?.nombre ?? '');
    setObjetivo(m ? String(m.objetivo).replace('.', ',') : '');
    setIcono(m?.icono ?? 'flag-outline');
  };

  const guardar = () => {
    if (!editando) return;
    const obj = parseFloat(objetivo.replace(',', '.'));
    if (!nombre.trim() || !isFinite(obj) || obj <= 0) {
      Alert.alert('Revisa los datos', 'Pon un nombre y un objetivo mayor que 0.');
      return;
    }
    const meta = { ...editando, nombre: nombre.trim(), objetivo: obj, icono };
    if (editando.id) updateMeta(meta);
    else insertMeta({ ...meta, id: Crypto.randomUUID() });
    setEditando(null);
    recargar();
  };

  const borrar = () => {
    if (!editando?.id) return;
    Alert.alert('Eliminar meta', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteMeta(editando.id);
          setEditando(null);
          recargar();
        },
      },
    ]);
  };

  const aportar = (signo: 1 | -1) => {
    if (!aportando) return;
    const v = parseFloat(aporte.replace(',', '.'));
    if (!isFinite(v) || v <= 0) return;
    updateMeta({ ...aportando, ahorrado: Math.max(0, aportando.ahorrado + signo * v) });
    setAportando(null);
    setAporte('');
    recargar();
  };

  const totalAhorrado = metas.reduce((s, m) => s + m.ahorrado, 0);

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: tema.texto }]}>Metas de ahorro</Text>
        <TouchableOpacity accessibilityRole="button" style={[styles.nuevo, { backgroundColor: tema.primario }]} accessibilityLabel="Nueva meta" onPress={() => abrir(null)}>
          <Ionicons name="add" size={22} color={tema.primarioTexto} />
        </TouchableOpacity>
      </View>
      {metas.length > 0 ? (
        <Text style={{ color: tema.textoSuave, fontSize: 13, marginBottom: 6 }}>Llevas ahorrado {formatoEuro(totalAhorrado)} en total.</Text>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        {metas.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
            <Ionicons name="flag-outline" size={52} color={tema.textoSuave} />
            <Text style={{ color: tema.textoSuave, textAlign: 'center' }}>Crea una meta (un viaje, un coche, un colchón…){'\n'}y ve aportando poco a poco.</Text>
          </View>
        ) : (
          metas.map((m) => {
            const pct = Math.min(m.ahorrado / m.objetivo, 1);
            const completa = m.ahorrado >= m.objetivo;
            return (
              <TouchableOpacity accessibilityRole="button" key={m.id} activeOpacity={0.8} onPress={() => abrir(m)} style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
                <View style={styles.fila}>
                  <View style={[styles.icono, { backgroundColor: tema.primario + '22' }]}>
                    <Ionicons name={m.icono as IconoNombre} size={22} color={tema.primario} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{m.nombre}</Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
                      {formatoEuro(m.ahorrado)} de {formatoEuro(m.objetivo)}
                    </Text>
                  </View>
                  <Text style={{ color: completa ? tema.exito : tema.texto, fontWeight: '800', fontSize: 18 }}>{Math.round(pct * 100)}%</Text>
                </View>
                <View style={[styles.barraFondo, { backgroundColor: tema.tarjetaSuave }]}>
                  <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 6, backgroundColor: completa ? tema.exito : tema.primario }} />
                </View>
                <View style={styles.fila}>
                  <Text style={{ color: tema.textoSuave, fontSize: 12, flex: 1 }}>
                    {completa ? '¡Meta conseguida! 🎉' : `Te faltan ${formatoEuro(m.objetivo - m.ahorrado)}`}
                  </Text>
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.aportar, { backgroundColor: tema.primario }]}
                    onPress={() => {
                      setAportando(m);
                      setAporte('');
                    }}
                  >
                    <Ionicons name="add" size={16} color={tema.primarioTexto} />
                    <Text style={{ color: tema.primarioTexto, fontWeight: '700', fontSize: 13 }}>Aportar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!editando} transparent animationType={reducirMovimiento ? 'none' : 'slide'} onRequestClose={() => setEditando(null)}>
        <KeyboardAvoidingView style={styles.modalFondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditando(null)} />
          <View style={[styles.hoja, { backgroundColor: tema.tarjeta }]}>
            <Text style={{ color: tema.texto, fontSize: 20, fontWeight: '800' }}>{editando?.id ? 'Editar meta' : 'Nueva meta'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
              placeholder="Nombre (ej. Viaje a Japón)"
              placeholderTextColor={tema.textoSuave}
              value={nombre}
              onChangeText={setNombre}
            />
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
              placeholder="Objetivo (€)"
              placeholderTextColor={tema.textoSuave}
              keyboardType="decimal-pad"
              value={objetivo}
              onChangeText={setObjetivo}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ICONOS.map((i) => (
                <TouchableOpacity accessibilityRole="button"
                  key={i}
                  onPress={() => setIcono(i)}
                  style={[styles.iconoElegir, { backgroundColor: icono === i ? tema.primario : tema.tarjetaSuave }]}
                >
                  <Ionicons name={i} size={22} color={icono === i ? tema.primarioTexto : tema.textoSuave} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {editando?.id ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} onPress={borrar}>
                  <Ionicons name="trash-outline" size={20} color={tema.peligro} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave, flex: 1 }]} onPress={() => setEditando(null)}>
                <Text style={{ color: tema.texto, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.primario, flex: 2 }]} onPress={guardar}>
                <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!aportando} transparent animationType={reducirMovimiento ? 'none' : 'fade'} onRequestClose={() => setAportando(null)}>
        <KeyboardAvoidingView style={[styles.modalFondo, { justifyContent: 'center', padding: 24 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.caja, { backgroundColor: tema.tarjeta }]}>
            <Text style={{ color: tema.texto, fontSize: 18, fontWeight: '800' }}>{aportando?.nombre}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto, fontSize: 24, textAlign: 'center' }]}
              placeholder="0,00 €"
              placeholderTextColor={tema.textoSuave}
              keyboardType="decimal-pad"
              value={aporte}
              onChangeText={setAporte}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave, flex: 1 }]} onPress={() => aportar(-1)}>
                <Text style={{ color: tema.peligro, fontWeight: '700' }}>Retirar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.primario, flex: 1 }]} onPress={() => aportar(1)}>
                <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Aportar</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => setAportando(null)} style={{ alignItems: 'center' }}>
              <Text style={{ color: tema.textoSuave }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 30, fontWeight: '800' },
  nuevo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 22, padding: 16, gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  barraFondo: { height: 12, borderRadius: 6, overflow: 'hidden' },
  aportar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { padding: 20, paddingBottom: 32, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 14 },
  caja: { borderRadius: 22, padding: 20, gap: 14 },
  input: { borderRadius: 14, padding: 14, fontSize: 16 },
  iconoElegir: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  boton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
