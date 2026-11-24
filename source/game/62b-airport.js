// =====================================================================
//  THE AIRPORT, FLESHED OUT: a walk-in glass terminal (check-in, security,
//  gate seating, departure boards, kiosks, travellers), jet bridges with
//  airliners at the gates, ground crew vehicles, a car park, and airliners
//  making low passes over the runway
// =====================================================================
const TERM = { st: null, peds: [] };
const ATC = { m: null, t: 0, dir: 1, wait: 8 };
function airportTerminal(W, A, pt, rect, D, BOX, yaw, ap) {
  const H = 11, V0 = 16, V1 = 42, U = 100, doors = [-60, 0, 60], DW = 6;
  // floor and roof
  D(-U, V0, U, V1, 0, 0.03, '#b4ada0');
  D(-U - 1, V0 - 1, U + 1, V1 + 1, H, H + 0.7, '#d9dce0'); D(-U - 1.2, V0 - 1.2, U + 1.2, V1 + 1.2, H + 0.7, H + 1.3, '#25425a');
  for (let u = -U + 10; u < U - 6; u += 20) D(u, V0 + 4, u + 8, V1 - 4, H + 0.7, H + 1.0, '#1b2a3a');   // skylights
  // front (kerb) wall: glass between doors, a solid fascia over the top carrying the sign
  const runs = []; let a = -U; for (const d of doors) { runs.push([a, d - DW / 2]); a = d + DW / 2; } runs.push([a, U]);
  D(-U, V0, U, V0 + 0.4, 7.4, H, '#cfd4da');
  for (const [u0, u1] of runs) { BOX(u0, V0, u1, V0 + 0.4, H, 'b'); for (let u = u0; u <= u1; u += 4) D(u - 0.12, V0, u + 0.12, V0 + 0.42, 0, 7.4, '#8d949e'); }
  for (const d of doors) { D(d - DW / 2 - 0.3, V0 - 0.1, d - DW / 2, V0 + 0.5, 0, 7.4, '#5f6670'); D(d + DW / 2, V0 - 0.1, d + DW / 2 + 0.3, V0 + 0.5, 0, 7.4, '#5f6670'); D(d - DW / 2 - 0.3, V0 - 0.1, d + DW / 2 + 0.3, V0 + 0.5, 4.2, 4.6, '#5f6670'); }
  // back (airside) wall: glass with a frame, solid ends
  BOX(-U, V1 - 0.4, U, V1, H, 'b'); D(-U, V1 - 0.4, U, V1, 7.4, H, '#cfd4da'); for (let u = -U; u <= U; u += 4) D(u - 0.12, V1 - 0.42, u + 0.12, V1, 0, 7.4, '#8d949e');
  // side walls
  for (const s of [-1, 1]) { const u0 = s < 0 ? -U : U - 0.6, u1 = u0 + 0.6; D(u0, V0, u1, V1, 0, H, '#c9ccd1'); BOX(u0, V0, u1, V1, H, 'b'); }
  // check-in islands with airline colours, bag belts behind
  const AIR = ['#1f6fd6', '#c8352b', '#1e8a4c', '#f5b700'];
  [[-82, -64], [-38, -20], [20, 38], [64, 82]].forEach(([u0, u1], k) => {
    D(u0, 25, u1, 27, 0, 1.1, '#2f3542'); D(u0, 25, u1, 27, 1.1, 1.18, '#e9e6df'); BOX(u0, 25, u1, 27, 1.1, 'c');
    D(u0, 28.2, u1, 28.8, 0, 3.2, '#3a404b'); D(u0, 28.15, u1, 28.85, 2.4, 3.2, AIR[k]); D(u0 + 0.5, 27.1, u1 - 0.5, 28.1, 0, 0.5, '#1b1c1f');
    for (let u = u0 + 2; u < u1 - 1; u += 3.5) D(u - 0.25, 24.2, u + 0.25, 24.7, 0, 0.9, '#b8bcc2');   // queue posts
  });
  // security arches
  for (let u = -14; u <= 14; u += 7) { D(u - 1.2, 32.5, u - 0.9, 33, 0, 2.3, '#9aa0a6'); D(u + 0.9, 32.5, u + 1.2, 33, 0, 2.3, '#9aa0a6'); D(u - 1.2, 32.5, u + 1.2, 33, 2.3, 2.6, '#9aa0a6'); D(u + 1.4, 31.8, u + 3.6, 33.6, 0, 0.9, '#3a404b'); BOX(u + 1.4, 31.8, u + 3.6, 33.6, 0.9, 'c'); }
  // gate seating along the windows, gaps by the jet bridges
  for (let u = -94; u < 94; u += 8) { if (Math.abs(u + 50) < 5 || Math.abs(u - 30) < 5) continue; for (const v of [37.2, 39.4]) { D(u, v, u + 6, v + 0.7, 0.4, 0.5, '#2c3e66'); D(u, v + 0.55, u + 6, v + 0.7, 0.5, 1.0, '#2c3e66'); D(u + 0.2, v + 0.2, u + 0.4, v + 0.4, 0, 0.4, '#8d949e'); D(u + 5.6, v + 0.2, u + 5.8, v + 0.4, 0, 0.4, '#8d949e'); BOX(u, v, u + 6, v + 0.7, 0.6, 'bench'); } }
  // kiosks: coffee and duty free
  for (const [u0, col] of [[-96, '#6b3f22'], [86, '#7b2fbe']]) { D(u0, 30, u0 + 10, 35, 0, 1.2, '#efe9dd'); D(u0, 30, u0 + 10, 35, 2.8, 3.4, col); D(u0 + 0.2, 30.2, u0 + 0.5, 30.5, 0, 2.8, '#8d949e'); D(u0 + 9.5, 34.5, u0 + 9.8, 34.8, 0, 2.8, '#8d949e'); BOX(u0, 30, u0 + 10, 35, 1.2, 'c'); }
  // hanging signs and ceiling lights
  for (const u of [-73, -29, 29, 73]) D(u - 5, 23.8, u + 5, 24.1, 5.6, 6.4, '#1b2a3a');
  D(-0.15, 33, 0.15, 33.3, 6.4, H, '#8d949e');
  W.post.push(root => {
    const glassM = new THREE.MeshStandardMaterial({ color: C('#9fc6d8'), transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
    const gl = [];
    const pane = (u0, u1, v, y0, y1) => { const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0); g.rotateY(yaw(0, 1)); const [x, z] = pt((u0 + u1) / 2, v); g.translate(x, (y0 + y1) / 2, z); gl.push(g); };
    for (const [u0, u1] of runs) pane(u0, u1, V0 + 0.2, 0, 7.4);
    pane(-U, U, V1 - 0.2, 0, 7.4);
    const gm = new THREE.Mesh(mergeGeos(gl), glassM); gm.renderOrder = 2; root.add(gm);
    // departure boards facing the entrance
    const board = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, w, h); g.fillStyle = '#f5b700'; g.font = 'bold 22px "Courier New", monospace'; g.textBaseline = 'top';
      g.fillText('DEPARTURES', 14, 10); g.fillStyle = '#7d8794'; g.font = 'bold 15px "Courier New", monospace'; g.fillText('TIME  FLIGHT  DESTINATION   GATE  STATUS', 14, 42);
      const rows = [['08:15', 'HV 101', 'SANDPORT', 'A1', 'BOARDING'], ['08:40', 'HV 220', 'NEW YORK', 'A2', 'ON TIME'], ['09:05', 'PX 318', 'PERTH', 'B1', 'DELAYED'], ['09:30', 'HV 404', 'NEON HTS', 'B2', 'ON TIME'], ['10:10', 'RR 777', 'FT REDROCK', 'C1', 'ON TIME'], ['10:45', 'HV 909', 'TOKYO', 'C2', 'GATE OPEN'], ['11:20', 'PX 512', 'LONDON', 'A1', 'ON TIME']];
      rows.forEach((r, i) => { const y = 66 + i * 26; g.fillStyle = '#f4f1ea'; g.font = 'bold 17px "Courier New", monospace'; g.fillText(`${r[0]}  ${r[1]}  ${r[2].padEnd(12)}${r[3].padEnd(5)}`, 14, y); g.fillStyle = r[4] === 'DELAYED' ? '#ff5a4a' : r[4] === 'BOARDING' ? '#5ad1ff' : '#57e38a'; g.fillText(r[4], 384, y); });
    }, { repeat: false });
    const bm = new THREE.MeshBasicMaterial({ map: board, color: new THREE.Color(1.1, 1.1, 1.1) });
    for (const u of [-18, 18]) { const g = new THREE.PlaneGeometry(9, 4.5); g.rotateY(yaw(0, -1)); const [x, z] = pt(u, 30.8); g.translate(x, 7.2, z); root.add(new THREE.Mesh(g, bm)); const back = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.9, 0.3), new THREE.MeshStandardMaterial({ color: C('#1b1c1f') })); back.position.set(x, 7.2, z); back.rotation.y = yaw(0, -1); const [x2, z2] = pt(u, 30.98); back.position.set(x2, 7.2, z2); root.add(back); }
    // ceiling light strips
    const lights = []; for (let u = -90; u <= 90; u += 15) { const g = new THREE.PlaneGeometry(1.2, 18); g.rotateX(Math.PI / 2); g.rotateY(yaw(0, 1)); const [x, z] = pt(u, 29); g.translate(x, H - 0.05, z); lights.push(g); }
    root.add(new THREE.Mesh(mergeGeos(lights), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.4) })));
  });
  // jet bridges to two airliners at the gates
  const gates = [[-50, '#1f6fd6', '#f5b700'], [30, '#c8352b', '#1b2a3a']];
  for (const [u, c1, c2] of gates) {
    D(u - 1.6, V1, u + 1.6, 64, 4.2, 7.2, '#c9ccd1'); D(u - 1.62, V1, u + 1.62, 64, 5.4, 6.2, '#3a4a5a'); D(u - 2.2, 46, u + 2.2, 50, 3.6, 7.6, '#b8bcc2');
    for (const v of [48, 60]) for (const s of [-1, 1]) { D(u + s * 1.2 - 0.2, v - 0.2, u + s * 1.2 + 0.2, v + 0.2, 0, 4.2, '#5f6670'); BOX(u + s * 1.2 - 0.25, v - 0.25, u + s * 1.2 + 0.25, v + 0.25, 4.2, 'p'); }
    const cu = u + 3.6, cv = 84;   // the airliner, nose to the terminal
    BOX(cu - 2.3, cv - 21, cu + 2.3, cv + 20, 5.6, 'b');
    for (const s of [-1, 1]) BOX(cu + s * 7 - 1.2, cv - 6, cu + s * 7 + 1.2, cv - 1, 2.6, 'b');
    for (let v = 62; v < 130; v += 6) D(u - 0.15, v, u + 0.15, v + 3.4, 0.011, 0.03, '#e8c547');   // lead-in line
    // ground crew: tug and baggage carts, a fuel truck, stairs
    D(cu + 5, cv - 14, cu + 7, cv - 11, 0, 1.3, '#f5b700'); for (let k = 0; k < 3; k++) { D(cu + 5.2, cv - 10 + k * 3, cu + 6.8, cv - 7.8 + k * 3, 0.3, 1.4, '#9aa0a6'); D(cu + 5.3, cv - 9.9 + k * 3, cu + 6.7, cv - 7.9 + k * 3, 1.4, 1.9, ['#c8352b', '#1f6fd6', '#1e8a4c'][k]); }
    BOX(cu + 4.9, cv - 14, cu + 7.1, cv - 1.5, 1.9, 'c');
    D(cu - 9, cv + 6, cu - 6.6, cv + 15, 0, 2.6, '#eef0f2'); D(cu - 9, cv + 6, cu - 6.6, cv + 8, 2.6, 3.4, '#eef0f2'); D(cu - 8.9, cv + 8.2, cu - 6.7, cv + 15, 1, 2.6, '#c8352b'); BOX(cu - 9, cv + 6, cu - 6.6, cv + 15, 3.4, 'b');
    ap.liners = ap.liners || []; ap.liners.push({ u: cu, v: cv, c1, c2 });
  }
  W.post.push(root => { for (const L2 of ap.liners) { const m = buildAirliner(L2.c1, L2.c2, true); const [x, z] = pt(L2.u, L2.v); m.position.set(x, 0, z); m.rotation.y = yaw(0, -1); root.add(m); } });
  // landside car park beside the terminal, taxis at the kerb
  const pave = [U + 8, 18, U + 70, 40]; W.custom.push(L => { const r = rect(...pave); L.lot.push(quadF(r.x0, r.z0, r.x1, r.z1, 0.012, tile(8))); });
  for (let u = U + 12; u < U + 68; u += 3.4) for (const [v, f] of [[23, 1], [35, -1]]) { const r = rect(u - 0.06, v - 2.6, u + 0.06, v + 2.6); W.marks.push([r.x0, r.z0, r.x1, r.z1, 0.02]); if (W.rng2() < 0.4) { const [x, z] = pt(u + 1.7, v); W.parked.push({ x, z, h: yaw(0, f) }); } }
  for (let u = -70; u <= 70; u += 28) { const [x, z] = pt(u, 9.5); W.parked.push({ x, z, h: yaw(1, 0), cfg: { body: W.rng2() < 0.6 ? 'viper' : 'bubble', paint: '#f2c21b', finish: 'gloss', rim: 'disc', rimColor: '#2a2c30', plate: 'TAXI' } }); }
  ap.termRect = rect(-U + 1, V0 + 1, U - 1, V1 - 1); W.miniRects.push(rect(-U, V0, U, V1));
}
// a twin-engine airliner in a given livery; forward is +z, origin on the ground under the middle
function buildAirliner(c1, c2, parked) {
  const g = new THREE.Group(), M = planeMats(), white = new THREE.MeshStandardMaterial({ color: C('#f3f4f6'), roughness: 0.35, metalness: 0.2 }), A1 = new THREE.MeshStandardMaterial({ color: C(c1), roughness: 0.4, metalness: 0.2 }), A2 = new THREE.MeshStandardMaterial({ color: C(c2), roughness: 0.4, metalness: 0.2 });
  const add = (geo, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; g.add(o); return o; };
  const cyl = (r0, r1, l, s) => new THREE.CylinderGeometry(r0, r1, l, s || 16).rotateX(Math.PI / 2);
  add(cyl(2.2, 2.2, 30), white, 0, 3.4, 0);
  add(new THREE.SphereGeometry(2.2, 16, 10, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), white, 0, 3.4, 15).scale.set(1, 1, 1.6);
  add(cyl(0.5, 2.2, 8), white, 0, 3.9, -19).rotation.x = Math.PI / 2 + 0.08;
  add(new THREE.BoxGeometry(4.4, 0.3, 30), A1, 0, 2.2, 0).scale.set(1.01, 1, 1);
  add(new THREE.BoxGeometry(0.1, 0.6, 26), A1, 2.21, 4.0, 0); add(new THREE.BoxGeometry(0.1, 0.6, 26), A1, -2.21, 4.0, 0);
  for (let k = 0; k < 18; k++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.35, 0.35), M.glass, s * 2.2, 4.4, -12 + k * 1.4);
  add(new THREE.BoxGeometry(1.6, 0.5, 0.6), M.glass, 0, 4.6, 17.1).rotation.x = -0.5;
  for (const s of [-1, 1]) {
    const w = new THREE.Shape(); w.moveTo(0, 3); w.lineTo(17, -4.5); w.lineTo(17, -6.5); w.lineTo(0, -4); w.closePath();
    const wg = new THREE.ExtrudeGeometry(w, { depth: 0.35, bevelEnabled: false }); wg.rotateX(Math.PI / 2); const wm = add(wg, white, 0, 2.5, 0); wm.scale.x = s; wm.rotation.z = s * 0.06;
    add(cyl(1.15, 1.0, 4.2), M.metal, s * 7, 1.6, 0.4); add(new THREE.CircleGeometry(1.0, 14), M.dark, s * 7, 1.6, 2.52);
    const hs = new THREE.Shape(); hs.moveTo(0, 0); hs.lineTo(6, -2.4); hs.lineTo(6, -3.6); hs.lineTo(0, -3.2); hs.closePath(); const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.2, bevelEnabled: false }); hg.rotateX(Math.PI / 2); const hm = add(hg, white, 0, 4.4, -18.5); hm.scale.x = s;
  }
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(-5.5, 0); fin.lineTo(-8.5, 7); fin.lineTo(-6, 7); fin.closePath();
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: false }); fg.rotateY(-Math.PI / 2); add(fg, A2, -0.15, 4.6, -15.5);
  if (parked) { for (const [x, z] of [[0, 12], [-2.6, -1.5], [2.6, -1.5]]) { add(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), M.metal, x, 0.9, z); add(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12).rotateZ(Math.PI / 2), M.tyre, x, 0.45, z); } }
  else { g.gear = new THREE.Group(); for (const [x, z] of [[0, 12], [-2.6, -1.5], [2.6, -1.5]]) { const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), M.metal); s1.position.set(x, 0.9, z); const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12).rotateZ(Math.PI / 2), M.tyre); w1.position.set(x, 0.45, z); g.gear.add(s1, w1); } g.add(g.gear); }
  return g;
}
// ---------- travellers milling about inside the terminal ----------
function initTerminal() {
  for (const p of TERM.peds) if (p.active && p.customer === TERM.st) { hidePed(p); p.active = false; p.customer = null; }
  TERM.peds = []; TERM.st = null;
  if (!W.airport || !W.airport.termRect) return;
  const r = W.airport.termRect; TERM.st = { kind: 'terminal', ix0: r.x0, ix1: r.x1, iz0: r.z0, iz1: r.z1, cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2, panicT: 0, wrecked: false };
}
function updateTerminal(dt) {
  const st = TERM.st, F = PF(); if (!st || !F) return;
  const d = Math.hypot(st.cx - F.x, st.cz - F.z);
  if (TERM.peds.length && d > 190) { for (const p of TERM.peds) if (p.active && p.customer === st && !p.rag) { hidePed(p); p.active = false; p.customer = null; } TERM.peds = []; }
  else if (!TERM.peds.length && d < 150) {
    for (let k = 0; k < 12; k++) { const pt = storeFreePoint(st); if (!pt) continue; const p = spawnPedAt(pt[0], pt[1], 'civ'); if (!p) continue; p.customer = st; p.state = 'idle'; p.browseT = rand(1, 6); p.h = Math.random() * TAU; TERM.peds.push(p); }
  }
  const h = HERO.p, inside = G.onFoot && h && h.x > st.ix0 && h.x < st.ix1 && h.z > st.iz0 && h.z < st.iz1;
  if (inside && ((gunsOn() && ARMS.cur > 0 && (ARMS.trigger || ARMS.mouse.down)) || GT - ARMS.lastShot < 1)) st.panicT = GT + 10;
  if (inside && !TERM.was) feed('Havoc International: check-in is open', 'blue');
  TERM.was = inside;
}
// ---------- an airliner making a low pass down the runway every so often ----------
function updateAirTraffic(dt) {
  const ap = W.airport; if (!ap) { if (ATC.m) ATC.m.visible = false; return; }
  if (!ATC.m) { ATC.m = buildAirliner('#1f6fd6', '#f5b700', false); ATC.m.visible = false; scene.add(ATC.m); }
  const A = ap.site, m = ATC.m;
  if (ATC.wait > 0) { ATC.wait -= dt; m.visible = false; if (ATC.wait <= 0) { ATC.t = 0; ATC.dir = -ATC.dir; } return; }
  ATC.t += dt; const s = -1800 + ATC.t * 72, d = ATC.dir;
  if (s > 1800) { ATC.wait = 30 + Math.random() * 25; m.visible = false; return; }
  const alt = (x) => x < -340 ? 16 + (-340 - x) * 0.075 : x < 150 ? 16 : 16 + (x - 150) * 0.15;
  const u = d * s, v = 301, y = alt(s), y2 = alt(s + 5);
  m.position.set(A.ox + u * A.ux + v * A.vx, y, A.oz + u * A.uz + v * A.vz);
  const dx = d * A.ux, dz = d * A.uz; m.rotation.set(0, 0, 0); m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(dx, dz); m.rotation.x = -Math.atan2(y2 - y, 5) - 0.05;
  m.visible = true; if (m.gear) m.gear.visible = s < 300;
  const c = camera.position, dist = Math.hypot(m.position.x - c.x, m.position.y - c.y, m.position.z - c.z);
  if (dist < 260 && (!ATC.boomT || GT > ATC.boomT)) { ATC.boomT = GT + 1.5; SFX.flyby(clamp(0.75 - dist / 360, 0.06, 0.7)); }
}
// ---------- footy on the Burswood oval: two teams running about ----------
const STAD = { st: null, peds: [] };
function initStadiumGame() {
  for (const p of STAD.peds) if (p.active && p.customer === STAD.st) { hidePed(p); p.active = false; p.customer = null; }
  STAD.peds = []; STAD.st = null; const S = W.stadium; if (!S) return;
  STAD.st = { kind: 'oval', ix0: S.cx - S.fx * 0.72, ix1: S.cx + S.fx * 0.72, iz0: S.cz - S.fz * 0.68, iz1: S.cz + S.fz * 0.68, cx: S.cx, cz: S.cz, panicT: 0, wrecked: false, speed: 5.2, rest: [0.3, 1.6] };
}
function updateStadiumGame(dt) {
  const st = STAD.st, F = PF(); if (!st || !F) return;
  const d = Math.hypot(st.cx - F.x, st.cz - F.z);
  if (STAD.peds.length && d > 230) { for (const p of STAD.peds) if (p.active && p.customer === st && !p.rag) { hidePed(p); p.active = false; p.customer = null; } STAD.peds = []; }
  else if (!STAD.peds.length && d < 170) {
    for (let k = 0; k < 16; k++) { const pt = storeFreePoint(st); if (!pt) continue; const p = spawnPedAt(pt[0], pt[1], 'civ'); if (!p) continue;
      const home = k % 2 === 0, ump = k >= 14; pedColors(p, { skin: pick(SKIN), hair: pick(HAIR), shirt: ump ? '#f5c400' : home ? '#1e3a8a' : '#f2f2ee', pants: ump ? '#2b2b2b' : home ? '#f5c400' : '#c8352b' });
      p.customer = st; p.state = 'idle'; p.browseT = rand(0.2, 2); p.h = Math.random() * TAU; STAD.peds.push(p); }
  }
  const h = HERO.p, S = W.stadium, inside = h && ((h.x - S.cx) / S.ix) ** 2 + ((h.z - S.cz) / S.iz) ** 2 < 1;
  if (inside && G.onFoot && gunsOn() && (GT - ARMS.lastShot < 1)) st.panicT = GT + 10;
  if (inside && !STAD.was) feed('Welcome to the stadium: the Havoc Cup grand final is on', 'blue');
  STAD.was = inside;
}
function updateAirport(dt) { updateTerminal(dt); updateAirTraffic(dt); updateStadiumGame(dt); }
