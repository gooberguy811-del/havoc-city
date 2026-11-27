// the settings panel with the new Time of day and Weather rows, at desktop and phone widths
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[1100, 700], [390, 844]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(900);
    await page.evaluate(() => window.__havoc.openSettings());
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('lbl-weather').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    console.log(w, 'overflowing rows:', await page.evaluate(() => [...document.querySelectorAll('#setBody .seg')].filter(s => s.scrollWidth > s.clientWidth + 2 || s.getBoundingClientRect().right > innerWidth + 1).map(s => s.getAttribute('aria-labelledby')).join(',') || 'none'), '| page scrolls sideways:', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await page.screenshot({ path: `${SP}/test/settings-${w}.png` });
  }
  await browser.close();
})();
