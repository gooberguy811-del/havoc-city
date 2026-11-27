// =====================================================================
//  RUBBLE PHYSICS: chunks of concrete and glass that break off buildings when they're hit and come
//  down when they collapse. They tumble, bounce, land on roofs, get shoved by explosions, and cars
//  plough through them (or get crushed by the big ones falling from above). Local to each player.
// =====================================================================
const RUB = { N: 420, list: [], mesh: null, grid: new Map(), seq: 0, active: 0 };
const _rum = new THREE.Matrix4(), _ruq = new THREE.Quaternion(), _ruq2 = new THREE.Quaternion(), _rus = new THREE.Vector3(), _rup = new THREE.Vector3(), _rue = new THREE.Euler(), _ruc = new THREE.Color(), _rub = [];
function initRubble() {
  if (RUB.mesh) return;
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.02 }), RUB.N);
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  for (let i = 0; i < RUB.N; i++) { m.setMatrixAt(i, _zeroM); m.setColorAt(i, _ruc.set(0x888888)); }
  scene.add(m); RUB.mesh = m;
  for (let i = 0; i < RUB.N; i++) RUB.list.push({ on: false, i, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, q: new THREE.Quaternion(), wx: 0, wy: 0, wz: 0, sx: 1, sy: 1, sz: 1, ey: 0.5, sleep: 0, t: 0, born: 0, hurt: 0 });
}
function clearRubble() { if (!RUB.mesh) return; for (const c of RUB.list) if (c.on) { c.on = false; RUB.mesh.setMatrixAt(c.i, _zeroM); } RUB.mesh.instanceMatrix.needsUpdate = true; RUB.active = 0; }
// a free slot, or the oldest chunk (preferring ones far from the camera)
function rubbleSlot() {
  let best = null, bs = -1;
  for (const c of RUB.list) {
    if (!c.on) return c;
    const d2 = (c.x - camera.position.x) ** 2 + (c.z - camera.position.z) ** 2, s = (GT - c.born) + d2 / 400;
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}
function rubbleChunk(x, y, z, vx, vy, vz, sx, sy, sz, col) {
  if (!RUB.mesh) initRubble();
  const c = rubbleSlot(); if (!c.on) RUB.active++;
  Object.assign(c, { on: true, x, y, z, vx, vy, vz, sx, sy, sz, sleep: 0, t: 0, born: GT, hurt: 0, wx: rand(-4, 4), wy: rand(-3, 3), wz: rand(-4, 4) });
  c.q.setFromEuler(_rue.set(rand(0, TAU), rand(0, TAU), rand(0, TAU)));
  RUB.mesh.setColorAt(c.i, _ruc.set(col).convertSRGBToLinear().multiplyScalar(rand(0.75, 1.1))); RUB.mesh.instanceColor.needsUpdate = true;
  return c;
}
const GLASS_COLS = ['#4d6b80', '#2f4555', '#6e8fa3'];
// chunks breaking off a building: at a point on its face (a hit), or all over it while it collapses
function structChunks(s, n, px, py, pz, out) {
  const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, H = s.top - s.y0, big = clamp(0.5 + H * 0.02, 0.6, 2.2);
  const glass = s.kind === 'bldg' && s.bldgs.length && s.bldgs[0].tex === 'glass';
  for (let k = 0; k < n; k++) {
    let x, y, z, nx, nz;
    if (px != null) { x = px + rand(-0.8, 0.8); y = py + rand(-0.8, 0.8); z = pz + rand(-0.8, 0.8); nx = x - cx; nz = z - cz; }
    else {   // somewhere on one of the four walls, below the current (sinking) top
      const side = (Math.random() * 4) | 0, f = Math.random();
      x = side < 2 ? lerp(s.x0, s.x1, f) : side === 2 ? s.x0 : s.x1; z = side >= 2 ? lerp(s.z0, s.z1, f) : side === 0 ? s.z0 : s.z1;
      nx = side === 2 ? -1 : side === 3 ? 1 : 0; nz = side === 0 ? -1 : side === 1 ? 1 : 0;
      y = rand(s.y0 + 1, s.y0 + Math.max(2, (out || 1) * H));
    }
    const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    const sp = rand(1.5, 6), sz = rand(0.35, 1) * big;
    rubbleChunk(x + nx * 0.6, y, z + nz * 0.6, nx * sp + rand(-1.5, 1.5), rand(-1, 3), nz * sp + rand(-1.5, 1.5), sz * rand(0.7, 1.6), sz * rand(0.5, 1.2), sz * rand(0.7, 1.6), glass && Math.random() < 0.4 ? pick(GLASS_COLS) : Math.random() < 0.25 ? pick(RUBBLE_COLS) : s.col);
  }
}
// a collapse: chunks peel off the walls in waves while it comes down, then a heap tumbles out at the base
function collapseChunks(s) {
  const H = s.top - s.y0, area = (s.x1 - s.x0) * (s.z1 - s.z0), n = clamp(Math.round(8 + H * 0.35 + area * 0.02), 8, 40), waves = 4;
  for (let w = 0; w < waves; w++) boomLater(s.dur * w / waves + 0.05, () => structChunks(s, Math.ceil(n / waves), null, null, null, 1 - w / waves * 0.85));
  boomLater(s.dur * 0.95, () => { for (let k = 0; k < Math.ceil(n / 3); k++) { const x = rand(s.x0, s.x1), z = rand(s.z0, s.z1), a = Math.atan2(z - (s.z0 + s.z1) / 2, x - (s.x0 + s.x1) / 2), sp = rand(2, 7), sz = rand(0.6, 1.8); rubbleChunk(x, s.y0 + rand(1, 3), z, Math.cos(a) * sp, rand(1, 4), Math.sin(a) * sp, sz * 1.3, sz * 0.8, sz, Math.random() < 0.3 ? pick(RUBBLE_COLS) : s.col); } });
}
// explosions shove everything nearby
function rubbleBlast(x, y, z, R, power) {
  if (!RUB.active) return;
  for (const c of RUB.list) {
    if (!c.on) continue;
    const dx = c.x - x, dy = c.y - y, dz = c.z - z, d = Math.hypot(dx, dy, dz); if (d > R) continue;
    const m = Math.cbrt(c.sx * c.sy * c.sz), k = (1 - d / R) * 16 * power / Math.max(0.6, m) / Math.max(1, d);
    c.vx += dx * k; c.vz += dz * k; c.vy += (Math.abs(dy) + 2) * k * 0.6 + 2 * (1 - d / R); c.wx += rand(-6, 6); c.wz += rand(-6, 6); c.sleep = 0;
  }
}
function rubbleHalfY(c) {   // how far the rotated box reaches below its centre
  _rum.makeRotationFromQuaternion(c.q); const e = _rum.elements;
  return (Math.abs(e[1]) * c.sx + Math.abs(e[5]) * c.sy + Math.abs(e[9]) * c.sz) / 2;
}
function updateRubble(dt) {
  if (!RUB.mesh || !RUB.active) return;
  const G2 = RUB.grid; G2.clear();
  let moved = false;
  for (const c of RUB.list) {
    if (!c.on) continue;
    c.t += dt;
    const key = ((c.x / 8) | 0) * 4096 + ((c.z / 8) | 0); let cell = G2.get(key); if (!cell) G2.set(key, cell = []); cell.push(c);
    if (c.sleep > 0.6) continue;
    moved = true;
    c.vy -= 20 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    _ruq2.setFromEuler(_rue.set(c.wx * dt, c.wy * dt, c.wz * dt)); c.q.multiply(_ruq2);
    const r = Math.max(c.sx, c.sz) * 0.45;
    // buildings: land on a roof, or bounce off a wall
    W.boxGrid.query(c.x - r, c.z - r, c.x + r, c.z + r, _rub);
    for (const b of _rub) {
      if (c.x < b.x0 - r || c.x > b.x1 + r || c.z < b.z0 - r || c.z > b.z1 + r || c.y > b.h + 0.5) continue;
      if (c.y > b.h - 0.8 && c.vy <= 0) { c.y = b.h + rubbleHalfY(c); c.vy = -c.vy * 0.2; c.vx *= 0.6; c.vz *= 0.6; continue; }
      const l = c.x - (b.x0 - r), rr = (b.x1 + r) - c.x, t = c.z - (b.z0 - r), bt = (b.z1 + r) - c.z, m = Math.min(l, rr, t, bt);
      if (m === l) { c.x = b.x0 - r; c.vx = -Math.abs(c.vx) * 0.3; } else if (m === rr) { c.x = b.x1 + r; c.vx = Math.abs(c.vx) * 0.3; } else if (m === t) { c.z = b.z0 - r; c.vz = -Math.abs(c.vz) * 0.3; } else { c.z = b.z1 + r; c.vz = Math.abs(c.vz) * 0.3; }
    }
    // the ground: bounce, scrape to a stop, then go to sleep
    const ey = rubbleHalfY(c), gh = heightAt(c.x, c.z) + ey;
    if (c.y < gh) {
      const imp = -c.vy; c.y = gh;
      c.vy = imp > 2.5 ? Math.min(5, imp * 0.22) : 0; const f = Math.exp(-6 * dt); c.vx *= f; c.vz *= f; c.wx *= 0.7; c.wy *= 0.7; c.wz *= 0.7;
      if (imp > 7 && Math.cbrt(c.sx * c.sy * c.sz) > 0.8 && (c.x - camera.position.x) ** 2 + (c.z - camera.position.z) ** 2 < 3600) SFX.play('thud', clamp(imp / 25, 0.1, 0.6), SFX.vary(0.15));
      if (Math.hypot(c.vx, c.vz) < 0.35 && Math.abs(c.vy) < 0.1) c.sleep += dt; else c.sleep = 0;
    } else c.sleep = 0;
    if (c.t > 120) { c.on = false; RUB.active--; RUB.mesh.setMatrixAt(c.i, _zeroM); continue; }
    _rup.set(c.x, c.y, c.z); _rus.set(c.sx, c.sy, c.sz); _rum.compose(_rup, c.q, _rus); RUB.mesh.setMatrixAt(c.i, _rum);
  }
  // vehicles plough through chunks; big ones falling on a car (or a person) hurt
  for (const v of VEH.list) {
    if (v.remote || v.sunk) continue;
    const cx = (v.x / 8) | 0, cz = (v.z / 8) | 0, fx = Math.sin(v.h), fz = Math.cos(v.h), dm = v.model.dims || {}, top = v.y + (dm.H || 1.5), hw = (dm.W || 1.9) / 2;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const cell = G2.get((cx + i) * 4096 + cz + j); if (!cell) continue;
      for (const c of cell) {
        const dx = c.x - v.x, dz = c.z - v.z, lf = dx * fx + dz * fz, lr = dx * fz - dz * fx, r = Math.max(c.sx, c.sz) * 0.4;
        if (lf < v.rear - r || lf > v.front + r || Math.abs(lr) > hw + r || c.y - c.sy * 0.5 > top || c.y + c.sy * 0.5 < v.y - 0.2) continue;
        const mc = clamp(c.sx * c.sy * c.sz * 320, 20, 2500);   // broken rubble: lighter than solid concrete
        if (c.vy < -6 && c.y > top - 0.6 && mc > 400) {   // landed on the car from above
          damageVehicle(v, Math.min(60, -c.vy * mc / 900), null); deformAt(v, c.x, top, c.z, Math.min(30, -c.vy * 1.5)); if (v === G.player) { G.shake = Math.max(G.shake, 0.6); SFX.crash(-c.vy * 0.8); }
          c.vy = 3; c.vx += dx * 0.8; c.vz += dz * 0.8; c.sleep = 0; continue;
        }
        // pushed aside: an impulse along the line from the car to the chunk
        const l = Math.hypot(dx, dz) || 1, nx = dx / l, nz = dz / l, rel = (v.vx - c.vx) * nx + (v.vz - c.vz) * nz;
        if (rel <= 0.2) continue;
        const j = 1.25 * rel / (1 / mc + 1 / v.mass), dv = Math.min(j / v.mass, 4.5);   // a big lump slows you, but it crumbles and gives way rather than stopping you dead
        c.vx += nx * j / mc; c.vz += nz * j / mc; c.vy += Math.min(6, rel * 0.25); c.wx += rand(-5, 5); c.wz += rand(-5, 5); c.sleep = 0;
        v.vx -= nx * dv; v.vz -= nz * dv;
        if (dv > 3) { damageVehicle(v, (dv - 3) * 4, null); if (v === G.player) SFX.crash(dv * 2.5); }
        moved = true;
      }
    }
  }
  // people under falling chunks
  for (const c of RUB.list) {
    if (!c.on || c.sleep > 0.6 || c.vy > -5 || c.hurt > 2) continue;
    const mc = c.sx * c.sy * c.sz; if (mc < 0.4) continue;
    for (const p of PED.list) {
      if (!p.active || p.remote || p.dead || p.rag) continue;
      if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 < 0.9 && c.y > p.y && c.y < p.y + 2.4) { c.hurt++; if (p.isHero) { HERO.hurtT = 0; heroDamage(Math.min(70, -c.vy * mc * 4), 'crush'); } else killPed(p, false); toRagdoll(p, c.vx * 0.3, c.vz * 0.3, 3, null); }
    }
  }
  if (moved) RUB.mesh.instanceMatrix.needsUpdate = true;
}
