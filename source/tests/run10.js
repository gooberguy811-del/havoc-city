const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { time: 'day', map: 'sand', damage: 'realistic', trafficDensity: 0, pedDensity: 0, slowmo: 'off' }); });
  await page.click('.mapcard[data-map="sand"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  // head-on on the beach: player vs a parked muscle car
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(265, -60, 0, 0); P.vz = 24;
    const o = new H.Vehicle({ body: 'brute', paint: '#2a6fd6', finish: 'gloss', rim: 'classic', rimColor: '#ccc', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'CRUMPLE', engine: 2, handling: 2, brakes: 2, armor: 1 }, 'parked');
    o.place(265.4, -38, Math.PI, 0); o.vz = -12; o.abandoned = true; o.abandonT = 1e9; H.VEH.list.push(o); window.__o = o; });
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(100); if (await page.evaluate(() => window.__havoc.G.player.health < 99)) break; }
  await page.waitForTimeout(1800);
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player, o = window.__o; P.vx = P.vz = o.vx = o.vz = 0; const mx = (P.x + o.x) / 2, mz = (P.z + o.z) / 2; H.CAM.free = [[mx + 7.5, 2.6, mz - 1.5], [mx, 0.6, mz]]; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SP + '/test/90-headon.png' });
  console.log(await page.evaluate(() => { const H = window.__havoc, P = H.G.player, o = window.__o; const f = v => ({ hp: Math.round(v.health), max: v.maxHp, head: v.headBroken, bumper: v.model.bumperF.parent === v.model.body, glass: v.glassBroken, lost: v.lostCount, z: v.z.toFixed(1) }); return JSON.stringify({ player: f(P), other: f(o), debris: 0 }); }));
  console.log('errors:', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
