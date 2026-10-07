/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Logo from './Logo';
import { Text } from './Texto';
import { useQuieto } from './ui';
import { IconoNombre, useTema } from '../tema';
import { useIntroLista } from '../intro-estado';

const ICONOS: Record<string, [IconoNombre, IconoNombre]> = {
  index: ['wallet-outline', 'wallet'],
  pendientes: ['notifications-outline', 'notifications'],
  presupuesto: ['pie-chart-outline', 'pie-chart'],
  ajustes: ['grid-outline', 'grid'],
};

const ALTO_ITEM = 48;
const SEPARACION = 4;

/** Menú lateral del escritorio: marca arriba y un indicador que se desliza hasta la sección activa. */
export default function BarraLateral({ state, descriptors, navigation }: BottomTabBarProps) {
  const tema = useTema();
  const quieto = useQuieto();
  const introLista = useIntroLista();
  const visibles = state.routes.filter((r) => StyleSheet.flatten(descriptors[r.key].options.tabBarItemStyle)?.display !== 'none');
  const indice = Math.max(0, visibles.findIndex((r) => r.key === state.routes[state.index].key));
  const y = useSharedValue(indice * (ALTO_ITEM + SEPARACION));
  const colocado = useRef(false);
  useEffect(() => {
    const destino = indice * (ALTO_ITEM + SEPARACION);
    if (!colocado.current || quieto) y.set(withTiming(destino, { duration: 0 }));
    else y.set(withSpring(destino, { duration: 320, dampingRatio: 0.85 }));
    colocado.current = true;
  }, [indice, quieto, y]);
  const estiloIndicador = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <View style={[styles.barra, { backgroundColor: tema.fondo, borderRightColor: tema.borde }]} accessibilityRole="tablist">
      <View style={styles.marca}>
        <View style={{ opacity: introLista ? 1 : 0 }}>
          <Logo size={38} />
        </View>
        <Text style={{ color: tema.texto, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 }}>Balanz</Text>
      </View>
      <View style={styles.lista}>
        <Animated.View
          pointerEvents="none"
          style={[styles.indicador, { backgroundColor: tema.oscuro ? 'rgba(190,242,100,0.14)' : 'rgba(10,10,10,0.07)' }, estiloIndicador]}
        />
        {visibles.map((ruta, i) => {
          const { options } = descriptors[ruta.key];
          const activa = i === indice;
          const titulo = typeof options.title === 'string' ? options.title : ruta.name;
          const [fuera, dentro] = ICONOS[ruta.name] ?? ['ellipse-outline', 'ellipse'];
          const color = activa ? (tema.oscuro ? tema.acento : tema.texto) : tema.textoSuave;
          return (
            <Pressable
              key={ruta.key}
              accessibilityRole="tab"
              accessibilityLabel={titulo}
              accessibilityState={{ selected: activa }}
              onPress={() => {
                const evento = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
                if (!activa && !evento.defaultPrevented) navigation.navigate(ruta.name, ruta.params);
              }}
              style={({ hovered }: { hovered?: boolean }) => [styles.item, !activa && hovered ? { backgroundColor: tema.tarjetaSuave } : null]}
            >
              <Ionicons name={activa ? dentro : fuera} size={22} color={color} />
              <Text style={{ color, fontSize: 15, fontWeight: activa ? '700' : '500', flex: 1 }}>{titulo}</Text>
              {options.tabBarBadge ? (
                <View style={[styles.insignia, { backgroundColor: tema.peligro }]}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{options.tabBarBadge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { width: 232, borderRightWidth: StyleSheet.hairlineWidth, paddingTop: 28, paddingHorizontal: 14, gap: 28 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  lista: { gap: SEPARACION },
  indicador: { position: 'absolute', top: 0, left: 0, right: 0, height: ALTO_ITEM, borderRadius: 14 },
  item: { height: ALTO_ITEM, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  insignia: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
});
