(() => { const C = __xq.Core, cam = C.camera; cam.updateMatrixWorld(); const F = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const camps = __xq.Camp.camps || []; const out = {};
  camps.forEach((c, i) => { const g = c.group || c.root || c; let tot = 0, inV = 0; const seen = new Set();
    (c.group ? [c.group] : Object.values(c).filter(v => v && v.isObject3D)).forEach(o => o.traverse(q => { if (q.isMesh && !seen.has(q)) { seen.add(q); tot++; q.geometry.boundingSphere || q.geometry.computeBoundingSphere(); const s = q.geometry.boundingSphere.clone().applyMatrix4(q.matrixWorld); if (F.intersectsSphere(s)) inV++; } }));
    out['camp' + i] = [inV, tot, Object.keys(c).slice(0, 20).join(',')]; });
  let all = 0, vis = 0; C.scene.traverseVisible(q => { if (q.isMesh) { all++; q.geometry.boundingSphere || q.geometry.computeBoundingSphere(); if (F.intersectsSphere(q.geometry.boundingSphere.clone().applyMatrix4(q.matrixWorld))) vis++; } });
  out.sceneMeshesInView = [vis, all]; return JSON.stringify(out); })()
