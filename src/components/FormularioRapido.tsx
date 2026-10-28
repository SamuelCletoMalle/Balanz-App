/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from './Texto';
import { Boton, Tarjeta } from './ui';
import { guardarMovimiento } from '../movimientos';
import { abrirNuevoMovimiento, notificarCambioDatos } from '../nuevo-estado';
import { buscarRegla, fechaHoy, Tipo } from '../db';
import { parsearFecha } from '../periodo';
import { exito } from '../haptics';
import { getCategorias, tintaCategoria, useTema } from '../tema';

const aTexto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * Formulario para apuntar un gasto o un ingreso sin salir del panel (ordenador): importe, descripción, categoría,
 * fecha y nota. Para el resto (método de pago, ticket, dividir…) está "Más opciones", que abre la hoja completa.
 */
export default function FormularioRapido() {
  const tema = useTema();
  const [tipo, setTipo] = useState<Tipo>('gasto');
  const [importe, setImporte] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(getCategorias('gasto')[0].nombre);
  const [fecha, setFecha] = useState(aTexto(fechaHoy()));
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState(false);
  const manual = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    []
  );

  const cambiarTipo = (t: Tipo) => {
    setTipo(t);
    manual.current = false;
    setCategoria(getCategorias(t)[0].nombre);
  };

  const sugerirCategoria = () => {
    if (manual.current || tipo !== 'gasto') return;
    const sugerida = buscarRegla(descripcion);
    if (sugerida) setCategoria(sugerida);
  };

  const anadir = () => {
    const valor = parseFloat(importe.replace(',', '.'));
    const iso = parsearFecha(fecha);
    if (!isFinite(valor) || valor <= 0) return setError('Pon un importe mayor que 0.');
    if (!descripcion.trim()) return setError('Escribe una descripción (por ejemplo, Mercadona).');
    if (!iso) return setError('La fecha no se entiende. Usa día/mes/año, por ejemplo 25/10/2026.');
    setError('');
    guardarMovimiento(
      {
        descripcion: descripcion.trim(),
        categoria,
        importe: Math.round(valor * 100) / 100,
        tipo,
        cuenta: 'banco',
        metodo: '',
        nota: nota.trim(),
        etiquetas: '',
        moneda: 'EUR',
        importe_original: null,
        divisiones: '',
        foto: '',
      },
      null,
      iso
    );
    exito();
    setImporte('');
    setDescripcion('');
    setNota('');
    setFecha(aTexto(fechaHoy()));
    manual.current = false;
    setHecho(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setHecho(false), 2500);
    notificarCambioDatos();
  };

  const colorTipo = tipo === 'gasto' ? tema.peligro : tema.exito;
  const campo = [styles.campo, { backgroundColor: tema.tarjetaSuave, color: tema.texto }];

  return (
    <Tarjeta style={{ gap: 12 }}>
      <Text style={[styles.etiqueta, { color: tema.textoSuave }]}>AÑADIR MOVIMIENTO</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['gasto', 'ingreso'] as Tipo[]).map((t) => {
          const activo = tipo === t;
          return (
            <TouchableOpacity
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => cambiarTipo(t)}
              style={[styles.tipo, { borderColor: activo ? (t === 'gasto' ? tema.peligro : tema.exito) : tema.borde, backgroundColor: activo ? (t === 'gasto' ? tema.peligro : tema.exito) + '1f' : 'transparent' }]}
            >
              <Text style={{ color: activo ? (t === 'gasto' ? tema.peligro : tema.exito) : tema.textoSuave, fontWeight: '700', fontSize: 14 }}>{t === 'gasto' ? 'Gasto' : 'Ingreso'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <TextInput
          accessibilityLabel="Importe en euros"
          style={[styles.importe, { color: importe ? colorTipo : tema.textoSuave }]}
          placeholder="0,00"
          placeholderTextColor={tema.textoSuave}
          keyboardType="decimal-pad"
          value={importe}
          onChangeText={setImporte}
        />
        <Text style={{ color: tema.textoSuave, fontSize: 24, fontWeight: '700' }}>€</Text>
      </View>

      <TextInput
        accessibilityLabel="Descripción"
        style={campo}
        placeholder={tipo === 'gasto' ? 'Descripción (ej. Mercadona)' : 'Origen (ej. Nómina)'}
        placeholderTextColor={tema.textoSuave}
        value={descripcion}
        onChangeText={setDescripcion}
        onEndEditing={sugerirCategoria}
        onSubmitEditing={anadir}
      />

      <View style={styles.chips}>
        {getCategorias(tipo).map((c) => {
          const activa = categoria === c.nombre;
          const tinta = tintaCategoria(c.color, tema.oscuro);
          return (
            <TouchableOpacity
              key={c.nombre}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              onPress={() => {
                manual.current = true;
                setCategoria(c.nombre);
              }}
              style={[styles.chip, { backgroundColor: activa ? tema.primario : tema.tarjetaSuave, borderColor: activa ? tema.primario : 'transparent' }]}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: activa ? tema.primarioTexto : tinta }} />
              <Text style={{ color: activa ? tema.primarioTexto : tema.texto, fontSize: 12.5, fontWeight: '600' }}>{c.nombre}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.subetiqueta, { color: tema.textoSuave }]}>Fecha</Text>
      <TextInput accessibilityLabel="Fecha (día/mes/año)" style={campo} placeholder="25/10/2026" placeholderTextColor={tema.textoSuave} value={fecha} onChangeText={setFecha} autoCapitalize="none" />

      <Text style={[styles.subetiqueta, { color: tema.textoSuave }]}>Nota (opcional)</Text>
      <TextInput accessibilityLabel="Nota" style={campo} placeholder="ej. compra del sábado" placeholderTextColor={tema.textoSuave} value={nota} onChangeText={setNota} maxLength={300} />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: tema.peligro, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
      {hecho ? (
        <Text accessibilityLiveRegion="polite" style={{ color: tema.exito, fontSize: 13, fontWeight: '700' }}>
          Apuntado ✓
        </Text>
      ) : null}

      <Boton texto={tipo === 'gasto' ? 'Añadir gasto' : 'Añadir ingreso'} onPress={anadir} />
      <TouchableOpacity accessibilityRole="button" onPress={() => abrirNuevoMovimiento(tipo)} style={{ alignItems: 'center', paddingVertical: 2 }}>
        <Text style={{ color: tema.textoSuave, fontSize: 13, fontWeight: '600' }}>Más opciones (método de pago, ticket, dividir…)</Text>
      </TouchableOpacity>
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  etiqueta: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  subetiqueta: { fontSize: 12, fontWeight: '600', marginBottom: -6 },
  tipo: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  importe: { fontSize: 36, fontWeight: '800', letterSpacing: -1, padding: 0, minWidth: 90, flexShrink: 1, fontVariant: ['tabular-nums'] },
  campo: { borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
});
