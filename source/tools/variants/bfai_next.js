// 电脑变体（只供模拟 / 验证）：在线上电脑（C61 已上线 + TD H52 的“将死前补算升级”）上试下一批改动。
//   底版：git 上的 source/src/bfai.js（BFAI_NEXT_BASE，默认 a5ad197 = 线上电脑：C61 + H52 + H54 观察接口 + H55 拒马，新规则），按文字锚点改；开关全关时和底版逐字相同。
//   BFAI_LMR2=M：排第 M 个以后、剩至少 4 层的安静着法少算两层（线上是从第 3 个起少算一层）。霸王同搜索量 4.02 → 4.24 层（旧规则，87 个局面）
//   BFAI_NMP=R：让一步试试（空着裁剪）——没被将军、剩至少 3 层、自己还有车马炮时先假装停一手让对方连走、少算 R+1 层，对方都翻不过来就不细算。只在霸王（借 lmrOn）
//   BFAI_ROOTREL=N：根上自己的升级候选再加最多 N 个“会改变吃子结果”的（守：正被一下打死、升了扛得住；攻：升了能打死原来打不死的子或能将军）。
//     Ham 10-09 霸王局：第 29 回合最好是“升象 + 象吃炮”（象二级攻击 2，H50），线上的筛子“守子没被捉不升”把它挡掉了；旧规则下对电脑 57.2%（和不加一样）
//     BFAI_ROOTATK=1：只补“升了攻击变大、能打死原来打不死的子”的（窄版：r26 宽版 47.2% 不划算；象 / 士二级、兵三级、车马炮 r6 表里升级加攻击）
//   BFAI_CHKMUST=1：被将军时，相 / 象 / 兵升一级攻击变大的（象二级起攻击 2，H50；兵三级起攻击 2，r6）也算“保命的升级”（TD 在 H52 问的）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_NEXT_BASE || 'a5ad197';
const src0 = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
function build(E, tag) {
  let s = src0;
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_next：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
  const LMR2 = +(E.BFAI_LMR2 || 0), NMP = +(E.BFAI_NMP || 0), CHKMUST = +(E.BFAI_CHKMUST || 0), ROOTREL = +(E.BFAI_ROOTREL || 0), ROOTATK = +(E.BFAI_ROOTATK || 0);
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
  if (tag === null) return s;
  const out = path.join(os.tmpdir(), `bfai_next_${rev}_${tag || 'env'}_${process.pid}.js`);
  fs.writeFileSync(out, s);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
  if (E.BFAI_NEXT_OUT && !tag) fs.writeFileSync(E.BFAI_NEXT_OUT, s);
  return require(out);
}
module.exports = build(process.env, '');
module.exports.make = (opts, tag) => build(opts, tag);
module.exports.source = opts => build(opts, null);   // 只要代码（给第七版、调权重当底版）
