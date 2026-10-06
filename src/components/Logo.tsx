/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LOGO } from '../logo';

const TrazoAnimado = Animated.createAnimatedComponent(Path);
const MonedaAnimada = Animated.createAnimatedComponent(Circle);

type Progreso = {
  /** 0..1: cuánto de cada trazo está dibujado. Si no se pasa, el logo se ve completo. */
  tallo?: SharedValue<number>;
  arriba?: SharedValue<number>;
  abajo?: SharedValue<number>;
  /** 0..1: escala y opacidad de la moneda. */
  moneda?: SharedValue<number>;
};

function Trazo({ d, largo, progreso }: { d: string; largo: number; progreso?: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const p = progreso ? progreso.get() : 1;
    return { strokeDashoffset: largo * (1 - p), strokeOpacity: p > 0.001 ? 1 : 0 };
  });
  return (
    <TrazoAnimado
      d={d}
      stroke="url(#marca)"
      strokeWidth={LOGO.trazo}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={`${largo + 1} ${largo + 1}`}
      animatedProps={props}
    />
  );
}

function Moneda({ progreso }: { progreso?: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const p = progreso ? progreso.get() : 1;
    return { r: LOGO.moneda.r * p, opacity: Math.min(1, p * 1.6) };
  });
  return <MonedaAnimada cx={LOGO.moneda.cx} cy={LOGO.moneda.cy} fill={LOGO.colores.moneda} animatedProps={props} />;
}

/**
 * Logo de Balanz: cuadrado redondeado con degradado y la "B" encima.
 * `conFondo={false}` dibuja solo la marca (para ponerla sobre otro fondo).
 */
export default function Logo({
  size = 96,
  conFondo = true,
  progreso,
}: {
  size?: number;
  conFondo?: boolean;
  progreso?: Progreso;
}) {
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Logo de Balanz">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={LOGO.colores.inicio} />
            <Stop offset="1" stopColor={LOGO.colores.fin} />
          </LinearGradient>
          <RadialGradient id="brillo" gradientUnits="userSpaceOnUse" cx="86" cy="8" r="62">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="marca" gradientUnits="userSpaceOnUse" x1="0" y1="18" x2="0" y2="82">
            <Stop offset="0" stopColor={LOGO.colores.marca} />
            <Stop offset="1" stopColor={LOGO.colores.marcaFin} />
          </LinearGradient>
        </Defs>
        {conFondo ? <Rect width="100" height="100" rx="24" fill="url(#fondo)" /> : null}
        {conFondo ? <Rect width="100" height="100" rx="24" fill="url(#brillo)" /> : null}
        <G>
          <Trazo d={LOGO.tallo.d} largo={LOGO.tallo.largo} progreso={progreso?.tallo} />
          <Trazo d={LOGO.arriba.d} largo={LOGO.arriba.largo} progreso={progreso?.arriba} />
          <Trazo d={LOGO.abajo.d} largo={LOGO.abajo.largo} progreso={progreso?.abajo} />
          <Moneda progreso={progreso?.moneda} />
        </G>
      </Svg>
    </View>
  );
}
