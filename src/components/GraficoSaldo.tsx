/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from './Texto';
import { MESES_CORTOS, Tema, formatoEuro } from '../tema';
import type { PuntoSaldo } from '../evolucion';

const ALTO = 150;
const MARGEN = 10;

/** Línea con la evolución del saldo mes a mes; los meses proyectados van discontinuos. */
export default function GraficoSaldo({ tema, puntos }: { tema: Tema; puntos: PuntoSaldo[] }) {
  const [ancho, setAncho] = useState(0);
  if (puntos.length < 2) return null;

  const valores = puntos.map((p) => p.saldo);
  const min = Math.min(...valores, 0);
  const max = Math.max(...valores, 1);
  const rango = max - min || 1;
  const x = (i: number) => MARGEN + (i / (puntos.length - 1)) * Math.max(ancho - MARGEN * 2, 1);
  const y = (v: number) => MARGEN + (1 - (v - min) / rango) * (ALTO - MARGEN * 2);
  const reales = puntos.filter((p) => !p.proyectado);
  const camino = (lista: PuntoSaldo[], desde: number) => lista.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(desde + i).toFixed(1)} ${y(p.saldo).toFixed(1)}`).join(' ');
  const trazoReal = camino(reales, 0);
  // La parte proyectada arranca en el último punto real para que la línea no tenga hueco.
  const trazoProyectado = puntos.some((p) => p.proyectado) ? camino(puntos.slice(reales.length - 1), reales.length - 1) : '';
  const area = `${trazoReal} L${x(reales.length - 1).toFixed(1)} ${ALTO} L${x(0).toFixed(1)} ${ALTO} Z`;
  const ceroY = min < 0 ? y(0) : null;
  const etiquetaMes = (p: PuntoSaldo) => MESES_CORTOS[Number(p.mes.slice(5)) - 1];
  const indices = Array.from(new Set([0, Math.floor((puntos.length - 1) / 2), puntos.length - 1]));

  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Evolución del saldo. Ahora ${formatoEuro(reales[reales.length - 1].saldo)}`}>
      {ancho > 0 ? (
        <Svg width={ancho} height={ALTO}>
          <Defs>
            <LinearGradient id="areaSaldo" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tema.primario} stopOpacity={0.28} />
              <Stop offset="1" stopColor={tema.primario} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ceroY !== null ? <Path d={`M${MARGEN} ${ceroY} H${ancho - MARGEN}`} stroke={tema.borde} strokeWidth={1} strokeDasharray="4 4" /> : null}
          <Path d={area} fill="url(#areaSaldo)" />
          <Path d={trazoReal} stroke={tema.primario} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {trazoProyectado ? <Path d={trazoProyectado} stroke={tema.primario} strokeWidth={3} fill="none" strokeDasharray="6 6" strokeLinecap="round" opacity={0.6} /> : null}
          <Circle cx={x(reales.length - 1)} cy={y(reales[reales.length - 1].saldo)} r={5} fill={tema.primario} />
          {puntos.some((p) => p.proyectado) ? <Circle cx={x(puntos.length - 1)} cy={y(puntos[puntos.length - 1].saldo)} r={4} fill={tema.fondo} stroke={tema.primario} strokeWidth={2} /> : null}
        </Svg>
      ) : (
        <View style={{ height: ALTO }} />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {indices.map((i) => (
          <Text key={puntos[i].mes} style={{ color: tema.textoSuave, fontSize: 11, fontWeight: '600' }}>
            {etiquetaMes(puntos[i])}
            {puntos[i].proyectado ? ' (previsión)' : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}
