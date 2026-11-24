const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon', IDX = +(process.argv[4] || 0);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 10, slowmo: 'off', quality: 'low', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  console.log(MAP, 'airport', await page.evaluate(() => { const H = window.__havoc, W = H.getW(); return JSON.stringify({ planes: H.PLANES.list.map(p => [p.type, Math.round(p.x), Math.round(p.z), +p.yaw.toFixed(2)]), bounds: W.bounds, road: W.airport.roads }); }));
  const st = () => page.evaluate(() => { const H = window.__havoc, pl = H.G.plane, P = pl || H.PF(); const r = { mode: pl ? 'plane' : H.G.onFoot ? 'foot' : 'car', down: H.G.down > 0 }; if (pl) Object.assign(r, { gnd: pl.ground, spd: +pl.V.length().toFixed(1), gs: +pl.gs.toFixed(1), alt: +(pl.y - H.heightAt(pl.x, pl.z)).toFixed(1), T: +pl.T.toFixed(2), pitch: +pl.pitch.toFixed(2), roll: +pl.roll.toFixed(2), yaw: +pl.yaw.toFixed(2), hp: Math.round(pl.hp), wreck: pl.wreck }); else if (H.HERO.p) Object.assign(r, { y: +H.HERO.p.y.toFixed(1), chute: !!H.HERO.chute, vy: +H.HERO.vy.toFixed(1), hp: Math.round(H.HERO.hp) }); r.prompt = document.querySelector('#prompt').hidden ? '' : document.querySelector('#prompt').textContent; return JSON.stringify(r); });
  // walk up to a parked plane and get in
  await page.keyboard.press('KeyF'); await page.waitForTimeout(1000);
  await page.evaluate(i => { const H = window.__havoc, pl = H.PLANES.list[i], p = H.HERO.p; p.x = pl.x - Math.cos(pl.yaw) * 3.5; p.z = pl.z + Math.sin(pl.yaw) * 3.5; }, IDX);
  await page.waitForTimeout(600);
  console.log('near plane', await st());
  await page.screenshot({ path: `${SP}/test/p-${MAP}-near.png` });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(800);
  console.log('in plane', await st());
  await page.screenshot({ path: `${SP}/test/p-${MAP}-in.png` });
  // line up on the runway with some speed
  await page.evaluate(() => { const H = window.__havoc, W = H.getW(), A = W.airport.site, pl = H.G.plane; const u = -310, v = 301; pl.x = A.ox + u * A.ux + v * A.vx; pl.z = A.oz + u * A.uz + v * A.vz; pl.yaw = Math.atan2(A.ux, A.uz); pl.gs = pl.def.vrot * 0.6; pl.T = 1; H.CAM.h = pl.yaw; });
  await page.keyboard.down('KeyW');
  for (let k = 0; k < 6; k++) { await page.waitForTimeout(700); console.log(' roll', await st()); }
  await page.keyboard.down('Space');
  for (let k = 0; k < 8; k++) { await page.waitForTimeout(600); const s = JSON.parse(await st()); console.log(' climb', JSON.stringify(s)); if (k === 4) await page.screenshot({ path: `${SP}/test/p-${MAP}-takeoff.png` }); }
  await page.keyboard.up('Space');
  await page.keyboard.down('KeyD');
  for (let k = 0; k < 5; k++) { await page.waitForTimeout(600); console.log(' bank', await st()); }
  await page.screenshot({ path: `${SP}/test/p-${MAP}-bank.png` });
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(1500);
  await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC'); await page.waitForTimeout(700);
  await page.screenshot({ path: `${SP}/test/p-${MAP}-cockpit.png` });
  await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
  console.log('level', await st());
  await page.keyboard.up('KeyW');
  // big map while flying
  await page.keyboard.press('KeyM'); await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/test/p-${MAP}-map.png` }); await page.keyboard.press('KeyM');
  // bail out
  await page.evaluate(() => { const pl = window.__havoc.G.plane; if (pl && pl.y < 40) pl.y = 60; });
  await page.keyboard.press('KeyF'); await page.waitForTimeout(400);
  for (let k = 0; k < 5; k++) { await page.waitForTimeout(700); console.log(' chute', await st()); if (k === 2) await page.screenshot({ path: `${SP}/test/p-${MAP}-chute.png` }); }
  for (let k = 0; k < 10; k++) { await page.waitForTimeout(1500); const s = JSON.parse(await st()); const w = await page.evaluate(() => window.__havoc.PLANES.list.filter(p => p.wreck).length); console.log(' after', JSON.stringify(s), 'wrecks', w); if (!s.chute && w) break; }
  await page.screenshot({ path: `${SP}/test/p-${MAP}-end.png` });
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
