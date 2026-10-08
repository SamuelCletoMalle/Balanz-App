/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/Texto';
import Logo from '../components/Logo';
import { LOGO_CABECERA } from '../components/Intro';
import TarjetaSaldo from '../components/TarjetaSaldo';
import GastoPorCategoria from '../components/GastoPorCategoria';
import BotonNuevo from '../components/BotonNuevo';
import Presionable from '../components/Presionable';
import { Boton, Escalonado, Tarjeta } from '../components/ui';
import { useIntroLista } from '../intro-estado';
import { abrirNuevoMovimiento, useVersionDatos } from '../nuevo-estado';
import { toque } from '../haptics';
import { descargarGastosDeLaNube } from '../sync';
import { proximosCobros, ProximoCobro } from '../recurrentes';
import { useDisposicion, arriba } from '../layout';
import {
  Gasto,
  contarPendientes,
  getGastos,
  getGastosPorCategoriaMesActual,
  getIngresosMesActual,
  getLimite,
  getSaldoTotal,
  getTotalMesActual,
} from '../db';
import { formatoEuro, formatoFecha, infoCategoria, tintaCategoria, useTema } from '../tema';

/** Inicio: lo que se mira cada día. El detalle completo vive en Movimientos, Planes y Resumen. */
export default function InicioScreen() {
  const tema = useTema();
  const router = useRouter();
  const { amplio, escritorio } = useDisposicion();
  const introLista = useIntroLista();
  const version = useVersionDatos();
  const [saldo, setSaldo] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [limite, setLimite] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [ultimos, setUltimos] = useState<Gasto[]>([]);
  const [cobro, setCobro] = useState<ProximoCobro | null>(null);
  const [categorias, setCategorias] = useState<{ categoria: string; total: number }[]>([]);
  const [sincronizando, setSincronizando] = useState(false);

  const recargar = useCallback(() => {
    setSaldo(getSaldoTotal());
    setTotalMes(getTotalMesActual());
    setIngresosMes(getIngresosMesActual());
    setLimite(getLimite());
    setPendientes(contarPendientes());
    setUltimos(getGastos().slice(0, 5));
    setCobro(proximosCobros(30)[0] ?? null);
    setCategorias(getGastosPorCategoriaMesActual());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      recargar();
      setSincronizando(true);
      descargarGastosDeLaNube()
        .catch(() => {})
        .finally(() => {
          if (activo) {
            recargar();
            setSincronizando(false);
          }
        });
      return () => {
        activo = false;
      };
      // `version` hace que se vuelva a leer cuando se guarda algo desde la hoja global de nuevo movimiento.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recargar, version])
  );

  const accesos = [
    { id: 'gasto', icono: 'remove-circle-outline', texto: 'Gasto', accion: () => abrirNuevoMovimiento('gasto') },
    { id: 'ingreso', icono: 'add-circle-outline', texto: 'Ingreso', accion: () => abrirNuevoMovimiento('ingreso') },
    { id: 'mover', icono: 'swap-horizontal-outline', texto: 'Mover', accion: () => router.push('/presupuesto?vista=cuentas') },
    { id: 'metas', icono: 'flag-outline', texto: 'Metas', accion: () => router.push('/planes?vista=metas') },
  ];

  const avisoPendientes =
    pendientes > 0 ? (
      <Presionable
        accessibilityLabel={`${pendientes} pagos por revisar`}
        style={[styles.aviso, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}
        onPress={() => router.push('/pendientes')}
      >
        <View style={[styles.avisoIcono, { backgroundColor: tema.acento }]}>
          <Ionicons name="notifications" size={18} color={tema.acentoTexto} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tema.texto, fontSize: 15, fontWeight: '700' }}>{pendientes === 1 ? '1 pago por revisar' : `${pendientes} pagos por revisar`}</Text>
          <Text style={{ color: tema.textoSuave, fontSize: 12 }}>Detectados desde tus atajos o SMS</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tema.textoSuave} />
      </Presionable>
    ) : null;

  const listaUltimos = (
    <Tarjeta style={{ padding: 0, gap: 0 }}>
      <View style={styles.cabeceraTarjeta}>
        <Text style={{ color: tema.texto, fontSize: 16, fontWeight: '700' }}>Últimos movimientos</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/movimientos')} hitSlop={8}>
          <Text style={{ color: tema.oscuro ? tema.acento : tema.texto, fontSize: 13, fontWeight: '700' }}>Ver todos</Text>
        </TouchableOpacity>
      </View>
      {ultimos.length === 0 ? (
        <View style={{ padding: 18, paddingTop: 4, gap: 12 }}>
          <Text style={{ color: tema.textoSuave, fontSize: 14 }}>Todavía no hay movimientos. Apunta el primero y aparecerá aquí.</Text>
          <Boton texto="Añadir el primero" variante="secundario" onPress={() => abrirNuevoMovimiento('gasto')} />
        </View>
      ) : (
        ultimos.map((g, i) => {
          const cat = infoCategoria(g.categoria);
          const esIngreso = g.tipo === 'ingreso';
          const esTraspaso = g.tipo === 'traspaso';
          const color = esTraspaso ? tema.textoSuave : esIngreso ? tema.exito : cat.color;
          return (
            <TouchableOpacity
              key={g.id}
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={() => router.push('/movimientos')}
              style={[styles.fila, i < ultimos.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tema.borde } : null]}
            >
              <View style={[styles.icono, { backgroundColor: color + '33' }]}>
                <Ionicons
                  name={esTraspaso ? 'swap-horizontal-outline' : esIngreso ? 'arrow-down-circle-outline' : cat.icono}
                  size={19}
                  color={esTraspaso ? tema.textoSuave : esIngreso ? tema.exito : tintaCategoria(cat.color, tema.oscuro)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tema.texto, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                  {g.descripcion}
                </Text>
                <Text style={{ color: tema.textoSuave, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {formatoFecha(g.fecha)} · {esTraspaso ? 'Traspaso' : g.categoria}
                </Text>
              </View>
              <Text style={{ color: esIngreso ? tema.exito : tema.texto, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {esTraspaso ? '' : esIngreso ? '+' : '-'}
                {formatoEuro(g.importe)}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </Tarjeta>
  );

  const tarjetaCobro = cobro ? (
    <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={[styles.avisoIcono, { backgroundColor: tema.tarjetaSuave }]}>
        <Ionicons name="repeat-outline" size={18} color={tema.oscuro ? tema.acento : tema.texto} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tema.textoSuave, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>PRÓXIMO COBRO</Text>
        <Text style={{ color: tema.texto, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
          {cobro.recurrente.descripcion}
        </Text>
        <Text style={{ color: tema.textoSuave, fontSize: 12 }}>
          {cobro.enDias === 0 ? 'Hoy' : cobro.enDias === 1 ? 'Mañana' : `${formatoFecha(cobro.fecha)} · en ${cobro.enDias} días`}
        </Text>
      </View>
      <Text style={{ color: cobro.recurrente.tipo === 'ingreso' ? tema.exito : tema.texto, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
        {cobro.recurrente.tipo === 'ingreso' ? '+' : '-'}
        {formatoEuro(cobro.recurrente.importe)}
      </Text>
    </Tarjeta>
  ) : null;

  const saldoTarjeta = <TarjetaSaldo saldo={saldo} totalMes={totalMes} ingresosMes={ingresosMes} limite={limite} sincronizando={sincronizando} />;

  return (
    <View style={[styles.container, { backgroundColor: tema.fondo }]}>
      <Text style={[styles.titulo, { color: tema.texto }]}>Inicio</Text>
      {escritorio ? null : (
        <View pointerEvents="none" style={[styles.logoCabecera, { opacity: introLista ? 1 : 0 }]}>
          <Logo size={LOGO_CABECERA.tamano} aro={tema.oscuro ? '#0a0a0a' : '#000000'} />
        </View>
      )}

      {amplio ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 28 }}>
          <ScrollView style={{ width: 400, flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Boton texto="Añadir movimiento" icono="add" onPress={() => abrirNuevoMovimiento('gasto')} />
            {saldoTarjeta}
            <GastoPorCategoria filas={categorias} />
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {avisoPendientes}
            {listaUltimos}
            {tarjetaCobro}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Escalonado>
            {saldoTarjeta}
            <View style={styles.accesos}>
              {accesos.map((a) => (
                <Presionable
                  key={a.id}
                  accessibilityLabel={a.texto}
                  contenedor={{ flex: 1 }}
                  style={[styles.acceso, { backgroundColor: tema.tarjeta, borderColor: tema.borde }]}
                  onPress={() => {
                    toque();
                    a.accion();
                  }}
                >
                  <Ionicons name={a.icono as never} size={22} color={tema.oscuro ? tema.acento : tema.texto} />
                  <Text style={{ color: tema.texto, fontSize: 12, fontWeight: '600' }}>{a.texto}</Text>
                </Presionable>
              ))}
            </View>
            {avisoPendientes}
            {listaUltimos}
            {tarjetaCobro}
          </Escalonado>
        </ScrollView>
      )}

      {amplio ? null : <BotonNuevo />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: arriba(60), paddingHorizontal: 16 },
  titulo: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginBottom: 14 },
  logoCabecera: { position: 'absolute', top: arriba(60) + 2, right: LOGO_CABECERA.margen },
  accesos: { flexDirection: 'row', gap: 10 },
  acceso: { height: 74, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 6 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  avisoIcono: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cabeceraTarjeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingBottom: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 18 },
  icono: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
