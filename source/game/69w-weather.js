// =====================================================================
//  TIME AND WEATHER: a day / night cycle, weather that changes (cloud, rain, storms, fog, sun showers),
//  rainbows, lightning that strikes cars, and wet roads. It all runs off the wall clock, so everyone
//  in the same map sees the same sky without sending anything over the network.
// =====================================================================
const DAY_LEN = 1200;   // seconds for one whole day and night
// where each look sits in the day (0 = midnight, 0.5 = noon); in between they blend
const TIME_KEYS = [[0, 'night'], [0.13, 'night'], [0.2, 'sunset'], [0.27, 'day'], [0.73, 'day'], [0.8, 'sunset'], [0.87, 'night'], [1, 'night']];
const SUNRISE = 0.17, SUNSET = 0.83;
// over: cloud cover, rain, fog, storm (lightning)
const WX = {
  clear: { over: 0, rain: 0, fog: 0, storm: 0 }, cloudy: { over: 0.7, rain: 0, fog: 0.1, storm: 0 },
  rain: { over: 0.85, rain: 0.75, fog: 0.25, storm: 0 }, storm: { over: 1, rain: 1, fog: 0.3, storm: 1 },
  fog: { over: 0.45, rain: 0, fog: 1, storm: 0 }, shower: { over: 0.12, rain: 0.55, fog: 0, storm: 0 }
};
const WX_ODDS = [['clear', 34], ['cloudy', 18], ['shower', 12], ['rain', 16], ['storm', 11], ['fog', 9]];
const WX_SLOT = 180;   // seconds per spell of weather when it changes on its own
const WX_ICON = { clear: '☀️', cloudy: '☁️', shower: '🌦️', rain: '🌧️', storm: '⛈️', fog: '🌫️' };
const ENV = { u: 0.5, key: 'day', T: null, w: { over: 0, rain: 0, fog: 0, storm: 0 }, wx: 'clear', wet: 0, after: 0, flash: 0, flashT: 9, fogMul: 1,
  rb: 0, bolts: [], nextBolt: 6, lastPlayerHit: -99, cloudCol: '#ffffff', cloudOp: 0.85, rain: null, bow: null, wetBase: null, ready: false };

// the first time this version runs, switch the sky over to the changing one (it can be pinned again in Settings)
if (!settings.envV) { settings.time = 'cycle'; settings.weather = 'cycle'; settings.envV = 1; saveSettings(); }

const _ca = new THREE.Color(), _cb = new THREE.Color();
function mixHex(a, b, f) { _ca.set(a); _cb.set(b); return '#' + _ca.lerp(_cb, clamp(f, 0, 1)).getHexString(); }
function mulHex(a, k) { _ca.set(a).multiplyScalar(k); _ca.r = Math.min(1, _ca.r); _ca.g = Math.min(1, _ca.g); _ca.b = Math.min(1, _ca.b); return '#' + _ca.getHexString(); }
function copyT(A) { return { sky: A.sky.slice(), fog: A.fog, sun: A.sun, sunI: A.sunI, sunDir: A.sunDir.slice(), hemi: A.hemi.slice(), win: A.win, lamps: A.lamps, exp: A.exp, stars: A.stars, env: A.env.slice(), head: A.head, tail: A.tail, glow: A.glow, sunVis: A.sunVis }; }
function blendT(A, B, f) {
  const L = (a, b) => a + (b - a) * f, M = (a, b) => mixHex(a, b, f);
  return { sky: [0, 1, 2].map(i => M(A.sky[i], B.sky[i])), fog: M(A.fog, B.fog), sun: M(A.sun, B.sun), sunI: L(A.sunI, B.sunI), sunDir: A.sunDir.map((x, i) => L(x, B.sunDir[i])),
    hemi: [M(A.hemi[0], B.hemi[0]), M(A.hemi[1], B.hemi[1]), L(A.hemi[2], B.hemi[2])], win: L(A.win, B.win), lamps: L(A.lamps, B.lamps), exp: L(A.exp, B.exp), stars: L(A.stars, B.stars),
    env: [0, 1, 2].map(i => M(A.env[i], B.env[i])), head: L(A.head, B.head), tail: L(A.tail, B.tail), glow: L(A.glow, B.glow), sunVis: L(A.sunVis, B.sunVis) };
}
const smooth01 = f => f * f * (3 - 2 * f);
// time of day, 0..1: from the clock when the sky changes, or the fixed look picked in Settings
function clockU() { return settings.time === 'cycle' ? (Date.now() / 1000 / DAY_LEN + 0.38) % 1 : settings.time === 'night' ? 0 : settings.time === 'sunset' ? SUNSET - 0.03 : 0.42; }
function timeAt(u) {
  if (settings.time !== 'cycle') { const P = TIMES[settings.time] || TIMES.day; return { T: copyT(P), wk: { day: settings.time === 'day' ? 1 : 0, sunset: settings.time === 'sunset' ? 1 : 0, night: settings.time === 'night' ? 1 : 0 } }; }
  let i = 0; while (i < TIME_KEYS.length - 2 && u >= TIME_KEYS[i + 1][0]) i++;
  const [u0, k0] = TIME_KEYS[i], [u1, k1] = TIME_KEYS[i + 1], f = smooth01(clamp((u - u0) / (u1 - u0), 0, 1));
  const T = blendT(TIMES[k0], TIMES[k1], f), wk = { day: 0, sunset: 0, night: 0 }; wk[k0] += 1 - f; wk[k1] += f;
  // the sun crosses the sky from east to west; at night the light comes from the moon
  const th = clamp((u - SUNRISE) / (SUNSET - SUNRISE), 0, 1) * Math.PI;
  const sd = [Math.cos(th) * 0.85, Math.max(0.2, Math.sin(th) * 0.95), 0.42], md = TIMES.night.sunDir, n = wk.night;
  const d = sd.map((x, j) => x + (md[j] - x) * n), l = Math.hypot(...d); T.sunDir = d.map(x => x / l);
  return { T, wk };
}
// weather: a new spell every few minutes, picked from the clock so every player gets the same one
function wxHash(n) { let h = Math.imul((n | 0) ^ 0x5bd1e995, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function wxPick(slot) { const r = wxHash(slot) * 100; let a = 0; for (const [k, w] of WX_ODDS) { a += w; if (r < a) return k; } return 'clear'; }
function wxTarget() {
  if (settings.weather !== 'cycle') { ENV.wx = WX[settings.weather] ? settings.weather : 'clear'; return WX[ENV.wx]; }
  const t = Date.now() / 1000, slot = Math.floor(t / WX_SLOT), f = smooth01(clamp((t - slot * WX_SLOT) / 40, 0, 1));
  const A = WX[wxPick(slot - 1)], B = WX[ENV.wx = wxPick(slot)], o = {};
  for (const k in B) o[k] = A[k] + (B[k] - A[k]) * f;
  return o;
}
function weatherOn(T, wk) {
  const w = ENV.w, o = w.over, s = w.storm, day = clamp(wk.day + wk.sunset * 0.8, 0, 1);
  const g = mulHex(mixHex('#1a1e27', '#a6aeb6', day), 1 - 0.45 * s);   // the colour of the cloud deck
  T.sky[0] = mixHex(T.sky[0], mulHex(g, 0.82), o * 0.9); T.sky[1] = mixHex(T.sky[1], g, o * 0.82);
  T.fog = mixHex(T.fog, mulHex(g, 1.05), Math.max(o * 0.75, w.fog * 0.9));
  T.sunI *= 1 - 0.74 * o; T.sunVis *= 1 - 0.92 * o; T.stars *= 1 - o;
  T.hemi[0] = mixHex(T.hemi[0], g, o * 0.55); T.hemi[2] *= 1 + 0.1 * o - 0.25 * s;
  T.env[0] = mixHex(T.env[0], g, o * 0.8); T.env[1] = mixHex(T.env[1], g, o * 0.8);
  T.exp *= 1 - 0.05 * o - 0.08 * s;
  const gloom = o * day;   // a dark, stormy day: street lights, windows and headlights come on
  T.lamps = Math.max(T.lamps, s * 0.9 * day, gloom * 0.35); T.win = Math.max(T.win, s * 0.7 * day, gloom * 0.3);
  T.head = Math.max(T.head, gloom * 1.4); T.tail = Math.max(T.tail, gloom * 1.15); T.glow = Math.max(T.glow, s * 0.6 * day);
  const fl = ENV.flash;   // lightning lights up everything for a moment
  if (fl > 0.01) { T.hemi[2] += fl * 1.9; T.hemi[0] = mixHex(T.hemi[0], '#e2e8ff', fl * 0.8); T.sky[0] = mixHex(T.sky[0], '#c4ccf5', fl * 0.65); T.sky[1] = mixHex(T.sky[1], '#e6e9ff', fl * 0.65); T.fog = mixHex(T.fog, '#b4bcd9', fl * 0.45); T.exp += fl * 0.3; }
  // the cloud layer
  const cc = mixHex(mixHex('#3a4466', '#ffc7a0', clamp(wk.sunset + wk.day, 0, 1)), '#ffffff', wk.day);
  ENV.cloudCol = mixHex(cc, mulHex(g, 0.9), o); ENV.cloudOp = (0.35 + 0.5 * (1 - wk.night)) * (1 - o) + o;
  ENV.fogMul = clamp(1 - 0.62 * w.fog - 0.22 * w.rain, 0.3, 1);
}
// works out ENV.T, the sky to draw right now (time of day with the weather on top); called by applyTime
function envCompute() {
  ENV.u = clockU();
  const { T, wk } = timeAt(ENV.u);
  ENV.key = wk.night >= 0.5 ? 'night' : wk.sunset >= 0.5 ? 'sunset' : 'day'; ENV.wk = wk;
  weatherOn(T, wk);
  ENV.T = T; ENV.ready = true;
  return T;
}
function TNOW() { return ENV.T || TIMES[settings.time] || TIMES.day; }
function timeKey() { return ENV.ready ? ENV.key : (TIMES[settings.time] ? settings.time : 'day'); }
const wetGrip = () => 1 - 0.16 * ENV.wet;
// the clock on screen: the long day is stretched so sunrise reads about 06:00 and sunset about 19:30
function clockHours(u) { const P = [[0, 0], [SUNRISE, 6], [SUNSET, 19.5], [1, 24]]; for (let i = 0; i < 3; i++) if (u <= P[i + 1][0]) return P[i][1] + (u - P[i][0]) / (P[i + 1][0] - P[i][0]) * (P[i + 1][1] - P[i][1]); return 0; }
function clockText() { const m = Math.floor(clockHours(ENV.u) * 60), h = Math.floor(m / 60) % 24; return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

// ---------- rain: streaks that fall around the camera (all in the shader), splashes, wet roads ----------
const RAIN_VS = `attribute vec4 a; uniform vec3 uCam; uniform float uT, uLen, uH, uR, uSpeed; uniform vec2 uWind; varying float vA;
void main(){
  float y = uH - mod(a.y + uT * uSpeed, uH);
  vec3 p = vec3(mod(a.x - uCam.x + uR, 2.0 * uR) - uR + uCam.x, y + uCam.y - uH * 0.35, mod(a.z - uCam.z + uR, 2.0 * uR) - uR + uCam.z);
  p.xz += uWind * (y / uSpeed);
  p += a.w * normalize(vec3(-uWind.x, uSpeed, -uWind.y)) * uLen;
  vA = 1.0 - a.w * 0.75;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  vA *= 1.0 - smoothstep(uR * 0.55, uR, length(mv.xyz));
}`;
const RAIN_FS = `uniform vec3 uCol; uniform float uOp; varying float vA; void main(){ gl_FragColor = vec4(uCol, uOp * vA); }`;
function initRain() {
  const N = 3000, a = new Float32Array(N * 8), R = 34, H = 34;
  for (let i = 0; i < N; i++) { const x = rand(-R, R), y = rand(0, H), z = rand(-R, R); a.set([x, y, z, 0, x, y, z, 1], i * 8); }
  const g = new THREE.BufferGeometry(); g.setAttribute('a', new THREE.BufferAttribute(a, 4)); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
  const m = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uLen: { value: 1.15 }, uH: { value: H }, uR: { value: R }, uSpeed: { value: 24 }, uWind: { value: new THREE.Vector2(2.5, 1.2) }, uCol: { value: new THREE.Color(0.7, 0.75, 0.82) }, uOp: { value: 0.35 } },
    vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false, fog: false });
  const L = new THREE.LineSegments(g, m); L.frustumCulled = false; L.renderOrder = 2; L.visible = false; scene.add(L);
  ENV.rain = { L, m, N };
}
// ---------- rainbow: an arc opposite the sun, 42 degrees out, with a faint second bow outside it ----------
const BOW_VS = `attribute float r; varying float vR; varying float vUp; void main(){ vR = r; vec4 wp = modelMatrix * vec4(position, 1.0); vUp = normalize(wp.xyz - cameraPosition).y; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const BOW_FS = `uniform float uOp; varying float vR; varying float vUp;
vec3 spec(float t){ t = clamp(t, 0.0, 1.0); return clamp(vec3(abs(t * 6.0 - 3.0) - 1.0, 2.0 - abs(t * 6.0 - 2.0), 2.0 - abs(t * 6.0 - 4.0)), 0.0, 1.0); }
void main(){
  float band = abs(vR); bool outer = vR < 0.0;
  vec3 c = spec(outer ? band * 0.8 : 0.8 - band * 0.8);
  float edge = smoothstep(0.0, 0.18, band) * smoothstep(1.0, 0.82, band);
  float a = uOp * edge * (outer ? 0.35 : 1.0) * smoothstep(-0.01, 0.08, vUp);
  gl_FragColor = vec4(c, a * 0.65);
}`;
function initRainbow() {
  const D = 900, P = [], R = [], I = [], N = 160;
  const ring = (a0, a1, sign) => {   // a band between two angles from the bow's centre; r runs 0..1 across it (negative marks the outer bow)
    const base = P.length / 3;
    for (let i = 0; i <= N; i++) { const ph = i / N * TAU; for (const [k, a] of [[0, a0], [1, a1]]) { P.push(D * Math.sin(a) * Math.cos(ph), D * Math.sin(a) * Math.sin(ph), D * Math.cos(a)); R.push(sign * k); } }
    for (let i = 0; i < N; i++) { const q = base + i * 2; I.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  };
  const dg = Math.PI / 180; ring(40.2 * dg, 42.4 * dg, 1); ring(50.2 * dg, 53.6 * dg, -1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('r', new THREE.Float32BufferAttribute(R, 1)); g.setIndex(I);
  const m = new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 } }, vertexShader: BOW_VS, fragmentShader: BOW_FS, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = -4; mesh.visible = false; scene.add(mesh);
  ENV.bow = { mesh, m };
}
const _bowZ = new THREE.Vector3(0, 0, 1), _bowD = new THREE.Vector3();

// ---------- lightning ----------
const BOLT_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.7, 3.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
const BOLT_GLOW = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.45, 1.1), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
function boltGeo(x1, y1, z1, glow) {
  // a jagged path from the cloud base down to the strike point, with a few side branches; drawn as flat ribbons facing the camera
  // midpoint displacement: split each piece in two and nudge the middle sideways, six times over, for a properly jagged bolt
  const top = Math.max(y1 + 160, 260);
  // it comes down from beyond the target, never over the camera's head
  let ux = x1 - camera.position.x, uz = z1 - camera.position.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  const off = rand(8, 35), side = rand(-20, 20);
  let pts = [[x1 + ux * off - uz * side, top, z1 + uz * off + ux * side], [x1, y1, z1]];
  for (let lv = 0; lv < 6; lv++) {
    const nx = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), j = L * 0.28;
      nx.push([(p[0] + q[0]) / 2 + rand(-j, j), (p[1] + q[1]) / 2 + rand(-j, j) * 0.3, (p[2] + q[2]) / 2 + rand(-j, j)], q);
    }
    pts = nx;
  }
  const paths = [[pts, 1]];
  for (let b = 0; b < 4; b++) {   // forks that peter out
    const s = 4 + (Math.random() * (pts.length * 0.6) | 0), br = [pts[s]]; let [bx, by, bz] = pts[s]; const dx = rand(-1, 1), dz = rand(-1, 1);
    for (let k = 0; k < 8; k++) { bx += dx * rand(2, 6) + rand(-3, 3); by -= rand(3, 9); bz += dz * rand(2, 6) + rand(-3, 3); br.push([bx, by, bz]); }
    paths.push([br, 0.55]);
  }
  const out = [];
  for (const [w0, wk] of [[0.02, 0.0018], [0.06, 0.0065]]) {   // a thin white-hot core and a wider blue glow, about the same width on screen near or far
  const P = [], cp = camera.position, a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), v = new THREE.Vector3(), sd = new THREE.Vector3();
  for (const [path, w] of paths) for (let i = 0; i < path.length - 1; i++) {
    a.set(...path[i]); b.set(...path[i + 1]); d.subVectors(b, a); v.subVectors(a, cp); sd.crossVectors(d, v).normalize().multiplyScalar(w * (w0 + v.length() * wk));
    P.push(a.x - sd.x, a.y - sd.y, a.z - sd.z, a.x + sd.x, a.y + sd.y, a.z + sd.z, b.x + sd.x, b.y + sd.y, b.z + sd.z, a.x - sd.x, a.y - sd.y, a.z - sd.z, b.x + sd.x, b.y + sd.y, b.z + sd.z, b.x - sd.x, b.y - sd.y, b.z - sd.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.push(g);
  }
  return out;
}
function lightningStrike(x, y, z, v) {
  const [gc, gg] = boltGeo(x, y, z), m = new THREE.Group(), core = new THREE.Mesh(gc, BOLT_MAT), glow = new THREE.Mesh(gg, BOLT_GLOW);
  core.frustumCulled = glow.frustumCulled = false; core.renderOrder = 4; glow.renderOrder = 3; m.add(glow, core); scene.add(m);
  ENV.bolts.push({ m, t: 0 }); ENV.flashT = 0;
  const d = Math.hypot(x - camera.position.x, z - camera.position.z);
  if (d < 220) SFX.play('thunder', clamp(1.15 - d / 260, 0.35, 1), SFX.vary(0.06), Math.min(0.6, d / 340));
  else SFX.play('thunder2', clamp(1 - d / 900, 0.2, 0.7), 0.85 * SFX.vary(0.06), Math.min(2.5, d / 340), 1800);
  if (d < 300) {
    sparks(x, y + 0.3, z, 24); FX.smoke.emit(x, y + 0.5, z, 0, 2, 0, 2.5, 2, COL.smoke, 0.45, -0.2, 0.4, 1.3, 4);
    if (Math.abs(y - heightAt(x, z)) < 0.5) DECALS.splat(x, z, 2.4, 1);
    G.shake = Math.max(G.shake, clamp(0.9 - d / 120, 0, 0.9));
  }
  if (v) lightningHitCar(v);
  for (const p of PED.list) {   // anyone standing right there
    if (!p.active || p.remote || p.dead || p.isHero) continue;
    if ((p.x - x) ** 2 + (p.z - z) ** 2 < 12 && Math.abs(p.y - y) < 3) { toRagdoll(p, rand(-3, 3), rand(-3, 3), 5, null); killPed(p, false); }
  }
  const h = G.onFoot && HERO.p;
  if (h && !h.rag && (h.x - x) ** 2 + (h.z - z) ** 2 < 9 && Math.abs(h.y - y) < 3) { HERO.hurtT = 0; heroDamage(65, 'lightning'); toRagdoll(h, rand(-3, 3), rand(-3, 3), 5, null); }
}
// a car takes the hit: big damage, sparks crawling over it, and the electrics cut out for a few seconds
function lightningHitCar(v) {
  damageVehicle(v, v.maxHp * 0.35, null); v.zapT = 3.2;
  sparks(v.x, v.y + 1.4, v.z, 30); if (Math.random() < 0.6) breakGlass(v);
  SFX.play('zap', v === G.player ? 1 : SFX.att(v.x, v.z), SFX.vary(0.08));
  if (v === G.player) { ENV.lastPlayerHit = GT; feed('⚡ Struck by lightning! The electrics are fried for a moment', 'red'); G.shake = Math.max(G.shake, 1.2); }
}
function boltTarget() {
  const F = PF(), cx = F ? F.x : camera.position.x, cz = F ? F.z : camera.position.z, r = Math.random();
  const P = G.player && !G.onFoot && !G.plane && !G.player.wrecked ? G.player : null;
  if (P && r < 0.2 && GT - ENV.lastPlayerHit > 40) return { x: P.x, y: P.y + 1.6, z: P.z, v: P };
  if (r < 0.55) {   // another car nearby
    const cars = VEH.list.filter(v => v !== P && !v.remote && !v.sunk && !v.wrecked && (v.x - cx) ** 2 + (v.z - cz) ** 2 < 170 * 170 && (v.x - cx) ** 2 + (v.z - cz) ** 2 > 20 * 20);
    if (cars.length) { const v = pick(cars); return { x: v.x, y: v.y + 1.5, z: v.z, v }; }
  }
  if (r < 0.75 && W.tallBoxes && W.tallBoxes.length) {   // the top of a tall building
    for (let k = 0; k < 8; k++) { const b = pick(W.tallBoxes); const x = (b.x0 + b.x1) / 2, z = (b.z0 + b.z1) / 2; if ((x - cx) ** 2 + (z - cz) ** 2 < 320 * 320 && b.h > 20) return { x, y: b.h, z }; }
  }
  const a = rand(0, TAU), d = rand(40, 280), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
  return { x, y: heightAt(x, z), z };
}
function updateLightning(dt) {
  // the flash flickers: a couple of bright pulses, then it fades
  ENV.flashT += dt; const ft = ENV.flashT;
  ENV.flash = ft < 0.06 ? 1 : ft < 0.12 ? 0.25 : ft < 0.2 ? 0.85 : Math.max(0, 0.85 - (ft - 0.2) * 3.5);
  for (let i = ENV.bolts.length - 1; i >= 0; i--) {
    const b = ENV.bolts[i]; b.t += dt; b.m.visible = b.t < 0.1 || (b.t > 0.15 && b.t < 0.3);
    if (b.t > 0.36) { scene.remove(b.m); for (const c of b.m.children) c.geometry.dispose(); ENV.bolts.splice(i, 1); }
  }
  if (APP.mode !== 'game' || APP.paused || G.down || ENV.w.storm < 0.35) return;
  if ((ENV.nextBolt -= dt) > 0) return;
  ENV.nextBolt = rand(4, 13) / ENV.w.storm;
  const t = boltTarget(); lightningStrike(t.x, t.y, t.z, t.v);
}

// ---------- every frame ----------
function envUpdate(dt) {
  if (!sky) return;
  const tw = wxTarget(), k = Math.min(1, dt / 4);
  for (const key in ENV.w) ENV.w[key] += (tw[key] - ENV.w[key]) * k;
  const w = ENV.w;
  ENV.wet = clamp(ENV.wet + (w.rain > 0.15 ? dt / 25 : -dt / 120), 0, 1);
  ENV.after = Math.max(ENV.after - dt / 45, w.rain);
  updateLightning(dt);
  applyTime();
  const T = ENV.T, cp = camera.position, game = APP.mode === 'game';
  // rain
  const rainOn = game && w.rain > 0.02;
  if (rainOn && !ENV.rain) initRain();
  if (ENV.rain) {
    const R = ENV.rain, q = settings.quality === 'low' ? 0.4 : settings.quality === 'medium' ? 0.7 : 1;
    R.L.visible = rainOn; R.L.geometry.setDrawRange(0, Math.round(R.N * q * clamp(w.rain, 0, 1)) * 2);
    const u = R.m.uniforms; u.uCam.value.copy(cp); u.uT.value = (performance.now() / 1000) % (u.uH.value / u.uSpeed.value);   // wraps exactly once per fall, so the shader's numbers stay small u.uOp.value = 0.32 + 0.18 * w.storm;
    u.uCol.value.setRGB(0.72, 0.76, 0.84).multiplyScalar(0.3 + 0.7 * clamp(ENV.wk.day + ENV.wk.sunset * 0.7 + ENV.flash, 0, 1.4)); u.uWind.value.set(2 + w.storm * 5, 1 + w.storm * 2);
    if (rainOn && game && !APP.paused) {   // little splashes on the ground around you
      const gh = heightAt(cp.x, cp.z);
      if (cp.y - gh < 30) for (let i = 0; i < Math.round(w.rain * 4 * q); i++) { const x = cp.x + rand(-14, 14), z = cp.z + rand(-14, 14); FX.smoke.emit(x, heightAt(x, z) + 0.04, z, 0, rand(0.6, 1.2), 0, rand(0.18, 0.3), rand(0.08, 0.16), COL.water, 0.4, -2, 0.5, 2.5, 4); }
    }
  }
  // wet roads: darker and glossier, and a little less grip (see wetGrip)
  if (WMAT.road) {
    if (!ENV.wetBase) ENV.wetBase = ['road', 'side', 'lot', 'mark'].filter(k => WMAT[k]).map(k => ({ m: WMAT[k], r: WMAT[k].roughness, c: WMAT[k].color.clone() }));
    const wt = ENV.wet;
    for (const b of ENV.wetBase) { b.m.roughness = b.r * (1 - 0.62 * wt); b.m.color.copy(b.c).multiplyScalar(1 - 0.32 * wt); }
  }
  // rainbow: the sun has to be out while it rains, or just after
  const sunUp = clamp((T.sunVis - 0.45) / 0.4, 0, 1), rbT = game ? clamp((ENV.after - 0.08) / 0.27, 0, 1) * sunUp : 0;
  ENV.rb += (rbT - ENV.rb) * Math.min(1, dt / 1.5);
  if (ENV.rb > 0.01 && !ENV.bow) initRainbow();
  if (ENV.bow) {
    const B = ENV.bow; B.mesh.visible = ENV.rb > 0.01;
    if (B.mesh.visible) {
      const s = T.sunDir, el = Math.min(Math.max(s[1], 0.05), 0.24);   // a high sun would put the whole bow below the horizon: keep it in view
      _bowD.set(-s[0], 0, -s[2]).normalize().multiplyScalar(Math.sqrt(1 - el * el)); _bowD.y = -el;
      B.mesh.position.copy(cp); B.mesh.quaternion.setFromUnitVectors(_bowZ, _bowD); B.m.uniforms.uOp.value = ENV.rb * (settings.quality === 'low' ? 0.8 : 1);
    }
  }
  // rain on the roof
  if (SFX.ready && SFX.L.rain) SFX.loopTo('rain', game && !APP.paused ? clamp(w.rain, 0, 1) * 0.55 : 0, 1, game && CAM.fpBike ? 2400 : 9000, 0.4);
  // the clock and weather in the corner
  if (game) { const ic = ENV.key === 'night' && (ENV.wx === 'clear' || ENV.wx === 'cloudy') ? '🌙' : WX_ICON[ENV.wx] || ''; hudT('clock', settings.time === 'cycle' ? `${ic} ${clockText()}` : ic); }
}
