/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Alert as AlertNativo, AlertButton, Platform } from 'react-native';

/**
 * `Alert.alert` de React Native no hace nada en web. Este sustituto usa el Alert nativo en el móvil
 * y los cuadros del navegador (alert / confirm) en web, con la misma forma de llamarlo.
 */
export const Alert = {
  alert(titulo: string, mensaje?: string, botones?: AlertButton[]) {
    if (Platform.OS !== 'web') {
      AlertNativo.alert(titulo, mensaje, botones);
      return;
    }
    const texto = [titulo, mensaje].filter(Boolean).join('\n\n');
    if (!botones || botones.length <= 1) {
      window.alert(texto);
      botones?.[0]?.onPress?.();
      return;
    }
    const cancelar = botones.find((b) => b.style === 'cancel');
    const aceptar = botones.find((b) => b !== cancelar);
    if (window.confirm(texto)) aceptar?.onPress?.();
    else cancelar?.onPress?.();
  },
};
