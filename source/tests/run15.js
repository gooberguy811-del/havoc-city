const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low' }); });
  await page.click('.mapcard[data-map="neon"]'); await page.click('#playBtn'); await page.waitForTimeout(2000);
  // worst cases: 3 bails in a row from a fast car heading at a wall, starting with low health
  for (const [speed, hp] of [[45, 100], [60, 40], [55, 20]]) {
    const ok = await page.evaluate(([sp, hp]) => { const H = window.__havoc; if (H.G.onFoot) { H.HERO.p.active && 0; } const P = H.G.player; if (!P) return false; P.health = P.maxHp; P.place(-3, -150, 0, 0); P.vz = sp; H.HERO.hp = hp; return true; }, [speed, hp]);
    if (!ok) { console.log('no car'); break; }
    await page.evaluate(([sp, hp]) => { window.__havoc.toggleVehicle(); window.__havoc.HERO.hp = hp; }, [speed, hp]);
    let minHp = 999, died = false;
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(120); const r = await page.evaluate(() => ({ hp: window.__havoc.HERO.hp, down: window.__havoc.G.down })); minHp = Math.min(minHp, r.hp); if (r.down) died = true; }
    console.log(`bail @${speed} m/s starting at ${hp} hp -> lowest ${Math.round(minHp)} hp, died: ${died}`);
    // get back into a fresh car for the next run
    await page.evaluate(() => { document.getElementById('pRespawn').click(); });
    await page.waitForTimeout(800);
  }
  console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
})();
