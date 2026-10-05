// ===== 汉相·文臣虎骑（精修）：放样曲面的白虎 + 细化的文臣、节杖、鞍具 =====
// 模型本体是定稿的「精修一·持节潜行」（makeProwl）。游戏里这样用：
//   · 每种款式（普通 / 四级金装）只造一次原型，之后每次出场都是克隆（共用几何体和贴图，不重新放样、不重画贴图）
//   · 定稿的模型约 8 万个三角面（加描边 16 万），棋盘上放不起：分段数跟着画质档降（高 0.6、中 0.42，面数约为原来的三分之一、五分之一），
//     低画质档不用这个文件，退回 models.js 里的简版
//   · rig()：行走（按 speed 摆四条腿）、扑击、咆哮、倒地
const TigerHD = (() => {
  const { P, G, inkedMerged, SIDE, C } = Models;
  const { toon, inked, canvasTex } = Core;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI, ZAX = V(0, 0, 1);
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const R = (a, b) => a + (b - a) * rnd();
  const gauss = x => Math.exp(-x * x);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const INKC = '#1f1d1c', FUR = '#ece6d6', FUR2 = '#f6f1e6';
  let LQ = 1;   // 分段数的比例（画质档）：放样曲面和球、锥、柱、环都跟着它降
  const seg = (n, min) => Math.max(min, Math.round(n * LQ));
  class SphG extends THREE.SphereGeometry { constructor(r, w = 32, h = 16, ...a) { super(r, seg(w, 6), seg(h, 4), ...a); } }
  class ConG extends THREE.ConeGeometry { constructor(r, h, rs = 32, hs = 1, ...a) { super(r, h, seg(rs, 5), hs > 1 ? seg(hs, 1) : hs, ...a); } }
  class CylG extends THREE.CylinderGeometry { constructor(rt, rb, h, rs = 32, ...a) { super(rt, rb, h, seg(rs, 5), ...a); } }
  class TorG extends THREE.TorusGeometry { constructor(R, t, rs = 12, ts = 48, ...a) { super(R, t, seg(rs, 4), seg(ts, 8), ...a); } }

  // ---------- 放样：沿一条脊线排一串截面（上/下/宽 可不等），样条插值成光滑曲面 ----------
  // rings: [x, y, z, 上, 下, 宽, 方度]；u 绕截面一圈（0 在下、0.5 在上），t 沿脊线
  const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  function loft(rings, o = {}) {
    const L = Math.max(6, Math.round((o.len || 40) * LQ)), Rn = Math.max(8, Math.round((o.rad || 28) * LQ)), n = rings.length;
    const curve = new THREE.CatmullRomCurve3(rings.map(r => V(r[0], r[1], r[2])), false, 'catmullrom', 0.5);
    const sc = (k, t) => { const f = t * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i, g = j => { const r = rings[Math.max(0, Math.min(n - 1, j))]; return r[k] == null ? 2 : r[k]; }; return Math.max(k === 6 ? 1.6 : 0.002, cr(g(i - 1), g(i), g(i + 1), g(i + 2), u)); };
    const side = o.side || ZAX;
    function at(u, t) {
      const c = curve.getPoint(t), T = curve.getTangent(t).normalize();
      const N = new THREE.Vector3().crossVectors(side, T).normalize(), B = new THREE.Vector3().crossVectors(T, N);
      const ph = u * 2 * PI, cs = -Math.cos(ph), sn = Math.sin(ph), e = 2 / sc(6, t);
      const k = 1 + (o.mod ? o.mod(u, t, c) : 0);
      const yy = Math.sign(cs) * Math.pow(Math.abs(cs), e) * (cs > 0 ? sc(3, t) : sc(4, t)) * k, zz = Math.sign(sn) * Math.pow(Math.abs(sn), e) * sc(5, t) * k;
      return { p: c.clone().addScaledVector(N, yy).addScaledVector(B, zz), c };
    }
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= L; i++) for (let j = 0; j <= Rn; j++) { const q = at(j / Rn, i / L).p; pos.push(q.x, q.y, q.z); uv.push(j / Rn, i / L); }
    for (let i = 0; i < L; i++) for (let j = 0; j < Rn; j++) { const a = i * (Rn + 1) + j, b = a + Rn + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    geo.computeVertexNormals();
    const nm = geo.attributes.normal; // 接缝两侧法线取平均，免得肚皮上出一道折痕
    for (let i = 0; i <= L; i++) { const a = i * (Rn + 1), b = a + Rn; const x = nm.getX(a) + nm.getX(b), y = nm.getY(a) + nm.getY(b), z = nm.getZ(a) + nm.getZ(b), l = Math.hypot(x, y, z) || 1; nm.setXYZ(a, x / l, y / l, z / l); nm.setXYZ(b, x / l, y / l, z / l); }
    geo.userData.at = at;
    return geo;
  }
  // 给放样体上一个纯色（顶点色），好并进 inkedMerged
  const LP = (rings, color, o) => P(loft(rings, o), color);

  // ---------- 贴图：用画布写虎纹，墨笔式的收锋 ----------
  function brush(g, pts, w0, w1, col = INKC) { // pts 为画布坐标；宽度从 w0 收到 w1
    const n = pts.length, Lf = [], Rt = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const k = i / (n - 1), w = (w0 + (w1 - w0) * Math.pow(k, 2)) * (0.88 + 0.24 * rnd()) / 2;
      Lf.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rt.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    g.fillStyle = col; g.beginPath(); g.moveTo(Lf[0][0], Lf[0][1]);
    for (const q of Lf) g.lineTo(q[0], q[1]); for (const q of Rt.reverse()) g.lineTo(q[0], q[1]); g.closePath(); g.fill();
  }
  const skin = (w, h, paint) => { const t = canvasTex(w, h, g => { g.fillStyle = FUR; g.fillRect(0, 0, w, h); paint(g, (u, v) => [u * w, (1 - v) * h]); }); return toon(0xffffff, { map: t, unique: true }); };
  const arc = (X, u0, v0, du, dv, bend, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return X(u0 + du * k, v0 + dv * k + bend * k * k); });

  function torsoMat() {
    return skin(1024, 1024, (g, X) => {
      const gr = g.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, FUR2); gr.addColorStop(0.14, FUR); gr.addColorStop(0.86, FUR); gr.addColorStop(1, FUR2); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
      for (let v = 0.07; v < 0.95; v += R(0.052, 0.07)) {
        for (const s of [1, -1]) {
          const len = R(0.24, 0.34), lean = R(-0.05, -0.015), w = R(52, 80);
          brush(g, arc(X, 0.5 - s * 0.012, v + R(-0.006, 0.006), s * len, lean, R(-0.03, 0.01)), w, 1.5);
          if (rnd() < 0.45) brush(g, arc(X, 0.5 + s * len * 0.45, v + lean * 0.45 + 0.012, s * len * 0.5, 0.035, 0.01, 8), w * 0.6, 1); // 分叉
          if (rnd() < 0.6) { const vv = v + R(0.025, 0.045); brush(g, arc(X, 0.5 + s * R(0.33, 0.37), vv, -s * R(0.1, 0.17), R(-0.02, 0.02), 0.01, 8), R(28, 40), 1); } // 腹侧往上挑的短纹
        }
      }
    });
  }
  function legMat() {
    return skin(256, 512, (g, X) => {
      for (let v = 0.2; v < 0.97; v += R(0.13, 0.17)) {
        const a = R(0.08, 0.2), b = R(0.8, 0.94), m = R(0.4, 0.6);
        brush(g, arc(X, m, v, a - m, R(-0.02, 0.02), 0, 8), R(26, 36), 3); brush(g, arc(X, m, v, b - m, R(-0.02, 0.02), 0, 8), R(26, 36), 3);
      }
    });
  }
  function tailMat() {
    return skin(128, 512, (g, X) => {
      for (let v = 0.08; v < 0.86; v += R(0.085, 0.11)) { g.fillStyle = INKC; const [, y] = X(0, v), h = R(16, 24); g.fillRect(0, y - h / 2, 128, h); }
      g.fillStyle = INKC; g.fillRect(0, 0, 128, 512 * 0.1);
    });
  }
  function neckMat() {
    return skin(512, 256, (g, X) => {
      for (const v of [0.2, 0.48, 0.74]) for (const s of [1, -1]) brush(g, arc(X, 0.5 - s * 0.01, v, s * R(0.24, 0.3), R(-0.06, 0.02), 0, 10), R(26, 36), 2);
    });
  }
  // 头：v 从后脑到鼻尖，u=0.5 是头顶正中
  const EYE = { u: 0.105, v: 0.6 };
  function headMat() {
    return skin(1024, 1024, (g, X) => {
      // 头顶到后脑的横纹
      for (const v of [0.1, 0.19, 0.27]) for (const s of [1, -1]) brush(g, arc(X, 0.5 - s * 0.008, v, s * R(0.11, 0.15), R(0.0, 0.03), 0.01, 10), R(22, 30), 2);
      // 额上「王」字
      for (const v of [0.365, 0.43, 0.495]) { const d = v === 0.43 ? 0.04 : 0.05; brush(g, [X(0.5 - d, v), X(0.5 - d * 0.5, v + 0.003), X(0.5, v), X(0.5 + d * 0.5, v + 0.003), X(0.5 + d, v)], 30, 30); }
      brush(g, [X(0.5, 0.35), X(0.5, 0.43), X(0.5, 0.51)], 15, 15);
      for (const s of [1, -1]) {
        // 眉上斜纹、眼圈、眼尾
        brush(g, arc(X, 0.5 + s * 0.045, 0.56, s * 0.075, -0.045, 0.01, 8), 20, 3);
        const [ex, ey] = X(0.5 + s * EYE.u, EYE.v); g.fillStyle = INKC; g.beginPath(); g.ellipse(ex, ey, 46, 34, 0, 0, 7); g.fill();
        brush(g, arc(X, 0.5 + s * (EYE.u + 0.03), EYE.v - 0.01, s * 0.07, -0.06, 0.0, 8), 18, 2);
        // 颊上三道往后扫的纹
        for (const [u0, v0, du, dv] of [[0.16, 0.5, 0.1, -0.13], [0.18, 0.42, 0.11, -0.1], [0.2, 0.34, 0.1, -0.07]]) brush(g, arc(X, 0.5 + s * u0, v0, s * du, dv, -0.02, 10), R(18, 24), 2);
        // 须根的墨点、嘴线
        for (let i = 0; i < 9; i++) { const [dx, dy] = X(0.5 + s * (0.1 + (i % 3) * 0.035), 0.8 + Math.floor(i / 3) * 0.045); g.beginPath(); g.arc(dx, dy, 5, 0, 7); g.fill(); }
        brush(g, arc(X, 0.5 + s * 0.3, 0.6, s * -0.01, 0.37, 0, 10), 9, 9);
      }
      // 鼻梁到鼻头
      const [nx, ny] = X(0.5, 0.965); g.fillStyle = '#8a4a40'; g.beginPath(); g.ellipse(nx, ny, 62, 40, 0, 0, 7); g.fill();
    });
  }

  const TAIL = {
    low: [V(0, 0, 0), V(-0.4, -0.25, 0), V(-0.85, -0.32, 0.06), V(-1.18, -0.05, 0.1), V(-1.25, 0.35, 0.1), V(-1.08, 0.66, 0.05)],
    high: [V(0, 0, 0), V(-0.42, -0.1, 0), V(-0.8, 0.15, -0.05), V(-0.95, 0.6, -0.1), V(-0.8, 1.02, -0.08), V(-0.5, 1.2, 0)],
  };
  const POSE = {
    prowl: { body: -0.05, y: -0.07, legs: [[0.55, -0.35], [-0.45, 0.75], [0.35, -0.6], [-0.12, -0.2]], neck: -0.3, head: 0.14, jaw: 0.03 },
    // 昂首阔步：头抬起、张口
    stride: { body: 0.03, y: -0.05, legs: [[0.5, -0.3], [-0.35, 0.55], [0.3, -0.55], [-0.1, -0.22]], neck: 0.22, head: -0.12, jaw: 0.42 },
  };
  const HIND = { x: -0.74, y: 1.08 }, FORE = { x: 0.72, y: 1.08 };
  const TORSO = [
    [-1.25, 1.2, 0, 0.05, 0.05, 0.05], [-1.15, 1.2, 0, 0.26, 0.3, 0.27], [-0.92, 1.18, 0, 0.43, 0.45, 0.43], [-0.6, 1.17, 0, 0.47, 0.46, 0.455],
    [-0.25, 1.14, 0, 0.43, 0.41, 0.42], [0.1, 1.13, 0, 0.42, 0.41, 0.41], [0.45, 1.16, 0, 0.47, 0.47, 0.45], [0.75, 1.2, 0, 0.52, 0.5, 0.47],
    [1.0, 1.23, 0, 0.44, 0.47, 0.41], [1.18, 1.26, 0, 0.24, 0.33, 0.27], [1.27, 1.27, 0, 0.05, 0.06, 0.06],
  ];
  // 肩胛顶起来的两个包、后胯的肌肉
  const torsoMod = (u, t, c) => 0.17 * gauss((c.x - 0.64) / 0.2) * gauss((Math.abs(u - 0.5) - 0.07) / 0.04) + 0.05 * gauss((c.x + 0.72) / 0.25) * gauss((Math.abs(u - 0.5) - 0.2) / 0.08);

  function makeLeg(front, mat, clawCol) {
    const hip = new THREE.Group();
    hip.add(inked(loft(front
      ? [[0, 0.17, 0, 0.07, 0.07, 0.07], [0, 0.04, 0, 0.22, 0.25, 0.17], [0, -0.2, 0, 0.19, 0.21, 0.155], [0, -0.42, 0, 0.14, 0.155, 0.13], [0, -0.56, 0, 0.125, 0.13, 0.12], [0, -0.63, 0, 0.05, 0.05, 0.05]]
      : [[0, 0.22, 0, 0.09, 0.09, 0.07], [0.02, 0.05, 0, 0.3, 0.3, 0.2], [0.02, -0.18, 0, 0.27, 0.26, 0.19], [0, -0.4, 0, 0.17, 0.17, 0.14], [0, -0.56, 0, 0.13, 0.13, 0.12], [0, -0.63, 0, 0.05, 0.05, 0.05]], { len: 28, rad: 20 }), mat));
    const knee = new THREE.Group(); knee.position.y = -0.54; hip.add(knee);
    knee.add(inked(loft(front
      ? [[0, 0.08, 0, 0.06, 0.06, 0.06], [0, 0, 0, 0.125, 0.13, 0.12], [0, -0.2, 0, 0.105, 0.11, 0.105], [0, -0.38, 0, 0.1, 0.1, 0.105], [0, -0.47, 0, 0.05, 0.05, 0.06]]
      : [[0, 0.08, 0, 0.06, 0.06, 0.06], [0, 0, 0, 0.12, 0.125, 0.115], [-0.02, -0.2, 0, 0.095, 0.1, 0.095], [0, -0.38, 0, 0.09, 0.095, 0.1], [0, -0.47, 0, 0.05, 0.05, 0.06]], { len: 22, rad: 20 }), mat));
    const foot = new THREE.Group(); foot.position.y = -0.42; knee.add(foot);
    const fp = [LP([[-0.13, 0, 0, 0.03, 0.04, 0.05], [-0.04, 0, 0, 0.11, 0.105, 0.15], [0.1, 0, 0, 0.115, 0.114, 0.18], [0.2, -0.01, 0, 0.09, 0.1, 0.17], [0.27, -0.02, 0, 0.03, 0.05, 0.1]], 0xece6d6, { len: 16, rad: 20 })];
    for (const z of [-0.125, -0.043, 0.043, 0.125]) {
      const fx = 0.25 - Math.abs(z) * 0.3;
      fp.push(P(new SphG(0.062, 14, 10), 0xece6d6, fx, -0.045, z, 0, 0, 0, 1.25, 0.95, 0.9));
      fp.push(P(new ConG(0.02, 0.09, 8), clawCol, fx + 0.085, -0.075, z, 0, 0, -PI / 2 - 0.55));
    }
    foot.add(inkedMerged(fp));
    return { hip, knee, foot, front };
  }

  function makeTiger(opt = {}) {
    const g = new THREE.Group(), bodyPivot = new THREE.Group(); g.add(bodyPivot); bodyPivot.name = 'bp';
    const torsoGeo = loft(TORSO, { len: 96, rad: 56, mod: torsoMod });
    bodyPivot.add(inked(torsoGeo, torsoMat()));

    const neck = new THREE.Group(); neck.name = 'neck'; neck.position.set(1.0, 1.3, 0); bodyPivot.add(neck);
    neck.add(inked(loft([[-0.22, -0.09, 0, 0.28, 0.34, 0.34], [0, 0, 0, 0.33, 0.37, 0.36], [0.25, 0.09, 0, 0.31, 0.33, 0.34], [0.45, 0.16, 0, 0.27, 0.28, 0.3], [0.58, 0.2, 0, 0.08, 0.08, 0.08]], { len: 24, rad: 36 }), neckMat()));

    // ----- 头 -----
    const head = new THREE.Group(); head.name = 'head'; head.position.set(0.46, 0.16, 0); neck.add(head);
    const HEAD = [
      [-0.37, 0, 0, 0.09, 0.09, 0.1], [-0.27, 0, 0, 0.29, 0.26, 0.31], [-0.12, 0.01, 0, 0.38, 0.3, 0.39, 2.2], [0.05, 0.02, 0, 0.385, 0.29, 0.385, 2.2], [0.17, 0.02, 0, 0.34, 0.25, 0.34, 2.2],
      [0.26, -0.01, 0, 0.23, 0.2, 0.26, 2.2], [0.35, -0.03, 0, 0.175, 0.155, 0.225, 2.4], [0.44, -0.04, 0, 0.155, 0.145, 0.21, 2.5], [0.51, -0.05, 0, 0.13, 0.125, 0.17, 2.3], [0.56, -0.06, 0, 0.035, 0.04, 0.05],
    ];
    const headGeo = loft(HEAD, { len: 72, rad: 56 }), hat = headGeo.userData.at;
    head.add(inked(headGeo, headMat()));
    const hp = [];
    for (const s of [1, -1]) {
      // 眼：琥珀色眼球、竖瞳、一点高光
      const e = hat(0.5 + s * EYE.u, EYE.v).p;
      hp.push(P(new SphG(0.056, 18, 14), 0xd9a845, e.x - 0.014, e.y - 0.004, e.z - s * 0.014));
      hp.push(P(new SphG(0.028, 12, 10), 0x121110, e.x + 0.03, e.y + 0.004, e.z + s * 0.012, 0, 0, 0, 0.6, 1.25, 0.8));
      hp.push(P(new SphG(0.01, 8, 6), 0xffffff, e.x + 0.05, e.y + 0.024, e.z + s * 0.02));
      // 眉骨压下来一点，显得凶
      hp.push(LP([[e.x - 0.08, e.y + 0.035, e.z + s * 0.06, 0.02, 0.02, 0.03], [e.x - 0.01, e.y + 0.05, e.z + s * 0.01, 0.035, 0.03, 0.05], [e.x + 0.07, e.y + 0.035, e.z - s * 0.045, 0.02, 0.02, 0.03]], 0xece6d6, { len: 10, rad: 12 }));
      // 耳：圆耳，耳背墨色带一块白斑
      hp.push(P(new SphG(0.15, 20, 14), 0xece6d6, -0.1, 0.35, s * 0.26, s * 0.3, 0, 0, 0.42, 1, 0.9));
      hp.push(P(new SphG(0.108, 16, 12), 0xcfa894, -0.068, 0.345, s * 0.26, s * 0.3, 0, 0, 0.3, 0.95, 0.85));
      hp.push(P(new SphG(0.126, 16, 12), 0x1f1d1c, -0.134, 0.36, s * 0.265, s * 0.3, 0, 0, 0.3, 0.95, 0.88));
      hp.push(P(new SphG(0.048, 10, 8), 0xf6f1e6, -0.162, 0.37, s * 0.27, s * 0.3, 0, 0, 0.3, 1, 1));
      // 吻部两团须垫
      hp.push(P(new SphG(0.1, 18, 14), 0xf6f1e6, 0.43, -0.105, s * 0.09, 0, 0, 0, 1.15, 0.85, 0.95));
      // 颊毛：五簇，往后往下炸开
      [[-0.02, -0.06, 0.32, 0.5, 0.34], [-0.08, -0.14, 0.31, 0.85, 0.36], [-0.14, -0.2, 0.27, 1.2, 0.33], [-0.2, -0.22, 0.2, 1.55, 0.26], [0.02, 0.04, 0.33, 0.2, 0.26]].forEach(([x, y, z, down, len], i) => {
        const dir = V(-0.35 - i * 0.05, -Math.sin(down) * 0.9, s * Math.cos(down)).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
        const base = V(x, y, s * z).addScaledVector(dir, len * 0.3);
        hp.push({ geo: new ConG(0.11, len, 14, 3), color: i % 2 ? 0xf6f1e6 : 0xece6d6, m: new THREE.Matrix4().compose(base, q, V(1, 1, 0.45)) });
      });
      // 上犬齿
      hp.push(P(new ConG(0.03, 0.13, 10), 0xf6f1e6, 0.43, -0.215, s * 0.115, PI, 0, -0.12));
    }
    hp.push(P(new SphG(0.06, 16, 12), 0x8a4a40, 0.535, -0.035, 0, 0, 0, 0, 0.75, 0.7, 1.25)); // 鼻头
    hp.push(P(new SphG(0.2, 16, 10), 0x7e1e14, 0.3, -0.166, 0, 0, 0, 0, 0.95, 0.08, 0.66)); // 上颚
    head.add(inkedMerged(hp));
    // 胡须：细墨线，不描边
    const wm = toon(0x2a2826), wh = new THREE.Group(); head.add(wh);
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new CylG(0.004, 0.0015, 0.42, 5), wm); w.geometry.translate(0, 0.21, 0);
      w.position.set(0.44 - i * 0.012, -0.1 + i * 0.012, s * 0.165); w.rotation.set(s * (1.25 + i * 0.07), 0, 0.25 - i * 0.2); wh.add(w);
    }
    // 下颌（可张合）
    const jaw = new THREE.Group(); jaw.name = 'jaw'; jaw.position.set(0.0, -0.17, 0); head.add(jaw);
    jaw.add(inkedMerged([
      LP([[-0.04, -0.06, 0, 0.03, 0.04, 0.15], [0.13, -0.07, 0, 0.05, 0.09, 0.2], [0.3, -0.075, 0, 0.05, 0.085, 0.18], [0.44, -0.075, 0, 0.045, 0.07, 0.15], [0.505, -0.07, 0, 0.012, 0.02, 0.04]], 0xf6f1e6, { len: 24, rad: 24 }),
      LP([[0.02, -0.03, 0, 0.012, 0.01, 0.08], [0.22, -0.02, 0, 0.022, 0.02, 0.1], [0.38, -0.022, 0, 0.02, 0.02, 0.075], [0.45, -0.03, 0, 0.006, 0.006, 0.02]], 0xc0605a, { len: 14, rad: 14 }), // 舌
      P(new ConG(0.024, 0.09, 10), 0xf6f1e6, 0.41, 0.01, 0.088), P(new ConG(0.024, 0.09, 10), 0xf6f1e6, 0.41, 0.01, -0.088),
      ...[-0.045, -0.015, 0.015, 0.045].map(z => P(new ConG(0.011, 0.035, 6), 0xf6f1e6, 0.478, -0.012, z)),
    ]));

    const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(-1.12, 1.3, 0); bodyPivot.add(tail);
    const tp = TAIL[opt.tail || 'low'];
    tail.add(inked(loft(tp.map((p, i) => [p.x, p.y, p.z, ...(i === tp.length - 1 ? [0.03, 0.03, 0.03] : i === 0 ? [0.1, 0.1, 0.1] : i === tp.length - 2 ? [0.092, 0.092, 0.092] : [0.082, 0.082, 0.082])]), { len: 64, rad: 20 }), tailMat()));

    const lm = legMat(), legs = [];
    for (const [front, z] of [[1, 0.31], [1, -0.31], [0, 0.31], [0, -0.31]]) {
      const Lg = makeLeg(!!front, lm, 0x3a3634), a = front ? FORE : HIND;
      Lg.hip.position.set(a.x, a.y, z); bodyPivot.add(Lg.hip); Lg.hip.name = 'hip' + legs.length; Lg.knee.name = 'knee' + legs.length; Lg.foot.name = 'foot' + legs.length; legs.push(Lg);
    }
    const o = {
      group: g, bodyPivot, neck, head, jaw, tail, legs, torsoAt: torsoGeo.userData.at, t: Core.rnd() * 5, pose: null,
      setPose(p) {
        this.pose = p;
        const th = p.body || 0, c = Math.cos(th), s = Math.sin(th);
        bodyPivot.rotation.z = th;
        bodyPivot.position.set(HIND.x - (HIND.x * c - HIND.y * s), HIND.y - (HIND.x * s + HIND.y * c) + (p.y || 0), 0);
        legs.forEach((Lg, i) => { const [hz, kz, fz] = p.legs[i]; Lg.hip.rotation.z = hz; Lg.knee.rotation.z = kz; Lg.foot.rotation.z = fz != null ? fz : -(th + hz + kz); });
        neck.rotation.z = p.neck || 0; head.rotation.z = p.head || 0; jaw.rotation.z = -(p.jaw || 0);
      },
      update(dt) {
        this.t += dt; const p = this.pose;
        tail.rotation.y = Math.sin(this.t * 1.5) * 0.16; tail.rotation.x = Math.sin(this.t * 1.1) * 0.12;
        neck.rotation.z = (p.neck || 0) + Math.sin(this.t * 1.2) * 0.025;
        jaw.rotation.z = -(p.jaw || 0) - Math.max(0, Math.sin(this.t * 0.7)) * 0.04;
      },
    };
    o.setPose(POSE[opt.pose || 'prowl']);
    return o;
  }

  // ---------- 织物贴图：底色 + 一道回纹镶边 ----------
  function clothMat(base, edge, line, band = 0.14, cols = 14) {
    const t = canvasTex(1024, 512, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      const bh = h * band, y0 = 0;
      g.fillStyle = edge; g.fillRect(0, y0, w, bh);
      g.strokeStyle = line; g.lineWidth = Math.max(3, Math.min(bh * 0.07, cols ? w / cols * 0.1 : 99)); g.lineJoin = 'miter';
      g.beginPath(); g.moveTo(0, y0 + bh * 0.1); g.lineTo(w, y0 + bh * 0.1); g.moveTo(0, y0 + bh * 0.9); g.lineTo(w, y0 + bh * 0.9); g.stroke();
      const cw = w / cols, a = bh * 0.24, cy = y0 + bh / 2;
      for (let i = 0; i < cols; i++) { // 回纹（cols=0 时只留两道金线）
        const x = i * cw + cw * 0.14, s = cw * 0.72;
        g.beginPath(); g.moveTo(x, cy + a); g.lineTo(x, cy - a); g.lineTo(x + s, cy - a); g.lineTo(x + s, cy + a); g.lineTo(x + s * 0.3, cy + a); g.lineTo(x + s * 0.3, cy - a * 0.2); g.lineTo(x + s * 0.68, cy - a * 0.2); g.stroke();
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    return toon(0xffffff, { map: t, unique: true });
  }

  // 披在虎背上的鞍鞯：沿躯干曲面取一块，往外垫一层，四周垂流苏
  function saddleCloth(tiger, o) {
    const at = tiger.torsoAt, U0 = 0.2, U1 = 0.8, T0 = o.t0 ?? 0.33, T1 = o.t1 ?? 0.64, nu = 40, nt = 28;
    const pos = [], uv = [], idx = [];
    const pt = (u, t, d) => { const q = at(u, t), n = q.p.clone().sub(q.c); n.x = 0; return q.p.addScaledVector(n.normalize(), d); };
    for (let i = 0; i <= nt; i++) for (let j = 0; j <= nu; j++) {
      const u = U0 + (U1 - U0) * j / nu, t = T0 + (T1 - T0) * i / nt, q = pt(u, t, 0.03);
      pos.push(q.x, q.y, q.z);
      const eu = Math.min(j, nu - j) / nu, et = Math.min(i, nt - i) / nt; // 贴图：离边越近 v 越靠近镶边
      uv.push(j / nu, 1 - Math.min(1, Math.min(eu * 2.0, et * 1.6) * 6.5));
    }
    for (let i = 0; i < nt; i++) for (let j = 0; j < nu; j++) { const a = i * (nu + 1) + j, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const grp = new THREE.Group();
    const m = new THREE.Mesh(geo, clothMat(o.base, o.edge, o.line, 0.3, 0)); m.material.side = THREE.DoubleSide; m.castShadow = true; grp.add(m);
    const fr = []; // 两侧下摆的流苏
    for (const u of [U0, U1]) for (let i = 0; i <= 13; i++) { const q = pt(u, T0 + (T1 - T0) * i / 13, 0.03); fr.push(P(new ConG(0.022, 0.13, 8), o.fringe, q.x, q.y - 0.06, q.z)); fr.push(P(new SphG(0.02, 8, 6), o.trim, q.x, q.y + 0.005, q.z)); }
    grp.add(inkedMerged(fr));
    return grp;
  }
  // 绕躯干一圈的带子（攀胸、肚带），带上钉金泡
  function strap(tiger, t, color, stud, w = 0.045) {
    const at = tiger.torsoAt, parts = [], n = 44;
    const ring = (dt, d) => Array.from({ length: n + 1 }, (_, j) => { const q = at(j / n, t + dt), nn = q.p.clone().sub(q.c).normalize(); return q.p.addScaledVector(nn, d); });
    const a = ring(-w / 2.5, 0.022), b = ring(w / 2.5, 0.022), pos = [], idx = [];
    for (let j = 0; j <= n; j++) { pos.push(a[j].x, a[j].y, a[j].z, b[j].x, b[j].y, b[j].z); }
    for (let j = 0; j < n; j++) { const k = j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    parts.push(P(geo, color));
    for (let j = 2; j < n; j += 4) { const q = at(j / n, t), nn = q.p.clone().sub(q.c).normalize(); const p = q.p.addScaledVector(nn, 0.03); parts.push(P(new SphG(0.024, 10, 8), stud, p.x, p.y, p.z)); }
    return inkedMerged(parts);
  }

  // ---------- 文臣 ----------
  // look: robe 上衣、skirt 下裳、edge 领袖缘、sash 大带
  function makeMinisterFigure(side, look) {
    const c = SIDE[side], g = new THREE.Group(), parts = [], robeN = hex(look.robe), edgeN = hex(look.edge);
    const pleat = (u, t) => 0.035 * Math.sin(u * 2 * PI * 18) * sstep(0.25, 0.9, t);
    // 下裳：罩住虎背往两边垂，带褶
    g.add(inked(loft([[0, 0.68, 0, 0.16, 0.16, 0.2], [0, 0.5, 0, 0.2, 0.2, 0.25], [0.02, 0.25, 0, 0.3, 0.3, 0.4], [0.03, 0, 0, 0.4, 0.42, 0.55], [0.03, -0.22, 0, 0.44, 0.46, 0.62], [0.03, -0.34, 0, 0.44, 0.46, 0.63]], { len: 40, rad: 72, mod: pleat }), clothMat(look.skirt, look.edge, look.line, 0.13, 18)));
    // 上身、交领
    parts.push(LP([[0, 0.56, 0, 0.17, 0.16, 0.2], [0, 0.8, 0, 0.19, 0.17, 0.25], [0, 0.98, 0, 0.17, 0.16, 0.29], [0, 1.06, 0, 0.1, 0.1, 0.19], [0, 1.11, 0, 0.04, 0.04, 0.07]], robeN, { len: 28, rad: 32 }));
    for (const s of [1, -1]) {
      parts.push(LP([[0.06, 1.07, s * 0.1, 0.028, 0.028, 0.045], [0.16, 0.96, s * 0.07, 0.03, 0.03, 0.05], [0.19, 0.8, -s * 0.02, 0.03, 0.03, 0.05], [0.185, 0.66, -s * 0.1, 0.025, 0.025, 0.045]], s > 0 ? edgeN : look.inner, { len: 16, rad: 10, side: V(1, 0, 0) }));
    }
    parts.push(P(new CylG(0.06, 0.07, 0.1, 16), C.skin, 0, 1.12, 0));
    // 大带、带钩、垂绶、玉佩
    parts.push(P(new TorG(0.2, 0.045, 12, 40), look.sash, 0, 0.62, 0, PI / 2, 0, 0, 1, 1.18, 1.25));
    parts.push(P(new SphG(0.045, 12, 10), c.trim, 0.2, 0.62, 0, 0, 0, 0, 0.6, 1, 1.5));
    parts.push(LP([[0.2, 0.6, 0.06, 0.008, 0.008, 0.035], [0.27, 0.4, 0.08, 0.008, 0.008, 0.04], [0.36, 0.18, 0.1, 0.008, 0.008, 0.045], [0.41, 0.02, 0.11, 0.008, 0.008, 0.05]], look.sash, { len: 14, rad: 8, side: V(1, 0, 0) }));
    parts.push(LP([[0.2, 0.6, -0.02, 0.008, 0.008, 0.03], [0.26, 0.42, -0.03, 0.008, 0.008, 0.035], [0.33, 0.22, -0.04, 0.008, 0.008, 0.04], [0.37, 0.08, -0.04, 0.008, 0.008, 0.045]], look.sash, { len: 14, rad: 8, side: V(1, 0, 0) }));
    parts.push(P(new CylG(0.006, 0.006, 0.2, 6), 0x8e2016, 0.12, 0.5, 0.26), P(new TorG(0.05, 0.018, 8, 20), 0xa8c8ae, 0.12, 0.36, 0.265, 0, PI / 2, 0), P(new ConG(0.025, 0.12, 8), 0x8e2016, 0.12, 0.24, 0.265));
    // 广袖：右臂前伸持杖，左臂收在胸前托虎符；袖口往下坠成一个兜
    const sleeve = pts => inked(loft(pts, { len: 30, rad: 28 }), clothMat(look.robe, look.edge, look.line, 0.16, 10));
    g.add(sleeve([[-0.02, 1.0, 0.24, 0.09, 0.09, 0.09], [0.08, 0.94, 0.34, 0.11, 0.14, 0.11], [0.22, 0.88, 0.42, 0.11, 0.26, 0.12], [0.33, 0.9, 0.46, 0.1, 0.36, 0.11], [0.37, 0.9, 0.47, 0.06, 0.3, 0.07]]));
    g.add(sleeve([[-0.02, 1.0, -0.24, 0.09, 0.09, 0.09], [0.06, 0.9, -0.33, 0.11, 0.14, 0.11], [0.18, 0.8, -0.3, 0.11, 0.24, 0.12], [0.27, 0.8, -0.2, 0.1, 0.3, 0.11], [0.3, 0.8, -0.17, 0.06, 0.24, 0.07]]));
    parts.push(P(new SphG(0.05, 12, 10), C.skin, 0.4, 0.92, 0.47, 0, 0, 0, 1.1, 1, 0.9), P(new SphG(0.05, 12, 10), C.skin, 0.33, 0.83, -0.15, 0, 0, 0, 1.1, 0.9, 1));
    // 虎符：左手托着的一枚小金虎
    parts.push(P(new SphG(0.05, 12, 8), 0xd6a43e, 0.37, 0.89, -0.14, 0, 0, 0, 1.5, 0.75, 0.6), P(new SphG(0.03, 10, 8), 0xd6a43e, 0.44, 0.91, -0.14), P(new CylG(0.008, 0.008, 0.07, 6), 0xd6a43e, 0.3, 0.915, -0.14, 0, 0, 0.9));
    // 头：面、鼻、眉眼、耳、三绺须
    const hy = 1.27;
    parts.push(P(new SphG(0.135, 28, 20), C.skin, 0, hy, 0, 0, 0, 0, 0.95, 1.1, 0.88));
    parts.push(P(new ConG(0.022, 0.07, 8), C.skin, 0.125, hy - 0.005, 0, 0, 0, -0.25));
    for (const s of [1, -1]) {
      parts.push(P(new SphG(0.014, 8, 6), 0x151413, 0.112, hy + 0.03, s * 0.05, 0, 0, 0, 0.6, 0.55, 1.6));
      parts.push(P(new THREE.BoxGeometry(0.012, 0.01, 0.055), 0x151413, 0.108, hy + 0.058, s * 0.052, s * 0.2));
      parts.push(P(new SphG(0.03, 10, 8), C.skin, -0.005, hy, s * 0.118, 0, 0, 0, 0.7, 1.2, 0.5));
      parts.push(LP([[0.118, hy - 0.045, s * 0.02, 0.008, 0.008, 0.012], [0.125, hy - 0.07, s * 0.06, 0.01, 0.01, 0.014], [0.11, hy - 0.17, s * 0.085, 0.004, 0.004, 0.006]], 0x151413, { len: 10, rad: 8, side: V(1, 0, 0) })); // 髭
    }
    parts.push(LP([[0.095, hy - 0.1, 0, 0.03, 0.03, 0.045], [0.115, hy - 0.2, 0, 0.03, 0.03, 0.04], [0.135, hy - 0.34, 0, 0.018, 0.018, 0.022], [0.14, hy - 0.44, 0, 0.004, 0.004, 0.005]], 0x151413, { len: 16, rad: 12 })); // 长须
    // 发、进贤冠（展筒前高后低）、簪、缨
    parts.push(P(new SphG(0.14, 24, 16, 0, PI * 2, 0, PI * 0.46), 0x151413, -0.018, hy + 0.012, 0, 0, 0, 0.6, 0.96, 1.08, 0.9));
    parts.push(P(new SphG(0.05, 12, 10), 0x151413, -0.03, hy + 0.17, 0));
    const cap = new THREE.Shape(); cap.moveTo(-0.11, 0); cap.lineTo(0.1, 0); cap.lineTo(0.115, 0.2); cap.lineTo(0.06, 0.23); cap.lineTo(-0.02, 0.12); cap.lineTo(-0.12, 0.09); cap.closePath();
    const capGeo = new THREE.ExtrudeGeometry(cap, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 }); capGeo.translate(0, 0, -0.05);
    parts.push(P(capGeo, look.cap, -0.01, hy + 0.115, 0));
    parts.push(P(new TorG(0.105, 0.016, 8, 28), look.capBand, -0.005, hy + 0.115, 0, PI / 2, 0, 0, 1, 0.92, 1));
    parts.push(P(new CylG(0.008, 0.008, 0.34, 8), c.trim, -0.03, hy + 0.17, 0, PI / 2), P(new SphG(0.016, 8, 6), c.trim, -0.03, hy + 0.17, 0.17));
    for (const s of [1, -1]) parts.push(LP([[0.0, hy + 0.11, s * 0.105, 0.006, 0.006, 0.006], [0.04, hy - 0.04, s * 0.122, 0.006, 0.006, 0.006], [0.08, hy - 0.13, s * 0.06, 0.006, 0.006, 0.006], [0.09, hy - 0.15, 0, 0.006, 0.006, 0.006]], 0x8e2016, { len: 16, rad: 6, side: V(1, 0, 0) }));
    g.add(inkedMerged(parts));
    return g;
  }

  // 节杖：竹竿分节，三重旄，每重一圈垂穗，杖首铜帽
  function makeStaff(side, len = 2.9) {
    const c = SIDE[side], strands = [], parts = [P(new CylG(0.022, 0.026, len, 14), 0x8a6a3a, 0, len / 2, 0)];
    for (let y = 0.2; y < len - 0.1; y += 0.27) parts.push(P(new TorG(0.026, 0.006, 6, 16), 0x5a4424, 0, y, 0, PI / 2));
    [len - 0.32, len - 0.68, len - 1.04].forEach((y, k) => {
      const r0 = 0.085 - k * 0.006;
      parts.push(P(new SphG(r0, 20, 12, 0, PI * 2, 0, PI / 2), 0xb0301f, 0, y, 0, 0, 0, 0, 1, 0.75, 1), P(new TorG(r0 * 0.55, 0.012, 8, 20), c.trim, 0, y + r0 * 0.6, 0, PI / 2));
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 16; i++) {
        const a = (i + ring * 0.5) / 16 * PI * 2, rr = r0 * (0.92 - ring * 0.38), hl = 0.3 - ring * 0.04 + (i % 3) * 0.015;
        strands.push(P(new ConG(0.02, hl, 6), ring ? 0x8e2016 : 0xb0301f, Math.cos(a) * rr * 1.08, y - hl / 2 + 0.02, Math.sin(a) * rr * 1.08, Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16));
      }
    });
    parts.push(P(new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.04, 0.03], [0.026, 0.06], [0.03, 0.09], [0.012, 0.13], [0.018, 0.16], [0, 0.2]].map(p => new THREE.Vector2(p[0], p[1])), 16), c.trim, 0, len - 0.02, 0));
    const g = inkedMerged(parts), sm = new THREE.Mesh(Core.merge(strands), Models.vcMat); sm.castShadow = true; g.add(sm);
    return g;
  }
  // 虎头上的络头与项圈
  function bridle(tiger, c, rich) {
    const collar = new TorG(0.37, 0.035, 10, 36); collar.rotateY(PI / 2);
    const parts = [P(collar, c.cloth)];
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; parts.push(P(new SphG(0.03, 10, 8), c.trim, 0, Math.cos(a) * 0.39, Math.sin(a) * 0.39)); }
    // 项下一枚铃、一束红缨
    parts.push(P(new SphG(0.07, 14, 10), 0xd6a43e, 0.02, -0.46, 0), P(new ConG(0.06, 0.3, 12), 0xb0301f, 0.02, -0.66, 0));
    const g = inkedMerged(parts); g.position.set(0.12, 0.03, 0); g.rotation.z = 0.42; tiger.neck.add(g);
    if (rich) { // 当卢：额前一片鎏金
      tiger.head.add(inkedMerged([P(new SphG(0.06, 14, 10), 0xd6a43e, 0.325, 0.175, 0, 0, 0, -0.75, 0.25, 1.7, 0.8), P(new SphG(0.022, 8, 6), 0xb0301f, 0.365, 0.15, 0)]));
    }
  }

  const LOOK = {
    zhu: { robe: '#a8321f', skirt: '#a8321f', edge: '#1d1c1b', line: '#d9b45a', inner: 0xf2ecdf, sash: 0xd6a43e, cap: 0x1d1c1b, capBand: 0xc9a045 },
    // 玄衣纁裳：上玄下赤
    xuan: { robe: '#26242a', skirt: '#9a2c1c', edge: '#8e2016', line: '#e2c173', inner: 0xf2ecdf, sash: 0xd6a43e, cap: 0x1d1c1b, capBand: 0xc9a045 },
  };
  const hex = s => parseInt(s.slice(1), 16);
  function mount(t, side, look, extra) {
    const fig = makeMinisterFigure(side, look);
    fig.name = 'fig'; fig.position.set(-0.05, 1.56, 0); t.bodyPivot.add(fig);
    if (extra) extra(fig);
    return fig;
  }

  // ---------- 精修一「持节潜行」：朱袍、节杖、虎压低身子潜行 ----------
  // gold：兵法四级——白虎不变，鞍鞯换成金底朱缘、攀胸肚带鎏金、额前加当卢，文臣的领袖缘和大带也换金
  function makeProwl(side = 'r', opt = {}) {
    const c = SIDE[side], gold = !!opt.gold, t = makeTiger({ pose: 'prowl', tail: 'low' });
    t.bodyPivot.add(saddleCloth(t, gold ? { base: '#c9962e', edge: '#8e1c12', line: '#f7dc8c', fringe: 0xb0301f, trim: 0xf7dc8c } : { base: '#2a2725', edge: '#1d1c1b', line: '#d9b45a', fringe: 0xb0301f, trim: c.trim }));
    const sc = gold ? 0xd6a43e : hex('#2a2725'), st = gold ? 0xb0301f : c.trim;
    t.bodyPivot.add(strap(t, 0.31, sc, st), strap(t, 0.84, sc, st));
    bridle(t, gold ? { ...c, cloth: 0xd6a43e, trim: 0xf7dc8c } : c, gold);
    const look = gold ? { ...LOOK.zhu, edge: '#b8862e', line: '#f7dc8c', capBand: 0xf7dc8c } : LOOK.zhu;
    mount(t, side, look, fig => { const st = makeStaff(side); st.position.set(0.42, -0.72, 0.5); st.rotation.z = -0.07; fig.add(st); });
    return t;
  }

  // ---------- 游戏里用的入口 ----------
  // 原型只造一次（放样、画贴图都在这一步），以后每次出场克隆一份：几何体、贴图全部共用
  const protos = {};
  function proto(side, gold) {
    const q = Core.quality === 'high' ? 0.6 : 0.42, key = side + (gold ? 'G' : '') + q;
    if (protos[key]) return protos[key];
    LQ = q; seed = 11;
    const t = makeProwl(side, { gold }); LQ = 1;
    t.group.traverse(o => { if (o.geometry) o.geometry.userData.keep = true; });
    return (protos[key] = t.group);
  }
  // 自己写的克隆：只抄层级和变换，几何体、材质共用。不用 Object3D.clone——它会把 userData 整个 JSON 一遍，
  // 而描边网格的 userData 里挂着网格本身，等于把几何体和贴图全部序列化（一次要半秒到十几秒）
  function cloneTree(src) {
    const dst = src.isMesh ? new THREE.Mesh(src.geometry, src.material) : new THREE.Group();
    dst.name = src.name; dst.position.copy(src.position); dst.quaternion.copy(src.quaternion); dst.scale.copy(src.scale);
    dst.castShadow = src.castShadow; dst.visible = src.visible; dst.renderOrder = src.renderOrder;
    for (const c of src.children) dst.add(cloneTree(c));
    return dst;
  }
  // 给克隆出来的一份接上动作：speed 行走、pounceK 扑击、roarK 咆哮、dead 倒地
  function make(side = 'r', opt = {}) {
    const g = cloneTree(proto(side, !!opt.gold)), N = n => g.getObjectByName(n);
    const bp = N('bp'), neck = N('neck'), head = N('head'), jaw = N('jaw'), tail = N('tail'), fig = N('fig');
    const legs = [0, 1, 2, 3].map(i => ({ hip: N('hip' + i), knee: N('knee' + i), foot: N('foot' + i), front: i < 2 }));
    const P0 = POSE.prowl, OFF = [0, 0.5, 0.75, 0.25], lerp = (a, b, k) => a + (b - a) * k;
    // 走动时每条腿在“探出”和“收在身下”两个落地姿势之间来回，抬腿的半程多屈一点膝
    const A = [P0.legs[0], P0.legs[0], P0.legs[2], P0.legs[2]], B = [P0.legs[1], P0.legs[1], P0.legs[3], P0.legs[3]];
    const o = {
      group: g, bodyPivot: bp, neck, head, jaw, tail, legs, rider: fig,
      t: Core.rnd() * 5, speed: 0, pounceK: 0, roarK: 0, dead: 0, deadSide: 1,
      update(dt) {
        o.t += dt * (1 + o.speed);
        const s = o.dead ? 0 : Math.min(1, o.speed), ph = o.t * 5.4, pk = o.pounceK, dk = o.dead, rk = o.roarK;
        const th = lerp(P0.body, 0.48, pk), c = Math.cos(th), sn = Math.sin(th);
        bp.rotation.z = th; bp.rotation.x = o.deadSide * dk * 1.4;
        bp.position.set(HIND.x - (HIND.x * c - HIND.y * sn), HIND.y - (HIND.x * sn + HIND.y * c) + P0.y * (1 - pk) + s * Math.abs(Math.sin(ph)) * 0.03 + (1 - s) * Math.sin(o.t * 1.7) * 0.008 - dk * 0.5, 0);
        legs.forEach((L, i) => {
          const a = ph + OFF[i] * Math.PI * 2, w = (1 + Math.sin(a)) / 2, lift = Math.max(0, Math.cos(a));
          let hz = lerp(P0.legs[i][0], lerp(B[i][0], A[i][0], w), s), kz = lerp(P0.legs[i][1], lerp(B[i][1], A[i][1], w) + lift * (L.front ? 0.5 : -0.45), s);
          if (pk > 0) { hz = lerp(hz, L.front ? 1.05 : -0.62, pk); kz = lerp(kz, L.front ? -0.12 : -0.1, pk); }   // 扑击：前肢前探，后肢蹬直
          if (dk > 0) { hz = lerp(hz, L.front ? 0.65 : -0.45, dk); kz = lerp(kz, L.front ? -0.3 : -0.35, dk); }
          L.hip.rotation.z = hz; L.knee.rotation.z = kz; L.foot.rotation.z = -(th + hz + kz) * (1 - Math.max(pk, dk) * 0.7);
        });
        neck.rotation.z = lerp(P0.neck, 0.22, Math.max(rk, pk * 0.8)) + Math.sin(o.t * 1.2) * 0.025 - dk * 0.25;
        head.rotation.z = lerp(P0.head, -0.1, rk); head.rotation.y = (1 - rk) * (1 - s) * Math.sin(o.t * 0.6) * 0.1;
        jaw.rotation.z = -lerp(P0.jaw, 0.46, rk) - Math.max(0, Math.sin(o.t * 0.7)) * 0.04 * (1 - rk);
        tail.rotation.y = Math.sin(o.t * 1.5) * (0.16 + s * 0.08) * (1 - dk); tail.rotation.x = Math.sin(o.t * 1.1) * 0.12 * (1 - dk); tail.rotation.z = pk * 0.45 + s * 0.12 - dk * 0.3;
        if (fig) { fig.rotation.z = -(th - P0.body) * 0.55 + s * Math.sin(ph * 2 + 0.6) * 0.012 + dk * 0.4; fig.position.y = 1.56 + s * Math.abs(Math.sin(ph)) * 0.015; }
      },
    };
    o.update(0);
    return o;
  }
  return { make, makeTiger, makeProwl, loft, POSE };
})();
