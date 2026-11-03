/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Image, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { LOGO } from '../logo';

type Progreso = {
  /** 0..1: cuánto del símbolo ha aparecido. Si no se pasa, el logo se ve completo. */
  revelado?: SharedValue<number>;
};

/**
 * Logo de Nexo Pay: la cartera de cristal y cromo sobre un cuadrado redondeado carbón.
 * `conFondo={false}` dibuja solo el símbolo (para ponerlo sobre otro fondo).
 */
export default function Logo({
  size = 96,
  conFondo = true,
  progreso,
}: {
  size?: number;
  conFondo?: boolean;
  aro?: string;
  progreso?: Progreso;
}) {
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
      <Animated.View style={[{ width: size, height: size }, estilo]}>
        <Image source={require('../../assets/images/simbolo.png')} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
