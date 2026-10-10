// 亭长转台：旧版（卡通圆球脸）对新版（雕出来的老人脸 + 过场材质），脸部正面、四分之三、全身
window.STILL = {};
(() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function studio() {
    SB.reseed(5);
    const ctx = SB.stage({ top: 0x55667e, hor: 0xd9c2a2, bot: 0x7d766a, sun: [0.75, 0.5, 0.45], sunCol: 0xffd6a8, sunI: 2.4, hemi: 0.8, skyL: 0xa8b6c8, gndL: 0x5b5246, fogCol: 0xd6c3a6, fogD: 0.006, glow: 0.6, sunSize: 0.0004 });
    SB.fill(ctx, [-0.6, 0.4, -0.6], 0xa8b8d0, 0.9); SB.fill(ctx, [1, -0.15, 0.2], 0xffe2c0, 1.0);   // 斗笠底下从前下方补一盏（拍片时也要这样打）
    SB.ground(ctx, { col: '#8a7a60', flat: 60, hills: 0 });
    ctx.shadowAt([0, 0, 0], 3);
    return ctx;
  }
  for (const ver of ['old', 'new']) for (const vn of ['face', 'face3', 'body']) {
    STILL[ver + '_' + vn] = () => {
      const ctx = studio();
      const F = Ferry.makeFerry({ scale: 1.5, cg: ver === 'new' }); const man = F.man.group; ctx.add(man); man.position.set(0, 0, 0); man.rotation.y = 0; man.scale.setScalar(1.5);
      F.setPose('stand', 0.01); F.update(0.1); man.updateMatrixWorld(true);
      if (ver === 'new') CG.cgify(man);
      ctx.add(SB.shadows(man));
      const hp = F.man.J.head.getWorldPosition(V(0, 0, 0)).add(V(0.02, 0.06, 0));
      const cam = vn === 'face' ? SB.cam(hp.clone().add(V(0.95, -0.12, 0.02)).toArray(), hp.toArray(), 24)
        : vn === 'face3' ? SB.cam(hp.clone().add(V(0.7, -0.08, 0.6)).toArray(), hp.toArray(), 24) : SB.cam([6.8, 1.9, 2.8], [0, 1.55, 0], 26);
      return { ctx, cam, post: { focus: cam.position.distanceTo(vn === 'body' ? V(0, 1.2, 0) : hp), ap: 0.25, maxR: 8, exp: 1.05, gain: [1.04, 0.99, 0.94], sat: 0.95, vign: 0.35, grain: 0.03 } };
    };
  }
})();
