// =====================================================================
//  EXPLOSIONS: volumetric fireballs, shockwave, flash light, sparks,
//  smoking debris, plumes, lingering fires, distance-delayed sound
// =====================================================================
const BOOM = { balls: [], pool: [], rings: [], chunks: [], plumes: [], fires: [], queue: [], sounds: [], light: null, lightE: 0, lightX: 0, lightY: 0, lightZ: 0, geo: null, mat: null, chunkMesh: null };
const NOISE3 = `
vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return m289(((x*34.0)+1.0)*x);}vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);
vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
const BALL_VS = NOISE3 + `
uniform float uT, uSeed, uRough;
varying float vN; varying vec3 vNw; varying vec3 vPw;
void main(){
  float n = snoise(position * 1.4 + vec3(uSeed, uSeed * 0.7 - uT * 1.3, uT * 0.6));
  float n2 = snoise(position * 3.3 + vec3(uT * 1.7, uSeed, -uT));
  vN = n * 0.7 + n2 * 0.3;
  vec3 p = position * (1.0 + vN * uRough);
  vec4 wp = modelMatrix * vec4(p, 1.0); vPw = wp.xyz;
  vNw = normalize(mat3(modelMatrix) * position);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const BALL_FS = `
uniform float uHeat, uAlpha, uSoot;
varying float vN; varying vec3 vNw; varying vec3 vPw;
void main(){
  vec3 V = normalize(cameraPosition - vPw);
  float facing = clamp(dot(normalize(vNw), V), 0.0, 1.0);
  float heat = uHeat * (0.35 + 0.75 * facing) + vN * 0.55;
  vec3 smoke = mix(vec3(0.045, 0.04, 0.035), vec3(0.2, 0.19, 0.18), uSoot) * (0.55 + 0.6 * (vN * 0.5 + 0.5)) * (0.6 + 0.4 * facing);
  vec3 fire = mix(vec3(0.75, 0.1, 0.01), vec3(1.0, 0.42, 0.06), smoothstep(0.25, 0.7, heat));
  fire = mix(fire, vec3(1.0, 0.82, 0.45), smoothstep(0.75, 1.1, heat));
  fire = mix(fire, vec3(1.0, 0.97, 0.85), smoothstep(1.15, 1.5, heat));
  float f = smoothstep(0.12, 0.5, heat);
  vec3 col = mix(smoke, fire * (1.35 + heat * 1.25), f);
  float camD = length(cameraPosition - vPw);
  float a = uAlpha * mix(0.42, 1.0, f) * smoothstep(0.0, 0.45, facing + 0.05) * smoothstep(1.5, 7.0, camD);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
function initBoom() {
  BOOM.geo = new THREE.IcosahedronGeometry(1, 4);
  BOOM.mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uSeed: { value: 0 }, uRough: { value: 0.3 }, uHeat: { value: 1 }, uAlpha: { value: 1 }, uSoot: { value: 0 } }, vertexShader: BALL_VS, fragmentShader: BALL_FS, transparent: true, depthWrite: false });
  BOOM.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rg = new THREE.RingGeometry(0.82, 1, 48); rg.rotateX(-Math.PI / 2); BOOM.ringGeo = rg;
  BOOM.light = new THREE.PointLight(0xffa860, 0, 110, 2);
  BOOM.chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2b2826, roughness: 0.9 }), 80);
  BOOM.chunkMesh.castShadow = true; BOOM.chunkMesh.frustumCulled = false;
  for (let i = 0; i < 80; i++) BOOM.chunkMesh.setMatrixAt(i, _zeroM);
}
function boomAddTo(parent) { parent.add(BOOM.light, BOOM.chunkMesh); }
function clearBoom() {
  for (const b of BOOM.balls) { b.m.visible = false; BOOM.pool.push(b.m); }
  for (const r of BOOM.rings) { r.m.parent && r.m.parent.remove(r.m); r.m.material.dispose(); }
  BOOM.balls.length = 0; BOOM.rings.length = 0; BOOM.chunks.length = 0; BOOM.plumes.length = 0; BOOM.fires.length = 0; BOOM.queue.length = 0; BOOM.sounds.length = 0; BOOM.lightE = 0;
  for (let i = 0; i < 80; i++) BOOM.chunkMesh.setMatrixAt(i, _zeroM); BOOM.chunkMesh.instanceMatrix.needsUpdate = true;
}
// schedule work in game time (respects pause and slow motion)
function boomLater(delay, fn) { BOOM.queue.push({ t: GT + delay, fn }); }
function fireball(x, y, z, r, opt) {
  if (BOOM.balls.length > 70) return;
  let m = BOOM.pool.pop();
  if (!m) { m = new THREE.Mesh(BOOM.geo, BOOM.mat.clone()); m.frustumCulled = false; scene.add(m); }
  m.visible = true; m.position.set(x, y, z); m.scale.setScalar(0.01); m.renderOrder = 7;
  const u = m.material.uniforms; u.uSeed.value = Math.random() * 50; u.uRough.value = opt && opt.rough || 0.32; u.uSoot.value = opt && opt.soot || 0;
  BOOM.balls.push({ m, t: -(opt && opt.delay || 0), life: opt && opt.life || 2.2, r, vx: opt && opt.vx || 0, vy: opt && opt.vy != null ? opt.vy : r * 0.9, vz: opt && opt.vz || 0, tau: opt && opt.tau || 0.11, cool: opt && opt.cool || 0.5, heat0: opt && opt.heat || 1.45 });
}
function shockRing(x, y, z, r) {
  const m = new THREE.Mesh(BOOM.ringGeo, BOOM.ringMat.clone()); m.position.set(x, Math.max(heightAt(x, z), y - 3) + 0.15, z); m.renderOrder = 8; m.frustumCulled = false; scene.add(m);
  BOOM.rings.push({ m, t: 0, r });
}
function boomFX(x, y, z, power, big) {
  const P = power, gh = heightAt(x, z), camD = Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z);
  const low = settings.quality === 'low';
  // core fireball cluster
  const n = Math.round((big ? 11 : 4 + P * 2) * (low ? 0.6 : 1));
  const R = 2.6 * Math.sqrt(P) + (big ? 3 : 0);
  fireball(x, y + R * 0.2, z, R * 1.05, { life: 1.6 + P * 0.35, heat: 1.3, tau: 0.09, cool: 0.42 });
  for (let k = 0; k < Math.ceil(n / 2); k++) { const a = Math.random() * TAU; fireball(x + Math.cos(a) * R * 0.6, y + R * 0.5, z + Math.sin(a) * R * 0.6, R * rand(0.7, 1.0), { delay: rand(0.15, 0.35), life: rand(2.4, 3.4) + P * 0.25, heat: 0.35, cool: 0.3, vy: R * 0.5, vx: Math.cos(a) * R * 0.4, vz: Math.sin(a) * R * 0.4, tau: 0.5, rough: 0.26 }); }
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, e = rand(-0.2, 1.1), d = R * rand(0.4, 1.1);
    fireball(x + Math.cos(a) * Math.cos(e) * d, Math.max(gh + R * 0.3, y + Math.sin(e) * d * 0.8), z + Math.sin(a) * Math.cos(e) * d, R * rand(0.45, 0.85),
      { delay: rand(0, 0.12) * (big ? 2 : 1), life: rand(1.4, 2.6) + P * 0.25, vx: Math.cos(a) * R * 0.9, vz: Math.sin(a) * R * 0.9, vy: R * rand(0.5, 1.4), cool: rand(0.35, 0.6), heat: rand(1.0, 1.3) });
  }
  if (big) { // mushroom: stem and a cap that rises and rolls outward
    for (let k = 0; k < 4; k++) fireball(x + rand(-1, 1), gh + 3 + k * 4, z + rand(-1, 1), R * (0.55 - k * 0.05), { delay: 0.15 + k * 0.08, life: 3.2, vy: 7 + k * 2.2, cool: 0.5, heat: 1.35, rough: 0.4 });
    fireball(x, gh + 8, z, R * 1.35, { delay: 0.3, life: 4.6, vy: 9.5, tau: 0.35, cool: 0.38, heat: 1.4, rough: 0.42 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; fireball(x + Math.cos(a) * R, gh + 12, z + Math.sin(a) * R, R * 0.8, { delay: 0.45, life: 4.2, vx: Math.cos(a) * 4, vz: Math.sin(a) * 4, vy: 7.5, tau: 0.4, cool: 0.36, heat: 1.25, rough: 0.45 }); }
  }
  // flash + light
  G.flashes.push({ x, y, z, t: 0.4, s: (big ? 60 : 24) * Math.sqrt(P) });
  if (P * (big ? 3 : 1) >= BOOM.lightE * 0.6) { BOOM.lightE = (big ? 3.2 : 1) * P; BOOM.lightX = x; BOOM.lightY = y + 2; BOOM.lightZ = z; }
  // shockwave ring + dust blown out along the ground
  shockRing(x, y, z, (big ? 46 : 11) * Math.sqrt(P));
  const nd = Math.round((big ? 70 : 26) * (low ? 0.5 : 1));
  for (let k = 0; k < nd; k++) { const a = Math.random() * TAU, s = rand(10, 22) * Math.sqrt(P) * (big ? 1.6 : 1); FX.smoke.emit(x + Math.cos(a), gh + 0.4, z + Math.sin(a), Math.cos(a) * s, rand(0.2, 1.6), Math.sin(a) * s, rand(1.6, 3.2), rand(1.2, 2.4) * (big ? 1.8 : 1), W && W.id === 'neon' ? COL.smoke : COL.dust, 0.45, -0.2, 2.4, 1.8, 4); }
  // sparks and burning embers that arc down
  const ns = Math.round((big ? 110 : 45) * (low ? 0.6 : 1));
  for (let k = 0; k < ns; k++) { const a = Math.random() * TAU, e = rand(0.1, 1.3), s = rand(8, 26) * Math.sqrt(P); FX.fire.emit(x, y + 0.5, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, rand(0.6, 1.8), rand(0.12, 0.32), Math.random() < 0.6 ? COL.spark : COL.fireHot, 1, 14, 0.6, -0.08, 3); }
  // hot gas licks
  for (let k = 0; k < (big ? 60 : 24); k++) { const a = Math.random() * TAU, e = Math.random() * 1.2, s = rand(4, 11) * Math.sqrt(P); FX.fire.emit(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 2, Math.sin(a) * Math.cos(e) * s, rand(0.3, 0.7), rand(1.2, 2.6) * Math.sqrt(P) * (big ? 1.5 : 1), Math.random() < 0.5 ? COL.fire : COL.fireHot, 1, -2, 2.8, 2.2, 4); }
  // flying chunks trailing smoke
  const nc = big ? 26 : Math.round(6 + P * 4);
  for (let k = 0; k < nc && BOOM.chunks.length < 80; k++) { const a = Math.random() * TAU, s = rand(7, 20) * Math.sqrt(P); BOOM.chunks.push({ x, y: y + 0.6, z, vx: Math.cos(a) * s, vy: rand(6, 18) * Math.sqrt(P), vz: Math.sin(a) * s, sz: rand(0.12, 0.42) * (big ? 1.6 : 1), rx: rand(-8, 8), ry: rand(-8, 8), ax: 0, ay: 0, t: 0, fire: Math.random() < 0.45 }); }
  // a smoke plume that keeps rising for a while
  BOOM.plumes.push({ x, y: gh, z, t: 0, life: big ? 75 : 6 + P * 4, rate: big ? 26 : 7 + P * 3, size: big ? 7 : 2.2 + P, rise: big ? 9 : 4 });
  DECALS.splat(x, z, (big ? 9 : 4) * Math.sqrt(P), 1);
  // sound travels at ~340 m/s
  BOOM.sounds.push({ t: GT + camD / 340, v: clamp(1.15 - camD / (big ? 520 : 260), 0.08, 1), big, far: camD });
  G.shake = Math.max(G.shake, clamp(1.25 - camD / (big ? 150 : 65), 0, 1) * Math.min(2.2, P * (big ? 1.6 : 1)));
}
function addFire(x, z, r, life) { BOOM.fires.push({ x, z, r, t: 0, life }); }
// a fuel pump goes up: at a gas station the whole forecourt follows
function pumpBlast(p, src) {
  const st = SHOP.list.find(s => Math.hypot(s.gx - p.x, s.gz - p.z) < 18);
  if (!st) { explode(p.x, p.y + 1, p.z, 2.2, src); return; }
  if (st.blown) { explode(p.x, p.y + 1, p.z, 1.8, src); return; }
  st.blown = true; NET.wdDirty = true; netFx(['g', SHOP.list.indexOf(st)]);
  explode(p.x, p.y + 1, p.z, 2.4, src);
  boomLater(0.35, () => {
    explode(st.gx, st.h + 2.5, st.gz, 5, src, null, true);
    damageStructsAt(st.gx, st.h + 4, st.gz, 6, src, 40);
    for (let k = 0; k < 9; k++) { const a = Math.random() * TAU, d = rand(2, 12); addFire(st.gx + Math.cos(a) * d, st.gz + Math.sin(a) * d, rand(1.6, 3.2), rand(30, 55)); }
    if (isPlayerSrc(src)) { addHeat(1.5, 3, true); feed('You blew up the gas station!', 'red'); }
  });
  for (const q of W.props) {
    if (q.type !== 'pump' || q.st !== 0 || Math.hypot(st.gx - q.x, st.gz - q.z) > 16) continue;
    q.st = 3;
    boomLater(rand(0.15, 1.3), () => explode(q.x, q.y + 1, q.z, 1.7, src));
  }
}
function updateBoom(dt) {
  // queued blasts
  for (let i = BOOM.queue.length - 1; i >= 0; i--) { const q = BOOM.queue[i]; if (GT >= q.t) { BOOM.queue.splice(i, 1); q.fn(); } }
  // delayed booms
  for (let i = BOOM.sounds.length - 1; i >= 0; i--) { const s = BOOM.sounds[i]; if (GT >= s.t) { BOOM.sounds.splice(i, 1); if (s.collapse) SFX.collapse(s.v, s.big); else SFX.boom(s.v, s.big, s.far); } }
  // fireballs
  for (let i = BOOM.balls.length - 1; i >= 0; i--) {
    const b = BOOM.balls[i]; b.t += dt; const m = b.m, u = m.material.uniforms;
    if (b.t < 0) { m.visible = false; continue; }
    m.visible = true;
    if (b.t >= b.life) { m.visible = false; BOOM.pool.push(m); BOOM.balls.splice(i, 1); continue; }
    const k = b.t / b.life, grow = 1 - Math.exp(-b.t / b.tau);
    m.scale.setScalar(Math.max(0.01, b.r * (grow + k * 0.55)));
    const drag = Math.exp(-2.2 * dt); b.vx *= drag; b.vz *= drag; b.vy = b.vy * Math.exp(-0.7 * dt) + 2.5 * dt;
    m.position.x += b.vx * dt; m.position.y += b.vy * dt; m.position.z += b.vz * dt;
    u.uT.value = b.t; u.uHeat.value = b.heat0 * Math.exp(-b.t / (b.life * b.cool * 0.5)); u.uSoot.value = Math.min(1, k * 1.3) * 0.35;
    const rr = m.scale.x, cd = m.position.distanceTo(camera.position), inside = clamp((cd - rr * 0.6) / (rr * 0.7), 0, 1);
    u.uAlpha.value = Math.min(1, b.t / 0.05) * (k < 0.45 ? 0.95 : Math.max(0, 1 - (k - 0.45) / 0.55) * 0.85) * inside;
    if (k > 0.35 && Math.random() < dt * 14 && !b.smoked) { FX.smoke.emit(m.position.x + rand(-1, 1) * b.r * 0.4, m.position.y, m.position.z + rand(-1, 1) * b.r * 0.4, rand(-0.8, 0.8), rand(1.2, 3), rand(-0.8, 0.8), rand(4, 7), b.r * rand(0.8, 1.3), COL.dark, 0.5, -0.3, 0.4, b.r * 0.35, 4); }
  }
  // shockwave rings
  for (let i = BOOM.rings.length - 1; i >= 0; i--) {
    const r = BOOM.rings[i]; r.t += dt; const k = r.t / 0.55;
    if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); BOOM.rings.splice(i, 1); continue; }
    r.m.scale.setScalar(0.5 + r.r * Math.pow(k, 0.55)); r.m.material.opacity = 0.75 * (1 - k) * (1 - k);
  }
  // debris chunks
  const CM = BOOM.chunkMesh;
  for (let i = 0; i < 80; i++) {
    const c = BOOM.chunks[i];
    if (!c) { CM.setMatrixAt(i, _zeroM); continue; }
    c.t += dt; c.vy -= 22 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.ax += c.rx * dt; c.ay += c.ry * dt;
    const gh = heightAt(c.x, c.z);
    if (c.y < gh + c.sz * 0.5) { c.y = gh + c.sz * 0.5; c.vy *= -0.3; c.vx *= 0.55; c.vz *= 0.55; c.rx *= 0.5; c.ry *= 0.5; }
    if (c.t < 1.8 && Math.random() < 0.6) { if (c.fire) FX.fire.emit(c.x, c.y, c.z, 0, 0.5, 0, rand(0.15, 0.3), rand(0.4, 0.7), COL.fire, 1, -1, 1, 0.8, 4); FX.smoke.emit(c.x, c.y, c.z, rand(-0.2, 0.2), 0.6, rand(-0.2, 0.2), rand(0.8, 1.6), rand(0.3, 0.6), COL.dark, 0.55, -0.2, 0.5, 0.9, 4); }
    _q.setFromEuler(_eul.set(c.ax, c.ay, 0)); _v1.set(c.x, c.y, c.z); _s.set(c.sz, c.sz * 0.7, c.sz * 1.2); _m.compose(_v1, _q, _s); CM.setMatrixAt(i, _m);
  }
  _s.set(1, 1, 1);
  for (let i = BOOM.chunks.length - 1; i >= 0; i--) if (BOOM.chunks[i].t > 9) BOOM.chunks.splice(i, 1);
  CM.instanceMatrix.needsUpdate = true;
  // plumes
  const cx = camera.position.x, cz = camera.position.z;
  for (let i = BOOM.plumes.length - 1; i >= 0; i--) {
    const p = BOOM.plumes[i]; p.t += dt; if (p.t > p.life) { BOOM.plumes.splice(i, 1); continue; }
    if ((p.x - cx) ** 2 + (p.z - cz) ** 2 > 400 * 400) continue;
    const fade = 1 - p.t / p.life, n = p.rate * dt * fade;
    for (let k = 0; k < n || Math.random() < n - k; k++) { FX.smoke.emit(p.x + rand(-1, 1) * p.size * 0.4, p.y + rand(0.5, 2), p.z + rand(-1, 1) * p.size * 0.4, rand(-0.6, 0.6) + 0.8, p.rise * rand(0.7, 1.2), rand(-0.6, 0.6) + 0.3, rand(5, 9), p.size * rand(0.7, 1.2), COL.dark, 0.55 * fade + 0.1, -0.15, 0.08, p.size * 0.28, 4); if (k > 6) break; }
  }
  // ground fires
  const H = G.onFoot && HERO.p && !HERO.p.rag ? HERO.p : null;
  let nf = null, nfd = 1e9;
  for (let i = BOOM.fires.length - 1; i >= 0; i--) {
    const f = BOOM.fires[i]; f.t += dt; if (f.t > f.life) { BOOM.fires.splice(i, 1); continue; }
    const fade = Math.min(1, (f.life - f.t) / 5), d2 = (f.x - cx) ** 2 + (f.z - cz) ** 2;
    if (d2 < nfd) { nfd = d2; nf = f; }
    if (d2 > 260 * 260) continue;
    const gh = heightAt(f.x, f.z);
    if (Math.random() < 0.8) FX.fire.emit(f.x + rand(-1, 1) * f.r * 0.6, gh + 0.2, f.z + rand(-1, 1) * f.r * 0.6, rand(-0.3, 0.3), rand(2, 4), rand(-0.3, 0.3), rand(0.35, 0.7), rand(0.5, 0.95) * f.r * fade, Math.random() < 0.2 ? COL.fireHot : COL.fire, 0.8, -3, 1.2, 0.3, 4);
    if (Math.random() < 0.25) FX.smoke.emit(f.x, gh + 1.5, f.z, rand(-0.4, 0.4), rand(2.5, 4), rand(-0.4, 0.4), rand(3, 6), f.r * 1.2, COL.dark, 0.45 * fade, -0.2, 0.1, 1.2, 4);
    G.flashes.length < 60 && Math.random() < 0.06 && G.flashes.push({ x: f.x, y: gh + 1, z: f.z, t: 0.12, s: 3.5 * f.r * fade });
    if (H && Math.hypot(H.x - f.x, H.z - f.z) < f.r) heroDamage(18 * dt * 6, 'blast');
  }
  // flash light: strongest recent blast, else flicker on the nearest fire
  BOOM.lightE *= Math.exp(-dt * 5);
  const L = BOOM.light;
  if (BOOM.lightE > 0.05) { L.position.set(BOOM.lightX, BOOM.lightY, BOOM.lightZ); L.intensity = Math.min(9, BOOM.lightE * 4.5); L.distance = 40 + BOOM.lightE * 22; }
  else if (nf && nfd < 90 * 90) { L.position.set(nf.x, heightAt(nf.x, nf.z) + 2, nf.z); L.intensity = 1.4 + Math.sin(GT * 23) * 0.3 + Math.sin(GT * 37) * 0.25; L.distance = 30; }
  else L.intensity = 0;
}
