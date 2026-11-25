// =====================================================================
//  TESTING ZONE: a proving ground that tests the car and the driver.
//  Smooth terrain pieces (bumps, kickers, table-tops, moguls, a banked
//  bowl, a quarter pipe, the mega ramp), loop-the-loops you ride on a
//  rail, boost pads, hoops, a drag strip with a speed trap, a skid pad,
//  a slalom, and style points for all of it.
// =====================================================================

// ---------- smooth terrain pieces ----------
// A piece lives in a local frame that starts at (x, z) and runs along (dx, dz): u from 0 to len, v across from -w/2 to w/2.
// prof(u, v) is the height above the piece's base. heightAt() takes the highest piece under a point, and the same profile
// draws the mesh, so what you see is exactly what you drive on.
function shapeLocal(W, o) {
  o.base = o.base || 0;
  const cx = [0, o.len], cv = [-o.w / 2, o.w / 2]; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const u of cx) for (const v of cv) { const x = o.x + o.dx * u - o.dz * v, z = o.z + o.dz * u + o.dx * v; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  o.bx0 = x0; o.bx1 = x1; o.bz0 = z0; o.bz1 = z1;
  o.h = (x, z) => { const rx = x - o.x, rz = z - o.z, u = rx * o.dx + rz * o.dz, v = -rx * o.dz + rz * o.dx; return u < 0 || u > o.len || v < -o.w / 2 || v > o.w / 2 ? -1 : o.base + o.prof(u, v); };
  const nu = o.nu || Math.max(2, Math.ceil(o.len / (o.step || 1.2))), nv = o.nv || 1;
  o.geo = () => gridSurfaceGeo(nu, nv, (i, j) => { const u = o.len * i / nu, v = -o.w / 2 + o.w * j / nv, y = o.base + o.prof(u, v); return [o.x + o.dx * u - o.dz * v, y, o.z + o.dz * u + o.dx * v, (o.col || tzCol)(u, v, y - o.base, o)]; }, o.base);
  (W.shapes = W.shapes || []).push(o); return o;
}
// a piece laid out round a centre: r from r0 to r1, angle a from a0 to a1 (radians, atan2(z, x) style)
function shapePolar(W, o) {
  o.base = o.base || 0;
  o.bx0 = o.cx - o.r1; o.bx1 = o.cx + o.r1; o.bz0 = o.cz - o.r1; o.bz1 = o.cz + o.r1;
  o.h = (x, z) => { const dx = x - o.cx, dz = z - o.cz, r = Math.hypot(dx, dz); if (r < o.r0 || r > o.r1) return -1; let a = Math.atan2(dz, dx); while (a < o.a0) a += TAU; if (a > o.a1) return -1; return o.base + o.prof(r, a); };
  const ni = o.ni || 48, nj = o.nj || 10;
  o.geo = () => gridSurfaceGeo(ni, nj, (i, j) => { const a = o.a0 + (o.a1 - o.a0) * i / ni, r = o.r0 + (o.r1 - o.r0) * j / nj, y = o.base + o.prof(r, a); return [o.cx + Math.cos(a) * r, y, o.cz + Math.sin(a) * r, (o.col || tzCol)(i / ni, j / nj, y - o.base, o)]; }, o.base);
  (W.shapes = W.shapes || []).push(o); return o;
}
// a sampled surface with walls down to the ground on all four edges; faces are wound so they point up / outwards
function gridSurfaceGeo(ni, nj, at, base) {
  const P = []; for (let i = 0; i <= ni; i++) { const row = []; for (let j = 0; j <= nj; j++) row.push(at(i, j)); P.push(row); }
  let cx = 0, cz = 0, n = 0; for (const row of P) for (const p of row) { cx += p[0]; cz += p[2]; n++; } cx /= n; cz /= n;
  const pos = [], col = [];
  const tri = (a, b, c, ca, cb, cc, want) => {   // want: [x, y, z] direction the face should point
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * want[0] + ny * want[1] + nz * want[2] < 0) { const t = b; b = c; c = t; const tc = cb; cb = cc; cc = tc; }
    for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) { pos.push(p[0], p[1], p[2]); col.push(q.r, q.g, q.b); }
  };
  const UPv = [0, 1, 0];
  for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) {
    const a = P[i][j], b = P[i + 1][j], c = P[i + 1][j + 1], d = P[i][j + 1];
    tri(a, b, c, a[3], b[3], c[3], UPv); tri(a, c, d, a[3], c[3], d[3], UPv);
  }
  const wallC = C('#5c5a55'), edge = (pts) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1]; if (a[1] - base < 0.02 && b[1] - base < 0.02) continue;
      const a0 = [a[0], base, a[2]], b0 = [b[0], base, b[2]], want = [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz];
      tri(a0, b0, b, wallC, wallC, wallC, want); tri(a0, b, a, wallC, wallC, wallC, want);
    }
  };
  edge(P.map(r => r[0])); edge(P.map(r => r[nj])); edge(P[0]); edge(P[ni]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.computeVertexNormals();
  return g;
}
const TZC = {};
function tzc(hex) { return TZC[hex] || (TZC[hex] = C(hex)); }
function tzCol(u, v, h, o) {   // concrete with darker tyre-worn lanes; yellow chevrons on anything that launches you
  const w = o.w || 10;
  if (o.kind === 'kicker' && ((u / 1.6) % 2 < 0.45)) return tzc('#e8b21c');
  if (o.w && Math.abs(v) > w / 2 - 0.45) return tzc(((u / 2) | 0) % 2 ? '#d23a2e' : '#f1efe9');
  if (o.kind === 'bump') return tzc(((v + 50) / 1.2 | 0) % 2 ? '#f1c21b' : '#26272b');
  if (o.kind === 'mogul') return tzc(h > 1.2 ? '#9b7a55' : h > 0.6 ? '#8a6b49' : '#7a5d3f');
  if (o.kind === 'bank') return tzc(v > 0.97 ? '#d23a2e' : ((u * 64) | 0) % 2 ? '#4f5258' : '#56595f');
  return tzc(h > 0.05 ? '#8d8f93' : '#6e7075');
}
// height profiles
const PROF = {
  up: (H, len, p) => u => H * Math.pow(u / len, p || 1),                                   // a kicker; p > 1 curls it up at the lip
  down: (H, len) => u => H * (0.5 + 0.5 * Math.cos(Math.PI * u / len)),                     // eased drop: flat at the top, flat at the bottom
  flat: H => () => H,
  bump: (H, len) => u => H * Math.pow(Math.sin(Math.PI * u / len), 2),
  table: (H, len, ramp) => u => u < ramp ? H * u / ramp : u > len - ramp ? H * (len - u) / ramp : H,
  rumble: (A, lam) => u => A * (0.5 - 0.5 * Math.cos(TAU * u / lam))
};

// ---------- the map ----------
FLAT_FILL.tzpad = () => { };   // test pads stay clear (otherwise unknown ground gets desert scrub)
function genTest(W, rng, addNode, addEdge) {
  W.name = 'Testing Zone'; W.style = 'town'; W.fenceWalls = true; W.hideWalls = true;
  W.testZone = true; W.liftOff = true; W.noTraffic = true; W.wallH = 400;
  W.groundCol = '#bdb29d'; W.miniBg = 'rgba(40,37,32,.92)'; W.miniFlat = '#5b5447';
  W.shapes = []; W.post = []; W.loopTracks = []; W.hoops = []; W.boosts = []; W.tz = { pois: [] };
  const V = [[-640, -300, 300], [0, -300, 300], [640, -300, 300]], H = [[-300, -640, 640], [300, -640, 640]];
  const node = roadsFromLines(addNode, addEdge, V, H);
  W.bounds = { x0: -760, x1: 760, z0: -560, z1: 560 };
  W.spawnEdges = [[node(0, -300), node(0, 300)]];
  // ground: asphalt test pads, a dirt field, painted strips; salt flat everywhere else
  W.flats.push({ x0: -634, x1: -6, z0: -294, z1: 294, type: 'tzpad', tex: 'lot' });
  W.flats.push({ x0: 6, x1: 634, z0: -294, z1: -6, type: 'tzpad', tex: 'lot' });
  W.flats.push({ x0: 6, x1: 634, z0: 6, z1: 100, type: 'tzpad', tex: 'lot' });
  W.flats.push({ x0: 6, x1: 634, z0: 100, z1: 294, type: 'tzpad', tex: 'dirt' });
  W.flats.push({ x0: -705, x1: 705, z0: -446, z1: -394, type: 'tzpad', tex: 'lot' });   // drag strip
  W.flats.push({ x0: -735, x1: 735, z0: 408, z1: 452, type: 'tzpad', tex: 'lot' });     // mega ramp run
  const S = (x, z, dx, dz, len, w, prof, o) => shapeLocal(W, Object.assign({ x, z, dx, dz, len, w, prof }, o || {}));
  const poi = (x, z, ch, col, title, text) => W.tz.pois.push({ x, z, ch, col, title, text });
  const boost = (x, z, dx, dz) => W.boosts.push({ x, z, dx, dz, len: 9, w: 7 });
  const hoop = (x, y, z, dx, dz, r) => W.hoops.push({ x, y, z, dx, dz, r: r || 5 });

  // ---- north: the drag strip, a quarter mile with a speed trap, and a grandstand ----
  W.tz.drag = { x0: -650, x1: -248, z0: -440, z1: -400 };
  W.marks.push([-650, -440, -646, -400, 0.012], [-250, -440, -246, -400, 0.012]);
  for (let x = -640; x < 700; x += 12) W.marks.push([x, -420.3, x + 6, -419.7, 0.012]);
  tzStand(W, -560, -170, -474, -452);
  tzTree(W, -658, -420);
  poi(-450, -420, 'D', '#7fe3ff', 'Drag strip', 'A quarter mile from a standing start. Cross the start line and floor it: the clock and the speed trap at the quarter-mile line tell you how you did. Plenty of room to brake after.');

  // ---- south: the mega ramp ----
  const MZ = 430;
  S(-705, MZ, 1, 0, 235, 14, PROF.up(30, 235), { kind: 'mega', step: 5 });
  S(-470, MZ, 1, 0, 30, 14, PROF.flat(30), { kind: 'mega', step: 5 });
  S(-440, MZ, 1, 0, 76, 14, PROF.down(30, 76), { kind: 'mega', step: 2 });
  S(-300, MZ, 1, 0, 24, 12, PROF.up(6, 24, 1.7), { kind: 'kicker', step: 0.8 });
  W.waters = W.waters || []; W.waters.push({ x0: -270, x1: -196, z0: 414, z1: 446 });
  S(-192, MZ, 1, 0, 150, 18, PROF.down(10, 150), { kind: 'land', step: 2.5 });
  boost(-690, MZ, 1, 0); boost(-352, MZ, 1, 0);
  hoop(-236, 16, MZ, 1, 0, 7);
  poi(-450, MZ, 'M', '#ff6b4a', 'Mega ramp', 'Climb to the 30 m deck, drop in, hit the kicker and clear the water to the landing ramp. Fly through the hoop for a bonus. Fall off the sides and it is a long way down.');

  // ---- west: loop-the-loops, the ramp park, the quarter pipe ----
  tzLoop(W, -400, -240, 1, 0, 10, 10);
  tzLoop(W, -430, -150, 1, 0, 7, 8);
  boost(-470, -240, 1, 0); boost(-490, -150, 1, 0);
  poi(-400, -195, 'L', '#ffd24a', 'Loop-the-loops', 'Two loops: a 20 m giant and a 14 m tight one. Hit them flat out (the boost pads help); too slow and you drop off the top.');
  // kicker row
  S(-560, -60, 1, 0, 8, 8, PROF.up(1.6, 8, 1.4), { kind: 'kicker', step: 0.7 });
  S(-430, -60, 1, 0, 12, 9, PROF.up(3, 12, 1.8), { kind: 'kicker', step: 0.7 });
  S(-392, -60, 1, 0, 22, 10, PROF.down(2.6, 22), { kind: 'land', step: 1.5 });
  S(-300, -60, 1, 0, 16, 10, PROF.up(5, 16, 2), { kind: 'kicker', step: 0.7 });
  S(-252, -60, 1, 0, 26, 12, PROF.down(3.5, 26), { kind: 'land', step: 1.5 });
  hoop(-268, 11, -60, 1, 0, 5.5);
  // table-tops
  S(-600, 20, 1, 0, 60, 12, PROF.table(4.5, 60, 15), { kind: 'table', step: 1.5 });
  S(-480, 20, 1, 0, 48, 12, PROF.table(3, 48, 12), { kind: 'table', step: 1.5 });
  // gap jump over water
  S(-610, 110, 1, 0, 14, 10, PROF.up(4.5, 14, 1.6), { kind: 'kicker', step: 0.7 });
  W.waters.push({ x0: -594, x1: -522, z0: 100, z1: 120 });
  S(-520, 110, 1, 0, 26, 12, PROF.down(4.2, 26), { kind: 'land', step: 1.5 });
  hoop(-557, 13, 110, 1, 0, 5.5);
  boost(-640 + 6, 110, 1, 0);
  // quarter pipe at the west end of a long run: drive at it flat out and you go straight up
  S(-420, 200, -1, 0, 22, 16, PROF.up(7, 22, 2.2), { kind: 'kicker', step: 0.5 });
  S(-472, 200, -1, 0, 270, 26, PROF.down(12, 270), { kind: 'land', step: 3 });
  boost(-300, 200, -1, 0);
  W.tz.sky = { x0: -420, x1: -250, z0: 188, z1: 212 };
  // a tall catch net at the far end, for anyone who launches off the sky ramp too fast
  { const z0 = 140, z1 = 260, x = -756, H2 = 30;
    W.custom.push(L => { for (let z = z0; z <= z1; z += 20) { const g = new THREE.BoxGeometry(0.6, H2 + 1, 0.6); colorize(g, C('#c6372b')); g.translate(x, (H2 + 1) / 2, z); L.roof.push(g); } });
    W.post.push(root => { const g = new THREE.PlaneGeometry(z1 - z0, H2), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (z1 - z0) / 2, uv.getY(i) * H2 / 2); g.rotateY(Math.PI / 2); g.translate(x, H2 / 2, (z0 + z1) / 2);
      root.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: TEX.fence, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 }))); }); }
  poi(-420, 30, 'R', '#e8b21c', 'Ramp park', 'Kickers from small to big, two table-tops, a gap jump over water and hoops to fly through.');
  poi(-430, 200, 'Q', '#c38aff', 'Sky ramp', 'A steep launcher with a long landing hill behind it: the most air time in the Testing Zone. Best between about 170 and 220 km/h. Too slow and you slam into the front of the hill; too fast and you sail past it into the net.');

  // ---- the hub: control tower, garage, the Roadster on its podium ----
  W.bldgs.push({ x0: -70, z0: -70, x1: -54, z1: -54, y: 0, h: 22, col: '#cfd3d8', tex: 'glass' }); W.addBox(-70, -70, -54, -54, 22, 'b');
  W.details.push([18, 3.2, 18, -62, 23.6, -62, '#2a3e52'], [19, 0.5, 19, -62, 25.45, -62, '#d8dcdf']);
  W.bldgs.push({ x0: -120, z0: 30, x1: -60, z1: 62, y: 0, h: 8, col: '#e7e3da', tex: 'house' }); W.addBox(-120, 30, -60, 62, 8, 'b');
  for (let k = 0; k < 4; k++) W.details.push([10, 5.4, 0.3, -112 + k * 15, 2.7, 29.8, '#3c4148']);
  shapePolar(W, { cx: -31.5, cz: -4, r0: 0, r1: 5.2, a0: -Math.PI, a1: Math.PI, kind: 'podium', ni: 40, nj: 2, prof: () => 0.55, col: (i, j) => tzc(j > 0.6 ? '#d23a2e' : '#ecebe8') });
  W.parked.push({ x: -31.5, z: -4, h: Math.PI * 0.75, showroom: true, cfg: { body: 'roadster', paint: '#c8102e', finish: 'metallic', rim: 'disc', rimColor: '#2a2c30', stripes: false, neon: 'off', spoiler: 'none', plate: 'ROADSTER', tint: 2 } });
  W.tz.giver = [-30, 22];
  poi(-31.5, -4, 'T', '#ff4f63', 'Tesla Roadster', 'On display, and locked: pass the Show Off trial (the marker next to it) to unlock it.');

  // ---- east: skid pad, slalom, precision stop, speed bumps, moguls, banked bowl ----
  W.tz.skid = { x: 200, z: -160, r: 52 };
  W.custom.push(L => { for (const r of [18, 34, 50]) { const g = new THREE.RingGeometry(r - 0.25, r + 0.25, 96); g.rotateX(-Math.PI / 2); g.translate(200, 0.012, -160); colorize(g, C('#f1efe9')); L.roof.push(g); } });
  poi(200, -160, 'S', '#47d18c', 'Skid pad', 'Throw it sideways: drifts score style points anywhere, and this is the place to practise.');
  for (let k = 0; k < 17; k++) W.props.push({ type: 'cone', x: 70 + k * 25, z: -40 + (k % 2 ? 4.5 : -4.5), ry: 0 });
  W.tz.stop = { x0: 540, x1: 560, z0: -50, z1: -30 };
  W.marks.push([540, -50, 560, -49.6, 0.012], [540, -30.4, 560, -30, 0.012], [540, -50, 540.4, -30, 0.012], [559.6, -50, 560, -30, 0.012]);
  poi(300, -40, 'C', '#ffb21e', 'Slalom and stop box', 'Weave the cones, then stop dead inside the painted box at the end after a fast run for a precision-stop bonus.');
  // speed bumps that get taller, then a washboard
  for (let k = 0; k < 13; k++) S(100 + k * 30, 54, 1, 0, 2.4 + k * 0.15, 10, PROF.bump(0.12 + k * 0.03, 2.4 + k * 0.15), { kind: 'bump', step: 0.25, nv: 8 });
  S(520, 54, 1, 0, 90, 10, PROF.rumble(0.07, 1.5), { kind: 'rumble', step: 0.25, col: (u, v, h) => tzc(h > 0.035 ? '#f1efe9' : '#d23a2e') });
  poi(300, 54, 'B', '#f1c21b', 'Speed bumps', 'Thirteen bumps, each taller than the last, then a washboard. Take them slowly, or flat out and see what happens.');
  // moguls on the dirt
  { const x0 = 60, len = 270, w = 160, A = 1.9, lam = 22;
    S(x0, 200, 1, 0, len, w, (u, v) => { const e = Math.min(1, u / 14, (len - u) / 14, (w / 2 - Math.abs(v)) / 14); return Math.max(0, e) * A * (0.5 + 0.5 * Math.sin(TAU * u / lam) * Math.sin(TAU * v / lam + 0.7)); }, { kind: 'mogul', step: 2.2, nv: 72 }); }
  poi(195, 200, 'O', '#9b7a55', 'Moguls', 'A dirt field of rolling bumps. Keep it straight, or catch air off the crests.');
  // banked bowl: drive in from the north lane, round the east side, out along the south lane
  shapePolar(W, { cx: 520, cz: 196, r0: 38, r1: 88, a0: -Math.PI / 2, a1: Math.PI / 2, kind: 'bank', ni: 64, nj: 16,
    prof: (r, a) => { const t = (r - 38) / 50, f = Math.min(1, (a + Math.PI / 2) / 0.8, (Math.PI / 2 - a) / 0.8); return 16 * Math.pow(t, 1.7) * (f * f * (3 - 2 * f)); } });
  { const N = 40, r = 89.5, top = 16 + 1.6;
    for (let k = 0; k < N; k++) { const a = -Math.PI / 2 + (k + 0.5) / N * Math.PI, x = 520 + Math.cos(a) * r, z = 196 + Math.sin(a) * r; W.addBox(x - 3.6, z - 3.6, x + 3.6, z + 3.6, top, 'wall'); }
    W.custom.push(L => { for (let k = 0; k < N; k++) { const a0 = -Math.PI / 2 + k / N * Math.PI, a1 = a0 + Math.PI / N, am = (a0 + a1) / 2, len = 2 * r * Math.sin(Math.PI / N / 2) + 0.2, g = new THREE.BoxGeometry(len, 1.3, 0.5); colorize(g, C(k % 2 ? '#d23a2e' : '#f1efe9')); g.rotateY(-am + Math.PI / 2); g.translate(520 + Math.cos(am) * r, 16.65 * Math.min(1, (am + Math.PI / 2) / 0.8, (Math.PI / 2 - am) / 0.8) ** 0.5, 196 + Math.sin(am) * r); L.roof.push(g); } }); }
  poi(560, 200, 'K', '#7d8189', 'Banked bowl', 'A half circle banked up to 16 m at the rim. The banking helps you turn: the faster you go, the higher up the wall you can hold your line.');

  // hub-side marker for the mission is added by missionsLoad from W.tz.giver
  for (const t of [[-150, -270], [-200, 270], [300, -270], [620, 270], [-620, 270]]) addTree(W, 'palm', t[0], t[1], 1.1);
  W.custom.push(L => { for (const h of W.hoops) L.roof.push(tzHoopGeo(h)); for (const b of W.boosts) L.neon.push(tzBoostGeo(b)); });
}

// grandstand: stepped seats facing the strip, with a roof
function tzStand(W, x0, x1, z0, z1) {
  W.custom.push(L => {
    const rows = 9, d = (z1 - z0) / rows;
    for (let k = 0; k < rows; k++) { const g = new THREE.BoxGeometry(x1 - x0, 0.9 + k * 0.9, d); colorize(g, C(k % 2 ? '#c9ccd1' : '#b9bcc2')); g.translate((x0 + x1) / 2, (0.9 + k * 0.9) / 2, z1 - d * (k + 0.5)); L.roof.push(g); }
    const r = new THREE.BoxGeometry(x1 - x0 + 2, 0.4, z1 - z0 + 3); colorize(r, C('#3c4148')); r.translate((x0 + x1) / 2, 12, (z0 + z1) / 2 - 1); L.roof.push(r);
    for (let x = x0; x <= x1; x += 18) { const p = new THREE.BoxGeometry(0.5, 12, 0.5); colorize(p, C('#3c4148')); p.translate(x, 6, z0 + 0.4); L.roof.push(p); }
  });
  W.addBox(x0, z0, x1, z1, 9, 'b');
}
// the start lights
function tzTree(W, x, z) {
  W.custom.push(L => {
    const p = new THREE.BoxGeometry(0.4, 4.6, 0.4); colorize(p, C('#2a2c30')); p.translate(x, 2.3, z); L.roof.push(p);
    const h = new THREE.BoxGeometry(0.9, 2.4, 0.5); colorize(h, C('#1d1e21')); h.translate(x, 4.6, z); L.roof.push(h);
  });
  W.post.push(root => {
    const m = []; TZ.tree = [];
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshBasicMaterial({ color: C('#3a2a10') })); s.position.set(x + 0.28, 5.5 - k * 0.55, z); root.add(s); TZ.tree.push(s); }
  });
  W.addBox(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 4, 'b');
}

// ---------- loop-the-loops ----------
// A loop starts at E on the ground heading (dx, dz); the track climbs round a circle of radius R and comes back down
// shifted `off` metres to the right, so you leave on a parallel lane.
function tzLoop(W, ex, ez, dx, dz, R, off) {
  const L = { ex, ez, dx, dz, R, off, w: 7.5, sx: -dz, sz: dx };
  W.loopTracks.push(L);
  W.custom.push(Lm => Lm.roof.push(loopGeo(L)));
  // side towers and a beam over the top hold it up, clear of both lanes
  const t1 = [ex - L.sx * 7, ez - L.sz * 7], t2 = [ex + L.sx * (off + 7), ez + L.sz * (off + 7)], top = 2 * R + 2.2;
  W.custom.push(Lm => {
    for (const [x, z] of [t1, t2]) { const g = new THREE.BoxGeometry(1.2, top, 1.2); colorize(g, C('#c6372b')); g.translate(x, top / 2, z); Lm.roof.push(g); }
    const bl = off + 14, b = new THREE.BoxGeometry(1, 1, bl); colorize(b, C('#c6372b')); b.rotateY(Math.atan2(L.sx, L.sz)); b.translate(ex + L.sx * off / 2, top, ez + L.sz * off / 2); Lm.roof.push(b);
  });
  W.addBox(t1[0] - 0.6, t1[1] - 0.6, t1[0] + 0.6, t1[1] + 0.6, top, 'b'); W.addBox(t2[0] - 0.6, t2[1] - 0.6, t2[0] + 0.6, t2[1] + 0.6, top, 'b');
  // painted lanes in and out
  W.marks.push(...[[-60, 0], [0, 40]].map(([a, b]) => { const x0 = ex + dx * a, x1 = ex + dx * b; return [Math.min(x0, x1), ez - 0.15, Math.max(x0, x1), ez + 0.15, 0.012]; }));
}
function loopPoint(L, th) {   // track centre line and the inward normal at angle th (0 = entry at the bottom)
  const s = Math.sin(th), c = Math.cos(th), sh = L.off * th / TAU;
  return { x: L.ex + L.dx * L.R * s + L.sx * sh, y: L.R * (1 - c), z: L.ez + L.dz * L.R * s + L.sz * sh, nx: -L.dx * s, ny: c, nz: -L.dz * s };
}
function loopGeo(L) {
  const N = 120, pos = [], col = [], hw = L.w / 2;
  const tri = (a, b, c, q, want) => {   // q: colour; want: the direction this face should point
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if ((uy * vz - uz * vy) * want[0] + (uz * vx - ux * vz) * want[1] + (ux * vy - uy * vx) * want[2] < 0) { const t = b; b = c; c = t; }
    for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); col.push(q.r, q.g, q.b); }
  };
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const th = i / N * TAU, P = loopPoint(L, th), o = [P.x - L.sx * hw, P.y, P.z - L.sz * hw], r = [P.x + L.sx * hw, P.y, P.z + L.sz * hw];
    const sh = 0.45, ob = [o[0] - P.nx * sh, o[1] - P.ny * sh, o[2] - P.nz * sh], rb = [r[0] - P.nx * sh, r[1] - P.ny * sh, r[2] - P.nz * sh];
    const wh = 1.0, ow = [o[0] + P.nx * wh, o[1] + P.ny * wh, o[2] + P.nz * wh], rw = [r[0] + P.nx * wh, r[1] + P.ny * wh, r[2] + P.nz * wh];
    pts.push({ o, r, ob, rb, ow, rw, n: [P.nx, P.ny, P.nz] });
  }
  const road = tzc('#55585e'), shell = tzc('#c6372b'), wallA = tzc('#f1efe9'), wallB = tzc('#d23a2e'), S = [L.sx, 0, L.sz], NS = [-L.sx, 0, -L.sz];
  for (let i = 0; i < N; i++) {
    const A = pts[i], B = pts[i + 1], n = A.n, out = [-n[0], -n[1], -n[2]], wc = (i >> 2) % 2 ? wallA : wallB;
    tri(A.o, B.o, B.r, road, n); tri(A.o, B.r, A.r, road, n);                 // the driving surface faces the middle of the loop
    tri(A.ob, B.ob, B.rb, shell, out); tri(A.ob, B.rb, A.rb, shell, out);     // the red outside of the track
    for (const [a, b, c, d, side] of [[A.o, B.o, B.ow, A.ow, NS], [A.r, B.r, B.rw, A.rw, S]]) {   // low walls on both edges, seen from either side
      tri(a, b, c, wc, side); tri(a, c, d, wc, side); const inn = [-side[0], 0, -side[2]]; tri(a, b, c, wc, inn); tri(a, c, d, wc, inn);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.computeVertexNormals();
  return g;
}

// hoops and boost pads (drawn from genTest's lists)
function tzHoopGeo(h) {
  const g = new THREE.TorusGeometry(h.r, 0.38, 10, 56), p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.atan2(p.getY(i), p.getX(i)), on = ((a + Math.PI) / TAU * 16 | 0) % 2, q = on ? tzc('#ff7a1a') : tzc('#f7f4ee'); c[i * 3] = q.r; c[i * 3 + 1] = q.g; c[i * 3 + 2] = q.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.rotateY(Math.atan2(h.dx, h.dz)); g.translate(h.x, h.y, h.z); return g;
}
function tzBoostGeo(b) {
  const P = [], ry = Math.atan2(b.dx, b.dz);
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.9, 4.2); g.rotateX(-Math.PI / 2); g.rotateY(s * 0.85); g.translate(s * 1.45, 0.03, -2.6 + k * 2.6 - 0.9); colorize(g, k % 2 ? C('#ff2e88') : C('#22e0ff')); P.push(g);
  }
  const m = mergeGeos(P); m.rotateY(ry); m.translate(b.x + b.dx * b.len / 2, 0, b.z + b.dz * b.len / 2); return m;
}

// ---------- runtime ----------
const TZ = { tree: [], boostT: 0, hoopPrev: [], dragOn: false, dragT0: 0, prevX: null, fastT: -9, stopped: false, bestQ: 0 };
// style points: every trick scores, tricks chained within a few seconds of each other build a multiplier, crashing ends the chain
const STY = { pts: 0, chain: 0, mult: 1, lastT: -9, drift: 0, driftT: -9, runAir: 0, bestAir: 0, hud: null };
function styleOn() { return !!(W && W.testZone) && APP.mode === 'game'; }
function addStyle(name, pts) {
  if (!styleOn() || !(pts > 0)) return;
  if (GT - STY.lastT > 4) STY.chain = 0;
  STY.chain++; STY.lastT = GT; STY.mult = Math.min(4, 1 + (STY.chain - 1) * 0.5);
  const p = Math.round(pts * STY.mult / 10) * 10; STY.pts += p;
  stylePop(`+${p.toLocaleString()} ${name}${STY.mult > 1 ? '  ×' + STY.mult : ''}`);
}
function styleCrash() { STY.drift = 0; if (STY.chain > 1 && styleOn()) stylePop('COMBO LOST', true); STY.chain = 0; STY.mult = 1; STY.lastT = -9; }
function stylePop(text, bad) {
  const box = $('#styPops'); if (!box) return;
  const d = document.createElement('div'); d.className = 'stypop' + (bad ? ' bad' : ''); d.textContent = text; box.prepend(d);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => d.remove(), 2600);
}
// called on every landing of the player's vehicle
function styleLand(v) {
  if (!styleOn() || v !== G.player) return;
  const a = v.airT; STY.runAir = Math.max(STY.runAir, a); STY.bestAir = Math.max(STY.bestAir, a);
  if (a < 0.6) return;
  const dist = Math.hypot(v.x - v.airX, v.z - v.airZ);
  addStyle(`${a >= 3 ? 'MEGA AIR' : a >= 2 ? 'HUGE AIR' : 'BIG AIR'} ${a.toFixed(1)} s`, a * 450 + dist * 4);
}
function updateTestZone(dt) {
  const hud = STY.hud || (STY.hud = $('#styleHud'));
  if (!W || !W.testZone || APP.mode !== 'game') { if (hud && !hud.hidden) hud.hidden = true; return; }
  if (hud && hud.hidden) hud.hidden = false;
  const v = G.player, live = !!v && !G.down && !v.wrecked && !G.onFoot;
  if (live) {
    const sp = Math.hypot(v.vx, v.vz), fx = Math.sin(v.h), fz = Math.cos(v.h);
    // boost pads
    if (v.onGround && !v.loop && GT > TZ.boostT) for (const b of W.boosts) {
      const rx = v.x - b.x, rz = v.z - b.z, u = rx * b.dx + rz * b.dz, w = -rx * b.dz + rz * b.dx;
      if (u < 0 || u > b.len || Math.abs(w) > b.w / 2) continue;
      const vf = v.vx * fx + v.vz * fz; if (fx * b.dx + fz * b.dz < 0.6 || vf < 2) continue;
      const nv = Math.min(vf + 12, v.st.top * 1.12), add = Math.max(0, nv - vf);
      v.vx += fx * add; v.vz += fz * add; v.nitro = 1; TZ.boostT = GT + 0.9; SFX.whoosh(); G.shake = Math.max(G.shake, 0.25); stylePop('BOOST');
      break;
    }
    // drag strip: the clock starts as you cross the start line heading east and stops at the quarter-mile line
    const D = W.tz.drag;
    if (D) {
      const inLane = v.z > D.z0 && v.z < D.z1;
      if (!TZ.dragOn && inLane && TZ.prevX !== null && TZ.prevX < D.x0 && v.x >= D.x0 && v.vx > 0) { TZ.dragOn = true; TZ.dragT0 = GT; feed('Drag run: the clock is running', 'blue'); }
      if (TZ.dragOn && v.x >= D.x1) {
        const t = GT - TZ.dragT0, kmh = Math.round(Math.abs(v.vx) * 3.6); TZ.dragOn = false;
        const best = !TZ.bestQ || t < TZ.bestQ; if (best) TZ.bestQ = t;
        mbanner('Quarter mile', `${t.toFixed(2)} s  ·  ${settings.units === 'mph' ? Math.round(kmh / 1.609) + ' mph' : kmh + ' km/h'}${best ? '  ·  best' : ''}`, 'passed', 3.6);
        addStyle('QUARTER MILE ' + t.toFixed(2) + ' s', Math.max(0, 20 - t) * 300 + Math.max(0, kmh - 150) * 10);
      }
      if (TZ.dragOn && (!inLane || v.vx < -1 || GT - TZ.dragT0 > 60)) { TZ.dragOn = false; feed('Drag run abandoned', 'red'); }
      TZ.prevX = v.x;
      for (let k = 0; k < TZ.tree.length; k++) { const on = TZ.dragOn ? true : (GT * 2 + k * 0.3) % 2 < 1 && Math.hypot(v.x - D.x0, v.z - (D.z0 + D.z1) / 2) < 60; TZ.tree[k].material.color.set(on ? (k < 3 ? '#ffb21e' : '#2bff6a') : '#3a2a10'); }
    }
    const K = W.tz.sky;
    if (K && v.x > K.x0 && v.x < K.x1 && v.z > K.z0 && v.z < K.z1 && v.vx < 0) { if (sp > 62 && GT > (TZ.skyWarnT || 0)) { TZ.skyWarnT = GT + 6; feed('Too fast for the sky ramp! Over about 220 km/h you overshoot the landing hill', 'red'); } }
    // precision stop: a fast run, then dead still inside the box
    if (sp > 25) TZ.fastT = GT;
    const B = W.tz.stop, inBox = B && v.x > B.x0 && v.x < B.x1 && v.z > B.z0 && v.z < B.z1;
    if (inBox && sp < 0.4 && GT - TZ.fastT < 5 && !TZ.stopped) { TZ.stopped = true; addStyle('PRECISION STOP', 800); SFX.ding(); }
    if (!inBox) TZ.stopped = false;
    // drifting builds points while you hold it, scored when the drift ends cleanly
    if (v.onGround && !v.tumble && !v.flipped && !v.loop && !v.bike && Math.abs(v.vf) > 9 && (v.slip || 0) > 3.2) { STY.drift += v.slip * Math.abs(v.vf) * dt * 0.9; STY.driftT = GT; }
  }
  if (STY.drift > 0 && GT - STY.driftT > 0.6) { if (STY.drift > 120) addStyle('DRIFT', STY.drift); STY.drift = 0; }
  // hoops: fly through the middle (cars, bikes or planes)
  const F = G.plane ? { x: G.plane.x, y: G.plane.y, z: G.plane.z } : live ? { x: v.x, y: v.y + 0.8, z: v.z } : null;
  if (F) W.hoops.forEach((h, i) => {
    const s = (F.x - h.x) * h.dx + (F.z - h.z) * h.dz, prev = TZ.hoopPrev[i]; TZ.hoopPrev[i] = s;
    if (prev !== undefined && prev < 0 && s >= 0) { const lat = (F.x - h.x) * -h.dz + (F.z - h.z) * h.dx, dy = F.y - h.y; if (lat * lat + dy * dy < h.r * h.r) { addStyle('HOOP', 1000); SFX.ding(); } }
  });
  // the counter
  if (hud) { hudT('styPts', STY.pts.toLocaleString()); hudT('styMult', STY.mult > 1 && GT - STY.lastT < 4 ? '×' + STY.mult + ' COMBO' : STY.drift > 120 ? 'DRIFT ' + Math.round(STY.drift) : ''); }
}

// ---------- riding a loop ----------
function loopTryEnter(v, dt) {
  for (const L of W.loopTracks) {
    const rx = v.x - L.ex, rz = v.z - L.ez, u = rx * L.dx + rz * L.dz, side = rx * L.sx + rz * L.sz;
    if (Math.abs(side) > L.w / 2 - 0.3) continue;
    const vu = v.vx * L.dx + v.vz * L.dz;
    if (vu > 5 && u > 0 && u - vu * dt <= 0) { v.loop = { L, th: Math.max(0.001, u / L.R), sp: vu }; v.h = Math.atan2(L.dx, L.dz); v.av = 0; return true; }
  }
  return false;
}
function loopStep(v, dt) {
  const Lp = v.loop, L = Lp.L, inp = v.input, thr = v.wrecked ? 0 : inp.throttle, brk = v.wrecked ? 0 : inp.brake;
  Lp.sp += (-GRAV * Math.sin(Lp.th) + thr * v.st.acc * 0.7 - brk * v.st.brake * 0.6 - 0.0015 * Lp.sp * Math.abs(Lp.sp)) * dt;
  Lp.th += Lp.sp / L.R * dt;
  if (Lp.th >= TAU) { loopExit(v, true); return; }
  if (Lp.th <= 0) { loopExit(v, false); return; }
  if (Lp.sp * Lp.sp / L.R + GRAV * Math.cos(Lp.th) < 0) { loopFall(v); return; }   // the track can only push, not pull: too slow and you drop off
  const P = loopPoint(L, Lp.th), hc = v.hc || 0.6, c = Math.cos(Lp.th), s = Math.sin(Lp.th);
  v.x = P.x + P.nx * hc; v.y = P.y + P.ny * hc - hc; v.z = P.z + P.nz * hc;
  v.vx = L.dx * c * Lp.sp; v.vz = L.dz * c * Lp.sp; v.vy = s * Lp.sp; v.vf = Lp.sp; v.av = 0;
  v.pit = -Lp.th; v.roll = 0; v.onGround = true; v.airT = 0; v.slip = 0;
}
function loopExit(v, done) {
  const Lp = v.loop, L = Lp.L; v.loop = null; v.pit = 0; v.pitch = 0; v.roll = 0; v.vy = 0; v.onGround = true;
  const P = loopPoint(L, done ? TAU : 0); v.x = P.x + L.dx * (done ? 0.2 : -0.2); v.z = P.z + L.dz * (done ? 0.2 : -0.2); v.y = heightAt(v.x, v.z);
  v.vx = L.dx * Lp.sp; v.vz = L.dz * Lp.sp; v.h = Math.atan2(L.dx, L.dz);
  if (done && v === G.player) addStyle('LOOP THE LOOP', L.R >= 9 ? 2200 : 1800);
}
function loopFall(v) {
  const Lp = v.loop, L = Lp.L, c = Math.cos(Lp.th), s = Math.sin(Lp.th); v.loop = null;
  v.vx = L.dx * c * Lp.sp; v.vz = L.dz * c * Lp.sp; v.vy = s * Lp.sp;
  v.onGround = false; v.airT = 0; v.airX = v.x; v.airZ = v.z; v.pit = 0; v.pitch = 0;
  if (c < 0) { v.h = wrapA(v.h + Math.PI); v.roll = Math.PI; } else v.roll = 0;
  v.tumble = true; v.rollV = rand(-1.6, 1.6); v.pitV = rand(-1, 1);
  if (v === G.player) { styleCrash(); feed('Too slow: you fell off the loop. Hit it faster', 'red'); }
}
