// the Cybertruck: in the garage, then on the road
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', quality: 'medium', police: 'off', time: 'day', weather: 'clear' }); });
  await page.click('#garageBtn'); await page.waitForTimeout(800);
  for (let i = 0; i < 2; i++) { await page.evaluate(() => { const b = [...document.querySelectorAll('#garage button')].find(b => /Cybertruck/.test(b.textContent)); if (b) b.click(); }); await page.waitForTimeout(600); }
  await page.waitForTimeout(800);
  console.log('selected:', await page.evaluate(() => JSON.parse(localStorage.getItem('havoc.car') || '{}').body));
  await page.screenshot({ path: SP + '/test/cyber-garage.png' });
  await page.click('#garageBack'); await page.waitForTimeout(600);
  await page.click('.mapcard[data-map="neon"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  console.log('driving:', await page.evaluate(() => { const v = window.__havoc.G.player; return JSON.stringify({ body: v.cfg.body, L: +v.model.dims.L.toFixed(2), H: +v.model.dims.H.toFixed(2), hp: v.maxHp, mass: v.st.mass }); }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  console.log('after 2.5 s of W:', await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return JSON.stringify({ kmh: Math.round(Math.abs(v.vf) * 3.6), gear: H.G.gear, ev: +H.SFX.L.ev.g.gain.value.toFixed(2) }); }));
  await page.screenshot({ path: SP + '/test/cyber-road.png' });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
