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
  // A plays alone first and knocks down two buildings and a gas station
  await start(A); await A.waitForTimeout(3500);
  const fell = await A.evaluate(() => { const H = window.__havoc, out = []; for (const s of H.STR.list) { if (s.kind === 'bldg' && out.length < 2 && s.top - s.y0 > 10) { s.hp = 1; H.damageStructsAt((s.x0 + s.x1) / 2, s.y0 + 2, (s.z0 + s.z1) / 2, 1, 'hero'); out.push(H.STR.list.indexOf(s)); } } const st = H.SHOP.list[0]; const W = H.getW(); const p = W.props.find(q => q.type === 'pump' && Math.hypot(q.x - st.gx, q.z - st.gz) < 16 && q.st === 0); p.st = 3; H.pumpBlast(p, 'hero'); return out; });
  console.log('A knocked down', JSON.stringify(fell));
  await A.waitForTimeout(2500);
  // B joins late
  await start(B);
  const ok = await waitFor(B, f => { const H = window.__havoc; return H.STR.list.length && f.every(i => H.STR.list[i] && H.STR.list[i].state > 0); }, 30000, fell);
  console.log('late joiner sees fallen buildings', ok, await B.evaluate(f => { const H = window.__havoc; return JSON.stringify({ states: f.map(i => H.STR.list[i].state), stationBlown: H.SHOP.list[0].blown, wrecked: H.STR.list.filter(s => s.state && s.station).length }); }, fell));
  await waitFor(B, () => window.__havoc.NET.players.size > 0 && [...window.__havoc.NET.players.values()][0].av, 15000);
  // smoothness: A drives a steady circle, B samples where it draws A
  await A.evaluate(() => { const v = window.__havoc.G.player; v.place(v.x, v.z, v.h, 14); window.__circ = setInterval(() => { v.input.throttle = 0.6; v.input.steer = 0.5; }, 16); });
  await B.waitForTimeout(2500);
  const smooth = await B.evaluate(() => new Promise(res => { const H = window.__havoc, N = [...H.NET.players.values()][0], pts = []; let n = 0; const f = () => { pts.push([N.x, N.z, performance.now()]); if (++n < 90) requestAnimationFrame(f); else { let jerk = 0, steps = 0, back = 0; for (let i = 2; i < pts.length; i++) { const ax = pts[i][0] - 2 * pts[i - 1][0] + pts[i - 2][0], az = pts[i][1] - 2 * pts[i - 1][1] + pts[i - 2][1]; jerk = Math.max(jerk, Math.hypot(ax, az)); const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); steps = Math.max(steps, d); } res(JSON.stringify({ frames: pts.length, maxSecondDiff: +jerk.toFixed(3), maxStep: +steps.toFixed(3), buf: N.buf ? N.buf.length : 0, off: Math.round(N.off) })); } }; f(); }));
  console.log('B smoothness', smooth);
  await A.evaluate(() => clearInterval(window.__circ));
  // ram: B parked, A drives into it at speed
  await B.evaluate(() => { const v = window.__havoc.G.player; v.place(v.x, v.z, v.h, 0); window.__b0 = [v.x, v.z, v.health]; });
  await A.waitForTimeout(800);
  const bp = await B.evaluate(() => { const v = window.__havoc.G.player; return { x: v.x, z: v.z, h: v.h }; });
  await A.evaluate(b => { const v = window.__havoc.G.player; const h = b.h; v.place(b.x - Math.sin(h) * 9, b.z - Math.cos(h) * 9, h, 22); window.__ram = setInterval(() => { v.input.throttle = 1; v.input.steer = 0; }, 16); }, bp);
  for (let k = 0; k < 6; k++) { await A.waitForTimeout(500); console.log('  A->B', await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0], v = H.G.player; return JSON.stringify({ d: +Math.hypot(v.x - N.x, v.z - N.z).toFixed(1), sp: +v.speed.toFixed(1), av: !!N.av && N.avKind, inList: H.VEH.list.includes(N.av), ay: N.av && +N.av.y.toFixed(2), my: +v.y.toFixed(2) }); })); }
  await A.evaluate(() => clearInterval(window.__ram));
  console.log('A sent', await A.evaluate(() => JSON.stringify(window.__havoc.NET.fx.map(f => f.e[1]))));
  console.log('ram: B moved by', await B.evaluate(() => { const v = window.__havoc.G.player; return JSON.stringify({ moved: +Math.hypot(v.x - window.__b0[0], v.z - window.__b0[1]).toFixed(1), hp: Math.round(v.health) + '/' + Math.round(window.__b0[2]) }); }));
  // run over: B on foot, A drives through
  await B.evaluate(() => { const H = window.__havoc; window.__bh = H.G.player.h; H.G.player.vx = H.G.player.vz = 0; H.toggleVehicle(); });
  await B.waitForTimeout(1500);
  const hp0 = await B.evaluate(() => window.__havoc.HERO.hp);
  const fp = await B.evaluate(() => { const p = window.__havoc.HERO.p; return { x: p.x, z: p.z, h: window.__bh }; });
  await A.evaluate(b => { const v = window.__havoc.G.player; v.place(b.x - Math.sin(b.h) * 9, b.z - Math.cos(b.h) * 9, b.h, 16); window.__ram = setInterval(() => { v.input.throttle = 1; v.input.steer = 0; }, 16); }, fp);
  await A.waitForTimeout(3500); await A.evaluate(() => clearInterval(window.__ram));
  console.log('run over: B hp', hp0, '->', await B.evaluate(() => window.__havoc.HERO.hp), 'down', await B.evaluate(() => window.__havoc.G.down));
  // A on a motorbike: B sees a bike with a rider
  await A.evaluate(() => { const H = window.__havoc, o = H.G.player; o.vx = o.vz = o.av = 0; const v = new H.Vehicle(Object.assign({}, o.cfg, { body: 'bike' }), 'parked'); v.place(o.x + Math.cos(o.h) * 5, o.z - Math.sin(o.h) * 5, o.h, 0); H.VEH.list.push(v); H.toggleVehicle(); H.enterVehicle(v); });
  await A.waitForTimeout(1200); await B.waitForTimeout(800);
  console.log('B sees bike', await B.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0], v = N && N.av; return JSON.stringify({ kind: N && N.avKind, bike: !!(v && v.bike), rider: !!(v && v.model && v.model.rider && v.model.rider.visible), aG: !!window.__havoc.G }); }));
  console.log("A state", await A.evaluate(() => { const H = window.__havoc; return JSON.stringify({ onFoot: H.G.onFoot, bike: !!(H.G.player && H.G.player.bike), down: H.G.down }); }));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
