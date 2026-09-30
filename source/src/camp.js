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
    const hq = Core.quality === 'high';
    const guards = new Models.Army(s, 'spear', 44, K);
    guards.mesh.castShadow = false; if (!hq) guards.outline.visible = false;
    const gi = [];
    let n = 0;
    for (const side of [-1, 1]) for (let line = 0; line < 2; line++) for (let i = 0; i < 11; i++) {
      const u = guards.units[n++];
      u.p.set(side * (5.25 + line * 0.36), 0, sg * (0.95 + i * 0.42));
      u.yaw = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      gi.push(u);
    }
    guards.gait = 'idle';
    scene.add(guards.group);
    // 营门与大帐前的卫兵
    const sentries = new Models.Army(s, 'sword', 6, K);
    sentries.mesh.castShadow = false;
    [[-0.7, 10.35], [0.7, 10.35], [-1.3, 6.7], [1.3, 6.7], [-6.3, 7.4], [6.3, 7.4]].forEach(([x, z], i) => {
      const u = sentries.units[i]; u.p.set(x, 0, sg * z); u.yaw = sg > 0 ? Math.PI : 0;
    });
    sentries.gait = 'idle';
    scene.add(sentries.group);
    // 望楼上的弓手
    const archers = new Models.Army(s, 'archer', 2, K);
    archers.units.forEach((u, i) => { u.p.set((i ? 1 : -1) * 6.3, 6.4 * K, sg * 6.6); u.yaw = sg > 0 ? Math.PI : 0; });
    archers.gait = 'idle';
    scene.add(archers.group);

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
    const camp = { s, group, guards, sentries, archers, banners, flames, fires };
    camps.push(camp);
    onFrame(dt => {
      t += dt;
      guards.update(dt); sentries.update(dt); archers.update(dt);
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
  // Army 的"待命"姿态：轻微呼吸与左右张望
  const origUpdate = Models.Army.prototype.update;
  Models.Army.prototype.update = function (dt) {
    if (this.gait !== 'idle') return origUpdate.call(this, dt);
    this.t += dt;
    for (let i = 0; i < this.count; i++) {
      const u = this.units[i];
      this._e.set(u.lean, u.yaw + Math.sin(this.t * 0.4 + u.phase * 3) * 0.12, 0);
      this._q.setFromEuler(this._e);
      const s = this.scale * u.s * u.vis;
      this._s.set(s, s * (1 + Math.sin(this.t * 1.6 + u.phase) * 0.012), s);
      this._v.set(u.p.x, u.p.y + u.y, u.p.z);
      this._m.compose(this._v, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m); this.outline.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.outline.instanceMatrix.needsUpdate = true;
  };
  function init() { build('r'); build('b'); }
  // 护卫为本方喝彩（吃子后）
  function cheer(s) {
    const c = camps.find(c => c.s === s);
    if (!c) return;
    const us = c.guards.units;
    Core.tween(1.0, k => { for (const u of us) u.y = Math.abs(Math.sin(k * Math.PI * 3 + u.phase)) * 0.06 * (1 - k); }, Core.ease.linear);
  }
  return { init, camps, cheer, K };
})();
