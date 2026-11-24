const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const errs = [];
  const mk = async (tag, hash) => {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } }); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(tag + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' | ')));
    page.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_|peer/i.test(m.text())) errs.push(tag + ' ' + m.text()); });
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/peerjs.min.js', r => r.fulfill({ path: SP + '/peer/package/dist/peerjs.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.addInitScript(() => { window.__peerOpts = { host: '127.0.0.1', port: 9000, path: '/hc', secure: false }; });
    await page.goto('file://' + SP + '/test/index.html' + (hash || '')); await page.waitForTimeout(900);
    await page.evaluate(() => Object.assign(window.__havoc.settings, { map: 'neon', trafficDensity: 0, pedDensity: 0, slowmo: 'off', quality: 'low', time: 'day' }));
    return page;
  };
  const A = await mk('A');
  console.log('A panel visible', await A.evaluate(() => !document.querySelector('#online').hidden));
  await A.fill('#onName', 'Alice'); await A.click('#onCreate');
  for (let k = 0; k < 20; k++) { await A.waitForTimeout(400); if (/Waiting|players/.test(await A.textContent('#onStatus'))) break; }
  const code = await A.textContent('#onRoom');
  console.log('A room', code, '|', await A.textContent('#onStatus'), '| hash', await A.evaluate(() => location.hash));
  await A.screenshot({ path: SP + '/test/o-A-menu.png' });
  const B = await mk('B', '#room=' + code);
  await B.fill('#onName', 'Bob');
  for (let k = 0; k < 30; k++) { await B.waitForTimeout(400); if (/players/.test(await B.textContent('#onStatus'))) break; }
  console.log('B status', await B.textContent('#onStatus'), '| A status', await A.textContent('#onStatus'));
  for (const P of [A, B]) { await P.click('.mapcard[data-map="neon"]'); await P.click('#playBtn'); }
  await A.waitForTimeout(5000);
  const info = P => P.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0]; return JSON.stringify({ on: H.NET.on, room: H.NET.R && H.NET.R.name, players: H.NET.players.size, other: N ? { name: N.name, kind: N.avKind } : null, chip: document.querySelector('#netchip').textContent }); });
  console.log('A', await info(A)); console.log('B', await info(B));
  // B parks in front of A, both on foot, A shoots B
  const ap = await A.evaluate(() => { const P = window.__havoc.G.player; return { x: P.x, z: P.z, h: P.h }; });
  await B.evaluate(a => { const P = window.__havoc.G.player; P.place(a.x + Math.sin(a.h) * 16, a.z + Math.cos(a.h) * 16, a.h + Math.PI, 0); }, ap);
  await A.waitForTimeout(1500);
  await B.keyboard.press('KeyF'); await A.keyboard.press('KeyF'); await A.waitForTimeout(1500);
  await A.evaluate(() => { const H = window.__havoc, N = [...H.NET.players.values()][0], p = H.HERO.p; p.h = Math.atan2(N.x - p.x, N.z - p.z); });
  await A.screenshot({ path: SP + '/test/o-A-game.png' });
  const hp0 = await B.evaluate(() => window.__havoc.HERO.hp);
  await A.keyboard.press('Digit2'); await A.keyboard.down('KeyQ'); await A.waitForTimeout(2000); await A.keyboard.up('KeyQ'); await A.waitForTimeout(1000);
  console.log('B hp', hp0, '->', await B.evaluate(() => Math.round(window.__havoc.HERO.hp)));
  // host leaves: B should take over the room
  await A.close();
  for (let k = 0; k < 30; k++) { await B.waitForTimeout(700); const s = await B.evaluate(() => JSON.stringify({ st: window.__havoc.PEER.st, players: window.__havoc.NET.players.size })); if (k % 4 === 0) console.log(' B after host left', s); if (JSON.parse(s).st.host && JSON.parse(s).st.state === 'live') { console.log(' B took over', s); break; } }
  // Alice comes back through the link and joins Bob's room
  const A2 = await mk('A2', '#room=' + code);
  await A2.click('.mapcard[data-map="neon"]'); await A2.click('#playBtn');
  for (let k = 0; k < 30; k++) { await A2.waitForTimeout(700); const n = await B.evaluate(() => window.__havoc.NET.players.size); if (n) break; }
  console.log('rejoined: B sees', await B.evaluate(() => [...window.__havoc.NET.players.values()].map(N => N.name + ':' + N.avKind).join(',')), '| A2 host?', await A2.evaluate(() => JSON.stringify(window.__havoc.PEER.st)));
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await browser.close();
})();
