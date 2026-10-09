// 终局演出用的运行时：角色（MakeHuman 网格 + 骨架）、材质、后期（景深、颗粒、暗角、黑边）
const Cine = (() => {
  const b64 = (s, T) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  // —— 角色 ——
  function makeBody(J, mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(b64(J.pos, Float32Array), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(b64(J.uv, Float32Array), 2));
    if (J.nrm) g.setAttribute('normal', new THREE.BufferAttribute(b64(J.nrm, Float32Array), 3));
    g.setIndex(new THREE.BufferAttribute(b64(J.idx, J.idx32 ? Uint32Array : Uint16Array), 1));
    const si = b64(J.si, Uint8Array), sw = b64(J.sw, Float32Array);
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(si), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (J.morphs) {
      const names = Object.keys(J.morphs), n = J.n; g.morphAttributes.position = [];
      for (const k of names) {
        const arr = new Float32Array(n * 3), ii = b64(J.morphs[k].i, J.idx32 ? Uint32Array : Uint16Array), dd = b64(J.morphs[k].d, Float32Array);
        for (let j = 0; j < ii.length; j++) { arr[ii[j] * 3] = dd[j * 3]; arr[ii[j] * 3 + 1] = dd[j * 3 + 1]; arr[ii[j] * 3 + 2] = dd[j * 3 + 2]; }
        g.morphAttributes.position.push(new THREE.BufferAttribute(arr, 3));
      }
      g.morphTargetsRelative = true; g.userData.morphNames = names;
    }
    if (!J.nrm) g.computeVertexNormals();
    const { bones, byName } = makeSkeleton(J.bones);
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones));
    if (J.morphs) { mesh.morphTargetDictionary = {}; g.userData.morphNames.forEach((k, i) => mesh.morphTargetDictionary[k] = i); mesh.morphTargetInfluences = new Array(g.userData.morphNames.length).fill(0); }
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.userData.bones = byName; mesh.userData.lm = J.lm || {}; mesh.userData.J = J;
    return mesh;
  }
  function makeSkeleton(B) {
    const bones = [], byName = {}, world = {};
    for (const d of B) {
      const b = new THREE.Bone(); b.name = d.name;
      const m = new THREE.Matrix4().makeBasis(V3(d.x), V3(d.y), V3(d.z)).setPosition(V3(d.head));
      world[d.name] = m;
      const pm = d.parent ? world[d.parent] : new THREE.Matrix4();
      const loc = pm.clone().invert().multiply(m);
      loc.decompose(b.position, b.quaternion, b.scale);
      b.userData.rest = b.quaternion.clone(); b.userData.restPos = b.position.clone();
      b.userData.len = V3(d.tail).distanceTo(V3(d.head));
      if (d.parent) byName[d.parent].add(b);
      bones.push(b); byName[d.name] = b;
    }
    return { bones, byName };
  }
  // 姿势：{骨名: [x, y, z] 度}，在骨头自己的静止坐标系里转（y 沿骨头）
  const _e = new THREE.Euler(), _q = new THREE.Quaternion();
  function pose(mesh, P, k = 1, base) {
    const B = mesh.userData.bones;
    for (const n in B) { const b = B[n]; b.quaternion.copy(b.userData.rest); }
    const apply = (Q, w) => { for (const n in Q) { const b = B[n]; if (!b) continue; const r = Q[n]; _e.set(r[0] * w * Math.PI / 180, r[1] * w * Math.PI / 180, r[2] * w * Math.PI / 180, 'XZY'); _q.setFromEuler(_e); b.quaternion.multiply(_q); } };
    if (base) apply(base, 1);
    apply(P, k);
  }
  function blendPoses(A, Bp, t) {   // 两个姿势按 t 插值（逐骨欧拉角线性插值，够用）
    const o = {}, ks = new Set([...Object.keys(A), ...Object.keys(Bp)]);
    for (const k of ks) { const a = A[k] || [0, 0, 0], b = Bp[k] || [0, 0, 0]; o[k] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    return o;
  }
  return { makeBody, pose, blendPoses, b64 };
})();
