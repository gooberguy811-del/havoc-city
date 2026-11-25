// Testing Zone: loads cleanly, and a look at each feature
const { chromium } = require('playwright');
const SP = process.argv[2], ONLY = process.argv[3];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | '))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/cdn.jsdelivr.net/npm/three@0.128.0/examples/js/**', r => { const f = r.request().url().split('/examples/js/')[1]; r.fulfill({ path: SP + '/vendor/package/examples/js/' + f, contentType: 'application/javascript' }); });
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SP}/test/tz-menu.png` });
  await page.evaluate(q => Object.assign(window.__havoc.settings, { map: 'test', quality: q, time: 'day' }), process.env.Q || 'medium');
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(5000);
  console.log('loaded', await page.evaluate(() => { const H = window.__havoc, W = H.getW(); return JSON.stringify({ name: W.name, shapes: W.shapes.length, loops: W.loopTracks.length, hoops: W.hoops.length, boosts: W.boosts.length, cars: H.VEH.list.length, peds: H.PED.list.filter(p => p.active).length, player: H.PF() && [Math.round(H.PF().x), Math.round(H.PF().z)], showroom: H.VEH.list.filter(v => v.showroom).length, givers: H.MIS.givers.map(g => g.d.id) }); }));
  console.log('heights', await page.evaluate(() => { const h = window.__havoc.heightAt; return JSON.stringify({ megaTop: +h(-455, 430).toFixed(1), dropMid: +h(-402, 430).toFixed(1), kickerLip: +h(-276.5, 430).toFixed(2), landing: +h(-185, 430).toFixed(1), bump12: +h(100 + 12 * 30 + 1.8, 54).toFixed(2), bowlRim: +h(520 + 77, 200).toFixed(1), bowlMid: +h(520 + 56, 200).toFixed(1), qpipeTop: +h(-487.5, 200).toFixed(1), mogul: +h(150, 200).toFixed(2), water: +h(-230, 430).toFixed(1), podium: +h(-32, -4).toFixed(2) }); }));
  const views = [['overview', [0, 900, 650], [0, 0, -30]], ['loops', [-470, 30, -330], [-405, 8, -195]], ['mega', [-560, 70, 330], [-300, 10, 430]], ['ramps', [-330, 60, -150], [-480, 0, 60]], ['east', [300, 110, -330], [380, 0, 120]], ['hub', [-5, 10, -30], [-40, 2, 0]], ['bowl', [380, 40, 200], [540, 6, 200]]];
  for (const [n, p, l] of views) { if (ONLY && n !== ONLY) continue; await page.evaluate(([p, l]) => { window.__havoc.CAM.free = [p, l]; }, [p, l]); await page.waitForTimeout(1800); await page.screenshot({ path: `${SP}/test/tz-${n}.png` }); }
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
