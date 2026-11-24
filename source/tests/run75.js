// Roblox-style camera: camera-relative movement, orbit, zoom to first person, Ctrl shift-lock
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', quality: 'low', trafficDensity: 0, pedDensity: 0, police: 'off' }));
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(3000);
  await page.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); }); await page.waitForTimeout(1200);
  const st = () => page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, C = H.CAM, c = H.camera.position; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), h: +p.h.toFixed(2), camH: +C.h.toFixed(2), zd: +C.zd.toFixed(2), zc: +C.zc.toFixed(2), sl: C.sl, fp: C.fpFoot, rbx: H.rbxFoot(), camDist: +Math.hypot(c.x - p.x, c.z - p.z).toFixed(2), camY: +(c.y - p.y).toFixed(2) }; });
  console.log('start', JSON.stringify(await st()));
  // set the camera to look along +x (yaw = pi/2) and walk: W should move +x, D should move "right" = -z
  const walk = async (key, ms) => { const a = await st(); await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(500); const b = await st(); return { dx: +(b.x - a.x).toFixed(2), dz: +(b.z - a.z).toFixed(2), faceH: b.h, camH: b.camH }; };
  await page.evaluate(() => { window.__havoc.CAM.h = Math.PI / 2; }); await page.waitForTimeout(200);
  console.log('W  (expect +x)', JSON.stringify(await walk('KeyW', 1500)));
  console.log('D  (expect -z, faces right)', JSON.stringify(await walk('KeyD', 1500)));
  console.log('S  (expect -x, faces camera)', JSON.stringify(await walk('KeyS', 1500)));
  console.log('camera yaw unchanged by walking:', (await st()).camH);
  await page.screenshot({ path: SP + '/test/rbx-third.png' });
  // right-drag orbits
  await page.mouse.move(500, 300); await page.mouse.down({ button: 'right' }); await page.mouse.move(640, 340, { steps: 8 }); await page.mouse.up({ button: 'right' });
  console.log('after right-drag', JSON.stringify(await st()));
  // wheel zoom out then all the way in
  await page.mouse.move(500, 300);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(40); }
  await page.waitForTimeout(600); console.log('zoomed out', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/rbx-far.png' });
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(30); }
  await page.waitForTimeout(800); console.log('zoomed in (first person)', JSON.stringify(await st()));
  await page.keyboard.press('KeyO'); await page.waitForTimeout(500); await page.keyboard.press('KeyO'); await page.waitForTimeout(600);
  console.log('O twice -> third person', JSON.stringify(await st()));
  // shift-lock: Ctrl toggles, the character faces the camera, A strafes without turning
  await page.keyboard.press('ControlLeft'); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__havoc.CAM.h = 0; }); await page.waitForTimeout(300);
  console.log('shift-lock', JSON.stringify(await st()), 'xhair', await page.evaluate(() => !document.getElementById('xhair').hidden), 'cursor class', await page.evaluate(() => document.querySelector('#stage canvas').className));
  console.log('A in shift-lock (expect +x strafe, face stays 0)', JSON.stringify(await walk('KeyA', 1500)));
  await page.mouse.move(700, 300); await page.waitForTimeout(100); await page.mouse.move(760, 300, { steps: 5 }); await page.waitForTimeout(200);
  console.log('mouse move turns camera + character', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/rbx-shiftlock.png' });
  await page.keyboard.press('ControlLeft'); await page.waitForTimeout(300);
  console.log('shift-lock off', JSON.stringify(await st()));
  // driving still uses the chase camera, wheel zooms it
  await page.evaluate(() => window.__havoc.toggleVehicle()); await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 240); await page.waitForTimeout(500);
  console.log('in car', await page.evaluate(() => { const H = window.__havoc; return JSON.stringify({ onFoot: H.G.onFoot, rbx: H.rbxFoot(), carZoom: H.CAM.carZoom.toFixed(2) }); }));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
