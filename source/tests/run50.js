// stores: placement, buy menu, jewel smash, bank robbery, mechanic, disguise, rubble hitbox
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', trafficDensity: 0, pedDensity: 10, police: 'off', time: 'day', slowmo: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  const ev = (fn, a) => page.evaluate(fn, a);
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
  console.log('site', await ev(() => { const H = window.__havoc, S = H.CON.site; return S ? JSON.stringify({ state: H.CON.state, tower: !!S.towerBox.struct, crane: !!H.CON.crane, pipes: H.CON.pipes.length, mission: !!H.MISSIONS[H.getW().id].find(m => m.id === 'chain') }) : 'none'; }));
  // a wide look at the site
  await ev(() => { const H = window.__havoc, S = H.CON.site, v = H.G.player; const dx = S.cx - S.px, dz = S.cz - S.pz, l = Math.hypot(dx, dz); v.place(S.px - dx / l * 26, S.pz - dz / l * 26, Math.atan2(dx, dz), 0); H.CAM.h = Math.atan2(dx, dz); H.CAM.lp = 0.5; H.CAM.lookT = 1e9; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/k-${MAP}-site.png` });
  // the mission: ram the pipe stack
  const cash0 = await ev(() => window.__havoc.MIS.cash);
  await ev(() => { const H = window.__havoc; H.CAM.lp = 0; H.startMission(H.MISSIONS[H.getW().id].find(m => m.id === 'chain')); });
  await page.waitForTimeout(800);
  await ev(() => { const H = window.__havoc, S = H.CON.site, v = H.G.player, rx = S.roll.x, rz = S.roll.z, l = Math.hypot(rx, rz); v.place(S.px - rx / l * 14, S.pz - rz / l * 14, Math.atan2(rx, rz), 16); H.CAM.h = Math.atan2(rx, rz); });
  console.log('triggered', await waitFor(() => window.__havoc.CON.state !== 'ready', 15000));
  await ev(() => { const v = window.__havoc.G.player; v.vx = v.vz = 0; });
  await page.waitForTimeout(1200); await page.screenshot({ path: `${SP}/test/k-${MAP}-pipes.png` });
  await waitFor(() => window.__havoc.CON.t > 3.2, 30000); await page.screenshot({ path: `${SP}/test/k-${MAP}-boom.png` });
  await waitFor(() => window.__havoc.CON.t > 5.4, 30000); await page.screenshot({ path: `${SP}/test/k-${MAP}-crane.png` });
  console.log('done', await waitFor(() => window.__havoc.CON.state === 'done', 60000), await ev(() => JSON.stringify({ tower: window.__havoc.CON.site.towerBox.struct.state, mission: window.__havoc.MIS.active ? window.__havoc.MIS.active.id : null })), 'reward', (await ev(() => window.__havoc.MIS.cash)) - cash0);
  await page.waitForTimeout(2500); await page.screenshot({ path: `${SP}/test/k-${MAP}-after.png` });
  // gas station blows up, then gets rebuilt while we're away
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'gas'), W = H.getW(); const p = W.props.find(q => q.type === 'pump' && Math.hypot(q.x - st.gx, q.z - st.gz) < 16 && q.st === 0); p.st = 3; H.pumpBlast(p, 'hero'); });
  console.log('station wrecked', await waitFor(() => { const st = window.__havoc.SHOP.list.find(s => s.kind === 'gas'); return st.blown && window.__havoc.STR.list.some(s => s.station === st && s.state === 2); }, 60000));
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'gas'), v = H.G.player; st.ruinT = -1000; v.place(st.cx + 200, st.cz, 0, 0); });
  console.log('rebuilt', await waitFor(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'gas'); return !st.blown && !st.wrecked && !H.STR.list.some(s => s.station === st && s.state); }, 30000), await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'gas'), W = H.getW(); return W.props.filter(q => q.type === 'pump' && Math.hypot(q.x - st.gx, q.z - st.gz) < 18 && q.st !== 0).length + ' pumps still broken'; }));
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'gas'), v = H.G.player; v.place(st.cx - Math.sin(st.fh) * 40, st.cz - Math.cos(st.fh) * 40, st.fh, 0); H.CAM.h = st.fh; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/k-${MAP}-rebuilt.png` });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
