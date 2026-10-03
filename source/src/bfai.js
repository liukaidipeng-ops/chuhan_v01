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
  // 一枚子本身值多少。血量最要紧：两点血的子要打两下才死、来犯的还会被弹回去，所以每多一点血都很值钱；
  //   反过来，被“打中没吃掉”掉一点血，也是实打实的损失（两血的车掉一血 = 丢了三分之一个子）
  //   士、相 / 象是守家的子，多一点血用处不大（平时出不了九宫、过不了河）；到决战解禁之后才和进攻子一样算
  const HPF = [0, 1, 1.5, 1.9, 2.2], HPF_DEF = [0, 1, 1.15, 1.28, 1.36];
  function baseVal(p) {
    const def = (p.t === 'a' || p.t === 'e') && !p.j;
    let v = VAL[p.t] * ((def ? HPF_DEF : HPF)[Math.min(4, Math.max(1, p.hp))] + (def ? 0.03 : 0.06) * (p.lv - 1));
    if (p.lv >= 3) v += def ? 0.4 : 0.9; if (p.lv >= 4) v += 0.9;   // 有技能、成名将
    return v + 0.14 * Math.min(6, p.xp || 0);                // 攒着的甲片
  }
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  function score(S, me) {
    const b = S.board, fin = !!S.final;
    let kr = null, kb = null;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k') { if (p.s === 'r') kr = [f, r]; else kb = [f, r]; } }
    let v = 0, attR = 0, attB = 0;                          // attR / attB：压到对方主帅跟前的汉 / 楚进攻子
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
        if (dk <= 4 && (p.t === 'r' || p.t === 'c' || p.t === 'n' || (p.t === 'p' && adv >= 5))) { if (s === 'r') attR++; else attB++; }
      }
      v += s === me ? x : -x;
    }
    v += 0.3 * (S.merit[me] - S.merit[other(me)]);           // 军功能换成血量和等级
    // 还没用的主帅兵法留着有价值（免得为了一个兵就把「召回良将」用掉）
    //   召回良将是汉军对付“被换掉一个大子”的保险，破釜沉舟是楚军的一次连击：都算一笔不小的本钱
    const art = s => (S.used.art[s] ? 0 : s === 'r' ? 4 : 3);
    v += art(me) - art(other(me));
    const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
    // 终极兵法生效中：值多少看有多少进攻子已经压在对方主帅跟前（没人跟上，困住对方也白搭）
    if (sm) v += (me === 'r' ? 1 : -1) * sm * (1.5 + 0.6 * Math.min(4, attR));
    if (hm) v += (me === 'b' ? 1 : -1) * hm * (0.35 + 0.55 * Math.min(4, attB));
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
  let nodeCap = Infinity;   // 测试用的“按搜索量收手”：搜过这么多节点就停（LEVELS.<档>.nodes），不看时间，结果可复现
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
    if (++nodes > nodeCap || ((nodes & 63) === 0 && now() > deadline)) throw TIMEOUT;
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
  let upPly = -1;   // 在第几层考虑“对方先升级再走”（-1 = 不考虑）
  // 负极大值 + αβ（分数总是站在走子方看）
  function ab(S, depth, alpha, beta, ply) {
    if (++nodes > nodeCap || ((nodes & 63) === 0 && now() > deadline)) throw TIMEOUT;
    const side = S.turn, inChk = A.inCheck(S, side);
    if (depth <= 0) {
      if (inChk && ply < 8) depth = 1;          // 被将军时不能“站着不动”估值：再往下应一步
      else return qs(S, alpha, beta, ply, 0);
    }
    if (fewPieces(S) && stuck(S)) return -WIN + ply;
    let best = -INF, legal = 0;
    // 对方应这一步时，也可能先花军功给某枚子升一级再走（多一点血：我方本来能吃掉的子就吃不掉了，打上去还会被弹回）
    if (ply === upPly && !S.upgraded) {
      const base = score(S, side), ups = [];
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
        const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k') continue;
        const T = A.upgradeState(S, [f, r]); if (T) ups.push({ S: T, g: score(T, side) - base });
      }
      ups.sort((x, y) => y.g - x.g);
      for (const u of ups.slice(0, 3)) {
        const v = ab(u.S, depth, alpha, beta, ply);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) return best;
      }
    }
    const list = order(A.gen(S, false), killers[ply]);
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
    hard: { depth: 7, q: 4, noise: 0.05, top: 1, up: 1, budget: 3000 },
  };

  // 压在对方主帅跟前的进攻子数（和估值里的 attR / attB 同一个算法）
  function pressure(S, side) {
    let k = null, n = 0;
    for (let r = 0; r < 10 && !k; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.t === 'k' && p.s !== side) { k = [f, r]; break; } }
    if (!k) return 0;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== side) continue;
      const adv = side === 'r' ? r : 9 - r;
      if (Math.abs(f - k[0]) + Math.abs(r - k[1]) <= 4 && (p.t === 'r' || p.t === 'c' || p.t === 'n' || (p.t === 'p' && adv >= 5))) n++;
    }
    return n;
  }
  // 先决定要不要升级：把“不升”和每一种升法都往下搜几步比一比——
  //   升一级多一点血、还回满血：正被捉的子升了就打不死，来犯的反而被弹回去；这种只有搜了才知道
  function pickUpgrade(S, L) {
    if (S.upgraded || Math.random() > L.up) return null;
    const me = S.turn, U = CFG.ultimates;
    // 攒终极兵法：只在已经有两枚以上进攻子压到对方主帅跟前时才攒，否则军功拿去升级
    const ultLeft = S.used.ult[me] < U[me === 'r' ? 'simian' : 'hongmen'].usesPerGame;
    if (L.depth >= 3 && ultLeft && S.merit[me] >= U.cost - 6 && pressure(S, me) >= 2) return null;
    const base = score(S, me), cand = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== me || p.t === 'k') continue;
      const T = A.upgradeState(S, [f, r]); if (!T) continue;
      cand.push({ at: [f, r], S: T, gain: score(T, me) - base });
    }
    if (!cand.length) return null;
    cand.sort((x, y) => y.gain - x.gain);
    if (L.depth < 2) { const c = cand.find(x => S.final || !'ae'.includes(S.board[x.at[1]][x.at[0]].t)); return c && c.gain > 0.25 ? c : null; }
    // 军功前期很紧，只能靠杀子挣：先紧着车（其次炮、马）升。车还能升、军功再攒一点就够时，
    //   别的子先不升——除非不升就要丢子（搜下来差出一大截）；士、相 / 象平时只在保命时才升
    const d = 2, pieceAt = c => S.board[c.at[1]][c.at[0]];
    let rookNeed = 0;
    for (const row of S.board) for (const p of row) if (p && p.s === me && p.t === 'r' && p.lv < BF.maxLvOf('r')) { const c = A.upCost(p); if (c > S.merit[me] && (!rookNeed || c < rookNeed)) rookNeed = c; }
    const saving = rookNeed && rookNeed - S.merit[me] <= 3;
    const bv0 = ab(S, d, -INF, INF, 0);
    let best = null, bv = bv0;
    for (const c of cand.slice(0, 6)) {
      const p = pieceAt(c), defender = (p.t === 'a' || p.t === 'e') && !S.final;
      const need = defender || (saving && p.t !== 'r') ? 1.8 : 0.05;     // 守子、或者正在给车攒军功：要“明显更好”才升
      const v = ab(c.S, d, bv0 + need - 0.01, INF, 0);
      if (v >= bv0 + need && v > bv + 0.05) { bv = v; best = c; }
    }
    return best;
  }
  // 根节点：返回一串要依次执行的行动（升级 → 拒马 → 主行动）
  async function think(S0, level, tick) {
    const L0 = LEVELS[level] || LEVELS.mid, t0 = now(), me = S0.turn, seq = [];
    const L = tick ? { ...L0, budget: Math.min(L0.budget, 1400) } : L0;   // 在主线程里算（开不了 Worker）时少想一会儿，免得卡画面
    let S = S0, last = now();
    const breathe = async () => { if (tick && now() - last > 12) { await tick(); last = now(); } };
    nodes = 0; qMax = L.q; hist.clear(); killers.length = 0; upPly = -1; deadline = Infinity; nodeCap = Infinity;
    const byNodes = L.nodes > 0;   // 设了 nodes：按搜索量收手，完全不看时间（对打、考卷、漏着率用，机器快慢不影响结果）
    const up = pickUpgrade(S, L);
    if (up) { seq.push({ k: 'up', at: up.at }); S = up.S; }
    if (L.depth >= 3) upPly = 1;
    let kids = A.expand(S), pofu = [];
    // 破釜沉舟（楚）：只留“连走两步能明显赚到子”的组合（比如先挪开再吃车），交给后面的搜索去核对值不值
    if (me === 'b' && L.depth >= 2) {
      try {
        const base = score(S, me);
        pofu = A.pofuPairs(S).map(k => { k.gain = score(k.S, me) - base; return k; }).filter(k => k.gain >= 4.5 || decided(k.S, k.ev) === me);
        pofu.sort((x, y) => y.gain - x.gain); pofu = pofu.slice(0, 8);
      } catch (e) { pofu = []; }
    }
    // 召回良将（汉）：每局只有一次，是对付“被换掉一个大子”的保险——有车在场时只肯拿来救车；
    //   车都没了、或者楚军的破釜沉舟已经用掉，才肯救炮和马；士象兵不救。实在别无出路时不受此限
    if (me === 'r') {
      const tOf = id => { const d = S.dead.r.find(x => x.id === id); return d ? d.t : ''; };
      let rook = false; for (const row of S.board) for (const p of row) if (p && p.s === 'r' && p.t === 'r') rook = true;
      const ok = k => { const t = tOf(k.a.id); return t === 'r' || ((!rook || S.used.art.b > 0) && (t === 'c' || t === 'n')); };
      const rest = kids.filter(k => !(k.a.k === 'art' && k.a.id != null) || ok(k));
      if (rest.some(k => k.a.k !== 'art')) kids = rest;
    }
    if (!kids.length) return seq;
    for (const k of kids) { const w = decided(k.S, k.ev); k.done = !!w; k.q = w ? (w === me ? WIN : -WIN) : score(k.S, me); k.v = k.q; }
    kids.sort((x, y) => y.q - x.q);
    let depthDone = 0;
    const n0 = nodes;
    // 逐层加深：每一层都把上一层最好的着法排在最前面先算
    for (let d = 1; d <= L.depth; d++) {
      const soft = t0 + L.budget;
      if (byNodes) {
        // 前两层一定算完（保证有着可走）；再往下每一层开始前看剩下的搜索量够不够，算到上限就停
        if (d > 2 && nodes - n0 > L.nodes * 0.5) break;
        nodeCap = d <= 2 ? Infinity : n0 + L.nodes;
      } else {
        if (d > 3 && now() - t0 > L.budget * 0.3) break;       // 剩下的时间不够再深一层了
        deadline = d <= 3 ? Infinity : soft + L.budget * 0.3;
      }
      let alpha = -INF, n = 0, cut = false;
      const M = L.noise * 1.6 + 0.02;                          // 比当前最好的差不到 M 的着法也算出准确分数（最后要在它们之间挑）；更差的只要个上界
      try {
        for (const k of kids) {
          k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1);
          if (k.nv > alpha) alpha = k.nv;
          n++;
          await breathe();
          if (!byNodes && d > 3 && now() > soft) { cut = true; break; }
        }
      } catch (e) { if (e !== TIMEOUT) throw e; cut = true; }
      deadline = Infinity; nodeCap = Infinity;
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
    const bestV = kids[0].v;
    for (const k of kids) {
      // 只在分数算准了的那几步（和最好的差不到 M）之间加一点随机；其余的分数只是上界，不能拿来比
      k.w = k.v > bestV - (L.noise * 1.6 + 0.02) * 0.95 ? k.v + (Math.random() * 2 - 1) * L.noise : k.v - 100;
    }
    const pool = kids.slice().sort((x, y) => y.w - x.w);
    let pick = pool[0];
    if (L.top > 1 && pool.length > 1 && Math.random() < 0.3) { const c = pool.slice(0, L.top).filter(k => k.w > -50); pick = c[Math.floor(Math.random() * c.length)]; }
    // 破釜沉舟每局只有一次：留着杀车这样的大子——同样的深度下，比最好的普通走法多赚不到一个大子的量就先不用
    //   （对方的召回良将还在手里时，杀了车也会被救回来，搜索里算得到，自然就不急着用）
    if (pofu.length && bestV < WIN / 2) {
      const PF_MIN = 5, need = bestV + PF_MIN, d1 = Math.max(1, depthDone) - 1;
      let bp = null;
      if (byNodes) nodeCap = nodes + Math.round(L.nodes * 0.4); else deadline = now() + Math.max(400, L.budget * 0.4);
      try {
        for (const k of pofu) {
          const w = decided(k.S, k.ev);
          k.v = w ? (w === me ? WIN : -WIN) : -ab(k.S, d1, -INF, -need + 0.01, 1);
          if (k.v >= need && (!bp || k.v > bp.v)) bp = k;
          await breathe();
        }
      } catch (e) { if (e !== TIMEOUT) throw e; }
      deadline = Infinity; nodeCap = Infinity;
      if (bp) { pick = bp; kids = kids.concat([bp]); }
    }
    // 汉军防着楚军的破釜沉舟：保险（召回良将）已经用掉、对方的连击还在手里时，
    //   先看看选中的这一步会不会被“连走两步”白吃掉一个大子；会的话，在前几名里换一步吃亏最少的
    if (me === 'r' && L.depth >= 2 && !S.used.art.b && !pick.done) {
      try {
        const risk = k => {
          if (k.risk != null) return k.risk;
          if (!k.S.used.art.r || k.S.turn !== 'b') return (k.risk = 0);
          const base = score(k.S, me); let worst = base;
          for (const pp of A.pofuPairs(k.S)) { const w = decided(pp.S, pp.ev); const x = w ? (w === me ? WIN : -WIN) : score(pp.S, me); if (x < worst) worst = x; }
          return (k.risk = base - worst);
        };
        if (risk(pick) >= 5) {
          const cand = kids.filter(k => !k.done && k !== pick).slice(0, 6);
          const d2 = Math.max(1, Math.min(depthDone, 3) - 1);
          let bestK = pick, bestAdj = pick.v - (risk(pick) - 2) * 0.75;
          for (const k of cand) {
            const exact = -ab(k.S, d2, -INF, INF, 1);
            const adj = exact - Math.max(0, risk(k) - 2) * 0.75;
            if (adj > bestAdj) { bestAdj = adj; bestK = k; k.v = exact; }
            await breathe();
          }
          pick = bestK;
        }
      } catch (e) { if (e !== TIMEOUT) throw e; }
    }
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
  // apiVersion：这份电脑用到的 BF.ai 接口版本（BF.ai.version）；工具拉历史版本对打时拿它核对
  const BFAI = { think, score, LEVELS, apiVersion: 1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = BFAI; else global.BFAI = BFAI;
})(typeof window !== 'undefined' ? window : globalThis);
