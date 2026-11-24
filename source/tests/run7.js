const { chromium, devices } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  const setup = async (page) => {
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1200);
  };
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); await setup(page);
  await page.evaluate(() => { const H = window.__havoc; Object.assign(H.settings, { time: 'sunset', gore: 'high', map: 'neon', damage: 'brutal', trafficDensity: 20, pedDensity: 40, slowmo: 'off' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(-108, 70, 0, 0); P.vz = 26; });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.vx = P.vz = 0; H.CAM.free = [[P.x + 3.2, P.y + 1.8, P.z + 6.5], [P.x, P.y + 0.5, P.z + 1]]; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SP + '/test/70-front.png' });
  const s1 = await page.evaluate(() => { const P = window.__havoc.G.player; return { hp: Math.round(P.health), maxHp: P.maxHp, eng: P.engineDmg.toFixed(2), head: P.headBroken, wd: P.wdmg.map(x => Math.round(x)), lost: P.lostCount, pull: P.pull.toFixed(2) }; });
  console.log('front', JSON.stringify(s1));
  // on foot with cops
  await page.evaluate(() => { const H = window.__havoc; H.CAM.free = null; const P = H.G.player; P.place(0, 30, 0, 0); });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(600);
  await page.evaluate(() => { const H = window.__havoc, F = H.PF(); H.addHeat(2.4, 2, true); for (let k = 0; k < 2; k++) H.spawnPedAt(F.x + 9 + k, F.z + 6, 'cop'); });
  await page.waitForTimeout(4000);
  const s2 = await page.evaluate(() => { const H = window.__havoc, F = H.PF(); return { foot: H.G.onFoot, hp: H.HERO.hp, cops: H.PED.list.filter(p => p.active && p.cop).map(p => Math.hypot(p.x - F.x, p.z - F.z).toFixed(1)), bust: H.wanted.bust.toFixed(2), stars: H.wanted.stars }; });
  console.log('cops', JSON.stringify(s2));
  await page.screenshot({ path: SP + '/test/71-cops.png' });
  for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyQ'); await page.waitForTimeout(350); }
  await page.waitForTimeout(600);
  await page.screenshot({ path: SP + '/test/72-punch.png' });
  const s3 = await page.evaluate(() => { const H = window.__havoc; return { hp: H.HERO.hp, down: H.G.down, stars: H.wanted.stars, ragCops: H.PED.list.filter(p => p.active && p.cop && p.rag).length }; });
  console.log('punch', JSON.stringify(s3));
  await page.close();
  // garage + mobile HUD sanity
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await ctx.newPage(); await setup(m);
  await m.tap('#garageBtn'); await m.waitForTimeout(800); await m.screenshot({ path: SP + '/test/73-m-garage.png' });
  await m.tap('#garageDrive'); await m.waitForTimeout(3000);
  await m.evaluate(() => { const P = window.__havoc.G.player; P.place(-5, 40, 0, 0); });
  await m.waitForTimeout(1500);
  await m.tap('#touch [data-k=enter]'); await m.waitForTimeout(1500);
  await m.screenshot({ path: SP + '/test/74-m-foot.png' });
  console.log('errors:', errs.length); console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
})();
