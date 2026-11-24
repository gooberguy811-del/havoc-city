// big map: clicking points shows what they are
const { chromium } = require('playwright');
const SP = process.argv[2], MAPS = (process.argv[3] || 'neon').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  for (const MAP of MAPS) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(MAP + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error') errs.push(MAP + ' ' + m.text()); });
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
    await page.evaluate(m => Object.assign(window.__havoc.settings, { map: m, quality: 'low' }), MAP);
    await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
    await page.evaluate(() => window.__havoc.openBigMap()); await page.waitForTimeout(400);
    const kinds = await page.evaluate(() => { const c = {}; for (const q of window.__havoc.BM.pois) c[q.t] = (c[q.t] || 0) + 1; return c; });
    console.log(MAP, 'clickable points', JSON.stringify(kinds));
    const want = ['mission', 'shop', 'plane', 'school', 'you', 'airport', 'stadium', 'helipads', 'tanks', 'construct', 'cop'];
    for (const t of want) {
      const pt = await page.evaluate(t => { const B = window.__havoc.BM, q = B.pois.find(q => q.t === t && (t !== 'shop' || q.st.kind !== 'gas')) || B.pois.find(q => q.t === t); if (!q) return null; const r = B.cv.getBoundingClientRect(); return { x: r.left + q.sx / B.dpr, y: r.top + q.sy / B.dpr }; }, t);
      if (!pt) continue;
      await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(150);
      const info = await page.evaluate(() => ({ vis: !document.getElementById('bmInfo').hidden, k: document.getElementById('bmInfoK').textContent, t: document.getElementById('bmInfoT').textContent, p: document.getElementById('bmInfoP').textContent.slice(0, 70), m: document.getElementById('bmInfoM').textContent }));
      console.log('  ', t.padEnd(9), info.vis ? `${info.k} | ${info.t} | ${info.p} | ${info.m}` : 'NOT SHOWN');
      if (t === 'mission') await page.screenshot({ path: `${SP}/test/bm-${MAP}-mission.png` });
    }
    // click empty space closes, drag doesn't open
    await page.mouse.click(30, 300); await page.waitForTimeout(100);
    console.log('   empty click hides card:', await page.evaluate(() => document.getElementById('bmInfo').hidden));
    await ctx.close();
  }
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
