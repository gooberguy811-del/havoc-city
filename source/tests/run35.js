const { chromium } = require('playwright');
const SP = process.argv[2];
(async () => {
  const base = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns'];
  const mk = async (browser, opts, hash) => {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } }); const page = await ctx.newPage();
    await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
    await page.route('**/peerjs.min.js', r => r.fulfill({ path: SP + '/peer/package/dist/peerjs.min.js', contentType: 'application/javascript' }));
    await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/fonts.gstatic.com/**', r => r.abort());
    await page.addInitScript(o => { window.__peerOpts = o; }, opts);
    await page.goto('file://' + SP + '/test/index.html' + (hash || '')); await page.waitForTimeout(800);
    return page;
  };
  const watch = async (page, label, until, maxS) => { let last = ''; for (let k = 0; k < maxS * 2; k++) { await page.waitForTimeout(500); const t = await page.textContent('#onStatus'); if (t !== last) { console.log(`  ${label} [${(k / 2).toFixed(1)}s]`, t); last = t; } if (until.test(t)) return t; } return last; };
  const good = { host: '127.0.0.1', port: 9000, path: '/hc', secure: false };
  // 1) server down
  const b1 = await chromium.launch({ args: base });
  const P = await mk(b1, { host: '127.0.0.1', port: 9011, path: '/hc', secure: false });
  await P.click('#onCreate');
  console.log('1) server unreachable'); await watch(P, 'status', /Cannot reach the matchmaking/, 40);
  await b1.close();
  // 2) normal: host + joiner
  const b2 = await chromium.launch({ args: base });
  const A = await mk(b2, good); await A.click('#onCreate');
  console.log('2) normal'); await watch(A, 'host', /Waiting/, 15);
  const code = await A.textContent('#onRoom');
  const B = await mk(b2, good, '#room=' + code); await watch(B, 'joiner', /players/, 30);
  // 3) joiner whose browser cannot make peer-to-peer connections
  const b3 = await chromium.launch({ args: base.concat(['--force-webrtc-ip-handling-policy=disable_non_proxied_udp']) });
  const C = await mk(b3, Object.assign({}, good, { config: { iceServers: [] } }), '#room=' + code);
  console.log('3) blocked peer-to-peer'); await watch(C, 'blocked', /cannot reach the host/, 50);
  await b2.close(); await b3.close();
})();
