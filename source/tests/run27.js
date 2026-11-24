const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon', MINH = +(process.argv[4] || 18);
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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 0, pedDensity: 10, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  console.log(MAP, 'structs', await page.evaluate(() => { const S = window.__havoc.STR.list; const k = {}; for (const s of S) k[s.kind] = (k[s.kind] || 0) + 1; return JSON.stringify({ n: S.length, kinds: k, noParts: S.filter(s => !s.parts.length).length }); }));
  // pick a building and park the car on the road looking at it from ~45 m
  const tgt = await page.evaluate(minh => { const H = window.__havoc, W = H.getW(), P = H.G.player;
    const cands = H.STR.list.filter(s => s.kind === 'bldg' && s.top - s.y0 >= minh);
    for (const s of cands) { const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
      for (const e of W.edges) { const A = W.nodes[e.a], B = W.nodes[e.b]; for (let t = 0.2; t <= 0.8; t += 0.1) { const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t, d = Math.hypot(x - cx, z - cz); if (d > 40 && d < 60) { P.place(x, z, Math.atan2(cx - x, cz - z) + Math.PI, 0); return { cx, cz, h: Math.round(s.top - s.y0), parts: s.parts.length, idx: H.STR.list.indexOf(s), x, z }; } } } }
    return null; }, MINH);
  console.log('target', JSON.stringify(tgt));
  await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC');
  await page.evaluate(t => { const H = window.__havoc, P = H.G.player; P.h = Math.atan2(t.cx - t.x, t.cz - t.z); H.CAM.h = P.h; }, tgt);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SP}/test/c-${MAP}-0.png` });
  await page.evaluate(t => { const H = window.__havoc, s = H.STR.list[t.idx]; s.hp = 1; H.damageStructsAt(t.cx, s.y0 + 2, t.cz, 1.35, 'hero'); }, tgt);
  for (const [i, w] of [[1, 900], [2, 1600], [3, 2500], [4, 6000]]) { await page.waitForTimeout(w); await page.screenshot({ path: `${SP}/test/c-${MAP}-${i}.png` }); }
  console.log('state', await page.evaluate(t => { const H = window.__havoc, s = H.STR.list[t.idx]; return JSON.stringify({ state: s.state, t: +s.t.toFixed(2), dur: +s.dur.toFixed(2), rubble: H.STR.rubble.length, boxH: s.boxes.map(b => +b.h.toFixed(2)) }); }, tgt));
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
