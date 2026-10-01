// 揭棋规则测试
const XQ = require('../src/rules.js');
const assert = require('assert');
const has = (ms, f, r) => ms.some(m => m.to[0] === f && m.to[1] === r);
function empty() { const b = []; for (let r = 0; r < 10; r++) b.push(new Array(9).fill(null)); return b; }
let id = 100;
const P = (s, t, extra = {}) => ({ s, t, id: id++, j: 1, ...extra });

// 1. 开局：将帅明摆，每方 15 个暗子，兵种数量正确
{
  const lay = XQ.randomLayout();
  const g = new XQ.Game({ jq: true, layout: lay });
  let hidden = { r: 0, b: 0 }, cnt = { r: {}, b: {} };
  for (const row of g.board) for (const p of row) if (p) {
    if (p.t === 'k') { assert(!p.h); continue; }
    assert(p.h && p.pt && p.j); hidden[p.s]++; cnt[p.s][p.t] = (cnt[p.s][p.t] || 0) + 1;
  }
  assert.deepStrictEqual(hidden, { r: 15, b: 15 });
  for (const s of 'rb') for (const t in XQ.JQ_COUNT) assert.strictEqual(cnt[s][t], XQ.JQ_COUNT[t]);
  console.log('开局布子 OK');
}
// 2. 暗子按位置走：炮位可隔子打马位；车位被兵位挡住；兵位只能前进一步
{
  const g = new XQ.Game({ jq: true, layout: { r: Array(15).fill('p'), b: Array(15).fill('p') } });
  const c = g.legalFrom(1, 2);
  assert(has(c, 1, 9) && has(c, 1, 3) && has(c, 0, 2) && !has(c, 1, 7), '炮位走法');
  const r = g.legalFrom(0, 0);
  assert(has(r, 0, 1) && has(r, 0, 2) && !has(r, 0, 3) && r.length === 2, '车位走法');
  const p = g.legalFrom(0, 3);
  assert(p.length === 1 && has(p, 0, 4), '兵位走法');
  const e = g.legalFrom(2, 0);
  assert(has(e, 0, 2) && has(e, 4, 2) && e.length === 2, '象位走法');
  const a = g.legalFrom(3, 0);
  assert(a.length === 1 && has(a, 4, 1), '士位走法');
  console.log('暗子按位置走 OK');
}
// 3. 翻子：走动即翻开；身份未知时必须给出 rv
{
  const lay = { r: XQ.JQ_STD.r.slice(), b: XQ.JQ_STD.b.slice() };
  lay.r[8] = 'n'; lay.r[1] = 'c'; // 炮位(1,2)其实是马
  const g = new XQ.Game({ jq: true, layout: lay });
  const info = g.play({ from: [1, 2], to: [1, 9] });
  assert(info && info.reveal && info.reveal.t === 'n' && info.mt === 'c' && info.piece.t === 'n' && !info.piece.h);
  assert(info.captured && info.captured.h && info.captured.pt === 'n');
  assert(!g.at(1, 9).h && g.at(1, 9).t === 'n');
  const u = new XQ.Game({ jq: true });
  assert(u.at(1, 2).t === '?');
  assert.strictEqual(u.play({ from: [1, 2], to: [1, 9] }), null, '未知身份不能走');
  const i2 = u.play({ from: [1, 2], to: [1, 9], rv: 'r', cj: 4 });
  assert(i2 && i2.piece.t === 'r' && u.history[0].rv === 'r' && u.history[0].cj === 4);
  console.log('翻子 OK');
}
// 4. 翻开的士、象可以过河；象仍会被塞眼
{
  const g = new XQ.Game({ jq: true });
  const b = empty();
  b[0][4] = P('r', 'k'); b[9][3] = P('b', 'k');
  b[4][4] = P('r', 'a'); b[4][0] = P('r', 'e'); b[5][1] = P('b', 'p');
  g.board = b; g.turn = 'r';
  const a = g.legalFrom(4, 4);
  assert(has(a, 3, 5) && has(a, 5, 5) && has(a, 3, 3) && has(a, 5, 3), '士过河');
  const e = g.legalFrom(0, 4);
  assert(!has(e, 2, 6) && has(e, 2, 2), '象过河被塞眼');
  b[5][1] = null;
  assert(has(g.legalFrom(0, 4), 2, 6), '象过河');
  console.log('士象过河 OK');
}
// 5. 翻开的士、象能将军
{
  const g = new XQ.Game({ jq: true });
  const b = empty();
  b[0][4] = P('r', 'k'); b[9][4] = P('b', 'k'); b[5][4] = P('r', 'p');
  b[8][3] = P('r', 'a');
  g.board = b; g.turn = 'r';
  assert(g.inCheck('b'), '士将军');
  b[8][3] = null; b[7][2] = P('r', 'e');
  assert(g.inCheck('b'), '象将军');
  b[8][3] = P('b', 'a'); // 塞象眼
  assert(!g.inCheck('b'), '象眼被塞');
  console.log('士象将军 OK');
}
// 6. 40 回合无吃子判和
{
  const g = new XQ.Game({ jq: true });
  const b = empty();
  b[0][3] = P('r', 'k'); b[9][5] = P('b', 'k');
  b[5][0] = P('r', 'r'); b[4][8] = P('b', 'r');
  g.board = b; g.turn = 'r';
  let info;
  for (let i = 0; i < 20 && !g.result; i++) {
    info = g.play({ from: [0, 5], to: [1, 5] }) || info; if (g.result) break;
    info = g.play({ from: [8, 4], to: [7, 4] }); if (g.result) break;
    info = g.play({ from: [1, 5], to: [0, 5] }); if (g.result) break;
    info = g.play({ from: [7, 4], to: [8, 4] });
  }
  assert(g.result && g.result.reason === 'draw' && g.result.winner === null && g.history.length === 80, '和棋 ' + JSON.stringify(g.result) + ' ' + g.history.length);
  console.log('40 回合无吃子判和 OK');
}
// 7. 同一子连续将军不得超过 6 回合
{
  const g = new XQ.Game({ jq: true });
  const b = empty();
  b[0][3] = P('r', 'k'); b[9][4] = P('b', 'k');
  b[5][0] = P('r', 'r');
  g.board = b; g.turn = 'r';
  // 红车在 (0,5)/(0,4)... 用车在第 9 行与第 8 行之间来回将军：车(0,9) 将，黑将上下躲
  const seqR = [[[0, 5], [0, 9]]];
  assert(g.play({ from: [0, 5], to: [0, 9] }), '首将');
  let ok = 0, last = null;
  for (let i = 0; i < 10; i++) {
    const kp = g.kingPos('b');
    const kmoves = g.legalFrom(kp[0], kp[1]);
    if (!kmoves.length) break;
    // 黑将在 (4,9)<->(4,8) 之间躲
    const km = kmoves.find(m => m.to[1] !== kp[1]) || kmoves[0];
    g.play(km);
    const k2 = g.kingPos('b');
    const rp = [...Array(10).keys()].flatMap(r => [...Array(9).keys()].map(f => [f, r])).find(([f, r]) => { const p = g.at(f, r); return p && p.s === 'r' && p.t === 'r'; });
    const chk = XQ.allLegalMoves(g.board, 'r').find(m => m.from[0] === rp[0] && m.from[1] === rp[1] && m.to[1] === k2[1] && m.to[0] !== k2[0]);
    if (!chk) { last = 'nocheck'; break; }
    const why = g.forbidden(chk);
    if (why) { last = why; assert(!g.isLegal(chk), '被禁着法不出现在合法着法中'); break; }
    assert(g.play(chk)); ok++;
  }
  assert.strictEqual(last, 'check', '第 7 次连续将军被禁止 (ok=' + ok + ', last=' + last + ')');
  assert.strictEqual(ok, 5, '前 6 次（含首将）允许');
  console.log('长将限制 OK');
}
// 7b. 同一子连续捉同一子不得超过 6 回合
{
  const g = new XQ.Game({ jq: true });
  const b = empty();
  b[0][3] = P('r', 'k'); b[9][4] = P('b', 'k'); b[5][0] = P('r', 'r'); b[8][8] = P('b', 'n');
  g.board = b; g.turn = 'r';
  const R = [[[0, 5], [0, 8]], [[0, 8], [0, 7]], [[0, 7], [0, 8]], [[0, 8], [0, 7]], [[0, 7], [0, 8]], [[0, 8], [0, 7]]];
  const N = [[[8, 8], [6, 7]], [[6, 7], [8, 8]]];
  R.forEach((m, i) => { assert(g.play({ from: m[0], to: m[1] }), 'chase ' + i); assert(g.play({ from: N[i % 2][0], to: N[i % 2][1] }), 'flee ' + i); });
  const seventh = { from: [0, 7], to: [0, 8] };
  assert.strictEqual(g.forbidden(seventh), 'chase');
  assert(!g.isLegal(seventh));
  assert(g.isLegal({ from: [0, 7], to: [0, 6] }), '换别的着法可以');
  console.log('长捉限制 OK');
}
// 8. 悔棋：翻开的子撤回后重新扣上，棋盘复原
{
  const g = new XQ.Game({ jq: true, layout: XQ.randomLayout() });
  const init = JSON.stringify(g.board);
  let n = 0;
  for (let i = 0; i < 120 && !g.result; i++) {
    const ms = XQ.allLegalMoves(g.board, g.turn).filter(m => !g.forbidden(m));
    if (!ms.length) break;
    const m = ms[Math.floor(Math.random() * ms.length)];
    assert(g.play(m), 'play'); n++;
  }
  while (g.history.length) g.undo();
  assert.strictEqual(JSON.stringify(g.board), init);
  console.log('悔棋复原 OK（走了 ' + n + ' 步）');
}
// 9. 随机对局压力测试：身份未知的联机棋盘与已知布局的棋盘走法完全一致
{
  let games = 0, plies = 0, results = {};
  for (let k = 0; k < 60; k++) {
    const lay = XQ.randomLayout();
    const a = new XQ.Game({ jq: true, layout: lay }), u = new XQ.Game({ jq: true });
    for (let i = 0; i < 300 && !a.result; i++) {
      const ms = [];
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) ms.push(...a.legalFrom(f, r));
      const mu = [];
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) mu.push(...u.legalFrom(f, r));
      assert.strictEqual(ms.length, mu.length, '已知/未知布局走法数一致');
      if (!ms.length) break;
      const caps = ms.filter(m => a.at(...m.to));
      const m = caps.length && Math.random() < 0.5 ? caps[Math.floor(Math.random() * caps.length)] : ms[Math.floor(Math.random() * ms.length)];
      const src = a.at(...m.from);
      const rv = src.h ? src.t : undefined;
      const ia = a.play(m), iu = u.play({ ...m, rv });
      assert(ia && iu, 'both play');
      assert.strictEqual(!!ia.result, !!iu.result);
      plies++;
    }
    games++;
    const r = a.result ? a.result.reason : 'open'; results[r] = (results[r] || 0) + 1;
  }
  console.log('随机对局', games, '局', plies, '步 结果', JSON.stringify(results), 'OK');
}
console.log('JIEQI ALL OK');
