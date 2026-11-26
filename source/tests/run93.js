// pug bombs: make it rain pugs, pick one up with F, throw it with Q; it goes off on contact and levels every building within 50 m
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'low', police: 'off' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  await page.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
  await page.waitForTimeout(1500);
  // stand among some buildings and let pugs rain down around you
  // stand at a road junction with buildings around it, and look down one of its roads
  const spot = await page.evaluate(() => {
    const H = window.__havoc, W = H.getW(), p = H.HERO.p;
    const score = n => H.STR.list.filter(s => !s.state && Math.hypot(Math.max(s.x0 - n.x, 0, n.x - s.x1), Math.max(s.z0 - n.z, 0, n.z - s.z1)) < 60).length;
    const n = W.nodes.filter(n => n.edges.length >= 3).sort((a, b) => score(b) - score(a))[0];
    const e = W.edges[n.edges[0].id !== undefined ? n.edges[0].id : n.edges[0]], o = W.nodes[e.a === n.id ? e.b : e.a];
    p.x = n.x; p.z = n.z; p.y = H.heightAt(p.x, p.z); window.__look = Math.atan2(o.x - n.x, o.z - n.z);
    return { x: n.x, z: n.z, around: score(n), road: +e.len.toFixed(0) };
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p; H.pugRain(12, { x: p.x, y: p.y, z: p.z }); for (const r of H.PUG.rain) { r.x = p.x + (Math.random() - 0.5) * 3; r.z = p.z + (Math.random() - 0.5) * 3; r.y = p.y + 4; } });
  console.log('spot', JSON.stringify(spot));
  await page.waitForTimeout(3000);
  console.log('prompt near pugs:', await page.evaluate(() => [...document.querySelectorAll('#ui [id*=rompt], #prompt')].map(e => e.id + ':' + e.textContent).join(' | ')));
  console.log('debug:', await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p; const ds = H.PUG.rain.map(r => Math.hypot(r.x - p.x, r.z - p.z).toFixed(1) + '/' + (r.y - p.y).toFixed(1)); return JSON.stringify({ px: p.x.toFixed(1), pz: p.z.toFixed(1), ds: ds.slice(0, 5), near: !!H.pugNear(), onFoot: H.G.onFoot, rag: !!p.rag, active: p.active, swim: H.HERO.swim, chute: !!H.HERO.chute, web: !!H.HERO.web, fly: !!H.HERO.fly }); }));
  await page.keyboard.press('KeyF'); await page.waitForTimeout(500);
  const held = await page.evaluate(() => { const H = window.__havoc; return { held: !!H.PUG.held, onFoot: H.G.onFoot, enter: !!H.HERO.enter, feed: [...document.querySelectorAll('#feed .msg')].map(e => e.textContent).join(' | ') }; });
  console.log('after F:', JSON.stringify(held));
  await page.screenshot({ path: SP + '/test/pug-held.png' });
  // turn to face the building, count what stands within 50 m of where it will land
  const before = await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p; window.__stand = H.STR.list.filter(s => s.state).length; return { fallen: window.__stand, hp: Math.round(H.HERO.hp) }; });
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p; H.CAM.h = window.__look; p.h = window.__look; });
  await page.waitForTimeout(300);
  console.log('throw debug:', await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, r = H.PUG.held; const o = { px: +p.x.toFixed(1), pz: +p.z.toFixed(1), ph: +p.h.toFixed(2), rx: +r.x.toFixed(1), rz: +r.z.toFixed(1), ry: +(r.y - p.y).toFixed(2) }; H.throwPug(false); Object.assign(o, { vx: +r.vx.toFixed(1), vy: +r.vy.toFixed(1), vz: +r.vz.toFixed(1), thrown: r.thrown }); const W = H.getW(), bx = []; W.boxGrid.query(r.x - 0.3, r.z - 0.3, r.x + 0.3, r.z + 0.3, bx); o.boxes = bx.filter(b => r.x > b.x0 - 0.2 && r.x < b.x1 + 0.2 && r.z > b.z0 - 0.2 && r.z < b.z1 + 0.2).map(b => (b.kind || '?') + ':' + b.h.toFixed(1)); o.gh = +(H.heightAt(r.x, r.z) - r.y).toFixed(2); return JSON.stringify(o); }));
  const fly = await page.evaluate(() => { const H = window.__havoc, r = H.PUG.rain.find(r => r.thrown); return r ? { vx: +r.vx.toFixed(1), vy: +r.vy.toFixed(1), vz: +r.vz.toFixed(1) } : 'none'; });
  console.log('thrown:', JSON.stringify(fly), 'held now', await page.evaluate(() => !!window.__havoc.PUG.held));
  let blast = null;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(150); blast = await page.evaluate(() => window.__havoc.PUG.rain.some(r => r.thrown) ? null : 'gone'); if (blast) break; }
  console.log('queue after blast:', await page.evaluate(() => { const H = window.__havoc; return JSON.stringify({ q: H.BOOM ? H.BOOM.queue.length : 'no BOOM', fallen: H.STR.list.filter(s => s.state).length }); }));
  await page.waitForTimeout(400); await page.screenshot({ path: SP + '/test/pug-boom.png' });
  console.log('queue +0.4s:', await page.evaluate(() => { const H = window.__havoc; return JSON.stringify({ q: H.BOOM ? H.BOOM.queue.length : 'no BOOM', fallen: H.STR.list.filter(s => s.state).length }); }));
  for (let i = 0; i < 80; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => window.__havoc.BOOM.queue.length === 0)) break; }
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => { const H = window.__havoc; return { fallen: H.STR.list.filter(s => s.state).length, hp: Math.round(H.HERO.hp), down: H.G.down, stars: H.wanted.stars, stat: H.G.stats.pugBombs }; });
  console.log('before', JSON.stringify(before), 'after', JSON.stringify(after));
  // anything left standing within 50 m of the blast?
  console.log('blast', await page.evaluate(() => { const H = window.__havoc, b = H.PUG.lastBlast, p = H.HERO.p; if (!b) return 'none'; let n = 0, m = 0; for (const s of H.STR.list) { const d = Math.hypot(Math.max(s.x0 - b.x, 0, b.x - s.x1), Math.max(s.z0 - b.z, 0, b.z - s.z1)); if (d <= 50) { if (s.state) m++; else n++; } } return JSON.stringify({ at: [b.x.toFixed(0), b.z.toFixed(0)], fromHero: Math.hypot(b.x - p.x, b.z - p.z).toFixed(1), fallenWithin50: m, standingWithin50: n }); }));
  await page.screenshot({ path: SP + '/test/pug-after.png' });
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
