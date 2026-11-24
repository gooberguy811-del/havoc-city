const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + '\n' + e.stack));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'perth', trafficDensity: 10, pedDensity: 10, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="perth"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(140, 300, Math.PI, 0); P.vz = -16; });
  let t0 = Date.now(), swam = false;
  for (let i = 0; i < 80; i++) { await page.waitForTimeout(150); if (await page.evaluate(() => window.__havoc.G.onFoot)) { swam = true; break; } }
  console.log('ejected to swim:', swam, 'after', ((Date.now() - t0) / 1000).toFixed(1), 's real');
  await page.waitForTimeout(600);
  await page.screenshot({ path: SP + '/test/c1-swimming.png' });
  console.log('swim state', await page.evaluate(() => { const H = window.__havoc, F = H.PF(); return JSON.stringify({ swim: H.HERO.swim, x: F.x.toFixed(1), z: F.z.toFixed(1), y: F.y.toFixed(2), hp: H.HERO.hp }); }));
  // swim back south to the foreshore
  await page.evaluate(() => { const H = window.__havoc; H.HERO.p.h = 0; });
  await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
  for (let i = 0; i < 120; i++) { await page.waitForTimeout(200); const st = await page.evaluate(() => { const H = window.__havoc; return { swim: H.HERO.swim, z: H.PF().z }; }); if (!st.swim && st.z > 270) break; }
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  console.log('climbed out', await page.evaluate(() => { const H = window.__havoc, F = H.PF(); return JSON.stringify({ swim: H.HERO.swim, z: F.z.toFixed(1), y: F.y.toFixed(2) }); }));
  await page.screenshot({ path: SP + '/test/c2-shore.png' });
  // umbrellas at Cottesloe
  await page.evaluate(() => { const H = window.__havoc; H.CAM.free = [[-500, 14, -60], [-535, 0, -100]]; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: SP + '/test/c3-umbrellas.png' });
  console.log('errors:', errs.length, errs.slice(0, 3).join('\n'));
  await browser.close();
})();
