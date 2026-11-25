// Roadster thruster pack: Air gauge only in the Roadster, J lifts off and hovers, W thrusts, the tank drains and refills,
// thruster flights earn no stunt or style points, and a flying Roadster can't leave the map over the edge walls
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
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'test', quality: 'low', police: 'off' }); window.__havoc.MIS.unlocked = { roadster: true }; });
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  const gauge = () => page.evaluate(() => JSON.stringify({ label: !document.getElementById('airLabel').hidden, row: !document.getElementById('airRow').hidden, fill: document.getElementById('airFill').style.width }));
  console.log('starting car gauge:', await page.evaluate(() => window.__havoc.G.player && window.__havoc.G.player.cfg.body), await gauge());
  // get out and into the showroom Roadster
  await page.evaluate(() => { const H = window.__havoc; H.MIS.unlocked.roadster = true; if (!H.G.onFoot) H.toggleVehicle(); });
  await page.waitForTimeout(1200);
  console.log('on foot gauge:', await gauge());
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(v => v.showroom); p.x = v.x + 2.6; p.z = v.z + 1; p.y = H.heightAt(p.x, p.z); H.toggleVehicle(); });
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => !!window.__havoc.G.player && !window.__havoc.G.onFoot)) break; }
  await page.waitForTimeout(800);
  console.log('feed:', await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(v => v.showroom); return [...document.querySelectorAll('#feed .msg')].map(e => e.textContent).join(' | ') + ' | enter ' + !!H.HERO.enter + ' onFoot ' + H.G.onFoot + ' d ' + Math.hypot(p.x - v.x, p.z - v.z).toFixed(1) + ' locked ' + JSON.stringify(H.MIS.unlocked); }));
  const st = () => page.evaluate(() => { const H = window.__havoc, v = H.G.player; return { body: v.cfg.body, agl: +(v.y - H.heightAt(v.x, v.z)).toFixed(1), vy: +(v.vy || 0).toFixed(1), kmh: Math.round(Math.hypot(v.vx, v.vz) * 3.6), air: +v.air.toFixed(2), jet: !!v.jetOn, gnd: v.onGround, hp: Math.round(v.health), thr: +H.SFX.L.thr.g.gain.value.toFixed(2), sty: H.STY.pts || 0, best: H.G.stats.bestAir, pit: +v.pit.toFixed(2) }; });
  console.log('in roadster:', JSON.stringify(await st()), await gauge());
  console.log('tip:', await page.evaluate(() => [...document.querySelectorAll('#feed .msg')].map(e => e.textContent).filter(t => /Thruster/.test(t)).join(' | ')));
  const hp0 = (await st()).hp;
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(1200);
  console.log('J held 1.2 s:', JSON.stringify(await st()), await gauge());
  await page.screenshot({ path: SP + '/test/thrust-1.png' });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1300);
  console.log('J+W 1.3 s:', JSON.stringify(await st()));
  await page.screenshot({ path: SP + '/test/thrust-2.png' });
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyJ'); await page.waitForTimeout(150);
  console.log('released:', JSON.stringify(await st()));
  // feather it down: tap J while falling
  for (let i = 0; i < 40; i++) { const s = await st(); if (s.gnd) break; if (s.vy < -6) { await page.keyboard.down('KeyJ'); await page.waitForTimeout(120); await page.keyboard.up('KeyJ'); } else await page.waitForTimeout(120); }
  await page.waitForTimeout(600);
  const landed = await st();
  console.log('landed:', JSON.stringify(landed), 'damage', hp0 - landed.hp, '| stunt banner', await page.evaluate(() => document.getElementById('stunt').style.opacity));
  await page.waitForTimeout(3000);
  console.log('3 s on the ground (refill):', JSON.stringify(await st()), await gauge());
  // empty the tank: hold J until it runs out, then it falls
  await page.keyboard.down('KeyJ');
  let emptyAt = null; for (let i = 0; i < 60; i++) { await page.waitForTimeout(200); const s = await st(); if (!s.jet && !s.gnd) { emptyAt = s; break; } }
  await page.keyboard.up('KeyJ');
  console.log('tank empty:', JSON.stringify(emptyAt), await page.evaluate(() => document.getElementById('airRow').className));
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); if ((await st()).gnd) break; }
  console.log('after free fall:', JSON.stringify(await st()));
  // the map edge: fly toward the east bound
  await page.evaluate(() => { const H = window.__havoc, v = H.G.player, B = H.getW().bounds; v.air = 1; v.x = B.x1 - 30; v.z = (B.z0 + B.z1) / 2; v.h = Math.PI / 2; v.vx = 30; v.vz = 0; v.y = H.heightAt(v.x, v.z) + 20; v.onGround = false; v.vy = 0; });
  await page.keyboard.down('KeyJ'); await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyJ');
  console.log('edge:', await page.evaluate(() => { const H = window.__havoc, v = H.G.player, B = H.getW().bounds; return JSON.stringify({ x: +v.x.toFixed(1), x1: B.x1, inside: v.x <= B.x1 }); }));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
