// Testing Zone trials: Show Off counts car tricks only (unlocks the Roadster), Show Off on Two Wheels counts motorbike tricks only
// (unlocks the Volt RR); then the Volt RR comes off its podium and flies on its thrusters
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
  await page.evaluate(() => { localStorage.removeItem('havoc.unlocked'); Object.assign(window.__havoc.settings, { map: 'test', quality: 'low', police: 'off' }); });
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  await page.evaluate(() => { window.__havoc.MIS.unlocked = {}; });
  const obj = () => page.evaluate(() => { const M = window.__havoc.MIS; return M.active ? M.active.name + ' · ' + M.objText.replace(/<[^>]+>/g, ' ') : 'no mission'; });
  const unl = () => page.evaluate(() => JSON.stringify(window.__havoc.MIS.unlocked));
  const inVeh = () => page.evaluate(() => { const H = window.__havoc; return H.G.onFoot ? 'on foot' : H.G.player.cfg.body; });
  const getIn = async (pred) => {
    await page.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(200); if (await page.evaluate(() => window.__havoc.G.onFoot)) break; }
    await page.waitForTimeout(600);
    await page.evaluate(pred => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(new Function('v', 'return ' + pred)); p.x = v.x + 1.8; p.z = v.z + 0.6; p.y = H.heightAt(p.x, p.z); H.toggleVehicle(); }, pred);
    for (let i = 0; i < 60; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => !window.__havoc.G.onFoot && !!window.__havoc.G.player)) break; }
    await page.waitForTimeout(500);
  };
  console.log('parked:', await page.evaluate(() => window.__havoc.VEH.list.filter(v => v.kind === 'parked' || v.showroom).map(v => v.cfg.body + (v.showroom ? '*' : '')).join(', ')));
  // the car trial, in the parked car
  await getIn("v.cfg.body === 'viper' && !v.showroom && v !== window.__havoc.G.myCar && Math.hypot(v.x + 22, v.z - 30) < 3");
  console.log('car trial vehicle:', await inVeh());
  await page.evaluate(() => { const H = window.__havoc, v = H.G.player; v.x = -30; v.z = 22; v.vx = v.vz = 0; });
  await page.waitForTimeout(1800);
  console.log('started:', await obj());
  await page.evaluate(() => window.__havoc.addStyle('LOOP THE LOOP', 9000)); await page.waitForTimeout(600);
  console.log('car tricks:', await obj());
  // switch to a bike mid-trial: bike tricks don't count
  await getIn("v.cfg.body === 'mudslinger' && !v.showroom");
  console.log('now on:', await inVeh(), '|', await obj());
  await page.evaluate(() => window.__havoc.addStyle('BACKFLIP', 9000)); await page.waitForTimeout(600);
  await page.evaluate(() => { window.__havoc.STY.runAir = 3.4; }); await page.waitForTimeout(600);
  console.log('after bike tricks + 3.4 s air on the bike:', await obj(), '| unlocked', await unl());
  // back in the car to finish it
  await getIn("v.cfg.body === 'viper' && !v.showroom && Math.hypot(v.x + 30, v.z - 22) < 25");
  await page.evaluate(() => window.__havoc.addStyle('HUGE AIR', 7000)); await page.waitForTimeout(1500);
  console.log('car trial done:', await obj(), '| unlocked', await unl());
  await page.waitForTimeout(3000);
  // the bike trial: start it on the bike
  await getIn("v.cfg.body === 'mudslinger' && !v.showroom");
  await page.evaluate(() => { const H = window.__havoc, v = H.G.player; v.x = -30; v.z = -52; v.vx = v.vz = 0; });
  await page.waitForTimeout(1800);
  console.log('bike trial started:', await obj());
  await page.evaluate(() => window.__havoc.addStyle('BACKFLIP', 6000)); await page.waitForTimeout(600);
  console.log('bike tricks:', await obj());
  await getIn("v.cfg.body === 'viper' && !v.showroom");
  await page.evaluate(() => { window.__havoc.addStyle('DRIFT', 9000); window.__havoc.STY.runAir = 3.5; }); await page.waitForTimeout(800);
  console.log('car tricks in the bike trial:', await obj());
  await getIn("v.cfg.body === 'mudslinger' && !v.showroom");
  await page.evaluate(() => { window.__havoc.STY.runAir = 3.1; }); await page.waitForTimeout(1500);
  console.log('bike trial done:', await obj(), '| unlocked', await unl());
  await page.waitForTimeout(3000);
  // ride the Volt RR off its podium and fly it
  await getIn("v.showroom && v.cfg.body === 'voltbike'");
  console.log('riding:', await inVeh(), 'air gauge', await page.evaluate(() => !document.getElementById('airRow').hidden));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(1300);
  const fl = await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return { agl: +(v.y - H.heightAt(v.x, v.z)).toFixed(1), jet: !!v.jetOn, air: +v.air.toFixed(2), plumes: v.jetFX ? v.jetFX.children.length : 0, pit: +v.pit.toFixed(2), kmh: Math.round(Math.hypot(v.vx, v.vz) * 3.6), ev: +H.SFX.L.ev.g.gain.value.toFixed(2) }; });
  console.log('volt flying:', JSON.stringify(fl));
  await page.screenshot({ path: SP + '/test/volt-fly.png' });
  await page.keyboard.up('KeyJ');
  for (let i = 0; i < 80; i++) { const q = await page.evaluate(() => { const v = window.__havoc.G.player; return v ? { g: v.onGround, vy: v.vy || 0 } : null; }); if (!q || q.g) break; if (q.vy < -6) { await page.keyboard.down('KeyJ'); await page.waitForTimeout(120); await page.keyboard.up('KeyJ'); } else await page.waitForTimeout(120); }
  await page.waitForTimeout(800);
  console.log('volt landed:', await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return v ? JSON.stringify({ gnd: v.onGround, hp: Math.round(v.health), thrown: H.G.onFoot }) : 'rider thrown off'; }));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
