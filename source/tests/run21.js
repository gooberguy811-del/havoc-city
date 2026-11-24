const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(-3, 20, 0, 0); });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(500);
  const t0 = await page.evaluate(() => { const H = window.__havoc, F = H.PF(); H.addHeat(2.6, 2, true); for (let k = 0; k < 3; k++) H.spawnPedAt(F.x + 14 + k * 2, F.z - 6 + k, 'cop'); return performance.now(); });
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(700); console.log(await page.evaluate(() => { const H = window.__havoc, F = H.PF(); const cops = H.PED.list.filter(p => p.active && p.cop); return JSON.stringify({ hp: Math.round(H.HERO.hp), down: H.G.down, stars: H.wanted.stars, cops: cops.map(p => ({ d: +Math.hypot(p.x - F.x, p.z - F.z).toFixed(1), los: p.los, aim: p.aimT > 0, sh: +p.shootT.toFixed(2) })) }); })); }
  // shoot back with the pistol
  await page.keyboard.press('Digit2'); await page.evaluate(() => { window.__havoc.HERO.hp = 100; });
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(5000); await page.keyboard.up('KeyQ');
  console.log('cops down:', await page.evaluate(() => window.__havoc.PED.list.filter(p => p.active && p.cop && p.dead).length), 'stars', await page.evaluate(() => window.__havoc.wanted.stars));
  await browser.close();
})();
