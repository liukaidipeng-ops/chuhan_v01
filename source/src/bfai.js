// ===== 技能模式的电脑：估值 + 两三层搜索，另外自己决定升级、拒马、主帅兵法、终极兵法 =====
(function (global) {
  const BF = global.BF || require('./bingfa.js');
  const A = BF.ai, CFG = BF.CFG;
  const other = s => (s === 'r' ? 'b' : 'r');
  const WIN = 9000;
  const VAL = { r: 9, c: 4.6, n: 4.2, e: 2.3, a: 2.1, p: 1.1, k: 0 };
  const fwdOf = s => (s === 'r' ? 1 : -1);

  // 一枚子值多少：兵种 × 等级 × 血量，再加一点位置分
  function pieceVal(S, p, f, r) {
    if (p.t === 'k') {
      if (!S.final) return 0;
      // 决战：血量要紧；往对方九宫走、在里面站住更值钱
      const adv = p.s === 'r' ? r : 9 - r, inside = f >= 3 && f <= 5 && adv >= 7;
      return 6 + p.hp * 5 + adv * 0.35 + (inside ? 2.5 : 0) - Math.abs(f - 4) * 0.15;
    }
    const mx = BF.hpOf(p.t, p.lv) || 1;
    let v = VAL[p.t] * (1 + 0.36 * (p.lv - 1)) * (0.55 + 0.45 * Math.min(1, p.hp / mx));
    if (p.lv >= 3) v += 0.9; if (p.lv >= 4) v += 0.9;        // 有技能、成名将
    v += 0.14 * Math.min(6, p.xp || 0);                      // 攒着的甲片
    const adv = p.s === 'r' ? r : 9 - r;
    if (p.t === 'p') { if (adv >= 5) v += 0.55 + (adv - 5) * 0.12 - Math.abs(f - 4) * 0.04; }
    else if (p.t === 'n' || p.t === 'c' || p.t === 'r') v += 0.05 * Math.min(adv, 6) - Math.abs(f - 4) * 0.02;
    if (S.final && (p.t === 'a' || p.t === 'e')) v += adv * 0.12;   // 决战里士象也要压上去
    if (p.jm && p.jm > S.cnt[other(p.s)]) v += 0.25;
    return v;
  }
  // 局面分（站在 me 这一方看）
  function score(S, me) {
    let v = 0;
    const b = S.board;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p) v += (p.s === me ? 1 : -1) * pieceVal(S, p, f, r); }
    v += 0.2 * (S.merit[me] - S.merit[other(me)]);
    // 还没用的主帅兵法留着有价值（免得为了一个兵就把「召回良将」用掉）
    const art = s => (S.used.art[s] ? 0 : s === 'r' ? (S.dead.r.length ? 3 : 1.2) : 2);
    v += art(me) - art(other(me));
    // 终极兵法生效中
    const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
    if (sm) v += (me === 'r' ? 1 : -1) * (1.5 + sm * 2.2);
    if (hm) v += (me === 'b' ? 1 : -1) * (1 + hm * 1.6);
    if (S.final && S.occ) v += 7 * ((S.occ[me] || 0) - (S.occ[other(me)] || 0));
    if (A.inCheck(S, S.turn)) v += S.turn === me ? -0.7 : 0.7;
    return v;
  }
  // 这一步是不是直接分出了胜负（斩帅、夺营）
  function decided(ch) {
    const S = ch.S;
    if (S.final) {
      for (const e of ch.ev) if (e.e === 'kill' && e.t === 'k') return other(e.s);
      const N = CFG.finalOccupyRounds;
      if (S.occ) { if (S.occ.r >= N) return 'r'; if (S.occ.b >= N) return 'b'; }
    }
    return null;
  }
  // 走子方无路可走：被将死，或者困毙（引擎里“只剩打不死的攻击”也算困毙）
  function stuck(S, kids) {
    if (!kids.length) return true;
    if (kids.length === 1 && kids[0].a.k === 'pass') return false;
    if (A.inCheck(S, S.turn)) return false;
    for (const k of kids) {
      if (k.a.k !== 'mv') continue;
      const q = S.board[k.a.to[1]][k.a.to[0]];
      if (!q || !k.S.board[k.a.to[1]][k.a.to[0]] || k.S.board[k.a.to[1]][k.a.to[0]].s === S.turn) return false;
    }
    return !kids.some(k => k.a.k === 'pass');
  }

  let nodes = 0, deadline = Infinity;
  const TIMEOUT = { timeout: true };
  // 负极大值 + αβ；depth 层之后停，width[ply] 限制每层只展开估值靠前的若干步
  function search(S, depth, alpha, beta, me, ply, width) {
    if ((++nodes & 63) === 0 && now() > deadline) throw TIMEOUT;
    const side = S.turn, sgn = side === me ? 1 : -1;
    if (depth <= 0) return sgn * score(S, me);
    let kids = A.expand(S);
    if (stuck(S, kids)) return -WIN + ply;
    for (const k of kids) { const w = decided(k); k.q = w ? (w === side ? WIN - ply : -WIN + ply) : sgn * score(k.S, me); k.done = !!w; }
    kids.sort((x, y) => y.q - x.q);
    const lim = width && width[ply]; if (lim && kids.length > lim) kids = kids.slice(0, lim);
    let best = -Infinity;
    for (const k of kids) {
      const v = k.done ? k.q : depth === 1 ? k.q : -search(k.S, depth - 1, -beta, -alpha, me, ply + 1, width);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  const LEVELS = {
    easy: { depth: 1, noise: 1.6, top: 3, up: 0.5, budget: 400 },
    mid: { depth: 2, noise: 0.35, top: 1, up: 1, budget: 1500 },
    // 霸王：先把每一步都看到“对方最强应对”，再把靠前的几步往下看到第四层（我 → 敌 → 我 → 敌），每层只展开估值靠前的若干步
    hard: { depth: 4, noise: 0.03, top: 1, up: 1, budget: 3800, roots: 12, width: [0, 12, 10, 0] },
  };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // 先决定要不要升级：挑“升完局面分涨得最多”的那一枚；想攒终极兵法时先不升
  function pickUpgrade(S, L) {
    if (S.upgraded || Math.random() > L.up) return null;
    const me = S.turn, U = CFG.ultimates;
    const ultLeft = S.used.ult[me] < U[me === 'r' ? 'simian' : 'hongmen'].usesPerGame;
    if (L.depth >= 4 && ultLeft && S.merit[me] >= U.cost - 7) return null;
    const base = score(S, me);
    let best = null;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== me || p.t === 'k') continue;
      const T = A.upgradeState(S, [f, r]); if (!T) continue;
      const gain = score(T, me) - base;
      if (gain > 0.25 && (!best || gain > best.gain)) best = { at: [f, r], S: T, gain };
    }
    return best;
  }
  // 根节点：返回一串要依次执行的行动（升级 → 拒马 → 主行动）
  async function think(S0, level, tick) {
    const L = LEVELS[level] || LEVELS.mid, t0 = now(), me = S0.turn, seq = [];
    let S = S0, last = now();
    const breathe = async () => { if (tick && now() - last > 10) { await tick(); last = now(); } };
    nodes = 0;
    const up = pickUpgrade(S, L);
    if (up) { seq.push({ k: 'up', at: up.at }); S = up.S; }
    let kids = A.expand(S);
    if (me === 'b' && L.depth >= 2) { try { kids = kids.concat(A.pofuPairs(S)); } catch (e) { } }
    if (!kids.length) return seq;
    for (const k of kids) { const w = decided(k); k.q = w ? (w === me ? WIN : -WIN) : score(k.S, me); k.done = !!w; k.v = k.q; }
    kids.sort((x, y) => y.q - x.q);
    if (L.depth >= 2) {
      // 第一遍：每一步都看对方的最强应对
      let alpha = -Infinity;
      for (const k of kids) {
        if (!k.done) k.v = -search(k.S, 1, -Infinity, -alpha + 2, me, 1, null);
        if (k.v > alpha) alpha = k.v;
        await breathe();
      }
      kids.sort((x, y) => y.v - x.v);
      // 第二遍（霸王）：靠前的几步再往下看两层（看到第四层），时间不够就停；最后只在看得深的那几步里挑
      if (L.depth >= 4) {
        const n = Math.min(kids.length, L.roots || 8);
        deadline = t0 + L.budget * 1.5;
        let alpha2 = -Infinity;
        for (let i = 0; i < n; i++) {
          if (now() - t0 > L.budget) break;
          const k = kids[i];
          try {
            if (!k.done && k.v > -WIN / 2) k.v = -search(k.S, 3, -Infinity, -alpha2 + 1.5, me, 1, L.width);
          } catch (e) { if (e !== TIMEOUT) throw e; break; }
          k.deep = true; if (k.v > alpha2) alpha2 = k.v;
          await breathe();
        }
        deadline = Infinity;
        const deep = kids.filter(k => k.deep);
        if (deep.length) { deep.sort((x, y) => y.v - x.v); kids = deep; }
      }
    }
    // 破釜沉舟每局只有一次：不比普通走法明显好就先不用
    const plain = kids.find(k => !(k.a.k === 'art' && k.a.steps));
    for (const k of kids) {
      k.w = k.v + (Math.random() * 2 - 1) * L.noise;
      if (k.a.k === 'art' && k.a.steps && plain && k.v < plain.v + 2.5 && k.v < WIN / 2) k.w -= 50;
    }
    const pool = kids.slice().sort((x, y) => y.w - x.w);
    let pick = pool[0];
    if (L.top > 1 && pool.length > 1 && Math.random() < 0.3) { const c = pool.slice(0, L.top).filter(k => k.v > pool[0].v - 2.5); pick = c[Math.floor(Math.random() * c.length)]; }
    // 拒马（不占行动）：走完这一步之后，哪枚能架拒马的兵会被对方打到，就先给它架上
    if (L.depth >= 2 && !pick.done && !S.freeUsed && pick.a.k !== 'pass') {
      try {
        const T = pick.S;
        let jm = null;
        for (let r = 0; r < 10 && !jm; r++) for (let f = 0; f < 9; f++) {
          const p = S.board[r][f]; if (!p || p.s !== me || p.t !== 'p' || p.lv < 3) continue;
          const q = T.board[r][f]; if (!q || q.id !== p.id) continue;                 // 这一步动的就是它
          let hit = false;
          for (let r2 = 0; r2 < 10 && !hit; r2++) for (let f2 = 0; f2 < 9; f2++) { const e = T.board[r2][f2]; if (e && e.s !== me && A.moveTargets(T, f2, r2).some(m => m.to[0] === f && m.to[1] === r)) { hit = true; break; } }
          if (!hit) continue;
          const J = A.jumaState(S, [f, r]);
          if (J && BF.attempt(J, pick.a)) { jm = { k: 'sk', at: [f, r] }; break; }
        }
        if (jm) seq.push(jm);
      } catch (e) { }
    }
    seq.push(pick.a);
    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length };
    return seq;
  }
  const BFAI = { think, score, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = BFAI; else global.BFAI = BFAI;
})(typeof window !== 'undefined' ? window : globalThis);
