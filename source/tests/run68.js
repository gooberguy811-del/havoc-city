// drivable tanks at Fort Redrock
const { chromium } = require('playwright');
const SP = process.argv[2], TAG = 'tk';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/net::/.test(m.text())) errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'base', quality: 'high', trafficDensity: 10, pedDensity: 10, police: 'normal', time: 'day' }); });
  await page.click(`.mapcard[data-map="base"]`); await page.click('#playBtn'); await page.waitForTimeout(4500);
  const ev = (fn, a) => page.evaluate(fn, a);
  console.log('tanks parked', await ev(() => window.__havoc.VEH.list.filter(v => v.tank).length));
  console.log('garage hides tank', await ev(() => !Object.entries(window.__havoc.BODIES).filter(([, b]) => !b.hidden).some(([k]) => k === 'tank')));
  const t = await ev(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const v = H.VEH.list.find(q => q.tank); const p = H.HERO.p; p.x = v.x + 3; p.z = v.z; H.enterVehicle(v); window.__tank = v; return { hp: v.health, mass: v.mass, stars: H.wantedObj().stars }; });
  console.log('boarded', JSON.stringify(t));
  await page.waitForTimeout(600); await page.screenshot({ path: `${SP}/test/${TAG}-1-in.png` });
  await ev(() => { window.__g0 = window.__havoc.gt(); window.__h0 = window.__tank.h; });
  await page.keyboard.down('KeyA'); await page.waitForTimeout(4000); await page.keyboard.up('KeyA');
  console.log('pivot turn', await ev(() => { const v = window.__tank, dt = window.__havoc.gt() - window.__g0; return JSON.stringify({ dh: +(v.h - window.__h0).toFixed(2), gameSec: +dt.toFixed(2), rate: +((v.h - window.__h0) / dt).toFixed(2), sp: +v.speed.toFixed(1) }); }));
  await ev(() => { window.__g0 = window.__havoc.gt(); });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(6000); await page.keyboard.up('KeyW');
  console.log('drove', await ev(() => { const v = window.__tank; return JSON.stringify({ sp: +v.speed.toFixed(1), top: v.st.top, gameSec: +(window.__havoc.gt() - window.__g0).toFixed(2) }); }));
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(200); await page.keyboard.up('KeyQ');
  await page.waitForTimeout(150); await page.screenshot({ path: `${SP}/test/${TAG}-2-fire.png` });
  console.log('shell fired', await ev(() => window.__havoc.ARMS.rockets.some(r => r.shell) || window.__tank.recoil > 0));
  // ram a parked car
  const ram = await ev(() => { const H = window.__havoc, v = window.__tank, c = H.VEH.list.find(q => !q.tank && q.kind === 'parked' && !q.mission); c.place(v.x + Math.sin(v.h) * 6.5, v.z + Math.cos(v.h) * 6.5, v.h + Math.PI / 2, 0); window.__car = c; v.vx = Math.sin(v.h) * 9; v.vz = Math.cos(v.h) * 9; return c.health; });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  console.log('ram', ram, '->', await ev(() => Math.round(window.__car.health)), 'tank', await ev(() => Math.round(window.__tank.health)));
  await page.screenshot({ path: `${SP}/test/${TAG}-3-ram.png` });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
