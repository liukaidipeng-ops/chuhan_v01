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

  // ======================= 其余镜头（cg-008 分镜表） =======================
  // 保留的老镜头（原 F1 江面大全景、F2 侧拍勒马、F3b 下马、F4 赠马、F6 汉骑压岭）：搭景时把资产换成过场版，再整场过一遍过场材质
  function upgraded(base, o = {}) {
    return () => {
      const wz = WuZhui.make, xy = XY4.make, fy = Ferry.makeFerry;
      WuZhui.make = a => WuZhui3.make(a); XY4.make = a => xy(Object.assign({}, a, { cg: true })); Ferry.makeFerry = a => fy(Object.assign({}, a, { cg: true }));
      let S; try { S = FILM[base](); } finally { WuZhui.make = wz; XY4.make = xy; Ferry.makeFerry = fy; }
      if (o.dust != null) hanDust(S.ctx, o.dust, o.dustAt);
      CG.cgify(S.ctx.S); CG.wind(S.ctx.S, { k: 0.8 });
      const find = name => { let r = null; S.ctx.S.traverse(x => { if (!r && x.name === name && x.parent && (name !== 'head' || x.parent.name === 'neck')) r = x; }); return r; };
      const t0 = o.t0 || 0, inner = S.update;
      return Object.assign(S, { dur: o.dur || S.dur,
        update(t, dt) { if (t === 0 && t0 > 0) { for (let x = 0; x < t0; x += 1 / 24) inner(x, 1 / 24); } inner(t + t0, dt); CG.tick(t + t0); if (o.cam) o.cam(S, t, find); } });
    };
  }
  FILM.W3 = upgraded('F1', { dust: 0.05, dustAt: [-30, -150] });     // 江面大全景：地平线一线淡尘
  FILM.W4 = upgraded('F2', { dust: 0.15, dustAt: [-40, -60] });      // 侧拍勒马
  FILM.W11 = upgraded('F3b', { dust: 0.5, dustAt: [-30, -60] });     // 下马
  FILM.W13 = upgraded('F6');                                          // 汉骑压岭
  FILM.W12e = upgraded('F4', { t0: 9.0, dur: 3, dust: 0.8, dustAt: [10, -45] });   // 亭长作揖、乌骓回头（原 F4 的 9–12 秒，原机位）
  // W12a 手抚鬃毛：原 F4 的 1–4 秒，镜头贴到马颈上
  FILM.W12a = upgraded('F4', { t0: 1.0, dur: 3, cam(S, t, find) {
    const nk = find('neck'); if (!nk) return; const p = nk.localToWorld(V(0.25, 0.3, 0));
    S.cam.fov = 16; S.cam.updateProjectionMatrix(); S.cam.position.copy(p).add(V(-0.6 + 0.06 * t, 0.15, 2.3)); S.cam.lookAt(p); S.post.focus = 1.2; S.post.ap = 1.2; } });
  // W12b 马眼大特写：眨一下
  FILM.W12b = upgraded('F4', { t0: 3.0, dur: 3, cam(S, t, find) {
    const hd = find('head'); if (!hd) return; const e = hd.localToWorld(V(0.15, 0.06, -0.1));   // 马朝 -x，镜头这边（+z）是它的左眼
    S.cam.fov = 18; S.cam.updateProjectionMatrix(); S.cam.position.copy(e).add(V(-0.35, 0.06, 0.85)); S.cam.lookAt(e); S.post.focus = S.cam.position.distanceTo(e); S.post.ap = 1.4; } });
  // W12d 缰绳交手：原 F4 的 11–14 秒，插入近景，焦点从项王的手移到亭长的手
  FILM.W12d = upgraded('F4', { t0: 11.0, dur: 3, cam(S, t) {
    const a = V(-1.05, 1.12, 0.0), b = V(-1.45, 1.12, -0.18), k = sm((t - 0.8) / 1.2), f = a.clone().lerp(b, k);
    S.cam.fov = 18; S.cam.updateProjectionMatrix(); S.cam.position.set(-0.95, 1.3, 1.25); S.cam.lookAt(V(-1.25, 1.1, -0.08)); S.post.focus = S.cam.position.distanceTo(f); S.post.ap = 1.3; } });

  // —— 劝渡那场（W5、W6、W9、W10）：项王骑在乌骓上，亭长站在马前左侧仰头劝 ——
  function talk(o = {}) {
    const ctx = stage({ seed: o.seed ?? 17, sun: [-0.35, 0.12, -1] });
    const rp = []; for (let i = 0; i < 50; i++) rp.push([SB.rr(-12, -4), 0, SB.rr(-16, 8)]);
    SB.reeds(ctx, rp, { per: 22, r: 1.2, h: [1.1, 2.3] });
    hanDust(ctx, o.dust ?? 0.3, [40, -70]);
    const R = horseman(ctx); R.H.group.position.set(0, gy(ctx, 0, 0), 0); R.H.group.rotation.y = PI; R.H.speed = 0; R.step(1 / 24);   // 马头朝画左（-x，江东）
    const F = Ferry.makeFerry({ scale: 1.5, cg: true }); F.group.position.set(-5.5, 0, -2.2); F.group.rotation.y = 0.4; F.lanternOn(true);
    const elder = F.man.group; ctx.add(F.group); ctx.add(elder); elder.position.set(-2.1, gy(ctx, -2.1, 1.0), 1.0);   // 亭长本身就是真人大小（船才放大 1.5 倍）
    cg(F.group); cg(elder); ctx.add(SB.shadows(F.group)); SB.shadows(elder);
    F.setPose('stand', 0.01); F.update(0.1);
    const face = () => { const h = V(0, 0, 0); R.X.J.head.getWorldPosition(h); h.y += 0.1; return h; };
    const eface = () => { const h = V(0, 0, 0); F.man.J.head.getWorldPosition(h); h.y += 0.12; return h; };
    const aimElder = () => { const e = eface(), d = face().sub(e); elder.rotation.y = Math.atan2(-d.z, d.x); };
    aimElder();
    return { ctx, R, F, elder, face, eface, aimElder };
  }
  // W5 过肩正打：从项王右肩后往下看亭长；亭长作揖，然后仰头劝
  FILM.W5 = () => {
    const T = talk({ dust: 0.25 }); const { ctx, R, F } = T;
    const cam = SB.cam([0, 0, 0], [0, 0, 0], 22), post = { focus: 3, ap: 0.8, maxR: 14, exp: 1.0, gain: [1.07, 0.98, 0.88], sat: 0.9, vign: 0.48, grain: 0.055 };
    SB.fill(ctx, [-1, 0.3, 0.6], 0xffdcb4, 0.9); ctx.shadowAt([-1, 0, 0.5], 6);
    return { ctx, cam, post, dur: 6, update(t, dt) {
      R.H.earK = 0.5; R.step(dt); R.X.pose({ headRx: 0.28, headRy: -0.35, chestRy: -0.15 });
      const want = t < 1.2 ? 'bow' : 'offer'; if (F.pose !== want) F.setPose(want, 0.8); F.look(0, 0.3); F.update(dt); T.aimElder();
      const h = T.face(), e = T.eface(), back = h.clone().sub(e).setY(0).normalize(), side = V(-back.z, 0, back.x);
      cam.position.copy(e).addScaledVector(back, 2.4).addScaledVector(side, 0.55).setY(e.y + 0.05); cam.lookAt(e.clone().add(V(0, -0.08, 0)));   // 机位放低到亭长眼平，前景是乌骓的肩和项王的腿（虚）
      post.focus = cam.position.distanceTo(e); } };
  };
  // W6 反打：亭长身后低机位往上看项王；他不说话，眼神往江东（画左）飘
  FILM.W6 = () => {
    const T = talk({ dust: 0.3 }); const { ctx, R, F } = T;
    const cam = SB.cam([0, 0, 0], [0, 0, 0], 20), post = { focus: 3, ap: 0.9, maxR: 14, exp: 1.0, gain: [1.07, 0.98, 0.88], sat: 0.9, vign: 0.48, grain: 0.055 };
    SB.fill(ctx, [-0.7, 0.1, 0.8], 0xffdcb4, 1.1);
    return { ctx, cam, post, dur: 5, update(t, dt) {
      R.H.earK = 0.6; R.step(dt);
      const k = sm((t - 1.2) / 2.2); R.X.pose({ headRx: lerp(0.22, 0.05, k), headRy: lerp(-0.3, 0.35, k), chestRy: lerp(-0.1, 0.05, k) });   // 先看着亭长，再慢慢望向江东
      F.setPose('offer', 0.01); F.look(0, 0.3); F.update(dt); T.aimElder();
      const h = T.face(), e = T.eface(), d = h.clone().sub(e).normalize(), side = V(-d.z, 0, d.x);
      cam.position.copy(e).addScaledVector(d, -0.2).addScaledVector(side, -1.0).add(V(0, -0.1, 0)); cam.lookAt(h);   // 偏到亭长身侧，项王的视线从镜头旁边擦过去
      post.focus = cam.position.distanceTo(h); } };
  };
  // W9 近景：低头，自嘲（嘴角动不了，靠低头—停—抬眼的节奏），抬眼看亭长
  FILM.W9 = () => {
    const T = talk({ dust: 0.45 }); const { ctx, R, F } = T;
    const cam = SB.cam([0, 0, 0], [0, 0, 0], 20), post = { focus: 1.5, ap: 1.0, maxR: 16, exp: 1.0, gain: [1.07, 0.98, 0.87], sat: 0.9, vign: 0.5, grain: 0.055 };
    SB.fill(ctx, [-0.6, 0.2, 0.9], 0xffdcb4, 1.2);
    return { ctx, cam, post, dur: 6, update(t, dt) {
      R.H.earK = 0.4; R.step(dt);
      const dn = sm((t - 0.3) / 1.0) * (1 - sm((t - 3.2) / 1.3));
      R.X.pose({ headRx: lerp(0.15, 0.55, dn), headRy: lerp(-0.3, -0.1, dn) - 0.08 * Math.sin(t * 6) * dn * sm((t - 1.4) / 0.4) * (1 - sm((t - 2.4) / 0.4)), chestRx: 0.05 + 0.1 * dn });   // 低头时肩头抖两下（苦笑）
      const J = R.X.J.head.userData.J; if (J && J.jaw) J.jaw.rotation.x = 0.06 * Math.max(0, Math.sin(t * 9)) * (t > 3.6 ? 1 : 0);   // 后半句开口
      F.setPose('offer', 0.01); F.update(dt); T.aimElder();
      const h = T.face(), e = T.eface(), d = e.clone().sub(h).setY(0).normalize(), side = V(-d.z, 0, d.x);
      cam.position.copy(h).addScaledVector(d, 0.7).addScaledVector(side, 1.15).add(V(0, -0.35, 0)); cam.lookAt(h.clone().add(V(0, -0.05, 0)));   // 侧前方偏低，躲开马头   // 从下面往上看，低头时也看得见脸
      post.focus = cam.position.distanceTo(h); } };
  };
  // W10 眼睛大特写：闭上，再睁开
  FILM.W10 = () => {
    const T = talk({ dust: 0.5 }); const { ctx, R, F } = T;
    const cam = SB.cam([0, 0, 0], [0, 0, 0], 9), post = { focus: 1, ap: 1.3, maxR: 18, exp: 1.0, gain: [1.08, 0.97, 0.86], sat: 0.9, vign: 0.55, grain: 0.06 };
    SB.fill(ctx, [-0.6, 0.2, 0.9], 0xffdcb4, 1.2);
    return { ctx, cam, post, dur: 3, update(t, dt) {
      R.step(dt); R.X.pose({ headRx: 0.12, headRy: -0.25 });
      const J = R.X.J.head.userData.J, c = sm((t - 0.5) / 0.35) * (1 - sm((t - 1.9) / 0.5));
      if (J) for (const l of J.lids) l.rotation.x = lerp(l.userData.open, 0.95, c);
      F.update(dt);
      const h = T.face().add(V(0, 0.005, 0)), e = T.eface(), d = e.clone().sub(h).setY(0).normalize(), side = V(-d.z, 0, d.x);
      cam.position.copy(h).addScaledVector(d, 1.0).addScaledVector(side, 0.25); cam.lookAt(h);
      post.focus = cam.position.distanceTo(h); } };
  };
  // W1 灯笼插入：火苗被地面震得一下下抖，水面细纹（镜头跟着微微颤）
  FILM.W1 = () => {
    const ctx = stage({ seed: 23, sun: [0.55, 0.1, -0.8], fogD: 0.02 });
    const F = Ferry.makeFerry({ scale: 1.5, cg: true }); F.group.position.set(-3.6, 0, 0); F.group.rotation.y = -PI / 2; F.lanternOn(true); cg(F.group); ctx.add(SB.shadows(F.group)); F.update(0.1); F.group.updateMatrixWorld(true);
    const lamp = F.boat.lamp.getWorldPosition(V(0, 0, 0));
    const cam = SB.cam(lamp.clone().add(V(2.2, -0.55, 1.4)).toArray(), lamp.clone().add(V(0, -0.35, 0)).toArray(), 20), c0 = cam.position.clone();
    const post = { focus: cam.position.distanceTo(lamp), ap: 1.2, maxR: 16, exp: 0.95, gain: [1.08, 0.97, 0.86], sat: 0.9, vign: 0.55, grain: 0.06 };
    return { ctx, cam, post, dur: 2.5, update(t, dt) {
      const beat = Math.max(0, Math.sin(t * 2 * PI * 1.8)) ** 6;   // 马蹄一下下
      F.boat.glow.intensity = 1.4 * (0.75 + 0.25 * Math.sin(t * 31) * Math.sin(t * 7.7)) * (1 - 0.35 * beat); F.update(dt);
      F.group.position.y = 0.012 * beat; F.group.updateMatrixWorld(true);
      cam.position.copy(c0).add(V(0, 0.004 * beat * Math.sin(t * 90), 0)); cam.lookAt(lamp.clone().add(V(0, -0.35, 0))); } };
  };
  // W7 插入：来路方向，尘线高了一截，旗尖在尘里一闪
  FILM.W7 = () => {
    const ctx = stage({ seed: 29, sun: [-0.25, 0.08, -1] });
    hanDust(ctx, 0.6, [0, -110]);
    const flags = []; for (let i = 0; i < 9; i++) { const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 9, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018 })); pole.position.y = 4.5; g.add(pole);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3, 8, 3), new THREE.MeshStandardMaterial({ color: 0xa8321f, side: THREE.DoubleSide, roughness: 0.9 })); f.position.set(1.1, 7.2, 0); g.add(f); g.position.set(-24 + i * 6 + SB.rr(-2, 2), -4.5, -70 + SB.rr(-5, 5)); ctx.add(g); flags.push(g); }
    const cam = SB.cam([0, 1.6, 20], [0, 3.5, -70], 7), post = { focus: 90, ap: 0.3, maxR: 8, exp: 1.0, gain: [1.06, 0.97, 0.88], sat: 0.88, vign: 0.5, grain: 0.06 };
    return { ctx, cam, post, dur: 2.5, update(t) { for (const [i, g] of flags.entries()) g.position.y = -4.5 + 2.2 * sm((t - 0.3 - i * 0.12) / 1.5); } };   // 旗子一面面从地平线后升起来
  };
})();
