// time + weather: the clock drives the day, storms with lightning (one strikes the player's car), a sun shower with a rainbow, fog, wet roads
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
  const shots = process.argv[4] || '';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  // a controllable clock: window.__clockOff shifts Date.now
  await page.addInitScript(() => { const n = Date.now.bind(Date); window.__clockOff = 0; Date.now = () => n() + window.__clockOff; });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  console.log('defaults:', await page.evaluate(() => JSON.stringify({ time: window.__havoc.settings.time, weather: window.__havoc.settings.weather })));
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', police: 'off', time: 'cycle', weather: 'clear' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  const setU = u => page.evaluate(u => { const L = 1200, now = Date.now() - window.__clockOff, cur = (now / 1000 / L + 0.38) % 1; let d = u - cur; if (d < 0) d += 1; window.__clockOff = d * L * 1000; }, u);
  const st = () => page.evaluate(() => { const E = window.__havoc.ENV; return JSON.stringify({ u: +E.u.toFixed(3), key: E.key, wx: E.wx, w: Object.fromEntries(Object.entries(E.w).map(([k, v]) => [k, +v.toFixed(2)])), wet: +E.wet.toFixed(2), rb: +E.rb.toFixed(2), clock: document.getElementById('clock').textContent, sunY: +E.T.sunDir[1].toFixed(2) }); });
  for (const [u, name] of [[0.5, 'noon'], [0.2, 'dawn'], [0.8, 'dusk'], [0.02, 'midnight']]) {
    await setU(u); await page.waitForTimeout(1200);
    console.log(name.padEnd(9), await st());
    await page.screenshot({ path: `${SP}/test/tod-${name}.png` });
  }
  // a storm in the afternoon, then lightning on the player's own car
  await setU(0.62);
  const snap = k => page.evaluate(k => { const H = window.__havoc; H.settings.weather = k; H.ENV.w = Object.assign({}, H.WX[k]); }, k);
  await snap('storm'); await page.waitForTimeout(6000);
  console.log('storm    ', await st(), 'bolts so far', await page.evaluate(() => window.__havoc.ENV.bolts.length));
  await page.screenshot({ path: `${SP}/test/wx-storm.png` });
  const hit = await page.evaluate(() => { const H = window.__havoc, v = H.G.player, hp0 = v.health; H.lightningStrike(v.x + 6, v.y + 1.6, v.z + 30, null); H.lightningStrike(v.x, v.y + 1.6, v.z, v); return { hp0: Math.round(hp0), hp: Math.round(v.health), zap: +v.zapT.toFixed(1) }; });
  await page.screenshot({ path: `${SP}/test/wx-bolt.png` }); await page.screenshot({ path: `${SP}/test/wx-bolt2.png` });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1200);
  const zapped = await page.evaluate(() => { const v = window.__havoc.G.player; return { kmh: Math.round(Math.abs(v.vf) * 3.6), zap: +(v.zapT || 0).toFixed(1) }; });
  await page.waitForTimeout(3000);
  const after = await page.evaluate(() => { const v = window.__havoc.G.player; return { kmh: Math.round(Math.abs(v.vf) * 3.6), zap: +(v.zapT || 0).toFixed(1) }; });
  await page.keyboard.up('KeyW');
  console.log('lightning on the car:', JSON.stringify(hit), '| holding W while zapped', JSON.stringify(zapped), '| 3 s later', JSON.stringify(after), '| feed', await page.evaluate(() => [...document.querySelectorAll('#feed .msg')].map(e => e.textContent).filter(t => /lightning/i.test(t)).join(' | ')));
  // sun shower: rain with the sun out, and a rainbow opposite the sun
  await setU(0.7);
  await snap('shower'); await page.evaluate(() => { window.__havoc.ENV.wet = 0.6; }); await page.waitForTimeout(5000);
  // look away from the sun
  await page.evaluate(() => { const H = window.__havoc, s = H.ENV.T.sunDir, v = H.G.player; v.h = Math.atan2(-s[0], -s[2]); v.vx = v.vz = 0; H.CAM.h = v.h; });
  await page.waitForTimeout(1500);
  console.log('shower   ', await st(), 'sky', await page.evaluate(() => JSON.stringify(window.__havoc.ENV.T.sky) + ' sunVis ' + window.__havoc.ENV.T.sunVis.toFixed(2)));
  await page.screenshot({ path: `${SP}/test/wx-rainbow.png` });
  await snap('fog'); await page.waitForTimeout(2500);
  console.log('fog      ', await st(), 'fog far', await page.evaluate(() => Math.round(window.__havoc.scene.fog.far)));
  await page.screenshot({ path: `${SP}/test/wx-fog.png` });
  // the weather picker on its own: a spread over a day of slots
  console.log('changing weather, 40 spells:', await page.evaluate(() => { const H = window.__havoc, c = {}; for (let i = 0; i < 40; i++) { const k = H.wxPick(100000 + i); c[k] = (c[k] || 0) + 1; } return JSON.stringify(c); }));
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
