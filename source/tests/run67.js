// z-fighting from the air: same view, old near plane vs altitude-scaled near plane; then real flight
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'base';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 10, pedDensity: 10, police: 'off', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4500);
  const ev = (fn, a) => page.evaluate(fn, a);
  for (const near of [0.1, 2.6]) {
    await ev(n => { const H = window.__havoc; H.CAM.free = [[-150, 260, -150], [250, 0, -390]]; H.camera.near = n; H.camera.updateProjectionMatrix(); }, near);
    await page.waitForTimeout(1200); await page.screenshot({ path: `${SP}/test/zf-${MAP}-near${near}.png` });
  }
  // real flight: the camera's near plane follows altitude
  await ev(() => { const H = window.__havoc; H.CAM.free = null; if (!H.G.onFoot) H.toggleVehicle(); const pl = H.PLANES.list.find(q => q.type === 'stinger' && !q.wreck); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = 250; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * 60, 0, Math.cos(pl.yaw) * 60); pl.T = 0.7; });
  await page.waitForTimeout(2500);
  console.log('flying near', await ev(() => window.__havoc.camera.near.toFixed(2)));
  await ev(() => { const H = window.__havoc; H.leavePlane(); });
  await page.waitForTimeout(1500);
  console.log('skydiving near', await ev(() => window.__havoc.camera.near.toFixed(2)));
  await ev(() => { const H = window.__havoc, p = H.HERO.p; H.HERO.chute = null; p.rag = null; p.y = H.heightAt(p.x, p.z); H.HERO.vy = 0; });
  await page.waitForTimeout(2500);
  console.log('on the ground near', await ev(() => window.__havoc.camera.near.toFixed(2)));
  console.log('errors', errs.length);
  await browser.close();
})();
