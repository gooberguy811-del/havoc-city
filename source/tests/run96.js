// Volt RR air control: holding W in the air (off a ramp, or right after the thrusters) must not flip it; holding S backflips
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
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'test', quality: 'low', police: 'off' }); });
  await page.click('.mapcard[data-map="test"]'); await page.evaluate(() => document.querySelector('#playBtn').click()); await page.waitForTimeout(3500);
  await page.evaluate(() => { window.__havoc.MIS.unlocked.voltbike = true; const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(200); if (await page.evaluate(() => window.__havoc.G.onFoot)) break; }
  await page.waitForTimeout(600);
  const ride = async pred => {
    await page.evaluate(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); });
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(200); if (await page.evaluate(() => window.__havoc.G.onFoot)) break; }
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => { const p = window.__havoc.HERO.p; return p && p.active && !p.rag && !window.__havoc.G.down; })) break; }
    await page.waitForTimeout(500);
    await page.evaluate(pred => { const H = window.__havoc, p = H.HERO.p, v = H.VEH.list.find(new Function('v', 'return ' + pred)); p.x = v.x + 1.6; p.z = v.z + 0.5; p.y = H.heightAt(p.x, p.z); H.toggleVehicle(); }, pred);
    for (let i = 0; i < 60; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => !window.__havoc.G.onFoot && !!window.__havoc.G.player)) break; }
    await page.waitForTimeout(400);
  };
  // put the bike 25 m up, moving forward, then hold a key for a second and see how far it has spun
  let cur = null;
  const air = async (key, label, jetFirst) => {
    if (await page.evaluate(() => !window.__havoc.G.player)) await ride(cur);
    await page.evaluate(() => { const H = window.__havoc, v = H.G.player; v.x = 100; v.z = -120; v.h = Math.PI / 2; v.y = H.heightAt(v.x, v.z) + 14; v.vx = 25; v.vz = 0; v.vy = 2; v.onGround = false; v.tumble = false; v.pit = v.pitV = v.rollV = v.roll = 0; v.flipAcc = 0; v.air = 1; v.airT = 0; });
    if (jetFirst) { await page.keyboard.down('KeyJ'); if (key) await page.keyboard.down(key); await page.waitForTimeout(800); await page.keyboard.up('KeyJ'); }
    else if (key) await page.keyboard.down(key);
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => { const v = window.__havoc.G.player; return { pit: +v.pit.toFixed(2), turns: +((v.flipAcc || 0) / (2 * Math.PI)).toFixed(2), pitV: +v.pitV.toFixed(2) }; });
    if (key) await page.keyboard.up(key);
    console.log(label.padEnd(36), JSON.stringify(r));
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); if (await page.evaluate(() => !window.__havoc.G.player || window.__havoc.G.player.onGround)) break; }
    await page.waitForTimeout(400);
    if (await page.evaluate(() => !window.__havoc.G.player)) { console.log('   (thrown off)'); return false; }
    return true;
  };
  cur = "v.cfg.body === 'voltbike'"; await ride(cur);
  console.log('riding', await page.evaluate(() => window.__havoc.G.player.cfg.body));
  await air(null, 'Volt RR, no keys');
  await air('KeyW', 'Volt RR, holding W');
  await air('KeyW', 'Volt RR, J+W then let go of J', true);
  await air('KeyS', 'Volt RR, holding S');
  cur = "v.cfg.body === 'bike' && !v.showroom"; await ride(cur);
  console.log('riding', await page.evaluate(() => window.__havoc.G.player && window.__havoc.G.player.cfg.body));
  await air('KeyW', 'Razor 600, holding W (front flip)');
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await browser.close();
})();
