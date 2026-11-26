// Havoc City offline cache. Always tries the network first so a new version shows up straight away;
// falls back to the saved copy when there's no connection.
const CACHE = 'havoc-20261126112746';
const CORE = ["./", "index.html", "manifest.webmanifest", "vendor/three.min.js", "vendor/peerjs.min.js", "vendor/js/shaders/CopyShader.js", "vendor/js/shaders/LuminosityHighPassShader.js", "vendor/js/postprocessing/EffectComposer.js", "vendor/js/postprocessing/ShaderPass.js", "vendor/js/postprocessing/RenderPass.js", "vendor/js/postprocessing/UnrealBloomPass.js", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('havoc-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' })
    .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r.url, copy)); } return res; })
    .catch(() => caches.match(r.url, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
