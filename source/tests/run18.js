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
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', time: 'day', gore: 'high', trafficDensity: 40, pedDensity: 70, slowmo: 'off', police: 'normal' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(3000);
  const st = () => page.evaluate(() => { const H = window.__havoc, A = H.ARMS; return { wpn: H.WEAPONS[A.cur].id, mag: A.mag[A.cur], ammo: A.ammo[A.cur], stars: H.wanted.stars, peds: H.G.stats.peds, cars: H.G.stats.cars, cops: H.G.stats.cops, heroHp: Math.round(H.HERO.hp), onFoot: H.G.onFoot, target: A.target ? (A.target.isPed ? 'ped' : 'car') : null }; });
  // on foot with the pistol, bring some pedestrians close
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(-3, 30, 0, 0); });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(600);
  await page.evaluate(() => { const H = window.__havoc, F = H.PF(); const ps = H.PED.list.filter(p => p.active && !p.rag && !p.isHero).slice(0, 3); ps.forEach((p, i) => { p.x = F.x - 6 + i * 2; p.z = F.z + 10; p.state = 'idle'; }); });
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(2500); await page.keyboard.up('KeyQ');
  console.log('pistol', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/d1-pistol.png' });
  // SMG at a traffic car
  await page.keyboard.press('Digit2');
  await page.evaluate(() => { const H = window.__havoc, F = H.PF(); const v = H.VEH.list.find(v => v.kind === 'traffic' && !v.wrecked); v.ai = null; v.kind = 'parked'; v.place(F.x + 2, F.z + 14, Math.PI / 2, 0); window.__tc = v; H.HERO.p.h = 0.1; });
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(4000); await page.keyboard.up('KeyQ');
  console.log('smg', JSON.stringify(await st()), 'car hp', await page.evaluate(() => Math.round(window.__tc.health)));
  await page.screenshot({ path: SP + '/test/d2-smg.png' });
  // rocket at it
  await page.keyboard.press('Digit5'); await page.waitForTimeout(300);
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(700); await page.keyboard.up('KeyQ');
  await page.waitForTimeout(1500);
  console.log('rocket', JSON.stringify(await st()), 'car wrecked', await page.evaluate(() => window.__tc.wrecked));
  await page.screenshot({ path: SP + '/test/d3-rocket.png' });
  // mouse aim with the shotgun at the middle of the screen
  await page.keyboard.press('Digit4');
  await page.mouse.move(640, 420); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up();
  console.log('shotgun mouse', JSON.stringify(await st()));
  // police shoot back
  await page.keyboard.press('Digit1');
  await page.evaluate(() => { const H = window.__havoc, F = H.PF(); H.addHeat(2.5, 2, true); for (let k = 0; k < 2; k++) H.spawnPedAt(F.x + 12 + k * 2, F.z + 8, 'cop'); });
  await page.waitForTimeout(6000);
  console.log('cops fire', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/d4-cops.png' });
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(3500); await page.keyboard.up('KeyQ');
  console.log('return fire', JSON.stringify(await st()));
  // drive-by
  await page.evaluate(() => { const H = window.__havoc; if (H.HERO.hp < 30) H.HERO.hp = 100; });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(2500);
  console.log('in car?', JSON.stringify(await st()));
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(1500); await page.keyboard.up('KeyQ');
  console.log('drive-by', JSON.stringify(await st()));
  console.log('perf', await page.evaluate(() => window.__havoc.PERF.upd.toFixed(2)));
  console.log('errors:', errs.length); console.log(errs.slice(0, 8).join('\n'));
  await browser.close();
})();
