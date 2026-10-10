  // ---------- 三套楚汉兵卒造型（同一副骨架：上身、胯、头、两节腿、两节胳膊、矛、盾） ----------
  const K = { skin: 0xd8bf98, hair: 0x151413, iron: 0x55524d, bronze: 0x9a7a3c, wood: 0x6e4a2c, metal: 0xc4c0b6, black: 0x242226, boot: 0x1d1c1b };
  const HAN = { red: 0xa8321f, red2: 0x7e2216, lac: 0x2a2626, cord: 0x8e2a1a, pants: 0x3a2e2a, gold: 0xc9a045 };
  const CHU = { robe: 0x262428, robe2: 0x3b2a2e, lac: 0x6e2a1c, ochre: 0xc69a3c, feather: 0xe8e0cc, pants: 0x2a2629, jade: 0x6f9a86 };
  const lamellar = (w, h, d, y0, rows, c1, c2, z = 0) => { const a = []; for (let i = 0; i < rows; i++) { const y = y0 + i * h / rows; a.push(P(G.box(w, h / rows * 0.78, d), c1, 0, y + h / rows / 2, z), P(G.box(w * 1.01, h / rows * 0.18, d * 1.01), c2, 0, y + h / rows * 0.95, z)); } return a; };
  function legs(o, pants, boot, wrap) {
    for (const k of ['L', 'R']) {
      o['thigh' + k] = mk([P(G.box(0.15, 0.42, 0.17), pants, 0, -0.2, 0)]);
      const sh = [P(G.sph(0.075, 6), pants, 0, 0, 0), P(G.box(0.13, 0.38, 0.15), pants, 0, -0.19, 0), P(G.box(0.16, 0.1, 0.26), boot, 0, -0.41, 0.05)];
      if (wrap) for (let i = 0; i < 4; i++) sh.push(P(G.cyl(0.078, 0.078, 0.035, 7), wrap, 0, -0.1 - i * 0.07, 0, 0.18 * (i % 2 ? 1 : -1)));
      o['shin' + k] = mk(sh);
    }
  }
  function arms(o, sleeve, cuff, bare) {
    for (const k of ['W', 'S']) {
      o['uarm' + k] = mk([P(G.box(0.11, 0.27, 0.12), bare ? K.skin : sleeve, 0, -0.12, 0)].concat(bare ? [P(G.box(0.12, 0.08, 0.13), sleeve, 0, -0.02, 0)] : []));
      o['farm' + k] = mk([P(G.sph(0.058, 6), bare ? K.skin : sleeve, 0, 0, 0), P(G.box(0.095, 0.24, 0.105), bare ? K.skin : sleeve, 0, -0.11, 0), P(G.cyl(0.056, 0.05, 0.12, 6), cuff, 0, -0.15, 0), P(G.sph(0.055, 6), K.skin, 0, -0.24, 0)]);
    }
  }
  const spear = (tassel, blade = K.metal) => mk([P(G.cyl(0.018, 0.02, 2.5, 6), K.wood, 0, 0.55, 0), P(G.cone(0.045, 0.3, 4), blade, 0, 1.95, 0, 0, PI / 4, 0, 1, 1, 0.35), P(G.cyl(0.026, 0.022, 0.08, 6), K.bronze, 0, 1.78, 0), P(G.cone(0.065, 0.13, 7), tassel, 0, 1.68, 0, PI)]);
  const ji = (tassel) => mk([P(G.cyl(0.018, 0.02, 2.5, 6), 0x5a3d26, 0, 0.55, 0), P(G.cone(0.04, 0.26, 4), K.metal, 0, 1.94, 0, 0, PI / 4, 0, 1, 1, 0.35), P(G.box(0.24, 0.05, 0.012), K.metal, 0.12, 1.72, 0, 0, 0, -0.2), P(G.box(0.05, 0.12, 0.014), K.bronze, 0.02, 1.7, 0), P(G.cone(0.06, 0.12, 7), tassel, 0, 1.6, 0, PI)]);
  const head = (parts) => mk([P(G.sph(0.12, 10), K.skin, 0, 1.6, 0), P(G.box(0.11, 0.018, 0.02), K.hair, 0, 1.63, 0.112), P(G.box(0.022, 0.03, 0.02), 0xc8a07c, 0, 1.585, 0.12)].concat(parts), [0, 1.5, 0]);
  const DESIGNS = {
    a: {
      name: '甲 · 札甲对犀甲', note: '照秦汉出土的样子：汉兵红襦外罩黑漆札甲、红绳穿甲片，头裹赤帻，长方木盾；楚卒黑袍外披赭红犀皮甲、黄漆云带，高髻插两根鹖羽，持戟，黑漆长盾上画朱黄圈纹。',
      han() { const o = {};
        o.upper = mk([P(G.cyl(0.2, 0.19, 0.52, 10), HAN.red, 0, 1.22, 0), ...lamellar(0.44, 0.38, 0.33, 1.06, 6, HAN.lac, HAN.cord), ...[1, -1].flatMap(s => lamellar(0.16, 0.14, 0.2, 1.36, 2, HAN.lac, HAN.cord).map(p => (p.m.premultiply(new THREE.Matrix4().makeTranslation(0.26 * s, 0, 0)), p))), P(G.cyl(0.06, 0.07, 0.1, 8), K.skin, 0, 1.5, 0), P(G.box(0.46, 0.05, 0.35), K.black, 0, 1.04, 0), P(G.box(0.07, 0.06, 0.04), K.bronze, 0, 1.04, 0.18)], [0, 0.98, 0]);
        o.pelvis = mk([P(G.cyl(0.21, 0.3, 0.36, 10), HAN.red, 0, 0.86, 0), P(G.cyl(0.215, 0.27, 0.16, 10), HAN.lac, 0, 0.94, 0)], [0, 0.9, 0]);
        o.head = head([P(G.cyl(0.125, 0.13, 0.09, 10), HAN.red, 0, 1.69, -0.01), P(G.sph(0.05, 6), HAN.red, 0, 1.73, -0.1), P(G.box(0.26, 0.03, 0.02), HAN.red2, 0, 1.66, -0.11, 0.3)]);
        o.weapon = spear(HAN.red);
        o.shield = mk([P(G.box(0.46, 0.74, 0.05), HAN.red2, 0, 0, 0), P(G.box(0.36, 0.62, 0.02), HAN.red, 0, 0, 0.032), P(G.box(0.04, 0.62, 0.025), HAN.lac, 0, 0, 0.042), P(G.sph(0.07, 8), K.bronze, 0, 0.02, 0.04)]);
        legs(o, HAN.pants, K.boot); arms(o, HAN.red, HAN.lac); return o; },
      chu() { const o = {};
        o.upper = mk([P(G.cyl(0.2, 0.19, 0.52, 10), CHU.robe, 0, 1.22, 0), P(G.box(0.45, 0.4, 0.34), CHU.lac, 0, 1.25, 0), P(G.box(0.455, 0.035, 0.345), CHU.ochre, 0, 1.36, 0), P(G.box(0.455, 0.035, 0.345), CHU.ochre, 0, 1.14, 0), P(G.box(0.08, 0.5, 0.36), CHU.robe2, 0.05, 1.24, 0, 0, 0, 0.6), ...[1, -1].map(s => P(G.box(0.18, 0.06, 0.24), CHU.lac, 0.27 * s, 1.42, 0, 0, 0, -0.45 * s)), ...[1, -1].map(s => P(G.box(0.182, 0.02, 0.242), CHU.ochre, 0.27 * s, 1.425, 0, 0, 0, -0.45 * s)), P(G.cyl(0.06, 0.07, 0.1, 8), K.skin, 0, 1.5, 0), P(G.box(0.46, 0.05, 0.35), CHU.ochre, 0, 1.04, 0)], [0, 0.98, 0]);
        o.pelvis = mk([P(G.cyl(0.21, 0.33, 0.48, 10), CHU.robe, 0, 0.8, 0), P(G.cyl(0.335, 0.335, 0.03, 10), CHU.ochre, 0, 0.57, 0)], [0, 0.9, 0]);
        o.head = head([P(G.sph(0.128, 10), K.hair, 0, 1.64, -0.02, 0, 0, 0, 1, 0.7, 1), P(G.sph(0.07, 8), K.hair, 0, 1.79, -0.03), P(G.cyl(0.02, 0.02, 0.05, 6), CHU.jade, 0, 1.79, -0.03, PI / 2), ...[1, -1].map(s => P(G.box(0.025, 0.42, 0.008), CHU.feather, 0.05 * s, 1.98, -0.05, -0.15, 0, -0.18 * s)), ...[1, -1].map(s => P(G.box(0.027, 0.12, 0.009), 0x2b2620, 0.06 * s + 0.035 * s, 2.15, -0.08, -0.15, 0, -0.18 * s))]);
        o.weapon = ji(CHU.ochre);
        o.shield = mk([P(G.box(0.44, 0.36, 0.05), CHU.robe, 0, 0, 0), P(G.cyl(0.22, 0.22, 0.05, 18), CHU.robe, 0, 0.18, 0, PI / 2), P(G.cyl(0.22, 0.22, 0.05, 18), CHU.robe, 0, -0.18, 0, PI / 2), P(new THREE.TorusGeometry(0.15, 0.022, 6, 22), CHU.lac, 0, 0.02, 0.03), P(new THREE.TorusGeometry(0.08, 0.018, 6, 18), CHU.ochre, 0, 0.02, 0.03), P(G.sph(0.035, 8), CHU.ochre, 0, 0.02, 0.035)]);
        legs(o, CHU.pants, K.boot); arms(o, CHU.robe, CHU.lac); return o; },
    },
    b: {
      name: '乙 · 盔胄对巾帻', note: '远看剪影就分得开：汉兵铁盔顶一簇红缨、红长袍到膝、宽黑腰带，长方红盾；楚卒不戴盔，黑巾裹头、两条巾尾拖在脑后，无袖皮背心露出两臂，黑圆盾上画红黑漩纹，持戟。',
      han() { const o = {};
        o.upper = mk([P(G.cyl(0.2, 0.2, 0.52, 10), HAN.red, 0, 1.22, 0), P(G.box(0.44, 0.34, 0.33), HAN.red, 0, 1.28, 0), P(G.box(0.12, 0.34, 0.335), HAN.red2, 0.08, 1.28, 0, 0, 0, 0.25), ...[1, -1].map(s => P(G.sph(0.1, 8), K.iron, 0.25 * s, 1.42, 0, 0, 0, 0, 1, 0.75, 1)), P(G.cyl(0.06, 0.07, 0.1, 8), K.skin, 0, 1.5, 0), P(G.box(0.47, 0.09, 0.36), K.black, 0, 1.05, 0), P(G.box(0.1, 0.07, 0.04), HAN.gold, 0, 1.05, 0.19)], [0, 0.98, 0]);
        o.pelvis = mk([P(G.cyl(0.21, 0.34, 0.52, 10), HAN.red, 0, 0.78, 0), P(G.box(0.1, 0.5, 0.02), HAN.red2, 0, 0.78, 0.3)], [0, 0.9, 0]);
        o.head = head([P(G.cyl(0.11, 0.135, 0.13, 10), K.iron, 0, 1.69, 0), P(G.cone(0.045, 0.1, 6), K.iron, 0, 1.8, 0), P(G.cone(0.07, 0.22, 7), HAN.red, 0, 1.94, -0.02, 0.15), ...[1, -1].map(s => P(G.box(0.025, 0.12, 0.11), K.iron, 0.125 * s, 1.6, -0.01)), P(G.box(0.2, 0.1, 0.03), K.iron, 0, 1.6, -0.12)]);
        o.weapon = spear(HAN.red);
        o.shield = mk([P(G.box(0.46, 0.72, 0.05), HAN.red, 0, 0, 0), P(G.box(0.46, 0.05, 0.07), HAN.gold, 0, 0.34, 0), P(G.box(0.46, 0.05, 0.07), HAN.gold, 0, -0.34, 0), P(G.box(0.05, 0.72, 0.06), K.black, 0, 0, 0.01), P(G.sph(0.07, 8), K.iron, 0, 0.02, 0.04)]);
        legs(o, HAN.pants, K.boot); arms(o, HAN.red, K.iron); return o; },
      chu() { const o = {};
        o.upper = mk([P(G.cyl(0.19, 0.18, 0.52, 10), CHU.robe, 0, 1.22, 0), P(G.box(0.42, 0.38, 0.32), 0x5a3a26, 0, 1.25, 0), P(G.box(0.425, 0.03, 0.325), CHU.ochre, 0, 1.08, 0), ...[0, 1, 2].map(i => P(G.box(0.03, 0.03, 0.33), 0x2c1f16, -0.12 + i * 0.12, 1.25, 0.005)), ...[1, -1].map(s => P(G.sph(0.085, 8), K.skin, 0.24 * s, 1.42, 0)), P(G.cyl(0.06, 0.07, 0.1, 8), K.skin, 0, 1.5, 0), P(G.box(0.46, 0.05, 0.35), K.black, 0, 1.04, 0)], [0, 0.98, 0]);
        o.pelvis = mk([P(G.cyl(0.2, 0.28, 0.34, 10), CHU.robe, 0, 0.87, 0)], [0, 0.9, 0]);
        o.head = head([P(G.sph(0.132, 10), K.black, 0, 1.65, -0.02, 0, 0, 0, 1, 0.75, 1.05), P(G.box(0.27, 0.035, 0.27), K.black, 0, 1.67, -0.01), P(G.sph(0.045, 6), K.black, 0, 1.68, -0.15), ...[1, -1].map(s => P(G.box(0.05, 0.36, 0.012), K.black, 0.04 * s, 1.5, -0.17, -0.35, 0, 0.12 * s)), P(G.box(0.28, 0.02, 0.005), CHU.lac, 0, 1.69, 0.125)]);
        o.weapon = ji(CHU.lac);
        o.shield = mk([P(G.cyl(0.27, 0.27, 0.05, 20), CHU.robe, 0, 0, 0, PI / 2), P(new THREE.TorusGeometry(0.2, 0.025, 6, 24), CHU.lac, 0, 0, 0.03), P(new THREE.TorusGeometry(0.12, 0.022, 6, 20), CHU.lac, 0, 0, 0.03), P(new THREE.TorusGeometry(0.255, 0.015, 6, 24), CHU.ochre, 0, 0, 0.03), P(G.sph(0.045, 8), K.bronze, 0, 0, 0.035)]);
        legs(o, CHU.pants, K.boot, 0x6a5a44); arms(o, 0x5a3a26, 0x5a3a26, true); return o; },
    },
    c: {
      name: '丙 · 重甲对轻装', note: '一重一轻：汉兵铁盔带护颊护颈，札甲一直披到大腿，扛一面齐胸高的大橹盾，像一堵墙；楚卒短褐裹腿、皮帽插一根长雉翎，小圆盾、长戟，身形瘦长灵活。',
      han() { const o = {};
        o.upper = mk([P(G.cyl(0.21, 0.2, 0.52, 10), HAN.red, 0, 1.22, 0), ...lamellar(0.47, 0.44, 0.36, 1.02, 7, K.iron, HAN.cord), ...[1, -1].flatMap(s => lamellar(0.19, 0.18, 0.24, 1.32, 3, K.iron, HAN.cord).map(p => (p.m.premultiply(new THREE.Matrix4().makeTranslation(0.27 * s, 0, 0)), p))), P(G.cyl(0.075, 0.085, 0.12, 8), K.iron, 0, 1.5, 0)], [0, 0.98, 0]);
        o.pelvis = mk([P(G.cyl(0.21, 0.3, 0.36, 10), HAN.red, 0, 0.84, 0), ...lamellar(0.5, 0.3, 0.42, 0.66, 4, K.iron, HAN.cord).map(p => p)], [0, 0.9, 0]);
        o.head = head([P(G.cyl(0.115, 0.14, 0.14, 10), K.iron, 0, 1.69, 0), P(G.sph(0.03, 6), HAN.gold, 0, 1.78, 0), P(G.cone(0.04, 0.1, 6), HAN.red, 0, 1.84, 0), ...[1, -1].map(s => P(G.box(0.03, 0.16, 0.12), K.iron, 0.125 * s, 1.58, 0.02)), P(G.box(0.26, 0.16, 0.04), K.iron, 0, 1.56, -0.12), P(G.box(0.25, 0.025, 0.25), HAN.gold, 0, 1.63, 0)]);
        o.weapon = spear(HAN.red);
        o.shield = mk([P(G.box(0.58, 0.98, 0.06), HAN.red2, 0, -0.08, 0), P(G.box(0.5, 0.9, 0.02), HAN.red, 0, -0.08, 0.035), ...[0.25, -0.05, -0.35].map(y => P(G.box(0.58, 0.035, 0.075), K.iron, 0, y, 0.01)), P(G.sph(0.08, 8), K.iron, 0, 0, 0.05)]);
        legs(o, HAN.pants, K.boot); arms(o, HAN.red, K.iron); return o; },
      chu() { const o = {};
        o.upper = mk([P(G.cyl(0.18, 0.17, 0.52, 10), 0x4a3a2e, 0, 1.22, 0), P(G.box(0.4, 0.36, 0.3), 0x4a3a2e, 0, 1.27, 0), P(G.box(0.12, 0.38, 0.305), CHU.robe, -0.06, 1.27, 0, 0, 0, -0.35), P(G.cyl(0.06, 0.07, 0.1, 8), K.skin, 0, 1.5, 0), P(G.box(0.42, 0.05, 0.32), CHU.lac, 0, 1.04, 0), P(G.box(0.05, 0.22, 0.01), CHU.lac, 0.08, 0.95, 0.165)], [0, 0.98, 0]);
        o.pelvis = mk([P(G.cyl(0.19, 0.25, 0.3, 10), 0x4a3a2e, 0, 0.88, 0)], [0, 0.9, 0]);
        o.head = head([P(G.sph(0.128, 10), 0x6a4a30, 0, 1.65, -0.01, 0, 0, 0, 1, 0.68, 1), P(G.cyl(0.14, 0.14, 0.02, 12), 0x6a4a30, 0, 1.64, -0.01), P(G.box(0.022, 0.6, 0.008), CHU.feather, -0.05, 1.98, -0.08, -0.35, 0, 0.25), P(G.box(0.024, 0.15, 0.009), 0x2b2620, -0.12, 2.26, -0.2, -0.35, 0, 0.25)]);
        o.weapon = mk([P(G.cyl(0.016, 0.018, 2.8, 6), 0x5a3d26, 0, 0.7, 0), P(G.cone(0.038, 0.26, 4), K.metal, 0, 2.23, 0, 0, PI / 4, 0, 1, 1, 0.35), P(G.box(0.22, 0.045, 0.012), K.metal, 0.11, 2.02, 0, 0, 0, -0.2), P(G.cone(0.055, 0.12, 7), HAN.red, 0, 1.9, 0, PI)]);
        o.shield = mk([P(G.cyl(0.21, 0.21, 0.045, 18), CHU.lac, 0, 0, 0, PI / 2), P(new THREE.TorusGeometry(0.19, 0.016, 6, 22), CHU.ochre, 0, 0, 0.025), P(G.sph(0.05, 8), K.bronze, 0, 0, 0.03)]);
        legs(o, 0x3a3028, K.boot, 0xb8a888); arms(o, 0x4a3a2e, 0xb8a888); return o; },
    },
  };
  // ---------- 展台：每套一个画面，汉兵在左、楚卒在右，各自原地慢转，带呼吸 ----------
  const STANCE = (s) => ({ px: 0, side: 0, py: 0, crouch: 0.1, lean: 0.06, twist: 0.18, sway: 0, fL: 0.2, fR: -0.18, liftL: 0, liftR: 0, wp: [0.3, 1.2, 0.18], wd: [0.05, 1.25], g: 0.5, sp: [-0.3, 1.12, 0.3], sd: [0, 0], hx: 0, hy: 0, fall: 0 });
  const stages = [];
  for (const key of ['a', 'b', 'c']) {
    const cv = document.getElementById('cv_' + key), D = DESIGNS[key];
    const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); R.setPixelRatio(Math.min(2, devicePixelRatio)); R.shadowMap.enabled = true; R.outputColorSpace = THREE.SRGBColorSpace;
    const S = new THREE.Scene(); S.background = new THREE.Color(0x2b2722);
    S.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4a38, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(2, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); S.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshToonMaterial({ color: 0xd8b98a, gradientMap: grad })); ground.rotation.x = -PI / 2; ground.receiveShadow = true; S.add(ground);
    const cam = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 40); cam.position.set(0, 1.45, 6.2); cam.lookAt(0, 1.15, 0);
    const han = new Soldier(D.han()), chu = new Soldier(D.chu());
    han.root.position.set(-0.75, 0, 0); chu.root.position.set(0.75, 0, 0); S.add(han.root, chu.root);
    stages.push({ R, S, cam, cv, figs: [[han, 1], [chu, -1]] });
  }
  let t = 0, last = performance.now(), spin = true;
  document.getElementById('spin').onclick = e => { spin = !spin; e.currentTarget.classList.toggle('on', spin); e.currentTarget.textContent = spin ? '转动中' : '已停'; };
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (spin) t += dt;
    for (const st of stages) {
      const w = st.cv.clientWidth, h = st.cv.clientHeight, pr = st.R.getPixelRatio();
      if (st.cv.width !== Math.round(w * pr) || st.cv.height !== Math.round(h * pr)) { st.R.setSize(w, h, false); st.cam.aspect = w / h; st.cam.updateProjectionMatrix(); }
      for (const [f, s] of st.figs) { const j = STANCE(); j.crouch += Math.sin(t * 2.2 + s) * 0.01; j.hy = Math.sin(t * 0.7 + s) * 0.15; f.root.rotation.y = 0.5 * s + t * 0.45 * (spin ? 1 : 0); f.pose(j); }
      st.R.render(st.S, st.cam);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__setT = v => { t = v; };
