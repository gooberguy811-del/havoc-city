// =====================================================================
//  ON FOOT: the player character, carjacking, punching
// =====================================================================
const HERO = { p: null, hp: 100, maxHp: 100, armor: 0, vy: 0, punchT: 0, hurtT: 0, enter: null, in: { fwd: 0, turn: 0, sprint: false, jump: false, punch: false }, jumpHeld: false, punchHeld: false, click: false,
  focus: { x: 0, y: 0, z: 0, vx: 0, vz: 0, h: 0, speed: 0, vf: 0, onFoot: true } };
G.onFoot = false;
// whatever the world should treat as "the player": the car you drive, or you on foot
function PF() { return G.plane || (G.onFoot ? HERO.focus : G.player); }
const HERO_LOOK = { skin: '#c68863', hair: '#1b1410', shirt: '#2f6f4f', pants: '#2a3550' };
function heroShow(x, z, h) {
  const p = PED.list[0]; HERO.p = p;
  Object.assign(p, { active: true, isHero: true, reserved: true, cop: false, mission: false, state: 'walk', dead: false, rag: null, x, z, y: heightAt(x, z), h, sp: 0, walk: 0, run: 0, phase: 0, scale: 1.02, fat: 1.1, loop: 0, corner: 0, dir: 1, panicCd: 0, fleeT: 0, waitT: 0, pend: null, deadT: 0, hits: 0 });
  pedColors(p, HERO_LOOK);
  HERO.vy = 0; HERO.enter = null; G.onFoot = true; updateFocus();
}
function heroHide() { const p = PED.list[0]; if (p.active) hidePed(p); p.active = false; p.rag = null; G.onFoot = false; HERO.enter = null; }
function updateFocus() {
  const p = HERO.p, f = HERO.focus; if (!p) return;
  if (p.rag) { f.x = p.rag.pos[24]; f.y = p.rag.pos[25] - 0.9; f.z = p.rag.pos[26]; f.vx = f.vz = f.speed = f.vf = 0; }
  else { const mh = HERO.rbx && HERO.mvYaw !== undefined ? HERO.mvYaw : p.h; f.x = p.x; f.y = p.y; f.z = p.z; f.vx = Math.sin(mh) * p.sp; f.vz = Math.cos(mh) * p.sp; f.speed = Math.abs(p.sp); f.vf = p.sp; }
  f.h = p.h;
}
const DEATH_MSG = { car: 'You were flattened in the street', blast: 'You were caught in the blast', fall: 'You fell too far', fists: 'The police beat you down', gun: 'Gunned down by the police', crush: 'Crushed by a falling building', pvp: 'Taken out by another player', bike: 'Thrown from your motorbike' };
function heroDamage(amt, cause) {
  if (G.down || !G.onFoot) return;
  if (GT < (HERO.bailUntil || 0) && HERO.p && HERO.p.rag) return; // still tumbling from a bail-out
  if (HERO.hurtT > 0 && amt < 50) return;
  if (HERO.armor > 0) { const a = Math.min(HERO.armor, amt * 0.75); HERO.armor -= a; amt -= a; }
  HERO.hp -= amt; HERO.hurtT = 0.45; HERO.lastCause = cause || 'car'; HERO.lastHurt = GT;
  if (HERO.hp <= 0) {
    HERO.hp = 0; const p = HERO.p; p.dead = true;
    if (!p.rag) toRagdoll(p, 0, 0, 2, null);
    playerDown('wasted', DEATH_MSG[HERO.lastCause] || DEATH_MSG.car);
  }
}
function doorPoint(v, side) {
  const s = side || 1, lx = s * (v.halfW + 0.6), lz = (v.front + v.rear) / 2 + 0.25, c = Math.cos(v.h), sn = Math.sin(v.h);
  return { x: v.x + lx * c + lz * sn, z: v.z - lx * sn + lz * c };
}
function pointBlocked(x, z) {
  W.boxGrid.query(x - 0.5, z - 0.5, x + 0.5, z + 0.5, _pb);
  for (const b of _pb) if (x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3) return true;
  return false;
}
function findEnterable() {
  const p = HERO.p; if (!p) return null; let best = null, bd = 4.5;
  for (const v of VEH.list) {
    if (v.wrecked || (v.flipped && !v.bike) || v.tumble || v.sunk || v.remote || v.forSale) continue;
    const dp = doorPoint(v), d = Math.min(Math.hypot(dp.x - p.x, dp.z - p.z), Math.hypot(v.x - p.x, v.z - p.z) - 1.6);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
// falling (bailed from a plane, blown sky-high, thrown off a bike): open the parachute whenever you like
function chuteAlt() {
  const p = HERO.p; if (!p || !G.onFoot || G.down || HERO.swim) return 0;
  const x = p.rag ? p.rag.pos[24] : p.x, y = p.rag ? p.rag.pos[25] - 0.9 : p.y, z = p.rag ? p.rag.pos[26] : p.z;
  return y - heightAt(x, z);
}
function canDeploy() {
  if (HERO.chute && !HERO.chute.free) return false;
  const p = HERO.p; if (!p || p.dead || !G.onFoot || G.down || HERO.swim) return false;
  if (p.rag) return p.rag.pos[25] - p.rag.prev[25] > 0.02 ? chuteAlt() > 14 : chuteAlt() > 6;   // still flying upward: allow once high enough
  if (HERO.chute || HERO.fly) return chuteAlt() > 6;    // sky-diving, or letting go of a web swing
  return HERO.vy < -4 && chuteAlt() > 6;                // walked or jumped off something tall
}
function deployChute() {
  const p = HERO.p;
  if (p.rag) { const R = p.rag, x = R.pos[24], y = R.pos[25] - 0.9, z = R.pos[26], vy = (R.pos[25] - R.prev[25]) / RSTEP, vx = (R.pos[24] - R.prev[24]) / RSTEP, vz = (R.pos[26] - R.prev[26]) / RSTEP; p.rag = null; p.x = x; p.y = y; p.z = z; p.sp = Math.min(6, Math.hypot(vx, vz) * 0.3); if (Math.hypot(vx, vz) > 0.5) p.h = Math.atan2(vx, vz); HERO.vy = clamp(vy, -40, 6); HERO.bailUntil = 0; }
  if (HERO.fly) { const v = HERO.wv || { x: 0, y: 0, z: 0 }, hs = Math.hypot(v.x, v.z); HERO.fly = false; HERO.web = null; if (hs > 0.5) p.h = Math.atan2(v.x, v.z); p.sp = Math.min(8, hs); HERO.vy = clamp(v.y, -40, 4); }
  HERO.chute = { t: 0, turn: 0, bank: 0, pitch: 0 }; HERO.chuteDrop = null;
  feed(APP.touch ? 'Parachute open: steer with the stick' : 'Parachute open: A / D steer, W speeds up, S flares', 'blue'); SFX.whoosh();
}
function toggleVehicle() {
  if (G.down || APP.paused) return;
  if (G.onFoot && canDeploy()) { deployChute(); return; }
  if (G.onFoot && APP.touch && carrotTarget()) { useCarrot(); return; }
  if (G.onFoot) {
    if (!HERO.p || HERO.p.rag) return;
    if (HERO.enter) { HERO.enter = null; return; }
    if (HERO.chute) return;
    const pl = nearPlane(); if (pl) { enterPlane(pl); return; }
    const v = findEnterable();
    if (v && v.showroom && bodyLocked(v.cfg.body)) { feed(`The ${BODIES[v.cfg.body].name} is locked: ${UNLOCK_HOW[BODIES[v.cfg.body].unlock] || 'finish its job'} to unlock it`, 'red'); return; }
    if (v) HERO.enter = { v, t: 0 };
  } else if (G.plane) leavePlane(); else if (G.player) exitVehicle();
}
function enterVehicle(v) {
  HERO.enter = null;
  const dp = doorPoint(v);
  if (v.ai) {
    const cop = v.police;
    const q = spawnPedAt(dp.x, dp.z, cop ? 'cop' : 'civ');
    if (q) { q.h = v.h + Math.PI / 2; toRagdoll(q, Math.cos(v.h) * 3.2, -Math.sin(v.h) * 3.2, 3.2, null); q.dead = false; }
    if (cop) { addHeat(1.2, 2, true); feed('You stole a police cruiser', 'red'); }
    else { addHeat(0.5, 0, false); feed((v.bike ? 'Knocked the rider off a ' : 'Carjacked a ') + ((BODIES[v.cfg.body] || {}).name || 'car')); }
    v.ai = null;
  }
  if (v.bike) { setRiderLook(v.model, Object.assign({ helmet: '#121316' }, HERO_LOOK)); if (v.flipped) { v.flipped = false; v.roll = v.rollV = v.pit = v.pitV = 0; v.onGround = true; v.y = heightAt(v.x, v.z); v.vx = v.vz = v.av = 0; } }
  if (v.locked) { v.lockFlash = 0.45; SFX.chirp(false); }
  if (v.tank) baseAircraftTaken(v);   // your own keys: it opens for you and locks again when you leave
  v.kind = 'player'; v.abandoned = false;
  heroHide();
  G.player = v; v.model.root.add(headSpot, headSpot.target);
  CAM.h = v.h; resetCamera(); SFX.door(); HUD.exitHintT = 4;
}
// car lock: L locks the car you're in or the last one you left. Thieves can't take a locked car and it's never cleared away.
function toggleLock() {
  if (G.down || APP.paused) return;
  const v = G.onFoot ? G.myCar : G.player;
  if (!v || !VEH.list.includes(v) || v.wrecked || v.remote) { feed(G.onFoot ? "You haven't left a car anywhere to lock" : "This one can't be locked", 'blue'); return; }
  G.myCar = v; v.locked = !v.locked; v.lockFlash = v.locked ? 0.85 : 0.45; SFX.chirp(v.locked);
  const what = v.bike ? 'Bike' : 'Car', far = G.onFoot && HERO.p ? Math.hypot(v.x - HERO.p.x, v.z - HERO.p.z) : 0;
  if (v.locked) feed(G.onFoot ? `${what} locked${far > 40 ? ` (${Math.round(far)} m away)` : ''}: nobody can steal it` : `${what} will stay locked when you get out`, 'green');
  else feed(`${what} unlocked`, 'blue');
  for (const T of THIEF.list) if (T.v === v && v.locked) T.foiled = true;
}
function exitVehicle() {
  const v = G.player; if (!v || G.down) return;
  let side = 1, dp = doorPoint(v, 1); if (pointBlocked(dp.x, dp.z)) { side = -1; dp = doorPoint(v, -1); }
  v.kind = 'parked'; v.abandoned = true; v.abandonT = GT; G.myCar = v;
  if (v.locked) { v.lockFlash = 0.85; SFX.chirp(true); }
  Object.assign(v.input, { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0 });
  if (headSpot.parent) headSpot.parent.remove(headSpot, headSpot.target);
  SFX.hornSet(false); hornOn = false;
  G.player = null;
  heroShow(dp.x, dp.z, v.h + Math.PI / 2);
  HERO.p.sp = 0;
  const sp = v.speed;
  if (sp > 6) {
    // bailing out: tumble clear of the door, take a few scrapes, never die from it
    const c = Math.cos(v.h), sn = Math.sin(v.h);
    HERO.bailCar = v; HERO.bailUntil = GT + 4;
    toRagdoll(HERO.p, v.vx * 0.7 + side * c * 5, v.vz * 0.7 - side * sn * 5, Math.min(sp * 0.5, 12), null);
    HERO.hp = Math.max(15, HERO.hp - Math.min(20, sp * 0.5)); HERO.hurtT = 1;
    feed(v.bike ? 'You jumped off the bike' : 'You bailed out of a moving car');
    if (v.bike && !v.tumble) { v.rollV += side * 2; v.tumble = true; v.onGround = false; v.vy = 1; }
  }
  SFX.door();
}
function swimOut(v) {
  const x = v.x, z = v.z, h = v.h;
  v.kind = 'parked'; v.abandoned = true; v.abandonT = GT; G.myCar = v;
  Object.assign(v.input, { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0, park: 1 });
  if (headSpot.parent) headSpot.parent.remove(headSpot, headSpot.target);
  SFX.hornSet(false); hornOn = false;
  G.player = null;
  heroShow(x, z, h); HERO.p.y = SWIM_Y; HERO.swim = true;
  feed('Your car sank. Swim to the shore', 'blue');
}
function heroPunch() {
  HERO.punchT = 0.45;
  const p = HERO.p, fx = Math.sin(p.h), fz = Math.cos(p.h);
  let best = null, bd = 1.7;
  for (const q of PED.list) {
    if (!q.active || q === p) continue;
    const qx = q.rag ? q.rag.pos[24] : q.x, qz = q.rag ? q.rag.pos[26] : q.z, dx = qx - p.x, dz = qz - p.z, d = Math.hypot(dx, dz);
    if (d > bd || (dx * fx + dz * fz) / (d || 1) < 0.4) continue;
    best = q; bd = d;
  }
  SFX.whoosh(); storePunch(p, fx, fz);
  if (!best) return;
  SFX.punch();
  if (best.remote) { netHit(best.remote, 12); if (settings.gore !== 'off') bloodBurst(best.x, best.y + 1.5, best.z, fx * 2, fz * 2, 4, 0.5); return; }
  best.hits = (best.hits || 0) + 1;
  if (best.rag) { const R = best.rag; R.asleep = false; R.still = 0; for (let i = 0; i < R.n; i++) { R.prev[i * 3] -= fx * 4 * RSTEP; R.prev[i * 3 + 1] -= 1.5 * RSTEP; R.prev[i * 3 + 2] -= fz * 4 * RSTEP; } }
  else toRagdoll(best, fx * 5, fz * 5, 3.2, null);
  if (settings.gore !== 'off') { const P = best.rag.pos; bloodBurst(P[0], P[1], P[2], fx * 2, fz * 2, 5, 0.6); }
  if (best.hits >= 3 && !best.dead) { killPed(best, true); if (best.cop) addHeat(1, 2, true); }
  if (best.cop) addHeat(0.9, 1, true); else addHeat(0.2, 0, false);
  for (const o of PED.list) if (o.active && !o.rag && o !== best && !o.isHero && (o.x - p.x) ** 2 + (o.z - p.z) ** 2 < 400) panic(o, p.x, p.z);
}
const _hv = [];
function heroUpdate(dt) {
  const p = HERO.p; if (!p || !p.active) return;
  if (HERO.in.jump && !HERO.chuteHeld && canDeploy()) deployChute();
  HERO.chuteHeld = HERO.in.jump;
  if (webUpdate(p, dt)) { HERO.punchT -= dt; HERO.hurtT -= dt; updateFocus(); return; }
  HERO.punchT -= dt; HERO.hurtT -= dt;
  const I = HERO.in; let fwd = I.fwd, sprint = I.sprint, rbxMag = 0; HERO.rbx = false;
  if (HERO.enter) {
    const E = HERO.enter, v = E.v; E.t += dt;
    if (!VEH.list.includes(v) || v.wrecked || (v.flipped && !v.bike)) HERO.enter = null;
    else {
      const dp = doorPoint(v), dx = dp.x - p.x, dz = dp.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.8 || E.t > 1.8) { enterVehicle(v); return; }
      p.h = lerpA(p.h, Math.atan2(dx, dz), damp(14, dt)); fwd = 1; sprint = d > 3;
    }
  } else if (HERO.chute && !HERO.chute.free) {   // under the canopy: turns build up and the wing banks into them
    const C2 = HERO.chute; C2.turn = lerp(C2.turn || 0, I.turn * 1.7, damp(3, dt)); p.h += C2.turn * dt;
    C2.bank = -C2.turn * 0.3; C2.pitch = lerp(C2.pitch || 0, fwd > 0 ? 0.1 : fwd < 0 ? -0.12 : 0, damp(3, dt));
  } else if (rbxFoot()) {   // Roblox-style: move relative to the camera, turn to face the way you walk
    HERO.rbx = true;
    const mx = I.mx || 0, mz = I.mz || 0, h = CAM.h; rbxMag = Math.min(1, Math.hypot(mx, mz));
    if (rbxMag > 0.1) HERO.mvYaw = Math.atan2(Math.sin(h) * mz - Math.cos(h) * mx, Math.cos(h) * mz + Math.sin(h) * mx);
    if (CAM.sl || CAM.zd < RBX.fp) p.h = h;
    else if (rbxMag > 0.1 && !(ARMS.mouse.down || ARMS.trigger)) p.h = lerpA(p.h, HERO.mvYaw, damp(14, dt));
    fwd = rbxMag > 0.1 ? 1 : 0;
  } else p.h += I.turn * (HERO.chute ? 2.4 : 3.2) * dt;
  const swim = W.waters && waterAt(p.x, p.z);
  if (swim && !HERO.swim) { splash(p.x, p.z, 2 + Math.abs(HERO.vy)); feed('Swimming. Head for the shore', 'blue'); }
  HERO.swim = swim;
  if (swim) HERO.chute = null;
  const target = HERO.chute ? (HERO.chute.free ? (fwd > 0 ? 14 : 4) : fwd > 0 ? 8 : fwd < 0 ? 2.5 : 5) : swim ? (fwd > 0 ? (sprint ? 2.8 : 1.8) : fwd < 0 ? -1 : 0) : fwd > 0 ? (sprint ? 6.4 : 2.6) : fwd < 0 ? -1.8 : 0;
  p.sp = lerp(p.sp, HERO.rbx ? target * Math.max(0.35, rbxMag) : target, damp(swim ? 4 : 9, dt));
  const mvH = HERO.rbx && HERO.mvYaw !== undefined ? HERO.mvYaw : p.h;
  p.x += Math.sin(mvH) * p.sp * dt; p.z += Math.cos(mvH) * p.sp * dt;
  const gh = swim ? SWIM_Y + Math.sin(GT * 2.2) * 0.05 : Math.max(heightAt(p.x, p.z), roofAt(p.x, p.z, p.y));
  if (I.jump && !swim && p.y <= gh + 0.06 && HERO.vy <= 0) HERO.vy = 5.4;
  const C2 = HERO.chute;
  if (C2 && C2.free) HERO.vy = Math.max(HERO.vy - 16 * dt, fwd > 0 ? -44 : -36);
  else if (C2) {   // canopy opens with a jolt, then a steady glide: W dives a little faster, S flares
    C2.t += dt;
    if (C2.t > 0.18) { const sink = fwd > 0 ? -5.4 : fwd < 0 ? -2.9 : -4.2; HERO.vy += (sink - HERO.vy) * Math.min(1, dt * (HERO.vy < sink - 6 ? 4.5 : 2.5)); } else HERO.vy -= 16 * dt;
  } else HERO.vy -= 16 * dt;
  p.y += HERO.vy * dt;
  // stepped off something really tall: switch to sky-diving so the parachute is there for you
  if (!HERO.chute && !swim && HERO.vy < -9 && p.y - gh > 12) { HERO.chute = { t: 0, free: true }; feed(APP.touch ? 'Free fall! Tap CAR to open your parachute' : 'Free fall! Press Space or F to open your parachute', 'blue'); }
  if (p.y <= gh) {
    const lim = HERO.chute && !HERO.chute.free ? 14 : 12;
    if (HERO.vy < -lim && !swim) heroDamage((-HERO.vy - lim) * 6, 'fall');
    p.y = gh; HERO.vy = 0;
    if (HERO.chute) { const c = HERO.chute; if (!c.free) { feed('Safe landing', 'green'); if (!swim) HERO.chuteDrop = { x: p.x, y: p.y, z: p.z, h: p.h, bank: c.bank || 0, t: 0 }; p.sp = Math.min(p.sp, 3); } HERO.chute = null; }
  }
  if (swim && Math.random() < 0.15 && Math.abs(p.sp) > 0.5) FX.smoke.emit(p.x, 0.05, p.z, 0, 0.3, 0, 0.6, 0.25, COL.water, 0.5, 0, 1, 0.4, 4);
  pedPushOut(p);
  // step around parked or slow cars
  for (const v of VEH.list) {
    const dx = p.x - v.x, dz = p.z - v.z; if (dx * dx + dz * dz > 30 || v.y > p.y + 1.6 || p.y > v.y + (v.height || 1.5) + 0.2) continue;
    const c = Math.cos(v.h), s = Math.sin(v.h), lx = dx * c - dz * s, lz = dx * s + dz * c, m = 0.3;
    if (Math.abs(lx) < v.halfW + m && lz < v.front + m && lz > v.rear - m) {
      const penX = v.halfW + m - Math.abs(lx), penF = v.front + m - lz, penR = lz - v.rear + m, mn = Math.min(penX, penF, penR);
      let nlx = lx, nlz = lz; if (mn === penX) nlx = Math.sign(lx || 1) * (v.halfW + m); else if (mn === penF) nlz = v.front + m; else nlz = v.rear - m;
      p.x = v.x + nlx * c + nlz * s; p.z = v.z - nlx * s + nlz * c;
    }
  }
  p.state = Math.abs(p.sp) > 4 ? 'flee' : 'walk';
  const back = HERO.rbx && HERO.mvYaw !== undefined && Math.cos(wrapA(HERO.mvYaw - p.h)) < -0.3 ? -1 : 1;   // strafing backwards in shift-lock: legs run in reverse
  if (!HERO.chute) p.phase += back * p.sp * dt * TAU / (p.state === 'flee' ? 2.4 : 1.4);
  if (I.punch && HERO.punchT <= 0) heroPunch();
  updateFocus();
}
function heroPoseFix(p) {
  if (HERO.chute) { chutePose(p); return; }
  if (HERO.fly) { webPose(p); return; }
  if (ARMS.cur && gunsOn() && (ARMS.trigger || ARMS.mouse.down || SHOP.holdup || GT - ARMS.lastShot < 1.6)) { const w = WEAPONS[ARMS.cur]; aimPose(p.pts, ARMS.aimYaw, w.two, w.rocket); return; }
  if (HERO.punchT <= 0.08) return;
  const e = Math.sin(clamp((0.45 - HERO.punchT) / 0.37, 0, 1) * Math.PI), P = p.pts, fx = Math.sin(p.h), fz = Math.cos(p.h);
  const sx = P[9], sy = P[10], sz = P[11];
  P[21] = sx + fx * (0.22 + 0.4 * e); P[22] = sy - 0.05 + 0.04 * e; P[23] = sz + fz * (0.22 + 0.4 * e);
  P[15] = sx + fx * (0.14 + 0.16 * e) - Math.cos(p.h) * 0.04; P[16] = sy - 0.14 * (1 - e); P[17] = sz + fz * (0.14 + 0.16 * e) + Math.sin(p.h) * 0.04;
}
// police officers on foot
function copAI(p, dt) {
  if (!wanted.stars || G.down) return false;
  const T = PF(); if (!T) return false;
  const dx = T.x - p.x, dz = T.z - p.z, d = Math.hypot(dx, dz), face = Math.atan2(dx, dz);
  let sp = 0;
  p.losT -= dt; if (p.losT <= 0) { p.losT = 0.4; p.los = d < 45 && !segmentBlocked(p.x, p.z, T.x, T.z); }
  if (gunsOn() && wanted.stars >= 2 && p.los && d < 34 && d > 3) {
    sp = d > 16 ? p.run * 0.7 : 0;               // close in, then stand and shoot
    p.aimT = GT + 0.8; p.aimYaw = face;
    p.shootT -= dt;
    if (p.shootT <= 0) { p.shootT = rand(0.6, 1.25); const Q = p.pts; copShoot(Q[21] + Math.sin(face) * 0.3, Q[22], Q[23] + Math.cos(face) * 0.3, true); }
  } else if (G.onFoot) {
    sp = d > 1.25 ? p.run : 0;
    if (d < 1.6 && HERO.p && !HERO.p.rag && Math.abs(HERO.p.y - p.y) < 1.8) { p.copT = (p.copT || 0) - dt; if (p.copT <= 0) { p.copT = 1.1; heroDamage(7, 'fists'); SFX.punch(); HERO.p.sp *= 0.3; } }
  } else if (d < 9 && T.speed < 2) sp = p.run * 0.6;
  pedMove(p, face, sp, dt, sp > 3);
  return true;
}
