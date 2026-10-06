/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Switch, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { FondosForm, fondosATexto, textoAFondos } from '../components/Onboarding';
import Presionable from '../components/Presionable';
import { toque } from '../haptics';
import { Text } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { contarGastos, borrarTodosLosDatos, getReglas, getMetas, getRecurrentes, getFondosIniciales, setFondosIniciales, sumaFondos } from '../db';
import { exportarGastosAExcel, importarGastosDesdeExcel } from '../excel';
import { supabase } from '../supabase';
import { borrarTodosLosGastosDeLaNube, subirPerfil } from '../sync';
import { activarAvisos, avisosActivados, pedirPermisoAvisos } from '../avisos';
import { autenticar, biometriaDisponible, bloqueoActivado, guardarBloqueo } from '../seguridad';
import { useTema, Tema, IconoNombre, formatoEuro } from '../tema';
import { cambiarPreferencias, usePreferencias, ModoTema, TamanoTexto } from '../accesibilidad';
import type { Session } from '@supabase/supabase-js';

function Fila({
  tema,
  icono,
  titulo,
  detalle,
  color,
  onPress,
  ultimo,
  derecha,
}: {
  tema: Tema;
  icono: IconoNombre;
  titulo: string;
  detalle?: string;
  color?: string;
  onPress?: () => void;
  ultimo?: boolean;
  derecha?: React.ReactNode;
}) {
  const c = color ?? tema.primario;
  return (
    <TouchableOpacity accessibilityRole="button"
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.fila, !ultimo && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tema.borde }]}
    >
      <View style={[styles.icono, { backgroundColor: c + '22' }]}>
        <Ionicons name={icono} size={19} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: color ?? tema.texto, fontSize: 16, fontWeight: '600' }}>{titulo}</Text>
        {detalle ? <Text style={{ color: tema.textoSuave, fontSize: 12, marginTop: 2 }}>{detalle}</Text> : null}
      </View>
      {derecha ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={tema.textoSuave} /> : null)}
    </TouchableOpacity>
  );
}

function Segmentos<T extends string>({
  tema,
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  tema: Tema;
  etiqueta: string;
  valor: T;
  opciones: { valor: T; texto: string }[];
  onCambio: (v: T) => void;
}) {
  return (
    <View style={{ padding: 14, gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '600' }}>{etiqueta}</Text>
      <View style={{ flexDirection: 'row', backgroundColor: tema.tarjetaSuave, borderRadius: 14, padding: 4 }}>
        {opciones.map((o) => {
          const activa = o.valor === valor;
          return (
            <TouchableOpacity
              key={o.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa, checked: activa }}
              accessibilityLabel={`${etiqueta}: ${o.texto}`}
              onPress={() => onCambio(o.valor)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activa ? tema.primario : 'transparent',
              }}
            >
              <Text style={{ color: activa ? tema.primarioTexto : tema.texto, fontWeight: '700', fontSize: 13 }}>{o.texto}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MasScreen() {
  const tema = useTema();
  const prefs = usePreferencias();
  const router = useRouter();
  const [numGastos, setNumGastos] = useState(0);
  const [cuentas, setCuentas] = useState({ reglas: 0, metas: 0, recurrentes: 0 });
  const [cargando, setCargando] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [bloqueo, setBloqueo] = useState(bloqueoActivado());
  const [avisos, setAvisos] = useState(avisosActivados());
  const [fondosAbierto, setFondosAbierto] = useState(false);
  const [fondosTexto, setFondosTexto] = useState(() => fondosATexto(getFondosIniciales()));
  const [fondosTotal, setFondosTotal] = useState(() => sumaFondos(getFondosIniciales()));

  const abrirFondos = () => {
    setFondosTexto(fondosATexto(getFondosIniciales()));
    setFondosAbierto(true);
  };

  const guardarFondos = () => {
    const f = textoAFondos(fondosTexto);
    setFondosIniciales(f);
    setFondosTotal(sumaFondos(f));
    subirPerfil().catch(() => {});
    toque();
    setFondosAbierto(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNumGastos(contarGastos());
      setCuentas({ reglas: getReglas().length, metas: getMetas().length, recurrentes: getRecurrentes().length });
    }, [])
  );

  const cambiarBloqueo = async (on: boolean) => {
    if (on) {
      if (!(await biometriaDisponible())) {
        Alert.alert('No disponible', 'Configura Face ID, huella o un código de bloqueo en tu móvil para poder activarlo.');
        return;
      }
      if (!(await autenticar('Confirma para activar el bloqueo'))) return;
    }
    guardarBloqueo(on);
    setBloqueo(on);
  };

  const cambiarAvisos = async (on: boolean) => {
    if (on && !(await pedirPermisoAvisos())) {
      Alert.alert('Permiso denegado', 'Activa las notificaciones de Balanz en los ajustes del móvil.');
      return;
    }
    activarAvisos(on);
    setAvisos(on);
  };

  const confirmarBorrado = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Esto elimina tus movimientos (también en la nube), metas, recurrentes y ajustes de este móvil. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await borrarTodosLosGastosDeLaNube();
              borrarTodosLosDatos();
              setNumGastos(0);
              setCuentas({ reglas: 0, metas: 0, recurrentes: 0 });
              setBloqueo(false);
            } catch (e) {
              Alert.alert('Error', 'No se pudieron borrar los datos de la nube. Comprueba tu conexión.');
            }
          },
        },
      ]
    );
  };

  const exportar = async () => {
    setCargando(true);
    try {
      await exportarGastosAExcel();
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar el archivo.');
    } finally {
      setCargando(false);
    }
  };

  const importar = async () => {
    setCargando(true);
    try {
      const { importados, duplicados, dineroInicial } = await importarGastosDesdeExcel();
      setNumGastos(contarGastos());
      Alert.alert('Importación completada', `Importados: ${importados}\nDuplicados omitidos: ${duplicados}${dineroInicial ? `\nDinero inicial fijado en ${formatoEuro(dineroInicial)}` : ''}`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo importar el archivo.');
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Error al cerrar sesión', error.message);
        },
      },
    ]);
  };

  const inicial = (session?.user.email ?? '?').charAt(0).toUpperCase();

  return (
    <ScrollView style={{ backgroundColor: tema.fondo }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.titulo, { color: tema.texto }]}>Más</Text>

      <View style={[styles.perfil, { backgroundColor: tema.tarjeta }]}>
        <View style={[styles.avatar, { backgroundColor: tema.primario }]}>
          <Text style={{ color: tema.primarioTexto, fontSize: 22, fontWeight: '800' }}>{inicial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
            {session?.user.email}
          </Text>
          <Text style={{ color: tema.textoSuave, fontSize: 13 }}>{numGastos} movimientos guardados</Text>
        </View>
      </View>

      <Text style={[styles.seccion, { color: tema.textoSuave }]}>HERRAMIENTAS</Text>
      <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
        <Fila tema={tema} icono="cash-outline" titulo="Dinero inicial" detalle={fondosTotal > 0 ? `Empezaste con ${formatoEuro(fondosTotal)}` : 'Indica con cuánto dinero empiezas'} onPress={abrirFondos} />
        <Fila tema={tema} icono="repeat-outline" titulo="Recurrentes" detalle={`${cuentas.recurrentes} programados · suscripciones detectadas`} onPress={() => router.push('/recurrentes')} />
        <Fila tema={tema} icono="flag-outline" titulo="Metas de ahorro" detalle={`${cuentas.metas} metas`} onPress={() => router.push('/metas')} />
        <Fila tema={tema} icono="people-outline" titulo="Gastos compartidos" detalle="Quién te debe" onPress={() => router.push('/compartidos')} />
        <Fila tema={tema} icono="document-text-outline" titulo="Informe mensual" detalle="Comparativa y PDF" onPress={() => router.push('/informe')} />
        <Fila tema={tema} icono="sparkles-outline" titulo="Categorías aprendidas" detalle={`${cuentas.reglas} comercios recordados`} onPress={() => router.push('/reglas')} ultimo />
      </View>

      <Text style={[styles.seccion, { color: tema.textoSuave }]}>CAPTURA AUTOMÁTICA</Text>
      <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
        <Fila
          tema={tema}
          icono="flash-outline"
          titulo="Atajos, SMS y acceso rápido"
          detalle="Apple Pay, SMS del banco, Centro de Control"
          onPress={() => router.push('/atajos')}
          ultimo
        />
      </View>

      <Text style={[styles.seccion, { color: tema.textoSuave }]}>ACCESIBILIDAD</Text>
      <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
        <Segmentos<TamanoTexto>
          tema={tema}
          etiqueta="Tamaño de letra"
          valor={prefs.tamanoTexto}
          opciones={[
            { valor: 'normal', texto: 'Normal' },
            { valor: 'grande', texto: 'Grande' },
            { valor: 'muygrande', texto: 'Muy grande' },
          ]}
          onCambio={(v) => cambiarPreferencias({ tamanoTexto: v })}
        />
        <Segmentos<ModoTema>
          tema={tema}
          etiqueta="Apariencia"
          valor={prefs.tema}
          opciones={[
            { valor: 'sistema', texto: 'Sistema' },
            { valor: 'claro', texto: 'Claro' },
            { valor: 'oscuro', texto: 'Oscuro' },
          ]}
          onCambio={(v) => cambiarPreferencias({ tema: v })}
        />
        <Fila
          tema={tema}
          icono="contrast-outline"
          titulo="Alto contraste"
          detalle="Colores y bordes más marcados"
          derecha={<Switch accessibilityLabel="Alto contraste" value={prefs.altoContraste} onValueChange={(v) => cambiarPreferencias({ altoContraste: v })} trackColor={{ true: tema.primario }} />}
        />
        <Fila
          tema={tema}
          icono="speedometer-outline"
          titulo="Reducir animaciones"
          detalle="Las ventanas aparecen sin deslizarse"
          derecha={<Switch accessibilityLabel="Reducir animaciones" value={prefs.reducirMovimiento} onValueChange={(v) => cambiarPreferencias({ reducirMovimiento: v })} trackColor={{ true: tema.primario }} />}
          ultimo
        />
      </View>

      <Text style={[styles.seccion, { color: tema.textoSuave }]}>SEGURIDAD Y AVISOS</Text>
      <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
        <Fila
          tema={tema}
          icono="finger-print-outline"
          titulo="Bloqueo con Face ID / huella"
          detalle="Se pide al abrir la app"
          derecha={<Switch accessibilityLabel="Bloqueo con Face ID o huella" value={bloqueo} onValueChange={cambiarBloqueo} trackColor={{ true: tema.primario }} />}
        />
        <Fila
          tema={tema}
          icono="notifications-outline"
          titulo="Notificaciones"
          detalle="Pagos detectados y avisos de presupuesto"
          derecha={<Switch accessibilityLabel="Notificaciones" value={avisos} onValueChange={cambiarAvisos} trackColor={{ true: tema.primario }} />}
          ultimo
        />
      </View>

      <Text style={[styles.seccion, { color: tema.textoSuave }]}>DATOS</Text>
      <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
        {cargando ? (
          <ActivityIndicator style={{ padding: 20 }} color={tema.primario} />
        ) : (
          <>
            <Fila tema={tema} icono="download-outline" titulo="Exportar a Excel" onPress={exportar} />
            <Fila tema={tema} icono="push-outline" titulo="Importar desde Excel" onPress={importar} ultimo />
          </>
        )}
      </View>

      <Text style={[styles.seccion, { color: tema.textoSuave }]}>CUENTA</Text>
      <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
        <Fila tema={tema} icono="log-out-outline" titulo="Cerrar sesión" color={tema.peligro} onPress={cerrarSesion} />
        <Fila tema={tema} icono="trash-outline" titulo="Borrar todos los datos" color={tema.peligro} onPress={confirmarBorrado} ultimo />
      </View>

      <Text style={[styles.version, { color: tema.textoSuave }]}>Balanz · versión 1.1.0</Text>
      <Modal visible={fondosAbierto} transparent animationType={prefs.reducirMovimiento ? 'none' : 'slide'} onRequestClose={() => setFondosAbierto(false)}>
        <KeyboardAvoidingView style={styles.modalFondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" style={{ flex: 1 }} activeOpacity={1} onPress={() => setFondosAbierto(false)} />
          <View style={[styles.hoja, { backgroundColor: tema.fondo }]}>
            <Text style={{ color: tema.texto, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>Dinero inicial</Text>
            <Text style={{ color: tema.textoSuave, fontSize: 13, marginTop: -6 }}>
              Lo que tenías al empezar a usar Balanz. Tu saldo se calcula a partir de esto, más tus ingresos y menos tus gastos.
            </Text>
            <FondosForm valores={fondosTexto} onCambio={(c, v) => setFondosTexto({ ...fondosTexto, [c]: v })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Presionable contenedor={{ flex: 1 }} style={[styles.botonHoja, { backgroundColor: tema.tarjetaSuave }]} onPress={() => setFondosAbierto(false)}>
                <Text style={{ color: tema.texto, fontWeight: '700', fontSize: 16 }}>Cancelar</Text>
              </Presionable>
              <Presionable contenedor={{ flex: 2 }} style={[styles.botonHoja, { backgroundColor: tema.primario }]} onPress={guardarFondos}>
                <Text style={{ color: tema.primarioTexto, fontWeight: '800', fontSize: 16 }}>Guardar</Text>
              </Presionable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { padding: 20, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 14 },
  botonHoja: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  container: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  titulo: { fontSize: 32, fontWeight: '800', marginBottom: 6 },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  seccion: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 14, marginLeft: 6 },
  grupo: { borderRadius: 22, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icono: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  version: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
