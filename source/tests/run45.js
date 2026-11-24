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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 20, pedDensity: 30, police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  const ev = (fn, a) => page.evaluate(fn, a);
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
  // first person on foot
  await ev(() => { const H = window.__havoc, v = H.G.player; v.vx = v.vz = 0; H.toggleVehicle(); });
  await page.waitForTimeout(1200);
  await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC'); await page.waitForTimeout(800);
  console.log('fp foot', await ev(() => JSON.stringify({ mode: window.__havoc.CAM.mode, fp: window.__havoc.CAM.fpFoot, xhair: !document.querySelector('#xhair').hidden, feed: [...document.querySelectorAll('#feed > *')].slice(-1).map(e => e.textContent)[0] })));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(900); await page.keyboard.up('KeyW');
  await page.screenshot({ path: `${SP}/test/f-${MAP}-fpfoot.png` });
  const ls = await ev(() => window.__havoc.ARMS.lastShot);
  await page.mouse.move(400, 300); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
  console.log('fp shot', (await ev(() => window.__havoc.ARMS.lastShot)) !== ls);
  // medkits
  console.log('medkits', await ev(() => window.__havoc.MED ? window.__havoc.MED.list.length : 'n/a'));
  const mk = await ev(() => { const H = window.__havoc, p = H.HERO.p, m = H.MED.list.find(q => q.t <= 0); H.HERO.hp = 30; p.x = m.x + 0.5; p.z = m.z; return [m.x, m.z]; });
  await page.waitForTimeout(600);
  console.log('picked up kit: hp', await ev(() => Math.round(window.__havoc.HERO.hp)));
  await ev(() => { const H = window.__havoc, p = H.HERO.p, m = H.MED.list.find(q => q.t <= 0); H.HERO.hp = H.HERO.maxHp; p.x = m.x + 0.5; p.z = m.z; });
  await page.waitForTimeout(600);
  console.log('pocket', await ev(() => JSON.stringify({ meds: window.__havoc.HERO.meds, hud: document.querySelector('#meds').textContent, shown: !document.querySelector('#meds').hidden })));
  await ev(() => { window.__havoc.HERO.hp = 20; window.__havoc.HERO.lastHurt = 1e9; });
  await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
  console.log('used medkit: hp', await ev(() => Math.round(window.__havoc.HERO.hp)), 'left', await ev(() => window.__havoc.HERO.meds));
  await ev(() => { window.__havoc.HERO.hp = 40; window.__havoc.HERO.lastHurt = -99; });
  await page.waitForTimeout(2500);
  console.log('regen: 40 ->', await ev(() => Math.round(window.__havoc.HERO.hp)));
  // motorbike first person
  await ev(() => { const H = window.__havoc, p = H.HERO.p; const W = H.getW(); const e = W.edges.find(q => q.len > 60); const A = W.nodes[e.a], B = W.nodes[e.b]; const h = Math.atan2(B.x - A.x, B.z - A.z); const v = new H.Vehicle(Object.assign({}, H.VEH.list.find(q => q.cfg).cfg, { body: 'bike', paint: '#d22f3c' }), 'parked'); v.place(A.x + Math.sin(h) * 8, A.z + Math.cos(h) * 8, h, 0); H.VEH.list.push(v); H.enterVehicle(v); window.__bk = v; });
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2200); await page.screenshot({ path: `${SP}/test/f-${MAP}-fpbike.png` });
  await page.keyboard.down('KeyA'); await page.waitForTimeout(800); await page.screenshot({ path: `${SP}/test/f-${MAP}-fpbike-lean.png` });
  console.log('fp bike', await ev(() => JSON.stringify({ fp: window.__havoc.CAM.fpBike, rider: window.__bk.model.rider.visible, lean: +window.__bk.bikeLean.toFixed(2), sp: +window.__bk.speed.toFixed(1) })));
  await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW');
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
