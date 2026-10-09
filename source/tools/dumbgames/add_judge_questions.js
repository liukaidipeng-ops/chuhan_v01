// 把复盘里“裁判确认走错”的局面收进考卷（tools/bfai_exam_games.json，判法 judge）。数据来自 trace_game.js 的 --json 输出。
//   每题：电脑实战那步当错误示范，裁判最好那步当标准答案；judge = {kind, depth, best, tol}：考的时候用同一个裁判、同样层数算走完的局面，
//   分数 ≥ best − tol 就算对。只收“不是已经输定 / 赢定”的局面。
'use strict';
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', '..'); process.chdir(SRC);
const { load } = require(SRC + '/tools/game_load.js');
const PICK = [   // [对局, 回合, 裁判, 名字, 说明]
  ['g1-mid', 24, 'deep', '吃车不吃（随机挑错）', '第一局第 24 回合（校尉）：马2,8→0,9 能吃车，电脑在 3 层里看两步一样好、随机走了 炮5,2→4,2；深裁判 5 层：吃车好 5.9 分。'],
  ['g2-hard', 2, 'deep', '开局炮吃兵', '第二局第 2 回合（霸王）：炮6,2→6,6 吃兵比实战 炮1,2→4,2 好 1.3 分（深裁判、宽裁判都这么看）。'],
  ['g3-hard', 9, 'deep', '车吃马', '第三局第 9 回合（霸王）：车1,5→1,9 吃马比实战 炮2,6→2,7 好 1.2～1.5 分（两个裁判都这么看）。'],
  ['g3-hard', 32, 'deep', '升兵还是升炮', '第三局第 32 回合（霸王，候选 108 个只算到 2 层）：升兵2,3 比实战升炮5,0 好 2.3 分（两个裁判都这么看）。'],
  ['g3-hard', 27, 'deep', '车换车', '第三局第 27 回合（霸王）：车6,4→6,3 吃车，比实战 升兵 + 车6,4→3,4 好 3.4 分（深裁判 5 层；4 层看不出——算浅）。'],
  ['g2-hard', 15, 'wide', '升级盲区：炮回防', '第二局第 15 回合（霸王）：升级全看的宽裁判认为 升士3,0 + 炮4,2→4,1 比实战 升士 + 炮4,2→4,6 吃兵好 2.1 分（对方的升级反击电脑看不见）。'],
  ['g1-mid', 23, 'wide', '升级盲区：升马', '第一局第 23 回合（校尉）：宽裁判认为升马再走 马1,6→2,8 比实战升车好 2.5 分。'],
  ['g1-mid', 21, 'wide', '升级盲区：炮先回', '第一局第 21 回合（校尉）：宽裁判认为 炮4,2→5,2 比实战 车0,2→3,2 吃兵好 1.2 分（楚随后升士 + 车吃马）。'],
];
const file = path.join(SRC, 'tools/bfai_exam_games.json'), list = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const [g, round, kind, name, desc] of PICK) {
  if (list.some(x => x.name === name)) { console.log('已有：' + name); continue; }
  const text = fs.readFileSync(`tools/dumbgames/${g}.txt`, 'utf8'), { data, rules } = load(text);
  const G = load(data, 0, rules).game, E = data.entries, turns = []; let start = 0, n = 0;
  for (let i = 0; i < E.length; i++) { const sd = G.turn; if (!n) start = i; n++; G.apply(E[i]); if (G.turn !== sd || G.result) { turns.push({ round: Math.floor(turns.length / 2) + 1, side: sd, from: start, to: i + 1 }); n = 0; } }
  const side = Object.keys(data.ai)[0], t = turns.find(x => x.round === round && x.side === side);
  const row = JSON.parse(fs.readFileSync(`tools/dumbgames/trace_${g}.json`, 'utf8')).find(r => r.round === round);
  const J = kind === 'deep' ? row.deep : row.wide;
  if (Math.abs(J.v) > 4000 || J.v - J.played < 1) throw new Error(`${g} R${round} 不合收题条件`);
  list.push({ name, desc: desc + ' 判卷：同一裁判按固定层数算走完的局面，不比最好那步差 0.5 分以上就算对。', added: '2026-10-09', rules, at: t.from, side,
    bad: E.slice(t.from, t.to), answer: J.seq, mode: 'judge', judge: { kind, depth: kind === 'deep' ? 4 : 3, best: +J.v.toFixed(2), tol: 0.5 }, data });
  console.log(`收：${name}（${g} R${round}，${kind}，最好 ${J.v.toFixed(2)}，实走 ${J.played.toFixed(2)}）`);
}
fs.writeFileSync(file, JSON.stringify(list, null, 1));
