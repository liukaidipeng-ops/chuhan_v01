// 从游戏里「导出本局」的文本生成考题：用户觉得电脑哪一步走得蠢，就把这一步变成一道“实战题”
// 用法：
//   node tools/game2exam.js 对局.txt                       列出每一回合双方走了什么（标出哪边是电脑）
//   node tools/game2exam.js 对局.txt --turn 12楚           看第 12 回合楚方那一步：走之前的棋盘、电脑走了什么、深搜觉得该走什么
//   node tools/game2exam.js 对局.txt --turn 12楚 --add --name "白送车" [--desc "说明"] [--answer '<JSON 行动序列>'] [--mode same|avoid|survive] [--verify 毫秒]
//       把这一步收进 tools/bfai_exam_games.json（考卷会自动读）：电脑那步当“错误示范”。判卷方式 --mode：
//         same    走出和 --answer 一样的主行动（答案里有升级的，升级也要一样）——有 --answer 时默认
//         avoid   只要别再走电脑原来那一步——没 --answer 时默认
//         survive 走完之后，裁判（当前电脑霸王档、按节点数深搜，默认 100 万节点，--judge-nodes 改）替对方找不到必胜——用于“原着法导致必败”的题，
//                 别的同样守得住的走法也算对；--answer 只当标准答案存档、供 --lint 检查
//       收进去之前会先确认电脑那步、答案在这个局面下都合法。
//   对局文本也可以从标准输入读：把文件名写成 -
// 读取、重放、画棋盘都用 tools/game_load.js（导出格式由它负责，这里只调用）。
'use strict';
const fs = require('fs');
const path = require('path');
const { load, draw } = require('./game_load.js');
const BF = global.BF;

const argv = process.argv.slice(2);
const opt = { file: null, turn: null, add: false, name: null, desc: '', answer: null, verify: 8000, ai: 'src/bfai.js', mode: null, judgeNodes: 1000000 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--turn') opt.turn = v(); else if (k === '--add') opt.add = true; else if (k === '--name') opt.name = v();
  else if (k === '--desc') opt.desc = v(); else if (k === '--answer') opt.answer = JSON.parse(v()); else if (k === '--verify') opt.verify = +v();
  else if (k === '--ai') opt.ai = v(); else if (k === '--mode') opt.mode = v(); else if (k === '--judge-nodes') opt.judgeNodes = +v(); else if (!opt.file) opt.file = k; else throw new Error('多余的参数 ' + k);
}
if (!opt.file) { console.log('用法见文件开头的说明'); process.exit(1); }
const text = fs.readFileSync(opt.file === '-' ? 0 : opt.file, 'utf8');
const { game: full, data } = load(text);
if (data.kind !== 'bf') { console.log('这局不是技能模式（' + data.kind + '），考卷只收技能模式的局'); process.exit(1); }

const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
const SIDE = { r: '汉', b: '楚' };
const desc = (S, a) => {
  if (a.k === 'up') { const p = S.board[a.at[1]][a.at[0]]; return `升${p ? N[p.t] : '?'}(${a.at})`; }
  if (a.k === 'mv') { const p = S.board[a.from[1]][a.from[0]], q = S.board[a.to[1]][a.to[0]]; return `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  if (a.k === 'art') return a.steps ? '破釜沉舟[' + a.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回良将';
  if (a.k === 'ult') return '终极兵法';
  if (a.k === 'sk') { const p = S.board[a.at[1]][a.at[0]]; return '技能' + (BF.SKILL_CN[a.sk || (p && BF.SKILL_OF(p.t, p.s))] || '') + '@' + a.at + (a.to ? '→' + a.to : ''); }
  if (a.k === 'pass') return '停着';
  return JSON.stringify(a);
};

// 把整局行动切成“回合”：一方一次完整的行动（前面的升级、拒马 + 主行动）算一手
const entries = data.entries || [];
const turns = [];
{
  const g = load(data, 0).game;
  let start = 0, seq = [];
  for (let i = 0; i < entries.length; i++) {
    const side = g.turn;
    if (!seq.length) start = i;
    seq.push(desc(g.S, entries[i]));
    if (!g.apply(entries[i])) throw new Error('第 ' + (i + 1) + ' 条行动重放失败');
    if (g.turn !== side || g.result) {
      // 回合号：汉楚各走一手算一回合，和游戏里棋谱的编号一致
      turns.push({ round: Math.floor(turns.length / 2) + 1, side, from: start, to: i + 1, text: seq.join(' + '), ai: !!(data.ai && data.ai[side]) });
      seq = [];
    }
  }
}

function findTurn(spec) {
  const m = /^(\d+)\s*([汉楚rb])$/.exec(spec.trim());
  if (!m) throw new Error('--turn 要写成 “12楚” 或 “12汉” 这样');
  const side = m[2] === '汉' || m[2] === 'r' ? 'r' : 'b';
  const t = turns.find(x => x.round === +m[1] && x.side === side);
  if (!t) throw new Error(`找不到第 ${m[1]} 回合${SIDE[side]}方的那一手（这局共 ${turns.length} 手）`);
  return t;
}

(async () => {
  const aiInfo = data.ai ? Object.entries(data.ai).map(([s, l]) => SIDE[s] + '方是电脑（' + l + '）').join('、') : '没有电脑';
  if (!opt.turn) {
    console.log(`版本 ${data.ver} · ${aiInfo} · 共 ${turns.length} 手 · ${data.result ? (data.result.winner ? SIDE[data.result.winner] + '胜 ' + data.result.reason : '和') : '未分胜负'}`);
    for (const t of turns) console.log(`第 ${String(t.round).padStart(2)} 回合 ${SIDE[t.side]}${t.ai ? '（电脑）' : '        '}：${t.text}`);
    console.log('\n看某一手：加 --turn 12楚（回合号 + 哪一方）');
    return;
  }
  const t = findTurn(opt.turn);
  const g0 = load(data, t.from).game;
  const played = entries.slice(t.from, t.to);
  console.log(`第 ${t.round} 回合 ${SIDE[t.side]}方${t.ai ? '（电脑）' : '（不是电脑走的！考卷一般只收电脑的着法）'}，走之前的局面：\n`);
  console.log(draw(g0));
  console.log(`\n这一手走了：${played.map(a => desc(g0.S, a)).join(' + ')}`);
  // 深搜给个参考：它会怎么走、前几名各几分
  const AI = require(path.resolve(__dirname, '..', opt.ai));
  AI.LEVELS.verify = { ...AI.LEVELS.hard, noise: 0, top: 1, budget: opt.verify };
  let a = 77; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
  const deep = await AI.think(BF.cloneState(g0.S), 'verify');
  const L = AI.think.last;
  console.log(`深搜（${opt.verify} 毫秒，${L.depth} 层）会走：${deep.map(a => desc(g0.S, a)).join(' + ')}（${L.v.toFixed(2)}）`);
  console.log('  前几名：' + L.top.slice(0, 5).map(([x, v]) => desc(g0.S, x) + ' ' + v).join(' | '));
  if (!opt.add) { console.log('\n收成考题：加 --add --name "名字" [--answer \'[{"k":"mv","from":[f,r],"to":[f,r]}]\']'); return; }

  if (!opt.name) throw new Error('--add 需要 --name');
  // 收题前检查：电脑那一手、标准答案在这个局面下都合法
  const ok = seq => { const g = load(data, t.from).game; for (const x of seq) if (!g.apply(x)) return false; return true; };
  if (!ok(played)) throw new Error('原局这一手在重建的局面里不合法（导出数据有问题？）');
  if (opt.answer && !ok(opt.answer)) throw new Error('--answer 在这个局面下不合法：' + JSON.stringify(opt.answer));
  const file = path.join(__dirname, 'bfai_exam_games.json');
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const item = {
    name: opt.name, desc: opt.desc || `实战第 ${t.round} 回合${SIDE[t.side]}方：电脑走了 ${played.map(x => desc(g0.S, x)).join(' + ')}`,
    added: new Date().toISOString().slice(0, 10), at: t.from, side: t.side, bad: played, answer: opt.answer || null, mode: opt.mode || (opt.answer ? 'same' : 'avoid'), judgeNodes: opt.mode === 'survive' ? opt.judgeNodes : undefined,
    deep: { seq: deep, v: +L.v.toFixed(2), depth: L.depth, ms: opt.verify }, data,
  };
  list.push(item);
  fs.writeFileSync(file, JSON.stringify(list, null, 1));
  console.log(`\n已收进 ${path.relative(process.cwd(), file)}（第 ${list.length} 道实战题）。用 node tools/bfai_exam.js --only 实战 考一考。`);
})().catch(e => { console.error('出错：' + (e.message || e)); process.exit(1); });
