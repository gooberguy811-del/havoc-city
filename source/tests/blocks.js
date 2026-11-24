const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  for (const MAP of ['neon', 'sand', 'perth']) {
    const r = await page.evaluate(m => { const H = window.__havoc; const W = H.buildWorldData ? null : null; return null; }, MAP);
    await page.evaluate(m => { window.__havoc.settings.map = m; }, MAP);
    await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
    const out = await page.evaluate(() => { const W = window.__havoc.getW(); return W.blocks.map(b => `${b.type} ${Math.round(b.x0)},${Math.round(b.z0)} -> ${Math.round(b.x1)},${Math.round(b.z1)} h${b.h}`).join('\n') + '\nspawn ' + JSON.stringify(W.spawn || null) + ' bounds ' + JSON.stringify(W.bounds); });
    console.log('=== ' + MAP + '\n' + out);
    await page.evaluate(() => window.__havoc.toMenu && window.__havoc.toMenu());
    await page.reload(); await page.waitForTimeout(800);
  }
  await browser.close();
})();
