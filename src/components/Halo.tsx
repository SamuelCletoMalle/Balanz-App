/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/** Resplandor suave (degradado radial) para dar profundidad detrás del logo. */
export default function Halo({ size = 520, color = '#bef264', intensidad = 0.5 }: { size?: number; color?: string; intensidad?: number }) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="halo" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={intensidad} />
            <Stop offset="0.55" stopColor={color} stopOpacity={intensidad * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill="url(#halo)" />
      </Svg>
    </View>
  );
}
