// ===== 特效核心：粒子、地面痕迹（淡至 30% 永久保留）、炮烟、血、碎块、镜头工具、低特效档的走子与吃子 =====
const Fx = (() => {
  const { scene, Time, onFrame, tween, sleep, ease, Cam, Tex, toon, rnd, camera, canvasTex, inkBlot } = Core;
  const V3 = THREE.Vector3;
  const TOP = Board.TOP;
  const R = (a, b) => a + Math.random() * (b - a);
  const LOW = () => Core.quality === 'low';
  const state = { level: 'cine', gore: 3, ply: 0 };

  // ---------- 粒子 ----------
  const pools = { n: [], a: [] };
  const live = [];
  function spawn(o) {
    if (live.length > (LOW() ? 260 : 650)) return null;
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
      spin: o.spin ?? (Math.random() - 0.5) * 2, fadeIn: o.fadeIn ?? 0.08, floor: o.floor ?? -99, pow: o.pow ?? 1.6, onLand: o.onLand || null,
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
      if (p.sp.position.y < p.floor) {
        p.sp.position.y = p.floor; p.vel.y *= -0.25; p.vel.x *= 0.6; p.vel.z *= 0.6;
        if (p.onLand) { const f = p.onLand; p.onLand = null; f(p.sp.position.clone()); }
      }
      const s = p.s0 + (p.s1 - p.s0) * Math.sqrt(k);
      p.sp.scale.set(s, s, 1);
      p.sp.material.rotation += p.spin * dt;
      p.sp.material.opacity = p.op * Math.min(1, p.age / p.fadeIn) * Math.pow(1 - k, p.pow);
    }
  });
  const rv = (x, y, z) => new V3(R(-x, x), R(-y, y), R(-z, z));
  const nn = n => (LOW() ? Math.ceil(n / 2) : n);
  const groundAt = p => (Math.abs(p.x) < 4.8 && Math.abs(p.z) > Board.HALF && Math.abs(p.z) < Board.BZ ? TOP : 0.02);
  // 血的颜色随血腥档位
  const bloodCol = () => (state.gore >= 2 ? 0x7c0e08 : 0x1b1a19);
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
    flame(pos, s = 0.3) { spawn({ pos: pos.clone().add(rv(0.05, 0, 0.05)), vel: new V3(R(-0.1, 0.1), R(0.4, 0.9), R(-0.1, 0.1)), tex: Tex.spark, add: true, color: Math.random() < 0.5 ? 0xffa24a : 0xff6a2a, size: s, size2: s * 0.2, life: R(0.3, 0.6), op: 0.9, drag: 1 }); },
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
    // 喷血：高档有落地血点
    blood(pos, n = 10, r = 1, dir, spurt = 1) {
      if (state.gore === 0) { P.dust(pos, Math.ceil(n / 3), null, 0.15); return; }
      const col = bloodCol();
      const k = state.gore >= 3 ? 1.4 : state.gore === 2 ? 1 : 0.6;
      for (let i = 0; i < nn(Math.round(n * k)); i++) {
        const v = new V3(R(-1, 1), R(0.3, 1.6) * spurt, R(-1, 1)).multiplyScalar(R(0.8, 2.4) * r);
        if (dir) v.addScaledVector(dir, R(0.8, 2.6) * r);
        const land = state.gore >= 2 && i % 3 === 0 ? (lp => Marks.drop(lp)) : null;
        spawn({ pos: pos.clone(), vel: v, tex: Tex.splat, color: col, size: 0.09 * r, size2: 0.22 * r, life: R(0.6, 1.0), g: 7, drag: 0.8, floor: groundAt(pos) + 0.01, op: 0.95, onLand: land });
      }
      if (state.gore >= 2) for (let i = 0; i < 3; i++) spawn({ pos: pos.clone(), vel: rv(0.3, 0.2, 0.3).addScaledVector(dir || new V3(), 0.4), tex: Tex.puff, color: col, size: 0.12 * r, size2: 0.4 * r, life: 0.5, op: 0.45, drag: 3 });
    },
    embers(pos, n = 12) {
      for (let i = 0; i < nn(n); i++) spawn({ pos: pos.clone().add(rv(0.4, 0, 0.4)), vel: new V3(R(-0.2, 0.2), R(0.3, 1.2), R(-0.2, 0.2)), tex: Tex.spark, add: true, color: 0xff8a3a, size: 0.05, size2: 0.02, life: R(1, 2.4), drag: 0.8, delay: R(0, 1.5), pow: 1 });
    },
    wood(pos, n = 10, dir, power = 1) { chunks(pos, dir || new V3(), power, n, { small: true }); },
  };
  P.redInk = P.blood;

  function ring(pos, size = 2, dur = 0.7, color = INK.ink, op = 0.8) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: Tex.ring, color, transparent: true, depthWrite: false }));
    m.position.copy(pos); m.position.y = Math.max(pos.y, groundAt(pos) + 0.02);
    m.rotation.y = Math.random() * 6;
    scene.add(m);
    tween(dur, k => { const s = 0.2 + size * k; m.scale.set(s, 1, s); m.material.opacity = op * (1 - k); }, ease.out).then(() => { scene.remove(m); m.material.dispose(); });
  }
  const ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2);
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
  //  地面痕迹：先清晰，再逐渐淡到 30%，然后"烙"进棋盘图层永久保留
  // ======================================================================
  const MT = {
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
    blood: canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#fff';
      inkBlot(g, w / 2, w / 2, w * 0.27, 1, 0.5);
      for (let i = 0; i < 5; i++) inkBlot(g, w / 2 + (rnd() - 0.5) * w * 0.3, w / 2 + (rnd() - 0.5) * w * 0.3, w * (0.08 + rnd() * 0.08), 1, 0.4);
      for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = w * (0.26 + rnd() * 0.2); inkBlot(g, w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 2 + rnd() * 9, 0.9, 0.3); }
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 20; i++) { g.globalAlpha = 0.3; inkBlot(g, w / 2 + (rnd() - 0.5) * 60, w / 2 + (rnd() - 0.5) * 60, 4 + rnd() * 8, 1, 0.5); }
    }),
    drop: canvasTex(64, 64, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 12, 1, 0.5); for (let i = 0; i < 5; i++) inkBlot(g, w / 2 + (rnd() - 0.5) * 40, w / 2 + (rnd() - 0.5) * 40, 2 + rnd() * 3, 1, 0.3); }),
    rut: canvasTex(256, 64, (g, w, h) => {
      for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.5})`; g.fillRect(x, h * 0.3 + (rnd() - 0.5) * 3, 2, h * 0.4 * (0.6 + rnd() * 0.5)); }
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(rnd() * w, h * 0.2 + rnd() * h * 0.6, 2 + rnd() * 3, 1 + rnd() * 2); }
    }),
    hoof: canvasTex(64, 64, (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(w / 2, w / 2 + 4, w * 0.28, Math.PI * 0.95, Math.PI * 2.05, true); g.stroke(); }),
    foot: canvasTex(64, 64, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 22, 1, 0.2); g.globalCompositeOperation = 'destination-out'; inkBlot(g, w / 2, w / 2, 14, 0.5, 0.2); }),
    streak: canvasTex(512, 96, (g, w, h) => {
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(10, h / 2); g.quadraticCurveTo(w * 0.4, h * 0.15, w - 10, h * 0.45); g.quadraticCurveTo(w * 0.45, h * 0.62, 10, h / 2); g.fill();
      for (let i = 0; i < 40; i++) inkBlot(g, 60 + rnd() * (w - 70), h * (0.25 + rnd() * 0.5), 1.5 + rnd() * 5, 0.9, 0.3);
    }),
    cut: canvasTex(256, 256, (g, w) => {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      for (const [a, b, c2, d] of [[30, 40, 226, 216], [226, 40, 30, 216]]) for (let k = 0; k < 3; k++) { g.globalAlpha = 0.5 + k * 0.2; g.lineWidth = 7 - k * 2; g.beginPath(); g.moveTo(a + k * 2, b); g.lineTo(c2 - k * 2, d); g.stroke(); }
    }),
    crack: canvasTex(512, 512, (g, w) => {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      const branch = (x, y, a, L, wd, depth) => {
        if (depth > 4 || L < 8) return;
        let cx = x, cy = y; g.lineWidth = wd; g.beginPath(); g.moveTo(cx, cy);
        for (let i = 0; i < 6; i++) { a += (rnd() - 0.5) * 0.7; cx += Math.cos(a) * L / 6; cy += Math.sin(a) * L / 6; g.lineTo(cx, cy); }
        g.stroke(); branch(cx, cy, a + 0.5, L * 0.6, wd * 0.6, depth + 1); if (rnd() < 0.7) branch(cx, cy, a - 0.6, L * 0.5, wd * 0.55, depth + 1);
      };
      for (let i = 0; i < 7; i++) branch(w / 2, w / 2, (i / 7) * 6.28 + rnd() * 0.4, 110 + rnd() * 70, 11, 0);
      g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 26, 1, 0.5);
    }),
    hole: canvasTex(64, 64, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 7, 1, 0.3); }),
    drag: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#fff'; for (let x = 0; x < w; x += 3) { g.globalAlpha = 0.2 + 0.6 * (1 - x / w); inkBlot(g, x, h / 2 + (rnd() - 0.5) * 8, 6 + rnd() * 6 * (1 - x / w), 1, 0.4); } }),
  };
  // 永久图层（覆盖棋盘面）
  const BX = 4.75, BZ = Board.BZ;
  const LAY_W = 1024, LAY_H = Math.round(1024 * (2 * BZ) / (2 * BX));
  const layerCanvas = document.createElement('canvas'); layerCanvas.width = LAY_W; layerCanvas.height = LAY_H;
  const lg = layerCanvas.getContext('2d');
  const layerTex = new THREE.CanvasTexture(layerCanvas); layerTex.colorSpace = THREE.SRGBColorSpace;
  const layerGeo = new THREE.PlaneGeometry(2 * BX, 2 * BZ); layerGeo.rotateX(-Math.PI / 2);
  const layer = new THREE.Mesh(layerGeo, new THREE.MeshBasicMaterial({ map: layerTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  layer.position.y = TOP + 0.0008; layer.renderOrder = 1;
  scene.add(layer);
  let layerDirty = false;
  const tintCache = new Map();
  function tinted(tex, color) {
    const key = tex.uuid + color;
    if (tintCache.has(key)) return tintCache.get(key);
    const src = tex.image, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillRect(0, 0, c.width, c.height);
    tintCache.set(key, c);
    return c;
  }
  function bake(r) {
    const { x, z } = r.m.position;
    const cx = (x + BX) / (2 * BX) * LAY_W, cy = (z + BZ) / (2 * BZ) * LAY_H;
    const ppu = LAY_W / (2 * BX);
    lg.save(); lg.translate(cx, cy); lg.rotate(-r.m.rotation.y);
    lg.globalAlpha = r.op * 0.3;
    const img = tinted(r.tex, r.color);
    const w = r.sx * ppu, h = r.sz * ppu;
    lg.drawImage(img, -w / 2, -h / 2, w, h);
    lg.restore();
    layerDirty = true;
  }
  const marks = [];
  const markGeo = new THREE.PlaneGeometry(1, 1); markGeo.rotateX(-Math.PI / 2);
  let markSeq = 0;
  const onBoard = p => Math.abs(p.x) < BX - 0.02 && Math.abs(p.z) > Board.HALF + 0.02 && Math.abs(p.z) < BZ - 0.02;
  function mark(tex, color, pos, sx, sz = sx, rot = 0, { op = 0.85, grow = 0.2, hold = 10, fade = 45 } = {}) {
    if (!onBoard(pos)) return null;
    const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 - (markSeq % 6), polygonOffsetUnits: -2 }));
    m.position.set(pos.x, TOP + 0.0016 + (markSeq++ % 20) * 0.00012, pos.z);
    m.rotation.y = rot; m.renderOrder = 2;
    scene.add(m);
    const rec = { m, tex, color, t: 0, op, hold, fade, grow, sx, sz };
    marks.push(rec);
    if (marks.length > (LOW() ? 50 : 120)) { const o = marks.shift(); bake(o); scene.remove(o.m); o.m.material.dispose(); }
    return rec;
  }
  onFrame(dt => {
    for (let i = marks.length - 1; i >= 0; i--) {
      const r = marks[i]; r.t += dt;
      const g = r.grow ? Math.min(1, r.t / r.grow) : 1;
      const e = 1 - Math.pow(1 - g, 3);
      r.m.scale.set(r.sx * (0.3 + 0.7 * e), 1, r.sz * (0.3 + 0.7 * e));
      let o = r.op * Math.min(1, r.t / 0.08);
      if (r.t > r.hold) o = r.op * (1 - 0.7 * Math.min(1, (r.t - r.hold) / r.fade));
      r.m.material.opacity = o;
      if (r.t > r.hold + r.fade) { bake(r); scene.remove(r.m); r.m.material.dispose(); marks.splice(i, 1); }
    }
    if (layerDirty) { layerTex.needsUpdate = true; layerDirty = false; }
  });
  function clearMarks() {
    for (const r of marks) { scene.remove(r.m); r.m.material.dispose(); }
    marks.length = 0;
    lg.clearRect(0, 0, LAY_W, LAY_H); layerTex.needsUpdate = true;
    for (const s of smokes) s.dead = true;
  }
  const BLOOD = () => bloodCol();
  const Marks = {
    scorch(p, s = 1.6) { mark(MT.scorch, 0x16110e, p, s, s, rnd() * 6, { op: 0.92, hold: 20 }); mark(MT.scorchRim, 0x4a2a14, p, s * 1.5, s * 1.5, 0, { op: 0.6, hold: 20 }); },
    blood(p, s = 1.0, dir) { if (state.gore === 0) return; s *= state.gore >= 3 ? 1.35 : 1; mark(MT.blood, BLOOD(), p.clone().addScaledVector(dir || new V3(), 0.12), s, s * R(0.8, 1.1), rnd() * 6, { op: 0.9, grow: 1.2 }); },
    drop(p) { if (state.gore < 2) return; mark(MT.drop, BLOOD(), p, R(0.05, 0.12), undefined, rnd() * 6, { op: 0.85, grow: 0.05, hold: 6 }); },
    dragTrail(p, d, len = 0.6) { if (state.gore < 3) return; mark(MT.drag, BLOOD(), p.clone().addScaledVector(d, len / 2), len, len * 0.2, Math.atan2(-d.z, d.x) + Math.PI, { op: 0.8, grow: 0.6 }); },
    ruts(p, d, side) { const rot = Math.atan2(-d.z, d.x); for (const s of [1, -1]) mark(MT.rut, 0x2e2419, p.clone().addScaledVector(side, s * 0.2), 0.34, 0.07, rot, { op: 0.75, grow: 0, hold: 6 }); },
    hoof(p, d) { mark(MT.hoof, 0x2e2419, p, 0.09, 0.09, Math.atan2(-d.z, d.x) - Math.PI / 2, { op: 0.8, grow: 0, hold: 5 }); },
    foot(p) { mark(MT.foot, 0x2e2419, p, 0.2, 0.2, rnd() * 6, { op: 0.7, grow: 0, hold: 6 }); },
    streak(p, d, len = 1.5) { if (state.gore === 0) return; mark(MT.streak, BLOOD(), p, len, len * 0.19, Math.atan2(-d.z, d.x) + R(-0.3, 0.3), { op: 0.9, grow: 0.15 }); },
    cut(p, d) { mark(MT.cut, 0x1c1714, p, 0.85, 0.85, Math.atan2(-d.z, d.x), { op: 0.85, grow: 0.12 }); },
    crack(p, s = 2.4) { mark(MT.crack, 0x16110e, p, s, s, rnd() * 6, { op: 0.9, grow: 0.25, hold: 16 }); },
    hole(p) { mark(MT.hole, 0x1c1714, p, 0.08, 0.08, 0, { op: 0.8, grow: 0, hold: 5 }); },
  };

  // ---------- 炮烟：3 回合（双方各走 3 步）内逐渐减弱；同时随时间消散，最长 40 秒必散尽 ----------
  // 烟是淡墨色的细烟，从弹坑四周升起、向上飘散，不压在棋子上
  const smokes = [];
  const SMOKE_PLIES = 6, SMOKE_SECS = 40;
  function addSmoke(pos, strength = 1) { smokes.push({ pos: pos.clone(), strength: Math.min(1, strength), ply0: state.ply, age: 0, acc: 0, dead: false, wind: R(-0.5, 0.5) }); }
  onFrame(dt => {
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i];
      s.age += dt;
      const byPly = Math.min(1, 1 - (state.ply - s.ply0) / SMOKE_PLIES); // 悔棋不会让烟变浓
      const byTime = 1 - s.age / SMOKE_SECS;
      const left = s.dead ? 0 : Math.min(byPly, byTime);
      if (left <= 0) { smokes.splice(i, 1); continue; }
      const k = left * left * s.strength;
      s.acc += dt * (LOW() ? 2.5 : 5) * k;
      while (s.acc > 1) {
        s.acc -= 1;
        const a = Math.random() * Math.PI * 2, r = R(0.3, 0.55);
        const p = s.pos.clone().add(new V3(Math.cos(a) * r, 0.02, Math.sin(a) * r));
        spawn({ pos: p, vel: new V3(R(0.08, 0.22) + s.wind * 0.1, R(0.55, 0.9), R(-0.08, 0.08)), color: Math.random() < 0.5 ? 0x7a746b : 0x5c5750, size: 0.09 + 0.06 * k, size2: 0.5 + 0.5 * k, life: R(1.8, 2.8), op: 0.15 + 0.22 * k, drag: 0.15, fadeIn: 0.4 });
        if (Math.random() < 0.2 * k) spawn({ pos: p, vel: new V3(R(-0.1, 0.1), R(0.3, 0.7), R(-0.1, 0.1)), tex: Tex.spark, add: true, color: 0xff7a30, size: 0.045, size2: 0.02, life: R(0.5, 1.2), drag: 0.6 });
      }
    }
  });

  // ---------- 刚体碎块 ----------
  const bits = [];
  onFrame(dt => {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]; b.age += dt;
      if (!b.rest) {
        b.v.y -= (b.g ?? 9.8) * dt;
        b.o.position.addScaledVector(b.v, dt);
        b.o.rotation.x += b.w.x * dt; b.o.rotation.y += b.w.y * dt; b.o.rotation.z += b.w.z * dt;
        const floor = b.floor ?? groundAt(b.o.position) + 0.03;
        if (b.o.position.y < floor) {
          b.o.position.y = floor; b.v.y *= -0.3; b.v.x *= 0.6; b.v.z *= 0.6; b.w.multiplyScalar(0.6);
          if (b.onLand) { const f = b.onLand; b.onLand = null; f(b.o.position.clone()); }
          if (b.v.lengthSq() < 0.05) b.rest = true;
        }
        if (b.fire && b.age < b.fire && Math.random() < 0.5) spawn({ pos: b.o.position.clone(), tex: Tex.spark, add: true, color: 0xff7a30, size: 0.14, size2: 0.04, life: 0.35, op: 0.9 });
        if (b.bleed && b.age < b.bleed && Math.random() < 0.6) spawn({ pos: b.o.position.clone(), tex: Tex.splat, color: bloodCol(), size: 0.06, size2: 0.02, life: 0.4, op: 0.9, g: 4 });
      }
      if (b.age > b.life) {
        const k = Math.min(1, (b.age - b.life) / 0.6);
        b.o.scale.setScalar(b.s * (1 - k));
        if (k >= 1) { if (b.ink) P.ink(b.o.position, 3, 0.2, 0.2, 0.6); Core.disposeTree(b.o); bits.splice(i, 1); }
      }
    }
  });
  function throwObj(o, v, opts = {}) {
    if (!o.parent) scene.add(o);
    bits.push({ o, v: v.clone(), w: opts.w || rv(10, 10, 10), age: 0, life: opts.life ?? 2.2, s: o.scale.x, floor: opts.floor, fire: opts.fire || 0, bleed: opts.bleed || 0, g: opts.g, onLand: opts.onLand || null, ink: opts.ink !== false });
  }
  const chunkGeos = [new THREE.BoxGeometry(0.16, 0.14, 0.12), new THREE.TetrahedronGeometry(0.11), new THREE.BoxGeometry(0.22, 0.1, 0.09), new THREE.DodecahedronGeometry(0.07)];
  chunkGeos.forEach(g => { g.userData.keep = true; });
  const charredWood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
  const plankGeo = new THREE.BoxGeometry(0.5, 0.05, 0.1); plankGeo.userData.keep = true;
  function chunks(c, dir, power, n = 12, opts = {}) {
    for (let i = 0; i < nn(n); i++) {
      const o = new THREE.Mesh(opts.planks ? plankGeo : chunkGeos[i % 4], opts.mat || (opts.burnt && i % 2 ? charredWood : Board.pieceWood));
      o.castShadow = !LOW();
      o.position.copy(c).add(rv(0.3, 0.08, 0.3));
      const s = R(0.6, 1.3) * (opts.small ? 0.6 : 1) * (opts.scale || 1); o.scale.setScalar(s);
      scene.add(o);
      throwObj(o, new V3(R(-1, 1), R(0.8, 2.2), R(-1, 1)).multiplyScalar(R(1, 2.4) * power).addScaledVector(dir, R(1, 3.5) * power), { life: R(1.2, 2.2) * (opts.lifeK || 1), fire: opts.burnt ? R(0.5, 1.2) : 0, ink: false });
    }
  }
  function removePiece(m) {
    for (const [id, x] of Board.pieces) if (x === m) Board.pieces.delete(id);
    if (m.parent) m.parent.remove(m);
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

  // ---------- 低特效档：棋子直接移动，只留下结果 ----------
  function resultAt(t, B, d, side) {
    const g = B.clone().setY(TOP + 0.05);
    switch (t) {
      case 'c': Marks.scorch(g, 1.6); addSmoke(g, 0.8); P.smoke(g, 8, 0.6); P.embers(g, 8); break;
      case 'r': Marks.ruts(g, d, side); Marks.blood(g, 0.8, d); break;
      case 'n': Marks.hoof(g.clone().addScaledVector(d, -0.2), d); Marks.streak(g, d, 1.1); Marks.blood(g, 0.7, d); break;
      case 'e': for (let i = 0; i < 6; i++) Marks.hole(g.clone().add(rv(0.4, 0, 0.4))); Marks.blood(g, 0.6); break;
      case 'a': Marks.cut(g, d); Marks.blood(g, 0.7); break;
      case 'k': Marks.crack(g, 2); Marks.blood(g, 0.8, d); break;
      default: Marks.blood(g, 0.9, d); break;
    }
  }
  const unitKey = (t, s) => ({ p: 'inf', r: 'chariot', n: 'cav', c: 'cannon', a: 'guard', e: s === 'r' ? 'xbow' : 'ele', k: s === 'r' ? 'liu' : 'xiang' })[t] || 'inf';
  async function lowCapture(c) {
    const { A, B, d, side, m, tgt, info } = c;
    const t = info.piece.t;
    Sfx.lift();
    await tween(0.4, k => { m.position.lerpVectors(A, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.5; }, ease.inOut);
    Sfx.place(); Cam.shake(0.06);
    const su = Sfx.unit(unitKey(t, c.s)); su.impact && su.impact();
    if (tgt && tgt.parent) {
      const cc = tgt.position.clone(); cc.y += 0.1;
      removePiece(tgt);
      chunks(cc, d, t === 'c' ? 1.4 : 0.8, 10, { burnt: t === 'c' });
      flyFace(tgt, cc, d, 0.8, t === 'c');
      P.ink(cc, 10, 0.5, 0.3);
      if (t !== 'c') P.blood(cc, 10, 0.7, d);
      else { P.fire(cc, 14, 0.5); flash(cc, 30, 0.4); }
    }
    resultAt(t, B, d, side);
    m.position.copy(B);
  }
  async function lowMove(c) {
    const { A, B, m, info } = c;
    const t = info.piece.t;
    const A0 = m.position.clone();
    const su = Sfx.unit(unitKey(t, c.s)); su.move && su.move(0.6);
    if (c.mt === 'n') {
      const [ff, fr] = info.from, [tf, tr] = info.to;
      const leg = Math.abs(tr - fr) === 2 ? Board.pos(ff, fr + Math.sign(tr - fr)) : Board.pos(ff + Math.sign(tf - ff), fr);
      await tween(0.24, k => { m.position.lerpVectors(A0, leg, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.25; });
      await tween(0.26, k => { m.position.lerpVectors(leg, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.3; });
    } else {
      const dist = A.distanceTo(B), dur = Math.min(0.7, 0.2 + dist * 0.07);
      await tween(dur, k => { m.position.lerpVectors(A0, B, k); m.position.y = A0.y + (TOP - A0.y) * k + Math.sin(k * Math.PI) * Math.min(0.2, 0.06 + dist * 0.03); });
    }
    m.position.copy(B);
    Sfx.place();
  }

  // ---------- 棋子沉入墨中 / 浮现 ----------
  async function sink(m, dur = 0.35) {
    if (!m) return;
    P.ink(m.position.clone().setY(TOP + 0.1), 10, 0.4, 0.3);
    await tween(dur, k => { m.scale.set(1 + k * 0.2, Math.max(0.01, 1 - k), 1 + k * 0.2); m.position.y = TOP - k * 0.05; }, ease.in);
    m.visible = false; m.scale.set(1, 1, 1); m.position.y = TOP;
  }
  async function rise(m, pos, dur = 0.45) {
    m.position.copy(pos); m.visible = true;
    P.ink(pos.clone().setY(TOP + 0.08), 10, 0.4, 0.3, 0.7);
    await tween(dur, k => m.scale.set(1, Math.max(0.01, k), 1), ease.outBack);
    Sfx.place();
  }
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
  const cine = () => state.level === 'cine';
  function cineOn() { if (cine()) document.body.classList.add('cine'); }
  function cineOff() { document.body.classList.remove('cine'); }
  // 只在电影档移动镜头
  const shot = (pos, look, dur = 0.8, e) => (cine() ? Cam.to(pos, look, dur, e) : Promise.resolve());
  function follow(target, offset, lookAhead, stiff = 4) {
    if (!cine()) return () => { };
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

  // ---------- 将军 ----------
  function checkStamp(sideInCheck, text) {
    const el = document.getElementById('stamp');
    el.textContent = text || (sideInCheck === 'b' ? '將' : '帥');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    Sfx.checkHit();
    Cam.shake(0.12);
    const k = [...Board.pieces.values()].find(x => x.userData.t === 'k' && x.userData.s === sideInCheck);
    if (k) { ring(k.position, 2.2, 0.9, 0xb0301f, 0.9); P.ink(k.position.clone().setY(TOP + 0.2), 6, 0.5, 0.3, 0.7); }
  }

  // ---------- 揭棋：翻子 ----------
  const popGeo = new THREE.PlaneGeometry(1, 1);
  async function flip(m, p, lift = 0.6) {
    const y0 = m.position.y, top = TOP + lift;
    Sfx.lift(); Sfx.B.whoosh(0.05, 0.3, 0.22);
    await tween(0.2, k => { m.position.y = y0 + (top - y0) * k; }, ease.out);
    let swapped = false;
    await tween(0.32, k => {
      const a = k * Math.PI;
      if (!swapped && a >= Math.PI / 2) { swapped = true; Board.setFace(m, p); }
      m.rotation.x = a < Math.PI / 2 ? a : a - Math.PI;
      m.position.y = top + Math.sin(k * Math.PI) * 0.12;
    }, ease.inOut);
    m.rotation.x = 0;
    return top;
  }
  async function reveal(m, p) {
    const top = await flip(m, p);
    const c = m.position.clone(); c.y = top + 0.1;
    // 翻出的字印浮起、放大、淡去
    Sfx.B.wood(0, 0.55); Sfx.B.bell(0.02, p.s === 'r' ? 784 : 659, 0.07); Sfx.B.shime(0.05, 0.35);
    ring(c.clone().setY(TOP + 0.02), 1.9, 0.6, p.s === 'r' ? 0xb0301f : 0x2a2826, 0.7);
    P.ink(c, 10, 0.45, 0.3, 0.8);
    for (let i = 0; i < nn(14); i++) spawn({ pos: c.clone(), vel: rv(1.6, 1.4, 1.6), tex: Core.Tex.spark, add: true, color: 0xf2c46a, size: 0.12, size2: 0.02, life: R(0.4, 0.8), drag: 1.5 });
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: Board.glowTex, color: 0xf6ecd4, transparent: true, depthTest: false, depthWrite: false }));
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: Board.faceTex(p.s, p.t), transparent: true, depthTest: false, depthWrite: false }));
    bg.renderOrder = 30; fg.renderOrder = 31;
    scene.add(bg, fg);
    tween(1.1, k => {
      const y = top + 0.35 + k * 0.9, sc = 0.55 + 0.5 * Math.min(1, k * 2.5), op = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      bg.position.set(c.x, y, c.z); fg.position.set(c.x, y, c.z);
      bg.scale.set(sc * 1.5, sc * 1.5, 1); fg.scale.set(sc, sc, 1);
      bg.material.opacity = op * 0.9; fg.material.opacity = op;
    }, ease.out).then(() => { scene.remove(bg, fg); bg.material.dispose(); fg.material.dispose(); });
    await sleep(0.25);
    await tween(0.16, k => { m.position.y = top - (top - TOP) * k; }, ease.in);
    m.position.y = TOP; Sfx.place();
  }

  // ---------- 悔棋：墨迹倒流 ----------
  async function undoMove(h, piece) {
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
      // 揭棋：翻开的子撤回后重新扣上
      if (h.rv && piece && piece.h) { await flip(m, piece, 0.4); await tween(0.12, k => { m.position.y = TOP + 0.4 * (1 - k); }); m.position.y = TOP; }
    }
    if (h.cap) {
      const cm = Board.makePiece(h.cap);
      cm.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;
      Board.piecesRoot.add(cm); Board.pieces.set(h.cap.id, cm);
      for (let i = 0; i < nn(14); i++) {
        const a = Math.random() * 6.28, r = R(0.5, 0.9);
        spawn({ pos: A.clone().add(new V3(Math.cos(a) * r, 0.1, Math.sin(a) * r)), vel: new V3(-Math.cos(a) * r * 2.2, 0.2, -Math.sin(a) * r * 2.2), size: 0.3, size2: 0.08, life: 0.45, op: 0.7, drag: 0.5 });
      }
      cm.scale.set(1, 0.01, 1);
      await rise(cm, A, 0.4);
    }
  }

  // ======================================================================
  //  走子总入口
  // ======================================================================
  const ctxOf = (info) => {
    const m = Board.pieces.get(info.piece.id);
    const tgt = info.captured ? Board.pieces.get(info.captured.id) : null;
    const A = Board.pos(...info.from), B = Board.pos(...info.to);
    return { info, m, tgt, A, B, s: info.piece.s, mt: info.mt || info.piece.t, ...geom(A, B) };
  };
  async function playMove(info, opts = {}) {
    const c = ctxOf(info);
    if (!c.m) return;
    const y0 = c.m.position.y;
    Board.clearMoves(true);
    if (opts.instant) { if (c.tgt) removePiece(c.tgt); if (info.reveal) Board.setFace(c.m, info.piece); c.m.position.copy(c.B); return; }
    try {
      // 揭棋：暗子先翻开，再由真身出阵
      if (info.reveal) { c.m.position.y = y0; await reveal(c.m, info.piece); }
      if (state.level === 'low') {
        if (c.tgt) await lowCapture(c);
        else if (info.crossesRiver) await Squads.pieceBoat(c);
        else await lowMove(c);
      } else if (c.tgt) await Squads.capture(c);
      else await Squads.move(c);
      if (c.tgt && typeof Camp !== 'undefined') Camp.cheer(info.mover);
    } catch (e) {
      console.error('动画出错', e);
    }
    Time.scale = 1;
    if (c.tgt && c.tgt.parent === Board.piecesRoot) removePiece(c.tgt);
    c.m.visible = true; c.m.scale.set(1, 1, 1); c.m.position.copy(c.B);
    c.m.rotation.set(0, Board.viewSide === 'b' ? Math.PI : 0, 0);
    if (Cam.cine && !info.result) { cineOff(); await Cam.home(0.8); }
    cineOff();
    if (info.result) { checkStamp(XQ.other(info.mover), info.result.reason === 'checkmate' ? '殺' : '困'); }
    else if (info.check) { checkStamp(XQ.other(info.mover)); }
  }

  return {
    P, spawn, ring, slash, flash, sink, rise, playMove, undoMove, checkStamp, reveal, flip, cineOn, cineOff, geom, bits, Marks, clearMarks, addSmoke,
    chunks, throwObj, removePiece, flyFace, groundY, onWater, groundAt, shot, follow, slowmo, ctxOf, rv, R, state, resultAt, lowMove,
    get smokeCount() { return smokes.length; },
    get level() { return state.level; }, set level(v) { state.level = v; },
    get gore() { return state.gore; }, set gore(v) { state.gore = v; },
    get ply() { return state.ply; }, set ply(v) { state.ply = v; },
    get full() { return state.level !== 'low'; }, set full(v) { state.level = v ? 'cine' : 'low'; },
    bloodCol,
  };
})();
