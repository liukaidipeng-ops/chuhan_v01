// H29 分镜台：相 / 象打拒马。真实对局里摆攻守两方 + 拒马路障，按镜头摆姿势定格
window.SB = (() => {
  const V3 = THREE.Vector3, PI = Math.PI;
  let A, B, d, yaw, att = null, def = null, wall = null, xb = null, bolts = [];
  const kill = s => { try { s && s.dispose && s.dispose(); } catch (e) {} };
  function clear() { kill(att); kill(def); kill(xb); if (wall) wall.dispose(); for (const b of bolts) b.parent && b.parent.remove(b); bolts = []; att = def = xb = wall = null; }
  if (!window.__SBT) { window.__SBT = 1; Core.onFrame(dt => { if (wall) wall.update(dt); }); }
  // o: { atk: 'tiger' | 'ele', alv, dlv, from, to }
  function setup(o) {
    clear();
    const from = o.from || [1, 7], to = o.to || [1, 4];
    A = Board.pos(...from); B = Board.pos(...to); d = B.clone().sub(A).setY(0).normalize(); yaw = Squads.yawOf(d);
    for (const m of Board.pieces.values()) if (Math.abs(m.position.x - B.x) < 1.2 && m.position.z > Math.min(A.z, B.z) - 1.2 && m.position.z < Math.max(A.z, B.z) + 1.2) m.visible = false;
    const dSide = o.atk === 'tiger' ? 'b' : 'r', aSide = o.atk === 'tiger' ? 'r' : 'b';
    def = Squads.make('p', dSide, B, yaw + PI, 'defend', o.dlv, o.dlv);
    Squads.jmForm(def, true); def.place(1); def.troop.units.forEach(u => u.vis = 1); def.setVis && def.setVis(1);
    wall = JumaWall.make(dSide, o.dlv); const c = B.clone(); c.y = Board.TOP; wall.group.position.copy(c); wall.group.rotation.y = yaw + PI; Core.scene.add(wall.group);
    att = Squads.make('e', aSide, A, yaw, 'attack', o.alv, o.alv); att.setVis && att.setVis(1); if (att.place) att.place(1);
    if (att.guard) { att.gk = 1; att.guard.setVis(1); }
    if (o.atk === 'tiger' && o.alv <= 2) {   // 一、二级相身边现出的那名弩手
      xb = new Squads.TroopSquad('e', aSide, A, yaw, 'xbow', [[-0.4, 0.06]], 0.2); xb.troop.units.forEach(u => u.vis = 1); xb.setVis && xb.setVis(1); xb.place(1);
    }
    return true;
  }
  // 攻方站在离守方中心 gap 远（沿来路）
  function atkAt(gap, o = {}) {
    const p = B.clone().addScaledVector(d, -gap); att.anchor.copy(p); if (att.sync) att.sync(); if (att.place) att.place(1);
    if (att.guard) { att.guard.anchor.copy(p); att.guard.yaw = yaw; att.guard.place(1); }
    if (xb) { xb.anchor.copy(p.clone().addScaledVector(d, o.xbBack ?? 0.05)); xb.place(1); }
    const m = att.m; if (m) { for (const k of ['speed', 'pounceK', 'roarK', 'rearK', 'trumpetK']) if (k in m && o[k] != null) m[k] = o[k]; }
  }
  function xbPose(p, act) {
    for (const s of [xb, att && att.guard]) if (s) { s.setPose(p); if (act) s.troop.actAll(act, 0.3, 0.05); }
  }
  function xbShow(k) { if (xb) { xb.troop.units.forEach(u => u.vis = k); xb.setVis && xb.setVis(k); } }
  // 弩箭：从弩手往守方飞，t = 0..1 在路上的位置；stick = 插在盾 / 桩上
  function bolt(t, o = {}) {
    const srcs = [xb, att && att.guard].filter(Boolean); if (!srcs.length) return;
    const geo = new THREE.CylinderGeometry(0.011, 0.011, 0.26, 5); geo.rotateX(PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8d6a8 });
    srcs.forEach((s, j) => s.troop.units.forEach((u, i) => {
      const p0 = u.p.clone().add(new V3(0, 0.26, 0)), tgt = def.troop.units[(i + j) % def.troop.units.length].p.clone().add(new V3((Math.random() - 0.5) * 0.1, 0.2 + Math.random() * 0.08, 0));
      for (let k = 0; k < (o.n || 1); k++) {
        const tt = Math.max(0, Math.min(1, t - k * 0.18)), m = new THREE.Mesh(geo, mat); m.position.lerpVectors(p0, tgt, tt); m.lookAt(tgt); Core.scene.add(m); bolts.push(m);
      }
    }));
  }
  function defPose(o = {}) {
    def.troop.units.forEach((u, i) => { u.jmHit = o.hit || 0; if (o.act) def.troop.act(i, o.act, 0.5); });
  }
  function hitFx(o = {}) {
    const P_ = Fx.P, c = B.clone().addScaledVector(d, -(o.at ?? 0.1)); c.y = Board.TOP + (o.h ?? 0.25);
    if (P_.blood) P_.blood(c, o.n ?? 14, 0.8, d.clone().negate());
    if (o.wood && P_.wood) P_.wood(c, 10, d.clone(), 0.7);
    if (o.dust && P_.dust) P_.dust(c.clone().setY(Board.TOP + 0.02), 12, d.clone(), 0.4);
  }
  function scatter(power = 1.2) { wall.shatter(d.clone(), power); }
  function shake(power = 1) { wall.shake(d.clone(), power); }
  function killDef(o = {}) {
    def.troop.units.forEach((u, i) => {
      const v = d.clone().multiplyScalar((o.far ?? 1.4) * (0.8 + Math.random() * 0.5)).add(new V3((Math.random() - 0.5) * 0.8, o.up ?? 1.8, (Math.random() - 0.5) * 0.8));
      def.troop.kill(i, { dir: Squads.yawOf(d) + (Math.random() - 0.5), speed: 3, fly: o.fly ? { v, g: 9, w: (Math.random() - 0.5) * 12, floor: 0 } : null });
    });
  }
  function cam(o = {}) {
    const mid = A.clone().lerp(B, o.f ?? 0.55), side = new V3(-d.z, 0, d.x).multiplyScalar(o.side ?? 1);
    const pos = mid.clone().addScaledVector(side, o.dist ?? 2.2).addScaledVector(d, o.back ?? -0.6).add(new V3(0, o.h ?? 0.9, 0));
    const look = mid.clone().lerp(B, o.lf ?? 0.3).add(new V3(0, o.lh ?? 0.22, 0));
    Core.Cam.cine = true; document.body.classList.add('cine');
    return Core.Cam.to(pos, look, 0.05);
  }
  function minus(txt = '', o = {}) {
    let el = document.getElementById('sbMinus');
    if (!el) { el = document.createElement('div'); el.id = 'sbMinus'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;z-index:90;pointer-events:none;font:900 34px "Noto Serif SC",serif;color:#fff2da;background:#a8281c;padding:2px 12px;box-shadow:inset 0 0 0 2px #a8281c,inset 0 0 0 3.5px #fff2da;transform:translate(-50%,-100%)';
    const p = B.clone(); p.y += o.h ?? 0.7;
    const v = p.project(Core.camera), c = Core.renderer.domElement.getBoundingClientRect();
    el.style.left = (c.left + (v.x + 1) / 2 * c.width) + 'px'; el.style.top = (c.top + (1 - v.y) / 2 * c.height) + 'px';
    el.textContent = txt; el.hidden = !txt;
  }
  function clearBolts() { for (const b of bolts) b.parent && b.parent.remove(b); bolts = []; }
  return { setup, shake, atkAt, xbPose, xbShow, bolt, clearBolts, defPose, hitFx, scatter, killDef, cam, minus, get att() { return att; }, get def() { return def; }, get wall() { return wall; } };
})();
