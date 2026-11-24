const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  page.on('console', m => console.log('console', m.type(), m.text().slice(0, 300)));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'perth', quality: 'low', trafficDensity: 0, pedDensity: 20, police: 'off', time: 'day' }); });
  await page.click(`.mapcard[data-map="perth"]`); await page.click('#playBtn'); await page.waitForTimeout(3000);
  await page.evaluate(() => { const H = window.__havoc, S = H.getW().stadium; if (!H.G.onFoot) H.toggleVehicle(); const p = H.HERO.p; p.x = S.cx + 12; p.z = S.cz + 6; p.y = 0.15; });
  for (let k = 0; k < 6; k++) { await page.waitForTimeout(700); console.log(await page.evaluate(() => { const H = window.__havoc, st = H.STAD.st, F = H.PF(); return JSON.stringify({ onFoot: H.G.onFoot, F: [Math.round(F.x), Math.round(F.z)], hero: [Math.round(H.HERO.p.x), Math.round(H.HERO.p.z)], peds: H.STAD.peds.length, st: !!st, mode: H.G.down }); })); }
  await browser.close();
})();
