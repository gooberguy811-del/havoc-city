(() => {
  const peerId = 'p' + Math.random().toString(36).slice(2, 10);
  const rooms = {};
  function mkRoom(name) {
    const R = { name, mine: {}, others: new Map(), handlers: [] };
    const snapshot = () => { const arr = [Object.freeze({ peer: peerId, by: 'u-' + peerId, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...R.mine }), updatedAt: Date.now() })]; for (const o of R.others.values()) arr.push(o); return Object.freeze(arr); };
    R.fire = (joined, left, updated) => { const peers = snapshot(); for (const h of R.handlers) h({ peers, joined, left, updated }); };
    R.api = {
      name,
      presence: async patch => { for (const k in patch) { if (patch[k] === null) delete R.mine[k]; else R.mine[k] = patch[k]; } if (window.__netOut) window.__netOut(JSON.stringify({ room: name, peer: peerId, presence: R.mine })); },
      onPeers: h => { R.handlers.push(h); setTimeout(() => R.fire(snapshot(), [], []), 0); return () => { }; },
      peers: () => snapshot(), connected: () => true, onConnection: h => { setTimeout(() => h(true)); return () => { }; },
      leave: async () => { if (window.__netOut) window.__netOut(JSON.stringify({ room: name, peer: peerId, leave: true })); delete rooms[name]; },
      emit: async () => { }, on: () => () => { }
    };
    rooms[name] = R; return R;
  }
  const lobby = mkRoom('__lobby');
  const ns = Object.assign({}, lobby.api, { join: async name => (rooms[name] || mkRoom(name)).api });
  window.__netIn = msg => {
    const m = JSON.parse(msg), R = rooms[m.room]; if (!R) return;
    if (m.leave) { const o = R.others.get(m.peer); if (o) { R.others.delete(m.peer); R.fire([], [o], []); } return; }
    const had = R.others.has(m.peer);
    const o = Object.freeze({ peer: m.peer, by: 'u-' + m.peer, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(m.presence), updatedAt: Date.now() });
    R.others.set(m.peer, o); R.fire(had ? [] : [o], [], had ? [o] : []);
  };
  const user = { profiles: async ids => { const r = {}; for (const id of [].concat(ids)) r[id] = { id, name: 'Friend ' + id.slice(-3).toUpperCase() }; return r; } };
  window.claude = { use: async n => n === 'room' ? ns : n === 'user' ? user : null };
})();
