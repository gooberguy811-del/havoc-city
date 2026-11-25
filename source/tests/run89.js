const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } }); const page = await ctx.newPage();
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'test', quality: 'low', police: 'off' }));
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  // step the physics by hand: hold a tangent heading on the bank (no keys), and print what happens each 0.1 s
  console.log(await page.evaluate(() => {
    const H = window.__havoc, v = H.G.player, a0 = -1.2, r0 = 58;
    v.place(520 + r0 * Math.cos(a0), 200 + r0 * Math.sin(a0), Math.atan2(-Math.sin(a0), Math.cos(a0)), 0); v.y = H.heightAt(v.x, v.z); v.onGround = true;
    const sp0 = 30; v.vx = Math.sin(v.h) * sp0; v.vz = Math.cos(v.h) * sp0;
    const out = [];
    for (let i = 0; i < 120; i++) {
      const dx = v.x - 520, dz = v.z - 200, a = Math.atan2(dz, dx), r = Math.hypot(dx, dz);
      v.h = Math.atan2(-Math.sin(a), Math.cos(a));   // keep pointing along the curve
      const spd = Math.hypot(v.vx, v.vz), vf = v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h);
      v.vx = Math.sin(v.h) * vf; v.vz = Math.cos(v.h) * vf;   // and moving along it
      Object.assign(v.input, { throttle: 0.6, brake: 0, steer: 0, hand: 0, nitro: 0, park: 0 });
      H.stepVehicle(v, 1 / 120);
      if (i % 12 === 0) out.push(`t=${(i / 120).toFixed(1)} r=${r.toFixed(1)} a=${a.toFixed(2)} y=${v.y.toFixed(2)} gh=${H.heightAt(v.x, v.z).toFixed(2)} spd=${spd.toFixed(1)} vy=${(v.vy || 0).toFixed(1)} ground=${v.onGround} tumble=${!!v.tumble}`);
    }
    return out.join('\n');
  }));
  await browser.close();
})();
