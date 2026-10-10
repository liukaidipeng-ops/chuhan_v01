// 终局影片 · 最后一战 + 拔剑（CG组审批台 cg-003 选乙）。接着乌江拍：同一个岸边，从黎明到落日。
// 镜头和 film.js 一样：FILM[id]() → { ctx, cam, post, dur, update(t, dt) }。要先加载 film.js（用它的 FILM 表）。
// 路子：越往后越剪影——落日逆光，人物只剩轮廓，脸几乎不露（卡通脸和写实光不打架，悲剧也更含蓄）。
(() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, lerp = (a, b, k) => a + (b - a) * k;
  // 落日：太阳贴着地平线、偏红，天顶压暗，雾带暖
  const DUSK = { top: 0x3b3f52, hor: 0xe49a5c, bot: 0x5a4636, sunCol: 0xff9a4a, sunI: 2.4, hemi: 0.55, skyL: 0x6f6a78, gndL: 0x3e3228, fogCol: 0xc98a5a, fogD: 0.014, glow: 1.8, sunSize: 0.0016 };
  function duskStage(o = {}) {
    SB.reseed(o.seed ?? 31);
    const ctx = SB.stage(Object.assign({}, DUSK, o.sky || {}, { sun: o.sun || [0, 0.035, -1] }));
    SB.fill(ctx, o.fill || [0.4, 0.5, 1], 0x8a7c90, o.fillI ?? 0.35);
    SB.ground(ctx, { col: '#7a6448', mud: '#4a3a2a', cx: 0, cz: 0, flat: 50, shore: o.shore || { x: -14, wob: 2.5 } });
    SB.water(ctx, { x: 0, y: 0.0, size: 1200 });
    SB.ridges(ctx, { dist: 240, h: 18, col: 0x4a4048, seed: 9, layers: 3, yaw: 0.1 });
    return ctx;
  }
  const gy = (ctx, x, z) => Math.max(0, ctx.hAt(x, z));
  // 步战的项羽：不骑马，戟收起，右手换出长剑（剑身挂在右拳上，握轴自己定）
  function footXY(ctx, stage = 3) {
    const X = XY4.make({ stage }); ctx.add(SB.shadows(X.group)); X.J.ji.visible = false;
    X.POSES.dyn = { arms: { '-1': X.POSES.stand.arms['-1'].map(a => a.slice()), '1': X.POSES.stand.arms['1'].map(a => a.slice()) }, head: [0, 0, 0], chest: [0, 0, 0] };
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9c4b8, metalness: 0.85, roughness: 0.28 });
    const blade = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.86, 0.008), steel); b.position.y = 0.06 + 0.43; blade.add(b);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), steel); tip.scale.z = 0.27; tip.position.y = 0.06 + 0.86 + 0.04; blade.add(tip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.05), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.6, roughness: 0.4 })); guard.position.y = 0.05; blade.add(guard);
    SB.shadows(blade); X.J['hand-1'].add(blade);
    X.update(0.1);
    const swordRest = X.J.sword.position.clone();
    // dir：剑尖朝向（世界坐标）；hand：右拳在胸口坐标里的位置
    const aim = (dir) => { const h = X.J['hand-1'], q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()), pq = new THREE.Quaternion(); h.parent.getWorldQuaternion(pq); h.quaternion.copy(pq.invert().multiply(q)); X.group.updateMatrixWorld(true); };
    return { X, blade, aim, set(p, dt) { if (p.rh) X.POSES.dyn.arms['-1'] = [p.rh, p.rhPole || [-0.8, -0.3, -0.2]]; if (p.lh) X.POSES.dyn.arms['1'] = [p.lh, p.lhPole || [0.8, -0.3, -0.2]];
      X.POSES.dyn.head = p.head || [0, 0, 0]; X.POSES.dyn.chest = p.chest || [0, 0, 0]; X.setPose('dyn', 0.001); if (p.body) X.pose(p.body); X.update(dt); X.J.sword.position.copy(swordRest); if (p.dir) aim(p.dir); } };
  }
  // 一圈人：游戏里的小兵（实例化），放大成真人大小；拍的时候多在逆光里，只看轮廓
  function crowd(ctx, side, kind, pts, o = {}) {
    const T = new Models.Troop(side, kind, pts.length, o.scale ?? 1.05, { outline: false });
    pts.forEach((p, i) => { const u = T.units[i]; u.p.set(p[0], gy(ctx, p[0], p[1]), p[1]); u.yaw = p[2]; u.pose = o.pose || 'idle'; });
    T.group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    ctx.add(T.group); T.update(0.05); return T;
  }

  // ---------- B1 · 下马步战（4 秒）：落日江岸，项王持剑立在最前，身后二十几个楚兵；汉军围成半圈压在逆光里 ----------
  // 「乃令骑皆下马步行，持短兵接战。」镜头在项王身后偏低，长焦压缩，汉军的矛林顶着落日
  FILM.B1 = () => {
    const ctx = duskStage({ seed: 33, sun: [0.04, 0.03, -1] });
    // 汉军：前方 14～30 米一道弧，七八排，戈矛竖着，逆光只见剪影
    const han = [];
    for (let row = 0; row < 8; row++) for (let i = 0; i < 34; i++) {
      const a = (i / 33 - 0.5) * 2.2, r = 15 + row * 1.6 + SB.rr(-0.4, 0.4), x = Math.sin(a) * r * 1.3 + SB.rr(-0.3, 0.3), z = -Math.cos(a) * r - 4;
      han.push([x, z, Math.atan2(-x, -z - 4) + PI + SB.rr(-0.15, 0.15)]);
    }
    const H = crowd(ctx, 'r', 'spear', han, { pose: 'idle' });
    // 楚兵：项王身后两侧，二十几个，持刀盾，背对镜头
    const chu = [];
    for (let i = 0; i < 24; i++) { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2); chu.push([s * (1.6 + k * 0.75 + SB.rr(-0.3, 0.3)), 2.2 + k * 0.55 + SB.rr(-0.4, 0.4), PI + SB.rr(-0.2, 0.2)]); }
    const C = crowd(ctx, 'b', 'sword', chu, { pose: 'idle' });
    const F = footXY(ctx, 2); F.X.group.position.set(0, gy(ctx, 0, 0), 0); F.X.group.rotation.y = PI;   // 面朝 -z（汉军），背对镜头
    SB.dust(ctx, { n: 160, box: [-40, 40, 0, 6, -60, -10], s: [6, 18], op: [0.06, 0.16], col: 0xe6a676 });
    SB.dust(ctx, { n: 50, box: [-8, 8, 0, 2, -8, 6], s: [2, 5], op: [0.05, 0.12], col: 0xd59a6c });
    SB.rays(ctx, { n: 8, c: [0, 30, -170], len: 120, w: [6, 16], op: [0.04, 0.09], col: 0xffb070, spread: 40, tilt: 0 });
    ctx.shadowAt([0, 0, -10], 30);
    const cam = SB.cam([1.1, 1.25, 9.5], [0, 1.6, -20], 24), c0 = cam.position.clone();
    const post = { focus: 9.6, ap: 0.5, maxR: 12, exp: 1.0, gain: [1.08, 0.96, 0.84], sat: 0.88, vign: 0.55, grain: 0.06 };
    return { ctx, cam, dur: 4, post,
      update(t, dt) {
        // 项王：右手垂剑，剑尖斜指地；最后一秒慢慢把剑抬平，指向汉军
        const k = sm((t - 2.6) / 1.2);
        F.set({ rh: [-0.34 + 0.08 * k, -0.42 + 0.3 * k, 0.12 + 0.3 * k], head: [0.04, 0, 0], chest: [0.03, 0, 0], body: { hipsRx: 0.04, legs: { 1: [0.12, 0.08, 0.1], '-1': [-0.1, 0.08, 0.06] } },
          dir: V(lerp(-0.25, -0.05, k), lerp(-0.9, 0.05, k), lerp(-0.35, -1, k)) }, dt);
        H.update(dt); C.update(dt);
        cam.position.copy(c0).add(V(-0.25 * sm(t / 4), 0, -0.9 * sm(t / 4))); cam.lookAt(0, 1.6, -20);
        post.focus = cam.position.distanceTo(F.X.group.position.clone().add(V(0, 1.5, 0)));
      } };
  };

  // ---------- B7 · 拔剑（8 秒）：长焦远景，落日贴着地平线，项王的剪影立在日头正前方；风；拔剑，举起时切黑 ----------
  FILM.B7 = () => {
    const ctx = duskStage({ seed: 37, sun: [0, 0.012, -1], sky: { sunSize: 0.0009, glow: 2.2, fogD: 0.006 } });
    const F = footXY(ctx, 3); const P0 = V(0, gy(ctx, 0, -60), -60); F.X.group.position.copy(P0); F.X.group.rotation.y = PI / 2 + 0.25;   // 侧身对着镜头，面朝画右（江东）
    const rp = []; for (let i = 0; i < 40; i++) rp.push([SB.rr(-30, 30), 0, SB.rr(-70, -50)]);
    SB.reeds(ctx, rp.filter(q => Math.abs(q[0]) > 3), { per: 18, r: 1.0, h: [0.8, 1.8], col: 0x3a2e24 });
    SB.dust(ctx, { n: 60, box: [-30, 30, 0, 3, -75, -45], s: [3, 9], op: [0.04, 0.1], col: 0xe8a070 });
    ctx.shadowAt([0, 0, -60], 10);
    const cam = SB.cam([0.3, 1.35, 30], [0, 1.15, -60], 3.4, 1, 4000);
    const post = { focus: 90, ap: 0.12, maxR: 6, exp: 0.98, gain: [1.1, 0.94, 0.8], sat: 0.85, vign: 0.6, grain: 0.065 };
    return { ctx, cam, dur: 8, post,
      update(t, dt) {
        // 0–3 秒立着，低头；3–5 秒左手按鞘、右手握柄抽出（剑从鞘口往上滑出）；5–7 秒剑横到颈前；7.4 秒举起 → 切黑（剪辑里切）
        const draw = sm((t - 3) / 1.6), raise = sm((t - 5.2) / 1.6), lift = sm((t - 7.1) / 0.5);
        F.blade.visible = draw > 0.05;
        const hilt = V(0.25, -0.15, 0.2);   // 鞘口（左胯前）在胸口坐标里的大概位置
        const rhDraw = [lerp(-0.34, hilt.x, sm(draw * 3)), lerp(-0.42, hilt.y, sm(draw * 3)) + 0.45 * sm((draw - 0.3) / 0.7), lerp(0.12, hilt.z, sm(draw * 3)) + 0.2 * sm((draw - 0.3) / 0.7)];
        const rh = [lerp(rhDraw[0], 0.05, raise), lerp(rhDraw[1], 0.18, raise) + 0.25 * lift, lerp(rhDraw[2], 0.32, raise)];
        const dir = V(lerp(0.55, -0.9, raise), lerp(-0.2, 0.15, raise) + 0.8 * lift, lerp(0.6, 0.2, raise));
        F.set({ rh, head: [lerp(0.28, 0.05, sm((t - 2) / 2)) - 0.2 * lift, 0, 0], chest: [0.05, 0, 0], body: { legs: { 1: [0.1, 0.12, 0.08], '-1': [-0.08, 0.12, 0.05] } }, dir }, dt);
        cam.position.set(0.3 - 0.05 * t / 8, 1.35, 30 - 2 * sm(t / 8)); cam.lookAt(0, 1.15, -60);
      } };
  };
})();
