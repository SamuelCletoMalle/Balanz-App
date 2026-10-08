/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './Texto';
import { Escalonado, Barra } from './ui';
import { usePreferencias } from '../accesibilidad';
import { arriba } from '../layout';
import {
  getTotalMesActual,
  getLimite,
  setLimite,
  getGastosPorCategoriaMesActual,
  getPresupuestosCategoria,
  setPresupuestoCategoria,
} from '../db';
import { comprobarPresupuestos } from '../avisos';
import { getCategorias, infoCategoria, formatoEuro, useTema } from '../tema';

/** Presupuesto del mes (límite global) y límite por categoría. Vive en la pestaña Planes. */
export default function PresupuestoContenido() {
  const tema = useTema();
  const { reducirMovimiento } = usePreferencias();
  const [gastado, setGastado] = useState(0);
  const [limite, setLimiteState] = useState(0);
  const [editando, setEditando] = useState(false);
  const [nuevoLimite, setNuevoLimite] = useState('');
  const [porCategoria, setPorCategoria] = useState<{ categoria: string; total: number }[]>([]);
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>({});
  const [catEditando, setCatEditando] = useState<string | null>(null);
  const [valorCat, setValorCat] = useState('');

  const cargar = useCallback(() => {
    setGastado(getTotalMesActual());
    setLimiteState(getLimite());
    setPorCategoria(getGastosPorCategoriaMesActual());
    setPresupuestos(getPresupuestosCategoria());
  }, []);
  useFocusEffect(cargar);

  const restante = limite - gastado;
  const porcentaje = limite > 0 ? Math.min(gastado / limite, 1) : 0;
  const colorEstado = limite > 0 && gastado > limite ? tema.peligro : porcentaje > 0.8 ? tema.aviso : tema.exito;
  const hoy = new Date();
  const diaDelMes = hoy.getDate();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const proyeccion = (gastado / diaDelMes) * diasMes;
  const gastoCat = (c: string) => porCategoria.find((x) => x.categoria === c)?.total ?? 0;

  const guardarLimite = () => {
    const valor = parseFloat(nuevoLimite.replace(',', '.'));
    if (!isNaN(valor) && valor > 0) {
      setLimite(valor);
      setLimiteState(valor);
      setEditando(false);
      setNuevoLimite('');
      comprobarPresupuestos();
    }
  };

  const guardarCategoria = (quitar = false) => {
    if (!catEditando) return;
    const v = parseFloat(valorCat.replace(',', '.'));
    setPresupuestoCategoria(catEditando, quitar ? null : isNaN(v) ? null : v);
    setPresupuestos(getPresupuestosCategoria());
    setCatEditando(null);
    comprobarPresupuestos();
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Escalonado>
      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <View style={styles.fila}>
          <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>PRESUPUESTO DEL MES</Text>
          {limite > 0 && !editando ? (
            <TouchableOpacity accessibilityRole="button"
              onPress={() => {
                setNuevoLimite(String(limite).replace('.', ','));
                setEditando(true);
              }}
            >
              <Ionicons name="create-outline" size={20} color={tema.primario} />
            </TouchableOpacity>
          ) : null}
        </View>

        {editando || limite === 0 ? (
          <View style={{ gap: 10 }}>
            {limite === 0 && !editando ? (
              <Text style={{ color: tema.textoSuave, fontSize: 14 }}>
                Fija cuánto quieres gastar al mes y te avisaremos de cómo vas.
              </Text>
            ) : null}
            {editando ? (
              <TextInput
                style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
                placeholder="Límite mensual (€)"
                placeholderTextColor={tema.textoSuave}
                keyboardType="decimal-pad"
                value={nuevoLimite}
                onChangeText={setNuevoLimite}
                autoFocus
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {editando ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} onPress={() => setEditando(false)}>
                  <Text style={{ color: tema.texto, fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button"
                style={[styles.boton, { backgroundColor: tema.primario, flex: 1 }]}
                onPress={editando ? guardarLimite : () => setEditando(true)}
              >
                <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>{editando ? 'Guardar' : 'Fijar límite'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.grande, { color: tema.texto }]}>
              {formatoEuro(gastado)}
              <Text style={{ fontSize: 16, color: tema.textoSuave, fontWeight: '600' }}> / {formatoEuro(limite)}</Text>
            </Text>
            <View style={[styles.barraFondo, { backgroundColor: tema.tarjetaSuave }]}>
              <Barra p={porcentaje} color={colorEstado} />
            </View>
            <Text style={{ color: colorEstado, fontWeight: '700', fontSize: 15 }}>
              {restante >= 0 ? `Te quedan ${formatoEuro(restante)}` : `Te has pasado ${formatoEuro(Math.abs(restante))}`}
            </Text>
            <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
              A este ritmo terminarás el mes en {formatoEuro(proyeccion)}.
            </Text>
          </>
        )}
      </View>

      <View style={[styles.tarjeta, { backgroundColor: tema.tarjeta }]}>
        <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>PRESUPUESTO POR CATEGORÍA (toca para fijar)</Text>
        {getCategorias().map((cat) => {
          const gasto = gastoCat(cat.nombre);
          const lim = presupuestos[cat.nombre];
          if (!lim && gasto === 0) {
            return (
              <TouchableOpacity accessibilityRole="button"
                key={cat.nombre}
                style={styles.fila}
                onPress={() => {
                  setCatEditando(cat.nombre);
                  setValorCat('');
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={14} color={cat.color} />
                  </View>
                  <Text style={{ color: tema.textoSuave, fontSize: 14 }}>{cat.nombre}</Text>
                </View>
                <Text style={{ color: tema.primario, fontSize: 12, fontWeight: '700' }}>Fijar límite</Text>
              </TouchableOpacity>
            );
          }
          const pct = lim ? Math.min(gasto / lim, 1) : gastado > 0 ? gasto / gastado : 0;
          const color = lim ? (gasto > lim ? tema.peligro : gasto / lim > 0.8 ? tema.aviso : cat.color) : cat.color;
          return (
            <TouchableOpacity accessibilityRole="button"
              key={cat.nombre}
              style={{ gap: 6 }}
              onPress={() => {
                setCatEditando(cat.nombre);
                setValorCat(lim ? String(lim).replace('.', ',') : '');
              }}
            >
              <View style={styles.fila}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.icono, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icono} size={14} color={cat.color} />
                  </View>
                  <Text style={{ color: tema.texto, fontWeight: '600', fontSize: 14 }}>{cat.nombre}</Text>
                </View>
                <Text style={{ color: gasto > (lim ?? Infinity) ? tema.peligro : tema.texto, fontWeight: '700', fontSize: 14 }}>
                  {formatoEuro(gasto)}
                  {lim ? <Text style={{ color: tema.textoSuave, fontWeight: '500' }}> / {formatoEuro(lim)}</Text> : null}
                </Text>
              </View>
              <View style={[styles.barraFina, { backgroundColor: tema.tarjetaSuave }]}>
                <Barra p={pct} color={color} radio={4} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>


      <Modal visible={!!catEditando} transparent animationType={reducirMovimiento ? 'none' : 'fade'} onRequestClose={() => setCatEditando(null)}>
        <KeyboardAvoidingView style={styles.modalFondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCaja, { backgroundColor: tema.tarjeta }]}>
            <Text style={{ color: tema.texto, fontSize: 18, fontWeight: '800' }}>Límite de {catEditando}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tema.tarjetaSuave, color: tema.texto }]}
              placeholder="Importe mensual (€)"
              placeholderTextColor={tema.textoSuave}
              keyboardType="decimal-pad"
              value={valorCat}
              onChangeText={setValorCat}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {catEditando && presupuestos[catEditando] ? (
                <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave }]} onPress={() => guardarCategoria(true)}>
                  <Ionicons name="trash-outline" size={18} color={tema.peligro} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.tarjetaSuave, flex: 1 }]} onPress={() => setCatEditando(null)}>
                <Text style={{ color: tema.texto, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.boton, { backgroundColor: tema.primario, flex: 1 }]} onPress={() => guardarCategoria()}>
                <Text style={{ color: tema.primarioTexto, fontWeight: '700' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </Escalonado>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40, gap: 14 },
  titulo: { fontSize: 32, fontWeight: '800' },
  dosColumnas: { flexDirection: 'row', gap: 12 },
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'start' } as object,
  mini: { flex: 1, borderRadius: 20, padding: 16, gap: 4 },
  tarjeta: { borderRadius: 22, padding: 18, gap: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  etiqueta: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  grande: { fontSize: 32, fontWeight: '800' },
  barraFondo: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 7 },
  input: { borderRadius: 14, padding: 14, fontSize: 18 },
  boton: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 10 },
  columna: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  columnaHueco: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  parBarras: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  columnaBarra: { flex: 1, borderRadius: 6 },
  icono: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  barraFina: { height: 8, borderRadius: 4, overflow: 'hidden' },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCaja: { borderRadius: 22, padding: 20, gap: 14 },
});
