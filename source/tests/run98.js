// hitbox audit: for each map, compare what's drawn (W.bldgs) with what you collide with (W.boxes)
const { chromium } = require('playwright');
const SP = process.argv[2], MAPS = (process.argv[3] || 'perth').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 520 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  for (const MAP of MAPS) {
    await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'low', police: 'off', time: 'day', weather: 'clear' }); }, MAP);
    if (MAP !== MAPS[0]) { await page.evaluate(() => window.__havoc.quitToMenu && window.__havoc.quitToMenu()); await page.waitForTimeout(500); }
    await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
    const r = await page.evaluate(() => {
      const H = window.__havoc, W = H.getW(), out = { bldgs: 0, tall: 0, noBox: [], lowBox: [], biggerBox: [], ghostBoxes: [] };
      const boxes = W.boxes.filter(b => b.kind === 'b');
      const cover = (x0, z0, x1, z1) => boxes.filter(b => b.x0 < x1 - 0.3 && b.x1 > x0 + 0.3 && b.z0 < z1 - 0.3 && b.z1 > z0 + 0.3);
      for (const g of W.bldgs) {
        out.bldgs++; const top = g.y + g.h; if (top < 20) continue; out.tall++;
        const c = cover(g.x0, g.z0, g.x1, g.z1);
        if (!c.length) { out.noBox.push([g.x0, g.z0, g.x1, g.z1, g.y, top].map(v => Math.round(v))); continue; }
        const maxTop = Math.max(...c.map(b => b.h));
        if (maxTop < top - 1) out.lowBox.push({ b: [g.x0, g.z0, g.x1, g.z1].map(Math.round), top: Math.round(top), box: Math.round(maxTop) });
      }
      // boxes that stick out past anything drawn (invisible walls)
      for (const b of boxes) {
        if (b.h < 6) continue;
        const gs = W.bldgs.filter(g => g.x0 < b.x1 - 0.3 && g.x1 > b.x0 + 0.3 && g.z0 < b.z1 - 0.3 && g.z1 > b.z0 + 0.3);
        if (!gs.length) { out.ghostBoxes.push([b.x0, b.z0, b.x1, b.z1, b.h].map(Math.round)); continue; }
        const ux0 = Math.min(...gs.map(g => g.x0)), ux1 = Math.max(...gs.map(g => g.x1)), uz0 = Math.min(...gs.map(g => g.z0)), uz1 = Math.max(...gs.map(g => g.z1)), top = Math.max(...gs.map(g => g.y + g.h));
        const over = Math.max(ux0 - b.x0, b.x1 - ux1, uz0 - b.z0, b.z1 - uz1);
        if (over > 1 || b.h > top + 2) out.biggerBox.push({ box: [b.x0, b.z0, b.x1, b.z1, b.h].map(Math.round), drawn: [ux0, uz0, ux1, uz1, top].map(Math.round) });
      }
      return out;
    });
    console.log(MAP, 'buildings', r.bldgs, 'tall', r.tall, '| tall with no hitbox', r.noBox.length, '| hitbox lower than the building', r.lowBox.length, '| hitbox bigger than drawn', r.biggerBox.length, '| hitbox with nothing drawn', r.ghostBoxes.length);
    console.log('  no box:', JSON.stringify(r.noBox.slice(0, 8)));
    console.log('  low box:', JSON.stringify(r.lowBox.slice(0, 8)));
    console.log('  bigger:', JSON.stringify(r.biggerBox.slice(0, 8)));
    console.log('  ghost:', JSON.stringify(r.ghostBoxes.slice(0, 8)));
  }
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await browser.close();
})();
