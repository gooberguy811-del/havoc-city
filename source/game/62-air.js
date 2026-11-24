// =====================================================================
//  AIRPORT + PLANES: runway, terminal, hangars, tower; arcade flight
//  model with take-off, landing, stalls, crashes and parachutes
// =====================================================================
const PLANE_DEFS = {
  sparrow: { name: 'Sparrow', kind: 'prop', len: 8.4, span: 11, thrust: 7.2, vmax: 64, vstall: 21, vrot: 24, roll: 1.7, pitchRate: 0.95, turnMax: 1.15, yawAssist: 0.6, hp: 110, camD: 15, camH: 4.4, eye: 2.08, cockZ: 2.6, pitchMax: 0.8, mass: 1100, fus: [[0, 2.6], [0, 0.4], [0, -2.4]], fusR: 1.0 },
  heli: { name: 'police chopper', kind: 'heli', len: 10, span: 3.2, thrust: 0, vmax: 48, vstall: 0, vrot: 0, roll: 1, pitchRate: 1, turnMax: 1, hp: 170, camD: 15, camH: 5, eye: 1.7, cockZ: 1.8, pitchMax: 0.4, mass: 2600, fus: [[0, 1.8], [0, 0], [0, -3.4]], fusR: 1.0 },
  stinger: { name: 'Stinger', kind: 'jet', len: 11.6, span: 8.8, thrust: 17, vmax: 138, vstall: 36, vrot: 44, roll: 2.5, pitchRate: 1.2, turnMax: 1.45, yawAssist: 0.75, hp: 150, camD: 19, camH: 5.2, eye: 2.32, cockZ: 3.2, pitchMax: 1.15, mass: 4200, fus: [[0, 3.6], [0, 0.8], [0, -2.4]], fusR: 1.1 }
};
// [x, z, face] of the airport's city-facing edge; v points away from the city
const AIRPORT_SITES = { nyc: { ox: 252, oz: 0, ux: 0, uz: -1, vx: 1, vz: 0, tex: 'grass' }, neon: { ox: 262, oz: 0, ux: 0, uz: -1, vx: 1, vz: 0, tex: 'grass' }, sand: { ox: -310, oz: 0, ux: 0, uz: 1, vx: -1, vz: 0, tex: 'sand' }, perth: { ox: 600, oz: 60, ux: 0, uz: -1, vx: 1, vz: 0, tex: 'grass' } };
const PLANES = { list: [], spots: [], mats: null, chute: null };
const _pf = new THREE.Vector3(), _pv = new THREE.Vector3(), _bxA = [];

function genAirport(W, id) {
  const A = AIRPORT_SITES[id]; if (!A) return;
  const pt = (u, v) => [A.ox + u * A.ux + v * A.vx, A.oz + u * A.uz + v * A.vz];
  const rect = (u0, v0, u1, v1) => { const a = pt(u0, v0), b = pt(u1, v1); return { x0: Math.min(a[0], b[0]), z0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), z1: Math.max(a[1], b[1]) }; };
  const yaw = (du, dv) => Math.atan2(du * A.ux + dv * A.vx, du * A.uz + dv * A.vz);
  const D = (u0, v0, u1, v1, y0, y1, col) => { const r = rect(u0, v0, u1, v1); W.details.push([r.x1 - r.x0, y1 - y0, r.z1 - r.z0, (r.x0 + r.x1) / 2, (y0 + y1) / 2, (r.z0 + r.z1) / 2, col]); };
  const BOX = (u0, v0, u1, v1, top, kind) => { const r = rect(u0, v0, u1, v1); W.addBox(r.x0, r.z0, r.x1, r.z1, top, kind); };
  const BLD = (u0, v0, u1, v1, h, col, tex) => { const r = rect(u0, v0, u1, v1); W.bldgs.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y: 0, h, col, tex }); W.addBox(r.x0, r.z0, r.x1, r.z1, h, 'b'); };
  const neon = (u, v, y, w, h, col) => { const [x, z] = pt(u, v); return A.vx !== 0 ? { axis: 'x', dir: Math.sign(-A.vx), x, z, y, w, h, col } : { axis: 'z', dir: Math.sign(-A.vz), x, z, y, w, h, col }; };
  const ap = { site: A, pave: [], runway: rect(-340, 286, 340, 316), spots: [], roads: [], hangar: null };
  // grass / sand infield
  const all = rect(-366, -2, 366, 366);
  W.flats.push(Object.assign({ type: 'airport', tex: A.tex }, all));
  // paved areas: landside road, apron, taxiways, runway
  const pave = [[-175, 2, 175, 12, 0.010], [-292, 42, 182, 134, 0.011], [-12, 134, 12, 212, 0.012], [-304, 212, 304, 228, 0.012], [-316, 212, -300, 288, 0.012], [300, 212, 316, 288, 0.012], [-340, 286, 340, 316, 0.013], [-14, 12, 14, 42, 0.0105]];
  for (const p of pave) ap.pave.push(Object.assign(rect(p[0], p[1], p[2], p[3]), { y: p[4] }));
  // runway markings: centreline dashes, edges, threshold "piano keys"
  const MK = (u0, v0, u1, v1, y) => { const r = rect(u0, v0, u1, v1); W.marks.push([r.x0, r.z0, r.x1, r.z1, y]); };
  for (let u = -300; u < 300; u += 50) MK(u, 300.55, u + 30, 301.45, 0.02);
  MK(-338, 287.2, 338, 287.7, 0.02); MK(-338, 314.3, 338, 314.8, 0.02);
  for (const s of [-1, 1]) for (let k = 0; k < 8; k++) { const v = 289.5 + k * 3.3; MK(s * 336, v, s * 312, v + 1.6, 0.02); }
  // taxiway centre lines (yellow)
  D(-300, 219.7, 300, 220.3, 0.012, 0.032, '#e8c547'); D(-0.3, 134, 0.3, 212, 0.012, 0.032, '#e8c547');
  for (const s of [-1, 1]) D(s * 308 - 0.3, 220, s * 308 + 0.3, 286, 0.012, 0.032, '#e8c547');
  // runway and taxiway edge lights
  for (let u = -330; u <= 330; u += 30) for (const v of [285.4, 316.6]) D(u - 0.18, v - 0.18, u + 0.18, v + 0.18, 0, 0.35, '#fff1b8');
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) D(s * (346 + k * 4) - 0.3, 299, s * (346 + k * 4) + 0.3, 303, 0, 0.3, s > 0 ? '#ff5a4a' : '#57e38a');
  // terminal with a canopy over the kerb, big sign
  W.post = W.post || []; airportTerminal(W, A, pt, rect, D, BOX, yaw, ap);
  D(-100, 11.5, 100, 16, 4.6, 5.1, '#b9c0c9'); for (let u = -96; u <= 96; u += 16) { D(u - 0.25, 12.6, u + 0.25, 13.1, 0, 4.6, '#8d949e'); BOX(u - 0.25, 12.6, u + 0.25, 13.1, 4.6, 'p'); }
  W.neons.push(neon(0, 15.94, 8.6, 18, 2.2, '#22e0ff'));
  // control tower
  BLD(132, 20, 140, 28, 24, '#cfd3d8', 'house');
  D(128.5, 16.5, 143.5, 31.5, 24, 29, '#25425a'); D(128, 16, 144, 32, 29, 29.6, '#e2e5e9'); D(135.8, 23.8, 136.2, 24.2, 29.6, 34, '#3a3d42');
  // hangars with big doors
  // the big cargo hangar is open: drive in, and there is a cage of gold at the back (the heist target)
  const HC = '#c6cad0', hcut = [];
  const HCUT = (u0, v0, u1, v1, y0, y1, col) => { const r = rect(u0, v0, u1, v1); hcut.push([r.x1 - r.x0, y1 - y0, r.z1 - r.z0, (r.x0 + r.x1) / 2, (y0 + y1) / 2, (r.z0 + r.z1) / 2, col]); };
  for (const [u0, v0, u1, v1] of [[-282, 52, -281.4, 112], [-214.6, 52, -214, 112], [-282, 52, -214, 52.6], [-282, 111.4, -276, 112], [-220, 111.4, -214, 112]]) { D(u0, v0, u1, v1, 0, 15, HC); BOX(u0, v0, u1, v1, 15, 'b'); }
  D(-276, 111.4, -220, 112, 13.2, 15, HC); D(-276, 111.1, -220, 111.4, 12.4, 13.2, '#5f646b');
  for (let k = 0; k < 9; k++) D(-276 + k * 7, 111.3, -275.6 + k * 7, 111.42, 0, 0.6, k % 2 ? '#f5b700' : '#1a1d22');
  D(-281.4, 52.6, -214.6, 111.4, 0, 0.025, '#8d9096');
  HCUT(-282.3, 51.7, -213.7, 112.3, 15, 15.5, '#aeb3ba');
  for (let u = -272; u <= -224; u += 12) HCUT(u - 0.25, 52.6, u + 0.25, 111.4, 13.8, 15, '#7b8088');
  // gold cage with a gate in the middle
  for (const [a, b] of [[-262, -250], [-246, -234]]) { for (const y of [0.25, 1.1, 1.95, 2.8]) D(a, 62.95, b, 63.05, y, y + 0.07, '#3a3d42'); for (let u = a; u <= b; u += 1.5) D(u - 0.04, 62.96, u + 0.04, 63.04, 0, 3.0, '#3a3d42'); BOX(a, 62.9, b, 63.1, 3.0, 'c'); }
  for (const u of [-262, -234]) { for (const y of [0.25, 1.1, 1.95, 2.8]) D(u - 0.05, 52.6, u + 0.05, 63, y, y + 0.07, '#3a3d42'); BOX(u - 0.1, 52.6, u + 0.1, 63, 3.0, 'c'); }
  D(-250.2, 62.9, -249.8, 63.1, 0, 3.2, '#c8352b'); D(-246.2, 62.9, -245.8, 63.1, 0, 3.2, '#c8352b');
  for (let k = 0; k < 6; k++) { const u = -260 + k * 4.2; D(u, 54, u + 2.6, 56.6, 0, 0.9, '#7a5236'); D(u + 0.1, 54.1, u + 2.5, 56.5, 0.9, 1.25, '#e8c45a'); D(u + 0.4, 54.4, u + 2.2, 56.2, 1.25, 1.5, '#d4af37'); BOX(u, 54, u + 2.6, 56.6, 1.5, 'c'); }
  // shipping containers, a forklift and a security hut
  for (const [v0, c1, c2] of [[66, '#c8352b', '#1e8a4c'], [80, '#1f6fd6', null]]) { D(-280.8, v0, -278.2, v0 + 12, 0, 2.6, c1); if (c2) D(-280.8, v0, -278.2, v0 + 12, 2.6, 5.2, c2); BOX(-280.8, v0, -278.2, v0 + 12, c2 ? 5.2 : 2.6, 'b'); }
  D(-258, 78, -256.2, 81, 0, 1.4, '#f5b700'); D(-258, 81, -256.2, 81.3, 0, 2.6, '#3a3d42'); D(-257.8, 81.3, -256.4, 82.6, 0.1, 0.18, '#3a3d42'); BOX(-258, 78, -256.2, 82.6, 1.4, 'c');
  // a big grey cargo plane parked inside, nose to the door
  D(-235, 68, -229, 104, 2.2, 7.6, '#8f979f'); D(-234.4, 104, -229.6, 107, 2.8, 7.0, '#8f979f'); D(-233.8, 107, -230.2, 108.4, 3.6, 6.4, '#b9c0c9'); D(-233.6, 106.6, -230.4, 107.4, 6.2, 6.9, '#1b2a3a');
  D(-252, 82, -216, 92, 7.2, 7.7, '#9aa1a9'); D(-232.4, 64, -231.6, 70, 7.6, 13.8, '#8f979f'); D(-238, 64, -226, 68, 8.8, 9.2, '#9aa1a9');
  for (const u of [-244, -221]) { D(u - 1.1, 84, u + 1.1, 89, 5.6, 7.2, '#6b737d'); D(u - 0.8, 89, u + 0.8, 89.3, 5.8, 7.0, '#2a2d33'); }
  for (const [u, v] of [[-232, 100], [-236, 80], [-228, 80]]) { D(u - 0.2, v - 0.2, u + 0.2, v + 0.2, 0, 2.3, '#3a3d42'); D(u - 0.4, v - 0.6, u + 0.4, v + 0.6, 0, 0.8, '#1b1c1f'); }
  BOX(-235, 68, -229, 107, 7.6, 'c');
  for (let v = 58; v < 110; v += 8) D(-270, v, -226, v + 0.6, 14.2, 14.35, '#fff6da');   // strip lights under the roof
  D(-212.5, 113.5, -209.5, 116.5, 0, 2.7, '#e2e5e9'); D(-212.6, 113.4, -209.4, 116.6, 2.7, 2.9, '#c8352b'); BOX(-212.5, 113.5, -209.5, 116.5, 2.9, 'b');
  const hr = rect(-281.4, 52.6, -214.6, 111.4);
  W.miniRects.push(rect(-282, 52, -214, 112));
  BLD(-206, 62, -168, 112, 11, '#d2d5da', 'house'); D(-203, 112, -171, 112.25, 0.4, 9.4, '#5f646b');
  // fuel farm, windsock
  for (const u of [168, 178]) { D(u, 58, u + 7, 65, 0, 6.5, '#eef0f2'); BOX(u, 58, u + 7, 65, 6.5, 'b'); D(u - 0.05, 57.95, u + 7.05, 65.05, 3, 3.6, '#c8352b'); }
  D(329.8, 259.8, 330.2, 260.2, 0, 6, '#c9ccd1'); BOX(329.7, 259.7, 330.3, 260.3, 6, 'p'); D(330.2, 259.5, 333.6, 260.5, 5, 5.8, '#ff7a1a');
  // perimeter trees on the city side
  for (let u = -350; u <= 350; u += 25) { if (Math.abs(u) < 190) continue; const [x, z] = pt(u, -0.5); addTree(W, W.id === 'sand' ? 'palm' : 'oak', x, z, 0.9); }
  // parked planes
  for (const [type, u, v, col, trim] of [['sparrow', -150, 96, '#f4f4f2', '#c8352b'], ['sparrow', -122, 96, '#f2f2ee', '#1f6fd6'], ['stinger', 130, 96, '#6b7580', '#1b1f24'], ['stinger', -248, 128, '#2f3a46', '#e2b33c']]) {
    const [x, z] = pt(u, v); ap.spots.push({ type, x, z, yaw: yaw(0, 1), col, trim });
  }
  // access road from the nearest city intersection to the terminal kerb
  const dir = A.vx;   // +1 airport to the east, -1 to the west
  let best = null; for (const n of W.nodes) { if (!best || n.x * dir > best.x * dir + 0.5 || (Math.abs(n.x - best.x) < 0.5 && Math.abs(n.z - A.oz) < Math.abs(best.z - A.oz))) best = n; }
  const x0 = best.x + dir * W.hw, x1 = A.ox + dir * 7;
  ap.roads.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z: best.z });
  const [lx, lz] = pt(0, 29); ap.lx = lx; ap.lz = lz;
  ap.hangar = { cut: hcut, rect: hr };
  W.airport = ap;
  const B = W.bounds; B.x0 = Math.min(B.x0, all.x0 - 4); B.x1 = Math.max(B.x1, all.x1 + 4); B.z0 = Math.min(B.z0, all.z0 - 4); B.z1 = Math.max(B.z1, all.z1 + 4);
  // paved surfaces are drawn as custom geometry so they can sit at the right height over raised blocks
  W.custom.push(L => {
    for (const p of ap.pave) L.lot.push(quadF(p.x0, p.z0, p.x1, p.z1, p.y, tile(8)));
    for (const r of ap.roads) {
      for (let x = r.x0; x < r.x1 - 0.01;) { const h = heightAt(x + 0.5, r.z), nx = Math.min(r.x1, x + 4); L.lot.push(quadF(x, r.z - W.hw, nx, r.z + W.hw, h + 0.014, tile(8))); x = nx; }
      for (let x = r.x0 + 2; x < r.x1 - 4; x += 9) { const h = heightAt(x + 1, r.z); L.mark.push(quadF(x, r.z - 0.12, x + 4, r.z + 0.12, h + 0.022, () => [0, 0])); }
    }
  });
}

// ---------- plane models ----------
function planeMats() {
  if (PLANES.mats) return PLANES.mats;
  PLANES.mats = {
    dark: new THREE.MeshStandardMaterial({ color: C('#23272d'), roughness: 0.6, metalness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ color: C('#b9bec5'), roughness: 0.35, metalness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: C('#1b2a36'), roughness: 0.08, metalness: 0.6, envMapIntensity: 1.2 }),
    tyre: new THREE.MeshStandardMaterial({ color: C('#151618'), roughness: 0.9 }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.75, 0.3), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    burnt: new THREE.MeshStandardMaterial({ color: C('#1c1b1a'), roughness: 1 })
  };
  return PLANES.mats;
}
function wingGeo(pts, thick) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, thick / 2, 0); return g; }
function buildPlaneModel(type, col, trim) {
  if (type === 'hornet' || type === 'mule') return buildMilHeli(type, col, trim);
  if (type === 'heli') { planeMats(); const g = HELI.obj.clone(); g.position.y = 1.3; const root = new THREE.Group(); root.add(g); return { root, body: g, rotor: g.children[7], tail: g.children[8] }; }
  const M = planeMats(), paint = new THREE.MeshStandardMaterial({ color: C(col), roughness: 0.4, metalness: 0.35 }), tr = new THREE.MeshStandardMaterial({ color: C(trim), roughness: 0.45, metalness: 0.3 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; body.add(o); return o; };
  const cyl = (r0, r1, len, seg, tipFwd) => { const g = new THREE.CylinderGeometry(r0, r1, len, seg || 12); g.rotateX(tipFwd ? Math.PI / 2 : -Math.PI / 2); return g; };
  const wheel = (x, y, z, r) => { const g = new THREE.CylinderGeometry(r, r, 0.2, 12); g.rotateZ(Math.PI / 2); add(g, M.tyre, x, y, z); add(new THREE.BoxGeometry(0.08, y + 0.7, 0.12), M.metal, x, y + (y + 0.7) / 2 - 0.05, z); };
  let prop = null, flame = null;
  if (type === 'sparrow') {
    add(new THREE.BoxGeometry(1.3, 1.35, 3.0), paint, 0, 1.55, 0.6);
    add(cyl(0.45, 0.66, 1.6, 12, true), paint, 0, 1.4, 2.9);
    add(new THREE.ConeGeometry(0.24, 0.55, 10).rotateX(Math.PI / 2), tr, 0, 1.4, 3.95);
    add(cyl(0.18, 0.62, 4.4, 10, false), paint, 0, 1.6, -2.95);
    add(new THREE.BoxGeometry(11, 0.16, 1.6), paint, 0, 2.32, 0.75);
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(1.2, 0.17, 1.62), tr, s * 4.9, 2.32, 0.75); const st = add(new THREE.BoxGeometry(0.07, 1.6, 0.14), M.metal, s * 1.9, 1.62, 0.8); st.rotation.z = s * 0.72; }
    add(new THREE.BoxGeometry(1.34, 0.55, 1.7), M.glass, 0, 1.82, 0.75);
    const ws = add(new THREE.BoxGeometry(1.2, 0.7, 0.06), M.glass, 0, 1.9, 2.15); ws.rotation.x = -0.75;
    add(new THREE.BoxGeometry(3.8, 0.09, 1.05), paint, 0, 1.68, -4.55);
    const fin = add(new THREE.BoxGeometry(0.09, 1.55, 1.2), tr, 0, 2.35, -4.6); fin.rotation.x = 0.28;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.18, 6.4), tr, s * 0.67, 1.32, 0.1);
    wheel(-1.1, 0.3, 0.35, 0.3); wheel(1.1, 0.3, 0.35, 0.3); wheel(0, 0.26, 2.55, 0.26);
    prop = new THREE.Group(); prop.position.set(0, 1.4, 4.12);
    for (const r of [0, Math.PI]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.05, 0.05), M.dark); b.position.y = 0.52; const g = new THREE.Group(); g.rotation.z = r; g.add(b); prop.add(g); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.08, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, depthWrite: false })); prop.add(disc); prop.disc = disc;
    body.add(prop);
  } else {
    add(cyl(0.62, 0.72, 7.2, 14, true), paint, 0, 1.55, -0.2);
    add(new THREE.ConeGeometry(0.62, 2.8, 14).rotateX(Math.PI / 2), paint, 0, 1.55, 4.8);
    const cp = add(new THREE.SphereGeometry(1, 16, 10), M.glass, 0, 2.08, 2.3); cp.scale.set(0.46, 0.42, 1.35);
    add(cyl(0.6, 0.5, 0.8, 14, false), M.dark, 0, 1.55, -4.2);
    for (const s of [-1, 1]) {
      const w = add(wingGeo([[0.5, 1.4], [4.4, -1.5], [4.4, -2.4], [0.5, -2.7]], 0.14), paint, 0, 1.35, 0); w.scale.x = s;
      add(new THREE.BoxGeometry(0.3, 0.16, 0.95), tr, s * 4.3, 1.42, -1.95);
      const f = add(wingGeo([[0, 0.7], [0, -1.7], [1.7, -2.4], [1.7, -1.2]], 0.12), paint, s * 0.62, 1.9, -2.6); f.rotation.z = Math.PI / 2 - s * 0.25;
      const ft = add(new THREE.BoxGeometry(0.14, 0.35, 1.25), tr, s * (0.62 + 0.42), 1.9 + 1.55, -4.4); ft.rotation.z = -s * 0.25;
      const hs = add(wingGeo([[0.4, -2.8], [2.1, -4.0], [2.1, -4.5], [0.4, -4.6]], 0.08), paint, 0, 1.5, 0); hs.scale.x = s;
      add(new THREE.BoxGeometry(0.5, 0.6, 1.6), M.dark, s * 0.78, 1.45, 1.4);
    }
    wheel(-1.2, 0.3, -0.6, 0.3); wheel(1.2, 0.3, -0.6, 0.3); wheel(0, 0.28, 3.3, 0.28);
    flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.4, 12, 1, true).rotateX(-Math.PI / 2), M.flame); flame.position.set(0, 1.55, -5.75); flame.visible = false; body.add(flame);
  }
  return { root, body, prop, flame, paint, tr };
}
class Plane {
  constructor(spot) {
    const D = this.def = PLANE_DEFS[spot.type]; this.type = spot.type; this.spot = spot;
    this.x = spot.x; this.z = spot.z; this.y = heightAt(spot.x, spot.z); this.yaw = spot.yaw; this.pitch = 0; this.roll = 0;
    this.V = new THREE.Vector3(); this.gs = 0; this.T = 0; this.ground = true; this.hp = D.hp; this.dead = false; this.wreck = false; this.pilot = false; this.byPlayer = false;
    this.in = { thr: 0, turn: 0, pitch: 0 }; this.h = this.yaw; this.vx = 0; this.vz = 0; this.vy = 0; this.speed = 0; this.vf = 0; this.smokeT = 0; this.age = 0;
    this.m = buildPlaneModel(spot.type, spot.col, spot.trim); scene.add(this.m.root); this.sync();
  }
  sync() {
    const r = this.m.root; r.position.set(this.x, this.y, this.z); r.rotation.set(-this.pitch, this.yaw, this.roll, 'YXZ');
    this.h = this.yaw; this.vx = this.V.x; this.vz = this.V.z; this.vy = this.V.y; this.speed = this.V.length(); this.vf = this.speed;
  }
  remove() { scene.remove(this.m.root); this.m.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); const i = PLANES.list.indexOf(this); if (i >= 0) PLANES.list.splice(i, 1); }
}
function initPlanes() {
  for (const p of [...PLANES.list]) p.remove();
  PLANES.list.length = 0; PLANES.spots = []; G.plane = null; clearBombs();
  const spots = [...(W.airport ? W.airport.spots : []), ...(W.milSpots || [])]; if (!spots.length) return;
  for (const s of spots) { const sp = Object.assign({ plane: null, emptyT: 0 }, s); PLANES.spots.push(sp); sp.plane = new Plane(sp); PLANES.list.push(sp.plane); }
}
// ram-air canopy: an arched wing of cells, lines running down to risers in the jumper's hands
function buildChute(col) {
  const g = new THREE.Group(), A = C(col || '#ff5a2e'), B = C('#efe9de'), cells = 7, nu = cells * 4, nv = 8, R = 6.4, TH = 0.56, Y = 6.2, Z0 = 1.25, Z1 = -1.55;
  const pat = [A, B, A, B, A, B, A];
  const P = (u, v, top) => {
    const a = u * TH, nx = Math.sin(a), ny = Math.cos(a), taper = 1 - 0.35 * u * u;
    const t = (top ? 0.44 * Math.sin(Math.PI * Math.pow(v, 0.6)) : -0.07 * Math.sin(Math.PI * v)) * taper;
    return [R * nx + nx * t, Y - R * (1 - ny) + ny * t + (v - 0.5) * 0.18, Z0 + (Z1 - Z0) * v];
  };
  const pos = [], cols = [];
  for (const top of [true, false]) for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u0 = -1 + 2 * i / nu, u1 = -1 + 2 * (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
    let c = pat[Math.floor(i / nu * cells)].clone(); if (!top) c.multiplyScalar(0.86); if (j === 0) c.multiplyScalar(top ? 0.82 : 0.5);
    const a = P(u0, v0, top), b = P(u1, v0, top), cc = P(u1, v1, top), d = P(u0, v1, top);
    const quad = top ? [a, d, cc, a, cc, b] : [a, b, cc, a, cc, d];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); cols.push(c.r, c.g, c.b); }
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); cg.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, color: C('#dcd6cc'), side: THREE.DoubleSide, transparent: true });
  const can = new THREE.Mesh(cg, mat); can.castShadow = true; g.add(can);
  // lines: three rows on every cell wall, gathered into a riser above each hand
  const lp = [];
  for (const u of [-1, -0.71, -0.43, -0.14, 0.14, 0.43, 0.71, 1]) for (const v of [0.1, 0.5, 0.9]) { const q = P(u, v, false), sx = u < 0 ? -1 : 1; lp.push(q[0], q[1], q[2], sx * 0.34, 2.45, 0.02); }
  for (const sx of [-1, 1]) lp.push(sx * 0.34, 2.45, 0.02, sx * 0.36, 1.98, 0.04);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lm = new THREE.LineBasicMaterial({ color: 0x2b2b2e, transparent: true });
  g.add(new THREE.LineSegments(lg, lm));
  g.userData.mats = [mat, lm];
  g.visible = false; scene.add(g); return g;
}
function chuteFade(g, o) { for (const m of g.userData.mats) { m.opacity = o; m.depthWrite = o > 0.98; } }
// the canopy follows the hero after their pose is final, so it never lags a frame behind
function syncChute(dt) {
  const ch = PLANES.chute || (PLANES.chute = buildChute()), p = HERO.p, c = HERO.chute;
  if (c && !c.free && G.onFoot && p && p.active && !p.rag && !G.down) {
    HERO.chuteDrop = null;
    const k = clamp((c.t - 0.1) / 0.55, 0, 1), e = 1 - (1 - k) ** 3;   // bag -> lines stretch -> wing inflates
    ch.visible = c.t > 0.06;
    ch.position.set(p.x, p.y, p.z);
    ch.rotation.set(c.pitch || 0, p.h, (c.bank || 0) + Math.sin(GT * 1.3) * 0.025, 'YXZ');
    ch.scale.set(0.1 + 0.9 * e, 0.5 + 0.5 * Math.min(1, c.t / 0.3), 0.25 + 0.75 * e);
    chuteFade(ch, 1);
  } else if (HERO.chuteDrop) {   // landed (or got knocked out of it): the wing sags forward and settles
    const D = HERO.chuteDrop; D.t += dt; const k = Math.min(1, D.t / (D.air ? 1.2 : 1.7));
    ch.visible = k < 1;
    ch.position.set(D.x, D.y - (D.air ? k * 6 : k * 0.5), D.z);
    ch.rotation.set(k * (D.air ? 0.6 : 1.35), D.h, D.bank * (1 - k) + (D.air ? k * 0.9 : 0), 'YXZ');
    ch.scale.set(1 - k * 0.2, 1 - k * 0.5, 1); chuteFade(ch, 1 - k * k);
    if (k >= 1) HERO.chuteDrop = null;
  } else ch.visible = false;
}
// belly-to-earth sky-diving pose, used for the hero and for other players
const SKYDIVE = [[0, 1.17, 0.74], [0, 1.08, 0.53], [0.21, 1.07, 0.45], [-0.21, 1.07, 0.45], [0.5, 1.12, 0.58], [-0.5, 1.12, 0.58], [0.64, 1.2, 0.84], [-0.64, 1.2, 0.84],
  [0, 1.0, -0.04], [0.11, 0.99, -0.08], [-0.11, 0.99, -0.08], [0.19, 1.03, -0.5], [-0.19, 1.03, -0.5], [0.23, 1.3, -0.82], [-0.23, 1.3, -0.82]];
function skydivePose(P, x, y, z, h, s, roll) {
  const c = Math.cos(h), sn = Math.sin(h), cr = Math.cos(roll), sr = Math.sin(roll), fl = Math.sin(GT * 11) * 0.025;
  for (let i = 0; i < 15; i++) {
    const q = SKYDIVE[i], lx = q[0], ly = q[1] - 1 + (i >= 4 && i <= 7 ? (i & 1 ? -fl : fl) : 0), lz = q[2];
    const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
    P[i * 3] = x + (rx * c + lz * sn) * s; P[i * 3 + 1] = y + (1 + ry) * s; P[i * 3 + 2] = z + (-rx * sn + lz * c) * s;
  }
}
// ---------- pilots ----------
function nearPlane() {
  const p = HERO.p; if (!p || p.rag || !G.onFoot || HERO.chute) return null; let best = null, bd = 5.2;
  for (const pl of PLANES.list) { if (pl.wreck || pl.dead || pl.remote) continue; const d = Math.hypot(pl.x - p.x, pl.z - p.z) - pl.def.fusR; if (d < bd && Math.abs(pl.y - p.y) < 3) { bd = d; best = pl; } }
  return best;
}
function enterPlane(pl) {
  heroHide(); G.plane = pl; pl.pilot = true; pl.byPlayer = true; HERO.chute = null; baseAircraftTaken(pl);
  CAM.h = pl.yaw; resetCamera(); SFX.door(); HUD.exitHintT = 7;
  feed(`Flying the ${pl.def.name}. Full throttle down the runway, then climb`, 'blue');
}
function leavePlane() {
  const pl = G.plane; if (!pl || G.down) return;
  const gh = planeGround(pl), alt = pl.y - gh, s = pl.V.length();
  G.plane = null; pl.pilot = false; SFX.hornSet(false);
  const rx = -Math.cos(pl.yaw), rz = Math.sin(pl.yaw);
  if (pl.ground && s < 6) { heroShow(pl.x + rx * 2.4, pl.z + rz * 2.4, pl.yaw - Math.PI / 2); HERO.p.sp = 0; SFX.door(); return; }
  heroShow(pl.x + rx * 1.6, pl.z + rz * 1.6, pl.yaw); const p = HERO.p;
  p.y = pl.y + 0.6; HERO.vy = Math.min(0, pl.V.y * 0.3); p.sp = Math.min(6, s * 0.2);
  if (alt > 10) { HERO.chute = { t: 0, free: true }; feed(APP.touch ? 'Free fall! Tap CAR to open your parachute' : 'Free fall! Press Space or F to open your parachute', 'blue'); }
  else { HERO.bailCar = null; HERO.bailUntil = GT + 4; toRagdoll(p, pl.V.x * 0.5, pl.V.z * 0.5, Math.min(s * 0.4, 10), null); HERO.hp = Math.max(15, HERO.hp - Math.min(25, s * 0.5)); }
  updateFocus();
}
function planeGround(pl) { return W.waters && waterAt(pl.x, pl.z) ? WATER_SURF : heightAt(pl.x, pl.z); }
function damagePlane(pl, dmg, src) {
  if (pl.wreck || dmg <= 0) return;
  pl.hp -= dmg; if (isPlayerSrc(src)) pl.lastPlayerHit = GT;
  if (pl.hp <= 0) { if (pl.ground) crashPlane(pl, src); else if (!pl.dead) { pl.dead = true; if (pl === G.plane) feed('Engine fire! Bail out or put it down', 'red'); } }
}
function damagePlanesAt(x, y, z, R, power, src) {
  for (const pl of PLANES.list) { if (pl.wreck || pl.remote) continue; const d = Math.hypot(pl.x - x, pl.y + 1.4 - y, pl.z - z); if (d < R) damagePlane(pl, (1 - d / R) * 80 * power, src); }
}
function crashPlane(pl, src, water) {
  if (pl.wreck) return;
  pl.wreck = true; pl.dead = true; pl.T = 0; const s = pl.V.length();
  const pilot = pl === G.plane;
  if (water) { splash(pl.x, pl.z, 14); SFX.splashBig(1); pl.sinkT = 0; }
  else {
    explode(pl.x, pl.y + 1.2, pl.z, pl.def.kind === 'jet' ? 3.2 : 2.4, pilot || pl.byPlayer ? 'hero' : src, null, s > 45);
    for (let k = 0; k < 4; k++) addFire(pl.x + rand(-4, 4), pl.z + rand(-4, 4), rand(1.4, 2.4), rand(25, 45));
    pl.m.root.traverse(o => { if (o.isMesh && o.material !== PLANES.mats.glass) o.material = PLANES.mats.burnt; });
    if (pl.m.prop) pl.m.prop.visible = false; if (pl.m.flame) pl.m.flame.visible = false;
  }
  pl.V.set(0, 0, 0); pl.ground = true; pl.roll = rand(-0.4, 0.4); pl.pitch = rand(-0.15, 0.1); pl.wreckT = GT;
  if (pilot) playerDown('wasted', water ? 'You ditched the plane in the water' : 'You crashed the plane');
}
// does any part of the plane touch a building, pole or tree?
function planeHit(pl) {
  const D = pl.def, fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), rx = -Math.cos(pl.yaw), rz = Math.sin(pl.yaw), sp = Math.sin(pl.pitch), sr = Math.sin(pl.roll);
  const half = D.span / 2, L = D.len / 2;
  const pts = [[fx * L, 1.5 + sp * L, fz * L], [-fx * L, 1.8 - sp * L, -fz * L], [rx * half, 1.9 - sr * half, rz * half], [-rx * half, 1.9 + sr * half, -rz * half], [0, 1.5, 0]];
  for (const [ox, oy, oz] of pts) {
    const x = pl.x + ox, y = pl.y + oy, z = pl.z + oz;
    W.boxGrid.query(x - 0.3, z - 0.3, x + 0.3, z + 0.3, _bxA);
    for (const b of _bxA) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h && (b.kind !== 'c' || y < b.h - 0.2)) return { b, x, y, z };
  }
  return null;
}
function stepPlane(pl, dt) {
  if (pl.def.kind === 'heli') { stepHeli(pl, dt); return; }
  const D = pl.def, I = pl.in, V = pl.V;
  pl.T = clamp(pl.T + I.thr * dt * 0.55, 0, 1);
  if (pl.dead) pl.T = Math.max(0, pl.T - dt * 0.4);
  const cy = Math.cos(pl.yaw), sy = Math.sin(pl.yaw), cp = Math.cos(pl.pitch), spn = Math.sin(pl.pitch);
  const f = _pf.set(sy * cp, spn, cy * cp);
  const boost = D.kind === 'jet' && pl.T > 0.97 ? 1.3 : 1;
  const ceil = pl.y > 450 ? Math.max(0, 1 - (pl.y - 450) / 150) : 1;
  const thrust = D.thrust * pl.T * boost * ceil, cd = D.thrust / (D.vmax * D.vmax);
  const gh = planeGround(pl);
  if (pl.ground) {
    let gs = pl.gs + thrust * dt;
    if (I.thr < 0 && pl.T < 0.02) { if (gs > 0.4) gs = Math.max(0, gs - 9 * dt); else gs = Math.max(-3, gs - 2.5 * dt); }
    gs -= gs * cd * Math.abs(gs) * dt + Math.sign(gs) * Math.min(Math.abs(gs), 0.35 * dt);
    pl.yaw += I.turn * 1.05 * clamp(Math.abs(gs) / 5, 0, 1) / (1 + Math.abs(gs) / 22) * Math.sign(gs || 1) * dt;
    pl.roll = lerp(pl.roll, 0, damp(6, dt));
    if (gs > D.vrot * 0.85 && I.pitch > 0) pl.pitch = Math.min(0.32, pl.pitch + D.pitchRate * 0.55 * dt);
    else pl.pitch = lerp(pl.pitch, 0, damp(3, dt));
    pl.gs = gs; V.set(sy * gs, 0, cy * gs); pl.y = gh;
    if (pl.pitch > 0.07 && gs > D.vrot) { pl.ground = false; V.set(f.x * gs, f.y * gs, f.z * gs); if (pl === G.plane) feed('Airborne!', 'green'); }
  } else {
    const sf = V.dot(f), lf = clamp((sf - D.vstall * 0.55) / (D.vstall * 0.45), 0, 1);
    V.addScaledVector(f, thrust * dt);
    V.multiplyScalar(Math.max(0, 1 - cd * V.length() * dt));
    const lift = Math.min(1, lf * (sf / (D.vstall * 1.3)) ** 2);   // full lift needs ~1.3x stall speed: slow = gentle sink
    V.y -= 9.8 * (1 - lift) * dt;
    const sv = V.length(); _pv.copy(f).multiplyScalar(sv); V.lerp(_pv, clamp(2.4 * lf * dt, 0, 1));
    V.addScaledVector(f, -9.8 * spn * lf * dt);
    const tRoll = -I.turn * 1.2;
    pl.roll = lerp(pl.roll, tRoll, damp(D.roll * 2.2, dt));
    pl.yaw += (clamp(-9.8 * Math.tan(pl.roll) / Math.max(sf, 18), -D.turnMax, D.turnMax) + I.turn * (D.yawAssist || 0) * lf) * (0.3 + 0.7 * lf) * dt;
    let pr = I.pitch * D.pitchRate * (0.25 + 0.75 * lf);
    if (lf < 0.9) pr -= (1 - lf) * 0.9;
    if (!I.pitch) pr -= pl.pitch * 0.45;   // eases back toward level flight
    if (pl.dead) { pr -= 0.25; pl.roll += Math.sin(GT * 1.3 + pl.x) * 0.4 * dt; }
    pl.pitch = clamp(pl.pitch + pr * dt, -D.pitchMax * 1.1, D.pitchMax);
    // keep the fight inside the map: past the edge the plane banks back toward the middle
    const B = W.bounds, out = Math.max(B.x0 - pl.x, pl.x - B.x1, B.z0 - pl.z, pl.z - B.z1);
    if (out > 120) { const to = Math.atan2((B.x0 + B.x1) / 2 - pl.x, (B.z0 + B.z1) / 2 - pl.z); const e = wrapA(to - pl.yaw); pl.yaw += clamp(e, -0.6, 0.6) * dt * (out > 260 ? 2 : 0.8); if (pl === G.plane && (!pl.warnT || GT - pl.warnT > 4)) { pl.warnT = GT; feed('Leaving the area: turning back', 'red'); } }
  }
  pl.x += V.x * dt; pl.y += V.y * dt; pl.z += V.z * dt;
  if (!pl.ground) {
    const g2 = planeGround(pl);
    if (pl.y <= g2) {
      const water = W.waters && waterAt(pl.x, pl.z), vs = V.y;
      if (!water && !pl.dead && vs > -7 && Math.abs(pl.roll) < 0.45 && pl.pitch > -0.2 && pl.pitch < 0.45) {
        pl.ground = true; pl.y = g2; pl.gs = Math.max(0, V.x * Math.sin(pl.yaw) + V.z * Math.cos(pl.yaw)); V.y = 0;
        if (vs < -4) damagePlane(pl, (-vs - 4) * 9);
        if (pl === G.plane) { G.shake = Math.max(G.shake, 0.25); SFX.thud(clamp(-vs * 2, 2, 12), pl.x, pl.z); if (pl.gs > 15) feed('Touchdown', 'green'); }
      } else { pl.y = g2; crashPlane(pl, null, water); return; }
    }
  }
  const s = V.length();
  if (s > 4 || !pl.ground) {
    const h = planeHit(pl);
    if (h) {
      if (pl.ground && s < 16) { pl.x -= V.x * dt * 2; pl.z -= V.z * dt * 2; pl.gs = 0; V.set(0, 0, 0); damagePlane(pl, s * 2); SFX.thud(s, pl.x, pl.z); }
      else { if (h.b.struct) hitStruct(h.b.struct, 250 + s * 7, h.x, h.y, h.z, pl.byPlayer ? 'hero' : null); crashPlane(pl, null, false); return; }
    }
  }
}
function planeInput(pl) {
  const I = pl.in;
  if (G.down || BM.open) { I.thr = 0; I.turn = 0; I.pitch = 0; return; }
  I.thr = ((KEYS.KeyW || KEYS.ArrowUp || TOUCH.gas) ? 1 : 0) - ((KEYS.KeyS || KEYS.ArrowDown || TOUCH.brake) ? 1 : 0);
  I.turn = ((KEYS.KeyA || KEYS.ArrowLeft || TOUCH.left) ? 1 : 0) - ((KEYS.KeyD || KEYS.ArrowRight || TOUCH.right) ? 1 : 0);
  I.pitch = ((KEYS.Space || TOUCH.hand) ? 1 : 0) - ((KEYS.ShiftLeft || KEYS.ShiftRight || TOUCH.nitro) ? 1 : 0);
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; if (Math.abs(ax) > 0.15) I.turn = -ax; if (Math.abs(ay) > 0.15) I.pitch = ay;
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0, lt = gp.buttons[6] ? gp.buttons[6].value : 0; if (rt > 0.1 || lt > 0.1) I.thr = rt - lt;
    break;
  }
}
// planes act as obstacles for people and cars on the ground
function planeObstacles(pl) {
  const D = pl.def, fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), s = pl.V.length();
  for (const [, o] of D.fus) {
    const cx = pl.x + fx * o, cz = pl.z + fz * o, r = D.fusR;
    if (G.onFoot && HERO.p && !HERO.p.rag) { const p = HERO.p, dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d < r + 0.35 && p.y < pl.y + 2.6) { const k = (r + 0.35 - d) / (d || 1); p.x += dx * k; p.z += dz * k; } }
    for (const v of VEH.list) {
      const dx = v.x - cx, dz = v.z - cz, d = Math.hypot(dx, dz), rr = r + v.halfW + 0.3;
      if (d > rr || v.y > pl.y + 2.4) continue;
      const nx = dx / (d || 1), nz = dz / (d || 1), pen = rr - d; v.x += nx * pen; v.z += nz * pen;
      const rel = (v.vx - pl.V.x) * nx + (v.vz - pl.V.z) * nz;
      if (rel < 0) { v.vx -= nx * rel * 1.2; v.vz -= nz * rel * 1.2; if (-rel > 8) { damageVehicle(v, -rel * 3, pl.pilot ? 'hero' : null); damagePlane(pl, -rel * 1.5, v.kind === 'player' ? 'hero' : null); vehicleImpact(v, -rel, cx + nx * r, v.y + 0.6, cz + nz * r); } }
    }
    if (s > 5 && pl.ground) for (const p of PED.list) { if (!p.active || p.rag || p.isHero) continue; if (Math.hypot(p.x - cx, p.z - cz) < r + 0.4) { toRagdoll(p, pl.V.x, pl.V.z, s, null); if (s > 9) killPed(p, pl.pilot); } }
  }
}
// ---------- the Stinger carries bombs: B to drop, land to rearm ----------
const BOMBS = { list: [], geo: null, mat: null, max: 8 };
const _bxB = [];
function clearBombs() { for (const b of BOMBS.list) scene.remove(b.m); BOMBS.list.length = 0; }
function dropBomb() {
  const pl = G.plane; if (pl && pl.type === 'hornet' && !pl.remote && !pl.wreck && !pl.dead && !G.down) { fireHeliRockets(pl); return; }
  if (!pl || pl.remote || pl.type !== 'stinger' || pl.wreck || pl.dead || G.down || weaponsBanned()) return;
  if (pl.bombs === undefined) pl.bombs = BOMBS.max;
  if (pl.ground) { feed('Get airborne to drop bombs'); return; }
  if (pl.bombs <= 0) { feed('Out of bombs. Land to rearm', 'red'); return; }
  if (GT - (pl.bombT || -9) < 0.3) return;
  pl.bombT = GT; pl.bombs--;
  if (!BOMBS.geo) { const c = new THREE.CylinderGeometry(0.22, 0.22, 1.1, 12); c.rotateX(Math.PI / 2); const n = new THREE.ConeGeometry(0.22, 0.45, 12); n.rotateX(Math.PI / 2); n.translate(0, 0, 0.77); const f = new THREE.BoxGeometry(0.7, 0.04, 0.3); f.translate(0, 0, -0.55); const f2 = f.clone(); f2.rotateZ(Math.PI / 2); BOMBS.geo = mergeGeos([c, n, f, f2]); BOMBS.mat = new THREE.MeshStandardMaterial({ color: C('#3b4148'), metalness: 0.6, roughness: 0.4 }); }
  const m = new THREE.Mesh(BOMBS.geo, BOMBS.mat); m.castShadow = true; scene.add(m);
  const side = pl.bombs % 2 ? 1 : -1, rx = -Math.cos(pl.yaw), rz = Math.sin(pl.yaw);
  BOMBS.list.push({ m, x: pl.x + rx * side * 1.1, y: pl.y + 0.9, z: pl.z + rz * side * 1.1, vx: pl.V.x, vy: Math.min(pl.V.y, 0) - 1.5, vz: pl.V.z, t: 0 });
  SFX.clank(0.4); SFX.bombFall();
  feed(`Bomb away · ${pl.bombs} left`);
}
function updateBombs(dt) {
  const pl = G.plane;
  if (pl && pl.type === 'stinger' && pl.ground && !pl.wreck && pl.V.length() < 4 && pl.bombs !== undefined && pl.bombs < BOMBS.max) { pl.bombs = BOMBS.max; feed('Bombs reloaded', 'green'); }
  for (let i = BOMBS.list.length - 1; i >= 0; i--) {
    const b = BOMBS.list[i]; b.t += dt;
    b.vy -= GRAV * dt; const k = Math.exp(-0.1 * dt); b.vx *= k; b.vz *= k;
    const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt, nz = b.z + b.vz * dt;
    let hit = ny <= heightAt(nx, nz) + 0.25;
    if (!hit) { W.boxGrid.query(nx - 0.3, nz - 0.3, nx + 0.3, nz + 0.3, _bxB); for (const q of _bxB) if (nx > q.x0 && nx < q.x1 && nz > q.z0 && nz < q.z1 && ny < q.h) { hit = true; break; } }
    if (!hit) for (const v of VEH.list) if (Math.abs(v.x - nx) < 2.3 && Math.abs(v.z - nz) < 2.3 && ny < v.y + v.height && ny > v.y - 0.5) { hit = true; break; }
    b.x = nx; b.y = ny; b.z = nz; b.m.position.set(nx, ny, nz); b.m.lookAt(nx + b.vx, ny + b.vy, nz + b.vz);
    if (hit || b.t > 25) { scene.remove(b.m); BOMBS.list.splice(i, 1); if (hit) explode(nx, Math.max(ny, heightAt(nx, nz)) + 0.4, nz, 2.4, 'hero', null, false); }
  }
}
function updatePlanes(dt) {
  updateBombs(dt);
  if (!PLANES.list.length && !PLANES.spots.length) return;
  if (G.plane) planeInput(G.plane);
  for (const pl of PLANES.list) {
    if (pl.m.rotor && !pl.wreck) { pl.m.rotor.rotation.y += dt * (pl.T > 0.05 ? 30 : 2); pl.m.tail.rotation.x += dt * (pl.T > 0.05 ? 40 : 2); }
    if (pl.remote) { pl.sync(); planeObstacles(pl); if (pl.m.prop) { pl.m.prop.rotation.z += (pl.T * 0.9 + 0.1) * 60 * dt; pl.m.prop.disc.material.opacity = 0.2; } if (pl.m.flame) { const on = pl.T > 0.05; pl.m.flame.visible = on; if (on) pl.m.flame.scale.set(0.6 + pl.T * 0.5, 0.6 + pl.T * 0.5, 0.3 + pl.T * 1.1); } continue; }
    if (pl !== G.plane) { pl.in.thr = -1; pl.in.turn = 0; pl.in.pitch = 0; }
    pl.age += dt;
    if (pl.wreck) {
      if (pl.sinkT != null) { pl.sinkT += dt; pl.y -= dt * 0.8; if (pl.sinkT > 6) pl.m.root.visible = false; }
      else if (Math.random() < 0.4) FX.smoke.emit(pl.x + rand(-2, 2), pl.y + 1.5, pl.z + rand(-2, 2), rand(-0.5, 0.5), rand(2, 4), rand(-0.5, 0.5), rand(3, 6), rand(1.5, 3), COL.dark, 0.5, -0.2, 0.2, 1, 4);
      pl.sync(); continue;
    }
    const parked = pl.ground && !pl.pilot && Math.abs(pl.gs) < 0.05 && pl.T < 0.01;
    if (!parked) { const n = dt > 1 / 50 ? 2 : 1; for (let k = 0; k < n && !pl.wreck; k++) stepPlane(pl, dt / n); }
    if (pl.wreck) { pl.sync(); continue; }
    planeObstacles(pl);
    pl.sync();
    // propeller, afterburner, damage smoke
    if (pl.m.prop) { const sp = (pl.T * 0.9 + 0.1 * (pl.pilot ? 1 : 0)) * 60; pl.m.prop.rotation.z += sp * dt; pl.m.prop.disc.material.opacity = clamp(sp / 60, 0, 1) * 0.22; }
    if (pl.m.flame) { const on = pl.T > 0.05 && !pl.dead; pl.m.flame.visible = on; if (on) { const k = pl.T * (pl.T > 0.97 ? 1.6 : 1); pl.m.flame.scale.set(0.6 + k * 0.5, 0.6 + k * 0.5, 0.3 + k * 1.1 + Math.random() * 0.15); } }
    if (pl.dead || pl.hp < pl.def.hp * 0.4) { pl.smokeT -= dt; if (pl.smokeT <= 0) { pl.smokeT = 0.03; const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw); FX.smoke.emit(pl.x - fx * 2, pl.y + 1.6, pl.z - fz * 2, rand(-0.5, 0.5), rand(0.5, 1.5), rand(-0.5, 0.5), rand(2, 4), rand(1, 2), COL.dark, 0.6, -0.1, 0.3, 1.2, 4); if (pl.dead) FX.fire.emit(pl.x - fx * 1.2, pl.y + 1.6, pl.z - fz * 1.2, 0, 0.5, 0, 0.35, rand(0.8, 1.4), COL.fire, 1, -1, 1, 0.6, 4); } }
  }
  // wrecks clear away and fresh planes return to their stands while you are elsewhere
  const F = PF();
  for (const sp of PLANES.spots) {
    const pl = sp.plane;
    const gone = !pl || !PLANES.list.includes(pl) || pl.wreck || Math.hypot(pl.x - sp.x, pl.z - sp.z) > 30;
    if (!gone) { sp.emptyT = 0; continue; }
    sp.emptyT += dt;
    const far = !F || Math.hypot(F.x - sp.x, F.z - sp.z) > 160;
    if (sp.emptyT > 30 && far) {
      if (pl && pl.wreck) pl.remove();
      if (PLANES.list.some(o => !o.wreck && Math.hypot(o.x - sp.x, o.z - sp.z) < 12)) continue;
      sp.plane = new Plane(sp); PLANES.list.push(sp.plane); sp.emptyT = 0;
    }
  }
  for (const pl of [...PLANES.list]) if (pl.wreck && GT - pl.wreckT > 90 && (!F || Math.hypot(F.x - pl.x, F.z - pl.z) > 160)) pl.remove();
}
// arms up holding the parachute lines
function chutePose(p) {
  const P = p.pts, c = Math.cos(p.h), sn = Math.sin(p.h), s = p.scale;
  if (HERO.chute.free) { skydivePose(P, p.x, p.y, p.z, p.h, s, -(HERO.in.turn || 0) * 0.35); return; }
  for (const [sh, el, hd, sx] of [[2, 4, 6, 1], [3, 5, 7, -1]]) {
    const X = P[sh * 3], Y = P[sh * 3 + 1], Z = P[sh * 3 + 2];
    const ex = sx * 0.12 * s, ey = 0.26 * s; P[el * 3] = X + ex * c; P[el * 3 + 1] = Y + ey; P[el * 3 + 2] = Z - ex * sn;
    const hx = sx * 0.16 * s, hy = 0.54 * s; P[hd * 3] = X + hx * c; P[hd * 3 + 1] = Y + hy; P[hd * 3 + 2] = Z - hx * sn;
  }
}
