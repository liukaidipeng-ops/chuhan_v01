// ===== 特效：粒子、地面痕迹、七种击杀方式、镜头，以及各兵种的冲锋斩杀动画 =====
const Fx = (() => {
  const { scene, Time, onFrame, tween, sleep, ease, Cam, Tex, toon, rnd, camera, canvasTex, inkBlot } = Core;
  const V3 = THREE.Vector3;
  const TOP = Board.TOP;
  const R = (a, b) => a + Math.random() * (b - a);
  const LOW = () => Core.quality === 'low';

  // ---------- 粒子 ----------
  const pools = { n: [], a: [] };
  const live = [];
  function spawn(o) {
    if (live.length > (LOW() ? 220 : 520)) return null;
    const add = !!o.add;
    let sp = pools[add ? 'a' : 'n'].pop();
    if (!sp) sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true }));
    const m = sp.material;
    m.map = o.tex || Tex.inkPuff; m.color.set(o.color ?? INK.ink); m.opacity = 0; m.rotation = Math.random() * 6;
    sp.position.copy(o.pos);
    sp.scale.setScalar(0.001);
    sp.renderOrder = o.order ?? 2;
    const p = {
      sp, add, vel: o.vel ? o.vel.clone() : new V3(), life: o.life ?? 1, age: -(o.delay ?? 0),
      s0: o.size ?? 0.3, s1: o.size2 ?? (o.size ?? 0.3) * 2, op: o.op ?? 1, g: o.g ?? 0, drag: o.drag ?? 1.5,
      spin: o.spin ?? (Math.random() - 0.5) * 2, fadeIn: o.fadeIn ?? 0.08, floor: o.floor ?? -99, pow: o.pow ?? 1.6,
    };
    scene.add(sp); live.push(p);
    return p;
  }
  onFrame(dt => {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i]; p.age += dt;
      if (p.age < 0) continue;
      const k = p.age / p.life;
      if (k >= 1) { scene.remove(p.sp); pools[p.add ? 'a' : 'n'].push(p.sp); live.splice(i, 1); continue; }
      p.vel.y -= p.g * dt; p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.sp.position.addScaledVector(p.vel, dt);
      if (p.sp.position.y < p.floor) { p.sp.position.y = p.floor; p.vel.y *= -0.25; p.vel.x *= 0.6; p.vel.z *= 0.6; }
      const s = p.s0 + (p.s1 - p.s0) * Math.sqrt(k);
      p.sp.scale.set(s, s, 1);
      p.sp.material.rotation += p.spin * dt;
      p.sp.material.opacity = p.op * Math.min(1, p.age / p.fadeIn) * Math.pow(1 - k, p.pow);
    }
  });
  const rv = (x, y, z) => new V3(R(-x, x), R(-y, y), R(-z, z));
  const nn = n => (LOW() ? Math.ceil(n / 2) : n);
  const P = {
    ink(pos, n = 12, r = 0.5, size = 0.35, op = 0.8) {
      for (let i = 0; i < nn(n); i++) {
        const a = Math.random() * 6.28, sp = R(0.5, 1.4) * r * 2.2;
        spawn({ pos: pos.clone().add(new V3(0, R(0, 0.15), 0)), vel: new V3(Math.cos(a) * sp, R(0.2, 0.9) * r, Math.sin(a) * sp), size: size * R(0.5, 1), size2: size * R(1.6, 2.6), life: R(0.7, 1.3), op: op * R(0.6, 1), drag: 3.5 });
      }
    },
    dust(pos, n = 6, dir, s = 0.3) {
      for (let i = 0; i < nn(n); i++) {
        const v = rv(0.5, 0.1, 0.5).add(new V3(0, R(0.2, 0.6), 0));
        if (dir) v.addScaledVector(dir, R(-1.2, -0.3));
        spawn({ pos: pos.clone().add(rv(0.1, 0, 0.1)), vel: v, color: 0x8b7e68, size: s * R(0.6, 1), size2: s * R(2, 3.5), life: R(0.8, 1.6), op: R(0.3, 0.55), drag: 2 });
      }
    },
    fire(pos, n = 24, r = 1) {
      const cols = [0xffe2a0, 0xffa24a, 0xff6a2a, 0xe8401c];
      for (let i = 0; i < nn(n); i++) {
        const d = new V3(R(-1, 1), R(-0.1, 1.2), R(-1, 1)).normalize().multiplyScalar(R(0.8, 3.2) * r);
        spawn({ pos: pos.clone(), vel: d, tex: Tex.spark, add: true, color: cols[i % 4], size: 0.35 * r, size2: R(0.9, 1.8) * r, life: R(0.35, 0.8), op: 1, drag: 3.2, g: -0.6 });
      }
    },
    smoke(pos, n = 10, r = 1, col = 0x3b3835) {
      for (let i = 0; i < nn(n); i++) spawn({ pos: pos.clone().add(rv(0.3, 0.1, 0.3).multiplyScalar(r)), vel: new V3(R(-0.5, 0.5), R(0.3, 1.1), R(-0.5, 0.5)).multiplyScalar(r), color: col, size: 0.4 * r, size2: R(1.4, 2.4) * r, life: R(1.4, 2.6), op: R(0.35, 0.65), drag: 1.2, delay: R(0, 0.25), fadeIn: 0.25 });
    },
    sparks(pos, n = 14, r = 1) {
      for (let i = 0; i < nn(n); i++) spawn({ pos: pos.clone(), vel: new V3(R(-1, 1), R(0.2, 1.4), R(-1, 1)).multiplyScalar(R(1.5, 4) * r), tex: Tex.spark, add: true, color: 0xffd48a, size: 0.07 * r, size2: 0.03 * r, life: R(0.25, 0.6), g: 7, drag: 0.6, floor: TOP, pow: 1 });
    },
    splash(pos, n = 16, r = 1) {
      for (let i = 0; i < nn(n); i++) spawn({ pos: pos.clone(), vel: new V3(R(-0.8, 0.8), R(1.2, 3.2), R(-0.8, 0.8)).multiplyScalar(r), tex: Tex.puff, color: 0xe8efe8, size: 0.09 * r, size2: 0.2 * r, life: R(0.5, 0.9), g: 8, drag: 0.4, op: 0.9 });
      for (let i = 0; i < 4; i++) spawn({ pos: pos.clone(), vel: rv(0.5, 0.2, 0.5), tex: Tex.puff, color: 0xf2f4ee, size: 0.25 * r, size2: 0.7 * r, life: 0.8, op: 0.55, drag: 2 });
    },
    // 朱墨血雾（水墨化的血）
    blood(pos, n = 10, r = 1, dir) {
      for (let i = 0; i < nn(n); i++) {
        const v = new V3(R(-1, 1), R(0.3, 1.5), R(-1, 1)).multiplyScalar(R(1, 2.6) * r);
        if (dir) v.addScaledVector(dir, R(1, 3) * r);
        spawn({ pos: pos.clone(), vel: v, tex: Tex.splat, color: 0x8e1a10, size: 0.12 * r, size2: 0.28 * r, life: R(0.5, 0.9), g: 6, drag: 1, floor: TOP + 0.01, op: 0.9 });
      }
    },
    embers(pos, n = 12) {
      for (let i = 0; i < nn(n); i++) spawn({ pos: pos.clone().add(rv(0.4, 0, 0.4)), vel: new V3(R(-0.2, 0.2), R(0.3, 1.2), R(-0.2, 0.2)), tex: Tex.spark, add: true, color: 0xff8a3a, size: 0.05, size2: 0.02, life: R(1, 2.4), drag: 0.8, delay: R(0, 1.5), pow: 1 });
    },
  };
  P.redInk = P.blood;

  // 墨环冲击波
  const ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
  function ring(pos, size = 2, dur = 0.7, color = INK.ink, op = 0.8) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: Tex.ring, color, transparent: true, depthWrite: false }));
    m.position.copy(pos); m.position.y = Math.max(pos.y, TOP + 0.02);
    m.rotation.y = Math.random() * 6;
    scene.add(m);
    tween(dur, k => { const s = 0.2 + size * k; m.scale.set(s, 1, s); m.material.opacity = op * (1 - k); }, ease.out).then(() => { scene.remove(m); m.material.dispose(); });
  }
  // 刀光
  const slashGeo = new THREE.PlaneGeometry(1, 0.5);
  function slash(pos, size = 1, angle = 0, color = INK.ink, dur = 0.45) {
    const m = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({ map: Tex.slash, color, transparent: true, depthWrite: false, side: THREE.DoubleSide, depthTest: false }));
    m.renderOrder = 10;
    m.position.copy(pos);
    scene.add(m);
    const off = onFrame(() => { m.lookAt(camera.position); m.rotateZ(angle); });
    return tween(dur, k => { const s = size * (0.5 + 0.7 * ease.out(Math.min(1, k * 2.2))); m.scale.set(s, s, 1); m.material.opacity = (k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65) * 0.9; }, ease.linear)
      .then(() => { off(); scene.remove(m); m.material.dispose(); });
  }
  // 闪光
  const flashLight = new THREE.PointLight(0xffa55a, 0, 14, 1.6);
  scene.add(flashLight);
  function flash(pos, power = 60, dur = 0.6, screen = 0) {
    flashLight.position.copy(pos).add(new V3(0, 0.6, 0));
    tween(dur, k => { flashLight.intensity = power * (1 - k) * (1 - k); }, ease.linear);
    if (screen) {
      const el = document.getElementById('flash');
      el.style.transition = 'none'; el.style.opacity = screen;
      requestAnimationFrame(() => { el.style.transition = 'opacity .5s'; el.style.opacity = 0; });
    }
  }

  // ======================================================================
  //  地面痕迹：每个兵种留下不同的印记
  // ======================================================================
  const MT = {
    // 焦痕（炮）
    scorch: canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      for (let i = 0; i < 40; i++) {
        const a = rnd() * 6.28, L = w * (0.22 + rnd() * 0.26);
        g.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.3})`; g.lineWidth = 2 + rnd() * 6;
        g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * L, c + Math.sin(a) * L); g.stroke();
      }
      g.fillStyle = '#fff';
      inkBlot(g, c, c, w * 0.26, 1, 0.45); inkBlot(g, c, c, w * 0.18, 1, 0.3);
    }),
    scorchRim: canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w * 0.48);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }),
    // 血泊（步兵）
    blood: canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#fff';
      inkBlot(g, w / 2, w / 2, w * 0.27, 1, 0.5);
      for (let i = 0; i < 5; i++) inkBlot(g, w / 2 + (rnd() - 0.5) * w * 0.3, w / 2 + (rnd() - 0.5) * w * 0.3, w * (0.08 + rnd() * 0.08), 1, 0.4);
      for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = w * (0.26 + rnd() * 0.2); inkBlot(g, w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 2 + rnd() * 9, 0.9, 0.3); }
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 20; i++) { g.globalAlpha = 0.3; inkBlot(g, w / 2 + (rnd() - 0.5) * 60, w / 2 + (rnd() - 0.5) * 60, 4 + rnd() * 8, 1, 0.5); }
    }),
    // 车辙（战车）
    rut: canvasTex(256, 64, (g, w, h) => {
      for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.5})`; g.fillRect(x, h * 0.3 + (rnd() - 0.5) * 3, 2, h * 0.4 * (0.6 + rnd() * 0.5)); }
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(rnd() * w, h * 0.2 + rnd() * h * 0.6, 2 + rnd() * 3, 1 + rnd() * 2); }
    }),
    // 马蹄印（骑兵）
    hoof: canvasTex(64, 64, (g, w) => {
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.arc(w / 2, w / 2 + 4, w * 0.28, Math.PI * 0.95, Math.PI * 2.05, true); g.stroke();
    }),
    // 斩击血痕（骑兵刀光）
    streak: canvasTex(512, 96, (g, w, h) => {
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(10, h / 2); g.quadraticCurveTo(w * 0.4, h * 0.15, w - 10, h * 0.45); g.quadraticCurveTo(w * 0.45, h * 0.62, 10, h / 2); g.fill();
      for (let i = 0; i < 40; i++) inkBlot(g, 60 + rnd() * (w - 70), h * (0.25 + rnd() * 0.5), 1.5 + rnd() * 5, 0.9, 0.3);
    }),
    // 刀痕（士）
    cut: canvasTex(256, 256, (g, w) => {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      for (const [a, b, c2, d] of [[30, 40, 226, 216], [226, 40, 30, 216]]) {
        for (let k = 0; k < 3; k++) { g.globalAlpha = 0.5 + k * 0.2; g.lineWidth = 7 - k * 2; g.beginPath(); g.moveTo(a + k * 2, b); g.lineTo(c2 - k * 2, d); g.stroke(); }
      }
    }),
    // 裂地（帅将）
    crack: canvasTex(512, 512, (g, w) => {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      const branch = (x, y, a, L, wd, depth) => {
        if (depth > 4 || L < 8) return;
        let cx = x, cy = y;
        const steps = 6;
        g.lineWidth = wd; g.beginPath(); g.moveTo(cx, cy);
        for (let i = 0; i < steps; i++) { a += (rnd() - 0.5) * 0.7; cx += Math.cos(a) * L / steps; cy += Math.sin(a) * L / steps; g.lineTo(cx, cy); }
        g.stroke();
        branch(cx, cy, a + 0.5, L * 0.6, wd * 0.6, depth + 1);
        if (rnd() < 0.7) branch(cx, cy, a - 0.6, L * 0.5, wd * 0.55, depth + 1);
      };
      for (let i = 0; i < 7; i++) branch(w / 2, w / 2, (i / 7) * 6.28 + rnd() * 0.4, 110 + rnd() * 70, 11, 0);
      g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 26, 1, 0.5);
    }),
    // 箭孔
    hole: canvasTex(64, 64, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 7, 1, 0.3); }),
  };
  const marks = [];
  const markGeo = new THREE.PlaneGeometry(1, 1); markGeo.rotateX(-Math.PI / 2);
  let markSeq = 0;
  // 痕迹：先清晰停留，再淡到半透明长期保留，最后消失
  function mark(tex, color, pos, sx, sz = sx, rot = 0, { op = 0.85, grow = 0.2, hold = 14, keep = 0.45, life = 60, blend } = {}) {
    if (Math.abs(pos.z) < Board.HALF && Math.abs(pos.x) < 4.8) return null; // 河面不留痕
    const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false, blending: blend || THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -1 - (markSeq % 8), polygonOffsetUnits: -1 }));
    m.position.set(pos.x, TOP + 0.0015 + (markSeq++ % 20) * 0.00012, pos.z);
    m.rotation.y = rot;
    m.renderOrder = 1;
    scene.add(m);
    const rec = { m, t: 0, op, hold, keep, life, grow, sx, sz };
    marks.push(rec);
    if (marks.length > (LOW() ? 40 : 90)) { const o = marks.shift(); scene.remove(o.m); o.m.material.dispose(); }
    return rec;
  }
  onFrame(dt => {
    for (let i = marks.length - 1; i >= 0; i--) {
      const r = marks[i]; r.t += dt;
      const g = r.grow ? Math.min(1, r.t / r.grow) : 1;
      const e = 1 - Math.pow(1 - g, 3);
      r.m.scale.set(r.sx * (0.3 + 0.7 * e), 1, r.sz * (0.3 + 0.7 * e));
      let o = r.op * Math.min(1, r.t / 0.08);
      if (r.t > r.hold) o = r.op * (r.keep + (1 - r.keep) * Math.max(0, 1 - (r.t - r.hold) / 3));
      if (r.t > r.life) o *= Math.max(0, 1 - (r.t - r.life) / 3);
      r.m.material.opacity = o;
      if (r.t > r.life + 3) { scene.remove(r.m); r.m.material.dispose(); marks.splice(i, 1); }
    }
  });
  function clearMarks() { for (const r of marks) { scene.remove(r.m); r.m.material.dispose(); } marks.length = 0; }
  const BLOOD = 0x6e120c;
  const Marks = {
    scorch(p, s = 1.6) { mark(MT.scorch, 0x16110e, p, s, s, rnd() * 6, { op: 0.92 }); mark(MT.scorchRim, 0x4a2a14, p, s * 1.5, s * 1.5, 0, { op: 0.6 }); },
    blood(p, s = 1.0, dir) { s *= 1.35; mark(MT.blood, BLOOD, p.clone().addScaledVector(dir || new V3(), 0.12), s, s * R(0.8, 1.1), rnd() * 6, { op: 0.9, grow: 0.6 }); },
    ruts(p, d, side) { const rot = Math.atan2(-d.z, d.x); for (const s of [1, -1]) mark(MT.rut, 0x2e2419, p.clone().addScaledVector(side, s * 0.2), 0.34, 0.07, rot, { op: 0.75, grow: 0, hold: 10, keep: 0.4, life: 35 }); },
    hoof(p, d) { mark(MT.hoof, 0x2e2419, p, 0.09, 0.09, Math.atan2(-d.z, d.x) - Math.PI / 2, { op: 0.8, grow: 0, hold: 8, keep: 0.35, life: 30 }); },
    streak(p, d, len = 1.5) { mark(MT.streak, BLOOD, p, len, len * 0.19, Math.atan2(-d.z, d.x) + R(-0.3, 0.3), { op: 0.9, grow: 0.15 }); },
    cut(p, d) { mark(MT.cut, 0x1c1714, p, 0.85, 0.85, Math.atan2(-d.z, d.x), { op: 0.85, grow: 0.12 }); },
    crack(p, s = 2.4) { mark(MT.crack, 0x16110e, p, s, s, rnd() * 6, { op: 0.9, grow: 0.25, hold: 16 }); },
    hole(p) { mark(MT.hole, 0x1c1714, p, 0.08, 0.08, 0, { op: 0.8, grow: 0, hold: 10, keep: 0.3, life: 30 }); },
  };

  // ======================================================================
  //  碎块与七种击杀方式
  // ======================================================================
  const bits = [];
  onFrame(dt => {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]; b.age += dt;
      b.v.y -= 9.8 * dt;
      b.o.position.addScaledVector(b.v, dt);
      b.o.rotation.x += b.w.x * dt; b.o.rotation.y += b.w.y * dt; b.o.rotation.z += b.w.z * dt;
      if (b.o.position.y < b.floor) { b.o.position.y = b.floor; b.v.y *= -0.35; b.v.x *= 0.7; b.v.z *= 0.7; b.w.multiplyScalar(0.7); }
      if (b.fire && b.age < b.fire && Math.random() < 0.5) spawn({ pos: b.o.position.clone(), tex: Tex.spark, add: true, color: 0xff7a30, size: 0.14, size2: 0.04, life: 0.35, op: 0.9 });
      if (b.age > b.life) {
        const k = Math.min(1, (b.age - b.life) / 0.5);
        b.o.scale.setScalar(b.s * (1 - k));
        if (k >= 1) { scene.remove(b.o); bits.splice(i, 1); }
      }
    }
  });
  const chunkGeos = [new THREE.BoxGeometry(0.16, 0.14, 0.12), new THREE.TetrahedronGeometry(0.11), new THREE.BoxGeometry(0.22, 0.1, 0.09), new THREE.DodecahedronGeometry(0.07)];
  const charredWood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
  function removePiece(m) {
    for (const [id, x] of Board.pieces) if (x === m) Board.pieces.delete(id);
    if (m.parent) m.parent.remove(m);
  }
  function chunks(c, dir, power, n = 12, opts = {}) {
    for (let i = 0; i < nn(n); i++) {
      const o = new THREE.Mesh(chunkGeos[i % 4], opts.burnt && i % 2 ? charredWood : Board.pieceWood);
      o.castShadow = true;
      o.position.copy(c).add(rv(0.3, 0.08, 0.3));
      const s = R(0.6, 1.3) * (opts.small ? 0.6 : 1); o.scale.setScalar(s);
      const v = new V3(R(-1, 1), R(0.8, 2.2), R(-1, 1)).multiplyScalar(R(1, 2.4) * power).addScaledVector(dir, R(1, 3.5) * power);
      scene.add(o);
      bits.push({ o, v, w: rv(12, 12, 12), age: 0, life: R(1.2, 2.2) * (opts.lifeK || 1), floor: TOP + 0.04, s, fire: opts.burnt ? R(0.5, 1.2) : 0 });
    }
  }
  function flyFace(m, c, dir, power, burn) {
    const face = m.children[1];
    if (!face) return;
    const f = face.clone(); f.material = face.material.clone();
    f.position.copy(c).add(new V3(0, 0.12, 0));
    scene.add(f);
    const v = new V3(0, R(3, 4) * Math.min(1.4, power), 0).addScaledVector(dir, 1.2 * power);
    const w = rv(10, 3, 10);
    const up = onFrame(dt => {
      v.y -= 9.8 * dt; f.position.addScaledVector(v, dt); f.rotation.x += w.x * dt; f.rotation.z += w.z * dt;
      if (burn) { f.material.color.lerp(new THREE.Color(0x2a1a10), dt * 3); if (Math.random() < 0.6) spawn({ pos: f.position.clone(), tex: Tex.spark, add: true, color: 0xff8a3a, size: 0.2, size2: 0.05, life: 0.3 }); }
    });
    sleep(0.62).then(() => { up(); P.ink(f.position, 14, 0.5, 0.3, 0.9); if (!burn) P.blood(f.position, 5, 0.6); scene.remove(f); });
  }
  // 1) 炸碎（炮）：焦黑碎木带火四散，刻字面烧焦
  function destroyBlast(m, dir, power = 2) {
    if (!m || !m.parent) return;
    const c = m.position.clone(); c.y += 0.1;
    removePiece(m);
    chunks(c, dir, power, 16, { burnt: true });
    flyFace(m, c, dir, power, true);
    P.ink(c, 12, 0.7, 0.4);
    Marks.scorch(c, 1.9);
    P.embers(c, 14);
  }
  // 2) 撞飞（车）：整枚棋子被撞上半空翻滚，落地才碎
  function destroyLaunch(m, dir, power = 1.8) {
    if (!m || !m.parent) return Promise.resolve();
    removePiece(m);
    scene.add(m);
    const v = dir.clone().multiplyScalar(3.2 * power).add(new V3(0, 4.2, 0));
    const w = new V3(R(8, 12), R(-3, 3), R(-4, 4));
    const floor = TOP;
    let t = 0;
    return new Promise(res => {
      const off = onFrame(dt => {
        t += dt; v.y -= 9.8 * dt;
        m.position.addScaledVector(v, dt);
        m.rotation.x += w.x * dt; m.rotation.z += w.z * dt;
        if (t > 0.15 && m.position.y <= floor) {
          off();
          const c = m.position.clone().setY(TOP + 0.1);
          scene.remove(m);
          chunks(c, dir, 1.1, 14);
          flyFace(m, c, dir, 0.8, false);
          P.dust(c, 12, null, 0.35); ring(c, 1.8, 0.6, 0x5a4a38, 0.7);
          Sfx.B.crack(0); Sfx.B.thud(0, 0.6);
          Cam.shake(0.12);
          res();
        }
      });
    });
  }
  // 切割：用裁剪面把棋子分成几块
  function slice(m, planesList, moves, { dur = 1.2 } = {}) {
    if (!m || !m.parent) return;
    const c = m.position.clone();
    removePiece(m);
    m.updateMatrixWorld(true);
    const parts = planesList.map((planes, i) => {
      const g = new THREE.Group();
      g.position.copy(m.position); g.rotation.copy(m.rotation); g.scale.copy(m.scale);
      const cps = planes.map(() => new THREE.Plane());
      for (const src of m.children) {
        const cm = new THREE.Mesh(src.geometry, src.material.clone());
        cm.position.copy(src.position);
        cm.material.clippingPlanes = cps; cm.material.side = THREE.DoubleSide; cm.material.clipShadows = true;
        cm.castShadow = true;
        g.add(cm);
      }
      scene.add(g);
      g.updateMatrixWorld(true);
      // 世界坐标平面 → 该块的局部坐标
      const inv = g.matrixWorld.clone().invert();
      const local = planes.map(pl => pl.clone().applyMatrix4(inv));
      return { g, cps, local, mv: moves[i] };
    });
    let t = 0;
    const off = onFrame(dt => {
      t += dt;
      const k = Math.min(1, t / 0.5);
      for (const p of parts) {
        const e = 1 - Math.pow(1 - k, 3);
        p.g.position.copy(c).addScaledVector(p.mv.dir, p.mv.dist * e);
        p.g.position.y = TOP + Math.max(0, Math.sin(k * Math.PI) * (p.mv.hop || 0.12));
        p.g.rotation.x = p.mv.rx * e; p.g.rotation.z = p.mv.rz * e;
        p.g.updateMatrixWorld(true);
        p.local.forEach((pl, j) => p.cps[j].copy(pl).applyMatrix4(p.g.matrixWorld));
      }
      if (t > dur) {
        off();
        for (const p of parts) {
          const pc = p.g.position.clone().setY(TOP + 0.08);
          P.ink(pc, 8, 0.35, 0.3, 0.8);
          chunks(pc, p.mv.dir, 0.4, 4, { small: true, lifeK: 0.6 });
          scene.remove(p.g);
        }
      }
    });
  }
  // 3) 劈成两半（马、帅将）
  function destroySlice(m, cutDir, { dist = 0.32, big = false } = {}) {
    if (!m) return;
    const c = m.position.clone().setY(TOP + 0.1);
    const n = new V3(-cutDir.z, 0, cutDir.x).normalize(); // 切面法线：与刀势垂直
    if (big) n.add(new V3(0, 0.15, 0)).normalize();
    const pl1 = new THREE.Plane().setFromNormalAndCoplanarPoint(n, c);
    const pl2 = new THREE.Plane().setFromNormalAndCoplanarPoint(n.clone().negate(), c);
    slice(m, [[pl1], [pl2]], [
      { dir: n.clone().setY(0).normalize(), dist, rx: n.z * 0.9, rz: -n.x * 0.9, hop: 0.18 },
      { dir: n.clone().setY(0).normalize().negate(), dist: dist * 0.8, rx: -n.z * 0.7, rz: n.x * 0.7, hop: 0.1 },
    ], { dur: big ? 1.4 : 1.1 });
    P.blood(c, 12, 0.7, cutDir);
  }
  // 4) 十字斩成四块（士）
  function destroyCross(m, d) {
    if (!m) return;
    const c = m.position.clone().setY(TOP + 0.1);
    const side = new V3(-d.z, 0, d.x);
    const a = d.clone().add(side).normalize(), b = d.clone().sub(side).normalize();
    const planes = [];
    const moves = [];
    for (const sa of [1, -1]) for (const sb of [1, -1]) {
      const na = a.clone().multiplyScalar(sa), nb2 = b.clone().multiplyScalar(sb);
      planes.push([new THREE.Plane().setFromNormalAndCoplanarPoint(na, c), new THREE.Plane().setFromNormalAndCoplanarPoint(nb2, c)]);
      const dir = na.clone().add(nb2).normalize();
      moves.push({ dir, dist: 0.3, rx: dir.z * 0.8, rz: -dir.x * 0.8, hop: 0.2 });
    }
    slice(m, planes, moves, { dur: 1.1 });
    P.blood(c, 10, 0.6);
  }
  // 5) 刺倒（兵卒）：长矛贯穿、棋子被掀翻倒地
  function destroyTopple(m, d) {
    if (!m || !m.parent) return;
    const c = m.position.clone();
    removePiece(m); scene.add(m);
    // 三支长矛插在棋子上
    const spears = [];
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5), toon(0x5a3a22)); shaft.position.y = 0.45; sp.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 5), toon(0xc9c3b4)); tip.position.y = 0.95; tip.rotation.x = Math.PI; tip.position.y = -0.02; sp.add(tip);
      sp.position.set((i - 1) * 0.16, 0.14, 0.05);
      sp.rotation.set(-0.9 - i * 0.1, 0, (i - 1) * 0.3);
      m.add(sp); spears.push(sp);
    }
    const axis = new V3(-d.z, 0, d.x).normalize();
    const q0 = m.quaternion.clone();
    tween(0.55, k => {
      m.quaternion.copy(q0).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, k * Math.PI * 0.48));
      m.position.copy(c).addScaledVector(d, 0.35 * k);
      m.position.y = TOP + 0.42 * Math.sin(k * Math.PI * 0.5) * 0.9;
    }, ease.in).then(() => {
      Sfx.B.thud(0, 0.45); P.dust(m.position, 6, null, 0.25);
      return sleep(0.55);
    }).then(() => {
      const pc = m.position.clone().setY(TOP + 0.1);
      P.ink(pc, 12, 0.5, 0.35);
      chunks(pc, d, 0.5, 6, { small: true });
      scene.remove(m);
    });
    P.blood(c.clone().setY(TOP + 0.2), 12, 0.8, d);
    Marks.blood(c, 1.1, d);
    sleep(0.5).then(() => Marks.blood(c.clone().addScaledVector(d, 0.4), 0.6, d));
  }
  // 6) 万箭穿心（相象）：钉满箭后裂开沉入墨中
  function destroyPinned(m) {
    if (!m || !m.parent) return;
    const c = m.position.clone();
    removePiece(m); scene.add(m);
    tween(0.35, k => { m.position.x = c.x + Math.sin(k * 40) * 0.02 * (1 - k); }, ease.linear).then(() => {
      P.blood(c.clone().setY(TOP + 0.2), 6, 0.5);
      chunks(c.clone().setY(TOP + 0.1), new V3(), 0.6, 8, { small: true });
      return tween(0.5, k => { m.scale.set(1 + k * 0.1, Math.max(0.01, 1 - k), 1 + k * 0.1); }, ease.in);
    }).then(() => { P.ink(c.clone().setY(TOP + 0.05), 12, 0.5, 0.35); scene.remove(m); });
    Marks.blood(c, 0.7);
  }

  // ---------- 棋子的沉没与浮现 ----------
  async function sink(m, dur = 0.35) {
    P.ink(m.position.clone().setY(TOP + 0.1), 10, 0.4, 0.3);
    const y0 = TOP;
    await tween(dur, k => { m.scale.set(1 + k * 0.2, Math.max(0.01, 1 - k), 1 + k * 0.2); m.position.y = y0 - k * 0.05; }, ease.in);
    m.visible = false; m.scale.set(1, 1, 1); m.position.y = y0;
  }
  async function rise(m, pos, dur = 0.45) {
    m.position.copy(pos); m.visible = true;
    P.ink(pos.clone().setY(TOP + 0.08), 10, 0.4, 0.3, 0.7);
    await tween(dur, k => m.scale.set(1, Math.max(0.01, k), 1), ease.outBack);
    Sfx.place();
  }
  // 涉水：过河时单位没入水中
  function groundY(p) {
    const a = Math.abs(p.z), H = Board.HALF;
    if (Math.abs(p.x) > 4.8) return 0;
    if (a >= H + 0.1) return TOP;
    if (a <= H - 0.16) return -0.03;
    return -0.03 + (TOP + 0.03) * ((a - (H - 0.16)) / 0.26);
  }
  const onWater = p => Math.abs(p.z) < Board.HALF && Math.abs(p.x) < 4.8;

  // ---------- 镜头 ----------
  function geom(A, B) {
    const d = B.clone().sub(A); d.y = 0;
    const dist = d.length();
    if (dist > 1e-6) d.normalize(); else d.set(0, 0, -1);
    const side = new V3(-d.z, 0, d.x);
    const hd = Cam.homeDir();
    if (side.dot(hd) < -0.01 || (Math.abs(side.dot(hd)) <= 0.01 && side.x < 0)) side.negate();
    return { d, dist, side, yawX: Math.atan2(-d.z, d.x), yawZ: Math.atan2(d.x, d.z) };
  }
  function cineOn() { document.body.classList.add('cine'); }
  function cineOff() { document.body.classList.remove('cine'); }
  function follow(target, offset, lookAhead, stiff = 4) {
    Cam.cine = true;
    const desired = new V3(), look = new V3();
    return onFrame(dt => {
      const t = target();
      desired.copy(t).add(offset());
      look.copy(t).add(lookAhead());
      const k = 1 - Math.exp(-dt * stiff);
      Cam.pos.lerp(desired, k); Cam.look.lerp(look, k);
    });
  }
  async function slowmo(scale, gameDur) { Time.scale = scale; await sleep(gameDur); Time.scale = 1; }
  function summonScale(obj, s, dur = 0.45, delay = 0) {
    obj.scale.setScalar(0.001);
    return sleep(delay).then(() => {
      P.ink(obj.position.clone().setY(TOP + 0.05), 6, 0.35 * s / 0.25, 0.3, 0.7);
      return tween(dur, k => obj.scale.setScalar(Math.max(0.001, s * k)), ease.outBack);
    });
  }
  function dismiss(obj, dur = 0.4) {
    P.ink(obj.position.clone().setY(TOP + 0.1), 8, 0.4, 0.35, 0.8);
    const s = obj.scale.x;
    return tween(dur, k => obj.scale.setScalar(Math.max(0.001, s * (1 - k))), ease.in).then(() => Core.disposeTree(obj));
  }
  function armyVis(army, v0, v1, dur, stagger = 0.02) {
    const n = army.count;
    return tween(dur + stagger * n, (k, raw) => {
      const t = raw * (dur + stagger * n);
      for (let i = 0; i < n; i++) army.units[i].vis = v0 + (v1 - v0) * Math.min(1, Math.max(0, (t - i * stagger) / dur));
    }, ease.linear);
  }
  function armyInk(army, n = 1) { for (const u of army.units) P.ink(u.p.clone().setY(Math.max(0, u.p.y) + 0.05), n, 0.25, 0.22, 0.6); }

  // ======================================================================
  //  各兵种吃子动画
  // ======================================================================
  const ctxOf = (info) => {
    const m = Board.pieces.get(info.piece.id);
    const tgt = info.captured ? Board.pieces.get(info.captured.id) : null;
    const A = Board.pos(...info.from), B = Board.pos(...info.to);
    return { info, m, tgt, A, B, s: info.piece.s, ...geom(A, B) };
  };

  // —— 兵卒：步兵列阵冲锋，长矛贯穿，血染沙场 ——
  async function capInfantry(c) {
    const { A, B, d, side, s, m, tgt } = c;
    const rows = 3, cols = 4, n = rows * cols, sc = 0.2;
    const army = new Models.Army(s, 'spear', n, sc);
    scene.add(army.group);
    const base = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      base.push(side.clone().multiplyScalar((col - 1.5) * 0.24).addScaledVector(d, -0.35 - row * 0.28));
      const u = army.units[i]; u.p.copy(A).add(base[i]); u.yaw = c.yawZ; u.vis = 0;
    }
    army.gait = 'march';
    const off = onFrame(dt => army.update(dt));
    cineOn();
    Cam.to(A.clone().lerp(B, 0.5).addScaledVector(side, 3.2).add(new V3(0, 1.5, 0)).addScaledVector(d, -1.2), A.clone().lerp(B, 0.6).add(new V3(0, 0.2, 0)), 0.8);
    sink(m); armyInk(army); Sfx.B.taiko(0, 0.7); Sfx.B.taiko(0.3, 0.7);
    await armyVis(army, 0, 1, 0.3);
    Sfx.U.p.charge(1);
    army.gait = 'run';
    for (const u of army.units) u.lean = 0.28;
    const end = B.clone().addScaledVector(d, -0.25);
    let hit = false;
    await tween(0.95, k => {
      for (let i = 0; i < n; i++) { const u = army.units[i]; u.p.copy(A).lerp(end, k).add(base[i]); u.p.y = groundY(u.p); }
      if (Math.random() < 0.5) { const u = army.units[Math.floor(Math.random() * n)]; if (onWater(u.p)) P.splash(u.p.clone().setY(0.05), 1, 0.4); else P.dust(u.p.clone(), 1, d, 0.18); }
      if (!hit && k > 0.82) {
        hit = true;
        Sfx.U.p.impact(); Cam.shake(0.15);
        P.sparks(B.clone().add(new V3(0, 0.2, 0)), 16);
        destroyTopple(tgt, d);
        slowmo(0.3, 0.12);
      }
    }, ease.in);
    for (const u of army.units) u.lean = 0;
    army.gait = 'march';
    await sleep(0.45);
    armyInk(army);
    await armyVis(army, 1, 0, 0.3, 0.01);
    off(); Core.disposeTree(army.group);
    await rise(m, B);
  }

  // —— 车：驷马战车冲锋，撞飞敌子，车辙犹在 ——
  async function capChariot(c) {
    const { A, B, d, side, s, m, tgt } = c;
    const ch = Models.makeChariot(s), sc = 0.25;
    ch.group.rotation.y = c.yawX;
    const start = A.clone().addScaledVector(d, -1.1), end = B.clone().addScaledVector(d, 1.6);
    ch.group.position.copy(start);
    ch.group.scale.setScalar(0.001);
    scene.add(ch.group);
    const up = onFrame(dt => ch.update(dt));
    cineOn();
    sink(m);
    Sfx.U.r.charge(2.6);
    await Cam.to(start.clone().addScaledVector(side, 2.3).addScaledVector(d, -1.6).add(new V3(0, 0.9, 0)), start.clone().addScaledVector(d, 1.2).add(new V3(0, 0.25, 0)), 0.6);
    await summonScale(ch.group, sc, 0.4);
    const pos = () => ch.group.position;
    const stopCam = follow(pos, () => side.clone().multiplyScalar(2.4).addScaledVector(d, -1.5).add(new V3(0, 0.95, 0)), () => d.clone().multiplyScalar(1.1).add(new V3(0, 0.2, 0)), 5);
    const total = start.distanceTo(end);
    const hitAt = start.distanceTo(B) - 0.95;
    let hit = false, splashed = false, dustT = 0, lastRut = start.clone();
    let launched = Promise.resolve();
    await tween(0.55 + total * 0.14, (k) => {
      ch.group.position.copy(start).lerp(end, k);
      ch.group.position.y = groundY(ch.group.position);
      ch.speed = 0.4 + k * 1.6;
      const p = pos();
      if (++dustT % 2 === 0) for (const sgn of [1, -1]) {
        const w = p.clone().addScaledVector(side, sgn * 0.24);
        if (onWater(w)) P.splash(w.setY(0.05), 2, 0.6); else P.dust(w, 1, d, 0.22);
      }
      if (p.distanceTo(lastRut) > 0.3) { Marks.ruts(lastRut.clone().lerp(p, 0.5), d, side); lastRut.copy(p); }
      if (!splashed && onWater(p)) { splashed = true; Sfx.B.splash(0, 0.35); }
      if (!hit && start.distanceTo(p) >= hitAt) {
        hit = true;
        Cam.shake(0.28); Sfx.U.r.impact();
        P.dust(B.clone(), 10, d.clone().negate(), 0.35);
        ring(B, 2.0, 0.6, 0x5a4a38);
        launched = destroyLaunch(tgt, d, 1.6);
        for (let i = 0; i < 4; i++) { const o = new THREE.Mesh(chunkGeos[2], Board.pieceWood); o.position.copy(B).add(rv(0.3, 0, 0.3)).setY(TOP + 0.05); o.rotation.y = rnd() * 6; o.scale.setScalar(R(0.5, 0.9)); scene.add(o); bits.push({ o, v: d.clone().multiplyScalar(R(1, 2.5)).add(new V3(0, R(0.5, 1.5), 0)), w: rv(6, 6, 6), age: 0, life: 6, floor: TOP + 0.03, s: o.scale.x }); }
        slowmo(0.25, 0.14);
      }
    }, ease.in);
    stopCam();
    await Promise.race([launched, sleep(1.2)]);
    await dismiss(ch.group, 0.35);
    up();
    await rise(m, B);
  }

  // —— 马：重甲骑兵冲锋，一刀两断，蹄印血痕 ——
  async function capCavalry(c) {
    const { A, B, d, side, s, m, tgt } = c;
    const sc = 0.22;
    const riders = [];
    const offs = [[0, 0], [0.42, -0.55], [-0.42, -0.55]];
    const start = A.clone().addScaledVector(d, -0.9), end = B.clone().addScaledVector(d, 1.4);
    for (let i = 0; i < 3; i++) {
      const h = Models.makeCavalry(s, true, i === 0 ? (s === 'b' ? 'ji' : 'dao') : 'dao');
      h.group.rotation.y = c.yawX;
      h.off = side.clone().multiplyScalar(offs[i][0]).addScaledVector(d, offs[i][1]);
      h.group.position.copy(start).add(h.off);
      h.group.scale.setScalar(0.001);
      h.lastPrint = h.group.position.clone();
      scene.add(h.group); riders.push(h);
    }
    const up = onFrame(dt => riders.forEach(h => h.update(dt)));
    cineOn(); sink(m); Sfx.B.taiko(0, 0.7); Sfx.B.taiko(0.25, 0.7);
    await Cam.to(start.clone().addScaledVector(side, 1.9).addScaledVector(d, 0.6).add(new V3(0, 0.55, 0)), start.clone().add(new V3(0, 0.35, 0)), 0.55);
    await Promise.all(riders.map((h, i) => summonScale(h.group, sc, 0.4, i * 0.08)));
    riders.forEach(h => tween(0.4, k => { h.rider.arm.rotation.z = 0.9 + k * 1.6; }));
    const lead = riders[0];
    const dur = 0.5 + start.distanceTo(end) * 0.16;
    Sfx.U.n.charge(dur + 0.3);
    const stopCam = follow(() => lead.group.position, () => side.clone().multiplyScalar(2.0).addScaledVector(d, -0.9).add(new V3(0, 0.6, 0)), () => d.clone().multiplyScalar(0.9).add(new V3(0, 0.3, 0)), 5);
    const hitAt = start.distanceTo(B) - 0.45;
    let hit = false, dustT = 0;
    await tween(dur, k => {
      for (const h of riders) {
        h.group.position.copy(start).lerp(end, k).add(h.off); h.group.position.y = groundY(h.group.position); h.speed = Math.min(1, 0.3 + k * 3);
        if (h.group.position.distanceTo(h.lastPrint) > 0.16) { Marks.hoof(h.group.position.clone().addScaledVector(side, (Math.random() - 0.5) * 0.12), d); h.lastPrint.copy(h.group.position); }
      }
      if (++dustT % 2 === 0) for (const h of riders) { const p = h.group.position.clone(); if (onWater(p)) P.splash(p.setY(0.05), 2, 0.5); else P.dust(p, 1, d, 0.2); }
      if (!hit && start.distanceTo(lead.group.position.clone().sub(lead.off)) >= hitAt) {
        hit = true;
        stopCam();
        const hp = B.clone().add(new V3(0, 0.32, 0));
        Cam.to(B.clone().addScaledVector(side, 1.3).addScaledVector(d, 0.5).add(new V3(0, 0.45, 0)), hp, 0.25, ease.out);
        slowmo(0.18, 0.2);
        tween(0.12, k2 => { lead.rider.arm.rotation.z = 2.5 - k2 * 3.3; }, ease.in);
        Sfx.U.n.impact();
        slash(hp, 1.0, -0.5, INK.ink, 0.45);
        sleep(0.05).then(() => slash(hp.clone().add(new V3(0, 0.05, 0)), 0.75, -0.35, 0x9e2418, 0.35));
        P.sparks(hp, 14);
        Cam.shake(0.18);
        destroySlice(tgt, d);
        Marks.streak(B.clone().addScaledVector(d, 0.5), d, 1.6);
        riders.slice(1).forEach(h => tween(0.15, k2 => { h.rider.arm.rotation.z = 2.5 - k2 * 3; }));
      }
    }, ease.linear);
    await sleep(0.25);
    await Promise.all(riders.map(h => dismiss(h.group, 0.35)));
    up();
    await rise(m, B);
  }

  // —— 炮：铜炮齐射，炸碎敌子，焦土一片 ——
  async function capCannon(c) {
    const { A, B, d, side, s, m, tgt, dist } = c;
    const sc = 0.26;
    const guns = [];
    for (const l of [-0.62, 0, 0.62]) {
      const g = Models.makeCannon(s);
      g.group.rotation.y = c.yawX;
      g.group.position.copy(A).addScaledVector(d, -0.75 - Math.abs(l) * 0.35).addScaledVector(side, l);
      g.base = g.group.position.clone();
      g.group.scale.setScalar(0.001);
      scene.add(g.group); guns.push(g);
    }
    cineOn(); sink(m);
    Sfx.U.c.ready();
    const behind = A.clone().addScaledVector(d, -3.3).addScaledVector(side, 1.7).add(new V3(0, 1.35, 0));
    await Cam.to(behind, A.clone().addScaledVector(d, 2.2).add(new V3(0, 0.3, 0)), 0.7);
    await Promise.all(guns.map((g, i) => summonScale(g.group, sc, 0.4, i * 0.1)));
    const elev = 0.35 + Math.min(0.3, dist * 0.04);
    await tween(0.35, k => guns.forEach(g => { g.barrel.rotation.z = 0.2 + (elev - 0.2) * k; }));
    const flight = 0.95 + dist * 0.05;
    const peak = 1.2 + dist * 0.28;
    const targets = [B.clone().addScaledVector(side, 0.55).addScaledVector(d, -0.35), B.clone().addScaledVector(side, -0.5).addScaledVector(d, 0.3), B.clone()];
    const fire = async (g, i) => {
      for (let k = 0; k < 6; k++) P.sparks(g.torch.getWorldPosition(new V3()), 2, 0.4);
      Sfx.U.c.fire(i);
      await sleep(0.12);
      const muzzle = g.barrel.localToWorld(new V3(1.35, 0, 0));
      Cam.shake(0.14);
      flash(muzzle, 40, 0.35);
      P.fire(muzzle, 16, 0.5);
      for (let k = 0; k < 8; k++) spawn({ pos: muzzle.clone(), vel: d.clone().multiplyScalar(R(1.5, 4)).add(rv(0.4, 0.4, 0.4)), color: 0x6e6a64, size: 0.2, size2: R(0.8, 1.4), life: R(1.2, 2), op: 0.55, drag: 2.2 });
      tween(0.3, k => g.group.position.copy(g.base).addScaledVector(d, -0.18 * Math.sin(k * Math.PI)));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), toon(0x1c1a18));
      ball.position.copy(muzzle); scene.add(ball);
      const tp = targets[i].clone().setY(TOP + 0.05);
      const p0 = muzzle.clone();
      await tween(flight, k => {
        ball.position.lerpVectors(p0, tp, k);
        ball.position.y = p0.y + (tp.y - p0.y) * k + peak * 4 * k * (1 - k);
        spawn({ pos: ball.position.clone(), tex: Tex.spark, add: true, color: 0xff8a3a, size: 0.22, size2: 0.05, life: 0.3, op: 0.9 });
        spawn({ pos: ball.position.clone(), color: 0x3d3a37, size: 0.1, size2: 0.35, life: 0.8, op: 0.35, drag: 1 });
      }, ease.linear);
      scene.remove(ball);
      return tp;
    };
    const boomAt = (p, big) => {
      Sfx.U.c.explode(big);
      Cam.shake(big ? 0.42 : 0.2);
      flash(p, big ? 120 : 60, big ? 0.9 : 0.5, big ? 0.55 : 0);
      P.fire(p.clone().add(new V3(0, 0.1, 0)), big ? 44 : 22, big ? 1.1 : 0.7);
      P.smoke(p, big ? 16 : 8, big ? 1 : 0.7);
      P.sparks(p, big ? 30 : 12, 1.2);
      ring(p, big ? 3.6 : 1.8, 0.8);
      Marks.scorch(p, big ? 2.2 : 1.2);
      for (let i = 0; i < (big ? 10 : 4); i++) {
        const o = new THREE.Mesh(chunkGeos[3], toon(0x5d554a));
        o.position.copy(p).add(new V3(0, 0.1, 0));
        scene.add(o);
        bits.push({ o, v: new V3(R(-2, 2), R(2, 5), R(-2, 2)), w: rv(10, 10, 10), age: 0, life: R(0.8, 1.4), floor: TOP + 0.03, s: 1 });
      }
    };
    const shots = guns.map((g, i) => sleep(i * 0.28).then(() => fire(g, i)).then(tp => boomAt(tp, i === 2)));
    await sleep(0.2);
    Cam.to(B.clone().addScaledVector(side, 3.4).addScaledVector(d, -2.0).add(new V3(0, 1.7, 0)), B.clone().add(new V3(0, 0.3, 0)), flight * 0.9);
    await sleep(0.56 + flight - 0.2);
    slowmo(0.3, 0.15);
    destroyBlast(tgt, d, 2.2);
    await Promise.all(shots);
    await sleep(0.6);
    await Promise.all(guns.map(g => dismiss(g.group, 0.3)));
    await rise(m, B);
  }

  // —— 相象：弓弩箭雨，万箭穿心，箭矢遍地 ——
  const arrowGeo = (() => {
    const P_ = Models.P, G = Models.G;
    const g = Core.merge([
      P_(G.cyl(0.006, 0.006, 0.34, 4), 0x6a4a2a, 0, 0, 0),
      P_(G.cone(0.016, 0.06, 4), 0x2a2a2a, 0, 0.2, 0),
      P_(G.box(0.03, 0.06, 0.003), 0xe8e0d0, 0, -0.14, 0), P_(G.box(0.003, 0.06, 0.03), 0xe8e0d0, 0, -0.14, 0),
    ]);
    g.userData.keep = true;
    return g;
  })();
  async function capArchers(c) {
    const { A, B, d, side, s, m, tgt, dist } = c;
    const n = 7, sc = 0.2;
    const army = new Models.Army(s, 'archer', n, sc);
    scene.add(army.group);
    for (let i = 0; i < n; i++) {
      const u = army.units[i];
      u.p.copy(A).addScaledVector(d, -0.55 - (i % 2) * 0.2).addScaledVector(side, (i - (n - 1) / 2) * 0.25);
      u.yaw = c.yawZ; u.vis = 0;
    }
    army.gait = 'still';
    const off = onFrame(dt => army.update(dt));
    cineOn(); sink(m); Sfx.B.taiko(0, 0.7);
    await Cam.to(A.clone().addScaledVector(d, -2.5).addScaledVector(side, 1.1).add(new V3(0, 1.3, 0)), A.clone().lerp(B, 0.55).add(new V3(0, 0.35, 0)), 0.6);
    armyInk(army);
    await armyVis(army, 0, 1, 0.3, 0.03);
    Sfx.U.e.draw();
    await tween(0.45, k => army.units.forEach(u => { u.lean = -0.3 * k; }));
    Sfx.U.e.release();
    const N = LOW() ? 30 : 48;
    const arrows = new THREE.InstancedMesh(arrowGeo, Models.vcMat, N);
    arrows.frustumCulled = false;
    scene.add(arrows);
    const data = [];
    for (let i = 0; i < N; i++) {
      const u = army.units[i % n];
      const p0 = u.p.clone().add(new V3(0, 0.34, 0));
      const onTarget = i % 4 === 0;
      const r = onTarget ? R(0, 0.25) : R(0.15, 0.75), a = Math.random() * 6.28;
      const p1 = B.clone().add(new V3(Math.cos(a) * r, onTarget ? Board.PH + 0.05 : 0.04, Math.sin(a) * r));
      data.push({ p0, p1, t0: (i / N) * 0.35 + R(0, 0.08), dur: R(0.85, 1.05) + dist * 0.03, h: 0.9 + dist * 0.2 + R(-0.2, 0.2), stuck: false, onTarget });
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new V3(1, 1, 1), S0 = new V3(0.0001, 0.0001, 0.0001);
    const Y = new V3(0, 1, 0);
    let T = 0, landed = 0, impactPlayed = false;
    Cam.to(B.clone().addScaledVector(side, 2.3).addScaledVector(d, -1.0).add(new V3(0, 1.0, 0)), B.clone().add(new V3(0, 0.3, 0)), 0.9);
    let sink2 = 0;
    const upd = onFrame(dt => {
      T += dt;
      for (let i = 0; i < N; i++) {
        const a = data[i];
        let k = (T - a.t0) / a.dur;
        if (k < 0) { M.compose(a.p0, Q, S0); arrows.setMatrixAt(i, M); continue; }
        if (k >= 1) {
          k = 1;
          if (!a.stuck) {
            a.stuck = true; landed++;
            if (!impactPlayed) { impactPlayed = true; Sfx.U.e.impact(); }
            if (!a.onTarget) { P.dust(a.p1.clone(), 1, null, 0.12); Marks.hole(a.p1); }
          }
        }
        const p = new V3().lerpVectors(a.p0, a.p1, k); p.y += a.h * 4 * k * (1 - k);
        const vel = new V3().subVectors(a.p1, a.p0); vel.y += a.h * 4 * (1 - 2 * k);
        vel.normalize();
        Q.setFromUnitVectors(Y, vel);
        const tip = p.clone().addScaledVector(vel, a.stuck ? -0.08 : 0);
        tip.y -= sink2;
        M.compose(tip, Q, S1);
        arrows.setMatrixAt(i, M);
      }
      arrows.instanceMatrix.needsUpdate = true;
    });
    await sleep(0.3);
    await tween(0.25, k => army.units.forEach(u => { u.lean = -0.3 * (1 - k); }));
    await sleep(0.45 + dist * 0.03);
    slowmo(0.3, 0.2);
    await sleep(0.35);
    // 钉在棋子上的箭随棋子一同倒下
    for (let i = 0; i < N; i++) if (data[i].onTarget) data[i].p1.y = TOP + 0.04;
    destroyPinned(tgt);
    armyInk(army);
    armyVis(army, 1, 0, 0.3, 0.01);
    await sleep(0.9);
    off(); Core.disposeTree(army.group);
    rise(m, B);
    // 遍地箭矢留存一阵后慢慢没入土中
    sleep(9).then(() => tween(2.5, k => { sink2 = k * 0.35; }, ease.in)).then(() => { upd(); scene.remove(arrows); });
    await sleep(0.45);
  }

  // —— 士：刀盾近卫，十字斩 ——
  async function capGuard(c) {
    const { A, B, d, side, s, m, tgt } = c;
    const n = 2, sc = 0.24;
    const army = new Models.Army(s, 'sword', n, sc);
    scene.add(army.group);
    const offs = [side.clone().multiplyScalar(0.3), side.clone().multiplyScalar(-0.3)];
    army.units.forEach((u, i) => { u.p.copy(A).add(offs[i]); u.yaw = c.yawZ; u.vis = 0; });
    const off = onFrame(dt => army.update(dt));
    cineOn(); sink(m); Sfx.B.taiko(0, 0.7);
    await Cam.to(A.clone().lerp(B, 0.5).addScaledVector(side, 2.3).add(new V3(0, 1.3, 0)), A.clone().lerp(B, 0.6).add(new V3(0, 0.25, 0)), 0.5);
    armyInk(army);
    await armyVis(army, 0, 1, 0.3);
    army.gait = 'run';
    army.units.forEach(u => { u.lean = 0.25; });
    const end = B.clone().addScaledVector(d, -0.32);
    Sfx.U.a.charge();
    await tween(0.5, k => army.units.forEach((u, i) => u.p.copy(A).lerp(end, k).add(offs[i].clone().multiplyScalar(1 - k * 0.3))), ease.in);
    const hp = B.clone().add(new V3(0, 0.3, 0));
    Sfx.U.a.impact();
    slowmo(0.25, 0.15);
    slash(hp, 1.2, 0.7); sleep(0.08).then(() => slash(hp, 1.2, -0.7, 0x9e2418));
    P.sparks(hp, 18); Cam.shake(0.15);
    destroyCross(tgt, d);
    Marks.cut(B, d);
    sleep(0.3).then(() => Marks.blood(B, 0.8));
    army.gait = 'march'; army.units.forEach(u => { u.lean = 0; });
    await sleep(0.8);
    armyInk(army);
    await armyVis(army, 1, 0, 0.3);
    off(); Core.disposeTree(army.group);
    await rise(m, B);
  }

  // —— 帅将：主帅亲征，一击裂地 ——
  async function capKing(c) {
    const { A, B, d, side, s, m, tgt } = c;
    const isChu = s === 'b';
    const hero = isChu ? Models.makeXiangYu() : Models.makeLiuBang();
    const sc = 0.34;
    hero.group.rotation.y = c.yawZ;
    hero.group.position.copy(A);
    hero.group.scale.setScalar(0.001);
    scene.add(hero.group);
    const up = hero.update ? onFrame(dt => hero.update(dt)) : () => { };
    cineOn(); sink(m);
    Sfx.U.k.charge();
    await Cam.to(A.clone().lerp(B, 0.5).addScaledVector(side, 2.2).add(new V3(0, 0.9, 0)), A.clone().lerp(B, 0.5).add(new V3(0, 0.45, 0)), 0.6);
    await summonScale(hero.group, sc, 0.5);
    const arm = hero.armR;
    await tween(0.35, k => { arm.rotation.x = -0.3 - k * 2.4; });
    const end = B.clone().addScaledVector(d, -0.35);
    await tween(0.35, k => { hero.group.position.copy(A).lerp(end, k); hero.group.position.y = TOP + Math.sin(k * Math.PI) * 0.5; }, ease.inOut);
    const hp = B.clone().add(new V3(0, 0.35, 0));
    slowmo(0.2, 0.18);
    tween(0.12, k => { arm.rotation.x = -2.7 + k * 3.2; }, ease.in);
    Sfx.U.k.impact();
    slash(hp, 1.7, -0.2, INK.ink, 0.6);
    sleep(0.06).then(() => slash(hp.clone().add(new V3(0, 0.08, 0)), 1.3, -0.1, 0x9e2418, 0.45));
    ring(B, 3.2, 0.8); P.dust(B, 14, null, 0.35);
    Cam.shake(0.3); flash(hp, 40, 0.5, 0.3);
    destroySlice(tgt, side, { dist: 0.45, big: true });
    Marks.crack(B, 2.6);
    sleep(0.2).then(() => Marks.blood(B.clone().addScaledVector(d, 0.3), 0.9, d));
    await sleep(0.8);
    await dismiss(hero.group, 0.4);
    up();
    await rise(m, B);
  }

  // 精简版吃子（关闭完整特效时）：仍保留各兵种的击杀方式与痕迹
  async function capSimple(c) {
    const { A, B, d, side, m, tgt, info } = c;
    Sfx.lift();
    await tween(0.45, k => { m.position.lerpVectors(A, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.6; }, ease.inOut);
    Sfx.place(); Cam.shake(0.08);
    const t = info.piece.t;
    Sfx.U[t].impact && Sfx.U[t].impact();
    if (t === 'c') { destroyBlast(tgt, d, 1.2); P.fire(B.clone().setY(TOP + 0.2), 14, 0.5); }
    else if (t === 'r') { removePiece(tgt); scene.add(tgt); destroyLaunch(tgt, d, 1); Marks.ruts(B, d, side); }
    else if (t === 'n') { destroySlice(tgt, d); Marks.streak(B, d, 1.2); }
    else if (t === 'a') { destroyCross(tgt, d); Marks.cut(B, d); }
    else if (t === 'k') { destroySlice(tgt, side, { big: true }); Marks.crack(B, 2); }
    else if (t === 'e') { destroyPinned(tgt); }
    else { destroyTopple(tgt, d); }
    m.position.copy(B);
  }

  // ======================================================================
  //  普通走子
  // ======================================================================
  function trail(m, col = INK.ink) { spawn({ pos: m.position.clone().setY(TOP + 0.05), color: col, size: 0.2, size2: 0.5, life: 0.7, op: 0.35, drag: 2 }); }
  async function moveSimple(c) {
    const { A, B, m, info } = c;
    const t = info.piece.t;
    const A0 = m.position.clone();
    if (t === 'n') {
      const [ff, fr] = info.from, [tf, tr] = info.to;
      const leg = Math.abs(tr - fr) === 2 ? Board.pos(ff, fr + Math.sign(tr - fr)) : Board.pos(ff + Math.sign(tf - ff), fr);
      const mid = leg.clone().lerp(B, 0.35);
      Sfx.U.n.move();
      await tween(0.28, k => { m.position.lerpVectors(A0, mid, k); m.position.y = A0.y + (TOP - A0.y) * k + Math.sin(k * Math.PI) * 0.35; });
      P.dust(mid, 3, null, 0.2); Marks.hoof(mid, c.d);
      await tween(0.28, k => { m.position.lerpVectors(mid, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.35; });
      P.dust(B, 5, null, 0.25);
    } else {
      const dist = A.distanceTo(B);
      const dur = Math.min(0.9, 0.25 + dist * 0.09);
      Sfx.U[t] && Sfx.U[t].move && Sfx.U[t].move(dur);
      let n = 0;
      await tween(dur, k => {
        m.position.lerpVectors(A0, B, k); m.position.y = A0.y + (TOP - A0.y) * k + Math.sin(k * Math.PI) * Math.min(0.25, 0.08 + dist * 0.03);
        if (++n % 2 === 0) { if (t === 'r' || t === 'c') P.dust(m.position.clone(), 1, null, 0.2); else trail(m); }
      });
    }
    m.position.copy(B);
    Sfx.place();
  }

  // —— 兵卒行军：步兵列阵随棋子前进 ——
  async function moveInfantry(c) {
    const { A, B, d, side, s, m } = c;
    const n = LOW() ? 8 : 12, sc = 0.21;
    const army = new Models.Army(s, 'spear', n, sc);
    scene.add(army.group);
    const base = [];
    const look = A.clone().lerp(B, 0.5).add(new V3(0, 0.2, 0));
    Cam.to(look.clone().addScaledVector(Cam.homeDir(), 4.2).addScaledVector(side, 1.6).add(new V3(0, 2.6, 0)), look, 0.55);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 4), col = i % 4;
      base.push(side.clone().multiplyScalar((col - 1.5) * 0.24).addScaledVector(d, -0.45 - row * 0.26));
      const u = army.units[i]; u.p.copy(A).add(base[i]); u.yaw = c.yawZ; u.vis = 0;
    }
    const off = onFrame(dt => army.update(dt));
    armyInk(army);
    Sfx.U.p.move(1.4);
    await armyVis(army, 0, 1, 0.25, 0.015);
    const A0 = m.position.clone();
    await tween(1.1, k => {
      m.position.lerpVectors(A0, B, k);
      for (let i = 0; i < n; i++) army.units[i].p.copy(A).lerp(B, k).add(base[i]);
    }, ease.inOut);
    m.position.copy(B);
    Sfx.place();
    armyInk(army);
    await armyVis(army, 1, 0, 0.3, 0.01);
    off(); Core.disposeTree(army.group);
  }

  // —— 过河：乘舟顺流斜渡 ——
  let wakeSlot = 0;
  async function boatCross(c) {
    const { A, B, s, m, info } = c;
    const sA = Math.sign(A.z);
    const xc = A.x + (B.x - A.x) * (A.z / (A.z - B.z));
    const H = Board.HALF;
    // 河窄：船沿河身停靠，棋子跳上船，船顺流斜渡到对岸
    const S = new V3(xc - 0.55, 0.03, sA * 0.06), T = new V3(xc + 0.25, 0.03, -sA * 0.06);
    const boat = Models.makeBoat({ side: s, awning: false });
    const bs = 0.5;
    boat.group.rotation.y = 0;
    boat.group.position.copy(S).add(new V3(-1.2, 0, 0));
    scene.add(boat.group);
    {
      const look = new V3(xc - 0.2, 0.12, 0);
      const hd = Cam.homeDir();
      Cam.to(look.clone().addScaledVector(hd, 3.3).add(new V3(hd.z * 1.2, 2.0, -hd.x * 1.2)), look, 0.6);
    }
    const escorts = [];
    if (info.piece.t === 'p' && full && !LOW()) {
      for (const o of [-1, -2]) {
        const e = Models.makeBoat({ side: s });
        const army = new Models.Army(s, 'spear', 3, 0.34);
        e.group.add(army.group);
        army.units.forEach((u, i) => { u.p.set(-0.2 + i * 0.35, 0.32, 0); u.yaw = Math.PI / 2; });
        army.gait = 'still';
        e.army = army; e.o = o;
        e.group.position.copy(S).add(new V3(o * 1.25 - 1.2, 0, 0));
        e.group.scale.setScalar(0.001);
        escorts.push(e); scene.add(e.group);
      }
    }
    const all = [boat, ...escorts];
    const wake = wakeSlot++ % 4;
    let t = 0;
    const up = onFrame(dt => {
      t += dt;
      for (const b of all) {
        b.group.position.y = 0.03 + Math.sin(t * 3 + (b.o || 0)) * 0.012;
        b.group.rotation.z = Math.sin(t * 2.3 + (b.o || 0)) * 0.035;
        b.man.poleArm.rotation.z = 0.5 + Math.sin(t * 3.2) * 0.25;
        if (b.army) b.army.update(dt);
      }
    });
    boat.group.scale.setScalar(0.001);
    Sfx.river(2.4);
    // 船自上游漂入
    const grow = tween(0.6, k => {
      boat.group.scale.setScalar(Math.max(0.001, bs * Math.min(1, k * 1.6)));
      boat.group.position.x = S.x - 1.2 * (1 - k);
      escorts.forEach(e => { e.group.scale.setScalar(Math.max(0.001, 0.42 * Math.min(1, k * 1.6))); e.group.position.x = S.x + e.o * 1.25 - 1.2 * (1 - k); });
      Board.wakes[wake].set(boat.group.position.x, boat.group.position.z, 0, k);
    }, ease.out);
    // 棋子走到岸边
    const E1 = new V3(S.x + 0.1, TOP, sA * (H + 0.2));
    const A0 = m.position.clone();
    await tween(Math.min(0.6, 0.2 + A0.distanceTo(E1) * 0.1), k => { m.position.lerpVectors(A0, E1, k); m.position.y = A0.y + (TOP - A0.y) * k + Math.sin(k * Math.PI) * 0.1; });
    await grow;
    // 跳上船
    const deck = () => boat.group.localToWorld(new V3(0.2, 0.33, 0));
    const p0 = m.position.clone();
    await tween(0.28, k => { m.position.lerpVectors(p0, deck(), k); m.position.y += Math.sin(k * Math.PI) * 0.22; });
    P.splash(deck().setY(0.05), 5, 0.5); Sfx.B.splash(0, 0.25);
    // 顺流斜渡
    const eS = escorts.map(e => e.group.position.clone());
    await tween(1.1, k => {
      boat.group.position.x = S.x + (T.x - S.x) * k; boat.group.position.z = S.z + (T.z - S.z) * k;
      boat.group.rotation.y = -sA * 0.18 * Math.sin(k * Math.PI);
      escorts.forEach((e, i) => { e.group.position.x = eS[i].x + (T.x - S.x) * k; e.group.position.z = eS[i].z + (T.z - S.z) * k; });
      m.position.copy(deck());
      Board.wakes[wake].set(boat.group.position.x, boat.group.position.z, 0, 1);
      if (Math.random() < 0.3) spawn({ pos: boat.group.localToWorld(new V3(1.0, 0.1, 0)), tex: Tex.puff, color: 0xf2f4ee, size: 0.06, size2: 0.25, life: 0.6, op: 0.6 });
    }, ease.inOut);
    // 登岸
    const E2 = new V3(T.x, TOP, -sA * (H + 0.2));
    const p1 = m.position.clone();
    Sfx.lift();
    await tween(0.28, k => { m.position.lerpVectors(p1, E2, k); m.position.y += Math.sin(k * Math.PI) * 0.22; });
    Sfx.place();
    all.forEach(b => {
      const s0 = b.group.scale.x;
      tween(0.7, k => { b.group.scale.setScalar(Math.max(0.001, s0 * (1 - k))); b.group.position.x += 0.01; Board.wakes[wake].w = 1 - k; }).then(() => Core.disposeTree(b.group));
    });
    sleep(0.75).then(() => { up(); Board.wakes[wake].w = 0; });
    if (E2.distanceTo(B) > 0.05) await tween(Math.min(0.6, 0.15 + E2.distanceTo(B) * 0.1), k => { m.position.lerpVectors(E2, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.1; });
    m.position.copy(B);
  }

  // ---------- 将军 ----------
  function checkStamp(sideInCheck, text) {
    const el = document.getElementById('stamp');
    el.textContent = text || (sideInCheck === 'b' ? '將' : '帥');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    Sfx.checkHit();
    Cam.shake(0.12);
    const k = [...Board.pieces.values()].find(x => x.userData.t === 'k' && x.userData.s === sideInCheck);
    if (k) { ring(k.position, 2.2, 0.9, 0xb0301f, 0.9); P.blood(k.position.clone().setY(TOP + 0.2), 6, 0.5); }
  }

  // ---------- 悔棋：墨迹倒流，棋子回到原位，被吃的子从墨中复生 ----------
  async function undoMove(h) {
    const m = Board.pieces.get(h.pid);
    const A = Board.pos(...h.to), Bp = Board.pos(...h.from);
    Sfx.B.whoosh(0, 0.5, 0.3); Sfx.B.bell(0.1, 660, 0.08);
    if (m) {
      m.visible = true; m.scale.set(1, 1, 1);
      const A0 = m.position.clone();
      let n = 0;
      await tween(0.55, k => {
        m.position.lerpVectors(A0, Bp, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.45;
        m.rotation.y = (Board.viewSide === 'b' ? Math.PI : 0) + Math.sin(k * Math.PI) * 0.6;
        if (++n % 2 === 0) spawn({ pos: m.position.clone(), color: 0x3b4a44, size: 0.25, size2: 0.05, life: 0.6, op: 0.5 });
      }, ease.inOut);
      m.position.copy(Bp); m.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;
      Sfx.place();
    }
    if (h.cap) {
      const cm = Board.makePiece(h.cap);
      cm.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;
      Board.piecesRoot.add(cm); Board.pieces.set(h.cap.id, cm);
      // 墨从四周汇聚
      for (let i = 0; i < nn(14); i++) {
        const a = Math.random() * 6.28, r = R(0.5, 0.9);
        spawn({ pos: A.clone().add(new V3(Math.cos(a) * r, 0.1, Math.sin(a) * r)), vel: new V3(-Math.cos(a) * r * 2.2, 0.2, -Math.sin(a) * r * 2.2), size: 0.3, size2: 0.08, life: 0.45, op: 0.7, drag: 0.5 });
      }
      cm.scale.set(1, 0.01, 1);
      await rise(cm, A, 0.4);
    }
  }

  // ======================================================================
  const CAP = { p: capInfantry, r: capChariot, n: capCavalry, c: capCannon, e: capArchers, a: capGuard, k: capKing };
  let full = true;
  async function playMove(info, opts = {}) {
    const c = ctxOf(info);
    if (!c.m) return;
    Board.clearMoves(true);
    if (opts.instant) {
      if (c.tgt) removePiece(c.tgt);
      c.m.position.copy(c.B);
      return;
    }
    try {
      if (c.tgt) {
        if (full) await CAP[info.piece.t](c); else await capSimple(c);
        if (typeof Camp !== 'undefined') Camp.cheer(info.mover);
      } else if (info.crossesRiver) await boatCross(c);
      else if (info.piece.t === 'p' && full) await moveInfantry(c);
      else await moveSimple(c);
    } catch (e) {
      console.error('动画出错', e);
    }
    Time.scale = 1;
    if (c.tgt && c.tgt.parent === Board.piecesRoot) removePiece(c.tgt);
    c.m.visible = true; c.m.scale.set(1, 1, 1); c.m.position.copy(c.B);
    c.m.rotation.set(0, Board.viewSide === 'b' ? Math.PI : 0, 0);
    if (Cam.cine) { cineOff(); await Cam.home(0.8); }
    cineOff();
    if (info.result) { checkStamp(XQ.other(info.mover), info.result.reason === 'checkmate' ? '殺' : '困'); Voice.play(info.mover + '_mate'); }
    else if (info.check) { checkStamp(XQ.other(info.mover)); Voice.play(info.mover + '_check'); }
  }

  return {
    P, spawn, ring, slash, flash, sink, rise, playMove, undoMove, checkStamp, cineOn, cineOff, geom, bits, Marks, clearMarks,
    destroyBlast, destroyLaunch, destroySlice, destroyCross, destroyTopple, destroyPinned,
    get full() { return full; }, set full(v) { full = v; },
  };
})();
