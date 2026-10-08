/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Presionable from './Presionable';
import { toque } from '../haptics';
import { abrirNuevoMovimiento, useNuevoMovimiento } from '../nuevo-estado';
import { useTema } from '../tema';

/** Botón "+" flotante. Gira 45° (queda como una "×") mientras la hoja de nuevo movimiento está abierta. */
export default function BotonNuevo() {
  const tema = useTema();
  const { abierto } = useNuevoMovimiento();
  const giro = useSharedValue(0);
  useEffect(() => {
    giro.set(withSpring(abierto ? 1 : 0, { duration: 320, dampingRatio: abierto ? 0.7 : 0.8 }));
  }, [abierto, giro]);
  const estiloGiro = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.get() * 45}deg` }] }));
  return (
    <Presionable
      accessibilityLabel="Añadir movimiento"
      contenedor={styles.contenedor}
      style={[styles.fab, { backgroundColor: tema.primario, shadowColor: tema.sombra }]}
      escala={0.94}
      onPress={() => {
        toque();
        abrirNuevoMovimiento('gasto');
      }}
    >
      <Animated.View style={estiloGiro}>
        <Ionicons name="add" size={32} color={tema.primarioTexto} />
      </Animated.View>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', right: 20, bottom: 24 },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
