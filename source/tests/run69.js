// schools: kids in the playground, weapons ban, kids go inside on danger; snatch job present
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon', TAG = 'sc';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/net::/.test(m.text())) errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => { const u = r.request().url(); r.fulfill({ path: SP + '/vendor/package/examples/js/' + u.split('/examples/js/')[1], contentType: 'application/javascript' }); });
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'high', trafficDensity: 10, pedDensity: 20, police: 'normal', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4500);
  const ev = (fn, a) => page.evaluate(fn, a);
  const S = await ev(() => { const s = window.__havoc.getW().schools[0]; return s && { cx: s.cx, cz: s.cz, yard: s.yard, block: s.block, name: s.name }; });
  console.log('school', JSON.stringify(S && { name: S.name, cx: S.cx, cz: S.cz }), 'snatch job', await ev(() => window.__havoc.MISSIONS[window.__havoc.getW().id].some(d => d.id === 'snatch')));
  // walk to the gate side of the school
  await ev(([x, z]) => { const H = window.__havoc; if (!H.G.onFoot) H.toggleVehicle(); const p = H.HERO.p; p.x = x; p.z = z; p.y = 0.15; H.wantedObj().heat = 0; H.wantedObj().stars = 0; }, [S.cx, S.block.z0 - 8]);
  for (let k = 0; k < 30 && !(await ev(() => window.__havoc.KIDS.shown)); k++) await page.waitForTimeout(400);
  await page.waitForTimeout(1500);
  console.log('kids out', await ev(() => JSON.stringify({ shown: window.__havoc.KIDS.shown, n: window.__havoc.KIDS.list.filter(k => k.on).length, inPedList: window.__havoc.PED.list.some(p => p.kid) })));
  const yc = [(S.yard.x0 + S.yard.x1) / 2, (S.yard.z0 + S.yard.z1) / 2];
  await ev(c => { window.__havoc.CAM.free = c; }, [[yc[0] - 22, 14, yc[1] - 24], [yc[0], 0, yc[1]]]); await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-1-yard.png` });
  await ev(c => { window.__havoc.CAM.free = c; }, [[S.cx + 30, 9, S.block.z0 - 24], [S.cx, 3, S.cz]]); await page.waitForTimeout(1500); await page.screenshot({ path: `${SP}/test/${TAG}-${MAP}-2-front.png` });
  await ev(() => { window.__havoc.CAM.free = null; });
  // weapons ban: step onto the school grounds with a pistol and pull the trigger
  await ev(([x, z]) => { const H = window.__havoc, p = H.HERO.p; p.x = x; p.z = z; H.selectWeapon(1); window.__s0 = H.ARMS.lastShot; }, [S.cx + 2, S.block.z0 + 2]);
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyQ'); await page.waitForTimeout(800); await page.keyboard.up('KeyQ');
  console.log('banned here', await ev(() => window.__havoc.weaponsBanned()), 'fired', await ev(() => window.__havoc.ARMS.lastShot !== window.__s0), 'kids still out', await ev(() => window.__havoc.KIDS.shown));
  // an explosion two blocks away: the kids go in at once
  await ev(([x, z]) => { window.__havoc.explode(x, 0.5, z, 1.2, null); }, [S.cx + 90, S.cz]);
  await page.waitForTimeout(300);
  console.log('after explosion kids shown', await ev(() => window.__havoc.KIDS.shown));
  // can a car get into the playground? drive at the fence
  console.log('yard fenced', await ev(([x, z]) => { const H = window.__havoc, W = H.getW(), bs = []; W.boxGrid.query(x - 60, z - 60, x + 60, z + 60, bs); return bs.filter(b => b.kind === 'rail').length; }, yc));
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
