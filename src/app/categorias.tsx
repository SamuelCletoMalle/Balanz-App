/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Texto';
import NuevaCategoria from '../components/NuevaCategoria';
import { Alert } from '../dialogos';
import { quitarCategoria, esCategoriaPropia } from '../categorias';
import { subirPerfil } from '../sync';
import { getCategorias, useTema } from '../tema';
import { arriba } from '../layout';

export default function CategoriasScreen() {
  const tema = useTema();
  const router = useRouter();
  const [, refrescar] = useState(0);
  const [creando, setCreando] = useState(false);

  useFocusEffect(useCallback(() => refrescar((n) => n + 1), []));

  const borrar = (nombre: string) =>
    Alert.alert('Borrar categoría', `Los movimientos que ya tenías en “${nombre}” se quedan, y se verán como “Otros”.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          quitarCategoria(nombre);
          subirPerfil().catch(() => {});
          refrescar((n) => n + 1);
        },
      },
    ]);

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <View style={styles.cabecera}>
        <Text style={[styles.titulo, { color: tema.texto }]}>Categorías</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Nueva categoría" style={[styles.nuevo, { backgroundColor: tema.primario }]} onPress={() => setCreando((v) => !v)}>
          <Ionicons name={creando ? 'close' : 'add'} size={22} color={tema.primarioTexto} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: tema.textoSuave, fontSize: 13, marginBottom: 8 }}>
        Las que vienen de serie no se pueden borrar. Crea las tuyas (Mascotas, Regalos, Niños…) y salen al apuntar un gasto.
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        {creando ? (
          <NuevaCategoria
            tema={tema}
            onCreada={() => {
              subirPerfil().catch(() => {});
              setCreando(false);
              refrescar((n) => n + 1);
            }}
            onCancelar={() => setCreando(false)}
          />
        ) : null}
        <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
          {getCategorias().map((c, i, todas) => (
            <View key={c.nombre} style={[styles.fila, i < todas.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tema.borde }]}>
              <View style={[styles.icono, { backgroundColor: c.color + '22' }]}>
                <Ionicons name={c.icono} size={19} color={c.color} />
              </View>
              <Text style={{ flex: 1, color: tema.texto, fontWeight: '600', fontSize: 15 }}>{c.nombre}</Text>
              {esCategoriaPropia(c.nombre) ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Borrar ${c.nombre}`} onPress={() => borrar(c.nombre)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={tema.peligro} />
                </TouchableOpacity>
              ) : (
                <Text style={{ color: tema.textoSuave, fontSize: 12 }}>De serie</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(56), paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 30, fontWeight: '800' },
  nuevo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 22, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icono: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
