// =====================================================================
//  GRAPHICS: bloom glow (medium/high quality), drifting clouds, vignette
// =====================================================================
const POST = { composer: null, bloom: null, loading: false, failed: false, clouds: null, size: [0, 0] };
const POST_LIBS = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js', 'postprocessing/ShaderPass.js', 'postprocessing/RenderPass.js', 'postprocessing/UnrealBloomPass.js'];
const BLOOM_BY_TIME = { day: [0.32, 0.45, 0.93], sunset: [0.5, 0.5, 0.82], night: [0.9, 0.55, 0.55] };   // strength, radius, threshold
function loadPost() {
  if (POST.loading || POST.failed || POST.composer) return;
  POST.loading = true;
  const base = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const next = i => {
    if (i >= POST_LIBS.length) { POST.loading = false; try { makeComposer(); } catch (e) { POST.failed = true; } return; }
    const s = document.createElement('script'); s.src = base + POST_LIBS[i]; s.async = false;
    s.onload = () => next(i + 1); s.onerror = () => { POST.loading = false; POST.failed = true; };
    document.head.appendChild(s);
  };
  next(0);
}
function makeComposer() {
  if (!THREE.EffectComposer || !THREE.UnrealBloomPass) { POST.failed = true; return; }
  const w = Math.max(2, VW || window.innerWidth), h = Math.max(2, VH || window.innerHeight), pr = renderer.getPixelRatio();
  const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, encoding: THREE.sRGBEncoding };
  const rt = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(w * pr, h * pr, opts) : new THREE.WebGLRenderTarget(w * pr, h * pr, opts);
  const C2 = new THREE.EffectComposer(renderer, rt);
  C2.addPass(new THREE.RenderPass(scene, camera));
  const b = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.4, 0.5, 0.9);
  C2.addPass(b);
  if (THREE.ShaderPass) { const gp = new THREE.ShaderPass(GRADE_SHADER); C2.addPass(gp); POST.grade = gp; }
  POST.composer = C2; POST.bloom = b; POST.size = [0, 0];
  applyBloomTime();
}
function applyBloomTime() {
  if (!POST.bloom) return; const B = BLOOM_BY_TIME[timeKey()] || BLOOM_BY_TIME.day; POST.bloom.strength = B[0]; POST.bloom.radius = B[1]; POST.bloom.threshold = B[2];
  if (POST.grade) { const G2 = GRADE_BY_TIME[timeKey()] || GRADE_BY_TIME.day, u = POST.grade.uniforms; u.lift.value.set(...G2.lift); u.gain.value.set(...G2.gain); u.sat.value = G2.sat; u.contrast.value = G2.con; }
}
// colour grade: a warm, sun-baked look with slightly lifted shadows (works on the final display colours)
const GRADE_BY_TIME = { day: { lift: [0.03, 0.022, 0.006], gain: [1.04, 1.0, 0.92], sat: 1.05, con: 0.16 }, sunset: { lift: [0.045, 0.016, 0.0], gain: [1.08, 0.97, 0.86], sat: 1.1, con: 0.18 }, night: { lift: [0.0, 0.012, 0.035], gain: [0.96, 1.0, 1.08], sat: 0.9, con: 0.12 } };
const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1 }, contrast: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 lift; uniform vec3 gain; uniform float sat; uniform float contrast; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb; float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
    x = mix(vec3(l), x, sat); x = x * gain + lift * (1.0 - x); x = clamp(x, 0.0, 1.0); x = mix(x, x * x * (3.0 - 2.0 * x), contrast);
    gl_FragColor = vec4(x, c.a); }`
};
// sun glare: a soft corona and a few lens ghosts, drawn as page overlays so it works without post-processing
const FLARE = { el: null, parts: [], vis: 0, t: 0, occ: 0 };
function initFlare() {
  if (FLARE.el) return;
  const d = document.createElement('div'); d.id = 'flare'; d.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;mix-blend-mode:screen';
  const mk = (size, bg) => { const s = document.createElement('div'); s.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;background:${bg};will-change:transform,opacity`; d.appendChild(s); return s; };
  FLARE.parts = [
    { t: 0, s: mk(520, 'radial-gradient(circle, rgba(255,246,220,.85) 0%, rgba(255,226,170,.35) 12%, rgba(255,210,150,.12) 35%, rgba(255,200,140,0) 70%)'), a: 1 },
    { t: 0, s: mk(230, 'radial-gradient(circle, rgba(255,255,255,0) 58%, rgba(255,235,190,.28) 66%, rgba(255,255,255,0) 74%)'), a: 0.8 },
    { t: 0.55, s: mk(70, 'radial-gradient(circle, rgba(170,220,255,.32) 0%, rgba(170,220,255,0) 70%)'), a: 0.7 },
    { t: 0.95, s: mk(120, 'radial-gradient(circle, rgba(255,190,120,0) 40%, rgba(255,190,120,.22) 60%, rgba(255,190,120,0) 72%)'), a: 0.7 },
    { t: 1.35, s: mk(46, 'radial-gradient(circle, rgba(140,255,200,.35) 0%, rgba(140,255,200,0) 70%)'), a: 0.6 },
    { t: 1.75, s: mk(160, 'radial-gradient(circle, rgba(200,170,255,.16) 0%, rgba(200,170,255,0) 70%)'), a: 0.5 }
  ];
  FLARE.el = d; const st = $('#stage'); (st || document.body).appendChild(d);
}
const _fl = new THREE.Vector3();
function updateFlare(dt) {
  if (!FLARE.el) initFlare();
  const T = TNOW(), on = APP.mode === 'game' && T.sunVis > 0.5 && settings.quality !== 'low' && !G.down;
  let want = 0, sx = 0, sy = 0;
  if (on) {
    _fl.set(...T.sunDir).normalize();
    // something tall between us and the sun? march the ray through the building grid a few times a second
    if ((FLARE.t -= dt) <= 0) {
      FLARE.t = 0.12; let hit = 0; const cp = camera.position;
      for (let k = 1; k <= 40 && !hit; k++) { const d = k * 7, x = cp.x + _fl.x * d, y = cp.y + _fl.y * d, z = cp.z + _fl.z * d; if (y > 240) break; W.boxGrid.query(x - 0.5, z - 0.5, x + 0.5, z + 0.5, _pb); for (const b of _pb) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h && b.kind !== 'wall') { hit = 1; break; } }
      FLARE.occ = hit;
    }
    _v4.copy(_fl).multiplyScalar(1000).add(camera.position).project(camera);
    if (_v4.z < 1 && Math.abs(_v4.x) < 1.25 && Math.abs(_v4.y) < 1.25 && !FLARE.occ) { want = (1 - Math.min(1, Math.hypot(_v4.x, _v4.y) * 0.55)) * (timeKey() === 'sunset' ? 1 : 0.8); sx = _v4.x; sy = _v4.y; }
    else { sx = FLARE.sx || 0; sy = FLARE.sy || 0; }
  }
  FLARE.vis = lerp(FLARE.vis, want, Math.min(1, dt * 6)); if (want) { FLARE.sx = sx; FLARE.sy = sy; }
  const vis = FLARE.vis; FLARE.el.style.display = vis > 0.01 ? '' : 'none'; if (vis <= 0.01) return;
  const w = FLARE.el.clientWidth || window.innerWidth, h = FLARE.el.clientHeight || window.innerHeight;
  for (const p of FLARE.parts) { const fx = FLARE.sx * (1 - p.t), fy = FLARE.sy * (1 - p.t); p.s.style.transform = `translate(${(fx * 0.5 + 0.5) * w}px,${(0.5 - fy * 0.5) * h}px)`; p.s.style.opacity = (vis * p.a).toFixed(3); }
}
function renderScene() {
  const useBloom = POST.composer && settings.quality !== 'low' && settings.bloom !== 'off';
  if (!useBloom) { if (settings.quality !== 'low' && settings.bloom !== 'off' && !POST.composer) loadPost(); renderer.render(scene, camera); return; }
  const w = Math.max(2, VW || window.innerWidth), h = Math.max(2, VH || window.innerHeight);
  if (POST.size[0] !== w || POST.size[1] !== h || POST.pr !== renderer.getPixelRatio()) { POST.size = [w, h]; POST.pr = renderer.getPixelRatio(); POST.composer.setPixelRatio(POST.pr); POST.composer.setSize(w, h); }
  POST.composer.render();
}
// a soft layer of clouds drifting high over the city
function initClouds() {
  if (POST.clouds) return;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  for (let k = 0; k < 140; k++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 20 + Math.random() * 70;
    for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y + oy, r, 0, TAU); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  m.rotation.x = Math.PI / 2; m.position.y = 360; m.renderOrder = -5; m.frustumCulled = false;
  POST.clouds = m; scene.add(m);
}
function updateGfx(dt) {
  const m = POST.clouds; if (!m) return;
  m.position.x = camera.position.x; m.position.z = camera.position.z;
  const tx = m.material.map; tx.offset.x = (tx.offset.x + dt * 0.0016) % 1; tx.offset.y = (tx.offset.y + dt * 0.0007) % 1;
  // high up (parachute, planes, swinging) the clouds would turn into a grey sheet: fade them out
  const camY = camera.position.y, hi = clamp(1 - (camY - 90) / 110, 0, 1);
  m.material.color.set(ENV.cloudCol); m.material.opacity = Math.min(1, ENV.cloudOp) * hi;   // colour and cover come from the time of day and the weather
  m.position.y = 420;
  // and push the fog back with altitude so the city stays visible below you
  if (scene.fog) { const Q = QUALITY[settings.quality], alt = Math.max(0, camY - 35), fm = ENV.fogMul, far = Math.min(1450, Q.fog * fm + alt * 3.4); if (Math.abs(scene.fog.far - far) > 1) { scene.fog.far = far; scene.fog.near = Q.fog * 0.22 * fm + alt * 1.2; for (const pm of ptMats) { pm.uniforms.uFogNear.value = scene.fog.near; pm.uniforms.uFogFar.value = scene.fog.far; } } }
  m.visible = settings.quality !== 'low' && m.material.opacity > 0.01;
  updateFlare(dt);
  const v = $('#vignette'); if (v) { const on = APP.mode === 'game'; if (v.hidden === on) v.hidden = !on; }
  const xh = $('#xhair'); if (xh) { const on = APP.mode === 'game' && !APP.paused && (CAM.fpFoot || (CAM.sl && rbxFoot())); if (xh.hidden === on) xh.hidden = !on; }
}
