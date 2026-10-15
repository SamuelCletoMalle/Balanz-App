/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from './Texto';
import { Barra, useContador } from './ui';
import { cambiarPreferencias, usePreferencias } from '../accesibilidad';
import { CURVAS } from '../logo';
import { getConfig, setConfig } from '../db';
import { seleccion } from '../haptics';
import { formatoEuro, useTema } from '../tema';

const SALIDA = Easing.bezier(...CURVAS.salida);

type Props = {
  /** Dinero total (cuenta + efectivo + ahorros). */
  saldo: number;
  /** Dinero por cuenta (`banco`, `efectivo`, `ahorros`). */
  cuentas: Record<string, number>;
  totalMes: number;
  ingresosMes: number;
  limite: number;
  sincronizando?: boolean;
};

// El orden es el del deslizado: Cuenta bancaria → Efectivo → Ahorros.
const ORDEN = [
  { id: 'banco', nombre: 'Cuenta bancaria', corto: 'Cuenta', icono: 'card-outline' },
  { id: 'efectivo', nombre: 'Efectivo', corto: 'Efectivo', icono: 'cash-outline' },
  { id: 'ahorros', nombre: 'Ahorros', corto: 'Ahorros', icono: 'wallet-outline' },
] as const;

const SALTO = 36;
const FUERA_MS = 110;
const DENTRO_MS = 190;

/**
 * La tarjeta de marca: arriba, en grande, el dinero de una cuenta; debajo, las otras dos. Tocar una de las pequeñas
 * o deslizar hacia los lados intercambia los papeles. Después, lo gastado e ingresado este mes y cómo va el límite.
 */
export default function TarjetaSaldo({ saldo, cuentas, totalMes, ingresosMes, limite, sincronizando }: Props) {
  const tema = useTema();
  const { reducirMovimiento, ocultarImportes } = usePreferencias();
  const porcentaje = limite > 0 ? Math.min(totalMes / limite, 1) : 0;
  const tinta = tema.marcaTexto;
  const heroClaro = tinta !== '#ffffff';
  const puntoHero = heroClaro ? 'rgba(10,10,10,0.10)' : 'rgba(255,255,255,0.2)';
  const barraHero = heroClaro ? 'rgba(10,10,10,0.14)' : 'rgba(255,255,255,0.25)';
  // Sobre la lima los colores de estado necesitan ser más oscuros que en el resto de la app.
  const colorBarra = limite > 0 && totalMes > limite ? '#b91c1c' : porcentaje > 0.8 ? '#b45309' : '#166534';

  const [indice, setIndice] = useState(() => {
    const guardado = ORDEN.findIndex((c) => c.id === getConfig('saldo_cuenta'));
    return guardado >= 0 ? guardado : 0;
  });
  const enCurso = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    []
  );

  const x = useSharedValue(0);
  const opacidad = useSharedValue(1);
  const estiloPagina = useAnimatedStyle(() => ({ opacity: opacidad.get(), transform: [{ translateX: x.get() }] }));

  /** Cambia a la cuenta `destino`. `sentido` 1 = viene de la derecha (se desliza hacia la izquierda). */
  const ir = useCallback(
    (destino: number, sentido: 1 | -1) => {
      if (destino === indice || destino < 0 || destino >= ORDEN.length || enCurso.current) return;
      seleccion();
      setConfig('saldo_cuenta', ORDEN[destino].id);
      if (reducirMovimiento) {
        setIndice(destino);
        return;
      }
      enCurso.current = true;
      x.set(withTiming(-sentido * SALTO, { duration: FUERA_MS, easing: Easing.in(Easing.quad) }));
      opacidad.set(withTiming(0, { duration: FUERA_MS }));
      temporizador.current = setTimeout(() => {
        setIndice(destino);
        x.set(sentido * SALTO);
        x.set(withTiming(0, { duration: DENTRO_MS, easing: SALIDA }));
        opacidad.set(withTiming(1, { duration: DENTRO_MS }));
        temporizador.current = setTimeout(() => {
          enCurso.current = false;
        }, DENTRO_MS);
      }, FUERA_MS);
    },
    [indice, reducirMovimiento, x, opacidad]
  );

  // Deslizar de derecha a izquierda pasa a la siguiente cuenta; de izquierda a derecha, a la anterior.
  const deslizar = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -40 || e.velocityX < -450) ir(indice + 1, 1);
      else if (e.translationX > 40 || e.velocityX > 450) ir(indice - 1, -1);
    });

  const principal = ORDEN[indice];
  const otras = ORDEN.map((c, i) => ({ ...c, i })).filter((c) => c.i !== indice);
  const importePrincipal = useContador(cuentas[principal.id] ?? 0);
  const gastadoAnimado = useContador(totalMes);
  const ingresosAnimados = useContador(ingresosMes);

  return (
    <Animated.View entering={reducirMovimiento ? undefined : FadeInDown.duration(380).easing(SALIDA)}>
      <LinearGradient colors={tema.marca} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View pointerEvents="none" style={styles.brillo} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={ocultarImportes ? 'Mostrar los importes' : 'Ocultar los importes'}
          onPress={() => cambiarPreferencias({ ocultarImportes: !ocultarImportes })}
          hitSlop={12}
          style={styles.ojo}
        >
          <Ionicons name={ocultarImportes ? 'eye-off-outline' : 'eye-outline'} size={22} color={tinta} />
        </TouchableOpacity>

        <GestureDetector gesture={deslizar}>
          <Animated.View style={[{ gap: 14 }, estiloPagina]}>
            <View style={styles.etiquetaFila}>
              <Ionicons name={principal.icono} size={15} color={tinta} style={{ opacity: 0.85 }} />
              <Text style={[styles.etiqueta, { color: tinta }]}>
                {principal.nombre} {sincronizando ? '· sincronizando…' : ''}
              </Text>
            </View>
            <Text accessibilityLabel={`${principal.nombre} ${formatoEuro(cuentas[principal.id] ?? 0)}`} style={[styles.importe, { color: tinta }]}>
              {formatoEuro(importePrincipal)}
            </Text>
            <View style={styles.partes}>
              {otras.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.nombre} ${formatoEuro(cuentas[c.id] ?? 0)}. Toca para verla en grande`}
                  onPress={() => ir(c.i, c.i > indice ? 1 : -1)}
                  style={[styles.parte, { backgroundColor: puntoHero }]}
                >
                  <View style={styles.parteCabecera}>
                    <Ionicons name={c.icono} size={13} color={tinta} />
                    <Text style={[styles.mini, { color: tinta }]} numberOfLines={1}>
                      {c.corto}
                    </Text>
                  </View>
                  <Text style={[styles.parteImporte, { color: tinta }]} numberOfLines={1}>
                    {formatoEuro(cuentas[c.id] ?? 0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </GestureDetector>

        <View style={styles.puntosFila}>
          <View style={styles.puntos} accessibilityLabel={`Cuenta ${indice + 1} de ${ORDEN.length}`}>
            {ORDEN.map((c, i) => (
              <View key={c.id} style={[styles.puntoPagina, { backgroundColor: tinta, opacity: i === indice ? 0.9 : 0.28, width: i === indice ? 18 : 6 }]} />
            ))}
          </View>
          <Text style={[styles.total, { color: tinta }]}>Total {formatoEuro(saldo)}</Text>
        </View>

        <View style={styles.fila}>
          <View style={styles.dato}>
            <View style={[styles.punto, { backgroundColor: puntoHero }]}>
              <Ionicons name="arrow-up" size={13} color={tinta} />
            </View>
            <View>
              <Text style={[styles.mini, { color: tinta }]}>Gastado este mes</Text>
              <Text style={[styles.miniImporte, { color: tinta }]}>{formatoEuro(gastadoAnimado)}</Text>
            </View>
          </View>
          <View style={styles.dato}>
            <View style={[styles.punto, { backgroundColor: puntoHero }]}>
              <Ionicons name="arrow-down" size={13} color={tinta} />
            </View>
            <View>
              <Text style={[styles.mini, { color: tinta }]}>Ingresos del mes</Text>
              <Text style={[styles.miniImporte, { color: tinta }]}>{formatoEuro(ingresosAnimados)}</Text>
            </View>
          </View>
        </View>
        {limite > 0 ? (
          <View style={{ gap: 6 }}>
            <View style={[styles.barraFondo, { backgroundColor: barraHero }]}>
              <Barra p={porcentaje} color={colorBarra} radio={4} />
            </View>
            <Text style={[styles.pie, { color: tinta }]}>
              {totalMes <= limite
                ? `Te quedan ${formatoEuro(limite - totalMes)} de tu límite de ${formatoEuro(limite)}`
                : `Te has pasado ${formatoEuro(totalMes - limite)} de tu límite`}
            </Text>
          </View>
        ) : (
          <Text style={[styles.pie, { color: tinta }]}>Fija un límite mensual en Planes</Text>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: 22, gap: 14, overflow: 'hidden' },
  brillo: { position: 'absolute', top: -70, right: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.10)' },
  ojo: { position: 'absolute', top: 16, right: 16, zIndex: 2, padding: 4 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 36 },
  etiqueta: { fontSize: 13, fontWeight: '600', opacity: 0.85, letterSpacing: 0.2 },
  importe: { fontSize: 42, fontWeight: '800', letterSpacing: -1.2, marginTop: -8, fontVariant: ['tabular-nums'] },
  partes: { flexDirection: 'row', gap: 8 },
  parte: { flex: 1, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12, gap: 2 },
  parteCabecera: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  parteImporte: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  puntosFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -2 },
  puntos: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  puntoPagina: { height: 6, borderRadius: 3 },
  total: { fontSize: 12, fontWeight: '700', opacity: 0.8, fontVariant: ['tabular-nums'] },
  fila: { flexDirection: 'row', gap: 12 },
  dato: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  punto: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mini: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  miniImporte: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  barraFondo: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  pie: { fontSize: 13, fontWeight: '600', opacity: 0.85 },
});
