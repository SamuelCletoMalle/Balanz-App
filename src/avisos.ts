/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getConfig, setConfig, getLimite, getPresupuestosCategoria, getTotalMesActual, getGastosPorCategoriaMesActual, mesActual } from './db';
import { formatoEuro } from './tema';

type ModuloNotificaciones = typeof import('expo-notifications');

// expo-notifications lanza un error al importarse en Expo Go (Android). Se carga bajo demanda y
// dentro de un try/catch para que, si no está disponible, la app funcione igual sin avisos.
let modulo: ModuloNotificaciones | null | undefined;

function notificaciones(): ModuloNotificaciones | null {
  if (modulo !== undefined) return modulo;
  // Metro muestra el error de la librería aunque se capture, así que en Expo Go (Android) ni se carga.
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    modulo = null;
    return modulo;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('expo-notifications') as ModuloNotificaciones;
    m.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    modulo = m;
  } catch {
    modulo = null;
  }
  return modulo;
}

export function avisosActivados(): boolean {
  return getConfig('avisos') !== 'off';
}

export function activarAvisos(on: boolean) {
  setConfig('avisos', on ? 'on' : 'off');
}

export async function pedirPermisoAvisos(): Promise<boolean> {
  const N = notificaciones();
  if (!N) return false;
  try {
    const actual = await N.getPermissionsAsync();
    if (actual.granted) return true;
    const nuevo = await N.requestPermissionsAsync();
    return nuevo.granted;
  } catch {
    return false;
  }
}

export async function notificar(titulo: string, cuerpo: string) {
  if (!avisosActivados()) return;
  const N = notificaciones();
  if (!N) return;
  try {
    const permiso = await N.getPermissionsAsync();
    if (!permiso.granted) return;
    await N.scheduleNotificationAsync({ content: { title: titulo, body: cuerpo }, trigger: null });
  } catch {
    // las notificaciones nunca deben romper la app
  }
}

export function avisarPendientesNuevos(n: number) {
  if (n <= 0) return;
  notificar(
    n === 1 ? 'Nuevo gasto detectado' : `${n} gastos detectados`,
    'Ábrelo en Balanz para revisarlo y añadirlo.'
  );
}

/** Avisa al cruzar el 80 % y el 100 % del presupuesto global o de una categoría (una vez por mes y umbral). */
export function comprobarPresupuestos() {
  if (!avisosActivados()) return;
  const mes = mesActual();

  const revisar = (clave: string, nombre: string, gastado: number, limite: number) => {
    if (limite <= 0) return;
    const ratio = gastado / limite;
    const umbral = ratio >= 1 ? 100 : ratio >= 0.8 ? 80 : 0;
    if (!umbral) return;
    const marca = `alerta:${mes}:${clave}`;
    const previo = parseInt(getConfig(marca) ?? '0', 10);
    if (previo >= umbral) return;
    setConfig(marca, String(umbral));
    notificar(
      umbral === 100 ? `Has superado el presupuesto de ${nombre}` : `Llevas el 80 % del presupuesto de ${nombre}`,
      `${formatoEuro(gastado)} de ${formatoEuro(limite)} este mes.`
    );
  };

  revisar('global', 'este mes', getTotalMesActual(), getLimite());
  const presupuestos = getPresupuestosCategoria();
  getGastosPorCategoriaMesActual().forEach((c) => {
    if (presupuestos[c.categoria]) revisar(`cat:${c.categoria}`, c.categoria, c.total, presupuestos[c.categoria]);
  });
}
