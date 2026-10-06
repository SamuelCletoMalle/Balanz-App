/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '../components/Texto';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import Logo from './Logo';
import { useTema } from '../tema';

export default function LoginScreen() {
  const tema = useTema();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modoRegistro, setModoRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const enviar = async () => {
    if (!email.trim() || !password) return;
    setCargando(true);
    setError('');
    setAviso('');
    if (modoRegistro) {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setError(error.message);
      else setAviso('Te hemos enviado un correo de confirmación. Revisa tu bandeja de entrada.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message);
    }
    setCargando(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: tema.fondo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logo}>
        <Logo size={88} />
      </View>
      <Text style={[styles.marca, { color: tema.texto }]}>Balanz</Text>
      <Text style={[styles.subtitulo, { color: tema.textoSuave }]}>
        {modoRegistro ? 'Crea tu cuenta para guardar tus gastos' : 'Controla tus gastos sin esfuerzo'}
      </Text>

      <View style={{ gap: 12, marginTop: 24 }}>
        <View style={[styles.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          <Ionicons name="mail-outline" size={18} color={tema.textoSuave} />
          <TextInput
            style={[styles.input, { color: tema.texto }]}
            placeholder="Email"
            placeholderTextColor={tema.textoSuave}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={[styles.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
          <Ionicons name="lock-closed-outline" size={18} color={tema.textoSuave} />
          <TextInput
            style={[styles.input, { color: tema.texto }]}
            placeholder="Contraseña"
            placeholderTextColor={tema.textoSuave}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={enviar}
          />
        </View>

        {error ? <Text style={[styles.mensaje, { color: tema.peligro }]}>{error}</Text> : null}
        {aviso ? <Text style={[styles.mensaje, { color: tema.exito }]}>{aviso}</Text> : null}

        <TouchableOpacity accessibilityRole="button"
          style={[styles.boton, { backgroundColor: tema.primario, opacity: cargando ? 0.7 : 1 }]}
          onPress={enviar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color={tema.primarioTexto} />
          ) : (
            <Text style={{ color: tema.primarioTexto, fontSize: 16, fontWeight: '800' }}>
              {modoRegistro ? 'Registrarse' : 'Iniciar sesión'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button"
          onPress={() => {
            setModoRegistro(!modoRegistro);
            setError('');
            setAviso('');
          }}
          style={{ alignItems: 'center', padding: 8 }}
        >
          <Text style={{ color: tema.primario, fontWeight: '600' }}>
            {modoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { alignSelf: 'center' },
  marca: { fontSize: 36, fontWeight: '800', letterSpacing: -1, textAlign: 'center', marginTop: 14 },
  subtitulo: { fontSize: 15, textAlign: 'center', marginTop: 4 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 16 },
  mensaje: { fontSize: 13, textAlign: 'center' },
  boton: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
