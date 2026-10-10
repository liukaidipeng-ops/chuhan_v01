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
  // 象背上的亭子（Ham char-006）：一级无顶盖一名弩手；二级有顶盖一名弩手；三级一名弩手带火；四级亭子变大、两名重弩手坐在象背两侧。
  // 背上的人都是弩手（以后反击远程用），象头上的驾象人是近战。原来那座塔整个藏起来，按级另搭；立柱加高，人头碰不到顶。
  function howdah(el, lv) {
    const T = el.tower; T.children[0].visible = false; el.archer.visible = false; el.banner.group.visible = lv >= 2;
    const big = lv >= 4, W = big ? 1.75 : 1.2, D = big ? 2.05 : 1.0, H = big ? 1.95 : 1.8, wood = 0x2a2420, lac = 0x1c1b1d, edge = big ? GOLD2 : 0x7a2418;
    const ps = [P(G.box(W, 0.09, D), wood, 0, 0.045, 0)];
    for (const s of [1, -1]) ps.push(P(G.box(W, 0.32, 0.04), lac, 0, 0.25, D / 2 * s), P(G.box(W + 0.02, 0.035, 0.06), edge, 0, 0.42, D / 2 * s));
    ps.push(P(G.box(0.04, 0.32, D), lac, -W / 2, 0.25, 0), P(G.box(0.06, 0.035, D + 0.02), edge, -W / 2, 0.42, 0));
    if (lv >= 2) {
      for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ps.push(P(G.cyl(0.035, 0.035, H, 6), wood, x * (W / 2 - 0.04), H / 2, z * (D / 2 - 0.04)));
      ps.push(P(G.box(W + 0.1, 0.06, D + 0.1), lac, 0, H, 0), P(new THREE.ConeGeometry(Math.max(W, D) * 0.8, 0.42, 4), big ? GOLD : lac, 0, H + 0.24, 0, 0, PI / 4, 0, 1, 1, D / W), P(G.box(W + 0.14, 0.03, 0.03), edge, 0, H - 0.02, (D / 2 + 0.06)), P(G.box(W + 0.14, 0.03, 0.03), edge, 0, H - 0.02, -(D / 2 + 0.06)));
      if (big) ps.push(P(new THREE.ConeGeometry(0.55, 0.36, 4), lac, 0, H + 0.62, 0, 0, PI / 4), P(G.sph(0.08, 6), GOLD2, 0, H + 0.84, 0));
    }
    add(T, ps, 0.02);
    // 弩手：坐着（盘腿、上身直），四级两名分坐两侧各朝外，一到三级一名坐中间朝前
    const seat = { lL: -1.35, lR: -1.35, lLz: 0.55, lRz: 0.55, crouch: 0.42, aS: -1.3, aW: -1.25, aWz: 0.7, wAbs: 1.1 };
    const kind = big ? 'xbowG' : 'xbow';
    const spots = big ? [[-0.05, 0.86, 0], [-0.05, -0.86, PI]] : [[-0.1, 0, Math.PI / 2]];   // Ham char-007 截图：两名重弩手放在亭子两边，各朝外
    for (const [x, z, ry] of spots) { const m = Models.soldierStatic('b', kind, seat); m.position.set(x, 0.09, z); m.rotation.y = ry; m.scale.setScalar(0.9); T.add(m); }
    if (lv >= 3) for (const [x, z] of [[1, 1], [1, -1]].concat(big ? [[-1, 1], [-1, -1]] : [])) { add(T, [P(G.cyl(0.12, 0.07, 0.13, 8), big ? GOLD : BR, x * (W / 2 - 0.02), 0.5, z * (D / 2 - 0.02)), P(G.cyl(0.02, 0.02, 0.1, 5), BR2, x * (W / 2 - 0.02), 0.4, z * (D / 2 - 0.02))]); flame(T, x * (W / 2 - 0.02), 0.54, z * (D / 2 - 0.02), 0.6); }
  }

  // 象屁股重做 + 尾巴（Ham char-007：「象需要有尾巴！象屁股那块重做一下」）：两瓣臀、后腿根鼓出来；尾巴一节节往下、尾尖一簇毛，火把绑在尾尖
  function rump(el, lv) {
    const sk = lv >= 4 ? GOLD : 0x6f6a64, sk2 = lv >= 4 ? 0xc4922e : 0x5d5853;
    add(el.body, [...[1, -1].flatMap(s => [P(G.sph(0.55, 12), sk, -1.3, 2.12, 0.3 * s, 0, 0, 0, 0.72, 1.1, 0.78), P(G.sph(0.42, 10), sk2, -1.0, 1.68, 0.5 * s, 0, 0, 0, 1, 1.15, 0.85)]), P(G.box(0.04, 0.9, 0.02), 0x3a3633, -1.66, 2.05, 0)], 0.025);
    el.tail.children[0].visible = false; el.tail.position.set(-1.74, 2.72, 0); el.tail.rotation.z = -0.12;   // 往身后垂，别插进屁股里（原来往前偏，整条藏在臀里）
    const segs = [];
    for (let i = 0; i < 7; i++) segs.push(P(G.cyl(0.085 - i * 0.008, 0.077 - i * 0.008, 0.25, 8), 0x3a3633, 0, -0.12 - i * 0.24, 0));   // 尾巴垂到后腿弯，深色，金象身上也看得清
    segs.push(P(G.cone(0.11, 0.36, 8), 0x1d1c1b, 0, -1.84, 0, PI));   // 尾尖一簇毛
    add(el.tail, segs, 0.015);
    el.torch.position.y = -1.6;
  }
  // 四级金甲鳞片（Ham char-007：鳞片、黑线接缝、少量红点缀；Ham 10-10：「鳞甲最好用贴图来表现，不要用模型」）
  // 一张画布贴图：一排排压叠的鳞片，鳞与鳞之间露黑缝，每隔几排有一片暗红。贴在身子、两瓣臀、四条腿外面的一层薄壳上。
  let scaleMat = null;
  function scaleTex() {
    if (scaleMat) return scaleMat;
    const tex = Core.canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#121110'; g.fillRect(0, 0, w, h);
      const cw = 64, ch = 44, R = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(7);
      for (let r = -1; r < h / ch + 2; r++) for (let c = -1; c < w / cw + 2; c++) {
        const x = c * cw + (r % 2 ? cw / 2 : 0), y = r * ch, red = (r % 4 === 1) && (c % 5 === 2);
        const gr = g.createLinearGradient(x, y - ch * 0.2, x, y + ch);
        if (red) { gr.addColorStop(0, '#b0301f'); gr.addColorStop(1, '#5e140c'); }
        else { const k = 0.85 + R() * 0.2; gr.addColorStop(0, `rgb(${255 * k | 0},${222 * k | 0},${140 * k | 0})`); gr.addColorStop(0.55, `rgb(${214 * k | 0},${164 * k | 0},${62 * k | 0})`); gr.addColorStop(1, `rgb(${140 * k | 0},${98 * k | 0},${30 * k | 0})`); }
        g.fillStyle = gr; g.strokeStyle = '#0d0c0b'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(x - cw / 2 + 3, y); g.lineTo(x + cw / 2 - 3, y); g.quadraticCurveTo(x + cw / 2 - 2, y + ch * 0.75, x, y + ch * 1.15); g.quadraticCurveTo(x - cw / 2 + 2, y + ch * 0.75, x - cw / 2 + 3, y); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - cw * 0.25, y + 6); g.quadraticCurveTo(x, y + ch * 0.5, x + cw * 0.05, y + ch * 0.85); g.stroke();
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    scaleMat = (rep) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep[0], rep[1]); return Core.toon(0xffffff, { map: t, unique: true }); };
    return scaleMat;
  }
  function scales(el) {
    const mat = scaleTex(), shell = (geo, rep, grp, pos, sc, rot) => { const m = Core.inked(geo, mat(rep), 0.012); m.position.copy(pos); if (sc) m.scale.copy(sc); if (rot) m.rotation.copy(rot); grp.add(m); return m; };
    shell(new THREE.SphereGeometry(1, 40, 24), [6, 3], el.body, V(0, 2.25, 0), V(1.565, 1.065, 0.965));
    for (const s of [1, -1]) shell(new THREE.SphereGeometry(0.555, 24, 16), [3, 2.4], el.body, V(-1.3, 2.12, 0.3 * s), V(0.725, 1.105, 0.785));
    for (const L of el.legs) { shell(new THREE.CylinderGeometry(0.31, 0.28, 0.85, 20, 1, true), [3, 1.4], L.hip, V(0, -0.4, 0)); shell(new THREE.CylinderGeometry(0.28, 0.31, 0.72, 20, 1, true), [3, 1.2], L.knee, V(0, -0.36, 0)); }
    add(el.body, [1, -1].flatMap(s => [0, 1, 2, 3, 4].map(i => P(G.cone(0.05, 0.2, 6), 0x9e2418, -0.95 + i * 0.42, 1.6, 1.03 * s, PI))), 0.01);   // 披挂下缘一排红缨
  }
  function planB(el, lv) {
    flame(el.torch, 0, -0.05, 0, 0.7 + lv * 0.18);
    // Ham char-005：象身上红色少一点，主要是黑色——额上只留一道暗红细纹；二级起披挂一律黑底、红只做细边
    add(el.head, [P(G.box(0.02, 0.04, 0.42), 0x6a1a12, 0.86, 0.32, 0, 0, 0, 0.2)]);
    if (lv >= 2) {
      legRings(el, 0x2a1210, 1);
      add(el.body, [1, -1].flatMap(s => [P(G.box(2.3, 1.22, 0.05), 0x1c1b1d, -0.1, 2.3, 1.0 * s), P(G.box(2.34, 0.035, 0.07), 0x7a2418, -0.1, 1.7, 1.02 * s), P(G.box(2.34, 0.035, 0.07), lv >= 4 ? GOLD2 : 0x7a2418, -0.1, 2.9, 1.02 * s)]), 0.02);
    }
    if (lv >= 3) {   // 青铜兽面：两只弯角 + 獠牙口
      const mk = lv >= 4 ? GOLD : BR;
      add(el.head, [P(G.box(0.12, 0.7, 0.72), mk, 0.94, 0.18, 0, 0, 0, 0.35), ...[1, -1].flatMap(s => [P(G.cone(0.09, 0.62, 6), lv >= 4 ? GOLD2 : BR2, 0.85, 0.82, 0.3 * s, 0.35 * s, 0, -0.55), P(G.sph(0.08, 6), 0xff5a1a, 0.98, 0.25, 0.22 * s)])]);
      for (const [x, y, z] of tuskTips) flame(el.head, x + 0.05, y + 0.05, z, 0.45);
      barding(el, 0x1c1b1d, 0x2e2c2e, 3);
    }
    if (lv >= 4) {   // 背上一道火鬃
      for (let i = 0; i < 6; i++) flame(el.body, -1.0 + i * 0.38, 3.32, 0, 0.6 + Math.sin(i * 1.7) * 0.15);
    }
    howdah(el, lv); rump(el, lv); if (lv >= 4) scales(el);
    if (lv >= 4) {   // 四级驾象人：黑金相间的铠甲 + 金权杖（Ham char-006）
      add(el.mahout, [P(G.box(0.46, 0.42, 0.36), 0x1c1b1d, 0, 1.12, 0), ...[0, 1, 2].map(i => P(G.box(0.47, 0.035, 0.37), GOLD2, 0, 0.95 + i * 0.14, 0)), ...[1, -1].map(s => P(G.sph(0.12, 7), GOLD, 0, 1.36, 0.24 * s, 0, 0, 0, 1, 0.7, 1)), P(G.cyl(0.13, 0.14, 0.1, 8), GOLD, 0, 1.62, 0)]);
      add(el.mahout, [P(G.cyl(0.03, 0.03, 1.3, 6), GOLD, 0.05, 1.35, 0.42, 0.15, 0, 0), P(G.sph(0.1, 8), GOLD2, 0.05, 2.02, 0.52), P(G.cone(0.05, 0.2, 6), GOLD2, 0.05, 2.18, 0.55, 0.15, 0, 0)]);
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
    if (plan === 'b') { const k = 1 / el.lvScale; el.tower.scale.setScalar(k); el.mahout.scale.multiplyScalar(k); }   // Ham char-005：象变大，人不要变大
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
