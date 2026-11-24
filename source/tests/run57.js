// graphics look-book: street level + aerial for one map
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon', TAG = process.argv[4] || 'gx', TIME = process.argv[5] || 'day';
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
  await page.evaluate(([m, t]) => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 40, pedDensity: 40, police: 'off', time: t }); }, [MAP, TIME]);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(5000);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { document.querySelector('#help') && (document.querySelector('#help').hidden = true); });
  await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-1-car.png` });
  await ev(() => { const H = window.__havoc; H.toggleVehicle(); });
  await page.waitForTimeout(2500); await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-2-foot.png` });
  await ev(() => { const H = window.__havoc, F = H.HERO.p; H.CAM.free = [[F.x - 60, 55, F.z - 60], [F.x + 20, 0, F.z + 20]]; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-3-aerial.png` });
  await ev(() => { const H = window.__havoc, F = H.HERO.p; H.CAM.free = [[F.x + 3, 1.7, F.z - 14], [F.x - 10, 6, F.z + 40]]; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-4-street.png` });
  console.log('perf', await ev(() => JSON.stringify(window.__havoc.PERF)));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
