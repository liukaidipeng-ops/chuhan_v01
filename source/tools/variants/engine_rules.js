// 规则引擎（工作区 src/bingfa.js）加两个只供模拟的开关（顾问部 A1 的平衡诊断，Ham 10-10 “都跑”）：
//   CFG.firstTurn = 'b'：楚先走（D1）。每回合双方各加的军功改在“后走的一方”走完时发（原来写死在楚走完时）
//   CFG.merit.startB = n：楚开局军功（D5；汉仍是 merit.start）
// 用法：BFSIM_ENGINE=tools/variants/engine_rules.js node tools/bfsim.js … --set firstTurn=b / --set merit.startB=4
//   两个开关都不设时，和 src/bingfa.js 逐局相同
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
let built = null;
function enginePath() {
  if (built) return built;
  let s = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'bingfa.js'), 'utf8');
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`engine_rules：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
  rep("board: b, turn: 'r', cnt: { r: 0, b: 0 }, merit: { r: cfg.merit.start, b: cfg.merit.start },",
    "board: b, turn: cfg.firstTurn === 'b' ? 'b' : 'r', cnt: { r: 0, b: 0 }, merit: { r: cfg.merit.start, b: cfg.merit.startB != null ? cfg.merit.startB : cfg.merit.start },   // 变体 engine_rules：谁先走、楚开局军功（只供模拟）");
  rep("if (side === 'b' && rd >= M.autoIncomeFromRound) {",
    "if (side === (CFG_CUR.firstTurn === 'b' ? 'r' : 'b') && rd >= M.autoIncomeFromRound) {   // 变体 engine_rules：后走的一方走完才算一回合");
  built = path.join(os.tmpdir(), `bingfa_rules_${process.pid}.js`);
  fs.writeFileSync(built, s);
  process.on('exit', () => { try { fs.unlinkSync(built); } catch (e) { } });
  return built;
}
module.exports = { enginePath };
