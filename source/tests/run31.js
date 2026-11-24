const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'sand', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="sand"]'); await page.click('#playBtn'); await page.waitForTimeout(2000);
  for (const [label, vy, roll] of [['soft', -2, 0]]) {
    await page.evaluate(([vy, roll]) => { const H = window.__havoc, W = H.getW(), A = W.airport.site; if (!H.G.plane) { H.G.player.vx = H.G.player.vz = 0; H.toggleVehicle(); const pl = H.PLANES.list.find(p => !p.wreck); H.enterPlane(pl); }
      const pl = H.G.plane, u = -200, v = 301; pl.x = A.ox + u * A.ux + v * A.vx; pl.z = A.oz + u * A.uz + v * A.vz; pl.yaw = Math.atan2(A.ux, A.uz); pl.y = 1.2; pl.ground = false; pl.pitch = 0.03; pl.roll = roll; pl.T = 0.1; pl.V.set(Math.sin(pl.yaw) * 27, vy, Math.cos(pl.yaw) * 27); }, [vy, roll]);
    for (let k = 0; k < 8; k++) { await page.waitForTimeout(1000); const g = await page.evaluate(() => { const pl = window.__havoc.G.plane; return [pl.ground, +(pl.y).toFixed(2), +pl.V.length().toFixed(1)]; }); console.log('  ', JSON.stringify(g)); if (g[0]) break; }
    console.log(label, await page.evaluate(() => { const H = window.__havoc, pl = H.G.plane; return JSON.stringify({ gnd: pl && pl.ground, wreck: pl && pl.wreck, hp: pl && Math.round(pl.hp), down: H.G.down > 0, sub: document.querySelector('#bannerSub').textContent }); }));
  }
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await browser.close();
})();
