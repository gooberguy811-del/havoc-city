// =====================================================================
//  DESTRUCTIBLE BUILDINGS: damage, smoke, collapse into rubble
//  Each structure owns vertex ranges inside the merged world meshes;
//  a collapse sinks and leans those vertices so batching is kept.
// =====================================================================
const STR = { list: [], active: [], grid: null, rubble: [] };
const _sq = [];
const RUBBLE_COLS = ['#8d8a84', '#77746f', '#a29d94', '#5f5c58'];
function partFromRange(mesh, idx) {
  if (!mesh || idx == null) return null;
  const r = mesh.geometry.userData.ranges && mesh.geometry.userData.ranges[idx]; if (!r || !r[1]) return null;
  const a = mesh.geometry.attributes.position.array;
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (let i = r[0] * 3, e = (r[0] + r[1]) * 3; i < e; i += 3) { const x = a[i], y = a[i + 1], z = a[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  return { mesh, start: r[0], count: r[1], cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, h: y1 - y0, top: y1, used: false };
}
function newStruct(x0, z0, x1, z1, y0, top, col, kind) {
  const vol = (x1 - x0) * (z1 - z0) * (top - y0);
  const hp = kind === 'canopy' ? 150 : kind === 'shop' ? 260 : clamp(70 + vol * 0.03, 140, 1100);
  return { x0, z0, x1, z1, y0, top, col: col || '#9a958c', kind: kind || 'bldg', hp, maxHp: hp, parts: [], boxes: [], bldgs: [], groups: [], hide: [], state: 0, t: 0, byPlayer: false, smoking: 0 };
}
function initStructs() {
  STR.list = []; STR.active = []; STR.rubble = [];
  const M = W.meshes || {}, inRect = (p, r, pad) => p.cx >= r.x0 - (pad || 0) && p.cx <= r.x1 + (pad || 0) && p.cz >= r.z0 - (pad || 0) && p.cz <= r.z1 + (pad || 0);
  // candidate loose parts: details, gable roofs, neon signs and their backing boards
  const loose = [];
  (W.detIdx || []).forEach(li => { const p = partFromRange(M.roof, li); if (p) loose.push(p); });
  for (const r of W.roofs) { const p = partFromRange(M.roof, r._li); if (p) { p.roofPart = true; loose.push(p); } }
  for (const s of W.neons) { const a = partFromRange(M.neon, s._li), b = partFromRange(M.roof, s._bi); if (a) { a.sign = true; loose.push(a); } if (b) { b.sign = true; loose.push(b); } }
  for (const s of W.bills || []) { const a = partFromRange(s.screen ? M.screen : M.bill, s._li); if (a) { a.sign = !!s.screen; loose.push(a); } }
  const bBoxes = W.boxes.filter(b => b.kind === 'b');
  // gas station canopies and stores
  for (const st of [...SHOP.list, ...MECH.list]) {
    const c = st.canopy ? newStruct(st.canopy.x0, st.canopy.z0, st.canopy.x1, st.canopy.z1, st.h, st.h + 5.75, '#e9e6e0', 'canopy') : null;
    const s = newStruct(st.shopR.x0, st.shopR.z0, st.shopR.x1, st.shopR.z1, st.h, st.h + (st.top || 5.4), st.wallCol || '#efe9dd', 'shop');
    if (st.kind === 'bank') s.hp = s.maxHp = 650; else if (st.kind === 'mech') s.hp = s.maxHp = 420;
    if (c) c.station = st; s.station = st; s.groups.push(st.roofG); if (st.glassM) s.hide.push(st.glassM);
    if (st.vault) s.groups.push(st.vault.g);
    for (const q of st.cases || []) s.hide.push(q.glassM, q.gemM);
    for (const q of st.cash || []) s.hide.push(q.m);
    for (const p of loose) {
      if (p.used) continue;
      if (c && inRect(p, st.canopy) && (p.cy >= st.h + 4 || p.h > 3.5)) { p.used = true; c.parts.push(p); }
      else if (inRect(p, st.shopR) && p.cy >= st.h + 0.2) { p.used = true; s.parts.push(p); }
    }
    for (const b of W.boxes) { const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; if (c && cx >= c.x0 && cx <= c.x1 && cz >= c.z0 && cz <= c.z1 && b.kind === 'p') c.boxes.push(b); else if (cx >= s.x0 && cx <= s.x1 && cz >= s.z0 && cz <= s.z1 && (b.kind !== 'p' || !c)) s.boxes.push(b); }
    if (c) STR.list.push(c); STR.list.push(s);
  }
  // ordinary buildings: a base with its own collider, plus any tiers stacked on top
  const tiers = [];
  for (const b of W.bldgs) {
    const box = bBoxes.find(q => Math.abs(q.x0 - b.x0) < 0.05 && Math.abs(q.x1 - b.x1) < 0.05 && Math.abs(q.z0 - b.z0) < 0.05 && Math.abs(q.z1 - b.z1) < 0.05 && Math.abs(q.h - (b.y + b.h)) < 0.2 && !q.struct);
    if (!box) { tiers.push(b); continue; }
    const s = newStruct(b.x0, b.z0, b.x1, b.z1, b.y, b.y + b.h, b.col, 'bldg');
    s.boxes.push(box); s.bldgs.push(b); box.struct = s;
    const p = partFromRange(M[b.tex], b._li); if (p) s.parts.push(p);
    if (b._si != null) { const q = partFromRange(M.shopf, b._si); if (q) s.parts.push(q); }
    STR.list.push(s);
  }
  for (const b of tiers) {
    const s = STR.list.find(q => q.kind === 'bldg' && b.x0 >= q.x0 - 0.1 && b.x1 <= q.x1 + 0.1 && b.z0 >= q.z0 - 0.1 && b.z1 <= q.z1 + 0.1 && b.y >= q.top - 0.3 && b.y <= q.top + 0.3);
    if (!s) continue;
    s.bldgs.push(b); s.top = b.y + b.h; const p = partFromRange(M[b.tex], b._li); if (p) s.parts.push(p);
  }
  for (const s of STR.list) { s.hp = s.maxHp = s.kind === 'bldg' ? clamp(70 + (s.x1 - s.x0) * (s.z1 - s.z0) * (s.top - s.y0) * 0.03, 140, 1100) : s.maxHp; }
  for (const b of W.boxes) if (b.tierOf && b.tierOf.struct && !b.struct) { b.struct = b.tierOf.struct; b.tierOf.struct.boxes.push(b); }
  STR.grid = new Grid(32, 's'); for (const s of STR.list) STR.grid.insert(s, s.x0, s.z0, s.x1, s.z1);
  // roof details, gable roofs and signs belong to the building they sit on
  for (const p of loose) {
    if (p.used) continue;
    STR.grid.query(p.cx - 1.5, p.cz - 1.5, p.cx + 1.5, p.cz + 1.5, _sq);
    let best = null, bd = p.sign ? 1.0 : 1.5;
    for (const s of _sq) {
      if (s.kind !== 'bldg' || p.cy < s.y0 + 0.3 || p.cy > s.top + 16) continue;
      const dx = Math.max(s.x0 - p.cx, 0, p.cx - s.x1), dz = Math.max(s.z0 - p.cz, 0, p.cz - s.z1), d = Math.hypot(dx, dz);
      if (d === 0 && !p.sign) { best = s; break; }
      if (d < bd && (p.sign ? p.cy < s.top : p.h < 3)) { bd = d; best = s; }
    }
    if (best) { p.used = true; best.parts.push(p); }
  }
}
function rebuildMiniBldgs() {
  const mini = W.mini; mini.bldgs = new Path2D(); mini.rubble = new Path2D();
  const gone = new Set(); for (const s of STR.list) if (s.state) { for (const b of s.bldgs) gone.add(b); mini.rubble.rect(s.x0, s.z0, s.x1 - s.x0, s.z1 - s.z0); }
  for (const b of W.bldgs) if (!gone.has(b)) mini.bldgs.rect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
  for (const r of W.miniRects || []) { if (STR.list.some(s => s.state && s.kind === 'shop' && Math.abs(s.x0 - r.x0) < 1 && Math.abs(s.z0 - r.z0) < 1)) continue; mini.bldgs.rect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0); }
  for (const r of W.ramps) mini.bldgs.rect(r.bx0, r.bz0, r.bx1 - r.bx0, r.bz1 - r.bz0);
  for (const s of W.shapes || []) if (s.kind !== 'mogul' && s.kind !== 'bank' && s.kind !== 'bump' && s.kind !== 'rumble') mini.bldgs.rect(s.bx0, s.bz0, s.bx1 - s.bx0, s.bz1 - s.bz0);
  for (const L of W.loopTracks || []) mini.bldgs.rect(Math.min(L.ex - L.R, L.ex + L.R), L.ez - 4, 2 * L.R, L.off + 8);
}
function damageStructsAt(x, y, z, power, src, extraR) {
  if (!STR.grid) return;
  const R = 6 + power * 5 + (extraR || 0);
  STR.grid.query(x - R, z - R, x + R, z + R, _sq);
  for (const s of _sq) {
    if (s.state) continue;
    const dx = Math.max(s.x0 - x, 0, x - s.x1), dz = Math.max(s.z0 - z, 0, z - s.z1), dy = Math.max(s.y0 - y, 0, y - s.top);
    const d = Math.hypot(dx, dy, dz); if (d > R) continue;
    const f = 1 - d / R;
    hitStruct(s, power * 120 * f * f + (d < 1.5 ? power * 45 : 0), x, y, z, src);
  }
}
function hitStruct(s, dmg, x, y, z, src) {
  if (s.state || dmg <= 0) return;
  s.hp -= dmg; if (isPlayerSrc(src)) s.byPlayer = true;
  const px = clamp(x, s.x0, s.x1), pz = clamp(z, s.z0, s.z1), py = clamp(y, s.y0 + 1, s.top - 0.5);
  if (dmg > 20) {
    for (let k = 0; k < Math.min(30, dmg * 0.3); k++) FX.debris.emit(px, py, pz, rand(-6, 6), rand(-1, 7), rand(-6, 6), rand(1.2, 2.4), rand(0.05, 0.14), Math.random() < 0.5 ? COL.glass : COL.smoke, 1, 20, 0.2, 0, 3);
    FX.smoke.emit(px, py, pz, rand(-1, 1), rand(0.5, 2), rand(-1, 1), rand(2.5, 4), rand(2, 3.5), COL.smoke, 0.5, -0.2, 0.5, 1.4, 4);
  }
  if (s.hp <= 0) { collapseStruct(s, x, z); return; }
  if (s.hp < s.maxHp * 0.6 && s.smoking < 2) { s.smoking++; BOOM.plumes.push({ x: px, y: py - 1, z: pz, t: 0, life: 45, rate: 3.5, size: 1.6 + (s.top - s.y0) * 0.01, rise: 2.6 }); if (s.hp < s.maxHp * 0.35) addFire(px, pz, 1.4, 30); }
}
function collapseStruct(s, bx, bz, quiet) {
  s.state = 1; s.t = 0; s.hit = false; NET.wdDirty = true;
  const H = s.top - s.y0, cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
  s.dur = clamp(1.5 + H * 0.035, 1.6, 6.5);
  let dx = cx - bx, dz = cz - bz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const lean = rand(0.08, 0.2); s.tx = dx * lean; s.tz = dz * lean;
  for (const p of s.parts) { const a = p.mesh.geometry.attributes.position.array; p.orig = a.slice(p.start * 3, (p.start + p.count) * 3); if (!p.home) p.home = p.orig; }
  for (const b of s.boxes) b.h0 = b.h;
  for (const m of s.hide) if (m) m.visible = false;
  STR.active.push(s);
  if (quiet) { s.t = s.dur * 0.995; if (s.station && s.kind === 'shop') s.station.wrecked = true; return; }   // it fell before we got here: skip straight to rubble
  if (!s.netRemote) netFx(['c', STR.list.indexOf(s)]);
  const camD = Math.hypot(cx - camera.position.x, cz - camera.position.z);
  BOOM.sounds.push({ t: GT + camD / 340, v: clamp(1.1 - camD / 400, 0.1, 1), big: H > 20, far: camD, collapse: true });
  G.shake = Math.max(G.shake, clamp(1 - camD / (60 + H * 2), 0, 1) * 1.4);
  if (s.station) { if (s.kind === 'shop') { s.station.wrecked = true; s.station.rob = 0; if (s.station.kind !== 'gas' && SHOP.inside === s.station) closeMenu(); const c = s.station.clerk; if (c && c.active && !c.dead) { killPed(c, s.byPlayer); toRagdoll(c, rand(-2, 2), rand(-2, 2), 4, null); } } }
  if (s.byPlayer) { G.stats.buildings = (G.stats.buildings || 0) + 1; addHeat(s.kind === 'bldg' ? 0.8 : 0.4, 2, true); }
}
// a fallen building has no hitbox left: you can drive, walk, shoot and fly straight through the rubble
function clearStructBoxes(s) {
  for (const b of s.boxes) {
    if (b.gone) continue; b.gone = true; b.h = s.y0 - 3;
    W.boxGrid.remove(b, b.x0, b.z0, b.x1, b.z1);
    const i = W.tallBoxes.indexOf(b); if (i >= 0) W.tallBoxes.splice(i, 1);
  }
}
// builders put it back up: original walls, colliders, glass; the rubble goes away
function restoreStruct(s) {
  if (!s.state || STR.active.includes(s)) return false;
  const touched = new Set();
  for (const p of s.parts) { if (!p.home) continue; p.mesh.geometry.attributes.position.array.set(p.home, p.start * 3); touched.add(p.mesh); }
  for (const m of touched) { const at = m.geometry.attributes.position; at.updateRange.offset = 0; at.updateRange.count = -1; at.needsUpdate = true; }
  for (const g of s.groups) if (g) g.position.set(0, 0, 0);
  for (const m of s.hide) if (m) m.visible = true;
  for (const b of s.boxes) { if (b.h0 != null) b.h = b.h0; if (b.gone) { b.gone = false; W.boxGrid.insert(b, b.x0, b.z0, b.x1, b.z1); if (b.h > 2.5 && b.kind !== 'wall' && !W.tallBoxes.includes(b)) W.tallBoxes.push(b); } }
  if (s.rubbleM) { const rm = s.rubbleM; if (rm.parent) rm.parent.remove(rm); rm.geometry.dispose(); const i = STR.rubble.indexOf(rm); if (i >= 0) STR.rubble.splice(i, 1); s.rubbleM = null; }
  s.state = 0; s.hp = s.maxHp; s.smoking = 0; s.byPlayer = false; s.netRemote = false; s.t = 0;
  NET.wdDirty = true;
  return true;
}
function crushUnder(s) {
  const pad = 1.2, H = s.top - s.y0;
  for (const p of PED.list) {
    if (!p.active || p.isHero || p.dead) continue;
    const x = p.rag ? p.rag.pos[24] : p.x, z = p.rag ? p.rag.pos[26] : p.z;
    if (x > s.x0 - pad && x < s.x1 + pad && z > s.z0 - pad && z < s.z1 + pad) { if (!p.rag) toRagdoll(p, rand(-3, 3), rand(-3, 3), 5, null); killPed(p, s.byPlayer); }
  }
  const h = G.onFoot && HERO.p;
  if (h && !h.rag && h.y < s.top + 1 && h.x > s.x0 - pad && h.x < s.x1 + pad && h.z > s.z0 - pad && h.z < s.z1 + pad) { HERO.hurtT = 0; heroDamage(H > 8 ? 200 : 60, 'crush'); }
  for (const v of VEH.list) {
    if (v.x > s.x0 - pad && v.x < s.x1 + pad && v.z > s.z0 - pad && v.z < s.z1 + pad) { damageVehicle(v, H > 8 ? 200 : 60, s.byPlayer ? 'hero' : null); deformAt(v, v.x, v.y + 3, v.z, 40); breakGlass(v); }
  }
}
function buildRubble(s) {
  const H = s.top - s.y0, w = s.x1 - s.x0, d = s.z1 - s.z0, n = clamp(Math.round(w * d / 10), 6, 46), mh = Math.min(1.8, 0.6 + H * 0.02);
  const geos = [], base = C(s.col);
  for (let k = 0; k < n; k++) {
    const bw = rand(1, Math.min(4, w * 0.5)), bd = rand(1, Math.min(4, d * 0.5)), bh = rand(0.3, mh);
    const x = rand(s.x0 + bw * 0.4, s.x1 - bw * 0.4), z = rand(s.z0 + bd * 0.4, s.z1 - bd * 0.4);
    const edge = Math.min(x - s.x0, s.x1 - x, z - s.z0, s.z1 - z) / Math.max(1, Math.min(w, d) * 0.5);
    const g = new THREE.BoxGeometry(bw, bh * (0.45 + edge * 0.8), bd); g.rotateX(rand(-0.3, 0.3)); g.rotateZ(rand(-0.3, 0.3)); g.rotateY(rand(0, TAU)); g.translate(x, s.y0 + bh * 0.25, z);
    colorize(g, Math.random() < 0.45 ? base.clone().multiplyScalar(rand(0.55, 0.85)) : C(RUBBLE_COLS[(Math.random() * RUBBLE_COLS.length) | 0]));
    geos.push(g);
  }
  const m = new THREE.Mesh(mergeGeos(geos), WMAT.roof); m.castShadow = true; m.receiveShadow = true; W.group.add(m); STR.rubble.push(m); s.rubbleM = m;
  DECALS.splat((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2, Math.min(14, Math.max(w, d) * 0.7), 1);
}
const _dirty = new Map();
function updateStructs(dt) {
  if (!STR.active.length) return;
  _dirty.clear();
  for (let i = STR.active.length - 1; i >= 0; i--) {
    const s = STR.active[i]; s.t += dt;
    const c = Math.min(1, s.t / s.dur), e = c * c, H = s.top - s.y0, sink = H * e * 1.02;
    for (const p of s.parts) {
      const a = p.mesh.geometry.attributes.position.array, o = p.orig, base = p.start * 3;
      for (let k = 0; k < o.length; k += 3) {
        const y = Math.max(s.y0 - 0.03, o[k + 1] - sink), lean = Math.max(0, y - s.y0) * e;
        a[base + k] = o[k] + s.tx * lean; a[base + k + 1] = y; a[base + k + 2] = o[k + 2] + s.tz * lean;
      }
      const dr = _dirty.get(p.mesh) || [1e9, -1]; dr[0] = Math.min(dr[0], p.start); dr[1] = Math.max(dr[1], p.start + p.count); _dirty.set(p.mesh, dr);
    }
    for (const g of s.groups) if (g) { g.position.y = -sink; g.position.x = s.tx * H * e * 0.5; g.position.z = s.tz * H * e * 0.5; }
    for (const b of s.boxes) b.h = Math.max(s.y0 - 0.5, b.h0 - sink);   // the collider sinks with the walls
    // dust pouring out at the base, chunks raining off the falling top
    const per = 2 * ((s.x1 - s.x0) + (s.z1 - s.z0)), near = (s.x0 - camera.position.x) ** 2 + (s.z0 - camera.position.z) ** 2 < 350 * 350;
    if (near && c < 0.95) {
      const n = Math.min(14, per * 0.06 * (1 + H * 0.02));
      for (let k = 0; k < n; k++) {
        const side = (Math.random() * 4) | 0, t = Math.random();
        const x = side < 2 ? lerp(s.x0, s.x1, t) : side === 2 ? s.x0 : s.x1, z = side >= 2 ? lerp(s.z0, s.z1, t) : side === 0 ? s.z0 : s.z1;
        const ox = side === 2 ? -1 : side === 3 ? 1 : 0, oz = side === 0 ? -1 : side === 1 ? 1 : 0;
        FX.smoke.emit(x, s.y0 + rand(0.5, 3), z, ox * rand(2, 7) + rand(-1, 1), rand(0.5, 2.5), oz * rand(2, 7) + rand(-1, 1), rand(4, 8), rand(2.5, 5) * (1 + H * 0.01), W.id === 'sand' ? COL.dust : COL.smoke, 0.6, -0.15, 0.9, 1.6, 4);
      }
      if (Math.random() < 0.5 && BOOM.chunks.length < 80) { const topNow = Math.max(s.y0 + 1, s.top - sink); BOOM.chunks.push({ x: rand(s.x0, s.x1), y: topNow, z: rand(s.z0, s.z1), vx: rand(-5, 5), vy: rand(0, 4), vz: rand(-5, 5), sz: rand(0.3, 0.9), rx: rand(-5, 5), ry: rand(-5, 5), ax: 0, ay: 0, t: 0, fire: false }); }
    }
    if (!s.hit && c > 0.3) { s.hit = true; crushUnder(s); }
    if (c >= 1) {
      s.state = 2; STR.active.splice(i, 1);
      for (const p of s.parts) p.orig = null;
      clearStructBoxes(s);
      buildRubble(s); rebuildMiniBldgs();
      for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, r = Math.max(s.x1 - s.x0, s.z1 - s.z0) * 0.5; FX.smoke.emit((s.x0 + s.x1) / 2 + Math.cos(a) * r, s.y0 + 1, (s.z0 + s.z1) / 2 + Math.sin(a) * r, Math.cos(a) * rand(4, 10), rand(0.5, 2), Math.sin(a) * rand(4, 10), rand(6, 10), rand(4, 7), W.id === 'sand' ? COL.dust : COL.smoke, 0.55, -0.1, 0.8, 1.2, 4); }
      BOOM.plumes.push({ x: (s.x0 + s.x1) / 2, y: s.y0, z: (s.z0 + s.z1) / 2, t: 0, life: 30, rate: 5, size: 3 + H * 0.03, rise: 3 });
    }
  }
  for (const [mesh, r] of _dirty) { const at = mesh.geometry.attributes.position; at.updateRange.offset = r[0] * 3; at.updateRange.count = (r[1] - r[0]) * 3; at.needsUpdate = true; }
}
