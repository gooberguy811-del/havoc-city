// smoke: every map loads cleanly; Perth: drive south out of South Perth past the old wall
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const MAP of ['perth', 'neon', 'sand', 'nyc', 'base']) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
    await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', trafficDensity: 20, pedDensity: 20, police: 'off', time: 'day' }); }, MAP);
    await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
    let extra = '';
    if (MAP === 'perth') {
      await page.evaluate(() => { const H = window.__havoc, v = H.G.player; v.place(80, 452, 0, 0); });
      await page.keyboard.down('KeyW'); const zs = [];
      for (let k = 0; k < 60; k++) { const z = await page.evaluate(() => Math.round(window.__havoc.G.player.z)); zs.push(z); if (z > 600) break; await page.waitForTimeout(400); }
      await page.keyboard.up('KeyW');
      const end = await page.evaluate(() => { const v = window.__havoc.G.player; return { x: Math.round(v.x), z: Math.round(v.z), speed: Math.round(v.speed) }; });
      const r = { zs: zs.filter((_, i) => i % 5 === 0), walls: [] };
      extra = ' drive ' + JSON.stringify(r.zs) + ' -> ' + JSON.stringify(end) + ' walls ' + JSON.stringify(r.walls);
      await page.screenshot({ path: `${SP}/test/sp-south.png` });
    }
    console.log(MAP, 'errors', errs.length, errs.slice(0, 3).join(' || '), extra);
    await page.close();
  }
  await browser.close();
})();
