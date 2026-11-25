// optimisation checks: auto resolution steps down / back up / ignores a 30 fps cap, FPS readout, HUD still updates, people and kids draw counts
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 520 }, deviceScaleFactor: 2 }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', quality: 'medium', fps: 'on' }));
  await page.click('.mapcard[data-map="neon"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(4000);
  const pr = () => page.evaluate(() => +window.__havoc.renderer.getPixelRatio().toFixed(3));
  console.log('start pixel ratio', await pr(), '(medium on a 2x screen = 1.5)');
  // pretend the frame rate is poor (50 ms frames), then good (12 ms), then a steady browser cap at 30
  const feed = (dt, secs) => page.evaluate(([dt, secs]) => { const H = window.__havoc; H.DYN.warm = 0; for (let t = 0; t < secs; t += dt) H.dynRes(dt); return +H.DYN.scale.toFixed(3); }, [dt, secs]);
  console.log('after 6 s at 20 fps: scale', await feed(0.05, 6.1), 'pixel ratio', await pr());
  console.log('after 12 s at 20 fps: scale', await feed(0.05, 12.1), 'pixel ratio', await pr(), '(floor 0.6)');
  console.log('after 30 s at 80 fps: scale', await feed(0.0125, 30.1), 'pixel ratio', await pr());
  const reset = () => page.evaluate(() => Object.assign(window.__havoc.DYN, { scale: 1, sum: 0, sq: 0, n: 0, t: 0, probe: null, noGain: false }));
  await reset();
  console.log('browser capped at 30 fps: 2 s', await feed(1 / 30, 2.05), '-> probe; 2 s more, no better ->', await feed(1 / 30, 2.05), '; 10 s more', await feed(1 / 30, 10.1), '(should end at 1)');
  await reset();
  console.log('graphics card stuck at 30 fps: 2 s', await feed(1 / 30, 2.05), '-> probe; then 60 fps ->', await feed(1 / 60, 2.05), '(should keep the lower res)');
  await reset();
  await page.waitForTimeout(1200);
  console.log('fps readout:', await page.evaluate(() => { const f = document.getElementById('fps'); return f.hidden ? 'hidden' : f.textContent; }));
  // HUD still updates while driving
  const hud = () => page.evaluate(() => ({ spd: document.getElementById('spd').textContent, hp: document.getElementById('hpFill').style.width, spdrow: document.getElementById('spdrow').hidden, label: document.getElementById('hpLabel').textContent }));
  console.log('parked', JSON.stringify(await hud()));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); console.log('driving', JSON.stringify(await hud())); await page.keyboard.up('KeyW');
  await page.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); }); await page.waitForTimeout(1500);
  console.log('on foot', JSON.stringify(await hud()));
  // people: only slots in use are drawn; kids aren't drawn away from school
  console.log(await page.evaluate(() => { const H = window.__havoc; let top = -1; for (const p of H.PED.list) if (p.active && p.slot > top) top = p.slot; return 'peds active ' + H.PED.list.filter(p => p.active).length + ', highest slot ' + top + ', head instances drawn ' + H.PED.mesh.head.count + ' of ' + H.PED.mesh.head.count0 + ', leg instances ' + H.PED.mesh.ll.count + ' | kids drawn: ' + Object.values(H.KIDS.mesh).some(m => m.visible) + ' (kids out: ' + !!H.KIDS.shown + ')'; }));
  await page.screenshot({ path: SP + '/test/opt-onfoot.png' });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
