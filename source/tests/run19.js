const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', time: 'day', gore: 'high', trafficDensity: 0, pedDensity: 0, slowmo: 'off', police: 'normal' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  const st = () => page.evaluate(() => { const H = window.__havoc, A = H.ARMS; return { wpn: H.WEAPONS[A.cur].id, mag: A.mag[A.cur], ammo: A.ammo[A.cur], stars: H.wanted.stars, cars: H.G.stats.cars, cops: H.G.stats.cops, heroHp: Math.round(H.HERO.hp), onFoot: H.G.onFoot, carHp: window.__tc ? Math.round(window.__tc.health) : null, wrecked: window.__tc ? window.__tc.wrecked : null }; });
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(-3, 20, 0, 0); });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(600);
  const mk = () => page.evaluate(() => { const H = window.__havoc, F = H.PF(); const v = new H.Vehicle({ body: 'brute', paint: '#3a6fd0', finish: 'gloss', rim: 'sport', rimColor: '#ccc', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'TARGET', engine: 2, handling: 2, brakes: 2, armor: 1 }, 'parked'); v.place(F.x + 1, F.z + 13, Math.PI / 2, 0); H.VEH.list.push(v); window.__tc = v; H.HERO.p.h = 0.05; });
  await mk();
  await page.keyboard.press('Digit3'); await page.waitForTimeout(200);
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(2000);
  await page.screenshot({ path: SP + '/test/e1-smg.png' });
  await page.waitForTimeout(4000); await page.keyboard.up('KeyQ');
  console.log('smg at car', JSON.stringify(await st()));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const H = window.__havoc; H.CAM.free = null; });
  await mk();
  await page.keyboard.press('Digit5'); await page.waitForTimeout(300);
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(500); await page.keyboard.up('KeyQ');
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); if (await page.evaluate(() => window.__tc.wrecked)) break; }
  await page.waitForTimeout(200);
  await page.screenshot({ path: SP + '/test/e2-rocket.png' });
  console.log('rocket at car', JSON.stringify(await st()));
  // police officers shooting the player
  await page.keyboard.press('Digit2');
  await page.evaluate(() => { const H = window.__havoc, F = H.PF(); H.HERO.hp = 100; H.addHeat(2.6, 2, true); for (let k = 0; k < 3; k++) H.spawnPedAt(F.x + 14 + k * 2, F.z - 6 + k, 'cop'); });
  let minHp = 100;
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); minHp = Math.min(minHp, await page.evaluate(() => window.__havoc.HERO.hp)); }
  console.log('hero hp under police fire after ~6s:', Math.round(minHp));
  await page.screenshot({ path: SP + '/test/e3-copfire.png' });
  await page.evaluate(() => { const H = window.__havoc; H.HERO.hp = 100; H.HERO.p.h = Math.PI / 2; });
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(4000); await page.keyboard.up('KeyQ');
  console.log('after shooting back', JSON.stringify(await st()), 'cops down', await page.evaluate(() => window.__havoc.PED.list.filter(p => p.active && p.cop && p.dead).length));
  // drive-by from a fresh car
  await page.evaluate(() => { const H = window.__havoc; H.HERO.hp = 100; });
  await page.evaluate(() => { document.getElementById('pRespawn').click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(-3, 20, 0, 0); window.__tc = null; });
  await mk();
  await page.keyboard.press('Digit3');
  const m0 = await page.evaluate(() => window.__havoc.ARMS.mag[3]);
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(2000); await page.keyboard.up('KeyQ');
  console.log('drive-by shots fired:', m0 - await page.evaluate(() => window.__havoc.ARMS.mag[3]), JSON.stringify(await st()));
  console.log('errors:', errs.length); console.log(errs.slice(0, 6).join('\n'));
  await browser.close();
})();
