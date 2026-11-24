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
  for (const P of [A, B]) { await P.goto('file://' + SP + '/test/index.html'); await P.waitForTimeout(800); await P.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low', time: 'day' })); await P.click('.mapcard[data-map="neon"]'); await P.click('#playBtn'); }
  await A.waitForTimeout(4000);
  const info = P => P.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0]; return JSON.stringify({ on: H.NET.on, room: H.NET.R && H.NET.R.name, me: H.NET.me, players: H.NET.players.size, other: N ? { name: N.name, kind: N.avKind, md: N.s && N.s.md, x: Math.round(N.x), z: Math.round(N.z) } : null, chip: document.querySelector('#netchip').textContent, remoteCars: H.getW() ? 0 : 0 }); });
  console.log('A', await info(A)); console.log('B', await info(B));
  // put B's car 18 m ahead of A's car
  const ap = await A.evaluate(() => { const P = window.__havoc.G.player; return { x: P.x, z: P.z, h: P.h }; });
  await B.evaluate(a => { const P = window.__havoc.G.player; P.place(a.x + Math.sin(a.h) * 18, a.z + Math.cos(a.h) * 18, a.h + Math.PI, 0); }, ap);
  await A.waitForTimeout(1500);
  console.log('A sees car', await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0], v = N && N.av; return JSON.stringify({ kind: N && N.avKind, inVEH: H.getW() && v ? true : false, remote: !!(v && v.remote), dist: v ? Math.round(Math.hypot(v.x - H.G.player.x, v.z - H.G.player.z)) : null, tag: !document.querySelector('.ntag').hidden }); }));
  await A.screenshot({ path: SP + '/test/n-A-car.png' });
  // B gets out; A gets out and shoots B
  await B.keyboard.press('KeyF'); await A.keyboard.press('KeyF'); await A.waitForTimeout(1500);
  console.log('A sees foot', await A.evaluate(() => { const N = [...window.__havoc.NET.players.values()][0]; return JSON.stringify({ kind: N.avKind, active: N.av && N.av.active, remote: !!(N.av && N.av.remote) }); }));
  await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0], p = H.HERO.p; p.h = Math.atan2(N.x - p.x, N.z - p.z); });
  const hp0 = await B.evaluate(() => window.__havoc.HERO.hp);
  await A.keyboard.press('Digit2'); await A.keyboard.down('KeyQ'); await A.waitForTimeout(2500); await A.keyboard.up('KeyQ');
  await A.waitForTimeout(800);
  console.log('B hp', hp0, '->', await B.evaluate(() => Math.round(window.__havoc.HERO.hp)));
  await A.screenshot({ path: SP + '/test/n-A-shoot.png' });
  // finish B off
  await B.evaluate(() => { window.__havoc.HERO.hp = 5; });
  await A.keyboard.down('KeyQ'); await A.waitForTimeout(1500); await A.keyboard.up('KeyQ'); await A.waitForTimeout(800);
  console.log('B down', await B.evaluate(() => JSON.stringify({ down: window.__havoc.G.down > 0, sub: document.querySelector('#bannerSub').textContent })), 'A feed', await A.evaluate(() => [...document.querySelectorAll('#feed .msg')].map(m => m.textContent).join(' | ')));
  await B.screenshot({ path: SP + '/test/n-B-down.png' });
  // shared explosion + collapse from A
  await A.waitForTimeout(4500);
  const boom0 = await B.evaluate(() => window.__havoc.BOOM.balls.length);
  const idx = await A.evaluate(() => { const H = window.__havoc, P = H.PF(); H.explode(P.x + 25, 1, P.z, 1.35, 'hero'); let best = -1, bd = 1e9; H.STR.list.forEach((s, i) => { if (s.kind !== 'bldg' || s.state) return; const d = Math.hypot((s.x0 + s.x1) / 2 - P.x, (s.z0 + s.z1) / 2 - P.z); if (d < bd) { bd = d; best = i; } }); const s = H.STR.list[best]; s.hp = 1; H.damageStructsAt((s.x0 + s.x1) / 2, s.y0 + 2, (s.z0 + s.z1) / 2, 1.35, 'hero'); return best; });
  await B.waitForTimeout(1500);
  console.log('B sees boom', boom0, '->', await B.evaluate(() => window.__havoc.BOOM.balls.length), 'collapse', idx, await B.evaluate(i => window.__havoc.STR.list[i].state, idx));
  // B takes a plane: A should see it
  for (let k = 0; k < 40; k++) { await B.waitForTimeout(800); if (!(await B.evaluate(() => window.__havoc.G.down > 0))) break; }
  await B.waitForTimeout(800); await B.keyboard.press('KeyF'); await B.waitForTimeout(800);
  await B.evaluate(() => { const H = window.__havoc; if (H.G.onFoot) { const pl = H.PLANES.list.find(p => !p.remote && !p.wreck); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z - 3; H.enterPlane(pl); pl.ground = false; pl.y = 60; pl.T = 1; pl.V.set(Math.sin(pl.yaw) * 40, 0, Math.cos(pl.yaw) * 40); } });
  await A.waitForTimeout(2500);
  await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0]; if (H.HERO.p && N.av) { const p = H.HERO.p; p.x = N.x - 40; p.z = N.z - 10; H.CAM.h = Math.atan2(N.x - p.x, N.z - p.z); p.h = H.CAM.h; } });
  await A.waitForTimeout(1200); await A.screenshot({ path: SP + '/test/n-A-plane.png' });
  console.log('A sees plane', await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0]; return JSON.stringify({ kind: N.avKind, inList: H.PLANES.list.includes(N.av), y: N.av && Math.round(N.av.y), md: N.s.md }); }));
  console.log('A chip', await A.evaluate(() => document.querySelector('#netchip').textContent));
  console.log('presence bytes', await A.evaluate(() => JSON.stringify(window.__havoc.netState()).length));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
