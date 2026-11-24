const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { const H = window.__havoc; Object.assign(H.settings, { time: 'day', gore: 'high', map: 'neon', damage: 'realistic', trafficDensity: 0, pedDensity: 30, slowmo: 'off' }); });
  await page.click('.mapcard[data-map="neon"]');
  await page.click('#playBtn'); await page.waitForTimeout(2500);
  const st = (v) => page.evaluate((k) => { const H = window.__havoc, P = k ? window[k] : H.G.player; return P ? { hp: Math.round(P.health), uniq: P.uniq, flipped: P.flipped, tumble: P.tumble, onGround: P.onGround, roll: +P.roll.toFixed(2), bf: P.model.bumperF.parent === P.model.body, glass: P.glassBroken, lost: P.lostCount, x: +P.x.toFixed(1), z: +P.z.toFixed(1), y: +P.y.toFixed(2) } : null; }, v);
  // frontal crash into the plaza monument (open space around it)
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(-108, 70, 0, 0); P.vz = 24; });
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); const s = await st(); if (s.hp < 100 && Math.abs(s.z - 70) > 20) break; }
  await page.waitForTimeout(1500);
  console.log('frontal', JSON.stringify(await st()));
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.CAM.free = [[P.x + 4.5, P.y + 2.2, P.z - 5.5], [P.x, P.y + 0.6, P.z + 0.5]]; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SP + '/test/60-frontal.png' });
  // T-bone at an intersection: player stopped in the junction, other car from the side
  await page.evaluate(() => { const H = window.__havoc; H.CAM.free = null; const P = H.G.player; P.place(0, 0, 0, 0); P.health = P.maxHp;
    const cfg = { body: 'ranger', paint: '#2f5fa8', finish: 'gloss', rim: 'sport', rimColor: '#ccc', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'TBONE', engine: 2, handling: 2, brakes: 2, armor: 1 };
    const o = new (H.G.player.constructor)(cfg, 'parked'); o.place(32, 0.3, -Math.PI / 2, 0); o.vx = -31; o.abandoned = true; o.abandonT = 1e9; H.VEH.list.push(o); window.__tb = o; });
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.CAM.free = [[-9, 4, -10], [0, 0.8, 0]]; });
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(100); const s = await st(); if (s.tumble || s.flipped) break; }
  await page.screenshot({ path: SP + '/test/61-tbone-air.png' });
  console.log('tbone mid', JSON.stringify(await st()));
  await page.waitForTimeout(3500);
  console.log('tbone end', JSON.stringify(await st()), 'other', JSON.stringify(await st('__tb')));
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.CAM.free = [[P.x - 6, P.y + 3.5, P.z - 7], [P.x, P.y + 0.6, P.z]]; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SP + '/test/62-tbone-end.png' });
  // explosion rollover of a nearby car
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.explode(P.x + 3, P.y + 0.5, P.z + 1, 1.2, P); });
  await page.waitForTimeout(300);
  console.log('boom', JSON.stringify(await st()));
  await page.waitForTimeout(2500);
  console.log('boom end', JSON.stringify(await st()));
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.CAM.free = [[P.x - 6, P.y + 3.5, P.z - 7], [P.x, P.y + 0.6, P.z]]; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SP + '/test/63-boom-end.png' });
  console.log('errors:', errs.length); console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
})();
