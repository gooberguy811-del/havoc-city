const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'perth';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 10, slowmo: 'off', quality: 'low', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  console.log(MAP, await page.evaluate(() => { const H = window.__havoc, W = H.getW(); return JSON.stringify({ planes: H.PLANES.list.length, road: W.airport.roads, bounds: W.bounds }); }));
  const st = () => page.evaluate(() => { const H = window.__havoc, pl = H.G.plane; const r = { mode: pl ? 'plane' : H.G.onFoot ? 'foot' : 'car', down: H.G.down > 0, sub: document.querySelector('#bannerSub').textContent }; if (pl) Object.assign(r, { gnd: pl.ground, spd: +pl.V.length().toFixed(1), vy: +pl.V.y.toFixed(1), alt: +(pl.y - H.heightAt(pl.x, pl.z)).toFixed(1), pitch: +pl.pitch.toFixed(2), hp: Math.round(pl.hp), wreck: pl.wreck }); else if (H.HERO.p && H.G.onFoot) Object.assign(r, { y: +H.HERO.p.y.toFixed(1), chute: H.HERO.chute ? (H.HERO.chute.free ? 'free' : 'open') : null, vy: +H.HERO.vy.toFixed(1), hp: Math.round(H.HERO.hp) }); return JSON.stringify(r); });
  // drive the access road toward the terminal
  await page.evaluate(() => { const H = window.__havoc, W = H.getW(), r = W.airport.roads[0], P = H.G.player, dir = W.airport.site.vx; P.place(dir > 0 ? r.x0 - 30 : r.x1 + 30, r.z + 3, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0); H.CAM.h = P.h; });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3500); await page.keyboard.up('KeyW');
  await page.screenshot({ path: `${SP}/test/q-${MAP}-road.png` });
  console.log('drove to', await page.evaluate(() => { const P = window.__havoc.G.player; return [Math.round(P.x), Math.round(P.z), Math.round(P.speed)]; }));
  // landing approach in the Sparrow
  await page.evaluate(() => { const H = window.__havoc, W = H.getW(), A = W.airport.site, pl = H.PLANES.list[0]; H.G.player.vx = H.G.player.vz = 0; H.toggleVehicle(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const H = window.__havoc, W = H.getW(), A = W.airport.site, pl = H.PLANES.list[0]; const p = H.HERO.p; p.x = pl.x; p.z = pl.z - 3; H.enterPlane(pl);
    const u = -330, v = 301; pl.x = A.ox + u * A.ux + v * A.vx; pl.z = A.oz + u * A.uz + v * A.vz; pl.yaw = Math.atan2(A.ux, A.uz); pl.y = 14; pl.ground = false; pl.pitch = -0.04; pl.T = 0.05; const f = [Math.sin(pl.yaw), Math.cos(pl.yaw)]; pl.V.set(f[0] * 30, -2, f[1] * 30); H.CAM.h = pl.yaw; });
  for (let k = 0; k < 30; k++) { await page.waitForTimeout(600); const s = JSON.parse(await st()); if (k % 2 === 0 || s.gnd) console.log(' approach', JSON.stringify(s)); if (k === 3) await page.screenshot({ path: `${SP}/test/q-${MAP}-approach.png` }); if (s.gnd && s.spd < 26) break; }
  await page.keyboard.down('KeyS'); await page.waitForTimeout(3000); await page.keyboard.up('KeyS');
  console.log('landed', await st());
  await page.screenshot({ path: `${SP}/test/q-${MAP}-landed.png` });
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
