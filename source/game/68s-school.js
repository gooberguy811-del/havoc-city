// =====================================================================
//  SCHOOLS: a school on every map (brick building, fenced playground,
//  school buses). The kids are scenery only: they live in their own
//  little system, outside the pedestrian list, so nothing in the game
//  can touch, hit or carry them, and they go indoors the moment there's
//  any trouble nearby. Weapons can't be used on school grounds.
// =====================================================================
// [x, z, face]: a point inside the block to turn into a school, and the street it faces
const SCHOOL_SITES = { neon: [-180, 180, 'z0'], sand: [180, -135, 'z1'], perth: [-280, -350, 'z1'], nyc: [157.5, -78, 'z0'], base: [-305, 145, 'z0'] };
const SCHOOL_NAMES = { neon: 'NEON HEIGHTS PRIMARY SCHOOL', sand: 'SANDPORT PRIMARY SCHOOL', perth: 'PERTH NORTH PRIMARY SCHOOL', nyc: 'P.S. 42 ELEMENTARY', base: 'DUST CREEK ELEMENTARY' };
function markSchoolBlocks(W, id) {
  const s = SCHOOL_SITES[id]; if (!s) return;
  const b = W.blocks.find(q => s[0] > q.x0 && s[0] < q.x1 && s[1] > q.z0 && s[1] < q.z1);
  if (b && !['gas', 'bank', 'store1', 'mech', 'dealer', 'construct', 'park', 'parkS'].includes(b.type)) { b.type = 'school'; b.face = s[2]; }
}
BLOCK_FILL.school = (W, b, rng) => {
  b.top = 'grass';
  const F = gsFrame(b, b.face), hw = F.W / 2, D = F.D, h = b.h, Dt = (a0, b0, a1, b1, y0, y1, col) => W.details.push(gsBox(F, a0, b0, a1, b1, h + y0, h + y1, col));
  const BX = (a0, b0, a1, b1, top, kind) => { const r = gsRect(F, a0, b0, a1, b1); return W.addBox(r.x0, r.z0, r.x1, r.z1, h + top, kind); };
  const bw = Math.min(hw * 0.76, 30), y0v = 5, y1v = Math.min(19, D * 0.42), yard0 = y1v + 2.5, yard1 = D - 3;
  // the school building, a covered entrance and a flagpole
  { const r = gsRect(F, -bw, y0v, bw, y1v); W.bldgs.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y: h, h: 8.4, col: '#d8c6ae', tex: 'brick', keepTex: true }); W.addBox(r.x0, r.z0, r.x1, r.z1, h + 8.4, 'b'); }
  Dt(-bw - 0.3, y0v - 0.3, bw + 0.3, y1v + 0.3, 8.4, 8.9, '#8a3b2e');
  Dt(-4.5, 2.4, 4.5, y0v, 3.2, 3.5, '#e9e2d2'); for (const u of [-4.2, 4.2]) { Dt(u - 0.15, 2.5, u + 0.15, 2.8, 0, 3.2, '#efe9dd'); BX(u - 0.15, 2.5, u + 0.15, 2.8, 3.2, 'p'); }
  Dt(bw + 1.5 - 0.08, 3.2, bw + 1.5 + 0.08, 3.36, 0, 9, '#d9dce0'); BX(bw + 1.4, 3.1, bw + 1.6, 3.4, 9, 'p'); for (let k = 0; k < 3; k++) Dt(bw + 1.6, 3.25, bw + 3.4, 3.3, 8.4 - k * 0.4, 8.8 - k * 0.4, ['#c8352b', '#f2f2ee', '#1f4fd1'][k]);
  // school zone signs on the kerb
  for (const u of [-hw + 2, hw - 2]) { Dt(u - 0.05, 1.2, u + 0.05, 1.3, 0, 2.4, '#8d949e'); Dt(u - 0.45, 1.18, u + 0.45, 1.32, 2.0, 2.8, '#f5d000'); }
  // a bus bay beside the building with two yellow school buses
  const bu0 = -hw + 2.5;
  if (bu0 + 3 < -bw - 1) {
    W.custom.push(L => L.lot.push(quadF(...Object.values(gsRect(F, bu0 - 0.5, 3.5, Math.min(-bw - 1, bu0 + 7.5), y1v)).slice(0, 2).concat(Object.values(gsRect(F, bu0 - 0.5, 3.5, Math.min(-bw - 1, bu0 + 7.5), y1v)).slice(2)), h + 0.012, tile(8))));
    const nb = bu0 + 7 < -bw - 1 ? 2 : 1;
    for (let k = 0; k < nb; k++) { const uc = bu0 + 1.5 + k * 3.6, vc = (y0v + y1v) / 2, [x, z] = gsPt(F, uc, vc), yaw = gsYaw(F, 0, 1); W.custom.push(L => { const g = schoolBusGeo(); g.rotateY(yaw); g.translate(x, h, z); L.roof.push(g); }); BX(uc - 1.3, vc - 5.4, uc + 1.3, vc + 5.4, 3.2, 'b'); }
  }
  // the playground: tarmac with a court and hopscotch, grass with swings, a slide, a climbing frame and a sandpit
  const yu0 = -hw + 3, yu1 = hw - 3, ym = (yu0 + yu1) / 2;
  W.custom.push(L => { const r = gsRect(F, yu0, yard0, ym - 1, yard1); L.lot.push(quadF(r.x0, r.z0, r.x1, r.z1, h + 0.012, tile(8))); const p = gsRect(F, bw + 0.5, y1v, hw - 1, yard0 + 0.5); L.side.push(quadF(p.x0, p.z0, p.x1, p.z1, h + 0.014, tile(3))); });
  const cu = (yu0 + ym - 1) / 2, cv = (yard0 + yard1) / 2, cl = Math.min(13, (yard1 - yard0) / 2 - 1.5);
  for (const s of [-1, 1]) { Dt(cu - 0.08, cv + s * cl - 0.08, cu + 0.08, cv + s * cl + 0.08, 0, 3.0, '#3a3d42'); Dt(cu - 0.8, cv + s * (cl - 0.15) - 0.03, cu + 0.8, cv + s * (cl - 0.15) + 0.03, 2.6, 3.6, '#f2f2ee'); BX(cu - 0.12, cv + s * cl - 0.12, cu + 0.12, cv + s * cl + 0.12, 3, 'p'); }
  { const r = gsRect(F, cu - 0.05, cv - cl + 1, cu + 0.05, cv + cl - 1); W.marks.push([r.x0, r.z0, r.x1, r.z1, h + 0.02]); }
  for (let k = 0; k < 6; k++) { const r = gsRect(F, yu0 + 1.5 + (k % 2) * 0.7, yard0 + 2 + k * 0.8, yu0 + 2.1 + (k % 2) * 0.7, yard0 + 2.6 + k * 0.8); W.marks.push([r.x0, r.z0, r.x1, r.z1, h + 0.02]); }
  const gu = ym + 1, eq = [];
  if (yu1 - gu > 10 && yard1 - yard0 > 10) {
    const su = gu + 3, sv = yard0 + 4;   // swings
    for (const s of [0, 2.4]) { Dt(su + s - 0.06, sv - 1.2, su + s + 0.06, sv - 1.08, 0, 2.4, '#1f6fd6'); Dt(su + s - 0.06, sv + 1.08, su + s + 0.06, sv + 1.2, 0, 2.4, '#1f6fd6'); }
    Dt(su - 0.1, sv - 0.06, su + 2.5, sv + 0.06, 2.35, 2.5, '#1f6fd6'); for (const s of [0.8, 1.6]) { Dt(su + s - 0.02, sv - 0.02, su + s + 0.02, sv + 0.02, 0.5, 2.35, '#8d949e'); Dt(su + s - 0.25, sv - 0.12, su + s + 0.25, sv + 0.12, 0.45, 0.52, '#c8352b'); }
    BX(su - 0.1, sv - 1.2, su + 2.5, sv + 1.2, 2.5, 'c'); eq.push([su - 1, sv - 2, su + 3.5, sv + 2]);
    const lu = gu + 4, lv = yard1 - 6;   // slide
    Dt(lu - 0.6, lv - 0.6, lu + 0.6, lv + 0.6, 1.8, 1.95, '#f5b700'); for (const [a, c] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) Dt(lu + a - 0.05, lv + c - 0.05, lu + a + 0.05, lv + c + 0.05, 0, 1.8, '#c8352b');
    for (let k = 0; k < 5; k++) Dt(lu - 0.5, lv - 0.7 - k * 0.25, lu + 0.5, lv - 0.62 - k * 0.25, 1.8 - (k + 1) * 0.34, 1.86 - (k + 1) * 0.34, '#f5b700');
    BX(lu - 0.6, lv - 2.2, lu + 0.6, lv + 0.6, 1.95, 'c'); eq.push([lu - 1.2, lv - 3, lu + 1.2, lv + 1.2]);
    if (yu1 - gu > 16) {   // climbing frame and sandpit
      const fu = yu1 - 5, fv = yard0 + 5;
      for (const a of [-1.2, 0, 1.2]) for (const c of [-1.2, 0, 1.2]) Dt(fu + a - 0.04, fv + c - 0.04, fu + a + 0.04, fv + c + 0.04, 0, 2.2, '#1e8a4c');
      for (const y of [0.8, 1.5, 2.2]) { Dt(fu - 1.25, fv - 1.25, fu + 1.25, fv - 1.15, y, y + 0.06, '#1e8a4c'); Dt(fu - 1.25, fv + 1.15, fu + 1.25, fv + 1.25, y, y + 0.06, '#1e8a4c'); }
      BX(fu - 1.3, fv - 1.3, fu + 1.3, fv + 1.3, 2.2, 'c'); eq.push([fu - 2, fv - 2, fu + 2, fv + 2]);
      Dt(fu - 2, yard1 - 6, fu + 2, yard1 - 2.5, 0, 0.25, '#d8c08a'); Dt(fu - 2.1, yard1 - 6.1, fu + 2.1, yard1 - 2.4, 0, 0.3, '#8a6b4a');
    }
    for (let k = 0; k < 3; k++) { const bu = gu + 2 + k * 4, bv = yard1 - 1.2; Dt(bu - 1, bv - 0.25, bu + 1, bv + 0.25, 0.35, 0.45, '#6b5a45'); }
  }
  for (const [u, v] of [[yu1 - 1.5, yard1 - 1.5], [yu0 + 1.5, yard1 - 1.5]]) { const [x, z] = gsPt(F, u, v); addTree(W, W.id === 'neon' || W.id === 'nyc' || W.id === 'perth' ? 'oak' : 'palm', x, z, 0.75); }
  // the playground fence, with a pedestrian gate by the side path (cars can't get in)
  const gate = [bw + 2.2, bw + 4]; const fh = 2.2, fruns = [];
  fruns.push(['u', yard0, yu0 - 0.5, gate[0]], ['u', yard0, gate[1], yu1 + 0.5], ['u', yard1 + 0.5, yu0 - 0.5, yu1 + 0.5], ['v', yu0 - 0.5, yard0, yard1 + 0.5], ['v', yu1 + 0.5, yard0, yard1 + 0.5]);
  for (const [ax, c, a, bb] of fruns) { if (bb - a < 0.2) continue; const r = ax === 'u' ? gsRect(F, a, c - 0.1, bb, c + 0.1) : gsRect(F, c - 0.1, a, c + 0.1, bb); W.addBox(r.x0, r.z0, r.x1, r.z1, h + fh, 'rail'); for (let t = a; t <= bb; t += 2.5) { const [x, z] = ax === 'u' ? gsPt(F, t, c) : gsPt(F, c, t); W.details.push([0.08, fh + 0.1, 0.08, x, h + (fh + 0.1) / 2, z, '#2f5d3a']); } }
  W.post = W.post || [];
  W.post.push(root => {
    const geos = [];
    for (const [ax, c, a, bb] of fruns) { if (bb - a < 0.2) continue; const len = bb - a, g = new THREE.PlaneGeometry(len, fh), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.5, uv.getY(i) * fh / 1.5); const mid = (a + bb) / 2, [x, z] = ax === 'u' ? gsPt(F, mid, c) : gsPt(F, c, mid); g.rotateY(ax === 'u' ? gsYaw(F, 0, 1) : gsYaw(F, 1, 0)); g.translate(x, h + fh / 2, z); geos.push(g); }
    const m = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ map: TEX.fence, color: C('#5a8a62'), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6 })); root.add(m);
    const t = canvasTex(1024, 128, (g, w, hh) => { g.fillStyle = '#1e3a5f'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#f5d000'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, hh - 12); g.fillStyle = '#ffffff'; g.font = 'bold 56px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SCHOOL_NAMES[W.id] || 'PRIMARY SCHOOL', w / 2, hh / 2 + 2); }, { repeat: false });
    const sg = new THREE.PlaneGeometry(Math.min(16, bw * 1.2), Math.min(16, bw * 1.2) / 8); sg.rotateY(gsYaw(F, 0, -1)); const [sx, sz] = gsPt(F, 0, y0v - 0.06); sg.translate(sx, h + 5.6, sz);
    root.add(new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })));
  });
  const yard = gsRect(F, yu0 + 0.6, yard0 + 0.6, yu1 - 0.6, yard1 - 0.6);
  W.schools = W.schools || []; W.schools.push({ name: SCHOOL_NAMES[W.id], block: { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 }, yard, eq: eq.map(e => gsRect(F, ...e)), cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, h });
};
function schoolBusGeo() {   // a yellow school bus, long axis along +z
  const P = [], Y = C('#f5b700'), dk = C('#1b1c1f'), gl = C('#2a3a4a');
  const body = new THREE.BoxGeometry(2.5, 2.3, 10.4); body.translate(0, 1.65, 0); P.push(colorize(body, Y));
  const hood = new THREE.BoxGeometry(2.3, 1.1, 1.3); hood.translate(0, 1.05, 5.85); P.push(colorize(hood, Y));
  for (const s of [-1, 1]) { const w = new THREE.BoxGeometry(0.04, 0.7, 8.6); w.translate(s * 1.26, 2.25, -0.4); P.push(colorize(w, gl)); const st = new THREE.BoxGeometry(0.04, 0.12, 10.4); st.translate(s * 1.26, 1.45, 0); P.push(colorize(st, dk)); }
  const ws = new THREE.BoxGeometry(2.2, 0.9, 0.04); ws.translate(0, 2.25, 5.21); P.push(colorize(ws, gl));
  for (const [x, z] of [[1.1, 4], [-1.1, 4], [1.1, -3.4], [-1.1, -3.4]]) { const t = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 14); t.rotateZ(Math.PI / 2); t.translate(x, 0.52, z); P.push(colorize(t, dk)); }
  const sign = new THREE.BoxGeometry(1.6, 0.35, 0.05); sign.translate(0, 2.95, 5.2); P.push(colorize(sign, dk));
  return mergeGeos(P);
}
function inSchoolGrounds(x, z) { for (const s of (W && W.schools) || []) if (x > s.block.x0 && x < s.block.x1 && z > s.block.z0 && z < s.block.z1) return s; return null; }
// guns are not allowed on school grounds (on foot or leaning out of a car on the kerb)
function weaponsBanned() { const P = PF(); return !!(P && inSchoolGrounds(P.x, P.z)); }
// ---------- the kids: scenery that can never be harmed ----------
const KIDS = { mesh: {}, list: [], N: 18, school: null, shown: false, alarmT: -999, lockT: -999, warnT: -999 };
function initKids() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  const counts = { head: 1, hair: 1, torso: 1, ua: 2, la: 2, ul: 2, ll: 2 };
  for (const k in counts) { const m = new THREE.InstancedMesh(roundPart(k), mat, KIDS.N * counts[k]); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; m.visible = false; for (let i = 0; i < KIDS.N * counts[k]; i++) { m.setMatrixAt(i, _zeroM); m.setColorAt(i, COL.white); } KIDS.mesh[k] = m; scene.add(m); }
  for (let i = 0; i < KIDS.N; i++) KIDS.list.push({ slot: i, meshSet: KIDS.mesh, pts: new Float32Array(45), x: 0, y: 0, z: 0, h: 0, sp: 0, phase: 0, state: 'walk', running: false, scale: 0.6, fat: 1, on: false });
}
function hideKids() {
  for (const k of KIDS.list) { k.on = false; const s = k.slot, M = KIDS.mesh; M.head.setMatrixAt(s, _zeroM); M.hair.setMatrixAt(s, _zeroM); M.torso.setMatrixAt(s, _zeroM); for (const p of ['ua', 'la', 'ul', 'll']) { M[p].setMatrixAt(s * 2, _zeroM); M[p].setMatrixAt(s * 2 + 1, _zeroM); } }
  for (const m in KIDS.mesh) { KIDS.mesh[m].instanceMatrix.needsUpdate = true; KIDS.mesh[m].visible = false; } KIDS.shown = false;
}
function schoolAlarm(x, z) { for (const s of (W && W.schools) || []) if (Math.hypot(s.cx - x, s.cz - z) < 320) KIDS.alarmT = GT; }
function kidTarget(s) {
  for (let t = 0; t < 10; t++) { const x = lerp(s.yard.x0, s.yard.x1, Math.random()), z = lerp(s.yard.z0, s.yard.z1, Math.random()); if (!s.eq.some(e => x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1)) return [x, z]; }
  return [(s.yard.x0 + s.yard.x1) / 2, (s.yard.z0 + s.yard.z1) / 2];
}
function updateKids(dt) {
  if (!KIDS.list.length) initKids();
  const P = PF(); let s = null, best = 160;
  if (P && APP.mode === 'game') for (const q of W.schools || []) { const d = Math.hypot(q.cx - P.x, q.cz - P.z); if (d < best) { best = d; s = q; } }
  if (!s) { if (KIDS.shown) hideKids(); KIDS.school = null; return; }
  // anything dangerous nearby and the kids are straight back inside
  const near = Math.hypot(s.cx - P.x, s.cz - P.z) < 320, inYard = (x, z) => x > s.yard.x0 - 1 && x < s.yard.x1 + 1 && z > s.yard.z0 - 1 && z < s.yard.z1 + 1;
  const danger = G.down || (wanted.stars > 0 && near) || GT - KIDS.alarmT < 60 || (ARMS.lastShot > 0 && GT - ARMS.lastShot < 25 && near) || (!!G.plane && near) || (!!G.player && G.player.tank && near) ||
    (HELI.active && Math.hypot(HELI.x - s.cx, HELI.z - s.cz) < 280) || VEH.list.some(v => inYard(v.x, v.z)) || NET.players.size > 0 && [...NET.players.values()].some(N => N.av && N.avKind !== 'f' && Math.hypot(N.x - s.cx, N.z - s.cz) < 200);
  if (danger) { if (KIDS.shown) { hideKids(); KIDS.lockT = GT; if (Math.hypot(s.cx - P.x, s.cz - P.z) < 140) feed('The school bell rings: the kids have gone inside', 'blue'); } KIDS.school = s; return; }
  if (KIDS.school !== s || !KIDS.shown) {   // break time: kids come out to play
    KIDS.school = s; KIDS.shown = true;
    const area = (s.yard.x1 - s.yard.x0) * (s.yard.z1 - s.yard.z0), n = clamp(Math.round(area / 40), 6, KIDS.N), SH = ['#c8352b', '#1f4fd1', '#f5b700', '#1e8a4c', '#7b2fbe', '#e85a9b', '#0fb5c9', '#ff6a13'];
    KIDS.list.forEach((k, i) => {
      if (i >= n) { k.on = false; return; }
      const [x, z] = kidTarget(s); Object.assign(k, { on: true, x, z, y: s.h, h: Math.random() * TAU, sp: 0, phase: Math.random() * TAU, wait: rand(0, 3), tx: x, tz: z, scale: rand(0.55, 0.68), running: false, state: 'walk' });
      const M = KIDS.mesh, sl = k.slot, look = { skin: C(pick(SKIN)), hair: C(pick(HAIR)), shirt: C(pick(SH)), pants: C(pick(['#2a3550', '#3d4a3a', '#5a4632', '#1f1f22', '#7a7f88'])) };
      M.head.setColorAt(sl, look.skin); M.hair.setColorAt(sl, look.hair); M.torso.setColorAt(sl, look.shirt);
      for (const j of [0, 1]) { M.ua.setColorAt(sl * 2 + j, look.shirt); M.la.setColorAt(sl * 2 + j, look.skin); M.ul.setColorAt(sl * 2 + j, look.pants); M.ll.setColorAt(sl * 2 + j, look.pants); }
    });
    for (const m in KIDS.mesh) KIDS.mesh[m].instanceColor.needsUpdate = true;
    for (const k of KIDS.list) if (!k.on) { const M = KIDS.mesh, sl = k.slot; M.head.setMatrixAt(sl, _zeroM); M.hair.setMatrixAt(sl, _zeroM); M.torso.setMatrixAt(sl, _zeroM); for (const p of ['ua', 'la', 'ul', 'll']) { M[p].setMatrixAt(sl * 2, _zeroM); M[p].setMatrixAt(sl * 2 + 1, _zeroM); } }
  }
  // wander and play: walk or run somewhere in the yard, stop, look around, go again
  for (const k of KIDS.list) {
    if (!k.on) continue;
    if (k.wait > 0) { k.wait -= dt; k.sp = lerp(k.sp, 0, damp(8, dt)); }
    else {
      const dx = k.tx - k.x, dz = k.tz - k.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { k.wait = rand(0.6, 4); const [tx, tz] = kidTarget(s); k.tx = tx; k.tz = tz; k.running = Math.random() < 0.45; k.state = k.running ? 'flee' : 'walk'; }
      else { k.h = lerpA(k.h, Math.atan2(dx, dz), damp(8, dt)); k.sp = lerp(k.sp, k.running ? 3.0 : 1.3, damp(5, dt)); const st = Math.min(d, k.sp * dt); k.x += Math.sin(k.h) * st; k.z += Math.cos(k.h) * st; }
    }
    k.x = clamp(k.x, s.yard.x0, s.yard.x1); k.z = clamp(k.z, s.yard.z0, s.yard.z1); k.y = s.h;
    k.phase += Math.abs(k.sp) * dt * TAU / (k.running ? 1.5 : 0.9);
    poseWalk(k); pedMatrices(k, k.pts, ENDS_DEF);
  }
  for (const m in KIDS.mesh) { KIDS.mesh[m].instanceMatrix.needsUpdate = true; KIDS.mesh[m].visible = !!KIDS.shown; }
  // a reminder at the gate
  const h = HERO.p; if (G.onFoot && h && inSchoolGrounds(h.x, h.z) && GT - KIDS.warnT > 20) { KIDS.warnT = GT; feed('School grounds: weapons are not allowed here', 'blue'); }
}
// ---------- The Accountant: a grown-up crook for the boss (the only kidnapping in town) ----------
function snatchDef() {
  const b = W.blocks.find(q => q.type === 'bank'), hide = HIDEOUTS[W.id]; if (!b || !hide) return null;
  const F = gsFrame(b, b.face || 'z0'), at = gsPt(F, F.W * 0.3, 1.6), road = gsPt(F, F.W * 0.3, -5), giver = gsPt(F, -F.W * 0.42, 1.6);
  return { id: 'snatch', name: 'The Accountant', reward: 2200, giver,
    blurb: 'A mob accountant has been skimming the books. The boss wants a word. Pick him up outside the bank, lose the police his bodyguards call, and drop him at the warehouse.',
    steps: [{ t: 'goto', car: true, at: road, r: 9, text: 'Drive to the bank' },
      { t: 'pickup', at: at, who: 'accountant', text: 'Grab the accountant', lost: 'The accountant was killed', got: 'The accountant is in the back seat' },
      { t: 'wanted', stars: 2 }, { t: 'evade', text: 'Lose the police' },
      { t: 'goto', car: true, at: hide, r: 8, text: 'Drop him at the warehouse' }] };
}
