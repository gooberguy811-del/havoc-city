// =====================================================================
//  SELF-HOSTED MULTIPLAYER via PeerJS (WebRTC). Used only when the game
//  runs outside claude.ai. Same interface as the `room` capability, so the
//  rest of the netcode is unchanged. The first player in a room claims the
//  room's well-known id and relays for everyone else (a star); if they
//  leave, the others race to take over.
// =====================================================================
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PEER = { room: null, code: null, st: null };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = PEERJS_URL; s.async = true; s.onload = () => (window.Peer ? res() : rej(new Error('missing'))); s.onerror = () => rej(new Error('load')); document.head.appendChild(s); });
}
function makePeerRoom(code, onStatus) {
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }], sdpSemantics: 'unified-plan' };
  const hostId = 'havoccity-room-' + code.toLowerCase(), opts = Object.assign({ debug: 0, config: ICE }, window.__peerOpts || {});
  const rooms = {}, conns = new Map();
  let peer = null, isHost = false, hostConn = null, myId = null, ready = false, closed = false, fails = 0, gen = 0, hostHeard = 0;
  let stage = 'server', errState = false, lastErr = '', hostTries = 0;
  const heard = new Map();
  const R = name => rooms[name] || (rooms[name] = { name, mine: {}, others: new Map(), handlers: [] });
  const me = r => Object.freeze({ peer: myId || 'me', by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, r.mine)), updatedAt: Date.now() });
  const snapshot = r => Object.freeze([me(r), ...r.others.values()]);
  const fire = (r, joined, left, updated) => { const peers = snapshot(r); for (const h of r.handlers.slice()) { try { h({ peers, joined, left, updated }); } catch (e) { } } };
  const others = () => { const s = new Set(); for (const r of Object.values(rooms)) for (const id of r.others.keys()) s.add(id); return s.size; };
  const status = () => { if (onStatus) onStatus({ state: closed ? 'off' : ready ? 'live' : errState ? 'error' : 'connecting', stage, type: lastErr, host: isHost, count: 1 + (isHost ? conns.size : others()) }); };
  const send = m => { try { if (isHost) { for (const c of conns.values()) if (c.open) c.send(m); } else if (hostConn && hostConn.open) hostConn.send(m); } catch (e) { } };
  function recv(m, from) {
    if (isHost && from) heard.set(from.peer, Date.now()); else if (!isHost) hostHeard = Date.now();
    if (!m || typeof m !== 'object' || m.t === 'hb' || typeof m.room !== 'string' || m.room.length > 48) return;
    if (isHost && from) m.peer = from.peer;              // the hub stamps who sent it: no spoofing
    if (typeof m.peer !== 'string' || m.peer === myId) return;
    if (isHost) for (const c of conns.values()) if (c !== from && c.open) { try { c.send(m); } catch (e) { } }
    const r = R(m.room);
    if (m.t === 'leave') { const o = r.others.get(m.peer); if (o) { r.others.delete(m.peer); fire(r, [], [o], []); status(); } return; }
    if (m.t !== 'p' || !m.presence || typeof m.presence !== 'object' || Array.isArray(m.presence)) return;
    const had = r.others.has(m.peer);
    const o = Object.freeze({ peer: m.peer, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(m.presence), updatedAt: Date.now() });
    r.others.set(m.peer, o); fire(r, had ? [] : [o], [], had ? [o] : []);
    if (!had) status();
  }
  function dropPeer(id) {
    for (const r of Object.values(rooms)) { const o = r.others.get(id); if (o) { r.others.delete(id); fire(r, [], [o], []); } }
    for (const name in rooms) send({ t: 'leave', room: name, peer: id });
  }
  function resendMine(target) { if (!myId) return; for (const r of Object.values(rooms)) { const m = { t: 'p', room: r.name, peer: myId, presence: r.mine }; if (target) { try { target.send(m); } catch (e) { } } else send(m); } }
  function greet(c) { resendMine(c); for (const r of Object.values(rooms)) for (const o of r.others.values()) { try { c.send({ t: 'p', room: r.name, peer: o.peer, presence: o.presence }); } catch (e) { } } }
  function clearOthers() { for (const r of Object.values(rooms)) { const left = [...r.others.values()]; r.others.clear(); if (left.length) fire(r, [], left, []); } }
  function retry(delay) { if (closed) return; const g = ++gen; setTimeout(() => { if (!closed && g === gen) start(); }, delay); }
  // the matchmaking server could not be reached: a few retries, then say so and stop
  function fail(e) {
    try { peer && peer.destroy(); } catch (x) { } peer = null; ready = false;
    lastErr = (e && e.type) || 'unknown'; stage = 'server';
    if (++fails > 3) { errState = true; status(); retry(10000); return; }   // keep trying quietly in the background
    status(); retry(1500 * fails);
  }
  // try to become the hub; if the room id is taken, join whoever holds it
  function start() {
    if (closed) return;
    ready = false; isHost = false; stage = 'server'; status();
    let p; try { p = new Peer(hostId, opts); } catch (e) { fail({ type: 'browser-incompatible' }); return; }
    peer = p;
    setTimeout(() => { if (peer === p && !ready && !closed) fail({ type: 'timeout' }); }, 12000);
    p.on('open', id => { if (peer !== p) return; isHost = true; myId = id; ready = true; fails = 0; hostTries = 0; errState = false; lastErr = ''; status(); resendMine(); fire(R('__lobby'), [], [], []); });
    p.on('connection', c => {
      if (peer !== p) return;
      c.on('open', () => { conns.set(c.peer, c); heard.set(c.peer, Date.now()); greet(c); status(); });
      c.on('data', d => recv(d, c));
      c.on('close', () => { if (conns.get(c.peer) === c) { conns.delete(c.peer); dropPeer(c.peer); status(); } });
      c.on('error', () => { });
    });
    p.on('disconnected', () => { if (peer === p && !closed) { try { p.reconnect(); } catch (e) { } } });
    p.on('error', e => {
      if (peer !== p) return;
      if (e && e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { } joinAsClient(); }
      else if (!ready) fail(e);
    });
  }
  // the hub went quiet or away: everyone races to take its place
  function hostLost() {
    if (closed) return;
    const c = hostConn; hostConn = null; try { c && c.close(); } catch (x) { }
    clearOthers(); try { peer && peer.destroy(); } catch (x) { } peer = null; ready = false; status(); retry(300 + Math.random() * 1500);
  }
  // heartbeat: catches tabs that vanish without saying goodbye
  let lastTick = Date.now();
  const hb = setInterval(() => {
    if (closed) { clearInterval(hb); return; }
    const now = Date.now(), stalled = now - lastTick > 3500; lastTick = now;
    if (!ready) return;
    send({ t: 'hb' });
    // this page was frozen (loading a city, a background tab): give everyone a fresh grace period
    if (stalled) { for (const id of heard.keys()) heard.set(id, now); hostHeard = now; return; }
    if (isHost) { for (const [id, c] of conns) if (now - (heard.get(id) || 0) > 15000) { conns.delete(id); heard.delete(id); try { c.close(); } catch (x) { } dropPeer(id); status(); } }
    else if (now - hostHeard > 12000) hostLost();
  }, 1500);
  function joinAsClient() {
    stage = 'server'; status();
    let p; try { p = new Peer(opts); } catch (e) { fail({ type: 'browser-incompatible' }); return; }
    peer = p;
    setTimeout(() => { if (peer === p && !ready && !closed && stage === 'server') fail({ type: 'timeout' }); }, 12000);
    p.on('open', id => {
      if (peer !== p) return;
      myId = id; fails = 0; stage = 'host'; status();
      const c = p.connect(hostId, { reliable: true, serialization: 'json' }); hostConn = c;
      c.on('open', () => { if (peer !== p) return; ready = true; hostTries = 0; errState = false; lastErr = ''; hostHeard = Date.now(); status(); resendMine(); fire(R('__lobby'), [], [], []); });
      c.on('data', d => recv(d, null));
      c.on('close', () => { if (hostConn === c) hostLost(); });
      c.on('error', e => { lastErr = (e && e.type) || 'connection'; });
      // the room exists but a direct link to its host would not open: keep trying, and after a few goes say why
      setTimeout(() => {
        if (peer !== p || ready || closed) return;
        if (!lastErr) lastErr = 'timeout';
        if (++hostTries >= 3) errState = true;
        try { p.destroy(); } catch (x) { } peer = null; status(); retry(errState ? 6000 : 400 + Math.random() * 800);
      }, 10000);
    });
    p.on('error', e => {
      if (peer !== p) return;
      if (e && e.type === 'peer-unavailable') { try { p.destroy(); } catch (x) { } peer = null; retry(300 + Math.random() * 1200); }
      else if (e && (e.type === 'webrtc' || e.type === 'negotiation-failed')) lastErr = e.type;
      else if (!ready) fail(e);
    });
  }
  const api = name => ({
    name,
    presence: async patch => { const r = R(name); for (const k in patch) { if (patch[k] === null) delete r.mine[k]; else r.mine[k] = patch[k]; } if (myId && ready) send({ t: 'p', room: name, peer: myId, presence: r.mine }); },
    onPeers: h => { const r = R(name); r.handlers.push(h); setTimeout(() => fire(r, snapshot(r), [], []), 0); return () => { const i = r.handlers.indexOf(h); if (i >= 0) r.handlers.splice(i, 1); }; },
    peers: () => snapshot(R(name)), connected: () => ready,
    leave: async () => { if (myId) send({ t: 'leave', room: name, peer: myId }); const r = rooms[name]; if (r) { r.handlers.length = 0; r.mine = {}; } }
  });
  const ns = Object.assign(api('__lobby'), {
    join: async name => api(name),
    close: now => { if (closed) return; for (const name in rooms) if (myId) send({ t: 'leave', room: name, peer: myId }); closed = true; gen++; clearInterval(hb); const kill = () => { try { peer && peer.destroy(); } catch (e) { } peer = null; }; if (now) kill(); else setTimeout(kill, 150); clearOthers(); status(); }
  });
  start();
  return ns;
}
window.addEventListener('pagehide', () => { if (PEER.room && PEER.room.close) PEER.room.close(true); });
// ---------- menu panel ----------
function randomCode() { let s = ''; for (let i = 0; i < 5; i++) s += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]; return s; }
function cleanCode(v) { const c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length >= 4 && c.length <= 6 ? c : null; }
function initOnlinePanel() {
  const box = $('#online'); if (!box) return;
  box.hidden = false;
  const name = $('#onName'); name.value = NET.nick || '';
  name.oninput = () => { NET.nick = name.value.replace(/[^\p{L}\p{N} _.'-]/gu, '').slice(0, 16).trim(); store.set('havoc.nick', NET.nick); };
  $('#onCreate').onclick = () => peerConnect(randomCode());
  $('#onJoin').onclick = () => { const c = cleanCode($('#onCode').value); if (c) peerConnect(c); else peerMsg('Room codes are 4 to 6 letters or numbers'); };
  $('#onCode').onkeydown = e => { if (e.key === 'Enter') $('#onJoin').click(); };
  const local = location.protocol === 'file:';   // a file on this computer: links won't work for anyone else, codes will
  $('#onCopy').textContent = local ? 'Copy room code' : 'Copy invite link';
  $('#onCopy').onclick = async () => { const txt = local ? `Join my Havoc City room: open the game and enter code ${PEER.code}` : location.href; try { await navigator.clipboard.writeText(txt); peerMsg(local ? 'Code copied. Friends open their copy of the game and join with it' : 'Invite link copied. Send it to your friends'); } catch (e) { peerMsg(local ? 'Tell your friends the code ' + PEER.code : 'Copy this link: ' + txt); } };
  $('#onLeave').onclick = () => peerDisconnect(false);
  const m = /room=([A-Za-z0-9]{4,6})/.exec(location.hash); if (m) peerConnect(m[1].toUpperCase());
}
function peerMsg(t) { const s = $('#onStatus'); if (s) s.textContent = t; }
function peerUI() {
  const live = !!PEER.room; $('#onIdle').hidden = live; $('#onLive').hidden = !live;
  if (live) $('#onRoom').textContent = PEER.code;
}
function peerStatus(st) {
  PEER.st = st; if (!PEER.room) return;
  const why = st.type ? ` (${st.type})` : '';
  if (st.state === 'connecting') peerMsg(st.stage === 'host' ? 'Found the room. Connecting to the host…' : 'Contacting the matchmaking server…');
  else if (st.state === 'live') peerMsg(st.count > 1 ? `${st.count} players in this room${st.host ? ' · you are hosting' : ''}` : location.protocol === 'file:' ? `Waiting for friends. They join with code ${PEER.code}` : 'Waiting for friends. Send them the invite link');
  else if (st.state === 'error') peerMsg(st.type === 'browser-incompatible' ? 'This browser cannot play online. Try Chrome, Edge or Firefox' : st.stage === 'host' ? `Found the room but cannot reach the host. This network may block player-to-player connections: try home Wi-Fi or a phone hotspot. Still trying${why}` : `Cannot reach the matchmaking server. This network may block it: try home Wi-Fi or a phone hotspot, then Leave and Join again${why}`);
}
async function peerConnect(code) {
  peerDisconnect(true);
  PEER.code = code;
  try { history.replaceState(null, '', location.pathname + location.search + '#room=' + code); } catch (e) { }
  PEER.room = { close() { } }; peerUI(); peerMsg('Connecting…');
  try { await loadPeerJS(); } catch (e) { PEER.room = null; peerUI(); peerMsg('Could not load the online library. Check your internet connection'); return; }
  if (PEER.code !== code) return;
  const room = makePeerRoom(code, peerStatus);
  PEER.room = room; peerUI();
  netStart(room, null);
}
function peerDisconnect(keepHash) {
  if (PEER.room) { try { PEER.room.close(); } catch (e) { } PEER.room = null; }
  netStop(); PEER.code = keepHash ? PEER.code : null;
  if (!keepHash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } peerMsg('Offline'); }
  peerUI();
}
