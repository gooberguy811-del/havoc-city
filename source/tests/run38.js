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
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 10, slowmo: 'off', quality: 'medium', time: 'day', police: 'normal' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  const waitFor = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
  const ev = (fn, a) => page.evaluate(fn, a);
  // ---- motorbike ----
  await ev(() => { const H = window.__havoc, o = H.G.player; o.vx = o.vz = 0; const v = new H.Vehicle(Object.assign({}, o.cfg, { body: 'bike', paint: '#d22f3c' }), 'parked'); v.place(o.x + Math.sin(o.h) * 8, o.z + Math.cos(o.h) * 8, o.h, 0); H.VEH.list.push(v); window.__bike = v; });
  await page.waitForTimeout(500); await page.screenshot({ path: `${SP}/test/m-${MAP}-bike-parked.png` });
  await ev(() => { const H = window.__havoc; H.toggleVehicle(); H.enterVehicle(window.__bike); });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.down('KeyA'); await page.waitForTimeout(900);
  await page.screenshot({ path: `${SP}/test/m-${MAP}-bike-lean.png` });
  console.log('bike', await ev(() => { const v = window.__havoc.G.player; return JSON.stringify({ bike: v && v.bike, sp: v && +v.speed.toFixed(1), lean: v && +v.bikeLean.toFixed(2), rider: v && v.model.rider.visible }); }));
  await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW');
  // crash it into a building
  await ev(() => { const H = window.__havoc, v = H.G.player, W = H.getW(); const b = W.boxes.find(q => q.kind === 'b' && q.h > 10 && Math.hypot((q.x0 + q.x1) / 2 - v.x, (q.z0 + q.z1) / 2 - v.z) < 200); const cx = (b.x0 + b.x1) / 2, z = b.z0 - 14; v.place(cx, z, 0, 22); window.__crashB = b; });
  const thrown = await waitFor(() => window.__havoc.G.onFoot && window.__havoc.HERO.p && !!window.__havoc.HERO.p.rag, 15000);
  await page.waitForTimeout(300); await page.screenshot({ path: `${SP}/test/m-${MAP}-bike-crash.png` });
  console.log('bike crash thrown', thrown, await ev(() => JSON.stringify({ hp: Math.round(window.__havoc.HERO.hp), down: window.__havoc.G.down })));
  await ev(() => { const H = window.__havoc; H.HERO.hp = 100; });
  await page.waitForTimeout(2500);
  // ---- heli: shoot it down ----
  await ev(() => { const H = window.__havoc; H.addHeat(3.3, 3, true); });
  console.log('heli spawned', await waitFor(() => window.__havoc.HELI.active, 8000));
  await page.waitForTimeout(1500);
  console.log('ray hits heli', await ev(() => { const H = window.__havoc, h = H.HELI, o = { x: h.x + 5, y: h.y - 30, z: h.z }; const dx = h.x - o.x, dy = h.y - 0.5 - o.y, dz = h.z - o.z, l = Math.hypot(dx, dy, dz); return H.rayCast(o.x, o.y, o.z, dx / l, dy / l, dz / l, 100).type; }));
  const cash0 = await ev(() => window.__havoc.MIS.cash);
  await ev(() => window.__havoc.heliDamage(400, true));
  await page.waitForTimeout(600); await page.screenshot({ path: `${SP}/test/m-${MAP}-heli-down.png` });
  console.log('heli crashed', await waitFor(() => !window.__havoc.HELI.active, 20000), 'cash +', (await ev(() => window.__havoc.MIS.cash)) - cash0);
  await ev(() => { const H = window.__havoc; H.wanted.heat = 0; H.wanted.stars = 0; H.settings.police = 'off'; });
  // ---- explosion launch + parachute ----
  await ev(() => { const H = window.__havoc, p = H.HERO.p; H.HERO.hp = 5000; H.explode(p.x + 1.2, p.y, p.z + 0.5, 2, null); });
  const can = await waitFor(() => window.__havoc.canDeploy(), 8000);
  await page.keyboard.press('Space'); await page.waitForTimeout(300);
  console.log('blast chute: canDeploy', can, 'open', await ev(() => JSON.stringify(window.__havoc.HERO.chute)));
  await page.waitForTimeout(800); await page.screenshot({ path: `${SP}/test/m-${MAP}-blast-chute.png` });
  await waitFor(() => !window.__havoc.HERO.chute, 30000); await ev(() => { window.__havoc.HERO.hp = 100; });
  // ---- Stinger bombs ----
  await ev(() => { const H = window.__havoc, pl = H.PLANES.list.find(q => q.type === 'stinger' && !q.remote); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = 70; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * 45, 0, Math.cos(pl.yaw) * 45); pl.T = 0.8; });
  await page.waitForTimeout(800);
  await page.keyboard.press('KeyB'); await page.waitForTimeout(350); await page.keyboard.press('KeyB');
  await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/test/m-${MAP}-bombs.png` });
  console.log('bombs', await ev(() => JSON.stringify({ live: window.__havoc.BOMBS.list.length, left: window.__havoc.G.plane.bombs, hud: document.querySelector('#bombsV').textContent })));
  console.log('bombs landed', await waitFor(() => window.__havoc.BOMBS.list.length === 0, 20000));
  await page.screenshot({ path: `${SP}/test/m-${MAP}-bombs2.png` });
  // ---- bail out high, free fall, open chute ----
  await ev(() => { const pl = window.__havoc.G.plane; pl.y = 150; });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(700);
  console.log('freefall', await ev(() => JSON.stringify({ chute: window.__havoc.HERO.chute, prompt: document.querySelector('#prompt').textContent })));
  await page.screenshot({ path: `${SP}/test/m-${MAP}-freefall.png` });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
  console.log('opened', await ev(() => JSON.stringify(window.__havoc.HERO.chute)));
  // ---- free look ----
  const box = await page.locator('canvas').first().boundingBox();
  await page.mouse.move(box.x + 640, box.y + 360); await page.mouse.down({ button: 'right' }); await page.mouse.move(box.x + 900, box.y + 300, { steps: 6 }); await page.mouse.up({ button: 'right' });
  console.log('free look', await ev(() => JSON.stringify({ ly: +window.__havoc.CAM.ly.toFixed(2), lp: +window.__havoc.CAM.lp.toFixed(2) })));
  await page.waitForTimeout(300); await page.screenshot({ path: `${SP}/test/m-${MAP}-look.png` });
  await waitFor(() => !window.__havoc.HERO.chute, 40000);
  // ---- heist ----
  await ev(() => { const H = window.__havoc; H.HERO.hp = 100; H.settings.police = 'normal'; const d = H.MISSIONS[H.getW().id].find(q => q.id === 'heist'); window.__hd = d; H.startMission(d); });
  console.log('heist step', await ev(() => window.__havoc.MIS.s.st.t));
  await ev(() => { const H = window.__havoc, st = H.MIS.s.st; const v = new H.Vehicle(Object.assign({}, H.G.player ? H.G.player.cfg : { body: 'viper', paint: '#f2f2f2', finish: 'gloss', rim: 'sport', rimColor: '#c9ccd2', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'X', engine: 2, handling: 2, brakes: 2, armor: 1, nitro: true, stripes: false, stripe: '#fff' }), 'parked'); const A = window.__hd; v.place(st.at[0] - 3, st.at[1] - 3, 0, 0); H.VEH.list.push(v); H.enterVehicle(v); });
  await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/test/m-${MAP}-heist-vic.png` });
  console.log('picked up Vic', await waitFor(() => window.__havoc.MIS.s && window.__havoc.MIS.s.st.t === 'goto', 25000));
  await ev(() => { const H = window.__havoc, st = H.MIS.s.st, v = H.G.player; v.place(st.at[0], st.at[1], v.h, 0); });
  console.log('at hangar', await waitFor(() => window.__havoc.MIS.s && window.__havoc.MIS.s.st.t === 'crack', 8000));
  await page.waitForTimeout(4000); await page.screenshot({ path: `${SP}/test/m-${MAP}-heist-crack.png` });
  console.log('crack', await ev(() => { const H = window.__havoc, s = H.MIS.s; return JSON.stringify({ t: +s.t.toFixed(1), stars: H.wanted.stars, cops: H.PED.list.filter(p => p.active && p.cop).length, obj: document.querySelector('#obj') ? document.querySelector('#obj').textContent : '' }); }));
  await ev(() => { const s = window.__havoc.MIS.s; s.t = s.st.time; });
  console.log('van step', await waitFor(() => window.__havoc.MIS.s && window.__havoc.MIS.s.st.t === 'steal', 8000));
  await ev(() => { const H = window.__havoc; H.toggleVehicle(); });
  await page.waitForTimeout(600);
  await ev(() => { const H = window.__havoc; H.enterVehicle(H.MIS.car); });
  console.log('evade step', await waitFor(() => window.__havoc.MIS.s && window.__havoc.MIS.s.st.t === 'evade', 8000), await ev(() => window.__havoc.wanted.stars));
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/m-${MAP}-heist-escape.png` });
  await ev(() => { const H = window.__havoc; H.wanted.heat = 0; H.wanted.stars = 0; });
  console.log('deliver step', await waitFor(() => window.__havoc.MIS.s && window.__havoc.MIS.s.st.t === 'deliver', 8000));
  const cashH = await ev(() => window.__havoc.MIS.cash);
  await ev(() => { const H = window.__havoc, st = H.MIS.s.st, v = H.G.player; v.place(st.at[0], st.at[1], v.h, 0); });
  console.log('heist passed', await waitFor(() => !window.__havoc.MIS.active, 10000), 'reward', (await ev(() => window.__havoc.MIS.cash)) - cashH, 'unlocked', await ev(() => JSON.stringify(window.__havoc.MIS.unlocked)));
  await page.waitForTimeout(4500); await page.screenshot({ path: `${SP}/test/m-${MAP}-heist-pass.png` });
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
