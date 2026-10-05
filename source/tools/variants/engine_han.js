// 规则变体引擎（只供模拟）：两种“帮汉方”的小改动（用户 2026-10-05 拍板单同意试）。默认全关：不设时和底版引擎完全一样。
//   底版：从 git 取 source/src/bingfa.js（环境变量 ENGINE_REV，默认 98dd206，同 engine_at.js），按文字锚点改（锚点必须正好出现一次）。
//   1. CFG.generalArts.xiaohe.reviveLevel（默认 1）：汉方召回良将，召回的子回来就是这个等级（血按这个等级；不超过该兵种最高级）。
//      二级不解锁技能（技能三级起），所以不涉及“刚解锁的技能先冷却”。
//   2. CFG.merit.startBonus = { r: 0, b: 0 }：开局军功在 merit.start 之外再加多少（只影响开局那一下）。
//   3. CFG.generalArts.xiaohe.reviveCap（默认 false）：true 时召回的子回来是 min(阵亡时的等级, reviveLevel) 级
//      （用户 2026-10-05：“最多召回二级，死的是初级召回还是初级，死的二级三级四级回来都是二级”= reviveLevel 2 + reviveCap true）。
//      为此阵亡名单的每一项多记一个 lv（死时的等级）；电脑的局面键只看棋盘（posKey），不看阵亡名单，所以默认关时着法不变。
//   4. CFG.generalArts.xiaohe.reviveUp（默认 false）：true 时多一种行动 { k:'art', id, up:true }——召回之后当回合马上花军功给召回的子升一级
//      （用户 10/3：“能，但是不能移动，这样做可以防止召回的棋子直接被秒”；第六轮拍板单 r6_help 选测）。照常扣军功（upCost）、每回合最多升一次
//      （这回合已经升过别的子就不行）；召回本身占了这一回合，所以它这回合动不了。电脑的候选（expand / gen）在开关打开时多列这一种。
//   召回事件里多记 lv（召回回来的等级，升级前）；升级另发 { e:'reviveUp', id, t, lv, cost } 事件（bfsim 统计用）。
// 用法：BFSIM_ENGINE=tools/variants/engine_han.js ENGINE_REV=98dd206 node tools/bfsim.js ... --set generalArts.xiaohe.reviveLevel=2
//       或 --set merit.startBonus.r=1
//       召回最多二级：--set generalArts.xiaohe.reviveLevel=2 --set generalArts.xiaohe.reviveCap=true
//       召回后当回合可以花军功升一级：再加 --set generalArts.xiaohe.reviveUp=true
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
  rep('xiaohe: { usesPerGame: 1 }', 'xiaohe: { usesPerGame: 1, reviveLevel: 1, reviveCap: false, reviveUp: false }');
  rep('S.dead[v.s].push({ id: v.id, t: v.t, s: v.s });', 'S.dead[v.s].push({ id: v.id, t: v.t, s: v.s, lv: v.lv });   /* 变体·帮汉：记下死时的等级（召回封顶用） */');
  rep('merit: { r: cfg.merit.start, b: cfg.merit.start }',
      'merit: { r: cfg.merit.start + ((cfg.merit.startBonus && cfg.merit.startBonus.r) || 0), b: cfg.merit.start + ((cfg.merit.startBonus && cfg.merit.startBonus.b) || 0) }   /* 变体·帮汉：开局军功加成 */');
  rep("S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: 1, hp: hpOf(d.t, 1), cd: 0, jm: 0, xp: 0, kills: 0 };",
      "const xh = CFG_CUR.generalArts.xiaohe, top = Math.max(1, Math.min(maxLv(d.t), xh.reviveLevel || 1));   // 变体·帮汉：召回的子回来就是 reviveLevel 级\n        const rlv = xh.reviveCap ? Math.max(1, Math.min(top, d.lv || 1)) : top;   // reviveCap：不超过死时的等级（死时一级回来还是一级）\n        S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: rlv, hp: hpOf(d.t, rlv), cd: 0, jm: 0, xp: 0, kills: 0 };");
  rep("ev.push({ e: 'revive', id: d.id, t: d.t, at: st.slice() });",
      "ev.push({ e: 'revive', id: d.id, t: d.t, at: st.slice(), lv: rlv });\n" +
      "        if (a.up) {   // 变体·帮汉：召回后当回合花军功给它升一级（照常扣军功、每回合最多升一次；召回占了这一回合，所以它动不了）\n" +
      "          const pr = S.board[st[1]][st[0]], c = upCost(pr);\n" +
      "          if (!CFG_CUR.generalArts.xiaohe.reviveUp || S.upgraded || c == null || S.merit.r < c) return null;\n" +
      "          S.merit.r -= c; promote(S, pr); pr.xp = 0; S.upgraded = true;\n" +
      "          ev.push({ e: 'reviveUp', id: d.id, t: d.t, lv: pr.lv, cost: c });\n" +
      "        }");
  rep("push({ k: 'art', id: d.id }); } }",
      "push({ k: 'art', id: d.id }); if (CFG_CUR.generalArts.xiaohe.reviveUp) push({ k: 'art', id: d.id, up: true }); } }   /* 变体·帮汉：召回 + 当回合升级 */");
  rep("out.push({ a: { k: 'art', id: d.id }, p: null, q: null, art: d.t }); } }",
      "out.push({ a: { k: 'art', id: d.id }, p: null, q: null, art: d.t }); if (CFG_CUR.generalArts.xiaohe.reviveUp && !S.upgraded) out.push({ a: { k: 'art', id: d.id, up: true }, p: null, q: null, art: d.t }); } }   /* 变体·帮汉：召回 + 当回合升级 */");
  built = path.join(os.tmpdir(), `bingfa_han_${rev.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
  fs.writeFileSync(built, s);
  return built;
}
module.exports = { enginePath };
