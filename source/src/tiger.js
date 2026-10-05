// ===== 汉相·文臣虎骑：放样曲面的白虎 + 文臣、节杖、鞍具 =====
// 造型是 Ham 定稿的「精修一·持节潜行」。同一套造型参数按“面数档”生成，游戏里这样用：
//   · 面数档（LOD）：0 精修约 8.3 万面 / 1 约 7.7 千 / 2 约 4 千 / 3 约 3 千 / 4 约 2 千 / 5 约 1 千（都不含描边，描边再翻一倍）。
//     Ham 定的对局档是 2（4,002 面）。高、中画质用 2，低画质用 4（1,998 面）——见 QLOD。
//   · 每种款式（普通 / 四级金装）每个画质档只造一次原型，之后每次出场都是克隆（几何体、贴图全部共用）。
//   · make() 返回的对象带动作：speed 行走（四条腿按步态做反解，脚踩在地面上）、pounceK 扑击、roarK 咆哮、dead 就地倒下。
const TigerHD = (() => {
  const { P, G, inkedMerged, SIDE, C } = Models;
  const { toon, inked, canvasTex } = Core;
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI, ZAX = V(0, 0, 1);
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const R = (a, b) => a + (b - a) * rnd();
  const gauss = x => Math.exp(-x * x);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const INKC = '#1f1d1c', FUR = '#ece6d6', FUR2 = '#f6f1e6';
  // 面数档 LOD：0 精修（约 8 万面）/ 1 约 7.7 千 / 2 约 4 千 / 3 约 3 千 / 4 约 2 千 / 5 约 1 千。
  // 造型、姿态、贴图完全相同；档位越低分段越少，零碎件（流苏、金泡、胡须、趾爪……）逐档去掉。
  let LOD = 0, GOLD = false;   // GOLD：正在造四级金装的原型
  const q = (...v) => v[Math.min(LOD, v.length - 1)];   // 按档取值：q(精修, 1档, 2档, …)，没写的档沿用最后一个
  const upto = n => LOD <= n;                            // 这个部件保留到第 n 档
  const cut = (n, ks, min) => LOD ? Math.max(min, Math.round(n * ks[Math.min(LOD, ks.length - 1)])) : n;
  const KS = [1, 0.42, 0.36, 0.3, 0.25, 0.2], KC = [1, 0.5, 0.45, 0.4, 0.35, 0.3];
  const SG = (r, w = 16, h = 12, ...a) => new THREE.SphereGeometry(r, cut(w, KS, q(5, 5, 5, 4, 4, 4)), cut(h, KS, q(3, 3, 3, 2, 2, 2)), ...a);
  const SQ = (r, wh, ...a) => new THREE.SphereGeometry(r, wh[0], wh[1], ...a);   // 分段数逐档写明的球
  const CG = (r, h, n = 8, hs = 1) => new THREE.ConeGeometry(r, h, cut(n, KC, 3), LOD ? 1 : hs, !!LOD);
  const TG = (R0, t, ts = 8, rs = 16, ...a) => new THREE.TorusGeometry(R0, t, cut(ts, [1, 0.4], 3), cut(rs, KS, q(8, 8, 8, 6, 6, 6)), ...a);
  const YG = (rt, rb, h, n = 8, ...a) => new THREE.CylinderGeometry(rt, rb, h, cut(n, KS, q(4, 4, 4, 3, 3, 3)), ...a);
  const memo = {}, once = (k, f) => memo[k] || (memo[k] = f()); // 贴图材质只做一份，两枚相共用

  // ---------- 放样：沿一条脊线排一串截面（上/下/宽 可不等），样条插值成光滑曲面 ----------
  // rings: [x, y, z, 上, 下, 宽, 方度]；u 绕截面一圈（0 在下、0.5 在上），t 沿脊线
  const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  function loft(rings, o = {}) {
    const sg = LOD && o.seg ? o.seg[Math.min(LOD, o.seg.length) - 1] : null, sp = (LOD && o.span && o.span[Math.min(LOD, o.span.length) - 1]) || [0, 1]; // seg：1 档起每档的 [纵向, 环向] 分段；span：低档只取中间一段，省掉两头收口
    const L = LOD ? (sg ? sg[0] : Math.max(3, Math.round((o.len || 40) * 0.3))) : (o.len || 40), Rn = LOD ? (sg ? sg[1] : Math.max(6, Math.round((o.rad || 28) * 0.35))) : (o.rad || 28), n = rings.length;
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
    for (let i = 0; i <= L; i++) for (let j = 0; j <= Rn; j++) { const tt = sp[0] + (sp[1] - sp[0]) * i / L, pt = at(j / Rn, tt).p; pos.push(pt.x, pt.y, pt.z); uv.push(j / Rn, tt); }
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

  const torsoMat = () => once('torsoMat', () => skin(1024, 1024, (g, X) => {
      const gr = g.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, FUR2); gr.addColorStop(0.14, FUR); gr.addColorStop(0.86, FUR); gr.addColorStop(1, FUR2); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
      for (let v = 0.07; v < 0.95; v += R(0.052, 0.07)) {
        for (const s of [1, -1]) {
          const len = R(0.24, 0.34), lean = R(-0.05, -0.015), w = R(52, 80);
          brush(g, arc(X, 0.5 - s * 0.012, v + R(-0.006, 0.006), s * len, lean, R(-0.03, 0.01)), w, 1.5);
          if (rnd() < 0.45) brush(g, arc(X, 0.5 + s * len * 0.45, v + lean * 0.45 + 0.012, s * len * 0.5, 0.035, 0.01, 8), w * 0.6, 1); // 分叉
          if (rnd() < 0.6) { const vv = v + R(0.025, 0.045); brush(g, arc(X, 0.5 + s * R(0.33, 0.37), vv, -s * R(0.1, 0.17), R(-0.02, 0.02), 0.01, 8), R(28, 40), 1); } // 腹侧往上挑的短纹
        }
      }
    }));
  const legMat = () => once('legMat', () => skin(256, 512, (g, X) => {
      for (let v = 0.2; v < 0.97; v += R(0.13, 0.17)) {
        const a = R(0.08, 0.2), b = R(0.8, 0.94), m = R(0.4, 0.6);
        brush(g, arc(X, m, v, a - m, R(-0.02, 0.02), 0, 8), R(26, 36), 3); brush(g, arc(X, m, v, b - m, R(-0.02, 0.02), 0, 8), R(26, 36), 3);
      }
    }));
  const tailMat = () => once('tailMat', () => skin(128, 512, (g, X) => {
      for (let v = 0.08; v < 0.86; v += R(0.085, 0.11)) { g.fillStyle = INKC; const [, y] = X(0, v), h = R(16, 24); g.fillRect(0, y - h / 2, 128, h); }
      g.fillStyle = INKC; g.fillRect(0, 0, 128, 512 * 0.1);
    }));
  const neckMat = () => once('neckMat', () => skin(512, 256, (g, X) => {
      for (const v of [0.2, 0.48, 0.74]) for (const s of [1, -1]) brush(g, arc(X, 0.5 - s * 0.01, v, s * R(0.24, 0.3), R(-0.06, 0.02), 0, 10), R(26, 36), 2);
    }));
  // 头：v 从后脑到鼻尖，u=0.5 是头顶正中
  const EYE = { u: 0.105, v: 0.6 };
  const headMat = () => once('headMat', () => skin(1024, 1024, (g, X) => {
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
    }));

  const TAIL = {
    low: [V(0, 0, 0), V(-0.4, -0.25, 0), V(-0.85, -0.32, 0.06), V(-1.18, -0.05, 0.1), V(-1.25, 0.35, 0.1), V(-1.08, 0.66, 0.05)],
  };
  // 站姿（参考幽灵虎）：四肢外撑站得宽，前腿略往前踩，后腿是 大腿—小腿—跗骨 三段折线，头压得比肩低。
  // 不再写死每个关节的角度：只给四只脚踝的落点，关节角由反解算出来，脚一定踩在地上。
  const HIND = { x: -0.74, y: 1.08, z: 0.31 }, FORE = { x: 0.72, y: 1.06, z: 0.33 };   // 后胯、肩关节（躯干坐标）
  const LEN = { f1: 0.44, f2: 0.44, h1: 0.48, h2: 0.44, h3: 0.27 }, PAW = 0.135;       // 各段长度；踝到掌底的高度
  const STANCE = {
    pitch: -0.07, y: -0.03, neck: -0.44, head: 0.3, jaw: 0.04,
    feet: [[0.85, 0.5], [0.74, -0.5], [-0.86, 0.45], [-0.7, -0.45]],   // 踝的落点 [x, z]：前左、前右、后左、后右
    meta: 0.28,                                                        // 跗骨着地时前倾的角度
  };
  const GAIT = { off: [0.25, 0.75, 0, 0.5], rest: [0.8, 0.8, -0.78, -0.78], duty: 0.62 };  // 对侧步：左后 → 左前 → 右后 → 右前
  const lerp = (a, b, k) => a + (b - a) * k, sm = k => { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * (3 - 2 * k); };
  const IK = [0, 0, 0, 0];   // 胯、膝、跗、外展
  // 一条腿的反解：给踝的目标位置（躯干坐标），求各关节转角。前腿两段、肘朝后；后腿三段、膝朝前，跗骨的朝向 m 由调用方给
  function solveLeg(front, sgn, lx, ly, lz, m) {
    const a0 = front ? FORE : HIND, dy = ly - a0.y, dz = lz - sgn * a0.z; let dx = lx - a0.x, down = Math.hypot(dy, dz), l1 = LEN.f1, l2 = LEN.f2;
    if (!front) { l1 = LEN.h1; l2 = LEN.h2; dx -= LEN.h3 * Math.sin(m); down -= LEN.h3 * Math.cos(m); }   // 先退回到跗关节
    let d = Math.hypot(dx, down); const dm = l1 + l2 - 0.01; if (d > dm) { dx *= dm / d; down *= dm / d; d = dm; } if (d < 0.2) d = 0.2;
    const a = Math.atan2(dx, down), al = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), be = PI - Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
    if (front) { IK[0] = a - al; IK[1] = be; IK[2] = 0; } else { IK[0] = a + al; IK[1] = -be; IK[2] = m - (a + al - be); }
    IK[3] = -Math.atan2(dz, -dy);                                      // 腿所在的平面往外倾多少
  }
  // 摆姿势。R：关节组；S：{ t 时间, s 步态权重, sp 速度, pk 扑击, rk 咆哮, dk 倒地, side 往哪侧倒 }。返回躯干的俯仰角
  function applyPose(R, S) {
    const bp = R.bp, legs = R.legs, ST = STANCE, t = S.t || 0, s = S.s || 0, sp = S.sp || 0, pk = S.pk || 0, rk = S.rk || 0, dk = S.dk || 0;
    const ph = t * 5.4, d1 = sm(dk / 0.45), d2 = sm((dk - 0.3) / 0.7);            // 倒地分两段：先腿软伏下，再侧翻
    const stride = 0.32 + 0.2 * Math.min(1.5, sp), lift = 0.14 + 0.05 * Math.min(1.5, sp);
    const th = lerp(ST.pitch, 0.42, pk) * (1 - d1), c = Math.cos(th), sn = Math.sin(th), roll = (S.side || 1) * d2 * 1.45, YC = 1.14;
    const bx = HIND.x - (HIND.x * c - HIND.y * sn);
    const by = HIND.y - (HIND.x * sn + HIND.y * c) + ST.y * (1 - pk) - s * 0.03 + s * Math.sin(ph * 2) * 0.018 + (1 - s) * Math.sin(t * 1.7) * 0.008 * (1 - dk) - d1 * 0.52;
    bp.rotation.set(roll + s * Math.sin(ph) * 0.025 * (1 - dk), s * Math.sin(ph + 0.8) * 0.03 * (1 - dk), th);
    bp.position.set(bx, lerp(by + YC, 0.47, d2) - YC * Math.cos(roll), -YC * Math.sin(roll));   // 侧翻绕躯干中轴，中轴留在原地、落到贴地的高度
    for (let i = 0; i < 4; i++) {
      const L = legs[i], sgn = i % 2 ? -1 : 1, F = ST.feet[i]; let tx = F[0], ty = PAW, m = ST.meta, toe = 0;
      if (s > 0) { // 步态：支撑相脚贴地往后送，摆动相抬起来往前探
        let u = ph / (2 * PI) + GAIT.off[i]; u -= Math.floor(u); let gx;
        if (u < GAIT.duty) gx = GAIT.rest[i] + stride * (0.5 - u / GAIT.duty);
        else { const v = (u - GAIT.duty) / (1 - GAIT.duty), up = Math.sin(v * PI); gx = GAIT.rest[i] + stride * (sm(v) - 0.5); ty += s * lift * up; m += s * 0.6 * up; toe = -0.5 * up * s; }
        tx = lerp(tx, gx, s);
      }
      if (pk > 0 && !L.front) tx -= 0.14 * pk;                                   // 扑击：后脚蹬在原地略靠后
      const ex = tx - bx, ey = ty - by;
      solveLeg(L.front, sgn, ex * c + ey * sn, -ex * sn + ey * c, F[1], m - th);
      let hz = IK[0], kz = IK[1], mz = IK[2], ab = IK[3];
      if (pk > 0 && L.front) { hz = lerp(hz, 1.08 + (i ? 0.14 : 0), pk); kz = lerp(kz, 0.14, pk); ab *= 1 - pk * 0.4; }   // 扑击：前肢前探
      if (d2 > 0) { // 侧躺：四肢松开
        if (L.front) { hz = lerp(hz, 0.5 - (i ? 0.25 : 0), d2); kz = lerp(kz, 0.35, d2); } else { hz = lerp(hz, -0.3 + (i === 3 ? 0.3 : 0), d2); kz = lerp(kz, -0.5, d2); mz = lerp(mz, 0.55, d2); }
        ab *= 1 - d2;
      }
      const flat = 1 - Math.max(L.front ? pk : 0, d2) * 0.7;
      L.hip.rotation.set(ab, 0, hz); L.knee.rotation.z = kz; if (L.hock) L.hock.rotation.z = mz;
      L.foot.rotation.set(-ab * flat, -sgn * 0.16 * flat, -(th + hz + kz + mz) * flat + toe);
    }
    R.neck.rotation.z = lerp(lerp(ST.neck, 0.2, Math.max(rk, pk * 0.8)) + Math.sin(t * 1.2) * 0.025 * (1 - dk) - s * Math.sin(ph * 2) * 0.02, -0.5, d2);
    R.head.rotation.z = lerp(lerp(ST.head, -0.08, rk), 0.25, d2); R.head.rotation.y = (1 - rk) * (1 - s) * (1 - dk) * Math.sin(t * 0.6) * 0.1;
    R.jaw.rotation.z = -lerp(lerp(ST.jaw, 0.46, rk), 0.16, d2) - Math.max(0, Math.sin(t * 0.7)) * 0.04 * (1 - rk) * (1 - dk);
    R.tail.rotation.set(Math.sin(t * 1.1) * 0.12 * (1 - dk), Math.sin(t * 1.5) * (0.16 + s * 0.1) * (1 - dk), pk * 0.5 + s * 0.14 + rk * 0.12 - d1 * 0.35);
    return th;
  }
  const TORSO = [
    [-1.25, 1.2, 0, 0.05, 0.05, 0.05], [-1.15, 1.2, 0, 0.26, 0.3, 0.27], [-0.92, 1.18, 0, 0.43, 0.45, 0.43], [-0.6, 1.17, 0, 0.47, 0.46, 0.455],
    [-0.25, 1.14, 0, 0.43, 0.41, 0.42], [0.1, 1.13, 0, 0.42, 0.41, 0.41], [0.45, 1.16, 0, 0.47, 0.47, 0.45], [0.75, 1.2, 0, 0.52, 0.5, 0.47],
    [1.0, 1.23, 0, 0.44, 0.47, 0.41], [1.18, 1.26, 0, 0.24, 0.33, 0.27], [1.27, 1.27, 0, 0.05, 0.06, 0.06],
  ];
  // 肩胛顶起来的两个包、后胯的肌肉
  const torsoMod = (u, t, c) => 0.17 * gauss((c.x - 0.64) / 0.2) * gauss((Math.abs(u - 0.5) - 0.07) / 0.04) + 0.05 * gauss((c.x + 0.72) / 0.25) * gauss((Math.abs(u - 0.5) - 0.2) / 0.08);

  function makeLeg(front, mat, clawCol) {
    const hip = new THREE.Group(), seg2 = { len: 22, rad: 20, seg: [[4, 8], [3, 6], [3, 6], [2, 6], [1, 5]], span: [null, null, null, [0.1, 0.9], [0.14, 0.86]] };
    hip.add(inked(loft(front
      ? [[0, 0.18, 0, 0.07, 0.07, 0.07], [0, 0.05, 0, 0.22, 0.27, 0.18], [0, -0.16, 0, 0.18, 0.22, 0.16], [-0.01, -0.34, 0, 0.14, 0.18, 0.135], [-0.02, -0.44, 0, 0.125, 0.16, 0.125], [0, -0.51, 0, 0.05, 0.05, 0.05]]
      : [[0, 0.22, 0, 0.09, 0.09, 0.07], [0.02, 0.05, 0, 0.3, 0.32, 0.2], [0.03, -0.16, 0, 0.27, 0.26, 0.19], [0.01, -0.34, 0, 0.19, 0.18, 0.15], [0, -0.48, 0, 0.13, 0.14, 0.125], [0, -0.55, 0, 0.05, 0.05, 0.05]],
      { len: 28, rad: 20, seg: [[5, 8], [4, 6], [4, 6], [3, 7], [2, 5]], span: [null, null, null, [0.12, 0.9], [0.14, 0.88]] }), mat));
    const knee = new THREE.Group(); knee.position.y = front ? -LEN.f1 : -LEN.h1; hip.add(knee);
    knee.add(inked(loft(front
      ? [[0, 0.07, 0, 0.06, 0.06, 0.06], [0, 0, 0, 0.13, 0.15, 0.125], [0.01, -0.18, 0, 0.13, 0.125, 0.125], [0, -0.36, 0, 0.12, 0.115, 0.12], [0, -0.44, 0, 0.115, 0.11, 0.12], [0, -0.5, 0, 0.05, 0.05, 0.06]]
      : [[0, 0.07, 0, 0.06, 0.06, 0.06], [0, 0, 0, 0.125, 0.13, 0.12], [0, -0.18, 0, 0.1, 0.12, 0.1], [0, -0.36, 0, 0.085, 0.105, 0.09], [0, -0.44, 0, 0.085, 0.11, 0.09], [0, -0.5, 0, 0.04, 0.05, 0.05]], seg2), mat));
    let hock = null, last = knee, drop = front ? -LEN.f2 : -LEN.h2;
    if (!front) { // 后腿多一段跗骨
      hock = new THREE.Group(); hock.position.y = drop; knee.add(hock); last = hock; drop = -LEN.h3;
      hock.add(inked(loft([[0, 0.06, 0, 0.05, 0.06, 0.05], [0, 0, 0, 0.085, 0.105, 0.09], [0, -0.13, 0, 0.08, 0.085, 0.085], [0, -0.27, 0, 0.09, 0.09, 0.095], [0, -0.33, 0, 0.05, 0.05, 0.06]],
        { len: 14, rad: 20, seg: [[3, 8], [2, 6], [2, 6], [2, 6], [1, 5]], span: [null, null, null, [0.1, 0.9], [0.14, 0.86]] }), mat));
    }
    const foot = new THREE.Group(); foot.position.y = drop; last.add(foot);
    const fp = [LP([[-0.13, 0, 0, 0.03, 0.04, 0.05], [-0.04, 0, 0, 0.11, 0.105, 0.15], [0.1, 0, 0, 0.115, 0.114, 0.18], [0.2, -0.01, 0, 0.09, 0.1, 0.17], [0.27, -0.02, 0, 0.03, 0.05, 0.1]], 0xece6d6,
      { len: 16, rad: 20, seg: [[4, 8], [3, 6], [3, 6], [3, 6], [2, 5]], span: [null, null, null, null, [0.1, 1]] })];
    // 趾与爪：四趾 → 三趾 → 只留爪 → 都不要
    const nToe = q(4, 4, 3, 3, 0, 0), nClaw = q(4, 4, 3, 3, 3, 0), zs = n => n === 4 ? [-0.125, -0.043, 0.043, 0.125] : [-0.11, 0, 0.11];
    for (const z of zs(nToe || nClaw)) {
      const fx = 0.25 - Math.abs(z) * 0.3;
      if (nToe) fp.push(P(SQ(nToe === 4 ? 0.062 : 0.072, q([14, 10], [5, 3], [4, 2])), 0xece6d6, fx, -0.045, z, 0, 0, 0, 1.25, 0.95, 0.9));
      if (nClaw) fp.push(P(new THREE.ConeGeometry(q(0.02, 0.02, 0.024, 0.026, 0.03), 0.09, q(8, 3), 1, !!LOD), clawCol, fx + 0.085, -0.075, z, 0, 0, -PI / 2 - 0.55));
    }
    if (GOLD && upto(3)) { const as = q([8, 20], [3, 8], [3, 8], [3, 6]); fp.push(P(new THREE.TorusGeometry(0.108, 0.03, as[0], as[1]), 0xd6a43e, 0, 0.13, 0, PI / 2)); } // 金甲款：脚踝一道金镯
    const paw = inkedMerged(fp); paw.scale.setScalar(PAW / 0.114); foot.add(paw);   // 脚掌放大一号
    return { hip, knee, hock, foot, front };
  }

  function makeTiger(opt = {}) {
    const g = new THREE.Group(), bodyPivot = new THREE.Group(); g.add(bodyPivot); bodyPivot.name = 'bp';
    const torsoGeo = loft(TORSO, { len: 96, rad: 56, seg: [[20, 16], [15, 12], [15, 12], [12, 12], [7, 8]], mod: torsoMod });
    bodyPivot.add(inked(torsoGeo, torsoMat()));

    const neck = new THREE.Group(); neck.name = 'neck'; neck.position.set(1.0, 1.3, 0); bodyPivot.add(neck);
    const neckGeo = loft([[-0.22, -0.09, 0, 0.28, 0.34, 0.34], [0, 0, 0, 0.33, 0.37, 0.36], [0.25, 0.09, 0, 0.31, 0.33, 0.34], [0.45, 0.16, 0, 0.27, 0.28, 0.3], [0.58, 0.2, 0, 0.08, 0.08, 0.08]], { len: 24, rad: 36, seg: [[5, 14], [4, 10], [4, 10], [3, 10], [3, 8]], span: [null, null, null, [0.04, 0.9], [0.04, 0.9]] });
    neck.add(inked(neckGeo, neckMat()));

    // ----- 头 -----
    const head = new THREE.Group(); head.name = 'head'; head.position.set(0.46, 0.16, 0); neck.add(head);
    const HEAD = [
      [-0.37, 0, 0, 0.09, 0.09, 0.1], [-0.27, 0, 0, 0.29, 0.26, 0.31], [-0.12, 0.01, 0, 0.38, 0.3, 0.39, 2.2], [0.05, 0.02, 0, 0.385, 0.29, 0.385, 2.2], [0.17, 0.02, 0, 0.34, 0.25, 0.34, 2.2],
      [0.26, -0.01, 0, 0.23, 0.2, 0.26, 2.2], [0.35, -0.03, 0, 0.175, 0.155, 0.225, 2.4], [0.44, -0.04, 0, 0.155, 0.145, 0.21, 2.5], [0.51, -0.05, 0, 0.13, 0.125, 0.17, 2.3], [0.56, -0.06, 0, 0.035, 0.04, 0.05],
    ];
    const headGeo = loft(HEAD, { len: 72, rad: 56, seg: [[18, 16], [12, 12], [12, 12], [10, 12], [6, 8]] }), hat = headGeo.userData.at;
    head.add(inked(headGeo, headMat()));
    const hp = [];
    for (const s of [1, -1]) {
      // 眼：琥珀色眼球、竖瞳、一点高光。低档的头是折面，眼球往里收一点免得浮在外面
      const eh = hat(0.5 + s * EYE.u, EYE.v), e = eh.p.lerp(eh.c, q(0, 0, 0.02, 0.04, 0.06, 0.09));
      hp.push(P(SQ(0.056, q([18, 14], [8, 6], [6, 4], [5, 3], [4, 2])), 0xd9a845, e.x - 0.014, e.y - 0.004, e.z - s * 0.014));
      if (upto(4)) hp.push(P(SQ(0.028, q([12, 10], [5, 4], [4, 2])), 0x121110, e.x + 0.03, e.y + 0.004, e.z + s * 0.012, 0, 0, 0, 0.6, 1.25, 0.8));
      if (upto(0)) hp.push(P(SG(0.01, 8, 6), 0xffffff, e.x + 0.05, e.y + 0.024, e.z + s * 0.02));
      // 眉骨压下来一点，显得凶
      if (upto(1)) hp.push(LP([[e.x - 0.08, e.y + 0.035, e.z + s * 0.06, 0.02, 0.02, 0.03], [e.x - 0.01, e.y + 0.05, e.z + s * 0.01, 0.035, 0.03, 0.05], [e.x + 0.07, e.y + 0.035, e.z - s * 0.045, 0.02, 0.02, 0.03]], 0xece6d6, { len: 10, rad: 12, seg: [[3, 5], [2, 4]] }));
      // 耳：圆耳，耳背墨色带一块白斑
      hp.push(P(SQ(0.15, q([20, 14], [8, 5], [6, 4], [5, 3], [4, 3], [4, 2])), 0xece6d6, -0.1, 0.35, s * 0.26, s * 0.3, 0, 0, 0.42, 1, 0.9));
      if (upto(3)) hp.push(P(SQ(0.108, q([16, 12], [6, 4], [5, 3], [4, 2])), 0xcfa894, -0.068, 0.345, s * 0.26, s * 0.3, 0, 0, 0.3, 0.95, 0.85));
      if (upto(1)) hp.push(P(SQ(0.126, q([16, 12], [6, 4])), 0x1f1d1c, -0.134, 0.36, s * 0.265, s * 0.3, 0, 0, 0.3, 0.95, 0.88));
      if (upto(1)) hp.push(P(SG(0.048, 10, 8), 0xf6f1e6, -0.162, 0.37, s * 0.27, s * 0.3, 0, 0, 0.3, 1, 1));
      // 吻部两团须垫
      if (upto(3)) hp.push(P(SQ(0.1, q([18, 14], [6, 4], [5, 3], [4, 2])), 0xf6f1e6, 0.43, -0.105, s * 0.09, 0, 0, 0, 1.15, 0.85, 0.95));
      // 颊毛：五簇，往后往下炸开（低档按主次留四、三、两簇）
      const tufts = [[-0.08, -0.14, 0.31, 0.85, 0.36], [-0.02, -0.06, 0.32, 0.5, 0.34], [-0.14, -0.2, 0.27, 1.2, 0.33], [0.02, 0.04, 0.33, 0.2, 0.26], [-0.2, -0.22, 0.2, 1.55, 0.26]];
      tufts.slice(0, q(5, 5, 4, 3, 2, 2)).forEach(([x, y, z, down, len], i) => {
        const dir = V(-0.35 - i * 0.05, -Math.sin(down) * 0.9, s * Math.cos(down)).normalize();
        const rot = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
        const base = V(x, y, s * z).addScaledVector(dir, len * 0.3);
        hp.push({ geo: new THREE.ConeGeometry(q(0.11, 0.11, 0.115, 0.12, 0.13, 0.13), len, q(14, 7, 5, 4, 4, 3), q(3, 1), !!LOD), color: i % 2 ? 0xece6d6 : 0xf6f1e6, m: new THREE.Matrix4().compose(base, rot, V(1, 1, 0.45)) });
      });
      // 上犬齿
      hp.push(P(new THREE.ConeGeometry(0.03, 0.13, q(10, 5, 4, 3), 1, !!LOD), 0xf6f1e6, 0.43, -0.215, s * 0.115, PI, 0, -0.12));
    }
    if (upto(3)) hp.push(P(SQ(0.06, q([16, 12], [7, 5], [5, 3], [4, 2])), 0x8a4a40, 0.535, -0.035, 0, 0, 0, 0, 0.75, 0.7, 1.25)); // 鼻头
    if (upto(2)) hp.push(P(SQ(0.2, q([16, 10], [7, 4], [5, 3])), 0x7e1e14, 0.3, -0.166, 0, 0, 0, 0, 0.95, 0.08, 0.66)); // 上颚
    head.add(inkedMerged(hp));
    // 胡须：细墨线，不描边
    const wp = [];
    for (const s of [1, -1]) for (let i = 0, nw = q(4, 4, 2, 0); i < nw; i++) {
      const wg = new THREE.CylinderGeometry(0.004, 0.0015, 0.42, q(5, 3), 1, true); wg.translate(0, 0.21, 0);
      wp.push(P(wg, 0x2a2826, 0.44 - i * 0.012, -0.1 + i * 0.012, s * 0.165, s * (1.25 + i * 0.07), 0, 0.25 - i * 0.2));
    }
    if (wp.length) head.add(new THREE.Mesh(Core.merge(wp), Models.vcMat));   // 八根并成一个网格
    // 下颌（可张合）
    const jaw = new THREE.Group(); jaw.name = 'jaw'; jaw.position.set(0.0, -0.17, 0); head.add(jaw);
    const jp = [LP([[-0.04, -0.06, 0, 0.03, 0.04, 0.15], [0.13, -0.07, 0, 0.05, 0.09, 0.2], [0.3, -0.075, 0, 0.05, 0.085, 0.18], [0.44, -0.075, 0, 0.045, 0.07, 0.15], [0.505, -0.07, 0, 0.012, 0.02, 0.04]], 0xf6f1e6,
      { len: 24, rad: 24, seg: [[7, 8], [4, 6], [4, 6], [3, 6], [3, 4]], span: [null, null, null, [0.1, 1], [0.1, 1]] })];
    if (upto(1)) jp.push(LP([[0.02, -0.03, 0, 0.012, 0.01, 0.08], [0.22, -0.02, 0, 0.022, 0.02, 0.1], [0.38, -0.022, 0, 0.02, 0.02, 0.075], [0.45, -0.03, 0, 0.006, 0.006, 0.02]], 0xc0605a, { len: 14, rad: 14, seg: [[3, 5], [2, 4]] })); // 舌
    if (upto(3)) for (const z of [0.088, -0.088]) jp.push(P(new THREE.ConeGeometry(0.024, 0.09, q(10, 5, 4, 3), 1, !!LOD), 0xf6f1e6, 0.41, 0.01, z));
    for (const z of q([-0.045, -0.015, 0.015, 0.045], [-0.03, 0.03], [])) jp.push(P(CG(0.011, 0.035, 6), 0xf6f1e6, 0.478, -0.012, z));
    jaw.add(inkedMerged(jp));

    const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(-1.12, 1.3, 0); bodyPivot.add(tail);
    const tp = TAIL[opt.tail || 'low'];
    tail.add(inked(loft(tp.map((p, i) => [p.x, p.y, p.z, ...(i === tp.length - 1 ? [0.03, 0.03, 0.03] : i === 0 ? [0.1, 0.1, 0.1] : i === tp.length - 2 ? [0.092, 0.092, 0.092] : [0.082, 0.082, 0.082])]), { len: 64, rad: 20, seg: [[16, 8], [11, 6], [11, 6], [9, 6], [5, 4]] }), tailMat()));

    const lm = legMat(), legs = [];
    for (const [front, sgn] of [[1, 1], [1, -1], [0, 1], [0, -1]]) {
      const Lg = makeLeg(!!front, lm, 0x3a3634), a = front ? FORE : HIND, i = legs.length;
      Lg.hip.position.set(a.x, a.y, sgn * a.z); bodyPivot.add(Lg.hip);
      Lg.hip.name = 'hip' + i; Lg.knee.name = 'knee' + i; Lg.foot.name = 'foot' + i; if (Lg.hock) Lg.hock.name = 'hock' + i; legs.push(Lg);
    }
    const o = { group: g, bodyPivot, neck, head, jaw, tail, legs, torsoAt: torsoGeo.userData.at, neckAt: neckGeo.userData.at, headAt: hat };
    applyPose({ bp: bodyPivot, neck, head, jaw, tail, legs }, { t: 0 });     // 原型摆成静止的站姿
    return o;
  }

  // ---------- 织物贴图：底色 + 一道回纹镶边 ----------
  function clothMat(base, edge, line, band = 0.14, cols = 14) {
    return once(['cloth', base, edge, line, band, cols].join('|'), () => clothTex(base, edge, line, band, cols));
  }
  function clothTex(base, edge, line, band, cols) {
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
    const at = tiger.torsoAt, U0 = 0.2, U1 = 0.8, T0 = o.t0 ?? 0.33, T1 = o.t1 ?? 0.64, nu = q(40, 12, 8, 8, 6, 5), nt = q(28, 8, 5, 4, 3, 2), nf = q(13, 6, 5, 4, 3, 0), off = q(0.03, 0.03, 0.036, 0.04, 0.046, 0.055); // 低档躯干是折面，鞍鞯垫高一点才不穿帮
    const pos = [], uv = [], idx = [];
    const pt = (u, t, d) => { const s0 = at(u, t), n = s0.p.clone().sub(s0.c); n.x = 0; return s0.p.addScaledVector(n.normalize(), d); };
    for (let i = 0; i <= nt; i++) for (let j = 0; j <= nu; j++) {
      const u = U0 + (U1 - U0) * j / nu, t = T0 + (T1 - T0) * i / nt, v0 = pt(u, t, off);
      pos.push(v0.x, v0.y, v0.z);
      const eu = Math.min(j, nu - j) / nu, et = Math.min(i, nt - i) / nt; // 贴图：离边越近 v 越靠近镶边
      uv.push(j / nu, 1 - Math.min(1, Math.min(eu * 2.0, et * 1.6) * 6.5));
    }
    for (let i = 0; i < nt; i++) for (let j = 0; j < nu; j++) { const a = i * (nu + 1) + j, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const grp = new THREE.Group();
    const m = new THREE.Mesh(geo, clothMat(o.base, o.edge, o.line, 0.3, 0)); m.material.side = THREE.DoubleSide; m.castShadow = true; grp.add(m);
    const fr = []; // 两侧下摆的流苏
    if (nf) for (const u of [U0, U1]) for (let i = 0; i <= nf; i++) { const f = pt(u, T0 + (T1 - T0) * i / nf, off); fr.push(P(new THREE.ConeGeometry(q(0.022, 0.022, 0.026, 0.03, 0.034), 0.13, q(8, 4, 3), 1, !!LOD), o.fringe, f.x, f.y - 0.06, f.z)); if (upto(1)) fr.push(P(SQ(0.02, q([8, 6], [4, 2])), o.trim, f.x, f.y + 0.005, f.z)); }
    if (fr.length) grp.add(inkedMerged(fr));
    return grp;
  }
  // 绕躯干一圈的带子（攀胸、肚带），带上钉金泡
  function strap(tiger, t, color, stud, w = 0.045) {
    const at = tiger.torsoAt, parts = [], n = q(44, 16, 12, 12); // 分段跟躯干环向对齐
    const ring = (dt, d) => Array.from({ length: n + 1 }, (_, j) => { const s0 = at(j / n, t + dt), nn = s0.p.clone().sub(s0.c).normalize(); return s0.p.addScaledVector(nn, d); });
    const a = ring(-w / 2.5, 0.022), b = ring(w / 2.5, 0.022), pos = [], idx = [];
    for (let j = 0; j <= n; j++) { pos.push(a[j].x, a[j].y, a[j].z, b[j].x, b[j].y, b[j].z); }
    for (let j = 0; j < n; j++) { const k = j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    parts.push(P(geo, color));
    if (upto(1)) for (let j = 2; j < n; j += 4) { const s0 = at(j / n, t), nn = s0.p.clone().sub(s0.c).normalize(); const p = s0.p.addScaledVector(nn, 0.03); parts.push(P(SQ(0.024, q([10, 8], [4, 2])), stud, p.x, p.y, p.z)); }
    return inkedMerged(parts);
  }

  // ---------- 文臣 ----------
  // look: robe 上衣、skirt 下裳、edge 领袖缘、sash 大带
  function makeMinisterFigure(side, look) {
    const c = SIDE[side], g = new THREE.Group(), parts = [], robeN = hex(look.robe), edgeN = hex(look.edge);
    const nPleat = q(18, 12, 10, 8, 6, 0), pleat = (u, t) => nPleat ? 0.035 * Math.sin(u * 2 * PI * nPleat) * sstep(0.25, 0.9, t) : 0;
    // 下裳：罩住虎背往两边垂，带褶
    g.add(inked(loft([[0, 0.68, 0, 0.16, 0.16, 0.2], [0, 0.5, 0, 0.2, 0.2, 0.25], [0.02, 0.25, 0, 0.3, 0.3, 0.4], [0.03, 0, 0, 0.38, 0.4, 0.5], [0.03, -0.14, 0, 0.41, 0.43, 0.54], [0.03, -0.2, 0, 0.41, 0.43, 0.55]],
      { len: 40, rad: 72, seg: [[7, 24], [5, 20], [4, 16], [4, 12], [2, 8]], mod: pleat }), clothMat(look.skirt, look.edge, look.line, 0.13, 18)));
    // 上身、交领
    parts.push(LP([[0, 0.56, 0, 0.17, 0.16, 0.2], [0, 0.8, 0, 0.19, 0.17, 0.25], [0, 0.98, 0, 0.17, 0.16, 0.29], [0, 1.06, 0, 0.1, 0.1, 0.19], [0, 1.11, 0, 0.04, 0.04, 0.07]], robeN, { len: 28, rad: 32, seg: [[6, 12], [5, 10], [4, 8], [3, 8], [3, 6]] }));
    for (const s of [1, -1]) {
      parts.push(LP([[0.06, 1.07, s * 0.1, 0.028, 0.028, 0.045], [0.16, 0.96, s * 0.07, 0.03, 0.03, 0.05], [0.19, 0.8, -s * 0.02, 0.03, 0.03, 0.05], [0.185, 0.66, -s * 0.1, 0.025, 0.025, 0.045]], s > 0 ? edgeN : look.inner, { len: 16, rad: 10, seg: [[5, 4], [4, 3], [4, 3], [3, 3], [2, 3]], side: V(1, 0, 0) }));
    }
    parts.push(P(new THREE.CylinderGeometry(0.06, 0.07, 0.1, q(16, 6, 6, 5, 5, 4), 1, !!LOD), C.skin, 0, 1.12, 0));
    // 大带、带钩、垂绶、玉佩
    const sashSeg = q([12, 40], [5, 16], [3, 12], [3, 10], [3, 8], [3, 5]);
    parts.push(P(new THREE.TorusGeometry(0.2, 0.045, sashSeg[0], sashSeg[1]), look.sash, 0, 0.62, 0, PI / 2, 0, 0, 1, 1.18, 1.25));
    if (upto(2)) parts.push(P(SQ(0.045, q([12, 10], [5, 4], [4, 2])), c.trim, 0.2, 0.62, 0, 0, 0, 0, 0.6, 1, 1.5));
    const ribSeg = { len: 14, rad: 8, seg: [[4, 4], [3, 3], [3, 3], [2, 3], [2, 3]], side: V(1, 0, 0) };
    parts.push(LP([[0.2, 0.6, 0.06, 0.008, 0.008, 0.035], [0.27, 0.4, 0.08, 0.008, 0.008, 0.04], [0.36, 0.18, 0.1, 0.008, 0.008, 0.045], [0.41, 0.02, 0.11, 0.008, 0.008, 0.05]], look.sash, ribSeg));
    if (upto(3)) parts.push(LP([[0.2, 0.6, -0.02, 0.008, 0.008, 0.03], [0.26, 0.42, -0.03, 0.008, 0.008, 0.035], [0.33, 0.22, -0.04, 0.008, 0.008, 0.04], [0.37, 0.08, -0.04, 0.008, 0.008, 0.045]], look.sash, ribSeg));
    if (upto(2)) parts.push(P(new THREE.CylinderGeometry(0.006, 0.006, 0.2, q(6, 4, 3), 1, LOD >= 2), 0x8e2016, 0.12, 0.5, 0.26), P(new THREE.ConeGeometry(0.025, 0.12, q(8, 4, 3), 1, !!LOD), 0x8e2016, 0.12, 0.24, 0.265));
    if (upto(3)) { const js = q([8, 20], [3, 8], [3, 6]); parts.push(P(new THREE.TorusGeometry(0.05, 0.018, js[0], js[1]), 0xa8c8ae, 0.12, 0.36, 0.265, 0, PI / 2, 0)); }
    // 广袖：右臂前伸持杖，左臂收在胸前托虎符；袖口往下坠成一个兜
    const sleeve = pts => inked(loft(pts, { len: 30, rad: 28, seg: [[8, 10], [5, 8], [5, 8], [4, 6], [3, 5]] }), clothMat(look.robe, look.edge, look.line, 0.16, 10));
    g.add(sleeve([[-0.02, 1.0, 0.24, 0.09, 0.09, 0.09], [0.08, 0.94, 0.34, 0.11, 0.14, 0.11], [0.22, 0.88, 0.42, 0.11, 0.26, 0.12], [0.33, 0.9, 0.46, 0.1, 0.36, 0.11], [0.37, 0.9, 0.47, 0.06, 0.3, 0.07]]));
    g.add(sleeve([[-0.02, 1.0, -0.24, 0.09, 0.09, 0.09], [0.06, 0.9, -0.33, 0.11, 0.14, 0.11], [0.18, 0.8, -0.3, 0.11, 0.24, 0.12], [0.27, 0.8, -0.2, 0.1, 0.3, 0.11], [0.3, 0.8, -0.17, 0.06, 0.24, 0.07]]));
    const hand = q([12, 10], [5, 4], [5, 3], [4, 2]);
    parts.push(P(SQ(0.05, hand), C.skin, 0.4, 0.92, 0.47, 0, 0, 0, 1.1, 1, 0.9), P(SQ(0.05, hand), C.skin, 0.33, 0.83, -0.15, 0, 0, 0, 1.1, 0.9, 1));
    // 虎符：左手托着的一枚小金虎
    if (upto(4)) parts.push(P(SQ(0.05, q([12, 8], [5, 3], [4, 2])), 0xd6a43e, 0.37, 0.89, -0.14, 0, 0, 0, 1.5, 0.75, 0.6));
    if (upto(2)) parts.push(P(SQ(0.03, q([10, 8], [5, 3], [4, 2])), 0xd6a43e, 0.44, 0.91, -0.14));
    if (upto(1)) parts.push(P(YG(0.008, 0.008, 0.07, 6), 0xd6a43e, 0.3, 0.915, -0.14, 0, 0, 0.9));
    // 头：面、鼻、眉眼、耳、三绺须
    const hy = 1.27;
    parts.push(P(SQ(0.135, q([28, 20], [12, 8], [10, 6], [8, 5], [7, 4], [6, 3])), C.skin, 0, hy, 0, 0, 0, 0, 0.95, 1.1, 0.88));
    if (upto(3)) parts.push(P(new THREE.ConeGeometry(0.022, 0.07, q(8, 4, 3), 1, !!LOD), C.skin, 0.125, hy - 0.005, 0, 0, 0, -0.25));
    for (const s of [1, -1]) {
      if (upto(3)) parts.push(P(SQ(0.014, q([8, 6], [5, 3], [4, 2])), 0x151413, 0.112, hy + 0.03, s * 0.05, 0, 0, 0, 0.6, 0.55, 1.6));
      if (upto(2)) parts.push(P(new THREE.BoxGeometry(0.012, 0.01, 0.055), 0x151413, 0.108, hy + 0.058, s * 0.052, s * 0.2));
      if (upto(2)) parts.push(P(SQ(0.03, q([10, 8], [5, 3], [4, 2])), C.skin, -0.005, hy, s * 0.118, 0, 0, 0, 0.7, 1.2, 0.5));
      if (upto(3)) parts.push(LP([[0.118, hy - 0.045, s * 0.02, 0.008, 0.008, 0.012], [0.125, hy - 0.07, s * 0.06, 0.01, 0.01, 0.014], [0.11, hy - 0.17, s * 0.085, 0.004, 0.004, 0.006]], 0x151413, { len: 10, rad: 8, seg: [[3, 4], [3, 3], [2, 3]], side: V(1, 0, 0) })); // 髭
    }
    parts.push(LP([[0.095, hy - 0.1, 0, 0.03, 0.03, 0.045], [0.115, hy - 0.2, 0, 0.03, 0.03, 0.04], [0.135, hy - 0.34, 0, 0.018, 0.018, 0.022], [0.14, hy - 0.44, 0, 0.004, 0.004, 0.005]], 0x151413, { len: 16, rad: 12, seg: [[5, 6], [4, 5], [3, 4], [3, 3], [2, 3]] })); // 长须
    // 发、进贤冠（展筒前高后低）、簪、缨
    parts.push(P(SQ(0.14, q([24, 16], [10, 7], [8, 5], [7, 4], [6, 3], [5, 3]), 0, PI * 2, 0, PI * 0.46), 0x151413, -0.018, hy + 0.012, 0, 0, 0, 0.6, 0.96, 1.08, 0.9));
    if (upto(2)) parts.push(P(SQ(0.05, q([12, 10], [5, 4], [4, 2])), 0x151413, -0.03, hy + 0.17, 0));
    const cap = new THREE.Shape(); cap.moveTo(-0.11, 0); cap.lineTo(0.1, 0); cap.lineTo(0.115, 0.2); cap.lineTo(0.06, 0.23); cap.lineTo(-0.02, 0.12); cap.lineTo(-0.12, 0.09); cap.closePath();
    const capGeo = new THREE.ExtrudeGeometry(cap, LOD ? { depth: 0.124, bevelEnabled: false } : { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 }); capGeo.translate(0, 0, LOD ? -0.062 : -0.05);
    parts.push(P(capGeo, look.cap, -0.01, hy + 0.115, 0));
    if (upto(2)) { const bs = q([8, 28], [3, 11], [3, 8]); parts.push(P(new THREE.TorusGeometry(0.105, 0.016, bs[0], bs[1]), look.capBand, -0.005, hy + 0.115, 0, PI / 2, 0, 0, 1, 0.92, 1)); }
    if (upto(2)) parts.push(P(new THREE.CylinderGeometry(0.008, 0.008, 0.34, q(8, 4, 3), 1, LOD >= 2), c.trim, -0.03, hy + 0.17, 0, PI / 2));
    if (upto(1)) parts.push(P(SG(0.016, 8, 6), c.trim, -0.03, hy + 0.17, 0.17));
    if (upto(1)) for (const s of [1, -1]) parts.push(LP([[0.0, hy + 0.11, s * 0.105, 0.006, 0.006, 0.006], [0.04, hy - 0.04, s * 0.122, 0.006, 0.006, 0.006], [0.08, hy - 0.13, s * 0.06, 0.006, 0.006, 0.006], [0.09, hy - 0.15, 0, 0.006, 0.006, 0.006]], 0x8e2016, { len: 16, rad: 6, seg: [[6, 3], [4, 3]], side: V(1, 0, 0) }));
    g.add(inkedMerged(parts));
    return g;
  }

  // 节杖：竹竿分节，三重旄，每重一圈垂穗，杖首铜帽
  // gold：四级的金色权杖——杖身、竹节、旄顶、杖首全部鎏金，旄穗仍是朱红。bare：不带旄的纯金权杖（备选）
  function makeStaff(side, len = 2.9, gold = false, bare = false) {
    const c = SIDE[side], strands = [], pole = gold ? 0xd6a43e : 0x8a6a3a, knot = gold ? 0xf7dc8c : 0x5a4424, capC = gold ? 0xd6a43e : 0xb0301f, trim = gold ? 0xf7dc8c : c.trim, k = gold ? 1.2 : 1;
    const parts = [P(new THREE.CylinderGeometry(0.022 * k, 0.026 * k, len, q(14, 6, 5, 4, 4, 3), 1, LOD >= 2), pole, 0, len / 2, 0)];
    if (upto(2)) { const ns = q([6, 16], [3, 6], [3, 4]); for (let y = 0.2; y < len - 0.1; y += q(0.27, 0.54, 0.9)) parts.push(P(new THREE.TorusGeometry(0.026 * k, 0.006 * k, ns[0], ns[1]), knot, 0, y, 0, PI / 2)); }
    if (!bare) [len - 0.32, len - 0.68, len - 1.04].forEach((y, kk) => {
      const r0 = 0.085 - kk * 0.006;
      if (upto(3)) parts.push(P(SQ(r0, q([20, 12], [8, 3], [6, 2], [5, 2]), 0, PI * 2, 0, PI / 2), capC, 0, y, 0, 0, 0, 0, 1, 0.75, 1));
      if (upto(2)) { const gs = q([8, 20], [3, 8], [3, 5]); parts.push(P(new THREE.TorusGeometry(r0 * 0.55, 0.012, gs[0], gs[1]), trim, 0, y + r0 * 0.6, 0, PI / 2)); }
      if (upto(3)) { // 垂穗：两圈 → 一圈
        for (let ring = 0, rings = q(2, 2, 2, 1), nsd = q(16, 8, 6, 7); ring < rings; ring++) for (let i = 0; i < nsd; i++) {
          const a = (i + ring * 0.5) / nsd * PI * 2, rr = r0 * (0.92 - ring * 0.38), hl = 0.3 - ring * 0.04 + (i % 3) * 0.015;
          strands.push(P(new THREE.ConeGeometry(q(0.02, 0.03, 0.034, 0.04), hl, q(6, 3), 1, !!LOD), ring ? 0x8e2016 : 0xb0301f, Math.cos(a) * rr * 1.08, y - hl / 2 + 0.02, Math.sin(a) * rr * 1.08, Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16));
        }
      } else parts.push(P(new THREE.ConeGeometry(r0 * 1.3, 0.34, q(6, 6, 6, 6, 6, 5), 1, true), 0xb0301f, 0, y - 0.13, 0)); // 最低两档：整重旄并成一个喇叭形
    });
    if (gold) { // 金杖的杖首：一颗金珠托在莲座上，顶上出尖；bare 款珠子更大，下面多三道箍
      const R0 = bare ? 0.11 : 0.07, os = q([18, 14], [8, 6], [7, 5], [6, 4], [5, 3], [4, 2]);
      parts.push(P(new THREE.ConeGeometry(R0 * 0.9, R0 * 1.2, q(12, 6, 6, 5, 4, 4), 1, true), 0xd6a43e, 0, len + R0 * 0.3, 0, PI));
      parts.push(P(SQ(R0, os), 0xf7dc8c, 0, len + R0 * 1.25, 0), P(new THREE.ConeGeometry(R0 * 0.34, R0 * 1.7, q(8, 4, 4, 4, 3), 1, true), 0xd6a43e, 0, len + R0 * 2.75, 0));
      if (bare) { const bs = q([8, 20], [3, 8], [3, 6], [3, 6]); if (upto(3)) for (const y of [len - 0.12, len - 0.3, len - 0.48]) parts.push(P(new THREE.TorusGeometry(0.045, 0.016, bs[0], bs[1]), 0xf7dc8c, 0, y, 0, PI / 2)); parts.push(P(new THREE.ConeGeometry(0.04, 0.5, q(8, 5, 4, 4, 3), 1, true), 0xb0301f, 0, len - 0.78, 0)); }
    } else if (upto(1)) parts.push(P(new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.04, 0.03], [0.026, 0.06], [0.03, 0.09], [0.012, 0.13], [0.018, 0.16], [0, 0.2]].map(p => new THREE.Vector2(p[0], p[1])), q(16, 6)), c.trim, 0, len - 0.02, 0));
    else parts.push(P(new THREE.ConeGeometry(0.036, 0.2, q(6, 6, 5, 4, 4, 3), 1, true), c.trim, 0, len + 0.08, 0));
    const g = inkedMerged(parts);
    if (strands.length) { const sm = new THREE.Mesh(Core.merge(strands), Models.vcMat); sm.castShadow = true; g.add(sm); }
    return g;
  }
  // 给带贴图的材质加上金属画法：和 models.js 的 vcMat 同一套（映天光、一道柔光箱亮带、边缘泛光），只是金色取自贴图；深色的线不算金，照常画成墨线
  function goldify(m) {
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `{
        vec3 vc = diffuseColor.rgb; float vr = max(vc.r, 1e-3);
        float gold = smoothstep(0.3, 0.42, vc.r) * smoothstep(0.42, 0.52, vc.g / vr) * (1.0 - smoothstep(0.3, 0.42, vc.b / vr));
        if (gold > 0.01) {
          vec3 N = normalize(normal), V = normalize(vViewPosition), Rf = reflect(-V, N);
          vec3 Rw = normalize((vec4(Rf, 0.0) * viewMatrix).xyz);
          float sky = smoothstep(-0.35, 0.85, Rw.y);
          float band = smoothstep(0.3, 0.4, Rw.y) * (1.0 - smoothstep(0.6, 0.72, Rw.y)) * (0.55 + 0.45 * sin(atan(Rw.z, Rw.x) * 2.0 + 0.6));
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 metal = vc * (0.3 + 1.25 * sky) + vec3(1.0, 0.92, 0.72) * (band * 0.85 + fres * 0.45);
          outgoingLight = mix(outgoingLight, metal, gold);
        }
      }
      #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'tigerGold';
    return m;
  }
  // 札甲的贴图：一排排上平下圆的甲片，上排压下排，每片一颗钉。画成可平铺的一小块
  function armorMat() {
    return once('armor', () => {
      const t = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#b8862e'; g.fillRect(0, 0, w, h);
        const cw = w / 2, rh = h / 2;
        for (let r = 2; r >= -1; r--) for (let c = -1; c < 3; c++) {
          const x = c * cw + (r & 1 ? cw / 2 : 0), y = r * rh, b = y + rh * 1.16, m = y + rh * 0.6;
          g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + cw - 3, y); g.lineTo(x + cw - 3, m); g.quadraticCurveTo(x + cw - 3, b, x + cw / 2, b); g.quadraticCurveTo(x + 3, b, x + 3, m); g.closePath();
          g.fillStyle = (r + c) & 1 ? '#d6a43e' : '#cf9c38'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#5a3f12'; g.stroke();
          g.beginPath(); g.moveTo(x + 13, m); g.quadraticCurveTo(x + 13, b - 12, x + cw / 2, b - 12); g.quadraticCurveTo(x + cw - 13, b - 12, x + cw - 13, m); g.lineWidth = 5; g.strokeStyle = '#f7dc8c'; g.stroke();   // 片缘一道亮边
          g.fillStyle = '#5a3f12'; g.beginPath(); g.arc(x + cw / 2, y + rh * 0.3, 7, 0, 7); g.fill(); g.fillStyle = '#f7dc8c'; g.beginPath(); g.arc(x + cw / 2 - 2, y + rh * 0.3 - 2, 3, 0, 7); g.fill();   // 钉
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return goldify(toon(0xffffff, { map: t, unique: true }));
    });
  }
  // 金甲：贴着放样曲面取几块，往外垫出厚度，合成一个网格；甲片从脊背往两侧一排排垂下去，四边有立沿，下摆压一道朱缘
  // specs: [at, u0, u1, t0, t1, nu, nt, 厚度, 绕身一圈铺几排, 沿身铺几列]
  function armor(specs) {
    const pos = [], nor = [], uv = [], idx = [], rim = [[], []], hems = [];
    const push = (k, a, b, c, d) => { for (const v of [a, b, c, b, d, c]) { rim[0].push(v[0].x, v[0].y, v[0].z); rim[1].push(v[1].x, v[1].y, v[1].z); } };
    for (const [at, u0, u1, t0, t1, nu, nt, off, ru, rt] of specs) {
      const base = pos.length / 3, U = j => u0 + (u1 - u0) * j / nu, T = i => t0 + (t1 - t0) * i / nt;
      const thick = i => off * (0.8 + 0.35 * Math.sin(PI * i / nt));                       // 中间鼓、两头略收，像一整块拱起来的甲
      const pt = (u, t, d) => { const s0 = at(u, t), n = s0.p.clone().sub(s0.c).normalize(); return [s0.p.addScaledVector(n, d), n]; };
      for (let i = 0; i <= nt; i++) for (let j = 0; j <= nu; j++) {
        const u = U(j), [p, n] = pt(u, T(i), thick(i)), d = Math.abs(u - Math.floor(u) - 0.5);   // d：离脊背多远
        pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(T(i) * rt, -d * ru);
      }
      for (let i = 0; i < nt; i++) for (let j = 0; j < nu; j++) { const a = base + i * (nu + 1) + j, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      // 立沿：从甲面折下来贴到虎身上，看得出厚度
      const IN = 0.012;
      for (let j = 0; j < nu; j++) { push(0, pt(U(j), T(nt), IN), pt(U(j + 1), T(nt), IN), pt(U(j), T(nt), thick(nt)), pt(U(j + 1), T(nt), thick(nt))); push(0, pt(U(j), T(0), IN), pt(U(j), T(0), thick(0)), pt(U(j + 1), T(0), IN), pt(U(j + 1), T(0), thick(0))); }
      for (let i = 0; i < nt; i++) { push(0, pt(U(nu), T(i), IN), pt(U(nu), T(i), thick(i)), pt(U(nu), T(i + 1), IN), pt(U(nu), T(i + 1), thick(i + 1))); push(0, pt(U(0), T(i), IN), pt(U(0), T(i + 1), IN), pt(U(0), T(i), thick(i)), pt(U(0), T(i + 1), thick(i + 1))); }
      // 朱缘：压在两条下摆的甲面上
      const hw = 0.035;
      for (let i = 0; i < nt; i++) for (const [a, b] of [[u0, u0 + hw], [u1 - hw, u1]]) { const A = pt(a, T(i), thick(i) + 0.012), B = pt(a, T(i + 1), thick(i + 1) + 0.012), Cc = pt(b, T(i), thick(i) + 0.012), Dd = pt(b, T(i + 1), thick(i + 1) + 0.012); for (const v of [A, B, Cc, B, Dd, Cc]) hems.push(v); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const vc = (P3, N3, col) => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(N3, 3)); return P(gg, col); };
    const hp = [], hn = []; for (const v of hems) { hp.push(v[0].x, v[0].y, v[0].z); hn.push(v[1].x, v[1].y, v[1].z); }
    const g = inked(geo, armorMat()), rm = new THREE.Mesh(Core.merge([vc(rim[0], rim[1], 0xb8862e), vc(hp, hn, 0x8e1c12)]), Models.vcMat); rm.castShadow = true; g.add(rm);   // 立沿和朱缘不描边，省一个网格
    return g;
  }
  // 鞍座的锦面。普通款：菱格纹，格点一颗小花，四周一圈镶边。
  // rich（四级）：连钱纹（一个个相套的金钱），宽金边里嵌一排联珠，四角各一朵如意云头；金的地方会反光
  function seatMat(base, edge, line, rich) {
    return once(['seat', base, edge, line, rich ? 1 : 0].join('|'), () => {
      const m = toon(0xffffff, { unique: true, map: canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        if (!rich) {
          g.strokeStyle = line; g.lineWidth = 3; g.globalAlpha = 0.85;
          for (let k = -8; k <= 16; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 + h, h); g.stroke(); g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 - h, h); g.stroke(); }
          g.globalAlpha = 1; g.fillStyle = line;
          for (let y = 0; y <= h; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x <= w; x += 64) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
          const b = 44; g.fillStyle = edge; g.fillRect(0, 0, w, b); g.fillRect(0, h - b, w, b); g.fillRect(0, 0, b, h); g.fillRect(w - b, 0, b, h);       // 镶边
          g.lineWidth = 6; g.strokeRect(b - 4, b - 4, w - 2 * b + 8, h - 2 * b + 8); g.lineWidth = 4; g.strokeRect(12, 12, w - 24, h - 24);
          return;
        }
        const DK = '#5a3f12', HI = '#f7dc8c', S0 = 64;
        g.strokeStyle = line; g.lineWidth = 4;                                             // 连钱纹
        for (let y = 0; y <= h; y += S0) for (let x = 0; x <= w; x += S0) { g.beginPath(); g.arc(x, y, S0 * 0.7, 0, 7); g.stroke(); }
        g.fillStyle = line; for (let y = S0 / 2; y < h; y += S0) for (let x = S0 / 2; x < w; x += S0) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.fill(); }
        const b = 92;                                                                      // 宽金边
        g.fillStyle = edge; g.fillRect(0, 0, w, b); g.fillRect(0, h - b, w, b); g.fillRect(0, 0, b, h); g.fillRect(w - b, 0, b, h);
        g.strokeStyle = DK; g.lineWidth = 5; g.strokeRect(b, b, w - 2 * b, h - 2 * b); g.strokeRect(20, 20, w - 40, h - 40);
        g.strokeStyle = base; g.lineWidth = 7; g.strokeRect(b - 11, b - 11, w - 2 * b + 22, h - 2 * b + 22);   // 金边里压一道朱线
        g.fillStyle = HI; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);   // 最外一道亮金滚边
        const pearl = (x, y) => { g.fillStyle = DK; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.fillStyle = HI; g.beginPath(); g.arc(x, y, 10.5, 0, 7); g.fill(); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(x - 3, y - 3, 3.5, 0, 7); g.fill(); };
        const c0 = 49, n = 11;                                                             // 一排联珠
        for (let k = 1; k < n; k++) { const v = c0 + (w - 2 * c0) * k / n; pearl(v, c0); pearl(v, h - c0); pearl(c0, v); pearl(w - c0, v); }
        for (const [cx, cy] of [[c0, c0], [w - c0, c0], [c0, h - c0], [w - c0, h - c0]]) { // 四角：如意云头（朱地金线）
          g.fillStyle = base; g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.fill(); g.strokeStyle = DK; g.lineWidth = 4; g.stroke();
          g.strokeStyle = HI; g.lineWidth = 5; for (const [dx, dy] of [[-9, -4], [9, -4], [0, 9]]) { g.beginPath(); g.arc(cx + dx, cy + dy, 8, 0, 7); g.stroke(); }
        }
      }) });
      return rich ? goldify(m) : m;
    });
  }
  // 鞍座：一块平整的锦褥（两侧包金口），前后各立一道鞍桥，四角垂穗。文臣坐在两道鞍桥之间
  // o: { base, edge, line 锦面三色, bow 鞍桥的面, rim 包口和鞍桥的边, tassel 穗 }
  // o.grand（四级）：宝座式——锦褥加厚加宽；后鞍桥升成一面尖拱形的靠背、往后仰，前鞍桥是一道矮拱；鞍桥有厚度，朱漆面、金边、中间一道亮金线，
  //   朝外的一面金托嵌玉（o.jewel），顶上各一颗金珠（o.hi），靠背顶上再出一簇火焰（o.flame）；锦褥两侧一排朱金相间的流苏，四角是金珠大穗
  function seat(tiger, o) {
    const GR = !!o.grand, at = tiger.torsoAt, U0 = GR ? 0.285 : 0.3, U1 = 1 - U0, T0 = 0.315, T1 = 0.66, TH = GR ? 0.1 : 0.075;
    const nu = q(18, 10, 6, 6, 4, 4), nt = q(14, 8, 4, 4, 3, 2), pos = [], nor = [], uv = [], idx = [];
    const pt = (u, t, d) => { const s0 = at(u, t), n = s0.p.clone().sub(s0.c); n.x = 0; n.normalize(); return [s0.p.addScaledVector(n, d), n]; };
    for (let i = 0; i <= nt; i++) for (let j = 0; j <= nu; j++) { const [p, n] = pt(U0 + (U1 - U0) * j / nu, T0 + (T1 - T0) * i / nt, TH); pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(j / nu, i / nt); }
    for (let i = 0; i < nt; i++) for (let j = 0; j < nu; j++) { const a = i * (nu + 1) + j, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const top = new THREE.BufferGeometry(); top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); top.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); top.setIndex(idx);
    const g = new THREE.Group(), tm = new THREE.Mesh(top, seatMat(o.base, o.edge, o.line, GR)); tm.castShadow = true; g.add(tm);
    // 其余都是纯色件：两侧的包口（看得出褥子的厚度）、前后鞍桥、穗
    const B = { rim: [[], []], bow: [[], []], hi: [[], []] }, extra = [], XP = V(1, 0, 0), XN = V(-1, 0, 0), ZP = V(0, 0, 1), ZN = V(0, 0, -1);
    const quad = (k, a, b, c, d, n) => { for (const v of [a, b, c, b, d, c]) { B[k][0].push(v[0].x, v[0].y, v[0].z); const m = n || v[1]; B[k][1].push(m.x, m.y, m.z); } };
    const T = i => T0 + (T1 - T0) * i / nt;
    for (let i = 0; i < nt; i++) { // 两条侧边的包口
      quad('rim', pt(U1, T(i), 0.03), pt(U1, T(i), TH + 0.004), pt(U1, T(i + 1), 0.03), pt(U1, T(i + 1), TH + 0.004));
      quad('rim', pt(U0, T(i), 0.03), pt(U0, T(i + 1), 0.03), pt(U0, T(i), TH + 0.004), pt(U0, T(i + 1), TH + 0.004));
    }
    // 鞍桥：一道拱形立板，中间高、两头低；外沿一圈是边。[位置, 高, 宽的起点, 段数, 朝外的一面（+1 朝前 / -1 朝后）, 顶端往前后偏多少]
    const nbN = q(12, 8, 4, 4, 3, 3), bows = GR
      ? [[T1 - 0.008, 0.27, 0.35, q(14, 8, 6, 6, 4, 4), 1, 0.06], [T0 - 0.004, 0.56, 0.325, q(18, 10, 8, 8, 6, 4), -1, -0.14]]
      : [[T1 - 0.008, 0.17, 0.355, nbN, 1, 0], [T0 + 0.008, 0.27, 0.355, nbN, -1, 0]];
    for (const [t, H, ub0, nb, out, lean] of bows) {
      const ub1 = 1 - ub0, tx = GR ? 0.026 : 0, band = GR ? 0.72 : 0.76;
      const prof = b => GR ? 0.24 + 0.54 * Math.pow(Math.sin(PI * b), 0.8) + 0.22 * Math.exp(-Math.pow((b - 0.5) / 0.13, 2)) : 0.3 + 0.7 * Math.sin(PI * b);   // 四级是尖拱的云头
      const bp = (u, d, f, bev) => { const r = pt(u, t, d); r[0].x += lean * Math.max(0, d - TH) / H + f * tx; if (bev) r[1].multiplyScalar(0.7).add(V(f * 0.72, 0, 0)).normalize(); return r; };   // bev：金边的法线往外斜一点，反光才有深浅
      const lv = GR ? [0, 0.56, 0.64, 1] : [0, band, 1], ks = GR ? ['bow', 'hi', 'rim'] : ['bow', 'rim'];   // 从下往上：漆面、（四级多一道亮金线）、金边
      for (let j = 0; j < nb; j++) {
        const ua = ub0 + (ub1 - ub0) * j / nb, ub = ub0 + (ub1 - ub0) * (j + 1) / nb, ha = H * prof(j / nb), hb = H * prof((j + 1) / nb);
        for (const f of [1, -1]) for (let b = 0; b < ks.length; b++) { // 前后两面（普通款是同一张薄板的正反），一层层往上
          const bev = GR && ks[b] === 'rim', D = (h, k) => k ? TH + h * lv[k] : TH - 0.01;
          const A0 = bp(ua, D(ha, b), f, bev), B0 = bp(ub, D(hb, b), f, bev), A1 = bp(ua, D(ha, b + 1), f, bev), B1 = bp(ub, D(hb, b + 1), f, bev), n = bev ? null : f > 0 ? XP : XN;
          if (f > 0) quad(ks[b], A0, B0, A1, B1, n); else quad(ks[b], A0, A1, B0, B1, n);
        }
        if (GR) quad('rim', bp(ua, TH + ha, 1), bp(ub, TH + hb, 1), bp(ua, TH + ha, -1), bp(ub, TH + hb, -1));   // 顶面
      }
      if (GR) { // 两头封口、朝外一面的宝珠、顶珠
        const h0 = H * prof(0);
        quad('rim', bp(ub0, TH - 0.01, 1), bp(ub0, TH + h0, 1), bp(ub0, TH - 0.01, -1), bp(ub0, TH + h0, -1), ZP);
        quad('rim', bp(ub1, TH - 0.01, 1), bp(ub1, TH - 0.01, -1), bp(ub1, TH + h0, 1), bp(ub1, TH + h0, -1), ZN);
        const mid = bp(0.5, TH + H * prof(0.5) * 0.46, out)[0], tip = bp(0.5, TH + H * prof(0.5), 0)[0], R0 = out < 0 ? 0.105 : 0.07;
        extra.push(P(SQ(R0, q([18, 12], [10, 6], [8, 4], [6, 4], [6, 3], [5, 2])), o.rim, mid.x + out * 0.006, mid.y, 0, 0, 0, 0, 0.32, 1, 1));        // 宝珠的金托
        extra.push(P(SQ(R0 * 0.56, q([12, 10], [8, 5], [6, 4], [5, 3], [4, 2])), o.jewel, mid.x + out * 0.03, mid.y, 0, 0, 0, 0, 0.6, 1, 1));         // 宝珠（玉）
        extra.push(P(SQ(0.05, q([12, 10], [8, 5], [6, 4], [5, 3], [4, 2])), o.hi, tip.x, tip.y + 0.035, 0));                                         // 顶珠
        if (out < 0) extra.push(P(new THREE.ConeGeometry(0.04, 0.17, q(10, 6, 5, 4, 4, 3), 1, !!LOD), o.flame, tip.x, tip.y + 0.16, 0));             // 靠背顶上的火焰
      }
    }
    const vc = (k, col) => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(B[k][0], 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(B[k][1], 3)); return P(gg, col); };
    const parts = [vc('rim', o.rim), vc('bow', o.bow), ...(B.hi[0].length ? [vc('hi', o.hi)] : []), ...extra];
    if (GR) { // 两侧一排流苏，朱金相间
      const nf = q(14, 9, 7, 6, 5, 0);
      for (const u of [U0, U1]) for (let i = 0; i < nf; i++) { const [p] = pt(u, T0 + (T1 - T0) * (i + 0.5) / nf, 0.04); parts.push(P(new THREE.ConeGeometry(0.03, 0.16, q(6, 4, 3), 1, !!LOD), i % 2 ? o.rim : o.tassel, p.x, p.y - 0.07, p.z)); }
    }
    if (upto(4)) for (const [u, t] of [[U0, T0], [U1, T0], [U0, T1], [U1, T1]]) { // 四角：一颗珠、一束穗
      const [p] = pt(u, t, 0.06);
      if (GR) { parts.push(P(SQ(0.045, q([12, 10], [6, 4], [5, 3], [4, 2])), o.hi, p.x, p.y, p.z), P(new THREE.ConeGeometry(0.05, 0.34, q(10, 5, 4, 4, 3), 1, !!LOD), o.tassel, p.x, p.y - 0.2, p.z)); continue; }
      if (upto(1)) parts.push(P(SQ(0.03, q([10, 8], [5, 3])), o.rim, p.x, p.y, p.z));
      parts.push(P(new THREE.ConeGeometry(0.032, 0.2, q(8, 4, 3), 1, !!LOD), o.tassel, p.x, p.y - 0.11, p.z));
    }
    g.add(inkedMerged(parts));
    return g;
  }
  // 贴着一个放样曲面取一条带子，往外垫一层，深浅相间（额带用）
  function plate(at, u0, u1, t0, t1, nu, nt, off) {
    const B = [[], []], Nn = [[], []];
    const pt = (u, t, d) => { const s0 = at(u, t), n = s0.p.clone().sub(s0.c).normalize(); return [s0.p.addScaledVector(n, d), n]; };
    const quad = (k, a, b, c, d) => { for (const v of [a, b, c, b, d, c]) { B[k].push(v[0].x, v[0].y, v[0].z); Nn[k].push(v[1].x, v[1].y, v[1].z); } };
    const U = b => u0 + (u1 - u0) * b / nu, T = a => t0 + (t1 - t0) * a / nt;
    for (let i = 0; i < nt; i++) for (let j = 0; j < nu; j++) quad(j % 2, pt(U(j), T(i), off), pt(U(j), T(i + 1), off), pt(U(j + 1), T(i), off), pt(U(j + 1), T(i + 1), off));
    return [0, 1].filter(k => B[k].length).map(k => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B[k], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn[k], 3)); return P(g, [0xd6a43e, 0xc4922e][k]); });
  }
  // 虎头上的络头与项圈
  function bridle(tiger, c, rich) {
    const cs = q([10, 36], [4, 14], [3, 12], [3, 10], [3, 8], [3, 6]), collar = new THREE.TorusGeometry(0.37, 0.035, cs[0], cs[1]), ns = q(12, 8, 4, 4, 0); collar.rotateY(PI / 2);
    const parts = [P(collar, c.cloth)];
    for (let i = 0; i < ns; i++) { const a = i / ns * PI * 2; parts.push(P(SQ(0.03, q([10, 8], [4, 2])), c.trim, 0, Math.cos(a) * 0.39, Math.sin(a) * 0.39)); }
    // 项下一枚铃、一束红缨
    parts.push(P(SQ(0.07, q([14, 10], [6, 4], [5, 3], [4, 2])), 0xd6a43e, 0.02, -0.46, 0), P(new THREE.ConeGeometry(0.06, 0.3, q(12, 6, 5, 4, 3), 1, !!LOD), 0xb0301f, 0.02, -0.66, 0));
    const g = inkedMerged(parts); g.position.set(0.12, 0.03, 0); g.rotation.z = 0.42; tiger.neck.add(g);
    if (rich) { // 四级：额带（压在「王」字后面，不遮字）、顶上一束红缨、鼻梁上一片当卢
      const top = tiger.headAt(0.5, 0.31).p;
      tiger.head.add(inkedMerged([
        ...plate(tiger.headAt, 0.35, 0.65, 0.285, 0.345, q(12, 6, 6, 4, 4, 2), 1, 0.014),
        P(new THREE.ConeGeometry(0.05, 0.3, q(10, 5, 5, 4, 3), 1, !!LOD), 0xb0301f, top.x - 0.06, top.y + 0.13, 0, 0, 0, 0.45), P(SQ(0.04, q([10, 8], [5, 3], [4, 2])), 0xf7dc8c, top.x, top.y + 0.02, 0),
        P(SQ(0.06, q([14, 10], [6, 4], [5, 3], [4, 2])), 0xd6a43e, 0.325, 0.175, 0, 0, 0, -0.75, 0.25, 1.7, 0.8), P(SQ(0.022, q([8, 6], [4, 2])), 0xb0301f, 0.365, 0.15, 0)]));
    }
  }

  const LOOK = {
    zhu: { robe: '#a8321f', skirt: '#a8321f', edge: '#1d1c1b', line: '#d9b45a', inner: 0xf2ecdf, sash: 0xd6a43e, cap: 0x1d1c1b, capBand: 0xc9a045 },
  };
  const hex = s => parseInt(s.slice(1), 16);
  const FIG_Y = 1.66;   // 文臣坐的高度（垫了鞍座，比原来高 0.1）
  function mount(t, side, look, extra) {
    const fig = makeMinisterFigure(side, look);
    fig.name = 'fig'; fig.position.set(-0.05, FIG_Y, 0); t.bodyPivot.add(fig);
    if (extra) extra(fig);
    return fig;
  }

  // ---------- 「持节潜行」：朱袍、节杖、虎压低身子潜行 ----------
  // opt.lod：面数档 0～5。opt.gold：兵法四级——文臣衣冠不变，手里换成金色权杖；白虎披金甲（颈甲、肩甲、当胸、搭后、金鞍鞯、额带当卢、四只金镯），鞍座换成宝座式
  const FACES = { 0: 85704, 1: 8216, 2: 4090, 3: 3200, 4: 2154, 5: 1091 }; // 普通款实测的三角面数（不含描边那一遍）
  const HAND = { x: 0.4, y: 0.92, z: 0.5 };                                // 文臣握杖的手（文臣坐标）
  function makeProwl(side = 'r', opt = {}) {
    LOD = Math.max(0, Math.min(5, opt.lod | 0)); GOLD = !!opt.gold;
    try { return buildProwl(side, GOLD, opt.scepter === 'bare'); } finally { LOD = 0; GOLD = false; }
  }
  function buildProwl(side, gold, bare) {
    const c = SIDE[side], t = makeTiger({ tail: 'low' });
    t.bodyPivot.add(saddleCloth(t, gold ? { base: '#c9962e', edge: '#8e1c12', line: '#f7dc8c', fringe: 0xb0301f, trim: 0xf7dc8c } : { base: '#2a2725', edge: '#1d1c1b', line: '#d9b45a', fringe: 0xb0301f, trim: c.trim }));
    if (gold) { // 金甲：贴着虎身的三块合成一个网格，颈甲单独一个（跟着脖子动）
      const nu = q(16, 10, 8, 8, 6, 6), nt = q(8, 5, 4, 3, 2, 2), off = 0.085, A = t.torsoAt;
      t.bodyPivot.add(armor([
        [A, 0.17, 0.83, 0.07, 0.31, nu, nt, off, 13, 12],                              // 搭后：罩住后胯
        [A, 0.15, 0.85, 0.665, 0.875, nu, Math.max(2, nt - 1), off, 13, 12],           // 肩甲
        [A, -0.2, 0.2, 0.79, 0.955, Math.max(4, nu - 2), 2, off * 0.8, 13, 12],        // 当胸：兜住前胸
      ]));
      t.neck.add(armor([[t.neckAt, 0.14, 0.86, 0.1, 0.78, nu, Math.max(2, nt - 1), 0.06, 10, 4]]));
    } else if (upto(3)) t.bodyPivot.add(strap(t, 0.31, hex('#2a2725'), c.trim), strap(t, 0.84, hex('#2a2725'), c.trim));
    t.bodyPivot.add(seat(t, gold ? { grand: true, base: '#8e1c12', edge: '#c9962e', line: '#e9c15c', bow: 0x8e1c12, rim: 0xd6a43e, hi: 0xf7dc8c, tassel: 0xb0301f, jewel: 0xa8c8ae, flame: 0xb0301f } : { base: '#8e2016', edge: '#1d1c1b', line: '#d9b45a', bow: 0x1d1c1b, rim: 0xc9a045, tassel: 0xb0301f }));   // 鞍座：朱锦褥、前后鞍桥。普通款黑漆鞍桥、朱穗
    bridle(t, gold ? { ...c, cloth: 0x8e1c12, trim: 0xf7dc8c } : c, gold);
    mount(t, side, LOOK.zhu, fig => { // 节杖挂在一个以手为支点的组上，扑击时杖随手前倾
      const grip = new THREE.Group(); grip.name = 'staff'; grip.position.set(HAND.x, HAND.y, HAND.z); fig.add(grip);
      const sf = makeStaff(side, 2.9, gold, bare); sf.position.set(0.42 - HAND.x, -0.72 - HAND.y, 0); sf.rotation.z = -0.07; grip.add(sf);
    });
    return t;
  }

  // ---------- 游戏里用的入口 ----------
  // 画质档 → 面数档。Ham 定的对局档是 2；低画质用 4，省一半
  const QLOD = { high: 2, mid: 2, low: 4 };
  // 原型只造一次（放样、画贴图都在这一步），以后每次出场克隆一份：几何体、贴图全部共用
  const protos = {};
  function proto(side, gold) {
    const lod = QLOD[Core.quality] ?? 2, key = side + (gold ? 'G' : '') + lod;
    if (protos[key]) return protos[key];
    seed = 11;
    const t = makeProwl(side, { gold, lod });
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

  // ---------- 动作 ----------
  // 给克隆出来的一份接上动作。状态量：speed 行走 / pounceK 扑击 / roarK 咆哮 / dead 倒地（deadSide 往哪侧倒）
  function make(side = 'r', opt = {}) {
    const g = cloneTree(proto(side, !!opt.gold)), N = n => g.getObjectByName(n);
    const bp = N('bp'), neck = N('neck'), head = N('head'), jaw = N('jaw'), tail = N('tail'), fig = N('fig'), staff = N('staff');
    const legs = [0, 1, 2, 3].map(i => ({ hip: N('hip' + i), knee: N('knee' + i), hock: N('hock' + i) || null, foot: N('foot' + i), front: i < 2 }));
    const R = { bp, neck, head, jaw, tail, legs }, S = { t: 0, s: 0, sp: 0, pk: 0, rk: 0, dk: 0, side: 1 };
    const o = {
      group: g, bodyPivot: bp, neck, head, jaw, tail, legs, rider: fig, staff,
      t: Core.rnd() * 5, speed: 0, pounceK: 0, roarK: 0, dead: 0, deadSide: 1, gaitK: 0,
      update(dt) {
        o.t += dt * (1 + o.speed);
        const sp = o.dead ? 0 : o.speed, want = Math.min(1, sp * 2);
        o.gaitK = dt > 0 ? o.gaitK + (want - o.gaitK) * Math.min(1, dt * 9) : want;      // 起步、收步有个过渡，不是一帧切过去
        S.t = o.t; S.s = o.gaitK; S.sp = sp; S.pk = o.pounceK; S.rk = o.roarK; S.dk = o.dead; S.side = o.deadSide;
        const th = applyPose(R, S), s = S.s, ph = o.t * 5.4, pk = S.pk, d1 = sm(S.dk / 0.45);
        if (fig) { fig.rotation.z = -(th - STANCE.pitch) * 0.6 + s * Math.sin(ph * 2 + 0.6) * 0.014 + d1 * 0.12; fig.rotation.x = -s * Math.sin(ph) * 0.02; fig.position.y = FIG_Y + s * Math.abs(Math.sin(ph)) * 0.012; }
        if (staff) { staff.rotation.z = -pk * 0.62 - S.rk * 0.1 * (1 - pk) + s * Math.sin(ph * 2) * 0.02 - d1 * 0.25; staff.rotation.x = s * Math.sin(ph) * 0.03; } // 扑击时节杖前指，咆哮时微微前倾
      },
    };
    o.update(0);
    return o;
  }
  return { make, makeTiger, makeProwl, loft, STANCE, FACES, QLOD };
})();
