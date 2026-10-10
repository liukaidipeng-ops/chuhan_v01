// 项羽（终局垓下·乌江）：照 art-038 通过的设计稿（xy2.py）建，和刘邦（LB2）同一路卡通描墨
//   XY3.make({ stage: 1 | 2 | 3 }) → { group, J, setPose, update }
//   一 垓下：整套甲完好；二 初到江边：尘土、披风下摆扯破、肩上断箭、雉尾折了一根；三 最后一战：盔掉了、发髻散开、披风撕成条、甲上缺口和血
//   需要先加载 lb2.js（借它的几何工具）
//   o.cg（CG组 cg-004 返工，过场用）：虎头吞肩缩小、去掉红眼；雉尾收直往上；胡须加密变细。不传就是原来的样子
const XY3 = (() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const { gridGeo, taper, strip, roundBox, cv } = LB2;
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const C0 = { iron: 0x2b2724, ironL: 0x4a443e, lace: 0x5a2a1c, gold: 0xc9a14a, bronze: 0xb08a3e, robe: 0x2e2724, cape: 0x211e1c, lining: 0x121110, skin: 0xd4ab82,
    hair: 0x16100d, trou: 0x2c2420, greave: 0x34302c, boot: 0x1b1715, steel: 0xcfd0c6, wood: 0x3a2316, plume: 0xb0261a, fur: 0xc9a25a, furD: 0x7a5a2a, feather: 0x8a5a2c, belt: 0x3a2a22, flap: 0x1c1918 };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 札甲：一片片铁甲叶错缝排，暗红褐的甲绳横着串，甲钉金色
  function lamTex(iron, lace, rivet, cols = 16, rows = 8) {
    const t = cv(512, 512, (g, w, h) => {
      g.fillStyle = hex(lace); g.fillRect(0, 0, w, h);
      const pw = w / cols, ph = h / rows;
      for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
        const x = c * pw + (r % 2 ? pw / 2 : 0), y = r * ph;
        g.fillStyle = hex(iron); const rr = 5; g.beginPath(); g.moveTo(x + 2 + rr, y + 2); g.lineTo(x + pw - 2 - rr, y + 2); g.quadraticCurveTo(x + pw - 2, y + 2, x + pw - 2, y + 2 + rr); g.lineTo(x + pw - 2, y + ph - 6); g.lineTo(x + 2, y + ph - 6); g.lineTo(x + 2, y + 2 + rr); g.quadraticCurveTo(x + 2, y + 2, x + 2 + rr, y + 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 4, y + 4, pw - 10, 3);
        g.fillStyle = hex(rivet); g.beginPath(); g.arc(x + pw / 2, y + ph * 0.3, 2.2, 0, TAU); g.fill();
      }
      g.strokeStyle = 'rgba(20,10,6,.6)'; g.lineWidth = 2; for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(0, r * ph - 4); g.lineTo(w, r * ph - 4); g.stroke(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  // 金饰带（腰带的金牌、甲裙下沿、盔沿）：金地，一排深色钉
  const bandTex = (gold, dots = 24) => { const t = cv(512, 64, (g, w, h) => { g.fillStyle = hex(gold); g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,240,200,.35)'; g.fillRect(0, 6, w, 5); g.fillStyle = 'rgba(80,55,20,.6)'; for (let i = 0; i < dots; i++) { g.beginPath(); g.arc((i + 0.5) * w / dots, h / 2 + 4, 4, 0, TAU); g.fill(); } }); t.wrapS = THREE.RepeatWrapping; return t; };
  // 腰带：深褐皮带上一块块金牌
  const beltTex = (gold) => { const t = cv(512, 64, (g, w, h) => { g.fillStyle = hex(C0.belt); g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { const x = i * w / 12 + 6; g.fillStyle = hex(gold); g.fillRect(x, 8, w / 12 - 12, h - 16); g.fillStyle = 'rgba(80,55,20,.55)'; g.fillRect(x + 6, 18, w / 12 - 24, h - 36); } }); t.wrapS = THREE.RepeatWrapping; return t; };
  // 虎脸（护心镜、带扣）：青铜地，眉、眼、鼻、嘴、獠牙
  const tigerTex = (gold) => cv(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(100, 90, 10, 128, 128, 128); gr.addColorStop(0, '#f0d58e'); gr.addColorStop(1, hex(gold)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,55,20,.8)'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 110, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 92, 0, TAU); g.stroke();
    g.lineWidth = 6; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 12, 92); g.quadraticCurveTo(128 + s * 40, 70, 128 + s * 70, 86); g.stroke(); g.fillStyle = '#7a1a10'; g.beginPath(); g.ellipse(128 + s * 36, 108, 13, 9, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(112, 140); g.lineTo(128, 128); g.lineTo(144, 140); g.stroke();
    g.beginPath(); g.moveTo(92, 168); g.quadraticCurveTo(128, 188, 164, 168); g.stroke();
    g.fillStyle = '#efe6d2'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128 + s * 22, 172); g.lineTo(128 + s * 12, 172); g.lineTo(128 + s * 17, 196); g.fill(); }
  });
  const featherTex = () => { const t = cv(64, 512, (g, w, h) => { g.fillStyle = hex(C0.feather); g.fillRect(0, 0, w, h); for (let y = 10; y < h; y += 26) { g.fillStyle = '#2a1a0e'; g.fillRect(0, y, w, 8); g.fillStyle = '#c8a070'; g.fillRect(0, y + 10, w, 3); } g.fillStyle = '#3a2412'; g.fillRect(w / 2 - 2, 0, 4, h); }); return t; };

  function make(o = {}) {
    const st = [1, 2, 3].includes(o.stage) ? o.stage : 1, root = new THREE.Group(), J = {};
    const C = { ...C0 }; if (st >= 2) { C.cape = 0x25211e; C.gold = 0xb2914a; } if (st >= 3) { C.cape = 0x28231f; C.gold = 0x9c7f42; }
    const M = (color, opt = {}) => Core.toon(color, { unique: !!(opt.map || opt.side || opt.transparent), ...(opt.map ? { map: opt.map } : {}), ...(opt.side ? { side: opt.side } : {}), ...(opt.transparent ? { transparent: true, depthWrite: false } : {}) });
    const put = (parent, geo, mat, th = 0.006) => { const m = th > 0 ? Core.inked(geo, mat, th) : new THREE.Mesh(geo, mat); parent.add(m); return m; };
    const VG = (parts, th = 0.004) => Models.inkedMerged(parts, th);
    const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
    const R = { hipsY: 1.12, chest: 0.26, shX: 0.3, shY: 0.1, neck: 0.17, head: 0.06, L1: 0.28, L2: 0.26 };
    const hips = joint('hips', root, 0, R.hipsY, 0), chest = joint('chest', hips, 0, R.chest, 0), neck = joint('neck', chest, 0, R.neck, 0.005), head = joint('head', neck, 0, R.head, 0.015);
    const LAM = lamTex(C.iron, C.lace, C.gold), lamMat = (ru, rv) => { const t = LAM.clone(); t.needsUpdate = true; t.repeat.set(ru, rv); return M(0xffffff, { map: t }); };
    const BAND = bandTex(C.gold), bandMat = (r) => { const t = BAND.clone(); t.needsUpdate = true; t.repeat.set(r, 1); return M(0xffffff, { map: t }); };
    // 椭圆截面的旋转体（按高度插值）
    const ringer = (RING) => (y) => { let i = 0; while (i < RING.length - 2 && RING[i + 1][0] > y) i++; const a = RING[i], b = RING[i + 1], t = clamp((a[0] - y) / (a[0] - b[0])), e = t * t * (3 - 2 * t); return [a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e, a[3] + (b[3] - a[3]) * e]; };
    const loft = (ring, y0, y1, nu, nv, off = 0, fold = null) => gridGeo(nu, nv, (u, v) => { const y = y0 + (y1 - y0) * v, a = u * TAU, [rx, rz, cz] = ring(y), k = 1 + (fold ? fold(a, y) : 0); return [Math.sin(a) * (rx * k + off), y, cz + Math.cos(a) * (rz * k + off)]; });

    // —— 躯干的札甲（胸极宽、肩斜方）——
    const TORSO = ringer([[1.56, 0.12, 0.1, 0.0], [1.53, 0.26, 0.15, -0.005], [1.5, 0.315, 0.165, -0.005], [1.44, 0.325, 0.17, 0.0], [1.38, 0.315, 0.172, 0.006], [1.3, 0.295, 0.165, 0.006], [1.2, 0.275, 0.155, 0.004], [1.12, 0.272, 0.155, 0.004]]);
    put(root, loft(TORSO, 1.56, 1.12, 128, 30), lamMat(14, 5), 0.007);
    // 领口：短粗的脖子、护颈一圈甲片、金线；里面一层深色内袍
    put(root, gridGeo(48, 4, (u, v) => { const a = u * TAU, y = 1.52 + v * 0.06, r = 0.112 - v * 0.012; return [Math.sin(a) * r, y, 0.004 + Math.cos(a) * r * 0.86]; }), lamMat(6, 1), 0.005);
    put(root, gridGeo(48, 1, (u, v) => { const a = u * TAU, y = 1.522 - v * 0.008, r = 0.124; return [Math.sin(a) * r, y, 0.004 + Math.cos(a) * r * 0.86]; }), M(C.gold), 0);
    // 腰带（金牌）+ 虎头带扣
    const BT = beltTex(C.gold); BT.repeat.set(3, 1);
    put(root, loft(TORSO, 1.185, 1.115, 128, 2, 0.012), M(0xffffff, { map: BT }), 0.005);
    const buckle = put(root, new THREE.CylinderGeometry(0.042, 0.042, 0.014, 32), [M(C.gold), M(0xffffff, { map: tigerTex(C.gold) }), M(C.gold)], 0.004); buckle.rotation.x = PI / 2; buckle.position.set(0, 1.15, TORSO(1.15)[1] + TORSO(1.15)[2] + 0.02);
    // 护心镜（大）+ 两根系绳斜上肩
    const mz = TORSO(1.395)[1] + TORSO(1.395)[2] + 0.01;
    const mir = put(root, new THREE.CylinderGeometry(0.098, 0.1, 0.016, 48), [M(C.bronze), M(0xffffff, { map: tigerTex(C.bronze) }), M(C.bronze)], 0.005); mir.rotation.x = PI / 2; mir.position.set(0, 1.395, mz);
    for (const s of [-1, 1]) put(root, taper([V(s * 0.08, 1.43, mz - 0.004), V(s * 0.17, 1.49, mz - 0.03), V(s * 0.25, 1.52, 0.05)], 0.007, 0.007, 6, 8), M(0x8a6a2a), 0.003);
    // —— 甲裙（腰带到膝下）：左右两片 + 中间一条深色前襟；下沿金边 ——
    const SKIRT = ringer([[1.13, 0.275, 0.158, 0.004], [0.95, 0.29, 0.18, 0.008], [0.8, 0.3, 0.19, 0.01], [0.66, 0.305, 0.195, 0.012]]);
    const skirtFold = (a, y) => 0.012 * Math.sin(a * 10) * sstep(1.0, 0.7, y);
    put(root, loft(SKIRT, 1.13, 0.66, 128, 20, 0, skirtFold), lamMat(14, 4), 0.007);
    put(root, loft(SKIRT, 0.70, 0.655, 128, 2, 0.004, skirtFold), bandMat(10), 0.005);
    for (const a of [0.55, 1.15, 1.75, -0.55, -1.15, -1.75, 2.6, -2.6]) put(root, gridGeo(1, 10, (u, v) => { const y = 1.12 - v * 0.42, [rx, rz, cz] = SKIRT(y), aa = a + (u - 0.5) * 0.01, k = 1 + skirtFold(aa, y); return [Math.sin(aa) * (rx * k + 0.003), y, cz + Math.cos(aa) * (rz * k + 0.003)]; }, false), M(0x141210, { side: THREE.DoubleSide }), 0);
    { const fz = SKIRT(1.0)[1] + SKIRT(1.0)[2];
      const flap = gridGeo(6, 14, (u, v) => { const y = 1.13 - v * 0.42, w = 0.05 + 0.006 * v - (v > 0.9 ? (v - 0.9) * 0.4 : 0), x = (u - 0.5) * 2 * w; const [rx, rz, cz] = SKIRT(y); return [x, y, cz + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) + 0.012]; }, false);
      put(root, flap, M(C.flap, { side: THREE.DoubleSide }), 0.004);
      const edge = []; const en = []; for (let i = 0; i <= 20; i++) { const t = i / 20, side = t < 0.5 ? -1 : 1, tt = t < 0.5 ? t * 2 : (1 - t) * 2, y = 1.12 - tt * 0.4, x = side * (0.04 + 0.005 * tt) * (tt > 0.95 ? 0.4 : 1); const [rx, rz, cz] = SKIRT(y); edge.push(V(x, y, cz + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) + 0.016)); en.push(V(0, 0, 1)); }
      put(root, strip(edge, en, 0.008, 0.003), M(C.gold), 0); }
    // —— 腿：粗；膝下护胫甲（竖条 + 上下金箍），黑靴金包头 ——
    for (const s of [-1, 1]) {
      const x = s * 0.105;
      put(root, gridGeo(24, 6, (u, v) => { const a = u * TAU, y = 0.7 - v * 0.27, r = 0.088 - 0.008 * v; return [x + Math.sin(a) * r, y, 0.01 + Math.cos(a) * r]; }), M(C.trou), 0.006);
      const gt = cv(256, 128, (g, w, h) => { g.fillStyle = hex(C.greave); g.fillRect(0, 0, w, h); g.strokeStyle = '#1d1a18'; g.lineWidth = 4; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); } }); gt.wrapS = THREE.RepeatWrapping;
      put(root, gridGeo(32, 6, (u, v) => { const a = u * TAU, y = 0.44 - v * 0.29, r = 0.084 - 0.004 * v; return [x + Math.sin(a) * r, y, 0.012 + Math.cos(a) * r]; }), M(0xffffff, { map: gt }), 0.006);
      for (const y of [0.445, 0.16]) put(root, gridGeo(32, 1, (u, v) => { const a = u * TAU, yy = y - v * 0.03, r = 0.09; return [x + Math.sin(a) * r, yy, 0.012 + Math.cos(a) * r]; }), M(C.gold), 0.004);
      const bootG = gridGeo(24, 10, (u, v) => { const a = u * TAU, z = -0.07 + v * 0.27, w = 0.075 * (1 - 0.3 * Math.pow(v, 3)), hgt = 0.15 * (1 - 0.75 * sstep(0.35, 1, v)); return [x + Math.sin(a) * w, Math.max(0, hgt * 0.5 + Math.cos(a) * hgt * 0.5), z]; });
      put(root, bootG, M(C.boot), 0.006);
      put(root, gridGeo(16, 4, (u, v) => { const a = u * TAU, z = 0.13 + v * 0.07, w = 0.064 * (1 - 0.5 * v), hh = 0.05 * (1 - 0.5 * v); return [x + Math.sin(a) * w, Math.max(0, hh * 0.5 + Math.cos(a) * hh * 0.5) + 0.004, z]; }), M(C.gold), 0.004);
    }

    // —— 披风：一整块，从两肩后面垂到脚边；腿后面、两侧都看得到 ——
    {
      const NOTCH = st === 1 ? [] : st === 2 ? Array.from({ length: 14 }, (_, k) => [-1.95 + k * 0.3, 0.05 + (k % 3) * 0.04, 0.14]) : Array.from({ length: 16 }, (_, k) => [-2.0 + k * 0.27, 0.25 + (k % 2) * 0.35 + (k % 3) * 0.08, 0.1]);
      const notch = a => { let h = 0; for (const [a0, hh, w] of NOTCH) { const d = Math.abs(a - a0); if (d < w) h = Math.max(h, hh * (1 - d / w)); } return h; };
      const capeP = (u, v) => {
        const span = 1.75 + 0.3 * v, a = PI + (u - 0.5) * 2 * span, y = 1.53 - v * 1.5, rx = 0.33 + 0.3 * Math.pow(v, 0.8), rz = 0.2 + 0.24 * Math.pow(v, 0.9), cz = -0.03 - 0.06 * v;
        const k = 1 + 0.06 * v * Math.sin(u * 30 + v * 2) + 0.03 * v * Math.sin(u * 13);
        return [Math.sin(a) * rx * k, y, cz + Math.cos(a) * rz * k, a];
      };
      const cape = gridGeo(96, 40, (u, v) => { const [x, y, z, a] = capeP(u, v); const yy = Math.max(0.04 + notch(a - PI), y); return [x, yy, z]; }, false);
      const capeMat = M(C.cape, { side: THREE.DoubleSide }); capeMat.userData.cape = true;   // CG 拍片时按这个标记给披风加风（cg-lab/cgify.js）
      put(root, cape, capeMat, 0.007);
      if (st === 1) { const pts = [], ns = []; for (let i = 0; i <= 60; i++) { const [x, y, z] = capeP(i / 60, 0.995); pts.push(V(x, 0.055, z)); ns.push(V(x, 0, z - 0.0).normalize()); } put(root, strip(pts, ns, 0.012, 0.004), M(C.gold), 0); }
      // 两肩上的系扣
      for (const s of [-1, 1]) put(root, new THREE.SphereGeometry(0.03, 16, 12), M(C.gold), 0.004).position.set(s * 0.25, 1.53, 0.04);
    }

    // —— 胳膊：上臂墨色袖、肘上护肘圆片、前臂护臂三道金箍；拳头 ——
    const arms = {};
    for (const s of [-1, 1]) {
      const sh = joint('sh' + s, chest, s * R.shX, R.shY, 0), el = joint('el' + s, sh, 0, -R.L1, 0), wr = joint('wr' + s, el, 0, -R.L2, 0);
      put(sh, gridGeo(32, 8, (u, v) => { const a = u * TAU, r = 0.085 - 0.018 * v; return [Math.sin(a) * r, -v * R.L1, Math.cos(a) * r]; }), M(C.robe), 0.006);
      put(el, gridGeo(32, 8, (u, v) => { const a = u * TAU, r = 0.066 - 0.014 * v; return [Math.sin(a) * r, -v * R.L2, Math.cos(a) * r]; }), M(C.greave), 0.006);
      for (const t of [0.3, 0.55, 0.8]) put(el, gridGeo(32, 1, (u, v) => { const a = u * TAU, r = 0.068 - 0.014 * t + 0.003, y = -t * R.L2 - v * 0.012; return [Math.sin(a) * r, y, Math.cos(a) * r]; }), M(C.gold), 0.003);
      const eg = put(el, new THREE.CylinderGeometry(0.072, 0.072, 0.018, 32), M(0x3a3530), 0.005); eg.rotation.z = PI / 2; eg.position.x = s * 0.06; J['elb' + s] = eg;
      const eg2 = put(el, new THREE.CylinderGeometry(0.03, 0.03, 0.022, 20), M(C.gold), 0.003); eg2.rotation.z = PI / 2; eg2.position.x = s * 0.064;
      // 披膊：三层甲片搭在上臂外侧（o.cg：换成下面的肩甲，cg-005）
      if (o.cg) {
        // 肩甲（cg-005，Ham：「不一定要是金的，现在这个太像齿轮了，又小又奇怪」）：黑铁札甲，肩头一片圆顶甲盖住肩，下面四层甲片一层比一层宽、往外张，
        // 每层下沿一道暗铜边；肩顶正外侧一枚暗铜虎面小圆牌（留一点霸王的虎纹，不再是金虎头）
        const lam = (ru, rv) => M(0xffffff, { map: (() => { const t = LAM.clone(); t.needsUpdate = true; t.repeat.set(ru, rv); return t; })(), side: THREE.DoubleSide });
        put(sh, new THREE.SphereGeometry(0.112, 28, 12, s > 0 ? -PI * 0.15 : PI * 0.15, PI * 1.0 * s, 0, PI * 0.42).rotateY(s > 0 ? 0 : PI).translate(0, 0.0, 0), lam(4, 1), 0.005).position.y = -0.005;
        for (let k = 0; k < 3; k++) {   // 贴着上臂包过去（太宽太直会像两块纸板）
          const y0 = -0.03 - k * 0.05, r0 = 0.1 + k * 0.009;
          put(sh, gridGeo(24, 3, (u, v) => { const a = s * (-0.55 + u * 2.15), r = r0 + v * 0.012, y = y0 - v * 0.066 - 0.012 * Math.cos(a * s - 0.5); return [Math.sin(a) * r, y, Math.cos(a) * r * 0.95]; }, false), lam(8, 1), 0.005);
          put(sh, gridGeo(24, 1, (u, v) => { const a = s * (-0.55 + u * 2.15), r = r0 + 0.013, y = y0 - 0.066 - 0.012 * Math.cos(a * s - 0.5) - v * 0.008; return [Math.sin(a) * r, y, Math.cos(a) * r * 0.95]; }, false), M(0x4a3a22, { side: THREE.DoubleSide }), 0);
        }
        const boss = put(sh, new THREE.CylinderGeometry(0.036, 0.038, 0.012, 28), [M(0x4a3a22), M(0xffffff, { map: tigerTex(0x6a5430) }), M(0x4a3a22)], 0.003);
        boss.rotation.z = -s * PI / 2; boss.position.set(s * 0.112, 0.0, 0);
      }
      for (let k = 0; k < (o.cg ? 0 : 3); k++) {
        const y0 = -0.03 - k * 0.055;
        put(sh, gridGeo(16, 3, (u, v) => { const a = s * (-0.4 + u * 2.2), r = 0.105 + k * 0.006, y = y0 - v * 0.075; return [Math.sin(a) * r, y, Math.cos(a) * r * 0.9]; }, false), M(0xffffff, { map: (() => { const t = LAM.clone(); t.needsUpdate = true; t.repeat.set(3, 1); return t; })(), side: THREE.DoubleSide }), 0.005);
        put(sh, gridGeo(16, 1, (u, v) => { const a = s * (-0.4 + u * 2.2), r = 0.108 + k * 0.006, y = y0 - 0.075 - v * 0.008; return [Math.sin(a) * r, y, Math.cos(a) * r * 0.9]; }, false), M(C.gold, { side: THREE.DoubleSide }), 0);
      }
      const hand = new THREE.Group(); wr.add(hand); hand.position.set(0, -0.05, 0); J['hand' + s] = hand;
      hand.add(VG(fistParts(s, C.skin), 0.0035));
      arms[s] = { sh, el, wr };
    }
    // 虎头吞肩：一圈虎毛 + 金虎头（张嘴、獠牙、红眼），胳膊从虎嘴里伸出来
    for (const s of [-1, 1]) {
      if (o.cg) { const T = new THREE.Group(); root.add(T); J['tiger' + s] = T; continue; }   // cg：金虎头不要了，肩甲在胳膊那里做
      const T = new THREE.Group(); T.position.set(s * 0.355, 1.505, 0.005); T.rotation.set(0.12, s * 0.7, s * -0.2); root.add(T); J['tiger' + s] = T;
      if (o.cg) { T.scale.setScalar(0.66); T.position.set(s * 0.33, 1.49, 0.0); }   // 特写里虎头比脸还大，抢戏
      // 虎毛：一圈锯齿的扁环，背在虎头后面
      const furS = new THREE.Shape(); const NF = 40; for (let i = 0; i <= NF; i++) { const a = i / NF * TAU, r = 0.17 + (i % 2 ? 0.035 : 0) + 0.01 * Math.sin(i * 1.7); const x = Math.cos(a) * r * 1.05, y = Math.sin(a) * r * 0.92; i ? furS.lineTo(x, y) : furS.moveTo(x, y); }
      const furG = new THREE.ExtrudeGeometry(furS, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 4 }); furG.translate(0, 0, -0.08);
      put(T, furG, M(C.fur), 0.006);
      const P = [];
      P.push({ geo: new THREE.SphereGeometry(1, 32, 24), color: C.gold, m: Core.M4(0, 0, 0, 0, 0, 0, 0.12, 0.1, 0.1) });
      for (const e of [-1, 1]) P.push({ geo: new THREE.ConeGeometry(0.032, 0.05, 10), color: C.gold, m: Core.M4(e * 0.07, 0.085, -0.01, 0, 0, -e * 0.4) });
      P.push({ geo: new THREE.BoxGeometry(0.16, 0.022, 0.04), color: C.gold, m: Core.M4(0, 0.035, 0.075, -0.3) });       // 眉骨
      P.push({ geo: roundBox(0.045, 0.035, 0.05, 0.012, 3), color: 0xd8b860, m: Core.M4(0, -0.005, 0.098) });                 // 鼻
      for (const e of [-1, 1]) { P.push({ geo: new THREE.SphereGeometry(0.017, 12, 8), color: o.cg ? 0x3a2a14 : 0x8a1a10, m: Core.M4(e * 0.042, 0.02, 0.086) }); if (!o.cg) P.push({ geo: new THREE.SphereGeometry(0.006, 8, 6), color: 0xf3d27a, m: Core.M4(e * 0.042, 0.02, 0.102) }); }
      P.push({ geo: new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24, 1, false, -PI / 2, PI), color: 0x3a0c08, m: Core.M4(0, -0.05, 0.07, PI / 2, 0, 0, 1, 1, 0.55) });   // 张开的嘴
      for (let k = 0; k < 4; k++) { const x = -0.045 + k * 0.03; P.push({ geo: new THREE.ConeGeometry(0.009, 0.03, 6), color: 0xefe6d2, m: Core.M4(x, -0.045, 0.1, PI) }); P.push({ geo: new THREE.ConeGeometry(0.008, 0.025, 6), color: 0xefe6d2, m: Core.M4(x + 0.015, -0.088, 0.088) }); }
      T.add(VG(P, 0.005));
    }

    // —— 头 ——
    put(neck, gridGeo(32, 6, (u, v) => { const a = u * TAU, r = 0.072 + 0.008 * v; return [Math.sin(a) * r, 0.08 - v * 0.12, 0.004 + Math.cos(a) * r * 0.9]; }), M(o.cg ? 0x6e4e3a : C.skin), 0.005);   // cg：脖子在胡子底下的阴影里，压暗
    xyHead({ head, M, put, VG, st, C, cg: !!o.cg });
    if (o.cg) { const sc = put(neck, gridGeo(40, 6, (u, v) => { const a = u * TAU, r = 0.088 - 0.012 * v + 0.012 * Math.sin(v * PI) + 0.006 * Math.sin(a * 7 + v * 3); return [Math.sin(a) * r * 1.08, -0.11 + v * 0.15, 0.008 + Math.cos(a) * r]; }), M(0x3a1a14), 0.004); sc.renderOrder = 1; }   // 领巾：盖住胡子下面那截光脖子（cg-005）
    if (st < 3) helmet({ head, M, put, VG, st, C, lamMat, cg: !!o.cg });

    // —— 兵器：右手卜字戟（竖着、杆从拳里穿过）；左胯长剑，左手按在剑柄上 ——
    const ji = new THREE.Group(); root.add(ji); J.ji = ji;
    { const P = [];
      P.push({ geo: new THREE.CylinderGeometry(0.016, 0.018, 2.16, 10), color: C.wood, m: Core.M4(0, 1.11, 0) });
      P.push({ geo: new THREE.ConeGeometry(0.02, 0.07, 8), color: C.gold, m: Core.M4(0, 0.035, 0, PI) });
      P.push({ geo: new THREE.CylinderGeometry(0.024, 0.028, 0.22, 10), color: C.gold, m: Core.M4(0, 2.3, 0) });
      P.push({ geo: new THREE.TorusGeometry(0.03, 0.007, 8, 16), color: C.gold, m: Core.M4(0, 2.41, 0, PI / 2) });
      P.push({ geo: new THREE.ConeGeometry(0.045, 0.14, 10), color: C.plume, m: Core.M4(0, 2.12, 0, PI) });
      P.push({ geo: new THREE.ConeGeometry(0.04, 0.26, 8), color: C.steel, m: Core.M4(0, 2.55, 0, 0, 0, 0, 1, 1, 0.42) });
      const s0 = new THREE.Shape(); s0.moveTo(0.02, 0); s0.lineTo(0.02, 0.2); s0.quadraticCurveTo(0.12, 0.23, 0.22, 0.245); s0.lineTo(0.27, 0.235); s0.lineTo(0.24, 0.215); s0.quadraticCurveTo(0.15, 0.17, 0.065, 0.15); s0.quadraticCurveTo(0.05, 0.08, 0.05, 0.02); s0.lineTo(0.02, 0);
      const bg = new THREE.ExtrudeGeometry(s0, { depth: 0.01, bevelEnabled: false }); bg.translate(0, 0, -0.005);
      P.push({ geo: bg, color: C.steel, m: Core.M4(0, 2.19, 0, 0, PI, 0) });   // 横刃朝外（-x）
      ji.add(VG(P, 0.005)); }
    const sword = new THREE.Group(); root.add(sword); J.sword = sword;
    { const P = [], a = V(0.19, 1.2, 0.13), b = V(0.33, 0.56, -0.06), d = b.clone().sub(a), L = d.length();
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), d.clone().normalize()), m = new THREE.Matrix4().compose(a, q, V(1, 1, 1));
      const at = (t, geo, color, sx = 1, sy = 1, sz = 1) => { const mm = m.clone().multiply(new THREE.Matrix4().compose(V(0, -t * L, 0), new THREE.Quaternion(), V(sx, sy, sz))); P.push({ geo, color, m: mm }); };
      at(0.5, new THREE.BoxGeometry(0.05, L, 0.032), 0x2a1a12);
      at(0.97, new THREE.BoxGeometry(0.058, 0.05, 0.04), C.gold); at(0.08, new THREE.BoxGeometry(0.058, 0.03, 0.04), C.gold);
      at(-0.01, new THREE.BoxGeometry(0.11, 0.022, 0.05), C.gold);   // 剑格
      at(-0.13, new THREE.CylinderGeometry(0.016, 0.016, 0.15, 10), 0x3a2016);   // 剑柄
      at(-0.24, new THREE.TorusGeometry(0.024, 0.008, 8, 16), C.gold);   // 剑首环
      sword.add(VG(P, 0.004)); J.hilt = a.clone().add(d.clone().normalize().multiplyScalar(-0.13 * L)); J.hiltDir = d.clone().normalize().negate(); }

    // —— 阶段特效：尘土、断箭、血 ——
    if (st >= 2) {
      // 断箭：插在左肩、披风上；第三阶段更多
      const AR = [[0.36, 1.56, 0.02, -0.3, 0.2, 0.5], [0.3, 1.32, 0.12, -0.6, 0.4, 0.2], [-0.25, 1.1, -0.28, 0.4, 0, -0.6]];
      if (st >= 3) AR.push([-0.15, 1.42, 0.17, -0.5, -0.3, 0.1], [0.12, 1.0, 0.2, -0.7, 0.2, -0.2], [0.42, 0.7, -0.3, 0.2, 0.6, -0.3]);
      const P = [];
      for (const [x, y, z, rx, ry, rz] of AR) {
        const m = Core.M4(x, y, z, rx, ry, rz); const l = 0.22 + rnd() * 0.12;
        P.push({ geo: new THREE.CylinderGeometry(0.004, 0.004, l, 5).translate(0, l / 2, 0), color: 0x6a4a2a, m });
        const f = new THREE.PlaneGeometry(0.03, 0.06); f.translate(0, l - 0.03, 0); P.push({ geo: f, color: 0xe8e2cc, m }); const f2 = f.clone(); f2.rotateY(PI / 2); P.push({ geo: f2, color: 0xe8e2cc, m });
      }
      root.add(VG(P, 0.002));
      // 尘土：下半身、披风下摆一层浅土色的点
      const dust = cv(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const t = Math.pow(rnd(), 0.6), y = h * (1 - t); g.fillStyle = `rgba(${150 + rnd() * 40 | 0},${125 + rnd() * 30 | 0},${92 + rnd() * 20 | 0},${0.25 + 0.45 * t})`; g.beginPath(); g.ellipse(rnd() * w, y, 2 + rnd() * 7, 1 + rnd() * 3, rnd() * 3, 0, TAU); g.fill(); } });
      dust.wrapS = THREE.RepeatWrapping; dust.repeat.set(4, 1);
      const dm = M(0xffffff, { map: dust, transparent: true });
      const dg = loft(SKIRT, 1.0, 0.66, 96, 10, 0.006, skirtFold); const dd = new THREE.Mesh(dg, dm); dd.renderOrder = 2; root.add(dd);
    }
    if (st >= 3) {
      // 血：胸前、甲裙上几处暗红的溅点和流痕；甲上几处缺口（露出深色）
      const blood = cv(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 9; k++) { const x = rnd() * w, y = rnd() * h * 0.8, r = 10 + rnd() * 26; g.fillStyle = 'rgba(110,18,13,.85)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); for (let j = 0; j < 8; j++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 3, y + (rnd() - 0.5) * r * 3, 2 + rnd() * 5, 0, TAU); g.fill(); } g.fillRect(x - 3, y, 6, 30 + rnd() * 60); }
        g.fillStyle = 'rgba(15,10,8,.9)'; for (let k = 0; k < 5; k++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) g.lineTo(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 40); g.fill(); } });
      blood.wrapS = THREE.RepeatWrapping; blood.repeat.set(2, 1);
      const bm = M(0xffffff, { map: blood, transparent: true });
      const b1 = new THREE.Mesh(loft(TORSO, 1.5, 1.2, 96, 12, 0.006), bm); b1.renderOrder = 2; root.add(b1);
      const b2 = new THREE.Mesh(loft(SKIRT, 1.1, 0.7, 96, 10, 0.009, skirtFold), bm); b2.renderOrder = 2; root.add(b2);
    }

    // —— 姿势：右手握戟（拳在右胯前），左手按剑柄 ——
    const DOWN = V(0, -1, 0);
    function solveArm(s, W, pole) {
      const S = J['sh' + s].position.clone(), d = W.clone().sub(S), dist = Math.min(d.length(), R.L1 + R.L2 - 0.001), dir = d.normalize();
      const a = Math.acos(clamp((R.L1 * R.L1 + dist * dist - R.L2 * R.L2) / (2 * R.L1 * dist), -1, 1));
      const pv = pole.clone().sub(S), perp = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
      const E = S.clone().add(dir.clone().multiplyScalar(Math.cos(a) * R.L1)).add(perp.clone().multiplyScalar(Math.sin(a) * R.L1)), Wp = S.clone().add(dir.clone().multiplyScalar(dist));
      const q1 = new THREE.Quaternion().setFromUnitVectors(DOWN, E.clone().sub(S).normalize()), fore = Wp.clone().sub(E).normalize().applyQuaternion(q1.clone().invert());
      return [q1, new THREE.Quaternion().setFromUnitVectors(DOWN, fore)];
    }
    const CH = R.hipsY + R.chest;
    const POSES = {
      stand: { arms: { '-1': [[-0.37, 1.1 - CH, 0.06], [-0.8, -0.1, -0.2]], '1': [[0.2, 1.21 - CH, 0.1], [0.75, -0.25, -0.2]] }, head: [-0.02, 0, 0] },
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
    const tq = new THREE.Quaternion();
    function update(dt) {
      if (t < 1) { t = Math.min(1, t + dt / dur); const e = t * t * (3 - 2 * t); for (const k of ARM) J[k].quaternion.slerpQuaternions(qF[k], qT[k], e); for (const k of BODY) { const a = eF[k], b = eT[k]; J[k].rotation.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e); } }
      root.updateMatrixWorld(true);
      // 拳头的握轴：右手竖直（戟），左手顺着剑柄
      for (const [s, dir] of [[-1, V(0, 1, 0)], [1, J.hiltDir]]) { const h = J['hand' + s], qw = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir); h.parent.getWorldQuaternion(tq); h.quaternion.copy(tq.invert().multiply(qw)); }
      root.updateMatrixWorld(true);
      const hp = V(); J['hand-1'].getWorldPosition(hp); root.worldToLocal(hp); J.ji.position.set(hp.x, 0, hp.z);
      const lp = V(); J.hand1.getWorldPosition(lp); root.worldToLocal(lp); J.sword.position.copy(lp.sub(J.hilt));   // 剑跟着左拳走，剑柄正好在拳里
    }
    setPose('stand', 0.01); update(0.1);
    root.userData.kind = 'xiangyu3';
    return { group: root, J, setPose, update, POSES };
  }
  // 握拳（握轴是本地 Y，掌在 s 一侧，四指包在前面 +Z）
  function fistParts(s, skin) {
    const H = [{ geo: roundBox(0.036, 0.095, 0.08, 0.014), color: skin, m: Core.M4(s * 0.036, 0, -0.004) }];
    [0.032, 0.011, -0.01, -0.031].forEach((y, k) => H.push({ geo: new THREE.CapsuleGeometry(0.0105, 0.048 - (k === 3 ? 0.008 : 0), 4, 10), color: skin, m: Core.M4(s * 0.004, y, 0.026, 0, 0, PI / 2) }));
    H.push({ geo: new THREE.CapsuleGeometry(0.0115, 0.04, 4, 10), color: skin, m: Core.M4(s * 0.012, 0.055, 0.015, 0, 0, s * 0.95) });
    return H;
  }
  // —— 头：比刘邦年轻、方下巴、浓眉怒目、络腮短须 ——
  function xyHead({ head, M, put, VG, st, C, cg }) {
    const SX = 0.086, SY = 0.12, SZ = 0.1, HY = 0.1;
    const ZF = [[1.0, 0.0], [0.8, 0.6], [0.6, 0.85], [0.42, 0.96], [0.3, 1.04], [0.17, 0.95], [0.02, 0.96], [-0.28, 0.99], [-0.41, 1.02], [-0.54, 0.99], [-0.64, 0.92], [-0.78, 0.99], [-0.9, 0.78], [-1.0, 0.3]];
    const WF = [[1.0, 0.9], [0.5, 1.0], [0.25, 0.98], [0.0, 1.0], [-0.2, 0.98], [-0.45, 0.93], [-0.65, 0.82], [-0.85, 0.62], [-1.0, 0.4]];   // 方下巴：下半张脸比刘邦宽
    const tab = (T, y) => { for (let i = 0; i < T.length - 1; i++) if (y <= T[i][0] && y >= T[i + 1][0]) { const t = (T[i][0] - y) / (T[i][0] - T[i + 1][0]), e = t * t * (3 - 2 * t); return T[i][1] + (T[i + 1][1] - T[i][1]) * e; } return T[T.length - 1][1]; };
    const G2 = (a, b) => Math.exp(-(a * a + b * b));
    const deform = (x, y, z) => { const ax = Math.abs(x), front = sstep(0.15, 0.9, z);
      x *= tab(WF, y);
      if (z > 0) z *= 1 + (tab(ZF, y) - 1) * front * (1 - 0.5 * sstep(0.3, 0.8, ax));
      if (z < 0) { z *= 1.06 + 0.06 * sstep(-0.2, 0.5, y); if (y < -0.3) z *= 1 - 0.25 * sstep(-0.3, -0.9, y); }
      z -= (cg ? 0.11 : 0.075) * Math.exp(-(((ax - 0.33) / 0.15) ** 2 + ((y - 0.12) / 0.1) ** 2)) * front;   // 眼窝
      z += 0.07 * Math.exp(-(((ax - 0.56) / 0.17) ** 2 + ((y + 0.04) / 0.15) ** 2)) * front;
      if (cg) {
        z += 0.06 * G2((ax - 0.3) / 0.22, (y - 0.27) / 0.05) * front;          // 眉弓：一道横着的骨棱压在眼窝上
        z += 0.035 * G2((ax - 0.58) / 0.1, (y - 0.0) / 0.1) * front;          // 颧骨
        z -= 0.03 * G2((ax - 0.22) / 0.05, (y + 0.3) / 0.12) * front;          // 鼻唇沟
        z += 0.03 * G2(ax / 0.1, (y + 0.86) / 0.07) * front;                   // 下巴尖
        x *= 1 - 0.04 * G2((ax - 0.75) / 0.2, (y - 0.15) / 0.15) * front;     // 太阳穴往里收
      }
      if (y < -0.35 && y > -0.9) x *= 1 + 0.08 * Math.exp(-(((y + 0.62) / 0.14) ** 2)) * (1 - front * 0.5);
      return [x * SX, y * SY, z * SZ]; };
    const g = new THREE.SphereGeometry(1, 128, 96), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) P.setXYZ(i, ...deform(P.getX(i), P.getY(i), P.getZ(i)));
    g.computeVertexNormals();
    put(head, g, M(0xffffff, { map: cg ? faceTexCG(st, C) : faceTex(st, C) }), 0.006).position.y = HY;
    // 脸上一点（单位球坐标 x, y，朝前）在头里的位置和法线
    const onFace = (x, y) => { const z = Math.sqrt(Math.max(0.02, 1 - x * x - y * y)), p = V(...deform(x, y, z)), q = V(...deform(x * 1.01, y * 1.01, z * 1.01)); p.y += HY; q.y += HY; return { p, n: q.sub(p).normalize() }; };
    if (cg) cgFace({ head, M, put, VG, st, C, onFace, HY, SX, SY, SZ });
    const faceZ = y => tab(ZF, y) * SZ;
    const nose = gridGeo(24, 20, (u, v) => { const y = 0.15 - v * 0.44, a = (u - 0.5) * PI, prof = v < 0.82 ? 0.004 + 0.025 * Math.pow(v / 0.82, 1.1) : 0.029 - 0.045 * Math.pow((v - 0.82) / 0.18, 1.6), w = 0.008 + 0.007 * v * v + 0.012 * sstep(0.7, 0.95, v) * (1 - sstep(0.97, 1, v)); return [Math.sin(a) * w, y * SY, faceZ(y) - 0.004 + Math.cos(a) * Math.max(0.003, prof)]; }, false);
    put(head, nose, M(C.skin), 0.0045).position.y = HY;
    for (const s of [-1, 1]) { const e = gridGeo(24, 8, (u, v) => { const a = u * TAU, r = 0.02 * (1 - 0.45 * v); return [s * (0.002 + v * 0.01), Math.cos(a) * r * 1.5, Math.sin(a) * r]; }); const em = put(head, e, M(C.skin), 0.004); em.position.set(s * SX * 0.97, HY - 0.004, -0.012); }
    // 络腮短须：贴着下巴、两腮一层短胡子（一绺绺短锥），八字须
    const B = []; seed = 41;
    for (let k = 0; k < (cg ? 520 : 170); k++) {
      const a = (rnd() - 0.5) * 2.5, yy = -0.4 - rnd() * 0.52, cy = Math.cos(a), sa = Math.sin(a);
      const r0 = V(sa * SX * tab(WF, yy) * 0.98, HY + yy * SY, Math.max(0.01, cy * faceZ(yy) * 0.98));
      if (Math.abs(sa) < 0.18 && yy > -0.6) continue;   // 嘴下面留空
      const n = r0.clone().sub(V(0, HY + yy * SY * 0.6, -0.01)).normalize(), l = (0.012 + rnd() * 0.012 + (yy < -0.78 ? 0.012 : 0)) * (cg ? 0.72 : 1);   // cg：短须，别像一挂门帘
      B.push({ geo: taper([r0.clone().addScaledVector(n, -0.002), r0.clone().addScaledVector(n, l * 0.35).add(V(0, -l * 0.45, 0)), r0.clone().addScaledVector(n, l * 0.3).add(V(0, -l, 0))], cg ? 0.0045 : 0.009, cg ? 0.0008 : 0.002, cg ? 4 : 5, 6), color: cg && rnd() < 0.25 ? 0x2a2018 : C.hair, m: new THREE.Matrix4() });
    }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const z = faceZ(-0.35) + 0.008; B.push({ geo: taper([V(s * 0.005, HY - SY * 0.33 - k * 0.002, z), V(s * 0.026, HY - SY * 0.37, z - 0.006), V(s * 0.04, HY - SY * 0.45, z - 0.016)], 0.0065, 0.0015, 6, 8), color: C.hair, m: new THREE.Matrix4() }); }
    // 第三阶段：没盔，发髻 + 散下来的几绺
    if (st >= 3) {
      const hairTex = cv(512, 256, (gg, w, h) => { gg.fillStyle = hex(C.hair); gg.fillRect(0, 0, w, h); gg.globalAlpha = 0.5; for (let i = 0; i < 240; i++) { gg.strokeStyle = rnd() < 0.12 ? '#5a5048' : '#080605'; gg.lineWidth = 1 + rnd() * 1.4; const x = rnd() * w; gg.beginPath(); gg.moveTo(x, 0); gg.quadraticCurveTo(x + (rnd() - 0.5) * 14, h / 2, x + (rnd() - 0.5) * 8, h); gg.stroke(); } });
      const cap = new THREE.SphereGeometry(1, 96, 64, 0, TAU, 0, PI * 0.78), CP = cap.attributes.position;
      const HL = [[0, 0.5], [0.45, 0.55], [0.85, 0.38], [1.12, 0.28], [1.22, -0.06], [1.32, -0.06], [1.38, 0.28], [1.62, 0.28], [1.85, 0.05], [2.3, -0.42], [PI, -0.62]];
      for (let i = 0; i < CP.count; i++) {
        let x = CP.getX(i), y = CP.getY(i), z = CP.getZ(i); const phi = Math.abs(Math.atan2(x, z));
        let line = -0.62; for (let k = 0; k < HL.length - 1; k++) if (phi >= HL[k][0] && phi <= HL[k + 1][0]) { const t = (phi - HL[k][0]) / (HL[k + 1][0] - HL[k][0]); line = HL[k][1] + (HL[k + 1][1] - HL[k][1]) * t * t * (3 - 2 * t); break; }
        const th = 0.0015 + 0.006 * sstep(line, line + 0.3, y); if (y < line) y = line;
        const front = sstep(0.1, 0.8, z); let X = x * tab(WF, y), Z = z; if (Z > 0) Z *= 1 + (tab(ZF, Math.max(y, 0.3)) - 1) * front; else Z *= 1.06 + 0.06 * sstep(-0.2, 0.5, y);
        const n = V(X, y, Z).normalize(); CP.setXYZ(i, X * SX + n.x * th, y * SY + n.y * th + HY, Z * SZ + n.z * th);
      }
      cap.computeVertexNormals(); put(head, cap, M(0xffffff, { map: hairTex }), 0.004);
      const bun = put(head, new THREE.SphereGeometry(0.038, 24, 16), M(0xffffff, { map: hairTex }), 0.004); bun.position.set(0, HY + SY * 1.0, -0.012); bun.scale.set(1, 0.85, 1);
      for (const [x0, z0, len, sw] of [[0.078, 0.02, 0.22, 0.02], [0.082, -0.03, 0.27, 0.03], [-0.077, 0.02, 0.2, -0.02], [-0.082, -0.03, 0.25, -0.025], [0.03, -0.09, 0.3, 0.01], [-0.02, -0.095, 0.28, -0.01]]) {
        const y0 = HY + SY * 0.62; B.push({ geo: taper([V(x0 * 0.6, y0 + 0.02, z0 * 0.6), V(x0 * 1.12, y0 - 0.04, z0 * 1.05), V(x0 * 1.2 + sw, y0 - len * 0.55, z0 * 1.1), V(x0 * 1.25 + sw * 2, y0 - len, z0 * 1.12 - 0.01)], 0.0058, 0.0015, 6, 12), color: C.hair, m: new THREE.Matrix4() });
      }
      B.push({ geo: taper([V(0.02, HY + SY * 0.75, SZ * 0.55), V(0.045, HY + SY * 0.45, SZ * 0.97), V(0.035, HY + SY * 0.12, SZ * 1.03)], 0.0045, 0.0012, 6, 10), color: C.hair, m: new THREE.Matrix4() });
    }
    head.add(VG(B, 0.0026));
  }
  function cgFace({ head, M, put, VG, st, C, onFace, HY, SX, SY }) {
    const J = head.userData.J = {};
    const angry = st < 3; seed = 77;
    J.lids = [];
    for (const s of [-1, 1]) {
      const { p, n } = onFace(s * 0.31, 0.09), c = p.clone().addScaledVector(n, -0.004);   // 眼珠前沿露出眼窝一点
      const eye = new THREE.Group(); eye.position.copy(c); head.add(eye);
      const iris = cv(128, 128, (g, w) => { g.fillStyle = '#efe7da'; g.fillRect(0, 0, w, w); g.save(); g.translate(64, 64); g.scale(0.5, 1); const gr = g.createRadialGradient(0, 0, 3, 0, 0, 22); gr.addColorStop(0, '#120a06'); gr.addColorStop(0.35, '#2a170c'); gr.addColorStop(0.85, '#4a2c18'); gr.addColorStop(1, '#1a0f08'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.fillStyle = '#060403'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.restore(); });   // 球面贴图横向一圈是 360°，纵向 180°，横着压一半才是圆
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0128, 24, 16).rotateY(-PI / 2), M(0xffffff, { map: iris })); ball.rotation.set(-0.08, s * -0.12, 0); eye.add(ball);   // 贴图中心朝 +z（瞳孔朝前）
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff8ee })); glint.position.set(s * -0.003, 0.004, 0.0126); eye.add(glint);
      // 上眼皮：一片皮壳，睁眼时卷在眼珠上沿（只盖上面三分之一），眨眼时往下合
      const lid = new THREE.Group(); eye.add(lid);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.0138, 24, 10, 0, TAU, 0, PI * 0.5), M(C.skin, { side: THREE.DoubleSide })); shell.rotation.x = 0.0; lid.add(shell);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(0.0134, 0.0011, 4, 24, PI), M(0x120c08)); lash.rotation.set(PI / 2, 0, PI); lash.position.y = 0.0; lid.add(lash);
      lid.rotation.x = -(angry ? 0.32 : 0.45); lid.userData.open = lid.rotation.x; J.lids.push(lid);   // 怒目：眼皮抬得高一点
      const lower = new THREE.Mesh(new THREE.TorusGeometry(0.0132, 0.0018, 4, 20, PI * 0.9), M(C.skin)); lower.rotation.set(PI / 2 + 0.25, 0, PI * 0.05); lower.position.y = -0.003; eye.add(lower);
    }
    // 眉：一根根的短毛沿着眉弓排，眉头低、眉尾挑（怒）；第三阶段眉头往上皱
    const B = [];
    for (const s of [-1, 1]) for (let k = 0; k < 150; k++) {
      const t = rnd(), x = s * (0.1 + t * 0.44), y = (angry ? 0.21 + 0.1 * t : 0.27 - 0.03 * t + 0.03 * Math.sin(t * PI)) + (rnd() - 0.5) * 0.035 * (1 - 0.6 * t);
      const { p, n } = onFace(x, y), dir = V(s * (0.6 + 0.3 * t), angry ? 0.35 + 0.3 * t : 0.25, 0.15).normalize(), l = 0.008 + 0.006 * rnd() * (1 - 0.5 * t);
      const b0 = p.clone().addScaledVector(n, 0.0005); B.push({ geo: taper([b0, b0.clone().addScaledVector(dir, l * 0.5).addScaledVector(n, 0.0012), b0.clone().addScaledVector(dir, l).addScaledVector(n, 0.0008)], 0.0011, 0.0003, 3, 3), color: rnd() < 0.2 ? 0x2a2018 : C.hair, m: new THREE.Matrix4() });
    }
    head.add(VG(B, 0));
    // 嘴：上唇薄、下唇厚一点；下唇和颏下胡子在下巴组里，说话时下巴往下开
    const m0 = onFace(0, -0.455), jaw = new THREE.Group(); jaw.position.copy(onFace(0, -0.1).p).add(V(0, 0, -0.06)); head.add(jaw); J.jaw = jaw;
    const lipMat = M(0xa06450), mouth = M(0x2a120e);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.0042, 0.026, 4, 12).rotateZ(PI / 2), lipMat); up.scale.set(1, 0.6, 0.7); up.position.copy(m0.p).addScaledVector(m0.n, 0.001).add(V(0, 0.003, 0)); head.add(up);
    const gap = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.028, 4, 10).rotateZ(PI / 2), mouth); gap.position.copy(m0.p).addScaledVector(m0.n, -0.002).add(V(0, -0.002, 0)); head.add(gap);
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.022, 4, 12).rotateZ(PI / 2), lipMat); lo.scale.set(1, 0.65, 0.75); const lp = m0.p.clone().addScaledVector(m0.n, 0.0005).add(V(0, -0.008, 0)); jaw.worldToLocal ? null : null; lo.position.copy(lp.clone().sub(jaw.position)); jaw.add(lo);
  }
  // 过场版的脸皮：不再画眼睛、眉毛、嘴线，只有肤色的冷暖、胡茬的青底、眼下的暗、发际线
  function faceTexCG(st, C) {
    const skin = '#' + C.skin.toString(16).padStart(6, '0');
    return cv(2048, 1024, (g, w, h) => {
      g.fillStyle = skin; g.fillRect(0, 0, w, h);
      const uv = (x, y, z) => { const L = Math.hypot(x, y, z); x /= L; y /= L; z /= L; let ph = Math.atan2(z, -x); if (ph < 0) ph += TAU; return [ph / TAU * w, Math.acos(clamp(y, -1, 1)) / PI * h]; };
      const P = (x, y) => uv(x, y, Math.sqrt(Math.max(0.05, 1 - x * x - y * y)));
      const blob = (x, y, r, col) => { const q = P(x, y), gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); };
      seed = 91; for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '90,50,35' : '255,230,210'},${0.03 + rnd() * 0.04})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }   // 皮肤的细斑
      blob(0, -0.62, 200, 'rgba(40,32,28,.42)');   // 胡茬青底
      for (const s of [-1, 1]) { blob(s * 0.31, 0.03, 40, 'rgba(70,40,30,.35)'); blob(s * 0.5, -0.1, 70, 'rgba(160,70,50,.18)'); blob(s * 0.31, 0.16, 46, 'rgba(60,35,25,.3)'); }   // 眼下暗、颧上红、眼窝暗
      blob(0, -0.3, 60, 'rgba(150,80,60,.15)');
      if (st >= 3) { for (const [x, y, r] of [[0.45, -0.1, 26], [-0.35, 0.35, 20]]) blob(x, y, r, 'rgba(120,20,14,.55)'); }
      g.fillStyle = '#' + C.hair.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h * 0.17); g.fillRect(w * 0.5, 0, w * 0.5, h * 0.56); g.fillRect(0, 0, w * 0.07, h * 0.56);
    });
  }
  function faceTex(st, C) {
    const skin = '#' + C.skin.toString(16).padStart(6, '0');
    return cv(2048, 1024, (g, w, h) => {
      g.fillStyle = skin; g.fillRect(0, 0, w, h);
      const uv = (x, y, z) => { const L = Math.hypot(x, y, z); x /= L; y /= L; z /= L; let ph = Math.atan2(z, -x); if (ph < 0) ph += TAU; return [ph / TAU * w, Math.acos(clamp(y, -1, 1)) / PI * h]; };
      const P = (x, y) => uv(x, y, Math.sqrt(Math.max(0.05, 1 - x * x - y * y)));
      const path = pts => { g.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); };
      const line = (pts, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; path(pts); g.stroke(); };
      const fill = (pts, col) => { g.fillStyle = col; path(pts); g.closePath(); g.fill(); };
      const blob = (x, y, r, col) => { const q = P(x, y), gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); };
      blob(0, -0.6, 190, 'rgba(40,32,28,.35)');   // 络腮胡的青底
      for (let k = 0; k < 8; k++) { const y = 0.12 - k * 0.045; blob(-0.1 - k * 0.006, y, 26 + k * 2, 'rgba(120,70,50,.16)'); }
      for (const s of [-1, 1]) {
        // 怒眉：粗，眉头压低、眉尾上挑；第三阶段眉头往上皱
        const angry = st < 3;
        for (let k = 0; k < 30; k++) { const t = k / 29, x = s * (0.08 + t * 0.46), y = angry ? 0.2 + 0.11 * t : 0.27 - 0.03 * t + 0.03 * Math.sin(t * PI); line([[x, y - 0.03], [x + s * 0.04, y + 0.014]], 6, 'rgba(22,17,14,.92)'); }
        const ey = 0.085;
        fill([[s * 0.15, ey], [s * 0.25, ey + 0.035], [s * 0.37, ey + 0.04], [s * 0.47, ey + 0.012], [s * 0.36, ey - 0.03], [s * 0.24, ey - 0.03]], '#f2ece0');
        const ir = P(s * 0.31, ey + 0.004); g.fillStyle = '#3a2214'; g.beginPath(); g.arc(ir[0], ir[1], 12, 0, TAU); g.fill(); g.fillStyle = '#0c0806'; g.beginPath(); g.arc(ir[0], ir[1], 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ir[0] - 4, ir[1] - 5, 3, 0, TAU); g.fill();
        line([[s * 0.13, ey + 0.004], [s * 0.25, ey + 0.042], [s * 0.38, ey + 0.046], [s * 0.49, ey + 0.016]], 7, '#120e0b');
        line([[s * 0.18, ey + 0.065], [s * 0.32, ey + 0.08], [s * 0.45, ey + 0.055]], 2.5, 'rgba(90,50,35,.5)');
        line([[s * 0.12, -0.2], [s * 0.19, -0.32]], 3, 'rgba(110,60,40,.4)');
      }
      line([[-0.04, 0.24], [0, 0.19], [0.04, 0.24]], 3, 'rgba(110,60,40,.5)');   // 眉间皱
      if (st >= 3) line([[-0.2, 0.4], [0.2, 0.4]], 2.5, 'rgba(110,60,40,.35)');
      fill([[-0.13, -0.455], [0, -0.44], [0.13, -0.455], [0.06, -0.5], [-0.06, -0.5]], '#8a4a3c');
      line([[-0.15, -0.458], [0, -0.452], [0.15, -0.458]], 4.5, '#2a120e');
      if (st >= 3) { for (const [x, y, r] of [[0.45, -0.1, 26], [-0.35, 0.35, 20]]) blob(x, y, r, 'rgba(120,20,14,.55)'); line([[0.3, 0.32], [0.42, 0.12]], 4, 'rgba(120,24,16,.7)'); }
      g.fillStyle = '#' + C.hair.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h * 0.17); g.fillRect(w * 0.5, 0, w * 0.5, h * 0.56); g.fillRect(0, 0, w * 0.07, h * 0.56);
    });
  }
  // —— 盔：盔钵（黑铁、竖棱）、金盔沿、顶上金尖和红缨、两根长雉尾；盔后面一圈护颈甲片绕到腮边 ——
  function helmet({ head, M, put, VG, st, C, lamMat, cg }) {
    const H = new THREE.Group(); H.position.set(0, 0.1, -0.006); head.add(H);
    const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16, a = t * PI / 2; prof.push(new THREE.Vector2(Math.max(0.004, Math.cos(a) * 0.112), 0.075 + Math.sin(a) * 0.105 + (t > 0.85 ? (t - 0.85) * 0.06 : 0))); }
    const domeT = cv(512, 128, (g, w, h) => { g.fillStyle = '#34302c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d1a18'; g.lineWidth = 5; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * w / 12, 0); g.lineTo(i * w / 12, h); g.stroke(); } });
    const dome = new THREE.LatheGeometry(prof, 48); dome.scale(1, 1, 1.12);
    put(H, dome, M(0xffffff, { map: domeT }), 0.006);
    put(H, gridGeo(64, 2, (u, v) => { const a = u * TAU, y = 0.09 - v * 0.04, r = 0.118; return [Math.sin(a) * r, y, Math.cos(a) * r * 1.12]; }), (() => { const t = bandTex(C.gold, 18); t.repeat.set(2, 1); return M(0xffffff, { map: t }); })(), 0.005);
    put(H, new THREE.ConeGeometry(0.018, 0.09, 12), M(C.gold), 0.004).position.y = 0.235;
    put(H, new THREE.CylinderGeometry(0.024, 0.03, 0.03, 16), M(C.plume), 0.004).position.y = 0.19;
    // 护颈：从盔沿垂到肩，绕后脑和两腮（正面留出脸）
    put(H, gridGeo(48, 8, (u, v) => { const a = PI + (u - 0.5) * 2 * 2.15, y = 0.065 - v * 0.17, front = sstep(1.3, 2.15, Math.abs(a - PI)), r = (0.105 + 0.016 * v) * (1 - 0.12 * front * v); return [Math.sin(a) * r * 0.98, y, Math.cos(a) * r * 1.06 - 0.004]; }, false), (() => { const m = lamMat(5, 2); m.side = THREE.DoubleSide; return m; })(), 0.005);
    // 雉尾：长、窄、带横纹，往两边弯；第二阶段折了一根
    const FT = featherTex();
    for (const s of [-1, 1]) {
      const broken = st === 2 && s === 1, L = broken ? 0.38 : 0.85;
      const curve = cg ? new THREE.QuadraticBezierCurve3(V(s * 0.02, 0.2, -0.01), V(s * 0.05, 0.2 + L * 0.5, -0.05), broken ? V(s * 0.1, 0.2 + L * 0.75, -0.06) : V(s * 0.17, 0.2 + L * 0.97, -0.09))
        : new THREE.QuadraticBezierCurve3(V(s * 0.02, 0.2, -0.01), V(s * 0.1, 0.2 + L * 0.55, -0.04), broken ? V(s * 0.2, 0.2 + L * 0.7, -0.02) : V(s * 0.42, 0.2 + L * 0.85, -0.02));
      const geo = gridGeo(2, 30, (u, v) => { const p = curve.getPoint(v), tg = curve.getTangent(v), side = V(0, 0, 1).cross(tg).normalize(), wd = 0.028 * (1 - 0.75 * Math.pow(v, 1.5)) * (u * 2 - 1); return [p.x + side.x * wd, p.y + side.y * wd, p.z + side.z * wd]; }, false);
      put(H, geo, M(0xffffff, { map: FT, side: THREE.DoubleSide }), 0.003);
      if (broken) { const tip = curve.getPoint(1); const g2 = taper([tip, tip.clone().add(V(s * 0.1, -0.12, 0.02)), tip.clone().add(V(s * 0.14, -0.3, 0.03))], 0.012, 0.002, 4, 10); put(H, g2, M(C.feather), 0.003); }
    }
  }
  return { make };
})();
