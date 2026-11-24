const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'base', quality: 'low', trafficDensity: 0, pedDensity: 10, police: 'off', time: 'day' }); });
  await page.click(`.mapcard[data-map="base"]`); await page.click('#playBtn'); await page.waitForTimeout(3000);
  for (const type of ['stinger', 'hornet']) {
    await page.evaluate(type => { const H = window.__havoc; if (H.G.plane) H.leavePlane(); if (!H.G.onFoot) H.toggleVehicle(); const pl = H.PLANES.list.find(q => q.type === type && !q.wreck); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = 60; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * (type === 'hornet' ? 10 : 50), 0, Math.cos(pl.yaw) * (type === 'hornet' ? 10 : 50)); window.__s0 = H.ARMS.lastShot; }, type);
    await page.keyboard.down('KeyQ'); await page.waitForTimeout(900); await page.keyboard.up('KeyQ');
    console.log(type, 'cannon fired', await page.evaluate(() => window.__havoc.ARMS.lastShot !== window.__s0 && window.__havoc.gt() - window.__havoc.ARMS.lastShot < 3));
  }
  await browser.close();
})();
