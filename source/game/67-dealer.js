// =====================================================================
//  CAR DEALERSHIP (buy cars, sell stolen ones), GAS STATION SHOP
//  (carrots for exhaust pipes, energy drinks, scratchcards) and
//  PEDESTRIANS WHO STEAL PARKED CARS
// =====================================================================
const DEALER_SITES = { base: [-485, 55, 'z0'], nyc: [-182.5, -130, 'x1'], neon: [-108, -36, 'x1'], sand: [180, 45, 'x0'], perth: [195, -60, 'z1'] };
const CAR_VALUE = { tank: 9000, outlaw: 1300, mudslinger: 900, zippy: 400, flipking: 0, viper: 1400, brute: 1600, ranger: 1300, comet: 2800, bubble: 800, bike: 1000, phantom: 0 };
const DEALER_STOCK = [['zippy', 1200, '#ff9ae3'], ['mudslinger', 2200, '#f5b700'], ['bike', 2500, '#d22f3c'], ['outlaw', 3800, '#121316'], ['bubble', 2000, '#0fb5c9'], ['viper', 4500, '#1f4fd1'], ['ranger', 5500, '#1e8a4c'], ['brute', 6000, '#121316'], ['comet', 9000, '#f5b700']];
STORE_LOOK.dealer = { name: 'Lucky Wheels Autos', sign: 'AUTO SALES · WE BUY CARS', fg: '#ffd24a', bg: '#1d2f4d', wall: '#eef0f2', fascia: '#c8352b', floor: '#d9dde2', icon: 'A', col: '#47d18c' };
const CARROT_MAX = 5;

// ---------- world generation ----------
function markDealerBlock(W, id) {
  const s = DEALER_SITES[id]; if (!s) return;
  const b = W.blocks.find(q => s[0] > q.x0 && s[0] < q.x1 && s[1] > q.z0 && s[1] < q.z1);
  if (b && b.type !== 'gas' && !['shops', 'bank', 'mech'].includes(b.type)) { b.type = 'dealer'; b.face = s[2]; }
}
function dealerBlock(W, b, rng) {
  b.top = 'lot';
  const F = gsFrame(b, b.face || 'z0'), h = b.h, Wd = F.W, Dp = F.D;
  const D = (u0, v0, u1, v1, y0, y1, col) => W.details.push(gsBox(F, u0, v0, u1, v1, h + y0, h + y1, col));
  W.forSale = W.forSale || [];
  D(-Wd / 2 + 2, 3.2, Wd / 2 - 2, Dp - 3, 0, 0.018, '#8f9399');
  const sw = 16, su = -Wd / 2 + sw / 2 + 3;
  const K = storeShell(W, F, h, { kind: 'dealer', u: su, v: 7, w: sw, d: 13, ht: 5.2, doorW: 2.4 });
  const { rec, S, SB, P } = K, hs = sw / 2 - 0.3;
  S(hs - 4.6, 8.4, hs - 0.8, 9.2, 0, 0.95, '#2a2d33'); S(hs - 4.65, 8.35, hs - 0.75, 9.25, 0.95, 1.02, '#e8e1d6'); SB(hs - 4.65, 8.35, hs - 0.75, 9.25, 1.02);
  S(hs - 3.4, 8.6, hs - 2.6, 9.0, 1.02, 1.4, '#22252b');
  S(-hs + 0.3, 10.6, -hs + 1.1, 11.4, 0, 0.7, '#6b4a33'); S(-hs + 0.4, 10.7, -hs + 1.0, 11.3, 0.7, 1.8, '#3f8f4e');
  for (let k = 0; k < 3; k++) S(-hs + 0.05, 2 + k * 3, -hs + 0.1, 4 + k * 3, 1.2, 2.6, ['#c8352b', '#1f4fd1', '#f5b700'][k]);
  [rec.kx, rec.kz] = P(hs - 2.7, 10.4); [rec.mx, rec.mz] = P(hs - 2.7, 7.4);
  { const [x, z] = P(-2.5, 5.4); W.forSale.push({ x, z, h: gsYaw(F, 1, -0.6), i: 5 }); }   // the star of the showroom
  { const [x, z] = gsPt(F, su, 4.6); rec.pickup = { x, z, h: gsYaw(F, 1, 0) }; }
  // the lot: cars for sale nose-out under strings of pennants
  const lu0 = su + sw / 2 + 3, lu1 = Wd / 2 - 3;
  let k = 0; for (let u = lu0 + 2.6; u <= lu1 - 2.4 && k < 4; u += 5.2, k++) { const [x, z] = gsPt(F, u, 11.5); W.forSale.push({ x, z, h: gsYaw(F, 0, -1), i: k }); D(u - 0.7, 14.4, u + 0.7, 14.5, 0.9, 1.7, '#f4f4f2'); D(u - 0.05, 14.45, u + 0.05, 14.55, 0, 0.9, '#8a8f96'); D(u - 0.5, 14.38, u + 0.5, 14.4, 1.15, 1.45, '#c8352b'); }
  const PEN = ['#c8352b', '#f5b700', '#1f4fd1', '#1e8a4c', '#f4f4f2'];
  for (const vv of [8.6, 15.2]) { D(lu0 - 0.1, vv - 0.1, lu0 + 0.1, vv + 0.1, 0, 4.4, '#c9ccd2'); D(lu1 - 0.1, vv - 0.1, lu1 + 0.1, vv + 0.1, 0, 4.4, '#c9ccd2'); D(lu0, vv - 0.02, lu1, vv + 0.02, 4.15, 4.18, '#3a3d42'); for (let u = lu0 + 0.6, j = 0; u < lu1 - 0.4; u += 1.1, j++) D(u - 0.22, vv - 0.03, u + 0.22, vv + 0.03, 3.7, 4.15, PEN[j % PEN.length]); }
  // WE BUY CARS bay
  const bu0 = lu0 + 0.5, bu1 = Math.min(lu1 - 0.5, lu0 + 12), bv0 = 19, bv1 = Math.min(Dp - 6, 28);
  for (const [a0, b0, a1, b1] of [[bu0, bv0, bu1, bv0 + 0.25], [bu0, bv1 - 0.25, bu1, bv1], [bu0, bv0, bu0 + 0.25, bv1], [bu1 - 0.25, bv0, bu1, bv1]]) D(a0, b0, a1, b1, 0.018, 0.04, '#f5b700');
  for (let u = bu0 + 1; u < bu1 - 0.5; u += 1.6) D(u, bv1 - 1.2, u + 0.7, bv1 - 0.4, 0.018, 0.04, '#f5b700');
  const su2 = (bu0 + bu1) / 2;
  D(su2 - 3.1, bv1 + 0.4, su2 - 2.9, bv1 + 0.6, 0, 3.3, '#8a8f96'); D(su2 + 2.9, bv1 + 0.4, su2 + 3.1, bv1 + 0.6, 0, 3.3, '#8a8f96');
  { const [x, z] = gsPt(F, su2, bv1 + 0.38); rec.signs.push({ x, z, y: h + 3.0, yaw: gsYaw(F, 0, -1), w: 6, h: 1.2, text: 'WE BUY CARS', fg: '#0c0e13', bg: '#f5b700' }); }
  rec.sellR = gsRect(F, bu0, bv0, bu1, bv1); [rec.sx, rec.sz] = gsPt(F, su2, (bv0 + bv1) / 2);
  W.stations.push(rec);
  for (let u = -Wd / 2 + 4; u < Wd / 2 - 3; u += 7) { const [x, z] = gsPt(F, u, Dp - 3.5); addTree(W, W.id === 'neon' || W.id === 'nyc' ? 'oak' : 'palm', x, z, 0.8); }
}
function spawnForSale() {
  const looks = [['comet', '#f5b700'], ['brute', '#c8352b'], ['viper', '#1f4fd1'], ['bike', '#121316'], ['ranger', '#1e8a4c'], ['comet', '#e85a9b']];
  for (const s of W.forSale || []) {
    const [body, paint] = looks[s.i % looks.length];
    const v = new Vehicle(Object.assign({}, CAR_DEF, { body, paint, finish: 'metallic', plate: 'FOR SALE', nitro: false, neon: 'off', spoiler: body === 'comet' ? 'wing' : 'none' }), 'parked');
    v.place(s.x, s.z, s.h, 0); v.forSale = true; VEH.list.push(v);
  }
}
// ---------- dealer: buying and selling ----------
function dealerMenu(st) {
  return DEALER_STOCK.map(([body, price, paint]) => ({ label: BODIES[body].name, sub: 'Parked out front for you', price, can: () => true, buy: () => dealerBuy(st, body, paint) }));
}
function dealerBuy(st, body, paint) {
  const p = st.pickup;
  for (const v of [...VEH.list]) if (v !== G.player && !v.mission && !v.remote && !v.forSale && Math.hypot(v.x - p.x, v.z - p.z) < 4.5) v.remove();
  const v = new Vehicle(Object.assign({}, CAR_DEF, { body, paint, finish: 'metallic', plate: 'NEW CAR' }), 'parked');
  v.place(p.x, p.z, p.h, 0); v.bought = true; VEH.list.push(v);
  SFX.ding(); feed(`Your new ${BODIES[body].name} is parked out front`, 'green');
}
function carValue(v) {
  const base = (CAR_VALUE[v.cfg.body] != null ? CAR_VALUE[v.cfg.body] : 1000) * (v.police ? 1.4 : 1);
  const cond = 0.25 + 0.75 * clamp(v.health / v.maxHp, 0, 1);
  return Math.max(50, Math.round(base * cond * (v.lostCount ? 0.7 : 1) / 10) * 10);
}
function updateDealer(dt) {
  const v = G.player;
  for (const st of SHOP.list) {
    if (st.kind !== 'dealer' || !st.sellR || st.wrecked) continue;
    const R = st.sellR;
    if (!v || G.plane || G.down || !(v.x > R.x0 && v.x < R.x1 && v.z > R.z0 && v.z < R.z1)) continue;
    SHOP.carPrompt = true;
    if (v.own) SHOP.prompt = 'That is your own car. The dealer only buys stolen ones';
    else if (v.bought) SHOP.prompt = 'The dealer will not buy back a car they sold you';
    else if (v.mission) SHOP.prompt = 'You need that car for the job';
    else if (wanted.stars > 0) SHOP.prompt = 'No deal while the police are after you. Lose them first';
    else if (v.wrecked || v.sunk) SHOP.prompt = 'That wreck is worthless';
    else {
      const price = carValue(v);
      if (v.speed > 2.2) SHOP.prompt = `Stop in the bay to sell the ${BODIES[v.cfg.body].name} for $${price.toLocaleString()}`;
      else { const name = BODIES[v.cfg.body].name; exitVehicle(); v.remove(); addCash(price, `for the stolen ${name}`); SFX.ding(); G.stats.sold = (G.stats.sold || 0) + 1; SHOP.prompt = ''; }
    }
  }
}
// ---------- gas station shop ----------
function gasMenu() {
  return [
    { label: 'Carrot', sub: 'Shove it up a car exhaust. Boom after a short drive', price: 25, can: () => (HERO.carrots || 0) < CARROT_MAX, buy: () => { HERO.carrots = (HERO.carrots || 0) + 1; feed(`Carrots: ${HERO.carrots}. Stand behind a car and ${APP.touch ? 'tap CAR' : 'press G'}`, 'green'); } },
    { label: 'First-aid kit', sub: 'Carry up to 3 · X to heal on the run', price: 40, can: () => (HERO.meds || 0) < MED.max, buy: () => { HERO.meds = (HERO.meds || 0) + 1; SFX.ding(); } },
    { label: 'Energy drink', sub: '+40 health', price: 15, can: () => HERO.hp < HERO.maxHp, buy: () => { HERO.hp = Math.min(HERO.maxHp, HERO.hp + 40); SFX.ding(); } },
    { label: 'Scratchcard', sub: 'Win up to $10,000', price: 10, can: () => true, buy: scratchcard }
  ];
}
function scratchcard() {
  const r = Math.random(); let win = 0;
  if (r < 0.006) win = 10000; else if (r < 0.05) win = 500; else if (r < 0.32) win = pick([20, 20, 30, 50, 100]);
  if (win >= 10000) { addCash(win, 'JACKPOT!'); mbanner('Jackpot!', 'You won $10,000 on a scratchcard', 'passed', 4); SFX.passed(); }
  else if (win) { addCash(win, 'on a scratchcard'); SFX.ding(); }
  else feed('Scratchcard: no luck this time');
}
// ---------- carrots ----------
let CARROT_GEO = null, CARROT_MAT = null;
function exhaustPt(v) { return localToWorld(v, v.bike ? 0.17 : 0.4, 0.35, v.rear - 0.15); }
function carrotTarget() {
  const p = HERO.p; if (!G.onFoot || !p || p.rag || G.down || !(HERO.carrots > 0) || HERO.chute) return null;
  let best = null, bd = 1.5;
  for (const v of VEH.list) {
    if (v.remote || v.wrecked || v.carrot || v.flipped || v.tumble || v.sunk) continue;
    if (Math.abs(v.x - p.x) > 6 || Math.abs(v.z - p.z) > 6) continue;
    const e = exhaustPt(v), d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function useCarrot() {
  const v = carrotTarget(); if (!v) return false;
  HERO.carrots--; v.carrot = { d: 0, fuse: rand(90, 160), by: 'hero' };
  if (!CARROT_GEO) { const c = new THREE.ConeGeometry(0.06, 0.32, 8); c.rotateX(-Math.PI / 2); colorize(c, C('#ff7a1a')); const l = new THREE.ConeGeometry(0.05, 0.12, 5); l.rotateX(Math.PI / 2); l.translate(0, 0, -0.2); colorize(l, C('#3fa33a')); CARROT_GEO = mergeGeos([c, l]); CARROT_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }); }
  const m = new THREE.Mesh(CARROT_GEO, CARROT_MAT); m.position.set(v.bike ? 0.17 : 0.4, 0.35, v.rear - 0.05); v.model.inner.add(m); v.carrotM = m;
  HERO.p.h = Math.atan2(v.x - HERO.p.x, v.z - HERO.p.z); HERO.punchT = 0.3; SFX.clank(0.3);
  feed(v.kind === 'parked' ? 'Carrot in. It goes off once someone drives it a little' : 'Carrot in!', 'green');
  return true;
}
function updateCarrots(dt) {
  for (const v of VEH.list) {
    const c = v.carrot; if (!c || v.wrecked) continue;
    const sp = Math.hypot(v.vx, v.vz); c.d += sp * dt;
    const k = c.d / c.fuse;
    if (k > 0.45 && sp > 1 && Math.random() < dt * (4 + k * 20)) { const e = exhaustPt(v); FX.smoke.emit(e.x, e.y, e.z, -v.vx * 0.2 + rand(-0.4, 0.4), rand(0.3, 1), -v.vz * 0.2 + rand(-0.4, 0.4), rand(1, 2), rand(0.4, 0.8), k > 0.8 ? COL.dark : COL.smoke, 0.6, -0.2, 0.6, 1, 4); if (k > 0.8 && Math.random() < 0.3) FX.fire.emit(e.x, e.y, e.z, -v.vx * 0.2, 0.5, -v.vz * 0.2, 0.2, 0.3, COL.fire, 1, -1, 1, 0.4, 4); }
    if (c.d >= c.fuse) { v.carrot = null; if (v.carrotM) { v.carrotM.parent && v.carrotM.parent.remove(v.carrotM); v.carrotM = null; } wreckVehicle(v, c.by); if (v === G.player) { const b = $('#bannerSub'); if (b) b.textContent = 'Somebody stuffed a carrot up your exhaust'; } }
  }
}
// ---------- pedestrians who steal parked cars ----------
const THIEF = { t: 8, list: [] };
function stealCandidate(v, P) {
  if (v.kind !== 'parked' || v.locked || v.mission || v.forSale || v.remote || v.wrecked || v.flipped || v.tumble || v.sunk || v === G.player) return false;
  if (HERO.enter && HERO.enter.v === v) return false;
  const d = Math.hypot(v.x - P.x, v.z - P.z); return d > 10 && d < 120;
}
function updateThieves(dt) {
  for (let i = THIEF.list.length - 1; i >= 0; i--) {
    const T = THIEF.list[i], p = T.p, v = T.v;
    if (!p.active || p.rag || p.dead || p.state !== 'goto' || !VEH.list.includes(v) || v.wrecked || v.kind !== 'parked' || v === G.player || (HERO.enter && HERO.enter.v === v) || GT - T.t0 > 35) {
      if (p.active && !p.rag && p.state === 'goto') p.state = 'walk';
      p.thief = null; THIEF.list.splice(i, 1); continue;
    }
    const dp = doorPoint(v); p.tx = dp.x; p.tz = dp.z;
    if (v.locked && (T.foiled || Math.hypot(p.x - dp.x, p.z - dp.z) < 1.6)) {   // tries the handle, gives up
      if (T.mine) feed('A thief tried your door, but it was locked', 'green');
      v.lockFlash = 1.6; SFX.chirp(true); p.state = 'walk'; p.thief = null; THIEF.list.splice(i, 1); continue;
    }
    if (Math.hypot(p.x - dp.x, p.z - dp.z) < 1.1) {
      hidePed(p); p.active = false; p.thief = null; THIEF.list.splice(i, 1);
      v.kind = 'traffic'; v.abandoned = false; Object.assign(v.input, { park: 0, hand: 0 });
      const nl = nearestLane(v.x, v.z); if (nl) { aiInit(v, nl.e.id, nl.e.a); aiSnapToRoad(v); v.ai.cruise = rand(11, 16); }
      if (v.bike) setRiderLook(v.model, { shirt: pick(TRAFFIC_COLORS), pants: '#2a3550', skin: pick(SKIN), helmet: pick(TRAFFIC_COLORS) });
      if (T.mine) feed('Someone just stole your car!', 'red');
    }
  }
  THIEF.t -= dt; if (THIEF.t > 0) return; THIEF.t = rand(6, 13);
  const P = PF(); if (!P || THIEF.list.length >= 2 || settings.pedDensity <= 0 || APP.mode !== 'game') return;
  const cands = VEH.list.filter(v => stealCandidate(v, P));
  if (!cands.length) return;
  // your abandoned car is the juiciest target
  cands.sort((a, b) => (b.own || b.abandoned ? 1 : 0) - (a.own || a.abandoned ? 1 : 0) || Math.random() - 0.5);
  for (const v of cands.slice(0, 4)) {
    let best = null, bd = 40;
    for (const p of PED.list) {
      if (!p.active || p.rag || p.dead || p.isHero || p.cop || p.clerk || p.mission || p.remote || p.thief || (p.state !== 'walk' && p.state !== 'idle')) continue;
      const d = Math.hypot(p.x - v.x, p.z - v.z); if (d < bd) { bd = d; best = p; }
    }
    if (!best) continue;
    best.state = 'goto'; best.thief = v; const dp = doorPoint(v); best.tx = dp.x; best.tz = dp.z;
    const mine = !!(v.own || (v.abandoned && GT - (v.abandonT || 0) < 900));
    THIEF.list.push({ p: best, v, t0: GT, mine });
    if (mine) feed('Hey! Someone is going for your car', 'red');
    break;
  }
}
function clearThieves() { THIEF.list.length = 0; THIEF.t = 8; }
