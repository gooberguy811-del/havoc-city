const { _electron: electron } = require('playwright');
const M = process.argv[2];
process.on('uncaughtException', e => { if (!/No dialog is showing/.test(e.message)) console.log('harness', e.message); });
(async () => {
  const app = await electron.launch({ executablePath: M + '/build/node_modules/electron/dist/electron', env: Object.assign({}, process.env, { HAVOC_SITE: 'http://localhost:8199/' }), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', M + '/app'] });
  const win = await app.firstWindow(); win.on('dialog', d => d.accept().catch(() => { }));
  await win.waitForTimeout(4000);
  console.log('visible', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => [w.isVisible(), w.webContents.getURL().slice(-30)])));
  console.log('pages', app.windows().length, app.windows().map(p => p.url().slice(-30)));
  const info = await win.evaluate(() => { const b = document.querySelector('#playBtn'); if (!b) return 'no button'; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { r: [r.x, r.y, r.width, r.height], top: el && (el.id || el.className || el.tagName), hidden: b.closest('[hidden]') ? b.closest('[hidden]').id : null, vis: getComputedStyle(b).visibility, inner: [innerWidth, innerHeight] }; });
  console.log('button', JSON.stringify(info));
  await win.screenshot({ path: M + '/../test/app-fallback.png' });
  try { await app.close(); } catch (e) { }
})();
