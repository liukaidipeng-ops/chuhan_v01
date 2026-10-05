// 极端诊断二（用户 2026-10-05 提，不是规则提案）：看电脑会不会“变通”——楚该第一时间升象并护着，汉该第一时间围剿象。
//   用户的设定：楚象一级 3 血 2 攻、二级 2 血 1 攻、三级 1 血 1 攻，三级落地践踏秒杀全场；象升级 0 功；汉方车马炮攻击至少 2。
//   在 engine_xe.js（engine_planc + 践踏半径 + 0 价）生成的引擎上再加“按方改数值”：
//     CFG.sideStats[方][兵种] = { hp: [每级血], atk: [每级攻击], atkMin: 攻击下限 }，只改这一方的这一兵种；不配就和原来完全一样。
//       · 攻击：引擎里所有算攻击的地方都走 atk(p)（电脑通过 BF.ai.atk 也是它），这里按方覆盖；
//       · 血：开局摆子（newState）和升级回满血（promote）按方取。召回（只有汉方）、界面的等级说明不改——这个诊断里用不到。
//       · noLegFrom：这一方的象几级起走田字无视塞象眼；upFromRound：这一方这一兵种第几回合起才能升级（AI 的 upgradeState 和对局的 canUpgrade 都认）。
// 用法（在 source/ 下）：ENGINE_REV=9aca810 BFSIM_ENGINE=tools/variants/engine_xe2.js node tools/bfsim.js …
//   设定见 tools/xe2_play.js 里的 XE2（践踏 3 级、半径 9、99 点、落地就踩；象升级 0 功、最高 3 级；sideStats）。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const xe = require(path.join(__dirname, 'engine_xe.js'));
let built = null;
function enginePath() {
  if (built) return built;
  let s = fs.readFileSync(xe.enginePath(), 'utf8');
  const rep = (a, b, n = 1) => { const k = s.split(a).length - 1; if (k !== n) throw new Error(`engine_xe2：锚点出现 ${k} 次、应为 ${n} 次：${a.slice(0, 80)}`); s = s.split(a).join(b); };
  rep('  const atk = p => (atkTbl(p.t)[(p.lv || 1) - 1] || 1);',
    '  const sideOv = (s, t) => { const o = CFG_CUR.sideStats; return (o && o[s] && o[s][t]) || null; };   // 变体·xe2：按方改数值\n' +
    '  const atk = p => { const b0 = (atkTbl(p.t)[(p.lv || 1) - 1] || 1), o = sideOv(p.s, p.t); return !o ? b0 : o.atk ? o.atk[(p.lv || 1) - 1] : o.atkMin ? Math.max(o.atkMin, b0) : b0; };');
  rep('  const hpOf = (t, lv, cfg = CFG_CUR) => hpTbl(t, cfg)[lv - 1];\n',
    '  const hpOf = (t, lv, cfg = CFG_CUR) => hpTbl(t, cfg)[lv - 1];\n  const hpOfS = (s, t, lv) => { const o = sideOv(s, t); return o && o.hp ? o.hp[lv - 1] : hpOf(t, lv); };   // 变体·xe2\n');
  rep('    p.lv++; p.hp = CFG_CUR.upgrade.healOnUpgrade ? hpOf(p.t, p.lv) : p.hp + 1;',
    '    p.lv++; p.hp = CFG_CUR.upgrade.healOnUpgrade ? hpOfS(p.s, p.t, p.lv) : p.hp + 1;');
  rep('    for (const row of b) for (const p of row) if (p) { p.lv = 1; p.hp = 1; p.cd = 0; p.jm = 0; p.xp = 0; p.kills = 0; }',
    '    const so = (cfg || CFG).sideStats;   // 变体·xe2：开局血按方取\n' +
    '    for (const row of b) for (const p of row) if (p) { p.lv = 1; p.hp = (so && so[p.s] && so[p.s][p.t] && so[p.s][p.t].hp) ? so[p.s][p.t].hp[0] : 1; p.cd = 0; p.jm = 0; p.xp = 0; p.kills = 0; }');
  // 极端诊断五（XE5）用到的两项（不配就和原来一样）：noLegFrom = 几级起走田字无视塞象眼；upFromRound = 第几回合起才能升级
  rep("    const p = at(S, f, r); if (!p) return [];\n    let ms;",
    "    const p = at(S, f, r); if (!p) return [];\n" +
    "    if (!ignoreLeg && p.t === 'e') { const o = sideOv(p.s, 'e'); if (o && o.noLegFrom && p.lv >= o.noLegFrom) ignoreLeg = true; }   // 变体·xe2：几级起无视塞象眼\n" +
    "    let ms;");
  rep("  const hpOfS = (s, t, lv) => {",
    "  const upLocked = (S, p) => { const o = sideOv(p.s, p.t); return !!(o && o.upFromRound && Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 < o.upFromRound); };   // 变体·xe2：还没到能升级的回合\n" +
    "  const hpOfS = (s, t, lv) => {");
  rep("    if (!p0 || p0.s !== S.turn || p0.t === 'k' || p0.lv >= maxLv(p0.t) || S.upgraded || S.merit[p0.s] < upCost(p0)) return null;",
    "    if (!p0 || p0.s !== S.turn || p0.t === 'k' || p0.lv >= maxLv(p0.t) || S.upgraded || S.merit[p0.s] < upCost(p0) || upLocked(S, p0)) return null;");
  rep("      if (this.result || !p || p.s !== S.turn || p.t === 'k' || p.lv >= maxLv(p.t) || S.upgraded) return false;",
    "      if (this.result || !p || p.s !== S.turn || p.t === 'k' || p.lv >= maxLv(p.t) || S.upgraded || upLocked(S, p)) return false;");
  const file = path.join(os.tmpdir(), `bingfa_xe2_${process.pid}.js`);
  fs.writeFileSync(file, s);
  process.on('exit', () => { try { fs.unlinkSync(file); } catch (e) { } });
  built = file;
  return file;
}
module.exports = { enginePath };
