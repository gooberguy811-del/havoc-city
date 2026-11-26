// =====================================================================
//  MULTIPLAYER via the artifact `room` capability. Everyone on the same
//  map shares a named room. All traffic rides in presence (which every
//  viewer may set): ~15 Hz movement state plus a short rolling list of
//  recent events (explosions, collapses, shots, hits, kills). Traffic,
//  pedestrians, police and missions stay local to each player.
//  Consistency: every state carries the sender's clock, so remote players
//  are drawn ~120 ms in the past by interpolating between real snapshots
//  (no jitter from uneven delivery), and each player also publishes the
//  list of buildings that have fallen so late joiners see the same city.
// =====================================================================
const NET_DELAY = 120;
const NET = { wdDirty: true, wdT: 0, bumps: new Map(), on: false, room: null, R: null, user: null, me: null, players: new Map(), lobby: [], seq: 0, fx: [], fxDirty: false, lastSend: 0, carId: 0, cfg: null, cfgFor: null, cfgDirty: false, tracerT: 0, hits: new Map(), idle: false, num: 1, tags: null };
const NET_COLS = ['#ff5a8a', '#5ad1ff', '#ffd24a', '#8aff6a', '#c38aff', '#ff9a4a', '#4affc3', '#ff6b6b'];
const nr2 = v => Math.round(v * 100) / 100, nr1 = v => Math.round(v * 10) / 10;
const nnum = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : (d || 0));
const nhex = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
function netHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

function initNet() {
  NET.tags = $('#tags');
  NET.nick = String(store.get('havoc.nick', '') || '').slice(0, 16);
  const cl = window.claude;
  if (!cl || typeof cl.use !== 'function') { initOnlinePanel(); return; }   // a self-hosted copy plays online through PeerJS
  (async () => {
    let room = null; try { room = await cl.use('room'); } catch (e) { room = null; }
    if (!room) return;
    let user = null; try { user = await cl.use('user'); } catch (e) { user = null; }
    netStart(room, user);
  })();
}
function netStart(room, user) {
  NET.room = room; NET.user = user; NET.on = true; NET.lobby = []; NET.me = null;
  room.onPeers(ch => { if (NET.room !== room) return; NET.lobby = ch.peers; for (const p of ch.peers) if (p.sameTab) NET.me = p.peer; netChip(); }, () => { });
  netChip();
  if (W) netJoinMap();
}
function netStop() {
  if (NET.R) { const old = NET.R; NET.R = null; old.leave().catch(() => { }); }
  netClearPlayers(); NET.room = null; NET.on = false; NET.lobby = []; NET.me = null; netChip();
}
async function netJoinMap() {
  if (!NET.on || !W) return;
  const name = 'havoc-' + APP.worldId;
  NET.room.presence({ m: APP.worldId, pid: ME.pid, nm: NET.nick || null, menu: null }).catch(() => { });
  if (NET.R && NET.R.name === name) return;
  if (NET.R) { const old = NET.R; NET.R = null; old.leave().catch(() => { }); }
  netClearPlayers();
  const room = NET.room;
  try {
    const R = await room.join(name);
    if ('havoc-' + APP.worldId !== name || NET.room !== room) { R.leave().catch(() => { }); return; }
    NET.R = R; NET.lastSend = 0; NET.cfgFor = null;
    R.onPeers(netOnPeers, () => { NET.R = null; netClearPlayers(); netChip(); });
  } catch (e) { NET.R = null; }
  netChip();
}
function netClearPlayers() { for (const N of NET.players.values()) { netKillAvatar(N); if (N.tag) N.tag.remove(); if (N.chute) { scene.remove(N.chute); N.chute = null; } } NET.players.clear(); }
function netWorldLoaded() { for (const N of NET.players.values()) { N.av = null; N.avKind = null; N.wdSeen = null; } NET.wdDirty = true; netJoinMap(); }

// ---------- incoming ----------
function netOnPeers(ch) {
  for (const p of ch.left) { const N = NET.players.get(p.peer); if (N) { feed(`${N.name} left`, 'blue'); netKillAvatar(N); if (N.tag) N.tag.remove(); if (N.chute) scene.remove(N.chute); NET.players.delete(p.peer); } }
  for (const p of ch.peers) {
    if (p.sameTab) { NET.me = p.peer; continue; }
    const s = p.presence; if (!s || s.v !== 1) continue;
    let N = NET.players.get(p.peer);
    if (!N) {
      N = { peer: p.peer, by: p.by, color: NET_COLS[netHash(p.peer) % NET_COLS.length], name: 'Player ' + (++NET.num), s: null, rt: 0, x: 0, y: 0, z: 0, h: 0, av: null, avKind: null, ci: null, fresh: true, lastFx: netMaxSeq(s.fx), tag: null, chute: null, named: false };
      NET.players.set(p.peer, N); netMakeTag(N);
    }
    if (N.s !== s) { N.s = s; N.rt = performance.now(); if (okPid(s.pid)) { N.pid = s.pid; if (FRIENDS.list[s.pid] && N.name && !N.name.startsWith('Player ') && FRIENDS.list[s.pid].name !== N.name) { FRIENDS.list[s.pid].name = N.name; saveFriends(); } } netReadFx(N, s.fx); netPush(N, s); }
    if (typeof s.wd === 'string' && s.wd !== N.wdSeen) netApplyWD(N, s);
    if (!N.named) { N.named = true; netResolveName(N); }
    else if (!N.profileName && typeof s.nm === 'string') { const nm = s.nm.replace(/[^\p{L}\p{N} _.'-]/gu, '').slice(0, 16).trim(); if (nm && nm !== N.name) { N.name = nm; if (N.tag) N.tag.lastChild.textContent = nm; } }
  }
  netChip();
}
async function netResolveName(N) {
  let name = '';
  if (NET.user && N.by && typeof NET.user.profiles === 'function') { try { const ps = await NET.user.profiles([N.by]); name = (ps && ps[N.by] && ps[N.by].name) || ''; } catch (e) { name = ''; } }
  if (name) N.profileName = true;
  if (!name && N.s && typeof N.s.nm === 'string') name = N.s.nm.replace(/[^\p{L}\p{N} _.'-]/gu, '').slice(0, 16).trim();
  if (name) N.name = String(name).slice(0, 24);
  if (N.tag) N.tag.lastChild.textContent = N.name;
  feed(`${N.name} is in ${W ? W.name : 'the city'}`, 'blue');
}
// snapshot buffer: sender clock -> our clock offset tracks the fastest delivery seen
function netPush(N, s) {
  const now = performance.now(), ts = nnum(s.ts, NaN);
  if (!Number.isFinite(ts)) { N.buf = null; return; }
  const off = now - ts;
  if (N.off == null || off < N.off || off - N.off > 1500) N.off = off; else N.off += (off - N.off) * 0.02;
  if (!N.buf) N.buf = [];
  const last = N.buf[N.buf.length - 1];
  if (last && ts <= last.ts) { if (last.ts - ts > 5000) N.buf.length = 0; else return; }   // stale or duplicate (or the sender reloaded)
  N.buf.push({ ts, s }); if (N.buf.length > 24) N.buf.shift();
}
const NLERP = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'r', 'pt', 'pp', 'pr', 'T', 'ln', 'wh', 'sr', 'sp'], NLERPA = ['h', 'ay'];
function netSample(N, now) {
  const B = N.buf; if (!B || !B.length) return null;
  const rt = now - N.off - NET_DELAY;
  let i = B.length - 1; while (i > 0 && B[i].ts > rt) i--;
  const a = B[i], b = B[i + 1];
  if (b && b.s.md === a.s.md && a.ts <= rt) {
    const k = clamp((rt - a.ts) / Math.max(1, b.ts - a.ts), 0, 1), o = Object.assign({}, a.s);
    for (const f of NLERP) if (typeof a.s[f] === 'number' && typeof b.s[f] === 'number') o[f] = a.s[f] + (b.s[f] - a.s[f]) * k;
    for (const f of NLERPA) if (typeof a.s[f] === 'number' && typeof b.s[f] === 'number') o[f] = lerpA(a.s[f], b.s[f], k);
    return o;
  }
  // ran out of snapshots: carry on along the last known velocity for a moment
  const age = clamp((rt - a.ts) / 1000, 0, 0.3), o = Object.assign({}, a.s);
  o.x = nnum(a.s.x) + nnum(a.s.vx) * age; o.z = nnum(a.s.z) + nnum(a.s.vz) * age; if (a.s.md !== 'c') o.y = nnum(a.s.y) + nnum(a.s.vy) * age;
  return o;
}
// buildings that have fallen (and blown gas stations), as known by each player
function netWD() {
  const out = [];
  for (let i = 0; i < STR.list.length && out.length < 160; i++) if (STR.list[i].state) out.push(i.toString(36));
  SHOP.list.forEach((st, i) => { if (st.blown) out.push('g' + i); });
  return out.join(',');
}
function netApplyWD(N, s) {
  if (s.m !== APP.worldId || APP.mode !== 'game' || !W || !STR.list.length) return;
  N.wdSeen = s.wd;
  for (const tok of s.wd.split(',')) {
    if (!tok) continue;
    if (tok[0] === 'g') { const st = SHOP.list[parseInt(tok.slice(1), 10)]; if (st && !st.blown) try { netApplyFx(N, [0, 'g', parseInt(tok.slice(1), 10)]); } catch (e) { } continue; }
    const st = STR.list[parseInt(tok, 36)];
    if (st && !st.state) { st.netRemote = true; st.byPlayer = false; collapseStruct(st, (st.x0 + st.x1) / 2, (st.z0 + st.z1) / 2, true); }
  }
}
function netMaxSeq(fx) { let m = 0; if (Array.isArray(fx)) for (const e of fx) if (Array.isArray(e) && nnum(e[0]) > m) m = e[0]; return m; }
function netReadFx(N, fx) {
  if (!Array.isArray(fx)) return;
  const fresh = fx.filter(e => Array.isArray(e) && nnum(e[0]) > N.lastFx).sort((a, b) => a[0] - b[0]);
  for (const e of fresh) { N.lastFx = e[0]; if (e[1] === 'm') { const t = chatClean(e[2]); if (t) { chatAdd((isFriend(N) ? '★ ' : '') + N.name, N.color, t); chatBubble(N, t); } continue; } if (e[1] === 'fr' || e[1] === 'fa') { friendFx(N, e); continue; } if (N.s && N.s.m === APP.worldId && APP.mode === 'game' && W) { try { netApplyFx(N, e); } catch (err) { } } }
}
function netApplyFx(N, e) {
  const t = e[1];
  if (t === 'e') {
    const wasDown = G.down;
    const pug = !!e[7];   // another player's pug bomb: the same blast, and every building in reach comes down here too
    BOOM.pug = pug;
    try { explode(nnum(e[2]), nnum(e[3]), nnum(e[4]), clamp(nnum(e[5], 1), 0.2, 6), 'remote', null, !!e[6], true); } finally { BOOM.pug = false; }
    if (pug) pugLevel(nnum(e[2]), nnum(e[4]), true);
    if (!wasDown && G.down) netKilledBy(N, 'blew you up');
  } else if (t === 'c') {
    const s = STR.list[nnum(e[2], -1)];
    if (s && !s.state) { s.netRemote = true; s.byPlayer = false; collapseStruct(s, (s.x0 + s.x1) / 2 + rand(-5, 5), (s.z0 + s.z1) / 2 + rand(-5, 5)); }
  } else if (t === 'g') {
    const st = SHOP.list[nnum(e[2], -1)];
    if (st && !st.blown) {
      st.blown = true;
      for (const q of W.props) if (q.type === 'pump' && q.st === 0 && Math.hypot(st.gx - q.x, st.gz - q.z) < 16) q.st = 3;
      for (let k = 0; k < 9; k++) { const a = Math.random() * TAU, d = rand(2, 12); addFire(st.gx + Math.cos(a) * d, st.gz + Math.sin(a) * d, rand(1.6, 3.2), rand(30, 55)); }
      NET.wdDirty = true;
    }
  } else if (t === 't') {
    const ox = nnum(e[2]), oy = nnum(e[3]), oz = nnum(e[4]), ex = nnum(e[5]), ey = nnum(e[6]), ez = nnum(e[7]);
    tracer(ox, oy, oz, ex, ey, ez, TRACE_COL);
    G.flashes.push({ x: ox, y: oy, z: oz, t: 0.06, s: 2.6 });
    const w = WEAPONS[clamp(nnum(e[8], 1) | 0, 1, WEAPONS.length - 1)];
    SFX.gun(w.id || 'pistol', clamp(1 - Math.hypot(ox - camera.position.x, oz - camera.position.z) / 140, 0.05, 0.8));
  } else if (t === 'h') {
    if (e[2] === NET.me && NET.me) netTakeHit(N, nnum(e[3]), e.length > 5 ? [nnum(e[4]), nnum(e[5]), nnum(e[6])] : null);
  } else if (t === 'b') {
    if (e[2] === NET.me && NET.me) netTakeBump(N, clamp(nnum(e[3]), -40, 40), clamp(nnum(e[4]), -40, 40));
  } else if (t === 'k') {
    if (e[2] === NET.me && NET.me) feed(`You took out ${N.name}`, 'green');
    else { const K = NET.players.get(e[2]); feed(`${K ? K.name : 'Someone'} took out ${N.name}`); }
  }
}
function netTakeHit(N, dmg, knock) {
  dmg = clamp(dmg, 0, 150);
  if (settings.pvp === 'off' || G.down || dmg <= 0 || noFriendHurt(N)) return;
  const wasDown = G.down;
  if (knock && G.onFoot && HERO.p && !HERO.p.rag) { toRagdoll(HERO.p, clamp(knock[0], -40, 40), clamp(knock[1], -40, 40), clamp(knock[2], 0, 30), null); SFX.thud(knock[2], HERO.p.x, HERO.p.z); }
  if (G.plane) damagePlane(G.plane, dmg * 0.6, null);
  else if (G.onFoot && HERO.p) { HERO.hurtT = 0; heroDamage(dmg, 'pvp'); const p = HERO.p; if (settings.gore !== 'off') bloodBurst(p.x, p.y + 1.2, p.z, 0, 0, 4, 0.5); }
  else if (G.player) { damageVehicle(G.player, dmg * 0.5, null); sparks(G.player.x, G.player.y + 0.8, G.player.z, 2); }
  G.shake = Math.max(G.shake, 0.15);
  if (!wasDown && G.down) netKilledBy(N, 'took you out');
}
// another player's car hit ours: take the shove they computed
function netTakeBump(N, dvx, dvz) {
  const v = G.player; if (!v || G.down || settings.pvp === 'off' || noFriendHurt(N)) return;
  const mag = Math.hypot(dvx, dvz); if (mag < 0.5) return;
  v.vx += dvx; v.vz += dvz; v.av += rand(-0.6, 0.6) * Math.min(1, mag / 10);
  const wasDown = G.down;
  if (mag > 2.5) vehicleImpact(v, mag, v.x - dvx / mag, v.y + 0.6, v.z - dvz / mag, null);
  if (mag > 7) rollFromHit(v, dvx, dvz);
  if (!wasDown && G.down) netKilledBy(N, 'wrecked you');
}
function netBump(N, dvx, dvz) {
  if (!N || settings.pvp === 'off' || noFriendHurt(N)) return;
  const t = performance.now(), last = NET.bumps.get(N.peer) || 0; if (t - last < 200) return; NET.bumps.set(N.peer, t);
  netFx(['b', N.peer, nr1(dvx), nr1(dvz)]);
}
function netRunOver(N, vx, vz, ps) {
  if (!N || settings.pvp === 'off' || ps < 3 || noFriendHurt(N)) return;
  const t = performance.now(), last = NET.bumps.get('r' + N.peer) || 0; if (t - last < 600) return; NET.bumps.set('r' + N.peer, t);
  netFx(['h', N.peer, nr1(Math.min(120, ps * 3.6)), nr1(vx), nr1(vz), nr1(ps)]);
}
function netKilledBy(N, verb) { const b = $('#bannerSub'); if (b) b.textContent = `${N.name} ${verb}`; netFx(['k', N.peer]); }

// ---------- outgoing ----------
function netFx(e) {
  if (!NET.R) return;
  e.unshift(++NET.seq); NET.fx.push({ e, t: performance.now() }); NET.fxDirty = true;
}
function netHit(N, dmg) { if (settings.pvp === 'off' || !N || noFriendHurt(N)) return; NET.hits.set(N.peer, (NET.hits.get(N.peer) || 0) + dmg); }
function netShot(ox, oy, oz, ex, ey, ez, w) {
  if (!NET.R || !NET.players.size) return; const t = performance.now(); if (t - NET.tracerT < 70) return; NET.tracerT = t;
  netFx(['t', nr2(ox), nr2(oy), nr2(oz), nr2(ex), nr2(ey), nr2(ez), WEAPONS.indexOf(w)]);
}
function netPackCfg(c) { const o = {}; for (const k in CAR_DEF) if (c[k] !== undefined) o[k] = c[k]; return o; }
function netCfg(c) {
  const o = Object.assign({}, CAR_DEF); if (!c || typeof c !== 'object') return o;
  if (typeof c.body === 'string' && BODIES[c.body]) o.body = c.body;
  for (const k of ['paint', 'stripe', 'rimColor']) o[k] = nhex(c[k], o[k]);
  if (c.neon === 'off' || nhex(c.neon)) o.neon = c.neon;
  if (['gloss', 'metallic', 'matte', 'chrome'].includes(c.finish)) o.finish = c.finish;
  if (typeof c.rim === 'string' && RIMS[c.rim]) o.rim = c.rim;
  if (['s', 'm', 'l'].includes(c.wheel)) o.wheel = c.wheel;
  if (['none', 'lip', 'wing'].includes(c.spoiler)) o.spoiler = c.spoiler;
  if (['low', 'stock', 'lifted'].includes(c.height)) o.height = c.height;
  if ([0, 1, 2].includes(c.tint)) o.tint = c.tint;
  if (typeof c.stripes === 'boolean') o.stripes = c.stripes;
  if (typeof c.plate === 'string') o.plate = c.plate.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 8).toUpperCase() || 'HAVOC';
  return o;
}
function netState() {
  const base = { v: 1, m: APP.worldId, ts: Math.round(performance.now()), pid: ME.pid }; if (NET.nick) base.nm = NET.nick;
  if (G.plane) {
    const pl = G.plane;
    return Object.assign(base, { md: pl.wreck || G.down ? 'd' : 'p', x: nr2(pl.x), y: nr2(pl.y), z: nr2(pl.z), h: nr2(pl.yaw), vx: nr1(pl.V.x), vy: nr1(pl.V.y), vz: nr1(pl.V.z), pp: nr2(pl.pitch), pr: nr2(pl.roll), T: nr2(pl.T), gnd: pl.ground ? 1 : 0, dead: pl.dead ? 1 : 0, pk: pl.type, pc: pl.spot.col, pt2: pl.spot.trim });
  }
  if (G.onFoot && HERO.p) {
    const p = HERO.p, F = HERO.focus, aim = ARMS.cur && gunsOn() && (ARMS.trigger || ARMS.mouse.down || SHOP.holdup || GT - ARMS.lastShot < 1.6);
    return Object.assign(base, { md: G.down ? 'd' : 'f', x: nr2(F.x), y: nr2(p.rag ? F.y : p.y), z: nr2(F.z), h: nr2(p.h), vx: nr1(F.vx), vy: nr1(HERO.vy || 0), vz: nr1(F.vz), sp: nr1(p.sp), rag: p.rag ? 1 : 0, ch: HERO.chute ? (HERO.chute.free ? 1 : 2) : 0, aim: aim ? 1 : 0, ay: nr2(ARMS.aimYaw || 0) });
  }
  if (G.player) {
    const v = G.player; if (!v.netId) v.netId = ++NET.carId;
    if (NET.cfgFor !== v) { NET.cfgFor = v; NET.cfg = netPackCfg(v.cfg); NET.cfgDirty = true; }
    return Object.assign(base, { md: G.down ? 'd' : 'c', x: nr2(v.x), y: nr2(v.y), z: nr2(v.z), h: nr2(v.h), vx: nr1(v.vx), vy: nr1(v.vy || 0), vz: nr1(v.vz), r: nr2(v.roll || 0), pt: nr2(v.pit || 0), air: v.onGround ? 0 : 1, tb: v.tumble ? 1 : 0, fl: v.flipped ? 1 : 0, hp: Math.round(clamp(v.health / v.maxHp, 0, 1) * 100), wr: v.wrecked ? 1 : 0, ci: v.netId, pol: v.police ? 1 : 0, nb: v.boosting ? 1 : 0, jt: v.jetOn ? 1 : undefined, sr: nr2(v.input.steer || 0), ln: v.bike ? nr2(v.bikeLean) : undefined, wh: v.bike && v.wh > 0.02 ? nr2(v.wh) : undefined });
  }
  return Object.assign(base, { md: 'x' });
}
// the room only accepts plain JSON: no undefined, NaN or Infinity anywhere, or the whole update is refused.
// A top-level null also clears a field left over from another vehicle (a bike's lean once you're back in a car)
function netClean(o) {
  for (const k in o) {
    const v = o[k];
    if (v === undefined) o[k] = null;
    else if (typeof v === 'number') { if (!Number.isFinite(v)) o[k] = 0; }
    else if (Array.isArray(v)) o[k] = v.map(e => Array.isArray(e) ? e.map(x => typeof x === 'number' ? (Number.isFinite(x) ? x : 0) : x === undefined ? null : x) : typeof e === 'number' && !Number.isFinite(e) ? 0 : e === undefined ? null : e);
    else if (v && typeof v === 'object') { const c = {}; for (const j in v) if (v[j] !== undefined && !(typeof v[j] === 'number' && !Number.isFinite(v[j]))) c[j] = v[j]; o[k] = c; }
  }
  return o;
}
function netSend() {
  if (!NET.R) return;
  const t = performance.now(); if (t - NET.lastSend < 66) return; NET.lastSend = t;
  for (const [peer, d] of NET.hits) netFx(['h', peer, nr1(d)]);
  NET.hits.clear();
  while (NET.fx.length && t - NET.fx[0].t > (NET.fx[0].e[1] === 'm' ? 6000 : 4000)) { NET.fx.shift(); NET.fxDirty = true; }
  while (NET.fx.length > 14) { let i = NET.fx.findIndex(f => f.e[1] === 't'); if (i < 0 || i >= NET.fx.length - 1) i = NET.fx.findIndex(f => f.e[1] !== 'm'); NET.fx.splice(i >= 0 ? i : 0, 1); NET.fxDirty = true; }
  const s = APP.mode === 'game' ? netState() : { v: 1, m: APP.worldId, md: 'x', ts: Math.round(t), pid: ME.pid };
  if ((NET.wdDirty && t - NET.wdT > 400) || t - NET.wdT > 5000) { if (APP.mode === 'game' && W && STR.list) { const wd = netWD(); if (wd !== NET.wdLast || NET.wdDirty) { s.wd = wd; NET.wdLast = wd; } } NET.wdDirty = false; NET.wdT = t; }
  if (NET.fxDirty) { s.fx = NET.fx.map(f => f.e); NET.fxDirty = false; }
  if (NET.cfgDirty) { s.cfg = NET.cfg; NET.cfgDirty = false; }
  netClean(s);
  NET.R.presence(s).catch(e => { if (!NET.presErr) { NET.presErr = true; console.warn('room presence refused', e && (e.code + ': ' + e.message)); } });
}
// keep presence fresh from the menu and pause screen too
setInterval(() => { if (NET.R && (APP.mode !== 'game' || APP.paused || BM.open)) { NET.lastSend = 0; netSend(); } }, 1000);

// ---------- remote avatars ----------
function netAvAlive(N) {
  const a = N.av; if (!a) return false;
  if (N.avKind === 'f') return a.active && a.remote === N;
  if (N.avKind === 'c') return VEH.list.includes(a);
  if (N.avKind === 'p') return PLANES.list.includes(a);
  return false;
}
function netKillAvatar(N) {
  const a = N.av;
  if (a) {
    if (N.avKind === 'f') { if (a.active && a.remote === N) { hidePed(a); a.active = false; a.rag = null; } a.remote = null; }
    else if (N.avKind === 'c') { if (VEH.list.includes(a)) a.remove(); }
    else if (N.avKind === 'p') { if (PLANES.list.includes(a)) a.remove(); }
  }
  N.av = null; N.avKind = null; N.ci = null; if (N.chute) N.chute.visible = false;
}
function netSetAvatar(N, kind, s) {
  const ci = kind === 'c' ? nnum(s.ci) : kind === 'p' ? String(s.pk) : 0;
  if (N.avKind === kind && N.ci === ci && (!kind || netAvAlive(N))) return;
  netKillAvatar(N);
  if (!kind) return;
  const x = nnum(s.x), z = nnum(s.z), h = nnum(s.h);
  if (kind === 'f') {
    const p = spawnPedAt(x, z, 'civ'); if (!p) return;
    p.remote = N; p.state = 'idle'; p.h = h; p.scale = 1.02;
    pedColors(p, { skin: SKIN[netHash(N.peer) % SKIN.length], hair: '#1b1410', shirt: N.color, pants: '#23283a' });
    N.av = p;
  } else if (kind === 'c') {
    const v = new Vehicle(netCfg(s.cfg), 'remote', { police: !!s.pol }); v.remote = N; v.place(x, z, h, 0); VEH.list.push(v); N.av = v;
    if (v.bike) setRiderLook(v.model, { shirt: N.color, pants: '#23283a', skin: SKIN[netHash(N.peer) % SKIN.length], helmet: N.color });
  } else if (kind === 'p') {
    const pl = new Plane({ type: PLANE_DEFS[s.pk] ? s.pk : 'sparrow', x, z, yaw: h, col: nhex(s.pc, '#f4f4f2'), trim: nhex(s.pt2, '#c8352b') });
    pl.remote = N; pl.ground = !!s.gnd; PLANES.list.push(pl); N.av = pl;
  }
  N.avKind = kind; N.ci = ci; N.fresh = true;
}
function netDriveAvatar(N, s, dt) {
  const a = N.av;
  if (N.avKind === 'f') {
    const p = a;
    if (s.rag && !p.rag) { const vx = nnum(s.vx), vz = nnum(s.vz); toRagdoll(p, vx, vz, Math.hypot(vx, vz) + 2, null); N.ragT = GT; }
    if (p.rag) { if (!s.rag && GT - (N.ragT || 0) > 0.6) { p.rag = null; N.fresh = true; } else return; }
    p.x = N.x; p.y = N.y; p.z = N.z; p.h = N.h; p.sp = nnum(s.sp); p.running = Math.abs(p.sp) > 4; p.state = p.running ? 'flee' : 'walk';
    if (!s.ch) p.phase += Math.abs(p.sp) * dt * TAU / (p.running ? 2.4 : 1.4);
    N.aim = !!s.aim; N.ay = nnum(s.ay); N.chs = nnum(s.ch);
    if (N.chs === 2) { if (!N.chute) N.chute = buildChute(N.color); N.chute.visible = true; chuteFade(N.chute, 1); N.chute.position.set(p.x, p.y, p.z); N.chute.rotation.set(0, p.h, 0); N.chute.scale.set(1, 1, 1); }
    else if (N.chute) N.chute.visible = false;
  } else if (N.avKind === 'c') {
    const v = a;
    v.x = N.x; v.y = N.y; v.z = N.z; v.h = N.h; v.vx = nnum(s.vx); v.vz = nnum(s.vz); v.vy = nnum(s.vy);
    v.vf = v.vx * Math.sin(v.h) + v.vz * Math.cos(v.h); v.av = 0;
    v.roll = nnum(s.r); v.pit = nnum(s.pt); v.onGround = !s.air; v.netLean = clamp(nnum(s.ln), -0.9, 0.9); v.netWh = clamp(nnum(s.wh), 0, 0.5); v.tumble = !!s.tb; v.flipped = !!s.fl; v.boosting = !!s.nb; v.jetOn = !!s.jt; v.input.steer = clamp(nnum(s.sr), -1, 1);
    v.health = clamp(nnum(s.hp, 100), 0, 100) / 100 * v.maxHp;
    if (s.wr && !v.wrecked) { v.wrecked = true; v.burnT = 22; burnModel(v.model); }
    v.obj.visible = Math.hypot(v.x - camera.position.x, v.z - camera.position.z) < QUALITY[settings.quality].draw;
  } else if (N.avKind === 'p') {
    const pl = a;
    pl.x = N.x; pl.y = N.y; pl.z = N.z; pl.yaw = N.h; pl.pitch = nnum(s.pp); pl.roll = nnum(s.pr); pl.V.set(nnum(s.vx), nnum(s.vy), nnum(s.vz)); pl.T = clamp(nnum(s.T), 0, 1); pl.ground = !!s.gnd; pl.dead = !!s.dead;
  }
}
// sky-diving / parachute / aiming poses for remote people
function netPose(p) {
  const N = p.remote; if (!N) return;
  const P = p.pts, c = Math.cos(p.h), sn = Math.sin(p.h), s = p.scale;
  if (N.chs === 1) skydivePose(P, p.x, p.y, p.z, p.h, s, 0);
  else if (N.chs === 2) {
    for (const [sh, el, hd, sx] of [[2, 4, 6, 1], [3, 5, 7, -1]]) {
      const X = P[sh * 3], Y = P[sh * 3 + 1], Z = P[sh * 3 + 2], free = N.chs === 1;
      const ex = sx * (free ? 0.28 : 0.12) * s, ey = (free ? 0.08 : 0.26) * s, hx = sx * (free ? 0.52 : 0.16) * s, hy = (free ? 0.22 : 0.54) * s;
      P[el * 3] = X + ex * c; P[el * 3 + 1] = Y + ey; P[el * 3 + 2] = Z - ex * sn; P[hd * 3] = X + hx * c; P[hd * 3 + 1] = Y + hy; P[hd * 3 + 2] = Z - hx * sn;
    }
  } else if (N.aim) aimPose(P, N.ay, false, false);
}
function netUpdate(dt) {
  if (!NET.on) return;
  netSend();
  if (!NET.players.size) return;
  const now = performance.now();
  for (const N of NET.players.values()) {
    const s = N.s;
    if (!s || s.m !== APP.worldId || s.md === 'x') { if (N.av) netKillAvatar(N); continue; }
    const si = netSample(N, now) || s;   // where they were NET_DELAY ago, interpolated between real snapshots
    const kind = si.md === 'd' ? N.avKind : (['f', 'c', 'p'].includes(si.md) ? si.md : null);
    netSetAvatar(N, kind, si);
    if (!N.av) continue;
    let tx, ty, tz;
    if (N.buf && N.buf.length) { tx = nnum(si.x); ty = nnum(si.y); tz = nnum(si.z); }
    else { const age = Math.min(0.35, (now - N.rt) / 1000); tx = nnum(s.x) + nnum(s.vx) * age; ty = nnum(s.y) + nnum(s.vy) * age * (N.avKind === 'c' ? 0 : 1); tz = nnum(s.z) + nnum(s.vz) * age; }
    if (N.fresh || Math.hypot(tx - N.x, tz - N.z) > 30) { N.x = tx; N.y = ty; N.z = tz; N.h = nnum(si.h); N.fresh = false; }
    else if (N.buf && N.buf.length) { const k = damp(30, dt); N.x = lerp(N.x, tx, k); N.y = lerp(N.y, ty, k); N.z = lerp(N.z, tz, k); N.h = lerpA(N.h, nnum(si.h), damp(28, dt)); }
    else { const k = damp(12, dt); N.x = lerp(N.x, tx, k); N.y = lerp(N.y, ty, k); N.z = lerp(N.z, tz, k); N.h = lerpA(N.h, nnum(s.h), damp(10, dt)); }
    netDriveAvatar(N, si, dt);
  }
  netTags();
}
// ---------- name tags, HUD chip, map markers ----------
function netMakeTag(N) {
  if (!NET.tags) return;
  const d = document.createElement('div'); d.className = 'ntag'; d.hidden = true;
  const i = document.createElement('i'); i.style.background = N.color; const sp = document.createElement('span'); sp.textContent = N.name;
  d.append(i, sp); NET.tags.append(d); N.tag = d;
}
function netTags() {
  const vw = VW || window.innerWidth, vh = VH || window.innerHeight;
  for (const N of NET.players.values()) {
    const d = N.tag; if (!d) continue;
    const fr = isFriend(N); if (N.frTag !== fr) { N.frTag = fr; d.classList.toggle('friend', fr); }
    const show = !!N.av && APP.mode === 'game';
    let vis = false;
    if (show) {
      const off = N.avKind === 'p' ? 4.6 : N.avKind === 'c' ? 2.5 : 2.35;
      _v1.set(N.x, N.y + off, N.z); const dist = _v1.distanceTo(camera.position);
      if (dist < 420) { _v1.project(camera); if (_v1.z < 1 && Math.abs(_v1.x) < 1.1 && Math.abs(_v1.y) < 1.1) { vis = true; d.style.transform = `translate(${((_v1.x + 1) / 2 * vw).toFixed(1)}px,${((1 - _v1.y) / 2 * vh).toFixed(1)}px) translate(-50%,-100%)`; d.style.opacity = String(clamp(1.3 - dist / 380, 0.35, 1)); } }
    }
    if (d.hidden === vis) d.hidden = !vis;
  }
}
function renderMapCounts() {
  const by = {};
  if (NET.on) for (const p of NET.lobby) { const s = p.presence; if (p.sameTab || !s || typeof s.m !== 'string' || s.menu) continue; (by[s.m] = by[s.m] || []).push(s); }
  for (const card of document.querySelectorAll('.mapcard')) {
    let em = card.querySelector('.mcount'); if (!em) { em = document.createElement('em'); em.className = 'mcount'; card.querySelector('div').append(em); }
    const L = by[card.dataset.map] || [];
    if (!L.length) { em.hidden = true; continue; }
    const names = L.map(s => (okPid(s.pid) && FRIENDS.list[s.pid] ? '\u2605 ' + FRIENDS.list[s.pid].name : chatClean(s.nm).slice(0, 16) || 'Player'));
    em.hidden = false; em.textContent = L.length + ' playing: ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) : '');
  }
}
function netMenuPresence() { if (NET.room && NET.on) NET.room.presence({ menu: true }).catch(() => { }); renderMapCounts(); }
function netChip() {
  renderMapCounts();
  const el2 = $('#netchip'); if (!el2) return;
  if (!NET.on) { el2.hidden = true; return; }
  const others = NET.lobby.filter(p => !p.sameTab && p.presence && typeof p.presence.m === 'string');
  let here = 0; for (const N of NET.players.values()) if (N.s && N.s.m === APP.worldId && N.s.md !== 'x') here++;
  const away = Math.max(0, others.length - here);
  el2.hidden = false;
  el2.textContent = !others.length && !here ? 'Online · just you' : here ? `${here} here${away ? ' · ' + away + ' elsewhere' : ''}` : `${away} online elsewhere`;
  el2.classList.toggle('live', here > 0);
}
function netMarkers(g, toS, size, rot) {
  for (const N of NET.players.values()) {
    if (!N.av) continue;
    const [sx, sy] = toS(N.x, N.z, rot ? 7 : undefined), k = size;
    g.save(); g.translate(sx, sy); g.rotate(rot ? -wrapA(N.h - CAM.h) : Math.PI - N.h);
    g.fillStyle = N.color; g.strokeStyle = '#0c0e13'; g.lineWidth = Math.max(1.5, k * 0.3);
    g.beginPath(); g.moveTo(0, -k * 1.3); g.lineTo(k, k); g.lineTo(0, k * 0.45); g.lineTo(-k, k); g.closePath(); g.fill(); g.stroke();
    if (isFriend(N)) { g.strokeStyle = '#47d18c'; g.lineWidth = Math.max(1.5, k * 0.25); g.beginPath(); g.arc(0, 0, k * 1.9, 0, TAU); g.stroke(); }
    g.restore();
  }
}
// ---------- chat ----------
const CHAT = { open: false, lastSend: 0, log: [], quick: ['gg', 'Follow me!', 'Race?', 'Wait up', 'lol', 'Help!', 'Nice one', 'Meet at the airport'] };
function chatClean(t) { return String(t || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120); }
function chatAdd(name, color, text, mine) {
  const box = $('#chatLog'); if (!box || !text) return;
  const row = document.createElement('div'); row.className = 'chatRow' + (mine ? ' mine' : '');
  const n = document.createElement('b'); n.textContent = name; n.style.color = color || '#ffb21e';
  const t = document.createElement('span'); t.textContent = text;
  row.append(n, t); box.append(row);
  while (box.children.length > 8) box.firstChild.remove();
  row._t = performance.now(); CHAT.log.push(row);
  chatUI();
  if (!mine) SFX.ping();
}
function chatSend(text) {
  text = chatClean(text); if (!text || !NET.R) return false;
  const t = performance.now(); if (t - CHAT.lastSend < 1100) { feed('Slow down a little'); return false; }
  CHAT.lastSend = t;
  netFx(['m', text]);
  chatAdd(NET.nick || 'You', '#ffffff', text, true);
  NET.lastSend = 0;   // send it straight away
  return true;
}
function openChat() {
  if (!NET.R || APP.mode !== 'game') return;
  for (const k in KEYS) KEYS[k] = false; for (const k in TOUCH) TOUCH[k] = false;
  CHAT.open = true; chatUI();
  const i = $('#chatIn'); if (i) { i.value = ''; setTimeout(() => i.focus(), 0); }
}
function closeChat() { CHAT.open = false; const i = $('#chatIn'); if (i) i.blur(); chatUI(); }
function chatUI() {
  const wrap = $('#chat'); if (!wrap) return;
  const online = !!NET.R && APP.mode === 'game';
  wrap.hidden = !online;
  $('#chatForm').hidden = !CHAT.open; $('#chatQuick').hidden = !CHAT.open; $('#chatBtn').hidden = CHAT.open;
  wrap.classList.toggle('open', CHAT.open);
}
function initChat() {
  const f = $('#chatForm'); if (!f) return;
  f.onsubmit = e => { e.preventDefault(); const i = $('#chatIn'); if (chatSend(i.value)) i.value = ''; closeChat(); };
  $('#chatIn').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeChat(); } e.stopPropagation(); });
  $('#chatBtn').onclick = () => openChat();
  const q = $('#chatQuick'); q.innerHTML = '';
  for (const m of CHAT.quick) { const b = document.createElement('button'); b.type = 'button'; b.textContent = m; b.onclick = () => { chatSend(m); closeChat(); }; q.append(b); }
  setInterval(() => { const now = performance.now(); for (const r of CHAT.log) r.classList.toggle('old', !CHAT.open && now - r._t > 14000); CHAT.log = CHAT.log.filter(r => r.isConnected); chatUI(); }, 1000);
}
// a speech bubble over the other player's name tag
function chatBubble(N, text) {
  if (!N.tag) return;
  let b = N.tag.querySelector('.bubble'); if (!b) { b = document.createElement('em'); b.className = 'bubble'; N.tag.prepend(b); }
  b.textContent = text; b.hidden = false; clearTimeout(N.bubbleT); N.bubbleT = setTimeout(() => { b.hidden = true; }, 6000);
}
// ---------- friends ----------
// a stable id per player (kept in this browser), a saved friends list, requests over the event channel
const ME = { pid: (() => { let p = String(store.get('havoc.pid', '') || ''); if (!/^[a-z0-9]{10}$/.test(p)) { p = ''; for (let i = 0; i < 10; i++) p += 'abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random() * 36) | 0]; store.set('havoc.pid', p); } return p; })() };
const FRIENDS = { list: store.get('havoc.friends', {}) || {}, sent: {}, pending: [], seen: new Set(), goto: null };
const okPid = p => typeof p === 'string' && /^[a-z0-9]{10}$/.test(p);
const isFriend = N => !!(N && okPid(N.pid) && FRIENDS.list[N.pid]);
const noFriendHurt = N => isFriend(N) && settings.ffriends !== 'on';
function saveFriends() { store.set('havoc.friends', FRIENDS.list); }
const MAP_NAMES = { base: 'Fort Redrock', neon: 'Neon Heights', sand: 'Sandport', perth: 'Perth', nyc: 'New York', test: 'Testing Zone' };
function friendRequest(N) {
  if (!N || !okPid(N.pid) || !NET.R) return;
  if (FRIENDS.list[N.pid]) { feed(`${N.name} is already your friend`); return; }
  FRIENDS.sent[N.pid] = true; netFx(['fr', N.peer, ME.pid, NET.nick || '']); NET.lastSend = 0;
  feed(`Friend request sent to ${N.name}`, 'blue'); renderFriends();
}
function friendFx(N, e) {
  if (e[2] !== NET.me || !NET.me || !okPid(e[3])) return;
  const name = chatClean(e[4]).slice(0, 16) || N.name;
  if (e[1] === 'fr') {
    if (FRIENDS.list[e[3]] || FRIENDS.sent[e[3]]) { friendAdd(e[3], name); netFx(['fa', N.peer, ME.pid, NET.nick || '']); return; }
    if (!FRIENDS.pending.some(q => q.pid === e[3])) FRIENDS.pending.push({ pid: e[3], name, peer: N.peer });
    SFX.ding(); friendToast(); renderFriends();
  } else if (e[1] === 'fa') {
    friendAdd(e[3], name); delete FRIENDS.sent[e[3]];
    feed(`★ ${name} is now your friend`, 'green'); SFX.ding();
  }
}
function friendAdd(pid, name) { FRIENDS.list[pid] = { name, since: Date.now() }; saveFriends(); renderFriends(); }
function friendRemove(pid) { delete FRIENDS.list[pid]; saveFriends(); renderFriends(); }
function friendToast() {
  const t = $('#frReq'); if (!t) return;
  const q = FRIENDS.pending[0];
  t.hidden = !q; const b = $('#friendsBtnBadge'), pb = $('#pFriends');
  if (pb) pb.textContent = FRIENDS.pending.length ? `Friends (${FRIENDS.pending.length} new)` : 'Friends';
  if (b) b.hidden = !FRIENDS.pending.length;
  if (!q) return;
  $('#frReqText').textContent = `${q.name} wants to be friends`;
}
function friendAnswer(yes) {
  const q = FRIENDS.pending.shift(); if (!q) return;
  if (yes) { friendAdd(q.pid, q.name); const N = [...NET.players.values()].find(n => n.pid === q.pid); netFx(['fa', N ? N.peer : q.peer, ME.pid, NET.nick || '']); NET.lastSend = 0; feed(`★ ${q.name} is now your friend`, 'green'); }
  friendToast(); renderFriends();
}
// where are my friends right now? (this city, another city in the lobby, or not around)
function friendWhere(pid) {
  for (const N of NET.players.values()) if (N.pid === pid && N.s && N.s.md !== 'x') return { here: true, N, map: N.s.m };
  for (const p of NET.lobby) { const s = p.presence; if (!p.sameTab && s && s.pid === pid) return { here: false, map: s.m }; }
  return null;
}
function goToFriend(pid) {
  const w = friendWhere(pid); if (!w) { feed('That friend is not online right now'); return; }
  closeFriends();
  if (w.here && APP.mode === 'game' && w.N.av) { friendTeleport(w.N); return; }
  if (!MAP_NAMES[w.map]) { feed('Your friend is still in the menu'); return; }
  FRIENDS.goto = pid; settings.map = w.map; saveSettings();
  if (APP.mode === 'game') { togglePause(false); if (G.plane) { feed('Land the plane first', 'red'); FRIENDS.goto = null; return; } }
  startGame();
}
function friendTeleport(N) {
  if (G.plane) { feed('Land the plane first', 'red'); return; }
  if (APP.paused) togglePause(false);
  const nl = nearestLane(N.x + 6, N.z + 6), x = nl ? nl.px : N.x + 4, z = nl ? nl.pz : N.z + 4, e = nl && nl.e, A = e && W.nodes[e.a], B = e && W.nodes[e.b], h = e ? Math.atan2(B.x - A.x, B.z - A.z) : 0;
  if (G.onFoot && HERO.p) { const p = HERO.p; p.rag = null; p.x = x; p.z = z; p.y = heightAt(x, z); p.h = h; HERO.fly = false; HERO.web = null; HERO.chute = null; updateFocus(); }
  else if (G.player) { G.player.place(x, z, h, 0); }
  CAM.h = h; resetCamera(); feed(`Joined ${N.name}`, 'green');
}
// ---------- friends panel ----------
function openFriends() { const m = $('#friends'); if (!m) return; renderFriends(); m.hidden = false; FRIENDS.open = true; }
function closeFriends() { const m = $('#friends'); if (m) m.hidden = true; FRIENDS.open = false; }
function renderFriends() {
  const list = $('#frList'), here = $('#frHere'), note = $('#frNote'); if (!list) return;
  list.innerHTML = ''; here.innerHTML = '';
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const btn = (txt, fn, cls) => { const b = mk('button', 'btn small' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.onclick = fn; return b; };
  // incoming requests
  for (const q of FRIENDS.pending) { const r = mk('div', 'frRow req'); r.append(mk('b', '', q.name), mk('span', 'frStat', 'wants to be friends'), btn('Accept', () => { FRIENDS.pending.unshift(FRIENDS.pending.splice(FRIENDS.pending.indexOf(q), 1)[0]); friendAnswer(true); }, 'primary'), btn('Decline', () => { FRIENDS.pending.splice(FRIENDS.pending.indexOf(q), 1); friendToast(); renderFriends(); })); list.append(r); }
  const ids = Object.keys(FRIENDS.list).sort((a, b) => (friendWhere(b) ? 1 : 0) - (friendWhere(a) ? 1 : 0) || FRIENDS.list[a].name.localeCompare(FRIENDS.list[b].name));
  for (const pid of ids) {
    const f = FRIENDS.list[pid], w = friendWhere(pid), r = mk('div', 'frRow');
    const dot = mk('i', 'frDot' + (w ? ' on' : ''));
    const stat = !w ? 'Offline' : w.here ? (w.map === APP.worldId ? 'Here with you' : 'Online') : MAP_NAMES[w.map] ? `Online · in ${MAP_NAMES[w.map]}` : 'Online · in the menu';
    r.append(dot, mk('b', '', '★ ' + f.name), mk('span', 'frStat', stat));
    if (w && (w.here || MAP_NAMES[w.map])) r.append(btn(w.here && APP.mode === 'game' ? 'Go to' : 'Join', () => goToFriend(pid), 'primary'));
    r.append(btn('✕', () => { if (r.dataset.sure) friendRemove(pid); else { r.dataset.sure = 1; r.lastChild.textContent = 'Remove?'; } }));
    list.append(r);
  }
  if (!ids.length && !FRIENDS.pending.length) list.append(mk('p', 'frEmpty', 'No friends yet. Add people you are playing with from the list below.'));
  // people here right now
  const others = [...NET.players.values()].filter(N => N.s && N.s.md !== 'x');
  for (const N of others) {
    const r = mk('div', 'frRow'); const dot = mk('i', 'frDot on'); dot.style.background = N.color;
    r.append(dot, mk('b', '', N.name), mk('span', 'frStat', isFriend(N) ? 'Friend' : 'Playing here'));
    if (!isFriend(N) && okPid(N.pid)) r.append(FRIENDS.sent[N.pid] ? mk('span', 'frStat', 'Request sent') : btn('Add friend', () => friendRequest(N), 'primary'));
    here.append(r);
  }
  if (!others.length) here.append(mk('p', 'frEmpty', NET.on ? 'Nobody else is in this city right now.' : 'You are offline.'));
  note.textContent = NET.on ? (window.claude ? 'Friends show as online when they open this game too.' : 'Friends show as online when they are in the same room as you (same room code).') : 'Go online to add friends: create or join a room on the main menu.';
}
function initFriends() {
  const m = $('#friends'); if (!m) return;
  $('#frClose').onclick = closeFriends; m.addEventListener('click', e => { if (e.target === m) closeFriends(); });
  $('#frYes').onclick = () => friendAnswer(true); $('#frNo').onclick = () => friendAnswer(false);
  $('#pFriends').onclick = openFriends; $('#friendsBtn').onclick = openFriends;
  setInterval(() => {
    if (FRIENDS.open) renderFriends();
    // a friend just came online
    const now = new Set(); for (const p of NET.lobby) { const s = p.presence; if (!p.sameTab && s && okPid(s.pid) && FRIENDS.list[s.pid]) now.add(s.pid); }
    for (const N of NET.players.values()) if (okPid(N.pid) && FRIENDS.list[N.pid]) now.add(N.pid);
    for (const pid of now) if (!FRIENDS.seen.has(pid)) feed(`★ ${FRIENDS.list[pid].name} is online`, 'green');
    FRIENDS.seen = now;
    // jump next to a friend once we arrive in their city
    if (FRIENDS.goto && APP.mode === 'game') { const w = friendWhere(FRIENDS.goto); if (w && w.here && w.N.av) { friendTeleport(w.N); FRIENDS.goto = null; } }
  }, 1500);
  friendToast();
}
