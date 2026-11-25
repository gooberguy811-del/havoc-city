// where the triangles come from: per object kind, triangles x instances, whether frustum culling can help, shadow casting
const { chromium } = require('playwright');
const SP = process.argv[2], MAPS = (process.argv[3] || 'perth').split(',');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const MAP of MAPS) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); const page = await ctx.newPage();
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/cdn.jsdelivr.net/npm/three@0.128.0/examples/js/**', r => { const f = r.request().url().split('/examples/js/')[1]; r.fulfill({ path: SP + '/vendor/package/examples/js/' + f, contentType: 'application/javascript' }); });
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
    await page.evaluate(m => Object.assign(window.__havoc.settings, { map: m, quality: 'medium', time: 'day' }), MAP);
    await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(5000);
    const r = await page.evaluate(() => {
      const H = window.__havoc, rows = new Map();
      const label = o => { let n = o.name || ''; let p = o.parent; while (!n && p && p !== H.scene) { n = p.name; p = p.parent; } const m = Array.isArray(o.material) ? o.material[0] : o.material; return (o.isInstancedMesh ? 'INST ' : '') + (n || (m && m.name) || '?') + ' [' + (o.geometry.type || '') + ']'; };
      let total = 0, totalCasting = 0;
      H.scene.traverse(o => {
        if (!(o.isMesh) || !o.visible) return; let vis = true; for (let p = o.parent; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return;
        const g = o.geometry, idx = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0), tri = idx / 3 * (o.isInstancedMesh ? o.count : 1);
        const k = label(o), e = rows.get(k) || { tri: 0, n: 0, noCull: 0, cast: 0 }; e.tri += tri; e.n++; if (!o.frustumCulled) e.noCull += tri; if (o.castShadow) e.cast += tri; rows.set(k, e); total += tri; if (o.castShadow) totalCasting += tri;
      });
      return { total: Math.round(total), casting: Math.round(totalCasting), rows: [...rows.entries()].sort((a, b) => b[1].tri - a[1].tri).slice(0, 18).map(([k, e]) => `${(e.tri / 1000).toFixed(0)}k ${k} x${e.n}${e.noCull ? ' NOCULL ' + (e.noCull / 1000).toFixed(0) + 'k' : ''}${e.cast ? ' shadow' : ''}`) };
    });
    console.log(MAP, 'visible scene triangles', r.total, 'shadow-casting', r.casting); for (const l of r.rows) console.log('   ', l);
    await ctx.close();
  }
  await browser.close();
})();
