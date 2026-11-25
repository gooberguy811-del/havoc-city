// HUD on the Testing Zone, wide and narrow: style counter clear of the pause button and mission panel, K brings the controls back
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[1100, 620], [700, 520]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
    await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'test', quality: 'low' }));
    await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
    const box = id => page.evaluate(id => { const e = document.getElementById(id); if (!e || e.hidden || getComputedStyle(e).display === 'none' || getComputedStyle(e).opacity === '0') return null; const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)]; }, id);
    const overlap = (a, b) => !!(a && b && a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3]);
    await page.evaluate(() => { const H = window.__havoc; H.MIS.unlocked = {}; const g = H.MIS.givers[0].d.giver, v = H.G.player; v.place(g[0], g[1] + 3, 0, 0); });
    await page.waitForTimeout(2000);
    const st = await box('styleHud'), ob = await box('obj'), pb = await box('pauseBtn');
    console.log(`${w}x${h}`, 'mission on:', !!ob, '| style', JSON.stringify(st), 'obj', JSON.stringify(ob), 'pause', JSON.stringify(pb), '| overlaps obj:', overlap(st, ob), 'pause:', overlap(st, pb));
    await page.waitForTimeout(14000);
    console.log('   help after 14 s:', JSON.stringify(await box('help')));
    await page.keyboard.press('KeyK'); await page.waitForTimeout(500);
    console.log('   help after K:', JSON.stringify(await box('help')));
    await page.screenshot({ path: `${SP}/test/hud-${w}.png` });
    console.log('   errors', errs.length);
    await ctx.close();
  }
  await browser.close();
})();
