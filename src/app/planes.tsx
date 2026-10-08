/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '../components/Texto';
import { Segmentos, useQuieto } from '../components/ui';
import PresupuestoContenido from '../components/PresupuestoContenido';
import { MetasContenido } from './metas';
import { RecurrentesContenido } from './recurrentes';
import { arriba } from '../layout';
import { useTema } from '../tema';

type Vista = 'presupuesto' | 'metas' | 'fijos';
const VISTAS: Vista[] = ['presupuesto', 'metas', 'fijos'];

/**
 * Planes: todo lo que mira al futuro en un solo sitio — cuánto quieres gastar (presupuesto), cuánto quieres ahorrar
 * (metas) y los pagos que se repiten solos (fijos). Se puede abrir en una vista con `/planes?vista=metas`.
 */
export default function PlanesScreen() {
  const tema = useTema();
  const quieto = useQuieto();
  const { vista: pedida } = useLocalSearchParams<{ vista?: string }>();
  const [elegida, setElegida] = useState<{ para?: string; v: Vista } | null>(null);
  const deLaRuta = VISTAS.find((v) => v === pedida) ?? 'presupuesto';
  const vista: Vista = elegida && elegida.para === pedida ? elegida.v : deLaRuta;

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <Text style={[styles.titulo, { color: tema.texto }]}>Planes</Text>
      <Segmentos<Vista>
        opciones={[
          { id: 'presupuesto', texto: 'Presupuesto' },
          { id: 'metas', texto: 'Metas' },
          { id: 'fijos', texto: 'Fijos' },
        ]}
        valor={vista}
        onChange={(v) => setElegida({ para: pedida, v })}
      />
      <Animated.View key={vista} entering={quieto ? undefined : FadeIn.duration(220)} style={styles.contenido}>
        {vista === 'presupuesto' ? <PresupuestoContenido /> : vista === 'metas' ? <MetasContenido embebido /> : <RecurrentesContenido embebido />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(60), paddingHorizontal: 16, gap: 14 },
  titulo: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  contenido: { flex: 1 },
});
