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
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 80, slowmo: 'off', quality: 'low', time: 'day', police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(3000);
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
  // leave your car parked and walk away
  await page.evaluate(() => { const H = window.__havoc, v = H.G.player; v.vx = v.vz = 0; window.__mine = v; H.toggleVehicle(); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, v = window.__mine; p.x = v.x + Math.cos(v.h) * 20; p.z = v.z - Math.sin(v.h) * 20; });
  const going = await waitFor(() => { const H = window.__havoc; if (H.THIEF.t > 0.5) H.THIEF.t = 0.5; return H.THIEF.list.some(T => T.v === window.__mine) || window.__mine.kind === 'traffic'; }, 60000);
  console.log('thief heading for my car', going, await page.evaluate(() => JSON.stringify({ own: window.__mine.own, kind: window.__mine.kind, peds: window.__havoc.PED.list.filter(p => p.active && !p.isHero).length })));
  console.log('my car stolen', await waitFor(() => window.__mine.kind === 'traffic', 60000));
  await page.waitForTimeout(1500);
  console.log('driving off', await page.evaluate(() => JSON.stringify({ speed: +window.__mine.speed.toFixed(1), ai: !!window.__mine.ai })));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
