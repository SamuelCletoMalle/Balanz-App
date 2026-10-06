<div align="center">

# Balanz

**Tu dinero, en equilibrio.** App de control de gastos e ingresos para móvil (iOS y Android) y web.

[Probar la web](https://balanz-app.vercel.app) · Hecho por **Samuel**

</div>

---

## Qué es

Balanz es una app para llevar el control del dinero del día a día: anotar gastos e ingresos en dos toques, ver cuánto
queda del mes, fijar presupuestos y metas de ahorro, y captar los pagos del banco sin teclear nada.

Es uno de mis primeros proyectos completos: diseño, base de datos local, sincronización en la nube, seguridad por
usuario y despliegue en producción.

## Funciones

- **Movimientos** de gasto e ingreso con categorías, etiquetas, divisas y tickets con foto.
- **Saldo real:** dinero inicial (efectivo, cuenta, ahorros) + ingresos − gastos.
- **Presupuestos** global y por categoría, con avisos al acercarte al límite.
- **Metas de ahorro**, **gastos recurrentes** y detección de suscripciones.
- **Gastos compartidos** y reparto entre personas.
- **Captura automática de pagos:** Apple Pay y SMS del banco en iOS mediante Atajos, y notificaciones en Android.
  Los pagos llegan a una bandeja de *Pendientes* para confirmarlos, y la app aprende reglas de categorización.
- **Informe mensual** y exportación a PDF; **importar/exportar Excel** (incluye libros por meses con ingresos y gastos lado a lado).
- **Cuentas separadas:** cada persona entra con su correo y solo ve sus datos. Útil para compartir la web con la familia.
- **Bloqueo con Face ID / huella**.
- **Accesibilidad:** tamaño de letra, alto contraste, reducir movimiento, etiquetas para lector de pantalla.
- **Diseño:** logo propio que se dibuja al abrir la app, alta inicial guiada, modo claro y oscuro, retroalimentación háptica.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| App | Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router |
| Animación | Reanimated 4 · react-native-svg |
| Datos locales | SQLite en móvil · `localStorage` en web (misma API, una base por usuario) |
| Nube | Supabase (autenticación, Postgres con Row Level Security, funciones RPC) |
| Web | Exportación estática desplegada en Vercel (instalable como PWA) |

## Cómo está organizado

```
src/
  app/          pantallas (Expo Router): movimientos, resumen, ajustes, metas, atajos…
  components/   logo animado, intro, alta inicial, modal de gasto, bloqueo…
  db.ts         base de datos local (SQLite)    db.web.ts  la misma API sobre localStorage
  sync.ts       sincronización con Supabase
  captura.ts    interpreta textos de pagos (comercio, importe, categoría)
supabase/       scripts SQL: tablas, políticas de seguridad y función de captura
```

## Ejecutarlo en local

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

## Seguridad y privacidad

- Las claves no están en el repositorio: se leen de variables de entorno.
- La clave *publishable* de Supabase es pública por diseño; la protección real son las políticas **RLS**
  (cada usuario solo puede leer y escribir sus filas) y que el acceso anónimo está revocado.
- La captura por Atajos usa un token personal por usuario (se puede rotar borrándolo) y una función que solo permite **añadir**
  a tu propia bandeja (con tope de tamaño); nunca leer.
- La web se sirve con cabeceras de seguridad (HSTS, anti-iframe, `nosniff`, política de permisos).
- Los datos viven en el dispositivo de cada usuario y en su propia cuenta de la nube.

## Licencia

Código publicado para verlo y evaluarlo. **Todos los derechos reservados** © 2026 Samuel: no se permite copiarlo,
reutilizarlo ni redistribuirlo sin permiso. Ver [LICENSE](LICENSE).
