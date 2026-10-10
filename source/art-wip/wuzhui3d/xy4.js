// 项羽 v4：在 v3（XY3，art-wip/xiangyu-v3）外面加一副能动的骨架——腿（大腿、小腿、脚）、腰、胸，
// 原来钉死在根上的甲、甲裙、腿、靴、披风按部位自动蒙皮到骨头上（甲裙随两条大腿分开，骑马时能跨开）。
//   XY4.make({ stage }) → { group, J, pose(p), update(dt), mountOn(horse) }
//   pose：{ hipsRx 前俯, chestRx 胸俯仰, chestRy 转身, headRx, headRy, legs: [[大腿前抬, 外撇, 小腿弯], 右, 左] ... } 都可省
const XY4 = (() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function make(o = {}) {
    const X = XY3.make(o), root = X.group, J = X.J;
    root.updateMatrixWorld(true);
    // —— 新骨头：两条腿（髋 → 膝 → 踝），全挂在 hips 下 ——
    const HIPY = 1.12, legs = {};
    for (const s of [-1, 1]) {
      const th = new THREE.Group(); th.position.set(s * 0.105, 0.76 - HIPY, 0.01); J.hips.add(th);
      const kn = new THREE.Group(); kn.position.set(0, 0.445 - 0.76, 0); th.add(kn);
      const an = new THREE.Group(); an.position.set(0, 0.15 - 0.445, 0); kn.add(an);
      legs[s] = { th, kn, an }; J['thigh' + s] = th; J['knee' + s] = kn; J['ankle' + s] = an;
    }
    const pelvis = new THREE.Group(); pelvis.position.set(0, 0, 0); J.hips.add(pelvis); J.pelvis = pelvis;   // 腰以下、两腿之间（甲裙的中缝）
    root.updateMatrixWorld(true);
    const bones = [J.hips, J.chest, legs[-1].th, legs[-1].kn, legs[-1].an, legs[1].th, legs[1].kn, legs[1].an, pelvis];
    const B = { hips: 0, chest: 1, th: { '-1': 2, '1': 5 }, kn: { '-1': 3, '1': 6 }, an: { '-1': 4, '1': 7 }, pelvis: 8 };
    const skeleton = new THREE.Skeleton(bones);
    // —— 按部位给每个顶点分骨头（最多四根） ——
    function weights(p) {
      const w = new Map(); const add = (b, k) => { if (k > 1e-4) w.set(b, (w.get(b) || 0) + k); };
      const y = p.y, side = p.x >= 0 ? 1 : -1, sx = Math.abs(p.x);
      const cape = p.z < -0.12 && sx < 0.75;   // 披风（背后）
      if (cape) { const kc = ss(1.05, 1.35, y); add(B.chest, kc); add(B.hips, 1 - kc); }
      else if (y > 1.0 || (y > 0.66 && sx > 0.24)) {   // 腰以上 / 甲裙外缘
        if (y > 1.0) { const kc = ss(1.12, 1.3, y); add(B.chest, kc); add(B.hips, 1 - kc); }
        else { const kl = ss(1.05, 0.72, y) * 0.85; add(B.th[side], kl); add(B.hips, 1 - kl); }
      } else if (y > 0.66) {   // 甲裙里层、前后襟：跟着同侧大腿，中缝两腿各半
        const kl = ss(1.08, 0.72, y), mix = ss(-0.06, 0.06, p.x);
        add(B.th[1], kl * mix); add(B.th[-1], kl * (1 - mix)); add(B.hips, 1 - kl);
      } else {   // 腿
        const kk = ss(0.48, 0.41, y), ka = ss(0.19, 0.12, y);
        add(B.th[side], 1 - kk); add(B.kn[side], kk * (1 - ka)); add(B.an[side], kk * ka);
      }
      const arr = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = arr.reduce((a, e) => a + e[1], 0) || 1;
      while (arr.length < 4) arr.push([0, 0]);
      return arr.map(([b, k]) => [b, k / sum]);
    }
    // 只处理直接挂在 root 上的网格（胳膊、头、兵器、虎头吞肩都在各自的关节下，不动）
    const skip = new Set([J.ji, J.sword, J['tiger-1'], J['tiger1'], J.hips]);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), tmp = V(0, 0, 0), done = new Map();
    const targets = [];
    root.traverse(m => { if (!m.isMesh || m.isSkinnedMesh) return; let p = m.parent, ok = true; while (p && p !== root) { if (skip.has(p)) { ok = false; break; } p = p.parent; } if (ok && !skip.has(m)) targets.push(m); });
    for (const m of targets) {
      const geo = m.geometry;
      if (!done.has(geo)) {
        const mw = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), pos = geo.attributes.position, n = pos.count;
        const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) { tmp.fromBufferAttribute(pos, i).applyMatrix4(mw); const ws = weights(tmp); for (let k = 0; k < 4; k++) { si[i * 4 + k] = ws[k][0]; sw[i * 4 + k] = ws[k][1]; } }
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        done.set(geo, 1);
      }
      const sk = new THREE.SkinnedMesh(geo, m.material); sk.position.copy(m.position); sk.quaternion.copy(m.quaternion); sk.scale.copy(m.scale); sk.castShadow = m.castShadow; sk.renderOrder = m.renderOrder; sk.frustumCulled = false;
      const par = m.parent; par.add(sk); par.remove(m); sk.updateMatrixWorld(true); sk.bind(skeleton, sk.matrixWorld);
    }
    // —— 姿势 ——
    const cur = { hipsRx: 0, hipsY: 0, chestRx: 0, chestRy: 0, headRx: 0, headRy: 0, legs: { '1': [0, 0, 0, 0], '-1': [0, 0, 0, 0] } };
    function pose(p = {}) {
      Object.assign(cur, p); if (p.legs) cur.legs = { '1': p.legs[1] || p.legs['1'] || [0, 0, 0, 0], '-1': p.legs[-1] || p.legs['-1'] || [0, 0, 0, 0] };
      J.hips.rotation.set(cur.hipsRx, 0, 0); J.hips.position.y = HIPY + cur.hipsY;
      J.chest.rotation.set(cur.chestRx, cur.chestRy, 0); J.head.rotation.set(cur.headRx, cur.headRy, 0);
      for (const s of [-1, 1]) { const [up, out, bend, foot] = cur.legs[s]; legs[s].th.rotation.set(-up, 0, s * out); legs[s].kn.rotation.set(bend, 0, 0); legs[s].an.rotation.set(foot || -(bend - up) * 0.6, 0, 0); }
      root.updateMatrixWorld(true);
    }
    // 骑上马：根挂到马的躯干上（跟着马起伏），坐在鞍上，两腿跨开垂在两侧
    const SEAT = { up: 0.85, out: 0.55, bend: 0.9 };
    function mountOn(horse, at = { x: 0.04, y: 1.62 }) {
      horse.bp.add(root); root.position.set(at.x, at.y - 0.76, 0); root.rotation.set(0, PI / 2, 0);
      pose({ hipsRx: 0.05, chestRx: -0.02, legs: { 1: [SEAT.up, SEAT.out, SEAT.bend], '-1': [SEAT.up, SEAT.out, SEAT.bend] } });
    }
    pose({});
    return { group: root, J, pose, update: X.update, setPose: X.setPose, mountOn, POSES: X.POSES, skeleton };
  }
  return { make };
})();
