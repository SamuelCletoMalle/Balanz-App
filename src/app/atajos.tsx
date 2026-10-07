/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useState } from 'react';
import { arriba } from '../layout';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Text } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { obtenerTokenCaptacion, sincronizarCaptaciones } from '../sync';
import { useTema, Tema, IconoNombre } from '../tema';
import { Escalonado } from '../components/ui';

const RPC = `${supabaseUrl}/rest/v1/rpc`;

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
      <Text style={{ flex: 1, color: tema.texto, fontSize: 14, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

/** Cabecera de cada bloque: icono, título y una frase que explica qué consigues. */
function Encabezado({ tema, icono, titulo, queHace, tiempo }: { tema: Tema; icono: IconoNombre; titulo: string; queHace: string; tiempo?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.iconoCabecera, { backgroundColor: tema.primario + '22' }]}>
          <Ionicons name={icono} size={22} color={tema.primario} />
        </View>
        <Text style={[styles.subtitulo, { color: tema.texto, flex: 1 }]}>{titulo}</Text>
      </View>
      <Text style={{ color: tema.textoSuave, fontSize: 14, lineHeight: 21 }}>{queHace}</Text>
      {tiempo ? (
        <View style={[styles.etiquetaTiempo, { backgroundColor: tema.tarjetaSuave }]}>
          <Ionicons name="time-outline" size={14} color={tema.textoSuave} />
          <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '600' }}>{tiempo}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Consejo({ tema, children }: { tema: Tema; children: React.ReactNode }) {
  return (
    <View style={[styles.consejo, { backgroundColor: tema.tarjetaSuave }]}>
      <Ionicons name="bulb-outline" size={18} color={tema.aviso} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: tema.texto, fontSize: 13, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

export default function AtajosScreen() {
  const tema = useTema();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [errorToken, setErrorToken] = useState('');
  const [probando, setProbando] = useState(false);
  // Pendientes: confirmas cada pago · Directo: se apunta solo y la app lo recoge al abrirse.
  const [directo, setDirecto] = useState(false);

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

  const url = `${RPC}/${directo ? 'registrar_movimiento' : 'registrar_captacion'}`;
  const iphone = Platform.OS !== 'android';

  // Los pasos del atajo son los mismos para Apple Pay, SMS y el botón del panel de control.
  const pasosEnvio = (
    <>
      <Paso tema={tema} n={1}>
        En la app <Text style={styles.b}>Atajos</Text> añade la acción <Text style={styles.b}>Obtener contenido de URL</Text> (búscala escribiendo “contenido” o “URL”). En el campo de la dirección pega la <Text style={styles.b}>URL</Text> de arriba.
      </Paso>
      <Paso tema={tema} n={2}>
        Pulsa <Text style={styles.b}>Mostrar más</Text> y cambia el método de GET a <Text style={styles.b}>POST</Text>.
      </Paso>
      <Paso tema={tema} n={3}>
        En <Text style={styles.b}>Encabezados</Text> pulsa “Añadir nuevo encabezado” dos veces: <Text style={styles.b}>apikey</Text> con la clave de arriba, y <Text style={styles.b}>Content-Type</Text> con <Text style={styles.b}>application/json</Text>.
      </Paso>
      <Paso tema={tema} n={4}>
        En <Text style={styles.b}>Solicitar cuerpo</Text> elige <Text style={styles.b}>JSON</Text>. Pulsa “Añadir nuevo campo” → <Text style={styles.b}>Texto</Text>: en la clave escribe <Text style={styles.b}>p_token</Text> y en el valor pega tu código personal.
      </Paso>
      <Paso tema={tema} n={5}>
        Añade otro campo de tipo <Text style={styles.b}>Texto</Text> con la clave <Text style={styles.b}>p_texto</Text>. Lo que vaya en su valor depende de para qué lo uses (mira abajo).
      </Paso>
    </>
  );

  return (
    <ScrollView
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
<Escalonado>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: tema.texto }]}>Captura automática</Text>
      <Text style={{ color: tema.textoSuave, fontSize: 15, lineHeight: 22 }}>
        Haz que Balanz apunte tus pagos <Text style={styles.b}>sin que tengas que escribirlos</Text>. Hay tres formas, y no hace falta usar todas:
      </Text>

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <View style={styles.resumenFila}>
          <Ionicons name="card-outline" size={22} color={tema.primario} />
          <Text style={{ flex: 1, color: tema.texto, fontSize: 14, lineHeight: 20 }}>
            <Text style={styles.b}>Pagos con la tarjeta del móvil.</Text> Pagas con Apple Pay y el gasto se manda solo.
          </Text>
        </View>
        <View style={styles.resumenFila}>
          <Ionicons name="flash-outline" size={22} color={tema.primario} />
          <Text style={{ flex: 1, color: tema.texto, fontSize: 14, lineHeight: 20 }}>
            <Text style={styles.b}>Botón en el panel de control.</Text> Deslizas, tocas, escribes “Café 3,50” y listo.
          </Text>
        </View>
        <View style={styles.resumenFila}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={tema.primario} />
          <Text style={{ flex: 1, color: tema.texto, fontSize: 14, lineHeight: 20 }}>
            <Text style={styles.b}>SMS del banco.</Text> Cuando tu banco te avisa de un pago o de dinero recibido.
          </Text>
        </View>
      </View>

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
            <Encabezado
              tema={tema}
              icono="key-outline"
              titulo="Paso 0 · Tus datos"
              queHace="Los vas a necesitar al crear cualquiera de los atajos de abajo. Toca cada uno para copiarlo y pégalo en Atajos."
            />
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>¿QUÉ PASA CON CADA PAGO?</Text>
            <View style={{ flexDirection: 'row', backgroundColor: tema.tarjetaSuave, borderRadius: 14, padding: 4 }}>
              {[
                { v: false, t: 'Lo confirmo yo', d: 'Aparece en Pendientes' },
                { v: true, t: 'Que se apunte solo', d: 'Directo a movimientos' },
              ].map((o) => (
                <TouchableOpacity
                  key={o.t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: directo === o.v }}
                  onPress={() => setDirecto(o.v)}
                  style={[styles.opcion, directo === o.v ? { backgroundColor: tema.primario } : null]}
                >
                  <Text style={{ color: directo === o.v ? tema.primarioTexto : tema.texto, fontWeight: '700', fontSize: 13 }}>{o.t}</Text>
                  <Text style={{ color: directo === o.v ? tema.primarioTexto : tema.textoSuave, fontSize: 11 }}>{o.d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: tema.textoSuave, fontSize: 12, lineHeight: 18 }}>
              {directo
                ? 'El gasto entra directo en tus movimientos y lo verás al abrir la app. Si Balanz no entiende el importe, lo deja en Pendientes para que lo revises.'
                : 'Cada pago espera en Pendientes y lo aceptas con un toque, por si hay que corregir algo. Es lo más seguro para empezar.'}
            </Text>
            <Copiable tema={tema} etiqueta="1 · URL (cambia según lo que has elegido)" valor={url} />
            <Copiable tema={tema} etiqueta="2 · Clave (apikey)" valor={supabaseAnonKey} oculto />
            <Copiable tema={tema} etiqueta="3 · Tu código personal (no lo compartas)" valor={token} oculto />
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
            <Text style={{ color: tema.textoSuave, fontSize: 12, lineHeight: 18 }}>
              La prueba crea un gasto de ejemplo en Pendientes. Si aparece, tu código y la conexión funcionan.
            </Text>
          </View>

          {iphone ? (
            <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
              <Encabezado
                tema={tema}
                icono="card-outline"
                titulo="Pagos con la tarjeta del móvil (iPhone)"
                queHace="Cada vez que pagues con Apple Pay, el comercio y el importe se mandan solos a Balanz. No tienes que acordarte de apuntar nada."
                tiempo="Se prepara una sola vez · unos 10 minutos"
              />
              <Text style={[styles.seccion, { color: tema.textoSuave }]}>A · CREAR LA AUTOMATIZACIÓN</Text>
              <Paso tema={tema} n={1}>
                Abre la app <Text style={styles.b}>Atajos</Text> → pestaña <Text style={styles.b}>Automatización</Text> → botón <Text style={styles.b}>+</Text> → elige <Text style={styles.b}>Transacción</Text>.
              </Paso>
              <Paso tema={tema} n={2}>
                Elige tus tarjetas y marca <Text style={styles.b}>Ejecutar inmediatamente</Text>. Pulsa Siguiente y crea una acción nueva.
              </Paso>
              <Text style={[styles.seccion, { color: tema.textoSuave }]}>B · QUE ENVÍE EL PAGO A BALANZ</Text>
              {pasosEnvio}
              <Paso tema={tema} n={6}>
                En el valor de <Text style={styles.b}>p_texto</Text>: escribe <Text style={styles.b}>Comercio: </Text>, toca el campo y elige la variable <Text style={styles.b}>Comercio</Text>; después escribe <Text style={styles.b}> Importe: </Text> y elige la variable <Text style={styles.b}>Importe</Text>. Quedará algo así: <Text style={styles.b}>Comercio: [Comercio] Importe: [Importe]</Text>.
              </Paso>
              <Paso tema={tema} n={7}>
                Pulsa <Text style={styles.b}>Hecho</Text>. La próxima vez que pagues con el móvil, el gasto llegará solo.
              </Paso>
              <Consejo tema={tema}>
                <Text style={styles.b}>Para que te avise:</Text> al final añade la acción <Text style={styles.b}>Mostrar notificación</Text> y, como texto, elige <Text style={styles.b}>Contenido de URL</Text>. Con la opción “Que se apunte solo” verás, por ejemplo, “Gasto 12.50 € · Mercadona”.
              </Consejo>
            </View>
          ) : null}

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Encabezado
              tema={tema}
              icono="flash-outline"
              titulo="Botón en el panel de control"
              queHace="El panel de control es el que sale al deslizar el dedo desde arriba a la derecha (Wi-Fi, volumen, modo avión…). Tendrás ahí un botón: lo tocas, te pregunta qué has gastado, escribes “Café 3,50” y se apunta."
              tiempo="Se prepara una sola vez · unos 10 minutos"
            />
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>A · CREAR EL ATAJO “AÑADIR GASTO”</Text>
            <Paso tema={tema} n={1}>
              En <Text style={styles.b}>Atajos</Text> pulsa <Text style={styles.b}>+</Text> y ponle de nombre <Text style={styles.b}>Añadir gasto</Text>.
            </Paso>
            {pasosEnvio}
            <Paso tema={tema} n={6}>
              Toca el valor de <Text style={styles.b}>p_texto</Text> (déjalo vacío) y, en la barra que aparece sobre el teclado, elige <Text style={styles.b}>Preguntar cada vez</Text>. Así el atajo te pedirá el texto cada vez que lo uses.
            </Paso>
            <Paso tema={tema} n={7}>
              Pulsa <Text style={styles.b}>Hecho</Text>. Pruébalo una vez desde la app Atajos: escribe <Text style={styles.b}>Café 3,50</Text> y mira que aparezca en Balanz.
            </Paso>

            <Text style={[styles.seccion, { color: tema.textoSuave }]}>B · PONERLO EN EL PANEL DE CONTROL</Text>
            <Paso tema={tema} n={1}>
              Desliza desde la esquina <Text style={styles.b}>superior derecha</Text> para abrir el panel de control.
            </Paso>
            <Paso tema={tema} n={2}>
              Pulsa el botón <Text style={styles.b}>+</Text> de arriba a la izquierda → <Text style={styles.b}>Añadir un control</Text>.
            </Paso>
            <Paso tema={tema} n={3}>
              Busca la sección <Text style={styles.b}>Atajos</Text> (o escribe “atajos” en el buscador) y elige <Text style={styles.b}>Añadir gasto</Text>. Suelta el botón donde quieras y pulsa <Text style={styles.b}>OK</Text>.
            </Paso>
            <Consejo tema={tema}>
              Esto necesita <Text style={styles.b}>iOS 18 o superior</Text>. Con un iPhone más antiguo, mantén pulsado el atajo en la app Atajos → Compartir → <Text style={styles.b}>Añadir a pantalla de inicio</Text>, o dile a Siri “añadir gasto”.
            </Consejo>
            <Consejo tema={tema}>
              En un <Text style={styles.b}>iPhone 15 Pro o posterior</Text> también puedes asignarlo al botón de acción: Ajustes → Botón de acción → Atajo.
            </Consejo>

            <Text style={[styles.seccion, { color: tema.textoSuave }]}>C · CÓMO USARLO CADA DÍA</Text>
            <Paso tema={tema} n={1}>
              Desliza → toca el botón → escribe el gasto con el importe: <Text style={styles.b}>Café 3,50</Text> o <Text style={styles.b}>Gasolina 40</Text>.
            </Paso>
            <Paso tema={tema} n={2}>
              Para un ingreso, empieza por “Ingreso”: <Text style={styles.b}>Ingreso 20 Abuela</Text>. También sirven <Text style={styles.b}>nómina</Text> o <Text style={styles.b}>abono</Text>.
            </Paso>
          </View>

          {iphone ? (
            <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
              <Encabezado
                tema={tema}
                icono="chatbubble-ellipses-outline"
                titulo="SMS del banco (iPhone)"
                queHace="Si tu banco te manda un SMS cada vez que pagas o recibes dinero, Balanz lo lee y lo apunta."
              />
              <Paso tema={tema} n={1}>
                En <Text style={styles.b}>Atajos</Text> → <Text style={styles.b}>Automatización</Text> → <Text style={styles.b}>+</Text> → <Text style={styles.b}>Mensaje</Text>.
              </Paso>
              <Paso tema={tema} n={2}>
                En <Text style={styles.b}>Remitente</Text> elige el número de tu banco, o usa “El mensaje contiene” con una palabra como “compra”. Marca <Text style={styles.b}>Ejecutar inmediatamente</Text>.
              </Paso>
              {pasosEnvio}
              <Paso tema={tema} n={6}>
                En el valor de <Text style={styles.b}>p_texto</Text> elige la variable <Text style={styles.b}>Entrada del atajo</Text> (el texto del mensaje). Balanz saca solo el importe y el comercio.
              </Paso>
            </View>
          ) : null}

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Encabezado
              tema={tema}
              icono="logo-android"
              titulo="Android"
              queHace="Android no tiene Atajos, pero las apps MacroDroid o Tasker hacen lo mismo con las notificaciones del banco y con un botón en los ajustes rápidos."
            />
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>NOTIFICACIONES DEL BANCO</Text>
            <Paso tema={tema} n={1}>
              Instala <Text style={styles.b}>MacroDroid</Text> y concédele acceso a las notificaciones.
            </Paso>
            <Paso tema={tema} n={2}>
              Disparador: “Notificación recibida” de la app de tu banco.
            </Paso>
            <Paso tema={tema} n={3}>
              Acción: petición <Text style={styles.b}>HTTP POST</Text> a la URL de arriba, con la cabecera <Text style={styles.b}>apikey</Text> y un cuerpo JSON con <Text style={styles.b}>p_token</Text> y <Text style={styles.b}>p_texto</Text> (el texto de la notificación).
            </Paso>
            <Text style={[styles.seccion, { color: tema.textoSuave }]}>BOTÓN EN LOS AJUSTES RÁPIDOS</Text>
            <Paso tema={tema} n={1}>
              En MacroDroid crea una macro con un botón en los ajustes rápidos que pida un texto y haga la misma petición.
            </Paso>
          </View>

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Encabezado
              tema={tema}
              icono="help-buoy-outline"
              titulo="Si algo no funciona"
              queHace="Los atajos no avisan cuando algo falla, así que revisa esto:"
            />
            <Paso tema={tema} n={1}>
              <Text style={styles.b}>No llega nada.</Text> Abre Balanz y entra en Pendientes: los avisos se recogen al abrir la app.
            </Paso>
            <Paso tema={tema} n={2}>
              <Text style={styles.b}>Ver qué responde el servidor.</Text> Al final del atajo añade la acción <Text style={styles.b}>Mostrar resultado</Text> con el <Text style={styles.b}>Contenido de URL</Text>. Si dice “token invalido”, el código está mal copiado; si dice “Invalid API key”, falla la clave.
            </Paso>
            <Paso tema={tema} n={3}>
              <Text style={styles.b}>Copiar mal es lo más típico.</Text> Vuelve a copiar la URL, la clave y el código con los botones de arriba, sin espacios al principio ni al final.
            </Paso>
            <Paso tema={tema} n={4}>
              Usa <Text style={styles.b}>Enviar un pago de prueba</Text>: si ese llega a Pendientes, el fallo está en el atajo y no en Balanz.
            </Paso>
          </View>

          <Text style={{ color: tema.textoSuave, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: 10 }}>
            El código solo permite añadir avisos a tu bandeja; no da acceso a tus gastos. No lo compartas: si crees que se ha
            filtrado, bórralo en Supabase (tabla captacion_tokens) y se generará otro.
          </Text>
        </>
      )}
    </Escalonado>
</ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: arriba(56), paddingHorizontal: 16, paddingBottom: 50, gap: 14 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  titulo: { fontSize: 30, fontWeight: '800' },
  tarjeta: { borderRadius: 22, padding: 16, gap: 12 },
  seccion: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  subtitulo: { fontSize: 17, fontWeight: '800' },
  copiable: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  boton: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  numero: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  b: { fontWeight: '700' },
  resumenFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconoCabecera: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  etiquetaTiempo: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  consejo: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14 },
  opcion: { flex: 1, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center', gap: 1 },
});
