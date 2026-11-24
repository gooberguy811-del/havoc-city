// =====================================================================
//  NEW YORK: a Manhattan-style grid (long blocks between avenues),
//  the Hudson to the west, Central Park, a Times Square plaza full of
//  neon, a stepped spire tower, and the airport out east
// =====================================================================
const NYC_AX = [-225, -140, -55, 30, 115, 200];
const NYC_ZS = [-260, -208, -156, -104, -52, 0, 52, 104, 156, 208, 260];
function genNYC(W, rng, addNode, addEdge) {
  W.name = 'New York'; W.style = 'city';
  W.groundCol = '#2b2d31'; W.miniBg = 'rgba(14,16,21,.92)'; W.miniFlat = '#1f232b';
  W.cityC = { x: -12, z: -40, r: 300, max: 165, min: 34 };
  const hw = 6, NX = NYC_AX.length, NZ = NYC_ZS.length, nid = (i, j) => j * NX + i;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) addNode(NYC_AX[i], NYC_ZS[j]);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { if (i < NX - 1) addEdge(nid(i, j), nid(i + 1, j)); if (j < NZ - 1) addEdge(nid(i, j), nid(i, j + 1)); }
  const all = { n: 1, s: 1, e: 1, w: 1 };
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    let type = 'city', extra = {};
    if (i >= 1 && i <= 3 && j >= 7) type = 'cpark';
    else if (i === 2 && j === 4) type = 'tsq';
    else if (i === 2 && j === 1) type = 'spire';
    else if (j === 0) extra = { hMax: 120, hMin: 40 };                  // the Financial District
    else if (Math.abs(i - 2) <= 1 && Math.abs(j - 4) <= 1) extra = { neon: 1, hMax: 150 };   // around Times Square
    else if (i === 0 || i === 4) extra = { hMax: 70, hMin: 14 };
    W.blocks.push(Object.assign({ x0: NYC_AX[i] + hw, x1: NYC_AX[i + 1] - hw, z0: NYC_ZS[j] + hw, z1: NYC_ZS[j + 1] - hw, h: 0.15, type, sides: all, ci: i, cj: j }, extra));
  }
  const m = NYC_AX[0] - hw, M = NYC_AX[NX - 1] + hw, zm = NYC_ZS[0] - hw, zM = NYC_ZS[NZ - 1] + hw, E = 38;
  W.blocks.push({ x0: m - E, x1: m, z0: zm - E, z1: zM + E, h: 0.15, type: 'margin', sides: { e: 1 } });
  W.blocks.push({ x0: M, x1: M + E, z0: zm - E, z1: zM + E, h: 0.15, type: 'margin', sides: { w: 1 } });
  W.blocks.push({ x0: m, x1: M, z0: zm - E, z1: zm, h: 0.15, type: 'margin', sides: { s: 1 } });
  W.blocks.push({ x0: m, x1: M, z0: zM, z1: zM + E, h: 0.15, type: 'margin', sides: { n: 1 } });
  W.waters = [{ x0: -1400, x1: m - E - 1, z0: -1400, z1: 1400, name: 'the Hudson' }];
  W.bounds = { x0: m - E, x1: M + E, z0: zm - E, z1: zM + E };
  W.spawnEdges = [[nid(2, 5), nid(3, 5)], [nid(1, 2), nid(1, 3)], [nid(3, 6), nid(4, 6)]];
}
// Central Park: lawns, paths, rocks, lots of trees, and a lake in the middle block
function cparkBlock(W, b, rng) {
  b.top = 'grass';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, w = b.x1 - b.x0, d = b.z1 - b.z0, D = W.details;
  const lake = b.ci === 2 && b.cj === 8;
  if (lake) { W.waters.push({ x0: cx - w * 0.32, x1: cx + w * 0.32, z0: cz - d * 0.3, z1: cz + d * 0.3, name: 'the lake' }); D.push([w * 0.68, 0.3, 0.5, cx, b.h + 0.15, cz - d * 0.3 - 0.25, '#9d968a'], [w * 0.68, 0.3, 0.5, cx, b.h + 0.15, cz + d * 0.3 + 0.25, '#9d968a']); }
  // winding paths
  D.push([w - 6, 0.04, 2.2, cx, b.h + 0.02, cz + (lake ? d * 0.38 : (rng() - 0.5) * d * 0.4), '#c9c0ad']);
  if (!lake) D.push([2.2, 0.04, d - 6, cx + (rng() - 0.5) * w * 0.5, b.h + 0.02, cz, '#c9c0ad']);
  for (let k = 0; k < 3; k++) { const x = lerp(b.x0 + 6, b.x1 - 6, rng()), z = lerp(b.z0 + 6, b.z1 - 6, rng()); if (lake && Math.abs(x - cx) < w * 0.36 && Math.abs(z - cz) < d * 0.34) continue; const s = 1.5 + rng() * 2.5; D.push([s * 1.6, s * 0.7, s, x, b.h + s * 0.3, z, '#8a8780']); W.addBox(x - s * 0.8, z - s * 0.5, x + s * 0.8, z + s * 0.5, b.h + s * 0.6, 'planter'); }
  for (let k = 0; k < 4; k++) { const x = lerp(b.x0 + 5, b.x1 - 5, rng()), z = cz + (rng() < 0.5 ? -1 : 1) * (d / 2 - 4); D.push([2.6, 0.45, 0.6, x, b.h + 0.22, z, '#6b5a45']); W.addBox(x - 1.3, z - 0.3, x + 1.3, z + 0.3, b.h + 0.45, 'bench'); }
  const n = Math.round(w * d / 70);
  for (let k = 0; k < n; k++) {
    const x = lerp(b.x0 + 3, b.x1 - 3, rng()), z = lerp(b.z0 + 3, b.z1 - 3, rng());
    if (lake && Math.abs(x - cx) < w * 0.36 && Math.abs(z - cz) < d * 0.36) continue;
    addTree(W, 'oak', x, z, 0.75 + rng() * 0.5);
  }
}
// Times Square: a bright pedestrian plaza with red glowing steps and towers of billboards
function tsqBlock(W, b, rng) {
  b.top = 'side';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, w = b.x1 - b.x0, d = b.z1 - b.z0, D = W.details;
  for (let k = 0; k < 6; k++) D.push([10, 0.35 + k * 0.35, 1.2, cx, b.h + (0.35 + k * 0.35) / 2, cz - 3 + k * 1.2, k % 2 ? '#c8352b' : '#d9473a']);
  W.addBox(cx - 5, cz - 3.6, cx + 5, cz + 3.6, b.h + 2.1, 'c');
  const cols = ['#ff2e88', '#22e0ff', '#ffd02e', '#3dff8b', '#b44dff', '#ff6a13'];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = cx + sx * (w / 2 - 7), z = cz + sz * (d / 2 - 6), h = 26 + rng() * 22;
    W.bldgs.push({ x0: x - 5, x1: x + 5, z0: z - 4, z1: z + 4, y: b.h, h, col: '#2a2d33', tex: 'office' }); W.addBox(x - 5, z - 4, x + 5, z + 4, b.h + h, 'b');
    for (let k = 0; k < 4; k++) {
      const y = b.h + 6 + k * (h - 8) / 4, c = cols[(k + (sx > 0 ? 2 : 0) + (sz > 0 ? 1 : 0)) % cols.length];
      // giant glowing ad screens
      W.bills.push({ axis: 'x', dir: sx < 0 ? 1 : -1, x: x - sx * 5.05, z, y, w: 7.2, h: (h - 10) / 4 - 0.6, ad: (k + (sx > 0 ? 1 : 0)) % 4, screen: true });
      W.bills.push({ axis: 'z', dir: -sz, x, z: z - sz * 4.05, y, w: 9.2, h: (h - 10) / 4 - 0.6, ad: (k + 2 + (sz > 0 ? 1 : 0)) % 4, screen: true });
    }
  }
  for (let k = 0; k < 6; k++) { const x = cx + (rng() - 0.5) * (w - 24), z = cz + (rng() < 0.5 ? -1 : 1) * (d / 2 - 2.5); D.push([0.9, 0.9, 0.9, x, b.h + 0.45, z, '#7a6a55']); }
}
// a stepped art-deco spire, the tallest thing in the city
function spireBlock(W, b, rng) {
  b.top = 'side';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, D = W.details, y0 = b.h;
  const tiers = [[42, 30, 52], [32, 23, 44], [24, 17, 48], [14, 11, 30], [8, 7, 14]];
  let y = y0, base = null;
  for (let k = 0; k < tiers.length; k++) {
    const [w, d, h] = tiers[k];
    W.bldgs.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y, h, col: k % 2 ? '#c9c2b0' : '#d6cfbd', tex: 'office' });
    if (k === 0) base = W.addBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, y + h, 'b');
    else { const t = W.addBox(cx - w / 2 + 0.05, cz - d / 2 + 0.05, cx + w / 2 - 0.05, cz + d / 2 - 0.05, y + h, 'b'); t.tierOf = base; }
    D.push([w + 0.6, 0.5, d + 0.6, cx, y + h + 0.25, cz, '#a79f8c']);
    y += h;
  }
  D.push([1.4, 40, 1.4, cx, y + 20, cz, '#c9ccd2'], [0.5, 16, 0.5, cx, y + 48, cz, '#e6e8eb']);
  W.neons.push({ axis: 'z', dir: -1, x: cx, z: cz - 3.6, y: y - 6, w: 6, h: 1.2, col: '#ffd02e' });
  W.spire = { x: cx, z: cz, top: y + 56 };
}
// distant New Jersey skyline across the river, and the outer boroughs
function nycSkyline(W, L, rng) {
  for (let k = 0; k < 60; k++) {
    const far = k < 34, x = far ? -380 - rng() * 320 : (rng() - 0.5) * 520, z = far ? (rng() - 0.5) * 1100 : (rng() < 0.5 ? -1 : 1) * (380 + rng() * 260);
    const w = 16 + rng() * 26, d = 16 + rng() * 26, h = far ? 30 + rng() * 120 : 20 + rng() * 60;
    L.office.push(boxUV(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 32, 28.8, { offU: ((rng() * 8) | 0) / 8, roofUV: [0.004, 0.004], color: C(rp(rng, ['#5a636e', '#6b737d', '#4c545e', '#7a828b', '#8a7f72'])) }));
  }
}
