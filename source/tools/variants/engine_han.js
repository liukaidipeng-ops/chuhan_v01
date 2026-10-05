// 规则变体引擎（只供模拟）：两种“帮汉方”的小改动（用户 2026-10-05 拍板单同意试）。默认全关：不设时和底版引擎完全一样。
//   底版：从 git 取 source/src/bingfa.js（环境变量 ENGINE_REV，默认 98dd206，同 engine_at.js），按文字锚点改（锚点必须正好出现一次）。
//   1. CFG.generalArts.xiaohe.reviveLevel（默认 1）：汉方召回良将，召回的子回来就是这个等级（血按这个等级；不超过该兵种最高级）。
//      二级不解锁技能（技能三级起），所以不涉及“刚解锁的技能先冷却”。
//   2. CFG.merit.startBonus = { r: 0, b: 0 }：开局军功在 merit.start 之外再加多少（只影响开局那一下）。
// 用法：BFSIM_ENGINE=tools/variants/engine_han.js ENGINE_REV=98dd206 node tools/bfsim.js ... --set generalArts.xiaohe.reviveLevel=2
//       或 --set merit.startBonus.r=1
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let built = null;
function enginePath() {
  if (built) return built;
  const rev = process.env.ENGINE_REV || '98dd206';
  let s = execFileSync('git', ['show', rev + ':source/src/bingfa.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`engine_han：锚点出现 ${n} 次（${rev} 的引擎改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
  rep('      start: 3, cap: 30,', '      start: 3, startBonus: { r: 0, b: 0 }, cap: 30,');
  rep('xiaohe: { usesPerGame: 1 }', 'xiaohe: { usesPerGame: 1, reviveLevel: 1 }');
  rep('merit: { r: cfg.merit.start, b: cfg.merit.start }',
      'merit: { r: cfg.merit.start + ((cfg.merit.startBonus && cfg.merit.startBonus.r) || 0), b: cfg.merit.start + ((cfg.merit.startBonus && cfg.merit.startBonus.b) || 0) }   /* 变体·帮汉：开局军功加成 */');
  rep("S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: 1, hp: hpOf(d.t, 1), cd: 0, jm: 0, xp: 0, kills: 0 };",
      "const rlv = Math.max(1, Math.min(maxLv(d.t), CFG_CUR.generalArts.xiaohe.reviveLevel || 1));   // 变体·帮汉：召回的子回来就是 reviveLevel 级\n        S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: rlv, hp: hpOf(d.t, rlv), cd: 0, jm: 0, xp: 0, kills: 0 };");
  built = path.join(os.tmpdir(), `bingfa_han_${rev.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
  fs.writeFileSync(built, s);
  return built;
}
module.exports = { enginePath };
