/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import GastoModal, { DatosGasto, InicialGasto } from '../components/GastoModal';
import { guardarMovimiento } from '../movimientos';
import { useTema } from '../tema';

/**
 * Pantalla de alta rápida pensada para abrirse desde fuera de la app:
 *   balanz://nuevo                      → formulario vacío
 *   balanz://nuevo?importe=12.5&descripcion=Café&tipo=ingreso
 * Sirve para el widget, el icono de acción rápida, un Atajo de iOS o un botón de ajustes rápidos.
 */
export default function NuevoRapido() {
  const tema = useTema();
  const router = useRouter();
  const params = useLocalSearchParams<{ importe?: string; descripcion?: string; tipo?: string; categoria?: string }>();
  const [visible, setVisible] = useState(true);

  const importe = params.importe ? parseFloat(String(params.importe).replace(',', '.')) : null;
  const inicial: InicialGasto = {
    descripcion: params.descripcion ? String(params.descripcion) : '',
    categoria: params.categoria ? String(params.categoria) : 'Otros',
    importe: importe && isFinite(importe) ? importe : null,
    tipo: params.tipo === 'ingreso' ? 'ingreso' : 'gasto',
  };

  const cerrar = () => {
    setVisible(false);
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: tema.fondo }}>
      <GastoModal
        visible={visible}
        titulo="Añadir rápido"
        inicial={inicial}
        onGuardar={(d: DatosGasto) => {
          guardarMovimiento(d);
          cerrar();
        }}
        onCancelar={cerrar}
      />
    </View>
  );
}
