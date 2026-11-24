const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2000);
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(-108, 60, 0, 0); P.vz = 20; });
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await page.keyboard.down('Space');
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(150); console.log(await page.evaluate(() => { const H = window.__havoc, P = H.G.player; return `slip ${P.slip.toFixed(1)} vf ${P.vf.toFixed(1)} hand ${P.input.hand} skidI ${H.SKID.i} skid ${!!P.skid}`; })); }
  await page.keyboard.up('Space'); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.CAM.free = [[P.x + 6, P.y + 9, P.z - 8], [P.x, 0, P.z]]; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SP + '/test/a4-skids.png' });
  await browser.close();
})();
