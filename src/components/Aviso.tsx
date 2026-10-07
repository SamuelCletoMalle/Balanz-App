/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Texto';
import { Tema } from '../tema';

/** Aviso breve abajo ("Movimiento borrado · Deshacer") que se cierra solo. */
export default function Aviso({ tema, texto, accion, onAccion, onCerrar, ms = 6000 }: { tema: Tema; texto: string; accion?: string; onAccion?: () => void; onCerrar: () => void; ms?: number }) {
  useEffect(() => {
    const t = setTimeout(onCerrar, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);
  return (
    <View pointerEvents="box-none" style={styles.fondo}>
      <View accessibilityLiveRegion="polite" style={[styles.caja, { backgroundColor: tema.texto }]}>
        <Text style={{ color: tema.fondo, fontSize: 14, fontWeight: '600', flex: 1 }}>{texto}</Text>
        {accion && onAccion ? (
          <TouchableOpacity accessibilityRole="button" onPress={onAccion} hitSlop={10}>
            <Text style={{ color: tema.primario, fontWeight: '800', fontSize: 14 }}>{accion}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', paddingHorizontal: 16 },
  caja: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, maxWidth: 520, width: '100%' },
});
