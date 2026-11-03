/**
 * Nexo Pay · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Texto';
import { Boton, Escalonado, Tarjeta } from '../components/ui';
import { BancoDisponible, Conexion, confirmarConexion, desconectarBanco, diasRestantes, empezarConexion, listarBancos, listarConexiones, repasarBancos } from '../bancos';
import { Alert } from '../dialogos';
import { arriba } from '../layout';
import { sincronizarCaptaciones } from '../sync';
import { avisarPendientesNuevos } from '../avisos';
import { formatoEuro, useTema } from '../tema';

export default function BancosScreen() {
  const tema = useTema();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string; error_description?: string }>();
  const [conexiones, setConexiones] = useState<Conexion[]>([]);
  const [bancos, setBancos] = useState<BancoDisponible[] | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  const recargar = useCallback(async () => setConexiones(await listarConexiones()), []);
  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  // El banco devuelve aquí al usuario con `code` y `state` (o `error`): se termina la conexión y se limpia la dirección.
  const procesado = useRef(false);
  useEffect(() => {
    if (procesado.current) return;
    if (params.error) {
      procesado.current = true;
      setMensaje({ texto: `El banco no ha autorizado la conexión${params.error_description ? `: ${params.error_description}` : '.'}`, error: true });
      router.setParams({ error: undefined, error_description: undefined, state: undefined });
      return;
    }
    if (!params.code || !params.state) return;
    procesado.current = true;
    setOcupado('confirmar');
    confirmarConexion(String(params.code), String(params.state))
      .then(async (r) => {
        const n = await sincronizarCaptaciones().catch(() => 0);
        avisarPendientesNuevos(n);
        setMensaje({ texto: `${r.banco} conectado (${r.cuentas} ${r.cuentas === 1 ? 'cuenta' : 'cuentas'}). ${n > 0 ? `${n} movimientos esperan en Pendientes.` : 'Los movimientos nuevos irán entrando solos.'}` });
      })
      .catch((e: Error) => setMensaje({ texto: e.message, error: true }))
      .finally(() => {
        setOcupado(null);
        router.setParams({ code: undefined, state: undefined });
        recargar();
      });
  }, [params.code, params.state, params.error, params.error_description, router, recargar]);

  const abrirLista = async () => {
    setEligiendo(true);
    if (bancos) return;
    try {
      setBancos(await listarBancos('ES'));
    } catch (e) {
      setMensaje({ texto: (e as Error).message, error: true });
      setEligiendo(false);
    }
  };

  const conectar = async (b: BancoDisponible) => {
    setOcupado(b.nombre);
    setMensaje(null);
    try {
      const url = await empezarConexion(b);
      if (Platform.OS === 'web') window.location.assign(url);
      else await Linking.openURL(url);
    } catch (e) {
      setMensaje({ texto: (e as Error).message, error: true });
    } finally {
      setOcupado(null);
    }
  };

  const sincronizar = async () => {
    setOcupado('sync');
    setMensaje(null);
    try {
      await repasarBancos(true);
      const n = await sincronizarCaptaciones().catch(() => 0);
      avisarPendientesNuevos(n);
      setMensaje({ texto: n > 0 ? `${n} movimientos nuevos en Pendientes.` : 'Todo al día: no hay movimientos nuevos.' });
    } catch (e) {
      setMensaje({ texto: (e as Error).message, error: true });
    } finally {
      setOcupado(null);
      recargar();
    }
  };

  const desconectar = (c: Conexion) =>
    Alert.alert('Desconectar banco', `Nexo Pay dejará de leer los movimientos de ${c.banco}. Lo ya apuntado no se borra.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          setOcupado(c.id);
          try {
            await desconectarBanco(c.id);
          } catch (e) {
            setMensaje({ texto: (e as Error).message, error: true });
          } finally {
            setOcupado(null);
            recargar();
          }
        },
      },
    ]);

  const visibles = (bancos ?? []).filter((b) => b.nombre.toLowerCase().includes(filtro.trim().toLowerCase())).slice(0, 40);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.volver}>
        <Ionicons name="chevron-back" size={22} color={tema.primario} />
        <Text style={{ color: tema.primario, fontSize: 16, fontWeight: '600' }}>Atrás</Text>
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: tema.texto }]}>Bancos</Text>
      <Text style={{ color: tema.textoSuave, fontSize: 13, marginBottom: 12 }}>
        Conecta tu banco y Nexo Pay trae tus pagos y cobros solo. Aparecen en Pendientes para que los revises y los añadas. Solo lee movimientos: no puede mover dinero.
      </Text>

      {mensaje ? (
        <View style={[styles.mensaje, { backgroundColor: mensaje.error ? tema.peligro + '22' : tema.acento + '26', borderColor: mensaje.error ? tema.peligro : tema.acento }]}>
          <Ionicons name={mensaje.error ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={20} color={mensaje.error ? tema.peligro : tema.acento} />
          <Text style={{ color: tema.texto, flex: 1, fontSize: 14 }}>{mensaje.texto}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, gap: 14 }}>
        <Escalonado>
          {ocupado === 'confirmar' ? (
            <Tarjeta>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ActivityIndicator color={tema.acento} />
                <Text style={{ color: tema.texto }}>Terminando la conexión con tu banco…</Text>
              </View>
            </Tarjeta>
          ) : null}

          {conexiones.map((c) => {
            const dias = diasRestantes(c);
            const caducada = c.estado === 'caducada' || (dias !== null && dias <= 0);
            return (
              <Tarjeta key={c.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.icono, { backgroundColor: tema.acento + '26' }]}>
                    <Ionicons name="business-outline" size={22} color={tema.acento} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tema.texto, fontSize: 17, fontWeight: '700' }}>{c.banco}</Text>
                    <Text style={{ color: caducada ? tema.peligro : tema.textoSuave, fontSize: 12 }}>
                      {caducada ? 'Permiso caducado: vuelve a conectarlo' : dias !== null ? `Permiso válido ${dias} ${dias === 1 ? 'día' : 'días'} más` : 'Conectado'}
                    </Text>
                  </View>
                </View>
                {c.cuentas.map((cu) => (
                  <View key={cu.uid} style={styles.cuenta}>
                    <Text style={{ color: tema.texto, fontSize: 14 }} numberOfLines={1}>
                      {cu.nombre} {cu.iban}
                    </Text>
                    {typeof cu.saldo === 'number' ? <Text style={{ color: tema.textoSuave, fontSize: 14 }}>{formatoEuro(cu.saldo)}</Text> : null}
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {caducada ? (
                    <Boton texto="Volver a conectar" onPress={() => conectar({ nombre: c.banco, pais: c.pais, logo: null, dias: null })} contenedor={{ flex: 1 }} cargando={ocupado === c.banco} />
                  ) : (
                    <Boton texto="Sincronizar" variante="secundario" icono="refresh-outline" onPress={sincronizar} contenedor={{ flex: 1 }} cargando={ocupado === 'sync'} />
                  )}
                  <Boton texto="Quitar" variante="secundario" onPress={() => desconectar(c)} cargando={ocupado === c.id} />
                </View>
              </Tarjeta>
            );
          })}

          {eligiendo ? (
            <Tarjeta>
              <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>Elige tu banco</Text>
              <TextInput
                value={filtro}
                onChangeText={setFiltro}
                placeholder="Busca tu banco (por ejemplo, BBVA)"
                placeholderTextColor={tema.textoSuave}
                accessibilityLabel="Buscar banco"
                autoCapitalize="none"
                style={[styles.buscador, { color: tema.texto, backgroundColor: tema.tarjetaSuave, borderColor: tema.borde }]}
              />
              {!bancos ? (
                <ActivityIndicator color={tema.acento} />
              ) : visibles.length === 0 ? (
                <Text style={{ color: tema.textoSuave }}>No encuentro ese banco.</Text>
              ) : (
                visibles.map((b) => (
                  <TouchableOpacity
                    key={`${b.pais}-${b.nombre}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Conectar ${b.nombre}`}
                    onPress={() => conectar(b)}
                    disabled={!!ocupado}
                    style={[styles.banco, { borderColor: tema.borde, opacity: ocupado && ocupado !== b.nombre ? 0.5 : 1 }]}
                  >
                    <Text style={{ color: tema.texto, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                      {b.nombre}
                    </Text>
                    {ocupado === b.nombre ? <ActivityIndicator color={tema.acento} /> : <Ionicons name="chevron-forward" size={18} color={tema.textoSuave} />}
                  </TouchableOpacity>
                ))
              )}
              <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
                Te llevamos a la web de tu banco para que autorices el acceso. Nexo Pay nunca ve tus claves del banco.
              </Text>
            </Tarjeta>
          ) : (
            <Boton texto={conexiones.length === 0 ? 'Conectar un banco' : 'Conectar otro banco'} icono="add-circle-outline" onPress={abrirLista} />
          )}
        </Escalonado>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(56), paddingHorizontal: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  titulo: { fontSize: 30, fontWeight: '800', marginBottom: 4 },
  mensaje: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  icono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cuenta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  buscador: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  banco: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
});
