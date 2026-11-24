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
  // free fall from 220 m
  await page.evaluate(() => { const H = window.__havoc, pl = H.G.plane; pl.ground = false; pl.y = 220; pl.T = 0.8; pl.pitch = 0; const f = [Math.sin(pl.yaw), Math.cos(pl.yaw)]; pl.V.set(f[0] * 40, 0, f[1] * 40); });
  await page.waitForTimeout(300); await page.keyboard.press('KeyF');
  for (let k = 0; k < 40; k++) { await page.waitForTimeout(800); const s = JSON.parse(await st()); console.log(' fall', JSON.stringify(s)); if (k === 1) await page.screenshot({ path: `${SP}/test/q-${MAP}-freefall.png` }); if (s.chute === 'open' && !globalThis.shot) { globalThis.shot = 1; await page.screenshot({ path: `${SP}/test/q-${MAP}-open.png` }); } if (s.y !== undefined && s.y < 3 && !s.chute) break; }
  // fly the jet into the terminal
  const tgt = await page.evaluate(() => { const H = window.__havoc, W = H.getW(), A = W.airport.site, pl = H.PLANES.list.find(p => p.type === 'stinger' && !p.wreck);
    const s = H.STR.list.find(q => q.kind === 'bldg' && q.bldgs.some(b => b.h === 12 && b.x1 - b.x0 > 20)); const hp0 = s ? Math.round(s.hp) : null;
    const p = H.HERO.p; p.x = pl.x + 3; p.z = pl.z; H.enterPlane(pl);
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2; pl.x = cx - A.vx * 140; pl.z = cz - A.vz * 140 + 0.01; pl.yaw = Math.atan2(cx - pl.x, cz - pl.z); pl.y = 6; pl.ground = false; pl.T = 1; pl.pitch = 0; pl.V.set(Math.sin(pl.yaw) * 80, 0, Math.cos(pl.yaw) * 80); H.CAM.h = pl.yaw; return { hp0, top: s.top }; });
  await page.waitForTimeout(6000);
  console.log('terminal', JSON.stringify(tgt), await st(), await page.evaluate(() => { const s = window.__havoc.STR.list.find(q => q.kind === 'bldg' && q.bldgs.some(b => b.h === 12 && b.x1 - b.x0 > 20)); return JSON.stringify({ hp: Math.round(s.hp), state: s.state }); }));
  await page.screenshot({ path: `${SP}/test/q-${MAP}-crash.png` });
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
