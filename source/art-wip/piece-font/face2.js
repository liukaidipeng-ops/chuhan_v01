// 木棋子字面第二版（接 art-072）：字体打包进来统一粗细、字按「墨迹框 + 重心」居中、年轮三种形态 × 每颗子随机转向翻转
window.FACE2 = (() => {
  const B64 = window.__XQKAI_B64;   // 霞鹜文楷 TC Bold 的子集（只含棋子用到的字），OFL 授权
  const FAM = 'XQKai';
  const FONT = `"${FAM}","KaiTi","STKaiti","Kaiti SC","楷体","BiauKai","Noto Serif CJK SC","Songti SC",serif`;
  const W = 512, C = W / 2;
  let ready = null;
  function load() {
    if (ready) return ready;
    const ff = new FontFace(FAM, `url(data:font/woff2;base64,${B64})`, { weight: '700' });
    document.fonts.add(ff);
    return (ready = ff.load().then(() => true));
  }
  // ---- 字：统一字体 + 一点加粗 + 视觉居中 ----
  const OPT = { fs: 288, emb: 6, lift: 6, mix: 0.5 };   // emb：描边加粗的线宽（512 贴图上的像素）；lift：整体往上提一点（视觉中心比几何中心略高）；mix：墨迹框中心和重心各占多少
  const ctrCache = {};
  // 字的视觉中心离 em 框中心多少（textBaseline 'middle' 时），按字号比例缓存
  function inkCenter(ch, fs, emb) {
    const k = ch + fs + ':' + emb; if (ctrCache[k] != null) return ctrCache[k];
    const N = Math.ceil(fs * 1.6), cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'); g.font = `bold ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.fillStyle = g.strokeStyle = '#000'; g.lineWidth = emb; g.fillText(ch, N / 2, N / 2); if (emb) g.strokeText(ch, N / 2, N / 2);
    const a = g.getImageData(0, 0, N, N).data; let top = N, bot = -1, sum = 0, sy = 0;
    for (let y = 0; y < N; y++) { let row = 0; for (let x = 0; x < N; x++) row += a[(y * N + x) * 4 + 3]; if (row) { if (y < top) top = y; bot = y; sum += row; sy += row * y; } }
    const boxC = (top + bot) / 2 - N / 2, massC = sy / sum - N / 2;
    return (ctrCache[k] = { dy: boxC * (1 - OPT.mix) + massC * OPT.mix, top: top - N / 2, bot: bot - N / 2, boxC, massC });
  }
  function glyph(g, ch, col, o = {}) {
    const fs = o.fs || OPT.fs, emb = o.emb ?? OPT.emb, cx = o.cx ?? C, cy = o.cy ?? C;
    const ic = inkCenter(ch, fs, emb), y = cy - ic.dy - (o.lift ?? OPT.lift) * fs / 280;
    g.font = `bold ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.strokeW + emb; g.strokeText(ch, cx, y); }
    g.fillStyle = col; g.fillText(ch, cx, y);
    if (emb) { g.strokeStyle = col; g.lineWidth = emb; g.strokeText(ch, cx, y); }
    return { y, top: y + ic.top, bot: y + ic.bot };
  }
  // ---- 年轮：三种形态，每颗子随机转、随机翻 ----
  const mul = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // form 0 疏而粗：年轮宽、线粗，像长得快的树；1 密而细：线细、圈挨着圈；2 疏密相间：一段疏一段密，髓心偏到一边
  const FORMS = [
    { gap: [13, 26], lw: [3, 7.5], a: [0.34, 0.55], wob: 0.06, pith: 30, name: '疏粗' },
    { gap: [5, 10], lw: [1.1, 2.8], a: [0.3, 0.5], wob: 0.035, pith: 24, name: '密细' },
    { gap: [5, 24], lw: [1.2, 6], a: [0.3, 0.56], wob: 0.08, pith: 90, name: '疏密' },
  ];
  const ringLayer = {};
  function rings(form, seed) {
    const k = form + ':' + seed; if (ringLayer[k]) return ringLayer[k];
    const F = FORMS[form], R = mul(seed * 7919 + form * 104729), r = (a, b) => a + (b - a) * R();
    const cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d');
    // 底色：比上一版深一点
    const gr = g.createRadialGradient(C * 0.85, C * 0.8, 10, C, C, W * 0.52); gr.addColorStop(0, '#e4c084'); gr.addColorStop(1, '#c69658'); g.fillStyle = gr; g.fillRect(0, 0, W, W);
    const ang = R() * Math.PI * 2, off = r(F.pith * 0.4, F.pith), ox = C + Math.cos(ang) * off, oy = C + Math.sin(ang) * off;
    const ph = [...Array(6)].map(() => R() * 6.28), ell = r(0.9, 1.1), rot = R() * 3.14;
    let rr = r(4, 9), i = 0;
    while (rr < W * 0.85) {
      const lw = r(...F.lw), al = r(...F.a);
      g.strokeStyle = `rgba(${r(105, 130) | 0},${r(58, 78) | 0},${r(20, 34) | 0},${al.toFixed(3)})`; g.lineWidth = lw;
      g.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.04; a += 0.035) {
        const w = 1 + F.wob * (Math.sin(3 * a + ph[0]) * 0.6 + Math.sin(5 * a + ph[1]) * 0.3 + Math.sin(11 * a + ph[2] + rr * 0.01) * 0.15) + 0.015 * Math.sin(23 * a + ph[3] + i);
        const x0 = Math.cos(a) * rr * w * ell, y0 = Math.sin(a) * rr * w / ell;
        const x = ox + x0 * Math.cos(rot) - y0 * Math.sin(rot), y = oy + x0 * Math.sin(rot) + y0 * Math.cos(rot);
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      // 早材一侧的浅色
      g.strokeStyle = `rgba(255,236,196,${r(0.05, 0.12).toFixed(3)})`; g.lineWidth = lw * 0.8; g.stroke();
      const step = form === 2 ? (Math.floor(i / 4) % 2 ? r(4, 9) : r(14, 26)) : r(...F.gap);
      rr += step; i++;
    }
    g.fillStyle = 'rgba(92,52,20,.45)'; g.beginPath(); g.arc(ox, oy, r(3, 6), 0, 7); g.fill();
    // 一两道细裂、髓射线
    const nc = 1 + (R() < 0.6 ? 1 : 0);
    for (let c = 0; c < nc; c++) { const a0 = R() * 6.28, len = r(0.18, 0.4); g.strokeStyle = 'rgba(80,44,16,.32)'; g.lineWidth = r(1.2, 2.2); g.beginPath(); let x = ox + Math.cos(a0) * r(10, 40), y = oy + Math.sin(a0) * r(10, 40); g.moveTo(x, y); for (let s = 0; s < 16; s++) { const a = a0 + (R() - 0.5) * 0.16; x += Math.cos(a) * W * len / 16; y += Math.sin(a) * W * len / 16; g.lineTo(x, y); } g.stroke(); }
    for (let j = 0; j < 80; j++) { const a = R() * 6.28, r0 = r(15, 230), l = r(8, 30); g.strokeStyle = `rgba(120,70,30,${r(0.04, 0.09).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0); g.lineTo(ox + Math.cos(a) * (r0 + l), oy + Math.sin(a) * (r0 + l)); g.stroke(); }
    return (ringLayer[k] = cv);
  }
  // 每颗子：按 id 取形态、转角、翻转
  function look(id) { const R = mul((id | 0) * 2654435761); return { form: Math.floor(R() * 3), seed: Math.floor(R() * 1e6), rot: R() * Math.PI * 2, fx: R() < 0.5 ? -1 : 1, fy: R() < 0.5 ? -1 : 1 }; }
  const ring = (g, r, lw, color) => { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.arc(C, C, r, 0, 7); g.stroke(); };
  function drawFace(g, s, t, id, o = {}) {
    const ch = XQ.NAMES[s][t], col = s === 'r' ? '#b3241a' : '#1a1714', L = o.look || look(id);
    g.clearRect(0, 0, W, W);
    g.save(); g.beginPath(); g.arc(C, C, W * 0.47, 0, 7); g.clip();
    g.translate(C, C); g.rotate(L.rot); g.scale(L.fx, L.fy); g.translate(-C, -C); g.drawImage(rings(L.form, L.seed), 0, 0);
    g.restore();
    ring(g, W * 0.47, 14, col); ring(g, W * 0.452, 10, col); ring(g, W * 0.372, 5, col);
    let gl;
    const GI = window.__GLY && window.__GLY[ch];
    if (GI) {   // 字模图（字体先在本地画成 512 的白字黑底灰度图），着色后盖上去
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = W; const tg = tmp.getContext('2d');
      tg.drawImage(GI, 0, 0, W, W); const d = tg.getImageData(0, 0, W, W), px = d.data, c = parseInt(col.slice(1), 16), r = c >> 16, gg = (c >> 8) & 255, b = c & 255;
      for (let i = 0; i < px.length; i += 4) { const a = px[i]; px[i] = r; px[i + 1] = gg; px[i + 2] = b; px[i + 3] = a; }
      tg.putImageData(d, 0, 0); g.drawImage(tmp, 0, 0); gl = { y: C, top: 0, bot: 0 };
    } else gl = glyph(g, ch, col, o);
    if (o.guide) {   // 自查用：圆心十字、里圈、字的墨迹上下沿
      g.strokeStyle = 'rgba(0,140,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(C - 30, C); g.lineTo(C + 30, C); g.moveTo(C, C - 30); g.lineTo(C, C + 30); g.stroke();
      g.strokeStyle = 'rgba(0,170,80,.9)'; g.beginPath(); g.moveTo(60, gl.top); g.lineTo(W - 60, gl.top); g.moveTo(60, gl.bot); g.lineTo(W - 60, gl.bot); g.stroke();
    }
    return gl;
  }
  const texCache = {};
  function tex(s, t, id) {
    const k = s + t + id + (window.__GLYK || ''); if (texCache[k]) return texCache[k];
    const cv = document.createElement('canvas'); cv.width = cv.height = W; drawFace(cv.getContext('2d'), s, t, id);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = Core.renderer.capabilities.getMaxAnisotropy();
    return (texCache[k] = tx);
  }
  function apply() {
    for (const m of Board.pieces.values()) {
      const ud = m.userData; if (ud.h || ud.t === 'h' || ud.faceSkin && m.children[1].material === ud.faceSkin) continue;
      const f = m.children[1]; f.material.map = tex(ud.s, ud.t, ud.id); f.material.needsUpdate = true;
    }
  }
  // 银金玉的掐丝珐琅字：同样换字体、同样居中
  const enCache = {};
  function enamel(s, t, wire) {
    const k = s + t + wire; if (enCache[k]) return enCache[k];
    const ch = XQ.NAMES[s][t], N = 384, c = N / 2, fs = Math.round(N * 0.56), lw = N * 0.028;
    const mk = draw => { const cv = document.createElement('canvas'); cv.width = cv.height = N; draw(cv.getContext('2d')); return cv; };
    const emb = Math.round(OPT.emb * N / 512), ic = inkCenter(ch, fs, emb), y = c - ic.dy - OPT.lift * fs / 280;
    const shape = (g, strokeCol, fillCol) => {
      g.font = `bold ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if (strokeCol) { g.strokeStyle = strokeCol; g.lineWidth = lw + emb; g.strokeText(ch, c, y); }
      if (fillCol) { g.fillStyle = fillCol; g.fillText(ch, c, y); if (emb) { g.strokeStyle = fillCol; g.lineWidth = emb; g.strokeText(ch, c, y); } }
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
  function applyEnamel(wire) {
    for (const m of Board.pieces.values()) {
      const ud = m.userData, mat = ud.faceSkin; if (!mat || ud.h) continue;
      const e = enamel(ud.s, ud.t, wire); mat.map = e.map; mat.roughnessMap = mat.metalnessMap = mat.aoMap = e.orm; mat.needsUpdate = true;
    }
  }
  // 自查用平面图：所有字、每个字几种年轮；guide = 画辅助线
  function sheet(o = {}) {
    const types = ['r', 'n', 'e', 'a', 'k', 'c', 'p'], sz = o.sz || 180, rows = o.rows || 3;
    const cv = document.createElement('canvas'); cv.width = sz * 14 + 30; cv.height = rows * (sz + 8) + 8; cv.id = 'faceSheet';
    const g = cv.getContext('2d'); g.fillStyle = '#2a2622'; g.fillRect(0, 0, cv.width, cv.height);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = W; const tg = tmp.getContext('2d'); const info = [];
    for (let i = 0; i < rows; i++) ['r', 'b'].forEach((s, j) => types.forEach((t, k) => {
      const id = 1000 + i * 37 + j * 7 + k, gl = drawFace(tg, s, t, id, { guide: o.guide, look: o.forms ? { form: i % 3, seed: id, rot: (id * 1.7) % 6.28, fx: 1, fy: 1 } : null });
      if (i === 0) info.push([XQ.NAMES[s][t], Math.round(gl.top - C), Math.round(gl.bot - C)]);
      g.drawImage(tmp, 8 + (j * 7 + k) * sz + j * 14, 8 + i * (sz + 8), sz, sz);
    }));
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:999'; document.body.appendChild(cv);
    return { size: [cv.width, cv.height], info };
  }
  // 自查：每个字确实是用打包进来的字体画的（和只写 XQKai 画出来的像素一样）
  function verifyFont() {
    const out = {};
    for (const s of ['r', 'b']) for (const t of Object.keys(XQ.NAMES[s])) {
      const ch = XQ.NAMES[s][t], px = f => { const cv = document.createElement('canvas'); cv.width = cv.height = 120; const g = cv.getContext('2d'); g.font = `bold 100px ${f}`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(ch, 60, 60); return g.getImageData(0, 0, 120, 120).data; };
      const a = px(FONT), b = px(`"${FAM}"`), c = px('serif'); let dab = 0, dac = 0; for (let i = 3; i < a.length; i += 4) { dab += Math.abs(a[i] - b[i]); dac += Math.abs(a[i] - c[i]); }
      out[ch] = dab === 0 && dac > 0 ? 'ok' : `diff ${dab} / vs serif ${dac}`;
    }
    return { loaded: document.fonts.check(`bold 100px "${FAM}"`), out };
  }
  return { load, apply, applyEnamel, sheet, verifyFont, inkCenter, OPT, look };
})();
