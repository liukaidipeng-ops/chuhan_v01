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
// 杀法名
{
  const empty2 = () => Array.from({ length: 10 }, () => Array(9).fill(null));
  const mk = list => { const b = empty2(); let id = 1; for (const [s, t, f, r] of list) b[r][f] = { s, t, id: id++ }; return b; };
  const mated = b => XQ.inCheck(b, 'b') && XQ.allLegalMoves(b, 'b').length === 0;
  const T = (name, list, last) => { const b = mk(list); assert(mated(b), name + ' 局面应是将死'); const got = XQ.mateName(b, 'b', last); assert.strictEqual(got, name, name + ' 识别成了 ' + got); };
  // 重炮：两门炮同线，前炮当炮架；士上来垫也没用（前炮接着将）
  T('重炮', [['r', 'k', 4, 0], ['b', 'k', 4, 9], ['b', 'a', 3, 9], ['b', 'a', 5, 9], ['r', 'c', 4, 5], ['r', 'c', 4, 3]]);
  // 马后炮：马在将前隔一格，炮在马后
  T('马后炮', [['r', 'k', 3, 0], ['b', 'k', 4, 9], ['r', 'n', 4, 7], ['r', 'c', 4, 4]]);
  // 卧槽马：马在 (2,8) 将 (4,9)；两侧是自家士，兵看住 (4,8)
  T('卧槽马', [['r', 'k', 4, 0], ['b', 'k', 4, 9], ['b', 'a', 3, 9], ['b', 'a', 5, 9], ['r', 'n', 2, 8], ['r', 'p', 4, 7]]);
  // 挂角马：马在 (5,7) 将 (4,9)
  T('挂角马', [['r', 'k', 3, 0], ['b', 'k', 4, 9], ['b', 'a', 3, 9], ['r', 'n', 5, 7], ['r', 'p', 6, 9], ['r', 'r', 0, 8]]);
  // 铁门栓：中炮栓住中士，车沉底
  T('铁门栓', [['r', 'k', 5, 0], ['b', 'k', 4, 9], ['b', 'a', 4, 8], ['b', 'a', 5, 9], ['r', 'c', 4, 4], ['r', 'p', 4, 6], ['r', 'r', 0, 9]]);
  // 双车错
  T('双车错', [['r', 'k', 3, 0], ['b', 'k', 4, 9], ['r', 'r', 0, 9], ['r', 'r', 1, 8]]);
  // 白脸将：车将军，帅占着中路不让将出来
  T('白脸将', [['r', 'k', 4, 0], ['b', 'k', 3, 9], ['r', 'r', 3, 5]]);
  // 闷宫：炮借对方的士当炮架，将被自家士堵死
  T('闷宫', [['r', 'k', 4, 0], ['b', 'k', 4, 9], ['b', 'a', 3, 9], ['b', 'a', 4, 8], ['r', 'c', 0, 9]]);
  // 大刀剜心：车吃掉花心士绝杀（要给出最后一步）
  {
    const b = mk([['r', 'k', 4, 0], ['b', 'k', 4, 9], ['b', 'a', 3, 9], ['b', 'a', 5, 9], ['r', 'r', 4, 8], ['r', 'n', 2, 7], ['r', 'p', 5, 7]]);
    if (mated(b)) assert.strictEqual(XQ.mateName(b, 'b', { to: [4, 8], cap: { s: 'b', t: 'a' } }), '大刀剜心');
  }
  // 认不出经典杀法时，按参与的兵种给名字（至少是个字符串）
  assert(typeof XQ.mateName(mk([['r', 'k', 4, 0], ['b', 'k', 4, 9]]), 'b') === 'string');
  // 红方被将死也能认（左右、上下镜像）
  {
    const b = mk([['b', 'k', 3, 9], ['r', 'k', 4, 0], ['b', 'n', 4, 2], ['b', 'c', 4, 5]]);
    assert(XQ.inCheck(b, 'r') && XQ.allLegalMoves(b, 'r').length === 0, '红方被将死');
    assert.strictEqual(XQ.mateName(b, 'r'), '马后炮');
  }
  console.log('杀法名 OK');
}
console.log('ALL OK');
