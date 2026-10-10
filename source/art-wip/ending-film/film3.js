// 乌江 v2（cg-008 分镜表，SHOTLIST-v2.md）：用过场版资产重拍。要先加载 film.js（FILM 表）、horse3.js、cg-lab/cgify.js。
// 资产：乌骓 v3（WuZhui3）、项羽过场版（XY4 { cg: true }）、亭长过场版（Ferry { cg: true }），全部过 CG.cgify。
(() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, lerp = (a, b, k) => a + (b - a) * k;
  const DAWN = { top: 0x4f6784, hor: 0xeac39a, bot: 0x7d766a, sunCol: 0xffc489, sunI: 2.6, hemi: 0.9, skyL: 0x9fb2c8, gndL: 0x5b5246, fogCol: 0xdcc19c, fogD: 0.014, glow: 1.4, sunSize: 0.0009 };
  function stage(o = {}) {
    SB.reseed(o.seed ?? 6);
    const ctx = SB.stage(Object.assign({}, DAWN, { sun: o.sun || [-0.25, 0.07, -1], fogD: o.fogD ?? 0.014 }));
    SB.fill(ctx, [0.5, 0.4, 1], 0xa8b8cc, 0.5);
    SB.ground(ctx, { col: '#8a7a60', cx: 20, cz: 0, flat: 60, shore: { x: -1.5, wob: 2.5 } });
    SB.water(ctx, { x: 0, y: 0.0, size: 1200 });
    SB.ridges(ctx, { dist: 260, h: 22, col: 0x5d6068, seed: 4, layers: 3, yaw: 0.25 });
    return ctx;
  }
  const gy = (ctx, x, z) => Math.max(0, ctx.hAt(x, z));
  const cg = g => { CG.cgify(g); return g; };
  // 地平线上的汉军尘线（倒计时）：k 从 0（一线淡尘）到 1（压到近处）
  function hanDust(ctx, k, at = [60, -80]) {
    const d = lerp(1, 0.35, k);
    return SB.dust(ctx, { n: Math.round(40 + 120 * k), box: [at[0] * d - 60, at[0] * d + 60, 0, 3 + 10 * k, at[1] * d - 8, at[1] * d + 8], s: [8, 22], op: [0.04 + 0.05 * k, 0.1 + 0.08 * k], col: 0xe8c8a0 });
  }
  function horseman(ctx) {   // 项羽骑乌骓（过场版）
    const H = WuZhui3.make({ stage: 2 }), X = XY4.make({ stage: 2, cg: true });
    X.POSES.ride = { arms: { '-1': X.POSES.stand.arms['-1'], '1': [[0.1, -0.3, 0.4], [0.7, -0.2, -0.3]] }, head: [0.02, 0, 0] };
    X.mountOn(H); X.setPose('ride', 0.01); X.update(0.1);
    cg(H.group); CG.wind(X.group, { k: 0.8 }); ctx.add(SB.shadows(H.group));
    return { H, X, step(dt) { H.update(dt); X.update(dt); H.group.updateMatrixWorld(true); } };
  }

  // ---------- W2 · 亭长近景：斗笠下抬眼、回头（3.5 秒） ----------
  // 侧逆光：太阳在他背后偏右；前下方一盏暖光把脸从斗笠的阴影里托出来
  FILM.W2 = () => {
    const ctx = stage({ seed: 21, sun: [0.55, 0.14, -0.8], fogD: 0.02 });
    const rp = []; for (let i = 0; i < 40; i++) rp.push([SB.rr(-0.5, 6), 0, SB.rr(-30, -6)]);
    SB.reeds(ctx, rp, { per: 22, r: 1.3, h: [1.2, 2.5] });
    SB.dust(ctx, { n: 60, box: [-40, 30, 0, 4, -60, 20], s: [6, 16], op: [0.05, 0.12], col: 0xf1dcc0 });
    const F = Ferry.makeFerry({ scale: 1.5, cg: true }); F.group.position.set(-3.6, 0, 0); F.group.rotation.y = -PI / 2; F.setPose('stand', 0.01); F.lanternOn(true);
    cg(F.group); ctx.add(SB.shadows(F.group));
    F.update(0.1); F.group.updateMatrixWorld(true);
    const head = V(0, 0, 0); F.man.J.head.getWorldPosition(head); head.y += 0.14;
    const toward = V(1, 0, -0.55).normalize();
    const camDir = toward.clone().applyAxisAngle(V(0, 1, 0), -0.55);   // 他回头望来路（镜头右边外面），不看镜头
    const cam = SB.cam(head.clone().addScaledVector(camDir, 2.4).add(V(0, 0.04, 0)).toArray(), head.toArray(), 15);
    SB.fill(ctx, toward.clone().add(V(0, -0.35, 0)).toArray(), 0xffdcb4, 1.5);   // 前下方补光
    ctx.shadowAt(head.toArray(), 6);
    const post = { focus: 2.4, ap: 1.0, maxR: 16, exp: 1.0, gain: [1.07, 0.98, 0.88], sat: 0.9, vign: 0.5, grain: 0.055 };
    const c0 = cam.position.clone();
    return { ctx, cam, dur: 3.5, post,
      update(t, dt) {
        const k = sm((t - 0.8) / 1.4);   // 0.8 秒听见，抬眼、回头
        F.look(lerp(0.05 * Math.sin(t * 0.7), 1.9, k), lerp(-0.12, 0.08, k));
        F.update(dt); F.group.position.y = 0.02 * Math.sin(t * 1.3); F.group.updateMatrixWorld(true);
        const h = V(0, 0, 0); F.man.J.head.getWorldPosition(h); h.y += 0.14;
        cam.position.copy(c0).addScaledVector(camDir, -0.15 * sm(t / 3.5)); cam.lookAt(h.clone().add(V(0, -0.03, 0)));
        post.focus = cam.position.distanceTo(h);
      } };
  };

  // ---------- W8 · 仰拍：「天之亡我，我何渡为！」（5 秒）——收到脸，肩甲出画 ----------
  FILM.W8 = () => {
    const ctx = stage({ seed: 9, sun: [0.35, 0.22, -1] });
    SB.dust(ctx, { n: 50, box: [-60, 20, 0, 6, -80, -10], s: [8, 20], op: [0.05, 0.12], col: 0xf1dcc0 });
    const R = horseman(ctx); R.H.group.position.set(0, 0, 0); R.H.group.rotation.y = 0.35; R.H.speed = 0; R.step(1 / 24);
    const head = V(0, 0, 0); R.X.J.head.getWorldPosition(head); head.y += 0.1;
    SB.fill(ctx, [0.8, -0.2, -0.6], 0xffd8b0, 1.1);   // 从镜头这边往仰起的脸上补一点暖光
    const r0 = R.H.group.rotation.y, fwd = V(Math.cos(r0), 0, -Math.sin(r0)), side = V(-fwd.z, 0, fwd.x);
    const camOff = fwd.clone().multiplyScalar(0.5).addScaledVector(side, 0.8).add(V(0, -0.2, 0));
    const cam = SB.cam(head.clone().add(camOff).toArray(), head.toArray(), 22);
    const post = { focus: 0.9, ap: 0.9, maxR: 16, exp: 1.0, gain: [1.08, 0.97, 0.86], sat: 0.92, vign: 0.5, grain: 0.055 };
    return { ctx, cam, dur: 5, post,
      update(t, dt) {
        R.H.earK = 0.4; R.step(dt);
        const k = sm((t - 0.8) / 2.0);
        R.X.pose({ headRx: lerp(0.06, -0.38, k), headRy: lerp(-0.1, 0.05, k), chestRx: lerp(0.02, -0.07, k) });
        const h = V(0, 0, 0); R.X.J.head.getWorldPosition(h); h.y += 0.1;
        const push = 0.12 * sm(t / 5);   // 慢推
        cam.position.copy(head).add(camOff.clone().multiplyScalar(1 - push)); cam.lookAt(h);
        post.focus = cam.position.distanceTo(h);
      } };
  };

  // ---------- W12c · 赠马：项王正脸（4 秒）——全片脸最亮的一次 ----------
  // 他面朝画左的亭长说话；镜头在亭长身边偏一点，近景；画右虚焦里是乌骓的头，背后远处的尘已经近了
  FILM.W12c = () => {
    const ctx = stage({ seed: 13, sun: [-0.45, 0.16, 0.85] });
    hanDust(ctx, 0.7, [30, -60]);
    const H = WuZhui3.make({ stage: 2 }); H.group.position.set(-1.0, gy(ctx, -1.0, -2.3), -2.3); H.group.rotation.y = 0.2; cg(H.group); ctx.add(SB.shadows(H.group));
    const X = XY4.make({ stage: 2, cg: true }); X.J.ji.visible = false; X.group.position.set(-0.55, 0, 0.3); X.group.rotation.y = PI / 2 + 0.55;
    cg(X.group); CG.wind(X.group, { k: 0.7 }); ctx.add(SB.shadows(X.group)); X.update(0.1); X.group.updateMatrixWorld(true);
    const head = V(0, 0, 0); X.J.head.getWorldPosition(head); head.y += 0.1;
    const facing = V(Math.sin(X.group.rotation.y), 0, Math.cos(X.group.rotation.y));
    const camP = head.clone().addScaledVector(facing.clone().applyAxisAngle(V(0, 1, 0), 0.5), 1.4).add(V(0, -0.05, 0));   // 偏开他的视线约 30°
    const cam = SB.cam(camP.toArray(), head.toArray(), 24);
    SB.fill(ctx, facing.clone().add(V(0.2, 0.25, 0.1)).toArray(), 0xffe0bc, 1.4);   // 脸上的主光：从亭长那边来
    ctx.shadowAt(head.toArray(), 6);
    const post = { focus: 1.35, ap: 1.0, maxR: 16, exp: 1.02, gain: [1.07, 0.98, 0.87], sat: 0.9, vign: 0.45, grain: 0.05 };
    return { ctx, cam, dur: 4, post,
      update(t, dt) {
        H.headK = -0.4; H.lookY = -0.3; H.earK = 0.7; H.update(dt); H.group.updateMatrixWorld(true);
        X.pose({ headRx: 0.06 - 0.03 * Math.sin(t * 0.8), chestRx: 0.03 });
        X.update(dt); X.group.updateMatrixWorld(true); CG.tick(t + 3);
        const h = V(0, 0, 0); X.J.head.getWorldPosition(h); h.y += 0.1;
        cam.position.copy(camP).add(V(0, 0, -0.05 * sm(t / 4))); cam.lookAt(h);
        post.focus = cam.position.distanceTo(h);
      } };
  };
})();
