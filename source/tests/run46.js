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
  for (const P of [A, B]) { await P.goto('file://' + SP + '/test/index.html'); await P.waitForTimeout(800); await P.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low', time: 'day', police: 'off' })); await P.click('.mapcard[data-map="neon"]'); await P.click('#playBtn'); }
  await A.waitForTimeout(4500);
  // put B's car in front of A so the bubble is on screen
  const ap = await A.evaluate(() => { const P = window.__havoc.G.player; return { x: P.x, z: P.z, h: P.h }; });
  await B.evaluate(a => { const P = window.__havoc.G.player; P.place(a.x + Math.sin(a.h) * 14, a.z + Math.cos(a.h) * 14, a.h + Math.PI, 0); }, ap);
  console.log('chat button visible', await A.evaluate(() => !document.querySelector('#chat').hidden && !document.querySelector('#chatBtn').hidden));
  await B.keyboard.press('KeyT'); await B.waitForTimeout(300);
  console.log('B chat open', await B.evaluate(() => JSON.stringify({ open: window.__havoc.NET && !document.querySelector('#chatForm').hidden, focus: document.activeElement && document.activeElement.id })));
  await B.keyboard.type('hello from B wasd'); await B.keyboard.press('Enter'); await B.waitForTimeout(300);
  console.log('B moved while typing?', await B.evaluate(() => +window.__havoc.G.player.speed.toFixed(2)));
  await A.waitForTimeout(1500);
  console.log('A log', await A.evaluate(() => [...document.querySelectorAll('#chatLog .chatRow')].map(r => r.textContent).join(' | ')));
  console.log('A bubble', await A.evaluate(() => { const b = document.querySelector('.ntag .bubble'); return b ? b.textContent + ' visible=' + !b.hidden : 'none'; }));
  await A.screenshot({ path: SP + '/test/c-A-chat.png' });
  // A replies with a quick message chip
  await A.click('#chatBtn'); await A.waitForTimeout(300);
  await A.click('#chatQuick button:nth-child(2)'); await A.waitForTimeout(1500);
  console.log('B log', await B.evaluate(() => [...document.querySelectorAll('#chatLog .chatRow')].map(r => r.textContent).join(' | ')));
  // Esc closes the box without pausing
  await A.keyboard.press('Enter'); await A.waitForTimeout(200); await A.keyboard.press('Escape'); await A.waitForTimeout(200);
  console.log('A after Esc', await A.evaluate(() => JSON.stringify({ formHidden: document.querySelector('#chatForm').hidden, paused: !document.querySelector('#pause').hidden })));
  await B.screenshot({ path: SP + '/test/c-B-chat.png' });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
