(() => { const C = __xq.Core, r = C.renderer, S = C.scene, cam = C.camera; C.render = false; r.info.autoReset = false;
  const meas = () => { r.info.reset(); r.shadowMap.needsUpdate = true; r.render(S, cam); return [r.info.render.calls, Math.round(r.info.render.triangles / 1000)]; };
  const base = meas(); const out = { base };
  for (const lv of [1, 2, 3, 4]) {
    const es = [0, 1].map(i => { const e = ElephantLV.make('b', { lv, plan: 'b' }); e.group.scale.setScalar(0.42 * (e.lvScale || 1)); e.group.position.set(i ? 2.1 : -2.1, 0.25, -3.6); S.add(e.group); return e; });
    const m = meas(); let meshes = 0; es[0].group.traverse(o => { if (o.isMesh) meshes++; });
    out['lv' + lv] = { addCalls: m[0] - base[0], addKTris: m[1] - base[1], meshesPerElephant: meshes };
    for (const e of es) { S.remove(e.group); C.disposeTree && C.disposeTree(e.group); }
  }
  return JSON.stringify(out); })()
