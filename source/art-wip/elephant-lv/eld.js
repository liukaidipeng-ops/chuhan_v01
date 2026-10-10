// 楚战象：和汉相一样按等级换造型（Ham 10-10：「不额外增加象的数量，楚战象每级的造型会有变化，越变越牛逼越帅！体型可能也会变大」）
// 三个方案 a / b / c，各一到四级。底子是 Models.makeElephant，在它的 body / head / tower / 腿上加件。设计稿用，不进游戏。
window.ElephantLV = (() => {
  const { P, G, inkedMerged, C } = Models, PI = Math.PI, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SCALE = [1, 1.1, 1.22, 1.36];   // 一级到四级，越来越大
  const BR = 0x9a7a3c, BR2 = 0x6e5524, IRON = 0x3a3836, IRON2 = 0x55524d, GOLD = 0xd6a43e, GOLD2 = 0xf7dc8c, RED = 0x9e2418, LAC = 0x1e1a1a, OCHRE = 0xc69a3c;
  const add = (grp, parts, ink = 0.025) => { const m = inkedMerged(parts, ink); grp.add(m); return m; };
  const glowMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  function flame(grp, x, y, z, s = 1) {   // 一簇火：三层锥，外橙内黄
    const f = new THREE.Group(); f.position.set(x, y, z); grp.add(f);
    for (const [r, h, c, dy] of [[0.16, 0.5, 0xff6a1c, 0.25], [0.1, 0.38, 0xffb030, 0.2], [0.05, 0.24, 0xfff0a0, 0.13]]) { const m = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), glowMat(c)); m.position.y = dy * s; f.add(m); }
    return f;
  }
  const tuskTips = [1, -1].map(s => [1.62, -0.35, 0.32 * s]);
  const legRings = (el, col, n = 2) => { for (const L of el.legs) add(L.knee, Array.from({ length: n }, (_, i) => P(G.cyl(0.31, 0.31, 0.07, 10), col, 0, -0.12 - i * 0.22, 0))); };
  const trunkRings = (el, col, n = 3) => el.trunk.slice(0, n).forEach((sg, i) => add(sg, [P(G.cyl(0.235 - i * 0.022, 0.235 - i * 0.022, 0.08, 9), col, 0, -0.15, 0)]));
  const barding = (el, c1, c2, rows = 4) => {   // 身侧的札甲：一排排甲片
    const ps = [];
    for (const s of [1, -1]) for (let r = 0; r < rows; r++) for (let i = 0; i < 7; i++) ps.push(P(G.box(0.3, 0.24, 0.05), (r + i) % 2 ? c1 : c2, -1.0 + i * 0.32, 1.95 + r * 0.25, 1.02 * s, 0.12 * s, 0, 0));
    add(el.body, ps, 0.015);
  };
  const tuskBlades = (el, col, len = 0.8) => add(el.head, tuskTips.map(([x, y, z]) => P(G.cone(0.07, len, 6), col, x + len * 0.42, y + 0.22, z, 0, 0, -PI / 2 - 0.5)));
  // ---------------- 甲 · 铁甲战象：铜 → 乌铁 → 鎏金，越打越重 ----------------
  function planA(el, lv) {
    if (lv >= 2) {
      add(el.head, [P(G.box(0.14, 0.82, 0.78), lv >= 4 ? GOLD : lv === 3 ? IRON : BR, 0.94, 0.18, 0, 0, 0, 0.35), P(G.box(0.16, 0.08, 0.8), lv >= 4 ? GOLD2 : BR2, 0.98, 0.55, 0, 0, 0, 0.35)]);
      add(el.head, tuskTips.map(([x, y, z]) => P(G.cone(0.075, 0.22, 6), lv >= 4 ? GOLD2 : BR, x + 0.05, y + 0.06, z, 0, 0, -PI / 2 - 0.5)));
      if (lv === 2) add(el.body, [1, -1].flatMap(s => [P(G.box(2.3, 1.2, 0.05), RED, -0.1, 2.3, 1.0 * s), P(G.box(2.34, 0.1, 0.08), BR, -0.1, 1.72, 1.02 * s), P(G.box(2.34, 0.1, 0.08), BR, -0.1, 2.9, 1.02 * s)]));
      legRings(el, lv >= 4 ? GOLD2 : lv === 3 ? IRON2 : BR, lv >= 3 ? 3 : 2); trunkRings(el, lv >= 4 ? GOLD : lv === 3 ? IRON2 : BR, lv >= 3 ? 4 : 2);
    }
    if (lv >= 3) {
      barding(el, lv >= 4 ? GOLD : IRON, lv >= 4 ? 0xc4922e : IRON2, 4);
      tuskBlades(el, lv >= 4 ? GOLD2 : C.metal, lv >= 4 ? 1.1 : 0.85);
      add(el.head, [0, 1, 2].map(i => P(G.cone(0.06, 0.32, 5), lv >= 4 ? GOLD2 : C.metal, 0.98 - i * 0.18, 0.72 - i * 0.05, 0, 0, 0, -0.3 - i * 0.1)));   // 额上一排尖刺
      add(el.tower, [P(G.box(1.25, 0.42, 0.04), lv >= 4 ? RED : IRON, 0, 0.42, 0.5), P(G.box(1.25, 0.42, 0.04), lv >= 4 ? RED : IRON, 0, 0.42, -0.5), ...[-0.4, 0, 0.4].map(x => P(G.box(0.18, 0.26, 0.05), lv >= 4 ? GOLD2 : BR, x, 0.46, 0.53))]);
    }
    if (lv >= 4) {
      add(el.tower, [P(G.cyl(0.04, 0.04, 1.0, 6), GOLD, 0, 1.6, 0), P(G.cone(0.85, 0.35, 8), GOLD, 0, 1.75, 0), P(G.cone(0.55, 0.3, 8), RED, 0, 2.05, 0), P(G.sph(0.09, 6), GOLD2, 0, 2.25, 0),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => P(G.box(0.04, 0.26, 0.04), RED, Math.cos(i * PI / 4) * 0.82, 1.52, Math.sin(i * PI / 4) * 0.82))]);
      add(el.head, [P(G.cone(0.1, 0.5, 6), RED, 0.82, 1.0, 0, 0, 0, -0.35), P(G.cyl(0.42, 0.42, 0.06, 12), GOLD2, 0.7, 0.7, 0, 0, 0, 0.3)]);
    }
  }
  // ---------------- 乙 · 火象：燧象（尾巴绑火把冲阵）的路子，火越烧越旺 ----------------
  function planB(el, lv) {
    flame(el.torch, 0, -0.05, 0, 0.7 + lv * 0.18);
    add(el.head, [P(G.box(0.03, 0.06, 0.5), RED, 0.86, 0.32, 0.22, 0, 0.3, 0.2), P(G.box(0.03, 0.06, 0.5), RED, 0.86, 0.32, -0.22, 0, -0.3, 0.2)]);   // 额上红纹
    if (lv >= 2) {
      for (const [x, z] of [[0.55, 0.45], [0.55, -0.45]].concat(lv >= 3 ? [[-0.55, 0.45], [-0.55, -0.45]] : [])) { add(el.tower, [P(G.cyl(0.13, 0.07, 0.14, 8), lv >= 4 ? GOLD : BR, x, 1.18, z), P(G.cyl(0.02, 0.02, 0.1, 5), BR2, x, 1.08, z)]); flame(el.tower, x, 1.22, z, 0.55 + lv * 0.08); }
      legRings(el, 0x2a1210, 1);
      if (lv === 2) add(el.body, [1, -1].map(s => P(G.box(2.3, 1.2, 0.05), 0x5a1a12, -0.1, 2.3, 1.0 * s)));
    }
    if (lv >= 3) {   // 青铜兽面：两只弯角 + 獠牙口
      const mk = lv >= 4 ? GOLD : BR;
      add(el.head, [P(G.box(0.12, 0.7, 0.72), mk, 0.94, 0.18, 0, 0, 0, 0.35), ...[1, -1].flatMap(s => [P(G.cone(0.09, 0.62, 6), lv >= 4 ? GOLD2 : BR2, 0.85, 0.82, 0.3 * s, 0.35 * s, 0, -0.55), P(G.sph(0.08, 6), 0xff5a1a, 0.98, 0.25, 0.22 * s)])]);
      for (const [x, y, z] of tuskTips) flame(el.head, x + 0.05, y + 0.05, z, 0.45);
      barding(el, 0x2a1a18, 0x5a1a12, 3);
    }
    if (lv >= 4) {   // 背上一道火鬃 + 塔顶大火盆
      for (let i = 0; i < 6; i++) flame(el.body, -1.0 + i * 0.38, 3.32, 0, 0.6 + Math.sin(i * 1.7) * 0.15);
      add(el.tower, [P(G.cyl(0.32, 0.18, 0.22, 10), GOLD, 0, 1.62, 0), P(G.cyl(0.05, 0.05, 0.5, 6), GOLD2, 0, 1.3, 0)]);
      flame(el.tower, 0, 1.7, 0, 1.6);
    }
  }
  // ---------------- 丙 · 楚巫凤象：楚漆器的红黑、凤鸟、羽冠，越来越像神兽 ----------------
  function planC(el, lv) {
    add(el.body, [P(G.box(2.24, 0.08, 0.08), RED, -0.1, 2.12, 0.99), P(G.box(2.24, 0.08, 0.08), RED, -0.1, 2.12, -0.99), ...[-0.8, -0.2, 0.4].flatMap(x => [P(G.cyl(0.13, 0.13, 0.03, 10), OCHRE, x, 2.5, 0.99, PI / 2), P(G.cyl(0.13, 0.13, 0.03, 10), OCHRE, x, 2.5, -0.99, PI / 2)])]);   // 漆纹云圈
    if (lv >= 2) {   // 羽冠 + 胸前铜铃
      const fs = lv >= 4 ? 7 : 5;
      add(el.head, Array.from({ length: fs }, (_, i) => { const a = (i - (fs - 1) / 2) * 0.22; return P(G.box(0.05, 0.75 + (lv - 2) * 0.2, 0.012), i % 2 ? RED : (lv >= 4 ? GOLD2 : OCHRE), 0.62, 0.95, Math.sin(a) * 0.45, a, 0, -0.25); }));
      add(el.body, [-0.2, 0.15, 0.5].map(z => P(G.sph(0.09, 7), lv >= 4 ? GOLD2 : BR, 1.25, 1.75, z - 0.15)));
    }
    if (lv >= 3) {   // 漆楼：翘角屋顶 + 凤鸟顶饰；多一对獠牙
      add(el.tower, [P(G.box(1.3, 0.06, 1.1), LAC, 0, 1.45, 0), P(new THREE.ConeGeometry(1.0, 0.5, 4), lv >= 4 ? GOLD : LAC, 0, 1.73, 0, 0, PI / 4), ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => P(G.cone(0.05, 0.3, 5), RED, 0.68 * a, 1.55, 0.58 * b, 0.6 * b, 0, -0.6 * a))]);
      for (const s of [1, -1]) { const curve = new THREE.CatmullRomCurve3([V(0.7, -0.45, 0.14 * s), V(0.95, -0.72, 0.2 * s), V(1.22, -0.7, 0.22 * s), V(1.38, -0.5, 0.2 * s)]); el.head.add(Core.inked(new THREE.TubeGeometry(curve, 8, 0.045, 6), Core.toon(C.ivory), 0.015)); }
      add(el.body, [P(G.box(2.0, 0.06, 2.02), RED, -0.1, 3.26, 0)]);
    }
    if (lv >= 4) {   // 塔顶一只展翅金凤
      const ph = new THREE.Group(); ph.position.set(0, 2.05, 0); el.tower.add(ph);
      add(ph, [P(G.sph(0.18, 8), GOLD, 0, 0.2, 0, 0, 0, 0, 1.4, 0.9, 0.8), P(G.cone(0.07, 0.4, 6), GOLD2, 0.32, 0.38, 0, 0, 0, -1.0), P(G.sph(0.08, 6), GOLD2, 0.45, 0.52, 0),
        ...[1, -1].flatMap(s => [0, 1, 2, 3].map(i => P(G.box(0.5 - i * 0.07, 0.03, 0.14), i % 2 ? RED : GOLD, -0.05 - i * 0.05, 0.32 + i * 0.12, (0.32 + i * 0.1) * s, 0.5 * s, 0.2 * s, 0.25))),
        ...[0, 1, 2].map(i => P(G.box(0.7, 0.02, 0.08), i === 1 ? RED : GOLD, -0.55, 0.12 - i * 0.04, (i - 1) * 0.12, 0, (i - 1) * 0.25, 0.25))]);
      add(el.body, [-1.3, -1.45].map((x, i) => P(G.box(0.04, 0.9, 0.06), i ? RED : GOLD2, x, 3.0, 0, 0, 0, 0.9 + i * 0.2)));   // 尾羽
    }
  }
  const PLANS = { a: planA, b: planB, c: planC };
  function make(side = 'b', o = {}) {
    const lv = o.lv || 1, plan = o.plan || 'a';
    const el = Models.makeElephant(side, { gold: lv >= 4 && plan !== 'c' });
    PLANS[plan](el, lv);
    el.lvScale = SCALE[lv - 1];
    return el;
  }
  return { make, SCALE };
})();
// 摆台：同一方案一到四级并排
window.ELD = (() => {
  const V3 = THREE.Vector3, PI = Math.PI, EL = 0.22, root = () => Board.pieces.values().next().value.parent;
  let items = [], S = null;
  const hideNear = (p, r) => { for (const m of Board.pieces.values()) if (Math.hypot(m.position.x - p.x, m.position.z - p.z) < r) m.visible = false; };
  function clear() { for (const x of items) x.parent && x.parent.remove(x); items = []; }
  function lineup(plan, o = {}) {
    clear();
    const c = Board.pos(4, 4), gap = o.gap ?? 1.7, yaw = o.yaw ?? 0.52;   // 象头朝镜头右前方
    for (const m of Board.pieces.values()) m.visible = false;
    const els = [1, 2, 3, 4].map((lv, i) => { const e = ElephantLV.make('b', { lv, plan }); e.group.scale.setScalar(EL * e.lvScale); e.group.position.set(c.x + (i - 1.5) * gap, Board.TOP, c.z); e.group.rotation.y = yaw - PI / 2; root().add(e.group); items.push(e.group); e.fire = plan === 'b' ? 1 : 0; e.update(0.016); return e; });
    S = { c, els };
    return els.length;
  }
  function cam(o = {}) {
    const c = S.c, d = o.d ?? 5.6, el = o.el ?? 0.32, az = o.az ?? 0;
    const pos = new V3(c.x + (o.lx ?? 0) + Math.sin(az) * Math.cos(el) * d, Board.TOP + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
    Core.Cam.cine = true; document.body.classList.add('cine');
    return Core.Cam.to(pos, new V3(c.x + (o.lx ?? 0), Board.TOP + (o.lh ?? 0.55), c.z), 0.05);
  }
  return { lineup, cam };
})();
