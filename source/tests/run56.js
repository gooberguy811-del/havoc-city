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
  const start = async P => { await P.goto('file://' + SP + '/test/index.html'); await P.waitForTimeout(800); await P.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low', time: 'day', police: 'off' })); await P.click('.mapcard[data-map="neon"]'); await P.click('#playBtn'); };
  const waitFor = async (P, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await P.evaluate(fn, arg)) return true; await P.waitForTimeout(250); } return false; };
  await start(A); await start(B);
  await waitFor(B, () => window.__havoc.NET.players.size > 0 && [...window.__havoc.NET.players.values()][0].av, 20000);
  // both on foot, high in the air side by side; A sky-dives, B watches from just behind
  const setup = (P, dx, dz) => P.evaluate(([dx, dz]) => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const p = H.HERO.p; p.rag = null; p.x = 40 + dx; p.z = 40 + dz; p.y = 300; p.h = 0; H.HERO.vy = 0; H.HERO.chute = { t: 0, free: true }; }, [dx, dz]);
  await waitFor(A, () => window.__havoc.G.onFoot || (window.__havoc.toggleVehicle(), false), 3000);
  await waitFor(B, () => window.__havoc.G.onFoot || (window.__havoc.toggleVehicle(), false), 3000);
  await setup(A, 0, 0); await setup(B, 0, -9);
  const hold = setInterval(() => { A.evaluate(() => { const H = window.__havoc; H.HERO.p.y = Math.max(H.HERO.p.y, 280); }).catch(() => {}); B.evaluate(() => { const H = window.__havoc; H.HERO.p.y = Math.max(H.HERO.p.y, 280); H.HERO.p.x = 40; H.HERO.p.z = 31; }).catch(() => {}); }, 120);
  await B.waitForTimeout(2500); await B.screenshot({ path: `${SP}/test/mp-B-sees-free.png` });
  console.log('B sees A free', await B.evaluate(() => { const N = [...window.__havoc.NET.players.values()][0]; return JSON.stringify({ chs: N.chs, y: Math.round(N.y) }); }));
  await A.evaluate(() => window.__havoc.deployChute());
  await B.waitForTimeout(2500); await B.screenshot({ path: `${SP}/test/mp-B-sees-chute.png` });
  console.log('B sees A chute', await B.evaluate(() => { const N = [...window.__havoc.NET.players.values()][0]; return JSON.stringify({ chs: N.chs, vis: !!(N.chute && N.chute.visible) }); }));
  clearInterval(hold);
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
