// ===== 模型：可动士兵（实例化骨架）、战马、骑兵、战车、铜炮、战象、渡船、项羽刘邦骨架、旌旗 =====
const Models = (() => {
  const { toon, inked, merge, M4, outlineShared, outlineMat, rnd } = Core;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const vcMat = toon(0xffffff, { vertexColors: true });
  // 金色部件的金属质感：顶点色落在“金”的范围里的面，不再按卡通漫反射画，改成会映出天光、带一道柔光箱亮带和边缘泛光的金属
  vcMat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `{
      vec3 vc = vColor.rgb; float vr = max(vc.r, 1e-3);
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
  vcMat.customProgramCacheKey = () => 'vcGold';

  const SIDE = {
    r: { cloth: 0xa8321f, cloth2: 0xc4553a, armor: 0x4d4541, trim: 0xc9a045, flag: 0xb0301f, tassel: 0xc0412c, horse: 0x6b4a34, barding: 0x5e2a20 },
    b: { cloth: 0x2a292c, cloth2: 0x48464a, armor: 0x2f2e31, trim: 0x9c8a62, flag: 0x1f1e20, tassel: 0x7a2418, horse: 0x2c2a2a, barding: 0x262528 },
    // 中立看客：本色麻布、皮甲
    n: { cloth: 0x8f7d5e, cloth2: 0xb09c78, armor: 0x5f4e3a, trim: 0xc2a46a, flag: 0x8f7d5e, tassel: 0x4f6a5c, horse: 0x6b4a34, barding: 0x5a4a38 },
  };
  const C = { skin: 0xd8bf98, pants: 0x2d2a27, wood: 0x6e4a2c, metal: 0xb8b4aa, dark: 0x1d1c1b, bronze: 0x7a6238, hair: 0x151413, white: 0xece4d2, ivory: 0xe8dcc0, gold: 0xb08a3a };

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
    g.userData.geo = geo;
    return g;
  }
  const keep = g => { g.userData.keep = true; return g; };
  function jiShape() { // 戟的月牙刃
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.quadraticCurveTo(0.28, 0.05, 0.3, 0.26); s.quadraticCurveTo(0.2, 0.12, 0.02, 0.12); s.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  }
  function daoBlade(len = 0.72, w = 0.2) { // 长柄大刀的刀头（偃月形）
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(0.05, 0);
    s.quadraticCurveTo(w * 1.1, len * 0.35, w * 0.9, len * 0.8);
    s.quadraticCurveTo(w * 0.7, len * 1.02, 0.02, len * 1.05);
    s.quadraticCurveTo(-0.03, len * 0.6, -0.04, len * 0.3);
    s.lineTo(-0.1, len * 0.22); s.lineTo(-0.04, len * 0.15); s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: false });
    g.translate(0, 0, -0.011);
    return g;
  }

  // ======================================================================
  //  可动士兵：部件分拆 + 实例化
  // ======================================================================
  // 人体坐标：脚底 y=0，面向 +Z；持兵器手在 +X 侧
  const PIV = {
    hip: V(0, 0.9, 0), legL: V(0.1, 0.86, 0), legR: V(-0.1, 0.86, 0),
    head: V(0, 0.6, 0), armW: V(0.27, 0.52, 0), armS: V(-0.27, 0.52, 0),
    hand: V(0.02, -0.49, 0.03), handS: V(-0.02, -0.46, 0.06),
  };
  const PARTS = ['body', 'head', 'legL', 'legR', 'armW', 'weapon', 'armS', 'shield'];
  const partCache = {};
  function mk(parts, pivot) { const g = merge(parts); if (pivot) g.translate(-pivot.x, -pivot.y, -pivot.z); g.userData.keep = true; return g; }
  function soldierPartGeos(side, kind) {
    const key = side + kind;
    if (partCache[key]) return partCache[key];
    // 斩马刀手（兵法四级兵）：通身金甲
    const c = kind === 'zhanma' || kind === 'guardG' || kind === 'xbowG' ? { ...SIDE[side], armor: 0xd6a43e, trim: 0xf3d27a } : SIDE[side];
    const xbG = kind === 'xbowG';
    const GT = kind === 'guardG' ? 0xf7dc8c : SIDE[side].trim;   // 禁卫甲胄上的金饰
    const isGuard = kind === 'guard' || kind === 'guardG', goldG = kind === 'guardG';
    const helmet = kind === 'crew'
      ? [P(G.sph(0.13, 7), 0x5b5147, 0, 1.66, -0.01, 0, 0, 0, 1, 0.75, 1), P(G.cone(0.05, 0.14, 5), 0x5b5147, 0, 1.63, -0.14, 1.8)]
      : [P(G.cyl(0.1, 0.14, 0.14, 8), c.armor, 0, 1.68, 0), P(G.cone(0.05, 0.12, 5), c.armor, 0, 1.8, 0), P(G.cone(0.05, 0.1, 5), c.tassel, 0, 1.86, -0.02, 0.4),
        P(G.box(0.03, 0.1, 0.1), c.armor, 0.12, 1.6, -0.01), P(G.box(0.03, 0.1, 0.1), c.armor, -0.12, 1.6, -0.01)];
    const hip = PIV.hip, sh = V(0, 0.9, 0);
    const out = {
      body: mk([
        P(G.cyl(0.21, 0.3, 0.36, 8), c.armor, 0, 0.86, 0),
        P(G.cyl(0.2, 0.19, 0.52, 8), c.cloth, 0, 1.22, 0),
        P(G.box(0.44, 0.36, 0.34), kind === 'crew' ? c.cloth2 : c.armor, 0, 1.26, 0),
        P(G.box(0.46, 0.05, 0.36), C.dark, 0, 1.05, 0),
        P(G.box(0.12, 0.12, 0.04), c.trim, 0, 1.3, 0.18),
        P(G.sph(0.1, 6), c.armor, 0.25, 1.42, 0, 0, 0, 0, 1, 0.8, 1), P(G.sph(0.1, 6), c.armor, -0.25, 1.42, 0, 0, 0, 0, 1, 0.8, 1),
        P(G.cyl(0.06, 0.07, 0.1, 6), C.skin, 0, 1.5, 0),
        // 禁卫（士）：重札甲——宽大的兽吞肩甲、护心镜、三层裙甲、身后一领大氅
        ...(isGuard ? [
          P(G.sph(0.17, 7), c.armor, 0.3, 1.45, 0, 0, 0, 0, 1.15, 0.75, 1.1), P(G.sph(0.17, 7), c.armor, -0.3, 1.45, 0, 0, 0, 0, 1.15, 0.75, 1.1),
          P(G.cone(0.05, 0.16, 5), GT, 0.42, 1.52, 0, 0, 0, -1.1), P(G.cone(0.05, 0.16, 5), GT, -0.42, 1.52, 0, 0, 0, 1.1),
          P(G.box(0.36, 0.05, 0.3), GT, 0.3, 1.36, 0), P(G.box(0.36, 0.05, 0.3), GT, -0.3, 1.36, 0),
          P(G.cyl(0.1, 0.1, 0.03, 10), GT, 0, 1.27, 0.185, Math.PI / 2), P(G.sph(0.045, 6), 0xb0301f, 0, 1.27, 0.2),
          P(G.cyl(0.27, 0.36, 0.16, 8), c.armor, 0, 0.98, 0), P(G.cyl(0.3, 0.4, 0.16, 8), goldG ? 0xc4922e : c.cloth2, 0, 0.84, 0), P(G.cyl(0.33, 0.43, 0.14, 8), c.armor, 0, 0.71, 0),
          P(G.cyl(0.275, 0.275, 0.03, 8), GT, 0, 1.06, 0), P(G.cyl(0.41, 0.41, 0.025, 8), GT, 0, 0.64, 0),
          P(G.box(0.5, 0.95, 0.04), goldG ? 0x8e1c12 : (side === 'r' ? 0x7a1c12 : 0x18171a), 0, 0.92, -0.24, 0.16), P(G.box(0.52, 0.06, 0.06), GT, 0, 1.4, -0.19),
        ] : []),
      ], hip),
      head: mk([P(G.sph(0.12, 8), C.skin, 0, 1.6, 0), P(G.box(0.12, 0.02, 0.02), C.hair, 0, 1.62, 0.115), ...helmet,
        // 禁卫的兜鍪：护颊加宽、额前兽面、两支上扬的翎角、一束高缨
        ...(isGuard ? [
          P(G.cyl(0.125, 0.16, 0.1, 8), c.armor, 0, 1.62, -0.01), P(G.box(0.04, 0.16, 0.14), c.armor, 0.135, 1.57, 0), P(G.box(0.04, 0.16, 0.14), c.armor, -0.135, 1.57, 0),
          P(G.box(0.1, 0.07, 0.03), GT, 0, 1.71, 0.125), P(G.cone(0.02, 0.07, 4), GT, 0, 1.64, 0.13, Math.PI),
          P(G.cone(0.03, 0.3, 5), GT, 0.11, 1.86, -0.02, 0, 0, -0.5), P(G.cone(0.03, 0.3, 5), GT, -0.11, 1.86, -0.02, 0, 0, 0.5),
          P(G.cyl(0.02, 0.025, 0.16, 5), GT, 0, 1.9, -0.02), P(G.cone(0.075, 0.36, 6), 0xb0301f, 0, 2.08, -0.07, 0.35),
        ] : [])], V(0, 1.5, 0)),
      legL: mk([P(G.box(0.14, 0.8, 0.16), C.pants, 0.1, 0.46, 0), P(G.cyl(0.085, 0.075, 0.3, 6), c.armor, 0.1, 0.28, 0.01), P(G.box(0.16, 0.1, 0.26), C.dark, 0.1, 0.05, 0.04)], PIV.legL),
      legR: mk([P(G.box(0.14, 0.8, 0.16), C.pants, -0.1, 0.46, 0), P(G.cyl(0.085, 0.075, 0.3, 6), c.armor, -0.1, 0.28, 0.01), P(G.box(0.16, 0.1, 0.26), C.dark, -0.1, 0.05, 0.04)], PIV.legR),
      armW: mk([P(G.box(0.1, 0.5, 0.11), c.cloth, 0.28, 1.17, 0), P(G.cyl(0.055, 0.05, 0.16, 6), c.armor, 0.28, 1.03, 0), P(G.sph(0.055, 6), C.skin, 0.29, 0.93, 0.02)], V(0.27, 1.42, 0)),
      armS: mk([P(G.box(0.1, 0.5, 0.11), c.cloth, -0.28, 1.17, 0), P(G.cyl(0.055, 0.05, 0.16, 6), c.armor, -0.28, 1.03, 0), P(G.sph(0.055, 6), C.skin, -0.29, 0.93, 0.02)], V(-0.27, 1.42, 0)),
    };
    // 兵器（握点为原点，沿 +Y）
    const tas = side === 'b' ? 0x5a1a14 : 0xb0301f;
    if (kind === 'spear') out.weapon = mk([P(G.cyl(0.018, 0.02, 2.5, 5), C.wood, 0, 0.55, 0), P(G.cone(0.042, 0.26, 5), C.metal, 0, 1.93, 0), P(G.cone(0.06, 0.12, 6), tas, 0, 1.76, 0, Math.PI)]);
    else if (isGuard) out.weapon = mk([P(G.cyl(0.022, 0.026, 2.1, 5), 0x3a2416, 0, 0.5, 0), P(G.cyl(0.035, 0.03, 0.08, 6), GT, 0, 1.52, 0), P(G.box(0.05, 0.78, 0.2), goldG ? 0xf3d27a : C.metal, 0, 1.94, 0.05), P(G.box(0.04, 0.3, 0.14), goldG ? 0xf3d27a : C.metal, 0, 2.42, 0.02, -0.25), P(G.box(0.06, 0.05, 0.3), GT, 0, 1.58, 0.04), P(G.cone(0.06, 0.16, 6), 0xb0301f, 0, 1.44, 0, Math.PI), P(G.cone(0.035, 0.1, 5), GT, 0, -0.58, 0, Math.PI)]);
    else if (kind === 'sword') out.weapon = mk([P(G.cyl(0.02, 0.02, 0.2, 5), C.wood, 0, 0.02, 0), P(new THREE.TorusGeometry(0.04, 0.012, 4, 8), C.bronze, 0, -0.12, 0), P(G.box(0.12, 0.03, 0.05), C.bronze, 0, 0.13, 0), P(G.box(0.035, 0.8, 0.075), C.metal, 0, 0.54, 0.012)]);
    else if (kind === 'halberd') out.weapon = mk([P(G.cyl(0.02, 0.022, 2.6, 5), C.wood, 0, 0.6, 0), P(G.cone(0.045, 0.3, 5), C.metal, 0, 2.05, 0), { geo: jiShape(), color: C.metal, m: M4(0, 1.62, -0.01) }, P(G.cone(0.06, 0.14, 6), tas, 0, 1.8, 0, Math.PI)]);
    else if (xbG) out.weapon = mk([P(G.box(0.07, 0.95, 0.07), 0x5a3418, 0, 0.22, 0), P(new THREE.TorusGeometry(0.46, 0.03, 4, 14, Math.PI * 0.8), 0xd6a43e, 0, 0.66, 0.0, 0, 0, Math.PI * 0.1), P(G.box(0.94, 0.008, 0.008), C.white, 0, 0.63, 0), P(G.box(0.06, 0.14, 0.07), 0xf3d27a, 0, 0.05, 0.03), P(G.cone(0.03, 0.2, 5), 0xf7dc8c, 0, 0.8, 0)]);
    else if (kind === 'xbow') out.weapon = mk([P(G.box(0.06, 0.75, 0.06), C.wood, 0, 0.18, 0), P(new THREE.TorusGeometry(0.34, 0.02, 4, 12, Math.PI * 0.8), C.wood, 0, 0.52, 0.0, 0, 0, Math.PI * 0.1), P(G.box(0.7, 0.006, 0.006), C.white, 0, 0.5, 0), P(G.box(0.04, 0.1, 0.05), C.bronze, 0, 0.05, 0.03)]);
    else if (kind === 'archer') out.weapon = mk([P(G.cyl(0.006, 0.006, 0.8, 3), C.wood, 0, 0.3, 0), P(G.cone(0.015, 0.06, 4), C.dark, 0, 0.72, 0)]);
    else if (kind === 'crew') out.weapon = mk([P(G.cyl(0.02, 0.02, 2.0, 5), C.wood, 0, 0.5, 0), P(G.cyl(0.07, 0.07, 0.16, 7), 0x6e675b, 0, 1.5, 0)]);
    else if (kind === 'zhanma') out.weapon = mk([P(G.cyl(0.02, 0.022, 1.5, 5), C.wood, 0, 0.35, 0), P(new THREE.TorusGeometry(0.045, 0.014, 4, 8), C.bronze, 0, 1.1, 0), P(G.box(0.05, 0.92, 0.13), C.metal, 0, 1.58, 0.03), P(G.box(0.03, 0.14, 0.09), C.metal, 0, 2.07, 0.07), P(G.cone(0.05, 0.12, 6), tas, 0, 1.04, 0, Math.PI)]);
    else if (kind === 'banner') out.weapon = mk([P(G.cyl(0.022, 0.026, 3.0, 5), C.wood, 0, 0.9, 0), P(G.cone(0.05, 0.18, 5), C.gold, 0, 2.48, 0)]);
    // 盾（腕部为原点）
    if (kind === 'spear') out.shield = mk([P(G.box(0.46, 0.72, 0.05), c.cloth2, 0, 0.08, 0.04), P(G.box(0.38, 0.62, 0.052), c.cloth, 0, 0.08, 0.042), P(G.sph(0.07, 6), C.metal, 0, 0.1, 0.07), P(G.box(0.46, 0.04, 0.055), c.trim, 0, 0.42, 0.04), P(G.box(0.46, 0.04, 0.055), c.trim, 0, -0.26, 0.04)]);
    else if (kind === 'sword') out.shield = mk([P(G.cyl(0.3, 0.3, 0.05, 12), c.cloth2, 0, 0.05, 0.05, Math.PI / 2), P(new THREE.TorusGeometry(0.3, 0.02, 4, 16), c.trim, 0, 0.05, 0.075), P(G.sph(0.08, 6), C.metal, 0, 0.05, 0.09)]);
    else if (kind === 'zhanma') out.shield = mk([P(G.box(0.62, 1.02, 0.06), c.cloth2, 0, 0.12, 0.05), P(G.box(0.52, 0.92, 0.062), 0xb8862e, 0, 0.12, 0.052), P(G.sph(0.09, 6), 0xf3d27a, 0, 0.16, 0.09), P(G.box(0.62, 0.05, 0.066), 0xf3d27a, 0, 0.62, 0.05), P(G.box(0.62, 0.05, 0.066), 0xf3d27a, 0, -0.38, 0.05), P(G.box(0.05, 0.92, 0.066), 0xf3d27a, 0, 0.12, 0.05)]);
    else if (isGuard) {
      // 巨盾：比人略高的塔盾，盾面满布尖刺，正中一枚大盾钉，盾顶一排短刺；四级通体鎏金
      const plate = goldG ? 0x8a6418 : c.cloth2, face = goldG ? 0xd6a43e : c.cloth, rim = goldG ? 0xf3d27a : c.trim, spike = goldG ? 0xf7dc8c : C.metal;
      const ps = [P(G.box(0.94, 1.92, 0.07), plate, 0, 0.14, 0.05), P(G.box(0.8, 1.76, 0.074), face, 0, 0.14, 0.052),
        P(G.box(0.94, 0.07, 0.085), rim, 0, 1.08, 0.05), P(G.box(0.94, 0.07, 0.085), rim, 0, -0.8, 0.05), P(G.box(0.07, 1.92, 0.085), rim, 0.45, 0.14, 0.05), P(G.box(0.07, 1.92, 0.085), rim, -0.45, 0.14, 0.05),
        P(G.box(0.8, 0.05, 0.08), rim, 0, 0.62, 0.05), P(G.box(0.8, 0.05, 0.08), rim, 0, -0.34, 0.05),
        P(G.sph(0.15, 8), rim, 0, 0.14, 0.09, 0, 0, 0, 1, 1, 0.6), P(G.cone(0.075, 0.42, 6), spike, 0, 0.14, 0.33, Math.PI / 2)];
      for (const x of [-0.26, 0.26]) for (const y of [-0.58, -0.1, 0.38, 0.86]) ps.push(P(G.cone(0.05, 0.28, 5), spike, x, y, 0.22, Math.PI / 2), P(G.cyl(0.06, 0.06, 0.02, 6), rim, x, y, 0.09, Math.PI / 2));
      for (const x of [-0.32, 0, 0.32]) ps.push(P(G.cone(0.045, 0.2, 5), spike, x, 1.2, 0.05));
      if (goldG) ps.push(P(G.box(0.3, 0.3, 0.08), 0xb0301f, 0, 0.86, 0.05, 0, 0, Math.PI / 4), P(G.box(0.3, 0.3, 0.08), 0xb0301f, 0, -0.58, 0.05, 0, 0, Math.PI / 4));
      out.shield = mk(ps);
    }
    else if (kind === 'archer') out.shield = mk([P(new THREE.TorusGeometry(0.55, 0.02, 4, 18, Math.PI * 0.8), C.wood, 0, 0.0, 0.05, 0, Math.PI / 2, -Math.PI * 0.4), P(G.cyl(0.004, 0.004, 0.95, 3), C.white, 0, 0.0, -0.07)]);
    partCache[key] = out;
    return out;
  }
  // 每种兵的姿势参数（绝对兵器俯仰 wAbs：0 竖直向上，π/2 水平向前）
  const KIND_POSE = {
    spear: { aW: -0.25, wAbs: 0, aS: -0.5, sAbs: 0, chargeW: -1.15, chargeAbs: Math.PI / 2 },
    halberd: { aW: -0.25, wAbs: 0, aS: 0.05, sAbs: 0, chargeW: -1.1, chargeAbs: 1.3 },
    zhanma: { aW: -0.3, wAbs: 0.15, aS: -0.55, sAbs: 0, chargeW: -1.2, chargeAbs: 1.25 },
    sword: { aW: -0.35, wAbs: 0.6, aS: -0.5, sAbs: 0, chargeW: -2.3, chargeAbs: -0.4 },
    guard: { aW: -0.3, wAbs: 0.06, aS: -0.42, sAbs: 0, chargeW: -1.3, chargeAbs: 1.15 },
    guardG: { aW: -0.3, wAbs: 0.06, aS: -0.42, sAbs: 0, chargeW: -1.3, chargeAbs: 1.15 },
    xbow: { aW: -0.55, wAbs: 0.7, aS: -0.55, sAbs: 0, chargeW: -1.45, chargeAbs: Math.PI / 2 },
    xbowG: { aW: -0.55, wAbs: 0.7, aS: -0.55, sAbs: 0, chargeW: -1.45, chargeAbs: Math.PI / 2 },
    archer: { aW: -0.15, wAbs: 0, aS: -0.2, sAbs: 0, chargeW: -0.3, chargeAbs: 0.2 },
    crew: { aW: -0.3, wAbs: 0.1, aS: 0.05, sAbs: 0, chargeW: -1.2, chargeAbs: Math.PI / 2 },
    banner: { aW: -0.35, wAbs: 0, aS: 0.05, sAbs: 0, chargeW: -0.6, chargeAbs: 0.25 },
  };
  const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _t = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3();
  const tr = (m, x, y, z) => m.multiply(_t.makeTranslation(x, y, z));
  const rot = (m, x, y, z) => m.multiply(_r.makeRotationFromEuler(_e.set(x, y, z)));
  // 由关节值计算各部件矩阵（局部 → 世界：先乘 root）
  function poseMatrices(root, J, out) {
    const hip = out.body.copy(root); tr(hip, 0, 0.9 - J.crouch, 0); rot(hip, J.lean, J.twist, J.sway);
    out.head.copy(hip); tr(out.head, 0, 0.6, 0); rot(out.head, J.hx, J.hy, 0);
    out.legL.copy(root); tr(out.legL, 0.1, 0.86 - J.crouch, 0); rot(out.legL, J.lL, 0, J.lLz);
    out.legR.copy(root); tr(out.legR, -0.1, 0.86 - J.crouch, 0); rot(out.legR, J.lR, 0, -J.lLz);
    out.armW.copy(hip); tr(out.armW, 0.27, 0.52, 0); rot(out.armW, J.aW, 0, J.aWz);
    out.weapon.copy(out.armW); tr(out.weapon, 0.02, -0.49, 0.03); rot(out.weapon, J.wAbs - J.aW - J.lean, 0, J.wz || 0);
    out.armS.copy(hip); tr(out.armS, -0.27, 0.52, 0); rot(out.armS, J.aS, 0, J.aSz);
    out.shield.copy(out.armS); tr(out.shield, -0.02, -0.46, 0.06); rot(out.shield, J.sAbs - J.aS - J.lean, 0, 0);
    return out;
  }
  const newJ = kp => ({ crouch: 0, lean: 0, twist: 0, sway: 0, hx: 0, hy: 0, lL: 0, lR: 0, lLz: 0, aW: kp.aW, aWz: 0.05, wAbs: kp.wAbs, wz: 0, aS: kp.aS, aSz: -0.05, sAbs: kp.sAbs });
  const JKEYS = ['crouch', 'lean', 'twist', 'sway', 'hx', 'hy', 'lL', 'lR', 'lLz', 'aW', 'aWz', 'wAbs', 'wz', 'aS', 'aSz', 'sAbs'];

  class Troop {
    constructor(side, kind, count, scale = 0.2, opts = {}) {
      this.side = side; this.kind = kind; this.count = count; this.scale = scale;
      this.kp = KIND_POSE[kind] || KIND_POSE.spear;
      const geos = soldierPartGeos(side, kind);
      this.group = new THREE.Group();
      this.meshes = {}; this.outlines = {};
      const q = Core.quality;
      const outline = opts.outline !== false && q !== 'low';
      for (const p of PARTS) {
        if (!geos[p]) continue;
        const m = new THREE.InstancedMesh(geos[p], vcMat, count);
        m.frustumCulled = false; m.castShadow = opts.shadow !== false && q === 'high';
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        for (let i = 0; i < count; i++) m.setColorAt(i, new THREE.Color(1, 1, 1));
        this.group.add(m); this.meshes[p] = m;
        if (outline && (q === 'high' || p === 'body' || p === 'weapon' || p === 'shield' || p === 'head')) {
          const o = new THREE.InstancedMesh(geos[p], outlineShared, count);
          o.frustumCulled = false; o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          this.group.add(o); this.outlines[p] = o;
        }
      }
      this.units = [];
      for (let i = 0; i < count; i++) this.units.push({
        i, p: new THREE.Vector3(), yaw: 0, y: 0, s: 1, vis: 1, phase: rnd() * 6, ph: rnd() * 6,
        pose: 'idle', act: null, actT: 0, actDur: 0.4, J: newJ(this.kp), lean: 0,
        fall: 0, fallDir: 0, falling: false, dead: false, lost: 0, fly: null, tintK: 0, tint: new THREE.Color(1, 1, 1), speedK: 1, spin: 0,
      });
      this.mats = {}; for (const p of PARTS) this.mats[p] = new THREE.Matrix4();
      this.t = 0;
      this._root = new THREE.Matrix4();
      this.gait = null; // 兼容旧接口：'march' | 'run' | 'still' | 'idle'
    }
    get gait() { return this._gait; }
    set gait(g) { this._gait = g; if (!g || !this.units) return; const map = { march: 'march', run: 'run', still: 'idle', idle: 'idle' }; for (const u of this.units) if (!u.dead) u.pose = map[g] || g; }
    setPose(pose, idx) { for (const u of idx == null ? this.units : [this.units[idx]]) if (!u.dead) u.pose = pose; }
    act(i, type, dur = 0.4, delay = 0) { const u = this.units[i]; if (u.dead) return; u.act = type; u.actT = -delay; u.actDur = dur; }
    actAll(type, dur, spread = 0.15) { for (const u of this.units) this.act(u.i, type, dur, Math.random() * spread); }
    // 目标关节值
    target(u, t, dt) {
      const kp = this.kp, J = { ...u.J };
      let walk = 0, rate = 1.6;
      const T = t + u.phase;
      const set = o => Object.assign(J, o);
      switch (u.pose) {
        case 'idle': set({ crouch: 0, lean: 0.02, twist: Math.sin(T * 0.4) * 0.08, sway: 0, hx: 0, hy: Math.sin(T * 0.3) * 0.25, aW: kp.aW, wAbs: kp.wAbs, aS: kp.aS, sAbs: kp.sAbs, aWz: 0.05, aSz: -0.05 }); break;
        // 坐立不安：东张西望、挪重心、手里兵器攥了又松（倒计时最后几秒的本方观战士兵）
        case 'fidget': set({ crouch: 0.03 + 0.035 * Math.sin(T * 5.3), lean: 0.07 + 0.06 * Math.sin(T * 3.1), twist: Math.sin(T * 2.3) * 0.38, sway: Math.sin(T * 4.1) * 0.09, hx: 0.08 * Math.sin(T * 6.1), hy: Math.sin(T * 3.7) * 0.85, aW: kp.aW + 0.2 * Math.sin(T * 7.3), wAbs: kp.wAbs + 0.12 * Math.sin(T * 5.1), aS: kp.aS + 0.18 * Math.sin(T * 6.4), sAbs: kp.sAbs, aWz: 0.05, aSz: -0.05 }); break;
        case 'march': walk = 1; rate = 1.5; set({ crouch: 0, lean: 0.06, twist: 0, sway: 0, hx: 0, hy: 0, aW: kp.aW, wAbs: kp.wAbs, aS: kp.aS, sAbs: kp.sAbs }); break;
        case 'run': walk = 1.25; rate = 2.5; set({ crouch: 0.02, lean: 0.22, twist: 0, sway: 0, hx: -0.15, hy: 0, aW: kp.aW - 0.2, wAbs: kp.wAbs + 0.3, aS: kp.aS - 0.2, sAbs: kp.sAbs }); break;
        case 'charge': walk = 1.35; rate = 2.7; set({ crouch: 0.04, lean: 0.3, twist: 0, sway: 0, hx: -0.25, hy: 0, aW: kp.chargeW, wAbs: kp.chargeAbs, aS: -1.0, sAbs: 0.2 }); break;
        case 'brace': set({ crouch: 0.12, lean: 0.12, twist: 0, hx: -0.1, aW: kp.chargeW + 0.1, wAbs: kp.chargeAbs, aS: -1.25, sAbs: 0.05 }); break;
        case 'aim': set({ crouch: 0.05, lean: 0.05, aW: -1.45, wAbs: Math.PI / 2 - 0.05, aS: -1.45, aSz: 0.3, sAbs: 0, hx: 0.05 }); break;
        case 'aimUp': set({ crouch: 0.05, lean: -0.1, aW: -2.0, wAbs: Math.PI / 2 - 0.55, aS: -2.0, aSz: 0.3, sAbs: 0, hx: -0.25 }); break;
        case 'bow': set({ crouch: 0.02, lean: -0.05, aS: -1.55, aSz: 0.1, sAbs: -0.4, aW: -1.5, aWz: 0.9, wAbs: Math.PI / 2 - 0.3, hx: -0.2 }); break;
        case 'wave': {
          const w = Math.sin(T * 9);
          set({ crouch: 0, lean: -0.08, twist: Math.sin(T * 4.5) * 0.15, hx: -0.3, aW: -2.6 + w * 0.35, aWz: 0.2 + w * 0.15, wAbs: -0.1 + w * 0.35, aS: -1.6 + Math.sin(T * 9 + 1.5) * 0.3, sAbs: -0.2 });
          J.hop = Math.abs(Math.sin(T * 4.5)) * 0.1;
          break;
        }
        case 'push': walk = 0.8; rate = 1.2; set({ crouch: 0.1, lean: 0.55, hx: -0.5, aW: -1.3, wAbs: 0.2, aS: -1.3, sAbs: 0 }); break;
        case 'flee': walk = 1.5; rate = 3.1; set({ crouch: 0, lean: 0.35, hx: -0.2 + Math.sin(T * 3) * 0.3, hy: Math.sin(T * 1.7) * 0.8, aW: -0.6 + Math.sin(T * 6.2) * 0.9, aWz: 0.5, aS: -0.6 - Math.sin(T * 6.2) * 0.9, aSz: -0.5, wAbs: 0.5, sAbs: 0 }); break;
        case 'cower': set({ crouch: 0.25, lean: 0.5, hx: 0.5, aW: -2.4, aWz: -0.4, aS: -2.4, aSz: 0.4, wAbs: 0.5, sAbs: 0 }); break;
        case 'stagger': walk = 0.3; rate = 1; set({ crouch: 0.1, lean: -0.35, hx: -0.5, aW: 0.2, aWz: 0.6, aS: 0.2, aSz: -0.6 }); break;
        case 'dead': set({ crouch: 0, lean: 0, hx: 0.3, hy: 0.5, aW: -2.8, aWz: 0.4, aS: -2.6, aSz: -0.5, lLz: 0.25, wAbs: -1.0 }); break;
        case 'mourn': set({ crouch: 0.6, lean: 0.35, twist: Math.sin(T * 0.3) * 0.05, hx: 0.55, hy: Math.sin(T * 0.2) * 0.15, aW: -0.75, aWz: 0.15, wAbs: 0.45, aS: -0.7, aSz: -0.15, sAbs: 0.9 }); break;
        case 'laugh': {
          const k = Math.sin(T * 17);
          set({ crouch: 0.03 + Math.abs(k) * 0.03, lean: -0.2 + k * 0.06, twist: Math.sin(T * 2.6) * 0.18, sway: Math.sin(T * 2.6) * 0.05, hx: -0.5 + k * 0.1, hy: Math.sin(T * 2.6) * 0.2, aW: -0.55, aWz: 0.75, wAbs: 0.9, aS: -0.6, aSz: -0.75, sAbs: 0.4 });
          J.hop = Math.abs(k) * 0.03;
          break;
        }
        // 摇头：头左右摆，兵器垂下
        case 'shake': set({ crouch: 0.03, lean: 0.1, twist: 0, sway: 0, hx: 0.28, hy: Math.sin(T * 10) * 0.6, aW: kp.aW * 0.5, wAbs: kp.wAbs, aS: kp.aS * 0.5, sAbs: kp.sAbs }); break;
        // 垂头丧气：弯腰低头，双臂耷拉
        case 'slump': set({ crouch: 0.1, lean: 0.38, twist: 0, sway: 0, hx: 0.7, hy: Math.sin(T * 0.4) * 0.12, aW: 0.12, aWz: 0.08, wAbs: 0.7, aS: 0.12, aSz: -0.08, sAbs: 0.5 }); break;
        case 'ready': set({ crouch: 0.08, lean: 0.15, aW: kp.chargeW, wAbs: kp.chargeAbs, aS: -1.0, sAbs: 0.1, hx: -0.1 }); break;
      }
      // 一次性动作
      if (u.act && u.actT >= 0) {
        const q = Math.min(1, u.actT / u.actDur), s = Math.sin(q * Math.PI);
        switch (u.act) {
          case 'thrust': J.aW = kp.chargeW - 0.45 * s; J.lean += 0.25 * s; J.wAbs = kp.chargeAbs; J.crouch += 0.05 * s; break;
          case 'slash': { const up = q < 0.45 ? q / 0.45 : 1 - (q - 0.45) / 0.55 * 1.6; J.aW = -0.6 - 2.3 * Math.max(-0.2, up); J.wAbs = J.aW + 0.6; J.lean += q > 0.45 ? 0.35 * (1 - q) : -0.1; J.twist += q > 0.45 ? -0.4 * (1 - q) : 0.3 * q; break; }
          case 'hack': { const up = q < 0.35 ? q / 0.35 : Math.max(0, 1 - (q - 0.35) / 0.25); J.aW = -0.4 - 2.4 * up; J.wAbs = J.aW + 1.4; J.lean += 0.3 * (1 - up); break; }
          case 'shoot': J.aW += 0.2 * s; J.lean -= 0.1 * s; break;
          case 'loose': J.aWz = 0.9 + 0.6 * s; J.aW = -1.5 + 0.3 * s; break;
          case 'raise': J.aW = -2.5; J.wAbs = 0; break;
          case 'hit': J.lean -= 0.5 * s; J.hx -= 0.6 * s; J.aW += 0.6 * s; J.aS += 0.6 * s; break;
          case 'shieldBash': J.aS = -1.3 - 0.4 * s; J.lean += 0.3 * s; break;
        }
        if (q >= 1) u.act = null;
      }
      return { J, walk, rate };
    }
    update(dt) {
      this.t += dt;
      const kS = 1 - Math.exp(-dt * 14);
      for (let i = 0; i < this.count; i++) {
        const u = this.units[i];
        if (u.act) u.actT += dt;
        let walk = 0, rate = 1.5, tg = null;
        if (!u.dead) { tg = this.target(u, this.t, dt); walk = tg.walk * u.speedK; rate = tg.rate; }
        else tg = { J: u.J };
        const J = u.J;
        if (tg) for (const k of JKEYS) if (tg.J[k] !== undefined) J[k] += (tg.J[k] - J[k]) * (u.act && !u.dead ? 1 : kS);
        u.ph += dt * rate * Math.PI * 2 * (walk > 0 ? 1 : 0);
        const sw = Math.sin(u.ph);
        if (!u.dead) {
          const sit = u.pose === 'mourn' ? -1.4 : 0;
          J.lL = sw * 0.55 * walk + sit; J.lR = -sw * 0.55 * walk + sit;
          if (u.pose === 'march' || u.pose === 'run') { J.aS += -sw * 0.12 * walk; }
        }
        // 抛飞
        if (u.fly) {
          const f = u.fly;
          f.v.y -= f.g * dt;
          u.p.x += f.v.x * dt; u.p.z += f.v.z * dt; u.y += f.v.y * dt;
          u.spin += f.w * dt;
          if (u.y <= f.floor && f.v.y < 0) { u.y = f.floor; if (Math.abs(f.v.y) > 1) { f.v.y *= -0.25; f.v.x *= 0.5; f.v.z *= 0.5; f.w *= 0.4; } else { u.fly = null; } }
        }
        // 倒地
        if (u.falling) { u.fall = Math.min(1, u.fall + dt * (u.fallSpeed || 2.4)); if (u.fall >= 1) u.falling = false; }
        const bob = walk > 0 && !u.dead ? Math.abs(Math.cos(u.ph)) * 0.045 * walk : 0;
        // 根矩阵
        const s = this.scale * u.s * Math.max(0.0001, u.vis);
        const R = this._root;
        _v.set(u.p.x, u.p.y + u.y + (bob + (tg.J.hop || 0)) * this.scale, u.p.z);
        _q.setFromEuler(_e.set(0, u.yaw, 0));
        R.compose(_v, _q, _s.set(s, s, s));
        if (u.fall > 0 || u.spin) {
          const fd = u.fallDir - u.yaw;
          const e = u.fall < 1 ? 1 - Math.pow(1 - u.fall, 2) : 1;
          const bounce = u.fall >= 1 ? 0 : Math.sin(u.fall * Math.PI) * 0.0;
          _ax.set(Math.cos(fd), 0, -Math.sin(fd));
          R.multiply(_r.makeRotationAxis(_ax, e * 1.5 + u.spin + bounce));
          if (u.fall > 0) tr(R, -Math.sin(fd) * 0.16 * e, 0, -Math.cos(fd) * 0.16 * e);
        }
        poseMatrices(R, J, this.mats);
        for (const p in this.meshes) {
          const m = this.mats[p];
          if (u.lost & (1 << PARTS.indexOf(p))) m.makeScale(0, 0, 0);
          this.meshes[p].setMatrixAt(i, m);
          if (this.outlines[p]) this.outlines[p].setMatrixAt(i, m);
        }
      }
      for (const p in this.meshes) {
        this.meshes[p].instanceMatrix.needsUpdate = true;
        if (this.outlines[p]) this.outlines[p].instanceMatrix.needsUpdate = true;
      }
    }
    // 染色（烧焦、血染）
    tint(i, color, k = 1) {
      const u = this.units[i]; u.tint.set(1, 1, 1).lerp(new THREE.Color(color), k);
      for (const p in this.meshes) { this.meshes[p].setColorAt(i, u.tint); this.meshes[p].instanceColor.needsUpdate = true; }
    }
    // 某部件当前世界矩阵
    partMatrix(i, part) {
      const u = this.units[i];
      const R = new THREE.Matrix4();
      const s = this.scale * u.s * Math.max(0.0001, u.vis);
      R.compose(V(u.p.x, u.p.y + u.y, u.p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, u.yaw, 0)), V(s, s, s));
      if (u.fall > 0 || u.spin) { const fd = u.fallDir - u.yaw; R.multiply(new THREE.Matrix4().makeRotationAxis(V(Math.cos(fd), 0, -Math.sin(fd)), Math.min(1, u.fall) * 1.5 + u.spin)); }
      const out = {}; for (const p of PARTS) out[p] = new THREE.Matrix4();
      poseMatrices(R, u.J, out);
      return out[part];
    }
    worldPos(i, h = 1.2) { const u = this.units[i]; return V(u.p.x, u.p.y + u.y + h * this.scale * u.s, u.p.z); }
    // 拆下部件：返回一个独立的网格（由调用者负责物理），并隐藏实例中的该部件
    detach(i, part) {
      const geos = soldierPartGeos(this.side, this.kind);
      if (!geos[part]) return null;
      const u = this.units[i];
      const bit = 1 << PARTS.indexOf(part);
      if (u.lost & bit) return null;
      const m = this.partMatrix(i, part);
      u.lost |= bit;
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(geos[part], vcMat); mesh.castShadow = true;
      g.add(mesh, new THREE.Mesh(geos[part], outlineShared));
      m.decompose(g.position, g.quaternion, g.scale);
      return g;
    }
    kill(i, { dir = 0, speed = 2.4, fly = null, pose = 'dead' } = {}) {
      const u = this.units[i];
      if (u.dead) return;
      u.dead = true; u.pose = pose; u.act = null; u.fallDir = dir; u.falling = true; u.fallSpeed = speed;
      if (fly) u.fly = { v: fly.v.clone(), g: fly.g ?? 9, w: fly.w ?? 0, floor: fly.floor ?? 0 };
      // 死亡姿态（手脚摊开）
      Object.assign(u.J, { lLz: 0.2 + Math.random() * 0.2, aWz: 0.4 + Math.random() * 0.8, aSz: -0.4 - Math.random() * 0.8 });
    }
    dispose() { Core.disposeTree(this.group); }
  }
  // 静态士兵网格（战象塔上的弓手、战车上的甲士等）
  function soldierStatic(side, kind, pose = {}, scale = 1) {
    const geos = soldierPartGeos(side, kind);
    const J = Object.assign(newJ(KIND_POSE[kind] || KIND_POSE.spear), pose);
    const mats = {}; for (const p of PARTS) mats[p] = new THREE.Matrix4();
    poseMatrices(new THREE.Matrix4().makeScale(scale, scale, scale), J, mats);
    const parts = [];
    for (const p of PARTS) if (geos[p]) {
      const g = geos[p].clone(); g.applyMatrix4(mats[p]);
      parts.push({ geo: g, color: 0xffffff, m: null, keepColor: true });
    }
    // 合并时保留原顶点色
    const out = new THREE.BufferGeometry();
    let total = 0; for (const x of parts) total += x.geo.attributes.position.count;
    for (const name of ['position', 'normal', 'color']) {
      const arr = new Float32Array(total * 3); let o = 0;
      for (const x of parts) { arr.set(x.geo.attributes[name].array, o); o += x.geo.attributes[name].array.length; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    out.computeBoundingSphere();
    const grp = new THREE.Group();
    const m = new THREE.Mesh(out, vcMat); m.castShadow = true;
    grp.add(m, new THREE.Mesh(out, outlineShared));
    return grp;
  }

  // ======================================================================
  //  战马（面向 +X）：可奔跑、人立、倒地
  // ======================================================================
  function makeHorse(opt = {}) {
    const col = opt.color ?? 0x5b4636, mane = opt.mane ?? C.hair;
    const parts = [
      P(G.cyl(0.34, 0.36, 1.25, 10), col, 0, 1.3, 0, 0, 0, Math.PI / 2),
      P(G.sph(0.37, 10), col, 0.6, 1.33, 0, 0, 0, 0, 1.05, 1, 0.95),
      P(G.sph(0.4, 10), col, -0.6, 1.36, 0, 0, 0, 0, 1.05, 1, 1),
    ];
    const headParts = [
      P(G.cyl(0.17, 0.27, 0.85, 8), col, 0.3, 0.38, 0, 0, 0, -0.62),
      P(G.cyl(0.1, 0.17, 0.62, 8), col, 0.68, 0.65, 0, 0, 0, -1.95),
      P(G.box(0.08, 0.72, 0.06), mane, 0.21, 0.55, 0, 0, 0, -0.62),
      P(G.cone(0.05, 0.14, 4), col, 0.55, 0.93, 0.07), P(G.cone(0.05, 0.14, 4), col, 0.55, 0.93, -0.07),
      P(G.sph(0.03, 4), C.dark, 0.71, 0.75, 0.1), P(G.sph(0.03, 4), C.dark, 0.71, 0.75, -0.1),
      P(G.box(0.06, 0.05, 0.22), C.dark, 0.9, 0.52, 0),
    ];
    if (opt.barding) {
      const b = opt.barding;
      parts.push(P(G.cyl(0.4, 0.44, 1.5, 10, 1), b, 0, 1.32, 0, 0, 0, Math.PI / 2, 1, 1, 1));
      parts.push(P(G.box(0.12, 0.7, 0.62), b, 0.95, 1.1, 0, 0, 0, 0.2));
      for (const x of [0.45, -0.1, -0.62]) parts.push(P(new THREE.TorusGeometry(0.43, 0.03, 4, 16), opt.trim ?? C.bronze, x, 1.3, 0, 0, Math.PI / 2, 0));
      headParts.push(P(G.cyl(0.2, 0.3, 0.6, 8), b, 0.33, 0.35, 0, 0, 0, -0.62));
      headParts.push(P(G.box(0.5, 0.08, 0.26), opt.trim ?? C.bronze, 0.73, 0.73, 0, 0, 0, -0.35));
    }
    parts.push(P(G.box(0.55, 0.12, 0.62), opt.saddle ?? 0x6b2a1f, -0.05, 1.72, 0));
    const g = new THREE.Group();
    const bodyPivot = new THREE.Group(); g.add(bodyPivot);
    const body = inkedMerged(parts); bodyPivot.add(body);
    const neck = new THREE.Group(); neck.position.set(0.65, 1.37, 0); bodyPivot.add(neck);
    neck.add(inkedMerged(headParts));
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
      group: g, bodyPivot, neck, tail, legs, t: rnd() * 5, speed: 0, rearK: 0, dead: 0, deadSide: 1,
      rider: null,
      update(dt) {
        this.t += dt * (1 + this.speed * 1.6);
        const s = this.dead ? 0 : this.speed;
        const ph = this.t * 7.5;
        const rk = this.rearK;
        for (const L of this.legs) {
          const a = Math.sin((ph + L.off * Math.PI * 2));
          let hz = s * a * (L.front ? 0.75 : 0.6) + (1 - s) * Math.sin(this.t * 1.3 + L.off) * 0.02;
          let kz = s * Math.max(0, L.front ? -a : a) * (L.front ? -1.0 : 0.9);
          if (rk > 0 && L.front) { hz = hz * (1 - rk) + rk * (0.9 + Math.sin(this.t * 14 + L.off * 3) * 0.4); kz = kz * (1 - rk) + rk * -1.6; }
          if (rk > 0 && !L.front) { hz *= 1 - rk; kz *= 1 - rk; hz += -rk * 0.9; }
          if (this.dead) { hz = (L.front ? 0.5 : -0.4) * this.dead; kz = (L.front ? -0.6 : 0.5) * this.dead * (0.5 + 0.5 * Math.sin(this.t * 20) * (1 - this.dead)); }
          L.hip.rotation.z = hz; L.knee.rotation.z = kz;
        }
        // 人立：绕后蹄旋转
        const th = rk * 0.95;
        this.bodyPivot.rotation.z = th + s * Math.sin(ph) * 0.07 * (1 - rk);
        this.bodyPivot.position.set(-0.62 + 0.62 * Math.cos(th), 0.62 * Math.sin(th) * 0.15 + s * Math.abs(Math.sin(ph)) * 0.12 * (1 - rk), 0);
        this.neck.rotation.z = rk * 0.35 + (this.dead ? 0.6 * this.dead : Math.sin(this.t * 2.2) * 0.04 + s * Math.sin(ph * 2) * 0.08);
        this.tail.rotation.z = 0.7 + s * 0.6 + Math.sin(this.t * 3) * 0.1;
        // 倒地：侧翻
        if (this.dead) { this.bodyPivot.rotation.x = this.deadSide * this.dead * 1.45; this.bodyPivot.position.y = this.dead * 0.2; }
      },
    };
    return horse;
  }

  // ---------- 骑士（坐姿，可挥砍） ----------
  function makeRider(side, opt = {}) {
    const c = SIDE[side];
    const g = new THREE.Group();
    const armor = opt.gold ? 0xd6a43e : opt.heavy ? C.dark : c.armor;
    const torso = inkedMerged([
      P(G.box(0.16, 0.5, 0.16), C.pants, 0.12, 0.05, 0.28, 0.9, 0, -0.4), P(G.box(0.16, 0.5, 0.16), C.pants, 0.12, 0.05, -0.28, -0.9, 0, -0.4),
      P(G.cyl(0.24, 0.32, 0.3, 8), opt.gold ? 0xd6a43e : c.armor, 0, 0.18, 0),
      P(G.cyl(0.22, 0.2, 0.55, 8), c.cloth, 0, 0.55, 0),
      P(G.box(0.4, 0.42, 0.46), armor, 0.02, 0.6, 0),
      P(G.sph(0.13, 8), armor, 0, 0.82, 0.27, 0, 0, 0, 1, 0.8, 1), P(G.sph(0.13, 8), armor, 0, 0.82, -0.27, 0, 0, 0, 1, 0.8, 1),
    ]);
    g.add(torso);
    const head = inkedMerged([
      P(G.sph(0.13, 8), C.skin, 0.02, 0.12, 0),
      P(G.cyl(0.11, 0.15, 0.2, 8), armor, 0.02, 0.22, 0),
      P(G.box(0.1, 0.16, 0.27), armor, 0.1, 0.11, 0),
      P(G.cone(0.04, 0.4, 5), c.tassel, -0.02, 0.52, 0, 0, 0, 0.3),
    ]);
    head.position.y = 0.88; g.add(head);
    const cape = inked(G.box(0.04, 0.8, 0.5), toon(side === 'b' ? 0x6e1f16 : 0xb0301f));
    cape.position.set(-0.25, 0.45, 0); cape.rotation.z = -0.35;
    g.add(cape);
    const arm = new THREE.Group(); arm.position.set(0.02, 0.82, 0.32);
    const armM = inked(G.box(0.12, 0.5, 0.12), toon(c.cloth)); armM.position.y = -0.22; arm.add(armM);
    const weapon = new THREE.Group(); weapon.position.y = -0.45; arm.add(weapon);
    // 双锤（兵法四级车的大将）：每手一柄金瓜锤
    const hammer = () => {
      const w = new THREE.Group();
      const handle = inked(G.cyl(0.028, 0.028, 0.8, 5), toon(C.wood)); handle.position.y = 0.12; w.add(handle);
      const head = inked(G.sph(0.17, 9), toon(0xd9a845)); head.position.y = 0.62; head.scale.set(1, 1.15, 1); w.add(head);
      const band = inked(new THREE.TorusGeometry(0.17, 0.028, 4, 12), toon(C.bronze)); band.position.y = 0.62; band.rotation.x = Math.PI / 2; w.add(band);
      for (let i = 0; i < 6; i++) { const sp = inked(G.cone(0.035, 0.12, 4), toon(0xf3d27a)); const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.17, 0.62, Math.sin(a) * 0.17); sp.rotation.z = -Math.PI / 2; sp.rotation.y = -a; w.add(sp); }
      return w;
    };
    if (opt.weapon === 'hammers') {
      weapon.add(hammer());
    } else if (opt.weapon === 'ji') {
      const shaft = inked(G.cyl(0.025, 0.025, 2.6, 5), toon(C.wood)); shaft.position.y = 0.4; weapon.add(shaft);
      const tip = inked(G.cone(0.05, 0.32, 5), toon(C.metal)); tip.position.y = 1.85; weapon.add(tip);
      const blade = inked(jiShape(), toon(C.metal)); blade.position.set(0, 1.5, -0.01); weapon.add(blade);
    } else {
      const handle = inked(G.cyl(0.025, 0.025, 0.7, 5), toon(C.wood)); weapon.add(handle);
      const blade = inked(G.box(0.03, 1.1, 0.12), toon(C.metal)); blade.position.set(0, 0.9, 0.03); weapon.add(blade);
      const ring = inked(new THREE.TorusGeometry(0.07, 0.015, 4, 10), toon(C.bronze)); ring.position.y = -0.38; weapon.add(ring);
    }
    weapon.rotation.x = -0.2;
    g.add(arm);
    arm.rotation.x = -0.3; arm.rotation.z = 0.9;
    let arm2 = null;
    if (opt.weapon === 'hammers') {
      arm2 = new THREE.Group(); arm2.position.set(0.02, 0.82, -0.32);
      const am = inked(G.box(0.12, 0.5, 0.12), toon(c.cloth)); am.position.y = -0.22; arm2.add(am);
      const w2 = new THREE.Group(); w2.position.y = -0.45; w2.add(hammer()); w2.rotation.x = 0.2; arm2.add(w2);
      arm2.rotation.x = 0.3; arm2.rotation.z = 0.9; g.add(arm2);
    }
    return { group: g, arm, arm2, weapon, cape, head, torso };
  }
  function makeCavalry(side, heavy = true, weapon = 'dao', opt = {}) {
    const c = SIDE[side];
    const h = makeHorse({ color: c.horse, barding: heavy ? (opt.gold ? 0xb8862e : c.barding) : null, trim: opt.gold ? 0xf3d27a : c.trim });
    const r = makeRider(side, { heavy, weapon, gold: opt.gold });
    r.group.position.set(-0.05, 1.72, 0);
    h.bodyPivot.add(r.group);
    h.rider = r;
    return h;
  }
  const geoCache = {};
  function cavalryStaticGeo(side) {
    const k = 'cav' + side;
    if (geoCache[k]) return geoCache[k];
    const c = SIDE[side], col = c.horse;
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

  // ======================================================================
  //  战车（驷马，面向 +X）：各部件分开，便于解体
  // ======================================================================
  function makeChariot(side) {
    const c = SIDE[side];
    const g = new THREE.Group();
    const cab = inkedMerged([
      P(G.box(1.2, 0.12, 1.5), C.wood, 0, 1.0, 0),
      P(G.box(1.2, 0.5, 0.06), c.cloth, 0, 1.3, 0.72), P(G.box(1.2, 0.5, 0.06), c.cloth, 0, 1.3, -0.72),
      P(G.box(0.06, 0.5, 1.5), c.cloth, 0.6, 1.3, 0),
      P(G.box(1.24, 0.05, 0.08), c.trim, 0, 1.56, 0.72), P(G.box(1.24, 0.05, 0.08), c.trim, 0, 1.56, -0.72),
      P(G.cyl(0.03, 0.03, 2.2, 5), C.wood, -0.2, 2.1, 0),
      P(G.cone(0.95, 0.28, 12), c.flag, -0.2, 3.25, 0),
      P(G.box(0.02, 0.6, 0.9), c.flag, -0.45, 3.0, 0.5, 0, 0.3),
    ]);
    const cabG = new THREE.Group(); cabG.add(cab); g.add(cabG);
    const axle = inkedMerged([P(G.cyl(0.05, 0.05, 2.2, 6), C.wood, 0, 0.9, 0, Math.PI / 2)]); g.add(axle);
    const pole = inkedMerged([P(G.cyl(0.05, 0.06, 2.6, 6), C.wood, 1.7, 1.05, 0, 0, 0, Math.PI / 2 + 0.08), P(G.box(0.12, 0.12, 1.9), C.wood, 2.95, 1.3, 0)]);
    g.add(pole);
    const wheels = [];
    for (const z of [0.95, -0.95]) {
      const wg = new THREE.Group(); wg.position.set(0, 0.9, z);
      const rim = inked(new THREE.TorusGeometry(0.88, 0.05, 5, 22), toon(C.wood)); wg.add(rim);
      for (let i = 0; i < 9; i++) { const sp = inked(G.cyl(0.02, 0.02, 1.76, 4), toon(C.wood)); sp.rotation.z = (i / 9) * Math.PI; wg.add(sp); }
      const hub = inked(G.cyl(0.12, 0.12, 0.22, 8), toon(C.bronze)); hub.rotation.x = Math.PI / 2; wg.add(hub);
      g.add(wg); wheels.push(wg);
    }
    const driver = soldierStatic(side, 'sword', { aW: -0.9, wAbs: 0.3, aS: -0.9, crouch: 0.05 }); driver.position.set(0.25, 1.05, 0.3); driver.rotation.y = Math.PI / 2;
    const warrior = soldierStatic(side, 'halberd', { aW: -1.1, wAbs: 1.2, lean: 0.15 }); warrior.position.set(-0.2, 1.05, -0.3); warrior.rotation.y = Math.PI / 2;
    cabG.add(driver, warrior);
    const horses = [];
    for (const z of [-0.84, -0.28, 0.28, 0.84]) {
      const h = makeHorse({ color: side === 'r' ? 0x7a5236 : 0x2e2b2a });
      h.group.position.set(2.5, 0, z);
      h.group.scale.setScalar(0.82);
      g.add(h.group); horses.push(h);
    }
    return {
      group: g, cab: cabG, axle, pole, wheels, horses, crew: [driver, warrior], speed: 0, t: 0,
      update(dt) {
        this.t += dt;
        for (const w of wheels) if (w.parent === g) w.rotation.z -= dt * this.speed * 7;
        for (const h of horses) { if (!h.dead) h.speed = Math.min(1, this.speed); h.update(dt); }
        cabG.position.y = Math.abs(Math.sin(this.t * 30)) * 0.03 * this.speed;
      },
    };
  }

  // ======================================================================
  //  铜炮（面向 +X）
  // ======================================================================
  function makeCannon(side, opts = {}) {
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
    const wheels = [];
    for (const z of [0.46, -0.46]) {
      const w = new THREE.Group(); w.position.set(0, 0.45, z);
      w.add(inked(new THREE.TorusGeometry(0.4, 0.06, 5, 16), toon(C.wood)));
      for (let i = 0; i < 4; i++) { const sp = inked(G.cyl(0.02, 0.02, 0.8, 4), toon(C.wood)); sp.rotation.z = i * Math.PI / 4; w.add(sp); }
      g.add(w); wheels.push(w);
    }
    // 火药桶
    const keg = inkedMerged([P(G.cyl(0.16, 0.16, 0.34, 10), 0x5a3e24, 0, 0.17, 0), P(new THREE.TorusGeometry(0.165, 0.015, 4, 12), C.dark, 0, 0.08, 0, Math.PI / 2), P(new THREE.TorusGeometry(0.165, 0.015, 4, 12), C.dark, 0, 0.26, 0, Math.PI / 2)]);
    keg.position.set(-1.0, 0, 0.55); g.add(keg);
    let crew = null;
    if (opts.crew !== false) { crew = soldierStatic(side, 'crew', { aW: -0.9, wAbs: 0.5, lean: 0.1 }); crew.position.set(-0.6, 0, 0.75); crew.rotation.y = Math.PI / 2 - 0.5; g.add(crew); }
    const torch = new THREE.Group(); torch.position.set(-0.35, 1.2, 0.7);
    const stick = inked(G.cyl(0.025, 0.025, 0.7, 5), toon(C.wood)); stick.rotation.z = -0.6; torch.add(stick);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: Core.Tex.spark, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.set(0.2, 0.32, 0); flame.scale.setScalar(0.45); torch.add(flame);
    if (opts.torch !== false) g.add(torch);
    return { group: g, barrel, carriage, wheels, keg, crew, muzzle: new THREE.Vector3(1.3, 0, 0), torch, flame };
  }

  // ======================================================================
  //  楚军战象（燧象，面向 +X）
  // ======================================================================
  // 汉相：羽扇纶巾的谋士立在华盖轺车上，一匹白马驾车（车头朝 +x）。gold：兵法四级，金华盖、金车饰
  function makeAdvisorCart(side = 'r', opt = {}) {
    const c = SIDE[side], gold = !!opt.gold;
    const trim = gold ? 0xf7dc8c : c.trim, canopy = gold ? 0xd6a43e : c.cloth, robe = 0xe8dcc0;
    const g = new THREE.Group();
    g.add(inkedMerged([
      P(G.box(1.5, 0.12, 1.1), C.wood, 0, 0.62, 0), P(G.box(1.5, 0.3, 0.06), c.cloth, 0, 0.82, 0.52), P(G.box(1.5, 0.3, 0.06), c.cloth, 0, 0.82, -0.52), P(G.box(0.06, 0.3, 1.1), c.cloth, -0.72, 0.82, 0),
      P(G.box(1.54, 0.05, 0.08), trim, 0, 0.98, 0.52), P(G.box(1.54, 0.05, 0.08), trim, 0, 0.98, -0.52), P(G.box(0.08, 0.05, 1.12), trim, -0.72, 0.98, 0),
      P(G.cyl(0.08, 0.08, 1.4, 6), C.dark, 0.1, 0.55, 0, Math.PI / 2), P(G.box(1.3, 0.07, 0.07), C.wood, 1.2, 0.6, 0),
      // 华盖
      P(G.cyl(0.03, 0.03, 2.3, 6), C.wood, -0.35, 1.8, 0), P(G.cone(1.0, 0.4, 12), canopy, -0.35, 3.1, 0), P(G.cyl(1.0, 1.0, 0.14, 12), trim, -0.35, 2.86, 0), P(G.sph(0.08, 6), trim, -0.35, 3.34, 0),
      ...(gold ? [0, 1, 2, 3, 4, 5].map(i => P(G.box(0.05, 0.3, 0.05), 0xb0301f, -0.35 + Math.cos(i * 1.047) * 0.95, 2.66, Math.sin(i * 1.047) * 0.95)) : []),
      // 谋士：宽袍大袖、进贤冠、羽扇
      P(G.cone(0.42, 1.25, 10), robe, 0.15, 1.3, 0), P(G.cyl(0.2, 0.3, 0.5, 8), robe, 0.15, 1.85, 0), P(G.box(0.5, 0.1, 0.34), gold ? 0xd6a43e : c.cloth, 0.15, 1.7, 0),
      P(G.box(0.16, 0.5, 0.2), robe, 0.15, 1.75, 0.3, 0.5), P(G.box(0.16, 0.5, 0.2), robe, 0.15, 1.75, -0.3, -0.5),
      P(G.sph(0.14, 8), C.skin, 0.15, 2.26, 0), P(G.box(0.14, 0.2, 0.16), C.dark, 0.13, 2.46, 0), P(G.box(0.3, 0.04, 0.04), C.dark, 0.13, 2.42, 0), P(G.cone(0.05, 0.2, 5), C.dark, 0.26, 2.12, 0, 0, 0, Math.PI),
      P(G.cyl(0.02, 0.02, 0.3, 5), C.wood, 0.42, 1.75, 0.42, 0, 0, -0.6), P(G.sph(0.17, 8), C.white, 0.56, 1.95, 0.42, 0, 0, 0, 0.3, 1, 0.8),
    ]));
    const wheels = [0.62, -0.62].map(z => { const w = inkedMerged([P(G.cyl(0.55, 0.55, 0.08, 16), C.wood, 0, 0, 0, Math.PI / 2), P(G.cyl(0.12, 0.12, 0.1, 8), trim, 0, 0, 0, Math.PI / 2), ...[0, 1, 2, 3].map(i => P(G.box(1.0, 0.05, 0.09), 0x4a3018, 0, 0, 0, 0, 0, i * Math.PI / 4))]); w.position.set(0.1, 0.55, z); g.add(w); return w; });
    const horse = makeHorse({ color: 0xe8e2d6 }); horse.group.position.set(2.2, 0, 0); g.add(horse.group);
    const o = { group: g, wheels, horse, speed: 0, update(dt) { horse.speed = o.speed; horse.update(dt); for (const w of wheels) w.rotation.z -= o.speed * dt * 4; } };
    return o;
  }
  function makeElephant(side = 'b', opt = {}) {
    // gold：兵法四级的黄金战象——通身鎏金甲，披挂换成金红
    const c = opt.gold ? { ...SIDE[side], cloth: 0x8e1c12, cloth2: 0xd6a43e, trim: 0xf7dc8c } : SIDE[side];
    const skin = opt.gold ? 0xd6a43e : 0x6f6a64, skin2 = opt.gold ? 0xc4922e : 0x5d5853;
    const g = new THREE.Group();
    const root = new THREE.Group(); g.add(root); // 整体（倒地时旋转）
    const body = new THREE.Group(); root.add(body);
    body.add(inkedMerged([
      P(G.sph(1, 14), skin, 0, 2.25, 0, 0, 0, 0, 1.55, 1.05, 0.95),
      P(G.sph(0.8, 10), skin2, -1.1, 2.1, 0, 0, 0, 0, 0.9, 1, 0.95),
      // 披甲
      P(G.box(2.2, 1.1, 0.06), c.cloth, -0.1, 2.35, 0.97, 0, 0, 0), P(G.box(2.2, 1.1, 0.06), c.cloth, -0.1, 2.35, -0.97, 0, 0, 0),
      P(G.box(2.24, 0.1, 0.08), c.trim, -0.1, 1.82, 0.99), P(G.box(2.24, 0.1, 0.08), c.trim, -0.1, 1.82, -0.99),
      P(G.box(2.24, 0.1, 0.08), c.trim, -0.1, 2.88, 0.99), P(G.box(2.24, 0.1, 0.08), c.trim, -0.1, 2.88, -0.99),
      P(G.box(2.0, 0.08, 1.95), c.cloth2, -0.1, 3.28, 0),
      ...[-0.9, -0.3, 0.3].map(x => P(G.sph(0.07, 6), c.trim, x, 2.35, 1.01)), ...[-0.9, -0.3, 0.3].map(x => P(G.sph(0.07, 6), c.trim, x, 2.35, -1.01)),
    ], 0.03));
    // 象塔
    const tower = new THREE.Group(); tower.position.set(-0.15, 3.3, 0); body.add(tower);
    tower.add(inkedMerged([
      P(G.box(1.2, 0.08, 1.0), C.wood, 0, 0.04, 0),
      ...[[0.56, 0.46], [-0.56, 0.46], [0.56, -0.46], [-0.56, -0.46]].map(([x, z]) => P(G.cyl(0.035, 0.035, 1.1, 5), C.wood, x, 0.55, z)),
      P(G.box(1.2, 0.05, 0.05), C.wood, 0, 0.45, 0.47), P(G.box(1.2, 0.05, 0.05), C.wood, 0, 0.45, -0.47), P(G.box(0.05, 0.05, 1.0), C.wood, 0.57, 0.45, 0), P(G.box(0.05, 0.05, 1.0), C.wood, -0.57, 0.45, 0),
      P(G.box(1.2, 0.3, 0.03), c.cloth, 0, 0.28, 0.48), P(G.box(1.2, 0.3, 0.03), c.cloth, 0, 0.28, -0.48),
      P(new THREE.ConeGeometry(0.95, 0.45, 4), c.flag, 0, 1.3, 0, 0, Math.PI / 4, 0, 1, 1, 0.85),
    ], 0.02));
    const archer = soldierStatic(side, 'archer', { aS: -1.5, aW: -1.4, aWz: 0.8, wAbs: 1.2 }); archer.position.set(-0.15, 0.08, 0.15); archer.rotation.y = Math.PI / 2; archer.scale.setScalar(0.9); tower.add(archer);
    const banner = makeBanner(side, '楚'); banner.group.scale.setScalar(0.5); banner.group.position.set(-0.55, 0.1, -0.45); tower.add(banner.group);
    // 象奴
    const mahout = soldierStatic(side, 'crew', { lL: -1.3, lR: -1.3, lLz: 0.5, aW: -0.8, aS: -0.8, crouch: 0.3 }); mahout.position.set(1.05, 2.9, 0); mahout.rotation.y = Math.PI / 2; body.add(mahout);
    // 头部
    const head = new THREE.Group(); head.position.set(1.35, 2.7, 0); body.add(head);
    head.add(inkedMerged([
      P(G.sph(0.72, 12), skin, 0.35, -0.05, 0, 0, 0, 0, 0.95, 1, 0.85),
      P(G.sph(0.5, 10), skin, 0.55, 0.28, 0, 0, 0, 0, 0.8, 0.8, 1),
      P(G.sph(0.05, 5), C.dark, 0.78, 0.08, 0.36), P(G.sph(0.05, 5), C.dark, 0.78, 0.08, -0.36),
      // 头甲
      P(G.box(0.1, 0.62, 0.62), C.bronze, 0.92, 0.12, 0, 0, 0, 0.35), P(G.cone(0.08, 0.35, 5), c.tassel, 0.85, 0.62, 0, 0, 0, -0.5),
      P(G.sph(0.06, 5), c.trim, 0.97, 0.1, 0.2), P(G.sph(0.06, 5), c.trim, 0.97, 0.1, -0.2),
    ], 0.03));
    const ears = [];
    for (const s of [1, -1]) {
      const ear = new THREE.Group(); ear.position.set(0.15, 0.05, 0.52 * s); head.add(ear);
      const eg = new THREE.CircleGeometry(0.5, 12); eg.scale(1.1, 1.4, 1);
      const em = inked(eg, toon(skin2, { side: THREE.DoubleSide })); em.position.set(-0.3, -0.05, 0.02 * s); em.rotation.y = s > 0 ? 0.15 : -0.15;
      ear.add(em); ears.push(ear);
    }
    for (const s of [1, -1]) {
      const curve = new THREE.CatmullRomCurve3([V(0.75, -0.35, 0.22 * s), V(1.05, -0.62, 0.3 * s), V(1.4, -0.6, 0.34 * s), V(1.62, -0.35, 0.32 * s)]);
      head.add(inked(new THREE.TubeGeometry(curve, 10, 0.055, 6), toon(C.ivory), 0.015));
    }
    // 象鼻（链式）
    const trunk = []; let parent = head;
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Group(); seg.position.set(i === 0 ? 0.98 : 0, i === 0 ? -0.1 : -0.3, 0);
      const r0 = 0.22 - i * 0.022;
      const m = inked(G.cyl(r0 - 0.02, r0, 0.34, 8), toon(skin)); m.position.y = -0.15; seg.add(m);
      parent.add(seg); trunk.push(seg); parent = seg;
    }
    // 腿
    const legs = [];
    for (const [x, z, front] of [[1.0, 0.5, 1], [1.0, -0.5, 1], [-1.0, 0.5, 0], [-1.0, -0.5, 0]]) {
      const hip = new THREE.Group(); hip.position.set(x, 1.6, z); root.add(hip);
      const up = inked(G.cyl(0.3, 0.27, 0.85, 8), toon(skin)); up.position.y = -0.4; hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -0.85; hip.add(knee);
      const lo = inked(G.cyl(0.27, 0.3, 0.72, 8), toon(skin)); lo.position.y = -0.36; knee.add(lo);
      const foot = inked(G.cyl(0.33, 0.34, 0.08, 10), toon(0x4a4642)); foot.position.y = -0.72; knee.add(foot);
      legs.push({ hip, knee, front, off: front ? (z > 0 ? 0 : 0.5) : (z > 0 ? 0.5 : 0) });
    }
    // 尾与火把
    const tail = new THREE.Group(); tail.position.set(-1.5, 2.55, 0); root.add(tail);
    const tl = inked(G.cyl(0.03, 0.05, 1.0, 5), toon(skin2)); tl.position.y = -0.5; tail.add(tl);
    const torch = new THREE.Group(); torch.position.y = -1.0; tail.add(torch);
    torch.add(inked(G.cyl(0.05, 0.05, 0.3, 5), toon(C.wood)));
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: Core.Tex.spark, color: 0xff8a30, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.y = -0.1; flame.scale.setScalar(0.001); torch.add(flame);
    tail.rotation.z = 0.35;
    return {
      group: g, root, body, head, trunk, ears, legs, tail, torch, flame, tower, archer, mahout, banner,
      t: rnd() * 5, speed: 0, rearK: 0, trumpetK: 0, dead: 0, fire: 0,
      update(dt) {
        this.t += dt * (1 + this.speed);
        const s = this.dead ? 0 : this.speed, ph = this.t * 3.2;
        for (const L of legs) {
          const a = Math.sin(ph + L.off * Math.PI * 2);
          let hz = s * a * 0.35, kz = s * Math.max(0, L.front ? -a : a) * 0.5 * (L.front ? -1 : 1);
          if (this.rearK && L.front) { hz = hz * (1 - this.rearK) + this.rearK * (0.7 + Math.sin(this.t * 6) * 0.15); kz = kz * (1 - this.rearK) - this.rearK * 1.0; }
          if (this.dead && L.front) { hz = 0.2 * this.dead; kz = 1.7 * this.dead; }
          if (this.dead && !L.front) { hz = -0.3 * this.dead; kz = -1.5 * this.dead * 0.6; }
          L.hip.rotation.z = hz; L.knee.rotation.z = kz;
        }
        const th = this.rearK * 0.5;
        root.rotation.z = th;
        root.position.set(-1.0 + 1.0 * Math.cos(th), 1.0 * Math.sin(th) * 0.2 + s * Math.abs(Math.sin(ph)) * 0.05, 0);
        if (this.dead) { root.rotation.x = this.dead * 1.25; root.position.y = -this.dead * 0.55; root.rotation.z = -this.dead * 0.15; }
        // 象鼻：垂摆 / 高举
        const tk = this.trumpetK;
        trunk.forEach((sg, i) => { sg.rotation.z = (1 - tk) * (Math.sin(this.t * 1.6 - i * 0.6) * 0.08 + 0.05 * i * 0.3) + tk * (-0.42 - (i === 0 ? 0.4 : 0)); sg.rotation.x = (1 - tk) * Math.sin(this.t * 1.1 - i * 0.5) * 0.06; });
        head.rotation.z = tk * 0.3 + Math.sin(this.t * 1.3) * 0.03;
        ears.forEach((e, i) => { e.rotation.y = (i ? -1 : 1) * (0.1 + Math.sin(this.t * (2 + tk * 6)) * (0.12 + tk * 0.25)); });
        tail.rotation.x = Math.sin(this.t * 2.5) * 0.15;
        const f = this.fire; flame.scale.setScalar(f * (0.6 + 0.2 * Math.sin(this.t * 20)));
        this.banner.update(dt);
      },
    };
  }

  // ======================================================================
  //  渡船（可带帆）
  // ======================================================================
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
    let sail = null, sailBase = null;
    if (opt.sail) {
      const mast = inked(G.cyl(0.03, 0.04, 2.0, 5), toon(C.wood)); mast.position.set(0.3, 1.3, 0); g.add(mast);
      const sg = new THREE.PlaneGeometry(0.9, 1.1, 6, 6); sg.translate(0, 0, 0);
      const cols = new Float32Array(sg.attributes.position.count * 3);
      const sc = new THREE.Color(opt.side === 'b' ? 0x4a4440 : 0xc9b48a), bat = new THREE.Color(0x3a2a1a);
      for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i); const on = Math.abs(((y + 0.55) / 0.22) % 1) < 0.12; const cc = on ? bat : sc; cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b; }
      sg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      sail = new THREE.Mesh(sg, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide, unique: true }));
      sail.position.set(0.28, 1.45, 0); sail.rotation.y = Math.PI / 2 - 0.25; g.add(sail);
      sailBase = sg.attributes.position.array.slice();
    }
    const man = makeBoatman(opt.side);
    man.group.position.set(-0.8, 0.32, 0); g.add(man.group);
    let t = rnd() * 5;
    return {
      group: g, man, sail,
      update(dt) {
        t += dt;
        if (sail) {
          const pa = sail.geometry.attributes.position;
          for (let i = 0; i < pa.count; i++) { const x = sailBase[i * 3], y = sailBase[i * 3 + 1]; pa.setZ(i, 0.12 * (1 - (x / 0.45) * (x / 0.45)) + Math.sin(t * 5 + x * 5 + y * 2) * 0.025); }
          pa.needsUpdate = true;
        }
      },
    };
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

  // ======================================================================
  //  项羽 / 刘邦：带关节的骨架（面向 +Z）
  // ======================================================================
  const HERO_KEYS = { hy: 0, hx: 0, tx: 0, ty: 0, tz: 0, nx: 0, ny: 0, sRx: 0, sRy: 0, sRz: 0, eR: 0, sLx: 0, sLy: 0, sLz: 0, eL: 0, lLx: 0, lLz: 0, kL: 0, lRx: 0, lRz: 0, kR: 0, wx: 0, wy: 0, wz: 0 };
  function makeHero(kind) {
    const isX = kind === 'xiang';
    const armor = isX ? 0x1e1c1b : 0xa3301f, gold = 0xb08a3a, red = isX ? 0x9e2418 : 0xa3301f, skin = isX ? 0xc9ad85 : 0xd2b893;
    const trouser = isX ? 0x2a2522 : 0x3a2a22;
    const g = new THREE.Group();
    const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    // —— 下身 ——
    if (isX) {
      hips.add(inkedMerged([
        P(G.cyl(0.26, 0.34, 0.22, 12), armor, 0, 0.11, 0), P(G.cyl(0.3, 0.38, 0.22, 12), 0x2a2725, 0, -0.05, 0), P(G.cyl(0.34, 0.42, 0.22, 12), armor, 0, -0.21, 0),
        P(new THREE.TorusGeometry(0.42, 0.015, 4, 18), gold, 0, -0.31, 0, Math.PI / 2), P(new THREE.TorusGeometry(0.38, 0.015, 4, 18), gold, 0, -0.15, 0, Math.PI / 2),
      ], 0.018));
    } else {
      hips.add(inkedMerged([
        P(G.cyl(0.24, 0.4, 0.62, 12), red, 0, -0.26, 0),
        P(new THREE.TorusGeometry(0.4, 0.02, 4, 18), INK.gold, 0, -0.56, 0, Math.PI / 2),
        P(G.box(0.1, 0.6, 0.04), 0x3a1c16, 0, -0.2, 0.3),
      ], 0.016));
    }
    const leg = (s) => {
      const lg = new THREE.Group(); lg.position.set(0.13 * s, -0.02, 0); hips.add(lg);
      lg.add(inkedMerged([P(G.cyl(0.1, 0.095, 0.45, 8), trouser, 0, -0.225, 0), ...(isX ? [P(G.box(0.2, 0.3, 0.05), armor, 0, -0.18, 0.1)] : [])], 0.016));
      const kn = new THREE.Group(); kn.position.y = -0.45; lg.add(kn);
      kn.add(inkedMerged([P(G.cyl(0.095, 0.085, 0.42, 8), trouser, 0, -0.21, 0), P(G.cyl(0.115, 0.105, 0.34, 8), isX ? armor : 0x2b2522, 0, -0.2, 0), P(G.box(0.17, 0.12, 0.3), isX ? armor : 0x241c18, 0, -0.44, 0.05)], 0.016));
      return { lg, kn };
    };
    const LL = leg(1), LR = leg(-1);
    // —— 上身 ——
    if (isX) {
      torso.add(inkedMerged([
        P(G.cyl(0.27, 0.24, 0.62, 12), armor, 0, 0.51, 0),
        P(G.sph(0.17, 10), armor, 0.1, 0.6, 0.14, 0, 0, 0, 1, 0.9, 0.55), P(G.sph(0.17, 10), armor, -0.1, 0.6, 0.14, 0, 0, 0, 1, 0.9, 0.55),
        P(G.sph(0.06, 6), gold, 0, 0.51, 0.26), P(G.sph(0.06, 6), gold, 0, 0.75, 0.22),
        P(G.box(0.62, 0.08, 0.5), gold, 0, 0.23, 0), P(G.sph(0.08, 8), gold, 0, 0.23, 0.26),
        P(G.sph(0.17, 10), armor, 0.34, 0.81, 0, 0, 0, -0.3, 1.1, 0.75, 1.1), P(G.sph(0.17, 10), armor, -0.34, 0.81, 0, 0, 0, 0.3, 1.1, 0.75, 1.1),
        P(G.sph(0.15, 10), 0x3a2e24, 0.4, 0.73, 0, 0, 0, -0.5, 1.1, 0.6, 1.05), P(G.sph(0.15, 10), 0x3a2e24, -0.4, 0.73, 0, 0, 0, 0.5, 1.1, 0.6, 1.05),
        P(G.cyl(0.08, 0.09, 0.12, 8), C.skin, 0, 0.87, 0),
      ], 0.018));
    } else {
      torso.add(inkedMerged([
        P(G.cyl(0.22, 0.24, 0.55, 12), red, 0, 0.45, 0),
        P(G.box(0.46, 0.08, 0.44), 0x3a1c16, 0, 0.23, 0), P(G.box(0.08, 0.1, 0.04), INK.gold, 0, 0.23, 0.23),
        P(G.box(0.06, 0.34, 0.04), 0xe6dcc8, 0.075, 0.58, 0.215, 0, 0, -0.42), P(G.box(0.06, 0.34, 0.04), 0xe6dcc8, -0.075, 0.58, 0.22, 0, 0, 0.42),
        P(G.sph(0.13, 8), red, 0.3, 0.65, 0, 0, 0, 0, 1.2, 0.8, 1), P(G.sph(0.13, 8), red, -0.3, 0.65, 0, 0, 0, 0, 1.2, 0.8, 1),
        P(G.cyl(0.07, 0.08, 0.1, 8), C.skin, 0, 0.77, 0),
      ], 0.016));
    }
    const neck = new THREE.Group(); neck.position.y = isX ? 0.9 : 0.8; torso.add(neck);
    if (isX) {
      neck.add(inkedMerged([
        P(G.sph(0.14, 12), skin, 0, 0.12, 0.01, 0, 0, 0, 0.95, 1.08, 1),
        P(G.box(0.07, 0.022, 0.02), C.hair, 0.055, 0.17, 0.128, 0, 0, -0.25), P(G.box(0.07, 0.022, 0.02), C.hair, -0.055, 0.17, 0.128, 0, 0, 0.25),
        P(G.cone(0.07, 0.17, 7), C.hair, 0, -0.01, 0.1, Math.PI + 0.25), P(G.box(0.12, 0.018, 0.025), C.hair, 0.04, 0.065, 0.132, 0, 0, 0.25), P(G.box(0.12, 0.018, 0.025), C.hair, -0.04, 0.065, 0.132, 0, 0, -0.25),
        P(new THREE.SphereGeometry(0.178, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), armor, 0, 0.215, -0.02),
        P(G.cyl(0.182, 0.19, 0.045, 14), gold, 0, 0.222, -0.02),
        P(G.box(0.04, 0.16, 0.12), armor, 0.155, 0.13, -0.05), P(G.box(0.04, 0.16, 0.12), armor, -0.155, 0.13, -0.05),
        P(G.cone(0.05, 0.16, 6), gold, 0, 0.45, -0.02), P(G.cone(0.1, 0.24, 8), red, 0, 0.41, -0.09, 0.6),
      ], 0.018));
      neck.add(new THREE.Mesh(merge([P(G.box(0.045, 0.012, 0.01), C.hair, 0.052, 0.14, 0.135), P(G.box(0.045, 0.012, 0.01), C.hair, -0.052, 0.14, 0.135)]), vcMat));
      for (const s of [1, -1]) {
        const curve = new THREE.CatmullRomCurve3([V(0.05 * s, 0.39, -0.02), V(0.2 * s, 0.89, -0.1), V(0.45 * s, 1.24, -0.3), V(0.78 * s, 1.37, -0.52)]);
        neck.add(inked(new THREE.TubeGeometry(curve, 16, 0.018, 4), toon(0x2b2622), 0.012));
        for (let i = 0; i < 6; i++) { const p = curve.getPoint(0.3 + i * 0.12); const band = inked(G.sph(0.03, 5), toon(i % 2 ? 0xc9a045 : 0x2b2622)); band.position.copy(p); neck.add(band); }
      }
    } else {
      neck.add(inkedMerged([
        P(G.sph(0.14, 12), skin, 0, 0.1, 0.01, 0, 0, 0, 0.95, 1.1, 1),
        P(G.cone(0.06, 0.2, 6), C.hair, 0, -0.05, 0.1, Math.PI + 0.3),
        P(G.sph(0.14, 10), C.hair, 0, 0.17, -0.02, 0, 0, 0, 1, 0.7, 1),
        P(G.sph(0.07, 8), C.hair, 0, 0.27, -0.04),
        P(G.box(0.05, 0.3, 0.3), 0x2b2724, 0, 0.4, -0.07, -0.35), P(G.box(0.054, 0.04, 0.3), INK.gold, 0, 0.27, -0.03, -0.35),
        P(G.cyl(0.004, 0.004, 0.36, 3), 0x2b2724, 0, 0.27, 0, 0, 0, Math.PI / 2),
      ], 0.016));
      neck.add(new THREE.Mesh(merge([P(G.box(0.05, 0.013, 0.01), C.hair, 0.052, 0.13, 0.133), P(G.box(0.05, 0.013, 0.01), C.hair, -0.052, 0.13, 0.133),
        P(G.box(0.07, 0.012, 0.01), C.hair, 0.05, 0.165, 0.128, 0, 0, -0.15), P(G.box(0.07, 0.012, 0.01), C.hair, -0.05, 0.165, 0.128, 0, 0, 0.15),
        P(G.box(0.14, 0.016, 0.012), C.hair, 0, 0.045, 0.135), P(G.box(0.03, 0.05, 0.012), C.hair, 0.05, 0.03, 0.13, 0, 0, 0.5), P(G.box(0.03, 0.05, 0.012), C.hair, -0.05, 0.03, 0.13, 0, 0, -0.5)]), vcMat));
    }
    // 披风
    let cape = null, capeGeo = null, capeBase = null;
    capeGeo = new THREE.PlaneGeometry(isX ? 0.9 : 0.8, isX ? 1.7 : 1.5, 8, 14);
    capeGeo.translate(0, isX ? -0.85 : -0.75, 0);
    cape = new THREE.Mesh(capeGeo, toon(isX ? 0xa12a1c : 0x7e1e14, { side: THREE.DoubleSide, unique: true })); cape.castShadow = true;
    cape.add(new THREE.Mesh(capeGeo, outlineMat(0.012)));
    cape.position.set(0, isX ? 0.83 : 0.72, isX ? -0.26 : -0.22); cape.rotation.x = 0.12;
    torso.add(cape);
    capeBase = capeGeo.attributes.position.array.slice();
    // 手臂
    const arm = (s) => {
      const sh = new THREE.Group(); sh.position.set((isX ? 0.38 : 0.32) * s, isX ? 0.71 : 0.63, 0.02); torso.add(sh);
      sh.add(inkedMerged(isX ? [P(G.cyl(0.08, 0.07, 0.36, 8), armor, 0, -0.17, 0)] : [P(G.cyl(0.1, 0.14, 0.38, 8), red, 0, -0.17, 0)], 0.016));
      const el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
      el.add(inkedMerged(isX ? [P(G.cyl(0.07, 0.06, 0.32, 8), 0x2a2522, 0, -0.16, 0), P(G.cyl(0.075, 0.07, 0.18, 8), gold, 0, -0.2, 0)] : [P(G.cyl(0.12, 0.16, 0.3, 8), red, 0, -0.13, 0), P(G.cyl(0.05, 0.05, 0.1, 6), C.skin, 0, -0.3, 0)], 0.016));
      const hand = new THREE.Group(); hand.position.y = -0.33; el.add(hand);
      hand.add(inked(G.sph(0.065, 6), toon(skin)));
      return { sh, el, hand };
    };
    const AR = arm(1), AL = arm(-1);
    // 兵器
    const weapon = new THREE.Group(); AR.hand.add(weapon);
    let scabbard = null, sheathed = null;
    if (isX) {
      // 长柄大刀：握点在杆中下部
      weapon.add(inkedMerged([
        P(G.cyl(0.03, 0.032, 2.4, 6), 0x3a2616, 0, 0.3, 0),
        P(new THREE.TorusGeometry(0.035, 0.012, 4, 8), gold, 0, 1.28, 0, Math.PI / 2), P(new THREE.TorusGeometry(0.035, 0.012, 4, 8), gold, 0, -0.5, 0, Math.PI / 2),
        P(G.cone(0.035, 0.22, 5), gold, 0, -1.0, 0, Math.PI),
        P(G.box(0.08, 0.1, 0.12), gold, 0, 1.52, 0),
        P(G.cone(0.08, 0.22, 6), red, 0, 1.42, 0, Math.PI),
        { geo: daoBlade(0.78, 0.22), color: 0xcfc9ba, m: M4(0, 1.56, 0, 0, Math.PI / 2, 0) },
      ], 0.014));
      scabbard = new THREE.Group(); scabbard.position.set(-0.3, 0.17, 0.12); scabbard.rotation.z = 0.5; hips.add(scabbard);
      scabbard.add(inkedMerged([P(G.box(0.05, 0.9, 0.04), 0x2a1a12, 0, -0.4, 0), P(G.cyl(0.02, 0.02, 0.22, 5), 0x3a2616, 0, 0.14, 0), P(G.box(0.14, 0.04, 0.06), gold, 0, 0, 0)]));
    } else {
      // 汉剑（三尺剑）
      weapon.add(inkedMerged([
        P(G.cyl(0.022, 0.022, 0.2, 6), 0x2a1a12, 0, 0.02, 0), P(G.sph(0.035, 6), INK.gold, 0, -0.1, 0),
        P(G.box(0.14, 0.035, 0.06), INK.gold, 0, 0.13, 0),
        P(G.box(0.045, 0.86, 0.012), 0xd8d4c8, 0, 0.58, 0), P(G.cone(0.023, 0.08, 4), 0xd8d4c8, 0, 1.05, 0, 0, Math.PI / 4),
        P(G.box(0.008, 0.84, 0.016), 0xaaa498, 0, 0.58, 0),
      ], 0.012));
      weapon.visible = false;
      scabbard = new THREE.Group(); scabbard.position.set(-0.26, 0.15, 0.1); scabbard.rotation.z = 0.55; scabbard.rotation.x = -0.15; hips.add(scabbard);
      scabbard.add(inkedMerged([P(G.box(0.07, 0.88, 0.035), 0x1c1614, 0, -0.42, 0), P(G.box(0.08, 0.05, 0.045), INK.gold, 0, -0.84, 0), P(G.box(0.08, 0.04, 0.045), INK.gold, 0, -0.05, 0)], 0.012));
      sheathed = inkedMerged([P(G.cyl(0.022, 0.022, 0.2, 6), 0x2a1a12, 0, 0.12, 0), P(G.box(0.14, 0.035, 0.06), INK.gold, 0, 0.02, 0), P(G.sph(0.035, 6), INK.gold, 0, 0.24, 0)], 0.012);
      scabbard.add(sheathed);
    }
    const J = { ...HERO_KEYS };
    const apply = () => {
      hips.position.y = 0.95 + J.hy; hips.rotation.x = J.hx;
      torso.rotation.set(J.tx, J.ty, J.tz);
      neck.rotation.set(J.nx, J.ny, 0);
      AR.sh.rotation.set(J.sRx, J.sRy, J.sRz); AR.el.rotation.x = J.eR;
      AL.sh.rotation.set(J.sLx, J.sLy, J.sLz); AL.el.rotation.x = J.eL;
      LL.lg.rotation.set(J.lLx, 0, J.lLz); LL.kn.rotation.x = J.kL;
      LR.lg.rotation.set(J.lRx, 0, J.lRz); LR.kn.rotation.x = J.kR;
      weapon.rotation.set(J.wx, J.wy, J.wz);
    };
    let t = rnd() * 5;
    const hero = {
      kind, group: g, hips, torso, neck, cape, weapon, scabbard, sheathed, armR: AR.sh, armL: AL.sh, AR, AL, LL, LR, J,
      wind: 1, breathe: 1,
      setPose(p) { Object.assign(J, HERO_KEYS, p); apply(); },
      // 渐变到姿势；partial=true 时只改动给出的关节
      pose(p, dur = 0.5, e = Core.ease.inOut, partial = false) {
        const from = { ...J }, to = partial ? { ...J, ...p } : { ...HERO_KEYS, ...p };
        return Core.tween(dur, k => { for (const key in to) J[key] = from[key] + (to[key] - from[key]) * k; apply(); }, e);
      },
      update(dt) {
        t += dt;
        const pa = capeGeo.attributes.position;
        const H = isX ? 1.7 : 1.5;
        for (let i = 0; i < pa.count; i++) {
          const x = capeBase[i * 3], y = capeBase[i * 3 + 1];
          const k = -y / H;
          pa.setZ(i, -k * k * 0.5 * this.wind - Math.sin(t * 3.2 + x * 3 + y * 4) * 0.08 * k * this.wind);
          pa.setX(i, x * (1 + k * 0.25) + Math.sin(t * 2.3 + y * 3) * 0.03 * k * this.wind);
        }
        pa.needsUpdate = true;
        capeGeo.computeVertexNormals();
        torso.position.y = Math.sin(t * 1.4) * 0.006 * this.breathe;
      },
      // 获取手中兵器的世界坐标（刀尖/剑尖）
      tip() { return weapon.localToWorld(V(0, isX ? 2.0 : 1.0, 0)); },
    };
    hero.setPose(isX ? POSES.xStand : POSES.lStand);
    return hero;
  }
  // 常用姿势
  const POSES = {
    xStand: { sRx: -0.35, sRz: -0.15, eR: -0.95, wx: 1.25, sLx: 0.1, sLz: 0.15, eL: -0.2, nx: 0.02 },
    lStand: { sRx: 0.05, sRz: -0.12, eR: -0.2, sLx: -0.25, sLz: 0.2, eL: -1.1, sLy: 0.5 },
    lWalk: { sRx: 0.25, sRz: -0.1, eR: -0.2, sLx: -0.25, sLz: 0.2, eL: -1.1, sLy: 0.5 },
    // 刘邦拔剑、挥剑
    lDraw: { sRx: -0.35, sRy: 0.9, sRz: 0.75, eR: -1.2, tx: 0.05, ty: 0.3, sLx: -0.1, sLz: 0.15 },
    lGuard: { sRx: -1.1, sRz: -0.25, eR: -0.5, wx: 0.7, tx: 0.1, sLx: -0.5, sLz: 0.35, eL: -0.9, lLx: -0.4, kL: 0.4, lRx: 0.35, kR: 0.3, hy: -0.06 },
    lRaise: { sRx: -2.8, sRz: -0.3, eR: -0.4, wx: 0.3, tx: -0.08, ty: 0.25, sLx: -0.8, sLz: 0.4, eL: -0.6, lLx: -0.5, kL: 0.5, lRx: 0.4, kR: 0.35, hy: -0.08 },
    lSlash1: { sRx: -0.4, sRy: -0.3, sRz: 0.55, eR: -0.15, wx: 0.9, tx: 0.35, ty: -0.45, sLx: 0.2, sLz: 0.5, lLx: -0.7, kL: 0.7, lRx: 0.5, kR: 0.4, hy: -0.12 },
    lSlash2: { sRx: -1.55, sRy: 0.9, sRz: -0.2, eR: -0.1, wx: 1.5, tx: 0.2, ty: 0.7, sLx: -0.3, sLz: 0.6, lLx: -0.6, kL: 0.6, lRx: 0.45, kR: 0.4, hy: -0.1 },
    // 项羽抡刀
    xWind: { sRx: -1.1, sRy: -0.3, sRz: -0.9, eR: -0.6, wx: 1.9, wz: 0.4, ty: 1.0, tx: -0.05, sLx: -0.9, sLz: 0.3, eL: -0.9, lLx: -0.45, kL: 0.4, lRx: 0.4, kR: 0.35, hy: -0.08 },
    xSweep: { sRx: -1.35, sRy: 0.7, sRz: 0.3, eR: -0.3, wx: 1.7, wz: -0.5, ty: -1.1, tx: 0.2, sLx: -1.0, sLz: 0.5, eL: -0.6, lLx: -0.65, kL: 0.65, lRx: 0.5, kR: 0.45, hy: -0.14 },
    xOverhead: { sRx: -2.9, sRz: -0.2, eR: -0.3, wx: 0.6, tx: -0.15, sLx: -2.7, sLz: 0.2, eL: -0.3, hy: -0.02 },
    xChop: { sRx: -0.7, sRz: -0.1, eR: -0.1, wx: 1.9, tx: 0.45, sLx: -0.7, sLz: 0.25, eL: -0.2, lLx: -0.8, kL: 0.8, lRx: 0.55, kR: 0.5, hy: -0.18 },
    // 骑乘
    xRide: { sRx: -0.5, sRz: -0.2, eR: -0.9, wx: 1.6, sLx: -0.6, sLz: 0.2, eL: -0.9, lLx: -1.25, lLz: 0.5, kL: 1.35, lRx: -1.25, lRz: -0.5, kR: 1.35 },
    // 战败跪地
    xKneel: { hy: -0.42, lLx: -1.45, kL: 1.45, lRx: 0.2, kR: 1.3, tx: 0.28, ty: -0.15, nx: 0.45, sRx: -0.95, sRz: -0.3, eR: -0.55, wx: 1.5, wz: 0.15, sLx: -0.75, sLz: 0.25, eL: -0.75 },
    lKneel: { hy: -0.47, lLx: 0.05, kL: 1.55, lRx: 0.05, kR: 1.55, tx: 0.38, nx: 0.5, sRx: 0.25, sRz: -0.05, eR: -0.25, sLx: 0.25, sLz: 0.05, eL: -0.25, lLz: 0.05, lRz: -0.05 },
    lSlump: { sRx: 0.15, sRz: -0.05, eR: -0.1, sLx: -0.25, sLz: 0.2, eL: -1.0, sLy: 0.5, tx: 0.1, nx: 0.25 },
  };
  function makeXiangYu() { return makeHero('xiang'); }
  function makeLiuBang() { return makeHero('liu'); }
  function makeWuzhui() { return makeHorse({ color: 0x1f1e20, mane: 0x0e0d0d, saddle: 0x8e2016, barding: 0x2a2624, trim: 0xb08a3a }); }

  // 旌旗
  const bannerTexCache = {};
  function makeBanner(side, char) {
    const g = new THREE.Group();
    const pole = inked(G.cyl(0.03, 0.035, 4, 6), toon(C.wood)); pole.position.y = 2; g.add(pole);
    const key = side + char;
    const tex = bannerTexCache[key] || (bannerTexCache[key] = Core.canvasTex(256, 384, (c, w, h) => {
      c.fillStyle = side === 'r' ? '#a82c1c' : '#1e1d1f'; c.fillRect(0, 0, w, h);
      c.strokeStyle = side === 'r' ? '#e9c77a' : '#a88a52'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
      c.fillStyle = side === 'r' ? '#f1e3c6' : '#e3d6b8';
      c.font = `bold 190px ${Board.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(char, w / 2, h / 2 + 10);
    }));
    const geo = new THREE.PlaneGeometry(1.2, 1.8, 10, 4); geo.translate(0.6, 0, 0);
    const flag = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide }));
    flag.position.set(0.03, 3.0, 0); g.add(flag);
    const base = geo.attributes.position.array.slice();
    let t = rnd() * 5;
    return {
      group: g, flag, update(dt) {
        t += dt; const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = base[i * 3]; p.setZ(i, Math.sin(t * 4 - x * 3) * 0.12 * x); }
        p.needsUpdate = true; geo.computeVertexNormals();
      },
    };
  }

  return {
    SIDE, C, G, P, inkedMerged, soldierPartGeos, soldierStatic, Troop, Army: Troop, PARTS, POSES,
    makeHorse, makeRider, makeCavalry, cavalryStaticGeo, makeChariot, makeCannon, makeElephant, makeAdvisorCart, makeBoat, makeBoatman,
    makeHero, makeXiangYu, makeWuzhui, makeLiuBang, makeBanner, vcMat, jiShape,
    soldierGeo: (side, kind) => soldierPartGeos(side, kind).body,
  };
})();
