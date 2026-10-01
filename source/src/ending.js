// ===== 结算动画：楚败·乌江自刎 / 汉败·彭城之败 =====
const Ending = (() => {
  const { scene, Time, onFrame, ease, Cam, Tex, toon, rnd, camera } = Core;
  // 一键跳过：跳过后，结算场景在下一个等待点直接中止
  const ABORT = new Error('ending-skip');
  const guard = p => { p.catch(() => { }); return p; };
  const sleep = d => guard((async () => { if (skipping) throw ABORT; await Core.sleep(d); if (skipping) throw ABORT; })());
  const tween = (d, fn, e) => guard((async () => { if (skipping) throw ABORT; await Core.tween(d, fn, e); if (skipping) throw ABORT; })());
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
  //  垓下（楚败·序）：夜，四面楚歌
  // ======================================================================
  const PZ = Models.POSES;
  function tentGeo(w, h, len) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); return g;
  }
  function campfire(pos, big = 1) {
    const logs = [];
    for (let i = 0; i < 5; i++) logs.push(Models.P(Models.G.cyl(0.07, 0.07, 1.0, 5), 0x3a2618, 0, 0.12, 0, Math.PI / 2 - 0.25, i * 1.25, 0));
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; logs.push(Models.P(Models.G.sph(0.14, 5), 0x55504a, Math.cos(a) * 0.6, 0.06, Math.sin(a) * 0.6)); }
    const g = add(Models.inkedMerged(logs)); g.position.copy(pos); g.scale.setScalar(big);
    const fl = [];
    for (let i = 0; i < 3; i++) {
      const f = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.spark, color: i ? 0xff7a28 : 0xffc070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })));
      f.position.copy(pos).add(new V3(0, 0.45 * big, 0)); f.userData.ph = R(0, 6); fl.push(f);
    }
    let st = 0;
    track(dt => {
      const t = performance.now() / 1000;
      fl.forEach((f, i) => { const k = 0.75 + 0.25 * Math.sin(t * (11 + i * 3) + f.userData.ph) * Math.sin(t * 6.7 + i); f.scale.set((1.3 - i * 0.3) * big * k, (1.9 - i * 0.4) * big * k, 1); });
      st += dt;
      if (st > 0.08) {
        st = 0;
        Fx.spawn({ pos: pos.clone().add(new V3(R(-0.2, 0.2), 0.5 * big, R(-0.2, 0.2))), vel: new V3(R(-0.3, 0.3), R(1, 2), R(-0.3, 0.3)), tex: Tex.spark, add: true, color: 0xffa050, size: 0.07, size2: 0.02, life: R(1, 2), op: 1, drag: 0.4 });
        if (Math.random() < 0.5) Fx.spawn({ pos: pos.clone().add(new V3(0, 1.1 * big, 0)), vel: new V3(0.2, 0.9, 0), color: 0x262422, size: 0.5, size2: 2.4, life: 4, op: 0.25, drag: 0.2, fadeIn: 0.4 });
      }
    });
    return fl;
  }
  async function gaixia() {
    const O = new V3(2000, 0, 0);
    const mark = cleanups.length;
    mood(0x1a2233, 12, 80, new V3(), 0xa8bce0, 1.25, 0.55);
    sunAt(O, new V3(-12, 18, -10), new V3(0, 0, 0), 16);
    const hemi0 = { sky: Core.hemi.color.clone(), gnd: Core.hemi.groundColor.clone() };
    Core.hemi.color.set(0x7888aa); Core.hemi.groundColor.set(0x3a3028);
    cleanups.push(() => { Core.hemi.color.copy(hemi0.sky); Core.hemi.groundColor.copy(hemi0.gnd); });
    ground(O, 160, 160, 0, '#a4aab4');
    // 月
    const moon = add(new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0xeee6cf, fog: false, transparent: true, opacity: 0.95, depthWrite: false })));
    moon.position.set(O.x + 14, 22, O.z - 62); moon.renderOrder = -9;
    const halo = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.spark, color: 0x8ea0c0, transparent: true, opacity: 0.35, depthWrite: false, fog: false })));
    halo.position.copy(moon.position); halo.scale.set(22, 22, 1); halo.renderOrder = -10;
    // 四面山岗与汉军火把
    const hillMat = i => new THREE.MeshBasicMaterial({ map: Board.mtTex[i % 3], color: 0x07090d, transparent: true, depthWrite: false, fog: false });
    const torchPos = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + R(-0.1, 0.1), rr = R(34, 42);
      const w = R(30, 44), h = w * R(0.28, 0.4);
      const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), hillMat(i)));
      m.position.set(O.x + Math.sin(a) * rr, h / 2 - 1.5, O.z + Math.cos(a) * rr);
      m.lookAt(O.x, h / 2 - 1.5, O.z); m.renderOrder = -6;
      for (let k = 0; k < 70; k++) {
        const u = R(-0.45, 0.45), v = R(0.08, 0.55) * (1 - Math.abs(u) * 1.2);
        const side = new V3(Math.cos(a), 0, -Math.sin(a));
        torchPos.push(m.position.clone().addScaledVector(side, u * w).add(new V3(0, (v - 0.5) * h, 0)).addScaledVector(new V3(-Math.sin(a), 0, -Math.cos(a)), 0.3));
      }
    }
    const tGeo = new THREE.BufferGeometry().setFromPoints(torchPos);
    const tMats = [0, 1].map(() => new THREE.PointsMaterial({ map: Tex.spark, color: 0xffa24a, size: 0.9, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const torches = tMats.map(m => add(new THREE.Points(tGeo, m)));
    torches[1].scale.setScalar(1.0); torches[1].position.y = 0.05;
    track(() => { const t = performance.now() / 1000; tMats[0].opacity = 0.65 + 0.3 * Math.sin(t * 7.3) * Math.sin(t * 3.1); tMats[1].opacity = 0.45 + 0.3 * Math.sin(t * 5.1 + 1); tMats[1].size = 1.6 + 0.4 * Math.sin(t * 4); });
    // 雪
    const NS = Core.quality === 'low' ? 500 : 1400;
    const sPos = new Float32Array(NS * 3);
    for (let i = 0; i < NS; i++) { sPos[i * 3] = R(-16, 16); sPos[i * 3 + 1] = R(0, 12); sPos[i * 3 + 2] = R(-16, 16); }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    const snow = add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xe8ecf4, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false })));
    snow.position.copy(O);
    track(dt => { const t = performance.now() / 1000; for (let i = 0; i < NS; i++) { let y = sPos[i * 3 + 1] - dt * (0.6 + (i % 7) * 0.08); if (y < 0) y += 12; sPos[i * 3 + 1] = y; sPos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.15 + dt * 0.25; if (sPos[i * 3] > 16) sPos[i * 3] -= 32; } sGeo.attributes.position.needsUpdate = true; });
    // 楚营：中军大帐 + 行军帐 + 栅栏
    const C = Models.C;
    const lord = [];
    lord.push(Models.P(Models.G.box(6, 2.6, 4.4), 0x2e2b2c, 0, 1.3, 0), Models.P(Models.G.box(6.1, 0.3, 4.5), 0x7a2418, 0, 2.5, 0), Models.P(new THREE.ConeGeometry(4.4, 2.2, 4), 0x1a1818, 0, 3.8, 0, 0, Math.PI / 4, 0, 1, 1, 0.75), Models.P(Models.G.box(1.8, 2.0, 0.1), 0x0e0d0c, 0, 1.0, 2.22), Models.P(Models.G.box(7, 0.2, 5.4), 0x4a3e30, 0, 0.1, 0.3));
    const lt = add(Models.inkedMerged(lord)); lt.position.set(O.x, 0, O.z - 5.5);
    const doorGlow = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.spark, color: 0xff9a40, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.55, depthWrite: false })));
    doorGlow.position.set(O.x, 1.1, O.z - 3.2); doorGlow.scale.set(3, 3.4, 1);
    const tg = tentGeo(2.4, 1.8, 3);
    [[-7, -3, 0.5], [-8.5, 1.5, 0.2], [7.2, -2.5, -0.4], [8.6, 2.2, -0.2], [-4.5, -9, 0.1], [5, -9.5, 0], [-11, -6, 0.6], [11, -6.5, -0.6]].forEach(([x, z, r]) => {
      const t = add(Models.inkedMerged([Models.P(tg, 0x2a2828, 0, 0, 0), Models.P(Models.G.box(0.3, 0.12, 3.02), 0x6a2016, 0, 1.78, 0)]));
      t.position.set(O.x + x, 0, O.z + z); t.rotation.y = r + Math.PI / 2;
    });
    const stake = [];
    for (let a = 0; a < Math.PI * 2; a += 0.045) { const rr = 14 + Math.sin(a * 5) * 0.4; stake.push(Models.P(Models.G.cyl(0.08, 0.1, 1.9, 5), 0x3a2a1c, Math.cos(a) * rr, 0.95, Math.sin(a) * rr, R(-0.1, 0.1), 0, R(-0.1, 0.1))); }
    const fence = add(Models.inkedMerged(stake)); fence.position.copy(O);
    // 楚旗（残破）
    for (const [x, z] of [[-3.6, -2.4], [3.6, -2.4]]) { const b = Models.makeBanner('b', '楚'); add(b.group); b.group.position.set(O.x + x, 0, O.z + z); b.group.scale.setScalar(1.4); track(dt => b.update(dt)); }
    const bx = Models.makeBanner('b', '項'); add(bx.group); bx.group.position.set(O.x - 1.8, 0, O.z - 3.0); bx.group.scale.setScalar(1.7); track(dt => bx.update(dt));
    // 营火与火光
    const fires = [new V3(O.x - 4.2, 0, O.z + 3.2), new V3(O.x + 4.6, 0, O.z + 2.4), new V3(O.x + 0.6, 0, O.z + 8.5)];
    fires.forEach((p, i) => campfire(p, i === 2 ? 0.8 : 1));
    const brazier = new V3(O.x - 1.25, 0, O.z + 0.4);
    campfire(brazier, 0.5);
    const lights = [brazier, fires[1]].slice(0, Core.quality === 'low' ? 1 : 2).map(p => { const l = add(new THREE.PointLight(0xff8a3a, 3.2, 20, 1.2)); l.position.copy(p).add(new V3(0, 1.2, 0)); return l; });
    track(() => { const t = performance.now() / 1000; lights.forEach((l, i) => { l.intensity = 3.0 + 0.8 * Math.sin(t * 13 + i * 2) * Math.sin(t * 7.1 + i); }); });
    // 围坐的楚兵
    const sitters = new Models.Troop('b', 'spear', 22, 1);
    add(sitters.group);
    sitters.units.forEach((u, i) => {
      const f = fires[i % 3], a = (i / 22) * Math.PI * 2 * 3 + R(-0.2, 0.2), rr = R(1.4, 2.0);
      u.p.set(f.x + Math.cos(a) * rr, 0, f.z + Math.sin(a) * rr); u.yaw = Math.atan2(f.x - u.p.x, f.z - u.p.z);
      u.pose = i % 5 === 4 ? 'idle' : 'mourn';
    });
    track(dt => sitters.update(dt));
    // 项王立于帐前，乌骓在侧
    const xy = Models.makeXiangYu();
    add(xy.group); xy.group.position.set(O.x, 0, O.z - 1.6); xy.group.rotation.y = 0;
    xy.setPose(PZ.xStand); xy.wind = 0.8;
    track(dt => xy.update(dt));
    const horse = Models.makeWuzhui();
    add(horse.group); horse.group.position.set(O.x + 2.6, 0, O.z - 2.2); horse.group.rotation.y = -Math.PI * 0.15;
    track(dt => horse.update(dt));

    // —— 镜头 ——
    Time.scale = 1;
    await fade(true, 1.4);
    document.body.classList.add('cine');
    $('hud').classList.add('hidden');
    shot(O, new V3(0, 11, 30), new V3(0, 2.5, -10));
    Sfx.Music.chuSong(0.6);
    Sfx.wind(0, 12);
    await fade(false, 2.2);
    dolly(O, new V3(0, 7.5, 20), new V3(0, 2, -8), 11);
    await say('w1', { minDur: 5 });
    // 环视山岗火把
    await shot(O, new V3(5, 2.3, 4), new V3(36, 5, -12), 2.2);
    dolly(O, new V3(4.2, 2.3, 6.5), new V3(12, 5, 36), 9);
    Sfx.Music.chuSong(0.2);
    await say('w2', { minDur: 4 });
    // 项王抬头四望
    await shot(O, new V3(1.7, 2.0, 3.3), new V3(0, 1.85, -1.6), 1.6);
    tween(2.4, k => { xy.neck.rotation.y = Math.sin(k * Math.PI * 1.5) * 0.55; xy.neck.rotation.x = -0.15 * Math.sin(k * Math.PI); });
    await say('w3');
    // 垓下歌：绕项王缓缓环行，诗句浮于画面之上
    xy.wind = 1.2;
    const orb = { a: 0.45 };
    const orbOff = track(dt => {
      orb.a -= dt * 0.045; Cam.cine = true;
      const cp = new V3(O.x + Math.sin(orb.a) * 4.8, 2.3, O.z - 1.6 + Math.cos(orb.a) * 4.8);
      const rt = new V3(Math.cos(orb.a), 0, -Math.sin(orb.a)); // 镜头右方
      Cam.pos.lerp(cp, 1 - Math.exp(-dt * 1.5)); Cam.look.lerp(new V3(O.x, 1.75, O.z - 1.6).addScaledVector(rt, 1.1), 1 - Math.exp(-dt * 2));
    });
    $('verse').classList.add('right');
    await verse(['力拔山兮气盖世', '时不利兮骓不逝', '骓不逝兮可奈何', '虞兮虞兮奈若何'], 'w4', true);
    $('verse').classList.remove('right');
    orbOff();
    await fade(true, 1.4);
    // 清理垓下布景
    const mine = cleanups.splice(mark);
    while (mine.length) { try { mine.pop()(); } catch (e) { } }
    restoreMood();
  }

  // ======================================================================
  //  乌江（楚败）
  // ======================================================================
  async function wujiang(noPrologue) {
    if (!noPrologue) await gaixia();
    if (skipping) return null;
    const O = new V3(1000, 0, 0);
    // 布景
    mood(0xe3cfaa, 14, 95, new V3(), 0xffc58a, 2.2, 1.2);
    sunAt(O, new V3(-4, 7, -18), new V3(0, 0, 0));
    ground(O, 120, 40, 18, '#dccaa6');
    ground(O, 120, 30, -27, '#cbb993');
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
    xy.setPose(PZ.xStand);
    track(dt => xy.update(dt));
    const horse = Models.makeWuzhui();
    add(horse.group); horse.group.position.set(O.x + 2.3, 0, O.z + 1.4); horse.group.rotation.y = Math.PI * 0.85;
    track(dt => horse.update(dt));
    const boat = Models.makeBoat({ awning: true });
    add(boat.group); boat.group.scale.setScalar(1.25);
    const boatStop = new V3(O.x - 2.4, 0, O.z - 3.0);
    boat.group.position.set(O.x - 16, 0, O.z - 3.4);
    let bt = 0;
    track(dt => { bt += dt; boat.update && boat.update(dt); boat.group.position.y = Math.sin(bt * 1.4) * 0.04; boat.group.rotation.z = Math.sin(bt * 1.1) * 0.03; if (boat.man.poleArm) boat.man.poleArm.rotation.z = 0.5 + Math.sin(bt * 1.6) * 0.3; });
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
    const M = new THREE.Matrix4();
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
      banners.forEach(b => b.group.position.set(b.bx, 0, Math.max(O.z + 15, O.z + 36 - hanT * 2.2)));
    });

    // —— 乌江 ——
    document.body.classList.add('cine');
    $('hud').classList.add('hidden');
    $('fade').style.opacity = 1;
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
    await shot(O, new V3(-4.6, 2.3, 4.2), new V3(1.0, 1.2, -0.6), 1.2);
    tween(1.2, k => { xy.group.rotation.y = Math.PI + 0.5 - k * 0.9; });
    await say('w12');
    horse.speed = 0.25;
    const h0 = horse.group.position.clone(), h1 = new V3(O.x - 0.6, 0, O.z - 1.6);
    tween(0.8, k => { horse.group.rotation.y = Math.PI * 0.85 + k * 0.4; });
    await tween(3.2, k => horse.group.position.lerpVectors(h0, h1, k), ease.inOut);
    horse.speed = 0;
    Sfx.pluck(147, { vol: 0.3 });
    // 汉军至：项王横刀
    hanOn = true; han.visible = hanO.visible = true; banners.forEach(b => { b.group.visible = true; });
    Sfx.B.hooves(0, 6, 3, 0.3); Sfx.drum(0.5); Sfx.drum(1.2); Sfx.drum(1.9);
    tween(1.6, k => { xy.group.rotation.y = Math.PI - 0.4 + k * (Math.PI + 0.4); });
    await shot(O, new V3(1.4, 2.3, -3.6), new V3(0, 1.8, 12), 1.6);
    await say('w13', { minDur: 4.5 });
    await xy.pose(PZ.xOverhead, 0.6);
    Sfx.B.shout(0, 10, 0.08); Sfx.unit('xiang').impact();
    await xy.pose(PZ.xChop, 0.3, ease.in);
    Cam.shake(0.2);
    await sleep(0.8);
    await xy.pose(PZ.xStand, 0.9);
    // 终：面向大江，拄刀而跪
    tween(1.8, k => { xy.group.rotation.y = Math.PI * 2 + k * Math.PI; });
    await shot(O, new V3(2.2, 1.0, 6.5), new V3(-0.6, 2.4, -10), 2);
    Sfx.Music.chuSong(0);
    await say('w14', { gap: 0.6 });
    xy.wind = 1.8;
    await shot(O, new V3(1.6, 0.55, 3.4), new V3(-0.2, 1.2, -6), 1.2);
    await xy.pose(PZ.xKneel, 2.8, ease.inOut);
    Sfx.B.thud(0, 0.6); Sfx.gong(0.2, 0.8); Fx.P.dust(xy.group.position.clone().add(new V3(0, 0.1, 0)), 10, null, 0.5);
    await sleep(1.6);
    inkWipe('#8e1c10');
    await sleep(1.6);
    await fade(true, 0.6);
    await say('w15', { minDur: 3 });
    return INFO.b;
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
    const hanArmy = new Models.Troop('r', 'spear', NH, 1);
    add(hanArmy.group);
    hanArmy.setPose('idle');
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
          if (u.pose !== 'flee') u.pose = 'flee';
          u.p.z -= h.v * dt; u.p.x += Math.sin(u.yaw) * h.v * 0.3 * dt;
          if (!h.dropped && Math.random() < dt * 0.8) { h.dropped = true; const o = hanArmy.detach(u.i, 'weapon'); if (o) { add(o); Fx.throwObj(o, new V3(R(-1, 1), R(1, 2), R(0.5, 2)), { life: 30, ink: false }); } }
          if (u.p.z < O.z - 4.6) { h.fell = true; Fx.P.splash(u.p.clone().setY(0.05), 8, 1.4); if (Math.random() < 0.2) Sfx.splash(); }
        } else {
          h.sink += dt; u.p.z -= 0.6 * dt; u.p.y = -Math.min(1.6, h.sink * 0.9); if (u.pose !== 'cower') u.pose = 'cower';
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
    if (ch.crew && ch.crew[1]) ch.crew[1].visible = false;
    lb.setPose(PZ.lStand);
    lb.group.position.set(-0.3, 1.05, -0.35); lb.group.rotation.y = Math.PI / 2; lb.group.scale.setScalar(0.95);
    (ch.cab || ch.group).add(lb.group);
    track(dt => lb.update(dt));
    add(ch.group);
    ch.group.position.set(O.x - 26, 0, O.z - 1.5);
    track(dt => ch.update(dt));

    // —— 序：五十六万众入彭城，置酒高会 ——
    Time.scale = 1;
    await fade(true, 1.4);
    document.body.classList.add('cine');
    $('hud').classList.add('hidden');
    shot(O, new V3(-9, 6.5, -7), new V3(6, 2, 40));
    await fade(false, 1.8);
    Sfx.guqin(0.2);
    dolly(O, new V3(-4, 4.6, -1), new V3(6, 2.2, 44), 10);
    await say('p1', { minDur: 5 });
    hanArmy.setPose('wave');
    Sfx.cheer(0, 0.7); Sfx.B.gong(0.4, 0.5);
    await shot(O, new V3(7, 2.3, 1.5), new V3(-2, 1.3, 11), 1.4);
    dolly(O, new V3(5.5, 2.1, 3.5), new V3(-3, 1.3, 13), 6);
    await say('p2', { minDur: 3 });
    // 平原远景
    await fade(true, 0.7);
    hanArmy.setPose('idle');
    shot(O, new V3(-14, 7.5, 26), new V3(4, 1.5, 34));
    await fade(false, 1.0);
    dolly(O, new V3(-9, 6, 22), new V3(4, 1.5, 36), 7);
    await say('p3', { minDur: 4.5 });
    // 铁骑冲锋
    chuT = 0; chu.visible = chuO.visible = true; chuBanners.forEach(b => { b.group.visible = true; });
    Sfx.B.hooves(0, 9, 4, 0.3, 0.3); Sfx.B.wheels(0, 8, 0.4); Sfx.Music.warDrums(0, 5); Sfx.B.shout(0.5, 16, 0.08, 1); Sfx.B.horn(0, 2.5, 98, 0.22);
    await shot(O, new V3(31, 2.2, 24), new V3(2, 1.6, 38), 1.6);
    dolly(O, new V3(29, 1.8, 17), new V3(0, 1.4, 26), 4.5);
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
    tween(0.6, k => { lb.group.rotation.y = Math.PI / 2 + 1.6 * (1 - k); });
    await lb.pose({ ...PZ.lStand, sRx: -1.6, sRz: -0.3, eR: -0.2 }, 0.6);
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
    return INFO.r;
  }

  // ======================================================================
  function endCard(info, loserSide, onAgain, onLobby, mine, againText) {
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
    const b1 = document.createElement('button'); b1.className = 'btn red'; b1.textContent = againText || '再 来 一 局'; b1.onclick = onAgain;
    const b2 = document.createElement('button'); b2.className = 'btn'; b2.textContent = '返 回 大 厅'; b2.onclick = onLobby;
    row.append(b1, b2); el.appendChild(row);
    el.classList.remove('hidden');
  }

  const INFO = {
    b: { cols: [['西楚霸王', 'big'], ['項籍'], ['自刎烏江'], ['時年三十一'], ['漢五年十二月']], motto: '無顏見江東父老', win: '漢 勝' },
    r: { cols: [['漢王', 'big'], ['劉邦'], ['彭城之敗'], ['五十六萬眾'], ['一朝而潰'], ['漢二年四月']], motto: '然楚漢之爭，勝負未定', win: '楚 勝' },
  };
  let skipNow = null;
  async function play(result, callbacks) {
    if (running) return;
    running = true; skipping = !!callbacks.instant;
    const base = INFO[result.loser === 'b' ? 'b' : 'r'];
    let info = null;
    if (!skipping) {
      Voice.preload(Object.keys(Voice.LINES).filter(k => (result.loser === 'b' ? /^w\d/ : /^p\d/).test(k)));
      $('skip').classList.remove('hidden');
      $('skip').textContent = '跳过结算 ▸▸';
      const skipP = new Promise(r => { skipNow = r; });
      const sceneP = (result.loser === 'b' ? wujiang(callbacks.noPrologue) : pengcheng()).catch(e => { if (e !== ABORT) console.error(e); return null; });
      const first = await Promise.race([sceneP, skipP.then(() => 'skip')]);
      if (first === 'skip') {
        // 立刻出结算卡，场景在卡片背后收尾清理
        showCard(base, result, callbacks, true);
        await sceneP;
        finish(); skipNow = null; running = false;
        return;
      }
      info = first;
    }
    finish(); skipNow = null;
    showCard(info || base, result, callbacks, false);
    running = false;
  }
  function showCard(info, result, callbacks, instant) {
    info = { ...info, cols: info.cols.slice() };
    if (result.reason === 'resign') info.cols.push([(result.loser === 'b' ? '楚' : '漢') + '方認輸']);
    if (result.reason === 'timeout') info.cols.push([(result.loser === 'b' ? '楚' : '漢') + '方超時']);
    $('skip').classList.add('hidden');
    $('fade').style.transition = 'none'; $('fade').style.opacity = 1;
    endCard(info, result.loser, callbacks.again, callbacks.lobby, callbacks.mine, callbacks.againText);
    Sfx.Music.stinger(callbacks.persp || 'win');
    requestAnimationFrame(() => { $('fade').style.transition = 'opacity 1s'; $('fade').style.opacity = 0; });
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
    Cam.moveId = (Cam.moveId || 0) + 1; // 作废尚未走完的结算镜头
  }
  function skip() {
    if (!running) return;
    skipping = true; Voice.cancel(); Time.skip = true;
    if (skipNow) skipNow();
  }
  function hideCard() { $('endcard').classList.add('hidden'); }
  return { play, skip, hideCard, get running() { return running; } };
})();
