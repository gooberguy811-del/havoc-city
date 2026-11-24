// stores: placement, buy menu, jewel smash, bank robbery, mechanic, disguise, rubble hitbox
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'low', trafficDensity: 0, pedDensity: 0, police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(3500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  console.log(await page.evaluate(() => { const b = document.querySelector('#pFriends'), r = b && b.getBoundingClientRect(); return JSON.stringify({ paused: !document.querySelector('#pause').hidden, exists: !!b, rect: r && [r.x, r.y, r.width, r.height], disp: b && getComputedStyle(b).display, friendsHidden: document.querySelector('#friends').hidden }); }));
  await page.click('#pFriends', { timeout: 5000 }).catch(e => console.log('click fail', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  console.log(await page.evaluate(() => JSON.stringify({ friendsHidden: document.querySelector('#friends').hidden, text: document.querySelector('#friends').innerText.slice(0, 200) })));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
