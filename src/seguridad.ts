/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { getConfig, setConfig } from './db';

export function bloqueoActivado(): boolean {
  return getConfig('bloqueo') === 'on';
}

export function guardarBloqueo(on: boolean) {
  setConfig('bloqueo', on ? 'on' : 'off');
}

export async function biometriaDisponible(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function autenticar(motivo = 'Desbloquear Balanz'): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: motivo,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar código',
    });
    return r.success;
  } catch {
    return false;
  }
}
