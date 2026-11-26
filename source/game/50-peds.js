// =====================================================================
//  PEDESTRIANS: instanced bodies, walking AI, verlet ragdolls, gore
// =====================================================================
const PED = { MAX: 130, list: [], mesh: {}, spawnT: 0, bodies: 0 };
// skeleton points (local, metres; +x = left, +z = forward)
const TPOSE = [[0, 1.70, 0], [0, 1.50, 0], [0.21, 1.45, 0], [-0.21, 1.45, 0], [0.24, 1.16, 0], [-0.24, 1.16, 0], [0.26, 0.88, 0.02], [-0.26, 0.88, 0.02],
  [0, 0.96, 0], [0.1, 0.94, 0], [-0.1, 0.94, 0], [0.1, 0.52, 0.02], [-0.1, 0.52, 0.02], [0.1, 0.05, 0], [-0.1, 0.05, 0]];
const CONS = [[0, 1], [1, 2], [1, 3], [2, 3], [2, 4], [4, 6], [3, 5], [5, 7], [1, 8], [8, 9], [8, 10], [9, 10], [9, 11], [11, 13], [10, 12], [12, 14],
  [2, 9], [3, 10], [2, 10], [3, 9], [0, 2], [0, 3]];
const MINS = [[9, 13, 0.55], [10, 14, 0.55], [2, 6, 0.3], [3, 7, 0.3], [0, 8, 0.62], [13, 14, 0.12]];
const PT_RAD = [0.13, 0.08, 0.08, 0.08, 0.06, 0.06, 0.05, 0.05, 0.1, 0.08, 0.08, 0.07, 0.07, 0.06, 0.06, 0.08, 0.08, 0.08, 0.08, 0.13];
const LIMBS = {
  armL: { j: 2, mesh: 'uaL' }, armR: { j: 3, mesh: 'uaR' }, legL: { j: 9, mesh: 'ulL' }, legR: { j: 10, mesh: 'ulR' }, head: { j: 1, mesh: 'head' }
};
const ENDS_DEF = { head: [1, 0], uaL: [2, 4], laL: [4, 6], uaR: [3, 5], laR: [5, 7], ulL: [9, 11], llL: [11, 13], ulR: [10, 12], llR: [12, 14] };
const PART_GEO = { head: [0.22, 0.25, 0.24], hair: [0.235, 0.09, 0.25], torso: [0.4, 0.6, 0.22], ua: [0.11, 0.31, 0.11], la: [0.09, 0.3, 0.09], ul: [0.15, 0.44, 0.16], ll: [0.12, 0.47, 0.13] };
const SKIN = ['#f1c9a5', '#e0ac85', '#c68863', '#a86f4c', '#8a5536', '#5e3a24'];
const SHIRT = ['#d94848', '#3b6fd9', '#f2f2f2', '#2b2b2b', '#3fa66a', '#f0c23b', '#8e5bd6', '#e5793b', '#4fc1d9', '#c74d8a', '#6b7a8f', '#b9a27a', '#1f4f8a', '#a8323a'];
const PANTS = ['#2a3550', '#1f1f22', '#5a4632', '#7a7f88', '#3d4a3a', '#c9b99a', '#334a6e'];
const HAIR = ['#1b1410', '#3a2414', '#6b4423', '#c9a25a', '#8c8c8c', '#2b1d14', '#a0522d'];
const RSTEP = 1 / 60, RGRAV = 15;

// rounded body parts: capsule limbs, a tapered torso, an oval head with a face, a hair cap
function capsuleGeo(rBot, rTop, h, seg) {   // along y, centred; rBot at -y, rTop at +y
  const pts = [], N = 4;
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + i / N * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * rBot), -h / 2 + rBot + Math.sin(a) * rBot)); }
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * rTop), h / 2 - rTop + Math.sin(a) * rTop)); }
  return new THREE.LatheGeometry(pts, seg || 10);
}
function shade(g, v) { return colorize(g, new THREE.Color(v, v, v)); }
function roundPart(k) {
  const [w, h, d] = PART_GEO[k], P = [];
  if (k === 'head') {
    const s = new THREE.SphereGeometry(0.5, 14, 11); s.scale(w * 0.96, h, d); P.push(shade(s, 1));
    for (const x of [-0.045, 0.045]) { const e = new THREE.SphereGeometry(0.019, 6, 4); e.translate(x, 0.02, d * 0.47); P.push(shade(e, 0.08)); const b = new THREE.BoxGeometry(0.05, 0.012, 0.01); b.translate(x, 0.058, d * 0.47); P.push(shade(b, 0.35)); }
    const n = new THREE.SphereGeometry(0.024, 6, 4); n.scale(1, 1.2, 1); n.translate(0, -0.012, d * 0.5); P.push(shade(n, 0.95));
    const m = new THREE.BoxGeometry(0.05, 0.01, 0.01); m.translate(0, -0.062, d * 0.46); P.push(shade(m, 0.45));
    for (const x of [-1, 1]) { const ea = new THREE.SphereGeometry(0.03, 6, 4); ea.scale(0.6, 1, 1); ea.translate(x * w * 0.48, 0, -0.005); P.push(shade(ea, 0.95)); }
    const nk = new THREE.CylinderGeometry(0.05, 0.058, 0.16, 8, 1, true); nk.translate(0, -0.16, -0.01); P.push(shade(nk, 0.92));
  } else if (k === 'hair') {   // a cap over the top and back of the head (placed 0.165 above the head centre)
    const c = new THREE.SphereGeometry(0.5, 14, 6, 0, TAU, 0, Math.PI * 0.36); c.scale(0.245, 0.27, 0.262); c.translate(0, -0.165 + 0.012, -0.006); P.push(shade(c, 1));
    const bk = new THREE.SphereGeometry(0.5, 12, 6, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * 0.42); bk.scale(0.245, 0.27, 0.262); bk.translate(0, -0.165 + 0.012, -0.01); P.push(shade(bk, 1));
  } else if (k === 'torso') {
    const c = new THREE.CylinderGeometry(0.5, 0.43, h * 0.78, 14, 1, true); c.scale(w, 1, d); P.push(shade(c, 1));
    const top = new THREE.SphereGeometry(0.5, 14, 4, 0, TAU, 0, Math.PI / 2); top.scale(w, h * 0.22, d); top.translate(0, h * 0.39, 0); P.push(shade(top, 1));
    const bot = new THREE.SphereGeometry(0.5, 14, 4, 0, TAU, Math.PI / 2, Math.PI / 2); bot.scale(w * 0.86, h * 0.14, d * 0.98); bot.translate(0, -h * 0.39, 0); P.push(shade(bot, 1));
    const belt = new THREE.CylinderGeometry(0.5, 0.5, 0.035, 14, 1, true); belt.scale(w * 0.9, 1, d * 1.02); belt.translate(0, -h * 0.36, 0); P.push(shade(belt, 0.3));
  } else if (k === 'll') {   // shin with a shoe at the foot end (+y points down the leg)
    P.push(shade(capsuleGeo(w * 0.5, w * 0.4, h, 8), 1));
    const sh = new THREE.SphereGeometry(0.5, 8, 6); sh.scale(w * 1.05, 0.1, d * 1.35); sh.translate(0, h / 2 - 0.02, 0.025); P.push(shade(sh, 0.22));
  } else if (k === 'la') {   // forearm with a hand at the end
    P.push(shade(capsuleGeo(w * 0.52, w * 0.42, h, 8), 1));
    const hd = new THREE.SphereGeometry(0.5, 8, 6); hd.scale(w * 0.95, 0.11, d * 0.7); hd.translate(0, h / 2 + 0.03, 0); P.push(shade(hd, 1));
  } else P.push(shade(capsuleGeo(w * 0.55, w * 0.47, h, 8), 1));
  return mergeGeos(P);
}
function initPeds() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  const mkGeo = (k) => roundPart(k);
  const counts = { head: 1, hair: 1, torso: 1, ua: 2, la: 2, ul: 2, ll: 2 };
  for (const k in counts) {
    const m = new THREE.InstancedMesh(mkGeo(k), mat, PED.MAX * counts[k]);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; m.count0 = PED.MAX * counts[k];
    for (let i = 0; i < PED.MAX * counts[k]; i++) { m.setMatrixAt(i, _zeroM); m.setColorAt(i, COL.white); }
    PED.mesh[k] = m;
  }
  for (let i = 0; i < PED.MAX; i++) PED.list.push({ slot: i, active: false, pts: new Float32Array(45) });
  PED.list[0].reserved = true; // the player character
}
function pedsAddTo(parent) { for (const k in PED.mesh) parent.add(PED.mesh[k]); }
function hidePed(p) {
  const s = p.slot, M = PED.mesh;
  M.head.setMatrixAt(s, _zeroM); M.hair.setMatrixAt(s, _zeroM); M.torso.setMatrixAt(s, _zeroM);
  for (const k of ['ua', 'la', 'ul', 'll']) { M[k].setMatrixAt(s * 2, _zeroM); M[k].setMatrixAt(s * 2 + 1, _zeroM); }
}
function clearPeds() { for (const p of PED.list) { if (p.active) hidePed(p); p.active = false; p.rag = null; } PED.bodies = 0; for (const k in PED.mesh) PED.mesh[k].instanceMatrix.needsUpdate = true; }
function pedColors(p, look) {
  const s = p.slot, M = PED.mesh, skin = C(look.skin), shirt = C(look.shirt), pants = C(look.pants);
  M.head.setColorAt(s, skin); M.hair.setColorAt(s, C(look.hair)); M.torso.setColorAt(s, shirt);
  M.ua.setColorAt(s * 2, shirt); M.ua.setColorAt(s * 2 + 1, shirt); M.la.setColorAt(s * 2, skin); M.la.setColorAt(s * 2 + 1, skin);
  M.ul.setColorAt(s * 2, pants); M.ul.setColorAt(s * 2 + 1, pants); M.ll.setColorAt(s * 2, pants); M.ll.setColorAt(s * 2 + 1, pants);
  for (const kk in M) M[kk].instanceColor.needsUpdate = true;
}
const LOOKS = { accountant: { hair: '#8c8c8c', shirt: '#4a4f5a', pants: '#2a2d33' }, clerk: { shirt: '#2f7d5b', pants: '#25272d' }, cop: { hair: '#0d0e12', shirt: '#1d2c4d', pants: '#141a2a' }, partner: { hair: '#1b1410', shirt: '#151518', pants: '#151518' } };
function initPed(p, x, z, kind) {
  Object.assign(p, { active: true, isHero: false, cop: kind === 'cop', clerk: null, remote: null, customer: null, prone: false, thief: null, mission: false, running: false, state: 'walk', dead: false, rag: null, x, z, y: heightAt(x, z), h: 0, sp: 0, walk: rand(1.1, 1.6), run: kind === 'cop' ? 5.6 : rand(4.2, 5.4), phase: Math.random() * TAU, scale: rand(0.9, 1.08), loop: 0, dir: Math.random() < 0.5 ? 1 : -1, corner: 0, waitT: 0, fleeT: 0, deadT: 0, pend: null, justCrossed: false, panicCd: 0, fat: rand(0.9, 1.25), hits: 0, copT: 0, hp: kind === 'cop' ? 75 : 40, armed: kind === 'cop', aimT: 0, aimYaw: 0, shootT: rand(0.4, 1.2), losT: 0, los: false });
  const lk = LOOKS[kind] || {};
  pedColors(p, { skin: pick(SKIN), hair: lk.hair || pick(HAIR), shirt: lk.shirt || pick(SHIRT), pants: lk.pants || pick(PANTS) });
}
function nearestLoopCorner(x, z) {
  let best = 0, bk = 0, bd = 1e18;
  for (let i = 0; i < W.loops.length; i++) { const lp = W.loops[i]; if (Math.abs(lp.cx - x) > 110 || Math.abs(lp.cz - z) > 110) continue; for (let k = 0; k < 4; k++) { const d = (lp.pts[k][0] - x) ** 2 + (lp.pts[k][1] - z) ** 2; if (d < bd) { bd = d; best = i; bk = k; } } }
  return { loop: best, corner: bk };
}
function spawnPedAt(x, z, kind) {
  const p = PED.list.find(q => !q.active && !q.reserved); if (!p || !W.loops.length) return null;
  initPed(p, x, z, kind);
  const n = nearestLoopCorner(x, z); p.loop = n.loop; p.corner = n.corner; p.tx = W.loops[n.loop].pts[n.corner][0]; p.tz = W.loops[n.loop].pts[n.corner][1];
  return p;
}
function spawnPed(minR, maxR) {
  const P = PF(), slot = PED.list.find(p => !p.active && !p.reserved); if (!P || !slot || !W.loops.length) return;
  for (let t = 0; t < 25; t++) {
    const L = pick(W.loops); const k = (Math.random() * 4) | 0, k2 = (k + 1) % 4, f = Math.random();
    const x = lerp(L.pts[k][0], L.pts[k2][0], f), z = lerp(L.pts[k][1], L.pts[k2][1], f);
    const d = Math.hypot(x - P.x, z - P.z); if (d < minR || d > maxR) continue;
    const p = slot; initPed(p, x, z, 'civ');
    p.loop = W.loops.indexOf(L); p.corner = p.dir > 0 ? k2 : k;
    const tg = L.pts[p.corner]; p.tx = tg[0]; p.tz = tg[1]; p.h = Math.atan2(p.tx - x, p.tz - z);
    return p;
  }
}
// ----- procedural walk pose into p.pts (world space) -----
function poseWalk(p) {
  const s = p.scale, ph = p.phase, run = p.state === 'flee' || p.running, idle = Math.abs(p.sp) < 0.05;
  const amp = idle ? 0.03 : run ? 0.8 : 0.42, sw = Math.sin(ph) * amp;
  const bob = idle ? 0 : Math.abs(Math.cos(ph)) * (run ? 0.06 : 0.03), lean = run ? 0.2 : 0.03;
  const L = [];
  const pel = [0, 0.96 + bob, 0]; const nk = [0, pel[1] + 0.54 * Math.cos(lean), 0.54 * Math.sin(lean)];
  L[8] = pel; L[1] = nk; L[0] = [0, nk[1] + 0.2, nk[2] + 0.2 * Math.sin(lean) + 0.02];
  L[2] = [0.21, nk[1] - 0.05, nk[2]]; L[3] = [-0.21, nk[1] - 0.05, nk[2]];
  L[9] = [0.1, pel[1] - 0.02, 0]; L[10] = [-0.1, pel[1] - 0.02, 0];
  const kb = run ? 1.1 : 0.55;
  for (const [hip, knee, foot, a, bend] of [[9, 11, 13, sw, Math.max(0, Math.cos(ph)) * kb], [10, 12, 14, -sw, Math.max(0, -Math.cos(ph)) * kb]]) {
    const H = L[hip]; L[knee] = [H[0], H[1] - 0.42 * Math.cos(a), H[2] + 0.42 * Math.sin(a)];
    const K = L[knee], b = a - bend; L[foot] = [K[0], K[1] - 0.45 * Math.cos(b), K[2] + 0.45 * Math.sin(b)];
  }
  const eb = run ? 1.3 : 0.35;
  for (const [sh, el, hd, a, sx] of [[2, 4, 6, -sw * 0.9, 1], [3, 5, 7, sw * 0.9, -1]]) {
    const S = L[sh]; L[el] = [S[0] + sx * 0.03, S[1] - 0.29 * Math.cos(a), S[2] + 0.29 * Math.sin(a)];
    const E = L[el], b = a + eb; L[hd] = [E[0] + sx * 0.01, E[1] - 0.28 * Math.cos(b), E[2] + 0.28 * Math.sin(b)];
  }
  const c = Math.cos(p.h), sn = Math.sin(p.h), P = p.pts;
  for (let i = 0; i < 15; i++) { const l = L[i], lx = l[0] * s * (i === 2 || i === 3 ? p.fat : 1), ly = l[1] * s, lz = l[2] * s; P[i * 3] = p.x + lx * c + lz * sn; P[i * 3 + 1] = p.y + ly; P[i * 3 + 2] = p.z - lx * sn + lz * c; }
}
// ----- write instance matrices from a point array -----
const _bx1 = new THREE.Vector3(), _by1 = new THREE.Vector3(), _bz1 = new THREE.Vector3(), _pp = new THREE.Vector3();
function limbM(P, a, b, len) {
  const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], bx = P[b * 3], by = P[b * 3 + 1], bz = P[b * 3 + 2];
  let dx = bx - ax, dy = by - ay, dz = bz - az; const L = Math.hypot(dx, dy, dz) || 1e-4;
  _v1.set(dx / L, dy / L, dz / L); _q.setFromUnitVectors(UP, _v1);
  _pp.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); _s.set(1, clamp(L / len, 0.6, 1.4), 1); _m.compose(_pp, _q, _s); _s.set(1, 1, 1); return _m;
}
function pedMatrices(p, P, ends) {
  const s = p.slot, M = p.meshSet || PED.mesh, sc = p.scale;
  // torso basis
  const px = P[24], py = P[25], pz = P[26], nx = P[3], ny = P[4], nz = P[5];
  _by1.set(nx - px, ny - py, nz - pz); const tl = _by1.length() || 1e-4; _by1.multiplyScalar(1 / tl);
  _bx1.set(P[6] - P[9], P[7] - P[10], P[8] - P[11]); _bx1.addScaledVector(_by1, -_bx1.dot(_by1)); if (_bx1.lengthSq() < 1e-8) _bx1.set(1, 0, 0); _bx1.normalize();
  _bz1.crossVectors(_bx1, _by1);
  _m.makeBasis(_bx1, _by1, _bz1); _s.set(p.fat * sc, clamp(tl / 0.6, 0.6, 1.3), sc); _m.scale(_s); _s.set(1, 1, 1); _m.setPosition((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2); M.torso.setMatrixAt(s, _m);
  // head
  const hn = ends.head[0];
  _by1.set(P[0] - P[hn * 3], P[1] - P[hn * 3 + 1], P[2] - P[hn * 3 + 2]); if (_by1.lengthSq() < 1e-8) _by1.set(0, 1, 0); _by1.normalize();
  if (hn !== 1 && p.rag) { if (!p.rag.hx) p.rag.hx = _bx1.clone(); _bx1.copy(p.rag.hx); }
  _bx1.addScaledVector(_by1, -_bx1.dot(_by1)); if (_bx1.lengthSq() < 1e-8) _bx1.set(1, 0, 0); _bx1.normalize(); _bz1.crossVectors(_bx1, _by1);
  _m.makeBasis(_bx1, _by1, _bz1); _s.setScalar(sc); _m.scale(_s); _s.set(1, 1, 1); _m.setPosition(P[0], P[1], P[2]); M.head.setMatrixAt(s, _m);
  _m.setPosition(P[0] + _by1.x * 0.165 * sc, P[1] + _by1.y * 0.165 * sc, P[2] + _by1.z * 0.165 * sc); M.hair.setMatrixAt(s, _m);
  M.ua.setMatrixAt(s * 2, limbM(P, ends.uaL[0], ends.uaL[1], 0.29 * sc)); M.ua.setMatrixAt(s * 2 + 1, limbM(P, ends.uaR[0], ends.uaR[1], 0.29 * sc));
  M.la.setMatrixAt(s * 2, limbM(P, ends.laL[0], ends.laL[1], 0.28 * sc)); M.la.setMatrixAt(s * 2 + 1, limbM(P, ends.laR[0], ends.laR[1], 0.28 * sc));
  M.ul.setMatrixAt(s * 2, limbM(P, ends.ulL[0], ends.ulL[1], 0.42 * sc)); M.ul.setMatrixAt(s * 2 + 1, limbM(P, ends.ulR[0], ends.ulR[1], 0.42 * sc));
  M.ll.setMatrixAt(s * 2, limbM(P, ends.llL[0], ends.llL[1], 0.45 * sc)); M.ll.setMatrixAt(s * 2 + 1, limbM(P, ends.llR[0], ends.llR[1], 0.45 * sc));
}
// ----- AI -----
const _pb = [];
function panic(p, fx, fz, t) {
  if (p.rag || !p.active || p.isHero || p.mission || p.cop) return;
  if (p.state !== 'flee') SFX.scream(p.x, p.z);
  p.state = 'flee'; p.fleeT = t || rand(4, 7);
  const dx = p.x - fx, dz = p.z - fz, l = Math.hypot(dx, dz) || 1; p.fx = dx / l; p.fz = dz / l; p.pend = null;
}
function pedPushOut(p) {
  W.boxGrid.query(p.x - 1, p.z - 1, p.x + 1, p.z + 1, _pb);
  let hit = false;
  for (const b of _pb) {
    if (p.y > b.h - 0.3) continue;
    const r = 0.3, cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    else { const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z, m = Math.min(l, rr, t, bt); if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r; }
  }
  return hit;
}
function pedMove(p, desH, sp, dt, run) {
  p.h = lerpA(p.h, desH, damp(9, dt));
  p.sp = lerp(p.sp, sp, damp(6, dt));
  const ox = p.x, oz = p.z;
  p.x += Math.sin(p.h) * p.sp * dt; p.z += Math.cos(p.h) * p.sp * dt;
  if (W.waters && waterAt(p.x, p.z)) { p.x = ox; p.z = oz; if (p.state === 'flee') { p.fx = -p.fx; p.fz = -p.fz; } }
  p.running = !!run;
  p.phase += p.sp * dt * TAU / (run ? 2.4 : 1.4);
  const hit = pedPushOut(p);
  p.y = lerp(p.y, heightAt(p.x, p.z), damp(15, dt));
  return hit;
}
function pedAI(p, dt) {
  if (p.remote) return;
  if (p.clerk) { clerkAI(p, dt); return; }
  if (p.customer) { customerAI(p, dt); return; }
  if (p.cop && copAI(p, dt)) return;
  let desH = p.h, sp = 0;
  if (p.state === 'idle') sp = 0;
  else if (p.state === 'goto') { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz); if (d > 0.5) { desH = Math.atan2(dx, dz); sp = 3.4; } }
  else if (p.state === 'walk') {
    const L = W.loops[p.loop], dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.4) pedArrive(p, L); else { desH = Math.atan2(dx, dz); sp = p.walk; }
  } else if (p.state === 'wait') {
    p.waitT -= dt; const c = p.pend;
    if (!c) p.state = 'walk';
    else {
      let safe = !c.node || lightState(c.node, c.axis === 'z' ? 'x' : 'z') === 'R';
      if (safe) for (const v of VEH.list) { if (Math.abs(v.vf) > 3 && Math.hypot(v.x - c.mx, v.z - c.mz) < 14) { safe = false; break; } }
      if (safe || p.waitT <= 0) { const L2 = W.loops[c.loop]; p.loop = c.loop; p.corner = c.k; p.tx = L2.pts[c.k][0]; p.tz = L2.pts[c.k][1]; p.state = 'walk'; p.justCrossed = true; p.dir = Math.random() < 0.5 ? 1 : -1; p.pend = null; }
      desH = Math.atan2(c.mx - p.x, c.mz - p.z);
    }
  } else if (p.state === 'flee') {
    p.fleeT -= dt; sp = p.run;
    desH = Math.atan2(p.fx, p.fz) + Math.sin(GT * 2 + p.slot) * 0.35;
    if (p.fleeT <= 0) { const n = nearestLoopCorner(p.x, p.z); p.loop = n.loop; p.corner = n.corner; p.tx = W.loops[n.loop].pts[n.corner][0]; p.tz = W.loops[n.loop].pts[n.corner][1]; p.state = 'walk'; }
  }
  const hit = pedMove(p, desH, sp, dt, p.state === 'flee' || (p.state === 'goto' && sp > 0));
  if (hit && p.state === 'flee') { p.fx = -p.fx + rand(-0.5, 0.5); p.fz = -p.fz + rand(-0.5, 0.5); }
  if (p.mission) return;
  // react to a fast player car, or to a wanted fugitive on foot
  const P = G.player, F = PF(); p.panicCd -= dt;
  if (p.state !== 'flee' && p.panicCd <= 0) {
    if (P) { const dx = p.x - P.x, dz = p.z - P.z, d2 = dx * dx + dz * dz; if (d2 < 100 && P.speed > 9 && (dx * P.vx + dz * P.vz) > 0) { p.panicCd = 1; if (Math.random() < 0.6) panic(p, P.x, P.z, rand(2.5, 4)); return; } }
    if (F && wanted.stars >= 2 && (p.x - F.x) ** 2 + (p.z - F.z) ** 2 < 900 && Math.random() < dt * 0.3) panic(p, F.x, F.z);
  }
}
function pedArrive(p, L) {
  const cross = L.cross[p.corner];
  if (!p.justCrossed && cross.length && Math.random() < 0.35) {
    const c = pick(cross); p.pend = c; p.state = 'wait'; p.waitT = c.node ? 14 : 0.1; return;
  }
  p.justCrossed = false;
  p.corner = (p.corner + p.dir + 4) % 4;
  p.tx = L.pts[p.corner][0] + rand(-0.4, 0.4); p.tz = L.pts[p.corner][1] + rand(-0.4, 0.4);
}
// ----- ragdoll -----
function toRagdoll(p, vx, vz, speed, src) {
  if (p.isHero && HERO.chute) { const c = HERO.chute; if (!c.free && c.t > 0.3) HERO.chuteDrop = { x: p.x, y: p.y, z: p.z, h: p.h, bank: c.bank || 0, t: 0, air: true }; HERO.chute = null; }   // knocked out of the harness: you can pull a fresh one
  if (!p.rag) poseWalk(p);
  const R = { pos: new Float32Array(60), prev: new Float32Array(60), n: 15, cons: [], acc: 0, still: 0, asleep: false, ends: Object.assign({}, ENDS_DEF), det: {}, spurt: [], pooled: false, slideD: 0, lx: 0, lz: 0, hx: null };
  R.pos.set(p.pts);
  const sc = p.scale;
  for (const [a, b] of CONS) R.cons.push({ a, b, r: dist3(TPOSE[a], TPOSE[b]) * sc, min: false });
  for (const [a, b, r] of MINS) R.cons.push({ a, b, r: r * sc, min: true });
  const up = 1.5 + speed * 0.2;
  for (let i = 0; i < 15; i++) {
    const legs = i >= 9 && i !== 8, arms = i >= 2 && i <= 7, w = legs ? 1.15 : i === 8 ? 1.0 : arms ? 0.85 : 0.7;
    const ivx = vx * w + rand(-0.6, 0.6), ivy = up * (legs ? 1.1 : 0.75) + rand(-0.3, 0.3), ivz = vz * w + rand(-0.6, 0.6);
    R.prev[i * 3] = R.pos[i * 3] - ivx * RSTEP; R.prev[i * 3 + 1] = R.pos[i * 3 + 1] - ivy * RSTEP; R.prev[i * 3 + 2] = R.pos[i * 3 + 2] - ivz * RSTEP;
  }
  R.lx = p.x; R.lz = p.z;
  p.rag = R; p.state = 'rag';
}
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function detach(p, name) {
  const R = p.rag, Lm = LIMBS[name]; if (!R || R.det[name] || R.n >= 20) return;
  const j = Lm.j, ni = R.n++;
  for (let q = 0; q < 3; q++) { R.pos[ni * 3 + q] = R.pos[j * 3 + q]; R.prev[ni * 3 + q] = R.prev[j * 3 + q]; }
  const childOf = { 2: [4, 6], 3: [5, 7], 9: [11, 13], 10: [12, 14], 1: [0] }[j];
  R.cons = R.cons.filter(c => {
    const hasJ = c.a === j || c.b === j, other = c.a === j ? c.b : c.a;
    if (!hasJ) return true;
    if (childOf.includes(other)) { if (c.a === j) c.a = ni; else c.b = ni; return true; }
    if (name === 'head' && other !== 0) return true;
    return true;
  });
  if (name === 'head') R.cons = R.cons.filter(c => !((c.a === 0 || c.b === 0) && (c.a !== ni && c.b !== ni)));
  R.ends[Lm.mesh] = [ni, R.ends[Lm.mesh][1]];
  if (name === 'head') R.ends.head = [ni, 0];
  R.det[name] = true;
  const kick = () => rand(-2.5, 2.5);
  for (const i of [ni, ...childOf]) { R.prev[i * 3] -= kick() * RSTEP; R.prev[i * 3 + 1] -= rand(1, 3) * RSTEP; R.prev[i * 3 + 2] -= kick() * RSTEP; }
  R.spurt.push({ i: j, t: 3.5 }, { i: ni, t: 2.5 });
}
function ragTick(p, R) {
  const P = R.pos, Q = R.prev, n = R.n, g = RGRAV * RSTEP * RSTEP;
  let move = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 3, vx = (P[k] - Q[k]) * 0.995, vy = (P[k + 1] - Q[k + 1]) * 0.995, vz = (P[k + 2] - Q[k + 2]) * 0.995;
    Q[k] = P[k]; Q[k + 1] = P[k + 1]; Q[k + 2] = P[k + 2];
    P[k] += vx; P[k + 1] += vy - g; P[k + 2] += vz;
    move = Math.max(move, Math.abs(vx) + Math.abs(vy) + Math.abs(vz));
  }
  const cx = P[24], cz = P[26];
  W.boxGrid.query(cx - 2.5, cz - 2.5, cx + 2.5, cz + 2.5, _pb);
  for (let it = 0; it < 6; it++) {
    for (const c of R.cons) {
      const a = c.a * 3, b = c.b * 3, dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], d = Math.hypot(dx, dy, dz) || 1e-6;
      if (c.min && d >= c.r) continue;
      const f = (d - c.r) / d * 0.5;
      P[a] += dx * f; P[a + 1] += dy * f; P[a + 2] += dz * f; P[b] -= dx * f; P[b + 1] -= dy * f; P[b + 2] -= dz * f;
    }
    if (it % 2 === 1) for (let i = 0; i < n; i++) {
      const k = i * 3, r = PT_RAD[i] * p.scale, gh = heightAt(P[k], P[k + 2]) + r;
      if (P[k + 1] < gh) { P[k + 1] = gh; Q[k + 1] = P[k + 1]; Q[k] = P[k] - (P[k] - Q[k]) * 0.7; Q[k + 2] = P[k + 2] - (P[k + 2] - Q[k + 2]) * 0.7; }
      for (const b of _pb) {
        if (P[k + 1] > b.h) continue;
        const x = P[k], z = P[k + 2];
        if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) {
          const l = x - (b.x0 - r), rr = (b.x1 + r) - x, t = z - (b.z0 - r), bt = (b.z1 + r) - z, m = Math.min(l, rr, t, bt);
          if (m === l) P[k] = b.x0 - r; else if (m === rr) P[k] = b.x1 + r; else if (m === t) P[k + 2] = b.z0 - r; else P[k + 2] = b.z1 + r;
          Q[k] = P[k] - (P[k] - Q[k]) * 0.3; Q[k + 2] = P[k + 2] - (P[k + 2] - Q[k + 2]) * 0.3;
        }
      }
    }
  }
  // cars pushing the body
  for (const v of VEH.list) {
    const dx0 = cx - v.x, dz0 = cz - v.z; if (dx0 * dx0 + dz0 * dz0 > 36) continue;
    const c = Math.cos(v.h), s = Math.sin(v.h), top = v.y + Math.min(1.05, v.height * 0.72), sp = Math.hypot(v.vx, v.vz);
    let hit = false;
    for (let i = 0; i < n; i++) {
      const k = i * 3, px = P[k] - v.x, pz = P[k + 2] - v.z, py = P[k + 1];
      const lx = px * c - pz * s, lz = px * s + pz * c;
      if (Math.abs(lx) > v.halfW || lz > v.front || lz < v.rear || py > top || py < v.y - 0.1) continue;
      const penX = v.halfW - Math.abs(lx), penF = v.front - lz, penR = lz - v.rear, penY = top - py, m = Math.min(penX, penF, penR, penY);
      let nlx = lx, nlz = lz;
      if (m === penY) { P[k + 1] = top + 0.01; }
      else if (m === penX) nlx = Math.sign(lx || 1) * (v.halfW + 0.01);
      else if (m === penF) nlz = v.front + 0.01; else nlz = v.rear - 0.01;
      P[k] = v.x + nlx * c + nlz * s; P[k + 2] = v.z - nlx * s + nlz * c;
      const keep = m === penY ? 0.85 : 1.05;
      Q[k] = P[k] - v.vx * RSTEP * keep; Q[k + 2] = P[k + 2] - v.vz * RSTEP * keep; if (m === penY) Q[k + 1] = P[k + 1] - Math.max(0, v.vy) * RSTEP;
      hit = true;
    }
    if (hit) {
      R.asleep = false; R.still = 0;
      if (sp > 3) { if (p.isHero) { if (sp > 4.5 && !(v === HERO.bailCar && GT < HERO.bailUntil)) heroDamage(Math.min(40, sp * 2)); } else if (!p.dead && sp > 4.5) killPed(p, v === G.player); if (v === G.player && Math.random() < 0.3) { v.bump = 0.06 + Math.random() * 0.05; } }
    }
  }
  if (move < 0.004) R.still++; else R.still = 0;
  if (R.still > 50 && p.dead) R.asleep = true;
}
function killPed(p, byPlayer) {
  if (p.remote) return;
  if (p.isHero) { heroDamage(35); return; }
  if (p.dead) return; p.dead = true;
  if (p.cop && byPlayer) addHeat(1, 2, true);
  if (byPlayer) { G.stats.peds++; addHeat(0.8, 1, true); }
}
function bloodBurst(x, y, z, vx, vz, n, power) {
  if (settings.gore === 'off') return;
  const m = settings.gore === 'high' ? 1 : 0.4;
  for (let k = 0; k < n * m; k++) FX.blood.emit(x, y, z, vx * rand(0.2, 0.7) + rand(-2.5, 2.5) * power, rand(1, 5) * power, vz * rand(0.2, 0.7) + rand(-2.5, 2.5) * power, rand(0.7, 1.4), rand(0.05, 0.13), Math.random() < 0.5 ? COL.blood : COL.blood2, 1, 16, 0.4, 0, 1);
}
function hitPed(p, v, pvx, pvz, ps) {
  if (p.remote) { if (v === G.player) netRunOver(p.remote, pvx, pvz, ps); return; }
  if (p.isHero) {
    if (v.remote) return;   // the other player's game decides if they ran us over
    const own = v === HERO.bailCar && GT < HERO.bailUntil;
    toRagdoll(p, pvx, pvz, ps, v); if (!own) { HERO.hurtT = 0; heroDamage(ps * 3.6); } SFX.thud(ps, p.x, p.z); G.shake = Math.max(G.shake, 0.3);
    if (settings.gore !== 'off' && ps > 9) { const P = p.rag.pos; bloodBurst(P[24], P[25] + 0.3, P[26], pvx, pvz, 10, 1); }
    return;
  }
  const byPlayer = v === G.player;
  toRagdoll(p, pvx, pvz, ps, v);
  const fatal = ps > 6.5 || Math.random() < (ps - 3) / 7;
  if (fatal) killPed(p, byPlayer); else if (byPlayer) addHeat(0.35, 1, true);
  SFX.thud(ps, p.x, p.z);
  if (byPlayer) { G.shake = Math.max(G.shake, Math.min(0.25, ps * 0.012)); if (ps > 4) feed(fatal ? pick(['Pedestrian down', 'That one is not getting up', 'Hit and run']) : 'Pedestrian clipped', fatal ? 'red' : ''); }
  if (settings.gore !== 'off' && fatal) {
    const P = p.rag.pos; bloodBurst(P[24], P[25] + 0.3, P[26], pvx, pvz, 14 + ps * 1.5, 1 + ps * 0.03);
    DECALS.splat(p.x + pvx * 0.08, p.z + pvz * 0.08, rand(0.6, 1.1), 0);
    if (settings.gore === 'high' && ps > 15) {
      const opts = ['armL', 'armR', 'legL', 'legR']; const n = ps > 24 ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1;
      for (let k = 0; k < n; k++) detach(p, opts.splice((Math.random() * opts.length) | 0, 1)[0]);
      if (ps > 22 && Math.random() < 0.45) detach(p, 'head');
    }
  }
  v.vx *= 0.97; v.vz *= 0.97;
  for (const o of PED.list) if (o.active && !o.rag && o !== p && (o.x - p.x) ** 2 + (o.z - p.z) ** 2 < 625) panic(o, p.x, p.z);
}
function pedsExplosion(x, y, z, power, src) {
  for (const p of PED.list) {
    if (!p.active || p.remote) continue;
    const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz, Math.max(0, Math.abs(p.y + 0.9 - y) - 1.2));   // height counts: a blast in the street can't reach a parachutist
    if (p.rag) { const P = p.rag.pos; const ddx = P[24] - x, ddz = P[26] - z, dd = Math.hypot(ddx, ddz, Math.max(0, Math.abs(P[25] - y) - 1.2)); if (dd < 10 * power) { p.rag.asleep = false; p.rag.still = 0; const f = (1 - dd / (10 * power)) * 14 * power; for (let i = 0; i < p.rag.n; i++) { p.rag.prev[i * 3] -= ddx / (dd || 1) * f * RSTEP; p.rag.prev[i * 3 + 1] -= f * 0.8 * RSTEP; p.rag.prev[i * 3 + 2] -= ddz / (dd || 1) * f * RSTEP; } } continue; }
    if (d < 11 * power) {
      let f = (1 - d / (11 * power)) * 16 * power; const nx = dx / (d || 1), nz = dz / (d || 1);
      const spared = p.isHero && BOOM.pug && d > 14;   // a pug bomb knocks you flat from a distance, it only kills up close
      if (spared) f = Math.min(f, 9);
      toRagdoll(p, nx * f, nz * f, f, null);
      if (p.isHero) { HERO.hurtT = 0; heroDamage(spared ? Math.min(f * 7, 25) : f * 7, 'blast'); continue; }
      if (d < 7 * power) {
        killPed(p, isPlayerSrc(src));
        if (settings.gore !== 'off') { bloodBurst(p.x, p.y + 1, p.z, nx * f, nz * f, 16, 1.2); if (settings.gore === 'high' && d < 4) { detach(p, pick(['armL', 'armR', 'legL', 'legR'])); if (Math.random() < 0.5) detach(p, pick(['armL', 'legR'])); } }
      }
    } else if (d < 45) panic(p, x, z);
  }
}
function vehiclePedHits() {
  for (const v of VEH.list) {
    const sp = Math.hypot(v.vx, v.vz); if (sp < 0.6 && Math.abs(v.av) < 0.3) continue;
    const c = Math.cos(v.h), s = Math.sin(v.h);
    for (const p of PED.list) {
      if (!p.active || p.rag) continue;
      const dx = p.x - v.x, dz = p.z - v.z; if (dx * dx + dz * dz > 30) continue;
      if (v.y - p.y > 1.3 || p.y - v.y > (v.height || 1.5) + 0.3) continue;   // a car can't hit someone floating overhead
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < v.halfW + 0.28 && lz < v.front + 0.28 && lz > v.rear - 0.28) {
        const pvx = v.vx + v.av * dz, pvz = v.vz - v.av * dx, ps = Math.hypot(pvx, pvz);
        if (ps < 3.2) {
          const penX = v.halfW + 0.3 - Math.abs(lx), penF = v.front + 0.3 - lz, penR = lz - v.rear + 0.3;
          let nlx = lx, nlz = lz; const m = Math.min(penX, penF, penR);
          if (m === penX) nlx = Math.sign(lx || 1) * (v.halfW + 0.3); else if (m === penF) nlz = v.front + 0.3; else nlz = v.rear - 0.3;
          p.x = v.x + nlx * c + nlz * s; p.z = v.z - nlx * s + nlz * c;
          if (ps > 1) panic(p, v.x, v.z, 3);
        } else hitPed(p, v, pvx, pvz, ps);
      }
    }
  }
}
function updatePeds(dt) {
  const P = PF(); if (!P) return;
  const draw = QUALITY[settings.quality].draw * 0.75;
  PED.spawnT -= dt;
  let alive = 0, bodies = 0, oldest = null;
  for (const p of PED.list) {
    if (!p.active || p.isHero) continue;
    const d = Math.hypot(p.x - P.x, p.z - P.z);
    if (p.rag && p.dead) {
      bodies++; p.deadT += dt;
      if (!oldest || p.deadT > oldest.deadT) oldest = p;
      if (!p.remote && (d > 190 || p.deadT > 150)) { hidePed(p); p.active = false; p.rag = null; }
    } else if (!p.mission && !p.clerk && !p.remote && !p.customer) {
      alive++;
      if (d > 180) { hidePed(p); p.active = false; p.rag = null; }
    }
  }
  if (bodies > 34 && oldest) { hidePed(oldest); oldest.active = false; oldest.rag = null; }
  const target = Math.round(settings.pedDensity / 100 * 85);
  if (PED.spawnT <= 0) { PED.spawnT = 0.1; if (alive < target) spawnPed(alive < target * 0.5 ? 30 : 50, 160); }
  if (alive > target + 3) { const far = PED.list.filter(p => p.active && !p.rag && !p.isHero && !p.mission && !p.cop && !p.clerk && !p.remote && !p.customer && Math.hypot(p.x - P.x, p.z - P.z) > 70); if (far.length) { hidePed(far[0]); far[0].active = false; } }
  vehiclePedHits();
  const cx = camera.position.x, cz = camera.position.z;
  for (const p of PED.list) {
    if (!p.active) continue;
    if (p.rag) {
      const R = p.rag; R.acc += dt; let n = 0;
      while (R.acc >= RSTEP && n < 3) { R.acc -= RSTEP; n++; if (!R.asleep) ragTick(p, R); }
      if (n >= 3) R.acc = 0;
      const Pp = R.pos;
      if (settings.gore !== 'off' && p.dead) {
        for (let k = R.spurt.length - 1; k >= 0; k--) { const sp = R.spurt[k]; sp.t -= dt; if (sp.t <= 0) { R.spurt.splice(k, 1); continue; } if (settings.gore === 'high' && Math.random() < 0.7) { const i = sp.i * 3; FX.blood.emit(Pp[i], Pp[i + 1], Pp[i + 2], rand(-1, 1), rand(1.5, 3.5) * sp.t / 3, rand(-1, 1), 0.9, rand(0.04, 0.08), COL.blood, 1, 16, 0.3, 0, 1); } }
        const mx = Pp[24] - R.lx, mz = Pp[26] - R.lz, md = Math.hypot(mx, mz);
        if (md > 1.1) { if (Pp[25] < heightAt(Pp[24], Pp[26]) + 0.35 && settings.gore === 'high') DECALS.splat(Pp[24], Pp[26], rand(0.35, 0.6), 0); R.lx = Pp[24]; R.lz = Pp[26]; }
        if (R.still > 40 && !R.pooled) { R.pooled = true; DECALS.splat(Pp[24], Pp[26], 0.3, 0, settings.gore === 'high' ? rand(1.8, 2.6) : rand(1.0, 1.4)); }
      }
      if (!p.dead && R.still > (p.isHero ? 40 : 80)) { // get back up
        p.x = Pp[24]; p.z = Pp[26]; p.y = heightAt(p.x, p.z); p.rag = null; p.sp = 0; p.state = p.mission ? 'idle' : 'walk';
        if (!p.isHero) panic(p, P.x, P.z, 5);
      } else { p.x = Pp[24]; p.z = Pp[26]; }
    } else if (p.isHero) heroUpdate(dt);
    else pedAI(p, dt);
    if (!p.active) continue;
    const far = !p.isHero && (p.x - cx) ** 2 + (p.z - cz) ** 2 > draw * draw;
    if (far) { hidePed(p); continue; }
    if (p.rag) pedMatrices(p, p.rag.pos, p.rag.ends); else { poseWalk(p); if (p.isHero) heroPoseFix(p); else if (p.cop && p.aimT > GT) aimPose(p.pts, p.aimYaw, false, false); else if (p.clerk) clerkPose(p); else if (p.customer) customerPose(p); else if (p.remote) netPose(p); if (p.isHero && CAM.fpFoot) hidePed(p); else pedMatrices(p, p.pts, ENDS_DEF); }
  }
  if (G.onFoot) updateFocus();
  // slots are handed out lowest-first, so only draw (and upload) up to the highest one in use, not all of PED.MAX
  let top = -1; for (const p of PED.list) if (p.active && p.slot > top) top = p.slot;
  for (const k in PED.mesh) {
    const m = PED.mesh[k], per = m.count0 / PED.list.length, n = (top + 1) * per;
    m.count = n; m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = n * 16; m.instanceMatrix.needsUpdate = true;
  }
}
