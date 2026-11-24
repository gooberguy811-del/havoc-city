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
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'medium', trafficDensity: 0, pedDensity: 0, police: 'off', time: 'day', slowmo: 'off' }); }, MAP);
  // garage line-up
  await page.click('#garageBtn'); await page.waitForTimeout(800);
  for (const b of ['bike', 'outlaw', 'mudslinger', 'zippy', 'flipking']) {
    await page.evaluate(b => { const H = window.__havoc; window.__gs = window.__gs || null; }, b);
    await page.evaluate(b => { const btns = [...document.querySelectorAll('#tabBody .opt')]; const name = window.__havoc.BODIES[b].name; const el = btns.find(x => x.textContent.includes(name)); if (el) el.click(); }, b);
    await page.waitForTimeout(700); await page.screenshot({ path: `${SP}/test/bk-${b}.png` });
  }
  console.log('flip king locked in garage', await page.evaluate(() => [...document.querySelectorAll('#tabBody .opt')].filter(x => x.textContent.includes('Flip King')).map(x => x.textContent)[0]));
  await page.evaluate(() => { const b = [...document.querySelectorAll('#tabBody .opt')].find(x => x.textContent.includes('Viper')); b && b.click(); });
  await page.click('#garageBack').catch(() => {}); await page.waitForTimeout(500);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(4000);
  const ev = (fn, a) => page.evaluate(fn, a);
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(200); } return false; };
  // start the Flip It mission and hop on the dirt bike
  await ev(() => { const H = window.__havoc; H.startMission(H.MISSIONS[H.getW().id].find(m => m.id === 'flip')); });
  await page.waitForTimeout(600);
  await ev(() => { const H = window.__havoc, v = H.MIS.car; H.toggleVehicle(); H.enterVehicle(v); });
  console.log('on the bike', await waitFor(() => { const H = window.__havoc; return H.G.player && H.G.player.bike && H.MIS.s && H.MIS.s.st.t === 'flip'; }, 10000));
  // launch it high and pull a backflip: hold S, then counter with W to level out
  const doFlip = () => page.evaluate(() => new Promise(res => {
    const H = window.__havoc, v = H.G.player, K = H.KEYS; v.y = H.heightAt(v.x, v.z) + 12; v.vy = 9; v.onGround = false; v.flipAcc = 0; v.pitV = 0; v.pit = 0; v.vx = Math.sin(v.h) * 18; v.vz = Math.cos(v.h) * 18;
    let phase = 0, n = 0;
    const tick = () => { n++;
      if (phase === 0) { K.KeyS = true; if (v.flipAcc < -4.6) { K.KeyS = false; phase = 2; } }
      if (phase === 1) { K.KeyW = v.pitV < -0.3; if (v.pitV >= -0.3) { K.KeyW = false; phase = 2; } }
      if (v.onGround || n > 2000 || H.G.onFoot) { K.KeyS = false; K.KeyW = false; res(JSON.stringify({ onGround: v.onGround, onFoot: H.G.onFoot, pit: +v.pit.toFixed(2), last: H.MIS.lastFlip || null })); return; }
      requestAnimationFrame(tick); };
    tick();
  }));
  await page.waitForTimeout(300);
  const shotP = page.waitForTimeout(700).then(() => page.screenshot({ path: `${SP}/test/bk-flip.png` }));
  console.log('flip', await doFlip()); await shotP;
  console.log('mission passed', await waitFor(() => !window.__havoc.MIS.active, 8000), await ev(() => JSON.stringify(window.__havoc.MIS.unlocked)));
  // a sloppy landing throws you off
  await page.waitForTimeout(1500);
  const bad = await ev(() => new Promise(res => { const H = window.__havoc, v = H.G.player, K = H.KEYS; if (!v) return res('no bike'); v.y = H.heightAt(v.x, v.z) + 14; v.vy = 2; v.onGround = false; v.flipAcc = 0; v.pitV = 0; v.pit = 0; K.KeyW = true; const tick = () => { if (v.flipAcc > 2.2) K.KeyW = false; if (v.onGround || v.tumble || H.G.onFoot) { K.KeyW = false; res(JSON.stringify({ thrown: H.G.onFoot })); return; } requestAnimationFrame(tick); }; tick(); }));
  console.log('half frontflip landing', bad);
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
