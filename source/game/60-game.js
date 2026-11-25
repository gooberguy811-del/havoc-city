// =====================================================================
//  GAME: audio, camera, lighting, HUD, input, menus, main loop
// =====================================================================
const APP = { mode: 'menu', paused: false, garageFrom: 'menu', worldId: null };

// ---------------- audio: real recordings (CC0, freesound.org; see SND_CREDITS) ----------------
const SFX = {
  ctx: null, master: null, bufs: {}, L: {}, last: {}, horn: false, ready: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = settings.volume / 100 * 0.9;
      // a soft limiter so a pile-up of explosions doesn't crackle, then the slow-motion muffle
      const lim = c.createDynamicsCompressor(); lim.threshold.value = -9; lim.knee.value = 8; lim.ratio.value = 10; lim.attack.value = 0.003; lim.release.value = 0.25;
      this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000;
      this.master.connect(lim); lim.connect(this.lp); this.lp.connect(c.destination);
      this.decodeAll();
    } catch (e) { this.ctx = null; }
  },
  decodeAll() {
    const c = this.ctx; let left = Object.keys(SND_DATA).length;
    const done = () => { if (--left === 0) { this.ready = true; this.startLoops(); } };
    for (const name in SND_DATA) {
      const bin = atob(SND_DATA[name]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const ok = b => { this.bufs[name] = b; done(); }, bad = () => done();
      try { const p = c.decodeAudioData(u.buffer, ok, bad); if (p && p.catch) p.catch(bad); } catch (e) { bad(); }
    }
  },
  startLoops() {
    const c = this.ctx;
    const mk = (key, name, filt) => {
      const b = this.bufs[name]; if (!b) return;
      const s = c.createBufferSource(); s.buffer = b; s.loop = true; const [a, len] = SND_LOOPS[name]; s.loopStart = a; s.loopEnd = a + len;
      const g = c.createGain(); g.gain.value = 0; let n = s, f = null;
      if (filt) { f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; f.Q.value = 0.7; s.connect(f); n = f; }
      n.connect(g); g.connect(this.master); s.start(0, a + Math.random() * len); this.L[key] = { s, g, f, trim: SND_TRIM[name] || 1 };
    };
    mk('eng', 'eng', 2000); mk('engDiesel', 'engDiesel', 2000); mk('engBike', 'engBike', 2500); mk('prop', 'prop', 3000); mk('jet', 'jet', 6000);
    mk('heli', 'heli', 4000); mk('heliCop', 'heli', 1800); mk('siren', 'siren'); mk('skid', 'skid'); mk('scrape', 'scrape', 6000); mk('horn', 'horn');
  },
  setVolume(v) { if (this.master) this.master.gain.value = v / 100 * 0.9; },
  ok(name, gap) { const t = performance.now(); if (this.last[name] && t - this.last[name] < gap) return false; this.last[name] = t; return !!this.ctx; },
  att(x, z) { return clamp(1 - Math.hypot(x - camera.position.x, z - camera.position.z) / 90, 0, 1); },
  // play one recording: volume, playback rate (pitch), start delay, optional low-pass (distance muffle)
  play(name, vol, rate, delay, lp) {
    const c = this.ctx, b = this.bufs[name]; if (!c || !b || !(vol > 0.005)) return null;
    const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = (rate || 1) * (G.slowmo > 0 && APP.mode === 'game' ? 0.75 : 1);
    const g = c.createGain(); g.gain.value = vol * (SND_TRIM[name] || 1); let n = s;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); n = f; }
    n.connect(g); g.connect(this.master); s.start(c.currentTime + (delay || 0)); return s;
  },
  vary(k) { return 1 + (Math.random() * 2 - 1) * (k || 0.06); },
  crash(i) { if (!this.ok('crash', 90)) return; const v = clamp(i / 18, 0.05, 1); if (i > 14) this.play(Math.random() < 0.5 ? 'crash1' : 'crash2', v, this.vary()); else if (i > 6) { this.play('crash1', v * 0.8, this.vary(0.1)); } else this.play('hit', v * 1.2, this.vary(0.12)); },
  metal(v) { this.play('metal', v * 0.8, this.vary(0.12)); },
  glass(a) { if (!this.ok('glass', 120) || a <= 0) return; this.play('glass', a * 0.8, this.vary(0.1)); },
  punch() { if (!this.ok('punch', 80)) return; this.play('punch', 0.9, this.vary(0.1)); },
  door() { if (!this.ok('door', 150)) return; this.play('door', 0.75, this.vary(0.05)); },
  chirp(lock) { this.play('lock', 0.7, lock ? 1 : 1.12); if (lock) this.play('lock', 0.6, 1, 0.16); },
  ding() { if (!this.ok('ding', 90)) return; this.play('coin', 0.8, this.vary(0.03)); },
  cash() { this.play('cash', 0.8); },
  passed() { this.play('passed', 0.85); },
  fail() { this.play('fail', 0.85); },
  thud(ps, x, z) { if (!this.ok('thud', 60)) return; const v = clamp(ps / 20, 0.15, 0.9) * this.att(x, z); this.play('thud', v, this.vary(0.12)); },
  explode(v) { this.boom(v, false, 0); },
  collapse(v, big) { if (!this.ok('collapse', 300)) return; this.play(big ? 'collapse' : 'collapseS', clamp(v, 0, 1) * 1.1, this.vary(0.05)); },
  boom(v, big, far) {
    if (!this.ok('boom', 70)) return; v = v == null ? 0.85 : v; far = far || 0;
    if (far > 140) this.play('boomFar', v * 1.2, this.vary(0.05), 0, 900);
    else if (far > 60) { this.play('boomFar', v, this.vary(0.05)); if (big) this.play('boomBig', v * 0.5, 0.9, 0, 1400); }
    else { this.play(big ? 'boomBig' : 'boom', v, this.vary(0.05)); if (big) this.play('boom', v * 0.6, 0.8, 0.05); }
  },
  cannon() { this.play('cannon', 0.95, this.vary(0.04)); },
  clank(v) { if (!this.ok('clank', 60)) return; this.play('clank', 0.8 * v, this.vary(0.15)); },
  splash() { this.play('splash', 0.5, this.vary(0.1)); },
  splashBig(v) { if (!this.ok('splashBig', 200)) return; this.play('splashBig', v, this.vary(0.06)); },
  beep(x, z) { if (!this.ok('beep', 300)) return; this.play('honk', this.att(x, z) * 0.8, this.vary(0.08)); },
  scream(x, z) { if (!this.ok('scream', 1400)) return; const a = this.att(x, z); this.play('scream' + (1 + (Math.random() * 3 | 0)), a * 0.55, this.vary(0.08)); },
  sting() { if (!this.ok('sting', 500)) return; this.play('wanted', 0.75); },
  down() { this.play('wasted', 0.95); },
  gun(id, v) {
    if (!this.ctx) return; if (!this.ok(id + 'g', id === 'smg' ? 45 : 60)) return;
    const vol = v == null ? 1 : v;
    if (id === 'shotgun') this.play('shotgun', 0.95 * vol, this.vary(0.04));
    else if (id === 'rpg') this.play('rocket', 0.95 * vol, this.vary(0.05));
    else if (id === 'smg') this.play('smg', 0.75 * vol, this.vary(0.07));
    else this.play('pistol', 0.85 * vol, this.vary(0.05));
  },
  click(v) { this.play('dry', 0.7 * (v || 1), this.vary(0.05)); },
  reload() { if (!this.ok('reload', 300)) return; this.play('reload', 0.8); },
  whoosh() { if (!this.ok('whoosh', 400)) return; this.play('whoosh', 0.9, this.vary(0.1)); },
  bell() { if (!this.ok('bell', 2000)) return; this.play('bell', 0.75); },
  ping() { this.play('ping', 0.6); },
  squeak(v) { if (!this.ok('squeak', 70)) return; this.play('squeak', v == null ? 0.9 : v, this.vary(0.15)); },
  bombFall() { this.play('bombfall', 0.7, this.vary(0.04)); },
  flyby(v) { this.play('flyby', v, this.vary(0.05)); },
  lockOn() { this.play('lockon', 0.6); },
  hornSet(on) { this.horn = !!on; const H = this.L.horn; if (H) H.g.gain.setTargetAtTime(on ? 0.55 * H.trim : 0, this.ctx.currentTime, on ? 0.01 : 0.03); },
  loopTo(key, gain, rate, filt, tc) {
    const L = this.L[key]; if (!L) return; const t = this.ctx.currentTime;
    L.g.gain.setTargetAtTime(gain * L.trim, t, tc || 0.06);
    if (rate) L.s.playbackRate.setTargetAtTime(rate, t, 0.05);
    if (filt && L.f) L.f.frequency.setTargetAtTime(filt, t, 0.05);
  },
  update(dt) {
    if (!this.ctx || !this.ready) return;
    const P = G.player, F = PF(), t = this.ctx.currentTime;
    const live = APP.mode === 'game' && !APP.paused;
    const sfF = 0.6 + 0.4 * slowFactor();
    let eng = null, engG = 0, engR = 1, engF = 2000, air = null, airG = 0, airR = 1, airF = 4000;
    if (live && P && !P.wrecked && !G.plane) {
      const sp = Math.abs(P.vf), top = P.st.top * 1.05, fr = clamp(sp / top, 0, 1), gears = [0, 0.14, 0.3, 0.48, 0.68, 0.86, 1.01];
      let gi = 0; while (gi < gears.length - 2 && fr > gears[gi + 1]) gi++;
      let rpm = (fr - gears[gi]) / (gears[gi + 1] - gears[gi]); rpm = 0.22 + rpm * 0.78;
      if (sp < 1 || !P.onGround) rpm = Math.min(1, (sp < 1 ? 0.16 : rpm) + P.input.throttle * 0.35);
      G.gear = P.vf < -0.5 ? 'R' : sp < 0.5 ? 'N' : String(gi + 1);
      const thr = P.input.throttle, dmg = 1 - (P.engineDmg || 0) * 0.5;
      eng = P.tank || P.st.mass >= 2000 ? 'engDiesel' : P.bike ? 'engBike' : 'eng';
      engR = (eng === 'engDiesel' ? 0.62 + rpm * (P.tank ? 0.55 : 0.95) : eng === 'engBike' ? 0.78 + rpm * 1.55 : 0.7 + rpm * 1.5) * sfF;
      engG = 0.34 + thr * 0.34 + rpm * 0.18; engF = (650 + thr * 3200 + rpm * 2600) * dmg;
      if (G.gear !== this.lastGear && /\d/.test(G.gear) && /\d/.test(this.lastGear || '') && thr > 0.5) { const L = this.L[eng]; if (L) { L.g.gain.cancelScheduledValues(t); L.g.gain.setValueAtTime(0.12 * L.trim, t); } }
      this.lastGear = G.gear;
    } else if (live && G.plane && !G.plane.wreck) {
      const PL = G.plane, kind = PL.def.kind, r = PL.T, sp = PL.V.length();
      air = kind === 'heli' ? 'heli' : kind === 'jet' ? 'jet' : 'prop';
      if (air === 'heli') { airR = (0.82 + r * 0.32) * sfF; airG = 0.45 + r * 0.45; airF = 1800 + r * 3500; }
      else if (air === 'jet') { airR = (0.72 + r * 0.5 + Math.min(sp, 120) * 0.0015) * sfF; airG = 0.35 + r * 0.5; airF = 2500 + r * 7000; }
      else { airR = (0.68 + r * 0.6 + Math.min(sp, 80) * 0.002) * sfF; airG = 0.38 + r * 0.45; airF = 1400 + r * 4000; }
    }
    for (const k of ['eng', 'engDiesel', 'engBike']) this.loopTo(k, k === eng ? engG : 0, k === eng ? engR : 0, k === eng ? engF : 0, k === eng ? 0.05 : 0.12);
    for (const k of ['heli', 'jet', 'prop']) this.loopTo(k, k === air ? airG : 0, k === air ? airR : 0, k === air ? airF : 0, 0.1);
    this.lp.frequency.setTargetAtTime(G.slowmo > 0 && live ? 650 : 20000, t, 0.08);
    const sk = live && P ? (G.skid || 0) : 0; G.skid = Math.max(0, (G.skid || 0) - dt * 4);
    this.loopTo('skid', clamp(sk, 0, 1) * 0.7, 0.95 + clamp(sk, 0, 1) * 0.1, 0, 0.04);
    this.loopTo('scrape', live ? clamp(G.scrape || 0, 0, 1) * 0.6 : 0, 0, 0, 0.04); G.scrape = Math.max(0, (G.scrape || 0) - dt * 5);
    let sir = 0;
    if (live && F && wanted.stars) for (const v of VEH.list) if (isCop(v) && v.ai.chasing) sir = Math.max(sir, clamp(1 - Math.hypot(v.x - F.x, v.z - F.z) / 140, 0, 1));
    this.loopTo('siren', sir * sir * 0.5, 0, 0, 0.12);
    const hv = live && F && HELI.active ? clamp(1 - Math.hypot(HELI.x - F.x, HELI.z - F.z) / 200, 0, 1) : 0;
    this.loopTo('heliCop', hv * hv * 0.9, 0, 900 + hv * 2500, 0.2);
    if (!live && this.horn) this.hornSet(false);
  }
};

// ---------------- lighting & time of day ----------------
const TIMES = {
  day: { sky: ['#3a78c8', '#d6dde0', '#9fb0bf'], fog: '#cfd5d4', sun: '#ffe8c6', sunI: 2.15, sunDir: [0.5, 0.78, 0.35], hemi: ['#cfe0f5', '#857358', 0.64], win: 0, lamps: 0, exp: 1.0, stars: 0, env: ['#6b9ad8', '#dce8f3', '#7a756c'], head: 0.4, tail: 0.6, glow: 0, sunVis: 1 },
  sunset: { sky: ['#2a3a7a', '#ff9450', '#5e4048'], fog: '#d8936a', sun: '#ffae72', sunI: 1.55, sunDir: [-0.85, 0.2, 0.42], hemi: ['#ffbe96', '#3d2e3c', 0.55], win: 0.7, lamps: 0.7, exp: 1.05, stars: 0.12, env: ['#3a4a8a', '#ffa070', '#4a3a40'], head: 1.6, tail: 1.3, glow: 0.65, sunVis: 1 },
  night: { sky: ['#03050d', '#141c38', '#06080f'], fog: '#0d1326', sun: '#8aa4ff', sunI: 0.38, sunDir: [0.3, 0.75, -0.45], hemi: ['#4a5a8a', '#141518', 0.4], win: 1.2, lamps: 1, exp: 1.1, stars: 1, env: ['#0a0f1f', '#1d2747', '#0a0b10'], head: 2.6, tail: 1.9, glow: 1, sunVis: 0.15 }
};
let sky, starPts, sun, hemi, headSpot;
const envCache = {};
function initScene() {
  sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), makeSkyMat(TIMES.day.sky)); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = Math.random() * TAU, e = Math.random() * 1.4 + 0.08, r = 1100; sp[i * 3] = Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = Math.sin(e) * r; sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  starPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); starPts.frustumCulled = false; scene.add(starPts);
  scene.fog = new THREE.Fog(0xffffff, 100, 340);
  hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 420;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  headSpot = new THREE.SpotLight(C('#fff0d4'), 0, 70, 0.52, 0.55, 1.3); headSpot.position.set(0, 0.8, 1.5); headSpot.target.position.set(0, 0, 18);
  fxAddTo(scene); pedsAddTo(scene); initHeli(); boomAddTo(scene);
}
function applyTime() {
  const T = TIMES[settings.time] || TIMES.day; applyBloomTime(); initClouds();
  const u = sky.material.uniforms; u.top.value = C(T.sky[0]); u.hor.value = C(T.sky[1]); u.bot.value = C(T.fog);   // below the horizon the sky matches the fog, so there's no seam when you're high up
  u.sunDir.value.set(...T.sunDir).normalize(); u.sunCol.value = C(T.sun).multiplyScalar(T.sunVis);
  scene.fog.color = C(T.fog);
  WMAT.far.color = C(T.fog).lerp(new THREE.Color(1, 1, 1), 0.35); WMAT.far.emissive = C(T.fog).multiplyScalar(settings.time === 'night' ? 0.15 : 0.32);
  sun.color = C(T.sun); sun.intensity = T.sunI; hemi.color = C(T.hemi[0]); hemi.groundColor = C(T.hemi[1]); hemi.intensity = T.hemi[2];
  WMAT.office.emissiveIntensity = T.win; WMAT.house.emissiveIntensity = T.win * 0.8; WMAT.brick.emissiveIntensity = T.win * 0.75; WMAT.glass.emissiveIntensity = T.win * 0.5; WMAT.shopf.emissiveIntensity = T.win * 0.42; WMAT.bill.emissiveIntensity = T.win * 0.45;
  WMAT.lampHead.color = T.lamps > 0 ? new THREE.Color(1.6, 1.05, 0.5) : C('#55554f');
  WMAT.pool2.opacity = T.lamps * 0.5;
  MAT.head.emissiveIntensity = T.head; MAT.tail.emissiveIntensity = T.tail;
  renderer.toneMappingExposure = T.exp; starPts.material.opacity = T.stars;
  if (!envCache[settings.time]) envCache[settings.time] = makeEnv(T.env, [{ w: 40, h: 40, c: T.sun, i: 1.5 * T.sunVis + 0.2, pos: T.sunDir.map(x => x * 40) }]);
  scene.environment = envCache[settings.time];
  headSpot.intensity = T.glow > 0.5 ? 2.4 : 0;
  for (const m of ptMats) m.uniforms.uFogColor.value.copy(scene.fog.color);
}
function applyQuality() {
  const Q = QUALITY[settings.quality] || QUALITY.medium;
  DYN.scale = 1; renderer.setPixelRatio(basePR());
  if (Q.shadow) { sun.castShadow = true; if (sun.shadow.mapSize.x !== Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
  else sun.castShadow = false;
  scene.fog.near = Q.fog * 0.22; scene.fog.far = Q.fog;
  for (const m of ptMats) { m.uniforms.uFogNear.value = scene.fog.near; m.uniforms.uFogFar.value = scene.fog.far; }
  onResize();
}

// ---------------- camera ----------------
const CAM = { mode: 0, h: 0, y: 3, zoom: false, ly: 0, lp: 0, lookT: -9, drag: null, op: 0.32, zd: 5.5, zc: 5.5, sl: false, carZoom: 1, padLook: null };
// ---- Roblox-style on-foot camera ----
// Right-drag (or a finger) orbits, the wheel or I / O zooms all the way into first person, WASD moves relative to the
// camera and the character turns to face where it walks. Ctrl toggles shift-lock: the mouse turns the camera, the
// character always faces forward and the view sits over the right shoulder.
const RBX = { min: 0.5, max: 40, fp: 0.95, def: 5.5 };
function rbxFoot() { const p = HERO.p; return settings.camStyle !== 'classic' && G.onFoot && !!p && !p.rag && !HERO.chute && !HERO.fly && !SHOP.inside && !G.down && !HERO.enter; }
function rbxLocked() { return rbxFoot() && (CAM.sl || CAM.zd < RBX.fp); }   // the mouse steers the camera without holding a button
function rbxZoom(f) {
  if (!G.onFoot) { CAM.carZoom = clamp(CAM.carZoom * f, 0.55, 2.6); return; }
  if (CAM.zd < RBX.fp) { if (f > 1) CAM.zd = 1.6; }
  else { CAM.zd = clamp(CAM.zd * f, RBX.min, RBX.max); if (CAM.zd < 1.25 && f < 1) CAM.zd = RBX.min; }
}
function toggleShiftLock() {
  CAM.sl = !CAM.sl;
  feed(CAM.sl ? (APP.touch ? 'Shift lock on' : 'Shift lock on: the mouse turns the camera (Ctrl to turn off)') : 'Shift lock off', 'blue');
  rbxPointer(true);
}
// lock the mouse to the game while it's steering the camera. Asking needs a click or key press, so `ask` is only set from one
function rbxPointer(ask) {
  const cv = renderer.domElement, want = APP.mode === 'game' && !APP.paused && !BM.open && !APP.touch && rbxLocked(), has = document.pointerLockElement === cv;
  if (want && !has && ask && cv.requestPointerLock) { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } }
  else if (!want && has) { try { document.exitPointerLock(); } catch (e) { } }
  if (cv.classList.contains('rbxlock') !== want) cv.classList.toggle('rbxlock', want);
}
// how far along the line from the player to the camera the first tall building is (1 = nothing in the way)
function camOcclude(sx, sz, sy, tx, tz) {
  let best = 1;
  if (!SHOP.inside) for (const b of W.tallBoxes) { if (b.x1 < Math.min(sx, tx) - 1 || b.x0 > Math.max(sx, tx) + 1 || b.z1 < Math.min(sz, tz) - 1 || b.z0 > Math.max(sz, tz) + 1) continue; if (b.h < sy) continue; const t = segBox(sx, sz, tx, tz, { x0: b.x0 - 0.4, z0: b.z0 - 0.4, x1: b.x1 + 0.4, z1: b.z1 + 0.4 }); if (t >= 0 && t < best) best = t; }
  return best;
}
const CAM_MODES = [{ d: 7.4, h: 2.7, look: 3.5, name: 'Chase' }, { d: 12, h: 4.4, look: 4, name: 'Far chase' }, { d: 0, h: 0, look: 0, name: 'Hood' }];
function resetCamera() { const P = PF(); if (!P) return; CAM.h = P.h; CAM.y = P.y + 3; }
function updateCamera(dt) {
  const F = PF(); if (!F) return;
  CAM.fpFoot = false; CAM.fpBike = false; CAM.roll = 0;
  if (CAM.free) { camera.position.set(...CAM.free[0]); camera.lookAt(...CAM.free[1]); sky.position.copy(camera.position); return; }
  const car = G.onFoot ? null : G.player;
  const sp = Math.hypot(F.vx, F.vz), port = camera.aspect < 0.9 ? 1.45 : 1, sc = slowCurve();
  let px, py, pz, lx, ly, lz, d, hgt, look, lookY, sy, camH;
  if (G.plane) {
    const pl = G.plane, D = pl.def;
    CAM.h = lerpA(CAM.h, pl.yaw, damp(pl.ground ? 5 : 3.6, dt));
    if (CAM.mode === 2 && !pl.wreck) {
      const fx = Math.sin(pl.yaw) * Math.cos(pl.pitch), fy = Math.sin(pl.pitch), fz = Math.cos(pl.yaw) * Math.cos(pl.pitch);
      px = pl.x + fx * D.cockZ; py = pl.y + D.eye + fy * D.cockZ; pz = pl.z + fz * D.cockZ;
      lx = px + fx * 30; ly = py + fy * 30; lz = pz + fz * 30;
    } else {
      const dist = (D.camD + clamp(pl.speed / 80, 0, 1) * 4) * port * (pl.wreck ? 1.4 : 1) * CAM.carZoom, cpit = clamp(pl.pitch, -0.7, 0.7) * 0.55;
      const cx = Math.sin(CAM.h + CAM.ly), cz = Math.cos(CAM.h + CAM.ly);
      px = pl.x - cx * dist * Math.cos(cpit); pz = pl.z - cz * dist * Math.cos(cpit);
      CAM.y = lerp(CAM.y, pl.y + D.camH - Math.sin(cpit) * dist + CAM.lp * dist * 0.8, damp(4, dt)); py = Math.max(CAM.y, heightAt(px, pz) + 1.2);
      lx = pl.x + cx * 10; lz = pl.z + cz * 10; ly = pl.y + 1.6 + Math.sin(cpit) * 10;
    }
  } else if (car) {
    const M = CAM_MODES[CAM.mode], upright = !car.flipped && !car.tumble;
    let th = car.h; if (sp > 4 && car.vf > 0 && upright) th = lerpA(car.h, Math.atan2(car.vx, car.vz), 0.35);
    CAM.h = lerpA(CAM.h, th, damp(CAM.mode === 2 ? 30 : upright ? 4.5 : 1.5, dt));
    d = (M.d + clamp(sp / 60, 0, 1) * 1.2) * port * (1 + sc * 0.75) * (car.tank ? 1.6 : 1) * CAM.carZoom; hgt = (M.h * (port > 1 ? 1.3 : 1) + sc * 1.5) * (car.tank ? 1.5 : 1) * (0.55 + 0.45 * CAM.carZoom); look = M.look * (1 - sc); lookY = 1.15; sy = car.y + 1.6;
    camH = CAM.h + sc * (G.orbitSide || 1) * 1.15;
    if (CAM.mode === 2 && car.bike && !car.tumble && !car.flipped && sc < 0.02) {
      // on the bike: from the rider's helmet, leaning and lifting with the bike
      const ln = car.bikeLean || 0, wh = car.wh || 0, hh = car.model.eye || 1.74, c = Math.cos(car.h), s = Math.sin(car.h);
      const lat = -Math.sin(ln) * hh * Math.cos(wh), up = Math.cos(ln) * hh * Math.cos(wh) + Math.sin(wh) * 0.75, fwd = 0.16 - Math.sin(wh) * 0.6;
      px = car.x + c * lat + s * fwd; pz = car.z - s * lat + c * fwd; py = car.ry + up;
      const pit = -0.1 + wh * 0.9;
      lx = px + s * 20; lz = pz + c * 20; ly = py + Math.tan(pit) * 20;
      CAM.roll = ln * 0.9; CAM.fpBike = true;
    } else if (CAM.mode === 2 && upright && sc < 0.02) {
      const hf = Math.sin(car.h), hz = Math.cos(car.h);
      px = car.x + hf * 0.2; pz = car.z + hz * 0.2; py = car.y + car.height * 0.82; lx = car.x + hf * 20; lz = car.z + hz * 20; ly = py - 1.2;
    }
  } else if (rbxFoot()) {
    const p = HERO.p, s = p.scale || 1;
    CAM.zc = lerp(CAM.zc, CAM.zd, damp(12, dt)); if (Math.abs(CAM.zc - CAM.zd) < 0.01) CAM.zc = CAM.zd;
    if (CAM.padLook) { CAM.h = wrapA(CAM.h - CAM.padLook[0] * 2.6 * dt); CAM.op = clamp(CAM.op + CAM.padLook[1] * 1.8 * dt, -1.25, 1.35); }
    const yaw = CAM.h, pit = CAM.op, sy0 = Math.sin(yaw), cy0 = Math.cos(yaw);
    if (CAM.zc < RBX.fp) {   // zoomed all the way in: first person
      const bob = Math.abs(Math.sin((p.phase || 0) * 0.5)) * 0.05 * Math.min(1, Math.abs(p.sp) / 3);
      px = p.x + sy0 * 0.2; pz = p.z + cy0 * 0.2; py = p.y + 1.62 * s + bob;
      lx = px + sy0 * Math.cos(pit) * 20; lz = pz + cy0 * Math.cos(pit) * 20; ly = py - Math.sin(pit) * 20;
      CAM.fpFoot = true;
    } else {
      const sh = CAM.sl ? 0.85 : 0, fy = p.y + 1.45 * s, fx = p.x - cy0 * sh, fz = p.z + sy0 * sh;   // shift-lock: over the right shoulder
      const cdx = -sy0 * Math.cos(pit), cdz = -cy0 * Math.cos(pit), cdy = Math.sin(pit), d0 = CAM.zc * port;
      const t = camOcclude(p.x, p.z, fy, fx + cdx * d0, fz + cdz * d0), want = t < 1 ? Math.max(0.1, t - 0.04) : 1;
      CAM.frac = want < (CAM.frac || 1) ? want : lerp(CAM.frac || 1, want, damp(2.5, dt));
      const d1 = d0 * CAM.frac;
      px = fx + cdx * d1; pz = fz + cdz * d1; py = Math.max(fy + cdy * d1, heightAt(px, pz) + 0.3);
      lx = fx; ly = fy; lz = fz;
    }
    CAM.y = py;
  } else {
    const p = HERO.p; if (p && !p.rag && ARMS.mouseAimT <= 0) CAM.h = lerpA(CAM.h, p.h, damp(3.2, dt));
    d = 4.9 * port * (1 + sc * 0.5); hgt = 2.45 * (port > 1 ? 1.15 : 1) + sc; look = 1.8; lookY = 1.2; sy = F.y + 1.4; camH = CAM.h + sc * (G.orbitSide || 1) * 0.9;
    if (SHOP.inside) { d = 5.4 * port; hgt = 9.2; look = 1.2; }
    if (CAM.mode === 2 && p && !p.rag && !HERO.chute && !HERO.fly && !SHOP.inside && !HERO.swim && !G.down) {
      const yaw = p.h + CAM.ly, pit = clamp(-CAM.lp * 0.9, -1.2, 1.2), s = p.scale || 1, bob = Math.abs(Math.sin((p.phase || 0) * 0.5)) * 0.05 * Math.min(1, Math.abs(p.sp) / 3);
      px = p.x + Math.sin(p.h) * 0.22; pz = p.z + Math.cos(p.h) * 0.22; py = p.y + 1.62 * s + bob;
      lx = px + Math.sin(yaw) * Math.cos(pit) * 20; lz = pz + Math.cos(yaw) * Math.cos(pit) * 20; ly = py + Math.sin(pit) * 20;
      CAM.fpFoot = true;
    }
    else if (HERO.chute && HERO.chute.free) { d = 5.5 * port; hgt = 3.2; look = 2; lookY = -2.5; }   // sky-diving: look down at where you're heading
    else if (HERO.chute) { d = 12 * port; hgt = 2.2; look = 3; lookY = 0.8; }                // under the canopy: wing at the top, landing zone below
    else if (HERO.fly) { d = 8.5 * port; hgt = 4.8; look = 2; lookY = 3.2; }
  }
  if (px === undefined) {
    if (CAM.ly || CAM.lp) { camH += CAM.ly; hgt += CAM.lp * d * 0.9; look *= Math.max(0, 1 - Math.abs(CAM.ly) * 1.5); d *= 1 + Math.max(0, CAM.lp) * 0.2; }
    const fx = Math.sin(camH), fz = Math.cos(camH);
    let tx = F.x - fx * d, tz = F.z - fz * d;
    const sx = F.x, sz = F.z;
    let best = 1;
    if (!SHOP.inside) for (const b of W.tallBoxes) { if (b.x1 < Math.min(sx, tx) - 1 || b.x0 > Math.max(sx, tx) + 1 || b.z1 < Math.min(sz, tz) - 1 || b.z0 > Math.max(sz, tz) + 1) continue; if (b.h < sy) continue; const t = segBox(sx, sz, tx, tz, { x0: b.x0 - 0.4, z0: b.z0 - 0.4, x1: b.x1 + 0.4, z1: b.z1 + 0.4 }); if (t >= 0 && t < best) best = t; }
    const want = best < 1 ? Math.max(0.18, best - 0.04) : 1;
    CAM.frac = want < (CAM.frac || 1) ? want : lerp(CAM.frac || 1, want, damp(2.5, dt));
    tx = sx + (tx - sx) * CAM.frac; tz = sz + (tz - sz) * CAM.frac;
    if (!car && G.onFoot && (HERO.chute || HERO.fly) && HERO.p && !HERO.p.rag) CAM.y += (HERO.vy || 0) * dt;   // keep pace with a fast fall instead of trailing below
    CAM.y = lerp(CAM.y, F.y + hgt, damp(car && !car.onGround ? 2.5 : 6, dt));
    px = tx; pz = tz; py = Math.max(CAM.y, heightAt(px, pz) + 0.6);
    const lh = Math.sin(CAM.h), lv = Math.cos(CAM.h);
    lx = F.x + lh * look + (car ? F.vx * 0.08 : 0); lz = F.z + lv * look + (car ? F.vz * 0.08 : 0); ly = F.y + lookY;
  }
  if (!CAM.drag && GT - CAM.lookT > 1.4) { CAM.ly = lerp(CAM.ly, 0, damp(2.5, dt)); if (!CAM.fpFoot) CAM.lp = lerp(CAM.lp, 0, damp(2.5, dt)); }
  const sh = G.shake; G.shake *= Math.exp(-5 * dt); const tt = performance.now() / 1000;
  camera.position.set(px + (Math.sin(tt * 41) + Math.sin(tt * 27.3)) * 0.5 * sh, py + (Math.sin(tt * 37.7) + Math.sin(tt * 19.1)) * 0.5 * sh, pz + Math.sin(tt * 33.1) * sh);
  camera.lookAt(lx, ly, lz);
  if (CAM.roll) camera.rotateZ(CAM.roll);
  // depth precision: the higher the camera, the further out the near clip plane can go. Without this, surfaces a few
  // millimetres apart (runways on sand, pads, road markings) shimmer and flicker when seen from the air
  { const alt = camera.position.y - heightAt(camera.position.x, camera.position.z), fp = CAM.fpFoot || CAM.fpBike || (G.plane && CAM.mode === 2) || (!G.onFoot && !G.plane && CAM.mode === 2);
    const toF = Math.hypot(camera.position.x - F.x, camera.position.y - F.y, camera.position.z - F.z), nr = fp ? 0.1 : clamp(Math.min(alt * 0.022, toF * 0.3), 0.1, 2.6); camera.near = lerp(camera.near, nr, nr < camera.near ? 1 : damp(4, dt)); }
  const fov = (CAM.fpBike ? 8 : 0) + (G.plane ? 60 + clamp(G.plane.speed / 120, 0, 1) * 16 : (car ? 62 + clamp(sp / 55, 0, 1) * 14 + (car.boosting ? 6 : 0) : G.onFoot && HERO.chute ? (HERO.chute.free ? 70 : 68) : 58) - sc * 10);
  camera.fov = lerp(camera.fov, fov, damp(3, dt)); camera.updateProjectionMatrix();
  const scale = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  for (const m of ptMats) m.uniforms.uScale.value = scale;
  sky.position.copy(camera.position); starPts.position.copy(camera.position);
  const T = TIMES[settings.time];
  const shY = Math.min(F.y, heightAt(F.x, F.z) + 24);   // keep the shadow box on the ground under you, not up in the sky
  sun.position.set(F.x + T.sunDir[0] * 160, shY + T.sunDir[1] * 160, F.z + T.sunDir[2] * 160); sun.target.position.set(F.x, shY, F.z);
}
// ---------------- glow sprites ----------------
const _gc = new THREE.Color();
function updateGlow() {
  const T = TIMES[settings.time], gl = FX.glow; gl.begin();
  const cx = camera.position.x, cz = camera.position.z;
  const flash = (GT * 6) % 2 < 1;
  MAT.sirenR.color.setRGB(flash ? 1.6 : 0.25, flash ? 0.15 : 0.02, flash ? 0.15 : 0.02);
  MAT.sirenB.color.setRGB(flash ? 0.02 : 0.15, flash ? 0.05 : 0.35, flash ? 0.3 : 2.0);
  for (const v of VEH.list) {
    if (!v.obj.visible || v.flipped || v.tumble) continue;
    const d2 = (v.x - cx) ** 2 + (v.z - cz) ** 2; if (d2 > 170 * 170) continue;
    const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx, D = v.model.dims;
    if (v.lockFlash > 0) {   // indicators blink when the car locks or unlocks
      v.lockFlash -= 1 / 60;
      if ((v.lockFlash * 7) % 2 > 1) { const o = D.W / 2 - 0.2; for (const [zz, yy] of [[D.hz + 0.02, D.hy], [D.tz - 0.02, D.ty]]) for (const s of [-1, 1]) gl.add(v.x + fx * zz + rx * o * s, v.y + yy, v.z + fz * zz + rz * o * s, COL.blink, 1.3, 0.95); }
    }
    if (v.police && v.ai && v.ai.chasing && !v.wrecked) {
      const y = v.y + D.roofY + 0.14, bx = v.x + fx * D.roofZ, bz = v.z + fz * D.roofZ;
      gl.add(bx - rx * 0.28, y, bz - rz * 0.28, flash ? COL.sirenR : COL.sirenB, flash ? 3.2 : 1.2, 0.9);
      gl.add(bx + rx * 0.28, y, bz + rz * 0.28, flash ? COL.sirenR : COL.sirenB, flash ? 1.2 : 3.2, 0.9);
    }
    if (T.glow > 0 && !v.wrecked && v.kind !== 'parked') {
      const hx = v.x + fx * (D.hz + 0.05), hz = v.z + fz * (D.hz + 0.05), hy = v.y + D.hy, o = D.W / 2 - 0.36;
      if (!v.headBroken) { gl.add(hx + rx * o, hy, hz + rz * o, COL.head, 1.5, 0.55 * T.glow); gl.add(hx - rx * o, hy, hz - rz * o, COL.head, 1.5, 0.55 * T.glow); }
      const tx = v.x + fx * (D.tz - 0.05), tz = v.z + fz * (D.tz - 0.05), ty = v.y + D.ty, br = v.input.brake > 0.1 && v.vf > 0.5 ? 1.6 : 1;
      if (!v.tailBroken) { gl.add(tx + rx * o, ty, tz + rz * o, COL.tail, 0.8 * br, 0.5 * T.glow); gl.add(tx - rx * o, ty, tz - rz * o, COL.tail, 0.8 * br, 0.5 * T.glow); }
    }
  }
  if (T.lamps > 0) {
    const L = W.inst.props.lamp; if (L) for (const p of L.list) { if (p.st !== 0) continue; if ((p.hx - cx) ** 2 + (p.hz - cz) ** 2 > 180 * 180) continue; gl.add(p.hx, p.y + 6.9, p.hz, COL.sodium, 2.6, 0.55 * T.lamps); }
    const TL = W.inst.tl; if (TL) for (const h of TL.heads) { if ((h.gx - cx) ** 2 + (h.gz - cz) ** 2 > 110 * 110) continue; const s = h.s || 'R'; const k = s === 'R' ? 0 : s === 'Y' ? 1 : 2; gl.add(h.gx, h.y + 5.02 - k * 0.32, h.gz, s === 'R' ? COL.tlR : s === 'Y' ? COL.tlY : COL.tlG, 1.1, 0.7 * T.lamps); }
  }
  if (T.lamps > 0 && W.stadium && W.stadium.lights) for (const [x, y, z] of W.stadium.lights) if ((x - cx) ** 2 + (z - cz) ** 2 < 600 * 600) gl.add(x, y, z, COL.head, 9, 0.7 * T.lamps);
  weaponGlow(gl);
  for (let i = G.flashes.length - 1; i >= 0; i--) { const f = G.flashes[i]; f.t -= 1 / 60; if (f.t <= 0) { G.flashes.splice(i, 1); continue; } gl.add(f.x, f.y, f.z, COL.fireHot, f.s * (f.t / 0.4), 1); }
  gl.end();
}
G.flashes = [];

// ---------------- HUD ----------------
const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6.1 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.8 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>';
const _el = {}; const el = id => _el[id] || (_el[id] = document.getElementById(id));
const HUD = { stars: -1, flash: null, stuntT: 0, helpT: 12 };
function initHUD() {
  $('#stars').innerHTML = STAR_SVG.repeat(5);
  const mm = $('#minimap'); HUD.mm = mm.getContext('2d');
}
function feed(text, kind) {
  if (APP.mode !== 'game') return;
  const f = $('#feed'), d = document.createElement('div'); d.className = 'msg' + (kind ? ' ' + kind : ''); d.textContent = text; f.prepend(d);
  while (f.children.length > 4) f.lastChild.remove();
  setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 600); }, 3600);
}
function onPlayerLand(v) {
  if (v.airT < 0.7) return;
  const dist = Math.hypot(v.x - v.airX, v.z - v.airZ);
  G.stats.bestAir = Math.max(G.stats.bestAir, v.airT); G.stats.bestAirDist = Math.max(G.stats.bestAirDist, dist);
  const u = settings.units === 'mph';
  $('#stunt').innerHTML = `${v.airT > 1.6 ? 'Huge jump' : 'Stunt jump'}<small>${v.airT.toFixed(1)} s air · ${u ? Math.round(dist * 3.281) + ' ft' : Math.round(dist) + ' m'}</small>`;
  $('#stunt').style.opacity = '1'; HUD.stuntT = 2.4;
  MIS.jumpBest = Math.max(MIS.jumpBest, dist);
}
// HUD writes only touch the page when the value actually changes: rewriting the same text or width every frame
// still makes the browser redo style and layout work
const _hudC = {};
function hudT(id, v) { v = String(v); if (_hudC[id] !== v) { _hudC[id] = v; el(id).textContent = v; } }
function hudS(id, prop, v) { const k = id + '.' + prop; if (_hudC[k] !== v) { _hudC[k] = v; el(id).style[prop] = v; } }
function hudH(id, v) { v = !!v; const k = id + '.h'; if (_hudC[k] !== v) { _hudC[k] = v; el(id).hidden = v; } }
function updateHUD(dt) {
  const P = G.player, F = PF(); if (!F) return;
  const mph = settings.units === 'mph', PL = G.plane, foot = !PL && (G.onFoot || !P);
  hudH('spdrow', foot); hudH('n2oLabel', foot); hudH('n2oBar', foot);
  hudT('hpLabel', PL ? 'Hull' : foot ? 'Health' : 'Body');
  hudT('n2oLabel', PL ? 'Throttle' : 'Nitro');
  if (HUD.altOn !== !!PL) { HUD.altOn = !!PL; hudH('altrow', !PL); $('#ui').classList.toggle('flying', !!PL); }
  { const bomber = !!PL && (PL.type === 'stinger' || PL.type === 'hornet'), bt = !bomber ? '' : PL.type === 'hornet' ? `ROCKETS ${PL.rocketsLeft === undefined ? PL.def.rockets : PL.rocketsLeft}` : `BOMBS ${PL.bombs === undefined ? BOMBS.max : PL.bombs}`; if (HUD.bombs !== bt + (PL ? PL.type : '')) { HUD.bombs = bt + (PL ? PL.type : ''); hudT('bombsV', bt); const wb = $('#touch [data-k=wpn]'); if (wb) { wb.textContent = bomber ? 'BOMB' : 'GUN'; wb.classList.toggle('bomb', bomber); } const hb = $('#touch [data-k=horn]'); if (hb) hb.textContent = PL && (PL.type === 'stinger' || PL.type === 'heli') ? 'FIRE' : 'HORN'; } }
  let hp;
  if (PL) {
    hudT('spd', Math.round(PL.speed * (mph ? 2.237 : 3.6))); hudT('unit', mph ? 'MPH' : 'KM/H'); hudT('gear', PL.ground ? 'GND' : 'AIR');
    hudS('nitroFill', 'width', (PL.T * 100).toFixed(1) + '%');
    const alt = Math.max(0, PL.y - planeGround(PL)); hudT('altV', Math.round(mph ? alt * 3.281 : alt)); hudT('altU', mph ? 'ALT FT' : 'ALT M');
    const stall = !PL.ground && !PL.wreck && PL.V.length() < PL.def.vstall * 1.05; if (HUD.stall !== stall) { HUD.stall = stall; hudH('stall', !stall); }
    hp = Math.max(0, PL.hp) / PL.def.hp;
  } else if (!foot) {
    hudT('spd', Math.round(Math.abs(P.vf) * (mph ? 2.237 : 3.6)));
    hudT('unit', mph ? 'MPH' : 'KM/H'); hudT('gear', G.gear || 'N');
    hudS('nitroFill', 'width', (P.st.nitro ? P.nitro * 100 : 0).toFixed(1) + '%');
    hp = P.health / P.maxHp;
  } else hp = HERO.hp / HERO.maxHp;
  hudS('hpFill', 'width', (hp * 100).toFixed(1) + '%'); hudS('hpFill', 'background', hp > 0.5 ? 'var(--good)' : hp > 0.25 ? 'var(--sodium)' : 'var(--siren-red)');
  if (HUD.stars !== wanted.stars) { HUD.stars = wanted.stars; $$('#stars svg').forEach((s, i) => s.classList.toggle('on', i < wanted.stars)); }
  const st = el('stars'); st.classList.toggle('flash', wanted.stars > 0 && !wanted.seen); st.classList.toggle('hot', wanted.stars > 0 && wanted.seen);
  hudH('bust', wanted.bust < 0.2); hudS('bustFill', 'width', clamp(wanted.bust / 3.2 * 100, 0, 100) + '%');
  const wi = ARMS.cur, wv = WEAPONS[wi];
  hudH('wpn', !gunsOn() || !!PL);
  const wt = wv.name + '|' + (wi ? (ARMS.reloadT > 0 ? 'Reloading' : ARMS.mag[wi] + ' / ' + ARMS.ammo[wi]) : 'Q to punch');
  if (HUD.wt !== wt) { HUD.wt = wt; el('wpnName').textContent = wv.name; el('wpnAmmo').textContent = wt.split('|')[1]; el('wpn').classList.toggle('empty', wi > 0 && ARMS.mag[wi] + ARMS.ammo[wi] === 0); }
  const cash = '$' + MIS.cash.toLocaleString(); if (HUD.cash !== cash) { HUD.cash = cash; el('cash').textContent = cash; }
  // context prompt
  let pr = '';
  const key = k => APP.touch ? '' : `<kbd>${k}</kbd> `;
  if (!G.down) {
    if (G.onFoot && HERO.p && !HERO.p.rag && !HERO.enter) { const pl = nearPlane(), v = pl ? null : findEnterable(); if (pl) pr = APP.touch ? `Tap CAR to fly the ${pl.def.name}` : `${key('F')}Fly the ${pl.def.name}`; else if (v) pr = APP.touch ? `Tap CAR to ${v.ai ? (v.police ? 'steal the cruiser' : 'steal this car') : 'get in'}` : `${key('F')}${v.ai ? (v.police ? 'Steal the police cruiser' : 'Steal this car') : 'Get in'}`; }
    else if (P && (P.flipped || (P.tumble && P.speed < 1.5))) pr = APP.touch ? 'Tap CAR to roll your car back over' : `${key('R')}Roll your car back over`;
    else if (P && HUD.exitHintT > 0) pr = `${key('F')}Get out of the car`;
  }
  if (HUD.exitHintT > 0) HUD.exitHintT -= dt;
  if (SHOP.prompt && !G.down && (G.onFoot || SHOP.carPrompt)) pr = SHOP.prompt;
  if (G.onFoot && !G.down && HERO.carrots > 0 && !SHOP.inside) { const cv = carrotTarget(); if (cv) pr = APP.touch ? 'Tap CAR to shove a carrot up the exhaust' : `${key('G')}Shove a carrot up the exhaust <small>${HERO.carrots} left</small>`; }
  if (G.onFoot && !G.down && canDeploy() && (!HERO.fly || HERO.vy < -6)) { const low = chuteAlt() < 60 && (!HERO.p.rag || HERO.p.rag.pos[25] < HERO.p.rag.prev[25]); pr = (low ? '⚠ ' : '') + (APP.touch ? 'Tap CAR to open your parachute' : `${key('Space')}${key('F')}Open your parachute`); }
  if (G.plane && !G.down) {
    const PL = G.plane;
    if (HUD.exitHintT > 0 && PL.def.kind === 'heli') { const arm = PL.type === 'heli' || PL.type === 'hornet'; pr = APP.touch ? `GAS / BRAKE forward-back · ◀ ▶ turn · DRIFT up · N2O down${arm ? ' · HORN fire' : ''}${PL.type === 'hornet' ? ' · BOMB rockets' : ''}` : `${key('W')}${key('S')}forward/back · ${key('A')}${key('D')}turn · ${key('Space')}up · ${key('Shift')}down${arm ? ` · ${key('Q')}fire` : ''}${PL.type === 'hornet' ? ` · ${key('B')}rockets` : ''}`; }
    else if (HUD.exitHintT > 0) pr = APP.touch ? `THR+ / THR− throttle · ◀ ▶ turn · CLIMB / DIVE${PL.type === 'stinger' ? ' · BOMB · HORN fire' : ''}` : `${key('W')}${key('S')}throttle · ${key('A')}${key('D')}turn · ${key('Space')}climb · ${key('Shift')}dive${PL.type === 'stinger' ? ' · ' + key('B') + 'bomb · ' + key('Q') + 'guns' : ''}`;
    else if (!PL.ground && (PL.dead || PL.hp < PL.def.hp * 0.4)) pr = APP.touch ? 'Tap CAR to bail out' : `${key('F')}Bail out`;
    else if (PL.ground && PL.V.length() < 6) pr = APP.touch ? 'Tap CAR to get out' : `${key('F')}Get out`;
  }
  if (!pr && !G.down && heliOverhead()) pr = APP.touch ? 'Police chopper overhead: tap MSL to fire a homing missile' : `${key('V')}Fire a homing missile at the police chopper`;
  { const mb = $('#touch [data-k=msl]'); if (mb) { const on = !G.down && !!heliOverhead(); if (mb.hidden === on) mb.hidden = !on; } }
  const pe = el('prompt'); if (pe.dataset.t !== pr) { pe.dataset.t = pr; pe.innerHTML = pr; pe.hidden = !pr; }
  const lblKey = (G.plane ? 'plane' : G.onFoot) + ':' + ARMS.cur;
  if (APP.touch && HUD.footLbl !== lblKey) {
    HUD.footLbl = lblKey; const L = G.plane ? { gas: 'THR+', brake: 'THR−', hand: 'CLIMB', nitro: 'DIVE', horn: 'HORN' } : G.onFoot ? { gas: 'WALK', brake: 'BACK', hand: 'JUMP', nitro: 'RUN', horn: ARMS.cur ? 'FIRE' : 'PUNCH' } : { gas: 'GAS', brake: 'BRAKE', hand: 'DRIFT', nitro: 'N2O', horn: 'HORN' };
    L.wpn = WEAPONS[ARMS.cur].short;
    for (const k in L) { const b = document.querySelector(`#touch [data-k=${k}]`); if (b) b.textContent = L[k]; }
  }
  if (HUD.stuntT > 0) { HUD.stuntT -= dt; if (HUD.stuntT <= 0) el('stunt').style.opacity = '0'; }
  if (HUD.helpT > 0) { HUD.helpT -= dt; if (HUD.helpT <= 0) el('help').style.opacity = '0'; }
  updateMissionHUD();
  drawMinimap();
}
function drawMinimap() {
  const g = HUD.mm, cv = g.canvas, size = cv.width, P = PF(), half = size / 2;
  const R = G.plane ? (G.plane.ground ? 200 : 420) : 150, s = half / R;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, size, size);
  g.save(); g.beginPath(); g.arc(half, half, half, 0, TAU); g.clip();
  g.fillStyle = W.miniBg || 'rgba(14,16,21,.92)'; g.fillRect(0, 0, size, size);
  const fx = Math.sin(CAM.h), fz = Math.cos(CAM.h), rx = -fz, rz = fx;
  const a = s * rx, c = s * rz, b = -s * fx, d = -s * fz, e = half - (a * P.x + c * P.z), f = half - (b * P.x + d * P.z);
  g.setTransform(a, b, c, d, e, f);
  const M = W.mini;
  if (W.waters) { g.fillStyle = '#1b4a63'; g.fill(M.water); }
  g.fillStyle = W.miniFlat || '#1f232b'; g.fill(M.flats);
  if (M.air) { g.fillStyle = '#3d434d'; g.fill(M.air); } if (M.runway) { g.fillStyle = '#7a818c'; g.fill(M.runway); }
  g.fillStyle = '#2a2f39'; g.fill(M.blocks); g.fillStyle = '#2b5132'; g.fill(M.parks);
  g.fillStyle = '#48505f'; g.fill(M.bldgs);
  g.strokeStyle = '#7b8494'; g.lineWidth = W.hw * 2; g.lineCap = 'square'; g.stroke(M.roads);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const flash = (GT * 4) % 2 < 1;
  const toS = (x, z, edge) => { const dx = x - P.x, dz = z - P.z; let sx = half + s * (rx * dx + rz * dz), sy = half - s * (fx * dx + fz * dz); if (edge) { const ex = sx - half, ey = sy - half, el = Math.hypot(ex, ey); if (el > half - edge) { sx = half + ex / el * (half - edge); sy = half + ey / el * (half - edge); } } return [sx, sy]; };
  if (!MIS.active) for (const gv of MIS.givers) {
    const [sx, sy] = toS(gv.d.giver[0], gv.d.giver[1], 8), k = size * 0.035;
    g.fillStyle = MIS.done[gv.d.id] ? '#47d18c' : '#ffb21e'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx, sy - k); g.lineTo(sx + k, sy); g.lineTo(sx, sy + k); g.lineTo(sx - k, sy); g.closePath(); g.fill(); g.stroke();
  } else if (MIS.objX != null) {
    const [sx, sy] = toS(MIS.objX, MIS.objZ, 9);
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, size * (0.04 + (flash ? 0.01 : 0)), 0, TAU); g.fill(); g.stroke();
  }
  drawShopIcons(g, toS, size);
  netMarkers(g, toS, size * 0.04, true);
  for (const pl of PLANES.list) { if (pl.wreck || pl === G.plane) continue; const [sx, sy] = toS(pl.x, pl.z); drawPlaneGlyph(g, sx, sy, -wrapA(pl.yaw - CAM.h), size * 0.024, '#cfd6e0'); }
  for (const v of VEH.list) {
    if (!isCop(v)) continue;
    const [sx, sy] = toS(v.x, v.z, 6);
    g.fillStyle = v.ai.chasing ? (flash ? '#ff3b4f' : '#3f7dff') : '#8fb0ff'; g.beginPath(); g.arc(sx, sy, size * 0.028, 0, TAU); g.fill();
  }
  if (wanted.stars) for (const p of PED.list) { if (!p.active || !p.cop || p.rag) continue; const [sx, sy] = toS(p.x, p.z); g.fillStyle = flash ? '#ff3b4f' : '#3f7dff'; g.fillRect(sx - 2, sy - 2, 4, 4); }
  if (HELI.active) { const [sx, sy] = toS(HELI.x, HELI.z); g.strokeStyle = flash ? '#ff3b4f' : '#3f7dff'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, size * 0.05, 0, TAU); g.stroke(); }
  g.translate(half, half); g.rotate(-wrapA(P.h - CAM.h));
  g.fillStyle = G.plane ? '#7fd3ff' : G.onFoot ? '#ffffff' : '#ffb21e'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2;
  const k = size * 0.055; g.beginPath(); g.moveTo(0, -k * 1.3); g.lineTo(k, k); g.lineTo(0, k * 0.45); g.lineTo(-k, k); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
// ---------------- input ----------------
const KEYS = {}, TOUCH = {};
let hornOn = false;
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT')) return;
  if (CHAT.open) { if (e.code === 'Escape') { e.preventDefault(); closeChat(); } else if (e.code === 'Enter' || e.code === 'KeyT') { e.preventDefault(); const i = $('#chatIn'); if (i) i.focus(); } return; }
  KEYS[e.code] = true;
  if (APP.mode === 'game' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (APP.mode === 'game' && e.ctrlKey && e.code !== 'KeyW') e.preventDefault();   // Ctrl is shift-lock: keep Ctrl+S, Ctrl+D... from reaching the browser
  if (APP.mode === 'game' && !APP.paused && !BM.open && !e.repeat && (e.code === 'ControlLeft' || e.code === 'ControlRight')) { toggleShiftLock(); return; }
  if (e.repeat) return;
  if (APP.mode === 'game' && BM.open) { if (e.code === 'KeyM' || e.code === 'Escape') closeBigMap(); return; }
  if (APP.mode === 'game') {
    if ((e.code === 'KeyT' || e.code === 'Enter') && NET.R && !APP.paused && !CHAT.open) { e.preventDefault(); openChat(); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    else if (!APP.paused) {
      if (e.code === 'KeyC') cycleCamera();
      else if (e.code === 'KeyI' || e.code === 'KeyO') { rbxZoom(e.code === 'KeyI' ? 0.8 : 1.25); rbxPointer(true); }
      else if (e.code === 'KeyR') { if (G.onFoot) startReload(); else resetPlayerCar(); }
      else if (/^Digit[1-9]$/.test(e.code) && MENU.st && G.onFoot) buyItem(+e.code.slice(5) - 1);
      else if (/^Digit[1-5]$/.test(e.code)) selectWeapon(+e.code.slice(5) - 1);
      else if (e.code === 'Tab') { e.preventDefault(); cycleWeapon(1); }
      else if (e.code === 'KeyM') toggleBigMap();
      else if (e.code === 'KeyB') dropBomb();
      else if (e.code === 'KeyG') useCarrot();
      else if (e.code === 'KeyX') useMedkit();
      else if (e.code === 'KeyL') toggleLock();
      else if (e.code === 'KeyV') fireHoming();
      else if (e.code === 'Space' && G.onFoot && canDeploy()) deployChute();
      else if (e.code === 'KeyF' || e.code === 'KeyE') toggleVehicle();
    }
  } else if (e.code === 'Escape') {
    if (!$('#settings').hidden) closeSettings(); else if (APP.mode === 'garage') $('#garageBack').click();
  }
});
window.addEventListener('keyup', e => { KEYS[e.code] = false; });
window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; for (const k in TOUCH) TOUCH[k] = false; });
function cycleCamera() {
  if (rbxFoot()) { CAM.zd = CAM.zd < RBX.fp ? RBX.def : RBX.min; feed('Camera: ' + (CAM.zd < RBX.fp ? 'First person' : 'Third person')); rbxPointer(true); return; }
  CAM.mode = (CAM.mode + 1) % CAM_MODES.length; CAM.lp = 0; CAM.ly = 0; feed('Camera: ' + (CAM.mode === 2 && (G.onFoot || (G.player && G.player.bike)) ? 'First person' : CAM_MODES[CAM.mode].name)); }
function initTouch() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  APP.touch = coarse; if (coarse) $('#ui').classList.add('touch');
  for (const b of $$('#touch button')) {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); if (k === 'cam') { cycleCamera(); return; } if (k === 'wpn') { if (G.plane) dropBomb(); else cycleWeapon(1); return; } if (k === 'heal') { useMedkit(); return; } if (k === 'lock') { toggleLock(); return; } if (k === 'msl') { fireHoming(); return; } if (k === 'enter') { const P = G.player; if (P && !G.onFoot && (P.flipped || P.tumble)) resetPlayerCar(); else toggleVehicle(); return; } TOUCH[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) { } };
    const off = e => { TOUCH[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  }
}
let padCamPrev = false, padPausePrev = false, padEnterPrev = false, padWpnPrev = false;
function readInput(P) {
  let thr = (KEYS.KeyW || KEYS.ArrowUp || TOUCH.gas) ? 1 : 0, brk = (KEYS.KeyS || KEYS.ArrowDown || TOUCH.brake) ? 1 : 0;
  let steer = ((KEYS.KeyA || KEYS.ArrowLeft || TOUCH.left) ? 1 : 0) - ((KEYS.KeyD || KEYS.ArrowRight || TOUCH.right) ? 1 : 0);
  let hand = !!(KEYS.Space || TOUCH.hand), nitro = !!(KEYS.ShiftLeft || KEYS.ShiftRight || TOUCH.nitro), horn = !!(KEYS.KeyH || TOUCH.horn), punch = !!(KEYS.KeyQ || HERO.click);
  HERO.click = false;
  if (APP.touch) {
    // Touch: RUN / N2O drive you forward on their own, no need to hold WALK / GAS too
    const auto = !G.plane && TOUCH.nitro && !TOUCH.brake; if (auto) thr = 1;
    const gb = HUD.gasBtn || (HUD.gasBtn = document.querySelector('#touch [data-k=gas]'));
    if (gb) gb.classList.toggle('on', !!(TOUCH.gas || auto));
  }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let padX = 0, padY = 0; CAM.padLook = null;
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.15) steer = -ax;
    const ay = gp.axes[1] || 0; if (Math.abs(ax) > 0.15) padX = ax; if (Math.abs(ay) > 0.15) padY = ay;
    const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0; if (Math.abs(rx) > 0.15 || Math.abs(ry) > 0.15) CAM.padLook = [Math.abs(rx) > 0.15 ? rx : 0, Math.abs(ry) > 0.15 ? ry : 0];
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0, lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    thr = Math.max(thr, rt, G.onFoot && ay < -0.4 ? 1 : 0); brk = Math.max(brk, lt, G.onFoot && ay > 0.4 ? 1 : 0);
    if (gp.buttons[0] && gp.buttons[0].pressed) hand = true;
    if (gp.buttons[1] && gp.buttons[1].pressed) nitro = true;
    if (gp.buttons[2] && gp.buttons[2].pressed) { horn = true; }
    const en = gp.buttons[3] && gp.buttons[3].pressed; if (en && !padEnterPrev) toggleVehicle(); padEnterPrev = en;
    const cam = (gp.buttons[8] && gp.buttons[8].pressed) || (gp.buttons[5] && gp.buttons[5].pressed); if (cam && !padCamPrev) cycleCamera(); padCamPrev = cam;
    const pz = gp.buttons[9] && gp.buttons[9].pressed; if (pz && !padPausePrev) togglePause(); padPausePrev = pz;
    const wb = gp.buttons[4] && gp.buttons[4].pressed; if (wb && !padWpnPrev) cycleWeapon(1); padWpnPrev = wb;
    break;
  }
  if (G.onFoot) {
    const I = HERO.in, off = G.down;
    I.fwd = off ? 0 : thr > 0.3 ? 1 : brk > 0.3 ? -1 : 0; I.turn = off ? 0 : steer; I.sprint = nitro;
    I.mz = off ? 0 : padY ? -padY : (thr > 0.3 ? 1 : 0) - (brk > 0.3 ? 1 : 0); I.mx = off ? 0 : padX ? padX : -Math.sign(steer);   // camera-relative: forward / right
    I.jump = !off && hand && !HERO.jumpHeld; HERO.jumpHeld = hand;
    const pu = punch || horn;
    if (ARMS.cur && gunsOn()) { ARMS.trigger = !off && pu; I.punch = false; HERO.punchHeld = pu; }
    else { ARMS.trigger = false; I.punch = !off && pu && !HERO.punchHeld; HERO.punchHeld = pu; }
    if (hornOn) { hornOn = false; SFX.hornSet(false); }
    return;
  }
  ARMS.trigger = !G.down && !!P && ARMS.cur > 0 && gunsOn() && !!KEYS.KeyQ;
  const park = G.down || !P ? 1 : 0;
  if (park) { thr = 0; brk = 0; steer = 0; hand = false; nitro = false; horn = false; }
  if (P) Object.assign(P.input, { throttle: thr, brake: brk, steer, hand: hand ? 1 : 0, nitro: nitro ? 1 : 0, park });
  if (horn !== hornOn) { hornOn = horn; SFX.hornSet(horn); if (horn && P) for (const p of PED.list) if (p.active && !p.rag && (p.x - P.x) ** 2 + (p.z - P.z) ** 2 < 400 && Math.random() < 0.5) panic(p, P.x, P.z, 3); }
  if (nitro && P && P.boosting && !G.nitroWas) SFX.whoosh(); G.nitroWas = P && P.boosting;
}
// ---------------- game flow ----------------
function loadWorld(id) {
  if (W && W.group) { scene.remove(W.group); W.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  for (const v of [...VEH.list]) v.remove();
  G.player = null; heroHide(); clearPeds(); clearDebris(); clearSkids();
  for (const k of ['smoke', 'blood', 'debris', 'fire']) FX[k].clear();
  PROPS.active.length = 0; PROPS.emitters.length = 0; clearBoom();
  W = genWorld(id);
  DECALS.clear();
  W.group = buildWorldMeshes(W); scene.add(W.group); buildShops(); initStructs(); initPlanes(); initPug(); initConstruct(); initTerminal(); initStadiumGame(); if (KIDS.list.length) hideKids(); KIDS.school = null; HERO.web = null; HERO.fly = false;
  for (const pk of W.parked) { const v = new Vehicle(pk.cfg ? Object.assign(randomTrafficCfg(), pk.cfg) : randomTrafficCfg(), 'parked'); v.place(pk.x, pk.z, pk.h, 0); VEH.list.push(v); }
  spawnForSale(); clearThieves();
  APP.worldId = id;
  missionsLoad(); setupPickups(); setupMedkits(); clearWeapons();
  $('#mapLabel').textContent = W.name;
  netWorldLoaded();
}
function laneSpawnPoint(sp) {
  const e = W.edges[sp.edge], A = W.nodes[sp.from], B = W.nodes[e.a === sp.from ? e.b : e.a];
  const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len, s = 20;
  return { x: A.x + dx * s - dz * LO, z: A.z + dz * s + dx * LO, h: Math.atan2(dx, dz) };
}
function spawnPlayer(sp) {
  if (G.onFoot) heroHide();
  const old = G.player;
  if (old) { if (old.wrecked || old === MIS.car) { old.kind = 'parked'; old.abandoned = true; old.abandonT = GT; } else old.remove(); }
  const v = new Vehicle(Object.assign({}, carCfg), 'player'); v.own = true;
  const pt = laneSpawnPoint(sp || W.spawns[0]);
  for (const o of [...VEH.list]) if (o !== MIS.car && Math.hypot(o.x - pt.x, o.z - pt.z) < 7) o.remove();
  v.place(pt.x, pt.z, pt.h, 0); VEH.list.push(v); G.player = v;
  v.model.root.add(headSpot, headSpot.target);
  HERO.hp = HERO.maxHp;
  resetCamera(); updateCamera(0.016);
}
function deliverCarNear(x, z) {
  const nl = nearestLane(x, z), e = nl.e, A = W.nodes[e.a], B = W.nodes[e.b];
  const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len, px = nl.px - dz * LO, pz = nl.pz + dx * LO;
  for (const o of [...VEH.list]) if (o !== MIS.car && Math.hypot(o.x - px, o.z - pz) < 6) o.remove();
  if (G.onFoot) heroHide();
  const v = new Vehicle(Object.assign({}, carCfg), 'player'); v.own = true;
  v.place(px, pz, Math.atan2(dx, dz), 0); VEH.list.push(v); G.player = v; v.model.root.add(headSpot, headSpot.target);
  resetCamera(); feed('Your car was delivered');
}
function resetWanted() { wanted.heat = 0; wanted.stars = 0; wanted.unseen = 0; wanted.bust = 0; }
function startGame() {
  SFX.init();
  const load = $('#loading'); load.hidden = false;
  setTimeout(() => {
    const fresh = APP.worldId !== settings.map || !W;
    if (fresh) { loadWorld(settings.map); resetWanted(); Object.assign(G.stats, { peds: 0, cars: 0, cops: 0, props: 0, maxStars: 0, bestAir: 0, bestAirDist: 0 }); spawnPlayer(); }
    else if (!G.player && !G.onFoot && !G.plane) spawnPlayer();
    else if (G.player) rebuildPlayerCar();
    applyTime(); applyQuality();
    if (fresh) { manageTraffic(0, true); for (let k = 0; k < 120; k++) { PED.spawnT = 0; updatePedsSpawnOnly(); } }
    APP.mode = 'game'; APP.paused = false;
    $('#menu').hidden = true; $('#garage').hidden = true; $('#pause').hidden = true; $('#hud').hidden = false; $('#touch').hidden = !APP.touch;
    HUD.helpT = 12; $('#help').style.opacity = '1'; onResize();
    load.hidden = true;
    if (fresh) feed(`Welcome to ${W.name}`);
  }, 40);
}
function updatePedsSpawnOnly() { const target = Math.round(settings.pedDensity / 100 * 85); const alive = PED.list.filter(p => p.active).length; if (alive < target) spawnPed(8, 150); }
function rebuildPlayerCar() {
  const P = G.player;
  if (P && P.own && P !== MIS.car) {
    const v = new Vehicle(Object.assign({}, carCfg), 'player'); v.own = true;
    v.place(P.x, P.z, P.h, 0); v.y = P.y;
    P.remove(); VEH.list.push(v); G.player = v; v.model.root.add(headSpot, headSpot.target); return;
  }
  if (P) { P.kind = 'parked'; P.abandoned = true; P.abandonT = GT; if (headSpot.parent) headSpot.parent.remove(headSpot, headSpot.target); G.player = null; deliverCarNear(P.x, P.z); return; }
  if (G.onFoot) { deliverCarNear(HERO.focus.x, HERO.focus.z); return; }
  spawnPlayer();
}
function resetPlayerCar() {
  const P = G.player; if (!P || G.down || P.wrecked) return;
  if (G.resetCd && GT - G.resetCd < 1.5) return; G.resetCd = GT;
  if (P.flipped || P.tumble) {
    P.roll = P.pit = P.rollV = P.pitV = 0; P.flipped = P.tumble = false; P.onGround = false; P.y = heightAt(P.x, P.z) + 0.4; P.vy = 0; P.vx *= 0.2; P.vz *= 0.2; P.av = 0;
    feed('Car rolled back over'); return;
  }
  const nl = nearestLane(P.x, P.z), e = nl.e, A = W.nodes[e.a], B = W.nodes[e.b];
  let dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
  if (Math.sin(P.h) * dx + Math.cos(P.h) * dz < 0) { dx = -dx; dz = -dz; }
  const x = nl.px - dz * LO, z = nl.pz + dx * LO;
  P.place(x, z, Math.atan2(dx, dz), 0); resetCamera(); feed('Car reset');
}
function playerDown(kind, sub) {
  if (G.down) return;
  G.down = 3.6; G.downKind = kind; G.timeScale = 0.35; G.slowmo = 0;
  const bn = $('#banner'); bn.hidden = false; bn.classList.toggle('busted', kind === 'busted');
  $('#bannerText').textContent = kind === 'busted' ? 'Busted' : 'Wasted';
  $('#bannerSub').textContent = sub || (kind === 'busted' ? (G.onFoot ? 'The police caught up with you' : 'The police impounded your car') : 'Your car is scrap. A new one is waiting.');
  renderer.domElement.style.filter = 'grayscale(1) contrast(1.15) brightness(.9)';
  SFX.down(); SFX.hornSet(false); hornOn = false;
  if (MIS.active) failMission(kind === 'busted' ? 'You were busted' : 'You were wasted');
}
function respawn() {
  $('#banner').hidden = true; renderer.domElement.style.filter = ''; G.timeScale = 1; G.down = 0;
  resetWanted();
  for (const v of [...VEH.list]) if (isCop(v)) v.remove();
  for (const p of PED.list) if (p.active && p.cop) { hidePed(p); p.active = false; p.rag = null; }
  if (HELI.active) { HELI.active = false; scene.remove(HELI.obj, HELI.beam, HELI.spot); }
  if (G.onFoot) heroHide();
  if (G.plane) { G.plane.pilot = false; G.plane = null; } HERO.chute = null; HERO.chuteDrop = null;
  HERO.hp = HERO.maxHp; HERO.armor = 0; resetArms();
  if (G.downKind === 'busted' && G.player) { G.player.remove(); G.player = null; }
  addCash(G.downKind === 'busted' ? -250 : -100, G.downKind === 'busted' ? 'bail and impound fees' : 'hospital bill');
  spawnPlayer(pick(W.spawns));
}
function togglePause(force) {
  if (APP.mode !== 'game') return;
  APP.paused = force !== undefined ? force : !APP.paused;
  $('#pause').hidden = !APP.paused; $('#touch').hidden = APP.paused || !APP.touch;
  rbxPointer(!APP.paused);   // free the mouse for the pause menu, take it back on resume
  if (APP.paused) {
    SFX.hornSet(false); hornOn = false;
    $('#pAbandon').hidden = !MIS.active;
    const s = G.stats, u = settings.units === 'mph';
    $('#pstats').innerHTML = `<span>Cash</span><b>$${MIS.cash.toLocaleString()}</b><span>Missions passed here</span><b>${MIS.defs.filter(d => MIS.done[d.id]).length} of ${MIS.defs.length}</b><span>Pedestrians hit</span><b>${s.peds}</b><span>Cars wrecked</span><b>${s.cars}</b><span>Police cruisers wrecked</span><b>${s.cops}</b><span>Street furniture flattened</span><b>${s.props}</b><span>Highest wanted level</span><b>${s.maxStars} ★</b><span>Longest jump</span><b>${s.bestAir.toFixed(1)} s · ${u ? Math.round(s.bestAirDist * 3.281) + ' ft' : Math.round(s.bestAirDist) + ' m'}</b>`;
    setTimeout(() => $('#resumeBtn').focus(), 0);
  }
}
function gameUpdate(rdt) {
  const sf = slowFactor(); if (G.slowmo > 0) G.slowmo = Math.max(0, G.slowmo - rdt);
  const dt = rdt * G.timeScale * sf; GT += dt;
  if (G.down) { G.down -= rdt; if (G.down <= 0) respawn(); }
  readInput(G.player);
  const P = G.player;
  for (const v of VEH.list) {
    v.age += dt; v.hitCd -= dt;
    if (v.ai) (v.police ? aiPolice : aiTraffic)(v, dt);
    else if (v !== P) { const I = v.input; I.throttle = 0; I.brake = 0; I.steer = 0; I.hand = 0; I.nitro = 0; I.park = v.abandoned && GT - (v.abandonT || 0) < 2.5 && v.speed > 4 ? 0 : 1; }
  }
  const sub = clamp(Math.ceil(dt * 90), 1, 5), h = dt / sub;
  for (let s = 0; s < sub; s++) { for (const v of VEH.list) { stepVehicle(v, h); collideStatic(v); } collideVehicles(); }
  netUpdate(dt); updatePlanes(dt);
  vehiclePropHits(); updateProps(dt); updateBoom(dt); updateStructs(dt);
  updateShops(dt); updateStores(dt); updateExtras(dt); updateMilitary(dt); updateAirport(dt); updateKids(dt); updateGfx(dt); updatePeds(dt); syncChute(dt); updateDebris(dt); updateWeapons(dt);
  updateWanted(dt); manageTraffic(dt); updateHeli(dt); updateMissions(dt);
  for (const v of VEH.list) { vehicleWater(v, dt); v.syncModel(dt); vehicleEffects(v, dt); }
  FX.smoke.update(dt); FX.blood.update(dt); FX.debris.update(dt); FX.fire.update(dt); DECALS.update(dt);
  updateTrafficLights();
  updateCamera(rdt); updateTreeTiles(); updateGlow(); SFX.update(dt); updateHUD(rdt);
  const slowOn = G.slowmo > 0 && !G.down;
  if (slowOn !== HUD.slowOn) { HUD.slowOn = slowOn; $('#ui').classList.toggle('slowmo', slowOn); if (!G.down) renderer.domElement.style.filter = slowOn ? 'saturate(.55) contrast(1.12)' : ''; }
  const Q = G.player;
  if (Q && Q.model.tailMat !== MAT.tail) Q.model.tailMat.emissiveIntensity = (Q.input.brake > 0.1 && Q.vf > 0.3) ? 3.5 : TIMES[settings.time].tail;
}
// ---------------- menus ----------------
function endSlowmo() { G.slowmo = 0; HUD.slowOn = false; $('#ui').classList.remove('slowmo'); }
function showMenu() {
  netMenuPresence();
  closeBigMap();
  if (G.down) respawn();
  endSlowmo();
  APP.mode = 'menu'; APP.paused = false;
  $('#menu').hidden = false; $('#garage').hidden = true; $('#pause').hidden = true; $('#hud').hidden = true; $('#touch').hidden = true; $('#banner').hidden = true;
  renderer.domElement.style.filter = ''; SFX.hornSet(false);
  garageSetCar(carCfg); garage.dist = 8.6;
  for (const c of $$('.mapcard')) c.setAttribute('aria-checked', String(c.dataset.map === settings.map));
}
function openGarage(from) {
  closeBigMap();
  if (G.down) respawn();
  endSlowmo();
  APP.garageFrom = from; APP.mode = 'garage'; APP.paused = false;
  $('#menu').hidden = true; $('#pause').hidden = true; $('#hud').hidden = true; $('#touch').hidden = true; $('#garage').hidden = false;
  garageSetCar(carCfg); garage.dist = 8.2; renderGarageUI();
  $('#garageDrive').textContent = from === 'game' ? 'Back to the city' : 'Drive';
}
const PAINTS = ['#d22f3c', '#f2f2f2', '#121316', '#1f4fd1', '#f5b700', '#1e8a4c', '#ff6a13', '#7b2fbe', '#8a9199', '#0fb5c9', '#e85a9b', '#5b3a29', '#a3c639', '#26324f'];
const RIM_COLORS = ['#c9ccd2', '#2a2c30', '#d4af37', '#b03030', '#2f6fd9', '#f2f2f2', '#ff6a13'];
const NEONS = ['#ff2e88', '#22e0ff', '#3dff8b', '#b44dff', '#ffd02e', '#ff3b2e'];
let garageTab = 'body';
const TABS = [['body', 'Body'], ['paint', 'Paint'], ['wheels', 'Wheels'], ['style', 'Style'], ['tuning', 'Tuning']];
const UNLOCK_HOW = { heist: 'pull off the Airport Heist', flip: 'land a backflip in the Flip It job' };
function setCar(k, v) { if (k === 'body' && bodyLocked(v)) { feed(`To unlock the ${BODIES[v].name}, ${UNLOCK_HOW[BODIES[v].unlock] || 'finish its job'}`, 'red'); return; } carCfg[k] = v; saveCar(); garageSetCar(carCfg); renderGarageUI(); }
function renderGarageUI() {
  const B = BODIES[carCfg.body];
  $('#carTitle').textContent = B.name; $('#carBlurb').textContent = B.blurb;
  const tabs = $('#tabs'); tabs.innerHTML = '';
  for (const [id, label] of TABS) { const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.id = 'tab-' + id; b.textContent = label; b.setAttribute('aria-selected', String(id === garageTab)); b.onclick = () => { garageTab = id; renderGarageUI(); }; tabs.appendChild(b); }
  const body = $('#tabBody'); body.innerHTML = '';
  const group = (label, el) => { const g = document.createElement('div'); g.className = 'group'; const l = document.createElement('div'); l.className = 'glabel'; l.textContent = label; g.append(l, el); body.appendChild(g); return g; };
  const opts = (items, cur, key) => { const d = document.createElement('div'); d.className = 'opts'; for (const [val, name, sub] of items) { const b = document.createElement('button'); b.className = 'opt'; b.setAttribute('aria-pressed', String(cur === val)); b.innerHTML = `<b>${name}</b>${sub ? `<small>${sub}</small>` : ''}`; b.onclick = () => setCar(key, val); d.appendChild(b); } return d; };
  const swatches = (cols, cur, key, offOpt) => {
    const d = document.createElement('div'); d.className = 'swatches';
    if (offOpt) { const b = document.createElement('button'); b.className = 'sw off'; b.title = 'Off'; b.setAttribute('aria-label', 'Off'); b.setAttribute('aria-pressed', String(cur === 'off')); b.onclick = () => setCar(key, 'off'); d.appendChild(b); }
    for (const c of cols) { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.setAttribute('aria-label', c); b.setAttribute('aria-pressed', String(cur.toLowerCase() === c.toLowerCase())); b.onclick = () => setCar(key, c); d.appendChild(b); }
    if (!offOpt) { const i = document.createElement('input'); i.type = 'color'; i.id = 'col-' + key; i.value = cur.startsWith('#') && cur.length === 7 ? cur : '#ffffff'; i.setAttribute('aria-label', 'Custom colour'); i.oninput = () => { carCfg[key] = i.value; saveCar(); garageSetCar(carCfg); }; i.onchange = () => renderGarageUI(); d.appendChild(i); }
    return d;
  };
  const levels = (n, cur, key, labels) => { const d = document.createElement('div'); d.className = 'levels'; for (let i = 1; i <= n; i++) { const b = document.createElement('button'); b.textContent = labels ? labels[i - 1] : 'Lv ' + i; b.setAttribute('aria-pressed', String(cur === i)); b.onclick = () => setCar(key, i); d.appendChild(b); } return d; };
  if (garageTab === 'body') { const g = opts(Object.entries(BODIES).filter(([, b]) => !b.hidden).map(([k, b]) => [k, (bodyLocked(k) ? '🔒 ' : '') + b.name, bodyLocked(k) ? 'Unlock: ' + (UNLOCK_HOW[b.unlock] || 'finish its job') : b.blurb.split('.')[0]]), carCfg.body, 'body'); group('Body', g); }
  if (garageTab === 'paint') {
    group('Paint colour', swatches(PAINTS, carCfg.paint, 'paint'));
    group('Finish', opts([['gloss', 'Gloss'], ['metallic', 'Metallic'], ['matte', 'Matte'], ['chrome', 'Chrome']], carCfg.finish, 'finish'));
    group('Racing stripes', opts([[false, 'None'], [true, 'Twin stripes']], carCfg.stripes, 'stripes'));
    if (carCfg.stripes) group('Stripe colour', swatches(['#f4f4f4', '#121316', '#f5b700', '#d22f3c', '#1f4fd1', '#1e8a4c'], carCfg.stripe, 'stripe'));
  }
  if (garageTab === 'wheels') {
    group('Rims', opts(Object.entries(RIMS).map(([k, r]) => [k, r[0], r[1]]), carCfg.rim, 'rim'));
    group('Rim colour', swatches(RIM_COLORS, carCfg.rimColor, 'rimColor'));
    group('Wheel size', opts([['s', 'Small', '15 inch'], ['m', 'Stock', '17 inch'], ['l', 'Large', '19 inch']], carCfg.wheel, 'wheel'));
  }
  if (garageTab === 'style') {
    group('Spoiler', opts([['none', 'None'], ['lip', 'Ducktail'], ['wing', 'GT wing']], carCfg.spoiler, 'spoiler'));
    group('Neon underglow', swatches(NEONS, carCfg.neon, 'neon', true));
    group('Window tint', opts([[0, 'Clear'], [1, 'Smoke'], [2, 'Limo']], carCfg.tint, 'tint'));
    group('Ride height', opts([['low', 'Slammed'], ['stock', 'Stock'], ['lifted', 'Lifted']], carCfg.height, 'height'));
    const inp = document.createElement('input'); inp.type = 'text'; inp.id = 'plateText'; inp.maxLength = 7; inp.value = carCfg.plate; inp.setAttribute('aria-label', 'Licence plate text'); inp.spellcheck = false;
    inp.onchange = () => { carCfg.plate = inp.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 7) || 'HAVOC'; saveCar(); garageSetCar(carCfg); };
    group('Licence plate', inp);
  }
  if (garageTab === 'tuning') {
    group('Engine', levels(4, carCfg.engine, 'engine', ['Stock', 'Street', 'Sport', 'Race']));
    group('Tyres & suspension', levels(3, carCfg.handling, 'handling', ['Comfort', 'Sport', 'Track']));
    group('Brakes', levels(3, carCfg.brakes, 'brakes', ['Stock', 'Sport', 'Race']));
    group('Armour', levels(4, carCfg.armor, 'armor', ['None', 'Light', 'Heavy', 'Tank']));
    group('Nitrous', opts([[true, 'Installed', 'Hold Shift'], [false, 'Removed']], carCfg.nitro, 'nitro'));
  }
  const st = computeStats(carCfg), mph = settings.units === 'mph';
  const row = (label, frac, val) => `<span>${label}</span><i><em style="width:${clamp(frac, 0.04, 1) * 100}%"></em></i><output>${val}</output>`;
  const zeroTo100 = (27.8 / (st.acc * 0.8)).toFixed(1);
  $('#stats').innerHTML = row('Top speed', st.top / 82, mph ? Math.round(st.top * 2.237) + ' mph' : Math.round(st.top * 3.6) + ' km/h') + row('Acceleration', st.acc / 22, zeroTo100 + ' s') + row('Handling', st.grip / 1.3, Math.round(st.grip * 100)) + row('Durability', st.hp / 480, Math.round(st.hp) + ' hp');
}
const SET_SCHEMA = [
  { k: 'pedDensity', label: 'Pedestrians', sub: 'How many people walk the sidewalks', type: 'range', min: 0, max: 100, step: 5 },
  { k: 'trafficDensity', label: 'Traffic', sub: 'How many cars are on the road', type: 'range', min: 0, max: 100, step: 5 },
  { k: 'police', label: 'Police', sub: 'Turn off, or set how hard they chase', type: 'seg', opts: [['off', 'Off'], ['low', 'Low'], ['normal', 'Normal'], ['high', 'High']] },
  { k: 'pvp', label: 'Player damage', sub: 'Whether other players can hurt you, and you them', type: 'seg', opts: [['on', 'On'], ['off', 'Off']] },
  { k: 'ffriends', label: 'Hurt friends', sub: 'Whether you and your friends can hurt each other', type: 'seg', opts: [['off', 'Off'], ['on', 'On']] },
  { k: 'guns', label: 'Guns', sub: 'Your weapons, and police who shoot back', type: 'seg', opts: [['on', 'On'], ['off', 'Off']] },
  { k: 'gore', label: 'Gore', sub: 'High adds dismemberment', type: 'seg', opts: [['off', 'Off'], ['low', 'Low'], ['high', 'High']] },
  { k: 'damage', label: 'Crash damage', sub: 'How much cars crumple and break apart', type: 'seg', opts: [['arcade', 'Arcade'], ['realistic', 'Realistic'], ['brutal', 'Brutal']] },
  { k: 'autoRes', label: 'Auto resolution', sub: 'Renders slightly fewer pixels when the frame rate drops, so it stays smooth', type: 'seg', opts: [['on', 'On'], ['off', 'Off']] },
  { k: 'fps', label: 'Show FPS', sub: 'Frames per second, at the top of the screen', type: 'seg', opts: [['off', 'Off'], ['on', 'On']] },
  { k: 'camStyle', label: 'On-foot camera', sub: 'Roblox: drag or Ctrl shift-lock to look, scroll to zoom. Classic: the camera follows behind you', type: 'seg', opts: [['roblox', 'Roblox'], ['classic', 'Classic']] },
  { k: 'slowmo', label: 'Crash slow-mo', sub: 'Cinematic slow motion on big crashes and rollovers', type: 'seg', opts: [['on', 'On'], ['off', 'Off']] },
  { k: 'time', label: 'Time of day', type: 'seg', opts: [['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']] },
  { k: 'quality', label: 'Graphics', sub: 'Shadows, resolution, draw distance', type: 'seg', opts: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']] },
  { k: 'bloom', label: 'Glow', sub: 'Neon, headlights and explosions glow (Medium and High graphics)', type: 'seg', opts: [['on', 'On'], ['off', 'Off']] },
  { k: 'units', label: 'Speed units', type: 'seg', opts: [['kmh', 'km/h'], ['mph', 'mph']] },
  { k: 'volume', label: 'Volume', type: 'range', min: 0, max: 100, step: 5 }
];
function renderSettings() {
  const body = $('#setBody'); body.innerHTML = '';
  for (const s of SET_SCHEMA) {
    const row = document.createElement('div'); row.className = 'setrow';
    row.innerHTML = `<span id="lbl-${s.k}">${s.label}${s.sub ? `<small>${s.sub}</small>` : ''}</span>`;
    if (s.type === 'range') {
      const w = document.createElement('div'); w.className = 'range';
      const i = document.createElement('input'); i.type = 'range'; i.id = 'set-' + s.k; i.min = s.min; i.max = s.max; i.step = s.step; i.value = settings[s.k]; i.setAttribute('aria-labelledby', 'lbl-' + s.k);
      const o = document.createElement('output'); o.textContent = settings[s.k] + '%';
      i.oninput = () => { settings[s.k] = +i.value; o.textContent = i.value + '%'; saveSettings(); onSettingChange(s.k); };
      w.append(i, o); row.appendChild(w);
    } else {
      const w = document.createElement('div'); w.className = 'seg'; w.setAttribute('role', 'group'); w.setAttribute('aria-labelledby', 'lbl-' + s.k);
      for (const [v, l] of s.opts) { const b = document.createElement('button'); b.textContent = l; b.setAttribute('aria-pressed', String(settings[s.k] === v)); b.onclick = () => { settings[s.k] = v; saveSettings(); onSettingChange(s.k); renderSettings(); }; w.appendChild(b); }
      row.appendChild(w);
    }
    body.appendChild(row);
  }
  body.appendChild(soundCredits());
}
function onSettingChange(k) {
  if (k === 'volume') SFX.setVolume(settings.volume);
  if (k === 'time' && APP.worldId) applyTime();
  if (k === 'quality') applyQuality();
  if (k === 'police' && settings.police === 'off') resetWanted();
  if (k === 'guns' && settings.guns === 'off') selectWeapon(0);
  if (k === 'gore' && settings.gore === 'off') { DECALS.clear(); FX.blood.clear(); }
  if (k === 'units' && APP.mode === 'garage') renderGarageUI();
}
function soundCredits() {   // the recordings are CC0 (no attribution needed) but their authors deserve a thank-you
  const d = document.createElement('details'); d.className = 'credits';
  const sm = document.createElement('summary'); sm.textContent = 'Sound credits (' + SND_CREDITS.length + ' CC0 recordings from freesound.org)'; d.append(sm);
  const ul = document.createElement('ul');
  for (const [title, by, id] of SND_CREDITS) { const li = document.createElement('li'); const a = document.createElement('a'); a.href = 'https://freesound.org/s/' + (+id) + '/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = title; li.append(a, document.createTextNode(' by ' + by)); ul.append(li); }
  d.append(ul); return d;
}
function openSettings() { renderSettings(); $('#settings').hidden = false; setTimeout(() => $('#setClose').focus(), 0); }
function closeSettings() { $('#settings').hidden = true; if (APP.mode === 'game') $('#pSettings').focus(); }

// ---------------- boot ----------------
let VW = 0, VH = 0;
// ---- automatic resolution: when the frame rate sags, render fewer pixels (the HUD and menus stay sharp) ----
const DYN = { scale: 1, sum: 0, sq: 0, n: 0, t: 0, fpsT: 0, fpsN: 0, warm: 4, probe: null, noGain: false };
function basePR() { const Q = QUALITY[settings.quality] || QUALITY.medium; return Math.min(window.devicePixelRatio || 1, Q.pr); }
function dynRes(rdt) {
  if (APP.mode !== 'game' || APP.paused || BM.open || !(rdt > 0)) { DYN.sum = DYN.sq = DYN.n = DYN.t = 0; DYN.warm = Math.max(DYN.warm, APP.mode === 'game' ? 1 : 4); return; }
  // optional frame-rate readout
  DYN.fpsT += rdt; DYN.fpsN++;
  if (DYN.fpsT >= 0.5) { const f = el('fps'); if (settings.fps === 'on') { f.hidden = false; f.textContent = Math.round(DYN.fpsN / DYN.fpsT) + ' FPS' + (DYN.scale < 0.99 ? ' · ' + Math.round(DYN.scale * 100) + '% res' : ''); } else if (!f.hidden) f.hidden = true; DYN.fpsT = DYN.fpsN = 0; }
  if (DYN.warm > 0) { DYN.warm -= rdt; return; }   // loading hitches and shader compiles right after starting aren't the real frame rate
  if (settings.autoRes === 'off') { if (DYN.scale !== 1) { DYN.scale = 1; renderer.setPixelRatio(basePR()); onResize(); } return; }
  DYN.sum += rdt; DYN.sq += rdt * rdt; DYN.n++; DYN.t += rdt;
  if (DYN.t < 2) return;
  const avg = DYN.sum / DYN.n, sd = Math.sqrt(Math.max(0, DYN.sq / DYN.n - avg * avg)); DYN.sum = DYN.sq = DYN.n = DYN.t = 0;
  // A steady 30 fps is either a graphics card that just misses 60, or a browser capping the rate to save power. Fewer pixels
  // only help the first, so try one step down: keep it if the frame rate improves, otherwise go back and stop trying.
  const steady30 = Math.abs(avg - 1 / 30) < 0.002 && sd < 0.003, base = basePR(), floor = Math.min(1, 0.6 / base);
  if (!steady30) DYN.noGain = false;
  let s = DYN.scale;
  if (DYN.probe) {
    const pb = DYN.probe; DYN.probe = null;
    if (avg > pb.avg * 0.9) { s = pb.scale; DYN.noGain = true; }   // no better: the rate was capped, not slow
  } else if (avg > 1 / 45 && !(steady30 && DYN.noGain)) {
    if (steady30) DYN.probe = { scale: s, avg };
    s = Math.max(floor, s * 0.85);
  } else if (avg < 1 / 57 && s < 1) s = Math.min(1, s * 1.08);
  if (Math.abs(s - DYN.scale) > 0.005) { DYN.scale = s; renderer.setPixelRatio(base * s); onResize(); }
}
function onResize() {
  const w = window.innerWidth, h = window.innerHeight; VW = w; VH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const mm = $('#minimap'), css = mm.getBoundingClientRect().width || 176, dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(css * dpr); if (mm.width !== px) { mm.width = px; mm.height = px; }
}
window.addEventListener('resize', onResize);
function boot() {
  initChat(); initFriends(); initTextures(); initMaterials(); initColors(); initWorldMats(); initFX(); initBoom(); initPeds(); initScene(); initGarage(); initHUD(); initTouch(); initMissionVisuals(); initSkids(); initWeapons(); resetArms(); initBigMap(); initNet();
  // map previews
  for (const card of $$('.mapcard')) {
    const Wd = genWorld(card.dataset.map); drawMapPreview(card.querySelector('canvas'), Wd);
    card.onclick = () => { settings.map = card.dataset.map; saveSettings(); for (const c of $$('.mapcard')) c.setAttribute('aria-checked', String(c === card)); };
  }
  $('#playBtn').onclick = startGame;
  $('#garageBtn').onclick = () => { SFX.init(); openGarage('menu'); };
  $('#settingsBtn').onclick = openSettings;
  $('#setClose').onclick = closeSettings;
  $('#garageBack').onclick = () => { if (APP.garageFrom === 'game') { APP.mode = 'game'; $('#garage').hidden = true; rebuildPlayerCar(); applyTime(); togglePause(true); } else showMenu(); };
  $('#garageDrive').onclick = startGame;
  $('#resumeBtn').onclick = () => togglePause(false);
  $('#pSettings').onclick = openSettings;
  $('#pGarage').onclick = () => { $('#pause').hidden = true; openGarage('game'); };
  $('#pRespawn').onclick = () => {
    togglePause(false); if (G.down) return;
    if (G.plane) { if (!G.plane.ground) { feed('Land the plane first', 'red'); return; } leavePlane(); }
    const ref = PF(), P = G.player, x = ref.x, z = ref.z;
    if (P) { if (P.own && P !== MIS.car) P.remove(); else { P.kind = 'parked'; P.abandoned = true; P.abandonT = GT; } if (headSpot.parent) headSpot.parent.remove(headSpot, headSpot.target); G.player = null; }
    deliverCarNear(x, z);
  };
  $('#pAbandon').onclick = () => { togglePause(false); abandonMission(); };
  const cv = renderer.domElement;
  // look around: right-drag with a mouse, or drag a finger on any empty part of the screen
  cv.addEventListener('pointerdown', e => {
    if (APP.mode !== 'game' || APP.paused) return;
    if (e.button === 2 || e.pointerType === 'touch') { CAM.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } }
  });
  window.addEventListener('pointermove', e => { const D = CAM.drag; if (!D || D.id !== e.pointerId) return; const k = e.pointerType === 'touch' ? 1.4 : 1; if (rbxFoot()) { CAM.h = wrapA(CAM.h - (e.clientX - D.x) * 0.006 * k); CAM.op = clamp(CAM.op + (e.clientY - D.y) * 0.005 * k, -1.25, 1.35); D.x = e.clientX; D.y = e.clientY; return; } if (CAM.fpFoot && HERO.p) HERO.p.h = wrapA(HERO.p.h - (e.clientX - D.x) * 0.006 * k); else CAM.ly = wrapA(CAM.ly - (e.clientX - D.x) * 0.006 * k); CAM.lp = clamp(CAM.lp + (e.clientY - D.y) * 0.004 * k, -0.45, 1.1); D.x = e.clientX; D.y = e.clientY; CAM.lookT = GT; });
  const endLook = e => { if (CAM.drag && CAM.drag.id === e.pointerId) { CAM.drag = null; CAM.lookT = GT; } };
  window.addEventListener('pointerup', endLook); window.addEventListener('pointercancel', endLook);
  cv.addEventListener('pointerdown', e => {
    if (APP.mode !== 'game' || APP.paused || APP.touch || e.button !== 0) return;
    ARMS.mouse.x = e.clientX; ARMS.mouse.y = e.clientY;
    if (ARMS.cur && gunsOn()) ARMS.mouse.down = true; else if (G.onFoot) HERO.click = true;
  });
  window.addEventListener('pointermove', e => { ARMS.mouse.x = e.clientX; ARMS.mouse.y = e.clientY; });
  window.addEventListener('pointerup', e => { if (e.button === 0) { ARMS.mouse.down = false; ARMS.mouse.btn = false; } });
  cv.addEventListener('pointerdown', e => { if (e.button === 0 && e.pointerType !== 'touch') ARMS.mouse.btn = true; });
  cv.addEventListener('contextmenu', e => { if (APP.mode === 'game') e.preventDefault(); });
  cv.addEventListener('wheel', e => { if (APP.mode === 'game' && !APP.paused) rbxZoom(Math.exp(clamp(e.deltaY, -120, 120) * 0.0016)); }, { passive: true });
  window.addEventListener('mousemove', e => {
    if (APP.mode !== 'game' || APP.paused || BM.open || CAM.drag || !rbxLocked()) return;
    const dx = e.movementX || 0, dy = e.movementY || 0; if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;   // ignore the jump some browsers report on lock
    CAM.h = wrapA(CAM.h - dx * 0.0032); CAM.op = clamp(CAM.op + dy * 0.0032, -1.25, 1.35);
  });
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') rbxPointer(true); });
  // Ctrl is easy to hold while pressing W: ask before the tab closes mid-game
  window.addEventListener('beforeunload', e => { if (APP.mode === 'game' && settings.camStyle !== 'classic') { e.preventDefault(); e.returnValue = ''; } });
  $('#pQuit').onclick = () => { showMenu(); };
  $('#pauseBtn').onclick = () => togglePause(true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && APP.mode === 'game' && !APP.paused) togglePause(true); });
  onResize(); applyQuality();
  showMenu();
  requestAnimationFrame(frame);
}
let lastT = performance.now();
const PERF = { upd: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  try {
    rbxPointer(false);   // menus, pause and the map always get the mouse back
    if (APP.mode === 'game' && W) {
      dynRes(rdt);
      if (!APP.paused && !BM.open) { const t0 = performance.now(); gameUpdate(rdt); PERF.upd = PERF.upd * 0.95 + (performance.now() - t0) * 0.05; }
      if (!BM.open) renderScene();
    } else {
      garageRender(rdt, VW, VH);
      if (APP.mode === 'game') renderScene();
    }
  } catch (e) { console.error(e); }
}
