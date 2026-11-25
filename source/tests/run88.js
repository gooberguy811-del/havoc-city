// Show Off mission: locked showroom car refuses you, the mission starts at its marker, style points pass it, the Roadster unlocks
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 520 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => { localStorage.removeItem('havoc.unlocked'); Object.assign(window.__havoc.settings, { map: 'test', quality: 'low', police: 'off' }); window.__havoc.MIS.unlocked = {}; });
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  const feedText = () => page.evaluate(() => [...document.querySelectorAll('#feed .msg')].map(e => e.textContent).join(' | '));
  // on foot next to the showroom car: it refuses
  await page.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(v => v.showroom); p.x = v.x + 2.6; p.z = v.z + 1; p.y = H.heightAt(p.x, p.z); H.toggleVehicle(); });
  await page.waitForTimeout(500);
  console.log('locked showroom:', await feedText(), '| entering:', await page.evaluate(() => !!window.__havoc.HERO.enter));
  // walk to the mission marker
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, g = H.MIS.givers[0].d.giver; p.x = g[0]; p.z = g[1]; });
  await page.waitForTimeout(1500);
  console.log('mission:', await page.evaluate(() => { const M = window.__havoc.MIS; return M.active ? M.active.name + ' · ' + M.objText : 'not started'; }));
  // score: tricks through the real style system (a loop, a hoop, big air)
  await page.evaluate(() => { const H = window.__havoc; H.addStyle('LOOP THE LOOP', 2200); H.addStyle('HOOP', 1000); H.addStyle('MEGA AIR 3.1 s', 3000); });
  await page.waitForTimeout(800);
  console.log('after 3 tricks:', await page.evaluate(() => window.__havoc.MIS.objText), '| hud', await page.evaluate(() => document.getElementById('styPts').textContent + ' ' + document.getElementById('styMult').textContent));
  await page.screenshot({ path: SP + '/test/tz-mission.png' });
  await page.evaluate(() => { const H = window.__havoc; H.STY.runAir = 3.2; });   // one 3.2 s jump also passes it
  await page.waitForTimeout(1500);
  console.log('passed:', await page.evaluate(() => { const M = window.__havoc.MIS; return JSON.stringify({ active: !!M.active, done: !!M.done.showoff, unlocked: !!M.unlocked.roadster }); }), '| banner', await page.evaluate(() => document.getElementById('mbTitle').textContent + ': ' + document.getElementById('mbSub').textContent));
  await page.waitForTimeout(2500);
  console.log('banner 2:', await page.evaluate(() => document.getElementById('mbTitle').textContent + ': ' + document.getElementById('mbSub').textContent));
  // now the showroom Roadster can be driven off its podium
  await page.evaluate(() => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(v => v.showroom); p.x = v.x + 2.6; p.z = v.z + 1; p.y = H.heightAt(p.x, p.z); H.toggleVehicle(); });
  await page.waitForTimeout(2500);
  console.log('driving:', await page.evaluate(() => { const H = window.__havoc; return H.G.player ? H.G.player.cfg.body : 'on foot'; }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  console.log('roadster run:', await page.evaluate(() => { const H = window.__havoc, v = H.G.player; return JSON.stringify({ kmh: Math.round(Math.hypot(v.vx, v.vz) * 3.6), gear: H.G.gear, evGain: +H.SFX.L.ev.g.gain.value.toFixed(2), engGain: +H.SFX.L.eng.g.gain.value.toFixed(2) }); }));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
