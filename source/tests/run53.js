// stores: placement, buy menu, jewel smash, bank robbery, mechanic, disguise, rubble hitbox
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'low', trafficDensity: 0, pedDensity: 0, police: 'off', slowmo: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(3500);
  await page.evaluate(() => { const H = window.__havoc, o = H.G.player; o.vx = o.vz = 0; const v = new H.Vehicle(Object.assign({}, o.cfg, { body: 'mudslinger' }), 'parked'); v.place(o.x + 6, o.z, o.h, 0); H.VEH.list.push(v); H.toggleVehicle(); H.enterVehicle(v); });
  await page.waitForTimeout(800);
  console.log(await page.evaluate(() => new Promise(res => {
    const H = window.__havoc, v = H.G.player, K = H.KEYS, log = []; v.y = H.heightAt(v.x, v.z) + 26; v.vy = 5; v.onGround = false; v.flipAcc = 0; v.pitV = 0; v.pit = 0;
    K.KeyS = true; let n = 0;
    const tick = () => { n++; if (n % 4 === 0) log.push([+(v.y - H.heightAt(v.x, v.z)).toFixed(1), +v.pitV.toFixed(2), +v.pit.toFixed(2), v.input.brake, v.input.throttle, v.kind, v.tumble ? 'T' : '', v.onGround ? 'G' : ''].join(',')); if (v.onGround || n > 400 || H.G.onFoot || v.tumble) { K.KeyS = false; log.push('end ' + [H.G.onFoot, v.tumble, v.onGround].join(',')); res(log.slice(0, 30).join(' | ')); return; } requestAnimationFrame(tick); };
    tick();
  })));
  await browser.close();
})();
