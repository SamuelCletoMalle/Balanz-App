/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Una sola vibración por acción del usuario, siempre acompañada de un cambio visual
// (hay móviles sin vibración y usuarios que la tienen apagada).

function seguro(accion: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  accion().catch(() => {});
}

/** Algo cambia de valor (elegir una opción, un chip). */
export function seleccion() {
  seguro(() => Haptics.selectionAsync());
}

/** Se confirma algo con peso (guardar, añadir). */
export function toque() {
  seguro(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Operación completada. */
export function exito() {
  seguro(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
