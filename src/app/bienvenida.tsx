/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import Onboarding from '../components/Onboarding';

/**
 * Repite el alta inicial (dinero con el que empiezas y límite mensual).
 *   balanz://bienvenida          → guarda lo que se indique
 *   balanz://bienvenida?demo=1   → solo enseña el recorrido, sin guardar nada
 */
export default function Bienvenida() {
  const router = useRouter();
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  return <Onboarding soloVista={demo === '1'} onTerminar={() => router.replace('/')} />;
}
