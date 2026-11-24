const { chromium } = require('playwright');
const fs = require('fs');
const SP = process.argv[2];
(async () => {
  const html = fs.readFileSync(SP + '/test/dbg.html', 'utf8');
  fs.writeFileSync(SP + '/test/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(1000);
  await page.evaluate(() => { Object.assign(window.__havoc.settings, { map: 'sand', trafficDensity: 0, pedDensity: 0, slowmo: 'on', quality: 'low' }); });
  await page.click('.mapcard[data-map="sand"]'); await page.click('#playBtn'); await page.waitForTimeout(2000);
  const trial = async (label, setup) => {
    await page.evaluate(setup);
    let maxS = 0;
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(80); const s = await page.evaluate(() => window.__havoc.G.slowmo); maxS = Math.max(maxS, s); }
    console.log(label, 'slowmo peak', maxS.toFixed(2), 'hp', await page.evaluate(() => Math.round(window.__havoc.G.player.health)));
    await page.waitForTimeout(4500);
  };
  const mk = (x, z, h) => `const H = window.__havoc; const o = new H.Vehicle({ body: 'viper', paint: '#888', finish: 'gloss', rim: 'sport', rimColor: '#ccc', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'X', engine: 2, handling: 2, brakes: 2, armor: 1 }, 'parked'); o.place(${x}, ${z}, ${h}, 0); H.VEH.list.push(o);`;
  await trial('rear-end parked car @25 m/s', new Function(`const P = window.__havoc.G.player; P.health = P.maxHp; P.place(265, -120, 0, 0); P.vz = 25; ${mk(265, -100, 0)}`));
  await trial('head-on moving car 20+15', new Function(`const P = window.__havoc.G.player; P.health = P.maxHp; P.place(285, -60, 0, 0); P.vz = 20; ${mk(285, -40, Math.PI)} H.VEH.list[H.VEH.list.length-1].vz = -15; H.VEH.list[H.VEH.list.length-1].abandoned = true; H.VEH.list[H.VEH.list.length-1].abandonT = 1e9;`));
  await trial('wall (seawall) @18 m/s', `const P = window.__havoc.G.player; P.health = P.maxHp; P.place(290, 40, Math.PI/2, 0); P.vx = 18;`);
  await browser.close();
})();
