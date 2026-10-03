// 技能模式电脑「智商考卷」：一组摆好的局面，专考这套棋特有的机制——
//   血量、打不死就弹回、升级不占行动、每个兵种技能、主帅兵法与终极兵法的时机、决战规则。
// 用法：node tools/bfai_exam.js [电脑文件...] [--level mid] [--runs 3] [--verbose] [--only 关键字] [--lint]
//   默认考 src/bfai.js（游戏里现用的）；可以一次给几个文件对比（比如 git show 出来的旧版本）。
//   每题按不同随机种子考 --runs 次，答对的次数记分。
//   --lint：不考电脑，只检查考题本身摆得对不对（将帅照面、将军状态、标准答案合法且判对、错误示范判错）。
//   --verify [毫秒]：不考电脑，用霸王档长时间深搜（默认每次 8000 毫秒）复核每道题的标准答案：
//     深搜自己会怎么走、判卷判它对不对；标准答案、错误示范走完之后各值几分。深搜不同意的题标出来，交人裁决。
//     注意：深搜用的还是被考电脑的估值，“深搜同意”只说明算得更深也站得住，不能代替人的判断。
// 出题原则：一题只考一个机制。无关的兵法默认设为已用（opts.used），免得别的强招干扰判断；
//   每题写上标准答案 answer（和可选的错误示范 bad），--lint 会拿它们验证判卷函数。
'use strict';
const path = require('path');
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
const XQ = global.XQ;

const argv = process.argv.slice(2);
const opt = { level: 'mid', runs: 3, verbose: false, files: [], only: null, lint: false, verify: 0 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--level') opt.level = argv[++i];
  else if (argv[i] === '--runs') opt.runs = +argv[++i];
  else if (argv[i] === '--verbose') opt.verbose = true;
  else if (argv[i] === '--only') opt.only = argv[++i];
  else if (argv[i] === '--lint') opt.lint = true;
  else if (argv[i] === '--verify') opt.verify = argv[i + 1] && /^\d+$/.test(argv[i + 1]) ? +argv[++i] : 8000;
  else opt.files.push(argv[i]);
}
if (!opt.files.length) opt.files = ['src/bfai.js'];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let pid = 500;
const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
const BOTH_ARTS_USED = { art: { r: 1, b: 1 } };
// 摆局面：pieces = [[f, r, piece]...]；f 0～8 从左到右，r 0～9 从汉方底线到楚方底线（汉在下）
//   o.used 默认双方主帅兵法都已用（一题只考一个机制）；要考兵法的题自己传 used
function position(pieces, o = {}) {
  const g = new BF.Game();
  g.setup(T => {
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) T.board[r][f] = null;
    for (const [f, r, p] of pieces) T.board[r][f] = p;
    T.turn = o.turn || 'r';
    T.merit = { r: 0, b: 0, ...(o.merit || {}) };
    if (o.cnt) T.cnt = { ...o.cnt };
    if (o.fx) T.fx = { ...T.fx, ...o.fx };
    if (o.dead) T.dead = { r: [], b: [], ...o.dead };
    const u = o.used || BOTH_ARTS_USED;
    T.used = { art: { r: 0, b: 0, ...(u.art || {}) }, ult: { r: 0, b: 0, ...(u.ult || {}) } };
  });
  return g;
}
// 从开局摆法改：remove = [[f, r]...] 拿掉的子记进阵亡名单
function fromStart(o = {}) {
  const g = new BF.Game();
  g.setup(T => {
    for (const [f, r] of o.remove || []) { const p = T.board[r][f]; T.board[r][f] = null; T.dead[p.s].push({ id: p.id, t: p.t, s: p.s }); }
    if (o.merit) T.merit = { ...T.merit, ...o.merit };
    if (o.turn) T.turn = o.turn;
    if (o.used) T.used = { art: { r: 0, b: 0, ...(o.used.art || {}) }, ult: { r: 0, b: 0, ...(o.used.ult || {}) } };
  });
  return g;
}
// 常用底子：双方帅将 + 两士，4 路各有一个兵隔开（将帅不照面）
const palace = () => [[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 3, P('r', 'p')], [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')]];

const desc = (S, a) => {
  if (a.k === 'up') { const p = S.board[a.at[1]][a.at[0]]; return `升${p ? N[p.t] : '?'}(${a.at})`; }
  if (a.k === 'mv') { const p = S.board[a.from[1]][a.from[0]], q = S.board[a.to[1]][a.to[0]]; return `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  if (a.k === 'art') return a.steps ? '破釜沉舟[' + a.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回良将';
  if (a.k === 'ult') return '终极兵法';
  if (a.k === 'sk') { const p = S.board[a.at[1]][a.at[0]]; return '技能' + (BF.SKILL_CN[a.sk || (p && BF.SKILL_OF(p.t, p.s))] || '') + '@' + a.at + (a.to ? '→' + a.to : ''); }
  if (a.k === 'pass') return '停着';
  return JSON.stringify(a);
};
// 执行一串行动，返回执行后的对局（不合法返回 null）
function play(g, seq) { for (const a of seq) if (!g.apply(a)) return null; return g; }
const findId = (g, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.board[r][f]; if (p && p.id === id) return [f, r]; } return null; };
// 走子方能打到这枚子吗（打得死才算）
const killable = (S, id) => BF.ai.gen(S, true).some(it => it.q && it.q.id === id && it.q.hp <= (it.sk === 'qishe' || it.sk === 'chongzhen' ? 1 : BF.ai.atk(it.p)));
const isMv = (a, from, to) => a.k === 'mv' && a.from[0] === from[0] && a.from[1] === from[1] && a.to[0] === to[0] && a.to[1] === to[1];
const isUp = (a, at) => a.k === 'up' && a.at[0] === at[0] && a.at[1] === at[1];
const isSk = (a, at, to) => a.k === 'sk' && a.at[0] === at[0] && a.at[1] === at[1] && (!to || (a.to && a.to[0] === to[0] && a.to[1] === to[1]));
// 走完这串行动后，这些 id 的子是不是都没了
const allDead = (g0, seq, ids) => { const g = play(g0, seq); return !!g && ids.every(id => !findId(g, id)); };
const countDead = (g0, seq, side) => { const before = g0.board.flat().filter(p => p && p.s === side).length; const g = play(g0, seq); return g ? before - g.board.flat().filter(p => p && p.s === side).length : -1; };

// ---------- 考题 ----------
// 每题：cat 分类；build() 摆局面；check(seq, g0) → true / false（g0 是新摆的局面，check 里可以在上面走棋）
//   answer：标准答案（--lint 验证它合法且判对）；bad：错误示范（--lint 验证它判错）；inCheck：开局面时走子方正被将军
const Q = [];
const ids = {};   // 判卷要用的棋子 id（build 时记下）

// ===== 一、血量与攻击 =====
Q.push({
  name: '1 先升级再吃', cat: '血量',
  desc: '汉车能吃楚炮，但楚车在后面保着。汉有 6 功：先把车升二级（2 血）再吃，楚车回吃只能打掉 1 血、被弹回——白赚一炮。',
  build: () => position([[5, 0, P('r', 'k')], [0, 3, P('r', 'r')], [6, 3, P('r', 'p')], [4, 9, P('b', 'k')], [4, 8, P('b', 'a')], [0, 7, P('b', 'c')], [0, 9, P('b', 'r')], [6, 6, P('b', 'p')]], { merit: { r: 6 } }),
  check: seq => seq.some(a => isUp(a, [0, 3])) && seq.some(a => isMv(a, [0, 3], [0, 7])),
  answer: [{ k: 'up', at: [0, 3] }, { k: 'mv', from: [0, 3], to: [0, 7] }],
  bad: [{ k: 'mv', from: [0, 3], to: [0, 7] }],
});
Q.push({
  name: '2 看穿对方先升级再吃', cat: '血量',
  desc: '汉马过了河，身后有汉兵保护（平时楚车吃马、汉兵回吃，楚亏）。可楚有 6 功：先升车（2 血）再吃马，汉兵回吃打不死、被弹回——汉马得赶紧跳开。（汉方九宫有二级士，防得住贴脸将军，这题只考保马。）',
  build: () => { const n = P('r', 'n'); ids.q2 = [n.id]; return position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a', 2)], [4, 3, P('r', 'p')], [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')], [6, 5, n], [6, 4, P('r', 'p')], [6, 8, P('b', 'r')]], { merit: { b: 6 } }); },
  // 走完之后汉马还在，而且楚方下一步打不死它
  check: (seq, g0) => { const g = play(g0, seq); return !!g && ids.q2.every(id => findId(g, id) && !killable(g.S, id)); },
  answer: [{ k: 'mv', from: [6, 5], to: [8, 4] }],
  bad: [{ k: 'mv', from: [3, 0], to: [4, 1] }],
});
Q.push({
  name: '3 升级保命', cat: '血量',
  desc: '汉车困在角上被楚马盯住，走不掉也挡不住马腿。汉有 6 功：给车升二级（2 血），马踏过来只扣 1 血、被弹回。',
  build: () => position([[4, 0, P('r', 'k')], [0, 0, P('r', 'r')], [1, 0, P('r', 'n')], [0, 1, P('r', 'p')], [6, 3, P('r', 'p')], [3, 9, P('b', 'k')], [1, 2, P('b', 'n')], [6, 6, P('b', 'p')]], { merit: { r: 6 } }),
  check: seq => seq.some(a => isUp(a, [0, 0])),
  answer: [{ k: 'up', at: [0, 0] }, { k: 'mv', from: [1, 0], to: [2, 2] }],
  bad: [{ k: 'mv', from: [1, 0], to: [2, 2] }],
});
Q.push({
  name: '4 打不死就弹回', cat: '血量',
  desc: '汉车能“攻击”楚方二级马（2 血，只能打掉 1 血、车弹回），汉炮能真正吃掉楚方一级炮。该吃炮。',
  build: () => position([[3, 0, P('r', 'k')], [7, 0, P('r', 'r')], [1, 2, P('r', 'c')], [5, 3, P('r', 'p')], [4, 9, P('b', 'k')], [7, 6, P('b', 'n', 2)], [1, 5, P('b', 'p')], [1, 7, P('b', 'c')], [5, 6, P('b', 'p')]]),
  check: seq => seq.some(a => isMv(a, [1, 2], [1, 7])),
  answer: [{ k: 'mv', from: [1, 2], to: [1, 7] }],
  bad: [{ k: 'mv', from: [7, 0], to: [7, 6] }],
});
Q.push({
  name: '5 白打一下', cat: '血量',
  desc: '楚方二级马（2 血）停在汉车的直线上，旁边没有别的事。车打它一下扣 1 血、车弹回原位，毫无风险——该打。',
  build: () => position([...palace(), [2, 0, P('r', 'r')], [2, 5, P('b', 'n', 2)]]),
  check: seq => seq.some(a => isMv(a, [2, 0], [2, 5])),
  answer: [{ k: 'mv', from: [2, 0], to: [2, 5] }],
});
Q.push({
  name: '6 二级士一刀扣 2 血', cat: '血量',
  desc: '楚方二级车（2 血）杀到帅前将军，帅无处可躲。一级士只能扣 1 血（打不死将军的子不算解将）；花 2 功把士升二级（攻击 2）就能一刀砍死它。',
  inCheck: true,
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 3, P('r', 'p')], [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 1, P('b', 'r', 2)], [4, 6, P('b', 'p')]], { merit: { r: 2 } }),
  check: seq => seq.some(a => a.k === 'up' && (isUp(a, [3, 0]) || isUp(a, [5, 0]))) && seq.some(a => a.k === 'mv' && a.to[0] === 4 && a.to[1] === 1),
  answer: [{ k: 'up', at: [3, 0] }, { k: 'mv', from: [3, 0], to: [4, 1] }],
});

// ===== 二、兵种技能 =====
Q.push({
  name: '7 别撞拒马', cat: '技能',
  desc: '汉方三级兵（3 血）架着拒马。楚车只有 1 血，去打它会先挨 1 点反伤、当场死掉。别去撞。',
  build: () => position([...palace(), [2, 5, P('r', 'p', 3, { jm: 11 })], [2, 8, P('b', 'r')], [7, 7, P('b', 'n')]], { turn: 'b', cnt: { r: 10, b: 10 } }),
  check: seq => !seq.some(a => isMv(a, [2, 8], [2, 5])),
  answer: [{ k: 'mv', from: [7, 7], to: [6, 5] }],
  bad: [{ k: 'mv', from: [2, 8], to: [2, 5] }],
});
Q.push({
  name: '8 架拒马', cat: '技能',
  desc: '汉方三级兵过了河，被楚车盯着。拒马不占行动：先给它架上（来犯的车先挨 1 点反伤、当场死掉），再走别的。',
  build: () => position([...palace(), [2, 5, P('r', 'p', 3)], [8, 0, P('r', 'r')], [8, 3, P('r', 'p')], [2, 8, P('b', 'r')], [8, 6, P('b', 'p')]]),
  check: seq => seq.some(a => isSk(a, [2, 5])),
  answer: [{ k: 'sk', at: [2, 5] }, { k: 'mv', from: [8, 0], to: [8, 1] }],
});
Q.push({
  name: '9 冲阵', cat: '技能',
  desc: '汉方三级车前面隔着一个楚卒，卒后面就是楚车。冲阵：卒挨 1 点（一级卒当场死），车落到它身后、吃掉楚车——一步两杀。普通走法只能吃卒。',
  build: () => { const R = P('b', 'r'), p = P('b', 'p'); ids.q9 = [R.id, p.id]; return position([...palace(), [0, 4, P('r', 'r', 3)], [0, 6, p], [0, 7, R]]); },
  check: (seq, g0) => allDead(g0, seq, ids.q9),
  answer: [{ k: 'sk', at: [0, 4], to: [0, 6] }],
  bad: [{ k: 'mv', from: [0, 4], to: [0, 6] }],
});
Q.push({
  name: '10 踏营', cat: '技能',
  desc: '汉方三级马已经过河，楚车就在马脚下的位置，可马腿被楚卒蹩住了。踏营（只能在敌方半场用）无视蹩马腿，直接踏死楚车。',
  build: () => { const R = P('b', 'r'); ids.q10 = R.id; return position([...palace(), [2, 5, P('r', 'n', 3)], [2, 6, P('b', 'p')], [3, 7, R]]); },
  check: (seq, g0) => allDead(g0, seq, [ids.q10]),
  answer: [{ k: 'sk', at: [2, 5], to: [3, 7] }],
});
Q.push({
  name: '11 霹雳', cat: '技能',
  desc: '汉方三级炮隔着一个兵对准楚卒，卒旁边挨着楚方二级车、二级马。霹雳：吃卒的同时，四周二级以上的敌子各扣 1 点（普通吃法只吃卒）。',
  build: () => { const R = P('b', 'r', 2), H = P('b', 'n', 2); ids.q11 = [R.id, H.id]; return position([...palace(), [6, 2, P('r', 'c', 3)], [6, 4, P('r', 'p')], [6, 7, P('b', 'p')], [6, 8, R], [7, 7, H]]); },
  check: (seq, g0) => { const g = play(g0, seq); if (!g) return false; return ids.q11.every(id => { const at = findId(g, id); return !at || g.at(at[0], at[1]).hp <= 1; }); },
  answer: [{ k: 'sk', at: [6, 2], to: [6, 7] }],
  bad: [{ k: 'mv', from: [6, 2], to: [6, 7] }],
});
Q.push({
  name: '12 齐射', cat: '技能',
  desc: '楚马过河贴到汉相斜前方一格、正捉着汉车。汉相四级：齐射不动身，射斜线 1～2 格的敌子扣 1 点——一级马当场射死（相走田字够不着斜一格）。',
  build: () => { const H = P('b', 'n'); ids.q12 = H.id; return position([...palace(), [4, 2, P('r', 'e', 4)], [7, 2, P('r', 'r')], [5, 3, H]]); },
  check: (seq, g0) => allDead(g0, seq, [ids.q12]),
  answer: [{ k: 'sk', at: [4, 2], to: [5, 3] }],
});
Q.push({
  name: '13 践踏', cat: '技能',
  desc: '楚象四级（践踏：攻击或吃子后，落点周围一圈的敌子各扣 1 点，一级的当场踩死）。过河汉兵旁边挤着汉马、汉炮、汉兵——象吃这个兵，一踩连杀一圈。',
  build: () => position([...palace(), [4, 7, P('b', 'e', 4)], [6, 5, P('r', 'p')], [5, 4, P('r', 'n')], [7, 4, P('r', 'c')], [7, 5, P('r', 'p')], [0, 3, P('r', 'r')]], { turn: 'b' }),
  check: (seq, g0) => countDead(g0, seq, 'r') >= 3,
  answer: [{ k: 'mv', from: [4, 7], to: [6, 5] }],
});
Q.push({
  name: '14 飞越', cat: '技能',
  desc: '楚车杀进汉方半场，汉相的象眼被自己的马塞住了。汉相三级：飞越无视塞象眼，照样飞过去吃车。',
  build: () => { const R = P('b', 'r'); ids.q14 = R.id; return position([...palace(), [0, 2, P('r', 'e', 3)], [1, 3, P('r', 'n')], [2, 4, R]]); },
  check: (seq, g0) => allDead(g0, seq, [ids.q14]),
  answer: [{ k: 'sk', at: [0, 2], sk: 'feiyue', to: [2, 4] }],
});
Q.push({
  name: '15 护驾解将', cat: '技能',
  desc: '楚车沿底线将军，帅上下左右都被封住，也没有子能挡。三级士护驾：和帅换位置，帅就躲开了。',
  inCheck: true,
  build: () => position([[4, 0, P('r', 'k')], [3, 2, P('r', 'a', 3)], [4, 3, P('r', 'p')], [8, 0, P('b', 'r')], [5, 3, P('b', 'n')], [4, 9, P('b', 'k')], [4, 6, P('b', 'p')]]),
  check: seq => seq.some(a => isSk(a, [3, 2])),
  answer: [{ k: 'sk', at: [3, 2] }],
});
Q.push({
  name: '16 神速营挡将', cat: '技能',
  desc: '楚车沿底线将军，帅被封死。汉方四级兵（神速营：八方向疾行 1～2 格、可越子）从 (2,2) 往后跳两格到 (2,0)，正好挡住。',
  inCheck: true,
  build: () => position([[4, 0, P('r', 'k')], [2, 2, P('r', 'p', 4)], [4, 3, P('r', 'p')], [0, 0, P('b', 'r')], [5, 3, P('b', 'n')], [4, 9, P('b', 'k')], [4, 6, P('b', 'p')]]),
  check: seq => seq.some(a => isMv(a, [2, 2], [2, 0])),
  answer: [{ k: 'mv', from: [2, 2], to: [2, 0] }],
});
Q.push({
  name: '17 铁甲禁卫挡将', cat: '技能',
  desc: '楚车横着将军，帅被两匹马封住。汉方四级士（铁甲禁卫：九宫内上下左右走一格）从 (5,0) 竖着上一格到 (5,1)，挡住将军。',
  inCheck: true,
  build: () => position([[4, 1, P('r', 'k')], [5, 0, P('r', 'a', 4)], [8, 1, P('b', 'r')], [5, 2, P('b', 'n')], [3, 4, P('b', 'n')], [4, 9, P('b', 'k')], [4, 6, P('b', 'p')]]),
  check: seq => seq.some(a => isMv(a, [5, 0], [5, 1])),
  answer: [{ k: 'mv', from: [5, 0], to: [5, 1] }],
});

// ===== 三、主帅兵法 =====
Q.push({
  name: '18 开局不乱升相士', cat: '军功',
  desc: '从开局双方各走 4 步（电脑对电脑）：相、士是守家的子，没被捉时花军功升它们是浪费，军功该留给车马炮、靠吃子攒（被捉住时升级保命不算错）。',
  multi: true,
  build: () => new BF.Game(),
  run: async (AI, g, level) => {
    const ups = [];
    for (let i = 0; i < 8 && !g.result; i++) {
      const seq = await AI.think(BF.cloneState(g.S), level);
      for (const a of seq) {
        if (a.k === 'up') {
          const p = g.at(a.at[0], a.at[1]);
          if (p && (p.t === 'a' || p.t === 'e')) {
            const V = Object.assign({}, g.S, { turn: p.s === 'r' ? 'b' : 'r', freeUsed: false, upgraded: false });
            if (!killable(V, p.id)) ups.push(N[p.t]);      // 被捉住时升级保命是对的，不算
          }
        }
        if (!g.apply(a)) break;
      }
    }
    return { pass: ups.length === 0, note: ups.length ? '没被威胁就升了 ' + ups.join('') : '没有乱升相士' };
  },
});
Q.push({
  name: '19 吃子攒军功', cat: '军功',
  desc: '汉马可以白吃楚马。前期军功只能靠吃子来：该吃，而且不该先花军功升相、士。',
  build: () => position([[4, 0, P('r', 'k')], [2, 3, P('r', 'n')], [2, 0, P('r', 'e')], [3, 0, P('r', 'a')], [6, 3, P('r', 'p')], [3, 9, P('b', 'k')], [3, 5, P('b', 'n')], [6, 6, P('b', 'p')], [8, 6, P('b', 'p')]], { merit: { r: 3 } }),
  check: seq => seq.some(a => isMv(a, [2, 3], [3, 5])) && !seq.some(a => isUp(a, [2, 0]) || isUp(a, [3, 0])),
  answer: [{ k: 'mv', from: [2, 3], to: [3, 5] }],
  bad: [{ k: 'up', at: [2, 0] }, { k: 'mv', from: [2, 3], to: [3, 5] }],
});
Q.push({
  name: '20 只死了马：留着召回', cat: '兵法',
  desc: '开局汉方丢了一匹马，两个车都在（楚方破釜沉舟已用）。召回良将一局只有一次，该留着给车上保险，不该拿来复活一匹马。',
  build: () => fromStart({ remove: [[1, 0]], used: { art: { b: 1 } } }),
  check: seq => !seq.some(a => a.k === 'art'),
  answer: [{ k: 'mv', from: [1, 2], to: [4, 2] }],
  bad: [{ k: 'art', id: 1 }],
});
// 第 21～23 题：车阵亡后要不要马上召回，看局面（楚方破釜沉舟设为已用，只考召回的时机）
//   底子：双方士、将帅、几个兵（4 路、8 路有兵隔着：将帅不照面，双方右车也不对吃）；汉方左车（开局 id 0，原位 (0,0)）已阵亡、原位空着
const deadRook = (extra, o = {}) => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [1, 0, P('r', 'n')], [8, 0, P('r', 'r')], [2, 3, P('r', 'p')], [4, 3, P('r', 'p')], [6, 3, P('r', 'p')], [8, 3, P('r', 'p')],
  [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [8, 9, P('b', 'r')], [2, 6, P('b', 'p')], [4, 6, P('b', 'p')], [6, 6, P('b', 'p')], [8, 6, P('b', 'p')], ...extra],
  { dead: { r: [{ id: 0, t: 'r', s: 'r' }] }, used: { art: { b: 1 } }, ...o });
const revives = seq => seq.some(a => a.k === 'art' && a.id === 0);
Q.push({
  name: '21 车阵亡：该马上召回', cat: '兵法',
  desc: '局面平静，楚炮从 0 路直插下来，随时能占住汉车原位（占住就召不回来了）；车召回来正好顺着 0 路捉这门炮。该马上召回。',
  build: () => deadRook([[0, 6, P('b', 'c')]]),
  check: seq => revives(seq),
  answer: [{ k: 'art', id: 0 }],
});
Q.push({
  name: '22 车阵亡：先办急事', cat: '兵法',
  desc: '汉车阵亡、原位安全，但楚车挂在汉炮口上（白吃一车）。召回不会跑，先吃车。',
  build: () => deadRook([[7, 2, P('r', 'c')], [7, 5, P('b', 'p')], [7, 7, P('b', 'r')]]),
  check: seq => seq.some(a => isMv(a, [7, 2], [7, 7])),
  answer: [{ k: 'mv', from: [7, 2], to: [7, 7] }],
  bad: [{ k: 'art', id: 0 }],
});
Q.push({
  name: '23 车阵亡：召回就被吃', cat: '兵法',
  desc: '楚车正对着汉车原位（0 路一路空着），车一召回来就被吃掉、汉方没子能回吃——这一次召回就白送了。先别召回。',
  build: () => deadRook([[0, 7, P('b', 'r')]]),
  check: seq => !revives(seq),
  answer: [{ k: 'mv', from: [1, 0], to: [2, 2] }],
  bad: [{ k: 'art', id: 0 }],
});
Q.push({
  name: '24 防破釜沉舟', cat: '兵法',
  desc: '汉车和楚车隔着一个汉兵对着。楚还有破釜沉舟：先吃兵、再吃车（连走两步，汉来不及回吃）。旁边有个白吃的卒是诱饵——汉车得先离开这条线。',
  build: () => { const R = P('r', 'r'); ids.q24 = R.id; return position([[3, 0, P('r', 'k')], [6, 4, R], [6, 6, P('r', 'p')], [0, 2, P('r', 'c')], [0, 3, P('r', 'p')], [4, 9, P('b', 'k')], [4, 8, P('b', 'a')], [4, 6, P('b', 'p')], [6, 8, P('b', 'r')], [0, 6, P('b', 'p')], [2, 6, P('b', 'p')]], { used: { art: { r: 0, b: 0 } } }); },
  check: (seq, g0) => {
    const g = play(g0, seq); if (!g || !findId(g, ids.q24)) return false;
    if (killable(g.S, ids.q24)) return false;
    return !BF.ai.pofuPairs(g.S).some(x => x.ev.some(e => e.e === 'kill' && e.id === ids.q24));
  },
  answer: [{ k: 'mv', from: [6, 4], to: [6, 0] }],
  bad: [{ k: 'mv', from: [0, 2], to: [0, 6] }],
});
Q.push({
  name: '25 破釜沉舟杀车', cat: '兵法',
  desc: '汉车有马保护，楚车直接吃就是一换一。汉方召回良将已经用掉，楚还有破釜沉舟：第一步吃车，第二步撤回安全地方——白杀一车。',
  build: () => { const R = P('r', 'r'), B = P('b', 'r'); ids.q25 = [R.id, B.id]; return position([[3, 0, P('r', 'k')], [2, 4, R], [1, 2, P('r', 'n')], [6, 3, P('r', 'p')], [4, 9, P('b', 'k')], [2, 8, B], [6, 6, P('b', 'p')], [0, 6, P('b', 'p')]], { turn: 'b', used: { art: { r: 1, b: 0 } } }); },
  // 汉车没了，楚车还在、而且汉方吃不回来
  check: (seq, g0) => { const g = play(g0, seq); return !!g && !findId(g, ids.q25[0]) && !!findId(g, ids.q25[1]) && !killable(g.S, ids.q25[1]); },
  answer: [{ k: 'art', steps: [{ from: [2, 8], to: [2, 4] }, { from: [2, 4], to: [2, 2] }] }],
  bad: [{ k: 'mv', from: [2, 8], to: [2, 4] }],
});

// ===== 四、终极兵法 =====
Q.push({
  name: '26 鸿门宴不白放', cat: '终极',
  desc: '楚有 20 功、鸿门宴没用，但楚军没有一个进攻子靠近汉帅：现在放鸿门宴（汉帅三回合不能动）毫无用处，20 功白花。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')], [4, 9, P('b', 'k')], [0, 9, P('b', 'r')], [1, 9, P('b', 'n')], [0, 6, P('b', 'p')], [4, 6, P('b', 'p')]], { turn: 'b', merit: { b: 20 } }),
  check: seq => !seq.some(a => a.k === 'ult'),
  answer: [{ k: 'mv', from: [4, 6], to: [4, 5] }],
  bad: [{ k: 'ult' }],
});
Q.push({
  name: '27 鸿门宴绝杀', cat: '终极',
  desc: '汉帅身边没有士相，楚车只差一步就能沿底线将军；平时汉帅往上一闪就躲掉了。放鸿门宴（汉帅三回合不能动），下一步车沉底就是绝杀。',
  build: () => position([[4, 0, P('r', 'k')], [0, 6, P('r', 'p')], [2, 6, P('r', 'p')], [3, 9, P('b', 'k')], [8, 5, P('b', 'r')], [6, 6, P('b', 'p')]], { turn: 'b', merit: { b: 20 } }),
  check: seq => seq.some(a => a.k === 'ult'),
  answer: [{ k: 'ult' }],
  bad: [{ k: 'mv', from: [8, 5], to: [8, 0] }],
});

// ===== 五、决战 =====
Q.push({
  name: '28 决战斩帅', cat: '决战',
  desc: '决战（双方车马炮兵都没了，帅将 3 血、可以被直接攻击）：楚将只剩 1 血，就在汉士斜前方。一刀砍下去就赢了。',
  build: () => position([[4, 0, P('r', 'k', 1, { w: 1, hp: 3 })], [3, 4, P('r', 'a', 1, { j: 1 })], [2, 0, P('r', 'e', 1, { j: 1 })], [4, 5, P('b', 'k', 1, { w: 1, hp: 1 })], [6, 9, P('b', 'a', 1, { j: 1 })], [2, 9, P('b', 'e', 1, { j: 1 })]]),
  check: (seq, g0) => { const g = play(g0, seq); return !!g && !!g.result && g.result.winner === 'r'; },
  answer: [{ k: 'mv', from: [3, 4], to: [4, 5] }],
});

// ---------- 自检：考题本身摆得对不对 ----------
function lint() {
  let bad = 0;
  for (const q of Q) {
    const errs = [];
    pid = 500;
    const g = q.build();
    const S = g.S, b = S.board;
    // 将帅照面（决战里取消飞将，不算）
    const kr = BF.ai ? (() => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k' && p.s === 'r') return [f, r]; } return null; })() : null;
    const kb = (() => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k' && p.s === 'b') return [f, r]; } return null; })();
    if (!kr || !kb) errs.push('缺帅或将');
    else if (!S.final && kr[0] === kb[0]) { let open = true; for (let r = Math.min(kr[1], kb[1]) + 1; r < Math.max(kr[1], kb[1]); r++) if (b[r][kr[0]]) open = false; if (open) errs.push('将帅照面'); }
    if (g.result) errs.push('局面已经分出胜负 ' + JSON.stringify(g.result));
    const chk = g.inCheck(S.turn);
    if (!!q.inCheck !== !!chk) errs.push(q.inCheck ? '题目说被将军，实际没有' : '走子方正被将军（题目没说）');
    // 对方此刻是不是被将军（轮到我方走时对方被将军 = 局面不合法）
    const other = S.turn === 'r' ? 'b' : 'r';
    if (!S.final && XQ.inCheck(b, other)) errs.push('不走棋的一方正被将军（局面不合法）');
    if (!q.multi) {
      if (!q.answer) errs.push('没有标准答案');
      else { pid = 500; const g1 = q.build(); const seq = q.answer.map(a => JSON.parse(JSON.stringify(a))); const g2 = q.build.length ? null : null; pid = 500; const gA = q.build(); const ok = play(gA, seq.map(x => x)); if (!ok) errs.push('标准答案不合法 ' + JSON.stringify(q.answer)); else { pid = 500; const gB = q.build(); if (!q.check(seq, gB)) errs.push('标准答案判卷判错'); } }
      if (q.bad) { pid = 500; const gC = q.build(); if (q.check(q.bad, gC)) errs.push('错误示范判卷判对'); }
    }
    // 走子方此刻能白吃的子（提示用：题目里多出来的吃子机会可能干扰判断）
    const caps = BF.ai.gen(S, true).filter(it => it.q && it.q.t !== 'k' && it.q.hp <= BF.ai.atk(it.p) && it.a.k === 'mv').map(it => desc(S, it.a));
    console.log(`${errs.length ? '✗' : '✓'} ${q.name}${errs.length ? '  ' + errs.join('；') : ''}${caps.length ? '   （能吃：' + caps.join(' ') + '）' : ''}`);
    if (errs.length) bad++;
  }
  console.log(bad ? `\n${bad} 道题有问题` : '\n考题全部自检通过');
  process.exit(bad ? 1 : 0);
}

// ---------- 深搜复核：标准答案在更深的搜索下站不站得住 ----------
async function verify() {
  const AI = require(path.resolve(__dirname, '..', opt.files[0]));
  AI.LEVELS.verify = { ...AI.LEVELS.hard, noise: 0, top: 1, budget: opt.verify };
  const list = (opt.only ? Q.filter(q => q.name.includes(opt.only) || q.cat === opt.only) : Q).filter(q => !q.multi);
  // 一串行动走完之后值几分（站在走棋方看）：直接分出胜负就是 ±9000，否则让深搜替对方找最好的应着再取反
  const valueOf = async (q, seq) => {
    pid = 500; const g = q.build(); const me = g.turn;
    if (!play(g, seq)) return { v: null, note: '不合法' };
    if (g.result) return { v: g.result.winner === me ? 9000 : -9000, note: '分出胜负' };
    if (g.turn === me) return { v: null, note: '没换手' };
    Math.random = mulberry32(4242);
    await AI.think(BF.cloneState(g.S), 'verify');
    return { v: -AI.think.last.v, depth: AI.think.last.depth };
  };
  console.log(`深搜复核：${opt.files[0]} 霸王档每次 ${opt.verify} 毫秒（判卷函数判深搜的着法；标准答案 / 错误示范各走完再深搜对方的应着）\n`);
  let disputed = 0;
  for (const q of list) {
    pid = 500; const g0 = q.build();
    Math.random = mulberry32(4242);
    const seq = await AI.think(BF.cloneState(g0.S), 'verify');
    const L = AI.think.last, vDeep = L.v;
    pid = 500; const gC = q.build();
    const deepPass = !!q.check(seq, gC);
    const ans = q.answer ? await valueOf(q, q.answer) : null;
    const bad = q.bad ? await valueOf(q, q.bad) : null;
    const fmt = x => (x == null ? '—' : (Math.abs(x) > 4000 ? (x > 0 ? '必胜' : '必败') : x.toFixed(2)));
    // 不同意：深搜的着法判卷判错，且深搜认为它比标准答案好出 0.5 分以上；或者错误示范反而比标准答案好
    const worse = ans && ans.v != null && vDeep - ans.v > 0.5;
    const badBetter = ans && bad && ans.v != null && bad.v != null && bad.v >= ans.v - 0.1;
    const verdict = deepPass ? '✓ 深搜同意' : worse ? '⚠ 深搜不同意（深搜的着法判错，且它认为比标准答案好）' : '△ 深搜走了别的，但认为和标准答案差不多（判卷可能太严，或深搜还不够深）';
    if (!deepPass && worse) disputed++;
    if (badBetter) disputed++;
    console.log(`【${q.name}】${verdict}${badBetter ? '  ⚠ 错误示范不比标准答案差' : ''}`);
    console.log(`   深搜走：${seq.map(a => desc(g0.S, a)).join(' + ')}（${fmt(vDeep)}，${L.depth} 层）`);
    if (ans) console.log(`   标准答案：${q.answer.map(a => desc(g0.S, a)).join(' + ')} → ${fmt(ans.v)}${ans.note ? '（' + ans.note + '）' : ''}`);
    if (bad) console.log(`   错误示范：${q.bad.map(a => desc(g0.S, a)).join(' + ')} → ${fmt(bad.v)}${bad.note ? '（' + bad.note + '）' : ''}`);
  }
  console.log(disputed ? `\n${disputed} 处需要人裁决` : '\n深搜全部同意');
}

// ---------- 开考 ----------
(async () => {
  if (opt.lint) return lint();
  if (opt.verify) return verify();
  const list = opt.only ? Q.filter(q => q.name.includes(opt.only) || q.cat === opt.only) : Q;
  const AIs = opt.files.map(f => ({ file: f, AI: require(path.resolve(__dirname, '..', f)) }));
  const score = AIs.map(() => 0), byCat = AIs.map(() => ({}));
  for (const q of list) {
    const row = { name: q.name, cells: [] };
    for (let ai = 0; ai < AIs.length; ai++) {
      const { AI } = AIs[ai];
      let ok = 0; const notes = [];
      for (let run = 0; run < opt.runs; run++) {
        Math.random = mulberry32(9001 + run * 7919);
        pid = 500;
        const g0 = q.build();
        let pass, note;
        if (q.multi) ({ pass, note } = await q.run(AI, g0, opt.level));
        else {
          const seq = await AI.think(BF.cloneState(g0.S), opt.level);
          note = seq.map(a => desc(g0.S, a)).join(' + ');
          if (opt.verbose && AI.think.last) note += `  （前几名：${AI.think.last.top.slice(0, 4).map(([a, v]) => desc(g0.S, a) + ' ' + v).join(' | ')}）`;
          pass = !!q.check(seq, g0);
        }
        if (pass) ok++;
        notes.push((pass ? '✓ ' : '✗ ') + note);
      }
      score[ai] += ok;
      const c = byCat[ai][q.cat] || (byCat[ai][q.cat] = [0, 0]); c[0] += ok; c[1] += opt.runs;
      row.cells.push({ ok, notes });
    }
    console.log(`\n【${q.name}】（${q.cat}）${q.desc}`);
    row.cells.forEach((c, i) => { console.log(`  ${AIs[i].file}: ${c.ok}/${opt.runs}`); for (const n of [...new Set(c.notes)]) console.log('     ' + n); });
  }
  console.log('\n分类得分：');
  AIs.forEach((a, i) => console.log(`  ${a.file}：` + Object.entries(byCat[i]).map(([k, [x, n]]) => `${k} ${x}/${n}`).join('  ')));
  console.log('总分（每题 ' + opt.runs + ' 次）：' + AIs.map((a, i) => `${a.file} ${score[i]}/${list.length * opt.runs}`).join('   '));
})().catch(e => { console.error(e); process.exit(1); });
