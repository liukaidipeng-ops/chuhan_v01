// 金银第四轮：金属照原版，只换棋面（字面）的做法
window.MT4 = (() => {
  const W = 512, c = W / 2, cache = {};
  const NAME = (s, t) => XQ.NAMES[s][t];
  const INK = { r: '#b3241a', b: '#1a1714' };
  const MET = { 2: '#f2f4f7', 3: '#ffd57a' };
  const cv = (fn) => { const e = document.createElement('canvas'); e.width = e.height = W; const g = e.getContext('2d'); fn(g); const t = new THREE.CanvasTexture(e); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const cvLin = (fn) => { const t = cv(fn); t.colorSpace = THREE.NoColorSpace; return t; };
  const ring = (g, r, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); };
  const char = (g, s, t, col, px, stroke) => { g.font = `bold ${px}px ${Board.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; if (stroke) { g.strokeStyle = col; g.lineWidth = stroke; g.strokeText(NAME(s, t), c, c + px * 0.045); } g.fillStyle = col; g.fillText(NAME(s, t), c, c + px * 0.045); };
  function envOf(m) { return (m.userData.faceSkin && m.userData.faceSkin.envMap) || null; }
  // 丙 · 牙面镶边：中间一块牙黄面（照 M13 的木面画法缩小），外圈露出金属
  function texIvory(s, t) { const k = 'iv' + s + t; return cache[k] || (cache[k] = cv(g => {
    const R = 0.415 * W, gr = g.createRadialGradient(c, c * 0.9, 10, c, c, R); gr.addColorStop(0, '#f1e4c0'); gr.addColorStop(1, '#e6d3a4');
    g.beginPath(); g.arc(c, c, R, 0, 7); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(70,50,20,.55)'; g.lineWidth = 3; g.stroke();
    ring(g, 0.385 * W, 12, INK[s]); ring(g, 0.368 * W, 7, INK[s]); ring(g, 0.305 * W, 4, INK[s]);
    char(g, s, t, INK[s], 262, 0);
  })); }
  // 丁 · 漆地金字：一块朱漆 / 黑漆的圆地，字是同色的金（银），一道细金线
  function texEnamel(s, t, lv) { const k = 'en' + s + t + lv; return cache[k] || (cache[k] = { map: cv(g => {
      const R = 0.415 * W; g.beginPath(); g.arc(c, c, R, 0, 7); const gr = g.createRadialGradient(c, c * 0.85, 10, c, c, R); gr.addColorStop(0, s === 'r' ? '#9c2116' : '#1c1a19'); gr.addColorStop(1, s === 'r' ? '#6c120b' : '#0b0a09'); g.fillStyle = gr; g.fill();
      ring(g, 0.372 * W, 6, MET[lv]); char(g, s, t, MET[lv], 262, 6);
    }), orm: cvLin(g => {   // R=ao G=粗糙 B=金属
      g.fillStyle = 'rgb(255,60,0)'; g.beginPath(); g.arc(c, c, 0.415 * W, 0, 7); g.fill();
      const mc = 'rgb(255,85,170)'; ring(g, 0.372 * W, 6, mc); char(g, s, t, mc, 262, 6);
    }) }); }
  // 戊 · 原版 + 色圈：金属面照旧，字换粗楷，字外一圈汉朱 / 楚墨的漆圈分出两边
  function texRing(s, t) { const k = 'rg' + s + t; return cache[k] || (cache[k] = cv(g => {
    ring(g, 0.405 * W, 22, INK[s]); ring(g, 0.36 * W, 4, INK[s]); char(g, s, t, INK[s], 270, 8);
  })); }
  function texBold(s, t) { const k = 'bd' + s + t; return cache[k] || (cache[k] = cv(g => char(g, s, t, INK[s], 300, 8))); }
  function apply(v, lv) {
    for (const m of Board.pieces.values()) {
      const u = m.userData, f = m.children[1]; if (!f || u.h) continue;
      const E = envOf(m);
      if (v === 'ivory') f.material = new THREE.MeshPhysicalMaterial({ map: texIvory(u.s, u.t), transparent: true, roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.2, envMap: E, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -3 });
      if (v === 'enamel') { const T = texEnamel(u.s, u.t, lv); f.material = new THREE.MeshPhysicalMaterial({ map: T.map, roughnessMap: T.orm, metalnessMap: T.orm, roughness: 1, metalness: 1, transparent: true, clearcoat: 0.3, clearcoatRoughness: 0.15, envMap: E, envMapIntensity: 1, polygonOffset: true, polygonOffsetFactor: -3 }); }
      if (v === 'ring') f.material = new THREE.MeshPhysicalMaterial({ map: texRing(u.s, u.t), transparent: true, roughness: 0.4, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.12, envMap: E, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -3 });
      if (v === 'bold' || v === 'satin') f.material = new THREE.MeshStandardMaterial({ map: texBold(u.s, u.t), transparent: true, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3 });
      if (v === 'satin') {   // 己 · 缎面：顶面去掉车削纹和拉丝，换成一层柔和的缎光
        const d = u.deco; if (d) for (const ch of d.children) if (ch.isMesh && ch.geometry.type === 'CircleGeometry') {
          const o = ch.material, n = o.clone(); n.map = null; n.normalMap = null; n.roughnessMap = null; n.metalnessMap = null; n.anisotropy = 0; n.anisotropyMap = null; n.roughness = 0.34; n.metalness = 1; n.needsUpdate = true; ch.material = n;
        }
      }
    }
  }
  return { apply };
})();
