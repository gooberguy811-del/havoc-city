const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { trafficDensity: 0, pedDensity: 10, map: 'neon' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  await page.evaluate(() => { const H = window.__havoc; const P = H.G.player; P.place(0, 30, 0, 0); });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(500);
  await page.evaluate(() => { const H = window.__havoc, F = H.PF(); H.addHeat(2.4, 2, true); window.__c = H.spawnPedAt(F.x + 9, F.z + 6, 'cop'); });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(400);
    console.log(await page.evaluate(() => { const H = window.__havoc, F = H.PF(), c = window.__c, hp = H.HERO.p; return JSON.stringify({ F: [F.x.toFixed(1), F.z.toFixed(1)], hero: [hp.x.toFixed(1), hp.z.toFixed(1), hp.active, !!hp.rag], cop: [c.x.toFixed(1), c.z.toFixed(1), c.state, c.cop, +c.sp.toFixed(2), !!c.rag, c.active], stars: H.wanted.stars, foot: H.G.onFoot }); }));
  }
  await browser.close();
})();
