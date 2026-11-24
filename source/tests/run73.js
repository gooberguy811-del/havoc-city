// sound engine: every recording decodes, every SFX call runs, loops follow the car / plane / sirens
const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 520 } }); const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', quality: 'low', police: 'normal' }));
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn');
  const t0 = Date.now(); while (Date.now() - t0 < 20000 && !(await page.evaluate(() => window.__havoc.SFX.ready))) await page.waitForTimeout(250);
  console.log('ready after', Date.now() - t0, 'ms', await page.evaluate(() => { const S = window.__havoc.SFX; return JSON.stringify({ state: S.ctx && S.ctx.state, bufs: Object.keys(S.bufs).length, want: Object.keys(window.__havoc.SND_DATA).length, loops: Object.keys(S.L).length, missing: Object.keys(window.__havoc.SND_DATA).filter(k => !S.bufs[k]), durs: Object.fromEntries(Object.entries(S.bufs).slice(0, 6).map(([k, b]) => [k, +b.duration.toFixed(2)])) }); }));
  // fire every one-shot method
  const r = await page.evaluate(() => {
    const S = window.__havoc.SFX, out = [];
    const calls = [['crash', 20], ['crash', 8], ['crash', 3], ['metal', 0.6], ['glass', 1], ['punch'], ['door'], ['chirp', true], ['chirp', false], ['ding'], ['cash'], ['passed'], ['fail'], ['thud', 10, 0, 0], ['explode', 0.8], ['collapse', 0.8, true], ['collapse', 0.6, false], ['boom', 0.9, true, 10], ['boom', 0.7, false, 100], ['boom', 0.6, true, 200], ['boom'], ['cannon'], ['clank', 1], ['splash'], ['splashBig', 1], ['beep', 0, 0], ['scream', 0, 0], ['sting'], ['down'], ['gun', 'pistol', 1], ['gun', 'smg', 1], ['gun', 'shotgun', 1], ['gun', 'rpg', 1], ['click', 1], ['reload'], ['whoosh'], ['bell'], ['ping'], ['squeak'], ['bombFall'], ['flyby', 0.5], ['lockOn'], ['hornSet', true], ['hornSet', false]];
    for (const [m, ...a] of calls) { try { S.last = {}; S[m](...a); out.push(m + ':ok'); } catch (e) { out.push(m + ':ERR ' + e.message); } }
    return out.filter(s => !s.endsWith(':ok')).join(', ') || 'all ' + calls.length + ' calls ok';
  });
  console.log('one-shots:', r);
  // engine loop follows the throttle
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500);
  const eng = await page.evaluate(() => { const S = window.__havoc.SFX, L = S.L.eng; return JSON.stringify({ gear: window.__havoc.G.gear, gain: +L.g.gain.value.toFixed(3), rate: +L.s.playbackRate.value.toFixed(3), filt: Math.round(L.f.frequency.value), diesel: +S.L.engDiesel.g.gain.value.toFixed(3) }); });
  await page.keyboard.up('KeyW');
  console.log('engine while accelerating', eng);
  // in a plane
  const pl = await page.evaluate(async () => { const H = window.__havoc; const p = H.PLANES && H.PLANES.list[0]; if (!p) return 'no planes on this map'; if (!H.G.onFoot) H.toggleVehicle(); H.enterPlane(p); await new Promise(r => setTimeout(r, 1500)); const S = H.SFX; return JSON.stringify({ type: p.type, kind: p.def.kind, eng: +S.L.eng.g.gain.value.toFixed(3), prop: +S.L.prop.g.gain.value.toFixed(3), jet: +S.L.jet.g.gain.value.toFixed(3), heli: +S.L.heli.g.gain.value.toFixed(3) }); });
  console.log('plane', pl);
  await page.evaluate(() => window.__havoc.openSettings()); await page.waitForTimeout(300);
  await page.evaluate(() => { const d = document.querySelector('.credits'); if (d) d.open = true; });
  await page.screenshot({ path: SP + '/test/snd-credits.png' });
  console.log('credits rows', await page.evaluate(() => document.querySelectorAll('.credits li').length));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
