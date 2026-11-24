// stores: placement, buy menu, jewel smash, bank robbery, mechanic, disguise, rubble hitbox
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 30, police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const H = window.__havoc, pl = H.PLANES.list.find(q => q.type === 'stinger' && !q.wreck); H.toggleVehicle(); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = 40; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * 50, -4, Math.cos(pl.yaw) * 50); pl.T = 0.8; window.__ls = H.ARMS.lastShot; });
  await page.waitForTimeout(600); await page.keyboard.down('KeyQ'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${SP}/test/y-${MAP}-jetgun.png` });
  await page.waitForTimeout(400); await page.keyboard.up('KeyQ');
  console.log('jet cannon', await ev(() => JSON.stringify({ before: window.__ls, after: window.__havoc.ARMS.lastShot, plane: window.__havoc.G.plane && window.__havoc.G.plane.type, bloom: !!(window.THREE && THREE.UnrealBloomPass) })));
  await ev(() => { window.__havoc.settings.time = 'night'; });
  await page.waitForTimeout(300);
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
