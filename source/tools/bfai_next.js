// ===== 技能模式的电脑（改进版，独立文件，不改 src/ 下的任何文件）=====
// 用法和 src/bfai.js 一样：BFAI.think(S, level) → 行动序列；tools/bfsim.js --ai tools/bfai_next.js 拿它模拟，tools/bfai_exam.js 考它。
// 全宽 αβ 搜索（逐层加深、按时间收手）+ 吃子静态搜索 + 带位置感的估值。整份代码既在页面里跑，也原样放进 Web Worker。
// 这套棋的要害是“血量 + 打不死就弹回 + 升级不占行动”，所以：
//   · 升级放进搜索里：双方都会“先升级再出手”（吃子的那枚多 1 血就扛得住回吃；士升二级攻击变 2），
//     被打的子会升级保命——电脑既会用这招，也看得穿对方的这招；
//   · 子力按血量算：每多 1 点血按兵种价值加价；军功按“能换来什么”算价，所以相、士这类防守子平时不值得升，
//     军功留给车马炮；前期靠吃子攒军功；
//   · 召回良将留给车；破釜沉舟要换到够本才用；电脑执汉时防着楚“连走两步”；终极兵法看局面才放。
(function (global) {
  const BF = global.BF || require('../src/bingfa.js');
  const A = BF.ai, CFG = BF.CFG;
  const other = s => (s === 'r' ? 'b' : 'r');
  const WIN = 9000, INF = 1e9;
  const VAL = { r: 9, c: 4.6, n: 4.2, e: 2.3, a: 2.1, p: 1.1, k: 0 };
  // 每多 1 点血，子力涨兵种价值的几成。相、士是守家的，多一点血用处不大（决战里它们要冲锋，另算）
  const HPW = { r: 0.45, c: 0.45, n: 0.45, p: 0.45, a: 0.12, e: 0.12, k: 0 };
  // 三级解锁的兵种技能、四级的被动各值多少（相、士的技能多半是守家用的）
  const SK3 = { r: 0.8, n: 0.6, c: 0.8, p: 0.4, a: 0.25, e: 0.1, k: 0 };
  const SK4 = { r: 0.3, p: 0.8, a: 0.15, e: 0.3, n: 0, c: 0, k: 0 };
  const MERIT = 0.3;          // 一点军功的价值（≈ 车升二级的价钱 6 功 ≈ 1.8，换来 +4 子力）
  const GUARD_PLY = 2;        // 搜索前几层考虑“被打的子升级保命”
  const POFU_PLY = 1;         // 搜索第几层考虑对方的破釜沉舟（电脑执汉时防着楚连走两步）
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const atkAt = (t, lv) => (t === 'k' ? 1 : ((CFG.attack[t] || [])[lv - 1] || 1));
  const ultName = s => (s === 'r' ? 'simian' : 'hongmen');
  const ultLeft = (S, s) => S.used.ult[s] < CFG.ultimates[ultName(s)].usesPerGame;

  // ---------- 估值 ----------
  // 一枚子本身值多少：兵种 × 血量 + 攻击力 + 技能 + 攒着的甲片
  function baseVal(p, fin) {
    const w = fin && (p.t === 'a' || p.t === 'e') ? 0.45 : HPW[p.t];
    let v = VAL[p.t] * (1 + w * (p.hp - 1));
    if (atkAt(p.t, p.lv) >= 2) v += fin ? 0.6 : 0.15;     // 二级起的士一刀扣 2 血
    if (p.lv >= 3) v += SK3[p.t];
    if (p.lv >= 4) v += SK4[p.t];
    return v + 0.14 * Math.min(6, p.xp || 0);
  }
  // 军功：每点 MERIT；终极兵法还没用、离发动差 6 功以内时，再攒的军功更值钱（别为一点小升级把大招拖没了）
  function meritVal(S, s) {
    const m = S.merit[s], c = CFG.ultimates.cost;
    let v = MERIT * m;
    if (ultLeft(S, s)) v += 0.2 * Math.max(0, Math.min(m, c) - (c - 6));
    return v;
  }
  // 主帅兵法留着的价值：召回良将留给车（车都在场时，留着比复活一匹马、一门炮更值）；破釜沉舟要换到够本才用
  function artVal(S, s, rookAlive) {
    const G = CFG.generalArts;
    if (s === 'r') {
      if (S.used.art.r >= G.xiaohe.usesPerGame) return 0;
      let best = 0;
      for (const d of S.dead.r) { const st = BF.START[d.id]; if (st && !S.board[st[1]][st[0]]) best = Math.max(best, VAL[d.t]); }
      return Math.max(rookAlive ? 5.2 : 2, 0.65 * best);   // 车阵亡：复活它净赚三点多，马上用；只死了马炮：留着
    }
    return S.used.art.b >= G.pofu.usesPerGame ? 0 : 3.5;
  }
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  function score(S, me) {
    const b = S.board, fin = !!S.final;
    let kr = null, kb = null;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k') { if (p.s === 'r') kr = [f, r]; else kb = [f, r]; } }
    let v = 0, rookR = false, nearR = 0, nearB = 0, guardR = false;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = b[r][f]; if (!p) continue;
      const s = p.s, adv = s === 'r' ? r : 9 - r, ek = s === 'r' ? kb : kr;
      let x;
      if (p.t === 'k') {
        if (fin) { const inside = f >= 3 && f <= 5 && adv >= 7; x = 6 + p.hp * 5 + adv * 0.35 + (inside ? 2.5 : 0) - Math.abs(f - 4) * 0.15; }
        else x = -0.22 * adv - (f !== 4 ? 0.12 : 0);          // 平时主帅老实待在原位
      } else {
        x = baseVal(p, fin);
        const dk = ek ? Math.abs(f - ek[0]) + Math.abs(r - ek[1]) : 9;
        switch (p.t) {
          case 'r': x += (adv > 0 || (f !== 0 && f !== 8) ? 0.3 : 0) + 0.03 * Math.min(adv, 6) + (ek && (f === ek[0] || r === ek[1]) ? 0.35 : 0) + 0.04 * Math.max(0, 8 - dk); break;
          case 'c': x += (ek && f === ek[0] ? 0.4 : 0) + (f === 4 ? 0.12 : 0) + (adv >= 1 && adv <= 4 ? 0.1 : 0) + 0.02 * Math.max(0, 8 - dk); break;
          case 'n': x += (adv >= 1 ? 0.3 : 0) + 0.04 * Math.min(adv, 6) + 0.06 * Math.max(0, 7 - dk) - (f === 0 || f === 8 ? 0.15 : 0); break;
          case 'p': x += (adv >= 5 ? 0.55 + (adv - 5) * 0.12 + 0.05 * Math.max(0, 5 - dk) : adv === 4 ? 0.12 : 0) + (f === 4 ? 0.08 : 0); break;
          default: if (fin) x += adv * 0.12 + 0.05 * Math.max(0, 8 - dk);   // 决战里士象也要压上去
        }
        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;
        if (p.t === 'r' && s === 'r') rookR = true;
        if (p.t === 'a' && s === 'r' && p.lv >= 3 && !p.j && f >= 3 && f <= 5 && r <= 2) guardR = true;   // 能护驾的汉士
        // 压在对方主帅身边的进攻子（终极兵法的威力看它们）
        if ('rncp'.includes(p.t) && (p.t !== 'p' || adv >= 5)) { if (s === 'r' && dk <= 4) nearR++; if (s === 'b' && dk <= 5) nearB++; }
      }
      v += s === me ? x : -x;
    }
    v += meritVal(S, me) - meritVal(S, other(me));
    v += artVal(S, me, me === 'r' && rookR) - artVal(S, other(me), other(me) === 'r' && rookR);
    // 终极兵法生效中：鸿门宴（汉帅不能动）看楚军有几枚进攻子压过来；四面楚歌（楚军涣散）看汉军围了几枚
    const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
    if (sm) v += (me === 'r' ? 1 : -1) * sm * (2 + Math.min(4, nearR));
    if (hm) v += (me === 'b' ? 1 : -1) * hm * (0.6 + Math.min(4, nearB));
    // 楚军快攒够鸿门宴了，汉方九宫里没有能护驾的三级士：先记着这份危险
    if (!fin && !hm && ultLeft(S, 'b') && S.merit.b >= CFG.ultimates.cost - 4 && !guardR) v += (me === 'r' ? -1 : 1) * (0.6 + 0.4 * Math.min(4, nearB));
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

  // ---------- 升级 ----------
  const canUp = (S, p) => !!p && p.t !== 'k' && p.lv < BF.maxLvOf(p.t) && S.merit[p.s] >= A.upCost(p);
  // 升一级之后这枚子是不是更扛打（升级回满血）或更能打
  const upHelps = p => BF.hpOf(p.t, p.lv + 1) > p.hp || atkAt(p.t, p.lv + 1) > atkAt(p.t, p.lv);
  const posOf = a => (a.k === 'mv' ? a.from : a.at);
  // 对方下一步能打到我方哪些子、最多扣几点（id → 伤害）
  function threatMap(S, side) {
    const V = Object.assign({}, S, { turn: other(side), freeUsed: false, upgraded: false });
    const m = new Map();
    for (const it of A.gen(V, true)) {
      const q = it.q; if (!q || q.s !== side || q.t === 'k') continue;
      const d = it.sk === 'qishe' || it.sk === 'chongzhen' ? 1 : A.atk(it.p);
      if ((m.get(q.id) || 0) < d) m.set(q.id, d);
    }
    return m;
  }
  // “升级保命”的候选：会被一下打死、升一级（回满血）就扛得住的子，贵的优先
  function guardUps(S, side, max) {
    if (S.upgraded || S.freeUsed) return [];
    const T = threatMap(S, side), out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== side) continue;
      const d = T.get(p.id); if (!d || p.hp > d || !canUp(S, p) || BF.hpOf(p.t, p.lv + 1) <= d) continue;
      out.push({ at: [f, r], p, w: baseVal(p, S.final) });
    }
    return out.sort((x, y) => y.w - x.w).slice(0, max);
  }
  const pofuLeft = S => S.turn === 'b' && !S.freeUsed && S.used.art.b < CFG.generalArts.pofu.usesPerGame && !(S.cnt.b < S.fx.sm);
  // 破釜沉舟两步组合，至少一步打到敌子：“吃了就撤”“挪开挡路的子再吃车”都在内（只在电脑自己拿主意时用，组合多）
  const bPieces = T => { const L = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'b' && p.t !== 'k') L.push([f, r]); } for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'b' && p.t === 'k') L.push([f, r]); } return L; };
  // 第一步之后的棋盘：借普通走子结算一下（只看棋子落在哪，第二步能怎么走跟军功、换手无关），再交回楚方
  const afterStep = (S, m) => { const r1 = BF.attempt(S, { k: 'mv', from: m.from, to: m.to }); return r1 ? Object.assign({}, r1.S, { turn: 'b' }) : null; };
  const pair = (m1, m2) => ({ k: 'art', steps: [{ from: m1.from, to: m1.to }, { from: m2.from, to: m2.to }] });
  function pofuWide(S) {
    if (!pofuLeft(S)) return [];
    const out = [];
    for (const [f, r] of bPieces(S)) for (const m1 of A.moveTargets(S, f, r)) {
      const hit1 = !!S.board[m1.to[1]][m1.to[0]];
      const V = afterStep(S, m1); if (!V) continue;
      for (const [f2, r2] of bPieces(V)) for (const m2 of A.moveTargets(V, f2, r2)) {
        if (!hit1 && !V.board[m2.to[1]][m2.to[0]]) continue;
        const a = pair(m1, m2), res = BF.attempt(S, a); if (res) out.push({ a, S: res.S, ev: res.ev });
      }
    }
    return out;
  }
  // 搜索里替对方（楚）想破釜沉舟：只列真正危险的组合，免得太慢——
  //   ① 先吃子、再随便走（含吃完就撤）只算第二步也吃子或者就是刚才那枚子撤走；② 先挪开挡路的子、再吃那条线上让出来的子；
  //   每种组合再试一次“先把最后出手的子升一级”（升了血，回吃打不死）。full = 连②也算（搜索里只算①，便宜）
  const mvKey = m => m.from[0] + ',' + m.from[1] + '>' + m.to[0] + ',' + m.to[1];
  function pofuThreats(S, full) {
    if (!pofuLeft(S)) return [];
    const out = [], seen = new Set();
    const add = (m1, m2, mover) => {
      const a = pair(m1, m2), key = JSON.stringify(a.steps); if (seen.has(key)) return; seen.add(key);
      const res = BF.attempt(S, a); if (!res) return;
      out.push({ a, pre: { S: res.S, ev: res.ev }, pofu: true });
      const p = S.board[mover[1]][mover[0]];
      if (p && canUp(S, p) && upHelps(p)) out.push({ a, up: mover, pofu: true });
    };
    const strikes = A.gen(S, true).filter(it => it.a.k === 'mv' && it.q);
    const now1 = new Set(strikes.map(it => mvKey(it.a)));
    // ① 先吃
    for (const it of strikes) {
      const m1 = it.a, V = afterStep(S, m1); if (!V) continue;
      const back = V.board[m1.to[1]][m1.to[0]] && V.board[m1.to[1]][m1.to[0]].s === 'b' ? m1.to : m1.from;   // 吃掉了就在落点，没打死就弹回原位
      for (const it2 of A.gen(V, true)) if (it2.a.k === 'mv' && it2.q) add(m1, it2.a, posEq(it2.a.from, back) ? m1.from : it2.a.from);
      for (const m2 of A.moveTargets(V, back[0], back[1])) if (!V.board[m2.to[1]][m2.to[0]]) add(m1, m2, m1.from);
    }
    if (!full) return out;
    // ② 先挪开挡路的子：拿掉它之后多出来的吃子着法
    for (const [f, r] of bPieces(S)) {
      const x = S.board[r][f]; if (x.t === 'k') continue;
      const B = S.board.map(row => row.slice()); B[r][f] = null;
      const V = Object.assign({}, S, { board: B });
      const fresh = A.gen(V, true).filter(it => it.a.k === 'mv' && it.q && !now1.has(mvKey(it.a)));
      if (!fresh.length) continue;
      for (const m1 of A.moveTargets(S, f, r)) {
        if (S.board[m1.to[1]][m1.to[0]]) continue;
        for (const it2 of fresh) add(m1, it2.a, it2.a.from);
      }
    }
    return out;
  }
  const posEq = (a, b) => a[0] === b[0] && a[1] === b[1];

  // ---------- 候选着法 ----------
  // 每项 { a, p: 出手的子, q: 被打的敌子 }，另有：
  //   up: 先把出手的子升一级再出手；upOnly: 只升级（不换手，接着在同一层挑主行动）；pre: 已经结算好的（破釜沉舟两步）
  function children(S, ply, capsOnly) {
    const side = S.turn, list = A.gen(S, capsOnly);
    if (!S.upgraded && !S.freeUsed && S.merit[side] >= 1) {
      const n = list.length;
      for (let i = 0; i < n; i++) {
        const it = list[i];
        if (!it.q || !it.p || it.p.t === 'k' || it.sk === 'qishe') continue;
        if (!canUp(S, it.p) || !upHelps(it.p)) continue;
        list.push({ a: it.a, p: it.p, q: it.q, sk: it.sk, up: posOf(it.a) });
      }
      if (!capsOnly && ply >= 1 && ply <= GUARD_PLY) for (const g of guardUps(S, side, 2)) list.push({ upOnly: g.at, p: g.p });
    }
    if (!capsOnly && ply >= 1 && ply <= POFU_PLY && pofuLeft(S)) for (const x of pofuThreats(S, true)) list.push(x);
    return list;
  }
  function exec(S, it) {
    if (it.pre) return it.pre;
    if (it.up) { const T = A.upgradeState(S, it.up); return T ? BF.attempt(T, it.a) : null; }
    return BF.attempt(S, it.a);
  }

  // ---------- 搜索 ----------
  let nodes = 0, deadline = Infinity, qMax = 3;
  const TIMEOUT = { timeout: true };
  const hist = new Map();                     // 历史启发：哪些安静着法以前造成过剪枝
  const hk = a => (a.k === 'mv' ? a.from[0] + a.from[1] * 9 + (a.to[0] + a.to[1] * 9) * 90 : -1);
  function order(list, killer) {
    for (const it of list) {
      let w = 0;
      if (it.pofu) w = 1500;
      else if (it.upOnly) w = 300 + 10 * VAL[it.p.t];
      else if (it.q) { const lethal = it.p && it.q.hp <= A.atk(it.p); w = 1000 + 10 * baseVal(it.q) * (lethal || it.sk ? 1 : 0.45) - (it.p ? VAL[it.p.t] : 0) + (it.q.t === 'k' ? 500 : 0) + (it.up ? 3 : 0); }
      else if (it.art) w = 600 + VAL[it.art] * 10;
      else if (it.ult) w = 500;
      else if (it.sk) w = 200;
      else { const k = hk(it.a); w = (killer && k === killer ? 400 : 0) + (hist.get(k) || 0); }
      it.w = w;
    }
    list.sort((x, y) => y.w - x.w);
    return list;
  }
  // 吃子静态搜索：只接着算“打到敌子”的着法（含先升级再打），直到局面安静下来
  function qs(S, alpha, beta, ply, qd) {
    if ((++nodes & 63) === 0 && now() > deadline) throw TIMEOUT;
    const side = S.turn;
    const stand = score(S, side);
    if (qd >= qMax) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const caps = order(children(S, ply, true));
    let best = stand, n = 0;
    for (const it of caps) {
      if (n >= 7) break;
      const r = exec(S, it); if (!r || r.free) continue;
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
    const list = order(children(S, ply, false), killers[ply]);
    let best = -INF, legal = 0;
    for (const it of list) {
      let v;
      if (it.upOnly) {
        // 只升级不换手：同一方接着挑主行动，层数不减
        const T = A.upgradeState(S, it.upOnly); if (!T) continue;
        v = ab(T, depth, alpha, beta, ply);
      } else {
        const r = exec(S, it); if (!r || r.free) continue;
        legal++;
        const w = decided(r.S, r.ev);
        v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1);
      }
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!it.q && !it.upOnly && it.a.k === 'mv') { const k = hk(it.a); killers[ply] = k; hist.set(k, Math.min(300, (hist.get(k) || 0) + depth * depth)); }
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

  // 新兵只看一步（但会把吃子算清）；校尉看三步；霸王逐层加深，能看多深看多深，到点收手
  const LEVELS = {
    easy: { depth: 1, q: 2, noise: 1.3, top: 3, up: 0.5, budget: 500 },
    mid: { depth: 3, q: 3, noise: 0.3, top: 1, up: 1, budget: 2500 },
    hard: { depth: 7, q: 4, noise: 0.05, top: 1, up: 1, budget: 3800 },
  };

  // 根节点要比较的升级：会被打死的子（升级保命）+ 长远看划算的（升完局面分涨，已经扣掉了军功的价值）
  function rootUps(S) {
    const me = S.turn; if (S.upgraded || S.freeUsed) return [];
    const T = threatMap(S, me), base = score(S, me), c = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== me || !canUp(S, p)) continue;
      const U = A.upgradeState(S, [f, r]); if (!U) continue;
      const gain = score(U, me) - base, d = T.get(p.id) || 0;
      const saves = d && p.hp <= d && BF.hpOf(p.t, p.lv + 1) > d;
      if (saves || gain > 0.05) c.push({ at: [f, r], pri: saves ? 100 + VAL[p.t] : gain });
    }
    return c.sort((x, y) => y.pri - x.pri).slice(0, 4).map(x => x.at);
  }
  // 根节点的全部候选：{ up: 先升级的子 | null, a: 主行动, S: 结算后的状态 }
  function rootPlans(S, L) {
    const me = S.turn, out = [], seen = new Set();
    const push = (up, a, r) => { const key = (up ? up.join(',') : '-') + '|' + JSON.stringify(a); if (seen.has(key)) return; seen.add(key); out.push({ up, a, S: r.S, ev: r.ev }); };
    const allowUp = !S.upgraded && Math.random() <= L.up;      // 新兵有时忘了升级
    const bases = [{ up: null, S }];
    if (allowUp) for (const u of rootUps(S)) { const T = A.upgradeState(S, u); if (T) bases.push({ up: u, S: T }); }
    for (const bs of bases) {
      const items = bs.up ? A.gen(bs.S, false) : children(bs.S, 0, false).filter(it => !it.upOnly && (allowUp || !it.up));
      for (const it of items) { const r = exec(bs.S, it); if (r && !r.free) push(bs.up || it.up || null, it.a, r); }
      if (me === 'b' && L.depth >= 2 && pofuLeft(bs.S)) for (const x of pofuWide(bs.S)) push(bs.up, x.a, x);
    }
    if (!out.length) { const r = BF.attempt(S, { k: 'pass' }); if (r) out.push({ up: null, a: { k: 'pass' }, S: r.S, ev: r.ev }); }
    return out;
  }

  // 根节点：返回一串要依次执行的行动（升级 → 拒马 → 主行动）
  async function think(S0, level, tick) {
    const L0 = LEVELS[level] || LEVELS.mid, t0 = now(), me = S0.turn, seq = [];
    const L = tick ? { ...L0, budget: Math.min(L0.budget, 1400) } : L0;   // 在主线程里算（开不了 Worker）时少想一会儿，免得卡画面
    let last = now();
    const breathe = async () => { if (tick && now() - last > 12) { await tick(); last = now(); } };
    nodes = 0; qMax = L.q; hist.clear(); killers.length = 0; deadline = Infinity;
    const kids = rootPlans(S0, L);
    if (!kids.length) return seq;
    for (const k of kids) { const w = decided(k.S, k.ev); k.done = !!w; k.q = w ? (w === me ? WIN : -WIN) : score(k.S, me); k.v = k.q; }
    kids.sort((x, y) => y.q - x.q);
    let depthDone = 0;
    // 逐层加深：每一层都把上一层最好的着法排在最前面先算
    for (let d = 1; d <= L.depth; d++) {
      const soft = t0 + L.budget;
      if (d > 3 && now() - t0 > L.budget * 0.3) break;       // 剩下的时间不够再深一层了
      deadline = d <= 1 ? Infinity : soft + L.budget * 0.3;
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
    // 电脑执汉、楚方破釜沉舟还在：搜索里只防了“先吃再走”，这里把前几名着法逐个用楚方全部两步组合（含先升级）验算一遍
    if (me === 'r' && L.depth >= 2 && CFG.generalArts.pofu.usesPerGame > S0.used.art.b) {
      const t1 = now();
      deadline = Infinity;
      for (const k of kids.slice(0, 8)) {
        if (k.done || k.S.turn !== 'b' || !pofuLeft(k.S)) continue;
        let worst = Infinity;
        const tryOne = (T, a) => { const r = T && BF.attempt(T, a); if (!r) return; const v = decided(r.S, r.ev) ? -WIN : qs(r.S, -INF, INF, 2, 0); if (v < worst) worst = v; };
        for (const x of pofuWide(k.S)) {
          tryOne(k.S, x.a);
          const st = x.a.steps, last = st[1], mover = posEq(last.from, st[0].to) ? st[0].from : last.from, p = k.S.board[mover[1]][mover[0]];
          if (p && canUp(k.S, p) && upHelps(p)) tryOne(A.upgradeState(k.S, mover), x.a);
        }
        if (worst < k.v) { k.v = worst; k.pofuHit = true; }
      }
      kids.sort((x, y) => y.v - x.v);
      think.pofuMs = now() - t1;
    }
    const bestV = kids[0].v, M = L.noise * 1.6 + 0.02;
    for (const k of kids) {
      // 只在分数算准了的那几步（和最好的差不到 M）之间加一点随机；其余的分数只是上界，不能拿来比
      k.w = k.v > bestV - M * 0.95 ? k.v + (Math.random() * 2 - 1) * L.noise : k.v - 100;
    }
    const pool = kids.slice().sort((x, y) => y.w - x.w);
    let pick = pool[0];
    if (L.top > 1 && pool.length > 1 && Math.random() < 0.3) { const c = pool.slice(0, L.top).filter(k => k.w > -50); pick = c[Math.floor(Math.random() * c.length)]; }
    let S = S0;
    if (pick.up) { seq.push({ k: 'up', at: pick.up.slice() }); S = A.upgradeState(S0, pick.up) || S0; }
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
    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone, top: kids.slice(0, 5).map(k => [k.up ? { k: 'up', at: k.up, then: k.a } : k.a, +k.v.toFixed(2)]) };
    return seq;
  }
  const BFAI = { think, score, baseVal, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = BFAI; else global.BFAI = BFAI;
})(typeof window !== 'undefined' ? window : globalThis);
