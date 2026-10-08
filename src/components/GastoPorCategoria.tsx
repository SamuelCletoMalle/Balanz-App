/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Texto';
import { Tarjeta, Barra } from './ui';
import { formatoEuro, infoCategoria, tintaCategoria, useTema } from '../tema';

/** En qué se va el dinero este mes: las categorías con más gasto, de mayor a menor, con una barra proporcional. */
export default function GastoPorCategoria({ filas, titulo = 'Gasto por categoría este mes', maximo = 6 }: { filas: { categoria: string; total: number }[]; titulo?: string; maximo?: number }) {
  const tema = useTema();
  const orden = [...filas].filter((f) => f.total > 0).sort((a, b) => b.total - a.total).slice(0, maximo);
  const tope = orden[0]?.total ?? 0;
  return (
    <Tarjeta>
      <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>{titulo}</Text>
      {orden.length === 0 ? (
        <Text style={{ color: tema.textoSuave, fontSize: 13 }}>Cuando añadas gastos este mes, verás aquí en qué se te va el dinero.</Text>
      ) : (
        orden.map((f) => {
          const cat = infoCategoria(f.categoria);
          return (
            <View key={f.categoria} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={cat.icono} size={16} color={tintaCategoria(cat.color, tema.oscuro)} />
                <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '600', flex: 1 }}>{f.categoria}</Text>
                <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatoEuro(f.total)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: tema.tarjetaSuave, overflow: 'hidden' }}>
                <Barra p={f.total / tope} color={cat.color} radio={3} />
              </View>
            </View>
          );
        })
      )}
    </Tarjeta>
  );
}
