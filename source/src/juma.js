// 拒马路障（美术，TD H29 / Ham 10-10 10:52「士兵周边还会带刺的有路障，明确表示他们在此建立了防御工事」）
//   JumaWall.make(side, n) → { group, pieces[], update(dt), shake(dir, power), shatter(dir, power), reset(), dispose() }
//   group 摆在持矛兵小队的锚点上、和小队同一个朝向：自己的坐标 +z 朝来敌、+x 往右，单位是棋盘单位（和 Squads 的 offsets 一样）。
//   n：兵法等级（2 两人并排、3 前二后一、4 三名斩马刀手一字排开；1 照 2 画）。
//   掉血时 shake：路障不碎，整排往后一挫晃两晃；打死（被冲散、棋子被吃）时 shatter：彻底碎掉，每段拆成三截横木和一根根尖桩飞出去（Ham 审批台 090）。
window.JumaWall = (() => {
  const { P, G, inkedMerged, SIDE } = Models;
  const V3 = THREE.Vector3, PI = Math.PI, R = (a, b) => a + Math.random() * (b - a);
  const WOOD = 0x6b4a2e, BARK = 0x4e3522, CUT = 0xd9bf8c, ROPE = 0x2a241e;
  const bigFor = n => [1, 1.5, 1.35, 1.22, 1.15][n] || 1;
  // 一段拒马（自己的坐标：横木沿 x，长 len；尖桩在 y-z 面里交叉成 X，朝前那根长、尖头朝外上方）；单位：兵的模型单位（人高约 1.9）
  function segment(side, len, lo) {
    const parts = [], frags = [], c = SIDE[side] || SIDE.r, k = lo ? 0 : 1;
    const by = 0.22;   // 横木离地：前后两根桩的下端正好着地
    // 横木分三截（彻底碎掉时各飞各的），两头锯口
    const nb = 3, bl = len / nb;
    for (let j = 0; j < nb; j++) { const cx = -len / 2 + bl * (j + 0.5), f = [P(G.cyl(0.075, 0.075, bl * 0.98, 7 - 2 * !k), WOOD, cx, by, 0, 0, 0, PI / 2)]; if (j === 0 || j === nb - 1) f.push(P(G.cyl(0.078, 0.078, 0.02, 7 - 2 * !k), CUT, (j ? 1 : -1) * len / 2, by, 0, 0, 0, PI / 2)); frags.push(f); }
    const nPair = Math.max(2, Math.round(len / 0.3));
    for (let i = 0; i < nPair; i++) {
      const x = (i + 0.5) / nPair * len - len / 2 + (i % 2 ? 0.02 : -0.02);
      // 朝前的桩：从后下方穿过横木，尖头朝前上方（约 50°）
      const af = 0.9 + (i % 3) * 0.06, Lf = 1.05;
      const cf = new V3(0, by, 0).add(new V3(0, Math.cos(af), Math.sin(af)).multiplyScalar(0.18));
      frags.push([P(G.cyl(0.032, 0.04, Lf, 5), i % 2 ? WOOD : BARK, x, cf.y, cf.z, af, 0, 0), P(G.cone(0.032, 0.16, 5), CUT, x, cf.y + Math.cos(af) * (Lf / 2 + 0.08), cf.z + Math.sin(af) * (Lf / 2 + 0.08), af, 0, 0)]);
      // 朝后的桩：短一点，往后上方，撑地
      const ab = -0.75 - (i % 2) * 0.08, Lb = 0.82;
      const cb = new V3(0, by, 0).add(new V3(0, Math.cos(ab), Math.sin(ab)).multiplyScalar(0.12));
      const fb = [P(G.cyl(0.03, 0.036, Lb, 5), i % 2 ? BARK : WOOD, x + 0.035, cb.y, cb.z, ab, 0, 0), P(G.cone(0.03, 0.13, 5), CUT, x + 0.035, cb.y + Math.cos(ab) * (Lb / 2 + 0.065), cb.z + Math.sin(ab) * (Lb / 2 + 0.065), ab, 0, 0)];
      if (k) fb.push(P(G.box(0.1, 0.05, 0.16), ROPE, x + 0.018, by, 0.01, 0.3));   // 交叉处的绑绳
      frags.push(fb);
    }
    // 中间系一条本方颜色的布条，远看能分汉楚（跟着中间那截横木走）
    frags[1].push(P(G.box(0.14, 0.06, 0.17), c.flag, 0, by + 0.005, 0));
    if (k) frags[1].push(P(G.box(0.06, 0.28, 0.012), c.flag, 0.03, by - 0.16, 0.09, 0.15, 0, 0.12));
    for (const f of frags) parts.push(...f);
    const mesh = inkedMerged(parts); mesh.userData.frags = frags; mesh.userData.lo = lo;
    return mesh;
  }
  // 各级的摆法（棋盘单位）：每段 [中点 x, 中点 z, 朝向（绕 y，0 = 横木沿 x、尖头朝 +z）, 长]
  const LAYOUT = {
    2: [[-0.17, 0.33, 0.12, 0.32], [0.17, 0.33, -0.12, 0.32], [-0.37, 0.12, 1.05, 0.3], [0.37, 0.12, -1.05, 0.3]],
    3: [[-0.19, 0.4, 0.12, 0.34], [0.19, 0.4, -0.12, 0.34], [-0.41, 0.16, 1.0, 0.32], [0.41, 0.16, -1.0, 0.32]],
    4: [[-0.36, 0.31, 0.2, 0.33], [0, 0.36, 0, 0.33], [0.36, 0.31, -0.2, 0.33], [-0.6, 0.08, 1.05, 0.3], [0.6, 0.08, -1.05, 0.3]],
  };
  function make(side, n = 2) {
    const lv = Math.max(2, Math.min(4, n || 2)), elite = lv >= 4, kk = 0.2 * bigFor(elite ? 3 : lv) * (elite ? 1.08 : 1);
    const lo = typeof Core !== 'undefined' && Core.quality === 'low';
    const group = new THREE.Group(); group.name = 'jumaWall';
    const pieces = LAYOUT[lv].map(([x, z, yaw, len], i) => {
      const g = new THREE.Group(); g.add(segment(side, len / kk, lo)); g.scale.setScalar(kk);
      g.position.set(x, 0, z); g.rotation.y = yaw; g.userData.home = { p: g.position.clone(), q: g.quaternion.clone() };
      group.add(g); return g;
    });
    let fly = [], chips = [], frags = [], shk = null;
    const chipGeo = new THREE.BoxGeometry(0.02, 0.012, 0.05), chipMat = Core.toon ? Core.toon(CUT) : new THREE.MeshLambertMaterial({ color: CUT });
    const localDir = dir => {   // dir：撞过来的方向（世界里，水平）；换到路障自己的坐标里
      group.updateWorldMatrix(true, false);
      const inv = group.getWorldQuaternion(new THREE.Quaternion()).invert();
      return (dir ? dir.clone().setY(0).normalize() : new V3(0, 0, -1).applyQuaternion(group.quaternion)).applyQuaternion(inv);
    };
    function chipsAt(d, n, power) {
      for (let i = 0; i < (lo ? Math.ceil(n / 2) : n); i++) {
        const src = pieces[i % pieces.length], m = new THREE.Mesh(chipGeo, chipMat);
        m.position.copy(src.position).add(new V3(R(-0.1, 0.1), R(0.04, 0.12), R(-0.06, 0.06)));
        m.rotation.set(R(0, 6), R(0, 6), R(0, 6)); m.scale.setScalar(R(0.7, 1.6)); group.add(m);
        chips.push({ m, v: d.clone().multiplyScalar(R(0.4, 2) * power).add(new V3(R(-1, 1), R(1, 3) * Math.min(1.5, power), R(-1, 1))), w: R(-14, 14) });
      }
    }
    // 掉血（没打死）：路障不碎，挨撞的那一下整排往后一挫、晃两晃，崩几片木屑
    function shake(dir, power = 1) {
      const d = localDir(dir); shk = { d, t: 0, a: 0.035 * Math.min(1.5, power) };
      chipsAt(d, 8, 0.6 * power);
    }
    // 打死（被冲散、棋子被吃）：彻底碎掉——每段拆成三截横木、一根根尖桩，各自飞出去，木屑一大蓬
    function shatter(dir, power = 1) {
      const d = localDir(dir); shk = null;
      for (const g of pieces) {
        if (!g.visible) continue; g.visible = false; g.updateMatrix();
        const fr = g.children[0].userData.frags;
        for (const f of fr) {
          const c = new V3(); let nn = 0; for (const p of f) { c.add(new V3().setFromMatrixPosition(p.m)); nn++; } c.multiplyScalar(1 / nn);
          const T = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z), ps = f.map(p => ({ geo: p.geo, color: p.color, m: p.m.clone().premultiply(T) }));
          const o = inkedMerged(ps); o.scale.setScalar(kk); o.quaternion.copy(g.quaternion); o.position.copy(c.clone().applyMatrix4(g.matrix)); group.add(o); frags.push(o);
          const out = o.position.clone().setY(0); if (out.lengthSq() > 1e-6) out.normalize();
          const v = d.clone().multiplyScalar(R(0.8, 2.6) * power).addScaledVector(out, R(0.3, 1.2)).add(new V3(R(-0.5, 0.5), R(1.4, 3.4) * Math.min(1.7, power), R(-0.5, 0.5)));
          fly.push({ g: o, v, w: new V3(R(-14, 14), R(-10, 10), R(-14, 14)), p0: o.position.clone(), q0: o.quaternion.clone(), t: 0, done: false });
        }
      }
      chipsAt(d, 40, power);
    }
    const scatter = shatter;
    const DG = 9, Q = new THREE.Quaternion();
    function update(dt) {
      if (shk) { shk.t += dt; const t = shk.t, k = t < 0.06 ? t / 0.06 : Math.exp(-(t - 0.06) * 7) * Math.cos((t - 0.06) * 30);
        for (const g of pieces) { const h = g.userData.home; g.position.copy(h.p).addScaledVector(shk.d, shk.a * k); g.rotation.x = 0; g.quaternion.copy(h.q).premultiply(Q.setFromAxisAngle(new V3(-shk.d.z, 0, shk.d.x), -0.06 * k)); }
        if (t > 0.8) { for (const g of pieces) { g.position.copy(g.userData.home.p); g.quaternion.copy(g.userData.home.q); } shk = null; } }
      for (const f of fly) {
        if (f.done) continue; f.t += dt; const t = f.t, y = f.p0.y + f.v.y * t - 0.5 * DG * t * t;
        if (y < 0.012 && t > 0.1) { f.done = true; f.g.position.y = 0.012; continue; }   // 落地就停
        f.g.position.set(f.p0.x + f.v.x * t, y, f.p0.z + f.v.z * t);
        f.g.quaternion.copy(f.q0).premultiply(Q.setFromAxisAngle(f.w.clone().normalize(), f.w.length() * t));
      }
      for (const c of chips) {
        if (c.done) continue;
        c.v.y -= DG * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.w * dt; c.m.rotation.z += c.w * 0.6 * dt;
        if (c.m.position.y <= 0.004 && c.v.y < 0) { c.m.position.y = 0.004; c.v.set(0, 0, 0); c.w = 0; c.done = true; }
      }
    }
    function reset() {   // 收回原样（演出重来、或者拒马再架起来）
      fly = []; shk = null; for (const c of chips) group.remove(c.m); chips = [];
      for (const o of frags) { group.remove(o); o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); } frags = [];
      for (const g of pieces) { g.visible = true; g.position.copy(g.userData.home.p); g.quaternion.copy(g.userData.home.q); }
    }
    function dispose() {
      reset(); group.traverse(o => { if (o.geometry && o.geometry !== chipGeo) o.geometry.dispose(); }); chipGeo.dispose(); if (group.parent) group.parent.remove(group);
    }
    return { group, pieces, update, shake, shatter, scatter, reset, dispose };
  }
  return { make };
})();
