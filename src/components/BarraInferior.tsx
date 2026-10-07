/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Text } from './Texto';
import { useQuieto } from './ui';
import { seleccion } from '../haptics';
import { IconoNombre, SOMBRA, useTema } from '../tema';

const ICONOS: Record<string, [IconoNombre, IconoNombre]> = {
  index: ['wallet-outline', 'wallet'],
  pendientes: ['notifications-outline', 'notifications'],
  presupuesto: ['pie-chart-outline', 'pie-chart'],
  ajustes: ['grid-outline', 'grid'],
};

const MARGEN = 6;

/**
 * Barra inferior del móvil: una pastilla de vidrio con un indicador que se desliza hasta la pestaña elegida.
 * Está en el flujo normal (no tapa el contenido) y respeta la barra de gestos del sistema.
 */
export default function BarraInferior({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const tema = useTema();
  const quieto = useQuieto();
  const [ancho, setAncho] = useState(0);
  const visibles = state.routes.filter((r) => StyleSheet.flatten(descriptors[r.key].options.tabBarItemStyle)?.display !== 'none');
  const indice = Math.max(0, visibles.findIndex((r) => r.key === state.routes[state.index].key));
  const hueco = visibles.length > 0 ? Math.max(0, ancho - MARGEN * 2) / visibles.length : 0;

  const x = useSharedValue(0);
  const posicion = indice * hueco;
  const medido = useRef(false);
  // El indicador se coloca sin animación la primera vez que se mide y después se desliza con un resorte corto.
  useEffect(() => {
    if (hueco <= 0) return;
    if (!medido.current || quieto) x.set(withTiming(posicion, { duration: 0 }));
    else x.set(withSpring(posicion, { duration: 320, dampingRatio: 0.82 }));
    medido.current = true;
  }, [posicion, hueco, quieto, x]);
  const estiloIndicador = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], width: hueco }));

  const vidrio: ViewStyle =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)' } as unknown as ViewStyle)
      : {};

  return (
    <View style={[styles.contenedor, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={[styles.pastilla, { backgroundColor: tema.vidrio, borderColor: tema.borde }, SOMBRA.m, vidrio]}
        accessibilityRole="tablist"
      >
        {hueco > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicador, { backgroundColor: tema.oscuro ? 'rgba(190,242,100,0.16)' : 'rgba(10,10,10,0.07)' }, estiloIndicador]}
          />
        ) : null}
        {visibles.map((ruta, i) => {
          const { options } = descriptors[ruta.key];
          const activa = i === indice;
          const titulo = typeof options.title === 'string' ? options.title : ruta.name;
          const [fuera, dentro] = ICONOS[ruta.name] ?? ['ellipse-outline', 'ellipse'];
          const color = activa ? (tema.oscuro ? tema.acento : tema.texto) : tema.textoSuave;
          const insignia = options.tabBarBadge;
          return (
            <Pressable
              key={ruta.key}
              accessibilityRole="tab"
              accessibilityLabel={titulo}
              accessibilityState={{ selected: activa }}
              style={styles.pestana}
              onPress={() => {
                const evento = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
                if (!activa && !evento.defaultPrevented) {
                  seleccion();
                  navigation.navigate(ruta.name, ruta.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: ruta.key })}
            >
              <View>
                <Ionicons name={activa ? dentro : fuera} size={22} color={color} />
                {insignia ? (
                  <View style={[styles.insignia, { backgroundColor: tema.peligro }]}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{insignia}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color, fontSize: 11, fontWeight: activa ? '700' : '500' }} numberOfLines={1}>
                {titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { paddingHorizontal: 16, paddingTop: 6 },
  pastilla: { flexDirection: 'row', height: 66, borderRadius: 33, borderWidth: StyleSheet.hairlineWidth, padding: MARGEN, overflow: 'hidden' },
  indicador: { position: 'absolute', top: MARGEN, bottom: MARGEN, left: MARGEN, borderRadius: 27 },
  pestana: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  insignia: { position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
