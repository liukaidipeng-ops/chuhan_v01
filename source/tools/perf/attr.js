(() => { const C = __xq.Core, r = C.renderer, S = C.scene, cam = C.camera;
  const meas = () => { r.render(S, cam); return [r.info.render.calls, r.info.render.triangles]; };
  const [c0, t0] = meas(); const rows = [];
  const tag = o => { let n = 0, ex = ''; o.traverse(q => { if (q.isMesh || q.isSprite || q.isLine || q.isPoints) { n++; if (!ex) ex = (q.isSkinnedMesh ? 'skin ' : '') + q.type + '/' + (q.material && q.material.type) + '/' + (q.geometry && q.geometry.type); } }); return n + ' ' + ex; };
  for (const o of S.children) { if (!o.visible) continue; o.visible = false; const [c, t] = meas(); o.visible = true; rows.push([c0 - c, Math.round((t0 - t) / 1000), (o.name || o.type) + ' ' + tag(o)]); }
  rows.sort((a, b) => b[0] - a[0]);
  const ux = __xq.Camp && __xq.Camp.camps ? 'camps ' + __xq.Camp.camps.length : '';
  return JSON.stringify({ total: [c0, Math.round(t0 / 1000)], nChildren: S.children.length, top: rows.slice(0, 14), ux, shadowCasters: (() => { let n = 0; S.traverseVisible(q => { if (q.castShadow && (q.isMesh)) n++; }); return n; })() }, null, 0); })()
