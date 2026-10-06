/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Tamaños de la web: en el móvil y en ventanas estrechas no cambia nada.
 * - escritorio (≥ 900 px): el menú pasa a un lado y el contenido se centra.
 * - amplio (≥ 1100 px): además se reparte en columnas.
 */
export function useDisposicion() {
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web';
  return { escritorio: web && width >= 900, amplio: web && width >= 1100 };
}
