const CACHE_NAME = 'sanad-ai-v9.0.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/sanad-icon.svg',
  './js/state.js',
  './js/navigation.js',
  './js/chats.js',
  './js/groups.js',
  './js/contacts.js',
  './js/calls.js',
  './js/ai-client.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'سند AI', body: 'وصلك تحديث جديد في سند AI' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/sanad-icon.svg',
      badge: './icons/sanad-icon.svg',
      dir: 'rtl',
      lang: 'ar'
    })
  );
});
