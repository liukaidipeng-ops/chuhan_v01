'use strict';
// 每道题：走子方所有合法的“（先升级）+ 主行动”（含破釜组合）里，有几个被判卷判对——
//   判对的多 = 题目容易 / 判卷宽；只有 1 个 = 答案唯一（判卷要是只认一步，别的同样好的走法会被判错）
const L = require('./tools/bfai_exam_lib.js');
const { Q, play, desc, resetPid } = L;
const BF = global.BF;
const withUp = S => { const out = [{ S, up: null }]; if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const T = BF.ai.upgradeState(S, [f, r]); if (T) out.push({ S: T, up: { k: 'up', at: [f, r] } }); } } return out; };
(async () => {
  const skip = new Set(['实1 九宫失守前先升士']);   // survive 判卷要 100 万节点深搜，太慢
  let tot = 0;
  for (const q of Q) {
    if (q.multi || q.disabled || skip.has(q.name)) { console.log(`－ ${q.name}（${q.cat}）跳过`); continue; }
    resetPid(); const g0 = q.build(); const S0 = g0.S;
    const cands = [];
    for (const B of withUp(S0)) {
      const kids = [...BF.ai.expand(B.S), ...BF.ai.pofuPairs(B.S)];
      for (const k of kids) { if (k.S.turn === S0.turn) continue; cands.push(B.up ? [B.up, k.a] : [k.a]); }
    }
    const ok = [];
    for (const seq of cands) { resetPid(); const g = q.build(); let r = false; try { r = await q.check(seq.map(a => JSON.parse(JSON.stringify(a))), g); } catch (e) { r = 'ERR'; } if (r === true) ok.push(seq.map(a => desc(S0, a)).join('+')); }
    tot++;
    console.log(`${q.name}（${q.cat}）判对 ${ok.length}/${cands.length}：${ok.slice(0, 12).join('  ')}${ok.length > 12 ? ' …' : ''}`);
  }
})();
