# Conectar tu banco (Enable Banking)

Nexo Pay trae tus pagos y cobros del banco con Open Banking. Es **solo lectura**: no puede mover dinero. Los movimientos
llegan a **Pendientes** para que los revises y los añadas.

Las claves nunca van en la app ni en GitHub: viven como secretos de Supabase y solo las usa la función `banco`.

## 1. Enable Banking (en su web)

1. Entra en el Control Panel de Enable Banking → **API applications** → registra una aplicación, entorno **Production**.
2. Genera la **clave privada** cuando te la pida (se descarga un `.pem`). Guárdala; no se puede volver a ver.
3. En **Redirect URLs** añade exactamente: `https://balanz-app.vercel.app/bancos`
4. Activa la aplicación en **modo restringido** vinculando **todas** tus cuentas bancarias (solo se podrá leer lo que vincules).
5. Apunta el **Application ID** (un UUID).

## 2. Supabase

**Atajo:** `powershell -ExecutionPolicy Bypass -File scripts/activar-bancos.ps1` hace los pasos 1 a 3 de esta sección (te pide el Application ID y la ruta del .pem, publica la función y te deja el SQL copiado). Si prefieres hacerlo a mano:

1. **SQL Editor** → pega el contenido de `supabase/bancos.sql` → Run.
2. **Edge Functions** → *Deploy a new function* → nombre `banco` → pega `supabase/functions/banco/index.ts` → Deploy.
   (Con la CLI: `supabase functions deploy banco`.)
3. **Edge Functions → Secrets**, añade:
   - `EB_APP_ID` = tu Application ID
   - `EB_PRIVATE_KEY` = el contenido completo del `.pem` (con las líneas `-----BEGIN …-----` y `-----END …-----`)

## 3. En la app

**Más → Bancos → Conectar un banco** → elige el tuyo → autorizas en la web del banco → vuelves a Nexo Pay y listo.

- El permiso dura hasta lo que permita el banco (hasta 180 días). La app avisa cuando caduca y se renueva con un toque.
- La app repasa los bancos al abrirla y cada pocos minutos, y puedes forzarlo con **Sincronizar**. Los bancos limitan las
  consultas automáticas (unas 4 al día sin que estés delante), por eso no hay un repaso cada minuto.
- Si quitas un banco, Nexo Pay deja de leerlo; lo que ya apuntaste se queda.
