/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Platform, ViewStyle } from 'react-native';

/**
 * Estilo "Liquid Glass": superficie translúcida con el fondo desenfocado detrás (solo web: el móvil no tiene
 * `backdropFilter`, allí la translucidez se ve sobre el resplandor del fondo), borde de luz y reflejo en el canto de arriba.
 * `oscuro` elige entre cristal sobre fondo oscuro y cristal sobre fondo claro; `fuerza` sube o baja lo opaco que es.
 */
export function cristal(oscuro: boolean, fuerza: 1 | 2 | 3 = 1): ViewStyle {
  const alfaOscuro = [0.05, 0.075, 0.1][fuerza - 1];
  const alfaClaro = [0.6, 0.7, 0.8][fuerza - 1];
  const base: ViewStyle = oscuro
    ? {
        backgroundColor: `rgba(255,255,255,${alfaOscuro})`,
        borderColor: 'rgba(255,255,255,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.32)',
      }
    : {
        backgroundColor: `rgba(255,255,255,${alfaClaro})`,
        borderColor: 'rgba(255,255,255,0.85)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 26px rgba(30,40,90,0.10)',
      };
  if (Platform.OS === 'web') {
    return { ...base, backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)' } as unknown as ViewStyle;
  }
  return base;
}

/** El mismo cristal para una pastilla pequeña (el indicador de la pestaña activa): más claro y con más brillo arriba. */
export function lente(oscuro: boolean): ViewStyle {
  return oscuro
    ? { backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 14px rgba(68,82,255,0.25)' }
    : { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 14px rgba(30,40,90,0.14)' };
}

/** En alto contraste no hay cristal: superficies sólidas y bordes marcados. */
export const esContraste = (borde: string) => borde === '#ffffff' || borde === '#000000';
