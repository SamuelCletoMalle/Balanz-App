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
import { correoValido, problemaContrasena, traducirError, urlRedireccion } from '../autenticacion';
import Logo from './Logo';
import Halo from './Halo';
import { Boton, useQuieto } from './ui';
import { CURVAS } from '../logo';
import { useTema } from '../tema';

const SALIDA = Easing.bezier(...CURVAS.salida);

type Modo = 'entrar' | 'registro' | 'recuperar';

export default function LoginScreen() {
  const tema = useTema();
  const quieto = useQuieto();
  const entra = (i: number) => (quieto ? undefined : FadeInDown.delay(i * 70).duration(380).easing(SALIDA));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [modo, setModo] = useState<Modo>('entrar');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  // Tras registrarse o si falta confirmar el correo, se ofrece reenviar el enlace.
  const [puedeReenviar, setPuedeReenviar] = useState(false);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setError('');
    setAviso('');
    setPuedeReenviar(false);
  };

  const enviar = async () => {
    const correo = email.trim();
    if (!correo) return;
    if (!correoValido(correo)) return setError('Ese correo no parece válido. Revisa que no falte nada.');
    if (modo !== 'recuperar' && !password) return;
    setCargando(true);
    setError('');
    setAviso('');
    setPuedeReenviar(false);
    try {
      if (modo === 'registro') {
        const problema = problemaContrasena(password);
        if (problema) {
          setError(problema);
          return;
        }
        const { data, error: fallo } = await supabase.auth.signUp({ email: correo, password, options: { emailRedirectTo: urlRedireccion() } });
        if (fallo) {
          setError(traducirError(fallo.message));
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
          // Supabase no avisa de que el correo ya existe (para no dar pistas): llega con la lista de identidades vacía.
          setError('Ya existe una cuenta con ese correo. Inicia sesión o recupera la contraseña.');
        } else if (!data.session) {
          setAviso(`Te hemos enviado un correo a ${correo}. Abre el enlace para confirmar tu cuenta (mira también en spam).`);
          setPuedeReenviar(true);
        }
      } else if (modo === 'recuperar') {
        const { error: fallo } = await supabase.auth.resetPasswordForEmail(correo, { redirectTo: urlRedireccion() });
        if (fallo) setError(traducirError(fallo.message));
        else setAviso(`Si ${correo} tiene cuenta, te llegará un enlace para elegir una contraseña nueva (mira también en spam).`);
      } else {
        const { error: fallo } = await supabase.auth.signInWithPassword({ email: correo, password });
        if (fallo) {
          setError(traducirError(fallo.message));
          if (fallo.message.toLowerCase().includes('not confirmed')) setPuedeReenviar(true);
        }
      }
    } catch (e) {
      setError(traducirError(e instanceof Error ? e.message : String(e)));
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    const correo = email.trim();
    if (!correoValido(correo)) return;
    setCargando(true);
    const { error: fallo } = await supabase.auth.resend({ type: 'signup', email: correo, options: { emailRedirectTo: urlRedireccion() } });
    setCargando(false);
    if (fallo) setError(traducirError(fallo.message));
    else {
      setError('');
      setAviso(`Te hemos vuelto a enviar el correo a ${correo}.`);
    }
  };

  const subtitulo =
    modo === 'registro' ? 'Crea tu cuenta para guardar tus gastos.' : modo === 'recuperar' ? 'Te enviamos un enlace para elegir una contraseña nueva.' : 'Tu dinero, en equilibrio.';
  const textoBoton = modo === 'registro' ? 'Registrarse' : modo === 'recuperar' ? 'Enviar enlace' : 'Iniciar sesión';

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: tema.fondo }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View pointerEvents="none" style={styles.halo}>
        <Halo size={620} color="#bef264" intensidad={tema.oscuro ? 0.16 : 0.32} />
      </View>
      <View style={styles.columna}>
        <Animated.View entering={entra(0)} style={styles.logo}>
          <Logo size={88} aro={tema.oscuro ? '#0a0a0a' : '#000000'} />
        </Animated.View>
        <Animated.View entering={entra(1)}>
          <Text style={[styles.marca, { color: tema.texto }]}>Balanz</Text>
          <Text style={[styles.subtitulo, { color: tema.textoSuave }]}>{subtitulo}</Text>
        </Animated.View>

        <Animated.View entering={entra(2)} style={{ gap: 12, marginTop: 28 }}>
          <View style={[styles.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
            <Ionicons name="mail-outline" size={18} color={tema.textoSuave} />
            <TextInput
              style={[styles.input, { color: tema.texto }]}
              placeholder="Email"
              placeholderTextColor={tema.textoSuave}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={modo === 'recuperar' ? enviar : undefined}
            />
          </View>
          {modo !== 'recuperar' ? (
            <View style={[styles.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
              <Ionicons name="lock-closed-outline" size={18} color={tema.textoSuave} />
              <TextInput
                style={[styles.input, { color: tema.texto }]}
                placeholder="Contraseña"
                placeholderTextColor={tema.textoSuave}
                secureTextEntry={!ver}
                autoCapitalize="none"
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={enviar}
              />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={ver ? 'Ocultar contraseña' : 'Ver contraseña'} onPress={() => setVer(!ver)} hitSlop={10}>
                <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={20} color={tema.textoSuave} />
              </TouchableOpacity>
            </View>
          ) : null}
          {modo === 'registro' ? <Text style={[styles.ayuda, { color: tema.textoSuave }]}>Mínimo 10 caracteres, con letras y números.</Text> : null}

          {error ? (
            <Text accessibilityLiveRegion="polite" style={[styles.mensaje, { color: tema.peligro }]}>
              {error}
            </Text>
          ) : null}
          {aviso ? (
            <Text accessibilityLiveRegion="polite" style={[styles.mensaje, { color: tema.exito }]}>
              {aviso}
            </Text>
          ) : null}

          <Boton texto={textoBoton} onPress={enviar} cargando={cargando} deshabilitado={!email.trim() || (modo !== 'recuperar' && !password)} />

          {puedeReenviar ? (
            <TouchableOpacity accessibilityRole="button" onPress={reenviar} disabled={cargando} style={{ alignItems: 'center', padding: 6 }}>
              <Text style={{ color: tema.primario, fontWeight: '700' }}>Reenviar el correo de confirmación</Text>
            </TouchableOpacity>
          ) : null}

          {modo === 'entrar' ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => cambiarModo('recuperar')} style={{ alignItems: 'center', padding: 6 }}>
              <Text style={{ color: tema.textoSuave, fontWeight: '600' }}>¿Has olvidado la contraseña?</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity accessibilityRole="button" onPress={() => cambiarModo(modo === 'registro' || modo === 'recuperar' ? 'entrar' : 'registro')} style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: tema.primario, fontWeight: '600' }}>
              {modo === 'entrar' ? '¿No tienes cuenta? Regístrate' : modo === 'registro' ? '¿Ya tienes cuenta? Inicia sesión' : 'Volver a iniciar sesión'}
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
  ayuda: { fontSize: 12, textAlign: 'center', marginTop: -4 },
  mensaje: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
