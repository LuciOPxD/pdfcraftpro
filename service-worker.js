const CACHE_NAME = 'pdfcraft-v1';
const RUNTIME_CACHE = 'pdfcraft-runtime-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/favicon.svg',
  '/logo.svg',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap'
];

// Cache external libraries
const externalLibraries = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(urlsToCache)),
      caches.open(RUNTIME_CACHE)
        .then((cache) => cache.addAll(externalLibraries))
    ])
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For navigations, prefer cache but fall back to network
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For same-origin requests, use cache first strategy
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
        .catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // For external resources, use network first with fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return caches.match(request);
        }
        const responseToCache = response.clone();
        const cacheName = request.url.includes('fonts') ? CACHE_NAME : RUNTIME_CACHE;
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});
