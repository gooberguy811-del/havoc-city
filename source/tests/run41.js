// stores: placement, buy menu, jewel smash, bank robbery, mechanic, disguise, rubble hitbox
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'medium', time: 'day' }); }, MAP);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 25, pedDensity: 40, slowmo: 'off', quality: 'high', time: 'day', police: 'normal' }); }, MAP);
  await page.screenshot({ path: `${SP}/test/y-menu.png` });
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(3500);
  const waitFor = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(250); } return false; };
  const ev = (fn, a) => page.evaluate(fn, a);
  console.log('world', await ev(() => { const H = window.__havoc, W = H.getW(); return JSON.stringify({ name: W.name, blocks: W.blocks.length, shops: H.SHOP.list.map(s => s.kind), mechs: H.MECH.list.length, planes: H.PLANES.list.length, missions: H.MISSIONS[W.id].map(m => m.id), pug: !!H.PUG.obj, bloom: !!window.__havoc.G && typeof THREE !== 'undefined' && !!THREE.UnrealBloomPass }); }));
  await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/y-${MAP}-start.png` });
  const shot = async (name, fn) => { await ev(fn); await page.waitForTimeout(1400); await page.screenshot({ path: `${SP}/test/y-${MAP}-${name}.png` }); };
  await shot('tsq', () => { const H = window.__havoc, v = H.G.player; v.place(-55, -26, Math.PI / 2, 0); H.CAM.h = Math.PI / 2; });
  await shot('spire', () => { const H = window.__havoc, v = H.G.player; v.place(-12, -100, Math.PI, 0); H.CAM.h = Math.PI; H.CAM.lp = 0.9; H.CAM.lookT = 1e9; });
  await shot('park', () => { const H = window.__havoc, v = H.G.player; H.CAM.lp = 0; v.place(-55, 120, 0, 0); H.CAM.h = 0; });
  await page.keyboard.press('KeyM'); await page.waitForTimeout(600); await page.screenshot({ path: `${SP}/test/y-${MAP}-map.png` }); await page.keyboard.press('KeyM');
  // pug
  const cash0 = await ev(() => window.__havoc.MIS.cash);
  await ev(() => { const H = window.__havoc, o = H.PUG.obj.position, v = H.G.player; v.place(o.x + 9, o.z, -Math.PI / 2, 0); H.CAM.h = -Math.PI / 2; });
  await page.waitForTimeout(800); await page.screenshot({ path: `${SP}/test/y-${MAP}-pug0.png` });
  await ev(() => { const H = window.__havoc, o = H.PUG.obj.position, v = H.G.player; v.place(o.x + 4.5, o.z, -Math.PI / 2, 0); });
  await page.waitForTimeout(1600); await page.screenshot({ path: `${SP}/test/y-${MAP}-pug.png` });
  console.log('pug found', (await ev(() => window.__havoc.MIS.cash)) - cash0, await ev(() => window.__havoc.PUG.rain.length));
  // customers drop when you pull a gun
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'jewel'), v = H.G.player; v.place(st.dx, st.dz, st.fh, 0); H.toggleVehicle(); });
  await page.waitForTimeout(1500);
  await ev(() => { const H = window.__havoc, st = H.SHOP.list.find(s => s.kind === 'jewel'), p = H.HERO.p; p.x = (st.ix0 + st.ix1) / 2; p.z = (st.iz0 + st.iz1) / 2 - 1; H.selectWeapon(0); });
  await page.waitForTimeout(1500);
  const c1 = await ev(() => { const st = window.__havoc.SHOP.list.find(s => s.kind === 'jewel'); return JSON.stringify((st.cust || []).map(p => [p.active, p.prone])); });
  await ev(() => window.__havoc.selectWeapon(1)); await page.waitForTimeout(900);
  console.log('customers before/after gun', c1, await ev(() => { const st = window.__havoc.SHOP.list.find(s => s.kind === 'jewel'); return JSON.stringify((st.cust || []).map(p => [p.active, p.prone])); }));
  await page.screenshot({ path: `${SP}/test/y-${MAP}-prone.png` });
  // web swing from the street
  await ev(() => { const H = window.__havoc, p = H.HERO.p; p.x = -55 + 2.5; p.z = -80; p.y = H.heightAt(p.x, p.z); H.CAM.h = 0; p.h = 0; H.selectWeapon(0); });
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyH'); await page.keyboard.down('KeyW'); await page.waitForTimeout(1500);
  const sw = await ev(() => { const H = window.__havoc, p = H.HERO.p; return JSON.stringify({ fly: H.HERO.fly, web: !!H.HERO.web, y: +p.y.toFixed(1), line: !!(H.WEB.line && H.WEB.line.visible) }); });
  await page.screenshot({ path: `${SP}/test/y-${MAP}-swing.png` });
  await page.keyboard.up('KeyH'); await page.waitForTimeout(500); await page.screenshot({ path: `${SP}/test/y-${MAP}-fly.png` });
  await page.keyboard.up('KeyW');
  console.log('swing', sw, 'landed', await waitFor(() => !window.__havoc.HERO.fly, 20000), await ev(() => JSON.stringify({ hp: Math.round(window.__havoc.HERO.hp), down: window.__havoc.G.down })));
  // hijack the police helicopter
  await ev(() => { const H = window.__havoc; H.addHeat(3.3, 3, true); });
  console.log('heli up', await waitFor(() => window.__havoc.HELI.active, 10000));
  await ev(() => { const H = window.__havoc, h = H.HELI, p = H.HERO.p; h.x = p.x + 20; h.z = p.z + 10; h.y = p.y + 30; });
  await page.keyboard.press('KeyH'); await page.waitForTimeout(800);
  console.log('hijacked', await ev(() => JSON.stringify({ plane: window.__havoc.G.plane && window.__havoc.G.plane.type, heliActive: window.__havoc.HELI.active })));
  const y0 = await ev(() => window.__havoc.G.plane ? window.__havoc.G.plane.y : 0);
  await page.keyboard.down('Space'); await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('Space');
  console.log('heli climbs', +(await ev(() => window.__havoc.G.plane ? window.__havoc.G.plane.y : 0) - y0).toFixed(1), 'speed', await ev(() => window.__havoc.G.plane ? +window.__havoc.G.plane.speed.toFixed(1) : 0));
  await page.screenshot({ path: `${SP}/test/y-${MAP}-heli.png` });
  await page.keyboard.up('KeyW');
  // chopper cannon
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(700); await page.keyboard.up('KeyQ');
  console.log('cannon fired', await ev(() => window.__havoc.GT - window.__havoc.ARMS.lastShot < 2));
  // Stinger cannon
  await ev(() => { const H = window.__havoc; H.wanted.heat = 0; H.wanted.stars = 0; H.settings.police = 'off'; if (H.G.plane) { const pl = H.G.plane; pl.y = H.heightAt(pl.x, pl.z) + 0.5; pl.ground = true; pl.V.set(0, 0, 0); H.leavePlane(); } });
  await page.waitForTimeout(600);
  await ev(() => { const H = window.__havoc, pl = H.PLANES.list.find(q => q.type === 'stinger' && !q.remote && !q.wreck); H.HERO.p.x = pl.x; H.HERO.p.z = pl.z; H.enterPlane(pl); pl.y = 60; pl.ground = false; pl.V.set(Math.sin(pl.yaw) * 50, 0, Math.cos(pl.yaw) * 50); pl.T = 0.8; });
  await page.waitForTimeout(500); await page.keyboard.down('KeyQ'); await page.waitForTimeout(400); await page.screenshot({ path: `${SP}/test/y-${MAP}-jetgun.png` }); await page.waitForTimeout(300); await page.keyboard.up('KeyQ');
  console.log('jet cannon fired', await ev(() => window.__havoc.GT - window.__havoc.ARMS.lastShot < 2));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
