/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, FadeIn, FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text, TextInput } from './Texto';
import Logo from './Logo';
import Presionable from './Presionable';
import { usePreferencias } from '../accesibilidad';
import { CURVAS } from '../logo';
import { exito, seleccion } from '../haptics';
import { FondosIniciales, SIN_FONDOS, getFondosIniciales, getLimite, marcarOnboarding, setFondosIniciales, setLimite, sumaFondos } from '../db';
import { subirPerfil } from '../sync';
import { formatoEuro, IconoNombre, Tema, useTema } from '../tema';

const SALIDA = Easing.bezier(...CURVAS.salida);

export function aNumero(texto: string): number {
  const n = parseFloat(texto.replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

const CAMPOS: { clave: keyof FondosIniciales; icono: IconoNombre; titulo: string; ayuda: string }[] = [
  { clave: 'efectivo', icono: 'cash-outline', titulo: 'Efectivo', ayuda: 'En la cartera' },
  { clave: 'banco', icono: 'card-outline', titulo: 'Cuenta bancaria', ayuda: 'Tu cuenta corriente' },
  { clave: 'ahorros', icono: 'trending-up-outline', titulo: 'Ahorros', ayuda: 'Hucha o inversiones' },
];

function CampoDinero({
  tema,
  icono,
  titulo,
  ayuda,
  valor,
  onCambio,
}: {
  tema: Tema;
  icono: IconoNombre;
  titulo: string;
  ayuda: string;
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <View style={[estilos.campo, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
      <View style={[estilos.campoIcono, { backgroundColor: tema.primario + '1f' }]}>
        <Ionicons name={icono} size={22} color={tema.primario} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>{titulo}</Text>
        <Text style={{ color: tema.textoSuave, fontSize: 12 }}>{ayuda}</Text>
      </View>
      <View style={estilos.campoImporte}>
        <TextInput
          accessibilityLabel={`${titulo}, importe en euros`}
          style={{ color: tema.texto, fontSize: 20, fontWeight: '700', textAlign: 'right', width: 104, padding: 0 }}
          placeholder="0"
          placeholderTextColor={tema.textoSuave}
          keyboardType="decimal-pad"
          value={valor}
          onChangeText={onCambio}
        />
        <Text style={{ color: tema.textoSuave, fontSize: 18, fontWeight: '600', marginLeft: 4 }}>€</Text>
      </View>
    </View>
  );
}

/** Los tres campos de dinero inicial con su total. Se usa en el alta y en Más → Dinero inicial. */
export function FondosForm({ valores, onCambio, conTotal = true }: { valores: Record<keyof FondosIniciales, string>; onCambio: (clave: keyof FondosIniciales, v: string) => void; conTotal?: boolean }) {
  const tema = useTema();
  const total = aNumero(valores.efectivo) + aNumero(valores.banco) + aNumero(valores.ahorros);
  return (
    <View style={{ gap: 10 }}>
      {CAMPOS.map((c) => (
        <CampoDinero key={c.clave} tema={tema} icono={c.icono} titulo={c.titulo} ayuda={c.ayuda} valor={valores[c.clave]} onCambio={(v) => onCambio(c.clave, v)} />
      ))}
      {conTotal ? (
        <View style={[estilos.total, { backgroundColor: tema.primario }]} accessibilityLabel={`Total: ${formatoEuro(total)}`}>
          <Text style={{ color: tema.primarioTexto, fontSize: 13, fontWeight: '700', opacity: 0.85 }}>DINERO TOTAL</Text>
          <Text style={{ color: tema.primarioTexto, fontSize: 34, fontWeight: '800', letterSpacing: -0.8 }}>{formatoEuro(total)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function textoAFondos(v: Record<keyof FondosIniciales, string>): FondosIniciales {
  return { efectivo: aNumero(v.efectivo), banco: aNumero(v.banco), ahorros: aNumero(v.ahorros) };
}

export function fondosATexto(f: FondosIniciales): Record<keyof FondosIniciales, string> {
  const t = (n: number) => (n > 0 ? String(n).replace('.', ',') : '');
  return { efectivo: t(f.efectivo), banco: t(f.banco), ahorros: t(f.ahorros) };
}

const LIMITES_RAPIDOS = [500, 800, 1200, 1500, 2000];

function Punto({ activo, tema }: { activo: boolean; tema: Tema }) {
  return <View style={[estilos.punto, { backgroundColor: activo ? tema.primario : tema.borde, opacity: activo ? 1 : 0.7 }]} />;
}

export default function Onboarding({ onTerminar, soloVista = false }: { onTerminar: () => void; soloVista?: boolean }) {
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const [paso, setPaso] = useState(0);
  const [fondos, setFondos] = useState(() => fondosATexto(getFondosIniciales()));
  const [limite, setLimiteTexto] = useState(() => (getLimite() > 0 ? String(getLimite()) : ''));
  const [guardado, setGuardado] = useState(false);

  const entrada = reducirMovimiento ? FadeIn.duration(150) : FadeInRight.duration(260).easing(SALIDA);
  const salida = reducirMovimiento ? undefined : FadeOutLeft.duration(150);

  const total = sumaFondos(textoAFondos(fondos));

  const terminarAlta = (guardarDatos: boolean) => {
    if (soloVista) {
      // Vista previa: se enseña el recorrido completo sin guardar nada.
      if (guardarDatos) setGuardado(true);
      else onTerminar();
      return;
    }
    if (guardarDatos) {
      setFondosIniciales(textoAFondos(fondos));
      const l = aNumero(limite);
      if (l > 0) setLimite(l);
    } else {
      setFondosIniciales({ ...SIN_FONDOS });
    }
    marcarOnboarding();
    subirPerfil().catch(() => {});
    if (guardarDatos) {
      exito();
      setGuardado(true);
    } else {
      onTerminar();
    }
  };

  const siguiente = () => {
    seleccion();
    if (paso < 2) setPaso(paso + 1);
    else terminarAlta(true);
  };

  // Pantalla final: marca que se dibuja con un resorte y entrada automática a la app.
  const marca = useSharedValue(reducirMovimiento ? 1 : 0.6);
  useEffect(() => {
    if (!guardado) return;
    marca.set(withSpring(1, { duration: 450, dampingRatio: 0.6 }));
    const t = setTimeout(onTerminar, reducirMovimiento ? 700 : 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardado]);
  const estiloMarca = useAnimatedStyle(() => ({ transform: [{ scale: marca.get() }], opacity: Math.min(1, marca.get() * 1.4) }));

  if (guardado) {
    return (
      <View style={[estilos.raiz, { backgroundColor: tema.fondo, alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <Animated.View style={[estiloMarca, estilos.exito, { backgroundColor: tema.exito }]}>
          <Ionicons name="checkmark" size={56} color="#ffffff" />
        </Animated.View>
        <Animated.View entering={reducirMovimiento ? FadeIn : FadeIn.delay(200).duration(300)} style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[estilos.titulo, { color: tema.texto }]}>¡Todo listo!</Text>
          {total > 0 ? (
            <Text style={{ color: tema.textoSuave, fontSize: 15 }}>Empiezas con {formatoEuro(total)}</Text>
          ) : (
            <Text style={{ color: tema.textoSuave, fontSize: 15 }}>Ya puedes anotar tu primer movimiento</Text>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[estilos.raiz, { backgroundColor: tema.fondo }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={estilos.cabecera}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Paso ${paso + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <Punto key={i} activo={i <= paso} tema={tema} />
          ))}
        </View>
        <Presionable accessibilityLabel="Omitir la configuración inicial" onPress={() => terminarAlta(false)} style={{ padding: 8 }}>
          <Text style={{ color: tema.textoSuave, fontSize: 14, fontWeight: '600' }}>Omitir</Text>
        </Presionable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <Animated.View key={paso} entering={entrada} exiting={salida} style={estilos.contenido}>
          {paso === 0 ? (
            <View style={{ gap: 20 }}>
              <Logo size={84} />
              <View style={{ gap: 8 }}>
                <Text style={[estilos.titulo, { color: tema.texto }]}>Bienvenido a Balanz</Text>
                <Text style={[estilos.subtitulo, { color: tema.textoSuave }]}>Vamos a dejarlo listo en menos de un minuto.</Text>
              </View>
              {[
                { i: 'swap-vertical-outline' as IconoNombre, t: 'Anota gastos e ingresos', d: 'En dos toques, desde el móvil o la web.' },
                { i: 'flash-outline' as IconoNombre, t: 'Capta tus pagos solo', d: 'Apple Pay o SMS del banco aparecen para confirmar.' },
                { i: 'flag-outline' as IconoNombre, t: 'Controla y ahorra', d: 'Presupuestos, metas y un informe cada mes.' },
              ].map((f) => (
                <View key={f.t} style={estilos.fila}>
                  <View style={[estilos.campoIcono, { backgroundColor: tema.primario + '1f' }]}>
                    <Ionicons name={f.i} size={22} color={tema.primario} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>{f.t}</Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 13 }}>{f.d}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {paso === 1 ? (
            <View style={{ gap: 18 }}>
              <View style={{ gap: 8 }}>
                <Text style={[estilos.titulo, { color: tema.texto }]}>¿Con cuánto dinero empiezas?</Text>
                <Text style={[estilos.subtitulo, { color: tema.textoSuave }]}>
                  Suma lo que tienes ahora y verás tu saldo real desde el primer día. Puedes cambiarlo luego en Más.
                </Text>
              </View>
              <FondosForm conTotal={false} valores={fondos} onCambio={(c, v) => setFondos({ ...fondos, [c]: v })} />
            </View>
          ) : null}

          {paso === 2 ? (
            <View style={{ gap: 18 }}>
              <View style={{ gap: 8 }}>
                <Text style={[estilos.titulo, { color: tema.texto }]}>¿Cuánto quieres gastar al mes?</Text>
                <Text style={[estilos.subtitulo, { color: tema.textoSuave }]}>Es opcional. Te avisaremos al llegar al 80 % y al pasarte.</Text>
              </View>
              <View style={[estilos.limite, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}>
                <TextInput
                  accessibilityLabel="Límite mensual en euros"
                  style={{ color: tema.texto, fontSize: 40, fontWeight: '800', letterSpacing: -1, flex: 1, textAlign: 'center', padding: 0 }}
                  placeholder="0"
                  placeholderTextColor={tema.textoSuave}
                  keyboardType="decimal-pad"
                  value={limite}
                  onChangeText={setLimiteTexto}
                />
                <Text style={{ color: tema.textoSuave, fontSize: 28, fontWeight: '700' }}>€</Text>
              </View>
              <View style={estilos.chips}>
                {LIMITES_RAPIDOS.map((v) => {
                  const activo = aNumero(limite) === v;
                  return (
                    <Presionable
                      key={v}
                      accessibilityLabel={`Poner ${v} euros`}
                      accessibilityState={{ selected: activo }}
                      onPress={() => {
                        seleccion();
                        setLimiteTexto(String(v));
                      }}
                      style={[estilos.chip, { backgroundColor: activo ? tema.primario : tema.tarjeta, borderColor: activo ? tema.primario : tema.borde }]}
                    >
                      <Text style={{ color: activo ? tema.primarioTexto : tema.texto, fontSize: 14, fontWeight: '700' }}>{v} €</Text>
                    </Presionable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={estilos.pie}>
        {paso === 1 ? (
          <View style={[estilos.totalPie, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]} accessibilityLabel={`Dinero total: ${formatoEuro(total)}`}>
            <Text style={{ color: tema.textoSuave, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>DINERO TOTAL</Text>
            <Text style={{ color: tema.texto, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] }}>{formatoEuro(total)}</Text>
          </View>
        ) : null}
        <Presionable
          onPress={siguiente}
          accessibilityLabel={paso === 2 ? 'Empezar a usar Balanz' : 'Continuar'}
          style={[estilos.boton, { backgroundColor: tema.primario }]}
        >
          <Text style={{ color: tema.primarioTexto, fontSize: 17, fontWeight: '800' }}>{paso === 2 ? 'Empezar' : 'Continuar'}</Text>
          <Ionicons name={paso === 2 ? 'checkmark' : 'arrow-forward'} size={20} color={tema.primarioTexto} />
        </Presionable>
        {paso > 0 ? (
          <Presionable accessibilityLabel="Volver al paso anterior" onPress={() => setPaso(paso - 1)} style={{ padding: 10, alignItems: 'center' }}>
            <Text style={{ color: tema.textoSuave, fontSize: 14, fontWeight: '600' }}>Atrás</Text>
          </Presionable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, paddingTop: 56 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, minHeight: 44 },
  punto: { width: 28, height: 6, borderRadius: 3 },
  contenido: { flex: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12 },
  titulo: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, lineHeight: 36 },
  subtitulo: { fontSize: 15, lineHeight: 22 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1, padding: 14 },
  campoIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  campoImporte: { flexDirection: 'row', alignItems: 'center' },
  total: { borderRadius: 22, padding: 18, gap: 2, marginTop: 4 },
  totalPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  limite: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { paddingHorizontal: 24, paddingBottom: 28, paddingTop: 8, gap: 4 },
  boton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exito: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
});
