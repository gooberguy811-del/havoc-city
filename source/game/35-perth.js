// =====================================================================
//  PERTH: a compressed, game-scale take on Perth WA
//  (Swan River, CBD, Northbridge, Kings Park, Elizabeth Quay, South Perth,
//   Burswood stadium, Cottesloe Beach). x = east, z = south.
// =====================================================================
const PERTH_HOUSE = ['#b9664c', '#c97b58', '#e8dcc4', '#d9c9a3', '#f0ede6', '#a85a42', '#cfc2a8', '#ddd3bf'];
const PERTH_ROOF = ['#8e3b2a', '#a44a32', '#5c6066', '#7b3527', '#6b6e72', '#963f2c'];
const WATER_SURF = 0, WATER_BED = -1.6, SWIM_Y = -1.25;
function waterAt(x, z) {
  if (!W || !W.waters) return false;
  for (const r of W.waters) {
    if (x <= r.x0 || x >= r.x1 || z <= r.z0 || z >= r.z1) continue;
    for (const d of W.dry) if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) return false;
    return true;
  }
  return false;
}
function subtractRects(r, holes) {
  const hs = holes.filter(h => h.x1 > r.x0 && h.x0 < r.x1 && h.z1 > r.z0 && h.z0 < r.z1);
  if (!hs.length) return [r];
  const xs = [...new Set([r.x0, r.x1, ...hs.flatMap(h => [clamp(h.x0, r.x0, r.x1), clamp(h.x1, r.x0, r.x1)])])].sort((a, b) => a - b);
  const zs = [...new Set([r.z0, r.z1, ...hs.flatMap(h => [clamp(h.z0, r.z0, r.z1), clamp(h.z1, r.z0, r.z1)])])].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
    if (!hs.some(h => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1)) out.push({ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1] });
  }
  return out;
}
// road network from straight axis-aligned lines; nodes wherever lines cross or end
function roadsFromLines(addNode, addEdge, V, H) {
  const map = new Map();
  const node = (x, z) => { const k = x + ',' + z; if (!map.has(k)) map.set(k, addNode(x, z)); return map.get(k); };
  const pv = V.map(([x, z0, z1]) => [z0, z1]), ph = H.map(([z, x0, x1]) => [x0, x1]);
  V.forEach(([x, z0, z1], i) => H.forEach(([z, x0, x1], j) => { if (x >= x0 && x <= x1 && z >= z0 && z <= z1) { pv[i].push(z); ph[j].push(x); } }));
  V.forEach(([x], i) => { const zs = [...new Set(pv[i])].sort((a, b) => a - b); for (let k = 0; k < zs.length - 1; k++) addEdge(node(x, zs[k]), node(x, zs[k + 1])); });
  H.forEach(([z], j) => { const xs = [...new Set(ph[j])].sort((a, b) => a - b); for (let k = 0; k < xs.length - 1; k++) addEdge(node(xs[k], z), node(xs[k + 1], z)); });
  return node;
}
function genPerth(W, rng, addNode, addEdge) {
  W.name = 'Perth'; W.style = 'perth'; W.hideWalls = true;
  W.groundCol = '#a9a874'; W.miniBg = 'rgba(30,40,26,.92)'; W.miniFlat = '#3d4c31';
  W.cityC = { x: 60, z: -60, r: 210, max: 150, min: 20 };
  const hw = 6;
  const V = [[-490, -310, 30], [-410, -310, 30], [-330, -310, 30], [-120, -310, 450], [-50, -310, 30], [20, -310, 30], [90, -310, 30], [160, -310, 30], [230, -310, 30], [300, -310, 450],
    [400, -90, 30], [540, -90, 30], [-20, 290, 450], [80, 290, 450], [180, 290, 450],
    [-490, -470, -310], [-410, -470, -310], [-330, -470, -310], [-230, -470, -310], [-120, -470, -310], [-50, -470, -310], [20, -470, -310], [90, -470, -310], [160, -470, -310], [230, -470, -310], [300, -470, -310],
    [-120, 450, 530], [-20, 450, 530], [80, 450, 530], [180, 450, 530], [300, 450, 530]];
  const H = [[-310, -490, 300], [-250, -120, 300], [-190, -330, 300], [-150, -490, 300], [-90, -120, 540], [-60, -490, -120], [-30, -120, 300], [30, -490, 300], [30, 400, 540],
    [290, -120, 300], [370, -120, 300], [450, -120, 300],
    [-390, -490, 300], [-470, -490, 300], [530, -120, 300]];
  const node = roadsFromLines(addNode, addEdge, V, H);
  const all = { n: 1, s: 1, e: 1, w: 1 };
  const cell = (xa, xb, za, zb, type, extra) => { const b = Object.assign({ x0: xa + hw, x1: xb - hw, z0: za + hw, z1: zb - hw, h: 0.15, type, sides: all }, extra || {}); W.blocks.push(b); return b; };
  const XS = [-120, -50, 20, 90, 160, 230, 300];
  for (let i = 0; i < 6; i++) {
    const a = XS[i], c = XS[i + 1];
    cell(a, c, -310, -250, 'city', { hMax: 22, hMin: 8, neon: 0.85, tex: i % 2 ? 'house' : 'office' });   // Northbridge
    cell(a, c, -250, -190, i === 2 ? 'plaza' : 'city', { hMax: 26, hMin: 9, neon: 0.8 });                    // Northbridge / Cultural Centre
    cell(a, c, -190, -150, 'rail', { station: i === 2 });                                                     // the railway, Perth Station
    cell(a, c, -150, -90, 'city');
    cell(a, c, -90, -30, 'city');
    cell(a, c, -30, 30, i === 3 ? 'park' : 'city', i === 3 ? {} : { hMax: 110 });                             // Supreme Court Gardens
  }
  cell(-330, -120, -310, -190, 'city', { hMax: 45, hMin: 12 });   // West Perth
  cell(-330, -120, -190, -150, 'city', { hMax: 38, hMin: 12 });
  cell(-330, -120, -150, -60, 'kingspark', { kp: 'n' });            // Kings Park
  cell(-330, -120, -60, 30, 'kingspark', { kp: 's' });
  for (const [xa, xb] of [[-490, -410], [-410, -330]]) for (const [za, zb] of [[-310, -150], [-150, -60], [-60, 30]]) cell(xa, xb, za, zb, 'house', { pitched: true });
  const SX = [-120, -20, 80, 180, 300];
  for (let i = 0; i < 4; i++) {
    cell(SX[i], SX[i + 1], 290, 370, i === 0 ? 'city' : 'house', i === 0 ? { hMax: 70, hMin: 22 } : { pitched: true });  // Mill Point towers, South Perth
    cell(SX[i], SX[i + 1], 370, 450, i === 2 ? 'zoo' : 'house', { pitched: true });
  }
  cell(400, 540, -90, 30, 'stadium');
  // the northern suburbs and Como to the south
  const NX = [-490, -410, -330, -230, -120, -50, 20, 90, 160, 230, 300];
  for (let i = 0; i < NX.length - 1; i++) for (const [za, zb] of [[-470, -390], [-390, -310]]) cell(NX[i], NX[i + 1], za, zb, (i === 4 && za === -390) || (i === 7 && za === -470) ? 'park' : 'house', { pitched: true });
  for (let i = 0; i < 4; i++) cell(SX[i], SX[i + 1], 450, 530, i === 1 ? 'park' : 'house', { pitched: true });
  W.waters = [
    { x0: -1400, x1: -560, z0: -1400, z1: 1400, name: 'Indian Ocean' },
    { x0: -560, x1: -130, z0: 50, z1: 1400, name: 'Melville Water' },
    { x0: -130, x1: -100, z0: 50, z1: 270, name: 'the Narrows' },
    { x0: -100, x1: 330, z0: 50, z1: 270, name: 'the Swan River' },
    { x0: 330, x1: 380, z0: -262, z1: 270, name: 'the Swan River' },
    { x0: 28, x1: 82, z0: 37, z1: 50, name: 'Elizabeth Quay' }
  ];
  W.dry = [
    { x0: -127, x1: -113, z0: 40, z1: 280, deck: 'z' },   // Narrows Bridge
    { x0: 293, x1: 307, z0: 40, z1: 280, deck: 'z' },     // the Causeway
    { x0: 325, x1: 385, z0: -97, z1: -83, deck: 'x' },    // Windan Bridge
    { x0: 250, x1: 350, z0: 130, z1: 190 }                // Heirisson Island
  ];
  W.flats.push({ x0: -560, x1: -496, z0: -340, z1: 50, type: 'cott', tex: 'sand' });
  W.flats.push({ x0: -496, x1: 330, z0: 36, z1: 50, type: 'fore', tex: 'none' });
  W.flats.push({ x0: -100, x1: 330, z0: 270, z1: 284, type: 'fore', tex: 'none' });
  W.flats.push({ x0: 250, x1: 350, z0: 130, z1: 190, type: 'island', tex: 'grass' });
  W.flats.push({ x0: 386, x1: 580, z0: 36, z1: 480, type: 'green', tex: 'none' });
  W.flats.push({ x0: 306, x1: 330, z0: -262, z1: 36, type: 'green', tex: 'none' });
  W.flats.push({ x0: 306, x1: 580, z0: 284, z1: 480, type: 'green', tex: 'none' });
  // open bushland around the edge of town, then a farm fence (you can see it, so it's no invisible wall)
  W.flats.push({ x0: -560, x1: 1000, z0: -820, z1: -476, type: 'green', tex: 'none' });
  W.flats.push({ x0: -126, x1: 1000, z0: 536, z1: 880, type: 'green', tex: 'none' });
  W.flats.push({ x0: 306, x1: 580, z0: 480, z1: 536, type: 'green', tex: 'none' });
  W.flats.push({ x0: -560, x1: -496, z0: -476, z1: -340, type: 'green', tex: 'none' });
  W.flats.push({ x0: 586, x1: 1000, z0: -476, z1: 536, type: 'green', tex: 'none' });
  W.bounds = { x0: -780, x1: 1000, z0: -820, z1: 880 }; W.fenceWalls = true;
  W.spawnEdges = [[node(20, -30), node(90, -30)], [node(-120, -150), node(-120, -90)], [node(-20, 370), node(80, 370)]];
  perthLandmarks(W, rng);
}
function perthLandmarks(W, rng) {
  const D = W.details;
  // bridge decks, railings and lamps
  for (const d of W.dry) {
    if (!d.deck) continue;
    const cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2, w = d.x1 - d.x0, l = d.z1 - d.z0;
    D.push([w, 1.0, l, cx, -0.5, cz, '#9ea2a7']);
    if (d.deck === 'z') {
      for (const x of [d.x0 + 0.5, d.x1 - 0.5]) { W.addBox(x - 0.4, d.z0 + 4, x + 0.4, d.z1 - 4, 1.1, 'rail'); D.push([0.5, 1.1, l - 8, x, 0.55, cz, '#c9ccd1']); }
      for (let z = d.z0 + 18; z < d.z1 - 10; z += 34) W.props.push({ type: 'lamp', x: d.x0 + 0.9, z, ry: Math.PI / 2 }, { type: 'lamp', x: d.x1 - 0.9, z: z + 17, ry: -Math.PI / 2 });
    } else {
      for (const z of [d.z0 + 0.5, d.z1 - 0.5]) { W.addBox(d.x0 + 3, z - 0.4, d.x1 - 3, z + 0.4, 1.1, 'rail'); D.push([w - 6, 1.1, 0.5, cx, 0.55, z, '#c9ccd1']); }
    }
  }
  // guard rail where the Kwinana Freeway runs beside Melville Water
  W.addBox(-131.6, 296, -130.6, 470, 1.0, 'rail'); D.push([1, 1, 174, -131.1, 0.5, 383, '#b9bcc1']);
  // Bell Tower at Barrack Square
  { const x = 118, z = 43; D.push([11, 7, 11, x, 3.5, z, '#c8b48a']);
    for (let k = 0; k < 6; k++) { const w = 7 - k * 1.05, h = 10.5; D.push([w, h, w, x, 7 + k * h + h / 2, z, k % 2 ? '#6e9cc0' : '#5f8fb0']); }
    for (const s of [1, -1]) D.push([1.0, 56, 7, x + s * 4.6, 30, z, '#b87333']);
    D.push([0.5, 8, 0.5, x, 74, z, '#d0d4d8']);
    // hitboxes that follow the shape: the stone base, each narrowing glass section, the two copper sails
    W.addBox(x - 5.5, z - 5.5, x + 5.5, z + 5.5, 7, 'b');
    for (let k = 0; k < 6; k++) { const hw = (7 - k * 1.05) / 2; W.addBox(x - hw, z - hw, x + hw, z + hw, 7 + (k + 1) * 10.5, 'b'); }
    for (const s of [1, -1]) W.addBox(x + s * 4.6 - 0.5, z - 3.5, x + s * 4.6 + 0.5, z + 3.5, 58, 'b'); }
  // Spanda sculpture
  for (let k = 0; k < 9; k++) { const h = 16 + rng() * 13, a = (k - 4) * 0.2, px = 18 + Math.sin(a) * 3, pz = 44 + Math.cos(a) * 1.5 - 1; D.push([0.45, h, 0.45, px, h / 2, pz, '#f4f4f2', a]); W.addBox(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, h, 'p'); }   // each pole is solid, and you can walk between them
  // Elizabeth Quay footbridge + Matagarup Bridge arch (custom geometry)
  W.custom.push(L => {
    const deck = boxG(56, 0.5, 3, 55, 1.6, 43.5, C('#e9e9e6')); L.roof.push(deck);
    for (let k = 0; k < 12; k++) { const t0 = k / 12, t1 = (k + 1) / 12, x0 = 30 + t0 * 50, x1 = 30 + t1 * 50, y0 = 1.8 + Math.sin(t0 * Math.PI) * 7, y1 = 1.8 + Math.sin(t1 * Math.PI) * 7;
      const g = new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0), 0.35, 0.35); g.rotateZ(Math.atan2(y1 - y0, x1 - x0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, 43.5); L.roof.push(colorize(g, C('#f2f2f2'))); }
    // Matagarup: walkway across the upper Swan with a tall single arch
    L.roof.push(boxG(92, 0.7, 4.5, 353, 4.2, -30, C('#a7adb4')));
    for (const x of [312, 394]) L.roof.push(boxG(3, 4.2, 3, x, 2.1, -30, C('#8f959c')));
    const pts = []; for (let k = 0; k <= 18; k++) { const t = k / 18; pts.push([316 + t * 74, 4.5 + Math.sin(t * Math.PI) * 58]); }
    for (let k = 0; k < 18; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]; const g = new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0) + 0.3, 1.4, 1.4); g.rotateZ(Math.atan2(y1 - y0, x1 - x0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, -30); L.roof.push(colorize(g, C('#f4f4f4')));
      if (k % 2 === 0 && k > 0 && k < 18) { const cy = (y0 + 4.5) / 2; L.roof.push(boxG(0.12, y0 - 4.5, 0.12, x0, cy, -30, C('#d9dde2'))); } }
  });
  // Cottesloe: the teahouse on the sand, Norfolk pines, the pylon off the beach
  W.bldgs.push({ x0: -541, z0: -130, x1: -515, z1: -110, y: 0, h: 6.5, col: '#efe6d2', tex: 'house' });
  W.bldgs.push({ x0: -536, z0: -126, x1: -520, z1: -114, y: 6.5, h: 3.6, col: '#efe6d2', tex: 'house' });
  W.roofs.push({ x0: -537, z0: -127, x1: -519, z1: -113, y: 10.1, h: 3.4, col: '#a44a32' });
  W.addBox(-541, -130, -515, -110, 10, 'b');
  D.push([1.6, 11, 1.6, -608, 3.5, -70, '#3a3d42'], [7, 0.8, 0.8, -608, 8.2, -70, '#3a3d42'], [0.8, 0.8, 7, -608, 6.4, -70, '#3a3d42']);
}
function railBlock(W, b, rng) {
  b.top = 'lot';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, f = 0.35, fh = b.h + 1.6, fc = '#70757d';
  W.addBox(b.x0, b.z0, b.x1, b.z0 + f, fh, 'fence'); W.addBox(b.x0, b.z1 - f, b.x1, b.z1, fh, 'fence');
  W.addBox(b.x0, b.z0, b.x0 + f, b.z1, fh, 'fence'); W.addBox(b.x1 - f, b.z0, b.x1, b.z1, fh, 'fence');
  W.details.push([b.x1 - b.x0, 1.6, f, cx, b.h + 0.8, b.z0 + f / 2, fc], [b.x1 - b.x0, 1.6, f, cx, b.h + 0.8, b.z1 - f / 2, fc], [f, 1.6, b.z1 - b.z0, b.x0 + f / 2, b.h + 0.8, cz, fc], [f, 1.6, b.z1 - b.z0, b.x1 - f / 2, b.h + 0.8, cz, fc]);
  const len = b.x1 - b.x0 - 1;
  for (const tz of [cz - 4, cz + 4]) { W.details.push([len, 0.18, 3.2, cx, b.h + 0.09, tz, '#4d4740']); for (const o of [-0.72, 0.72]) W.details.push([len, 0.14, 0.12, cx, b.h + 0.25, tz + o, '#9a9da3']); }
  const train = (tz, n) => { const L = Math.min(len - 6, n); W.details.push([L, 3.4, 3.0, cx, b.h + 2.1, tz, '#d7dadf'], [L + 0.05, 0.9, 3.02, cx, b.h + 2.8, tz, '#24303c'], [L + 0.06, 0.35, 3.04, cx, b.h + 1.1, tz, '#1f6fb5']); W.addBox(cx - L / 2, tz - 1.6, cx + L / 2, tz + 1.6, b.h + 3.8, 'train'); };
  if (b.station) {
    W.details.push([len - 6, 1.0, 3.2, cx, b.h + 0.5, cz, '#c7c1b4'], [len - 4, 0.35, 12, cx, b.h + 5.6, cz, '#e9e6e0']);
    for (let x = b.x0 + 6; x < b.x1 - 4; x += 10) W.details.push([0.4, 5.4, 0.4, x, b.h + 2.9, cz, '#8f949b']);
    train(cz - 4, 48);
  } else if (rng() < 0.4) train(rng() < 0.5 ? cz - 4 : cz + 4, 40);
}
function kingsParkBlock(W, b, rng) {
  b.top = 'grass';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, north = b.kp === 'n';
  b.paths = [[b.x0 + 3, cz - 1.8, b.x1 - 3, cz + 1.8]];
  let lx = 0, lz = 0;
  if (north) { // DNA Tower
    lx = cx - 30; lz = cz; for (let k = 0; k < 16; k++) W.details.push([3.4, 0.9, 1.0, lx, b.h + 0.6 + k * 1.05, lz, '#e7e1d3', k * 0.42]);
    W.details.push([0.7, 17.5, 0.7, lx, b.h + 8.8, lz, '#b9b3a6']); W.addBox(lx - 2, lz - 2, lx + 2, lz + 2, 18, 'b');
  } else { // State War Memorial, looking over the river
    lx = cx + 20; lz = b.z1 - 16;
    W.details.push([9, 1.6, 9, lx, b.h + 0.8, lz, '#c9b99a'], [3, 21, 3, lx, b.h + 12, lz, '#e6dcc4'], [2.2, 1.6, 2.2, lx, b.h + 23.2, lz, '#d4c8ae'], [1.6, 0.8, 1.6, lx - 7, b.h + 0.4, lz, '#ff7a2e']);
    W.addBox(lx - 4.5, lz - 4.5, lx + 4.5, lz + 4.5, 24, 'b');
  }
  // Fraser Avenue's lemon-scented gums line the road between the two halves
  const edgeZ = north ? b.z1 - 2.5 : b.z0 + 2.5;
  for (let x = b.x0 + 8; x < b.x1 - 6; x += 13) addTree(W, 'oak', x, edgeZ, 0.95 + rng() * 0.3);
  let n = 0;
  for (let t = 0; t < 400 && n < 34; t++) {
    const x = lerp(b.x0 + 5, b.x1 - 5, rng()), z = lerp(b.z0 + 6, b.z1 - 6, rng());
    if (Math.abs(z - cz) < 4 || Math.hypot(x - lx, z - lz) < 10 || Math.abs(z - edgeZ) < 5) continue;
    if (W.trees.some(tr => Math.hypot(tr.x - x, tr.z - z) < 6)) continue;
    addTree(W, 'oak', x, z, 0.8 + rng() * 0.7); n++;
  }
}
function zooBlock(W, b, rng) {
  b.top = 'grass';
  const i = 3.2, fh = b.h + 2, fc = '#5d6b4c', cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const fences = [[b.x0 + i, b.z0 + i, b.x1 - i, b.z0 + i + 0.3], [b.x0 + i, b.z1 - i - 0.3, b.x1 - i, b.z1 - i], [b.x0 + i, b.z0 + i, b.x0 + i + 0.3, cz - 4], [b.x0 + i, cz + 4, b.x0 + i + 0.3, b.z1 - i], [b.x1 - i - 0.3, b.z0 + i, b.x1 - i, b.z1 - i]];
  for (const [x0, z0, x1, z1] of fences) { W.addBox(x0, z0, x1, z1, fh, 'fence'); W.details.push([x1 - x0, 2, z1 - z0, (x0 + x1) / 2, b.h + 1, (z0 + z1) / 2, fc]); }
  W.bldgs.push({ x0: b.x0 + 8, z0: cz - 6, x1: b.x0 + 22, z1: cz + 6, y: b.h, h: 4.2, col: '#d9c9a3', tex: 'house' }); W.addBox(b.x0 + 8, cz - 6, b.x0 + 22, cz + 6, b.h + 4.2, 'b');
  for (let k = 0; k < 6; k++) { const s = 1 + rng() * 2.2, x = lerp(b.x0 + 30, b.x1 - 10, rng()), z = lerp(b.z0 + 10, b.z1 - 10, rng()); W.trees.push({ type: 'rock', x, z, s, r: rng() * TAU }); }
  let n = 0; for (let t = 0; t < 200 && n < 16; t++) { const x = lerp(b.x0 + 26, b.x1 - 8, rng()), z = lerp(b.z0 + 8, b.z1 - 8, rng()); if (W.trees.some(tr => Math.hypot(tr.x - x, tr.z - z) < 7)) continue; addTree(W, rng() < 0.4 ? 'palm' : 'oak', x, z, 0.8 + rng() * 0.5); n++; }
}
// the stadium on Burswood: an oval with goalposts, a tiered bowl full of fans, a roof canopy with
// light rigs, scoreboards at both ends, and four tunnels you can walk or drive through onto the ground
function stadiumBlock(W, b, rng) {
  b.top = 'lot';
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, base = b.h, N = 56, T = 14;
  const FX = 40, FZ = 30, IX = 42, IZ = 32, OX = 58, OZ = 46, TUN = 4.2, TH = 6.5;
  const S = W.stadium = { cx, cz, fx: FX, fz: FZ, lights: [], ix: IX, iz: IZ, ox: OX, oz: OZ };
  const ell = (a, sx, sz) => [cx + Math.cos(a) * sx, cz + Math.sin(a) * sz];
  const tunAt = a => { for (const t of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const d = Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t))); const r = t % Math.PI === 0 ? OX : OZ; if (d < Math.atan(TUN / r) + 0.02) return t; } return null; };
  W.custom.push(L => {
    // the playing surface: grass, mowing stripes, boundary line, centre square and circles
    const f = new THREE.CylinderGeometry(1, 1, 0.2, 64); f.scale(IX + 1, 1, IZ + 1); f.translate(cx, base + 0.02, cz); L.grass.push(f);
    for (let x = -FX + 4; x < FX; x += 8) { const hz = FZ * Math.sqrt(Math.max(0, 1 - ((x + 2) / FX) ** 2)); if (hz < 2) continue; L.roof.push(boxG(4, 0.02, hz * 2, cx + x + 2, base + 0.13, cz, C('#5d9d3e'))); }
    const ring = (sx, sz, w, y) => { const g = new THREE.RingGeometry(1 - w, 1, 72); g.rotateX(-Math.PI / 2); g.scale(sx, 1, sz); g.translate(cx, base + y, cz); L.mark.push(g); };
    ring(FX, FZ, 0.012, 0.15); ring(5, 5, 0.06, 0.16); ring(1.5, 1.5, 0.15, 0.16);
    L.roof.push(boxG(20, 0.02, 3, cx, base + 0.15, cz, C('#c9b07a')));
    for (const s of [-1, 1]) { const g = new THREE.RingGeometry(0.97, 1, 40, 1, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI); g.rotateX(-Math.PI / 2); g.scale(18, 1, 18); g.translate(cx + s * FX, base + 0.16, cz); L.mark.push(g); }
    // the bowl: fourteen tiers of seats rising to the back, cut away at the four tunnels
    for (let k = 0; k < N; k++) {
      const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, am = (a0 + a1) / 2, tun = tunAt(am) !== null;
      for (let t = 0; t < T; t++) {
        const s0 = t / T, s1 = (t + 1) / T, top = base + 1.2 + t * 1.45, bot = tun ? Math.max(base, base + TH) : base;
        if (top <= bot + 0.3) continue;
        const [x0, z0] = ell(am, IX + (OX - IX) * s0, IZ + (OZ - IZ) * s0), [x1, z1] = ell(am, IX + (OX - IX) * s1, IZ + (OZ - IZ) * s1);
        const [p0x, p0z] = ell(a0, IX + (OX - IX) * (s0 + s1) / 2, IZ + (OZ - IZ) * (s0 + s1) / 2), [p1x, p1z] = ell(a1, IX + (OX - IX) * (s0 + s1) / 2, IZ + (OZ - IZ) * (s0 + s1) / 2);
        const len = Math.hypot(p1x - p0x, p1z - p0z) * 1.06, dep = Math.hypot(x1 - x0, z1 - z0) * 1.04, h = top - bot, ry = Math.atan2(-(p1z - p0z), p1x - p0x);
        const g = new THREE.BoxGeometry(len, h, dep), uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) { const face = (i / 4) | 0; uv.setXY(i, uv.getX(i) * len / 2.6, face === 2 || face === 3 ? uv.getY(i) : uv.getY(i) * h / 1.45 + (1 - (h / 1.45) % 1)); }
        g.rotateY(ry); g.translate((x0 + x1) / 2, bot + h / 2, (z0 + z1) / 2);
        const empty = (k * 7 + t * 3) % 23 === 0; colorize(g, C(t === 0 ? '#e9e6df' : empty ? '#6b5a4a' : '#ffffff')); L.stand.push(g);
      }
      // bronze facade fins, the back wall, and the white roof canopy above
      const [fx0, fz0] = ell(a0, OX + 1, OZ + 1), [fx1, fz1] = ell(a1, OX + 1, OZ + 1), flen = Math.hypot(fx1 - fx0, fz1 - fz0) + 0.3, fry = Math.atan2(-(fz1 - fz0), fx1 - fx0);
      const fb = tun ? base + TH : base;
      L.roof.push(boxG(flen, base + 26 - fb, 1.2, (fx0 + fx1) / 2, (fb + base + 26) / 2, (fz0 + fz1) / 2, C(k % 2 ? '#a8743f' : '#b9844c'), fry));
      const [rx0, rz0] = ell(am, (IX + OX) / 2 + 3, (IZ + OZ) / 2 + 3); L.roof.push(boxG(flen * 0.95, 0.7, 15, rx0, base + 26.4, rz0, C('#eef0f2'), fry));
      if (k % 7 === 3) { const [lx, lz] = ell(am, IX + 6, IZ + 5); L.roof.push(boxG(3.2, 1.2, 0.6, lx, base + 25.2, lz, C('#2b2e33'), fry)); S.lights.push([lx, base + 25, lz]); }
    }
    // goalposts at both ends: two tall goal posts and two shorter behind posts
    for (const s of [-1, 1]) for (const [dz, ht] of [[-3.2, 14], [3.2, 14], [-9.6, 9], [9.6, 9]]) { const p = new THREE.CylinderGeometry(0.16, 0.2, ht, 8); p.translate(cx + s * (FX - 0.5), base + ht / 2, cz + dz); L.roof.push(colorize(p, C('#f4f4f2'))); }
  });
  // colliders: the bowl in chunks (skipping the tunnels), tunnel walls, goalposts
  for (let k = 0; k < N; k++) {
    const a0 = k / N * TAU, a1 = (k + 1) / N * TAU; if (tunAt((a0 + a1) / 2) !== null) continue;
    const pts = [ell(a0, IX + 0.5, IZ + 0.5), ell(a1, IX + 0.5, IZ + 0.5), ell(a0, OX + 1.6, OZ + 1.6), ell(a1, OX + 1.6, OZ + 1.6)];
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]); W.addBox(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), base + 22, 'stand');
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (dx) { const xa = cx + dx * (IX - 0.5), xb = cx + dx * (OX + 2); for (const s of [-1, 1]) W.addBox(Math.min(xa, xb), cz + s * TUN - 0.3, Math.max(xa, xb), cz + s * TUN + 0.3, base + TH, 'b'); }
    else { const za = cz + dz * (IZ - 0.5), zb = cz + dz * (OZ + 2); for (const s of [-1, 1]) W.addBox(cx + s * TUN - 0.3, Math.min(za, zb), cx + s * TUN + 0.3, Math.max(za, zb), base + TH, 'b'); }
  }
  for (const s of [-1, 1]) for (const dz of [-3.2, 3.2, -9.6, 9.6]) W.addBox(cx + s * (FX - 0.5) - 0.25, cz + dz - 0.25, cx + s * (FX - 0.5) + 0.25, cz + dz + 0.25, base + 9, 'p');
  // tunnel signs, ticket booths and the forecourt
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ox = cx + dx * (OX + 2.5), oz = cz + dz * (OZ + 2.5);
    W.details.push(dx ? [1, 1.2, TUN * 2 + 1, ox, base + TH + 0.6, oz, '#1e3a8a'] : [TUN * 2 + 1, 1.2, 1, ox, base + TH + 0.6, oz, '#1e3a8a']);
    for (const s of [-1, 1]) { const bx = ox + (dz ? s * (TUN + 4) : dx * 3), bz = oz + (dx ? s * (TUN + 4) : dz * 3); W.details.push([2.4, 2.6, 2.4, bx, base + 1.3, bz, '#e9e6df'], [2.8, 0.3, 2.8, bx, base + 2.75, bz, '#f5c400']); W.addBox(bx - 1.2, bz - 1.2, bx + 1.2, bz + 1.2, base + 2.6, 'b'); }
  }
  for (const [x, z] of [[b.x0 + 5, b.z0 + 5], [b.x1 - 5, b.z0 + 5], [b.x0 + 5, b.z1 - 5], [b.x1 - 5, b.z1 - 5]]) addTree(W, 'palm', x, z, 1.1);
  // scoreboards at either end, facing the ground
  W.post = W.post || [];
  W.post.push(root => {
    const tex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#07090d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e3a8a'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#f5c400'; g.font = 'bold 30px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('HAVOC CUP · GRAND FINAL', w / 2, 46);
      g.font = 'bold 40px Impact, "Arial Black", sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.fillText('PERTH', 30, 112); g.fillText('VISITORS', 30, 172);
      g.textAlign = 'right'; g.fillStyle = '#5ad1ff'; g.fillText('12.8  80', w - 30, 112); g.fillStyle = '#ff6b6b'; g.fillText('9.11  65', w - 30, 172);
      g.fillStyle = '#8a93a3'; g.font = 'bold 24px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('Q3  14:52', w / 2, 226);
    }, { repeat: false });
    const m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.15, 1.15, 1.15) });
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(16, 8); g.rotateY(s > 0 ? -Math.PI / 2 : Math.PI / 2); g.translate(cx + s * (OX - 4), base + 27.5, cz); root.add(new THREE.Mesh(g, m));
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.8, 16.8), new THREE.MeshStandardMaterial({ color: C('#1b1c1f') })); back.position.set(cx + s * (OX - 3.6), base + 27.5, cz); root.add(back);
    }
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.75, 1.6) });
    for (const [x, y, z] of S.lights) { const lb = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.2), lm); lb.position.set(x, y, z); lb.lookAt(cx, base, cz); root.add(lb); }
  });
}
function perthFlat(W, f, rng) {
  const inDeck = (x, z, m) => W.dry.some(d => d.deck && x > d.x0 - m && x < d.x1 + m && z > d.z0 - m && z < d.z1 + m);
  if (f.type === 'cott') {
    for (let z = f.z0 + 12; z < f.z1 - 8; z += 16) addTree(W, 'pine', f.x1 - 5, z, 0.9 + rng() * 0.3);
    for (let k = 0; k < 26; k++) { const x = lerp(f.x0 + 6, f.x1 - 14, rng()), z = lerp(f.z0 + 10, f.z1 - 10, rng()); if (x > -545 && x < -510 && z > -136 && z < -104) continue; W.props.push({ type: 'umbrella', x, z, ry: rng() * TAU, col: rp(rng, ['#e8473a', '#2f8fd8', '#f2c02e', '#ffffff', '#3ab37a']) }); }
  } else if (f.type === 'fore') {
    for (let x = f.x0 + 10; x < f.x1 - 6; x += 21) { const z = (f.z0 + f.z1) / 2 + (rng() - 0.5) * 4; if (inDeck(x, z, 8) || (x > 10 && x < 130 && f.z0 < 60)) continue; addTree(W, rng() < 0.3 ? 'palm' : 'oak', x, z, 0.75 + rng() * 0.4); }
  } else if (f.type === 'island') {
    for (let k = 0; k < 14; k++) { const x = lerp(f.x0 + 4, f.x1 - 4, rng()), z = lerp(f.z0 + 4, f.z1 - 4, rng()); if (Math.abs(x - 300) < 12) continue; addTree(W, 'oak', x, z, 0.8 + rng() * 0.5); }
  } else {
    const n = Math.round((f.x1 - f.x0) * (f.z1 - f.z0) / 2600);
    const clear = (x, z) => {
      for (const q of W.flats) if (q.type === 'airport' && x > q.x0 - 14 && x < q.x1 + 14 && z > q.z0 - 14 && z < q.z1 + 14) return false;
      for (const r of (W.airport && W.airport.roads) || []) if (x > r.x0 - 4 && x < r.x1 + 4 && Math.abs(z - r.z) < W.hw + 6) return false;
      for (const b of W.blocks) if (x > b.x0 - 10 && x < b.x1 + 10 && z > b.z0 - 10 && z < b.z1 + 10) return false;
      return true;
    };
    for (let k = 0; k < n; k++) { const x = lerp(f.x0 + 5, f.x1 - 5, rng()), z = lerp(f.z0 + 5, f.z1 - 5, rng()); if (waterAtRects(W, x, z) || !clear(x, z)) continue; addTree(W, rng() < 0.25 ? 'pine' : 'oak', x, z, 0.8 + rng() * 0.6); }
    // the odd farm shed and water tank out in the bush
    for (let k = 0; k < Math.round(n / 40); k++) { const x = lerp(f.x0 + 30, f.x1 - 30, rng()), z = lerp(f.z0 + 30, f.z1 - 30, rng()); if (waterAtRects(W, x, z) || !clear(x, z) || !clear(x + 12, z + 12) || !clear(x - 12, z - 12)) continue;
      W.bldgs.push({ x0: x - 6, z0: z - 4, x1: x + 6, z1: z + 4, y: 0, h: 4.2, col: rp(rng, ['#b8bcc0', '#a85a42', '#c9c2ad']), tex: 'house' }); W.addBox(x - 6, z - 4, x + 6, z + 4, 4.2, 'b');
      W.roofs.push({ x0: x - 6, z0: z - 4, x1: x + 6, z1: z + 4, y: 4.2, h: 1.6, col: '#8e9296' });
      W.details.push([2.4, 3, 2.4, x + 9, 1.5, z, '#9aa0a6'], [2.6, 0.3, 2.6, x + 9, 3.1, z, '#7b8086']); W.addBox(x + 7.8, z - 1.2, x + 10.2, z + 1.2, 3.2, 'rock'); }
  }
}
function waterAtRects(W, x, z) { for (const r of W.waters || []) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) { return !W.dry.some(d => x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1); } return false; }
function gableGeo(r) {
  const ov = 0.4, x0 = r.x0 - ov, x1 = r.x1 + ov, z0 = r.z0 - ov, z1 = r.z1 + ov, y = r.y, h = r.h, alongX = (x1 - x0) >= (z1 - z0);
  let P;
  if (alongX) { const zm = (z0 + z1) / 2; P = [[x0, y, z0], [x1, y, z0], [x1, y + h, zm], [x0, y + h, zm], [x0, y, z1], [x1, y, z1]]; }
  else { const xm = (x0 + x1) / 2; P = [[x0, y, z0], [x0, y, z1], [xm, y + h, z1], [xm, y + h, z0], [x1, y, z0], [x1, y, z1]]; }
  const T = alongX ? [[0, 3, 2], [0, 2, 1], [4, 5, 2], [4, 2, 3], [0, 4, 3], [1, 2, 5]] : [[0, 1, 2], [0, 2, 3], [4, 3, 2], [4, 2, 5], [0, 3, 4], [1, 5, 2]];
  const pos = []; for (const t of T) for (const k of t) pos.push(...P[k]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  g.computeVertexNormals();
  // make every face point outward regardless of winding
  const n = g.attributes.normal, p = g.attributes.position, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cy = y + h * 0.3;
  for (let i = 0; i < p.count; i += 3) {
    const mx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3 - cx, my = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 - cy, mz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 - cz;
    if (n.getX(i) * mx + n.getY(i) * my + n.getZ(i) * mz < 0) { const ax = p.getX(i + 1), ay = p.getY(i + 1), az = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ax, ay, az); }
  }
  g.computeVertexNormals();
  return colorize(g, C(r.col));
}
