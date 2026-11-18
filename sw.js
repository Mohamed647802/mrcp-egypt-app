const CACHE_NAME = 'mrcp-egypt-pwa-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './egyptian_clinical_bundle.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined)))
    )
  );
  self.clients.claim();
});

// الصفحة الرئيسية: الشبكة أولاً (عشان التحديثات توصل فوراً) ثم الكاش لو أوفلاين أو الشبكة بطيئة
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req, { ignoreSearch: true })) ||
           (await cache.match('./index.html')) ||
           Response.error();
  }
}

// باقي الملفات (الداتا الكبيرة والأيقونات): الكاش أولاً
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // الخطوط والمصادر الخارجية تعدّي عادي
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  event.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
});
