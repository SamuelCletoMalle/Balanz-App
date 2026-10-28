/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Texto';
import { Tarjeta } from './ui';
import { formatoEuro, infoCategoria, tintaCategoria, useTema } from '../tema';

const HUECO = 2; // separación entre porciones, en unidades del círculo

/** 0,237 → "24 %" (y "<1 %" si es muy pequeño). */
export function formatoPorcentaje(parte: number): string {
  const p = parte * 100;
  if (p > 0 && p < 1) return '<1 %';
  return `${Math.round(p)} %`;
}

/** Reparto del gasto por categoría: un donut con el total en el centro y debajo cada categoría con su porcentaje. */
export default function DonutCategorias({
  filas,
  titulo = 'Gasto por categoría',
  horizontal = false,
}: {
  filas: { categoria: string; total: number }[];
  titulo?: string;
  /** Donut a la izquierda y la leyenda (solo nombre y porcentaje) a la derecha: para el panel de ordenador. */
  horizontal?: boolean;
}) {
  const tema = useTema();
  // En el panel de ordenador el donut es más pequeño para dejar sitio a la leyenda.
  const TAM = horizontal ? 124 : 150;
  const R = Math.round(TAM * 0.386);
  const GROSOR = horizontal ? 18 : 22;
  const LONGITUD = 2 * Math.PI * R;
  const orden = [...filas].filter((f) => f.total > 0).sort((a, b) => b.total - a.total);
  const total = orden.reduce((s, f) => s + f.total, 0);

  let acumulado = 0;
  const trozos = orden.map((f) => {
    const parte = f.total / total;
    const trozo = { ...f, parte, inicio: acumulado, cat: infoCategoria(f.categoria) };
    acumulado += parte;
    return trozo;
  });

  return (
    <Tarjeta style={{ gap: 14 }}>
      <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>{titulo}</Text>
      {orden.length === 0 ? (
        <Text style={{ color: tema.textoSuave, fontSize: 13 }}>Cuando añadas gastos en este mes, verás aquí cómo se reparte tu dinero.</Text>
      ) : (
        <View style={horizontal ? { flexDirection: 'row', alignItems: 'center', gap: 18 } : { gap: 14 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: TAM, height: TAM, alignSelf: 'center' }} accessible accessibilityLabel={`Gastado ${formatoEuro(total)}`}>
            <Svg width={TAM} height={TAM} viewBox={`0 0 ${TAM} ${TAM}`}>
              <G transform={`rotate(-90 ${TAM / 2} ${TAM / 2})`}>
                <Circle cx={TAM / 2} cy={TAM / 2} r={R} stroke={tema.tarjetaSuave} strokeWidth={GROSOR} fill="none" />
                {trozos.map((t) => {
                  const largo = Math.max(t.parte * LONGITUD - (trozos.length > 1 ? HUECO : 0), 1);
                  return (
                    <Circle
                      key={t.categoria}
                      cx={TAM / 2}
                      cy={TAM / 2}
                      r={R}
                      stroke={tintaCategoria(t.cat.color, tema.oscuro)}
                      strokeWidth={GROSOR}
                      fill="none"
                      strokeDasharray={`${largo} ${LONGITUD}`}
                      strokeDashoffset={-t.inicio * LONGITUD}
                    />
                  );
                })}
              </G>
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }} pointerEvents="none">
              <Text style={{ color: tema.textoSuave, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>GASTADO</Text>
              <Text style={{ color: tema.texto, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] }}>{formatoEuro(total)}</Text>
            </View>
          </View>

          <View style={[{ gap: horizontal ? 7 : 10 }, horizontal ? { flex: 1 } : null]}>
            {trozos.map((t) => (
              <View key={t.categoria} style={{ flexDirection: 'row', alignItems: 'center', gap: horizontal ? 8 : 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tintaCategoria(t.cat.color, tema.oscuro) }} />
                {horizontal ? null : <Ionicons name={t.cat.icono} size={16} color={tintaCategoria(t.cat.color, tema.oscuro)} />}
                <Text style={{ color: tema.texto, fontSize: horizontal ? 13 : 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {t.categoria}
                </Text>
                <Text style={{ color: tema.textoSuave, fontSize: 13, fontVariant: ['tabular-nums'] }}>{formatoPorcentaje(t.parte)}</Text>
                {horizontal ? null : (
                  <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '700', minWidth: 84, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{formatoEuro(t.total)}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </Tarjeta>
  );
}
