/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { StyleProp, TextStyle } from 'react-native';
import { Text } from './Texto';
import { useTema } from '../tema';

/** Firma de la marca: "By Nexo-Dev", pequeña, fina y apenas visible, debajo del nombre. */
export default function PorNexoDev({ tamano = 11, color, style, centrado = true }: { tamano?: number; color?: string; style?: StyleProp<TextStyle>; centrado?: boolean }) {
  const tema = useTema();
  return (
    <Text
      accessibilityLabel="Por Nexo Dev"
      style={[{ color: color ?? tema.textoSuave, fontSize: tamano, fontWeight: '400', letterSpacing: tamano * 0.14, opacity: 0.75, textAlign: centrado ? 'center' : 'left' }, style]}
    >
      By Nexo-Dev
    </Text>
  );
}
