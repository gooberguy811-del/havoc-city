// the Roadster: locked in the garage at first, then shown once unlocked
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(900);
  await page.click('#garageBtn'); await page.waitForTimeout(800);
  console.log('locked tile:', await page.evaluate(() => [...document.querySelectorAll('#garage button')].map(b => b.textContent).find(t => /Roadster/.test(t)) || 'none'));
  await page.evaluate(() => { const H = window.__havoc; H.MIS.unlocked.roadster = true; });
  await page.evaluate(() => { const b = [...document.querySelectorAll('#garage button')].find(b => /Roadster/.test(b.textContent)); if (b) b.click(); });
  await page.waitForTimeout(400); await page.evaluate(() => { const b = [...document.querySelectorAll('#garage button')].find(b => /Roadster/.test(b.textContent)); if (b) b.click(); });
  await page.waitForTimeout(1200);
  console.log('selected body:', await page.evaluate(() => JSON.parse(localStorage.getItem('havoc.car') || '{}').body));
  await page.screenshot({ path: SP + '/test/roadster-garage.png' });
  console.log('errors', errs.length, errs.slice(0, 3));
  await browser.close();
})();
