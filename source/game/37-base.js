// =====================================================================
//  FORT REDROCK: a big desert army base (airfield with jets, helipads
//  with flyable choppers, HQ, barracks, tank park, motor pool, depot,
//  fuel farm, firing range, watchtowers) next to the town of Dust Creek
//  x = east, z = south
// =====================================================================
const BASE_FENCE = { x0: -160, x1: 700, z0: -480, z1: 470, gz0: 0, gz1: 20 };
const MILC = { olive: '#4b5a3a', olive2: '#56633f', sand: '#b59a6a', dark: '#2f3528', concrete: '#a7a194', camo: '#8f8a6e' };
const BLOCK_FILL = {}, FLAT_FILL = {};
function genBase(W, rng, addNode, addEdge) {
  W.name = 'Fort Redrock'; W.style = 'town'; W.hideWalls = true; W.fenceWalls = true;
  W.groundCol = '#c9a978'; W.miniBg = 'rgba(54,46,33,.92)'; W.miniFlat = '#5a4c36';
  W.cityC = { x: -440, z: -35, r: 200, max: 18, min: 7.2 };
  W.milSpots = []; W.helipads = []; W.post = [];
  const V = [[-620, -260, 190], [-530, -260, 190], [-440, -260, 190], [-350, -260, 190], [-260, -260, 190],
    [-60, -280, 280], [140, -280, 280], [340, -280, 280], [540, -280, 280]];
  const H = [[-260, -620, -260], [-170, -620, -260], [-80, -620, -260], [10, -620, 540], [100, -620, -260], [190, -620, -260],
    [-280, -60, 540], [280, -60, 540]];
  const node = roadsFromLines(addNode, addEdge, V, H);
  const all = { n: 1, s: 1, e: 1, w: 1 }, hw = 6;
  const cell = (xa, xb, za, zb, type, extra) => { const b = Object.assign({ x0: xa + hw, x1: xb - hw, z0: za + hw, z1: zb - hw, h: 0.15, type, sides: all }, extra || {}); W.blocks.push(b); return b; };
  // ---- Dust Creek: a little desert town with a main street of shops ----
  const XS = [-620, -530, -440, -350, -260], ZS = [-260, -170, -80, 10, 100, 190];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const main = j === 2 || j === 3;
    if (i === 1 && j === 4) cell(XS[i], XS[i + 1], ZS[j], ZS[j + 1], 'parkS');
    else cell(XS[i], XS[i + 1], ZS[j], ZS[j + 1], main ? 'city' : 'house', main ? { hMax: 16, hMin: 7.2, neon: 0.5 } : {});
  }
  // ---- the base: six big compounds between the camp roads ----
  const BX = [-60, 140, 340, 540], BZ = [-280, 10, 280];
  const types = [['hq', 'helipads', 'motorpool'], ['barracks', 'tankpark', 'depot']];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) cell(BX[i], BX[i + 1], BZ[j], BZ[j + 1], types[j][i], { mil: true });
  // ---- open ground: airfield to the north, firing range to the south, fuel farm east, entry west ----
  const F = BASE_FENCE;
  W.flats.push({ x0: F.x0 + 10, x1: F.x1 - 10, z0: F.z0 + 10, z1: -292, type: 'airfield', tex: 'sand' });
  W.flats.push({ x0: F.x0 + 10, x1: F.x1 - 10, z0: 292, z1: F.z1 - 8, type: 'range', tex: 'none' });
  W.flats.push({ x0: 552, x1: F.x1 - 8, z0: -286, z1: 286, type: 'fuelfarm', tex: 'none' });
  W.flats.push({ x0: F.x0 + 6, x1: -72, z0: -286, z1: 286, type: 'entry', tex: 'none' });
  // desert all round, kept off the road between town and gate
  for (const r of [[-780, -626, -580, 580], [-626, -166, -580, -266], [-626, -166, 196, 580], [-254, -166, -266, -4], [-254, -166, 24, 196], [706, 780, -580, 580], [-166, 706, -580, -486], [-166, 706, 476, 580]])
    W.flats.push({ x0: r[0], x1: r[1], z0: r[2], z1: r[3], type: 'scrub', tex: 'none' });
  W.bounds = { x0: -780, x1: 780, z0: -580, z1: 580 };
  W.spawnEdges = [[node(-440, 10), node(-350, 10)], [node(-530, -80), node(-530, 10)], [node(-350, 100), node(-350, 190)]];
  baseFence(W);
}
// ---------- helpers ----------
function milD(W, x0, z0, x1, z1, y0, y1, col, ry) { W.details.push([x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, col].concat(ry ? [ry] : [])); }
function milBld(W, x0, z0, x1, z1, y, h, col, tex) { W.bldgs.push({ x0, z0, x1, z1, y, h, col, tex: tex || 'house', mil: true }); W.addBox(x0, z0, x1, z1, y + h, 'b'); }
// a tank parked facing ry (multiples of PI/2): hull, tracks, turret, barrel
function milTank(W, x, z, ry, col, y) {
  y = y || 0.15;
  W.custom.push(L => { const g = tankGeo(col); g.rotateY(ry); g.translate(x, y, z); L.roof.push(g); });
  const ax = Math.abs(Math.cos(ry)) > 0.5; W.addBox(x - (ax ? 1.95 : 3.6), z - (ax ? 3.6 : 1.95), x + (ax ? 1.95 : 3.6), z + (ax ? 3.6 : 1.95), y + 2.5, 'b');
}
// a main battle tank: sloped hull, tracks over road wheels, a rounded turret, a long gun
const TANK_TURRET_AT = [0, 1.55, -0.35];
function tankHullGeo(col) {
  const P = [], c = C(col), dk = C('#2b2f27'), mt = C('#3d4238');
  const hullS = new THREE.Shape(); hullS.moveTo(-3.3, 0.55); hullS.lineTo(-3.4, 1.35); hullS.lineTo(2.0, 1.55); hullS.lineTo(3.4, 1.05); hullS.lineTo(3.2, 0.55); hullS.closePath();
  const hull = new THREE.ExtrudeGeometry(hullS, { depth: 2.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 }); hull.translate(0, 0, -1.25); hull.rotateY(-Math.PI / 2); P.push(colorize(hull, c));
  for (const s of [-1, 1]) {
    const fender = new THREE.BoxGeometry(0.85, 0.1, 7.0); fender.translate(s * 1.55, 1.32, 0); P.push(colorize(fender, c));
    const track = new THREE.BoxGeometry(0.72, 0.95, 6.6); track.translate(s * 1.55, 0.55, 0); P.push(colorize(track, dk));
    for (let k = 0; k < 6; k++) { const w = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 14); w.rotateZ(Math.PI / 2); w.translate(s * 1.94, 0.48, -2.5 + k); P.push(colorize(w, mt)); const hub = new THREE.CylinderGeometry(0.14, 0.14, 0.24, 8); hub.rotateZ(Math.PI / 2); hub.translate(s * 1.97, 0.48, -2.5 + k); P.push(colorize(hub, dk)); }
    for (const zz of [-3.05, 3.05]) { const sp = new THREE.CylinderGeometry(0.42, 0.42, 0.62, 14); sp.rotateZ(Math.PI / 2); sp.translate(s * 1.55, 0.62, zz); P.push(colorize(sp, dk)); }
  }
  return mergeGeos(P);
}
function tankTurretGeo(col) {   // centred on the turret ring
  const P = [], c = C(col), dk = C('#2b2f27'), mt = C('#3d4238');
  const tur = new THREE.CylinderGeometry(1.15, 1.4, 0.85, 18); tur.scale(1, 1, 1.35); tur.translate(0, 0.43, 0); P.push(colorize(tur, c));
  const tt = new THREE.SphereGeometry(1.15, 18, 6, 0, TAU, 0, Math.PI / 2); tt.scale(1, 0.18, 1.35); tt.translate(0, 0.85, 0); P.push(colorize(tt, c));
  const mant = new THREE.BoxGeometry(0.9, 0.55, 0.5); mant.translate(0, 0.45, 1.65); P.push(colorize(mant, c));
  const gun = new THREE.CylinderGeometry(0.1, 0.13, 4.6, 12); gun.rotateX(Math.PI / 2); gun.translate(0, 0.47, 4.1); P.push(colorize(gun, mt));
  const muz = new THREE.CylinderGeometry(0.16, 0.16, 0.45, 12); muz.rotateX(Math.PI / 2); muz.translate(0, 0.47, 6.35); P.push(colorize(muz, dk));
  const cup = new THREE.CylinderGeometry(0.32, 0.36, 0.3, 12); cup.translate(0.45, 1.01, -0.45); P.push(colorize(cup, c));
  const mg = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6); mg.rotateX(Math.PI / 2); mg.translate(0.45, 1.3, -0.05); P.push(colorize(mg, dk));
  const box = new THREE.BoxGeometry(1.6, 0.5, 0.7); box.translate(0, 0.5, -1.4); P.push(colorize(box, c));
  return mergeGeos(P);
}
function tankGeo(col) { const t = tankTurretGeo(col); t.translate(...TANK_TURRET_AT); return mergeGeos([tankHullGeo(col), t]); }
// ---------- drivable tanks ----------
BODIES.tank = { name: 'Ironclad tank', blurb: 'Army battle tank. Slow, almost indestructible, and it has a cannon.', L: 7.2, W: 3.9, wb: 5.2, wr: 0.45, track: 3.1, tank: true, hidden: true, stats: { top: 16, acc: 7.5, grip: 2.4, mass: 30000, hp: 2600 } };
function tankCfg(col) { return { body: 'tank', paint: col || MILC.olive, finish: 'matte', armor: 1, engine: 2, handling: 2, brakes: 3, nitro: false, plate: 'ARMY', stripes: false, neon: 'off', spoiler: 'none', rim: 'classic', rimColor: '#2a2c30', tint: 1, height: 'stock' }; }
function buildTankModel(cfg, opts = {}) {
  const col = cfg.paint || MILC.olive, H = 2.6, hc = H * 0.5;
  const root = new THREE.Group(), pivot = new THREE.Group(); pivot.position.y = hc; pivot.rotation.order = 'YXZ'; root.add(pivot);
  const inner = new THREE.Group(); inner.position.y = -hc; pivot.add(inner);
  const body = new THREE.Group(); inner.add(body);
  const vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.12 });
  const hull = new THREE.Mesh(tankHullGeo(col), vmat); hull.castShadow = true; hull.receiveShadow = true; body.add(hull);
  const turret = new THREE.Group(); turret.position.set(...TANK_TURRET_AT); body.add(turret);
  const tm = new THREE.Mesh(tankTurretGeo(col), vmat); tm.castShadow = true; tm.receiveShadow = true; turret.add(tm);
  const paintMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), getPaint(col, 'matte')); paintMesh.position.set(0, 1.58, 2.4); body.add(paintMesh);
  const hg = mergeGeos([0.9, -0.9].map(x => { const g = new THREE.BoxGeometry(0.22, 0.16, 0.06); g.translate(x, 1.12, 3.42); return g; }));
  const headMesh = new THREE.Mesh(hg, MAT.head); body.add(headMesh);
  const tailMat = opts.ownTail ? MAT.tail.clone() : MAT.tail, tg = mergeGeos([1.2, -1.2].map(x => { const g = new THREE.BoxGeometry(0.2, 0.12, 0.05); g.translate(x, 1.25, -3.42); return g; }));
  const tailMesh = new THREE.Mesh(tg, tailMat); body.add(tailMesh);
  const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), MAT.glass[1]); glassMesh.position.set(0.45, 1.2, -0.3); turret.add(glassMesh);
  const dummy = () => new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), MAT.trim);
  const dims = { L: 7.2, W: 3.9, H, front: 3.6, rear: -3.6, wr: 0.45, wb: 5.2, track: 3.1, hz: 3.45, hy: 1.12, tz: -3.45, ty: 1.25, roofY: 2.85, roofZ: -0.4 };
  return { root, pivot, inner, body, paintMesh, stripeMesh: null, glassMesh, trimMesh: hull, headMesh, tailMesh, bumperF: dummy(), bumperR: dummy(), wheels: [], tailMat, dims, hc, police: false, neon: null, ownTail: !!opts.ownTail, deformables: [], tank: true, turret, gun: tm };
}
const _tk = new THREE.Vector3();
function updateTanks(dt) {
  for (const v of VEH.list) {
    if (!v.tank || !v.model.turret) continue;
    const mine = v === G.player && !v.wrecked && !G.down;
    if (v.turretYaw === undefined) v.turretYaw = v.h;
    let want = mine ? null : v.h;
    if (mine) {
      if (ARMS.mouse.down) { const a = mouseRayPoint(v); if (a) want = Math.atan2(a.x - v.x, a.z - v.z); }
      if (want === null) { camera.getWorldDirection(_tk); want = Math.atan2(_tk.x, _tk.z); }
    }
    if (!v.wrecked) v.turretYaw += clamp(wrapA(want - v.turretYaw), -1.6 * dt, 1.6 * dt);
    v.model.turret.rotation.y = v.turretYaw - v.h;
    v.recoil = Math.max(0, (v.recoil || 0) - dt * 2.5); v.model.gun.position.z = -v.recoil * 0.45;
    if (mine) {
      v.tankCd = (v.tankCd || 0) - dt;
      if ((KEYS.KeyQ || ARMS.mouse.down || TOUCH.horn) && !APP.paused && v.tankCd <= 0 && !weaponsBanned()) fireTankShell(v);
    }
  }
}
function fireTankShell(v) {
  v.tankCd = 1.5; v.recoil = 1;
  const y = v.turretYaw, fx = Math.sin(y), fz = Math.cos(y);
  camera.getWorldDirection(_tk); const up = clamp(_tk.y + 0.06, -0.1, 0.4), l = Math.hypot(fx, up, fz);
  const o = { x: v.x + fx * 6.4, y: v.y + 2.05 + up * 4, z: v.z + fz * 6.4 };
  launchRocket(o, fx / l, up / l, fz / l, 'hero'); const r = ARMS.rockets[ARMS.rockets.length - 1]; r.vx *= 1.5; r.vy *= 1.5; r.vz *= 1.5; r.shell = true; r.m.scale.setScalar(1.4);
  for (let k = 0; k < 18; k++) FX.fire.emit(o.x, o.y, o.z, fx * rand(4, 12) + rand(-2, 2), rand(-1, 2), fz * rand(4, 12) + rand(-2, 2), rand(0.2, 0.4), rand(0.4, 1.0), COL.fireHot, 1, -1, 0.8, 0.5, 4);
  for (let k = 0; k < 12; k++) FX.smoke.emit(o.x, o.y, o.z, fx * rand(1, 4) + rand(-1, 1), rand(0, 1.5), fz * rand(1, 4) + rand(-1, 1), rand(1.5, 3), rand(0.8, 1.6), COL.smoke, 0.6, -0.1, 0.4, 1.2, 4);
  G.flashes.push({ x: o.x, y: o.y, z: o.z, s: 6, t: 0.25 }); SFX.cannon(); G.shake = Math.max(G.shake, 0.35);
  v.vx -= fx * 0.8; v.vz -= fz * 0.8;
  if (GT - ARMS.lastHeat > 1.5) { ARMS.lastHeat = GT; addHeat(0.3, 0, true); }
  ARMS.lastShot = GT;
}
// tank spots at the tank park: a fresh tank rolls out when one is taken (while nobody's watching)
function updateTankSpots(dt) {
  if (!W.tankSpots || (BASEST.tankT = (BASEST.tankT || 0) - dt) > 0) return; BASEST.tankT = 6;
  const P = PF(); if (!P) return;
  for (const s of W.tankSpots) {
    if (s.v && VEH.list.includes(s.v) && !s.v.wrecked && Math.hypot(s.v.x - s.x, s.v.z - s.z) < 20) continue;
    const near = VEH.list.find(q => q.tank && !q.wrecked && Math.hypot(q.x - s.x, q.z - s.z) < 6); if (near) { s.v = near; continue; }
    if (Math.hypot(P.x - s.x, P.z - s.z) < 150 || VEH.list.some(q => Math.hypot(q.x - s.x, q.z - s.z) < 5)) continue;
    const v = new Vehicle(tankCfg(s.col), 'parked'); v.place(s.x, s.z, s.h, 0); VEH.list.push(v); s.v = v;
  }
}
function milTower(W, x, z) {   // fence watchtower on four legs
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) { milD(W, x + dx - 0.15, z + dz - 0.15, x + dx + 0.15, z + dz + 0.15, 0, 7, '#5a5f55'); W.addBox(x + dx - 0.2, z + dz - 0.2, x + dx + 0.2, z + dz + 0.2, 7, 'p'); }
  milD(W, x - 2.2, z - 2.2, x + 2.2, z + 2.2, 7, 7.3, '#6b6f63'); milD(W, x - 2.1, z - 2.1, x + 2.1, z + 2.1, 7.3, 8.3, '#7d7a6a');
  milD(W, x - 2.0, z - 2.0, x + 2.0, z + 2.0, 8.3, 9.3, '#20262b'); milD(W, x - 2.5, z - 2.5, x + 2.5, z + 2.5, 9.3, 9.6, '#4b5a3a');
  W.props.push({ type: 'lamp', x: x + 2.4, z, ry: -Math.PI / 2 });
}
// chain-link fence with barbed wire round the base, a gate on the west side
function baseFence(W) {
  const F = BASE_FENCE, H2 = 3.2, runs = [];
  runs.push(['x', F.z0, F.x0, F.x1], ['x', F.z1, F.x0, F.x1], ['z', F.x1, F.z0, F.z1], ['z', F.x0, F.z0, F.gz0], ['z', F.x0, F.gz1, F.z1]);
  for (const [ax, c, a, b] of runs) {
    if (ax === 'x') W.addBox(a, c - 0.15, b, c + 0.15, H2, 'rail'); else W.addBox(c - 0.15, a, c + 0.15, b, H2, 'rail');
    for (let t = a; t <= b; t += 3) { const x = ax === 'x' ? t : c, z = ax === 'x' ? c : t; milD(W, x - 0.06, z - 0.06, x + 0.06, z + 0.06, 0, H2 + 0.5, '#6d7278'); }
    for (const y of [H2, H2 + 0.25, H2 + 0.5]) { if (ax === 'x') milD(W, a, c - 0.02, b, c + 0.02, y, y + 0.03, '#55595e'); else milD(W, c - 0.02, a, c + 0.02, b, y, y + 0.03, '#55595e'); }
  }
  W.post.push(root => {   // the see-through chain-link panels
    const geos = [];
    for (const [ax, c, a, b] of runs) { const g = new THREE.PlaneGeometry(b - a, H2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (b - a) / 2, uv.getY(i) * H2 / 2); if (ax === 'z') g.rotateY(Math.PI / 2); g.translate(ax === 'x' ? (a + b) / 2 : c, H2 / 2, ax === 'x' ? c : (a + b) / 2); geos.push(g); }
    const m = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ map: TEX.fence, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4, depthWrite: true })); m.castShadow = true; root.add(m);
  });
  // corner and side watchtowers
  for (const [x, z] of [[F.x0 + 4, F.z0 + 4], [F.x1 - 4, F.z0 + 4], [F.x0 + 4, F.z1 - 4], [F.x1 - 4, F.z1 - 4], [270, F.z0 + 4], [270, F.z1 - 4], [F.x1 - 4, 0], [F.x0 + 4, -200], [F.x0 + 4, 220]]) milTower(W, x, z);
  // the gate: guard booths, a raised boom barrier, stop line, sign
  const gx = F.x0, gzc = (F.gz0 + F.gz1) / 2;
  milBld(W, gx + 4, F.gz1 + 1.5, gx + 9, F.gz1 + 5.5, 0, 3, '#d8cfbd'); milD(W, gx + 3.5, F.gz1 + 1, gx + 9.5, F.gz1 + 6, 3, 3.3, '#4b5a3a');
  milBld(W, gx + 4, F.gz0 - 5.5, gx + 9, F.gz0 - 1.5, 0, 3, '#d8cfbd'); milD(W, gx + 3.5, F.gz0 - 6, gx + 9.5, F.gz0 - 1, 3, 3.3, '#4b5a3a');
  milD(W, gx + 2.6, F.gz1 + 0.4, gx + 3.4, F.gz1 + 1.2, 0, 1.2, '#c8352b');
  for (let k = 0; k < 8; k++) milD(W, gx + 2.9, F.gz1 + 0.7, gx + 3.1, F.gz1 + 0.9, 1.2 + k * 0.7, 1.9 + k * 0.7, k % 2 ? '#f2f2ee' : '#c8352b');   // boom, raised
  W.marks.push([gx + 12, gzc - 0.3 - 5, gx + 12.4, gzc + 5.3, 0.02]);
  for (const s of [-1, 1]) { const z = s < 0 ? F.gz0 - 10 : F.gz1 + 10; milD(W, gx - 30, z - 0.4, gx - 26, z + 0.4, 0, 0.9, '#c8352b'); W.addBox(gx - 30, z - 0.4, gx - 26, z + 0.4, 0.9, 'c'); }
  W.post.push(root => {
    const t = canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = '#3b4a2e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9c27a'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#efe4c0'; g.font = 'bold 58px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FORT REDROCK', w / 2, 62);
      g.font = 'bold 24px Arial, sans-serif'; g.fillStyle = '#ffcf4a'; g.fillText('RESTRICTED AREA · AUTHORISED PERSONNEL ONLY', w / 2, 120);
    }, { repeat: false });
    const sg = new THREE.PlaneGeometry(10, 3.1); sg.rotateY(-Math.PI / 2); sg.translate(gx - 18, 3.4, F.gz1 + 12.5);
    const s = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.DoubleSide })); root.add(s);
  });
  milD(W, gx - 18.1, F.gz1 + 8, gx - 17.9, F.gz1 + 8.3, 0, 5, '#3a3d42'); milD(W, gx - 18.1, F.gz1 + 16.7, gx - 17.9, F.gz1 + 17, 0, 5, '#3a3d42');
}
// ---------- compounds ----------
BLOCK_FILL.hq = (W, b, rng) => {   // headquarters, flag, parade ground, staff car park, a tank on a plinth
  b.top = 'sand'; const cx = (b.x0 + b.x1) / 2;
  W.custom.push(L => { L.lot.push(quadF(cx - 40, b.z0 + 76, cx + 40, b.z0 + 124, b.h + 0.012, tile(8)), quadF(b.x0 + 6, b.z1 - 50, b.x1 - 6, b.z1 - 4, b.h + 0.012, tile(8)), quadF(cx - 4, b.z0 + 62, cx + 4, b.z0 + 76, b.h + 0.012, tile(8))); L.grass.push(quadF(cx - 40, b.z0 + 8, cx - 14, b.z0 + 16, b.h + 0.01, tile(8)), quadF(cx + 14, b.z0 + 8, cx + 40, b.z0 + 16, b.h + 0.01, tile(8))); });
  milBld(W, cx - 34, b.z0 + 18, cx + 34, b.z0 + 46, b.h, 14.4, '#cdbf9f', 'brick');
  milBld(W, cx - 10, b.z0 + 46, cx + 10, b.z0 + 56, b.h, 7.2, '#cdbf9f', 'brick');
  milD(W, cx - 12, b.z0 + 56, cx + 12, b.z0 + 62, 4.2, 4.6, '#e9e2d2'); for (const dx of [-11, -4, 4, 11]) { milD(W, cx + dx - 0.35, b.z0 + 60.5, cx + dx + 0.35, b.z0 + 61.2, b.h, 4.2, '#efe9dd'); W.addBox(cx + dx - 0.35, b.z0 + 60.5, cx + dx + 0.35, b.z0 + 61.2, 4.2, 'p'); }
  // parade ground and flagpole
  const pz = b.z0 + 100; for (let k = -3; k <= 3; k++) W.marks.push([cx + k * 10 - 0.15, pz - 18, cx + k * 10 + 0.15, pz + 18, b.h + 0.012]);
  milD(W, cx - 0.15, pz - 0.15, cx + 0.15, pz + 0.15, b.h, b.h + 16, '#d9dce0'); W.addBox(cx - 0.3, pz - 0.3, cx + 0.3, pz + 0.3, 16, 'p');
  for (let k = 0; k < 5; k++) milD(W, cx + 0.2, pz - 0.03, cx + 4.2, pz + 0.03, b.h + 15.6 - k * 0.5, b.h + 16.1 - k * 0.5, k % 2 ? '#f2f2ee' : '#4b5a3a');
  milD(W, cx - 3, pz - 3, cx + 3, pz + 3, b.h, b.h + 0.5, '#b8b1a3');
  // a retired tank on a plinth
  milD(W, cx + 30, pz - 6, cx + 42, pz + 6, b.h, b.h + 1.2, '#b8b1a3'); W.addBox(cx + 30, pz - 6, cx + 42, pz + 6, b.h + 1.2, 'b'); milTank(W, cx + 36, pz, Math.PI / 2, MILC.olive2, b.h + 1.2);
  // staff car park
  for (let row = 0; row < 2; row++) { const z = b.z1 - 40 + row * 20; for (let x = b.x0 + 12; x < b.x1 - 10; x += 3.4) { W.marks.push([x - 1.76, z - 2.6, x - 1.64, z + 2.6, b.h + 0.012]); if (rng() < 0.35) W.parked.push({ x: x + 1.7, z, h: row ? 0 : Math.PI, cfg: milCarCfg(rng) }); } }
  for (const [x, z] of [[b.x0 + 8, pz], [b.x1 - 8, pz]]) addTree(W, 'palm', x, z, 1);
};
BLOCK_FILL.helipads = (W, b, rng) => {   // four pads with attack and transport choppers ready to fly
  b.top = 'sand'; const pads = [[b.x0 + 44, b.z0 + 45, 'hornet'], [b.x1 - 44, b.z0 + 45, 'hornet'], [b.x0 + 44, b.z0 + 135, 'mule'], [b.x1 - 44, b.z0 + 135, 'mule'], [b.x0 + 44, b.z1 - 45, 'hornet'], [b.x1 - 44, b.z1 - 45, 'mule']];
  for (const [x, z, type] of pads) {
    W.helipads.push({ x, z });
    W.milSpots.push({ type, x, z, yaw: Math.PI, col: type === 'hornet' ? MILC.olive : '#5b6650', trim: type === 'hornet' ? '#2a2f26' : '#33392c' });
    W.custom.push(L => {
      L.lot.push(quadF(x - 15, z - 15, x + 15, z + 15, b.h + 0.012, tile(8)));
      const ring = new THREE.RingGeometry(10.6, 11.4, 40); ring.rotateX(-Math.PI / 2); ring.translate(x, b.h + 0.02, z); L.mark.push(ring);
      L.mark.push(quadF(x - 3.4, z - 4, x - 2.2, z + 4, b.h + 0.02, () => [0, 0]), quadF(x + 2.2, z - 4, x + 3.4, z + 4, b.h + 0.02, () => [0, 0]), quadF(x - 2.2, z - 0.6, x + 2.2, z + 0.6, b.h + 0.02, () => [0, 0]));
    });
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; milD(W, x + Math.cos(a) * 12 - 0.2, z + Math.sin(a) * 12 - 0.2, x + Math.cos(a) * 12 + 0.2, z + Math.sin(a) * 12 + 0.2, b.h, b.h + 0.25, '#ffb21e'); }
  }
  // flight ops hut, fuel bowser, windsock
  const hx = (b.x0 + b.x1) / 2, oz = b.z0 + 90; milBld(W, hx - 9, oz - 6, hx + 9, oz + 6, b.h, 4.2, '#d8cfbd'); milD(W, hx - 2, oz - 2, hx + 2, oz + 2, b.h + 4.2, b.h + 7.4, '#20262b');
  milD(W, hx + 14, oz - 4, hx + 16.4, oz + 4, b.h, b.h + 2.6, MILC.olive); milD(W, hx + 14.1, oz - 1, hx + 16.3, oz + 4, b.h + 0.6, b.h + 2.4, '#d6d2c4'); W.addBox(hx + 14, oz - 4, hx + 16.4, oz + 4, b.h + 2.6, 'b');
  milD(W, hx - 20.1, oz, hx - 19.9, oz + 0.2, b.h, b.h + 6, '#c9ccd1'); milD(W, hx - 19.9, oz - 0.4, hx - 16.5, oz + 0.6, b.h + 5, b.h + 5.8, '#ff7a1a');
  // maintenance hangar, open to the pads, with crates and a tug inside
  const gz = b.z0 + 190; milD(W, hx - 26, gz, hx + 26, gz + 34, 10.5, 11.2, '#8d9096'); W.custom.push(L => L.lot.push(quadF(hx - 26, gz, hx + 26, gz + 34, b.h + 0.012, tile(8))));
  for (const [a0, c0, a1, c1] of [[hx - 26, gz, hx - 25.4, gz + 34], [hx + 25.4, gz, hx + 26, gz + 34], [hx - 26, gz + 33.4, hx + 26, gz + 34]]) { milD(W, a0, c0, a1, c1, b.h, 10.5, '#bdb8aa'); W.addBox(a0, c0, a1, c1, b.h + 10.5, 'b'); }
  for (let k = 0; k < 6; k++) milD(W, hx - 22 + k * 1.6, gz + 28, hx - 20.6 + k * 1.6, gz + 30.5, b.h, b.h + 1.2 + (k % 2) * 1.2, '#7a5a3a');
  milD(W, hx + 12, gz + 20, hx + 15, gz + 25, b.h, b.h + 1.3, '#f5b700'); W.addBox(hx + 12, gz + 20, hx + 15, gz + 25, b.h + 1.3, 'c');
};
BLOCK_FILL.motorpool = (W, b, rng) => {   // garages, rows of army trucks, fuel point
  b.top = 'lot';
  for (const [x0, x1] of [[b.x0 + 8, b.x0 + 70], [b.x1 - 70, b.x1 - 8]]) {
    milBld(W, x0, b.z0 + 8, x1, b.z0 + 30, b.h, 8, '#bdb8aa');
    for (let x = x0 + 4; x < x1 - 6; x += 12) milD(W, x, b.z0 + 29.9, x + 9, b.z0 + 30.05, b.h, b.h + 5.5, '#5d6650');   // roller doors
  }
  for (let row = 0; row < 4; row++) { const z = b.z0 + 60 + row * 26; for (let x = b.x0 + 16; x < b.x1 - 14; x += 5) { W.marks.push([x - 2.56, z - 3, x - 2.44, z + 3, b.h + 0.012]); if (rng() < 0.55) W.parked.push({ x, z, h: row % 2 ? 0 : Math.PI, cfg: milCarCfg(rng) }); } }
  const fx = (b.x0 + b.x1) / 2, fz = b.z1 - 40;
  milD(W, fx - 14, fz - 7, fx + 14, fz + 7, b.h + 5.4, b.h + 6, '#e9e6df'); for (const dx of [-12, 12]) for (const dz of [-5, 5]) { milD(W, fx + dx - 0.25, fz + dz - 0.25, fx + dx + 0.25, fz + dz + 0.25, b.h, b.h + 5.4, '#9aa0a6'); W.addBox(fx + dx - 0.25, fz + dz - 0.25, fx + dx + 0.25, fz + dz + 0.25, 5.4, 'p'); }
  for (const dx of [-6, 0, 6]) W.props.push({ type: 'pump', x: fx + dx, z: fz, ry: 0 });
  for (let k = 0; k < 10; k++) { const x = b.x1 - 10 - (k % 5) * 1.2, z = b.z1 - 12 - ((k / 5) | 0) * 1.2; milD(W, x - 0.45, z - 0.45, x + 0.45, z + 0.45, b.h, b.h + 1.1, k % 3 ? '#4b5a3a' : '#8a3b2e'); }
};
BLOCK_FILL.barracks = (W, b, rng) => {   // rows of barracks, a mess hall, a basketball court, an obstacle course
  b.top = 'dirt';
  for (let c = 0; c < 2; c++) for (let r = 0; r < 4; r++) {
    const x0 = b.x0 + 14 + c * 92, z0 = b.z0 + 14 + r * 34;
    milBld(W, x0, z0, x0 + 64, z0 + 14, b.h, 7.2, '#d6c9a8', 'house');
    W.roofs.push({ x0, z0, x1: x0 + 64, z1: z0 + 14, y: b.h + 7.2, h: 2.2, col: '#6b7354' });
    for (let k = 0; k < 4; k++) milD(W, x0 + 6 + k * 16, z0 + 14, x0 + 9 + k * 16, z0 + 16, b.h, b.h + 0.4, '#b8b1a3');
  }
  const mz = b.z0 + 156; milBld(W, b.x0 + 20, mz, b.x0 + 90, mz + 30, b.h, 8.6, '#cdbf9f', 'brick'); milD(W, b.x0 + 18, mz + 30, b.x0 + 92, mz + 34, 4, 4.4, '#4b5a3a');
  // basketball court
  const kx = b.x1 - 50, kz = mz + 4; W.custom.push(L => L.lot.push(quadF(kx - 14, kz, kx + 14, kz + 26, b.h + 0.01, tile(8))));
  for (const [a0, b0, a1, b1] of [[kx - 14, kz, kx + 14, kz + 0.2], [kx - 14, kz + 25.8, kx + 14, kz + 26], [kx - 14, kz, kx - 13.8, kz + 26], [kx + 13.8, kz, kx + 14, kz + 26], [kx - 14, kz + 12.9, kx + 14, kz + 13.1]]) W.marks.push([a0, b0, a1, b1, b.h + 0.02]);
  for (const z of [kz + 1.2, kz + 24.8]) { milD(W, kx - 0.1, z - 0.1, kx + 0.1, z + 0.1, b.h, b.h + 3.4, '#3a3d42'); milD(W, kx - 0.9, z - 0.05, kx + 0.9, z + 0.05, b.h + 3, b.h + 4, '#f2f2ee'); }
  // obstacle course: walls to vault, tyres, a climbing frame
  const oz = b.z1 - 34;
  for (let k = 0; k < 6; k++) { const x = b.x0 + 24 + k * 14; milD(W, x - 0.3, oz - 3, x + 0.3, oz + 3, b.h, b.h + 1.1 + (k % 2) * 0.6, '#8a6b4a'); W.addBox(x - 0.3, oz - 3, x + 0.3, oz + 3, b.h + 1.1 + (k % 2) * 0.6, 'c'); }
  for (let k = 0; k < 8; k++) milD(W, b.x0 + 110 + (k % 4) * 2.2, oz - 1 + ((k / 4) | 0) * 2.2, b.x0 + 111.6 + (k % 4) * 2.2, oz + 0.6 + ((k / 4) | 0) * 2.2, b.h, b.h + 0.5, '#1b1c1f');
  for (let k = 0; k < 5; k++) milD(W, b.x0 + 130 + k * 2.4, oz - 0.08, b.x0 + 130.2 + k * 2.4, oz + 0.08, b.h, b.h + 4, '#5a4632');
  milD(W, b.x0 + 130, oz - 0.1, b.x0 + 140, oz + 0.1, b.h + 4, b.h + 4.2, '#5a4632');
};
BLOCK_FILL.tankpark = (W, b, rng) => {   // rows of tanks, open-sided vehicle sheds, a wash rack
  b.top = 'dirt';
  W.tankSpots = W.tankSpots || [];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
    const x = b.x0 + 26 + k * 26, z = b.z0 + 40 + r * 44, col = rng() < 0.5 ? MILC.olive : MILC.camo;
    if (r === 0) { W.tankSpots.push({ x, z, h: 0, col }); W.parked.push({ x, z, h: 0, cfg: tankCfg(col) }); }   // the front row is fuelled up and ready to drive
    else milTank(W, x, z, 0, col);
  }
  for (const z0 of [b.z1 - 78, b.z1 - 40]) {
    milD(W, b.x0 + 12, z0, b.x1 - 12, z0 + 22, 6.6, 7.1, '#7d8086');
    for (let x = b.x0 + 14; x <= b.x1 - 14; x += 20) for (const dz of [1, 21]) { milD(W, x - 0.3, z0 + dz - 0.3, x + 0.3, z0 + dz + 0.3, b.h, 6.6, '#5d6066'); W.addBox(x - 0.3, z0 + dz - 0.3, x + 0.3, z0 + dz + 0.3, 6.6, 'p'); }
  }
  for (let k = 0; k < 4; k++) milTank(W, b.x0 + 36 + k * 36, b.z1 - 29, Math.PI, MILC.olive2);
};
BLOCK_FILL.depot = (W, b, rng) => {   // earth-covered ammo bunkers, warehouses, container stacks
  b.top = 'dirt';
  for (let k = 0; k < 3; k++) {
    const x0 = b.x0 + 14 + k * 58, z0 = b.z0 + 16;
    for (let s = 0; s < 4; s++) milD(W, x0 + s * 2, z0 + s * 1.5, x0 + 44 - s * 2, z0 + 30 - s * 1.5, b.h + s * 1.4, b.h + (s + 1) * 1.4, ['#a88b62', '#9d8158', '#b0936a', '#c2a477'][s]);
    W.addBox(x0, z0, x0 + 44, z0 + 30, b.h + 5.6, 'b');
    milD(W, x0 + 17, z0 + 29.6, x0 + 27, z0 + 30.2, b.h, b.h + 3.6, '#8f9499'); milD(W, x0 + 16, z0 + 29.5, x0 + 28, z0 + 30.3, b.h + 3.6, b.h + 4.2, '#c8b14a');
  }
  milBld(W, b.x0 + 14, b.z0 + 80, b.x0 + 84, b.z0 + 116, b.h, 10.8, '#b9b4a6');
  milBld(W, b.x0 + 100, b.z0 + 80, b.x0 + 170, b.z0 + 116, b.h, 10.8, '#c4bca8');
  const CC = ['#c8352b', '#1e8a4c', '#1f6fd6', '#d9a52a', '#4b5a3a', '#8a3b2e'];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
    const x = b.x0 + 20 + k * 34, z = b.z0 + 140 + r * 18, n = 1 + ((rng() * 3) | 0);
    for (let s = 0; s < n; s++) milD(W, x, z, x + 12.2, z + 2.5, b.h + s * 2.6, b.h + (s + 1) * 2.6, CC[(r * 5 + k + s) % CC.length]);
    W.addBox(x, z, x + 12.2, z + 2.5, b.h + n * 2.6, 'b');
  }
  for (let k = 0; k < 14; k++) { const x = lerp(b.x0 + 10, b.x1 - 10, rng()), z = lerp(b.z1 - 30, b.z1 - 8, rng()); milD(W, x - 0.7, z - 0.7, x + 0.7, z + 0.7, b.h, b.h + 1.4, '#7a5a3a'); }
};
// ---------- open areas ----------
FLAT_FILL.airfield = (W, f, rng) => {   // runway, taxiway, apron, hardened shelters with jets, control tower
  const rz0 = f.z0 + 18, rz1 = rz0 + 36, tz0 = rz1 + 14, tz1 = tz0 + 14, ax0 = 60, ax1 = 470, az0 = tz1, az1 = -300;
  const pave = [[f.x0 + 20, rz0, f.x1 - 20, rz1, 0.013], [f.x0 + 90, tz0, f.x1 - 90, tz1, 0.012], [f.x0 + 90, rz1, f.x0 + 104, tz0, 0.012], [f.x1 - 104, rz1, f.x1 - 90, tz0, 0.012], [ax0, az0, ax1, az1, 0.011], [255, az1, 275, -286, 0.011]];
  W.custom.push(L => { for (const p of pave) L.lot.push(quadF(p[0], p[1], p[2], p[3], p[4], tile(8))); });
  const cz = (rz0 + rz1) / 2;
  for (let x = f.x0 + 60; x < f.x1 - 80; x += 50) W.marks.push([x, cz - 0.45, x + 30, cz + 0.45, 0.02]);
  W.marks.push([f.x0 + 22, rz0 + 1, f.x1 - 22, rz0 + 1.5, 0.02], [f.x0 + 22, rz1 - 1.5, f.x1 - 22, rz1 - 1, 0.02]);
  for (const [x0, s] of [[f.x0 + 24, 1], [f.x1 - 24, -1]]) for (let k = 0; k < 8; k++) { const z = rz0 + 3 + k * 4; W.marks.push([Math.min(x0, x0 + s * 22), z, Math.max(x0, x0 + s * 22), z + 2, 0.02]); }
  for (let x = f.x0 + 30; x < f.x1 - 20; x += 30) for (const z of [rz0 - 0.8, rz1 + 0.8]) milD(W, x - 0.18, z - 0.18, x + 0.18, z + 0.18, 0, 0.35, '#fff1b8');
  milD(W, f.x0 + 90, (tz0 + tz1) / 2 - 0.3, f.x1 - 90, (tz0 + tz1) / 2 + 0.3, 0.012, 0.032, '#e8c547');
  // hardened aircraft shelters along the apron, each with a jet
  W.custom.push(L => {
    for (const sx of [100, 190, 340, 430]) {
      const R = 11, len = 30, z0 = az1 - 4, arch = new THREE.CylinderGeometry(R, R, len, 18, 1, true, -Math.PI / 2, Math.PI); arch.rotateX(-Math.PI / 2); arch.translate(sx, 0, z0 - len / 2 + len); L.roof.push(colorize(arch, C('#9d978a')));
      const back = new THREE.CircleGeometry(R, 18, 0, Math.PI); back.translate(sx, 0, z0); L.roof.push(colorize(back, C('#8d877b')));
    }
  });
  for (const sx of [100, 190, 340, 430]) {
    const z0 = az1 - 4; W.addBox(sx - 11.2, z0 - 30, sx - 10.2, z0, 7, 'b'); W.addBox(sx + 10.2, z0 - 30, sx + 11.2, z0, 7, 'b'); W.addBox(sx - 11, z0 - 1, sx + 11, z0 + 0.5, 10, 'b');
    if (sx !== 190) W.milSpots.push({ type: 'stinger', x: sx, z: z0 - 18, yaw: Math.PI, col: MILC.camo, trim: '#4a4a3a' });
  }
  // control tower and a crew building
  const tx = 20, tz = -330; milBld(W, tx - 5, tz - 5, tx + 5, tz + 5, 0, 22, '#cfc6b2', 'house');
  milD(W, tx - 7, tz - 7, tx + 7, tz + 7, 22, 26, '#25425a'); milD(W, tx - 7.5, tz - 7.5, tx + 7.5, tz + 7.5, 26, 26.6, '#e2e5e9'); milD(W, tx - 0.2, tz - 0.2, tx + 0.2, tz + 0.2, 26.6, 31, '#3a3d42');
  milBld(W, -110, -350, -60, -320, 0, 6.5, '#d8cfbd', 'house');
  W.miniRects.push({ x0: f.x0 + 20, z0: rz0, x1: f.x1 - 20, z1: rz1 });
};
FLAT_FILL.range = (W, f, rng) => {   // firing range: berms, target frames, firing points, bunkers
  for (let k = 0; k < 5; k++) {
    const x0 = f.x0 + 40 + k * 160, z0 = f.z1 - 30;
    for (let s = 0; s < 3; s++) milD(W, x0 + s * 3, z0 + s * 1.5, x0 + 120 - s * 3, z0 + 14 - s * 1.5, s * 2, (s + 1) * 2, ['#b0936a', '#a88b62', '#c2a477'][s]);
    W.addBox(x0, z0, x0 + 120, z0 + 14, 6, 'b');
    for (let t = 0; t < 6; t++) { const x = x0 + 12 + t * 19, z = z0 - 30; milD(W, x - 0.08, z - 0.08, x + 0.08, z + 0.08, 0, 2.2, '#5a4632'); milD(W, x - 0.7, z - 0.04, x + 0.7, z + 0.04, 1.0, 2.6, '#f2f2ee'); milD(W, x - 0.3, z - 0.06, x + 0.3, z + 0.06, 1.5, 2.1, '#c8352b'); }
    for (let t = 0; t < 6; t++) { const x = x0 + 12 + t * 19, z = f.z0 + 26; milD(W, x - 1.5, z - 1, x + 1.5, z + 1, 0, 0.6, '#9a7b55'); }
  }
  for (const [x, z] of [[f.x0 + 120, f.z0 + 60], [f.x0 + 460, f.z0 + 60], [f.x0 + 760, f.z0 + 60]]) {
    milBld(W, x - 8, z - 5, x + 8, z + 5, 0, 3.2, '#9d978a', 'house'); milD(W, x - 8.5, z - 5.5, x + 8.5, z + 5.5, 3.2, 3.8, '#8d877b'); milD(W, x - 6, z + 4.95, x + 6, z + 5.05, 1.6, 2.2, '#1b1c1f');
  }
  for (let k = 0; k < 10; k++) { const x = lerp(f.x0 + 20, f.x1 - 20, rng()), z = lerp(f.z0 + 90, f.z1 - 60, rng()); if (rng() < 0.6) addTree(W, 'cactus', x, z, 0.8 + rng() * 0.5); }
};
FLAT_FILL.fuelfarm = (W, f, rng) => {   // big fuel tanks, a water tower and a spinning radar
  const tanks = [[600, -220], [650, -220], [600, -160], [650, -160]];
  W.custom.push(L => {
    for (const [x, z] of tanks) { const t = new THREE.CylinderGeometry(15, 15, 12, 28); t.translate(x, 6, z); L.roof.push(colorize(t, C('#eef0f2'))); const band = new THREE.CylinderGeometry(15.08, 15.08, 1.2, 28); band.translate(x, 8.5, z); L.roof.push(colorize(band, C('#c8352b'))); const top = new THREE.ConeGeometry(15.1, 2, 28); top.translate(x, 13, z); L.roof.push(colorize(top, C('#d9dce0'))); }
    const wt = new THREE.CylinderGeometry(6, 6, 7, 20); wt.translate(625, 26, 120); L.roof.push(colorize(wt, C('#c9c2ad'))); const wr = new THREE.ConeGeometry(6.4, 3, 20); wr.translate(625, 31, 120); L.roof.push(colorize(wr, C('#8a3b2e')));
  });
  for (const [x, z] of tanks) W.addBox(x - 10.6, z - 10.6, x + 10.6, z + 10.6, 14, 'b');
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { milD(W, 625 + dx - 0.3, 120 + dz - 0.3, 625 + dx + 0.3, 120 + dz + 0.3, 0, 22.5, '#6d7278'); W.addBox(625 + dx - 0.4, 120 + dz - 0.4, 625 + dx + 0.4, 120 + dz + 0.4, 22.5, 'p'); }
  milD(W, 619, 40, 631, 52, 0, 8, '#a7a194'); W.addBox(619, 40, 631, 52, 8, 'b');
  W.post.push(root => {
    const g = new THREE.Group(), M2 = new THREE.MeshStandardMaterial({ color: C('#e6e8ea'), roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(6, 18, 8, 0, TAU, 0, 0.9), M2); dish.rotation.x = -1.2; dish.position.set(0, 3, 0.6); g.add(dish);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3, 8), M2); arm.position.y = 1.5; g.add(arm);
    g.position.set(625, 8, 46); dish.castShadow = true; root.add(g); W.radar = g;
  });
};
FLAT_FILL.entry = (W, f, rng) => {   // visitor car park and a welcome lawn inside the gate
  for (let row = 0; row < 3; row++) { const z = -150 + row * 18; for (let x = f.x0 + 14; x < f.x1 - 10; x += 3.4) { W.marks.push([x - 1.76, z - 2.6, x - 1.64, z + 2.6, 0.02]); if (rng() < 0.25) W.parked.push({ x: x + 1.7, z, h: row % 2 ? 0 : Math.PI }); } }
  W.custom.push(L => L.lot.push(quadF(f.x0 + 10, -158, f.x1 - 6, -98, 0.011, tile(8))));
  for (let k = 0; k < 6; k++) addTree(W, 'palm', f.x0 + 14 + k * 11, 60, 0.9 + rng() * 0.3);
  milBld(W, f.x0 + 20, 120, f.x1 - 14, 150, 0, 6.5, '#d8cfbd', 'house');
};
FLAT_FILL.scrub = (W, f, rng) => {   // open desert: cacti and boulders, sparser than Sandport's
  const n = Math.round((f.x1 - f.x0) * (f.z1 - f.z0) / 2400);
  for (let k = 0; k < n; k++) {
    const x = lerp(f.x0 + 6, f.x1 - 6, rng()), z = lerp(f.z0 + 6, f.z1 - 6, rng());
    if (Math.abs(z - 10) < 14 && x > -270 && x < -150) continue;
    if (rng() < 0.65) addTree(W, 'cactus', x, z, 0.8 + rng() * 0.6);
    else { const s = 1 + rng() * 2.5; W.trees.push({ type: 'rock', x, z, s, r: rng() < 0.5 ? 0 : Math.PI }); W.addBox(x - s * 0.8, z - s * 0.65, x + s * 0.8, z + s * 0.65, s * 0.85, 'rock'); }
  }
};
function milCarCfg(rng) { return { body: 'ranger', paint: (rng ? rng() : Math.random()) < 0.7 ? MILC.olive : MILC.sand, finish: 'matte', rim: 'classic', rimColor: '#2a2c30', stripes: false, spoiler: 'none', neon: 'off', tint: 1 }; }
// ---------- life on the base ----------
const BASEST = { inside: false, alerted: new Set() };
function inBase(x, z) { const F = BASE_FENCE; return x > F.x0 && x < F.x1 && z > F.z0 && z < F.z1; }
function updateBase(dt) {
  if (!W || W.id !== 'base') return;
  if (W.radar) W.radar.rotation.y += dt * 0.9;
  const P = PF(); if (!P) return;
  const ins = inBase(P.x, P.z) && P.x > -60;
  if (ins && !BASEST.inside) feed('Restricted area: you are inside Fort Redrock', 'red');
  BASEST.inside = ins;
}
// stealing military aircraft puts the base on alert
function baseAircraftTaken(pl) {
  if (!W || W.id !== 'base' || (!['hornet', 'mule', 'stinger'].includes(pl.type) && !pl.tank) || BASEST.alerted.has(pl)) return;
  BASEST.alerted.add(pl); addHeat(1.6, 2, true); feed(pl.tank ? 'The base is on alert: somebody stole a tank!' : 'The base is on alert: a military aircraft has been stolen!', 'red');
  if (pl.tank) mbanner('Tank stolen!', APP.touch ? 'HORN fires the cannon · look around to aim the turret' : 'Q or click fires the cannon · aim the turret with the camera (right-drag)', 'passed', 4);
}
