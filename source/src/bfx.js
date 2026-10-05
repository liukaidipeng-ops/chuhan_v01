// ===== 兵法模式的演出：按规则引擎给出的事件，逐段播放走子、攻击、技能、兵法 =====
const BFX = (() => {
  const { tween, sleep, ease, Cam, scene } = Core;
  const V3 = THREE.Vector3;
  const TOP = Board.TOP;
  const { P } = Fx;
  const R = (a, b) => a + Math.random() * (b - a);
  const cine = () => Fx.level === 'cine';

  // 由一串事件推出局面（只需 move / kill / hit / swap / revive）
  function simBoard(board, evs) {
    const b = board.map(row => row.map(p => (p ? { ...p } : null)));
    for (const e of evs) {
      if (e.e === 'kill') b[e.at[1]][e.at[0]] = null;
      else if (e.e === 'move') { b[e.to[1]][e.to[0]] = b[e.from[1]][e.from[0]]; b[e.from[1]][e.from[0]] = null; }
      else if (e.e === 'hit') { const p = b[e.at[1]][e.at[0]]; if (p) p.hp = e.hp; }
      else if (e.e === 'swap') { const x = b[e.pa[1]][e.pa[0]]; b[e.pa[1]][e.pa[0]] = b[e.pb[1]][e.pb[0]]; b[e.pb[1]][e.pb[0]] = x; }
      else if (e.e === 'revive') b[e.at[1]][e.at[0]] = { s: 'r', t: e.t, id: e.id, lv: e.lv || 1, hp: BF.hpOf(e.t, e.lv || 1) };   // 试行规则里召回可能回来二级
    }
    return b;
  }
  const moveInfo = (piece, from, to, captured, mover, mt) => ({
    from: from.slice(), to: to.slice(), piece: { ...piece }, captured: captured ? { ...captured } : null, mover,
    crossesRiver: (from[1] <= 4) !== (to[1] <= 4), mt: mt || piece.t, check: false, result: null, dt: captured ? captured.t : null,
  });

  // 甲片碎裂飞出
  function shatter(at, n = 1, dir) {
    const p = Board.pos(at[0], at[1]).setY(TOP + Board.PH * 0.6);
    for (let i = 0; i < n * 3; i++) {
      const o = new THREE.Mesh(Board.plateGeo, Board.plateOn);
      o.position.copy(p).add(new V3(R(-0.2, 0.2), 0, R(-0.2, 0.2))); o.scale.setScalar(R(0.4, 0.8));
      Fx.throwObj(o, new V3(R(-1.2, 1.2), R(1.6, 2.8), R(-1.2, 1.2)).addScaledVector(dir || new V3(), 0.8), { life: R(0.6, 1.1) });
    }
    P.sparks(p, 10, 0.8); Sfx.B.plate(0, 0.35); Sfx.B.clang(0.03, 0.25);
  }
  // 被技能波及：中招的子闪一下、甲片碎裂；阵亡的子化墨炸开
  //   完整镜头 / 精简特效下，阵亡一律换成那队兵的模型来演（倒地、流血、断肢）；只有低特效才是棋子本身碎掉
  async function splashHits(evs, side, hit) {
    for (const e of evs) {
      const m = Board.pieces.get(e.id);
      const c = Board.pos(e.at[0], e.at[1]).setY(TOP + 0.2);
      if (e.e === 'hit') { shatter(e.at, 1); P.ink(c, 6, 0.35, 0.25, 0.6); if (m) tween(0.25, k => { m.position.y = TOP + Math.sin(k * Math.PI) * 0.12; }); }
      else if (e.e === 'kill' && modelKill(e)) { blowAway(e, c.clone().add(new V3(0, 0, side === 'r' ? 0.6 : -0.6)), 1, false, hit); Cam.shake(0.1); }
      else if (e.e === 'kill') {
        P.ink(c, 14, 0.5, 0.35); P.blood(c, 10, 0.7); Fx.chunks(c, new V3(0, 0, side === 'r' ? -1 : 1), 0.8, 8, { of: m });
        if (m) { Fx.flyFace(m, c, new V3(0, 0, 0), 0.6, false); Fx.removePiece(m); }
        Sfx.B.crack(0); Cam.shake(0.1);
      }
      await sleep(0.12);
    }
  }
  // 电影档：镜头推到某一格前方（沿当前视角方向）
  function shotAt(at, dist = 3.2, h = 2.2, dur = 0.7) {
    if (!cine()) return Promise.resolve();
    const c = Board.pos(at[0], at[1]), hd = Cam.homeDir();
    document.body.classList.add('cine');
    return Cam.to(c.clone().addScaledVector(hd, dist).add(new V3(0.6, h, 0)), c.clone().add(new V3(0, 0.3, 0)), dur);
  }
  // 击杀后在倒下的位置飘出“+N 功”（下面一行“甲 +1”：出手的子攒一片甲）
  function gainPops(ev) {
    const kills = ev.filter(e => e.e === 'kill' && e.gain);
    kills.forEach((e, i) => setTimeout(() => {
      const p = Board.pos(e.at[0], e.at[1]).setY(TOP + 0.5).project(Core.camera);
      if (p.z > 1) return;
      const x = (p.x + 1) / 2 * innerWidth, y = (1 - p.y) / 2 * innerHeight;
      const d = document.createElement('div'); d.className = 'gainpop ' + (e.s === 'r' ? 'b' : 'r');
      d.innerHTML = `+${e.gain} 功` + (e.by != null && ev.some(x => x.e === 'xp' && x.id === e.by) ? '<small>甲 +1</small>' : '');
      d.style.left = x + 'px'; d.style.top = y + 'px';
      document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
    }, i * 160));
  }
  // 楚战象被动践踏：落子后跺地，四周溅伤
  // 场边全被震倒：两边军营里的兵、观战席上的人
  function crowdDown(c) { try { Camp.quake(c); } catch (e) { } try { Spect.quake(c); } catch (e) { } }
  // 碎石：从震源往四周崩出去
  const rockGeo = new THREE.DodecahedronGeometry(0.06); rockGeo.userData.keep = true;
  function rubble(c, n = 16, r = 1, power = 1) {
    for (let i = 0; i < (Core.quality === 'low' ? Math.ceil(n / 2) : n); i++) {
      const a = Math.random() * 6.28, o = new THREE.Mesh(rockGeo, Core.toon(i % 3 ? 0x6b6257 : 0x8a7f70));
      o.scale.setScalar(R(0.5, 1.7)); o.position.copy(c).add(new V3(Math.cos(a) * r * R(0.2, 0.8), 0.08, Math.sin(a) * r * R(0.2, 0.8)));
      Fx.throwObj(o, new V3(Math.cos(a) * R(1, 3.2) * power, R(2.2, 5.5) * power, Math.sin(a) * R(1, 3.2) * power), { life: R(1.2, 2.2), ink: false });
    }
  }
  // 被震飞 / 炸飞：棋子模式下棋子碎成块飞出去；模型模式下换成那队兵的模型，被掀飞、断肢落地留血
  const modelKill = e => (Squads.Stand.on || Fx.level !== 'low') && e.t && e.t !== 'k';
  function blowAway(e, from, power = 1.4, burnt = false, hit) {
    const m = Board.pieces.get(e.id), c = Board.pos(e.at[0], e.at[1]);
    const dir = c.clone().sub(from).setY(0); if (dir.lengthSq() < 1e-4) dir.set(R(-1, 1), 0, R(-1, 1)); dir.normalize();
    P.blood(c.clone().setY(TOP + 0.25), 16, 0.9, dir, 1.5); P.ink(c.clone().setY(TOP + 0.2), 12, 0.5, 0.35);
    let done = false;
    if (modelKill(e)) {
      try {
        const sq = Squads.make(e.t, e.s, c.clone().setY(TOP), Squads.yawOf(dir.clone().negate()), 'defend', e.lv || 1, e.lv || 0);
        sq.setVis(1); if (sq.guard) sq.guard.setVis(1);
        Promise.resolve(sq.die(hit || (burnt ? 'blast' : 'crush'), dir, power * 1.5, c.clone().addScaledVector(dir, -0.35))).then(() => sleep(2.2)).then(() => { try { sq.dispose(); } catch (err) { } });
        done = true;
      } catch (err) { console.error(err); }
    }
    if (!done) { Fx.chunks(c.clone().setY(TOP + 0.15), dir, power * 1.7, 18, { of: m, burnt }); if (m) Fx.flyFace(m, c.clone().setY(TOP + 0.1), dir, power * 1.6, burnt); }
    if (m) Fx.removePiece(m);
    Sfx.B.crack(0); 
  }
  // 楚战象「践踏」：一跺地，周围一圈烟尘冲天、碎石乱飞；被踩死的整队掀飞，场边的人全被震倒
  async function trampleFx(ev, side, act = {}) {
    const sp = ev.find(e => e.e === 'splash' && e.how === 'jianta');
    if (!sp) return;
    const c = Board.pos(sp.at[0], sp.at[1]), G = c.clone().setY(TOP + 0.02);
    // 技能动画：战象就在打完的那一格，长嘶、高举前脚、用力跺下（不另外再走一趟）
    const m = act.m && act.m.parent ? act.m : null;
    let el = act.att && act.att.m && 'rearK' in act.att.m ? act.att.m : null;      // 演出里的战象模型
    if (!el && m && Squads.Stand.on) { const sq = Squads.Stand.sq(m); if (sq && sq.m && 'rearK' in sq.m) el = sq.m; }   // 模型模式下立在棋盘上的战象
    labelPop(sp.at, '践踏', side);
    try { Sfx.unit('ele').trumpet(); } catch (e) { }
    const sg = side === 'r' ? 1 : -1, y0 = m ? m.position.y : TOP;
    const rear = k => {
      if (el) { el.rearK = k; el.trumpetK = k; }
      else if (m) { m.rotation.x = -0.5 * k * sg; m.position.y = y0 + 0.4 * k; }
    };
    await tween(0.38, rear, ease.out);
    await sleep(0.16);
    await tween(0.12, k => rear(1 - k), ease.in);
    rear(0); if (el) el.trumpetK = 0;
    Sfx.unit('ele').stomp(); Sfx.B.boom(0, 0.7); Sfx.B.taiko(0, 1, 0.6); Sfx.B.thud(0.05, 1);
    Cam.shake(0.6); Fx.slowmo(0.25, 0.25);
    ring(sp.at, 0x5a4a38, 3.4); Fx.ring(G, 5.2, 1.0, 0x8b7e68, 0.7); Fx.ring(G, 2.2, 0.5, 0x3a2f24, 0.9);
    Fx.Marks.crack(c.clone().setY(TOP), 2.6);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * 6.28, rr = R(0.7, 1.5), q = c.clone().add(new V3(Math.cos(a) * rr, TOP, Math.sin(a) * rr)), out = new V3(Math.cos(a), 0, Math.sin(a));
      setTimeout(() => { P.plume(q, out.clone().negate(), R(0.45, 0.7), 2); P.dust(q, 3, out.clone().negate(), R(0.4, 0.6)); if (i % 3 === 0) P.smoke(q.clone().setY(TOP + 0.1), 2, 0.9, 0x8b7e68); }, (rr - 0.7) * 160);
    }
    P.dust(c, 24, null, 0.6);
    rubble(c.clone().setY(TOP), 22, 1.2, 1.1);
    crowdDown(c);
    const hs = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.how === 'jianta');
    await sleep(0.12);
    for (const e of hs.filter(x => x.e === 'kill')) blowAway(e, c, 1.5);
    const hits = hs.filter(x => x.e === 'hit');
    if (hits.length) await splashHits(hits, side); else await sleep(0.35);
    await sleep(0.3);
  }
  const notTrample = e => e.how !== 'jianta';
  // 带践踏的一步：打到目标的那一刻就地跺脚、结算四周，然后才（没打死的话）退回去——整个是一次行动
  async function strikeT(board, from, to, ev, side, opts = {}) {
    const P0 = board[from[1]][from[0]], has = ev.some(e => e.e === 'splash' && e.how === 'jianta');
    if (!has || !P0) { await strike(board, from, to, ev.filter(notTrample), side, opts); return; }
    let done = false;
    const m = Board.pieces.get(P0.id);
    await strike(board, from, to, ev.filter(notTrample), side, { ...opts, onImpact: async x => { if (done) return; done = true; await trampleFx(ev, side, { m, att: x && x.att }); } });
    if (!done) await trampleFx(ev, side, { m });
  }
  // 霹雳：一开炮就齐射——目标和前后左右四格同时落弹（每格两三发），格子上有没有子都炸，留下焦土
  async function barrage(from, to, side) {
    const A = Board.pos(from[0], from[1]).setY(TOP + 0.45);
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([df, dr]) => [to[0] + df, to[1] + dr]).filter(([f, r]) => f >= 0 && f <= 8 && r >= 0 && r <= 9);
    // 三轮急速齐射，每轮三发：一发砸正中，两发砸四周（三轮下来四周每格都挨到）
    const shells = [];
    for (let v = 0; v < 3; v++) { shells.push({ at: to, v, big: true, last: v === 2 }); for (let j = 0; j < 2; j++) shells.push({ at: nb.length ? nb[(v * 2 + j) % nb.length] : to, v }); }
    const hit = new Set();
    let quaked = false;
    const volley = v => {
      Sfx.B.boom(0, 0.8); Sfx.B.boom(0.05, 0.6); Sfx.B.boom(0.1, 0.7); Cam.shake(0.22);
      Fx.glow(A.clone().add(new V3(0, 0.3, 0)), 2.4, 0.3, 0.5);
      Fx.flash(A, 70, 0.3, 0.18); for (let i = 0; i < 3; i++) P.fire(A.clone().add(new V3(R(-0.2, 0.2), 0.1, R(-0.2, 0.2))), 12, 0.55);
      P.smoke(A, 8, 0.9);
      return Promise.all(shells.filter(sh => sh.v === v).map((sh, i) => sleep(i * 0.05).then(async () => {
        const tp = Board.pos(sh.at[0], sh.at[1]).add(new V3(R(-0.2, 0.2), 0, R(-0.2, 0.2))).setY(TOP + 0.05);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), Core.toon(0x1c1a18));
        scene.add(ball);
        const p0 = A.clone().add(new V3(R(-0.2, 0.2), 0, R(-0.2, 0.2))), peak = 1.2 + A.distanceTo(tp) * 0.2, T = 0.36 + A.distanceTo(tp) * 0.03;
        const halo = Fx.glow(p0, 0.55, T + 0.05, 0.45, 0xff9a4a, 0.25);
        await tween(T, k => {
          ball.position.lerpVectors(p0, tp, k); ball.position.y = p0.y + (tp.y - p0.y) * k + peak * 4 * k * (1 - k);
          if (halo) halo.sp.position.copy(ball.position);
          Fx.spawn({ pos: ball.position.clone(), tex: Core.Tex.spark, add: true, color: 0xff8a3a, size: 0.24, size2: 0.05, life: 0.28, op: 0.9 });
          Fx.spawn({ pos: ball.position.clone(), color: 0x3d3a37, size: 0.1, size2: 0.34, life: 0.6, op: 0.3, drag: 1 });
        }, ease.linear);
        if (halo) halo.life = 0;
        scene.remove(ball); ball.geometry.dispose();
        const key = sh.at.join(), first = !hit.has(key); hit.add(key);
        const big = sh.big, fin = sh.last, c = Board.pos(sh.at[0], sh.at[1]).setY(TOP + 0.05);
        // 着弹：火球、浓烟、碎石、冲击环
        Fx.glow(tp.clone().add(new V3(0, 0.3, 0)), fin ? 5 : big ? 3.6 : 2.4, fin ? 0.6 : 0.4, fin ? 0.6 : 0.45);
        Fx.flash(tp, fin ? 160 : big ? 110 : 70, fin ? 0.9 : 0.5, fin ? 0.5 : big ? 0.22 : 0);
        P.fire(tp.clone().add(new V3(0, 0.12, 0)), fin ? 54 : big ? 34 : 22, fin ? 1.4 : big ? 1.05 : 0.8);
        P.smoke(tp, fin ? 16 : 8, fin ? 1.2 : 0.9); P.sparks(tp, fin ? 34 : 14, 1.3); P.embers(tp, fin ? 16 : 6);
        rubble(tp.clone().setY(TOP), fin ? 16 : 6, 0.5, fin ? 1.2 : 0.9);
        Fx.ring(tp, fin ? 4.2 : big ? 3 : 2.1, 0.7, 0x5a4a38, 0.85);
        if (first || fin) { Fx.Marks.scorch(c, fin ? 1.9 : R(1.0, 1.4)); Fx.addSmoke(c, fin ? 1 : 0.5); }
        Sfx.B.boom(0, fin ? 1 : big ? 0.8 : 0.55); Cam.shake(fin ? 0.55 : big ? 0.32 : 0.2);
        if (!quaked) { quaked = true; crowdDown(Board.pos(to[0], to[1])); }
        if (fin) Fx.slowmo(0.3, 0.2);
      })));
    };
    for (let v = 0; v < 3; v++) { const p = volley(v); if (v < 2) await sleep(0.26); else await p; }
    await sleep(0.1);
  }
  // 小字提示（被动技能触发等）：在棋子上方飘一下
  function labelPop(at, text, side) {
    const p = Board.pos(at[0], at[1]).setY(TOP + 0.6).project(Core.camera);
    if (p.z > 1) return;
    const d = document.createElement('div'); d.className = 'gainpop lbl ' + (side === 'r' ? 'r' : 'b');
    d.textContent = text; d.style.left = (p.x + 1) / 2 * innerWidth + 'px'; d.style.top = (1 - p.y) / 2 * innerHeight + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
  }
  // 晋升题签：升级时在棋子上方亮出新的称号（四级更隆重）
  function rankPop(at, name, side, lv, max, sub) {
    const p = Board.pos(at[0], at[1]).setY(TOP + 0.75).project(Core.camera);
    if (p.z > 1 || !name) return;
    const d = document.createElement('div'); d.className = 'rankpop ' + (side === 'r' ? 'r' : 'b') + (lv >= max ? ' top' : '');
    d.innerHTML = `<small>${sub || (lv >= max ? '登峰' : '晋升')}</small><b>${name}</b>`;
    d.style.left = Math.min(innerWidth - 90, Math.max(90, (p.x + 1) / 2 * innerWidth)) + 'px'; d.style.top = Math.max(70, (1 - p.y) / 2 * innerHeight) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
  }
  // 主流程挂进来的回调（气泡台词等）
  const hooks = { bubble: null };
  const speak = (side, text, ms, who) => { try { hooks.bubble && hooks.bubble(side, text, ms, who); } catch (e) { } };
  // 念一句台词：有配音等配音念完（最长 max 秒），没有配音也至少停 min 秒让人看清气泡
  const line = (id, min, max) => Promise.all([Promise.race([say(id), sleep(max)]), sleep(min)]);
  function say(id) { try { if (Voice.has(id)) return Voice.play(id); } catch (e) { } return Promise.resolve(); }
  function ring(at, color = 0x5a4a38, size = 2.4) { Fx.ring(Board.pos(at[0], at[1]).setY(TOP + 0.02), size, 0.7, color, 0.8); }
  // 屏幕正中的兵法题字（复用开局的行楷横幅）
  function title(t, s, ms = 2400) {
    const b = document.getElementById('banner');
    document.getElementById('bannerT').textContent = t; document.getElementById('bannerS').textContent = s || '';
    b.classList.add('on', 'lite'); clearTimeout(title.t); title.t = setTimeout(() => { b.classList.remove('on'); setTimeout(() => { if (!b.classList.contains('on')) b.classList.remove('lite'); }, 900); }, ms);
  }

  // 一次“走到敌子格”的演出：普通走子 / 吃子 / 攻击未下 / 拒马反伤
  async function strike(board, from, to, evs, mover, opts = {}) {
    const P0 = board[from[1]][from[0]], T0 = board[to[1]][to[0]];
    if (!P0) return;
    const counter = evs.find(e => e.e === 'counter' && e.id === P0.id);
    const died = counter && evs.some(e => e.e === 'kill' && e.id === P0.id);
    const tKill = T0 && evs.some(e => e.e === 'kill' && e.id === T0.id);
    const tHit = T0 && evs.find(e => e.e === 'hit' && e.id === T0.id);
    const info = moveInfo(P0, from, to, T0, mover, opts.mt);
    info.check = !!opts.check; info.result = opts.result || null; info.streak = opts.streak || 1; info.mateName = opts.mateName || '';
    const c = { lv: P0.lv, dlv: T0 ? T0.lv : 1 };
    if (opts.onImpact) c.onImpact = opts.onImpact;
    if (T0) { c.survive = !!tHit && !tKill; c.killed = !!tKill; c.counter = died ? 'die' : counter ? 'hurt' : null; c.ranged = !!opts.ranged; }
    await Fx.playMove(info, { c, noCamp: opts.noCamp });
    if (tHit) shatter(to, 1);
  }

  async function play(info, game) {
    const ev = info.ev || [], side = info.side;
    const before = info.before ? info.before.board : null;
    try {
      if (info.k === 'up') await levelUp(info);
      else if (info.k === 'mv') {
        if (info.extra && info.extra.via) labelPop(info.from, BF.SKILL_CN[info.extra.via], side);
        if (info.extra && info.extra.via === 'shensu') {
          // 被动「神速营」：疾奔越子，落到空位（不走普通的行军演出）
          await dash(before[info.from[1]][info.from[0]], info.from, info.to, side);
          if (info.result) await Fx.checkStamp(XQ.other(side), info.result.reason === 'checkmate' ? '殺' : info.result.reason === 'kingdead' ? '斬' : info.result.reason === 'occupy' ? '奪' : '困', info.mateName);
          else if (info.check) Fx.checkStamp(XQ.other(side));
        } else {
          await strikeT(before, info.from, info.to, ev, side, { check: info.check, result: info.result, streak: info.streak, mateName: info.mateName });
        }
      }
      else if (info.k === 'sk') await skill(info, before);
      else if (info.k === 'art') await art(info, before);
      else if (info.k === 'ult') await ult(info);
      else if (info.k === 'pass') { title('停着', game && game.fx && game.fx.sm > 0 && side === 'b' ? '军心涣散，按兵不动' : '无子可走，按兵不动', 1600); await sleep(1.2); }
      gainPops(ev);
    } catch (e) { console.error('兵法演出出错', e); }
    Core.Time.scale = 1;
    document.body.classList.remove('cine');
    Board.reconcile(game);
    // 甲片攒够、当场自动晋升的子：等它落定换好装，再补上晋升的仪式
    try {
      for (const e of ev.filter(x => x.e === 'autoup')) {
        const B = info.after && info.after.board; let at = null;
        if (B) for (let r = 0; r < 10 && !at; r++) for (let f = 0; f < 9; f++) if (B[r][f] && B[r][f].id === e.id) { at = [f, r]; break; }
        if (at) await levelUp({ id: e.id, t: e.t, side: e.s, at, lv: e.lv, nm: e.nm, auto: true });
      }
      // 试行规则：召回后当场花军功升了一级——等它落定，再补上晋升的仪式
      for (const e of ev.filter(x => x.e === 'reviveUp')) { const rv = ev.find(x => x.e === 'revive' && x.id === e.id); if (rv) await levelUp({ id: e.id, t: e.t, side: 'r', at: rv.at, lv: e.lv, nm: e.nm }); }
    } catch (e) { console.error(e); }
    if (info.k !== 'mv' && info.k !== 'up') {
      if (Cam.cine) await Cam.home(0.8);
      if (info.result) await Fx.checkStamp(XQ.other(side), info.result.reason === 'checkmate' ? '殺' : info.result.reason === 'kingdead' ? '斬' : info.result.reason === 'occupy' ? '奪' : '困', info.mateName);
      else if (info.check) Fx.checkStamp(XQ.other(side));
    }
  }

  async function levelUp(info) {
    const m = Board.pieces.get(info.id); if (!m) return;
    const c = m.position.clone(), max = BF.levelInfo(info.t, info.side, 1).maxLv, top = info.lv >= max;
    Sfx.B.bell(0, 880, 0.08); Sfx.B.bell(0.12, 1175, 0.06); Sfx.B.gong(0.05, top ? 0.6 : 0.35); Sfx.B.plate(0.1, 0.3);
    if (top) { Sfx.B.taiko(0.15, 0.7); Sfx.B.taiko(0.38, 0.8); Cam.shake(0.08); }
    Fx.ring(c.clone().setY(TOP + 0.02), top ? 2.3 : 1.6, 0.8, 0xc9a045, 0.9);
    if (top) Fx.ring(c.clone().setY(TOP + 0.03), 3.2, 1.1, 0xffe2a0, 0.6);
    for (let i = 0; i < (top ? 34 : 18); i++) Fx.spawn({ pos: c.clone().add(new V3(R(-0.3, 0.3), 0.1, R(-0.3, 0.3))), vel: new V3(R(-0.2, 0.2), R(1.2, top ? 3 : 2.2), R(-0.2, 0.2)), tex: Core.Tex.spark, add: true, color: 0xffd27a, size: 0.12, size2: 0.03, life: R(0.6, top ? 1.4 : 1), drag: 1.2 });
    // 称号题签要等棋子换好新装（落回棋盘）再亮出来
    const hero = BF.heroName({ s: info.side, t: info.t, nm: info.nm }), rk = BF.rankName(info.side, info.t, info.lv);
    setTimeout(() => rankPop(info.at, hero || rk, info.side, info.lv, max, hero ? rk : info.auto ? '战功晋升' : ''), 200);
    // 四级：名将登场，题字亮名
    if (hero && (cine() || Fx.level === 'std')) { title(hero, (info.side === 'r' ? '汉' : '楚') + ' · ' + rk, 1700); Sfx.B.gong(0.1, 0.8); }
    await tween(0.3, k => { m.position.y = TOP + Math.sin(k * Math.PI) * 0.35; m.rotation.y = (Board.viewSide === 'b' ? Math.PI : 0) + k * Math.PI * 2; }, ease.inOut);
    m.position.y = TOP; m.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;
  }
  // 神速营：疾奔如风，越过中间的子落到空位
  async function dash(P0, at, to, side) {
    const m = P0 && Board.pieces.get(P0.id), A = Board.pos(at[0], at[1]), B = Board.pos(to[0], to[1]);
    Sfx.B.whoosh(0, 0.5, 0.6); Sfx.B.shout(0.05, 4, 0.06, 0.4);
    P.dust(A, 10, null, 0.3);
    if (m) {
      await tween(0.45, k => {
        m.position.lerpVectors(A, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.55;
        if (Math.random() < 0.7) Fx.spawn({ pos: m.position.clone().add(new V3(R(-0.2, 0.2), 0.1, R(-0.2, 0.2))), vel: new V3(0, 0.3, 0), tex: Core.Tex.puff, color: side === 'r' ? 0xd8b070 : 0x9a9488, size: 0.25, size2: 0.6, life: 0.5, op: 0.45, drag: 2 });
      }, ease.inOut);
      m.position.copy(B);
    }
    P.dust(B, 12, null, 0.35); Sfx.B.thud(0, 0.5); Cam.shake(0.12);
    Board.showLast(at, to);
    await sleep(0.2);
  }

  // 飞越 / 踏营：整队腾空一跃，越过挡路的子。落点是空位就直接跃过去砸地；落点有敌子，先跃到半空再扑下去打
  async function leap(m, at, to, before, ev, side, mt, info, onLand, power = 1, onImpact = null) {
    const A = Board.pos(at[0], at[1]), B = Board.pos(to[0], to[1]), d = B.clone().sub(A).setY(0).normalize();
    const T0 = before[to[1]][to[0]], sgn = (side === 'r' ? 1 : -1);
    shotAt(to, 3.6, 2.6, 0.5);
    P.dust(A, 12, d.clone().negate(), 0.35); Cam.shake(0.08);
    if (!m) { await strike(before, at, to, ev, side, { mt, streak: info.streak }); if (onImpact) await onImpact(); return; }
    // 蓄势下沉
    await tween(0.16, k => { m.scale.y = 1 - 0.18 * k; }, ease.out); m.scale.y = 1;
    const trail = () => { if (Math.random() < 0.8) Fx.spawn({ pos: m.position.clone().add(new V3(R(-0.2, 0.2), 0.05, R(-0.2, 0.2))), vel: new V3(0, 0.2, 0), tex: Core.Tex.puff, color: side === 'r' ? 0xd8b070 : 0x9a9488, size: 0.3, size2: 0.7, life: 0.55, op: 0.4, drag: 2 }); };
    if (!T0) {
      await tween(0.62, k => { m.position.lerpVectors(A, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 1.5 * power; m.rotation.x = -0.4 * Math.cos(k * Math.PI) * sgn * Math.sin(k * Math.PI); trail(); }, ease.inOut);
      m.position.copy(B); m.position.y = TOP; m.rotation.x = 0;
      Cam.shake(0.22 * power); Fx.slowmo(0.3, 0.12); ring(to, 0x5a4a38, 2.2 * power); P.dust(B, 18, null, 0.45); Fx.Marks.crack(B.clone().setY(TOP), 1.1 * power); Sfx.B.thud(0, 0.9); Sfx.B.taiko(0, 1, 0.5);
      if (onLand) onLand();
      Board.showLast(at, to);
      await sleep(0.3);
      return;
    }
    // 落点有敌子：一路跃过去砸在它头上，当场结算；没打死就再跳回原位
    const id = m.userData.id, res = info.extra && info.extra.res;
    const counter = ev.find(e => e.e === 'counter' && e.id === id);
    const tEv = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.id !== id && e.at[0] === to[0] && e.at[1] === to[1]);
    const killed = tEv.some(e => e.e === 'kill'), top = killed ? B.clone() : B.clone().addScaledVector(d, -0.3);
    await tween(0.62, k => { m.position.lerpVectors(A, top, k); m.position.y = TOP + Math.sin(k * Math.PI) * 1.5 * power + (killed ? 0 : 0.25 * k); m.rotation.x = -0.4 * Math.cos(k * Math.PI) * sgn * Math.sin(k * Math.PI); trail(); }, ease.inOut);
    m.rotation.x = 0;
    Cam.shake(0.3 * power); Fx.slowmo(0.25, 0.14); ring(to, 0x5a4a38, 2.2 * power); P.dust(B, 18, null, 0.45); P.sparks(B.clone().setY(TOP + 0.25), 12, 1); Fx.Marks.crack(B.clone().setY(TOP), 1.1 * power); Sfx.B.thud(0, 0.9); Sfx.B.taiko(0, 1, 0.5);
    if (onLand) onLand();
    if (counter) { Sfx.B.stab(0, 0.5); P.blood(top.clone().setY(TOP + 0.2), 12, 0.7, d.clone().negate()); }
    const died = ev.find(e => e.e === 'kill' && e.id === id);
    if (tEv.length) await splashHits(tEv, side, 'trample');
    if (died) { await splashHits([died], XQ.other(side), 'stab'); return; }
    if (killed) { m.position.copy(B); m.position.y = TOP; }
    if (onImpact) await onImpact();
    if (!killed) { await sleep(0.12); await tween(0.5, k => { m.position.lerpVectors(top, A, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.7; }, ease.inOut); }
    m.position.copy(killed ? B : A); m.position.y = TOP;
    if (killed) Board.showLast(at, to);
    if (killed && typeof Camp !== 'undefined') Camp.onCapture(side, info.streak || 1);
    await sleep(0.25);
  }
  async function skill(info, before) {
    const ev = info.ev, sk = info.extra.sk, side = info.side, at = info.from, to = info.to;
    const P0 = before[at[1]][at[0]];
    const name = BF.SKILL_CN[sk];
    if (cine() || Fx.level === 'std') title(name, (side === 'r' ? '汉军' : '楚军') + XQ.NAMES[side][P0.t], 1500);
    if (sk === 'juma') {
      const A = Board.pos(at[0], at[1]);
      shotAt(at, 2.4, 1.5);
      const sq = Squads.make('p', side, A, side === 'r' ? 0 : Math.PI, 'defend', P0.lv);
      Fx.sink(Board.pieces.get(P0.id));
      await sq.appear(); if (sq.setPose) sq.setPose('brace');
      for (let i = 0; i < 4; i++) Sfx.B.wood(i * 0.15, 0.4);
      Sfx.B.shout(0.2, 6, 0.08, 0.5);
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; P.dust(A.clone().add(new V3(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5)), 1, null, 0.15); }
      await sleep(1.0);
      await sq.dissolve();
      await Fx.rise(Board.pieces.get(P0.id), A, 0.35);
    } else if (sk === 'chongzhen') {
      // 冲阵：冲到跳板前狠撞一下（跳板挨 1 点），再腾空越过它，落到它身后一格；身后打不死就撞完退回原位
      const m = Board.pieces.get(P0.id), land = info.extra.land || to;
      const A = Board.pos(at[0], at[1]), Q = Board.pos(to[0], to[1]), L = Board.pos(land[0], land[1]);
      const d = Q.clone().sub(A).setY(0).normalize(), pre = Q.clone().addScaledVector(d, -0.62);
      shotAt(to, 3.8, 2.4, 0.5);
      Sfx.unit('chariot').charge(1.6); Sfx.B.hooves(0, 0.9, 3, 0.35);
      if (m) await tween(Math.max(0.35, A.distanceTo(pre) * 0.14), k => { m.position.lerpVectors(A, pre, k); m.position.y = TOP; if (Math.random() < 0.6) P.dust(m.position.clone(), 1, d.clone().negate(), 0.22); }, ease.in);
      const counter = ev.find(e => e.e === 'counter' && e.id === P0.id && e.target[0] === to[0] && e.target[1] === to[1]);
      const qEv = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.at[0] === to[0] && e.at[1] === to[1] && e.id !== P0.id);
      Cam.shake(0.3); Sfx.unit('chariot').impact(); Fx.slowmo(0.22, 0.14);
      P.sparks(Q.clone().setY(TOP + 0.25), 14, 1); P.dust(Q, 10, d.clone().negate(), 0.35); ring(to, 0x5a4a38, 2.0);
      if (counter) { Sfx.B.stab(0, 0.5); P.blood(pre.clone().setY(TOP + 0.2), 12, 0.7, d.clone().negate()); }
      const died = ev.find(e => e.e === 'kill' && e.id === P0.id);
      if (died && counter) { await splashHits([died], XQ.other(side), 'stab'); return; }
      if (qEv.length) await splashHits(qEv, side);
      const res = info.extra.res;
      const lEv = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.at[0] === land[0] && e.at[1] === land[1] && e.id !== P0.id);
      // 腾空越过跳板
      const top = L.clone().addScaledVector(d, -0.2);
      Sfx.B.whoosh(0, 0.4, 0.5);
      if (m) await tween(0.42, k => { m.position.lerpVectors(pre, res === 'hit' ? top : L, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.8; m.rotation.x = Math.sin(k * Math.PI) * -0.25 * Math.sign(d.z || 1); }, ease.inOut);
      if (m) m.rotation.x = 0;
      Cam.shake(0.25); P.dust(L, 14, null, 0.4); Fx.Marks.crack(L.clone().setY(TOP), 1.2); Sfx.B.thud(0, 0.8);
      if (lEv.length) await splashHits(lEv, side);
      if (ev.some(e => e.e === 'kill' && e.id === P0.id)) { const dd = ev.find(e => e.e === 'kill' && e.id === P0.id); await splashHits([dd], XQ.other(side), 'stab'); return; }
      if (res === 'hit' && m) {
        // 打不死：撞完退回原位
        await sleep(0.15);
        await tween(0.55, k => { m.position.lerpVectors(top, A, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.5; }, ease.inOut);
      }
      if (m) { m.position.copy(res === 'hit' ? A : L); m.position.y = TOP; }
      if (ev.some(e => e.e === 'kill' && !e.friendly && e.s !== side) && typeof Camp !== 'undefined') Camp.onCapture(side, info.streak || 1);
      await sleep(0.25);
    } else if (sk === 'taying') {
      const m = Board.pieces.get(P0.id);
      Sfx.B.neigh(0, 0.14, 'a'); Sfx.B.whoosh(0.1, 0.3, 0.4);
      await leap(m, at, to, before, ev, side, 'n', info, () => { Sfx.B.hooves(0, 0.5, 3, 0.4); });
    } else if (sk === 'feiyue') {
      // 飞越：腾身一跃，越过塞住象眼的子落到田字对角
      const m = Board.pieces.get(P0.id), A = Board.pos(at[0], at[1]), B = Board.pos(to[0], to[1]), mid = A.clone().lerp(B, 0.5);
      Sfx.B.whoosh(0, 0.5, 0.5); if (side === 'b') { try { Sfx.unit('ele').trumpet(); } catch (e) { } }
      P.dust(A, 10, null, 0.3);
      await leap(m, at, to, before, ev.filter(notTrample), side, 'e', info, null, 1.25, () => trampleFx(ev, side, { m }));
    } else if (sk === 'pili') {
      // 雷霆炮击：一开炮就齐射覆盖目标和前后左右四格（炸成焦土），落弹之后才结算目标，炮最后再落位
      const T0 = before[to[1]][to[0]], m = Board.pieces.get(P0.id), A = Board.pos(at[0], at[1]), B = Board.pos(to[0], to[1]);
      shotAt(to, 4.6, 3.6, 0.5);
      if (m) { Fx.flash(A.clone().setY(TOP + 0.4), 80, 0.4, 0.3); P.smoke(A.clone().setY(TOP + 0.3), 10, 0.8); Cam.shake(0.2); tween(0.25, k => { m.position.y = TOP + Math.sin(k * Math.PI) * 0.12; }); }
      await barrage(at, to, side);
      const counter = ev.find(e => e.e === 'counter' && e.id === P0.id);
      if (counter && m) { Sfx.B.stab(0, 0.4); P.blood(A.clone().setY(TOP + 0.2), 10, 0.6); shatter(at, 1); }
      const died = ev.find(e => e.e === 'kill' && e.id === P0.id);
      const tEv = ev.filter(e => T0 && e.id === T0.id && (e.e === 'hit' || e.e === 'kill'));
      const sp = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.how === 'pili' && (!T0 || e.id !== T0.id) && e.id !== P0.id);
      // 炸死的：棋子炸碎炸飞（模型模式下是那队兵被掀飞）；没死的照旧掉甲片
      const all = tEv.concat(sp);
      for (const e of all.filter(x => x.e === 'kill')) blowAway(e, B.clone().addScaledVector(A.clone().sub(B).setY(0).normalize(), 0.3), 1.6, true);
      const hurt = all.filter(x => x.e === 'hit');
      if (hurt.length) await splashHits(hurt, side); else await sleep(0.2);
      if (died) { await splashHits([died], XQ.other(side), 'stab'); }
      else if (info.extra.res === 'kill' && m) {
        await sleep(0.2);
        Sfx.unit('cannon').move && Sfx.unit('cannon').move(0.5);
        await tween(0.5, k => { m.position.lerpVectors(A, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.12; }, ease.inOut);
        m.position.copy(B);
      }
      if (tEv.some(e => e.e === 'kill') && typeof Camp !== 'undefined') Camp.onCapture(side, info.streak || 1);
      await sleep(0.3);
    } else if (sk === 'qishe') {
      await strike(before, at, to, ev, side, { ranged: true, streak: info.streak });
    } else if (sk === 'jianta') {
      const T0 = before[to[1]][to[0]];
      const main = ev.filter(e => (T0 && e.id === T0.id) || e.id === P0.id || e.e === 'counter');
      await strike(before, at, to, main, side, { streak: info.streak });
      const landed = ev.some(e => e.e === 'move' && e.id === P0.id);
      if (landed) {
        const c = Board.pos(to[0], to[1]);
        shotAt(to, 3.6, 2.6, 0.4);
        Sfx.unit('ele').stomp(); Cam.shake(0.3); ring(to, 0x5a4a38, 2.8); P.dust(c, 16, null, 0.4); Fx.Marks.crack(c.clone().setY(TOP), 1.6);
        const sp = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.how === 'jianta');
        await splashHits(sp, side);
      }
    } else if (sk === 'hujia') {
      const sw = ev.find(e => e.e === 'swap');
      const ma = Board.pieces.get(sw.a), mb = Board.pieces.get(sw.b);
      const A = Board.pos(sw.pa[0], sw.pa[1]), B = Board.pos(sw.pb[0], sw.pb[1]);
      await shotAt(sw.pb, 3.4, 2.4, 0.6);
      Sfx.B.gong(0, 0.6); Sfx.unit('guard').charge(); Sfx.B.plate(0.2, 0.4);
      P.ink(A.clone().setY(TOP + 0.1), 8, 0.4, 0.3); P.ink(B.clone().setY(TOP + 0.1), 8, 0.4, 0.3);
      await tween(0.7, k => {
        if (ma) { ma.position.lerpVectors(A, B, k); ma.position.y = TOP + Math.sin(k * Math.PI) * 0.7; }
        if (mb) { mb.position.lerpVectors(B, A, k); mb.position.y = TOP + Math.sin(k * Math.PI) * 0.45; }
      }, ease.inOut);
      Sfx.place(); ring(sw.pb, 0xc9a045, 1.6);
      if (info.extra && info.extra.rescue) {
        // 樊哙闯帐：护驾破了鸿门宴——锁链崩断，项羽喝问，张良作答
        title('樊哙闯帐', '汉士护驾 · 鸿门宴破', 3000);
        Sfx.B.gong(0.05, 0.9); Sfx.B.clang(0, 0.5); Sfx.B.clang(0.12, 0.4); Sfx.B.plate(0.2, 0.5); Cam.shake(0.14);
        const kp = A.clone().setY(TOP + 0.15);
        P.sparks(kp, 26, 1.2); P.ink(kp, 12, 0.5, 0.35); shatter(sw.pa, 3);
        Fx.ring(kp.clone().setY(TOP + 0.02), 2.6, 0.9, 0xc9a045, 0.9);
        await sleep(0.9);
        speak('b', '客何为者？', 3000); await line('bf_fk_b', 1.7, 2.6); await sleep(0.25);
        speak('r', '沛公之参乘樊哙者也！', 4200, '张良'); await line('bf_fk_zl', 2.4, 3.6);
        await sleep(0.3);
      }
    }
  }

  // 光柱：一道从天而降的金光（叠加发亮的空心圆柱，上细下粗、由下往上淡出）
  let beamTex = null;
  function beam(pos, color, h = 9, r = 0.5, dur = 2.2) {
    if (!beamTex) beamTex = Core.canvasTex(64, 256, (g, w, hh) => {
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.25})`; g.fillRect(Math.random() * w, 0, 1 + Math.random() * 3, hh); }
    });
    const mk = (rad, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.7, rad, h, 28, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.position.copy(pos); m.position.y = TOP + h / 2; m.renderOrder = 8; m.userData.op = op; scene.add(m); return m; };
    const ms = [mk(r, 0.75), mk(r * 1.9, 0.3)];
    tween(dur, k => { const a = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1; ms.forEach((m, i) => { m.material.opacity = m.userData.op * a; m.rotation.y += (i ? -0.02 : 0.035); const sx = 1 + 0.08 * Math.sin(k * 30 + i); m.scale.set(sx, 1, sx); }); }, ease.linear)
      .then(() => ms.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }));
  }
  // 螺旋上升的光点
  function spiral(pos, color, n = 46, r = 0.5, dur = 1.6) {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const a = i * 0.55, rr = r * (1 - i / n * 0.4);
      Fx.spawn({ pos: pos.clone().add(new V3(Math.cos(a) * rr, 0.1 + i / n * 0.8, Math.sin(a) * rr)), vel: new V3(-Math.sin(a) * 0.8, R(1.6, 3.2), Math.cos(a) * 0.8), tex: Core.Tex.spark, add: true, color, size: 0.16, size2: 0.03, life: R(0.7, 1.3), drag: 0.8 });
    }, i * dur * 1000 / n);
  }
  // 破釜沉舟的位移：出发点到落点先烧出一道火线，棋子（或它的兵）踏着火冲过去
  function blaze(A, B) {
    const n = Math.max(6, Math.round(A.distanceTo(B) * 7));
    for (let i = 0; i <= n; i++) setTimeout(() => {
      const p = A.clone().lerp(B, i / n).setY(TOP + 0.05);
      P.flame(p, 0.34); P.flame(p.clone().add(new V3(R(-0.1, 0.1), 0, R(-0.1, 0.1))), 0.22);
      if (i % 2 === 0) Fx.glow(p.clone().setY(TOP + 0.2), 1.1, 0.5, 0.32, 0xff7a2a);
      if (i % 3 === 0) P.embers(p, 3);
    }, i * 22);
  }
  // 召回良将的落位演出（art() 里用；界面“先落位、再让玩家决定升不升级”时也单独用）。rv = { t, id, at, lv }
  async function reviveDrop(rv) {
    const big = cine() || Fx.level === 'std';
    // 召回良将：金光自天而降，良将踏光归阵
    title('召回良将', '汉王复得良将 · ' + XQ.NAMES.r[rv.t] + '重回阵前', 2600);
    Sfx.B.gong(0, 0.9); Sfx.B.bell(0.1, 660, 0.12); Sfx.B.bell(0.35, 880, 0.1); Sfx.B.bell(0.6, 1175, 0.08);
    const vp = say('bf_art_r');
    const B = Board.pos(rv.at[0], rv.at[1]), G = B.clone().setY(TOP + 0.02);
    if (big) document.body.classList.add('cine');
    shotAt(rv.at, 3.4, 2.4, 0.9);
    // 地上先亮起一圈圈金环，光柱落下
    for (let i = 0; i < 3; i++) setTimeout(() => Fx.ring(G, 1.6 + i * 0.9, 0.9, 0xffd27a, 0.85), i * 220);
    await sleep(0.5);
    beam(B, 0xffd98a, 9, 0.5, 2.6); Fx.flash(B.clone().setY(TOP + 0.6), 70, 1.2, 0.35); Fx.glow(B.clone().setY(TOP + 0.5), 3.2, 1.6, 0.5, 0xffd98a, 0.6);
    spiral(B, 0xffe2a0, 50, 0.55, 1.5); Sfx.B.whoosh(0.1, 0.6, 0.9); Sfx.B.hooves(0.3, 1.2, 1, 0.3);
    await sleep(0.55);
    // 良将自光中降下，落地一震
    const m = Board.makePiece({ s: 'r', t: rv.t, id: rv.id, lv: rv.lv || 1, hp: BF.hpOf(rv.t, rv.lv || 1) });
    m.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;
    Board.piecesRoot.add(m); Board.pieces.set(rv.id, m);
    const top = B.clone().setY(TOP + 4.2), yaw0 = m.rotation.y;
    Fx.slowmo(0.5, 0.5);
    await tween(0.75, k => { m.position.lerpVectors(top, B, k * k); m.rotation.y = yaw0 + (1 - k) * Math.PI * 4; m.scale.setScalar(0.6 + 0.4 * k); if (Math.random() < 0.8) Fx.spawn({ pos: m.position.clone(), vel: new V3(R(-0.3, 0.3), R(0.2, 1), R(-0.3, 0.3)), tex: Core.Tex.spark, add: true, color: 0xffd27a, size: 0.2, size2: 0.04, life: 0.5 }); }, ease.linear);
    m.position.copy(B); m.rotation.y = yaw0; m.scale.set(1, 1, 1);
    Cam.shake(0.36); Sfx.B.taiko(0, 1, 0.7); Sfx.B.gong(0.02, 0.8); Sfx.B.thud(0, 0.9); Sfx.place();
    Fx.ring(G, 3.6, 0.9, 0xffe2a0, 0.95); Fx.ring(G, 2.2, 0.6, 0xc9a045, 0.9); P.dust(B, 18, null, 0.4); P.sparks(B.clone().setY(TOP + 0.3), 26, 1.2);
    Fx.glow(B.clone().setY(TOP + 0.3), 4.2, 0.7, 0.6, 0xffe2a0);
    // 四周的汉军齐声呼应
    for (const x of Board.pieces.values()) if (x !== m && x.userData.s === 'r' && x.position.distanceTo(B) < 2.6) { const y0 = x.position.y; tween(0.35, k => { x.position.y = y0 + Math.sin(k * Math.PI) * 0.16; }); }
    Sfx.B.shout(0.1, 8, 0.1, 0.6);
    await Promise.race([vp, sleep(1.8)]);
    await sleep(0.3);
  }
  // 界面用：只演落位，不改棋局。棋子先摆在棋盘上（记在 Board.pieces 里），等玩家点「升级」或「结束回合」再真正提交；
  //   提交时 art() 看到 info.landed 就不再演一遍。玩家改主意则由 Board.reconcile 把它收走
  async function reviveShow(rv) {
    try { await reviveDrop(rv); } catch (e) { console.error('召回演出出错', e); }
    Core.Time.scale = 1; document.body.classList.remove('cine');
    try { if (Cam.cine) await Cam.home(0.8); } catch (e) { }
  }
  async function art(info, before) {
    const side = info.side, ev = info.ev;
    const big = cine() || Fx.level === 'std';
    if (side === 'r') {
      const rv = ev.find(e => e.e === 'revive');
      if (info.landed && Board.pieces.has(rv.id)) await sleep(0.15);   // 界面已经先演过落位了（见 reviveShow）
      else await reviveDrop(rv);
    } else {
      // 破釜沉舟：沉舟的火映红河面，楚军踏火连进两步
      if (BF.CFG.beishui.on) title('背水一战', '连进两步 · 用过的子下回合不能动', 2600); else title('破釜沉舟', '楚军连进两步 · 此后三回合不用技能', 2600);
      Sfx.B.gong(0, 0.9); Sfx.B.woodbreak(0.3, 0.7); Sfx.B.boom(0.4, 0.5); Sfx.B.taiko(0.1, 0.9); Sfx.B.taiko(0.45, 1);
      const vp = say(BF.CFG.beishui.on ? 'bf_art_b2' : 'bf_art_b');
      const k = [...Board.pieces.values()].find(m => m.userData.t === 'k' && m.userData.s === 'b');
      if (k && big) { document.body.classList.add('cine'); const hd = Cam.homeDir(); Cam.to(k.position.clone().addScaledVector(hd, -3).add(new V3(0, 2.2, 0)), k.position.clone().add(new V3(0, 0.4, 0)), 0.9); }
      if (k) {
        const kp = k.position.clone();
        Fx.flash(kp.clone().setY(TOP + 0.5), 90, 0.9, 0.4); Cam.shake(0.3);
        for (let i = 0; i < 3; i++) setTimeout(() => { Fx.ring(kp.clone().setY(TOP + 0.02), 2.4 + i * 1.6, 0.8, 0xc2301a, 0.9); Cam.shake(0.12); }, i * 200);
        for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; setTimeout(() => { const c = kp.clone().add(new V3(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7)); P.fire(c.setY(TOP + 0.1), 10, 0.55); }, 120 + i * 40); }
        Fx.glow(kp.clone().setY(TOP + 0.5), 4, 1.2, 0.55, 0xff6a2a, 0.6); P.embers(kp, 20);
      }
      // 沉舟：河上一排火起；全军身上腾起战意
      for (let i = 0; i < 9; i++) { const c = new V3(-7 + i * 1.75 + R(-0.4, 0.4), 0.05, R(-0.3, 0.3)); setTimeout(() => { P.fire(c, 22, 0.8); P.smoke(c, 6, 0.7); Fx.glow(c.clone().setY(0.5), 2.2, 0.9, 0.4, 0xff7a2a); Sfx.B.boom(0, 0.25); }, 500 + i * 110); }
      [...Board.pieces.values()].filter(m => m.userData.s === 'b').forEach((m, i) => setTimeout(() => { const c = m.position.clone().setY(TOP + 0.25); P.flame(c, 0.3); P.flame(c, 0.22); P.embers(c, 3); Fx.ring(c.clone().setY(TOP + 0.02), 1.3, 0.5, 0xc2301a, 0.7); }, 700 + i * 60));
      Sfx.B.shout(0.8, 10, 0.1, 0.8);
      await Promise.race([vp, sleep(2.6)]);
      if (Cam.cine) await Cam.home(0.6);
      await sleep(0.4);
      let board = before;
      const steps = info.extra.steps || [];
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i], evs = ev.slice(st.ev0, st.ev1);
        const A = Board.pos(st.from[0], st.from[1]), B = Board.pos(st.to[0], st.to[1]);
        const P0 = board[st.from[1]][st.from[0]], m = P0 && Board.pieces.get(P0.id);
        // 蓄势：脚下火环一收，火线直扑落点
        Fx.ring(A.clone().setY(TOP + 0.02), 1.8, 0.35, 0xff6a2a, 0.9); P.fire(A.clone().setY(TOP + 0.1), 14, 0.6); Sfx.B.whoosh(0, 0.6, 0.5); Sfx.B.taiko(0, 0.9, 0.9);
        labelPop(st.from, i ? '再进！' : BF.CFG.beishui.on ? '背水！' : '破釜！', side);
        blaze(A, B);
        await sleep(0.28);
        // 棋子身上带着火冲过去（低特效档看得到棋子本身；电影档是它的兵踏着火线）
        const off = m ? Core.onFrame(() => { if (m.parent && m.visible && Math.random() < 0.8) { P.flame(m.position.clone().setY(m.position.y + 0.15), 0.3); Fx.spawn({ pos: m.position.clone().setY(m.position.y + 0.1), tex: Core.Tex.spark, add: true, color: 0xff8a3a, size: 0.5, size2: 0.1, life: 0.28, op: 0.5 }); } }) : null;
        const sp0 = Core.Time.boost; 
        try { await strikeT(board, st.from, st.to, evs, side, { streak: info.streak }); } finally { if (off) off(); }
        // 落地：火浪炸开
        Cam.shake(0.3); Fx.ring(B.clone().setY(TOP + 0.02), 3.2, 0.7, 0xff6a2a, 0.9); Fx.ring(B.clone().setY(TOP + 0.03), 1.8, 0.5, 0xffd27a, 0.8);
        P.fire(B.clone().setY(TOP + 0.15), 26, 0.9); P.embers(B, 14); Fx.glow(B.clone().setY(TOP + 0.3), 3.4, 0.5, 0.5, 0xff7a2a); Fx.Marks.scorch(B.clone().setY(TOP), 0.9); Sfx.B.boom(0, 0.5); Sfx.B.taiko(0, 1, 0.7);
        board = simBoard(board, evs);
        await sleep(0.25);
      }
    }
  }

  // 锁链落下：被困的棋子脚下一圈火星 + 铁链声
  function bindFx(list) {
    list.forEach((m, i) => setTimeout(() => {
      const c = m.position.clone().setY(TOP + 0.06);
      P.sparks(c, 6, 0.6); Fx.ring(c.clone().setY(TOP + 0.02), 1.5, 0.5, 0x4a4e55, 0.7);
      if (i < 5) { Sfx.B.clang(0, 0.22); Sfx.B.plate(0.04, 0.2); try { Sfx.smp('chain', { t: 0, vol: 0.28 }); } catch (e) { } }
    }, 90 * i));
  }
  async function ult(info) {
    if (info.side === 'b') {
      title('鸿门宴', `汉王身陷宴中 · ${BF.CFG.ultimates.hongmen.rounds} 回合不得移动 · 唯士护驾可破`, 3200);
      Sfx.B.gong(0, 1); Sfx.guqin && Sfx.guqin(0.4); Sfx.B.taiko(0.2, 0.6); Sfx.B.taiko(0.5, 0.6);
      const vp = say('bf_ult_b');
      const k = [...Board.pieces.values()].find(m => m.userData.t === 'k' && m.userData.s === 'r');
      if (k) {
        Fx.ring(k.position.clone().setY(TOP + 0.02), 2.2, 1, 0x8e2418, 0.9); P.ink(k.position.clone().setY(TOP + 0.3), 14, 0.5, 0.35);
        if (cine()) { document.body.classList.add('cine'); const hd = Cam.homeDir(); Cam.to(k.position.clone().addScaledVector(hd, 2.8).add(new V3(0.8, 1.8, 0)), k.position.clone().add(new V3(0, 0.4, 0)), 1.0); }
        setTimeout(() => bindFx([k]), 900);
      }
      await Promise.race([vp, sleep(3.2)]); await sleep(0.4);
    } else {
      title('四面楚歌', `楚军军心涣散 · ${BF.CFG.ultimates.simian.rounds} 回合动弹不得`, 3200);
      Sfx.B.gong(0, 0.8);
      try { Sfx.Music.duck && Sfx.Music.duck(true); Sfx.chuSong && Sfx.chuSong(0.3); } catch (e) { }
      if (typeof Camp !== 'undefined') Camp.dismay('b');
      const k = [...Board.pieces.values()].find(m => m.userData.t === 'k' && m.userData.s === 'b');
      if (k && cine()) { document.body.classList.add('cine'); const hd = Cam.homeDir(); Cam.to(k.position.clone().addScaledVector(hd, -3.4).add(new V3(0, 2.6, 0)), k.position.clone().add(new V3(0, 0.3, 0)), 1.2); }
      const bound = [...Board.pieces.values()].filter(m => m.userData.s === 'b' && m.userData.t !== 'k');
      for (const m of bound) P.ink(m.position.clone().setY(TOP + 0.25), 3, 0.3, 0.25, 0.5);
      setTimeout(() => bindFx(bound), 1100);
      await say('bf_ult_r');
      await sleep(1.0);
      try { Sfx.Music.duck && Sfx.Music.duck(false); } catch (e) { }
    }
  }
  return { play, simBoard, shatter, title, hooks, rankPop, reviveShow };
})();
