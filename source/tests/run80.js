// performance profile: per map, frame cost split into update / render, draw calls, scene size, and the hottest JS functions
const { chromium } = require('playwright');
const SP = process.argv[2], MAPS = (process.argv[3] || 'neon').split(','), QUAL = process.argv[4] || 'medium';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const MAP of MAPS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/cdn.jsdelivr.net/npm/three@0.128.0/examples/js/**', r => { const f = r.request().url().split('/examples/js/')[1]; r.fulfill({ path: SP + '/vendor/package/examples/js/' + f, contentType: 'application/javascript' }); });
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
    await page.evaluate(([m, q]) => Object.assign(window.__havoc.settings, { map: m, quality: q, time: 'day' }), [MAP, QUAL]);
    await page.click(`.mapcard[data-map="${MAP}"]`); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(5000);
    // time update and render separately for a fixed number of frames, driving forward
    await page.keyboard.down('KeyW');
    const t = await page.evaluate(async () => {
      const H = window.__havoc, R = H.renderer; const ups = [], rs = [], calls = [], tris = [];
      const origU = H.gameUpdate; let lastU = 0;
      for (let i = 0; i < 15; i++) { await new Promise(r => requestAnimationFrame(r)); }
      // sample: measure one explicit update + render per frame
      for (let i = 0; i < 20; i++) {
        await new Promise(r => requestAnimationFrame(r));
        let t0 = performance.now(); H.gameUpdate(1 / 60); ups.push(performance.now() - t0);
        R.info.autoReset = false; R.info.reset(); t0 = performance.now(); H.renderScene(); R.getContext().finish(); rs.push(performance.now() - t0);
        calls.push(R.info.render.calls); tris.push(R.info.render.triangles); R.info.autoReset = true;
      }
      const avg = a => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), med = a => +a.slice().sort((x, y) => x - y)[a.length >> 1].toFixed(2);
      let meshes = 0, vis = 0, inst = 0, shadowCasters = 0; H.scene.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) { meshes++; if (o.visible) vis++; if (o.isInstancedMesh) inst++; if (o.castShadow && o.visible) shadowCasters++; } });
      return { upd: [avg(ups), med(ups)], render: [avg(rs), med(rs)], calls: [avg(calls), Math.max(...calls)], tris: Math.round(avg(tris)), meshes, vis, inst, shadowCasters, geoms: R.info.memory.geometries, tex: R.info.memory.textures, progs: R.info.programs.length, cars: H.VEH.list.length, peds: H.PED.list.filter(p => p.active).length, pr: R.getPixelRatio(), bloom: !!H.POST.composer };
    });
    console.log(MAP.padEnd(6), JSON.stringify(t));
    // CPU profile of normal play
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
    await page.waitForTimeout(6000);
    const { profile } = await cdp.send('Profiler.stop');
    await page.keyboard.up('KeyW');
    const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])), dt = profile.timeDeltas; const cnt = new Map();
    profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
    let total = 0; for (const [id, us] of cnt) { const n = byId.get(id), cf = n.callFrame; const k = (cf.functionName || '(anon)') + ':' + (cf.lineNumber + 1); self.set(k, (self.get(k) || 0) + us); total += us; }
    const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, us]) => `${(us / total * 100).toFixed(1)}% ${k}`);
    console.log('  top self time:', top.join(' | '));
    if (errs.length) console.log('  errors', errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
})();
