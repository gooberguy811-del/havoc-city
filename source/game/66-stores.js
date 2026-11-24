// =====================================================================
//  MORE STORES: a strip of shops (guns, jewellery, disguises), a bank
//  with a vault to crack, and a mechanic who repairs and resprays your
//  ride. Walk-in stores share the gas station's cutaway + clerk system.
// =====================================================================
// [x, z, face, type]: a point inside the block to convert, and which road it faces
const STORE_SITES = {
  neon: [[108, -108, 'x0', 'gun'], [-180, 36, 'x1', 'jewel'], [36, 180, 'z0', 'disguise'], [-36, 108, 'z0', 'bank'], [180, 36, 'x0', 'mech']],
  sand: [[0, -45, 'z1', 'gun'], [-90, -135, 'z1', 'jewel'], [-180, 45, 'x1', 'disguise'], [90, 45, 'z0', 'bank'], [180, 135, 'z0', 'mech']],
  perth: [[55, -60, 'z1', 'gun'], [125, -120, 'z1', 'jewel'], [-85, -280, 'z1', 'disguise'], [-15, -60, 'z1', 'bank'], [265, 0, 'x0', 'mech']],
  base: [[-305, -35, 'z1', 'gun'], [-395, 55, 'z0', 'jewel'], [-485, -35, 'z1', 'disguise'], [-395, -35, 'z1', 'bank'], [-305, 55, 'z0', 'mech']],
  nyc: [[72.5, -26, 'x0', 'gun'], [-97.5, -78, 'z1', 'jewel'], [72.5, 78, 'z0', 'disguise'], [-97.5, -234, 'z1', 'bank'], [157.5, 78, 'x1', 'mech']]
};
const STORE_LOOK = {
  gun: { name: 'Lock & Load', sign: 'GUNS · AMMO', fg: '#ffb21e', bg: '#16181c', wall: '#c9c4ba', fascia: '#16181c', floor: '#77736b', icon: 'G', col: '#ff8a3d' },
  jewel: { name: 'Gilt & Gem', sign: 'FINE JEWELLERY', fg: '#ffe7a3', bg: '#14121a', wall: '#efe6d8', fascia: '#14121a', floor: '#3a3340', icon: '◆', col: '#5ad1ff' },
  disguise: { name: 'Quick Change', sign: 'DISGUISES', fg: '#ff9ae3', bg: '#2b1640', wall: '#e8e1f0', fascia: '#4a2470', floor: '#b9b2a8', icon: 'D', col: '#c38aff' },
  bank: { name: 'City Savings Bank', sign: 'CITY SAVINGS BANK', fg: '#f4e7c0', bg: '#1d2f4d', wall: '#e7e2d6', fascia: '#1d2f4d', floor: '#cfc8b8', icon: 'B', col: '#ffd24a' },
  mech: { name: 'Fix & Flip', sign: 'REPAIR · RESPRAY', fg: '#7fe3ff', bg: '#1a1d22', wall: '#b9bec4', fascia: '#e4572e', floor: '#55585e', icon: '🔧', col: '#7fe3ff' }
};
const MECH_COST = 100, DISGUISE_COST = 150, BANK_ROB_TIME = 12;
const MECH = { list: [], fade: 0, el: null };
const GARMENT = ['#d22f3c', '#f5b700', '#1f4fd1', '#1e8a4c', '#ff6a13', '#7b2fbe', '#f2f2f2', '#121316', '#e85a9b', '#0fb5c9', '#8a9199', '#a3c639'];

// ---------- world generation ----------
function markStoreBlocks(W, id) {
  for (const [x, z, face, type] of STORE_SITES[id] || []) {
    const b = W.blocks.find(q => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1);
    if (b && b.type !== 'gas') { if (type === 'gun' || type === 'jewel' || type === 'disguise') { b.type = 'store1'; b.store = type; } else b.type = type; b.face = face; }
  }
}
// a walk-in store: glass shopfront with a door, three walls, and a roof + fascia that hide while you are inside
function storeShell(W, F, h, o) {
  const L = STORE_LOOK[o.kind], hw = o.w / 2, u0 = o.u - hw, u1 = o.u + hw, v0 = o.v, v1 = o.v + o.d, ht = o.ht || 4.2;
  const D = (a0, b0, a1, b1, y0, y1, col) => W.details.push(gsBox(F, a0, b0, a1, b1, h + y0, h + y1, col));
  const Bx = (a0, b0, a1, b1, top, kind) => { const r = gsRect(F, a0, b0, a1, b1); return W.addBox(r.x0, r.z0, r.x1, r.z1, h + top, kind); };
  for (const [a0, b0, a1, b1] of [[u0, v0, u0 + 0.3, v1], [u1 - 0.3, v0, u1, v1], [u0, v1 - 0.3, u1, v1]]) { D(a0, b0, a1, b1, 0, ht, L.wall); Bx(a0, b0, a1, b1, ht, 'b'); }
  const dc = o.u + (o.door || 0), dw = o.doorW || 1.9, gTop = Math.min(ht - 1.1, 3.0), glass = [];
  for (const [s0, s1] of [[u0 + 0.3, dc - dw / 2], [dc + dw / 2, u1 - 0.3]]) {
    if (s1 - s0 < 0.3) continue;
    D(s0, v0, s1, v0 + 0.3, 0, 0.55, '#4a4e55'); Bx(s0, v0, s1, v0 + 0.3, ht, 'b');
    const n = Math.max(1, Math.round((s1 - s0) / 2.4));
    for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; D(s - 0.07, v0 + 0.05, s + 0.07, v0 + 0.25, 0.55, gTop, '#2a2d33'); }
    glass.push(gsBox(F, s0 + 0.05, v0 + 0.1, s1 - 0.05, v0 + 0.2, h + 0.55, h + gTop, null));
  }
  D(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3, 0, 0.03, L.floor);
  D(dc - dw / 2, v0 - 0.6, dc + dw / 2, v0 + 0.3, 0, 0.03, '#8f8b84');
  const cut = [], CU = (a0, b0, a1, b1, y0, y1, col) => cut.push(gsBox(F, a0, b0, a1, b1, h + y0, h + y1, col));
  CU(u0 - 0.3, v0 - 0.5, u1 + 0.3, v1 + 0.3, ht, ht + 0.35, '#d9d4ca');
  CU(u0 - 0.35, v0 - 0.62, u1 + 0.35, v0 - 0.42, ht - 0.75, ht + 0.4, L.fascia);
  CU(u0, v0, u1, v0 + 0.3, gTop, ht, L.wall);
  const [sx, sz] = gsPt(F, o.u, v0 - 0.65);
  const signs = [{ x: sx, z: sz, y: h + ht - 0.17, yaw: gsYaw(F, 0, -1), w: Math.min(o.w - 1.2, L.sign.length * 0.5 + 1.2), h: 0.92, text: L.sign, fg: L.fg, bg: L.bg }];
  const ir = gsRect(F, u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3), shopR = gsRect(F, u0 - 0.35, v0 - 0.62, u1 + 0.35, v1 + 0.3);
  const [cx, cz] = gsPt(F, o.u, (v0 + v1) / 2), [dx, dz] = gsPt(F, dc, v0 - 2);
  W.miniRects.push(gsRect(F, u0, v0, u1, v1));
  const S = (s0, t0, s1, t1, y0, y1, col) => D(o.u + s0, v0 + t0, o.u + s1, v0 + t1, y0, y1, col);
  const SB = (s0, t0, s1, t1, top, kind) => Bx(o.u + s0, v0 + t0, o.u + s1, v0 + t1, top, kind || 'c');
  const P = (s, t) => gsPt(F, o.u + s, v0 + t);
  const rec = { kind: o.kind, name: L.name, cx, cz, ix0: ir.x0, iz0: ir.z0, ix1: ir.x1, iz1: ir.z1, h, dx, dz, shopR, top: ht + 0.4, wallCol: L.wall, cut, glass, signs, fh: gsYaw(F, 0, 1), kh: gsYaw(F, 0, -1), alongX: F.ux !== 0 };
  return { rec, S, SB, P, D, Bx, CU, u0, u1, v0, v1, ht };
}
// one walk-in store (gun / jewellery / disguise) with its interior
function storeUnit(W, F, h, kind, u, v, w, rng) {
  const pick = a => a[(rng() * a.length) | 0];
  const K = storeShell(W, F, h, { kind, u, v, w, d: 11, door: kind === 'disguise' ? -3 : kind === 'gun' ? 3 : 0 });
  const { rec, S, SB, P } = K, hs = w / 2 - 0.3;
    if (kind === 'gun') {
      S(-hs, 6.2, hs - 2, 7.0, 0, 0.95, '#3b3530'); S(-hs, 6.15, hs - 1.95, 7.05, 0.95, 1.03, '#22252b'); SB(-hs, 6.15, hs - 1.95, 7.05, 1.05);
      for (let k = 0; k < 4; k++) S(-hs + 0.6 + k * 2.1, 6.4, -hs + 1.3 + k * 2.1, 6.8, 1.03, 1.09, '#101114');
      S(-hs, 10.35, hs, 10.7, 0.8, 3.4, '#5a4632');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const s = -hs + 0.5 + k * (hs * 2 - 1) / 6; S(s, 10.27, s + 1.3, 10.35, 1.2 + r * 0.72, 1.31 + r * 0.72, r % 2 ? '#2a2c30' : '#3b3f45'); S(s, 10.27, s + 0.35, 10.35, 1.08 + r * 0.72, 1.31 + r * 0.72, '#6b4a33'); }
      S(-hs, 1.0, -hs + 0.6, 5.4, 0, 2.2, '#4a4f45'); SB(-hs, 1.0, -hs + 0.6, 5.4, 2.2);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) S(-hs + 0.58, 1.1 + k * 0.7, -hs + 0.65, 1.65 + k * 0.7, 0.3 + r * 0.5, 0.62 + r * 0.5, pick(['#5d6b3a', '#7a2e24', '#c9a23a', '#3a4a5d']));
      for (const t of [2.2, 4.4]) { S(hs - 0.08, t, hs, t + 1.2, 1.4, 2.6, '#f2efe6'); S(hs - 0.1, t + 0.3, hs - 0.08, t + 0.9, 1.7, 2.3, '#c8352b'); S(hs - 0.12, t + 0.48, hs - 0.1, t + 0.72, 1.88, 2.12, '#f2efe6'); }
      [rec.kx, rec.kz] = P(-1, 8.6); [rec.mx, rec.mz] = P(-1, 5.3);
    } else if (kind === 'jewel') {
      rec.cases = [];
      for (const t of [3.7, 6.9]) for (const s of [-hs + 2.1, 0, hs - 2.1]) {
        S(s - 0.85, t - 0.45, s + 0.85, t + 0.45, 0, 0.92, '#2a1f1a'); S(s - 0.9, t - 0.5, s + 0.9, t + 0.5, 0.92, 0.97, '#c9a23a');
        SB(s - 0.9, t - 0.5, s + 0.9, t + 0.5, 1.38);
        const [x, z] = P(s, t); rec.cases.push({ x, z, y: h + 0.97 });
      }
      S(-3, 8.7, 3, 9.3, 0, 1.0, '#2a1f1a'); S(-3.05, 8.65, 3.05, 9.35, 1.0, 1.06, '#c9a23a'); SB(-3.05, 8.65, 3.05, 9.35, 1.06);
      S(-hs, 10.4, hs, 10.7, 0.9, 3.0, '#1d1a22');
      for (let r = 0; r < 3; r++) S(-hs + 0.3, 10.36, hs - 0.3, 10.4, 1.4 + r * 0.55, 1.44 + r * 0.55, '#e8c45a');
      S(-hs, 2, -hs + 0.08, 9, 1.0, 3.0, '#a9c9d9'); S(hs - 0.08, 2, hs, 9, 1.0, 3.0, '#a9c9d9');
      [rec.kx, rec.kz] = P(0, 9.85);
    } else {
      for (const [s, t] of [[-hs + 2.2, 3.6], [-hs + 2.2, 6.6], [1.4, 3.6]]) {
        S(s - 1.6, t - 0.05, s + 1.6, t + 0.05, 1.55, 1.62, '#c9ccd2'); S(s - 1.6, t - 0.05, s - 1.5, t + 0.05, 0, 1.6, '#c9ccd2'); S(s + 1.5, t - 0.05, s + 1.6, t + 0.05, 0, 1.6, '#c9ccd2');
        for (let k = 0; k < 7; k++) S(s - 1.4 + k * 0.42, t - 0.28, s - 1.12 + k * 0.42, t + 0.28, 0.72, 1.52, pick(GARMENT));
        SB(s - 1.6, t - 0.3, s + 1.6, t + 0.3, 1.6);
      }
      S(-hs, 8.3, -hs + 4.4, 8.4, 0, 2.4, '#d9d2e6'); S(-hs + 2.15, 8.4, -hs + 2.25, 10.4, 0, 2.4, '#d9d2e6'); SB(-hs, 8.3, -hs + 4.4, 8.4, 2.4);
      S(-hs + 0.15, 8.22, -hs + 2.1, 8.3, 0.25, 2.3, '#c8352b'); S(-hs + 2.3, 8.22, -hs + 4.3, 8.3, 0.25, 2.3, '#2f6fd9');
      S(hs - 3.2, 7.6, hs, 8.3, 0, 1.0, '#6b4a8a'); S(hs - 3.25, 7.55, hs, 8.35, 1.0, 1.06, '#e9e2f2'); SB(hs - 3.25, 7.55, hs, 8.35, 1.06);
      S(hs - 0.08, 1.4, hs, 5.6, 0.4, 2.6, '#a9c9d9');
      S(-1.6, 10.4, hs, 10.7, 1.55, 1.65, '#5a4632');
      for (let k = 0; k < 6; k++) S(-1.3 + k * 1.0, 10.3, -0.8 + k * 1.0, 10.6, 1.65, 1.95, pick(GARMENT));
      [rec.kx, rec.kz] = P(hs - 1.6, 9.3); [rec.mx, rec.mz] = P(hs - 1.6, 6.6);
    }
  W.stations.push(rec);
  return rec;
}
// a block with a single store: shopfront on the road, parking out back, trees
function singleStoreBlock(W, b, rng) {
  b.top = 'lot';
  const F = gsFrame(b, b.face || 'z0'), h = b.h, Wd = F.W, Dp = F.D;
  const D = (u0, v0, u1, v1, y0, y1, col) => W.details.push(gsBox(F, u0, v0, u1, v1, h + y0, h + y1, col));
  const w = Math.min(16, Wd - 8), u = -Wd / 2 + w / 2 + 4 + (rng() < 0.5 ? 0 : Math.max(0, Wd - w - 8) * 0.5);
  D(-Wd / 2 + 2, 3.2, Wd / 2 - 2, 7, 0, 0.02, '#a9a49a');
  storeUnit(W, F, h, b.store, u, 7, w, rng);
  // the rest of the block: a small lot with a few parked cars and some low buildings
  for (let uu = -Wd / 2 + 4; uu + 3 <= Wd / 2 - 4; uu += 3.2) { if (Math.abs(uu - u) < w / 2 + 2) continue; const r = gsRect(F, uu - 0.06, 8, uu + 0.06, 13.5); W.marks.push([r.x0, r.z0, r.x1, r.z1, h + 0.012]); if (rng() < 0.3) { const [x, z] = gsPt(F, uu + 1.6, 10.8); W.parked.push({ x, z, h: gsYaw(F, 0, -1) }); } }
  if (Dp > 34) for (let uu = -Wd / 2 + 6; uu < Wd / 2 - 6; uu += 13) { const r = gsRect(F, uu - 5, 22, uu + 5, Math.min(Dp - 6, 32)), hh = 6 + rng() * 10; W.bldgs.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y: h, h: hh, col: rp(rng, CITY_COLORS), tex: 'house' }); W.addBox(r.x0, r.z0, r.x1, r.z1, h + hh, 'b'); }
  for (let uu = -Wd / 2 + 4; uu < Wd / 2 - 3; uu += 7) { const [x, z] = gsPt(F, uu, Dp - 3.5); addTree(W, W.id === 'neon' || W.id === 'nyc' ? 'oak' : 'palm', x, z, 0.85); }
}
function bankBlock(W, b, rng) {
  b.top = 'lot';
  const F = gsFrame(b, b.face || 'z0'), h = b.h, Wd = F.W, Dp = F.D;
  const D = (u0, v0, u1, v1, y0, y1, col) => W.details.push(gsBox(F, u0, v0, u1, v1, h + y0, h + y1, col));
  const Bx = (u0, v0, u1, v1, top, kind) => { const r = gsRect(F, u0, v0, u1, v1); return W.addBox(r.x0, r.z0, r.x1, r.z1, h + top, kind); };
  const bw = Math.min(30, Wd - 6), v = 9, hb = bw / 2;
  const K = storeShell(W, F, h, { kind: 'bank', u: 0, v, w: bw, d: 20, ht: 7, doorW: 2.6 });
  const { rec, S, SB, P, CU } = K, hs = hb - 0.3, STONE = '#e7e2d6';
  // portico: steps, columns, pediment
  for (let k = 0; k < 3; k++) D(-hb + 0.6 + k * 0.4, 3.4 + k * 0.6, hb - 0.6 - k * 0.4, v, 0, 0.1 + k * 0.1, k % 2 ? '#e2dccf' : '#d8d2c4');   // wide marble steps
  for (const s of [-1, 1]) { const u = s * (hb + 1.2); D(u - 0.08, 3.2, u + 0.08, 3.36, 0, 10, '#c9ccd2'); D(u, 3.2, u + s * 1.6, 3.28, 8.4, 9.6, s < 0 ? '#1d2f4d' : '#c8352b'); }   // flagpoles
  for (const s of [-1, 1]) { D(s * 2.2 - 0.18, v - 0.75, s * 2.2 + 0.18, v - 0.6, 2.2, 2.8, '#c9a23a'); D(s * 2.2 - 0.12, v - 0.8, s * 2.2 + 0.12, v - 0.55, 2.3, 2.7, '#ffe9b0'); }   // brass lanterns
  const nc = 6;
  for (let k = 0; k < nc; k++) { const u = -hb + 3 + k * (bw - 6) / (nc - 1); D(u - 0.45, 5.0, u + 0.45, 5.9, 0, 7.0, STONE); D(u - 0.6, 4.85, u + 0.6, 6.05, 0, 0.3, '#d8d2c4'); D(u - 0.6, 4.85, u + 0.6, 6.05, 6.75, 7.0, '#d8d2c4'); Bx(u - 0.45, 5.0, u + 0.45, 5.9, 7.0, 'p'); }
  CU(-hb + 1.6, 4.6, hb - 1.6, v, 7.0, 7.9, STONE); CU(-hb + 1.6, 4.55, hb - 1.6, 4.65, 7.0, 7.9, '#d8d2c4');
  for (let k = 0; k < 6; k++) { const inset = 1.6 + (k + 1) * (hb - 2.6) / 6.5; CU(-hb + inset, 4.7, hb - inset, v, 7.9 + k * 0.42, 8.32 + k * 0.42, k === 0 ? '#d8d2c4' : STONE); }   // triangular pediment
  CU(-hb + 1.5, 4.5, hb - 1.5, 4.62, 7.88, 7.98, '#c9a23a');
  rec.signs[0] = Object.assign(rec.signs[0], (() => { const [x, z] = gsPt(F, 0, 4.5); return { x, z, y: h + 7.45, w: Math.min(bw - 6, 13), h: 0.82, fg: '#f2d27a', bg: '#1d2f4d' }; })());
  // marble floor, chandeliers, plants, cameras
  for (let a = 0; a < 7; a++) for (let c = 0; c < 2; c++) { const s0 = -hs + a * (hs * 2 / 7), t0 = 0.4 + c * 4.3; if ((a + c) % 2) S(s0, t0, s0 + hs * 2 / 7, t0 + 4.3, 0.03, 0.04, '#b9b2a2'); }
  for (const s of [-hs * 0.55, 0, hs * 0.55]) { S(s - 0.03, 4.4, s + 0.03, 4.46, 5.2, 7, '#c9a23a'); S(s - 0.9, 3.8, s + 0.9, 5.0, 4.8, 5.2, '#c9a23a'); S(s - 0.7, 4.0, s + 0.7, 4.8, 4.5, 4.8, '#ffe9b0'); }
  for (const s of [-hs + 0.6, hs - 0.6]) { S(s - 0.4, 7.8, s + 0.4, 8.6, 0, 0.6, '#6b4a33'); S(s - 0.5, 7.7, s + 0.5, 8.7, 0.6, 1.9, '#3f8f4e'); }
  for (const s of [-hs + 0.2, hs - 0.2]) S(s - 0.15, 0.4, s + 0.15, 0.8, 6.3, 6.6, '#22252b');
  rec.shopR = gsRect(F, -hb - 0.35, 4.4, hb + 0.35, v + 20.3); rec.top = 7.9;
  // teller counter with glass screens, open at the right end
  S(-hs, 9.0, hs - 4.6, 9.9, 0, 1.15, '#6b4a33'); S(-hs, 8.95, hs - 4.55, 9.95, 1.15, 1.22, '#efe9dd'); SB(-hs, 8.95, hs - 4.55, 9.95, 1.22);
  for (let k = 0; k < 5; k++) { const s = -hs + 1 + k * 4.4; S(s, 9.4, s + 0.06, 9.5, 1.22, 2.4, '#c9a23a'); for (let j = 1; j < 8; j++) S(s + j * 0.5, 9.42, s + j * 0.5 + 0.03, 9.48, 1.22, 2.4, '#c9a23a'); S(s + 1.4, 9.3, s + 2.4, 9.5, 2.45, 2.75, '#1d2f4d'); }
  S(-hs, 9.43, hs - 4.6, 9.47, 1.22, 2.4, '#bfe3f2');
  // lobby: desks and rope line
  S(-hs + 0.5, 2.5, -hs + 3.2, 4.3, 0, 0.8, '#6b4a33'); SB(-hs + 0.5, 2.5, -hs + 3.2, 4.3, 0.8);
  for (let k = 0; k < 4; k++) S(-4 + k * 2.7, 6.5, -3.85 + k * 2.7, 6.65, 0, 0.95, '#c9a23a');
  S(-4, 6.55, 4.1, 6.6, 0.82, 0.86, '#9b2335');
  // the vault: a steel room at the back with a round door
  const VW = '#8e949b';
  S(-6, 14, -5.4, 19.7, 0, 4.2, VW); SB(-6, 14, -5.4, 19.7, 4.2, 'b'); S(5.4, 14, 6, 19.7, 0, 4.2, VW); SB(5.4, 14, 6, 19.7, 4.2, 'b');
  S(-6, 14, -1.6, 14.6, 0, 4.2, VW); SB(-6, 14, -1.6, 14.6, 4.2, 'b'); S(1.6, 14, 6, 14.6, 0, 4.2, VW); SB(1.6, 14, 6, 14.6, 4.2, 'b'); S(-1.6, 14, 1.6, 14.6, 3.3, 4.2, VW);
  CU(-6, 14, 6, 19.7, 4.2, 4.45, VW);
  S(-5.4, 14.6, 5.4, 19.7, 0, 0.04, '#6e737a');
  rec.vaultBox = SB(-1.6, 14.0, 1.6, 14.6, 3.3, 'c');
  const [hx, hz] = P(-1.6, 13.95); rec.vault = { hx, hz, y: h + 1.65, yaw: gsYaw(F, 1, 0), open: 0, want: 0 };
  rec.cash = [[-3.6, 17.4], [0, 18.7], [3.6, 17.4]].map(([s, t]) => { const [x, z] = P(s, t); return { x, z, y: h }; });
  [rec.kx, rec.kz] = P(0, 11.2);
  W.stations.push(rec);
  // forecourt trees and a few parking spaces down the side
  for (const u of [-hb + 0.5, hb - 0.5]) { const [x, z] = gsPt(F, u, 3.6); addTree(W, W.id === 'neon' || W.id === 'nyc' ? 'oak' : 'palm', x, z, 0.8); }
  for (let u = -Wd / 2 + 4; u < Wd / 2 - 3; u += 7) { const [x, z] = gsPt(F, u, Dp - 3.5); addTree(W, W.id === 'neon' || W.id === 'nyc' ? 'oak' : 'palm', x, z, 0.85); }
}
function mechBlock(W, b, rng) {
  b.top = 'lot';
  const F = gsFrame(b, b.face || 'z0'), h = b.h, Wd = F.W, Dp = F.D, L = STORE_LOOK.mech;
  const D = (u0, v0, u1, v1, y0, y1, col) => W.details.push(gsBox(F, u0, v0, u1, v1, h + y0, h + y1, col));
  const Bx = (u0, v0, u1, v1, top, kind) => { const r = gsRect(F, u0, v0, u1, v1); return W.addBox(r.x0, r.z0, r.x1, r.z1, h + top, kind); };
  const gw = 17, gd = 16, ht = 6, uc = -Wd / 2 + gw / 2 + 4, v0 = 7, v1 = v0 + gd, u0 = uc - gw / 2, u1 = uc + gw / 2, bay = 4.6;
  D(-Wd / 2 + 2, 3.2, Wd / 2 - 2, v0, 0, 0.02, '#8d8a84');
  for (const [a0, b0, a1, b1] of [[u0, v0, u0 + 0.35, v1], [u1 - 0.35, v0, u1, v1], [u0, v1 - 0.35, u1, v1], [u0, v0, uc - bay, v0 + 0.35], [uc + bay, v0, u1, v0 + 0.35]]) { D(a0, b0, a1, b1, 0, ht, L.wall); Bx(a0, b0, a1, b1, ht, 'b'); }
  D(uc - bay, v0, uc + bay, v0 + 0.35, 4.7, ht, L.wall);
  D(uc - bay, v0 + 0.05, uc + bay, v0 + 0.5, 4.3, 4.7, '#3a3d42');   // rolled-up door
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) D(uc + s * bay - 0.12, v0 - 0.02, uc + s * bay + 0.12, v0 + 0.02, k * 0.8, k * 0.8 + 0.4, k % 2 ? '#f5b700' : '#1a1d22');
  D(u0 + 0.35, v0 + 0.35, u1 - 0.35, v1 - 0.35, 0, 0.03, L.floor);
  // workbenches, tool chests and tyre stacks along the walls
  D(u0 + 0.35, v0 + 2, u0 + 1.2, v1 - 2, 0, 1.0, '#c8352b'); Bx(u0 + 0.35, v0 + 2, u0 + 1.2, v1 - 2, 1.0, 'c');
  D(u1 - 1.2, v0 + 2, u1 - 0.35, v1 - 5, 0, 0.95, '#6b6f75'); D(u1 - 1.25, v0 + 1.95, u1 - 0.3, v1 - 4.95, 0.95, 1.0, '#3a3d42'); Bx(u1 - 1.2, v0 + 2, u1 - 0.35, v1 - 5, 1.0, 'c');
  for (let k = 0; k < 3; k++) for (let r = 0; r < 4; r++) D(u1 - 1.6 + 0, v1 - 4.4 + k * 1.3, u1 - 0.5, v1 - 3.4 + k * 1.3, r * 0.32, r * 0.32 + 0.28, '#1b1c1f');
  D(u0 + 2, v1 - 0.45, u1 - 2, v1 - 0.35, 1.2, 3.4, '#41464d');
  for (let k = 0; k < 8; k++) D(u0 + 2.4 + k * 1.6, v1 - 0.47, u0 + 3.2 + k * 1.6, v1 - 0.45, 2.0, 2.8, '#c9ccd2');
  // roof, fascia and sign (hidden while you are in the bay)
  const cut = [], CU = (a0, b0, a1, b1, y0, y1, col) => cut.push(gsBox(F, a0, b0, a1, b1, h + y0, h + y1, col));
  CU(u0 - 0.3, v0 - 0.4, u1 + 0.3, v1 + 0.3, ht, ht + 0.35, '#9aa0a6');
  CU(u0 - 0.35, v0 - 0.62, u1 + 0.35, v0 - 0.4, ht - 0.8, ht + 0.4, L.fascia);
  const [sx, sz] = gsPt(F, uc, v0 - 0.65);
  const bayR = gsRect(F, uc - bay + 0.4, v0 + 1.2, uc + bay - 0.4, v1 - 1.2), [cx, cz] = gsPt(F, uc, (v0 + v1) / 2), [ex, ez] = gsPt(F, uc, v0 - 5);
  W.mechs = W.mechs || [];
  W.mechs.push({ kind: 'mech', name: L.name, cx, cz, ex, ez, h, bay: bayR, shopR: gsRect(F, u0 - 0.35, v0 - 0.62, u1 + 0.35, v1 + 0.3), top: ht + 0.4, wallCol: L.wall, cut, glass: [], signs: [{ x: sx, z: sz, y: h + ht - 0.2, yaw: gsYaw(F, 0, -1), w: 9.5, h: 1.0, text: L.sign, fg: L.fg, bg: L.bg }], fh: gsYaw(F, 0, 1) });
  W.miniRects.push(gsRect(F, u0, v0, u1, v1));
  // a scrap lot next door: wrecks waiting for parts, and a couple of cars to "borrow"
  const lu0 = u1 + 4, lu1 = Wd / 2 - 3;
  if (lu1 - lu0 > 8) {
    for (let u = lu0; u + 3 <= lu1; u += 3.2) { const r = gsRect(F, u - 0.06, 8, u + 0.06, 13.5); W.marks.push([r.x0, r.z0, r.x1, r.z1, h + 0.012]); if (rng() < 0.4) { const [x, z] = gsPt(F, u + 1.6, 10.8); W.parked.push({ x, z, h: gsYaw(F, 0, -1) }); } }
    for (let k = 0; k < 5; k++) { const u = lu0 + 1 + rng() * (lu1 - lu0 - 2), vv = 18 + rng() * Math.max(1, Dp - 26); for (let r = 0; r < 3; r++) D(u - 0.45, vv - 0.45, u + 0.45, vv + 0.45, r * 0.3, r * 0.3 + 0.27, '#1b1c1f'); }
  }
  for (let u = -Wd / 2 + 4; u < Wd / 2 - 3; u += 7) { const [x, z] = gsPt(F, u, Dp - 3.5); addTree(W, W.id === 'neon' || W.id === 'nyc' ? 'oak' : 'palm', x, z, 0.85); }
}

// ---------- runtime: signs, jewel cases, the vault, the garage ----------
const signTexCache = new Map();
function signTex(text, fg, bg) {
  const k = text + fg + bg; if (signTexCache.has(k)) return signTexCache.get(k);
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 4; g.strokeRect(6, 6, 500, 84); g.globalAlpha = 1;
  let fs = 64; g.font = `800 ${fs}px system-ui, sans-serif`; while (g.measureText(text).width > 470 && fs > 20) { fs -= 2; g.font = `800 ${fs}px system-ui, sans-serif`; }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = fg; g.shadowBlur = 14; g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); signTexCache.set(k, m); return m;
}
function signMesh(s) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), signTex(s.text, s.fg, s.bg)); m.position.set(s.x, s.y, s.z); m.rotation.y = s.yaw; return m; }
let GEM_GEO = null, GEM_MAT = null, CASH_GEO = null;
function storeExtras(st) {
  if (st.cases) {
    if (!GEM_GEO) {
      const gs = []; const cols = ['#ff3b5c', '#3bd1ff', '#7dff6a', '#ffd23b', '#f4f4f4', '#c38aff'];
      for (let k = 0; k < 7; k++) { const g = new THREE.OctahedronGeometry(rand(0.06, 0.1), 0); g.scale(1, 1.3, 1); g.translate(-0.6 + k * 0.2, 0.1, (k % 2 ? 0.15 : -0.15)); colorize(g, C(cols[k % cols.length])); gs.push(g); }
      GEM_GEO = mergeGeos(gs); GEM_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.08, emissive: C('#3a3030'), emissiveIntensity: 0.6 });
    }
    for (const c of st.cases) {
      const gl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.9), WMAT.shopGlass); gl.position.set(c.x, c.y + 0.21, c.z); if (!st.alongX) gl.rotation.y = Math.PI / 2; gl.renderOrder = 2;
      const gm = new THREE.Mesh(GEM_GEO, GEM_MAT); gm.position.set(c.x, c.y, c.z); if (!st.alongX) gm.rotation.y = Math.PI / 2;
      W.group.add(gl, gm); c.glassM = gl; c.gemM = gm; c.broken = false; c.loot = 0;
    }
    st.restockT = 0;
  }
  if (st.vault) {
    const V = st.vault, g = new THREE.Group(); g.position.set(V.hx, V.y, V.hz); g.rotation.y = V.yaw;
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.5, 40), new THREE.MeshStandardMaterial({ color: C('#b8bec6'), metalness: 0.9, roughness: 0.25 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.09, 8, 40), new THREE.MeshStandardMaterial({ color: C('#d4af37'), metalness: 1, roughness: 0.25 })); rim.rotation.y = Math.PI / 2; rim.position.set(0.26, 0, 1.6); g.add(rim);
    disk.rotation.z = Math.PI / 2; disk.position.set(0, 0, 1.6); disk.castShadow = true; g.add(disk);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16), MAT.chrome || disk.material); hub.rotation.z = Math.PI / 2; hub.position.set(0.32, 0, 1.6); g.add(hub);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), disk.material); sp.position.set(0.38, 0, 1.6); sp.rotation.x = k * Math.PI / 3; g.add(sp); }
    W.group.add(g); V.g = g; V.open = V.want = 0;
    if (!CASH_GEO) { const gs = []; for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.42, 0.16, 0.2); b.translate(-0.33 + (k % 2) * 0.44, 0.08 + r * 0.17, -0.11 + (k >> 1) * 0.22); colorize(b, C(k % 2 ? '#3f8f4e' : '#4fa55e')); gs.push(b); } const pal = new THREE.BoxGeometry(1.0, 0.12, 0.6); pal.translate(0, -0.06, 0); colorize(pal, C('#7a5236')); gs.push(pal); CASH_GEO = mergeGeos(gs); }
    for (const c of st.cash) { const m = new THREE.Mesh(CASH_GEO, WMAT.roof); m.position.set(c.x, c.y + 0.12, c.z); m.castShadow = true; m.visible = false; W.group.add(m); c.m = m; c.amt = 0; }
  }
}
function buildMechs() {
  MECH.list = []; MECH.fade = 0; MECH.hangar = null;
  const hg = W.airport && W.airport.hangar;
  if (hg) { const g = new THREE.Mesh(mergeGeos(hg.cut.map(b => boxG(b[0], b[1], b[2], b[3], b[4], b[5], C(b[6])))), WMAT.roof); g.castShadow = true; g.receiveShadow = true; W.group.add(g); MECH.hangar = { g, r: hg.rect }; }
  for (const d of W.mechs || []) {
    const g = new THREE.Group();
    const cut = new THREE.Mesh(mergeGeos(d.cut.map(b => boxG(b[0], b[1], b[2], b[3], b[4], b[5], C(b[6])))), WMAT.roof); cut.castShadow = true; cut.receiveShadow = true; g.add(cut);
    for (const s of d.signs) g.add(signMesh(s));
    W.group.add(g);
    MECH.list.push(Object.assign({}, d, { roofG: g, busy: 0, done: false, wrecked: false }));
  }
}
// ---------- the buy menu (gun store and disguise shop) ----------
const MENU = { st: null, items: [], el: null };
function storeMenuItems(st) {
  if (st.kind === 'gun') {
    const it = [];
    if (gunsOn()) for (const [i, n, price] of [[1, 48, 50], [2, 120, 120], [3, 18, 90], [4, 3, 350]]) {
      const w = WEAPONS[i], cap = w.ammo0 * 3;
      it.push({ label: `${w.name} ammo`, sub: `+${n}`, price, can: () => ARMS.ammo[i] + ARMS.mag[i] < cap, buy: () => { ARMS.ammo[i] = Math.min(cap, ARMS.ammo[i] + n); if (ARMS.mag[i] === 0 && ARMS.cur === i) startReload(); SFX.reload(); } });
    }
    it.push({ label: 'Body armour', sub: 'Soaks up damage', price: 200, can: () => HERO.armor < 100, buy: () => { HERO.armor = 100; SFX.reload(); } });
    return it;
  }
  if (st.kind === 'dealer') return dealerMenu(st);
  if (st.kind === 'gas') return gasMenu();
  if (st.kind === 'disguise') return [
    { label: 'New outfit', sub: wanted.stars ? 'Police lose track of you' : 'A fresh look', price: DISGUISE_COST, can: () => true, buy: () => disguise(false) },
    { label: 'Your usual look', sub: 'Back to normal', price: 0, can: () => true, buy: () => disguise(true) }
  ];
  return [];
}
function openMenu(st) {
  MENU.st = st; MENU.items = storeMenuItems(st);
  const box = MENU.el || (MENU.el = $('#buy')); if (!box) return;
  $('#buyTitle').textContent = st.name; const list = $('#buyList'); list.innerHTML = '';
  MENU.items.forEach((it, i) => {
    const b = document.createElement('button'); b.className = 'buyItem'; b.type = 'button';
    b.innerHTML = `<kbd>${i + 1}</kbd><b></b><small></small><em>${it.price ? '$' + it.price : 'Free'}</em>`;
    b.querySelector('b').textContent = it.label; b.querySelector('small').textContent = it.sub;
    b.onclick = () => buyItem(i); list.appendChild(b); it.el = b;
  });
  $('#buyNote').textContent = st.kind === 'gun' && !gunsOn() ? 'Guns are switched off in Settings' : '';
  box.hidden = false; refreshMenu();
}
function refreshMenu() { for (const it of MENU.items) if (it.el) { const ok = it.can() && MIS.cash >= it.price; it.el.disabled = !ok; it.el.classList.toggle('maxed', !it.can()); } }
function closeMenu() { if (!MENU.st) return; MENU.st = null; MENU.items = []; if (MENU.el) MENU.el.hidden = true; }
function buyItem(i) {
  const it = MENU.items[i]; if (!it || !MENU.st) return false;
  if (!it.can()) { feed('You already have plenty of that'); return true; }
  if (MIS.cash < it.price) { feed(`You need $${it.price}`, 'red'); return true; }
  if (it.price) addCash(-it.price, it.label.toLowerCase());
  it.buy(); refreshMenu(); return true;
}
// clear the wanted level, unless a cop is close enough to see through it
function loseWanted() {
  if (wanted.stars <= 0 && wanted.heat < 0.5) return false;
  if (copNearby(18)) { feed('A cop is watching. Lose them first', 'red'); return false; }
  wanted.heat = 0; wanted.stars = 0; wanted.unseen = 0; wanted.bust = 0;
  feed('The police lost track of you', 'green'); return true;
}
function disguise(usual) {
  const look = usual ? { skin: HERO_LOOK.skin, hair: '#1b1410', shirt: '#2f6f4f', pants: '#2a3550' } : { skin: HERO_LOOK.skin, hair: pick(['#1b1410', '#6b4a2b', '#d9b45a', '#a83a2a', '#2a2a2a', '#e6e6e6', '#3a5fd0', '#e04f9f']), shirt: pick(GARMENT), pants: pick(['#2a3550', '#1b1c1f', '#6b5a45', '#3f5f45', '#8a8f96', '#5d1f24', '#c9c2b0']) };
  Object.assign(HERO_LOOK, look); if (HERO.p) pedColors(HERO.p, HERO_LOOK);
  if (!usual) { SFX.ding(); if (!loseWanted()) feed('New look. Nobody recognises you', 'green'); }
}
// ---------- per-store behaviour inside (called from updateShops) ----------
function storeInside(st, ctl, dt) {
  const kb = k => APP.touch ? '' : `<kbd>${k}</kbd> `;
  const c = st.clerk, alive = c && c.active && !c.dead && !c.rag;
  if (st.kind === 'gun' || st.kind === 'disguise' || st.kind === 'dealer') {
    const near = alive && Math.hypot(ctl.x - st.mx, ctl.z - st.mz) < 2.1;
    if (near) { if (MENU.st !== st) openMenu(st); SHOP.menu = st; SHOP.prompt = APP.touch ? 'Tap an item to buy it' : `${kb('1')}–${kb(String(MENU.items.length))}or click to buy`; }
    else SHOP.prompt = alive ? (st.kind === 'dealer' ? 'Walk up to the desk to buy a car. Sell stolen cars in the WE BUY CARS bay outside' : 'Walk up to the counter to shop') : 'Nobody is serving';
  } else if (st.kind === 'jewel') {
    const left = st.cases.filter(q => !q.broken).length, loose = st.cases.some(q => q.loot > 0);
    if (loose) SHOP.prompt = 'Grab the jewels';
    else if (left) SHOP.prompt = gunsOn() ? (APP.touch ? 'Smash a display case: PUNCH or shoot it' : `${kb('Q')}Smash the display cases`) : `${kb('Q')}Punch the display cases`;
    else SHOP.prompt = 'Cleaned out. Get out before the police arrive';
  }
}
function smashCase(st, c, byPlayer) {
  if (c.broken) return;
  c.broken = true; c.glassM.visible = false; c.loot = Math.round(rand(180, 340) / 10) * 10; c.gemM.position.y = c.y + 0.05;
  for (let k = 0; k < 26; k++) FX.debris.emit(c.x + rand(-0.8, 0.8), c.y + rand(0.1, 0.4), c.z + rand(-0.4, 0.4), rand(-3, 3), rand(1, 3.5), rand(-3, 3), rand(1, 2), rand(0.03, 0.07), COL.glass, 0.9, 18, 0.3, 0, 3);
  SFX.glass(clamp(1 - Math.hypot(c.x - camera.position.x, c.z - camera.position.z) / 60, 0.1, 1));
  st.cowerT = GT + 25; st.restockT = GT + 300;
  if (byPlayer) { if (!st.alarmT || GT - st.alarmT > 20) { st.alarmT = GT; alarmBell(); feed('The jewellery store alarm is ringing!', 'red'); } addHeat(0.5, 2, true); }
}
function jewelAt(x, y, z, r, byPlayer) {
  for (const st of SHOP.list) { if (!st.cases || st.wrecked) continue; if (Math.abs(st.cx - x) > 14 || Math.abs(st.cz - z) > 14) continue; for (const c of st.cases) if (!c.broken && Math.hypot(c.x - x, c.z - z) < r && y < c.y + 1.2) smashCase(st, c, byPlayer); }
}
function storePunch(p, fx, fz) { if (SHOP.inside && SHOP.inside.cases) jewelAt(p.x + fx * 1.1, p.y + 1, p.z + fz * 1.1, 1.25, true); }
function storeShot(h, byPlayer) { if (h && h.type === 'world' && h.obj && h.obj.kind === 'c') jewelAt(h.x, h.y, h.z, 1.05, byPlayer); }
// ---------- bank: vault opens once the teller has been made to cooperate ----------
function bankOpen(st) {
  st.vault.want = 1; W.boxGrid.remove(st.vaultBox, st.vaultBox.x0, st.vaultBox.z0, st.vaultBox.x1, st.vaultBox.z1); st.vaultBox.h = st.h - 3;
  for (const c of st.cash) { c.amt = Math.round(rand(1100, 1900) / 50) * 50; c.m.visible = true; }
  SFX.clank(1.2);
}
function bankReset(st) {
  if (st.vault.want) { st.vault.want = 0; st.vaultBox.h = st.h + 3.3; W.boxGrid.insert(st.vaultBox, st.vaultBox.x0, st.vaultBox.z0, st.vaultBox.x1, st.vaultBox.z1); }
  for (const c of st.cash) { c.amt = 0; c.m.visible = false; }
}
// ---------- mechanic: drive in, stop, get fixed up and resprayed ----------
function mechService(m) {
  const v = G.player; if (!v) return;
  m.busy = 2.6; m.swapped = false; m.lock = { x: v.x, z: v.z, h: v.h };
  SHOP.prompt = '';
}
function freshCopy(v, cfg) {
  const n = new Vehicle(cfg, 'player', { police: v.police });
  n.place(v.x, v.z, v.h, 0); n.own = v.own; n.mission = v.mission; n.nitro = 1;
  if (n.bike) setRiderLook(n.model, Object.assign({ helmet: '#121316' }, HERO_LOOK));
  VEH.list.push(n);
  if (typeof headSpot !== 'undefined' && headSpot.parent) headSpot.parent.remove(headSpot, headSpot.target);
  if (typeof headSpot !== 'undefined') n.model.root.add(headSpot, headSpot.target);
  if (MIS.car === v) MIS.car = n;
  v.remove(); G.player = n; return n;
}
// wrecked gas stations and shops are rebuilt a couple of minutes later, while you are elsewhere
function updateRebuild() {
  const F = PF(); if (!F || !W) return;
  if (!W.pumpHome) { W.pumpHome = new Map(); for (const p of W.props) if (p.type === 'pump') W.pumpHome.set(p, { x: p.x, y: p.y, z: p.z, ry: p.ry }); }
  for (const st of [...SHOP.list, ...MECH.list]) {
    if (!st.wrecked && !st.blown) { st.ruinT = 0; continue; }
    if (!st.ruinT) st.ruinT = GT;
    if (GT - st.ruinT < 150 || Math.hypot(F.x - st.cx, F.z - st.cz) < 140) continue;
    for (const s of STR.list) if (s.station === st) restoreStruct(s);
    if (st.gx !== undefined) for (const [p, h] of W.pumpHome) {
      if (p.st === 0 || Math.hypot(h.x - st.gx, h.z - st.gz) > 18) continue;
      Object.assign(p, h); p.st = 0; p.hidden = false; const i = PROPS.active.indexOf(p); if (i >= 0) PROPS.active.splice(i, 1);
      const rec = W.inst.props.pump; rec.mesh.setMatrixAt(p.idx, propMatrix(p)); rec.mesh.instanceMatrix.needsUpdate = true; if (rec.head) { rec.head.setMatrixAt(p.idx, propMatrix(p)); rec.head.instanceMatrix.needsUpdate = true; }
    }
    for (let i = BOOM.fires.length - 1; i >= 0; i--) { const f = BOOM.fires[i]; if (Math.hypot(f.x - st.cx, f.z - st.cz) < 35) BOOM.fires.splice(i, 1); }
    st.wrecked = false; st.blown = false; st.rob = 0; st.robbedUntil = 0; st.clerkBackT = 0; st.ruinT = 0;
    rebuildMiniBldgs();
  }
}
function updateStores(dt) {
  if (((GT * 0.5) | 0) !== MECH.rbT) { MECH.rbT = (GT * 0.5) | 0; updateRebuild(); }
  updateDealer(dt); updateCarrots(dt); updateThieves(dt);
  // jewels on the counter and cash in the vault
  const H = G.onFoot && HERO.p && !HERO.p.rag && !G.down ? HERO.p : null, F = PF();
  for (const st of SHOP.list) {
    if (st.cases) {
      for (const c of st.cases) {
        if (c.loot > 0) { c.gemM.rotation.y += dt * 2; if (H && Math.hypot(H.x - c.x, H.z - c.z) < 1.5) { addCash(c.loot, 'in jewels'); SFX.ding(); c.loot = 0; c.gemM.visible = false; } }
      }
      if (st.restockT && GT > st.restockT && F && Math.hypot(F.x - st.cx, F.z - st.cz) > 120) { st.restockT = 0; for (const c of st.cases) { c.broken = false; c.loot = 0; c.glassM.visible = true; c.gemM.visible = true; c.gemM.position.y = c.y; } }
    }
    if (st.vault) {
      const V = st.vault; V.open = V.want ? Math.min(1, V.open + dt * 0.5) : Math.max(0, V.open - dt * 0.5);
      V.g.rotation.y = V.yaw + V.open * 1.75;
      for (const c of st.cash) if (c.amt > 0 && H && Math.hypot(H.x - c.x, H.z - c.z) < 1.6) { addCash(c.amt, 'from the vault'); SFX.reload(); c.amt = 0; c.m.visible = false; }
      if (V.want && GT > st.robbedUntil - 420 && F && Math.hypot(F.x - st.cx, F.z - st.cz) > 130) bankReset(st);
    }
  }
  if (MECH.hangar && F) { const r = MECH.hangar.r, inside = F.x > r.x0 && F.x < r.x1 && F.z > r.z0 && F.z < r.z1 && (F.y || 0) < 14; if (MECH.hangar.g.visible === inside) MECH.hangar.g.visible = !inside; }
  // mechanic
  const v = G.player, fade = MECH.el || (MECH.el = $('#fade'));
  let fadeT = 0;
  for (const m of MECH.list) {
    const inBay = v && !G.plane && !G.down && !m.wrecked && v.x > m.bay.x0 && v.x < m.bay.x1 && v.z > m.bay.z0 && v.z < m.bay.z1;
    m.roofG.visible = !(inBay || m.busy > 0) || m.wrecked;
    if (m.busy > 0) {
      m.busy -= dt; const t = 2.6 - m.busy;
      if (G.player) { const P = G.player; P.x = m.lock.x; P.z = m.lock.z; P.h = m.lock.h; P.vx = P.vz = P.av = 0; }
      fadeT = t < 0.7 ? t / 0.7 : t < 1.7 ? 1 : Math.max(0, 1 - (t - 1.7) / 0.9);
      if (!m.swapped && t > 0.9 && G.player) {
        m.swapped = true; const old = G.player, cfg = Object.assign({}, old.cfg);
        cfg.paint = pick(PAINTS.filter(p => p.toLowerCase() !== String(cfg.paint).toLowerCase()));
        const fresh = freshCopy(old, cfg); m.lock.x = fresh.x; m.lock.z = fresh.z;
        addCash(-MECH_COST, 'repair and respray');
        if (!loseWanted()) feed('Good as new, with a fresh coat of paint', 'green');
        SFX.ding();
      }
      if (m.busy <= 0) { m.busy = 0; m.done = true; }
      continue;
    }
    if (!inBay) { m.done = false; continue; }
    if (m.done) { SHOP.prompt = 'All done. Drive safe'; SHOP.carPrompt = true; continue; }
    SHOP.carPrompt = true;
    if (MIS.cash < MECH_COST) SHOP.prompt = `A repair and respray costs $${MECH_COST}`;
    else if (v.speed > 2.5) SHOP.prompt = `Stop in the bay: repair and respray for $${MECH_COST}${wanted.stars ? ', and the police lose you' : ''}`;
    else mechService(m);
  }
  MECH.fade = fadeT;
  if (fade) { const o = fadeT.toFixed(2); if (fade.style.opacity !== o) fade.style.opacity = o; }
  // armour on the HUD
  const ar = Math.round(HERO.armor || 0);
  if (MECH.ar !== ar) { MECH.ar = ar; const a = $('#arFill'); if (a) { a.style.width = ar + '%'; $('#arRow').hidden = ar <= 0; $('#arLabel').hidden = ar <= 0; } }
  if (MENU.st && SHOP.menu !== MENU.st) closeMenu();
  else if (MENU.st && ((GT * 4) | 0) !== MENU.tick) { MENU.tick = (GT * 4) | 0; refreshMenu(); }
}
function storeIcon(st) { return STORE_LOOK[st.kind] || null; }
