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
      else if (e.e === 'revive') b[e.at[1]][e.at[0]] = { s: 'r', t: e.t, id: e.id, lv: 1, hp: 1 };
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
  async function splashHits(evs, side) {
    for (const e of evs) {
      const m = Board.pieces.get(e.id);
      const c = Board.pos(e.at[0], e.at[1]).setY(TOP + 0.2);
      if (e.e === 'hit') { shatter(e.at, 1); P.ink(c, 6, 0.35, 0.25, 0.6); if (m) tween(0.25, k => { m.position.y = TOP + Math.sin(k * Math.PI) * 0.12; }); }
      else if (e.e === 'kill') {
        P.ink(c, 14, 0.5, 0.35); P.blood(c, 10, 0.7); Fx.chunks(c, new V3(0, 0, side === 'r' ? -1 : 1), 0.8, 8);
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
  function say(id) { try { if (Voice.has(id)) return Voice.play(id); } catch (e) { } return Promise.resolve(); }
  function ring(at, color = 0x5a4a38, size = 2.4) { Fx.ring(Board.pos(at[0], at[1]).setY(TOP + 0.02), size, 0.7, color, 0.8); }
  // 屏幕正中的兵法题字（复用开局的行楷横幅）
  function title(t, s, ms = 2400) {
    const b = document.getElementById('banner');
    document.getElementById('bannerT').textContent = t; document.getElementById('bannerS').textContent = s || '';
    b.classList.add('on'); setTimeout(() => b.classList.remove('on'), ms);
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
    info.check = !!opts.check; info.result = opts.result || null; info.streak = opts.streak || 1;
    const c = { lv: P0.lv, dlv: T0 ? T0.lv : 1 };
    if (T0) { c.survive = !!tHit && !tKill; c.killed = !!tKill; c.counter = died ? 'die' : counter ? 'hurt' : null; c.ranged = !!opts.ranged; }
    await Fx.playMove(info, { c, noCamp: opts.noCamp });
    if (tHit) shatter(to, 1);
  }

  async function play(info, game) {
    const ev = info.ev || [], side = info.side;
    const before = info.before ? info.before.board : null;
    try {
      if (info.k === 'up') await levelUp(info);
      else if (info.k === 'mv') await strike(before, info.from, info.to, ev, side, { check: info.check, result: info.result, streak: info.streak });
      else if (info.k === 'sk') await skill(info, before);
      else if (info.k === 'art') await art(info, before);
      else if (info.k === 'ult') await ult(info);
      else if (info.k === 'pass') { title('停 著', '无子可走，按兵不动', 1600); await sleep(1.2); }
    } catch (e) { console.error('兵法演出出错', e); }
    Core.Time.scale = 1;
    document.body.classList.remove('cine');
    Board.reconcile(game);
    if (info.k !== 'mv' && info.k !== 'up') {
      if (Cam.cine) await Cam.home(0.8);
      if (info.result) Fx.checkStamp(XQ.other(side), info.result.reason === 'checkmate' ? '殺' : '困');
      else if (info.check) Fx.checkStamp(XQ.other(side));
    }
  }

  async function levelUp(info) {
    const m = Board.pieces.get(info.id); if (!m) return;
    const c = m.position.clone();
    Sfx.B.bell(0, 880, 0.08); Sfx.B.bell(0.12, 1175, 0.06); Sfx.B.gong(0.05, 0.35); Sfx.B.plate(0.1, 0.3);
    Fx.ring(c.clone().setY(TOP + 0.02), 1.6, 0.8, 0xc9a045, 0.9);
    for (let i = 0; i < 18; i++) Fx.spawn({ pos: c.clone().add(new V3(R(-0.3, 0.3), 0.1, R(-0.3, 0.3))), vel: new V3(R(-0.2, 0.2), R(1.2, 2.2), R(-0.2, 0.2)), tex: Core.Tex.spark, add: true, color: 0xffd27a, size: 0.12, size2: 0.03, life: R(0.6, 1), drag: 1.2 });
    await tween(0.3, k => { m.position.y = TOP + Math.sin(k * Math.PI) * 0.35; m.rotation.y = (Board.viewSide === 'b' ? Math.PI : 0) + k * Math.PI * 2; }, ease.inOut);
    m.position.y = TOP; m.rotation.y = Board.viewSide === 'b' ? Math.PI : 0;
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
      const moves = ev.filter(e => e.e === 'move' && e.id === P0.id);
      await strike(before, at, to, ev, side, { streak: info.streak });
      if (moves.length >= 2) {
        const r = moves[1], m = Board.pieces.get(P0.id);
        const second = ev.find(e => e.e === 'kill' && e.id !== P0.id && e.at[0] === r.to[0] && e.at[1] === r.to[1]);
        const A = Board.pos(r.from[0], r.from[1]), B = Board.pos(r.to[0], r.to[1]);
        Sfx.unit('chariot').charge(1); Sfx.B.hooves(0, 0.6, 2, 0.3);
        if (m) await tween(0.45, k => { m.position.lerpVectors(A, B, k); m.position.y = TOP + Math.sin(k * Math.PI) * 0.15; }, ease.in);
        if (second) {
          const cm = Board.pieces.get(second.id), cc = B.clone().setY(TOP + 0.15), d = B.clone().sub(A).normalize();
          Cam.shake(0.25); Sfx.unit('chariot').impact(); ring(r.to, 0x5a4a38, 2.2);
          P.blood(cc, 14, 0.8, d); Fx.chunks(cc, d, 1.1, 10); P.dust(B, 10, d.clone().negate(), 0.35);
          if (cm) { Fx.flyFace(cm, cc, d, 1, false); Fx.removePiece(cm); }
          if (typeof Camp !== 'undefined') Camp.onCapture(side, info.streak || 1);
        }
        await sleep(0.3);
      }
    } else if (sk === 'taying') {
      const m = Board.pieces.get(P0.id);
      Sfx.B.neigh(0, 0.14); Sfx.B.whoosh(0.1, 0.3, 0.4);
      if (m) await tween(0.35, k => { m.position.y = TOP + Math.sin(k * Math.PI) * 0.6; m.rotation.x = Math.sin(k * Math.PI) * 0.3; });
      if (m) { m.position.y = TOP; m.rotation.x = 0; }
      await strike(before, at, to, ev, side, { mt: 'n', streak: info.streak });
    } else if (sk === 'pili') {
      const T0 = before[to[1]][to[0]];
      const main = ev.filter(e => (T0 && e.id === T0.id) || e.id === P0.id || e.e === 'counter');
      await strike(before, at, to, main, side, { streak: info.streak });
      const sp = ev.filter(e => (e.e === 'hit' || e.e === 'kill') && e.how === 'pili' && (!T0 || e.id !== T0.id));
      if (sp.length) {
        const c = Board.pos(to[0], to[1]).setY(TOP + 0.1);
        shotAt(to, 4.2, 3.2, 0.5);
        Fx.flash(c, 90, 0.7, 0.35); P.fire(c, 40, 1.1); P.smoke(c, 12, 1); Fx.ring(c, 3.8, 0.9, 0x5a4a38, 0.8); Sfx.B.boom(0, 0.9); Cam.shake(0.35);
        await splashHits(sp, side);
      }
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
    }
  }

  async function art(info, before) {
    const side = info.side, ev = info.ev;
    if (side === 'r') {
      const rv = ev.find(e => e.e === 'revive');
      title('蕭何追韓信', '汉王复得良将 · ' + XQ.NAMES.r[rv.t] + '重回阵前', 2600);
      Sfx.B.gong(0, 0.8); Sfx.B.hooves(0.2, 1.4, 1, 0.3); Sfx.B.neigh(1.1, 0.12);
      const vp = say('bf_art_r');
      shotAt(rv.at, 3.0, 2.0, 0.9);
      await sleep(0.9);
      const B = Board.pos(rv.at[0], rv.at[1]);
      const m = Board.makePiece({ s: 'r', t: rv.t, id: rv.id, lv: 1, hp: 1 });
      m.rotation.y = Board.viewSide === 'b' ? Math.PI : 0; m.scale.set(1, 0.01, 1);
      Board.piecesRoot.add(m); Board.pieces.set(rv.id, m);
      Fx.ring(B.clone().setY(TOP + 0.02), 2, 0.9, 0xc9a045, 0.9);
      for (let i = 0; i < 24; i++) Fx.spawn({ pos: B.clone().add(new V3(R(-0.3, 0.3), 0.1, R(-0.3, 0.3))), vel: new V3(0, R(1.5, 3), 0), tex: Core.Tex.spark, add: true, color: 0xffd27a, size: 0.14, size2: 0.03, life: R(0.6, 1.2), drag: 1 });
      await Fx.rise(m, B, 0.6);
      await Promise.race([vp, sleep(2)]);
    } else {
      title('破釜沉舟', '楚军连进两步 · 此后三回合不用技能', 2600);
      Sfx.B.gong(0, 0.9); Sfx.B.woodbreak(0.3, 0.6); Sfx.B.boom(0.4, 0.4);
      const vp = say('bf_art_b');
      const k = [...Board.pieces.values()].find(m => m.userData.t === 'k' && m.userData.s === 'b');
      if (k && cine()) { document.body.classList.add('cine'); const hd = Cam.homeDir(); Cam.to(k.position.clone().addScaledVector(hd, -3).add(new V3(0, 2.2, 0)), k.position.clone().add(new V3(0, 0.4, 0)), 0.9); }
      await Promise.race([vp, sleep(2.6)]);
      if (Cam.cine) await Cam.home(0.6);
      for (let i = 0; i < 6; i++) { const c = new V3(R(-7, 7), 0.05, R(-0.3, 0.3)); setTimeout(() => { P.fire(c, 16, 0.6); P.smoke(c, 6, 0.6); }, i * 140); }
      await sleep(1.2);
      let board = before;
      const steps = info.extra.steps || [];
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i], evs = ev.slice(st.ev0, st.ev1);
        await strike(board, st.from, st.to, evs, side, { streak: info.streak });
        board = simBoard(board, evs);
        await sleep(0.2);
      }
    }
  }

  async function ult(info) {
    if (info.side === 'b') {
      title('鴻門宴', '汉王身陷宴中 · 两回合不得移动', 3000);
      Sfx.B.gong(0, 1); Sfx.guqin && Sfx.guqin(0.4); Sfx.B.taiko(0.2, 0.6); Sfx.B.taiko(0.5, 0.6);
      const vp = say('bf_ult_b');
      const k = [...Board.pieces.values()].find(m => m.userData.t === 'k' && m.userData.s === 'r');
      if (k) {
        Fx.ring(k.position.clone().setY(TOP + 0.02), 2.2, 1, 0x8e2418, 0.9); P.ink(k.position.clone().setY(TOP + 0.3), 14, 0.5, 0.35);
        if (cine()) { document.body.classList.add('cine'); const hd = Cam.homeDir(); Cam.to(k.position.clone().addScaledVector(hd, 2.8).add(new V3(0.8, 1.8, 0)), k.position.clone().add(new V3(0, 0.4, 0)), 1.0); }
      }
      await Promise.race([vp, sleep(3.2)]); await sleep(0.4);
    } else {
      title('四面楚歌', '楚军军心涣散 · 两回合只能厮杀', 3200);
      Sfx.B.gong(0, 0.8);
      try { Sfx.Music.duck && Sfx.Music.duck(true); Sfx.chuSong && Sfx.chuSong(0.3); } catch (e) { }
      if (typeof Camp !== 'undefined') Camp.dismay('b');
      const k = [...Board.pieces.values()].find(m => m.userData.t === 'k' && m.userData.s === 'b');
      if (k && cine()) { document.body.classList.add('cine'); const hd = Cam.homeDir(); Cam.to(k.position.clone().addScaledVector(hd, -3.4).add(new V3(0, 2.6, 0)), k.position.clone().add(new V3(0, 0.3, 0)), 1.2); }
      for (const m of Board.pieces.values()) if (m.userData.s === 'b' && m.userData.t !== 'k') P.ink(m.position.clone().setY(TOP + 0.25), 3, 0.3, 0.25, 0.5);
      await say('bf_ult_r');
      await sleep(1.0);
      try { Sfx.Music.duck && Sfx.Music.duck(false); } catch (e) { }
    }
  }
  return { play, simBoard, shatter, title };
})();
