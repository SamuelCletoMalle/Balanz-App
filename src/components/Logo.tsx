/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { LOGO } from '../logo';

const TrazoAnimado = Animated.createAnimatedComponent(Path);
const MonedaAnimada = Animated.createAnimatedComponent(Circle);

type Progreso = {
  /** 0..1: cuánto de cada trazo está dibujado. Si no se pasa, el logo se ve completo. */
  barraArriba?: SharedValue<number>;
  diagonal?: SharedValue<number>;
  barraAbajo?: SharedValue<number>;
  /** 0..1: escala y opacidad de la moneda. */
  moneda?: SharedValue<number>;
};

function Trazo({ d, largo, color, progreso }: { d: string; largo: number; color: string; progreso?: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const p = progreso ? progreso.get() : 1;
    return { strokeDashoffset: largo * (1 - p), strokeOpacity: p > 0.001 ? 1 : 0 };
  });
  return (
    <TrazoAnimado
      d={d}
      stroke={color}
      strokeWidth={LOGO.trazo}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={`${largo + 1} ${largo + 1}`}
      animatedProps={props}
    />
  );
}

function Moneda({ color, aro, progreso }: { color: string; aro: string; progreso?: SharedValue<number> }) {
  const propsMoneda = useAnimatedProps(() => {
    const p = progreso ? progreso.get() : 1;
    return { r: LOGO.moneda.r * p, opacity: Math.min(1, p * 1.6) };
  });
  const propsHueco = useAnimatedProps(() => {
    const p = progreso ? progreso.get() : 1;
    return { r: LOGO.moneda.hueco * p, opacity: Math.min(1, p * 1.6) };
  });
  // Primero el hueco del color del fondo (recorta la Z alrededor de la moneda) y encima la moneda.
  return (
    <>
      <MonedaAnimada cx={LOGO.moneda.cx} cy={LOGO.moneda.cy} fill={aro} animatedProps={propsHueco} />
      <MonedaAnimada cx={LOGO.moneda.cx} cy={LOGO.moneda.cy} fill={color} animatedProps={propsMoneda} />
    </>
  );
}

/**
 * Logo de Balanz: la Z con la moneda de pivote sobre un cuadrado redondeado negro.
 * `conFondo={false}` dibuja solo la marca (para ponerla sobre otro fondo); `aro` es el color del fondo, para que
 * la moneda siga "recortada" de la Z.
 */
export default function Logo({
  size = 96,
  conFondo = true,
  aro,
  progreso,
}: {
  size?: number;
  conFondo?: boolean;
  aro?: string;
  progreso?: Progreso;
}) {
  const colores = LOGO.colores;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Logo de Balanz">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colores.inicio} />
            <Stop offset="1" stopColor={colores.fin} />
          </LinearGradient>
        </Defs>
        {conFondo ? <Rect width="100" height="100" rx="24" fill="url(#fondo)" /> : null}
        <G>
          <Trazo d={LOGO.barraArriba.d} largo={LOGO.barraArriba.largo} color={colores.marca} progreso={progreso?.barraArriba} />
          <Trazo d={LOGO.diagonal.d} largo={LOGO.diagonal.largo} color={colores.marca} progreso={progreso?.diagonal} />
          <Trazo d={LOGO.barraAbajo.d} largo={LOGO.barraAbajo.largo} color={colores.marca} progreso={progreso?.barraAbajo} />
          <Moneda color={colores.moneda} aro={aro ?? (conFondo ? colores.aro : 'transparent')} progreso={progreso?.moneda} />
        </G>
      </Svg>
    </View>
  );
}
