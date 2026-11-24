// the Mac app's code, run with Linux Electron: window opens, game starts, bundled libraries load, quitting mid-game works
const { _electron: electron } = require('playwright');
const M = process.argv[2];
(async () => {
  const app = await electron.launch({ executablePath: M + '/build/node_modules/electron/dist/electron', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', M + '/app'] });
  const errs = [];
  const win = await app.firstWindow();
  win.on('pageerror', e => errs.push('pageerror: ' + e.message));
  win.on('dialog', d => { errs.push('dialog shown: ' + d.type()); d.accept().catch(() => { }); });
  process.on('unhandledRejection', () => { }); process.on('uncaughtException', e => { if (!/No dialog is showing/.test(e.message)) console.log('harness', e.message); });
  win.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await win.waitForLoadState('domcontentloaded'); await win.waitForTimeout(1500);
  console.log('title', await win.title(), '| url', win.url().replace(/.*\/app\//, 'app/'));
  console.log('menu name', await app.evaluate(({ app }) => app.getName()));
  console.log('THREE', await win.evaluate(() => typeof THREE !== 'undefined' && THREE.REVISION));
  await win.click('#playBtn'); await win.waitForTimeout(5000);
  const st = await win.evaluate(() => ({ hud: !!document.querySelector('#minimap') && getComputedStyle(document.querySelector('#minimap')).display !== 'none', bloom: !!(THREE.EffectComposer && THREE.UnrealBloomPass), canvas: document.querySelector('#stage canvas') ? document.querySelector('#stage canvas').width : 0 }));
  console.log('in game', JSON.stringify(st));
  const peer = await win.evaluate(() => new Promise(r => { const s = document.createElement('script'); s.src = 'vendor/peerjs.min.js'; s.onload = () => r(typeof window.Peer); s.onerror = () => r('load failed'); document.head.appendChild(s); }));
  console.log('peerjs bundled', peer);
  await win.screenshot({ path: M + '/../test/mac-app-linux-run.png' });
  const t0 = Date.now(); await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await new Promise(r => setTimeout(r, 1500));
  let closed; try { closed = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length); } catch (e) { closed = 'app exited'; }
  console.log('after closing the window mid-game:', closed, 'in', Date.now() - t0, 'ms');
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  try { await app.close(); } catch (e) { }
})();
