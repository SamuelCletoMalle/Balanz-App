/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Texto';
import { Boton, useQuieto } from './ui';
import { cerrarAlertaLimite, useAlertaLimite } from '../alerta-limite';
import { useIntroLista } from '../intro-estado';
import { formatoEuro, tintaCategoria, useTema } from '../tema';

/** Aviso en mitad de la pantalla al pasarte del límite de una categoría o del mes. Se coloca una vez en la raíz. */
export default function AlertaLimite() {
  const tema = useTema();
  const quieto = useQuieto();
  const aviso = useAlertaLimite();
  const introLista = useIntroLista();
  // Hasta que acaba la animación de entrada no se enseña nada encima.
  if (!aviso || !introLista) return null;
  const tinta = aviso.color ? tintaCategoria(aviso.color, tema.oscuro) : tema.peligro;
  const demas = aviso.gastado - aviso.limite;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={cerrarAlertaLimite} statusBarTranslucent>
      <Pressable style={styles.fondo} onPress={cerrarAlertaLimite} accessibilityLabel="Cerrar aviso">
        <Animated.View
          entering={quieto ? undefined : ZoomIn.duration(260)}
          style={[styles.tarjeta, { backgroundColor: tema.elevada, borderColor: tema.borde }]}
          accessibilityRole="alert"
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.icono, { backgroundColor: tinta + '26' }]}>
            <Ionicons name={aviso.icono} size={38} color={tinta} />
            <View style={[styles.alertaPunto, { backgroundColor: tema.peligro, borderColor: tema.elevada }]}>
              <Ionicons name="alert" size={16} color="#ffffff" />
            </View>
          </View>
          <Text style={{ color: tema.texto, fontSize: 21, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 }}>{aviso.titulo}</Text>
          <Text style={{ color: tema.textoSuave, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Llevas {formatoEuro(aviso.gastado)} de {formatoEuro(aviso.limite)} este mes: {formatoEuro(demas)} de más.
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
            <Boton texto="Entendido" onPress={cerrarAlertaLimite} />
            <Boton
              texto="Ver mi presupuesto"
              variante="secundario"
              onPress={() => {
                cerrarAlertaLimite();
                router.push('/planes?vista=presupuesto');
              }}
            />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tarjeta: { width: '100%', maxWidth: 380, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: 'center', gap: 12 },
  icono: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  alertaPunto: { position: 'absolute', top: -2, right: -2, width: 28, height: 28, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
