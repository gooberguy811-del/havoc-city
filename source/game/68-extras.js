// =====================================================================
//  EXTRAS: shop customers who hit the floor, the jet's cannon, the
//  secret pug, web-swinging, and hijacking + flying the helicopter
// =====================================================================

// ---------- customers browsing in walk-in stores ----------
const CUST_N = { gas: 2, gun: 1, jewel: 2, disguise: 2, bank: 3, dealer: 1 };
function storeFreePoint(st) {
  for (let k = 0; k < 12; k++) {
    const x = lerp(st.ix0 + 0.8, st.ix1 - 0.8, Math.random()), z = lerp(st.iz0 + 0.8, st.iz1 - 0.8, Math.random());
    if (!pointBlocked(x, z) && (!st.kx || Math.hypot(x - st.kx, z - st.kz) > 2)) return [x, z];
  }
  return null;
}
function updateCustomers(dt) {
  const F = PF(); if (!F) return;
  for (const st of SHOP.list) {
    const d = Math.hypot(st.cx - F.x, st.cz - F.z);
    if (st.cust && (d > 120 || st.wrecked)) { for (const p of st.cust) if (p.active && p.customer === st && !p.rag) { hidePed(p); p.active = false; p.customer = null; } st.cust = null; continue; }
    if (!st.cust && d < 75 && !st.wrecked && st.ix0 !== undefined) {
      st.cust = [];
      for (let k = 0; k < (CUST_N[st.kind] || 1); k++) { const pt = storeFreePoint(st); if (!pt) continue; const p = spawnPedAt(pt[0], pt[1], 'civ'); if (!p) continue; p.customer = st; p.state = 'idle'; p.browseT = rand(1, 5); p.h = Math.random() * TAU; st.cust.push(p); }
    }
    if (!st.cust) continue;
    // a gun out inside, a hold-up, smashed glass or gunfire: everybody down
    const inside = SHOP.inside === st && G.onFoot;
    if ((inside && gunsOn() && ARMS.cur > 0) || st.rob > 0 || st.cowerT > GT || (inside && GT - ARMS.lastShot < 1)) {
      if (!(st.panicT > GT)) { const p = st.cust.find(p => p.active && !p.rag && !p.dead); if (p) { SFX.last.scream = 0; SFX.scream(p.x, p.z); } }
      st.panicT = GT + 10;
    }
  }
}
function customerAI(p, dt) {
  const st = p.customer;
  if (!st || st.wrecked) { p.customer = null; p.state = 'walk'; p.prone = false; return; }
  if (st.panicT > GT) { p.prone = true; p.sp = 0; return; }
  p.prone = false;
  if (p.state === 'goto') {
    const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.5) { p.state = 'idle'; p.browseT = rand(st.rest ? st.rest[0] : 2, st.rest ? st.rest[1] : 6); } else { pedMove(p, Math.atan2(dx, dz), st.speed || 1.1, dt, !!st.speed); return; }
  }
  p.browseT -= dt; pedMove(p, p.h, 0, dt, false);
  if (p.browseT <= 0) { const pt = storeFreePoint(st); if (pt) { p.state = 'goto'; p.tx = pt[0]; p.tz = pt[1]; } else p.browseT = 2; }
}
// lying face down with hands on the back of the head
const PRONE = [[0, 0.2, 0.95], [0, 0.18, 0.72], [0.21, 0.18, 0.62], [-0.21, 0.18, 0.62], [0.33, 0.24, 0.84], [-0.33, 0.24, 0.84], [0.08, 0.33, 0.93], [-0.08, 0.33, 0.93],
  [0, 0.15, 0], [0.1, 0.15, -0.02], [-0.1, 0.15, -0.02], [0.12, 0.1, -0.44], [-0.12, 0.1, -0.44], [0.13, 0.12, -0.88], [-0.13, 0.12, -0.88]];
function customerPose(p) {
  if (!p.prone) return;
  const P = p.pts, c = Math.cos(p.h), sn = Math.sin(p.h), s = p.scale, shake = Math.sin(GT * 23 + p.slot) * 0.01;
  for (let i = 0; i < 15; i++) { const [lx, ly, lz] = PRONE[i]; P[i * 3] = p.x + (lx * c + lz * sn) * s; P[i * 3 + 1] = p.y + ly * s + (i >= 4 && i <= 7 ? shake : 0); P[i * 3 + 2] = p.z + (-lx * sn + lz * c) * s; }
}

// ---------- the jet (and the chopper) have a cannon ----------
const PLANE_GUN = { id: 'smg', name: 'Cannon', dmg: 26, range: 240, force: 7, pellets: 1 };
let planeGunT = 0;
function updatePlaneGun(dt) {
  planeGunT -= dt;
  const pl = G.plane; if (!pl || pl.wreck || pl.dead || G.down || !gunsOn() || (pl.type !== 'stinger' && pl.type !== 'heli' && pl.type !== 'hornet')) return;
  const fire = KEYS.KeyQ || ARMS.mouse.btn || TOUCH.horn;
  if (!fire || planeGunT > 0 || weaponsBanned()) return;
  planeGunT = 0.075;
  const cy = Math.cos(pl.yaw), sy = Math.sin(pl.yaw), cp = Math.cos(pl.pitch), sp = Math.sin(pl.pitch), side = (Math.random() < 0.5 ? -1 : 1);
  const hk = pl.def.kind === 'heli', f = { x: sy * cp, y: sp - (hk ? 0.12 : 0), z: cy * cp }, r = { x: -cy, z: sy };
  const nose = pl.type === 'hornet' ? 4.2 : hk ? 2.6 : 5.2, o = { x: pl.x + f.x * nose + r.x * side * (pl.type === 'hornet' ? 0.15 : 0.9), y: pl.y + (pl.type === 'hornet' ? 0.9 : hk ? 0.6 : 1.5) + f.y * nose, z: pl.z + f.z * nose + r.z * side * (pl.type === 'hornet' ? 0.15 : 0.9) };
  const d = { x: f.x + rand(-0.012, 0.012), y: f.y + rand(-0.012, 0.012), z: f.z + rand(-0.012, 0.012) }, l = Math.hypot(d.x, d.y, d.z); d.x /= l; d.y /= l; d.z /= l;
  applyShot(o, d, PLANE_GUN, true, null, true);
  G.flashes.push({ x: o.x, y: o.y, z: o.z, t: 0.05, s: 2.2 });
  SFX.gun('smg', 0.55); ARMS.lastShot = GT;
  if (GT - ARMS.lastHeat > 2) { ARMS.lastHeat = GT; addHeat(0.15, 0, false); }
}

// ---------- the secret pug ----------
const PUG_SITES = { base: [-470, 160], neon: [-58, -14], sand: [270, 150], perth: [-300, -20], nyc: [-120, 248] };
const PUG = { obj: null, rain: [], geo: null, mat: null, found: false, squish: 0 };
function buildPug(sc) {
  const g = new THREE.Group(), M = (c, r) => new THREE.MeshStandardMaterial({ color: C(c), roughness: r == null ? 0.95 : r });
  const fur = M('#e9d6b3'), brown = M('#7a4a26'), dark = M('#2a1a12'), white = M('#f6f3ec', 0.6), pink = M('#ef6a86', 0.7);
  const sph = (r, m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); o.position.set(x, y, z); o.scale.set(sx || 1, sy || 1, sz || 1); o.castShadow = true; g.add(o); return o; };
  sph(1, fur, 0, 1.05, 0, 1.0, 1.12, 0.92);
  for (const s of [-1, 1]) { const ear = sph(0.32, brown, s * 0.78, 1.95, 0.05, 1.1, 0.75, 0.45); ear.rotation.z = s * 0.7; }
  sph(0.62, brown, 0, 1.38, 0.62, 1.15, 0.62, 0.32);                       // brown face patch
  for (const s of [-1, 1]) { sph(0.2, white, s * 0.3, 1.5, 0.83, 1, 1, 0.5); sph(0.1, dark, s * 0.3, 1.5, 0.92, 1, 1, 0.5); sph(0.035, white, s * 0.3 + 0.03, 1.54, 0.97); }
  sph(0.12, dark, 0, 1.3, 0.93, 1.3, 0.8, 0.6);                             // nose
  sph(0.11, pink, 0.02, 1.05, 0.86, 0.9, 1.3, 0.35);                        // tongue out
  for (const s of [-1, 1]) for (const [dx, dy, r] of [[0, 0, 0.11], [-0.12, 0.13, 0.045], [0, 0.17, 0.045], [0.12, 0.13, 0.045]]) sph(r, brown, s * 0.45 + dx, 0.32 + dy, 0.83, 1, 1, 0.35);   // paw prints
  g.scale.setScalar(sc); return g;
}
function initPug() {
  if (PUG.obj) { scene.remove(PUG.obj); PUG.obj = null; }
  for (const r of PUG.rain) scene.remove(r.m); PUG.rain.length = 0;
  const s = PUG_SITES[W.id]; if (!s) return;
  PUG.obj = buildPug(1.8); PUG.obj.position.set(s[0], heightAt(s[0], s[1]), s[1]); PUG.obj.rotation.y = Math.random() * TAU; scene.add(PUG.obj);
  PUG.cool = 0;
}
function updatePug(dt) {
  const o = PUG.obj, F = PF(); if (!o || !F) return;
  PUG.squish = Math.max(0, PUG.squish - dt * 2.5);
  const k = Math.sin(PUG.squish * 9) * PUG.squish * 0.18; o.scale.set(1.8 * (1 + k), 1.8 * (1 - k), 1.8 * (1 + k));
  const d = Math.hypot(F.x - o.position.x, F.z - o.position.z);
  if (d < 5.5 && GT > (PUG.cool || 0)) {
    PUG.cool = GT + 6; PUG.squish = 1;
    SFX.squeak(); setTimeout(() => SFX.squeak(0.7), 170);
    const key = 'pug_' + W.id, first = !MIS.unlocked[key];
    if (first) { MIS.unlocked[key] = true; saveProgress(); addCash(5000, 'for finding the secret pug'); mbanner('You found the secret pug!', 'It is raining pugs. +$5,000', 'passed', 4.5); SFX.passed(); }
    else feed('Squeak!', 'blue');
    pugRain(first ? 26 : 4, F);
  }
  for (let i = PUG.rain.length - 1; i >= 0; i--) {
    const r = PUG.rain[i]; r.t += dt; r.vy -= 18 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
    const gh = heightAt(r.x, r.z); if (r.y < gh) { r.y = gh; r.vy = Math.abs(r.vy) * 0.55; r.vx *= 0.7; r.vz *= 0.7; if (Math.abs(r.vy) > 2) SFX.squeak(0.18); }
    r.m.position.set(r.x, r.y, r.z); r.m.rotation.y += r.spin * dt;
    if (r.t > 14) { scene.remove(r.m); PUG.rain.splice(i, 1); }
  }
}
function pugRain(n, F) {
  if (!PUG.mini) PUG.mini = buildPug(0.28);
  for (let k = 0; k < n && PUG.rain.length < 40; k++) {
    const m = PUG.mini.clone(); m.rotation.y = Math.random() * TAU; scene.add(m);
    const a = Math.random() * TAU, r = rand(2, 14);
    PUG.rain.push({ m, x: F.x + Math.cos(a) * r, y: (F.y || 0) + rand(14, 30), z: F.z + Math.sin(a) * r, vx: rand(-2, 2), vy: rand(-4, 0), vz: rand(-2, 2), spin: rand(-4, 4), t: 0 });
  }
}

// ---------- grappling hook: swing between buildings, or hijack the police helicopter ----------
const WEB = { held: false, line: null };
function webLine() {
  if (!WEB.line) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)); WEB.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xf4f4f2 })); WEB.line.frustumCulled = false; scene.add(WEB.line); }
  return WEB.line;
}
function webAnchor(p) {
  const fx = Math.sin(CAM.h + CAM.ly), fz = Math.cos(CAM.h + CAM.ly), tx = p.x + fx * 22, tz = p.z + fz * 22, ty = p.y + 26;
  let best = null, bs = 1e9;
  for (const b of W.tallBoxes) {
    if (b.gone || b.h < p.y + 7) continue;
    const ax = clamp(tx, b.x0, b.x1), az = clamp(tz, b.z0, b.z1), ay = b.h;
    const d = Math.hypot(ax - p.x, ay - p.y, az - p.z); if (d > 75 || d < 6) continue;
    if ((ax - p.x) * fx + (az - p.z) * fz < -4) continue;
    const sc = Math.hypot(ax - tx, ay - ty, az - tz); if (sc < bs) { bs = sc; best = { x: ax, y: ay, z: az }; }
  }
  return best;
}
function hookPress() {
  if (G.down || APP.paused || !G.onFoot) return;
  const p = HERO.p; if (!p || p.dead || HERO.swim || HERO.chute) return;
  const x = p.rag ? p.rag.pos[24] : p.x, y = p.rag ? p.rag.pos[25] - 0.9 : p.y, z = p.rag ? p.rag.pos[26] : p.z;
  // the police helicopter: get pulled up and throw the pilot out
  if (HELI.active && !HELI.down && Math.hypot(HELI.x - x, HELI.y - y, HELI.z - z) < 85) { hijackHeli(); return; }
  if (p.rag) { if (chuteAlt() < 4) return; const R = p.rag; p.rag = null; p.x = x; p.y = y; p.z = z; HERO.wv = { x: (R.pos[24] - R.prev[24]) / RSTEP, y: (R.pos[25] - R.prev[25]) / RSTEP, z: (R.pos[26] - R.prev[26]) / RSTEP }; }
  const a = webAnchor(p);
  if (!a) { if (!HERO.fly) feed('Nothing tall enough to swing from here'); return; }
  if (!HERO.web && !HERO.fly) HERO.wv = { x: Math.sin(p.h) * p.sp, y: 4, z: Math.cos(p.h) * p.sp };
  HERO.web = { x: a.x, y: a.y, z: a.z, L: Math.max(6, Math.hypot(a.x - p.x, a.y - (p.y + 1.6), a.z - p.z) * 0.92) };
  HERO.fly = true; HERO.vy = 0; SFX.whoosh();
}
function hookRelease() { if (HERO.web) { HERO.web = null; HERO.wv.y += 3; SFX.whoosh(); } }
function webInput() {
  const held = !!(KEYS.KeyH || TOUCH.hook);
  if (held && !WEB.held) hookPress(); else if (!held && WEB.held) hookRelease();
  WEB.held = held;
}
// swinging / flying physics; returns true while it owns the hero
function webUpdate(p, dt) {
  if (!HERO.fly) return false;
  if (!G.onFoot || G.down || p.rag || HERO.chute || HERO.swim) { HERO.fly = false; HERO.web = null; return false; }
  const v = HERO.wv, I = HERO.in, n = 3, h = dt / n;
  const fx = Math.sin(CAM.h), fz = Math.cos(CAM.h), rx = -fz, rz = fx;
  for (let k = 0; k < n; k++) {
    v.y -= 22 * h;
    const push = HERO.web ? 9 : 3;
    if (I.fwd > 0) { v.x += fx * push * h; v.z += fz * push * h; }
    if (I.turn) { v.x += rx * -I.turn * push * 0.8 * h; v.z += rz * -I.turn * push * 0.8 * h; }
    v.x *= Math.exp(-0.05 * h); v.z *= Math.exp(-0.05 * h);
    p.x += v.x * h; p.y += v.y * h; p.z += v.z * h;
    const W2 = HERO.web;
    if (W2) {
      if (I.fwd > 0) W2.L = Math.max(5, W2.L - 3 * h);   // reel in a little while pushing forward
      const dx = p.x - W2.x, dy = p.y + 1.6 - W2.y, dz = p.z - W2.z, d = Math.hypot(dx, dy, dz);
      if (d > W2.L) { const nx = dx / d, ny = dy / d, nz = dz / d; p.x -= nx * (d - W2.L); p.y -= ny * (d - W2.L); p.z -= nz * (d - W2.L); const vn = v.x * nx + v.y * ny + v.z * nz; if (vn > 0) { v.x -= nx * vn; v.y -= ny * vn; v.z -= nz * vn; } }
    }
    // buildings: slide along walls instead of passing through
    W.boxGrid.query(p.x - 0.6, p.z - 0.6, p.x + 0.6, p.z + 0.6, _pb);
    for (const b of _pb) {
      if (p.y > b.h - 0.1 || p.x < b.x0 - 0.3 || p.x > b.x1 + 0.3 || p.z < b.z0 - 0.3 || p.z > b.z1 + 0.3) continue;
      if (p.y > b.h - 1.2 && v.y <= 0) { p.y = b.h; v.y = 0; continue; }   // land on a roof edge
      const l = p.x - (b.x0 - 0.3), r = (b.x1 + 0.3) - p.x, t = p.z - (b.z0 - 0.3), bt = (b.z1 + 0.3) - p.z, m = Math.min(l, r, t, bt);
      if (m === l) { p.x = b.x0 - 0.3; v.x = Math.min(0, v.x); } else if (m === r) { p.x = b.x1 + 0.3; v.x = Math.max(0, v.x); } else if (m === t) { p.z = b.z0 - 0.3; v.z = Math.min(0, v.z); } else { p.z = b.z1 + 0.3; v.z = Math.max(0, v.z); }
    }
    const gh = Math.max(heightAt(p.x, p.z), roofAt(p.x, p.z, p.y));
    if (p.y <= gh) { p.y = gh; if (!HERO.web) { HERO.fly = false; v.y = 0; p.sp = Math.min(6, Math.hypot(v.x, v.z)); feed('Nice landing', 'green'); break; } v.y = Math.max(0, v.y); }
  }
  const sp = Math.hypot(v.x, v.z); if (sp > 1.5) p.h = lerpA(p.h, Math.atan2(v.x, v.z), damp(8, dt));
  p.sp = 0; HERO.vy = v.y;
  return HERO.fly;
}
function roofAt(x, z, y) { let h = -1e9; W.boxGrid.query(x - 0.2, z - 0.2, x + 0.2, z + 0.2, _pb); for (const b of _pb) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.h <= y + 0.6) h = Math.max(h, b.h); return h; }
function webVisual() {
  const L = WEB.line, p = HERO.p, on = !!(HERO.web && p && G.onFoot);
  if (!on) { if (L) L.visible = false; return; }
  const ln = webLine(), a = ln.geometry.attributes.position.array, P = p.pts;
  a[0] = P[21]; a[1] = P[22]; a[2] = P[23]; a[3] = HERO.web.x; a[4] = HERO.web.y; a[5] = HERO.web.z;
  ln.geometry.attributes.position.needsUpdate = true; ln.visible = true;
}
function webPose(p) {
  const P = p.pts, c = Math.cos(p.h), sn = Math.sin(p.h), s = p.scale, W2 = HERO.web;
  if (W2) {   // right arm reaching up the line, left arm out
    const X = P[9], Y = P[10], Z = P[11], dx = W2.x - X, dy = W2.y - Y, dz = W2.z - Z, d = Math.hypot(dx, dy, dz) || 1;
    P[15] = X + dx / d * 0.28 * s; P[16] = Y + dy / d * 0.28 * s; P[17] = Z + dz / d * 0.28 * s; P[21] = X + dx / d * 0.56 * s; P[22] = Y + dy / d * 0.56 * s; P[23] = Z + dz / d * 0.56 * s;
    const X2 = P[6], Y2 = P[7], Z2 = P[8]; P[12] = X2 + 0.3 * s * c; P[13] = Y2 - 0.05 * s; P[14] = Z2 - 0.3 * s * sn; P[18] = X2 + 0.55 * s * c; P[19] = Y2 - 0.1 * s; P[20] = Z2 - 0.55 * s * sn;
  } else {     // flying: arms swept back
    for (const [sh, el, hd, sx] of [[2, 4, 6, 1], [3, 5, 7, -1]]) { const X = P[sh * 3], Y = P[sh * 3 + 1], Z = P[sh * 3 + 2]; P[el * 3] = X + sx * 0.25 * s * c - sn * 0.12 * s; P[el * 3 + 1] = Y - 0.05 * s; P[el * 3 + 2] = Z - sx * 0.25 * s * sn - c * 0.12 * s; P[hd * 3] = X + sx * 0.45 * s * c - sn * 0.3 * s; P[hd * 3 + 1] = Y - 0.1 * s; P[hd * 3 + 2] = Z - sx * 0.45 * s * sn - c * 0.3 * s; }
  }
}

// ---------- the helicopter you can steal and fly ----------
function hijackHeli() {
  const p = HERO.p, hx = HELI.x, hy = HELI.y, hz = HELI.z, yaw = HELI.obj.rotation.y || 0;
  // the pilot goes for a long fall
  const q = spawnPedAt(hx + 1.5, hz, 'cop'); if (q) { q.y = hy - 0.5; toRagdoll(q, rand(-4, 4), rand(-4, 4), 4, null); killPed(q, true); }
  HELI.active = false; HELI.down = false; scene.remove(HELI.obj, HELI.beam, HELI.spot); HELI.cool = GT + 90;
  const pl = new Plane({ type: 'heli', x: hx, z: hz, yaw, col: '#1b2a4a', trim: '#f2f2f2' });
  pl.y = hy - 1.3; pl.ground = false; pl.T = 0.6; pl.V.set(HELI.vx || 0, 0, HELI.vz || 0); PLANES.list.push(pl);
  HERO.web = null; HERO.fly = false; if (p) { p.rag = null; }
  enterPlane(pl);
  addHeat(1.2, 4, true); G.stats.cops++;
  mbanner('Chopper hijacked!', 'W/S fly forward/back · A/D turn · Space up · Shift down', 'passed', 4);
}
function stepHeli(pl, dt) {
  const I = pl.in, V = pl.V, live = pl.pilot && !pl.dead;
  const up = live ? I.pitch : -1, fwd = live ? I.thr : 0, turn = live ? I.turn : 0;
  pl.T = live ? clamp(0.55 + up * 0.4 + Math.abs(fwd) * 0.1, 0, 1) : Math.max(0, pl.T - dt * 0.3);
  pl.yaw += (live ? turn * 2.3 : pl.dead ? 2.4 : 0) * dt;
  pl.pitch = lerp(pl.pitch, -fwd * 0.26, damp(3, dt)); pl.roll = lerp(pl.roll, -turn * 0.2, damp(3, dt));
  const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
  const D = pl.def, vmax = D.vmax || 48;
  if (!pl.ground || up > 0) { V.x += fx * fwd * (D.hAcc || 15) * dt; V.z += fz * fwd * (D.hAcc || 15) * dt; }
  const k = Math.exp(-(pl.ground ? 5 : 0.55) * dt); V.x *= k; V.z *= k;
  const hs = Math.hypot(V.x, V.z); if (hs > vmax) { V.x *= vmax / hs; V.z *= vmax / hs; }
  const vyT = pl.dead ? -16 : live ? up * (D.climb || 13) : -5;
  V.y = lerp(V.y, vyT, damp(pl.dead ? 0.8 : 2.2, dt));
  const ox = pl.x, oz = pl.z;
  pl.x += V.x * dt; pl.y += V.y * dt; pl.z += V.z * dt; pl.gs = hs;
  const water = W.waters && waterAt(pl.x, pl.z), g = planeGround(pl);
  if (pl.y <= g) {
    pl.y = g;
    if (water) { crashPlane(pl, null, true); return; }
    if (V.y < -11 || pl.dead) { crashPlane(pl, null, false); return; }
    if (!pl.ground && pl === G.plane && V.y < -3) SFX.thud(4, pl.x, pl.z);
    pl.ground = true; V.y = 0;
  } else if (pl.y > g + 0.3) pl.ground = false;
  const h = planeHit(pl);
  if (h) {
    if (hs > 16 || V.y < -12) { if (h.b.struct) hitStruct(h.b.struct, 200 + hs * 6, h.x, h.y, h.z, pl.byPlayer ? 'hero' : null); crashPlane(pl, null, false); return; }
    if (h.y > h.b.h - 1.5 && V.y <= 0) { pl.y = h.b.h + 0.02; V.y = 0; pl.ground = true; }   // touched down on a roof
    else { pl.x = ox; pl.z = oz; V.x *= -0.3; V.z *= -0.3; damagePlane(pl, hs * 1.5); SFX.thud(hs, pl.x, pl.z); }
  }
}
function updateExtras(dt) {
  updateHeal(dt); updateConstruct(dt); webInput(); webVisual(); updatePlaneGun(dt); updateCustomers(dt); updatePug(dt);
}

// ---------- healing on the run: regen, first-aid kits in the street, pocket medkits (X) ----------
const MED = { list: [], mesh: null, max: 3 };
function setupMedkits() {
  MED.list = [];
  if (!MED.mesh) {
    const w = new THREE.BoxGeometry(0.62, 0.46, 0.34); colorize(w, C('#f4f4f2'));
    const parts = [w];
    for (const z of [0.175, -0.175]) { const a = new THREE.BoxGeometry(0.34, 0.1, 0.02), b = new THREE.BoxGeometry(0.1, 0.34, 0.02); a.translate(0, 0, z); b.translate(0, 0, z); colorize(a, C('#d22f3c')); colorize(b, C('#d22f3c')); parts.push(a, b); }
    const h = new THREE.BoxGeometry(0.24, 0.06, 0.06); h.translate(0, 0.27, 0); colorize(h, C('#3a3d42')); parts.push(h);
    MED.mesh = new THREE.InstancedMesh(mergeGeos(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: C('#5a1414'), emissiveIntensity: 0.5 }), 24);
    MED.mesh.frustumCulled = false; scene.add(MED.mesh);
  }
  const rng = mulberry32(991 + W.id.length * 13);
  for (let k = 0; k < 16 && W.loops.length; k++) {
    const L = W.loops[(rng() * W.loops.length) | 0], c = (rng() * 4) | 0, c2 = (c + 1) % 4, f = 0.25 + rng() * 0.5;
    MED.list.push({ x: lerp(L.pts[c][0], L.pts[c2][0], f), z: lerp(L.pts[c][1], L.pts[c2][1], f), t: 0 });
  }
  for (const st of SHOP.list) if (st.kind === 'gas' || st.kind === 'disguise' || st.kind === 'bank') MED.list.push({ x: st.dx, z: st.dz, t: 0 });
}
function useMedkit() {
  if (G.down || !(HERO.meds > 0)) { if (!(HERO.meds > 0)) feed('No medkits. Buy them at gas stations or grab the red-cross boxes'); return; }
  if (G.onFoot) { if (HERO.hp >= HERO.maxHp) { feed('You are already at full health'); return; } HERO.hp = Math.min(HERO.maxHp, HERO.hp + 55); }
  else if (G.player) { const v = G.player; if (v.health >= v.maxHp) { feed('Your ride is in one piece'); return; } v.health = Math.min(v.maxHp, v.health + v.maxHp * 0.4); }
  else if (G.plane) { const pl = G.plane; if (pl.hp >= pl.def.hp || pl.wreck) return; pl.hp = Math.min(pl.def.hp, pl.hp + pl.def.hp * 0.4); if (pl.hp > 0) pl.dead = false; }
  else return;
  HERO.meds--; SFX.ding(); feed(`Patched up · ${HERO.meds} medkit${HERO.meds === 1 ? '' : 's'} left`, 'green');
}
function updateHeal(dt) {
  // catch your breath: after a few seconds out of trouble, health climbs back
  if (G.onFoot && !G.down && HERO.p && !HERO.p.dead && HERO.hp < HERO.maxHp && GT - (HERO.lastHurt || -99) > 6) HERO.hp = Math.min(HERO.maxHp, HERO.hp + 4 * dt);
  const F = PF(), M = MED.mesh; if (!M) return;
  for (let k = 0; k < MED.list.length; k++) {
    const m = MED.list[k]; if (m.t > 0) { m.t -= dt; continue; }
    if (!F || G.down || Math.hypot(F.x - m.x, F.z - m.z) > (G.onFoot ? 1.7 : 3.4) || G.plane) continue;
    if (G.onFoot && HERO.hp < HERO.maxHp - 1) { HERO.hp = Math.min(HERO.maxHp, HERO.hp + 50); feed('+50 health', 'green'); }
    else if (!G.onFoot && G.player && G.player.health < G.player.maxHp - 1) { G.player.health = Math.min(G.player.maxHp, G.player.health + G.player.maxHp * 0.3); feed('Quick patch-up for your ride', 'green'); }
    else if ((HERO.meds || 0) < MED.max) { HERO.meds = (HERO.meds || 0) + 1; feed(`Medkit saved for later (${HERO.meds}) · ${APP.touch ? 'tap HEAL' : 'press X'} to use`, 'green'); }
    else continue;
    SFX.ding(); m.t = 45;
  }
  for (let k = 0; k < 24; k++) {
    const m = MED.list[k];
    if (!m || m.t > 0) { M.setMatrixAt(k, _zeroM); continue; }
    _v1.set(m.x, heightAt(m.x, m.z) + 0.6 + Math.sin(GT * 3 + k) * 0.1, m.z); _q.setFromAxisAngle(UP, GT * 1.5 + k); _m.compose(_v1, _q, _s); M.setMatrixAt(k, _m);
  }
  M.instanceMatrix.needsUpdate = true;
  const n = HERO.meds || 0, el2 = $('#meds'); if (el2 && MED.shown !== n) { MED.shown = n; el2.hidden = !n; el2.textContent = `✚ ${n} medkit${n === 1 ? '' : 's'}${APP.touch ? '' : ' · X'}`; const hb = $('#touch [data-k=heal]'); if (hb) hb.hidden = !n; }
}
// first person on foot: aim where the crosshair points
function centerRayPoint() {
  camera.getWorldDirection(_v1); const o = camera.position;
  const h = rayCast(o.x, o.y, o.z, _v1.x, _v1.y, _v1.z, 320, G.player, true);
  return { x: h.x, y: h.y, z: h.z };
}
