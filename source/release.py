# Turns source/out/havoc-city.html into everything that gets published, at the top of the repo:
#   Havoc-City.html    the single-file game to download and double-click (loads three.js etc. from the web)
#   index.html         the website (GitHub Pages): libraries from vendor/, installable, plays offline
#   sw.js, manifest.webmanifest, version.json
# usage: python3 source/release.py <version number>
import sys, os, json, time, hashlib
SRC = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(SRC)
ver = int(sys.argv[1])
body = open(f'{SRC}/out/havoc-city.html').read()
assert '__havoc' not in body, 'debug build passed to release'
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>Havoc City</title>\n</head>\n<body>\n'
        + body + '\n</body>\n</html>\n')
open(f'{ROOT}/Havoc-City.html', 'w').write(page)
# website: the same page with the libraries served from vendor/, plus the web-app bits
s = page
for a, b in [('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'vendor/three.min.js'),
             ('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/', 'vendor/js/'),
             ('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', 'vendor/peerjs.min.js')]:
    assert s.count(a) == 1, a; s = s.replace(a, b)
head = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#0b0d11">\n'
        '<link rel="icon" type="image/png" href="icons/favicon-32.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Havoc City">\n')
s = s.replace('<title>Havoc City</title>', '<title>Havoc City</title>\n' + head, 1)   # the real <head>; the game's own <title> sits further down
sw = ("<script>\n// installable + offline when served from the website (not from a file or inside claude.ai)\n"
      "if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });\n</script>\n")
i = s.rindex('</body>'); s = s[:i] + sw + s[i:]
open(f'{ROOT}/index.html', 'w').write(s)
build = time.strftime('%Y%m%d%H%M%S')
files = ['index.html', 'manifest.webmanifest', 'vendor/three.min.js', 'vendor/peerjs.min.js'] + ['vendor/js/' + f for f in ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js', 'postprocessing/ShaderPass.js', 'postprocessing/RenderPass.js', 'postprocessing/UnrealBloomPass.js']] + ['icons/icon-192.png', 'icons/icon-512.png']
json.dump({'name': 'Havoc City', 'short_name': 'Havoc City', 'description': 'An open-world driving game: cars, planes, tanks, missions and online play with friends.',
           'start_url': './', 'scope': './', 'display': 'fullscreen', 'orientation': 'landscape', 'background_color': '#0b0d11', 'theme_color': '#0b0d11',
           'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                     {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}, open(f'{ROOT}/manifest.webmanifest', 'w'), indent=1)
open(f'{ROOT}/sw.js', 'w').write(f"""// Havoc City offline cache. Always tries the network first so a new version shows up straight away;
// falls back to the saved copy when there's no connection.
const CACHE = 'havoc-{build}';
const CORE = {json.dumps(['./'] + files)};
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('havoc-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r.url, {{ cache: 'no-cache', credentials: 'same-origin' }})
    .then(res => {{ if (res.ok) {{ const copy = res.clone(); caches.open(CACHE).then(c => c.put(r.url, copy)); }} return res; }})
    .catch(() => caches.match(r.url, {{ ignoreSearch: true }}).then(m => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
}});
""")
digest = hashlib.sha256(s.encode()).hexdigest()[:12]
json.dump({'version': ver, 'build': build, 'index': digest}, open(f'{ROOT}/version.json', 'w'))
print(f'release v{ver}: Havoc-City.html {len(page)} bytes, index.html {len(s)} bytes, build {build}')
