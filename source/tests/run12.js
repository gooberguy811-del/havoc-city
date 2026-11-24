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
  await page.click('#garageBtn'); await page.waitForTimeout(1200);
  await page.screenshot({ path: SP + '/test/a0-garage.png' });
  await page.click('#garageBack');
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'sand', trafficDensity: 30, pedDensity: 30, slowmo: 'on', time: 'day', quality: 'medium' }); });
  await page.click('.mapcard[data-map="sand"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  // handbrake drift on the beach for skid marks
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(265, -140, 0, 0); P.vz = 22; });
  await page.keyboard.down('KeyA'); await page.keyboard.down('Space'); await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('Space'); await page.keyboard.up('KeyA'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: SP + '/test/a1-skids.png' });
  console.log('skid marks placed', await page.evaluate(() => 0));
  // crash into a parked car and capture the crash cam
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.health = P.maxHp; P.place(285, -100, 0, 0); P.vz = 26;
    const o = new H.Vehicle({ body: 'ranger', paint: '#2a6fd6', finish: 'gloss', rim: 'classic', rimColor: '#ccc', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'X', engine: 2, handling: 2, brakes: 2, armor: 1 }, 'parked'); o.place(285.6, -78, 0.3, 0); H.VEH.list.push(o); });
  for (let i = 0; i < 50; i++) { await page.waitForTimeout(60); if (await page.evaluate(() => window.__havoc.G.slowmo > 0)) break; }
  await page.waitForTimeout(700);
  await page.screenshot({ path: SP + '/test/a2-crashcam.png' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SP + '/test/a3-crashcam2.png' });
  await page.waitForTimeout(3000);
  console.log('after', await page.evaluate(() => JSON.stringify({ slow: window.__havoc.G.slowmo, cls: document.getElementById('ui').className, filter: document.querySelector('#stage canvas').style.filter, perf: window.__havoc.PERF.upd.toFixed(2) })));
  console.log('errors:', errs.length); console.log(errs.slice(0, 8).join('\n'));
  await browser.close();
})();
