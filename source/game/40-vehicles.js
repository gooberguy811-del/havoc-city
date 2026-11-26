// =====================================================================
//  VEHICLES: physics, collisions, traffic AI, police, wanted level
// =====================================================================
const VEH = { list: [] };
const GRAV = 22;
const G = { player: null, stats: { peds: 0, cars: 0, cops: 0, props: 0, maxStars: 0, bestAir: 0, bestAirDist: 0 }, down: 0, downKind: '', timeScale: 1, shake: 0, trafficT: 0, policeT: 0, slowmo: 0, slowCd: -9, scrape: 0 };
const isCop = v => v.police && v.ai && !v.wrecked && !v.flipped;

function computeStats(cfg) {
  const B = BODIES[cfg.body] || BODIES.viper, s = B.stats;
  const e = clamp((cfg.engine || 2) - 1, 0, 3), hnd = clamp((cfg.handling || 2) - 1, 0, 2), br = clamp((cfg.brakes || 2) - 1, 0, 2), ar = clamp((cfg.armor || 1) - 1, 0, 3);
  return {
    top: s.top * [0.88, 1, 1.1, 1.2][e], acc: s.acc * [0.85, 1, 1.16, 1.32][e], grip: s.grip * [0.9, 1, 1.13][hnd], brake: [15, 19, 25][br],
    mass: s.mass * (1 + ar * 0.06), hp: s.hp * [1, 1.45, 2, 2.7][ar], wb: B.wb, steerMax: 0.62, steerFall: 16, nitro: !!cfg.nitro
  };
}
class Vehicle {
  constructor(cfg, kind, opts = {}) {
    this.cfg = cfg; this.kind = kind; this.police = kind === 'police' || !!opts.police;
    this.model = buildCarModel(cfg, { police: this.police, ownTail: kind === 'player', detail: kind === 'player', blob: !QUALITY[settings.quality].shadow });
    this.obj = this.model.root; scene.add(this.obj);
    const d = this.model.dims;
    this.front = d.front; this.rear = d.rear; this.halfW = d.W / 2; this.height = d.H; this.wr = d.wr; this.hc = this.model.hc;
    this.st = computeStats(cfg); this.mass = this.st.mass; this.inertia = this.mass * (d.L * d.L + d.W * d.W) / 12;
    this.cr = this.halfW * 1.0; this.co = [d.front - this.cr, (d.front + d.rear) / 2, d.rear + this.cr];
    this.x = 0; this.z = 0; this.y = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.h = 0; this.av = 0; this.steer = 0; this.onGround = true; this.pitch = 0; this.lean = 0; this.vf = 0;
    this.roll = 0; this.rollV = 0; this.pit = 0; this.pitV = 0; this.tumble = false; this.flipped = false;
    this.health = this.st.hp; this.maxHp = this.st.hp; this.wrecked = false; this.nitro = 1; this.air = 1; this.boosting = false; this.slip = 0;
    this.wdmg = [0, 0, 0, 0]; this.wlost = [false, false, false, false]; this.lostCount = 0; this.drag = 0; this.pull = 0;
    this.engineDmg = 0; this.frontDmg = 0; this.rearDmg = 0; this.glassBroken = false; this.headBroken = false; this.tailBroken = false; this.uniq = false;
    this.abandoned = false; this.mission = false; this.own = false; this.ry = 0; this.pvf = 0; this.accF = 0; this.skid = null;
    this.input = { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0, park: 0 };
    this.sunk = false; this.splashed = false; this.wetT = 0;
    this.ai = null; this.airT = 0; this.age = 0; this.burnT = 0; this.bump = 0; this.hitCd = 0; this.smokeT = 0;
    this.bike = !!this.model.bike; this.bikeLean = 0; this.wh = 0; this.tank = !!this.model.tank;
    if (this.bike) { this.cr = 0.42; this.co = [d.front - 0.42, 0, d.rear + 0.42]; setRiderLook(this.model, { shirt: pick(TRAFFIC_COLORS), pants: pick(['#2a3550', '#1b1c1f', '#3a3d42']), skin: pick(SKIN), helmet: pick(TRAFFIC_COLORS) }); }
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
  place(x, z, h, speed = 0) {
    this.x = x; this.z = z; this.h = h; this.y = heightAt(x, z); this.vx = Math.sin(h) * speed; this.vz = Math.cos(h) * speed; this.av = 0; this.vy = 0; this.onGround = true;
    this.roll = this.pit = this.rollV = this.pitV = 0; this.tumble = this.flipped = false; this.syncModel(0);
  }
  remove() {
    scene.remove(this.obj); disposeModel(this.model);
    if (this.uniq) for (const m of this.model.deformables) if (m.userData.orig) m.geometry.dispose();
    const i = VEH.list.indexOf(this); if (i >= 0) VEH.list.splice(i, 1);
  }
  syncModel(dt) {
    const upright = this.onGround && !this.tumble && !this.flipped && !this.loop;
    this.ry = upright && dt ? lerp(this.ry, this.y, damp(16, dt)) : this.y; // soft suspension over curbs
    const o = this.obj; o.position.set(this.x, this.ry + this.bump * 0.5, this.z); o.rotation.y = this.h;
    const fx = Math.sin(this.h), fz = Math.cos(this.h), hb = this.st.wb / 2;
    let pt;
    if (upright) { const hf = heightAt(this.x + fx * hb, this.z + fz * hb), hr = heightAt(this.x - fx * hb, this.z - fz * hb); pt = -Math.atan2(hf - hr, this.st.wb); }
    else if (this.tumble || this.flipped) pt = 0;
    else if (this.jetOn) pt = clamp((this.input.brake - this.input.throttle) * 0.14, -0.2, 0.2);
    else pt = clamp(-Math.atan2(this.vy, Math.max(4, Math.abs(this.vf))) * 0.7, -0.6, 0.6);
    this.pitch = this.loop ? 0 : lerp(this.pitch, pt, dt ? damp(upright ? 14 : 3, dt) : 1);
    // lean with the ground side to side too (banked turns, ramp edges, kerbs)
    let bk = 0;
    if (upright && !this.bike) { const tr = this.trk || (this.trk = ((BODIES[this.cfg.body] || {}).track || 1.6) / 2), rx = -fz, rz = fx; bk = Math.atan2(heightAt(this.x - rx * tr, this.z - rz * tr) - heightAt(this.x + rx * tr, this.z + rz * tr), tr * 2); }
    this.bank = lerp(this.bank || 0, bk, dt ? damp(14, dt) : 1);
    const ln = upright ? clamp(this.av * this.vf * 0.0055, -0.07, 0.07) : 0;
    this.lean = lerp(this.lean, ln, dt ? damp(6, dt) : 1);
    let sagR = 0, sagP = 0; const L = this.wlost;
    if (L[0]) { sagR -= 0.06; sagP += 0.05; } if (L[1]) { sagR += 0.06; sagP += 0.05; } if (L[2]) { sagR -= 0.06; sagP -= 0.05; } if (L[3]) { sagR += 0.06; sagP -= 0.05; }
    if (this.bike) {
      // bikes lean into the turn (and stand on the kickstand when parked); hard launches lift the front wheel
      const ridden = this.kind === 'player' || !!this.ai || !!this.remote;
      let tgt = 0;
      if (upright) tgt = this.remote ? (this.netLean || 0) : ridden || Math.abs(this.vf) > 2 ? clamp(-Math.atan2(this.av * this.vf, GRAV), -0.78, 0.78) : 0.13;
      this.bikeLean = lerp(this.bikeLean, tgt, dt ? damp(7, dt) : 1);
      const whT = upright && !this.remote && this.input.throttle > 0.9 && this.vf > 1.5 && this.vf < 17 && this.accF > 8 ? 0.3 : this.remote ? (this.netWh || 0) : 0;
      this.wh = lerp(this.wh, whT, dt ? damp(whT > this.wh ? 5 : 8, dt) : 1);
      const pc = this.onGround || this.tumble || this.flipped ? this.hc : 0.62;
      this.model.pivot.rotation.x = this.pitch + this.pit - this.wh; this.model.pivot.position.y = pc + Math.sin(this.wh) * this.st.wb / 2; this.model.inner.position.y = -pc;
      this.model.pivot.rotation.z = this.roll + this.bikeLean; this.model.body.rotation.z = 0;
      const showRider = ridden && !(this === G.player && CAM.fpBike);
      if (this.model.rider.visible !== showRider) this.model.rider.visible = showRider;
    } else {
      this.model.pivot.rotation.x = this.pitch + this.pit + sagP;
      this.model.pivot.rotation.z = this.roll + sagR + this.bank;
      this.model.body.rotation.z = this.lean;
    }
    if (dt) { const acc = (this.vf - this.pvf) / dt; this.pvf = this.vf; this.accF = lerp(this.accF, upright ? clamp(acc, -25, 25) : 0, damp(7, dt)); }
    this.model.body.rotation.x = clamp(-this.accF * 0.0022, -0.045, 0.045); // squat under power, dive under braking
    this.bump *= Math.exp(-10 * (dt || 0));
    if (dt) {
      const spin = this.vf / this.wr * dt;
      for (const w of this.model.wheels) { if (w.spin.parent !== w.pivot || !w.pivot.parent || w.pivot.parent !== this.model.inner) continue; w.spin.rotation.x += upright || this.loop ? spin : spin * 0.3; if (w.front) w.pivot.rotation.y = this.steer * 0.5; w.pivot.rotation.z = w.bent; }
    }
  }
}
function stepVehicle(v, dt) {
  if (v.remote) return;
  if (v.loop) { loopStep(v, dt); return; }
  const TB = BODIES[v.cfg.body];
  v.jetOn = !!(TB && TB.thrusters) && !v.wrecked && !v.sunk && !!v.input.jet && v.air > 0.01 && !v.tumble && !v.flipped;
  if (v.onGround && !v.jetOn) v.jetUsed = false;
  if (v.jetOn && v.onGround) { v.onGround = false; v.airT = 0; v.airX = v.x; v.airZ = v.z; v.flipAcc = 0; v.pitV = 0; v.rollV = 0; v.vy = Math.max(v.vy || 0, 3); v.y += 0.05; }
  if (v.jetOn) v.jetUsed = true;
  const inp = v.input, st = v.st;
  const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx;
  let vf = v.vx * fx + v.vz * fz, vr = v.vx * rx + v.vz * rz;
  const upright = v.onGround && !v.tumble && !v.flipped;
  const sTarget = (v.wrecked || !upright) ? 0 : inp.steer;
  const sRate = v.kind === 'player' ? (Math.abs(sTarget) < Math.abs(v.steer) || sTarget * v.steer < 0 ? 10 : 6.5 / (1 + Math.abs(vf) / 30)) : 6;
  v.steer += (sTarget - v.steer) * Math.min(1, dt * sRate);
  const lost = v.lostCount;
  if (upright) {
    const thr = (v.wrecked || v.sunk) ? 0 : inp.throttle, brk = (v.wrecked || v.sunk) ? 0 : inp.brake, park = inp.park || v.wrecked || v.sunk;
    const boosting = !v.wrecked && inp.nitro && v.nitro > 0.02 && st.nitro && thr > 0;
    v.boosting = boosting;
    const eng = (1 - v.engineDmg * 0.55) * (1 - lost * 0.18);
    const top = st.top * (boosting ? 1.25 : 1) * eng;
    if (thr > 0) {
      if (vf < -0.3) vf += st.brake * thr * dt;
      else { const r = Math.max(0, vf / top); vf += st.acc * eng * thr * (boosting ? 1.75 : 1) * Math.max(0, 1 - r * r * r) * dt; }
    }
    if (brk > 0) { if (vf > 0.3) vf -= st.brake * brk * dt; else if (vf > -st.top * 0.28) vf -= st.acc * 0.55 * brk * dt; }
    const rr = (thr <= 0 && brk <= 0 ? 0.9 + Math.abs(vf) * 0.012 : 0) + lost * 2.6;
    if (rr > 0) { const c = rr * dt; vf = Math.abs(vf) <= c ? 0 : vf - Math.sign(vf) * c; }
    if (inp.hand) { const c = 6 * dt; vf = Math.abs(vf) <= c ? 0 : vf - Math.sign(vf) * c; }
    if (park) { const c = 9 * dt; vf = Math.abs(vf) <= c ? 0 : vf - Math.sign(vf) * c; if (vf === 0) { vr *= Math.exp(-14 * dt); v.av *= Math.exp(-14 * dt); } }
    const lg = (inp.hand ? 1.4 : 8.5) * st.grip * (v.wrecked ? 0.5 : 1) * (1 - lost * 0.22);
    v.slip = Math.abs(vr);
    vr *= Math.exp(-lg * dt);
    const sa = clamp(v.steer + v.pull, -1.2, 1.2) * st.steerMax / (1 + Math.abs(vf) / st.steerFall);
    let yaw = vf * Math.tan(sa) / st.wb;
    const yawMax = st.grip * (inp.hand ? 30 : 19) * (v.bike ? 1.15 : 1) / Math.max(3, Math.abs(vf));
    yaw = clamp(yaw, -yawMax, yawMax);
    if (v.tank) yaw = yaw * 0.4 + v.steer * 0.8 * clamp(1 - Math.abs(vf) / 14, 0.3, 1);
    if (inp.hand && Math.abs(vf) > 5) yaw *= 1.4;
    if (W.liftOff && Math.abs(vf) > 1) {   // banked ground: gravity pulls you towards the low side, so a fast car holds a line high on the wall
      const sr = (heightAt(v.x + rx * 0.9, v.z + rz * 0.9) - heightAt(v.x - rx * 0.9, v.z - rz * 0.9)) / 1.8;
      if (Math.abs(sr) > 0.04) yaw += GRAV * sr / Math.sqrt(1 + sr * sr) / Math.max(4, Math.abs(vf)) * Math.sign(vf) * 0.9;
    }
    yaw += v.drag * clamp(vf, -14, 14) * 0.03;
    v.av += (yaw - v.av) * Math.min(1, dt * 9);
    if (W.liftOff) { const hb = st.wb / 2, sl = (heightAt(v.x + fx * hb, v.z + fz * hb) - heightAt(v.x - fx * hb, v.z - fz * hb)) / st.wb; vf -= GRAV * sl / Math.sqrt(1 + sl * sl) * dt; }   // gravity along the slope
    v.vx = fx * vf + rx * vr; v.vz = fz * vf + rz * vr;
  } else if (v.flipped) {
    const k = Math.exp(-2.4 * dt); v.vx *= k; v.vz *= k; v.av *= Math.exp(-3 * dt); v.boosting = false;
  } else {
    v.vy -= GRAV * dt; v.av *= Math.exp(-0.6 * dt); if (!v.tumble) v.av += v.steer * 0.9 * dt; v.boosting = false;
    if (v.jetOn) {   // SpaceX thruster pack: cold-gas jets lift you, W / S thrust forward and back, A / D turn
      v.vy += (34 + (v.vy < 0 ? 12 : 0)) * dt; v.vy = Math.min(v.vy, 14);
      let hf = v.vx * fx + v.vz * fz, hr = v.vx * rx + v.vz * rz;
      hf = clamp(hf + (inp.throttle * 18 - inp.brake * 16) * dt, -15, 65); hr *= Math.exp(-2.5 * dt);
      v.vx = fx * hf + rx * hr; v.vz = fz * hf + rz * hr; vf = hf;
      v.av += (inp.steer * 1.5 - v.av) * Math.min(1, dt * 4);
    }
  }
  v.vf = vf;
  v.h += v.av * dt; v.x += v.vx * dt; v.z += v.vz * dt;
  if (TB && TB.thrusters && !v.onGround && W.bounds) {   // the edge walls are low, so a flying Roadster gets an invisible ceiling-high fence
    const B = W.bounds, m = 4;
    if (v.x < B.x0 + m) { v.x = B.x0 + m; v.vx = Math.max(0, v.vx); } else if (v.x > B.x1 - m) { v.x = B.x1 - m; v.vx = Math.min(0, v.vx); }
    if (v.z < B.z0 + m) { v.z = B.z0 + m; v.vz = Math.max(0, v.vz); } else if (v.z > B.z1 - m) { v.z = B.z1 - m; v.vz = Math.min(0, v.vz); }
  }
  if (v.boosting) v.nitro = Math.max(0, v.nitro - dt * 0.3); else v.nitro = Math.min(1, v.nitro + dt * 0.06);
  if (TB && TB.thrusters) { if (v.jetOn) v.air = Math.max(0, v.air - dt * 0.2); else if (v.onGround) v.air = Math.min(1, v.air + dt * 0.14); }   // about 5 s of thrust; the compressor refills it on the ground
  const gh = TB && TB.thrusters ? Math.max(heightAt(v.x, v.z), roofAt(v.x, v.z, v.y)) : heightAt(v.x, v.z);   // a flying car can set down on rooftops
  if (v.tumble) {
    v.y += v.vy * dt;
    v.roll = wrapA(v.roll + v.rollV * dt); v.pit = clamp(v.pit + v.pitV * dt, -1.35, 1.35);
    const req = gh + reqOffset(v);
    if (v.y <= req) {
      const imp = -v.vy; v.y = req;
      if (imp > 2.5) { v.vy = imp * 0.3; groundHit(v, imp); } else v.vy = Math.max(0, v.vy);
      const hk = Math.exp(-1.3 * dt); v.vx *= hk; v.vz *= hk; v.av *= Math.exp(-2.5 * dt);
      const ar = Math.abs(v.roll), sg = Math.sign(v.roll) || 1, target = v.bike ? Math.PI / 2 : ar < 0.95 ? 0 : ar < 2.3 ? Math.PI / 2 : Math.PI;
      v.rollV += (target - ar) * sg * 20 * dt; v.rollV *= Math.exp(-4 * dt);
      v.pitV += -v.pit * 16 * dt; v.pitV *= Math.exp(-5 * dt);
      if (target !== 0 && Math.hypot(v.vx, v.vz) > 4) scrapeFX(v);
      if (Math.abs(v.rollV) < 0.4 && Math.abs(v.pitV) < 0.5 && v.vy < 0.7 && Math.abs(target - ar) < 0.15) {
        v.tumble = false; v.vy = 0;
        if (target === 0) { v.onGround = true; v.roll = v.pit = v.rollV = v.pitV = 0; v.y = gh; }
        else { v.flipped = true; v.onGround = false; v.roll = sg * target; v.rollV = 0; v.pit = 0; v.pitV = 0; if (v === G.player) feed('Your car flipped. Press R to roll it back', 'red'); }
      }
    } else { v.rollV *= Math.exp(-0.15 * dt); v.pitV *= Math.exp(-0.3 * dt); }
  } else if (v.flipped) {
    v.y = gh + reqOffset(v); v.vy = 0;
    if (Math.hypot(v.vx, v.vz) > 3) scrapeFX(v);
    if (Math.abs(v.rollV) > 1.2) { v.flipped = false; v.tumble = true; v.vy = 2.5; }
  } else if (v.onGround) {
    const climb = W.liftOff ? Math.max(0.55, Math.hypot(v.vx, v.vz) * dt * 2.6) : 0.55;
    if (gh > v.y + climb) {
      v.x -= v.vx * dt; v.z -= v.vz * dt; const imp = Math.hypot(v.vx, v.vz); v.vx *= -0.2; v.vz *= -0.2;
      if (imp > 4) vehicleImpact(v, imp * 0.8, v.x + fx * v.front, v.y + 0.6, v.z + fz * v.front);
    } else if (gh < v.y - 0.35) { v.onGround = false; v.airT = 0; v.airX = v.x; v.airZ = v.z; v.flipAcc = 0; v.pitV = 0; }
    else if (gh > v.y + 0.07 && v.slip > 12.5 && settings.damage !== 'arcade' && Math.random() < 0.35) startTumble(v, Math.sign(vr || 1) * (v.slip - 9) * 0.45, rand(-0.2, 0.2), 3);
    else if (W.liftOff && (v.svy || 0) > 3 && gh < v.y + ((v.svy || 0) - GRAV * dt) * dt - 0.02) { v.onGround = false; v.vy = v.svy; v.svy = 0; v.airT = 0; v.airX = v.x; v.airZ = v.z; v.flipAcc = 0; v.pitV = 0; v.y += v.vy * dt; }
    else { v.vy = clamp((gh - v.y) / dt, -15, W.liftOff ? 45 : 25); v.y = gh; if (W.liftOff) v.svy = lerp(v.svy || 0, v.vy, Math.min(1, dt * 8)); }
    v.roll *= Math.exp(-8 * dt); v.pit *= Math.exp(-8 * dt);
  } else {
    v.y += v.vy * dt; v.airT += dt;
    // on a motorbike you control the spin in the air: S pulls a backflip, W pushes a frontflip
    const flipper = v.bike && v.kind === 'player' && !v.wrecked && Math.abs(v.rollV) < 0.4 && !v.jetOn;
    if (v.jetOn && v.bike) { v.pitV *= Math.exp(-6 * dt); v.pit = wrapA(v.pit) * Math.exp(-4 * dt); v.flipAcc = 0; }   // thrusters hold a bike level
    if (flipper) {
      const B = BODIES[v.cfg.body] || {}, k = B.air || 1, ip = (inp.throttle > 0 ? 1 : 0) - (inp.brake > 0 ? 1 : 0);
      v.pitV = clamp(v.pitV + ip * 9 * k * dt, -6.5 * k, 6.5 * k);
      if (!ip) { v.pitV *= Math.exp(-3.5 * dt); const lv = wrapA(v.pit); if (Math.abs(lv) < 1.0) v.pitV -= lv * 7 * dt; }   // let go and it settles back level
      v.pit += v.pitV * dt; v.flipAcc = (v.flipAcc || 0) + v.pitV * dt;
    }
    if (!flipper && (Math.abs(v.rollV) > 0.4 || Math.abs(v.pitV) > 0.6)) v.tumble = true;
    else if (v.y <= gh) {
      let imp = -v.vy;
      if (W.liftOff) { const sp = Math.hypot(v.vx, v.vz) || 1, ux = v.vx / sp, uz = v.vz / sp, m = (heightAt(v.x + ux, v.z + uz) - heightAt(v.x - ux, v.z - uz)) / 2; imp = Math.max(0, -(v.vy - m * sp) / Math.sqrt(1 + m * m)); }
      v.y = gh; v.vy = 0; v.onGround = true; v.bump = -Math.min(0.25, imp * 0.02); v.rollV = 0;
      let crashed = false;
      if (flipper) {
        const a = wrapA(v.pit), n = Math.round(Math.abs(v.flipAcc || 0) / TAU);
        if (Math.abs(a) > 0.78) { crashed = true; bikeThrow(v, 22); }
        else { v.pit = a; if (n >= 1) bikeFlipLanded(v, v.flipAcc < 0 ? 'back' : 'front', n); }
        v.flipAcc = 0;
      }
      v.pitV = 0;
      const dT = W.liftOff ? 20 : 9;   // the Testing Zone's landings are built for big air
      if (imp > dT) { damageVehicle(v, (imp - dT) * (W.liftOff ? 1.0 : 2.2), null); if (v === G.player) { G.shake = Math.max(G.shake, imp * 0.02); SFX.crash(imp * 0.6); } }
      if (v.bike && !crashed && imp > 13 * ((BODIES[v.cfg.body] || {}).land || (BODIES[v.cfg.body] || {}).tough || 1)) bikeThrow(v, imp * 0.8);
      if (v === G.player) onPlayerLand(v);
    }
  }
  if (W.loopTracks && W.loopTracks.length && v.onGround && !v.tumble && !v.flipped && !v.loop) loopTryEnter(v, dt);
}
// ---------------- soft-body style crash damage ----------------
const DMG_MULT = { arcade: 0.45, realistic: 1, brutal: 1.8 };
const dmgMult = () => DMG_MULT[settings.damage] || 1;
function reqOffset(v) {
  const cr = Math.abs(Math.cos(v.roll)), sr = Math.abs(Math.sin(v.roll)), cp = Math.abs(Math.cos(v.pit)), sp = Math.abs(Math.sin(v.pit));
  return cr * cp * v.hc + sr * v.halfW + sp * (v.front - v.rear) * 0.4 - v.hc;
}
function bikeFlipLanded(v, type, n) {
  if (v.jetUsed) return;   // no flip credit for thruster-assisted flights
  const word = (n === 2 ? 'Double ' : n >= 3 ? 'Triple ' : '') + (type === 'back' ? 'backflip' : 'frontflip');
  if (v === G.player) { feed(word.charAt(0).toUpperCase() + word.slice(1) + '!  +$' + 75 * n, 'green'); addCash(75 * n); SFX.ding(); G.stats.flips = (G.stats.flips || 0) + n; }
  MIS.lastFlip = { type, n, t: GT };
  if (v === G.player) addStyle(word.toUpperCase(), 1300 * n);
}
// a motorbike crash throws the rider off; the bike goes down on its side
function bikeThrow(v, power) {
  if (!v.bike || v.remote || (v.thrownT && GT - v.thrownT < 0.4)) return;
  const sp = Math.hypot(v.vx, v.vz); v.thrownT = GT;
  if (v === G.player && !G.down && !G.plane) {
    v.kind = 'parked'; v.abandoned = true; v.abandonT = GT; Object.assign(v.input, { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0 });
    if (headSpot.parent) headSpot.parent.remove(headSpot, headSpot.target);
    SFX.hornSet(false); hornOn = false; G.player = null;
    heroShow(v.x, v.z, v.h); const p = HERO.p; p.y = v.y + 0.9;
    HERO.bailCar = v; HERO.bailUntil = GT + 1.5;
    toRagdoll(p, v.vx * 0.85, v.vz * 0.85, Math.min(3.5 + sp * 0.25, 10), null);
    let dmg = clamp((power - 6) * 2.6 + sp * 0.55, 4, 90); if (HERO.armor > 0) { const a = Math.min(HERO.armor, dmg * 0.75); HERO.armor -= a; dmg -= a; }
    HERO.hp -= dmg; HERO.hurtT = 1; HERO.lastCause = 'bike'; HERO.lastHurt = GT;
    if (HERO.hp <= 0) { HERO.hp = 0; p.dead = true; playerDown('wasted', 'Thrown from your motorbike'); } else feed('You came off the bike!', 'red');
  } else if (v.ai) {
    const q = spawnPedAt(v.x, v.z, v.police ? 'cop' : 'civ');
    if (q) { q.y = v.y + 0.9; toRagdoll(q, v.vx * 0.85, v.vz * 0.85, 3.5 + sp * 0.22, null); if (sp > 14) killPed(q, v.lastPlayerHit > GT - 2); }
    v.ai = null; v.kind = 'parked'; v.abandoned = true; v.abandonT = GT;
  } else if (v.kind !== 'parked') return;
  if (!v.tumble && !v.flipped) { v.rollV += (Math.random() < 0.5 ? -1 : 1) * (1.6 + sp * 0.05); v.tumble = true; v.onGround = false; v.vy = Math.max(v.vy, 1.2); v.airT = 0; v.airX = v.x; v.airZ = v.z; }
}
function startTumble(v, rv, pv, vy) {
  if (v === G.player) styleCrash();
  if (v.bike) bikeThrow(v, 12);
  if (v === G.player && !v.tumble && Math.hypot(v.vx, v.vz) > 12) crashCam(14, v.x, v.z);
  v.flipped = false; v.tumble = true; v.onGround = false; v.rollV += rv; v.pitV += pv || 0; v.vy = Math.max(v.vy, vy || 0);
  v.airT = 0; v.airX = v.x; v.airZ = v.z;
}
function rollFromHit(v, dvx, dvz) {
  if (v.tumble) return;
  const lat = dvx * -Math.cos(v.h) + dvz * Math.sin(v.h), mag = Math.abs(lat), thr = 7.5 / Math.sqrt(dmgMult());
  if (mag > thr) startTumble(v, Math.sign(lat) * (mag - thr * 0.75) * 0.34, rand(-0.4, 0.4), Math.min(6.5, (mag - thr) * 0.35 + 1.8));
}
function groundHit(v, imp) {
  if (imp > 4) damageVehicle(v, (imp - 4) * 3 * Math.sqrt(dmgMult()), null);
  const sr = Math.sin(v.roll), cr = Math.cos(v.roll), sp = Math.sin(v.pit), cp = Math.cos(v.pit);
  const dx = -sr * cp, dy = -cr * cp, dz = sp;
  if (dy < -0.6) return; // came down on its wheels
  const zc = (v.front + v.rear) / 2, k = Math.abs(dx) * v.halfW + Math.abs(dy) * v.hc + Math.abs(dz) * (v.front - v.rear) / 2;
  const lx = dx * k, ly = v.hc + dy * k, lz = zc + dz * k;
  deformLocal(v, lx, ly, lz, -dx, -dy, -dz, imp * 1.5);
  if (dy > 0.3 && imp > 3.5) breakGlass(v);
  const c = Math.cos(v.h), s = Math.sin(v.h), wx = v.x + lx * c + lz * s, wz = v.z - lx * s + lz * c;
  if (imp > 4) { sparks(wx, v.y + 0.2, wz, 6); const dist = Math.hypot(wx - camera.position.x, wz - camera.position.z); if (dist < 80) SFX.crash(imp * 1.2 * (1 - dist / 90)); }
  if (v === G.player) G.shake = Math.max(G.shake, Math.min(0.5, imp * 0.04));
}
function scrapeFX(v) {
  if (Math.random() < 0.5) { const c = Math.cos(v.h), s = Math.sin(v.h), lx = rand(-v.halfW, v.halfW), lz = rand(v.rear, v.front); sparks(v.x + lx * c + lz * s, v.y + 0.1, v.z - lx * s + lz * c, 2); }
  if (v === G.player) G.scrape = 1;
}
function ensureUniq(v) {
  if (v.uniq) return; v.uniq = true;
  for (const m of v.model.deformables) { if (m.parent !== v.model.body) continue; m.geometry = m.geometry.clone(); m.userData.orig = m.geometry.attributes.position.array.slice(); }
}
const _hash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
// push vertices near a body-space point along a direction, with crumple noise
function deformLocal(v, lx, ly, lz, nx, ny, nz, e) {
  e *= dmgMult(); if (e < 3) return;
  ensureUniq(v);
  const R = clamp(0.5 + e * 0.05, 0.55, 1.9), depth = clamp((e - 3) * 0.026, 0, 0.62), R2 = R * R, side = Math.abs(ny) < 0.5;
  const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
  for (const mesh of v.model.deformables) {
    if (!mesh.userData.orig || mesh.parent !== v.model.body) continue;
    const g = mesh.geometry, a = g.attributes.position.array, o = mesh.userData.orig;
    let dirty = false;
    for (let i = 0; i < a.length; i += 3) {
      const dx = a[i] - lx, dy = a[i + 1] - ly, dz = a[i + 2] - lz, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > R2) continue;
      let f = 1 - Math.sqrt(d2) / R; f = f * f * (3 - 2 * f);
      const h = _hash(o[i], o[i + 1], o[i + 2]), amt = depth * f * (0.55 + h * 0.9);
      let px = a[i] + nx * amt, py = a[i + 1] + ny * amt + (h - 0.5) * amt * 0.6, pz = a[i + 2] + nz * amt;
      if (side && o[i + 1] > ly + 0.12) py += amt * (0.2 + h * 0.3); // panels buckle upward
      const ex = px - o[i], ey = py - o[i + 1], ez = pz - o[i + 2], el = Math.hypot(ex, ey, ez);
      if (el > 0.95) { px = o[i] + ex / el * 0.95; py = o[i + 1] + ey / el * 0.95; pz = o[i + 2] + ez / el * 0.95; }
      a[i] = px; a[i + 1] = Math.max(0.02, py); a[i + 2] = pz; dirty = true;
    }
    if (dirty) { g.attributes.position.needsUpdate = true; if (mesh.userData.crease) creaseNormals(g); else g.computeVertexNormals(); }
  }
}
function deformAt(v, wx, wy, wz, e) {
  const dx = wx - v.x, dz = wz - v.z, c = Math.cos(v.h), s = Math.sin(v.h);
  const lx = clamp(dx * c - dz * s, -v.halfW, v.halfW), lz = clamp(dx * s + dz * c, v.rear, v.front), ly = clamp(wy - v.y, 0.3, v.height * 0.8);
  const dS = v.halfW - Math.abs(lx), dF = v.front - lz, dR = lz - v.rear;
  let nx = 0, nz = 0;
  if (dS < dF && dS < dR) nx = -Math.sign(lx || 1); else if (dF < dR) nz = -1; else nz = 1;
  deformLocal(v, lx, ly, lz, nx, -0.1, nz, e);
  damageParts(v, lx, ly, lz, e * dmgMult());
}
function localToWorld(v, lx, ly, lz) { const c = Math.cos(v.h), s = Math.sin(v.h); return { x: v.x + lx * c + lz * s, y: v.y + ly, z: v.z - lx * s + lz * c }; }
function glassFX(v, lx, ly, lz, n) {
  const p = localToWorld(v, lx, ly, lz);
  for (let k = 0; k < n; k++) FX.debris.emit(p.x + rand(-0.4, 0.4), p.y + rand(-0.2, 0.3), p.z + rand(-0.4, 0.4), v.vx * 0.5 + rand(-3, 3), rand(1, 4), v.vz * 0.5 + rand(-3, 3), rand(1.2, 2.2), rand(0.03, 0.07), COL.glass, 0.9, 18, 0.3, 0, 3);
}
function breakGlass(v) {
  if (v.glassBroken || v.tank) return; v.glassBroken = true;
  v.model.glassMesh.material = MAT.glassBroken;
  glassFX(v, 0, v.height * 0.75, (v.front + v.rear) / 2, 34);
  SFX.glass(clamp(1 - Math.hypot(v.x - camera.position.x, v.z - camera.position.z) / 80, 0, 1));
}
function damageParts(v, lx, ly, lz, e) {
  const M = v.model;
  if (lz > v.front - 1.0) {
    v.frontDmg += e; v.engineDmg = Math.min(0.75, v.frontDmg / 140);
    if (e > 7 && !v.headBroken) { v.headBroken = true; M.headMesh.material = MAT.lightOff; glassFX(v, lx, 0.65, v.front, 8); }
    if (M.bumperF.parent === M.body && (e > 13 || v.frontDmg > 32)) detachPart(v, M.bumperF, 1);
  }
  if (lz < v.rear + 1.0) {
    v.rearDmg += e;
    if (e > 7 && !v.tailBroken) { v.tailBroken = true; M.tailMesh.material = MAT.lightOff; glassFX(v, lx, 0.8, v.rear, 6); }
    if (M.bumperR.parent === M.body && (e > 13 || v.rearDmg > 32)) detachPart(v, M.bumperR, -1);
  }
  if (!v.bike && !v.tank) for (let i = 0; i < 4; i++) {
    if (v.wlost[i]) continue;
    const w = M.wheels[i], d = Math.hypot(lx - w.pivot.position.x, lz - w.pivot.position.z);
    if (d > 1.1) continue;
    v.wdmg[i] += e * (1.1 - d);
    if (v.wdmg[i] > 14 && !w.bent) { w.bent = (Math.random() < 0.5 ? 1 : -1) * rand(0.08, 0.2); if (w.front) v.pull = clamp(v.pull + w.bent * 0.6, -0.25, 0.25); }
    if (v.wdmg[i] > 34 && e > 9) detachWheel(v, i);
  }
  if (!v.glassBroken && ((e > 12 && ly > 0.7) || e > 18)) breakGlass(v);
}
// ---------------- cinematic crash cam ----------------
function crashCam(strength, x, z) {
  if (settings.slowmo === 'off' || G.down || APP.mode !== 'game' || GT - G.slowCd < 6) return;
  G.slowCd = GT; G.slowDur = clamp(1.3 + strength * 0.03, 1.4, 2.2); G.slowmo = G.slowDur; G.orbitSide = Math.random() < 0.5 ? -1 : 1;
  SFX.boom();
}
function slowFactor() { if (G.slowmo <= 0) return 1; const p = 1 - G.slowmo / G.slowDur; return p < 0.06 ? lerp(1, 0.2, p / 0.06) : p < 0.72 ? 0.2 : lerp(0.2, 1, (p - 0.72) / 0.28); }
function slowCurve() { if (G.slowmo <= 0) return 0; return Math.sin(clamp(1 - G.slowmo / G.slowDur, 0, 1) * Math.PI); }
// ---------------- skid marks ----------------
const SKID = { mesh: null, i: 0, max: 1800 };
function initSkids() {
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: 0x0b0b0c, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  SKID.mesh = new THREE.InstancedMesh(g, m, SKID.max); SKID.mesh.frustumCulled = false; SKID.mesh.renderOrder = 2;
  for (let k = 0; k < SKID.max; k++) SKID.mesh.setMatrixAt(k, _zeroM);
  SKID.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(SKID.mesh);
}
function clearSkids() { for (let k = 0; k < SKID.max; k++) SKID.mesh.setMatrixAt(k, _zeroM); SKID.mesh.instanceMatrix.needsUpdate = true; for (const v of VEH.list) v.skid = null; }
function skidMark(x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); if (len < 0.05 || len > 3) return;
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  _v1.set(mx, heightAt(mx, mz) + 0.014, mz); _q.setFromAxisAngle(UP, Math.atan2(dx, dz)); _s.set(0.24, 1, len + 0.05);
  _m.compose(_v1, _q, _s); _s.set(1, 1, 1);
  SKID.mesh.setMatrixAt(SKID.i++ % SKID.max, _m); SKID.mesh.instanceMatrix.needsUpdate = true;
}
function updateSkids(v) {
  const I = v.input, up = v.onGround && !v.tumble && !v.flipped;
  const sk = up && (v.slip > 3.8 || (I.hand && Math.abs(v.vf) > 5) || (I.brake > 0.7 && v.vf > 9) || (v.kind === 'player' && I.throttle > 0.9 && I.hand && Math.abs(v.vf) < 7));
  if (!sk) { v.skid = null; return; }
  const c = Math.cos(v.h), s = Math.sin(v.h), hw = v.model.dims.track / 2, rz = -v.st.wb / 2, fz = v.st.wb / 2;
  const pts = [[v.x + hw * c + rz * s, v.z - hw * s + rz * c], [v.x - hw * c + rz * s, v.z + hw * s + rz * c]];
  if (v.slip > 6) pts.push([v.x + hw * c + fz * s, v.z - hw * s + fz * c], [v.x - hw * c + fz * s, v.z + hw * s + fz * c]);
  if (!v.skid) { v.skid = pts; return; }
  v.skid.length = Math.min(v.skid.length, pts.length);
  for (let k = 0; k < pts.length; k++) {
    const L = v.skid[k]; if (!L) { v.skid[k] = pts[k]; continue; }
    if ((pts[k][0] - L[0]) ** 2 + (pts[k][1] - L[1]) ** 2 > 0.16) { if (!(v.wlost[k === 0 ? 2 : k === 1 ? 3 : k === 2 ? 0 : 1])) skidMark(L[0], L[1], pts[k][0], pts[k][1]); v.skid[k] = pts[k]; }
  }
}
// ---------------- water: splashes, sinking, swimming out ----------------
function splash(x, z, power) {
  const n = Math.min(60, 12 + power * 3);
  for (let k = 0; k < n; k++) FX.blood.emit(x + rand(-1.5, 1.5), 0.1, z + rand(-1.5, 1.5), rand(-3, 3), rand(3, 6 + power * 0.25), rand(-3, 3), rand(1, 1.8), rand(0.15, 0.35), COL.water, 0.85, 16, 0.3, 0, 2);
  for (let k = 0; k < 10; k++) FX.smoke.emit(x + rand(-2, 2), 0.3, z + rand(-2, 2), rand(-1, 1), rand(1, 2.5), rand(-1, 1), rand(1, 2), rand(1, 2), COL.water, 0.35, -0.2, 0.6, 1.2, 4);
  const d = Math.hypot(x - camera.position.x, z - camera.position.z); if (d < 120) SFX.splashBig(clamp(1 - d / 130, 0.1, 1));
}
function vehicleWater(v, dt) {
  if (!W.waters || v.remote) return;
  const wet = v.y < WATER_SURF - 0.1 && waterAt(v.x, v.z);
  if (!wet) { if (v.y > 0.05) v.splashed = false; v.wetT = 0; return; }
  if (!v.splashed) { v.splashed = true; splash(v.x, v.z, Math.hypot(v.vx, v.vz) + Math.abs(v.vy)); }
  v.wetT += dt;
  const k = Math.exp(-2.2 * dt); v.vx *= k; v.vz *= k; v.av *= k;
  if (v.y < -0.6 && !v.sunk) {
    v.sunk = true; v.boosting = false;
    if (v.ai) { v.ai = null; v.kind = 'parked'; v.abandoned = true; v.abandonT = GT; }
    if (v === G.player) feed('Your car is sinking', 'blue');
  }
  if (v.wetT < 5 && Math.random() < 0.5) FX.smoke.emit(v.x + rand(-1, 1), 0.05, v.z + rand(-1.5, 1.5), 0, rand(0.3, 0.8), 0, 0.8, rand(0.15, 0.3), COL.water, 0.5, -1, 0.5, 0.1, 4);
  if (v === G.player && v.sunk && v.wetT > 1.2 && !G.down) swimOut(v);
}
const DEBRIS = [];
const _eul = new THREE.Euler();
function addDebris(mesh, vx, vy, vz, w, own, r) {
  DEBRIS.push({ m: mesh, vx, vy, vz, wx: w[0], wy: w[1], wz: w[2], t: 0, own, r: r || 0.12 });
  if (DEBRIS.length > 45) { const d = DEBRIS.shift(); scene.remove(d.m); if (d.own) d.m.geometry.dispose(); }
}
function detachPart(v, mesh, dir) {
  mesh.updateWorldMatrix(true, false);
  const g = mesh.geometry.clone(); g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-c.x, -c.y, -c.z);
  const wpos = c.clone().applyMatrix4(mesh.matrixWorld), wq = new THREE.Quaternion(); mesh.getWorldQuaternion(wq);
  mesh.parent.remove(mesh); mesh.geometry = g; mesh.position.copy(wpos); mesh.quaternion.copy(wq); mesh.scale.set(1, 1, 1); mesh.castShadow = true; scene.add(mesh);
  const fx = Math.sin(v.h), fz = Math.cos(v.h);
  addDebris(mesh, v.vx * 0.7 + fx * dir * rand(1, 4) + rand(-2, 2), rand(2, 5), v.vz * 0.7 + fz * dir * rand(1, 4) + rand(-2, 2), [rand(-8, 8), rand(-6, 6), rand(-8, 8)], true, 0.11);
  SFX.clank(1);
}
function detachWheel(v, i) {
  if (v.wlost[i]) return;
  const w = v.model.wheels[i]; v.wlost[i] = true; v.lostCount++;
  v.drag += (w.pivot.position.x > 0 ? 1 : -1) * (w.front ? 1 : 0.6);
  const wp = w.pivot; wp.updateWorldMatrix(true, false);
  const m = wp.matrixWorld.clone(); wp.parent.remove(wp); m.decompose(wp.position, wp.quaternion, wp.scale); scene.add(wp);
  const side = w.pivot.scale.x < 0 ? -1 : 1, c = Math.cos(v.h), s = Math.sin(v.h);
  addDebris(wp, v.vx * 0.9 + side * c * rand(2, 5), rand(2, 4), v.vz * 0.9 - side * s * rand(2, 5), [rand(8, 16), rand(-2, 2), rand(-2, 2)], false, v.wr);
  const p = localToWorld(v, side * v.halfW, v.wr, w.pivot.position.z); sparks(p.x, p.y, p.z, 14);
  SFX.clank(1.2);
  if (v === G.player) feed('You lost a wheel', 'red');
}
function updateDebris(dt) {
  const cx = camera.position.x, cz = camera.position.z;
  for (let i = DEBRIS.length - 1; i >= 0; i--) {
    const d = DEBRIS[i], p = d.m.position; d.t += dt;
    d.vy -= 20 * dt; p.x += d.vx * dt; p.y += d.vy * dt; p.z += d.vz * dt;
    _q2.setFromEuler(_eul.set(d.wx * dt, d.wy * dt, d.wz * dt)); d.m.quaternion.multiply(_q2);
    const gh = heightAt(p.x, p.z) + d.r;
    if (p.y < gh) { p.y = gh; d.vy = Math.abs(d.vy) > 1.5 ? -d.vy * 0.3 : 0; d.vx *= 0.78; d.vz *= 0.78; d.wx *= 0.65; d.wy *= 0.65; d.wz *= 0.65; }
    if (d.t > 60 || (p.x - cx) ** 2 + (p.z - cz) ** 2 > 260 * 260) { scene.remove(d.m); if (d.own) d.m.geometry.dispose(); DEBRIS.splice(i, 1); }
  }
}
function clearDebris() { for (const d of DEBRIS) { scene.remove(d.m); if (d.own) d.m.geometry.dispose(); } DEBRIS.length = 0; }
const _bx = [];
function collideStatic(v) {
  if (v.remote || v.loop) return;
  const fx = Math.sin(v.h), fz = Math.cos(v.h), R = Math.max(v.front, -v.rear) + 1;
  W.boxGrid.query(v.x - R, v.z - R, v.x + R, v.z + R, _bx);
  for (const b of _bx) {
    if (v.y > b.h - 0.15) continue;
    for (let k = 0; k < 3; k++) {
      const r = v.cr, cx = v.x + fx * v.co[k], cz = v.z + fz * v.co[k];
      if (cx < b.x0 - r || cx > b.x1 + r || cz < b.z0 - r || cz > b.z1 + r) continue;
      const px = clamp(cx, b.x0, b.x1), pz = clamp(cz, b.z0, b.z1);
      const dx = cx - px, dz = cz - pz, d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      let nx, nz, pen;
      if (d2 < 1e-8) {
        const l = cx - b.x0, rr = b.x1 - cx, t = cz - b.z0, bt = b.z1 - cz, m = Math.min(l, rr, t, bt);
        if (m === l) { nx = -1; nz = 0; pen = l + r; } else if (m === rr) { nx = 1; nz = 0; pen = rr + r; } else if (m === t) { nx = 0; nz = -1; pen = t + r; } else { nx = 0; nz = 1; pen = bt + r; }
      } else { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = r - d; }
      v.x += nx * pen; v.z += nz * pen;
      const ox = px - v.x, oz = pz - v.z;
      const vcx = v.vx + v.av * oz, vcz = v.vz - v.av * ox;
      const vn = vcx * nx + vcz * nz;
      if (vn < 0) {
        if (v === G.player && -vn > 15) crashCam(-vn, px, pz);
        const e = 0.1, rn = oz * nx - ox * nz, Im = v.inertia / v.mass;
        const j = -(1 + e) * vn / (1 + rn * rn / Im);
        v.vx += nx * j; v.vz += nz * j; v.av += clamp(rn * j / Im * 0.6, -4, 4);
        const tx = -nz, tz = nx, vt = v.vx * tx + v.vz * tz; v.vx -= tx * vt * 0.1; v.vz -= tz * vt * 0.1;
        if (j > 3) vehicleImpact(v, j, px, v.y + 0.5, pz);
        if (b.trig && j > 3) b.trig(v);
        if (b.struct && j > 14) hitStruct(b.struct, (j - 14) * 2.4 * v.mass / 1400, px, v.y + 0.8, pz, v === G.player ? 'hero' : null);
        else if (Math.abs(vt) > 6 && v === G.player && Math.random() < 0.5) sparks(px, v.y + 0.4, pz, 2);
      }
    }
  }
}
function collideVehicles() {
  const L = VEH.list;
  for (let i = 0; i < L.length; i++) {
    const A = L[i];
    for (let j = i + 1; j < L.length; j++) {
      const B = L[j], dx = B.x - A.x, dz = B.z - A.z;
      if (dx * dx + dz * dz > 56 || A.loop || B.loop) continue;
      if (Math.abs(A.y - B.y) > 1.3) continue;
      const fax = Math.sin(A.h), faz = Math.cos(A.h), fbx = Math.sin(B.h), fbz = Math.cos(B.h);
      for (let ka = 0; ka < 3; ka++) for (let kb = 0; kb < 3; kb++) {
        const ax = A.x + fax * A.co[ka], az = A.z + faz * A.co[ka], bx = B.x + fbx * B.co[kb], bz = B.z + fbz * B.co[kb];
        const ddx = bx - ax, ddz = bz - az, d2 = ddx * ddx + ddz * ddz, rs = A.cr + B.cr;
        if (d2 >= rs * rs || d2 < 1e-8) continue;
        const d = Math.sqrt(d2), nx = ddx / d, nz = ddz / d, pen = rs - d;
        const iA = 1 / A.mass, iB = 1 / B.mass, tot = iA + iB;
        A.x -= nx * pen * iA / tot; A.z -= nz * pen * iA / tot; B.x += nx * pen * iB / tot; B.z += nz * pen * iB / tot;
        const px = ax + nx * A.cr, pz = az + nz * A.cr;
        const oAx = px - A.x, oAz = pz - A.z, oBx = px - B.x, oBz = pz - B.z;
        const vAx = A.vx + A.av * oAz, vAz = A.vz - A.av * oAx, vBx = B.vx + B.av * oBz, vBz = B.vz - B.av * oBx;
        const vn = (vBx - vAx) * nx + (vBz - vAz) * nz;
        if (vn >= 0) continue;
        // car vs another player's car: whoever is driving faster has their game decide the shove, so it only happens once
        const rem = A.remote ? A : B.remote ? B : null, me = rem ? (rem === A ? B : A) : null;
        if (rem && me === G.player && me.speed + 0.5 < rem.speed) continue;
        if (rem && me !== G.player) continue;
        if ((A === G.player || B === G.player) && -vn > 14) crashCam(-vn, px, pz);
        const rnA = oAz * nx - oAx * nz, rnB = oBz * nx - oBx * nz;
        const jj = -(1.12) * vn / (tot + rnA * rnA / A.inertia + rnB * rnB / B.inertia);
        A.vx -= nx * jj * iA; A.vz -= nz * jj * iA; B.vx += nx * jj * iB; B.vz += nz * jj * iB;
        A.av -= clamp(rnA * jj / A.inertia * 0.7, -4, 4); B.av += clamp(rnB * jj / B.inertia * 0.7, -4, 4);
        const dvA = jj * iA, dvB = jj * iB;
        if (A.tank !== B.tank && -vn > 2.2) { const T = A.tank ? A : B, O = A.tank ? B : A; damageVehicle(O, -vn * 10, T === G.player ? 'hero' : null); if (-vn > 4) deformAt(O, px, O.y + 1, pz, -vn * 2.6); }
        if (dvA > 7) rollFromHit(A, -nx * dvA, -nz * dvA);
        if (dvB > 7) rollFromHit(B, nx * dvB, nz * dvB);
        if (A.remote && B === G.player) netBump(A.remote, -nx * dvA, -nz * dvA);
        if (B.remote && A === G.player) netBump(B.remote, nx * dvB, nz * dvB);
        if (dvA > 2.5) vehicleImpact(A, dvA, px, (A.y + B.y) / 2 + 0.6, pz, B);
        if (dvB > 2.5) vehicleImpact(B, dvB, px, (A.y + B.y) / 2 + 0.6, pz, A);
        if (A === G.player || B === G.player) playerCarCrime(A === G.player ? B : A, Math.max(dvA, dvB));
      }
    }
  }
}
function vehicleImpact(v, intensity, x, y, z, other) {
  if (v.hitCd > 0 && intensity < 8) return;
  v.hitCd = 0.12;
  damageVehicle(v, Math.max(0, intensity - 3) * 2.4 * Math.sqrt(dmgMult()), other);
  if (intensity > 4) deformAt(v, x, y, z, intensity);
  const dist = Math.hypot(x - camera.position.x, z - camera.position.z);
  if (dist < 80) SFX.crash(intensity * (1 - dist / 90));
  if (intensity > 5) sparks(x, y, z, Math.min(18, intensity | 0));
  if (intensity > 7) { const pc = v.model.paintMesh.material.color; for (let k = 0; k < 4 + intensity * 0.3; k++) FX.debris.emit(x, y, z, rand(-4, 4), rand(2, 5), rand(-4, 4), 1.6, rand(0.05, 0.11), Math.random() < 0.5 ? COL.dark : pc, 1, 18, 0.5, 0, 3); }
  const pl = v === G.player || other === G.player;
  if (pl) G.shake = Math.max(G.shake, Math.min(0.7, intensity * 0.035));
  if (v.ai && other === G.player) { v.ai.honkT = 0; v.ai.angry = 3; }
  if (v.bike && intensity > 6.5 * ((BODIES[v.cfg.body] || {}).tough || 1)) bikeThrow(v, intensity);
}
function damageVehicle(v, amt, src) {
  if (v.wrecked || amt <= 0 || v.remote) return;
  v.health -= amt;
  if (v.health <= 0) { v.health = 0; wreckVehicle(v, src); }
}
function wreckVehicle(v, src) {
  if (v.wrecked) return;
  v.wrecked = true; v.burnT = 22;
  burnModel(v.model);
  explode(v.x, v.y + 0.8, v.z, 1.2, src, v);
  startTumble(v, rand(-3.5, 3.5), rand(-1.2, 1.2), 7); v.av += rand(-2, 2);
  if (v === G.player) playerDown('wasted');
  else if (isPlayerSrc(src) || v.lastPlayerHit > GT - 4) {
    if (v.police) { G.stats.cops++; addHeat(1.0, 2, true); feed('Police cruiser destroyed  +$50', 'red'); addCash(50); }
    else { G.stats.cars++; addHeat(0.45, 1, false); feed('Vehicle destroyed  +$25'); addCash(25); }
  }
}
function sparks(x, y, z, n) {
  for (let k = 0; k < n; k++) FX.fire.emit(x, y, z, rand(-5, 5), rand(1, 5), rand(-5, 5), rand(0.2, 0.5), rand(0.05, 0.1), COL.spark, 1, 16, 1, 0, 3);
}
function explode(x, y, z, power, src, self, big, remote) {
  schoolAlarm(x, z);
  if (!remote && (isPlayerSrc(src) || (self && self === G.player))) netFx(['e', nr2(x), nr2(y), nr2(z), nr2(power), big ? 1 : 0, BOOM.pug ? 1 : 0]);
  { const PP = PF(); if (PP && self !== G.player && Math.hypot(PP.x - x, PP.z - z) < 16) crashCam(16, x, z); }
  boomFX(x, y, z, power, big);
  if (BOOM.pug) {   // a pug bomb: a chain of blasts rolling out around the main one
    G.shake = Math.max(G.shake, 1.6);
    for (let k = 0; k < 6; k++) { const a = rand(0, TAU), rr = rand(7, 24), bx = x + Math.cos(a) * rr, bz = z + Math.sin(a) * rr; boomLater(rand(0.12, 0.8), () => boomFX(bx, heightAt(bx, bz) + 0.6, bz, rand(1.8, 3), false)); }
  }
  const R = big ? 42 : 9 * power;
  for (const v of VEH.list) {
    if (v === self || v.remote) continue;
    const dx = v.x - x, dz = v.z - z, d = Math.hypot(dx, dz);
    if (d > R) continue;
    const f0 = 1 - d / R, f = big ? f0 * f0 : f0;
    damageVehicle(v, f * 70 * power, src);
    const k = f * 14 * power / Math.max(0.5, d); v.vx += dx * k * 0.6; v.vz += dz * k * 0.6; v.av += rand(-3, 3) * f;
    startTumble(v, rand(-5, 5) * f * power, rand(-1.5, 1.5) * f, f * 8 * power);
    deformAt(v, x, y, z, f * 30 * power); if (f > 0.3) breakGlass(v);
    if (isPlayerSrc(src) && v !== G.player) v.lastPlayerHit = GT;
  }
  pedsExplosion(x, y, z, power * (big ? 1.5 : 1), src);
  jewelAt(x, y, z, 3 + power * 3, isPlayerSrc(src)); if (!remote) conBlast(x, z, power);
  for (const p of W.props) {
    if (p.st !== 0) continue; const d = Math.hypot(p.x - x, p.z - z);
    if (p.type === 'pump') { if (remote) { if (d < 2.5) p.st = 3; } else if (d < 6 * Math.max(1, power * 0.8)) { p.st = 3; boomLater(rand(0.2, 0.5), () => pumpBlast(p, src)); } }
    else if (d < 6 * power) knockProp(p, { vx: (p.x - x) * 2, vz: (p.z - z) * 2, kind: 'x' }, 10);
  }
  if (!remote && !BOOM.pug) damageStructsAt(x, y, z, power * (big ? 1.6 : 1), src);   // a pug bomb levels everything in reach on its own (pugLevel)
  damagePlanesAt(x, y, z, big ? 30 : 7 * power, power, src);
  if (HELI.active && !HELI.down) { const d = Math.hypot(HELI.x - x, HELI.y - y, HELI.z - z), R2 = (big ? 30 : 9 * power); if (d < R2) heliDamage((1 - d / R2) * 260 * power, isPlayerSrc(src)); }
}
// the Roadster's thruster plumes: four see-through cones of cold gas under the corners, made on first use
let JET_GEO = null, JET_MAT = null;
function jetPlumes(v) {
  if (!JET_GEO) {
    JET_GEO = new THREE.ConeGeometry(0.3, 1.8, 12, 6, true); JET_GEO.translate(0, -0.9, 0);   // nozzle at the tip, widening downward
    const pos = JET_GEO.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const b = Math.pow(1 + pos.getY(i) / 1.8, 2.2); col[i * 3] = 0.62 * b; col[i * 3 + 1] = 0.74 * b; col[i * 3 + 2] = 0.9 * b; }   // additive, so fading to black fades it out
    JET_GEO.setAttribute('color', new THREE.BufferAttribute(col, 3));
    JET_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false });
  }
  const g = new THREE.Group(), f = (v.bike ? 0.3 : 0.42) * (v.front - v.rear);
  for (const [z, x] of v.bike ? [[f, 0], [-f, 0]] : [[f, 0.7], [f, -0.7], [-f, 0.7], [-f, -0.7]]) { const m = new THREE.Mesh(JET_GEO, JET_MAT); m.position.set(x, 0.22, z); g.add(m); }
  g.visible = false; v.model.root.add(g); return g;
}
function vehicleEffects(v, dt) {
  const hp = v.health / v.maxHp, fx = Math.sin(v.h), fz = Math.cos(v.h);
  if (v.jetOn && !v.jetFX && v.model && v.model.root) v.jetFX = jetPlumes(v);
  if (v.jetFX) { v.jetFX.visible = !!v.jetOn; if (v.jetOn) for (const c of v.jetFX.children) { const k = 0.85 + Math.random() * 0.3; c.scale.set(k, 0.8 + Math.random() * 0.45, k); } }
  const d2 = (v.x - camera.position.x) ** 2 + (v.z - camera.position.z) ** 2;
  if (d2 > 180 * 180) return;
  if (d2 < 110 * 110 && !v.wrecked) updateSkids(v); else v.skid = null;
  v.smokeT -= dt;
  const hx = v.x + fx * (v.front - 0.8), hz = v.z + fz * (v.front - 0.8), hy = v.y + 1.0;
  if (v.wrecked) {
    v.burnT -= dt;
    if (v.burnT > 0 && v.smokeT <= 0) {
      v.smokeT = 0.05;
      FX.fire.emit(v.x + rand(-0.8, 0.8), v.y + 1, v.z + rand(-1, 1), rand(-0.5, 0.5), rand(2, 4), rand(-0.5, 0.5), rand(0.4, 0.8), rand(0.6, 1.2), COL.fire, 0.9, -1, 0.5, 0.6, 4);
      FX.smoke.emit(v.x, v.y + 1.6, v.z, rand(-0.5, 0.5), rand(2.5, 4), rand(-0.5, 0.5), rand(2.5, 4), rand(1, 1.8), COL.dark, 0.5, -0.2, 0.3, 1.2, 4);
    } else if (v.burnT <= 0 && v.smokeT <= 0) { v.smokeT = 0.3; FX.smoke.emit(v.x, v.y + 1.2, v.z, rand(-0.3, 0.3), rand(1.5, 2.5), rand(-0.3, 0.3), 3, 0.8, COL.smoke, 0.25, -0.2, 0.3, 0.8, 4); }
    return;
  }
  if (hp < 0.4 && v.smokeT <= 0) {
    v.smokeT = hp < 0.18 ? 0.04 : 0.12;
    FX.smoke.emit(hx, hy, hz, v.vx * 0.3 + rand(-0.4, 0.4), rand(1.5, 2.5), v.vz * 0.3 + rand(-0.4, 0.4), rand(1.2, 2), rand(0.5, 0.9), hp < 0.2 ? COL.dark : COL.smoke, 0.5, -0.5, 0.8, 1.0, 4);
    if (hp < 0.18) FX.fire.emit(hx, hy - 0.2, hz, v.vx * 0.5, rand(1, 2.5), v.vz * 0.5, rand(0.25, 0.5), rand(0.4, 0.7), COL.fire, 1, -1, 1, 0.4, 4);
  }
  if (v.lostCount && v.onGround && Math.abs(v.vf) > 3 && Math.random() < 0.7) for (let i = 0; i < 4; i++) if (v.wlost[i]) { const w = v.model.wheels[i], p = localToWorld(v, v.wlost[i] && i % 2 ? -v.halfW * 0.8 : v.halfW * 0.8, 0.05, w.front ? v.st.wb / 2 : -v.st.wb / 2); sparks(p.x, p.y, p.z, 2); if (v === G.player) G.scrape = 1; }
  // tyre smoke when drifting / burnouts
  const sp = Math.abs(v.vf);
  if (v.onGround && (v.slip > 4.5 || (v.input.throttle > 0.9 && sp < 6 && v.input.hand)) && Math.random() < 0.7) {
    for (const s of [1, -1]) { const rx = v.x - fx * v.st.wb / 2 + fz * s * 0.8, rz = v.z - fz * v.st.wb / 2 - fx * s * 0.8; FX.smoke.emit(rx, v.y + 0.3, rz, rand(-0.5, 0.5), rand(0.4, 1.2), rand(-0.5, 0.5), rand(1, 1.8), rand(0.5, 0.9), COL.smoke, 0.32, -0.3, 1, 1.4, 4); }
    if (v === G.player) G.skid = Math.max(G.skid || 0, clamp((v.slip - 3) / 8, 0, 1));
  }
  if (v.jetOn) for (const [a, s] of v.bike ? [[0.3, 0], [-0.3, 0]] : [[0.42, 1], [0.42, -1], [-0.42, 1], [-0.42, -1]]) {
    const f = a * (v.front - v.rear), ex = v.x + fx * f + fz * s * 0.7, ez = v.z + fz * f - fx * s * 0.7;
    if (Math.random() < 0.6) FX.smoke.emit(ex, v.y - 1.2, ez, rand(-0.8, 0.8), rand(-7, -4), rand(-0.8, 0.8), rand(0.25, 0.4), rand(0.4, 0.6), COL.jetGas, 0.45, 0, 3, 2.6, 4);
  }
  if (v.jetOn && Math.random() < 0.5) {   // close to the ground the blast kicks up a ring of dust
    const gy = heightAt(v.x, v.z), agl = v.y - gy;
    if (agl < 6) { const a = rand(0, TAU), sp = rand(5, 9) * (1 - agl / 7); FX.smoke.emit(v.x + Math.cos(a) * 1.5, gy + 0.2, v.z + Math.sin(a) * 1.5, Math.cos(a) * sp, rand(0.3, 1), Math.sin(a) * sp, rand(0.6, 1.1), rand(0.6, 1), COL.dust, 0.4, -0.2, 1.4, 1.6, 4); }
  }
  if (v.boosting) for (const s of [1, -1]) { const ex = v.x + fx * (v.rear - 0.1) + fz * s * 0.4, ez = v.z + fz * (v.rear - 0.1) - fx * s * 0.4; FX.fire.emit(ex, v.y + 0.42, ez, -fx * 8 + rand(-0.5, 0.5), rand(-0.2, 0.4), -fz * 8 + rand(-0.5, 0.5), rand(0.08, 0.18), rand(0.25, 0.45), COL.nitro, 1, 0, 3, -0.5, 0); }
}

// ---------------- traffic AI ----------------
const _bz = { x: 0, z: 0 };
function aiInit(v, eid, from) {
  v.ai = { edge: -1, a: 0, b: 0, phase: 'straight', t: 0, next: -1, cruise: rand(9, 13.5), stuckT: 0, revT: 0, honkT: 2, blockT: 0, mode: 'lane', losT: 0, los: false, target: null, angry: 0, dist: 999, tx: 0, tz: 0, remain: 99, distNode: 99 };
  aiSetEdge(v, eid, from);
}
function aiSetEdge(v, eid, from) {
  const ai = v.ai, e = W.edges[eid], A = W.nodes[from], to = e.a === from ? e.b : e.a, B = W.nodes[to];
  ai.edge = eid; ai.a = from; ai.b = to; ai.len = e.len; ai.axis = e.axis;
  ai.dx = (B.x - A.x) / e.len; ai.dz = (B.z - A.z) / e.len; ai.rx = -ai.dz; ai.rz = ai.dx;
  ai.sx = A.x + ai.rx * LO; ai.sz = A.z + ai.rz * LO;
  ai.next = aiChooseNext(v, to, eid);
  const k = W.hw + 1.5;
  ai.Ex = B.x - ai.dx * k + ai.rx * LO; ai.Ez = B.z - ai.dz * k + ai.rz * LO;
  if (ai.next < 0) { ai.d2x = -ai.dx; ai.d2z = -ai.dz; }
  else { const e2 = W.edges[ai.next], C2 = W.nodes[e2.a === to ? e2.b : e2.a]; ai.d2x = (C2.x - B.x) / e2.len; ai.d2z = (C2.z - B.z) / e2.len; }
  const r2x = -ai.d2z, r2z = ai.d2x;
  ai.Xx = B.x + ai.d2x * k + r2x * LO; ai.Xz = B.z + ai.d2z * k + r2z * LO;
  const dot = ai.dx * ai.d2x + ai.dz * ai.d2z;
  if (dot > 0.9) { ai.Cx = (ai.Ex + ai.Xx) / 2; ai.Cz = (ai.Ez + ai.Xz) / 2; ai.turn = 0; }
  else if (dot < -0.9) { ai.Cx = B.x + ai.dx * (k + 5); ai.Cz = B.z + ai.dz * (k + 5); ai.turn = 2; }
  else { ai.Cx = B.x + (ai.rx + r2x) * LO; ai.Cz = B.z + (ai.rz + r2z) * LO; ai.turn = 1; }
  ai.turnLen = Math.hypot(ai.Cx - ai.Ex, ai.Cz - ai.Ez) + Math.hypot(ai.Xx - ai.Cx, ai.Xz - ai.Cz);
  ai.phase = 'straight'; ai.t = 0;
}
function bez(ai, t, o) { const u = 1 - t; o.x = u * u * ai.Ex + 2 * u * t * ai.Cx + t * t * ai.Xx; o.z = u * u * ai.Ez + 2 * u * t * ai.Cz + t * t * ai.Xz; return o; }
function aiChooseNext(v, node, fromEdge) {
  const N = W.nodes[node], opts = N.edges.filter(e => e !== fromEdge);
  if (!opts.length) return -1;
  const other = eid => { const E = W.edges[eid]; return E.a === node ? E.b : E.a; };
  if (v.ai && v.ai.target != null) {
    const nh = W.next[node * W.nodes.length + v.ai.target];
    if (nh >= 0 && nh !== node) { const e = opts.find(eid => other(eid) === nh); if (e !== undefined) return e; }
  }
  const e0 = W.edges[fromEdge], straight = opts.find(eid => W.edges[eid].axis === e0.axis);
  if (straight !== undefined && Math.random() < 0.5) return straight;
  return pick(opts);
}
function aiLaneTarget(v, depth = 0) {
  const ai = v.ai, look = 4.5 + Math.max(0, v.vf) * 0.45;
  if (ai.phase === 'straight') {
    const s = (v.x - ai.sx) * ai.dx + (v.z - ai.sz) * ai.dz, sEnd = ai.len - (W.hw + 1.5);
    ai.remain = sEnd - s; ai.distNode = ai.len - s;
    if (ai.remain < 0.6) { ai.phase = 'turn'; ai.t = 0; }
    else {
      const st = s + look;
      if (st <= sEnd) { ai.tx = ai.sx + ai.dx * st; ai.tz = ai.sz + ai.dz * st; }
      else { bez(ai, Math.min(1, (st - sEnd) / ai.turnLen), _bz); ai.tx = _bz.x; ai.tz = _bz.z; }
      return;
    }
  }
  for (let it = 0; it < 25 && ai.t < 1; it++) {
    bez(ai, ai.t, _bz);
    const tx = 2 * (1 - ai.t) * (ai.Cx - ai.Ex) + 2 * ai.t * (ai.Xx - ai.Cx), tz = 2 * (1 - ai.t) * (ai.Cz - ai.Ez) + 2 * ai.t * (ai.Xz - ai.Cz);
    if ((v.x - _bz.x) * tx + (v.z - _bz.z) * tz > 0) ai.t += 0.04; else break;
  }
  ai.remain = 0; ai.distNode = 0;
  if (ai.t >= 1) {
    const node = ai.b;
    aiSetEdge(v, ai.next < 0 ? ai.edge : ai.next, node);
    if (depth < 2) aiLaneTarget(v, depth + 1);
    return;
  }
  const tt = ai.t + look / ai.turnLen;
  if (tt <= 1) { bez(ai, tt, _bz); ai.tx = _bz.x; ai.tz = _bz.z; }
  else { const ex = (tt - 1) * ai.turnLen; ai.tx = ai.Xx + ai.d2x * ex; ai.tz = ai.Xz + ai.d2z * ex; }
}
function aiObstacles(v, des, cautious) {
  const fx = Math.sin(v.h), fz = Math.cos(v.h);
  let minGap = 1e9, blocker = null;
  const range = 14 + Math.max(0, v.vf) * 1.4;
  for (const o of VEH.list) {
    if (o === v || (v.ai && v.ai.passT > 0 && o === v.ai.pass)) continue;
    const dx = o.x - v.x, dz = o.z - v.z; if (dx * dx + dz * dz > range * range) continue;
    const along = dx * fx + dz * fz; if (along <= 0) continue;
    const lat = -dx * fz + dz * fx; if (Math.abs(lat) > 2.4) continue;
    const gap = along - v.front - Math.max(o.front, -o.rear) * 0.85;
    if (gap < minGap) { minGap = gap; blocker = o; }
  }
  if (cautious) for (const p of PED.list) {
    if (!p.active || p.rag) continue;
    const dx = p.x - v.x, dz = p.z - v.z; if (dx * dx + dz * dz > 225) continue;
    const along = dx * fx + dz * fz; if (along <= 0) continue;
    if (Math.abs(-dx * fz + dz * fx) > 1.8) continue;
    const gap = along - v.front - 0.6; if (gap < minGap) { minGap = gap; blocker = null; }
  }
  if (minGap < 1e8) des = Math.min(des, Math.max(0, (minGap - 2.0) * 1.15));
  return { des, blocker, gap: minGap };
}
function aiDrive(v, des, tx, tz, dt) {
  const ai = v.ai, inp = v.input;
  const diff = wrapA(Math.atan2(tx - v.x, tz - v.z) - v.h);
  if (ai.revT > 0) {
    ai.revT -= dt; inp.throttle = 0; inp.brake = 1; inp.park = 0; inp.steer = -Math.sign(diff || 1); inp.hand = 0; return;
  }
  const err = des - v.vf;
  inp.park = 0;
  if (err > 0) { inp.throttle = clamp(err * 0.5, 0, 1); inp.brake = 0; } else { inp.throttle = 0; inp.brake = v.vf > 0.3 ? clamp(-err * 0.35, 0, 1) : 0; }
  if (des < 0.3 && v.vf < 0.6) { inp.brake = 0; inp.throttle = 0; inp.park = 1; }
  inp.steer = clamp(diff * 2.4, -1, 1); inp.hand = 0;
  if (des > 3 && Math.abs(v.vf) < 0.7) { ai.stuckT += dt; if (ai.stuckT > 2.2) { ai.stuckT = 0; ai.revT = 1.3; } } else ai.stuckT = Math.max(0, ai.stuckT - dt);
}
function aiTraffic(v, dt) {
  const ai = v.ai;
  if (v.wrecked || v.flipped || v.tumble || v.sunk) { v.input.throttle = 0; v.input.brake = 0; v.input.park = 1; v.input.steer = 0; v.input.hand = 0; return; }
  if (ai.mode !== 'lane') { aiSnapToRoad(v); ai.mode = 'lane'; }
  aiLaneTarget(v);
  let des = ai.cruise * (ai.angry > 0 ? 1.5 : 1);
  ai.angry = Math.max(0, ai.angry - dt);
  if (ai.phase === 'straight') {
    if (ai.turn !== 0) des = Math.min(des, Math.sqrt(49 + 2 * 4.5 * Math.max(0, ai.remain)));
    const B = W.nodes[ai.b];
    if (B.lit) {
      const ls = lightState(B, ai.axis), stopRemain = ai.distNode - (W.hw + 4.3 + v.front);
      if ((ls === 'R' || (ls === 'Y' && stopRemain > 6)) && stopRemain > -1.2) des = Math.min(des, Math.max(0, stopRemain * 0.85));
    }
  } else if (ai.turn !== 0) des = Math.min(des, 7);
  const ob = aiObstacles(v, des, true); des = ob.des;
  const bk = ob.blocker;
  if (bk && ob.gap < 10 && des < 1 && ai.phase === 'straight' && (bk.wrecked || bk.flipped || bk.tumble || (!bk.ai && bk.speed < 0.5))) {
    ai.blockedT = (ai.blockedT || 0) + dt;
    if (ai.blockedT > (bk === G.player ? 4.5 : 2.2)) { ai.pass = bk; ai.passT = 3.5; ai.blockedT = 0; }
  } else ai.blockedT = 0;
  if (ai.passT > 0) { ai.passT -= dt; const k = Math.min(1, ai.passT, (3.5 - ai.passT) * 2); ai.tx += Math.cos(v.h) * LO * 2 * k; ai.tz -= Math.sin(v.h) * LO * 2 * k; }
  if (ob.blocker === G.player && ob.gap < 7 && des < 1.5) {
    ai.blockT += dt; ai.honkT -= dt;
    if (ai.blockT > 1.5 && ai.honkT <= 0) { ai.honkT = rand(2.5, 5); SFX.beep(v.x, v.z); }
  } else ai.blockT = 0;
  aiDrive(v, des, ai.tx, ai.tz, dt);
}
function nearestNode(x, z) {
  let best = -1, bd = 1e18;
  for (const n of W.nodes) { if (!n.deg) continue; const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = n.id; } }
  return best;
}
function nearestLane(x, z, h) {
  let best = null, bd = 1e18;
  for (const e of W.edges) {
    const A = W.nodes[e.a], B = W.nodes[e.b];
    const dx = B.x - A.x, dz = B.z - A.z, t = clamp(((x - A.x) * dx + (z - A.z) * dz) / (e.len * e.len), 0, 1);
    const px = A.x + dx * t, pz = A.z + dz * t, d = (px - x) ** 2 + (pz - z) ** 2;
    if (d < bd) { bd = d; best = { e, t, px, pz }; }
  }
  return best;
}
function aiSnapToRoad(v) {
  const nl = nearestLane(v.x, v.z); if (!nl) return;
  const e = nl.e, A = W.nodes[e.a], B = W.nodes[e.b];
  const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
  let from = (Math.sin(v.h) * dx + Math.cos(v.h) * dz) >= 0 ? e.a : e.b;
  if (v.ai.target != null) {
    const n = W.nodes.length, toA = W.dist[e.a * n + v.ai.target], toB = W.dist[e.b * n + v.ai.target];
    from = toB < toA ? e.a : e.b;
  }
  aiSetEdge(v, e.id, from);
}
const POL_SEEN = { any: false };
function aiPolice(v, dt) {
  const ai = v.ai, P = PF();
  if (v.wrecked || v.flipped || v.tumble || v.sunk) { v.input.throttle = 0; v.input.brake = 0; v.input.park = 1; v.input.steer = 0; v.input.hand = 0; return; }
  if (!wanted.stars || !P || G.down) { ai.target = null; ai.chasing = false; ai.deployed = false; return aiTraffic(v, dt); }
  ai.chasing = true;
  const dx = P.x - v.x, dz = P.z - v.z, dist = Math.hypot(dx, dz);
  ai.losT -= dt;
  if (ai.losT <= 0) { ai.losT = 0.3 + Math.random() * 0.1; ai.los = dist < 95 && !segmentBlocked(v.x, v.z, P.x, P.z); }
  ai.dist = dist;
  if (ai.los && dist < 85) POL_SEEN.any = true;
  const aggr = POLICE[settings.police].aggr, foot = G.onFoot;
  if ((ai.los && dist < 60) || dist < 16) {
    ai.mode = 'direct';
    const lead = foot ? 0 : clamp(dist / 32, 0, 1.2), tx = P.x + P.vx * lead, tz = P.z + P.vz * lead;
    const diff = wrapA(Math.atan2(tx - v.x, tz - v.z) - v.h);
    let des = dist > 14 ? v.st.top * 0.92 * aggr : Math.max(7, P.speed + 6 * aggr);
    if (foot) des = dist > 26 ? v.st.top * 0.75 * aggr : Math.max(0, (dist - 11) * 0.9);
    if (Math.abs(diff) > 1.1 && dist > 9) des = Math.min(des, 13);
    const ob = aiObstacles(v, des, false); if (ob.blocker && ob.blocker !== G.player && !ob.blocker.police) des = ob.des < 3 ? Math.max(ob.des, 5) : des;
    aiDrive(v, des, tx, tz, dt);
    if (foot) { ai.stuckT = 0; if (des < 0.5) { v.input.throttle = 0; v.input.brake = 1; } }
    else if (Math.abs(diff) > 2.1 && dist < 22 && v.vf < 7 && ai.revT <= 0) { v.input.throttle = 0; v.input.brake = 1; v.input.steer = -Math.sign(diff); }
    v.input.hand = !foot && Math.abs(diff) > 0.9 && v.vf > 14 ? 1 : 0;
    if (gunsOn() && wanted.stars >= 3 && ai.los && dist < 28 && dist > 4) {
      ai.shootT = (ai.shootT == null ? rand(0.4, 1) : ai.shootT) - dt;
      if (ai.shootT <= 0) { ai.shootT = rand(0.8, 1.6); const c = Math.cos(v.h), s = Math.sin(v.h), side = (dx * -c + dz * s) > 0 ? -1 : 1; copShoot(v.x + c * side * (v.halfW - 0.1), v.y + v.height * 0.8, v.z - s * side * (v.halfW - 0.1), false); }
    }
    if ((foot || (wanted.stars >= 2 && P.speed < 1.5 && dist < 22)) && dist < 30 && v.speed < 2.5 && !ai.deployed && PED.list.filter(p => p.active && p.cop).length < 7) {
      ai.deployed = true;
      for (const sd of [1, -1]) { const dp = doorPoint(v, sd); if (!pointBlocked(dp.x, dp.z)) spawnPedAt(dp.x, dp.z, 'cop'); }
    }
  } else {
    ai.target = nearestNode(P.x, P.z);
    if (ai.mode !== 'lane') { aiSnapToRoad(v); ai.mode = 'lane'; }
    aiLaneTarget(v);
    let des = 30 * aggr;
    if (ai.phase === 'straight' && ai.turn !== 0) des = Math.min(des, Math.sqrt(100 + 2 * 9 * Math.max(0, ai.remain)));
    else if (ai.phase === 'turn' && ai.turn !== 0) des = 10;
    const ob = aiObstacles(v, des, false); des = Math.max(ob.des, Math.min(des, 4));
    aiDrive(v, des, ai.tx, ai.tz, dt);
  }
}
function segBox(x0, z0, x1, z1, b) {
  let tmin = 0, tmax = 1; const dx = x1 - x0, dz = z1 - z0;
  if (Math.abs(dx) < 1e-9) { if (x0 < b.x0 || x0 > b.x1) return -1; }
  else { let t1 = (b.x0 - x0) / dx, t2 = (b.x1 - x0) / dx; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  if (Math.abs(dz) < 1e-9) { if (z0 < b.z0 || z0 > b.z1) return -1; }
  else { let t1 = (b.z0 - z0) / dz, t2 = (b.z1 - z0) / dz; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
  return tmin;
}
function segmentBlocked(x0, z0, x1, z1) {
  const mnx = Math.min(x0, x1), mxx = Math.max(x0, x1), mnz = Math.min(z0, z1), mxz = Math.max(z0, z1);
  for (const b of W.tallBoxes) { if (b.h < 4 || b.x1 < mnx || b.x0 > mxx || b.z1 < mnz || b.z0 > mxz) continue; if (segBox(x0, z0, x1, z1, b) >= 0) return true; }
  return false;
}

// ---------------- wanted level ----------------
const wanted = { heat: 0, stars: 0, unseen: 0, seen: false, bust: 0 };
function addHeat(amount, minStars, always) {
  if (settings.police === 'off' || G.down) return;
  if (!always && wanted.stars === 0 && !copNearby(45)) return;
  const before = wanted.stars;
  wanted.heat = Math.min(5.99, Math.max(wanted.heat + amount, minStars || 0));
  wanted.stars = Math.floor(wanted.heat); wanted.unseen = 0;
  if (wanted.stars > before) { feed(wanted.stars === 1 ? 'The police want a word' : `Wanted level ${wanted.stars}`, 'red'); SFX.sting(); }
  G.stats.maxStars = Math.max(G.stats.maxStars, wanted.stars);
}
function copNearby(r) {
  const P = PF(); if (!P) return false;
  for (const v of VEH.list) if (isCop(v) && Math.hypot(v.x - P.x, v.z - P.z) < r) return true;
  for (const p of PED.list) if (p.active && p.cop && !p.rag && Math.hypot(p.x - P.x, p.z - P.z) < r) return true;
  return false;
}
function playerCarCrime(other, dv) {
  if (other.kind === 'parked' && dv < 4) return;
  other.lastPlayerHit = GT;
  if (other.lastCrime && GT - other.lastCrime < 1.2) return;
  other.lastCrime = GT;
  if (other.police) { if (dv > 2.5) addHeat(wanted.stars ? 0.15 : 0.6, 1, true); }
  else if (dv > 4) addHeat(0.12, 0, false);
}
function updateWanted(dt) {
  const P = PF(); if (!P) return;
  if (settings.police === 'off') { wanted.heat = 0; wanted.stars = 0; }
  const seen = POL_SEEN.any || (HELI.active && Math.hypot(HELI.x - P.x, HELI.z - P.z) < 75) || PED.list.some(p => p.active && p.cop && !p.rag && Math.hypot(p.x - P.x, p.z - P.z) < 35);
  wanted.seen = seen;
  if (wanted.stars > 0) {
    if (seen) { wanted.unseen = 0; wanted.heat = Math.min(5.99, wanted.heat + dt * 0.006); }
    else {
      wanted.unseen += dt;
      if (wanted.unseen > 9 + wanted.stars * 2.5) { wanted.heat = wanted.stars - 1; wanted.stars = Math.floor(wanted.heat); wanted.unseen = 0; feed(wanted.stars ? `Wanted level ${wanted.stars}` : 'You lost the police', wanted.stars ? 'blue' : 'green'); }
    }
    // busted check
    let near = false;
    if (G.onFoot) { if (HERO.p && !HERO.p.rag) for (const p of PED.list) if (p.active && p.cop && !p.rag && Math.hypot(p.x - P.x, p.z - P.z) < 1.9 && Math.abs(p.y - HERO.p.y) < 2) { near = true; break; } }
    else for (const v of VEH.list) if (isCop(v) && Math.hypot(v.x - P.x, v.z - P.z) < 7.5 && v.speed < 6) { near = true; break; }
    if (near && P.speed < (G.onFoot ? 3.5 : 2.2)) wanted.bust += dt; else wanted.bust = Math.max(0, wanted.bust - dt * 2);
    if (wanted.bust > 3.2) playerDown('busted');
  } else wanted.bust = 0;
  POL_SEEN.any = false;
}

// ---------------- spawning ----------------
function randomLanePoint(cx, cz, minR, maxR, avoidView) {
  camera.getWorldDirection(_v4);
  for (let tries = 0; tries < 40; tries++) {
    const e = pick(W.edges), from = Math.random() < 0.5 ? e.a : e.b, A = W.nodes[from], B = W.nodes[from === e.a ? e.b : e.a];
    const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len, s = rand(W.hw + 6, e.len - W.hw - 12);
    const x = A.x + dx * s - dz * LO, z = A.z + dz * s + dx * LO;
    const d = Math.hypot(x - cx, z - cz); if (d < minR || d > maxR) continue;
    if (avoidView) { const cdx = x - camera.position.x, cdz = z - camera.position.z, cl = Math.hypot(cdx, cdz); if ((cdx * _v4.x + cdz * _v4.z) / cl > 0.3 && cl < 160) continue; }
    let ok = true; for (const o of VEH.list) if ((o.x - x) ** 2 + (o.z - z) ** 2 < 144) { ok = false; break; }
    if (!ok) continue;
    return { edge: e.id, from, x, z, h: Math.atan2(dx, dz) };
  }
  return null;
}
function spawnAI(kind, minR, maxR, avoidView) {
  const P = PF(); const pt = randomLanePoint(P.x, P.z, minR, maxR, avoidView); if (!pt) return null;
  const v = new Vehicle(kind === 'police' ? POLICE_CFG : randomTrafficCfg(), kind);
  v.place(pt.x, pt.z, pt.h, kind === 'police' && wanted.stars ? 14 : 8);
  aiInit(v, pt.edge, pt.from);
  if (kind === 'police') v.ai.cruise = 12;
  VEH.list.push(v); return v;
}
function manageTraffic(dt, initial) {
  G.trafficT -= dt; if (G.trafficT > 0 && !initial) return; G.trafficT = 0.2;
  const P = PF(); if (!P) return;
  const draw = QUALITY[settings.quality].draw;
  const target = W.noTraffic ? 0 : Math.round(settings.trafficDensity / 100 * 34);   // the Testing Zone is a closed course
  let traffic = 0, police = 0;
  for (let i = VEH.list.length - 1; i >= 0; i--) {
    const v = VEH.list[i]; if (v === G.player || v.remote) continue;
    const d = Math.hypot(v.x - P.x, v.z - P.z);
    const vis = d < draw; v.obj.visible = vis;
    if (v.kind === 'parked' && (!v.abandoned || v.mission || v.locked || d < 240)) continue;
    const lim = isCop(v) && wanted.stars ? 260 : (v.wrecked || v.flipped) ? 160 : 230;
    if (d > lim) { v.remove(); continue; }
    if (isCop(v)) police++; else if (v.kind === 'traffic' && !v.wrecked && !v.flipped) traffic++;
  }
  if (initial) { for (let k = 0; k < target; k++) spawnAI('traffic', 20, 190, false); }
  else if (traffic < target) spawnAI('traffic', 90, 200, true);
  else if (traffic > target + 2) { const far = VEH.list.filter(v => v.kind === 'traffic' && Math.hypot(v.x - P.x, v.z - P.z) > 110); if (far.length) far[0].remove(); }
  // police
  const pol = POLICE[settings.police];
  let want = settings.police === 'off' ? 0 : (wanted.stars ? Math.round([0, 2, 3, 4, 6, 8][wanted.stars] * pol.mult) : (settings.trafficDensity > 0 && !W.noTraffic ? 2 : 0));
  if (wanted.stars) want = Math.max(1, want);
  if (police < want) { if (initial) spawnAI('police', 60, 200, false); else spawnAI('police', wanted.stars ? 70 : 100, wanted.stars ? 150 : 200, true); }
  else if (police > want + 1) { const far = VEH.list.filter(v => isCop(v) && Math.hypot(v.x - P.x, v.z - P.z) > 120); if (far.length) far[0].remove(); }
}

// ---------------- police helicopter ----------------
const HELI = { active: false, obj: null, x: 0, y: 60, z: 0, vx: 0, vz: 0, rotor: null, tail: null, beam: null, spot: null, t: 0 };
function initHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 4), getPaint('#1b2a4a', 'gloss')); body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), MAT.glass[1]); nose.scale.set(1, 0.9, 1.1); nose.position.set(0, -0.1, 1.9); g.add(nose);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.3, 4.02), getPaint('#f2f2f2', 'gloss')); stripe.position.y = -0.2; g.add(stripe);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 4.4), getPaint('#1b2a4a', 'gloss')); boom.position.set(0, 0.25, -4); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.7), getPaint('#1b2a4a', 'gloss')); fin.position.set(0, 0.8, -6); g.add(fin);
  for (const s of [1, -1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4), MAT.trim); sk.position.set(s * 0.9, -1.2, 0); g.add(sk); }
  const rotor = new THREE.Group(); for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 10), MAT.trim); b.rotation.y = k * Math.PI / 2; rotor.add(b); }
  rotor.position.y = 1.05; g.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.2), MAT.trim); tail.position.set(0.25, 0.8, -6); g.add(tail);
  const beamGeo = new THREE.ConeGeometry(1, 1, 24, 1, true); beamGeo.translate(0, -0.5, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: C('#fff4d6'), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide }));
  const spotGeo = new THREE.PlaneGeometry(1, 1); spotGeo.rotateX(-Math.PI / 2);
  const spot = new THREE.Mesh(spotGeo, new THREE.MeshBasicMaterial({ color: C('#fff1c8'), map: TEX.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  Object.assign(HELI, { obj: g, rotor, tail, beam, spot });
}
// the helicopter can be shot down: bullets, rockets, bombs and explosions all count
function heliDamage(amt, byPlayer) {
  if (!HELI.active || HELI.down || amt <= 0) return;
  HELI.hp -= amt; if (byPlayer) HELI.byPlayer = true;
  if (HELI.hp <= 0) {
    HELI.down = true; HELI.vy = 0; HELI.spin = rand(2.5, 4) * (Math.random() < 0.5 ? -1 : 1);
    HELI.beam.visible = HELI.spot.visible = false;
    if (HELI.byPlayer) { HELI.killedAt = GT; G.stats.cops++; addHeat(1, 3, true); addCash(500, 'police helicopter down'); } else feed('The police helicopter is going down');
    SFX.boom(0.7, true, Math.hypot(HELI.x - camera.position.x, HELI.z - camera.position.z));
  }
}
function heliDownUpdate(dt) {
  HELI.vy -= 9 * dt; HELI.y += HELI.vy * dt; HELI.x += HELI.vx * dt; HELI.z += HELI.vz * dt; HELI.vx *= Math.exp(-0.4 * dt); HELI.vz *= Math.exp(-0.4 * dt);
  const o = HELI.obj; o.position.set(HELI.x, HELI.y, HELI.z); o.rotation.y += HELI.spin * dt; o.rotation.z = Math.min(0.6, o.rotation.z + dt * 0.25);
  HELI.rotor.rotation.y += dt * 12; HELI.tail.rotation.x += dt * 6;
  FX.smoke.emit(HELI.x, HELI.y + 0.5, HELI.z, rand(-1, 1), rand(1, 3), rand(-1, 1), rand(2, 3.5), rand(1.2, 2), COL.dark, 0.6, -0.2, 0.4, 1.3, 4);
  FX.fire.emit(HELI.x, HELI.y, HELI.z, rand(-1, 1), rand(0.5, 2), rand(-1, 1), rand(0.3, 0.6), rand(0.6, 1.1), COL.fire, 1, -1, 0.8, 0.5, 4);
  let gnd = heightAt(HELI.x, HELI.z); W.boxGrid.query(HELI.x - 1, HELI.z - 1, HELI.x + 1, HELI.z + 1, _bx); for (const b of _bx) if (HELI.x > b.x0 && HELI.x < b.x1 && HELI.z > b.z0 && HELI.z < b.z1) gnd = Math.max(gnd, b.h);
  if (HELI.y - 1 <= gnd) {
    HELI.down = false; HELI.active = false; scene.remove(HELI.obj, HELI.beam, HELI.spot); HELI.cool = GT + 45;
    explode(HELI.x, gnd + 1, HELI.z, 2.2, HELI.byPlayer ? 'hero' : null, null, false);
  }
}
function updateHeli(dt) {
  const P = PF(), want = wanted.stars >= 3 && settings.police !== 'off' && P && !G.down;
  if (HELI.active && HELI.down) { heliDownUpdate(dt); return; }
  if (want && !HELI.active && GT > (HELI.cool || 0)) { HELI.active = true; HELI.hp = 500; HELI.down = false; HELI.byPlayer = false; HELI.obj.rotation.z = 0; HELI.x = P.x - 140; HELI.z = P.z - 140; HELI.y = 60; scene.add(HELI.obj, HELI.beam, HELI.spot); feed('Police helicopter inbound', 'red'); }
  if (!HELI.active) return;
  HELI.t += dt;
  if (HELI.hp < 250 && Math.random() < dt * 20) FX.smoke.emit(HELI.x, HELI.y + 0.6, HELI.z, rand(-0.5, 0.5), rand(1, 2), rand(-0.5, 0.5), rand(1.5, 2.5), rand(0.8, 1.4), HELI.hp < 120 ? COL.dark : COL.smoke, 0.5, -0.2, 0.4, 1.1, 4);
  let tx, ty, tz;
  if (want) { tx = P.x + Math.sin(HELI.t * 0.35) * 22 + P.vx * 1.2; tz = P.z + Math.cos(HELI.t * 0.35) * 22 + P.vz * 1.2; ty = 42; }
  else { tx = HELI.x + 200; tz = HELI.z + 200; ty = 90; }
  const dx = tx - HELI.x, dz = tz - HELI.z, d = Math.hypot(dx, dz), maxV = 36;
  const dvx = d > 0.1 ? dx / d * Math.min(maxV, d * 0.8) : 0, dvz = d > 0.1 ? dz / d * Math.min(maxV, d * 0.8) : 0;
  HELI.vx = lerp(HELI.vx, dvx, damp(1.2, dt)); HELI.vz = lerp(HELI.vz, dvz, damp(1.2, dt));
  HELI.x += HELI.vx * dt; HELI.z += HELI.vz * dt; HELI.y = lerp(HELI.y, ty, damp(0.6, dt));
  const o = HELI.obj; o.position.set(HELI.x, HELI.y, HELI.z);
  o.rotation.order = 'YXZ'; o.rotation.y = Math.atan2(HELI.vx, HELI.vz) || o.rotation.y; o.rotation.x = clamp(Math.hypot(HELI.vx, HELI.vz) * 0.006, 0, 0.25);
  HELI.rotor.rotation.y += dt * 28; HELI.tail.rotation.x += dt * 40;
  if (want && wanted.stars >= 4 && gunsOn()) { HELI.shootT = (HELI.shootT || 1.5) - dt; if (HELI.shootT <= 0) { HELI.shootT = rand(1.1, 2.1); copShoot(HELI.x, HELI.y - 1.6, HELI.z, false); } }
  if (want) {
    const gx = P.x, gz = P.z, gy = heightAt(gx, gz);
    const bx = gx - HELI.x, by = gy - HELI.y, bz = gz - HELI.z, bl = Math.hypot(bx, by, bz);
    HELI.beam.position.set(HELI.x, HELI.y - 1, HELI.z); HELI.beam.scale.set(3, bl, 3); HELI.beam.material.opacity = TIMES[settings.time].glow > 0.5 ? 0.06 : 0.025;
    _v1.set(-bx, -by, -bz).normalize(); HELI.beam.quaternion.setFromUnitVectors(UP, _v1);
    HELI.spot.position.set(gx, gy + 0.08, gz); HELI.spot.scale.set(9, 1, 9); HELI.spot.material.opacity = TIMES[settings.time].glow > 0.3 ? 0.55 : 0.15;
    HELI.beam.visible = HELI.spot.visible = true;
  } else { HELI.beam.visible = HELI.spot.visible = false; if (Math.hypot(HELI.x - P.x, HELI.z - P.z) > 300) { HELI.active = false; scene.remove(HELI.obj, HELI.beam, HELI.spot); } }
}
