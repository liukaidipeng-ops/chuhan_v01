// ===== 乌江亭长与他的渡船（美术 10-09，Ham：船夫和他的船需要升级）=====
// 替换 models.js 里 makeBoat({awning}) + makeBoatman 那条小木盒船：
//   · 船：长约 4.4、宽约 1.2 的平底渡船。船身放样成型，外板带船板缝，船舷压一道深色舷木，船头翘起的艏柱；
//     中后部一顶乌篷（竹篾编的黑篷，两头有篷架），三道横坐板、舱底铺板；船头竖一根竹竿挂纸灯笼（暖光），舱里一盘缆绳、一只陶罐。
//   · 亭长：老人。斗笠、蓑衣（两层草穗）、麻布短褐、卷到小腿的裤子、草鞋，白长须。有关节，带几个姿势：
//       stand 站、pole 撑篙（循环）、bow 作揖、beckon 招手、offer 伸手（接马缰 / 请上船）。
//   · makeFerry() 返回 { group, man, pole, lantern, update(dt), setPose(name, dur) }；船首朝 +X，船中在原点，水线约在 y=0.12。
const Ferry = (() => {
  const { toon, inked, canvasTex } = Core;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const R = (a, b) => a + (b - a) * rnd();
  const memo = {}, once = (k, f) => memo[k] || (memo[k] = f());

  // ---------- 贴图 ----------
  // 船板：深浅相间的木板，板缝一道深线，零星木节
  const plankTex = () => once('plank', () => canvasTex(512, 256, (g, w, h) => {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const y0 = i * h / n, c = [92 + R(-8, 8), 64 + R(-6, 6), 40 + R(-5, 5)];
      g.fillStyle = `rgb(${c.map(Math.round).join(',')})`; g.fillRect(0, y0, w, h / n);
      for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(40,24,12,${R(0.05, 0.16)})`; g.lineWidth = R(0.5, 1.5); const yy = y0 + R(2, h / n - 2); g.beginPath(); g.moveTo(R(-20, w), yy); g.lineTo(R(0, w + 20), yy + R(-1.5, 1.5)); g.stroke(); }
      g.fillStyle = 'rgba(24,14,8,.85)'; g.fillRect(0, y0, w, 2.2);
      for (let k = 0; k < 2; k++) { g.fillStyle = 'rgba(40,22,10,.5)'; g.beginPath(); g.ellipse(R(20, w - 20), y0 + R(6, h / n - 6), R(3, 7), R(1.5, 3), 0, 0, 7); g.fill(); }
    }
    // 两头的铁钉
    g.fillStyle = 'rgba(30,26,24,.7)';
    for (let i = 0; i < n; i++) for (const x of [14, w / 2, w - 14]) { g.beginPath(); g.arc(x, i * h / n + h / n / 2, 1.6, 0, 7); g.fill(); }
  }, { repeat: true }));
  // 乌篷：竹篾斜纹编织，黑里透棕
  const weaveTex = () => once('weave', () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2b2620'; g.fillRect(0, 0, w, h);
    const s = 16;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const odd = ((x + y) / s) % 2 === 0;
      const gr = g.createLinearGradient(x, y, odd ? x + s : x, odd ? y : y + s);
      gr.addColorStop(0, '#3b342b'); gr.addColorStop(0.5, '#4c4336'); gr.addColorStop(1, '#2e2821');
      g.fillStyle = gr; g.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
    g.strokeStyle = 'rgba(10,8,6,.6)'; g.lineWidth = 1;
    for (let i = 0; i <= w; i += s) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, { repeat: true }));
  // 斗笠：一圈圈的竹篾
  const hatTex = () => once('hat', () => canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#b39b68'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 5) { g.fillStyle = y % 10 ? 'rgba(120,96,52,.55)' : 'rgba(210,190,140,.4)'; g.fillRect(0, y, w, 2); }
    for (let x = 0; x < w; x += 9) { g.fillStyle = 'rgba(90,70,36,.35)'; g.fillRect(x, 0, 1, h); }
  }, { repeat: true }));

  // 蓑衣草片：竖向草纹，下沿剪成一缕缕的毛边（透明处镂空）
  const strawTex = () => once('straw', () => canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.78);
    for (let x = w; x >= 0; x -= 6) g.lineTo(x, h * (0.8 + R(0, 0.2)));
    g.closePath(); g.fillStyle = '#9c8452'; g.fill();
    g.save(); g.clip();
    for (let k = 0; k < 260; k++) { const x = R(0, w); g.strokeStyle = rnd() < 0.5 ? 'rgba(70,54,28,.5)' : 'rgba(200,178,120,.45)'; g.lineWidth = R(0.6, 2); g.beginPath(); g.moveTo(x, R(-10, h * 0.3)); g.lineTo(x + R(-3, 3), h); g.stroke(); }
    g.fillStyle = 'rgba(60,44,20,.35)'; g.fillRect(0, 0, w, 6);
    g.restore();
  }, { repeat: true }));
  // ---------- 船身：沿船长放样的 U 形截面 ----------
  const L = 4.4, B = 1.2;
  // 截面参数：x 处的 半宽、深度、舷高（船头船尾翘）
  const halfW = x => { const k = Math.abs(x) / (L / 2); return B / 2 * Math.pow(Math.max(0, 1 - Math.pow(k, x > 0 ? 2.6 : 3.2)), 0.55) + 0.02; };
  const sheer = x => { const k = x / (L / 2); return 0.42 + 0.34 * Math.pow(Math.max(0, k), 3.2) + 0.16 * Math.pow(Math.max(0, -k), 3); };
  const keel = x => { const k = Math.abs(x) / (L / 2); return 0.02 + 0.22 * Math.pow(k, 4); };
  function hullGeo(inset = 0) {
    const NX = 40, NV = 14, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NX; i++) {
      const x = -L / 2 + L * i / NX, hw = Math.max(0.004, halfW(x) - inset), top = sheer(x) - (inset ? 0.02 : 0), bot = keel(x) + inset;
      for (let j = 0; j <= NV; j++) {
        const t = j / NV, a = -PI / 2 + PI * t;                 // 从左舷顶（t=0）经船底（t=.5）到右舷顶（t=1）
        const s = Math.sin(a), c = Math.cos(a);
        const z = hw * s * (0.92 + 0.08 * c);                  // 平底微圆的 U 形
        const yb = bot + (top - bot) * (1 - Math.pow(c, 0.45));
        pos.push(x, yb, z); uv.push(x / 1.6, t * 2.2);
      }
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j, b = a + NV + 1;
      if (inset) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // 舷木：沿两舷顶边的一根粗木条
  function railGeo(side) {
    const pts = [];
    for (let i = 0; i <= 30; i++) { const x = -L / 2 + 0.02 + (L - 0.04) * i / 30; pts.push(V(x, sheer(x) + 0.015, side * (halfW(x) - 0.01))); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.035, 6, false);
  }

  function makeBoatBody() {
    const g = new THREE.Group();
    const woodDark = toon(0x4a3220, { unique: true }), woodMid = toon(0x7a5a3a), woodLight = toon(0x9c7a52);
    const outer = toon(0xffffff, { map: plankTex(), unique: true });
    const inner = toon(0xc8a47a, { map: plankTex(), unique: true });
    g.add(inked(hullGeo(0), outer, 0.018));
    const inMesh = new THREE.Mesh(hullGeo(0.045), inner); inMesh.receiveShadow = true; g.add(inMesh);
    for (const s of [-1, 1]) g.add(inked(railGeo(s), woodDark, 0.012));
    // 艏柱：船头一根向上翘的弯木
    const stemPts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; stemPts.push(V(L / 2 - 0.08 + 0.18 * t * t, keel(L / 2) + (sheer(L / 2) + 0.18 - keel(L / 2)) * t, 0)); }
    g.add(inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stemPts), 16, 0.045, 6, false), woodDark, 0.012));
    // 船尾封板
    const tr = inked(new THREE.BoxGeometry(0.06, 0.34, halfW(-L / 2 + 0.1) * 2 + 0.04), woodDark, 0.012); tr.position.set(-L / 2 + 0.08, sheer(-L / 2 + 0.08) - 0.16, 0); tr.rotation.z = -0.25; g.add(tr);
    // 舱底铺板
    for (let i = 0; i < 7; i++) { const x = -1.5 + i * 0.5, w = halfW(x) * 1.5; const fb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, w), woodLight); fb.position.set(x, keel(x) + 0.08, 0); fb.receiveShadow = true; g.add(fb); }
    // 横坐板
    for (const x of [-1.55, 0.35, 1.25]) { const w = halfW(x) * 2 - 0.06; const th = inked(new THREE.BoxGeometry(0.2, 0.05, w), woodMid, 0.01); th.position.set(x, sheer(x) - 0.1, 0); g.add(th); }
    // 乌篷：x 从 -1.35 到 0.05 的半圆篷，两头竹篷架
    const awR = 0.66, awL = 1.4, awX = -0.65;
    const aw = new THREE.CylinderGeometry(awR, awR, awL, 18, 4, true, -PI / 2, PI);
    aw.rotateZ(PI / 2);
    const awMat = toon(0xffffff, { map: weaveTex(), side: THREE.DoubleSide, unique: true });
    const awM = new THREE.Mesh(aw, awMat); awM.position.set(awX, sheer(awX) + 0.02, 0); awM.castShadow = true; g.add(awM);
    for (const dx of [-awL / 2, awL / 2]) {
      const rib = inked(new THREE.TorusGeometry(awR + 0.01, 0.028, 5, 18, PI), woodDark, 0.01);
      rib.rotation.y = PI / 2; rib.position.set(awX + dx, sheer(awX) + 0.02, 0); g.add(rib);
    }
    // 船头灯笼：竹竿 + 纸灯笼（暖光，自发光）
    const lantern = new THREE.Group();
    const pole = inked(new THREE.CylinderGeometry(0.018, 0.022, 1.5, 6), toon(0x8a7a48), 0.008); pole.position.y = 0.75; lantern.add(pole);
    const arm = inked(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 5), toon(0x8a7a48), 0.008); arm.rotation.z = PI / 2; arm.position.set(0.18, 1.46, 0); lantern.add(arm);
    const lampGeo = new THREE.SphereGeometry(0.13, 14, 10); lampGeo.scale(1, 1.25, 1);
    const lampMat = new THREE.MeshToonMaterial({ color: 0xf2dcae, emissive: 0xffb04a, emissiveIntensity: 0.9, gradientMap: null });
    const lamp = new THREE.Mesh(lampGeo, lampMat); lamp.position.set(0.36, 1.26, 0); lantern.add(lamp);
    for (const dy of [-0.16, 0.16]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), toon(0x5a1a10)); cap.position.set(0.36, 1.26 + dy, 0); lantern.add(cap); }
    const glow = new THREE.PointLight(0xffb45a, 0.0, 4.5, 2); glow.position.copy(lamp.position); lantern.add(glow);
    lantern.position.set(L / 2 - 0.42, sheer(L / 2 - 0.42) - 0.08, 0.32);
    g.add(lantern);
    // 舱里的东西：一盘缆绳、一只陶罐、一卷草席
    const rope = inked(new THREE.TorusGeometry(0.16, 0.035, 6, 16), toon(0xb39a68), 0.008); rope.rotation.x = PI / 2; rope.position.set(1.62, keel(1.62) + 0.13, -0.12); g.add(rope);
    const rope2 = inked(new THREE.TorusGeometry(0.11, 0.032, 6, 14), toon(0xa48a58), 0.008); rope2.rotation.x = PI / 2; rope2.position.set(1.62, keel(1.62) + 0.18, -0.12); g.add(rope2);
    const jarG = new THREE.LatheGeometry([V(0, 0, 0), V(0.1, 0.01, 0), V(0.14, 0.1, 0), V(0.12, 0.2, 0), V(0.06, 0.25, 0), V(0.07, 0.29, 0)].map(v => new THREE.Vector2(v.x, v.y)), 12);
    const jar = inked(jarG, toon(0x7a4a2e), 0.008); jar.position.set(0.8, keel(0.8) + 0.09, 0.24); g.add(jar);
    const mat = inked(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10), toon(0xc2ab72), 0.008); mat.rotation.x = PI / 2; mat.position.set(-1.0, keel(-1.0) + 0.16, -0.2); g.add(mat);
    g.traverse(o => { if (o.isMesh && !o.material.side) o.castShadow = true; });
    return { group: g, lantern, lamp, lampMat, glow };
  }

  // ---------- 亭长 ----------
  // 关节：hips → spine → chest → neck → head；chest → sh[L/R] → el[L/R] → hand；hips → th[L/R] → kn[L/R]
  const SKIN = 0xc9a27a, ROBE = 0x857760, ROBE2 = 0x6f644f, PANTS = 0x5d5547, STRAW = 0xa48c5a, STRAW2 = 0x7a6640, HAIR = 0xe8e2d6;
  function limb(len, r0, r1, color, seg = 7) { const g = new THREE.CylinderGeometry(r1, r0, len, seg); g.translate(0, -len / 2, 0); return inked(g, toon(color), 0.012); }
  function makeElder() {
    const root = new THREE.Group();
    const J = {};
    const joint = (name, parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); J[name] = j; return j; };
    const hips = joint('hips', root, 0, 0.86, 0);
    // 腿：卷到小腿的裤子、露出的小腿、草鞋
    for (const s of [-1, 1]) {
      const th = joint(s < 0 ? 'thL' : 'thR', hips, 0, -0.02, s * 0.1);
      th.add(limb(0.42, 0.085, 0.075, PANTS));
      const kn = joint(s < 0 ? 'knL' : 'knR', th, 0, -0.42, 0);
      const roll = inked(new THREE.CylinderGeometry(0.075, 0.078, 0.07, 8), toon(ROBE2), 0.01); roll.position.y = -0.04; kn.add(roll);
      kn.add(limb(0.38, 0.05, 0.04, SKIN));
      const foot = inked(new THREE.BoxGeometry(0.2, 0.05, 0.09), toon(0xa58a52), 0.008); foot.position.set(0.05, -0.4, 0); kn.add(foot);
    }
    const spine = joint('spine', hips, 0, 0.02, 0);
    // 短褐：下摆到大腿的麻布上衣，系一根草绳腰带
    const robeG = new THREE.LatheGeometry([[0.2, -0.28], [0.205, -0.12], [0.18, 0.05], [0.19, 0.25], [0.21, 0.42], [0.13, 0.52], [0.06, 0.55]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
    robeG.scale(1, 1, 0.82);
    spine.add(inked(robeG, toon(ROBE), 0.014));
    const belt = inked(new THREE.TorusGeometry(0.188, 0.022, 5, 14), toon(0xb09c68), 0.008); belt.rotation.x = PI / 2; belt.scale.set(1, 0.82, 1); belt.position.y = 0.03; spine.add(belt);
    const chest = joint('chest', spine, 0, 0.36, 0);
    // 蓑衣：两层带毛边的草片（贴图镂空成一缕一缕），上层短、下层长，胸前开襟；领口一圈草绳
    {
      const capeMat = toon(0xffffff, { map: strawTex(), side: THREE.DoubleSide, alphaTest: 0.5, unique: true });
      for (const [pts, phase] of [
        [[[0.32, -0.34], [0.31, -0.2], [0.27, 0.0], [0.21, 0.14], [0.13, 0.22]], 0],
        [[[0.29, -0.06], [0.27, 0.04], [0.22, 0.14], [0.15, 0.22], [0.1, 0.26]], 0.5],
      ]) {
        const lg = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 22, PI * 0.3, PI * 1.4);
        lg.rotateY(PI / 2);
        const uv = lg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * 3 + phase);
        const m = new THREE.Mesh(lg, capeMat); m.castShadow = true; chest.add(m);
      }
      const col = inked(new THREE.TorusGeometry(0.12, 0.032, 5, 16), toon(STRAW2), 0.008); col.rotation.x = PI / 2; col.position.y = 0.24; chest.add(col);
    }
    const neck = joint('neck', chest, 0, 0.2, 0);
    const head = joint('head', neck, 0, 0.1, 0);
    const skull = inked(new THREE.SphereGeometry(0.115, 14, 10), toon(SKIN), 0.012); skull.scale.set(1, 1.08, 0.95); skull.position.y = 0.06; head.add(skull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 5), toon(0xb48a62)); nose.rotation.z = -PI / 2; nose.position.set(0.115, 0.05, 0); head.add(nose);
    for (const s of [-1, 1]) {                                                       // 白眉
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.016, 0.06), toon(HAIR)); br.position.set(0.105, 0.1, s * 0.045); br.rotation.x = s * 0.25; head.add(br);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), toon(0x1a1612)); eye.position.set(0.108, 0.075, s * 0.04); head.add(eye);
    }
    // 白长须：下巴一缕到胸口
    const bg = new THREE.ConeGeometry(0.06, 0.32, 7); bg.translate(0, -0.16, 0); bg.rotateZ(-0.12);
    const beard = inked(bg, toon(HAIR), 0.008); beard.position.set(0.09, 0.0, 0); head.add(beard);
    const mus = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 10, PI), toon(HAIR)); mus.rotation.set(0, PI / 2, PI); mus.position.set(0.112, 0.02, 0); head.add(mus);
    // 斗笠：宽檐浅锥 + 系带
    const hatG = new THREE.ConeGeometry(0.42, 0.2, 20, 1, true); hatG.translate(0, 0.1, 0);
    const hat = inked(hatG, toon(0xffffff, { map: hatTex(), side: THREE.DoubleSide, unique: true }), 0.01); hat.position.y = 0.13; head.add(hat);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), toon(STRAW2)); knob.position.y = 0.34; head.add(knob);
    for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 3), toon(0x5a4a30)); st.position.set(0.02, 0.04, s * 0.11); st.rotation.x = s * 0.15; head.add(st); }
    // 手臂
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const sh = joint('sh' + n, chest, 0.0, 0.14, s * 0.2);
      sh.add(limb(0.3, 0.065, 0.055, ROBE));
      const el = joint('el' + n, sh, 0, -0.3, 0);
      el.add(limb(0.26, 0.05, 0.04, ROBE2));
      const hand = joint('hand' + n, el, 0, -0.27, 0);
      hand.add(inked(new THREE.SphereGeometry(0.042, 8, 6), toon(SKIN), 0.008));
    }
    return { group: root, J };
  }

  // 姿势：每个关节 [x, y, z] 欧拉角（弧度）+ hips 的高度偏移 hy、整体前倾。
  // 关节角：躯干绕 Z 负是前倾；手臂绕 Z 正是往前抬、肘绕 Z 正是往前弯；肩绕 Y 把手臂往身前收（左负右正）。
  const POSES = {
    stand:  { hips: [0, 0, 0], spine: [0, 0, -0.06], chest: [0, 0, -0.04], neck: [0, 0, 0.06], head: [0, 0, 0.04], shL: [0.08, 0, 0.06], elL: [0, 0, 0.22], shR: [-0.08, 0, 0.06], elR: [0, 0, 0.22], thL: [0, 0, 0.02], knL: [0, 0, -0.04], thR: [0, 0, -0.02], knR: [0, 0, -0.04], hy: 0 },
    // 撑篙：身体前倾，两手一前一后握篙，篙斜插入水；循环时往前推、再收回
    pole:   { hips: [0, 0, 0], spine: [0, 0, -0.32], chest: [0, 0, -0.12], neck: [0, 0, 0.3], head: [0, 0, 0.18], shL: [0, -0.2, 1.2], elL: [0, 0, 0.5], shR: [0, 0.35, 0.5], elR: [0, 0, 1.1], thL: [0, 0, 0.3], knL: [0, 0, -0.4], thR: [0, 0, -0.32], knR: [0, 0, -0.08], hy: -0.05 },
    // 作揖：两手在胸前合抱，身子弯下去
    bow:    { hips: [0, 0, 0], spine: [0, 0, -0.42], chest: [0, 0, -0.16], neck: [0, 0, 0.2], head: [0, 0, 0.06], shL: [0, -0.5, 1.0], elL: [0, 0, 1.3], shR: [0, 0.5, 1.0], elR: [0, 0, 1.3], thL: [0, 0, 0.12], knL: [0, 0, -0.18], thR: [0, 0, 0.12], knR: [0, 0, -0.18], hy: -0.03 },
    // 招手：右臂举过头摆动
    beckon: { hips: [0, 0, 0], spine: [0, 0, 0.02], chest: [0, 0, 0.02], neck: [0, 0, 0.08], head: [0, 0, 0.1], shL: [0.08, 0, 0.06], elL: [0, 0, 0.22], shR: [-0.35, 0.2, 2.5], elR: [0, 0, 0.5], thL: [0, 0, 0.02], knL: [0, 0, -0.04], thR: [0, 0, -0.02], knR: [0, 0, -0.04], hy: 0 },
    // 伸手：右手往前平伸（请上船 / 接马缰）
    offer:  { hips: [0, 0, 0], spine: [0, 0, -0.14], chest: [0, 0, -0.04], neck: [0, 0, 0.12], head: [0, 0, 0.06], shL: [0.08, 0, 0.1], elL: [0, 0, 0.3], shR: [0, 0.15, 1.45], elR: [0, 0, 0.15], thL: [0, 0, 0.08], knL: [0, 0, -0.12], thR: [0, 0, -0.06], knR: [0, 0, -0.05], hy: 0 },
  };
  const KEYS = Object.keys(POSES.stand).filter(k => k !== 'hy');

  function makeFerry() {
    seed = 7;
    const boat = makeBoatBody();
    const man = makeElder();
    const g = new THREE.Group(); g.add(boat.group);
    man.group.position.set(-1.75, sheer(-1.75) - 0.42, -0.05); man.group.rotation.y = 0; boat.group.add(man.group);
    // 竹篙：带竹节，握在亭长右手里（撑篙时）；其余姿势靠在篷边
    const poleG = new THREE.Group();
    const shaft = inked(new THREE.CylinderGeometry(0.022, 0.026, 4.6, 6), toon(0x9a8a52), 0.008); poleG.add(shaft);
    for (let i = -6; i <= 6; i++) { const nd = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 4, 8), toon(0x6a5a32)); nd.rotation.x = PI / 2; nd.position.y = i * 0.36; poleG.add(nd); }
    boat.group.add(poleG);
    let cur = 'stand', from = null, to = POSES.stand, k = 1, dur = 0.01, t = R(0, 5);
    const lerpA = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    const snap = () => { const o = {}; for (const n of KEYS) { const r = man.J[n].rotation; o[n] = [r.x, r.y, r.z]; } o.hy = man.J.hips.position.y - 0.86; return o; };
    function setPose(name, d = 0.6) { if (!POSES[name]) return; from = snap(); to = POSES[name]; cur = name; k = 0; dur = Math.max(0.01, d); }
    function apply(p) { for (const n of KEYS) { const v = p[n]; man.J[n].rotation.set(v[0], v[1], v[2]); } man.J.hips.position.y = 0.86 + p.hy; }
    apply(POSES.stand);
    const api = {
      group: g, boat, man: { group: man.group, J: man.J }, pole: poleG, lantern: boat.lantern,
      setPose, get pose() { return cur; },
      lanternOn(v) { boat.glow.intensity = v ? 1.4 : 0; boat.lampMat.emissiveIntensity = v ? 1.1 : 0.25; },
      update(dt) {
        t += dt;
        if (k < 1) { k = Math.min(1, k + dt / dur); const u = k * k * (3 - 2 * k), p = {}; for (const n of KEYS) p[n] = lerpA(from[n], to[n], u); p.hy = from.hy + (to.hy - from.hy) * u; apply(p); }
        else if (cur === 'pole') {                         // 撑篙循环：推 1.6 秒一下
          const c = 0.5 - 0.5 * Math.cos(t * PI * 2 / 1.6), P0 = POSES.pole;
          const p = {}; for (const n of KEYS) p[n] = P0[n].slice();
          p.spine[2] -= 0.18 * c; p.shL[2] -= 0.3 * c; p.shR[2] += 0.35 * c; p.elR[2] -= 0.35 * c; p.knL[2] -= 0.12 * c; p.hy = P0.hy - 0.03 * c; apply(p);
        } else if (cur === 'beckon') { const p = {}; for (const n of KEYS) p[n] = POSES.beckon[n].slice(); p.elR[2] += 0.4 * Math.sin(t * 6); p.hy = 0; apply(p); }
        // 篙的位置：撑篙时握在右手，其余时候斜靠在篷边
        if (cur === 'pole' && k >= 1) {
          man.group.updateWorldMatrix(true, true);
          const hR = man.J.handR.getWorldPosition(V()), hL = man.J.handL.getWorldPosition(V());
          boat.group.worldToLocal(hR); boat.group.worldToLocal(hL);
          const dir = hL.clone().sub(hR).normalize();
          poleG.position.copy(hR).addScaledVector(dir, 0.9); poleG.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
        } else { poleG.position.set(-0.45, 1.0, 0.62); poleG.rotation.set(0.12, 0, 0.42); }
        boat.lampMat.emissiveIntensity = boat.glow.intensity > 0 ? 1.0 + 0.12 * Math.sin(t * 7.3) * Math.sin(t * 2.9) : boat.lampMat.emissiveIntensity;
      },
    };
    return api;
  }
  return { makeFerry, POSES, sheer, keel, halfW, LENGTH: L };
})();
