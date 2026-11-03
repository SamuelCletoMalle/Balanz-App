/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useQuieto } from './ui';
import { CURVAS, LOGO } from '../logo';

const SALIDA = Easing.bezier(...CURVAS.salida);

type Progreso = {
  /** 0..1: cuánto del símbolo ha aparecido. Si no se pasa, el logo se ve completo. */
  revelado?: SharedValue<number>;
};

// Dónde brilla la cartera (fracción del lado): la estrella del anillo arriba a la derecha y dos reflejos del cristal.
const BRILLOS = [
  { x: 0.9, y: 0.3, tam: 0.2, retardo: 0 },
  { x: 0.15, y: 0.66, tam: 0.13, retardo: 1100 },
  { x: 0.6, y: 0.64, tam: 0.1, retardo: 2100 },
] as const;

/** Estrella de cuatro puntas que aparece, gira un poco y se apaga. Solo transform y opacity: corre en el hilo de la interfaz. */
function Brillo({ x, y, tam, retardo, size, inicio }: { x: number; y: number; tam: number; retardo: number; size: number; inicio: number }) {
  const quieto = useQuieto();
  const p = useSharedValue(0);
  useEffect(() => {
    if (quieto) {
      p.set(0.55);
      return;
    }
    p.set(
      withDelay(
        inicio + retardo,
        withRepeat(withSequence(withTiming(1, { duration: 650, easing: SALIDA }), withTiming(0, { duration: 900, easing: SALIDA }), withTiming(0, { duration: 2600 })), -1)
      )
    );
  }, [quieto, retardo, inicio, p]);
  const estilo = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scale: 0.35 + 0.85 * p.get() }, { rotate: `${p.get() * 40}deg` }] }));
  const lado = size * tam;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x * size - lado / 2, top: y * size - lado / 2, width: lado, height: lado }, estilo]}>
      <Svg width={lado} height={lado} viewBox="0 0 20 20">
        <Path d="M10 0C10.8 6 14 9.2 20 10C14 10.8 10.8 14 10 20C9.2 14 6 10.8 0 10C6 9.2 9.2 6 10 0Z" fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Logo de Nexo Pay: la cartera de cristal y cromo sobre un cuadrado redondeado carbón.
 * `conFondo={false}` dibuja solo la cartera (para ponerla sobre otro fondo). `destellos` hace parpadear las estrellas
 * del anillo y `flota` la mece despacio; ambos se quedan quietos con "reducir movimiento".
 */
export default function Logo({
  size = 96,
  conFondo = true,
  progreso,
  destellos = false,
  flota = false,
  inicioDestellos = 600,
}: {
  size?: number;
  conFondo?: boolean;
  aro?: string;
  progreso?: Progreso;
  destellos?: boolean;
  flota?: boolean;
  /** Milisegundos hasta el primer destello (en la intro, cuando ya ha aparecido la cartera). */
  inicioDestellos?: number;
}) {
  const quieto = useQuieto();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!flota || quieto) {
      y.set(0);
      return;
    }
    y.set(withRepeat(withTiming(-size * 0.03, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [flota, quieto, size, y]);
  const estiloFlota = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const estilo = useAnimatedStyle(() => {
    const p = progreso?.revelado ? progreso.revelado.get() : 1;
    return { opacity: Math.min(1, p * 1.4), transform: [{ scale: 0.86 + 0.14 * p }] };
  });
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Logo de Nexo Pay">
      {conFondo ? (
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={LOGO.colores.inicio} />
              <Stop offset="1" stopColor={LOGO.colores.fin} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" rx="24" fill="url(#fondo)" />
        </Svg>
      ) : null}
      <Animated.View style={[{ width: size, height: size }, estiloFlota]}>
        <Animated.View style={[{ width: size, height: size }, estilo]}>
          <Image source={require('../../assets/images/simbolo.png')} style={{ width: size, height: size }} resizeMode="contain" />
        </Animated.View>
        {destellos ? BRILLOS.map((b, i) => <Brillo key={i} {...b} size={size} inicio={inicioDestellos} />) : null}
      </Animated.View>
    </View>
  );
}
