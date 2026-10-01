// ===== 兵种小队：走子动画、两军对抗、阵亡方式、渡河、主帅战败 =====
const Squads = (() => {
  const { scene, onFrame, tween, sleep, ease, Cam, Time } = Core;
  const V3 = THREE.Vector3;
  const TOP = Board.TOP;
  const { P, R, rv } = Fx;
  const SC = 0.2, HS = 0.22, CH = 0.25, CN = 0.26, EL = 0.22, HERO = 0.21;
  const LOW = () => Core.quality === 'low';
  const gore = () => Fx.gore;
  const fwd = yaw => new V3(Math.sin(yaw), 0, Math.cos(yaw));
  const rightOf = yaw => new V3(Math.cos(yaw), 0, -Math.sin(yaw));
  const yawOf = d => Math.atan2(d.x, d.z);
  const at = (anchor, yaw, x, z) => anchor.clone().addScaledVector(rightOf(yaw), x).addScaledVector(fwd(yaw), z);
  const gy = p => Fx.groundY(p);
  const unitKey = (t, s) => ({ p: 'inf', r: 'chariot', n: 'cav', c: 'cannon', a: 'guard', e: s === 'r' ? 'xbow' : 'ele', k: s === 'r' ? 'liu' : 'xiang' }[t]);
  const snd = (t, s) => Sfx.unit(unitKey(t, s));

  // ======================================================================
  //  基类
  // ======================================================================
  class Squad {
    constructor(t, side, anchor, yaw) {
      this.t = t; this.side = side; this.anchor = anchor.clone(); this.yaw = yaw;
      this.group = new THREE.Group(); scene.add(this.group);
      this.updaters = [];
      this.off = onFrame(dt => { for (const u of this.updaters) u(dt); });
      this.dead = false;
    }
    center(h = 0.2) { const c = this.anchor.clone(); c.y = gy(c) + h; return c; }
    dispose() { this.off(); Core.disposeTree(this.group); }
    // 默认：整体缩放出现 / 消失
    appear() {
      P.ink(this.center(0.05), 8, 0.4, 0.3, 0.7);
      this.group.scale.setScalar(0.001);
      return tween(0.4, k => this.group.scale.setScalar(Math.max(0.001, k)), ease.outBack);
    }
    dissolve() {
      P.ink(this.center(0.1), 10, 0.45, 0.35, 0.8);
      return tween(0.4, k => this.group.scale.setScalar(Math.max(0.001, 1 - k)), ease.in).then(() => this.dispose());
    }
  }

  // ---------- 士兵队（实例化） ----------
  class TroopSquad extends Squad {
    constructor(t, side, anchor, yaw, kind, offsets, scale = SC) {
      super(t, side, anchor, yaw);
      this.troop = new Models.Troop(side, kind, offsets.length, scale);
      this.group.add(this.troop.group);
      this.offsets = offsets;
      this.jit = offsets.map(() => ({ lag: R(0, 0.08), wob: R(0, 6) }));
      this.follow = true;
      for (const u of this.troop.units) { u.vis = 0; u.yaw = yaw; }
      this.place(1);
      this.updaters.push(dt => { if (this.follow) this.place(1 - Math.exp(-dt * 10)); this.troop.update(dt); });
    }
    slot(i) { const [x, z] = this.offsets[i]; return at(this.anchor, this.yaw, x, z); }
    place(k) {
      this.troop.units.forEach((u, i) => {
        if (u.dead || u.fly || u.free) return;
        const s = this.slot(i);
        u.p.x += (s.x - u.p.x) * k; u.p.z += (s.z - u.p.z) * k; u.p.y = gy(u.p);
        u.yaw += (this.yaw - u.yaw) * Math.min(1, k * 2);
      });
    }
    get units() { return this.troop.units; }
    alive() { return this.troop.units.filter(u => !u.dead); }
    appear() {
      this.place(1);
      for (const u of this.troop.units) P.ink(u.p.clone().setY(u.p.y + 0.03), 1, 0.25, 0.22, 0.6);
      return tween(0.3 + 0.02 * this.troop.count, (k, raw) => {
        const t = raw * (0.3 + 0.02 * this.troop.count);
        this.troop.units.forEach((u, i) => { u.vis = Math.min(1, Math.max(0, (t - i * 0.02) / 0.3)); });
      }, ease.linear);
    }
    dissolve(delay = 0) {
      return sleep(delay).then(() => {
        for (const u of this.troop.units) P.ink(u.p.clone().setY(u.p.y + 0.05), 2, 0.25, 0.22, 0.6);
        return tween(0.45, k => { for (const u of this.troop.units) u.vis = 1 - k; }, ease.in);
      }).then(() => this.dispose());
    }
    setPose(p) { this.troop.setPose(p); }
    // 阵亡
    die(hit, dir, power = 1, center) {
      const c = center || this.center(0);
      const units = this.alive();
      const ps = [];
      units.forEach((u, idx) => {
        const i = u.i;
        const delay = hit === 'blast' ? R(0, 0.08) : hit === 'bolts' ? R(0, 0.5) : R(0, 0.25) + idx * 0.02;
        ps.push(sleep(delay).then(() => killUnit(this.troop, i, hit, dir, power, c)));
      });
      return Promise.all(ps);
    }
  }
  // 单个士兵阵亡（含断肢、血、抛飞）
  function killUnit(troop, i, hit, dir, power, c) {
    const u = troop.units[i];
    if (u.dead) return;
    const pos = troop.worldPos(i, 1.1);
    const away = u.p.clone().sub(c).setY(0); if (away.lengthSq() < 1e-4) away.copy(dir); away.normalize();
    const dirAng = Math.atan2(dir.x, dir.z), awayAng = Math.atan2(away.x, away.z);
    const G = gore();
    const bleed = (n, r = 0.6, d = dir) => P.blood(pos, n, r, d);
    switch (hit) {
      case 'blast': {
        const v = away.clone().multiplyScalar(R(1.2, 2.6) * power).add(new V3(0, R(2.2, 3.8) * power, 0));
        troop.kill(i, { dir: awayAng, speed: 3, fly: { v, g: 8, w: R(-8, 8), floor: 0 } });
        troop.tint(i, 0x3a3230, 0.75);
        if (G >= 3) { dismember(troop, i, Math.random() < 0.5 ? 'head' : 'armW', away, true); if (Math.random() < 0.4) dismember(troop, i, 'legL', away, true); }
        if (G >= 1) bleed(8, 0.7, away);
        break;
      }
      case 'ram': case 'trample': {
        const v = dir.clone().multiplyScalar(R(1.5, 3) * power).add(away.clone().multiplyScalar(0.8)).add(new V3(0, R(0.8, 2) * power, 0));
        troop.kill(i, { dir: dirAng + R(-0.5, 0.5), speed: 3.5, fly: { v, g: 9, w: R(-6, 6), floor: 0 } });
        bleed(12, 0.8);
        if (G >= 3 && Math.random() < 0.35) dismember(troop, i, Math.random() < 0.5 ? 'armS' : 'legR', dir);
        break;
      }
      case 'bolts': {
        troop.act(i, 'hit', 0.3);
        setTimeout(() => {}, 0);
        sleep(R(0.15, 0.4)).then(() => { troop.kill(i, { dir: dirAng + R(-0.6, 0.6), speed: 2 }); bleed(6, 0.5); stickBolts(troop, i, dir); });
        bleed(5, 0.5);
        break;
      }
      default: { // stab / cut / slash / hero
        const heavy = hit === 'hero' || hit === 'slash';
        troop.act(i, 'hit', 0.25);
        const knock = heavy ? dir.clone().multiplyScalar(R(0.6, 1.4) * power).add(new V3(0, R(0.4, 1), 0)) : null;
        sleep(R(0.05, 0.2)).then(() => troop.kill(i, { dir: dirAng + R(-0.9, 0.9), speed: R(1.8, 3), fly: knock ? { v: knock, g: 9, w: 0, floor: 0 } : null }));
        bleed(heavy ? 16 : 11, heavy ? 0.9 : 0.7, dir.clone().add(away).normalize());
        if (G >= 3) {
          const r = Math.random();
          if ((hit === 'slash' || hit === 'hero' || hit === 'cut') && r < 0.45) dismember(troop, i, 'head', dir.clone().add(new V3(0, 0.5, 0)));
          else if (r < 0.7) dismember(troop, i, Math.random() < 0.5 ? 'armW' : 'armS', dir);
        }
        break;
      }
    }
    // 倒地后的血泊
    sleep(0.6).then(() => { const lp = u.p.clone(); lp.y = Fx.groundAt(lp); Fx.Marks.blood(lp, R(0.45, 0.75), dir); });
    if (G >= 1) Sfx.hurt(hit);
  }
  function dismember(troop, i, part, dir, burnt) {
    const o = troop.detach(i, part);
    if (!o) return;
    scene.add(o);
    const v = dir.clone().multiplyScalar(R(0.8, 1.8)).add(new V3(R(-0.6, 0.6), R(1.6, 3), R(-0.6, 0.6)));
    Fx.throwObj(o, v, { w: rv(14, 14, 14), life: 3.5, bleed: burnt ? 0 : 0.8, onLand: p => { if (!burnt) Fx.Marks.blood(p, 0.25); } });
    P.blood(troop.worldPos(i, part === 'head' ? 1.55 : 1.1), 14, 0.8, dir, 1.6);
  }
  // 弩箭钉在尸体上
  const boltGeo = (() => { const g = Core.merge([Models.P(Models.G.cyl(0.006, 0.006, 0.32, 4), 0x6a4a2a, 0, 0, 0), Models.P(Models.G.box(0.03, 0.05, 0.003), 0xe8e0d0, 0, -0.13, 0), Models.P(Models.G.box(0.003, 0.05, 0.03), 0xe8e0d0, 0, -0.13, 0)]); g.userData.keep = true; return g; })();
  function stickBolts(troop, i, dir) {
    const u = troop.units[i];
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(boltGeo, Models.vcMat);
      b.position.copy(u.p).add(rv(0.08, 0, 0.08)); b.position.y = Fx.groundAt(u.p) + 0.06;
      b.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().negate().add(new V3(0, 1.2, 0)).normalize());
      scene.add(b);
      Fx.throwObj(b, new V3(), { life: 12, w: new V3(), g: 0, ink: true });
      Fx.bits[Fx.bits.length - 1].rest = true;
    }
  }

  // ======================================================================
  //  各兵种
  // ======================================================================
  // 兵卒：12 人长矛方阵
  class Infantry extends TroopSquad {
    constructor(side, anchor, yaw) {
      const off = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) off.push([(c - 1.5) * 0.24, (1 - r) * 0.25]);
      super('p', side, anchor, yaw, 'spear', off);
    }
    async attack(target, c) {
      const { B, d } = c;
      this.setPose('ready'); snd('p', this.side).charge(1.4);
      await sleep(0.25);
      this.setPose('charge');
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.45);
      const dur = Math.max(0.5, start.distanceTo(end) / 2.2);
      if (target.brace) target.brace();
      let hit = false;
      await tween(dur, k => {
        this.anchor.lerpVectors(start, end, k);
        if (Math.random() < 0.4) { const u = this.units[Math.floor(Math.random() * 12)]; if (Fx.onWater(u.p)) P.splash(u.p.clone().setY(0.05), 1, 0.4); else P.dust(u.p.clone(), 1, d, 0.16); }
      }, ease.in);
      this.units.forEach((u, i) => { if (i < 8) this.troop.act(i, 'thrust', 0.28, Math.random() * 0.1); });
      snd('p', this.side).impact();
      Fx.slowmo(0.35, 0.12);
      Cam.shake(0.12);
      await sleep(0.12);
      const dead = target.die('stab', d, 1, B);
      await sleep(0.3);
      this.units.forEach((u, i) => { if (i < 8) this.troop.act(i, 'thrust', 0.28, 0.1 + Math.random() * 0.15); });
      await dead;
      this.setPose('wave'); Sfx.cheer(0, 0.5);
      await sleep(0.8);
    }
    brace() { this.setPose('brace'); }
  }
  // 刀盾近卫（士）
  class Guards extends TroopSquad {
    constructor(side, anchor, yaw) { super('a', side, anchor, yaw, 'sword', [[0.2, 0], [-0.2, 0]], SC * 1.08); }
    async attack(target, c) {
      const { B, d } = c;
      this.setPose('ready'); snd('a', this.side).charge();
      await sleep(0.25);
      this.setPose('charge');
      if (target.brace) target.brace();
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.32);
      await tween(Math.max(0.4, start.distanceTo(end) / 2.2), k => this.anchor.lerpVectors(start, end, k), ease.in);
      this.troop.act(0, 'slash', 0.35); this.troop.act(1, 'slash', 0.35, 0.08);
      await sleep(0.18);
      snd('a', this.side).impact();
      const hp = B.clone(); hp.y = TOP + 0.3;
      Fx.slash(hp, 1.1, 0.7); sleep(0.08).then(() => Fx.slash(hp, 1.1, -0.7, 0x9e2418));
      P.sparks(hp, 16); Cam.shake(0.12); Fx.slowmo(0.3, 0.14);
      Fx.Marks.cut(B, d);
      await target.die('cut', d, 1, B);
      this.setPose('ready');
      await sleep(0.5);
    }
    brace() { this.setPose('brace'); }
    die(hit, dir, power, center) {
      // 盾牌被劈飞
      for (const u of this.alive()) { const o = this.troop.detach(u.i, 'shield'); if (o) { scene.add(o); Fx.throwObj(o, dir.clone().multiplyScalar(1.5).add(new V3(R(-0.5, 0.5), 2, R(-0.5, 0.5))), { life: 4 }); Sfx.B.plate(0); } }
      return super.die(hit, dir, power, center);
    }
  }
  // 汉军弩手（相）
  class Crossbow extends TroopSquad {
    constructor(side, anchor, yaw) {
      const off = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) off.push([(c - 1) * 0.26, (0.5 - r) * 0.26]);
      super('e', side, anchor, yaw, 'xbow', off);
    }
    async attack(target, c) {
      const { A, B, d, dist } = c;
      this.setPose('aim'); snd('e', 'r').draw();
      if (target.brace) target.brace();
      await sleep(0.45);
      const volley = async (n) => {
        snd('e', 'r').release();
        this.troop.actAll('shoot', 0.25, 0.1);
        const bolts = [];
        for (let i = 0; i < n; i++) {
          const u = this.units[i % this.units.length];
          const p0 = this.troop.worldPos(u.i, 1.25);
          const p1 = target.center(0.12).add(rv(0.35, 0, 0.35));
          const b = new THREE.Mesh(boltGeo, Models.vcMat); b.scale.setScalar(0.8); scene.add(b); bolts.push({ b, p0, p1, d0: R(0, 0.1) });
        }
        const T = 0.28 + dist * 0.035;
        await tween(T + 0.1, (k, raw) => {
          for (const x of bolts) {
            const q = Math.min(1, Math.max(0, (raw * (T + 0.1) - x.d0) / T));
            x.b.position.lerpVectors(x.p0, x.p1, q); x.b.position.y += Math.sin(q * Math.PI) * 0.15 * dist * 0.2;
            const dd = x.p1.clone().sub(x.p0); dd.y += Math.cos(q * Math.PI) * 0.15; x.b.quaternion.setFromUnitVectors(new V3(0, 1, 0), dd.normalize());
          }
        }, ease.linear);
        for (const x of bolts) { if (Math.random() < 0.5) Fx.Marks.hole(x.p1); Fx.throwObj(x.b, new V3(), { life: 10, g: 0, w: new V3() }); Fx.bits[Fx.bits.length - 1].rest = true; }
        snd('e', 'r').impact();
      };
      await volley(12);
      const dead = target.die('bolts', d, 1, B);
      await sleep(0.25);
      this.setPose('aim');
      await volley(8);
      await dead;
      this.setPose('idle');
      await sleep(0.4);
    }
    brace() { this.setPose('cower'); }
  }
  // 楚军战象（象）
  class Elephant extends Squad {
    constructor(side, anchor, yaw) {
      super('e', side, anchor, yaw);
      this.m = Models.makeElephant(side); this.m.group.scale.setScalar(EL);
      this.group.add(this.m.group);
      this.updaters.push(dt => { this.m.update(dt); this.sync(); if (this.m.fire > 0.1 && !LOW()) P.flame(this.m.torch.getWorldPosition(new V3()), 0.12); });
      this.sync();
    }
    sync() { const g = this.m.group; g.position.copy(this.anchor).addScaledVector(fwd(this.yaw), -0.05); g.position.y = gy(this.anchor); g.rotation.y = this.yaw - Math.PI / 2; }
    center(h = 0.3) { return super.center(h); }
    async march(path, dur) {
      this.m.speed = 0.7; let last = 0;
      await walkPath(this, path, dur, k => { if (k - last > 0.18) { last = k; Cam.shake(0.03); Fx.Marks.foot(this.anchor.clone().addScaledVector(rightOf(this.yaw), R(-0.1, 0.1))); } });
      this.m.speed = 0;
    }
    async attack(target, c) {
      const { B, d } = c;
      const s = snd('e', 'b');
      tween(0.4, k => { this.m.trumpetK = k; }); s.trumpet(); this.m.fire = 1;
      if (target.brace) target.brace();
      await sleep(0.5);
      tween(0.3, k => { this.m.trumpetK = 1 - k; });
      this.m.speed = 1.2; s.charge(1.2);
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.25);
      await tween(Math.max(0.5, start.distanceTo(end) / 1.8), k => { this.anchor.lerpVectors(start, end, k); if (Math.random() < 0.5) P.dust(this.center(0), 1, d, 0.3); }, ease.in);
      this.m.speed = 0;
      await tween(0.3, k => { this.m.rearK = k; this.m.trumpetK = k; });
      await sleep(0.1);
      await tween(0.14, k => { this.m.rearK = 1 - k; }, ease.in);
      s.stomp(); Cam.shake(0.35); Fx.slowmo(0.3, 0.14);
      Fx.ring(B, 2.4, 0.7, 0x5a4a38); P.dust(B, 14, null, 0.35); Fx.Marks.crack(B, 1.4);
      await target.die('trample', d, 1.3, B);
      this.m.trumpetK = 0; this.m.fire = 0.4;
      await sleep(0.4);
    }
    brace() { tween(0.3, k => { this.m.trumpetK = k; }); }
    async die(hit, dir, power) {
      const s = snd('e', 'b');
      s.dieCry();
      tween(0.3, k => { this.m.trumpetK = k; });
      await sleep(0.2);
      const c = this.center(0.4);
      P.blood(c, 26, 1.2, dir, 1.2);
      if (hit === 'blast') { this.m.group.traverse(o => { if (o.material && o.material.color && !o.material.userData?.shared) { } }); P.fire(c, 20, 0.8); }
      if (hit === 'bolts') for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(boltGeo, Models.vcMat); b.position.copy(c).add(rv(0.25, 0.15, 0.25)); b.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().negate().add(rv(0.3, 0.3, 0.3)).normalize()); this.group.add(b); }
      // 塔与象奴坠落
      const tw = this.m.tower; const wp = tw.getWorldPosition(new V3()), wq = tw.getWorldQuaternion(new THREE.Quaternion()), ws = tw.getWorldScale(new V3());
      tw.parent.remove(tw); tw.position.copy(wp); tw.quaternion.copy(wq); tw.scale.copy(ws); scene.add(tw);
      Fx.throwObj(tw, dir.clone().multiplyScalar(0.8).add(new V3(R(-0.3, 0.3), 1.2, R(-0.3, 0.3))), { w: rv(3, 1, 3), life: 3 });
      Sfx.B.woodbreak(0.5);
      await tween(1.1, k => { this.m.dead = k; this.m.trumpetK = 1 - k; }, ease.in);
      Cam.shake(0.25); P.dust(this.center(0), 14, null, 0.4); Sfx.B.thud(0, 0.9);
      Fx.Marks.blood(this.center(0).addScaledVector(dir, 0.1), 1.3, dir);
    }
  }
  // 战车（车）
  class Chariot extends Squad {
    constructor(side, anchor, yaw) {
      super('r', side, anchor, yaw);
      this.m = Models.makeChariot(side); this.m.group.scale.setScalar(CH);
      this.group.add(this.m.group);
      this.updaters.push(dt => { this.m.update(dt); this.sync(); });
      this.lastRut = anchor.clone();
      this.sync();
    }
    sync() { const g = this.m.group; g.position.copy(this.anchor).addScaledVector(fwd(this.yaw), -0.38); g.position.y = gy(this.anchor); g.rotation.y = this.yaw - Math.PI / 2; }
    trail() {
      const p = this.anchor;
      if (p.distanceTo(this.lastRut) > 0.3) { Fx.Marks.ruts(this.lastRut.clone().lerp(p, 0.5).addScaledVector(fwd(this.yaw), -0.38), fwd(this.yaw), rightOf(this.yaw)); this.lastRut.copy(p); }
      if (Math.random() < 0.6) for (const s of [1, -1]) { const w = p.clone().addScaledVector(fwd(this.yaw), -0.38).addScaledVector(rightOf(this.yaw), s * 0.24); if (Fx.onWater(w)) P.splash(w.setY(0.05), 2, 0.55); else P.dust(w, 1, fwd(this.yaw), 0.2); }
    }
    async march(path, dur) {
      this.m.speed = 1.2;
      snd('r', this.side).move(dur);
      let splashed = false;
      await walkPath(this, path, dur, () => { this.trail(); if (!splashed && Fx.onWater(this.anchor)) { splashed = true; Sfx.B.splash(0, 0.4); } });
      this.m.speed = 0;
    }
    async attack(target, c) {
      const { B, d } = c;
      snd('r', this.side).charge(2.2);
      if (target.brace) target.brace();
      this.m.speed = 0.6;
      await sleep(0.2);
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, 1.1);
      const hitAt = start.distanceTo(B) - 0.55;
      let hit = false, dead = Promise.resolve();
      await tween(0.45 + start.distanceTo(end) * 0.16, k => {
        this.anchor.lerpVectors(start, end, k); this.m.speed = 0.5 + k * 1.7; this.trail();
        if (!hit && start.distanceTo(this.anchor) >= hitAt) {
          hit = true; Cam.shake(0.3); snd('r', this.side).impact(); Fx.slowmo(0.25, 0.14);
          P.dust(B, 12, d.clone().negate(), 0.35); Fx.ring(B, 2.0, 0.6, 0x5a4a38);
          dead = target.die('ram', d, 1.4, B);
        }
      }, ease.in);
      this.m.speed = 0.3;
      await dead;
      await sleep(0.2);
    }
    brace() { this.m.horses.forEach((h, i) => tween(0.3, k => { h.rearK = k * (i % 2 ? 0.6 : 0.9); })); Sfx.B.neigh(0, 0.1); }
    async die(hit, dir, power) {
      const m = this.m, c = this.center(0.25);
      snd('r', this.side).destroy();
      const G = gore();
      // 车轮飞脱
      m.wheels.forEach((w, i) => {
        const wp = w.getWorldPosition(new V3()), wq = w.getWorldQuaternion(new THREE.Quaternion()), ws = w.getWorldScale(new V3());
        w.parent.remove(w); w.position.copy(wp); w.quaternion.copy(wq); w.scale.copy(ws); scene.add(w);
        Fx.throwObj(w, dir.clone().multiplyScalar(R(1.2, 2.2) * power).add(new V3(R(-0.8, 0.8), R(1.5, 2.8), R(-0.8, 0.8))), { w: rv(6, 12, 6), life: 4 });
      });
      // 车夫、甲士被甩出
      m.crew.forEach(cr => {
        const wp = cr.getWorldPosition(new V3()), wq = cr.getWorldQuaternion(new THREE.Quaternion()), ws = cr.getWorldScale(new V3());
        cr.parent.remove(cr); cr.position.copy(wp); cr.quaternion.copy(wq); cr.scale.copy(ws); scene.add(cr);
        Fx.throwObj(cr, dir.clone().multiplyScalar(R(1, 2) * power).add(new V3(R(-0.6, 0.6), R(1.8, 3), R(-0.6, 0.6))), { w: rv(8, 8, 8), life: 3.2, bleed: G >= 2 ? 0.8 : 0, onLand: p => Fx.Marks.blood(p, 0.5, dir) });
        P.blood(wp, 12, 0.7, dir);
      });
      // 战马倒地
      m.horses.forEach((h, i) => { h.deadSide = Math.random() < 0.5 ? 1 : -1; tween(R(0.5, 0.9), k => { h.dead = k; h.rearK *= 0.9; }, ease.in); P.blood(h.group.getWorldPosition(new V3()).setY(TOP + 0.25), 8, 0.6, dir); });
      if (G >= 1) Sfx.B.neigh(0.05, 0.12);
      // 车厢翻倒、散架
      P.wood(c, 14, dir, 1.2 * power);
      Fx.chunks(c, dir, 1.0 * power, 8, { planks: true, scale: 0.8 });
      if (hit === 'blast') { P.fire(c, 24, 0.8); Fx.addSmoke(c.clone().setY(TOP), 0.5); }
      const cab = m.cab;
      await tween(0.6, k => { cab.rotation.z = k * 1.05; cab.rotation.x = k * 0.25; cab.position.y = -k * 0.35; cab.position.x = -k * 0.5; }, ease.in);
      Sfx.B.thud(0, 0.7);
      Fx.Marks.blood(c.clone().setY(TOP), 1.0, dir);
      await sleep(0.4);
    }
  }
  // 骑兵（马）
  class Cavalry extends Squad {
    constructor(side, anchor, yaw) {
      super('n', side, anchor, yaw);
      this.riders = [];
      const offs = [[0, 0.12], [0.3, -0.3], [-0.3, -0.3]];
      offs.forEach(([x, z], i) => {
        const h = Models.makeCavalry(side, true, i === 0 && side === 'b' ? 'ji' : 'dao');
        h.group.scale.setScalar(HS); h.off = [x, z]; h.lastPrint = anchor.clone();
        this.group.add(h.group); this.riders.push(h);
      });
      this.updaters.push(dt => { for (const h of this.riders) { h.update(dt); } this.sync(); });
      this.sync();
    }
    sync() {
      for (const h of this.riders) {
        if (h.free) continue;
        const p = at(this.anchor, this.yaw, h.off[0], h.off[1]).addScaledVector(fwd(this.yaw), -0.1);
        h.group.position.set(p.x, gy(p), p.z); h.group.rotation.y = this.yaw - Math.PI / 2;
        if (h.speed > 0.3 && p.distanceTo(h.lastPrint) > 0.15) { Fx.Marks.hoof(p, fwd(this.yaw)); h.lastPrint.copy(p); if (Fx.onWater(p)) P.splash(p.clone().setY(0.05), 2, 0.45); else if (Math.random() < 0.5) P.dust(p, 1, fwd(this.yaw), 0.18); }
      }
    }
    // 日字路线：先直走一格，拐角处头马人立，再斜冲到位
    async march(path, dur, charge = false) {
      const [a, corner, b] = path;
      const s = snd('n', this.side);
      this.riders.forEach(h => { h.speed = 0.55; });
      s.move(1.2);
      await walkPath(this, [a, corner], 0.45);
      const newYaw = yawOf(b.clone().sub(corner));
      this.riders[0].speed = 0;
      Sfx.B.neigh(0, 0.1);
      await Promise.all([tween(0.35, k => { this.riders[0].rearK = Math.sin(k * Math.PI) * 0.9; }), turnTo(this, newYaw, 0.35)]);
      this.riders.forEach(h => { h.speed = charge ? 1 : 0.85; });
      await walkPath(this, [corner, b], charge ? 0.35 : 0.5);
      this.riders.forEach(h => { h.speed = 0; });
    }
    async attack(target, c) {
      const { B, d, info } = c;
      const s = snd('n', this.side);
      s.charge(1.6);
      this.riders.forEach(h => tween(0.3, k => { h.rider.arm.rotation.z = 0.9 + k * 1.6; }));
      // 揭棋里骑兵可能是按别的位置走法出阵的（直线冲锋）
      const corner = c.mt === 'n' ? knightCorner(info) : this.anchor.clone().lerp(B, 0.3);
      if (target.brace) target.brace();
      await this.march([this.anchor.clone(), corner, corner.clone().lerp(B, 0.45)], 0, true);
      const lead = this.riders[0];
      const start = this.anchor.clone(), dd = B.clone().sub(start).setY(0).normalize(), end = B.clone().addScaledVector(dd, 0.7);
      this.riders.forEach(h => { h.speed = 1; });
      let hit = false, dead = Promise.resolve();
      await tween(0.4, k => {
        this.anchor.lerpVectors(start, end, k);
        if (!hit && k > 0.45) {
          hit = true;
          tween(0.12, k2 => { lead.rider.arm.rotation.z = 2.5 - k2 * 3.3; }, ease.in);
          s.impact(); Fx.slowmo(0.2, 0.18);
          const hp = B.clone(); hp.y = TOP + 0.3;
          Fx.slash(hp, 1.0, -0.5, INK.ink, 0.45); sleep(0.05).then(() => Fx.slash(hp.clone().add(new V3(0, 0.05, 0)), 0.75, -0.35, 0x9e2418, 0.35));
          P.sparks(hp, 12); Cam.shake(0.18);
          Fx.Marks.streak(B.clone().addScaledVector(dd, 0.4), dd, 1.4);
          dead = target.die('slash', dd, 1.2, B);
          this.riders.slice(1).forEach(h => tween(0.15, k2 => { h.rider.arm.rotation.z = 2.5 - k2 * 3; }));
        }
      }, ease.linear);
      this.riders.forEach(h => { h.speed = 0.2; });
      await dead;
      await sleep(0.2);
    }
    brace() { this.riders.forEach((h, i) => tween(0.3, k => { h.rearK = k * 0.7; })); Sfx.B.neigh(0, 0.09); }
    async die(hit, dir, power) {
      const G = gore();
      snd('n', this.side).die();
      await Promise.all(this.riders.map(async (h, i) => {
        await sleep(i * 0.08);
        const r = h.rider.group;
        const wp = r.getWorldPosition(new V3()), wq = r.getWorldQuaternion(new THREE.Quaternion()), ws = r.getWorldScale(new V3());
        r.parent.remove(r); r.position.copy(wp); r.quaternion.copy(wq); r.scale.copy(ws); scene.add(r);
        const v = dir.clone().multiplyScalar(R(0.6, 1.6) * power).add(new V3(R(-0.6, 0.6), R(1.2, 2.4) * (hit === 'blast' ? 1.6 : 1), R(-0.6, 0.6)));
        Fx.throwObj(r, v, { w: rv(6, 6, 6), life: 3.5, bleed: G >= 2 ? 0.8 : 0, onLand: p => Fx.Marks.blood(p, 0.55, dir) });
        P.blood(wp, 14, 0.8, dir);
        if (G >= 3 && (hit === 'slash' || hit === 'hero' || hit === 'cut')) {
          const hd = h.rider.head; const hp = hd.getWorldPosition(new V3()), hq = hd.getWorldQuaternion(new THREE.Quaternion()), hs = hd.getWorldScale(new V3());
          hd.parent.remove(hd); hd.position.copy(hp); hd.quaternion.copy(hq); hd.scale.copy(hs); scene.add(hd);
          Fx.throwObj(hd, dir.clone().add(new V3(0, 2.5, 0)), { w: rv(12, 12, 12), life: 3.5, bleed: 0.8 });
          P.blood(hp, 16, 0.8, dir, 1.8);
        }
        h.deadSide = Math.random() < 0.5 ? 1 : -1; h.speed = 0;
        await tween(R(0.5, 0.8), k => { h.dead = k; h.rearK = Math.sin(k * Math.PI) * 0.5; }, ease.in);
        P.dust(h.group.position, 5, null, 0.25);
        Fx.Marks.blood(h.group.position.clone().setY(TOP), 0.7, dir);
      }));
      Sfx.B.thud(0, 0.7);
    }
  }
  // 炮：行军时一门炮车 + 驮马 + 两名炮手；进攻时三门齐射；被攻击时炮车翻倒、火药爆燃
  class Cannon extends Squad {
    constructor(side, anchor, yaw, mode = 'march') {
      super('c', side, anchor, yaw);
      this.mode = mode;
      if (mode === 'battery') {
        const d = fwd(yaw), s = rightOf(yaw);
        this.guns = [-0.62, 0, 0.62].map(l => {
          const g = Models.makeCannon(side); g.group.scale.setScalar(CN);
          g.group.rotation.y = yaw - Math.PI / 2;
          g.group.position.copy(anchor).addScaledVector(d, -0.75 - Math.abs(l) * 0.35).addScaledVector(s, l);
          g.group.position.y = gy(g.group.position);
          g.base = g.group.position.clone();
          this.group.add(g.group); return g;
        });
      } else {
        this.gun = Models.makeCannon(side, { crew: false, torch: mode !== 'march' }); this.gun.group.scale.setScalar(CN);
        this.group.add(this.gun.group);
        if (mode === 'march') { this.horse = Models.makeHorse({ color: 0x6b5a48 }); this.horse.group.scale.setScalar(0.2); this.group.add(this.horse.group); }
        this.crew = new Models.Troop(side, 'crew', 2, SC); this.group.add(this.crew.group);
        this.crew.units.forEach(u => { u.vis = 1; });
        this.crew.setPose(mode === 'march' ? 'push' : 'idle');
        this.updaters.push(dt => { this.sync(); this.crew.update(dt); if (this.horse) this.horse.update(dt); });
        this.sync();
      }
    }
    sync() {
      const d = fwd(this.yaw), s = rightOf(this.yaw);
      const g = this.gun.group; g.position.copy(this.anchor); g.position.y = gy(this.anchor); g.rotation.y = this.yaw - Math.PI / 2;
      if (this.horse) { const hp = this.anchor.clone().addScaledVector(d, 0.55); this.horse.group.position.set(hp.x, gy(hp), hp.z); this.horse.group.rotation.y = this.yaw - Math.PI / 2; }
      this.crew.units.forEach((u, i) => {
        if (u.dead || u.fly) return;
        const p = this.mode === 'march' ? this.anchor.clone().addScaledVector(d, -0.42).addScaledVector(s, (i ? -1 : 1) * 0.14) : this.anchor.clone().addScaledVector(d, -0.2).addScaledVector(s, (i ? -1 : 1) * 0.32);
        u.p.set(p.x, gy(p), p.z); u.yaw = this.yaw;
      });
    }
    async march(path, dur) {
      if (this.horse) this.horse.speed = 0.3;
      snd('c', this.side).move(dur);
      await walkPath(this, path, dur, k => { for (const w of this.gun.wheels) w.rotation.z -= 0.25; if (Math.random() < 0.3) P.dust(this.center(0), 1, fwd(this.yaw), 0.15); });
      if (this.horse) this.horse.speed = 0;
      Sfx.B.creak(0, 0.06);
    }
    brace() { this.crew.setPose('cower'); }
    async attack(target, c) {
      const { A, B, d, side, dist } = c;
      const s = snd('c', this.side);
      s.ready();
      await Promise.all(this.guns.map((g, i) => { g.group.scale.setScalar(0.001); P.ink(g.group.position.clone().setY(TOP + 0.05), 6, 0.35, 0.3, 0.7); return sleep(i * 0.1).then(() => tween(0.4, k => g.group.scale.setScalar(Math.max(0.001, CN * k)), ease.outBack)); }));
      const elev = 0.35 + Math.min(0.3, dist * 0.04);
      await tween(0.35, k => this.guns.forEach(g => { g.barrel.rotation.z = 0.2 + (elev - 0.2) * k; }));
      if (target.brace) target.brace();
      const flight = 0.95 + dist * 0.05, peak = 1.2 + dist * 0.28;
      const tc = target.center(0.05);
      const targets = [tc.clone().addScaledVector(side, 0.45).addScaledVector(d, -0.3), tc.clone().addScaledVector(side, -0.4).addScaledVector(d, 0.3), tc.clone()];
      let dead = Promise.resolve();
      const fire = async (g, i) => {
        for (let k = 0; k < 6; k++) P.sparks(g.torch.getWorldPosition(new V3()), 2, 0.4);
        s.fire(i);
        await sleep(0.12);
        const muzzle = g.barrel.localToWorld(new V3(1.35, 0, 0));
        Cam.shake(0.14); Fx.flash(muzzle, 40, 0.35); P.fire(muzzle, 16, 0.5);
        for (let k = 0; k < 8; k++) Fx.spawn({ pos: muzzle.clone(), vel: d.clone().multiplyScalar(R(1.5, 4)).add(rv(0.4, 0.4, 0.4)), color: 0x6e6a64, size: 0.2, size2: R(0.8, 1.4), life: R(1.2, 2), op: 0.55, drag: 2.2 });
        tween(0.3, k => g.group.position.copy(g.base).addScaledVector(d, -0.18 * Math.sin(k * Math.PI)));
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), Core.toon(0x1c1a18));
        ball.position.copy(muzzle); scene.add(ball);
        const tp = targets[i].clone(); tp.y = Fx.groundAt(tp) + 0.05;
        const p0 = muzzle.clone();
        await tween(flight, k => {
          ball.position.lerpVectors(p0, tp, k); ball.position.y = p0.y + (tp.y - p0.y) * k + peak * 4 * k * (1 - k);
          Fx.spawn({ pos: ball.position.clone(), tex: Core.Tex.spark, add: true, color: 0xff8a3a, size: 0.22, size2: 0.05, life: 0.3, op: 0.9 });
          Fx.spawn({ pos: ball.position.clone(), color: 0x3d3a37, size: 0.1, size2: 0.35, life: 0.8, op: 0.35, drag: 1 });
        }, ease.linear);
        scene.remove(ball);
        const big = i === 2;
        s.explode(big);
        Cam.shake(big ? 0.42 : 0.2); Fx.flash(tp, big ? 120 : 60, big ? 0.9 : 0.5, big ? 0.55 : 0);
        P.fire(tp.clone().add(new V3(0, 0.1, 0)), big ? 44 : 22, big ? 1.1 : 0.7); P.smoke(tp, big ? 16 : 8, big ? 1 : 0.7); P.sparks(tp, big ? 30 : 12, 1.2);
        Fx.ring(tp, big ? 3.6 : 1.8, 0.8); Fx.Marks.scorch(tp, big ? 2.2 : 1.2); Fx.addSmoke(tp, big ? 1 : 0.5);
        for (let k = 0; k < (big ? 10 : 4); k++) { const o = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), Core.toon(0x5d554a)); o.position.copy(tp).add(new V3(0, 0.1, 0)); scene.add(o); Fx.throwObj(o, new V3(R(-2, 2), R(2, 5), R(-2, 2)), { life: R(0.8, 1.4) }); }
        if (big) { Fx.slowmo(0.3, 0.15); dead = target.die('blast', d, 1.6, tp); }
      };
      const shots = this.guns.map((g, i) => sleep(i * 0.28).then(() => fire(g, i)));
      await sleep(0.55);
      Fx.shot(tc.clone().addScaledVector(side, 3.4).addScaledVector(d, -2.0).add(new V3(0, 1.7, 0)), tc.clone().add(new V3(0, 0.3, 0)), flight * 0.75);
      await Promise.all(shots);
      await dead;
      await sleep(0.5);
    }
    dissolve() {
      if (this.mode === 'battery') return Promise.all(this.guns.map(g => { P.ink(g.group.position.clone().setY(TOP + 0.1), 6, 0.35, 0.3, 0.7); return tween(0.3, k => g.group.scale.setScalar(Math.max(0.001, CN * (1 - k))), ease.in); })).then(() => this.dispose());
      return super.dissolve();
    }
    async die(hit, dir, power) {
      const c = this.center(0.15), G = gore();
      snd('c', this.side).destroy();
      // 炮手
      this.crew.units.forEach((u, i) => killUnit(this.crew, i, hit === 'blast' ? 'blast' : hit, dir, power, c));
      // 火药桶爆燃
      await sleep(0.15);
      const keg = this.gun.keg.getWorldPosition(new V3());
      P.fire(keg, 30, 0.9); Fx.flash(keg, 70, 0.6, 0.25); P.smoke(keg, 10, 0.8); Sfx.B.boom(0, 0.7); Cam.shake(0.25);
      Fx.Marks.scorch(keg.clone().setY(TOP), 1.2); Fx.addSmoke(keg.clone().setY(TOP), 0.6);
      this.gun.keg.visible = false;
      // 炮管滚落，炮车翻倒
      const b = this.gun.barrel; const bp = b.getWorldPosition(new V3()), bq = b.getWorldQuaternion(new THREE.Quaternion()), bs = b.getWorldScale(new V3());
      b.parent.remove(b); b.position.copy(bp); b.quaternion.copy(bq); b.scale.copy(bs); scene.add(b);
      Fx.throwObj(b, dir.clone().multiplyScalar(1.2).add(new V3(R(-0.5, 0.5), 2.2, R(-0.5, 0.5))), { w: rv(4, 2, 4), life: 5 });
      const gg = this.gun.group;
      await tween(0.5, k => { gg.rotation.x = k * 1.4; gg.position.y = gy(this.anchor) + Math.sin(k * Math.PI) * 0.15; }, ease.in);
      Fx.chunks(c, dir, 0.8, 6, { planks: true, scale: 0.6, burnt: true });
      Sfx.B.thud(0, 0.6);
    }
    dispose() { if (this.crew) this.crew.dispose(); super.dispose(); }
  }
  // 主帅（帅/将）
  class General extends Squad {
    constructor(side, anchor, yaw, opts = {}) {
      super('k', side, anchor, yaw);
      this.isX = side === 'b';
      this.hero = this.isX ? Models.makeXiangYu() : Models.makeLiuBang();
      this.hero.group.scale.setScalar(HERO);
      this.mounted = this.isX && opts.mounted !== false;
      if (this.mounted) {
        this.horse = Models.makeWuzhui(); this.horse.group.scale.setScalar(HS); this.group.add(this.horse.group);
        this.hero.setPose(Models.POSES.xRide);
        this.hero.group.scale.setScalar(HERO / HS);
        this.hero.group.position.set(-0.05, 1.3, 0); this.hero.group.rotation.y = Math.PI / 2;
        this.horse.bodyPivot.add(this.hero.group);
      } else this.group.add(this.hero.group);
      this.guard = opts.guard === false ? null : new TroopSquad('k', side, anchor, yaw, 'halberd', this.isX ? [[0.34, -0.35], [-0.34, -0.35]] : [[0.3, -0.15], [-0.3, -0.15], [0.12, -0.42]], SC);
      if (this.guard && !this.isX) { this.flag = Models.makeBanner('r', '漢'); this.flag.group.scale.setScalar(0.11); scene.add(this.flag.group); }
      this.walkT = 0; this.walking = 0;
      this.updaters.push(dt => {
        this.hero.update(dt);
        if (this.horse) this.horse.update(dt);
        if (this.walking && !this.mounted) {
          this.walkT += dt * 6 * this.walking;
          const s = Math.sin(this.walkT);
          const J = this.hero.J; J.lLx = s * 0.45; J.lRx = -s * 0.45; J.kL = Math.max(0, -s) * 0.6; J.kR = Math.max(0, s) * 0.6; this.hero.setPose({ ...J });
        }
        if (this.flag && this.guard) { const u = this.guard.units[2]; if (u) { this.flag.group.position.copy(u.p).addScaledVector(rightOf(this.yaw), 0.07); this.flag.group.rotation.y = this.yaw - Math.PI / 2 + 0.6; this.flag.group.scale.setScalar(0.11 * u.vis); } this.flag.update(dt); }
        this.sync();
      });
      this.sync();
    }
    sync() {
      const g = this.mounted ? this.horse.group : this.hero.group;
      g.position.set(this.anchor.x, gy(this.anchor), this.anchor.z);
      g.rotation.y = this.mounted ? this.yaw - Math.PI / 2 : this.yaw;
      if (this.guard) { this.guard.anchor.copy(this.anchor); this.guard.yaw = this.yaw; }
    }
    appear() { return Promise.all([super.appear(), this.guard ? this.guard.appear() : null]); }
    dissolve() { if (this.flag) scene.remove(this.flag.group); return Promise.all([super.dissolve(), this.guard ? this.guard.dissolve() : null]); }
    async march(path, dur) {
      const s = snd('k', this.side);
      s.move(dur);
      if (this.guard) this.guard.setPose('march');
      if (this.mounted) this.horse.speed = 0.4; else this.walking = 1;
      await walkPath(this, path, dur);
      this.walking = 0; if (this.horse) this.horse.speed = 0;
      if (this.guard) this.guard.setPose('idle');
      if (!this.mounted) this.hero.pose(Models.POSES.lStand, 0.3);
    }
    async attack(target, c) {
      const { B, d } = c;
      const s = snd('k', this.side);
      s.charge();
      if (target.brace) target.brace();
      const H = this.hero, P_ = Models.POSES;
      if (this.isX) {
        // 项羽：纵马冲杀，大刀横扫
        this.horse.speed = 1;
        const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.32);
        await Promise.all([tween(Math.max(0.45, start.distanceTo(end) / 2.2), k => this.anchor.lerpVectors(start, end, k), ease.in), H.pose({ ...P_.xRide, ...pick(P_.xWind, ['sRx', 'sRy', 'sRz', 'eR', 'wx', 'wz', 'ty', 'tx', 'sLx', 'sLz', 'eL']) }, 0.4)]);
        this.horse.speed = 0; tween(0.25, k => { this.horse.rearK = Math.sin(k * Math.PI) * 0.6; });
        await H.pose({ ...P_.xRide, ...pick(P_.xSweep, ['sRx', 'sRy', 'sRz', 'eR', 'wx', 'wz', 'ty', 'tx', 'sLx', 'sLz', 'eL']) }, 0.14, ease.in);
      } else {
        // 刘邦：拔剑疾进，连斩两剑
        await H.pose(P_.lDraw, 0.25);
        s.draw(); H.weapon.visible = true; if (H.sheathed) H.sheathed.visible = false;
        await H.pose(P_.lGuard, 0.2);
        this.walking = 1.6;
        const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.3);
        await tween(Math.max(0.35, start.distanceTo(end) / 2.0), k => this.anchor.lerpVectors(start, end, k), ease.in);
        this.walking = 0;
        await H.pose(P_.lRaise, 0.16);
        await H.pose(P_.lSlash1, 0.1, ease.in);
      }
      s.impact(); Cam.shake(0.3); Fx.slowmo(0.2, 0.18);
      const hp = B.clone(); hp.y = TOP + 0.35;
      Fx.slash(hp, 1.7, this.isX ? 0 : -0.5, INK.ink, 0.6); sleep(0.06).then(() => Fx.slash(hp.clone().add(new V3(0, 0.08, 0)), 1.3, this.isX ? 0.1 : -0.4, 0x9e2418, 0.45));
      Fx.ring(B, 3.2, 0.8); P.dust(B, 14, null, 0.35); Fx.flash(hp, 40, 0.5, 0.3);
      if (this.isX) Fx.Marks.crack(B, 2.6);
      const dead = target.die('hero', d, 1.4, B);
      if (!this.isX) { await sleep(0.12); await H.pose(P_.lSlash2, 0.12, ease.in); P.blood(hp, 12, 0.8, d); }
      await dead;
      await H.pose(this.isX ? P_.xRide : P_.lGuard, 0.35);
      await sleep(0.3);
    }
  }
  // 未知暗子（疑兵）：墨影刀盾兵，看不出是什么兵种
  class Shade extends TroopSquad {
    constructor(side, anchor, yaw) {
      const off = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) off.push([(c - 1) * 0.25, (0.5 - r) * 0.26]);
      super('?', side, anchor, yaw, 'sword', off);
      this.troop.units.forEach((u, i) => this.troop.tint(i, 0x2b2725, 0.8));
      this.updaters.push(dt => { if (!LOW() && Math.random() < dt * 5) P.ink(this.center(0.12).add(rv(0.35, 0.05, 0.35)), 1, 0.32, 0.25, 0.45); });
    }
    brace() { this.setPose('brace'); }
  }
  const pick = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; };

  // ---------- 运动工具 ----------
  function walkPath(sq, path, dur, onStep) {
    const segs = []; let tot = 0;
    for (let i = 1; i < path.length; i++) { const L = path[i - 1].distanceTo(path[i]); segs.push([path[i - 1], path[i], L]); tot += L; }
    if (!dur) dur = tot / 1.2;
    if (tot < 1e-4) return Promise.resolve();
    let lastSeg = -1;
    return tween(dur, k => {
      let dist = k * tot, i = 0;
      while (i < segs.length - 1 && dist > segs[i][2]) { dist -= segs[i][2]; i++; }
      const [a, b, L] = segs[i];
      sq.anchor.lerpVectors(a, b, L > 0 ? Math.min(1, dist / L) : 1);
      if (i !== lastSeg) { lastSeg = i; const dd = b.clone().sub(a); if (dd.lengthSq() > 1e-6) turnTo(sq, yawOf(dd), 0.2); }
      if (onStep) onStep(k);
    }, ease.inOut);
  }
  function turnTo(sq, yaw, dur) {
    let y0 = sq.yaw, dy = yaw - y0;
    while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    return tween(dur, k => { sq.yaw = y0 + dy * k; }, ease.inOut);
  }

  // ---------- 工厂 ----------
  function make(t, side, anchor, yaw, role = 'move') {
    switch (t) {
      case 'p': return new Infantry(side, anchor, yaw);
      case 'a': return new Guards(side, anchor, yaw);
      case 'e': return side === 'r' ? new Crossbow(side, anchor, yaw) : new Elephant(side, anchor, yaw);
      case 'r': return new Chariot(side, anchor, yaw);
      case 'n': return new Cavalry(side, anchor, yaw);
      case 'c': return new Cannon(side, anchor, yaw, role === 'attack' ? 'battery' : role === 'defend' ? 'defend' : 'march');
      case 'k': return new General(side, anchor, yaw, role === 'defeat' ? { mounted: false, guard: false } : {});
      default: return new Shade(side, anchor, yaw);
    }
  }
  // 行军速度（格/秒）
  const SPEED = { p: 0.85, a: 0.9, e: 0.8, r: 2.4, n: 1.9, c: 0.75, k: 0.9 };

  // ======================================================================
  //  走子（非吃子）
  // ======================================================================
  async function move(c) {
    const { A, B, d, side, m, info } = c;
    const t = info.piece.t, s = info.piece.s;
    const cine = Fx.level === 'cine';
    const yaw = yawOf(d);
    const mid = A.clone().lerp(B, 0.5);
    if (cine) {
      Fx.cineOn();
      const hd = Cam.homeDir();
      Fx.shot(mid.clone().addScaledVector(hd, 3.2).addScaledVector(c.side, 1.6).add(new V3(0, 2.1, 0)), mid.clone().add(new V3(0, 0.25, 0)), 0.6);
    }
    Fx.sink(m);
    if (info.crossesRiver && (t === 'p' || t === 'c')) { await boatSquad(c); return; }
    const L = c.mt === 'n'; // 日字路线（揭棋中按位置走法，可能与兵种不同）
    const sq = make(t, s, A, L ? yawOf(knightCorner(info).clone().sub(A)) : yaw, 'move');
    await sq.appear();
    let stopCam = () => { };
    if (cine && A.distanceTo(B) > 1.8) stopCam = Fx.follow(() => sq.center(0.2), () => c.side.clone().multiplyScalar(2.6).addScaledVector(d, -1.4).add(new V3(0, 1.3, 0)), () => d.clone().multiplyScalar(0.8).add(new V3(0, 0.05, 0)), 4);
    const dist = L ? 2.2 : A.distanceTo(B);
    const dur = Math.max(0.6, dist / SPEED[t]);
    if (sq.march && t === 'n') await sq.march(L ? [A, knightCorner(info), B] : [A, A.clone().lerp(B, 0.35), B]);
    else if (sq.march) await sq.march(L ? [A, knightCorner(info), B] : [A, B], dur);
    else {
      sq.setPose('march'); snd(t, s).move(dur);
      await walkPath(sq, L ? [A, knightCorner(info), B] : [A, B], dur, k => { if (sq.units && Math.random() < 0.2) Fx.Marks.foot(sq.units[Math.floor(Math.random() * sq.units.length)].p); });
      sq.setPose('idle');
    }
    stopCam();
    await sleep(0.1);
    await sq.dissolve();
    await Fx.rise(m, B, 0.35);
  }
  const knightCorner = info => { const [ff, fr] = info.from, [tf, tr] = info.to; return Math.abs(tr - fr) === 2 ? Board.pos(ff, fr + Math.sign(tr - fr)) : Board.pos(ff + Math.sign(tf - ff), fr); };

  // ---------- 渡河：兵卒三条帆船，炮一条大船 ----------
  async function boatSquad(c) {
    const { A, B, d, info } = c;
    const t = info.piece.t, s = info.piece.s;
    const sA = Math.sign(A.z);
    const xc = A.x + (B.x - A.x) * (A.z / (A.z - B.z));
    const H = Board.HALF;
    const bankA = new V3(xc, 0, sA * (H + 0.32)), bankB = new V3(xc, 0, -sA * (H + 0.32));
    const yaw = yawOf(new V3(0, 0, -sA));
    const sq = make(t, s, A, yawOf(bankA.clone().sub(A).lengthSq() > 1e-3 ? bankA.clone().sub(A) : new V3(0, 0, -sA)), 'move');
    await sq.appear();
    Sfx.river(3.2);
    // 走到岸边
    if (sq.march) await sq.march([A, bankA], Math.max(0.4, A.distanceTo(bankA) / 0.9));
    else { sq.setPose('march'); snd(t, s).move(1); await walkPath(sq, [A, bankA], Math.max(0.4, A.distanceTo(bankA) / 0.9)); sq.setPose('idle'); }
    await turnTo(sq, yaw, 0.2);
    // 船自上游漂来
    const nb = t === 'p' ? 3 : 1;
    const boats = [];
    for (let i = 0; i < nb; i++) {
      const b = Models.makeBoat({ side: s, sail: true }); const sc = t === 'p' ? 0.36 : 0.5;
      b.group.scale.setScalar(sc); b.sc = sc;
      b.x0 = xc + (i - (nb - 1) / 2) * 0.62; b.group.position.set(b.x0 - 1.4, 0.03, sA * 0.08);
      scene.add(b.group); boats.push(b);
    }
    let bt = 0;
    const bUp = onFrame(dt => { bt += dt; boats.forEach((b, i) => { b.update(dt); b.group.position.y = 0.03 + Math.sin(bt * 3 + i) * 0.012; b.group.rotation.z = Math.sin(bt * 2.3 + i) * 0.035; b.man.poleArm.rotation.z = 0.5 + Math.sin(bt * 3.2 + i) * 0.25; }); });
    await tween(0.7, k => boats.forEach(b => { b.group.position.x = b.x0 - 1.4 * (1 - k); }), ease.out);
    Sfx.B.splash(0, 0.2);
    // 登船
    const slots = [];
    if (sq.troop) {
      sq.follow = false;
      sq.units.forEach((u, i) => { const b = boats[Math.floor(i / 4) % nb]; slots.push({ u, b, lx: -0.35 + (i % 4) * 0.28, lz: 0 }); });
      const from = sq.units.map(u => u.p.clone());
      sq.setPose('march');
      await tween(0.5, k => slots.forEach((sl, i) => { const to = sl.b.group.localToWorld(new V3(sl.lx, 0.3, sl.lz)); sl.u.p.lerpVectors(from[i], to, k); sl.u.p.y = from[i].y + (to.y - from[i].y) * k + Math.sin(k * Math.PI) * 0.1; }));
      sq.setPose('idle');
    } else {
      // 炮车整体上船
      const from = sq.anchor.clone();
      await tween(0.5, k => { const to = boats[0].group.localToWorld(new V3(0.1, 0.3, 0)); sq.anchor.lerpVectors(from, to, k); });
    }
    // 顺流斜渡
    const bz0 = boats.map(b => b.group.position.clone());
    const carry = () => {
      if (sq.troop) slots.forEach(sl => { const to = sl.b.group.localToWorld(new V3(sl.lx, 0.3, sl.lz)); sl.u.p.copy(to); });
      else { sq.anchor.copy(boats[0].group.localToWorld(new V3(0.1, 0.3, 0))); }
    };
    const cUp = onFrame(carry);
    const gyBak = Fx.groundY;
    await tween(1.1, k => boats.forEach((b, i) => { b.group.position.x = bz0[i].x + 0.35 * k; b.group.position.z = bz0[i].z - sA * 0.16 * k; b.group.rotation.y = -sA * 0.12 * Math.sin(k * Math.PI); }), ease.inOut);
    cUp();
    // 下船登岸
    if (sq.troop) {
      const from = sq.units.map(u => u.p.clone());
      sq.anchor.copy(bankB);
      sq.setPose('march');
      await tween(0.5, k => sq.units.forEach((u, i) => { const to = sq.slot(i); to.y = Fx.groundY(to); u.p.lerpVectors(from[i], to, k); u.p.y += Math.sin(k * Math.PI) * 0.1; }));
      sq.follow = true;
    } else {
      const from = sq.anchor.clone();
      await tween(0.5, k => sq.anchor.lerpVectors(from, bankB, k));
    }
    // 船离去
    boats.forEach(b => tween(0.8, k => { b.group.scale.setScalar(Math.max(0.001, b.sc * (1 - k))); b.group.position.x += 0.01; }).then(() => Core.disposeTree(b.group)));
    sleep(0.85).then(bUp);
    if (sq.march) await sq.march([bankB, B], Math.max(0.3, bankB.distanceTo(B) / 0.9));
    else { await walkPath(sq, [bankB, B], Math.max(0.3, bankB.distanceTo(B) / 0.9)); sq.setPose('idle'); }
    await sq.dissolve();
    await Fx.rise(c.m, B, 0.35);
  }

  // 低特效档：棋子自己坐船
  async function pieceBoat(c) {
    const { A, B, s, m } = c;
    const sA = Math.sign(A.z);
    const xc = A.x + (B.x - A.x) * (A.z / (A.z - B.z));
    const H = Board.HALF;
    const S = new V3(xc - 0.55, 0.03, sA * 0.06), T = new V3(xc + 0.25, 0.03, -sA * 0.06);
    const boat = Models.makeBoat({ side: s, sail: true });
    const bs = 0.5;
    boat.group.position.copy(S).add(new V3(-1.2, 0, 0)); boat.group.scale.setScalar(0.001);
    scene.add(boat.group);
    let t = 0;
    const up = onFrame(dt => { t += dt; boat.update(dt); boat.group.position.y = 0.03 + Math.sin(t * 3) * 0.012; boat.group.rotation.z = Math.sin(t * 2.3) * 0.035; boat.man.poleArm.rotation.z = 0.5 + Math.sin(t * 3.2) * 0.25; });
    Sfx.river(2.4);
    const grow = tween(0.6, k => { boat.group.scale.setScalar(Math.max(0.001, bs * Math.min(1, k * 1.6))); boat.group.position.x = S.x - 1.2 * (1 - k); }, ease.out);
    const E1 = new V3(S.x + 0.1, TOP, sA * (H + 0.2));
    const A0 = m.position.clone();
    await tween(Math.min(0.6, 0.2 + A0.distanceTo(E1) * 0.1), k => { m.position.lerpVectors(A0, E1, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.1; });
    await grow;
    const deck = () => boat.group.localToWorld(new V3(0.2, 0.33, 0));
    const p0 = m.position.clone();
    await tween(0.28, k => { m.position.lerpVectors(p0, deck(), k); m.position.y += Math.sin(k * Math.PI) * 0.22; });
    P.splash(deck().setY(0.05), 5, 0.5); Sfx.B.splash(0, 0.25);
    await tween(1.1, k => { boat.group.position.x = S.x + (T.x - S.x) * k; boat.group.position.z = S.z + (T.z - S.z) * k; boat.group.rotation.y = -sA * 0.18 * Math.sin(k * Math.PI); m.position.copy(deck()); }, ease.inOut);
    const E2 = new V3(T.x, TOP, -sA * (H + 0.2));
    const p1 = m.position.clone();
    await tween(0.28, k => { m.position.lerpVectors(p1, E2, k); m.position.y += Math.sin(k * Math.PI) * 0.22; });
    Sfx.place();
    tween(0.7, k => { boat.group.scale.setScalar(Math.max(0.001, bs * (1 - k))); }).then(() => { up(); Core.disposeTree(boat.group); });
    if (E2.distanceTo(B) > 0.05) await tween(Math.min(0.6, 0.15 + E2.distanceTo(B) * 0.1), k => { m.position.lerpVectors(E2, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.1; });
    m.position.copy(B);
  }

  // ======================================================================
  //  吃子：两军对抗
  // ======================================================================
  async function capture(c) {
    const { A, B, d, side, m, tgt, info } = c;
    // 被吃的暗子：只有吃子方能看到真身，其余人看到的是“疑兵”
    const t = info.piece.t, s = info.piece.s, dt_ = info.dt || info.captured.t, ds = info.captured.s;
    const cine = Fx.level === 'cine';
    const yaw = yawOf(d);
    Fx.cineOn();
    const mid = A.clone().lerp(B, 0.5);
    if (cine) {
      if (t === 'c') Fx.shot(A.clone().addScaledVector(d, -3.0).addScaledVector(side, 1.3).add(new V3(0, 1.4, 0)), A.clone().lerp(B, 0.6).add(new V3(0, 0.25, 0)), 0.7);
      else Fx.shot(mid.clone().addScaledVector(side, 3.0).addScaledVector(d, -1.2).add(new V3(0, 1.6, 0)), mid.clone().lerp(B, 0.3).add(new V3(0, 0.2, 0)), 0.7);
    }
    // 双方化身
    Fx.sink(m); Fx.sink(tgt);
    const att = make(t, s, A, t === 'n' && c.mt === 'n' ? yawOf(knightCorner(info).clone().sub(A)) : yaw, 'attack');
    const def = make(dt_, ds, B, yaw + Math.PI, 'defend');
    await Promise.all([att.appear(), sleep(0.15).then(() => def.appear())]);
    if (def.setPose) def.setPose('ready');
    if (cine && t !== 'c') {
      const ranged = t === 'e' && s === 'r';
      if (ranged) Fx.shot(mid.clone().addScaledVector(side, 2.2 + c.dist * 0.55).addScaledVector(d, -0.5).add(new V3(0, 1.1 + c.dist * 0.12, 0)), mid.clone().add(new V3(0, 0.2, 0)), 0.6);
      else Fx.shot(A.clone().lerp(B, 0.7).addScaledVector(side, 2.3).addScaledVector(d, -0.6).add(new V3(0, 0.95, 0)), A.clone().lerp(B, 0.82).add(new V3(0, 0.25, 0)), 0.6);
    }
    await att.attack(def, c);
    // 收尾：尸体留一会儿再化墨
    const hold = gore() >= 3 ? 1.6 : gore() >= 1 ? 0.9 : 0.4;
    await sleep(0.2);
    att.dissolve();
    await sleep(hold);
    Fx.P.ink(B.clone().setY(TOP + 0.1), 14, 0.5, 0.35, 0.7);
    await def.dissolve();
    // 被吃棋子的刻字面碎裂
    if (tgt) { const cc = B.clone(); cc.y = TOP + 0.1; Fx.chunks(cc, d, 0.5, 6, { small: true, lifeK: 0.7 }); }
    await Fx.rise(m, B, 0.4);
  }

  // ======================================================================
  //  主帅战败（棋盘上）
  // ======================================================================
  async function heroDefeat(side, pos, faceYaw, onCreate) {
    const g = new General(side, pos, faceYaw, { mounted: false, guard: false });
    if (onCreate) onCreate(g);
    const H = g.hero, P_ = Models.POSES;
    g.hero.group.scale.setScalar(HERO * 1.25);
    await g.appear();
    if (side === 'r') {
      H.weapon.visible = true; if (H.sheathed) H.sheathed.visible = false;
      H.setPose(P_.lGuard);
      await sleep(0.6);
      await H.pose(P_.lSlump, 0.8);
      // 剑从手中滑落
      const w = H.weapon; const wp = w.getWorldPosition(new V3()), wq = w.getWorldQuaternion(new THREE.Quaternion()), ws = w.getWorldScale(new V3());
      w.parent.remove(w); w.position.copy(wp); w.quaternion.copy(wq); w.scale.copy(ws); scene.add(w);
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI + 0.25, 0, 0.15));
      const p0 = wp.clone(), p1 = wp.clone().add(new V3(0.05, 0, 0.08)); p1.y = TOP + 0.18;
      Sfx.B.metalfall(0.25);
      await tween(0.45, k => { w.position.lerpVectors(p0, p1, k); w.quaternion.slerpQuaternions(wq, q1, k); }, ease.in);
      Sfx.B.clang(0, 0.3);
      g.dropped = w;
      await sleep(0.3);
      await H.pose(P_.lKneel, 1.8, ease.inOut);
    } else {
      H.setPose(P_.xStand);
      await sleep(0.5);
      H.wind = 1.5;
      await H.pose({ ...P_.xStand, tx: 0.2, nx: 0.3 }, 0.8);
      await H.pose(P_.xKneel, 2.0, ease.inOut);
      Sfx.B.thud(0, 0.5); P.dust(pos, 6, null, 0.25);
    }
    return g;
  }

  return { move, capture, pieceBoat, heroDefeat, make, Shade, Infantry, Guards, Crossbow, Elephant, Chariot, Cavalry, Cannon, General, killUnit, walkPath, turnTo, TroopSquad };
})();
