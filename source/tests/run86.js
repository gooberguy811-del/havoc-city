// Testing Zone physics: loops (fast and too slow), mega ramp, quarter pipe, kicker, speed bumps, bowl
const { chromium } = require('playwright');
const SP = process.argv[2], ONLY = (process.argv[3] || '').split(',').filter(Boolean);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = []; let page = null, ctx = null;
  const fresh = async () => {
    if (ctx) await ctx.close();
    ctx = await browser.newContext({ viewport: { width: 800, height: 450 } }); page = await ctx.newPage();
    page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
    await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'test', quality: 'low', time: 'day', police: 'off' }));
    await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  };
  // drive a scenario: place the car, hold keys, sample until game time passes; report what happened
  const run = async (name, x, z, h, sp, keys, gameSecs, shotAt) => {
    if (ONLY.length && !ONLY.includes(name)) return;
    await fresh();
    await page.evaluate(([x, z, h, sp]) => { const H = window.__havoc, v = H.G.player; v.loop = null; v.tumble = false; v.flipped = false; v.wrecked = false; v.health = v.maxHp; v.place(x, z, h, 0); v.vx = Math.sin(h) * sp; v.vz = Math.cos(h) * sp; v.vy = 0; v.onGround = true; v.airT = 0; v.nitro = 1; H.CAM.h = h; window.__run = { maxAir: 0, maxY: 0, looped: 0, inLoop: false, maxTh: 0, fell: false, t0: H.gt(), style0: H.STY.pts, lands: [], topSpeed: 0 }; }, [x, z, h, sp]);
    for (const k of keys) await page.keyboard.down(k);
    let shot = false;
    for (let i = 0; i < 400; i++) {
      const r = await page.evaluate(() => { const H = window.__havoc, v = H.G.player, R = window.__run; if (!v) return R;
        if (!v.onGround) R.maxAir = Math.max(R.maxAir, v.airT); R.maxY = Math.max(R.maxY, v.y); R.topSpeed = Math.max(R.topSpeed, Math.hypot(v.vx, v.vz, v.vy) * 3.6);
        if (v.loop) { R.inLoop = true; R.maxTh = Math.max(R.maxTh, v.loop.th); } else if (R.inLoop) { R.inLoop = false; R.looped++; }
        if (v.tumble && !R.fell) R.fellAt = { x: Math.round(v.x), z: Math.round(v.z), y: +v.y.toFixed(1), r: Math.round(Math.hypot(v.x - 520, v.z - 196)), a: +Math.atan2(v.z - 196, v.x - 520).toFixed(2), slip: +(v.slip || 0).toFixed(1), kmh: Math.round(Math.hypot(v.vx, v.vz) * 3.6), gh: +H.heightAt(v.x, v.z).toFixed(1), el: +(H.gt() - R.t0).toFixed(2) };
        if (v.tumble) R.fell = true; R.el = H.gt() - R.t0; R.style = H.STY.pts - R.style0; R.pos = [Math.round(v.x), +v.y.toFixed(1), Math.round(v.z)]; R.hp = Math.round(v.health); return R; });
      if (name === 'bowlC') await page.evaluate(() => { const H = window.__havoc, v = H.G.player, K = H.KEYS; const dx = v.x - 520, dz = v.z - 196, a = Math.atan2(dz, dx), r = Math.hypot(dx, dz);
        const tx = -Math.sin(a), tz = Math.cos(a), want = Math.atan2(tx, tz) - (r - 66) * 0.03, err = ((want - v.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI; K.KeyA = err > 0.04; K.KeyD = err < -0.04; K.KeyW = Math.hypot(v.vx, v.vz) < 30; window.__run.bank = Math.max(window.__run.bank || 0, Math.abs(v.bank || 0)); window.__run.rmin = Math.min(window.__run.rmin || 999, r); window.__run.rmax = Math.max(window.__run.rmax || 0, r); });
      if (shotAt && !shot && r.el > shotAt) { shot = true; await page.screenshot({ path: `${SP}/test/tzp-${name}.png` }); }
      if (r.el > gameSecs) break;
      await page.waitForTimeout(40);
    }
    for (const k of keys) await page.keyboard.up(k);
    const r = await page.evaluate(() => { const R = window.__run; return { fellAt: R.fellAt, bank: R.bank && +R.bank.toFixed(2), r: R.rmin && [Math.round(R.rmin), Math.round(R.rmax)], maxAir: +R.maxAir.toFixed(2), maxY: +R.maxY.toFixed(1), loopsDone: R.looped, maxTh: +R.maxTh.toFixed(2), tumbled: R.fell, style: R.style, pos: R.pos, hp: R.hp, topKmh: Math.round(R.topSpeed), gameSecs: +R.el.toFixed(1) }; });
    const pops = await page.evaluate(() => [...document.querySelectorAll('.stypop')].map(e => e.textContent).slice(0, 3));
    console.log(name.padEnd(12), JSON.stringify(r), pops.length ? 'pops: ' + pops.join(' | ') : '');
  };
  await run('loopBig', -520, -240, Math.PI / 2, 30, ['KeyW'], 6, 2.2);
  await run('loopSlow', -440, -240, Math.PI / 2, 22, [], 5, 1.2);
  await run('loopSmall', -540, -150, Math.PI / 2, 28, ['KeyW'], 6, 2.0);
  await run('mega', -700, 430, Math.PI / 2, 20, ['KeyW', 'ShiftLeft'], 16, 11);
  await run('sky', -200, 200, -Math.PI / 2, 25, ['KeyW', 'ShiftLeft'], 9, 5);
  await run('skySlow', -330, 200, -Math.PI / 2, 18, ['KeyW'], 7);
  await run('kicker', -380, -60, Math.PI / 2, 32, ['KeyW'], 4, 1.5);
  await run('bumps', 70, 54, Math.PI / 2, 30, ['KeyW'], 7);
  await run('bowlC', 520 + 66 * Math.cos(-1.3), 196 + 66 * Math.sin(-1.3), Math.atan2(-Math.sin(-1.3), Math.cos(-1.3)), 26, [], 6, 2.5);
  console.log('style total', await page.evaluate(() => window.__havoc.STY.pts), 'errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
