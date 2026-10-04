// 规则变体引擎（只供模拟）：背水一战第二版 = engine_beishui.js（第一版）+ 三个更贴近“只用来扳回局面”的选项（默认全关）。
//   2026-10-04 独立核查（三路 + 裁判）指出第一版按字面实现、和用户的本意有出入，Code 按授权先这样模拟，规则等用户回来定：
//   CFG.beishui.persist：少子要“持续”——己方上一回合走完时就已经比对方少（对方吃了子、自己这一回合吃回来，那一回合不算落后）。
//                        第一版是“轮到自己时比对方少”，结果普通兑子的吃回那一手就能用，第 1 回合都能用。
//   CFG.beishui.noKing：将 / 帅不能当背水的那两枚子之一（第一版允许，用了之后将被冻结，下回合被将军几乎必死）。
//   CFG.beishui.strictEscape：冻结的子被将军时只能“吃掉正在将军的那枚子”（而且要吃死），
//                        第一版是“任何吃子只要解了将都行”，比用户同意的“除非是吃掉正在将军的子”宽。
//   CFG.beishui.maxLeft.b / .r：己方车马炮最多还剩几枚才能用（用户 2026-10-04：“至少需要失去一半主要进攻棋子（车马炮）加上进攻棋子比对方少才能触发”→ 6 枚丢一半 = 最多剩 3）。
//   CFG.beishui.aiMin：给电脑变体 bfai_beishui2.js 用的门槛（背水要比最好的普通着法多赚几分才用；原版破釜是 5）。
// 用法：预设 bs2-a / bs2-b / revive-few2（tools/bfsim.js），电脑配 tools/variants/bfai_beishui2.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const v1 = require('./engine_beishui.js');
let built = null;
function enginePath() {
  if (built) return built;
  let s = fs.readFileSync(v1.enginePath(), 'utf8');
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`engine_beishui2：锚点出现 ${n} 次（第一版或引擎改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
  rep("    beishui: { on: false, fewer: { r: false, b: false }, twoPieces: true, maxKills: 1, check: 'none', freeze: 1 },",
      "    beishui: { on: false, fewer: { r: false, b: false }, twoPieces: true, maxKills: 1, check: 'none', freeze: 1, persist: false, noKing: false, strictEscape: false, aiMin: 1, maxLeft: { r: null, b: null } },");
  // 1. 少子要持续：settle 时记下“走完这一手，自己的车马炮是不是比对方少”，存在 S.fx（cloneState 会复制）
  rep("if (p.s === s) m++; else o++; } return m < o; };",
      "if (p.s === s) m++; else o++; } const ML = CFG_CUR.beishui.maxLeft && CFG_CUR.beishui.maxLeft[s]; return m < o && (ML == null || m <= ML) && (!CFG_CUR.beishui.persist || !!(S.fx && S.fx['fw' + s])); };");
  rep("    S.upgraded = false; S.freeUsed = false; S.jmLock = null;\n    S.turn = opp;",
`    if (CFG_CUR.beishui && CFG_CUR.beishui.persist) { let m = 0, o = 0; for (const row of S.board) for (const p of row) if (p && (p.t === 'r' || p.t === 'n' || p.t === 'c')) { if (p.s === side) m++; else o++; } S.fx['fw' + side] = m < o; }   // 变体·背水二：走完这一手还少不少
    S.upgraded = false; S.freeUsed = false; S.jmLock = null;
    S.turn = opp;`);
  // 2. 将不能当背水的子
  rep("          if (BS && BS.twoPieces && ids.includes(p.id)) return null;   // 变体·背水：两枚不同的子各走一步",
      "          if (BS && BS.twoPieces && ids.includes(p.id)) return null;   // 变体·背水：两枚不同的子各走一步\n          if (BS && BS.noKing && p.t === 'k') return null;   // 变体·背水二：将不能用");
  rep("        const BS = CFG_CUR.beishui && CFG_CUR.beishui.on ? CFG_CUR.beishui : null, bsDef = !!BS && inCheckF(S, 'b');   // 变体·背水",
      "        const BS = CFG_CUR.beishui && CFG_CUR.beishui.on ? CFG_CUR.beishui : null, bsDef = !!BS && inCheckF(S, 'b');   // 变体·背水\n        if (BS && BS.noKing && p.t === 'k') break;   // 变体·背水二");
  rep("          if (BS && BS.twoPieces && q.id === p.id) continue;   // 变体·背水",
      "          if (BS && BS.twoPieces && q.id === p.id) continue;   // 变体·背水\n          if (BS && BS.noKing && q.t === 'k') continue;   // 变体·背水二");
  // 3. 冻结的子解将：只能吃掉正在将军的那枚子，而且要吃死
  rep("      if (frozen(S, p)) { const q = at(S, a.to[0], a.to[1]); if (!(inCheckF(S, side) && q && q.s !== side)) return null; }   // 变体·背水",
      "      const fz = frozen(S, p); if (fz) { const q = at(S, a.to[0], a.to[1]); if (!(inCheckF(S, side) && q && q.s !== side && (!CFG_CUR.beishui.strictEscape || checkers(S.board, other(side)).includes(q.id)))) return null; }   // 变体·背水（二：只能吃将军的子）");
  rep("      extra.res = strike(S, a.from, a.to, side, ev);",
      "      extra.res = strike(S, a.from, a.to, side, ev);\n      if (fz && CFG_CUR.beishui.strictEscape && extra.res !== 'kill') return null;   // 变体·背水二：要吃死");
  const file = path.join(os.tmpdir(), `bingfa_beishui2_${process.pid}.js`);
  fs.writeFileSync(file, s);
  built = file;
  return file;
}
module.exports = { enginePath };
