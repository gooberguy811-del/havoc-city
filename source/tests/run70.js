// The Accountant: drive to the bank, pick him up, lose the police, deliver
const { chromium } = require('playwright');
const SP = process.argv[2], MAP = process.argv[3] || 'neon';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 560 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.route('**/three.min.js', r => r.fulfill({ path: SP + '/vendor/package/build/three.min.js', contentType: 'application/javascript' }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/fonts.gstatic.com/**', r => r.abort()); await page.route('**/three@0.128.0/examples/js/**', r => r.abort());
  await page.goto('file://' + SP + '/test/index.html'); await page.waitForTimeout(800);
  await page.evaluate(m => { Object.assign(window.__havoc.settings, { map: m, quality: 'low', trafficDensity: 10, pedDensity: 20, police: 'normal', time: 'day' }); }, MAP);
  await page.click(`.mapcard[data-map="${MAP}"]`); await page.click('#playBtn'); await page.waitForTimeout(3500);
  const ev = (fn, a) => page.evaluate(fn, a);
  const waitFor = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn)) return true; await page.waitForTimeout(250); } return false; };
  const d = await ev(() => { const H = window.__havoc, d = H.MISSIONS[H.getW().id].find(q => q.id === 'snatch'); H.startMission(d); return d; });
  console.log('started', d.name, 'step', await ev(() => window.__havoc.MIS.step));
  const place = at => ev(at => { const v = window.__havoc.G.player; v.place(at[0], at[1], v.h, 0); }, at);
  await place(d.steps[0].at); console.log('at bank', await waitFor(() => window.__havoc.MIS.step === 1, 15000));
  await place(d.steps[1].at.map((c, i) => c + (i === 0 ? 2.5 : 0))); console.log('grabbed', await waitFor(() => window.__havoc.MIS.step >= 2, 30000));
  console.log('wanted then evade step', await waitFor(() => window.__havoc.MIS.step === 3, 10000), await ev(() => window.__havoc.wantedObj().stars));
  await ev(() => { const H = window.__havoc, w = H.wantedObj(); w.heat = 0; w.stars = 0; }); console.log('evaded', await waitFor(() => window.__havoc.MIS.step === 4, 15000));
  await place(d.steps[4].at); console.log('delivered', await waitFor(() => !window.__havoc.MIS.active, 15000), 'done', await ev(() => !!window.__havoc.MIS.done.snatch));
  console.log('errors', errs.length, errs.slice(0, 3).join('\n'));
  await browser.close();
})();
