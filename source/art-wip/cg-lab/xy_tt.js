// 项羽转台：旧版（局内同款卡通）对新版（o.cg + CG 材质 + 披风吹风），全身四分之三和脸部特写
window.STILL = {};
(() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function studio() {
    SB.reseed(5);
    const ctx = SB.stage({ top: 0x55667e, hor: 0xd9c2a2, bot: 0x7d766a, sun: [0.5, 0.5, 0.75], sunCol: 0xffd6a8, sunI: 2.4, hemi: 0.8, skyL: 0xa8b6c8, gndL: 0x5b5246, fogCol: 0xd6c3a6, fogD: 0.006, glow: 0.6, sunSize: 0.0004 });
    SB.fill(ctx, [-0.6, 0.4, -0.6], 0xa8b8d0, 0.9);
    SB.ground(ctx, { col: '#8a7a60', flat: 60, hills: 0 });
    ctx.shadowAt([0, 0, 0], 3);
    return ctx;
  }
  for (const ver of ['old', 'new']) for (const vn of ['body', 'face', 'back']) {
    STILL[ver + '_' + vn] = () => {
      const ctx = studio();
      const X = XY4.make({ stage: 2, cg: ver === 'new' }); X.group.rotation.y = 0.35; X.update(0.1); X.group.updateMatrixWorld(true);
      if (ver === 'new') { CG.cgify(X.group); CG.wind(X.group, { k: 1 }); CG.tick(1.7); }
      ctx.add(SB.shadows(X.group));
      const hp = X.J.head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.08, 0));
      const cam = vn === 'face' ? SB.cam(hp.clone().add(V(0.25, -0.02, 0.85)).toArray(), hp.toArray(), 22)
        : vn === 'back' ? SB.cam([-2.6, 1.4, -3.4], [0, 1.0, 0], 26) : SB.cam([1.4, 1.3, 4.4], [0, 1.0, 0], 26);
      return { ctx, cam, post: { focus: cam.position.distanceTo(vn === 'face' ? hp : V(0, 1, 0)), ap: 0.25, maxR: 8, exp: 1.05, gain: [1.04, 0.99, 0.94], sat: 0.95, vign: 0.35, grain: 0.03 } };
    };
  }
})();
