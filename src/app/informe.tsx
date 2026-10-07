/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { arriba } from '../layout';
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/Texto';
import { Alert } from '../dialogos';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mesDesplazado } from '../db';
import { datosInforme, DatosInforme, exportarInformePDF, nombreMes, variacionTexto } from '../informe';
import { infoCategoria, formatoEuro, useTema } from '../tema';

export default function InformeScreen() {
  const tema = useTema();
  const router = useRouter();
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [datos, setDatos] = useState<DatosInforme | null>(null);
  const [exportando, setExportando] = useState(false);

  const mes = useMemo(() => mesDesplazado(desplazamiento), [desplazamiento]);

  useFocusEffect(
    useCallback(() => {
      setDatos(datosInforme(mes));
    }, [mes])
  );

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarInformePDF(mes);
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setExportando(false);
    }
  };

  const cambio = (actual: number, previo: number, inverso: boolean) => {
    if (previo === 0) return { texto: variacionTexto(actual, previo), color: tema.textoSuave };
    const sube = actual > previo;
    const bueno = inverso ? !sube : sube;
    return { texto: variacionTexto(actual, previo), color: actual === previo ? tema.textoSuave : bueno ? tema.exito : tema.peligro };
  };

  const balance = datos ? datos.ingresos - datos.gastos : 0;

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: tema.texto }]}>Informe mensual</Text>

      <View style={[styles.selector, { backgroundColor: tema.tarjeta }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setDesplazamiento(desplazamiento - 1)} style={styles.flecha}>
          <Ionicons name="chevron-back" size={22} color={tema.primario} />
        </TouchableOpacity>
        <Text style={{ color: tema.texto, fontSize: 17, fontWeight: '800', textTransform: 'capitalize' }}>{nombreMes(mes)}</Text>
        <TouchableOpacity accessibilityRole="button"
          onPress={() => setDesplazamiento(Math.min(desplazamiento + 1, 0))}
          accessibilityLabel="Mes siguiente"
          style={[styles.flecha, { opacity: desplazamiento === 0 ? 0.3 : 1 }]}
          disabled={desplazamiento === 0}
        >
          <Ionicons name="chevron-forward" size={22} color={tema.primario} />
        </TouchableOpacity>
      </View>

      {datos ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
          <View style={styles.dos}>
            {[
              { etiqueta: 'GASTOS', valor: datos.gastos, previo: datos.gastosPrevios, color: tema.peligro, inverso: true },
              { etiqueta: 'INGRESOS', valor: datos.ingresos, previo: datos.ingresosPrevios, color: tema.exito, inverso: false },
            ].map((k) => {
              const c = cambio(k.valor, k.previo, k.inverso);
              return (
                <View key={k.etiqueta} style={[styles.kpi, { backgroundColor: tema.tarjeta }]}>
                  <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>{k.etiqueta}</Text>
                  <Text style={{ color: k.color, fontSize: 20, fontWeight: '800' }}>{formatoEuro(k.valor)}</Text>
                  <Text style={{ color: c.color, fontSize: 12, fontWeight: '700' }}>{c.texto} vs. mes anterior</Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>BALANCE</Text>
            <Text style={{ color: balance >= 0 ? tema.exito : tema.peligro, fontSize: 30, fontWeight: '800' }}>
              {balance >= 0 ? '+' : ''}
              {formatoEuro(balance)}
            </Text>
            {datos.limite > 0 ? (
              <Text style={{ color: tema.textoSuave, fontSize: 13 }}>
                Has usado el {Math.round((datos.gastos / datos.limite) * 100)} % de tu presupuesto ({formatoEuro(datos.limite)}).
              </Text>
            ) : null}
          </View>

          <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
            <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>CATEGORÍAS VS. MES ANTERIOR</Text>
            {datos.porCategoria.length === 0 ? (
              <Text style={{ color: tema.textoSuave }}>Sin gastos este mes.</Text>
            ) : (
              datos.porCategoria.map((c) => {
                const cat = infoCategoria(c.categoria);
                const ch = cambio(c.total, c.previo, true);
                return (
                  <View key={c.categoria} style={styles.fila}>
                    <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                      <Ionicons name={cat.icono} size={15} color={cat.color} />
                    </View>
                    <Text style={{ color: tema.texto, fontWeight: '600', flex: 1 }}>{c.categoria}</Text>
                    <Text style={{ color: tema.texto, fontWeight: '700' }}>{formatoEuro(c.total)}</Text>
                    <Text style={{ color: ch.color, fontWeight: '700', fontSize: 12, width: 56, textAlign: 'right' }}>{ch.texto}</Text>
                  </View>
                );
              })
            )}
          </View>

          {datos.mayores.length > 0 ? (
            <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
              <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>MAYORES GASTOS</Text>
              {datos.mayores.map((g, i) => (
                <View key={i} style={styles.fila}>
                  <Text style={{ color: tema.textoSuave, fontWeight: '800', width: 18 }}>{i + 1}</Text>
                  <Text style={{ color: tema.texto, fontWeight: '600', flex: 1 }} numberOfLines={1}>{g.descripcion}</Text>
                  <Text style={{ color: tema.texto, fontWeight: '700' }}>{formatoEuro(g.importe)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity accessibilityRole="button" style={[styles.pdf, { backgroundColor: tema.primario, opacity: exportando ? 0.6 : 1 }]} disabled={exportando} onPress={exportar}>
            {exportando ? (
              <ActivityIndicator color={tema.primarioTexto} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color={tema.primarioTexto} />
                <Text style={{ color: tema.primarioTexto, fontWeight: '800', fontSize: 16 }}>Exportar a PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(56), paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  titulo: { fontSize: 30, fontWeight: '800', marginBottom: 12 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 6, marginBottom: 12 },
  flecha: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  dos: { flexDirection: 'row', gap: 12 },
  kpi: { flex: 1, borderRadius: 20, padding: 16, gap: 4 },
  tarjeta: { borderRadius: 22, padding: 18, gap: 12 },
  etiqueta: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icono: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  pdf: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
});
