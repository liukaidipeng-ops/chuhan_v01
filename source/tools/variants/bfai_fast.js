// 电脑变体（只供模拟 / 验证）：搜索提速（用户在拍板单定 ai_next1=a：同样时间多算一层）。
//   底版：git 上的 source/src/bfai.js（BFAI_FAST_BASE，默认 4db9f8c = 线上电脑，含一步杀保险），按文字锚点改。
//   第 1 步 BFAI_TT（默认开）：记住算过的局面——同一次思考里，同一个局面（局面指纹 + 剩余层数 + 已延伸次数 + 这一层要不要考虑对方升级 / 破釜）
//     再遇到时直接用算过的分；算过的最好一步下次先算。层数固定时，根上每步的分必须和原来逐个相同（只是更快），验收就看这个。
//     局面指纹：棋盘上每枚子的每个字段 + 轮到谁、回合计数、军功、兵法、各种效果、阵亡名单、将军记录（长将规则）……全部算进去。
//   BFAI_TTMOVE（默认开）：只用“上次最好的一步先算”、不直接用分，用来分开看两者各省多少。
//   实测（三局 87 个局面，固定 3 / 4 层）：分数逐个相同，但只省 6% 节点——这个游戏里同一局面很少重复出现（每枚子带着击杀数、甲片、冷却……）。
//   第 2 步 BFAI_LMR=N（默认 0 = 关）：排在第 N 个以后的安静着法（不吃子、不用技能 / 兵法、不将军、自己没被将军）先少算一层、用窄窗口试；
//     试出来比当前最好的还好，再按原层数重算。会改变走法，只能拿对打验收（同样搜索量，算得更深、赢得更多才算数）。
//   性能剖析（固定 4 层，8 个局面 117 万节点，每节点 29 微秒）：引擎的走法生成 + 将军判断约 40%，每走一步复制整个局面约 20%（含回收内存），
//     估值 6%，电脑自己的搜索代码不到 10%——大头在引擎（TD 的代码）。
//   第 3 步 BFAI_DELTA=M（默认 0 = 关）：吃子静态搜索（占约 45% 时间）里，一个吃子就算全赚（打死就算整子、打不死算 0.45 个）再加 M 分
//     也追不上当前最好的，就不去试走（省一次走子 + 复制局面）。只管普通走子吃子；技能、将帅不管。会改变走法，拿对打验收。
//   BFAI_ROOTREL=N（默认 0 = 关）：根上自己的升级候选，除了原来的（前 3 名 + 救命的 + 一个解锁技能的），再加最多 N 个“会改变吃子结果”的：
//     守——这枚子正被一下打死，升了扛得住；攻——升了能打死原来打不死的子，或者能将军。原来“快攒够钱升车就只肯升车、守子没被捉不升”的筛子会把这些挡掉
//     （复盘：第一局 R23 升马再走更好，电脑在攒钱升车）。只加宽根上，比加宽对手模型便宜得多。
//   BFAI_CHKUP（默认关）：被将军的一方，所有能升的升级都考虑（用户 2026-10-09：“被将的时候也要可以升级才行”）。
//     原来：自己被将军时根上最多看 3 种升级、兵和相 / 象不看；搜索里对方被将军时只看静态收益前 3 名——会以为“将死了”，
//     其实对方升一级就解了（复盘里“把局面看得太好”的那类）。两边一样（对称）。
//     BFAI_CHKUP=1：搜索里被将军时所有升级都试——实测太贵（霸王同样节点平均 3.37 → 3.08 层：这个游戏将军很常见）。
//     BFAI_CHKUP=2：搜索里只试“升了才打得死将军的那枚子”的升级和帅身边的子的升级；根上（电脑自己被将军）仍然全看。
//   第 4 步（C61 之后，只在霸王）：BFAI_NMP=R（默认 0 = 关）：让一步试试——没被将军、剩下至少 3 层、自己还有车马炮时，先假装停一手让对方连走，
//     少算 R+1 层；这样对方都翻不过来，这条线就不细算了。BFAI_PVS=1：排在后面的着法先用窄窗口探，比当前最好的还好才按全窗口重算。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_FAST_BASE || '4db9f8c';
const src0 = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
function build(E, tag) {
  let s = src0;
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_fast：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
  const on = (k, d) => E[k] == null ? d : !/^(0|false|off)$/i.test(String(E[k]));
  const TT = on('BFAI_TT', true), TTMOVE = on('BFAI_TTMOVE', true), LMR = +(E.BFAI_LMR || 0), DELTA = +(E.BFAI_DELTA || 0), ROOTREL = +(E.BFAI_ROOTREL || 0), CHKUP = +(E.BFAI_CHKUP || 0), NMP = +(E.BFAI_NMP || 0), PVS = on('BFAI_PVS', false);
  if (TT || TTMOVE) {
    rep("  function ab(S, depth, alpha, beta, ply, ext = 0) {",
      "  // 变体 fast：局面指纹（两个 32 位散列拼成 53 位的数）\n" +
      "  const TTB = new Map();\n" +
      "  function fp(S) {\n" +
      "    let h1 = 2166136261, h2 = 5381;\n" +
      "    const mix = x => { h1 = Math.imul(h1 ^ x, 16777619); h2 = (Math.imul(h2, 33) ^ x) | 0; };\n" +
      "    const mixS = t => { for (let i = 0; i < t.length; i++) mix(t.charCodeAt(i)); };\n" +
      "    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {\n" +
      "      const p = S.board[r][f]; if (!p) continue;\n" +
      "      mix(1000 + r * 9 + f);\n" +
      "      for (const k in p) { mixS(k); const v = p[k]; if (typeof v === 'number') { mix(v | 0); mix(Math.round(v * 4096) | 0); } else if (typeof v === 'string') { mix(7); mixS(v); } else if (typeof v === 'boolean') mix(v ? 3 : 5); else if (v == null) mix(9); else mixS(JSON.stringify(v)); }\n" +
      "    }\n" +
      "    mixS(JSON.stringify([S.turn, S.cnt, S.merit, S.used, S.fx, S.crossed, S.dead, S.upgraded, S.ckHist, S.freeUsed, S.jmLock, S.final, S.occ, S.named]));\n" +
      "    return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151);\n" +
      "  }\n" +
      "  const toTT = (v, ply) => (v > WIN / 2 ? v + ply : v < -WIN / 2 ? v - ply : v), fromTT = (v, ply) => (v > WIN / 2 ? v - ply : v < -WIN / 2 ? v + ply : v);\n" +
      "  const mkey = a => (a.k === 'mv' ? hk(a) : JSON.stringify(a));\n" +
      "  function ab(S, depth, alpha, beta, ply, ext = 0) {");
    rep("    if (fewPieces(S) && stuck(S)) return -WIN + ply;\n    let best = -INF, legal = 0;",
      "    if (fewPieces(S) && stuck(S)) return -WIN + ply;\n" +
      "    // 变体 fast：查表——同一局面、同样剩余层数、同样的延伸次数和“这层要不要考虑对方升级 / 破釜”\n" +
      "    const tkey = fp(S) + ':' + depth + ':' + ext + ':' + (ply === upPly && !S.upgraded ? 1 : 0) + (ply === pfPly ? 2 : 0), tte = TTB.get(tkey), a0 = alpha;\n" +
      (TT ? "    if (tte) { const v = fromTT(tte.v, ply); if (tte.f === 0 || (tte.f === 1 && v >= beta) || (tte.f === 2 && v <= alpha)) return v; }\n" : "") +
      "    let best = -INF, legal = 0, bm = null;");
    rep("        const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd);\n        if (v > best) best = v;\n        if (v > alpha) alpha = v;\n        if (alpha >= beta) return best;",
      "        const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd);\n        if (v > best) { best = v; bm = null; }\n        if (v > alpha) alpha = v;\n        if (alpha >= beta) { if (TTB.size < 300000) TTB.set(tkey, { v: toTT(best, ply), f: 1, m: null }); return best; }");
    rep("    const list = order(A.gen(S, false), killers[ply]);",
      "    const list = order(A.gen(S, false), killers[ply]);\n" +
      "    if (tte && tte.m != null) { const i = list.findIndex(it => mkey(it.a) === tte.m); if (i > 0) { const x = list[i]; list.splice(i, 1); list.unshift(x); } }   // 变体 fast：上次最好的一步先算");
    rep("      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);\n      if (v > best) best = v;",
      "      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);\n      if (v > best) { best = v; bm = it.a; }");
    rep("    return best;\n  }\n\n  // 新兵只看一步",
      "    if (TTB.size < 300000) TTB.set(tkey, { v: toTT(best, ply), f: best <= a0 ? 2 : best >= beta ? 1 : 0, m: bm ? mkey(bm) : null });   // 变体 fast：记下来\n" +
      "    return best;\n  }\n\n  // 新兵只看一步");
    rep("pfCache.clear(); upCache.clear();", "pfCache.clear(); upCache.clear(); TTB.clear();");
  }
  if (LMR > 0) {
    // 只在最多层数 > LMRMIN（默认 3）的档位用：r20 霸王 61.0%（300 局，z 3.9）；校尉（最多 3 层）48.1%，只是更快、不更强
    const LMRMIN = E.BFAI_LMRMIN != null ? +E.BFAI_LMRMIN : 3;
    // LMRD：剩下至少几层才减（默认 2）。剩 2 层就减，会把对方靠后的应着压成只看吃子，安静的反击看不见——考卷第 1 题“先升级再吃”因此丢分
    const LMRD = E.BFAI_LMRD != null ? +E.BFAI_LMRD : 2;
    // LMRPLY：从第几层起才减（默认 1）。第 1 层是对方对电脑这一步的直接应着——对方最好的反击要是个排在后面的安静着法，减了就看不出来，
    //   电脑会高估自己的安静着法（考卷第 1 题“先升级再吃”：吃炮 8.01、车到 4,3 却 8.98）。LMRTHR=1：走完能打死对方子的“造威胁”安静着法不减
    const LMRPLY = E.BFAI_LMRPLY != null ? +E.BFAI_LMRPLY : 1, LMRTHR = on('BFAI_LMRTHR', false);
    // LMR2=M（第 4 步试验）：排第 M 个以后、剩下至少 4 层的安静着法少算两层（默认 0 = 关）
    const LMR2 = +(E.BFAI_LMR2 || 0);
    rep("    kdMe = S0.turn; nodes = 0;", "    lmrOn = L.depth > " + LMRMIN + "; kdMe = S0.turn; nodes = 0;");
    rep("  let nodes = 0, deadline = Infinity, qMax = 3;", "  let nodes = 0, deadline = Infinity, qMax = 3, lmrOn = false;");
    rep("    const list = order(A.gen(S, false), killers[ply]);", "    const list = order(A.gen(S, false), killers[ply]); let mi = 0;");
    rep("      legal++;\n      const w = decided(r.S, r.ev);\n      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);",
      "      legal++; mi++;\n      const w = decided(r.S, r.ev);\n" +
      "      let v;   // 变体 fast：排在后面的安静着法先少算一层试一下\n" +
      "      if (w) v = w === side ? WIN - ply : -WIN + ply;\n" +
      "      else if (lmrOn && ply >= " + LMRPLY + " && depth >= " + LMRD + " && mi > " + LMR + " && !inChk && it.a.k === 'mv' && !it.q && !A.inCheck(r.S, r.S.turn)" + (LMRTHR ? " && !A.moveTargets(r.S, it.a.to[0], it.a.to[1]).some(m => { const q = r.S.board[m.to[1]][m.to[0]]; return q && q.s !== side && q.hp <= A.atk(r.S.board[it.a.to[1]][it.a.to[0]]); })" : "") + ") { v = -ab(r.S, depth - 2" + (LMR2 ? " - (mi > " + LMR2 + " && depth >= 4 ? 1 : 0)" : "") + ", -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha) v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); }\n" +
      "      else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);");
  }
  if (DELTA > 0) rep("      if (n >= 6) break;\n      const r = BF.attempt(S, it.a); if (!r || r.free) continue;\n      n++;",
    "      if (n >= 6) break;\n" +
    "      if (it.a.k === 'mv' && it.q && it.q.t !== 'k' && it.p && stand + baseVal(it.q) * (it.q.hp <= A.atk(it.p) ? 1 : 0.45) + " + DELTA + " < alpha) continue;   // 变体 fast：全赚也追不上，不试\n" +
    "      const r = BF.attempt(S, it.a); if (!r || r.free) continue;\n      n++;");
  if (ROOTREL > 0) {
    rep("    const base = score(S, me), chk = A.inCheck(S, me), cand = [];", "    const base = score(S, me), chk = A.inCheck(S, me), cand = [], skipped = [];");
    rep("      if (defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2)) continue;\n      if ((saving || hoard) && p.t !== 'r' && !must) continue;\n      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });",
      "      const keep0 = !(defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2)) && !((saving || hoard) && p.t !== 'r' && !must);\n" +
      "      if (!keep0) { skipped.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock }); continue; }   // 变体 fast：筛掉的先记着\n" +
      "      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });");
    rep("    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);\n    if (ex) top.push(ex);\n    return top;",
      "    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);\n    if (ex) top.push(ex);\n" +
      "    // 变体 fast：再加最多 " + ROOTREL + " 个“会改变吃子结果”的升级（守：正被一下打死、升了扛得住；攻：升了能打死原来打不死的子或能将军）\n" +
      "    { const rest = skipped.concat(cand.filter(c => !top.includes(c))).sort((x, y) => y.gain - x.gain);\n" +
      "      const F = BF.cloneState(S); F.turn = me === 'r' ? 'b' : 'r'; F.upgraded = false; F.freeUsed = false; F.jmLock = null;\n" +
      "      const thr = new Map(); try { for (const it of A.gen(F, true)) if (it.q && it.q.s === me && it.p) thr.set(it.q.id, Math.max(thr.get(it.q.id) || 0, A.atk(it.p))); } catch (e) { }\n" +
      "      let added = 0;\n" +
      "      for (const c of rest) { if (added >= " + ROOTREL + ") break;\n" +
      "        const f = c.at[0], r = c.at[1], p0 = S.board[r][f], p1 = c.S.board[r][f]; if (!p0 || !p1) continue;\n" +
      "        const m = thr.get(p0.id) || 0; let rel = m > 0 && p0.hp <= m && p1.hp > m;\n" +
      "        if (!rel) { const a0 = A.atk(p0), a1 = A.atk(p1), before = new Set();\n" +
      "          for (const mv of A.moveTargets(S, f, r)) { const q = S.board[mv.to[1]][mv.to[0]]; if (q && q.s !== me && (q.hp <= a0 || q.t === 'k')) before.add(q.id); }\n" +
      "          for (const mv of A.moveTargets(c.S, f, r)) { const q = c.S.board[mv.to[1]][mv.to[0]]; if (q && q.s !== me && (q.hp <= a1 || q.t === 'k') && !before.has(q.id)) { rel = true; break; } } }\n" +
      "        if (rel) { top.push(c); added++; } } }\n" +
      "    return top;");
  }
  if (CHKUP) {
    // 搜索里：被将军的一方（不管第几层）把所有升级都试一遍；没被将军时照旧（只在第 1 层看对方前 3 名）
    rep("    if (ply === upPly && !S.upgraded) {\n      const ups = upsOf(S, side);",
      "    if ((ply === upPly || inChk) && !S.upgraded) {   // 变体 fast：被将军的一方所有升级都试\n      const ups = inChk ? upsChk(S, side) : upsOf(S, side);");
    rep("  function upsOf(S, side) {",
      "  // 变体 fast：被将军时的全部升级（不限前 3 名；每个局面只生成一次）\n" +
      "  const upCacheChk = new Map();\n" +
      "  function upsChk(S, side) {\n" +
      "    let ups = upCacheChk.get(S); if (ups) return ups; ups = [];\n" +
      (CHKUP >= 2 ? "    const ck = new Set(XQ_.checkers(S.board, side === 'r' ? 'b' : 'r')); let kf = -9, kr = -9; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.t === 'k' && p.s === side) { kf = f; kr = r; } }\n" : "") +
      "    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k') continue; const T = A.upgradeState(S, [f, r]); if (!T) continue;\n" +
      (CHKUP >= 2 ? "      const p1 = T.board[r][f], a0 = A.atk(p), a1 = A.atk(p1); let rel = Math.max(Math.abs(f - kf), Math.abs(r - kr)) <= 1;\n" +
                    "      if (!rel) for (const m of A.moveTargets(T, f, r)) { const q = T.board[m.to[1]][m.to[0]]; if (q && ck.has(q.id) && q.hp <= a1 && q.hp > a0) { rel = true; break; } }\n" +
                    "      if (!rel) continue;\n" : "") +
      "      ups.push({ S: T, id: p.id, at: [f, r] }); }\n" +
      "    if (side === 'b' && PFX) for (const u of ups) { pfAlias.set(u.S, S); pfUp.set(u.S, u.id); }\n" +
      "    upCacheChk.set(S, ups); return ups;\n" +
      "  }\n" +
      "  function upsOf(S, side) {");
    rep("pfCache.clear(); upCache.clear();", "pfCache.clear(); upCache.clear(); upCacheChk.clear();");
    if (CHKUP >= 2) rep("  const A = BF.ai, CFG = BF.CFG;", "  const A = BF.ai, CFG = BF.CFG, XQ_ = global.XQ || require('./rules.js');");
    // 根上：自己被将军时所有升级都进搜索（兵、相 / 象也算，不限 3 种）
    rep("      const T = A.upgradeState(S, [f, r]); if (!T) continue;",
      "      const T = A.upgradeState(S, [f, r]); if (!T) continue;\n" +
      "      if (chk) { cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must: true, unlock: false }); continue; }   // 变体 fast：被将军时全都考虑");
    rep("    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);",
      "    if (chk) return cand;   // 变体 fast：被将军时全都考虑\n    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);");
  }
  if (NMP > 0) {
    if (!LMR) throw new Error('bfai_fast：NMP 要和 LMR 一起开（借用 lmrOn 只在霸王用）');
    rep("    let best = -INF, legal = 0, bm = null;",
      "    // 变体 fast：让一步试试（对方连走两步都翻不过来就不细算）\n" +
      "    if (lmrOn && ply >= 1 && depth >= 3 && !inChk && !wasNull[ply] && beta < WIN / 2 && !S.upgraded && !S.final) {\n" +
      "      let big = false; for (const row of S.board) for (const p of row) if (p && p.s === side && (p.t === 'r' || p.t === 'n' || p.t === 'c')) big = true;\n" +
      "      if (big) { const T = BF.cloneState(S); T.turn = side === 'r' ? 'b' : 'r'; T.upgraded = false; T.freeUsed = false; T.jmLock = null;\n" +
      "        wasNull[ply + 1] = true; let v; try { v = -ab(T, depth - 1 - " + NMP + ", -beta, -beta + 0.01, ply + 1, ext); } finally { wasNull[ply + 1] = false; }\n" +
      "        if (v >= beta) return v; }\n" +
      "    }\n" +
      "    let best = -INF, legal = 0, bm = null;");
    rep("  const TTB = new Map();", "  const TTB = new Map(), wasNull = [];");
  }
  if (PVS) {
    rep("      else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);",
      "      else if (lmrOn && mi > 1 && beta - alpha > 0.02) { v = -ab(r.S, depth - 1, -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha && v < beta) v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); }   // 变体 fast：窄窗口先探\n" +
      "      else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);");
  }
  if (tag === null) return s;   // source()：只要生成的代码
  const out = path.join(os.tmpdir(), `bfai_fast_${rev}_${tag || 'env'}_${process.pid}.js`);
  fs.writeFileSync(out, s);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
  if (E.BFAI_FAST_OUT && !tag) fs.writeFileSync(E.BFAI_FAST_OUT, s);
  return require(out);
}
module.exports = build(process.env, '');
module.exports.make = (opts, tag) => build(opts, tag);
module.exports.source = opts => build(opts, null);   // 只要代码（给第七版当底版：bfai_v7c61.js）
