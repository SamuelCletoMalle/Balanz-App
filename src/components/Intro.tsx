/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Logo from './Logo';
import Halo from './Halo';
import { Text } from './Texto';
import { CURVAS } from '../logo';
import { usePreferencias } from '../accesibilidad';

const SALIDA = Easing.bezier(...CURVAS.salida);
const MOVIMIENTO = Easing.bezier(...CURVAS.movimiento);

/**
 * Pantalla de entrada (ocurre una vez por arranque, así que cabe una animación con calma):
 * la "B" se dibuja trazo a trazo, la moneda cae en su sitio y la marca sube para dejar paso al nombre.
 * Un toque la salta. Con "reducir animaciones" solo se ve la marca quieta unos instantes.
 */
export default function Intro({ onFin }: { onFin: () => void }) {
  const sistemaReduce = useReducedMotion();
  const { reducirMovimiento } = usePreferencias();
  const quieto = sistemaReduce || reducirMovimiento;

  const tallo = useSharedValue(quieto ? 1 : 0);
  const arriba = useSharedValue(quieto ? 1 : 0);
  const abajo = useSharedValue(quieto ? 1 : 0);
  const moneda = useSharedValue(quieto ? 1 : 0);
  const subida = useSharedValue(quieto ? 1 : 0);
  const nombre = useSharedValue(quieto ? 1 : 0);
  const lema = useSharedValue(quieto ? 1 : 0);
  const brillo = useSharedValue(quieto ? 1 : 0);
  const salida = useSharedValue(1);
  const terminado = useRef(false);

  const terminar = () => {
    if (terminado.current) return;
    terminado.current = true;
    onFin();
  };

  const salir = (retraso: number, duracion: number) => {
    salida.set(
      withDelay(
        retraso,
        withTiming(0, { duration: duracion, easing: SALIDA }, (acabo) => {
          if (acabo) scheduleOnRN(terminar);
        })
      )
    );
  };

  useEffect(() => {
    if (quieto) {
      salir(700, 200);
      return;
    }
    tallo.set(withDelay(80, withTiming(1, { duration: 350, easing: SALIDA })));
    arriba.set(withDelay(230, withTiming(1, { duration: 420, easing: SALIDA })));
    abajo.set(withDelay(420, withTiming(1, { duration: 460, easing: SALIDA })));
    // La moneda cae con un pequeño rebote: es el único momento "físico" de toda la secuencia.
    moneda.set(withDelay(860, withSpring(1, { duration: 450, dampingRatio: 0.55, reduceMotion: ReduceMotion.Never })));
    subida.set(withDelay(1000, withTiming(1, { duration: 450, easing: MOVIMIENTO })));
    brillo.set(withDelay(900, withTiming(1, { duration: 900, easing: SALIDA })));
    nombre.set(withDelay(1150, withTiming(1, { duration: 420, easing: SALIDA })));
    lema.set(withDelay(1320, withTiming(1, { duration: 420, easing: SALIDA })));
    salir(2250, 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estiloMarca = useAnimatedStyle(() => ({
    transform: [{ translateY: -34 * subida.get() }, { scale: 1 - 0.18 * subida.get() }],
  }));
  const estiloNombre = useAnimatedStyle(() => ({
    opacity: nombre.get(),
    transform: [{ translateY: 12 * (1 - nombre.get()) }],
  }));
  const estiloLema = useAnimatedStyle(() => ({
    opacity: lema.get(),
    transform: [{ translateY: 10 * (1 - lema.get()) }],
  }));
  const estiloBrillo = useAnimatedStyle(() => ({ opacity: brillo.get(), transform: [{ scale: 0.85 + 0.15 * brillo.get() }] }));
  const estiloRaiz = useAnimatedStyle(() => ({ opacity: salida.get() }));

  const saltar = () => {
    if (terminado.current) return;
    salida.set(withTiming(0, { duration: 150 }, (acabo) => acabo && scheduleOnRN(terminar)));
  };

  return (
    <Animated.View style={[styles.raiz, estiloRaiz]} accessibilityLabel="Balanz" accessibilityRole="image">
      <Pressable style={StyleSheet.absoluteFill} onPress={saltar} accessibilityLabel="Saltar la introducción" />
      <View pointerEvents="none" style={styles.centro}>
        <Animated.View style={[styles.brillo, estiloBrillo]}>
          <Halo size={560} />
        </Animated.View>
        <Animated.View style={estiloMarca}>
          <Logo size={200} progreso={{ tallo, arriba, abajo, moneda }} />
        </Animated.View>
        <Animated.View style={[styles.bloqueTexto, estiloNombre]}>
          <Text style={styles.nombre}>Balanz</Text>
        </Animated.View>
        <Animated.View style={[styles.bloqueLema, estiloLema]}>
          <Text style={styles.lema}>Tu dinero, en equilibrio</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  raiz: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b1020', zIndex: 100 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brillo: { position: 'absolute', marginTop: -60 },
  bloqueTexto: { position: 'absolute', top: '50%', marginTop: 86 },
  bloqueLema: { position: 'absolute', top: '50%', marginTop: 152 },
  nombre: { color: '#ffffff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center' },
  lema: { color: '#a3b1c6', fontSize: 15, letterSpacing: 0.2, textAlign: 'center' },
});
