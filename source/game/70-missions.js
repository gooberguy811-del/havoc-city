// =====================================================================
//  MISSIONS: markers, objectives, rewards
// =====================================================================
const CHOP = [-238, 150];
const MISSIONS = {
  nyc: [
    { id: 'y1', name: 'Yellow Fever', blurb: 'A collector wants a genuine yellow cab. Grab one off Midtown and get it to the garage by the river without wrecking it.', giver: [37.5, -36], reward: 1600, time: 160,
      steps: [{ t: 'steal', at: [60, 3, Math.PI / 2], car: { body: 'viper', paint: '#f2c21b', finish: 'gloss', rim: 'disc', rimColor: '#2a2c30', tint: 1, plate: 'T 1234' }, text: 'Steal the yellow cab' },
        { t: 'deliver', at: [-250, 240], r: 8, minHealth: 0.5, text: 'Deliver it to the garage by the Hudson' }] },
    { id: 'y2', name: 'Avenue Sprint', blurb: 'Uptown, downtown, crosstown. Hit every checkpoint before the clock runs out.', giver: [-47.5, 10], reward: 1200, time: 110,
      steps: [{ t: 'cps', pts: [[30, -208], [30, -104], [30, 0], [30, 104], [115, 156], [200, 52], [200, -104], [115, -208], [-55, -208], [-140, -104], [-140, 52], [-55, 0]], text: 'Checkpoint' }] },
    { id: 'y3', name: 'Park Getaway', blurb: 'Stir up some trouble in Midtown, shake the cops, then lie low on the Central Park transverse.', giver: [-132.5, -60], reward: 2200,
      steps: [{ t: 'wanted', stars: 3 }, { t: 'evade', text: 'Lose the police' }, { t: 'goto', car: true, at: [-55, 182], r: 8, text: 'Lie low in Central Park' }] }
  ],
  neon: [
    { id: 'n1', name: 'Joyride', blurb: 'A collector wants a yellow Comet R. One is sitting in the downtown parking lot. Bring it to the chop shop without wrecking it.', giver: [-8.5, 44], reward: 1500, time: 170,
      steps: [{ t: 'steal', at: [115, 64, Math.PI / 2], car: { body: 'comet', paint: '#f5b700', finish: 'metallic', spoiler: 'wing', rim: 'mesh', rimColor: '#2a2c30', tint: 2 }, text: 'Steal the yellow Comet R' },
        { t: 'deliver', at: CHOP, r: 7, minHealth: 0.5, text: 'Deliver it to the chop shop' }] },
    { id: 'n2', name: 'Rush Hour', blurb: 'Hit every checkpoint across downtown before the clock runs out.', giver: [80.5, -36], reward: 1000, time: 85,
      steps: [{ t: 'cps', pts: [[72, -120], [72, -216], [-36, -216], [-144, -216], [-144, -108], [-144, 0], [-144, 72], [-36, 72], [72, 72], [72, 0]], text: 'Checkpoint' }] },
    { id: 'n3', name: 'The Getaway', blurb: 'Your partner is finishing a job at the bank. Pick them up, shake the police, then get to the hideout.', giver: [-63.5, 36], reward: 2500,
      steps: [{ t: 'goto', car: true, at: [-79, 108], r: 8, text: 'Drive to the bank' },
        { t: 'pickup', at: [-81.5, 108], text: 'Pick up your partner' },
        { t: 'wanted', stars: 3 },
        { t: 'evade', text: 'Lose the police' },
        { t: 'goto', car: true, at: [200, -236], r: 7, text: 'Drop your partner at the hideout' }] },
    { id: 'n4', name: 'Scrap Metal', blurb: 'The scrapyard pays per wreck. Total four cars any way you like.', giver: [152.5, 108], reward: 1200, time: 120,
      steps: [{ t: 'destroy', n: 4, text: 'Wreck cars' }] },
    { id: 'n5', name: 'Badge Swap', blurb: 'Someone wants a police cruiser, no questions asked. There is one parked by the precinct.', giver: [-152.5, -180], reward: 3000,
      steps: [{ t: 'steal', at: [-100, -151.6, Math.PI / 2], police: true, car: POLICE_CFG, text: 'Steal the parked police cruiser' },
        { t: 'deliver', at: CHOP, r: 7, minHealth: 0.3, text: 'Deliver the cruiser to the chop shop' }] }
  ],
  perth: [
    { id: 'p1', name: 'Freeway Lap', blurb: 'A lap of the city: Mounts Bay Road, Fraser Avenue, the Narrows Bridge, South Perth and back over the Causeway.', giver: [60, -21.5], reward: 1600, time: 160,
      steps: [{ t: 'cps', pts: [[160, -30], [230, -30], [300, -90], [300, -30], [300, 160], [300, 370], [180, 450], [-20, 450], [-120, 370], [-120, 160], [-120, 30], [-330, 30], [-330, -60], [-200, -60], [-120, -60], [-50, -90]], text: 'Checkpoint' }] },
    { id: 'p2', name: 'Quay Run', blurb: 'A crate of champagne for a launch at Elizabeth Quay. Every bump costs you.', giver: [55, -241.5], reward: 1200, time: 70,
      steps: [{ t: 'goto', car: true, at: [55, 30], r: 7, maxLoss: 0.3, text: 'Deliver the crate to Elizabeth Quay' }] },
    { id: 'p3', name: 'Stadium Heist', blurb: 'A yellow Comet R is parked outside the stadium on Burswood. A buyer in West Perth wants it in one piece.', giver: [291.5, -120], reward: 2000, time: 190,
      steps: [{ t: 'steal', at: [470, 19.5, Math.PI / 2], car: { body: 'comet', paint: '#f5c400', finish: 'metallic', spoiler: 'wing', rim: 'mesh', rimColor: '#1b1d21', tint: 2, stripes: true, stripe: '#121316' }, text: 'Steal the yellow Comet R at the stadium' },
        { t: 'deliver', at: [-130, -225], r: 8, minHealth: 0.5, text: 'Deliver it to the buyer by the freeway in West Perth' }] },
    { id: 'p4', name: 'Cottesloe Getaway', blurb: 'Grab some heat in Kings Park, shake the police, then lie low at Cottesloe Beach.', giver: [-321.5, -100], reward: 2400,
      steps: [{ t: 'wanted', stars: 3 }, { t: 'evade', text: 'Lose the police' }, { t: 'goto', car: true, at: [-490, -100], r: 8, text: 'Lie low at Cottesloe Beach' }] },
    { id: 'p5', name: 'Swan Dive', blurb: 'An insurance job. Take the silver Brute SS parked at Mill Point and sink it in the Swan River, then swim back.', giver: [-11.5, 330], reward: 2200, time: 200,
      steps: [{ t: 'steal', at: [-70, 297.6, Math.PI / 2], car: { body: 'brute', paint: '#b8bcc2', finish: 'metallic', rim: 'classic', rimColor: '#c9ccd2' }, text: 'Steal the silver Brute SS' },
        { t: 'sink', text: 'Drive it into the Swan River', at: [100, 160] },
        { t: 'goto', at: [100, 277], r: 6, foot: true, text: 'Swim back to the South Perth foreshore' }] }
  ],
  base: [
    { id: 'b1', name: 'Bird of Prey', blurb: 'Sneak onto Fort Redrock, steal a Hornet attack chopper off the helipads and set it down in the Dust Creek town square.', giver: [-266.5, -30], reward: 3000,
      steps: [{ t: 'board', plane: 'hornet', text: 'Steal a Hornet attack chopper from the helipads' },
        { t: 'land', plane: 'hornet', at: [-485, 145], r: 24, text: 'Land the Hornet in the Dust Creek town square' }] },
    { id: 'b2', name: 'Chopper Down', blurb: 'Kick up enough trouble to bring out the police chopper, then lock on with V and bring it down.', giver: [-432.5, 140], reward: 3000,
      steps: [{ t: 'wanted', stars: 3 }, { t: 'heli', text: 'Shoot down the police chopper' }] },
    { id: 'b3', name: 'Supply Run', blurb: 'An army truck is sitting in the Fort Redrock motor pool. A buyer in town wants it in one piece.', giver: [-52.5, -150], reward: 1800, time: 200,
      steps: [{ t: 'steal', at: [470, -150, 0], car: { body: 'ranger', paint: '#4b5a3a', finish: 'matte', rim: 'classic', rimColor: '#2a2c30', plate: 'ARMY 001' }, text: 'Steal the army truck from the motor pool' },
        { t: 'deliver', at: [-575, -215], r: 8, minHealth: 0.5, text: 'Deliver it to the garage in Dust Creek' }] },
    { id: 'b4', name: 'Dust Devil', blurb: 'Round Dust Creek, through the base gate, a lap of the camp and back. Do not miss a checkpoint.', giver: [-522.5, -120], reward: 1400, time: 135,
      steps: [{ t: 'cps', pts: [[-440, -170], [-260, -170], [-260, 10], [-160, 10], [-60, 10], [-60, -280], [140, -280], [140, 10], [-60, 10], [-260, 10], [-260, 190], [-440, 190], [-620, 190], [-620, -80], [-530, -80]], text: 'Checkpoint' }] }
  ],
  sand: [
    { id: 's1', name: 'Beach Run', blurb: 'One lap of Sandport, straight through the stunt park. Do not miss a checkpoint.', giver: [216.5, 50], reward: 1200, time: 115,
      steps: [{ t: 'cps', pts: [[225, 150], [150, 180], [45, 150], [45, 92], [0, 92], [-60, 92], [-135, 60], [-135, -50], [-45, -90], [100, -90], [225, -40]], text: 'Checkpoint' }] },
    { id: 's2', name: 'Airtime', blurb: 'Land a jump of at least 38 metres in the stunt park.', giver: [36.5, 120], reward: 1000, time: 120,
      steps: [{ t: 'jump', d: 38, text: 'Land a 38 m jump' }] },
    { id: 's3', name: 'Fragile Cargo', blurb: 'A crate of antique glass needs to reach the mall. Every bump costs you.', giver: [110, 104], reward: 1400, time: 75,
      steps: [{ t: 'goto', car: true, at: [130, -23], r: 7, maxLoss: 0.3, text: 'Deliver the cargo to the mall' }] },
    { id: 's4', name: 'Heat Wave', blurb: 'Survive one minute with four stars on your tail.', giver: [-216.5, -45], reward: 2500,
      steps: [{ t: 'wanted', stars: 4 }, { t: 'survive', dur: 60, text: 'Survive the police' }] },
    { id: 's5', name: 'Beach Bum', blurb: 'A red Brute SS is parked on the beach. Its owner owes money. Take it to the desert hideout.', giver: [142.5, 135], reward: 1800, time: 170,
      steps: [{ t: 'steal', at: [270, -100, 0], car: { body: 'brute', paint: '#c0262e', finish: 'gloss', stripes: true, stripe: '#f4f4f4', rim: 'classic', rimColor: '#c9ccd2' }, text: 'Steal the red Brute SS' },
        { t: 'deliver', at: [-265, 120], r: 8, minHealth: 0.6, text: 'Deliver it to the desert hideout' }] }
  ]
};
// ---------- the airport heist: Vic waits outside the terminal ----------
const HIDEOUTS = { base: [-620, -215], nyc: [-250, 240], neon: [-238, 150], sand: [-265, 120], perth: [-490, -100] };
function heistDef(id) {
  const A = AIRPORT_SITES[id], P = (u, v) => [A.ox + u * A.ux + v * A.vx, A.oz + u * A.uz + v * A.vz], yaw = (du, dv) => Math.atan2(du * A.ux + dv * A.vx, du * A.uz + dv * A.vz);
  const van = P(-262, 96), gate = P(-248, 64.6);
  return { id: 'heist', name: 'The Big One', heist: true, unlock: 'heist', reward: 30000, giver: P(-40, 14.6),
    blurb: 'Vic has a plan: a cargo hangar at the airport is holding a cage full of gold. Drive Vic in, keep security off while the lock is cracked, then escape in the armoured van with the police on your tail.',
    steps: [
      { t: 'pickup', at: P(-36, 14.6), text: 'Pick up Vic in a car' },
      { t: 'goto', car: true, at: P(-248, 121), r: 10, text: 'Drive to the cargo hangar' },
      { t: 'crack', at: gate, face: yaw(0, -1), from: P(-248, 104), time: 30, wave: 10, per: 2, cap: 6, spawns: [P(-268, 122), P(-228, 122), P(-200, 100), P(-290, 120), P(-248, 132)], text: 'Keep Vic alive while the cage lock is cracked' },
      { t: 'steal', at: [van[0], van[1], yaw(0, 1)], car: { body: 'ranger', paint: '#1b1c1f', finish: 'matte', armor: 4, engine: 3, handling: 2, rim: 'disc', rimColor: '#2a2c30', tint: 2, height: 'lifted', stripes: true, stripe: '#d4af37' }, text: 'Get in the armoured van with the gold' },
      { t: 'wanted', stars: 4 },
      { t: 'evade', text: 'Lose the police (a respray at the mechanic helps)' },
      { t: 'deliver', at: HIDEOUTS[id], r: 8, minHealth: 0.08, text: 'Get the gold to the hideout' }] };
}
for (const id of ['neon', 'sand', 'perth', 'nyc']) if (MISSIONS[id] && AIRPORT_SITES[id]) MISSIONS[id].push(heistDef(id));
const FLIP_BLURB = 'A freestyle team is scouting riders. Take their dirt bike, hit a ramp, pull a backflip in the air and land it clean. Nail it and they give you their best bike.';
function flipDef(id) {
  let giver, at, ramp = null;
  if (id === 'sand') { giver = [-127.5, 66]; at = [-118, 66, Math.PI / 2]; ramp = [-45, 28]; }
  else { const S = CONSTRUCT_SITES[id]; if (!S) return null; const [x0, z0, x1, z1] = S.b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    giver = S.face === 'z1' ? [cx + 9, z1 - 1.6] : S.face === 'z0' ? [cx + 9, z0 + 1.6] : S.face === 'x0' ? [x0 + 1.6, cz + 9] : [x1 - 1.6, cz + 9];
    at = S.face === 'z1' ? [cx, z1 - 4, Math.PI] : S.face === 'z0' ? [cx, z0 + 4, 0] : S.face === 'x0' ? [x0 + 4, cz, Math.PI / 2] : [x1 - 4, cz, -Math.PI / 2]; }
  return { id: 'flip', name: 'Flip It', blurb: FLIP_BLURB, reward: 2500, unlock: 'flip', giver,
    steps: [{ t: 'steal', at, car: { body: 'mudslinger', paint: '#1f4fd1', stripe: '#f5b700', plate: 'FLIP' }, text: 'Hop on the dirt bike' },
      { t: 'flip', ramp, text: 'Hit a ramp fast, hold S in the air to backflip, and land on your wheels' }] };
}
for (const id of ['sand', ...Object.keys(CONSTRUCT_SITES)]) { const d = MISSIONS[id] && flipDef(id); if (d) MISSIONS[id].push(d); }
for (const id of Object.keys(CONSTRUCT_SITES)) if (MISSIONS[id]) MISSIONS[id].push({ id: 'chain', name: 'Chain Reaction', reward: 4000, giver: constructGiver(id),
  blurb: 'A developer wants the half-built tower gone, and it has to look like an accident. Ram the stack of steel pipes so they roll into the fuel tanks. The blast should take out the crane, and the crane should take out the tower.',
  steps: [{ t: 'rube', text: 'Ram the pipe stack at speed to start the chain reaction' }] });
const MIS = { unlocked: store.get('havoc.unlocked', {}) || {}, defs: [], active: null, idx: 0, s: null, timeLeft: 0, cash: +store.get('havoc.cash', 0) || 0, done: store.get('havoc.done', {}) || {}, group: null, givers: [], car: null, objText: '', objX: null, objZ: null, block: null, jumpBest: 0, mat: null };
function initMissionVisuals() {
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 36, 1, true); cyl.translate(0, 0.5, 0);
  const ring = new THREE.PlaneGeometry(1, 1); ring.rotateX(-Math.PI / 2);
  const mk = (hex, op) => new THREE.MeshBasicMaterial({ color: C(hex), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const arrow = new THREE.ConeGeometry(0.55, 1.2, 4); arrow.rotateX(Math.PI);
  MIS.geo = { cyl, ring, icon: new THREE.OctahedronGeometry(0.5), arrow };
  MIS.mat = { giver: mk('#ffb21e', 0.32), done: mk('#47d18c', 0.22), obj: mk('#ffe14a', 0.34), next: mk('#ffe14a', 0.1),
    ring: new THREE.MeshBasicMaterial({ color: C('#ffb21e'), map: TEX.glow, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    icon: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.8, 0.15) }), iconDone: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.1, 0.55) }),
    arrow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, 0.2) }) };
  MIS.group = new THREE.Group(); scene.add(MIS.group);
  MIS.arrow = new THREE.Mesh(MIS.geo.arrow, MIS.mat.arrow); MIS.arrow.visible = false; scene.add(MIS.arrow);
}
function makeMarker(x, z, r, mat, h, icon) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(MIS.geo.cyl, mat); c.scale.set(r, h || 2.6, r); c.renderOrder = 4; g.add(c);
  const rg = new THREE.Mesh(MIS.geo.ring, MIS.mat.ring); rg.scale.set(r * 2.8, 1, r * 2.8); rg.position.y = 0.06; rg.renderOrder = 3; g.add(rg);
  if (icon) { const ic = new THREE.Mesh(MIS.geo.icon, icon); ic.position.y = (h || 2.6) + 0.8; g.add(ic); g.userData.icon = ic; }
  g.position.set(x, heightAt(x, z), z); MIS.group.add(g); return g;
}
function missionsLoad() {
  if (MIS.active) cleanupMission();
  while (MIS.group.children.length) MIS.group.remove(MIS.group.children[0]);
  if (MISSIONS[W.id] && !MISSIONS[W.id].some(d => d.id === 'snatch')) { const d = snatchDef(); if (d) MISSIONS[W.id].push(d); }
  MIS.defs = MISSIONS[W.id] || []; MIS.givers = [];
  for (const d of MIS.defs) { const done = !!MIS.done[d.id]; const m = makeMarker(d.giver[0], d.giver[1], 1.4, done ? MIS.mat.done : MIS.mat.giver, 2.4, done ? MIS.mat.iconDone : MIS.mat.icon); MIS.givers.push({ d, m }); }
}
function saveProgress() { store.set('havoc.cash', MIS.cash); store.set('havoc.done', MIS.done); store.set('havoc.unlocked', MIS.unlocked); }
function addCash(n, why) { MIS.cash = Math.max(0, MIS.cash + n); saveProgress(); if (why) feed(`${n >= 0 ? '+' : '−'}$${Math.abs(n).toLocaleString()} ${why}`, n >= 0 ? 'green' : 'red'); }
function mbanner(title, sub, kind, t) {
  const b = $('#mbanner'); b.className = kind || ''; $('#mbTitle').textContent = title; $('#mbSub').textContent = sub || ''; b.hidden = false;
  clearTimeout(MIS.bt); MIS.bt = setTimeout(() => { b.hidden = true; }, (t || 3.6) * 1000);
}
function startMission(d) {
  MIS.active = d; MIS.idx = -1; MIS.timeLeft = d.time || 0; MIS.car = null; MIS.jumpBest = 0;
  for (const g of MIS.givers) g.m.visible = false;
  mbanner(d.name, d.blurb, 'intro', 4.5); SFX.ding();
  nextStep();
}
function nextStep() {
  const s = MIS.s; if (s) clearStepVisuals(s);
  MIS.idx++; const st = MIS.active.steps[MIS.idx];
  if (!st) { passMission(); return; }
  MIS.s = { st }; MIS.objX = MIS.objZ = null; MIS.objText = '';
  if (STEP[st.t].start) STEP[st.t].start(st, MIS.s);
}
function clearStepVisuals(s) { for (const m of s.markers || []) MIS.group.remove(m); if (s.marker) MIS.group.remove(s.marker); MIS.arrow.visible = false; }
function cleanupMission() {
  const d = MIS.active; if (!d) return;
  if (MIS.s) clearStepVisuals(MIS.s);
  if (MIS.s && MIS.s.ped && MIS.s.ped.active && !MIS.s.ped.rag) { MIS.s.ped.mission = false; MIS.s.ped.state = 'walk'; }
  if (MIS.partner) { MIS.partner = false; }
  if (MIS.car) { MIS.car.mission = false; if (MIS.car !== G.player) MIS.car.abandoned = true; }
  MIS.active = null; MIS.s = null; MIS.car = null; MIS.objX = MIS.objZ = null; MIS.block = d.id;
  for (const g of MIS.givers) g.m.visible = true;
}
function failMission(why) { if (!MIS.active) return; mbanner('Mission failed', why, 'failed'); SFX.fail(); cleanupMission(); }
function passMission() {
  const d = MIS.active; MIS.done[d.id] = true; MIS.cash += d.reward; saveProgress();
  mbanner('Mission passed', `+$${d.reward.toLocaleString()}`, 'passed'); SFX.passed();
  cleanupMission();
  if (d.unlock && !MIS.unlocked[d.unlock]) { MIS.unlocked[d.unlock] = true; saveProgress(); const nb = Object.values(BODIES).find(q => q.unlock === d.unlock); setTimeout(() => { mbanner(nb && nb.bike ? 'New bike unlocked' : 'New car unlocked', `The ${nb ? nb.name : 'new ride'} is waiting in your Garage`, 'passed', 5); SFX.ding(); }, 3900); }
  const g = MIS.givers.find(g => g.d === d); if (g) { MIS.group.remove(g.m); g.m = makeMarker(d.giver[0], d.giver[1], 1.4, MIS.mat.done, 2.4, MIS.mat.iconDone); }
}
function abandonMission() { if (MIS.active) failMission('You walked away from the job'); }
function setObj(text, x, z) { MIS.objText = text; MIS.objX = x == null ? null : x; MIS.objZ = z == null ? null : z; }
function arrowOver(x, y, z) { MIS.arrow.visible = true; MIS.arrow.position.set(x, y + Math.sin(GT * 4) * 0.25, z); MIS.arrow.rotation.y += 0.05; }
function clearArea(x, z, r) { for (const v of [...VEH.list]) if (v !== G.player && !v.mission && Math.hypot(v.x - x, v.z - z) < r) v.remove(); }
const STEP = {
  steal: {
    start(st, s) {
      const [x, z, h] = st.at; clearArea(x, z, 6);
      const cfg = Object.assign(randomTrafficCfg(), st.car, { plate: 'MISSION' });
      const v = new Vehicle(cfg, 'parked', { police: !!st.police }); v.place(x, z, h, 0); v.mission = true; VEH.list.push(v); MIS.car = v;
    },
    update(st) {
      const v = MIS.car; if (!v || v.wrecked || !VEH.list.includes(v)) return failMission('The car was destroyed');
      if (v.sunk) return failMission('The car ended up in the river');
      setObj(st.text, v.x, v.z); arrowOver(v.x, v.y + v.height + 1.6, v.z);
      if (G.player === v) { MIS.arrow.visible = false; nextStep(); }
    }
  },
  deliver: {
    start(st, s) { s.marker = makeMarker(st.at[0], st.at[1], st.r, MIS.mat.obj, 4); },
    update(st, s) {
      const v = MIS.car; if (!v || v.wrecked || !VEH.list.includes(v)) return failMission('The car was destroyed');
      if (v.sunk) return failMission('The car ended up in the river');
      if (G.player !== v) { setObj('Get back in the car', v.x, v.z); arrowOver(v.x, v.y + v.height + 1.6, v.z); s.marker.visible = false; return; }
      MIS.arrow.visible = false; s.marker.visible = true;
      const hp = v.health / v.maxHp;
      if (hp < st.minHealth) return failMission('The car is too badly damaged');
      setObj(`${st.text} <small>${Math.round(hp * 100)}% condition · needs ${Math.round(st.minHealth * 100)}%</small>`, st.at[0], st.at[1]);
      if (Math.hypot(v.x - st.at[0], v.z - st.at[1]) < st.r && v.speed < 3) nextStep();
    }
  },
  goto: {
    start(st, s) { s.marker = makeMarker(st.at[0], st.at[1], st.r, MIS.mat.obj, 4); s.car = G.player; s.h0 = G.player ? G.player.health : 0; },
    update(st, s) {
      const T = PF();
      if (st.maxLoss) {
        if (!s.car) { if (G.player) { s.car = G.player; s.h0 = G.player.health; } else { setObj('Get in a car to carry the cargo', st.at[0], st.at[1]); return; } }
        if (s.car.wrecked || s.car.sunk) return failMission('The cargo was destroyed');
        if (G.player !== s.car) { setObj('Get back in the car with the cargo', s.car.x, s.car.z); return; }
        const loss = (s.h0 - s.car.health) / s.car.maxHp;
        if (loss > st.maxLoss) return failMission('The cargo broke');
        setObj(`${st.text} <small>cargo ${Math.max(0, Math.round((1 - loss / st.maxLoss) * 100))}% intact</small>`, st.at[0], st.at[1]);
      } else if (st.car && G.onFoot) setObj('Get in a car', st.at[0], st.at[1]);
      else setObj(st.text, st.at[0], st.at[1]);
      const inCar = !G.onFoot && G.player;
      if (Math.hypot(T.x - st.at[0], T.z - st.at[1]) < st.r && (!st.car || (inCar && T.speed < 4))) nextStep();
    }
  },
  cps: {
    start(st, s) {
      s.i = 0; s.markers = st.pts.map(p => { const m = makeMarker(p[0], p[1], 6, MIS.mat.next, 7); m.visible = false; return m; });
      this.show(s);
    },
    show(s) { s.markers.forEach((m, k) => { m.visible = k === s.i || k === s.i + 1; m.children[0].material = k === s.i ? MIS.mat.obj : MIS.mat.next; }); },
    update(st, s) {
      const p = st.pts[s.i], T = PF();
      if (G.onFoot) { setObj('Get in a car', p[0], p[1]); return; }
      setObj(`${st.text} ${s.i + 1} of ${st.pts.length}`, p[0], p[1]);
      if (Math.hypot(T.x - p[0], T.z - p[1]) < 8) {
        SFX.ding(); s.i++;
        if (s.i >= st.pts.length) { nextStep(); return; }
        this.show(s);
      }
    }
  },
  pickup: {
    start(st, s) { const q = spawnPedAt(st.at[0], st.at[1], st.who || 'partner'); s.ped = q; if (q) { q.state = 'idle'; q.mission = true; q.h = -Math.PI / 2; } },
    update(st, s) {
      const q = s.ped; if (!q || !q.active || q.dead) return failMission(st.lost || 'Your partner was killed');
      const qx = q.rag ? q.rag.pos[24] : q.x, qz = q.rag ? q.rag.pos[26] : q.z;
      setObj(st.text, qx, qz); arrowOver(qx, q.y + 2.6, qz);
      const v = G.player; if (!v || q.rag) return;
      const d = Math.hypot(v.x - q.x, v.z - q.z);
      if (d < 16 && v.speed < 3) { const dp = doorPoint(v, -1); q.state = 'goto'; q.tx = dp.x; q.tz = dp.z; }
      if (d < 4.2 && v.speed < 3) { hidePed(q); q.active = false; MIS.partner = true; MIS.arrow.visible = false; feed(st.got || 'Your partner is in the car'); nextStep(); }
    }
  },
  sink: {
    update(st) {
      const v = MIS.car; if (!v || !VEH.list.includes(v)) return failMission('The car is gone');
      if (v.sunk) { feed('Down she goes', 'blue'); nextStep(); return; }
      if (v.wrecked) return failMission('The car blew up before it sank');
      setObj(G.player === v ? st.text : 'Get back in the car', G.player === v ? st.at[0] : v.x, G.player === v ? st.at[1] : v.z);
      if (G.player !== v) arrowOver(v.x, v.y + v.height + 1.6, v.z); else MIS.arrow.visible = false;
    }
  },
  board: {   // get into a particular aircraft
    update(st) {
      const pl = G.plane; if (pl && pl.type === st.plane) { MIS.arrow.visible = false; nextStep(); return; }
      const F = PF(); let best = null, bd = 1e9; for (const q of PLANES.list) { if (q.type !== st.plane || q.wreck || q.remote) continue; const d = Math.hypot(q.x - F.x, q.z - F.z); if (d < bd) { bd = d; best = q; } }
      if (!best) return failMission('There is nothing left to steal');
      setObj(st.text, best.x, best.z); arrowOver(best.x, best.y + 6, best.z);
    }
  },
  land: {   // put it down gently inside the marker
    start(st, s) { s.marker = makeMarker(st.at[0], st.at[1], st.r, MIS.mat.obj, 4); },
    update(st, s) {
      const pl = G.plane;
      if (!pl || pl.type !== st.plane) { const q = PLANES.list.find(o => o.type === st.plane && !o.wreck && !o.remote); if (!q) return failMission('The chopper was destroyed'); setObj('Get back in the chopper', q.x, q.z); return; }
      setObj(st.text, st.at[0], st.at[1]);
      if (pl.ground && pl.V.length() < 3 && Math.hypot(pl.x - st.at[0], pl.z - st.at[1]) < st.r) nextStep();
    }
  },
  heli: {   // bring down the police chopper yourself
    start(st, s) { s.t0 = GT; },
    update(st, s) {
      if (HELI.killedAt > s.t0) { nextStep(); return; }
      if (wanted.stars < 3 && settings.police !== 'off') { wanted.heat = Math.max(wanted.heat, 3.4); wanted.stars = 3; }
      if (HELI.active && !HELI.down) setObj(`${st.text} <small>${APP.touch ? 'tap MSL' : 'V'} fires a homing missile · ${Math.max(0, Math.round(HELI.hp / 5))}% left</small>`, HELI.x, HELI.z);
      else setObj('Keep the heat on until the police chopper shows up');
    }
  },
  wanted: {
    start(st) {
      if (settings.police === 'off') feed('Police are switched off, so nobody is chasing you');
      else { wanted.heat = Math.max(wanted.heat, st.stars + 0.4); wanted.stars = Math.floor(wanted.heat); wanted.unseen = 0; feed(`Wanted level ${wanted.stars}`, 'red'); SFX.sting(); }
      nextStep();
    }
  },
  crack: {
    start(st, s) {
      const q = spawnPedAt(st.from[0], st.from[1], 'partner'); s.ped = q; if (q) { q.mission = true; q.state = 'goto'; q.tx = st.at[0]; q.tz = st.at[1]; }
      s.t = 0; s.waveT = 3; s.n = 0;
      if (settings.police !== 'off') { wanted.heat = Math.max(wanted.heat, 3.4); wanted.stars = Math.floor(wanted.heat); wanted.unseen = 0; SFX.sting(); }
      alarmBell(); feed('Airport security is coming. Keep Vic alive!', 'red');
    },
    update(st, s, dt) {
      const q = s.ped; if (!q || !q.active || q.dead) return failMission('Vic was killed');
      const T = PF(); if (!T) return;
      if (Math.hypot(T.x - st.at[0], T.z - st.at[1]) > 95) return failMission('You left Vic behind');
      const qx = q.rag ? q.rag.pos[24] : q.x, qz = q.rag ? q.rag.pos[26] : q.z;
      if (!q.rag && Math.hypot(q.x - st.at[0], q.z - st.at[1]) < 1.4) { q.state = 'idle'; q.sp = 0; q.h = st.face; s.t += dt; if (Math.random() < dt * 6) sparks(st.at[0] + Math.sin(st.face) * 0.6, q.y + 1.1, st.at[1] + Math.cos(st.face) * 0.6, 2); }
      else if (!q.rag) { q.state = 'goto'; q.tx = st.at[0]; q.tz = st.at[1]; }
      const pct = Math.min(1, s.t / st.time);
      setObj(`${st.text} <small>${Math.round(pct * 100)}% cracked</small>`, qx, qz); arrowOver(qx, q.y + 2.6, qz);
      s.waveT -= dt;
      if (s.waveT <= 0 && settings.police !== 'off') {
        s.waveT = st.wave;
        let alive = 0; for (const p of PED.list) if (p.active && p.cop && !p.dead) alive++;
        for (let k = 0; k < (st.per || 3) && alive + k < (st.cap || 9); k++) { const sp = st.spawns[(s.n++) % st.spawns.length]; spawnPedAt(sp[0] + rand(-2, 2), sp[1] + rand(-2, 2), 'cop'); }
        if (wanted.stars < 3) { wanted.heat = 3.4; wanted.stars = 3; }
      }
      if (pct >= 1) { hidePed(q); q.active = false; MIS.partner = true; MIS.arrow.visible = false; feed('Vic cracked it and loaded the gold into the van!', 'green'); SFX.ding(); nextStep(); }
    }
  },
  flip: {
    start(st, s) { s.t0 = GT; },
    update(st, s) {
      const v = G.player;
      if (MIS.lastFlip && MIS.lastFlip.t > s.t0 && MIS.lastFlip.type === 'back') { MIS.arrow.visible = false; nextStep(); return; }
      const r = st.ramp || (CON.site && CON.site.ramp);
      if (!v || !v.bike) { const b = MIS.car && VEH.list.includes(MIS.car) ? MIS.car : null; setObj('Get back on a motorbike', b ? b.x : null, b ? b.z : null); if (b) arrowOver(b.x, b.y + 2.4, b.z); return; }
      MIS.arrow.visible = false; setObj(st.text, r ? r[0] : null, r ? r[1] : null);
    }
  },
  rube: {
    start(st, s) { s.base = CON.runs; if (!CON.site || CON.state !== 'ready') failMission('The site is still being cleaned up. Come back later'); },
    update(st, s) {
      const S = CON.site; if (!S) return failMission('There is no construction site here');
      const tw = S.towerBox.struct;
      if (CON.state === 'ready' && tw && tw.state) return failMission('You knocked the tower down the boring way');
      if (CON.state === 'ready') { setObj(st.text, S.px, S.pz); arrowOver(S.px, heightAt(S.px, S.pz) + 3, S.pz); }
      else { MIS.arrow.visible = false; setObj('Watch it go…'); }
      if (CON.state === 'done' && CON.runs > s.base) nextStep();
    }
  },
  evade: { update(st) { setObj(st.text); if (wanted.stars === 0) { nextStep(); } } },
  destroy: { start(st, s) { s.base = G.stats.cars + G.stats.cops; }, update(st, s) { const n = G.stats.cars + G.stats.cops - s.base; setObj(`${st.text} <small>${n} of ${st.n}</small>`); if (n >= st.n) nextStep(); } },
  jump: {
    start(st, s) { MIS.jumpBest = 0; },
    update(st) { const u = settings.units === 'mph'; setObj(`${st.text} <small>best so far ${u ? Math.round(MIS.jumpBest * 3.281) + ' ft' : Math.round(MIS.jumpBest) + ' m'}</small>`, -45, 92); if (MIS.jumpBest >= st.d) nextStep(); }
  },
  survive: {
    start(st, s) { s.t = st.dur; },
    update(st, s, dt) { s.t -= dt; if (settings.police !== 'off' && wanted.stars < 2) { wanted.heat = 2.5; wanted.stars = 2; } setObj(`${st.text} <small>${fmtTime(s.t)} left</small>`); if (s.t <= 0) { resetWantedSoft(); nextStep(); } }
  }
};
function resetWantedSoft() { wanted.heat = 0; wanted.stars = 0; wanted.unseen = 0; }
const fmtTime = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function updateMissions(dt) {
  for (const g of MIS.givers) { if (!g.m.visible) continue; const ic = g.m.userData.icon; if (ic) { ic.rotation.y += dt * 1.6; ic.position.y = 3.2 + Math.sin(GT * 2.2) * 0.15; } }
  const T = PF(); if (!T || G.down) return;
  if (!MIS.active) {
    for (const g of MIS.givers) {
      const d = Math.hypot(T.x - g.d.giver[0], T.z - g.d.giver[1]);
      if (MIS.block === g.d.id) { if (d > 9) MIS.block = null; continue; }
      if (d < (G.onFoot ? 2.0 : 6.0) && T.speed < 9) { startMission(g.d); break; }
    }
    return;
  }
  if (MIS.active.time) { MIS.timeLeft -= dt; if (MIS.timeLeft <= 0) { failMission('Out of time'); return; } }
  const st = MIS.s.st; if (STEP[st.t].update) STEP[st.t].update.call(STEP[st.t], st, MIS.s, dt);
}
function updateMissionHUD() {
  const o = el('obj');
  if (!MIS.active) { o.hidden = true; return; }
  o.hidden = false;
  el('objName').textContent = MIS.active.name;
  el('objTime').textContent = MIS.active.time ? fmtTime(MIS.timeLeft) : '';
  el('objTime').classList.toggle('low', MIS.active.time && MIS.timeLeft < 15);
  let t = MIS.objText;
  if (MIS.objX != null) { const T = PF(); const d = Math.hypot(T.x - MIS.objX, T.z - MIS.objZ); const u = settings.units === 'mph'; t += ` <small>${u ? Math.round(d * 3.281) + ' ft' : Math.round(d) + ' m'}</small>`; }
  if (o.dataset.t !== t) { el('objText').innerHTML = t; o.dataset.t = t; }
}

// ---------- Testing Zone: Show Off (unlocks the Tesla Roadster) ----------
MISSIONS.test = [{ id: 'showoff', name: 'Show Off', reward: 5000, time: 240, unlock: 'roadster', giver: [-30, 22],
  blurb: 'The engineers want proof before they hand over the Roadster. Rack up 15,000 style points, or stay in the air for 3 seconds in one jump. Loops, hoops, drifts, flips, big air and fast quarter miles all score, and chaining tricks builds a multiplier.',
  steps: [{ t: 'style', pts: 15000, air: 3, text: 'Show off' }] }];
STEP.style = {
  start(st, s) { s.p0 = STY.pts; STY.runAir = 0; styleCrash(); },
  update(st, s) {
    const got = STY.pts - s.p0;
    setObj(`Style ${got.toLocaleString()} / ${st.pts.toLocaleString()}  ·  best air ${STY.runAir.toFixed(1)} / ${st.air.toFixed(1)} s`);
    if (got >= st.pts || STY.runAir >= st.air) nextStep();
  }
};
