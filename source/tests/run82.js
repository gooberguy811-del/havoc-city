// trees after the tile/LOD change: views over the densest woods, near and from the air
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'perth';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/cdn.jsdelivr.net/npm/three@0.128.0/examples/js/**', r => { const f = r.request().url().split('/examples/js/')[1]; r.fulfill({ path: SP + '/vendor/package/examples/js/' + f, contentType: 'application/javascript' }); });
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => Object.assign(window.__havoc.settings, { map: m, quality: 'medium', time: 'day', trafficDensity: 20, pedDensity: 20 }), MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(5000);
  const spot = await page.evaluate(() => { const W = window.__havoc.getW ? window.__havoc.getW() : window.__havoc.W; const t = W.trees.filter(t => t.type === 'oak' || t.type === 'palm' || t.type === 'pine'); let best = null, bn = 0; for (const a of t.filter((_, i) => i % 7 === 0)) { const n = t.filter(b => Math.abs(b.x - a.x) < 60 && Math.abs(b.z - a.z) < 60).length; if (n > bn) { bn = n; best = a; } } return best && { x: best.x, z: best.z, n: bn, tiles: W.inst.treeTiles.length }; });
  console.log('densest woods', JSON.stringify(spot));
  const shot = async (name, pos, look) => { await page.evaluate(([p, l]) => { window.__havoc.CAM.free = [p, l]; }, [pos, look]); await page.waitForTimeout(1500); const st = await page.evaluate(() => { const T = (window.__havoc.getW ? window.__havoc.getW() : window.__havoc.W).inst.treeTiles; return { hi: T.filter(t => t.hi.visible).length, lo: T.filter(t => t.lo.visible).length, off: T.filter(t => !t.hi.visible && !t.lo.visible).length }; }); console.log(name, JSON.stringify(st)); await page.screenshot({ path: `${SP}/test/trees-${MAP}-${name}.png` }); };
  const { x, z } = spot;
  await shot('ground', [x - 70, 6, z - 70], [x + 80, 4, z + 80]);
  await shot('air', [x - 260, 140, z - 260], [x + 60, 0, z + 60]);
  console.log('errors', errs.length, errs.slice(0, 3));
  await browser.close();
})();
