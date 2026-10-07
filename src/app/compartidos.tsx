/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback, useMemo } from 'react';
import { arriba } from '../layout';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/Texto';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGastos, leerDivisiones, Gasto, Tipo } from '../db';
import { guardarMovimiento } from '../movimientos';
import { formatoEuro, formatoFecha, useTema } from '../tema';

type Deuda = { gasto: Gasto; indice: number; importe: number; pagado: boolean };

export default function CompartidosScreen() {
  const tema = useTema();
  const router = useRouter();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [verPagadas, setVerPagadas] = useState(false);

  const recargar = useCallback(() => setGastos(getGastos().filter((g) => g.divisiones)), []);
  useFocusEffect(recargar);

  const personas = useMemo(() => {
    const mapa = new Map<string, Deuda[]>();
    gastos.forEach((g) => {
      leerDivisiones(g).forEach((d, indice) => {
        mapa.set(d.nombre, [...(mapa.get(d.nombre) ?? []), { gasto: g, indice, importe: d.importe, pagado: d.pagado }]);
      });
    });
    return Array.from(mapa.entries())
      .map(([nombre, deudas]) => ({
        nombre,
        deudas,
        pendiente: deudas.filter((d) => !d.pagado).reduce((s, d) => s + d.importe, 0),
      }))
      .sort((a, b) => b.pendiente - a.pendiente);
  }, [gastos]);

  const totalPendiente = personas.reduce((s, p) => s + p.pendiente, 0);

  const marcar = (deuda: Deuda, pagado: boolean) => {
    const lista = leerDivisiones(deuda.gasto);
    lista[deuda.indice] = { ...lista[deuda.indice], pagado };
    guardarMovimiento(
      {
        descripcion: deuda.gasto.descripcion,
        categoria: deuda.gasto.categoria,
        importe: deuda.gasto.importe,
        tipo: deuda.gasto.tipo as Tipo,
        cuenta: deuda.gasto.cuenta,
        etiquetas: deuda.gasto.etiquetas,
        moneda: deuda.gasto.moneda,
        importe_original: deuda.gasto.importe_original,
        divisiones: JSON.stringify(lista),
        foto: deuda.gasto.foto,
      },
      deuda.gasto
    );
    recargar();
  };

  const saldarTodo = (nombre: string, deudas: Deuda[]) => {
    // Agrupa por gasto para no pisar cambios entre divisiones del mismo gasto.
    const porGasto = new Map<string, Deuda[]>();
    deudas.filter((d) => !d.pagado).forEach((d) => porGasto.set(d.gasto.id, [...(porGasto.get(d.gasto.id) ?? []), d]));
    porGasto.forEach((lista) => {
      const g = lista[0].gasto;
      const divs = leerDivisiones(g).map((d) => (d.nombre === nombre ? { ...d, pagado: true } : d));
      guardarMovimiento(
        {
          descripcion: g.descripcion,
          categoria: g.categoria,
          importe: g.importe,
          tipo: g.tipo as Tipo,
          cuenta: g.cuenta,
          etiquetas: g.etiquetas,
          moneda: g.moneda,
          importe_original: g.importe_original,
          divisiones: JSON.stringify(divs),
          foto: g.foto,
        },
        g
      );
    });
    recargar();
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: tema.texto }]}>Gastos compartidos</Text>
      <Text style={{ color: tema.textoSuave, fontSize: 13, marginBottom: 6 }}>
        Al crear un gasto, escribe en “Dividir con” los nombres. Aquí verás quién te debe.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        {personas.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
            <Ionicons name="people-outline" size={52} color={tema.textoSuave} />
            <Text style={{ color: tema.textoSuave, textAlign: 'center' }}>Todavía no has dividido ningún gasto.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.hero, { backgroundColor: tema.primario }]}>
              <Text style={{ color: tema.primarioTexto, fontSize: 13, fontWeight: '600', opacity: 0.85 }}>TE DEBEN EN TOTAL</Text>
              <Text style={{ color: tema.primarioTexto, fontSize: 34, fontWeight: '800' }}>{formatoEuro(totalPendiente)}</Text>
            </View>

            <TouchableOpacity accessibilityRole="button" onPress={() => setVerPagadas(!verPagadas)} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ color: tema.primario, fontWeight: '700', fontSize: 13 }}>
                {verPagadas ? 'Ocultar pagados' : 'Mostrar pagados'}
              </Text>
            </TouchableOpacity>

            {personas.map((p) => (
              <View key={p.nombre} style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
                <View style={styles.fila}>
                  <View style={[styles.avatar, { backgroundColor: tema.primario + '22' }]}>
                    <Text style={{ color: tema.primario, fontWeight: '800', fontSize: 16 }}>{p.nombre.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontSize: 17, fontWeight: '800' }}>{p.nombre}</Text>
                    <Text style={{ color: p.pendiente > 0 ? tema.aviso : tema.exito, fontWeight: '700', fontSize: 13 }}>
                      {p.pendiente > 0 ? `Te debe ${formatoEuro(p.pendiente)}` : 'Todo al día'}
                    </Text>
                  </View>
                  {p.pendiente > 0 ? (
                    <TouchableOpacity accessibilityRole="button" style={[styles.saldar, { backgroundColor: tema.exito }]} onPress={() => saldarTodo(p.nombre, p.deudas)}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Saldar todo</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {p.deudas
                  .filter((d) => verPagadas || !d.pagado)
                  .map((d) => (
                    <TouchableOpacity accessibilityRole="button"
                      key={d.gasto.id + d.indice}
                      style={[styles.deuda, { borderTopColor: tema.borde }]}
                      onPress={() => marcar(d, !d.pagado)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={d.pagado ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={d.pagado ? tema.exito : tema.textoSuave}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '600', opacity: d.pagado ? 0.5 : 1 }} numberOfLines={1}>
                          {d.gasto.descripcion}
                        </Text>
                        <Text style={{ color: tema.textoSuave, fontSize: 11 }}>{formatoFecha(d.gasto.fecha)}</Text>
                      </View>
                      <Text style={{ color: tema.texto, fontWeight: '700', opacity: d.pagado ? 0.5 : 1 }}>{formatoEuro(d.importe)}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(56), paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  titulo: { fontSize: 30, fontWeight: '800' },
  hero: { borderRadius: 24, padding: 20, gap: 4 },
  tarjeta: { borderRadius: 22, padding: 16, gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  saldar: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  deuda: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
