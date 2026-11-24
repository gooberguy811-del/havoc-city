// =====================================================================
//  MILITARY HARDWARE: flyable army helicopters (only parked at the
//  military base), homing missiles on V that hunt the police chopper,
//  and a health bar over the police chopper (500 HP)
// =====================================================================
Object.assign(PLANE_DEFS, {
  hornet: { name: 'Hornet attack chopper', kind: 'heli', len: 13, span: 4.2, thrust: 0, vmax: 58, hAcc: 19, climb: 15, vstall: 0, vrot: 0, roll: 1, pitchRate: 1, turnMax: 1, hp: 500, camD: 16, camH: 5, eye: 2.25, cockZ: 2.4, pitchMax: 0.4, mass: 5200, fus: [[0, 2.4], [0, 0], [0, -4]], fusR: 1.0, rockets: 14 },
  mule: { name: 'Mule transport chopper', kind: 'heli', len: 16, span: 3.4, thrust: 0, vmax: 46, hAcc: 13, climb: 12, vstall: 0, vrot: 0, roll: 1, pitchRate: 1, turnMax: 1, hp: 650, camD: 19, camH: 6, eye: 2.6, cockZ: 3.6, pitchMax: 0.35, mass: 8000, fus: [[0, 3.6], [0, 0], [0, -5]], fusR: 1.4 }
});
PLANE_DEFS.heli.hp = 500;
function buildMilHeli(type, col, trim) {
  const M = planeMats(), paint = new THREE.MeshStandardMaterial({ color: C(col || '#4b5a3a'), roughness: 0.75, metalness: 0.15 }), tr = new THREE.MeshStandardMaterial({ color: C(trim || '#2a2f26'), roughness: 0.7, metalness: 0.2 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (g, m, x, y, z, rx, ry, rz) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; o.receiveShadow = true; body.add(o); return o; };
  const cyl = (r0, r1, len, seg) => { const g = new THREE.CylinderGeometry(r0, r1, len, seg || 10); g.rotateX(Math.PI / 2); return g; };
  const rotor = new THREE.Group(), tail = new THREE.Group();
  if (type === 'hornet') {
    add(new THREE.BoxGeometry(1.1, 1.4, 4.6), paint, 0, 1.75, 0.2);
    add(cyl(0.45, 0.62, 1.6), paint, 0, 1.55, 3.2);
    add(new THREE.ConeGeometry(0.45, 0.9, 10).rotateX(Math.PI / 2), paint, 0, 1.5, 4.4);
    const c1 = add(new THREE.BoxGeometry(0.9, 0.62, 1.4), M.glass, 0, 2.55, 2.4); c1.rotation.x = -0.08;
    const c2 = add(new THREE.BoxGeometry(0.9, 0.7, 1.3), M.glass, 0, 2.85, 1.05); c2.rotation.x = -0.06;
    add(new THREE.BoxGeometry(1.0, 0.5, 2.2), tr, 0, 2.7, -0.6);                       // engine hump
    for (const s of [-1, 1]) add(cyl(0.28, 0.32, 1.3, 8), tr, s * 0.65, 2.65, -0.6);  // intakes
    add(cyl(0.18, 0.42, 6.2), paint, 0, 2.0, -4.4);                                     // tail boom
    add(new THREE.BoxGeometry(0.12, 1.7, 1.1), paint, 0, 2.7, -7.3, 0.25);              // fin
    add(new THREE.BoxGeometry(2.4, 0.08, 0.7), paint, 0, 2.05, -6.6);                   // stabiliser
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(1.7, 0.14, 0.95), paint, s * 1.35, 1.65, -0.2);       // stub wings
      add(cyl(0.24, 0.24, 1.6, 10), tr, s * 1.75, 1.35, -0.1);                        // rocket pods
      add(new THREE.CircleGeometry(0.22, 10), M.dark, s * 1.75, 1.35, 0.71);
      add(cyl(0.09, 0.09, 1.5, 6), M.metal, s * 1.05, 1.32, -0.15);                   // missiles
      add(new THREE.BoxGeometry(0.06, 0.06, 4.2), M.metal, s * 0.62, 0.12, 0.4);       // skids
      for (const z of [-0.8, 1.6]) add(new THREE.BoxGeometry(0.06, 0.95, 0.06), M.metal, s * 0.6, 0.6, z, 0, 0, s * 0.12);
    }
    add(new THREE.SphereGeometry(0.28, 10, 8), M.dark, 0, 0.98, 3.4);                  // chin turret
    add(cyl(0.05, 0.05, 1.2, 6), M.dark, 0, 0.92, 4.0);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 6.4), M.dark); b.position.z = 3.2; const g = new THREE.Group(); g.rotation.y = k * Math.PI / 2; b.castShadow = true; g.add(b); rotor.add(g); }
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 10), M.dark)); rotor.position.set(0, 3.25, -0.2);
    tail.position.set(0.22, 2.75, -7.45);
    for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.16), M.dark); b.rotation.x = k * Math.PI / 2; tail.add(b); }
  } else {
    add(new THREE.BoxGeometry(2.3, 2.1, 6.0), paint, 0, 2.0, 0);
    const nose = add(new THREE.SphereGeometry(1.15, 14, 10), paint, 0, 1.9, 3.0); nose.scale.set(1, 0.92, 0.9);
    add(new THREE.BoxGeometry(1.9, 0.7, 0.9), M.glass, 0, 2.45, 3.55);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.04, 0.5, 0.6), M.glass, s * 1.16, 2.45, 1.4 - k * 1.2);
      add(new THREE.BoxGeometry(0.03, 1.5, 1.6), tr, s * 1.165, 1.75, -0.2);             // sliding door
      add(new THREE.BoxGeometry(0.16, 0.16, 4.6), M.dark, s * 0.95, 0.18, 0.2);         // skids
      for (const z of [-1.4, 1.8]) add(new THREE.BoxGeometry(0.1, 0.9, 0.1), M.dark, s * 0.95, 0.62, z);
      add(cyl(0.38, 0.38, 2.2, 10), tr, s * 0.62, 3.25, -0.4);                          // twin engines
    }
    add(new THREE.BoxGeometry(1.4, 0.4, 3.4), tr, 0, 3.15, 0.2);
    add(cyl(0.35, 0.75, 7.2), paint, 0, 2.45, -6.4);
    add(new THREE.BoxGeometry(0.16, 2.2, 1.4), paint, 0, 3.4, -9.6, 0.22);
    add(new THREE.BoxGeometry(3, 0.1, 0.9), paint, 0, 2.5, -9);
    add(new THREE.BoxGeometry(0.06, 0.6, 1.6), new THREE.MeshStandardMaterial({ color: C('#f1f1ee'), roughness: 0.6 }), 1.17, 2.6, 0.9);   // white ID panel
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 7.6), M.dark); b.position.z = 3.8; const g = new THREE.Group(); g.rotation.y = k * TAU / 5; b.castShadow = true; g.add(b); rotor.add(g); }
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.5, 10), M.dark)); rotor.position.set(0, 3.75, 0.2);
    tail.position.set(0.28, 3.4, -9.9);
    for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.2), M.dark); b.rotation.x = k * Math.PI / 2; tail.add(b); }
  }
  body.add(rotor, tail);
  return { root, body, rotor, tail, paint, tr };
}
// ---------- army chopper weapons: B fires a pair of unguided rockets from the pods ----------
function fireHeliRockets(pl) {
  if (pl.rocketsLeft === undefined) pl.rocketsLeft = pl.def.rockets || 0;
  if (!pl.rocketsLeft) { feed('Out of rockets. Land on a helipad to rearm', 'blue'); return; }
  if (GT < (pl.rocketCd || 0) || weaponsBanned()) return; pl.rocketCd = GT + 0.45;
  const cy = Math.cos(pl.yaw), sy = Math.sin(pl.yaw), cp = Math.cos(pl.pitch), sp = Math.sin(pl.pitch), f = { x: sy * cp, y: sp - 0.08, z: cy * cp }, r = { x: -cy, z: sy };
  for (const s of [-1, 1]) { if (!pl.rocketsLeft) break; pl.rocketsLeft--; launchRocket({ x: pl.x + r.x * s * 1.75 + f.x * 1, y: pl.y + 1.3, z: pl.z + r.z * s * 1.75 + f.z * 1 }, f.x, f.y, f.z, 'hero'); }
  SFX.last.rpgg = 0; SFX.gun('rpg', 0.75); G.shake = Math.max(G.shake, 0.12);
}
function rearmHelis() {
  const pl = G.plane; if (!pl || pl.type !== 'hornet' || !pl.ground || pl.wreck || pl.V.length() > 4) return;
  if (pl.rocketsLeft !== undefined && pl.rocketsLeft < pl.def.rockets && W.helipads && W.helipads.some(h => Math.hypot(h.x - pl.x, h.z - pl.z) < 12)) { pl.rocketsLeft = pl.def.rockets; feed('Rockets reloaded', 'green'); }
}
// ---------- V: homing missile at the police chopper ----------
const HOMING = { cool: 0, hp: null, shown: false };
function heliOverhead() {
  const P = PF(); if (!HELI.active || HELI.down || !P) return 0;
  const d = Math.hypot(HELI.x - P.x, HELI.z - P.z), dy = HELI.y - (P.y || 0);
  return dy > 5 && d < 220 ? 1 : 0;
}
function fireHoming() {
  if (G.down || APP.paused || APP.mode !== 'game') return;
  if (GT < HOMING.cool) return;
  if (weaponsBanned()) { feed('Not over a school', 'blue'); return; }
  if (!heliOverhead()) { feed(HELI.active && !HELI.down ? 'The police chopper is too far away to lock on' : 'No police chopper overhead to lock onto', 'blue'); return; }
  let o;
  if (G.plane) o = { x: G.plane.x, y: G.plane.y + 0.9, z: G.plane.z };
  else if (!G.onFoot && G.player) o = { x: G.player.x, y: G.player.y + 2.2, z: G.player.z };
  else { const p = HERO.p; if (!p || p.rag) return; o = { x: p.x + Math.sin(p.h) * 0.3, y: p.y + 1.8, z: p.z + Math.cos(p.h) * 0.3 }; }
  const dx = HELI.x - o.x, dy = HELI.y - o.y, dz = HELI.z - o.z, d = Math.hypot(dx, dy, dz) || 1;
  launchRocket(o, dx / d * 0.5, 0.85, dz / d * 0.5, 'hero');
  const r = ARMS.rockets[ARMS.rockets.length - 1]; r.homing = true; r.vx *= 0.6; r.vy *= 0.6; r.vz *= 0.6;
  HOMING.cool = GT + 0.9; HOMING.fired = (HOMING.fired || 0) + 1;
  SFX.lockOn(); SFX.gun('rpg', 0.85); G.shake = Math.max(G.shake, 0.15);
  if (G.onFoot && HERO.p) HERO.punchT = 0;
}
// called from updateRockets for missiles with r.homing: steer at the chopper, return true once it's spent
function homingStep(r, dt) {
  if (!HELI.active || HELI.down) { r.homing = false; return false; }
  const tx = HELI.x - r.x, ty = HELI.y - 0.3 - r.y, tz = HELI.z - r.z, td = Math.hypot(tx, ty, tz) || 1;
  if (td < 3.4) { homingHit(r); return true; }
  const spd = Math.min(95, Math.hypot(r.vx, r.vy, r.vz) + 70 * dt), k = Math.min(1, dt * (r.t < 0.25 ? 2 : 5.5));
  r.vx += (tx / td * spd - r.vx) * k; r.vy += (ty / td * spd - r.vy) * k + 1.5 * dt; r.vz += (tz / td * spd - r.vz) * k;
  return false;
}
function homingHit(r) {
  scene.remove(r.m); const i = ARMS.rockets.indexOf(r); if (i >= 0) ARMS.rockets.splice(i, 1);
  const x = HELI.x, y = HELI.y, z = HELI.z;
  for (let k = 0; k < 26; k++) FX.fire.emit(x + rand(-1.2, 1.2), y + rand(-0.8, 0.8), z + rand(-1.2, 1.2), rand(-5, 5), rand(-2, 5), rand(-5, 5), rand(0.4, 0.8), rand(0.8, 1.8), COL.fire, 1, -1, 0.8, 0.5, 4);
  for (let k = 0; k < 14; k++) FX.smoke.emit(x + rand(-1, 1), y, z + rand(-1, 1), rand(-2, 2), rand(0, 3), rand(-2, 2), rand(1.5, 3), rand(1.2, 2.4), COL.dark, 0.7, -0.2, 0.4, 1.3, 4);
  G.flashes.push({ x, y, z, s: 9, t: 0.4 }); SFX.boom && SFX.boom(0.5, false); G.shake = Math.max(G.shake, 0.25);
  heliDamage(170, true);
  feed(HELI.down ? 'Direct hit! The chopper is going down' : `Direct hit! Chopper at ${Math.max(0, Math.round(HELI.hp / 5))}%`, HELI.down ? 'green' : 'blue');
}
// ---------- police chopper health bar and lock-on marker ----------
function initHeliBar() {
  if (HOMING.hp) return;
  const d = document.createElement('div'); d.id = 'heliBar';
  d.style.cssText = 'position:absolute;left:0;top:0;width:110px;margin-left:-55px;pointer-events:none;font:700 10px/1.2 var(--ui,system-ui);letter-spacing:.06em;color:#fff;text-align:center;text-shadow:0 1px 2px #000;z-index:3;display:none';
  d.innerHTML = '<div class="hb-l">POLICE CHOPPER</div><div style="height:6px;background:rgba(0,0,0,.55);border-radius:3px;margin-top:3px;overflow:hidden"><div class="hb-f" style="height:100%;width:100%;background:#ff4d5e"></div></div><div class="hb-k" style="margin-top:3px;color:#ffd84a"></div>';
  ($('#ui') || document.body).appendChild(d); HOMING.hp = d;
}
const _hb = new THREE.Vector3();
function updateHeliBar() {
  if (!HOMING.hp) initHeliBar();
  const d = HOMING.hp, P = PF();
  const on = APP.mode === 'game' && HELI.active && !HELI.down && P && Math.hypot(HELI.x - P.x, HELI.z - P.z) < 260;
  if (!on) { if (d.style.display !== 'none') d.style.display = 'none'; return; }
  _hb.set(HELI.x, HELI.y + 2.6, HELI.z).project(camera);
  if (_hb.z > 1 || Math.abs(_hb.x) > 1.1 || Math.abs(_hb.y) > 1.1) { d.style.display = 'none'; return; }
  const ui = $('#ui'), w = (ui && ui.clientWidth) || window.innerWidth, h = (ui && ui.clientHeight) || window.innerHeight;
  d.style.display = ''; d.style.transform = `translate(${(_hb.x * 0.5 + 0.5) * w}px,${(0.5 - _hb.y * 0.5) * h}px)`;
  d.querySelector('.hb-f').style.width = clamp(HELI.hp / 500 * 100, 0, 100) + '%';
  const lock = heliOverhead();
  d.querySelector('.hb-k').textContent = lock ? (APP.touch ? 'LOCKED · tap MSL' : 'LOCKED · press V') : '';
}
function updateMilitary(dt) { updateHeliBar(); rearmHelis(); updateBase(dt); updateTanks(dt); if (W && W.id === 'base') updateTankSpots(dt); }
