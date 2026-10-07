<div align="center">

<img src="assets/images/icon.png" alt="Logo de Balanz" width="110" />

# Balanz

**Tu dinero, en equilibrio.**
App de control de gastos e ingresos para **iOS, Android y web**.

[![Probar la web](https://img.shields.io/badge/Probar_la_web-balanz--app.vercel.app-4f46e5?style=for-the-badge&logo=vercel&logoColor=white)](https://balanz-app.vercel.app)

![Expo](https://img.shields.io/badge/Expo_SDK_57-000020?style=flat&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

</div>

---

## 💡 Qué es

Balanz sirve para llevar el control del dinero del día a día: anotar gastos e ingresos en dos toques, saber cuánto
tienes de verdad, fijar presupuestos y metas de ahorro, y **captar los pagos del banco sin teclear nada**.

Nació para uso familiar (cada persona tiene su cuenta y nadie ve los datos de otro) y es mi primer proyecto completo de
principio a fin: diseño, base de datos local, sincronización en la nube, seguridad por usuario y despliegue en
producción. Una sola base de código en TypeScript funciona en móvil y en web.

**Versión 1.0.** Probada en emulador Android y en la web (móvil y escritorio). Las partes que dependen del hardware
(Face ID, vibraciones, cámara) están programadas pero no las he podido verificar en un iPhone real.

## ✨ Funciones

| | |
|---|---|
| 💸 **Movimientos** | Gastos e ingresos con categorías, etiquetas, varias divisas y foto del ticket. Buscador y filtros |
| 🏦 **Saldo real** | Dinero inicial (efectivo, cuenta, ahorros) + ingresos − gastos, y opción de **ajustar el saldo disponible** a lo que tienes de verdad |
| 🚀 **Alta inicial** | Recorrido guiado la primera vez: cuánto dinero tienes y un límite mensual opcional |
| 📊 **Presupuestos** | Global y por categoría, con avisos al acercarte al límite |
| 🎯 **Metas de ahorro** | Objetivos con progreso |
| 🔁 **Recurrentes** | Pagos fijos que se apuntan solos: cada mes, cada 2, 3, 4 o 6 meses, o cada año. Detecta suscripciones |
| 👥 **Compartidos** | Gastos en grupo y reparto entre personas |
| ⚡ **Captura automática** | Apple Pay y SMS del banco (iOS, con Atajos) y notificaciones (Android). Los pagos llegan a *Pendientes* para confirmarlos, o se **apuntan directamente**; la app aprende reglas de categorización |
| 📄 **Informes** | Informe mensual exportable a PDF |
| 📗 **Excel** | **Exporta** la contabilidad anual con formato fijo (hoja *Inicio* + una por mes) e **importa** ese mismo formato y tablas planas |
| 🔐 **Cuentas separadas** | Cada persona entra con su correo y solo ve sus datos, también entre dispositivos |
| 👆 **Bloqueo biométrico** | Face ID / huella, que se vuelve a pedir tras un rato fuera de la app |
| ♿ **Accesibilidad** | Tamaño de letra, alto contraste, reducir movimiento y etiquetas para lector de pantalla |
| 🎨 **Diseño** | Logo que se dibuja al abrir, modo claro/oscuro, vibración háptica y una web adaptada a móvil y escritorio |

### ⚡ Captura de pagos, en detalle

- **iPhone:** un Atajo recoge el pago al pagar con Apple Pay o al llegar un SMS del banco y lo manda a Balanz.
- **Android:** MacroDroid o Tasker leen la notificación del banco y la envían igual.
- **Sin abrir la app:** un botón en el Centro de Control (o el botón de acción del iPhone) pregunta, por ejemplo,
  `Café 3,50` y lo apunta.
- **Dos modos:** pasar por *Pendientes* para confirmar cada uno, o apuntar directamente. Si no entiende el importe,
  siempre cae en *Pendientes*.
- **Entiende texto libre:** `Café 3,50`, `Ingreso 20 Abuela`, `Compra de 12,50 € en MERCADONA con tu tarjeta *1234`.

### 📗 Excel, en detalle

- **Exportar:** libro anual (`CONTABILIDAD_2026.xlsx`) con una hoja *Inicio* —dinero inicial, dinero actual y resumen
  mensual en verde/rojo según ganes o pierdas— y una hoja por mes con **INGRESOS a la izquierda y GASTOS a la
  derecha**, con sus totales y fórmulas.
- **Importar:** lee ese mismo formato y también tablas planas. Evita duplicados, detecta fechas tecleadas al revés y
  coge el dinero de inicio de año como dinero inicial.
- El libro se genera a mano (XML dentro de un zip), así funciona igual en web y en móvil sin librerías pesadas.

### 🖥️ Web adaptable

- **Móvil:** pestañas abajo y una columna.
- **Escritorio (≥ 900 px):** menú lateral y contenido centrado.
- **Pantalla ancha (≥ 1100 px):** columnas, con el saldo y un panel de *gasto por categoría del mes* a un lado y la
  lista de movimientos al otro.

## 📱 Pantallas

| Pantalla | Archivo |
|---|---|
| Movimientos y resumen del mes | `src/app/index.tsx` |
| Presupuestos | `src/app/presupuesto.tsx` |
| Pagos pendientes de confirmar | `src/app/pendientes.tsx` |
| Metas de ahorro | `src/app/metas.tsx` |
| Gastos recurrentes | `src/app/recurrentes.tsx` |
| Gastos compartidos | `src/app/compartidos.tsx` |
| Informe mensual | `src/app/informe.tsx` |
| Reglas de categorización | `src/app/reglas.tsx` |
| Configurar la captura con Atajos | `src/app/atajos.tsx` |
| Alta inicial | `src/app/bienvenida.tsx` |
| Ajustes | `src/app/ajustes.tsx` |

## 🛠️ Tecnologías

| Capa | Tecnología |
| --- | --- |
| App | Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · Expo Router (rutas tipadas) |
| Animación | Reanimated 4 · react-native-svg |
| Datos locales | SQLite (`expo-sqlite`) en móvil · `localStorage` en web, con la misma API y una base por usuario |
| Nube | Supabase: autenticación, Postgres con Row Level Security y funciones RPC |
| Nativo | Notificaciones, biometría, cámara, haptics, compartir e impresión a PDF (módulos de Expo) |
| Archivos | `xlsx` para leer Excel y un generador propio con `jszip` para escribirlo con formato |
| Web | Exportación estática en Vercel, instalable como PWA, con cabeceras de seguridad |

## 🏗️ Arquitectura

```
 Atajo de iOS / MacroDroid ──► Supabase (función RPC, solo AÑADE)
                                   │  captaciones (bandeja)  o  gastos (directo)
                                   ▼
 Móvil / Web  ◄── sincronización ──┘
   SQLite o localStorage (una base por usuario, funciona sin conexión)
```

```
src/
  app/                    pantallas (Expo Router)
  components/             logo animado, intro, alta inicial, modal de gasto, bloqueo, login…
  db.ts                   base de datos local en SQLite
  db.web.ts               la misma API sobre localStorage (Metro elige el archivo según la plataforma)
  sync.ts                 sincronización con Supabase (movimientos, perfil y captaciones)
  captura.ts              interpreta textos de pagos: importe, comercio, categoría, gasto o ingreso
  recurrentes.ts          generación automática de gastos fijos
  excel.ts                importación y exportación a Excel
  excel-contabilidad.ts   generador del libro anual con formato
  informe.ts              informe mensual en PDF
  layout.ts               tamaños de la web: móvil, escritorio y pantalla ancha
  tema.ts                 modo claro / oscuro y accesibilidad
supabase/                 scripts SQL: tablas, políticas RLS y funciones
```

**Local primero:** la app funciona contra la base local y sincroniza con la nube al abrirla, al volver a ella y
cada 30 segundos. Cada cuenta tiene su propia base local, así que varias personas pueden compartir dispositivo sin
mezclar datos. El dinero inicial y el límite viajan con la cuenta, así que otro dispositivo parte con los mismos datos.

## 🧩 Retos técnicos

- **Leer pagos de textos del banco:** `captura.ts` usa expresiones regulares para sacar importe y comercio de SMS y
  notificaciones con formatos distintos (`12,50 €`, `EUR 1.234,56`, `importe: …`), distinguir ingresos de gastos
  y adivinar la categoría por el nombre del comercio. La versión del servidor hace lo mismo en SQL para poder apuntar
  el pago sin abrir la app.
- **Una API, dos motores:** `db.ts` (SQLite) y `db.web.ts` (localStorage) tienen la misma interfaz, así que las
  pantallas no saben en qué plataforma están. Un chequeo de tipos asegura que no se desvíen.
- **Seguridad multiusuario:** políticas RLS en Postgres para que cada usuario solo lea y escriba sus filas, y funciones
  RPC que solo permiten *añadir* pagos a tu propia bandeja.
- **Excel sin librerías pesadas:** el libro anual se escribe como XML dentro de un zip, con estilos, fórmulas,
  celdas combinadas y reglas de color, y se comprobó importándolo de vuelta.
- **Una app, tres tamaños:** la misma pantalla se reorganiza entre móvil, escritorio y pantalla ancha sin tocar la
  versión de móvil.

## ▶️ Ejecutarlo en local

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en **SQL Editor**, en este orden, los scripts de
   [`supabase/`](supabase):
   1. `seguridad.sql`: cada usuario solo accede a sus gastos.
   2. `captaciones.sql`: token personal, bandeja de captura y columnas nuevas.
   3. `perfil.sql`: perfil sincronizado entre dispositivos.
   4. `movimientos.sql` *(opcional)*: apuntar directamente los pagos sin pasar por *Pendientes*.
2. Copia `.env.example` a `.env` y rellena la URL y la clave *publishable* de tu proyecto.
3. Instala y arranca:

```bash
npm install
npx expo start      # móvil con Expo Go
npm run web         # navegador
```

Para publicar la web: `npm run build:web` y desplegar la carpeta `dist` (hay un `vercel.json` listo).
Las variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` se configuran en el proyecto de Vercel.

En la app, **Más → Atajos, SMS y acceso rápido** muestra la URL, la clave y tu token, con los pasos para iPhone y Android.

## 🔒 Seguridad y privacidad

- Las claves no están en el repositorio: se leen de variables de entorno.
- La clave *publishable* de Supabase es pública por diseño. La protección real son las políticas **RLS**
  (cada usuario solo puede leer y escribir sus filas) y que el acceso anónimo está revocado.
- La captura usa un token personal por usuario (se puede rotar) y funciones que solo permiten **añadir**, con tope de
  tamaño en la bandeja; nunca leer.
- Contraseñas de 10 caracteres mínimo con letras y números, y confirmación de correo al registrarse.
- La web se sirve con cabeceras de seguridad: HSTS, anti-iframe, `nosniff`, CSP y política de permisos.
- Los datos viven en el dispositivo de cada usuario y en su propia cuenta de la nube.
- **Limitaciones conocidas:** la base local del dispositivo no va cifrada (el bloqueo protege la pantalla, no el
  archivo), y la librería `xlsx` tiene avisos de seguridad sin parche, por lo que solo abre archivos que elige el
  usuario y con un límite de 5 MB.

## 🗺️ Próximos pasos

- [x] Versión web publicada e instalable como PWA
- [x] Sincronización en la nube y cuentas separadas
- [x] Captura automática de pagos con apunte directo
- [x] Importar y exportar la contabilidad en Excel
- [ ] Publicar la app nativa en **Google Play**
- [ ] Publicar la app nativa en **App Store**
- [ ] Varias cuentas con saldo propio y transferencias entre ellas
- [ ] Notificaciones push reales cuando entra o sale dinero con la app cerrada
- [ ] Conexión directa con el banco (Open Banking)
- [ ] Cuentas de familia con un presupuesto compartido
- [ ] Escaneo de tickets con OCR, widget de pantalla de inicio y modo privado para ocultar importes
- [ ] Añadir capturas de pantalla y un vídeo de demo a este README

## 👤 Autor y licencia

Hecho por **Samuel Cleto Malle**, estudiante de DAM.
[GitHub](https://github.com/SamuelCletoMalle) · ✉️ samuelcletomalle@gmail.com

Código publicado para verlo y evaluarlo. **Todos los derechos reservados** © 2026 Samuel: no se permite copiarlo,
reutilizarlo ni redistribuirlo sin permiso. Ver [LICENSE](LICENSE).
