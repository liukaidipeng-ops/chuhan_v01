// 引擎提速实测：checkers 先看一眼对方帅有没有被将军（没被将军直接返回 []）。固定 4 层、8 个局面，比原版和快版的分数、节点数和耗时
// 用法：node tools/perf/checkers_speed.js orig ； node tools/perf/checkers_speed.js fast   （两次输出的分数 / 节点必须逐个相同）
const fs = require('fs'), SRC = require('path').join(__dirname, '..', '..'); process.chdir(SRC);
const FAST = process.argv[2] === 'fast';
global.XQ = require(SRC + '/src/rules.js');
if (FAST) { const XQ = global.XQ, orig = XQ.checkers; XQ.checkers = (b, s) => { if (!XQ.findKing(b, XQ.other(s)) || !XQ.inCheck(b, XQ.other(s))) return []; return orig(b, s); }; }
const { load } = require(SRC + '/tools/game_load.js'); const BF = global.BF;
const A = require(SRC + '/src/bfai.js'); A.LEVELS.fix = { ...A.LEVELS.hard, depth: 4, noise: 0, top: 1, nodes: 1e9, minNodes: 0 };
const pos = []; for (const f of ['g2-hard', 'g3-hard']) { const text = fs.readFileSync('tools/dumbgames/' + f + '.txt', 'utf8'), n = JSON.parse(text.split('---DATA---\n')[1]).entries.length;
  for (let k = 0; k <= n; k += 9) { const S = load(text, k).game.S; if (S.turn === 'r' && !S.upgraded && !S.final) pos.push(BF.cloneState(S)); } }
(async () => { const out = []; const t0 = Date.now(); for (const S of pos.slice(0, 8)) { await A.think(BF.cloneState(S), 'fix'); out.push(A.think.last.v.toFixed(4) + '/' + A.think.last.nodes); } console.log(FAST ? '快' : '原', Date.now() - t0, 'ms', out.join(' ')); })();
