// ===== 技能模式的电脑 =====
// 全宽 αβ 搜索（逐层加深、按时间收手）+ 吃子静态搜索（把“这一步之后谁的子会被白吃”算清楚）+ 带位置感的估值；
// 升级、拒马、主帅兵法、终极兵法另有各自的判断。整份代码既在页面里跑，也原样放进 Web Worker。
(function (global) {
  const BF = global.BF || require('./bingfa.js');
  const A = BF.ai, CFG = BF.CFG;
  const other = s => (s === 'r' ? 'b' : 'r');
  const WIN = 9000, INF = 1e9;
  const VAL = { r: 9, c: 4.6, n: 4.2, e: 2.3, a: 2.1, p: 1.1, k: 0 };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // ---------- 估值 ----------
  // 一枚子本身值多少：兵种 × 等级 × 血量
  function baseVal(p) {
    const mx = BF.hpOf(p.t, p.lv) || 1;
    let v = VAL[p.t] * (1 + 0.36 * (p.lv - 1)) * (0.55 + 0.45 * Math.min(1, p.hp / mx));
    if (p.lv >= 3) v += 0.9; if (p.lv >= 4) v += 0.9;        // 有技能、成名将
    return v + 0.14 * Math.min(6, p.xp || 0);                // 攒着的甲片
  }
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  function score(S, me) {
    const b = S.board, fin = !!S.final;
    let kr = null, kb = null;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k') { if (p.s === 'r') kr = [f, r]; else kb = [f, r]; } }
    let v = 0;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = b[r][f]; if (!p) continue;
      const s = p.s, adv = s === 'r' ? r : 9 - r, ek = s === 'r' ? kb : kr;
      let x;
      if (p.t === 'k') {
        if (fin) { const inside = f >= 3 && f <= 5 && adv >= 7; x = 6 + p.hp * 5 + adv * 0.35 + (inside ? 2.5 : 0) - Math.abs(f - 4) * 0.15; }
        else x = -0.22 * adv - (f !== 4 ? 0.12 : 0);          // 平时主帅老实待在原位
      } else {
        x = baseVal(p);
        const dk = ek ? Math.abs(f - ek[0]) + Math.abs(r - ek[1]) : 9;
        switch (p.t) {
          case 'r': x += (adv > 0 || (f !== 0 && f !== 8) ? 0.3 : 0) + 0.03 * Math.min(adv, 6) + (ek && (f === ek[0] || r === ek[1]) ? 0.35 : 0) + 0.04 * Math.max(0, 8 - dk); break;
          case 'c': x += (ek && f === ek[0] ? 0.4 : 0) + (f === 4 ? 0.12 : 0) + (adv >= 1 && adv <= 4 ? 0.1 : 0) + 0.02 * Math.max(0, 8 - dk); break;
          case 'n': x += (adv >= 1 ? 0.3 : 0) + 0.04 * Math.min(adv, 6) + 0.06 * Math.max(0, 7 - dk) - (f === 0 || f === 8 ? 0.15 : 0); break;
          case 'p': x += (adv >= 5 ? 0.55 + (adv - 5) * 0.12 + 0.05 * Math.max(0, 5 - dk) : adv === 4 ? 0.12 : 0) + (f === 4 ? 0.08 : 0); break;
          default: if (fin) x += adv * 0.12 + 0.05 * Math.max(0, 8 - dk);   // 决战里士象也要压上去
        }
        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;
      }
      v += s === me ? x : -x;
    }
    v += 0.2 * (S.merit[me] - S.merit[other(me)]);
    // 还没用的主帅兵法留着有价值（免得为了一个兵就把「召回良将」用掉）
    const art = s => (S.used.art[s] ? 0 : s === 'r' ? (S.dead.r.length ? 3 : 1.2) : 2);
    v += art(me) - art(other(me));
    const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
    if (sm) v += (me === 'r' ? 1 : -1) * (1.5 + sm * 2.2);
    if (hm) v += (me === 'b' ? 1 : -1) * (1 + hm * 1.6);
    if (fin && S.occ) v += 7 * ((S.occ[me] || 0) - (S.occ[other(me)] || 0));
    return v;
  }
  // 这一步是不是直接分出了胜负（斩帅、夺营）
  function decided(S, ev) {
    if (!S.final) return null;
    for (const e of ev) if (e.e === 'kill' && e.t === 'k') return other(e.s);
    const N = CFG.finalOccupyRounds;
    if (S.occ) { if (S.occ.r >= N) return 'r'; if (S.occ.b >= N) return 'b'; }
    return null;
  }
  // 走子方已经无路可走（将死或困毙；引擎里“只剩打不死的攻击”也算困毙）。只在子很少的残局里细查
  function stuck(S) {
    const kids = A.expand(S);
    if (!kids.length) return true;
    if (kids.length === 1 && kids[0].a.k === 'pass') return false;
    if (A.inCheck(S, S.turn)) return false;
    for (const k of kids) {
      if (k.a.k !== 'mv') continue;
      const q = S.board[k.a.to[1]][k.a.to[0]], q2 = k.S.board[k.a.to[1]][k.a.to[0]];
      if (!q || !q2 || q2.s === S.turn) return false;
    }
    return !kids.some(k => k.a.k === 'pass');
  }
  const fewPieces = S => { let n = 0; for (const row of S.board) for (const p of row) if (p && p.s === S.turn) n++; return n <= 4; };

  // ---------- 搜索 ----------
  let nodes = 0, deadline = Infinity, qMax = 3;
  const TIMEOUT = { timeout: true };
  const hist = new Map();                     // 历史启发：哪些安静着法以前造成过剪枝
  const hk = a => (a.k === 'mv' ? a.from[0] + a.from[1] * 9 + (a.to[0] + a.to[1] * 9) * 90 : -1);
  function order(list, killer) {
    for (const it of list) {
      let w = 0;
      if (it.q) { const lethal = it.p && it.q.hp <= A.atk(it.p); w = 1000 + 10 * baseVal(it.q) * (lethal || it.sk ? 1 : 0.45) - (it.p ? VAL[it.p.t] : 0) + (it.q.t === 'k' ? 500 : 0); }
      else if (it.art) w = 600 + VAL[it.art] * 10;
      else if (it.ult) w = 500;
      else if (it.sk) w = 200;
      else { const k = hk(it.a); w = (killer && k === killer ? 400 : 0) + (hist.get(k) || 0); }
      it.w = w;
    }
    list.sort((x, y) => y.w - x.w);
    return list;
  }
  // 吃子静态搜索：只接着算“打到敌子”的着法，直到局面安静下来
  function qs(S, alpha, beta, ply, qd) {
    if ((++nodes & 63) === 0 && now() > deadline) throw TIMEOUT;
    const side = S.turn;
    const stand = score(S, side);
    if (qd >= qMax) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const caps = order(A.gen(S, true));
    let best = stand, n = 0;
    for (const it of caps) {
      if (n >= 6) break;
      const r = BF.attempt(S, it.a); if (!r || r.free) continue;
      n++;
      const w = decided(r.S, r.ev);
      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -qs(r.S, -beta, -alpha, ply + 1, qd + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  const killers = [];
  // 负极大值 + αβ（分数总是站在走子方看）
  function ab(S, depth, alpha, beta, ply) {
    if ((++nodes & 63) === 0 && now() > deadline) throw TIMEOUT;
    const side = S.turn, inChk = A.inCheck(S, side);
    if (depth <= 0) {
      if (inChk && ply < 8) depth = 1;          // 被将军时不能“站着不动”估值：再往下应一步
      else return qs(S, alpha, beta, ply, 0);
    }
    if (fewPieces(S) && stuck(S)) return -WIN + ply;
    const list = order(A.gen(S, false), killers[ply]);
    let best = -INF, legal = 0;
    for (const it of list) {
      const r = BF.attempt(S, it.a); if (!r || r.free) continue;
      legal++;
      const w = decided(r.S, r.ev);
      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!it.q && it.a.k === 'mv') { const k = hk(it.a); killers[ply] = k; hist.set(k, Math.min(300, (hist.get(k) || 0) + depth * depth)); }
        break;
      }
    }
    if (!legal) {
      const r = BF.attempt(S, { k: 'pass' });
      if (!r) return -WIN + ply;                // 将死 / 困毙
      return -ab(r.S, depth - 1, -beta, -alpha, ply + 1);
    }
    return best;
  }

  // 新兵只看一步（但会把吃子算清）；校尉看两步；霸王逐层加深，能看多深看多深（至少三步），到点收手
  const LEVELS = {
    easy: { depth: 1, q: 2, noise: 1.3, top: 3, up: 0.5, budget: 500 },
    mid: { depth: 3, q: 3, noise: 0.3, top: 1, up: 1, budget: 2500 },
    hard: { depth: 7, q: 4, noise: 0.05, top: 1, up: 1, budget: 3800 },
  };

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
    const L0 = LEVELS[level] || LEVELS.mid, t0 = now(), me = S0.turn, seq = [];
    const L = tick ? { ...L0, budget: Math.min(L0.budget, 1400) } : L0;   // 在主线程里算（开不了 Worker）时少想一会儿，免得卡画面
    let S = S0, last = now();
    const breathe = async () => { if (tick && now() - last > 12) { await tick(); last = now(); } };
    nodes = 0; qMax = L.q; hist.clear(); killers.length = 0;
    const up = pickUpgrade(S, L);
    if (up) { seq.push({ k: 'up', at: up.at }); S = up.S; }
    let kids = A.expand(S);
    if (me === 'b' && L.depth >= 2) { try { kids = kids.concat(A.pofuPairs(S)); } catch (e) { } }
    if (!kids.length) return seq;
    for (const k of kids) { const w = decided(k.S, k.ev); k.done = !!w; k.q = w ? (w === me ? WIN : -WIN) : score(k.S, me); k.v = k.q; }
    kids.sort((x, y) => y.q - x.q);
    let depthDone = 0;
    // 逐层加深：每一层都把上一层最好的着法排在最前面先算
    for (let d = 1; d <= L.depth; d++) {
      const soft = t0 + L.budget;
      if (d > 3 && now() - t0 > L.budget * 0.3) break;       // 剩下的时间不够再深一层了
      deadline = d <= 3 ? Infinity : soft + L.budget * 0.3;
      let alpha = -INF, n = 0, cut = false;
      const M = L.noise * 1.6 + 0.02;                          // 比当前最好的差不到 M 的着法也算出准确分数（最后要在它们之间挑）；更差的只要个上界
      try {
        for (const k of kids) {
          k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1);
          if (k.nv > alpha) alpha = k.nv;
          n++;
          await breathe();
          if (d > 3 && now() > soft) { cut = true; break; }
        }
      } catch (e) { if (e !== TIMEOUT) throw e; cut = true; }
      deadline = Infinity;
      if (cut) {
        // 这一层没算完：先算的是上一层最好的那步；算完的里头要是有更好的，就改用它
        const doneK = kids.slice(0, n);
        if (doneK.length) {
          const head = kids[0], better = doneK.slice().sort((x, y) => y.nv - x.nv)[0];
          if (better !== head && better.nv > head.nv) better.v = head.v + 0.01;
        }
        for (const k of kids) k.nv = null;
        kids.sort((x, y) => y.v - x.v);
        break;
      }
      for (const k of kids) { k.v = k.nv; k.nv = null; }
      kids.sort((x, y) => y.v - x.v);
      depthDone = d;
      if (kids[0].v > WIN / 2 || kids[0].v < -WIN / 2) break; // 已经看到杀棋 / 必败，不用再深
    }
    // 破釜沉舟每局只有一次：不比普通走法明显好就先不用
    const plain = kids.find(k => !(k.a.k === 'art' && k.a.steps));
    const bestV = kids[0].v;
    for (const k of kids) {
      // 只在分数算准了的那几步（和最好的差不到 M）之间加一点随机；其余的分数只是上界，不能拿来比
      k.w = k.v > bestV - (L.noise * 1.6 + 0.02) * 0.95 ? k.v + (Math.random() * 2 - 1) * L.noise : k.v - 100;
      if (k.a.k === 'art' && k.a.steps && plain && k.v < plain.v + 2.5 && k.v < WIN / 2) k.w -= 50;
    }
    const pool = kids.slice().sort((x, y) => y.w - x.w);
    let pick = pool[0];
    if (L.top > 1 && pool.length > 1 && Math.random() < 0.3) { const c = pool.slice(0, L.top).filter(k => k.w > -50); pick = c[Math.floor(Math.random() * c.length)]; }
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
    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone, top: kids.slice(0, 5).map(k => [k.a, +k.v.toFixed(2)]) };
    return seq;
  }
  const BFAI = { think, score, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = BFAI; else global.BFAI = BFAI;
})(typeof window !== 'undefined' ? window : globalThis);
