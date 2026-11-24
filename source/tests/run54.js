// parachute diagnostics: free fall, canopy, steering, cars/explosions below, roof walk-off, web-swing bail, landing
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'nyc', TAG = process.argv[4] || 'pa';
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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', trafficDensity: 30, pedDensity: 20, police: 'off', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  const ev = (fn, a) => page.evaluate(fn, a);
  const log = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v));
  // per-frame recorder
  await ev(() => {
    const H = window.__havoc; window.__rec = [];
    const tick = () => { const p = H.HERO.p, c = window.__cam || null; if (window.__recOn && p) { const ch = H.PLANES.chute; window.__rec.push({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), h: +p.h.toFixed(2), vy: +(H.HERO.vy || 0).toFixed(1), rag: !!p.rag, ch: H.HERO.chute ? (H.HERO.chute.free ? 'free' : 'open') : '-', hp: Math.round(H.HERO.hp), cv: ch ? ch.visible : null, cdx: ch && ch.visible ? +(ch.position.x - p.x).toFixed(2) : 0, cdz: ch && ch.visible ? +(ch.position.z - p.z).toFixed(2) : 0, camY: +H.CAM.y.toFixed(1) }); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const rec = async (ms) => { await ev(() => { window.__rec = []; window.__recOn = true; }); await page.waitForTimeout(ms); return ev(() => { window.__recOn = false; return window.__rec; }); };
  const jumps = r => { let mx = 0; for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i].x - r[i - 1].x, r[i].z - r[i - 1].z); if (d > mx) mx = d; } return +mx.toFixed(2); };
  const bail = (alt) => ev((alt) => { const H = window.__havoc; const pl = H.PLANES.list.find(q => q.type === 'sparrow' && !q.wreck) || H.PLANES.list[0]; if (!H.G.onFoot) H.toggleVehicle(); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = H.heightAt(pl.x, pl.z) + alt; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * 40, 0, Math.cos(pl.yaw) * 40); pl.T = 0.7; H.HERO.hp = 100; H.leavePlane(); return { chute: H.HERO.chute, y: H.HERO.p.y }; }, alt);

  // A: bail out high up -> free fall
  log('A bail', await bail(240));
  let r = await rec(1500); log('A freefall', { n: r.length, first: r[0], last: r[r.length - 1], maxStep: jumps(r) });
  await page.screenshot({ path: `${SP}/test/${TAG}-1-free.png` });
  // B: open the chute
  await page.keyboard.press('Space'); r = await rec(1200); log('B open', { last: r[r.length - 1], maxStep: jumps(r), canopyLag: Math.max(...r.map(q => Math.hypot(q.cdx, q.cdz))) });
  await page.screenshot({ path: `${SP}/test/${TAG}-2-open.png` });
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyA'); r = await rec(1500); await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW');
  log('B steer', { dh: +(r[r.length - 1].h - r[0].h).toFixed(2), maxStep: jumps(r), canopyLag: Math.max(...r.map(q => Math.hypot(q.cdx, q.cdz))) });
  await page.screenshot({ path: `${SP}/test/${TAG}-3-steer.png` });
  // C: a fast car directly below the parachutist
  log('C car', await ev(() => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(q => !q.remote && q !== H.G.player); if (!v) return 'no car'; v.x = p.x - 3; v.z = p.z; v.y = H.heightAt(v.x, v.z); v.h = Math.PI / 2; v.vx = 15; v.vz = 0; v.ai = null; window.__cv = v; return { carY: v.y, heroY: p.y }; }));
  r = await rec(700); log('C after', { rag: r.some(q => q.rag), hp: r[r.length - 1].hp, maxStep: jumps(r) });
  // D: explosion far below
  await ev(() => { const H = window.__havoc, p = H.HERO.p; if (p.rag) { p.rag = null; } H.HERO.chute = { t: 1 }; H.HERO.hp = 100; H.explode(p.x + 2, H.heightAt(p.x, p.z) + 0.5, p.z, 1.4, null); });
  r = await rec(700); log('D blast below', { rag: r.some(q => q.rag), hp: r[r.length - 1].hp, ch: r[r.length - 1].ch });
  // E: landing under canopy from 25 m at speed
  await ev(() => { const H = window.__havoc, p = H.HERO.p; p.rag = null; p.y = H.heightAt(p.x, p.z) + 25; H.HERO.vy = -5; H.HERO.chute = { t: 1 }; H.HERO.hp = 100; });
  r = await rec(9000); log('E landing', { hp: r[r.length - 1].hp, ch: r[r.length - 1].ch, minVy: Math.min(...r.map(q => q.vy)) });
  // F: late opening from terminal velocity at 30 m
  await ev(() => { const H = window.__havoc, p = H.HERO.p; p.rag = null; p.y = H.heightAt(p.x, p.z) + 30; H.HERO.vy = -38; H.HERO.chute = { t: 0, free: true }; H.HERO.hp = 100; H.deployChute(); });
  r = await rec(4000); log('F late open 30m', { hp: r[r.length - 1].hp, ch: r[r.length - 1].ch, dead: r.some(q => q.hp <= 0) });
  await page.waitForTimeout(6000);
  // G: step off a tall roof
  log('G roof', await ev(() => { const H = window.__havoc, W = H.getW(); let best = null; const bs = []; W.boxGrid.query(-400, -400, 400, 400, bs); for (const b of bs) if ((b.x1 - b.x0) > 8 && (b.z1 - b.z0) > 8 && (!best || b.h > best.h)) best = b; const p = H.HERO.p; p.rag = null; H.HERO.chute = null; H.HERO.hp = 100; p.x = best.x1 + 0.6; p.z = (best.z0 + best.z1) / 2; p.y = best.h; p.h = Math.PI / 2; H.HERO.vy = 0; return { h: best.h }; }));
  await page.waitForTimeout(1500);
  log('G falling', await ev(() => { const H = window.__havoc; return { y: +H.HERO.p.y.toFixed(1), vy: +H.HERO.vy.toFixed(1), chute: H.HERO.chute, can: H.canDeploy() }; }));
  await page.screenshot({ path: `${SP}/test/${TAG}-4-roofdrop.png` });
  await page.keyboard.press('Space'); await page.waitForTimeout(1500);
  log('G after space', await ev(() => { const H = window.__havoc; return { chute: H.HERO.chute, y: +H.HERO.p.y.toFixed(1) }; }));
  await page.screenshot({ path: `${SP}/test/${TAG}-5-roofchute.png` });
  // landing: the canopy should sag and fade, not pop
  await ev(() => { const H = window.__havoc, p = H.HERO.p; p.y = H.heightAt(p.x, p.z) + 3; H.HERO.vy = -4; });
  for (let k = 0; k < 40; k++) { const st = await ev(() => ({ c: !!window.__havoc.HERO.chute, d: !!window.__havoc.HERO.chuteDrop })); if (!st.c) break; await page.waitForTimeout(100); }
  await page.waitForTimeout(250); await page.screenshot({ path: `${SP}/test/${TAG}-6-landed.png` });
  log('G landed', await ev(() => { const H = window.__havoc; return { hp: Math.round(H.HERO.hp), drop: H.HERO.chuteDrop && +H.HERO.chuteDrop.t.toFixed(2), vis: H.PLANES.chute.visible }; }));
  // H: web-swing bail high up
  log('H web', await ev(() => { const H = window.__havoc, p = H.HERO.p; p.rag = null; H.HERO.chute = null; H.HERO.hp = 100; p.y = H.heightAt(p.x, p.z) + 80; H.HERO.fly = true; H.HERO.web = null; H.HERO.wv = { x: 6, y: -3, z: 0 }; return { can: H.canDeploy() }; }));
  await page.keyboard.press('Space'); await page.waitForTimeout(300);
  log('H after space', await ev(() => { const H = window.__havoc; return { chute: H.HERO.chute, fly: H.HERO.fly }; }));
  await page.waitForTimeout(800); await page.screenshot({ path: `${SP}/test/${TAG}-7-webchute.png` });
  log('errors', errs.length + ' ' + errs.slice(0, 4).join('\n'));
  await browser.close();
})();
