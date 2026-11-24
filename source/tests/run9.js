const { chromium, devices } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  const setup = async (page) => {
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + e.stack));
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1200);
  };
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await setup(page);
  await page.evaluate(() => { const H = window.__havoc; Object.assign(H.settings, { time: 'day', gore: 'low', map: 'sand', damage: 'realistic', trafficDensity: 0, pedDensity: 20, slowmo: 'off' }); });
  await page.click('.mapcard[data-map="sand"]'); await page.click('#playBtn'); await page.waitForTimeout(2500);
  // crash into the lifeguard tower on the beach, then look at the front
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.place(276, -22, 0, 0); P.vz = 25; });
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(100); const hp = await page.evaluate(() => window.__havoc.G.player.health); if (hp < 99) break; }
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const H = window.__havoc, P = H.G.player; P.vx = P.vz = 0; const fx = Math.sin(P.h), fz = Math.cos(P.h); H.CAM.free = [[P.x + fx * 5.5 + fz * 3.5, P.y + 1.7, P.z + fz * 5.5 - fx * 3.5], [P.x + fx * 1.5, P.y + 0.5, P.z + fz * 1.5]]; });
  await page.waitForTimeout(500);
  console.log('front', await page.evaluate(() => { const P = window.__havoc.G.player; return JSON.stringify({ hp: Math.round(P.health), uniq: P.uniq, head: P.headBroken, bumper: P.model.bumperF.parent === P.model.body, x: P.x.toFixed(1), z: P.z.toFixed(1), h: P.h.toFixed(2) }); }));
  await page.screenshot({ path: SP + '/test/80-front.png' });
  // checkpoint mission Beach Run
  await page.evaluate(() => { const H = window.__havoc; H.CAM.free = null; const P = H.G.player; P.place(222, 30, 0, 0); P.health = P.maxHp; });
  await page.waitForTimeout(1800);
  await page.evaluate(() => { const P = window.__havoc.G.player; P.place(222, 110, 0, 0); });
  await page.waitForTimeout(1500);
  console.log('mission', await page.evaluate(() => { const M = window.__havoc.MIS; return M.active ? M.active.id + ' ' + M.objText : 'none'; }));
  await page.screenshot({ path: SP + '/test/81-checkpoints.png' });
  await page.close();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await ctx.newPage(); await setup(m);
  await m.tap('#playBtn'); await m.waitForTimeout(2800);
  await m.evaluate(() => { const P = window.__havoc.G.player; P.place(-5, 40, 0, 0); });
  await m.waitForTimeout(1500);
  await m.screenshot({ path: SP + '/test/82-m-mission.png' });
  console.log('errors:', errs.length); console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
})();
