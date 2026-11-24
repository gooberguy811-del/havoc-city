// =====================================================================
//  WORLD: map generation (Neon Heights, Sandport), meshes, props, lights
// =====================================================================
let W = null;
let GT = 0; // game time (seconds)
const LO = 3; // lane offset from road centre
class Grid {
  constructor(cell, tag) { this.c = cell; this.m = new Map(); this.st = 1; this.f = '_g' + tag; }
  k(ix, iz) { return ix * 100003 + iz; }
  insert(o, x0, z0, x1, z1) {
    const c = this.c;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
      const k = this.k(ix, iz); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(o);
    }
  }
  remove(o, x0, z0, x1, z1) {
    const c = this.c;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
      const a = this.m.get(this.k(ix, iz)); if (!a) continue; const i = a.indexOf(o); if (i >= 0) a.splice(i, 1);
    }
  }
  query(x0, z0, x1, z1, out) {
    out.length = 0; const st = ++this.st, c = this.c, f = this.f;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
      const a = this.m.get(this.k(ix, iz)); if (!a) continue;
      for (const o of a) if (o[f] !== st) { o[f] = st; out.push(o); }
    }
    return out;
  }
}
function heightAt(x, z) {
  if (!W) return 0;
  if (W.waters && waterAt(x, z)) return WATER_BED;
  let h = 0; const bg = W.blockGrid;
  const a = bg.m.get(bg.k(Math.floor(x / bg.c), Math.floor(z / bg.c)));
  if (a) for (const b of a) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) { h = b.h; break; }
  for (const r of W.ramps) {
    if (x < r.bx0 || x > r.bx1 || z < r.bz0 || z > r.bz1) continue;
    const along = (x - r.sx) * r.dx + (z - r.sz) * r.dz, across = (x - r.x) * (-r.dz) + (z - r.z) * r.dx;
    if (along >= 0 && along <= r.len && Math.abs(across) <= r.w / 2) h = Math.max(h, r.base + r.h * along / r.len);
  }
  return h;
}
function lightState(n, axis) {
  const t = (GT + n.lightOff) % 18;
  if (axis === 'z') return t < 7.5 ? 'G' : t < 9 ? 'Y' : 'R';
  return t < 9 ? 'R' : t < 16.5 ? 'G' : 'Y';
}
const CITY_COLORS = ['#c9c4bb', '#a9b1b8', '#8b8f94', '#d8cfc0', '#b7a58f', '#9aa7b5', '#cdb9a0', '#7d8792', '#e0dcd4', '#a28c7a', '#6f7b88', '#bfc8cf', '#8f7d6e', '#d4c6b0', '#5f6b78'];
const HOUSE_COLORS = ['#f1d9b5', '#e9c4a0', '#f3e6cc', '#d9b49a', '#f0cfc0', '#cfe0d4', '#e7d7a6', '#f6efe2', '#d6c1e0', '#bcd5e6', '#f2c6a8', '#e3e8ec'];
const NEON_COLORS = ['#ff2e88', '#22e0ff', '#b44dff', '#ffd02e', '#3dff8b', '#ff5a2e'];
const rp = (rng, a) => a[(rng() * a.length) | 0];

function genWorld(id) {
  const rng = mulberry32(id === 'neon' ? 90210 : 31337);
  const W = { id, nodes: [], edges: [], blocks: [], bldgs: [], details: [], boxes: [], ramps: [], props: [], trees: [], parked: [], flats: [], neons: [], marks: [], decor: [], custom: [], roofs: [], bills: [], waters: null, dry: [], hw: 6, rng, rng2: mulberry32(id.length * 977 + 13) };
  const addNode = (x, z) => { W.nodes.push({ id: W.nodes.length, x, z, edges: [] }); return W.nodes.length - 1; };
  const addEdge = (a, b) => { const A = W.nodes[a], B = W.nodes[b]; const e = { id: W.edges.length, a, b, len: Math.hypot(B.x - A.x, B.z - A.z), axis: Math.abs(B.x - A.x) > Math.abs(B.z - A.z) ? 'x' : 'z' }; W.edges.push(e); A.edges.push(e.id); B.edges.push(e.id); };
  W.addBox = (x0, z0, x1, z1, h, kind) => { const b = { x0, z0, x1, z1, h, kind }; W.boxes.push(b); return b; };
  const allSides = { n: 1, s: 1, e: 1, w: 1 };
  if (id === 'neon') {
    W.name = 'Neon Heights'; W.style = 'city';
    const N = 7, S = 72, hw = 6, o = -(N - 1) * S / 2;
    const nid = (i, j) => j * N + i;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) addNode(o + i * S, o + j * S);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (i < N - 1) addEdge(nid(i, j), nid(i + 1, j)); if (j < N - 1) addEdge(nid(i, j), nid(i, j + 1)); }
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      let type = 'city';
      if (i === 2 && j === 2) type = 'park'; else if (i === 4 && j === 3) type = 'parking'; else if (i === 1 && j === 4) type = 'plaza';
      W.blocks.push({ x0: o + i * S + hw, x1: o + (i + 1) * S - hw, z0: o + j * S + hw, z1: o + (j + 1) * S - hw, h: 0.15, type, sides: allSides });
    }
    const m = o - hw, M = -o + hw, E = 38;
    W.blocks.push({ x0: m - E, x1: m, z0: m - E, z1: M + E, h: 0.15, type: 'margin', sides: { e: 1 } });
    W.blocks.push({ x0: M, x1: M + E, z0: m - E, z1: M + E, h: 0.15, type: 'margin', sides: { w: 1 } });
    W.blocks.push({ x0: m, x1: M, z0: m - E, z1: m, h: 0.15, type: 'margin', sides: { s: 1 } });
    W.blocks.push({ x0: m, x1: M, z0: M, z1: M + E, h: 0.15, type: 'margin', sides: { n: 1 } });
    W.bounds = { x0: m - E, x1: M + E, z0: m - E, z1: M + E };
    W.spawnEdges = [[nid(3, 3), nid(3, 4)], [nid(1, 1), nid(2, 1)], [nid(5, 4), nid(5, 5)]];
    W.groundCol = '#2a2c30'; W.miniBg = 'rgba(14,16,21,.92)'; W.miniFlat = '#1f232b';
  } else if (id === 'perth') {
    genPerth(W, rng, addNode, addEdge);
  } else if (id === 'nyc') {
    genNYC(W, rng, addNode, addEdge);
  } else if (id === 'base') {
    genBase(W, rng, addNode, addEdge);
  } else {
    W.name = 'Sandport'; W.style = 'town';
    const NI = 6, NJ = 5, S = 90, hw = 6, ox = -225, oz = -180;
    const nid = (i, j) => j * NI + i;
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) addNode(ox + i * S, oz + j * S);
    const removed = new Set(['2,2|2,3', '2,3|2,4', '1,3|2,3', '2,3|3,3', '4,1|4,2']);
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
      if (i < NI - 1 && !removed.has(`${i},${j}|${i + 1},${j}`)) addEdge(nid(i, j), nid(i + 1, j));
      if (j < NJ - 1 && !removed.has(`${i},${j}|${i},${j + 1}`)) addEdge(nid(i, j), nid(i, j + 1));
    }
    for (let j = 0; j < NJ - 1; j++) for (let i = 0; i < NI - 1; i++) {
      const stunt = (i === 1 || i === 2) && (j === 2 || j === 3);
      if (stunt) { if (i === 1 && j === 2) W.blocks.push({ x0: ox + S + hw, x1: ox + 3 * S - hw, z0: oz + 2 * S + hw, z1: oz + 4 * S - hw, h: 0.15, type: 'stunt', sides: allSides }); continue; }
      if (j === 1 && (i === 3 || i === 4)) { if (i === 3) W.blocks.push({ x0: ox + 3 * S + hw, x1: ox + 5 * S - hw, z0: oz + S + hw, z1: oz + 2 * S - hw, h: 0.15, type: 'mall', sides: allSides }); continue; }
      let type = 'house'; if (i === 3 && j === 3) type = 'gas'; if (i === 0 && j === 0) type = 'parkS';
      W.blocks.push({ x0: ox + i * S + hw, x1: ox + (i + 1) * S - hw, z0: oz + j * S + hw, z1: oz + (j + 1) * S - hw, h: 0.15, type, sides: allSides });
    }
    const ex = ox + 5 * S + hw; // east road outer edge (231)
    W.flats.push({ x0: ex, x1: 300, z0: oz - 70, z1: -oz + 70, type: 'beach' });
    W.flats.push({ x0: -300, x1: ox - hw, z0: oz - 70, z1: -oz + 70, type: 'desert' });
    W.flats.push({ x0: ox - hw, x1: ex, z0: oz - 70, z1: oz - hw, type: 'desert' });
    W.flats.push({ x0: ox - hw, x1: ex, z0: -oz + hw, z1: -oz + 70, type: 'desert' });
    W.bounds = { x0: -300, x1: 300, z0: oz - 70, z1: -oz + 70 };
    W.waters = [{ x0: 302.5, x1: 1400, z0: -1400, z1: 1400 }];
    W.spawnEdges = [[nid(5, 2), nid(5, 3)], [nid(3, 0), nid(4, 0)], [nid(0, 1), nid(0, 2)]];
    W.groundCol = '#cdb48a'; W.miniBg = 'rgba(54,46,33,.92)'; W.miniFlat = '#5a4c36';
  }
  W.stations = []; W.miniRects = []; W.mechs = []; W.forSale = [];
  genAirport(W, id);
  for (const [x, z, face] of GAS_SITES[id] || []) { const b = W.blocks.find(q => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1); if (b) { b.type = 'gas'; b.face = face; } }
  markStoreBlocks(W, id); markDealerBlock(W, id); markConstructBlock(W, id); markSchoolBlocks(W, id);
  // ---------- fill blocks ----------
  for (const b of W.blocks) {
    if (b.type === 'city') cityBlock(W, b, rng);
    else if (b.type === 'park') parkBlock(W, b, rng);
    else if (b.type === 'parking') parkingBlock(W, b, rng);
    else if (b.type === 'plaza') plazaBlock(W, b, rng);
    else if (b.type === 'house') houseBlock(W, b, rng);
    else if (b.type === 'mall') mallBlock(W, b, rng);
    else if (b.type === 'gas') gasBlock(W, b, rng);
    else if (b.type === 'shops') stripBlock(W, b, rng);
    else if (b.type === 'bank') bankBlock(W, b, rng);
    else if (b.type === 'mech') mechBlock(W, b, rng);
    else if (b.type === 'dealer') dealerBlock(W, b, rng);
    else if (b.type === 'construct') constructBlock(W, b, rng);
    else if (b.type === 'cpark') cparkBlock(W, b, rng);
    else if (b.type === 'tsq') tsqBlock(W, b, rng);
    else if (b.type === 'spire') spireBlock(W, b, rng);
    else if (b.type === 'store1') singleStoreBlock(W, b, rng);
    else if (b.type === 'stunt') stuntBlock(W, b, rng);
    else if (b.type === 'parkS') sandParkBlock(W, b, rng);
    else if (b.type === 'rail') railBlock(W, b, rng);
    else if (b.type === 'kingspark') kingsParkBlock(W, b, rng);
    else if (b.type === 'zoo') zooBlock(W, b, rng);
    else if (b.type === 'stadium') stadiumBlock(W, b, rng);
    else if (BLOCK_FILL[b.type]) BLOCK_FILL[b.type](W, b, rng);
    sideProps(W, b, rng);
  }
  for (const f of W.flats) flatFill(W, f, rng);
  // boundary walls
  const B = W.bounds, T = 2;
  W.addBox(B.x0 - T, B.z0 - T, B.x1 + T, B.z0, 1.4, 'wall'); W.addBox(B.x0 - T, B.z1, B.x1 + T, B.z1 + T, 1.4, 'wall');
  W.addBox(B.x0 - T, B.z0, B.x0, B.z1, 1.4, 'wall'); W.addBox(B.x1, B.z0, B.x1 + T, B.z1, 1.4, 'wall');
  finalizeWorld(W);
  return W;
}

function addTree(W, type, x, z, s) {
  { const ps = PUG_SITES[W.id]; if (ps && Math.hypot(x - ps[0], z - ps[1]) < 6) return; }   // keep the secret pug in the open
  W.trees.push({ type, x, z, s: s || 1, r: W.rng() * TAU });
  const r = type === 'oak' ? 0.4 : 0.32;
  W.addBox(x - r, z - r, x + r, z + r, type === 'cactus' ? 3 : 6, 'tree');
}
function cityBlock(W, b, rng) {
  const ix0 = b.x0 + 3.4, ix1 = b.x1 - 3.4, iz0 = b.z0 + 3.4, iz1 = b.z1 - 3.4;
  const nx = rng() < 0.3 ? 1 : rng() < 0.75 ? 2 : 3, nz = rng() < 0.3 ? 1 : rng() < 0.75 ? 2 : 3;
  const cuts = (a0, a1, n) => { const c = [a0]; for (let i = 1; i < n; i++) c.push(lerp(a0, a1, i / n + (rng() - 0.5) * 0.12)); c.push(a1); return c; };
  const cx = cuts(ix0, ix1, nx), cz = cuts(iz0, iz1, nz);
  const cc = W.cityC || { x: 0, z: 0, r: 270, max: 100, min: 16 };
  const cd = Math.hypot((b.x0 + b.x1) / 2 - cc.x, (b.z0 + b.z1) / 2 - cc.z);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (rng() < 0.05) continue;
    const g = 0.6 + (rng() < 0.25 ? 1.8 : 0);
    const x0 = cx[i] + (i > 0 ? g : 0), x1 = cx[i + 1] - (i < nx - 1 ? g : 0), z0 = cz[j] + (j > 0 ? g : 0), z1 = cz[j + 1] - (j < nz - 1 ? g : 0);
    let h = lerp(b.hMax || cc.max, b.hMin || cc.min, clamp(cd / cc.r, 0, 1)) * (0.4 + rng() * 0.95); if (rng() < 0.07) h *= 1.7; h = Math.min(220, Math.max(7.2, Math.round(h / 3.6) * 3.6));
    const col = rp(rng, CITY_COLORS);
    W.bldgs.push({ x0, z0, x1, z1, y: b.h, h, col: b.tex === 'house' ? rp(rng, PERTH_HOUSE) : col, tex: b.tex || 'office', street: b.tex !== 'house' });
    W.addBox(x0, z0, x1, z1, b.h + h, 'b');
    let topY = b.h + h, tx0 = x0, tx1 = x1, tz0 = z0, tz1 = z1;
    if (h > 36 && rng() < 0.55) {
      const ins = Math.min(x1 - x0, z1 - z0) * 0.18, h2 = Math.round(h * (0.15 + rng() * 0.3) / 3.6) * 3.6 + 3.6;
      tx0 = x0 + ins; tx1 = x1 - ins; tz0 = z0 + ins; tz1 = z1 - ins;
      W.bldgs.push({ x0: tx0, z0: tz0, x1: tx1, z1: tz1, y: topY, h: h2, col, tex: 'office' }); topY += h2;
    }
    // roof details
    const dc = '#5d6066';
    const nAC = 1 + ((rng() * 3) | 0);
    for (let k = 0; k < nAC; k++) { const w = 1.5 + rng() * 2, d = 1.5 + rng() * 2; const x = lerp(tx0 + w, tx1 - w, rng()), z = lerp(tz0 + d, tz1 - d, rng()); W.details.push([w, 1 + rng(), d, x, topY + 0.5, z, rng() < 0.5 ? dc : '#8b8e93']); }
    if (h > 50 && rng() < 0.6) W.details.push([0.35, 9, 0.35, (tx0 + tx1) / 2, topY + 4.5, (tz0 + tz1) / 2, '#3a3d42']);
    W.details.push([tx1 - tx0, 0.7, 0.3, (tx0 + tx1) / 2, topY + 0.35, tz0 + 0.15, '#6e7178'], [tx1 - tx0, 0.7, 0.3, (tx0 + tx1) / 2, topY + 0.35, tz1 - 0.15, '#6e7178']);
    { const r2 = W.rng2;   // stair hut, and now and then a billboard facing the street
      W.details.push([0.3, 0.7, tz1 - tz0 - 0.6, tx0 + 0.15, topY + 0.35, (tz0 + tz1) / 2, '#6e7178'], [0.3, 0.7, tz1 - tz0 - 0.6, tx1 - 0.15, topY + 0.35, (tz0 + tz1) / 2, '#6e7178']);
      if (tx1 - tx0 > 8 && tz1 - tz0 > 8 && r2() < 0.7) W.details.push([3, 2.8, 3.4, lerp(tx0 + 3, tx1 - 3, r2()), topY + 1.4, lerp(tz0 + 3, tz1 - 3, r2()), '#8b8478']);
      if (h >= 10 && h <= 48 && r2() < 0.22) {
        const opts = [];
        if (x0 - ix0 < 1) opts.push(['x', -1]); if (ix1 - x1 < 1) opts.push(['x', 1]); if (z0 - iz0 < 1) opts.push(['z', -1]); if (iz1 - z1 < 1) opts.push(['z', 1]);
        if (opts.length) {
          const [ax, dir] = opts[(r2() * opts.length) | 0], len = ax === 'x' ? z1 - z0 : x1 - x0, bw = Math.min(12, len - 2), bh = bw / 2;
          if (bw >= 7) {
            const bx = ax === 'x' ? (dir < 0 ? x0 + 0.8 : x1 - 0.8) : (x0 + x1) / 2, bz = ax === 'z' ? (dir < 0 ? z0 + 0.8 : z1 - 0.8) : (z0 + z1) / 2, by = topY + 2.2 + bh / 2;
            W.bills.push({ axis: ax, dir, x: bx, z: bz, y: by, w: bw, h: bh, ad: (r2() * 4) | 0 });
            for (const s of [-0.35, 0.35]) { const px = ax === 'z' ? bx + s * bw : bx - dir * 0.4, pz = ax === 'x' ? bz + s * bw : bz - dir * 0.4; W.details.push([0.25, 2.4 + bh, 0.25, px, topY + (2.4 + bh) / 2, pz, '#3a3d42']); }
            W.details.push(ax === 'x' ? [0.6, 0.15, bw, bx - dir * 0.3, topY + 2.15, bz, '#3a3d42'] : [bw, 0.15, 0.6, bx, topY + 2.15, bz - dir * 0.3, '#3a3d42']);
          }
        }
      }
    }
    // neon sign facing the nearest street
    if (rng() < (b.neon == null ? 0.42 : b.neon)) {
      const col2 = rp(rng, NEON_COLORS), sw = 3 + rng() * 3, sh = 0.9 + rng() * 0.8, y = b.h + 5 + rng() * 5;
      const opts = [];
      if (x0 - ix0 < 1) opts.push(['x', -1, x0 - 0.06, (z0 + z1) / 2, z1 - z0]); if (ix1 - x1 < 1) opts.push(['x', 1, x1 + 0.06, (z0 + z1) / 2, z1 - z0]);
      if (z0 - iz0 < 1) opts.push(['z', -1, (x0 + x1) / 2, z0 - 0.06, x1 - x0]); if (iz1 - z1 < 1) opts.push(['z', 1, (x0 + x1) / 2, z1 + 0.06, x1 - x0]);
      if (opts.length) { const o = rp(rng, opts); if (o[4] > sw + 2) W.neons.push({ axis: o[0], dir: o[1], x: o[0] === 'x' ? o[2] : o[2] + (rng() - 0.5) * (o[4] - sw - 2), z: o[0] === 'x' ? o[3] + (rng() - 0.5) * (o[4] - sw - 2) : o[3], y, w: sw, h: sh, col: col2 }); }
    }
  }
}
function parkBlock(W, b, rng) {
  b.top = 'grass';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  W.decor.push({ type: 'fountain', x: cx, z: cz }); W.addBox(cx - 4.2, cz - 4.2, cx + 4.2, cz + 4.2, b.h + 1.0, 'f');
  b.paths = [[cx - 1.8, b.z0 + 3, cx + 1.8, b.z1 - 3], [b.x0 + 3, cz - 1.8, b.x1 - 3, cz + 1.8]];
  let n = 0;
  for (let t = 0; t < 200 && n < 26; t++) {
    const x = lerp(b.x0 + 6, b.x1 - 6, rng()), z = lerp(b.z0 + 6, b.z1 - 6, rng());
    if (Math.abs(x - cx) < 4 || Math.abs(z - cz) < 4 || Math.hypot(x - cx, z - cz) < 9) continue;
    if (W.trees.some(tr => Math.hypot(tr.x - x, tr.z - z) < 5)) continue;
    addTree(W, 'oak', x, z, 0.8 + rng() * 0.5); n++;
  }
}
function parkingBlock(W, b, rng) {
  b.top = 'lot';
  let placed = 0;
  for (let row = 0; row < 3; row++) {
    const z = b.z0 + 10 + row * 16;
    for (let x = b.x0 + 7; x < b.x1 - 6; x += 3.4) {
      W.marks.push([x - 1.7 - 0.06, z - 2.6, x - 1.7 + 0.06, z + 2.6, b.h + 0.012]);
      if (rng() < 0.38 && placed < 9) { W.parked.push({ x, z, h: (row % 2 ? 0 : Math.PI) + (rng() - 0.5) * 0.08 }); placed++; }
    }
  }
  W.bldgs.push({ x0: b.x1 - 9, z0: b.z1 - 9, x1: b.x1 - 4, z1: b.z1 - 5, y: b.h, h: 3.2, col: '#d6cdbb', tex: 'house' }); W.addBox(b.x1 - 9, b.z1 - 9, b.x1 - 4, b.z1 - 5, b.h + 3.2, 'b');
}
function plazaBlock(W, b, rng) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  W.details.push([8, 2.2, 8, cx, b.h + 1.1, cz, '#b8b1a3'], [2, 10, 2, cx, b.h + 7.2, cz, '#c7a76a'], [3.2, 0.6, 3.2, cx, b.h + 2.5, cz, '#9e968a']);
  W.addBox(cx - 4, cz - 4, cx + 4, cz + 4, b.h + 12, 'm');
  for (const [dx, dz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) { W.details.push([4, 0.7, 4, cx + dx, b.h + 0.35, cz + dz, '#8e877b']); W.addBox(cx + dx - 2, cz + dz - 2, cx + dx + 2, cz + dz + 2, b.h + 0.7, 'planter'); addTree(W, 'oak', cx + dx, cz + dz, 0.75); }
  for (let k = 0; k < 6; k++) { const bx = cx + (k % 3 - 1) * 9, bz = cz + (k < 3 ? -22 : 22); W.details.push([3, 0.45, 0.6, bx, b.h + 0.22, bz, '#6b5a45']); W.addBox(bx - 1.5, bz - 0.3, bx + 1.5, bz + 0.3, b.h + 0.45, 'bench'); }
}
function houseBlock(W, b, rng) {
  const ix0 = b.x0 + 3.6, ix1 = b.x1 - 3.6, iz0 = b.z0 + 3.6, iz1 = b.z1 - 3.6;
  const lw = (ix1 - ix0) / 3, ld = (iz1 - iz0) / 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const lx0 = ix0 + i * lw, lz0 = iz0 + j * ld;
    if (i === 1 && j === 1) { // courtyard / pool
      if (rng() < 0.5) { W.decor.push({ type: 'pool', x: lx0 + lw / 2, z: lz0 + ld / 2, w: lw * 0.5, d: ld * 0.4 }); }
      addTree(W, 'palm', lx0 + lw * 0.2, lz0 + ld * 0.2, 0.9 + rng() * 0.3); continue;
    }
    if (rng() < 0.1) { addTree(W, 'palm', lx0 + lw / 2, lz0 + ld / 2, 1); continue; }
    const w = lerp(9, lw - 4, rng()), d = lerp(9, ld - 4, rng());
    const x0 = lx0 + (lw - w) * (i === 0 ? 0.15 : i === 2 ? 0.85 : 0.5), z0 = lz0 + (ld - d) * (j === 0 ? 0.15 : j === 2 ? 0.85 : 0.5);
    const floors = rng() < 0.35 ? 2 : 1, h = floors * 3.4 + rng() * 0.6;
    const col = rp(rng, b.pitched ? PERTH_HOUSE : HOUSE_COLORS);
    W.bldgs.push({ x0, z0, x1: x0 + w, z1: z0 + d, y: b.h, h, col, tex: 'house' });
    W.addBox(x0, z0, x0 + w, z0 + d, b.h + h, 'b');
    const top = b.h + h, pc = '#cfc4b4';
    if (b.pitched) W.roofs.push({ x0, z0, x1: x0 + w, z1: z0 + d, y: top, h: 1.8 + rng() * 1.4, col: rp(rng, PERTH_ROOF) });
    else W.details.push([w, 0.5, 0.25, x0 + w / 2, top + 0.25, z0 + 0.12, pc], [w, 0.5, 0.25, x0 + w / 2, top + 0.25, z0 + d - 0.12, pc], [0.25, 0.5, d, x0 + 0.12, top + 0.25, z0 + d / 2, pc], [0.25, 0.5, d, x0 + w - 0.12, top + 0.25, z0 + d / 2, pc]);
    if (rng() < 0.6) W.details.push([1.6, 1, 1.6, x0 + w * 0.7, top + 0.5, z0 + d * 0.4, '#9da0a3']);
    if (rng() < 0.35) W.details.push([w * 0.5, 0.12, 2.5, x0 + w / 2, b.h + 2.6, (j === 0 ? z0 - 1.2 : z0 + d + 1.2), rp(rng, ['#b84a3a', '#3a7ab8', '#e0a030', '#5a9a5a'])]);
    if (rng() < 0.65) addTree(W, 'palm', (i === 0 ? x0 + w + 2.2 : x0 - 2.2), z0 + d * rng(), 0.85 + rng() * 0.35);
  }
}
function sandParkBlock(W, b, rng) {
  b.top = 'grass';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  W.decor.push({ type: 'fountain', x: cx, z: cz }); W.addBox(cx - 4.2, cz - 4.2, cx + 4.2, cz + 4.2, b.h + 1.0, 'f');
  b.paths = [[cx - 1.8, b.z0 + 3, cx + 1.8, b.z1 - 3], [b.x0 + 3, cz - 1.8, b.x1 - 3, cz + 1.8]];
  for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; addTree(W, 'palm', cx + Math.cos(a) * 26, cz + Math.sin(a) * 26, 0.9 + rng() * 0.4); }
}
function mallBlock(W, b, rng) {
  const x0 = b.x0 + 14, x1 = b.x1 - 14, z0 = b.z0 + 5, z1 = b.z0 + 36;
  W.bldgs.push({ x0, z0, x1, z1, y: b.h, h: 12.6, col: '#e9e2d6', tex: 'office' }); W.addBox(x0, z0, x1, z1, b.h + 12.6, 'b');
  W.details.push([x1 - x0 + 2, 1.2, 4, (x0 + x1) / 2, b.h + 6.5, z1 + 2, '#c74b3a']);
  W.neons.push({ axis: 'z', dir: 1, x: (x0 + x1) / 2, z: z1 + 4.05, y: b.h + 9.2, w: 16, h: 2.2, col: '#ff2e88' });
  b.top = 'lot';
  let placed = 0;
  for (let x = b.x0 + 10; x < b.x1 - 8; x += 3.4) {
    for (const z of [b.z1 - 24, b.z1 - 10]) { W.marks.push([x - 1.76, z - 2.6, x - 1.64, z + 2.6, b.h + 0.012]); if (rng() < 0.18 && placed < 8) { W.parked.push({ x, z, h: rng() < 0.5 ? 0 : Math.PI }); placed++; } }
  }
}
function stuntBlock(W, b, rng) {
  b.top = 'dirt';
  const base = b.h;
  const R = (x, z, dx, dz, len, w, h) => { const r = { x, z, dx, dz, len, w, h, base, sx: x - dx * len / 2, sz: z - dz * len / 2 }; const ex = Math.abs(dx) * len / 2 + Math.abs(dz) * w / 2, ez = Math.abs(dz) * len / 2 + Math.abs(dx) * w / 2; r.bx0 = x - ex; r.bx1 = x + ex; r.bz0 = z - ez; r.bz1 = z + ez; W.ramps.push(r); };
  R(-45, 42, 0, 1, 16, 9, 3.8);
  R(-45, 148, 0, -1, 20, 10, 5.2);
  R(-104, 92, 1, 0, 12, 7, 2.6);
  R(14, 92, -1, 0, 12, 7, 2.6);
  R(-110, 30, 0, 1, 8, 5, 1.4);
  R(20, 150, -1, 0, 9, 5, 1.8);
  R(-112, 150, 1, 0, 10, 6, 2.2);
  R(22, 30, 0, 1, 10, 6, 2.0);
  for (let k = 0; k < 4; k++) W.parked.push({ x: -45 + (k - 1.5) * 2.6, z: 78, h: Math.PI / 2 });
  for (let k = 0; k < 12; k++) { W.props.push({ type: 'cone', x: -100 + k * 5, z: 120 + Math.sin(k) * 2, ry: 0 }); W.props.push({ type: 'cone', x: -20 + k * 3, z: 60, ry: 0 }); }
  for (let k = 0; k < 10; k++) { const tz = b.z0 + 10 + k * 15; W.details.push([1.4, 0.9, 1.4, b.x0 + 4, base + 0.45, tz, '#1d1d1f']); W.addBox(b.x0 + 3.3, tz - 0.7, b.x0 + 4.7, tz + 0.7, base + 0.9, 'tyres'); }
}
function flatFill(W, f, rng) {
  if (f.type === 'airport') return;
  if (FLAT_FILL[f.type]) return FLAT_FILL[f.type](W, f, rng);
  if (['cott', 'fore', 'island', 'green'].includes(f.type)) return perthFlat(W, f, rng);
  if (f.type === 'beach') {
    for (let z = f.z0 + 15; z < f.z1 - 10; z += 14 + rng() * 10) addTree(W, 'palm', f.x0 + 10 + rng() * 10, z, 0.9 + rng() * 0.5);
    for (let k = 0; k < 22; k++) { const x = lerp(f.x0 + 30, f.x1 - 10, rng()), z = lerp(f.z0 + 10, f.z1 - 10, rng()); W.props.push({ type: 'umbrella', x, z, ry: rng() * TAU, col: rp(rng, ['#e8473a', '#2f8fd8', '#f2c02e', '#ffffff', '#3ab37a']) }); }
    W.details.push([4, 6, 4, f.x0 + 45, 3, 0, '#e9e2d0'], [5.5, 0.4, 5.5, f.x0 + 45, 6.2, 0, '#d0392b']); W.addBox(f.x0 + 43, -2, f.x0 + 47, 2, 6.4, 'b');
    W.addBox(300, W.bounds.z0, 302.5, W.bounds.z1, 1.6, 'wall');
  } else {
    const n = Math.round((f.x1 - f.x0) * (f.z1 - f.z0) / 900);
    for (let k = 0; k < n; k++) {
      const x = lerp(f.x0 + 4, f.x1 - 4, rng()), z = lerp(f.z0 + 4, f.z1 - 4, rng());
      if (rng() < 0.7) addTree(W, 'cactus', x, z, 0.8 + rng() * 0.6);
      else { const s = 1 + rng() * 2.5; W.trees.push({ type: 'rock', x, z, s, r: rng() < 0.5 ? 0 : Math.PI }); W.addBox(x - s * 0.8, z - s * 0.65, x + s * 0.8, z + s * 0.65, s * 0.85, 'rock'); }
    }
  }
}
function sideProps(W, b, rng) {
  if (!b.sides) return;
  const sides = [['n', b.x0, b.z0, b.x1, b.z0, 0, 1], ['s', b.x0, b.z1, b.x1, b.z1, 0, -1], ['w', b.x0, b.z0, b.x0, b.z1, 1, 0], ['e', b.x1, b.z0, b.x1, b.z1, -1, 0]];
  for (const [nm, ax, az, bx, bz, nx, nz] of sides) {
    if (!b.sides[nm]) continue;
    const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
    for (let s = 12; s < len - 10; s += 24) W.props.push({ type: 'lamp', x: ax + tx * s + nx * 0.7, z: az + tz * s + nz * 0.7, ry: Math.atan2(-nx, -nz) });
    if (b.type === 'margin' || b.type === 'rail') continue;
    if (rng() < 0.5) { const s = 24 * Math.floor(rng() * (len / 24 - 1)) + 24; if (s < len - 8) W.props.push({ type: 'hydrant', x: ax + tx * s + nx * 0.9, z: az + tz * s + nz * 0.9, ry: 0 }); }
    if (rng() < 0.55) { const s = 24 * Math.floor(rng() * (len / 24 - 1)) + 18; if (s < len - 8) W.props.push({ type: 'bin', x: ax + tx * s + nx * 1.1, z: az + tz * s + nz * 1.1, ry: rng() * 3 }); }
  }
}

function finalizeWorld(W) {
  const n = W.nodes.length, rng = W.rng;
  for (const nd of W.nodes) { nd.deg = nd.edges.length; nd.lit = nd.deg >= 3; nd.lightOff = rng() * 18; nd.lastState = ''; }
  const D = new Float32Array(n * n).fill(1e9), NX = new Int16Array(n * n).fill(-1);
  for (let i = 0; i < n; i++) { D[i * n + i] = 0; NX[i * n + i] = i; }
  for (const e of W.edges) { D[e.a * n + e.b] = D[e.b * n + e.a] = e.len; NX[e.a * n + e.b] = e.b; NX[e.b * n + e.a] = e.a; }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) { const dik = D[i * n + k]; if (dik >= 1e9) continue; for (let j = 0; j < n; j++) { const d = dik + D[k * n + j]; if (d < D[i * n + j]) { D[i * n + j] = d; NX[i * n + j] = NX[i * n + k]; } } }
  W.dist = D; W.next = NX;
  W.blockGrid = new Grid(32, 'b'); for (const b of W.blocks) W.blockGrid.insert(b, b.x0, b.z0, b.x1, b.z1);
  W.boxGrid = new Grid(16, 'x'); for (const b of W.boxes) W.boxGrid.insert(b, b.x0, b.z0, b.x1, b.z1);
  W.tallBoxes = W.boxes.filter(b => b.h > 2.5 && b.kind !== 'wall');
  // pedestrian loops around each block on the sidewalk
  W.loops = [];
  for (const b of W.blocks) {
    if (b.type === 'margin' || b.type === 'rail') continue;
    const i = 1.6;
    W.loops.push({ b, pts: [[b.x0 + i, b.z0 + i], [b.x1 - i, b.z0 + i], [b.x1 - i, b.z1 - i], [b.x0 + i, b.z1 - i]], cross: [[], [], [], []], cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 });
  }
  for (let a = 0; a < W.loops.length; a++) for (let k = 0; k < 4; k++) {
    const [px, pz] = W.loops[a].pts[k];
    for (let c = 0; c < W.loops.length; c++) { if (c === a) continue; for (let q = 0; q < 4; q++) {
      const [qx, qz] = W.loops[c].pts[q]; let axis = null;
      if (Math.abs(px - qx) < 0.5 && Math.abs(pz - qz) > 2 && Math.abs(pz - qz) < 17) axis = 'z';
      else if (Math.abs(pz - qz) < 0.5 && Math.abs(px - qx) > 2 && Math.abs(px - qx) < 17) axis = 'x';
      if (!axis) continue;
      const mx = (px + qx) / 2, mz = (pz + qz) / 2; let node = null, bd = 22;
      for (const nd of W.nodes) { if (!nd.lit) continue; const d = Math.hypot(nd.x - mx, nd.z - mz); if (d < bd) { bd = d; node = nd; } }
      W.loops[a].cross[k].push({ loop: c, k: q, axis, node, mx, mz });
    } }
  }
  W.spawns = W.spawnEdges.map(([a, b]) => { const e = W.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)); return { edge: e.id, from: a }; });
  // minimap paths
  const mini = { roads: new Path2D(), blocks: new Path2D(), bldgs: new Path2D(), flats: new Path2D(), water: new Path2D(), parks: new Path2D() };
  for (const e of W.edges) { const A = W.nodes[e.a], B = W.nodes[e.b]; mini.roads.moveTo(A.x, A.z); mini.roads.lineTo(B.x, B.z); }
  for (const b of W.blocks) (b.top === 'grass' ? mini.parks : mini.blocks).rect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
  for (const b of W.bldgs) mini.bldgs.rect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
  for (const r of W.miniRects || []) mini.bldgs.rect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0);
  for (const f of W.flats) mini.flats.rect(f.x0, f.z0, f.x1 - f.x0, f.z1 - f.z0);
  if (W.airport) { mini.air = new Path2D(); for (const p of W.airport.pave) mini.air.rect(p.x0, p.z0, p.x1 - p.x0, p.z1 - p.z0); const r = W.airport.runway; mini.runway = new Path2D(); mini.runway.rect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0); for (const rd of W.airport.roads) { mini.roads.moveTo(rd.x0, rd.z); mini.roads.lineTo(rd.x1, rd.z); } }
  for (const r of W.ramps) mini.bldgs.rect(r.bx0, r.bz0, r.bx1 - r.bx0, r.bz1 - r.bz0);
  for (const r of W.waters || []) mini.water.rect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0);
  for (const d of W.dry) if (!d.deck) mini.flats.rect(d.x0, d.z0, d.x1 - d.x0, d.z1 - d.z0);
  W.mini = mini;
}
function drawMapPreview(canvas, Wd) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height, B = Wd.bounds;
  g.fillStyle = Wd.id === 'neon' || Wd.id === 'nyc' ? '#14171d' : Wd.id === 'perth' ? '#263122' : '#2a251c'; g.fillRect(0, 0, w, h);
  const s = Math.min(w / (B.x1 - B.x0 + 30), h / (B.z1 - B.z0 + 30));
  g.save(); g.translate(w / 2, h / 2); g.scale(s, s); g.translate(-(B.x0 + B.x1) / 2, -(B.z0 + B.z1) / 2);
  if (Wd.waters) { g.fillStyle = '#1d4d66'; g.fill(Wd.mini.water); }
  g.fillStyle = Wd.id === 'neon' || Wd.id === 'nyc' ? '#252a33' : Wd.id === 'perth' ? '#3b4a30' : '#4a3f2c'; g.fill(Wd.mini.flats);
  g.fillStyle = '#2b303a'; g.fill(Wd.mini.blocks); g.fillStyle = '#2f5a35'; g.fill(Wd.mini.parks);
  g.fillStyle = Wd.id === 'sand' ? '#8a7a63' : '#56607a'; g.fill(Wd.mini.bldgs);
  g.strokeStyle = '#ffb21e'; g.globalAlpha = 0.85; g.lineWidth = 9; g.lineCap = 'square'; g.stroke(Wd.mini.roads);
  g.restore();
}

// ---------------- meshes ----------------
const WMAT = {};
function initWorldMats() {
  WMAT.office = new THREE.MeshStandardMaterial({ map: TEX.office.map, emissiveMap: TEX.office.emis, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, vertexColors: true, roughness: 0.7, metalness: 0.1 });
  WMAT.house = new THREE.MeshStandardMaterial({ map: TEX.house.map, emissiveMap: TEX.house.emis, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, vertexColors: true, roughness: 0.85, metalness: 0.0 });
  WMAT.brick = new THREE.MeshStandardMaterial({ map: TEX.brick.map, emissiveMap: TEX.brick.emis, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, vertexColors: true, roughness: 0.82, metalness: 0.05 });
  WMAT.glass = new THREE.MeshStandardMaterial({ map: TEX.glass.map, emissiveMap: TEX.glass.emis, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, vertexColors: true, roughness: 0.22, metalness: 0.55, envMapIntensity: 1.3 });
  WMAT.shopf = new THREE.MeshStandardMaterial({ map: TEX.shopf.map, emissiveMap: TEX.shopf.emis, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, roughness: 0.6, metalness: 0.1 });
  WMAT.stand = new THREE.MeshStandardMaterial({ map: TEX.crowd, vertexColors: true, roughness: 0.92 });
  WMAT.far = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, flatShading: true });
  WMAT.screen = new THREE.MeshBasicMaterial({ map: TEX.bill, color: new THREE.Color(1.25, 1.25, 1.25), side: THREE.DoubleSide });
  WMAT.bill = new THREE.MeshStandardMaterial({ map: TEX.bill, emissive: new THREE.Color(1, 1, 1), emissiveMap: TEX.bill, emissiveIntensity: 0, roughness: 0.7, side: THREE.DoubleSide });
  WMAT.roof = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
  WMAT.road = new THREE.MeshStandardMaterial({ map: TEX.road, roughness: 0.9 });
  WMAT.side = new THREE.MeshStandardMaterial({ map: TEX.side, roughness: 0.92 });
  WMAT.grass = new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 });
  WMAT.dirt = new THREE.MeshStandardMaterial({ map: TEX.dirt, roughness: 1 });
  WMAT.lot = new THREE.MeshStandardMaterial({ map: TEX.lot, roughness: 0.9 });
  WMAT.sand = new THREE.MeshStandardMaterial({ map: TEX.sand, color: C('#c7ad86'), roughness: 1 });
  WMAT.mark = new THREE.MeshStandardMaterial({ color: C('#e4e2d9'), roughness: 0.8 });
  WMAT.neon = new THREE.MeshBasicMaterial({ vertexColors: true });
  WMAT.water = new THREE.MeshStandardMaterial({ color: C('#1f6a8a'), roughness: 0.06, metalness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  WMAT.pool = new THREE.MeshStandardMaterial({ color: C('#3fb6d9'), roughness: 0.05, metalness: 0.2 });
  WMAT.tree = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: TEX.foliage });
  WMAT.prop = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.25 });
  WMAT.lampHead = new THREE.MeshBasicMaterial({ color: C('#4a4a46') });
  WMAT.tlLamp = new THREE.MeshBasicMaterial({ color: 0xffffff });
  WMAT.pool2 = new THREE.MeshBasicMaterial({ color: C('#ffae4a'), map: TEX.glow, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
}
function quadF(x0, z0, x1, z1, y, uvf) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const r = uvf(p.getX(i), p.getZ(i)); uv.setXY(i, r[0], r[1]); }
  return g;
}
const tile = (s) => (x, z) => [x / s, z / s];
function rampGeo(r) {
  const hw = r.w / 2, hl = r.len / 2, h = r.h;
  const P = [[-hw, 0, -hl], [hw, 0, -hl], [hw, h, hl], [-hw, h, hl], [-hw, 0, hl], [hw, 0, hl]];
  const tris = [[0, 2, 1, 0], [0, 3, 2, 0], [4, 5, 2, 1], [4, 2, 3, 1], [0, 4, 3, 1], [1, 2, 5, 1]];
  const pos = [], col = [], cA = C('#8f8a82'), cB = C('#e0a91c');
  for (const t of tris) for (let k = 0; k < 3; k++) { pos.push(...P[t[k]]); const c = t[3] ? cB : cA; col.push(c.r, c.g, c.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.computeVertexNormals(); g.rotateY(Math.atan2(r.dx, r.dz)); g.translate(r.x, r.base, r.z);
  // chevrons on the slope
  const parts = [g];
  for (let k = 1; k < 4; k++) {
    const t = k / 4, cz = -hl + t * r.len, cy = h * t + 0.02;
    const s = new THREE.BoxGeometry(r.w * 0.8, 0.03, 0.45); s.rotateX(-Math.atan2(h, r.len)); s.translate(0, cy, cz); colorize(s, C('#1b1b1b'));
    s.rotateY(Math.atan2(r.dx, r.dz)); s.translate(r.x, r.base, r.z); parts.push(s);
  }
  return mergeGeos(parts);
}
// push vertices in and out along their direction for a lumpy, natural silhouette (deterministic)
function lumpy(g, amt, seed) {
  const p = g.attributes.position, key = (x, y, z) => Math.round(x * 1000) + ',' + Math.round(y * 1000) + ',' + Math.round(z * 1000), seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = key(x, y, z); let f = seen.get(k);
    if (f === undefined) { f = 1 + amt * (Math.sin(x * 5.1 + seed) * Math.cos(y * 4.3 + seed * 1.7) * 0.6 + Math.sin(z * 6.7 + y * 2.1 + seed * 0.3) * 0.4); seen.set(k, f); }
    p.setXYZ(i, x * f, y * f, z * f);
  }
  g.computeVertexNormals(); return g;
}
function treeGeo(type) {
  const P = [];
  if (type === 'oak') {   // trunk with a couple of limbs and a lumpy, two-tone crown
    const t = new THREE.CylinderGeometry(0.2, 0.36, 3.6, 7); t.translate(0, 1.8, 0); P.push(colorize(t, C('#5a3e28')));
    for (const [a, l] of [[0.6, 1.6], [-0.7, 1.4]]) { const b = new THREE.CylinderGeometry(0.08, 0.14, l, 5); b.translate(0, l / 2, 0); b.rotateZ(a); b.translate(0, 3.1, 0); P.push(colorize(b, C('#5a3e28'))); }
    for (const [x, y, z, r, col] of [[0, 4.7, 0, 2.3, '#3b6f2a'], [1.2, 5.3, 0.5, 1.6, '#4a8233'], [-1.1, 5.1, -0.4, 1.7, '#447b2f'], [0.2, 6.1, -0.6, 1.4, '#5a9440'], [-0.4, 4.4, 1.2, 1.3, '#356526'], [0.6, 4.2, -1.3, 1.2, '#3f7330']]) {
      const f = new THREE.IcosahedronGeometry(r, 2); lumpy(f, 0.16, x * 3 + z); { const uv = f.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2); } f.scale(1, 0.86, 1); f.translate(x, y, z); P.push(colorize(f, C(col)));
    }
  } else if (type === 'palm') {   // curved ringed trunk, drooping fronds, coconuts
    let x = 0, y = 0;
    for (let k = 0; k < 7; k++) { const s = new THREE.CylinderGeometry(0.19 - k * 0.012, 0.25 - k * 0.012, 1.22, 7); s.rotateZ(-0.045 * k); s.translate(x, y + 0.6, 0); P.push(colorize(s, C(k % 2 ? '#8a6b47' : '#9f7d55'))); x += 0.055 * k; y += 1.19; }
    for (let k = 0; k < 11; k++) {
      const ang = k / 11 * TAU + (k % 2) * 0.12, lift = 0.25 + (k % 3) * 0.12, col = C(['#3f8a3a', '#4c9a40', '#356f2e'][k % 3]);
      let px = 0, py = 0, pz = 0, pitch = -lift;
      for (let s = 0; s < 4; s++) {   // each frond droops a little more along its length
        const len = 1.05, wd = 0.62 - s * 0.12, fr = new THREE.BoxGeometry(wd, 0.05, len); fr.translate(0, 0, len / 2); fr.rotateX(pitch); fr.translate(0, py, pz);
        fr.rotateY(ang); fr.translate(x, y + 0.05, 0); P.push(colorize(fr, col));
        py -= Math.sin(pitch) * len; pz += Math.cos(pitch) * len; pitch += 0.32;
      }
    }
    for (let k = 0; k < 4; k++) { const c = new THREE.IcosahedronGeometry(0.17, 0); c.translate(x + Math.cos(k * 1.6) * 0.25, y - 0.25, Math.sin(k * 1.6) * 0.25); P.push(colorize(c, C('#5b3f22'))); }
  } else if (type === 'pine') {
    const t = new THREE.CylinderGeometry(0.18, 0.34, 11, 6); t.translate(0, 5.5, 0); P.push(colorize(t, C('#5b4330')));
    for (let k = 0; k < 6; k++) { const r = 2.4 - k * 0.32, c = new THREE.ConeGeometry(r, 1.6, 7); c.translate(0, 3.2 + k * 1.45, 0); P.push(colorize(c, C(k % 2 ? '#2f5b37' : '#36663d'))); }
  } else {
    if (type === 'rock') {   // a weathered boulder: a lumpy, squashed ball
      const r = new THREE.IcosahedronGeometry(1, 2); lumpy(r, 0.22, 7); r.scale(0.85, 0.55, 0.7); r.translate(0, 0.4, 0); P.push(colorize(r, C('#9b7d5c')));
      const r2 = new THREE.IcosahedronGeometry(0.5, 1); lumpy(r2, 0.2, 3); r2.translate(0.55, 0.22, 0.35); P.push(colorize(r2, C('#8a6d50')));
      return mergeGeos(P);
    }
    // a ribbed saguaro: trunk and two arms with rounded tops
    const rib = (g, col) => { colorize(g, col); const p = g.attributes.position, c = g.attributes.color; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 0.86 + 0.14 * (Math.cos(a * 12) * 0.5 + 0.5); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); } return g; };
    const col = C('#4f7d3a'), seg = 14;
    const stem = (r, h, x, y, z) => { const s = new THREE.CylinderGeometry(r, r * 1.08, h, seg, 3, true); s.translate(x, y + h / 2, z); P.push(rib(s, col)); const cap = new THREE.SphereGeometry(r, seg, 6, 0, TAU, 0, Math.PI / 2); cap.translate(x, y + h, z); P.push(rib(cap, col)); };
    stem(0.34, 3.4, 0, 0, 0); stem(0.22, 1.3, 0.78, 1.95, 0); stem(0.2, 1.0, -0.68, 1.6, 0);
    for (const [x, y, l] of [[0.42, 1.95, 0.62], [-0.38, 1.6, 0.52]]) { const c = new THREE.CylinderGeometry(0.2, 0.2, l, seg, 1, true); c.rotateZ(Math.PI / 2); c.translate(x, y, 0); P.push(rib(c, col)); const e = new THREE.SphereGeometry(0.2, seg, 8); e.translate(x * 1.85, y, 0); P.push(rib(e, col)); }
  }
  return mergeGeos(P);
}
function propGeo(type) {
  const P = [];
  if (type === 'lamp') {
    const p = new THREE.CylinderGeometry(0.09, 0.14, 7.2, 8); p.translate(0, 3.6, 0); P.push(colorize(p, C('#3c3f44')));
    const a = new THREE.BoxGeometry(0.12, 0.12, 1.7); a.translate(0, 7.12, 0.8); P.push(colorize(a, C('#3c3f44')));
    const bs = new THREE.CylinderGeometry(0.22, 0.26, 0.5, 8); bs.translate(0, 0.25, 0); P.push(colorize(bs, C('#2e3135')));
  } else if (type === 'lampHead') { const h = new THREE.BoxGeometry(0.5, 0.16, 0.85); h.translate(0, 7.02, 1.62); P.push(h); }
  else if (type === 'hydrant') {
    const b = new THREE.CylinderGeometry(0.17, 0.2, 0.62, 10); b.translate(0, 0.31, 0); P.push(colorize(b, C('#c8241c')));
    const c = new THREE.SphereGeometry(0.18, 10, 6, 0, TAU, 0, Math.PI / 2); c.translate(0, 0.62, 0); P.push(colorize(c, C('#c8241c')));
    const n = new THREE.CylinderGeometry(0.07, 0.07, 0.52, 8); n.rotateZ(Math.PI / 2); n.translate(0, 0.42, 0); P.push(colorize(n, C('#d9d9d9')));
  } else if (type === 'bin') {
    const b = new THREE.CylinderGeometry(0.3, 0.26, 0.95, 10); b.translate(0, 0.475, 0); P.push(colorize(b, C('#2e5a3a')));
    const l = new THREE.CylinderGeometry(0.33, 0.33, 0.07, 10); l.translate(0, 0.98, 0); P.push(colorize(l, C('#22252a')));
  } else if (type === 'cone') {
    const c = new THREE.ConeGeometry(0.22, 0.72, 10); c.translate(0, 0.4, 0); P.push(colorize(c, C('#ff6a10')));
    const s = new THREE.CylinderGeometry(0.165, 0.18, 0.12, 10); s.translate(0, 0.36, 0); P.push(colorize(s, C('#f4f4f4')));
    const b = new THREE.BoxGeometry(0.5, 0.05, 0.5); b.translate(0, 0.025, 0); P.push(colorize(b, C('#ff6a10')));
  } else if (type === 'pump') {
    const b = new THREE.BoxGeometry(0.8, 1.7, 0.5); b.translate(0, 0.85, 0); P.push(colorize(b, C('#d43a2c')));
    const t = new THREE.BoxGeometry(0.82, 0.4, 0.52); t.translate(0, 1.6, 0); P.push(colorize(t, C('#f2f2f2')));
    const s = new THREE.BoxGeometry(0.5, 0.3, 0.53); s.translate(0, 1.15, 0); P.push(colorize(s, C('#1a2233')));
  } else if (type === 'umbrella') {
    const p = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6); p.translate(0, 1.2, 0); P.push(colorize(p, C('#bdbdbd')));
    const c = new THREE.ConeGeometry(1.4, 0.6, 8); c.translate(0, 2.4, 0); P.push(colorize(c, C('#ffffff')));
  } else if (type === 'tl') {
    const p = new THREE.CylinderGeometry(0.09, 0.12, 4.6, 8); p.translate(0, 2.3, 0); P.push(colorize(p, C('#2b2e33')));
    const h = new THREE.BoxGeometry(0.38, 1.05, 0.3); h.translate(0, 4.7, 0); P.push(colorize(h, C('#1d1f22')));
  }
  return mergeGeos(P);
}
const PROP_CFG = { lamp: { r: 0.25, mass: 1 }, hydrant: { r: 0.25 }, bin: { r: 0.35 }, cone: { r: 0.25 }, pump: { r: 0.5 }, umbrella: { r: 0.4 } };
function buildWorldMeshes(W) {
  const root = new THREE.Group(), rng = mulberry32(W.id === 'neon' ? 5 : 6), hw = W.hw;
  const L = { road: [], mark: [], side: [], grass: [], dirt: [], lot: [], sand: [], office: [], house: [], brick: [], glass: [], shopf: [], bill: [], screen: [], far: [], stand: [], roof: [], neon: [], ramp: [], pool: [], water: [] };
  // ground
  const gsize = 6000, gg = new THREE.PlaneGeometry(gsize, gsize); gg.rotateX(-Math.PI / 2); gg.translate(0, -0.03, 0);
  { const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * gsize / 8, uv.getY(i) * gsize / 8); }
  const groundMat = W.id === 'neon' || W.id === 'nyc' ? new THREE.MeshStandardMaterial({ color: C(W.groundCol), roughness: 1 }) : W.id === 'perth' ? new THREE.MeshStandardMaterial({ map: TEX.grass, color: C('#c8c48e'), roughness: 1 }) : new THREE.MeshStandardMaterial({ map: TEX.sand, color: C('#bea47e'), roughness: 1 });
  groundMat.polygonOffset = true; groundMat.polygonOffsetFactor = 4; groundMat.polygonOffsetUnits = 8;
  const ground = new THREE.Mesh(gg, groundMat); ground.receiveShadow = true; root.add(ground);
  // rolling hills and dunes beyond the playable area, so the world doesn't end on a flat plane
  if (['sand', 'base', 'perth'].includes(W.id)) {
    const B = W.bounds, mx = (B.x0 + B.x1) / 2, mz = (B.z0 + B.z1) / 2, size = 3800, n = 120, M2 = 45;
    const hg = new THREE.PlaneGeometry(size, size, n, n); hg.rotateX(-Math.PI / 2); hg.translate(mx, 0, mz);
    const hp = hg.attributes.position, huv = hg.attributes.uv;
    for (let i = 0; i < hp.count; i++) {
      const x = hp.getX(i), z = hp.getZ(i), dx = Math.max(B.x0 - M2 - x, 0, x - B.x1 - M2), dz = Math.max(B.z0 - M2 - z, 0, z - B.z1 - M2), d = Math.hypot(dx, dz);
      const nz = Math.sin(x * 0.0093 + 1.7) * Math.cos(z * 0.0081 - 0.4) * 0.55 + Math.sin((x - z) * 0.0047) * 0.3 + Math.sin(x * 0.027 + z * 0.019) * 0.15;
      let y = d <= 0 ? -0.8 : -0.8 + Math.min(1, d / 240) ** 1.3 * (W.id === 'base' ? 60 : W.id === 'perth' ? 34 : 44) * (0.55 + 0.45 * nz) + Math.min(1, d / 60) * 0.8;
      if (W.waters && waterAtRects(W, x, z)) y = -4;
      hp.setY(i, y); huv.setXY(i, x / 10, z / 10);
    }
    hg.computeVertexNormals();
    const hm = W.id === 'perth' ? new THREE.MeshStandardMaterial({ map: TEX.grass, color: C('#b7bd86'), roughness: 1 }) : new THREE.MeshStandardMaterial({ map: TEX.sand, color: C(W.id === 'base' ? '#c99a6a' : '#cdb08a'), roughness: 1 });
    const hills = new THREE.Mesh(hg, hm); hills.receiveShadow = true; root.add(hills);
  }
  // roads
  for (const e of W.edges) {
    const A = W.nodes[e.a], B = W.nodes[e.b];
    if (e.axis === 'z') { const x = A.x, z0 = Math.min(A.z, B.z) + hw, z1 = Math.max(A.z, B.z) - hw; L.road.push(quadF(x - hw, z0, x + hw, z1, 0.01, (px, pz) => [(px - (x - hw)) / (2 * hw), (pz - z0) / 8])); }
    else { const z = A.z, x0 = Math.min(A.x, B.x) + hw, x1 = Math.max(A.x, B.x) - hw; L.road.push(quadF(x0, z - hw, x1, z + hw, 0.01, (px, pz) => [(pz - (z - hw)) / (2 * hw), (px - x0) / 8])); }
  }
  for (const nd of W.nodes) {
    if (!nd.deg) continue;
    L.road.push(quadF(nd.x - hw, nd.z - hw, nd.x + hw, nd.z + hw, 0.012, () => [0.25, 0.35]));
    if (!nd.lit) continue;
    for (const eid of nd.edges) {
      const e = W.edges[eid], O = W.nodes[e.a === nd.id ? e.b : e.a];
      const dx = Math.sign(O.x - nd.x), dz = Math.sign(O.z - nd.z);
      for (let k = 0; k < 6; k++) {
        const c = -hw + 1.3 + k * (2 * hw - 2.6) / 5, cx = nd.x + dx * (hw + 1.8) + (dz !== 0 ? c : 0), cz = nd.z + dz * (hw + 1.8) + (dx !== 0 ? c : 0);
        const ax = dx !== 0 ? 1.2 : 0.42, az = dz !== 0 ? 1.2 : 0.42;
        L.mark.push(quadF(cx - ax, cz - az, cx + ax, cz + az, 0.016, () => [0, 0]));
      }
      // stop line on the incoming lane: right of travel dir (-d) is (dz, -dx)
      const sx = nd.x + dx * (hw + 3.9) + dz * LO, sz = nd.z + dz * (hw + 3.9) - dx * LO;
      const ax = dx !== 0 ? 0.25 : 2.8, az = dz !== 0 ? 0.25 : 2.8;
      L.mark.push(quadF(sx - ax, sz - az, sx + ax, sz + az, 0.016, () => [0, 0]));
    }
  }
  for (const m of W.marks) L.mark.push(quadF(m[0], m[1], m[2], m[3], m[4], () => [0, 0]));
  // blocks
  for (const b of W.blocks) {
    L.side.push(boxUV(b.x0, -0.05, b.z0, b.x1, b.h, b.z1, 3, 3));
    if (b.top) { const i = 3; L[b.top].push(quadF(b.x0 + i, b.z0 + i, b.x1 - i, b.z1 - i, b.h + 0.008, tile(b.top === 'lot' ? 8 : 6))); }
    if (b.paths) for (const p of b.paths) L.side.push(quadF(p[0], p[1], p[2], p[3], b.h + 0.016, tile(3)));
  }
  for (const f of W.flats) { if (f.tex === 'none') continue; (f.tex === 'grass' ? L.grass : L.sand).push(quadF(f.x0, f.z0, f.x1, f.z1, 0.004, tile(8))); }
  // buildings
  // facade styles: concrete offices, brick walk-ups, glass towers (stacked tiers keep their base's style)
  { const sr = mulberry32(W.id.length * 31 + 7); let prev = null;
    for (const b of W.bldgs) {
      if (b.tex === 'office' && !b.keepTex) {
        const tier = prev && b.y > prev.y + 0.5 && b.x0 >= prev.x0 - 0.1 && b.x1 <= prev.x1 + 0.1 && b.z0 >= prev.z0 - 0.1 && b.z1 <= prev.z1 + 0.1;
        if (tier) { b.tex = prev.tex; b.lookCol = prev.lookCol; }
        else { const r = sr(); b.tex = b.h >= 48 ? (r < 0.62 ? 'glass' : 'office') : b.h <= 32 ? (r < 0.5 ? 'brick' : r < 0.85 ? 'office' : 'glass') : (r < 0.35 ? 'brick' : r < 0.72 ? 'office' : 'glass');
          if (b.tex === 'brick') b.lookCol = rp(sr, ['#ffffff', '#f2dccd', '#e6ddd0', '#d9c6b6', '#f0e6dc']); else if (b.tex === 'glass') b.lookCol = rp(sr, ['#ffffff', '#d6ecff', '#e6dcc4', '#cfe8dc', '#c8d4e8']); }
      }
      if (b.y < 1) prev = b; else if (!prev) prev = b;
    } }
  const FAC = { office: [32, 28.8], house: [27.2, 27.2], brick: [28, 28.8], glass: [24, 28.8] };
  for (const b of W.bldgs) {
    const [tu, tv] = FAC[b.tex] || FAC.office;
    const ou = ((rng() * 8) | 0) / 8, ov = ((rng() * 8) | 0) / 8;
    const g0 = b.y < 1 && b.tex !== 'house' ? 3.6 / tv : 0;   // start the window grid one storey up when there's a shop below
    b._li = L[b.tex].length; L[b.tex].push(boxUV(b.x0, b.y, b.z0, b.x1, b.y + b.h, b.z1, tu, tv, { offU: ou, offV: ov + g0, roofUV: [ou + 0.004, 0.004], color: C(b.lookCol || b.col) }));
    // street-level shopfronts wrap the ground floor of city buildings
    if (b.street && b.y < 1 && b.h >= 7 && b.tex !== 'house') {
      const so = ((rng() * 8) | 0) / 8, p = 0.14;
      b._si = L.shopf.length; L.shopf.push(boxUV(b.x0 - p, b.y, b.z0 - p, b.x1 + p, b.y + 4.4, b.z1 + p, 64, 4.4, { offU: so, roofUV: [so + 0.004, 0.02] }));
    }
  }
  for (const s of W.bills) {   // rooftop billboards: a textured board, the ad picked from the atlas
    const g = new THREE.PlaneGeometry(s.w, s.h), uv = g.attributes.uv, u0 = (s.ad % 2) * 0.5, v0 = s.ad < 2 ? 0.5 : 0;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
    g.rotateY(s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI)); g.translate(s.x, s.y, s.z);
    const lst = s.screen ? L.screen : L.bill; s._li = lst.length; lst.push(g);
  }
  W.detIdx = []; for (const d of W.details) { W.detIdx.push(L.roof.length); L.roof.push(boxG(d[0], d[1], d[2], d[3], d[4], d[5], C(d[6]), d[7])); }
  for (const r of W.roofs) { r._li = L.roof.length; L.roof.push(gableGeo(r)); }
  for (const fn of W.custom) fn(L);
  for (const s of W.neons) {
    const g = new THREE.PlaneGeometry(s.w, s.h);
    const ry = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (s.dir > 0 ? 0 : Math.PI);
    g.rotateY(ry); g.translate(s.x, s.y, s.z); const c = C(s.col).multiplyScalar(1.6); colorize(g, c); s._li = L.neon.length; L.neon.push(g);
    const back = new THREE.BoxGeometry(s.axis === 'x' ? 0.1 : s.w + 0.4, s.h + 0.4, s.axis === 'x' ? s.w + 0.4 : 0.1);
    back.translate(s.x - (s.axis === 'x' ? s.dir * 0.06 : 0), s.y, s.z - (s.axis === 'z' ? s.dir * 0.06 : 0)); s._bi = L.roof.length; L.roof.push(colorize(back, C('#18191c')));
  }
  for (const r of W.ramps) L.ramp.push(rampGeo(r));
  for (const d of W.decor) {
    if (d.type === 'fountain') {
      const y = 0.15;
      const b1 = new THREE.CylinderGeometry(4.2, 4.4, 0.9, 24); b1.translate(d.x, y + 0.45, d.z); L.roof.push(colorize(b1, C('#b9b2a5')));
      const c1 = new THREE.CylinderGeometry(0.7, 0.9, 3, 12); c1.translate(d.x, y + 1.5, d.z); L.roof.push(colorize(c1, C('#c9c2b5')));
      const w1 = new THREE.CylinderGeometry(3.8, 3.8, 0.1, 24); w1.translate(d.x, y + 0.8, d.z); L.pool.push(w1);
    } else if (d.type === 'pool') {
      L.roof.push(boxG(d.w + 1, 0.3, d.d + 1, d.x, 0.15, d.z, C('#e8e3d8'))); L.pool.push(boxG(d.w, 0.05, d.d, d.x, 0.32, d.z));
    } else if (d.type === 'umbrella') {
      const p = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5); p.translate(d.x, 1.2, d.z); L.roof.push(colorize(p, C('#ddd')));
      const c = new THREE.ConeGeometry(1.4, 0.6, 8); c.translate(d.x, 2.4, d.z); L.roof.push(colorize(c, C(d.col)));
    }
  }
  // boundary walls
  if (W.fenceWalls) for (const b of W.boxes) if (b.kind === 'wall') {
    const along = b.x1 - b.x0 > b.z1 - b.z0, len = along ? b.x1 - b.x0 : b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    let run = null; const flush = (end) => { if (!run) return; const l = end - run; if (l > 0.5) for (const y of [0.55, 1.05]) L.roof.push(along ? boxG(l, 0.12, 0.08, b.x0 + run + l / 2, y, cz, C('#8a6b4a')) : boxG(0.08, 0.12, l, cx, y, b.z0 + run + l / 2, C('#8a6b4a'))); run = null; };
    for (let s = 0; s <= len; s += 3) {
      const x = along ? b.x0 + s : cx, z = along ? cz : b.z0 + s;
      if (W.waters && waterAt(x, z)) { flush(s); if (s % 12 === 0) L.roof.push(boxG(0.5, 0.5, 0.5, x, 0.1, z, C('#ff7a1a'))); continue; }
      if (run === null) run = s; L.roof.push(boxG(0.16, 1.3, 0.16, x, 0.65, z, C('#6b5236')));
    }
    flush(len);
  }
  if (!W.hideWalls) for (const b of W.boxes) if (b.kind === 'wall') L.roof.push(boxG(b.x1 - b.x0, b.h, b.z1 - b.z0, (b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2, C(W.id === 'neon' ? '#8d8f93' : '#b5a88f')));
  // far background
  if (W.id === 'perth') {
    for (let k = 0; k < 22; k++) { const z = -760 + k * 76 + rng() * 30, h = 40 + rng() * 60; const m = new THREE.ConeGeometry(120 + rng() * 90, h, 7); m.translate(1250 + rng() * 150, h / 2 - 2, z); L.far.push(colorize(m, C(rp(rng, ['#7d8a6c', '#6f7d63', '#8b937a'])))); }
  } else if (W.id === 'nyc') {
    nycSkyline(W, L, rng);
  } else if (W.id === 'neon') {
    for (let k = 0; k < 80; k++) {
      const a = k / 80 * TAU + rng() * 0.05, r = 330 + rng() * 170, w = 18 + rng() * 26, d = 18 + rng() * 26, h = 30 + rng() * 140;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (W.flats.some(f => f.type === 'airport' && x > f.x0 - w && x < f.x1 + w && z > f.z0 - d && z < f.z1 + d)) continue;   // no ghost towers on the airfield
      L.office.push(boxUV(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 32, 28.8, { offU: ((rng() * 8) | 0) / 8, roofUV: [0.004, 0.004], color: C(rp(rng, ['#5a636e', '#6b737d', '#4c545e', '#7a828b'])) }));
    }
  } else {
    const red = W.id === 'base', n = red ? 34 : 26;
    for (let k = 0; k < n; k++) {   // flat-topped mesas and buttes, with a darker cap band
      const a = red ? k / n * TAU + rng() * 0.08 : Math.PI * 0.55 + k / n * Math.PI * 1.25, r = (red ? 1180 : 640) + rng() * 160, mesa = rng() < 0.65, h = mesa ? 55 + rng() * 85 : 90 + rng() * 110, w = 60 + rng() * 90;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, cols = red ? ['#b5693f', '#a65a35', '#c47a4a', '#9e5d3c'] : ['#b08a63', '#9c7856', '#c29b70'];
      const m = mesa ? new THREE.CylinderGeometry(w * 0.6, w, h, 7) : new THREE.ConeGeometry(w, h, 7); m.translate(x, h / 2 - 2, z); L.far.push(colorize(m, C(rp(rng, cols))));
      if (mesa) { const cap = new THREE.CylinderGeometry(w * 0.6, w * 0.66, h * 0.12, 7); cap.translate(x, h - 2 - h * 0.06, z); L.far.push(colorize(cap, C(red ? '#7e4630' : '#8a6c4c'))); }
    }
  }
  const add = (list, mat, cast) => { if (!list.length) return null; const m = new THREE.Mesh(mergeGeos(list), mat); m.castShadow = !!cast; m.receiveShadow = true; root.add(m); return m; };
  add(L.road, WMAT.road); add(L.mark, WMAT.mark); add(L.side, WMAT.side); add(L.grass, WMAT.grass); add(L.dirt, WMAT.dirt); add(L.lot, WMAT.lot); add(L.sand, WMAT.sand);
  W.meshes = { office: add(L.office, WMAT.office, true), house: add(L.house, WMAT.house, true), brick: add(L.brick, WMAT.brick, true), glass: add(L.glass, WMAT.glass, true), shopf: add(L.shopf, WMAT.shopf, true), bill: add(L.bill, WMAT.bill, true), screen: add(L.screen, WMAT.screen), roof: add(L.roof, WMAT.roof, true), neon: add(L.neon, WMAT.neon) }; add(L.ramp, WMAT.roof, true); add(L.pool, WMAT.pool); add(L.far, WMAT.far); add(L.stand, WMAT.stand, true);
  if (W.waters) { const wl = []; for (const r of W.waters) for (const q of subtractRects(r, W.dry)) wl.push(quadF(q.x0, q.z0, q.x1, q.z1, -0.015, () => [0, 0])); const wm = new THREE.Mesh(mergeGeos(wl), WMAT.water); wm.receiveShadow = true; root.add(wm); }
  // ---- instanced trees ----
  W.inst = { trees: {}, props: {}, tl: null };
  for (const type of ['oak', 'palm', 'cactus', 'pine', 'rock']) {
    const list = W.trees.filter(t => t.type === type); if (!list.length) continue;
    const m = new THREE.InstancedMesh(treeGeo(type), WMAT.tree, list.length); m.castShadow = true; m.receiveShadow = true;
    list.forEach((t, i) => { _v1.set(t.x, heightAt(t.x, t.z), t.z); _q.setFromAxisAngle(UP, t.r); _s.setScalar(t.s); _m.compose(_v1, _q, _s); m.setMatrixAt(i, _m); m.setColorAt(i, new THREE.Color().setScalar(0.85 + rng() * 0.3)); });
    _s.set(1, 1, 1); root.add(m); W.inst.trees[type] = m;
  }
  // ---- instanced props ----
  for (const type of ['lamp', 'hydrant', 'bin', 'cone', 'pump', 'umbrella']) {
    const list = W.props.filter(p => p.type === type); if (!list.length) continue;
    const m = new THREE.InstancedMesh(propGeo(type), type === 'umbrella' ? WMAT.prop.clone() : WMAT.prop, list.length); m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const rec = { mesh: m, list };
    list.forEach((p, i) => { p.idx = i; p.y = heightAt(p.x, p.z); p.st = 0; p.r = PROP_CFG[type].r; p.q = new THREE.Quaternion(); m.setMatrixAt(i, propMatrix(p)); if (p.col) m.setColorAt(i, C(p.col)); });
    root.add(m);
    if (type === 'lamp') {
      rec.head = new THREE.InstancedMesh(propGeo('lampHead'), WMAT.lampHead, list.length);
      const pg = new THREE.PlaneGeometry(13, 13); pg.rotateX(-Math.PI / 2);
      rec.pool = new THREE.InstancedMesh(pg, WMAT.pool2, list.length); rec.pool.renderOrder = 3;
      list.forEach((p, i) => { rec.head.setMatrixAt(i, propMatrix(p)); _v1.set(p.x + Math.sin(p.ry) * 1.6, p.y + 0.04, p.z + Math.cos(p.ry) * 1.6); _m.makeTranslation(_v1.x, _v1.y, _v1.z); rec.pool.setMatrixAt(i, _m); p.hx = _v1.x; p.hz = _v1.z; });
      root.add(rec.head, rec.pool);
    }
    W.inst.props[type] = rec;
  }
  for (const fn of W.post || []) fn(root);
  W.propGrid = new Grid(16, 'p'); for (const p of W.props) W.propGrid.insert(p, p.x - 1, p.z - 1, p.x + 1, p.z + 1);
  // ---- traffic lights ----
  const heads = [];
  for (const nd of W.nodes) {
    if (!nd.lit) continue;
    for (const eid of nd.edges) {
      const e = W.edges[eid], O = W.nodes[e.a === nd.id ? e.b : e.a];
      const dx = Math.sign(nd.x - O.x), dz = Math.sign(nd.z - O.z); // travel direction into node
      const rx = -dz, rz = dx, k = hw + 0.8;
      heads.push({ node: nd, axis: e.axis, x: nd.x + dx * k + rx * k, z: nd.z + dz * k + rz * k, ry: Math.atan2(dx, dz) });
    }
  }
  if (heads.length) {
    const pm = new THREE.InstancedMesh(propGeo('tl'), WMAT.prop, heads.length); pm.castShadow = true;
    const lg = new THREE.BoxGeometry(0.22, 0.22, 0.06);
    const lm = new THREE.InstancedMesh(lg, WMAT.tlLamp, heads.length * 3);
    heads.forEach((h, i) => {
      h.y = heightAt(h.x, h.z); _v1.set(h.x, h.y, h.z); _q.setFromAxisAngle(UP, h.ry); _m.compose(_v1, _q, _s); pm.setMatrixAt(i, _m);
      for (let k = 0; k < 3; k++) {
        _v2.set(0, 5.02 - k * 0.32, -0.17).applyQuaternion(_q).add(_v1); _m.compose(_v2, _q, _s); lm.setMatrixAt(i * 3 + k, _m); lm.setColorAt(i * 3 + k, C('#202020'));
        if (k === 0) { h.gx = _v2.x; h.gz = _v2.z; }
      }
    });
    root.add(pm, lm); W.inst.tl = { pm, lm, heads };
  }
  return root;
}
function propMatrix(p) {
  if (p.st === 3) return _zeroM;
  _v1.set(p.x, p.y, p.z);
  if (p.st === 0) _q.setFromAxisAngle(UP, p.ry);
  else if (p.st === 1) { _q2.setFromAxisAngle(_v2.set(p.ax, 0, p.az), p.ang); _q.setFromAxisAngle(UP, p.ry); _q.premultiply(_q2); }
  else _q.copy(p.q);
  _m.compose(_v1, _q, _s); return _m;
}
const TL_DIM = { R: null };
function updateTrafficLights() {
  const T = W.inst.tl; if (!T) return;
  let dirty = false;
  for (let i = 0; i < T.heads.length; i++) {
    const h = T.heads[i], s = lightState(h.node, h.axis);
    if (h.s === s) continue; h.s = s; dirty = true;
    T.lm.setColorAt(i * 3, s === 'R' ? COL.tlR : TL_OFF);
    T.lm.setColorAt(i * 3 + 1, s === 'Y' ? COL.tlY : TL_OFF);
    T.lm.setColorAt(i * 3 + 2, s === 'G' ? COL.tlG : TL_OFF);
  }
  if (dirty) T.lm.instanceColor.needsUpdate = true;
}
const TL_OFF = new THREE.Color(0.03, 0.03, 0.03);

// ---------- dynamic props (knockable) ----------
const PROPS = { active: [], emitters: [] };
const _near = [];
function knockProp(p, v, sp) {
  if (p.st !== 0) return;
  const rec = W.inst.props[p.type];
  if (p.type === 'lamp') {
    const l = Math.hypot(v.vx, v.vz) || 1; const fx = v.vx / l, fz = v.vz / l;
    p.st = 1; p.ax = fz; p.az = -fx; p.ang = 0; p.av = 0.4 + sp * 0.05;
    rec.pool.setMatrixAt(p.idx, _zeroM); rec.pool.instanceMatrix.needsUpdate = true;
    v.vx *= 0.82; v.vz *= 0.82; SFX.clank(0.8);
  } else if (p.type === 'pump') {
    p.st = 3; pumpBlast(p, v);
  } else {
    p.st = 2; p.vx = v.vx * rand(1.0, 1.4) + rand(-2, 2); p.vz = v.vz * rand(1.0, 1.4) + rand(-2, 2); p.vy = 3 + sp * 0.25;
    p.wx = rand(-8, 8); p.wy = rand(-4, 4); p.wz = rand(-8, 8); p.q.setFromAxisAngle(UP, p.ry); p.rest = 0;
    v.vx *= 0.96; v.vz *= 0.96; SFX.clank(0.5);
    if (p.type === 'hydrant') { PROPS.emitters.push({ x: p.x, y: p.y + 0.3, z: p.z, t: 25 }); SFX.splash(); }
  }
  if (!PROPS.active.includes(p)) PROPS.active.push(p);
  if (v.kind === 'player') G.stats.props++;
}
function vehiclePropHits() {
  for (const v of VEH.list) {
    const sp = Math.hypot(v.vx, v.vz); if (sp < 2) continue;
    const R = Math.max(v.front, -v.rear) + 0.8;
    W.propGrid.query(v.x - R, v.z - R, v.x + R, v.z + R, _near);
    if (!_near.length) continue;
    const c = Math.cos(v.h), s = Math.sin(v.h);
    for (const p of _near) {
      if (p.st === 3 || p.st === 1) continue;
      if (p.st === 2 && sp < 4) continue;
      if (v.y > p.y + 1.2) continue;
      const dx = p.x - v.x, dz = p.z - v.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < v.halfW + p.r && lz < v.front + p.r && lz > v.rear - p.r) {
        if (p.st === 0) knockProp(p, v, sp);
        else { p.vx = v.vx * 1.2; p.vz = v.vz * 1.2; p.vy = 2 + sp * 0.15; p.rest = 0; if (!PROPS.active.includes(p)) PROPS.active.push(p); }
      }
    }
  }
}
function updateProps(dt) {
  const touched = new Set();
  for (let i = PROPS.active.length - 1; i >= 0; i--) {
    const p = PROPS.active[i], rec = W.inst.props[p.type];
    if (p.st === 1) {
      p.av += dt * 3.2; p.ang = Math.min(1.5, p.ang + p.av * dt);
      if (p.ang >= 1.5) { PROPS.active.splice(i, 1); }
    } else if (p.st === 2) {
      p.vy -= 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      _q2.setFromEuler(new THREE.Euler(p.wx * dt, p.wy * dt, p.wz * dt)); p.q.multiply(_q2);
      const gh = heightAt(p.x, p.z) + 0.15;
      if (p.y < gh) { p.y = gh; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; p.wx *= 0.6; p.wy *= 0.6; p.wz *= 0.6; if (Math.abs(p.vy) < 0.6 && Math.hypot(p.vx, p.vz) < 0.4) { p.rest++; } }
      if (p.rest > 6) PROPS.active.splice(i, 1);
    } else { PROPS.active.splice(i, 1); }
    rec.mesh.setMatrixAt(p.idx, propMatrix(p)); touched.add(rec.mesh);
    if (rec.head) { rec.head.setMatrixAt(p.idx, propMatrix(p)); touched.add(rec.head); }
  }
  for (const pr of W.props) if (pr.st === 3 && !pr.hidden) { pr.hidden = true; const rec = W.inst.props[pr.type]; rec.mesh.setMatrixAt(pr.idx, _zeroM); touched.add(rec.mesh); }
  for (const m of touched) m.instanceMatrix.needsUpdate = true;
  for (let i = PROPS.emitters.length - 1; i >= 0; i--) {
    const e = PROPS.emitters[i]; e.t -= dt; if (e.t <= 0) { PROPS.emitters.splice(i, 1); continue; }
    const d2 = (e.x - camera.position.x) ** 2 + (e.z - camera.position.z) ** 2; if (d2 > 150 * 150) continue;
    const n = Math.min(6, e.t);
    for (let k = 0; k < n; k++) FX.blood.emit(e.x + rand(-0.1, 0.1), e.y, e.z + rand(-0.1, 0.1), rand(-1, 1), rand(8, 12), rand(-1, 1), 2.2, rand(0.18, 0.3), COL.water, 0.75, 14, 0.2, 0.3, 2);
  }
}
