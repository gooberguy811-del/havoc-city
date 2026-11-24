// =====================================================================
//  GAS STATIONS: forecourt, pumps and a walk-in store you can hold up
// =====================================================================
// [x, z, face]: a point inside the block to convert, and which road the forecourt faces
const GAS_SITES = { base: [[-575, 55, 'z0'], [-305, -125, 'x1']], nyc: [[-182.5, 78, 'x0'], [157.5, -182, 'x1']], neon: [[-180, -108, 'x1'], [180, -108, 'x0']], sand: [[90, 135, 'z0'], [-180, 135, 'z0']], perth: [[-450, -105, 'x1'], [240, 410, 'z0']] };
const GAS_BRAND = { base: { col: '#3a5a2a', neon: '#f5b700', tree: 'palm' }, nyc: { col: '#c8352b', neon: '#ffd02e', tree: 'oak' }, neon: { col: '#1f6fd6', neon: '#22e0ff', tree: 'oak' }, sand: { col: '#d0392b', neon: '#ffd02e', tree: 'palm' }, perth: { col: '#1f8a4c', neon: '#ffd02e', tree: 'palm' } };
const GAS_PROD = ['#e8453c', '#f2c12e', '#3b82d6', '#46b35a', '#f08a2c', '#9b59d0', '#f4f4f4', '#e85d9a', '#2fc4c4'];
const ROB_TIME = 6;
const SHOP = { list: [], prompt: '', holdup: false, inside: null, ui: null };

// Local frame on a block: u runs along the front edge, v points into the block
function gsFrame(b, face) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, wx = b.x1 - b.x0, wz = b.z1 - b.z0;
  if (face === 'z0') return { ox: cx, oz: b.z0, ux: 1, uz: 0, vx: 0, vz: 1, W: wx, D: wz };
  if (face === 'z1') return { ox: cx, oz: b.z1, ux: -1, uz: 0, vx: 0, vz: -1, W: wx, D: wz };
  if (face === 'x0') return { ox: b.x0, oz: cz, ux: 0, uz: -1, vx: 1, vz: 0, W: wz, D: wx };
  return { ox: b.x1, oz: cz, ux: 0, uz: 1, vx: -1, vz: 0, W: wz, D: wx };
}
const gsPt = (F, u, v) => [F.ox + u * F.ux + v * F.vx, F.oz + u * F.uz + v * F.vz];
function gsRect(F, u0, v0, u1, v1) { const a = gsPt(F, u0, v0), b = gsPt(F, u1, v1); return { x0: Math.min(a[0], b[0]), z0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), z1: Math.max(a[1], b[1]) }; }
function gsBox(F, u0, v0, u1, v1, y0, y1, col) { const r = gsRect(F, u0, v0, u1, v1); return [r.x1 - r.x0, y1 - y0, r.z1 - r.z0, (r.x0 + r.x1) / 2, (y0 + y1) / 2, (r.z0 + r.z1) / 2, col]; }
const gsYaw = (F, du, dv) => Math.atan2(du * F.ux + dv * F.vx, du * F.uz + dv * F.vz);
// a neon panel on a face that looks back toward the front road (-v)
function gsNeon(F, u, v, y, w, h, col) {
  const [x, z] = gsPt(F, u, v);
  return F.vx !== 0 ? { axis: 'x', dir: Math.sign(-F.vx), x, z, y, w, h, col } : { axis: 'z', dir: Math.sign(-F.vz), x, z, y, w, h, col };
}

function gasBlock(W, b, rng) {
  b.top = 'lot';
  const F = gsFrame(b, b.face || 'z0'), h = b.h, Wd = F.W, Dp = F.D, brand = GAS_BRAND[W.id] || GAS_BRAND.sand;
  const pick = () => GAS_PROD[(rng() * GAS_PROD.length) | 0];
  const D = (u0, v0, u1, v1, y0, y1, col) => W.details.push(gsBox(F, u0, v0, u1, v1, h + y0, h + y1, col));
  const Bx = (u0, v0, u1, v1, top, kind) => { const r = gsRect(F, u0, v0, u1, v1); W.addBox(r.x0, r.z0, r.x1, r.z1, h + top, kind); };
  // ---- forecourt: canopy, pump islands, price pylon ----
  const uc = -Wd * 0.08, vc = 13;
  D(uc - 11, vc - 6, uc + 11, vc + 6, 5.05, 5.75, '#f1efe9');
  D(uc - 11.1, vc - 6.1, uc + 11.1, vc + 6.1, 4.7, 5.3, brand.col);
  for (const du of [-6.5, 0, 6.5]) for (const dv of [-3.4, 3.4]) D(uc + du - 1.3, vc + dv - 0.25, uc + du + 1.3, vc + dv + 0.25, 4.64, 4.7, '#fff6da');
  for (const [du, dv] of [[-9.6, -5.2], [9.6, -5.2], [-9.6, 5.2], [9.6, 5.2]]) { D(uc + du - 0.3, vc + dv - 0.3, uc + du + 0.3, vc + dv + 0.3, 0, 4.7, '#d8d5cf'); Bx(uc + du - 0.3, vc + dv - 0.3, uc + du + 0.3, vc + dv + 0.3, 5, 'p'); }
  for (const du of [-5.5, 0, 5.5]) {
    D(uc + du - 0.65, vc - 2.9, uc + du + 0.65, vc + 2.9, 0, 0.22, '#c8c3b8');
    for (const dv of [-1.6, 1.6]) { const [x, z] = gsPt(F, uc + du, vc + dv); W.props.push({ type: 'pump', x, z, ry: F.ux !== 0 ? Math.PI / 2 : 0 }); }
  }
  for (const du of [-2.75, 2.75]) if (rng() < 0.55) { const [x, z] = gsPt(F, uc + du, vc + (rng() - 0.5) * 2); W.parked.push({ x, z, h: gsYaw(F, 0, rng() < 0.5 ? 1 : -1) }); }
  const pu = Wd / 2 - 4, pv = 3.4;
  D(pu - 0.25, pv - 0.25, pu + 0.25, pv + 0.25, 0, 7.4, '#3a3d42'); Bx(pu - 0.3, pv - 0.3, pu + 0.3, pv + 0.3, 7.4, 'p');
  D(pu - 1.7, pv - 0.3, pu + 1.7, pv + 0.3, 7.2, 10.2, brand.col);
  D(pu - 1.4, pv - 0.33, pu + 1.4, pv + 0.33, 7.45, 8.75, '#14161a');
  for (let k = 0; k < 2; k++) D(pu - 1.1, pv - 0.36, pu + 1.1, pv + 0.36, 7.7 + k * 0.5, 7.98 + k * 0.5, '#ffcf3a');
  W.neons.push(gsNeon(F, pu, pv - 0.34, h + 9.5, 2.8, 0.9, brand.neon));
  // ---- the store (shop-local s across, t from the shopfront inward) ----
  const us = -Wd / 2 + 11.5, vs = 25;
  const S = (s0, t0, s1, t1, y0, y1, col) => D(us + s0, vs + t0, us + s1, vs + t1, y0, y1, col);
  const SB = (s0, t0, s1, t1, top, kind) => Bx(us + s0, vs + t0, us + s1, vs + t1, top, kind);
  const WALL = '#efe9dd', TRIM = '#2a2d33', WOOD = '#7a5236', TOP = '#e6e1d6';
  for (const [s0, t0, s1, t1] of [[-7.5, 0, -7.2, 11], [7.2, 0, 7.5, 11], [-7.5, 10.7, 7.5, 11]]) { S(s0, t0, s1, t1, 0, 4.2, WALL); SB(s0, t0, s1, t1, 4.2, 'b'); }
  for (const [s0, s1] of [[-7.5, -4.3], [-2.5, 7.5]]) {   // glass shopfront either side of the door
    S(s0, 0, s1, 0.3, 0, 0.55, '#5b5f66'); SB(s0, 0, s1, 0.3, 4.2, 'b');
    const n = Math.max(1, Math.round((s1 - s0) / 2.4));
    for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; S(s - 0.07, 0.05, s + 0.07, 0.25, 0.55, 3.0, TRIM); }
  }
  S(-7.2, 0.3, 7.2, 10.7, 0, 0.03, '#bdb7aa');
  S(-4.3, -0.5, -2.5, 0.3, 0, 0.03, '#8f8b84');
  // counter + return around the clerk's corner, till, lottery stand
  S(2.4, 1.4, 3.3, 6.4, 0, 1.0, WOOD); S(2.3, 1.3, 3.4, 6.5, 1.0, 1.08, TOP); SB(2.3, 1.3, 3.4, 6.5, 1.08, 'c');
  S(3.4, 5.6, 5.4, 6.4, 0, 1.0, WOOD); S(3.4, 5.5, 5.5, 6.5, 1.0, 1.08, TOP); SB(3.4, 5.5, 5.5, 6.5, 1.08, 'c');
  S(2.55, 3.1, 3.15, 3.7, 1.08, 1.36, '#22252b'); S(2.62, 3.2, 2.68, 3.6, 1.36, 1.62, '#4fd0ff');
  S(2.5, 4.9, 3.2, 5.6, 1.08, 1.5, '#e0b13a');
  // cigarette wall behind the clerk
  S(6.7, 1.0, 7.2, 5.2, 0.9, 2.7, '#3a3f48'); SB(6.7, 1.0, 7.2, 5.2, 2.7, 'c');
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) S(6.64, 1.1 + k * 1.0, 6.7, 2.0 + k * 1.0, 1.05 + r * 0.42, 1.27 + r * 0.42, pick());
  // two aisles of shelving
  for (const s0 of [-4.7, -1.3]) {
    S(s0, 3.2, s0 + 0.8, 8.2, 0, 1.6, '#d3cfc6'); SB(s0, 3.2, s0 + 0.8, 8.2, 1.6, 'c');
    for (const sx of [s0 - 0.05, s0 + 0.8]) for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const t0 = 3.35 + k * 1.2; S(sx, t0, sx + 0.05, t0 + 1.1, 0.35 + r * 0.42, 0.62 + r * 0.42, pick()); }
  }
  // drinks fridges along the back wall
  S(-7.2, 9.95, 1.6, 10.7, 0, 2.3, '#c9ced6'); SB(-7.2, 9.95, 1.6, 10.7, 2.3, 'c');
  for (let k = 0; k < 7; k++) { const s0 = -7.05 + k * 1.24; S(s0, 9.9, s0 + 1.12, 9.95, 0.15, 2.1, '#9fd6f2'); for (let r = 0; r < 4; r++) S(s0 + 0.12, 9.87, s0 + 1.0, 9.9, 0.3 + r * 0.45, 0.56 + r * 0.45, pick()); }
  // snack rack and coffee bar by the door
  S(0.6, 1.2, 1.6, 2.0, 0, 1.3, '#d9d4c8'); SB(0.6, 1.2, 1.6, 2.0, 1.3, 'c');
  for (let r = 0; r < 3; r++) S(0.55, 1.25, 1.65, 1.95, 0.3 + r * 0.36, 0.5 + r * 0.36, pick());
  S(-7.2, 1.0, -6.4, 2.8, 0, 0.95, '#6b4a33'); S(-7.1, 1.3, -6.6, 1.8, 0.95, 1.55, '#2b2b2e'); SB(-7.2, 1.0, -6.4, 2.8, 0.95, 'c');
  // outside: ice chest, ATM, dumpster
  S(3.6, -1.0, 5.4, -0.2, 0, 1.1, '#f4f6f8'); S(3.58, -1.02, 5.42, -0.18, 0.72, 0.92, '#2d7fd0'); SB(3.6, -1.0, 5.4, -0.2, 1.1, 'c');
  S(-6.6, -0.75, -5.8, -0.15, 0, 1.75, '#55595f'); S(-6.5, -0.78, -5.9, -0.75, 1.0, 1.4, '#53c1ff'); SB(-6.6, -0.75, -5.8, -0.15, 1.75, 'c');
  S(-4, 12.2, -1.6, 13.6, 0, 1.3, '#2f6b45'); SB(-4, 12.2, -1.6, 13.6, 1.3, 'c');
  { const [x, z] = gsPt(F, us + 6.4, vs - 0.8); W.props.push({ type: 'bin', x, z, ry: 0.4 }); }
  // the cutaway: roof, fascia, header and sign hide while you are inside
  const cut = [], glass = [];
  const SC = (s0, t0, s1, t1, y0, y1, col) => cut.push(gsBox(F, us + s0, vs + t0, us + s1, vs + t1, h + y0, h + y1, col));
  SC(-7.8, -0.5, 7.8, 11.3, 4.2, 4.55, '#d9d4ca');
  SC(-7.85, -0.62, 7.85, -0.42, 3.55, 4.6, brand.col);
  SC(-7.5, 0, 7.5, 0.3, 3.0, 4.2, WALL);
  SC(-5, 3, -3.2, 4.4, 4.55, 5.4, '#9aa0a6'); SC(2, 6.5, 3.4, 7.7, 4.55, 5.2, '#9aa0a6');
  for (const [s0, s1] of [[-7.45, -4.35], [-2.45, 7.45]]) glass.push(gsBox(F, us + s0, vs + 0.1, us + s1, vs + 0.2, h + 0.55, h + 3.0, null));
  const sign = gsNeon(F, us + 2.5, vs - 0.64, h + 4.08, 7, 0.66, brand.neon);
  // ---- parking bays beside the store ----
  const pu0 = us + 10.5, pu1 = Wd / 2 - 3; let placed = 0;
  for (let u = pu0; u + 3.2 <= pu1; u += 3.2) {
    for (const uu of u + 6.4 > pu1 ? [u, u + 3.2] : [u]) { const r = gsRect(F, uu - 0.06, vs + 0.5, uu + 0.06, vs + 6); W.marks.push([r.x0, r.z0, r.x1, r.z1, h + 0.012]); }
    if (rng() < 0.3 && placed < 3) { const [x, z] = gsPt(F, u + 1.6, vs + 3.3); W.parked.push({ x, z, h: gsYaw(F, 0, -1) }); placed++; }
  }
  // ---- car wash out back, trees along the rear ----
  let wu0 = 1e9, wu1 = -1e9;
  const wv0 = vs + 12, wv1 = Math.min(Dp - 5, vs + 26);
  if (wv1 - wv0 >= 9 && Wd >= 52) {
    wu0 = Wd / 2 - 17; wu1 = Wd / 2 - 4;
    const r = gsRect(F, wu0, wv0, wu1, wv1);
    W.bldgs.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y: h, h: 5, col: '#e4e0d6', tex: 'house' }); W.addBox(r.x0, r.z0, r.x1, r.z1, h + 5, 'b');
    D(wu0 - 0.05, wv0 - 0.12, wu1 + 0.05, wv0, 3.2, 4.4, brand.col);
    W.neons.push(gsNeon(F, (wu0 + wu1) / 2, wv0 - 0.14, h + 3.8, 6, 0.8, brand.neon));
  }
  for (let u = -Wd / 2 + 5; u < Wd / 2 - 4; u += 8) { if (u > wu0 - 3 && u < wu1 + 3) continue; const [x, z] = gsPt(F, u, Dp - 3.2); addTree(W, brand.tree, x, z, 0.9); }
  // runtime data for the store
  const ir = gsRect(F, us - 7.2, vs + 0.3, us + 7.2, vs + 10.7);
  const [cx, cz] = gsPt(F, us, vs + 5.5), [kx, kz] = gsPt(F, us + 4.6, vs + 3.4), [bx, bz] = gsPt(F, us + 2.85, vs + 4.35);
  const [dx, dz] = gsPt(F, us - 3.4, vs - 2), [gx, gz] = gsPt(F, uc, vc), [mx, mz] = gsPt(F, us + 1.5, vs + 3.9);
  const canopy = gsRect(F, uc - 11.1, vc - 6.1, uc + 11.1, vc + 6.1), shopR = gsRect(F, us - 7.85, vs - 0.62, us + 7.85, vs + 11.3);
  W.stations.push({ kind: 'gas', name: 'Gas station', cx, cz, ix0: ir.x0, iz0: ir.z0, ix1: ir.x1, iz1: ir.z1, kx, kz, kh: gsYaw(F, -1, 0), bx, by: h + 1.08, bz, h, dx, dz, mx, mz, gx, gz, canopy, shopR, fh: gsYaw(F, 0, 1), cut, glass, sign });
  W.miniRects.push(gsRect(F, us - 7.5, vs, us + 7.5, vs + 11));
}

// ---------- runtime ----------
function buildShops() {
  SHOP.list = []; SHOP.inside = null; SHOP.holdup = false; SHOP.prompt = ''; SHOP.menu = null; closeMenu(); MECH.list = [];
  if (!W.stations || !W.stations.length) { buildMechs(); return; }
  if (!WMAT.shopGlass) WMAT.shopGlass = new THREE.MeshStandardMaterial({ color: C('#bfe3f2'), transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, depthWrite: false });
  for (const d of W.stations) {
    const g = new THREE.Group();
    const cut = new THREE.Mesh(mergeGeos(d.cut.map(b => boxG(b[0], b[1], b[2], b[3], b[4], b[5], C(b[6])))), WMAT.roof); cut.castShadow = true; cut.receiveShadow = true; g.add(cut);
    if (d.sign) {
      const s = d.sign, pg = new THREE.PlaneGeometry(s.w, s.h);
      pg.rotateY(s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI)); pg.translate(s.x, s.y, s.z); colorize(pg, C(s.col).multiplyScalar(1.6));
      g.add(new THREE.Mesh(pg, WMAT.neon));
    }
    for (const s of d.signs || []) g.add(signMesh(s));
    W.group.add(g);
    const gl = new THREE.Mesh(mergeGeos(d.glass.map(b => boxG(b[0], b[1], b[2], b[3], b[4], b[5]))), WMAT.shopGlass); gl.renderOrder = 2; W.group.add(gl); d.glassM = gl;
    const bag = new THREE.Mesh(mergeGeos([boxG(0.5, 0.32, 0.34, 0, 0.16, 0, C('#3f8f4e')), boxG(0.52, 0.08, 0.36, 0, 0.2, 0, C('#efe7c4'))]), WMAT.roof);
    bag.visible = false; bag.castShadow = true; W.group.add(bag);
    const st = Object.assign({}, d, { roofG: g, bagM: bag, clerk: null, rob: 0, robbedUntil: 0, cowerT: 0, bag: null, clerkBackT: 0, deadSeen: false });
    SHOP.list.push(st); storeExtras(st);
  }
  buildMechs();
}
function spawnClerk(st) {
  const p = spawnPedAt(st.kx, st.kz, 'clerk'); if (!p) return;
  p.clerk = st; p.state = 'idle'; p.h = st.kh; p.sp = 0; st.clerk = p; st.deadSeen = false;
}
function clerkAI(p, dt) {
  const st = p.clerk, F = PF();
  p.state = 'idle';
  const dx = st.kx - p.x, dz = st.kz - p.z, d = Math.hypot(dx, dz);
  let desH = st.kh, sp = 0;
  if (d > 0.4) { desH = Math.atan2(dx, dz); sp = d > 2 ? 2.6 : 1.2; }
  else if (F && (st.rob > 0 || st.cowerT > GT || SHOP.inside === st)) desH = Math.atan2(F.x - p.x, F.z - p.z);
  pedMove(p, desH, sp, dt, sp > 2);
}
// hands up (and shaking) while being robbed
function clerkPose(p) {
  const st = p.clerk; if (!(st.rob > 0 || st.cowerT > GT)) return;
  const P = p.pts, c = Math.cos(p.h), sn = Math.sin(p.h), s = p.scale, shake = Math.sin(GT * 31 + p.slot) * 0.018;
  for (const [sh, el, hd, sx] of [[2, 4, 6, 1], [3, 5, 7, -1]]) {
    const X = P[sh * 3], Y = P[sh * 3 + 1], Z = P[sh * 3 + 2];
    const ex = sx * 0.2 * s, ey = 0.17 * s, ez = 0.05 * s;
    P[el * 3] = X + ex * c + ez * sn; P[el * 3 + 1] = Y + ey; P[el * 3 + 2] = Z - ex * sn + ez * c;
    const hx = sx * (0.23 + shake) * s, hy = 0.44 * s, hz = 0.07 * s;
    P[hd * 3] = X + hx * c + hz * sn; P[hd * 3 + 1] = Y + hy + shake; P[hd * 3 + 2] = Z - hx * sn + hz * c;
  }
}
function alarmBell() { SFX.bell(); }
function startRobbery(st) {
  st.rob = 0.001; alarmBell();
  if (st.kind === 'bank') { feed('Bank robbery! Keep the teller covered', 'red'); addHeat(1.2, 2, true); return; }
  feed('Robbery! Keep the clerk covered', 'red');
  addHeat(0.4, 1, true);
}
function finishRobbery(st) {
  if (st.kind === 'bank') {
    st.rob = 0; st.robbedUntil = GT + 600; st.cowerT = GT + 60; bankOpen(st); alarmBell();
    feed('The vault is open! Grab the cash and run', 'green'); addHeat(1.8, 4, true); return;
  }
  st.rob = 0; st.robbedUntil = GT + 240; st.cowerT = GT + 30;
  st.bag = { amt: Math.round(rand(450, 1100) / 10) * 10 };
  SFX.ding(); feed('The till is empty. Grab the cash on the counter!', 'green');
  addHeat(0.6, 2, true);
}
function abortRobbery(st) {
  st.rob = 0; st.robbedUntil = GT + 45; st.cowerT = GT + 6;
  feed('Robbery abandoned', 'red');
}
function updateShops(dt) {
  SHOP.prompt = ''; SHOP.holdup = false; SHOP.menu = null; SHOP.carPrompt = false;
  const ui = SHOP.ui || (SHOP.ui = { box: $('#rob'), bar: $('#robBar'), on: false, w: -1 });
  if (!SHOP.list.length) { SHOP.inside = null; if (ui.on) { ui.on = false; ui.box.hidden = true; } return; }
  const F = PF(); if (!F) return;
  const H = G.onFoot && HERO.p ? HERO.p : null, ctl = H && !H.rag && !G.down ? H : null;
  const kb = k => APP.touch ? '' : `<kbd>${k}</kbd> `;
  let inside = null;
  for (const st of SHOP.list) {
    const d = Math.hypot(st.cx - F.x, st.cz - F.z);
    if (H && !st.wrecked && H.x > st.ix0 && H.x < st.ix1 && H.z > st.iz0 && H.z < st.iz1) inside = st;
    // clerk comes and goes with the player; a replacement turns up a while after a death
    if (st.clerk && (!st.clerk.active || st.clerk.clerk !== st)) st.clerk = null;
    if (!st.clerk && !st.wrecked && d < 110 && GT >= st.clerkBackT && (st.clerkBackT === 0 || d > 45)) spawnClerk(st);
    else if (st.clerk && !st.clerk.dead && d > 160) { hidePed(st.clerk); st.clerk.active = false; st.clerk.clerk = null; st.clerk = null; }
    const c = st.clerk;
    if (c && c.dead && !st.deadSeen) {
      st.deadSeen = true; st.clerkBackT = GT + 90;
      if (st.kind === 'gas' && (st.rob > 0 || GT >= st.robbedUntil)) { st.bag = { amt: Math.round(rand(220, 420) / 10) * 10 }; feed('The till is wide open. Grab the cash!', 'green'); st.robbedUntil = GT + 240; }
      else if (st.kind === 'bank' && !st.vault.want) { feed('With the teller down, nobody can open the vault', 'red'); st.robbedUntil = GT + 120; }
      st.rob = 0;
    }
    // the cash bag on the counter
    if (st.bag) {
      st.bagM.visible = true; st.bagM.position.set(st.bx, st.by + 0.02 + Math.sin(GT * 3) * 0.03, st.bz); st.bagM.rotation.y = GT * 1.4;
      if (ctl && Math.hypot(ctl.x - st.bx, ctl.z - st.bz) < 1.7 && Math.abs(ctl.y - st.h) < 1.6) { addCash(st.bag.amt, 'from the till'); SFX.reload(); st.bag = null; st.bagM.visible = false; }
      else if (d > 150) { st.bag = null; st.bagM.visible = false; }
    }
  }
  SHOP.inside = inside;
  for (const st of SHOP.list) st.roofG.visible = st !== inside;
  // robbery state for the store you are in (or just left)
  for (const st of SHOP.list) {
    if (!(st.rob > 0) || st === inside) continue;
    abortRobbery(st);
  }
  const st = inside, robbable = st && (st.kind === 'gas' || st.kind === 'bank'), noun = st && st.kind === 'bank' ? 'bank' : 'store', who = st && st.kind === 'bank' ? 'teller' : 'clerk';
  if (st && ctl && !robbable) storeInside(st, ctl, dt);
  else if (st && ctl) {
    const c = st.clerk, alive = c && c.active && !c.dead;
    if (st.rob > 0) {
      if (alive && !c.rag) {
        const armed = !gunsOn() || ARMS.cur > 0;
        if (armed) {
          st.rob = Math.min(1, st.rob + dt / (st.kind === 'bank' ? BANK_ROB_TIME : ROB_TIME));
          if (gunsOn()) { SHOP.holdup = true; ARMS.cool = Math.max(ARMS.cool, 0.2); const yaw = Math.atan2(c.x - ctl.x, c.z - ctl.z); ARMS.aimYaw = yaw; if (!HERO.in.fwd) ctl.h = lerpA(ctl.h, yaw, damp(10, dt)); }
          SHOP.prompt = st.kind === 'bank' ? 'Keep the teller covered while they open the vault' : 'Keep the clerk covered while they empty the till';
        } else SHOP.prompt = APP.touch ? `Tap GUN to keep your weapon on the ${who}` : `${kb('2–5')}Keep your gun on the ${who}`;
        if (st.rob >= 1) finishRobbery(st);
      } else SHOP.prompt = `Wait for the ${who} to get back up`;
    } else if (st.bag) SHOP.prompt = 'Grab the cash on the counter';
    else if (st.vault && st.cash.some(q => q.amt > 0)) SHOP.prompt = 'Grab the cash in the vault';
    else {
      // the gas station counter is also a shop; a hold-up starts when you point a gun and press shoot
      const atCounter = st.kind === 'gas' && st.mx !== undefined && alive && !c.rag && Math.hypot(ctl.x - st.mx, ctl.z - st.mz) < 2.2;
      if (atCounter) { if (MENU.st !== st) openMenu(st); SHOP.menu = st; }
      const shopTxt = atCounter ? (APP.touch ? 'Tap an item to buy it' : `${kb('1')}–${kb('3')}or click to buy`) : '';
      if (alive && !c.rag && GT >= st.robbedUntil) {
        const dk = Math.hypot(c.x - ctl.x, c.z - ctl.z);
        if (gunsOn()) {
          if (ARMS.cur > 0 && dk < 8.5 && (ARMS.trigger || ARMS.mouse.down)) { startRobbery(st); ARMS.cool = Math.max(ARMS.cool, 0.9); ARMS.mouse.down = false; }
          else if (ARMS.cur > 0) SHOP.prompt = (shopTxt ? shopTxt + ' · ' : '') + (APP.touch ? `Tap SHOOT to hold up the ${noun}` : `${kb('Q')}Hold up the ${noun}`);
          else SHOP.prompt = shopTxt || (APP.touch ? `Tap GUN to pull a weapon and rob the ${noun}` : `${kb('2–5')}Pull a gun to rob the ${noun}`);
        } else {
          if (HERO.punchT > 0 && dk < 3.5) startRobbery(st);
          else SHOP.prompt = shopTxt || (APP.touch ? `Walk up and tap PUNCH to rob the ${noun}` : `${kb('Q')}Threaten the ${who} to rob the ${noun}`);
        }
      } else if (GT < st.robbedUntil && alive) SHOP.prompt = shopTxt || (st.kind === 'bank' ? 'The vault is empty. Come back much later.' : 'The till is empty. Come back later.');
      else if (shopTxt) SHOP.prompt = shopTxt;
    }
  }
  // progress bar
  const robbing = !!(st && st.rob > 0);
  if (ui.on !== robbing) { ui.on = robbing; ui.box.hidden = !robbing; ui.w = -1; if (robbing) ui.box.firstChild.textContent = st.kind === 'bank' ? 'Robbing the bank' : 'Robbing the store'; }
  if (robbing) { const w = Math.round(st.rob * 100); if (w !== ui.w) { ui.w = w; ui.bar.style.width = w + '%'; } }
}
function drawShopIcons(g, toS, size) {
  const k = size * 0.03;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(k * 1.5)}px system-ui, sans-serif`;
  for (const st of [...SHOP.list, ...MECH.list]) {
    const [sx, sy] = toS(st.cx, st.cz), L = st.kind === 'gas' ? null : STORE_LOOK[st.kind];
    g.fillStyle = st.wrecked || st.blown ? '#3a3f48' : L ? L.col : GT < st.robbedUntil ? '#6b7384' : '#3fd18a'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2;
    g.beginPath(); g.arc(sx, sy, k, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#0c0e13'; g.fillText(L ? L.icon : '$', sx, sy + 0.5);
  }
}
