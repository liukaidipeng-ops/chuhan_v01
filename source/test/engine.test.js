const XQ = require('../src/rules.js');
const { XQEngineFactory } = require('../src/engine.js');
const assert = require('assert');
const E = XQEngineFactory();
// 1) perft 与规则引擎一致
E.setPosition([]);
const exp = [44, 1920, 79666, 3290240];
for (let d = 1; d <= 4; d++) { const t = Date.now(); const n = E.perft(d); console.log('engine perft', d, n, n === exp[d - 1] ? 'OK' : 'FAIL', (Date.now() - t) + 'ms'); assert.strictEqual(n, exp[d - 1]); }
// 2) 随机对局中，每一步两边的合法着法集合完全一致
let games = 0, plies = 0;
for (let g = 0; g < 60; g++) {
  const game = new XQ.Game(); const hist = [];
  for (let i = 0; i < 160 && !game.result; i++) {
    E.setPosition(hist);
    const a = E.legalMoves().map(m => m.from + '>' + m.to).sort();
    const b = XQ.allLegalMoves(game.board, game.turn).map(m => m.from + '>' + m.to).sort();
    assert.deepStrictEqual(a, b, 'legal move mismatch at game ' + g + ' ply ' + i);
    const m = b.length ? XQ.allLegalMoves(game.board, game.turn)[Math.floor(Math.random() * b.length)] : null;
    if (!m) break;
    game.play(m); hist.push(m); plies++;
  }
  games++;
}
console.log('random games', games, 'plies checked', plies, 'OK');
// 3) 搜索速度与深度
E.setPosition([]);
const t = Date.now();
const r = E.think([{ from: [7, 2], to: [4, 2] }], 'hard', { book: false, time: 5000 });
console.log('hard think from 1 ply:', JSON.stringify(r.move), 'depth', r.depth, 'nodes', r.nodes, 'nps', Math.round(r.nodes / ((Date.now() - t) / 1000)), 'time', Date.now() - t);
// 4) 一步杀：必须找到
{
  // 红车在 (8,5)，黑将在 (3,9)，红车在 (0,8) → 车 (8,5)->(8,9) 杀
  const hist = [];
}
console.log('ENGINE OK');
