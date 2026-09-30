// ===== 结算动画：楚败·乌江自刎 / 汉败·彭城之败 =====
const Ending = (() => {
  const { scene, Time, onFrame, tween, sleep, ease, Cam, Tex, toon, rnd, camera } = Core;
  const V3 = THREE.Vector3;
  const R = (a, b) => a + Math.random() * (b - a);
  const $ = id => document.getElementById(id);
  let skipping = false, running = false;
  const cleanups = [];

  // ---------- 字幕、诗句、转场 ----------
  // 按台词编号播放配音并显示字幕
  async function say(id, opts = {}) {
    if (skipping) return;
    const text = Voice.text(id);
    $('subSpk').textContent = Voice.speaker(id);
    $('subLine').textContent = text;
    $('subs').classList.add('on');
    const minDur = opts.minDur ?? Math.max(2.2, text.length * 0.2);
    await Voice.play(id, { minDur });
    $('subs').classList.remove('on');
    await sleep(opts.gap ?? 0.4);
  }
  async function verse(lines, id, dark = true) {
    if (skipping) return;
    const box = $('verse');
    box.innerHTML = ''; box.classList.toggle('dark', dark);
    const spans = lines.map(l => { const s = document.createElement('span'); s.textContent = l; box.appendChild(s); return s; });
    let dur = 10;
    const reading = Voice.play(id, { onDur: d => { dur = d; } });
    await sleep(0.05);
    for (const s of spans) { if (skipping) break; s.classList.add('on'); await sleep(Math.max(1.6, dur / spans.length)); }
    await Promise.all([reading, sleep(1.0)]);
    spans.forEach(s => s.classList.remove('on'));
    await sleep(1.2);
    box.innerHTML = '';
  }
  function fade(on, dur = 1.2) {
    const f = $('fade'); f.style.transition = `opacity ${dur}s`; f.style.opacity = on ? 1 : 0;
    return sleep(dur);
  }
  function track(fn) { const off = onFrame(fn); cleanups.push(off); return off; }
  function add(o) { scene.add(o); cleanups.push(() => Core.disposeTree(o)); return o; }

  // 墨色芦苇（顶点摆动）
  function reeds(O, n, area) {
    const geo = new THREE.ConeGeometry(0.03, 1.5, 3); geo.translate(0, 0.75, 0);
    const mat = toon(0x4d4b3e, { unique: true });
    const uT = { value: 0 };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = uT;
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `vec3 transformed = vec3(position);
         float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 0.9;
         transformed.x += sin(uT * 1.8 + ph) * position.y * position.y * 0.09;
         transformed.z += cos(uT * 1.3 + ph) * position.y * position.y * 0.04;`);
    };
    const im = new THREE.InstancedMesh(geo, mat, n);
    const M = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const [x, z] = area();
      M.compose(new V3(O.x + x, 0, O.z + z), new THREE.Quaternion().setFromEuler(new THREE.Euler(R(-0.15, 0.15), R(0, 6), R(-0.15, 0.15))), new V3(1, R(0.5, 1.4), 1));
      im.setMatrixAt(i, M);
    }
    track(dt => { uT.value += dt; });
    return add(im);
  }
  // 飞鸟
  const birdTex = Core.canvasTex(128, 64, (g) => {
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(8, 30); g.quadraticCurveTo(36, 8, 64, 34); g.quadraticCurveTo(92, 8, 120, 30); g.stroke();
  });
  function birds(O, n) {
    for (let i = 0; i < n; i++) {
      const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex, color: 0x1b1a19, transparent: true, depthWrite: false })));
      s.position.set(O.x + R(-30, 10), R(9, 16), O.z + R(-30, -14));
      const v = R(1.2, 2), ph = R(0, 6), sc = R(0.8, 1.3);
      track(dt => { s.position.x += v * dt; ph && (s.scale.set(sc * 1.2, sc * 0.6 * (0.6 + 0.4 * Math.abs(Math.sin(performance.now() * 0.006 + ph))), 1)); });
    }
  }
  function mountains(O, zc, count, R0, tintOp = 1) {
    for (let i = 0; i < count; i++) {
      const w = R(26, 40), h = w * R(0.35, 0.55);
      const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: Board.mtTex[i % 3], transparent: true, depthWrite: false, opacity: tintOp })));
      m.position.set(O.x + (i - (count - 1) / 2) * 24 + R(-5, 5), h / 2 - 1.2, O.z + zc - R(0, 14));
      m.renderOrder = -5;
    }
  }
  function ground(O, w, d, zc, col = '#e0d3b6') {
    const tex = Core.canvasTex(512, 512, (g, W) => {
      g.fillStyle = col; g.fillRect(0, 0, W, W);
      for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(80,70,55,${0.04 + rnd() * 0.06})`; Core.inkBlot(g, rnd() * W, rnd() * W, 20 + rnd() * 70, 0.6, 0.6); }
    }, { repeat: true });
    tex.repeat.set(w / 12, d / 12);
    const g = add(new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })));
    g.rotation.x = -Math.PI / 2; g.position.set(O.x, 0, O.z + zc); g.receiveShadow = true;
    return g;
  }

  // 保存/恢复场景氛围
  let saved = null;
  function mood(bg, fogNear, fogFar, sunPos, sunCol, sunInt, hemiInt) {
    if (!saved) saved = { bg: scene.background.clone(), fn: scene.fog.near, ff: scene.fog.far, fc: scene.fog.color.clone(), sp: Core.sun.position.clone(), st: Core.sun.target.position.clone(), sc: Core.sun.color.clone(), si: Core.sun.intensity, hi: Core.hemi.intensity };
    scene.background.set(bg); scene.fog.color.set(bg); scene.fog.near = fogNear; scene.fog.far = fogFar;
    Core.sun.position.copy(sunPos); Core.sun.color.set(sunCol); Core.sun.intensity = sunInt; Core.hemi.intensity = hemiInt;
  }
  function restoreMood() {
    if (!saved) return;
    scene.background.copy(saved.bg); scene.fog.color.copy(saved.fc); scene.fog.near = saved.fn; scene.fog.far = saved.ff;
    Core.sun.position.copy(saved.sp); Core.sun.target.position.copy(saved.st); Core.sun.color.copy(saved.sc); Core.sun.intensity = saved.si; Core.hemi.intensity = saved.hi;
    Core.sun.shadow.camera.left = -9; Core.sun.shadow.camera.right = 9; Core.sun.shadow.camera.top = 9; Core.sun.shadow.camera.bottom = -9; Core.sun.shadow.camera.updateProjectionMatrix();
    saved = null;
  }
  function sunAt(O, off, target, size = 14) {
    Core.sun.position.copy(O).add(off);
    Core.sun.target.position.copy(O).add(target);
    const c = Core.sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.far = 80; c.updateProjectionMatrix();
  }
  function shot(O, p, l, dur = 0) {
    const P = O.clone().add(p), L = O.clone().add(l);
    if (dur <= 0) { Cam.cine = true; Cam.pos.copy(P); Cam.look.copy(L); return Promise.resolve(); }
    return Cam.to(P, L, dur);
  }
  function dolly(O, p, l, dur) { return Cam.to(O.clone().add(p), O.clone().add(l), dur, ease.linear); }

  // ======================================================================
  //  乌江（楚败）
  // ======================================================================
  async function wujiang() {
    const O = new V3(1000, 0, 0);
    // 布景
    mood(0xe3cfaa, 14, 95, new V3(), 0xffc58a, 2.2, 1.2);
    sunAt(O, new V3(-4, 7, -18), new V3(0, 0, 0));
    ground(O, 120, 40, 18, '#dccaa6');
    const farBank = ground(O, 120, 30, -27, '#cbb993');
    const river = add(Board.makeRiver(140, 10, O.z - 6, 0x4e4a45, 0xd6b98c));
    river.position.set(O.x, -0.05, O.z - 6);
    const sunDisk = add(new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ color: 0xc23b22, fog: false, transparent: true, opacity: 0.92, depthWrite: false })));
    sunDisk.position.set(O.x - 6, 9, O.z - 70); sunDisk.renderOrder = -9;
    mountains(O, -40, 6, 30);
    reeds(O, 420, () => { const side = Math.random() < 0.75; return [R(-30, 30), side ? R(-1.4, 0.4) : R(-12, -10.2)]; });
    birds(O, 9);
    for (let i = 0; i < 8; i++) { const r = add(Core.inked(new THREE.DodecahedronGeometry(R(0.3, 0.9), 0), toon(0x7b7368))); r.position.set(O.x + R(-14, 14), 0.1, O.z + R(-1, 6)); r.scale.y = 0.55; }
    for (let i = 0; i < 4; i++) { const p = add(Board.pine(R(4, 7))); p.position.set(O.x + R(-22, -11), 0, O.z + R(2, 12)); }
    // 角色
    const xy = Models.makeXiangYu();
    add(xy.group); xy.group.position.set(O.x, 0, O.z + 0.6); xy.group.rotation.y = Math.PI;
    track(dt => xy.update(dt));
    const horse = Models.makeWuzhui();
    add(horse.group); horse.group.position.set(O.x + 2.3, 0, O.z + 1.4); horse.group.rotation.y = Math.PI * 0.85;
    track(dt => horse.update(dt));
    const boat = Models.makeBoat({ awning: true });
    add(boat.group); boat.group.scale.setScalar(1.25);
    const boatStop = new V3(O.x - 2.4, 0, O.z - 3.0);
    boat.group.position.set(O.x - 16, 0, O.z - 3.4);
    let bt = 0;
    track(dt => { bt += dt; boat.group.position.y = Math.sin(bt * 1.4) * 0.04; boat.group.rotation.z = Math.sin(bt * 1.1) * 0.03; boat.man.poleArm.rotation.z = 0.5 + Math.sin(bt * 1.6) * 0.3; });
    // 汉军骑兵（远处山岗）
    const cavGeo = Models.cavalryStaticGeo('r');
    const hanN = 46;
    const han = new THREE.InstancedMesh(cavGeo, Models.vcMat, hanN), hanO = new THREE.InstancedMesh(cavGeo, Core.outlineShared, hanN);
    han.frustumCulled = hanO.frustumCulled = false;
    han.visible = hanO.visible = false;
    add(han); add(hanO);
    const hanU = [];
    for (let i = 0; i < hanN; i++) hanU.push({ x: O.x + R(-20, 20), z: O.z + 34 + R(0, 10), ph: R(0, 6), v: R(0.9, 1.2) });
    let hanOn = false, hanT = 0;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    const banners = [];
    for (let i = 0; i < 5; i++) { const b = Models.makeBanner('r', '漢'); add(b.group); b.group.scale.setScalar(1.6); b.group.visible = false; banners.push(b); track(dt => b.update(dt)); b.bx = O.x - 16 + i * 8; }
    track(dt => {
      if (hanOn) hanT += dt;
      for (let i = 0; i < hanN; i++) {
        const u = hanU[i];
        const z = Math.max(u.z - hanT * 2.2 * u.v, O.z + 13 + (i % 5) * 1.6);
        M.compose(new V3(u.x, Math.abs(Math.sin(hanT * 8 + u.ph)) * 0.15, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.sin(hanT * 8 + u.ph) * 0.05)), new V3(1, 1, 1));
        han.setMatrixAt(i, M); hanO.setMatrixAt(i, M);
      }
      han.instanceMatrix.needsUpdate = hanO.instanceMatrix.needsUpdate = true;
      banners.forEach((b, i) => b.group.position.set(b.bx, 0, Math.max(O.z + 15, O.z + 36 - hanT * 2.2)));
    });

    // —— 序：四面楚歌 ——
    Time.scale = 1;
    await fade(true, 1.4);
    document.body.classList.add('cine');
    $('hud').classList.add('hidden');
    Sfx.Music.chuSong(0.3);
    await say('w1', { minDur: 4.5 });
    await say('w2', { minDur: 3 });
    await say('w3');
    await verse(['力拔山兮气盖世', '时不利兮骓不逝', '骓不逝兮可奈何', '虞兮虞兮奈若何'], 'w4', true);
    // —— 乌江 ——
    shot(O, new V3(9, 4.2, 11), new V3(-1, 1.6, -4));
    await fade(false, 1.6);
    Sfx.guqin(0.2);
    Sfx.Music.stinger('lose');
    dolly(O, new V3(5.5, 3, 7.5), new V3(-1, 1.6, -4), 9);
    tween(8, k => boat.group.position.lerpVectors(new V3(O.x - 16, 0, O.z - 3.4), boatStop, k), ease.out);
    await say('w5', { minDur: 5 });
    await sleep(1.2);
    // 亭长
    tween(1, k => { boat.man.group.rotation.y = -k * Math.PI / 2; });
    await shot(O, new V3(-3.6, 2.0, 1.4), new V3(-2.6, 1.7, -3.0), 1.4);
    await say('w6');
    await say('w7');
    // 项羽特写
    tween(1.2, k => { xy.group.rotation.y = Math.PI + k * 0.5; });
    await shot(O, new V3(-1.25, 2.0, -1.55), new V3(0, 2.0, 0.6), 1.5);
    Sfx.gong(0);
    xy.wind = 1.4;
    await sleep(0.6);
    await say('w8', { gap: 0.9 });
    dolly(O, new V3(-0.95, 2.05, -1.05), new V3(0, 2.05, 0.6), 14);
    await say('w9');
    await say('w10', { gap: 0.7 });
    await say('w11');
    // 赠马
    await shot(O, new V3(5.5, 2.4, 2.5), new V3(0, 1.3, -1.2), 1.2);
    tween(1.2, k => { xy.group.rotation.y = Math.PI + 0.5 - k * 0.9; });
    await say('w12');
    horse.speed = 0.25;
    const h0 = horse.group.position.clone(), h1 = new V3(O.x - 0.6, 0, O.z - 1.6);
    tween(0.8, k => { horse.group.rotation.y = Math.PI * 0.85 + k * 0.4; });
    await tween(3.2, k => horse.group.position.lerpVectors(h0, h1, k), ease.inOut);
    horse.speed = 0;
    Sfx.pluck(147, 0, 0.3);
    // 汉军至
    hanOn = true; han.visible = hanO.visible = true; banners.forEach(b => { b.group.visible = true; });
    Sfx.hooves(0, 6, 3); Sfx.drum(0.5); Sfx.drum(1.2); Sfx.drum(1.9);
    tween(1.6, k => { xy.group.rotation.y = Math.PI - 0.4 + k * (Math.PI + 0.4); });
    await shot(O, new V3(1.4, 2.3, -3.6), new V3(0, 1.8, 12), 1.6);
    await say('w13', { minDur: 4.5 });
    tween(0.6, k => { xy.armR.rotation.x = -0.25 - k * 1.1; });
    Sfx.shout(0); Sfx.clang(0.3);
    await sleep(1.4);
    // 终：面向大江，拔剑
    tween(1.8, k => { xy.group.rotation.y = Math.PI * 2 + k * Math.PI; xy.armR.rotation.x = -1.35 + k * 1.1; });
    await shot(O, new V3(2.2, 1.0, 6.5), new V3(-0.6, 2.4, -10), 2);
    Sfx.Music.chuSong(0);
    await say('w14', { gap: 0.6 });
    // 拔剑（抬起的一瞬，墨染转场）
    xy.bladeS.visible = true;
    await tween(1.2, k => { xy.armL.rotation.x = -k * 2.0; xy.armL.rotation.z = -0.1 - k * 0.3; xy.sword.position.set(-0.3 + k * 0.1, 1.12 + k * 0.7, 0.12 + k * 0.2); xy.sword.rotation.z = 0.5 + k * 2.4; });
    Sfx.slash(); Sfx.gong(0.1);
    inkWipe('#8e1c10');
    await sleep(1.4);
    await fade(true, 0.6);
    await say('w15', { minDur: 3 });
    return {
      cols: [['西楚霸王', 'big'], ['項籍'], ['自刎烏江'], ['時年三十一'], ['漢五年十二月']],
      motto: '無顏見江東父老', win: '漢 勝',
    };
  }

  // 墨染转场（红墨晕开）
  function inkWipe(color) {
    const c = document.createElement('canvas');
    c.width = innerWidth; c.height = innerHeight;
    Object.assign(c.style, { position: 'fixed', inset: 0, zIndex: 7, pointerEvents: 'none' });
    document.body.appendChild(c);
    const g = c.getContext('2d');
    const blobs = Array.from({ length: 16 }, () => ({ x: innerWidth * R(0.3, 0.7), y: innerHeight * R(0.3, 0.7), r: 0, v: R(300, 900) }));
    let t = 0;
    const off = onFrame(dt => {
      t += dt;
      g.fillStyle = color;
      for (const b of blobs) { b.r += b.v * dt; g.globalAlpha = 0.08; Core.inkBlot(g, b.x, b.y, b.r, 1, 0.4); }
      if (t > 2.5) { off(); }
    });
    cleanups.push(() => { off(); c.remove(); });
  }

  // ======================================================================
  //  彭城（汉败）
  // ======================================================================
  async function pengcheng() {
    const O = new V3(-1000, 0, 0);
    mood(0xd9cdb5, 18, 110, new V3(), 0xfff0d8, 2.4, 1.4);
    sunAt(O, new V3(-8, 14, 10), new V3(0, 0, 0), 20);
    ground(O, 160, 80, 12, '#ddd0b2');
    ground(O, 160, 40, -32, '#cfc19f');
    const river = add(Board.makeRiver(180, 7, O.z - 8, 0x46494a, 0xbfc3b8));
    river.position.set(O.x, -0.05, O.z - 8);
    mountains(O, -45, 7, 30);
    reeds(O, 260, () => [R(-40, 40), Math.random() < 0.5 ? R(-4.8, -4.2) : R(-11.8, -11.3)]);
    birds(O, 6);
    // 彭城城墙（远景）
    const wall = new THREE.Group();
    const wm = toon(0x8a8173);
    for (let i = 0; i < 14; i++) { const b = Core.inked(new THREE.BoxGeometry(3, 2.4, 1.6), wm); b.position.set(i * 3 - 20, 1.2, 0); wall.add(b); if (i % 2 === 0) { const c = Core.inked(new THREE.BoxGeometry(0.8, 0.6, 1.7), wm); c.position.set(i * 3 - 20, 2.7, 0); wall.add(c); } }
    const tower = Core.inked(new THREE.BoxGeometry(4, 2, 3), toon(0x5a4a3a)); tower.position.set(0, 3.4, 0); wall.add(tower);
    const roof = Core.inked(new THREE.ConeGeometry(3.4, 1.4, 4), toon(0x2a2826)); roof.position.set(0, 5.1, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.7; wall.add(roof);
    wall.position.set(O.x + 6, 0, O.z + 46); add(wall);
    for (let i = 0; i < 6; i++) { const p = add(Board.pine(R(4, 6))); p.position.set(O.x + (i % 2 ? 1 : -1) * R(32, 50), 0, O.z + R(10, 36)); }
    for (let i = 0; i < 4; i++) { const b = Models.makeBanner('r', '漢'); add(b.group); b.group.scale.setScalar(1.3); b.group.position.set(O.x - 12 + i * 8, 2.4, O.z + 45.6); track(dt => b.update(dt)); }

    // 汉军溃兵（向睢水奔逃）
    const NH = 90;
    const hanArmy = new Models.Army('r', 'spear', NH, 1);
    add(hanArmy.group);
    hanArmy.gait = 'run';
    const hu = hanArmy.units.map((u, i) => {
      u.p.set(O.x + R(-22, 22), 0, O.z + R(2, 16));
      u.yaw = Math.PI + R(-0.4, 0.4);
      return { u, v: R(2.2, 3.6), fell: false, sink: 0 };
    });
    let panic = false;
    track(dt => {
      hanArmy.update(dt);
      if (!panic) return;
      for (const h of hu) {
        const u = h.u;
        if (!h.fell) {
          u.p.z -= h.v * dt; u.p.x += Math.sin(u.yaw) * h.v * 0.3 * dt; u.lean = 0.3;
          if (u.p.z < O.z - 4.6) { h.fell = true; Fx.P.splash(u.p.clone().setY(0.05), 8, 1.4); if (Math.random() < 0.2) Sfx.splash(); }
        } else {
          h.sink += dt; u.p.z -= 0.6 * dt; u.p.y = -Math.min(1.6, h.sink * 0.9); u.lean = 0.9;
          u.vis = Math.max(0, 1 - h.sink * 0.4);
        }
      }
    });
    // 楚军铁骑
    const chuGeo = Models.cavalryStaticGeo('b');
    const NC = 70;
    const chu = new THREE.InstancedMesh(chuGeo, Models.vcMat, NC), chuO = new THREE.InstancedMesh(chuGeo, Core.outlineShared, NC);
    chu.frustumCulled = chuO.frustumCulled = false; chu.castShadow = true;
    chu.visible = chuO.visible = false;
    add(chu); add(chuO);
    const cu = Array.from({ length: NC }, () => ({ x: O.x + R(-26, 26), z: O.z + 40 + R(0, 22), ph: R(0, 6), v: R(0.9, 1.15) }));
    let chuT = -1;
    const M = new THREE.Matrix4();
    const chuBanners = [];
    for (let i = 0; i < 6; i++) { const b = Models.makeBanner('b', i === 2 ? '項' : '楚'); add(b.group); b.group.scale.setScalar(1.7); b.group.visible = false; chuBanners.push(b); track(dt => b.update(dt)); b.bx = O.x - 20 + i * 8; b.bz = O.z + 44 + R(0, 4); }
    track(dt => {
      if (chuT >= 0) chuT += dt;
      const t = Math.max(0, chuT);
      for (let i = 0; i < NC; i++) {
        const u = cu[i];
        const z = u.z - t * 6.5 * u.v;
        M.compose(new V3(u.x, Math.abs(Math.sin(t * 9 + u.ph)) * 0.2, Math.max(O.z + 1.2 + (i % 6) * 1.1, z)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, Math.sin(t * 9 + u.ph) * 0.06)), new V3(1, 1, 1));
        chu.setMatrixAt(i, M); chuO.setMatrixAt(i, M);
        if (chuT > 0 && Math.random() < 0.03) Fx.P.dust(new V3(u.x, 0.1, z), 1, new V3(0, 0, -1), 1.2);
      }
      chu.instanceMatrix.needsUpdate = chuO.instanceMatrix.needsUpdate = true;
      chuBanners.forEach(b => b.group.position.set(b.bx, 0, Math.max(O.z + 4, b.bz - t * 6.3)));
    });
    // 汉王车驾
    const ch = Models.makeChariot('r');
    const lb = Models.makeLiuBang();
    ch.group.children.forEach(c => { if (c.isMesh && c.geometry === Models.soldierGeo('r', 'spear')) c.visible = false; });
    lb.group.position.set(-0.3, 1.05, -0.35); lb.group.rotation.y = Math.PI / 2; lb.group.scale.setScalar(0.95);
    ch.group.add(lb.group);
    add(ch.group);
    ch.group.position.set(O.x - 26, 0, O.z - 1.5);
    track(dt => ch.update(dt));

    // —— 序 ——
    Time.scale = 1;
    await fade(true, 1.4);
    document.body.classList.add('cine');
    $('hud').classList.add('hidden');
    Sfx.guqin(0.2);
    await say('p1', { minDur: 5 });
    await say('p2', { minDur: 3 });
    // 平原远景
    shot(O, new V3(-14, 7.5, 26), new V3(4, 1.5, 34));
    await fade(false, 1.4);
    dolly(O, new V3(-9, 6, 22), new V3(4, 1.5, 36), 7);
    await say('p3', { minDur: 4.5 });
    // 铁骑冲锋
    chuT = 0; chu.visible = chuO.visible = true; chuBanners.forEach(b => { b.group.visible = true; });
    Sfx.B.hooves(0, 9, 4, 0.3, 0.3); Sfx.B.wheels(0, 8, 0.4); Sfx.Music.warDrums(0, 5); Sfx.B.shout(0.5, 16, 0.08, 1); Sfx.B.horn(0, 2.5, 98, 0.22);
    await shot(O, new V3(7, 1.0, 20), new V3(-2, 2.4, 44), 1.6);
    dolly(O, new V3(6, 0.8, 16), new V3(-2, 2.0, 36), 4);
    await say('p4', { minDur: 3 });
    panic = true;
    // 溃入睢水
    await shot(O, new V3(16, 4.5, 2), new V3(0, 0, -6), 1.4);
    Sfx.shout(0); Sfx.splash(0.5); Sfx.splash(1.1);
    await say('p5', { minDur: 5.5 });
    // 汉王出逃
    ch.speed = 1.6;
    const cStart = ch.group.position.clone(), cEnd = new V3(O.x + 34, 0, O.z - 1.5);
    const run = tween(16, k => ch.group.position.lerpVectors(cStart, cEnd, k), ease.linear);
    Sfx.rumble(0, 6); Sfx.hooves(0, 6, 2);
    const stop = (() => {
      Cam.cine = true;
      return track(dt => {
        const p = ch.group.position;
        Cam.pos.lerp(new V3(p.x + 1.8, 2.1, p.z - 5.0), 1 - Math.exp(-dt * 3));
        Cam.look.lerp(new V3(p.x + 0.2, 1.6, p.z + 0.6), 1 - Math.exp(-dt * 3));
      });
    })();
    await sleep(1.5);
    await tween(0.8, k => { lb.group.rotation.y = Math.PI / 2 + k * 1.6; });
    await say('p6');
    await tween(0.6, k => { lb.group.rotation.y = Math.PI / 2 + 1.6 * (1 - k); lb.armR.rotation.x = -0.4 - k * 1.5; });
    await say('p7', { minDur: 4 });
    // 大风
    stop();
    await shot(O, new V3(ch.group.position.x - O.x - 6, 5, 14), new V3(ch.group.position.x - O.x + 4, 1, -2), 1.4);
    Sfx.wind(0, 9);
    const stormCol = new THREE.Color(0x7c7568);
    const bg0 = scene.background.clone();
    tween(4, k => { scene.background.copy(bg0).lerp(stormCol, k); scene.fog.color.copy(scene.background); scene.fog.near = 18 - k * 14; scene.fog.far = 110 - k * 85; Core.sun.intensity = 2.4 * (1 - k * 0.7); });
    const stormOff = track(dt => {
      for (let i = 0; i < 6; i++) {
        const p = Cam.pos.clone().add(new V3(R(-26, 6), R(0, 6), R(-18, 8)));
        Fx.spawn({ pos: p, vel: new V3(R(9, 16), R(-1, 1), R(-4, 2)), tex: Tex.inkPuff, color: 0x6e665a, size: R(1.5, 3), size2: R(4, 7), life: R(1.2, 2.2), op: R(0.2, 0.45), drag: 0.2 });
      }
    });
    await say('p8', { minDur: 6 });
    await say('p9', { minDur: 4.5 });
    await fade(true, 1.5);
    stormOff();
    run.then(() => {});
    return {
      cols: [['漢王', 'big'], ['劉邦'], ['彭城之敗'], ['五十六萬眾'], ['一朝而潰'], ['漢二年四月']],
      motto: '然楚漢之爭，勝負未定', win: '楚 勝',
    };
  }

  // ======================================================================
  function endCard(info, loserSide, onAgain, onLobby, mine) {
    const el = $('endcard');
    el.innerHTML = '';
    const cols = document.createElement('div'); cols.className = 'cols';
    info.cols.forEach(([t, cls], i) => { const d = document.createElement('div'); d.textContent = t; if (cls) d.className = cls; d.style.animationDelay = (0.3 + i * 0.5) + 's'; cols.appendChild(d); });
    el.appendChild(cols);
    const motto = document.createElement('div');
    motto.textContent = '「' + info.motto + '」';
    Object.assign(motto.style, { fontSize: 'clamp(18px,2.4vw,26px)', letterSpacing: '.3em', color: '#6b6862', opacity: 0, animation: 'inkin 1.2s 2.8s forwards' });
    el.appendChild(motto);
    const win = document.createElement('div'); win.className = 'win'; win.textContent = info.win; el.appendChild(win);
    if (mine) { const mm = document.createElement('div'); mm.className = 'mine'; mm.textContent = mine; el.appendChild(mm); }
    const row = document.createElement('div'); row.className = 'row';
    const b1 = document.createElement('button'); b1.className = 'btn red'; b1.textContent = '再 来 一 局'; b1.onclick = onAgain;
    const b2 = document.createElement('button'); b2.className = 'btn'; b2.textContent = '返 回 大 厅'; b2.onclick = onLobby;
    row.append(b1, b2); el.appendChild(row);
    el.classList.remove('hidden');
  }

  async function play(result, callbacks) {
    if (running) return;
    Voice.preload(Object.keys(Voice.LINES).filter(k => (result.loser === 'b' ? /^w\d/ : /^p\d/).test(k)));
    running = true; skipping = false;
    $('skip').classList.remove('hidden');
    $('skip').textContent = '跳过结算 ▸▸';
    let info;
    try {
      info = result.loser === 'b' ? await wujiang() : await pengcheng();
    } catch (e) { console.error(e); }
    if (!info) info = result.loser === 'b'
      ? { cols: [['西楚霸王', 'big'], ['項籍'], ['自刎烏江']], motto: '無顏見江東父老', win: '漢 勝' }
      : { cols: [['漢王', 'big'], ['劉邦'], ['彭城之敗']], motto: '然楚漢之爭，勝負未定', win: '楚 勝' };
    if (result.reason === 'resign') info.cols.push([(result.loser === 'b' ? '楚' : '漢') + '方認輸']);
    if (result.reason === 'timeout') info.cols.push([(result.loser === 'b' ? '楚' : '漢') + '方超時']);
    finish();
    $('fade').style.transition = 'none'; $('fade').style.opacity = 1;
    endCard(info, result.loser, callbacks.again, callbacks.lobby, callbacks.mine);
    Sfx.Music.stinger(callbacks.persp || 'win');
    requestAnimationFrame(() => { $('fade').style.transition = 'opacity 1s'; $('fade').style.opacity = 0; });
    running = false;
  }
  function finish() {
    Time.skip = false; Time.scale = 1;
    Voice.cancel();
    $('skip').classList.add('hidden');
    $('subs').classList.remove('on');
    $('verse').innerHTML = '';
    document.body.classList.remove('cine');
    while (cleanups.length) { try { cleanups.pop()(); } catch (e) { } }
    restoreMood();
  }
  function skip() {
    if (!running) return;
    skipping = true; Voice.cancel(); Time.skip = true;
  }
  function hideCard() { $('endcard').classList.add('hidden'); }
  return { play, skip, hideCard, get running() { return running; } };
})();
