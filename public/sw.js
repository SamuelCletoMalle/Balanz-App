/**
 * Balanz · control de gastos personales
 * Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
 */
// Service worker: deja abrir la app sin conexión. Los datos ya viven en el dispositivo; esto guarda la propia app.
// - Páginas: primero la red (para tener siempre la versión nueva) y, si no hay conexión, la última guardada.
// - Archivos con nombre único (/_expo/static, iconos, fuentes): primero lo guardado, porque no cambian.
// - Nada de otros dominios (Supabase) ni peticiones que no sean GET.
const VERSION = 'balanz-v2';
const BASICOS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(BASICOS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  // Navegación: red primero, con la última copia como respaldo sin conexión.
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copia)).catch(() => {});
          return respuesta;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Archivos que no cambian de nombre: lo guardado primero.
  const estatico = url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/') || /\.(png|ico|woff2?|ttf|json)$/.test(url.pathname);
  if (estatico) {
    evento.respondWith(
      caches.match(peticion).then(
        (guardado) =>
          guardado ||
          fetch(peticion).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(VERSION).then((cache) => cache.put(peticion, copia)).catch(() => {});
            }
            return respuesta;
          })
      )
    );
  }
});
