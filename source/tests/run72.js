// multiplayer under the platform's real presence limits, through every vehicle type on the base map
const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2], MAP = process.argv[3] || 'base';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mock = fs.readFileSync(SP + '/test/mockroom-strict.js', 'utf8');
  const errs = [];
  const mk = async tag => {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } }); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(tag + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
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
  const start = async P => { await P.goto('file://' + SP + '/test/index.html'); await P.waitForTimeout(800); await P.evaluate(m => Object.assign(window.__havoc.settings, { map: m, trafficDensity: 30, pedDensity: 30, slowmo: 'off', quality: 'low', time: 'day', police: 'normal' }), MAP); await P.click(`.mapcard[data-map="${MAP}"]`); await P.click('#playBtn'); };
  const waitFor = async (P, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await P.evaluate(fn, arg)) return true; await P.waitForTimeout(250); } return false; };
  await start(A); await A.waitForTimeout(1500); await start(B);
  await waitFor(B, () => window.__havoc.NET.players.size > 0, 20000);
  const seen = async label => {
    const a = await A.evaluate(() => { const H = window.__havoc, s = H.netState(); return { md: s.md, x: s.x, z: s.z, stats: window.__roomStats }; });
    await B.waitForTimeout(1200);
    const b = await B.evaluate(() => { const N = [...window.__havoc.NET.players.values()][0]; return N ? { md: N.md || (N.s && N.s.md), x: Math.round(N.x), z: Math.round(N.z), av: N.avKind || !!N.av } : null; });
    console.log(label.padEnd(10), 'A', JSON.stringify({ md: a.md, x: Math.round(a.x), z: Math.round(a.z) }), 'B sees', JSON.stringify(b), 'A stats', JSON.stringify(a.stats));
  };
  await seen('car');
  await A.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
  await A.waitForTimeout(800); await seen('foot');
  // tank
  const tk = await A.evaluate(() => { const H = window.__havoc; const v = H.VEH.list.find(v => v.tank); if (!v) return 'no tank'; const p = H.HERO.p; p.x = v.x + 3; p.z = v.z; H.enterVehicle(v); return 'ok'; });
  await A.waitForTimeout(800); await seen('tank ' + tk);
  // tank shells at buildings for destruction
  await A.evaluate(() => { const H = window.__havoc; for (let i = 0; i < 60; i++) { const s = H.STR.list[i * 7 % H.STR.list.length]; if (s) H.damageStructsAt && H.damageStructsAt((s.x0 + s.x1) / 2, 5, (s.z0 + s.z1) / 2, 40, 9999, true); } });
  await A.waitForTimeout(1500); await seen('destroyed');
  // military heli
  const hl = await A.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const pl = H.PLANES.list.find(p => p.type === 'hornet' || p.type === 'mule') || H.PLANES.list[0]; if (!pl) return 'no heli'; H.enterPlane(pl); return pl.type + ' spot ' + !!pl.spot; });
  await A.waitForTimeout(800); await seen('heli ' + hl);
  await A.evaluate(() => { const H = window.__havoc; H.leavePlane && H.leavePlane(); });
  await A.waitForTimeout(500);
  // chat + skydive
  await A.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const p = H.HERO.p; p.y = 300; H.HERO.chute = { t: 0, free: true }; });
  await A.waitForTimeout(800); await seen('skydive');
  console.log('B stats', JSON.stringify(await B.evaluate(() => window.__roomStats)));
  console.log('errors', errs.length, errs.slice(0, 8).join('\n'));
  await browser.close();
})();
