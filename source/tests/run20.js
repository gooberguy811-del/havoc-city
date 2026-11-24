const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  await page.keyboard.press('Digit3'); await page.waitForTimeout(800);
  await page.keyboard.down('KeyQ');
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(250); console.log(await page.evaluate(() => { const A = window.__havoc.ARMS, H = window.__havoc; return JSON.stringify({ trig: A.trigger, cool: +A.cool.toFixed(2), reload: A.reloadT, mag: A.mag[A.cur], cur: A.cur, onFoot: H.G.onFoot, player: !!H.G.player, paused: false }); })); }
  await page.keyboard.up('KeyQ');
  await browser.close();
})();
