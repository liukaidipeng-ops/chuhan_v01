// ===== 兵种小队：走子动画、两军对抗、阵亡方式、渡河、主帅战败 =====
const Squads = (() => {
  const { scene, onFrame, tween, sleep, ease, Cam, Time } = Core;
  const V3 = THREE.Vector3;
  const TOP = Board.TOP;
  const { P, R, rv } = Fx;
  const SC = 0.2, HS = 0.22, CH = 0.25, CN = 0.26, EL = 0.22, HERO = 0.21;
  const KFLAG = 0.2;      // 帅旗大小（之前 0.125，太小气）
  let finalMode = false;  // 技能模式「决战」：刘邦持剑、战斗架势
  const LOW = () => Core.quality === 'low';
  const gore = () => Fx.gore;
  const fwd = yaw => new V3(Math.sin(yaw), 0, Math.cos(yaw));
  const rightOf = yaw => new V3(Math.cos(yaw), 0, -Math.sin(yaw));
  const yawOf = d => Math.atan2(d.x, d.z);
  const at = (anchor, yaw, x, z) => anchor.clone().addScaledVector(rightOf(yaw), x).addScaledVector(fwd(yaw), z);
  // 乘船过河的那一会儿，水面这一段把人和车垫到船板的高度（deck = 船板离地多高；平时是 null）
  let deck = null, deckId = 0;
  const gy = p => { const y = Fx.groundY(p); return deck != null && Math.abs(p.x) < 4.8 ? Math.max(y, deck) : y; };
  const unitKey = (t, s) => ({ p: 'inf', r: 'chariot', n: 'cav', c: 'cannon', a: 'guard', e: s === 'r' ? (Models.TIGER ? 'tiger' : 'xbow') : 'ele', k: s === 'r' ? 'liu' : 'xiang' }[t]);
  const snd = (t, s) => Sfx.unit(unitKey(t, s));
  // 声音按真实时间走，演出按“动画速度”走（默认 1.5 倍）：real = 演出里的 d 秒实际是几秒；wait = 实打实等 sec 秒
  const boost = () => Core.Time.boost || 1, real = d => d / boost(), wait = sec => sleep(sec * boost());
  // 行军声：马、象、虎、炮是“台词 → 脚步 → 叫声”，脚步要等台词快说完才起；这里等到脚步起了队伍再动，画面和声音才对得上
  //   最多等 0.9 秒；动画速度调到 2 倍、3 倍的人要的是快，等得更短（0.68 / 0.45 秒）
  // 起步：先说台词、再响脚步。原来队伍要原地等台词说完（最多 0.9 秒）才起步——Ham 10-09：可以走得慢，但不能完全不动。
  //   现在不等了：返回“慢走”的时长（演出时间），交给 walkPath 在这段时间里用三成多的速度慢慢挪，台词说完再提到正常速度
  const stepOff = (t, s, dur, n) => { const w = snd(t, s).move(real(dur), n); return w > 0.05 ? Math.min(w, 0.9, 1.35 / boost()) * boost() : 0; };
  // 慢走起步的速度曲线：0.12 秒从静止加到三成半速度，台词期间保持，再用 0.25 秒提到全速，最后减速停稳。返回总时长和“时间 → 走过的比例”
  function slowStart(dur, lead) {
    const n = 240, s1 = 0.35, dec = Math.min(0.45, dur * 0.4), T = dur + lead * (1 - s1), xs = [0];
    const spd = t => (t < lead ? Math.min(1, t / 0.12) * s1 : Math.min(1, s1 + (1 - s1) * (t - lead) / 0.25)) * Math.min(1, Math.max(0, (T - t) / dec));
    let x = 0; for (let i = 1; i <= n; i++) { x += spd(T * (i - 0.5) / n); xs.push(x); }
    return { T, at: k => { const f = k * n, i = Math.min(n - 1, Math.floor(f)); return (xs[i] + (xs[i + 1] - xs[i]) * (f - i)) / x; }, v: k => spd(k * T) };
  }

  // ======================================================================
  //  基类
  // ======================================================================
  // 扬尘：每走过一小段就在身后扬一团沙（按走过的距离出，不跟帧率走）；水面上不扬尘
  function kick(sq, s, back, step, n) {
    const p = sq.anchor;
    if (!sq._kick) { sq._kick = p.clone(); return; }
    if (p.distanceTo(sq._kick) < step) return;
    sq._kick.copy(p);
    const q = p.clone().addScaledVector(fwd(sq.yaw), -back); q.y = gy(q);
    if (!Fx.onWater(q)) P.plume(q, fwd(sq.yaw), s, n);
  }
  let noRankFlag = false;   // 模型模式下不插等级小旗（每枚子只背一面写着棋子字的旗）
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
    // 出场 / 消失：每个模型在自己的位置原地缩放（小队的 group 在世界原点，直接缩放 group 会让模型滑向棋盘中心）
    setVis(k) {
      k = Math.max(0.001, k);
      for (const c of this.group.children) {
        const tr = c.userData.troop;
        if (tr) { for (const u of tr.units) if (!u.dead) u.vis = Math.min(1, k); continue; }
        if (!c.userData.bs) c.userData.bs = c.scale.clone();
        c.scale.copy(c.userData.bs).multiplyScalar(k);
      }
    }
    // 兵法：升级后换装——二级执「銳」字小旗、甲胄泛金，三级执「精」字大旗、通身金甲
    rank(lv) {
      if (!lv || lv < 2) return this;
      if (noRankFlag) { if (this.troop) this.troop.units.forEach((u, i) => this.troop.tint(i, lv >= 3 ? 0xffcf6a : 0xf0d6a0, lv >= 3 ? 0.4 : 0.22)); return this; }
      if (this.troop) this.troop.units.forEach((u, i) => this.troop.tint(i, lv >= 3 ? 0xffcf6a : 0xf0d6a0, lv >= 3 ? 0.4 : 0.22));
      const flag = Models.makeBanner(this.side, lv >= 3 ? '精' : '銳');
      const fs = lv >= 3 ? 0.1 : 0.075;
      flag.group.scale.setScalar(fs); this.group.add(flag.group);
      this.updaters.push(dt => {
        const p = this.center(0).addScaledVector(rightOf(this.yaw), 0.34).addScaledVector(fwd(this.yaw), -0.28);
        flag.group.position.set(p.x, gy(p), p.z); flag.group.rotation.y = this.yaw - Math.PI / 2 + 0.6; flag.update(dt);
      });
      return this;
    }
    appear() {
      P.ink(this.center(0.05), 8, 0.4, 0.3, 0.7);
      this.setVis(0.001);
      return tween(0.4, k => this.setVis(k), ease.outBack);
    }
    dissolve() {
      P.ink(this.center(0.1), 10, 0.45, 0.35, 0.8);
      return tween(0.4, k => this.setVis(1 - k), ease.in).then(() => this.dispose());
    }
    // 兵法：几级就出几个（战车、战象、炮车这类单模型兵种）——复制主模型（共享几何材质），每帧照抄整棵树的姿态，横向错开成一排
    addEchoes(roots, n, spacing, shrink) {
      if (n <= 1) return;
      const k = shrink || [1, 1, 0.8, 0.68, 0.6][n] || 0.6;
      for (const r of roots) r.scale.multiplyScalar(k);
      const lat = i => (i - (n - 1) / 2) * spacing, back = i => -Math.abs(lat(i)) * 0.35;
      this.echoOff = [lat(0), back(0)];
      this.echoes = [];
      for (let i = 1; i < n; i++) {
        const pairs = roots.map(src => {
          const dst = src.clone(true); this.group.add(dst);
          const a = [], b = []; src.traverse(o => a.push(o)); dst.traverse(o => b.push(o));
          Models.rebindClone(a, b);   // 合成网格改绑到分身自己的骨头上
          return { src, dst, a, b };
        });
        this.echoes.push({ pairs, lat: lat(i), back: back(i) });
      }
      this.updaters.push(() => this.syncEchoes());
      this.syncEchoes();
    }
    syncEchoes() {
      if (!this.echoes) return;
      const R0 = rightOf(this.yaw), F0 = fwd(this.yaw);
      // 主模型也让出自己的位置（整排居中）
      const [l0, b0] = this.echoOff;
      for (const { src } of this.echoes[0].pairs) { const dy = src.position.y - gy(src.position); src.position.addScaledVector(R0, l0).addScaledVector(F0, b0); src.position.y = gy(src.position) + dy; }
      if (this.echoFrozen) return;
      for (const e of this.echoes) for (const { src, a, b } of e.pairs) {
        for (let k = 0; k < a.length && k < b.length; k++) {
          const x = a[k], y = b[k];
          if (k === 0) {
            y.position.copy(x.position).addScaledVector(R0, e.lat - l0).addScaledVector(F0, e.back - b0); y.position.y = gy(y.position) + (x.position.y - gy(x.position));
          } else y.position.copy(x.position);
          y.quaternion.copy(x.quaternion); y.scale.copy(x.scale); y.visible = x.visible;
        }
      }
    }
    // 阵亡时分身各自翻倒消散
    echoesDie(dir) {
      if (!this.echoes) return;
      this.echoFrozen = true;
      for (const e of this.echoes) for (const { dst } of e.pairs) {
        const p0 = dst.position.clone(), r0 = dst.rotation.z, s0 = dst.scale.clone();
        sleep(R(0, 0.25)).then(() => {
          P.dust(p0, 6, dir, 0.3);
          return tween(0.7, k => { dst.rotation.z = r0 + k * 1.3; dst.position.y = p0.y - k * 0.12; if (k > 0.6) dst.scale.copy(s0).multiplyScalar(Math.max(0.001, 1 - (k - 0.6) / 0.4)); }, ease.in);
        });
      }
    }
    echoesShow(v) { if (this.echoes) for (const e of this.echoes) for (const { dst } of e.pairs) dst.visible = v; }
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
    setVis(k) { k = Math.max(0.001, Math.min(1, k)); for (const u of this.troop.units) if (!u.dead) u.vis = k; }
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
  // 兵法：几级就几个人，一字（或品字）排开，人少就画大一点
  const lineUp = (n, w) => n === 1 ? [[0, 0]] : n === 2 ? [[-w / 2, 0], [w / 2, 0]] : n === 3 ? [[-w, -0.05], [0, 0.1], [w, -0.05]] : [[-w * 0.6, 0.12], [w * 0.6, 0.12], [-w * 0.6, -0.14], [w * 0.6, -0.14]];
  const bigFor = n => [1, 1.5, 1.35, 1.22, 1.15][n] || 1;
  class Infantry extends TroopSquad {
    constructor(side, anchor, yaw, n = 0) {
      // 兵法四级兵：不再加人，三名金甲斩马刀手持大盾
      const elite = n >= 4; if (elite) n = 3;
      const off = []; if (n) off.push(...lineUp(n, elite ? 0.3 : 0.27)); else for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) off.push([(c - 1.5) * 0.24, (1 - r) * 0.25]);
      super('p', side, anchor, yaw, elite ? 'zhanma' : 'spear', off, n ? SC * bigFor(n) * (elite ? 1.08 : 1) : SC);
      this.elite = elite; this.sndN = n;
    }
    async attack(target, c) {
      const { B, d } = c;
      this.setPose('ready'); snd('p', this.side).charge(real(1.4), this.sndN);
      await sleep(0.25);
      this.setPose('charge');
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.45);
      const dur = Math.max(0.5, start.distanceTo(end) / 2.2);
      if (target.brace) target.brace();
      let hit = false;
      await tween(dur, k => {
        this.anchor.lerpVectors(start, end, k);
        if (Math.random() < 0.4) { const u = this.units[Math.floor(Math.random() * this.units.length)]; if (Fx.onWater(u.p)) P.splash(u.p.clone().setY(0.05), 1, 0.4); else P.dust(u.p.clone(), 1, d, 0.16); }
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
    constructor(side, anchor, yaw, n = 0) {
      // 士：手持比人还高一点的带刺巨盾。兵法四级不再加人，三名禁卫换一身金甲、金盾
      const elite = n >= 4; if (elite) n = 3;
      super('a', side, anchor, yaw, elite ? 'guardG' : 'guard', n ? lineUp(n, 0.34) : [[0.24, 0], [-0.24, 0]], SC * 0.975 * (n ? bigFor(n) : 1) * (elite ? 1.08 : 1));
      this.elite = elite; this.sndN = n || 2;
    }
    async attack(target, c) {
      const { B, d } = c;
      this.setPose('ready'); snd('a', this.side).charge();
      await sleep(0.25);
      this.setPose('charge');
      if (target.brace) target.brace();
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.32);
      await tween(Math.max(0.4, start.distanceTo(end) / 2.2), k => this.anchor.lerpVectors(start, end, k), ease.in);
      this.units.forEach((u, i) => this.troop.act(i, 'slash', 0.35, i * 0.08));
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
  // 一轮弩箭齐射：sq 是放箭的那队弩手（TroopSquad），n 支箭飞向 target
  async function boltVolley(sq, target, n, dist) {
    const X = Sfx.unit('xbow');
    X.release();
    sq.troop.actAll('shoot', 0.25, 0.1);
    const us = sq.units.filter(u => !u.dead), bolts = [];
    for (let i = 0; i < n && us.length; i++) {
      const u = us[i % us.length];
      const p0 = sq.troop.worldPos(u.i, 1.25);
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
    X.impact();
  }
  // 汉军弩手（相）
  // 汉相：谋士车驾——羽扇谋士立在华盖轺车上，弩手随护两侧（放箭的是弩手）
  class Crossbow extends TroopSquad {
    constructor(side, anchor, yaw, n = 0) {
      // 随护的弩手：平时两名，兵法三级起四名；四级换金甲大黄弩、金华盖
      const elite = n >= 4, four = n >= 3;
      const off = four ? [[0.44, 0.1], [-0.44, 0.1], [0.44, -0.24], [-0.44, -0.24]] : [[0.42, 0], [-0.42, 0]];
      super('e', side, anchor, yaw, elite ? 'xbowG' : 'xbow', off, SC * (elite ? 1.08 : 1));
      this.elite = elite;
      this.cart = Models.makeAdvisorCart(side, { gold: elite }); this.group.add(this.cart.group);
      this.cartK = 1; this._last = anchor.clone();
      this.updaters.push(dt => {
        const g = this.cart.group, u = this.troop.units[0];
        const moved = this.anchor.distanceTo(this._last); this._last.copy(this.anchor);
        this.cart.speed += ((dt > 0 && moved / dt > 0.05 ? 0.6 : 0) - this.cart.speed) * Math.min(1, dt * 8);
        this.cart.update(dt);
        const p = this.anchor.clone().addScaledVector(fwd(this.yaw), -0.08);
        g.position.set(p.x, gy(p), p.z); g.rotation.y = this.yaw - Math.PI / 2;
        g.scale.setScalar(Math.max(0.0001, 0.19 * this.cartK * Math.min(1, this.visK ?? 1, u.dead ? 1 : Math.max(u.vis, 0.001))));
      });
    }
    carrier() { const p = this.anchor.clone().addScaledVector(fwd(this.yaw), -0.24); p.y = gy(p) + 0.2; return { p, vis: this.cartK * Math.max(this.troop.units[0].vis, 0.001) }; }
    die(hit, dir, power, center) {
      // 车驾倾覆：翻倒、散架
      const g = this.cart.group, c = this.center(0.2);
      Fx.chunks(c, dir || new V3(0, 0, 1), 0.9, 8, { planks: true });
      tween(0.5, k => { g.rotation.z = k * 1.2; this.cartK = 1 - k * 0.999; }, ease.in);
      return super.die(hit, dir, power, center);
    }
    async attack(target, c) {
      const { A, B, d, dist } = c;
      this.setPose('aim'); snd('e', 'r').draw();
      if (target.brace) target.brace();
      await sleep(0.45);
      const volley = n => boltVolley(this, target, n, dist);
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
  // 汉相「虎骑」（预览中：网址带 ?tiger=1 才启用，线上仍是谋士车驾）
  // 平时只有一虎一人，吃子是虎扑；兵法三级起两名弩手随护（四级金甲大黄弩），只有发动「齐射」时才由弩手放箭
  const TIGER = Models.TIGER, TG = 0.27;
  class TigerRider extends Squad {
    constructor(side, anchor, yaw, n = 0, role = 'move') {
      super('e', side, anchor, yaw);
      this.role = role;
      const gold = this.gold = n >= 4;
      this.m = TigerHD.make(side, { gold }); this.m.group.scale.setScalar(TG);   // 美术的精修模型（tiger.js），各画质档它自己按 Core.quality 选面数
      this.group.add(this.m.group);
      this.guard = n >= 3 ? new TroopSquad('e', side, anchor, yaw, gold ? 'xbowG' : 'xbow', [[0.4, -0.02], [-0.4, -0.02]], SC * (gold ? 1.08 : 1)) : null;
      // 随护弩手平时不在场（棋盘上清爽）：只在行进和攻击时出列，走完、打完就退下。gk 是出列程度，别处照常调 guard.setVis 也不会把他们叫出来
      if (this.guard) { const g = this.guard, set = g.setVis.bind(g); this.gv = 1; this.gk = 0; g.setVis = k => { this.gv = k; set(k * this.gk); }; g.setVis(1); }
      // 节杖不动（咆哮、扑击时保持平时的朝向）由美术的 tiger.js 自己管（M4）
      this.updaters.push(dt => { this.m.update(dt); this.sync(); });
      this.sync();
    }
    // 随护出列 / 退下：原地一小团墨气
    escort(on, dur = 0.28) {
      const g = this.guard; if (!g || (this.gk > 0.5) === !!on) return Promise.resolve();
      const k0 = this.gk, k1 = on ? 1 : 0;
      for (const u of g.units) if (!u.dead) P.ink(g.troop.worldPos(u.i, 0.12), 4, 0.22, 0.18, 0.5);
      return tween(dur, k => { this.gk = k0 + (k1 - k0) * k; g.setVis(this.gv); }, on ? ease.out : ease.in);
    }
    sync() {
      const g = this.m.group; g.position.copy(this.anchor).addScaledVector(fwd(this.yaw), -0.1); if (!this.air) g.position.y = gy(this.anchor); g.rotation.y = this.yaw - Math.PI / 2;
      if (this.guard && !this.guardStay) { this.guard.anchor.copy(this.anchor); this.guard.yaw = this.yaw; }
    }
    // 棋子模式下化身出场：要走、要打的那一队，随护跟着一起现身；挨打的一方没有随护
    appear() { const g = this.guard; if (!g || this.role === 'defend') return super.appear(); this.gk = 1; this.gv = 1; return Promise.all([super.appear(), g.appear()]); }
    dissolve() { const g = this.guard; return Promise.all([super.dissolve(), g ? (this.gk > 0.01 ? g.dissolve() : void g.dispose()) : null]); }
    async march(path, dur) {
      let last = 0;
      this.escort(true);                           // 起步时随护出列，跟在两侧
      const lead = stepOff('e', this.side, dur || 1.2);   // 台词 → 慢步 → 虎啸（台词期间慢慢走）
      this.m.speed = 0.8; this.gait = v => { this.m.speed = 0.8 * v; };
      if (this.guard) this.guard.setPose('march');
      await walkPath(this, path, dur, k => { kick(this, 0.26, 0.3, 0.2, 2); if (k - last > 0.22) { last = k; Fx.Marks.foot(this.anchor.clone().addScaledVector(rightOf(this.yaw), R(-0.08, 0.08))); } }, lead);
      this.gait = null; this.m.speed = 0;
      if (this.guard) this.guard.setPose('idle');
    }
    async attack(target, c) {
      const { B, d, dist } = c, m = this.m, S = snd('e', this.side);
      // 兵法·齐射：虎伏着不动，两侧弩手放两轮箭
      if (c.ranged && this.guard) {
        await this.escort(true, 0.25);
        this.guard.setPose('aim'); Sfx.unit('xbow').draw(); tween(0.3, k => { m.roarK = k * 0.5; });
        if (target.brace) target.brace();
        await sleep(0.45);
        await boltVolley(this.guard, target, 10, dist);
        const dead = target.die('bolts', d, 1, B);
        await sleep(0.25);
        this.guard.setPose('aim');
        await boltVolley(this.guard, target, 6, dist);
        await dead;
        this.guard.setPose('idle'); tween(0.3, k => { m.roarK = 0.5 * (1 - k); });
        await sleep(0.4);
        return;
      }
      // 虎击：伏低咆哮 → 窜出 → 腾身扑下，一爪一口。三、四级是组合：两侧弩手出列先放一轮箭，箭到，虎才窜出去；弩手留在原地，打完退下
      if (target.brace) target.brace();
      if (this.guard) {
        this.guardStay = true;
        await this.escort(true, 0.25);
        this.guard.setPose('aim'); Sfx.unit('xbow').draw();
        await sleep(0.35);
        tween(0.35, k => { m.roarK = k; }); S.roar();
        await boltVolley(this.guard, target, this.gold ? 8 : 6, dist);
        P.blood(target.center(0.25), 6, 0.5, d, 0.6);
        this.guard.setPose('ready');
        await sleep(0.1);
      } else {
        tween(0.35, k => { m.roarK = k; }); S.roar();
        await sleep(0.6);
      }
      tween(0.2, k => { m.roarK = 1 - k * 0.6; });
      m.speed = 1.4; S.charge();
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.34), run = start.distanceTo(end), mid = start.clone().lerp(end, run > 0.9 ? 1 - 0.75 / run : 0.15);
      await tween(Math.max(0.12, start.distanceTo(mid) / 3.4), k => { this.anchor.lerpVectors(start, mid, k); if (Math.random() < 0.4) P.dust(this.center(0), 1, d, 0.2); }, ease.in);
      m.speed = 0; this.air = true;
      await tween(0.3, k => { this.anchor.lerpVectors(mid, end, k); m.pounceK = Math.sin(Math.min(1, k * 1.25) * Math.PI * 0.5); m.roarK = 0.4 + 0.6 * k; m.group.position.y = gy(this.anchor) + Math.sin(k * Math.PI) * 0.2; });
      this.air = false;
      S.impact(); Cam.shake(0.3); Fx.slowmo(0.3, 0.14);
      const hp = B.clone(); hp.y = TOP + 0.25;
      for (let i = 0; i < 3; i++) sleep(i * 0.05).then(() => Fx.slash(hp.clone().addScaledVector(rightOf(this.yaw), (i - 1) * 0.1), 0.9, 0.75, i === 1 ? 0x9e2418 : undefined));
      P.dust(B, 10, null, 0.3); Fx.Marks.cut(B, d);
      const dead = target.die('cut', d, 1.2, B);
      const off = this.guard ? sleep(0.25).then(() => { this.guard.setPose('idle'); return this.escort(false, 0.35); }) : null;
      await tween(0.35, k => { m.pounceK = 1 - k; m.roarK = 1 - k; }, ease.in);
      await dead; await off;
      this.guardStay = false;
      await sleep(0.3);
    }
    brace() { tween(0.3, k => { this.m.roarK = k * 0.8; }); if (this.guard && this.gk > 0.5) this.guard.setPose('cower'); }
    async die(hit, dir, power, center) {
      const m = this.m, c = this.center(0.25);
      const gd = this.guard && this.gk > 0.5 ? this.guard.die(hit, dir, power, center) : null;
      // 倒地时文臣和节杖倒向一侧（deadSide = 1 是倒向行进方向的左手边）：挑旁边那格没有子的一侧
      { const R0 = rightOf(this.yaw), busy = sd => { const q = this.anchor.clone().addScaledVector(R0, -sd); for (const x of Board.pieces.values()) if (x.parent && Math.hypot(x.position.x - q.x, x.position.z - q.z) < 0.6) return true; return false; };
        const sd = Math.random() < 0.5 ? 1 : -1; m.deadSide = !busy(sd) ? sd : !busy(-sd) ? -sd : sd; }
      tween(0.25, k => { m.roarK = k; }); snd('e', this.side).die();
      P.blood(c, 20, 1.0, dir, 1.1);
      if (hit === 'blast') P.fire(c, 16, 0.7);
      if (hit === 'bolts') for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(boltGeo, Models.vcMat); b.position.copy(c).add(rv(0.22, 0.12, 0.22)); b.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().negate().add(rv(0.3, 0.3, 0.3)).normalize()); this.group.add(b); }
      await sleep(0.15);
      await tween(0.8, k => { m.dead = k; m.roarK = 1 - k; }, ease.in);
      Cam.shake(0.15); P.dust(this.center(0), 10, null, 0.3); Sfx.B.thud(0, 0.7);
      Fx.Marks.blood(this.center(0).addScaledVector(dir, 0.1), 1.0, dir);
      await gd;
    }
  }
  // 楚军战象（象）
  class Elephant extends Squad {
    constructor(side, anchor, yaw, gold = false) {
      super('e', side, anchor, yaw);
      this.m = Models.makeElephant(side, { gold }); this.m.group.scale.setScalar(EL);
      this.group.add(this.m.group);
      this.updaters.push(dt => { this.m.update(dt); this.sync(); if (this.m.fire > 0.1 && !LOW()) P.flame(this.m.torch.getWorldPosition(new V3()), 0.12); });
      this.sync();
    }
    sync() { const g = this.m.group; g.position.copy(this.anchor).addScaledVector(fwd(this.yaw), -0.05); g.position.y = gy(this.anchor); g.rotation.y = this.yaw - Math.PI / 2; }
    center(h = 0.3) { return super.center(h); }
    async march(path, dur) {
      let last = 0;
      const lead = stepOff('e', this.side, dur || 1.4);   // 战象行军：台词 → 重步 → 象鸣（台词期间慢慢走）
      this.m.speed = 0.7; this.gait = v => { this.m.speed = 0.7 * v; };
      await walkPath(this, path, dur, k => { kick(this, 0.34, 0.3, 0.16, 3); if (k - last > 0.18) { last = k; Cam.shake(0.03); Fx.Marks.foot(this.anchor.clone().addScaledVector(rightOf(this.yaw), R(-0.1, 0.1))); } }, lead);
      this.gait = null; this.m.speed = 0;
    }
    async attack(target, c) {
      const { B, d } = c;
      const s = snd('e', 'b');
      const start = this.anchor.clone(), end = B.clone().addScaledVector(d, -0.25), run = Math.max(0.5, start.distanceTo(end) / 1.8);
      tween(0.4, k => { this.m.trumpetK = k; }); s.charge(real(0.5 + run)); this.m.fire = 1;   // 奔踏声垫在台词下面
      if (target.brace) target.brace();
      await sleep(0.5);
      tween(0.3, k => { this.m.trumpetK = 1 - k; });
      this.m.speed = 1.2;
      await tween(run, k => { this.anchor.lerpVectors(start, end, k); if (Math.random() < 0.5) P.dust(this.center(0), 1, d, 0.3); }, ease.in);
      this.m.speed = 0;
      s.cry();   // 人立扬鼻的时候象鸣（台词还没说完就等它说完）
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
      kick(this, 0.3, 0.5, 0.14, 3);
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
    brace() { this.m.horses.forEach((h, i) => tween(0.3, k => { h.rearK = k * (i % 2 ? 0.6 : 0.9); })); Sfx.B.neigh(0, 0.1, 'a'); }
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
      if (G >= 1) Sfx.B.neigh(0.05, 0.12, 'd');
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
    constructor(side, anchor, yaw, n = 0) {
      super('n', side, anchor, yaw);
      this.riders = []; this.sndN = n ? Math.min(3, n) : 3;   // 马蹄叠几层
      const offs = n === 1 ? [[0, 0]] : n === 2 ? [[0.17, 0.05], [-0.17, -0.1]] : [[0, 0.12], [0.3, -0.3], [-0.3, -0.3]];
      offs.forEach(([x, z], i) => {
        const h = Models.makeCavalry(side, true, i === 0 && side === 'b' ? 'ji' : 'dao');
        h.group.scale.setScalar(HS * (n === 1 ? 1.2 : 1)); h.off = [x, z]; h.lastPrint = anchor.clone();
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
        if (h.speed > 0.3 && p.distanceTo(h.lastPrint) > 0.15) { Fx.Marks.hoof(p, fwd(this.yaw)); h.lastPrint.copy(p); if (Fx.onWater(p)) P.splash(p.clone().setY(0.05), 2, 0.45); else { if (Math.random() < 0.5) P.dust(p, 1, fwd(this.yaw), 0.18); P.plume(p.clone().addScaledVector(fwd(this.yaw), -0.22), fwd(this.yaw), 0.22, 1); } }
      }
    }
    // 日字路线：先直走一格，拐角处头马人立，再斜冲到位
    async march(path, dur, charge = false) {
      // 马走日：不再“先直后斜、拐角人立”，一口气沿对角线奔到位
      const a = path[0], b = path[path.length - 1];
      const run = Math.max(0.4, a.distanceTo(b) * (charge ? 0.3 : 0.42));
      const lead = charge ? 0 : stepOff('n', this.side, run, this.sndN);   // 冲锋的马蹄声在 attack 里已经起了；台词期间马先小步走
      const sp = charge ? 1 : 0.85;
      this.riders.forEach(h => { h.speed = sp; }); this.gait = v => this.riders.forEach(h => { h.speed = sp * Math.max(0.25, v); });
      await walkPath(this, [a, b], run, null, lead);
      this.gait = null; this.riders.forEach(h => { h.speed = 0; });
    }
    async attack(target, c) {
      const { B, d, info } = c;
      const s = snd('n', this.side);
      s.charge(real(1.6), this.sndN);
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
    brace() { this.riders.forEach((h, i) => tween(0.3, k => { h.rearK = k * 0.7; })); Sfx.B.neigh(0, 0.09, 'a'); }
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
    constructor(side, anchor, yaw, mode = 'march', n = 0) {
      super('c', side, anchor, yaw);
      this.mode = mode; this.lv = n;
      if (mode === 'battery') {
        const d = fwd(yaw), s = rightOf(yaw);
        this.guns = (n === 1 ? [0] : n === 2 ? [-0.36, 0.36] : [-0.62, 0, 0.62]).map(l => {
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
        this.crew = new Models.Troop(side, 'crew', 2, SC); this.group.add(this.crew.group); this.crew.group.userData.troop = this.crew;
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
      const lead = stepOff('c', this.side, dur);   // 台词期间炮车慢慢推
      if (this.horse) this.horse.speed = 0.3;
      this.gait = v => { if (this.horse) this.horse.speed = 0.3 * Math.max(0.3, v); };
      await walkPath(this, path, dur, (k, v) => { for (const w of this.gun.wheels) w.rotation.z -= 0.25 * v; if (Math.random() < 0.3 * v) P.dust(this.center(0), 1, fwd(this.yaw), 0.15); }, lead);
      this.gait = null; if (this.horse) this.horse.speed = 0;
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
      const ng = this.guns.length;
      const targets = [tc.clone().addScaledVector(side, 0.45).addScaledVector(d, -0.3), tc.clone().addScaledVector(side, -0.4).addScaledVector(d, 0.3), tc.clone()].slice(3 - ng);
      let dead = Promise.resolve();
      const fire = async (g, i) => {
        for (let k = 0; k < 6; k++) P.sparks(g.torch.getWorldPosition(new V3()), 2, 0.4);
        s.fire(i, this.lv, real(0.14 + flight));
        await sleep(0.14);
        const muzzle = g.barrel.localToWorld(new V3(1.35, 0, 0));
        Cam.shake(0.14); Fx.flash(muzzle, 40, 0.35); P.fire(muzzle, 16, 0.5); Fx.glow(muzzle, 1.5, 0.3, 0.45);
        for (let k = 0; k < 8; k++) Fx.spawn({ pos: muzzle.clone(), vel: d.clone().multiplyScalar(R(1.5, 4)).add(rv(0.4, 0.4, 0.4)), color: 0x6e6a64, size: 0.2, size2: R(0.8, 1.4), life: R(1.2, 2), op: 0.55, drag: 2.2 });
        tween(0.3, k => g.group.position.copy(g.base).addScaledVector(d, -0.18 * Math.sin(k * Math.PI)));
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), Core.toon(0x1c1a18));
        ball.position.copy(muzzle); scene.add(ball);
        const tp = targets[i].clone(); tp.y = Fx.groundAt(tp) + 0.05;
        const p0 = muzzle.clone();
        const halo = Fx.glow(muzzle, 0.5, flight + 0.05, 0.4, 0xff9a4a, 0.25);
        await tween(flight, k => {
          ball.position.lerpVectors(p0, tp, k); ball.position.y = p0.y + (tp.y - p0.y) * k + peak * 4 * k * (1 - k);
          if (halo) halo.sp.position.copy(ball.position);
          Fx.spawn({ pos: ball.position.clone(), tex: Core.Tex.spark, add: true, color: 0xff8a3a, size: 0.22, size2: 0.05, life: 0.3, op: 0.9 });
          Fx.spawn({ pos: ball.position.clone(), color: 0x3d3a37, size: 0.1, size2: 0.35, life: 0.8, op: 0.35, drag: 1 });
        }, ease.linear);
        scene.remove(ball);
        const big = i === ng - 1;
        s.explode(big, this.lv);
        if (halo) halo.life = 0;
        Cam.shake(big ? 0.42 : 0.2); Fx.flash(tp, big ? 120 : 60, big ? 0.9 : 0.5, big ? 0.55 : 0); Fx.glow(tp.clone().add(new V3(0, 0.25, 0)), big ? 3.4 : 2, big ? 0.55 : 0.4, big ? 0.5 : 0.4);
        P.fire(tp.clone().add(new V3(0, 0.1, 0)), big ? 44 : 22, big ? 1.1 : 0.7); P.smoke(tp, big ? 16 : 8, big ? 1 : 0.7); P.sparks(tp, big ? 30 : 12, 1.2);
        Fx.ring(tp, big ? 3.6 : 1.8, 0.8); Fx.Marks.scorch(tp, big ? 2.2 : 1.2); Fx.addSmoke(tp, big ? 1 : 0.5);
        for (let k = 0; k < (big ? 10 : 4); k++) { const o = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), Core.toon(0x5d554a)); o.position.copy(tp).add(new V3(0, 0.1, 0)); scene.add(o); Fx.throwObj(o, new V3(R(-2, 2), R(2, 5), R(-2, 2)), { life: R(0.8, 1.4) }); }
        if (big) { Fx.slowmo(0.3, 0.15); dead = target.die('blast', d, 1.6, tp); }
      };
      { const L = Sfx.lineLeft(); if (L > 0.05) await wait(Math.min(L, 1.2)); }   // 台词说完直接点火
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
      P.fire(keg, 30, 0.9); Fx.flash(keg, 70, 0.6, 0.25); Fx.glow(keg, 2.4, 0.45, 0.42); P.smoke(keg, 10, 0.8); Sfx.B.boom(0, 0.7); Cam.shake(0.25);
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
      this.hero.group.scale.setScalar(HERO * (this.isX ? 1 : 1.5));   // 刘邦放大到 1.5 倍，随从不变
      // 决战：刘邦拔剑在手，站成战斗架势
      this.armed = !this.isX && finalMode;
      this.standPose = this.armed ? Models.POSES.lGuard : Models.POSES.lStand;
      if (this.armed) { const H = this.hero; H.weapon.visible = true; if (H.sheathed) H.sheathed.visible = false; H.setPose(this.standPose); }
      this.mounted = this.isX && opts.mounted !== false;
      if (this.mounted) {
        this.horse = Models.makeWuzhui(); this.horse.group.scale.setScalar(HS); this.group.add(this.horse.group);
        this.hero.setPose(Models.POSES.xRide);
        this.hero.group.scale.setScalar(HERO / HS);
        this.hero.group.position.set(-0.05, 1.3, 0); this.hero.group.rotation.y = Math.PI / 2;
        this.horse.bodyPivot.add(this.hero.group);
      } else this.group.add(this.hero.group);
      // 随从：前两名执戟护卫，后两名旗手各擎一面帅旗（行进时旗举得更高、猎猎作响）
      this.guard = opts.guard === false ? null : new TroopSquad('k', side, anchor, yaw, 'halberd', this.isX ? [[0.34, -0.35], [-0.34, -0.35], [0.2, -0.68], [-0.2, -0.68]] : [[0.3, -0.15], [-0.3, -0.15], [0.2, -0.5], [-0.2, -0.5]], SC);
      if (this.guard) this.flags = (this.isX ? ['楚', '將'] : ['漢', '帥']).map(ch => { const f = Models.makeBanner(side, ch); f.group.scale.setScalar(KFLAG); scene.add(f.group); return f; });
      this.flagK = 0;
      this.walkT = 0; this.walking = 0;
      this.updaters.push(dt => {
        this.hero.update(dt);
        if (this.horse) this.horse.update(dt);
        if (this.walking && !this.mounted) {
          this.walkT += dt * 6 * this.walking;
          const s = Math.sin(this.walkT);
          const J = this.hero.J; J.lLx = s * 0.45; J.lRx = -s * 0.45; J.kL = Math.max(0, -s) * 0.6; J.kR = Math.max(0, s) * 0.6; this.hero.setPose({ ...J });
        }
        if (this.flags) {
          const mv = this.marching ? 1 : 0; this.flagK += (mv - this.flagK) * Math.min(1, dt * 5);
          this.flags.forEach((f, i) => {
            const u = this.guard.units[2 + i]; if (!u) return;
            const sd = i ? -1 : 1;
            f.group.position.copy(u.p).addScaledVector(rightOf(this.yaw), sd * 0.07); f.group.position.y += 0.06 + 0.07 * this.flagK;
            f.group.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;   // 旗面始终正对看棋的人（之前跟着队伍朝向，字是反的）
            f.group.scale.setScalar((KFLAG + 0.04 * this.flagK) * u.vis);
            f.update(dt * (1 + 1.8 * this.flagK));
          });
        }
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
    dissolve() { if (this.flags) for (const f of this.flags) scene.remove(f.group); return Promise.all([super.dissolve(), this.guard ? this.guard.dissolve() : null]); }
    async march(path, dur) {
      const s = snd('k', this.side);
      s.move(dur);
      if (this.guard) this.guard.setPose('march');
      if (this.mounted) this.horse.speed = 0.4; else this.walking = 1;
      this.marching = true; Cam.shake(0.05);
      await walkPath(this, path, dur, () => kick(this, 0.26, 0.4, 0.2, 2));
      this.marching = false; Cam.shake(0.06); if (!Fx.onWater(this.anchor)) P.dust(this.center(0), 8, null, 0.3);
      this.walking = 0; if (this.horse) this.horse.speed = 0;
      if (this.guard) this.guard.setPose('idle');
      if (!this.mounted) this.hero.pose(this.standPose, 0.3);
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
        if (!this.armed) { await H.pose(P_.lDraw, 0.25); s.draw(); }
        H.weapon.visible = true; if (H.sheathed) H.sheathed.visible = false;
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
  // 决战里主帅被斩：随从倒地，主帅中刀跪倒（项羽连人带马栽倒）
  General.prototype.die = async function (hit, dir, power = 1, center) {
    const P_ = Models.POSES, H = this.hero, c = this.center(0.3);
    P.blood(c, 20, 0.9, dir, 1.4); Sfx.B.stab(0, 0.6);
    const ps = [];
    if (this.guard) ps.push(this.guard.die(hit === 'hero' ? 'slash' : hit, dir, power, center));
    if (this.mounted) {
      this.horse.speed = 0;
      ps.push(tween(0.9, k => { this.horse.rearK = Math.sin(Math.min(1, k * 2) * Math.PI) * 0.7; if ('dead' in this.horse) this.horse.dead = Math.max(0, k * 1.6 - 0.6); }, ease.in));
      ps.push(H.pose({ ...P_.xRide, tx: 0.5, nx: 0.5, sRx: 0.3, sLx: 0.3 }, 0.8));
    } else ps.push(H.pose(this.isX ? P_.xKneel : P_.lKneel, 0.9, ease.inOut));
    await Promise.all(ps);
    P.dust(this.center(0), 8, null, 0.3); Sfx.B.thud(0, 0.6);
    await sleep(0.5);
  };
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
  // lead：起步先慢走多久（演出时间，见 stepOff）；onStep(k, v) 的 v 是此刻相对全速的快慢（0～1），给马蹄、车轮、步态用
  function walkPath(sq, path, dur, onStep, lead = 0) {
    const segs = []; let tot = 0;
    for (let i = 1; i < path.length; i++) { const L = path[i - 1].distanceTo(path[i]); segs.push([path[i - 1], path[i], L]); tot += L; }
    if (!dur) dur = tot / 1.2;
    if (tot < 1e-4) return Promise.resolve();
    let lastSeg = -1;
    const prof = lead > 0.05 ? slowStart(dur, lead) : null;
    return tween(prof ? prof.T : dur, (k0, raw) => {
      const k = prof ? prof.at(raw) : k0, v = prof ? prof.v(raw) : 1;
      if (sq.gait) sq.gait(v);
      let dist = k * tot, i = 0;
      while (i < segs.length - 1 && dist > segs[i][2]) { dist -= segs[i][2]; i++; }
      const [a, b, L] = segs[i];
      sq.anchor.lerpVectors(a, b, L > 0 ? Math.min(1, dist / L) : 1);
      if (i !== lastSeg) { lastSeg = i; const dd = b.clone().sub(a); if (dd.lengthSq() > 1e-6) turnTo(sq, yawOf(dd), 0.2); }
      if (onStep) onStep(k, v);
    }, prof ? ease.linear : ease.inOut);
  }
  function turnTo(sq, yaw, dur) {
    let y0 = sq.yaw, dy = yaw - y0;
    while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    return tween(dur, k => { sq.yaw = y0 + dy * k; }, ease.inOut);
  }

  // ---------- 工厂 ----------
  // 兵法四级车：手持双锤的金甲大将骑马在前，三辆战车在后
  function vanguard(sq) {
    sq.addEchoes([sq.m.group], 3, 0.4, 0.62);
    sq.echoOff[1] -= 0.42; for (const e of sq.echoes) e.back -= 0.42;
    const gen = Models.makeCavalry(sq.side, true, 'hammers', { gold: true });
    gen.group.scale.setScalar(HS * 1.3); sq.group.add(gen.group); sq.general = gen;
    gen.deadSide = 1;
    const place = () => { const p = sq.anchor.clone().addScaledVector(fwd(sq.yaw), 0.38); gen.group.position.set(p.x, gy(p), p.z); gen.group.rotation.y = sq.yaw - Math.PI / 2; };
    sq.updaters.push(dt => { gen.speed = Math.min(1.2, (sq.m.speed || 0) * 0.9); gen.update(dt); if (!sq.genFree) place(); });
    place();
    const die = sq.die.bind(sq);
    sq.die = (hit, dir, ...a) => { sq.genFree = true; P.blood(gen.group.position.clone().setY(TOP + 0.3), 12, 0.8, dir); tween(0.7, k => { gen.dead = k; gen.rearK = Math.sin(k * Math.PI) * 0.6; }, ease.in); return die(hit, dir, ...a); };
    return sq;
  }
  // n：兵法模式按等级出几个（0 = 普通模式的原编制）
  function make(t, side, anchor, yaw, role = 'move', lv = 1, n = 0) {
    const sq = make0(t, side, anchor, yaw, role, n);
    if (t === 'r' && n >= 4 && sq instanceof Chariot) { vanguard(sq); const d0 = sq.die; sq.die = (hit, dir, ...a) => { sq.echoesDie(dir || new V3(0, 0, 1)); return d0(hit, dir, ...a); }; return sq.rank ? sq.rank(lv) : sq; }
    if (n > 1) {
      if (sq instanceof Elephant || sq instanceof Chariot) sq.addEchoes([sq.m.group], t === 'e' ? Math.min(3, n) : n, t === 'r' ? 0.36 : 0.4);   // 四级战象：三头黄金象，不再加数量
      else if (sq instanceof Cannon && sq.mode !== 'battery') sq.addEchoes([sq.gun.group].concat(sq.horse ? [sq.horse.group] : []), n, 0.42);
      if (sq.echoes) { const die = sq.die.bind(sq); sq.die = (hit, dir, ...a) => { sq.echoesDie(dir || new V3(0, 0, 1)); return die(hit, dir, ...a); }; }
    }
    return lv >= 2 && sq.rank ? sq.rank(lv) : sq;
  }
  function make0(t, side, anchor, yaw, role, n = 0) {
    switch (t) {
      case 'p': return new Infantry(side, anchor, yaw, n);
      case 'a': return new Guards(side, anchor, yaw, n);
      case 'e': return side === 'r' ? (TIGER ? new TigerRider(side, anchor, yaw, n, role) : new Crossbow(side, anchor, yaw, n)) : new Elephant(side, anchor, yaw, n >= 4);
      case 'r': return new Chariot(side, anchor, yaw);
      case 'n': return new Cavalry(side, anchor, yaw, n);
      case 'c': return new Cannon(side, anchor, yaw, role === 'attack' ? 'battery' : role === 'defend' ? 'defend' : 'march', n);
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
    const boat = info.crossesRiver && (t === 'p' || t === 'c'), live = Stand.on;   // 模型模式：棋盘上那一队直接起步，不再化墨重生
    if (live) Stand.hide(m); else Fx.sink(m);
    const L = c.mt === 'n'; // 日字路线（揭棋中按位置走法，可能与兵种不同）
    const lvN = info.piece.lv || 0;
    const yaw0 = L ? yawOf(knightCorner(info).clone().sub(A)) : yaw;
    const sq = make(t, s, A, live ? standYaw(s) : yaw0, 'move', lvN || 1, lvN);
    if (live) { showNow(sq); await turnTo(sq, yaw0, 0.22); } else await sq.appear();
    let stopCam = () => { };
    if (cine && A.distanceTo(B) > 1.8) stopCam = Fx.follow(() => sq.center(0.2), () => c.side.clone().multiplyScalar(2.6).addScaledVector(d, -1.4).add(new V3(0, 1.3, 0)), () => d.clone().multiplyScalar(0.8).add(new V3(0, 0.05, 0)), 4);
    const dist = L ? 2.2 : A.distanceTo(B);
    const dur = Math.max(0.6, dist / SPEED[t]);
    const ferry = boat ? rideBoat(sq, c, dur) : null;   // 兵卒、炮过河：脚下垫一条船，照平地的速度直接过去
    if (sq.march && t === 'n') await sq.march(L ? [A, knightCorner(info), B] : [A, A.clone().lerp(B, 0.35), B]);
    else if (sq.march) await sq.march(L ? [A, knightCorner(info), B] : [A, B], dur);
    else {
      sq.setPose('march'); snd(t, s).move(real(dur), sq.sndN);
      await walkPath(sq, L ? [A, knightCorner(info), B] : [A, B], dur, k => { if (sq.units && Math.random() < 0.2) Fx.Marks.foot(sq.units[Math.floor(Math.random() * sq.units.length)].p); });
      sq.setPose('idle');
    }
    stopCam();
    if (ferry) ferry.done();
    await sleep(0.1);
    if (await settleSquad(sq, m, B)) return;
    await sq.dissolve();
    await Fx.rise(m, B, 0.35);
  }
  // 模型模式下的衔接：演出队伍停下后原地转回默认朝向，直接换回棋盘上立着的那一队（不再“化墨缩小 → 棋子长出来”）
  const standYaw = s => yawOf(new V3(0, 0, s === 'r' ? -1 : 1));
  const showNow = sq => { sq.setVis(1); if (sq.guard) sq.guard.setVis(1); };
  const dropSquad = sq => { try { if (sq.flags) for (const f of sq.flags) scene.remove(f.group); if (sq.guard) sq.guard.dispose(); sq.dispose(); } catch (e) { } };
  async function settleSquad(sq, m, pos) {
    if (!Stand.on || !m || !m.parent) return false;
    try { if (sq.setPose && sq.troop) sq.setPose('idle'); await Promise.all([turnTo(sq, standYaw(m.userData.s), 0.26), sq.escort ? sq.escort(false, 0.26) : null]); } catch (e) { }
    m.position.copy(pos); m.position.y = TOP; m.visible = true; m.scale.set(1, 1, 1);
    Stand.snap(m);
    dropSquad(sq);
    Sfx.place(m);
    return true;
  }
  // 马的行进路线：直奔落点（这里给出路线中点，供朝向和镜头用）
  const knightCorner = info => Board.pos(info.from[0], info.from[1]).lerp(Board.pos(info.to[0], info.to[1]), 0.5);

  // ---------- 渡河：兵卒、炮乘船 ----------
  // Ham 10-06 定的：不要“走到岸边 → 等船 → 上船 → 摆渡 → 下船”那一长串，直接乘船过去，速度和平地一样。
  // 做法：队伍照常从起点走到落点；靠近河的时候脚下现出一条船，跟着队伍过河，上岸后隐去。水面那一段把人垫到船板的高度（见上面的 deck）
  function rideBoat(sq, c, dur) {
    const { A, B, info } = c, H = Board.HALF;
    const span = sq.troop ? 2 * Math.max(...sq.offsets.map(o => Math.abs(o[0]))) : (sq.echoes ? sq.echoes.length * 0.42 : 0) + 0.3;   // 这一队横着有多宽
    const sc = sq.troop ? Math.max(0.34, Math.min(0.5, (span + 0.1) / 2.2)) : Math.max(0.5, Math.min(0.62, (span + 0.8) / 2.2));   // 船的大小跟着队伍走；太大了船夫会比兵高出一大截
    const b = Models.makeBoat({ side: info.piece.s, sail: true });
    b.group.scale.setScalar(0.001); b.group.position.set(sq.anchor.x, 0.03, 0); scene.add(b.group);
    const my = ++deckId; deck = 0.03 + 0.3 * sc;
    Sfx.river(Math.max(1.2, real(dur)));
    let t = 0, k = 0, gone = false, wet = false;
    const off = onFrame(dt => {
      t += dt; b.update(dt);
      const z = sq.anchor.z, near = !gone && Math.abs(z) < H + 0.5;
      k += ((near ? 1 : 0) - k) * Math.min(1, dt * (near ? 10 : 5));
      b.group.scale.setScalar(Math.max(0.001, sc * k));
      b.group.position.set(sq.anchor.x, 0.03 + Math.sin(t * 3) * 0.012, Math.max(-0.05, Math.min(0.05, z * 0.25)));   // 河很窄，船只是跟着横挪一点
      b.group.rotation.z = Math.sin(t * 2.3) * 0.035; b.man.poleArm.rotation.z = 0.5 + Math.sin(t * 3.2) * 0.25;
      if (!wet && Math.abs(z) < H + 0.1) { wet = true; Sfx.B.splash(0, 0.2); P.splash(new V3(sq.anchor.x, 0.05, 0), 5, 0.5); }
    });
    return { done() { gone = true; sleep(0.6).then(() => { off(); if (deckId === my) deck = null; Core.disposeTree(b.group); }); } };
  }

  // 低特效档：棋子照平时那样一步过去，河里垫一条船
  async function pieceBoat(c) {
    const { A, B, s, m } = c;
    const xc = A.x + (B.x - A.x) * (A.z / (A.z - B.z));
    const boat = Models.makeBoat({ side: s, sail: true }), bs = 0.5;
    boat.group.position.set(xc, 0.03, 0); boat.group.scale.setScalar(0.001); scene.add(boat.group);
    let t = 0, k = 0, gone = false;
    const up = onFrame(dt => { t += dt; boat.update(dt); k += ((gone ? 0 : 1) - k) * Math.min(1, dt * (gone ? 5 : 14)); boat.group.scale.setScalar(Math.max(0.001, bs * k)); boat.group.position.y = 0.03 + Math.sin(t * 3) * 0.012; boat.group.rotation.z = Math.sin(t * 2.3) * 0.035; boat.man.poleArm.rotation.z = 0.5 + Math.sin(t * 3.2) * 0.25; });
    Sfx.river(1.2); Sfx.B.splash(0.12, 0.2);
    await Fx.lowMove(c);
    P.splash(new V3(xc, 0.05, 0), 5, 0.5);
    gone = true; sleep(0.7).then(() => { up(); Core.disposeTree(boat.group); });
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
    const live = Stand.on;
    if (live) { Stand.hide(m); Stand.hide(tgt); } else { Fx.sink(m); Fx.sink(tgt); }
    const counterDie = c.counter === 'die';
    const yawA = t === 'n' && c.mt === 'n' ? yawOf(knightCorner(info).clone().sub(A)) : yaw;
    const att = make(t, s, A, live ? standYaw(s) : yawA, counterDie && t === 'c' ? 'move' : 'attack', c.lv, c.lv || 0);
    const def = make(dt_, ds, B, live ? standYaw(ds) : yaw + Math.PI, 'defend', c.dlv, c.dlv || 0);
    if (live) { showNow(att); showNow(def); await Promise.all([turnTo(att, yawA, 0.22), turnTo(def, yaw + Math.PI, 0.22)]); }
    else await Promise.all([att.appear(), sleep(0.15).then(() => def.appear())]);
    if (def.setPose) def.setPose('ready');
    // 兵法·拒马（美术 M20，Ham 10-09）：守方压低重心、长矛斜指来敌；攻方撞上矛尖先掉 1 点血，面朝守方倒退几步再冲
    if (c.counter) {
      jmForm(def, true);
      if (!def.troop && def.setPose) def.setPose('brace');
      const ring = hpRing(att, c.hp);
      await sleep(0.3);   // 迎敌：先让人看清守方立起拒马阵
      const hitAt = B.clone().addScaledVector(d, att.troop ? -0.72 : -0.8);   // 步兵身子短，停近一点矛尖才顶得到
      await charge(att, hitAt);
      // 撞上：守方身子一挫，血、木屑，镜头一震
      Sfx.B.stab(0, 0.5); Sfx.B.woodbreak(0.05, 0.35); Cam.shake(0.14);
      if (def.troop) def.troop.units.forEach(u => def.troop.act(u.i, 'jmHit', 0.3));
      Fx.P.blood(att.center(0.25), 14, 0.7, d.clone().negate()); Fx.P.wood(B.clone().addScaledVector(d, -0.5).setY(TOP + 0.2), 8, d.clone().negate(), 0.6);
      jmRecoil(att);
      // 掉一滴血：头顶飘「−1」，脚下血圈少一段
      const popH = att.troop ? 0.48 : att instanceof Elephant ? 0.85 : 0.6;
      popAt(() => att.center(popH), '−1'); if (ring) ring.hit();
      if (counterDie) {
        await att.die('stab', d.clone().negate(), 1, att.center(0));
        if (ring) ring.done();
        await sleep(0.6);
        att.dissolve(); await sleep(0.2);
        if (await settleSquad(def, tgt, B)) return;
        await def.dissolve();
        if (tgt) await Fx.rise(tgt, B, 0.4);
        return;
      }
      // 被顶回半步，再面朝守方倒退开（不转身——原来是转身走回起点，再冲时背对着守方）
      const a0 = att.anchor.clone();
      await tween(0.3, k => { att.anchor.copy(a0).addScaledVector(d, -0.2 * k); }, ease.out);
      await sleep(0.2);
      await backOff(att, B.clone().addScaledVector(d, -Math.min(1.7, Math.max(1.25, A.distanceTo(B)))));
      if (ring) ring.done();
      jmForm(def, false);
      await sleep(0.15);
    }
    if (c.survive) def.die = (hit, dir, power, center) => hurtSquad(def, hit, dir, power, center);
    if (cine && t !== 'c') {
      const ranged = t === 'e' && s === 'r';
      if (ranged) Fx.shot(mid.clone().addScaledVector(side, 2.2 + c.dist * 0.55).addScaledVector(d, -0.5).add(new V3(0, 1.1 + c.dist * 0.12, 0)), mid.clone().add(new V3(0, 0.2, 0)), 0.6);
      else Fx.shot(A.clone().lerp(B, 0.7).addScaledVector(side, 2.3).addScaledVector(d, -0.6).add(new V3(0, 0.95, 0)), A.clone().lerp(B, 0.82).add(new V3(0, 0.25, 0)), 0.6);
    }
    await att.attack(def, c);
    if (c.onImpact) await c.onImpact({ att });   // 践踏：打完就地跺脚、结算四周，之后才撤回 / 收场
    // 兵法·攻击未下：攻方撤回原位，守方带伤留在原地；远射（齐射）攻方不动
    if (c.survive || c.ranged) {
      await sleep(0.3);
      if (c.survive) await retreat(att, A);
      if (live) { await Promise.all([settleSquad(att, m, A), c.survive ? settleSquad(def, tgt, B) : def.dissolve()]); return; }
      att.dissolve(); await sleep(0.25); await def.dissolve();
      await Promise.all([Fx.rise(m, A, 0.4), tgt && c.survive ? Fx.rise(tgt, B, 0.4) : null]);
      return;
    }
    // 收尾：尸体留一会儿再化墨
    const hold = gore() >= 3 ? 1.6 : gore() >= 1 ? 0.9 : 0.4;
    await sleep(0.2);
    if (live && att.anchor) {
      // 模型模式：胜者踏上落点、转回默认朝向站定；地上的尸体留一会儿再化墨
      sleep(hold).then(() => { Fx.P.ink(B.clone().setY(TOP + 0.1), 14, 0.5, 0.35, 0.7); return def.dissolve(); });
      const from = att.anchor.clone();
      if (from.distanceTo(B) > 0.04) { speedUp(att, 0.6); await tween(Math.max(0.25, from.distanceTo(B) / 1.6), k => att.anchor.lerpVectors(from, B, k)); speedUp(att, 0); }
      if (await settleSquad(att, m, B)) return;
    }
    att.dissolve();
    await sleep(hold);
    Fx.P.ink(B.clone().setY(TOP + 0.1), 14, 0.5, 0.35, 0.7);
    await def.dissolve();
    // 被吃棋子的刻字面碎裂
    if (tgt) { const cc = B.clone(); cc.y = TOP + 0.1; Fx.chunks(cc, d, 0.5, 6, { small: true, lifeK: 0.7, of: tgt }); }
    await Fx.rise(m, B, 0.4);
  }

  // ---------- 兵法：冲锋 / 撤回 / 受创不倒 ----------
  function speedUp(sq, v) {
    if (sq.riders) sq.riders.forEach(h => { h.speed = v; });
    if (sq.m && 'speed' in sq.m) sq.m.speed = v;
    if (sq.horse) sq.horse.speed = v * 0.5;
    if (sq.walking !== undefined && !sq.mounted) sq.walking = v > 0 ? 1.4 : 0;
  }
  async function charge(sq, to) {
    if (!sq.anchor) return;
    const from = sq.anchor.clone(); if (from.distanceTo(to) < 0.05) return;
    if (sq.setPose && sq.troop) sq.setPose('charge');
    speedUp(sq, 1);
    await walkPath(sq, [from, to], Math.max(0.35, from.distanceTo(to) / 2.2));
    speedUp(sq, 0);
  }
  // ---------- 兵法·拒马（美术 M20）----------
  // 守方阵形：二级两人并排、四级三名斩马刀手一字排开（照 lineUp）；三级改成前二后一，后排那人站高一点，矛从前排两人中间伸出去（审批台 art-073 选 A）
  const JM_STACK = [[-0.15, 0.1], [0.15, 0.1], [0, -0.16]];
  function jmForm(sq, on, offPose = 'ready') {
    if (!sq || !sq.troop || sq.t !== 'p') return;
    if (!sq.off0) sq.off0 = sq.offsets.map(o => o.slice());
    const stack = on && !sq.elite && sq.troop.count === 3;
    sq.offsets = (stack ? JM_STACK : sq.off0).map(o => o.slice());
    sq.jm = !!on;
    for (const u of sq.troop.units) if (!u.dead) u.pose = on ? (stack && u.i === 2 ? 'jmHigh' : 'jmLow') : offPose;
  }
  // 攻方撞上矛尖：骑兵头马人立一下，战车的马也扬一扬前蹄，步兵往后一仰
  function jmRecoil(sq) {
    if (sq.troop) sq.troop.units.forEach(u => sq.troop.act(u.i, 'hit', 0.35, Math.random() * 0.08));
    if (sq.crew) sq.crew.units.forEach(u => sq.crew.act(u.i, 'hit', 0.35, Math.random() * 0.08));
    const rear = (h, top) => { if (h && 'rearK' in h) tween(0.42, k => { h.rearK = k < 0.45 ? top * k / 0.45 : top * (1 - 0.7 * (k - 0.45) / 0.55); }); };
    if (sq.riders) { rear(sq.riders[0], 1); sq.riders.slice(1).forEach(h => rear(h, 0.35)); }
    if (sq.m && sq.m.horses) sq.m.horses.forEach((h, i) => rear(h, i ? 0.3 : 0.6));
    else if (sq.m) rear(sq.m, 0.6);
    if (sq.horse) rear(sq.horse, 0.8);
    if (sq.general) rear(sq.general, 1);
    if (sq.riders || (sq.m && sq.m.horses)) Sfx.B.neigh(0.05, 0.08, 'a');
  }
  // 面朝守方倒退：只挪位置不转身，步子放慢
  async function backOff(sq, to) {
    if (!sq.anchor) return;
    const from = sq.anchor.clone(), L = from.distanceTo(to); if (L < 0.05) return;
    if (sq.troop) { sq.follow = true; sq.setPose('stagger'); }
    if (sq.riders) sq.riders.forEach(h => { h.speed = 0.35; });
    if (sq.m && 'speed' in sq.m) sq.m.speed = 0.3;
    if (sq.horse) sq.horse.speed = 0.25;
    if (sq.general) sq.general.speed = 0.3;
    await tween(Math.max(0.45, Math.min(0.75, L / 1.6)), k => { sq.anchor.lerpVectors(from, to, k); }, ease.inOut);
    speedUp(sq, 0);
    if (sq.troop) sq.setPose('ready');
  }
  // 攻方脚下临时的血圈（演出时棋子收起来了，借它的样子）：撞上那一下少一段
  function hpRing(sq, hp) {
    if (!sq.anchor || !hp || !Board.footRing || hp[1] < 2) return null;
    let [n, max] = hp, g = Board.footRing(n, max, sq.side), k = 0, want = 1;
    const root = new THREE.Group(); root.add(g); root.scale.setScalar(0.001); scene.add(root);
    const off = onFrame(dt => {
      k += (want - k) * Math.min(1, dt * 10);
      root.position.set(sq.anchor.x, TOP + 0.002, sq.anchor.z); root.scale.setScalar(Math.max(0.001, k));
      if (!want && k < 0.02) { off(); scene.remove(root); }
    });
    return {
      hit() { root.remove(g); g = Board.footRing(Math.max(0, --n), max, sq.side); root.add(g); Fx.ring(sq.anchor.clone().setY(TOP + 0.02), 1.3, 0.4, 0x9e2418, 0.8); },
      done() { want = 0; },
    };
  }
  // 在某个三维位置上方飘一个字（掉血的「−1」）：跟着那个位置走（镜头在动、人在退）
  function popAt(get, text, cls = 'jmMinus', life = 1.6) {
    const el = document.createElement('div'); el.className = cls; el.textContent = text;
    const place = () => {
      const v = get().project(Core.camera), r = Core.renderer.domElement.getBoundingClientRect();
      el.style.left = (r.left + (v.x + 1) / 2 * r.width) + 'px'; el.style.top = (r.top + (1 - v.y) / 2 * r.height) + 'px'; el.style.display = v.z > 1 ? 'none' : '';
    };
    try { place(); document.body.appendChild(el); } catch (e) { return; }
    let t = 0;
    const off = onFrame(dt => { t += dt; try { place(); } catch (e) { } if (t > life) { off(); el.remove(); } });
  }
  async function retreat(sq, A) {
    if (!sq.anchor || sq.mode === 'battery') return;
    const from = sq.anchor.clone(); if (from.distanceTo(A) < 0.05) return;
    if (sq.troop) { sq.follow = true; sq.setPose('march'); }
    speedUp(sq, 0.8);
    await walkPath(sq, [from, A], Math.min(1.3, 0.35 + from.distanceTo(A) / 2.2));
    speedUp(sq, 0);
    if (sq.troop) sq.setPose('idle');
  }
  function hurtSquad(sq, hit, dir, power = 1, center) {
    const c = sq.center(0.3);
    if (sq.troop) {
      const alive = sq.alive(), n = Math.max(1, Math.round(alive.length / 3));
      alive.slice(0, n).forEach(u => killUnit(sq.troop, u.i, hit === 'bolts' ? 'bolts' : hit === 'blast' ? 'blast' : 'stab', dir, power * 0.8, center || c));
      alive.slice(n).forEach(u => sq.troop.act(u.i, 'hit', 0.35, Math.random() * 0.2));
      setTimeout(() => { if (!sq.dead && sq.setPose) sq.setPose('brace'); }, 500);
      return sleep(0.7);
    }
    // 战车、骑兵、战象、炮：受创不倒，被打得后退半步
    P.blood(c, 14, 0.8, dir); P.sparks(c, 12); Cam.shake(0.14);
    if (hit === 'blast') { P.fire(c, 14, 0.6); P.smoke(c, 6, 0.6); }
    const a0 = sq.anchor.clone();
    return tween(0.45, k => { sq.anchor.copy(a0).addScaledVector(dir, Math.sin(k * Math.PI) * 0.18); });
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

  // ======================================================================
  //  模型模式（设置 →「直接显示模型」）：棋盘上不摆棋子，每枚子换成它的兵种模型站在格子上，待机时微微起伏。
  //  做法：棋子（圆饼）照常存在、照常被各种演出移动 / 隐藏，只是不画出来；模型每帧跟着它的棋子走。
  //  常规 / 揭棋按原编制出模型，兵法按等级出（几级几个人，四级换装）；揭棋的暗子还没翻开，仍然是扣着的棋子
  // ======================================================================
  const Stand = (() => {
    let on = false, acc = 0, t = 0;
    const map = new Map();   // 棋子 mesh → { sq, key, k, ph }
    const faceYaw = s => yawOf(new V3(0, 0, s === 'r' ? -1 : 1));
    const FLAG_S = 0.15, RING_D = 0.62;
    const ringGeo = new THREE.PlaneGeometry(1, 1); ringGeo.rotateX(-Math.PI / 2); ringGeo.userData.keep = true;
    const ringTex = Core.canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      const gr = g.createRadialGradient(c, c, w * 0.2, c, c, w * 0.5); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.62, 'rgba(255,255,255,.2)'); gr.addColorStop(0.8, 'rgba(255,255,255,.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.beginPath(); g.arc(c, c, w * 0.4, 0, 7); g.stroke();
    });
    // 领头的那个兵（或那匹马、那辆车、那头象）：旗杆从他背后腰间伸出来。h = 旗杆根部离地高度，back = 往身后挪多少
    function leader(sq) {
      if (sq.troop) { const u = sq.troop.units.find(x => !x.dead) || sq.troop.units[0]; return { p: u.p, yaw: u.yaw, h: 0.95 * sq.troop.scale, back: 0.035 }; }
      if (sq.riders) { const h = sq.riders[0].group; return { p: h.position, yaw: sq.yaw, h: 0.3, back: 0.05 }; }
      if (sq.crew) { const u = sq.crew.units[0]; return { p: u.p, yaw: u.yaw, h: 0.95 * sq.crew.scale, back: 0.035 }; }
      const g = sq.m ? sq.m.group : sq.group, el = sq instanceof Elephant, tg = sq instanceof TigerRider;
      return { p: g.position, yaw: sq.yaw, h: el ? 0.42 : tg ? 0.36 : 0.24, back: el ? 0.12 : tg ? 0.24 : 0.02 };
    }
    const vis = (st, k) => { st.sq.setVis(k); if (st.sq.guard) st.sq.guard.setVis(k); };
    function drop(m) {
      const st = map.get(m); if (!st) return;
      map.delete(m);
      if (m.parent) showDisc(m, true);
      try { if (st.sq.flags) for (const f of st.sq.flags) scene.remove(f.group); if (st.sq.guard) st.sq.guard.dispose(); st.sq.dispose(); } catch (e) { }
      if (st.flag) scene.remove(st.flag.group);
      if (st.ring) { scene.remove(st.ring); st.ring.material.dispose(); }
    }
    function showDisc(m, show) {
      const [body, face, band] = m.children;
      if (body) body.visible = show; if (face) face.visible = show;
      if (band) band.visible = show && !m.userData.skinned;
      const d = m.userData.deco; if (d) for (const c of d.children) if (c.userData.skin) c.visible = show;
    }
    function reconcile() {
      const g = Board.lastGame, lvOf = new Map(), jmOf = new Set();
      if (g && g.bf) for (const row of g.board) for (const p of row) if (p) { lvOf.set(p.id, p.lv || 1); if (p.t === 'p' && g.jmActive && g.jmActive(p)) jmOf.add(p.id); }
      for (const m of [...map.keys()]) if (!m.parent || Board.pieces.get(m.userData.id) !== m) drop(m);
      for (const m of Board.pieces.values()) {
        const u = m.userData;
        if (u.h || !u.t || u.t === 'h') { drop(m); continue; }
        const lv = g && g.bf ? lvOf.get(u.id) || 1 : 0, key = u.s + u.t + lv + (u.t === 'k' && finalMode ? 'F' : '');
        const st = map.get(m);
        if (st && st.key === key) { if (!!st.sq.jm !== jmOf.has(u.id)) jmForm(st.sq, jmOf.has(u.id), 'idle'); continue; }   // 拒马生效期间这一队一直摆拒马阵
        drop(m);
        noRankFlag = true;
        let sq; try { sq = make(u.t, u.s, new V3(m.position.x, TOP, m.position.z), faceYaw(u.s), 'move', lv || 1, lv); } finally { noRankFlag = false; }
        const ns = { sq, key, k: 0, ph: Math.random() * 6.28 }; vis(ns, 0.001);
        if (sq.setPose && sq.troop) sq.setPose('idle');
        if (jmOf.has(u.id)) jmForm(sq, true);
        if (sq.crew) sq.crew.setPose('idle');           // 炮手：站定，不再原地踏步
        if (sq.horse && !sq.mounted) sq.horse.speed = 0;
        // 一面写着棋子字的旗：由领头的背在身后（帅将的旗由随从擎着，只留「帥 / 將」一面）
        if (u.t === 'k') { if (sq.flags && sq.flags.length > 1) { scene.remove(sq.flags[0].group); sq.flags = [sq.flags[1]]; } }
        else { ns.flag = Models.makeBanner(u.s, XQ.NAMES[u.s][u.t]); ns.flag.group.scale.setScalar(0.001); scene.add(ns.flag.group); }
        // 脚下的小圈：汉红、楚黑，半透明、一呼一吸，方便看清这枚子站在哪个点上
        ns.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, color: u.s === 'r' ? 0xc8281a : 0x141210, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -14, polygonOffsetUnits: -14 }));
        ns.ring.renderOrder = 4;   // 永远压在血迹、焦土这些地面痕迹上面
        scene.add(ns.ring);
        map.set(m, ns);
      }
    }
    onFrame((dt, raw) => {
      if (!on) return;
      const rdt = raw == null ? dt : raw;
      t += rdt; acc += rdt;
      if (acc > 0.25) { acc = 0; reconcile(); }
      const ending = typeof Ending !== 'undefined' && Ending.running;   // 结算演出时让位：模型收起，棋子照常
      for (const [m, st] of map) {
        showDisc(m, ending);
        const want = !ending && m.parent && m.visible && m.scale.y > 0.6 ? 1 : 0;
        if (st.k !== want) { st.k += Math.sign(want - st.k) * Math.min(Math.abs(want - st.k), rdt * (want ? 4 : 9)); vis(st, st.k); }
        const sq = st.sq;
        sq.anchor.x = m.position.x; sq.anchor.z = m.position.z;
        if (sq.guard) { sq.guard.anchor.x = m.position.x; sq.guard.anchor.z = m.position.z; }
        // 待机：整队一呼一吸地轻微起伏；被选中悬起时跟着棋子抬高
        const dy = Math.max(0, m.position.y - TOP), lift = dy < 0.3 ? dy * 0.55 : dy - 0.135, br = 1 + 0.014 * Math.sin(t * 1.7 + st.ph);
        for (const grp of sq.guard ? [sq.group, sq.guard.group] : [sq.group]) { grp.position.y = lift; grp.scale.y = br; }
        if (st.flag) {
          const L = leader(sq), f = st.flag.group;
          f.position.copy(L.p).addScaledVector(fwd(L.yaw), -L.back); f.position.y = L.p.y + L.h + lift;
          f.rotation.set(0, Board.viewSide === 'b' ? Math.PI : 0, 0); f.rotation.z = -0.1;
          f.scale.setScalar(Math.max(0.001, FLAG_S * st.k)); st.flag.update(rdt);
        }
        const b = 0.5 + 0.5 * Math.sin(t * 2.2 + st.ph), rs = RING_D * (0.94 + 0.08 * b);
        st.ring.position.set(m.position.x, TOP + 0.012, m.position.z); st.ring.scale.set(rs, 1, rs);
        st.ring.material.opacity = st.k * (m.userData.s === 'r' ? 0.42 + 0.28 * b : 0.5 + 0.3 * b);
      }
    });
    return {
      get on() { return on; },
      sq(m) { const st = map.get(m); return st ? st.sq : null; },
      // 立刻收起 / 立刻立好某枚子的那一队（演出队伍接手、交还时用，不带渐变）
      hide(m) { if (!m) return; m.visible = false; const st = map.get(m); if (st) { st.k = 0; vis(st, 0.001); if (st.flag) st.flag.group.scale.setScalar(0.001); st.ring.material.opacity = 0; } },
      snap(m) {
        if (!on || !m) return; reconcile();
        const st = map.get(m); if (!st) return;
        st.k = 1; vis(st, 1);
        const sq = st.sq; sq.anchor.x = m.position.x; sq.anchor.z = m.position.z; if (sq.guard) { sq.guard.anchor.x = m.position.x; sq.guard.anchor.z = m.position.z; }
        if (sq.sync) sq.sync();
        // 步兵、禁卫这类一队人，每个人是“慢慢跟上”自己的位置的：棋子挪走的这段时间他们还留在出发的那一格。
        //   不在这里一步摆到位，演出队伍交还的那一瞬间，立着的这一队会先在老地方现身、再滑过来——看着像走到位以后又往回抖了一下
        for (const q of [sq, sq.guard]) if (q && q.place) { q.yaw = sq.yaw; q.place(1); }
      },
      set(v) {
        v = !!v; if (v === on) return; on = v;
        if (on) reconcile();
        else { for (const m of [...map.keys()]) { showDisc(m, true); drop(m); } for (const m of Board.pieces.values()) showDisc(m, true); }
      },
      reconcile, get count() { return map.size; },
    };
  })();

  return { get finalMode() { return finalMode; }, set finalMode(v) { finalMode = !!v; }, Stand, move, capture, pieceBoat, heroDefeat, make, jmForm, standYaw, charge, retreat, hurtSquad, yawOf, knightCorner, Shade, Infantry, Guards, Crossbow, TigerRider, Elephant, Chariot, Cavalry, Cannon, General, killUnit, walkPath, turnTo, TroopSquad };
})();
