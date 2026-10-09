// 虎骑：各级造型并排 + 两种死法（炮击炸碎 / 中刀落虎）。按时间 t（0~1）定格出图
window.TGD = (() => {
  const V3 = THREE.Vector3, PI = Math.PI, TG = 0.27, root = () => Board.pieces.values().next().value.parent;
  const hideNear = (p, r) => { for (const m of Board.pieces.values()) if (Math.hypot(m.position.x - p.x, m.position.z - p.z) < r) m.visible = false; };
  let items = [], S = null;
  const sm = t => t * t * (3 - 2 * t), cl = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const rnd = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  function clear() { for (const x of items) x.parent && x.parent.remove(x); items = []; S = null; }
  function put(o, p, yaw) { o.group.scale.setScalar(TG); o.group.position.copy(p); o.group.rotation.y = yaw - PI / 2; root().add(o.group); items.push(o.group); o.update(0); return o; }
  // 四级并排（汉方，朝向镜头右前方）
  function lineup(o = {}) {
    clear();
    const c = Board.pos(4, 4), gap = o.gap ?? 1.15, yaw = o.yaw ?? -PI / 2 + 0.5;
    hideNear(c, 4.5);
    const ts = [1, 2, 3, 4].map((lv, i) => put(TigerLV.make('r', { lv }), new V3(c.x + (i - 1.5) * gap, Board.TOP, c.z), yaw));
    S = { kind: 'lineup', c, ts };
    return ts.length;
  }
  function cam(o = {}) {
    const c = S.c, d = o.d ?? 4.2, el = o.el ?? 0.38, az = o.az ?? 0;
    const pos = new V3(c.x + Math.sin(az) * Math.cos(el) * d, Board.TOP + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
    Core.Cam.cine = true; document.body.classList.add('cine');
    return Core.Cam.to(pos, new V3(c.x + (o.lx ?? 0), Board.TOP + (o.lh ?? 0.35), c.z + (o.lz ?? 0)), 0.05);
  }
  // ---- 死法 ----
  const glow = (c, a = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  function canvasTex(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  let puffT = null;
  const puffTex = () => puffT || (puffT = canvasTex(128, 128, (g, w) => { const R = rnd(3); for (let i = 0; i < 14; i++) { const x = w / 2 + (R() - 0.5) * w * 0.45, y = w / 2 + (R() - 0.5) * w * 0.45, r = w * (0.12 + R() * 0.16); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); } }));
  function sprite(color, blend) { const m = new THREE.SpriteMaterial({ map: puffTex(), color, transparent: true, depthWrite: false, opacity: 0 }); if (blend) { m.blending = THREE.AdditiveBlending; m.toneMapped = false; } const s = new THREE.Sprite(m); root().add(s); items.push(s); return s; }
  function cloneMats(o3, f) { o3.traverse(x => { if (x.material) { x.material = Array.isArray(x.material) ? x.material.map(m => m.clone()) : x.material.clone(); if (f) f(x.material); } }); }
  // 摆一只虎骑和一门来犯的炮 / 一队来犯的刀兵
  function stage(o = {}) {
    clear();
    const c = Board.pos(4, 5); hideNear(c, 3.2);
    const yaw = o.yaw ?? -PI / 2 + 0.35;
    const t = put(TigerLV.make('r', { lv: o.lv || 2 }), new V3(c.x, Board.TOP, c.z), yaw);
    const N = n => t.group.getObjectByName(n);
    const parts = { fig: N('fig'), staff: N('staff'), head: N('neck'), tail: N('tail'), hips: [0, 1, 2, 3].map(i => N('hip' + i)), bp: N('bp') };
    const fwd = new V3(Math.sin(yaw), 0, Math.cos(yaw)), right = new V3(fwd.z, 0, -fwd.x);
    S = { kind: o.kind, c, t, parts, fwd, right, yaw, det: false, lv: o.lv || 2 };
    if (o.kind === 'blast') buildBlast(); else buildFall();
    return true;
  }
  // 拆下来的件：记下世界里的初始位置、朝向，给一个初速度、角速度
  function detach(obj, v, w, rest) {
    const sc = root(); sc.attach(obj); if (!items.includes(obj)) items.push(obj); const p0 = obj.position.clone(), q0 = obj.quaternion.clone();
    return { obj, p0, q0, v, w, rest: rest ?? 0.04, axis: w.clone().normalize(), wl: w.length() };
  }
  const G = 6.5;
  function fly(f, t) {   // 抛物线 + 落地停住（落地后不再转）
    const yg = Board.TOP + f.rest, tl = (f.v.y + Math.sqrt(f.v.y * f.v.y + 2 * G * Math.max(0, f.p0.y - yg))) / G, tt = Math.min(t, tl);
    f.obj.position.set(f.p0.x + f.v.x * tt, Math.max(yg, f.p0.y + f.v.y * tt - 0.5 * G * tt * tt), f.p0.z + f.v.z * tt);
    f.obj.quaternion.copy(f.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(f.axis, f.wl * tt));
    // 落地后小幅滑一点
    if (f.qLand && t > tl) { const k = Math.min(1, (t - tl) / 0.25); f.obj.quaternion.slerp(f.qLand, k * k * (3 - 2 * k)); }
    if (t > tl) { const s = Math.min(0.12, (t - tl) * 0.6); f.obj.position.x += f.v.x * 0.15 * s / 0.12; f.obj.position.z += f.v.z * 0.15 * s / 0.12; }
  }
  function buildBlast() {
    const I = S.I = {};
    I.flash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), glow(0xfff1c0, 0)); root().add(I.flash); items.push(I.flash);
    I.fire = [...Array(7)].map(() => sprite(0xff9a3a, true));
    I.smoke = [...Array(12)].map(() => sprite(0x6a5e52));
    I.debris = [...Array(26)].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x1d1a17 })); root().add(m); items.push(m); return m; });
    I.scorch = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: 0x15120f, transparent: true, opacity: 0, depthWrite: false })); I.scorch.rotation.x = -PI / 2; root().add(I.scorch); items.push(I.scorch);
  }
  function buildFall() {
    const I = S.I = {};
    I.blood = [...Array(6)].map(() => sprite(0x8e1408));
    I.dust = [...Array(6)].map(() => sprite(0xc9b896));
  }
  function set(t) {
    if (!S) return; const I = S.I, c = S.c, tg = S.t;
    if (S.kind === 'blast') {
      const hit = 0.12;
      // 炸开那一刻：所有部件拆下来飞散，虎身被掀翻
      if (t >= hit && !S.det) {
        S.det = true; const R = rnd(17), P = S.parts, F = S.fwd, Rt = S.right;
        const v = (fw, up, sd) => F.clone().multiplyScalar(fw).add(new V3(0, up, 0)).add(Rt.clone().multiplyScalar(sd));
        cloneMats(tg.group, m => { if (m.color) m.color.multiplyScalar(0.55); });   // 熏黑
        const fl = [];
        fl.push(detach(P.staff, v(-0.4, 3.2, 1.4), new V3(5, 2, 7), 0.02));
        { const fr = detach(P.fig, v(-0.7, 2.4, -1.1), S.fwd.clone().multiplyScalar(1.2), 0.06); fr.qLand = fr.q0.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(S.fwd, PI / 2)); fl.push(fr); }
        fl.push(detach(P.head, v(1.4, 2.2, 0.6), new V3(3, 6, -5), 0.08));
        fl.push(detach(P.tail, v(-1.6, 1.6, 0.4), new V3(2, -7, 3), 0.02));
        P.hips.forEach((h, i) => fl.push(detach(h, v((i < 2 ? 1 : -1) * (0.6 + R()), 1.8 + R() * 1.2, (i % 2 ? 1 : -1) * (0.8 + R())), new V3(R() * 8 - 4, R() * 8 - 4, R() * 8 - 4), 0.03)));
        fl.push(detach(tg.group, v(0.1, 1.3, 0.9), new V3(F.x * 4, 0, F.z * 4).add(new V3(0, 0.5, 0)), 0.0));
        S.fl = fl; S.t0 = hit;
      }
      if (S.fl) { const tt = (t - S.t0) * 1.7; for (const f of S.fl) fly(f, Math.max(0, tt)); }
      const k = cl(t, hit, hit + 0.08), kf = cl(t, hit, 1);
      I.flash.position.set(c.x, Board.TOP + 0.4, c.z); I.flash.material.opacity = t >= hit ? 0.85 * Math.exp(-(t - hit) * 28) : 0; I.flash.scale.setScalar(0.4 + 1.3 * k);
      const R = rnd(5);
      I.fire.forEach((s, i) => { const a = R() * PI * 2, r = 0.15 + R() * 0.35, life = 0.25 + R() * 0.15, q = (t - hit) / life; s.material.opacity = q > 0 && q < 1 ? (1 - q) * 0.95 : 0; s.position.set(c.x + Math.cos(a) * r * (0.4 + q), Board.TOP + 0.25 + q * 0.5 + R() * 0.2, c.z + Math.sin(a) * r * (0.4 + q)); s.scale.setScalar(0.5 + q * 0.9); });
      I.smoke.forEach((s, i) => { const a = R() * PI * 2, r = 0.2 + R() * 0.5, t0 = hit + 0.02 + R() * 0.12, q = cl(t, t0, t0 + 0.75); s.material.opacity = q > 0 ? Math.min(1, q * 6) * (1 - q) * 0.55 : 0; s.position.set(c.x + Math.cos(a) * r * (0.5 + q * 1.2), Board.TOP + 0.25 + q * 0.8 + R() * 0.2, c.z + Math.sin(a) * r * (0.5 + q * 1.2)); s.scale.setScalar(0.35 + q * 1.0); });
      I.debris.forEach((d, i) => { const a = R() * PI * 2, sp = 1.2 + R() * 2.2, up = 1.5 + R() * 2.5, tt = Math.max(0, (t - hit) * 1.7); d.visible = t >= hit; const yg = Board.TOP + 0.01, tl = (up + Math.sqrt(up * up + 2 * G * 0.3)) / G, ta = Math.min(tt, tl);
        d.position.set(c.x + Math.cos(a) * sp * ta, Math.max(yg, Board.TOP + 0.3 + up * ta - 0.5 * G * ta * ta), c.z + Math.sin(a) * sp * ta); d.rotation.set(ta * 9 * R(), ta * 7, ta * 5); });
      I.scorch.position.set(c.x, Board.TOP + 0.004, c.z); I.scorch.material.opacity = t >= hit ? 0.55 * Math.min(1, (t - hit) * 8) : 0;
    }
    if (S.kind === 'fall') {
      const hit = 0.1, P = S.parts, F = S.fwd, Rt = S.right;
      // 虎：中刀一挫（仰头咆哮），踉跄两步，往一侧倒下
      tg.deadSide = 1;
      tg.roarK = sm(cl(t, hit, hit + 0.08)) * (1 - sm(cl(t, 0.3, 0.45)));
      tg.dead = sm(cl(t, 0.28, 0.62));
      const stag = sm(cl(t, hit, 0.35)); tg.group.position.set(c.x + F.x * 0.12 * stag - Rt.x * 0.1 * stag, Board.TOP, c.z + F.z * 0.12 * stag - Rt.z * 0.1 * stag);
      tg.update(0);
      // 文臣：虎一挫被颠离鞍座，往虎倒下的反侧摔出去，仰面落地；节杖脱手，另落一处
      if (t >= 0.2 && !S.det) {
        S.det = true; const side = Rt.clone().multiplyScalar(1);
        S.ff = detach(P.fig, F.clone().multiplyScalar(0.15).add(new V3(0, 0.9, 0)).add(side.clone().multiplyScalar(0.5)), F.clone().multiplyScalar(-2.0), 0.05); S.ff.qLand = S.ff.q0.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(F, -PI / 2));
        S.fs = detach(P.staff, F.clone().multiplyScalar(0.6).add(new V3(0, 1.2, 0)).add(side.clone().multiplyScalar(0.7)), F.clone().multiplyScalar(-1.8).add(new V3(0, 1.2, 0)), 0.015);
        S.t0 = 0.2;
      }
      if (S.ff) { const tt = (t - S.t0) * 1.5; fly(S.ff, tt); fly(S.fs, tt * 0.9); }
      const R = rnd(11);
      I.blood.forEach((s, i) => { const q = cl(t, hit, hit + 0.18 + R() * 0.1); s.material.opacity = q > 0 && q < 1 ? (1 - q) * 0.9 : 0; s.position.set(c.x + (R() - 0.5) * 0.3 + F.x * 0.25, Board.TOP + 0.35 + q * 0.25, c.z + (R() - 0.5) * 0.3 + F.z * 0.25); s.scale.setScalar(0.12 + q * 0.3); });
      I.dust.forEach((s, i) => { const t0 = i < 3 ? 0.55 : 0.42, q = cl(t, t0, t0 + 0.35), a = R() * PI * 2; const base = i < 3 ? new V3(c.x + Rt.x * 0.5, 0, c.z + Rt.z * 0.5) : (S.ff ? S.ff.obj.position : c); s.material.opacity = q > 0 && q < 1 ? (1 - q) * 0.7 : 0; s.position.set(base.x + Math.cos(a) * 0.3 * q, Board.TOP + 0.06 + q * 0.12, base.z + Math.sin(a) * 0.3 * q); s.scale.setScalar(0.3 + q * 0.6); });
    }
  }
  return { lineup, stage, set, cam, clear, get S() { return S; } };
})();
