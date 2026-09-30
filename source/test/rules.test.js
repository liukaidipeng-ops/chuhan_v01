const XQ = require('../src/rules.js');
const assert = require('assert');

function perft(b, s, d) {
  if (d === 0) return 1;
  const ms = XQ.allLegalMoves(b, s);
  if (d === 1) return ms.length;
  let n = 0;
  for (const m of ms) {
    const [ff, fr] = m.from, [tf, tr] = m.to;
    const cap = b[tr][tf]; b[tr][tf] = b[fr][ff]; b[fr][ff] = null;
    n += perft(b, XQ.other(s), d - 1);
    b[fr][ff] = b[tr][tf]; b[tr][tf] = cap;
  }
  return n;
}
const b0 = XQ.initialBoard();
const expected = [44, 1920, 79666, 3290240];
for (let d = 1; d <= 4; d++) {
  const n = perft(b0, 'r', d);
  console.log('perft', d, n, n === expected[d - 1] ? 'OK' : 'FAIL');
  assert.strictEqual(n, expected[d - 1]);
}

// 空棋盘构造器
function empty() { const b = []; for (let r = 0; r < 10; r++) b.push(new Array(9).fill(null)); return b; }

// 双车错杀：红车将死黑将
{
  const g = new XQ.Game();
  const b = empty();
  b[0][4] = { s: 'r', t: 'k' };
  b[9][3] = { s: 'b', t: 'k' };
  b[8][0] = { s: 'r', t: 'r' };
  b[5][8] = { s: 'r', t: 'r' };
  g.board = b; g.turn = 'r';
  const info = g.play({ from: [8, 5], to: [8, 9] });
  assert(info && info.check && info.result && info.result.winner === 'r' && info.result.reason === 'checkmate');
  console.log('双车错将死 OK');
}
// 飞将：帅不能走到与将对面
{
  const g = new XQ.Game();
  const b = empty();
  b[0][3] = { s: 'r', t: 'k' };
  b[9][4] = { s: 'b', t: 'k' };
  g.board = b; g.turn = 'r';
  assert(!g.isLegal({ from: [3, 0], to: [4, 0] }));
  console.log('飞将 OK');
}
// 困毙
{
  const g = new XQ.Game();
  const b = empty();
  b[0][4] = { s: 'r', t: 'k' };
  b[9][3] = { s: 'b', t: 'k' };
  b[7][4] = { s: 'r', t: 'p' }; // 控制 (4,8)? 兵在(4,7)
  b[8][2] = { s: 'r', t: 'r' }; // 车控第8行
  b[5][4] = { s: 'r', t: 'r' };
  g.board = b; g.turn = 'r';
  // 走一步闲着：红帅(4,0)->(5,0)，黑将(3,9)：可走(4,9)? 被(4,x)车/兵线控制吗？
  const info = g.play({ from: [4, 0], to: [5, 0] });
  console.log('困毙场景结果:', info.result);
}
// 过河标记
{
  const g = new XQ.Game();
  const i1 = g.play({ from: [1, 2], to: [1, 9] }); // 炮打马
  assert(i1 && i1.captured && i1.captured.t === 'n' && i1.crossesRiver);
  console.log('炮打马 + 过河 OK');
}
// 悔棋：走若干步后全部撤销，棋盘应恢复初始
{
  const g = new XQ.Game();
  const init = JSON.stringify(g.board);
  const seq = [[[1,2],[1,9]], [[0,9],[1,9]], [[7,2],[4,2]], [[7,7],[4,7]], [[4,2],[4,6]]];
  for (const [f,t] of seq) assert(g.play({from:f,to:t}), 'play '+f+'->'+t);
  while (g.history.length) g.undo();
  assert.strictEqual(JSON.stringify(g.board), init);
  assert.strictEqual(g.turn, 'r');
  console.log('悔棋复原 OK');
}
console.log('ALL OK');
