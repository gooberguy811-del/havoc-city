const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2], MAP = process.argv[3] || 'neon', FULL = process.argv[4] !== 'quick';
(async () => {
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync(SP + '/test/dbg.html', 'utf8') + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, trafficDensity: 10, pedDensity: 20, slowmo: 'off', quality: 'low', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(2500);
  const info = await page.evaluate(() => { const H = window.__havoc; return H.SHOP.list.map(s => ({ cx: +s.cx.toFixed(1), cz: +s.cz.toFixed(1), fh: +s.fh.toFixed(2) })); });
  console.log(MAP, 'stations', JSON.stringify(info));
  const st = () => page.evaluate(() => { const H = window.__havoc, S = H.SHOP, s = S.list[0], c = s.clerk, F = H.PF(); return JSON.stringify({ foot: H.G.onFoot, hero: [+F.x.toFixed(1), +F.z.toFixed(1)], inside: S.list.indexOf(S.inside), rob: +s.rob.toFixed(2), bag: s.bag, robbed: s.robbedUntil > H.G.T || s.robbedUntil > 0, clerk: c ? { act: c.active, dead: c.dead, d: +Math.hypot(c.x - s.kx, c.z - s.kz).toFixed(2) } : null, stars: H.wanted.stars, cash: H.MIS.cash, prompt: document.querySelector('#prompt').hidden ? '' : document.querySelector('#prompt').textContent, robBar: !document.querySelector('#rob').hidden, roof: s.roofG.visible, wpn: H.ARMS.cur }); });
  for (let i = 0; i < info.length; i++) {
    await page.evaluate(i => { const H = window.__havoc, s = H.SHOP.list[i], P = H.G.player; P.place(s.dx - Math.sin(s.fh) * 12, s.dz - Math.cos(s.fh) * 12, s.fh, 0); }, i);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${SP}/test/g-${MAP}-${i}-ext.png` });
  }
  if (FULL) {
    await page.evaluate(() => { const H = window.__havoc, s = H.SHOP.list[0], P = H.G.player; P.place(s.dx - Math.sin(s.fh) * 6, s.dz - Math.cos(s.fh) * 6, s.fh, 0); });
    await page.waitForTimeout(1500);
    await page.keyboard.press('KeyF'); await page.waitForTimeout(1200);
    await page.evaluate(() => { const H = window.__havoc, s = H.SHOP.list[0], p = H.HERO.p; p.x = s.dx; p.z = s.dz; p.h = s.fh; });
    console.log('at door', await st());
    await page.keyboard.down('KeyW'); await page.waitForTimeout(7000); await page.keyboard.up('KeyW');
    await page.waitForTimeout(600);
    console.log('walked in', await st());
    await page.screenshot({ path: `${SP}/test/g-${MAP}-in1.png` });
    await page.keyboard.press('Digit2'); await page.waitForTimeout(1200);
    console.log('gun out', await st());
    await page.screenshot({ path: `${SP}/test/g-${MAP}-rob.png` });
    for (let k = 0; k < 30; k++) { await page.waitForTimeout(1000); const s = JSON.parse(await st()); if (k % 3 === 0 || s.bag) console.log(' ', JSON.stringify(s)); if (s.bag) break; }
    await page.screenshot({ path: `${SP}/test/g-${MAP}-bag.png` });
    await page.evaluate(() => { const H = window.__havoc, s = H.SHOP.list[0], p = H.HERO.p; p.x = s.bx + Math.sin(s.kh) * 1.0; p.z = s.bz + Math.cos(s.kh) * 1.0; });
    await page.waitForTimeout(1200);
    console.log('grabbed', await st());
    // walk out, then come back: should say the till is empty
    await page.evaluate(() => { const H = window.__havoc, s = H.SHOP.list[0], p = H.HERO.p; p.x = s.dx; p.z = s.dz; });
    await page.waitForTimeout(800);
    console.log('outside', await st());
  }
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await browser.close();
})();
