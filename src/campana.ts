/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { getConfig, setConfig } from './db';

// El tintineo de la campanita de "pagos por revisar". Si el móvil está en silencio o el navegador no deja sonar
// todavía (hasta que se toca la pantalla), simplemente no suena: nunca debe romper nada.
let reproductor: AudioPlayer | null | undefined;

/** Ajustes de la campanita: el sonido y la vibración se pueden apagar por separado (por defecto, encendidos). */
export function sonidoCampanaActivado(): boolean {
  return getConfig('campana_sonido') !== 'off';
}
export function vibracionCampanaActivada(): boolean {
  return getConfig('campana_vibracion') !== 'off';
}
export function activarSonidoCampana(on: boolean) {
  setConfig('campana_sonido', on ? 'on' : 'off');
}
export function activarVibracionCampana(on: boolean) {
  setConfig('campana_vibracion', on ? 'on' : 'off');
}

export function sonarCampana() {
  if (!sonidoCampanaActivado()) return;
  try {
    if (reproductor === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      reproductor = createAudioPlayer(require('../assets/sonidos/campana.wav'));
      reproductor.volume = 0.6;
    }
    if (!reproductor) return;
    reproductor.seekTo(0).catch(() => {});
    reproductor.play();
  } catch {
    reproductor = null;
  }
}
