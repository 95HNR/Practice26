const CACHE_NAME = 'drivecheck-v2-cache';
const ASSETS = [
  '/',
  '/index.html',
  '/js/api.js',
  '/js/ui.js',
  '/js/auth.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.socket.io/4.7.2/socket.io.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
