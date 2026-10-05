// 电脑变体（只供模拟）：“潜力估值”第六版 = 第五版（bfai_pot6.js）+ “挪子凑阵”（用户 2026-10-05：“我主要希望有一个懂得作用规则且聪明的电脑，而不是传统象棋选手”）。
//   第五版找“回血开关”只会试“某一兵种全升满”，XE9 那种“两个四级士要贴着同一只象”它试不出来。第六版再试一种：
//     这一方全升满以后，回血还是没有 → 逐枚子试“挪到它 BFAI_POTMVD（默认 3）步内走得到的空格”，回血有了就记下（回血最多、步数最少的那个）；
//     再逐个兵种试“只升满它 + 挪这一步”，找出要升满的兵种（光挪不升也行就不升）。
//   叶子上：这枚子离目标格还差几步（根上从目标格反着走一遍记下每格的步数）、开关兵种还差几级，凑齐那次行动起回血；
//   开关每差一步（升一级或走一步）× POTCM。试回血时走的那一步挑离目标格最远的子走（取前 3 个不吃子的着里回得最多的），免得把阵自己走散。
//   BFAI_POTMV=0：关掉挪子凑阵（= 第五版）。
// 第五版的说明：
//   “潜力估值”第五版 = 第四版（bfai_pot6.js）+ “活到兑现”（用户 2026-10-05：“先改设定，然后再做活到兑现估算”）。
//   第四版只看“升上去能多打掉多少”，看不出“这枚子活不活得到能升的那天”：XE8 里楚不先升士拿回血，汉打象不集火、不先升车。
//   第五版在根上替每一方再量三样（都用引擎试算，不写死哪条规则）：
//     A. 打手：对方哪些子现在就能打到这一方的潜力子、或者走一步就能打到；每一级打多少、升一级要多少军功。
//     B. 回血：把这一方潜力子的血压到 1，走一步不吃子的棋，看回了多少（现在就有的回血）。
//     C. 回血开关：把这一方某一兵种全升满再试 B，回血变多 → 这一兵种是“开关”，记下满了以后每次回多少。
//   叶子上推演（survSim）：双方轮流行动；对方每次行动前打手能升就升一级（按对方军功和收入），再挑“最值得打”的潜力子打一下
//   （值 ÷ 还要打几下）；这一方从“回血开关”凑齐的那次行动起，每次行动末回血（回不过满血）。潜力子活到能用上那一级 → 潜力全算；
//   之前就死 → 早死几次行动就乘几次 BFAI_POTK（默认 0.5）。
//   两种打算取大的：A 照第四版（不去凑回血开关）；H 先把开关兵种升满（占升级名额、花军功），潜力子能用上的时间往后推。
//   有打手威胁的潜力子不再乘第四版的“血量比例”（推演里已经算了血）；没有打手的照第四版。
//   升级候选：除了第四版的两条，再看“双方潜力合计之差”升完比“这次不升”涨多少（回血开关这种升级本身没有潜力，涨的是别的子的）。
//   BFAI_POTSV=0：关掉“活到兑现”（≈ 第四版）。
// 第四版的说明：
//   “潜力估值”第四版——在 bfai_pot.js 第三版的基础上，按代码审查（wf_800ed4d5-e90）和极端诊断 XE5 的结果改：
//   底版：git 上的 source/src/bfai.js（BFAI_POT_BASE，默认 ecf1ddd = 线上电脑），按文字锚点改（每个锚点必须正好出现一次）。BFAI_POT=0 时和底版完全一样。
//
// 潜力：每回合 think() 开头用引擎替双方每枚子试算——一级一级升上去（现在不能升就把回合往后拨着问，问出最早哪回合能升），
//   每一级看“轮到它这一方时，它这一下最多能净赚多少子力、打的是哪几枚子”。叶子上的潜力 =
//   max over 更高的级 L：(G[L] − G[根上那一级]) × POTD^还要几回合 × 目标还活着的比例 × 血量比例；还要几回合 = 差几级 + 等规则开放 + 攒够军功。
// 第四版改了什么（括号里是审查的编号）：
//   1. 军功：叶子上只认“比根上少”的军功（花了钱潜力就跌，白捡的补偿军功不涨）；收入按规则算：每回合约 BFAI_POTR0（默认 0.5，吃子 / 将军）
//      + 到了 merit.autoIncomeFromRound 之后每回合的固定收入（①：之前 1 功能值十几分，丢子换补偿反而加分）。
//   2. 冷却：根上那一级也把冷却清零再量（同样的条件比），“技能冷却中”不再算成升级潜力（④）。
//   3. 升上来的那一级不再归零：刚升上来、技能还在冷却，按“差一回合”给；打的目标已经不在了就不给（②：之前升到顶级反而扣分）。
//   4. 同一方几枚子：按潜力从大到小，打的目标和前面重叠的部分只算 BFAI_POTOVL（默认 0.15），不重叠的全算（③：两只象共用一份军功、
//      只能秒杀一次）。试过“最大的全算、其余 ×0.25 / ×0.7”：×0.7 时两只象的潜力合计（87）超过真秒杀打得出来的（68），
//      电脑宁可攒着不动手（XE7 第 7 回合不升象）；按目标去重后合计不会超过真打得出来的。
//   5. 根上被将军：这一方沿用上一步的潜力表（⑤：之前被将军那一步整方潜力变 0）。
//   6. 升级候选：守子“解锁”名额照旧；潜力涨得最多、或者升完当场就能多赚一大块的升级另给一个专用名额
//      （⑥ + XE5：几个子被捉时保命升级占满名额，升象没进搜索；XE7：第 7 回合“马上能升、升完当场秒杀”时潜力不涨，升象反而进不了候选）。
//   7. 血量：潜力 × 现在的血 / 这一级满血（XE5：汉要连打几下才能杀掉的子，打掉的血也要看得到——汉才会去围剿）。
//   8. 军功远远够不着（攒钱要 40 回合以上）的级不试算（⑦）。
// 用法（在 source/ 下）：node tools/bfsim.js --ai tools/variants/bfai_pot6.js …；调参：BFAI_POTW / POTD / POTC / POTUP / POTWAIT / POTR0 / POTSIDE。
// 调试：think.pot = 这一步的潜力表（Map：id → 条目），think.last.potMs = 试算毫秒。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_POT_BASE || 'ecf1ddd';
let s = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_pot6：锚点出现 ${n} 次（${rev} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, () => b); };

// ---- 潜力：参数、试算、叶子上的取值 ----
rep('  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战\n  function score(S, me) {',
`  // ---- 潜力估值第四版（变体 bfai_pot6）----
  const POTON = ENV.BFAI_POT == null || !/^(0|false|off)$/i.test(String(ENV.BFAI_POT));
  const num = (k, d) => (ENV[k] != null ? +ENV[k] : d);
  const POTW = num('BFAI_POTW', 1), POTD = num('BFAI_POTD', 0.9), POTC = num('BFAI_POTC', 60), POTUP = num('BFAI_POTUP', 0.8);
  const POTWAIT = num('BFAI_POTWAIT', 12), POTR0 = num('BFAI_POTR0', 0.5), POTOVL = num('BFAI_POTOVL', 0.15);
  const POTSV = ENV.BFAI_POTSV == null || !/^(0|false|off)$/i.test(String(ENV.BFAI_POTSV)), POTK = num('BFAI_POTK', 0.5), POTCM = num('BFAI_POTCM', 0.7);
  const POTMV = ENV.BFAI_POTMV == null || !/^(0|false|off)$/i.test(String(ENV.BFAI_POTMV)), POTMVD = num('BFAI_POTMVD', 3);   // 第六版：挪子凑阵   // 第五版：活到兑现
  let SURV = { r: null, b: null };
  const HPCAP = new Map(), TB = new Map();
  let POT = new Map(), lastPot = new Map(), potMs = 0;
  const matOf = (S, side) => { let v = 0; for (const row of S.board) for (const p of row) if (p && p.s === side && p.t !== 'k') v += baseVal(p, false); return v; };
  const findId = (S, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.id === id) return { p, at: [f, r] }; } return null; };
  const clearCd = p => { if (!p) return; p.cd = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; };
  const roundOf = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
  // 攒够 short 功要几回合：每回合约 POTR0（吃子、将军）+ 到了规则里的“每回合固定收入”那一回合之后再加上它
  function earnTurns(short, rd) {
    if (short <= 0) return 0;
    const M = CFG.merit || {}, from = M.autoIncomeFromRound || 999, per = M.autoIncomePerRound || 0;
    let t = 0, acc = 0;
    while (acc < short && t < 40) { t++; acc += POTR0 + (rd + t >= from ? per : 0); }
    return acc >= short ? t : 99;
  }
  // 轮到 side 时，id 这枚子这一下（走子或技能）最多净赚多少子力，打的是对方哪几枚子
  function bestGain(H, id, side) {
    const o0 = matOf(H, other(side)), m0 = matOf(H, side), enemy = new Set();
    for (const row of H.board) for (const p of row) if (p && p.s !== side) enemy.add(p.id);
    let best = 0, tg = [];
    for (const e of A.gen(H, false)) {
      if (!e.p || e.p.id !== id) continue;
      const R = BF.attempt(H, e.a); if (!R) continue;
      if (R.ev && R.ev.some(x => x.e === 'kill' && x.t === 'k')) return { g: POTC, tg: [] };
      const g = (o0 - matOf(R.S, other(side))) - (m0 - matOf(R.S, side));
      if (g > best) { best = g; tg = []; for (const x of R.ev || []) if ((x.e === 'kill' || x.e === 'hit') && enemy.has(x.id) && !tg.includes(x.id)) tg.push(x.id); }
    }
    return { g: best, tg };
  }
  const asTurn = (S, side) => { const H = BF.cloneState(S); H.turn = side; H.upgraded = false; H.freeUsed = false; H.jmLock = null; return H; };
  function computePot(S0) {
    const out = new Map();
    for (const side of ['r', 'b']) {
      const H0 = asTurn(S0, side), M0 = S0.merit[side];
      // 根上正被将军：这一方的子这一步什么都干不了，量出来全是 0——沿用上一步的表（同一枚子、等级没变）
      if (side === S0.turn && A.inCheck(S0, side)) {
        for (const row of S0.board) for (const p of row) if (p && p.s === side) { const e = lastPot.get(p.id); if (e && e.lv0 === p.lv) out.set(p.id, e); }
        continue;
      }
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
        const p0 = S0.board[r][f]; if (!p0 || p0.s !== side || p0.t === 'k') continue;
        const maxL = BF.maxLvOf(p0.t); if (p0.lv >= maxL) continue;
        const G = [], spent = [], wait = [], tg = [], hpL = [];
        let H = BF.cloneState(H0); clearCd(findId(H, p0.id).p);   // 根上那一级也清冷却：同样的条件比
        let lv = p0.lv, cum = 0;
        let x = bestGain(H, p0.id, side); G[lv] = x.g; tg[lv] = x.tg; spent[lv] = 0; wait[lv] = 0; hpL[lv] = p0.hp;
        while (lv < maxL) {
          const y = findId(H, p0.id); if (!y) break;
          const c = A.upCost(y.p); if (c == null) break;
          if (cum + c - M0 > 40 * Math.max(POTR0, 0.1) + 30) break;   // 军功远远够不着：不试算
          const H1 = BF.cloneState(H); H1.merit = { ...H1.merit, [side]: 999 }; H1.upgraded = false;
          let T = A.upgradeState(H1, y.at), w = 0;
          if (!T) for (let k = 1; k <= POTWAIT; k++) {   // 现在不能升：问问过几回合能不能（规则的时间限制）
            const H2 = BF.cloneState(H1); H2.cnt = { r: H1.cnt.r + k, b: H1.cnt.b + k };
            T = A.upgradeState(H2, y.at); if (T) { w = k; break; }
          }
          if (!T) break;
          T.merit = { ...T.merit, [side]: H.merit[side] }; T.upgraded = false; T.turn = side;
          const z = findId(T, p0.id); clearCd(z && z.p);
          cum += c; lv++;
          x = bestGain(T, p0.id, side); G[lv] = x.g; tg[lv] = x.tg; spent[lv] = cum; wait[lv] = wait[lv - 1] + w; hpL[lv] = z ? z.p.hp : 1;
          H = T;
        }
        let any = false; for (let L = p0.lv + 1; L <= lv; L++) if (G[L] > G[p0.lv] + 0.05) any = true;   // 浮点误差不算
        if (any) out.set(p0.id, { side, lv0: p0.lv, top: lv, G, spent, wait, tg, hpL, m0: M0 });
      }
    }
    lastPot = out;
    SURV = POTSV ? computeSurv(S0, out) : { r: null, b: null };
    return out;
  }
  // 叶子局面 S 上，这枚子（条目 e）的潜力。alive：S 上还在的子的 id
  function potAt(e, p, S, alive) {
    const l = p.lv; if (l < e.lv0 || e.G[l] == null && l < e.top) return { v: 0, tg: null };
    const m = Math.min(S.merit[e.side], e.m0), rd = Math.floor((S.cnt.r + S.cnt.b) / 2) + 1, base = e.G[e.lv0];
    const al = L => { const t = e.tg[L]; if (!t || !t.length) return 1; let n = 0; for (const id of t) if (alive.has(id)) n++; return n / t.length; };
    let best = 0, btg = null, bk = null, bT = 1;
    if (l > e.lv0 && e.G[l] != null) { const g0 = Math.max(0, e.G[l] - base); best = g0 * POTD * al(l); btg = e.tg[l]; bk = { gain: g0, a: al(l), dl: 0, wd: 0, sd: 0, cool: 1 }; }   // 刚升上来、技能还在冷却：按差一回合给
    for (let L = l + 1; L <= e.top; L++) {
      if (e.G[L] == null) break;
      const gain = e.G[L] - base; if (!(gain > 0)) continue;
      const wd = (e.wait[L] || 0) - (e.wait[l] || 0), sd = e.spent[L] - e.spent[l];
      const turns = (L - l) + wd + earnTurns(Math.max(0, sd - m), rd);
      const v = gain * Math.pow(POTD, turns) * al(L);
      if (v > best) { best = v; btg = e.tg[L]; bT = turns; bk = { gain, a: al(L), dl: L - l, wd, sd, cool: 0 }; }
    }
    const hpF = e.hpL[l] > 0 ? Math.min(1, p.hp / e.hpL[l]) : 1;   // 被打掉的血：它活到用上的机会小了（第五版：有打手威胁的改由推演算）
    return { v: Math.min(POTC, best * hpF), raw: Math.min(POTC, best), tg: btg, T: bT, k: bk, m };
  }
  // 同一方几枚子的潜力合计：从大到小，打的目标和前面重叠的那部分只算 POTOVL（同一批子只能被打掉一次），不重叠的照常全算。
  //   这样合计永远不超过真打得出来的（两只象秒杀的是同一批子：一只全算、另一只只算一小截）
  function potAgg(a) {
    if (!a.length) return 0;
    a.sort((x, y) => y.v - x.v);
    const cov = new Set(); let t = 0;
    for (const x of a) {
      let nov = 1;
      if (x.tg && x.tg.length) { let n = 0; for (const id of x.tg) if (!cov.has(id)) n++; nov = n / x.tg.length; for (const id of x.tg) cov.add(id); }
      t += x.v * (nov + POTOVL * (1 - nov));
    }
    return t;
  }
  // ---- 第五版：活到兑现 ----
  // 某方某兵种每一级的攻击、升一级的价（缓存）
  function tbl(sd, t) {
    const k = sd + t; let x = TB.get(k); if (x) return x;
    const mx = BF.maxLvOf(t), atk = [], cost = [];
    for (let lv = 1; lv <= mx; lv++) { atk[lv] = A.atk({ s: sd, t, lv, hp: 1, xp: 0 }); cost[lv] = lv < mx ? A.upCost({ s: sd, t, lv, hp: 1, xp: 0 }) : null; }
    x = { mx, atk, cost }; TB.set(k, x); return x;
  }
  // 对方能打到这一方潜力子（C）的打手：现在就能打到（d = 0），或者走一步（走到空格）就能打到（d = 1）；reach = 能打到哪几枚
  function probeAttackers(S0, side, C) {
    const o = other(side), H = asTurn(S0, o), out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const q = H.board[r][f]; if (!q || q.s !== o || q.t === 'k') continue;
      const reach = new Set(); let d = 0;
      for (const m of A.moveTargets(H, f, r)) { const v = H.board[m.to[1]][m.to[0]]; if (v && C.has(v.id)) reach.add(v.id); }
      if (!reach.size) {
        d = 1;
        for (const m of A.moveTargets(H, f, r)) {
          const [tf, tr] = m.to; if (H.board[tr][tf]) continue;
          H.board[tr][tf] = q; H.board[r][f] = null;
          for (const z of A.moveTargets(H, tf, tr)) { const v = H.board[z.to[1]][z.to[0]]; if (v && C.has(v.id)) reach.add(v.id); }
          H.board[r][f] = q; H.board[tr][tf] = null;
        }
      }
      if (reach.size) { const T = tbl(o, q.t); out.push({ id: q.id, t: q.t, d, reach, top: T.atk[T.mx] }); }
    }
    out.sort((x, y) => y.top - x.top || x.d - y.d);
    return out.slice(0, 4);
  }
  // 这一方走一步不吃子的棋，潜力子（C）回多少血：先把它们的血压到 1；mod 先改一下局面（比如把某一兵种全升满）
  function probeHeal(S0, side, C, mod, focus) {
    const H = asTurn(S0, side); if (mod) mod(H);
    for (const row of H.board) for (const p of row) if (p && C.has(p.id)) p.hp = 1;
    let ms = A.gen(H, false).filter(e => e.a.k === 'mv' && !e.q);
    if (focus) ms = ms.map(e => ({ e, d: Math.abs(e.a.from[0] - focus[0]) + Math.abs(e.a.from[1] - focus[1]) })).sort((x, y) => y.d - x.d).map(x => x.e);   // 第六版：挑离目标格最远的子走，免得把阵走散
    let best = 0, tried = 0;
    for (const e of ms) {
      const R = BF.attempt(H, e.a); if (!R || (R.ev || []).some(x => x.e === 'kill' || x.e === 'hit')) continue;
      let h = 0; for (const row of R.S.board) for (const p of row) if (p && C.has(p.id)) h = Math.max(h, p.hp - 1);
      if (h > best) best = h;
      if (++tried >= 3) break;
    }
    return best;
  }
  // 第六版：从 (f, r) 那枚子出发、按引擎的走法（别的子挡路）D 步内走得到的空格 → 步数（键 = r * 9 + f）
  function reach(S0, f, r, D) {
    const H = BF.cloneState(S0), p = H.board[r][f], out = new Map([[r * 9 + f, 0]]); let fr = [[f, r]];
    H.board[r][f] = null;
    for (let d = 1; d <= D && fr.length; d++) {
      const nx = [];
      for (const [cf, cr] of fr) {
        H.board[cr][cf] = p;
        for (const m of A.moveTargets(H, cf, cr)) { const [tf, tr] = m.to, k = tr * 9 + tf; if (H.board[tr][tf] || out.has(k)) continue; out.set(k, d); nx.push([tf, tr]); }
        H.board[cr][cf] = null;
      }
      fr = nx;
    }
    return out;
  }
  function computeSurv(S0, P) {
    for (const row of S0.board) for (const p of row) if (p) { const k = p.id + ':' + p.lv; if (!(HPCAP.get(k) >= p.hp)) HPCAP.set(k, p.hp); }
    const out = { r: null, b: null };
    for (const side of ['r', 'b']) {
      const C = new Set(); for (const [id, e] of P) if (e.side === side) C.add(id);
      if (!C.size) continue;
      const att = probeAttackers(S0, side, C); if (!att.length) continue;
      const h0 = probeHeal(S0, side, C, null);
      let en = null; const types = new Set();
      for (const row of S0.board) for (const p of row) if (p && p.s === side && p.t !== 'k' && p.lv < BF.maxLvOf(p.t)) types.add(p.t);
      for (const t of types) {
        const h = probeHeal(S0, side, C, H => { for (const row of H.board) for (const q of row) if (q && q.s === side && q.t === t) q.lv = BF.maxLvOf(t); });
        if (h > h0 + 0.5 && (!en || h > en.h)) { let n = 0; for (const row of S0.board) for (const q of row) if (q && q.s === side && q.t === t) n++; en = { t, h, n }; }
      }
      if (!en && POTMV) {   // 第六版：光升满不够、要挪子（摆阵）
        const maxAll = H => { for (const row of H.board) for (const q of row) if (q && q.s === side && q.t !== 'k' && !C.has(q.id)) q.lv = BF.maxLvOf(q.t); };   // 潜力子自己不升（升了满血变了，量不出回血）
        if (probeHeal(S0, side, C, maxAll) <= h0 + 0.5) {
          let best = null;
          for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
            const p = S0.board[r][f]; if (!p || p.s !== side || p.t === 'k') continue;
            for (const [k, d] of reach(S0, f, r, POTMVD)) {
              if (!d) continue; const tf = k % 9, tr = (k - tf) / 9;
              const h = probeHeal(S0, side, C, H => { maxAll(H); H.board[tr][tf] = H.board[r][f]; H.board[r][f] = null; }, [tf, tr]);
              if (h > h0 + 0.5 && (!best || h > best.h + 0.5 || (h > best.h - 0.5 && d < best.d))) best = { id: p.id, from: [f, r], to: [tf, tr], d, h };
            }
          }
          if (best) {
            const [ff, fr] = best.from, [tf, tr] = best.to, mv = H => { H.board[tr][tf] = H.board[fr][ff]; H.board[fr][ff] = null; };
            const Hr = BF.cloneState(S0); mv(Hr); const rev = reach(Hr, tf, tr, 8);   // 叶子上查“离目标格还差几步”
            let h1 = probeHeal(S0, side, C, mv, best.to);
            if (h1 > h0 + 0.5) en = { t: null, h: h1, n: 0, mv: { id: best.id, rev } };   // 光挪不升就有
            else for (const t of types) {
              const h = probeHeal(S0, side, C, H => { for (const row of H.board) for (const q of row) if (q && q.s === side && q.t === t) q.lv = BF.maxLvOf(t); mv(H); }, best.to);
              if (h > h0 + 0.5) { let n = 0; for (const row of S0.board) for (const q of row) if (q && q.s === side && q.t === t) n++; en = { t, h, n, mv: { id: best.id, rev } }; break; }
            }
          }
        }
      }
      out[side] = { att, h0, en };
    }
    return out;
  }
  // 对方第 i 次行动（i = 1..N）每个打手最多打多少：每次行动前能升就升一级（对方军功 + 收入）；走一步才打得到的，第一次行动打不到
  function dTable(S, SV, PA, own, N) {
    const o = other(own), out = [], M = S.merit[o], rd = roundOf(S), MM = CFG.merit || {}, from = MM.autoIncomeFromRound || 999, per = MM.autoIncomePerRound || 0;
    for (const a of SV.att) {
      const q = PA.get(a.id); if (!q) continue;
      const T = tbl(o, q.t); let lv = q.lv, spent = 0, inc = 0; const D = [0];
      for (let i = 1; i <= N; i++) {
        if (i > 1) inc += POTR0 + (rd + i - 1 >= from ? per : 0);
        if (lv < T.mx && T.cost[lv] != null && spent + T.cost[lv] <= M + inc) { spent += T.cost[lv]; lv++; }
        D[i] = i > a.d ? T.atk[lv] : 0;
      }
      out.push({ a, D });
    }
    return out;
  }
  // 推演：从叶子 S 起双方轮流行动。mem：[{ id, hp, cap, P, v }]，P = 这一方第几次行动能用上那一级（轮到这一方时“这一次”算第 1 次）。
  //   对方每次行动挑“值 ÷ 还要打几下”最大的潜力子打一下；这一方从第 healAt 次行动起每次行动末回 heal 血。返回每枚的存活系数
  function survSim(S, own, mem, DT, heal, healAt) {
    const hp = mem.map(x => x.hp), dead = mem.map(() => Infinity), maxP = Math.max(...mem.map(x => x.P));
    let o = 0, e = 0, turn = S.turn;
    for (let g = 0; g < 80; g++) {
      if (turn === own) {
        o++;
        if (o >= maxP) break;
        if (heal > 0 && o >= healAt) for (let i = 0; i < mem.length; i++) if (dead[i] === Infinity) hp[i] = Math.min(mem[i].cap, hp[i] + heal);
      } else {
        e++;
        let bi = -1, bD = 0, bs = -1;
        for (const { a, D } of DT) {
          const d = D[Math.min(e, D.length - 1)]; if (!(d > 0)) continue;
          for (let i = 0; i < mem.length; i++) {
            if (dead[i] !== Infinity || mem[i].P <= o || !a.reach.has(mem[i].id)) continue;
            const sc = mem[i].v / Math.ceil(hp[i] / d); if (sc > bs) { bs = sc; bi = i; bD = d; }
          }
        }
        if (bi >= 0) { hp[bi] -= bD; if (hp[bi] <= 0) dead[bi] = o + 1; }
      }
      turn = other(turn);
    }
    return mem.map((x, i) => (dead[i] > x.P ? 1 : Math.pow(POTK, x.P - dead[i] + 1)));
  }
  // 叶子上这一方的潜力合计（含活到兑现）。PA：S 上的子 id → 子；forceUsed：这一方这一次行动的升级名额当作已经用掉（升级候选比“这次不升”用）
  function potSide(S, side, PA, forceUsed) {
    const SV = SURV[side], arr = [];
    for (const p of PA.values()) { if (p.s !== side) continue; const e = POT.get(p.id); if (!e) continue; const x = potAt(e, p, S, PA); if (x.raw > 0) { x.p = p; arr.push(x); } }
    if (!arr.length) return 0;
    if (!SV) return potAgg(arr.map(x => ({ v: x.v, tg: x.tg })));
    const thr = x => SV.att.some(a => a.reach.has(x.p.id) && PA.has(a.id));
    const own1 = S.turn === side && (forceUsed || S.upgraded) ? 1 : 0;   // 这一次行动已经不能升级：凑开关要多等一次
    const en = SV.en; let steps = 0, costLeft = 0, nEn = 0, dMv = 0;
    if (en && en.t) for (const p of PA.values()) if (p.s === side && p.t === en.t) { nEn++; const T = tbl(side, p.t); for (let l = p.lv; l < T.mx; l++) { steps++; costLeft += T.cost[l] || 0; } }
    if (en && en.mv) {   // 第六版：挪子凑阵还差几步（那枚子没了 = 凑不成）
      dMv = Infinity; const q = PA.get(en.mv.id);
      if (q) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (S.board[r][f] === q) { const d = en.mv.rev.get(r * 9 + f); dMv = d == null ? Infinity : d; }
    }
    const enOk = !!en && (!en.t || nEn >= en.n) && dMv < Infinity, enOn = enOk && steps === 0 && dMv === 0;
    let DT = null;
    const run = (heal, healAt, Tof, vof) => {
      const mem = [], free = [];
      for (const x of arr) { if (thr(x)) mem.push(x); else free.push({ v: x.v, tg: x.tg }); }
      if (!mem.length) return potAgg(free);
      const M = mem.map(x => ({ id: x.p.id, hp: x.p.hp, cap: Math.max(x.p.hp, HPCAP.get(x.p.id + ':' + x.p.lv) || 0), P: Math.max(1, Tof(x)), v: vof(x) }));
      const N = Math.max(...M.map(z => z.P)) + 2;
      if (!DT || DT.N < N) { DT = dTable(S, SV, PA, side, N); DT.N = N; }
      const sv = survSim(S, side, M, DT, heal, healAt);
      return potAgg(free.concat(M.map((z, i) => ({ v: z.v * sv[i], tg: mem[i].tg }))));
    };
    const vA = run(enOn ? Math.max(en.h, SV.h0) : SV.h0, 1, x => x.T, x => x.raw);
    if (!enOk || enOn) return vA;
    // 打算 H：先把开关兵种升满（一次行动升一级、花军功），开关凑齐那次行动起回血；潜力子用上那一级往后推
    const m = S.merit[side], rd = roundOf(S), healAt = Math.max(steps + own1, dMv, earnTurns(Math.max(0, costLeft - m), rd) + 1);
    const TH = x => (x.k && !x.k.cool ? Math.max(steps + own1 + x.k.dl, dMv + x.k.dl, x.k.dl + x.k.wd, earnTurns(Math.max(0, x.k.sd + costLeft - x.m), rd) + x.k.dl) : x.T);
    const vH = run(en.h, healAt, TH, x => (x.k && !x.k.cool ? Math.min(POTC, x.k.gain * Math.pow(POTD, TH(x)) * x.k.a) : x.raw));
    return Math.max(vA, vH * Math.pow(POTCM, steps + dMv));   // 还没做的开关步数：每步 × POTCM（打算还没落实，对方也还没被逼着表态）
  }
  const potMap = S => { const PA = new Map(); for (const row of S.board) for (const p of row) if (p) PA.set(p.id, p); return PA; };
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  function score(S, me) {`);

// ---- 局面分：按方合计潜力（含活到兑现） ----
rep('    v += 0.3 * (S.merit[me] - S.merit[other(me)]);',
  '    if (POT.size) { const PM = potMap(S); v += POTW * (potSide(S, me, PM, false) - potSide(S, other(me), PM, false)); }   // 变体 bfai_pot6：按方合计（含活到兑现）\n    v += 0.3 * (S.merit[me] - S.merit[other(me)]);');

// ---- 升级候选：守子“解锁”名额照旧；潜力涨得最多的升级另给一个专用名额 ----
rep('      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);\n      if (defender && !must && !unlock && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n      if ((saving || hoard) && p.t !== \'r\' && !must) continue;\n      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });',
  '      let pg = 0;   // 变体 bfai_pot6：升这一级潜力涨多少\n' +
  '      let ig = 0;   // 升完这一级当场能多赚多少（根上试算的 G[lv+1] − G[lv]）：当场就用得上的升级，潜力不涨也要进搜索比\n' +
  '      if (POTON && POT.size) { const PE = POT.get(p.id); if (PE) { const AL = new Set(); for (const row of S.board) for (const q of row) if (q) AL.add(q.id); pg = POTW * (potAt(PE, T.board[r][f], T, AL).v - potAt(PE, p, S, AL).v); if (PE.G[p.lv + 1] != null && PE.G[p.lv] != null) ig = PE.G[p.lv + 1] - PE.G[p.lv]; } }\n' +
  '      if (POTON && POT.size && (SURV.r || SURV.b)) { const P0 = potMap(S), P1 = potMap(T); const ps = POTW * ((potSide(T, me, P1, true) - potSide(T, other(me), P1, false)) - (potSide(S, me, P0, true) - potSide(S, other(me), P0, false))); if (ps > pg) pg = ps; }   // 第五版：双方潜力合计之差（回血开关这种升级本身没潜力）\n' +
  '      const potUp = pg >= POTUP || ig >= POTUP; pg = Math.max(pg, ig);\n' +
  '      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);\n' +
  '      if (defender && !must && !unlock && !potUp && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n' +
  '      if ((saving || hoard) && p.t !== \'r\' && !must && !potUp) continue;\n' +
  '      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock, pot: potUp, pg });');
rep('    if (ex) top.push(ex);\n    return top;',
  '    if (ex) top.push(ex);\n    const px = cand.filter(c => c.pot && !top.includes(c)).sort((x, y) => y.pg - x.pg)[0];   // 变体 bfai_pot6：潜力升级的专用名额\n    if (px) top.push(px);\n    return top;');

// ---- 调试：根上的升级候选（think.ups） ----
rep('    let ups = upgradeCands(S, L);',
  '    let ups = upgradeCands(S, L);\n    think.ups = ups.map(c => ({ at: c.at, gain: +c.gain.toFixed(2), must: !!c.must, unlock: !!c.unlock, pot: !!c.pot, pg: +(c.pg || 0).toFixed(2) }));   // 变体 bfai_pot6：调试用\n    think.surv = SURV; think.potSide = (S2, sd, fu) => potSide(S2, sd, potMap(S2), fu); think.potAll = POT;');

// ---- 每回合开头先试算潜力 ----
rep('nodes = 0; qMax = L.q; hist.clear();',
  '{ const tp = now(); POT = POTON ? computePot(S0) : new Map(); potMs = now() - tp; think.pot = POT; }   /* 变体 bfai_pot6：每回合先试算潜力 */ nodes = 0; qMax = L.q; hist.clear();');
rep('    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone,',
  '    think.last = { nodes, ms: now() - t0, potMs, v: pick.v, n: kids.length, depth: depthDone,');

const out = process.env.BFAI_POT_OUT || path.join(os.tmpdir(), `bfai_pot6_${rev}_${process.pid}.js`);   // BFAI_POT_OUT：把改好的电脑存到这里（网页实测、交给 TD 用），不删
fs.writeFileSync(out, s);
if (!process.env.BFAI_POT_OUT) process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
module.exports = require(out);
