/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { Text } from './Texto';
import { Barra, useContador } from './ui';
import { cambiarPreferencias, usePreferencias } from '../accesibilidad';
import { CURVAS } from '../logo';
import { formatoEuro, useTema } from '../tema';

const SALIDA = Easing.bezier(...CURVAS.salida);

type Props = { saldo: number; totalMes: number; ingresosMes: number; limite: number; sincronizando?: boolean };

/** La tarjeta de marca con el saldo total, lo gastado e ingresado este mes y cómo va el límite. */
export default function TarjetaSaldo({ saldo, totalMes, ingresosMes, limite, sincronizando }: Props) {
  const tema = useTema();
  const { reducirMovimiento, ocultarImportes } = usePreferencias();
  const porcentaje = limite > 0 ? Math.min(totalMes / limite, 1) : 0;
  const tinta = tema.marcaTexto;
  const heroClaro = tinta !== '#ffffff';
  const puntoHero = heroClaro ? 'rgba(10,10,10,0.10)' : 'rgba(255,255,255,0.2)';
  const barraHero = heroClaro ? 'rgba(10,10,10,0.14)' : 'rgba(255,255,255,0.25)';
  // Sobre la lima los colores de estado necesitan ser más oscuros que en el resto de la app.
  const colorBarra = limite > 0 && totalMes > limite ? '#b91c1c' : porcentaje > 0.8 ? '#b45309' : '#166534';
  const saldoAnimado = useContador(saldo);
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
        <Text style={[styles.etiqueta, { color: tinta }]}>Saldo total {sincronizando ? '· sincronizando…' : ''}</Text>
        <Text accessibilityLabel={`Saldo total ${formatoEuro(saldo)}`} style={[styles.importe, { color: tinta }]}>
          {formatoEuro(saldoAnimado)}
        </Text>
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
  etiqueta: { fontSize: 13, fontWeight: '600', opacity: 0.85, letterSpacing: 0.2 },
  importe: { fontSize: 42, fontWeight: '800', letterSpacing: -1.2, marginTop: -8, fontVariant: ['tabular-nums'] },
  fila: { flexDirection: 'row', gap: 12 },
  dato: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  punto: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mini: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  miniImporte: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  barraFondo: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  pie: { fontSize: 13, fontWeight: '600', opacity: 0.85 },
});
