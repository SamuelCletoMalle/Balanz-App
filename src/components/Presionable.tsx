/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePreferencias } from '../accesibilidad';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** Aspecto del botón (fondo, bordes, tamaño). */
  style?: StyleProp<ViewStyle>;
  /** Colocación del botón dentro de su padre (flex, posición absoluta…). */
  contenedor?: StyleProp<ViewStyle>;
  /** Escala al pulsar; 0,97 por defecto. */
  escala?: number;
  /** Otras propiedades de `style` que cambian con transición (p. ej. el color de fondo de un chip). */
  animar?: string[];
  children?: ReactNode | ((estado: { pressed: boolean }) => ReactNode);
};

/**
 * Botón con respuesta inmediata: al pulsar se encoge un 3 % en 120 ms (ease-out) y vuelve al soltar.
 * Con "reducir animaciones" cambia la opacidad en vez de moverse.
 */
export default function Presionable({ style, contenedor, escala = 0.97, animar = [], children, ...resto }: Props) {
  const { reducirMovimiento } = usePreferencias();
  return (
    <Pressable
      accessibilityRole="button"
      pressRetentionOffset={{ top: 14, left: 14, right: 14, bottom: 14 }}
      {...resto}
      style={contenedor}
    >
      {({ pressed }) => (
        <Animated.View
          style={
            [
              style,
              reducirMovimiento
                ? { opacity: pressed ? 0.7 : 1 }
                : {
                    transitionProperty: ['transform', ...animar],
                    transitionDuration: 140,
                    transitionTimingFunction: 'ease-out',
                    transform: [{ scale: pressed ? escala : 1 }],
                  },
            ] as StyleProp<ViewStyle>
          }
        >
          {typeof children === 'function' ? children({ pressed }) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
