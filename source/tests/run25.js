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
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2000);
  await page.evaluate(() => { const H = window.__havoc, s = H.SHOP.list[0], P = H.G.player; P.place(s.dx - Math.sin(s.fh) * 6, s.dz - Math.cos(s.fh) * 6, s.fh, 0); });
  await page.waitForTimeout(1200); await page.keyboard.press('KeyF'); await page.waitForTimeout(1200);
  await page.evaluate(() => { const H = window.__havoc, s = H.SHOP.list[0], p = H.HERO.p; p.x = s.dx; p.z = s.dz; p.h = s.fh; });
  await page.keyboard.down('KeyW');
  for (let k = 0; k < 10; k++) { await page.waitForTimeout(300); console.log(await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p; return JSON.stringify({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), h: +p.h.toFixed(2), sp: +p.sp.toFixed(2), fwd: H.HERO.in.fwd, turn: H.HERO.in.turn, rag: !!p.rag, enter: !!H.HERO.enter, GT: +H.G.T || 0 }); })); }
  await page.keyboard.up('KeyW');
  await browser.close();
})();
