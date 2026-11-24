// =====================================================================
//  FULL-SCREEN MAP: M, or click / tap the minimap. Drag to pan, wheel or pinch to zoom.
// =====================================================================
const BM = { open: false, s: 1, fit: 1, cx: 0, cz: 0, dpr: 1, cv: null, g: null, ptrs: new Map(), pinch: 0 };
function bigMapBounds() { return W.mapBounds || W.bounds; }
function initBigMap() {
  BM.cv = $('#bmCv'); BM.g = BM.cv.getContext('2d');
  const mm = $('#minimap');
  mm.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); openBigMap(); });
  $('#bmClose').onclick = closeBigMap;
  $('#bmIn').onclick = () => bigMapZoom(1.5); $('#bmOut').onclick = () => bigMapZoom(1 / 1.5);
  $('#bmMe').onclick = () => { const F = PF(); if (F) { BM.cx = F.x; BM.cz = F.z; BM.s = Math.max(BM.s, BM.fit * 2.5); clampBigMap(); drawBigMap(); } };
  const cv = BM.cv;
  cv.addEventListener('wheel', e => { e.preventDefault(); bigMapZoom(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); BM.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); BM.pinch = 0; cv.classList.add('drag'); BM.tap = BM.ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType === 'touch' } : null; });
  cv.addEventListener('pointermove', e => {
    const p = BM.ptrs.get(e.pointerId); if (!p) { const h = bmPick(e.clientX, e.clientY, false); cv.style.cursor = h ? 'pointer' : ''; return; }
    if (BM.tap && Math.hypot(e.clientX - BM.tap.x, e.clientY - BM.tap.y) > 6) BM.tap = null;
    if (BM.ptrs.size >= 2) {
      p.x = e.clientX; p.y = e.clientY;
      const [a, b] = [...BM.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (BM.pinch) bigMapZoom(d / BM.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
      BM.pinch = d; return;
    }
    const dx = (e.clientX - p.x) * BM.dpr, dy = (e.clientY - p.y) * BM.dpr; p.x = e.clientX; p.y = e.clientY;
    BM.cx -= dx / BM.s; BM.cz -= dy / BM.s; clampBigMap(); drawBigMap();
  });
  const up = e => { BM.ptrs.delete(e.pointerId); BM.pinch = 0; if (!BM.ptrs.size) cv.classList.remove('drag'); if (e.type === 'pointerup' && BM.tap && performance.now() - BM.tap.t < 500) { const h = bmPick(e.clientX, e.clientY, BM.tap.touch); if (h) bmShowInfo(h); else bmHideInfo(); } BM.tap = null; };
  $('#bmInfoX').onclick = bmHideInfo;
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', () => { if (BM.open) { const r = BM.s / BM.fit; bigMapResize(); BM.s = BM.fit * r; clampBigMap(); drawBigMap(); } });
}
function openBigMap() {
  if (APP.mode !== 'game' || APP.paused || BM.open || !W) return;
  BM.open = true; $('#bigmap').hidden = false; $('#touch').hidden = true;
  for (const k in KEYS) KEYS[k] = false; for (const k in TOUCH) TOUCH[k] = false;
  SFX.hornSet(false); hornOn = false;
  $('#bmTitle').textContent = W.name;
  bigMapResize();
  const B = bigMapBounds(); BM.cx = (B.x0 + B.x1) / 2; BM.cz = (B.z0 + B.z1) / 2; BM.s = BM.fit;
  drawBigMap();
  $('#bmClose').focus({ preventScroll: true });
}
function closeBigMap() {
  if (!BM.open) return;
  bmHideInfo();
  BM.open = false; BM.ptrs.clear(); $('#bigmap').hidden = true; $('#touch').hidden = !APP.touch || APP.paused;
  for (const k in TOUCH) TOUCH[k] = false;
}
function toggleBigMap() { if (BM.open) closeBigMap(); else openBigMap(); }
function bigMapResize() {
  const cv = BM.cv, r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); BM.dpr = dpr;
  const B = bigMapBounds(), pad = 70 * dpr;
  BM.fit = Math.min((cv.width - pad) / (B.x1 - B.x0), (cv.height - pad * 1.6) / (B.z1 - B.z0));
}
function clampBigMap() {
  const B = bigMapBounds();
  BM.s = clamp(BM.s, BM.fit * 0.8, BM.fit * 10);
  BM.cx = clamp(BM.cx, B.x0, B.x1); BM.cz = clamp(BM.cz, B.z0, B.z1);
}
function bigMapZoom(f, sx, sy) {
  const cv = BM.cv, w = cv.width, h = cv.height;
  const px = sx === undefined ? w / 2 : sx * BM.dpr, py = sy === undefined ? h / 2 : sy * BM.dpr;
  const wx = BM.cx + (px - w / 2) / BM.s, wz = BM.cz + (py - h / 2) / BM.s;   // world point under the cursor stays put
  const s0 = BM.s; BM.s = clamp(BM.s * f, BM.fit * 0.8, BM.fit * 10);
  BM.cx = wx - (px - w / 2) / BM.s; BM.cz = wz - (py - h / 2) / BM.s;
  if (BM.s !== s0) { clampBigMap(); drawBigMap(); }
}
const BM_BG = { base: '#211d16', nyc: '#0f1217', neon: '#0f1217', sand: '#211d16', perth: '#1a2119' };
function drawBigMap() {
  if (!BM.open) return;
  const cv = BM.cv, g = BM.g, w = cv.width, h = cv.height, M = W.mini, s = BM.s, u = BM.dpr;
  const tx = w / 2 - BM.cx * s, ty = h / 2 - BM.cz * s;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = BM_BG[W.id] || '#0f1217'; g.fillRect(0, 0, w, h);
  g.setTransform(s, 0, 0, s, tx, ty);
  if (W.waters) { g.fillStyle = '#1b4a63'; g.fill(M.water); }
  g.fillStyle = (W.miniFlat || '#1f232b'); g.fill(M.flats);
  if (M.air) { g.fillStyle = '#343941'; g.fill(M.air); }
  g.fillStyle = '#2a2f39'; g.fill(M.blocks); g.fillStyle = '#2b5132'; g.fill(M.parks);
  g.fillStyle = '#4b5466'; g.fill(M.bldgs);
  if (M.rubble) { g.fillStyle = '#6b5640'; g.fill(M.rubble); }
  g.strokeStyle = '#7b8494'; g.lineWidth = W.hw * 2; g.lineCap = 'square'; g.stroke(M.roads);
  if (M.runway) { g.fillStyle = '#9aa1ab'; g.fill(M.runway); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const toS = (x, z) => [x * s + tx, z * s + ty];
  const P = BM.pois = [], poi = (x, y, r, o) => { P.push(Object.assign({ sx: x, sy: y, r }, o)); };
  // landmarks that don't have their own marker: a labelled badge you can click
  const badge = (wx, wz, ch, col, o) => { const [x, y] = toS(wx, wz), k = 8 * u; g.fillStyle = col; g.strokeStyle = '#0c0e13'; g.lineWidth = 2 * u; g.beginPath(); g.roundRect ? g.roundRect(x - k, y - k, k * 2, k * 2, 3 * u) : g.rect(x - k, y - k, k * 2, k * 2); g.fill(); g.stroke(); g.fillStyle = '#0c0e13'; g.font = `800 ${Math.round(11 * u)}px system-ui, sans-serif`; g.fillText(ch, x, y + 0.5 * u); poi(x, y, k, o); };
  // labels
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (W.airport) { const [ax, ay] = toS(W.airport.lx, W.airport.lz); g.font = `700 ${Math.round(13 * u)}px system-ui, sans-serif`; g.fillStyle = 'rgba(238,241,245,.85)'; g.fillText('AIRPORT', ax, ay); poi(ax, ay, 34 * u, { t: 'airport' }); }
  if (W.stadium) { const [x, y] = toS(W.stadium.cx, W.stadium.cz); g.font = `700 ${Math.round(12 * u)}px system-ui, sans-serif`; g.fillStyle = 'rgba(238,241,245,.85)'; g.fillText('STADIUM', x, y); poi(x, y, 30 * u, { t: 'stadium' }); }
  for (const sc of W.schools || []) badge(sc.cx, sc.cz, 'S', '#f2c94c', { t: 'school', sc });
  if (W.helipads && W.helipads.length) { const h = W.helipads, cx = h.reduce((a, p) => a + p.x, 0) / h.length, cz = h.reduce((a, p) => a + p.z, 0) / h.length; badge(cx, cz, 'H', '#9fd36b', { t: 'helipads' }); }
  if (W.tankSpots && W.tankSpots.length) { const h = W.tankSpots, cx = h.reduce((a, p) => a + p.x, 0) / h.length, cz = h.reduce((a, p) => a + p.z, 0) / h.length; badge(cx, cz, 'T', '#c2a36b', { t: 'tanks' }); }
  if (W.construct) badge(W.construct.cx, W.construct.cz, 'C', '#ff9f43', { t: 'construct' });
  // gas stations
  for (const st of [...SHOP.list, ...MECH.list]) {
    const [x, y] = toS(st.cx, st.cz), k = 9 * u, L = st.kind === 'gas' ? null : STORE_LOOK[st.kind];
    g.fillStyle = st.wrecked || st.blown ? '#3a3f48' : L ? L.col : GT < st.robbedUntil ? '#6b7384' : '#3fd18a'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2 * u;
    g.beginPath(); g.arc(x, y, k, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#0c0e13'; g.font = `800 ${Math.round(12 * u)}px system-ui, sans-serif`; g.fillText(L ? L.icon : '$', x, y + 0.5 * u);
    poi(x, y, k, { t: 'shop', st });
    if (L && BM.s > BM.fit * 1.8) { g.font = `700 ${Math.round(10 * u)}px system-ui, sans-serif`; g.fillStyle = 'rgba(238,241,245,.9)'; g.fillText(st.name, x, y + k + 9 * u); g.fillStyle = '#0c0e13'; }
  }
  // parked planes
  if (typeof PLANES !== 'undefined') for (const pl of PLANES.list) { if (pl.dead) continue; const [x, y] = toS(pl.x, pl.z); drawPlaneGlyph(g, x, y, Math.PI - pl.yaw, 7 * u, pl === G.plane ? '#7fd3ff' : '#cfd6e0'); poi(x, y, 10 * u, { t: 'plane', pl }); }
  // missions
  if (!MIS.active) for (const gv of MIS.givers) {
    const [x, y] = toS(gv.d.giver[0], gv.d.giver[1]), k = 9 * u;
    g.fillStyle = MIS.done[gv.d.id] ? '#47d18c' : '#ffb21e'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2 * u;
    g.beginPath(); g.moveTo(x, y - k); g.lineTo(x + k, y); g.lineTo(x, y + k); g.lineTo(x - k, y); g.closePath(); g.fill(); g.stroke();
    poi(x, y, k, { t: 'mission', d: gv.d });
  } else if (MIS.objX != null) {
    const [x, y] = toS(MIS.objX, MIS.objZ);
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y, 10 * u, 0, TAU); g.fill(); g.stroke(); poi(x, y, 10 * u, { t: 'objective' });
  }
  // police
  for (const v of VEH.list) { if (!isCop(v)) continue; const [x, y] = toS(v.x, v.z); g.fillStyle = v.ai.chasing ? '#ff3b4f' : '#3f7dff'; g.beginPath(); g.arc(x, y, 5 * u, 0, TAU); g.fill(); poi(x, y, 6 * u, { t: 'cop', v }); }
  if (HELI.active) { const [x, y] = toS(HELI.x, HELI.z); g.strokeStyle = '#ff3b4f'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y, 9 * u, 0, TAU); g.stroke(); poi(x, y, 10 * u, { t: 'heli' }); }
  // other players, with names
  netMarkers(g, toS, 9 * u, false);
  g.font = `700 ${Math.round(12 * u)}px system-ui, sans-serif`;
  for (const N of NET.players.values()) { if (!N.av) continue; const [x, y] = toS(N.x, N.z); g.fillStyle = N.color; g.fillText(N.name, x, y - 20 * u); poi(x, y, 11 * u, { t: 'player', N }); }
  // you
  const F = PF();
  if (F) {
    const [x, y] = toS(F.x, F.z), k = 11 * u;
    g.save(); g.translate(x, y); g.rotate(Math.PI - (G.plane ? G.plane.yaw : F.h));
    g.fillStyle = G.plane ? '#7fd3ff' : G.onFoot ? '#ffffff' : '#ffb21e'; g.strokeStyle = '#0c0e13'; g.lineWidth = 2.5 * u;
    g.beginPath(); g.moveTo(0, -k * 1.3); g.lineTo(k, k); g.lineTo(0, k * 0.45); g.lineTo(-k, k); g.closePath(); g.fill(); g.stroke(); g.restore();
    poi(x, y, k, { t: 'you' });
  }
  // the selected point gets a pulsing ring
  const sel = BM.sel && P.find(q => bmSame(q, BM.sel));
  if (sel) { g.strokeStyle = '#ffffff'; g.lineWidth = 2.5 * u; g.beginPath(); g.arc(sel.sx, sel.sy, sel.r + 6 * u, 0, TAU); g.stroke(); }
}
function drawPlaneGlyph(g, x, y, rot, k, col) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.strokeStyle = '#0c0e13'; g.lineWidth = Math.max(1.5, k * 0.25);
  g.beginPath();
  g.moveTo(0, -k * 1.4); g.lineTo(k * 0.22, -k * 0.7); g.lineTo(k * 1.4, k * 0.05); g.lineTo(k * 1.4, k * 0.35); g.lineTo(k * 0.22, k * 0.05);
  g.lineTo(k * 0.18, k * 0.95); g.lineTo(k * 0.6, k * 1.25); g.lineTo(k * 0.6, k * 1.45); g.lineTo(0, k * 1.28);
  g.lineTo(-k * 0.6, k * 1.45); g.lineTo(-k * 0.6, k * 1.25); g.lineTo(-k * 0.18, k * 0.95); g.lineTo(-k * 0.22, k * 0.05);
  g.lineTo(-k * 1.4, k * 0.35); g.lineTo(-k * 1.4, k * 0.05); g.lineTo(-k * 0.22, -k * 0.7); g.closePath();
  g.stroke(); g.fill(); g.restore();
}

// ---------- click a point on the map to find out what it is ----------
function bmSame(a, b) { return a.t === b.t && a.st === b.st && a.pl === b.pl && a.d === b.d && a.v === b.v && a.N === b.N && a.sc === b.sc; }
function bmPick(cx, cy, touch) {
  if (!BM.pois) return null;
  const r = BM.cv.getBoundingClientRect(), x = (cx - r.left) * BM.dpr, y = (cy - r.top) * BM.dpr, tol = (touch ? 16 : 7) * BM.dpr;
  let best = null, bd = 1e9;
  for (let i = BM.pois.length - 1; i >= 0; i--) {   // later = drawn on top, wins a tie
    const q = BM.pois[i], d = Math.hypot(q.sx - x, q.sy - y);   // nearest centre wins, so overlapping icons can still be told apart
    if (d <= q.r + tol && d < bd - 0.5) { best = q; bd = d; }
  }
  return best;
}
const BM_PLANE_TEXT = {
  sparrow: 'A light prop plane, easy to fly. W / S throttle, A / D bank, arrow keys pitch.',
  stinger: 'A fast jet with a nose machine gun (Q or click) and bombs (B).',
  hornet: 'Attack helicopter with 14 rockets (B) and a machine gun. Land on a helipad to rearm. Taking it puts the base on alert.',
  mule: 'Tough transport helicopter. Taking it puts the base on alert.',
  heli: 'A police helicopter you hijacked.'
};
function bmInfo(h) {
  const $$m = n => '$' + Math.round(n).toLocaleString(), mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
  const enter = APP.touch ? 'tap CAR' : 'press F';
  switch (h.t) {
    case 'mission': {
      const d = h.d, done = !!MIS.done[d.id], meta = ['Reward ' + $$m(d.reward)];
      if (d.time) meta.push('Time limit ' + mmss(d.time));
      meta.push(done ? 'Completed. You can play it again' : 'Not done yet');
      return { k: 'Mission', title: d.name, text: d.blurb, meta, hint: MIS.active ? 'Finish or abandon your current job first' : 'Walk or drive into the orange marker to start' };
    }
    case 'objective': return { k: 'Current objective', title: MIS.active ? MIS.active.name : 'Objective', text: MIS.objText || 'Head here', meta: MIS.timeLeft > 0 ? ['Time left ' + mmss(MIS.timeLeft)] : [] };
    case 'shop': {
      const st = h.st, L = STORE_LOOK[st.kind], meta = [];
      if (st.wrecked || st.blown) meta.push('Destroyed. It will be rebuilt soon');
      else if (st.kind === 'gas' && GT < st.robbedUntil) meta.push('Robbed recently: the till is empty for now');
      const T = {
        gas: ['Gas station', 'Walk inside to buy carrots, drinks and scratchcards. Point a gun at the cashier to rob the till, but the alarm calls the police. Shoot the pumps and the whole forecourt goes up.'],
        gun: ['Gun shop', 'Weapons, ammo and body armour. Walk in to browse.'],
        jewel: ['Jewellery store', 'Smash the display cases and grab the jewels. The alarm goes straight to the police.'],
        disguise: ['Disguise shop', `A new outfit for ${$$m(DISGUISE_COST)} makes the police lose track of you.`],
        bank: ['Bank', `Keep the teller covered for ${BANK_ROB_TIME} seconds to empty the vault. Expect a big police response.`],
        dealer: ['Car dealership', 'Buy cars and bikes, delivered out front. Drive a stolen car onto the lot to sell it. They will not buy your own car or one they sold you.'],
        mech: ['Mechanic', `Stop in the bay for a ${$$m(MECH_COST)} repair and respray. If you are wanted, the police lose track of you too.`]
      }[st.kind] || ['Shop', 'Walk in to see what is for sale.'];
      return { k: T[0], title: st.kind === 'gas' ? 'Gas station' : (L && L.name) || st.name || T[0], text: T[1], meta };
    }
    case 'plane': {
      const pl = h.pl, D = pl.def || PLANE_DEFS[pl.type] || {}, mine = pl === G.plane;
      return { k: D.kind === 'heli' ? 'Helicopter' : D.kind === 'jet' ? 'Jet' : 'Plane', title: D.name ? D.name.charAt(0).toUpperCase() + D.name.slice(1) : 'Aircraft', text: BM_PLANE_TEXT[pl.type] || 'Walk up and climb in.', meta: [mine ? 'You are flying this one' : pl.wreck ? 'Wrecked' : `Walk up and ${enter} to climb in`] };
    }
    case 'cop': return { k: 'Police', title: 'Police car', text: h.v.ai.chasing ? 'Chasing you. Lose them, or pay a mechanic for a respray.' : 'On patrol.', meta: [] };
    case 'heli': return { k: 'Police', title: 'Police helicopter', text: 'It follows you with a spotlight. When it is overhead, press V to fire a homing missile.', meta: [Math.max(0, Math.round(HELI.hp)) + ' / ' + (PLANE_DEFS.heli.hp || 500) + ' health'] };
    case 'player': { const N = h.N, md = N.s ? N.s.md : N.md; return { k: 'Player', title: N.name, text: md === 'c' ? 'Driving' : md === 'p' ? 'Flying' : md === 'f' ? 'On foot' : 'In the city', meta: [] }; }
    case 'you': {
      const P = G.player, body = P && P.cfg && BODIES[P.cfg.body];
      return { k: 'You', title: 'You are here', text: G.plane ? 'Flying the ' + G.plane.def.name : G.onFoot ? 'On foot' : body ? 'Driving the ' + body.name : 'Driving', meta: [$$m(MIS.cash) + ' cash'] };
    }
    case 'school': return { k: 'School', title: h.sc.name.split(' ').map(w => /[.\d]/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(' '), text: 'Kids play in the fenced yard and go inside at the first sign of trouble. Weapons do not work on school grounds.', meta: [] };
    case 'airport': return { k: 'Airport', title: W.id === 'base' ? 'Airfield' : 'Airport', text: 'Open terminal with check-in, security and boarding gates. Light planes and jets are parked on the apron, ready to fly.', meta: [] };
    case 'stadium': return { k: 'Stadium', title: 'Perth Stadium', text: 'Drive in through the tunnels onto the oval. There is usually a game on.', meta: [] };
    case 'helipads': return { k: 'Fort Redrock', title: 'Helipads', text: 'Hornet attack and Mule transport helicopters. Land on a pad to rearm rockets. Taking one puts the base on alert.', meta: [] };
    case 'tanks': return { k: 'Fort Redrock', title: 'Tank park', text: 'Ironclad tanks, fuelled and ready. The turret follows where you look; Q or click fires the cannon. Stealing one puts the base on alert.', meta: [] };
    case 'construct': return { k: 'Landmark', title: 'Construction site', text: 'A half-built tower, a crane, a stack of steel pipes and the fuel tanks. The Chain Reaction job starts here.', meta: [] };
  }
  return null;
}
function bmShowInfo(h) {
  const I = bmInfo(h); if (!I) return;
  BM.sel = h; drawBigMap();
  $('#bmInfoK').textContent = I.k; $('#bmInfoT').textContent = I.title; $('#bmInfoP').textContent = I.text;
  const m = $('#bmInfoM'); m.textContent = ''; for (const s of I.meta) { const sp = document.createElement('span'); sp.textContent = s; m.append(sp); }
  const hi = $('#bmInfoH'); hi.textContent = I.hint || ''; hi.hidden = !I.hint;
  $('#bmInfo').hidden = false;
}
function bmHideInfo() { if (!BM.sel && $('#bmInfo').hidden) return; BM.sel = null; $('#bmInfo').hidden = true; drawBigMap(); }
