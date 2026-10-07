/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Children, ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Presionable from './Presionable';
import { Text } from './Texto';
import { usePreferencias } from '../accesibilidad';
import { toque } from '../haptics';
import { IconoNombre, RADIO, SOMBRA, useTema } from '../tema';
import { CURVAS } from '../logo';
import { useDisposicion } from '../layout';

const SALIDA = Easing.bezier(...CURVAS.salida);

/** Movimiento reducido: la preferencia de la app o la del sistema. */
export function useQuieto(): boolean {
  const sistema = useReducedMotion();
  const { reducirMovimiento } = usePreferencias();
  return sistema || reducirMovimiento;
}

/** Tarjeta base: superficie de nivel 1, radio grande, borde fino y sombra suave solo en claro. */
export function Tarjeta({ children, style, nivel = 1 }: { children: ReactNode; style?: StyleProp<ViewStyle>; nivel?: 1 | 2 | 3 }) {
  const tema = useTema();
  const fondo = nivel === 1 ? tema.tarjeta : nivel === 2 ? tema.tarjetaSuave : tema.elevada;
  return (
    <View style={[styles.tarjeta, { backgroundColor: fondo, borderColor: tema.borde }, !tema.oscuro && nivel === 1 ? SOMBRA.s : null, style]}>
      {children}
    </View>
  );
}

type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';

/**
 * Botón de la marca. `cargando` enseña una rueda y `exito` un check que aparece con un pequeño rebote.
 * Siempre tiene como mínimo 52 pt de alto (objetivo táctil cómodo con una mano).
 */
export function Boton({
  texto,
  onPress,
  variante = 'primario',
  icono,
  cargando,
  exito,
  deshabilitado,
  contenedor,
}: {
  texto: string;
  onPress: () => void;
  variante?: VarianteBoton;
  icono?: IconoNombre;
  cargando?: boolean;
  exito?: boolean;
  deshabilitado?: boolean;
  contenedor?: StyleProp<ViewStyle>;
}) {
  const tema = useTema();
  const quieto = useQuieto();
  const colores = {
    primario: { fondo: tema.primario, texto: tema.primarioTexto, borde: 'transparent' },
    secundario: { fondo: tema.tarjetaSuave, texto: tema.texto, borde: tema.borde },
    fantasma: { fondo: 'transparent', texto: tema.texto, borde: 'transparent' },
    peligro: { fondo: tema.peligro, texto: '#ffffff', borde: 'transparent' },
  }[variante];
  const inactivo = deshabilitado || cargando;
  return (
    <Presionable
      accessibilityLabel={texto}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      contenedor={contenedor}
      onPress={() => {
        toque();
        onPress();
      }}
      style={[styles.boton, { backgroundColor: colores.fondo, borderColor: colores.borde, opacity: deshabilitado ? 0.45 : 1 }]}
    >
      {cargando ? (
        <ActivityIndicator color={colores.texto} />
      ) : exito ? (
        <Animated.View entering={quieto ? undefined : ZoomIn.springify().damping(12)}>
          <Ionicons name="checkmark-circle" size={22} color={colores.texto} />
        </Animated.View>
      ) : (
        <>
          {icono ? <Ionicons name={icono} size={20} color={colores.texto} /> : null}
          <Text style={{ color: colores.texto, fontSize: 16, fontWeight: '700' }}>{texto}</Text>
        </>
      )}
    </Presionable>
  );
}

/** Filtro o etiqueta seleccionable. El color de fondo cambia con una transición corta. */
export function Chip({
  texto,
  icono,
  activo,
  color,
  onPress,
}: {
  texto: string;
  icono?: IconoNombre;
  activo?: boolean;
  /** Color propio cuando está activo (las categorías); por defecto, el primario. */
  color?: string;
  onPress: () => void;
}) {
  const tema = useTema();
  const fondo = activo ? (color ?? tema.primario) : tema.tarjeta;
  const tinta = activo ? (color ? '#ffffff' : tema.primarioTexto) : tema.texto;
  return (
    <Presionable
      accessibilityLabel={texto}
      accessibilityState={{ selected: !!activo }}
      onPress={() => {
        toque();
        onPress();
      }}
      animar={['backgroundColor', 'borderColor']}
      contenedor={{ marginRight: 8 }}
      style={[styles.chip, { backgroundColor: fondo, borderColor: activo ? 'transparent' : tema.borde }]}
    >
      {icono ? <Ionicons name={icono} size={15} color={activo ? tinta : (color ?? tema.textoSuave)} /> : null}
      <Text style={{ color: tinta, fontSize: 13, fontWeight: '600' }}>{texto}</Text>
    </Presionable>
  );
}

/** Interruptor con el pulgar deslizándose y el color del fondo cambiando a la vez. */
export function Interruptor({ valor, onChange, etiqueta }: { valor: boolean; onChange: (v: boolean) => void; etiqueta: string }) {
  const tema = useTema();
  const quieto = useQuieto();
  const transicion = quieto ? {} : { transitionProperty: ['backgroundColor', 'transform'], transitionDuration: 180, transitionTimingFunction: 'ease-out' };
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: valor }}
      hitSlop={10}
      onPress={() => {
        toque();
        onChange(!valor);
      }}
    >
      <Animated.View style={[styles.pista, { backgroundColor: valor ? tema.primario : tema.tarjetaSuave, borderColor: tema.borde }, transicion as ViewStyle]}>
        <Animated.View
          style={[
            styles.pulgar,
            { backgroundColor: valor ? tema.primarioTexto : tema.textoSuave, transform: [{ translateX: valor ? 20 : 0 }] },
            transicion as ViewStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Bloque gris con un brillo que va y viene mientras se cargan los datos. Quieto si se reduce el movimiento. */
export function Esqueleto({ ancho = '100%', alto = 16, radio = 8, style }: { ancho?: number | `${number}%`; alto?: number; radio?: number; style?: StyleProp<ViewStyle> }) {
  const tema = useTema();
  const quieto = useQuieto();
  const brillo = useSharedValue(0.55);
  useEffect(() => {
    if (quieto) return;
    brillo.set(withRepeat(withSequence(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), withTiming(0.55, { duration: 750, easing: Easing.inOut(Easing.quad) })), -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quieto]);
  const estilo = useAnimatedStyle(() => ({ opacity: quieto ? 0.8 : brillo.get() }));
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: ancho, height: alto, borderRadius: radio, backgroundColor: tema.tarjetaSuave }, estilo, style]} />;
}

/** Pantalla o lista sin datos: icono que flota despacio, un título claro y, si hay, una acción. */
export function EstadoVacio({ icono, titulo, texto, accion }: { icono: IconoNombre; titulo: string; texto?: string; accion?: { texto: string; onPress: () => void } }) {
  const tema = useTema();
  const quieto = useQuieto();
  const flota = useSharedValue(0);
  useEffect(() => {
    if (quieto) return;
    flota.set(withRepeat(withSequence(withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })), -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quieto]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: flota.get() }] }));
  return (
    <View style={styles.vacio}>
      <Animated.View style={[styles.vacioIcono, { backgroundColor: tema.tarjetaSuave }, estilo]}>
        <Ionicons name={icono} size={34} color={tema.textoSuave} />
      </Animated.View>
      <Text style={{ color: tema.texto, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>{titulo}</Text>
      {texto ? <Text style={{ color: tema.textoSuave, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{texto}</Text> : null}
      {accion ? <Boton texto={accion.texto} onPress={accion.onPress} variante="secundario" contenedor={{ alignSelf: 'stretch', marginTop: 6 }} /> : null}
    </View>
  );
}

/**
 * Cifra que rueda hasta su nuevo valor. Es el único sitio donde se anima con estado de React: son ~500 ms, una vez
 * al cambiar el saldo o un total, y con "reducir movimiento" salta directamente al valor final.
 */
export function useContador(objetivo: number, duracion = 550): number {
  const quieto = useQuieto();
  const [valor, setValor] = useState(objetivo);
  const actual = useRef(objetivo);
  useEffect(() => {
    if (quieto || actual.current === objetivo) {
      actual.current = objetivo;
      setValor(objetivo);
      return;
    }
    const desde = actual.current;
    const inicio = Date.now();
    let marco = 0;
    const paso = () => {
      const p = Math.min(1, (Date.now() - inicio) / duracion);
      const suave = 1 - Math.pow(1 - p, 3);
      const v = desde + (objetivo - desde) * suave;
      actual.current = v;
      setValor(v);
      if (p < 1) marco = requestAnimationFrame(paso);
      else actual.current = objetivo;
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [objetivo, duracion, quieto]);
  return valor;
}

/**
 * Hace que los hijos entren uno tras otro (fundido + subida corta, 45 ms entre cada uno). Se coloca dentro del
 * ScrollView de una pantalla; los hijos siguen siendo hijos directos del contenedor, así que el espaciado no cambia.
 * Solo anima los primeros 8: con listas largas el resto aparece ya colocado.
 */
export function Escalonado({ children, paso = 45 }: { children: ReactNode; paso?: number }) {
  const quieto = useQuieto();
  const { amplio } = useDisposicion();
  // En pantallas anchas la cuadrícula de CSS depende de los estilos de cada hijo directo: ahí se dejan tal cual.
  if (amplio) return <>{children}</>;
  return (
    <>
      {Children.toArray(children).map((hijo, i) => (
        <Animated.View key={i} entering={quieto || i > 7 ? undefined : FadeInDown.delay(i * paso).duration(320).easing(SALIDA)}>
          {hijo}
        </Animated.View>
      ))}
    </>
  );
}

/**
 * Al cambiar entre claro y oscuro (o a alto contraste) deja una capa con el color de fondo anterior que se desvanece,
 * en vez de un cambio de golpe. Se coloca una sola vez, por encima de la app y por debajo de la intro.
 */
export function DisolverTema({ fondo }: { fondo: string }) {
  const quieto = useQuieto();
  const anterior = useRef(fondo);
  const color = useSharedValue(fondo);
  const opacidad = useSharedValue(0);
  useEffect(() => {
    if (anterior.current === fondo) return;
    color.set(anterior.current);
    anterior.current = fondo;
    if (quieto) return;
    opacidad.set(1);
    opacidad.set(withTiming(0, { duration: 280, easing: SALIDA }));
  }, [fondo, quieto, color, opacidad]);
  const estilo = useAnimatedStyle(() => ({ backgroundColor: color.get(), opacity: opacidad.get() }));
  return <Animated.View pointerEvents="none" style={[styles.disolver, estilo]} />;
}

/**
 * Selector de vistas: una pastilla con tantas opciones como haga falta y un pulgar que se desliza hasta la elegida.
 * Sirve para repartir una pantalla larga en secciones sin sacar al usuario de ella.
 */
export function Segmentos<T extends string>({ opciones, valor, onChange }: { opciones: { id: T; texto: string }[]; valor: T; onChange: (v: T) => void }) {
  const tema = useTema();
  const quieto = useQuieto();
  const [ancho, setAncho] = useState(0);
  const indice = Math.max(0, opciones.findIndex((o) => o.id === valor));
  const hueco = ancho > 0 ? (ancho - 8) / opciones.length : 0;
  const x = useSharedValue(0);
  const colocado = useRef(false);
  useEffect(() => {
    if (hueco <= 0) return;
    const destino = indice * hueco;
    if (!colocado.current || quieto) x.set(destino);
    else x.set(withSpring(destino, { duration: 300, dampingRatio: 0.85 }));
    colocado.current = true;
  }, [indice, hueco, quieto, x]);
  const estiloPulgar = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], width: hueco }));
  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessibilityRole="tablist" style={[styles.segmentos, { backgroundColor: tema.tarjetaSuave }]}>
      {hueco > 0 ? <Animated.View pointerEvents="none" style={[styles.segmentoPulgar, { backgroundColor: tema.primario }, estiloPulgar]} /> : null}
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityLabel={o.texto}
            accessibilityState={{ selected: activo }}
            style={styles.segmento}
            onPress={() => {
              if (!activo) {
                toque();
                onChange(o.id);
              }
            }}
          >
            <Text style={{ color: activo ? tema.primarioTexto : tema.texto, fontSize: 14, fontWeight: activo ? '700' : '600' }} numberOfLines={1}>
              {o.texto}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Barra de progreso: se llena de izquierda a derecha al aparecer y cada vez que cambia el valor (0..1). */
export function Barra({ p, color, radio = 7 }: { p: number; color: string; radio?: number }) {
  const quieto = useQuieto();
  const valor = useSharedValue(quieto ? p : 0);
  useEffect(() => {
    const destino = Math.max(0, Math.min(1, p));
    valor.set(quieto ? destino : withTiming(destino, { duration: 700, easing: SALIDA }));
  }, [p, quieto, valor]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(valor.get(), 0.0001) }] }));
  return <Animated.View style={[{ width: '100%', height: '100%', borderRadius: radio, backgroundColor: color, transformOrigin: 'left center' }, estilo]} />;
}

const styles = StyleSheet.create({
  segmentos: { flexDirection: 'row', height: 46, borderRadius: 16, padding: 4 },
  segmentoPulgar: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12 },
  segmento: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disolver: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 14 },
  boton: { minHeight: 52, borderRadius: RADIO.boton, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: RADIO.chip, borderWidth: 1 },
  pista: { width: 52, height: 32, borderRadius: 16, borderWidth: 1, padding: 3, justifyContent: 'center' },
  pulgar: { width: 24, height: 24, borderRadius: 12 },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 28 },
  vacioIcono: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
