const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'perth';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } }); const page = await ctx.newPage();
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => Object.assign(window.__havoc.settings, { map: m, quality: 'medium' }), MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(4000);
  console.log(await page.evaluate(() => {
    const H = window.__havoc, W = H.getW ? H.getW() : H.W, names = new Map();
    for (const k in W.inst.trees) names.set(W.inst.trees[k], 'tree:' + k);
    for (const k in W.inst.props) { const r = W.inst.props[k]; names.set(r.mesh, 'prop:' + k); if (r.head) names.set(r.head, 'lampHead'); if (r.pool) names.set(r.pool, 'lampPool'); }
    if (W.inst.tl) { names.set(W.inst.tl.pm || W.inst.tl, 'trafficLight'); }
    for (const k in H.PED.mesh) names.set(H.PED.mesh[k], 'ped:' + k);
    if (H.KIDS && H.KIDS.mesh) for (const k in H.KIDS.mesh) names.set(H.KIDS.mesh[k], 'kid:' + k);
    const out = [];
    H.scene.traverse(o => { if (!o.isInstancedMesh) return; const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3; out.push([Math.round(t * o.count), names.get(o) || ('? ' + (o.material.name || o.material.type)), Math.round(t), o.count, o.frustumCulled, o.castShadow]); });
    out.sort((a, b) => b[0] - a[0]);
    return out.map(r => `${(r[0] / 1000).toFixed(0)}k ${r[1]} (${r[2]} tris x ${r[3]}) cull=${r[4]} shadow=${r[5]}`).join('\n') + '\nPED.MAX ' + H.PED.list.length + ' active ' + H.PED.list.filter(p => p.active).length;
  }));
  await browser.close();
})();
