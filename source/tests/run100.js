// rubble physics: a building comes down next to the car, chunks fall and settle, the car ploughs through them, a blast throws them;
// a collapsed tower loses all its hitboxes (including the new upper-section ones)
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', police: 'off', time: 'day', weather: 'clear' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  // a mid-size building near the car, seen from the street
  const info = await page.evaluate(() => {
    const H = window.__havoc, v = H.G.player, W = H.getW();
    const s = H.STR.list.filter(s => !s.state && s.kind === 'bldg' && s.top - s.y0 > 14 && s.top - s.y0 < 45).sort((a, b) => Math.hypot((a.x0 + a.x1) / 2 - v.x, (a.z0 + a.z1) / 2 - v.z) - Math.hypot((b.x0 + b.x1) / 2 - v.x, (b.z0 + b.z1) / 2 - v.z))[0];
    window.__s = s; const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    const n = W.nodes.slice().sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
    const dx = cx - n.x, dz = cz - n.z, l = Math.hypot(dx, dz);
    v.x = n.x - dx / l * 8; v.z = n.z - dz / l * 8; v.vx = v.vz = 0; v.h = Math.atan2(dx, dz); H.CAM.h = v.h;
    return { top: Math.round(s.top - s.y0), dist: Math.round(Math.hypot(cx - v.x, cz - v.z)) };
  });
  console.log('building:', JSON.stringify(info));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const H = window.__havoc, s = window.__s; s.byPlayer = true; H.collapseStruct(s, (s.x0 + s.x1) / 2 + 3, (s.z0 + s.z1) / 2); });
  const rs = () => page.evaluate(() => { const H = window.__havoc, R = H.RUB; const on = R.list.filter(c => c.on); return { on: on.length, asleep: on.filter(c => c.sleep > 0.6).length, maxSpeed: +Math.max(0, ...on.map(c => Math.hypot(c.vx, c.vy, c.vz))).toFixed(1), below: on.filter(c => c.y < H.heightAt(c.x, c.z) - 0.05).length, high: on.filter(c => c.y - H.heightAt(c.x, c.z) > 3).length }; });
  for (const t of [1200, 2500]) { await page.waitForTimeout(t); console.log('falling:', JSON.stringify(await rs())); await page.screenshot({ path: `${SP}/test/rubble-falling-${t}.png` }); }
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(500); if (await page.evaluate(() => window.__havoc.BOOM.queue.length === 0 && window.__havoc.STR.active.indexOf(window.__s) < 0)) break; }
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(500); const r = await rs(); if (r.asleep >= r.on - 2) break; }
  console.log('settled:', JSON.stringify(await rs()));
  await page.screenshot({ path: SP + '/test/rubble-heap.png' });
  // drive through the heap
  // line the car up 9 m short of the middle of the heap, pointing at it
  await page.evaluate(() => { const H = window.__havoc, v = H.G.player, on = H.RUB.list.filter(c => c.on); const tg = on.slice().sort((a, b) => (b.sx * b.sy * b.sz) - (a.sx * a.sy * a.sz))[0], mx = tg.x, mz = tg.z; const dx = mx - v.x, dz = mz - v.z, l = Math.hypot(dx, dz); v.x = mx - dx / l * 9; v.z = mz - dz / l * 9; v.h = Math.atan2(dx, dz); v.vx = Math.sin(v.h) * 12; v.vz = Math.cos(v.h) * 12; H.CAM.h = v.h; });
  const before = await page.evaluate(() => { const R = window.__havoc.RUB; return R.list.filter(c => c.on).map(c => [c.x, c.z]); });
  const trace = [];
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 14; i++) { await page.waitForTimeout(250); trace.push(await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return [Math.round(v.x * 10) / 10, Math.round(v.z * 10) / 10, Math.round(Math.abs(v.vf) * 3.6), Math.round(v.health), H.RUB.hits || 0].join(' '); })); }
  await page.keyboard.up('KeyW'); console.log('trace (x z kmh hp hits):', trace.join(' | '));
  const pushed = await page.evaluate(b => { const R = window.__havoc.RUB; let n = 0, i = 0; for (const c of R.list) { if (!c.on) continue; const p = b[i++]; if (p && Math.hypot(c.x - p[0], c.z - p[1]) > 0.5) n++; } return n; }, before);
  console.log('debug:', await page.evaluate(() => { const H = window.__havoc, v = H.G.player, on = H.RUB.list.filter(c => c.on); const near = on.map(c => Math.hypot(c.x - v.x, c.z - v.z)).sort((a, b) => a - b).slice(0, 3).map(d => +d.toFixed(1)); return JSON.stringify({ car: [Math.round(v.x), Math.round(v.z)], near, sizes: on.slice(0, 4).map(c => [c.sx, c.sy, c.sz].map(x => +x.toFixed(1))), ys: on.slice(0, 4).map(c => +(c.y - H.heightAt(c.x, c.z)).toFixed(2)), front: v.front, rear: v.rear }); }));
  console.log('chunks the car shoved:', pushed, '| car', await page.evaluate(() => { const v = window.__havoc.G.player; return JSON.stringify({ kmh: Math.round(Math.abs(v.vf) * 3.6), hp: Math.round(v.health) }); }));
  await page.screenshot({ path: SP + '/test/rubble-plough.png' });
  // a blast in the middle of the heap
  const b0 = await page.evaluate(() => { const H = window.__havoc, s = window.__s; const x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2; window.__bx = [x, z]; H.explode(x, H.heightAt(x, z) + 1, z, 2, null, null, false); return 1; });
  await page.waitForTimeout(600);
  console.log('after a blast:', JSON.stringify(await rs()));
  // a car crash into a standing wall knocks chunks off
  const hit = await page.evaluate(() => { const H = window.__havoc, s = H.STR.list.find(s => !s.state && s.kind === 'bldg'); const n0 = H.RUB.list.filter(c => c.on && GTnow() >= 0).length; function GTnow() { return 0; } H.hitStruct(s, 60, s.x0, 2, (s.z0 + s.z1) / 2, 'hero'); return { before: n0, after: H.RUB.list.filter(c => c.on).length }; });
  console.log('chunks from a 60-damage wall hit:', JSON.stringify(hit));
  // a tall tower with an upper section: once it's down, none of its hitboxes are left
  const tw = await page.evaluate(() => { const H = window.__havoc, v = H.G.player; const s = H.STR.list.filter(s => !s.state && s.kind === 'bldg' && s.boxes.length >= 2)[0]; if (!s) return 'none'; window.__t = s; s.byPlayer = true; H.collapseStruct(s, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2); return s.boxes.map(b => Math.round(b.h)).join('/'); });
  for (let i = 0; i < 180; i++) { await page.waitForTimeout(500); if (await page.evaluate(() => !window.__t || window.__t.boxes.every(b => b.gone))) break; }
  console.log('tower', tw, '-> hitboxes gone after the collapse:', await page.evaluate(() => window.__t ? window.__t.boxes.map(b => !!b.gone).join(',') : 'n/a'));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
