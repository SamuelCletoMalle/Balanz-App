/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback } from 'react';
import { arriba } from '../layout';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { usePreferencias } from '../accesibilidad';
import { Text, TextInput } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { getRecurrentes, insertRecurrente, updateRecurrente, deleteRecurrente, mesActual, textoFrecuencia, FRECUENCIAS, NOMBRES_MES, Recurrente, Tipo } from '../db';
import { generarRecurrentes, detectarSuscripciones, textoVariacion, Sospechosa } from '../recurrentes';
import { CATEGORIAS, infoCategoria, formatoEuro, useTema } from '../tema';

const VACIO: Recurrente = { id: '', descripcion: '', categoria: CATEGORIAS[0].nombre, importe: 0, tipo: 'gasto', dia: 1, ultima: '', activo: 1, cada: 1, inicio: '' };

export default function RecurrentesScreen() {
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const router = useRouter();
  const [lista, setLista] = useState<Recurrente[]>([]);
  const [sospechosas, setSospechosas] = useState<Sospechosa[]>([]);
  const [editando, setEditando] = useState<Recurrente | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [importe, setImporte] = useState('');
  const [dia, setDia] = useState('1');
  const [categoria, setCategoria] = useState(CATEGORIAS[0].nombre);
  const [tipo, setTipo] = useState<Tipo>('gasto');
  const [cada, setCada] = useState(1);
  const [mesPrimero, setMesPrimero] = useState(new Date().getMonth() + 1); // 1-12: mes del primer pago si no es mensual

  const recargar = useCallback(() => {
    setLista(getRecurrentes());
    setSospechosas(detectarSuscripciones());
  }, []);

  useFocusEffect(recargar);

  const abrir = (r: Recurrente) => {
    setEditando(r);
    setDescripcion(r.descripcion);
    setImporte(r.importe ? String(r.importe).replace('.', ',') : '');
    setDia(String(r.dia));
    setCategoria(r.categoria);
    setTipo(r.tipo);
    setCada(r.cada >= 1 ? r.cada : 1);
    setMesPrimero(r.inicio ? Number(r.inicio.slice(5, 7)) : new Date().getMonth() + 1);
  };

  const guardar = async () => {
    if (!editando) return;
    const imp = parseFloat(importe.replace(',', '.'));
    const d = parseInt(dia, 10);
    if (!descripcion.trim() || !isFinite(imp) || imp <= 0 || !(d >= 1 && d <= 31)) {
      Alert.alert('Revisa los datos', 'Pon una descripción, un importe mayor que 0 y un día entre 1 y 31.');
      return;
    }
    // Si no es mensual, el primer pago cae en el mes elegido de este año y de ahí se cuenta cada N meses.
    const inicio = cada > 1 ? `${new Date().getFullYear()}-${String(mesPrimero).padStart(2, '0')}` : '';
    const nuevo: Recurrente = { ...editando, descripcion: descripcion.trim(), importe: imp, dia: d, categoria, tipo, cada, inicio };
    if (editando.id) updateRecurrente(nuevo);
    else insertRecurrente({ ...nuevo, id: Crypto.randomUUID() });
    setEditando(null);
    await generarRecurrentes();
    recargar();
  };

  const borrar = () => {
    if (!editando?.id) return;
    Alert.alert('Eliminar', 'Los movimientos ya registrados no se borran.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteRecurrente(editando.id);
          setEditando(null);
          recargar();
        },
      },
    ]);
  };

  const alternar = (r: Recurrente, on: boolean) => {
    updateRecurrente({ ...r, activo: on ? 1 : 0 });
    recargar();
  };

  const adoptar = (s: Sospechosa) => {
    // Marcamos el mes actual como ya generado para no duplicar lo que ya se pagó este mes.
    const mes = mesActual();
    insertRecurrente({
      id: Crypto.randomUUID(),
      descripcion: s.descripcion,
      categoria: s.categoria,
      importe: s.importe,
      tipo: 'gasto',
      dia: s.dia,
      ultima: mes,
      activo: 1,
      cada: 1,
      inicio: '',
    });
    recargar();
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: tema.texto }]}>Recurrentes</Text>
        <TouchableOpacity accessibilityRole="button" style={[styles.nuevo, { backgroundColor: tema.primario }]} accessibilityLabel="Nuevo recurrente" onPress={() => abrir(VACIO)}>
          <Ionicons name="add" size={22} color={tema.primarioTexto} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: tema.textoSuave, fontSize: 13, marginBottom: 6 }}>
        Alquiler, suscripciones, seguros o nómina: se registran solos con la frecuencia que elijas (cada mes, cada 6 meses, cada año…).
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        {sospechosas.length > 0 ? (
          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>DETECTADAS AUTOMÁTICAMENTE</Text>
            <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Gastos que se repiten cada mes y aún no son recurrentes.</Text>
            {sospechosas.slice(0, 6).map((s) => {
              const variacion = textoVariacion(s);
              return (
                <View key={s.clave} style={styles.fila}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontWeight: '700' }} numberOfLines={1}>{s.descripcion}</Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
                      {formatoEuro(s.importe)} · {s.mesesVistos} meses seguidos
                    </Text>
                    {variacion ? (
                      <Text style={{ color: s.variacion! > 0 ? tema.peligro : tema.exito, fontSize: 12, fontWeight: '700' }}>
                        {variacion}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity accessibilityRole="button" style={[styles.adoptar, { backgroundColor: tema.primario }]} onPress={() => adoptar(s)}>
                    <Text style={{ color: tema.primarioTexto, fontWeight: '700', fontSize: 12 }}>Añadir</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        {lista.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50, gap: 10 }}>
            <Ionicons name="repeat-outline" size={52} color={tema.textoSuave} />
            <Text style={{ color: tema.textoSuave, textAlign: 'center' }}>Aún no hay movimientos recurrentes.{'\n'}Pulsa + para crear el primero.</Text>
          </View>
        ) : (
          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta, padding: 6 }]}>
            {lista.map((r) => {
              const cat = infoCategoria(r.categoria);
              return (
                <TouchableOpacity accessibilityRole="button" key={r.id} style={styles.filaLista} onPress={() => abrir(r)} activeOpacity={0.7}>
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={19} color={cat.color} />
                  </View>
                  <View style={{ flex: 1, opacity: r.activo ? 1 : 0.45 }}>
                    <Text style={{ color: tema.texto, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{r.descripcion}</Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 12 }}>{textoFrecuencia(r)}</Text>
                  </View>
                  <Text style={{ color: r.tipo === 'ingreso' ? tema.exito : tema.texto, fontWeight: '700', opacity: r.activo ? 1 : 0.45 }}>
                    {r.tipo === 'ingreso' ? '+' : '-'}
                    {formatoEuro(r.importe)}
                  </Text>
                  <Switch accessibilityLabel={`${r.descripcion} activo`} value={!!r.activo} onValueChange={(v) => alternar(r, v)} trackColor={{ true: tema.primario }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!editando} transparent animationType={reducirMovimiento ? 'none' : 'slide'} onRequestClose={() => setEditando(null)}>
        <KeyboardAvoidingView style={styles.modalFondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditando(null)} />
          <View style={[styles.hoja, { backgroundColor: tema.tarjeta }]}>
            <Text style={{ color: tema.texto, fontSize: 20, fontWeight: '800' }}>
              {editando?.id ? 'Editar recurrente' : 'Nuevo recurrente'}
            </Text>
            <View style={[styles.segmento, { backgroundColor: tema.tarjetaSuave }]}>
              {(['gasto', 'ingreso'] as Tipo[]).map((t) => (
                <TouchableOpacity accessibilityRole="button"
                  key={t}
                  onPress={() => setTipo(t)}
                  style={[styles.segmentoOpcion, tipo === t && { backgroundColor: t === 'gasto' ? tema.peligro : tema.exito }]}
                >
                  <Text style={{ color: tipo === t ? '#fff' : tema.texto, fontWeight: '700' }}>{t === 'gasto' ? 'Gasto' : 'Ingreso'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
              placeholder="Descripción (ej. Alquiler)"
              placeholderTextColor={tema.textoSuave}
              value={descripcion}
              onChangeText={setDescripcion}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto, flex: 2 }]}
                placeholder="Importe €"
                placeholderTextColor={tema.textoSuave}
                keyboardType="decimal-pad"
                value={importe}
                onChangeText={setImporte}
              />
              <TextInput
                style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto, flex: 1 }]}
                placeholder="Día"
                placeholderTextColor={tema.textoSuave}
                keyboardType="number-pad"
                value={dia}
                onChangeText={setDia}
                maxLength={2}
              />
            </View>
            <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>¿CADA CUÁNTO SE REPITE?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {FRECUENCIAS.map((f) => {
                const activa = cada === f.cada;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    key={f.cada}
                    onPress={() => setCada(f.cada)}
                    style={[styles.chip, { backgroundColor: activa ? tema.primario : tema.tarjetaSuave }]}
                  >
                    <Text style={{ color: activa ? tema.primarioTexto : tema.texto, fontSize: 13, fontWeight: '600' }}>{f.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {cada > 1 ? (
              <>
                <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>¿EN QUÉ MES ES EL PRIMER PAGO?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {NOMBRES_MES.map((nombre, i) => {
                    const activa = mesPrimero === i + 1;
                    return (
                      <TouchableOpacity accessibilityRole="button"
                        accessibilityState={{ selected: activa }}
                        key={nombre}
                        onPress={() => setMesPrimero(i + 1)}
                        style={[styles.chip, { backgroundColor: activa ? tema.primario : tema.tarjetaSuave }]}
                      >
                        <Text style={{ color: activa ? tema.primarioTexto : tema.texto, fontSize: 13, fontWeight: '600' }}>{nombre.charAt(0).toUpperCase() + nombre.slice(1)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <Text style={{ color: tema.textoSuave, fontSize: 12, marginTop: -6 }}>
                  Se apuntará el día {dia || '…'} de ese mes y se repetirá {cada === 12 ? 'cada año' : `cada ${cada} meses`}.
                </Text>
              </>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIAS.map((c) => {
                const activa = categoria === c.nombre;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={c.nombre}
                    onPress={() => setCategoria(c.nombre)}
                    style={[styles.chip, { backgroundColor: activa ? c.color : tema.tarjetaSuave }]}
                  >
                    <Ionicons name={c.icono} size={16} color={activa ? '#fff' : c.color} />
                    <Text style={{ color: activa ? '#fff' : tema.texto, fontSize: 13, fontWeight: '600' }}>{c.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(56), paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 30, fontWeight: '800' },
  nuevo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 22, padding: 16, gap: 12 },
  etiqueta: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaLista: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  icono: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  adoptar: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { padding: 20, paddingBottom: 32, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 14 },
  segmento: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  segmentoOpcion: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: 14, padding: 14, fontSize: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 22, marginRight: 8 },
  boton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
