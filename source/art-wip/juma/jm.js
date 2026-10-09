// 拒马分镜台：在真实对局里摆持矛兵（拒马阵）和来犯的敌军，定格出图
window.JM = (() => {
  const V3 = THREE.Vector3, PI = Math.PI;
  // 拒马阵的姿势（关节值，含义见 models.js poseMatrices）：前腿弓、后腿蹬、身子压低侧过来，矛斜指前上方，盾顶在前
  const P = {
    low: { crouch: 0.22, lean: 0.3, twist: -0.35, sway: 0, hx: -0.35, hy: 0.25, lL: -0.74, lR: 0.74, lLz: 0.1, aW: -0.6, aWz: 0.15, wAbs: 1.24, wz: 0, aS: -1.35, aSz: 0.3, sAbs: 0.3 },
    high: { crouch: 0.05, lean: 0.12, twist: -0.2, sway: 0, hx: -0.15, hy: 0.15, lL: -0.35, lR: 0.35, lLz: 0.05, aW: -1.35, aWz: 0.2, wAbs: 1.32, wz: 0, aS: -0.9, aSz: -0.25, sAbs: 0.15 },
  };
  P.zhanma = { wz: 0.5, wAbs: 1.4, aW: -0.75 };
  window.__zm = P.zhanma;
  JMP = P;
  const T = Models.Troop.prototype, orig = T.target;
  T.target = function (u, t, dt) {
    const pz = u.pose;
    if (!pz || !pz.startsWith('jm')) return orig.call(this, u, t, dt);
    if (!u._jmLeg) {   // 腿：update 每帧按走路重算 lL/lR，拒马阵要弓步，所以在这里接管（交付时改 models.js 一行）
      u._jmLeg = 1; u._lL = 0; u._lR = 0; u._jL = 0; u._jR = 0;
      const on = () => u.pose && u.pose.startsWith('jm');
      Object.defineProperty(u.J, 'lL', { get: () => on() ? u._jL : u._lL, set: v => { u._lL = v; } });
      Object.defineProperty(u.J, 'lR', { get: () => on() ? u._jR : u._lR, set: v => { u._lR = v; } });
    }
    u.pose = 'brace'; const r = orig.call(this, u, t, dt); u.pose = pz;
    Object.assign(r.J, pz === 'jmHigh' ? P.high : P.low, this.kind === 'zhanma' ? P.zhanma : null, u.jmX || {});
    const h = u.jmHit || 0;   // 挨撞：身子往后一挫、矛杆一沉
    if (h) { r.J.lean -= 0.3 * h; r.J.crouch += 0.05 * h; r.J.wAbs += 0.1 * h; r.J.hx += 0.25 * h; }
    const k = 1 - Math.exp(-dt * 12); u._jL += (r.J.lL - u._jL) * k; u._jR += (r.J.lR - u._jR) * k;
    r.walk = 0; return r;
  };
  let att = null, def = null, A, B, d;
  const kill = sq => { try { sq && sq.dispose && sq.dispose(); } catch (e) {} };
  function clear() { kill(att); kill(def); att = def = null; }
  // lv：守方等级（2、3、4）；form：'line' 一排 / 'stack' 前二后一
  async function setup(o = {}) {
    clear();
    const lv = o.lv || 2, from = o.from || [1, 6], to = o.to || [1, 4];
    A = Board.pos(...from); B = Board.pos(...to); d = B.clone().sub(A).setY(0).normalize();
    for (const [x, y] of [from, to]) { const m = Board.at ? Board.at(x, y) : null; if (m) m.visible = false; }
    const yaw = Squads.yawOf(d);
    att = Squads.make(o.att || 'n', 'b', o.attAt ? A.clone().lerp(B, o.attAt) : A, yaw, 'attack', o.alv || 1, o.alv || 0);
    def = Squads.make('p', 'r', B, yaw + PI, 'defend', lv, lv);
    if (o.form === 'stack' && lv >= 3 && def.offsets) { def.offsets = [[-0.15, 0.1], [0.15, 0.1], [0, -0.16]]; }
    if (o.spread && def.offsets) def.offsets = def.offsets.map(([x, z]) => [x * o.spread, z]);
    att.place && att.place(1); def.place && def.place(1);
    for (const sq of [att, def]) { if (sq.troop) sq.troop.units.forEach(u => u.vis = 1); if (sq.setVis) sq.setVis(1); }
    if (att.riders) att.riders.forEach(h => { h.group.visible = true; });
    return { A, B };
  }
  function pose(p, o = {}) {
    if (!def || !def.troop) return;
    def.troop.units.forEach((u, i) => {
      if (p === 'wall') u.pose = (o.form === 'stack' && i === 2) ? 'jmHigh' : 'jmLow';
      else u.pose = p;
      u.jmHit = o.hit || 0; u.jmX = o.x || null;
    });
  }
  // 攻方：k = 离守方的远近（0 在起点，1 贴上去），rear = 马人立，speed = 跑动
  function attack(o = {}) {
    if (!att) return;
    const k = o.k ?? 0, p = o.gap != null ? B.clone().addScaledVector(d, -o.gap) : A.clone().lerp(B, k);
    if (att.anchor) att.anchor.copy(p);
    if (att.riders) att.riders.forEach((h, i) => { h.speed = o.speed ?? 0; h.rearK = o.rear ? o.rear * (i === 0 ? 1 : 0.6) : 0; });
    if (att.troop) { att.troop.units.forEach(u => { u.pose = o.pose || 'charge'; if (o.act) att.troop.act(u.i, o.act, 0.4); }); }
    if (att.sync) att.sync(); if (att.place) att.place(1);
  }
  function cam(o = {}) {
    const mid = A.clone().lerp(B, o.f ?? 0.55), side = new V3(-d.z, 0, d.x).multiplyScalar(o.side ?? 1);
    const pos = mid.clone().addScaledVector(side, o.dist ?? 2.2).addScaledVector(d, o.back ?? -0.6).add(new V3(0, o.h ?? 0.9, 0));
    const look = mid.clone().lerp(B, o.lf ?? 0.3).add(new V3(0, o.lh ?? 0.22, 0));
    Core.Cam.cine = true; document.body.classList.add('cine');
    return Core.Cam.to(pos, look, 0.05);
  }
  // 头顶飘字 / 掉血：在攻方头顶放一个“−1”
  function minus(txt = '−1', o = {}) {
    let el = document.getElementById('jmMinus');
    if (!el) { el = document.createElement('div'); el.id = 'jmMinus'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;z-index:90;pointer-events:none;font:900 34px "Noto Serif SC",serif;color:#fff2da;background:#a8281c;padding:2px 12px;box-shadow:inset 0 0 0 2px #a8281c,inset 0 0 0 3.5px #fff2da;transform:translate(-50%,-100%)';
    const p = (att.anchor || A).clone(); p.y += o.h ?? 0.75;
    const v = p.project(Core.camera), c = Core.renderer.domElement.getBoundingClientRect();
    el.style.left = (c.left + (v.x + 1) / 2 * c.width) + 'px'; el.style.top = (c.top + (1 - v.y) / 2 * c.height) + 'px';
    el.textContent = txt; el.hidden = !txt;
  }
  function impact(o = {}) {
    const P_ = Fx.P, c = B.clone().addScaledVector(d, -(o.at ?? 0.5)); c.y = Board.TOP + (o.h ?? 0.22);
    if (P_.blood) P_.blood(c, o.n ?? 16, 0.8, d.clone().negate());
    if (P_.wood && o.wood) P_.wood(c, 8, d.clone().negate(), 0.6);
    if (P_.dust) P_.dust(c.clone().setY(Board.TOP + 0.02), 8, d.clone().negate(), 0.3);
  }
  return { impact, setup, pose, attack, cam, minus, clear, get att() { return att; }, get def() { return def; }, P };
})();
