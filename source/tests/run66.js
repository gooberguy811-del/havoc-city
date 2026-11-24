// less-blocky look check: people, tanks, cacti/rocks, hills, trees
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'base', TAG = process.argv[4] || 'rb';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/net::/.test(m.text())) errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 20, pedDensity: 40, police: 'off', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4500);
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = async (name, from, to) => { await ev(c => { window.__havoc.CAM.free = c; }, [from, to]); await page.waitForTimeout(1400); await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-${name}.png` }); };
  await ev(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
  await page.waitForTimeout(1200);
  const p = await ev(() => { const p = window.__havoc.HERO.p; return [p.x, p.y, p.z, p.h]; });
  const fx = Math.sin(p[3]), fz = Math.cos(p[3]);
  await shot('1-hero', [p[0] + fx * 2.6 + fz * 0.6, p[1] + 1.65, p[2] + fz * 2.6 - fx * 0.6], [p[0], p[1] + 1.2, p[2]]);
  await shot('2-hero-side', [p[0] + fz * 3.2, p[1] + 1.4, p[2] - fx * 3.2], [p[0], p[1] + 1.0, p[2]]);
  if (MAP === 'base') {
    await shot('3-tanks', [175, 6, 70], [215, 1, 50]);
    await shot('4-scrub', [-220, 4, 120], [-200, 2, 200]);
    await shot('5-hills', [600, 40, 300], [900, 10, 500]);
  } else if (MAP === 'perth') {
    await shot('3-park', [-300, 8, -40], [-230, 3, -100]);
    await shot('4-hills', [300, 30, -700], [500, 10, -950]);
  } else {
    await shot('3-desert', [-230, 5, 0], [-290, 2, -60]);
  }
  console.log(MAP, 'errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
