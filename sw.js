const CACHE_NAME = 'sanad-ai-v12.6.9';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/sanad-icon.svg',
  './icons/icon-192.png',
  './sanad-radio-playlist.js',
  './sanad-sync.js',
  './sanad-audio-media.js',
  './state.js',
  './navigation.js',
  './chats.js',
  './groups.js',
  './contacts.js',
  './calls.js',
  './ai-client.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        CORE_ASSETS.map((asset) =>
          cache.add(asset).catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!req || req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return;
  if (req.headers.get('range') || url.pathname.endsWith('.mp3')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(
          (cached) => cached || caches.match('./index.html', { ignoreSearch: true })
        )
      )
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'سند AI', body: 'وصلك تحديث جديد في سند AI' };
  try {
    if (event.data) {
      data = Object.assign({}, data, event.data.json());
    }
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar'
    })
  );
});
