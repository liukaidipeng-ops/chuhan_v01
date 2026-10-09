// 血条样图：在真实技能对局上摆一盘中局，换血条样式（不改游戏代码）
window.HP = (() => {
  const LAY = [ // s,t,f,r(汉在下),lv,hp
    ['r','k',4,0,1,1],['r','a',3,0,1,1],['r','a',5,0,1,1],['r','e',2,0,1,1],['r','e',6,0,1,1],
    ['r','r',2,5,3,2],['r','r',8,1,1,1],['r','n',2,2,2,2],['r','n',6,4,3,1],['r','c',4,2,3,3],['r','c',7,2,1,1],
    ['r','p',4,5,4,3],['r','p',0,3,1,1],['r','p',8,3,1,1],['r','p',6,3,2,1],
    ['b','k',4,9,1,1],['b','a',3,9,1,1],['b','a',5,9,1,1],['b','e',2,9,1,1],['b','e',6,9,1,1],
    ['b','r',1,7,3,3],['b','r',7,6,2,1],['b','n',6,7,2,2],['b','n',2,7,1,1],['b','c',4,7,3,2],['b','c',1,9,1,1],
    ['b','p',4,6,2,2],['b','p',0,6,1,1],['b','p',8,6,1,1],['b','p',2,6,1,1],
  ];
  function setup() {
    const G = Board.lastGame; let redLow = false;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = G.board[r][f]; if (p && p.t === 'k' && p.s === 'r') redLow = r < 5; }
    const pool = {}; for (const row of G.board) for (const p of row) if (p) (pool[p.s + p.t] = pool[p.s + p.t] || []).push(p);
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) G.board[r][f] = null;
    for (const [s, t, f, r, lv, hp] of LAY) {
      const p = pool[s + t].shift(); Object.assign(p, { lv, hp, xp: 0, kills: 0, cd: 0, jm: 0 });
      const rr = redLow ? r : 9 - r, ff = redLow ? f : 8 - f; G.board[rr][ff] = p;
    }
    Board.setPosition(G);
  }
  // ---------- 画布工具 ----------
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const COL = { r: { hi: '#ff7a5c', mid: '#e3341f', lo: '#a3170c', ink: '#5a0d06' }, b: { hi: '#6fe0a0', mid: '#22a35c', lo: '#0f6a38', ink: '#06301a' } };
  const IV = '#f7ecd2', INK = '#1a1410';
  const cache = new Map();
  const tex = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };
  // A 加粗胶囊：原来的样子放大两倍多，象牙白粗框 + 外圈墨线，空格看得出
  function texA(hp, max, s) {
    return tex('A' + s + hp + max, () => {
      const S = 4, seg = 30 * S, gap = 3 * S, b = 4 * S, o = 2.5 * S, H = 30 * S, W = 2 * (b + o) + max * seg + (max - 1) * gap;
      const t = cv(W, H, (g) => {
        const C = COL[s];
        rr(g, o / 2, o / 2, W - o, H - o, (H - o) / 2); g.fillStyle = INK; g.fill();
        rr(g, o, o, W - 2 * o, H - 2 * o, (H - 2 * o) / 2); g.fillStyle = IV; g.fill();
        const x0 = o + b, y0 = o + b, h = H - 2 * (o + b);
        rr(g, x0 - 1, y0 - 1, W - 2 * x0 + 2, h + 2, h / 2); g.fillStyle = '#2a211a'; g.fill();
        for (let i = 0; i < max; i++) {
          const x = x0 + i * (seg + gap), first = i === 0, last = i === max - 1;
          g.save(); g.beginPath(); rr(g, x, y0, seg, h, first || last ? h / 2 : 2 * S);
          if (!first && !last) {} else { g.beginPath(); const R = h / 2; if (first && last) rr(g, x, y0, seg, h, R); else if (first) { g.moveTo(x + R, y0); g.lineTo(x + seg, y0); g.lineTo(x + seg, y0 + h); g.lineTo(x + R, y0 + h); g.arc(x + R, y0 + R, R, Math.PI / 2, Math.PI * 1.5); } else { g.moveTo(x, y0); g.lineTo(x + seg - R, y0); g.arc(x + seg - R, y0 + R, R, -Math.PI / 2, Math.PI / 2); g.lineTo(x, y0 + h); } g.closePath(); }
          if (i < hp) { const gr = g.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, C.hi); gr.addColorStop(0.5, C.mid); gr.addColorStop(1, C.lo); g.fillStyle = gr; g.fill(); g.clip(); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x, y0 + 2 * S, seg, 3 * S); }
          else { g.fillStyle = '#4a3d33'; g.fill(); g.clip(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3 * S; g.stroke(); }
          g.restore();
        }
      });
      t.userData = { w: W / S, h: H / S }; return t;
    });
  }
  // B 血珠：一点血一颗珠，象牙白圈 + 墨线；掉的血是空圈
  function texB(hp, max, s) {
    return tex('B' + s + hp + max, () => {
      const S = 4, d = 30 * S, gap = 3 * S, W = max * d + (max - 1) * gap + 4 * S, H = d + 4 * S;
      const t = cv(W, H, (g) => {
        const C = COL[s];
        for (let i = 0; i < max; i++) {
          const cx = 2 * S + d / 2 + i * (d + gap), cy = H / 2, R = d / 2;
          g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = INK; g.fill();
          g.beginPath(); g.arc(cx, cy, R - 2.5 * S, 0, 7); g.fillStyle = IV; g.fill();
          g.beginPath(); g.arc(cx, cy, R - 6 * S, 0, 7);
          if (i < hp) { const gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, 1, cx, cy, R); gr.addColorStop(0, C.hi); gr.addColorStop(0.55, C.mid); gr.addColorStop(1, C.lo); g.fillStyle = gr; g.fill();
            g.beginPath(); g.ellipse(cx - R * 0.22, cy - R * 0.3, R * 0.28, R * 0.16, -0.5, 0, 7); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill(); }
          else { g.fillStyle = '#4a3d33'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2.5 * S; g.stroke(); }
        }
      });
      t.userData = { w: W / S, h: H / S }; return t;
    });
  }
  // C 印章数字：一枚方印写剩下几点血，底下一排小格表示满血几格
  const FONT = getComputedStyle(document.body).getPropertyValue('--ef') || 'serif';
  function texC(hp, max, s) {
    return tex('C' + s + hp + max, () => {
      const S = 4, B = 40 * S, ph = 11 * S, pg = 2 * S, W = B + 4 * S, pw = (B - (max - 1) * pg) / max, H = B + ph + 6 * S + 4 * S;
      const t = cv(W, H, (g) => {
        const C = COL[s], x = 2 * S, y = 2 * S;
        rr(g, x, y, B, B, 7 * S); g.fillStyle = INK; g.fill();
        rr(g, x + 2.5 * S, y + 2.5 * S, B - 5 * S, B - 5 * S, 5 * S); g.fillStyle = C.mid; g.fill();
        rr(g, x + 6 * S, y + 6 * S, B - 12 * S, B - 12 * S, 3 * S); g.strokeStyle = IV; g.lineWidth = 2 * S; g.stroke();
        g.font = `900 ${30 * S}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = IV; g.fillText(String(hp), x + B / 2, y + B / 2 + 2 * S);
        const py = y + B + 3 * S;
        rr(g, x, py - 1.5 * S, B, ph + 3 * S, (ph + 3 * S) / 2); g.fillStyle = INK; g.fill();
        for (let i = 0; i < max; i++) { const px = x + i * (pw + pg); rr(g, px + 1.5 * S, py + 1.5 * S, pw - 3 * S, ph - 3 * S, (ph - 3 * S) / 2); g.fillStyle = i < hp ? C.hi : '#4a3d33'; g.fill(); }
      });
      t.userData = { w: W / S, h: H / S }; return t;
    });
  }
  // D 地上血环：棋子脚下一圈弧段，一点血一段
  function ringD(hp, max, s) {
    const grp = new THREE.Group(), C = COL[s], gap = 0.12, R0 = 0.47, R1 = 0.56;
    const arc = (a0, a1, col, op) => { const geo = new THREE.RingGeometry(R0, R1, 40, 1, a0, a1 - a0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; return m; };
    const out = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.018, R1 + 0.018, 64), new THREE.MeshBasicMaterial({ color: 0x1a1410, transparent: true, opacity: 0.85, depthWrite: false })); out.rotation.x = -Math.PI / 2; grp.add(out);
    const span = (Math.PI * 2 - gap * max) / max;
    for (let i = 0; i < max; i++) { const a0 = Math.PI / 2 + gap / 2 + i * (span + gap); const m = arc(a0, a0 + span, i < hp ? C.mid : 0x4a3d33, 1); m.position.y = 0.001; grp.add(m); }
    grp.position.y = 0.006; return grp;
  }

  function ringE(hp, max, s) {
    const grp = new THREE.Group(), C = COL[s], gap = 0.16, R0 = 0.455, R1 = 0.535;
    const mat = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    const out = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.016, R1 + 0.016, 72), mat(0x1a1410, 0.9)); out.rotation.x = -Math.PI / 2; out.renderOrder = 7; grp.add(out);
    const span = (Math.PI * 2 - gap * max) / max;
    for (let i = 0; i < max; i++) {
      const a0 = Math.PI / 2 + gap / 2 + i * (span + gap);
      const m = new THREE.Mesh(new THREE.RingGeometry(R0, R1, 40, 1, a0, span), mat(i < hp ? C.mid : 0x55473c, 1)); m.rotation.x = -Math.PI / 2; m.renderOrder = 8; grp.add(m);
      if (i < hp) { const hl = new THREE.Mesh(new THREE.RingGeometry(R1 - 0.022, R1 - 0.008, 40, 1, a0 + 0.04, span - 0.08), mat(C.hi, 1)); hl.rotation.x = -Math.PI / 2; hl.renderOrder = 9; grp.add(hl); }
    }
    grp.position.y = 0.205; return grp;
  }

  // ===== 第二轮（056 批复）：都做成立体的、长在棋子上；楚军换成不那么艳的铜绿 =====
  const C3 = { r: { m: 0xb8382b, hi: 0xe07a62, e: 0x5a1208 }, b: { m: 0x4f8a78, hi: 0x9cc7b6, e: 0x123a30 } };
  const LOST = 0x3a302a, GOLDC = 0xc9a14a, PH0 = 0.2;
  const std = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.18 }, o));
  const sector = (R0, R1, a0, a1) => { const sh = new THREE.Shape(); sh.absarc(0, 0, R1, a0, a1, false); sh.absarc(0, 0, R0, a1, a0, true); sh.closePath(); return sh; };
  // 屏幕“上方”在棋子自己坐标里的角度（宝珠、靠旗都排在棋子靠屏幕上方那一边）
  function farAngle(m, up) { const q = new THREE.Quaternion(); m.getWorldQuaternion(q); const v = up.clone().applyQuaternion(q.invert()); return Math.atan2(-v.z, v.x); }
  // 甲 · 光环（立体）：棋面外缘一圈珐琅镶条，一点血一段，掉了的血是凹下去的暗槽
  function halo3(hp, max, s) {
    const g = new THREE.Group(), C = C3[s], R0 = 0.345, R1 = 0.428, gap = 0.2, span = (Math.PI * 2 - gap * max) / max;
    for (let i = 0; i < max; i++) {
      const a0 = Math.PI / 2 + gap / 2 + i * (span + gap), on = i < hp;
      const geo = new THREE.ExtrudeGeometry(sector(R0, R1, a0, a0 + span), { depth: on ? 0.018 : 0.004, bevelEnabled: true, bevelThickness: on ? 0.008 : 0.002, bevelSize: 0.007, bevelSegments: 3, curveSegments: 32 });
      geo.rotateX(-Math.PI / 2);
      const mm = new THREE.Mesh(geo, on ? std({ color: C.m, emissive: C.m, emissiveIntensity: 0.18 }) : new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.28, depthWrite: false }));
      mm.position.y = PH0 + 0.002; g.add(mm);
    }
    return g;
  }
  // 乙 · 镶珠：棋面靠屏幕上方那一边镶一排宝珠，一点血一颗；掉了的血只剩空托
  function jewels(hp, max, s, a) {
    const g = new THREE.Group(), C = C3[s], R = 0.355, step = 0.46;
    for (let i = 0; i < max; i++) {
      const t = a + (i - (max - 1) / 2) * step, x = Math.cos(t) * R, z = -Math.sin(t) * R;
      const cup = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.017, 10, 28), new THREE.MeshStandardMaterial({ color: GOLDC, metalness: 1, roughness: 0.3, envMap: ENV() })); cup.rotation.x = -Math.PI / 2; cup.position.set(x, PH0 + 0.012, z); g.add(cup);
      if (i < hp) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.076, 24, 16), std({ color: C.m, emissive: C.m, emissiveIntensity: 0.25, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, envMap: ENV(), envMapIntensity: 0.6 })); b.scale.y = 0.8; b.position.set(x, PH0 + 0.022, z); g.add(b); }
      else { const h = new THREE.Mesh(new THREE.CircleGeometry(0.064, 20), new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 1 })); h.rotation.x = -Math.PI / 2; h.position.set(x, PH0 + 0.006, z); g.add(h); }
    }
    return g;
  }
  // 丙 · 靠旗：棋子背后插几面小旗（像戏台上武将背的靠旗），一点血一面；掉的血只剩折断的旗杆
  function flags(hp, max, s, a) {
    const g = new THREE.Group(), C = C3[s], fan = 0.42;
    const pole = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.7 }), cloth = std({ color: C.m, side: THREE.DoubleSide, clearcoat: 0, roughness: 0.6, emissive: C.m, emissiveIntensity: 0.15 }), edge = std({ color: GOLDC, side: THREE.DoubleSide, clearcoat: 0, roughness: 0.5, metalness: 0.4 });
    for (let i = 0; i < max; i++) {
      const t = a + (i - (max - 1) / 2) * fan, on = i < hp, L = on ? 0.6 : 0.16;
      const arm = new THREE.Group(); arm.position.set(Math.cos(t) * 0.3, PH0, -Math.sin(t) * 0.3); arm.rotation.y = t - Math.PI / 2; g.add(arm);
      const tilt = new THREE.Group(); tilt.rotation.x = -0.32; arm.add(tilt);   // 往后、往外斜
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, L, 6), pole); p.position.y = L / 2; tilt.add(p);
      if (on) {
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.24, -0.08); sh.lineTo(0, -0.21); sh.closePath();
        const f = new THREE.Mesh(new THREE.ShapeGeometry(sh), cloth); f.position.set(0.01, L - 0.01, 0); tilt.add(f);
        const sh2 = new THREE.Shape(); sh2.moveTo(0, 0.01); sh2.lineTo(0.265, -0.08); sh2.lineTo(0, -0.228); sh2.closePath();
        const e = new THREE.Mesh(new THREE.ShapeGeometry(sh2), edge); e.position.set(0.005, L - 0.005, -0.002); tilt.add(e);
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), edge); k.position.y = L + 0.012; tilt.add(k);
      } else { p.rotation.z = 0.5; p.position.x = 0.03; }
    }
    return g;
  }
  // 丁 · 叠台：棋子垫在几层圆台上，一点血一层；掉的血那层是素木
  function stack(m, hp, max, s) {
    const g = new THREE.Group(), C = C3[s], h = 0.05, H = h * max;
    m.position.y += H; g.position.y = -H;
    for (let i = 0; i < max; i++) {
      const on = i < hp, r = 0.53 - i * 0.04;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.006, h - 0.004, 64), on ? std({ color: C.m, emissive: C.m, emissiveIntensity: 0.12 }) : new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.8 }));
      c.position.y = i * h + h / 2; g.add(c);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(r - 0.002, 0.004, 6, 64), new THREE.MeshStandardMaterial({ color: on ? GOLDC : 0x5a4530, metalness: on ? 1 : 0, roughness: 0.35, envMap: ENV() })); lip.rotation.x = Math.PI / 2; lip.position.y = i * h + h - 0.004; g.add(lip);
    }
    return g;
  }
  // 戊 · 地光：棋子脚下一圈柔光，一点血一段；被棋子挡住的地方照样挡住
  const glowCache = {};
  function glowTex(hp, max, s) {
    const k = s + hp + max; if (glowCache[k]) return glowCache[k];
    const N = 512, c = N / 2, e = document.createElement('canvas'); e.width = e.height = N; const g = e.getContext('2d');
    const col = s === 'r' ? [224, 92, 66] : [110, 175, 152], gap = 0.24, span = (Math.PI * 2 - gap * max) / max, R = 0.54 / 0.7 * c;
    for (let i = 0; i < max; i++) {
      const a0 = -Math.PI / 2 + gap / 2 + i * (span + gap), on = i < hp;
      g.save(); g.filter = 'blur(10px)'; g.strokeStyle = on ? `rgba(${col},.75)` : 'rgba(40,30,24,.22)'; g.lineWidth = 46; g.lineCap = 'round'; g.beginPath(); g.arc(c, c, R, a0 + 0.06, a0 + span - 0.06); g.stroke(); g.restore();
      if (on) { g.save(); g.filter = 'blur(2px)'; g.strokeStyle = `rgba(${col.map(v => Math.min(255, v + 60))},.95)`; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.arc(c, c, R, a0 + 0.06, a0 + span - 0.06); g.stroke(); g.restore(); }
    }
    const t = new THREE.CanvasTexture(e); t.colorSpace = THREE.SRGBColorSpace; return (glowCache[k] = t);
  }
  function glow(hp, max, s) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: glowTex(hp, max, s), transparent: true, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.y = 0.004; return p; }
  let envCache = null; const ENV = () => { if (envCache) return envCache; for (const m of Board.pieces.values()) { const f = m.userData.faceSkin; if (f && f.envMap) return (envCache = f.envMap); } return null; };

  // ===== 第三轮（059 批复）：立体光环挪到脚下；楚军换低饱和的蓝 =====
  const CB = { r: C3.r, b: { m: 0x4d6c8c, hi: 0xa3b8cf, e: 0x14263a } };
  function halo3b(hp, max, s) { const save = C3.b; C3.b = CB.b; const g = halo3(hp, max, s); C3.b = save; return g; }
  // 乙 · 脚下贴地一圈：棋子外面、贴着棋盘的一圈珐琅条，有厚度和倒角
  function footRing(hp, max, s, W = 0.105, D = 0.026) {
    const g = new THREE.Group(), C = CB[s], R0 = 0.452, R1 = R0 + W, gap = 0.2, span = (Math.PI * 2 - gap * max) / max;
    const base = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.006, R1 + 0.006, 72), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false }));
    base.rotation.x = -Math.PI / 2; base.position.y = 0.003; base.scale.setScalar(1); g.add(base);
    for (let i = 0; i < max; i++) {
      const a0 = Math.PI / 2 + gap / 2 + i * (span + gap), on = i < hp;
      const bs = Math.min(0.008, W * 0.12), geo = new THREE.ExtrudeGeometry(sector(R0 + bs, R1 - bs, a0, a0 + span), { depth: on ? D : 0.004, bevelEnabled: true, bevelThickness: on ? D * 0.4 : 0.002, bevelSize: bs, bevelSegments: 3, curveSegments: 32 });
      geo.rotateX(-Math.PI / 2);
      const mm = new THREE.Mesh(geo, on ? std({ color: C.m, emissive: C.m, emissiveIntensity: 0.18 }) : new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.3, depthWrite: false }));
      mm.position.y = 0.004; mm.castShadow = on; g.add(mm);
    }
    return g;
  }
  // 丙 · 底座圈：贴着棋子底边围一圈（像给棋子加了个底座），一点血一段
  function plinth(hp, max, s) {
    const g = new THREE.Group(), C = CB[s], R = 0.445, H = 0.07, gap = 0.18, span = (Math.PI * 2 - gap * max) / max;
    for (let i = 0; i < max; i++) {
      const a0 = gap / 2 + i * (span + gap), on = i < hp;
      const geo = new THREE.CylinderGeometry(R + (on ? 0.02 : 0.008), R + (on ? 0.032 : 0.012), H, 40, 1, false, a0, span);
      const mm = new THREE.Mesh(geo, on ? std({ color: C.m, emissive: C.m, emissiveIntensity: 0.18 }) : new THREE.MeshStandardMaterial({ color: 0x3a302a, roughness: 0.9 }));
      mm.position.y = H / 2; mm.castShadow = on; g.add(mm);
      if (on) { const lip = new THREE.Mesh(new THREE.TorusGeometry(R + 0.022, 0.006, 6, 40, span), new THREE.MeshStandardMaterial({ color: GOLDC, metalness: 1, roughness: 0.3, envMap: ENV() })); lip.rotation.x = Math.PI / 2; lip.rotation.z = -a0 + Math.PI / 2 - span; lip.position.y = H; g.add(lip); }
    }
    return g;
  }
  function clear(m) { const d = m.userData.deco; if (!d) return; for (const c of [...d.children]) if (c.userData.hpBar || c.userData.mk) { d.remove(c); } }
  // style: cur / A / B / C / D；k = 尺寸倍数；fixed = 不随镜头远近变小（屏幕上固定大小，单位 px）
  function style(st, o = {}) {
    Board.setPosition(Board.lastGame);
    if (st === 'cur') return;
    Core.camera.updateMatrixWorld(); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(Core.camera.quaternion); up.y = 0; up.normalize();
    const fov = Core.camera.fov * Math.PI / 180, px = 2 * Math.tan(fov / 2) / Core.renderer.domElement.clientHeight;
    for (const m of Board.pieces.values()) {
      const d = m.userData.deco; if (!d) continue;
      const bar = d.children.find(c => c.userData.hpBar); if (!bar) continue;
      const { hp, max } = bar.userData.hpBar, s = m.userData.s; clear(m);
      if ('HJFSGRKLMN'.includes(st)) { const a = farAngle(m, up); const g = st === 'R' ? halo3b(hp, max, s) : st === 'K' ? footRing(hp, max, s) : st === 'M' ? footRing(hp, max, s, 0.068, 0.018) : st === 'N' ? footRing(hp, max, s, 0.045, 0.013) : st === 'L' ? plinth(hp, max, s) : st === 'H' ? halo3(hp, max, s) : st === 'J' ? jewels(hp, max, s, a) : st === 'F' ? flags(hp, max, s, a) : st === 'S' ? stack(m, hp, max, s) : glow(hp, max, s); g.userData.mk = 1; d.add(g); continue; }
      if (st === 'D' || st === 'E') { const g = (st === 'E' ? ringE : ringD)(hp, max, s); g.userData.mk = 1; d.add(g); continue; }
      const t = st === 'A' ? texA(hp, max, s) : st === 'B' ? texB(hp, max, s) : texC(hp, max, s);
      const fixed = !!o.px, mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: !fixed });
      const sp = new THREE.Sprite(mat); sp.renderOrder = 7; sp.userData.mk = 1;
      const H = fixed ? o.px * px : (o.h || (st === 'C' ? 0.3 : 0.16));   // 高度：世界单位，或屏幕像素
      sp.scale.set(H * t.userData.w / t.userData.h, H, 1);
      // 底边放在棋子顶面靠屏幕上方的边缘（按当前镜头算），俯瞰时也不压字
      const P = new THREE.Vector3(); m.getWorldPosition(P); P.y += 0.2; P.addScaledVector(up, o.lift != null ? o.lift : 0.47);
      sp.center.set(0.5, 0); sp.position.copy(m.worldToLocal(P)); d.add(sp);
    }
  }
  return { setup, style, texA, texB, texC };
})();
