// ===== 楚汉·兵法 模式规则引擎（规则底稿 v1） =====
// 走法、将死、困毙不变；技能和生命值只改“吃子的结果”和“每回合能做什么”。没有随机数，同样的行动序列结果永远相同。
// 一方一次行动 = 可选一次升级（不占行动）+ 走子 / 兵种技能 / 兵法 三选一。
(function (global) {
  const XQ = global.XQ || require('./rules.js');
  const { pseudoMoves, inCheck, findKing, inBoard, ownHalf, other, initialBoard, checkers } = XQ;

  // ---------- 数值配置（初版，集中在这里调） ----------
  const CFG = {
    merit: {
      start: 3, cap: 30, autoIncomeFromRound: 16, autoIncomePerRound: 1,
      killReward: { p: 1, a: 2, e: 2, n: 3, c: 3, r: 5 }, killRewardPerLevel: 1,
      checkReward: 1, pawnCrossRiverReward: 1, lostPieceCompensation: 1,
    },
    upgrade: { cost: { p: [3, 5], a: [4, 6], e: [4, 6], n: [5, 7], c: [5, 7], r: [6, 8] }, maxPerTurn: 1, healOnUpgrade: true, cooldownOnUnlock: 1 },
    hp: [1, 2, 3],
    skills: {
      juma: { cooldown: 2, duration: 1, damage: 1 },
      chongzhen: { cooldown: 3, extraSquares: 1 },
      taying: { cooldown: 2 },
      pili: { cooldown: 4, splashDamage: 1, splashMinLevel: 2 },
      qishe: { cooldown: 3, range: 2, damage: 1 },
      jianta: { cooldown: 3, splashDamage: 1, splashMinLevel: 2 },
      hujia: { cooldown: 3 },
    },
    generalArts: { xiaohe: { usesPerGame: 1 }, pofu: { usesPerGame: 1, steps: 2, mayEndInCheck: false, skillLockRounds: 3 } },
    ultimates: { cost: 20, hongmen: { usesPerGame: 1, rounds: 2 }, simian: { usesPerGame: 1, rounds: 2, radius: 2, minPiecesInRadius: 3 } },
    longCheckLimit: 6,
  };
  const SKILL_OF = (t, s) => ({ p: 'juma', r: 'chongzhen', n: 'taying', c: 'pili', a: 'hujia', e: s === 'r' ? 'qishe' : 'jianta' })[t] || null;
  const SKILL_CN = { juma: '拒马', chongzhen: '冲阵', taying: '踏营', pili: '霹雳', qishe: '齐射', jianta: '践踏', hujia: '护驾' };
  const ART_CN = { r: '萧何追韩信', b: '破釜沉舟' }, ULT_CN = { r: '四面楚歌', b: '鸿门宴' };
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // 每枚子的开局位置（复活用）
  const START = {};
  (() => { const b = initialBoard(); for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (b[r][f]) START[b[r][f].id] = [f, r]; })();

  // ---------- 状态 ----------
  function newState(cfg) {
    const b = initialBoard();
    for (const row of b) for (const p of row) if (p) { p.lv = 1; p.hp = 1; p.cd = 0; p.jm = 0; }
    return {
      board: b, turn: 'r', cnt: { r: 0, b: 0 }, merit: { r: cfg.merit.start, b: cfg.merit.start },
      used: { art: { r: 0, b: 0 }, ult: { r: 0, b: 0 } }, fx: { hm: 0, sm: 0, pf: 0 },
      crossed: {}, dead: { r: [], b: [] }, upgraded: false, ckHist: { r: [], b: [] },
    };
  }
  function cloneState(S) {
    return {
      board: S.board.map(row => row.map(p => (p ? { ...p } : null))), turn: S.turn, cnt: { ...S.cnt }, merit: { ...S.merit },
      used: { art: { ...S.used.art }, ult: { ...S.used.ult } }, fx: { ...S.fx }, crossed: { ...S.crossed },
      dead: { r: S.dead.r.slice(), b: S.dead.b.slice() }, upgraded: S.upgraded, ckHist: { r: S.ckHist.r.slice(), b: S.ckHist.b.slice() },
    };
  }
  const at = (S, f, r) => (inBoard(f, r) ? S.board[r][f] : null);
  const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
  const hmActive = S => S.cnt.r < S.fx.hm; // 鸿门宴：汉帅不能动
  const smActive = S => S.cnt.b < S.fx.sm; // 四面楚歌：楚军涣散
  const pfActive = S => S.cnt.b < S.fx.pf; // 破釜沉舟后楚方兵种技能封锁
  const restricted = (S, s) => (s === 'r' ? hmActive(S) : smActive(S));
  const jmActive = (S, p) => p && p.t === 'p' && p.jm > S.cnt[other(p.s)];
  const skillReady = (S, p) => p.lv >= 2 && S.cnt[p.s] >= p.cd && !(p.s === 'b' && (pfActive(S) || smActive(S)));

  // ---------- 军功 ----------
  function addMerit(S, s, n, ev, why) {
    if (!n) return;
    const before = S.merit[s];
    S.merit[s] = Math.min(CFG_CUR.merit.cap, S.merit[s] + n);
    if (ev && S.merit[s] !== before) ev.push({ e: 'merit', s, n: S.merit[s] - before, why });
  }
  let CFG_CUR = CFG;
  function kill(S, f, r, killerSide, ev, how) {
    const v = S.board[r][f];
    if (!v) return null;
    S.board[r][f] = null;
    S.dead[v.s].push({ id: v.id, t: v.t, s: v.s });
    const m = CFG_CUR.merit;
    ev.push({ e: 'kill', id: v.id, t: v.t, s: v.s, lv: v.lv, at: [f, r], how });
    addMerit(S, killerSide, (m.killReward[v.t] || 0) + (v.lv - 1) * m.killRewardPerLevel, ev, '击杀');
    addMerit(S, v.s, m.lostPieceCompensation, ev, '哀兵');
    return v;
  }
  function damage(S, f, r, n, killerSide, ev, how) {
    const v = S.board[r][f];
    if (!v || v.t === 'k') return;
    v.hp -= n;
    if (v.hp <= 0) kill(S, f, r, killerSide, ev, how);
    else ev.push({ e: 'hit', id: v.id, at: [f, r], hp: v.hp, how });
  }
  function moveTo(S, from, to, ev) {
    const p = S.board[from[1]][from[0]];
    S.board[to[1]][to[0]] = p; S.board[from[1]][from[0]] = null;
    ev.push({ e: 'move', id: p.id, from: from.slice(), to: to.slice() });
    // 兵卒过河（每枚只计一次）
    if (p.t === 'p' && !ownHalf(p.s, to[1]) && !S.crossed[p.id]) { S.crossed[p.id] = 1; addMerit(S, p.s, CFG_CUR.merit.pawnCrossRiverReward, ev, '过河'); }
  }
  // 走到敌子所在格：拒马先反伤；剩 1 点就吃掉占位，2 点以上就是攻击（攻方退回）。返回 'kill' | 'hit' | 'died' | 'move'
  function strike(S, from, to, side, ev, how) {
    const P = S.board[from[1]][from[0]], T = S.board[to[1]][to[0]];
    if (!T) { moveTo(S, from, to, ev); return 'move'; }
    if (jmActive(S, T) && P.t !== 'k') {
      ev.push({ e: 'counter', id: P.id, at: from.slice(), by: T.id, target: to.slice() });
      P.hp -= CFG_CUR.skills.juma.damage;
      if (P.hp <= 0) { kill(S, from[0], from[1], T.s, ev, 'juma'); return 'died'; }
    }
    if (T.hp <= 1) { kill(S, to[0], to[1], side, ev, how || 'capture'); moveTo(S, from, to, ev); return 'kill'; }
    T.hp -= 1;
    ev.push({ e: 'hit', id: T.id, at: to.slice(), hp: T.hp, how: how || 'attack' });
    ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() });
    return 'hit';
  }
  function splash(S, c, side, ev, how) {
    const minLv = CFG_CUR.skills[how].splashMinLevel, n = CFG_CUR.skills[how].splashDamage;
    for (const [df, dr] of ORTHO) {
      const f = c[0] + df, r = c[1] + dr, q = at(S, f, r);
      if (q && q.s !== side && q.t !== 'k' && q.lv >= minLv) damage(S, f, r, n, side, ev, how);
    }
  }

  // ---------- 走法 ----------
  // 普通走子的伪合法目标（不能吃帅将；鸿门宴期间汉帅不能动；涣散期间楚方非将子只能吃子或攻击）
  function moveTargets(S, f, r, ignoreLeg = false) {
    const p = at(S, f, r); if (!p) return [];
    let ms;
    if (ignoreLeg && p.t === 'n') {
      ms = [];
      for (const [df, dr] of [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]]) {
        const tf = f + df, tr = r + dr; if (!inBoard(tf, tr)) continue;
        const q = S.board[tr][tf]; if (q && q.s === p.s) continue;
        ms.push({ from: [f, r], to: [tf, tr] });
      }
    } else ms = pseudoMoves(S.board, f, r);
    return ms.filter(m => {
      const q = S.board[m.to[1]][m.to[0]];
      if (q && q.t === 'k') return false;
      if (p.s === 'r' && p.t === 'k' && hmActive(S)) return false;
      if (p.s === 'b' && p.t !== 'k' && smActive(S) && !q) return false;
      return true;
    });
  }
  function cannonShots(S, f, r) { return pseudoMoves(S.board, f, r).filter(m => { const q = S.board[m.to[1]][m.to[0]]; return q && q.s !== S.board[r][f].s && q.t !== 'k'; }); }
  function arrowTargets(S, f, r) {
    const p = at(S, f, r), out = [];
    for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k <= CFG_CUR.skills.qishe.range; k++) {
        const tf = f + df * k, tr = r + dr * k; if (!inBoard(tf, tr)) break;
        const q = S.board[tr][tf];
        if (q) { if (q.s !== p.s && q.t !== 'k') out.push({ from: [f, r], to: [tf, tr] }); break; }
      }
    }
    return out;
  }

  // ---------- 行动结算（在 S 上直接改；不合法返回 null） ----------
  function resolve(S, a) {
    const side = S.turn, ev = [];
    const own = (f, r) => { const p = at(S, f, r); return p && p.s === side ? p : null; };
    const has = (list, to) => list.some(m => m.to[0] === to[0] && m.to[1] === to[1]);
    let kind = a.k, extra = {};
    if (a.k === 'mv') {
      const p = own(a.from[0], a.from[1]); if (!p) return null;
      if (!has(moveTargets(S, a.from[0], a.from[1]), a.to)) return null;
      extra.res = strike(S, a.from, a.to, side, ev);
    } else if (a.k === 'sk') {
      const p = own(a.at[0], a.at[1]); if (!p || !skillReady(S, p)) return null;
      const sk = SKILL_OF(p.t, p.s); if (!sk) return null;
      extra.sk = sk;
      const cd = () => { const q = S.board.flat().find(x => x && x.id === p.id); if (q) q.cd = S.cnt[side] + CFG_CUR.skills[sk].cooldown + 1; };
      if (sk === 'juma') {
        p.jm = S.cnt[other(side)] + CFG_CUR.skills.juma.duration;
        ev.push({ e: 'juma', id: p.id, at: a.at.slice() });
      } else if (sk === 'chongzhen') {
        const tg = moveTargets(S, a.at[0], a.at[1]).filter(m => S.board[m.to[1]][m.to[0]]);
        if (!a.to || !has(tg, a.to)) return null;
        const res = strike(S, a.at, a.to, side, ev, 'chongzhen');
        extra.res = res;
        if (res === 'kill') {
          const d = [Math.sign(a.to[0] - a.at[0]), Math.sign(a.to[1] - a.at[1])];
          let cur = a.to.slice();
          for (let k = 0; k < CFG_CUR.skills.chongzhen.extraSquares; k++) {
            const nx = [cur[0] + d[0], cur[1] + d[1]];
            if (!inBoard(nx[0], nx[1])) break;
            const q = S.board[nx[1]][nx[0]];
            if (!q) { moveTo(S, cur, nx, ev); cur = nx; extra.roll = 'move'; continue; }
            if (q.s === side || q.t === 'k' || q.hp >= 2) break;
            const r2 = strike(S, cur, nx, side, ev, 'chongzhen');
            extra.roll = r2;
            if (r2 === 'kill') cur = nx; else break;
          }
        }
      } else if (sk === 'taying') {
        if (!a.to || !has(moveTargets(S, a.at[0], a.at[1], true), a.to)) return null;
        extra.res = strike(S, a.at, a.to, side, ev, 'taying');
      } else if (sk === 'pili') {
        if (!a.to || !has(cannonShots(S, a.at[0], a.at[1]), a.to)) return null;
        if (p.s === 'b' && smActive(S)) return null;
        const res = strike(S, a.at, a.to, side, ev, 'pili');
        extra.res = res;
        if (res !== 'died') splash(S, a.to, side, ev, 'pili');
      } else if (sk === 'qishe') {
        if (!a.to || !has(arrowTargets(S, a.at[0], a.at[1]), a.to)) return null;
        damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, 'qishe');
      } else if (sk === 'jianta') {
        if (!a.to || !has(moveTargets(S, a.at[0], a.at[1]), a.to)) return null;
        const res = strike(S, a.at, a.to, side, ev, 'jianta');
        extra.res = res;
        if (res === 'move' || res === 'kill') splash(S, a.to, side, ev, 'jianta');
      } else if (sk === 'hujia') {
        if (side === 'r' && hmActive(S)) return null;
        const k = findKing(S.board, side); if (!k) return null;
        const K = S.board[k[1]][k[0]];
        S.board[k[1]][k[0]] = p; S.board[a.at[1]][a.at[0]] = K;
        ev.push({ e: 'swap', a: p.id, b: K.id, pa: a.at.slice(), pb: k.slice() });
      }
      cd();
    } else if (a.k === 'art') {
      if (S.used.art[side] >= CFG_CUR.generalArts[side === 'r' ? 'xiaohe' : 'pofu'].usesPerGame) return null;
      if (side === 'b' && smActive(S)) return null;
      if (side === 'r') {
        const i = S.dead.r.findIndex(d => d.id === a.id); if (i < 0) return null;
        const d = S.dead.r[i], st = START[d.id];
        if (!st || at(S, st[0], st[1])) return null;
        S.dead.r.splice(i, 1);
        S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: 1, hp: CFG_CUR.hp[0], cd: 0, jm: 0 };
        ev.push({ e: 'revive', id: d.id, t: d.t, at: st.slice() });
      } else {
        const steps = a.steps || [];
        if (steps.length !== CFG_CUR.generalArts.pofu.steps) return null;
        extra.steps = [];
        for (const m of steps) {
          const p = own(m.from[0], m.from[1]); if (!p) return null;
          if (!has(moveTargets(S, m.from[0], m.from[1]), m.to)) return null;
          const n0 = ev.length;
          const res = strike(S, m.from, m.to, side, ev);
          extra.steps.push({ from: m.from, to: m.to, res, ev0: n0, ev1: ev.length });
          if (inCheck(S.board, side)) return null;
        }
        if (!CFG_CUR.generalArts.pofu.mayEndInCheck && inCheck(S.board, 'r')) return null;
        S.fx.pf = S.cnt.b + 1 + CFG_CUR.generalArts.pofu.skillLockRounds;
      }
      S.used.art[side]++;
    } else if (a.k === 'ult') {
      const U = CFG_CUR.ultimates;
      if (S.merit[side] < U.cost || S.used.ult[side] >= U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame) return null;
      if (side === 'b' && smActive(S)) return null;
      if (side === 'r') {
        const k = findKing(S.board, 'b'); if (!k) return null;
        if (simianCount(S) < U.simian.minPiecesInRadius) return null;
        S.fx.sm = S.cnt.b + U.simian.rounds;
      } else S.fx.hm = S.cnt.r + U.hongmen.rounds;
      S.merit[side] -= U.cost;
      S.used.ult[side]++;
      ev.push({ e: 'ult', s: side });
    } else if (a.k === 'pass') {
      if (!restricted(S, side) || legalMoves(S, side, true).length) return null;
    } else return null;
    // 行动结束：己方帅将不能被将军（含将帅对面）
    if (inCheck(S.board, side)) return null;
    return { kind, ev, extra };
  }
  // 四面楚歌：楚将周围横竖 2 格内（5×5）的汉方棋子数
  function simianCount(S) {
    const k = findKing(S.board, 'b'), R = CFG_CUR.ultimates.simian.radius; if (!k) return 0;
    let n = 0;
    for (let r = k[1] - R; r <= k[1] + R; r++) for (let f = k[0] - R; f <= k[0] + R; f++) { const p = at(S, f, r); if (p && p.s === 'r') n++; }
    return n;
  }
  const posOf = (S, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.id === id) return [f, r]; } return null; };

  // 行动后的结算：计数、将军军功、长将记录、回合收入、换手
  function settle(S, side, ev) {
    const opp = other(side);
    const ck = checkers(S.board, side);
    S.ckHist[side].push(ck);
    if (inCheck(S.board, opp)) { addMerit(S, side, CFG_CUR.merit.checkReward, ev, '将军'); ev.push({ e: 'check', s: opp }); }
    S.cnt[side]++;
    S.upgraded = false;
    S.turn = opp;
    if (side === 'b' && round(S) >= CFG_CUR.merit.autoIncomeFromRound) {
      addMerit(S, 'r', CFG_CUR.merit.autoIncomePerRound, ev, '回合'); addMerit(S, 'b', CFG_CUR.merit.autoIncomePerRound, ev, '回合');
    }
  }
  // 试走：不合法返回 null；合法返回结算后的新状态（不改原状态）
  function attempt(S, a) {
    const T = cloneState(S);
    const r = resolve(T, a);
    if (!r) return null;
    // 长将：同一子连续将军不能超过 6 回合
    const lim = CFG_CUR.longCheckLimit, side = S.turn;
    if (lim) {
      const hist = S.ckHist[side];
      if (hist.length >= lim) {
        const ck = checkers(T.board, side);
        const last = hist.slice(-lim);
        if (ck.some(id => last.every(h => h.includes(id)))) return null;
      }
    }
    settle(T, side, r.ev);
    return { S: T, ...r };
  }

  // ---------- 枚举 ----------
  function legalMoves(S, side, normalOnly = false) {
    const out = [];
    const Sx = S.turn === side ? S : { ...cloneState(S), turn: side };
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = Sx.board[r][f]; if (!p || p.s !== side) continue;
      for (const m of moveTargets(Sx, f, r)) {
        const a = { k: 'mv', from: m.from, to: m.to };
        if (attempt(Sx, a)) out.push(a);
      }
    }
    return out;
  }
  function skillActions(S, f, r) {
    const p = at(S, f, r); if (!p || p.s !== S.turn || !skillReady(S, p)) return [];
    const sk = SKILL_OF(p.t, p.s), out = [];
    const tg = sk === 'chongzhen' ? moveTargets(S, f, r).filter(m => S.board[m.to[1]][m.to[0]])
      : sk === 'taying' ? moveTargets(S, f, r, true)
        : sk === 'pili' ? cannonShots(S, f, r)
          : sk === 'qishe' ? arrowTargets(S, f, r)
            : sk === 'jianta' ? moveTargets(S, f, r) : null;
    if (tg) { for (const m of tg) { const a = { k: 'sk', at: [f, r], to: m.to }; if (attempt(S, a)) out.push(a); } }
    else { const a = { k: 'sk', at: [f, r] }; if (attempt(S, a)) out.push(a); }
    return out;
  }
  function reviveOptions(S) {
    if (S.turn !== 'r' || S.used.art.r >= CFG_CUR.generalArts.xiaohe.usesPerGame) return [];
    const seen = new Set(), out = [];
    for (const d of S.dead.r) { if (seen.has(d.id)) continue; seen.add(d.id); const a = { k: 'art', id: d.id }; if (attempt(S, a)) out.push({ ...a, t: d.t, at: START[d.id] }); }
    return out;
  }
  // 破釜沉舟第一步的可选着法（必须存在能合法走完的第二步）
  function pofuFirst(S) {
    if (S.turn !== 'b' || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
    const out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== 'b') continue;
      for (const m of moveTargets(S, f, r)) if (pofuSecond(S, m, true).length) out.push(m);
    }
    return out;
  }
  function pofuSecond(S, m1, any = false) {
    const T = cloneState(S), ev = [];
    if (!at(T, m1.from[0], m1.from[1])) return [];
    strike(T, m1.from, m1.to, 'b', ev);
    if (inCheck(T.board, 'b')) return [];
    const out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = T.board[r][f]; if (!p || p.s !== 'b') continue;
      for (const m2 of moveTargets(T, f, r)) {
        if (attempt(S, { k: 'art', steps: [{ from: m1.from, to: m1.to }, { from: m2.from, to: m2.to }] })) { out.push(m2); if (any) return out; }
      }
    }
    return out;
  }
  function ultReady(S) {
    const side = S.turn, U = CFG_CUR.ultimates;
    if (S.merit[side] < U.cost || S.used.ult[side] >= U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame) return false;
    return !!attempt(S, { k: 'ult' });
  }
  function hasAnyAction(S) {
    if (legalMoves(S, S.turn).length) return true;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && skillActions(S, f, r).length) return true; }
    if (reviveOptions(S).length || pofuFirst(S).length || ultReady(S)) return true;
    return false;
  }
  // 普通走子里“非攻击”的（空格或只剩 1 点的敌子）——困毙只看这些
  function plainMoves(S) {
    return legalMoves(S, S.turn).filter(a => { const q = at(S, a.to[0], a.to[1]); return !q || q.hp <= 1; });
  }
  // 轮到 S.turn 时：将死 / 困毙 / 只能停着
  function evaluate(S) {
    const side = S.turn, opp = other(side);
    if (inCheck(S.board, side)) {
      if (!hasAnyAction(S)) return { result: { winner: opp, loser: side, reason: 'checkmate' } };
      return { check: true };
    }
    if (!plainMoves(S).length) {
      if (restricted(S, side)) return { mustPass: !legalMoves(S, side).length, mayPass: !legalMoves(S, side).length };
      return { result: { winner: opp, loser: side, reason: 'stalemate' } };
    }
    return {};
  }

  // ---------- 对局 ----------
  class Game {
    constructor(cfg) { this.cfg = cfg || CFG; CFG_CUR = this.cfg; this.reset(); }
    reset(base) {
      this.base = base ? cloneState(base) : newState(this.cfg);
      this.S = cloneState(this.base);
      this.entries = []; this.sides = []; this.history = []; this.result = null; this.last = null; this.status = evaluate(this.S);
    }
    get bf() { return true; }
    get board() { return this.S.board; }
    get turn() { return this.S.turn; }
    get round() { return round(this.S); }
    at(f, r) { return at(this.S, f, r); }
    inCheck(s) { return inCheck(this.S.board, s || this.S.turn); }
    kingPos(s) { return findKing(this.S.board, s); }
    // 普通走子目标（含攻击）
    legalFrom(f, r) { const p = this.at(f, r); if (!p || p.s !== this.turn || this.result) return []; return moveTargets(this.S, f, r).filter(m => attempt(this.S, { k: 'mv', from: m.from, to: m.to })); }
    isLegal(m) { return this.legalFrom(m.from[0], m.from[1]).some(x => x.to[0] === m.to[0] && x.to[1] === m.to[1]); }
    skillTargets(f, r) { CFG_CUR = this.cfg; return this.result ? [] : skillActions(this.S, f, r); }
    skillOf(p) { return p && p.t !== 'k' ? SKILL_OF(p.t, p.s) : null; }
    skillReady(p) { return !!p && skillReady(this.S, p); }
    reviveOptions() { return this.result ? [] : reviveOptions(this.S); }
    pofuFirst() { return this.result ? [] : pofuFirst(this.S); }
    pofuSecond(m1) { return pofuSecond(this.S, m1); }
    pofuPreview(m1) { return pofuPreview(this.S, m1); }
    ultReady() { return !this.result && ultReady(this.S); }
    upgradeCost(p) { if (!p || p.t === 'k' || p.lv >= 3) return null; return this.cfg.upgrade.cost[p.t][p.lv - 1]; }
    canUpgrade(f, r) {
      const p = this.at(f, r), S = this.S;
      if (this.result || !p || p.s !== S.turn || p.t === 'k' || p.lv >= 3 || S.upgraded) return false;
      return S.merit[p.s] >= this.upgradeCost(p);
    }
    // 记录一条行动（升级或主行动）并执行；返回动画信息
    apply(e) {
      CFG_CUR = this.cfg;
      if (this.result) return null;
      const S = this.S;
      if (e.k === 'up') {
        if (!this.canUpgrade(e.at[0], e.at[1])) return null;
        const p = this.at(e.at[0], e.at[1]);
        S.merit[p.s] -= this.upgradeCost(p);
        p.lv++; p.hp = this.cfg.upgrade.healOnUpgrade ? this.cfg.hp[p.lv - 1] : p.hp + 1;
        if (p.lv === 2) p.cd = Math.max(p.cd, S.cnt[p.s] + this.cfg.upgrade.cooldownOnUnlock);
        S.upgraded = true;
        this.entries.push({ k: 'up', at: e.at.slice() }); this.sides.push(p.s);
        const info = { k: 'up', side: p.s, id: p.id, t: p.t, at: e.at.slice(), lv: p.lv, hp: p.hp, ev: [], after: S };
        this.last = info;
        return info;
      }
      const before = S, side = S.turn;
      const r = attempt(S, e);
      if (!r) return null;
      this.S = r.S;
      this.entries.push(JSON.parse(JSON.stringify(e))); this.sides.push(side);
      const kills = r.ev.filter(x => x.e === 'kill');
      const capE = kills.find(x => x.s !== side);
      const piece = e.from ? before.board[e.from[1]][e.from[0]] : e.at ? before.board[e.at[1]][e.at[0]] : null;
      const h = { k: e.k, side, from: e.from || e.at || null, to: e.to || null, pid: piece ? piece.id : null, cap: capE ? { s: capE.s, t: capE.t, id: capE.id, lv: capE.lv } : null, kills, ev: r.ev, extra: r.extra, e };
      this.history.push(h);
      const st = evaluate(this.S);
      this.status = st;
      if (st.result) this.result = st.result;
      const info = { ...h, mover: side, check: inCheck(this.S.board, other(side)), result: this.result, ply: this.history.length - 1, before, after: this.S };
      this.last = info;
      return info;
    }
    // 从头重放到第 n 条（悔棋、断线重连都走这里）
    rebuild(n) {
      const es = this.entries.slice(0, n);
      const base = this.base;
      this.reset(base);
      for (const e of es) if (!this.apply(e)) return false;
      return true;
    }
    // 悔掉最近 k 次主行动（连同其前面的升级）
    undoActions(k) {
      let n = this.entries.length, left = k;
      while (n > 0 && left > 0) { n--; if (this.entries[n].k !== 'up') left--; }
      while (n > 0 && this.entries[n - 1].k === 'up') n--;
      return this.rebuild(n);
    }
    timeout(side) { if (this.result) return null; this.result = { winner: other(side), loser: side, reason: 'timeout' }; return this.result; }
    resign(side) { if (this.result) return null; this.result = { winner: other(side), loser: side, reason: 'resign' }; return this.result; }
    // 调试：直接摆局面
    setup(fn) { const T = cloneState(this.S); fn(T); this.reset(T); this.status = evaluate(this.S); }
    get merit() { return this.S.merit; }
    get used() { return this.S.used; }
    get fx() { return { hm: Math.max(0, this.S.fx.hm - this.S.cnt.r), sm: Math.max(0, this.S.fx.sm - this.S.cnt.b), pf: Math.max(0, this.S.fx.pf - this.S.cnt.b) }; }
    get dead() { return this.S.dead; }
    get upgraded() { return this.S.upgraded; }
    jmActive(p) { return jmActive(this.S, p); }
    simianCount() { return simianCount(this.S); }
    cdLeft(p) { return p ? Math.max(0, p.cd - this.S.cnt[p.s]) : 0; }
    mustPass() { return !!this.status.mustPass; }
    quietPlies() { return 0; }
  }

  // 只读视图：动画结束时按这一刻的状态对齐棋盘（装饰需要的效果剩余回合等）
  function view(S) {
    return {
      bf: true, board: S.board,
      fx: { hm: Math.max(0, S.fx.hm - S.cnt.r), sm: Math.max(0, S.fx.sm - S.cnt.b), pf: Math.max(0, S.fx.pf - S.cnt.b) },
      jmActive: p => jmActive(S, p),
    };
  }
  // 破釜沉舟第一步走完后的局面（界面预览用）
  function pofuPreview(S, m1) {
    const T = cloneState(S), ev = [];
    strike(T, m1.from, m1.to, 'b', ev);
    return { S: T, ev };
  }
  const BF = { Game, CFG, view, pofuPreview, SKILL_OF, SKILL_CN, ART_CN, ULT_CN, START, newState, cloneState, attempt, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = BF;
  global.BF = BF;
})(typeof window !== 'undefined' ? window : globalThis);
