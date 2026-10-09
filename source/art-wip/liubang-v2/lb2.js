// 刘邦（终局彭城）第二版：照 art-039 精细稿，面数更高、做工更细。041 Ham：「面数可以再高一点，再精致一点，写实一点，出三个版本」
//   LB2.make({ stage: 1, look: 'toon' | 'pbr', head: 'toon' | 外部头 }) → { group, J, setPose, update }
//   衣服（冕服）这一套按关节位置生成：版本一用自己的卡通头和关节；版本二、三换成 MakeHuman 的身体和头，衣服照样套上去
const LB2 = (() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const C = { robe: 0xa3301f, robeD: 0x7e2216, trim: 0x17120f, gold: 0xc9a14a, bixi: 0x6e120d, inner: 0xefe6d2, skin: 0xdcb893, beard: 0x221c18, grey: 0x8a8278,
    crown: 0x15110f, crownRed: 0x8e2418, jade: 0xa9cdb3, jadeD: 0x7fae94, shoe: 0x8e2418, sash: 0xa8281c, ear: 0xd9b24a, pin: 0xe8e2cc, lip: 0x9a4a3c };
  // —— 贴图 ——
  function cv(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 袍料：朱红地上织着更深一点的云纹暗花（远看是一块红，近看有织纹）
  function robeTex(base, dark) {
    const t = cv(512, 512, (g, w, h) => {
      g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
      g.strokeStyle = hex(dark); g.globalAlpha = 0.22; g.lineWidth = 5; g.lineCap = 'round';
      const cloud = (x, y, s) => { g.beginPath(); g.arc(x, y, s, PI * 0.9, PI * 2.2); g.arc(x + s * 1.3, y + s * 0.2, s * 0.7, PI, PI * 2.4); g.stroke(); g.beginPath(); g.moveTo(x - s * 1.2, y + s * 0.9); g.quadraticCurveTo(x, y + s * 1.6, x + s * 2.2, y + s * 0.8); g.stroke(); };
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) cloud(64 + i * 128 + (j % 2) * 64, 48 + j * 128, 22);
      g.globalAlpha = 0.07; g.lineWidth = 1;
      for (let y = 0; y < h; y += 3) { g.strokeStyle = y % 6 ? '#000' : '#fff'; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 3); g.stroke(); }   // 斜纹
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  // 回纹镶边：黑地金纹
  function keyTex() {
    const t = cv(512, 96, (g, w, h) => {
      g.fillStyle = hex(C.trim); g.fillRect(0, 0, w, h);
      g.fillStyle = hex(C.gold); g.fillRect(0, 4, w, 4); g.fillRect(0, h - 8, w, 4);
      g.strokeStyle = hex(C.gold); g.lineWidth = 5; g.lineCap = 'square'; g.lineJoin = 'miter';
      for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x + 8, h - 18); g.lineTo(x + 8, 18); g.lineTo(x + 56, 18); g.lineTo(x + 56, h - 30); g.lineTo(x + 22, h - 30); g.lineTo(x + 22, 32); g.lineTo(x + 42, 32); g.lineTo(x + 42, 46); g.stroke(); }
    });
    t.wrapS = THREE.RepeatWrapping; return t;
  }
  // 蔽膝：深红地，金边，中间黻纹（两弓相背）上面一团火
  const bixiTex = () => cv(256, 512, (g, w, h) => {
    g.fillStyle = hex(C.bixi); g.fillRect(0, 0, w, h);
    g.strokeStyle = hex(C.gold); g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 3; g.strokeRect(32, 32, w - 64, h - 64);
    g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(128, 300); g.bezierCurveTo(70, 240, 140, 200, 112, 140); g.bezierCurveTo(168, 196, 186, 250, 150, 286); g.bezierCurveTo(176, 270, 178, 238, 168, 222); g.bezierCurveTo(206, 290, 160, 322, 128, 300); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 18, 360); g.lineTo(128 + s * 54, 360); g.lineTo(128 + s * 54, 420); g.lineTo(128 + s * 18, 420); g.stroke(); }
  });
  // 鞋：朱红，鞋口黑边
  // —— 几何工具 ——
  function gridGeo(nu, nv, fn, closeU = true) {   // fn(u, v) → [x, y, z]；u 绕一圈（闭合）、v 沿长度
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const p = fn(i / nu, j / nv); pos.push(p[0], p[1], p[2]); uv.push(i / nu, j / nv); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    if (closeU) seamNormals(g, nu, nv);
    return g;
  }
  function seamNormals(g, nu, nv) {   // 闭合处首尾两列的法线取平均，接缝不出折痕
    const N = g.attributes.normal;
    for (let j = 0; j <= nv; j++) { const a = j * (nu + 1), b = a + nu; const n = V(N.getX(a) + N.getX(b), N.getY(a) + N.getY(b), N.getZ(a) + N.getZ(b)).normalize(); N.setXYZ(a, n.x, n.y, n.z); N.setXYZ(b, n.x, n.y, n.z); }
  }
  // 沿曲线、半径可变的管子（胡须、发绺、绳子）
  function taper(pts, r0, r1, seg = 6, steps = 16) {
    const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(steps, false);
    return gridGeo(seg, steps, (u, v) => { const k = Math.round(v * steps), p = curve.getPointAt(v), a = u * TAU, r = r0 + (r1 - r0) * Math.pow(v, 0.8); const n = fr.normals[k], b = fr.binormals[k]; return [p.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r, p.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r, p.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r]; });
  }
  // 闭合的厚带子（衣领、镶边）：pts 是带子中线，nrms 朝外，w 宽，t 厚
  function strip(pts, nrms, w, t, uScale = 1) {
    const pos = [], uv = [], idx = []; let L = 0; const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], nm = nrms[i], tg = pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize(), sd = nm.clone().cross(tg).normalize();
      if (i) L += p.distanceTo(pts[i - 1]);
      const c = [[w / 2, t], [-w / 2, t], [-w / 2, 0], [w / 2, 0]];   // 截面四个角：外面两点、贴肉两点
      for (const [s, h] of c) { const q = p.clone().addScaledVector(sd, s).addScaledVector(nm, h); pos.push(q.x, q.y, q.z); }
      uv.push(L / w * uScale, 0, L / w * uScale, 1, L / w * uScale, 1, L / w * uScale, 0);
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, a2 = a + 4, b2 = b + 4; idx.push(a, a2, b, b, a2, b2); }
    idx.push(0, 1, 2, 0, 2, 3); const e = (n - 1) * 4; idx.push(e, e + 2, e + 1, e, e + 3, e + 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // 圆角的盒子（手掌）
  function roundBox(w, h, d, r, s = 6) {
    const g = new THREE.BoxGeometry(1, 1, 1, s, s, s), P = g.attributes.position, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i) * w, y = P.getY(i) * h, z = P.getZ(i) * d; const cx = clamp(x, -hw, hw), cy = clamp(y, -hh, hh), cz = clamp(z, -hd, hd); const dv = V(x - cx, y - cy, z - cz); if (dv.lengthSq() > 1e-9) dv.setLength(r); P.setXYZ(i, cx + dv.x, cy + dv.y, cz + dv.z); }
    g.computeVertexNormals(); return g;
  }
  const mergeG = list => { const out = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeGeometries(list) : null; if (out) return out; return Models.inkedMerged ? null : null; };

  function make(o = {}) {
    const st = o.stage === 5 ? 5 : 1, look = o.look || 'toon', TOON = look === 'toon';
    const root = new THREE.Group(), J = {};
    // 材质：卡通（游戏同一套）或写实（PBR）
    const M = (color, opt = {}) => {
      if (TOON) return Core.toon(color, { unique: !!(opt.map || opt.side), ...(opt.map ? { map: opt.map } : {}), ...(opt.side ? { side: opt.side } : {}) });
      return new THREE.MeshStandardMaterial({ color, roughness: opt.rough ?? 0.75, metalness: opt.metal ?? 0, ...(opt.map ? { map: opt.map } : {}), ...(opt.side ? { side: opt.side } : {}), ...(opt.normalMap ? { normalMap: opt.normalMap } : {}) });
    };
    const INK = TOON || !!o.ink, IK = o.inkScale ?? 1;
    const put = (parent, geo, mat, th = 0.006) => { let m; if (INK && th > 0) { m = Core.inked(geo, mat, th * (TOON ? 1 : IK)); if (!TOON) m.traverse(c => { if (c.isMesh) c.castShadow = c.receiveShadow = c.material.side !== THREE.BackSide; }); } else { m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; } parent.add(m); return m; };
    const VG = (parts, th = 0.004, rough = 0.6) => { if (TOON) return Models.inkedMerged(parts, th); const geo = Core.merge(parts), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough })); m.castShadow = m.receiveShadow = true; if (!o.ink) return m; const g = new THREE.Group(); g.add(m, new THREE.Mesh(geo, Core.outlineMat(th * IK))); return g; };
    const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
    // —— 关节（比例：身高约 1.78，头约 0.235，七头半）——
    const R = o.rig || { hipsY: 1.0, chest: 0.26, shX: 0.2, shY: 0.19, neck: 0.25, head: 0.07, L1: 0.3, L2: 0.26 };
    const hips = joint('hips', root, 0, R.hipsY, 0), chest = joint('chest', hips, 0, R.chest, 0), neck = joint('neck', chest, 0, R.neck, 0.0), head = joint('head', neck, 0, R.head, R.headZ ?? 0.012);
    const KEY = keyTex();
    const robeMap = robeTex(st === 5 ? 0x8f2a1c : C.robe, st === 5 ? 0x6a1d13 : C.robeD); robeMap.repeat.set(6, 8);
    // 第五阶段：下摆撕开几道口子（V 字），镶边跟着断开
    const NOTCH = st === 5 ? [[0.5, 0.2, 0.13], [-0.95, 0.13, 0.1], [2.5, 0.11, 0.09], [-2.2, 0.08, 0.07]] : [];
    const notch = a => { let h = 0; for (const [a0, hh, w] of NOTCH) { let d = Math.abs(((a - a0 + PI) % TAU + TAU) % TAU - PI); if (d < w) h = Math.max(h, hh * (1 - d / w)); } return h; };
    const weaveN = TOON ? null : cv(256, 256, (g, w, h) => { const im = g.createImageData(w, h), d = im.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, a = Math.sin(x * PI / 4) * (((y >> 2) & 1) ? 1 : -1), b = Math.sin(y * PI / 4) * (((x >> 2) & 1) ? -1 : 1); d[i] = 128 + a * 40; d[i + 1] = 128 + b * 40; d[i + 2] = 255; d[i + 3] = 255; } g.putImageData(im, 0, 0); }, false);
    if (weaveN) { weaveN.wrapS = weaveN.wrapT = THREE.RepeatWrapping; weaveN.repeat.set(60, 80); }
    const robeMat = TOON ? M(0xffffff, { map: robeMap }) : new THREE.MeshPhysicalMaterial({ map: robeMap, color: 0xa89088, roughness: 0.82, sheen: 0.7, sheenColor: new THREE.Color(0.9, 0.45, 0.35), sheenRoughness: 0.45, normalMap: weaveN, normalScale: new THREE.Vector2(0.35, 0.35) }), keyMat = (rep) => { const t = KEY.clone(); t.needsUpdate = true; t.repeat.set(rep, 1); return M(0xffffff, { map: t }); };

    // —— 袍身（上衣下裳连着）：一圈圈椭圆截面，下裳带竖褶，腰带处收、上下起细褶 ——
    const RING = [   // y, rx, rz, cz
      [1.55, 0.062, 0.058, -0.004], [1.515, 0.078, 0.07, 0.0], [1.48, 0.15, 0.1, -0.004], [1.455, 0.215, 0.128, -0.01], [1.42, 0.232, 0.142, -0.008],
      [1.34, 0.218, 0.15, 0.004], [1.24, 0.203, 0.146, 0.006], [1.14, 0.192, 0.14, 0.004], [1.065, 0.186, 0.136, 0.002], [1.0, 0.192, 0.14, 0.002],
      [0.94, 0.208, 0.152, 0.006], [0.82, 0.228, 0.168, 0.012], [0.62, 0.262, 0.192, 0.016], [0.42, 0.298, 0.216, 0.02], [0.22, 0.334, 0.24, 0.024], [0.08, 0.356, 0.258, 0.028], [0.02, 0.362, 0.262, 0.028]];
    const ringAt = y => {   // 按高度插值（Catmull-Rom）
      let i = 0; while (i < RING.length - 2 && RING[i + 1][0] > y) i++;
      const p0 = RING[Math.max(0, i - 1)], p1 = RING[i], p2 = RING[i + 1], p3 = RING[Math.min(RING.length - 1, i + 2)], t = (p1[0] - y) / (p1[0] - p2[0]);
      const cr = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      return [cr(1), cr(2), cr(3)];
    };
    const fold = (a, y) => {
      let k = 0;
      if (y < 0.99) { const A = 0.04 * Math.pow(clamp((0.99 - y) / 0.97), 0.75) + 0.004; k += A * (0.62 * Math.sin(13 * a + 0.8 * Math.sin(3 * a)) + 0.38 * Math.sin(22 * a + 1.7) * (0.6 + 0.4 * Math.sin(5 * a))); }
      if (y > 0.97 && y < 1.08) k += 0.007 * Math.sin(38 * a) * (1 - Math.abs(y - 1.025) / 0.06);   // 腰带上下的细褶
      if (y > 1.07 && y < 1.42) { const f = Math.max(0, Math.cos(a)); k += 0.008 * Math.sin(7 * a + 9 * (y - 1.07)) * f * sstep(1.07, 1.15, y) * (1 - sstep(1.32, 1.42, y)); }   // 胸前斜着的软褶
      return k;
    };
    const robeP = (a, y, off = 0) => { const [rx, rz, cz] = ringAt(y), k = 1 + fold(a, y); return V(Math.sin(a) * (rx * k + off), y, cz + Math.cos(a) * (rz * k + off)); };
    const robeN = (a, y) => { const [rx, rz] = ringAt(y); return V(Math.sin(a) / rx, 0, Math.cos(a) / rz).normalize(); };
    // 领口：前面开成 V 字（外襟在左、里襟在右，中间露出中衣）
    const neckTop = a => { const aa = ((a + PI) % TAU + TAU) % TAU - PI, x = Math.abs(aa); return x >= 1.2 ? 1.55 : 1.55 - (1.55 - 1.405) * Math.pow(1 - x / 1.2, 1.1); };
    const robeGeo = gridGeo(192, 90, (u, v) => { const a = u * TAU, y = Math.max(0.02 + notch(a), Math.min(neckTop(a), 1.55 - v * (1.55 - 0.02))), p = robeP(a, y); return [p.x, p.y, p.z]; });
    put(root, robeGeo, robeMat, 0.007);
    // 中衣：袍子里面一层米白，V 字领口里看得到
    put(root, gridGeo(96, 10, (u, v) => { const a = u * TAU, y = 1.545 - v * 0.2, p = robeP(a, y, -0.006); return [p.x, p.y, p.z]; }), M(C.inner, { rough: 0.85 }), 0.003);
    // 下摆的回纹镶边
    put(root, gridGeo(192, 6, (u, v) => { const a = u * TAU, y = Math.max(0.018 + notch(a) * 1.02, 0.13 - v * 0.112), p = robeP(a, y, 0.0035); return [p.x, p.y, p.z]; }), keyMat(22), 0.005);
    if (st === 5) {   // 下裳溅满泥：一层半透明的泥点盖在袍子外面，越往下越密
      const mud = cv(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const t = Math.pow(rnd(), 0.6), y = h * (1 - t) * 0.98; g.fillStyle = `rgba(${86 + rnd() * 30 | 0},${66 + rnd() * 18 | 0},${44 + rnd() * 10 | 0},${0.35 + 0.5 * t})`; g.beginPath(); g.ellipse(rnd() * w, y, 2 + rnd() * 9 * (0.5 + t), 1 + rnd() * 4, rnd() * 3, 0, TAU); g.fill(); } const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(90,68,44,.55)'); gr.addColorStop(0.18, 'rgba(90,68,44,.15)'); gr.addColorStop(0.5, 'rgba(90,68,44,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      mud.wrapS = THREE.RepeatWrapping; mud.repeat.set(4, 1);
      const mm = TOON ? Core.toon(0xffffff, { unique: true, map: mud }) : new THREE.MeshStandardMaterial({ map: mud, roughness: 0.95 }); mm.transparent = true; mm.depthWrite = false;
      const mg = gridGeo(192, 30, (u, v) => { const a = u * TAU, y = Math.max(0.02 + notch(a) + 0.002, 0.55 - v * 0.53), p = robeP(a, y, 0.004); return [p.x, p.y, p.z]; });
      const mmesh = new THREE.Mesh(mg, mm); mmesh.renderOrder = 2; root.add(mmesh);
    }
    // 大带（黑地，上下金线）+ 两条垂下的绅
    put(root, gridGeo(128, 3, (u, v) => { const y = 1.055 - v * 0.055, p = robeP(u * TAU, y, 0.006); return [p.x, p.y, p.z]; }), M(C.trim), 0.004);
    for (const yy of [1.052, 1.003]) put(root, gridGeo(128, 1, (u, v) => { const y = yy - v * 0.005, p = robeP(u * TAU, y, 0.0095); return [p.x, p.y, p.z]; }), M(C.gold, { metal: 0.6, rough: 0.4 }), 0);
    // 蔽膝：从腰带垂下，顺着下裳往前鼓
    const bxH = 0.56, bx = gridGeo(8, 24, (u, v) => { const y = 1.0 - v * bxH, wd = 0.105 + 0.03 * v, x = (u - 0.5) * 2 * wd; const a = Math.atan2(x, 0.2), p = robeP(a, y, 0.012); return [x, y, Math.max(p.z, robeP(0, y, 0.012).z - 0.004) + 0.006 * Math.sin(v * PI)]; }, false);
    put(root, bx, M(0xffffff, { map: bixiTex(), side: THREE.DoubleSide }), 0.004);
    for (const s of [-1, 1]) {   // 绅（大带垂下来的两头）
      const pts = [], ns = []; for (let i = 0; i <= 12; i++) { const y = 1.0 - i * 0.03, a = s * 0.62; pts.push(robeP(a, y, 0.016)); ns.push(robeN(a, y)); }
      put(root, strip(pts, ns, 0.045, 0.006), M(C.trim), 0.004);
    }
    // 佩玉：珩（上面一块横玉）、两串珠、璜（半环）、冲牙
    {
      const P = [];
      for (const s of [-1, 1]) {
        const a = s * 0.86, top = robeP(a, 0.99, 0.024), x = top.x, z = top.z;
        P.push(Models.P(new THREE.CylinderGeometry(0.0022, 0.0022, 0.44, 5), C.gold, x, 0.77, z));
        P.push(Models.P(new THREE.BoxGeometry(0.075, 0.018, 0.012), C.jade, x, 0.95, z, 0, a, 0));
        for (let k = 0; k < 4; k++) P.push(Models.P(new THREE.SphereGeometry(0.011, 10, 8), k % 2 ? C.gold : C.jadeD, x, 0.9 - k * 0.04, z));
        P.push(Models.P(new THREE.TorusGeometry(0.038, 0.011, 8, 20, PI), C.jade, x, 0.71, z, PI, a, 0));
        P.push(Models.P(new THREE.ConeGeometry(0.012, 0.06, 6), C.jade, x, 0.6, z, PI));
      }
      root.add(VG(P, 0.004, 0.3));
    }
    // 舄（翘头鞋）：鞋头从下摆底下露出来
    for (const s of [-1, 1]) {
      const sh = gridGeo(16, 12, (u, v) => { const a = u * TAU, len = 0.25, z = -0.06 + v * len, w = 0.05 * (1 - 0.35 * Math.pow(v, 3)), h = 0.045 * (1 - 0.3 * v) ; return [s * 0.1 + Math.sin(a) * w, Math.max(0, 0.03 + Math.cos(a) * h * 0.6) + (v > 0.85 ? (v - 0.85) * 0.5 : 0), z]; });
      put(root, sh, M(C.shoe), 0.005);
      const toe = taper([V(s * 0.1, 0.05, 0.17), V(s * 0.1, 0.085, 0.2), V(s * 0.1, 0.1, 0.185)], 0.02, 0.008, 8, 8);
      put(root, toe, M(C.trim), 0.004);
    }

    // —— 交领右衽：外襟的领缘从左肩（+x）斜下到右腋（-x）；脖子后面一圈；里襟露出一小段；白色中衣领贴着领缘里口 ——
    {
      const path = (pts) => { const P = [], N = []; for (const [a, y] of pts) { P.push(robeP(a, y, 0.002)); N.push(robeN(a, y)); } return [P, N]; };
      const lerpPts = (A, B, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; o.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } return o; };
      // 后领：只绕脖子后半圈；两边从肩颈交界往前下方走，前面敞成 V 字，露出脖子和白色中衣领
      const back = []; for (let i = 0; i <= 16; i++) { const a = 1.2 + i / 16 * (TAU - 2.4); back.push([a, 1.532 + 0.01 * Math.max(0, -Math.cos(a))]); }
      const curve = (P0, P1, P2, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]]); } return o; };
      // 外襟（左襟压右襟）：从左肩颈处下来，过胸口斜到右腋下
      const outer = [...curve([1.2, 1.532], [0.55, 1.5], [0.1, 1.4], 10).slice(0, -1), ...lerpPts([0.1, 1.4], [-0.6, 1.285], 12), ...lerpPts([-0.6, 1.285], [-1.05, 1.205], 6).slice(1)];
      const [bp, bn] = path(back); put(root, strip(bp, bn, 0.05, 0.008, 0.5), keyMat(1), 0.004);
      const [op, on] = path(outer); put(root, strip(op, on, 0.056, 0.01, 0.5), keyMat(1), 0.004);
      // 里襟领缘：从右肩颈处下来，钻到外襟底下
      const inner = curve([-1.2, 1.532], [-0.6, 1.5], [-0.12, 1.42], 10);
      const [ip, inn] = path(inner); put(root, strip(ip, inn, 0.05, 0.006, 0.5), keyMat(1), 0.004);
      // 中衣（白）领：贴着两条领缘的里口，在 V 字里露出一窄条
      const offIn = (pts, da, dy) => pts.map(([a, y]) => [a + da, y + dy]);
      const w1 = curve([1.12, 1.545], [0.5, 1.52], [0.06, 1.425], 10), w2 = curve([-1.12, 1.545], [-0.5, 1.52], [-0.06, 1.425], 10);
      const [wp, wn] = path(offIn(w1, -0.06, 0.012)); put(root, strip(wp, wn, 0.022, 0.012), M(C.inner), 0.003);
      const [wp2, wn2] = path(offIn(w2, 0.06, 0.012)); put(root, strip(wp2, wn2, 0.022, 0.012), M(C.inner), 0.003);
    }
    // 肩上日、月（十二章里的两章）：左肩金日，右肩白月
    for (const s of [-1, 1]) {
      const a = s * 0.62, y = 1.415, p = robeP(a, y, 0.004), n = robeN(a, y);
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.03, 28), M(s > 0 ? C.gold : 0xeee8da)); d.position.copy(p); d.lookAt(p.clone().add(n)); root.add(d);
      if (s < 0) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.022, 24), M(C.robe)); c.position.copy(p).addScaledVector(n, 0.001).add(V(0.012, 0.006, 0)); c.lookAt(c.position.clone().add(n)); root.add(c); }
    }

    // 第一阶段：玉圭的底端和两只手的握点（胸口坐标）；左手在下托着圭底，右手在上
    const GUI0 = V(0, -0.15, 0.27), GRIP = { 1: [0, -0.15 + 0.045, 0.27], '-1': [0, -0.15 + 0.1, 0.27] };
    const capX = (r, l, x, y, z, rz = 0) => ({ geo: new THREE.CapsuleGeometry(r, l, 4, 10), color: C.skin, m: Core.M4(x, y, z, 0, 0, PI / 2 + rz) });
    function fist(s) {   // 握着竖直的圭：掌在 s 一侧，四指从前面包过去，拇指压在上面；手腕往外后方接袖口
      const H = [{ geo: roundBox(0.032, 0.088, 0.072, 0.013), color: C.skin, m: Core.M4(s * 0.034, 0, -0.004) }];
      [0.03, 0.01, -0.01, -0.03].forEach((y, k) => H.push(capX(0.0095, 0.044 - (k === 3 ? 0.008 : 0), s * 0.004, y, 0.023)));
      H.push({ geo: new THREE.CapsuleGeometry(0.0105, 0.036, 4, 10), color: C.skin, m: Core.M4(s * 0.012, 0.05, 0.014, 0, 0, s * 0.95) });
      H.push({ geo: new THREE.CylinderGeometry(0.026, 0.028, 0.07, 14), color: C.skin, m: Core.M4(s * 0.07, -0.004, -0.03, 0, 0, PI / 2) });
      return H;
    }
    function openHand(s) {   // 张开的手（挂在腕上，y 朝下是前臂方向）：掌 + 微弯的四指 + 拇指
      const H = [{ geo: roundBox(0.075, 0.085, 0.03, 0.013), color: C.skin, m: Core.M4(0, -0.05, 0.004) }];
      for (let f = 0; f < 4; f++) { const x = (f - 1.5) * 0.018, l = [0.042, 0.048, 0.045, 0.036][f]; H.push({ geo: taper([V(x, -0.088, 0.004), V(x, -0.088 - l * 0.6, 0.01), V(x, -0.088 - l, 0.022)], 0.0092, 0.0078, 8, 8), color: C.skin, m: new THREE.Matrix4() }); }
      H.push({ geo: taper([V(-s * 0.032, -0.03, 0.012), V(-s * 0.048, -0.058, 0.026), V(-s * 0.05, -0.08, 0.036)], 0.0105, 0.008, 8, 8), color: C.skin, m: new THREE.Matrix4() });
      return H;
    }
    // —— 胳膊 + 大袖（袂）——
    const arms = {};
    for (const s of [-1, 1]) {
      const sh = joint('sh' + s, chest, s * R.shX, R.shY, R.shZ ?? -0.01), el = joint('el' + s, sh, 0, -R.L1, 0), wr = joint('wr' + s, el, 0, -R.L2, 0);
      // 上臂的袖子：宽松的管，带几道横褶
      const up = gridGeo(48, 14, (u, v) => { const a = u * TAU, r = (0.074 + 0.022 * v) * (1 + 0.03 * Math.sin(3 * a + v * 9) * Math.sin(v * PI)); return [Math.sin(a) * r, -v * R.L1, Math.cos(a) * r]; });
      put(sh, up, robeMat, 0.007);
      put(sh, new THREE.SphereGeometry(0.076, 32, 20), robeMat, 0.007);
      put(el, new THREE.SphereGeometry(0.096, 32, 20), robeMat, 0.007);
      const torn = st === 5 && s === -1;
      if (torn) {   // 第五阶段右袖撕破：外袍只剩到肘，锯齿口；露出白色中衣的窄袖
        put(el, gridGeo(24, 8, (u, v) => { const a = u * TAU, r = 0.046 - 0.006 * v; return [Math.sin(a) * r, -v * (R.L2 + 0.01), Math.cos(a) * r]; }), M(C.inner), 0.005);
        let sd = 31; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647, jag = []; for (let i = 0; i <= 40; i++) jag.push(i % 2 ? 0.02 + rr() * 0.05 : rr() * 0.02);
        const rag = gridGeo(40, 6, (u, v) => { const a = u * TAU, i = Math.round(u * 40), r = 0.1 + 0.012 * v, L = 0.03 + (0.11 - jag[i]) * v; return [Math.sin(a) * r, 0.02 - L, Math.cos(a) * r]; });
        put(el, rag, M(0xffffff, { map: robeMap, side: THREE.DoubleSide }), 0.006);
      }
      // 袂：挂在肘上的大袋子。bagHolder 在 update 里转：x 顺着前臂、y 朝上，袋子总是往下垂
      const holder = new THREE.Group(); if (!torn) el.add(holder);
      const len = R.L2 + 0.04, DROP = 0.42;
      const sect = (u) => {   // 截面：上面一段圆弧包着前臂，下面垂成一个 U 形
        // 圆袂：袖子最低处在前臂中段，往袖口收上去（袖口比袖身小）
        const shp = u < 0.5 ? 0.3 + 0.7 * Math.pow(Math.sin(PI * u), 0.8) : 1 - 0.55 * sstep(0.5, 1, u);
        const r = 0.096 + 0.008 * u, D = r + DROP * shp, wb = 0.05 - 0.016 * u;
        const P = [];
        for (let i = 0; i <= 8; i++) { const t = i / 8 * PI / 2; P.push([r * Math.cos(t), r * Math.sin(t)]); }        // 上弧（前半）
        for (let i = 1; i <= 10; i++) { const t = i / 10; P.push([-t * (D - wb), r + (wb - r) * t]); }                   // 前面一片往下
        for (let i = 1; i < 12; i++) { const t = i / 12 * PI; P.push([-(D - wb) - Math.sin(t) * wb, Math.cos(t) * wb]); } // 底下圆过去
        for (let i = 0; i <= 10; i++) { const t = 1 - i / 10; P.push([-t * (D - wb), -(r + (wb - r) * t)]); }            // 后面一片往上
        for (let i = 1; i < 8; i++) { const t = PI / 2 - i / 8 * PI / 2; P.push([r * Math.cos(t), -r * Math.sin(t)]); }  // 上弧（后半）
        // 按弧长重采样
        const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
        L.push(L[L.length - 1] + Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]));
        return { P, L, D, r };
      };
      const NU = 96, NV = 26;
      const bag = gridGeo(NU, NV, (u, v) => {
        const S = sect(v), tl = (1 - u) * S.L[S.L.length - 1]; let i = 0; while (i < S.P.length - 1 && S.L[i + 1] < tl) i++;
        const A = S.P[i], B = S.P[(i + 1) % S.P.length], t = (tl - S.L[i]) / ((S.L[i + 1] - S.L[i]) || 1);
        let y = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
        const hang = clamp(-y / S.D);   // 越往下，竖褶越深
        z += 0.012 * Math.sin(u * 46 + v * 2) * hang * hang; y += 0.01 * Math.sin(u * 23) * hang;
        return [v * len, y, z];
      });
      put(holder, bag, robeMat, 0.007);
      // 袖口：一圈回纹镶边顺着袖口的轮廓走；里面是暗的
      const S1 = sect(1), cuffP = [], cuffN = [];
      for (let i = 0; i < S1.P.length; i++) { const [y, z] = S1.P[i]; cuffP.push(V(len - 0.022, y, z)); cuffN.push(V(0, y + S1.D * 0.5, z).normalize()); }
      cuffP.push(cuffP[0].clone()); cuffN.push(cuffN[0].clone());
      const cuff = strip(cuffP.map((p, i) => p.clone().addScaledVector(cuffN[i], 0.002)), cuffN, 0.046, 0.007, 0.5);
      // strip 的宽度方向是 n×t，袖口这一圈 t 在截面里，n×t 正好顺着前臂
      put(holder, cuff, keyMat(1), 0.004);
      const hole = new THREE.Shape(); S1.P.forEach(([y, z], i) => i ? hole.lineTo(z * 0.97, y * 0.97 + S1.D * 0.03) : hole.moveTo(z * 0.97, y * 0.97 + S1.D * 0.03));
      const hm = new THREE.Mesh(new THREE.ShapeGeometry(hole, 4), M(0x6e1a12, { side: THREE.DoubleSide })); hm.position.x = len - 0.004; hm.rotation.y = PI / 2; holder.add(hm);
      // 袖口里露出一截白色中衣袖
      const inn = put(holder, new THREE.CylinderGeometry(0.052, 0.056, 0.07, 24, 1, true), M(C.inner, { side: THREE.DoubleSide }), 0.003); inn.rotation.z = PI / 2; inn.position.set(len - 0.02, 0.008, 0);
      if (!torn) arms[s] = { holder, el };
      // 手
      const hand = new THREE.Group(); J['hand' + s] = hand;
      if (st === 1) { chest.add(hand); hand.position.set(...GRIP[s]); } else { wr.add(hand); if (st === 5 && s === -1) { hand.position.set(0, -0.055, 0.01); J.grip = hand; } }
      if (!o.noHands) hand.add(VG(st === 1 || (st === 5 && s === -1) ? fist(s) : openHand(s), 0.0035, 0.55));
      if (st === 5 && s === -1) {   // 马鞭：竹节鞭杆、几道红缨，鞭梢一截软绳
        const W = [{ geo: new THREE.CylinderGeometry(0.0075, 0.01, 0.66, 8), color: 0x3a2416, m: Core.M4(0, 0.22, 0) }];
        for (let k = 0; k < 6; k++) W.push({ geo: new THREE.TorusGeometry(0.0095, 0.0025, 6, 12), color: 0x6a4a2a, m: Core.M4(0, -0.06 + k * 0.1, 0, PI / 2) });
        for (let k = 0; k < 3; k++) W.push({ geo: new THREE.SphereGeometry(0.016, 10, 8), color: C.sash, m: Core.M4(0, 0.24 + k * 0.12, 0, 0, 0, 0, 1, 0.55, 1) });
        W.push({ geo: taper([V(0, 0.55, 0), V(0.03, 0.66, 0.01), V(0.09, 0.7, 0.02), V(0.15, 0.66, 0.03)], 0.004, 0.0015, 6, 12), color: 0x2a1a10, m: new THREE.Matrix4() });
        hand.add(VG(W, 0.003, 0.6));
      }
    }

    // —— 头 ——
    if (!o.noNeck) neck.add(put(new THREE.Group(), gridGeo(32, 6, (u, v) => { const a = u * TAU, r = 0.046 + 0.01 * v; return [Math.sin(a) * r, 0.1 - v * 0.14, 0.002 + Math.cos(a) * r * 0.95]; }), M(C.skin), 0.005).parent);
    if (o.headBuild) o.headBuild({ head, J, M, put, VG, st, C });
    else toonHead({ head, M, put, VG, st });
    if (st === 1) crown({ head, M, put, VG, top: o.crownY ?? 0.238, scale: o.crownS ?? 1 });

    // —— 手里：玉圭 ——
    if (st === 1) {
      const sp = new THREE.Shape(); sp.moveTo(-0.034, 0); sp.lineTo(0.034, 0); sp.lineTo(0.034, 0.27); sp.lineTo(0, 0.325); sp.lineTo(-0.034, 0.27); sp.lineTo(-0.034, 0);
      const gg = new THREE.ExtrudeGeometry(sp, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }); gg.translate(0, 0, -0.006);
      const gui = put(new THREE.Group(), gg, M(C.jade, { rough: 0.25 }), 0.005).parent;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.29, 0.004), M(0xd8ece0)); ridge.position.set(0, 0.15, 0.012); gui.add(ridge);
      J.gui = gui; chest.add(gui); gui.position.copy(GUI0);
    }

    // —— 姿势：手的目标点 + 肘的朝向（胸口坐标），两节胳膊反解 ——
    const DOWN = V(0, -1, 0);
    function solveArm(s, W, pole) {
      const S = J['sh' + s].position.clone(); const d = W.clone().sub(S); const dist = Math.min(d.length(), R.L1 + R.L2 - 0.001); const dir = d.normalize();
      const a = Math.acos(clamp((R.L1 * R.L1 + dist * dist - R.L2 * R.L2) / (2 * R.L1 * dist), -1, 1));
      const pv = pole.clone().sub(S); const perp = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
      const E = S.clone().add(dir.clone().multiplyScalar(Math.cos(a) * R.L1)).add(perp.clone().multiplyScalar(Math.sin(a) * R.L1));
      const Wp = S.clone().add(dir.clone().multiplyScalar(dist));
      const q1 = new THREE.Quaternion().setFromUnitVectors(DOWN, E.clone().sub(S).normalize());
      const fore = Wp.clone().sub(E).normalize().applyQuaternion(q1.clone().invert());
      return [q1, new THREE.Quaternion().setFromUnitVectors(DOWN, fore)];
    }
    const POSES = {
      gui: { arms: { '-1': [[-0.075, -0.15 + 0.1 - 0.008, 0.235], [-0.42, -0.35, -0.05]], '1': [[0.075, -0.15 + 0.045 - 0.008, 0.235], [0.42, -0.35, -0.05]] }, head: [0.03, 0, 0] },
      stand: { arms: { '-1': [[-0.3, -0.5, 0.08], [-0.6, -0.2, -0.3]], '1': [[0.3, -0.5, 0.08], [0.6, -0.2, -0.3]] } },
      flee: { arms: { '-1': [[-0.36, 0.44, 0.16], [-0.8, 0.05, -0.3]], '1': [[0.3, -0.36, 0.16], [0.75, -0.3, 0.05]] }, chest: [0.05, 0.14, 0], head: [0.02, -0.14, 0.04] },
    };
    const ARM = ['sh-1', 'el-1', 'sh1', 'el1'], BODY = ['chest', 'head', 'neck', 'hips'];
    let qF = {}, qT = {}, eF = {}, eT = {}, t = 1, dur = 0.01;
    function setPose(name, d = 0.4) {
      const P = POSES[name] || POSES.stand; qF = {}; qT = {}; eF = {}; eT = {};
      for (const k of ARM) qF[k] = J[k].quaternion.clone();
      for (const s of [-1, 1]) { const a = P.arms[s]; const [q1, q2] = solveArm(s, V(...a[0]), V(...a[1])); qT['sh' + s] = q1; qT['el' + s] = q2; }
      for (const k of BODY) { eF[k] = J[k].rotation.toArray().slice(0, 3); eT[k] = P[k] || [0, 0, 0]; }
      t = 0; dur = Math.max(0.01, d);
    }
    const tq = new THREE.Quaternion(), tm = new THREE.Matrix4();
    function update(dt) {
      if (t < 1) { t = Math.min(1, t + dt / dur); const e = t * t * (3 - 2 * t); for (const k of ARM) J[k].quaternion.slerpQuaternions(qF[k], qT[k], e); for (const k of BODY) { const a = eF[k], b = eT[k]; J[k].rotation.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e); } }
      root.updateMatrixWorld(true);
      for (const s of [-1, 1]) {
        const A = arms[s]; if (!A) continue; const e0 = V(), w0 = V(); A.el.getWorldPosition(e0); J['wr' + s].getWorldPosition(w0);
        const xa = w0.clone().sub(e0).normalize(), up = V(0, 1, 0), steep = Math.abs(xa.y);
        // 前臂越竖，袖袋越贴着胳膊垂（袋子压扁）；快竖直时袋子朝前外侧，不往背后甩
        let ya = up.clone().sub(xa.clone().multiplyScalar(up.dot(xa)));
        const fb = V(s * 0.4, 0, 0.9); root.localToWorld(fb).sub(root.getWorldPosition(V())); fb.sub(xa.clone().multiplyScalar(fb.dot(xa)));
        ya.lerp(fb.normalize().multiplyScalar(-1), sstep(0.5, 0.9, steep)); if (ya.lengthSq() < 1e-4) ya.set(0, 0, 1); ya.normalize();
        A.holder.scale.y = 1 - 0.68 * sstep(0.45, 0.85, steep);
        tm.makeBasis(xa, ya, xa.clone().cross(ya)); const qw = new THREE.Quaternion().setFromRotationMatrix(tm);
        A.el.getWorldQuaternion(tq); A.holder.quaternion.copy(tq.invert().multiply(qw));
      }
      if (J.grip) { const d = V(-0.35, 0.9, -0.22).normalize(), qw = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d); J.grip.parent.getWorldQuaternion(tq); J.grip.quaternion.copy(tq.invert().multiply(qw)); }
    }
    setPose(st === 1 ? 'gui' : st === 5 ? 'flee' : 'stand', 0.01); update(0.1);
    if (!TOON) root.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    root.userData.kind = 'liubang2';
    return { group: root, J, setPose, update, POSES };
  }

  // —— 版本一的头：球雕出来（下颌、颧骨、眉骨、隆准、唇），五官画在上面；耳朵、发髻、胡须是立体的 ——
  function toonHead({ head, M, put, VG, st }) {
    const SX = 0.082, SY = 0.118, SZ = 0.098, HY = 0.1;
    // 正中线的前后深度（单位球坐标，y 从头顶 1 到下巴底 -1）
    const ZF = [[1.0, 0.0], [0.8, 0.6], [0.6, 0.85], [0.42, 0.96], [0.29, 1.02], [0.17, 0.94], [0.02, 0.95], [-0.28, 0.99], [-0.41, 1.03], [-0.54, 0.99], [-0.64, 0.9], [-0.76, 0.97], [-0.88, 0.74], [-1.0, 0.25]];
    const WF = [[1.0, 0.9], [0.5, 1.0], [0.25, 0.97], [0.0, 1.0], [-0.2, 0.96], [-0.45, 0.86], [-0.65, 0.68], [-0.85, 0.46], [-1.0, 0.3]];
    const tab = (T, y) => { for (let i = 0; i < T.length - 1; i++) if (y <= T[i][0] && y >= T[i + 1][0]) { const t = (T[i][0] - y) / (T[i][0] - T[i + 1][0]), e = t * t * (3 - 2 * t); return T[i][1] + (T[i + 1][1] - T[i][1]) * e; } return T[T.length - 1][1]; };
    const g = new THREE.SphereGeometry(1, 128, 96), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const ax = Math.abs(x), front = sstep(0.15, 0.9, z);
      x *= tab(WF, y) * (y < 0 ? 1 - 0.1 * front : 1);
      if (z > 0) z *= 1 + (tab(ZF, y) - 1) * front * (1 - 0.5 * sstep(0.3, 0.8, ax));
      if (z < 0) { z *= 1.06 + 0.06 * sstep(-0.2, 0.5, y); if (y < -0.3) z *= 1 - 0.25 * sstep(-0.3, -0.9, y); }   // 后脑饱满，脖子后面收
      z -= 0.07 * Math.exp(-(((ax - 0.33) / 0.15) ** 2 + ((y - 0.12) / 0.1) ** 2)) * front;                     // 眼窝
      z += 0.06 * Math.exp(-(((ax - 0.56) / 0.17) ** 2 + ((y + 0.06) / 0.15) ** 2)) * front;                    // 颧骨
      z -= 0.025 * Math.exp(-(((ax - 0.6) / 0.13) ** 2 + ((y + 0.36) / 0.12) ** 2)) * front;                    // 两颊微陷
      z -= 0.018 * Math.exp(-(((ax - 0.2 - (-0.28 - y) * 0.35) / 0.035) ** 2)) * sstep(-0.22, -0.3, y) * (1 - sstep(-0.5, -0.56, y)) * front;   // 法令纹
      if (y < -0.35 && y > -0.85) x *= 1 + 0.05 * Math.exp(-(((y + 0.6) / 0.13) ** 2)) * (1 - front);       // 下颌角
      P.setXYZ(i, x * SX, y * SY, z * SZ);
    }
    g.computeVertexNormals();
    const skinMat = M(0xffffff, { map: faceTex(st), rough: 0.6 });
    put(head, g, skinMat, 0.006).position.y = HY;
    // 鼻子：单做一块贴在脸上——鼻梁从两眼之间起，鼻尖高（隆准），两边鼻翼
    const faceZ = y => tab(ZF, y) * SZ;
    const nose = gridGeo(24, 20, (u, v) => {
      const y = 0.15 - v * 0.44, Y = y * SY, a = (u - 0.5) * PI;   // a: -90°（左）… 90°（右），只做前半圈
      const prof = v < 0.82 ? 0.004 + 0.028 * Math.pow(v / 0.82, 1.15) : 0.032 - 0.05 * Math.pow((v - 0.82) / 0.18, 1.6);
      const w = 0.007 + 0.006 * v * v + 0.011 * sstep(0.7, 0.95, v) * (1 - sstep(0.97, 1, v));
      const zc = faceZ(y) - 0.004, d = Math.max(0.003, prof);
      return [Math.sin(a) * w, Y, zc + Math.cos(a) * d];
    }, false);
    put(head, nose, M(C.skin), 0.0045).position.y = HY;
    { const v = 0.93, y = 0.15 - v * 0.44, prof = 0.032 - 0.05 * Math.pow((v - 0.82) / 0.18, 1.6);
      for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 12, 8), M(0x3a1a12)); n.position.set(s * 0.0068, HY + y * SY - 0.0035, faceZ(y) - 0.004 + prof * 0.75); n.scale.set(1.25, 0.45, 1); head.add(n); } }
    // 耳朵：外轮 + 耳垂，竖在眉和鼻底之间
    for (const s of [-1, 1]) {
      const e = gridGeo(24, 8, (u, v) => { const a = u * TAU, r = 0.019 * (1 - 0.45 * v), y = Math.cos(a) * r * 1.55 + (Math.cos(a) < -0.3 ? -0.004 : 0), z = Math.sin(a) * r; return [s * (0.002 + v * 0.01) * (1 - 0.4 * Math.max(0, Math.sin(a))), y, z]; });
      const em = put(head, e, M(C.skin), 0.004); em.position.set(s * SX * 0.97, HY - 0.004, -0.012); em.rotation.y = s * 0.2;
    }
    // 头发：发壳盖住头顶、后脑到后颈，前面留出额头和发际线、两鬓留到耳前；冠下面一个发髻
    const hairTex = cv(512, 256, (gg, w, h) => { gg.fillStyle = hex(C.beard); gg.fillRect(0, 0, w, h); gg.globalAlpha = 0.55; for (let i = 0; i < 260; i++) { gg.strokeStyle = rnd() < 0.12 ? '#6a6058' : '#0b0907'; gg.lineWidth = 1 + rnd() * 1.5; const x = rnd() * w; gg.beginPath(); gg.moveTo(x, 0); gg.quadraticCurveTo(x + (rnd() - 0.5) * 16, h / 2, x + (rnd() - 0.5) * 8, h); gg.stroke(); } });
    const capG = new THREE.SphereGeometry(1, 96, 64, 0, TAU, 0, PI * 0.78), CP = capG.attributes.position;
    for (let i = 0; i < CP.count; i++) {
      let x = CP.getX(i), y = CP.getY(i), z = CP.getZ(i);
      const front = sstep(0.1, 0.8, z);
      // 发际：前面（z>0）往上收到额头上方；两鬓在耳前垂下；后面到后颈
      const phi = Math.abs(Math.atan2(x, z));   // 0 正前、π/2 两侧、π 正后
      const HL = [[0, 0.56], [0.45, 0.6], [0.85, 0.42], [1.12, 0.3], [1.22, -0.08], [1.32, -0.08], [1.38, 0.3], [1.62, 0.3], [1.85, 0.05], [2.3, -0.42], [PI, -0.62]];
      let line = HL[HL.length - 1][1]; for (let k = 0; k < HL.length - 1; k++) if (phi >= HL[k][0] && phi <= HL[k + 1][0]) { const t = (phi - HL[k][0]) / (HL[k + 1][0] - HL[k][0]); line = HL[k][1] + (HL[k + 1][1] - HL[k][1]) * t * t * (3 - 2 * t); break; }
      const th = 0.0015 + 0.0055 * sstep(line, line + 0.3, y);   // 发际处贴着头皮，越往上越厚
      if (y < line) y = line;
      const ax = Math.abs(x);
      let X = x * tab(WF, y), Z = z;
      if (Z > 0) Z *= 1 + (tab(ZF, Math.max(y, 0.3)) - 1) * front * (1 - 0.5 * sstep(0.3, 0.8, ax));
      else { Z *= 1.06 + 0.06 * sstep(-0.2, 0.5, y); if (y < -0.3) Z *= 1 - 0.25 * sstep(-0.3, -0.9, y); }
      const n = V(X / SX * SX, y, Z).normalize();
      CP.setXYZ(i, X * SX + n.x * th, y * SY + n.y * th, Z * SZ + n.z * th);
    }
    capG.computeVertexNormals();
    put(head, capG, M(0xffffff, { map: hairTex, rough: 0.7 }), 0.004).position.y = HY;
    const bun = put(head, new THREE.SphereGeometry(0.036, 24, 16), M(0xffffff, { map: hairTex }), 0.004); bun.position.set(0, HY + SY * 1.0, -0.01); bun.scale.set(1, 0.85, 1);
    // 胡须：长须一绺绺从下巴垂到胸口（夹几根白）；八字须；两腮短须
    const B = [], R = (a, b) => a + (b - a) * rnd();
    seed = 23;
    for (let k = 0; k < 30; k++) {
      const u = (k / 29) * 2 - 1, x0 = u * 0.04, y0 = HY - SY * 0.66 - (1 - Math.abs(u)) * 0.014, z0 = faceZ(-0.7) - Math.abs(u) * 0.022 - 0.004;
      const len = 0.18 - Math.abs(u) * 0.07 + R(-0.015, 0.015);
      const pts = [V(x0, y0, z0), V(x0 * 1.02, y0 - len * 0.3, z0 + 0.022), V(x0 * 0.78 + R(-0.004, 0.004), y0 - len * 0.68, z0 + 0.018), V(x0 * 0.5, y0 - len, z0 + 0.004)];
      B.push({ geo: taper(pts, R(0.0085, 0.011), 0.0012, 6, 12), color: k % 6 === 2 ? C.grey : C.beard, m: new THREE.Matrix4() });
    }
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) { const z = faceZ(-0.35) + 0.008; const pts = [V(s * 0.005, HY - SY * 0.33 - k * 0.0015, z), V(s * 0.024, HY - SY * 0.37, z - 0.006), V(s * 0.036, HY - SY * 0.47 - k * 0.005, z - 0.016)]; B.push({ geo: taper(pts, 0.0058, 0.0012, 6, 8), color: C.beard, m: new THREE.Matrix4() }); }
      for (let k = 0; k < 5; k++) { const t = k / 4, y = HY - SY * (0.28 + t * 0.4), x = s * SX * (0.93 - t * 0.25), z = 0.02 + t * 0.045; const pts = [V(x, y, z), V(x * 0.97, y - 0.025, z + 0.008), V(x * 0.9, y - 0.05, z + 0.014)]; B.push({ geo: taper(pts, 0.007, 0.0015, 6, 6), color: C.beard, m: new THREE.Matrix4() }); }
    }
    if (st === 5) {
      seed = 57;
      for (const [x0, z0, len, sw] of [[0.075, 0.03, 0.2, 0.02], [0.08, -0.02, 0.26, 0.03], [-0.074, 0.03, 0.18, -0.02], [-0.08, -0.03, 0.24, -0.025], [0.04, -0.08, 0.3, 0.01], [-0.03, -0.085, 0.28, -0.01], [0.0, -0.09, 0.32, 0.0], [0.06, -0.06, 0.22, 0.02]]) {
        const y0 = HY + SY * 0.62, pts = [V(x0 * 0.6, y0 + 0.02, z0 * 0.6), V(x0 * 1.12, y0 - 0.04, z0 * 1.05), V(x0 * 1.2 + sw, y0 - len * 0.55, z0 * 1.1), V(x0 * 1.25 + sw * 2, y0 - len, z0 * 1.12 - 0.01)];
        B.push({ geo: taper(pts, 0.0055, 0.0015, 6, 12), color: C.beard, m: new THREE.Matrix4() });
      }
      B.push({ geo: taper([V(-0.02, HY + SY * 0.75, SZ * 0.55), V(-0.04, HY + SY * 0.45, SZ * 0.95), V(-0.03, HY + SY * 0.15, SZ * 1.02)], 0.004, 0.0012, 6, 10), color: C.beard, m: new THREE.Matrix4() });   // 一绺垂到额前
    }
    head.add(VG(B, 0.0028, 0.7));
  }
  // 脸：画在球的经纬 UV 上
  function faceTex(st) {
    return cv(2048, 1024, (g, w, h) => {
      const sk = hex(C.skin); g.fillStyle = sk; g.fillRect(0, 0, w, h);
      const uv = (x, y, z) => { const L = Math.hypot(x, y, z); x /= L; y /= L; z /= L; let ph = Math.atan2(z, -x); if (ph < 0) ph += TAU; return [ph / TAU * w, Math.acos(clamp(y, -1, 1)) / PI * h]; };
      const P = (x, y) => uv(x, y, Math.sqrt(Math.max(0.05, 1 - x * x - y * y)));
      const path = (pts) => { g.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); };
      const line = (pts, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; path(pts); g.stroke(); };
      const fill = (pts, col) => { g.fillStyle = col; path(pts); g.closePath(); g.fill(); };
      const blob = (x, y, r, col) => { const q = P(x, y), gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); };
      // 底色的明暗：两颊微红、眼窝和下巴（胡茬）发青
      for (const s of [-1, 1]) { blob(s * 0.5, -0.15, 70, 'rgba(190,100,80,.22)'); blob(s * 0.3, 0.12, 50, 'rgba(110,70,60,.18)'); }
      blob(0, -0.55, 150, 'rgba(70,60,55,.18)');
      for (let k = 0; k < 8; k++) { const y = 0.12 - k * 0.045; blob(-0.1 - k * 0.006, y, 26 + k * 2, 'rgba(120,70,50,.16)'); blob(0.1 + k * 0.006, y, 22 + k * 2, 'rgba(120,70,50,.08)'); }
      for (const s of [-1, 1]) {
        // 眉：粗、略上挑，一根根画
        for (let k = 0; k < 26; k++) { const t = k / 25, x = s * (0.12 + t * 0.42), y = st === 5 ? 0.3 - 0.08 * t + 0.02 * Math.sin(t * PI) : 0.24 + 0.045 * Math.sin(t * PI) - 0.02 * t; line([[x, y - 0.025], [x + s * 0.035, y + 0.012]], 4.5, 'rgba(32,26,22,.85)'); }   // 第五阶段眉头往上挑（惊慌）
        // 眼：杏眼，上眼皮厚（双线），黑瞳带高光；眼袋、鱼尾纹
        const ey = 0.085;
        const op = st === 5 ? 1.45 : 1;   // 第五阶段眼睛睁大
        fill([[s * 0.15, ey], [s * 0.24, ey + 0.045 * op], [s * 0.36, ey + 0.05 * op], [s * 0.47, ey + 0.012], [s * 0.36, ey - 0.03 * op], [s * 0.24, ey - 0.032 * op]], '#f2ece0');
        const ir = P(s * 0.3, ey + 0.006); g.fillStyle = '#4a2c18'; g.beginPath(); g.arc(ir[0], ir[1], st === 5 ? 11 : 13, 0, TAU); g.fill();
        g.fillStyle = '#120c08'; g.beginPath(); g.arc(ir[0], ir[1], st === 5 ? 5 : 6.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ir[0] - 4, ir[1] - 5, 3, 0, TAU); g.fill();
        line([[s * 0.13, ey + 0.002], [s * 0.24, ey + 0.05], [s * 0.37, ey + 0.056], [s * 0.49, ey + 0.016]], 6.5, '#15110e');   // 上眼线
        line([[s * 0.17, ey + 0.07], [s * 0.3, ey + 0.095], [s * 0.45, ey + 0.06]], 2.5, 'rgba(90,50,35,.55)');                // 双眼皮
        line([[s * 0.18, ey - 0.035], [s * 0.3, ey - 0.042], [s * 0.42, ey - 0.02]], 2, 'rgba(100,60,40,.4)');                  // 下眼皮
        line([[s * 0.2, ey - 0.08], [s * 0.32, ey - 0.095], [s * 0.42, ey - 0.07]], 2, 'rgba(110,65,45,.3)');                   // 眼袋
        for (let k = 0; k < 2; k++) line([[s * 0.48, ey - 0.01 - k * 0.03], [s * 0.56, ey - 0.03 - k * 0.04]], 2, 'rgba(100,60,40,.35)');   // 鱼尾纹
        line([[s * 0.13, -0.2], [s * 0.2, -0.32], [s * 0.25, -0.44]], 3, 'rgba(110,60,40,.42)');                                // 法令纹
        line([[s * 0.06, -0.16], [s * 0.09, -0.24]], 2.2, 'rgba(120,70,50,.45)');                                                 // 鼻翼
        const no = P(s * 0.06, -0.27); g.fillStyle = 'rgba(70,35,25,.65)'; g.beginPath(); g.ellipse(no[0], no[1], 6, 4, 0, 0, TAU); g.fill();   // 鼻孔
      }
      for (let k = 0; k < 3; k++) line([[-0.2, 0.37 + k * 0.05], [0, 0.38 + k * 0.05], [0.2, 0.37 + k * 0.05]], 2.2, 'rgba(110,60,40,.3)');      // 抬头纹
      line([[-0.03, 0.2], [-0.02, 0.15]], 2, 'rgba(110,60,40,.35)'); line([[0.03, 0.2], [0.02, 0.15]], 2, 'rgba(110,60,40,.35)');                 // 川字
      // 嘴：唇色、唇线
      if (st === 5) {   // 张着嘴：唇、黑的口腔、一排上牙；脸上蹭了泥
        fill([[-0.17, -0.44], [-0.06, -0.405], [0, -0.415], [0.06, -0.405], [0.17, -0.44], [0.1, -0.58], [-0.1, -0.58]], hex(C.lip));
        fill([[-0.13, -0.445], [0, -0.43], [0.13, -0.445], [0.08, -0.55], [-0.08, -0.55]], '#2a0e0a');
        fill([[-0.1, -0.445], [0, -0.433], [0.1, -0.445], [0.09, -0.47], [-0.09, -0.47]], '#ece4d4');
        for (const [x, y, r] of [[0.42, -0.12, 30], [-0.5, 0.02, 22], [0.25, 0.42, 18]]) blob(x, y, r, 'rgba(95,72,48,.45)');
      } else {
        fill([[-0.15, -0.45], [-0.05, -0.415], [0, -0.425], [0.05, -0.415], [0.15, -0.45], [0.06, -0.51], [-0.06, -0.51]], hex(C.lip));
        line([[-0.16, -0.452], [-0.06, -0.465], [0, -0.458], [0.06, -0.465], [0.16, -0.452]], 4, '#3a1a14');
      }
      // 头发：发际线以上、后脑全是发
      g.fillStyle = hex(C.beard); g.fillRect(0, 0, w, h * 0.17);
      g.fillRect(w * 0.5, 0, w * 0.5, h * 0.56); g.fillRect(0, 0, w * 0.07, h * 0.56);
    });
  }
  // —— 冕冠：冠武（黑）、玉笄、前低后高的延板（上玄下朱）、前后十二旒（五彩玉珠）、两侧朱纮垂下系充耳 ——
  function crown({ head, M, put, VG, top, scale }) {
    const cr = new THREE.Group(); cr.position.set(0, top, -0.012); cr.rotation.x = 0.08; cr.scale.setScalar(scale); head.add(cr);
    put(cr, new THREE.CylinderGeometry(0.044, 0.052, 0.07, 32), M(C.crown), 0.004);
    put(cr, new THREE.TorusGeometry(0.052, 0.005, 8, 32), M(C.gold, { metal: 0.6, rough: 0.4 }), 0).rotation.x = PI / 2;
    const pin = put(cr, new THREE.CylinderGeometry(0.0045, 0.0045, 0.27, 10), M(C.pin, { rough: 0.3 }), 0.003); pin.rotation.z = PI / 2; pin.position.y = 0.01;
    const board = put(cr, roundBox(0.5, 0.02, 0.27, 0.006, 4), M(C.crown), 0.005); board.position.y = 0.046;
    const under = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.004, 0.26), M(C.crownRed)); under.position.y = 0.034; cr.add(under);
    const edge = new THREE.Mesh(roundBox(0.505, 0.006, 0.275, 0.003, 2), M(C.gold, { metal: 0.6, rough: 0.4 })); edge.position.y = 0.037; cr.add(edge);
    const cols = [0xb0301f, 0xece6d6, 0x4f8a7a, 0xc9a14a, 0x1d1b1a], B = [];
    for (const zE of [0.132, -0.132]) for (let k = 0; k < 12; k++) {
      const x = -0.22 + k * (0.44 / 11), n = zE > 0 ? 3 : 6;
      B.push(Models.P(new THREE.CylinderGeometry(0.0012, 0.0012, 0.02 + n * 0.017, 4), 0x2a2a2a, x, 0.04 - (0.02 + n * 0.017) / 2, zE));
      for (let j = 0; j < n; j++) B.push(Models.P(new THREE.SphereGeometry(0.0068, 10, 8), cols[(k + j) % 5], x, 0.022 - j * 0.017, zE));
    }
    for (const s of [-1, 1]) { B.push(Models.P(new THREE.CylinderGeometry(0.003, 0.003, 0.19, 6), C.sash, s * 0.118, -0.06, 0.03, 0, 0, s * 0.05)); B.push(Models.P(new THREE.SphereGeometry(0.016, 14, 10), C.ear, s * 0.123, -0.16, 0.03)); }
    cr.add(VG(B, 0.0025, 0.35));
  }
  return { make, C, cv, gridGeo, taper, strip, roundBox };
})();
