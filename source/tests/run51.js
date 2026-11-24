const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mock = fs.readFileSync(SP + '/test/mockroom.js', 'utf8');
  const errs = [];
  const mk = async tag => {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } }); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(tag + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error') errs.push(tag + ' ' + m.text()); });
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.addInitScript(mock);
    return page;
  };
  const A = await mk('A'), B = await mk('B');
  const relay = (from, to) => from.exposeFunction('__netOut', msg => { to.evaluate(m => window.__netIn && window.__netIn(m), msg).catch(() => { }); });
  await relay(A, B); await relay(B, A);
  for (const P of [A, B]) { await P.goto('file://' + SP + '/test/index.html'); await P.waitForTimeout(800); await P.evaluate(() => Object.assign(window.__havoc.settings, { map: 'perth', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low', time: 'day', police: 'off' })); }
  await A.evaluate(() => { const i = document.querySelector('#onName'); if (i) { i.value = 'Alice'; i.dispatchEvent(new Event('input')); } window.__havoc.NET.nick = 'Alice'; });
  await A.click('.mapcard[data-map="perth"]'); await A.click('#playBtn');
  await B.waitForTimeout(6000);
  console.log('B menu cards', await B.evaluate(() => [...document.querySelectorAll('.mapcard')].map(c => c.dataset.map + ': ' + ((c.querySelector('.mcount') && !c.querySelector('.mcount').hidden) ? c.querySelector('.mcount').textContent : '-')).join(' | ')));
  await B.screenshot({ path: SP + '/test/k-menu-counts.png' });
  // A goes back to the menu: should no longer count
  await A.keyboard.press('Escape'); await A.waitForTimeout(300); await A.evaluate(() => document.querySelector('#pQuit').click()); await B.waitForTimeout(2500);
  console.log('after A quits', await B.evaluate(() => [...document.querySelectorAll('.mapcard')].map(c => c.dataset.map + ': ' + ((c.querySelector('.mcount') && !c.querySelector('.mcount').hidden) ? c.querySelector('.mcount').textContent : '-')).join(' | ')));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
