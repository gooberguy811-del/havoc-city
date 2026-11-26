// =====================================================================
//  CARS: body definitions, procedural models, garage scene
// =====================================================================
const BODIES = {
  viper: {
    name: 'Viper GT', blurb: 'Balanced street coupe. Good at everything.', L: 4.45, W: 1.95, wb: 2.62, wr: 0.35, track: 1.64, base: 0.30,
    top: [[-2.22, 0.32], [-2.27, 0.62], [-2.13, 0.86], [-1.8, 0.93], [0.7, 0.87], [1.72, 0.73], [2.18, 0.62], [2.27, 0.45], [2.2, 0.3]],
    cabin: [[-1.72, 0.9], [-1.02, 1.29], [-0.1, 1.31], [0.74, 0.86]], hl: [2.17, 0.62], tl: [-2.25, 0.78], deck: [-2.0, 0.9],
    stats: { top: 60, acc: 13.5, grip: 1.0, mass: 1300, hp: 100 }
  },
  brute: {
    name: 'Brute SS', blurb: 'Heavy muscle car. Huge torque, wins every shoving match.', L: 4.85, W: 2.0, wb: 2.85, wr: 0.37, track: 1.7, base: 0.32,
    top: [[-2.42, 0.34], [-2.46, 0.7], [-2.32, 0.96], [-1.55, 0.99], [0.55, 0.99], [2.3, 0.95], [2.46, 0.8], [2.46, 0.42], [2.38, 0.32]],
    cabin: [[-1.5, 0.97], [-0.92, 1.39], [0.06, 1.41], [0.64, 0.97]], hl: [2.44, 0.76], tl: [-2.44, 0.82], deck: [-2.2, 0.98],
    stats: { top: 58, acc: 14.5, grip: 0.9, mass: 1650, hp: 130 }
  },
  ranger: {
    name: 'Ranger 4x4', blurb: 'Lifted pickup. Slow, but it shrugs off police rams.', L: 5.3, W: 2.05, wb: 3.2, wr: 0.45, track: 1.76, base: 0.5,
    top: [[-2.62, 0.52], [-2.66, 1.2], [1.0, 1.22], [2.42, 1.13], [2.65, 0.96], [2.66, 0.56], [2.58, 0.48]],
    cabin: [[-0.66, 1.19], [-0.6, 1.93], [0.5, 1.93], [1.08, 1.2]], bed: [-2.5, -0.74], hl: [2.6, 1.0], tl: [-2.64, 1.02], deck: [-2.45, 1.21],
    stats: { top: 50, acc: 11.5, grip: 0.86, mass: 2100, hp: 175 }
  },
  comet: {
    name: 'Comet R', blurb: 'Mid-engine wedge. Fastest car in town, and the most fragile.', L: 4.55, W: 2.02, wb: 2.7, wr: 0.35, track: 1.72, base: 0.29,
    top: [[-2.25, 0.33], [-2.3, 0.76], [-2.12, 0.89], [-0.95, 0.95], [0.35, 0.78], [1.62, 0.6], [2.3, 0.46], [2.32, 0.32]],
    cabin: [[-1.28, 0.92], [-0.75, 1.16], [0.02, 1.15], [0.98, 0.7]], hl: [2.16, 0.5], tl: [-2.27, 0.76], deck: [-1.95, 0.9],
    stats: { top: 68, acc: 16, grip: 1.12, mass: 1250, hp: 80 }
  },
  bubble: {
    name: 'Bubble', blurb: 'Tiny hatchback. Light, nimble, easy to fling.', L: 3.75, W: 1.8, wb: 2.4, wr: 0.33, track: 1.54, base: 0.3,
    top: [[-1.85, 0.33], [-1.9, 0.95], [-1.76, 1.0], [0.55, 0.98], [1.6, 0.86], [1.88, 0.7], [1.9, 0.4], [1.85, 0.3]],
    cabin: [[-1.8, 0.97], [-1.62, 1.5], [0.2, 1.52], [0.86, 0.96]], hl: [1.84, 0.74], tl: [-1.89, 0.86], deck: [-1.7, 1.52],
    stats: { top: 50, acc: 12, grip: 1.08, mass: 1000, hp: 90 }
  },
  bike: {
    name: 'Razor 600', blurb: 'Sport motorbike. Explosive pace and it leans into corners, but crash and you fly off.', L: 2.1, W: 0.8, wb: 1.42, wr: 0.32, track: 0, base: 0.3, bike: true, style: 'sport', air: 1, tough: 1,
    stats: { top: 66, acc: 18.5, grip: 1.15, mass: 240, hp: 60 }
  },
  outlaw: {
    name: 'Outlaw', blurb: 'Long, low chopper. Lazy steering and a deep rumble, but it shrugs off knocks.', L: 2.6, W: 0.9, wb: 1.75, wr: 0.36, track: 0, base: 0.3, bike: true, style: 'cruiser', air: 0.6, tough: 1.35,
    stats: { top: 56, acc: 13, grip: 0.95, mass: 330, hp: 95 }
  },
  mudslinger: {
    name: 'Mudslinger', blurb: 'Dirt bike with long-travel forks. Lands big jumps without throwing you off.', L: 2.15, W: 0.8, wb: 1.45, wr: 0.35, track: 0, base: 0.3, bike: true, style: 'dirt', accent: '#f5b700', air: 1.25, tough: 1.1, land: 2.0,
    stats: { top: 52, acc: 17, grip: 1.1, mass: 190, hp: 55 }
  },
  zippy: {
    name: 'Zippy', blurb: 'Cheeky little scooter. Slow, nimble and surprisingly fun.', L: 1.75, W: 0.7, wb: 1.15, wr: 0.22, track: 0, base: 0.3, bike: true, style: 'scooter', air: 0.7, tough: 0.9,
    stats: { top: 32, acc: 10, grip: 1.2, mass: 120, hp: 40 }
  },
  flipking: {
    name: 'Flip King', blurb: 'Freestyle motocross bike from the Flip It job. Spins faster in the air and lands almost anything.', L: 2.15, W: 0.8, wb: 1.45, wr: 0.35, track: 0, base: 0.3, bike: true, style: 'dirt', accent: '#ff2e88', unlock: 'flip', air: 1.7, tough: 1.3, land: 2.6,
    stats: { top: 58, acc: 19.5, grip: 1.15, mass: 180, hp: 75 }
  },
  // the Roadster's two-wheeled sibling: an electric superbike with the same SpaceX thruster pack
  voltbike: {
    name: 'Volt RR', blurb: 'All-electric superbike from the Testing Zone, with the same SpaceX thruster pack as the Roadster: hold J to fly on compressed air. Silent, savage off the line and the fastest thing on two wheels. Stays level in the air unless you hold S for a backflip.', L: 2.15, W: 0.8, wb: 1.45, wr: 0.32, track: 0, base: 0.3, bike: true, style: 'sport', accent: '#36c5ff', unlock: 'voltbike', electric: true, thrusters: true, flipS: true, air: 1.3, tough: 1.15, land: 2.2,
    stats: { top: 80, acc: 24, grip: 1.2, mass: 230, hp: 70 }
  },
  phantom: {
    name: 'Phantom X', blurb: 'Armoured hypercar from the airport heist. The fastest, toughest thing on four wheels.', L: 4.7, W: 2.05, wb: 2.8, wr: 0.36, track: 1.74, base: 0.27, unlock: 'heist',
    top: [[-2.35, 0.3], [-2.38, 0.72], [-2.2, 0.84], [-1.1, 0.88], [0.2, 0.75], [1.4, 0.56], [2.32, 0.4], [2.35, 0.28]],
    cabin: [[-1.15, 0.86], [-0.6, 1.12], [0.15, 1.1], [0.95, 0.63]], hl: [2.2, 0.46], tl: [-2.36, 0.74], deck: [-2.1, 0.88],
    stats: { top: 78, acc: 19.5, grip: 1.25, mass: 1450, hp: 175 }
  },
  // all-electric: a long, low wedge with no grille, a glass canopy, slim light bars and a short tail; silent and savage off the line
  roadster: {
    name: 'Tesla Roadster', blurb: 'All-electric hypercar from the Testing Zone, with a SpaceX thruster pack: hold J to fly on compressed air. Near-silent, a launch like a catapult and the highest top speed of anything on wheels.', L: 4.35, W: 1.98, wb: 2.65, wr: 0.36, track: 1.7, base: 0.27, unlock: 'roadster', electric: true, thrusters: true,
    top: [[-2.17, 0.31], [-2.2, 0.66], [-2.05, 0.82], [-1.5, 0.86], [-0.55, 0.84], [0.55, 0.76], [1.5, 0.62], [2.06, 0.5], [2.17, 0.4], [2.15, 0.3]],
    cabin: [[-1.6, 0.85], [-0.9, 1.19], [0.05, 1.22], [1.0, 0.75]], hl: [2.07, 0.52], tl: [-2.19, 0.74], deck: [-1.95, 0.85],
    stats: { top: 86, acc: 22, grip: 1.2, mass: 1700, hp: 110 }
  }
};
const bodyLocked = k => { const B = BODIES[k]; return !!(B && B.unlock && !(typeof MIS !== 'undefined' && MIS.unlocked && MIS.unlocked[B.unlock])); };
const RIMS = { sport: ['Five-spoke', 'Classic sport'], disc: ['Aero disc', 'Solid and smooth'], mesh: ['Mesh', 'Ten fine spokes'], classic: ['Hubcap', 'Old-school chrome'] };
const TRAFFIC_COLORS = ['#e8e8e8', '#202226', '#8d939b', '#5d1f24', '#1f3d6b', '#c9c2b0', '#3f5f45', '#a33b2d', '#d8b24a', '#6e7a86', '#f2f2f2', '#2b2f36', '#7b2f53'];
const geoCache = new Map();
const cached = (k, fn) => { if (!geoCache.has(k)) geoCache.set(k, fn()); return geoCache.get(k); };

function surfX(top, y, front) {
  let best = front ? -1e9 : 1e9, found = false;
  for (let i = 0; i < top.length - 1; i++) {
    const [x1, y1] = top[i], [x2, y2] = top[i + 1];
    if ((front && x1 < 0 && x2 < 0) || (!front && x1 > 0 && x2 > 0)) continue;
    if (y1 === y2 || y < Math.min(y1, y2) || y > Math.max(y1, y2)) continue;
    const x = x1 + (x2 - x1) * (y - y1) / (y2 - y1);
    if (front ? x > best : x < best) { best = x; found = true; }
  }
  if (!found) best = front ? Math.max(...top.map(p => p[0])) : Math.min(...top.map(p => p[0]));
  return best;
}
// smooth shading across shallow angles (bevels, arches) while keeping hard creases
function creaseNormals(g, deg = 38) {
  if (g.index) { g.computeVertexNormals(); return g; }
  const P = g.attributes.position.array, n = P.length / 3, ct = Math.cos(deg * Math.PI / 180), F = new Float32Array(n * 3);
  for (let i = 0; i + 2 < n; i += 3) {
    const a = i * 3, b = a + 3, c = a + 6;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let k = 0; k < 9; k += 3) { F[a + k] = nx; F[a + k + 1] = ny; F[a + k + 2] = nz; }
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) { const k = Math.round(P[i * 3] * 2000) + '_' + Math.round(P[i * 3 + 1] * 2000) + '_' + Math.round(P[i * 3 + 2] * 2000); let arr = groups.get(k); if (!arr) groups.set(k, arr = []); arr.push(i); }
  const N = new Float32Array(n * 3);
  for (const arr of groups.values()) for (const i of arr) {
    const fx = F[i * 3], fy = F[i * 3 + 1], fz = F[i * 3 + 2]; let sx = 0, sy = 0, sz = 0;
    for (const j of arr) { const gx = F[j * 3], gy = F[j * 3 + 1], gz = F[j * 3 + 2]; if (fx * gx + fy * gy + fz * gz >= ct) { sx += gx; sy += gy; sz += gz; } }
    const l = Math.hypot(sx, sy, sz); if (l > 1e-6) { N[i * 3] = sx / l; N[i * 3 + 1] = sy / l; N[i * 3 + 2] = sz / l; } else { N[i * 3] = fx; N[i * 3 + 1] = fy; N[i * 3 + 2] = fz; }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return g;
}
function extrudeX(shape, depth, bv) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 3, steps: 1 });
  g.rotateY(-Math.PI / 2); g.translate(depth / 2, 0, 0); return g;
}
function carGeometry(cfg, police) {
  const key = [cfg.body, cfg.height, cfg.wheel, cfg.spoiler, cfg.stripes ? 1 : 0, cfg.rim, police ? 1 : 0].join('|');
  return cached('car:' + key, () => {
    const B = BODIES[cfg.body] || BODIES.viper;
    const hOff = { low: -0.05, stock: 0, lifted: 0.16 }[cfg.height] || 0;
    const ws = { s: 0.93, m: 1, l: 1.1 }[cfg.wheel] || 1;
    const wr = B.wr * ws, R = wr + 0.07, Wd = B.W, bv = 0.05;
    const top = B.top.map(p => [p[0], p[1] + hOff]);
    const base = B.base + hOff;
    const sh = new THREE.Shape();
    sh.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) sh.lineTo(top[i][0], top[i][1]);
    for (const ax of [B.wb / 2, -B.wb / 2]) {
      const a0 = Math.asin(clamp((base - wr) / R, -0.95, 0.95));
      sh.lineTo(ax + R * Math.cos(a0), base);
      for (let k = 1; k < 10; k++) { const a = a0 + (Math.PI - 2 * a0) * k / 10; sh.lineTo(ax + R * Math.cos(a), wr + R * Math.sin(a)); }
      sh.lineTo(ax - R * Math.cos(a0), base);
    }
    sh.lineTo(top[0][0], base);
    const paint = [extrudeX(sh, Wd - 2 * bv, bv)];
    let stripe = null;
    if (cfg.stripes) {
      const s1 = extrudeX(sh, 0.2, bv); s1.scale(1, 1.006, 1.003); const s2 = s1.clone();
      s1.translate(0.17, 0, 0); s2.translate(-0.17, 0, 0); stripe = [s1, s2];
    }
    const cab = B.cabin.map(p => [p[0], p[1] + hOff]);
    const cs = new THREE.Shape(); cs.moveTo(cab[0][0], cab[0][1]); for (let i = 1; i < cab.length; i++) cs.lineTo(cab[i][0], cab[i][1]); cs.lineTo(cab[0][0], cab[0][1]);
    const cw = Wd * 0.82;
    const cabin = extrudeX(cs, cw - 0.08, 0.04);
    const r1 = cab[1], r2 = cab[2];
    const rs = new THREE.Shape(); rs.moveTo(r1[0] + 0.02, r1[1] - 0.03); rs.lineTo(r2[0] - 0.02, r2[1] - 0.03); rs.lineTo(r2[0] - 0.04, r2[1] + 0.05); rs.lineTo(r1[0] + 0.04, r1[1] + 0.05); rs.lineTo(r1[0] + 0.02, r1[1] - 0.03);
    paint.push(extrudeX(rs, cw - 0.02, 0.025));
    if (stripe) { const rsS = extrudeX(rs, 0.2, 0.025); rsS.scale(1, 1.006, 1); const b = rsS.clone(); rsS.translate(0.17, 0, 0); b.translate(-0.17, 0, 0); stripe.push(rsS, b); }
    const roofY = Math.max(r1[1], r2[1]) + 0.075, roofZ = (r1[0] + r2[0]) / 2;
    // painted A and C pillars framing the side glass
    const pill = (p0, p1, w0, w1) => { const s0 = new THREE.Shape(); s0.moveTo(p0[0], p0[1]); s0.lineTo(p1[0], p1[1] + 0.02); s0.lineTo(p1[0] + w1, p1[1] + 0.02); s0.lineTo(p0[0] + w0, p0[1]); s0.lineTo(p0[0], p0[1]); return s0; };
    const cP = pill(cab[0], cab[1], 0.5, 0.3), aP = pill(cab[3], cab[2], -0.2, -0.12);
    for (const sd of [1, -1]) for (const sh2 of [cP, aP]) { const g = extrudeX(sh2, 0.03, 0); g.translate(sd * (cw / 2 + 0.012), 0, 0); paint.push(g); }
    const trim = [], chrome = [];
    const deck = [B.deck[0], B.deck[1] + hOff];
    if (cfg.spoiler === 'lip') paint.push(boxG(Wd - 0.36, 0.05, 0.26, 0, deck[1] + 0.075, deck[0] + 0.02));
    if (cfg.spoiler === 'wing') {
      for (const s of [1, -1]) { trim.push(boxG(0.06, 0.36, 0.14, s * 0.52, deck[1] + 0.2, deck[0] + 0.04)); trim.push(boxG(0.03, 0.2, 0.48, s * (Wd / 2 - 0.03), deck[1] + 0.4, deck[0] - 0.02)); }
      const plank = new THREE.BoxGeometry(Wd - 0.06, 0.05, 0.44); plank.rotateX(-0.12); plank.translate(0, deck[1] + 0.4, deck[0] - 0.02); paint.push(plank);
    }
    // trim details
    const hy = B.hl[1] + hOff, hz = surfX(top, hy, true) + bv;
    const gy = hy - 0.15, gz = surfX(top, gy, true) + bv;
    trim.push(boxG(Wd * 0.44, 0.13, 0.06, 0, gy, gz - 0.02));
    for (const s of [1, -1]) {
      trim.push(boxG(0.05, 0.09, Math.max(0.3, B.wb - 2 * R - 0.05), s * (Wd / 2 + 0.005), base + 0.02, 0));
      trim.push(boxG(0.2, 0.1, 0.13, s * (cw / 2 + 0.13), cab[0][1] + 0.1, cab[3][0] - 0.22));
    }
    const ry = base + 0.1, rz = surfX(top, ry, false) - bv;
    trim.push(boxG(Wd * 0.66, 0.1, 0.12, 0, ry, rz + 0.04));
    for (const s of [1, -1]) { const ex = new THREE.CylinderGeometry(0.055, 0.055, 0.2, 10); ex.rotateX(Math.PI / 2); ex.translate(s * 0.4, base + 0.13, rz - 0.02); chrome.push(ex); }
    if (B.bed) {
      const by = 1.2 + hOff + bv;
      trim.push(boxG(Wd - 0.3, 0.02, B.bed[1] - B.bed[0], 0, by + 0.006, (B.bed[0] + B.bed[1]) / 2));
      for (const s of [1, -1]) paint.push(boxG(0.12, 0.06, B.bed[1] - B.bed[0] + 0.1, s * (Wd / 2 - 0.08), by + 0.03, (B.bed[0] + B.bed[1]) / 2));
      paint.push(boxG(Wd - 0.06, 0.06, 0.1, 0, by + 0.03, B.bed[0] - 0.05));
    }
    const head = mergeGeos([boxG(0.4, 0.12, 0.1, Wd / 2 - 0.36, hy, hz - 0.03), boxG(0.4, 0.12, 0.1, -(Wd / 2 - 0.36), hy, hz - 0.03)]);
    const ty = B.tl[1] + hOff, tz = surfX(top, ty, false) - bv;
    const tail = mergeGeos([boxG(0.44, 0.1, 0.08, Wd / 2 - 0.32, ty, tz + 0.025), boxG(0.44, 0.1, 0.08, -(Wd / 2 - 0.32), ty, tz + 0.025)]);
    const py = ty - 0.2, pzr = surfX(top, py, false) - bv - 0.012;
    const plate = new THREE.PlaneGeometry(0.5, 0.125); plate.rotateY(Math.PI); plate.translate(0, py, pzr);
    let sirenR = null, sirenB = null, door = null;
    if (police) {
      trim.push(boxG(1.15, 0.07, 0.3, 0, roofY + 0.035, roofZ));
      sirenR = boxG(0.5, 0.11, 0.26, 0.28, roofY + 0.12, roofZ); sirenB = boxG(0.5, 0.11, 0.26, -0.28, roofY + 0.12, roofZ);
      const fz = surfX(top, base + 0.3, true) + bv;
      trim.push(boxG(Wd * 0.62, 0.3, 0.08, 0, base + 0.3, fz + 0.1));
      for (const s of [1, -1]) trim.push(boxG(0.08, 0.36, 0.2, s * 0.45, base + 0.3, fz + 0.02));
      const d1 = new THREE.PlaneGeometry(1.45, 0.36); d1.rotateY(Math.PI / 2); d1.translate(Wd / 2 + 0.004, base + 0.42, -0.15);
      const d2 = new THREE.PlaneGeometry(1.45, 0.36); d2.rotateY(-Math.PI / 2); d2.translate(-Wd / 2 - 0.004, base + 0.42, -0.15);
      door = mergeGeos([d1, d2]);
    }
    const by = base + 0.17;
    const bumperF = boxG(Wd * 0.94, 0.22, 0.16, 0, by, surfX(top, by, true) + bv - 0.02);
    const bumperR = boxG(Wd * 0.94, 0.22, 0.16, 0, by, surfX(top, by, false) - bv + 0.02);
    const front = Math.max(...top.map(p => p[0])) + bv, rear = Math.min(...top.map(p => p[0])) - bv;
    const tw = 0.27 * ws;
    return {
      paint: creaseNormals(mergeGeos(paint)), stripe: stripe ? creaseNormals(mergeGeos(stripe)) : null, cabin: creaseNormals(cabin), trim: mergeGeos(trim), chrome: mergeGeos(chrome), head, tail, plate, sirenR, sirenB, door, bumperF, bumperR,
      tire: tireGeo(wr, tw), rim: rimGeo(cfg.rim, wr, tw),
      neon: (() => { const g = new THREE.PlaneGeometry(Wd + 0.9, front - rear + 0.7); g.rotateX(-Math.PI / 2); g.translate(0, 0, (front + rear) / 2); return g; })(),
      shadow: (() => { const g = new THREE.PlaneGeometry(Wd + 0.6, front - rear + 0.5); g.rotateX(-Math.PI / 2); g.translate(0, 0, (front + rear) / 2); return g; })(),
      dims: { front, rear, L: front - rear, W: Wd, H: roofY + (police ? 0.18 : 0), wb: B.wb, wr, track: B.track, tw, hy, hz, ty, tz, roofY, roofZ, base }
    };
  });
}
function tireGeo(wr, tw) {
  return cached(`tire:${wr.toFixed(3)}:${tw.toFixed(3)}`, () => { const g = new THREE.CylinderGeometry(wr, wr, tw, 20, 1); g.rotateZ(Math.PI / 2); return g; });
}
function rimGeo(style, wr, tw) {
  return cached(`rim:${style}:${wr.toFixed(3)}:${tw.toFixed(3)}`, () => {
    const parts = [];
    const face = tw / 2 + 0.006;
    const disc = (r, th, x) => { const g = new THREE.CylinderGeometry(r, r, th, 22); g.rotateZ(Math.PI / 2); g.translate(x, 0, 0); return g; };
    parts.push(disc(wr * 0.66, tw * 0.6, tw * 0.22));
    const spokes = (n, w, len, r0) => { for (let k = 0; k < n; k++) { const g = new THREE.BoxGeometry(0.03, len, w); g.translate(0, r0 + len / 2, 0); g.rotateX(k * TAU / n); g.translate(face + 0.012, 0, 0); parts.push(g); } };
    if (style === 'sport') { parts.push(disc(wr * 0.6, 0.02, face - 0.01)); spokes(5, 0.075, wr * 0.48, wr * 0.08); parts.push(disc(0.065, 0.05, face + 0.02)); }
    else if (style === 'mesh') { parts.push(disc(wr * 0.62, 0.02, face - 0.01)); spokes(10, 0.028, wr * 0.52, wr * 0.06); const t = new THREE.TorusGeometry(wr * 0.6, 0.018, 6, 26); t.rotateY(Math.PI / 2); t.translate(face + 0.015, 0, 0); parts.push(t); parts.push(disc(0.06, 0.05, face + 0.02)); }
    else if (style === 'disc') { parts.push(disc(wr * 0.62, 0.035, face + 0.005)); parts.push(disc(wr * 0.22, 0.05, face + 0.02)); }
    else { parts.push(disc(wr * 0.62, 0.03, face)); for (const rr of [0.5, 0.32]) { const t = new THREE.TorusGeometry(wr * rr, 0.02, 6, 26); t.rotateY(Math.PI / 2); t.translate(face + 0.016, 0, 0); parts.push(t); } parts.push(disc(0.08, 0.06, face + 0.03)); }
    return mergeGeos(parts);
  });
}
const rimMatCache = new Map();
function rimMat(hex) { if (!rimMatCache.has(hex)) rimMatCache.set(hex, new THREE.MeshStandardMaterial({ color: C(hex), metalness: 0.95, roughness: 0.22 })); return rimMatCache.get(hex); }
const neonMatCache = new Map();
function neonMat(hex) { if (!neonMatCache.has(hex)) neonMatCache.set(hex, new THREE.MeshBasicMaterial({ color: C(hex), map: TEX.glow, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); return neonMatCache.get(hex); }
let shadowMat = null;

// ---------- motorbike: own model, same interface as a car model ----------
const RIDER_MATS = new Map();
function riderMat(hex) { if (!RIDER_MATS.has(hex)) RIDER_MATS.set(hex, new THREE.MeshStandardMaterial({ color: C(hex), roughness: 0.75 })); return RIDER_MATS.get(hex); }
function setRiderLook(m, look) {
  if (!m.rider || !look) return; const r = m.rider.userData;
  r.shirt.material = riderMat(look.shirt || '#2f6f4f'); r.pants.material = riderMat(look.pants || '#2a3550'); r.skin.material = riderMat(look.skin || '#c68863'); r.helmet.material = getPaint(look.helmet || look.shirt || '#121316', 'gloss');
}
// a limb or bar between two points, baked into a geometry
function limbGeo(a, b, t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 0.01;
  const g = new THREE.BoxGeometry(t, t, L), m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx / L, dy / L, dz / L));
  m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m); return g;
}
// per-style layout: wheels, frame, seat, bars, pegs and where the rider's eyes end up
const BIKE_STYLE = {
  sport: { wrF: 0.32, wrR: 0.32, tw: 0.16, seat: [1.0, -0.22], bar: [1.13, 0.5, 0.31], peg: [0.6, -0.12], lean: 0.75, head: [0.98, 0.62], eye: 1.74 },
  cruiser: { wrF: 0.34, wrR: 0.36, tw: 0.14, twR: 0.24, seat: [0.76, -0.32], bar: [1.42, 0.62, 0.42], peg: [0.42, 0.62], lean: 0.08, head: [1.0, 0.86], eye: 1.62, rake: 0.55 },
  dirt: { wrF: 0.38, wrR: 0.35, tw: 0.13, seat: [1.1, -0.18], bar: [1.3, 0.48, 0.38], peg: [0.52, 0.0], lean: 0.42, head: [1.12, 0.6], eye: 1.86 },
  scooter: { wrF: 0.22, wrR: 0.22, tw: 0.13, seat: [0.82, -0.28], bar: [1.12, 0.38, 0.27], peg: [0.3, 0.12], lean: 0.05, head: [1.0, 0.46], eye: 1.6 }
};
function buildBikeModel(cfg, opts = {}) {
  const B = BODIES[cfg.body] || BODIES.bike, sty = B.style || 'sport', ST = BIKE_STYLE[sty], hb = B.wb / 2;
  const root = new THREE.Group(), hc = 0.02;
  const pivot = new THREE.Group(); pivot.position.y = hc; pivot.rotation.order = 'YXZ'; root.add(pivot);
  const inner = new THREE.Group(); inner.position.y = -hc; pivot.add(inner);
  const body = new THREE.Group(); inner.add(body);
  const bx = (w, h, d, x, y, z, rx) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); return g; };
  const ball = (r, sx, sy, sz, x, y, z) => { const g = new THREE.SphereGeometry(r, 14, 10); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
  const paintMat = getPaint(cfg.paint, cfg.finish), accent = getPaint(B.accent || cfg.stripe || '#f2f2f2', 'gloss');
  const mk = (geo, mat, cast, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; parent.add(m); return m; };
  const P = [], T = [], CH = [], A = [];   // paint, trim, chrome, accent geometry
  let glassG, headG, tailG, plateG, fendF, fendR;
  const wrF = ST.wrF, wrR = ST.wrR;
  if (sty === 'sport') {
    P.push(ball(0.3, 0.72, 0.52, 1.15, 0, 0.93, 0.14), bx(0.46, 0.42, 0.5, 0, 0.96, 0.6, -0.45), bx(0.28, 0.16, 0.62, 0, 1.0, -0.56, 0.22), bx(0.5, 0.3, 0.7, 0, 0.62, 0.32));
    T.push(bx(0.3, 0.08, 0.56, 0, 1.0, -0.22), bx(0.34, 0.36, 0.5, 0, 0.5, 0.02), bx(0.08, 0.08, 0.95, 0, 0.42, -0.4, 0.15));
    const ex = new THREE.CylinderGeometry(0.06, 0.07, 0.75, 10); ex.rotateX(Math.PI / 2 - 0.12); ex.translate(0.17, 0.5, -0.5); CH.push(ex, bx(0.05, 0.05, 0.9, 0, 0.78, 0.25, 0.5));
    glassG = bx(0.36, 0.26, 0.04, 0, 1.24, 0.74, -0.5); headG = bx(0.18, 0.12, 0.06, 0, 0.98, 0.88); tailG = bx(0.16, 0.06, 0.04, 0, 1.05, -0.88); plateG = bx(0.2, 0.12, 0.02, 0, 0.84, -0.9, 0.3);
    fendF = bx(0.16, 0.05, 0.62, 0, wrF * 2 + 0.06, hb + 0.06, -0.15); fendR = bx(0.18, 0.05, 0.5, 0, wrR * 2 + 0.12, -hb + 0.05, 0.35);
    if (cfg.stripes) A.push(bx(0.1, 0.02, 0.64, 0, 1.085, 0.14), bx(0.1, 0.02, 0.5, 0, 1.17, 0.58, -0.45));
  } else if (sty === 'cruiser') {
    P.push(ball(0.26, 0.66, 0.5, 1.25, 0, 0.92, 0.22), bx(0.22, 0.24, 0.42, 0, 0.66, -0.12));
    T.push(bx(0.34, 0.1, 0.5, 0, 0.8, -0.34), bx(0.2, 0.22, 0.16, 0, 0.96, -0.62), bx(0.07, 0.07, 1.2, 0, 0.5, -0.1, 0.05));
    for (const s of [1, -1]) { const ex = new THREE.CylinderGeometry(0.05, 0.06, 1.3, 10); ex.rotateX(Math.PI / 2 - 0.05); ex.translate(s * 0.2, 0.36, -0.42); CH.push(ex); const cyl = new THREE.CylinderGeometry(0.1, 0.1, 0.34, 12); cyl.rotateX(s * 0.5); cyl.translate(0, 0.6, s * 0.12 + 0.12); CH.push(cyl); }
    CH.push(bx(0.06, 0.06, 1.0, 0, 0.84, 0.42, 0.62), bx(0.06, 0.06, 0.6, 0.12, 0.38, -0.55, -0.3), bx(0.06, 0.06, 0.6, -0.12, 0.38, -0.55, -0.3));
    glassG = bx(0.12, 0.08, 0.03, 0, 1.02, 0.62); headG = ball(0.13, 1, 1, 0.6, 0, 1.0, hb + 0.2); tailG = bx(0.14, 0.06, 0.04, 0, 0.88, -1.22); plateG = bx(0.2, 0.12, 0.02, 0, 0.72, -1.22, 0.2);
    fendF = bx(0.14, 0.04, 0.5, 0, wrF * 2 + 0.05, hb + 0.08, -0.1); fendR = bx(0.3, 0.06, 0.8, 0, wrR * 2 + 0.04, -hb + 0.08, 0.25);
    if (cfg.stripes) A.push(ball(0.2, 0.3, 0.52, 1.0, 0, 0.94, 0.22));
  } else if (sty === 'dirt') {
    P.push(ball(0.24, 0.7, 0.55, 1.1, 0, 0.98, 0.18), bx(0.3, 0.2, 0.36, 0.0, 0.8, -0.12), bx(0.06, 0.32, 0.5, 0.17, 0.86, -0.46, 0.25), bx(0.06, 0.32, 0.5, -0.17, 0.86, -0.46, 0.25));
    T.push(bx(0.24, 0.08, 0.8, 0, 1.08, -0.3, 0.06), bx(0.28, 0.3, 0.36, 0, 0.52, 0.06), bx(0.07, 0.07, 1.0, 0.14, 0.62, -0.42, 0.45));
    const ex = new THREE.CylinderGeometry(0.05, 0.055, 0.6, 10); ex.rotateX(Math.PI / 2 + 0.4); ex.translate(0.18, 0.85, -0.6); CH.push(ex);
    glassG = bx(0.1, 0.06, 0.03, 0, 1.16, 0.4); headG = bx(0.16, 0.1, 0.05, 0, 1.1, hb - 0.05); tailG = bx(0.1, 0.05, 0.03, 0, 1.02, -0.92); plateG = bx(0.16, 0.1, 0.02, 0, 0.9, -0.94, 0.4);
    fendF = bx(0.16, 0.04, 0.6, 0, wrF * 2 + 0.16, hb + 0.1, -0.25); fendR = bx(0.18, 0.04, 0.55, 0, 1.0, -0.78, -0.35);
    A.push(bx(0.3, 0.26, 0.03, 0, 1.12, hb - 0.12, -0.25));   // number board
  } else {   // scooter
    P.push(bx(0.46, 0.72, 0.1, 0, 0.56, hb - 0.24, -0.18), ball(0.32, 0.9, 0.62, 1.2, 0, 0.56, -0.36), bx(0.3, 0.12, 0.22, 0, 1.0, hb - 0.3));
    T.push(bx(0.36, 0.06, 0.62, 0, 0.26, 0.02), bx(0.3, 0.12, 0.5, 0, 0.86, -0.3), bx(0.08, 0.6, 0.08, 0, 0.62, hb - 0.32, -0.25));
    glassG = bx(0.3, 0.2, 0.03, 0, 1.22, hb - 0.24, -0.4); headG = ball(0.09, 1, 1, 0.6, 0, 1.0, hb - 0.16); tailG = bx(0.18, 0.05, 0.04, 0, 0.74, -0.78); plateG = bx(0.18, 0.1, 0.02, 0, 0.6, -0.8, 0.2);
    fendF = bx(0.14, 0.04, 0.36, 0, wrF * 2 + 0.04, hb + 0.02, -0.2); fendR = bx(0.2, 0.04, 0.3, 0, wrR * 2 + 0.05, -hb + 0.02, 0.2);
    if (cfg.stripes) A.push(bx(0.48, 0.08, 0.02, 0, 0.62, hb - 0.18, -0.18));
  }
  const paintMesh = mk(mergeGeos(P), paintMat, true);
  const stripeMesh = A.length ? mk(mergeGeos(A), accent, false) : null;
  const trimMesh = mk(mergeGeos(T), MAT.trim, !!opts.detail);
  if (CH.length) mk(mergeGeos(CH), MAT.chrome);
  const glassMesh = mk(glassG, MAT.glass[clamp(cfg.tint | 0, 0, 2)]);
  const headMesh = mk(headG, MAT.head);
  const tailMat = opts.ownTail ? MAT.tail.clone() : MAT.tail;
  const tailMesh = mk(tailG, tailMat);
  mk(plateG, plateMat((cfg.plate || '').slice(0, 7) || ' '));
  const bumperF = mk(fendF, paintMat, true), bumperR = mk(fendR, paintMat, true);
  if (opts.police) { mk(bx(0.08, 0.08, 0.08, 0.14, 1.12, -0.7), MAT.sirenR); mk(bx(0.08, 0.08, 0.08, -0.14, 1.12, -0.7), MAT.sirenB); }
  if (!shadowMat) shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: TEX.shadow, transparent: true, opacity: 0.55, depthWrite: false });
  if (opts.blob) { const sg = new THREE.PlaneGeometry(0.9, B.L + 0.3); sg.rotateX(-Math.PI / 2); const sm = mk(sg, shadowMat, false, root); sm.position.y = 0.025; sm.renderOrder = 1; }
  // wheels; the front one carries the fork and bars so they steer together
  const wheels = [], rm = rimMat(cfg.rimColor || '#c9ccd2');
  const headY = ST.head[0], headZ = ST.head[1];
  for (const sz of [1, -1]) {
    const wr = sz > 0 ? wrF : wrR, tw = sz > 0 ? ST.tw : (ST.twR || ST.tw), zc = sz > 0 ? hb + (ST.rake ? 0.25 : 0) : -hb;
    const wp = new THREE.Group(); wp.position.set(0, wr, zc);
    const spin = new THREE.Group(); wp.add(spin);
    const t = new THREE.Mesh(tireGeo(wr, tw), sty === 'dirt' ? MAT.trim : MAT.tire); t.castShadow = !!opts.detail; spin.add(t);
    const r1 = new THREE.Mesh(rimGeo(sty === 'dirt' || sty === 'cruiser' ? 'mesh' : (cfg.rim || 'sport'), wr * 0.98, tw), rm); spin.add(r1); const r2 = r1.clone(); r2.scale.x = -1; spin.add(r2);
    if (sz > 0) {
      const top = [0, headY - wr, headZ - zc], fork = [];
      for (const s of [1, -1]) fork.push(limbGeo([s * 0.1, 0, 0], [s * 0.1, top[1], top[2]], sty === 'dirt' ? 0.06 : 0.045));
      wp.add(new THREE.Mesh(mergeGeos(fork), sty === 'dirt' ? getPaint('#d4af37', 'metallic') : MAT.chrome));
      const by = ST.bar[0] - wr, bz = ST.bar[1] - zc, bw = ST.bar[2];
      const bars = [limbGeo([-bw, by, bz], [bw, by, bz], 0.04)];
      if (sty === 'cruiser') bars.push(limbGeo([0.1, top[1], top[2]], [0.12, by - 0.02, bz], 0.04), limbGeo([-0.1, top[1], top[2]], [-0.12, by - 0.02, bz], 0.04));
      wp.add(new THREE.Mesh(mergeGeos(bars), MAT.trim));
    }
    inner.add(wp); wheels.push({ pivot: wp, spin, front: sz > 0, bent: 0 });
  }
  // the rider, posed from the seat, bars and pegs of this bike
  const sY = ST.seat[0], sZ = ST.seat[1], a = ST.lean, hip = [0, sY + 0.08, sZ];
  const sh = [0, hip[1] + 0.5 * Math.cos(a), hip[2] + 0.5 * Math.sin(a)];
  const hands = [[ST.bar[2] - 0.02, ST.bar[0], ST.bar[1] + (ST.rake ? 0.25 : 0)], [-(ST.bar[2] - 0.02), ST.bar[0], ST.bar[1] + (ST.rake ? 0.25 : 0)]];
  const shirtG = [limbGeo(hip, sh, 0.34)], pantsG = [], skinG = [];
  for (let k = 0; k < 2; k++) {
    const s = k ? -1 : 1, S0 = [s * 0.2, sh[1] - 0.04, sh[2]], H = hands[k], E = [(S0[0] + H[0]) / 2 + s * 0.06, (S0[1] + H[1]) / 2 - 0.08, (S0[2] + H[2]) / 2];
    shirtG.push(limbGeo(S0, E, 0.1), limbGeo(E, H, 0.09)); skinG.push(bx(0.09, 0.09, 0.1, H[0], H[1], H[2]));
    const Hp = [s * 0.16, hip[1] - 0.04, hip[2]], Pg = [s * 0.2, ST.peg[0], ST.peg[1]];
    const K = [s * 0.21, Math.max(Hp[1], Pg[1]) + 0.08, (Hp[2] + Pg[2]) / 2 + 0.28];
    pantsG.push(limbGeo(Hp, K, 0.13), limbGeo(K, Pg, 0.12));
  }
  pantsG.push(bx(0.36, 0.16, 0.36, 0, hip[1] - 0.02, hip[2]));
  const rider = new THREE.Group(); body.add(rider);
  const shirt = new THREE.Mesh(mergeGeos(shirtG), riderMat('#2f6f4f')), pants = new THREE.Mesh(mergeGeos(pantsG), riderMat('#2a3550')), skin = new THREE.Mesh(mergeGeos(skinG), riderMat('#c68863'));
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), getPaint('#121316', 'gloss')); helmet.position.set(0, sh[1] + 0.24, sh[2] + 0.06);
  const visor = new THREE.Mesh(bx(0.2, 0.08, 0.05, 0, sh[1] + 0.25, sh[2] + 0.2), MAT.glass[2]);
  for (const m of [shirt, pants, helmet]) m.castShadow = true;
  rider.add(shirt, pants, skin, helmet, visor); rider.userData = { shirt, pants, skin, helmet }; rider.visible = false;
  let neon = null;
  if (cfg.neon && cfg.neon !== 'off') { const ng = new THREE.PlaneGeometry(0.7, B.L - 0.1); ng.rotateX(-Math.PI / 2); neon = new THREE.Mesh(ng, neonMat(cfg.neon)); neon.position.y = 0.035; neon.renderOrder = 3; root.add(neon); }
  const d = { L: B.L, W: B.W, H: 1.55, front: B.L / 2, rear: -B.L / 2, wr: wrR, wb: B.wb, track: 0.2 };
  return { root, pivot, inner, body, paintMesh, stripeMesh, glassMesh, trimMesh, headMesh, tailMesh, bumperF, bumperR, wheels, tailMat, dims: d, hc, police: !!opts.police, neon, ownTail: !!opts.ownTail, deformables: [paintMesh, trimMesh], rider, bike: true, eye: ST.eye };
}
function buildCarModel(cfg, opts = {}) {
  if (BODIES[cfg.body] && BODIES[cfg.body].bike) return buildBikeModel(cfg, opts);
  if (BODIES[cfg.body] && BODIES[cfg.body].tank) return buildTankModel(cfg, opts);
  const police = !!opts.police, G = carGeometry(cfg, police), d = G.dims;
  // root carries position + yaw; pivot (at the car's centre height) carries pitch + roll so cars can tumble
  const root = new THREE.Group();
  const hc = d.H * 0.5;
  const pivot = new THREE.Group(); pivot.position.y = hc; pivot.rotation.order = 'YXZ'; root.add(pivot);
  const inner = new THREE.Group(); inner.position.y = -hc; pivot.add(inner);
  const body = new THREE.Group(); inner.add(body);
  const mk = (geo, mat, cast, parent = body) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; parent.add(m); return m; };
  const paintMat = getPaint(cfg.paint, cfg.finish);
  const paintMesh = mk(G.paint, paintMat, true);
  let stripeMesh = null; if (G.stripe) stripeMesh = mk(G.stripe, getPaint(cfg.stripe, cfg.finish));
  const glassMesh = mk(G.cabin, MAT.glass[clamp(cfg.tint | 0, 0, 2)], !!opts.detail);
  const trimMesh = mk(G.trim, MAT.trim, !!opts.detail);
  mk(G.chrome, MAT.chrome);
  const headMesh = mk(G.head, MAT.head);
  const tailMat = opts.ownTail ? MAT.tail.clone() : MAT.tail;
  const tailMesh = mk(G.tail, tailMat);
  mk(G.plate, plateMat((cfg.plate || '').slice(0, 7) || ' '));
  const bumperF = mk(G.bumperF, paintMat, true), bumperR = mk(G.bumperR, paintMat, true);
  paintMesh.userData.crease = true; glassMesh.userData.crease = true; if (stripeMesh) stripeMesh.userData.crease = true;
  if (police) { mk(G.sirenR, MAT.sirenR); mk(G.sirenB, MAT.sirenB); mk(G.door, MAT.door); }
  if (!shadowMat) shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: TEX.shadow, transparent: true, opacity: 0.55, depthWrite: false });
  if (opts.blob) { const sm = mk(G.shadow, shadowMat, false, root); sm.position.y = 0.025; sm.renderOrder = 1; }
  const wheels = [], rm = rimMat(cfg.rimColor || '#c9ccd2');
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const wp = new THREE.Group(); wp.position.set(sx * d.track / 2, d.wr, sz * d.wb / 2);
    if (sx < 0) wp.scale.x = -1;
    const spin = new THREE.Group(); wp.add(spin);
    const t = new THREE.Mesh(G.tire, MAT.tire); t.castShadow = !!opts.detail; spin.add(t);
    spin.add(new THREE.Mesh(G.rim, rm));
    inner.add(wp); wheels.push({ pivot: wp, spin, front: sz > 0, bent: 0 });
  }
  let neon = null;
  if (cfg.neon && cfg.neon !== 'off') { neon = new THREE.Mesh(G.neon, neonMat(cfg.neon)); neon.position.y = 0.035; neon.renderOrder = 3; root.add(neon); }
  return { root, pivot, inner, body, paintMesh, stripeMesh, glassMesh, trimMesh, headMesh, tailMesh, bumperF, bumperR, wheels, tailMat, dims: d, hc, police, neon, ownTail: !!opts.ownTail, deformables: body.children.slice() };
}
function burnModel(m) {
  if (m.tank) { m.root.traverse(o => { if (o.isMesh) o.material = MAT.burnt; }); return; }
  m.paintMesh.material = MAT.burnt; if (m.stripeMesh) m.stripeMesh.material = MAT.burnt;
  m.bumperF.material = MAT.burnt; m.bumperR.material = MAT.burnt;
  m.glassMesh.material = MAT.burnt; if (m.neon) m.neon.visible = false;
}
function disposeModel(m) { if (m.ownTail) m.tailMat.dispose(); }

function randomTrafficCfg() {
  if (typeof W !== 'undefined' && W && W.id === 'base' && Math.random() < 0.4) return Object.assign({}, CAR_DEF, milCarCfg(), { plate: 'ARMY ' + ((Math.random() * 900 + 100) | 0) });
  if (typeof W !== 'undefined' && W && W.id === 'nyc' && Math.random() < 0.42) return Object.assign({}, CAR_DEF, { body: Math.random() < 0.7 ? 'viper' : 'bubble', paint: '#f2c21b', finish: 'gloss', rim: 'disc', rimColor: '#2a2c30', stripes: false, neon: 'off', tint: 1, spoiler: 'none', height: 'stock', plate: 'T ' + ((Math.random() * 9000 + 1000) | 0), engine: 2, handling: 2, brakes: 2, armor: 1, nitro: false });
  const body = Math.random() < 0.13 ? pick(['bike', 'bike', 'outlaw', 'mudslinger', 'zippy', 'zippy']) : pick(['viper', 'brute', 'ranger', 'bubble', 'bubble', 'viper', 'brute', 'comet']);
  return { body, paint: pick(TRAFFIC_COLORS), finish: Math.random() < 0.35 ? 'metallic' : 'gloss', stripes: Math.random() < 0.07, stripe: '#f2f2f2', rim: pick(['sport', 'disc', 'classic', 'mesh']), rimColor: pick(['#c9ccd2', '#c9ccd2', '#2a2c30', '#8a8f96']), wheel: 'm', spoiler: Math.random() < 0.12 ? 'lip' : 'none', neon: 'off', tint: Math.random() < 0.3 ? 2 : 1, height: body === 'ranger' && Math.random() < 0.5 ? 'lifted' : 'stock', plate: pick(['4KX 221', 'LMN 904', 'HVC 113', 'JTR 586', 'QWE 702', 'BRT 330']), engine: 2, handling: 2, brakes: 2, armor: 1, nitro: false };
}
const POLICE_CFG = { body: 'brute', paint: '#0f1217', finish: 'gloss', stripes: false, stripe: '#fff', rim: 'disc', rimColor: '#2a2c30', wheel: 'm', spoiler: 'none', neon: 'off', tint: 2, height: 'stock', plate: 'PD 0451', engine: 3, handling: 3, brakes: 3, armor: 2, nitro: false };

// ---------- garage / showroom scene ----------
const garage = { scene: null, cam: null, car: null, turn: null, yaw: 0.7, pitch: 0.16, dist: 8.6, drag: null, spin: 0.25, lastInteract: 0 };
function initGarage() {
  const s = new THREE.Scene(); garage.scene = s;
  s.background = C('#0a0c10'); s.fog = new THREE.Fog(C('#0a0c10'), 16, 42);
  s.environment = makeEnv(['#0b0d12', '#1a1e26', '#08090c'], [
    { w: 30, h: 4, c: '#ffffff', i: 3.2, pos: [0, 18, 0] }, { w: 20, h: 3, c: '#fff1d8', i: 2.4, pos: [16, 6, 8] }, { w: 20, h: 3, c: '#d8e6ff', i: 2.0, pos: [-16, 6, -6] },
    { w: 10, h: 2, c: '#ffb21e', i: 1.4, pos: [0, 3, -18] }]);
  garage.cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: C('#121419'), roughness: 0.38, metalness: 0.4 }));
  floor.rotation.x = -Math.PI / 2; s.add(floor);
  const turn = new THREE.Group(); garage.turn = turn; s.add(turn);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.8, 0.12, 72), new THREE.MeshStandardMaterial({ color: C('#1b1e25'), roughness: 0.3, metalness: 0.7 }));
  plat.position.y = 0.06; turn.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.76, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: C('#ffb21e') }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; s.add(ring);
  // hazard stripe arc on floor
  const stripes = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.0, 96, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: C('#2a2416') }));
  stripes.rotation.x = -Math.PI / 2; stripes.position.y = 0.005; s.add(stripes);
  // light strips on back wall
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 12, 64, 1, true), new THREE.MeshStandardMaterial({ color: C('#0d0f14'), roughness: 0.9, side: THREE.BackSide }));
  wall.position.y = 6; s.add(wall);
  const stripMat = new THREE.MeshBasicMaterial({ color: C('#c8d2e6') });
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 6), stripMat); m.position.set(Math.sin(a) * 21.6, 5.5, Math.cos(a) * 21.6); m.rotation.y = a + Math.PI / 2; s.add(m); }
  s.add(new THREE.HemisphereLight(C('#a8b8d8'), C('#0a0c10'), 0.55));
  const key = new THREE.SpotLight(C('#fff3e0'), 2.4, 40, 0.55, 0.6, 1); key.position.set(5, 11, 6); key.target.position.set(0, 0.6, 0); s.add(key, key.target);
  const rimA = new THREE.DirectionalLight(C('#ffb35a'), 0.7); rimA.position.set(-6, 3, -7); s.add(rimA);
  const rimB = new THREE.DirectionalLight(C('#8fb0ff'), 0.6); rimB.position.set(7, 2.5, -5); s.add(rimB);
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { if (APP.mode !== 'garage' && APP.mode !== 'menu') return; garage.drag = { x: e.clientX, y: e.clientY }; garage.lastInteract = performance.now(); });
  window.addEventListener('pointermove', e => { if (!garage.drag) return; garage.yaw -= (e.clientX - garage.drag.x) * 0.008; garage.pitch = clamp(garage.pitch + (e.clientY - garage.drag.y) * 0.004, 0.02, 0.6); garage.drag = { x: e.clientX, y: e.clientY }; garage.lastInteract = performance.now(); });
  window.addEventListener('pointerup', () => { garage.drag = null; });
  el.addEventListener('wheel', e => { if (APP.mode !== 'garage') return; garage.dist = clamp(garage.dist + e.deltaY * 0.005, 5.5, 13); }, { passive: true });
}
function garageSetCar(cfg) {
  if (garage.car) { garage.turn.remove(garage.car.root); disposeModel(garage.car); }
  garage.car = buildCarModel(cfg, { detail: true, blob: true });
  garage.car.root.position.y = 0.12; garage.turn.add(garage.car.root);
  MAT.head.emissiveIntensity = 1.2; MAT.tail.emissiveIntensity = 0.9;
}
function garageRender(dt, w, h) {
  if (!garage.drag && performance.now() - garage.lastInteract > 2500) garage.yaw += dt * garage.spin;
  const c = garage.cam, d = garage.dist * (w / h < 0.8 ? 1.6 : 1);
  c.position.set(Math.sin(garage.yaw) * d * Math.cos(garage.pitch), 0.7 + d * Math.sin(garage.pitch), Math.cos(garage.yaw) * d * Math.cos(garage.pitch));
  c.lookAt(0, 0.7, 0);
  c.aspect = w / h;
  const narrow = w < 760;
  if (APP.mode === 'menu') { if (narrow) c.setViewOffset(w, h, 0, h * 0.2, w, h); else c.setViewOffset(w, h, -w * 0.2, 0, w, h); }
  else if (APP.mode === 'garage') { if (narrow) c.setViewOffset(w, h, 0, h * 0.26, w, h); else c.setViewOffset(w, h, w * 0.17, 0, w, h); }
  else c.clearViewOffset();
  c.updateProjectionMatrix();
  for (const wh of garage.car ? garage.car.wheels : []) wh.spin.rotation.x = 0;
  renderer.render(garage.scene, c);
}
