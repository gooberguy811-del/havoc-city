// Testing Zone from the driver's seat: drive to features with the normal chase camera
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/cdn.jsdelivr.net/npm/three@0.128.0/examples/js/**', r => { const f = r.request().url().split('/examples/js/')[1]; r.fulfill({ path: SP + '/vendor/package/examples/js/' + f, contentType: 'application/javascript' }); });
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'test', quality: 'medium', time: 'day' }));
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(4500);
  const place = (x, z, h, sp) => page.evaluate(([x, z, h, sp]) => { const H = window.__havoc, v = H.G.player; v.place(x, z, h, 0); v.vx = Math.sin(h) * sp; v.vz = Math.cos(h) * sp; window.__havoc.CAM.h = h; }, [x, z, h, sp]);
  const shot = async (n, x, z, h, sp, wait) => { await place(x, z, h, sp); await page.waitForTimeout(wait || 1500); await page.screenshot({ path: `${SP}/test/tzd-${n}.png` }); };
  await shot('ramps', -640 + 20, -60, Math.PI / 2, 0, 1800);
  await shot('hub', -10, 10, -Math.PI / 2 - 0.3, 0, 1500);
  await shot('mega', -720, 430, Math.PI / 2, 0, 1500);
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
