// 规则变体引擎（只供模拟）：背水一战——用户 2026-10-04 提的“主公技只用来扳回局面”，定下来后由 chat 写进 bingfa.js
//   CFG.beishui（默认全关，不开时和原引擎完全一样）：
//     fewer.b / fewer.r：楚方 / 汉方的主帅兵法（背水 / 召回）只有在己方车马炮比对方少时才能用
//     on：楚方的主帅兵法按“背水一战”结算——
//       twoPieces：两步必须是两枚不同的子各走一步；maxKills：两步合计最多吃掉几个子（打伤不算）
//       check：'none' = 两步都不能让汉帅被将军（A）；'allow' = 可以将军（B）
//       freeze：用过的子在楚方之后几个回合里不能动（默认 1 = 下一回合）；被将军时吃子解将除外。
//               不能动 = 不能走子，也不能用会挪位置的技能（冲阵、踏营、飞越、霹雳、护驾），原地的拒马、齐射可以用
//       原来的“破釜后楚方技能封锁三回合”不再有
//     电脑的候选（pofuPairs）：原来只列“至少有一步打到敌子”的组合；开了 on 以后，楚方被将军时也列不打子的组合（用来防守）
// 用法：预设 bs-a / bs-b / bs-a+revive-few / revive-few（tools/bfsim.js），或 BFSIM_ENGINE=tools/variants/engine_beishui.js 加 --set beishui.on=true …
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
let built = null;
function enginePath() {
  if (built) return built;
  let s = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'bingfa.js'), 'utf8');
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`engine_beishui：锚点出现 ${n} 次（引擎改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
  // 1. 配置
  rep("    longCheckLimit: 6,\n", "    longCheckLimit: 6,\n    beishui: { on: false, fewer: { r: false, b: false }, twoPieces: true, maxKills: 1, check: 'none', freeze: 1 },   // 变体：背水一战（见 tools/variants/engine_beishui.js）\n");
  // 2. 主帅兵法的门槛：己方车马炮比对方少才能用（artOpen 只在轮到用的那一方时调用）
  rep("  const artOpen = S => round(S) >= (CFG_CUR.generalArts.fromRound || 1);",
`  // 变体·背水：己方车马炮比对方少
  const fewerOk = (S, s) => { const F = CFG_CUR.beishui && CFG_CUR.beishui.fewer; if (!F || !F[s]) return true; let m = 0, o = 0; for (const row of S.board) for (const p of row) if (p && (p.t === 'r' || p.t === 'n' || p.t === 'c')) { if (p.s === s) m++; else o++; } return m < o; };
  // 变体·背水：用过的子在冻结期里不能动（S.cnt[己方] 还没到 p.bz）
  const frozen = (S, p) => !!(p && p.bz && S.cnt[p.s] < p.bz);
  const artOpen = S => round(S) >= (CFG_CUR.generalArts.fromRound || 1) && fewerOk(S, S.turn);`);
  // 3. 冻结的子不能走，被将军时吃子解将除外（吃不掉或吃完还被将军，照常在结尾被判不合法）
  rep("      if (S.jmLock != null && p.id === S.jmLock) return null;\n      const m = findMove(S, a.from, a.to); if (!m) return null;",
`      if (S.jmLock != null && p.id === S.jmLock) return null;
      if (frozen(S, p)) { const q = at(S, a.to[0], a.to[1]); if (!(inCheckF(S, side) && q && q.s !== side)) return null; }   // 变体·背水
      const m = findMove(S, a.from, a.to); if (!m) return null;`);
  //    技能：会挪位置的不能用
  rep("      const sk = a.sk || SKILL_OF(p.t, p.s); if (!sk || !skillOk(S, p, sk)) return null;",
      "      const sk = a.sk || SKILL_OF(p.t, p.s); if (!sk || !skillOk(S, p, sk)) return null;\n      if (frozen(S, p) && sk !== 'juma' && sk !== 'qishe' && sk !== 'huichun') return null;   // 变体·背水：冻结的子只能用原地的技能");
  rep("        const K = S.board[k[1]][k[0]];\n        S.board[k[1]][k[0]] = p;",
      "        const K = S.board[k[1]][k[0]];\n        if (frozen(S, K)) return null;   // 变体·背水：冻结的帅将也不能被护驾换走\n        S.board[k[1]][k[0]] = p;");
  // 4. 楚方主帅兵法按背水结算
  rep(`        const steps = a.steps || [];
        if (steps.length !== CFG_CUR.generalArts.pofu.steps) return null;
        extra.steps = [];
        for (const m of steps) {
          const p = own(m.from[0], m.from[1]); if (!p) return null;`,
`        const steps = a.steps || [];
        if (steps.length !== CFG_CUR.generalArts.pofu.steps) return null;
        extra.steps = [];
        const BS = CFG_CUR.beishui && CFG_CUR.beishui.on ? CFG_CUR.beishui : null, ids = [], ev00 = ev.length;   // 变体·背水
        for (const m of steps) {
          const p = own(m.from[0], m.from[1]); if (!p) return null;
          if (BS && BS.twoPieces && ids.includes(p.id)) return null;   // 变体·背水：两枚不同的子各走一步
          ids.push(p.id);`);
  rep(`          extra.steps.push({ from: m.from, to: m.to, res, ev0: n0, ev1: ev.length });
          if (inCheckF(S, side)) return null;
        }
        if (!CFG_CUR.generalArts.pofu.mayEndInCheck && inCheckF(S, 'r')) return null;
        S.fx.pf = S.cnt.b + 1 + CFG_CUR.generalArts.pofu.skillLockRounds;`,
`          extra.steps.push({ from: m.from, to: m.to, res, ev0: n0, ev1: ev.length });
          if (inCheckF(S, side)) return null;
          if (BS && BS.check === 'none' && inCheckF(S, 'r')) return null;   // 变体·背水 A：哪一步都不能将军
        }
        if (BS && ev.slice(ev00).filter(e => e.e === 'kill' && !e.friendly && e.s === 'r').length > BS.maxKills) return null;   // 变体·背水：最多吃一个子
        if (!(BS ? BS.check === 'allow' : CFG_CUR.generalArts.pofu.mayEndInCheck) && inCheckF(S, 'r')) return null;
        S.fx.pf = S.cnt.b + 1 + (BS ? 0 : CFG_CUR.generalArts.pofu.skillLockRounds);   // 变体·背水：没有技能封锁
        if (BS) for (const id of ids) { const q = S.board.flat().find(x => x && x.id === id); if (q) q.bz = S.cnt.b + 1 + BS.freeze; }   // 变体·背水：用过的子冻结`);
  // 5. 电脑的候选：开了背水，同一枚子的第二步直接跳过；楚方被将军时也列不打子的组合
  rep(`      for (const m1 of moveTargets(S, f, r)) {
        const hit1 = !!at(S, m1.to[0], m1.to[1]);`,
`      for (const m1 of moveTargets(S, f, r)) {
        const BS = CFG_CUR.beishui && CFG_CUR.beishui.on ? CFG_CUR.beishui : null, bsDef = !!BS && inCheckF(S, 'b');   // 变体·背水
        const hit1 = !!at(S, m1.to[0], m1.to[1]);`);
  rep("          const q = T.board[r2][f2]; if (!q || q.s !== 'b') continue;",
      "          const q = T.board[r2][f2]; if (!q || q.s !== 'b') continue;\n          if (BS && BS.twoPieces && q.id === p.id) continue;   // 变体·背水");
  rep("            if (!hit1 && !at(T, m2.to[0], m2.to[1])) continue;",
      "            if (!hit1 && !at(T, m2.to[0], m2.to[1]) && !bsDef) continue;");
  const file = path.join(os.tmpdir(), `bingfa_beishui_${process.pid}.js`);
  fs.writeFileSync(file, s);
  built = file;
  return file;
}
module.exports = { enginePath };
