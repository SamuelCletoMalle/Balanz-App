// Nexo Pay · control de gastos personales
// Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
//
// Función de Supabase (Edge Function) que habla con Enable Banking. La app nunca ve la clave privada: solo esta
// función la tiene, como secreto del proyecto. Cada llamada exige la sesión del usuario (cabecera Authorization).
//
// Secretos necesarios (Supabase > Edge Functions > Secrets):
//   EB_APP_ID       identificador de la aplicación de Enable Banking
//   EB_PRIVATE_KEY  clave privada (PEM) de esa aplicación
// Opcional:
//   REDIRECTS_PERMITIDOS  direcciones de retorno válidas separadas por comas (por defecto, la web de Nexo Pay)
//
// Acciones (POST JSON { accion, ... }): bancos, conectar, confirmar, sincronizar, desconectar.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const API = 'https://api.enablebanking.com';
const REDIRECTS = (Deno.env.get('REDIRECTS_PERMITIDOS') ?? 'https://balanz-app.vercel.app/bancos').split(',').map((s) => s.trim());
const DIAS_PRIMERA_VEZ = 7;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ───────────────────────── Firma del JWT (RS256) ─────────────────────────
const b64url = (datos: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof datos === 'string' ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function longitudDer(n: number): number[] {
  if (n < 128) return [n];
  if (n < 256) return [0x81, n];
  return [0x82, n >> 8, n & 255];
}

/** Envuelve una clave RSA PKCS#1 ("BEGIN RSA PRIVATE KEY") en PKCS#8, que es lo que entiende WebCrypto. */
function pkcs1aPkcs8(pkcs1: Uint8Array): Uint8Array {
  const octetos = [0x04, ...longitudDer(pkcs1.length), ...pkcs1];
  const algoritmo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const cuerpo = [0x02, 0x01, 0x00, ...algoritmo, ...octetos];
  return new Uint8Array([0x30, ...longitudDer(cuerpo.length), ...cuerpo]);
}

let claveCache: CryptoKey | null = null;
async function clavePrivada(): Promise<CryptoKey> {
  if (claveCache) return claveCache;
  const pem = (Deno.env.get('EB_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  if (!pem.includes('PRIVATE KEY')) throw new Error('Falta el secreto EB_PRIVATE_KEY');
  const esPkcs1 = pem.includes('BEGIN RSA PRIVATE KEY');
  const base64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  let der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (esPkcs1) der = pkcs1aPkcs8(der);
  claveCache = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return claveCache;
}

async function jwt(): Promise<string> {
  const appId = Deno.env.get('EB_APP_ID');
  if (!appId) throw new Error('Falta el secreto EB_APP_ID');
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }));
  const carga = b64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: ahora, exp: ahora + 3600 }));
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await clavePrivada(), new TextEncoder().encode(`${cabecera}.${carga}`));
  return `${cabecera}.${carga}.${b64url(firma)}`;
}

async function eb(metodo: string, ruta: string, cuerpo?: unknown) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${await jwt()}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = { mensaje: texto };
  }
  if (!r.ok) {
    const e = new Error(datos?.message ?? datos?.error ?? `Enable Banking respondió ${r.status}`) as Error & { estado: number };
    e.estado = r.status;
    throw e;
  }
  return datos;
}

// ───────────────────────── Lógica ─────────────────────────
const euros = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const iso = (d: Date) => d.toISOString().slice(0, 10);

function textoDeMovimiento(t: any): { texto: string; fecha: string } | null {
  const monto = Math.abs(Number(t?.transaction_amount?.amount));
  if (!isFinite(monto) || monto === 0) return null;
  const ingreso = t.credit_debit_indicator === 'CRDT';
  const contraparte = (ingreso ? t.debtor?.name : t.creditor?.name) || '';
  const concepto = (Array.isArray(t.remittance_information) ? t.remittance_information[0] : '') || t.note || '';
  const comercio = String(contraparte || concepto || 'Movimiento del banco').replace(/\s+/g, ' ').trim().slice(0, 60);
  const moneda = t.transaction_amount?.currency && t.transaction_amount.currency !== 'EUR' ? ` ${t.transaction_amount.currency}` : ' €';
  const texto = `${ingreso ? 'Ingreso recibido. ' : ''}Comercio: ${comercio} Importe: ${euros(monto)}${moneda}`;
  const fecha = t.booking_date || t.transaction_date || t.value_date || iso(new Date());
  return { texto, fecha };
}

async function sincronizarConexion(admin: any, userId: string, c: any) {
  const desde = c.ultimo_sync ? new Date(new Date(c.ultimo_sync).getTime() - 3 * 86400000) : new Date(Date.now() - DIAS_PRIMERA_VEZ * 86400000);
  let nuevos = 0;
  const cuentas = Array.isArray(c.cuentas) ? c.cuentas : [];
  for (const cuenta of cuentas) {
    let clave: string | undefined;
    for (let pagina = 0; pagina < 6; pagina++) {
      const q = new URLSearchParams({ date_from: iso(desde), transaction_status: 'BOOK' });
      if (clave) q.set('continuation_key', clave);
      const r = await eb('GET', `/accounts/${cuenta.uid}/transactions?${q.toString()}`);
      for (const t of r?.transactions ?? []) {
        const referencia = `${cuenta.uid}:${t.entry_reference || t.transaction_id || `${t.booking_date}|${t.transaction_amount?.amount}|${(t.remittance_information ?? []).join(' ')}`}`;
        const { data: visto } = await admin.from('banco_vistos').select('referencia').eq('user_id', userId).eq('referencia', referencia).maybeSingle();
        if (visto) continue;
        const m = textoDeMovimiento(t);
        await admin.from('banco_vistos').insert({ user_id: userId, referencia });
        if (!m) continue;
        const { error } = await admin.from('captaciones').insert({ user_id: userId, texto: m.texto, creado: `${m.fecha}T12:00:00Z` });
        if (!error) nuevos++;
      }
      clave = r?.continuation_key || undefined;
      if (!clave) break;
    }
    try {
      const b = await eb('GET', `/accounts/${cuenta.uid}/balances`);
      const pref = (b?.balances ?? []).find((x: any) => ['CLAV', 'ITAV', 'XPCD', 'CLBD'].includes(x.balance_type)) ?? b?.balances?.[0];
      if (pref) cuenta.saldo = Number(pref.balance_amount?.amount);
    } catch {
      // el saldo es un extra: si el banco no lo da, no se rompe nada
    }
  }
  await admin.from('banco_conexiones').update({ cuentas, ultimo_sync: new Date().toISOString(), estado: 'activa' }).eq('id', c.id);
  return nuevos;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const cabeceraAuth = req.headers.get('Authorization') ?? '';
    const usuarioCliente = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: cabeceraAuth } } });
    const { data: u } = await usuarioCliente.auth.getUser();
    if (!u?.user) return json({ error: 'Inicia sesión para conectar un banco.' }, 401);
    const userId = u.user.id;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const cuerpo = await req.json().catch(() => ({}));

    if (cuerpo.accion === 'bancos') {
      const pais = String(cuerpo.pais ?? 'ES').toUpperCase().slice(0, 2);
      const r = await eb('GET', `/aspsps?country=${pais}`);
      const bancos = (r?.aspsps ?? [])
        .filter((a: any) => !a.psu_types || a.psu_types.includes('personal'))
        .map((a: any) => ({ nombre: a.name, pais: a.country, logo: a.logo ?? null, dias: a.maximum_consent_validity ? Math.floor(a.maximum_consent_validity / 86400) : null }))
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
      return json({ bancos });
    }

    if (cuerpo.accion === 'conectar') {
      const redirect = String(cuerpo.redirect ?? '');
      if (!REDIRECTS.includes(redirect)) return json({ error: 'La dirección de retorno no está permitida.' }, 400);
      const banco = String(cuerpo.banco ?? '');
      const pais = String(cuerpo.pais ?? 'ES').toUpperCase().slice(0, 2);
      if (!banco) return json({ error: 'Elige un banco.' }, 400);
      // El consentimiento dura lo máximo que permita el banco (hasta 180 días), para tener que renovarlo lo menos posible.
      let dias = 90;
      try {
        const lista = await eb('GET', `/aspsps?country=${pais}`);
        const a = (lista?.aspsps ?? []).find((x: any) => x.name === banco);
        if (a?.maximum_consent_validity) dias = Math.min(180, Math.floor(a.maximum_consent_validity / 86400));
      } catch {
        // se queda en 90
      }
      const estado = crypto.randomUUID();
      await admin.from('banco_estados').insert({ estado, user_id: userId, banco, pais });
      const r = await eb('POST', '/auth', {
        access: { valid_until: new Date(Date.now() + dias * 86400000).toISOString() },
        aspsp: { name: banco, country: pais },
        state: estado,
        redirect_url: redirect,
        psu_type: 'personal',
        language: 'es',
      });
      return json({ url: r.url });
    }

    if (cuerpo.accion === 'confirmar') {
      const { data: e } = await admin.from('banco_estados').select('*').eq('estado', String(cuerpo.state ?? '')).eq('user_id', userId).maybeSingle();
      if (!e) return json({ error: 'Esta conexión ya se completó o ha caducado. Empieza de nuevo.' }, 400);
      await admin.from('banco_estados').delete().eq('estado', e.estado);
      const s = await eb('POST', '/sessions', { code: String(cuerpo.code ?? '') });
      const cuentas = (s.accounts ?? []).map((a: any) => ({
        uid: a.uid,
        nombre: a.name || a.product || a.details || 'Cuenta',
        iban: a.account_id?.iban ? `…${String(a.account_id.iban).slice(-4)}` : '',
        moneda: a.currency ?? 'EUR',
      }));
      const { data: fila, error } = await admin
        .from('banco_conexiones')
        .insert({ user_id: userId, session_id: s.session_id, banco: e.banco, pais: e.pais, cuentas, valido_hasta: s.access?.valid_until ?? null })
        .select('*')
        .single();
      if (error) throw error;
      const nuevos = await sincronizarConexion(admin, userId, fila).catch(() => 0);
      return json({ ok: true, banco: e.banco, cuentas: cuentas.length, nuevos });
    }

    if (cuerpo.accion === 'sincronizar') {
      const { data: conexiones } = await admin.from('banco_conexiones').select('*').eq('user_id', userId);
      let nuevos = 0;
      const avisos: string[] = [];
      for (const c of conexiones ?? []) {
        if (c.valido_hasta && new Date(c.valido_hasta).getTime() < Date.now()) {
          await admin.from('banco_conexiones').update({ estado: 'caducada' }).eq('id', c.id);
          avisos.push(`${c.banco}: el permiso ha caducado, vuelve a conectarlo.`);
          continue;
        }
        try {
          nuevos += await sincronizarConexion(admin, userId, c);
        } catch (err) {
          const estado = (err as { estado?: number }).estado;
          if (estado === 401 || estado === 403 || estado === 422) await admin.from('banco_conexiones').update({ estado: 'caducada' }).eq('id', c.id);
          avisos.push(`${c.banco}: ${(err as Error).message}`);
        }
      }
      return json({ nuevos, avisos });
    }

    if (cuerpo.accion === 'desconectar') {
      const { data: c } = await admin.from('banco_conexiones').select('*').eq('id', String(cuerpo.id ?? '')).eq('user_id', userId).maybeSingle();
      if (!c) return json({ error: 'No encuentro esa conexión.' }, 404);
      try {
        await eb('DELETE', `/sessions/${c.session_id}`);
      } catch {
        // si el banco ya la había cerrado, da igual
      }
      await admin.from('banco_conexiones').delete().eq('id', c.id);
      return json({ ok: true });
    }

    return json({ error: 'Acción desconocida.' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Error inesperado' }, 500);
  }
});
