/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../components/Texto';
import { Ionicons } from '@expo/vector-icons';
import { autenticar } from '../seguridad';
import { useTema } from '../tema';

export default function Bloqueo({ onDesbloquear }: { onDesbloquear: () => void }) {
  const tema = useTema();

  const intentar = useCallback(async () => {
    if (await autenticar()) onDesbloquear();
  }, [onDesbloquear]);

  useEffect(() => {
    intentar();
  }, [intentar]);

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <View style={[styles.icono, { backgroundColor: tema.primario }]}>
        <Ionicons name="lock-closed" size={38} color={tema.primarioTexto} />
      </View>
      <Text style={[styles.titulo, { color: tema.texto }]}>Balanz bloqueado</Text>
      <Text style={{ color: tema.textoSuave, textAlign: 'center' }}>Usa Face ID, tu huella o el código del móvil.</Text>
      <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.primario }]} onPress={intentar}>
        <Ionicons name="finger-print" size={20} color={tema.primarioTexto} />
        <Text style={{ color: tema.primarioTexto, fontWeight: '800', fontSize: 16 }}>Desbloquear</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  icono: { width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 26, borderRadius: 16, marginTop: 14 },
});
