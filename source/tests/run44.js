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
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 0, pedDensity: 0, police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  await page.evaluate(() => { const H = window.__havoc, o = H.PUG.obj.position, v = H.G.player; H.PUG.obj.rotation.y = -Math.PI / 2 + 0.3; v.place(o.x + 13, o.z + 1, -Math.PI / 2, 0); H.CAM.h = -Math.PI / 2; H.CAM.lp = 0.15; H.CAM.lookT = 1e9; });
  await page.waitForTimeout(2000); await page.screenshot({ path: `${SP}/test/y-pug-close.png` });
  await page.evaluate(() => { const H = window.__havoc; H.settings.time = 'night'; });
  await page.evaluate(() => { const H = window.__havoc, v = H.G.player; v.place(-55, -26, Math.PI / 2, 0); H.CAM.h = Math.PI / 2; H.CAM.lp = 0; });
  await page.click('#pauseBtn').catch(() => {}); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SP}/test/y-night-tsq.png` });
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await browser.close();
})();
