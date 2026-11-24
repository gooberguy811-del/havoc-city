const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'sand', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="sand"]'); await page.click('#playBtn'); await page.waitForTimeout(2000);
  for (const speed of [20, 35]) {
    await page.evaluate((sp) => { const H = window.__havoc, P = H.G.player || null; if (!P) return; P.place(222, -150, 0, 0); P.vz = sp; }, speed);
    await page.keyboard.down('KeyW'); await page.waitForTimeout(300); await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyF');
    let log = [];
    for (let i = 0; i < 30; i++) { await page.waitForTimeout(150); log.push(await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, c = H.VEH.list.find(v => v.abandoned); const d = c ? Math.hypot(c.x - H.PF().x, c.z - H.PF().z).toFixed(1) : '-'; return `${Math.round(H.HERO.hp)}${p.rag ? 'R' : ''}${H.G.down ? 'D' : ''}/${d}`; })); }
    console.log(`bail @${speed} m/s:`, log.join(' '));
    await page.waitForTimeout(4500);
    await page.evaluate(() => { const H = window.__havoc; if (H.G.onFoot) H.toggleVehicle(); });
    await page.waitForTimeout(2500);
  }
  await browser.close();
})();
