// Fort Redrock: map, choppers, V missiles vs police heli, car lock
const { chromium } = require('playwright');
const SP = process.argv[2], TAG = process.argv[3] || 'fr';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SP}/test/${TAG}-0-menu.png` });
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'base', quality: 'high', trafficDensity: 30, pedDensity: 30, police: 'normal', time: 'day' }); });
  const t0 = Date.now(); await page.click(`.mapcard[data-map="base"]`); await page.click('#playBtn'); await page.waitForTimeout(5000);
  const ev = (fn, a) => page.evaluate(fn, a);
  const waitFor = async (fn, ms, arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
  console.log('world', await ev(() => { const H = window.__havoc, W = H.getW(); return JSON.stringify({ name: W.name, blocks: W.blocks.length, bldgs: W.bldgs.length, details: W.details.length, planes: H.PLANES.list.map(p => p.type), parked: W.parked.length, stores: H.SHOP.list.map(s => s.kind) }); }));
  await page.screenshot({ path: `${SP}/test/${TAG}-1-town.png` });
  const shot = async (name, cam) => { await ev(c => { window.__havoc.CAM.free = c; }, cam); await page.waitForTimeout(1300); await page.screenshot({ path: `${SP}/test/${TAG}-${name}.png` }); };
  await shot('2-gate', [[-215, 6, 30], [-150, 3, 8]]);
  await shot('3-helipads', [[150, 40, -40], [240, 0, -160]]);
  await shot('4-airfield', [[40, 60, -250], [260, 0, -380]]);
  await shot('5-tanks', [[130, 30, 300], [240, 0, 150]]);
  await shot('6-overview', [[-500, 260, 420], [150, 0, -60]]);
  await ev(() => { window.__havoc.CAM.free = null; });
  // fly a Hornet
  const hp = await ev(() => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const pl = H.PLANES.list.find(q => q.type === 'hornet'); H.HERO.p.x = pl.x + 3; H.HERO.p.z = pl.z; H.HERO.p.y = H.heightAt(pl.x, pl.z); H.enterPlane(pl); return { hp: pl.hp, stars: H.wantedObj().stars }; });
  console.log('hornet boarded', JSON.stringify(hp));
  await page.keyboard.down('Space'); await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW'); await page.keyboard.up('Space');
  console.log('hornet flying', await ev(() => { const pl = window.__havoc.G.plane; return JSON.stringify({ y: Math.round(pl.y - window.__havoc.heightAt(pl.x, pl.z)), sp: Math.round(pl.speed), ground: pl.ground }); }));
  await page.screenshot({ path: `${SP}/test/${TAG}-7-hornet.png` });
  await page.keyboard.press('KeyB'); await page.waitForTimeout(500);
  console.log('rockets', await ev(() => JSON.stringify({ left: window.__havoc.G.plane.rocketsLeft, flying: window.__havoc.ARMS.rockets.length, hud: document.querySelector('#bombsV').textContent })));
  await page.screenshot({ path: `${SP}/test/${TAG}-8-rockets.png` });
  // police chopper: 500 HP, three V missiles bring it down
  await ev(() => { const H = window.__havoc, pl = H.G.plane; H.leavePlane(); const p = H.HERO.p; p.rag = null; H.HERO.chute = null; p.x = -400; p.z = 16; p.y = H.heightAt(-400, 16); H.HERO.hp = 100; H.wantedObj().heat = 3.5; H.wantedObj().stars = 3; });
  console.log('heli spawned', await waitFor(() => window.__havoc.HELI.active, 20000));
  await ev(() => { const H = window.__havoc, p = H.HERO.p; H.HELI.x = p.x + 25; H.HELI.z = p.z + 10; H.HELI.y = 45; });
  console.log('heli hp', await ev(() => window.__havoc.HELI.hp), 'overhead', await ev(() => window.__havoc.heliOverhead()), 'prompt', await ev(() => document.querySelector('#prompt').textContent));
  await page.screenshot({ path: `${SP}/test/${TAG}-9-lock.png` });
  const hits = [];
  for (let k = 0; k < 5 && !(await ev(() => window.__havoc.HELI.down || !window.__havoc.HELI.active)); k++) {
    await page.keyboard.press('KeyV'); await page.waitForTimeout(300);
    if (k === 0) await page.screenshot({ path: `${SP}/test/${TAG}-10-missile.png` });
    await waitFor(() => !window.__havoc.ARMS.rockets.some(r => r.homing), 12000);
    hits.push(await ev(() => Math.round(window.__havoc.HELI.hp)));
    await page.waitForTimeout(1100);
  }
  console.log('hp after each missile', JSON.stringify(hits), 'down', await ev(() => window.__havoc.HELI.down || !window.__havoc.HELI.active));
  await page.screenshot({ path: `${SP}/test/${TAG}-11-down.png` });
  // car lock: thieves give up
  await ev(() => { const H = window.__havoc; H.wantedObj().heat = 0; H.wantedObj().stars = 0; });
  const lock = await ev(() => { const H = window.__havoc, v = H.VEH.list.find(q => q.kind === 'parked' && !q.mission && !q.forSale && !q.remote); const p = H.HERO.p; p.x = v.x + 3; p.z = v.z; H.enterVehicle(v); H.toggleVehicle(); const a = H.stealCandidate(v, { x: v.x + 50, z: v.z }); H.toggleLock(); const b = H.stealCandidate(v, { x: v.x + 50, z: v.z }); return { before: a, locked: v.locked, after: b, mine: H.G.myCar === v }; });
  console.log('lock', JSON.stringify(lock));
  await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/test/${TAG}-12-lock.png` });
  console.log('load ms', Date.now() - t0);
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
