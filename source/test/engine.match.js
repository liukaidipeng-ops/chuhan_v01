// 人机互弈：检验三档强弱差距。用法：node engine.match.js <红档> <黑档> <局数> [霸王思考ms]
const XQ = require('../src/rules.js');
const { XQEngineFactory } = require('../src/engine.js');
const [A, B, N, HT] = [process.argv[2], process.argv[3], +process.argv[4] || 4, +process.argv[5] || 1000];
const E = XQEngineFactory();
const score = { [A + '(红)']: 0, [B + '(黑)']: 0, draw: 0 };
for (let g = 0; g < N; g++) {
  const game = new XQ.Game(); const hist = []; const seen = new Map();
  let res = null;
  for (let i = 0; i < 240 && !game.result; i++) {
    const lv = game.turn === 'r' ? A : B;
    let m;
    if (lv === 'random') { const ms = XQ.allLegalMoves(game.board, game.turn); m = ms[Math.floor(Math.random() * ms.length)]; }
    else m = E.think(hist, lv, lv === 'hard' ? { time: HT } : {}).move;
    if (!m || !game.play(m)) { console.log('bad move', lv, JSON.stringify(m)); break; }
    hist.push(m);
    const k = JSON.stringify(game.board.map(r => r.map(p => p ? p.s + p.t : '.'))) + game.turn;
    seen.set(k, (seen.get(k) || 0) + 1);
    if (seen.get(k) >= 4) { res = 'draw(rep)'; break; }
  }
  if (game.result) { const w = game.result.winner === 'r' ? A + '(红)' : B + '(黑)'; score[w]++; res = w + ' ' + game.result.reason; }
  else { score.draw++; res = res || 'draw(240)'; }
  console.log(`game ${g + 1}: ${res} after ${hist.length} plies`);
}
console.log('RESULT', A, 'vs', B, JSON.stringify(score));
