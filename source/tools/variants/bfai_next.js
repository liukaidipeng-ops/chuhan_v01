// 电脑变体（只供模拟 / 验证）：在线上电脑（C61 已上线 + TD H52 的“将死前补算升级”）上试下一批改动。
//   底版：git 上的 source/src/bfai.js（BFAI_NEXT_BASE，默认 a5ad197 = 线上电脑：C61 + H52 + H54 观察接口 + H55 拒马，新规则），按文字锚点改；开关全关时和底版逐字相同。
//   BFAI_LMR2=M：排第 M 个以后、剩至少 4 层的安静着法少算两层（线上是从第 3 个起少算一层）。霸王同搜索量 4.02 → 4.24 层（旧规则，87 个局面）
//   BFAI_NMP=R：让一步试试（空着裁剪）——没被将军、剩至少 3 层、自己还有车马炮时先假装停一手让对方连走、少算 R+1 层，对方都翻不过来就不细算。只在霸王（借 lmrOn）
//   BFAI_ROOTREL=N：根上自己的升级候选再加最多 N 个“会改变吃子结果”的（守：正被一下打死、升了扛得住；攻：升了能打死原来打不死的子或能将军）。
//     Ham 10-09 霸王局：第 29 回合最好是“升象 + 象吃炮”（象二级攻击 2，H50），线上的筛子“守子没被捉不升”把它挡掉了；旧规则下对电脑 57.2%（和不加一样）
//     BFAI_ROOTATK=1：只补“升了攻击变大、能打死原来打不死的子”的（窄版：r26 宽版 47.2% 不划算；象 / 士二级、兵三级、车马炮 r6 表里升级加攻击）
//   BFAI_RLMR=K：根上也少算——从第 K 个起，不吃子、不先升级、走完不将军、自己没被将军的走子，第 4 层起先少算一层，比门槛好才按原层数重算（只在霸王）。
//     Ham 那局第 27 回合根上 90 个候选，10 万节点只算 2 层
//   BFAI_UPESC=1：C63 电脑那一半（只有升级才解得了将时所有升法都试，不再给空行动）
//   BFAI_DYN=X：难走的局面多想（Ham 10-10：语音 + 催促的拟人思考时间）——基础预算用完时还没算过 3 层、或者最后一层最好的那步换了 / 分数掉了 1 分以上，
//     预算放宽到 X 倍（按节点数收手时节点上限 ×X；按时间时 3 秒 → 3X 秒）。只在霸王（最多层数 > 3）
//   BFAI_UP3K=N：对方第二手（第 3 层）也能先升级，但只看“升了以后能走到我帅身边一格内、升之前走不到”的，最多 N 种（g5 第 22 回合：兵升四级神速营跳将，原来只在对方第一手看升级）
//   BFAI_FASTFP=1：局面指纹提速（剖析：线上霸王 7.4% 的时间花在 fp 上，大半是逐字散列子的字段名）
//   BFAI_TUNE_W=文件（相对 source/）：换上自动调出来的估值权重（fit.js --out 写的）；r30：对同底版霸王 83%、校尉 84%（f998d98 底版，bfai_tuned.js）
//     BFAI_TUNE_FAST=1：权重写回原公式（tools/tune/score_w.js，和特征版逐个局面相等、不慢；上线用这个）
//   BFAI_NODEX=x：节点上限 ×x（比“慢 12% 的打分”时给 0.88，和不慢的公平比）
//   BFAI_ROOTUPALL=1：根上自己的每种升级都进搜索（LEVELS.hard / mid.rootUpAll）
//   BFAI_PVS=1：主变搜索（排第 2 个起的着法先零窗口快试，落进窗口才全窗口重算）
//   BFAI_REVALL=1|2：召回不按“车还在只救车”筛（1 车马炮都行，2 什么子都行）（g6）
//   BFAI_ARTOPEN=汉,楚：主帅兵法现在就能用时，留着值几分（原来不管能不能用：汉 4、楚 3）
//   BFAI_CHKMUST=1：被将军时，相 / 象 / 兵升一级攻击变大的（象二级起攻击 2，H50；兵三级起攻击 2，r6）也算“保命的升级”（TD 在 H52 问的）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_NEXT_BASE || 'a5ad197';
const src0 = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
function build(E, tag) {
  let s = src0;
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_next：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
  const LMR2 = +(E.BFAI_LMR2 || 0), NMP = +(E.BFAI_NMP || 0), CHKMUST = +(E.BFAI_CHKMUST || 0), ROOTREL = +(E.BFAI_ROOTREL || 0), ROOTATK = +(E.BFAI_ROOTATK || 0), RLMR = +(E.BFAI_RLMR || 0), UPESC = +(E.BFAI_UPESC || 0), DYN = +(E.BFAI_DYN || 0), UP3K = +(E.BFAI_UP3K || 0), FASTFP = +(E.BFAI_FASTFP || 0), PSPLIT = +(E.BFAI_PSPLIT || 0), TUNEW = E.BFAI_TUNE_W || '', TUNEFAST = +(E.BFAI_TUNE_FAST || 0), REVALL = +(E.BFAI_REVALL || 0), ARTOPEN = E.BFAI_ARTOPEN || '', PVS = +(E.BFAI_PVS || 0), ROOTUPALL = +(E.BFAI_ROOTUPALL || 0);
  if (LMR2) rep('{ v = -ab(r.S, depth - 2, -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha)', '{ v = -ab(r.S, depth - 2 - (mi > ' + LMR2 + ' && depth >= 4 ? 1 : 0), -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha)');
  if (NMP) {
    rep('    let best = -INF, legal = 0, bm = null;',
      '    // 变体 next：让一步试试（空着裁剪）\n' +
      '    if (lmrOn && ply >= 1 && depth >= 3 && !inChk && !wasNull[ply] && beta < WIN / 2 && !S.upgraded && !S.final) {\n' +
      "      let big = false; for (const row of S.board) for (const p of row) if (p && p.s === side && (p.t === 'r' || p.t === 'n' || p.t === 'c')) big = true;\n" +
      "      if (big) { const T = BF.cloneState(S); T.turn = side === 'r' ? 'b' : 'r'; T.upgraded = false; T.freeUsed = false; T.jmLock = null;\n" +
      '        wasNull[ply + 1] = true; let v; try { v = -ab(T, depth - 1 - ' + NMP + ', -beta, -beta + 0.01, ply + 1, ext); } finally { wasNull[ply + 1] = false; }\n' +
      '        if (v >= beta) return v; }\n' +
      '    }\n' +
      '    let best = -INF, legal = 0, bm = null;');
    rep('  const TTB = new Map();', '  const TTB = new Map(), wasNull = [];');
  }
  if (CHKMUST) rep("must = thr || (chk && p.t !== 'e' && p.t !== 'p');", "must = thr || (chk && ((p.t !== 'e' && p.t !== 'p') || A.atk(T.board[r][f]) > A.atk(p)));   // 变体 next：升了攻击变大的相 / 象 / 兵也算");
  if (ROOTREL > 0) {
    rep("    const base = score(S, me), chk = A.inCheck(S, me), cand = [];", "    const base = score(S, me), chk = A.inCheck(S, me), cand = [], skipped = [];");
    rep("      if (defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2)) { if (rec) rec.push({ at: [f, r], t: p.t, lv: p.lv, why: '守子没被捉、没被将军' }); continue; }\n      if ((saving || hoard) && p.t !== 'r' && !must) { if (rec) rec.push({ at: [f, r], t: p.t, lv: p.lv, why: saving ? '攒军功先升车' : '攒军功放终极兵法' }); continue; }\n      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });",
      "      const keep0 = !(defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2)) && !((saving || hoard) && p.t !== 'r' && !must);\n" +
      "      if (!keep0) { skipped.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock }); continue; }   // 变体 next：筛掉的先记着\n" +
      "      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });");
    rep("    return top;\n  }\n  // 裁判开关 rootUpAll",
      "" +
      "    // 变体 next：再加最多 " + ROOTREL + " 个“会改变吃子结果”的升级（守：正被一下打死、升了扛得住；攻：升了能打死原来打不死的子或能将军）\n" +
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
      "        if (rel" + (ROOTATK ? " && A.atk(p1) > A.atk(p0)" : "") + ") { top.push(c); added++; } } }\n" +
      "    return top;\n  }\n  // 裁判开关 rootUpAll");
  }
  if (RLMR) {
    rep("      try {\n        for (const k of kids) {\n          if (k.off) { k.nv = -INF; n++; continue; }", "      try {\n        let ri = 0;   // 变体 next：根上靠后的安静着法先少算一层\n        for (const k of kids) {\n          if (k.off) { k.nv = -INF; n++; continue; }");
    rep("          k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1);",
      "          if (k.done) k.nv = k.q;\n" +
      "          else if (lmrOn && d >= 4 && ++ri > " + RLMR + " && !chk0 && k.a.k === 'mv' && !k.up && !S.board[k.a.to[1]][k.a.to[0]] && !A.inCheck(k.S, k.S.turn)) { k.nv = -ab(k.S, d - 2, -INF, -alpha + M, 1); if (k.nv > alpha - M) k.nv = -ab(k.S, d - 1, -INF, -alpha + M, 1); }\n" +
      "          else k.nv = -ab(k.S, d - 1, -INF, -alpha + M, 1);");
  }
  if (UPESC) {   // C63 的电脑那一半（tools/variants/bfai_upescape.patch）：只有升级才解得了将时把所有升法都试一遍
    rep("    if (!kids.length) {\n      // 普通着法一步都没有（被将死的样子），但背水一战还能解：就用它",
      "    if (!kids.length && chk0 && !pofu.length && !S0.upgraded) {\n" +
      "      if (S !== S0) { S = S0; seq.length = 0; }\n" +
      "      const all = upgradeAll(S);\n" +
      "      for (const c of all) for (const k of A.expand(c.S)) { k.up = c; k.base = null; k.own = false; kids.push(k); }\n" +
      "      if (!kids.length && me === 'b') { for (const c of all) for (const k of A.pofuPairs(c.S)) { k.up = c; k.gain = score(k.S, me); pofu.push(k); } pofu.sort((x, y) => y.gain - x.gain); }\n" +
      "      if (TR && (kids.length || pofu.length)) TR.upEscape = true;\n" +
      "    }\n" +
      "    if (!kids.length) {\n      // 普通着法一步都没有（被将死的样子），但背水一战还能解：就用它");
  }
  if (DYN) {   // 难走的局面多想：基础预算用完时还没算过 3 层、或者最后一层最好的那步换了 / 分数掉了 1 分以上，预算放宽到 DYN 倍（只一次）
    rep("    const n0 = nodes;\n    // 逐层加深", "    const n0 = nodes;\n    let dynN = L.nodes, dynB = L.budget, dynOn = false, crit = false, prevBK = null, prevV = null;   // 变体 next：难走的局面多想\n    // 逐层加深");
    rep("      const soft = t0 + L.budget;", "      const soft = t0 + dynB;");
    rep("        if (d > 2 && nodes - n0 > L.nodes * 0.5) { why = 'nodes'; break; }\n        nodeCap = d <= 2 ? Infinity : n0 + L.nodes;",
      "        if (!dynOn && L.depth > 3 && d > 2 && nodes - n0 > L.nodes * 0.5 && (crit || depthDone <= 3)) { dynOn = true; dynN = Math.round(L.nodes * " + DYN + "); think.dyn = (think.dyn || 0) + 1; }\n" +
      "        if (d > 2 && nodes - n0 > dynN * 0.5) { why = 'nodes'; break; }\n        nodeCap = d <= 2 ? Infinity : n0 + dynN;");
    rep("        if (d > 3 && !thin && now() - t0 > L.budget * 0.3) { why = 'time'; break; }",
      "        if (!dynOn && L.depth > 3 && d > 3 && now() - t0 > L.budget * 0.3 && (crit || depthDone <= 3)) { dynOn = true; dynB = L.budget * " + DYN + "; think.dyn = (think.dyn || 0) + 1; }\n" +
      "        if (d > 3 && !thin && now() - t0 > dynB * 0.3) { why = 'time'; break; }");
    rep("t0 + L.budget * 1.5 : soft + L.budget * 0.3;", "t0 + L.budget * 1.5 : soft + dynB * 0.3;");
    rep("      depthDone = d;\n", "      depthDone = d;\n      { const bk = JSON.stringify(actOf(kids[0])); if (d >= 3 && ((prevBK && bk !== prevBK) || (prevV != null && kids[0].v < prevV - 1))) crit = true; prevBK = bk; prevV = kids[0].v; }   // 变体 next：最好的那步换了、分数掉了 → 难走\n");
  }
  if (UP3K) {   // 对方第二手（第 3 层）也能先升级——只看“升了以后能走到我帅身边一格内（或吃到帅身边的子）”的，最多 UP3K 种
    rep("const tkey = fp(S) + ':' + depth + ':' + ext + ':' + (upAt(S, ply) ? 1 : 0) + (ply === pfPly ? 2 : 0),",
      "const tkey = fp(S) + ':' + depth + ':' + ext + ':' + (upAt(S, ply) ? 1 : 0) + (ply === pfPly ? 2 : 0) + (ply === upPly + 2 && upPly > 0 && !S.upgraded ? 4 : 0),");
    rep("    if (upAt(S, ply)) {",
      "    if (upPly > 0 && ply === upPly + 2 && !S.upgraded) {   // 变体 next：对方第二手的“贴帅”升级（g5 第 22 回合：四级兵神速营跳将）\n" +
      "      for (const u of upsNearK(S, side)) {\n" +
      "        const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd);\n" +
      "        if (v > best) { best = v; bm = null; }\n" +
      "        if (v > alpha) alpha = v;\n" +
      "        if (alpha >= beta) return best;\n" +
      "      }\n" +
      "    }\n" +
      "    if (upAt(S, ply)) {");
    rep("  function upsOf(S, side) {",
      "  // 变体 next：side 方升一级以后，能走到对方帅身边一格内（含帅本身）的那几种升级，升之前走不到的才算；每个局面只算一次\n" +
      "  const upNearCache = new Map();\n" +
      "  function upsNearK(S, side) {\n" +
      "    let ups = upNearCache.get(S); if (ups) return ups; ups = [];\n" +
      "    let k = null; for (let r = 0; r < 10 && !k; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.t === 'k' && p.s !== side) { k = [f, r]; break; } }\n" +
      "    if (k) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {\n" +
      "      const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k' || Math.abs(f - k[0]) + Math.abs(r - k[1]) > 5) continue;\n" +
      "      const T = A.upgradeState(S, [f, r]); if (!T) continue;\n" +
      "      const near = mv => Math.max(Math.abs(mv.to[0] - k[0]), Math.abs(mv.to[1] - k[1])) <= 1;\n" +
      "      const before = new Set(A.moveTargets(S, f, r).filter(near).map(mv => mv.to[0] + mv.to[1] * 9));\n" +
      "      if (A.moveTargets(T, f, r).some(mv => near(mv) && !before.has(mv.to[0] + mv.to[1] * 9))) ups.push({ S: T, g: score(T, side) - score(S, side) });\n" +
      "    }\n" +
      "    ups.sort((x, y) => y.g - x.g); ups = ups.slice(0, " + UP3K + "); upNearCache.set(S, ups); return ups;\n" +
      "  }\n" +
      "  function upsOf(S, side) {");
    rep("pfCache.clear(); upCache.clear();", "pfCache.clear(); upCache.clear(); upNearCache.clear();");
  }
  if (FASTFP) {   // 局面指纹提速：子的字段名、字符串值不再逐字散列，换成第一次见到时编的号（散列函数变了，查表结果只差在极少的碰撞上）
    rep("    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {\n      const p = S.board[r][f]; if (!p) continue;\n      mix(1000 + r * 9 + f);\n      for (const k in p) { mixS(k); const v = p[k]; if (typeof v === 'number') { mix(v | 0); mix(Math.round(v * 4096) | 0); } else if (typeof v === 'string') { mix(7); mixS(v); }",
      "    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {\n      const p = S.board[r][f]; if (!p) continue;\n      mix(1000 + r * 9 + f);\n      for (const k in p) { mix(fpId(k)); const v = p[k]; if (typeof v === 'number') { mix(v | 0); if (v !== (v | 0)) mix(Math.round(v * 4096) | 0); } else if (typeof v === 'string') { mix(7); mix(fpId(v)); }");
    rep("  function fp(S) {", "  // 变体 next：字段名 / 字符串值 → 编号（同一个字符串永远同一个号）\n  const FPID = new Map();\n  const fpId = k => { let i = FPID.get(k); if (i === undefined) { i = 0x9e3779b1 ^ Math.imul(FPID.size + 1, 2654435761); FPID.set(k, i); } return i; };\n  function fp(S) {");
  }
  if (PSPLIT) {   // 多核分头算（原型，只供量）：BFAI.part = { i, k, alpha(d) }——第 3 层起根上只算“第 2 层排名 % k === i”的那些步；alpha(d) 可给一个别的核已算出的下限
    rep("          if (k.off) { k.nv = -INF; n++; continue; }",
      "          if (k.off) { k.nv = -INF; n++; continue; }\n          if (BFAI.part && d > 2 && k.ow !== BFAI.part.i) { k.nv = -INF; n++; continue; }   // 变体 next：多核分头算，这步归别的核");
    rep("      for (const k of kids) { k.v = k.nv; k.nv = null; k.vg = !!k.gn; }",
      "      for (const k of kids) { if (BFAI.part && d > 2 && k.ow !== BFAI.part.i) { k.nv = -INF; } k.v = k.nv; k.nv = null; k.vg = !!k.gn; }");
    rep("      depthDone = d;\n", "      depthDone = d;\n      if (BFAI.part && d === 2) kids.forEach((k, i) => { k.ow = i % BFAI.part.k; });\n      if (BFAI.part && BFAI.part.onIter) BFAI.part.onIter({ d, best: actOf(kids[0]), v: kids[0].v, nodes: nodes - n0 });\n");
    rep("      let alpha = -INF, n = 0, cut = false;", "      let alpha = BFAI.part && BFAI.part.alpha && d > 2 ? BFAI.part.alpha(d) : -INF, n = 0, cut = false;");
  }
  if (TUNEW && TUNEFAST) {   // 换估值权重、写回原公式（tools/tune/score_w.js，上线用的写法：不慢）
    const w = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', TUNEW), 'utf8')).w;
    rep('  function score(S, me, P) {', require('../tune/score_w.js').source(w) + '  function scoreOrig(S, me, P) {');
    rep('hist.clear(); killers.length = 0;', 'hist.clear(); killers.length = 0; potC = null; skC = null;');
  } else if (TUNEW) {   // 换估值权重（tools/tune/）：score 变成“特征 × 权重”；带 P（分项，只给 scoreParts）时仍用原公式
    const feats = JSON.stringify(path.join(__dirname, '..', 'tune', 'feats.js'));
    const wtxt = JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', TUNEW), 'utf8')).w);
    rep('  function score(S, me, P) {',
      '  // 变体 next：自动调出来的权重（' + path.basename(TUNEW) + '）\n' +
      '  const TUNE = require(' + feats + '), TW = TUNE.vec(' + wtxt + ');\n' +
      "  function score(S, me, P) { if (P) return scoreOrig(S, me, P); const v = TUNE.dot(TW, TUNE.feats(S, A, CFG)); return me === 'r' ? v : -v; }\n" +
      '  function scoreOrig(S, me, P) {');
  }
  if (ARTOPEN) {   // 主帅兵法“现在就能用”时，留着它值几分（汉,楚）：背水开着时召回 / 背水都要车马炮丢一半、比对方少才开（g6：召回能用了还一直留着，到 −15 分才用）
    const [vr, vb] = ARTOPEN.split(',').map(Number);
    const helper = "  // 变体 next：主帅兵法现在能不能用（和引擎 artOpen 同一条：背水开着时，车马炮比对方少、最多剩 maxLeft 枚）\n" +
      "  function artOpenFor(S, s) { const B = bsOn(); if (!B) return true; let m = 0, o = 0; for (const row of S.board) for (const p of row) if (p && (p.t === 'r' || p.t === 'n' || p.t === 'c')) { if (p.s === s) m++; else o++; } return m < o && (B.maxLeft == null || m <= B.maxLeft); }\n";
    if (s.includes("const art = s => (S.used.art[s] ? 0 : s === 'r' ? EW.art_r : EW.art_b);")) {
      rep("const art = s => (S.used.art[s] ? 0 : s === 'r' ? EW.art_r : EW.art_b);", "const art = s => (S.used.art[s] ? 0 : artOpenFor(S, s) ? (s === 'r' ? " + vr + " : " + vb + ") : s === 'r' ? EW.art_r : EW.art_b);   // 变体 next：能用时留着值多少另算");
    } else {
      rep("const art = s => (S.used.art[s] ? 0 : s === 'r' ? 4 : bsOn() ? BSV : 3);", "const art = s => (S.used.art[s] ? 0 : artOpenFor(S, s) ? (s === 'r' ? " + vr + " : " + vb + ") : s === 'r' ? 4 : bsOn() ? BSV : 3);   // 变体 next：能用时留着值多少另算");
    }
    rep("  function baseVal(p, heavy) {", helper + "  function baseVal(p, heavy) {");
  }
  if (ROOTUPALL) {   // 根上自己的每种升级都进搜索（不筛前 3 名）——复盘裁判的 rootUpAll 开关，霸王 / 校尉都开；平均层数只少约 0.16（g5/g6 45 局面）
    rep('  const BFAI = { think, score, scoreParts, LEVELS,', "  LEVELS.hard.rootUpAll = true; LEVELS.mid.rootUpAll = true;   // 变体 next：根上升级全看\n  const BFAI = { think, score, scoreParts, LEVELS,");
  }
  if (PVS) {   // 主变搜索：排第 2 个起、没走少算那条路的着法，先用零窗口快试，分数落进窗口里才按全窗口重算（理论上结果不变、节点更少）
    rep('      else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);',
      '      else if (mi > 1 && beta - alpha > 0.02) { v = -ab(r.S, depth - 1, -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha && v < beta) v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); }   // 变体 next：主变搜索\n' +
      '      else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);');
  }
  if (REVALL) {   // 召回不按兵种筛（g6：车还在时不肯召回三级炮；背水开着时召回本来就只有落后一半大子才能用）。1：车马炮都行；2：什么子都行
    rep("const ok = k => { const t = tOf(k.a.id); return t === 'r' || ((!rook || S.used.art.b > 0) && (t === 'c' || t === 'n')); };",
      "const ok = k => { const t = tOf(k.a.id); return " + (REVALL >= 2 ? "true" : "t === 'r' || t === 'c' || t === 'n'") + "; };   // 变体 next：召回不按“车还在只救车”筛");
  }
  if (tag === null) return s;
  const out = path.join(os.tmpdir(), `bfai_next_${rev}_${tag || 'env'}_${process.pid}.js`);
  fs.writeFileSync(out, s);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
  if (E.BFAI_NEXT_OUT && !tag) fs.writeFileSync(E.BFAI_NEXT_OUT, s);
  const M = require(out);
  const NODEX = +(E.BFAI_NODEX || 0);   // 按节点数收手时各档的节点上限 ×NODEX（模拟“打分慢了 / 多想了”）：bfsim 的 --nodes 给两边设同一个数，这里拦下来乘
  if (NODEX) for (const lv of Object.keys(M.LEVELS)) { const H = M.LEVELS[lv]; let n = H.nodes; Object.defineProperty(H, 'nodes', { enumerable: true, configurable: true, get() { return n; }, set(v) { n = v ? Math.round(v * NODEX) : v; } }); }
  return M;
}
module.exports = build(process.env, '');
module.exports.make = (opts, tag) => build(opts, tag);
module.exports.source = opts => build(opts, null);   // 只要代码（给第七版、调权重当底版）
