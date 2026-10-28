/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { View } from 'react-native';
import { Text } from './Texto';
import { Tarjeta } from './ui';
import { MESES_CORTOS, useTema } from '../tema';

const ALTO = 120;

/** Gasto de los últimos meses en barras; el último mes (el actual) va destacado. */
export default function BarrasMeses({ meses, titulo = 'Últimos 6 meses' }: { meses: { mes: string; total: number }[]; titulo?: string }) {
  const tema = useTema();
  const tope = Math.max(...meses.map((m) => m.total), 1);
  const resaltado = tema.oscuro ? tema.acento : tema.texto;
  return (
    <Tarjeta style={{ gap: 12 }}>
      <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: ALTO + 34 }}>
        {meses.map((m, i) => {
          const actual = i === meses.length - 1;
          const alto = m.total > 0 ? Math.max((m.total / tope) * ALTO, 6) : 4;
          return (
            <View key={m.mes} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }} accessible accessibilityLabel={`${MESES_CORTOS[Number(m.mes.slice(5, 7)) - 1]}: ${Math.round(m.total)} euros`}>
              <Text style={{ color: actual ? tema.texto : tema.textoSuave, fontSize: 11, fontWeight: actual ? '800' : '600', fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                {m.total > 0 ? Math.round(m.total).toLocaleString('es-ES') : ''}
              </Text>
              <View style={{ width: '100%', maxWidth: 38, height: alto, borderRadius: 7, backgroundColor: actual ? resaltado : tema.tarjetaSuave, opacity: actual ? 1 : 0.9 }} />
              <Text style={{ color: tema.textoSuave, fontSize: 11, fontWeight: '600' }}>{MESES_CORTOS[Number(m.mes.slice(5, 7)) - 1]}</Text>
            </View>
          );
        })}
      </View>
    </Tarjeta>
  );
}
