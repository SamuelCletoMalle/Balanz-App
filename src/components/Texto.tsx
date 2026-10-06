/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { createContext, useContext } from 'react';
import { Platform, StyleSheet, Text as TextoRN, TextInput as EntradaRN, TextProps, TextInputProps, TextStyle } from 'react-native';
import { ESCALAS, usePreferencias } from '../accesibilidad';

// Un texto dentro de otro texto hereda el tamaño del padre: solo se escala el de más arriba.
const DentroDeTexto = createContext(false);

const TAMANO_POR_DEFECTO = 14;

function estiloEscalado(estilo: TextProps['style'], escala: number, anidado: boolean): TextProps['style'] {
  if (escala === 1) return estilo;
  const plano = (StyleSheet.flatten(estilo) ?? {}) as TextStyle;
  if (plano.fontSize === undefined && anidado) return estilo;
  const tamano = plano.fontSize ?? TAMANO_POR_DEFECTO;
  return { ...plano, fontSize: tamano * escala, ...(plano.lineHeight ? { lineHeight: plano.lineHeight * escala } : {}) };
}

/** `Text` que respeta el tamaño de letra elegido en Más → Accesibilidad. */
export function Text(props: TextProps) {
  const { tamanoTexto } = usePreferencias();
  const anidado = useContext(DentroDeTexto);
  return (
    <DentroDeTexto.Provider value={true}>
      <TextoRN maxFontSizeMultiplier={1.6} {...props} style={estiloEscalado(props.style, ESCALAS[tamanoTexto], anidado)} />
    </DentroDeTexto.Provider>
  );
}

/**
 * `TextInput` que respeta el tamaño de letra elegido.
 * En web móvil, Safari hace zoom al enfocar un campo con letra menor de 16 px, así que se fija ese mínimo,
 * y `minWidth: 0` deja que el campo se encoja dentro de una fila en pantallas estrechas.
 */
export function TextInput(props: TextInputProps) {
  const { tamanoTexto } = usePreferencias();
  const escalado = (StyleSheet.flatten(estiloEscalado(props.style as TextProps['style'], ESCALAS[tamanoTexto], false)) ?? {}) as TextStyle;
  const web = Platform.OS === 'web';
  const estilo: TextStyle = web
    ? { ...escalado, fontSize: Math.max(escalado.fontSize ?? TAMANO_POR_DEFECTO, 16), minWidth: escalado.minWidth ?? 0 }
    : escalado;
  return <EntradaRN maxFontSizeMultiplier={1.6} {...props} style={estilo} />;
}
