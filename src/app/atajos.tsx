/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Text } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { obtenerTokenCaptacion, sincronizarCaptaciones } from '../sync';
import { useTema, Tema } from '../tema';

const ENDPOINT = `${supabaseUrl}/rest/v1/rpc/registrar_captacion`;

function Copiable({ tema, etiqueta, valor, oculto }: { tema: Tema; etiqueta: string; valor: string; oculto?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    await Clipboard.setStringAsync(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };
  const visible = oculto ? `${valor.slice(0, 6)}••••••••••${valor.slice(-4)}` : valor;
  return (
    <TouchableOpacity accessibilityRole="button" onPress={copiar} accessibilityLabel={`Copiar ${etiqueta}`} activeOpacity={0.7} style={[styles.copiable, { backgroundColor: tema.tarjetaSuave }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tema.textoSuave, fontSize: 11, fontWeight: '700' }}>{etiqueta}</Text>
        <Text style={{ color: tema.texto, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
          {visible}
        </Text>
      </View>
      <Ionicons name={copiado ? 'checkmark-circle' : 'copy-outline'} size={20} color={copiado ? tema.exito : tema.primario} />
    </TouchableOpacity>
  );
}

function Paso({ tema, n, children }: { tema: Tema; n: number; children: React.ReactNode }) {
  return (
    <View style={styles.paso}>
      <View style={[styles.numero, { backgroundColor: tema.primario }]}>
        <Text style={{ color: tema.primarioTexto, fontWeight: '800', fontSize: 12 }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, color: tema.texto, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export default function AtajosScreen() {
  const tema = useTema();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [errorToken, setErrorToken] = useState('');
  const [probando, setProbando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      obtenerTokenCaptacion()
        .then((t) => activo && (setToken(t), setErrorToken('')))
        .catch(() =>
          activo &&
          setErrorToken('Falta crear las tablas en Supabase. Ejecuta el archivo supabase/captaciones.sql en el SQL Editor y vuelve aquí.')
        );
      return () => {
        activo = false;
      };
    }, [])
  );

  const probar = async () => {
    if (!token) return;
    setProbando(true);
    const { error } = await supabase.rpc('registrar_captacion', {
      p_token: token,
      p_texto: 'Compra de 12,50 € en MERCADONA con tu tarjeta *1234',
    });
    if (error) {
      setProbando(false);
      Alert.alert('No ha funcionado', error.message);
      return;
    }
    await sincronizarCaptaciones().catch(() => {});
    setProbando(false);
    Alert.alert('¡Funciona!', 'Se ha creado un gasto de prueba en Pendientes.', [
      { text: 'Ver pendientes', onPress: () => router.replace('/pendientes') },
    ]);
  };

  const cuerpo = token ? `{"p_token": "${token}", "p_texto": "<el texto del pago>"}` : '';

  return (
    <ScrollView
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: tema.texto }]}>Captura automática</Text>
      <Text style={{ color: tema.textoSuave, fontSize: 14, lineHeight: 20 }}>
        iOS no permite leer las notificaciones de otras apps, pero sí ejecutar un Atajo cuando pagas con Apple Pay o te
        llega un SMS del banco. Ese atajo envía el texto a Balanz y aparece en Pendientes.
      </Text>

      {errorToken ? (
        <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
          <Ionicons name="warning-outline" size={26} color={tema.aviso} />
          <Text style={{ color: tema.texto, fontSize: 14, lineHeight: 20 }}>{errorToken}</Text>
        </View>
      ) : !token ? (
        <ActivityIndicator color={tema.primario} style={{ margin: 30 }} />
      ) : (
        <>
          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>TUS DATOS (toca para copiar)</Text>
            <Copiable tema={tema} etiqueta="URL" valor={ENDPOINT} />
            <Copiable tema={tema} etiqueta="Cabecera apikey" valor={supabaseAnonKey} oculto />
            <Copiable tema={tema} etiqueta="Tu token personal (no lo compartas)" valor={token} oculto />
            <Copiable tema={tema} etiqueta="Cuerpo JSON de ejemplo" valor={cuerpo} />
            <TouchableOpacity accessibilityRole="button"
              style={[styles.boton, { backgroundColor: tema.primario, opacity: probando ? 0.6 : 1 }]}
              disabled={probando}
              onPress={probar}
            >
              {probando ? (
                <ActivityIndicator color={tema.primarioTexto} />
              ) : (
                <>
                  <Ionicons name="flask-outline" size={18} color={tema.primarioTexto} />
                  <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Enviar un pago de prueba</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {Platform.OS !== 'android' ? (
            <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
              <Text style={[styles.subtitulo, { color: tema.texto }]}>iPhone · Pagos con Apple Pay</Text>
              <Paso tema={tema} n={1}>Abre Atajos → pestaña Automatización → “+” → <Text style={styles.b}>Transacción</Text>.</Paso>
              <Paso tema={tema} n={2}>Elige tus tarjetas y marca <Text style={styles.b}>Ejecutar inmediatamente</Text>.</Paso>
              <Paso tema={tema} n={3}>Añade la acción <Text style={styles.b}>Obtener contenido de URL</Text> y pega la URL de arriba.</Paso>
              <Paso tema={tema} n={4}>Método <Text style={styles.b}>POST</Text>. Cabecera: <Text style={styles.b}>apikey</Text> con la clave de arriba.</Paso>
              <Paso tema={tema} n={5}>Cuerpo de la solicitud: <Text style={styles.b}>JSON</Text>. Añade <Text style={styles.b}>p_token</Text> (Texto) con tu token y <Text style={styles.b}>p_texto</Text> (Texto) con: “Comercio: ” + variable <Text style={styles.b}>Comercio</Text> + “ Importe: ” + variable <Text style={styles.b}>Importe</Text>.</Paso>
            </View>
          ) : null}

          {Platform.OS !== 'android' ? (
            <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
              <Text style={[styles.subtitulo, { color: tema.texto }]}>iPhone · SMS del banco</Text>
              <Paso tema={tema} n={1}>Automatización → “+” → <Text style={styles.b}>Mensaje</Text>.</Paso>
              <Paso tema={tema} n={2}>En “Remitente” elige el contacto/número de tu banco (o usa “Mensaje contiene” con una palabra como “compra”).</Paso>
              <Paso tema={tema} n={3}>Marca <Text style={styles.b}>Ejecutar inmediatamente</Text> y crea un atajo con la misma acción <Text style={styles.b}>Obtener contenido de URL</Text>.</Paso>
              <Paso tema={tema} n={4}>En <Text style={styles.b}>p_texto</Text> usa la variable <Text style={styles.b}>Entrada del atajo</Text> (el contenido del mensaje).</Paso>
            </View>
          ) : null}

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Text style={[styles.subtitulo, { color: tema.texto }]}>Añadir dinero desde el Centro de Control</Text>
            <Text style={{ color: tema.textoSuave, fontSize: 13, lineHeight: 18 }}>
              Un botón en el menú que se desliza (Wi‑Fi, volumen, modo avión…) para apuntar un gasto o ingreso al instante.
            </Text>
            <Copiable tema={tema} etiqueta="Enlace de la app (abre el formulario)" valor="balanz://nuevo" />
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>iPHONE (iOS 18 o superior)</Text>
            <Paso tema={tema} n={1}>Atajos → “+” → acción <Text style={styles.b}>Abrir URL</Text> → pega <Text style={styles.b}>balanz://nuevo</Text>. Ponle de nombre “Añadir gasto”.</Paso>
            <Paso tema={tema} n={2}>Desliza el Centro de Control → mantén pulsado un hueco → <Text style={styles.b}>Añadir un control</Text> → categoría <Text style={styles.b}>Atajos</Text> → elige “Añadir gasto”.</Paso>
            <Paso tema={tema} n={3}>También puedes asignarlo al <Text style={styles.b}>botón de acción</Text> (iPhone 15 Pro o posterior) o ponerlo en la pantalla de bloqueo.</Paso>
            <Paso tema={tema} n={4}>En iOS 17 o anterior: añade el atajo a la pantalla de inicio o dile “Oye Siri, añadir gasto”.</Paso>
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>VARIANTE SIN ABRIR LA APP</Text>
            <Paso tema={tema} n={1}>Atajos → “+” → <Text style={styles.b}>Obtener contenido de URL</Text>. Pon la URL, <Text style={styles.b}>Mostrar más</Text> → método <Text style={styles.b}>POST</Text>, cabeceras <Text style={styles.b}>apikey</Text> y <Text style={styles.b}>Content-Type: application/json</Text>.</Paso>
            <Paso tema={tema} n={2}><Text style={styles.b}>Solicitar cuerpo</Text> → <Text style={styles.b}>JSON</Text>. Añade un campo Texto <Text style={styles.b}>p_token</Text> con tu token y otro Texto <Text style={styles.b}>p_texto</Text>.</Paso>
            <Paso tema={tema} n={3}>Toca el valor de <Text style={styles.b}>p_texto</Text> y elige la variable <Text style={styles.b}>Preguntar cada vez</Text>. Al ejecutar el atajo te pedirá el texto: escribe, por ejemplo, “Café 3,50”.</Paso>
            <Paso tema={tema} n={4}>Para ingresos, haz una copia y escribe “Ingreso 20 Abuela”. Llega a Pendientes como ingreso.</Paso>
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>SIN CONFIRMAR EN PENDIENTES</Text>
            <Paso tema={tema} n={1}>En la URL cambia el final <Text style={styles.b}>registrar_captacion</Text> por <Text style={styles.b}>registrar_movimiento</Text>. El gasto o ingreso se apunta directamente (la app lo recoge la próxima vez que se abra).</Paso>
            <Paso tema={tema} n={2}>Si no entiende el importe, lo deja en Pendientes para que lo revises.</Paso>
            <Paso tema={tema} n={3}>Para avisarte: añade <Text style={styles.b}>Mostrar notificación</Text> y elige como texto el <Text style={styles.b}>Contenido de URL</Text>. Verás, por ejemplo, “Gasto 3.50 € · Café”.</Paso>
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>ANDROID</Text>
            <Paso tema={tema} n={1}>Mantén pulsado un hueco del panel de ajustes rápidos → lápiz → <Text style={styles.b}>MacroDroid</Text> o <Text style={styles.b}>Tasker</Text> te permiten crear un botón (tile).</Paso>
            <Paso tema={tema} n={2}>Acción del botón: “Abrir URL / enlace” con <Text style={styles.b}>balanz://nuevo</Text>.</Paso>
          </View>

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Text style={[styles.subtitulo, { color: tema.texto }]}>Android · notificaciones del banco</Text>
            <Paso tema={tema} n={1}>Instala <Text style={styles.b}>MacroDroid</Text> o <Text style={styles.b}>Tasker</Text> y concede acceso a notificaciones.</Paso>
            <Paso tema={tema} n={2}>Disparador: “Notificación recibida” de la app de tu banco.</Paso>
            <Paso tema={tema} n={3}>Acción: petición HTTP POST a la URL de arriba, con la cabecera apikey y el cuerpo JSON poniendo el texto de la notificación en <Text style={styles.b}>p_texto</Text>.</Paso>
          </View>

          <Text style={{ color: tema.textoSuave, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: 10 }}>
            El token solo permite añadir avisos a tu bandeja; no da acceso a tus gastos. Si crees que se ha filtrado,
            bórralo en Supabase (tabla captacion_tokens) y se generará otro.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 50, gap: 14 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  titulo: { fontSize: 30, fontWeight: '800' },
  tarjeta: { borderRadius: 22, padding: 16, gap: 12 },
  seccion: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  subtitulo: { fontSize: 17, fontWeight: '800' },
  copiable: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  boton: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  numero: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  b: { fontWeight: '700' },
});
