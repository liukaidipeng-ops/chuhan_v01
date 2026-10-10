// 棋子升级变身特效：四个方案，按时间 t（0~1）逐帧定格出图
//   melt 熔铸：一圈熔金从底往上扫，扫过的地方变成新材质，边上溅火星
//   flip 翻面：棋子跳起来翻个身，落下时已经是新材质，落地一圈尘、一道光
//   shell 剥壳：木壳裂开、碎块飞散，里面露出新棋子，一下闪光
//   beam 光柱：一道光柱从天而降罩住棋子，棋子在光里升起转一圈，光散了换了材质，字面上掠过一道亮光
window.UPFX = (() => {
  const V3 = THREE.Vector3, PI = Math.PI;
  const LV = { 2: { glow: 0xdfe8ff, hot: 0xffffff, name: '银' }, 3: { glow: 0xffc65a, hot: 0xfff0b0, name: '金' }, 4: { glow: 0xd8f5e6, hot: 0xffffff, name: '玉' } };
  let S = null;   // 当前舞台
  const sm = t => t * t * (3 - 2 * t), cl = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const rnd = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  function cloneDeep(obj) {
    const c = obj.clone(true);
    c.traverse(o => { if (o.isMesh || o.isSprite) { o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); } });
    return c;
  }
  function clip(obj, planes) { obj.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { m.clippingPlanes = planes; m.clipShadows = true; m.needsUpdate = true; } }); }
  function opacity(obj, a) { obj.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { m.transparent = true; m.opacity = a; } }); }
  function findPiece(s, t, i = 0) {
    const G = Board.lastGame; let k = 0;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = G.board[r][f]; if (p && p.s === s && p.t === t) { if (k++ === i) return { p, m: Board.pieces.get(p.id), r, f }; } }
  }
  // 摆好：选一枚子，记下旧样子（克隆），把原来那枚换成新等级
  function setup(o = {}) {
    clear();
    const { p, m, r, f } = findPiece(o.s || 'r', o.t || 'p', o.i || 0);
    if (p.__lv0 == null) p.__lv0 = p.lv || 1;
    const lv0 = o.from || (o.lv || 2) - 1, lv1 = o.lv || 2;
    p.lv = lv0; Board.decorate(m, p);
    const old = cloneDeep(m); old.position.copy(m.position); old.quaternion.copy(m.quaternion); m.parent.add(old);
    p.lv = lv1; Board.decorate(m, p);
    const neo = cloneDeep(m); neo.position.copy(m.position); neo.quaternion.copy(m.quaternion); m.parent.add(neo);
    m.visible = false;
    // 脚下血圈不跟着棋子动：从新旧两份里拿掉，单独放一份在地上
    const ringOf = o3 => { let r = null; o3.traverse(x => { if (x.userData && x.userData.hpBar) r = x; }); return r; };
    const ro = ringOf(old); if (ro) ro.parent.remove(ro);
    const rn = ringOf(neo); let ring = null; if (rn) { const wp = new THREE.Vector3(), wq = new THREE.Quaternion(); rn.getWorldPosition(wp); rn.getWorldQuaternion(wq); rn.parent.remove(rn); ring = rn; ring.position.copy(m.parent.worldToLocal(wp)); ring.quaternion.copy(wq); }
    const box = new THREE.Box3().setFromObject(old), y0 = box.min.y, y1 = box.max.y;
    const fx = new THREE.Group(); m.parent.add(fx); if (ring) fx.add(ring);
    S = { p, m, old, neo, y0, y1, fx, lv1, C: LV[Math.min(4, lv1)], base: m.position.clone(), q0: m.quaternion.clone(), kind: o.kind || 'melt', items: {} };
    build(S.kind);
    return { y0, y1, at: [r, f] };
  }
  function clear() {
    if (!S) return;
    for (const x of [S.old, S.neo, S.fx]) x.parent && x.parent.remove(x);
    S.p.lv = S.p.__lv0; delete S.p.__lv0; Board.decorate(S.m, S.p);
    S.m.visible = true; S = null;
  }
  const add = (geo, mat) => { const x = new THREE.Mesh(geo, mat); S.fx.add(x); return x; };
  const glowMat = (c, a = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  function build(kind) {
    const C = S.C, I = S.items, R = 0.46;
    if (kind === 'melt') {
      S.pOld = new THREE.Plane(new V3(0, 1, 0), 0); S.pNew = new THREE.Plane(new V3(0, -1, 0), 0);
      clip(S.old, [S.pOld]); clip(S.neo, [S.pNew]);
      I.ring = add(new THREE.TorusGeometry(R * 0.93, 0.022, 10, 64), glowMat(0xffb040)); I.ring.rotation.x = PI / 2;
      I.ring2 = add(new THREE.TorusGeometry(R * 0.95, 0.05, 10, 64), glowMat(0xff7a1a, 0.5)); I.ring2.rotation.x = PI / 2;
      I.sparks = [...Array(26)].map(() => add(new THREE.BoxGeometry(0.012, 0.012, 0.05), glowMat(0xffd37a)));
    }
    if (kind === 'flip') {
      I.dust = add(new THREE.RingGeometry(0.3, 0.42, 48), new THREE.MeshBasicMaterial({ color: 0xd8c9a8, transparent: true, opacity: 0, depthWrite: false })); I.dust.rotation.x = -PI / 2;
      I.flash = add(new THREE.RingGeometry(0.42, 0.5, 64), glowMat(C.glow, 0)); I.flash.rotation.x = -PI / 2;
    }
    if (kind === 'shell') {
      // 木壳：顶面八块扇形 + 侧面十二块弧片，包在新棋子外面
      const wood = S.old.children[0].material, faceM = S.old.children[1].material;
      I.chunks = []; const Rr = rnd(77);
      const H = S.y1 - S.y0, top = new THREE.Group(); S.fx.add(top);
      for (let k = 0; k < 8; k++) {
        const g = new THREE.CircleGeometry(0.405, 8, k / 8 * PI * 2, PI * 2 / 8); g.rotateX(-PI / 2);
        const mesh = new THREE.Mesh(g, faceM.clone()); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.012, 8, 1, false, k / 8 * PI * 2 + PI / 2, PI * 2 / 8), wood); w.position.y = -0.007; mesh.add(w);
        const piv = new THREE.Group(); piv.add(mesh); S.fx.add(piv); I.chunks.push({ o: piv, a: (k + 0.5) / 8 * PI * 2, top: 1, sp: Rr(), sp2: Rr() });
      }
      for (let k = 0; k < 12; k++) {
        const g = new THREE.CylinderGeometry(0.432, 0.432, H * 0.96, 4, 1, true, k / 12 * PI * 2, PI * 2 / 12);
        const mesh = new THREE.Mesh(g, wood); const piv = new THREE.Group(); piv.add(mesh); S.fx.add(piv); I.chunks.push({ o: piv, a: (k + 0.5) / 12 * PI * 2 + PI / 2, top: 0, sp: Rr(), sp2: Rr() });
      }
      I.cracks = add(new THREE.CircleGeometry(0.4, 40), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false })); I.cracks.rotation.x = -PI / 2;
      I.flash = add(new THREE.SphereGeometry(0.5, 24, 16), glowMat(C.glow, 0));
      S.old.visible = false; S.neo.visible = false;
    }
    if (kind === 'beam') {
      const tex = beamTex();
      I.beam = add(new THREE.CylinderGeometry(0.42, 0.5, 3.2, 48, 1, true), beamMat(C.glow, 0));
      I.core = add(new THREE.CylinderGeometry(0.16, 0.2, 3.2, 32, 1, true), beamMat(C.hot, 0));
      I.pool = add(new THREE.CircleGeometry(0.75, 48), new THREE.MeshBasicMaterial({ map: poolTex(), color: C.glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); I.pool.rotation.x = -PI / 2;
      I.motes = [...Array(30)].map(() => add(new THREE.SphereGeometry(0.012, 6, 4), glowMat(C.hot)));
      I.shine = add(new THREE.PlaneGeometry(0.14, 0.9), glowMat(0xffffff, 0)); I.shine.rotation.x = -PI / 2;
    }
  }

  function beamMat(color, a) {
    return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: a }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 wp = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); vY = uv.y; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 uC; uniform float uA; uniform float uT; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(abs(dot(normalize(vN), vV)), 2.5); float fall = smoothstep(1.0, 0.25, vY) * smoothstep(0.0, 0.04, vY); float st = 0.85 + 0.15 * sin(vY * 40. - uT * 12.); gl_FragColor = vec4(uC * st, f * fall * uA); }' });
  }
  function canvas(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const beamTex = () => canvas(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`; g.fillRect(Math.random() * w, 0, 1 + Math.random() * 3, h); } });
  const poolTex = () => canvas(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const crackTex = () => canvas(256, 256, (g, w) => { const R = rnd(5); g.shadowColor = 'rgba(255,220,140,1)'; g.shadowBlur = 10; g.strokeStyle = 'rgba(255,236,180,.95)'; g.lineWidth = 3; g.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * PI * 2 + (R() - 0.5) * 0.2; let x = w / 2, y = w / 2; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 8; s++) { const aa = a + (R() - 0.5) * 0.5; x += Math.cos(aa) * w / 16; y += Math.sin(aa) * w / 16; g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(255,220,150,.7)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(w / 2, w / 2, 10 + k * 3, 0, 7); } });
  // ---- 第 t 帧 ----
  function set(t) {
    if (!S) return; const I = S.items, C = S.C, b = S.base, H = S.y1 - S.y0;
    const put = (o, x, y, z) => o.position.set(b.x + x, y, b.z + z);
    S.old.position.copy(b); S.neo.position.copy(b); S.old.quaternion.copy(S.q0); S.neo.quaternion.copy(S.q0);
    if (S.kind === 'melt') {
      const k = sm(cl(t, 0.08, 0.82)), h = S.y0 - 0.02 + (H + 0.06) * k;
      S.pOld.constant = -h; S.pNew.constant = h;
      const on = t > 0.06 && t < 0.86 ? 1 : 0, fade = 1 - cl(t, 0.8, 0.9);
      for (const r of [I.ring, I.ring2]) { put(r, 0, h, 0); r.visible = on > 0; r.material.opacity = (r === I.ring ? 1 : 0.5) * fade * (0.8 + 0.2 * Math.sin(t * 60)); r.scale.setScalar(1 + 0.04 * Math.sin(t * 40)); }
      const R = rnd(31);
      I.sparks.forEach((s, i) => { const a = R() * PI * 2, t0 = 0.08 + R() * 0.7, life = 0.12 + R() * 0.08, q = (t - t0) / life; s.visible = q > 0 && q < 1; if (!s.visible) return;
        const hh = S.y0 + (H + 0.06) * sm(cl(t0, 0.08, 0.82)); const v = 0.5 + R() * 0.6, up = 0.4 + R() * 0.6;
        put(s, Math.cos(a) * (0.44 + v * q * 0.35), hh + up * q * 0.25 - 0.4 * q * q * 0.25, Math.sin(a) * (0.44 + v * q * 0.35)); s.lookAt(b.x + Math.cos(a) * 9, hh + up, b.z + Math.sin(a) * 9); s.material.opacity = 1 - q; });
      // 新材质扫完以后整颗亮一下
      const pulse = Math.sin(cl(t, 0.82, 1) * PI); S.neo.traverse(o => { if (o.material && o.material.emissive) for (const m of [].concat(o.material)) { m.emissive = m.emissive || new THREE.Color(); m.emissive.set(C.glow); m.emissiveIntensity = 0.35 * pulse; } });
    }
    if (S.kind === 'flip') {
      const up = cl(t, 0.05, 0.75), y = Math.sin(up * PI) * 0.42, land = cl(t, 0.75, 1);
      const ang = sm(up) * PI, bounce = Math.sin(land * PI * 2) * 0.04 * (1 - land);
      const q = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), ang), q2 = S.q0.clone().premultiply(q);
      // 绕棋子中心翻：旧的翻到一半看不见，新的从背面翻上来（多转 180°，落地时字朝上）
      const ch = H / 2, qa = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), ang), qb = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), ang + PI);
      const pivot = (o, qq) => { o.quaternion.copy(S.q0).premultiply(qq); const off = new V3(0, -ch, 0).applyQuaternion(qq); o.position.set(b.x + off.x, b.y + y + Math.max(0, bounce) + ch + off.y, b.z + off.z); };
      pivot(S.old, qa); pivot(S.neo, qb);
      S.old.visible = ang < PI / 2; S.neo.visible = ang >= PI / 2;
      // 翻到半空时亮一下
      const mid = Math.exp(-Math.pow((ang - PI / 2) / 0.35, 2));
      for (const o of [S.old, S.neo]) o.traverse(x => { if (x.material && x.material.emissive) for (const m of [].concat(x.material)) { m.emissive.set(C.glow); m.emissiveIntensity = 0.6 * mid; } });
      I.dust.material.opacity = land > 0 ? 0.55 * (1 - land) : 0; put(I.dust, 0, b.y + 0.005, 0); I.dust.scale.setScalar(1 + land * 1.4);
      I.flash.material.opacity = land > 0 ? (1 - land) : 0; put(I.flash, 0, b.y + 0.01, 0); I.flash.scale.setScalar(1 + land * 2.2);
    }
    if (S.kind === 'shell') {
      const crack = cl(t, 0.08, 0.32), burst = cl(t, 0.34, 1);
      put(I.cracks, 0, S.y1 + 0.003, 0); I.cracks.material.opacity = burst > 0 ? 0 : crack; I.cracks.quaternion.copy(S.q0).multiply(new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -PI / 2));
      const shake = burst > 0 ? 0 : Math.sin(t * 160) * 0.006 * crack;
      I.chunks.forEach(c => {
        const R = rnd(Math.floor(c.sp * 1e6) + 1), dir = new V3(Math.cos(c.a), 0, Math.sin(c.a));
        const v = c.top ? 0.7 + c.sp * 0.6 : 0.9 + c.sp * 0.8, upv = c.top ? 1.6 + c.sp2 * 1.2 : 0.6 + c.sp2 * 0.8, q = burst * 0.9;
        const x = dir.x * v * q + shake, z = dir.z * v * q, y = (c.top ? S.y1 - 0.002 : S.y0 + H * 0.5) + upv * q - 3.2 * q * q;
        c.o.position.set(b.x + x, Math.max(b.y, y), b.z + z);
        if (!c.top) c.o.position.y -= 0; c.o.rotation.set(q * (3 + c.sp * 5) * (c.sp2 > 0.5 ? 1 : -1), c.top ? 0 : 0, q * (2 + c.sp2 * 4));
        if (!c.top) { c.o.position.set(b.x + x, Math.max(b.y, y - H * 0.5) , b.z + z); c.o.children[0].position.y = H * 0.5; }
        c.o.visible = burst < 0.98; opacity(c.o, 1 - cl(burst, 0.6, 0.98));
      });
      S.neo.visible = burst > 0; const fl = burst > 0 ? Math.exp(-burst * 7) : 0; I.flash.material.opacity = fl * 0.9; put(I.flash, 0, S.y0 + H * 0.5, 0); I.flash.scale.setScalar(0.6 + burst * 1.6);
    }
    if (S.kind === 'beam') {
      const inn = cl(t, 0.02, 0.22), hold = cl(t, 0.22, 0.7), out = cl(t, 0.7, 0.95), a = sm(inn) * (1 - sm(out));
      const drop = 1.6 * (1 - sm(inn)) + 1.6 * sm(out);
      put(I.beam, 0, b.y + 1.6 + drop, 0); put(I.core, 0, b.y + 1.6 + drop, 0); I.beam.material.uniforms.uA.value = 0.45 * a; I.core.material.uniforms.uA.value = 0.6 * a; I.beam.material.uniforms.uT.value = I.core.material.uniforms.uT.value = t * 3;
      put(I.pool, 0, b.y + 0.004, 0); I.pool.material.opacity = 0.55 * a;
      const lift = Math.sin(cl(t, 0.18, 0.8) * PI) * 0.32, spin = sm(cl(t, 0.2, 0.75)) * PI * 2;
      for (const o of [S.old, S.neo]) { o.position.set(b.x, b.y + lift, b.z); o.quaternion.copy(S.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), spin)); }
      const sw = t > 0.47; S.old.visible = !sw; S.neo.visible = sw;
      const bright = Math.exp(-Math.pow((t - 0.47) / 0.07, 2));
      for (const o of [S.old, S.neo]) o.traverse(x => { if (x.material && x.material.emissive) for (const m of [].concat(x.material)) { m.emissive.set(C.hot); m.emissiveIntensity = 0.9 * bright + 0.15 * a; } });
      const R = rnd(9); I.motes.forEach(m => { const ang = R() * PI * 2, r0 = 0.1 + R() * 0.45, sp = 0.6 + R() * 0.8, ph = R(); const yy = ((t * sp + ph) % 1) * 1.4; put(m, Math.cos(ang + t * 4) * r0, b.y + yy, Math.sin(ang + t * 4) * r0); m.material.opacity = a * (1 - yy / 1.4); });
      const sh = cl(t, 0.82, 1); I.shine.visible = sh > 0 && sh < 1; put(I.shine, -0.45 + 0.9 * sh, S.y1 + 0.004, 0); I.shine.material.opacity = Math.sin(sh * PI) * 0.7;
    }
  }
  function cam(o = {}) {
    const b = S.base, d = o.d ?? 1.9, el = o.el ?? 0.55, az = o.az ?? -0.55;
    const pos = new V3(b.x + Math.sin(az) * Math.cos(el) * d, b.y + Math.sin(el) * d, b.z + Math.cos(az) * Math.cos(el) * d);
    Core.Cam.cine = true; return Core.Cam.to(pos, new V3(b.x, b.y + (o.lh ?? 0.18), b.z), 0.05);
  }
  return { setup, set, cam, clear, get S() { return S; } };
})();
