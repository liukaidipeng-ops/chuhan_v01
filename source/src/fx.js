// ===== 特效核心：粒子、地面痕迹（淡至 30% 永久保留）、炮烟、血、碎块、镜头工具、低特效档的走子与吃子 =====
const Fx = (() => {
  const { scene, Time, onFrame, tween, sleep, ease, Cam, Tex, toon, rnd, camera, canvasTex, inkBlot } = Core;
  const V3 = THREE.Vector3;
  const TOP = Board.TOP;
  const R = (a, b) => a + Math.random() * (b - a);
  const LOW = () => Core.quality === 'low';
  const state = { level: 'cine', gore: 3, ply: 0, keep: 0 };

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
  const mistQ = [];
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
    // 扬尘：大家伙（马、车、象）跑起来时身后拖着的一道沙尘，升起来、散得慢
    plume(pos, dir, s = 0.3, n = 2) {
      for (let i = 0; i < nn(n); i++) {
        const v = rv(0.35, 0.05, 0.35).add(new V3(0, R(0.25, 0.7), 0));
        if (dir) v.addScaledVector(dir, R(-1.1, -0.3));
        spawn({ pos: pos.clone().add(rv(0.12, 0, 0.12)).setY(pos.y + 0.04), vel: v, tex: i % 2 ? Tex.puff : Tex.inkPuff, color: i % 2 ? 0xb3a487 : 0x9a8a70, size: s * R(0.5, 0.85), size2: s * R(2.3, 3.8), life: R(1.4, 2.6), op: R(0.26, 0.42), drag: 1.7, fadeIn: 0.12, pow: 1.3 });
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
      const k = state.gore >= 3 ? 1.9 : state.gore === 2 ? 1.1 : 0.6;
      for (let i = 0; i < nn(Math.round(n * k)); i++) {
        const v = new V3(R(-1, 1), R(0.3, 1.6) * spurt, R(-1, 1)).multiplyScalar(R(0.8, 2.4) * r);
        if (dir) v.addScaledVector(dir, R(0.8, 2.6) * r);
        const land = state.gore >= 2 && i % 2 === 0 ? (lp => Marks.drop(lp)) : null;
        spawn({ pos: pos.clone(), vel: v, tex: Tex.splat, color: col, size: R(0.06, 0.11) * r, size2: R(0.16, 0.26) * r, life: R(0.6, 1.0), g: 7, drag: 0.8, floor: groundAt(pos) + 0.01, op: 0.95, onLand: land });
      }
      // 飞溅：又细又快的血雾与血线，顺着受击方向甩出去
      if (state.gore >= 2) for (let i = 0; i < nn(Math.round(n * k * 0.7)); i++) {
        const v = new V3(R(-0.6, 0.6), R(0.6, 2.2) * spurt, R(-0.6, 0.6)).multiplyScalar(R(1.5, 3.4) * r);
        if (dir) v.addScaledVector(dir, R(1.5, 3.8) * r);
        spawn({ pos: pos.clone().add(new V3(R(-0.05, 0.05), R(0, 0.08), R(-0.05, 0.05))), vel: v, tex: Tex.splat, color: col, size: R(0.025, 0.05) * r, size2: R(0.01, 0.03) * r, life: R(0.35, 0.7), g: 9, drag: 0.4, floor: groundAt(pos) + 0.01, op: 0.9, onLand: i % 3 === 0 ? (lp => Marks.drop(lp)) : null });
      }
      if (state.gore >= 2) for (let i = 0; i < 3; i++) spawn({ pos: pos.clone(), vel: rv(0.3, 0.2, 0.3).addScaledVector(dir || new V3(), 0.4), tex: Tex.puff, color: col, size: 0.12 * r, size2: 0.4 * r, life: 0.5, op: 0.45, drag: 3 });
      if (n >= 10) P.mist(pos, r, dir);
    },
    // 血雾：击杀时腾起一大团，慢慢散开、飘一小会儿才散尽
    mist(pos, r = 1, dir) {
      if (state.gore === 0) return;
      const now = Time.t;
      while (mistQ.length && mistQ[0] < now) mistQ.shift();
      const room = (LOW() ? 12 : 44) - mistQ.length;
      if (room <= 0) return;
      const red = state.gore >= 2, n = Math.min(room, LOW() ? 3 : state.gore >= 3 ? 8 : red ? 5 : 3);
      const cols = red ? [0x8a120a, 0x6a0a06, 0x9c2014] : [0x2a2826];
      for (let i = 0; i < n; i++) {
        const life = R(2.3, 4.2), v = rv(0.5, 0.12, 0.5).add(new V3(0, R(0.1, 0.45), 0));
        if (dir) v.addScaledVector(dir, R(0.4, 1.5));
        spawn({ pos: pos.clone().add(rv(0.14, 0.08, 0.14).multiplyScalar(r)).add(new V3(0, 0.12, 0)), vel: v.multiplyScalar(r), tex: i % 3 === 2 ? Tex.inkPuff : Tex.puff, color: cols[i % cols.length],
          size: R(0.22, 0.34) * r, size2: R(0.95, 1.6) * r, life, op: R(0.2, 0.34) * (state.gore >= 3 ? 1.25 : 1), drag: 2.4, fadeIn: 0.18, pow: 1.15, spin: R(-0.3, 0.3), delay: R(0, 0.12) });
        mistQ.push(now + life);
      }
      mistQ.sort((a, b) => a - b);
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
  // 辉光：一小团叠加发亮的柔光，只给炮口、炮弹、落点用，量很克制
  const glowTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.16, 'rgba(255,236,196,.5)'); gr.addColorStop(0.45, 'rgba(255,176,90,.15)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  function glow(pos, size = 1, dur = 0.4, op = 0.5, color = 0xffb46a, pow = 1.4) {
    if (LOW()) return null;
    return spawn({ pos: pos.clone(), tex: glowTex, add: true, color, size: size * 0.55, size2: size, life: dur, op, drag: 0, spin: 0, fadeIn: 0.03, pow, order: 6 });
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
  // 每种痕迹都备几张不同的图，落地时再随机大小、长宽比和朝向，免得满盘一个模子
  const many = (n, w, h, draw) => Array.from({ length: n }, (_, i) => canvasTex(w, h, (g, W, H) => draw(g, W, H, i)));
  const pick = a => (Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a);
  const MT = {
    // 焦土：射线多少、长短、偏心、主墨团大小、是否多团、是否烧空了心，每张都不一样
    scorch: many(6, 256, 256, (g, w, h, i) => {
      const c = w / 2, lim = w * 0.47;
      const rays = 14 + Math.floor(rnd() * 46), reach = 0.2 + rnd() * 0.24, off = (rnd() - 0.5) * 0.6, lean = rnd() * 6.28;
      for (let k = 0; k < rays; k++) {
        const a = rnd() * 6.28, bias = Math.max(0.35, 1 + off * Math.cos(a - lean) * 1.6);
        const L = Math.min(lim, w * (reach * 0.55 + rnd() * reach) * bias);
        g.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.3})`; g.lineWidth = 1.5 + rnd() * 6.5;
        g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * L, c + Math.sin(a) * L); g.stroke();
      }
      g.fillStyle = '#fff';
      const main = w * (0.16 + rnd() * 0.1);
      inkBlot(g, c, c, main, 1, 0.3 + rnd() * 0.35); inkBlot(g, c, c, main * 0.7, 1, 0.3);
      const blobs = i % 2 ? 2 + Math.floor(rnd() * 4) : Math.floor(rnd() * 2);
      for (let k = 0; k < blobs; k++) {
        const a = lean + (rnd() - 0.5) * 2.4, rr = main * (0.3 + rnd() * 0.45), d = Math.min(lim - rr * 1.1, main * (0.6 + rnd() * 0.9));
        inkBlot(g, c + Math.cos(a) * d, c + Math.sin(a) * d, rr, 0.95, 0.5);
      }
      const flecks = 16 + Math.floor(rnd() * 30);
      for (let k = 0; k < flecks; k++) { const a = rnd() * 6.28, d = w * (0.2 + rnd() * 0.25); inkBlot(g, c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + rnd() * 5, 0.8, 0.4); }
      if (i === 3 || i === 5) { g.globalCompositeOperation = 'destination-out'; inkBlot(g, c + (rnd() - 0.5) * 24, c + (rnd() - 0.5) * 24, main * (0.3 + rnd() * 0.2), 0.55, 0.5); }
    }),
    scorchRim: canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w * 0.48);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }),
    // 血泊：一大滩，边上连着几小滩，中间有没浸到的空白
    blood: many(4, 256, 256, (g, w, h, i) => {
      g.fillStyle = '#fff';
      const c = w / 2, main = w * (0.2 + rnd() * 0.08), ox = (rnd() - 0.5) * 30, oy = (rnd() - 0.5) * 30;
      inkBlot(g, c + ox, c + oy, main, 1, 0.35 + rnd() * 0.3);
      const side = 3 + Math.floor(rnd() * 6);
      for (let k = 0; k < side; k++) inkBlot(g, c + ox + (rnd() - 0.5) * w * 0.36, c + oy + (rnd() - 0.5) * w * 0.36, w * (0.05 + rnd() * 0.1), 1, 0.4);
      const dots = 14 + Math.floor(rnd() * 26);
      for (let k = 0; k < dots; k++) { const a = rnd() * 6.28, d = w * (0.24 + rnd() * 0.2); inkBlot(g, c + Math.cos(a) * d, c + Math.sin(a) * d, 1.5 + rnd() * 9, 0.9, 0.3); }
      if (i % 2 === 0) { g.strokeStyle = '#fff'; g.lineCap = 'round'; for (let k = 0; k < 4; k++) { const a = rnd() * 6.28, L = w * (0.3 + rnd() * 0.14); g.lineWidth = 2 + rnd() * 4; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(c + ox, c + oy); g.lineTo(c + Math.cos(a) * L, c + Math.sin(a) * L); g.stroke(); } g.globalAlpha = 1; }
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 12 + rnd() * 14; k++) { g.globalAlpha = 0.3; inkBlot(g, c + (rnd() - 0.5) * 70, c + (rnd() - 0.5) * 70, 4 + rnd() * 9, 1, 0.5); }
    }),
    drop: many(4, 64, 64, (g, w) => {
      g.fillStyle = '#fff'; const rr = 7 + rnd() * 7;
      inkBlot(g, w / 2, w / 2, rr, 1, 0.5);
      if (rnd() < 0.5) { g.beginPath(); g.ellipse(w / 2 + rr * 0.8, w / 2, rr * 1.1, rr * 0.35, 0, 0, 7); g.fill(); }
      for (let k = 0; k < 2 + rnd() * 6; k++) inkBlot(g, w / 2 + (rnd() - 0.5) * 42, w / 2 + (rnd() - 0.5) * 42, 1.5 + rnd() * 3.5, 1, 0.3);
    }),
    // 喷溅：左边一团，向右（+x）甩出一串由大到小的血滴和细痕
    bloodSpray: many(4, 256, 128, (g, w, h) => {
      const fan = 0.6 + rnd() * 0.9, head = 18 + rnd() * 12;
      g.fillStyle = '#fff'; inkBlot(g, 46, h / 2, head, 1, 0.55); inkBlot(g, 66 + rnd() * 10, h / 2 + (rnd() - 0.5) * 12, head * 0.6, 1, 0.5);
      const n = 22 + Math.floor(rnd() * 30);
      for (let k = 0; k < n; k++) { const t = rnd(), x = 60 + t * (w - 72), y = h / 2 + (rnd() - 0.5) * (14 + t * 70 * fan), r = Math.max(1.2, 9 * (1 - t) * (0.4 + rnd() * 0.8)); inkBlot(g, x, Math.max(6, Math.min(h - 6, y)), r, 1, 0.35); }
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      for (let k = 0; k < 4 + rnd() * 6; k++) { const y0 = h / 2 + (rnd() - 0.5) * 16, y1 = Math.max(8, Math.min(h - 8, y0 + (rnd() - 0.5) * 44 * fan)); g.lineWidth = 1.5 + rnd() * 3; g.beginPath(); g.moveTo(60, y0); g.quadraticCurveTo(120 + rnd() * 40, (y0 + y1) / 2, 150 + rnd() * 90, y1); g.stroke(); }
    }),
    // 一簇散落的血点
    bloodDrops: many(4, 128, 128, (g, w) => {
      g.fillStyle = '#fff'; const n = 10 + Math.floor(rnd() * 20), sp = 0.28 + rnd() * 0.16;
      for (let k = 0; k < n; k++) { const a = rnd() * 6.28, d = rnd() * w * sp; inkBlot(g, w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 1.5 + rnd() * 7 * (1 - d / (w * 0.5)), 1, 0.4); }
    }),
    // 迸溅：中间一小团，向四周炸出粗细不一的血刺，刺尖挂着血珠
    bloodBurst: many(4, 256, 256, (g, w) => {
      const c = w / 2, n = 12 + Math.floor(rnd() * 22), lean = rnd() * 6.28, off = rnd() * 0.5;
      g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round';
      for (let k = 0; k < n; k++) {
        const a = rnd() * 6.28, L = Math.min(w * 0.45, w * (0.14 + rnd() * 0.3) * (1 + off * Math.cos(a - lean)));
        const x = c + Math.cos(a) * L, y = c + Math.sin(a) * L, wd = 2 + rnd() * 7;
        g.beginPath(); g.moveTo(c + Math.cos(a + 1.57) * wd, c + Math.sin(a + 1.57) * wd); g.lineTo(x, y); g.lineTo(c - Math.cos(a + 1.57) * wd, c - Math.sin(a + 1.57) * wd); g.fill();
        if (rnd() < 0.7) inkBlot(g, x, y, 1.5 + rnd() * 5, 1, 0.3);
      }
      inkBlot(g, c, c, w * (0.08 + rnd() * 0.08), 1, 0.5);
      for (let k = 0; k < 20; k++) { const a = rnd() * 6.28, d = w * (0.1 + rnd() * 0.36); inkBlot(g, c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + rnd() * 3.5, 0.9, 0.3); }
    }),
    // 拖抹的长条血迹
    bloodSmear: many(3, 256, 96, (g, w, h) => {
      g.fillStyle = '#fff'; const wob = 2 + rnd() * 8, fat = 14 + rnd() * 10, fq = 0.03 + rnd() * 0.05;
      for (let x = 20; x < w - 20; x += 3) { const t = x / w, r = fat * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.75 + rnd() * 0.35); g.globalAlpha = 0.55 + rnd() * 0.45; g.beginPath(); g.ellipse(x, h / 2 + Math.sin(x * fq) * wob, 4, Math.max(2, r), 0, 0, 7); g.fill(); }
      g.globalAlpha = 1; for (let k = 0; k < 6 + rnd() * 10; k++) inkBlot(g, 20 + rnd() * (w - 40), h / 2 + (rnd() - 0.5) * 60, 1.5 + rnd() * 4, 1, 0.4);
    }),
    rut: canvasTex(256, 64, (g, w, h) => {
      for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.5})`; g.fillRect(x, h * 0.3 + (rnd() - 0.5) * 3, 2, h * 0.4 * (0.6 + rnd() * 0.5)); }
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(rnd() * w, h * 0.2 + rnd() * h * 0.6, 2 + rnd() * 3, 1 + rnd() * 2); }
    }),
    hoof: canvasTex(64, 64, (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(w / 2, w / 2 + 4, w * 0.28, Math.PI * 0.95, Math.PI * 2.05, true); g.stroke(); }),
    foot: canvasTex(64, 64, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 22, 1, 0.2); g.globalCompositeOperation = 'destination-out'; inkBlot(g, w / 2, w / 2, 14, 0.5, 0.2); }),
    streak: many(3, 512, 96, (g, w, h) => {
      g.fillStyle = '#fff'; const top = 0.1 + rnd() * 0.2, bot = 0.55 + rnd() * 0.25, end = 0.3 + rnd() * 0.4;
      g.beginPath(); g.moveTo(10, h / 2); g.quadraticCurveTo(w * (0.3 + rnd() * 0.3), h * top, w - 10, h * end); g.quadraticCurveTo(w * (0.35 + rnd() * 0.3), h * bot, 10, h / 2); g.fill();
      for (let k = 0; k < 24 + rnd() * 30; k++) inkBlot(g, 60 + rnd() * (w - 70), h * (0.25 + rnd() * 0.5), 1.5 + rnd() * 5, 0.9, 0.3);
    }),
    // 刀痕：交叉两刀 / 斜劈一刀 / 三道并排的爪痕 / 人字两刀
    cut: many(4, 256, 256, (g, w, h, i) => {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      const j = () => (rnd() - 0.5) * 36;
      const lines = i === 0 ? [[30, 40, 226, 216], [226, 40, 30, 216]]
        : i === 1 ? [[26, 70 + j(), 230, 186 + j()]]
        : i === 2 ? [[40, 60, 190, 200], [66, 46, 216, 186], [92, 36, 236, 166]]
        : [[128, 30, 40 + j(), 220], [128, 30, 216 + j(), 220]];
      for (const [a, b, c2, d] of lines) {
        const mx = (a + c2) / 2 + j() * 0.6, my = (b + d) / 2 + j() * 0.6;
        for (let k = 0; k < 3; k++) { g.globalAlpha = 0.5 + k * 0.2; g.lineWidth = (7 - k * 2) * (0.8 + rnd() * 0.5); g.beginPath(); g.moveTo(a + k * 2, b); g.quadraticCurveTo(mx, my, c2 - k * 2, d); g.stroke(); }
        g.globalAlpha = 0.8; g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { const t = rnd(); inkBlot(g, a + (c2 - a) * t + j() * 0.3, b + (d - b) * t + j() * 0.3, 1 + rnd() * 2.5, 1, 0.3); }
      }
    }),
    // 裂纹：主裂几条、长短、有没有环状的碎裂圈，各不相同
    crack: many(5, 512, 512, (g, w, h, i) => {
      g.strokeStyle = '#fff'; g.lineCap = 'round';
      const branch = (x, y, a, L, wd, depth) => {
        if (depth > 4 || L < 8) return;
        let cx = x, cy = y; g.lineWidth = wd; g.beginPath(); g.moveTo(cx, cy);
        for (let k = 0; k < 6; k++) { a += (rnd() - 0.5) * 0.7; cx += Math.cos(a) * L / 6; cy += Math.sin(a) * L / 6; g.lineTo(cx, cy); }
        g.stroke(); branch(cx, cy, a + 0.3 + rnd() * 0.4, L * 0.6, wd * 0.6, depth + 1); if (rnd() < 0.7) branch(cx, cy, a - 0.4 - rnd() * 0.4, L * 0.5, wd * 0.55, depth + 1);
      };
      const n = 4 + Math.floor(rnd() * 6), a0 = rnd() * 6.28, long = Math.floor(rnd() * n);
      for (let k = 0; k < n; k++) branch(w / 2, w / 2, a0 + (k / n) * 6.28 + rnd() * 0.5, (k === long ? 120 : 60) + rnd() * 70, 7 + rnd() * 6, 0);
      if (i % 2) for (let k = 0; k < 5 + rnd() * 5; k++) { const rr = w * (0.1 + rnd() * 0.24), a = rnd() * 6.28; g.lineWidth = 2 + rnd() * 4; g.globalAlpha = 0.6 + rnd() * 0.4; g.beginPath(); g.arc(w / 2 + (rnd() - 0.5) * 16, w / 2 + (rnd() - 0.5) * 16, rr, a, a + 0.4 + rnd() * 0.9); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 14 + rnd() * 22, 1, 0.5);
      for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, d = 30 + rnd() * 150; inkBlot(g, w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 1.5 + rnd() * 4, 0.9, 0.3); }
    }),
    hole: canvasTex(64, 64, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 7, 1, 0.3); }),
    drag: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#fff'; for (let x = 0; x < w; x += 3) { g.globalAlpha = 0.2 + 0.6 * (1 - x / w); inkBlot(g, x, h / 2 + (rnd() - 0.5) * 8, 6 + rnd() * 6 * (1 - x / w), 1, 0.4); } }),
  };
  // 永久图层（覆盖棋盘面）
  const BX = 4.75, BZ = Board.BZ;
  const LAY_W = 1024, LAY_H = Math.round(1024 * (2 * BZ) / (2 * BX));
  const layerCanvas = document.createElement('canvas'); layerCanvas.width = LAY_W; layerCanvas.height = LAY_H;
  const lg = layerCanvas.getContext('2d', { willReadFrequently: true });
  const layerTex = new THREE.CanvasTexture(layerCanvas); layerTex.colorSpace = THREE.SRGBColorSpace;
  const layerGeo = new THREE.PlaneGeometry(2 * BX, 2 * BZ); layerGeo.rotateX(-Math.PI / 2);
  const layer = new THREE.Mesh(layerGeo, new THREE.MeshBasicMaterial({ map: layerTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  layer.position.y = TOP + 0.0008; layer.renderOrder = 1;
  scene.add(layer);
  let layerDirty = false;
  // 烙进图层：每层痕迹留 30%，重叠处的浓度是相加的（30% + 30% + …，封顶 MARK_CAP），
  // 而且叠得越多颜色越往焦黑里沉 —— 反复厮杀的地方会越打越黑，所有痕迹都留着
  const MARK_CAP = 0.9;
  const scratch = document.createElement('canvas'); scratch.width = scratch.height = 64;
  const sg = scratch.getContext('2d', { willReadFrequently: true });
  function bake(r) {
    const { x, z } = r.m.position;
    const ppu = LAY_W / (2 * BX);
    const cx = (x + BX) / (2 * BX) * LAY_W, cy = (z + BZ) / (2 * BZ) * LAY_H;
    const w = r.sx * ppu, h = r.sz * ppu, rot = -r.m.rotation.y;
    const co = Math.abs(Math.cos(rot)), si = Math.abs(Math.sin(rot));
    const bw = Math.ceil(w * co + h * si) + 2, bh = Math.ceil(w * si + h * co) + 2;
    const x0 = Math.max(0, Math.floor(cx - bw / 2)), y0 = Math.max(0, Math.floor(cy - bh / 2));
    const W = Math.min(LAY_W, Math.ceil(cx + bw / 2)) - x0, H = Math.min(LAY_H, Math.ceil(cy + bh / 2)) - y0;
    if (W <= 0 || H <= 0) return;
    if (scratch.width < W) scratch.width = W;
    if (scratch.height < H) scratch.height = H;
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, H);
    sg.translate(cx - x0, cy - y0); sg.rotate(rot);
    sg.drawImage(r.tex.image, -w / 2, -h / 2, w, h);
    const src = sg.getImageData(0, 0, W, H).data, dst = lg.getImageData(x0, y0, W, H), d = dst.data;
    const cr = (r.color >> 16) & 255, cg = (r.color >> 8) & 255, cb = r.color & 255, k = r.op * 0.3 / 255;
    for (let i = 0; i < d.length; i += 4) {
      const as = src[i + 3] * k;
      if (as < 0.004) continue;
      const ad = d[i + 3] / 255, sum = ad + as;
      const dark = 1 - 0.5 * ad * Math.min(1, as / 0.2);      // 底下已经有多浓，这一层就把颜色压多暗
      d[i] = (d[i] * ad + cr * as) / sum * dark;
      d[i + 1] = (d[i + 1] * ad + cg * as) / sum * dark;
      d[i + 2] = (d[i + 2] * ad + cb * as) / sum * dark;
      d[i + 3] = Math.min(MARK_CAP, sum) * 255;
    }
    lg.putImageData(dst, x0, y0);
    layerDirty = true;
  }
  const marks = [];
  const markGeo = new THREE.PlaneGeometry(1, 1); markGeo.rotateX(-Math.PI / 2);
  let markSeq = 0;
  const onBoard = p => Math.abs(p.x) < BX - 0.02 && Math.abs(p.z) > Board.HALF + 0.02 && Math.abs(p.z) < BZ - 0.02;
  function mark(tex, color, pos, sx, sz = sx, rot = 0, { op = 0.85, grow = 0.2, hold = 10, fade = 45 } = {}) {
    if (!onBoard(pos)) return null;
    tex = pick(tex);
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
    for (const b of bits) { try { Core.disposeTree(b.o); } catch (e) { } } bits.length = 0;
  }
  // 血迹颜色：新鲜的朱红到半干的暗褐，随机一些
  const BLOOD_PAL = [0x7c0e08, 0x6a0a06, 0x8e1a10, 0x5a0805, 0x741208];
  const BLOOD = () => (state.gore >= 2 ? BLOOD_PAL[Math.floor(rnd() * BLOOD_PAL.length)] : bloodCol());
  const Marks = {
    // 焦土：大小、长宽、朝向都随机，四周再崩出几点焦屑
    scorch(p, s = 1.6) {
      s *= R(0.75, 1.3);
      const ax = R(0.8, 1.22), az = R(0.8, 1.22), rot = rnd() * 6.28;
      mark(MT.scorch, rnd() < 0.5 ? 0x16110e : 0x1e1612, p, s * ax, s * az, rot, { op: R(0.84, 0.95), hold: 20 });
      mark(MT.scorchRim, 0x4a2a14, p, s * 1.5 * ax, s * 1.5 * az, rot, { op: R(0.45, 0.65), hold: 20 });
      const n = LOW() ? 2 : 3 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = s * R(0.42, 0.85); mark(MT.drop, 0x1a1410, p.clone().add(new V3(Math.cos(a) * d, 0, Math.sin(a) * d)), s * R(0.05, 0.16), undefined, rnd() * 6, { op: R(0.6, 0.85), grow: 0.05, hold: 14 }); }
    },
    // 血迹：随机挑形状（血泊 / 喷溅 / 迸溅 / 血点簇 / 拖痕），常常两种叠着来，方向跟着受击方向；再往外甩出一串大小不一的血滴
    blood(p, s = 1.0, dir) {
      if (state.gore === 0) return;
      s *= (state.gore >= 3 ? 1.55 : state.gore === 2 ? 1.15 : 1) * R(0.75, 1.3);
      const d = dir && dir.lengthSq() > 1e-6 ? dir.clone().setY(0).normalize() : null;
      const ang = d ? Math.atan2(-d.z, d.x) : rnd() * 6.28;
      const base = p.clone(), fwd = d || new V3(Math.cos(ang), 0, -Math.sin(ang));
      const shape = k => {
        const rot = ang + R(-0.4, 0.4), q = base.clone().add(new V3(R(-0.12, 0.12) * s, 0, R(-0.12, 0.12) * s));
        if (k === 0) mark(MT.bloodSpray, BLOOD(), q.addScaledVector(fwd, 0.3 * s), s * R(1.4, 1.9), s * R(0.6, 1.0), rot, { op: 0.9, grow: 0.45 });
        else if (k === 1) mark(MT.blood, BLOOD(), q.addScaledVector(fwd, 0.12), s * R(0.85, 1.15), s * R(0.65, 1.2), rnd() * 6.28, { op: 0.9, grow: 1.2 });
        else if (k === 2) mark(MT.bloodBurst, BLOOD(), q, s * R(0.9, 1.3), s * R(0.8, 1.25), rnd() * 6.28, { op: 0.9, grow: 0.12 });
        else if (k === 3) mark(MT.bloodDrops, BLOOD(), q, s * R(0.7, 1.05), s * R(0.6, 1.1), rnd() * 6.28, { op: 0.88, grow: 0.2 });
        else mark(MT.bloodSmear, BLOOD(), q.addScaledVector(fwd, 0.35 * s), s * R(1.2, 1.7), s * R(0.38, 0.6), rot, { op: 0.85, grow: 0.7 });
      };
      const roll = rnd();
      const first = d ? (roll < 0.45 ? 0 : roll < 0.62 ? 1 : roll < 0.8 ? 2 : roll < 0.9 ? 3 : 4) : (roll < 0.4 ? 1 : roll < 0.75 ? 2 : roll < 0.9 ? 3 : 4);
      shape(first);
      if (state.gore >= 2 && rnd() < (state.gore >= 3 ? 0.85 : 0.5)) { let k2 = Math.floor(rnd() * 5); if (k2 === first) k2 = (k2 + 1) % 5; if (!d && k2 === 0) k2 = 2; shape(k2); }
      if (state.gore >= 2) {
        const n = LOW() ? 3 : state.gore >= 3 ? 7 + Math.floor(rnd() * 10) : 3 + Math.floor(rnd() * 5);
        for (let i = 0; i < n; i++) {
          const a = d ? Math.atan2(d.z, d.x) + R(-0.75, 0.75) : rnd() * 6.28, dist = R(0.2, 1.25) * s;
          const q = base.clone().add(new V3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
          const sz = R(0.03, 0.12) * (1.3 - dist / (1.3 * s));
          mark(MT.drop, BLOOD(), q, sz * R(0.8, 1.5), sz, -a, { op: 0.85, grow: 0.05, hold: 8 });
        }
      }
    },
    drop(p) { if (state.gore < 2) return; mark(MT.drop, BLOOD(), p, R(0.05, 0.12), undefined, rnd() * 6, { op: 0.85, grow: 0.05, hold: 6 }); },
    dragTrail(p, d, len = 0.6) { if (state.gore < 3) return; mark(MT.drag, BLOOD(), p.clone().addScaledVector(d, len / 2), len, len * 0.2, Math.atan2(-d.z, d.x) + Math.PI, { op: 0.8, grow: 0.6 }); },
    ruts(p, d, side) { const rot = Math.atan2(-d.z, d.x); for (const s of [1, -1]) mark(MT.rut, 0x2e2419, p.clone().addScaledVector(side, s * 0.2), 0.34, 0.07, rot, { op: 0.75, grow: 0, hold: 6 }); },
    hoof(p, d) { mark(MT.hoof, 0x2e2419, p, 0.09, 0.09, Math.atan2(-d.z, d.x) - Math.PI / 2, { op: 0.8, grow: 0, hold: 5 }); },
    foot(p) { mark(MT.foot, 0x2e2419, p, 0.2, 0.2, rnd() * 6, { op: 0.7, grow: 0, hold: 6 }); },
    streak(p, d, len = 1.5) { if (state.gore === 0) return; len *= R(0.8, 1.25); mark(MT.streak, BLOOD(), p, len, len * R(0.14, 0.24), Math.atan2(-d.z, d.x) + R(-0.3, 0.3), { op: 0.9, grow: 0.15 }); },
    cut(p, d) { const s = R(0.62, 1.08); mark(MT.cut, 0x1c1714, p, s, s * R(0.8, 1.2), Math.atan2(-d.z, d.x) + R(-0.5, 0.5) + (rnd() < 0.5 ? Math.PI : 0), { op: R(0.75, 0.9), grow: 0.12 }); },
    crack(p, s = 2.4) { s *= R(0.75, 1.3); mark(MT.crack, 0x16110e, p, s * R(0.82, 1.2), s * R(0.82, 1.2), rnd() * 6.28, { op: R(0.8, 0.94), grow: 0.25, hold: 16 }); },
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
        // 碎片留存（设置里选）：落定的碎片先留在场上，过了设定的回合数（或者场上碎片太多）才开始淡出
        if (state.keep && b.keep && b.rest && !b.fading) {
          const over = bits.length > (LOW() ? 110 : 320) && i < bits.length - (LOW() ? 110 : 320);
          if (!over && state.ply - b.ply0 < state.keep * 2 && state.ply >= b.ply0) continue;
          b.fading = true; b.life = b.age;
        }
        const k = Math.min(1, (b.age - b.life) / (b.fading ? 2.5 : 0.6));
        b.o.scale.setScalar(b.s * (1 - k));
        if (k >= 1) { if (b.ink) P.ink(b.o.position, 3, 0.2, 0.2, 0.6); Core.disposeTree(b.o); bits.splice(i, 1); }
      }
    }
  });
  function throwObj(o, v, opts = {}) {
    if (!o.parent) scene.add(o);
    // 带血的断肢残骸：落地处留一摊血
    const onLand = opts.onLand || (opts.bleed ? p => Marks.blood(p, R(0.25, 0.45)) : null);
    bits.push({ o, v: v.clone(), w: opts.w || rv(10, 10, 10), age: 0, life: opts.life ?? 2.2, s: o.scale.x, floor: opts.floor, fire: opts.fire || 0, bleed: opts.bleed || 0, g: opts.g, onLand, ink: opts.ink !== false, ply0: state.ply, keep: opts.keep !== false });
  }
  const chunkGeos = [new THREE.BoxGeometry(0.16, 0.14, 0.12), new THREE.TetrahedronGeometry(0.11), new THREE.BoxGeometry(0.22, 0.1, 0.09), new THREE.DodecahedronGeometry(0.07)];
  chunkGeos.forEach(g => { g.userData.keep = true; });
  const charredWood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
  const plankGeo = new THREE.BoxGeometry(0.5, 0.05, 0.1); plankGeo.userData.keep = true;
  // opts.of：被打碎的那枚子（兵法里升过级的子碎成银、金、玉块，而不是木块）
  function chunks(c, dir, power, n = 12, opts = {}) {
    const body = opts.of && opts.of.children && opts.of.children[0], skin = body && body.material !== Board.pieceWood ? body.material : null;
    for (let i = 0; i < nn(n); i++) {
      const o = new THREE.Mesh(opts.planks ? plankGeo : chunkGeos[i % 4], opts.mat || skin || (opts.burnt && i % 2 ? charredWood : Board.pieceWood));
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
      chunks(cc, d, t === 'c' ? 1.4 : 0.8, 10, { burnt: t === 'c', of: tgt });
      flyFace(tgt, cc, d, 0.8, t === 'c');
      P.ink(cc, 10, 0.5, 0.3);
      if (t !== 'c') P.blood(cc, 10, 0.7, d);
      else { P.fire(cc, 14, 0.5); flash(cc, 30, 0.4); glow(cc, 1.8, 0.4, 0.4); }
    }
    resultAt(t, B, d, side);
    m.position.copy(B);
  }
  // 低特效档·兵法：攻击未下（扑上去再弹回）、拒马反伤、远射
  async function lowStrike(c) {
    const { A, B, d, m, tgt, info } = c;
    const su = Sfx.unit(unitKey(info.piece.t, c.s));
    if (c.ranged) {
      su.release && su.release(); Sfx.B.arrows(0, 10);
      for (let i = 0; i < 10; i++) spawn({ pos: A.clone().setY(TOP + 0.3), vel: B.clone().sub(A).multiplyScalar(R(2.6, 3.2)).add(rv(0.3, 1.2, 0.3)), color: 0x3a2a1a, size: 0.05, size2: 0.02, life: 0.35, g: 4 });
      await sleep(0.32);
      Sfx.B.thunks(0, 6); P.ink(B.clone().setY(TOP + 0.15), 8, 0.4, 0.3);
      if (tgt && !c.survive) { const cc = tgt.position.clone(); removePiece(tgt); chunks(cc, d, 0.6, 8, { of: tgt }); flyFace(tgt, cc, d, 0.6, false); P.blood(cc, 10, 0.7, d); }
      else if (tgt) { P.blood(B.clone().setY(TOP + 0.2), 8, 0.5, d); await tween(0.25, k => { tgt.position.copy(B).addScaledVector(d, Math.sin(k * Math.PI) * 0.12); }); }
      return;
    }
    Sfx.lift();
    const mid = A.clone().lerp(B, 0.62);
    await tween(0.3, k => { m.position.lerpVectors(A, mid, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.35; }, ease.in);
    Sfx.place(); Cam.shake(0.08); su.impact && su.impact();
    if (c.counter) { Sfx.B.stab(0, 0.5); P.blood(m.position.clone().setY(TOP + 0.2), 10, 0.6, d.clone().negate()); P.wood(mid, 6, d.clone().negate(), 0.5); }
    if (c.counter === 'die') { const cc = m.position.clone(); chunks(cc, d.clone().negate(), 0.7, 8, { of: m }); flyFace(m, cc, d.clone().negate(), 0.6, false); m.visible = false; return; }
    if (c.survive) {
      if (tgt) { P.blood(B.clone().setY(TOP + 0.2), 10, 0.6, d); P.sparks(B.clone().setY(TOP + 0.25), 8); await tween(0.2, k => { tgt.position.copy(B).addScaledVector(d, Math.sin(k * Math.PI) * 0.12); }); }
      if (c.onImpact) await c.onImpact({});
      await tween(0.32, k => { m.position.lerpVectors(mid, A, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.2; }, ease.out);
      Sfx.place();
      return;
    }
    // 拒马之后余血吃下
    await tween(0.2, k => { m.position.lerpVectors(mid, B, k); });
    if (tgt && tgt.parent) { const cc = tgt.position.clone(); removePiece(tgt); chunks(cc, d, 0.8, 10, { of: tgt }); flyFace(tgt, cc, d, 0.8, false); P.blood(cc, 10, 0.7, d); }
  }
  async function lowMove(c) {
    const { A, B, m, info } = c;
    const t = info.piece.t;
    const A0 = m.position.clone();
    const su = Sfx.unit(unitKey(t, c.s)); su.move && su.move(0.6);
    if (c.mt === 'n') {
      // 马：一跃沿对角线直接到位（不再分“直一步、斜一步”两段）
      await tween(0.42, k => { m.position.lerpVectors(A0, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.34; }, ease.inOut);
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
  // 绝杀 / 困毙：近乎满屏的行书大字，一字一顿砸下来，下面盖一方朱印写杀法（重炮、马后炮……）
  // 绝杀大字：只写「绝杀」；下出了有名有姓的杀法（马后炮、卧槽马、重炮…）就只写那几个字。
  // 朱砂手书：每个字单独画在画布上（行书字体 + 飞白 + 浓淡），背后一笔浓墨横扫并带泼溅，朱与墨再慢慢晕开
  const MATE_NAMED = new Set(['重炮', '马后炮', '天地炮', '闷宫', '卧槽马', '挂角马', '双马饮泉', '八角马', '钓鱼马', '铁门栓', '双车错', '大刀剜心', '二鬼拍门', '白脸将']);
  const MATE_UP = 0.028;
  function mateInk(el, portrait, px, rows) {
    const W = Math.min(1400, innerWidth), H = Math.round(W * innerHeight / innerWidth), u = Math.min(W, H);
    const [wash, stroke] = [el.querySelector('.ink.wash'), el.querySelector('.ink.stroke')];
    for (const c of [wash, stroke]) { c.width = W; c.height = H; }
    // 浓墨一笔：压在字的下半截，从左往右上横扫，起笔重、笔肚实、收笔拉出飞白
    const g = stroke.getContext('2d'), sc = W / innerWidth;
    // 黑笔垫在整行字的正中当底色：横排横着扫，竖排竖着从上往下扫；整体比屏幕正中略高一点（视觉居中）
    const ang = (portrait ? Math.PI / 2 - 0.05 : -0.05) + R(-0.025, 0.025), L = Math.min((portrait ? H : W) * 0.99, rows * px * sc * 1.3), th = px * sc * R(0.5, 0.58);
    const cy = H * (0.5 - MATE_UP);
    g.save(); g.translate(W / 2, cy); g.rotate(ang);
    const prof = k => (k < 0.07 ? Math.pow(k / 0.07, 0.6) : k < 0.72 ? 1 : 1 - 0.62 * Math.pow((k - 0.72) / 0.28, 1.3));
    const N = 90, top = [], bot = [];
    for (let i = 0; i <= N; i++) { const k = i / N, x = -L / 2 + k * L * 0.9, h = th / 2 * prof(k); top.push([x, -h * (1 + R(-0.07, 0.07)) + Math.sin(k * 5) * th * 0.05]); bot.push([x, h * (1 + R(-0.09, 0.09)) + Math.sin(k * 5) * th * 0.05]); }
    g.fillStyle = 'rgba(15,12,11,.94)'; g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); bot.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill();
    // 收笔的笔丝：越往外越稀
    g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const y = R(-0.5, 0.5) * th * 0.5, x0 = L * R(0.2, 0.4), x1 = x0 + L * R(0.04, 0.2);
      g.strokeStyle = `rgba(15,12,11,${R(0.4, 0.9)})`; g.lineWidth = R(0.8, 3) * u / 700;
      g.beginPath(); g.moveTo(x0, y + Math.sin(0.9 * 5) * th * 0.05); g.lineTo(x1, y * 1.15 + Math.sin(0.95 * 5) * th * 0.05); g.stroke();
    }
    // 起笔处的墨团
    g.fillStyle = 'rgba(14,11,10,.92)'; inkBlot(g, -L / 2 + th * 0.35, 0, th * 0.62, 0.95, 0.5);
    // 飞白：笔肚后半段被干笔带出的白丝
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 110; i++) {
      const k0 = 1 - Math.pow(Math.random(), 1.7) * 0.8, x0 = -L / 2 + k0 * L * 0.9, len = L * R(0.05, 0.3), y = R(-0.5, 0.5) * th * prof(k0) * 0.96;
      g.strokeStyle = `rgba(0,0,0,${R(0.45, 1)})`; g.lineWidth = R(0.6, 3.2) * u / 700;
      g.beginPath(); g.moveTo(x0, y + Math.sin(k0 * 5) * th * 0.05); g.lineTo(x0 + len, y * 0.9 + Math.sin((k0 + len / L) * 5) * th * 0.05); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    // 泼溅：顺着笔势甩出去的墨点，近大远小
    for (let i = 0; i < 46; i++) {
      const k = Math.pow(Math.random(), 0.7), x = -L / 2 + k * L * 1.05, y = (Math.random() < 0.5 ? -1 : 1) * th * R(0.6, 1.9) * (0.5 + k * 0.7);
      g.fillStyle = `rgba(16,12,10,${R(0.55, 0.92)})`; inkBlot(g, x, y, u * R(0.003, 0.018) * (1.2 - k * 0.6), 1, 0.5);
    }
    g.restore();
    // 晕染：墨沿着笔画往纸里洇开的淡墨，再点几处朱砂的洇痕
    const w = wash.getContext('2d');
    w.save(); w.translate(W / 2, cy); w.rotate(ang);
    for (let i = 0; i < 26; i++) {
      const x = R(-0.5, 0.42) * L, y = R(-0.9, 0.9) * th, r = Math.max(th, u * 0.08) * R(0.5, 1.1);
      const gr = w.createRadialGradient(x, y, 0, x, y, r);
      const a = R(0.1, 0.24); gr.addColorStop(0, `rgba(24,20,18,${a})`); gr.addColorStop(0.6, `rgba(30,26,24,${a * 0.45})`); gr.addColorStop(1, 'rgba(30,26,24,0)');
      w.fillStyle = gr; w.beginPath(); w.ellipse(x, y, r * R(1, 1.8), r * R(0.5, 0.9), R(-0.3, 0.3), 0, 7); w.fill();
    }
    w.restore();
    for (let i = 0; i < 9; i++) {
      const x = W * R(0.12, 0.88), y = H * R(0.2, 0.8), r = u * R(0.05, 0.14);
      const gr = w.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(170,20,10,${R(0.1, 0.2)})`); gr.addColorStop(1, 'rgba(170,20,10,0)');
      w.fillStyle = gr; w.beginPath(); w.arc(x, y, r, 0, 7); w.fill();
    }
    for (let i = 0; i < 30; i++) { w.fillStyle = `rgba(168,18,10,${R(0.5, 0.9)})`; inkBlot(w, W * R(0.06, 0.94), H * R(0.1, 0.9), u * R(0.002, 0.012), 1, 0.5); }
  }
  function mateChar(ch, px) {
    const S = Math.min(820, Math.round(px * Math.min(2, devicePixelRatio || 1)));
    const draw = () => {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      g.font = `${Math.round(S * 0.86)}px "XK", ${Board.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#c4170c'; g.fillText(ch, S / 2, S * 0.53);
      // 浓淡：蘸饱了的地方朱砂发沉，带干了的地方发亮
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 14; i++) { const x = R(0.15, 0.85) * S, y = R(0.15, 0.85) * S, r = R(0.08, 0.22) * S; const gr = g.createRadialGradient(x, y, 0, x, y, r); const dark = Math.random() < 0.6; gr.addColorStop(0, dark ? `rgba(110,8,4,${R(0.3, 0.6)})` : `rgba(214,48,30,${R(0.25, 0.5)})`); gr.addColorStop(1, 'rgba(150,12,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
      // 飞白：顺着运笔方向的几束干笔丝
      g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const cx = R(0.2, 0.8) * S, cy = R(0.2, 0.8) * S, a = -0.5 + R(-0.5, 0.5), len = R(0.18, 0.42) * S, wd = R(0.03, 0.09) * S, n = 5 + Math.floor(Math.random() * 9);
        for (let i = 0; i < n; i++) {
          const o = R(-0.5, 0.5) * wd, l = len * R(0.5, 1);
          g.strokeStyle = `rgba(0,0,0,${R(0.35, 0.85)})`; g.lineWidth = R(0.6, 2.2) * S / 500;
          g.beginPath(); g.moveTo(cx - Math.cos(a) * l / 2 - Math.sin(a) * o, cy - Math.sin(a) * l / 2 + Math.cos(a) * o); g.lineTo(cx + Math.cos(a) * l / 2 - Math.sin(a) * o, cy + Math.sin(a) * l / 2 + Math.cos(a) * o); g.stroke();
        }
      }
      return c;
    };
    const tx = draw(); tx.className = 'tx';
    const bl = document.createElement('canvas'); bl.width = bl.height = Math.round(S / 3); bl.className = 'bl';
    const bg = bl.getContext('2d'); bg.drawImage(tx, 0, 0, bl.width, bl.height);
    const el = document.createElement('span'); el.className = 'ch'; el.style.width = el.style.height = px + 'px'; el.style.setProperty('--bl', Math.max(5, px * 0.035) + 'px');
    el.append(bl, tx);
    return el;
  }
  // 行书字体要先载入，画布上才写得出来（开局横幅没出过的话它还没被用到）
  const xkReady = t => { try { return Promise.race([document.fonts.load('64px "XK"', t), new Promise(r => setTimeout(r, 600))]); } catch (e) { return Promise.resolve(); } };
  setTimeout(() => xkReady('绝杀困毙'), 1500);
  async function mateSplash(text, sideInCheck) {
    await xkReady(text);
    const el = document.getElementById('mate'), mw = el.querySelector('.mw');
    const n = text.length, portrait = innerHeight > innerWidth * 1.1;
    const px = Math.round(portrait ? Math.min(innerWidth * [0, 0.84, 0.84, 0.74, 0.62][n], innerHeight * 0.82 / n) : Math.min(innerWidth * 0.96 / n, innerHeight * [0, 0.72, 0.72, 0.62, 0.52][n]));
    const T0 = 0.44, step = n > 2 ? 0.2 : 0.3;   // 黑笔先扫完，红字再一个一个砸下来
    el.classList.remove('show');
    mw.textContent = ''; mw.classList.toggle('col', portrait); el.classList.toggle('col', portrait);
    mw.style.transform = `translateY(${-MATE_UP * 100}vh)`;
    [...text].forEach((ch, i) => {
      const c = mateChar(ch, px); const r = (i % 2 ? 1 : -1) * R(2, 5);
      c.style.setProperty('--r0', -r * 2.5 + 'deg'); c.style.setProperty('--r1', r * 0.6 + 'deg');
      c.style.animationDelay = (T0 + i * step).toFixed(2) + 's';
      c.querySelector('.bl').style.animationDelay = (T0 + 0.14 + i * step).toFixed(2) + 's';
      if (portrait) c.style.margin = `${-px * 0.07}px 0`;
      mw.append(c);
    });
    mateInk(el, portrait, px, n);
    void el.offsetWidth; el.classList.add('show');
    clearTimeout(mateSplash.t); mateSplash.t = setTimeout(() => el.classList.remove('show'), 4000);
    // 鼓点：一笔扫过一声，之后一字一记，最后一字加锣
    Sfx.B.taiko(0.02, 0.7, 0.9);
    for (let i = 0; i < n; i++) Sfx.B.taiko(T0 + i * step, i === n - 1 ? 1 : 0.9, i === n - 1 ? 0.7 : 0.85);
    Sfx.B.gong(T0 + 0.02 + (n - 1) * step, 0.9); Sfx.B.clang(T0 + 0.02 + (n - 1) * step, 0.5);
    const k = [...Board.pieces.values()].find(x => x.userData.t === 'k' && x.userData.s === sideInCheck), kp = k ? k.position.clone() : new V3();
    setTimeout(() => { Cam.shake(0.16); if (k) P.ink(kp.clone().setY(TOP + 0.2), 8, 0.6, 0.35, 0.8); }, T0 * 1000);
    setTimeout(() => { Cam.shake(0.34); flash(kp, 40, 0.5, 0.5); if (k) { ring(kp, 3.2, 1.1, 0xb0301f, 0.95); P.ink(kp.clone().setY(TOP + 0.2), 16, 0.8, 0.45, 0.9); } }, (T0 + 0.02 + (n - 1) * step) * 1000);
  }
  function checkStamp(sideInCheck, text, mateName) {
    if (text === '斬') { mateSplash(sideInCheck === 'b' ? '斩将' : '斩帅', sideInCheck); return; }   // 决战里主帅被斩
    if (text === '殺' || text === '困') { mateSplash(text === '困' ? '困毙' : MATE_NAMED.has(mateName) ? mateName : '绝杀', sideInCheck); return; }
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
      const cm = Board.makePiece(h.cap); if (!Board.lastGame || !Board.lastGame.bf) Board.dress(cm, h.cap);
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

  // ---------- 兵种台词 ----------
  let lastBark = '';
  function bark(info, c) {
    if (typeof Voice === 'undefined' || !Voice.enabled) return;
    const p = info.piece, kill = !!c.tgt;
    if (!kill && Math.random() > 0.55) return;
    const base = `u_${p.s}_${p.t}_${kill ? 'k' : 'm'}`;
    let id = `${base}${Math.random() < 0.5 ? 1 : 2}`;
    if (id === lastBark) id = `${base}${id.endsWith('1') ? 2 : 1}`;
    if (!Voice.has(id)) return;
    lastBark = id;
    const pan = Math.max(-0.7, Math.min(0.7, c.A.x / 6)) * (Board.viewSide === 'b' ? -1 : 1);
    sleep(kill ? 0.35 : 0.1).then(() => Voice.bark(id, { vol: kill ? 1 : 0.8, pan, skipIfBusy: !kill }));
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
    if (opts.c) Object.assign(c, opts.c); // 兵法：survive（攻击未下）、counter（拒马反伤）、ranged（远射不动）、lv/dlv（等级换装）
    if (!c.m) return;
    const y0 = c.m.position.y;
    Board.clearMoves(true);
    if (opts.instant) { if (c.tgt) removePiece(c.tgt); if (info.reveal) Board.setFace(c.m, info.piece); c.m.position.copy(c.B); return; }
    try {
      // 揭棋：暗子先翻开，再由真身出阵
      if (info.reveal) { c.m.position.y = y0; await reveal(c.m, info.piece); }
      // 兵种台词：击杀在冲锋那一刻喊，移动时约一半的步数说一句
      bark(info, c);
      if (state.level === 'low') {
        if (c.tgt && (c.survive || c.counter || c.ranged)) await lowStrike(c);
        else if (c.tgt) await lowCapture(c);
        else if (info.crossesRiver) await Squads.pieceBoat(c);
        else await lowMove(c);
      } else if (c.tgt) await Squads.capture(c);
      else await Squads.move(c);
      if (typeof Camp !== 'undefined') {
        if (c.counter === 'die') Camp.onCapture(XQ.other(info.mover), 1);
        else if (c.tgt && !c.survive && !opts.noCamp) Camp.onCapture(info.mover, info.streak || 1);
      }
    } catch (e) {
      console.error('动画出错', e);
    }
    Time.scale = 1;
    const stay = c.survive || (c.ranged && !c.killed); // 远射：攻方不动；目标没死就留在原地
    if (c.tgt && c.tgt.parent === Board.piecesRoot && !stay) removePiece(c.tgt);
    if (c.tgt && stay) { c.tgt.visible = true; c.tgt.scale.set(1, 1, 1); c.tgt.position.copy(c.B); }
    if (c.counter === 'die') { removePiece(c.m); cineOff(); if (Cam.cine) await Cam.home(0.8); return; }
    c.m.visible = true; c.m.scale.set(1, 1, 1); c.m.position.copy(stay || c.ranged ? c.A : c.B);
    c.m.rotation.set(0, Board.viewSide === 'b' ? Math.PI : 0, 0);
    if (Cam.cine && !info.result) { cineOff(); await Cam.home(0.8); }
    cineOff();
    if (info.result) { checkStamp(XQ.other(info.mover), info.result.reason === 'checkmate' ? '殺' : info.result.reason === 'kingdead' ? '斬' : '困', info.mateName); }
    else if (info.check) { checkStamp(XQ.other(info.mover)); }
  }

  return {
    P, spawn, ring, slash, flash, glow, sink, rise, playMove, undoMove, checkStamp, mateSplash, reveal, flip, cineOn, cineOff, geom, bits, Marks, clearMarks, addSmoke,
    chunks, throwObj, removePiece, flyFace, groundY, onWater, groundAt, shot, follow, slowmo, ctxOf, rv, R, state, resultAt, lowMove,
    get smokeCount() { return smokes.length; },
    get markLayer() { return layerCanvas; }, bakeAll() { for (const r of marks) { bake(r); scene.remove(r.m); r.m.material.dispose(); } marks.length = 0; },
    get level() { return state.level; }, set level(v) { state.level = v; },
    get gore() { return state.gore; }, set gore(v) { state.gore = v; },
    get ply() { return state.ply; }, set ply(v) { state.ply = v; },
    get keep() { return state.keep; }, set keep(v) { state.keep = +v || 0; },
    get full() { return state.level !== 'low'; }, set full(v) { state.level = v ? 'cine' : 'low'; },
    bloodCol,
  };
})();
