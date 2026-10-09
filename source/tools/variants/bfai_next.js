// 电脑变体（只供模拟 / 验证）：在线上电脑（C61 已上线 + TD H52 的“将死前补算升级”）上试下一批改动。
//   底版：git 上的 source/src/bfai.js（BFAI_NEXT_BASE，默认 f998d98 = 合并主线后的线上电脑，新规则），按文字锚点改；开关全关时和底版逐字相同。
//   BFAI_LMR2=M：排第 M 个以后、剩至少 4 层的安静着法少算两层（线上是从第 3 个起少算一层）。霸王同搜索量 4.02 → 4.24 层（旧规则，87 个局面）
//   BFAI_NMP=R：让一步试试（空着裁剪）——没被将军、剩至少 3 层、自己还有车马炮时先假装停一手让对方连走、少算 R+1 层，对方都翻不过来就不细算。只在霸王（借 lmrOn）
//   BFAI_CHKMUST=1：被将军时，相 / 象 / 兵升一级攻击变大的（象二级起攻击 2，H50；兵三级起攻击 2，r6）也算“保命的升级”（TD 在 H52 问的）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_NEXT_BASE || 'f998d98';
const src0 = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
function build(E, tag) {
  let s = src0;
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_next：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
  const LMR2 = +(E.BFAI_LMR2 || 0), NMP = +(E.BFAI_NMP || 0), CHKMUST = +(E.BFAI_CHKMUST || 0);
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
