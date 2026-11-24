const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'perth';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => Object.assign(window.__havoc.settings, { map: m, quality: 'low' }), MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.__havoc.openBigMap()); await page.waitForTimeout(400);
  console.log(await page.evaluate(() => { const B = window.__havoc.BM; return JSON.stringify({ dpr: B.dpr, rect: B.cv.getBoundingClientRect(), cvw: B.cv.width, pois: B.pois.filter(q => ['shop', 'mission', 'school', 'plane'].includes(q.t)).map(q => [q.t, Math.round(q.sx), Math.round(q.sy), Math.round(q.r), q.st ? q.st.kind : q.d ? q.d.id : '']) }); }));
  await browser.close();
})();
