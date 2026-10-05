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
  // 极端诊断六（XE6 = XE5 + 楚将前 10 回合无敌）：CFG.kingShield = { side, untilRound }——这一方的帅将在第 untilRound 回合（含）之前不算被将军：
  //   走子不用管将军、不会被将死，对方将它也不给将军的军功。判断被将军的两个函数（inCheckS / inCheckF）都认，电脑通过 BF.ai.inCheck 也一样。
  rep("  const inCheckS = (S, s) => (S.final ? false :",
    "  const kingShielded = (S, s) => { const K = CFG_CUR.kingShield; return !!(K && K.side === s && Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 <= K.untilRound); };   // 变体·xe2：帅将无敌的回合\n" +
    "  const inCheckS = (S, s) => (S.final || kingShielded(S, s) ? false :");
  rep("  const inCheckF = (S, s) => !S.final && inCheck(S.board, s);",
    "  const inCheckF = (S, s) => !S.final && !kingShielded(S, s) && inCheck(S.board, s);");
  // 极端诊断七（XE7 = XE6 + 象升二级后两回合无敌）：sideStats[方][兵种].invOnUp = { lv, rounds }——这一方这一兵种升到 lv 级起，
  //   从升级那一回合起再算 rounds 回合不掉血：扣血（damage）直接不扣，来攻它的子打不动、被弹回原位（strike 返回 'hit'）。
  rep("    p.lv++; p.hp = CFG_CUR.upgrade.healOnUpgrade ? hpOfS(p.s, p.t, p.lv) : p.hp + 1;",
    "    p.lv++; p.hp = CFG_CUR.upgrade.healOnUpgrade ? hpOfS(p.s, p.t, p.lv) : p.hp + 1;\n" +
    "    { const o = sideOv(p.s, p.t); if (o && o.invOnUp && p.lv >= o.invOnUp.lv) p.inv = Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 + o.invOnUp.rounds; }   // 变体·xe2：升级后几回合无敌");
  rep("  const upLocked = (S, p) => {",
    "  const isInv = (S, p) => !!(p && p.inv && Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 <= p.inv);   // 变体·xe2：还在无敌期\n" +
    "  const upLocked = (S, p) => {");
  rep("    if (!v || v.t === 'k') return;\n    v.hp -= n;",
    "    if (!v || v.t === 'k' || isInv(S, v)) return;   // 变体·xe2：无敌的子不掉血\n    v.hp -= n;");
  rep("    const A = atk(P);\n    if (T.hp <= A) {",
    "    if (isInv(S, T)) { ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() }); return 'hit'; }   // 变体·xe2：打不动无敌的子，弹回原位\n" +
    "    const A = atk(P);\n    if (T.hp <= A) {");
  // 极端诊断八（XE8，用户提、Code 定数值）：
  //   · sideStats[方][兵种].immobileBelow = L：不到 L 级不能动（楚象一级不能动）；fwdOnly：只能往前直走一格（楚马）
  //   · kingShield.immobile：无敌的那些回合里帅将也不能动
  //   · CFG.healAura = { side, t, lv, count, amount }：这一方有 count 枚 t 兵种到了 lv 级，每回合结束（楚走完）时这一方全队（帅将除外）回 amount 血，回不过满血
  //     XE9：healAura.adj = 'e' → 要 count 枚这样的子贴着同一枚 adj 兵种（上下左右相邻）才算；sideStats[方][兵种].freeMove = [[df, dr], …] → 按这些方向走一格，只在己方半场
  rep("    if (!ignoreLeg && p.t === 'e') { const o = sideOv(p.s, 'e'); if (o && o.noLegFrom && p.lv >= o.noLegFrom) ignoreLeg = true; }   // 变体·xe2：几级起无视塞象眼\n",
    "    if (!ignoreLeg && p.t === 'e') { const o = sideOv(p.s, 'e'); if (o && o.noLegFrom && p.lv >= o.noLegFrom) ignoreLeg = true; }   // 变体·xe2：几级起无视塞象眼\n" +
    "    { const o = sideOv(p.s, p.t);   // 变体·xe2（XE8）：不能动的子、只能往前走一格的子、无敌期里不能动的帅将\n" +
    "      if (o && o.immobileBelow && p.lv < o.immobileBelow) return [];\n" +
    "      if (p.t === 'k') { const K = CFG_CUR.kingShield; if (K && K.immobile && K.side === p.s && Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 <= K.untilRound) return []; }\n" +
    "      if (o && o.fwdOnly) { const tr = r + (p.s === 'r' ? 1 : -1); if (!inBoard(f, tr)) return []; const q = S.board[tr][f]; if (q && (q.s === p.s || (q.t === 'k' && !S.final))) return []; return [{ from: [f, r], to: [f, tr] }]; }\n" +
    "      if (o && o.freeMove) { const out = []; for (const [df, dr] of o.freeMove) { const tf = f + df, tr = r + dr; if (!inBoard(tf, tr) || (p.s === 'b' ? tr < 5 : tr > 4)) continue; const q = S.board[tr][tf]; if (q && (q.s === p.s || (q.t === 'k' && !S.final))) continue; out.push({ from: [f, r], to: [tf, tr] }); } return out; } }   // XE9：按 freeMove 里的方向走一格，只在己方半场（不受九宫限制）\n");
  rep("    if (side === 'b' && round(S) >= CFG_CUR.merit.autoIncomeFromRound) {",
    "    if (side === 'b' && CFG_CUR.healAura) {   // 变体·xe2（XE8）：回血光环，每回合结束时\n" +
    "      const H = CFG_CUR.healAura, okA = q => !!(q && q.s === H.side && q.t === H.t && q.lv >= H.lv); let n = 0;\n" +
    "      if (!H.adj) { for (const row of S.board) for (const q of row) if (okA(q)) n++; }\n" +
    "      else for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const e = S.board[r][f]; if (!e || e.s !== H.side || e.t !== H.adj) continue; let k = 0; for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inBoard(f + df, r + dr) && okA(S.board[r + dr][f + df])) k++; if (k > n) n = k; }   // XE9：count 枚贴着同一枚 adj（上下左右）才算\n" +
    "      if (n >= H.count) for (const row of S.board) for (const q of row) if (q && q.s === H.side && q.t !== 'k') { const mx = hpOfS(q.s, q.t, q.lv); if (q.hp < mx) { q.hp = Math.min(mx, q.hp + H.amount); ev.push({ e: 'heal', id: q.id, hp: q.hp }); } }\n" +
    "    }\n" +
    "    if (side === 'b' && round(S) >= CFG_CUR.merit.autoIncomeFromRound) {");
  // 帅将无敌的回合里“将”它不算将军，长将（同一子连续将军不超过 longCheckLimit 回合）也不该记：
  //   原版记长将用的是只看棋盘的 checkers()，不认无敌。XE8 里楚将不能动、汉一个车一直对着它，记满 6 回合后汉每一步都算长将 → 被判困毙（楚胜）。
  rep("    const ck = S.final || (side === 'b' && smActive(S)) ? [] : checkers(S.board, side);",
    "    const ck = S.final || (side === 'b' && smActive(S)) || kingShielded(S, opp) ? [] : checkers(S.board, side);   // 变体·xe2：无敌的帅将不记长将");
  rep("        const ck = side === 'b' && smActive(T) ? [] : checkers(T.board, side);",
    "        const ck = side === 'b' && smActive(T) || kingShielded(T, other(side)) ? [] : checkers(T.board, side);   // 变体·xe2");
  // XE8 补充（用户 2026-10-05：“楚可以在第 30 回合后无限制使用召回，可以强制召回车，每回合都能用”）：
  //   CFG.chuRecall = { side, fromRound, t, at: [[f, r], …] }——这一方从第 fromRound 回合起，每回合都可以用这一回合的行动“召回”一枚 t（楚开局没有车，所以是凭空召回），
  //   放到 at 里任一个空格，一级、血按这一方这一兵种的一级血；不限次数、不花军功。行动是 { k: 'rc', at }；电脑的 expand / gen 都列出来，判将死时也算一种行动。
  rep("  const upLocked = (S, p) => {",
    "  const rcOk = S => { const C = CFG_CUR.chuRecall; return !!(C && S.turn === C.side && Math.floor((S.cnt.r + S.cnt.b) / 2) + 1 >= C.fromRound && !S.freeUsed); };   // 变体·xe2（XE8）：楚方召回车\n" +
    "  const upLocked = (S, p) => {");
  rep("    } else if (a.k === 'art') {\n      if (!artOpen(S)",
    "    } else if (a.k === 'rc') {   // 变体·xe2（XE8）：召回车（凭空放一枚一级的到指定空格，占这一回合）\n" +
    "      const C = CFG_CUR.chuRecall; if (!rcOk(S) || !a.at || !C.at.some(q => q[0] === a.at[0] && q[1] === a.at[1]) || at(S, a.at[0], a.at[1])) return null;\n" +
    "      let id = 900; for (const row of S.board) for (const q of row) if (q && q.id > id) id = q.id; for (const s2 of ['r', 'b']) for (const d of S.dead[s2]) if (d.id > id) id = d.id; id++;\n" +
    "      S.board[a.at[1]][a.at[0]] = { s: side, t: C.t, id, lv: 1, hp: hpOfS(side, C.t, 1), cd: 0, jm: 0, xp: 0, kills: 0 };\n" +
    "      ev.push({ e: 'revive', id, t: C.t, at: a.at.slice(), lv: 1 });\n" +
    "    } else if (a.k === 'art') {\n      if (!artOpen(S)");
  rep("for (const { t, ...a } of reviveActs(S)) { push(a); if (up) push({ ...a, up: true }); } }   // r6：召回 + 当回合升级\n",
    "for (const { t, ...a } of reviveActs(S)) { push(a); if (up) push({ ...a, up: true }); } }   // r6：召回 + 当回合升级\n" +
    "      if (rcOk(S)) for (const q of CFG_CUR.chuRecall.at) push({ k: 'rc', at: q.slice() });   // 变体·xe2（XE8）\n");
  rep("for (const { t, ...a } of reviveActs(S)) { out.push({ a, p: null, q: null, art: t }); if (up) out.push({ a: { ...a, up: true }, p: null, q: null, art: t }); } }   // r6：召回 + 当回合升级\n",
    "for (const { t, ...a } of reviveActs(S)) { out.push({ a, p: null, q: null, art: t }); if (up) out.push({ a: { ...a, up: true }, p: null, q: null, art: t }); } }   // r6：召回 + 当回合升级\n" +
    "      if (rcOk(S)) for (const q of CFG_CUR.chuRecall.at) if (!at(S, q[0], q[1])) out.push({ a: { k: 'rc', at: q.slice() }, p: null, q: null, art: CFG_CUR.chuRecall.t });   // 变体·xe2（XE8）\n");
  rep("    if (reviveOptions(S).length || pofuFirst(S).length || ultReady(S)) return true;",
    "    if (reviveOptions(S).length || pofuFirst(S).length || ultReady(S)) return true;\n" +
    "    if (rcOk(S) && CFG_CUR.chuRecall.at.some(q => !at(S, q[0], q[1]) && attempt(S, { k: 'rc', at: q }))) return true;   // 变体·xe2（XE8）");
  // sideStats[方][兵种].cost：这一方这一兵种的升级价（每级），不配照常（XE9：汉车每级 2 功只给汉，楚的车照常价）
  rep("  const baseCostOf = p => { const b = costTbl(p.t)[p.lv - 1], R = R6();",
    "  const baseCostOf = p => { const o = sideOv(p.s, p.t), b = (o && o.cost ? o.cost : costTbl(p.t))[p.lv - 1], R = R6(); /* 变体·xe2：按方改升级价 */");
  const file = path.join(os.tmpdir(), `bingfa_xe2_${process.pid}.js`);
  fs.writeFileSync(file, s);
  process.on('exit', () => { try { fs.unlinkSync(file); } catch (e) { } });
  built = file;
  return file;
}
module.exports = { enginePath };
