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

  // real bail-out: fly for a moment so the camera is settled, then jump
  await ev(() => { const H = window.__havoc; const pl = H.PLANES.list.find(q => q.type === 'sparrow' && !q.wreck); H.toggleVehicle(); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = H.heightAt(pl.x, pl.z) + 260; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * 40, 0, Math.cos(pl.yaw) * 40); pl.T = 0.7; });
  await page.waitForTimeout(2500);
  await page.keyboard.press('KeyF');
  for (let k = 0; k < 30; k++) { const vy = await ev(() => window.__havoc.HERO.vy); if (vy < -25) break; await page.waitForTimeout(200); }
  await page.screenshot({ path: `${SP}/test/${TAG}-a-free.png` });
  log('free', await ev(() => { const H = window.__havoc; return { y: Math.round(H.HERO.p.y), vy: Math.round(H.HERO.vy), camY: Math.round(H.CAM.y) }; }));
  await page.keyboard.down('KeyA'); await page.waitForTimeout(700); await page.screenshot({ path: `${SP}/test/${TAG}-b-freeturn.png` }); await page.keyboard.up('KeyA');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250); await page.screenshot({ path: `${SP}/test/${TAG}-c-opening.png` });
  for (let k = 0; k < 30; k++) { const t = await ev(() => window.__havoc.HERO.chute && window.__havoc.HERO.chute.t); if (t > 1.2) break; await page.waitForTimeout(200); }
  await page.screenshot({ path: `${SP}/test/${TAG}-d-open.png` });
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/${TAG}-e-turn.png` }); await page.keyboard.up('KeyD');
  log('open', await ev(() => { const H = window.__havoc; return { y: Math.round(H.HERO.p.y), vy: +H.HERO.vy.toFixed(1), bank: +H.HERO.chute.bank.toFixed(2) }; }));
  log('errors', errs.length + ' ' + errs.slice(0, 4).join('\n'));
  await browser.close();
})();
