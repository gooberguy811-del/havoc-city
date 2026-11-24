// Perth stadium: bowl, tunnels, field, players, drive in; airport door passable
const { chromium } = require('playwright');
const SP = process.argv[2], TAG = process.argv[3] || 'st', TIME = process.argv[4] || 'day';
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
  await page.evaluate(t => { Object.assign(window.__havoc.settings, { map: 'perth', quality: 'high', trafficDensity: 20, pedDensity: 30, police: 'off', time: t }); }, TIME);
  await page.click(`.mapcard[data-map="perth"]`); await page.click('#playBtn'); await page.waitForTimeout(4500);
  const ev = (fn, a) => page.evaluate(fn, a);
  const S = await ev(() => { const s = window.__havoc.getW().stadium; return { cx: s.cx, cz: s.cz, ox: s.ox, oz: s.oz }; });
  const shot = async (name, from, to) => { await ev(c => { window.__havoc.CAM.free = c; }, [from, to]); await page.waitForTimeout(1400); await page.screenshot({ path: `${SP}/test/${TAG}-${name}.png` }); };
  // put the hero on the field so the players come out
  await ev(([x, z]) => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const p = H.HERO.p; p.x = x; p.z = z; p.y = 0.15; }, [S.cx + 12, S.cz + 6]);
  await page.waitForTimeout(2000);
  console.log('players', await ev(() => { const H = window.__havoc, st = H.STAD.st; return JSON.stringify({ n: H.STAD.peds.length, st: st && [st.ix0, st.ix1, st.iz0, st.iz1].map(Math.round), blocked: st ? [H.pointBlocked(st.cx, st.cz), H.pointBlocked(st.cx + 10, st.cz + 5)] : null, active: H.PED.list.filter(p => p.active).length, total: H.PED.list.length }); }));
  await shot('1-aerial', [S.cx - 120, 70, S.cz + 110], [S.cx, 0, S.cz]);
  await shot('2-field', [S.cx - 30, 2.2, S.cz + 8], [S.cx + 30, 6, S.cz - 4]);
  await shot('3-stands', [S.cx + 5, 3, S.cz - 5], [S.cx - 20, 14, S.cz + 40]);
  await shot('4-tunnel', [S.cx + S.ox + 30, 3, S.cz + 2], [S.cx, 3, S.cz]);
  await ev(() => { window.__havoc.CAM.free = null; });
  // drive in through the east tunnel
  await ev(([x, z]) => { const H = window.__havoc; const p = H.HERO.p; p.x = x; p.z = z; const v = H.VEH.list.find(q => q.kind === 'parked' && !q.mission); v.place(x, z, -Math.PI / 2, 0); H.enterVehicle(v); }, [S.cx + S.ox + 14, S.cz]);
  await page.keyboard.down('KeyW'); const xs = [];
  for (let k = 0; k < 90; k++) { const x = await ev(() => Math.round(window.__havoc.G.player.x)); xs.push(x); if (x < S.cx + 10) break; await page.waitForTimeout(400); }
  await page.keyboard.up('KeyW');
  console.log('drive in', JSON.stringify(xs.filter((_, i) => i % 6 === 0)), 'reached field', xs[xs.length - 1] < S.cx + 30);
  await page.screenshot({ path: `${SP}/test/${TAG}-5-drivein.png` });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
