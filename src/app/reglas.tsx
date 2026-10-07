/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback } from 'react';
import { arriba } from '../layout';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/Texto';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getReglas, borrarRegla } from '../db';
import { infoCategoria, useTema } from '../tema';

export default function ReglasScreen() {
  const tema = useTema();
  const router = useRouter();
  const [reglas, setReglas] = useState<{ clave: string; categoria: string }[]>([]);
  const recargar = useCallback(() => setReglas(getReglas()), []);
  useFocusEffect(recargar);

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: tema.texto }]}>Categorías aprendidas</Text>
      <Text style={{ color: tema.textoSuave, fontSize: 13, marginBottom: 10 }}>
        Balanz recuerda la categoría que eliges para cada comercio y la aplica solo la próxima vez.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {reglas.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
            <Ionicons name="sparkles-outline" size={52} color={tema.textoSuave} />
            <Text style={{ color: tema.textoSuave, textAlign: 'center' }}>Todavía no ha aprendido nada.{'\n'}Añade gastos y lo irá recordando.</Text>
          </View>
        ) : (
          <View style={[styles.grupo, { backgroundColor: tema.tarjeta }]}>
            {reglas.map((r, i) => {
              const cat = infoCategoria(r.categoria);
              return (
                <View
                  key={r.clave}
                  style={[styles.fila, i < reglas.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tema.borde }]}
                >
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontWeight: '700', fontSize: 15, textTransform: 'capitalize' }} numberOfLines={1}>
                      {r.clave}
                    </Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 12 }}>→ {r.categoria}</Text>
                  </View>
                  <TouchableOpacity accessibilityRole="button"
                    onPress={() => {
                      borrarRegla(r.clave);
                      recargar();
                    }}
                    hitSlop={10}
                    accessibilityLabel="Olvidar esta regla"
                  >
                    <Ionicons name="close-circle" size={22} color={tema.textoSuave} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(56), paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  titulo: { fontSize: 30, fontWeight: '800', marginBottom: 4 },
  grupo: { borderRadius: 22, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icono: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
