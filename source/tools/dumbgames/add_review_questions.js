// 把 Ham 新规则下的对局（g4 / g5 / g6，C61 以后）里“裁判确认走错、还没输定”的局面收进考卷（tools/bfai_exam_games.json，判法 judge）。
//   顾问部 A2 ②（拍板单 ai_a2 = a）：Ham 输过的关键局面当闸，新电脑不能比线上答得差。
//   和 add_judge_questions.js 的区别：裁判换成线上电脑（git 提交号 BASE）自带的复盘开关（fixedDepth / upAll / rootUpAll），
//   和 tools/review/review.js 同一把尺子；收题前用考卷的判法重算一遍“最好那步”和“实走”，差不到 MIN 分的不收。
// 用法：node tools/dumbgames/add_review_questions.js [--dry]
//   收完跑 node tools/bfai_exam.js --lint --only 实；开局面时走子方正被将军的题要手动加 "inCheck": true（2026-10-10 的“帅躲一步”已加）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const SRC = path.join(__dirname, '..', '..'); process.chdir(SRC);
const { load } = require(SRC + '/tools/game_load.js');
const BF = global.BF;
const BASE = 'cac4cb8', MIN = 1, DRY = process.argv.includes('--dry');
const DEPTH = { deep: 4, wide: 3 };
const PICK = [   // [对局, 回合, 裁判, 名字, 说明]（最好那步取复盘里裁判的选择）
  ['g4-hard', 29, 'wide', '升象吃炮', 'g4（C61 上线后第一局，霸王执楚）第 29 回合：升象 6,9 + 象吃 4,7 的炮；线上根上筛子“守子没被捉不升”把它挡了（C64 修）。'],
  ['g4-hard', 27, 'wide', '九宫边的兵', 'g4 第 27 回合（90 个候选只算 2 层）：宽裁判认为 升士5,9 + 将4,8→5,6 比实走好。'],
  ['g5-hard', 17, 'deep', '算浅：第 17 回合', 'g5（霸王执楚，Ham：完全是虐杀）第 17 回合：当时只算 6 层，深裁判多算看出更好的一步。'],
  ['g5-hard', 19, 'wide', '升兵吃兵', 'g5 第 19 回合：升兵8,5 + 兵8,5→8,4 吃兵，被根上筛子（攒军功先升车）挡掉。'],
  ['g6-hard', 4, 'wide', '开局出车', 'g6（霸王执汉）第 4 回合：宽裁判认为 车8,0→7,0 比实走好。'],
  ['g6-hard', 11, 'wide', '升炮护车吃马', 'g6 第 11 回合：升炮8,6 + 车7,6→7,9 吃马（对方的升级反击电脑看不见）。'],
  ['g6-hard', 20, 'deep', '升相回防', 'g6 第 20 回合（领先 10 分时被楚车杀进九宫的开始）：升相6,0 + 车7,9→7,6，不在电脑前 8 名。'],
  ['g6-hard', 21, 'wide', '升相补位', 'g6 第 21 回合：升相2,0 + 相6,0→4,2。'],
  ['g6-hard', 24, 'wide', '帅躲一步', 'g6 第 24 回合：电脑以为已经输定，宽裁判找到 帅5,0→4,0 能躲开。'],
  ['g6-hard', 25, 'deep', '算浅：第 25 回合', 'g6 第 25 回合：当时只算 3 层，深裁判多算看出更好的一步。'],
  ['g6-hard', 32, 'deep', '随机挑错：升士护帅', 'g6 第 32 回合：电脑算出第一名是 升士4,1 + 帅4,0→3,0，按噪声挑了第 2 名。'],
];
const gitAI = (() => { const f = path.join(os.tmpdir(), 'bfai-judge-' + BASE + '.js');
  if (!fs.existsSync(f)) fs.writeFileSync(f, require('child_process').execFileSync('git', ['show', BASE + ':source/src/bfai.js'], { encoding: 'utf8' }));
  return require(f); })();
function play(g, seq) { for (const a of seq) if (!g.apply(a)) return null; return g; }
async function judgeVal(g, kind, side) {   // 和 bfai_exam.js 的 judgeVal（J.base）同一算法
  if (g.result) return g.result.winner === side ? 9000 : -9000;
  const M = gitAI; M.LEVELS.examFixB = { ...M.LEVELS.hard, noise: 0, top: 1, fixedDepth: DEPTH[kind], upAll: kind === 'wide', rootUpAll: kind === 'wide' };
  const saved = Math.random; let a = 17; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
  try { await M.think(BF.cloneState(g.S), 'examFixB'); } finally { Math.random = saved; }
  return -M.think.last.v;
}
const toSeq = b => Array.isArray(b) ? b : (Array.isArray(b.up) ? [{ k: 'up', at: b.up }, (({ up, ...m }) => m)(b)] : [b]);
(async () => {
  const file = path.join(SRC, 'tools/bfai_exam_games.json'), list = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [gname, round, kind, name, desc] of PICK) {
    if (list.some(x => x.name === name)) { console.log('已有：' + name); continue; }
    const text = fs.readFileSync(`tools/dumbgames/${gname}.txt`, 'utf8'), { data, rules } = load(text);
    const G = load(data, 0, rules).game, E = data.entries, turns = []; let start = 0, n = 0;
    for (let i = 0; i < E.length; i++) { const sd = G.turn; if (!n) start = i; n++; G.apply(E[i]); if (G.turn !== sd || G.result) { turns.push({ round: Math.floor(turns.length / 2) + 1, side: sd, from: start, to: i + 1 }); n = 0; } }
    const rv = fs.existsSync(`tools/dumbgames/review_${gname}.json`) ? JSON.parse(fs.readFileSync(`tools/dumbgames/review_${gname}.json`, 'utf8')) : null;
    const side = rv ? rv.side : Object.keys(data.ai)[0], t = turns.find(x => x.round === round && x.side === side);
    let best;
    if (rv) best = toSeq(rv.rows.find(r => r.round === round)[kind].best);
    else best = JSON.parse(fs.readFileSync(`tools/dumbgames/trace_${gname}.json`, 'utf8')).find(r => r.round === round)[kind].seq;
    const bad = E.slice(t.from, t.to);
    const gB = play(load(data, t.from, rules).game, best), gP = play(load(data, t.from, rules).game, bad);
    if (!gB || !gP) { console.log(`跳过 ${name}：${!gB ? '最好那步' : '实走'}重放不合法`); continue; }
    const vB = await judgeVal(gB, kind, side), vP = await judgeVal(gP, kind, side);
    const ok = vB - vP >= MIN && vB > -4000;
    console.log(`${ok ? '收' : '不收'}：${name}（${gname} R${round} ${kind}，最好 ${vB.toFixed(2)}，实走 ${vP.toFixed(2)}，差 ${(vB - vP).toFixed(2)}）`);
    if (!ok) continue;
    list.push({ name, desc: desc + ' 判卷：线上电脑（' + BASE + '）的复盘裁判按固定层数算走完的局面，不比最好那步差 0.5 分以上就算对。', added: '2026-10-10', rules, at: t.from, side,
      bad, answer: best, mode: 'judge', judge: { kind, depth: DEPTH[kind], base: BASE, best: +vB.toFixed(2), tol: 0.5 }, data: (({ think, branches, note, ...d }) => d)(data) });   // 思考记录、悔棋分支太大，不收
  }
  if (!DRY) fs.writeFileSync(file, JSON.stringify(list, null, 1));
})();
