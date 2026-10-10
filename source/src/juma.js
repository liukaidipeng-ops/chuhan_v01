// 拒马路障（美术，TD H29 / Ham 10-10 10:52「士兵周边还会带刺的有路障，明确表示他们在此建立了防御工事」）
//   JumaWall.make(side, n) → { group, pieces[], update(dt), scatter(dir, power), dispose() }
//   group 摆在持矛兵小队的锚点上、和小队同一个朝向：自己的坐标 +z 朝来敌、+x 往右，单位是棋盘单位（和 Squads 的 offsets 一样）。
//   n：兵法等级（2 两人并排、3 前二后一、4 三名斩马刀手一字排开；1 照 2 画）。
//   每一段拒马是一个 piece（一根横木穿一排交叉的尖桩），能单独飞出去；scatter 把所有段顺着 dir 掀飞、木屑乱崩。
window.JumaWall = (() => {
  const { P, G, inkedMerged, SIDE } = Models;
  const V3 = THREE.Vector3, PI = Math.PI, R = (a, b) => a + Math.random() * (b - a);
  const WOOD = 0x6b4a2e, BARK = 0x4e3522, CUT = 0xd9bf8c, ROPE = 0x2a241e;
  const bigFor = n => [1, 1.5, 1.35, 1.22, 1.15][n] || 1;
  // 一段拒马（自己的坐标：横木沿 x，长 len；尖桩在 y-z 面里交叉成 X，朝前那根长、尖头朝外上方）；单位：兵的模型单位（人高约 1.9）
  function segment(side, len, lo) {
    const parts = [], c = SIDE[side] || SIDE.r, k = lo ? 0 : 1;
    const by = 0.22;   // 横木离地：前后两根桩的下端正好着地
    parts.push(P(G.cyl(0.075, 0.075, len, 7 - 2 * !k), WOOD, 0, by, 0, 0, 0, PI / 2));
    for (const s of [-1, 1]) parts.push(P(G.cyl(0.078, 0.078, 0.02, 7 - 2 * !k), CUT, s * len / 2, by, 0, 0, 0, PI / 2));   // 两头的锯口
    const nPair = Math.max(2, Math.round(len / 0.3));
    for (let i = 0; i < nPair; i++) {
      const x = (i + 0.5) / nPair * len - len / 2 + (i % 2 ? 0.02 : -0.02);
      // 朝前的桩：从后下方穿过横木，尖头朝前上方（约 50°）
      const af = 0.9 + (i % 3) * 0.06, Lf = 1.05;
      const cf = new V3(0, by, 0).add(new V3(0, Math.cos(af), Math.sin(af)).multiplyScalar(0.18));
      parts.push(P(G.cyl(0.032, 0.04, Lf, 5), i % 2 ? WOOD : BARK, x, cf.y, cf.z, af, 0, 0));
      parts.push(P(G.cone(0.032, 0.16, 5), CUT, x, cf.y + Math.cos(af) * (Lf / 2 + 0.08), cf.z + Math.sin(af) * (Lf / 2 + 0.08), af, 0, 0));
      // 朝后的桩：短一点，往后上方，撑地
      const ab = -0.75 - (i % 2) * 0.08, Lb = 0.82;
      const cb = new V3(0, by, 0).add(new V3(0, Math.cos(ab), Math.sin(ab)).multiplyScalar(0.12));
      parts.push(P(G.cyl(0.03, 0.036, Lb, 5), i % 2 ? BARK : WOOD, x + 0.035, cb.y, cb.z, ab, 0, 0));
      parts.push(P(G.cone(0.03, 0.13, 5), CUT, x + 0.035, cb.y + Math.cos(ab) * (Lb / 2 + 0.065), cb.z + Math.sin(ab) * (Lb / 2 + 0.065), ab, 0, 0));
      if (k) parts.push(P(G.box(0.1, 0.05, 0.16), ROPE, x + 0.018, by, 0.01, 0.3));   // 交叉处的绑绳
    }
    // 中间系一条本方颜色的布条，远看能分汉楚
    parts.push(P(G.box(0.14, 0.06, 0.17), c.flag, 0, by + 0.005, 0));
    if (k) parts.push(P(G.box(0.06, 0.28, 0.012), c.flag, 0.03, by - 0.16, 0.09, 0.15, 0, 0.12));
    return inkedMerged(parts);
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
    let fly = null, chips = [];
    const chipGeo = new THREE.BoxGeometry(0.02, 0.012, 0.05), chipMat = Core.toon ? Core.toon(CUT) : new THREE.MeshLambertMaterial({ color: CUT });
    function scatter(dir, power = 1) {
      // dir：撞过来的方向（世界里，水平）；换到路障自己的坐标里
      group.updateWorldMatrix(true, false);
      const inv = new THREE.Quaternion().copy(group.getWorldQuaternion(new THREE.Quaternion())).invert();
      const d = (dir ? dir.clone().setY(0).normalize() : new V3(0, 0, -1).applyQuaternion(group.quaternion)).applyQuaternion(inv);
      fly = pieces.map(g => {
        const out = g.position.clone().setY(0).normalize();
        const v = d.clone().multiplyScalar(R(1.4, 2.4) * power).addScaledVector(out, R(0.3, 0.8)).add(new V3(0, R(1.6, 2.8) * Math.min(1.6, power), 0));
        return { g, v, w: new V3(R(-9, 9), R(-6, 6), R(-9, 9)), p0: g.position.clone(), q0: g.quaternion.clone(), t: 0, done: false };
      });
      for (let i = 0; i < (lo ? 10 : 26); i++) {
        const src = pieces[i % pieces.length], m = new THREE.Mesh(chipGeo, chipMat);
        m.position.copy(src.position).add(new V3(R(-0.1, 0.1), R(0.08, 0.16), R(-0.06, 0.06)));
        m.rotation.set(R(0, 6), R(0, 6), R(0, 6)); group.add(m);
        chips.push({ m, v: d.clone().multiplyScalar(R(0.6, 2) * power).add(new V3(R(-1, 1), R(1.2, 3), R(-1, 1))), w: R(-14, 14), t: 0 });
      }
    }
    const DG = 9, Q = new THREE.Quaternion();
    function update(dt) {
      if (fly) for (const f of fly) {
        if (f.done) continue; f.t += dt; const t = f.t, y = f.v.y * t - 0.5 * DG * t * t;
        if (y < -0.001 && t > 0.1) { f.done = true; f.g.position.y = 0; const e = new THREE.Euler().setFromQuaternion(f.g.quaternion, 'YXZ'); e.x = 0; e.z = Math.random() < 0.5 ? 0 : PI * 0.5 * Math.sign(R(-1, 1)) * 0.25; f.g.quaternion.setFromEuler(e); continue; }   // 落地：放平躺着
        f.g.position.set(f.p0.x + f.v.x * t, Math.max(0, y), f.p0.z + f.v.z * t);
        f.g.quaternion.copy(f.q0).premultiply(Q.setFromAxisAngle(f.w.clone().normalize(), f.w.length() * t));
      }
      for (const c of chips) {
        if (c.done) continue; c.t += dt; const t = c.t, y = c.m.position.y;
        c.v.y -= DG * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.w * dt; c.m.rotation.z += c.w * 0.6 * dt;
        if (c.m.position.y <= 0.004 && c.v.y < 0) { c.m.position.y = 0.004; c.v.set(0, 0, 0); c.w = 0; c.done = true; }
      }
    }
    function reset() {   // 收回原样（演出重来、或者拒马再架起来）
      fly = null; for (const c of chips) group.remove(c.m); chips = [];
      for (const g of pieces) { g.position.copy(g.userData.home.p); g.quaternion.copy(g.userData.home.q); }
    }
    function dispose() {
      reset(); group.traverse(o => { if (o.geometry && o.geometry !== chipGeo) o.geometry.dispose(); }); chipGeo.dispose(); if (group.parent) group.parent.remove(group);
    }
    return { group, pieces, update, scatter, reset, dispose };
  }
  return { make };
})();
