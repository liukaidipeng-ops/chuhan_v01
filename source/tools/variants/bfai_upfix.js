// 电脑变体（只供模拟 / 验证）：修“看不见对方先升级再走”的盲区（用户导出的三局笨棋，2026-10-06）。
//   底版：git 上的 source/src/bfai.js（BFAI_UP_BASE，默认 ecf1ddd = 线上电脑），按文字锚点改。两项都关 = 底版。
//   1. BFAI_UP3（默认开）：对方不只在第 1 层能先升级再走，第 3 层也能（第 1 层没钱、吃了我一子攒够军功之后再升级反击——第二局第 10 回合）。
//   2. BFAI_UPNEAR（默认 2）：对方的升级候选除了静态收益前 3 名，再加最多这么多个“离我方帅将两格以内”的子的升级
//      （升卒 / 升车本身不值钱，下一步贴脸将军才致命——第二局第 17 回合“升卒 + 贴脸”一步杀被前 3 名的名额挤掉）。0 = 不加。
//   3. BFAI_MATEG（默认开）：一步杀保险——选定这一步后，看对方有没有一步杀（可以先给一枚子升一级再走）；有就按排名往下换一个没有一步杀的
//      （送一步杀等于必输，所以按排名一路往下找，最多 80 个；只有选中的这步送杀时才多花这份时间）。
//      都送杀时，再试平时不肯用的召回良将（第三局第 39、40 回合只有召回能躲开一步杀）。只在校尉、霸王（depth ≥ 2）用。三局里汉走完后楚有一步杀的 4 次全是“先升级再走”。
//   4. BFAI_UPREL=N（默认 0）：第 1 层对方的升级候选除了前 3 名（和近帅名额），再加最多 N 个“会改变吃子结果”的升级：
//      守——这枚子本来一下就会被打死，升了扛得住；攻——升了以后能打死原来打不死的子（或者能将军）。
//      BFAI_UP3REL=M（默认 0）：第 3 层对方也能先升级，但只看这类“会改变结果”的升级，最多 M 个（不像 BFAI_UP3 那样把前 3 名全带上）。
//      （三局复盘：最大的几次崩盘里，对手升守子扛住一击〔第二局 R4、第一局 R21〕、第二手才升级吃子〔第三局 R17、R29〕）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_UP_BASE || 'ecf1ddd';
let s = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_upfix：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
const E = process.env, on = k => E[k] == null || !/^(0|false|off)$/i.test(String(E[k]));
const UP3 = on('BFAI_UP3'), NEAR = E.BFAI_UPNEAR != null ? +E.BFAI_UPNEAR : 2, MATEG = on('BFAI_MATEG');
const REL = +(E.BFAI_UPREL || 0), REL3 = +(E.BFAI_UP3REL || 0);
rep("    ups.sort((x, y) => y.g - x.g); ups = ups.slice(0, 3);",
  "    ups.sort((x, y) => y.g - x.g);\n" +
  "    { const keep = ups.slice(0, 3);   // 变体 upfix：离对方帅将两格以内的子的升级另给名额\n" +
  "      if (" + NEAR + " > 0) { let k = null; for (let r = 0; r < 10 && !k; r++) for (let f = 0; f < 9; f++) { const q = S.board[r][f]; if (q && q.t === 'k' && q.s !== side) { k = [f, r]; break; } }\n" +
  "        let extra = 0; if (k) for (const u of ups.slice(3)) { if (extra >= " + NEAR + ") break; const at = u.at; if (at && Math.max(Math.abs(at[0] - k[0]), Math.abs(at[1] - k[1])) <= 2) { keep.push(u); extra++; } } }\n" +
  "      if (" + REL + " > 0) { let extra = 0; for (const u of relUps(S, side, ups.slice(3))) { if (extra >= " + REL + ") break; if (!keep.includes(u)) { keep.push(u); extra++; } } }\n" +
  "      ups = only ? relUps(S, side, ups).slice(0, " + REL3 + ") : keep; }");
rep("      const T = A.upgradeState(S, [f, r]); if (T) ups.push({ S: T, g: score(T, side) - base, id: p.id });",
  "      const T = A.upgradeState(S, [f, r]); if (T) ups.push({ S: T, g: score(T, side) - base, id: p.id, at: [f, r] });");
// upsOf 多一个参数 only：第 3 层只要“会改变结果”的升级（另用一份缓存）；relUps 判断哪些升级会改变吃子结果
rep("  function upsOf(S, side) {\n    let ups = upCache.get(S);\n    if (ups) return ups;",
  "  // 变体 upfix：“会改变吃子结果”的升级——守：本来一下就会被打死、升了扛得住；攻：升了能打死原来打不死的子（或者能将军）\n" +
  "  function relUps(S, side, list) {\n" +
  "    const F = BF.cloneState(S); F.turn = side === 'r' ? 'b' : 'r'; F.upgraded = false; F.freeUsed = false; F.jmLock = null;\n" +
  "    const thr = new Map();\n" +
  "    try { for (const it of A.gen(F, true)) if (it.q && it.q.s === side && it.p) thr.set(it.q.id, Math.max(thr.get(it.q.id) || 0, A.atk(it.p))); } catch (e) { }\n" +
  "    const out = [];\n" +
  "    for (const u of list) {\n" +
  "      const f = u.at[0], r = u.at[1], p0 = S.board[r][f], p1 = u.S.board[r][f]; if (!p0 || !p1) continue;\n" +
  "      const m = thr.get(p0.id) || 0; let rel = m > 0 && p0.hp <= m && p1.hp > m;\n" +
  "      if (!rel) { const a0 = A.atk(p0), a1 = A.atk(p1), before = new Set();\n" +
  "        for (const mv of A.moveTargets(S, f, r)) { const q = S.board[mv.to[1]][mv.to[0]]; if (q && q.s !== side && (q.hp <= a0 || q.t === 'k')) before.add(q.id); }\n" +
  "        for (const mv of A.moveTargets(u.S, f, r)) { const q = u.S.board[mv.to[1]][mv.to[0]]; if (q && q.s !== side && (q.hp <= a1 || q.t === 'k') && !before.has(q.id)) { rel = true; break; } } }\n" +
  "      if (rel) out.push(u);\n" +
  "    }\n" +
  "    return out;\n" +
  "  }\n" +
  "  const upCache3 = new Map();\n" +
  "  function upsOf(S, side, only) {\n    const UC = only ? upCache3 : upCache;\n    let ups = UC.get(S);\n    if (ups) return ups;");
rep("    upCache.set(S, ups);\n    return ups;", "    UC.set(S, ups);\n    return ups;");
rep("pfCache.clear(); upCache.clear();", "pfCache.clear(); upCache.clear(); upCache3.clear();");
if (UP3) rep("    if (ply === upPly && !S.upgraded) {",
  "    if ((ply === upPly || (upPly > 0 && ply === upPly + 2)) && !S.upgraded) {   // 变体 upfix：第 3 层对方也能先升级");
else if (REL3 > 0) rep("    if (ply === upPly && !S.upgraded) {\n      const ups = upsOf(S, side);",
  "    if ((ply === upPly || (upPly > 0 && ply === upPly + 2)) && !S.upgraded) {   // 变体 upfix：第 3 层只看“会改变结果”的升级\n      const ups = upsOf(S, side, ply !== upPly);");
if (MATEG) rep("    let kids = A.expand(S), pofu = [];", "    let kids = A.expand(S), pofu = [], artOff = [];");
if (MATEG) rep("      if (rest.some(k => k.a.k !== 'art')) kids = rest;",
  "      if (rest.some(k => k.a.k !== 'art')) { artOff = kids.filter(k => !rest.includes(k)); kids = rest; }   // 变体 upfix：平时不救的召回留着给一步杀保险兜底");
if (MATEG) rep("    // 拒马（不占行动）：走完这一步之后",
  "    // 变体 upfix：一步杀保险——走完以后对方能不能一步将死我（可以先升一级再走）；能就换下一个\n" +
  "    if (L.depth >= 2 && !fin0 && pick && pick.S && !pick.done) {\n" +
  "      const mate1 = T => { if (!T || T.final) return false; const opp = T.turn, st = [T];\n" +
  "        if (!T.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === opp && p.t !== 'k') { const U = A.upgradeState(T, [f, r]); if (U) st.push(U); } }\n" +
  "        for (const X of st) for (const e of A.gen(X, false)) { const R = BF.attempt(X, e.a); if (!R || R.free || !A.inCheck(R.S, me)) continue; const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === opp) return true; }\n" +
  "        return false; };\n" +
  "      try { if (mate1(pick.S)) { const alt = pool.filter(k => k !== pick && k.S && !k.done).slice(0, 80).concat(artOff.filter(k => k.S)).find(k => !mate1(k.S)); if (alt) { pick = alt; think.mateGuard = (think.mateGuard || 0) + 1; } else think.mateGuardMiss = (think.mateGuardMiss || 0) + 1; } } catch (e) { think.mateGuardErr = String(e && e.stack || e); }\n" +
  "    }\n" +
  "    // 拒马（不占行动）：走完这一步之后");
const out = E.BFAI_UP_OUT || path.join(os.tmpdir(), `bfai_upfix_${rev}_${process.pid}.js`);
fs.writeFileSync(out, s);
if (!E.BFAI_UP_OUT) process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
module.exports = require(out);
