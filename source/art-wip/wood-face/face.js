// 木棋子字面预览：字按墨迹居中 + 三版木纹（黄杨细纹 / 榉木山纹 / 年轮）
window.FACE = (() => {
  const FONT = '"KaiTi","STKaiti","Kaiti SC","楷体","BiauKai","Noto Serif CJK SC","Songti SC",serif';
  const W = 512, C = W / 2;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ring = (g, r, lw, color) => { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.arc(C, C, r, 0, 7); g.stroke(); };
  // 现在线上（M13）：textBaseline middle，往下挪 16
  function glyphNow(g, ch, col) { g.font = `bold 310px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(ch, C, C + 16); }
  // 修正：按字的实际墨迹上下居中；太高的字缩一点，保证不碰里圈
  function glyphFix(g, ch, col, maxInk = 262) {
    let fs = 300; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `bold ${fs}px ${FONT}`; let m = g.measureText(ch);
    const ink = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (ink > maxInk) { fs = Math.floor(fs * maxInk / ink); g.font = `bold ${fs}px ${FONT}`; m = g.measureText(ch); }
    g.fillStyle = col; g.fillText(ch, C, C + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  }
  function clipDisk(g) { g.beginPath(); g.arc(C, C, W * 0.47, 0, 7); g.clip(); }
  // ---- 三种木面 ----
  function ivory(g) { const gr = g.createRadialGradient(C * 0.8, C * 0.75, 10, C, C, W * 0.48); gr.addColorStop(0, '#f1e4c0'); gr.addColorStop(1, '#e6d3a4'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
  // 甲 · 黄杨木：浅黄，细而直的纹，最淡
  function boxwood(g) {
    seed = 11;
    const gr = g.createRadialGradient(C * 0.8, C * 0.72, 10, C, C, W * 0.5); gr.addColorStop(0, '#eed5a0'); gr.addColorStop(1, '#d6b476'); g.fillStyle = gr; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 120; i++) {
      const y0 = rnd() * W, amp = 2 + rnd() * 6, f = 0.004 + rnd() * 0.006, ph = rnd() * 6, a = 0.08 + rnd() * 0.17;
      g.strokeStyle = `rgba(${130 + rnd() * 30 | 0},${85 + rnd() * 20 | 0},${35 + rnd() * 15 | 0},${a})`; g.lineWidth = 0.8 + rnd() * 2.2;
      g.beginPath(); for (let x = -10; x <= W + 10; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * 0.03 + ph * 2) * 0.8; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 7; i++) { const y0 = rnd() * W; g.strokeStyle = `rgba(150,100,45,${0.1 + rnd() * 0.08})`; g.lineWidth = 5 + rnd() * 10; g.beginPath(); for (let x = -10; x <= W + 10; x += 10) { const y = y0 + Math.sin(x * 0.006 + i) * 5; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,75,30,${0.06 + rnd() * 0.08})`; g.fillRect(rnd() * W, rnd() * W, 2 + rnd() * 5, 1); }
  }
  // 乙 · 榉木山纹：暖一点的蜜色，弦切面的山形纹，纹路明显
  function beech(g) {
    seed = 23;
    const gr = g.createRadialGradient(C * 0.8, C * 0.72, 10, C, C, W * 0.5); gr.addColorStop(0, '#ebcb92'); gr.addColorStop(1, '#cfa266'); g.fillStyle = gr; g.fillRect(0, 0, W, W);
    // 两侧的直纹
    for (let i = 0; i < 60; i++) { const x0 = rnd() < 0.5 ? rnd() * W * 0.22 : W - rnd() * W * 0.22; g.strokeStyle = `rgba(140,88,38,${0.12 + rnd() * 0.16})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); for (let y = -10; y <= W + 10; y += 10) { const x = x0 + Math.sin(y * 0.008 + i) * 4; y < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    // 中间一层套一层的山形（顶点朝上）
    const cx = C + 26, top = W * 0.16;
    for (let k = 0; k < 26; k++) {
      const h = top + k * 14 + rnd() * 5, wd = 48 + k * 11, a = (k % 3 === 0 ? 0.36 : 0.2) + rnd() * 0.08;
      g.strokeStyle = `rgba(135,82,34,${a})`; g.lineWidth = k % 3 === 0 ? 4 + rnd() * 3 : 1.5 + rnd() * 2;
      g.beginPath();
      for (let t = -1.25; t <= 1.25; t += 0.04) { const x = cx + t * wd + Math.sin(t * 5 + k) * 3, y = h + Math.pow(Math.abs(t), 2.2) * (W - h) * 0.8 + Math.sin(t * 9 + k) * 2; t === -1.25 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(110,65,25,${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * W, rnd() * W, 1, 2 + rnd() * 4); }
  }
  // 丙 · 年轮：像截一段树枝做的棋子，端面一圈圈年轮，中心稍偏，有一两道细裂
  function rings(g) {
    seed = 41;
    const gr = g.createRadialGradient(C * 0.85, C * 0.78, 10, C, C, W * 0.5); gr.addColorStop(0, '#edd09a'); gr.addColorStop(1, '#d0a86c'); g.fillStyle = gr; g.fillRect(0, 0, W, W);
    const ox = C + 22, oy = C - 28;
    let r = 7;
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    while (r < W * 0.75) {
      const late = 0.2 + rnd() * 0.2;
      g.strokeStyle = `rgba(140,86,36,${late})`; g.lineWidth = 2 + rnd() * 4.5;
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) { const rr = r * (1 + 0.035 * Math.sin(3 * a + ph[0]) + 0.02 * Math.sin(7 * a + ph[1]) + 0.012 * Math.sin(13 * a + ph[2])); const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      r += 8 + rnd() * 10;
    }
    g.fillStyle = 'rgba(120,70,28,.35)'; g.beginPath(); g.arc(ox, oy, 4, 0, 7); g.fill();
    // 细裂
    for (const [a0, len] of [[2.4, 0.42], [5.6, 0.25]]) { g.strokeStyle = 'rgba(90,50,18,.28)'; g.lineWidth = 1.6; g.beginPath(); let x = ox + Math.cos(a0) * 30, y = oy + Math.sin(a0) * 30; g.moveTo(x, y); for (let s = 0; s < 14; s++) { const a = a0 + (rnd() - 0.5) * 0.12; x += Math.cos(a) * W * len / 14; y += Math.sin(a) * W * len / 14; g.lineTo(x, y); } g.stroke(); }
    // 径向细线（髓射线）
    for (let i = 0; i < 70; i++) { const a = rnd() * 6.28, r0 = 20 + rnd() * 200; g.strokeStyle = `rgba(150,95,40,${0.04 + rnd() * 0.05})`; g.lineWidth = 1; g.beginPath(); g.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0); g.lineTo(ox + Math.cos(a) * (r0 + 10 + rnd() * 25), oy + Math.sin(a) * (r0 + 10 + rnd() * 25)); g.stroke(); }
  }
  const BASE = { now: ivory, fix: ivory, A: boxwood, B: beech, C: rings };
  function draw(g, s, t, v) {
    const ch = XQ.NAMES[s][t], col = s === 'r' ? '#b3241a' : '#1a1714';
    g.clearRect(0, 0, W, W);
    g.save(); clipDisk(g); BASE[v](g); g.restore();
    // 木纹面上加一层很淡的暖光，让字和边更跳
    ring(g, W * 0.47, 14, col); ring(g, W * 0.452, 10, col); ring(g, W * 0.372, 5, col);
    (v === 'now' ? glyphNow : glyphFix)(g, ch, col);
  }
  const cache = {};
  function tex(s, t, v) {
    const k = s + t + v; if (cache[k]) return cache[k];
    const cv = document.createElement('canvas'); cv.width = cv.height = W; draw(cv.getContext('2d'), s, t, v);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = Core.renderer.capabilities.getMaxAnisotropy();
    return (cache[k] = tx);
  }

  // 二到四级（银、金、玉）的掐丝珐琅字：同一个问题，照原画法只改字的上下位置
  const enCache = {};
  function enamel(s, t, wire, fix) {
    const k = s + t + wire + fix; if (enCache[k]) return enCache[k];
    const ch = XQ.NAMES[s][t], N = 384, c = N / 2, fs = Math.round(N * 0.6), dy = N * 0.03, lw = N * 0.028;
    const mk = draw => { const cv = document.createElement('canvas'); cv.width = cv.height = N; draw(cv.getContext('2d')); return cv; };
    const shape = (g, strokeCol, fillCol) => {
      g.font = `bold ${fs}px ${FONT}`; g.textAlign = 'center'; let y;
      if (fix) { g.textBaseline = 'alphabetic'; const m = g.measureText(ch); y = c + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2; }
      else { g.textBaseline = 'middle'; y = c + dy; }
      g.lineJoin = 'round';
      if (strokeCol) { g.strokeStyle = strokeCol; g.lineWidth = lw; g.strokeText(ch, c, y); }
      if (fillCol) { g.fillStyle = fillCol; g.fillText(ch, c, y); }
    };
    const map = new THREE.CanvasTexture(mk(g => {
      g.save(); g.translate(N * 0.006, N * 0.01); shape(g, 'rgba(30,18,8,.55)', 'rgba(30,18,8,.55)'); g.restore();
      shape(g, wire === 'silver' ? '#e9ebf0' : '#ffd987', null);
      const gr = g.createLinearGradient(0, c - fs * 0.5, 0, c + fs * 0.5);
      if (s === 'r') { gr.addColorStop(0, '#c42a17'); gr.addColorStop(0.5, '#951709'); gr.addColorStop(1, '#640c04'); }
      else { gr.addColorStop(0, '#2c2826'); gr.addColorStop(0.5, '#121010'); gr.addColorStop(1, '#060505'); }
      shape(g, null, gr);
    }));
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Core.renderer.capabilities.getMaxAnisotropy();
    const orm = new THREE.CanvasTexture(mk(g => { g.fillStyle = 'rgb(255,80,0)'; g.fillRect(0, 0, N, N); shape(g, 'rgb(255,40,255)', null); shape(g, null, 'rgb(80,64,0)'); }));
    return (enCache[k] = { map, orm });
  }
  function applyEnamel(fix, wire = 'silver') {
    for (const m of Board.pieces.values()) {
      const ud = m.userData, mat = ud.faceSkin; if (!mat || ud.h) continue;
      const e = enamel(ud.s, ud.t, wire, fix); mat.map = e.map; mat.roughnessMap = mat.metalnessMap = mat.aoMap = e.orm; mat.needsUpdate = true;
    }
  }
  function apply(v) {
    if (v === 'en0' || v === 'en1') return applyEnamel(v === 'en1', window.__wire || 'silver');
    for (const m of Board.pieces.values()) {
      const ud = m.userData; if (ud.h || ud.t === 'h') continue;
      const f = m.children[1]; if (!f || !f.material) continue;
      f.material.map = tex(ud.s, ud.t, v); f.material.needsUpdate = true;
    }
  }
  // 平面对比图：每版一行，汉七个、楚七个
  function sheet(vs, sz = 150) {
    const types = ['r', 'n', 'e', 'a', 'k', 'c', 'p'];
    const cv = document.createElement('canvas'); cv.width = sz * 14 + 40; cv.height = vs.length * (sz + 10) + 10; cv.id = 'faceSheet';
    const g = cv.getContext('2d'); g.fillStyle = '#2a2622'; g.fillRect(0, 0, cv.width, cv.height);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = W; const tg = tmp.getContext('2d');
    vs.forEach((v, i) => ['r', 'b'].forEach((s, j) => types.forEach((t, k) => {
      draw(tg, s, t, v); g.drawImage(tmp, 10 + (j * 7 + k) * sz + j * 20, 10 + i * (sz + 10), sz, sz);
    })));
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:999'; document.body.appendChild(cv);
    return [cv.width, cv.height];
  }
  function diag() {
    const cv = document.createElement('canvas'), g = cv.getContext('2d'); g.font = `bold 310px ${FONT}`; g.textBaseline = 'middle';
    const out = {};
    for (const s of ['r', 'b']) for (const t of Object.keys(XQ.NAMES[s])) { const ch = XQ.NAMES[s][t], m = g.measureText(ch); out[ch] = [Math.round(16 - m.actualBoundingBoxAscent), Math.round(16 + m.actualBoundingBoxDescent)]; }
    return out;   // 每个字墨迹的上沿、下沿离圆心多少像素（512 贴图，里圈半径 190）
  }
  return { apply, sheet, diag, tex };
})();
