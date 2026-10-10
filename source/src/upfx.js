// 棋子升级变身（美术 M22，Ham 审批台 076 选「乙 · 翻面」）：棋子跳起来翻个身，翻到侧面那一刻换成新材质，落下时已经是银 / 金 / 玉的，落地荡开一圈尘、一道光
//   UpFx.play(m, { lv, swap }) → Promise，约 1 秒
//     m    = 棋盘上那枚子（Board.pieces.get(id)）
//     lv   = 升到几级：2 银、3 金、4 玉，定光的颜色
//     swap = 换新装的函数，翻到侧面时调一次（TD 传进来，一般是 Board.decorate(m, 升级后的子, …)）
//   低特效档（Fx.level === 'low'）、系统「减少动态效果」：不翻，直接 swap，脚下亮一圈
//   翻的时候脚下的东西（血圈、拒马桩、锁链、头顶的「宴」）留在原地不跟着翻，落地后放回去
window.UpFx = (() => {
  const PI = Math.PI, V3 = THREE.Vector3;
  const LV = { 2: { glow: 0xdfe8ff, spark: 0xf0f4ff }, 3: { glow: 0xffc65a, spark: 0xffd27a }, 4: { glow: 0xd8f5e6, spark: 0xf6fff9 } };
  const T = 1.0, UP0 = 0.04, UP1 = 0.72, HIGH = 0.42;   // 时长；起跳、落地在全程里的位置；跳多高
  const sm = t => t * t * (3 - 2 * t), cl = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  let R = null;
  function res() {
    if (R) return R;
    const ring = (a, b, n) => { const g = new THREE.RingGeometry(a, b, n); g.rotateX(-PI / 2); return g; };
    return (R = { dust: ring(0.3, 0.42, 48), flash: ring(0.42, 0.5, 64) });
  }
  const add = (parent, geo, mat) => { const x = new THREE.Mesh(geo, mat); parent.add(x); return x; };
  const glowMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  // 脚下一圈光（低特效档也用）
  function groundFlash(m, C, dur) {
    const g = res(), fl = add(m.parent, g.flash, glowMat(C.glow)); fl.position.copy(m.position); fl.position.y += 0.01;
    const off = Core.onFrame(dt => {
      fl.userData.t = (fl.userData.t || 0) + dt; const k = Math.min(1, fl.userData.t / dur);
      fl.material.opacity = 1 - k; fl.scale.setScalar(1 + k * 2.2);
      if (k >= 1) { off(); fl.parent && fl.parent.remove(fl); fl.material.dispose(); }
    });
  }
  // 装饰组里不属于棋身的东西（血圈、桩、锁链、头顶的字）
  const isGround = c => !c.userData.skin && c.userData.plate == null;
  function play(m, o = {}) {
    const swap = o.swap || (() => {}), C = LV[Math.min(4, Math.max(2, o.lv | 0 || 2))];
    if (!m || !m.parent) { swap(); return Promise.resolve(); }
    if ((typeof Fx !== 'undefined' && Fx.level === 'low') || reduced()) { swap(); groundFlash(m, C, 0.6); return Promise.resolve(); }
    const base = m.position.clone(), q0 = m.quaternion.clone(), parent = m.parent, g = res();
    const body = m.children[0]; if (body && body.geometry && !body.geometry.boundingBox) body.geometry.computeBoundingBox();
    const ch = (body && body.geometry.boundingBox ? body.geometry.boundingBox.max.y : 0.2) / 2;   // 绕棋子中心翻
    // 翻转轴：镜头的水平右方向，字面先朝镜头翻过来
    const axis = new V3().setFromMatrixColumn(Core.camera.matrixWorld, 0); axis.y = 0; if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0); axis.normalize();
    const gnd = new THREE.Group(); gnd.position.copy(base); gnd.quaternion.copy(q0); parent.add(gnd);
    const fx = new THREE.Group(); parent.add(fx);
    const dust = add(fx, g.dust, new THREE.MeshBasicMaterial({ color: 0xd8c9a8, transparent: true, opacity: 0, depthWrite: false }));
    const flash = add(fx, g.flash, glowMat(C.glow));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: Board.glowTex, color: C.glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    glow.renderOrder = 8; fx.add(glow);
    for (const x of [dust, flash]) x.position.set(base.x, base.y + (x === dust ? 0.005 : 0.01), base.z);
    const pull = () => {
      const d = m.userData.deco;
      for (const c of [...gnd.children]) if (c.userData.upHome !== d) gnd.remove(c);   // 换装前的那一份不要了
      if (d) for (const c of [...d.children]) if (isGround(c)) { c.userData.upHome = d; gnd.add(c); }
    };
    const qa = new THREE.Quaternion(), off = new V3();
    let t = 0, swapped = false, landed = false, done;
    try { Sfx.lift(); Sfx.B.whoosh(0.08, 0.35, 0.2); } catch (e) {}
    pull();
    const stop = Core.onFrame(dt => {
      t = Math.min(T, t + dt); const k = t / T;
      const up = cl(k, UP0, UP1), land = cl(k, UP1, 1), ang = sm(up) * PI;
      if (!swapped && ang >= PI / 2) {
        swapped = true; try { swap(); } catch (e) { console.error('升级换装出错', e); }
        pull();   // 换装会重建装饰组，脚下的东西再拿出来一次
        try { for (let i = 0; i < 10; i++) Fx.spawn({ pos: base.clone().add(new V3(0, HIGH + ch, 0)), vel: new V3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2), tex: Core.Tex.spark, add: true, color: C.spark, size: 0.1, size2: 0.02, life: 0.35 + Math.random() * 0.3, drag: 2 }); } catch (e) {}
      }
      // 旧的翻到侧面就换成新的；新的多转半圈，落地时字朝上
      qa.setFromAxisAngle(axis, ang < PI / 2 ? ang : ang + PI);
      const y = Math.sin(up * PI) * HIGH, bounce = Math.max(0, Math.sin(land * PI * 2) * 0.04 * (1 - land));
      m.quaternion.copy(q0).premultiply(qa);
      off.set(0, -ch, 0).applyQuaternion(qa);
      m.position.set(base.x + off.x, base.y + y + bounce + ch + off.y, base.z + off.z);
      // 翻到半空亮一下
      const mid = Math.exp(-Math.pow((ang - PI / 2) / 0.35, 2)) * (land > 0 ? 0 : 1);
      glow.position.set(base.x, base.y + y + ch, base.z); glow.material.opacity = 0.9 * mid; glow.scale.setScalar(0.9 + 0.7 * mid);
      if (land > 0 && !landed) { landed = true; try { Sfx.place(m); } catch (e) {} }
      dust.material.opacity = land > 0 ? 0.55 * (1 - land) : 0; dust.scale.setScalar(1 + land * 1.4);
      flash.material.opacity = land > 0 ? 1 - land : 0; flash.scale.setScalar(1 + land * 2.2);
      if (t >= T) finish();
    });
    function finish() {
      stop();
      m.position.copy(base); m.quaternion.copy(q0);
      const d = m.userData.deco;
      for (const c of [...gnd.children]) { if (d && c.userData.upHome === d) d.add(c); else gnd.remove(c); delete c.userData.upHome; }
      parent.remove(gnd); parent.remove(fx);
      for (const x of [dust, flash, glow]) x.material.dispose();
      done();
    }
    return new Promise(r => { done = r; });
  }
  return { play };
})();
