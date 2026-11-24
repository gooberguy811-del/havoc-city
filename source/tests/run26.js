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
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 20, pedDensity: 30, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  console.log('structs', await page.evaluate(() => { const S = window.__havoc.STR.list; const k = {}; for (const s of S) k[s.kind] = (k[s.kind] || 0) + 1; const parts = S.map(s => s.parts.length); return JSON.stringify({ n: S.length, kinds: k, avgParts: +(parts.reduce((a, b) => a + b, 0) / S.length).toFixed(2), noParts: parts.filter(p => !p).length, hp: S.slice(0, 5).map(s => Math.round(s.hp)) }); }));
  // big map
  await page.keyboard.press('KeyM'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${SP}/test/b-${MAP}-map.png` });
  await page.click('#bmClose'); await page.waitForTimeout(200);
  const a = await page.evaluate(() => window.__havoc.BM.open);
  await page.click('#minimap'); await page.waitForTimeout(300);
  const b = await page.evaluate(() => window.__havoc.BM.open);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const c = await page.evaluate(() => [window.__havoc.BM.open, !document.querySelector('#pause').hidden]);
  console.log('map: after X', a, 'after minimap click', b, 'after Esc [open, paused]', c);
  // explosion in front of the car
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; H.explode(P.x + Math.sin(P.h) * 16, 1, P.z + Math.cos(P.h) * 16, 1.35, null); });
  for (const t of [150, 500, 1400]) { await page.waitForTimeout(t === 150 ? 150 : t - 150); await page.screenshot({ path: `${SP}/test/b-${MAP}-boom-${t}.png` }); }
  // collapse the nearest tall building in view
  const tgt = await page.evaluate(() => { const H = window.__havoc, P = H.G.player; let best = null, bd = 1e9; for (const s of H.STR.list) { if (s.kind !== 'bldg' || s.top - s.y0 < 18) continue; const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, d = Math.hypot(cx - P.x, cz - P.z); const fwd = (cx - P.x) * Math.sin(P.h) + (cz - P.z) * Math.cos(P.h); if (fwd > 20 && d < bd) { bd = d; best = s; } } if (!best) return null; best.hp = 1; H.damageStructsAt((best.x0 + best.x1) / 2, best.y0 + 3, (best.z0 + best.z1) / 2, 1.35, 'hero'); return { d: Math.round(bd), h: Math.round(best.top - best.y0), parts: best.parts.length, state: best.state }; });
  console.log('collapse target', JSON.stringify(tgt));
  for (const t of [800, 2500, 7000]) { await page.waitForTimeout(t === 800 ? 800 : t === 2500 ? 1700 : 4500); await page.screenshot({ path: `${SP}/test/b-${MAP}-fall-${t}.png` }); }
  console.log('after collapse', await page.evaluate(() => { const H = window.__havoc; const s = H.STR.list.find(s => s.state); return JSON.stringify({ state: s && s.state, active: H.STR.active.length, rubble: H.STR.rubble.length, stars: H.wanted.stars }); }));
  // gas station mega blast
  await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list[0], P = H.G.player; const fx = Math.sin(st.fh), fz = Math.cos(st.fh), rx = st.gx - fx * 19, rz = st.gz - fz * 19, x = rx + fz * 42, z = rz - fx * 42; P.place(x, z, Math.atan2(st.gx - x, st.gz - z), 0); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list[0], W = H.getW(); const p = W.props.find(q => q.type === 'pump' && Math.hypot(q.x - st.gx, q.z - st.gz) < 16 && q.st === 0); p.st = 3; H.pumpBlast(p, 'hero'); });
  for (const t of [400, 900, 1800, 4000, 9000]) { await page.waitForTimeout(t === 400 ? 400 : t === 900 ? 500 : t === 1800 ? 900 : t === 4000 ? 2200 : 5000); await page.screenshot({ path: `${SP}/test/b-${MAP}-gas-${t}.png` }); }
  console.log('gas', await page.evaluate(() => { const H = window.__havoc, st = H.SHOP.list[0]; const ss = H.STR.list.filter(s => s.station === st).map(s => [s.kind, s.state, Math.round(s.hp)]); return JSON.stringify({ blown: st.blown, wrecked: st.wrecked, structs: ss, fires: H.BOOM.fires.length, stars: H.wanted.stars, perf: +H.PERF.upd.toFixed(2) }); }));
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
