// the website: loads, offline worker installs, game still starts with the network off
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|ERR_INTERNET_DISCONNECTED/.test(m.text())) errs.push(m.text()); });
  await page.goto('http://localhost:8123/'); await page.waitForTimeout(1500);
  const man = await page.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=manifest]').href); const j = await r.json(); return j.name + ' icons ' + j.icons.length + ' display ' + j.display; });
  console.log('manifest', man);
  // localhost isn't https, so register the worker by hand the way the site does on github.io
  const sw = await page.evaluate(async () => { const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; const keys = await caches.keys(); const c = await caches.open(keys[0]); return keys[0] + ' cached ' + (await c.keys()).length; });
  console.log('worker', sw);
  await page.click('#playBtn'); await page.waitForTimeout(4000);
  console.log('online: bloom', await page.evaluate(() => !!(THREE.EffectComposer && THREE.UnrealBloomPass)));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(1500);
  console.log('offline reload: title', await page.title(), 'menu', await page.evaluate(() => !!document.querySelector('#playBtn')));
  await page.click('#playBtn'); await page.waitForTimeout(4000);
  console.log('offline game: THREE', await page.evaluate(() => typeof THREE !== 'undefined' && THREE.REVISION), 'bloom', await page.evaluate(() => !!(THREE.EffectComposer && THREE.UnrealBloomPass)));
  await page.screenshot({ path: require('path').join(__dirname, 'site-offline.png') });
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await browser.close();
})();
