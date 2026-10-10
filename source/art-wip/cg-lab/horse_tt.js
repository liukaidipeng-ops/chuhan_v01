// 乌骓转台：同一盏光下拍旧版、新版，侧面和四分之三
window.STILL = {};
(() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function studio() {
    SB.reseed(5);
    const ctx = SB.stage({ top: 0x55667e, hor: 0xd9c2a2, bot: 0x7d766a, sun: [0.55, 0.45, 0.7], sunCol: 0xffd6a8, sunI: 2.4, hemi: 0.75, skyL: 0xa8b6c8, gndL: 0x5b5246, fogCol: 0xd6c3a6, fogD: 0.006, glow: 0.6, sunSize: 0.0004 });
    SB.fill(ctx, [-0.6, 0.3, -0.5], 0x9fb0cc, 0.7);   // 背后补一道冷轮廓光
    SB.ground(ctx, { col: '#8a7a60', flat: 60, hills: 0 });
    ctx.shadowAt([0, 0, 0], 4);
    return ctx;
  }
  const views = { side: [[0.1, 1.2, 6.2], [0.1, 1.05, 0]], tq: [[3.6, 1.6, 4.6], [0.15, 1.05, 0]], head: null, head3: null, front: [[3.4, 1.5, 1.6], [0.6, 1.3, 0]] };
  for (const ver of ['old', 'new']) for (const [vn, cl] of Object.entries(views)) { let [cp, lk] = cl || [[0, 0, 0], [0, 0, 1]];
    STILL[ver + '_' + vn] = () => {
      const ctx = studio();
      const H = (ver === 'new' && window.WuZhui3 ? WuZhui3 : WuZhui).make({ stage: 1 }); H.speed = 0; H.headK = 0.1; H.earK = 0.8; H.update(1 / 24); H.group.updateMatrixWorld(true);
      if (ver === 'new') CG.cgify(H.group);
      ctx.add(SB.shadows(H.group));
      let fov = 26;
      if (vn === 'head' || vn === 'head3') { const hp = H.head.localToWorld(H.headAt(0.5, 0.4).c.clone()); lk = hp.toArray(); cp = hp.clone().add(vn === 'head' ? V(0.05, 0.05, 1.5) : V(0.9, 0.1, 1.1)).toArray(); fov = 24; }
      const cam = SB.cam(cp, lk, fov);
      return { ctx, cam, post: { focus: cam.position.distanceTo(V(...lk)), ap: 0.25, maxR: 8, exp: vn.startsWith('head') ? 1.3 : 1.0, gain: [1.04, 0.99, 0.94], sat: 0.95, vign: 0.35, grain: 0.03 } };
    };
  }
})();
