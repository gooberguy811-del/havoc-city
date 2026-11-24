const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/export/Havoc-City.html'); await page.waitForTimeout(1500);
  console.log('title', await page.title(), '| online panel', await page.evaluate(() => !document.querySelector('#online').hidden));
  await page.screenshot({ path: SP + '/test/x-menu.png' });
  await page.click('#playBtn'); await page.waitForTimeout(4000);
  console.log('in game', await page.evaluate(() => !document.querySelector('#hud').hidden), 'errors', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
})();
