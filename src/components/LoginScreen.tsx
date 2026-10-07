/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { Text, TextInput } from '../components/Texto';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import Logo from './Logo';
import Halo from './Halo';
import { Boton, useQuieto } from './ui';
import { CURVAS } from '../logo';
import { useTema } from '../tema';

const SALIDA = Easing.bezier(...CURVAS.salida);

export default function LoginScreen() {
  const tema = useTema();
  const quieto = useQuieto();
  const entra = (i: number) => (quieto ? undefined : FadeInDown.delay(i * 70).duration(380).easing(SALIDA));
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
      <View pointerEvents="none" style={styles.halo}>
        <Halo size={620} color="#bef264" intensidad={tema.oscuro ? 0.16 : 0.32} />
      </View>
      <View style={styles.columna}>
      <Animated.View entering={entra(0)} style={styles.logo}>
        <Logo size={88} aro={tema.oscuro ? '#0a0a0a' : '#000000'} />
      </Animated.View>
      <Animated.View entering={entra(1)}>
        <Text style={[styles.marca, { color: tema.texto }]}>Balanz</Text>
        <Text style={[styles.subtitulo, { color: tema.textoSuave }]}>
          {modoRegistro ? 'Crea tu cuenta para guardar tus gastos.' : 'Tu dinero, en equilibrio.'}
        </Text>
      </Animated.View>

      <Animated.View entering={entra(2)} style={{ gap: 12, marginTop: 28 }}>
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

        <Boton texto={modoRegistro ? 'Registrarse' : 'Iniciar sesión'} onPress={enviar} cargando={cargando} deshabilitado={!email.trim() || !password} />

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
      </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  columna: { width: '100%', maxWidth: 400 },
  halo: { position: 'absolute', top: '50%', left: '50%', marginTop: -380, marginLeft: -310 },
  logo: { alignSelf: 'center' },
  marca: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center', marginTop: 16 },
  subtitulo: { fontSize: 15, textAlign: 'center', marginTop: 4 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 54 },
  input: { flex: 1, fontSize: 16 },
  mensaje: { fontSize: 13, textAlign: 'center' },
  boton: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
