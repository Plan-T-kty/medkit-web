/* 선교약품 PWA service worker — caches the app shell (and the OCR engine files from the CDN) for offline use. */
const CACHE = 'medkit-20261108175816';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cdn = url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !cdn) return; // Apps Script / Drive requests always go to the network
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, sameOrigin ? { ignoreSearch: true } : undefined); // index.html?team=… hits the cached shell
    const network = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { network.catch(() => {}); return cached; } // stale-while-revalidate
    const res = await network;
    return res || new Response('offline', { status: 503 });
  }));
});
