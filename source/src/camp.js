// ===== 汉营 / 楚营：围绕棋盘的军营布景 =====
const Camp = (() => {
  const { scene, onFrame, toon, merge, M4, outlineShared, Tex, rnd } = Core;
  const { P, G, SIDE, C } = Models;
  const V3 = THREE.Vector3;
  const K = 0.22; // 与特效士兵同比例（真人约 0.42 高）
  const STYLE = {
    r: { tent: 0xa33a26, tent2: 0x7e2a1c, stripe: 0xe8dcc0, trim: 0xc9a045, roof: 0x5a1e14, felt: 0xd8ccb0, flag: '漢', lord: '劉' },
    b: { tent: 0x33302f, tent2: 0x242222, stripe: 0x8a2a1e, trim: 0xb08a3a, roof: 0x1d1b1b, felt: 0x3d3936, flag: '楚', lord: '項' },
  };
  const vcMat = Models.vcMat;

  // 把一组"人体尺度"零件摆到世界坐标
  function place(parts, x, z, ry = 0, k = K, y = 0) {
    const W = M4(x, y, z, 0, ry, 0, k);
    return parts.map(p => ({ geo: p.geo, color: p.color, m: W.clone().multiply(p.m) }));
  }
  // —— 零件库（单位：米） ——
  function prism(w, h, len) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
    g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2);
    return g;
  }
  const tentGeo = prism(2.4, 1.8, 3);
  function tentSmall(st) { // 行军帐：三角棚
    return [
      P(tentGeo, st.tent, 0, 0, 0),
      P(G.box(3.02, 0.12, 0.3), st.stripe, 0, 1.78, 0),
      P(G.cyl(0.04, 0.04, 2.4, 4), C.wood, 1.55, 1.2, 0), P(G.cyl(0.04, 0.04, 2.4, 4), C.wood, -1.55, 1.2, 0),
      P(G.box(0.05, 1.1, 0.9), st.tent2, 1.5, 0.55, 0),
    ];
  }
  function tentLord(st) { // 中军大帐：方帐 + 歇山顶
    const parts = [
      P(G.box(6, 2.6, 4.4), st.tent, 0, 1.3, 0),
      P(G.box(6.1, 0.3, 4.5), st.stripe, 0, 2.5, 0),
      P(G.box(6.3, 0.18, 4.7), st.trim, 0, 2.72, 0),
      P(new THREE.ConeGeometry(4.4, 2.2, 4), st.roof, 0, 3.9, 0, 0, Math.PI / 4, 0, 1, 1, 0.75),
      P(G.cone(0.15, 0.6, 6), st.trim, 0, 5.2, 0),
      P(G.box(1.8, 2.0, 0.1), 0x1a1614, 0, 1.0, 2.22), // 帐门
      P(G.box(0.3, 2.2, 0.3), st.stripe, 1.1, 1.1, 2.3), P(G.box(0.3, 2.2, 0.3), st.stripe, -1.1, 1.1, 2.3),
      P(G.box(7, 0.2, 5.4), 0x6e5a42, 0, 0.1, 0.3), // 台基
    ];
    return parts;
  }
  function tower(st) { // 望楼
    const parts = [];
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) parts.push(P(G.cyl(0.1, 0.13, 6.4, 5), C.wood, x * 0.85, 3.2, z * 0.85, z * 0.05, 0, -x * 0.05));
    for (const y of [1.8, 3.8]) { parts.push(P(G.box(2, 0.1, 0.1), C.wood, 0, y, 0.9), P(G.box(2, 0.1, 0.1), C.wood, 0, y, -0.9), P(G.box(0.1, 0.1, 2), C.wood, 0.9, y, 0), P(G.box(0.1, 0.1, 2), C.wood, -0.9, y, 0)); }
    parts.push(P(G.box(2.4, 0.2, 2.4), 0x5c4630, 0, 6.3, 0));
    for (const [x, z, w, d] of [[0, 1.15, 2.4, 0.1], [0, -1.15, 2.4, 0.1], [1.15, 0, 0.1, 2.4], [-1.15, 0, 0.1, 2.4]]) parts.push(P(G.box(w, 0.7, d), st.tent2, x, 6.75, z));
    parts.push(P(new THREE.ConeGeometry(2.1, 1.3, 4), st.roof, 0, 8.3, 0, 0, Math.PI / 4, 0));
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) parts.push(P(G.cyl(0.06, 0.06, 1.6, 4), C.wood, x * 1.05, 7.3, z * 1.05));
    return parts;
  }
  function drum(st) { // 战鼓
    return [
      P(G.cyl(0.9, 0.9, 1.1, 14), 0x7a2a1c, 0, 1.6, 0, Math.PI / 2, 0, 0),
      P(G.cyl(0.86, 0.86, 1.14, 14), 0xd9c8a4, 0, 1.6, 0, Math.PI / 2, 0, 0, 0.98, 1, 0.98),
      P(new THREE.TorusGeometry(0.9, 0.05, 4, 16), st.trim, 0, 1.6, 0.56), P(new THREE.TorusGeometry(0.9, 0.05, 4, 16), st.trim, 0, 1.6, -0.56),
      P(G.box(0.12, 1.6, 0.12), C.wood, 0.8, 0.8, 0.4, 0, 0, 0.3), P(G.box(0.12, 1.6, 0.12), C.wood, -0.8, 0.8, 0.4, 0, 0, -0.3),
      P(G.box(0.12, 1.6, 0.12), C.wood, 0.8, 0.8, -0.4, 0, 0, 0.3), P(G.box(0.12, 1.6, 0.12), C.wood, -0.8, 0.8, -0.4, 0, 0, -0.3),
    ];
  }
  function rack() { // 兵器架
    const parts = [P(G.box(2.4, 0.1, 0.1), C.wood, 0, 1.2, 0), P(G.box(0.1, 1.3, 0.1), C.wood, 1.15, 0.65, 0), P(G.box(0.1, 1.3, 0.1), C.wood, -1.15, 0.65, 0)];
    for (let i = 0; i < 6; i++) { parts.push(P(G.cyl(0.02, 0.02, 2.6, 4), C.wood, -1 + i * 0.4, 1.3, 0.08, 0.12, 0, 0), P(G.cone(0.04, 0.22, 4), C.metal, -1 + i * 0.4, 2.62, 0.24, 0.12, 0, 0)); }
    return parts;
  }
  function cart(st) { // 辎重车
    return [
      P(G.box(2.2, 0.15, 1.2), C.wood, 0, 0.8, 0), P(G.box(2.2, 0.5, 0.08), C.wood, 0, 1.05, 0.58), P(G.box(2.2, 0.5, 0.08), C.wood, 0, 1.05, -0.58),
      P(new THREE.TorusGeometry(0.55, 0.06, 4, 12), C.wood, 0.2, 0.55, 0.68), P(new THREE.TorusGeometry(0.55, 0.06, 4, 12), C.wood, 0.2, 0.55, -0.68),
      P(G.cyl(0.04, 0.04, 2.6, 4), C.wood, 1.9, 0.7, 0.3, 0, 0, Math.PI / 2 - 0.2), P(G.cyl(0.04, 0.04, 2.6, 4), C.wood, 1.9, 0.7, -0.3, 0, 0, Math.PI / 2 - 0.2),
      P(G.box(0.8, 0.6, 0.8), st.felt, -0.5, 1.3, 0), P(G.cyl(0.35, 0.35, 0.7, 8), 0x6b4a2a, 0.4, 1.25, 0.1),
    ];
  }
  function crates(st) {
    return [P(G.box(0.8, 0.8, 0.8), 0x7a5a38, 0, 0.4, 0), P(G.box(0.7, 0.7, 0.7), 0x6a4a2e, 0.9, 0.35, 0.2, 0, 0.3), P(G.box(0.6, 0.6, 0.6), 0x7a5a38, 0.4, 1.1, 0.1, 0, 0.6), P(G.cyl(0.35, 0.35, 0.9, 8), 0x5a3e24, -0.8, 0.45, 0.3)];
  }
  function brazierBase() {
    return [
      P(G.cyl(0.45, 0.25, 0.4, 8), 0x2a2622, 0, 1.3, 0),
      P(G.cyl(0.04, 0.05, 1.3, 4), 0x2a2622, 0.25, 0.6, 0, 0, 0, 0.2), P(G.cyl(0.04, 0.05, 1.3, 4), 0x2a2622, -0.13, 0.6, 0.22, -0.2, 0, -0.1), P(G.cyl(0.04, 0.05, 1.3, 4), 0x2a2622, -0.13, 0.6, -0.22, 0.2, 0, -0.1),
      P(G.sph(0.25, 6), 0x3a2014, 0, 1.45, 0, 0, 0, 0, 1, 0.5, 1),
    ];
  }
  function hitchHorse(col) {
    return [
      P(G.cyl(0.34, 0.36, 1.25, 8), col, 0, 1.3, 0, 0, 0, Math.PI / 2), P(G.sph(0.37, 8), col, 0.6, 1.33, 0), P(G.sph(0.4, 8), col, -0.6, 1.36, 0),
      P(G.cyl(0.17, 0.27, 0.85, 7), col, 0.9, 1.7, 0, 0, 0, -0.5), P(G.cyl(0.1, 0.17, 0.62, 7), col, 1.2, 2.0, 0, 0, 0, -1.9),
      P(G.cyl(0.07, 0.05, 1.1, 5), col, 0.6, 0.6, 0.2), P(G.cyl(0.07, 0.05, 1.1, 5), col, 0.6, 0.6, -0.2), P(G.cyl(0.07, 0.05, 1.1, 5), col, -0.6, 0.6, 0.2), P(G.cyl(0.07, 0.05, 1.1, 5), col, -0.6, 0.6, -0.2),
      P(G.cone(0.1, 0.8, 5), C.hair, -1.1, 1.2, 0, 0, 0, 0.3), P(G.box(0.55, 0.12, 0.62), 0x6b2a1f, -0.05, 1.72, 0),
    ];
  }

  const camps = [];
  function build(s) {
    const sg = s === 'r' ? 1 : -1;
    const st = STYLE[s];
    const parts = [];
    const add = (arr) => parts.push(...arr);
    // 栅栏（外围 U 形，留出营门）
    const stake = [P(G.cyl(0.09, 0.11, 2.2, 5), 0x6e4a2c, 0, 1.1, 0), P(G.cone(0.11, 0.35, 5), 0x5a3a20, 0, 2.37, 0)];
    const fenceX = 11.5, fenceZ0 = 0.95, fenceZ1 = 10.2;
    for (let z = fenceZ0; z <= fenceZ1; z += 0.2) for (const x of [-fenceX, fenceX]) add(place(stake, x + (rnd() - 0.5) * 0.04, sg * z, 0, K * (0.9 + rnd() * 0.2)));
    for (let x = -fenceX; x <= fenceX; x += 0.2) { if (Math.abs(x) < 1.3) continue; add(place(stake, x, sg * fenceZ1 + (rnd() - 0.5) * 0.04, 0, K * (0.9 + rnd() * 0.2))); }
    // 营门牌楼
    add(place([P(G.box(0.3, 4, 0.3), C.wood, 1.9, 2, 0), P(G.box(0.3, 4, 0.3), C.wood, -1.9, 2, 0), P(G.box(4.6, 0.35, 0.4), st.stripe, 0, 3.9, 0), P(G.box(5, 0.25, 0.6), st.roof, 0, 4.2, 0)], 0, sg * fenceZ1, 0));
    // 中军大帐
    add(place(tentLord(st), 0, sg * 7.9, s === 'r' ? Math.PI : 0));
    // 行军帐（两侧成排）
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
        const x = side * (7.2 + row * 1.25), z = sg * (1.6 + i * 2.1 + (row % 2) * 0.6);
        add(place(tentSmall(st), x, z, Math.PI / 2 + (rnd() - 0.5) * 0.15, K * (0.95 + rnd() * 0.1)));
      }
      // 望楼
      add(place(tower(st), side * 6.3, sg * 6.6, 0));
      // 战鼓
      add(place(drum(st), side * 5.75, sg * 3.3, Math.PI / 2));
      // 兵器架、辎重
      add(place(rack(), side * 6.25, sg * 1.05, Math.PI / 2));
      add(place(rack(), side * 10.3, sg * 5.2, 0.3));
      add(place(cart(st), side * 9.2, sg * 9.0, side * 0.4));
      add(place(crates(st), side * 10.5, sg * 8.0, rnd() * 3));
      add(place(crates(st), side * 3.2, sg * 8.3, rnd() * 3));
      // 马桩与战马
      add(place([P(G.box(3.6, 0.12, 0.12), C.wood, 0, 1.4, 0), P(G.box(0.12, 1.5, 0.12), C.wood, 1.75, 0.75, 0), P(G.box(0.12, 1.5, 0.12), C.wood, -1.75, 0.75, 0)], side * 3.6, sg * 9.2, 0));
      for (let i = 0; i < 3; i++) add(place(hitchHorse(i % 2 ? 0x5b4636 : (s === 'r' ? 0x7a5236 : 0x2c2a2a)), side * (2.9 + i * 0.5), sg * 9.2 - sg * 0.35, sg > 0 ? -Math.PI / 2 : Math.PI / 2, K * 0.95));
    }
    // 火盆
    const fires = [];
    for (const [x, z] of [[-5.45, 0.9], [5.45, 0.9], [-5.45, 5.6], [5.45, 5.6], [-1.6, 6.6], [1.6, 6.6]]) {
      add(place(brazierBase(), x, sg * z, 0));
      fires.push(new V3(x, 1.5 * K + 0.02, sg * z));
    }
    const geo = merge(parts);
    const mesh = new THREE.Mesh(geo, vcMat);
    const out = new THREE.Mesh(geo, outlineShared);
    const group = new THREE.Group(); group.add(mesh, out);
    scene.add(group);

    // 列阵护卫（棋盘两侧，面向棋盘）
    const guards = new Models.Troop(s, 'spear', 44, K);
    let n = 0;
    for (const side of [-1, 1]) for (let line = 0; line < 2; line++) for (let i = 0; i < 11; i++) {
      const u = guards.units[n++];
      u.p.set(side * (5.25 + line * 0.36), 0, sg * (0.95 + i * 0.42));
      u.yaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    scene.add(guards.group);
    // 营门与大帐前的卫兵
    const sentries = new Models.Troop(s, 'sword', 6, K);
    [[-0.7, 10.35], [0.7, 10.35], [-1.3, 6.7], [1.3, 6.7], [-6.3, 7.4], [6.3, 7.4]].forEach(([x, z], i) => {
      const u = sentries.units[i]; u.p.set(x, 0, sg * z); u.yaw = sg > 0 ? Math.PI : 0;
    });
    scene.add(sentries.group);
    // 望楼上的弓手
    const archers = new Models.Troop(s, 'archer', 2, K);
    archers.units.forEach((u, i) => { u.p.set((i ? 1 : -1) * 6.3, 6.4 * K, sg * 6.6); u.yaw = sg > 0 ? Math.PI : 0; });
    scene.add(archers.group);
    const troops = [guards, sentries, archers];
    for (const tr of troops) for (const u of tr.units) { u.home = u.p.clone(); u.homeYaw = u.yaw; u.pose = 'idle'; }

    // 旌旗
    const banners = [];
    const bdefs = [[-1.9, 10.2, st.flag], [1.9, 10.2, st.flag], [-2.4, 6.2, st.lord], [2.4, 6.2, st.lord], [-6.3, 6.6, st.flag, 8.6], [6.3, 6.6, st.flag, 8.6], [-11.5, 1.0, st.flag], [11.5, 1.0, st.flag], [-11.5, 10.2, st.flag], [11.5, 10.2, st.flag]];
    for (const [x, z, ch, y] of bdefs) {
      const b = Models.makeBanner(s, ch);
      b.group.scale.setScalar(K * (ch === st.lord ? 1.25 : 1));
      b.group.position.set(x, (y || 0) * K, sg * z);
      b.group.rotation.y = sg > 0 ? Math.PI / 2 + 0.3 : -Math.PI / 2 + 0.3;
      scene.add(b.group); banners.push(b);
    }
    // 火焰精灵
    const flames = fires.map(p => {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.spark, color: 0xff9a40, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      f.position.copy(p).add(new V3(0, 0.08, 0)); f.userData.ph = rnd() * 6;
      scene.add(f); return f;
    });
    let smokeT = 0, t = 0;
    const camp = { s, sg, group, guards, sentries, archers, troops, banners, flames, fires, drops: [], gen: 0, state: 'home' };
    camps.push(camp);
    onFrame(dt => {
      t += dt;
      steer(camp, dt);
      for (const tr of troops) tr.update(dt);
      for (const b of banners) b.update(dt);
      for (const f of flames) {
        const k = 0.7 + 0.3 * Math.sin(t * 13 + f.userData.ph) * Math.sin(t * 7.3 + f.userData.ph * 2);
        f.scale.set(0.34 * k, 0.46 * k, 1);
        f.material.opacity = 0.75 + 0.25 * k;
      }
      smokeT += dt;
      if (smokeT > 0.35 && Fx.P) {
        smokeT = 0;
        const p = fires[Math.floor(Math.random() * fires.length)];
        Fx.spawn({ pos: p.clone().add(new V3(0, 0.12, 0)), vel: new V3(0.05, 0.35, 0), color: 0x4a4540, size: 0.12, size2: 0.9, life: 3.2, op: 0.28, drag: 0.3, fadeIn: 0.4 });
        if (Math.random() < 0.5) Fx.spawn({ pos: p.clone().add(new V3(0, 0.1, 0)), vel: new V3((Math.random() - 0.5) * 0.3, 0.8, (Math.random() - 0.5) * 0.3), tex: Tex.spark, add: true, color: 0xffb060, size: 0.04, size2: 0.01, life: 1.1, op: 1, drag: 0.5 });
      }
    });
    return camp;
  }
  function init() { build('r'); build('b'); }

  // ======================================================================
  //  士兵调度：每个士兵可有一个移动目标 u.mv
  // ======================================================================
  const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
  function ground(p) {
    if (Math.abs(p.x) > (Board.BX || 4.75) + 0.02 || Math.abs(p.z) > (Board.BZ || 5.37) + 0.02) return 0;
    return Fx.groundY(p);
  }
  function steer(camp, dt) {
    const kY = 1 - Math.exp(-dt * 12);
    for (const tr of camp.troops) for (const u of tr.units) {
      const m = u.mv;
      if (!m) continue;
      if (m.delay > 0) { m.delay -= dt; continue; }
      if (!m.started) { m.started = true; if (m.pose) u.pose = m.pose; if (m.onStart) m.onStart(u, tr); }
      m.t = (m.t || 0) + dt;
      if (m.to) {
        const dx = m.to.x - u.p.x, dz = m.to.z - u.p.z, dist = Math.hypot(dx, dz);
        const step = m.speed * dt;
        if (dist <= step) {
          u.p.x = m.to.x; u.p.z = m.to.z; m.to = null;
          if (m.end) u.pose = m.end;
          if (m.onArrive) m.onArrive(u, tr);
        } else {
          u.p.x += dx / dist * step; u.p.z += dz / dist * step;
          u.yaw = angLerp(u.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 9));
          if (Math.abs(u.p.z) < Board.HALF && Math.abs(u.p.x) < 4.8 && Math.random() < dt * 3) Fx.P.splash(u.p.clone().setY(0), 2, 0.3);
        }
      } else if (m.face != null) u.yaw = angLerp(u.yaw, m.face, 1 - Math.exp(-dt * 6));
      if (tr !== camp.archers) u.p.y += (ground(u.p) - u.p.y) * kY;
      if (m.fadeAt != null && m.t > m.fadeAt) { u.vis = Math.max(0, 1 - (m.t - m.fadeAt) / 0.8); if (u.vis <= 0 && !m.to) u.mv = null; }
    }
  }
  const campOf = s => camps.find(c => c.s === s);

  // —— 吃子助威：挥舞兵器、跳跃呐喊 ——
  function cheer(s, dur = 2.4, loud = 1) {
    const c = campOf(s);
    if (!c || c.state !== 'home') return;
    const gen = c.gen;
    for (const tr of c.troops) for (const u of tr.units) {
      if (u.mv) continue;
      const d = Math.random() * 0.35;
      setTimeout(() => { if (c.gen !== gen || c.state !== 'home') return; u.pose = 'wave'; if (Math.random() < 0.5) tr.act(u.i, 'raise', 0.5); }, d * 1000);
      setTimeout(() => { if (c.gen !== gen || c.state !== 'home') return; if (u.pose === 'wave') u.pose = 'idle'; }, (dur + d + Math.random() * 0.5) * 1000);
    }
    try { Sfx.cheer(0.1, 0.55 * loud); } catch (e) { }
  }
  // —— 将死：全军冲上棋盘，持兵器包围敌方主帅 ——
  function surround(s, center) {
    const c = campOf(s);
    if (!c) return 0;
    c.state = 'surround'; c.gen++;
    const units = [];
    for (const tr of [c.guards, c.sentries]) for (const u of tr.units) units.push([tr, u]);
    // 以距离排序：离得近的占内圈
    units.sort((a, b) => a[1].p.distanceToSquared(center) - b[1].p.distanceToSquared(center));
    const rings = [[0.62, 12], [1.0, 20], [1.4, 30]];
    const slots = [];
    for (const [r, n] of rings) for (let i = 0; i < n; i++) { const a = (i + (r > 0.8 ? 0.5 : 0)) / n * Math.PI * 2; slots.push(new V3(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r)); }
    // 为每个士兵分配最近的空位（贪心）
    const free = slots.slice();
    let maxT = 0;
    units.forEach(([tr, u], k) => {
      let bi = 0, bd = 1e9;
      free.forEach((p, i) => { const d = p.distanceToSquared(u.p); if (d < bd) { bd = d; bi = i; } });
      const to = free.splice(bi, 1)[0];
      const face = Math.atan2(center.x - to.x, center.z - to.z);
      const speed = 2.1 + Math.random() * 0.5, delay = 0.1 + k * 0.025 + Math.random() * 0.2;
      maxT = Math.max(maxT, delay + u.p.distanceTo(to) / speed);
      u.act = null;
      u.mv = { to, speed, delay, pose: 'charge', end: 'brace', face, onArrive: (uu, t) => { if (Math.random() < 0.4) t.act(uu.i, 'thrust', 0.35, Math.random() * 0.3); } };
    });
    // 弓手在望楼上张弓
    c.archers.setPose('aim');
    try { Sfx.roar(); } catch (e) { }
    return maxT;
  }
  // —— 战败：丢盔弃甲，有人跪地请降，多数四散奔逃 ——
  function rout(s) {
    const c = campOf(s);
    if (!c) return;
    c.state = 'rout'; c.gen++;
    const all = [];
    for (const tr of c.troops) for (const u of tr.units) all.push([tr, u]);
    all.forEach(([tr, u], k) => {
      const delay = Math.random() * 1.2;
      const surrender = tr !== c.archers && Math.random() < 0.28;
      // 扔下兵器
      setTimeout(() => {
        if (c.state !== 'rout') return;
        for (const part of Math.random() < 0.6 ? ['weapon', 'shield'] : ['weapon']) {
          const o = tr.detach(u.i, part);
          if (!o) continue;
          scene.add(o); c.drops.push(o);
          const p0 = o.position.clone(), q0 = o.quaternion.clone();
          const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), Math.random() * 6.28, 0, 'YXZ'));
          const p1 = p0.clone().add(new V3((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25)); p1.y = ground(p1) + 0.02;
          if (tr === c.archers) p1.y = 0.02;
          Core.tween(0.35 + Math.random() * 0.2, k2 => { o.position.lerpVectors(p0, p1, k2); o.quaternion.slerpQuaternions(q0, q1, k2); }, Core.ease.in);
        }
        if (Math.random() < 0.08) try { Sfx.B.metalfall(0, 0.15); } catch (e) { }
      }, delay * 1000);
      if (tr === c.archers) { u.mv = { delay: delay + 0.2, pose: 'cower' }; return; }
      if (surrender) {
        const face = (c.sg > 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.6;
        u.mv = { delay: delay + 0.3, pose: 'cower', face };
      } else {
        // 往营外逃
        const dir = new V3(Math.sign(u.p.x || (Math.random() - 0.5)) * (0.6 + Math.random() * 0.6), 0, c.sg * (0.6 + Math.random() * 0.8)).normalize();
        dir.x += (Math.random() - 0.5) * 0.5; dir.normalize();
        const to = u.p.clone().addScaledVector(dir, 5 + Math.random() * 3);
        u.mv = { to, speed: 1.6 + Math.random() * 0.8, delay: delay + 0.35, pose: 'flee', fadeAt: 2.4 + Math.random() * 1.5 };
      }
    });
    try { Sfx.rout(); } catch (e) { }
  }
  // —— 复位（新一局） ——
  function reset() {
    for (const c of camps) {
      c.gen++; c.state = 'home';
      for (const o of c.drops) Core.disposeTree(o);
      c.drops.length = 0;
      for (const tr of c.troops) for (const u of tr.units) {
        u.mv = null; u.p.copy(u.home); u.yaw = u.homeYaw; u.y = 0; u.vis = 1; u.lost = 0; u.act = null;
        u.dead = false; u.fall = 0; u.falling = false; u.fly = null; u.spin = 0; u.pose = 'idle';
      }
    }
  }
  return { init, camps, cheer, surround, rout, reset, K };
})();
