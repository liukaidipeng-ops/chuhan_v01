// 头部细节：皮肤上色、眼球、眉毛、胡须、头发。全部按 MakeHuman 网格上的面部标志点生成，绑在同一副骨架上
const Dress = (() => {
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  // 可复现的随机数
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // 头部局部坐标：以 head 骨头为原点（静止姿势下脸朝 +Z）
  function headFrame(body) { const lm = body.userData.lm; return { H: V(lm['head:head']), lm }; }

  // —— 皮肤：顶点色 ——
  function skin(body, o = {}) {
    const g = body.geometry, P = g.attributes.position, n = P.count, { H } = headFrame(body);
    const base = new THREE.Color(o.tone || '#b98c6c'), lip = new THREE.Color(o.lip || '#9a5a4e'), cheek = new THREE.Color(o.cheek || '#b9705c'), beard = new THREE.Color(o.beard || '#5b4d47'), scalp = new THREE.Color(o.scalp || '#2a221e');
    const col = new Float32Array(n * 3), c = new THREE.Color(), r = rng(7);
    for (let i = 0; i < n; i++) {
      const x = P.getX(i) - H.x, y = P.getY(i) - H.y, z = P.getZ(i) - H.z, ax = Math.abs(x);
      c.copy(base);
      // 身体略深、手脚略红
      const head = y > -0.13 && z > -0.15 && Math.hypot(x, z) < 0.16;
      if (!head) c.multiplyScalar(0.94);
      if (head) {
        // 嘴唇
        const lipW = sstep(0.034, 0.024, ax) * sstep(-0.05, -0.04, y) * sstep(-0.006, -0.015, y) * sstep(0.095, 0.108, z);
        // 面颊和鼻头微红
        const ck = Math.exp(-((ax - 0.045) ** 2 + (y - 0.005) ** 2) / 0.0006) * sstep(0.07, 0.1, z) * 0.35 + Math.exp(-((ax) ** 2 + (y - 0.004) ** 2) / 0.00025) * sstep(0.115, 0.125, z) * 0.25;
        c.lerp(cheek, ck);
        // 胡茬：下巴、两腮、上唇
        if (o.stubble) {
          const jaw = sstep(0.0, -0.012, y) * sstep(-0.115, -0.095, y) * sstep(-0.02, 0.03, z) * (1 - lipW);
          const up = sstep(0.034, 0.02, ax) * sstep(-0.004, -0.008, y) * sstep(-0.018, -0.012, y) * sstep(0.105, 0.112, z);
          c.lerp(beard, clamp((jaw + up) * o.stubble) * (0.85 + 0.15 * r()));
        }
        c.lerp(lip, lipW * 0.75);
        // 头皮（发际线以上）
        if (o.hairline !== false) { const hl = hairline(x, y, z); c.lerp(scalp, sstep(0, 0.006, hl)); }
      }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  // 发际线：>0 在头发里。按绕头顶竖轴的方位角查表（0 = 正前，π = 正后）
  const HL_A = [0, 0.45, 0.85, 1.12, 1.32, 1.78, 2.15, 2.6, Math.PI], HL_Y = [0.114, 0.11, 0.088, 0.064, 0.082, 0.08, 0.02, -0.055, -0.062];
  function hairline(x, y, z) {
    const a = Math.abs(Math.atan2(x, z - 0.01));
    let k = 0; while (k < HL_A.length - 2 && a > HL_A[k + 1]) k++;
    const t = clamp((a - HL_A[k]) / (HL_A[k + 1] - HL_A[k]));
    return y - lerp(HL_Y[k], HL_Y[k + 1], t * t * (3 - 2 * t));
  }
  // —— 表面采样：在 rest 网格上按面积随机取点（只取 test 为真的三角形） ——
  function sampler(body, test) {
    const g = body.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index.array, { H } = headFrame(body);
    const tris = [], cum = []; let tot = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < I.length; t += 3) {
      a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]); c.fromBufferAttribute(P, I[t + 2]);
      const m = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(H);
      if (!test(m.x, m.y, m.z)) continue;
      const ar = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; tot += ar; tris.push(t); cum.push(tot);
    }
    return (r) => {
      const u = r() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; }
      const t = tris[lo]; let s1 = r(), s2 = r(); if (s1 + s2 > 1) { s1 = 1 - s1; s2 = 1 - s2; }
      const ia = I[t], ib = I[t + 1], ic = I[t + 2];
      const p = new THREE.Vector3().fromBufferAttribute(P, ia).multiplyScalar(1 - s1 - s2).add(new THREE.Vector3().fromBufferAttribute(P, ib).multiplyScalar(s1)).add(new THREE.Vector3().fromBufferAttribute(P, ic).multiplyScalar(s2));
      const nn = new THREE.Vector3().fromBufferAttribute(N, ia).multiplyScalar(1 - s1 - s2).add(new THREE.Vector3().fromBufferAttribute(N, ib).multiplyScalar(s1)).add(new THREE.Vector3().fromBufferAttribute(N, ic).multiplyScalar(s2)).normalize();
      return { p, n: nn, l: p.clone().sub(H), v: ia };
    };
  }

  // —— 发丝：细长的带子，绑骨（可按点给权重） ——
  class Strands {
    constructor() { this.pos = []; this.nrm = []; this.col = []; this.si = []; this.sw = []; this.idx = []; }
    add(pts, width, color, skinOf, side) {   // pts: 沿发丝的点；side: 宽度方向
      const base = this.pos.length / 3, nseg = pts.length;
      for (let k = 0; k < nseg; k++) {
        const t = k / (nseg - 1), w = width * (1 - t * 0.85) * 0.5;
        const p = pts[k], s = side;
        const tang = (k < nseg - 1 ? pts[k + 1].clone().sub(p) : p.clone().sub(pts[k - 1])).normalize();
        const nr = s.clone().cross(tang).normalize();
        for (const sg of [-1, 1]) {
          this.pos.push(p.x + s.x * w * sg, p.y + s.y * w * sg, p.z + s.z * w * sg); this.nrm.push(nr.x, nr.y, nr.z);
          const cc = color(t); this.col.push(cc.r, cc.g, cc.b);
          const [i4, w4] = skinOf(p, t); this.si.push(...i4); this.sw.push(...w4);
        }
        if (k < nseg - 1) { const a = base + k * 2; this.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
    }
    mesh(body, mat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
      g.setIndex(this.idx);
      const m = new THREE.SkinnedMesh(g, mat); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
      body.add(m); m.bind(body.skeleton, body.bindMatrix); return m;
    }
  }
  const boneIdx = (body, n) => body.skeleton.bones.indexOf(body.userData.bones[n]);
  // 取身体上最近顶点的权重（用于贴着身体走的东西）
  function skinAtVertex(body, vi) {
    const si = body.geometry.attributes.skinIndex, sw = body.geometry.attributes.skinWeight;
    return [[si.getX(vi), si.getY(vi), si.getZ(vi), si.getW(vi)], [sw.getX(vi), sw.getY(vi), sw.getZ(vi), sw.getW(vi)]];
  }
  function hairMat(o = {}) {
    return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness ?? 0.42, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  }

  // 眉毛
  function brows(body, S, o = {}) {
    const r = rng(o.seed || 11), { lm } = headFrame(body), H = V(lm['head:head']);
    const E = V(lm['eye.L:head']).sub(H);           // 左眼中心（头部局部）
    const yb = E.y + (o.lift ?? 0.021);
    const smp = sampler(body, (x, y, z) => Math.abs(x) > 0.008 && Math.abs(x) < 0.066 && Math.abs(y - (yb + (Math.abs(x) - 0.03) * (o.arch ?? 0.12) - 0.012 * ((Math.abs(x) - 0.035) / 0.03) ** 2)) < (o.thick ?? 0.0065) * (1.1 - Math.abs(Math.abs(x) - 0.03) * 8) && z > 0.06);
    const hb = boneIdx(body, 'head'), col = new THREE.Color(o.color || '#14100e');
    for (let i = 0; i < (o.n || 900); i++) {
      const s = smp(r), sx = Math.sign(s.l.x), ax = Math.abs(s.l.x);
      // 内侧毛往上，外侧往外
      const inner = sstep(0.03, 0.012, ax);
      let d = new THREE.Vector3(sx * (1 - inner * 0.7), inner * 0.8 + 0.12, 0).normalize();
      d = d.sub(s.n.clone().multiplyScalar(d.dot(s.n))).normalize();
      const len = (o.len || 0.009) * (0.6 + r() * 0.6), pts = [];
      for (let k = 0; k < 4; k++) { const t = k / 3; pts.push(s.p.clone().addScaledVector(s.n, 0.0004 + t * 0.0012).addScaledVector(d, len * t).addScaledVector(s.n, -len * 0.25 * t * t)); }
      const side = s.n.clone().cross(d).normalize();
      S.add(pts, o.w || 0.0005, () => col, () => [[hb, 0, 0, 0], [1, 0, 0, 0]], side);
    }
  }
  // 胡须：density 区域函数（头部局部坐标）返回 0..1；len(l) 返回长度
  function beard(body, S, o) {
    const r = rng(o.seed || 23), hb = boneIdx(body, 'head'), jb = boneIdx(body, 'jaw');
    const smp = sampler(body, (x, y, z) => o.region(x, y, z) > 0.02);
    const c0 = new THREE.Color(o.color || '#17110e'), c1 = new THREE.Color(o.tip || o.color || '#2a201a');
    let made = 0, tries = 0;
    while (made < o.n && tries < o.n * 6) {
      tries++;
      const s = smp(r), dens = o.region(s.l.x, s.l.y, s.l.z); if (r() > dens) continue;
      const len = o.len(s.l) * (0.7 + r() * 0.5);
      let d = o.flow(s.l, s.n).normalize();
      const tang = d.clone().sub(s.n.clone().multiplyScalar(d.dot(s.n))).normalize();
      const lift = o.lift ?? 0.25, pts = [], nseg = len > 0.02 ? 6 : 4, curl = (r() - 0.5) * (o.curl ?? 0.3);
      const sideAx = s.n.clone().cross(tang).normalize();
      for (let k = 0; k < nseg; k++) {
        const t = k / (nseg - 1);
        const p = s.p.clone().addScaledVector(s.n, 0.0003 + len * lift * t * (1 - 0.5 * t)).addScaledVector(tang, len * t).addScaledVector(sideAx, curl * len * t * t);
        p.y -= (o.droop ?? 0.3) * len * t * t;
        pts.push(p);
      }
      const jw = o.jawW ? o.jawW(s.l) : 0;
      S.add(pts, o.w || 0.00045, (t) => c0.clone().lerp(c1, t), () => [[hb, jb, 0, 0], [1 - jw, jw, 0, 0]], sideAx);
      made++;
    }
  }

  // 头发：贴头皮的一层（带发丝方向的纹理）+ 沿发际线的发丝 + 发髻
  function strandTex(seed = 5, dark = '#120d0b', light = '#3b2c22') {
    const W = 256, Hh = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const x = cv.getContext('2d'), r = rng(seed);
    x.fillStyle = dark; x.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 1800; i++) { const px = r() * W, w = 0.4 + r() * 1.2; x.strokeStyle = `rgba(${lerp(40, 90, r()) | 0},${lerp(30, 65, r()) | 0},${lerp(24, 50, r()) | 0},${0.25 + r() * 0.5})`; x.lineWidth = w; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + (r() - 0.5) * 6, Hh * 0.33, px + (r() - 0.5) * 6, Hh * 0.66, px + (r() - 0.5) * 8, Hh); x.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  function scalpShell(body, o = {}) {
    // 复制头皮范围的三角形，沿法线外推，UV 按「从发际线流向发髻」的方向排
    const g = body.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index.array, { H } = headFrame(body);
    const bun = (o.bun || new THREE.Vector3(0, 0.15, -0.05));
    const map = new Map(), pos = [], nrm = [], uv = [], si = [], sw = [], idx = [];
    const inHair = (i) => { const x = P.getX(i) - H.x, y = P.getY(i) - H.y, z = P.getZ(i) - H.z; return hairline(x, y, z) > 0.003 && y > -0.075 && Math.hypot(x, z) < 0.15; };
    const hb = boneIdx(body, 'head');
    const get = (i) => {
      if (map.has(i)) return map.get(i);
      const p = new THREE.Vector3().fromBufferAttribute(P, i), nn = new THREE.Vector3().fromBufferAttribute(N, i), l = p.clone().sub(H);
      const x = l.x, y = l.y, z = l.z, hl = hairline(x, y, z);
      const th = (o.thick || 0.006) * sstep(-0.004, 0.012, hl) + 0.0008;
      p.addScaledVector(nn, th);
      // UV：u = 绕发髻的方位角，v = 到发髻的距离
      const d = l.clone().sub(bun); const az = Math.atan2(d.x, d.z + d.y * 0.3);
      const k = pos.length / 3; pos.push(p.x, p.y, p.z); nrm.push(nn.x, nn.y, nn.z); uv.push(az / Math.PI * 3, d.length() * 6);
      si.push(hb, 0, 0, 0); sw.push(1, 0, 0, 0); map.set(i, k); return k;
    };
    for (let t = 0; t < I.length; t += 3) { if (inHair(I[t]) && inHair(I[t + 1]) && inHair(I[t + 2])) idx.push(get(I[t]), get(I[t + 1]), get(I[t + 2])); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); geo.setIndex(idx);
    const tex = strandTex(o.seed || 5, o.dark, o.light);
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0x9a8a80, roughness: 0.7, metalness: 0, envMapIntensity: 0.35 });
    const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.castShadow = m.receiveShadow = true; body.add(m); m.bind(body.skeleton, body.bindMatrix); return m;
  }
  // 头皮拟合成一个椭球（轴对齐，最小二乘），发丝沿椭球面梳向发髻
  function scalpEllipsoid(body) {
    const P = body.geometry.attributes.position, { H } = headFrame(body), M = Array.from({ length: 6 }, () => new Float64Array(6)), b = new Float64Array(6);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) - H.x, y = P.getY(i) - H.y, z = P.getZ(i) - H.z;
      if (hairline(x, y, z) < 0.01 || Math.hypot(x, z) > 0.15 || y < -0.02) continue;
      const r = [x * x, y * y, z * z, x, y, z];
      for (let a = 0; a < 6; a++) { b[a] += r[a]; for (let c = 0; c < 6; c++) M[a][c] += r[a] * r[c]; }
    }
    // 高斯消元
    for (let a = 0; a < 6; a++) { let p = a; for (let r = a + 1; r < 6; r++) if (Math.abs(M[r][a]) > Math.abs(M[p][a])) p = r; [M[a], M[p]] = [M[p], M[a]]; [b[a], b[p]] = [b[p], b[a]];
      for (let r = 0; r < 6; r++) if (r !== a) { const f = M[r][a] / M[a][a]; for (let c = a; c < 6; c++) M[r][c] -= f * M[a][c]; b[r] -= f * b[a]; } }
    const k = b.map((v, a) => v / M[a][a]); const [A, B, C, D, E, F] = k;
    const c = new THREE.Vector3(-D / (2 * A), -E / (2 * B), -F / (2 * C)); const g = 1 + A * c.x * c.x + B * c.y * c.y + C * c.z * c.z;
    return { c, r: new THREE.Vector3(Math.sqrt(g / A), Math.sqrt(g / B), Math.sqrt(g / C)) };
  }
  // 头皮高度表：从头心往各方向看，皮肤表面离头心多远（按方位角、仰角分格，取最大）
  function scalpTable(body, c) {
    const P = body.geometry.attributes.position, { H } = headFrame(body), NA = 96, NE = 48, T = new Float32Array(NA * NE);
    const bin = (d) => { const az = Math.atan2(d.x, d.z), el = Math.asin(clamp(d.y / d.length(), -1, 1)); return [((az / Math.PI + 1) / 2 * NA) % NA, (el / Math.PI + 0.5) * NE]; };
    const v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.set(P.getX(i) - H.x - c.x, P.getY(i) - H.y - c.y, P.getZ(i) - H.z - c.z); const L = v.length(); if (L > 0.16) continue;
      if (v.y + c.y < -0.09) continue;
      const [a, e] = bin(v), ia = Math.floor(a), ie = Math.min(NE - 1, Math.floor(e)); const k = ie * NA + ia; if (L > T[k]) T[k] = L;
    }
    for (let it = 0; it < 6; it++) for (let e = 0; e < NE; e++) for (let a = 0; a < NA; a++) { const k = e * NA + a; if (T[k]) continue; let s = 0, n = 0; for (const [da, de] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ee = e + de; if (ee < 0 || ee >= NE) continue; const kk = ee * NA + (a + da + NA) % NA; if (T[kk]) { s += T[kk]; n++; } } if (n) T[k] = s / n; }
    return (d) => { const [a, e] = bin(d), a0 = Math.floor(a), e0 = clamp(Math.floor(e - 0.5), 0, NE - 2), fa = a - a0, fe = clamp(e - 0.5 - e0); const g = (aa, ee) => T[ee * NA + ((aa % NA) + NA) % NA];
      return lerp(lerp(g(a0, e0), g(a0 + 1, e0), fa), lerp(g(a0, e0 + 1), g(a0 + 1, e0 + 1), fa), fe); };
  }
  function hairStrands(body, S, o = {}) {
    const r = rng(o.seed || 31), hb = boneIdx(body, 'head'), { H } = headFrame(body);
    const c = o.center || new THREE.Vector3(0, 0.05, 0.0), rad = scalpTable(body, c);
    const bun = o.bun || new THREE.Vector3(0, 0.15, -0.05), ub = bun.clone().sub(c).normalize();
    const smp = sampler(body, (x, y, z) => { const h = hairline(x, y, z); return h > (o.edge ?? -0.003) && y > -0.07 && Math.hypot(x, z) < 0.15; });
    const c0 = new THREE.Color(o.color || '#0e0a08'), c1 = new THREE.Color(o.tip || '#24190f');
    for (let i = 0; i < (o.n || 3000); i++) {
      const s = smp(r), u0 = s.l.clone().sub(c).normalize(); if (u0.angleTo(ub) < 0.08) continue;
      const pts = [], NS = 10, jitter = (r() - 0.5) * 0.05, layer = r();
      for (let k = 0; k < NS; k++) {
        const t = k / (NS - 1);
        const u = u0.clone().lerp(ub, t).normalize(); u.x += jitter * Math.sin(t * Math.PI); u.normalize();
        const off = 0.0006 + (o.thick || 0.004) * layer * sstep(0, 0.35, t) + 0.0012 * sstep(0.6, 1, t);
        pts.push(u.clone().multiplyScalar(rad(u) + off).add(c).add(H));
      }
      S.add(pts, o.w || 0.00045, (t) => c0.clone().lerp(c1, 0.25 + 0.5 * layer * t), () => [[hb, 0, 0, 0], [1, 0, 0, 0]], s.n.clone().cross(pts[2].clone().sub(pts[0])).normalize());
    }
  }
  // 发髻：一团绕着发髻中心盘的发丝
  function hairBun(body, S, o = {}) {
    const r = rng(o.seed || 41), hb = boneIdx(body, 'head'), { H } = headFrame(body), c = (o.bun || new THREE.Vector3(0, 0.15, -0.05)).clone().add(H);
    const R0 = o.r || 0.028, c0 = new THREE.Color(o.color || '#0e0a08'), c1 = new THREE.Color(o.tip || '#2a1d14');
    const ax = new THREE.Vector3(0, 1, 0.35).normalize();
    for (let i = 0; i < (o.n || 1500); i++) {
      const pts = [], ph = r() * Math.PI * 2, tilt = (r() - 0.5) * 2.2, turns = 1.2 + r() * 0.8, rr = R0 * (0.75 + r() * 0.3);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.cos(ph), 0, Math.sin(ph)), tilt * 0.6);
      for (let k = 0; k < 14; k++) {
        const t = k / 13, a = ph + t * turns * Math.PI * 2;
        const p = new THREE.Vector3(Math.cos(a) * rr, (t - 0.5) * R0 * 0.5, Math.sin(a) * rr).applyQuaternion(q);
        p.y *= 0.8; pts.push(p.add(c));
      }
      S.add(pts, o.w || 0.0007, (t) => c0.clone().lerp(c1, 0.4 * r()), () => [[hb, 0, 0, 0], [1, 0, 0, 0]], new THREE.Vector3(0, 1, 0).cross(pts[1].clone().sub(pts[0])).normalize());
    }
  }
  // —— 眼球：白、虹膜、瞳孔（单瞳）、角膜高光 ——
  function eyes(body, o = {}) {
    const lm = body.userData.lm, out = [];
    for (const side of ['L', 'R']) {
      const C = V(lm['eye.' + side + ':head']), rad = o.r || 0.0118, bi = boneIdx(body, 'eye.' + side);
      const g = new THREE.SphereGeometry(rad, 48, 32); g.rotateX(Math.PI / 2);   // 极点朝 +Z（正前）
      const P = g.attributes.position, col = new Float32Array(P.count * 3), c = new THREE.Color();
      const iris = new THREE.Color(o.iris || '#4a2e1c'), iris2 = new THREE.Color(o.iris2 || '#7a5232'), white = new THREE.Color('#d9d2c8'), vein = new THREE.Color('#c7a79c');
      const r = rng(side === 'L' ? 3 : 4);
      for (let i = 0; i < P.count; i++) {
        const z = P.getZ(i) / rad, ang = Math.acos(clamp(z, -1, 1)), az = Math.atan2(P.getY(i), P.getX(i));
        const ia = o.irisAng || 0.62, pa = (o.pupil || 0.2);
        if (ang < pa) c.setRGB(0.01, 0.01, 0.01);
        else if (ang < ia) { const t = (ang - pa) / (ia - pa); c.copy(iris2).lerp(iris, t * 0.7 + 0.3 * Math.abs(Math.sin(az * 23 + r() * 2))); if (t > 0.86) c.multiplyScalar(0.35); }
        else c.copy(white).lerp(vein, sstep(1.3, 2.2, ang) * 0.6);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        // 角膜稍微凸起
        if (ang < ia * 1.05) { const k = 1 + 0.06 * Math.cos(ang / (ia * 1.05) * Math.PI / 2); P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k); }
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.translate(C.x, C.y, C.z);
      const n = P.count; g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, k) => k % 4 === 0 ? bi : 0), 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, k) => k % 4 === 0 ? 1 : 0), 4));
      g.computeVertexNormals();
      const m = new THREE.SkinnedMesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2 }));
      m.frustumCulled = false; body.add(m); m.bind(body.skeleton, body.bindMatrix); out.push(m);
    }
    return out;
  }

  return { skin, eyes, brows, beard, scalpShell, hairStrands, hairBun, scalpEllipsoid, scalpTable, Strands, hairMat, sampler, headFrame, boneIdx, skinAtVertex, rng, hairline, sstep, clamp, lerp };
})();
