const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1500);
  await page.evaluate(() => { const H = window.__havoc; H.settings.time = 'day'; H.settings.gore = 'high'; H.settings.map = 'neon'; H.settings.damage = 'realistic'; });
  await page.click('.mapcard[data-map="neon"]');
  await page.click('#playBtn'); await page.waitForTimeout(3000);
  const st = () => page.evaluate(() => { const H = window.__havoc, P = H.G.player, F = H.PF(); return { onFoot: H.G.onFoot, car: P ? { kind: P.kind, hp: Math.round(P.health), uniq: P.uniq, flipped: P.flipped, tumble: P.tumble, roll: +P.roll.toFixed(2), bumperF: P.model.bumperF.parent === P.model.body, glass: P.glassBroken, lost: P.lostCount } : null, focus: { x: +F.x.toFixed(1), z: +F.z.toFixed(1) }, mission: H.MIS.active ? H.MIS.active.id + ':' + H.MIS.idx : null, obj: H.MIS.objText, stars: H.wanted.stars, cops: H.PED.list.filter(p => p.active && p.cop).length, heroHp: H.HERO.hp, cash: H.MIS.cash, debris: 0 }; });
  console.log('start', JSON.stringify(await st()));
  // 1) drive into the Joyride marker
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(-5, 40, 0, 0); });
  await page.waitForTimeout(1500);
  console.log('mission?', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/50-mission-intro.png' });
  // 2) get out, walk to the target car, steal it
  await page.evaluate(() => { const H = window.__havoc, v = H.MIS.car, P = H.G.player; P.place(v.x - 8, v.z - 6, Math.PI / 2, 0); });
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyF'); await page.waitForTimeout(800);
  console.log('exited', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/51-onfoot.png' });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW');
  await page.evaluate(() => { const H = window.__havoc, v = H.MIS.car, p = H.HERO.p; p.x = v.x + Math.cos(v.h) * 2.2; p.z = v.z - Math.sin(v.h) * 2.2; });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(2500);
  console.log('stolen', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/52-stolen.png' });
  // 3) wall crash at speed
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(0 - 3, 120, Math.PI, 0); /* lane heading -z? */ });
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; const W = H.getW(); const b = W.boxes.find(b => b.kind === 'b' && b.h > 20 && Math.abs((b.x0 + b.x1) / 2) < 100 && Math.abs((b.z0 + b.z1) / 2) < 100); const cx = (b.x0 + b.x1) / 2; P.place(cx, b.z0 - 14, 0, 0); P.vz = 26; P.vx = 0; H.CAM.mode = 1; });
  await page.waitForTimeout(2500);
  console.log('crash', JSON.stringify(await st()));
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.CAM.h = P.h + 2.4; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SP + '/test/53-crash.png' });
  // 4) T-bone: send a traffic car into the player's side
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(-3, 30, 0, 0); P.health = P.maxHp; const o = H.VEH.list.find(v => v.kind === 'traffic' && !v.wrecked); o.ai = null; o.kind = 'parked'; o.place(14, 30, -Math.PI / 2, 0); o.vx = -30; o.vz = 0; window.__tb = o; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SP + '/test/54-tbone.png' });
  await page.waitForTimeout(2500);
  console.log('tbone', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/55-after-tbone.png' });
  // 5) on foot with police
  await page.keyboard.press('KeyR'); await page.waitForTimeout(800);
  await page.keyboard.press('KeyF'); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__havoc.addHeat(2.5, 2, true); });
  await page.waitForTimeout(9000);
  console.log('foot+cops', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/56-foot-cops.png' });
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyQ'); await page.waitForTimeout(300); }
  console.log('perf', await page.evaluate(() => window.__havoc.PERF.upd.toFixed(2)));
  console.log('errors:', errs.length); console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
})();
