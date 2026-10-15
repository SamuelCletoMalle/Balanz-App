/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Texto';
import Logo from './Logo';
import Halo from './Halo';
import { Boton } from './ui';
import { supabase } from '../supabase';
import { problemaContrasena, traducirError } from '../autenticacion';
import { useTema } from '../tema';

/**
 * Pantalla a la que lleva el enlace del correo de "recuperar contraseña": se elige una contraseña nueva.
 * Al abrir el enlace Supabase ya ha iniciado sesión de forma temporal; esta pantalla solo la cambia.
 */
export default function RecuperarContrasena({ onTerminar }: { onTerminar: (mensaje: string) => void }) {
  const tema = useTema();
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [ver, setVer] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    const problema = problemaContrasena(nueva);
    if (problema) return setError(problema);
    if (nueva !== repetida) return setError('Las dos contraseñas no coinciden.');
    setCargando(true);
    setError('');
    const { error: fallo } = await supabase.auth.updateUser({ password: nueva });
    setCargando(false);
    if (fallo) return setError(traducirError(fallo.message));
    onTerminar('Contraseña cambiada. Ya puedes usar Balanz con la nueva.');
  };

  const cancelar = async () => {
    await supabase.auth.signOut().catch(() => {});
    onTerminar('');
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fondo }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View pointerEvents="none" style={styles.halo}>
        <Halo size={620} color="#bef264" intensidad={tema.oscuro ? 0.16 : 0.32} />
      </View>
      <View style={styles.columna}>
        <View style={{ alignSelf: 'center' }}>
          <Logo size={72} aro={tema.oscuro ? '#0a0a0a' : '#000000'} />
        </View>
        <Text style={[styles.titulo, { color: tema.texto }]}>Elige una contraseña nueva</Text>
        <Text style={[styles.subtitulo, { color: tema.textoSuave }]}>Mínimo 10 caracteres, con letras y números.</Text>

        <View style={{ gap: 12, marginTop: 24 }}>
          <View style={[styles.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <Ionicons name="lock-closed-outline" size={18} color={tema.textoSuave} />
            <TextInput
              style={[styles.input, { color: tema.texto }]}
              placeholder="Contraseña nueva"
              placeholderTextColor={tema.textoSuave}
              secureTextEntry={!ver}
              autoCapitalize="none"
              autoComplete="new-password"
              value={nueva}
              onChangeText={setNueva}
            />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={ver ? 'Ocultar contraseña' : 'Ver contraseña'} onPress={() => setVer(!ver)} hitSlop={10}>
              <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={20} color={tema.textoSuave} />
            </TouchableOpacity>
          </View>
          <View style={[styles.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <Ionicons name="lock-closed-outline" size={18} color={tema.textoSuave} />
            <TextInput
              style={[styles.input, { color: tema.texto }]}
              placeholder="Repite la contraseña"
              placeholderTextColor={tema.textoSuave}
              secureTextEntry={!ver}
              autoCapitalize="none"
              autoComplete="new-password"
              value={repetida}
              onChangeText={setRepetida}
              onSubmitEditing={guardar}
            />
          </View>
          {error ? <Text style={[styles.mensaje, { color: tema.peligro }]}>{error}</Text> : null}
          <Boton texto="Guardar contraseña" onPress={guardar} cargando={cargando} deshabilitado={!nueva || !repetida} />
          <TouchableOpacity accessibilityRole="button" onPress={cancelar} style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: tema.primario, fontWeight: '600' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  columna: { width: '100%', maxWidth: 400 },
  halo: { position: 'absolute', top: '50%', left: '50%', marginTop: -380, marginLeft: -310 },
  titulo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center', marginTop: 16 },
  subtitulo: { fontSize: 15, textAlign: 'center', marginTop: 6 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 54 },
  input: { flex: 1, fontSize: 16 },
  mensaje: { fontSize: 13, textAlign: 'center' },
});
