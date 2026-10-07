/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from './Texto';
import { useQuieto } from './ui';
import { CURVAS } from '../logo';
import { MESES_CORTOS, Tema, formatoEuro } from '../tema';
import type { PuntoSaldo } from '../evolucion';

const ALTO = 160;
const MARGEN = 12;
const SALIDA = Easing.bezier(...CURVAS.salida);
const TrazoAnimado = Animated.createAnimatedComponent(Path);

/**
 * Línea con la evolución del saldo mes a mes; los meses proyectados van discontinuos.
 * Se dibuja al aparecer y, al tocarla (o pasar el ratón), marca el mes más cercano con su saldo.
 */
export default function GraficoSaldo({ tema, puntos }: { tema: Tema; puntos: PuntoSaldo[] }) {
  const quieto = useQuieto();
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState<number | null>(null);
  const soltar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progreso = useSharedValue(quieto ? 1 : 0);

  useEffect(() => {
    if (ancho <= 0) return;
    progreso.set(quieto ? 1 : withTiming(1, { duration: 900, easing: SALIDA }));
  }, [ancho, quieto, progreso]);

  const n = puntos.length;
  const valores = puntos.map((p) => p.saldo);
  const min = Math.min(...valores, 0);
  const max = Math.max(...valores, 1);
  const rango = max - min || 1;
  const util = Math.max(ancho - MARGEN * 2, 1);
  const x = (i: number) => MARGEN + (i / Math.max(n - 1, 1)) * util;
  const y = (v: number) => MARGEN + (1 - (v - min) / rango) * (ALTO - MARGEN * 2);
  const reales = puntos.filter((p) => !p.proyectado);
  const largo = reales.reduce((suma, p, i) => (i === 0 ? 0 : suma + Math.hypot(x(i) - x(i - 1), y(p.saldo) - y(reales[i - 1].saldo))), 0) + 2;

  const propsLinea = useAnimatedProps(() => ({ strokeDashoffset: largo * (1 - progreso.get()) }));
  const propsArea = useAnimatedProps(() => ({ opacity: progreso.get() }));
  const propsProyectado = useAnimatedProps(() => ({ opacity: 0.6 * Math.max(0, progreso.get() * 2 - 1) }));

  if (n < 2) return null;

  const linea = tema.oscuro ? tema.acento : '#18181b';
  const camino = (lista: PuntoSaldo[], desde: number) => lista.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(desde + i).toFixed(1)} ${y(p.saldo).toFixed(1)}`).join(' ');
  const trazoReal = camino(reales, 0);
  // La parte proyectada arranca en el último punto real para que la línea no tenga hueco.
  const hayProyeccion = puntos.some((p) => p.proyectado);
  const trazoProyectado = hayProyeccion ? camino(puntos.slice(reales.length - 1), reales.length - 1) : '';
  const area = `${trazoReal} L${x(reales.length - 1).toFixed(1)} ${ALTO} L${x(0).toFixed(1)} ${ALTO} Z`;
  const ceroY = min < 0 ? y(0) : null;
  const etiquetaMes = (p: PuntoSaldo) => MESES_CORTOS[Number(p.mes.slice(5)) - 1];
  const indices = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));
  const sel = activo !== null ? puntos[activo] : null;

  const elegir = (px: number) => {
    const i = Math.round(((px - MARGEN) / util) * (n - 1));
    setActivo(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <View
      accessible
      accessibilityLabel={`Evolución del saldo. Ahora ${formatoEuro(reales[reales.length - 1].saldo)}`}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      {sel ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: -4, left: Math.min(Math.max(x(activo!) - 60, 0), Math.max(ancho - 120, 0)), width: 120, alignItems: 'center', zIndex: 2 }}>
          <View style={{ backgroundColor: tema.elevada, borderColor: tema.borde, borderWidth: 1, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, alignItems: 'center' }}>
            <Text style={{ color: tema.textoSuave, fontSize: 11, fontWeight: '600' }}>
              {etiquetaMes(sel)}
              {sel.proyectado ? ' · previsión' : ''}
            </Text>
            <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatoEuro(sel.saldo)}</Text>
          </View>
        </View>
      ) : null}
      {ancho > 0 ? (
        <View
          style={{ height: ALTO }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            if (soltar.current) clearTimeout(soltar.current);
            elegir(e.nativeEvent.locationX);
          }}
          onResponderMove={(e) => elegir(e.nativeEvent.locationX)}
          onResponderRelease={() => {
            soltar.current = setTimeout(() => setActivo(null), 1600);
          }}
        >
          <Svg width={ancho} height={ALTO}>
            <Defs>
              <LinearGradient id="areaSaldo" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={linea} stopOpacity={0.3} />
                <Stop offset="1" stopColor={linea} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ceroY !== null ? <Path d={`M${MARGEN} ${ceroY} H${ancho - MARGEN}`} stroke={tema.borde} strokeWidth={1} strokeDasharray="4 4" /> : null}
            <TrazoAnimado d={area} fill="url(#areaSaldo)" animatedProps={propsArea} />
            <TrazoAnimado
              d={trazoReal}
              stroke={linea}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${largo} ${largo}`}
              animatedProps={propsLinea}
            />
            {trazoProyectado ? (
              <TrazoAnimado d={trazoProyectado} stroke={linea} strokeWidth={3} fill="none" strokeDasharray="6 6" strokeLinecap="round" animatedProps={propsProyectado} />
            ) : null}
            {sel ? <Line x1={x(activo!)} x2={x(activo!)} y1={MARGEN} y2={ALTO - MARGEN} stroke={tema.borde} strokeWidth={1} /> : null}
            <Circle cx={x(reales.length - 1)} cy={y(reales[reales.length - 1].saldo)} r={5} fill={linea} />
            {hayProyeccion ? <Circle cx={x(n - 1)} cy={y(puntos[n - 1].saldo)} r={4} fill={tema.fondo} stroke={linea} strokeWidth={2} /> : null}
            {sel ? <Circle cx={x(activo!)} cy={y(sel.saldo)} r={6} fill={tema.fondo} stroke={linea} strokeWidth={3} /> : null}
          </Svg>
        </View>
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
