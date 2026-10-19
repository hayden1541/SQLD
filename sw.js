// SQLD 합격노트 서비스워커: 온라인이면 새 파일, 오프라인이면 저장해 둔 파일
const V = 'sqld-note-bc9c977fe5';
const FILES = ["./", "app.js", "data/bank.js", "data/bank_kc.js", "data/concepts.js", "data/flash.js", "data/kc/1-16.jpg", "data/kc/1-27.jpg", "data/kc/1-28.jpg", "data/kc/1-38.jpg", "data/kc/1-39.jpg", "data/kc/1-7.jpg", "data/kc/2-25.jpg", "data/kc/2-38.jpg", "data/kc/2-39.jpg", "data/kc/2-41.jpg", "data/kc/2-49.jpg", "data/kc/2-55.jpg", "data/kc/2-59.jpg", "data/kc/2-70.jpg", "data/kc/2-71.jpg", "data/kc/2-74.jpg", "data/kc/2-78.jpg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "index.html", "manifest.webmanifest"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sqld-note-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    try {
      const net = await Promise.race([fetch(r, { cache: 'no-cache' }), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 5000))]);
      if (net && net.ok) c.put(r, net.clone());
      return net;
    } catch (err) {
      return (await c.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? await c.match('./') : Response.error());
    }
  })());
});
