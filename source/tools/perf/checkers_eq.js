// 引擎提速核对：随机对局（含随机升级、技能、兵法）里的大量局面，checkers(b, s) 非空 ⇔ inCheck(b, 对方)？
// 两者永远一致，checkers 就可以先用便宜的 inCheck 看一眼：对方帅没被将军就直接返回 []（见 tools/perf/README.md）
// 用法：node tools/perf/checkers_eq.js
const SRC = require('path').join(__dirname, '..', '..'); process.chdir(SRC);
global.XQ = require(SRC + '/src/rules.js'); const BF = global.BF = require(SRC + '/src/bingfa.js');
const XQ = global.XQ; const other = s => s === 'r' ? 'b' : 'r';
let a = 12345; const rnd = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
let n = 0, mism = 0, chk = 0; const ex = [];
for (let g = 0; g < 400; g++) {
  const G = new BF.Game(); let S = G.S;
  for (let ply = 0; ply < 160 && !S.final; ply++) {
    for (const s of ['r', 'b']) { const c = XQ.checkers(S.board, s).length > 0, i = XQ.inCheck(S.board, other(s)); n++; if (c) chk++; if (c !== i) { mism++; if (ex.length < 3) ex.push({ ply, s, c, i }); } }
    // 随机走一步（升级也随机来一点）
    if (rnd() < 0.15) { const ups = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) ups.push(U); } } if (ups.length) S = ups[Math.floor(rnd() * ups.length)]; }
    const kids = BF.ai.expand(S); if (!kids.length) break;
    const caps = kids.filter(k => k.a.k === 'mv' && S.board[k.a.to[1]][k.a.to[0]]);
    const pick = (rnd() < 0.5 && caps.length ? caps : kids)[Math.floor(rnd() * (rnd() < 0.5 && caps.length ? caps.length : kids.length))] || kids[0];
    S = pick.S; if (BF.evaluate(S).result) break;
  }
}
console.log('局面×方', n, '其中有子在将军', chk, '不一致', mism, JSON.stringify(ex));
