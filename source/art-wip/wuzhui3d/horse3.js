// ===== 乌骓 v3（CG组，cg-004 返工）：在 v2（horse.js）上改——眼睛有眼皮会眨、鬃毛不再一齿一齿、红缨改成一缕缕的穗子（原来的大红锥在侧面看像一对红眼）、鼻孔会张。接口和 v2 一样。
// ===== 原注：乌骓：项羽的坐骑（终局演出用）。照审批台 068 的设计稿第二版：真马比例、通身乌黑带青蓝反光、四蹄白（踏雪）、剪立鬃、挽尾、朱红鞍鞯、铜当卢、S 形镳 =====
// 单位：米，+X 朝前，地面 y = 0，肩高约 1.55。卡通描墨，带骨架：
//   make({ stage }) → { group, update(dt), 状态量 }
//   状态量：speed（0 站 · 0.3 慢走 · 1 快步 · 2 奔驰）、headK（-1 低头吃草/蹭人 ~ 0 平常 ~ 1 昂首）、rearK 人立、pawK 刨蹄、snortK 喷鼻、
//           earK（-1 耳朵贴后 ~ 1 竖前）、tailK 甩尾、lookY 头左右转、dead 倒地、muddy 泥（乌江）
const WuZhui3 = (() => {
  const { P, inkedMerged } = Models;
  const { toon, inked, canvasTex } = Core;
  const loft = TigerHD.loft, V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, lerp = (a, b, t) => a + (b - a) * t;
  const COAT = 0x1c1a1e, SHEEN = '#5a6478', SOCK = 0xece4d2, HOOF = 0x3e352e, MANE = 0x0e0d0f, FELT = '#9e2418', FELT2 = '#6c160f', TRIM = '#c9a14a', BRONZE = 0xb08a3e, LEATHER = 0x3a2418, TASSEL = 0xb0261a;
  // ---------- 毛色贴图：乌黑底，顺毛方向一道道青蓝反光；腿下截白（u 绕一圈、v 沿身子） ----------
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const memo = {}, once = (k, f) => memo[k] || (memo[k] = f());
  function coatTex(kind, mud) {
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#121014'; g.fillRect(0, 0, w, h);
      // 背上（u≈0.5）亮一点的青蓝反光带
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(90,100,120,0)'); gr.addColorStop(0.35, 'rgba(90,100,120,.22)'); gr.addColorStop(0.5, 'rgba(110,124,150,.38)'); gr.addColorStop(0.65, 'rgba(90,100,120,.22)'); gr.addColorStop(1, 'rgba(90,100,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      seed = 7 + kind.length;
      for (let i = 0; i < 900; i++) { const x = rnd() * w, y = rnd() * h, l = 6 + rnd() * 14; g.strokeStyle = `rgba(${rnd() < 0.5 ? '120,132,160' : '10,9,12'},${0.05 + rnd() * 0.08})`; g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y + l); g.stroke(); }
      if (kind === 'leg') {   // 腿：下截（v 大的一头）白，边缘毛茸茸地参差
        for (let x = 0; x < w; x += 2) { const y0 = h * (0.45 + 0.04 * Math.sin(x * 0.07) + 0.03 * Math.sin(x * 0.19 + 1) + (rnd() - 0.5) * 0.03); g.fillStyle = '#ece4d2'; g.fillRect(x, 0, 2, h - y0); g.fillStyle = 'rgba(236,228,210,.5)'; g.fillRect(x, h - y0, 2, 6 + rnd() * 6); }
        const sh = g.createLinearGradient(0, h * 0.85, 0, h); sh.addColorStop(0, 'rgba(180,170,150,0)'); sh.addColorStop(1, 'rgba(150,140,120,.45)'); g.fillStyle = sh; g.fillRect(0, h * 0.85, w, h * 0.15);
      }
      if (mud) {   // 乌江：泥点、泥浆从下往上溅（腿到膝、肚皮下沿）
        const top = kind === 'leg' ? 0.38 : 0, lim = kind === 'leg' ? 1 : 0.18;
        for (let i = 0; i < 260; i++) { const x = rnd() * w, y = kind === 'leg' ? h * (top + (1 - top) * Math.pow(rnd(), 0.6)) : (rnd() < 0.5 ? rnd() * h * lim : w), r = 2 + rnd() * 7; if (kind !== 'leg' && !(x < w * 0.18 || x > w * 0.82)) continue; g.fillStyle = `rgba(${96 + rnd() * 20 | 0},${78 + rnd() * 14 | 0},${58 + rnd() * 10 | 0},${0.5 + rnd() * 0.4})`; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + rnd() * 0.8), rnd() * 3, 0, 7); g.fill(); }
        if (kind === 'leg') { const mg = g.createLinearGradient(0, h * 0.62, 0, h); mg.addColorStop(0, 'rgba(107,86,64,0)'); mg.addColorStop(0.4, 'rgba(107,86,64,.7)'); mg.addColorStop(1, 'rgba(88,70,52,.92)'); g.fillStyle = mg; g.fillRect(0, h * 0.62, w, h * 0.38); }
      }
    });
  }
  const coatMat = (kind, mud) => once('coat' + kind + (mud ? 'M' : ''), () => toon(0xffffff, { map: coatTex(kind, mud), unique: true }));
  // 鞍鞯：朱红毛毡、墨底金回纹下沿
  function feltTex(mud) {
    return canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = mud ? '#86200f' : FELT; g.fillRect(0, 0, w, h);
      seed = 3; for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,200,180' : '60,10,5'},${0.04 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 1 + rnd() * 2); }
      const bh = h * 0.3; g.fillStyle = '#16120f'; g.fillRect(0, h - bh, w, bh);
      g.strokeStyle = mud ? '#a8894a' : TRIM; g.lineWidth = 4; g.beginPath(); g.moveTo(0, h - bh + 6); g.lineTo(w, h - bh + 6); g.moveTo(0, h - 6); g.lineTo(w, h - 6); g.stroke();
      const cw = w / 18, a = bh * 0.22, cy = h - bh / 2;
      for (let i = 0; i < 18; i++) { const x = i * cw + cw * 0.16, s = cw * 0.68; g.beginPath(); g.moveTo(x, cy + a); g.lineTo(x, cy - a); g.lineTo(x + s, cy - a); g.lineTo(x + s, cy + a); g.lineTo(x + s * 0.3, cy + a); g.lineTo(x + s * 0.3, cy - a * 0.2); g.lineTo(x + s * 0.68, cy - a * 0.2); g.stroke(); }
      if (mud) { for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(100,80,58,${0.4 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * w, h * (0.6 + rnd() * 0.4), 2 + rnd() * 6, 0, 7); g.fill(); } }
    });
  }

  // ---------- 躯干：屁股（x=-0.87）到胸前（x=0.86）；[x, y, z, 上, 下, 宽, 方度] ----------
  const TORSO = [
    [-0.9, 1.28, 0, 0.04, 0.04, 0.04], [-0.86, 1.28, 0, 0.17, 0.2, 0.17], [-0.76, 1.26, 0, 0.26, 0.3, 0.24], [-0.6, 1.24, 0, 0.32, 0.36, 0.27],
    [-0.38, 1.23, 0, 0.31, 0.35, 0.26], [-0.12, 1.2, 0, 0.29, 0.37, 0.27], [0.12, 1.2, 0, 0.3, 0.4, 0.28], [0.36, 1.24, 0, 0.33, 0.43, 0.27],
    [0.56, 1.29, 0, 0.32, 0.43, 0.24], [0.72, 1.3, 0, 0.27, 0.38, 0.2], [0.84, 1.28, 0, 0.17, 0.24, 0.15], [0.9, 1.26, 0, 0.04, 0.05, 0.05],
  ];
  // 肩胛、臀部的肌肉；肋骨略收
  const g2 = x => Math.exp(-x * x);
  const torsoMod = (u, t, c) => 0.07 * g2((c.x - 0.5) / 0.14) * g2((Math.abs(u - 0.5) - 0.18) / 0.08) + 0.06 * g2((c.x + 0.62) / 0.2) * g2((Math.abs(u - 0.5) - 0.12) / 0.1) - 0.03 * g2((c.x) / 0.25) * g2((Math.abs(u - 0.5) - 0.32) / 0.08);
  // 腿的长度（前：肘→膝→球节→蹄；后：膝→飞节→球节→蹄）
  const LEN = { f1: 0.45, f2: 0.27, h1: 0.52, h2: 0.36, p: 0.17, hoof: 0.07 };
  const FORE = V(0.52, 0.98, 0.17), HIND = V(-0.56, 1.02, 0.19);   // 腿根（相对躯干）

  function makeLeg(front, mats) {
    const top = new THREE.Group(), mid = new THREE.Group(), fet = new THREE.Group(), pas = new THREE.Group();
    const L1 = front ? LEN.f1 : LEN.h1, L2 = front ? LEN.f2 : LEN.h2;
    // 上段：前腿是前臂（上粗下细，前侧鼓），后腿是小腿（飞节上方后侧有跟腱）
    top.add(inked(loft(front
      ? [[0, 0.16, 0, 0.1, 0.12, 0.1], [0, 0.05, 0, 0.13, 0.15, 0.115], [0.005, -0.12, 0, 0.115, 0.1, 0.095], [0, -0.3, 0, 0.075, 0.065, 0.07], [0, -0.42, 0, 0.065, 0.06, 0.065], [0, -0.48, 0, 0.03, 0.03, 0.03]]
      : [[0, 0.24, 0, 0.16, 0.2, 0.13], [0.01, 0.06, 0, 0.15, 0.2, 0.125], [0, -0.15, 0, 0.09, 0.14, 0.09], [0, -0.33, 0, 0.06, 0.1, 0.065], [0, -0.47, 0, 0.06, 0.085, 0.06], [0, -0.54, 0, 0.03, 0.03, 0.03]],
      { len: 30, rad: 22 }), mats.coat));
    mid.position.y = -L1; top.add(mid);
    // 关节（前膝扁、后飞节有尖）+ 管骨：细直
    const jp = [P(new THREE.SphereGeometry(front ? 0.068 : 0.07, 14, 10), 0xffffff, 0, 0, 0, 0, 0, 0, front ? 1 : 1.3, 1.05, 0.9)];
    if (!front) jp.push(P(new THREE.ConeGeometry(0.035, 0.08, 8), 0xffffff, -0.07, 0.02, 0, 0, 0, PI / 2 + 0.3));
    const jm = inkedMerged(jp); jm.children[0].material = mats.coat; mid.add(jm);
    mid.add(inked(loft([[0, 0.02, 0, 0.055, 0.06, 0.05], [0, -0.06, 0, 0.042, 0.05, 0.04], [0, -0.17, 0, 0.04, 0.048, 0.038], [0, -L2 + 0.03, 0, 0.05, 0.055, 0.048], [0, -L2, 0, 0.052, 0.056, 0.05]], { len: 18, rad: 18 }), mats.leg));
    fet.position.y = -L2; mid.add(fet);
    // 球节（鼓）+ 系部（斜）+ 蹄（梯形）
    fet.add(inked(new THREE.SphereGeometry(0.062, 14, 10), mats.sock));
    pas.rotation.z = 0; fet.add(pas);
    pas.add(inked(loft([[0, 0, 0, 0.05, 0.055, 0.05], [0.01, -0.08, 0, 0.046, 0.05, 0.047], [0.02, -LEN.p + 0.02, 0, 0.055, 0.058, 0.055]], { len: 10, rad: 16 }), mats.sock));
    const hoof = new THREE.CylinderGeometry(0.062, 0.078, LEN.hoof, 18); hoof.translate(0.02, -LEN.p - LEN.hoof / 2 + 0.01, 0);
    pas.add(inked(hoof, mats.hoof));
    return { top, mid, fet, pas, front };
  }
  // 两段反解：腿根到球节（脚贴地时系部、蹄保持竖直）
  function solve(L, base, target) {
    const l1 = L.front ? LEN.f1 : LEN.h1, l2 = L.front ? LEN.f2 : LEN.h2;
    const dx = target.x - base.x, dy = target.y - base.y; let d = Math.hypot(dx, dy); d = Math.min(l1 + l2 - 0.002, Math.max(0.15, d));
    const a = Math.atan2(dx, -dy), al = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), be = Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
    // 前腿膝盖往前弯（膝向后折，蹄往后收），后腿飞节往后弯
    if (L.front) return [a + al, -(PI - be)]; else return [a - al, PI - be];
  }
  function makeHorse(o = {}) {
    const mud = !!o.mud;
    const mats = { coat: coatMat('body', mud), leg: coatMat('leg', mud), sock: toon(mud ? 0x9a8468 : SOCK), hoof: toon(HOOF), mane: toon(MANE) };
    const g = new THREE.Group(), bp = new THREE.Group(); bp.name = 'bp'; g.add(bp);
    const torsoGeo = loft(TORSO, { len: 80, rad: 48, mod: torsoMod }); bp.add(inked(torsoGeo, mats.coat));
    // ---- 颈：从肩隆往上弓起到项（poll） ----
    const neck = new THREE.Group(); neck.name = 'neck'; neck.position.set(0.62, 1.42, 0); bp.add(neck);
    const neckGeo = loft([[-0.18, -0.12, 0, 0.27, 0.3, 0.2], [0, 0, 0, 0.27, 0.25, 0.18], [0.16, 0.21, 0, 0.25, 0.17, 0.15], [0.3, 0.39, 0, 0.2, 0.12, 0.12], [0.42, 0.53, 0, 0.15, 0.09, 0.1], [0.5, 0.61, 0, 0.12, 0.085, 0.09], [0.54, 0.65, 0, 0.05, 0.05, 0.05]], { len: 48, rad: 40 });   // v3：颈脊拱起、喉部收细（原来是一根直筒）
    neck.add(inked(neckGeo, mats.coat));
    // 立鬃（v3）：几百缕细鬃沿颈脊立着，剪齐但梢头参差，微微往两边、往前倒；不再是一齿一齿的锯条
    const nat = neckGeo.userData.at;
    {
      const pos = [], idx = []; seed = 11; let k = 0;
      for (let i = 0; i < 420; i++) {
        const t = 0.05 + 0.88 * rnd(), side = (rnd() - 0.5) * 0.05, s0 = nat(0.5 + side, t), nn = s0.p.clone().sub(s0.c).normalize();
        const h = (0.065 + 0.03 * Math.sin(Math.PI * (t - 0.05) / 0.88)) * (0.85 + 0.25 * rnd()), w = 0.006 + 0.006 * rnd();
        const lean = V((rnd() - 0.3) * 0.25, 0, side * 6 + (rnd() - 0.5) * 0.3), dir = nn.clone().add(lean).normalize();
        const base = s0.p.clone().addScaledVector(nn, -0.012), tip = base.clone().addScaledVector(dir, h + 0.012), ax = V(0, 0, 1).cross(dir).normalize().multiplyScalar(w);
        for (const q of [base.clone().add(ax), base.clone().sub(ax), tip.clone().addScaledVector(ax, 0.25), tip.clone().addScaledVector(ax, -0.25)]) pos.push(q.x, q.y, q.z);
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); k += 4;
      }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setIndex(idx); mg.computeVertexNormals();
      const mm = new THREE.Mesh(mg, toon(MANE, { side: THREE.DoubleSide })); mm.castShadow = true; neck.add(mm);
    }
    // ---- 头：从项往前下，额头平、口鼻收窄 ----
    const head = new THREE.Group(); head.name = 'head'; head.position.set(0.52, 0.62, 0); neck.add(head);
    head.rotation.z = -0.95;   // 头前低（长轴往前下）
    const HEAD = [[-0.07, 0, 0, 0.07, 0.07, 0.07], [0.0, 0, 0, 0.15, 0.17, 0.12], [0.12, -0.01, 0, 0.15, 0.2, 0.13, 2.1], [0.26, -0.02, 0, 0.125, 0.145, 0.105, 2.2], [0.42, -0.03, 0, 0.1, 0.105, 0.085, 2.2], [0.58, -0.04, 0, 0.095, 0.1, 0.08, 2.2], [0.68, -0.05, 0, 0.09, 0.098, 0.082, 2.0], [0.745, -0.055, 0, 0.035, 0.045, 0.045]];
    const jowl = (u, t) => { const bot = Math.max(0, Math.cos(u * 2 * PI)), sideK = Math.abs(Math.sin(u * 2 * PI)); return 0.42 * Math.exp(-Math.pow((t - 0.2) / 0.11, 2)) * Math.pow(bot, 1.5) * (0.6 + 0.4 * sideK) - 0.1 * Math.exp(-Math.pow((t - 0.62) / 0.12, 2)) * sideK + 0.12 * Math.exp(-Math.pow((t - 0.9) / 0.06, 2)) * sideK; };
    const headGeo = loft(HEAD, { len: 64, rad: 48, mod: jowl }), hat = headGeo.userData.at; head.add(inked(headGeo, mats.coat));
    const hp = [];
    for (const s of [1, -1]) {
      const e = hat(0.5 + s * 0.215, 0.27).p;   // 眼：大，在头的上三分之一
      hp.push(P(new THREE.SphereGeometry(0.031, 20, 14), 0x1d120b, e.x, e.y + 0.005, e.z + s * 0.004, 0, 0, 0, 1.3, 1, 0.72));
      hp.push(P(new THREE.SphereGeometry(0.008, 8, 6), 0xfff6e8, e.x + 0.014, e.y + 0.017, e.z + s * 0.02));
    }
    // 眼皮（上下两片，眨眼时合上）、鼻孔（喷鼻时张开）
    const lids = [], nos = [];
    for (const s of [1, -1]) {
      const e = hat(0.5 + s * 0.215, 0.27).p, lg = new THREE.Group(); lg.position.set(e.x, e.y + 0.005, e.z + s * 0.004); head.add(lg);
      const up = new THREE.Mesh(new THREE.SphereGeometry(0.034, 18, 12), mats.coat); up.scale.set(1.3, 0.15, 0.8); up.position.y = 0.03; lg.add(up);   // 睁眼时压成一道眼皮褶在眼上沿，眨眼时撑开盖住眼珠
      lids.push(up);
      const n = hat(0.5 + s * 0.2, 0.92).p, nm = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), toon(0x050505)); nm.position.set(n.x + 0.005, n.y - 0.015, n.z + s * 0.006); nm.scale.set(1.2, 0.8, 0.6); head.add(nm); nos.push(nm);
    }
    head.add(inkedMerged(hp));
    // 耳：尖、往前竖（可转）
    const earGeo = (() => { const NU = 18, NV = 14, pos = [], idx = [];
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const v = j / NV, a = PI * 0.5 + (i / NU - 0.5) * PI * 1.55, r = 0.048 * Math.pow(1 - v, 0.75) * (1 + 0.35 * Math.sin(PI * v * 0.9)) + 0.002;
        pos.push(Math.cos(a) * r * 0.75 + 0.012 * Math.sin(PI * v), -0.035 + v * 0.215, Math.sin(a) * r * 0.62 - 0.012 * v * v); }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
    const earMat = toon(COAT, { side: THREE.DoubleSide, unique: true });
    const ears = [1, -1].map(s => { const ea = new THREE.Group(); ea.position.copy(hat(0.5 + s * 0.13, 0.05).p).add(V(-0.01, -0.01, 0)); head.add(ea);
      const m = new THREE.Mesh(earGeo, earMat); m.castShadow = true; m.rotation.set(s * 0.18, s * -0.35, 0.62); ea.add(m);   // 杯口朝前（+x），尖往上微微内收
      const base = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), mats.coat); base.scale.set(0.9, 0.7, 0.75); base.position.set(0.005, 0.0, 0); ea.add(base);   // 耳根鼓包，把接缝盖住
      return ea; });
    // 额鬃一撮，扎红绳
    const flp = [P(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10), TASSEL, 0.0, 0.13, 0, 0, 0, 0.9)]; seed = 31;
    for (let i = 0; i < 40; i++) { const a = rnd() * PI * 2, r = rnd() * 0.02, l = 0.1 + rnd() * 0.06; flp.push(P(new THREE.CylinderGeometry(0.003, 0.0012, l, 3), MANE, -0.02 + l * 0.48 + Math.cos(a) * r * 0.3, 0.135 - l * 0.12, Math.sin(a) * r, Math.sin(a) * 0.15, 0, -PI / 2 + 0.22 + (rnd() - 0.5) * 0.25)); }
    const fl = inkedMerged(flp); head.add(fl);
    // ---- 笼头、当卢、S 形镳 ----
    const tk = [];
    const band = (u0, t, r = 0.011) => { const pts = []; for (let j = 0; j <= 16; j++) { const s0 = hat(u0 + (j / 16), t), nn = s0.p.clone().sub(s0.c).normalize(); pts.push(s0.p.clone().addScaledVector(nn, 0.008)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 32, r, 6, true); };
    tk.push(P(band(0, 0.05), LEATHER), P(band(0, 0.72), LEATHER));                 // 项带、鼻革
    for (const s of [1, -1]) { const pts = [hat(0.5 + s * 0.24, 0.05).p, hat(0.5 + s * 0.28, 0.4).p, hat(0.5 + s * 0.3, 0.72).p].map(p => p.add(V(0, 0, s * 0.008))); tk.push(P(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011, 6), LEATHER)); }   // 颊革
    // 当卢：额前一片铜饰，中间一颗朱红
    const dl = hat(0.5, 0.33).p; void dl;
    {
      const pos = [], idx = [], NU = 12, NV = 22;
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const v = j / NV, w = 0.13 * Math.sin(PI * Math.pow(v, 0.8)) * (1 - 0.35 * v) + 0.01, u = 0.5 + (i / NU - 0.5) * w, s0 = hat(u, 0.1 + v * 0.36), nn = s0.p.clone().sub(s0.c).normalize(), q = s0.p.clone().addScaledVector(nn, 0.006 + 0.004 * Math.sin(PI * v)); pos.push(q.x, q.y, q.z); }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const plate = new THREE.Mesh(g, toon(0x9a7434, { side: THREE.DoubleSide, unique: true })); plate.castShadow = true; head.add(plate);
      const rim = []; for (const t of [0.16, 0.26, 0.36]) { const s0 = hat(0.5, t), nn = s0.p.clone().sub(s0.c).normalize(); rim.push(P(new THREE.SphereGeometry(0.012, 10, 8), 0xc9a14a, ...s0.p.clone().addScaledVector(nn, 0.012).toArray())); }
      const pl = hat(0.5, 0.03), pn = pl.p.clone().sub(pl.c).normalize(); seed = 47;
      rim.push(P(new THREE.CylinderGeometry(0.016, 0.02, 0.03, 10), 0x9a7434, ...pl.p.clone().addScaledVector(pn, 0.02).toArray()));
      for (let i = 0; i < 70; i++) { const a = rnd() * PI * 2, r = rnd() * 0.014, l = 0.13 + rnd() * 0.09, lean = 0.25 + rnd() * 0.35, c = pl.p.clone().addScaledVector(pn, 0.03);
        rim.push(P(new THREE.CylinderGeometry(0.0032, 0.001, l, 3), TASSEL, c.x + Math.cos(a) * r - Math.sin(lean) * l * 0.5, c.y + Math.cos(lean) * l * 0.5, c.z + Math.sin(a) * r, Math.sin(a) * 0.25, 0, lean)); }   // 红缨往后上方翘
      head.add(inkedMerged(rim));
    }
    // S 形镳：嘴角两侧
    for (const s of [1, -1]) { const m0 = hat(0.5 + s * 0.3, 0.86).p; const pts = [V(-0.02, 0.06, 0), V(0.02, 0.03, 0), V(-0.015, -0.01, 0), V(0.02, -0.05, 0)].map(p => p.add(m0).add(V(0, 0, s * 0.02))); tk.push(P(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.009, 6), BRONZE)); tk.push(P(new THREE.SphereGeometry(0.014, 8, 6), BRONZE, m0.x, m0.y + 0.01, m0.z + s * 0.02)); }
    head.add(inkedMerged(tk));
    // 颈下一大束红缨
    const tp = [P(new THREE.SphereGeometry(0.03, 10, 8), BRONZE, 0, 0, 0)]; seed = 23;
    for (let i = 0; i < 26; i++) { const a = rnd() * PI * 2, r = 0.012 + rnd() * 0.022, l = 0.16 + rnd() * 0.08; tp.push(P(new THREE.CylinderGeometry(0.004, 0.0015, l, 4), TASSEL, Math.cos(a) * r, -0.02 - l / 2, Math.sin(a) * r, Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12)); }
    const tas = inkedMerged(tp);
    tas.position.set(0.38, 0.28, 0); neck.add(tas);
    // ---- 尾：尾根挽一个结、扎红绳，结下垂一截 ----
    const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(-0.86, 1.36, 0); bp.add(tail);
    tail.add(inked(loft([[0.02, 0.03, 0, 0.045, 0.045, 0.045], [-0.05, -0.02, 0, 0.055, 0.055, 0.05], [-0.1, -0.1, 0, 0.05, 0.05, 0.045], [-0.12, -0.18, 0, 0.035, 0.035, 0.032], [-0.125, -0.22, 0, 0.012, 0.012, 0.012]], { len: 20, rad: 16 }), mats.coat));   // 尾骨（有毛皮）
    {
      const pos = [], idx = []; seed = 53; let k = 0;
      for (let i = 0; i < 520; i++) {
        const r0 = Math.sqrt(rnd()), a0 = rnd() * PI * 2, st0 = rnd() * 0.18, L = 0.75 + rnd() * 0.28 - st0 * 0.8, spread = 0.05 + 0.1 * rnd(), sw = (rnd() - 0.5) * 0.08;
        const pts = []; for (let j = 0; j <= 8; j++) { const v = j / 8, d = st0 + v * L;
          pts.push(V(-0.05 - (st0 + L) * (0.5 * Math.sin(v * PI * 0.55)) - 0.06 * v * v + Math.cos(a0) * r0 * 0.04, -0.02 - (st0 + L) * (0.18 * v + 0.62 * v * v) + 0.02 * Math.sin(v * PI), Math.sin(a0) * r0 * 0.05 + Math.sin(a0) * spread * v * v * 1.6 + sw * v)); }   // 先往后甩出去，再弧着垂下（Ham 截图画的样子）
        const w0 = 0.007 + 0.005 * rnd();
        for (let j = 0; j <= 8; j++) { const p = pts[j], t = (pts[Math.min(8, j + 1)].clone().sub(pts[Math.max(0, j - 1)])).normalize(), ax = V(0, 0, 1).cross(t).normalize().multiplyScalar(w0 * (1 - 0.7 * j / 8) + 0.0015);
          pos.push(p.x + ax.x, p.y + ax.y, p.z + 0.004, p.x - ax.x, p.y - ax.y, p.z - 0.004); }
        for (let j = 0; j < 8; j++) { const a = k + j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        k += 18;
      }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setIndex(idx); tg.computeVertexNormals();
      const tm = new THREE.Mesh(tg, toon(MANE, { side: THREE.DoubleSide, unique: true })); tm.castShadow = true; tail.add(tm);
    }
    tail.add(inkedMerged([P(new THREE.TorusGeometry(0.05, 0.014, 6, 16), TASSEL, -0.05, -0.03, 0, PI / 2 + 0.6, 0, 0)]));   // 尾根扎红绳
    // ---- 鞍鞯 + 低鞍桥（秦汉没有马镫） ----
    const tat = torsoGeo.userData.at, felt = toon(0xffffff, { map: feltTex(mud), unique: true }); felt.side = THREE.DoubleSide;
    {
      const pos = [], uv = [], idx = [], U0 = 0.2, U1 = 0.8, T0 = 0.34, T1 = 0.68, nu = 30, nt = 14;
      for (let i = 0; i <= nt; i++) for (let j = 0; j <= nu; j++) { const u = U0 + (U1 - U0) * j / nu, t = T0 + (T1 - T0) * i / nt, s0 = tat(u, t), nn = s0.p.clone().sub(s0.c); nn.x = 0; const p = s0.p.addScaledVector(nn.normalize(), 0.025); pos.push(p.x, p.y, p.z); const eu = Math.min(j, nu - j) / nu; uv.push(i / nt * 3, Math.min(1, 1 - eu * 2) * 0.999); }
      for (let i = 0; i < nt; i++) for (let j = 0; j < nu; j++) { const a = i * (nu + 1) + j, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      felt.map.wrapS = THREE.RepeatWrapping; bp.add(inked(geo, felt));
      const sp = [];
      for (const [t, h] of [[0.4, 0.09], [0.6, 0.11]]) { const s0 = tat(0.5, t); sp.push(P(new THREE.TorusGeometry(0.19, 0.035, 8, 20, PI), 0x16120f, s0.p.x, s0.p.y - 0.01, 0, 0, PI / 2, 0, 1, h / 0.2 * 0.5, 1)); }
      const s1 = tat(0.5, 0.5); sp.push(P(new THREE.BoxGeometry(0.3, 0.05, 0.36), 0x6c160f, s1.p.x, s1.p.y + 0.04, 0));
      bp.add(inkedMerged(sp));
      // 攀胸（胸前一道带，挂三束红缨）、鞧带（后鞒绕到尾下，挂三束红缨）
      const strapAt = (t, a0, a1, d = 0.03) => { const pts = []; for (let j = 0; j <= 20; j++) { const s0 = tat(a0 + (a1 - a0) * j / 20, t), nn = s0.p.clone().sub(s0.c).normalize(); pts.push(s0.p.addScaledVector(nn, d)); } return pts; };
      const st = [];
      for (const [t, k] of [[0.86, 1], [0.14, -1]]) {
        const pts = strapAt(t, 0.12, 0.88); st.push(P(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.016, 6), LEATHER));
        for (const a of [0.3, 0.5, 0.7]) { const s0 = tat(a, t), nn = s0.p.clone().sub(s0.c).normalize(), p = s0.p.addScaledVector(nn, 0.04); st.push(P(new THREE.SphereGeometry(0.018, 8, 6), BRONZE, p.x, p.y, p.z)); for (let q = 0; q < 9; q++) { const a = q / 9 * PI * 2, l = 0.09 + (q % 3) * 0.015; st.push(P(new THREE.CylinderGeometry(0.0035, 0.0015, l, 4), TASSEL, p.x + Math.cos(a) * 0.01, p.y - 0.015 - l / 2, p.z + Math.sin(a) * 0.01)); } }
      }
      bp.add(inkedMerged(st));
    }
    // ---- 腿 ----
    const legs = [];
    for (const [front, s] of [[1, 1], [1, -1], [0, 1], [0, -1]]) {
      const L = makeLeg(!!front, mats), a = front ? FORE : HIND; L.top.position.set(a.x, a.y, s * a.z); bp.add(L.top); L.s = s; legs.push(L);
    }
    const o2 = { group: g, bp, neck, head, ears, tail, legs, tas, lids, nos, torsoAt: tat, headAt: hat, neckAt: nat };
    return o2;
  }
  // ---------- 动作 ----------
  // 步态：每条腿的相位偏移、支撑比例。慢走四拍；快步对角；奔驰三拍 + 腾空
  const GAITS = {
    walk: { off: [0.5, 0, 0.75, 0.25], duty: 0.62, stride: 0.42, lift: 0.1, f: 0.9 },
    trot: { off: [0, 0.5, 0.5, 0], duty: 0.45, stride: 0.7, lift: 0.16, f: 1.5 },
    gallop: { off: [0.62, 0.52, 0.12, 0], duty: 0.3, stride: 1.5, lift: 0.22, f: 2.1 },
  };
  function make(opt = {}) {
    const H = makeHorse({ mud: opt.muddy || opt.stage === 2 });
    const st = { t: Core.rnd ? Core.rnd() * 5 : 0, speed: 0, headK: 0, rearK: 0, pawK: 0, snortK: 0, earK: 0.6, tailK: 0, lookY: 0, dead: 0, deadSide: 1, ph: 0 };
    const rest = [[0.54, 0.17], [0.54, -0.17], [-0.72, 0.19], [-0.72, -0.19]];
    const o = Object.assign(st, H, {
      update(dt) {
        o.t += dt;
        const sp = o.dead ? 0 : o.speed, G0 = sp <= 0.6 ? GAITS.walk : sp <= 1.4 ? GAITS.trot : GAITS.gallop;
        o.ph += dt * G0.f * Math.max(0.35, sp) * (sp > 0.02 ? 1 : 0);
        const s = Math.min(1, sp / 0.3), rk = sm(o.rearK), dk = o.dead, d1 = sm(dk / 0.5), d2 = sm((dk - 0.35) / 0.65);
        // 躯干：人立时绕后腿抬起；奔驰时前后起伏；倒地先跪再侧翻
        const pitch = rk * 0.95 + (sp > 1.4 ? Math.sin(o.ph * 2 * PI) * 0.06 : 0) - d1 * 0.12;
        const bob = s * Math.abs(Math.sin(o.ph * 2 * PI * (sp > 1.4 ? 1 : 2))) * (sp > 1.4 ? 0.09 : 0.025);
        const roll = o.deadSide * d2 * 1.4;
        o.bp.rotation.set(roll, 0, pitch * (1 - d2));
        const hx = -0.56, hy = 1.02, cP = Math.cos(pitch), sP = Math.sin(pitch), px = hx - (hx * cP - hy * sP), py = hy - (hx * sP + hy * cP) - rk * 0.12;   // 绕后腿根转；人立时后腿再蹲一点
        if (d2 > 0) { const cy = lerp(1.2 - 0.45 * d1, 0.42, d2); o.bp.position.set(px * (1 - d2), cy - 1.2 * Math.cos(roll), -1.2 * Math.sin(roll)); }   // 侧翻：绕躯干中心转，躺到地上
        else o.bp.position.set(px, py + bob - d1 * 0.45, 0);
        for (let i = 0; i < 4; i++) {
          const L = o.legs[i], base = L.top.position.clone(); let tx = rest[i][0], ty = LEN.p + LEN.hoof - 0.02, fz = 0;
          if (s > 0) { let u = o.ph + G0.off[i]; u -= Math.floor(u); if (u < G0.duty) tx += G0.stride * (0.5 - u / G0.duty) * s; else { const v = (u - G0.duty) / (1 - G0.duty); tx += G0.stride * (sm(v) - 0.5) * s; ty += G0.lift * Math.sin(v * PI) * s * (L.front ? 1.2 : 1); fz = Math.sin(v * PI) * s; } }
          if (!L.front) tx += rk * 0.18;
          if (L.front && i === 0 && o.pawK > 0) { const k = Math.sin(o.t * 9) * 0.5 + 0.5; ty += 0.18 * o.pawK * k; tx += 0.12 * o.pawK * (k - 0.3); fz = o.pawK * k; }   // 刨蹄：右前蹄一下下往前刨
          // 目标点换到躯干坐标里（躯干转了 pitch / roll）
          const wp = V(tx, ty, 0).sub(o.bp.position); const c = Math.cos(-pitch), sn = Math.sin(-pitch); const lx = wp.x * c - wp.y * sn, ly = wp.x * sn + wp.y * c;
          let [a1, a2] = solve(L, base, V(lx, ly, 0));
          if (rk > 0 && L.front) { a1 = lerp(a1, 0.9 + (i ? 0.25 : 0), rk); a2 = lerp(a2, -1.9 + (i ? 0.3 : 0), rk); }   // 人立：前腿收起蹬空
          if (d2 > 0) { a1 = lerp(a1, L.front ? 0.6 : -0.5, d2); a2 = lerp(a2, L.front ? -0.4 : 0.5, d2); }
          L.top.rotation.z = a1; L.mid.rotation.z = a2;
          // 球节以下：支撑时贴地竖直，抬腿时往后折
          const tot = a1 + a2 + pitch; L.fet.rotation.z = -tot + (L.front ? -1 : 1) * 0 - fz * (L.front ? 1.2 : 0.9) + 0.25;
        }
        // 颈、头：平常微微点头；低头（吃草 / 蹭人）；昂首；人立时高昂
        const hk = o.headK, nk = (hk < 0 ? lerp(0, -1.0, -hk) : lerp(0, 0.35, hk)) + rk * 0.25 - d2 * 0.4 + s * Math.sin(o.ph * 2 * PI * 2) * 0.04 * (sp > 1.4 ? 2 : 1) + Math.sin(o.t * 0.9) * 0.02 * (1 - s);
        o.neck.rotation.set(o.lookY * 0.35, o.lookY * 0.4, nk);
        o.head.rotation.set(0, o.lookY * 0.25, -0.95 + (hk < 0 ? -0.35 * -hk : 0.2 * hk) + o.snortK * Math.sin(o.t * 22) * 0.06 + rk * 0.3);
        for (const [j, e] of o.ears.entries()) e.rotation.set(0, 0, lerp(-0.9, 0.15, (o.earK + 1) / 2) + Math.sin(o.t * 1.3 + j * 2) * 0.05);
        o.tail.rotation.set(Math.sin(o.t * 1.7) * 0.12 + o.tailK * Math.sin(o.t * 9) * 0.5, Math.sin(o.t * 1.1) * 0.08, 0.15 + s * 0.25 + (sp > 1.4 ? 0.4 : 0) + rk * 0.3);
        o.tas.rotation.z = -nk * 0.6 + Math.sin(o.t * 3) * 0.05 * s;
        { const c = (o.t + 0.7) % (o.blinkEvery || 4.3), b = c < 0.18 ? Math.sin(c / 0.18 * PI) : 0, k = Math.max(b, o.blinkK || 0); for (const l of o.lids) { l.scale.y = lerp(0.15, 1.02, k); l.position.y = lerp(0.03, 0, k); } }
        for (const n of o.nos) { const f = 1 + 0.45 * o.snortK; n.scale.set(1.2 * f, 0.8 * f, 0.6 * f); }
      },
    });
    o.update(0);
    return o;
  }
  return { make, makeHorse, LEN, GAITS };
})();
window.WuZhui3 = WuZhui3;
