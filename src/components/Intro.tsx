/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Logo from './Logo';
import Halo from './Halo';
import { Text } from './Texto';
import { CURVAS } from '../logo';
import { usePreferencias } from '../accesibilidad';
import { useDisposicion, arriba } from '../layout';
import { marcarIntroLista } from '../intro-estado';

const SALIDA = Easing.bezier(...CURVAS.salida);
const MOVIMIENTO = Easing.bezier(...CURVAS.movimiento);

/** Tamaño y margen del logo de la cabecera de Movimientos: aquí es donde aterriza la intro. */
export const LOGO_CABECERA = { tamano: 36, margen: 16 };
/** En escritorio aterriza en el logo de la barra lateral (esquina superior izquierda). */
export const LOGO_LATERAL = { tamano: 38, x: 14 + 8 + 19, y: 28 + 19 };
const TAMANO_INTRO = 200;
const NOMBRE = 'Balanz'.split('');

function Letra({ letra, progreso, indice }: { letra: string; progreso: SharedValue<number>; indice: number }) {
  // Cada letra arranca un poco después de la anterior (el progreso global va de 0 a 1 en el tramo del nombre).
  const estilo = useAnimatedStyle(() => {
    const p = interpolate(progreso.get(), [indice * 0.12, indice * 0.12 + 0.45], [0, 1], 'clamp');
    return { opacity: p, transform: [{ translateY: 14 * (1 - p) }] };
  });
  return (
    <Animated.View style={estilo}>
      <Text style={styles.nombre}>{letra}</Text>
    </Animated.View>
  );
}

/**
 * Pantalla de entrada (una vez por arranque, ~2,5 s):
 * 1. un resplandor lima respira detrás; 2. la Z se dibuja trazo a trazo y la moneda cae con rebote;
 * 3. el nombre aparece letra a letra y el lema se funde; 4. el logo se encoge y viaja a la cabecera mientras el fondo
 * se disuelve y deja ver la app. Un toque la salta. Con "reducir animaciones": logo quieto y fundido corto.
 */
export default function Intro({ onFin }: { onFin: () => void }) {
  const sistemaReduce = useReducedMotion();
  const { reducirMovimiento } = usePreferencias();
  const quieto = sistemaReduce || reducirMovimiento;
  const { width, height } = useWindowDimensions();
  const { escritorio } = useDisposicion();

  const barraArriba = useSharedValue(quieto ? 1 : 0);
  const diagonal = useSharedValue(quieto ? 1 : 0);
  const barraAbajo = useSharedValue(quieto ? 1 : 0);
  const moneda = useSharedValue(quieto ? 1 : 0);
  const nombre = useSharedValue(quieto ? 1 : 0);
  const lema = useSharedValue(quieto ? 1 : 0);
  const brillo = useSharedValue(quieto ? 1 : 0);
  const destello = useSharedValue(0);
  const viaje = useSharedValue(0);
  const salida = useSharedValue(1);
  const terminado = useRef(false);

  const terminar = () => {
    if (terminado.current) return;
    terminado.current = true;
    marcarIntroLista();
    onFin();
  };

  // El logo viaja hasta su sitio: la cabecera de Movimientos en el móvil, la barra lateral en escritorio.
  const viaja = true;
  const destinoX = escritorio ? LOGO_LATERAL.x - width / 2 : width / 2 - LOGO_CABECERA.margen - LOGO_CABECERA.tamano / 2;
  const destinoY = escritorio ? LOGO_LATERAL.y - height / 2 : arriba(60) + 20 - height / 2;
  const escalaFinal = (escritorio ? LOGO_LATERAL.tamano : LOGO_CABECERA.tamano) / TAMANO_INTRO;

  useEffect(() => {
    if (quieto) {
      salida.set(withDelay(700, withTiming(0, { duration: 220, easing: SALIDA }, (ok) => ok && scheduleOnRN(terminar))));
      return;
    }
    barraArriba.set(withDelay(80, withTiming(1, { duration: 300, easing: SALIDA })));
    diagonal.set(withDelay(240, withTiming(1, { duration: 380, easing: SALIDA })));
    barraAbajo.set(withDelay(500, withTiming(1, { duration: 300, easing: SALIDA })));
    // La moneda cae con un pequeño rebote: es el único momento "físico" de toda la secuencia.
    moneda.set(withDelay(780, withSpring(1, { duration: 450, dampingRatio: 0.55, reduceMotion: ReduceMotion.Never })));
    destello.set(withDelay(900, withTiming(1, { duration: 520, easing: MOVIMIENTO })));
    brillo.set(withDelay(700, withTiming(1, { duration: 900, easing: SALIDA })));
    nombre.set(withDelay(1100, withTiming(1, { duration: 650, easing: SALIDA })));
    lema.set(withDelay(1350, withTiming(1, { duration: 420, easing: SALIDA })));
    // Salida: el logo viaja, el nombre y el fondo se disuelven y, al llegar, se entrega el relevo a la cabecera.
    viaje.set(
      withDelay(
        2000,
        withTiming(1, { duration: 560, easing: MOVIMIENTO }, (ok) => {
          if (ok) scheduleOnRN(terminar);
        })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estiloMarca = useAnimatedStyle(() => {
    const v = viaje.get();
    return {
      transform: [
        { translateX: viaja ? destinoX * v : 0 },
        { translateY: viaja ? destinoY * v : 0 },
        { scale: viaja ? 1 - (1 - escalaFinal) * v : 1 + 0.06 * v },
      ],
      opacity: viaja ? 1 : 1 - v,
    };
  });
  const estiloFondo = useAnimatedStyle(() => ({
    opacity: quieto ? salida.get() : 1 - interpolate(viaje.get(), [0.1, 0.85], [0, 1], 'clamp'),
  }));
  const estiloTextos = useAnimatedStyle(() => ({ opacity: 1 - interpolate(viaje.get(), [0, 0.35], [0, 1], 'clamp') }));
  const estiloLema = useAnimatedStyle(() => ({ opacity: lema.get(), transform: [{ translateY: 10 * (1 - lema.get()) }] }));
  const estiloBrillo = useAnimatedStyle(() => ({
    opacity: brillo.get() * (0.75 + 0.25 * Math.sin(brillo.get() * Math.PI)),
    transform: [{ scale: 0.85 + 0.15 * brillo.get() }],
  }));
  // Destello: una franja de luz que cruza el logo una vez, justo después de que caiga la moneda.
  const estiloDestello = useAnimatedStyle(() => ({
    opacity: interpolate(destello.get(), [0, 0.2, 0.8, 1], [0, 0.9, 0.9, 0]),
    transform: [{ translateX: interpolate(destello.get(), [0, 1], [-TAMANO_INTRO, TAMANO_INTRO]) }, { rotate: '20deg' }],
  }));

  const saltar = () => {
    if (terminado.current) return;
    salida.set(withTiming(0, { duration: 160 }));
    viaje.set(withTiming(1, { duration: 160 }, (ok) => ok && scheduleOnRN(terminar)));
  };

  return (
    <Animated.View style={styles.raiz} accessibilityLabel="Balanz" accessibilityRole="image" pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, estiloFondo]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={saltar} accessibilityLabel="Saltar la introducción" />
      </Animated.View>
      <View pointerEvents="none" style={styles.centro}>
        <Animated.View style={[styles.brillo, estiloBrillo]}>
          <Halo size={560} color="#bef264" intensidad={0.2} />
        </Animated.View>
        <Animated.View style={estiloMarca}>
          <Logo size={TAMANO_INTRO} progreso={{ barraArriba, diagonal, barraAbajo, moneda }} />
          <View style={styles.recorteDestello} pointerEvents="none">
            <Animated.View style={[styles.destello, estiloDestello]} />
          </View>
        </Animated.View>
        <Animated.View style={[styles.bloqueTexto, estiloTextos]}>
          <View style={styles.letras}>
            {NOMBRE.map((l, i) => (
              <Letra key={i} letra={l} indice={i} progreso={nombre} />
            ))}
          </View>
        </Animated.View>
        <Animated.View style={[styles.bloqueLema, estiloTextos]}>
          <Animated.View style={estiloLema}>
            <Text style={styles.lema}>Tu dinero, en equilibrio.</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  raiz: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  fondo: { backgroundColor: '#09090b' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brillo: { position: 'absolute', marginTop: -60 },
  recorteDestello: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 48, overflow: 'hidden' },
  destello: { position: 'absolute', top: -40, bottom: -40, left: '40%', width: 36, backgroundColor: 'rgba(255,255,255,0.3)' },
  bloqueTexto: { position: 'absolute', top: '50%', marginTop: 86 },
  letras: { flexDirection: 'row' },
  bloqueLema: { position: 'absolute', top: '50%', marginTop: 152 },
  nombre: { color: '#ffffff', fontSize: 44, fontWeight: '800', letterSpacing: -1.2 },
  lema: { color: '#a1a1aa', fontSize: 15, letterSpacing: 0.2, textAlign: 'center' },
});
