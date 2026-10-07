# Publicar Balanz en Google Play y App Store

Balanz ya funciona como web instalable. Esta guía es para llevarla también a las tiendas, con las ventajas de una app
nativa: notificaciones con la app cerrada, widgets y el botón del panel de control sin pasar por Atajos.

> Las tiendas piden crear cuentas de desarrollador a nombre del autor y pagar una cuota; por eso este paso lo tiene que
> hacer la persona dueña de la app.

## Qué hace falta

| Tienda | Cuenta | Coste | Para qué |
| --- | --- | --- | --- |
| Google Play | [Play Console](https://play.google.com/console) | 25 USD, una sola vez | Android |
| App Store | [Apple Developer Program](https://developer.apple.com/programs/) | 99 USD al año | iPhone y iPad (y un Mac no es imprescindible con EAS) |
| Compilar en la nube | [Expo EAS](https://expo.dev) | Plan gratuito con límites | Genera los archivos `.aab` e `.ipa` |

## Pasos

1. **Cuenta de Expo y EAS**
   ```bash
   npm install -g eas-cli
   eas login
   eas init
   ```
2. **Identificadores.** Ya están en `app.json`: `app.balanz.mobile` (iOS y Android). Si ya tienes otro nombre de
   organización, cámbialo *antes* de publicar: después no se puede cambiar.
3. **Variables de entorno en EAS** (las mismas que en Vercel):
   ```bash
   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://TU-PROYECTO.supabase.co" --visibility plaintext
   eas env:create --name EXPO_PUBLIC_SUPABASE_KEY --value "tu_clave_publishable" --visibility plaintext
   ```
4. **Probar en un móvil real** antes de enviar nada:
   ```bash
   eas build --profile preview --platform android   # genera un APK para instalar a mano
   eas build --profile development --platform ios    # compilación de desarrollo (necesita cuenta de Apple)
   ```
5. **Compilar para las tiendas:**
   ```bash
   eas build --profile production --platform all
   eas submit --platform android
   eas submit --platform ios
   ```
6. **Fichas de las tiendas.** Necesitarás: nombre, descripción corta y larga, capturas de pantalla (móvil), icono
   (`assets/images/icon.png`), una **política de privacidad** con una URL pública y la información de "seguridad de los
   datos" / "privacidad de la app".

## Política de privacidad (qué decir)

- Se guardan en el dispositivo y en la cuenta del usuario (Supabase) los movimientos, categorías, metas y ajustes.
- Cada usuario solo puede ver sus propios datos.
- No se venden ni se comparten datos con terceros ni se usan para publicidad.
- Se puede borrar toda la información desde *Más → Borrar todos los datos*.
- Si se activa el aviso de errores, solo se envía el mensaje del error, la plataforma y la versión, nunca importes ni
  descripciones.

## Antes de enviar

- [ ] `npm test` y `npx tsc --noEmit` sin errores.
- [ ] Probado en un iPhone y un Android reales (Face ID, vibraciones, cámara para el ticket).
- [ ] Capturas de pantalla hechas (se pueden sacar de la web en modo móvil).
- [ ] Cerrado el registro abierto en Supabase si la app va a ser solo para la familia, o decidido qué hacer con el
      correo de confirmación (el plan gratuito envía pocos correos por hora).
