// =====================================================================
//  WEAPONS: hitscan guns, rockets, lock-on, police return fire, ammo pickups
// =====================================================================
const WEAPONS = [
  { id: 'fists', name: 'Fists', short: 'FISTS' },
  { id: 'pistol', name: 'Pistol', short: 'PISTOL', dmg: 34, range: 60, rate: 0.26, mag: 12, reload: 1.1, spread: 0.018, pellets: 1, ammo0: 96, force: 5, two: false },
  { id: 'smg', name: 'SMG', short: 'SMG', dmg: 15, range: 48, rate: 0.075, mag: 30, reload: 1.5, spread: 0.045, pellets: 1, ammo0: 240, force: 3.5, two: true },
  { id: 'shotgun', name: 'Shotgun', short: 'SHOTGUN', dmg: 12, range: 26, rate: 0.85, mag: 6, reload: 2.2, spread: 0.11, pellets: 9, ammo0: 36, force: 4.5, two: true },
  { id: 'rpg', name: 'Rocket launcher', short: 'ROCKET', dmg: 0, range: 160, rate: 1.4, mag: 1, reload: 2.4, spread: 0, pellets: 0, ammo0: 6, rocket: true }
];
const ARMS = { cur: 1, mag: [0, 12, 30, 6, 1], ammo: [0, 84, 210, 30, 5], cool: 0, reloadT: 0, trigger: false, mouse: { x: 0, y: 0, down: false }, mouseAimT: 0, lastShot: -9, lastHeat: -9, aimYaw: 0, target: null, rockets: [], pickups: [], gun: null, copGuns: [], tracer: null };
const isPlayerSrc = s => !!s && (s === G.player || s === 'hero' || s.player === true);
const gunsOn = () => settings.guns !== 'off';
function resetArms() { for (let i = 1; i < WEAPONS.length; i++) { ARMS.mag[i] = WEAPONS[i].mag; ARMS.ammo[i] = WEAPONS[i].ammo0 - WEAPONS[i].mag; } ARMS.reloadT = 0; ARMS.cool = 0; }
function selectWeapon(i) {
  if (!gunsOn()) i = 0;
  i = ((i % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
  if (i === ARMS.cur) return;
  ARMS.cur = i; ARMS.reloadT = 0; ARMS.cool = 0.25; SFX.click(0.6);
}
function cycleWeapon(d) { let i = ARMS.cur; for (let k = 0; k < WEAPONS.length; k++) { i = (i + d + WEAPONS.length) % WEAPONS.length; if (i === 0 || ARMS.mag[i] + ARMS.ammo[i] > 0) break; } selectWeapon(i); }
function startReload() { const i = ARMS.cur, w = WEAPONS[i]; if (!i || ARMS.reloadT > 0 || ARMS.mag[i] >= w.mag || ARMS.ammo[i] <= 0) return; ARMS.reloadT = w.reload; SFX.reload(); }

// ---------- visuals: gun models, tracers ----------
function gunGeo(id) {
  const P = [], dark = C('#1d1f23'), mid = C('#3a3d42');
  if (id === 'pistol') { P.push(boxG(0.045, 0.06, 0.2, 0, 0, 0.06, dark), boxG(0.04, 0.11, 0.05, 0, -0.06, -0.01, mid)); }
  else if (id === 'smg') { P.push(boxG(0.055, 0.08, 0.36, 0, 0, 0.1, dark), boxG(0.04, 0.14, 0.05, 0, -0.08, 0.06, mid), boxG(0.03, 0.03, 0.1, 0, 0.01, 0.31, mid)); }
  else if (id === 'shotgun') { P.push(boxG(0.05, 0.06, 0.78, 0, 0.01, 0.22, dark), boxG(0.06, 0.1, 0.24, 0, -0.03, -0.12, C('#5a3d24')), boxG(0.045, 0.04, 0.3, 0, -0.03, 0.3, mid)); }
  else { const t = new THREE.CylinderGeometry(0.075, 0.075, 1.15, 10); t.rotateX(Math.PI / 2); t.translate(0, 0, 0.1); P.push(colorize(t, C('#4d5a3a'))); P.push(boxG(0.05, 0.12, 0.08, 0, -0.1, 0.05, dark)); const w = new THREE.ConeGeometry(0.07, 0.22, 8); w.rotateX(Math.PI / 2); w.translate(0, 0, 0.78); P.push(colorize(w, C('#6b7a4d'))); }
  return mergeGeos(P);
}
function initWeapons() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.6 });
  const g = new THREE.Group(); ARMS.models = {};
  for (const w of WEAPONS.slice(1)) { const m = new THREE.Mesh(gunGeo(w.id), mat); m.visible = false; g.add(m); ARMS.models[w.id] = m; }
  g.visible = false; scene.add(g); ARMS.gun = g;
  const pg = gunGeo('pistol');
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(pg, mat); m.visible = false; scene.add(m); ARMS.copGuns.push(m); }
  const N = 96, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  lines.frustumCulled = false; lines.renderOrder = 8; scene.add(lines);
  ARMS.tracer = { lines, pos, col, life: new Float32Array(N), base: new Float32Array(N * 3), n: N, i: 0 };
  const rg = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8); rg.rotateX(Math.PI / 2);
  ARMS.rocketGeo = rg; ARMS.rocketMat = new THREE.MeshStandardMaterial({ color: C('#56633f'), roughness: 0.6 });
  const bg = new THREE.BoxGeometry(0.7, 0.42, 0.45); colorize(bg, C('#2f6b3a'));
  ARMS.pickMesh = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: C('#1d6b2c'), emissiveIntensity: 0.6 }), 40);
  ARMS.pickMesh.frustumCulled = false; ARMS.pickMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < 40; i++) ARMS.pickMesh.setMatrixAt(i, _zeroM); scene.add(ARMS.pickMesh);
}
function tracer(x0, y0, z0, x1, y1, z1, col, life) {
  const T = ARMS.tracer, i = T.i++ % T.n, j = i * 6;
  T.pos[j] = x0; T.pos[j + 1] = y0; T.pos[j + 2] = z0; T.pos[j + 3] = x1; T.pos[j + 4] = y1; T.pos[j + 5] = z1;
  T.base[i * 3] = col.r; T.base[i * 3 + 1] = col.g; T.base[i * 3 + 2] = col.b; T.life[i] = life || 0.07;
}
function updateTracers(dt) {
  const T = ARMS.tracer;
  for (let i = 0; i < T.n; i++) {
    const l = T.life[i] = Math.max(0, T.life[i] - dt), k = Math.min(1, l / 0.07), j = i * 6;
    const r = T.base[i * 3] * k, g = T.base[i * 3 + 1] * k, b = T.base[i * 3 + 2] * k * 0.6;
    T.col[j] = r * 0.4; T.col[j + 1] = g * 0.4; T.col[j + 2] = b * 0.4; T.col[j + 3] = r; T.col[j + 4] = g; T.col[j + 5] = b;
  }
  T.lines.geometry.attributes.position.needsUpdate = true; T.lines.geometry.attributes.color.needsUpdate = true;
}
const TRACE_COL = new THREE.Color(1.6, 1.25, 0.6), COP_TRACE = new THREE.Color(1.4, 0.9, 0.5);

// ---------- ray casting ----------
const _rb = [], _rp = [];
function rayAABB(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = 1e9;
  const ax = [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]];
  for (const [o, d, a, b] of ax) {
    if (Math.abs(d) < 1e-9) { if (o < a || o > b) return -1; continue; }
    let t1 = (a - o) / d, t2 = (b - o) / d; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1;
  }
  return tmin;
}
// returns {t, type, obj, x, y, z} for the first thing along the ray
function rayCast(ox, oy, oz, dx, dy, dz, range, ignoreV, ignoreHero) {
  let best = range, type = 'none', obj = null;
  const ex = ox + dx * range, ez = oz + dz * range;
  W.boxGrid.query(Math.min(ox, ex) - 1, Math.min(oz, ez) - 1, Math.max(ox, ex) + 1, Math.max(oz, ez) + 1, _rb);
  for (const b of _rb) { const t = rayAABB(ox, oy, oz, dx, dy, dz, b.x0, -2, b.z0, b.x1, b.h, b.z1); if (t >= 0 && t < best) { best = t; type = 'world'; obj = b; } }
  if (dy < -1e-4) { let t = (heightAt(ox, oz) - oy) / dy; if (t > 0) { const g = heightAt(ox + dx * t, oz + dz * t); t = (g - oy) / dy; if (t > 0 && t < best) { best = t; type = 'ground'; obj = null; } } }
  for (const v of VEH.list) {
    if (v === ignoreV) continue;
    const wx = v.x - ox, wz = v.z - oz, along = wx * dx + wz * dz; if (along < -4 || along > best + 4) continue;
    if (Math.abs(wx * dz - wz * dx) > 4) continue;
    const c = Math.cos(v.h), s = Math.sin(v.h), lox = (ox - v.x) * c - (oz - v.z) * s, loz = (ox - v.x) * s + (oz - v.z) * c, ldx = dx * c - dz * s, ldz = dx * s + dz * c;
    const top = v.flipped || v.tumble ? v.y + v.halfW * 2 : v.y + v.height * 0.9;
    const t = rayAABB(lox, oy, loz, ldx, dy, ldz, -v.halfW, v.y + 0.15, v.rear, v.halfW, top, v.front);
    if (t >= 0 && t < best) { best = t; type = 'car'; obj = v; }
  }
  for (const p of PED.list) {
    if (!p.active || (p.isHero && ignoreHero)) continue;
    if (p.rag) {
      const P = p.rag.pos, cx = P[24] - ox, cz = P[26] - oz; if (Math.abs(cx * dz - cz * dx) > 2.5) continue;
      for (let i = 0; i < p.rag.n; i++) { const fx = ox - P[i * 3], fy = oy - P[i * 3 + 1], fz = oz - P[i * 3 + 2], b2 = fx * dx + fy * dy + fz * dz, cc = fx * fx + fy * fy + fz * fz - 0.06, disc = b2 * b2 - cc; if (disc < 0) continue; const t = -b2 - Math.sqrt(disc); if (t > 0 && t < best) { best = t; type = 'ped'; obj = p; } }
    } else {
      const fx = ox - p.x, fz = oz - p.z, a = dx * dx + dz * dz; if (a < 1e-6) continue;
      const b2 = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - 0.1, disc = b2 * b2 - 4 * a * cc; if (disc < 0) continue;
      const t = (-b2 - Math.sqrt(disc)) / (2 * a); if (t < 0 || t > best) continue;
      const y = oy + dy * t; if (y < p.y || y > p.y + 1.85 * p.scale) continue;
      best = t; type = 'ped'; obj = p;
    }
  }
  W.propGrid.query(Math.min(ox, ex) - 1, Math.min(oz, ez) - 1, Math.max(ox, ex) + 1, Math.max(oz, ez) + 1, _rp);
  for (const pr of _rp) {
    if (pr.st !== 0 || pr.type === 'lamp' || pr.type === 'umbrella') continue;
    const fx = ox - pr.x, fz = oz - pr.z, a = dx * dx + dz * dz; if (a < 1e-6) continue;
    const b2 = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - 0.16, disc = b2 * b2 - 4 * a * cc; if (disc < 0) continue;
    const t = (-b2 - Math.sqrt(disc)) / (2 * a); if (t < 0 || t > best) continue;
    const y = oy + dy * t; if (y < pr.y || y > pr.y + 1.7) continue;
    best = t; type = 'prop'; obj = pr;
  }
  if (HELI.active && !HELI.down) {   // the police helicopter is a 2.8 m sphere you can hit
    const fx = ox - HELI.x, fy = oy - (HELI.y - 0.5), fz = oz - HELI.z, b2 = fx * dx + fy * dy + fz * dz, cc = fx * fx + fy * fy + fz * fz - 7.8, disc = b2 * b2 - cc;
    if (disc >= 0) { const t = -b2 - Math.sqrt(disc); if (t > 0 && t < best) { best = t; type = 'heli'; obj = HELI; } }
  }
  return { t: best, type, obj, x: ox + dx * best, y: oy + dy * best, z: oz + dz * best };
}

// ---------- hits ----------
function shotHitPed(q, dx, dy, dz, dmg, force, hy, byPlayer) {
  if (q.remote) { if (byPlayer) netHit(q.remote, dmg * (hy > q.y + 1.5 * q.scale ? 2 : 1)); if (settings.gore !== 'off') bloodBurst(q.x, Math.min(hy, q.y + 1.7), q.z, dx * 2, dz * 2, 4, 0.5); return; }
  if (q.isHero) { heroDamage(dmg, 'gun'); return; }
  const head = !q.rag && hy > q.y + 1.5 * q.scale;
  q.hp = (q.hp == null ? (q.cop ? 75 : 40) : q.hp) - dmg * (head ? 3 : 1);
  if (!q.rag) toRagdoll(q, dx * force, dz * force, 3.4, null);
  else { const R = q.rag; R.asleep = false; R.still = 0; for (let i = 0; i < R.n; i++) { const w = 1 / (1 + Math.hypot(R.pos[i * 3] - q.x, R.pos[i * 3 + 2] - q.z)); R.prev[i * 3] -= dx * force * 0.4 * w * RSTEP; R.prev[i * 3 + 2] -= dz * force * 0.4 * w * RSTEP; } }
  const P = q.rag.pos, bx = head ? P[0] : P[3 * 8], by = head ? P[1] : P[25] + 0.2, bz = head ? P[2] : P[26];
  if (settings.gore !== 'off') { bloodBurst(bx, by, bz, dx * 4, dz * 4, head ? 14 : 7, head ? 1.1 : 0.8); if (settings.gore === 'high' && Math.random() < 0.25) DECALS.splat(bx + dx * 1.2, bz + dz * 1.2, rand(0.3, 0.6), 0); }
  if (q.hp <= 0 && !q.dead) {
    killPed(q, byPlayer);
    if (head && settings.gore === 'high' && dmg * 3 >= 60) detach(q, 'head');
    if (byPlayer && q.cop) { feed('Officer down', 'red'); dropPickup(q.x, q.z); }
  } else if (byPlayer) { addHeat(q.cop ? 0.6 : 0.3, q.cop ? 2 : 1, true); }
}
function shotHitCar(v, x, y, z, dx, dz, dmg, byPlayer) {
  if (v.remote) { if (byPlayer) netHit(v.remote, dmg); sparks(x, y, z, 3); return; }
  if (byPlayer) v.lastPlayerHit = GT;
  damageVehicle(v, dmg * 0.5, byPlayer ? (G.player || 'hero') : null);
  const c = Math.cos(v.h), s = Math.sin(v.h), lx = (x - v.x) * c - (z - v.z) * s, lz = (x - v.x) * s + (z - v.z) * c, ly = y - v.y;
  deformLocal(v, lx, ly, lz, dx * c - dz * s, 0, dx * s + dz * c, 4.6);
  sparks(x, y, z, 3);
  if (ly > v.height * 0.55 && !v.glassBroken && Math.random() < 0.22) breakGlass(v);
  if (v.ai && ly > v.height * 0.5 && Math.abs(lz - (v.front + v.rear) / 2) < 1.4 && Math.random() < (WEAPONS[ARMS.cur].pellets > 1 ? 0.12 : 0.22) && byPlayer) {
    v.ai = null; v.kind = 'parked'; v.abandoned = true; v.abandonT = GT;
    if (settings.gore !== 'off') bloodBurst(x, y, z, dx * 2, dz * 2, 6, 0.6);
    if (v.police) { feed('Shot the cruiser’s driver', 'red'); addHeat(1, 2, true); G.stats.cops++; } else { feed('Driver down'); addHeat(0.6, 1, true); }
  } else if (byPlayer) {
    if (v.police) addHeat(0.35, 2, true); else if (v.ai) { v.ai.angry = 6; addHeat(0.08, 0, false); }
  }
}
function applyShot(o, d, w, byPlayer, ignoreV, ignoreHero) {
  const h = rayCast(o.x, o.y, o.z, d.x, d.y, d.z, w.range, ignoreV, ignoreHero);
  tracer(o.x, o.y, o.z, h.x, h.y, h.z, byPlayer ? TRACE_COL : COP_TRACE);
  if (byPlayer) netShot(o.x, o.y, o.z, h.x, h.y, h.z, w);
  storeShot(h, byPlayer);
  if (h.type === 'ped') shotHitPed(h.obj, d.x, d.y, d.z, w.dmg, w.force || 4, h.y, byPlayer);
  else if (h.type === 'car') shotHitCar(h.obj, h.x, h.y, h.z, d.x, d.z, w.dmg, byPlayer);
  else if (h.type === 'heli') { heliDamage(w.dmg * (w.pellets > 1 ? 0.8 : 1), byPlayer); sparks(h.x, h.y, h.z, 4); }
  else if (h.type === 'prop') { const pr = h.obj; knockProp(pr, { vx: d.x * 8, vz: d.z * 8, kind: byPlayer ? 'player' : 'x', player: byPlayer }, 8); }
  else if (h.type !== 'none') { sparks(h.x, h.y, h.z, 2); FX.smoke.emit(h.x, h.y, h.z, rand(-0.4, 0.4), rand(0.4, 1), rand(-0.4, 0.4), 0.6, 0.35, COL.dust, 0.5, 0, 1, 0.6, 4); }
  return h;
}

// ---------- aiming ----------
function muzzle() {
  const P = G.player;
  if (!G.onFoot && P) { const c = Math.cos(P.h), s = Math.sin(P.h); return { x: P.x + c * (P.halfW - 0.2), y: P.y + P.height * 0.82, z: P.z - s * (P.halfW - 0.2) }; }
  const p = HERO.p, Q = p.pts, fx = Math.sin(ARMS.aimYaw), fz = Math.cos(ARMS.aimYaw);
  if (p.rag) return { x: p.x, y: p.y + 1.4, z: p.z };
  if (WEAPONS[ARMS.cur].rocket) return { x: Q[9] + fx * 0.8, y: Q[10] + 0.12, z: Q[11] + fz * 0.8 };
  return { x: Q[21] + fx * 0.25, y: Q[22] + 0.04, z: Q[23] + fz * 0.25 };
}
function validTarget(t, o, range) {
  if (!t) return false;
  if (t.heli) return HELI.active && !HELI.down && Math.hypot(HELI.x - o.x, HELI.y - o.y, HELI.z - o.z) < range * 1.4;
  if (t.isPed) { const p = t.p; if (!p.active || p.dead || p.isHero || (p.remote && settings.pvp === 'off')) return false; const x = p.rag ? p.rag.pos[24] : p.x, z = p.rag ? p.rag.pos[26] : p.z; return Math.hypot(x - o.x, z - o.z) < range; }
  const v = t.v; return VEH.list.includes(v) && !v.wrecked && !v.sunk && v !== G.player && Math.hypot(v.x - o.x, v.z - o.z) < range;
}
function targetPoint(t) {
  if (t.heli) return { x: HELI.x, y: HELI.y - 0.6, z: HELI.z };
  if (t.isPed) { const p = t.p; if (p.rag) return { x: p.rag.pos[24], y: p.rag.pos[25] + 0.1, z: p.rag.pos[26] }; return { x: p.x, y: p.y + 1.15 * p.scale, z: p.z }; }
  const v = t.v; return { x: v.x, y: v.y + 0.8, z: v.z };
}
function pickTarget(o, facing, range, cone) {
  let best = null, bs = 1e9;
  const consider = (x, z, pri, t) => {
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz); if (d > range || d < 0.5) return;
    const ang = Math.abs(wrapA(Math.atan2(dx, dz) - facing)); if (ang > cone) return;
    const sc = (d + 4) * (1 + ang * 1.6) / pri; if (sc >= bs) return;
    if (segmentBlocked(o.x, o.z, x, z)) return;
    bs = sc; best = t;
  };
  for (const p of PED.list) { if (!p.active || p.isHero || p.dead || (p.clerk && (p.clerk.rob > 0 || p.clerk.cowerT > GT))) continue; const x = p.rag ? p.rag.pos[24] : p.x, z = p.rag ? p.rag.pos[26] : p.z; if (p.remote && (settings.pvp === 'off' || noFriendHurt(p.remote))) continue; consider(x, z, (p.remote ? 4 : p.cop ? (wanted.stars ? 6 : 2) : 1.4) * (p.rag ? 0.4 : 1), { isPed: true, p }); }
  for (const v of VEH.list) { if (v === G.player || v.wrecked || v.sunk) continue; consider(v.x, v.z, v.police && wanted.stars ? 3 : 0.7, { isPed: false, v }); }
  if (HELI.active && !HELI.down && !best) { const dx = HELI.x - o.x, dz = HELI.z - o.z, d3 = Math.hypot(dx, HELI.y - o.y, dz); if (d3 < range * 1.4 && Math.abs(wrapA(Math.atan2(dx, dz) - facing)) < cone + 0.6) best = { isPed: false, heli: true }; }
  return best;
}
function mouseRayPoint(ignoreV) {
  const r = renderer.domElement.getBoundingClientRect();
  _v1.set((ARMS.mouse.x - r.left) / r.width * 2 - 1, -((ARMS.mouse.y - r.top) / r.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  const o = camera.position, h = rayCast(o.x, o.y, o.z, _v1.x, _v1.y, _v1.z, 320, ignoreV, true);
  return { x: h.x, y: h.y, z: h.z };
}

// ---------- firing ----------
function fireWeapon(aimPt) {
  const i = ARMS.cur, w = WEAPONS[i], byCar = !G.onFoot;
  const o = muzzle();
  let dx = aimPt.x - o.x, dy = aimPt.y - o.y, dz = aimPt.z - o.z; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
  ARMS.mag[i]--; ARMS.cool = w.rate; ARMS.lastShot = GT;
  G.flashes.push({ x: o.x + dx * 0.2, y: o.y, z: o.z + dz * 0.2, t: 0.06, s: w.rocket ? 5 : 2.6 });
  for (let k = 0; k < 4; k++) FX.fire.emit(o.x + dx * 0.25, o.y, o.z + dz * 0.25, dx * rand(3, 7) + rand(-1, 1), dy * 4 + rand(-0.5, 0.8), dz * rand(3, 7) + rand(-1, 1), rand(0.04, 0.09), rand(0.12, 0.22), COL.fireHot, 1, 0, 3, 0, 0);
  SFX.gun(w.id, 1);
  if (w.rocket) { launchRocket(o, dx, dy, dz, byCar ? G.player : 'hero'); }
  else for (let k = 0; k < w.pellets; k++) {
    const sp = w.spread * (byCar ? 1.6 : 1) * (G.onFoot && HERO.p && Math.abs(HERO.p.sp) > 3 ? 1.8 : 1);
    const d = { x: dx + rand(-sp, sp), y: dy + rand(-sp, sp) * 0.6, z: dz + rand(-sp, sp) }; const l = Math.hypot(d.x, d.y, d.z); d.x /= l; d.y /= l; d.z /= l;
    applyShot(o, d, w, true, G.player, true);
  }
  if (GT - ARMS.lastHeat > 1.2) { ARMS.lastHeat = GT; addHeat(0.18, 0, false); }
  const F = PF(); for (const p of PED.list) if (p.active && !p.rag && !p.cop && !p.isHero && (p.x - F.x) ** 2 + (p.z - F.z) ** 2 < 1600) panic(p, F.x, F.z, rand(5, 8));
  if (ARMS.mag[i] <= 0) startReload();
}
function launchRocket(o, dx, dy, dz, src) {
  const m = new THREE.Mesh(ARMS.rocketGeo, ARMS.rocketMat); m.position.set(o.x, o.y, o.z); m.lookAt(o.x + dx, o.y + dy, o.z + dz); scene.add(m);
  ARMS.rockets.push({ m, x: o.x, y: o.y, z: o.z, vx: dx * 62, vy: dy * 62, vz: dz * 62, t: 0, src });
}
function updateRockets(dt) {
  for (let i = ARMS.rockets.length - 1; i >= 0; i--) {
    const r = ARMS.rockets[i]; r.t += dt;
    if (r.homing && homingStep(r, dt)) continue;
    const spd = Math.hypot(r.vx, r.vy, r.vz) || 1, step = spd * dt;
    const h = rayCast(r.x, r.y, r.z, r.vx / spd, r.vy / spd, r.vz / spd, step, r.src === 'hero' ? null : r.src, r.src === 'hero' && r.t < 0.3);
    if (r.homing && h.type === 'heli') { homingHit(r); continue; }
    let boom = h.type !== 'none' || r.t > (r.homing ? 7 : 3) || r.y < WATER_BED;
    const nx = boom && h.type !== 'none' ? h.x : r.x + r.vx * dt, ny = boom && h.type !== 'none' ? h.y : r.y + r.vy * dt, nz = boom && h.type !== 'none' ? h.z : r.z + r.vz * dt;
    r.x = nx; r.y = ny; r.z = nz; if (!r.homing) r.vy -= 1.5 * dt; r.m.position.set(nx, ny, nz); if (r.homing) r.m.lookAt(nx + r.vx, ny + r.vy, nz + r.vz);
    FX.smoke.emit(nx, ny, nz, rand(-0.3, 0.3), rand(0.2, 0.6), rand(-0.3, 0.3), rand(0.8, 1.4), rand(0.35, 0.6), COL.smoke, 0.5, -0.3, 0.6, 1.1, 4);
    FX.fire.emit(nx, ny, nz, -r.vx * 0.05, -r.vy * 0.05, -r.vz * 0.05, 0.08, 0.35, COL.fireHot, 1, 0, 1, -1, 0);
    if (boom) { scene.remove(r.m); ARMS.rockets.splice(i, 1); if (W.waters && waterAt(nx, nz) && ny < 0.4) splash(nx, nz, 12); else explode(nx, Math.max(ny, heightAt(nx, nz) + 0.3), nz, 1.35, r.src); }
  }
}

// ---------- police return fire ----------
function copShoot(ox, oy, oz, pedShooter) {
  if (!gunsOn() || G.down) return;
  const T = PF(); if (!T) return;
  const tx = T.x, ty = T.y + (G.onFoot ? 1.2 : 0.9), tz = T.z, d = Math.hypot(tx - ox, tz - oz);
  const hitChance = clamp(0.72 - d / 55 - T.speed * 0.025, 0.1, 0.68);
  const hit = Math.random() < hitChance;
  const ex = hit ? tx : tx + rand(-2.5, 2.5), ey = hit ? ty : ty + rand(-0.6, 1.2), ez = hit ? tz : tz + rand(-2.5, 2.5);
  tracer(ox, oy, oz, ex, ey, ez, COP_TRACE);
  G.flashes.push({ x: ox, y: oy, z: oz, t: 0.05, s: 2.2 });
  SFX.gun('pistol', clamp(1 - Math.hypot(ox - camera.position.x, oz - camera.position.z) / 110, 0.08, 0.85));
  if (!hit) { sparks(ex, Math.max(ey, heightAt(ex, ez) + 0.05), ez, 1); return; }
  if (G.onFoot) { heroDamage(rand(5, 9), 'gun'); if (settings.gore !== 'off') bloodBurst(tx, ty, tz, 0, 0, 3, 0.5); }
  else if (G.plane) { damagePlane(G.plane, rand(1.5, 3), null); sparks(tx, ty, tz, 2); }
  else if (G.player) { const v = G.player; damageVehicle(v, rand(1.5, 3), null); sparks(tx, ty, tz, 2); if (!v.glassBroken && Math.random() < 0.05) breakGlass(v); }
}

// ---------- pickups ----------
function setupPickups() {
  ARMS.pickups = [];
  const rng = mulberry32(W.id === 'neon' ? 71 : W.id === 'sand' ? 72 : 73);
  for (let k = 0; k < 12 && W.loops.length; k++) {
    const L = W.loops[(rng() * W.loops.length) | 0], c = (rng() * 4) | 0, c2 = (c + 1) % 4, f = 0.3 + rng() * 0.4;
    ARMS.pickups.push({ x: lerp(L.pts[c][0], L.pts[c2][0], f), z: lerp(L.pts[c][1], L.pts[c2][1], f), t: 0, perm: true });
  }
}
function dropPickup(x, z) { if (ARMS.pickups.filter(p => !p.perm).length < 8) ARMS.pickups.push({ x, z, t: 0, perm: false, life: 60 }); }
function updatePickups(dt) {
  const F = PF(), M = ARMS.pickMesh;
  for (let k = ARMS.pickups.length - 1; k >= 0; k--) {
    const p = ARMS.pickups[k];
    if (p.t > 0) p.t -= dt;
    if (!p.perm) { p.life -= dt; if (p.life <= 0) { ARMS.pickups.splice(k, 1); continue; } }
    if (p.t <= 0 && F && gunsOn() && Math.hypot(F.x - p.x, F.z - p.z) < (G.onFoot ? 1.6 : 3.2)) {
      for (let i = 1; i < WEAPONS.length; i++) ARMS.ammo[i] = Math.min(WEAPONS[i].ammo0 * 2, ARMS.ammo[i] + Math.ceil(WEAPONS[i].ammo0 * 0.5));
      SFX.reload(); feed('Picked up ammo', 'green');
      if (p.perm) p.t = 60; else { ARMS.pickups.splice(k, 1); continue; }
    }
  }
  for (let k = 0; k < 40; k++) {
    const p = ARMS.pickups[k];
    if (!p || p.t > 0 || !gunsOn()) { M.setMatrixAt(k, _zeroM); continue; }
    _v1.set(p.x, heightAt(p.x, p.z) + 0.55 + Math.sin(GT * 3 + k) * 0.1, p.z); _q.setFromAxisAngle(UP, GT * 1.8 + k); _m.compose(_v1, _q, _s); M.setMatrixAt(k, _m);
  }
  M.instanceMatrix.needsUpdate = true;
}

// ---------- per-frame ----------
function aimPose(P, yaw, two, rocket) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const sx = P[9], sy = P[10], sz = P[11], lx = P[6], ly = P[7], lz = P[8];
  if (rocket) {
    P[21] = sx + fx * 0.2; P[22] = sy - 0.05; P[23] = sz + fz * 0.2; P[15] = sx + fx * 0.05; P[16] = sy - 0.22; P[17] = sz + fz * 0.05;
    P[18] = sx + fx * 0.55 + (lx - sx) * 0.15; P[19] = sy - 0.06; P[20] = sz + fz * 0.55 + (lz - sz) * 0.15; P[12] = lx + fx * 0.3; P[13] = ly - 0.2; P[14] = lz + fz * 0.3;
    return;
  }
  P[15] = sx + fx * 0.28; P[16] = sy - 0.05; P[17] = sz + fz * 0.28; P[21] = sx + fx * 0.56; P[22] = sy - 0.03; P[23] = sz + fz * 0.56;
  if (two) { P[18] = sx + fx * 0.44 + (lx - sx) * 0.12; P[19] = sy - 0.07; P[20] = sz + fz * 0.44 + (lz - sz) * 0.12; P[12] = lx + fx * 0.25 + (sx - lx) * 0.3; P[13] = ly - 0.14; P[14] = lz + fz * 0.25 + (sz - lz) * 0.3; }
}
function updateWeapons(dt) {
  ARMS.cool -= dt; ARMS.mouseAimT -= dt;
  if (!gunsOn() && ARMS.cur) ARMS.cur = 0;
  const i = ARMS.cur, w = WEAPONS[i];
  if (ARMS.reloadT > 0) { ARMS.reloadT -= dt; if (ARMS.reloadT <= 0) { const need = w.mag - ARMS.mag[i], got = Math.min(need, ARMS.ammo[i]); ARMS.mag[i] += got; ARMS.ammo[i] -= got; } }
  const live = !G.down && !APP.paused && (G.onFoot ? HERO.p && HERO.p.active && !HERO.p.rag && !HERO.swim : !!G.player && !G.player.tank) && !weaponsBanned() && !PUG.held;
  // lock-on target for keyboard / touch / gamepad
  const o = live && i ? muzzle() : null;
  const facing = G.onFoot ? (HERO.p ? HERO.p.h : 0) : (G.player ? G.player.h : 0);
  if (o && (ARMS.trigger || GT - ARMS.lastShot < 1.2) && !ARMS.mouse.down) { if (!validTarget(ARMS.target, o, w.range)) ARMS.target = pickTarget(o, facing, w.range, G.onFoot ? 1.2 : 1.75); }
  else if (!ARMS.trigger) ARMS.target = null;
  if (live && i && (ARMS.trigger || ARMS.mouse.down)) {
    let aim;
    if (ARMS.mouse.down) { aim = CAM.fpFoot || (G.onFoot && CAM.sl && rbxFoot()) || document.pointerLockElement ? centerRayPoint() : mouseRayPoint(G.player); ARMS.mouseAimT = 0.9; }
    else if (ARMS.target) aim = targetPoint(ARMS.target);
    else { const fy = G.onFoot ? HERO.p.y + 1.3 : G.player.y + 1; aim = { x: o.x + Math.sin(facing) * 30, y: fy, z: o.z + Math.cos(facing) * 30 }; }
    if (G.onFoot) { ARMS.aimYaw = Math.atan2(aim.x - HERO.p.x, aim.z - HERO.p.z); HERO.p.h = lerpA(HERO.p.h, ARMS.aimYaw, damp(25, dt)); }
    if (ARMS.cool <= 0 && ARMS.reloadT <= 0) {
      if (ARMS.mag[i] > 0) fireWeapon(aim);
      else if (ARMS.ammo[i] > 0) startReload();
      else { SFX.click(1); ARMS.cool = 0.35; }
    }
  } else if (G.onFoot && HERO.p) ARMS.aimYaw = HERO.p.h;
  updateRockets(dt); updateTracers(dt); updatePickups(dt);
  // gun in the player's hand
  const g = ARMS.gun, showHero = G.onFoot && i && HERO.p && HERO.p.active && !HERO.p.rag && !PUG.held;
  g.visible = !!showHero;
  if (showHero) {
    for (const k in ARMS.models) ARMS.models[k].visible = k === w.id;
    const Q = HERO.p.pts, aiming = ARMS.trigger || ARMS.mouse.down || GT - ARMS.lastShot < 1.6;
    if (w.rocket) { g.position.set(Q[9], Q[10] + 0.12, Q[11]); g.rotation.set(0, ARMS.aimYaw, 0); }
    else { g.position.set(Q[21], Q[22], Q[23]); g.rotation.set(aiming ? 0 : 1.1, aiming ? ARMS.aimYaw : HERO.p.h, 0, 'YXZ'); }
  }
  // armed police officers
  let gi = 0;
  for (const p of PED.list) {
    if (gi >= ARMS.copGuns.length) break;
    if (!p.active || !p.cop || p.rag || !p.armed) continue;
    const m = ARMS.copGuns[gi++], Q = p.pts; m.visible = true; m.position.set(Q[21], Q[22], Q[23]); m.rotation.set(p.aimT > GT ? 0 : 1.1, p.aimT > GT ? p.aimYaw : p.h, 0, 'YXZ');
  }
  for (; gi < ARMS.copGuns.length; gi++) ARMS.copGuns[gi].visible = false;
  // cursor
  const cv = renderer.domElement, want = APP.mode === 'game' && i > 0 && !APP.paused;
  if (cv.classList.contains('aim') !== want) cv.classList.toggle('aim', want);
}
function weaponGlow(gl) {
  const t = ARMS.target; if (!t || !(ARMS.trigger || GT - ARMS.lastShot < 1.2) || !validTarget(t, PF(), 999)) return;
  const p = targetPoint(t); gl.add(p.x, p.y + (t.isPed ? 1.0 : 1.4), p.z, COL.sirenR, 1.1, 0.9);
}
function clearWeapons() { for (const r of ARMS.rockets) scene.remove(r.m); ARMS.rockets.length = 0; ARMS.target = null; ARMS.tracer.life.fill(0); }
