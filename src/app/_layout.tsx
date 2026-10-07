/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, View, ActivityIndicator, Platform } from 'react-native';
import { useDisposicion } from '../layout';
import { cargarCategoriasExtra } from '../categorias';
import { vigilarErrores } from '../errores';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import LoginScreen from '../components/LoginScreen';
import Bloqueo from '../components/Bloqueo';
import Intro from '../components/Intro';
import BarraInferior from '../components/BarraInferior';
import Onboarding from '../components/Onboarding';
import { contarGastos, contarPendientes, marcarOnboarding, onboardingHecho, onCambioPendientes, usarBaseDeUsuario } from '../db';
import { descargarGastosDeLaNube, sincronizarCaptaciones, sincronizarPerfil } from '../sync';
import { generarRecurrentes } from '../recurrentes';
import { aplicarAportesAutomaticos } from '../metas';
import { avisarPendientesNuevos, comprobarPresupuestos, pedirPermisoAvisos } from '../avisos';
import { bloqueoActivado } from '../seguridad';
import { useTema } from '../tema';
import type { Session } from '@supabase/supabase-js';

// El splash nativo se queda hasta que las fuentes están listas, para que no haya un salto de tipografía.
SplashScreen.preventAutoHideAsync().catch(() => {});

const OCULTAS = ['categorias', 'atajos', 'recurrentes', 'metas', 'compartidos', 'informe', 'reglas', 'nuevo', 'bienvenida'] as const;

function conTiempoMaximo<T>(promesa: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promesa, new Promise<undefined>((resolver) => setTimeout(() => resolver(undefined), ms))]);
}

export default function RootLayout() {
  const tema = useTema();
  const [fuentesListas, errorFuentes] = useFonts({ Manrope_700Bold, Manrope_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const fuentesOk = fuentesListas || !!errorFuentes;
  useEffect(() => {
    if (fuentesOk) SplashScreen.hideAsync().catch(() => {});
  }, [fuentesOk]);
  // En un ordenador (web ancha) el menú pasa a un lado y el contenido se centra con un ancho cómodo; en el móvil no cambia nada.
  const { escritorio, amplio } = useDisposicion();
  useEffect(() => {
    vigilarErrores();
  }, []);

  // En la web, el color de la barra del navegador y el fondo de la página siguen al tema de la app.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.getElementById('tema-color')?.setAttribute('content', tema.fondo);
    document.documentElement.style.backgroundColor = tema.fondo;
  }, [tema.fondo]);
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [intro, setIntro] = useState(true);
  const [perfilListo, setPerfilListo] = useState(false);
  const [, refrescarAlta] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  // Id de la cuenta ya desbloqueada: el bloqueo es por usuario y se vuelve a pedir tras un rato fuera.
  const [desbloqueado, setDesbloqueado] = useState<string | null>(null);
  const userActivo = useRef<string | null>(null);
  const salidaEn = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sesion) => {
      setSession(sesion);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Cada cuenta usa su propia base local: varias personas pueden compartir dispositivo sin pisarse.
  // Se cambia de base durante el render para que ninguna pantalla lea la base de otro usuario.
  const userId = session?.user.id ?? null;
  if (userId && userActivo.current !== userId) {
    usarBaseDeUsuario(userId);
    cargarCategoriasExtra();
    userActivo.current = userId;
  }

  // Antes de enseñar la app se comprueba si esta cuenta ya hizo el alta (aquí o en otro dispositivo).
  useEffect(() => {
    if (!userId) {
      setPerfilListo(false);
      return;
    }
    let activo = true;
    (async () => {
      await conTiempoMaximo(sincronizarPerfil().catch(() => {}), 4000);
      // Quien ya tenía movimientos no necesita el alta: puede fijar su dinero inicial desde Más.
      if (!onboardingHecho() && contarGastos() > 0) marcarOnboarding();
      if (activo) setPerfilListo(true);
    })();
    return () => {
      activo = false;
    };
  }, [userId]);

  useEffect(() => {
    setPendientes(contarPendientes());
    return onCambioPendientes(() => setPendientes(contarPendientes()));
  }, [userId]);

  // Sincronización, recurrentes y avisos: al abrir, al volver a la app y cada 30 s.
  useEffect(() => {
    if (!session) return;
    const refrescar = async () => {
      const nuevos = await sincronizarCaptaciones().catch(() => 0);
      avisarPendientesNuevos(nuevos);
    };
    const completo = async () => {
      await descargarGastosDeLaNube().catch(() => {});
      await generarRecurrentes().catch(() => 0);
      try {
        aplicarAportesAutomaticos();
      } catch {
        // las metas no deben impedir el arranque
      }
      comprobarPresupuestos();
      await refrescar();
    };
    pedirPermisoAvisos();
    completo();
    const intervalo = setInterval(refrescar, 30000);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        if (bloqueoActivado() && salidaEn.current && Date.now() - salidaEn.current > 20000) setDesbloqueado(null);
        salidaEn.current = null;
        completo();
      } else if (salidaEn.current === null) {
        salidaEn.current = Date.now();
      }
    });
    return () => {
      clearInterval(intervalo);
      sub.remove();
    };
  }, [session]);

  const cargandoVista = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tema.fondo }}>
      <ActivityIndicator size="large" color={tema.primario} />
    </View>
  );

  let contenido;
  if (cargando || !fuentesOk) {
    contenido = cargandoVista;
  } else if (!session) {
    contenido = <LoginScreen />;
  } else if (!perfilListo) {
    contenido = cargandoVista;
  } else if (!onboardingHecho()) {
    contenido = <Onboarding onTerminar={() => refrescarAlta((n) => n + 1)} />;
  } else if (bloqueoActivado() && desbloqueado !== userId) {
    contenido = <Bloqueo onDesbloquear={() => setDesbloqueado(userId)} />;
  } else {
    contenido = (
      <>
        <StatusBar style="auto" />
        <Tabs
          backBehavior="history"
          tabBar={escritorio ? undefined : (props) => <BarraInferior {...props} />}
          screenLayout={
            escritorio
              ? ({ children }) => (
                  <View style={{ flex: 1, alignItems: 'center', backgroundColor: tema.fondo }}>
                    <View style={{ flex: 1, width: '100%', maxWidth: amplio ? 1240 : 880 }}>{children}</View>
                  </View>
                )
              : undefined
          }
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            transitionSpec: { animation: 'timing', config: { duration: 180 } },
            ...(escritorio ? { tabBarPosition: 'left' as const, tabBarVariant: 'material' as const } : {}),
            tabBarActiveTintColor: tema.primario,
            tabBarInactiveTintColor: tema.textoSuave,
            tabBarStyle: escritorio
              ? { backgroundColor: tema.tarjeta, borderRightColor: tema.borde, borderRightWidth: 1, width: 220, paddingTop: 24 }
              : { backgroundColor: tema.tarjeta, borderTopColor: tema.borde },
            tabBarLabelStyle: escritorio ? { fontWeight: '600', fontSize: 15 } : { fontWeight: '600', fontSize: 11 },
            sceneStyle: { backgroundColor: tema.fondo },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Movimientos',
              tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="pendientes"
            options={{
              title: 'Pendientes',
              tabBarBadge: pendientes > 0 ? pendientes : undefined,
              tabBarBadgeStyle: { backgroundColor: tema.peligro, color: '#fff' },
              tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="presupuesto"
            options={{
              title: 'Resumen',
              tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="ajustes"
            options={{
              title: 'Más',
              tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />,
            }}
          />
          {OCULTAS.map((nombre) => (
            <Tabs.Screen key={nombre} name={nombre} options={nombre === 'bienvenida' ? { href: null, tabBarStyle: { display: 'none' } } : { href: null }} />
          ))}
        </Tabs>
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {contenido}
      {intro && fuentesOk ? <Intro onFin={() => setIntro(false)} /> : null}
    </View>
  );
}
