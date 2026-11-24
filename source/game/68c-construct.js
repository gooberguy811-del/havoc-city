// =====================================================================
//  CONSTRUCTION SITE: dirt ramps for tricks, and a Rube Goldberg chain
//  reaction: ram the pipe stack -> pipes roll into the fuel tanks ->
//  boom -> the crane topples onto the half-built tower -> it comes down
// =====================================================================
const CONSTRUCT_SITES = {
  neon: { b: [78, 150, 138, 210], face: 'z1' },
  perth: { b: [166, -144, 224, -96], face: 'z0' },
  nyc: { b: [121, 162, 194, 202], face: 'x0' }
};
const CON = { site: null, state: 'ready', t: 0, runs: 0, crane: null, pipes: [], tanks: null, resetT: 0 };
function constructGiver(id) {
  const S = CONSTRUCT_SITES[id]; if (!S) return null; const [x0, z0, x1, z1] = S.b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  return S.face === 'z1' ? [cx - 9, z1 - 1.6] : S.face === 'z0' ? [cx - 9, z0 + 1.6] : S.face === 'x0' ? [x0 + 1.6, cz - 9] : [x1 - 1.6, cz - 9];
}
function markConstructBlock(W, id) {
  const S = CONSTRUCT_SITES[id]; if (!S) return;
  const cx = (S.b[0] + S.b[2]) / 2, cz = (S.b[1] + S.b[3]) / 2;
  const b = W.blocks.find(q => cx > q.x0 && cx < q.x1 && cz > q.z0 && cz < q.z1);
  if (b && b.type === 'city') { b.type = 'construct'; b.face = S.face; }
}
function constructBlock(W, b, rng) {
  b.top = 'dirt';
  const F = gsFrame(b, b.face || 'z0'), h = b.h, Wd = F.W, Dp = F.D, hw = Wd / 2;
  const D = (u0, v0, u1, v1, y0, y1, col) => W.details.push(gsBox(F, u0, v0, u1, v1, h + y0, h + y1, col));
  const Bx = (u0, v0, u1, v1, top, kind) => { const r = gsRect(F, u0, v0, u1, v1); return W.addBox(r.x0, r.z0, r.x1, r.z1, h + top, kind); };
  const P = (u, v) => gsPt(F, u, v);
  // chain-link fence with a gate in the front
  const FEN = '#9aa0a6', fi = 1.6;
  const fence = (u0, v0, u1, v1) => { D(u0, v0, u1, v1, 0, 2.1, FEN); Bx(u0, v0, u1, v1, 2.1, 'c'); };
  fence(-hw + fi, 2, -5, 2.1); fence(5, 2, hw - fi, 2.1); fence(-hw + fi, Dp - fi - 0.1, hw - fi, Dp - fi); fence(-hw + fi, 2, -hw + fi + 0.1, Dp - fi); fence(hw - fi - 0.1, 2, hw - fi, Dp - fi);
  for (const u of [-5, 5]) D(u - 0.15, 1.9, u + 0.15, 2.2, 0, 2.6, '#f5b700');
  // stunt ramps: a jump over a dirt pit, and a couple of kickers
  const R = (u, v, du, dv, len, w, ht) => { const [x, z] = P(u, v), dx = du * F.ux + dv * F.vx, dz = du * F.uz + dv * F.vz; const r = { x, z, dx, dz, len, w, h: ht, base: h, sx: x - dx * len / 2, sz: z - dz * len / 2 }; const ex = Math.abs(dx) * len / 2 + Math.abs(dz) * w / 2, ez = Math.abs(dz) * len / 2 + Math.abs(dx) * w / 2; r.bx0 = x - ex; r.bx1 = x + ex; r.bz0 = z - ez; r.bz1 = z + ez; W.ramps.push(r); };
  const lane = -hw + 8.5;
  R(lane, 11, 0, 1, 10, 6, 2.6);
  const rampAt = P(lane, 3.5);
  D(lane - 3.5, 19, lane + 3.5, 25, -0.05, 0.02, '#5a4632');            // the pit
  R(lane, Dp - 14, 0, -1, 9, 6, 2.2);
  R(0, Dp * 0.68, 1, 0, 7, 4.5, 1.3);
  // the half-built tower: concrete core, slabs and steel sticking out of the top
  const tu0 = hw - 17, tu1 = hw - 4.5, tv0 = Dp - 17, tv1 = Dp - 4.5, th = Math.min(28, 18 + Dp * 0.15);
  const tr = gsRect(F, tu0, tv0, tu1, tv1);
  W.bldgs.push({ x0: tr.x0, z0: tr.z0, x1: tr.x1, z1: tr.z1, y: h, h: th, col: '#a2a4a7', tex: 'house' });
  const towerBox = W.addBox(tr.x0, tr.z0, tr.x1, tr.z1, h + th, 'b');
  for (let k = 0; k < 6; k++) { const u = lerp(tu0 + 0.3, tu1 - 0.3, k / 5); for (const v of [tv0 + 0.3, tv1 - 0.3]) D(u - 0.18, v - 0.18, u + 0.18, v + 0.18, th, th + 3 + (k % 2) * 2, '#7b3f2a'); }
  for (let k = 1; k < 5; k++) D(tu0 - 0.3, tv0 - 0.3, tu1 + 0.3, tv1 + 0.3, k * th / 5 - 0.25, k * th / 5, '#c7c9cc');
  // crane base, fuel tanks, the pipe stack (runtime meshes sit on these colliders)
  const cU = tu0 - 7, cV = tv0 - 6, [cx, cz] = P(cU, cV), [tx, tz] = P((tu0 + tu1) / 2, (tv0 + tv1) / 2);
  const mastBox = Bx(cU - 1, cV - 1, cU + 1, cV + 1, 34, 'c');
  const kU = hw - 9, kV = Dp * 0.42, [kx, kz] = P(kU, kV), tankBox = Bx(kU - 2.6, kV - 1.4, kU + 2.6, kV + 1.4, 2.8, 'c');
  const pU = -2, pV = Dp * 0.42, [px, pz] = P(pU, pV), pipeBox = Bx(pU - 1.6, pV - 3.2, pU + 1.6, pV + 3.2, 1.6, 'c');
  D(kU - 3.2, kV - 2, kU + 3.2, kV + 2, 0, 0.12, '#6b6f75');
  // site office, portable toilets, cement mixer, rebar
  D(-hw + 3, Dp - 8, -hw + 9, Dp - 4.5, 0, 2.7, '#2f6fd9'); Bx(-hw + 3, Dp - 8, -hw + 9, Dp - 4.5, 2.7, 'b');
  for (let k = 0; k < 2; k++) { D(-hw + 10 + k * 1.6, Dp - 5.5, -hw + 11.3 + k * 1.6, Dp - 4.2, 0, 2.3, '#1f8a4c'); Bx(-hw + 10 + k * 1.6, Dp - 5.5, -hw + 11.3 + k * 1.6, Dp - 4.2, 2.3, 'c'); }
  D(6, 6, 8.4, 8.4, 0, 1.6, '#e4572e'); D(6.4, 6.4, 8, 8, 1.6, 2.6, '#c9ccd2'); Bx(6, 6, 8.4, 8.4, 2.6, 'c');
  for (let k = 0; k < 6; k++) D(9.5, 10 + k * 0.25, 15.5, 10.1 + k * 0.25, 0.1, 0.2, '#7b3f2a');
  for (let k = 0; k < 8; k++) { const [x, z] = P(-4 + k * 1.2, 4.2); W.props.push({ type: 'cone', x, z, ry: 0 }); }
  W.construct = { ramp: rampAt, cx, cz, tx, tz, kx, kz, px, pz, towerBox, mastBox, tankBox, pipeBox, roll: { x: kx - px, z: kz - pz }, axis: gsYaw(F, 0, 1), th };
}

// ---------- runtime ----------
function initConstruct() {
  for (const o of [CON.crane && CON.crane.root, CON.tanks, ...CON.pipes.map(p => p.m)]) if (o && o.parent) o.parent.remove(o);
  CON.site = W.construct || null; CON.state = 'ready'; CON.t = 0; CON.pipes = []; CON.crane = null; CON.tanks = null;
  const S = CON.site; if (!S) return;
  S.pipeBox.trig = v => { if (v === G.player) conTrigger('hero'); };
  const yel = new THREE.MeshStandardMaterial({ color: C('#f5b700'), roughness: 0.55, metalness: 0.2 }), dark = new THREE.MeshStandardMaterial({ color: C('#3a3d42'), roughness: 0.7 }), conc = new THREE.MeshStandardMaterial({ color: C('#8e9196'), roughness: 0.9 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
  root.position.set(S.cx, heightAt(S.cx, S.cz), S.cz); root.rotation.y = Math.atan2(S.tx - S.cx, S.tz - S.cz);
  tilt.add(box(1.8, 34, 1.8, yel, 0, 17, 0));
  for (let k = 0; k < 11; k++) { const b = box(1.9, 0.18, 1.9, dark, 0, 1.5 + k * 3, 0); b.castShadow = false; tilt.add(b); }
  tilt.add(box(1.2, 1.2, 28, yel, 0, 34.6, 9), box(1.2, 1.2, 10, yel, 0, 34.6, -5), box(2.6, 2.6, 3, conc, 0, 33.6, -9), box(2.2, 2.2, 2.2, dark, 0, 33, 1.6), box(0.4, 3.2, 0.4, yel, 0, 36.6, 0));
  const cable = box(0.08, 12, 0.08, dark, 0, 28.6, 18); cable.castShadow = false; tilt.add(cable, box(0.7, 0.5, 6, dark, 0, 22.4, 18));
  scene.add(root); CON.crane = { root, tilt, ang: 0 };
  const tanks = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: C('#c8352b'), roughness: 0.4, metalness: 0.3 });
  for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.6, 18), red); c.position.set((k - 1) * 1.7, 1.3, 0); c.castShadow = true; tanks.add(c); const lbl = box(0.9, 0.5, 0.05, new THREE.MeshStandardMaterial({ color: C('#f5b700') }), (k - 1) * 1.7, 1.5, 0.76); tanks.add(lbl); }
  tanks.position.set(S.kx, heightAt(S.kx, S.kz), S.kz); tanks.rotation.y = S.axis; scene.add(tanks); CON.tanks = tanks;
  const steel = new THREE.MeshStandardMaterial({ color: C('#8a9aa8'), roughness: 0.35, metalness: 0.8 });
  const pg = new THREE.CylinderGeometry(0.32, 0.32, 6, 14); pg.rotateX(Math.PI / 2);
  const stack = [[-0.66, 0.32], [0, 0.32], [0.66, 0.32], [-0.33, 0.9], [0.33, 0.9], [0, 1.45]];
  for (const [o, y] of stack) {
    const m = new THREE.Mesh(pg, steel); m.castShadow = true; scene.add(m);
    const p = { m, o, y, x0: S.px, z0: S.pz }; CON.pipes.push(p); placePipe(p, 0);
  }
}
function placePipe(p, k) {
  const S = CON.site, L = Math.hypot(S.roll.x, S.roll.z) || 1, ux = S.roll.x / L, uz = S.roll.z / L;
  const d = p.o + k * (L - 2.2 - p.o * 0.3), yb = heightAt(S.px, S.pz);
  p.m.position.set(S.px + ux * d, yb + (k > 0 ? 0.32 + Math.max(0, p.y - 0.32) * Math.max(0, 1 - k * 4) : p.y), S.pz + uz * d);
  p.m.rotation.set(0, S.axis, 0); p.m.rotateX(0); p.m.rotateZ(-k * L / 0.32);
}
function conTrigger(src) {
  if (CON.state !== 'ready' || !CON.site) return;
  CON.state = 'run'; CON.t = 0; CON.runs++; CON.by = src;
  const S = CON.site; W.boxGrid.remove(S.pipeBox, S.pipeBox.x0, S.pipeBox.z0, S.pipeBox.x1, S.pipeBox.z1);
  SFX.clank(1); feed('The pipes are rolling…', 'blue');
}
function updateConstruct(dt) {
  const S = CON.site; if (!S || !CON.crane) return;
  const F = PF();
  if (CON.state === 'ready') {
    // ram the stack (or blow it up) to start the chain
    const v = G.player, pb = S.pipeBox;
    if (v && v.speed > 6 && v.x > pb.x0 - 3.2 && v.x < pb.x1 + 3.2 && v.z > pb.z0 - 3.2 && v.z < pb.z1 + 3.2) conTrigger('hero');
    return;
  }
  if (CON.state === 'run') {
    CON.t += dt; const t = CON.t, tower = S.towerBox.struct;
    for (const p of CON.pipes) placePipe(p, clamp((t - p.o * 0.15) / 2.6, 0, 1));
    if (t > 2.4 && !CON.spark) { CON.spark = true; sparks(S.kx, heightAt(S.kx, S.kz) + 1, S.kz, 16); SFX.clank(1.2); }
    if (t > 2.9 && !CON.boom) {
      CON.boom = true; CON.tanks.visible = false; W.boxGrid.remove(S.tankBox, S.tankBox.x0, S.tankBox.z0, S.tankBox.x1, S.tankBox.z1);
      explode(S.kx, heightAt(S.kx, S.kz) + 1.2, S.kz, 2.6, CON.by, null, false);
      for (let k = 0; k < 4; k++) addFire(S.kx + rand(-3, 3), S.kz + rand(-3, 3), rand(1.4, 2.4), rand(20, 35));
    }
    if (t > 3.4) {
      if (!CON.fall) { CON.fall = true; W.boxGrid.remove(S.mastBox, S.mastBox.x0, S.mastBox.z0, S.mastBox.x1, S.mastBox.z1); S.mastBox.h = -9; SFX.metal(1); feed('The crane is going over!', 'red'); }
      const k = clamp((t - 3.4) / 3.0, 0, 1), ang = k * k * (Math.PI / 2 - 0.06);
      CON.crane.tilt.rotation.x = ang;
      if (ang > 0.42 && tower && !tower.state) { tower.byPlayer = isPlayerSrc(CON.by); collapseStruct(tower, S.cx, S.cz); explode(lerp(S.cx, S.tx, 0.8), heightAt(S.tx, S.tz) + S.th, lerp(S.cz, S.tz, 0.8), 1.2, CON.by, null, false); }
      if (k >= 1 && !CON.landed) { CON.landed = true; G.shake = Math.max(G.shake, 0.9); SFX.crash(20); const fx = Math.sin(CON.crane.root.rotation.y), fz = Math.cos(CON.crane.root.rotation.y); for (let j = 0; j < 30; j++) { const d = rand(4, 40); FX.smoke.emit(S.cx + fx * d, heightAt(S.cx, S.cz) + 1, S.cz + fz * d, rand(-3, 3), rand(1, 3), rand(-3, 3), rand(3, 6), rand(2.5, 4.5), COL.dust, 0.6, -0.15, 0.8, 1.4, 4); } }
    }
    if (t > 9) { CON.state = 'done'; CON.resetT = GT; feed('What a chain reaction!', 'green'); if (isPlayerSrc(CON.by)) addHeat(1, 2, true); }
    return;
  }
  // done: put the site back together a few minutes later, while nobody is watching
  if (CON.state === 'done' && GT - CON.resetT > 180 && F && Math.hypot(F.x - S.cx, F.z - S.cz) > 160) {
    const tower = S.towerBox.struct; if (tower) restoreStruct(tower);
    for (const b of [S.pipeBox, S.tankBox, S.mastBox]) { if (b === S.mastBox) b.h = heightAt(S.cx, S.cz) + 34; W.boxGrid.remove(b, b.x0, b.z0, b.x1, b.z1); W.boxGrid.insert(b, b.x0, b.z0, b.x1, b.z1); }
    CON.crane.tilt.rotation.x = 0; CON.tanks.visible = true; for (const p of CON.pipes) placePipe(p, 0);
    CON.state = 'ready'; CON.spark = CON.boom = CON.fall = CON.landed = false; rebuildMiniBldgs();
  }
}
// an explosion next to the pipes starts it too
function conBlast(x, z, power) { const S = CON.site; if (S && CON.state === 'ready' && Math.hypot(x - S.px, z - S.pz) < 4 + power * 3) conTrigger('hero'); }
