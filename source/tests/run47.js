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
  await A.keyboard.press('Escape'); await A.waitForTimeout(300); await A.evaluate(() => document.querySelector('#pFriends').click()); await A.waitForTimeout(1800);
  console.log('A panel', await A.evaluate(() => [...document.querySelectorAll('#frHere .frRow, #frList .frRow, #frList p')].map(r => r.textContent).join(' | ')));
  await A.screenshot({ path: SP + '/test/fr-A-panel.png' });
  await A.evaluate(() => document.querySelector('#frHere button.primary').click()); await A.waitForTimeout(1500);
  console.log('B toast', await B.evaluate(() => JSON.stringify({ shown: !document.querySelector('#frReq').hidden, text: document.querySelector('#frReqText').textContent })));
  await B.screenshot({ path: SP + '/test/fr-B-toast.png' });
  await B.evaluate(() => document.querySelector('#frYes').click()); await A.waitForTimeout(1800);
  console.log('lists', await A.evaluate(() => JSON.stringify(Object.values(JSON.parse(localStorage.getItem('havoc.friends') || '{}')).map(f => f.name))), await B.evaluate(() => JSON.stringify(Object.values(JSON.parse(localStorage.getItem('havoc.friends') || '{}')).map(f => f.name))));
  console.log('A panel after', await A.evaluate(() => [...document.querySelectorAll('#frList .frRow')].map(r => r.textContent).join(' | ')));
  await A.evaluate(() => document.querySelector('#frClose').click()); await A.keyboard.press('Escape'); await A.waitForTimeout(500);
  // put B in front of A and check the friend tag, then try to hurt them
  const ap = await A.evaluate(() => { const P = window.__havoc.G.player; return { x: P.x, z: P.z, h: P.h }; });
  await B.evaluate(a => { const H = window.__havoc, P = H.G.player; P.place(a.x + Math.sin(a.h) * 14, a.z + Math.cos(a.h) * 14, a.h + Math.PI, 0); P.vx = P.vz = 0; H.toggleVehicle(); }, ap);
  await A.waitForTimeout(2000);
  console.log('friend tag', await A.evaluate(() => !!document.querySelector('.ntag.friend')));
  await A.screenshot({ path: SP + '/test/fr-A-tag.png' });
  const hp0 = await B.evaluate(() => window.__havoc.HERO.hp);
  await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0]; H.NET.hits.set(N.peer, 0); });
  await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0]; for (let k = 0; k < 5; k++) H.netHit ? H.netHit(N, 30) : 0; });
  await A.waitForTimeout(1500);
  console.log('friend hurt? hp', hp0, '->', await B.evaluate(() => window.__havoc.HERO.hp));
  // go to friend: move B far away, A uses Join/Go to
  await B.evaluate(() => { const p = window.__havoc.HERO.p; p.x += 120; p.z += 0; });
  await A.waitForTimeout(1500);
  await A.keyboard.press('Escape'); await A.waitForTimeout(300); await A.evaluate(() => document.querySelector('#pFriends').click()); await A.waitForTimeout(800);
  await A.evaluate(() => document.querySelector('#frList .frRow button.primary').click()); await A.waitForTimeout(1500);
  console.log('after Go to: distance', await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0], F = H.PF(); return Math.round(Math.hypot(F.x - N.x, F.z - N.z)); }), 'paused', await A.evaluate(() => !document.querySelector('#pause').hidden));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
