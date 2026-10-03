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
      P(new THREE.ConeGeometry(4.4, 2.2, 4).rotateY(Math.PI / 4), st.roof, 0, 3.9, 0, 0, 0, 0, 1.06, 1, 0.8),
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
    // 中军大帐旁的两把火炬（最后两只火盆）是“轮到谁走”的信号：轮到这一方才点亮，平时熄着
    const lordFires = [4, 5];
    for (const i of lordFires) { flames[i].userData.lord = true; flames[i].userData.lit = 0; const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.spark, color: 0xffb060, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); g.position.copy(fires[i]).add(new V3(0, 0.1, 0)); scene.add(g); flames[i].userData.glow = g; }
    const camp = { s, sg, group, guards, sentries, archers, troops, banners, flames, fires, drops: [], gen: 0, state: 'home', goneN: 0, total: guards.count + sentries.count, torch: false };
    camps.push(camp);
    onFrame(dt => {
      t += dt;
      steer(camp, dt);
      for (const tr of troops) tr.update(dt);
      for (const b of banners) b.update(dt);
      for (const f of flames) {
        const k = 0.7 + 0.3 * Math.sin(t * 13 + f.userData.ph) * Math.sin(t * 7.3 + f.userData.ph * 2);
        if (f.userData.lord) {
          // 点亮 / 熄灭各用半秒过渡；点亮时火头比别的火盆旺，外面罩一圈暖光
          const u = f.userData, was = u.lit; u.lit += ((camp.torch ? 1 : 0) - u.lit) * Math.min(1, dt * 5);
          const L = u.lit;
          f.scale.set(0.5 * k * L + 0.001, 0.72 * k * L + 0.001, 1); f.material.opacity = (0.8 + 0.2 * k) * L; f.visible = L > 0.02;
          u.glow.scale.setScalar((1.5 + 0.25 * k) * L + 0.001); u.glow.material.opacity = 0.28 * L; u.glow.visible = L > 0.02;
          // 刚熄的一刻冒一缕青烟；刚点着蹿几点火星
          if (was > 0.5 && L <= 0.5 && Fx.spawn) for (let i = 0; i < 3; i++) Fx.spawn({ pos: f.position.clone(), vel: new V3((Math.random() - 0.5) * 0.1, 0.5 + Math.random() * 0.3, 0), color: 0x6a655e, size: 0.1, size2: 0.7, life: 2.2, op: 0.35, drag: 0.4, fadeIn: 0.2 });
          if (was <= 0.5 && L > 0.5 && Fx.spawn) for (let i = 0; i < 8; i++) Fx.spawn({ pos: f.position.clone(), vel: new V3((Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8), tex: Tex.spark, add: true, color: 0xffc070, size: 0.06, size2: 0.01, life: 0.8, op: 1, drag: 0.6 });
          continue;
        }
        f.scale.set(0.34 * k, 0.46 * k, 1);
        f.material.opacity = 0.75 + 0.25 * k;
      }
      smokeT += dt;
      if (smokeT > 0.35 && Fx.P) {
        smokeT = 0;
        // 河边两只火盆紧挨棋盘中线：只留火光，不冒烟，免得烟飘到棋盘上
        const far = fires.filter((f, i) => Math.abs(f.z) > 2 && (i < 4 || camp.torch));
        const p = far[Math.floor(Math.random() * far.length)];
        Fx.spawn({ pos: p.clone().add(new V3(0, 0.12, 0)), vel: new V3(0.05, 0.35, 0), color: 0x4a4540, size: 0.12, size2: 0.9, life: 3.2, op: 0.28, drag: 0.3, fadeIn: 0.4 });
        if (Math.random() < 0.5) Fx.spawn({ pos: p.clone().add(new V3(0, 0.1, 0)), vel: new V3((Math.random() - 0.5) * 0.3, 0.8, (Math.random() - 0.5) * 0.3), tex: Tex.spark, add: true, color: 0xffb060, size: 0.04, size2: 0.01, life: 1.1, op: 1, drag: 0.5 });
      }
    });
    return camp;
  }
  function init() { build('r'); build('b'); }
  // 倒计时最后几秒：这一方棋盘边的护卫坐立不安——原地东张西望，不时有人挪两步又站回去
  let restT = 0;
  function restless(side) {
    for (const c of camps) {
      const on = c.s === side && c.state === 'home';
      if (on === !!c.restless) continue;
      c.restless = on;
      for (const u of c.guards.units) {
        if (u.gone || (u.mv && !u.mv.rest)) continue;
        if (on) { if (u.pose === 'idle') u.pose = 'fidget'; }
        else if (u.pose === 'fidget' || u.mv) {
          // 安静下来：站回原位、转回原来的朝向
          const away = u.p.distanceTo(u.home) > 0.02, m = { to: away ? u.home.clone() : null, speed: 1.2, pose: away ? 'march' : 'idle', end: 'idle', face: u.homeYaw };
          u.pose = 'idle'; u.mv = m; setTimeout(() => { if (u.mv === m) u.mv = null; }, 1300);
        }
      }
    }
  }
  onFrame(dt => {
    restT -= dt; if (restT > 0) return; restT = 0.22;
    for (const c of camps) {
      if (!c.restless || c.state !== 'home') continue;
      for (const u of c.guards.units) if (!u.gone && !u.mv && u.pose === 'idle') u.pose = 'fidget';
      const us = c.guards.units.filter(u => !u.gone && !u.mv && u.pose === 'fidget');
      for (let i = 0; i < 2 && us.length; i++) {
        const u = us[Math.floor(Math.random() * us.length)];
        const to = u.home.clone().add(new V3((Math.random() - 0.5) * 0.22, 0, (Math.random() - 0.5) * 0.26));
        u.mv = { rest: true, to, speed: 0.9 + Math.random() * 0.6, pose: 'march', end: 'fidget', face: u.homeYaw, onArrive: uu => { uu.mv = null; uu.yaw = uu.homeYaw + (Math.random() - 0.5) * 0.9; } };
      }
    }
  });
  // 轮到哪一方走：那一方大帐旁的两把火炬点亮（null = 都熄）
  function setTurn(side) { for (const c of camps) c.torch = c.s === side; }

  // ======================================================================
  //  士兵调度：每个士兵可有一个移动目标 u.mv
  // ======================================================================
  const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
  // 观战木桥桥面高度（拱桥，两端各有一小段坡道）
  function bridgeY(p) {
    if (Math.abs(Math.abs(p.x) - Board.BRIDGE_X) > 0.72) return null;
    const a = Math.abs(p.z);
    if (a <= 1.2) return 0.185 + 0.1 * Math.cos(a / 1.2 * Math.PI / 2);
    if (a < 1.5) return 0.185 * (1 - (a - 1.2) / 0.3);
    return null;
  }
  function ground(p) {
    const by = bridgeY(p); if (by != null) return by;
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
  function cheer(s, dur = 2.4, loud = 1, big = false) {
    const c = campOf(s);
    if (!c || c.state !== 'home') return;
    const gen = c.gen;
    for (const tr of c.troops) for (const u of tr.units) {
      if (u.mv || u.gone) continue;
      const d = Math.random() * 0.35;
      setTimeout(() => { if (c.gen !== gen || c.state !== 'home') return; u.pose = 'wave'; if (Math.random() < 0.5) tr.act(u.i, 'raise', 0.5); }, d * 1000);
      setTimeout(() => { if (c.gen !== gen || c.state !== 'home') return; if (u.pose === 'wave') u.pose = 'idle'; }, (dur + d + Math.random() * 0.5) * 1000);
    }
    try { Sfx.celebrate ? Sfx.celebrate(0.75 * loud, big) : Sfx.cheer(0.1, 0.55 * loud); } catch (e) { }
  }
  // 地动山摇：两边营里站着的兵全被震倒，过一会儿爬起来（c = 震源）
  function quake(center) {
    for (const c of camps) {
      if (c.state !== 'home') continue;
      const gen = c.gen;
      for (const tr of c.troops) for (const u of tr.units) {
        if (u.mv || u.gone || u.dead || u._q) continue;
        u._q = true;
        const d = Math.hypot(u.p.x - center.x, u.p.z - center.z);
        u.fallDir = Math.atan2(u.p.x - center.x, u.p.z - center.z) + (Math.random() - 0.5) * 0.8;
        setTimeout(() => {
          if (c.gen !== gen) { u._q = false; return; }
          Core.tween(0.3, k => { u.fall = k * 0.97; }, Core.ease.in).then(() => Core.sleep(0.7 + Math.random() * 0.8)).then(() => Core.tween(0.5, k => { u.fall = 0.97 * (1 - k); })).then(() => { u.fall = 0; u._q = false; });
        }, 60 + d * 28);
      }
    }
  }
  // 多段路线：依次走过各点
  function route(c, u, pts, { speed = 2.4, pose = 'run', delay = 0, onDone } = {}) {
    const gen = c.gen;
    let i = 0;
    const next = () => {
      if (c.gen !== gen) return;
      if (i >= pts.length) { if (onDone) onDone(u); return; }
      const to = pts[i++];
      u.mv = { to, speed, delay: i === 1 ? delay : 0, pose, onArrive: () => next() };
    };
    next();
  }
  const present = c => [...c.guards.units.map(u => [c.guards, u]), ...c.sentries.units.map(u => [c.sentries, u])].filter(([, u]) => !u.gone);
  // —— 被吃子：全营摇头、垂头丧气 ——
  function dismay(s) {
    const c = campOf(s);
    if (!c || c.state !== 'home') return;
    const gen = c.gen;
    for (const [, u] of present(c)) {
      if (u.mv) continue;
      const d = Math.random() * 0.5;
      const ok = () => c.gen === gen && !u.mv && !u.gone;
      setTimeout(() => { if (ok()) u.pose = 'shake'; }, d * 1000);
      setTimeout(() => { if (ok() && u.pose === 'shake') u.pose = 'slump'; }, (d + 1.3 + Math.random() * 0.4) * 1000);
      setTimeout(() => { if (ok() && u.pose === 'slump') u.pose = 'idle'; }, (d + 3.3 + Math.random() * 0.6) * 1000);
    }
    try { Sfx.groan && Sfx.groan(0.4); } catch (e) { }
  }
  // —— 连吃三子：几名护卫过桥冲到对方营前叫阵，再跑回来 ——
  function taunt(s) {
    const c = campOf(s), o = campOf(XQ.other(s));
    if (!c || c.state !== 'home') return;
    const gen = c.gen, sg = c.sg, BXr = Board.BRIDGE_X;
    const cand = c.guards.units.filter(u => !u.gone && !u.mv).sort((a, b) => Math.abs(a.p.z) - Math.abs(b.p.z));
    const picked = cand.slice(0, Math.min(cand.length, 4 + Math.floor(Math.random() * 3)));
    picked.forEach((u, j) => {
      const sx = Math.sign(u.home.x) || 1;
      const lane = sx * (BXr - 0.4 + (j % 2) * 0.18);
      const w1 = new V3(lane, 0, sg * 1.6), w2 = new V3(lane, 0, -sg * 1.6);
      const spot = new V3(sx * (6.4 + (j % 3) * 0.22), 0, -sg * (1.95 + Math.floor(j / 2) * 0.42));
      const face = sx > 0 ? -Math.PI / 2 : Math.PI / 2; // 面朝对方营里的护卫
      route(c, u, [w1, w2, spot], {
        speed: 2.3 + Math.random() * 0.4, pose: 'run', delay: j * 0.12 + Math.random() * 0.15,
        onDone: () => {
          if (c.gen !== gen) return;
          u.mv = { face, pose: 'wave' }; c.guards.act(u.i, 'raise', 0.5, Math.random() * 0.3);
          setTimeout(() => { if (c.gen === gen && u.mv && u.mv.face === face) u.pose = 'laugh'; }, 900 + Math.random() * 300);
          setTimeout(() => { if (c.gen === gen && u.mv && u.mv.face === face) { u.pose = 'wave'; c.guards.act(u.i, 'raise', 0.5); } }, 2000);
          setTimeout(() => {
            if (c.gen !== gen) return;
            route(c, u, [w2, w1, u.home.clone()], {
              speed: 2.1 + Math.random() * 0.3, pose: 'run',
              onDone: () => { const m = { face: u.homeYaw, pose: 'idle' }; u.mv = m; setTimeout(() => { if (u.mv === m) u.mv = null; }, 900); },
            });
          }, 3200);
        },
      });
    });
    // 到位时叫阵；对方营中靠近的护卫转身举兵戒备
    setTimeout(() => {
      if (c.gen !== gen) return;
      try { Sfx.jeer && Sfx.jeer(s, 0.8); } catch (e) { }
      if (!o || o.state !== 'home') return;
      const og = o.gen;
      for (const u of o.guards.units) {
        if (u.gone || u.mv || Math.abs(u.p.z) > 4.2) continue;
        const sx = Math.sign(u.p.x) || 1;
        const m = { face: sx > 0 ? Math.PI / 2 : -Math.PI / 2, pose: 'ready' };
        u.mv = m;
        setTimeout(() => { if (o.gen !== og || u.mv !== m) return; const m2 = { face: u.homeYaw, pose: 'idle' }; u.mv = m2; setTimeout(() => { if (u.mv === m2) u.mv = null; }, 900); }, 3000 + Math.random() * 500);
      }
    }, 2100);
  }
  // —— 连吃三子：另有几名护卫直接冲上棋盘，蹚过楚河，到对方阵前（敌方半场头两排之间）挥兵器、大笑叫阵，再跑回来 ——
  function tauntBoard(s) {
    const c = campOf(s);
    if (!c || c.state !== 'home') return;
    const gen = c.gen, sg = c.sg, RZ = Board.RZ;
    const cand = c.guards.units.filter(u => !u.gone && !u.mv).sort((a, b) => Math.abs(a.p.z) - Math.abs(b.p.z));
    const n = Math.min(cand.length, 4 + Math.floor(Math.random() * 2));
    if (!n) return;
    // 站在格子之间（半格位），不压棋子
    const xs = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].sort(() => Math.random() - 0.5).slice(0, n).sort((a, b) => a - b);
    const picked = cand.slice(0, n).sort((a, b) => a.home.x - b.home.x);
    const face = sg > 0 ? Math.PI : 0; // 面朝对方底线
    picked.forEach((u, j) => {
      const sx = Math.sign(u.home.x) || 1;
      const w1 = new V3(sx * 4.35, 0, sg * (RZ + 0.5)); // 从侧面跳上棋盘（己方河岸）
      const spot = new V3(xs[j], 0, -sg * (RZ + 0.5 + (j % 2)));
      route(c, u, [w1, spot], {
        speed: 2.7 + Math.random() * 0.4, pose: 'run', delay: j * 0.1 + Math.random() * 0.12,
        onDone: () => {
          if (c.gen !== gen) return;
          const m = { face, pose: 'wave' }; u.mv = m; c.guards.act(u.i, 'raise', 0.5, Math.random() * 0.3);
          const ok = () => c.gen === gen && u.mv === m;
          setTimeout(() => { if (ok()) u.pose = 'laugh'; }, 800 + Math.random() * 300);
          setTimeout(() => { if (ok()) { u.pose = 'wave'; c.guards.act(u.i, 'raise', 0.5); } }, 1900);
          setTimeout(() => { if (ok()) u.pose = 'laugh'; }, 2500);
          setTimeout(() => {
            if (!ok()) return;
            route(c, u, [w1, u.home.clone()], {
              speed: 2.5 + Math.random() * 0.3, pose: 'run',
              onDone: () => { const m2 = { face: u.homeYaw, pose: 'idle' }; u.mv = m2; setTimeout(() => { if (u.mv === m2) u.mv = null; }, 900); },
            });
          }, 3400 + Math.random() * 300);
        },
      });
    });
    setTimeout(() => { if (c.gen === gen) { try { Sfx.jeer && Sfx.jeer(s, 0.9); } catch (e) { } } }, 1700);
  }
  // —— 连吃三子：被吃方有几人丢盔弃甲逃走，本局不再回来（最多逃掉三分之二） ——
  function desert(s, n) {
    const c = campOf(s);
    if (!c || c.state !== 'home') return 0;
    n = Math.min(n, Math.floor(c.total * 2 / 3) - c.goneN);
    if (n <= 0) return 0;
    const cand = present(c).filter(([, u]) => !u.mv);
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const picked = cand.slice(0, n);
    const gen = c.gen;
    picked.forEach(([tr, u], k) => {
      u.gone = true; c.goneN++;
      const delay = 0.2 + k * 0.25 + Math.random() * 0.3;
      setTimeout(() => {
        if (c.gen !== gen) return;
        for (const part of ['weapon', 'shield']) {
          const ob = tr.detach(u.i, part);
          if (!ob) continue;
          scene.add(ob); c.drops.push(ob);
          const p0 = ob.position.clone(), q0 = ob.quaternion.clone();
          const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), Math.random() * 6.28, 0, 'YXZ'));
          const p1 = p0.clone().add(new V3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)); p1.y = ground(p1) + 0.02;
          Core.tween(0.35 + Math.random() * 0.2, k2 => { ob.position.lerpVectors(p0, p1, k2); ob.quaternion.slerpQuaternions(q0, q1, k2); }, Core.ease.in);
        }
      }, delay * 1000);
      const sx = Math.sign(u.p.x) || 1;
      const dir = new V3(sx, 0, c.sg * (0.5 + Math.random() * 0.9)).normalize();
      u.mv = { to: u.p.clone().addScaledVector(dir, 6 + Math.random() * 2), speed: 2.2 + Math.random() * 0.6, delay: delay + 0.3, pose: 'flee', fadeAt: 2 + Math.random() };
    });
    try { Sfx.desert && Sfx.desert(0.6); } catch (e) { }
    return n;
  }
  // —— 吃子总入口：吃子方欢呼擂鼓、被吃方垂头丧气；连吃三子起，叫阵 + 逃兵 ——
  function onCapture(s, streak = 1) {
    const big = streak >= 3;
    cheer(s, big ? 3.2 : 2.4, 1, big);
    dismay(XQ.other(s));
    if (big) { tauntBoard(s); taunt(s); setTimeout(() => desert(XQ.other(s), 3 + (Math.random() < 0.5 ? 1 : 0)), 1300); }
  }
  // —— 将死：全军冲上棋盘，持兵器包围敌方主帅 ——
  function surround(s, center) {
    const c = campOf(s);
    if (!c) return 0;
    c.state = 'surround'; c.gen++;
    const units = [];
    for (const tr of [c.guards, c.sentries]) for (const u of tr.units) if (!u.gone) units.push([tr, u]);
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
    for (const tr of c.troops) for (const u of tr.units) if (!u.gone) all.push([tr, u]);
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
      c.gen++; c.state = 'home'; c.goneN = 0; c.restless = false;
      for (const o of c.drops) Core.disposeTree(o);
      c.drops.length = 0;
      for (const tr of c.troops) for (const u of tr.units) {
        u.mv = null; u.p.copy(u.home); u.yaw = u.homeYaw; u.y = 0; u.vis = 1; u.lost = 0; u.act = null;
        u.dead = false; u.fall = 0; u.falling = false; u.fly = null; u.spin = 0; u.pose = 'idle'; u.gone = false;
      }
    }
  }
  return { quake, init, camps, cheer, surround, rout, reset, K, onCapture, taunt, desert, dismay, setTurn, restless, tauntBoard, get gone() { return camps.map(c => c.goneN); } };
})();
