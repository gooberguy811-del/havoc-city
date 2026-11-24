// =====================================================================
//  LOOK: detailed procedural textures for a richer street-level look:
//  worn asphalt, paving slabs, grass, sand, four facade styles (concrete,
//  brick, glass curtain wall, stucco), shopfronts and rooftop billboards
// =====================================================================
const LOOK = { R: null };
function lookRand() { return LOOK.R(); }
// draw something three times so it wraps seamlessly across texture edges
function wrapDraw(w, h, x, y, r, fn) { for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { if (x + ox + r < 0 || x + ox - r > w || y + oy + r < 0 || y + oy - r > h) continue; fn(x + ox, y + oy); } }
function blotches(g, w, h, n, rgb, r0, r1, a0, a1) {
  const R = LOOK.R;
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = r0 + R() * (r1 - r0), a = a0 + R() * (a1 - a0);
    wrapDraw(w, h, x, y, r, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); });
  }
}
function specks(g, w, h, n, lo, hi, a, s0, s1, tint) {
  const R = LOOK.R;
  for (let i = 0; i < n; i++) { const v = (lo + R() * (hi - lo)) | 0, s = s0 + R() * (s1 - s0); g.fillStyle = tint ? `rgba(${(v * tint[0]) | 0},${(v * tint[1]) | 0},${(v * tint[2]) | 0},${a})` : `rgba(${v},${v},${v},${a})`; g.fillRect(R() * w, R() * h, s, s); }
}
function cracks(g, w, h, n, a) {
  const R = LOOK.R;
  for (let i = 0; i < n; i++) {
    let x = R() * w, y = R() * h, ang = R() * TAU; g.strokeStyle = `rgba(12,12,12,${a})`; g.lineWidth = 0.8 + R() * 0.9;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 9; k++) { ang += (R() - 0.5) * 1.2; x += Math.cos(ang) * (5 + R() * 10); y += Math.sin(ang) * (5 + R() * 10); g.lineTo(x, y); }
    g.stroke();
  }
}
function hdTextures() {
  LOOK.R = mulberry32(4242); const R = LOOK.R;
  // ---------- worn asphalt: lanes, oil drips, tyre polish, cracks, patches, faded paint ----------
  TEX.road = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#3b3c3f'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 26, '255,255,255', 30, 90, 0.015, 0.04); blotches(g, w, h, 22, '0,0,0', 20, 80, 0.05, 0.12);
    specks(g, w, h, 16000, 25, 150, 0.22, 1, 2);
    for (const c of [64, 192]) {   // lane centres: dark oil line, tyre-polished tracks either side
      const gr = g.createLinearGradient(c - 18, 0, c + 18, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(8,6,4,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(c - 18, 0, 36, h);
      for (const s of [-1, 1]) { const t = c + s * 40, g2 = g.createLinearGradient(t - 12, 0, t + 12, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,.035)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = g2; g.fillRect(t - 12, 0, 24, h); }
      for (let k = 0; k < 14; k++) wrapDraw(w, h, c + (R() - 0.5) * 14, R() * h, 8, (x, y) => { g.fillStyle = `rgba(10,8,6,${0.08 + R() * 0.12})`; g.beginPath(); g.ellipse(x, y, 2 + R() * 5, 3 + R() * 9, 0, 0, TAU); g.fill(); });
    }
    { const x = 150 + R() * 40, y = R() * (h - 140), pw = 44 + R() * 30, ph = 70 + R() * 50; g.fillStyle = 'rgba(30,31,34,.32)'; g.fillRect(x, y, pw, ph); g.strokeStyle = 'rgba(15,15,15,.3)'; g.lineWidth = 1; g.strokeRect(x, y, pw, ph); }
    cracks(g, w, h, 5, 0.38);
    const wear = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); for (let k = 0; k < ww * hh / 22; k++) { g.fillStyle = 'rgba(59,60,63,.7)'; g.fillRect(x + R() * ww, y + R() * hh, 1 + R() * 2, 1 + R() * 2); } };
    wear(w * 0.035, 0, 4, h, 'rgba(222,219,208,.9)'); wear(w * 0.965 - 4, 0, 4, h, 'rgba(222,219,208,.9)');
    for (let y = 0; y < h; y += 128) wear(w / 2 - 3, y + 20, 6, 80, 'rgba(226,176,42,.95)');
  });
  // ---------- paving slabs with joints, stains and gum ----------
  TEX.side = canvasTex(256, 256, (g, w, h) => {
    const S = 64;
    for (let y = 0; y < h; y += S) for (let x = 0; x < w; x += S) { const v = 128 + R() * 16 | 0; g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(x, y, S, S); }
    specks(g, w, h, 9000, 80, 190, 0.16, 1, 2);
    blotches(g, w, h, 14, '40,34,26', 6, 22, 0.05, 0.14);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(40,38,36,${0.25 + R() * 0.3})`; g.beginPath(); g.arc(R() * w, R() * h, 0.8 + R() * 1.6, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(48,44,38,.55)'; for (let k = 0; k < w; k += S) { g.fillRect(k, 0, 2, h); g.fillRect(0, k, w, 2); }
    g.fillStyle = 'rgba(255,255,255,.07)'; for (let k = 0; k < w; k += S) { g.fillRect(k + 2, 0, 1, h); g.fillRect(0, k + 2, w, 1); }
    cracks(g, w, h, 3, 0.35);
  });
  // ---------- grass: clumps, dry patches, blades ----------
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b7530'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 46, '40,70,22', 10, 34, 0.12, 0.26); blotches(g, w, h, 30, '150,150,70', 8, 28, 0.06, 0.16); blotches(g, w, h, 10, '110,90,55', 4, 12, 0.08, 0.18);
    for (let i = 0; i < 11000; i++) { g.fillStyle = `hsla(${78 + R() * 34},${35 + R() * 30}%,${20 + R() * 26}%,.55)`; const x = R() * w, y = R() * h; g.fillRect(x, y, 1, 2 + R() * 3); }
    for (let i = 0; i < 60; i++) { g.fillStyle = R() < 0.5 ? 'rgba(245,240,220,.6)' : 'rgba(250,220,80,.55)'; g.fillRect(R() * w, R() * h, 1.5, 1.5); }
  });
  TEX.sand = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d6bf96'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 24, '255,240,210', 20, 70, 0.08, 0.2); blotches(g, w, h, 20, '150,115,70', 16, 60, 0.06, 0.16);
    specks(g, w, h, 9000, 120, 255, 0.16, 1, 2, [1, 0.92, 0.78]);
    g.strokeStyle = 'rgba(140,108,68,.13)'; g.lineWidth = 1.4; for (let y = 6; y < h; y += 11) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.1 + y * 0.7) * 2.2 + Math.sin(x * 0.031) * 1.5); g.stroke(); }
    for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(${90 + R() * 80 | 0},${75 + R() * 60 | 0},${55 + R() * 40 | 0},.55)`; g.beginPath(); g.arc(R() * w, R() * h, 0.6 + R() * 1.4, 0, TAU); g.fill(); }
  });
  TEX.dirt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8c6d4c'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 26, '60,42,26', 14, 50, 0.12, 0.28); blotches(g, w, h, 16, '190,160,120', 10, 40, 0.08, 0.2);
    specks(g, w, h, 10000, 50, 210, 0.2, 1, 2.5, [1, 0.85, 0.66]);
  });
  TEX.lot = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#46474a'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 26, '0,0,0', 14, 50, 0.03, 0.08); blotches(g, w, h, 12, '255,255,255', 20, 60, 0.01, 0.025);
    specks(g, w, h, 12000, 30, 150, 0.2, 1, 2); cracks(g, w, h, 6, 0.4);
    for (let k = 0; k < 10; k++) wrapDraw(w, h, R() * w, R() * h, 14, (x, y) => { g.fillStyle = `rgba(8,6,4,${0.12 + R() * 0.15})`; g.beginPath(); g.ellipse(x, y, 4 + R() * 9, 3 + R() * 7, R() * 3, 0, TAU); g.fill(); });
  });
  // ---------- facades ----------
  TEX.office = makeFacade('office', 7); TEX.house = makeFacade('house', 11); TEX.brick = makeFacade('brick', 23); TEX.glass = makeFacade('glass', 31);
  TEX.shopf = makeShopfronts(); TEX.bill = makeBillboards();
  TEX.crowd = canvasTex(128, 64, (g, w, h) => {   // a row of fans on stadium seats: navy and gold for the home side, the odd away shirt
    g.fillStyle = '#2a2f3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#20242d'; g.fillRect(0, h - 10, w, 10);
    const R = mulberry32(55), shirts = ['#1e3a8a', '#f5c400', '#1e3a8a', '#f5c400', '#f2f2ee', '#c8352b', '#1e3a8a', '#2b2b2b'], skin = ['#f1c9a5', '#e0ac85', '#c68863', '#8a5536', '#a86f4c'];
    for (let k = 0; k < 6; k++) { const x = 4 + k * 21 + R() * 3, sh = shirts[(R() * shirts.length) | 0]; g.fillStyle = sh; g.fillRect(x, 26 + R() * 4, 15, 28); g.fillStyle = skin[(R() * skin.length) | 0]; g.beginPath(); g.arc(x + 7.5, 20 + R() * 4, 6, 0, TAU); g.fill(); if (R() < 0.3) { g.fillStyle = sh; g.fillRect(x + 12, 6, 4, 16); } }
  });
  TEX.foliage = canvasTex(128, 128, (g, w, h) => {   // soft leaf clusters; multiplies the tree colours
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); blotches(g, w, h, 60, '255,255,255', 4, 12, 0.25, 0.5); blotches(g, w, h, 70, '0,0,0', 3, 9, 0.18, 0.35);
    for (let i = 0; i < 900; i++) { const v = 150 + R() * 105 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.ellipse(R() * w, R() * h, 1 + R() * 2, 0.6 + R(), R() * 3, 0, TAU); g.fill(); }
  });
  TEX.fence = canvasTex(64, 64, (g, w, h) => {   // chain-link diamonds on a transparent background
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(190,196,202,1)'; g.lineWidth = 2.2;
    for (let k = -2; k < 3; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 64, 64); g.stroke(); g.beginPath(); g.moveTo(k * 32 + 64, 0); g.lineTo(k * 32, 64); g.stroke(); }
  });
}
// 8 x 8 tiles; each tile is one window bay of one storey. The bottom strip doubles as the roof colour.
function makeFacade(kind, seed) {
  const rng = mulberry32(seed), T = 8, P = 128, N = T * P, R = rng;
  const WIN = { office: [16, 22, 96, 82], brick: [34, 22, 60, 80], glass: [0, 0, 128, 94], house: [30, 30, 68, 58] }[kind];
  const lit = []; for (let i = 0; i < T * T; i++) lit.push(R() < (kind === 'house' ? 0.42 : kind === 'glass' ? 0.3 : 0.36) ? (R() < 0.75 ? 'w' : 'c') : null);
  const glassGrad = (g, x, y, ww, hh, k) => { const gr = g.createLinearGradient(x, y, x + ww * 0.3, y + hh); gr.addColorStop(0, `rgb(${150 + k * 30 | 0},${168 + k * 30 | 0},${184 + k * 26 | 0})`); gr.addColorStop(0.45, `rgb(${46 + k * 10 | 0},${60 + k * 12 | 0},${78 + k * 14 | 0})`); gr.addColorStop(1, `rgb(${70 + k * 10 | 0},${86 + k * 10 | 0},${104 + k * 10 | 0})`); return gr; };
  const map = canvasTex(N, N, g => {
    const prevR = LOOK.R; LOOK.R = rng;
    if (kind === 'brick') {
      g.fillStyle = '#c9bfae'; g.fillRect(0, 0, N, N);
      const BH = 9, BW = 26, BC = ['#9a4a35', '#a5533b', '#8d4331', '#b0603f', '#7f3c2c', '#94503a', '#a8482f'];
      for (let y = 0, row = 0; y < N; y += BH, row++) for (let x = -((row % 2) * BW / 2); x < N; x += BW) { g.fillStyle = BC[(R() * BC.length) | 0]; g.fillRect(x + 1, y + 1, BW - 2, BH - 2); }
      specks(g, N, N, 40000, 40, 200, 0.12, 1, 2);
      blotches(g, N, N, 40, '30,20,15', 30, 120, 0.04, 0.12);
    } else if (kind === 'glass') {
      const gr = g.createLinearGradient(0, 0, N, N); gr.addColorStop(0, '#5f8aa3'); gr.addColorStop(0.3, '#93b8cb'); gr.addColorStop(0.55, '#3f6479'); gr.addColorStop(0.8, '#7ea3b8'); gr.addColorStop(1, '#3a5a6e');
      g.fillStyle = gr; g.fillRect(0, 0, N, N);
      blotches(g, N, N, 26, '255,255,255', 40, 160, 0.05, 0.16); blotches(g, N, N, 20, '10,30,45', 40, 140, 0.08, 0.2);
    } else if (kind === 'house') {
      g.fillStyle = '#eee6d8'; g.fillRect(0, 0, N, N); specks(g, N, N, 30000, 160, 255, 0.1, 1, 3); blotches(g, N, N, 30, '120,100,80', 20, 90, 0.03, 0.08);
    } else {
      g.fillStyle = '#dcd7ce'; g.fillRect(0, 0, N, N); specks(g, N, N, 30000, 130, 255, 0.1, 1, 2); blotches(g, N, N, 40, '90,80,70', 20, 100, 0.03, 0.09);
    }
    const SH = ['#2f5d3a', '#3a5f8a', '#7a3a2a', '#5a4632', '#2c4a5a'];
    for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) {
      const x = tx * P, y = ty * P, [wx, wy, ww, wh] = WIN, k = R();
      if (kind === 'office') {
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y + P - 14, P, 14); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y + P - 14, P, 2);
        g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x, y, 6, P);
        g.fillStyle = '#5d636b'; g.fillRect(x + wx - 3, y + wy - 3, ww + 6, wh + 6);
        g.fillStyle = glassGrad(g, x + wx, y + wy, ww, wh, k); g.fillRect(x + wx, y + wy, ww, wh);
        if (R() < 0.38) { g.fillStyle = `rgba(${220 + R() * 25 | 0},${210 + R() * 20 | 0},${185 + R() * 20 | 0},.85)`; g.fillRect(x + wx, y + wy, ww, wh * (0.15 + R() * 0.5)); }
        g.fillStyle = '#8a9099'; g.fillRect(x + wx + ww / 2 - 1.5, y + wy, 3, wh); g.fillRect(x + wx, y + wy + wh * 0.3, ww, 2);
        g.fillStyle = '#efebe3'; g.fillRect(x + wx - 5, y + wy + wh + 3, ww + 10, 4); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + wx, y + wy + wh + 7, ww, 10);
      } else if (kind === 'brick') {
        g.fillStyle = '#d8ceba'; g.fillRect(x + wx - 6, y + wy - 10, ww + 12, 9); g.fillRect(x + wx - 4, y + wy + wh, ww + 8, 6);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + wx - 4, y + wy + wh + 6, ww + 8, 2);
        g.fillStyle = '#ece6da'; g.fillRect(x + wx - 4, y + wy - 1, ww + 8, wh + 1);
        g.fillStyle = glassGrad(g, x + wx, y + wy, ww, wh, k * 0.6); g.fillRect(x + wx, y + wy + 3, ww, wh - 3);
        if (R() < 0.3) { g.fillStyle = `rgba(${200 + R() * 40 | 0},${180 + R() * 40 | 0},${150 + R() * 30 | 0},.9)`; g.fillRect(x + wx, y + wy + 3, ww, wh * (0.2 + R() * 0.4)); }
        g.fillStyle = '#ece6da'; g.fillRect(x + wx, y + wy + wh / 2 - 2, ww, 4); g.fillRect(x + wx + ww / 2 - 1.5, y + wy, 3, wh);
        if (R() < 0.12) { g.fillStyle = '#9da1a5'; g.fillRect(x + wx + 10, y + wy + wh - 22, ww - 20, 18); g.fillStyle = '#6d7175'; for (let s = 0; s < 4; s++) g.fillRect(x + wx + 12, y + wy + wh - 20 + s * 4, ww - 24, 1.5); }
      } else if (kind === 'glass') {
        g.fillStyle = `rgba(20,32,42,${0.82})`; g.fillRect(x, y + wh, P, P - wh);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y + wh, P, 2);
        g.fillStyle = `rgba(${k < 0.5 ? '255,255,255' : '0,10,20'},${0.04 + R() * 0.08})`; g.fillRect(x + 2, y + 2, P - 4, wh - 4);
        g.fillStyle = '#6f7a85'; g.fillRect(x, y, 3, P); g.fillRect(x + P / 2 - 1, y, 2, wh); g.fillRect(x, y, P, 3); g.fillRect(x, y + wh - 1, P, 3);
      } else {
        const sh = R() < 0.45;
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + wx - 2, y + wy - 2, ww + 4, wh + 4);
        g.fillStyle = '#f7f4ee'; g.fillRect(x + wx - 4, y + wy - 4, ww + 8, wh + 8);
        g.fillStyle = glassGrad(g, x + wx, y + wy, ww, wh, k * 0.7); g.fillRect(x + wx, y + wy, ww, wh);
        if (R() < 0.4) { g.fillStyle = `rgba(${230 + R() * 20 | 0},${215 + R() * 25 | 0},${190 + R() * 30 | 0},.85)`; g.fillRect(x + wx, y + wy, ww * 0.3, wh); g.fillRect(x + wx + ww * 0.7, y + wy, ww * 0.3, wh); }
        g.fillStyle = '#f7f4ee'; g.fillRect(x + wx + ww / 2 - 2, y + wy, 4, wh); g.fillRect(x + wx, y + wy + wh / 2 - 2, ww, 4);
        g.fillStyle = '#e2dccf'; g.fillRect(x + wx - 8, y + wy + wh + 4, ww + 16, 6);
        if (sh) { g.fillStyle = SH[ty % SH.length]; g.fillRect(x + wx - 22, y + wy - 2, 16, wh + 4); g.fillRect(x + wx + ww + 6, y + wy - 2, 16, wh + 4); g.fillStyle = 'rgba(0,0,0,.25)'; for (let s = 0; s < wh; s += 6) { g.fillRect(x + wx - 22, y + wy + s, 16, 1.5); g.fillRect(x + wx + ww + 6, y + wy + s, 16, 1.5); } }
      }
      // grime streaks under windows
      if (kind !== 'glass' && R() < 0.5) { const gr = g.createLinearGradient(0, y + wy + wh, 0, y + wy + wh + 40); gr.addColorStop(0, 'rgba(40,34,28,.12)'); gr.addColorStop(1, 'rgba(40,34,28,0)'); g.fillStyle = gr; g.fillRect(x + wx + R() * ww * 0.6, y + wy + wh, 10 + R() * 20, 40); }
    }
    // roof colour: the bottom strip of the texture is sampled for flat roofs
    g.fillStyle = kind === 'house' ? '#b9b1a3' : kind === 'glass' ? '#55595e' : '#6e6c67'; g.fillRect(0, N - 6, N, 6);
    LOOK.R = prevR;
  });
  const E = 512, EP = E / T, s = EP / P;
  const emis = canvasTex(E, E, g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, E, E);
    for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) {
      const l = lit[ty * T + tx]; if (!l) continue;
      const x = tx * EP, y = ty * EP, [wx, wy, ww, wh] = WIN, b = 45 + rng() * 30;
      g.fillStyle = l === 'w' ? `hsl(${34 + rng() * 10},${80 + rng() * 15}%,${b}%)` : `hsl(${200 + rng() * 20},60%,${b + 5}%)`;
      g.fillRect(x + wx * s, y + wy * s, ww * s, wh * s);
      if (rng() < 0.4) { g.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 4; k++) g.fillRect(x + wx * s, y + (wy + k * wh / 4) * s, ww * s, wh * s / 10); }
    }
  });
  return { map, emis };
}
// eight little shops side by side; a building's ground floor picks a run of them
const SHOP_NAMES = ['DELI', 'PHARMACY', 'PAWN', 'DINER', 'SHOES', 'CAFE', 'LAUNDRY', 'BOOKS', 'GROCERY', 'BARBER', 'PIZZA', 'HARDWARE', 'DONUTS', 'NAILS', 'TATTOO', 'BAKERY'];
function makeShopfronts() {
  const rng = mulberry32(99), R = rng, SW = 256, H = 256, N = 8;
  const walls = ['#3b3632', '#d9d2c4', '#8a3b2e', '#2f4a3c', '#c9b79c', '#4a4f57', '#e6dfd2', '#5a2e2a'], signs = ['#c8352b', '#1f6fd6', '#1e8a4c', '#f5b700', '#7b2fbe', '#111317', '#e85a9b', '#0fb5c9'];
  const awn = ['#c8352b', '#1e8a4c', '#1f4fd1', '#e0a030', '#7b2fbe', '#2b2b2b', '#d9534f', '#2f8f8f'];
  const map = canvasTex(SW * N, H, g => {
    const prevR = LOOK.R; LOOK.R = rng;
    for (let i = 0; i < N; i++) {
      const x0 = i * SW, wall = walls[i], sign = signs[(i + 3) % signs.length], aw = awn[(i + 5) % awn.length], name = SHOP_NAMES[(i * 3 + 1) % SHOP_NAMES.length];
      g.fillStyle = wall; g.fillRect(x0, 0, SW, H);
      specks(g, SW * N, H, 0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 1800; k++) { const v = R() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},.05)`; g.fillRect(x0 + R() * SW, R() * H, 1.5, 1.5); }
      // sign band
      g.fillStyle = sign; g.fillRect(x0 + 6, 6, SW - 12, 42); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x0 + 6, 6, SW - 12, 3);
      g.fillStyle = sign === '#f5b700' ? '#1b1d22' : '#fbf7ee'; g.font = 'bold 30px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, x0 + SW / 2, 28);
      // striped awning with a scalloped edge
      const ay = 52, ah = 26;
      for (let s = 0; s < SW; s += 16) { g.fillStyle = (s / 16) % 2 ? '#f4f1ea' : aw; g.fillRect(x0 + s, ay, 16, ah); }
      for (let s = 0; s < SW; s += 16) { g.fillStyle = (s / 16) % 2 ? '#f4f1ea' : aw; g.beginPath(); g.arc(x0 + s + 8, ay + ah, 8, 0, Math.PI); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0, ay + ah + 8, SW, 6);
      // shop window with a hint of shelves, and the door
      g.fillStyle = '#1d1f22'; g.fillRect(x0 + 12, 90, 162, 144);
      const gr = g.createLinearGradient(x0 + 16, 94, x0 + 170, 230); gr.addColorStop(0, '#6e7f8e'); gr.addColorStop(0.4, '#2c3440'); gr.addColorStop(1, '#3d4a58'); g.fillStyle = gr; g.fillRect(x0 + 16, 94, 154, 136);
      for (let s = 0; s < 3; s++) { g.fillStyle = 'rgba(210,200,170,.22)'; g.fillRect(x0 + 22, 140 + s * 30, 142, 3); for (let p = 0; p < 12; p++) { g.fillStyle = `hsla(${R() * 360},55%,55%,.35)`; g.fillRect(x0 + 24 + p * 11.5, 128 + s * 30, 8, 11); } }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x0 + 30, 94); g.lineTo(x0 + 70, 94); g.lineTo(x0 + 30, 170); g.closePath(); g.fill();
      g.fillStyle = '#1d1f22'; g.fillRect(x0 + 186, 98, 58, 158); g.fillStyle = '#34404c'; g.fillRect(x0 + 192, 104, 46, 120); g.fillStyle = '#c9c4b8'; g.fillRect(x0 + 230, 168, 4, 16);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x0, 234, 180, 22);
      if (R() < 0.6) { g.fillStyle = '#f4f1ea'; g.font = 'bold 13px Arial, sans-serif'; g.fillText(R() < 0.5 ? 'OPEN' : 'SALE', x0 + 94, 104); }
    }
    LOOK.R = prevR;
  });
  const emis = canvasTex(SW * N / 2, H / 2, g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, SW * N / 2, H / 2);
    for (let i = 0; i < N; i++) { const x0 = i * SW / 2; g.fillStyle = `hsl(${36 + R() * 14},65%,${30 + R() * 10}%)`; g.fillRect(x0 + 8, 47, 77, 68); g.fillStyle = 'hsl(40,55%,26%)'; g.fillRect(x0 + 96, 52, 23, 60); g.fillStyle = `hsl(${R() * 360},80%,45%)`; g.fillRect(x0 + 3, 3, SW / 2 - 6, 21); }
  });
  return { map, emis };
}
// four made-up adverts for rooftop billboards
function makeBillboards() {
  const W2 = 512, H2 = 256;
  const map = canvasTex(W2 * 2, H2 * 2, g => {
    const ad = (cx, cy, fn) => { g.save(); g.translate(cx * W2, cy * H2); g.beginPath(); g.rect(0, 0, W2, H2); g.clip(); fn(); g.restore(); };
    const txt = (s, x, y, size, col, font) => { g.fillStyle = col; g.font = `${font || 'bold'} ${size}px Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); };
    ad(0, 0, () => {   // cola
      const gr = g.createLinearGradient(0, 0, W2, H2); gr.addColorStop(0, '#d7261e'); gr.addColorStop(1, '#8e1010'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
      for (let k = 0; k < 18; k++) { g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(330 + Math.random() * 160, Math.random() * H2, 3 + Math.random() * 10, 0, TAU); g.fill(); }
      g.fillStyle = '#2b0c08'; g.beginPath(); g.moveTo(420, 40); g.lineTo(445, 40); g.lineTo(450, 90); g.quadraticCurveTo(475, 120, 470, 230); g.lineTo(395, 230); g.quadraticCurveTo(390, 120, 415, 90); g.closePath(); g.fill();
      g.fillStyle = '#f4f1ea'; g.fillRect(398, 140, 70, 34); txt('FIZZ', 433, 158, 24, '#d7261e');
      txt('FIZZ COLA', 190, 100, 70, '#fff6e8'); txt('Pop the cap!', 190, 170, 34, '#ffd84a', 'italic bold');
    });
    ad(1, 0, () => {   // tacos
      g.fillStyle = '#f39c1e'; g.fillRect(0, 0, W2, H2);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 10; g.beginPath(); for (let a = 0; a < 18; a += 0.2) { const r = a * 7; g.lineTo(400 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke();
      g.fillStyle = '#f7d36b'; g.beginPath(); g.arc(400, 150, 70, Math.PI, 0); g.fill(); g.fillStyle = '#5ca33c'; g.fillRect(338, 138, 124, 12); g.fillStyle = '#c0392b'; for (let k = 0; k < 6; k++) g.fillRect(346 + k * 19, 130, 10, 8);
      txt('TACO', 170, 80, 74, '#5a1a08'); txt('TORNADO', 170, 150, 62, '#fff7e0'); txt('open late', 170, 208, 28, '#5a1a08', 'italic bold');
    });
    ad(0, 1, () => {   // radio station
      const gr = g.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#2a0b4a'); gr.addColorStop(1, '#6d1a8c'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
      for (let k = 0; k < 4; k++) { g.strokeStyle = `rgba(0,240,255,${0.6 - k * 0.12})`; g.lineWidth = 6; g.beginPath(); g.arc(420, 128, 30 + k * 26, -0.8, 0.8); g.stroke(); }
      txt('HAVOC FM', 200, 92, 72, '#ff4fd8'); txt('99.1', 200, 160, 60, '#00f0ff'); txt('all hits, all havoc', 200, 214, 26, '#f2e9ff', 'italic bold');
    });
    ad(1, 1, () => {   // used cars
      g.fillStyle = '#1f4fd1'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#f5d000'; g.beginPath(); g.moveTo(0, 190); g.lineTo(W2, 140); g.lineTo(W2, H2); g.lineTo(0, H2); g.fill();
      g.fillStyle = '#e8473a'; g.beginPath(); g.moveTo(330, 120); g.lineTo(370, 92); g.lineTo(450, 92); g.lineTo(480, 120); g.lineTo(490, 150); g.lineTo(320, 150); g.closePath(); g.fill();
      g.fillStyle = '#16181c'; for (const x of [355, 455]) { g.beginPath(); g.arc(x, 152, 16, 0, TAU); g.fill(); }
      txt("BIG AL'S", 160, 70, 56, '#ffffff'); txt('USED CARS', 160, 128, 46, '#f5d000'); txt('LOW LOW PRICES', 200, 216, 34, '#1f4fd1');
    });
    g.fillStyle = '#e9e6df'; for (let k = 0; k < 2; k++) { g.fillRect(0, k * H2, W2 * 2, 6); g.fillRect(0, k * H2 + H2 - 6, W2 * 2, 6); g.fillRect(k * W2, 0, 6, H2 * 2); g.fillRect(k * W2 + W2 - 6, 0, 6, H2 * 2); }
  }, { repeat: false });
  return map;
}
