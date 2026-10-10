  const PI = Math.PI, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // ---------- 零件（照游戏里 spear 兵；身子拆成上身 / 胯，腿、胳膊各两节） ----------
  const SIDE = { r: { cloth: 0xa8321f, cloth2: 0xc4553a, armor: 0x4d4541, trim: 0xc9a045, tassel: 0xc0412c }, b: { cloth: 0x2a292c, cloth2: 0x48464a, armor: 0x2f2e31, trim: 0x9c8a62, tassel: 0x7a2418 } };
  const C = { skin: 0xd8bf98, pants: 0x2d2a27, wood: 0x6e4a2c, metal: 0xb8b4aa, dark: 0x1d1c1b, hair: 0x151413 };
  const G = { box: (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl: (a, b, h, s = 8) => new THREE.CylinderGeometry(a, b, h, s), sph: (r, s = 8) => new THREE.SphereGeometry(r, s, Math.max(4, s - 2)), cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s) };
  const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
  const P = (geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => ({ geo, color, m: M4(x, y, z, rx, ry, rz, sx, sy, sz) });
  function mk(parts, piv) {
    const pos = [], nor = [], col = [];
    for (const p of parts) {
      const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()); g.applyMatrix4(p.m); if (piv) g.translate(-piv[0], -piv[1], -piv[2]);
      const c = new THREE.Color(p.color), a = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  const grad = (() => { const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 235, 235, 235, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const vcMat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: grad });
  const olMat = new THREE.MeshBasicMaterial({ color: 0x15120f, side: THREE.BackSide });
  olMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * 0.016;'); };
  const inked = geo => { const g = new THREE.Group(); const m = new THREE.Mesh(geo, vcMat); m.castShadow = true; g.add(m, new THREE.Mesh(geo, olMat)); return g; };
  // ---------- 骨架：上身、胯按关节值摆；腿、胳膊两节反解去够脚、手的目标 ----------
  const L_TH = 0.4, L_SH = 0.43, L_UA = 0.25, L_FA = 0.24;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  const frame = (pos, yAxis, zHint) => {   // 以 pos 为原点、y 轴朝 yAxis、z 轴尽量朝 zHint 的矩阵
    const y = yAxis.clone().normalize(), x = new THREE.Vector3().crossVectors(y, zHint).normalize(); if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
    const z = new THREE.Vector3().crossVectors(x, y); return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
  };
  function ik2(a, b, l1, l2, pole) {   // a 根、b 目标、pole 关节弯向；返回 [中间关节, 实际末端]
    const ab = b.clone().sub(a), d = Math.min(l1 + l2 - 1e-3, Math.max(1e-3, ab.length())), n = ab.normalize();
    const end = a.clone().addScaledVector(n, d), cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const pp = pole.clone().addScaledVector(n, -pole.dot(n)).normalize();
    return [a.clone().addScaledVector(n, cosA * l1).addScaledVector(pp, sA * l1), end];
  }
  const dirOf = (yaw, pitch) => V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  class Soldier {
    constructor(geos) {
      this.root = new THREE.Group(); this.p = {}; this.gone = new Set();
      for (const k in geos) { const g = inked(geos[k]); g.matrixAutoUpdate = false; this.root.add(g); this.p[k] = g; }
    }
    // S：px 沿交锋线往前、side 往盾那边为负、py 起跳；crouch、lean 前倾、twist 拧腰（往盾那边为正）、sway 侧歪；
    //    fL / fR 两脚在交锋线上的位置、liftL / liftR 抬脚；wp 握矛的手、wd 矛的朝向 [左右, 俯仰]、g 手离矛根多远；sp 盾心、sd 盾面朝向；hx 低头、hy 转头；fall 下半身倒地
    pose(S) {
      const M = {}, pelvisPos = V(S.side, 0.9 - S.crouch + S.py, S.px);
      _e.set(S.lean * 0.35, S.twist * 0.3, S.sway * 0.4, 'YXZ'); const pel = new THREE.Matrix4().compose(pelvisPos, _q.setFromEuler(_e), V(1, 1, 1));
      if (S.fall) { const f = new THREE.Matrix4().makeTranslation(S.side, 0, S.px).multiply(new THREE.Matrix4().makeRotationX(-S.fall * 1.5)).multiply(new THREE.Matrix4().makeTranslation(-S.side, 0, -S.px)); pel.premultiply(f); }
      M.pelvis = pel;
      _e.set(S.lean * 0.65, S.twist * 0.7, S.sway * 0.6, 'YXZ'); const up = pel.clone().multiply(new THREE.Matrix4().compose(V(0, 0.08, 0), _q.setFromEuler(_e), V(1, 1, 1)));
      M.upper = up;
      M.head = up.clone().multiply(new THREE.Matrix4().compose(V(0, 0.52, 0), _q.setFromEuler(_e.set(S.hx, S.hy, 0, 'YXZ')), V(1, 1, 1)));
      const fwdP = V(0, 0, 1).transformDirection(pel);
      // 腿：髋 → 膝 → 脚底，膝盖朝前
      for (const [k, s] of [['L', -1], ['R', 1]]) {
        const hip = V(0.1 * s, -0.04, 0).applyMatrix4(pel), foot = V(0.13 * s + S.side, S['lift' + k], S['f' + k]);
        if (S.fall) foot.applyMatrix4(new THREE.Matrix4().makeTranslation(S.side, 0, S.px).multiply(new THREE.Matrix4().makeRotationX(-S.fall * 1.5)).multiply(new THREE.Matrix4().makeTranslation(-S.side, 0, -S.px)));
        const [knee, end] = ik2(hip, foot, L_TH, L_SH, fwdP.clone().add(V(0, 0.2, 0)));
        M['thigh' + k] = frame(hip, hip.clone().sub(knee), fwdP); M['shin' + k] = frame(knee, knee.clone().sub(end), fwdP);
      }
      // 胳膊：肩 → 肘 → 手；握矛的手去够 wp，持盾的手去够盾心后面
      const fwdU = V(0, 0, 1).transformDirection(up);
      const sh = { W: V(0.27, 0.44, 0).applyMatrix4(up), S: V(-0.27, 0.44, 0).applyMatrix4(up) };
      const body = V(S.side, S.py, S.px);   // 手、盾的目标是相对身子写的：跟着人一起往前走、往旁边闪、往上跳
      const [elW, hW] = ik2(sh.W, V(...S.wp).add(body), L_UA, L_FA, V(0.6, -1, -0.5));
      M.uarmW = frame(sh.W, sh.W.clone().sub(elW), fwdU); M.farmW = frame(elW, elW.clone().sub(hW), fwdU);
      const wdir = dirOf(S.wd[0], S.wd[1]);
      let gg = 0.5 + 0.62 * S.g;   // 手握的位置离矛根多远：整体往矛杆中间挪（085「手拿矛可以再拿中间一点」）
      { // 矛根别扎进自己肚子：矛杆往回要穿过身子时，手顺着矛杆往矛根滑
        const ta = V(0, 0, 0).applyMatrix4(pel), tb = V(0, 0.5, 0).applyMatrix4(up), ab = tb.clone().sub(ta), L2 = ab.lengthSq();
        for (let s = 0.08; s <= gg; s += 0.03) { const q = hW.clone().addScaledVector(wdir, -s), u = Math.max(0, Math.min(1, q.clone().sub(ta).dot(ab) / L2)); if (q.distanceTo(ta.clone().addScaledVector(ab, u)) < 0.25) { gg = Math.max(0.3, s - 0.05); break; } }
      }
      M.weapon = frame(hW, wdir, Math.abs(wdir.y) < 0.95 ? V(0, 1, 0) : V(0, 0, 1)).multiply(new THREE.Matrix4().makeTranslation(0, 0.7 - gg, 0));
      const n = dirOf(S.sd[0], S.sd[1]), sc = V(...S.sp).add(body), want = sc.clone().addScaledVector(n, -0.07);
      const [elS, hS] = ik2(sh.S, want, L_UA, L_FA, V(-0.6, -1, -0.4));
      M.uarmS = frame(sh.S, sh.S.clone().sub(elS), fwdU); M.farmS = frame(elS, elS.clone().sub(hS), fwdU);
      const shC = hS.clone().addScaledVector(n, 0.07), upS = V(0, 1, 0).addScaledVector(n, -n.y).normalize();
      M.shield = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(upS, n), upS, n).setPosition(shC);
      for (const k in M) if (this.p[k] && !this.gone.has(k)) this.p[k].matrix.copy(M[k]);
      this.M = M; this.hW = hW; this.wdir = wdir; this.shC = shC; this.shN = n; this.gg = gg; this.upS = upS;
      return M;
    }
  }
