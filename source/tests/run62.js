// the airport: walk-in terminal, travellers, jet bridges, airliners, fly-by
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon', TAG = process.argv[4] || 'ap';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/net::/.test(m.text())) errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 20, pedDensity: 30, police: 'off', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4500);
  const ev = (fn, a) => page.evaluate(fn, a);
  const P = await ev(() => { const A = window.__havoc.getW().airport.site; return A; });
  const pt = (u, v) => [P.ox + u * P.ux + v * P.vx, P.oz + u * P.uz + v * P.vz];
  const shot = async (name, from, to) => { await ev(c => { window.__havoc.CAM.free = c; }, [from, to]); await page.waitForTimeout(1400); await page.screenshot({ path: `${SP}/test/${TAG}-${name}.png` }); };
  // walk the hero to the kerb and into the terminal so travellers spawn
  await ev(([x, z]) => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const p = H.HERO.p; p.x = x; p.z = z; p.y = 0; }, pt(0, 10));
  await page.waitForTimeout(1500);
  const [fx, fz] = pt(-30, -25), [lx, lz] = pt(0, 30); await shot('1-front', [fx, 14, fz], [lx, 4, lz]);
  await ev(([x, z]) => { const p = window.__havoc.HERO.p; p.x = x; p.z = z; }, pt(0, 22));
  await page.waitForTimeout(2500);
  console.log('inside', await ev(() => { const H = window.__havoc; return JSON.stringify({ peds: H.TERM.peds.length, st: !!H.TERM.st }); }));
  await ev(() => { window.__havoc.CAM.free = null; });
  await page.waitForTimeout(800); await page.screenshot({ path: `${SP}/test/${TAG}-2-inside.png` });
  const [ix, iz] = pt(-45, 19), [jx, jz] = pt(10, 34); await shot('3-hall', [ix, 3.2, iz], [jx, 3, jz]);
  const [ax, az] = pt(-20, 140), [bx, bz] = pt(-10, 60); await shot('4-gates', [ax, 22, az], [bx, 2, bz]);
  // can we walk out through the door?
  await ev(() => { window.__havoc.CAM.free = null; });
  const walk = await ev(async ([x, z, h]) => { const H = window.__havoc, p = H.HERO.p; p.x = x; p.z = z; p.h = h; return true; }, [...pt(0, 30), Math.atan2(-P.vx, -P.vz)]);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3500); await page.keyboard.up('KeyW');
  console.log('walked out', await ev(([ox, oz, vx, vz]) => { const p = window.__havoc.HERO.p; return Math.round((p.x - ox) * vx + (p.z - oz) * vz); }, [P.ox, P.oz, P.vx, P.vz]), '(v; < 16 means outside the front wall)');
  // fly-by
  await ev(() => { const H = window.__havoc; H.ATC.wait = 0.01; H.ATC.dir = -1; });
  for (let k = 0; k < 40; k++) { const s = await ev(() => { const A = window.__havoc.ATC; return A.wait <= 0 ? -1800 + A.t * 72 : null; }); if (s !== null && s > -500) break; await page.waitForTimeout(500); }
  const m = await ev(() => { const m = window.__havoc.ATC.m; return [m.position.x, m.position.y, m.position.z]; });
  await shot('5-flyby', [m[0] + 60, m[1] + 15, m[2] + 70], [m[0], m[1], m[2]]);
  console.log('flyby', JSON.stringify(m.map(Math.round)));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
