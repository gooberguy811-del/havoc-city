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
      const r = await page.evaluate(async () => {
        const H = window.__havoc, v = H.G.player; v.place(80, 452, 0, 0);   // on the South Perth road, facing south
        const out = []; for (let k = 0; k < 120; k++) { v.input.throttle = 1; v.input.brake = 0; v.input.steer = 0; await new Promise(r => requestAnimationFrame(r)); if (k % 20 === 0) out.push(Math.round(v.z)); }
        const walls = H.getW().boxes.filter(b => b.kind === 'wall').map(b => [Math.round(b.z0), Math.round(b.z1)]);
        return { zs: out, final: Math.round(v.z), speed: Math.round(v.speed), walls };
      });
      // keep driving until we're well past where the old wall was
      for (let k = 0; k < 20; k++) { const z = await page.evaluate(() => { const v = window.__havoc.G.player; v.input.throttle = 1; return v.z; }); if (z > 560) break; await page.waitForTimeout(500); }
      const end = await page.evaluate(() => { const v = window.__havoc.G.player; return { z: Math.round(v.z), speed: Math.round(v.speed) }; });
      extra = ' drive ' + JSON.stringify(r.zs) + ' -> ' + JSON.stringify(end) + ' walls ' + JSON.stringify(r.walls);
      await page.screenshot({ path: `${SP}/test/sp-south.png` });
    }
    console.log(MAP, 'errors', errs.length, errs.slice(0, 3).join(' || '), extra);
    await page.close();
  }
  await browser.close();
})();
