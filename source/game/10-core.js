// =====================================================================
//  CORE: utilities, settings, renderer, textures, shared materials, FX
// =====================================================================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const wrapA = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const lerpA = (a, b, t) => a + wrapA(b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const C = h => new THREE.Color(h).convertSRGBToLinear();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

const SETTINGS_DEF = { ffriends: 'off', bloom: 'on', pedDensity: 60, trafficDensity: 55, police: 'normal', gore: 'low', time: 'day', quality: 'medium', volume: 70, units: 'kmh', map: 'neon', damage: 'realistic', slowmo: 'on', guns: 'on', pvp: 'on', camStyle: 'roblox', autoRes: 'on', fps: 'off' };
const settings = Object.assign({}, SETTINGS_DEF, store.get('havoc.settings', {}));
const CAR_DEF = { body: 'viper', paint: '#d22f3c', finish: 'gloss', stripes: false, stripe: '#f4f4f4', rim: 'sport', rimColor: '#c9ccd2', wheel: 'm', spoiler: 'none', neon: 'off', tint: 1, height: 'stock', plate: 'HAVOC', engine: 2, handling: 2, brakes: 2, armor: 1, nitro: true };
const carCfg = Object.assign({}, CAR_DEF, store.get('havoc.car', {}));
const saveSettings = () => store.set('havoc.settings', settings);
const saveCar = () => store.set('havoc.car', carCfg);

const QUALITY = {
  low: { pr: 1, shadow: 0, fog: 330, draw: 150 },
  medium: { pr: 1.5, shadow: 1024, fog: 500, draw: 200 },
  high: { pr: 2, shadow: 2048, fog: 660, draw: 250 }
};
const POLICE = { off: { mult: 0, aggr: 1 }, low: { mult: 0.6, aggr: 0.86 }, normal: { mult: 1, aggr: 1 }, high: { mult: 1.45, aggr: 1.1 } };

// ---------- renderer ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('#nogl').hidden = false; $('#menu').hidden = true; throw e;
}
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
const scene = new THREE.Scene();

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _c1 = new THREE.Color();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _zeroM = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------- canvas textures ----------
function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function noise(g, w, h, n, lo, hi, a) {
  for (let i = 0; i < n; i++) { const v = (lo + Math.random() * (hi - lo)) | 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
}
function makeWindowTex(kind, seed) {
  const rng = mulberry32(seed), T = 8, P = 64;
  const lit = []; for (let i = 0; i < T * T; i++) lit.push(rng() < (kind === 'house' ? 0.42 : 0.36) ? (rng() < 0.75 ? 'w' : 'c') : null);
  const win = kind === 'house' ? [16, 16, 32, 30] : [7, 9, 50, 42];
  const map = canvasTex(T * P, T * P, g => {
    g.fillStyle = kind === 'house' ? '#efe9df' : '#e4e2de'; g.fillRect(0, 0, T * P, T * P);
    noise(g, T * P, T * P, 9000, 150, 255, 0.06);
    for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) {
      const x = tx * P, y = ty * P;
      if (kind !== 'house') { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x, y + P - 5, P, 5); }
      const [wx, wy, ww, wh] = win;
      const gr = g.createLinearGradient(x + wx, y + wy, x + wx + ww, y + wy + wh);
      gr.addColorStop(0, '#6f86a0'); gr.addColorStop(0.55, '#2a3749'); gr.addColorStop(1, '#4b5d72');
      g.fillStyle = gr; g.fillRect(x + wx, y + wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + wx, y + wy, ww, 3);
      g.fillStyle = kind === 'house' ? '#d9d2c4' : '#9aa3ad';
      g.fillRect(x + wx + ww / 2 - 1, y + wy, 2, wh);
      if (kind === 'house') { g.fillRect(x + wx - 3, y + wy + wh, ww + 6, 3); }
    }
  });
  const emis = canvasTex(T * P, T * P, g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, T * P, T * P);
    for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) {
      const l = lit[ty * T + tx]; if (!l) continue;
      const x = tx * P, y = ty * P, [wx, wy, ww, wh] = win;
      const b = 45 + rng() * 30;
      g.fillStyle = l === 'w' ? `hsl(${34 + rng() * 10},${80 + rng() * 15}%,${b}%)` : `hsl(${200 + rng() * 20},60%,${b + 5}%)`;
      g.fillRect(x + wx, y + wy, ww, wh);
      if (rng() < 0.4) { g.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 4; k++) g.fillRect(x + wx, y + wy + k * wh / 4, ww, wh / 10); }
    }
  });
  return { map, emis };
}
const TEX = {};
function initTextures() {
  TEX.road = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); noise(g, w, h, 3500, 20, 120, 0.25);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(w * 0.18, 0, w * 0.12, h); g.fillRect(w * 0.7, 0, w * 0.12, h);
    g.fillStyle = '#dad8cf'; g.fillRect(w * 0.035, 0, 3, h); g.fillRect(w * 0.965 - 3, 0, 3, h);
    g.fillStyle = '#e6b422'; for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 2, y + 8, 4, 40);
  });
  TEX.side = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#a7a59f'; g.fillRect(0, 0, w, h); noise(g, w, h, 2500, 90, 200, 0.18);
    g.fillStyle = 'rgba(40,38,34,.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, h / 2, w, 1); g.fillRect(w / 2, 0, 1, h);
  });
  TEX.grass = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4f7d34'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `hsla(${85 + Math.random() * 25},${40 + Math.random() * 20}%,${22 + Math.random() * 20}%,.5)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 2); }
  });
  TEX.sand = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#d9c39a'; g.fillRect(0, 0, w, h); noise(g, w, h, 4000, 140, 255, 0.15);
    g.strokeStyle = 'rgba(150,120,80,.12)'; for (let y = 6; y < h; y += 12) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.2 + y) * 2); g.stroke(); }
  });
  TEX.dirt = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#9b7a55'; g.fillRect(0, 0, w, h); noise(g, w, h, 5000, 50, 200, 0.2);
  });
  TEX.lot = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#45474b'; g.fillRect(0, 0, w, h); noise(g, w, h, 2500, 30, 120, 0.2);
  });
  TEX.splat = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    const blob = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    blob(64, 64, 26);
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, d = 16 + Math.random() * 30; blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3 + Math.random() * 10); }
    for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; g.lineWidth = 3 + Math.random() * 4; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); blob(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58, 3); }
  }, { srgb: false, repeat: false });
  TEX.glow = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false, repeat: false });
  TEX.shadow = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false, repeat: false });
  TEX.police = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#f4f5f7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#123'; g.font = 'bold 40px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('POLICE', w / 2, h / 2 + 2);
    g.fillStyle = '#2f5fd0'; g.fillRect(0, h - 7, w, 7);
  }, { repeat: false });
  hdTextures();
}

// ---------- geometry helpers ----------
function colorize(g, col) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
function mergeGeos(list) {
  let total = 0; const parts = [], ranges = [];
  for (const g0 of list) { if (!g0) { ranges.push(null); continue; } const g = g0.index ? g0.toNonIndexed() : g0; ranges.push([total, g.attributes.position.count]); parts.push(g); total += g.attributes.position.count; }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
  let o = 0, anyCol = false;
  for (const g of parts) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (g.attributes.color) { col.set(g.attributes.color.array, o * 3); anyCol = true; } else col.fill(1, o * 3, (o + n) * 3);
    o += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (anyCol) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere(); out.userData.ranges = ranges;
  return out;
}
function boxG(w, h, d, x, y, z, col, ry) {
  const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); if (col) colorize(g, col); return g;
}
// Box whose UVs tile with world size (tu,tv = metres per texture repeat)
function boxUV(x0, y0, z0, x1, y1, z1, tu, tv, opt = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new THREE.BoxGeometry(w, h, d); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const ou = opt.offU || 0, ov = opt.offV || 0;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    if (opt.roofUV && (f === 2 || f === 3)) { uv.setXY(i, opt.roofUV[0], opt.roofUV[1]); continue; }
    if (opt.topOnly && f !== 2) { uv.setXY(i, uv.getX(i) * 0.05, uv.getY(i) * 0.05); continue; }
    uv.setXY(i, uv.getX(i) * dims[f][0] / tu + ou, uv.getY(i) * dims[f][1] / tv + ov);
  }
  if (opt.color) colorize(g, opt.color);
  return g;
}
function quadXZ(x0, z0, x1, z1, y, uvs) { // horizontal quad, uvs [u0,v0,u1,v1] mapped to x/z or along
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  if (uvs) { const uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setXY(i, lerp(uvs[0], uvs[2], uv.getX(i)), lerp(uvs[1], uvs[3], uv.getY(i))); }
  return g;
}

// ---------- shared materials ----------
const MAT = {};
function initMaterials() {
  MAT.tire = new THREE.MeshStandardMaterial({ color: C('#141416'), roughness: 0.92 });
  MAT.trim = new THREE.MeshStandardMaterial({ color: C('#16181c'), roughness: 0.55, metalness: 0.25 });
  MAT.chrome = new THREE.MeshStandardMaterial({ color: C('#d9dce2'), roughness: 0.16, metalness: 1 });
  MAT.head = new THREE.MeshStandardMaterial({ color: C('#e8edf4'), emissive: C('#fff1d6'), emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.2 });
  MAT.tail = new THREE.MeshStandardMaterial({ color: C('#4a070c'), emissive: C('#ff1a2c'), emissiveIntensity: 0.55, roughness: 0.3 });
  MAT.sirenR = new THREE.MeshBasicMaterial({ color: C('#ff2030') });
  MAT.sirenB = new THREE.MeshBasicMaterial({ color: C('#2a5cff') });
  MAT.burnt = new THREE.MeshStandardMaterial({ color: C('#1c1a18'), roughness: 0.95, metalness: 0.1 });
  MAT.door = new THREE.MeshStandardMaterial({ map: TEX.police, roughness: 0.35, metalness: 0.2 });
  MAT.glassBroken = new THREE.MeshStandardMaterial({ color: C('#c3d0d8'), roughness: 0.6, metalness: 0.15, transparent: true, opacity: 0.55 });
  MAT.lightOff = new THREE.MeshStandardMaterial({ color: C('#1e1f22'), roughness: 0.5 });
  MAT.glass = [
    new THREE.MeshStandardMaterial({ color: C('#56707f'), roughness: 0.05, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: C('#1c2830'), roughness: 0.05, metalness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: C('#060809'), roughness: 0.06, metalness: 0.8 })
  ];
}
const paintCache = new Map();
const FINISH = { gloss: [0.32, 0.24], metallic: [0.85, 0.3], matte: [0.05, 0.8], chrome: [1, 0.06] };
function getPaint(hex, finish) {
  const k = hex + '|' + finish;
  if (!paintCache.has(k)) { const f = FINISH[finish] || FINISH.gloss; paintCache.set(k, new THREE.MeshStandardMaterial({ color: C(hex), metalness: f[0], roughness: f[1] })); }
  return paintCache.get(k);
}
const plateCache = new Map();
function plateMat(text) {
  if (!plateCache.has(text)) {
    const t = canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = '#f1ede2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2f3a'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#c9851a'; g.font = 'bold 11px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('HAVOC CITY', w / 2, 15);
      g.fillStyle = '#1b2233'; g.font = 'bold 38px Impact, "Arial Narrow", sans-serif'; g.textBaseline = 'alphabetic'; g.fillText(text || ' ', w / 2, 55);
    }, { repeat: false });
    plateCache.set(text, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  }
  return plateCache.get(text);
}

// ---------- environment maps ----------
const SKY_VS = `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FS = `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;
void main(){ vec3 d = normalize(vP); float h = d.y;
  vec3 c = mix(hor, top, smoothstep(0.0, 0.55, h));
  c = mix(c, bot, smoothstep(0.0, -0.2, h));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  c += sunCol * (pow(s, 1200.0) * 6.0 + pow(s, 14.0) * 0.18);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
function makeSkyMat(t) {
  return new THREE.ShaderMaterial({
    uniforms: { top: { value: C(t[0]) }, hor: { value: C(t[1]) }, bot: { value: C(t[2]) }, sunDir: { value: new THREE.Vector3(0.3, 0.6, 0.2) }, sunCol: { value: new THREE.Color(0, 0, 0) } },
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false
  });
}
function makeEnv(cols, panels) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), makeSkyMat(cols)));
  for (const p of panels || []) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.c).multiplyScalar(p.i), side: THREE.DoubleSide }));
    m.position.set(...p.pos); m.lookAt(0, 0, 0); s.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035); pm.dispose();
  return rt.texture;
}

// ---------- particles ----------
const PT_VS = `attribute float psize; attribute float palpha; attribute vec3 pcolor; uniform float uScale; uniform float uFogNear; uniform float uFogFar;
varying vec3 vC; varying float vA; varying float vFog;
void main(){ vC = pcolor; vA = palpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(psize * uScale / max(0.1, -mv.z), 1.0, 600.0); vFog = smoothstep(uFogNear, uFogFar, -mv.z); gl_Position = projectionMatrix * mv; }`;
const PT_FS = `uniform vec3 uFogColor; uniform float uAdd; uniform float uHard; varying vec3 vC; varying float vA; varying float vFog;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  float a = smoothstep(0.5, uHard, d) * vA; vec3 col = vC;
  if (uAdd > 0.5) { a *= 1.0 - vFog; } else { col = mix(col, uFogColor, vFog); }
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
const ptMats = [];
class Particles {
  constructor(max, additive, hard) {
    this.max = max; this.n = 0;
    const A = n => new Float32Array(n);
    this.p = A(max * 3); this.c = A(max * 3); this.s = A(max); this.a = A(max);
    this.v = A(max * 3); this.life = A(max); this.ml = A(max); this.g = A(max); this.dr = A(max); this.gr = A(max); this.a0 = A(max); this.k = new Uint8Array(max);
    const geo = new THREE.BufferGeometry();
    const mk = (arr, n) => { const b = new THREE.BufferAttribute(arr, n); b.setUsage(THREE.DynamicDrawUsage); return b; };
    this.pa = mk(this.p, 3); this.ca = mk(this.c, 3); this.sa = mk(this.s, 1); this.aa = mk(this.a, 1);
    geo.setAttribute('position', this.pa); geo.setAttribute('pcolor', this.ca); geo.setAttribute('psize', this.sa); geo.setAttribute('palpha', this.aa);
    geo.setDrawRange(0, 0); this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 }, uFogNear: { value: 100 }, uFogFar: { value: 300 }, uFogColor: { value: new THREE.Color() }, uAdd: { value: additive ? 1 : 0 }, uHard: { value: hard ? 0.38 : 0.1 } },
      vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    ptMats.push(this.mat);
    this.obj = new THREE.Points(geo, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = additive ? 6 : 5;
  }
  emit(x, y, z, vx, vy, vz, life, size, col, alpha, grav, drag, grow, kind) {
    if (this.n >= this.max) return -1;
    const i = this.n++, j = i * 3;
    this.p[j] = x; this.p[j + 1] = y; this.p[j + 2] = z; this.v[j] = vx; this.v[j + 1] = vy; this.v[j + 2] = vz;
    this.c[j] = col.r; this.c[j + 1] = col.g; this.c[j + 2] = col.b;
    this.life[i] = life; this.ml[i] = life; this.s[i] = size; this.a0[i] = alpha; this.a[i] = alpha;
    this.g[i] = grav || 0; this.dr[i] = drag || 0; this.gr[i] = grow || 0; this.k[i] = kind || 0;
    return i;
  }
  kill(i) {
    const j = --this.n; if (i === j) return;
    const a = i * 3, b = j * 3;
    for (let q = 0; q < 3; q++) { this.p[a + q] = this.p[b + q]; this.v[a + q] = this.v[b + q]; this.c[a + q] = this.c[b + q]; }
    this.life[i] = this.life[j]; this.ml[i] = this.ml[j]; this.s[i] = this.s[j]; this.a[i] = this.a[j]; this.a0[i] = this.a0[j];
    this.g[i] = this.g[j]; this.dr[i] = this.dr[j]; this.gr[i] = this.gr[j]; this.k[i] = this.k[j];
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const j = i * 3, k = this.k[i];
      this.v[j + 1] -= this.g[i] * dt;
      const d = Math.max(0, 1 - this.dr[i] * dt);
      this.v[j] *= d; this.v[j + 1] *= d; this.v[j + 2] *= d;
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      this.s[i] += this.gr[i] * dt;
      const t = this.life[i] / this.ml[i];
      this.a[i] = this.a0[i] * (k === 4 ? Math.min(1, t * 3) * Math.min(1, (1 - t) * 6) : Math.min(1, t * 2.2));
      if (k === 1 || k === 2 || k === 3) {
        const gh = W ? heightAt(this.p[j], this.p[j + 2]) + 0.02 : 0;
        if (this.p[j + 1] < gh) {
          if (k === 1) { // blood: stick
            this.p[j + 1] = gh; this.v[j] = this.v[j + 1] = this.v[j + 2] = 0; this.g[i] = 0;
            if (Math.random() < 0.06 && settings.gore === 'high') DECALS.splat(this.p[j], this.p[j + 2], rand(0.15, 0.35), 0);
            this.k[i] = 0; this.life[i] = Math.min(this.life[i], 0.5);
          } else if (k === 2) { this.kill(i); continue; }
          else { this.p[j + 1] = gh; this.v[j + 1] *= -0.35; this.v[j] *= 0.6; this.v[j + 2] *= 0.6; }
        }
      }
      i++;
    }
    this.pa.needsUpdate = this.ca.needsUpdate = this.sa.needsUpdate = this.aa.needsUpdate = true;
    this.geo.setDrawRange(0, this.n);
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}
// glow sprites rebuilt every frame (headlights, lamps, sirens)
class Glow {
  constructor(max) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.c = new Float32Array(max * 3); this.s = new Float32Array(max); this.a = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    const mk = (arr, n) => { const b = new THREE.BufferAttribute(arr, n); b.setUsage(THREE.DynamicDrawUsage); return b; };
    this.pa = mk(this.p, 3); this.ca = mk(this.c, 3); this.sa = mk(this.s, 1); this.aa = mk(this.a, 1);
    geo.setAttribute('position', this.pa); geo.setAttribute('pcolor', this.ca); geo.setAttribute('psize', this.sa); geo.setAttribute('palpha', this.aa);
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 }, uFogNear: { value: 100 }, uFogFar: { value: 300 }, uFogColor: { value: new THREE.Color() }, uAdd: { value: 1 }, uHard: { value: 0.0 } },
      vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    ptMats.push(this.mat);
    this.obj = new THREE.Points(geo, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = 7;
  }
  begin() { this.n = 0; }
  add(x, y, z, col, size, alpha) {
    if (this.n >= this.max) return; const i = this.n++, j = i * 3;
    this.p[j] = x; this.p[j + 1] = y; this.p[j + 2] = z; this.c[j] = col.r; this.c[j + 1] = col.g; this.c[j + 2] = col.b; this.s[i] = size; this.a[i] = alpha;
  }
  end() { this.pa.needsUpdate = this.ca.needsUpdate = this.sa.needsUpdate = this.aa.needsUpdate = true; this.geo.setDrawRange(0, this.n); }
}

// ---------- ground decals (blood, scorch) as one instanced mesh ----------
const DECALS = {
  max: 260, i: 0, mesh: null, grow: [],
  init() {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: TEX.splat, transparent: true, depthWrite: false, roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.max); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; this.mesh.receiveShadow = true;
    for (let k = 0; k < this.max; k++) { this.mesh.setMatrixAt(k, _zeroM); this.mesh.setColorAt(k, C('#5a0408')); }
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  },
  clear() { for (let k = 0; k < this.max; k++) this.mesh.setMatrixAt(k, _zeroM); this.mesh.instanceMatrix.needsUpdate = true; this.grow.length = 0; },
  place(idx, x, z, size, rot) {
    _v1.set(x, heightAt(x, z) + 0.02 + (idx % 7) * 0.0015, z); _q.setFromAxisAngle(UP, rot); _s.set(size, 1, size);
    _m.compose(_v1, _q, _s); this.mesh.setMatrixAt(idx, _m); this.mesh.instanceMatrix.needsUpdate = true; _s.set(1, 1, 1);
  },
  splat(x, z, size, kind, growTo) {
    const idx = this.i++ % this.max;
    const col = kind === 1 ? C(pick(['#121110', '#1a1714'])) : C(pick(['#5c0309', '#6e050c', '#4a0206', '#7a0a10']));
    this.mesh.setColorAt(idx, col); this.mesh.instanceColor.needsUpdate = true;
    const rot = Math.random() * TAU;
    this.grow = this.grow.filter(g => g.idx !== idx);
    if (growTo) { this.grow.push({ idx, x, z, s: size, to: growTo, rot }); }
    this.place(idx, x, z, size, rot);
  },
  update(dt) {
    for (let k = this.grow.length - 1; k >= 0; k--) {
      const g = this.grow[k]; g.s = Math.min(g.to, g.s + dt * 0.28);
      this.place(g.idx, g.x, g.z, g.s, g.rot); if (g.s >= g.to) this.grow.splice(k, 1);
    }
  }
};
const FX = {};
function initFX() {
  FX.smoke = new Particles(1800, false, false);
  FX.blood = new Particles(1600, false, true);
  FX.debris = new Particles(600, false, true);
  FX.fire = new Particles(1400, true, false);
  FX.glow = new Glow(900);
  DECALS.init();
}
function fxAddTo(parent) { parent.add(FX.smoke.obj, FX.blood.obj, FX.debris.obj, FX.fire.obj, FX.glow.obj, DECALS.mesh); }
const COL = { blink: new THREE.Color(2.4, 1.2, 0.15) };
function initColors() {
  Object.assign(COL, {
    smoke: C('#8c8c8c'), dark: C('#2a2826'), fire: new THREE.Color(1.0, 0.45, 0.12), fireHot: new THREE.Color(1.2, 0.85, 0.4),
    spark: new THREE.Color(1.3, 0.9, 0.4), blood: C('#8a0710'), blood2: C('#5c0309'), water: C('#d4ecff'), dust: C('#b9a684'),
    head: new THREE.Color(1.0, 0.95, 0.8), tail: new THREE.Color(1.0, 0.08, 0.06), sodium: new THREE.Color(1.0, 0.62, 0.22),
    sirenR: new THREE.Color(1.0, 0.1, 0.12), sirenB: new THREE.Color(0.15, 0.3, 1.0), nitro: new THREE.Color(0.35, 0.6, 1.3),
    glass: C('#d6ecf5'), tlR: new THREE.Color(1, 0.1, 0.08), tlY: new THREE.Color(1, 0.7, 0.05), tlG: new THREE.Color(0.1, 1, 0.4), white: new THREE.Color(1, 1, 1)
  });
}
