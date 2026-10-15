/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Texto';
import { Boton, EstadoVacio, Tarjeta } from './ui';
import { planPorMeses, MesPlan } from '../recurrentes';
import { NOMBRES_MES } from '../db';
import { formatoEuro, infoCategoria, tintaCategoria, useTema } from '../tema';

const MESES_VISTOS = 12;

/** El plan de los próximos meses: qué se paga, qué entra y cuánto se aparta, mes a mes. */
export default function PlanMeses() {
  const tema = useTema();
  const router = useRouter();
  const [plan, setPlan] = useState<MesPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      setPlan(planPorMeses(MESES_VISTOS));
    }, [])
  );

  const hayAlgo = plan.some((m) => m.items.length > 0);
  const totalGastos = plan.reduce((s, m) => s + m.gastos, 0);
  const irAFijos = () => router.push('/planes?vista=fijos');

  if (!hayAlgo) {
    return (
      <EstadoVacio
        icono="calendar-outline"
        titulo="Planifica tus pagos"
        texto="Añade tus pagos fijos (alquiler, suscripciones, plazos del móvil…) y aquí verás qué te toca pagar cada mes."
        accion={{ texto: 'Planificar un pago', onPress: irAFijos }}
      />
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 120 }}>
      <Tarjeta nivel={2} style={{ gap: 4 }}>
        <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>PREVISTO EN LOS PRÓXIMOS {MESES_VISTOS} MESES</Text>
        <Text style={{ color: tema.texto, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] }}>{formatoEuro(totalGastos)}</Text>
        <Text style={{ color: tema.textoSuave, fontSize: 13 }}>
          En pagos fijos y plazos. Para un pago a plazos (un móvil en 12 cuotas, por ejemplo) añádelo en Fijos y elige cuántos pagos son.
        </Text>
        <View style={{ marginTop: 8 }}>
          <Boton texto="Planificar un pago" icono="add" variante="secundario" onPress={irAFijos} />
        </View>
      </Tarjeta>

      {plan.map((m, i) => {
        const [anio, mm] = m.mes.split('-');
        const nombre = NOMBRES_MES[Number(mm) - 1];
        return (
          <Tarjeta key={m.mes} style={{ gap: 10 }}>
            <View style={styles.cabecera}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tema.texto, fontSize: 17, fontWeight: '800' }}>
                  {nombre.charAt(0).toUpperCase() + nombre.slice(1)} {anio}
                </Text>
                {i === 0 ? <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Lo que queda por apuntar este mes</Text> : null}
              </View>
              {m.items.length > 0 ? (
                <Text style={{ color: tema.texto, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{formatoEuro(m.gastos)}</Text>
              ) : (
                <Text style={{ color: tema.textoSuave, fontSize: 13 }}>Sin pagos previstos</Text>
              )}
            </View>
            {m.items.map((it) => {
              const cat = it.tipo === 'ahorro' ? null : infoCategoria(it.categoria);
              const color = cat ? tintaCategoria(cat.color, tema.oscuro) : tema.primario;
              return (
                <View key={`${m.mes}-${it.id}-${it.tipo}`} style={styles.fila}>
                  <View style={[styles.icono, { backgroundColor: color + '22' }]}>
                    <Ionicons name={it.tipo === 'ahorro' ? 'flag-outline' : cat!.icono} size={16} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                      {it.descripcion}
                    </Text>
                    <Text style={{ color: tema.textoSuave, fontSize: 12 }}>{it.tipo === 'ahorro' ? 'Se aparta para tu meta' : `Día ${it.dia}`}</Text>
                  </View>
                  <Text
                    style={{
                      color: it.tipo === 'ingreso' ? tema.exito : it.tipo === 'ahorro' ? tema.textoSuave : tema.texto,
                      fontSize: 15,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {it.tipo === 'ingreso' ? '+' : it.tipo === 'gasto' ? '-' : ''}
                    {formatoEuro(it.importe)}
                  </Text>
                </View>
              );
            })}
            {m.items.length > 0 && (m.ingresos > 0 || m.ahorro > 0) ? (
              <View style={[styles.pie, { borderTopColor: tema.borde }]}>
                {m.ingresos > 0 ? <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Entra {formatoEuro(m.ingresos)}</Text> : null}
                {m.ahorro > 0 ? <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Ahorro {formatoEuro(m.ahorro)}</Text> : null}
                {m.ingresos > 0 ? (
                  <Text style={{ color: m.neto >= 0 ? tema.exito : tema.peligro, fontSize: 12, fontWeight: '700', marginLeft: 'auto' }}>
                    Queda {m.neto >= 0 ? '+' : ''}
                    {formatoEuro(m.neto)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Tarjeta>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
