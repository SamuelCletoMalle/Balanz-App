/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Texto';
import { Barra, Tarjeta } from './ui';
import { formatoEuro, useTema } from '../tema';

/** Presupuestos por categoría de este mes, en rejilla: la barra se pone roja si te has pasado. */
export default function PresupuestosCategorias({ presupuestos, gastado }: { presupuestos: Record<string, number>; gastado: { categoria: string; total: number }[] }) {
  const tema = useTema();
  const router = useRouter();
  const filas = Object.entries(presupuestos)
    .filter(([, limite]) => limite > 0)
    .map(([categoria, limite]) => {
      const total = gastado.find((g) => g.categoria === categoria)?.total ?? 0;
      return { categoria, limite, total, ratio: total / limite };
    })
    .sort((a, b) => b.ratio - a.ratio);

  return (
    <Tarjeta style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>Presupuestos por categoría</Text>
        <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Se marca en rojo si te pasas</Text>
      </View>
      {filas.length === 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: tema.textoSuave, fontSize: 14 }}>Todavía no has puesto presupuestos. Ponle un tope mensual a cada categoría y verás aquí cómo vas.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/planes?vista=presupuesto')} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ color: tema.oscuro ? tema.acento : tema.texto, fontWeight: '700', fontSize: 14 }}>Poner presupuestos →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 16 }}>
          {filas.map((f) => {
            const pasado = f.total > f.limite;
            const cerca = !pasado && f.ratio >= 0.8;
            const color = pasado ? tema.peligro : cerca ? tema.aviso : tema.oscuro ? tema.acento : tema.primario;
            return (
              <View key={f.categoria} style={{ width: '30%', flexGrow: 1, minWidth: 150, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: tema.texto, fontSize: 14, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                    {f.categoria}
                  </Text>
                  <Text style={{ color: tema.textoSuave, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                    {Math.round(f.total)} / {Math.round(f.limite)} €
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: tema.tarjetaSuave, overflow: 'hidden' }}>
                  <Barra p={Math.min(f.ratio, 1)} color={color} radio={3} />
                </View>
                <Text style={{ color: pasado ? tema.peligro : tema.textoSuave, fontSize: 12 }}>
                  {pasado ? `te pasaste ${formatoEuro(f.total - f.limite)}` : `quedan ${formatoEuro(f.limite - f.total)}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Tarjeta>
  );
}
