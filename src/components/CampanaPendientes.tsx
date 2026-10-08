/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Texto';
import { useQuieto } from './ui';
import { sonarCampana, vibracionCampanaActivada } from '../campana';
import { toque } from '../haptics';
import { useTema } from '../tema';

const CADA_MS = 7000;

/**
 * La campanita de los pagos por revisar: cada pocos segundos se agita, suena y el número de pendientes sobresale
 * un momento. Solo se mueve (y suena) mientras la pantalla está a la vista y si el usuario no pidió menos movimiento.
 */
export default function CampanaPendientes({ n, tam = 36, fondo, color, estilo }: { n: number; tam?: number; fondo?: string; color: string; estilo?: StyleProp<ViewStyle> }) {
  const tema = useTema();
  const quieto = useQuieto();
  const giro = useSharedValue(0);
  const insignia = useSharedValue(1);

  const tocar = useCallback(() => {
    giro.set(
      withSequence(
        withTiming(16, { duration: 70 }),
        withTiming(-14, { duration: 120 }),
        withTiming(11, { duration: 110 }),
        withTiming(-8, { duration: 100 }),
        withTiming(4, { duration: 90 }),
        withTiming(0, { duration: 90 })
      )
    );
    insignia.set(withSequence(withTiming(1.5, { duration: 110 }), withDelay(260, withSpring(1, { duration: 450, dampingRatio: 0.45 }))));
    sonarCampana();
    if (vibracionCampanaActivada()) toque();
  }, [giro, insignia]);

  useFocusEffect(
    useCallback(() => {
      if (n <= 0 || quieto) return;
      const primero = setTimeout(tocar, 1400);
      const ciclo = setInterval(tocar, CADA_MS);
      return () => {
        clearTimeout(primero);
        clearInterval(ciclo);
      };
    }, [n, quieto, tocar])
  );

  const estiloCampana = useAnimatedStyle(() => ({ transform: [{ translateY: -tam * 0.3 }, { rotate: `${giro.get()}deg` }, { translateY: tam * 0.3 }] }));
  const estiloInsignia = useAnimatedStyle(() => ({ transform: [{ scale: insignia.get() }] }));

  return (
    <View style={[{ width: tam, height: tam, borderRadius: tam / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: fondo, overflow: 'visible' }, estilo]}>
      <Animated.View style={estiloCampana}>
        <Ionicons name="notifications" size={tam * 0.55} color={color} />
      </Animated.View>
      <Animated.View
        style={[
          { position: 'absolute', top: -tam * 0.18, right: -tam * 0.22, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: tema.peligro, borderWidth: 2, borderColor: tema.tarjeta },
          estiloInsignia,
        ]}
      >
        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>{n > 99 ? '99+' : n}</Text>
      </Animated.View>
    </View>
  );
}
