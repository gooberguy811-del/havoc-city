// updating Mac app (run with Linux Electron): plays the website version, falls back to the built-in copy when the site is down or missing
const { _electron: electron } = require('playwright');
const M = process.argv[2];
process.on('uncaughtException', e => { if (!/No dialog is showing/.test(e.message)) console.log('harness', e.message); });
async function run(label, site) {
  const app = await electron.launch({ executablePath: M + '/build/node_modules/electron/dist/electron', env: Object.assign({}, process.env, { HAVOC_SITE: site }), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', M + '/app'] });
  const win = await app.firstWindow(); const errs = [];
  win.on('pageerror', e => errs.push(e.message)); win.on('dialog', d => d.accept().catch(() => { }));
  await win.waitForTimeout(4000);
  const url = win.url(), marker = await win.evaluate(() => window.__siteMarker || null).catch(() => 'n/a');
  let started = false; try { await win.evaluate(() => document.querySelector('#playBtn').click()); await win.waitForTimeout(3000); started = await win.evaluate(() => typeof THREE !== 'undefined' && !!document.querySelector('#stage canvas')); } catch (e) { started = 'ERR ' + e.message.split('\n')[0]; }
  console.log(label.padEnd(24), 'loaded', url.startsWith('file:') ? 'BUILT-IN COPY' : url, '| marker', marker, '| game runs', started, '| errors', errs.length);
  try { await app.close(); } catch (e) { }
}
(async () => {
  await run('site up', 'http://localhost:8123/');
  await run('site down (offline)', 'http://localhost:8199/');
  await run('site 404 (not set up)', 'http://localhost:8123/nothing-here/');
})();
