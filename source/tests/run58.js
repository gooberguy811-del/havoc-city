// Perth edges: suburbs, bush, fence; plane turn rate
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'perth', TAG = process.argv[4] || 'pe';
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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', trafficDensity: 30, pedDensity: 20, police: 'off', time: 'day' }); }, MAP);
  const t0 = Date.now();
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(5000);
  const ev = (fn, a) => page.evaluate(fn, a);
  console.log('world', await ev(() => { const W = window.__havoc.getW(); return JSON.stringify({ bounds: W.bounds, blocks: W.blocks.length, bldgs: W.bldgs.length, trees: W.trees.length, walls: W.boxes.filter(b => b.kind === 'wall').length }); }));
  // drive north out of the suburbs: no wall until the fence
  const north = await ev(() => { const H = window.__havoc, W = H.getW(), wall = W.boxes.filter(b => b.kind === 'wall').sort((a, b) => a.z0 - b.z0)[0]; return { fenceZ: wall.z1, distFromSuburbs: Math.round(-476 - wall.z1) }; });
  console.log('north fence', JSON.stringify(north));
  await ev(() => { const H = window.__havoc, W = H.getW(), v = H.G.player; v.place(-300, -500, Math.PI, 0); });
  await page.waitForTimeout(800); await page.screenshot({ path: `${SP}/test/${TAG}-1-bush.png` });
  await ev(() => { const H = window.__havoc, W = H.getW(), wall = W.boxes.filter(b => b.kind === 'wall').sort((a, b) => a.z0 - b.z0)[0], v = H.G.player; v.place(-300, wall.z1 + 14, Math.PI, 0); });
  await page.waitForTimeout(1200); await page.screenshot({ path: `${SP}/test/${TAG}-2-fence.png` });
  await ev(() => { const H = window.__havoc, F = H.G.player; H.CAM.free = [[-300, 140, -330], [-300, 0, -520]]; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/${TAG}-3-aerial.png` });
  await ev(() => { window.__havoc.CAM.free = null; });
  // plane turn rate: fly level, hold A for a moment
  for (const type of ['sparrow', 'stinger']) {
    const r = await ev(async (type) => { const H = window.__havoc; if (H.G.plane) H.leavePlane(); if (!H.G.onFoot) H.toggleVehicle(); const pl = H.PLANES.list.find(q => q.type === type && !q.wreck); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = H.heightAt(pl.x, pl.z) + 200; pl.ground = false; pl.pitch = 0; pl.roll = 0; const sp = type === 'sparrow' ? 45 : 90; pl.V.set(Math.sin(pl.yaw) * sp, 0, Math.cos(pl.yaw) * sp); pl.T = 0.8; return { y0: pl.yaw }; }, type);
    await page.keyboard.down('KeyA'); const g0 = await ev(() => window.__havoc.G && performance.now()); const y0 = await ev(() => window.__havoc.G.plane.yaw);
    await page.waitForTimeout(3000); const y1 = await ev(() => window.__havoc.G.plane.yaw); await page.keyboard.up('KeyA');
    console.log('turn', type, 'yaw change', (y1 - y0).toFixed(2));
  }
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
