// 终局样片 · 乌江：逐帧动画镜头。每个镜头 FILM[id](o) → { ctx, cam, post, dur, update(t, dt) }，t 从 0 到 dur（秒）
// 用 sb2.js（分镜台，胶片颗粒按帧变化）搭景，WuZhui（乌骓）、XY4（项羽，能骑马）、Ferry（亭长和渡船）
window.FILM = {};
(() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, cl = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a))), lerp = (a, b, k) => a + (b - a) * k;
  const DAWN = { top: 0x4f6784, hor: 0xeac39a, bot: 0x7d766a, sun: [0.15, 0.16, -1], sunCol: 0xffc489, sunI: 2.6, hemi: 0.9, skyL: 0x9fb2c8, gndL: 0x5b5246, fogCol: 0xdcc19c, fogD: 0.012, glow: 1.4, sunSize: 0.0009 };
  // 骑在乌骓上的项羽：左手挽缰（缰绳一根管子，每帧从马嘴拉到手里），右手竖戟
  function rider(ctx, stage = 2) {
    const H = WuZhui.make({ stage }), X = XY4.make({ stage });
    X.POSES.ride = { arms: { '-1': X.POSES.stand.arms['-1'], '1': [[0.1, -0.3, 0.4], [0.7, -0.2, -0.3]] }, head: [0.02, 0, 0] };
    X.mountOn(H); X.setPose('ride', 0.01); X.update(0.1);
    ctx.add(SB.shadows(H.group));
    const reinMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.8 }); let rein = null;
    const bit = [1, -1].map(s => H.headAt(0.5 + s * 0.3, 0.86).p.clone());
    function reins() {
      const hand = V(0, 0, 0); X.J.hand1.getWorldPosition(hand);
      const pts = [];
      for (const b of bit) { const w = b.clone(); H.head.localToWorld(w); pts.push(w); }
      const mid = pts[0].clone().lerp(pts[1], 0.5), sag = mid.clone().lerp(hand, 0.5); sag.y -= 0.12;
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([pts[0], sag.clone().add(V(0, 0, 0.03)), hand, sag.clone().add(V(0, 0, -0.03)), pts[1]]), 40, 0.009, 5);
      if (rein) { rein.geometry.dispose(); rein.geometry = geo; } else { rein = ctx.add(new THREE.Mesh(geo, reinMat)); rein.castShadow = true; }
    }
    return { H, X, reins, step(dt) { H.update(dt); X.update(dt); H.group.updateMatrixWorld(true); reins(); } };
  }
  function riverStage(o = {}) {
    SB.reseed(o.seed ?? 6);
    const ctx = SB.stage(Object.assign({}, DAWN, { sun: o.sun || [-0.25, 0.07, -1], fogD: o.fogD ?? 0.016 }));
    SB.fill(ctx, [0.5, 0.4, 1], 0xa8b8cc, 0.5);
    SB.ground(ctx, { col: '#8a7a60', cx: 20, cz: 0, flat: 60, shore: { x: -1.5, wob: 2.5 } });
    SB.water(ctx, { x: 0, y: 0.0, size: 1200 });
    SB.ridges(ctx, { dist: 260, h: 22, col: 0x5d6068, seed: 4, layers: 3, yaw: 0.25 });
    return ctx;
  }
  const gy = (ctx, x, z) => Math.max(0, ctx.hAt(x, z));
  // ---------- F0 · 亭长特写：船上的老人听见身后马蹄声，回头（4.5 秒；审批台 079 加的开头） ----------
  FILM.F0 = () => {
    const ctx = riverStage({ seed: 21, sun: [0.55, 0.14, -0.8], fogD: 0.02 });
    const rp = []; for (let i = 0; i < 40; i++) rp.push([SB.rr(-0.5, 6), 0, SB.rr(-30, -6)]);   // 背后岸上的芦苇（虚焦）
    SB.reeds(ctx, rp, { per: 22, r: 1.3, h: [1.2, 2.5] });
    SB.dust(ctx, { n: 60, box: [-40, 30, 0, 4, -60, 20], s: [6, 16], op: [0.05, 0.12], col: 0xf1dcc0 });
    const F = Ferry.makeFerry({ scale: 1.5 }); F.group.position.set(-3.6, 0, 0); F.group.rotation.y = -PI / 2; ctx.add(SB.shadows(F.group)); F.setPose('stand', 0.01); F.lanternOn(true);
    F.update(0.1); F.group.updateMatrixWorld(true);
    const head = V(0, 0, 0); F.man.J.head.getWorldPosition(head); head.y += 0.06;
    const toward = V(1, 0, -0.55).normalize();   // 马蹄声从他身后岸上来（他面朝下游 +z）；镜头在那个方向，他一回头脸就转过来
    const cam = SB.cam(head.clone().addScaledVector(toward, 0.95).add(V(0, -0.1, 0)).toArray(), head.toArray(), 28);
    SB.fill(ctx, toward.clone().add(V(0, -0.15, 0)).toArray(), 0xffe2c0, 1.1);   // 斗笠底下压着阴影，从镜头这边往脸上补一盏
    ctx.shadowAt(head.toArray(), 6);
    const post = { focus: 0.95, ap: 1.0, maxR: 16, exp: 1.0, gain: [1.07, 0.98, 0.88], sat: 0.9, vign: 0.5, grain: 0.055 };
    const c0 = cam.position.clone();
    return { ctx, cam, dur: 4.5, post,
      update(t, dt) {
        // 先望着江面出神；1.3 秒听见马蹄，愣一下；1.6 秒起慢慢回头，越过左肩望向来路，眯眼、头微微抬起
        const k = sm((t - 1.6) / 1.3);
        F.look(lerp(0.05 * Math.sin(t * 0.7), 2.0, k), lerp(-0.05, 0.06, k) + (t > 1.3 && t < 1.6 ? 0.03 : 0));
        F.update(dt); F.group.position.y = 0.02 * Math.sin(t * 1.3); F.group.rotation.z = 0.01 * Math.sin(t * 0.9);
        F.group.updateMatrixWorld(true);
        const h = V(0, 0, 0); F.man.J.head.getWorldPosition(h); h.y += 0.06;
        cam.position.copy(c0).addScaledVector(toward, -0.12 * sm(t / 4.5)); cam.lookAt(h);
        post.focus = cam.position.distanceTo(h);
      } };
  };
  // ---------- F1 · 乌江黎明大全景：项王一行沿岸奔来（7 秒） ----------
  FILM.F1 = () => {
    const ctx = riverStage();
    const BOAT = V(-2.7, 0, 10), CAM = V(3.5, 3.2, 22);
    const rp = []; for (let i = 0; i < 70; i++) rp.push([-2 + SB.rr(-2.5, 1.5), 0, 20 - i * 2.4 + SB.rr(-1, 1)]);
    for (let i = 0; i < 30; i++) rp.push([SB.rr(-9, -4), 0, SB.rr(-30, 18)]);
    // 芦苇别挡人（079）：镜头到船、船四周三米以内的都拔掉
    const seg = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
    SB.reeds(ctx, rp.filter(q => { const P = V(q[0], 1.5, q[2]); return seg(P, CAM, BOAT.clone().setY(1.5)) > 2.6 && P.distanceTo(BOAT.clone().setY(1.5)) > 3.4; }), { per: 26, r: 1.4, h: [1.2, 2.6] });
    const F = Ferry.makeFerry({ scale: 1.5 }); F.group.position.copy(BOAT); F.group.rotation.y = -1.35; ctx.add(SB.shadows(F.group)); F.setPose('pole', 0.01); F.lanternOn(true);
    SB.glow(ctx, [BOAT.x, 2.6, BOAT.z], 0xffb060, 1.2, 0.8);
    const R = rider(ctx, 2);
    const pack = [];
    for (let i = 0; i < 24; i++) { const c = Models.makeCavalry('b', true, i % 3 ? 'dao' : 'ji'); c.group.rotation.y = -PI / 2 + SB.rr(-0.05, 0.05); ctx.add(SB.shadows(c.group)); c.speed = 1; pack.push({ c, dx: 1.5 + SB.rr(0, 4.5), dz: -2 - i * 1.15 + SB.rr(-0.6, 0.6), ph: SB.rr(0, 1) }); }
    const dustG = SB.dust(ctx, { n: 110, box: [-1, 7, 0, 2.6, -26, 0], s: [2.5, 6], op: [0.08, 0.2], col: 0xe9c79c });
    SB.dust(ctx, { n: 90, box: [-120, -6, 0, 3, -120, 20], s: [10, 26], op: [0.06, 0.14], col: 0xf1dcc0 });
    SB.rays(ctx, { n: 7, c: [-40, 45, -160], len: 120, w: [6, 16], op: [0.05, 0.11], col: 0xffd2a0, spread: 30, tilt: -0.3 });
    ctx.shadowAt([2, 0, -12], 34);
    const cam = SB.cam([3.5, 3.2, 22], [-2, 1.4, -14], 34);
    const c0 = cam.position.clone(), L0 = V(-2, 1.4, -14);
    const lead = z => V(3.2, 0, z);
    return { ctx, cam, dur: 7, post: { focus: 26, ap: 0.22, maxR: 9, exp: 1.0, gain: [1.04, 0.98, 0.9], sat: 0.9, vign: 0.42, grain: 0.05 },
      update(t, dt) {
        const z = -46 + t * 6.2;   // 奔驰约 6 米/秒
        R.H.speed = 2; const p = lead(z); R.H.group.position.set(p.x, gy(ctx, p.x, p.z), p.z); R.H.group.rotation.y = -PI / 2; R.step(dt);
        for (const k of pack) { const x = 3.2 + k.dx, zz = z + k.dz; k.c.group.position.set(x, gy(ctx, x, zz), zz); k.c.update(dt); }
        dustG.position.set(1.5, 0, z);
        { const e = F.man.group.getWorldPosition(V(0, 0, 0)), d = R.H.group.position.clone().sub(e), fw = V(1, 0, 0).applyQuaternion(F.man.group.getWorldQuaternion(new THREE.Quaternion()));
          const ang = Math.atan2(fw.clone().cross(d).y, fw.dot(d)); F.look(Math.max(-1.9, Math.min(1.9, ang)) * sm((t - 1.5) / 1.5), 0.05); F.update(dt); }
        cam.position.copy(c0).add(V(-0.4 * t / 7, -0.15 * t / 7, -2.2 * sm(t / 7))); cam.lookAt(L0.clone().add(V(0, 0, 4 * t / 7)));
      } };
  };
  // ---------- F2 · 侧面长焦跟拍：项王勒马，由快步到慢走、停下（5 秒） ----------
  FILM.F2 = () => {
    const ctx = riverStage({ seed: 12, sun: [-0.6, 0.12, -0.8] });
    const BZ = 4.5;
    const rp = []; for (let i = 0; i < 60; i++) rp.push([SB.rr(-4, -0.5), 0, SB.rr(-40, 30)]);
    SB.reeds(ctx, rp.filter(q => Math.abs(q[2] - BZ) > 5.5), { per: 24, r: 1.3, h: [1.2, 2.4] });   // 船前面那一段不种，背景里看得见亭长（079）
    const F = Ferry.makeFerry({ scale: 1.5 }); F.group.position.set(-6.2, 0, BZ); F.group.rotation.y = PI / 2 + 0.15; ctx.add(SB.shadows(F.group)); F.setPose('pole', 0.01); F.lanternOn(true);
    const fg = []; for (let i = 0; i < 16; i++) fg.push([SB.rr(9.6, 10.6), 0, SB.rr(-12, 12)]);   // 前景芦苇（虚焦）：只占画面最底下一条，梢头低过马蹄，不挡人马（079）
    SB.reeds(ctx, fg, { per: 18, r: 0.6, h: [0.9, 1.1], col: 0x5a5236 });
    SB.dust(ctx, { n: 70, box: [-80, -4, 0, 3, -80, 40], s: [10, 24], op: [0.06, 0.14], col: 0xf1dcc0 });
    const R = rider(ctx, 2);
    const cam = SB.cam([13, 1.55, 0], [0, 1.6, 0], 22);
    let z = -9, v = 4.2;
    return { ctx, cam, dur: 5, post: { focus: 12.6, ap: 0.55, maxR: 12, exp: 1.02, gain: [1.06, 0.98, 0.88], sat: 0.9, vign: 0.45, grain: 0.05 },
      update(t, dt) {
        const sp = t < 1.6 ? 1.1 : t < 3.6 ? lerp(1.1, 0.25, sm((t - 1.6) / 2)) : lerp(0.25, 0, sm((t - 3.6) / 0.9));
        R.H.speed = sp; v = sp * 3.6; z += v * dt;
        R.H.headK = t > 3.4 ? 0.45 * sm((t - 3.4) / 0.8) : 0; R.H.earK = 0.8;
        R.H.group.position.set(1.2, gy(ctx, 1.2, z), z); R.H.group.rotation.y = -PI / 2; R.step(dt);
        // 亭长：撑着篙，望见项王就停手，扭头一直看着他
        if (t > 2.6 && F.pose === 'pole') F.setPose('stand', 0.8);
        { const e = F.man.group.getWorldPosition(V(0, 0, 0)), d = R.H.group.position.clone().sub(e), fw = V(1, 0, 0).applyQuaternion(F.man.group.getWorldQuaternion(new THREE.Quaternion()));
          F.look(Math.max(-1.9, Math.min(1.9, Math.atan2(fw.clone().cross(d).y, fw.dot(d)))), 0.04); }
        F.update(dt); F.group.position.y = 0.02 * Math.sin(t * 1.2);
        // 停下以后项王慢慢回头，望向西边来路
        R.X.pose({ chestRy: -0.35 * sm((t - 3.9) / 1.1), headRy: -0.6 * sm((t - 3.9) / 1.1) });
        const tz = z + 0.4; cam.position.set(13, 1.55, lerp(cam.position.z, tz, t === 0 ? 1 : Math.min(1, dt * 3))); cam.lookAt(0, 1.6, cam.position.z);
      } };
  };

  // ---------- F3 · 仰拍侧脸：项王仰头望天（「天之亡我，我何渡为！」，5.5 秒） ----------
  FILM.F3 = () => {
    const ctx = riverStage({ seed: 9, sun: [0.35, 0.22, -1] });
    SB.dust(ctx, { n: 50, box: [-60, 20, 0, 6, -80, -10], s: [8, 20], op: [0.05, 0.12], col: 0xf1dcc0 });
    const R = rider(ctx, 2); R.H.group.position.set(0, 0, 0); R.H.group.rotation.y = 0.35; R.H.speed = 0; R.step(1 / 24);
    const head = V(0, 0, 0); R.X.J.head.getWorldPosition(head);
    const cam = SB.cam([head.x + 1.1, head.y - 0.55, head.z - 1.0], [head.x, head.y + 0.15, head.z], 30);
    const fd = cam.position.distanceTo(head);
    const post = { focus: fd, ap: 0.9, maxR: 16, exp: 1.0, gain: [1.08, 0.97, 0.86], sat: 0.92, vign: 0.5, grain: 0.055 };
    return { ctx, cam, dur: 5.5, post,
      update(t, dt) {
        R.H.earK = 0.4; R.H.snortK = t > 4.2 && t < 4.7 ? 1 : 0; R.step(dt);
        const k = sm((t - 1.0) / 2.2);
        R.X.pose({ headRx: lerp(0.08, -0.42, k), headRy: lerp(-0.15, 0.1, k), chestRx: lerp(0.02, -0.08, k) });
        cam.position.set(head.x + 1.1 - 0.12 * t / 5.5, head.y - 0.55 + 0.05 * t / 5.5, head.z - 1.0 + 0.15 * t / 5.5); cam.lookAt(head.x, head.y + 0.12, head.z);
        post.focus = cam.position.distanceTo(head);
      } };
  };
  // ---------- F3b · 下马（审批台 094 选乙）：项王俯身、右腿从马背上跨过来，扶鞍滑下，落地站定，回身看乌骓（3.6 秒） ----------
  FILM.F3b = () => {
    const ctx = riverStage({ seed: 10, sun: [0.55, 0.2, -0.8] });   // 光从镜头这边打过去，看得清跨腿、滑下
    const rp = []; for (let i = 0; i < 40; i++) rp.push([SB.rr(-10, -4), 0, SB.rr(-16, 4)]);
    SB.reeds(ctx, rp, { per: 22, r: 1.2, h: [1.1, 2.3] });
    SB.dust(ctx, { n: 50, box: [-60, 20, 0, 3, -60, -6], s: [8, 20], op: [0.05, 0.12], col: 0xf1dcc0 });
    const R = rider(ctx, 2); R.H.group.position.set(0, gy(ctx, 0, 0), 0); R.H.group.rotation.y = 0; R.H.speed = 0; R.step(1 / 24);
    const X = R.X; X.group.updateMatrixWorld(true);
    // 从马背上摘下来，之后在世界里摆：起点是鞍上，终点在马的左侧（-z）、马肩旁边
    const P0 = X.group.getWorldPosition(V(0, 0, 0)), Q0 = X.group.getWorldQuaternion(new THREE.Quaternion());
    let root = X.group; while (root.parent) root = root.parent; root.attach(X.group);
    const yaw0 = new THREE.Euler().setFromQuaternion(Q0, 'YXZ').y;
    const G = V(0.35, gy(ctx, 0.35, -0.78), -0.78);
    const cam = SB.cam([2.4, 1.25, -5.6], [0.25, 1.35, -0.4], 30);
    const post = { focus: 5.6, ap: 0.6, maxR: 13, exp: 1.0, gain: [1.07, 0.98, 0.87], sat: 0.9, vign: 0.46, grain: 0.05 };
    return { ctx, cam, dur: 3.6, post,
      update(t, dt) {
        R.H.earK = 0.5; R.H.headK = t > 2.4 ? -0.15 * sm((t - 2.4) / 0.8) : 0; R.H.lookY = t > 2.2 ? -0.3 * sm((t - 2.2) / 1) : 0; R.H.snortK = t > 2.9 && t < 3.3 ? 1 : 0;
        R.H.update(dt); R.H.group.updateMatrixWorld(true);
        const lean = sm(t / 0.5) * (1 - sm((t - 1.1) / 0.4));                 // 0–0.5 俯身
        const sw = sm((t - 0.45) / 0.8);                                       // 0.45–1.25 右腿跨过马背、身子转到左边
        const dn = sm((t - 1.2) / 0.75);                                       // 1.2–1.95 扶鞍滑下
        const land = Math.max(0, Math.sin(Math.max(0, Math.min(1, (t - 1.9) / 0.45)) * PI));   // 1.9–2.35 落地屈膝
        const turn = sm((t - 2.35) / 0.9);                                     // 2.35 以后回身看马
        // 位置：先往左上挪一点（跨腿时身子离鞍），再往下滑到地上
        const side = lerp(0, 0.45, sw) + lerp(0, 0.33, dn), up = 0.12 * sw * (1 - dn);
        const p = V(lerp(P0.x, G.x, dn), lerp(P0.y + up, G.y, dn * dn), P0.z - side);
        X.group.position.copy(p);
        X.group.rotation.set(0, yaw0 + lerp(0, -0.55, sw) * (1 - dn) + lerp(0, -0.25, dn) + lerp(0, -1.2, turn), 0);   // 落地以后转身面向乌骓（背对镜头半侧）
        // 腿：右腿抬起跨过去，滑下时两腿伸直，落地一蹲
        const ride = [0.85, 0.55, 0.9];
        const R1 = [lerp(lerp(ride[0], 1.35, sw), 0.05, dn) + land * 0.35, lerp(lerp(ride[1], -0.25, sw), 0.05, dn), lerp(lerp(ride[2], 0.35, sw), 0.1, dn) + land * 0.7];
        const L1 = [lerp(ride[0], 0.05, sm((t - 0.9) / 0.9)) + land * 0.35, lerp(ride[1], 0.06, sm((t - 0.9) / 0.9)), lerp(ride[2], 0.1, sm((t - 0.9) / 0.9)) + land * 0.7];
        X.pose({ hipsRx: 0.05 + 0.35 * lean + 0.15 * land, hipsY: -0.12 * land, chestRx: 0.2 * lean - 0.02, chestRy: 0.15 * turn, headRx: 0.1 * lean + 0.12 * turn, headRy: lerp(0, -0.25, turn), legs: { 1: R1, '-1': L1 } });
        X.update(dt); X.group.updateMatrixWorld(true); R.reins();
        post.focus = cam.position.distanceTo(p.clone().add(V(0, 1.4, 0)));
      } };
  };
  // ---------- F4 · 赠马：抚马，把缰绳递给亭长（「吾知公长者……以赐公。」，16 秒） ----------
  // 双人中景：乌骓侧身朝左，项王站在马头前（侧脸朝右）抚它；亭长从画左走近，双手接缰
  FILM.F4 = () => {
    const ctx = riverStage({ seed: 13, sun: [-0.45, 0.16, 0.85] });
    const rp = []; for (let i = 0; i < 46; i++) rp.push([SB.rr(-9, -3.5), 0, SB.rr(-14, -2)]);
    SB.reeds(ctx, rp, { per: 22, r: 1.2, h: [1.1, 2.3] });
    SB.dust(ctx, { n: 60, box: [-60, 10, 0, 3, -60, -6], s: [8, 20], op: [0.05, 0.12], col: 0xf1dcc0 });
    const F = Ferry.makeFerry({ scale: 1.5 }); F.group.position.set(-6.4, 0, -1.6); F.group.rotation.y = 0.15; ctx.add(SB.shadows(F.group));
    // 背景里剩下的楚骑（079）：二十来骑勒马立在后面，马在原地踏、甩头
    const guards = [];
    for (let i = 0; i < 18; i++) { const c = Models.makeCavalry('b', true, i % 3 ? 'dao' : 'ji'), x = -3 + (i % 6) * 2.2 + SB.rr(-0.5, 0.5), z = -11 - Math.floor(i / 6) * 2.4 + SB.rr(-0.6, 0.6);
      c.group.position.set(x, gy(ctx, x, z), z); c.group.rotation.y = PI / 2 + SB.rr(-0.25, 0.25) + 0.3; ctx.add(SB.shadows(c.group)); c.speed = 0; guards.push(c); }
    const elder = F.man.group; ctx.add(elder);
    Ferry.POSES.take = Object.assign({}, Ferry.POSES.offer, { shL: [0, -0.15, 1.4], elL: [0, 0, 0.2] });
    const H = WuZhui.make({ stage: 2 }); H.group.position.set(1.5, gy(ctx, 1.5, 0), 0); H.group.rotation.y = PI; ctx.add(SB.shadows(H.group));
    const X = XY4.make({ stage: 2 }); ctx.add(SB.shadows(X.group)); X.J.ji.visible = false;
    X.group.position.set(-0.55, 0, 0.3); X.group.rotation.y = PI / 2;
    X.POSES.dyn = { arms: { '-1': X.POSES.stand.arms['-1'], '1': X.POSES.stand.arms['1'] }, head: [0, 0, 0], chest: [0, 0, 0] };
    X.update(0.1); const swordRest = X.J.sword.position.clone();
    const reinMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.8 }); let rein = null;
    const bit = [1, -1].map(s => H.headAt(0.5 + s * 0.3, 0.86).p.clone());
    const elderPos = t => V(lerp(-3.3, -1.8, sm((t - 5.5) / 3.5)), 0, lerp(-0.9, -0.35, sm((t - 5.5) / 3.5)));
    const cam = SB.cam([-0.6, 1.5, 6.2], [-0.5, 1.35, 0.3], 28);
    const post = { focus: 5.9, ap: 0.6, maxR: 13, exp: 1.0, gain: [1.07, 0.98, 0.87], sat: 0.9, vign: 0.48, grain: 0.05 };
    const chestL = p => X.J.chest.worldToLocal(p.clone());
    return { ctx, cam, dur: 16, post,
      update(t, dt) {
        // 马：低下头凑过来，蹭他，喷鼻；缰绳交出去以后抬头望着他
        H.headK = lerp(-0.1, -0.55, sm(t / 2.5)) * (t < 12.5 ? 1 : lerp(1, 0.2, sm((t - 12.5) / 1.8)));
        H.lookY = lerp(0, -0.35, sm((t - 1) / 2)) * (t < 12.5 ? 1 : 0.4) + 0.12 * Math.sin(t * 1.3) * (t > 2 && t < 6 ? 1 : 0);
        H.snortK = (t > 3.6 && t < 4.1) || (t > 14.3 && t < 14.8) ? 1 : 0; H.earK = 0.7; H.tailK = t > 7 && t < 8.5 ? 1 : 0;
        H.update(dt); H.group.updateMatrixWorld(true);
        // 项王：0–6 秒低头抚马；6–8 秒转向亭长；8–12.5 秒右手把缰绳递过去；之后手放下，回望乌骓
        const ep = elderPos(t), d = ep.clone().sub(X.group.position), faceE = Math.atan2(d.x, d.z);
        const turn = sm((t - 6) / 1.8), back = sm((t - 13.3) / 1.6);
        X.group.rotation.y = lerp(lerp(PI / 2, faceE, turn), PI / 2 + 0.2, back);
        const hRx = t < 6 ? 0.25 : lerp(0.25, 0.04, turn) + 0.18 * back;
        X.pose({ headRx: hRx, chestRx: t < 6 ? 0.08 : 0.02 });
        X.group.updateMatrixWorld(true);
        // 右手：抚马额和鬃（来回两下）→ 拿缰递出 → 放下
        const u = 0.55 + 0.3 * (0.5 - 0.5 * Math.cos(Math.min(t, 6.5) * PI * 2 / 3.2)), mn = H.neckAt(0.5, u).p.clone(); H.neck.localToWorld(mn); mn.y += 0.04;
        const rhRest = V(...X.POSES.stand.arms['-1'][0]), sk = t < 5.8 ? sm((t - 0.3) / 0.9) : 1 - sm((t - 5.8) / 0.7);
        const giveW = ep.clone().lerp(X.group.position, 0.45).add(V(0, 1.12, 0)), gk = sm((t - 8) / 1.4) * (1 - sm((t - 12.4) / 1.1));
        const rh = rhRest.clone().lerp(chestL(mn), sk).lerp(chestL(giveW), gk);
        X.POSES.dyn.arms['-1'] = [rh.toArray(), [-0.8, -0.3, -0.2]];
        X.POSES.dyn.head = [hRx, 0, 0]; X.POSES.dyn.chest = [t < 6 ? 0.08 : 0.02, 0, 0];
        X.setPose('dyn', 0.001); X.update(dt); X.J.sword.position.copy(swordRest);
        // 亭长：从船边走过来，作揖，双手接缰
        { const pe = elder.position.clone(); elder.position.copy(ep); const moved = t > 0 ? pe.distanceTo(ep) : 0; F.walk(moved, moved > 0.0005); }
        { const de = X.group.position.clone().sub(ep); elder.rotation.y = Math.atan2(-de.z, de.x); }
        F.look(0, t < 9.2 ? 0.12 : 0);   // 走近时抬头看着项王
        for (const c of guards) c.update(dt);
        const want = t < 9.2 ? 'stand' : t < 10.8 ? 'bow' : 'take'; if (F.pose !== want) F.setPose(want, want === 'bow' ? 0.7 : 0.8); F.update(dt);
        elder.updateMatrixWorld(true);
        // 缰绳：先垂在马颈下；7.5 秒起在项王右手里；12 秒交到亭长手上
        const hx = V(0, 0, 0); X.J['hand-1'].getWorldPosition(hx);
        const hl = V(0, 0, 0), hr = V(0, 0, 0); F.man.J.handL.getWorldPosition(hl); F.man.J.handR.getWorldPosition(hr);
        const he = hl.clone().lerp(hr, 0.5), hk = sm((t - 11.9) / 0.6);
        const ends = bit.map(b => { const w = b.clone(); H.head.localToWorld(w); return w; }), mid = ends[0].clone().lerp(ends[1], 0.5);
        const held = t > 7.4, tip = held ? hx.clone().lerp(he, hk) : mid.clone().add(V(0.06, -0.38, 0));
        const sag = mid.clone().lerp(tip, 0.5); sag.y -= held ? 0.16 : 0.06;
        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([ends[0], sag.clone().add(V(0, 0, 0.03)), tip, sag.clone().add(V(0, 0, -0.03)), ends[1]]), 40, 0.009, 5);
        if (rein) { rein.geometry.dispose(); rein.geometry = geo; } else { rein = ctx.add(new THREE.Mesh(geo, reinMat)); rein.castShadow = true; }
        // 镜头：慢推；焦点先在项王和马头，交缰时拉到缰绳上，最后回到马的眼睛
        const k = sm(t / 16); cam.position.set(lerp(-0.6, -0.95, k), lerp(1.5, 1.45, k), lerp(6.2, 4.9, k)); cam.lookAt(lerp(-0.5, -0.9, sm((t - 6) / 4)), 1.32, lerp(0.3, 0.6, k));
        const hp = V(0, 0, 0); H.head.getWorldPosition(hp);
        const fp = t < 7.5 ? hx : t < 13 ? tip : hp; post.focus = lerp(post.focus, cam.position.distanceTo(fp), t === 0 ? 1 : Math.min(1, dt * 4));
      } };
  };
  // ---------- F6 · 汉骑逼近：山脊上一排排骑兵冒出来，逆光扬尘，地面在震（5 秒） ----------
  FILM.F6 = () => {
    SB.reseed(14);
    const ctx = SB.stage(Object.assign({}, DAWN, { sun: [0.08, 0.1, -1], sunI: 2.8, hemi: 0.85, fogD: 0.008 }));
    SB.fill(ctx, [0.2, 0.6, 1], 0xd8c0a0, 1.1);
    SB.ground(ctx, { col: '#8a7a60', flat: 6, hills: 0, ridge: { z: -48, h: 9, w: 26 } });
    SB.ridges(ctx, { dist: 300, h: 30, col: 0x6d6a6a, seed: 6, layers: 2 });
    const pts = [];
    for (let row = 0; row < 20; row++) for (let i = 0; i < 52; i++) { const x = -70 + i * 2.7 + SB.rr(-0.9, 0.9) + (row % 2) * 1.35, z = -88 + row * 2.1 + SB.rr(-0.8, 0.8); pts.push({ x, z, yaw: -PI / 2 + SB.rr(-0.1, 0.1), ph: SB.rr(0, 6) }); }   // 马头朝镜头（朝前冲的方向）；原来朝后，跑起来是倒着走
    // 前八排换成对局里的高精度骑兵，按奔跑的八个相位烘成八份合并网格，每帧按各自的步子换着用（审批台 094 选乙）；后面远处照旧用简模
    const NPH = 8, bake = (() => { const c = Models.makeCavalry('r', true, 'dao'); c.speed = 1; const out = [];
      for (let k = 0; k < NPH; k++) { c.t = (2 * PI * k / NPH) / 7.5; c.update(0); c.group.updateMatrixWorld(true); const inv = c.group.matrixWorld.clone().invert(), pos = [], nor = [], col = [];
        c.group.traverse(m => { if (!m.isMesh || !m.visible || !(m.layers.mask & 1)) return; const mat = Array.isArray(m.material) ? m.material[0] : m.material; if (!mat || mat.side === THREE.BackSide) return;
          // 合并过的单元是蒙皮网格：顶点按骨头算到当下的姿势（CPU 上算一遍），法线按三角形重算
          const g0 = m.geometry, P = g0.attributes.position, C = g0.attributes.color, mc = mat.color || new THREE.Color(1, 1, 1), Mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
          if (m.isSkinnedMesh) m.skeleton.update();
          const bt = m.isSkinnedMesh ? (m.applyBoneTransform || m.boneTransform) : null, ix = g0.index ? g0.index.array : null, n = ix ? ix.length : P.count, v = V(0, 0, 0), tri = [];
          for (let k = 0; k < n; k++) { const i = ix ? ix[k] : k; v.fromBufferAttribute(P, i); if (bt) bt.call(m, i, v); v.applyMatrix4(Mw); tri.push(v.clone());
            pos.push(v.x, v.y, v.z); if (C) col.push(C.getX(i) * mc.r, C.getY(i) * mc.g, C.getZ(i) * mc.b); else col.push(mc.r, mc.g, mc.b);
            if (tri.length === 3) { const nn = tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0])).normalize(); for (let j = 0; j < 3; j++) nor.push(nn.x, nn.y, nn.z); tri.length = 0; } } });
        const G2 = new THREE.BufferGeometry(); G2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G2.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); G2.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); out.push(G2); }
      return out; })();
    const front = pts.filter(p => p.z > -88 + 11.5 * 2.1), back = pts.filter(p => p.z <= -88 + 11.5 * 2.1);
    const hd = bake.map(g => { const m = new THREE.InstancedMesh(g, Models.vcMat, front.length); m.castShadow = true; m.frustumCulled = false; m.count = 0; ctx.add(m); return m; });
    const geo = Models.cavalryStaticGeo('r'), inst = new THREE.InstancedMesh(geo, Models.vcMat, back.length); inst.castShadow = true; inst.frustumCulled = false; ctx.add(inst);
    const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = V(0, 1, 0);
    const flags = []; for (let i = 0; i < 22; i++) { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 7.5, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018 })); pole.position.y = 3.75; g.add(pole);
      const fg = new THREE.PlaneGeometry(1.8, 2.6, 12, 4); const f = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0xa8321f, side: THREE.DoubleSide, roughness: 0.9 })); f.position.set(0.9, 7.5 - 1.4, 0); g.add(f); g.rotation.y = -PI / 2 + 0.3; ctx.add(SB.shadows(g)); flags.push({ g, f, base: fg.attributes.position.array.slice(), x: -60 + i * 5.6 + SB.rr(-2, 2), z: -64 + SB.rr(0, 8), ph: SB.rr(0, 6) }); }
    const dA = SB.dust(ctx, { n: 300, box: [-80, 80, 8, 22, -80, -40], s: [6, 18], op: [0.07, 0.18], col: 0xf0c890 });
    const dB = SB.dust(ctx, { n: 120, box: [-70, 70, 4, 10, -56, -36], s: [3, 9], op: [0.05, 0.12], col: 0xe8c49a });
    SB.rays(ctx, { n: 9, c: [0, 60, -150], len: 140, w: [8, 20], op: [0.04, 0.09], col: 0xffd2a0, spread: 60, tilt: 0 });
    SB.reeds(ctx, [[-2.2, 0, -9.0], [2.4, 0, -8.8]], { per: 8, r: 0.4, h: [0.6, 1.1], col: 0x5a5440 });
    ctx.shadowAt([0, 6, -40], 70);
    const cam = SB.cam([0.5, 1.6, -2], [0, 7.6, -40], 30), c0 = cam.position.clone();
    return { ctx, cam, dur: 5, post: { focus: 31, ap: 0.5, maxR: 14, exp: 1.05, gain: [1.06, 0.97, 0.88], sat: 0.88, vign: 0.45, grain: 0.055 },
      update(t, dt) {
        const adv = 2.6 * t;   // 整片骑兵往前压，一排排从山脊后面冒出来
        back.forEach((p, i) => { const z = p.z + adv, y = ctx.hAt(p.x, z) - 0.05 + Math.abs(Math.sin(t * 9 + p.ph)) * 0.06; q.setFromAxisAngle(Y, p.yaw); M4.compose(V(p.x, y, z), q, V(1, 1, 1)); inst.setMatrixAt(i, M4); });
        inst.instanceMatrix.needsUpdate = true;
        for (const m of hd) m.count = 0;
        front.forEach(p => { const k = ((Math.floor((t * 19.5 + p.ph * 3) / (2 * PI) * NPH) % NPH) + NPH) % NPH, m = hd[k], z = p.z + adv; q.setFromAxisAngle(Y, p.yaw); M4.compose(V(p.x, ctx.hAt(p.x, z) - 0.04, z), q, V(1, 1, 1)); m.setMatrixAt(m.count++, M4); });
        for (const m of hd) m.instanceMatrix.needsUpdate = true;
        flags.forEach(F => { const z = F.z + adv; F.g.position.set(F.x, ctx.hAt(F.x, z) - 0.3, z); const P = F.f.geometry.attributes.position; for (let k = 0; k < P.count; k++) { const x0 = F.base[k * 3] + 0.9; P.setZ(k, Math.sin(x0 * 2.2 - t * 7 + F.ph) * 0.14 * x0); } P.needsUpdate = true; F.f.geometry.computeVertexNormals(); });
        dA.position.z = adv * 0.8; dB.position.z = adv;
        const sh = 0.012 + 0.02 * sm(t / 4); cam.position.copy(c0).add(V(Math.sin(t * 37) * sh, Math.sin(t * 53 + 1) * sh, 0)); cam.lookAt(0, 7.6 - 0.6 * sm(t / 5), -40);
      } };
  };

})();
