/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/Texto';
import { Alert } from '../dialogos';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as Clipboard from 'expo-clipboard';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { interpretarTexto } from '../captura';
import { usePreferencias } from '../accesibilidad';
import { getCategorias, useTema } from '../tema';
import NuevaCategoria from './NuevaCategoria';
import { subirPerfil } from '../sync';
import { Tipo, TipoMovimiento, Division, CUENTAS, buscarRegla, leerDivisiones } from '../db';
import { MONEDAS, SIMBOLOS, convertirAEuros } from '../divisas';

export type DatosGasto = {
  descripcion: string;
  categoria: string;
  importe: number; // EUR
  tipo: Tipo;
  cuenta: string;
  etiquetas: string;
  moneda: string;
  importe_original: number | null;
  divisiones: string;
  foto: string;
};

export type InicialGasto = {
  descripcion: string;
  categoria: string;
  importe: number | null;
  tipo?: TipoMovimiento;
  cuenta?: string;
  etiquetas?: string;
  moneda?: string;
  importe_original?: number | null;
  divisiones?: string;
  foto?: string;
};

type Props = {
  visible: boolean;
  titulo: string;
  inicial?: InicialGasto;
  textoGuardar?: string;
  onGuardar: (datos: DatosGasto) => void;
  onCancelar: () => void;
  onEliminar?: () => void;
  onDuplicar?: () => void;
  nota?: string;
};

async function guardarFoto(uri: string): Promise<string> {
  const carpeta = `${FileSystem.documentDirectory}tickets/`;
  await FileSystem.makeDirectoryAsync(carpeta, { intermediates: true }).catch(() => {});
  const destino = `${carpeta}${Crypto.randomUUID()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: destino });
  return destino;
}

export default function GastoModal({
  visible,
  titulo,
  inicial,
  textoGuardar = 'Guardar',
  onGuardar,
  onCancelar,
  onEliminar,
  onDuplicar,
  nota,
}: Props) {
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const [tipo, setTipo] = useState<Tipo>('gasto');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(getCategorias()[0].nombre);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [cuenta, setCuenta] = useState('banco');
  const [importe, setImporte] = useState('');
  const [moneda, setMoneda] = useState('EUR');
  const [etiquetas, setEtiquetas] = useState('');
  const [dividirCon, setDividirCon] = useState('');
  const [foto, setFoto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const categoriaManual = useRef(false);
  const divisionesPrevias = useRef<Division[]>([]);

  useEffect(() => {
    if (!visible) return;
    categoriaManual.current = !!inicial;
    setTipo(inicial?.tipo === 'ingreso' ? 'ingreso' : 'gasto');
    setCuenta(inicial?.cuenta || 'banco');
    setDescripcion(inicial?.descripcion ?? '');
    setCategoria(inicial?.categoria ?? getCategorias()[0].nombre);
    setMoneda(inicial?.moneda ?? 'EUR');
    const base = inicial?.importe_original ?? inicial?.importe ?? null;
    setImporte(base != null && base > 0 ? base.toFixed(2).replace('.', ',') : '');
    setEtiquetas((inicial?.etiquetas ?? '').split(',').filter(Boolean).map((e) => `#${e}`).join(' '));
    divisionesPrevias.current = leerDivisiones({ divisiones: inicial?.divisiones ?? '' });
    setDividirCon(divisionesPrevias.current.map((d) => d.nombre).join(', '));
    setFoto(inicial?.foto ?? '');
    setGuardando(false);
    // Solo al abrir: así los refrescos del padre no borran lo que se está escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const importeNum = parseFloat(importe.replace(',', '.'));
  const valido = descripcion.trim().length > 0 && isFinite(importeNum) && importeNum > 0 && !guardando;

  // Rellena el formulario con el texto copiado: un SMS del banco, un ticket que se ha copiado con "Texto en vivo" / Google Lens…
  const rellenarDesdePortapapeles = async () => {
    try {
      const texto = (await Clipboard.getStringAsync()).trim();
      const c = interpretarTexto(texto);
      if (!texto || c.importe === null) {
        Alert.alert('No he encontrado un importe', 'Copia primero el texto del ticket o del SMS del banco (con el importe) y vuelve a pulsar.');
        return;
      }
      setImporte(c.importe.toFixed(2).replace('.', ','));
      if (c.comercio) setDescripcion(c.comercio);
      setTipo(c.esIngreso ? 'ingreso' : 'gasto');
      categoriaManual.current = true;
      setCategoria(buscarRegla(c.comercio || '') ?? c.categoria);
    } catch {
      Alert.alert('No se pudo leer lo copiado', 'Prueba a copiar el texto otra vez.');
    }
  };

  const aplicarRegla = () => {
    if (categoriaManual.current) return;
    const sugerida = buscarRegla(descripcion);
    if (sugerida) setCategoria(sugerida);
  };

  const elegirFoto = (origen: 'camara' | 'galeria') => async () => {
    try {
      const permiso =
        origen === 'camara'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Concede el permiso en los ajustes del móvil para adjuntar el ticket.');
        return;
      }
      const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const r = origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
      if (!r.canceled && r.assets[0]) setFoto(await guardarFoto(r.assets[0].uri));
    } catch {
      Alert.alert('Error', 'No se pudo adjuntar la imagen.');
    }
  };

  const guardar = async () => {
    setGuardando(true);
    const euros = await convertirAEuros(importeNum, moneda);

    const tags = etiquetas
      .split(/[\s,#]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const nombres = dividirCon.split(',').map((n) => n.trim()).filter(Boolean);
    let divisiones = '';
    if (tipo === 'gasto' && nombres.length > 0) {
      const parte = Math.round((euros / (nombres.length + 1)) * 100) / 100;
      const lista: Division[] = nombres.map((nombre) => ({
        nombre,
        importe: parte,
        pagado: divisionesPrevias.current.find((d) => d.nombre === nombre)?.pagado ?? false,
      }));
      divisiones = JSON.stringify(lista);
    }

    onGuardar({
      descripcion: descripcion.trim(),
      categoria,
      importe: euros,
      tipo,
      cuenta,
      etiquetas: Array.from(new Set(tags)).join(','),
      moneda,
      importe_original: moneda === 'EUR' ? null : importeNum,
      divisiones,
      foto,
    });
  };

  const colorTipo = tipo === 'gasto' ? tema.peligro : tema.exito;

  // La hoja se cierra arrastrando el asa hacia abajo: sigue al dedo y, al soltar, se va si hubo distancia o un empujón.
  const arrastre = useSharedValue(0);
  useEffect(() => {
    if (visible) arrastre.set(0);
  }, [visible, arrastre]);
  const gesto = Gesture.Pan()
    .onUpdate((e) => {
      arrastre.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        arrastre.set(withTiming(900, { duration: 200 }, (ok) => ok && scheduleOnRN(onCancelar)));
      } else {
        arrastre.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
      }
    });
  const estiloHoja = useAnimatedStyle(() => ({ transform: [{ translateY: arrastre.get() }] }));

  return (
    <Modal visible={visible} animationType={reducirMovimiento ? 'none' : 'slide'} transparent onRequestClose={onCancelar}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={styles.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} activeOpacity={1} onPress={onCancelar} />
        <Animated.View style={[styles.hoja, { backgroundColor: tema.elevada }, estiloHoja]}>
          <GestureDetector gesture={gesto}>
            <View style={styles.zonaAsa} accessibilityLabel="Arrastra hacia abajo para cerrar">
              <View style={[styles.asa, { backgroundColor: tema.borde }]} />
            </View>
          </GestureDetector>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <Text style={[styles.titulo, { color: tema.texto }]}>{titulo}</Text>
            {nota ? <Text style={[styles.nota, { color: tema.textoSuave }]}>{nota}</Text> : null}

            <View style={[styles.segmento, { backgroundColor: tema.tarjetaSuave }]}>
              {(['gasto', 'ingreso'] as Tipo[]).map((t) => (
                <TouchableOpacity accessibilityRole="button"
                  key={t}
                  onPress={() => setTipo(t)}
                  style={[styles.segmentoOpcion, tipo === t && { backgroundColor: t === 'gasto' ? tema.peligro : tema.exito }]}
                >
                  <Text style={{ color: tipo === t ? '#fff' : tema.texto, fontWeight: '700' }}>
                    {t === 'gasto' ? 'Gasto' : 'Ingreso'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.importeFila}>
              <TextInput
                style={[styles.importeInput, { color: colorTipo }]}
                placeholder="0,00"
                placeholderTextColor={tema.textoSuave}
                keyboardType="decimal-pad"
                value={importe}
                onChangeText={setImporte}
                autoFocus={!inicial || inicial.importe == null}
              />
              <Text style={[styles.euro, { color: tema.textoSuave }]}>{SIMBOLOS[moneda] ?? moneda}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MONEDAS.map((m) => (
                <TouchableOpacity accessibilityRole="button"
                  key={m}
                  onPress={() => setMoneda(m)}
                  style={[styles.moneda, { backgroundColor: moneda === m ? tema.primario : tema.tarjetaSuave }]}
                >
                  <Text style={{ color: moneda === m ? tema.primarioTexto : tema.texto, fontWeight: '700', fontSize: 12 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Rellenar con el texto copiado" onPress={rellenarDesdePortapapeles} style={[styles.pegar, { backgroundColor: tema.tarjetaSuave }]}>
              <Ionicons name="clipboard-outline" size={16} color={tema.primario} />
              <Text style={{ color: tema.primario, fontSize: 13, fontWeight: '700' }}>Rellenar con lo que has copiado (ticket o SMS)</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
              placeholder={tipo === 'gasto' ? 'Descripción (ej. Mercadona)' : 'Origen (ej. Nómina)'}
              placeholderTextColor={tema.textoSuave}
              value={descripcion}
              onChangeText={setDescripcion}
              onEndEditing={aplicarRegla}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getCategorias().map((c) => {
                const activa = categoria === c.nombre;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={c.nombre}
                    onPress={() => {
                      categoriaManual.current = true;
                      setCategoria(c.nombre);
                    }}
                    style={[styles.chip, { backgroundColor: activa ? c.color : tema.tarjetaSuave }]}
                  >
                    <Ionicons name={c.icono} size={16} color={activa ? '#fff' : c.color} />
                    <Text style={[styles.chipTexto, { color: activa ? '#fff' : tema.texto }]}>{c.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Crear una categoría nueva" onPress={() => setCreandoCategoria((v) => !v)} style={[styles.chip, { backgroundColor: tema.tarjetaSuave }]}>
                <Ionicons name={creandoCategoria ? 'close' : 'add'} size={16} color={tema.primario} />
                <Text style={[styles.chipTexto, { color: tema.primario }]}>Nueva</Text>
              </TouchableOpacity>
            </ScrollView>
            {creandoCategoria ? (
              <NuevaCategoria
                tema={tema}
                onCreada={(nombre) => {
                  categoriaManual.current = true;
                  setCategoria(nombre);
                  setCreandoCategoria(false);
                  subirPerfil().catch(() => {});
                }}
                onCancelar={() => setCreandoCategoria(false)}
              />
            ) : null}

            <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>
              {tipo === 'gasto' ? 'PAGADO DESDE' : 'INGRESADO EN'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CUENTAS.map((c) => {
                const activa = cuenta === c.id;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    key={c.id}
                    onPress={() => setCuenta(c.id)}
                    style={[styles.cuentaOpcion, { backgroundColor: activa ? tema.primario : tema.tarjetaSuave }]}
                  >
                    <Ionicons name={c.icono} size={16} color={activa ? tema.primarioTexto : tema.textoSuave} />
                    <Text style={{ color: activa ? tema.primarioTexto : tema.texto, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{c.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.campo, { backgroundColor: tema.tarjetaSuave }]}>
              <Ionicons name="pricetag-outline" size={18} color={tema.textoSuave} />
              <TextInput
                style={[styles.campoInput, { color: tema.texto }]}
                placeholder="Etiquetas: #vacaciones #trabajo"
                placeholderTextColor={tema.textoSuave}
                autoCapitalize="none"
                value={etiquetas}
                onChangeText={setEtiquetas}
              />
            </View>

            {tipo === 'gasto' ? (
              <View style={[styles.campo, { backgroundColor: tema.tarjetaSuave }]}>
                <Ionicons name="people-outline" size={18} color={tema.textoSuave} />
                <TextInput
                  style={[styles.campoInput, { color: tema.texto }]}
                  placeholder="Dividir con (nombres separados por coma)"
                  placeholderTextColor={tema.textoSuave}
                  value={dividirCon}
                  onChangeText={setDividirCon}
                />
              </View>
            ) : null}

            <View style={styles.fotoFila}>
              {foto ? (
                <View>
                  <Image source={{ uri: foto }} style={styles.miniatura} />
                  <TouchableOpacity accessibilityRole="button" style={[styles.quitarFoto, { backgroundColor: tema.peligro }]} accessibilityLabel="Quitar foto" onPress={() => setFoto('')}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity accessibilityRole="button" style={[styles.fotoBoton, { backgroundColor: tema.tarjetaSuave }]} onPress={elegirFoto('camara')}>
                <Ionicons name="camera-outline" size={18} color={tema.primario} />
                <Text style={{ color: tema.texto, fontWeight: '600', fontSize: 13 }}>Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.fotoBoton, { backgroundColor: tema.tarjetaSuave }]} onPress={elegirFoto('galeria')}>
                <Ionicons name="image-outline" size={18} color={tema.primario} />
                <Text style={{ color: tema.texto, fontWeight: '600', fontSize: 13 }}>Galería</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.botones}>
              {onDuplicar ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} accessibilityLabel="Duplicar con la fecha de hoy" onPress={onDuplicar}>
                  <Ionicons name="copy-outline" size={20} color={tema.primario} />
                </TouchableOpacity>
              ) : null}
              {onEliminar ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} accessibilityLabel="Eliminar" onPress={onEliminar}>
                  <Ionicons name="trash-outline" size={20} color={tema.peligro} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave, flex: 1 }]} onPress={onCancelar}>
                <Text style={[styles.botonTexto, { color: tema.texto }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                disabled={!valido}
                style={[styles.boton, { backgroundColor: tema.primario, flex: 2, opacity: valido ? 1 : 0.4 }]}
                onPress={guardar}
              >
                {guardando ? (
                  <ActivityIndicator color={tema.primarioTexto} />
                ) : (
                  <Text style={[styles.botonTexto, { color: tema.primarioTexto }]}>{textoGuardar}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { padding: 20, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  zonaAsa: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 2, paddingBottom: 12, marginTop: -8 },
  asa: { width: 44, height: 5, borderRadius: 3 },
  titulo: { fontSize: 20, fontWeight: '800' },
  nota: { fontSize: 12, marginTop: -8 },
  segmento: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  segmentoOpcion: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  importeFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  importeInput: { fontSize: 44, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  euro: { fontSize: 28, fontWeight: '700' },
  moneda: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, marginRight: 6 },
  input: { borderRadius: 14, padding: 14, fontSize: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 22, marginRight: 8 },
  pegar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start' },
  cuentaOpcion: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14 },
  chipTexto: { fontSize: 13, fontWeight: '600' },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, height: 48 },
  campoInput: { flex: 1, fontSize: 14 },
  fotoFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fotoBoton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14 },
  miniatura: { width: 48, height: 48, borderRadius: 10 },
  quitarFoto: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  boton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  botonTexto: { fontSize: 16, fontWeight: '700' },
});
