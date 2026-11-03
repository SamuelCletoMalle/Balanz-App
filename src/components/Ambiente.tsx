/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Halo from './Halo';
import { useTema } from '../tema';

/**
 * Fondo ambiental: dos resplandores grandes (azul y violeta) detrás de toda la app. Sin ellos el "cristal" no tendría
 * nada que desenfocar; con ellos, las tarjetas translúcidas cogen un tono que cambia según dónde estén.
 */
export default function Ambiente() {
  const tema = useTema();
  const { width, height } = useWindowDimensions();
  const k = tema.oscuro ? 1 : 0.45;
  const grande = Math.max(width, height) * 0.9;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: -grande * 0.35, right: -grande * 0.3 }}>
        <Halo size={grande} color="#4452ff" intensidad={0.3 * k} />
      </View>
      <View style={{ position: 'absolute', bottom: -grande * 0.4, left: -grande * 0.35 }}>
        <Halo size={grande} color="#8b5cf6" intensidad={0.16 * k} />
      </View>
    </View>
  );
}
