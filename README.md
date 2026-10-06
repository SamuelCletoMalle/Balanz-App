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

Balanz sirve para llevar el control del dinero del día a día: anotar gastos e ingresos en dos toques, ver cuánto
queda del mes, fijar presupuestos y metas de ahorro, y **captar los pagos del banco sin teclear nada**.

Es mi primer proyecto completo de principio a fin: diseño, base de datos local, sincronización en la nube,
seguridad por usuario y despliegue en producción. Una sola base de código en TypeScript funciona en móvil y en web.

## ✨ Funciones

| | |
|---|---|
| 💸 **Movimientos** | Gastos e ingresos con categorías, etiquetas, varias divisas y foto del ticket |
| 🏦 **Saldo real** | Dinero inicial (efectivo, cuenta, ahorros) + ingresos − gastos |
| 📊 **Presupuestos** | Global y por categoría, con avisos al acercarte al límite |
| 🎯 **Metas de ahorro** | Objetivos con progreso |
| 🔁 **Recurrentes** | Gastos fijos que se generan solos y detección de suscripciones |
| 👥 **Compartidos** | Gastos en grupo y reparto entre personas |
| ⚡ **Captura automática** | Apple Pay y SMS del banco (iOS, con Atajos) y notificaciones (Android). Los pagos llegan a *Pendientes* para confirmarlos y la app aprende reglas de categorización |
| 📄 **Informes** | Informe mensual exportable a PDF |
| 📗 **Excel** | Importar y exportar, incluidos libros por meses con ingresos y gastos lado a lado |
| 🔐 **Cuentas separadas** | Cada persona entra con su correo y solo ve sus datos |
| 👆 **Bloqueo biométrico** | Face ID / huella, que se vuelve a pedir tras un rato fuera de la app |
| ♿ **Accesibilidad** | Tamaño de letra, alto contraste, reducir movimiento y etiquetas para lector de pantalla |
| 🎨 **Diseño** | Logo animado al abrir, alta inicial guiada, modo claro/oscuro y vibración háptica |

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
| Ajustes | `src/app/ajustes.tsx` |

## 🛠️ Tecnologías

| Capa | Tecnología |
| --- | --- |
| App | Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · Expo Router (rutas tipadas) |
| Animación | Reanimated 4 · react-native-svg |
| Datos locales | SQLite (`expo-sqlite`) en móvil · `localStorage` en web, con la misma API y una base por usuario |
| Nube | Supabase: autenticación, Postgres con Row Level Security y funciones RPC |
| Nativo | Notificaciones, biometría, cámara, haptics, compartir e impresión a PDF (módulos de Expo) |
| Archivos | `xlsx` para importar y exportar Excel |
| Web | Exportación estática en Vercel, instalable como PWA, con cabeceras de seguridad |

## 🏗️ Arquitectura

```
src/
  app/            pantallas (Expo Router)
  components/     logo animado, intro, alta inicial, modal de gasto, bloqueo, login…
  db.ts           base de datos local en SQLite
  db.web.ts       la misma API sobre localStorage (Metro elige el archivo según la plataforma)
  sync.ts         sincronización con Supabase (movimientos, perfil y captaciones)
  captura.ts      interpreta textos de pagos: importe, comercio, categoría, gasto o ingreso
  recurrentes.ts  generación automática de gastos fijos
  excel.ts        importación y exportación a Excel
  informe.ts      informe mensual en PDF
  tema.ts         modo claro / oscuro y accesibilidad
supabase/         scripts SQL: tablas, políticas RLS y función de captura
```

**Local primero:** la app funciona contra la base local y sincroniza con la nube al abrirla, al volver a ella y
cada 30 segundos. Cada cuenta tiene su propia base local, así que varias personas pueden compartir dispositivo sin
mezclar datos.

## 🧩 Retos técnicos

- **Leer pagos de textos del banco:** `captura.ts` usa expresiones regulares para sacar importe y comercio de SMS y
  notificaciones con formatos distintos (`12,50 €`, `EUR 1.234,56`, `importe: …`), distinguir ingresos de gastos
  y adivinar la categoría por el nombre del comercio.
- **Una API, dos motores:** `db.ts` (SQLite) y `db.web.ts` (localStorage) tienen la misma interfaz, así que las
  pantallas no saben en qué plataforma están.
- **Seguridad multiusuario:** políticas RLS en Postgres para que cada usuario solo lea y escriba sus filas, y una
  función RPC que solo permite *añadir* pagos a tu propia bandeja.

## ▶️ Ejecutarlo en local

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en **SQL Editor** los tres scripts de
   [`supabase/`](supabase): `captaciones.sql`, `seguridad.sql` y `perfil.sql`.
2. Copia `.env.example` a `.env` y rellena la URL y la clave *publishable* de tu proyecto.
3. Instala y arranca:

```bash
npm install
npx expo start      # móvil con Expo Go
npm run web         # navegador
```

Para publicar la web: `npm run build:web` y desplegar la carpeta `dist` (hay un `vercel.json` listo).
Las variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` se configuran en el proyecto de Vercel.

## 🔒 Seguridad y privacidad

- Las claves no están en el repositorio: se leen de variables de entorno.
- La clave *publishable* de Supabase es pública por diseño. La protección real son las políticas **RLS**
  (cada usuario solo puede leer y escribir sus filas) y que el acceso anónimo está revocado.
- La captura por Atajos usa un token personal por usuario (se puede rotar) y una función que solo permite
  **añadir** a tu propia bandeja, con tope de tamaño; nunca leer.
- La web se sirve con cabeceras de seguridad: HSTS, anti-iframe, `nosniff`, CSP y política de permisos.
- Los datos viven en el dispositivo de cada usuario y en su propia cuenta de la nube.

## 🗺️ Próximos pasos

- [x] Versión web publicada e instalable como PWA
- [x] Sincronización en la nube y cuentas separadas
- [ ] Publicar la app nativa en **Google Play**
- [ ] Publicar la app nativa en **App Store**
- [ ] Añadir capturas de pantalla y un vídeo de demo a este README

## 👤 Autor y licencia

Hecho por **Samuel Cleto Malle**, estudiante de DAM.
[GitHub](https://github.com/SamuelCletoMalle) · ✉️ samuelcletomalle@gmail.com

Código publicado para verlo y evaluarlo. **Todos los derechos reservados** © 2026 Samuel: no se permite copiarlo,
reutilizarlo ni redistribuirlo sin permiso. Ver [LICENSE](LICENSE).
