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
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_FAST_BASE || '4db9f8c';
const src0 = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
function build(E, tag) {
  let s = src0;
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_fast：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
  const on = (k, d) => E[k] == null ? d : !/^(0|false|off)$/i.test(String(E[k]));
  const TT = on('BFAI_TT', true), TTMOVE = on('BFAI_TTMOVE', true), LMR = +(E.BFAI_LMR || 0), DELTA = +(E.BFAI_DELTA || 0), ROOTREL = +(E.BFAI_ROOTREL || 0);
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
    rep("    const list = order(A.gen(S, false), killers[ply]);", "    const list = order(A.gen(S, false), killers[ply]); let mi = 0;");
    rep("      legal++;\n      const w = decided(r.S, r.ev);\n      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);",
      "      legal++; mi++;\n      const w = decided(r.S, r.ev);\n" +
      "      let v;   // 变体 fast：排在后面的安静着法先少算一层试一下\n" +
      "      if (w) v = w === side ? WIN - ply : -WIN + ply;\n" +
      "      else if (depth >= 2 && mi > " + LMR + " && !inChk && it.a.k === 'mv' && !it.q && !A.inCheck(r.S, r.S.turn)) { v = -ab(r.S, depth - 2, -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha) v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); }\n" +
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
  const out = path.join(os.tmpdir(), `bfai_fast_${rev}_${tag || 'env'}_${process.pid}.js`);
  fs.writeFileSync(out, s);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
  if (E.BFAI_FAST_OUT && !tag) fs.writeFileSync(E.BFAI_FAST_OUT, s);
  return require(out);
}
module.exports = build(process.env, '');
module.exports.make = (opts, tag) => build(opts, tag);
