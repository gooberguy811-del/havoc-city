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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 20, pedDensity: 60, slowmo: 'off', quality: 'medium', time: 'day', police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  const waitFor = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
  const ev = (fn, a) => page.evaluate(fn, a);
  console.log('dealer', await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'); return JSON.stringify({ found: !!st, forSale: H.VEH.list.filter(v => v.forSale).length, sell: !!(st && st.sellR) }); }));
  // exterior
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'), v = H.G.player; v.place(st.cx - Math.sin(st.fh) * 30 + Math.cos(st.fh) * 8, st.cz - Math.cos(st.fh) * 30 - Math.sin(st.fh) * 8, st.fh + 0.25, 0); H.CAM.h = st.fh + 0.25; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/d-${MAP}-dealer.png` });
  // sell a stolen car (own car refused first)
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'), v = H.G.player; v.place(st.sx, st.sz, st.fh, 0); });
  await page.waitForTimeout(800);
  console.log('own car prompt', await ev(() => document.querySelector('#prompt').textContent));
  const cash0 = await ev(() => { const H = window.__havoc; H.MIS.cash = 20000; return H.MIS.cash; });
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'), o = H.G.player; o.place(st.sx + 12, st.sz + 12, 0, 0); const v = new H.Vehicle(Object.assign({}, o.cfg, { body: 'comet' }), 'parked'); v.place(st.sx + 8, st.sz + 8, 0, 0); H.VEH.list.push(v); H.toggleVehicle(); H.enterVehicle(v); window.__sv = v; });
  await page.waitForTimeout(600);
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'), v = H.G.player; v.place(st.sx, st.sz, st.fh, 0); });
  console.log('sold', await waitFor(() => !window.__havoc.VEH.list.includes(window.__sv), 8000), 'cash +', (await ev(() => window.__havoc.MIS.cash)) - cash0, 'on foot', await ev(() => window.__havoc.G.onFoot));
  // buy a car at the desk
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'), p = H.HERO.p; p.x = st.mx; p.z = st.mz; p.y = st.h; });
  await page.waitForTimeout(1200);
  console.log('dealer menu', await ev(() => JSON.stringify({ menu: window.__havoc.MENU.st && window.__havoc.MENU.st.kind, items: window.__havoc.MENU.items.map(i => i.label + ' $' + i.price) })));
  await page.screenshot({ path: `${SP}/test/d-${MAP}-showroom.png` });
  const c1 = await ev(() => window.__havoc.MIS.cash);
  await page.keyboard.press('Digit6'); await page.waitForTimeout(400);
  console.log('bought', (await ev(() => window.__havoc.MIS.cash)) - c1, await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'dealer'); const v = H.VEH.list.find(q => q.bought); return v ? v.cfg.body + ' at pickup ' + Math.round(Math.hypot(v.x - st.pickup.x, v.z - st.pickup.z)) : 'none'; }));
  // gas station counter: buy carrots, a drink, a scratchcard; then a hold-up needs Q
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'gas'), p = H.HERO.p; p.x = st.mx; p.z = st.mz; p.y = st.h; H.selectWeapon(1); H.HERO.hp = 50; });
  await page.waitForTimeout(1500);
  console.log('gas menu', await ev(() => JSON.stringify({ menu: window.__havoc.MENU.st && window.__havoc.MENU.st.kind, items: window.__havoc.MENU.items.map(i => i.label + ' $' + i.price), rob: window.__havoc.SHOP.list.find(s => s.kind === 'gas').rob, prompt: document.querySelector('#prompt').textContent })));
  await page.screenshot({ path: `${SP}/test/d-${MAP}-gasmenu.png` });
  for (const k of ['Digit1', 'Digit1', 'Digit1', 'Digit2', 'Digit3']) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  console.log('bought at gas', await ev(() => JSON.stringify({ carrots: window.__havoc.HERO.carrots, hp: window.__havoc.HERO.hp })));
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(500); await page.keyboard.up('KeyQ');
  console.log('hold-up started', await ev(() => window.__havoc.SHOP.list.find(s => s.kind === 'gas').rob > 0));
  await ev(() => { const H = window.__havoc, p = H.HERO.p, st = H.SHOP.list.find(s => s.kind === 'gas'); p.x = st.dx; p.z = st.dz; });
  await page.waitForTimeout(800);
  // carrot a parked car, a pedestrian steals it, it blows up down the road
  const carrot = await ev(() => { const H = window.__havoc, p = H.HERO.p; const v = H.VEH.list.find(q => q.kind === 'parked' && !q.forSale && !q.mission && !q.own && !q.bought && !q.wrecked && Math.hypot(q.x - p.x, q.z - p.z) < 200) ; if (!v) return 'no car'; window.__cv = v; const c = Math.cos(v.h), s = Math.sin(v.h); p.x = v.x - s * (Math.abs(v.rear) + 0.9) + c * 0.4; p.z = v.z - c * (Math.abs(v.rear) + 0.9) - s * 0.4; p.h = v.h; return v.cfg.body; }).catch(e => 'err ' + e.message);
  await page.waitForTimeout(500);
  console.log('carrot target', carrot, await ev(() => !!window.__havoc.carrotTarget()), await ev(() => document.querySelector('#prompt').textContent));
  await page.keyboard.press('KeyG'); await page.waitForTimeout(300);
  console.log('carrot in', await ev(() => JSON.stringify({ carrot: !!window.__cv.carrot, left: window.__havoc.HERO.carrots })));
  await page.screenshot({ path: `${SP}/test/d-${MAP}-carrot.png` });
  await ev(() => { const H = window.__havoc, v = window.__cv; v.carrot.fuse = 25; const p = H.HERO.p; p.x = v.x + 18; p.z = v.z + 18; const t = H.spawnPedAt(v.x + 6, v.z + 6, 'civ'); t.state = 'goto'; H.THIEF.list.push({ p: t, v, t0: 0, mine: false }); window.__th = t; });
  console.log('ped stole it', await waitFor(() => window.__cv.kind === 'traffic', 40000));
  console.log('carrot blew', await waitFor(() => window.__cv.wrecked, 40000));
  await page.screenshot({ path: `${SP}/test/d-${MAP}-carrot-boom.png` });
  // a pedestrian steals your own abandoned car
  await ev(() => { const H = window.__havoc; const v = new H.Vehicle(Object.assign({}, H.VEH.list.find(q => q.forSale).cfg, { body: 'viper', paint: '#d22f3c', plate: 'MINE' }), 'parked'); const p = H.HERO.p; v.place(p.x + 4, p.z, 0, 0); v.own = true; v.abandoned = true; v.abandonT = 0; H.VEH.list.push(v); window.__mine = v; p.x += 30; });
  const stole = await waitFor(() => { const H = window.__havoc; H.THIEF.t = 0; return window.__mine.kind === 'traffic' || H.THIEF.list.some(T => T.v === window.__mine); }, 30000);
  console.log('thief going for my car', stole, 'stolen', await waitFor(() => window.__mine.kind === 'traffic', 40000));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
