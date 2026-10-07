/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Texto';
import { Alert } from '../dialogos';
import { anadirCategoria, COLORES_CATEGORIA, ICONOS_CATEGORIA } from '../categorias';
import { Tema } from '../tema';

/** Mini formulario para crear una categoría: nombre, icono y color. */
export default function NuevaCategoria({ tema, onCreada, onCancelar }: { tema: Tema; onCreada: (nombre: string) => void; onCancelar?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState(ICONOS_CATEGORIA[0]);
  const [color, setColor] = useState(COLORES_CATEGORIA[0]);

  const crear = () => {
    const r = anadirCategoria(nombre, icono, color);
    if (!r.ok) {
      Alert.alert('Revisa el nombre', r.motivo);
      return;
    }
    onCreada(nombre.trim().replace(/\s+/g, ' ').slice(0, 24));
    setNombre('');
  };

  return (
    <View style={[styles.caja, { backgroundColor: tema.tarjetaSuave }]}>
      <TextInput
        accessibilityLabel="Nombre de la categoría"
        style={[styles.input, { backgroundColor: tema.tarjeta, color: tema.texto }]}
        placeholder="Nombre (ej. Mascotas)"
        placeholderTextColor={tema.textoSuave}
        value={nombre}
        onChangeText={setNombre}
        maxLength={24}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {ICONOS_CATEGORIA.map((i) => (
          <TouchableOpacity
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Icono ${i.replace('-outline', '')}`}
            accessibilityState={{ selected: icono === i }}
            onPress={() => setIcono(i)}
            style={[styles.icono, { backgroundColor: icono === i ? color : tema.tarjeta }]}
          >
            <Ionicons name={i} size={20} color={icono === i ? '#fff' : tema.textoSuave} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {COLORES_CATEGORIA.map((c) => (
          <TouchableOpacity
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Color ${c}`}
            accessibilityState={{ selected: color === c }}
            onPress={() => setColor(c)}
            style={[styles.color, { backgroundColor: c, borderColor: color === c ? tema.texto : 'transparent' }]}
          >
            {color === c ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {onCancelar ? (
          <TouchableOpacity accessibilityRole="button" onPress={onCancelar} style={[styles.boton, { backgroundColor: tema.tarjeta }]}>
            <Text style={{ color: tema.texto, fontWeight: '700' }}>Cancelar</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity accessibilityRole="button" onPress={crear} style={[styles.boton, { backgroundColor: tema.primario, flex: 1 }]}>
          <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Crear categoría</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderRadius: 18, padding: 12, gap: 10 },
  input: { borderRadius: 12, padding: 12, fontSize: 16 },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  color: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 2 },
  boton: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
});
