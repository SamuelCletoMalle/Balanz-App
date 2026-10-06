<div align="center">

<img src="assets/images/icon.png" alt="Logo de Balanz" width="120" />

# Balanz

**Tu dinero, en equilibrio.**
App de control de gastos e ingresos para móvil (iOS y Android) y web.

[Probar la web](https://balanz-app.vercel.app) · Hecho por **Samuel**

</div>

---

## Qué es

Balanz es una app para llevar el dinero del día a día: anotar gastos e ingresos en dos toques, saber cuánto tienes de
verdad, no pasarte del presupuesto y, sobre todo, **no tener que teclear los pagos**: los de Apple Pay y los SMS del
banco llegan solos.

Nació para uso familiar (cada persona tiene su cuenta y nadie ve los datos de otro) y es mi primer proyecto completo:
diseño, base de datos local, sincronización en la nube, seguridad por usuario y despliegue en producción.

**Versión 1.0.** Funciona en Android (probado en emulador), en la web (móvil y escritorio) y en iOS vía web instalable.
Las partes que dependen del hardware (Face ID, vibraciones, cámara) están programadas pero no las he podido verificar
en un iPhone real.

## Funciones

### Día a día
- **Movimientos** de gasto e ingreso con categoría, etiquetas, divisas y foto del ticket. Buscador y filtros.
- **Saldo real:** dinero inicial (efectivo, cuenta, ahorros) + ingresos − gastos, siempre visible. Se puede **ajustar el saldo disponible**
  a lo que tienes de verdad con un solo importe.
- **Alta inicial guiada** la primera vez: cuánto dinero tienes y un límite mensual opcional.
- **Presupuestos** global y por categoría, con avisos al acercarte al límite.
- **Metas de ahorro**, **gastos recurrentes** y **detección de suscripciones**.
- **Gastos compartidos**: repartir un gasto entre varias personas y saber quién te debe.
- **Informe mensual** con comparativa y exportación a PDF.

### Captura automática (lo que más usa)
- **iPhone:** un Atajo recoge el pago al pagar con Apple Pay o al llegar un SMS del banco y lo manda a Balanz.
- **Android:** MacroDroid / Tasker leen la notificación del banco y la envían igual.
- **Sin abrir la app:** un botón en el Centro de Control (o el botón de acción del iPhone) pregunta "Café 3,50" y lo apunta.
- Dos modos a elegir: pasar por **Pendientes** (confirmas cada uno) o **apuntar directamente**. Si no entiende el
  importe, siempre cae en Pendientes.
- Entiende texto libre: `Café 3,50`, `Ingreso 20 Abuela`, `Compra de 12,50 € en MERCADONA con tu tarjeta *1234`.
- La app **aprende reglas** de categoría de los comercios que corriges.

### Excel
- **Exporta** la contabilidad del año con un formato fijo: hoja *Inicio* con el resumen (verde/rojo según si ganas o
  pierdes cada mes) y una hoja por mes con INGRESOS a la izquierda y GASTOS a la derecha, con totales y fórmulas.
- **Importa** ese mismo formato y también tablas planas. Evita duplicados y detecta fechas tecleadas al revés.
- El libro se genera a mano (XML dentro de un zip), así funciona igual en web y en móvil sin librerías pesadas.

### Cuentas y seguridad
- **Cuentas separadas:** cada persona entra con su correo y solo ve sus datos (en el dispositivo y en la nube).
- **Bloqueo con Face ID / huella** al abrir la app.
- **Perfil sincronizado** entre dispositivos: el dinero inicial y el límite siguen a tu cuenta.

### Diseño y accesibilidad
- Logo propio que **se dibuja** al abrir la app, tema claro y oscuro (o el del sistema) y retroalimentación háptica.
- **Accesibilidad:** tamaño de letra, alto contraste, reducir movimiento y etiquetas para lectores de pantalla.
- **Web adaptable:** en móvil, pestañas abajo y una columna; en escritorio, menú lateral, columnas y un panel con el
  gasto por categoría del mes.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| App | Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router |
| Animación | Reanimated 4 · react-native-svg |
| Datos locales | SQLite en móvil · `localStorage` en web (misma API, una base por usuario) |
| Nube | Supabase: autenticación, Postgres con Row Level Security y funciones RPC |
| Excel | `xlsx` para leer, generador propio con `jszip` para escribir con formato |
| Web | Exportación estática desplegada en Vercel, instalable como PWA |

## Cómo funciona por dentro

```
 Atajo de iOS / MacroDroid ──► Supabase (función RPC, solo AÑADE)
                                   │  captaciones (bandeja)  o  gastos (directo)
                                   ▼
 Móvil / Web  ◄── sincronización ──┘
   SQLite o localStorage (una base por usuario, funciona sin conexión)
```

- **Primero local, luego nube:** todo se guarda en el dispositivo y se sincroniza; la app sigue funcionando sin conexión.
- **Una base por usuario:** varias personas pueden usar el mismo dispositivo sin pisarse los datos.
- **El móvil y la web comparten la misma API de datos** (`db.ts` y `db.web.ts`, con un chequeo de tipos que asegura que no se desvíen).
- **La captura no necesita sesión:** el atajo se identifica con un token personal y solo puede añadir a tu bandeja.

```
src/
  app/            pantallas (Expo Router): movimientos, resumen, ajustes, metas, atajos, informe…
  components/     logo animado, intro, alta inicial, modal de gasto, bloqueo…
  db.ts           base de datos local (SQLite)       db.web.ts  la misma API sobre localStorage
  sync.ts         sincronización con Supabase (gastos, captaciones, perfil)
  captura.ts      interpreta textos de pagos: importe, comercio, categoría, ingreso/gasto
  excel.ts        importar / exportar
  excel-contabilidad.ts   generador del libro anual con formato
  layout.ts       tamaños de la web (móvil, escritorio, amplio)
supabase/         scripts SQL: tablas, políticas de seguridad y funciones
```

## Ponerlo en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y ejecuta en **SQL Editor**, en este orden, los scripts de
   [`supabase/`](supabase):
   1. `seguridad.sql`: cada usuario solo accede a sus gastos.
   2. `captaciones.sql`: token personal, bandeja de captura y columnas nuevas.
   3. `perfil.sql`: perfil sincronizado entre dispositivos.
   4. `movimientos.sql` *(opcional)*: apuntar directamente los pagos sin pasar por Pendientes.
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

## Seguridad y privacidad

- Las claves no están en el repositorio: se leen de variables de entorno.
- La clave *publishable* de Supabase es pública por diseño; la protección real son las políticas **RLS**
  (cada usuario solo lee y escribe sus filas) y que el acceso anónimo está revocado.
- La captura usa un token personal por usuario (se puede rotar borrándolo) y funciones que solo **añaden**;
  nunca leen. La bandeja tiene tope de tamaño.
- Contraseñas de 10 caracteres mínimo con letras y números, y confirmación de correo al registrarse.
- La web se sirve con cabeceras de seguridad: HSTS, anti-iframe, `nosniff` y política de permisos.
- Los datos viven en el dispositivo de cada usuario y en su propia cuenta de la nube.
- Limitaciones conocidas: la base local del dispositivo no va cifrada (el bloqueo protege la pantalla, no el archivo)
  y la librería `xlsx` tiene avisos de seguridad sin parche, por lo que solo abre archivos que elige el usuario y
  con un límite de 5 MB.

## Próximas ideas (v2)

- Varias cuentas con saldo propio y transferencias entre ellas.
- Notificaciones push reales cuando entra o sale dinero con la app cerrada.
- Conexión directa con el banco (Open Banking).
- Cuentas de familia con un presupuesto compartido.
- Escaneo de tickets con OCR, widget de pantalla de inicio y modo privado para ocultar importes.

## Licencia

Código publicado para verlo y evaluarlo. **Todos los derechos reservados** © 2026 Samuel: no se permite copiarlo,
reutilizarlo ni redistribuirlo sin permiso. Ver [LICENSE](LICENSE).
