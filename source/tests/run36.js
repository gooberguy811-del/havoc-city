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
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
  console.log('stores', await page.evaluate(() => { const H = window.__havoc; return JSON.stringify({ shops: H.SHOP.list.map(s => s.kind), mechs: H.MECH.list.length, structs: H.STR.list.filter(s => s.station).map(s => s.station.kind + ':' + s.kind + ':' + s.parts.length + ':' + s.boxes.length) }); }));
  // walk the hero into each store
  const goto = async (kind, off) => page.evaluate(([kind, off]) => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const st = H.SHOP.list.find(s => s.kind === kind); const p = H.HERO.p; const tx = st[off ? off[0] : 'cx'], tz = st[off ? off[1] : 'cz']; p.x = tx; p.z = tz; p.y = st.h; p.h = st.fh + Math.PI; H.MIS.cash = 5000; return [Math.round(p.x), Math.round(p.z)]; }, [kind, off]);
  await page.evaluate(() => { window.__havoc.G.player.vx = 0; window.__havoc.G.player.vz = 0; window.__havoc.toggleVehicle(); });
  await page.waitForTimeout(1500);
  for (const kind of ['gun', 'disguise']) {
    await goto(kind, ['mx', 'mz']); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => { const H = window.__havoc; return { inside: H.SHOP.inside && H.SHOP.inside.kind, menu: H.MENU.st && H.MENU.st.kind, items: H.MENU.items.map(i => i.label + ' $' + i.price), visible: !document.querySelector('#buy').hidden, prompt: document.querySelector('#prompt').textContent }; });
    console.log(kind, JSON.stringify(r));
    await page.screenshot({ path: `${SP}/test/s-${MAP}-${kind}.png` });
  }
  // buy armour + disguise with wanted level
  await goto('gun', ['mx', 'mz']); await page.waitForTimeout(800);
  await page.keyboard.press('Digit5'); await page.waitForTimeout(200);
  console.log('armour', await page.evaluate(() => [window.__havoc.HERO.armor, window.__havoc.MIS.cash, !document.querySelector('#arRow').hidden]));
  await page.evaluate(() => { const H = window.__havoc; H.addHeat(2.5, 2, true); });
  await goto('disguise', ['mx', 'mz']); await page.waitForTimeout(800);
  await page.click('#buyList button:first-child'); await page.waitForTimeout(200);
  console.log('disguise', await page.evaluate(() => [window.__havoc.wanted.stars, window.__havoc.MIS.cash]));
  // jewel store
  await goto('jewel'); await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SP}/test/s-${MAP}-jewel.png` });
  const j = await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'jewel'), c = st.cases[0], p = H.HERO.p; p.x = c.x - Math.sin(st.fh) * 1.0; p.z = c.z - Math.cos(st.fh) * 1.0; p.h = st.fh; return st.cases.length; });
  await page.evaluate(() => window.__havoc.selectWeapon(0)); await page.waitForTimeout(300); await page.keyboard.press('KeyQ'); await page.waitForTimeout(600);
  console.log('jewel', await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'jewel'); return JSON.stringify({ broken: st.cases.filter(c => c.broken).length, stars: H.wanted.stars, prompt: document.querySelector('#prompt').textContent }); }));
  await page.screenshot({ path: `${SP}/test/s-${MAP}-jewel2.png` });
  // bank: hold up the teller
  await page.evaluate(() => { const H = window.__havoc; H.wanted.heat = 0; H.wanted.stars = 0; H.settings.police = 'off'; });
  await goto('bank'); await page.waitForTimeout(1500);
  await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'bank'), p = H.HERO.p; p.x = st.kx - Math.sin(st.kh) * -4; p.z = st.kz - Math.cos(st.kh) * -4; p.x = st.kx + Math.sin(st.kh) * 4; p.z = st.kz + Math.cos(st.kh) * 4; H.selectWeapon(1); });
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(400); await page.keyboard.up('KeyQ');
  await page.screenshot({ path: `${SP}/test/s-${MAP}-bank.png` });
  await page.waitForTimeout(2500); await page.evaluate(() => { const st = window.__havoc.SHOP.list.find(s => s.kind === 'bank'); if (st.rob > 0) st.rob = 0.97; }); await page.waitForTimeout(2500);
  console.log('bank', await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'bank'); return JSON.stringify({ rob: st.rob, open: st.vault.open, want: st.vault.want, cash: st.cash.map(c => c.amt), prompt: document.querySelector('#prompt').textContent, clerk: !!st.clerk }); }));
  await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'bank'), p = H.HERO.p; const c = st.cash[1]; p.x = (st.vault.hx + c.x) / 2; p.z = (st.vault.hz + c.z) / 2; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SP}/test/s-${MAP}-vault.png` });
  for (let i = 0; i < 3; i++) { await page.evaluate(i => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'bank'), p = H.HERO.p; const c = st.cash[i]; p.x = c.x; p.z = c.z; }, i); await page.waitForTimeout(250); }
  console.log('vault loot', await page.evaluate(() => [window.__havoc.MIS.cash, window.__havoc.SHOP.list.find(s => s.kind === 'bank').cash.map(c => c.amt)]));
  // mechanic: drive a damaged car into the bay
  await page.evaluate(() => { const H = window.__havoc; H.settings.police = 'normal'; const m = H.MECH.list[0]; H.HERO.p.x = m.ex; H.HERO.p.z = m.ez; });
  await page.waitForTimeout(300);
  const mr = await page.evaluate(() => { const H = window.__havoc, m = H.MECH.list[0]; const v = new H.Vehicle({ ...H.G.player ? H.G.player.cfg : {}, body: 'viper', paint: '#d22f3c', finish: 'gloss', rim: 'sport', rimColor: '#c9ccd2', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'TEST', engine: 2, handling: 2, brakes: 2, armor: 1, nitro: true, stripes: false, stripe: '#fff' }, 'parked'); v.place(m.ex, m.ez, m.fh, 0); H.VEH.list.push(v); H.deformAt(v, v.x + 1, v.y + 0.6, v.z + 2, 30); v.health *= 0.4; H.HERO.p.x = v.x + 2; H.HERO.p.z = v.z; window.__mv = v; return Math.round(v.health); });
  await page.evaluate(() => window.__havoc.enterVehicle(window.__mv)); await page.waitForTimeout(800);
  await page.evaluate(() => { const H = window.__havoc, m = H.MECH.list[0], v = H.G.player; H.addHeat(2.2, 2, true); v.place((m.bay.x0 + m.bay.x1) / 2, (m.bay.z0 + m.bay.z1) / 2, m.fh, 0); });
  await page.waitForTimeout(600); await page.screenshot({ path: `${SP}/test/s-${MAP}-mech1.png` });
  console.log('mech done', await waitFor(() => { const m = window.__havoc.MECH.list[0]; return m.done; }, 30000));
  console.log('mech', await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return JSON.stringify({ same: v === window.__mv, hp: Math.round(v.health), max: Math.round(v.maxHp), paint: v.cfg.paint, stars: H.wanted.stars, cash: H.MIS.cash, fade: H.MECH.fade }); }));
  await page.screenshot({ path: `${SP}/test/s-${MAP}-mech2.png` });
  // exterior shots of the strip and bank
  for (const kind of ['jewel', 'bank']) {
    await page.evaluate(k => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === k), v = H.G.player; const d = k === 'bank' ? 34 : 26; v.place(st.cx - Math.sin(st.fh) * d, st.cz - Math.cos(st.fh) * d, st.fh, 0); H.CAM.h = st.fh; }, kind);
    await page.waitForTimeout(1200); await page.screenshot({ path: `${SP}/test/s-${MAP}-ext-${kind}.png` });
  }
  // rubble hitbox: collapse the bank and drive through
  const rb = await page.evaluate(() => { const H = window.__havoc, s = H.STR.list.find(q => q.station && q.station.kind === 'bank'); s.hp = 1; H.damageStructsAt((s.x0 + s.x1) / 2, s.y0 + 2, (s.z0 + s.z1) / 2, 1, 'hero'); return s.boxes.length; });
  console.log('collapsed', await waitFor(() => window.__havoc.STR.list.find(q => q.station && q.station.kind === 'bank').state === 2, 60000));
  console.log('rubble', await page.evaluate(() => { const H = window.__havoc, s = H.STR.list.find(q => q.station && q.station.kind === 'bank'), W = H.getW(); const out = []; W.boxGrid.query(s.x0, s.z0, s.x1, s.z1, out); return JSON.stringify({ state: s.state, gone: s.boxes.filter(b => b.gone).length, of: s.boxes.length, left: out.filter(b => s.boxes.includes(b)).length }); }));
  await page.evaluate(() => { const H = window.__havoc, s = H.STR.list.find(q => q.station && q.station.kind === 'bank'), v = H.G.player; const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2; v.place(cx - Math.sin(s.station.fh) * 30, cz - Math.cos(s.station.fh) * 30, s.station.fh, 22); window.__start = [v.x, v.z]; });
  await page.waitForTimeout(400); await page.keyboard.down('KeyW'); await page.waitForTimeout(3500); await page.keyboard.up('KeyW');
  console.log('drive through', await page.evaluate(() => { const v = window.__havoc.G.player; return Math.round(Math.hypot(v.x - window.__start[0], v.z - window.__start[1])); }));
  await page.screenshot({ path: `${SP}/test/s-${MAP}-rubble.png` });
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
