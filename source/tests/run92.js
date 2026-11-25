// Roadster in a city: set down on a rooftop, sit there, then drive off the edge; the Air gauge stays Roadster-only
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', quality: 'low', police: 'off' }); window.__havoc.MIS.unlocked.roadster = true; });
  await page.click('#garageBtn'); await page.waitForTimeout(800);
  for (let i = 0; i < 2; i++) { await page.evaluate(() => { const b = [...document.querySelectorAll('#garage button')].find(b => /Roadster/.test(b.textContent)); if (b) b.click(); }); await page.waitForTimeout(500); }
  await page.click('#garageBack'); await page.waitForTimeout(600);
  await page.click('.mapcard[data-map="neon"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  console.log('car:', await page.evaluate(() => window.__havoc.G.player && window.__havoc.G.player.cfg.body), 'air gauge', await page.evaluate(() => !document.getElementById('airRow').hidden));
  const r = await page.evaluate(() => {
    const H = window.__havoc, W = H.getW(), v = H.G.player;
    const b = W.boxes.filter(b => b.h > 8 && b.h < 40 && b.x1 - b.x0 > 14 && b.z1 - b.z0 > 14).sort((a, c) => Math.hypot((a.x0 + a.x1) / 2 - v.x, (a.z0 + a.z1) / 2 - v.z) - Math.hypot((c.x0 + c.x1) / 2 - v.x, (c.z0 + c.z1) / 2 - v.z))[0];
    if (!b) return null;
    v.x = (b.x0 + b.x1) / 2; v.z = (b.z0 + b.z1) / 2; v.y = b.h + 6; v.vx = v.vz = 0; v.vy = 0; v.onGround = false; v.airT = 0; v.h = 0; window.__roof = b;
    return { h: b.h, w: b.x1 - b.x0, d: b.z1 - b.z0 };
  });
  console.log('roof box:', JSON.stringify(r));
  const st = () => page.evaluate(() => { const H = window.__havoc, v = H.G.player, b = window.__roof; return { y: +v.y.toFixed(2), roof: b.h, gnd: v.onGround, hp: Math.round(v.health), kmh: Math.round(Math.hypot(v.vx, v.vz) * 3.6), x: +v.x.toFixed(1), z: +v.z.toFixed(1) }; });
  await page.waitForTimeout(2500);
  console.log('dropped onto roof:', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/roof.png' });
  await page.waitForTimeout(1500);
  console.log('still there:', JSON.stringify(await st()));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3500); await page.keyboard.up('KeyW');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); const q = await st(); if (q.gnd && q.y < q.roof - 2) break; }
  console.log('drove off:', JSON.stringify(await st()), 'ground', await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return +H.heightAt(v.x, v.z).toFixed(2); }));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
