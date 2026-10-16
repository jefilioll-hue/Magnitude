/* Service worker de Magnitude : jeu solo et local disponibles hors ligne.
   - le client (HTML, JS, CSS, polices, icônes) est précaché à l'installation ;
   - les fichiers audio sont mis en cache au premier téléchargement ;
   - le temps réel (/ws) et /healthz ne passent jamais par le cache. */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CORE = `magnitude-core-${VERSION}`;
const AUDIO = 'magnitude-audio-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CORE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('magnitude-core-') && k !== CORE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/ws') || url.pathname === '/healthz') return;

  if (url.pathname.startsWith('/audio/')) {
    if (url.pathname.endsWith('manifest.json')) {
      event.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(AUDIO).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
      return;
    }
    event.respondWith(
      caches.open(AUDIO).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
