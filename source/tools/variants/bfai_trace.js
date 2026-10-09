// 电脑变体（只供复盘）：在线上电脑上加“想法记录”，搜索和估值本身一点不改（走法、分数和底版逐步相同）。
//   底版：git 上的 source/src/bfai.js（BFAI_TR_BASE，默认 ecf1ddd = 线上电脑），按文字锚点改。加了三样：
//   1. 预想线：每一步根上的候选都记下“它以为接下来双方会怎么走”（搜索里的主变例，k.pv）；think.last.topPv / pickPv
//   2. 估值拆分：traceScore(S, me) 把 score() 拆成 子力 / 位置 / 贴脸 / 帅 / 军功 / 兵法 / 其他（终极兵法、封锁、决战）
//   3. 根上全部候选：think.last.all = [{up, a, v, pv, exact（false = 分数只是上界）, off（名额外只粗算）}]
//   .judge()：再生成一份给裁判用——对方“先升级再走”全都看、第 3 层也看（线上电脑只看静态收益前 3 名、只在第 1 层，裁判不能有同一个盲区）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_TR_BASE || 'ecf1ddd';
const src0 = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
let s;
function build(judge) {
s = src0;
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_trace：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
// ---- 估值拆分 ----
rep('  function score(S, me) {', '  let TRC = null, PVL = [];\n  function score(S, me) {');
rep('      let x;\n', '      let x; var _xb = 0, _xpre = null;\n');
rep("        x = baseVal(p, s === 'r' ? hvB : hvR);\n", "        x = baseVal(p, s === 'r' ? hvB : hvR); _xb = x;\n");
rep("        if (!fin && ek && dk <= 4 && p.hp > (s === 'r' ? dB : dR)) {", "        _xpre = x;\n        if (!fin && ek && dk <= 4 && p.hp > (s === 'r' ? dB : dR)) {");
rep('      v += s === me ? x : -x;\n    }\n',
  "      if (TRC) { const sg = s === me ? 1 : -1, xk = _xpre == null ? 0 : x - _xpre; TRC.子力 += sg * _xb; TRC.贴脸 += sg * xk; TRC[p.t === 'k' ? '帅' : '位置'] += sg * (x - _xb - xk); }\n      v += s === me ? x : -x;\n    }\n    const _v0 = v;\n");
rep('    v += 0.3 * (S.merit[me] - S.merit[other(me)]);', '    v += 0.3 * (S.merit[me] - S.merit[other(me)]); const _v1 = v;');
rep('    v += art(me) - art(other(me));', '    v += art(me) - art(other(me)); const _v2 = v;');
rep('    if (fin && S.occ) v += 7 * ((S.occ[me] || 0) - (S.occ[other(me)] || 0));\n    return v;',
  "    if (fin && S.occ) v += 7 * ((S.occ[me] || 0) - (S.occ[other(me)] || 0));\n    if (TRC) { TRC.军功 = _v1 - _v0; TRC.兵法 = _v2 - _v1; TRC.其他 = v - _v2; }\n    return v;");
// ---- 预想线（主变例）：每个 ab() 返回前把自己这一层往下的最好路线放进 PVL ----
rep('      else return qs(S, alpha, beta, ply, 0);', "      else { PVL = []; return qs(S, alpha, beta, ply, 0); }");
rep('    if (fewPieces(S) && stuck(S)) return -WIN + ply;\n    let best = -INF, legal = 0;', '    if (fewPieces(S) && stuck(S)) { PVL = []; return -WIN + ply; }\n    let best = -INF, legal = 0, bl = [];');
rep('      const T = A.upgradeState(S, [f, r]); if (T) ups.push({ S: T, g: score(T, side) - base, id: p.id });',
  '      const T = A.upgradeState(S, [f, r]); if (T) ups.push({ S: T, g: score(T, side) - base, id: p.id, at: [f, r] });');
rep('        const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd);\n        if (v > best) best = v;\n        if (v > alpha) alpha = v;\n        if (alpha >= beta) return best;',
  "        const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd); const ln = [{ k: 'up', at: u.at }].concat(PVL);\n        if (v > best) { best = v; bl = ln; }\n        if (v > alpha) alpha = v;\n        if (alpha >= beta) { PVL = bl; return best; }");
rep('      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);\n      if (v > best) best = v;',
  '      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); const ln = [it.a].concat(w ? [] : PVL);\n      if (v > best) { best = v; bl = ln; }');
rep('        const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(k.S, Math.max(0, depth - 1), -beta, -alpha, ply + 1, ext);\n        if (v > best) best = v;',
  '        const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(k.S, Math.max(0, depth - 1), -beta, -alpha, ply + 1, ext); const ln = [k.a].concat(w ? [] : PVL);\n        if (v > best) { best = v; bl = ln; }');
rep('      if (pfHit) return best;', '      if (pfHit) { PVL = bl; return best; }');
rep('      if (!r) return -WIN + ply;                // 将死 / 困毙\n      return -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);',
  "      if (!r) { PVL = []; return -WIN + ply; }                // 将死 / 困毙\n      { const v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); PVL = [{ k: 'pass' }].concat(PVL); return v; }");
rep('    return best;\n  }\n\n  // 新兵只看一步', '    PVL = bl; return best;\n  }\n\n  // 新兵只看一步');
rep('          k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1);', '          k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1); k.pvn = k.done ? [] : PVL;');
rep('      for (const k of kids) { k.v = k.nv; k.nv = null; k.vg = !!k.gn; }', '      for (const k of kids) { k.v = k.nv; k.nv = null; k.vg = !!k.gn; k.pv = k.pvn || k.pv; k.pvn = null; k.exact = d >= 1; }');
rep('        const b = kids[0]; pfPly = 1; b.v = -ab(b.S, d - 1, -INF, INF, 1); b.vg = true;', '        const b = kids[0]; pfPly = 1; b.v = -ab(b.S, d - 1, -INF, INF, 1); b.vg = true; b.pv = PVL;');
rep('    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone, top: kids.slice(0, 5).map(k => [k.up ? { up: k.up.at, ...k.a } : k.a, +k.v.toFixed(2)]) };',
  "    { const bestV = kids.length ? kids[0].v : 0, M = L.noise * 1.6 + 0.02;\n" +
  "      think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone, top: kids.slice(0, 5).map(k => [k.up ? { up: k.up.at, ...k.a } : k.a, +k.v.toFixed(2)]),\n" +
  "        pick: { up: pick.up ? pick.up.at : null, a: pick.a, v: pick.v, pv: pick.pv || [] },\n" +
  "        all: kids.map(k => ({ up: k.up ? k.up.at : null, a: k.a, v: k.v, pv: k.pv || [], exact: k.v > bestV - M * 0.95 || !!k.done, off: !!k.off })) }; }");
rep('  const BFAI = { think, score, LEVELS, apiVersion: 1 };',
  "  const traceScore = (S, me) => { TRC = { 子力: 0, 位置: 0, 贴脸: 0, 帅: 0 }; const v = score(S, me); const r = TRC; TRC = null; r.总 = v; return r; };\n  const BFAI = { think, score, traceScore, LEVELS, apiVersion: 1 };");
// 裁判：“对方先升级再走”不只看静态收益前 3 名，所有能升的都看，第 3 层也看（慢，但不会和电脑有同一个盲区）
//   judge = 'wide'：根上自己的升级也不筛（看得最全、算得最浅）；'opp'：只放开对方的升级，根上照线上电脑（算得深一些）
if (judge) {
  rep('    ups.sort((x, y) => y.g - x.g); ups = ups.slice(0, 3);', '    ups.sort((x, y) => y.g - x.g);   // 裁判：全都看');
  rep('    if (ply === upPly && !S.upgraded) {', '    if ((ply === upPly || (upPly > 0 && ply === upPly + 2)) && !S.upgraded) {   // 裁判：第 3 层也看');
  // 根上自己的升级也不筛：线上电脑在“快攒够钱升车”时只肯升车、守子没被捉不升、只留前 3 名——会连自己“升一级就能杀”都看不见
  if (judge === 'wide') rep('      if (defender && !must && !unlock && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n      if ((saving || hoard) && p.t !== \'r\' && !must) continue;\n', '');
  if (judge === 'wide') rep('    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);\n    if (ex) top.push(ex);\n    return top;', '    return cand;   // 裁判：全都看');
}
const out = path.join(os.tmpdir(), `bfai_trace_${rev}_${judge ? judge + '_' : ''}${process.pid}.js`);
fs.writeFileSync(out, s);
process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
return require(out);
}
module.exports = build(false);
const JJ = {};
module.exports.judge = (kind = 'wide') => JJ[kind] || (JJ[kind] = build(kind));
