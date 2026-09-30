// ===== 模型：士兵、战马、骑兵、战车、铜炮、弓手、渡船、项羽、刘邦 =====
const Models = (() => {
  const { toon, inked, merge, M4, outlineShared, outlineMat, rnd } = Core;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const vcMat = toon(0xffffff, { vertexColors: true });

  const SIDE = {
    r: { cloth: 0xa8321f, cloth2: 0xc4553a, armor: 0x4d4541, trim: 0xc9a045, flag: 0xb0301f },
    b: { cloth: 0x2a292c, cloth2: 0x48464a, armor: 0x2f2e31, trim: 0x9c8a62, flag: 0x1f1e20 },
  };
  const C = { skin: 0xd8bf98, pants: 0x2d2a27, wood: 0x6e4a2c, metal: 0xb8b4aa, dark: 0x1d1c1b, bronze: 0x7a6238, hair: 0x151413, white: 0xece4d2 };

  // 零件
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
    sph: (r, s = 8) => new THREE.SphereGeometry(r, s, Math.max(4, s - 2)),
    cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  };
  const P = (geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => ({ geo, color, m: M4(x, y, z, rx, ry, rz, sx, sy, sz) });
  function inkedMerged(parts, thick) {
    const geo = merge(parts);
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, vcMat); m.castShadow = true;
    const o = new THREE.Mesh(geo, thick ? outlineMat(thick) : outlineShared);
    g.add(m, o);
    return g;
  }

  // 兵器
  function spearParts(x, y, z, len = 2.4, side = 'r') {
    return [
      P(G.cyl(0.018, 0.02, len, 5), C.wood, x, y, z),
      P(G.cone(0.04, 0.24, 5), C.metal, x, y + len / 2 + 0.12, z),
      P(G.cone(0.06, 0.12, 6), SIDE[side].flag === 0x1f1e20 ? 0x5a1a14 : 0xb0301f, x, y + len / 2 - 0.04, z, Math.PI),
    ];
  }
  function jiShape() { // 戟的月牙刃
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(0.28, 0.05, 0.3, 0.26); s.quadraticCurveTo(0.2, 0.12, 0.02, 0.12); s.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  }

  // ---------- 步兵（合并几何，用于实例化） ----------
  function soldierParts(side, kind = 'spear') {
    const c = SIDE[side];
    const parts = [
      P(G.box(0.14, 0.78, 0.16), C.pants, 0.1, 0.42, 0), P(G.box(0.14, 0.78, 0.16), C.pants, -0.1, 0.42, 0),
      P(G.box(0.16, 0.1, 0.24), C.dark, 0.1, 0.05, 0.03), P(G.box(0.16, 0.1, 0.24), C.dark, -0.1, 0.05, 0.03),
      P(G.cyl(0.21, 0.3, 0.36, 8), c.armor, 0, 0.86, 0),
      P(G.cyl(0.2, 0.19, 0.52, 8), c.cloth, 0, 1.22, 0),
      P(G.box(0.44, 0.36, 0.34), c.armor, 0, 1.26, 0),
      P(G.sph(0.1, 6), c.armor, 0.25, 1.42, 0, 0, 0, 0, 1, 0.8, 1), P(G.sph(0.1, 6), c.armor, -0.25, 1.42, 0, 0, 0, 0, 1, 0.8, 1),
      P(G.box(0.1, 0.5, 0.11), c.cloth, 0.29, 1.17, 0.06, -0.35), P(G.box(0.1, 0.5, 0.11), c.cloth, -0.29, 1.17, 0.06, -0.35),
      P(G.sph(0.12, 8), C.skin, 0, 1.6, 0),
      P(G.cyl(0.1, 0.14, 0.14, 8), c.armor, 0, 1.68, 0), P(G.cone(0.05, 0.12, 5), c.armor, 0, 1.8, 0),
      P(G.cone(0.05, 0.1, 5), c.flag === 0x1f1e20 ? 0x5a1a14 : 0xb0301f, 0, 1.86, -0.02, 0.4),
    ];
    if (kind === 'spear') {
      parts.push(...spearParts(0.3, 1.3, 0.2, 2.5, side));
      parts.push(P(G.box(0.06, 0.72, 0.46), c.cloth2, -0.34, 1.05, 0.14), P(G.sph(0.07, 6), C.metal, -0.38, 1.1, 0.14));
    } else if (kind === 'archer') {
      const bow = new THREE.TorusGeometry(0.55, 0.02, 4, 18, Math.PI * 0.8);
      parts.push(P(bow, C.wood, -0.32, 1.3, 0.2, 0, Math.PI / 2, Math.PI * 0.6));
      parts.push(P(G.cyl(0.07, 0.06, 0.5, 6), C.wood, 0.12, 1.25, -0.2, 0.3));
      parts.push(P(G.cyl(0.005, 0.005, 1.0, 3), C.white, -0.32, 1.3, 0.2));
    } else if (kind === 'sword') {
      parts.push(P(G.box(0.05, 0.9, 0.035), C.metal, 0.34, 1.35, 0.2, 0.4));
      parts.push(P(G.box(0.18, 0.04, 0.06), C.bronze, 0.34, 0.92, 0.1, 0.4));
      parts.push(P(G.cyl(0.3, 0.3, 0.06, 12), c.cloth2, -0.36, 1.15, 0.12, 0, 0, Math.PI / 2));
      parts.push(P(G.sph(0.08, 6), C.metal, -0.4, 1.15, 0.12));
    }
    return parts;
  }
  const geoCache = {};
  function soldierGeo(side, kind) {
    const k = side + kind;
    if (!geoCache[k]) { geoCache[k] = merge(soldierParts(side, kind)); geoCache[k].userData.keep = true; }
    return geoCache[k];
  }

  // 实例化军阵
  class Army {
    constructor(side, kind, count, scale = 0.2) {
      const geo = soldierGeo(side, kind);
      this.mesh = new THREE.InstancedMesh(geo, vcMat, count);
      this.outline = new THREE.InstancedMesh(geo, outlineShared, count);
      this.mesh.castShadow = true;
      this.mesh.frustumCulled = this.outline.frustumCulled = false;
      this.group = new THREE.Group();
      this.group.add(this.mesh, this.outline);
      this.count = count; this.scale = scale;
      this.units = [];
      for (let i = 0; i < count; i++) this.units.push({ p: new THREE.Vector3(), yaw: 0, phase: rnd() * 6, lean: 0, y: 0, s: 1, vis: 1 });
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._v = new THREE.Vector3();
      this.gait = 'march'; this.t = 0;
    }
    update(dt) {
      this.t += dt;
      for (let i = 0; i < this.count; i++) {
        const u = this.units[i];
        let bob = 0, sway = 0;
        if (this.gait === 'march') { bob = Math.abs(Math.sin(this.t * 7 + u.phase)) * 0.05; sway = Math.sin(this.t * 7 + u.phase) * 0.05; }
        else if (this.gait === 'run') { bob = Math.abs(Math.sin(this.t * 12 + u.phase)) * 0.09; sway = Math.sin(this.t * 12 + u.phase) * 0.08; }
        this._e.set(u.lean, u.yaw, sway);
        this._q.setFromEuler(this._e);
        const s = this.scale * u.s * u.vis;
        this._s.set(s, s, s);
        this._v.set(u.p.x, u.p.y + u.y + bob * this.scale * 2, u.p.z);
        this._m.compose(this._v, this._q, this._s);
        this.mesh.setMatrixAt(i, this._m);
        this.outline.setMatrixAt(i, this._m);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
      this.outline.instanceMatrix.needsUpdate = true;
    }
  }

  // ---------- 战马（可动四肢） ----------
  function makeHorse(opt = {}) {
    const col = opt.color ?? 0x5b4636, mane = opt.mane ?? C.hair;
    const parts = [
      P(G.cyl(0.34, 0.36, 1.25, 10), col, 0, 1.3, 0, 0, 0, Math.PI / 2),
      P(G.sph(0.37, 10), col, 0.6, 1.33, 0, 0, 0, 0, 1.05, 1, 0.95),
      P(G.sph(0.4, 10), col, -0.6, 1.36, 0, 0, 0, 0, 1.05, 1, 1),
      P(G.cyl(0.17, 0.27, 0.85, 8), col, 0.95, 1.75, 0, 0, 0, -0.62),
      P(G.cyl(0.1, 0.17, 0.62, 8), col, 1.33, 2.02, 0, 0, 0, -1.95),
      P(G.box(0.08, 0.72, 0.06), mane, 0.86, 1.92, 0, 0, 0, -0.62),
      P(G.cone(0.05, 0.14, 4), col, 1.2, 2.3, 0.07), P(G.cone(0.05, 0.14, 4), col, 1.2, 2.3, -0.07),
      P(G.sph(0.03, 4), C.dark, 1.36, 2.12, 0.1), P(G.sph(0.03, 4), C.dark, 1.36, 2.12, -0.1),
    ];
    if (opt.barding) {
      const b = opt.barding;
      parts.push(P(G.cyl(0.4, 0.44, 1.5, 10, 1), b, 0, 1.32, 0, 0, 0, Math.PI / 2, 1, 1, 1));
      parts.push(P(G.box(0.12, 0.7, 0.62), b, 0.95, 1.1, 0, 0, 0, 0.2));
      parts.push(P(G.cyl(0.2, 0.3, 0.6, 8), b, 0.98, 1.72, 0, 0, 0, -0.62));
      parts.push(P(G.box(0.5, 0.08, 0.26), opt.trim ?? C.bronze, 1.38, 2.1, 0, 0, 0, -0.35));
      for (const x of [0.45, -0.1, -0.62]) parts.push(P(new THREE.TorusGeometry(0.43, 0.03, 4, 16), opt.trim ?? C.bronze, x, 1.3, 0, 0, Math.PI / 2, 0));
    }
    // 马鞍
    parts.push(P(G.box(0.55, 0.12, 0.62), opt.saddle ?? 0x6b2a1f, -0.05, 1.72, 0));
    const g = new THREE.Group();
    const body = inkedMerged(parts);
    const bodyPivot = new THREE.Group(); bodyPivot.add(body);
    g.add(bodyPivot);
    // 尾
    const tail = new THREE.Group(); tail.position.set(-0.98, 1.5, 0);
    const tm = inked(G.cone(0.1, 0.8, 6), toon(mane)); tm.position.y = -0.36; tm.rotation.z = 0.1;
    tail.add(tm); tail.rotation.z = 0.7; bodyPivot.add(tail);
    const legs = [];
    for (const [x, z, front] of [[0.62, 0.2, 1], [0.62, -0.2, 1], [-0.62, 0.2, 0], [-0.62, -0.2, 0]]) {
      const hip = new THREE.Group(); hip.position.set(x, 1.12, z);
      const up = inked(G.cyl(0.085, 0.06, 0.6, 6), toon(col)); up.position.y = -0.3; hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -0.58; hip.add(knee);
      const lo = inked(G.cyl(0.05, 0.045, 0.5, 6), toon(col)); lo.position.y = -0.24; knee.add(lo);
      const hoof = inked(G.cyl(0.07, 0.08, 0.1, 6), toon(C.dark)); hoof.position.y = -0.5; knee.add(hoof);
      bodyPivot.add(hip);
      legs.push({ hip, knee, front, off: front ? (z > 0 ? 0 : 0.35) : (z > 0 ? 0.55 : 0.85) });
    }
    const horse = {
      group: g, bodyPivot, tail, legs, t: rnd() * 5, speed: 0, // 0 静立 1 奔跑
      rider: null,
      update(dt) {
        this.t += dt * (1 + this.speed * 1.6);
        const s = this.speed;
        const ph = this.t * 7.5;
        for (const L of this.legs) {
          const a = Math.sin((ph + L.off * Math.PI * 2));
          L.hip.rotation.z = s * a * (L.front ? 0.75 : 0.6) + (1 - s) * Math.sin(this.t * 1.3 + L.off) * 0.02;
          L.knee.rotation.z = s * Math.max(0, L.front ? -a : a) * (L.front ? -1.0 : 0.9);
        }
        this.bodyPivot.position.y = s * Math.abs(Math.sin(ph * 1.0)) * 0.12;
        this.bodyPivot.rotation.z = s * Math.sin(ph) * 0.07;
        this.tail.rotation.z = 0.7 + s * 0.6 + Math.sin(this.t * 3) * 0.1;
      },
    };
    return horse;
  }

  // ---------- 骑士（坐姿，可挥砍） ----------
  function makeRider(side, opt = {}) {
    const c = SIDE[side];
    const g = new THREE.Group();
    const parts = [
      P(G.box(0.16, 0.5, 0.16), C.pants, 0.12, 0.05, 0.28, 0.9, 0, -0.4), P(G.box(0.16, 0.5, 0.16), C.pants, 0.12, 0.05, -0.28, -0.9, 0, -0.4),
      P(G.cyl(0.24, 0.32, 0.3, 8), c.armor, 0, 0.18, 0),
      P(G.cyl(0.22, 0.2, 0.55, 8), c.cloth, 0, 0.55, 0),
      P(G.box(0.4, 0.42, 0.46), opt.heavy ? C.dark : c.armor, 0.02, 0.6, 0),
      P(G.sph(0.13, 8), opt.heavy ? C.dark : c.armor, 0, 0.82, 0.27, 0, 0, 0, 1, 0.8, 1), P(G.sph(0.13, 8), opt.heavy ? C.dark : c.armor, 0, 0.82, -0.27, 0, 0, 0, 1, 0.8, 1),
      P(G.sph(0.13, 8), C.skin, 0.02, 1.0, 0),
      P(G.cyl(0.11, 0.15, 0.2, 8), opt.heavy ? C.dark : c.armor, 0.02, 1.1, 0),
      P(G.box(0.1, 0.16, 0.27), opt.heavy ? C.dark : c.armor, 0.1, 0.99, 0),
      P(G.cone(0.04, 0.4, 5), c.flag === 0x1f1e20 ? 0x7a2418 : 0xc0412c, -0.02, 1.4, 0, 0, 0, 0.3),
    ];
    const torso = inkedMerged(parts);
    g.add(torso);
    // 披风
    const cape = inked(G.box(0.04, 0.8, 0.5), toon(c.flag === 0x1f1e20 ? 0x6e1f16 : 0xb0301f));
    cape.position.set(-0.25, 0.45, 0); cape.rotation.z = -0.35;
    g.add(cape);
    // 执兵器手臂
    const arm = new THREE.Group(); arm.position.set(0.02, 0.82, 0.32);
    const armM = inked(G.box(0.12, 0.5, 0.12), toon(c.cloth)); armM.position.y = -0.22; arm.add(armM);
    const weapon = new THREE.Group(); weapon.position.y = -0.45; arm.add(weapon);
    if (opt.weapon === 'ji') {
      const shaft = inked(G.cyl(0.025, 0.025, 2.6, 5), toon(C.wood)); shaft.position.y = 0.4; weapon.add(shaft);
      const tip = inked(G.cone(0.05, 0.32, 5), toon(C.metal)); tip.position.y = 1.85; weapon.add(tip);
      const blade = inked(jiShape(), toon(C.metal)); blade.position.set(0, 1.5, -0.01); weapon.add(blade);
    } else { // 环首大刀
      const handle = inked(G.cyl(0.025, 0.025, 0.7, 5), toon(C.wood)); handle.position.y = 0; weapon.add(handle);
      const blade = inked(G.box(0.03, 1.1, 0.12), toon(C.metal)); blade.position.set(0, 0.9, 0.03); weapon.add(blade);
      const ring = inked(new THREE.TorusGeometry(0.07, 0.015, 4, 10), toon(C.bronze)); ring.position.y = -0.38; weapon.add(ring);
    }
    weapon.rotation.x = -0.2;
    g.add(arm);
    arm.rotation.x = -0.3; arm.rotation.z = 0.9;
    return { group: g, arm, weapon, cape };
  }

  function makeCavalry(side, heavy = true, weapon = 'dao') {
    const h = makeHorse({ color: side === 'r' ? 0x6b4a34 : 0x2c2a2a, barding: heavy ? (side === 'r' ? 0x5e2a20 : 0x262528) : null, trim: SIDE[side].trim });
    const r = makeRider(side, { heavy, weapon });
    r.group.position.set(-0.05, 1.72, 0);
    h.bodyPivot.add(r.group);
    h.rider = r;
    return h;
  }

  // 合并的静态骑兵（彭城大军用）
  function cavalryStaticGeo(side) {
    const k = 'cav' + side;
    if (geoCache[k]) return geoCache[k];
    const c = SIDE[side], col = side === 'r' ? 0x6b4a34 : 0x2c2a2a;
    const parts = [
      P(G.cyl(0.34, 0.36, 1.25, 8), col, 0, 1.3, 0, 0, 0, Math.PI / 2),
      P(G.sph(0.37, 8), col, 0.6, 1.33, 0), P(G.sph(0.4, 8), col, -0.6, 1.36, 0),
      P(G.cyl(0.17, 0.27, 0.85, 7), col, 0.98, 1.72, 0, 0, 0, -0.9),
      P(G.cyl(0.1, 0.17, 0.62, 7), col, 1.4, 1.95, 0, 0, 0, -2.1),
      P(G.box(0.08, 0.7, 0.06), C.hair, 0.9, 1.88, 0, 0, 0, -0.9),
      P(G.cyl(0.07, 0.05, 1.1, 5), col, 0.9, 0.7, 0.2, 0, 0, 0.9), P(G.cyl(0.07, 0.05, 1.1, 5), col, 0.6, 0.62, -0.2, 0, 0, 0.5),
      P(G.cyl(0.07, 0.05, 1.1, 5), col, -0.9, 0.7, 0.2, 0, 0, -0.9), P(G.cyl(0.07, 0.05, 1.1, 5), col, -0.6, 0.62, -0.2, 0, 0, -0.4),
      P(G.cone(0.1, 0.8, 5), C.hair, -1.25, 1.5, 0, 0, 0, 1.9),
      P(G.box(0.55, 0.12, 0.62), 0x5a2a1f, -0.05, 1.72, 0),
      P(G.cyl(0.22, 0.2, 0.6, 7), c.cloth, 0.05, 2.1, 0, 0, 0, -0.25),
      P(G.box(0.4, 0.42, 0.46), c.armor, 0.08, 2.15, 0, 0, 0, -0.25),
      P(G.sph(0.13, 7), C.skin, 0.2, 2.52, 0), P(G.cyl(0.11, 0.15, 0.2, 7), c.armor, 0.2, 2.62, 0),
      P(G.cone(0.04, 0.4, 4), 0x7a2418, 0.15, 2.9, 0, 0, 0, 0.5),
      P(G.box(0.03, 1.2, 0.1), C.metal, 0.6, 2.55, 0.3, 0, 0, -0.6),
      P(G.box(0.04, 0.8, 0.5), side === 'r' ? 0xb0301f : 0x6e1f16, -0.22, 2.0, 0, 0, 0, -0.9),
    ];
    geoCache[k] = merge(parts); geoCache[k].userData.keep = true;
    return geoCache[k];
  }

  // ---------- 战车（驷马） ----------
  function makeChariot(side) {
    const c = SIDE[side];
    const g = new THREE.Group();
    const body = inkedMerged([
      P(G.box(1.2, 0.12, 1.5), C.wood, 0, 1.0, 0),
      P(G.box(1.2, 0.5, 0.06), c.cloth, 0, 1.3, 0.72), P(G.box(1.2, 0.5, 0.06), c.cloth, 0, 1.3, -0.72),
      P(G.box(0.06, 0.5, 1.5), c.cloth, 0.6, 1.3, 0),
      P(G.cyl(0.05, 0.05, 2.2, 6), C.wood, 0, 0.9, 0, Math.PI / 2),
      P(G.cyl(0.05, 0.06, 2.6, 6), C.wood, 1.7, 1.05, 0, 0, 0, Math.PI / 2 + 0.08),
      P(G.box(0.12, 0.12, 1.9), C.wood, 2.95, 1.3, 0),
      P(G.cyl(0.03, 0.03, 2.2, 5), C.wood, -0.2, 2.1, 0),
      P(G.cone(0.95, 0.28, 12), c.flag, -0.2, 3.25, 0),
      P(G.box(0.02, 0.6, 0.9), c.flag, -0.45, 3.0, 0.5, 0, 0.3),
    ]);
    g.add(body);
    const wheels = [];
    for (const z of [0.95, -0.95]) {
      const wg = new THREE.Group(); wg.position.set(0, 0.9, z);
      const rim = inked(new THREE.TorusGeometry(0.88, 0.05, 5, 22), toon(C.wood)); wg.add(rim);
      for (let i = 0; i < 9; i++) { const sp = inked(G.cyl(0.02, 0.02, 1.76, 4), toon(C.wood)); sp.rotation.z = (i / 9) * Math.PI; wg.add(sp); }
      const hub = inked(G.cyl(0.12, 0.12, 0.22, 8), toon(C.bronze)); hub.rotation.x = Math.PI / 2; wg.add(hub);
      g.add(wg); wheels.push(wg);
    }
    // 车上甲士
    const driver = new THREE.Mesh(soldierGeo(side, 'sword'), vcMat); driver.position.set(0.25, 1.05, 0.3); driver.scale.setScalar(0.95); driver.rotation.y = Math.PI / 2;
    const dOut = new THREE.Mesh(soldierGeo(side, 'sword'), outlineShared); driver.add(dOut);
    const warrior = new THREE.Mesh(soldierGeo(side, 'spear'), vcMat); warrior.position.set(-0.2, 1.05, -0.3); warrior.rotation.y = Math.PI / 2; warrior.rotation.x = 0.15;
    warrior.add(new THREE.Mesh(soldierGeo(side, 'spear'), outlineShared));
    g.add(driver, warrior);
    // 驷马
    const horses = [];
    for (const z of [-0.84, -0.28, 0.28, 0.84]) {
      const h = makeHorse({ color: side === 'r' ? 0x7a5236 : 0x2e2b2a, barding: z === -0.84 || z === 0.84 ? null : null });
      h.group.position.set(2.5, 0, z);
      h.group.scale.setScalar(0.82);
      g.add(h.group); horses.push(h);
    }
    return {
      group: g, wheels, horses, speed: 0,
      update(dt) {
        for (const w of wheels) w.rotation.z -= dt * this.speed * 7;
        for (const h of horses) { h.speed = Math.min(1, this.speed); h.update(dt); }
        body.position.y = Math.abs(Math.sin(performance.now() * 0.03)) * 0.03 * this.speed;
      },
    };
  }

  // ---------- 铜炮 ----------
  function makeCannon(side) {
    const g = new THREE.Group();
    const prof = [[0, -0.1], [0.12, -0.1], [0.14, -0.02], [0.25, 0.02], [0.26, 0.2], [0.22, 0.24], [0.23, 0.5], [0.2, 0.55], [0.19, 1.3], [0.21, 1.34], [0.17, 1.4], [0.17, 1.7], [0.22, 1.76], [0.21, 1.84], [0.11, 1.84], [0.11, 1.7]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const barrelGeo = new THREE.LatheGeometry(prof, 16);
    const barrel = new THREE.Group();
    const bm = inked(barrelGeo, toon(0x6a5530, { unique: true }));
    bm.rotation.z = -Math.PI / 2; bm.position.x = -0.55;
    barrel.add(bm);
    const knob = inked(G.sph(0.1, 8), toon(0x6a5530)); knob.position.x = -0.7; barrel.add(knob);
    for (const x of [0.35, 0.9]) { const ring = inked(new THREE.TorusGeometry(0.22, 0.03, 4, 16), toon(INK.gold)); ring.rotation.y = Math.PI / 2; ring.position.x = x; barrel.add(ring); }
    barrel.position.set(0, 0.85, 0);
    barrel.rotation.z = 0.2;
    g.add(barrel);
    const carriage = inkedMerged([
      P(G.box(1.3, 0.3, 0.14), C.wood, -0.3, 0.6, 0.22, 0, 0, 0.18), P(G.box(1.3, 0.3, 0.14), C.wood, -0.3, 0.6, -0.22, 0, 0, 0.18),
      P(G.box(0.3, 0.14, 0.5), C.wood, -0.9, 0.35, 0),
      P(G.cyl(0.04, 0.04, 1.0, 6), C.dark, 0, 0.45, 0, Math.PI / 2),
    ]);
    g.add(carriage);
    for (const z of [0.46, -0.46]) {
      const w = inked(new THREE.TorusGeometry(0.4, 0.06, 5, 16), toon(C.wood)); w.position.set(0, 0.45, z); g.add(w);
      for (let i = 0; i < 4; i++) { const sp = inked(G.cyl(0.02, 0.02, 0.8, 4), toon(C.wood)); sp.position.set(0, 0.45, z); sp.rotation.z = i * Math.PI / 4; g.add(sp); }
    }
    // 炮手
    const crew = new THREE.Mesh(soldierGeo(side, 'sword'), vcMat); crew.position.set(-0.6, 0, 0.75); crew.rotation.y = Math.PI / 2 - 0.5;
    crew.add(new THREE.Mesh(soldierGeo(side, 'sword'), outlineShared));
    g.add(crew);
    // 火把
    const torch = new THREE.Group(); torch.position.set(-0.35, 1.2, 0.7);
    const stick = inked(G.cyl(0.025, 0.025, 0.7, 5), toon(C.wood)); stick.rotation.z = -0.6; torch.add(stick);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: Core.Tex.spark, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.set(0.2, 0.32, 0); flame.scale.setScalar(0.45); torch.add(flame);
    g.add(torch);
    return { group: g, barrel, muzzle: new THREE.Vector3(1.3, 0, 0), torch, flame };
  }

  // ---------- 渡船 ----------
  function makeBoat(opt = {}) {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(2.2, 0.4, 0.8, 16, 2, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = Math.abs(x) / 1.1;
      p.setZ(i, z * (1 - Math.pow(k, 2.2) * 0.85) * (y < 0 ? 0.7 : 1));
      p.setY(i, y + Math.pow(k, 3) * 0.25);
    }
    geo.computeVertexNormals();
    const hull = inked(geo, toon(opt.color ?? 0x5b412b));
    hull.position.y = 0.1;
    g.add(hull);
    const deck = inked(G.box(1.5, 0.04, 0.6), toon(0x8a6a44)); deck.position.y = 0.3; g.add(deck);
    if (opt.awning) {
      const aw = new THREE.CylinderGeometry(0.45, 0.45, 0.8, 12, 1, true, 0, Math.PI);
      const a = inked(aw, toon(0x3e3a33, { side: THREE.DoubleSide })); a.rotation.z = Math.PI / 2; a.rotation.y = Math.PI / 2; a.position.set(-0.1, 0.35, 0); g.add(a);
    }
    // 船夫
    const man = makeBoatman(opt.side);
    man.group.position.set(-0.8, 0.32, 0); man.group.rotation.y = Math.PI / 2 * 0; g.add(man.group);
    return { group: g, man };
  }
  function makeBoatman(side) {
    const g = new THREE.Group();
    const body = inkedMerged([
      P(G.cyl(0.18, 0.34, 1.0, 8), 0x6e675b, 0, 0.55, 0),
      P(G.cyl(0.19, 0.2, 0.45, 8), 0x7d7667, 0, 1.25, 0),
      P(G.sph(0.12, 8), C.skin, 0, 1.6, 0),
      P(G.cone(0.42, 0.22, 12), 0xa89468, 0, 1.78, 0),
      P(G.cone(0.05, 0.3, 5), 0xe0d8c8, 0.08, 1.46, 0, 0, 0, 3.0),
    ]);
    g.add(body);
    const poleArm = new THREE.Group(); poleArm.position.set(0.1, 1.3, 0.2);
    const pole = inked(G.cyl(0.025, 0.025, 3.2, 5), toon(C.wood)); pole.position.y = -0.8; poleArm.add(pole);
    poleArm.rotation.z = 0.5;
    g.add(poleArm);
    return { group: g, poleArm };
  }

  // ---------- 项羽 ----------
  function makeXiangYu() {
    const g = new THREE.Group();
    const armor = 0x1e1c1b, gold = 0xb08a3a, red = 0x9e2418;
    const bodyParts = [
      // 腿与战靴
      P(G.cyl(0.1, 0.09, 0.9, 8), 0x2a2522, 0.13, 0.5, 0), P(G.cyl(0.1, 0.09, 0.9, 8), 0x2a2522, -0.13, 0.5, 0),
      P(G.box(0.17, 0.12, 0.3), armor, 0.13, 0.06, 0.05), P(G.box(0.17, 0.12, 0.3), armor, -0.13, 0.06, 0.05),
      P(G.cyl(0.12, 0.11, 0.4, 8), armor, 0.13, 0.35, 0), P(G.cyl(0.12, 0.11, 0.4, 8), armor, -0.13, 0.35, 0),
      // 甲裙（三层札甲）
      P(G.cyl(0.26, 0.34, 0.22, 12), armor, 0, 1.06, 0), P(G.cyl(0.3, 0.38, 0.22, 12), 0x2a2725, 0, 0.9, 0), P(G.cyl(0.34, 0.42, 0.22, 12), armor, 0, 0.74, 0),
      P(new THREE.TorusGeometry(0.42, 0.015, 4, 18), gold, 0, 0.64, 0, Math.PI / 2),
      P(new THREE.TorusGeometry(0.38, 0.015, 4, 18), gold, 0, 0.8, 0, Math.PI / 2),
      // 躯干与胸甲
      P(G.cyl(0.27, 0.24, 0.62, 12), armor, 0, 1.46, 0),
      P(G.sph(0.17, 10), armor, 0.1, 1.55, 0.14, 0, 0, 0, 1, 0.9, 0.55), P(G.sph(0.17, 10), armor, -0.1, 1.55, 0.14, 0, 0, 0, 1, 0.9, 0.55),
      P(G.sph(0.06, 6), gold, 0, 1.46, 0.26), P(G.sph(0.06, 6), gold, 0, 1.7, 0.22),
      P(G.box(0.62, 0.08, 0.5), gold, 0, 1.18, 0), // 腰带
      P(G.sph(0.08, 8), gold, 0, 1.18, 0.26),
      // 护肩（层叠）
      P(G.sph(0.17, 10), armor, 0.34, 1.76, 0, 0, 0, -0.3, 1.1, 0.75, 1.1), P(G.sph(0.17, 10), armor, -0.34, 1.76, 0, 0, 0, 0.3, 1.1, 0.75, 1.1),
      P(G.sph(0.15, 10), 0x3a2e24, 0.4, 1.68, 0, 0, 0, -0.5, 1.1, 0.6, 1.05), P(G.sph(0.15, 10), 0x3a2e24, -0.4, 1.68, 0, 0, 0, 0.5, 1.1, 0.6, 1.05),
      // 颈与头
      P(G.cyl(0.08, 0.09, 0.12, 8), C.skin, 0, 1.82, 0),
      P(G.sph(0.14, 12), 0xc9ad85, 0, 1.97, 0.01, 0, 0, 0, 0.95, 1.08, 1),
      P(G.box(0.2, 0.03, 0.02), C.hair, 0, 2.02, 0.13), // 眉
      P(G.sph(0.02, 5), C.hair, 0.05, 1.99, 0.13), P(G.sph(0.02, 5), C.hair, -0.05, 1.99, 0.13),
      P(G.cone(0.1, 0.26, 8), C.hair, 0, 1.8, 0.07, Math.PI), // 须
      P(G.box(0.18, 0.02, 0.03), C.hair, 0, 1.91, 0.13),
      // 兜鍪
      P(new THREE.SphereGeometry(0.178, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), armor, 0, 2.02, -0.015),
      P(G.cyl(0.182, 0.19, 0.05, 14), gold, 0, 2.03, -0.015),
      P(G.box(0.05, 0.18, 0.1), armor, 0.15, 1.95, -0.03), P(G.box(0.05, 0.18, 0.1), armor, -0.15, 1.95, -0.03),
      P(G.cone(0.05, 0.16, 6), gold, 0, 2.26, -0.01),
      P(G.cone(0.1, 0.24, 8), red, 0, 2.22, -0.08, 0.6),
    ];
    const body = inkedMerged(bodyParts, 0.018);
    g.add(body);
    // 雉翎（双翎）
    for (const s of [1, -1]) {
      const curve = new THREE.CatmullRomCurve3([V(0.05 * s, 2.2, -0.02), V(0.2 * s, 2.7, -0.1), V(0.45 * s, 3.05, -0.3), V(0.78 * s, 3.18, -0.52)]);
      const f = inked(new THREE.TubeGeometry(curve, 16, 0.018, 4), toon(0x2b2622), 0.012);
      g.add(f);
      for (let i = 0; i < 6; i++) {
        const p = curve.getPoint(0.3 + i * 0.12);
        const band = inked(G.sph(0.03, 5), toon(i % 2 ? 0xc9a045 : 0x2b2622)); band.position.copy(p); g.add(band);
      }
    }
    // 披风（可飘动）
    const capeGeo = new THREE.PlaneGeometry(0.9, 1.7, 8, 14);
    capeGeo.translate(0, -0.85, 0);
    const capeMat = toon(0xa12a1c, { side: THREE.DoubleSide, unique: true });
    const cape = new THREE.Mesh(capeGeo, capeMat); cape.castShadow = true;
    const capeOut = new THREE.Mesh(capeGeo, outlineMat(0.012));
    cape.add(capeOut);
    cape.position.set(0, 1.78, -0.26); cape.rotation.x = 0.12;
    g.add(cape);
    const capeBase = capeGeo.attributes.position.array.slice();
    // 右臂（持戟）、左臂（按剑）
    const armR = new THREE.Group(); armR.position.set(0.38, 1.66, 0.02);
    const aR = inkedMerged([P(G.cyl(0.08, 0.07, 0.36, 8), armor, 0, -0.18, 0), P(G.cyl(0.07, 0.06, 0.34, 8), 0x2a2522, 0, -0.5, 0.06, 0.25), P(G.sph(0.07, 6), C.skin, 0, -0.7, 0.12)]);
    armR.add(aR);
    const ji = new THREE.Group(); ji.position.set(0, -0.7, 0.12);
    const shaft = inked(G.cyl(0.028, 0.028, 3.3, 6), toon(0x3a2616)); shaft.position.y = 0.35; ji.add(shaft);
    const tip = inked(G.cone(0.06, 0.42, 6), toon(0xc9c3b4)); tip.position.y = 2.2; ji.add(tip);
    const blade = inked(jiShape(), toon(0xc9c3b4)); blade.scale.setScalar(1.3); blade.position.set(0, 1.62, -0.01); ji.add(blade);
    const tassel = inked(G.cone(0.08, 0.2, 6), toon(red)); tassel.position.y = 1.9; tassel.rotation.x = Math.PI; ji.add(tassel);
    armR.add(ji);
    armR.rotation.x = -0.25;
    g.add(armR);
    const armL = new THREE.Group(); armL.position.set(-0.38, 1.66, 0.02);
    armL.add(inkedMerged([P(G.cyl(0.08, 0.07, 0.36, 8), armor, 0, -0.18, 0), P(G.cyl(0.07, 0.06, 0.34, 8), 0x2a2522, 0, -0.5, 0.08, 0.35), P(G.sph(0.07, 6), C.skin, 0, -0.68, 0.18)]));
    armL.rotation.z = -0.1;
    g.add(armL);
    // 佩剑
    const sword = new THREE.Group(); sword.position.set(-0.3, 1.12, 0.12); sword.rotation.z = 0.5;
    const sheath = inked(G.box(0.05, 0.9, 0.04), toon(0x2a1a12)); sheath.position.y = -0.4; sword.add(sheath);
    const hilt = inked(G.cyl(0.02, 0.02, 0.22, 5), toon(0x3a2616)); hilt.position.y = 0.14; sword.add(hilt);
    const guard = inked(G.box(0.14, 0.04, 0.06), toon(gold)); sword.add(guard);
    const bladeS = inked(G.box(0.04, 0.85, 0.012), toon(0xd8d4c8)); bladeS.position.y = -0.45; bladeS.visible = false; sword.add(bladeS);
    g.add(sword);
    let t = 0;
    return {
      group: g, armR, armL, ji, sword, bladeS, sheath, cape, body,
      wind: 1,
      update(dt) {
        t += dt;
        const p = capeGeo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = capeBase[i * 3], y = capeBase[i * 3 + 1];
          const k = -y / 1.7;
          p.setZ(i, -k * k * 0.5 * this.wind - Math.sin(t * 3.2 + x * 3 + y * 4) * 0.08 * k * this.wind);
          p.setX(i, x * (1 + k * 0.25) + Math.sin(t * 2.3 + y * 3) * 0.03 * k * this.wind);
        }
        p.needsUpdate = true;
        capeGeo.computeVertexNormals();
        body.position.y = Math.sin(t * 1.4) * 0.006;
      },
    };
  }
  function makeWuzhui() { // 乌骓
    const h = makeHorse({ color: 0x1f1e20, mane: 0x0e0d0d, saddle: 0x8e2016, barding: 0x2a2624, trim: 0xb08a3a });
    return h;
  }

  // ---------- 刘邦 ----------
  function makeLiuBang() {
    const g = new THREE.Group();
    const red = 0xa3301f, dark = 0x3a1c16;
    const parts = [
      P(G.cyl(0.22, 0.42, 1.15, 12), red, 0, 0.6, 0),
      P(new THREE.TorusGeometry(0.42, 0.02, 4, 18), INK.gold, 0, 0.05, 0, Math.PI / 2),
      P(G.cyl(0.22, 0.24, 0.55, 12), red, 0, 1.4, 0),
      P(G.box(0.46, 0.08, 0.44), dark, 0, 1.18, 0),
      P(G.box(0.06, 0.34, 0.04), 0xe6dcc8, 0.075, 1.53, 0.215, 0, 0, -0.42), // 交领（右衽）
      P(G.box(0.06, 0.34, 0.04), 0xe6dcc8, -0.075, 1.53, 0.22, 0, 0, 0.42),
      P(G.sph(0.13, 8), red, 0.3, 1.6, 0, 0, 0, 0, 1.2, 0.8, 1), P(G.sph(0.13, 8), red, -0.3, 1.6, 0, 0, 0, 0, 1.2, 0.8, 1),
      P(G.cyl(0.07, 0.08, 0.1, 8), C.skin, 0, 1.72, 0),
      P(G.sph(0.14, 12), 0xd2b893, 0, 1.87, 0.01, 0, 0, 0, 0.95, 1.1, 1),
      P(G.sph(0.02, 5), C.hair, 0.05, 1.9, 0.13), P(G.sph(0.02, 5), C.hair, -0.05, 1.9, 0.13),
      P(G.cone(0.06, 0.2, 6), C.hair, 0, 1.72, 0.1, Math.PI + 0.3), // 美须髯
      P(G.box(0.16, 0.02, 0.03), C.hair, 0, 1.82, 0.13),
      P(G.sph(0.14, 10), C.hair, 0, 1.94, -0.02, 0, 0, 0, 1, 0.7, 1),
      // 刘氏冠（竹皮冠）
      P(G.box(0.1, 0.28, 0.22), 0x2b2724, 0, 2.12, -0.01, -0.3),
      P(G.cyl(0.005, 0.005, 0.5, 3), 0x2b2724, 0, 2.04, 0, 0, 0, Math.PI / 2),
    ];
    g.add(inkedMerged(parts, 0.016));
    const armR = new THREE.Group(); armR.position.set(0.32, 1.58, 0);
    armR.add(inkedMerged([P(G.cyl(0.1, 0.13, 0.55, 8), red, 0, -0.27, 0), P(G.sph(0.06, 6), C.skin, 0, -0.56, 0.02)]));
    const sword = new THREE.Group(); sword.position.set(0, -0.58, 0.04);
    const bl = inked(G.box(0.035, 0.9, 0.012), toon(0xd8d4c8)); bl.position.y = 0.5; sword.add(bl);
    const gu = inked(G.box(0.12, 0.03, 0.05), toon(INK.gold)); sword.add(gu);
    armR.add(sword); armR.rotation.x = -0.4;
    g.add(armR);
    const armL = new THREE.Group(); armL.position.set(-0.32, 1.58, 0);
    armL.add(inkedMerged([P(G.cyl(0.1, 0.13, 0.55, 8), red, 0, -0.27, 0), P(G.sph(0.06, 6), C.skin, 0, -0.56, 0.02)]));
    armL.rotation.z = -0.3;
    g.add(armL);
    return { group: g, armR, armL, sword };
  }

  // 旌旗
  function makeBanner(side, char) {
    const g = new THREE.Group();
    const pole = inked(G.cyl(0.03, 0.035, 4, 6), toon(C.wood)); pole.position.y = 2; g.add(pole);
    const tex = Core.canvasTex(256, 384, (c, w, h) => {
      c.fillStyle = side === 'r' ? '#a82c1c' : '#1e1d1f'; c.fillRect(0, 0, w, h);
      c.strokeStyle = side === 'r' ? '#e9c77a' : '#a88a52'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
      c.fillStyle = side === 'r' ? '#f1e3c6' : '#e3d6b8';
      c.font = `bold 190px ${Board.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(char, w / 2, h / 2 + 10);
    });
    const geo = new THREE.PlaneGeometry(1.2, 1.8, 10, 4); geo.translate(0.6, 0, 0);
    const flag = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide, gradientMap: null }));
    flag.position.set(0.03, 3.0, 0); g.add(flag);
    const base = geo.attributes.position.array.slice();
    let t = rnd() * 5;
    return {
      group: g, update(dt) {
        t += dt; const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = base[i * 3]; p.setZ(i, Math.sin(t * 4 - x * 3) * 0.12 * x); }
        p.needsUpdate = true; geo.computeVertexNormals();
      },
    };
  }

  return { SIDE, C, G, P, inkedMerged, soldierGeo, Army, makeHorse, makeRider, makeCavalry, cavalryStaticGeo, makeChariot, makeCannon, makeBoat, makeBoatman, makeXiangYu, makeWuzhui, makeLiuBang, makeBanner, vcMat };
})();
