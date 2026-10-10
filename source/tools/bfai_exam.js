// 技能模式电脑「智商考卷」：一组摆好的局面，专考这套棋特有的机制——
//   血量、打不死就弹回、升级不占行动、每个兵种技能、主帅兵法与终极兵法的时机、决战规则。
// 用法：node tools/bfai_exam.js [电脑文件...] [--level mid] [--runs 3] [--verbose] [--only 关键字] [--lint] [--nodes N]
//   --nodes N 或 mid=60000,hard=200000[,verify=1000000]：电脑按搜索节点数收手（LEVELS.<档>.nodes），结果和机器快慢无关、可复现
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
// --nodes 的写法：一个数字（各档一样），或 mid=60000,hard=200000（分档）
const parseNodes = v => { if (v == null || v === '' || v === 0) return null; if (typeof v === 'object') return v; if (/^\d+$/.test(String(v))) return { '*': +v }; const o = {}; for (const kv of String(v).split(',')) { const [k, n] = kv.split('='); o[k.trim()] = +n; } return o; };
const applyNodes = (LEVELS, spec, extra = {}) => { if (!spec) return; for (const k of Object.keys(LEVELS)) { const base = k.replace(/Save$/, ''); const lv = extra[base] || base; const n = spec[lv] != null ? spec[lv] : spec['*']; if (n) LEVELS[k].nodes = n; } };


const argv = process.argv.slice(2);
const opt = { level: 'mid', runs: 3, verbose: false, files: [], only: null, lint: false, verify: 0, nodes: 0 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--level') opt.level = argv[++i];
  else if (argv[i] === '--runs') opt.runs = +argv[++i];
  else if (argv[i] === '--verbose') opt.verbose = true;
  else if (argv[i] === '--only') opt.only = argv[++i];
  else if (argv[i] === '--lint') opt.lint = true;
  else if (argv[i] === '--nodes') opt.nodes = argv[++i];
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
// 走子方这一手能不能直接将死对方（会试先升级再走、所有技能和兵法）
function mateInOne(S) {
  const bases = [S];
  if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const T = BF.ai.upgradeState(S, [f, r]); if (T) bases.push(T); } }
  for (const B of bases) for (const k of BF.ai.expand(B)) { if (k.S.turn === S.turn) continue; const st = BF.evaluate(k.S); if (st.result && st.result.winner === S.turn) return true; }
  return false;
}
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
  desc: '楚车横着将军，帅被两匹马封住。汉方四级士（铁甲禁卫：九宫内上下左右走一格）从 (5,0) 竖着上一格到 (5,1)，挡住将军。（这枚士的护驾在冷却中——不然“护驾换位”也能解将，这题就考不到铁甲禁卫了）',
  inCheck: true,
  build: () => position([[4, 1, P('r', 'k')], [5, 0, P('r', 'a', 4, { cd: 99 })], [8, 1, P('b', 'r')], [5, 2, P('b', 'n')], [3, 4, P('b', 'n')], [4, 9, P('b', 'k')], [4, 6, P('b', 'p')]]),
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
  // 深搜复核时“不同意”：电脑自己的搜索里不考虑对方的破釜沉舟，所以它深搜也觉得吃诱饵卒没事；
  //   可真走出去、轮到楚方思考时楚方会用破釜沉舟，错误示范 −4.06 对标准答案 +4.07。裁决：标准答案成立。
  adjudicated: '标准答案成立：深搜不同意是因为电脑搜索里看不到对方的破釜沉舟（考的正是这个）',
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
  desc: '汉帅上了一步站在 (4,1)，两个二级士守着底线角、自己动不了。楚车只要横到 1 路就是将军，平时汉帅往下或往上一闪就躲开了。楚正好 20 功：放鸿门宴（汉帅三回合不能动），下一步车横过来就是绝杀。拿军功去升级就放不了鸿门宴了。',
  build: () => position([[4, 1, P('r', 'k')], [3, 0, P('r', 'a', 2)], [5, 0, P('r', 'a', 2)], [2, 4, P('r', 'p')], [8, 4, P('r', 'p')], [4, 9, P('b', 'k')], [4, 6, P('b', 'p')], [0, 5, P('b', 'r')]], { turn: 'b', merit: { b: 20 } }),
  check: seq => seq.some(a => a.k === 'ult'),
  answer: [{ k: 'ult' }],
  bad: [{ k: 'mv', from: [0, 5], to: [0, 1] }],
});

// ===== 五、决战 =====
Q.push({
  name: '28 决战斩帅', cat: '决战',
  desc: '决战（双方车马炮兵都没了，帅将 3 血、可以被直接攻击）：楚将只剩 1 血，就在汉士斜前方。一刀砍下去就赢了。',
  build: () => position([[4, 0, P('r', 'k', 1, { w: 1, hp: 3 })], [3, 4, P('r', 'a', 1, { j: 1 })], [2, 0, P('r', 'e', 1, { j: 1 })], [4, 5, P('b', 'k', 1, { w: 1, hp: 1 })], [6, 9, P('b', 'a', 1, { j: 1 })], [2, 9, P('b', 'e', 1, { j: 1 })]]),
  check: (seq, g0) => { const g = play(g0, seq); return !!g && !!g.result && g.result.winner === 'r'; },
  answer: [{ k: 'mv', from: [3, 4], to: [4, 5] }],
});

// ===== 六、实战题：用户从游戏里导出的对局，指出电脑哪一步走得蠢（tools/game2exam.js --add 收进来） =====
{
  const file = path.join(__dirname, 'bfai_exam_games.json');
  if (require('fs').existsSync(file)) {
    const { load, detectRules, applyRules } = require('./game_load.js');
    const main = seq => seq[seq.length - 1];   // 电脑给的是 [升级?, 拒马?, 主行动]
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    // survive 的裁判：当前电脑霸王档，按节点数深搜（结果可复现），看对方有没有必胜
    let judge = null;
    const survives = async (g, side, nodes) => {
      if (g.result) return g.result.winner === side;
      if (!judge) { judge = require('../src/bfai.js'); }
      judge.LEVELS.judge = { ...judge.LEVELS.hard, noise: 0, top: 1, nodes: nodes || 1000000 };
      const saved = Math.random; let a = 99; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
      try { await judge.think(BF.cloneState(g.S), 'judge'); } finally { Math.random = saved; }
      return judge.think.last.v < 4500;   // 对方找不到必胜
    };
    // nomate 的判法：走完之后对方没有一步杀（对方可以先给一枚子升一级再走）——精确枚举，不靠搜索（搜索本身会漏“先升级再杀”）
    const mate1 = (S, side) => {
      const opp = side === 'r' ? 'b' : 'r';
      if (S.turn !== opp) return false;
      const st = [S];
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === opp && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) st.push(U); } }
      for (const X of st) for (const e of BF.ai.gen(X, false)) { const R = BF.attempt(X, e.a); if (!R) continue; const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === opp) return true; }
      return false;
    };
    // judge 的判法：走完之后请复盘用的裁判（tools/variants/bfai_trace.js；kind = 'deep' 和电脑看法一样、'wide' 升级全看）
    //   按固定层数算一遍走完的局面，分数不比出题时裁判最好那步低过 tol 就算对（不止一种好着）。同一个局面只算一次
    let TRM = null; const judged = new Map(), judgeAIs = {};
    const judgeAI = base => judgeAIs[base] || (judgeAIs[base] = (() => {
      const fs = require('fs'), os = require('os'), f = path.join(os.tmpdir(), 'bfai-judge-' + base + '.js');
      if (!fs.existsSync(f)) fs.writeFileSync(f, require('child_process').execFileSync('git', ['show', base + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' }));
      return require(f);
    })());
    const judgeVal = async (g, it) => {
      if (g.result) return g.result.winner === it.side ? 9000 : -9000;
      const J = it.judge, S = g.S, key = J.kind + J.depth + (J.base || '') + JSON.stringify([S.board, S.turn, S.merit, S.used, S.cnt]);
      if (judged.has(key)) return judged.get(key);
      let M, lv = 'examFix';
      if (J.base) {   // 新题（2026-10-10 起）：裁判 = 那一版线上电脑（git 提交号）自带的复盘开关，和 tools/review/review.js 同一把尺子
        M = judgeAI(J.base); lv = 'examFixB';
        M.LEVELS.examFixB = { ...M.LEVELS.hard, noise: 0, top: 1, fixedDepth: J.depth, upAll: J.kind === 'wide', rootUpAll: J.kind === 'wide' };
      } else {
        if (!TRM) TRM = require('./variants/bfai_trace.js');
        M = J.kind === 'wide' ? TRM.judge('wide') : TRM;
        M.LEVELS.examFix = { ...M.LEVELS.hard, noise: 0, top: 1, depth: J.depth, nodes: 4000000 };
      }
      const saved = Math.random; let a = 17; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
      try { await M.think(BF.cloneState(S), lv); } finally { Math.random = saved; }
      const v = -M.think.last.v; judged.set(key, v); return v;
    };
    JSON.parse(require('fs').readFileSync(file, 'utf8')).forEach((it, i) => { const rules = it.rules || detectRules(it.data); applyRules(null); Q.push({
      name: `实${i + 1} ${it.name}`, cat: '实战', desc: it.desc, rules,   // rules：这局当时的规则（破釜时代的对局要关背水；见 game_load.js 的 detectRules）
      build: () => load(it.data, it.at, rules).game,
      // same：主行动要和答案一样（答案里有升级的，升级也要一样）；avoid：别再走电脑原来那一步；survive：走完之后对方深搜找不到必胜；nomate：走完之后对方没有一步杀（含先升级）；judge：复盘裁判按固定层数算，不比最好那步差过 tol
      check: it.mode === 'judge' ? async (seq, g0) => { const g = play(g0, seq); return !!g && (await judgeVal(g, it)) >= it.judge.best - (it.judge.tol != null ? it.judge.tol : 0.5); }
        : it.mode === 'nomate' ? (seq, g0) => { const g = play(g0, seq); return !!g && (g.result ? g.result.winner === it.side : !mate1(g.S, it.side)); }
        : (it.mode || (it.answer ? 'same' : 'avoid')) === 'survive'
        ? async (seq, g0) => { const g = play(g0, seq); return !!g && survives(g, it.side, it.judgeNodes); }
        : seq => ((it.mode || (it.answer ? 'same' : 'avoid')) === 'same' ? same(main(seq), main(it.answer)) && it.answer.filter(a => a.k === 'up').every(u => seq.some(a => same(a, u))) : !same(main(seq), main(it.bad))),
      answer: it.answer || undefined, bad: it.bad, adjudicated: it.adjudicated, disabled: it.disabled, inCheck: it.inCheck,
    }); });
  }
}

// ===== 七、升级后贴脸将军 =====
// 打不死将军的子不算解将：二级（2 血）的子贴在帅将身边将军，一级士、帅（攻击 1）只能打掉 1 血，帅又被自己的士堵着时就是死棋
Q.push({
  name: '29 升级贴脸绝杀', cat: '贴脸',
  desc: '汉帅在底线，两边是自己的一级士，正前方 (4,1) 空着。楚车横到 (4,1) 将军：一级车会被士或帅吃掉；先花 6 功升二级（2 血），士帅都打不死它、帅又走不开——绝杀。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 3, P('r', 'p')], [8, 0, P('r', 'r')], [8, 3, P('r', 'p')], [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')], [8, 6, P('b', 'p')], [0, 1, P('b', 'r')]], { turn: 'b', merit: { b: 6 } }),
  check: (seq, g0) => { const g = play(g0, seq); return !!g && !!g.result && g.result.winner === 'b'; },
  answer: [{ k: 'up', at: [0, 1] }, { k: 'mv', from: [0, 1], to: [4, 1] }],
  bad: [{ k: 'mv', from: [0, 1], to: [4, 1] }],
});
Q.push({
  name: '30 防贴脸将军', cat: '贴脸',
  desc: '同样的阵形，轮到汉走：楚有 6 功、楚车在 1 路，下一步“升车 + 车贴到 (4,1) 将军”就是绝杀。汉有 2 功，得先防住（比如把士升二级，攻击 2 就能一刀砍死 2 血的车；或者让帅有路可走）。判卷：汉走完之后，楚方没有一步杀。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 3, P('r', 'p')], [8, 0, P('r', 'r')], [8, 3, P('r', 'p')], [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')], [8, 6, P('b', 'p')], [0, 1, P('b', 'r')]], { merit: { r: 2, b: 6 } }),
  check: (seq, g0) => { const g = play(g0, seq); return !!g && !g.result && !mateInOne(g.S); },
  answer: [{ k: 'up', at: [3, 0] }, { k: 'mv', from: [8, 0], to: [7, 0] }],
  bad: [{ k: 'mv', from: [8, 3], to: [8, 4] }],
});

// ===== 八、破釜反击：楚用过破釜沉舟、兵种技能被封的那几回合（2026-10-03，用户：“执汉需要利用好破釜的debuff进行反击”） =====
// 局面里 cnt.b < fx.pf：楚方接下来 fx.pf − cnt.b 步不能用兵种主动技能（冲阵、踏营、霹雳、飞越、护驾、拒马）；升级和被动走法不封（现行规则）。
//   汉方要趁这几回合占平时会被这些技能惩罚的格子、把子力打回来，而不是只顾着躲。每题都过了三关（工作流出题 + 独立复核）：
//   自检、深搜复核同意、对照（同一局面 fx.pf = 0 不封锁，标准答案会被技能反杀或不再成立）。
//   电脑现状：9ff64a4 和 dev 都 3/3——战术上它们懂封锁（搜索里有引擎规则）；缺的是更长远的“算账、引破釜、整段窗口的反击”，这是地平线问题，考卷管不到，要靠对打和“破釜前后”统计。
Q.push({
  name: '31 护驾被封：马闷杀', cat: '破釜反击',
  desc: '楚前面用破釜沉舟吃了汉一车，楚马还捉着汉车；楚方技能还封 2 回合（楚接下来两步都不能用技能）。楚将被自己的两个士和回防的马堵死，汉车在中路牵着那匹马。平时汉马来将军，三级士「护驾」和将一换位就躲开了；现在护驾用不了。楚只有 3 功，也不够把士升到四级用「铁甲禁卫」横走一格挡马腿（升级和被动走法破釜封不住）。所以别忙着救车，马跳上去（比如 (6,4)→(7,6)），楚吃车也来不及，下一步马到 (6,8) 或 (5,7) 将军就是闷杀。先救车再进攻，封锁就过了。判卷：汉走完之后，楚怎么应（含先升级），汉下一步都能将死。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [6, 0, P('r', 'e')], [4, 4, P('r', 'r')], [6, 4, P('r', 'n')], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a', 3)], [4, 8, P('b', 'n')], [2, 3, P('b', 'n')], [8, 0, P('b', 'r')], [0, 6, P('b', 'p')], [2, 6, P('b', 'p')], [8, 6, P('b', 'p')]],
    { turn: 'r', cnt: { r: 12, b: 12 }, fx: { pf: 14 }, merit: { r: 0, b: 3 }, used: { art: { r: 1, b: 1 } } }),
  // 汉走完之后：楚方每一种应法（含先升级、兵种技能、兵法）之后，汉都有一步杀
  check: (seq, g0) => {
    const g = play(g0, seq); if (!g) return false;
    if (g.result) return g.result.winner === 'r';
    const bases = [g.S]; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const T = BF.ai.upgradeState(g.S, [f, r]); if (T) bases.push(T); }
    const replies = bases.flatMap(B => [...BF.ai.expand(B), ...BF.ai.pofuPairs(B)]).filter(k => k.S.turn === 'r');
    return replies.length > 0 && replies.every(k => { const st = BF.evaluate(k.S); return st.result ? st.result.winner === 'r' : mateInOne(k.S); });
  },
  answer: [{ k: 'mv', from: [6, 4], to: [7, 6] }],
  bad: [{ k: 'mv', from: [4, 4], to: [4, 3] }],
});
Q.push({
  name: '32 飞越被封：车进象口抢杀', cat: '破釜反击',
  desc: '楚前面用了破釜沉舟，楚车正捉着汉马；楚方技能还封 2 回合（楚接下来两步都不能用技能）。汉车沿 6 路冲到 (6,9) 底线将军：平时这一格有楚象守着——象眼虽被汉马塞住，三级象能「飞越」过去把车吃掉；现在飞越用不了，楚只能把士撑到 (5,9) 挡，汉车吃士再将（汉马保着车、另一匹马封住 (4,8) 和 (3,9)）就是绝杀。别忙着救马。判卷：汉走完之后，楚怎么应，汉下一步都能将死。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [6, 2, P('r', 'r')], [7, 8, P('r', 'n')], [2, 7, P('r', 'n')], [0, 3, P('r', 'p')],
    [4, 9, P('b', 'k')], [4, 8, P('b', 'a')], [8, 7, P('b', 'e', 3)], [4, 6, P('b', 'p')], [8, 6, P('b', 'p')], [0, 6, P('b', 'p')], [0, 7, P('b', 'r')], [2, 4, P('b', 'n')]],
    { turn: 'r', cnt: { r: 12, b: 12 }, fx: { pf: 14 }, used: { art: { r: 1, b: 1 } } }),
  // 汉走完之后：楚方每一种应法（含先升级、兵种技能、兵法）之后，汉都有一步杀
  check: (seq, g0) => {
    const g = play(g0, seq); if (!g) return false;
    if (g.result) return g.result.winner === 'r';
    const bases = [g.S]; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const T = BF.ai.upgradeState(g.S, [f, r]); if (T) bases.push(T); }
    const replies = bases.flatMap(B => [...BF.ai.expand(B), ...BF.ai.pofuPairs(B)]).filter(k => k.S.turn === 'r');
    return replies.length > 0 && replies.every(k => { const st = BF.evaluate(k.S); return st.result ? st.result.winner === 'r' : mateInOne(k.S); });
  },
  answer: [{ k: 'mv', from: [6, 2], to: [6, 9] }],
  bad: [{ k: 'mv', from: [2, 7], to: [1, 5] }],
});
Q.push({
  name: '33 冲阵被封：车吃炮', cat: '破釜反击',
  desc: '楚前面用了破釜沉舟，接下来两步不能用技能。楚马正捉着汉车。楚炮 (8,6) 看着没人保，其实平时有楚车冲阵护着：汉车一吃炮，底线的三级楚车就撞开自己的象、冲到炮位把汉车吃掉。现在冲阵被封——汉车别光逃，直接吃炮（顺便躲开了马），白赚一炮。',
  build: () => { const R = P('r', 'r'), C = P('b', 'c'); ids.pf33 = { R: R.id, C: C.id }; return position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 3, P('r', 'p')], [0, 3, P('r', 'p')], [8, 2, R], [1, 0, P('r', 'n')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')], [0, 6, P('b', 'p')], [8, 9, P('b', 'r', 3)], [8, 7, P('b', 'e', 2)], [8, 6, C], [6, 3, P('b', 'n')], [6, 4, P('b', 'p')]],
    { turn: 'r', cnt: { r: 12, b: 12 }, fx: { pf: 14 }, used: { art: { r: 1, b: 1 } } }); },
  // 楚炮没了、汉车还在，而且楚方所有合法应着（含冲阵等技能，真走一遍）都打不死汉车
  //   （不用 killable：它只看落点上的子，看不到冲阵跳过跳板后落下去吃的那一枚）
  check: (seq, g0) => {
    const g = play(g0, seq); if (!g || findId(g, ids.pf33.C) || !findId(g, ids.pf33.R)) return false;
    return !BF.ai.expand(g.S).some(k => !k.S.board.some(row => row.some(p => p && p.id === ids.pf33.R)));
  },
  answer: [{ k: 'mv', from: [8, 2], to: [8, 6] }],
  bad: [{ k: 'mv', from: [8, 2], to: [8, 0] }],
});
const q34build = (pf, mb = 0) => () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 3, P('r', 'p')], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')], [6, 1, P('r', 'r')], [1, 0, P('r', 'n')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')], [0, 6, P('b', 'p')], [7, 4, P('b', 'n', 3)], [7, 5, P('b', 'p')], [5, 6, P('b', 'n')], [8, 6, P('b', 'c')]],
    { turn: 'r', cnt: { r: 12, b: 12 }, fx: { pf }, merit: { r: 0, b: mb }, used: { art: { r: 1, b: 1 } } });
// 汉走完之后：楚方不管怎么应（全部合法主行动，也算上“先升级再走”），汉下一步都能吃掉楚方一个车马炮，
//   而且吃完之后楚方（同样算上升级）打不死那枚吃子的子
const q34check = (seq, g0) => {
    const g = play(g0, seq); if (!g || g.result || g.turn !== 'b') return false;
    const on = (S, id) => S.board.some(row => row.some(p => p && p.id === id));
    const withUp = S => { const out = [S]; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const T = BF.ai.upgradeState(S, [f, r]); if (T) out.push(T); } } return out; };
    const replies = withUp(g.S).flatMap(B => BF.ai.expand(B));
    return replies.length > 0 && replies.every(k => BF.ai.gen(k.S, true).some(it => {
      if (!it.q || !'rnc'.includes(it.q.t)) return false;
      const r = BF.attempt(k.S, it.a); if (!r || r.free || on(r.S, it.q.id) || !on(r.S, it.p.id)) return false;
      return !withUp(r.S).some(B => BF.ai.expand(B).some(x => !on(x.S, it.p.id)));
    }));
  };
Q.push({
  name: '34 踏营被封：车捉双', cat: '破釜反击',
  desc: '楚前面用了破釜沉舟，接下来两步不能用技能。楚三级马扎在汉方半场 (7,4)，它跳 (6,6) 的马腿被自己的卒蹩住，可三级马平时有踏营，不管蹩腿照样踏过去，所以 (6,6) 本来是汉车的禁区。现在踏营被封：汉车直插 (6,6)，同时捉 (5,6) 的楚马和 (8,6) 的楚炮。楚没有军功升级保子，只能救一个，汉车下一步白吃另一个（楚还在封锁里，踏营吃不回来）。得马上动手：拖一步，等汉车去吃炮时封锁已经过了，楚马能踏营把车吃回来。',
  build: q34build(14),
  check: q34check,
  answer: [{ k: 'mv', from: [6, 1], to: [6, 6] }],
  bad: [{ k: 'mv', from: [6, 1], to: [5, 1] }],
});
Q.push({
  name: '35 踏营被封：关门打马', cat: '破釜反击',
  desc: '楚三级马用破釜沉舟连跳两步，踩掉了汉方底角的车，停在 (8,0)。它往外跳只有两条路：去 (6,1) 的马腿被汉马蹩着，去 (7,2) 的马腿 (8,1) 还空着。平时堵马腿没用——三级马有踏营，无视蹩腿照样跳走。可破釜之后楚三回合不能用技能：汉车走到 (8,1)，既堵死最后一条马腿、又贴着马，接下来三步连打三下（三级马 3 血），封锁结束前把它打死。一步都不能浪费：少打一下，封锁一结束马就踏营跑了。',
  build: () => { const H = P('b', 'n', 3); ids.pf35 = H.id; return position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [2, 0, P('r', 'e')], [6, 0, P('r', 'e')], [7, 0, P('r', 'n')], [2, 1, P('r', 'r')],
    [0, 3, P('r', 'p')], [2, 3, P('r', 'p')], [4, 3, P('r', 'p')], [6, 3, P('r', 'p')], [8, 3, P('r', 'p')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [2, 9, P('b', 'e')], [6, 9, P('b', 'e')], [1, 9, P('b', 'n')],
    [0, 6, P('b', 'p')], [2, 6, P('b', 'p')], [4, 6, P('b', 'p')], [6, 6, P('b', 'p')], [8, 6, P('b', 'p')], [8, 0, H]],
    { turn: 'r', cnt: { r: 12, b: 12 }, fx: { pf: 15 }, used: { art: { r: 1, b: 1 } } }); },
  // 汉走完之后楚马已经跑不掉：楚方不管怎么应，汉方都能接着打它、三步之内打死（汉方只试“打这匹马”的着法，够用就说明它逃不了）
  check: (seq, g0) => {
    const g = play(g0, seq); if (!g || g.result || g.turn !== 'b') return false;
    const on = S => S.board.some(row => row.some(p => p && p.id === ids.pf35));
    const doomed = (S, n) => !on(S) || (n > 0 && BF.ai.expand(S).every(k => !on(k.S) || BF.ai.gen(k.S, true).some(it => {
      if (!it.q || it.q.id !== ids.pf35) return false;
      const r = BF.attempt(k.S, it.a); return !!r && !r.free && doomed(r.S, n - 1);
    })));
    return doomed(g.S, 3);
  },
  answer: [{ k: 'mv', from: [2, 1], to: [8, 1] }],
  bad: [{ k: 'mv', from: [2, 1], to: [7, 1] }],
});

// ===== 九、战略（2026-10-04 新增：电脑的四个战略缺口，第 36～41 题，现行规则） =====
// 出题和独立复核：工作流，每道题过三关（自检、深搜复核、对照）再由另一个代理挑错；8 道候选留下 6 道。
//   没收的两道：军功“这回合一分都别花”（第 10 回合的对照里答案不变，考不出“进账”）；楚方“宁丢一马不破釜”（有一种不吃子的破釜能躲开陷阱，标准答案不成立）。
//   考卷只当回归题（Fable 审查 2026-10-04）：这一类是故意让现在的电脑答不出的，不计入过闸门槛。
// ----- 缺口①：封锁期的账（不要为了躲破釜而躲）：第 36、37 题 -----
// 汉方电脑在搜索里把楚方的破釜沉舟当成随时会来的应着，看到“破釜能吃车”就躲；可破釜之后楚方三回合不能用兵种技能，
//   这几回合汉方的反击常常在电脑的搜索深度之外（地平线）。这类题考：破釜的威胁是真的，但楚真破釜就吃大亏，该做的事照做。
//   对照：同一局面把楚方破釜设为已用（used.art.b = 1），两版电脑都走标准答案——说明它们不走，是怕破釜。
//   注意：完全不提防破釜的电脑也会答对第 36、37 题，要和第 24 题（该躲就躲）一起看：算账的电脑两边都对。
const g1Val = { r: 9, c: 4.5, n: 4, e: 2, a: 2, p: 1, k: 0 };
const g1Mat = S => { let v = 0; for (const row of S.board) for (const p of row) if (p) v += (p.s === 'r' ? 1 : -1) * g1Val[p.t]; return v; };   // 汉方子力领先多少
const g1Up = S => { const out = [S]; if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const T = BF.ai.upgradeState(S, [f, r]); if (T) out.push(T); } } return out; };
// 汉走：两步之内能不能将死（楚方的应着全算：先升级、技能、兵法）
const g1Mate2 = S => g1Up(S).some(B => BF.ai.expand(B).some(k => {
  if (k.S.turn === S.turn) return false;
  const st = BF.evaluate(k.S); if (st.result) return st.result.winner === S.turn;
  const rs = g1Up(k.S).flatMap(C => [...BF.ai.expand(C), ...BF.ai.pofuPairs(C)]).filter(x => x.S.turn === S.turn);
  return rs.length > 0 && rs.every(x => { const s2 = BF.evaluate(x.S); return s2.result ? s2.result.winner === S.turn : mateInOne(x.S); });
}));
Q.push({
  name: '36 吃炮不怕破釜：护驾被封就闷杀', cat: '战略',
  desc: '楚的破釜沉舟还没用。汉车 (8,0) 可以白吃楚炮 (8,2)；可吃完之后，汉车停在 8 路、前面只隔着一个汉兵——楚能破釜沉舟：车先吃兵、再吃车。电脑怕这一下，宁可不吃。其实账要算到破釜之后：楚用了破釜，接下来三回合不能用技能。楚将被自己的两个士、两匹马围着（4 路那匹马被汉二级车钉住，走不开），平时汉马来将军，三级士「护驾」和将一换位就躲开了；封锁期里护驾用不了。汉马 (6,4)→(7,6)，下一步跳 (6,8) 或 (5,7) 将军，楚将都无路可走。楚只有一步：楚车走到 (8,8) 或 (5,2)，两格都看得住（马跳过来就吃，或者去挡马腿）。可这时汉手里正好 5 功（吃炮得 3 功，丢兵、丢车各补 1 功）：先把马升二级（2 血），再跳到楚车吃得着的那一格（车在 (8,8) 就跳 (6,8)，车在 (5,2) 就跳 (5,7)）——马正好挡住车去挡马腿的路，车吃马只打掉 1 血、被弹回，还是将死。（楚吃车也得了军功，就算把三级士升到四级，「铁甲禁卫」也没地方走——(3,8) 被自己的马占着，腾不出 (3,9) 给将。）所以楚真破釜就输棋，不破釜汉白赚一炮——该吃炮。判卷：楚炮被吃掉，而且楚方每一种破釜，要么占不到子力便宜，要么汉两步杀（汉可以先升级）。',
  build: () => { const C = P('b', 'c'); ids.q36 = C.id; return position([[4, 0, P('r', 'k')], [5, 0, P('r', 'a')], [4, 1, P('r', 'a')], [2, 0, P('r', 'e')], [4, 7, P('r', 'r', 2)], [6, 4, P('r', 'n')], [8, 0, P('r', 'r')], [8, 5, P('r', 'p')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a', 3)], [5, 9, P('b', 'a', 2)], [4, 8, P('b', 'n')], [3, 8, P('b', 'n', 2)], [8, 9, P('b', 'r')], [8, 2, C], [0, 6, P('b', 'p')]],
    { turn: 'r', cnt: { r: 12, b: 12 }, used: { art: { r: 1, b: 0 } } }); },
  check: (seq, g0) => {
    const m0 = g1Mat(g0.S);   // 开局时汉方的子力领先（play 会在 g0 上走棋，要先记下）
    const g = play(g0, seq); if (!g || g.result || g.turn !== 'b' || findId(g, ids.q36)) return false;
    return g1Up(g.S).flatMap(B => BF.ai.pofuPairs(B)).every(k => g1Mat(k.S) >= m0 || g1Mate2(k.S));
  },
  answer: [{ k: 'mv', from: [8, 0], to: [8, 2] }],
  bad: [{ k: 'mv', from: [4, 7], to: [3, 7] }],
});
// 用第 36 题定义的 g1Val / g1Mat / g1Up / g1Mate2（放在 36 题后面）。
// 注意：闷杀要靠汉方先升马（5 功）。汉方的功来自这一串：吃炮 3、兵过河 1、破釜里被吃兵和车各补 1 = 6。
//   改动击杀奖励、过河奖励、被吃补偿或马的升级价，使汉方凑不够 5 功，这题就不成立（--lint 会报“标准答案判卷判错”）。
Q.push({
  name: '37 先吃炮：破釜之后再防也来得及', cat: '战略',
  desc: '和上一题同一个楚将阵形（两个士、两匹马围着楚将，4 路的马被汉二级车钉住，三级士有「护驾」）。这回楚的破釜沉舟已经瞄着汉车了：楚车 (8,9) 先吃汉兵 (8,5)，再吃汉车 (8,2)。另一边楚炮冲到汉兵 (0,4) 面前，白给吃。电脑先防破釜：要么把马跳到 (7,6)（这样楚一破釜，汉马马上闷杀），要么把车躲开，这一步就没空吃炮了。其实不用先防，现在就吃炮。楚要是破釜吃车，接下来三回合不能用技能，护驾用不了。汉马这时再跳 (7,6)，准备下一步跳 (6,8) 或 (5,7) 闷杀。楚只有一步，最好的防法是把车退到 (8,8) 或 (5,2)：车站在那里，马跳到一个点它能吃，马跳到另一个点它能挡马腿。可是汉这时有 6 功（吃炮 3，兵过河 1，被吃的兵和车各补 1），可以先把马升到二级（2 血）再跳过去将军。楚车一下打不死它，被弹回去；马腿那格又在马身后，车过不去，照样闷杀。所以吃炮不光白赚一炮，还正好给闷杀攒够了军功。封锁期给汉方留出了时间：对付破釜的那步棋，可以等楚真破釜了再走。判卷：楚炮被吃掉，而且楚方每一种破釜，要么占不到子力便宜，要么汉两步杀。',
  build: () => { const C = P('b', 'c'); ids.q37 = C.id; return position([[4, 0, P('r', 'k')], [5, 0, P('r', 'a')], [4, 1, P('r', 'a')], [2, 0, P('r', 'e')], [4, 7, P('r', 'r', 2)], [6, 4, P('r', 'n')], [8, 2, P('r', 'r')], [8, 5, P('r', 'p')], [0, 4, P('r', 'p')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a', 3)], [5, 9, P('b', 'a', 2)], [4, 8, P('b', 'n')], [3, 8, P('b', 'n', 2)], [8, 9, P('b', 'r')], [0, 5, C]],
    { turn: 'r', cnt: { r: 12, b: 12 }, used: { art: { r: 1, b: 0 } } }); },
  check: (seq, g0) => {
    const m0 = g1Mat(g0.S);
    const g = play(g0, seq); if (!g || g.result || g.turn !== 'b' || findId(g, ids.q37)) return false;
    return g1Up(g.S).flatMap(B => BF.ai.pofuPairs(B)).every(k => g1Mat(k.S) >= m0 || g1Mate2(k.S));
  },
  answer: [{ k: 'mv', from: [0, 4], to: [0, 5] }],
  bad: [{ k: 'mv', from: [6, 4], to: [7, 6] }],
});
// ----- 缺口②：军功规划（第 16 回合起每回合 +1 功、上限 30、军功要算着花）：第 38 题 -----
// 电脑的搜索只在“对方应第一步”时考虑升级（upPly = 1），自己下一回合的升级它从来不算——所以“下回合进账就够升级绝杀”这种账它看不到。
//   三关：自检；深搜复核（标准答案必胜、错误示范只是多子）；对照（同一局面放到第 10 回合没有进账：汉 27 着、连升级共 208 种走法没有一种能两步杀，深搜也改吃炮）。
//   杀法用“三级车（3 血）贴脸、二级士（攻击 2）砍不死”：到了将死那一步，被杀的一方就算有 30 功、规则允许“先升级再应将”也解不了（升士到三级，护驾刚解锁要冷却）。
//   但被杀的一方在前一步若有 3 功以上，就能预先升士拿护驾（或 5 功升马到 2 血），两步杀就没了——所以题里楚方 0 功（最多 2 功都成立）。
// 走子方走完之后：对方不管怎么应（含先升级、兵种技能、兵法；不含不占行动的拒马），走子方下一步都能将死（含先升级）
const mateNext = (seq, g0) => {
  const me = g0.turn, g = play(g0, seq); if (!g) return false;
  if (g.result) return g.result.winner === me;
  const bases = [g.S]; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const T = BF.ai.upgradeState(g.S, [f, r]); if (T) bases.push(T); }
  const replies = bases.flatMap(B => [...BF.ai.expand(B), ...BF.ai.pofuPairs(B)]).filter(k => k.S.turn === me);
  return replies.length > 0 && replies.every(k => { const st = BF.evaluate(k.S); return st.result ? st.result.winner === me : mateInOne(k.S); });
};
// 第 38 题（汉走）；cnt 默认第 15 回合，对照用 { r: 9, b: 9 }（第 10 回合，没有回合进账）
const g2build = (cnt = { r: 14, b: 14 }) => () => position([
  [3, 0, P('r', 'k')], [4, 1, P('r', 'a')], [5, 0, P('r', 'a')], [2, 0, P('r', 'e')], [6, 0, P('r', 'e')], [1, 0, P('r', 'n')], [4, 4, P('r', 'r', 2)], [2, 3, P('r', 'p')], [6, 3, P('r', 'p')],
  [4, 9, P('b', 'k')], [3, 9, P('b', 'a', 2)], [5, 9, P('b', 'a', 2)], [4, 8, P('b', 'n')], [0, 9, P('b', 'r')], [8, 4, P('b', 'c')], [0, 6, P('b', 'p')], [2, 6, P('b', 'p')], [6, 6, P('b', 'p')]],
  { turn: 'r', cnt, merit: { r: 7, b: 0 }, used: { art: { r: 1, b: 1 } } });
Q.push({
  name: '38 进账前别把车调走', cat: '战略',
  desc: '第 15 回合，汉 7 功，楚 0 功。汉车已经是二级（2 血），在中路正对楚马：马一走开楚将就被车将军，所以马被牵住动不了；两个二级士（攻击 2）又被马挡着，楚将困在原位。车再升到三级（3 血）去吃马，就是贴脸将军：二级士一刀只砍 2 血、楚将只砍 1 血，都打不死它，将又没处躲——绝杀。升三级要 8 功，还差 1 功。这 1 功不用去挣：楚方这一步走完就进第 16 回合，从这回合起双方每回合各 +1 功，汉下回合正好 8 功。所以这一步一分功都别花（升什么都凑不够 8 功），车别离开中路，右边那门白送的楚炮也别吃——车一离开中路，马就不被牵了，楚方有两步时间把马挪开、把士垫到将前面，杀不成了。走一步不给楚方机会的闲着（比如车顺着中路顶到 (4,7)；但帅别上 (3,1)、右相别飞 (4,2)，那会让楚炮借机将军），下回合升车、吃马、绝杀。楚方 0 功，升不了马（5 功）也升不了三级士（3 功，三级士能“护驾”和将换位逃走），挡不住。（同一局面放到第 10 回合：没有回合进账，下回合还是 7 功，升不了车，那时就该吃炮。）判卷：汉走完之后，楚方不管怎么应，汉下一步都能将死（车往回退到 (4,3)、(4,2) 会让楚炮横过来垫一步，杀慢一步，不算对）。',
  build: g2build(),
  check: mateNext,
  answer: [{ k: 'mv', from: [4, 4], to: [4, 7] }],
  bad: [{ k: 'mv', from: [4, 4], to: [8, 4] }],
});
// ----- 缺口③：士象（电脑只在士、相 / 象被捉或被将军时才给它们升级，象从不出家门）：第 39、40 题 -----
// 两题都是“升级不占行动 + 四级被动技能升完当回合就能用”：花军功给守子升一级，这一手就赚一大笔；
//   电脑的升级候选里根本没有这种升法（没被捉的士象不升），默认把军功花在车上。和第 18 题成对：没用的时候别升士象，划算的时候要升。
//   对照：同一局面守子已经是四级、军功减去升级价，9ff64a4 和 b18c278 都 3/3 找得到；军功差 1 点升不起时，标准答案不成立。
//   深搜复核同意（标准答案 39：+18.7 对错误示范 −1.0；40：+14.9 对 +4.7）。
//   自对弈（标准答案 / 错误示范走完各 10 局，校尉档 2 万节点）：39 楚胜 9ff 8:1、b18c278 10:5；37 汉胜 9ff 10:6、b18c278 10:3。
Q.push({
  name: '39 升象践踏', cat: '战略',
  desc: '楚三级象守在家里 (4,7)。汉方过河兵 (6,5) 顶在河口，旁边挤着汉车、汉马、汉炮和另一个兵（都是一级；车马炮还在汉方这边的河沿上）。楚有 6 功。电脑的老习惯：军功先花在车上（升二级车、出车捉炮），士、象没被捉就不升，象也从不出家门。正确是升象：花 5 功把象升到四级，四级象的「践踏」是被动技能，升完当回合就能用——象出家门吃掉过河兵，落脚处一圈（隔着河也算）的汉车、汉马、汉炮、汉兵当场踩死，一步连杀五子，汉方只剩帅、士和一个兵。升车捉炮最多换一门炮，汉方这一大堆子还留在楚方门口。（汉方两个士是二级，只是让“升车去贴脸将军”这条路也走不通，和答案本身无关。）判卷：楚这一步走完，汉方至少少了 3 个子（升象后直接走、或用「飞越」吃兵都算对）。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a', 2)], [5, 0, P('r', 'a', 2)], [4, 3, P('r', 'p')], [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 6, P('b', 'p')],
    [4, 7, P('b', 'e', 3)], [6, 5, P('r', 'p')], [5, 4, P('r', 'n')], [6, 4, P('r', 'r')], [7, 4, P('r', 'c')], [7, 5, P('r', 'p')], [8, 9, P('b', 'r')]],
    { turn: 'b', merit: { r: 3, b: 6 }, cnt: { r: 12, b: 12 } }),   // 楚 6 功：车也升得起（不触发“给车攒军功”），挡住升象的只有“守子不升”这一条
  check: (seq, g0) => countDead(g0, seq, 'r') >= 3,
  answer: [{ k: 'up', at: [4, 7] }, { k: 'mv', from: [4, 7], to: [6, 5] }],
  bad: [{ k: 'up', at: [8, 9] }, { k: 'mv', from: [8, 9], to: [8, 4] }],
});
Q.push({
  name: '40 升士禁卫斩车', cat: '战略',
  desc: '楚二级车（2 血）钻进汉方九宫，站在 (4,2)：它把汉方三级士钉在帅前（士一斜走开，帅就被将），同时顺着横线捉着 (0,2) 的汉车。汉车横过来打它，只能打掉 1 血、还被弹回，楚车下一步就跑了。三级士的攻击已经是 2，砍得死它，可士平时只能斜着走，够不着正前方这一格。汉有 6 功，电脑只会想到升车保车（升了车攻击还是 1，照样打不死）——没被捉的士它根本不考虑升。正确是花 4 功把这个士升到四级：四级士的「铁甲禁卫」是被动技能，升完当回合就能在九宫里上下左右走一格——士往前一步，一刀砍死楚车，汉车也就不用保了。判卷：汉这一步走完，楚车没了（全部 55 种走法里只有这一种做得到）。',
  build: () => { const R = P('b', 'r', 2); ids.g40 = R.id; return position([[4, 0, P('r', 'k')], [4, 1, P('r', 'a', 3)], [5, 0, P('r', 'a')], [0, 2, P('r', 'r')], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')],
    [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [4, 2, R], [0, 6, P('b', 'p')], [4, 6, P('b', 'p')], [8, 6, P('b', 'p')], [7, 7, P('b', 'n')]],
    { turn: 'r', merit: { r: 6, b: 2 }, cnt: { r: 12, b: 12 } }); },
  check: (seq, g0) => allDead(g0, seq, [ids.g40]),
  answer: [{ k: 'up', at: [4, 1] }, { k: 'mv', from: [4, 1], to: [4, 2] }],
  bad: [{ k: 'up', at: [0, 2] }, { k: 'mv', from: [0, 2], to: [4, 2] }],
});
// ----- 缺口④：引破釜（故意给楚方一个破釜沉舟的“甜头”，楚一破釜就在封锁期里反杀）：第 41 题 -----
// 现行规则：破釜那一回合起楚方三回合不能用兵种主动技能（护驾、冲阵、踏营、霹雳、飞越、拒马），升级和被动技能照常。
//   第 41 题汉方下饵（电脑怕破釜，不敢下）。原来配对的“楚方识破、拒绝破釜”那题复核没过（有一种不吃子的破釜能躲开），没收。
//   杀法只有一个：楚三级士的「护驾」平时能救将，封锁期里用不了——汉二级车 (4,4)→(3,4)→(3,9) 贴脸将军，
//   两点血的车楚将、士都砍不死，楚士又被“将帅对面”钉在 (4,8)（它一走开，帅将就照面）。第一步是安静的一步，
//   校尉档电脑算破釜时，破釜之后只再往下看一两步（加吃子搜索），将军延伸也帮不上，看不到这一杀（地平线）。
//   对照：① 楚破釜已用（used.art.b = 1），两版电脑都走第 41 题的标准答案；② 把封锁去掉（skillLockRounds = 0），
//   楚吃车的两种破釜之后汉方三步内都杀不了，第 41 题的标准答案就被破釜驳倒——考的正是封锁期的账。
const g4Val = { r: 9, c: 4.5, n: 4, e: 2, a: 2, p: 1, k: 0 };
const g4On = (S, id) => S.board.some(row => row.some(p => p && p.id === id));
const g4Mat = S => { let v = 0; for (const row of S.board) for (const p of row) if (p) v += (p.s === 'r' ? 1 : -1) * g4Val[p.t]; return v; };   // 汉方子力领先多少
const g4Up = S => { const out = [S]; if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const T = BF.ai.upgradeState(S, [f, r]); if (T) out.push(T); } } return out; };
// 走子方能白吃到的最大的车马炮（吃完之后对方含先升级的所有应着都打不死吃子的那枚）值多少
const g4Grab = S => {
  let best = 0;
  for (const it of BF.ai.gen(S, true)) {
    if (!it.q || !'rnc'.includes(it.q.t) || g4Val[it.q.t] <= best) continue;
    const r = BF.attempt(S, it.a); if (!r || r.free || g4On(r.S, it.q.id) || !g4On(r.S, it.p.id)) continue;
    if (!g4Up(r.S).some(B => BF.ai.expand(B).some(x => !g4On(x.S, it.p.id)))) best = g4Val[it.q.t];
  }
  return best;
};
// 汉走：两步之内能不能将死（楚方的应着全算：先升级、技能、兵法、破釜）
const g4Mate2 = S => g4Up(S).some(B => BF.ai.expand(B).some(k => {
  if (k.S.turn === S.turn) return false;
  const st = BF.evaluate(k.S); if (st.result) return st.result.winner === S.turn;
  const rs = g4Up(k.S).flatMap(C => [...BF.ai.expand(C), ...BF.ai.pofuPairs(C)]).filter(x => x.S.turn === S.turn);
  return rs.length > 0 && rs.every(x => { const s2 = BF.evaluate(x.S); return s2.result ? s2.result.winner === S.turn : mateInOne(x.S); });
}));
// 摆法；rook = 汉方一级车的位置（第 41 题在 (2,3)）
const g4Build = (rook, turn) => () => { const R = P('b', 'r'); ids.g4 = { R: R.id }; return position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [4, 4, P('r', 'r', 2)], [rook[0], rook[1], P('r', 'r')], [6, 4, P('r', 'p')],
  [4, 9, P('b', 'k')], [5, 9, P('b', 'a', 3)], [4, 8, P('b', 'a')], [6, 8, R], [8, 5, P('b', 'n')], [8, 7, P('b', 'n')], [0, 6, P('b', 'p')], [2, 6, P('b', 'p')], [6, 6, P('b', 'p')]],
  { turn, cnt: { r: 12, b: 12 }, used: { art: { r: 1, b: 0 } } }); };
Q.push({
  name: '41 引破釜：车捉双马，饵就是车', cat: '战略',
  desc: '楚的破釜沉舟还没用；双方都没有军功（楚升不了马——二级马要 5 功，马升成两血汉车就吃不动了）。楚两匹马都站在 8 路上（(8,5) 和 (8,7)），汉车从 (2,3) 平到 (8,3)，一车串打两马：楚正常走只能救一匹。楚唯一“两全”的办法是破釜沉舟——(8,5) 的马先吃掉 (6,4) 的汉兵、再跳到 (8,3) 吃掉汉车（另一匹马连跳两步也能吃车），看着反赚一车。电脑怕这一下，宁可去吃 (2,6) 的小卒。其实这一步就是给楚下的饵：楚一破釜，接下来三回合不能用技能，三级士的「护驾」也用不了；汉二级车 (4,4) 平到 (3,4)，下一步冲到 (3,9) 贴脸将军——两点血的车，楚将一刀砍不死；楚士又被“将帅对面”钉在 (4,8)：它一离开，帅将就照面，所以楚吃车得了军功、把这个士升到二级（攻击 2）也砍不了，绝杀。楚要是破釜不吃车、只把两匹马挪走（或把车调过来保马），技能照样封三回合，汉车照样 (4,4)→(3,4) 来贴脸，多数走法汉两步就杀，剩下几种楚也只能拿车回来挡，比丢一匹马还难受。楚不破釜，就白丢一匹马。判卷：汉走完之后，楚方不管正常应还是吃子的破釜（都算上先升级），汉方要么两步杀，要么净赚至少一匹马。',
  // 判卷只列吃子的破釜（BF.ai.pofuPairs）。引擎还允许两步都不吃子的破釜：保住两马的 14 种里 12 种汉两步杀；
  //   另 2 种（楚车 6,8→7,8→7,5 / 6,8→5,8→5,5 护马）汉没有两步杀（车 4,4→3,4 之后楚车回 (3,5)/(4,5) 挡，或去吃 (5,0) 士），但霸王档 8 秒深搜汉方 +6.9 / +6.8，比楚认亏一马（+3.8）还差。
  build: g4Build([2, 3], 'r'),
  check: (seq, g0) => {
    const m0 = g4Mat(g0.S);   // 先记下（play 会在 g0 上走棋）
    const g = play(g0, seq); if (!g || g.result || g.turn !== 'b') return false;
    const gain = S => g4Mat(S) + g4Grab(S) >= m0 + 2.5;   // 楚应完、汉再白吃一子之后，汉方净赚至少一匹马（减去可能丢的一个兵）
    if (!g4Up(g.S).flatMap(B => BF.ai.expand(B)).filter(k => k.S.turn === 'r').every(k => gain(k.S))) return false;
    return g4Up(g.S).flatMap(B => BF.ai.pofuPairs(B)).every(k => gain(k.S) || g4Mate2(k.S));
  },
  answer: [{ k: 'mv', from: [2, 3], to: [8, 3] }],
  bad: [{ k: 'mv', from: [2, 3], to: [2, 6] }],
});

// ---------- 自检：考题本身摆得对不对 ----------
// 每道题按自己的规则出（改的是全局 BF.CFG 的背水 / r6 开关，引擎和电脑都看它）：
//   实战题用收题时记下的 rules；其余的题都是破釜时代、旧数值（2026-10-03～04）出的，固定在背水关、r6 关——
//   引擎默认先后换成了背水（10-05）和 r6（10-05 晚），不固定的话这些题的局面、价钱、血量都不是出题时的样子。r6 的新题以后另出、写明 rules。
const EXAM_RULES = { bs: false, r6: false };
{
  const { applyRules } = require('./game_load.js');
  for (const q of Q) { const b = q.build; q.build = () => { applyRules(q.rules || EXAM_RULES); return b(); }; }
}
async function lint() {
  let bad = 0;
  for (const q of Q) {
    if (q.disabled) { console.log(`－ ${q.name}  停用：${q.disabled}`); continue; }
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
      if (!q.answer && q.cat !== '实战') errs.push('没有标准答案');
      else if (q.answer) {
        const seq = q.answer.map(a => JSON.parse(JSON.stringify(a)));
        pid = 500; if (!play(q.build(), seq)) errs.push('标准答案不合法 ' + JSON.stringify(q.answer));
        else { pid = 500; if (!(await q.check(seq, q.build()))) errs.push('标准答案判卷判错'); }
      }
      if (q.bad) { pid = 500; const gC = q.build(); if (await q.check(q.bad, gC)) errs.push('错误示范判卷判对'); }
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
  { const ns = parseNodes(opt.nodes); if (ns) AI.LEVELS.verify.nodes = ns.verify || ns.hard || ns['*']; }   // 复核按节点数时，用 verify= 或 hard= 的数（给大一点，比如考生的 5 倍以上）
  const list = (opt.only ? Q.filter(q => q.name.includes(opt.only) || q.cat === opt.only) : Q).filter(q => !q.multi && !q.disabled);
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
    const deepPass = !!(await q.check(seq, gC));
    const ans = q.answer ? await valueOf(q, q.answer) : null;
    const bad = q.bad ? await valueOf(q, q.bad) : null;
    const fmt = x => (x == null ? '—' : (Math.abs(x) > 4000 ? (x > 0 ? '必胜' : '必败') : x.toFixed(2)));
    // 不同意：深搜的着法判卷判错，且深搜认为它比标准答案好出 0.5 分以上；或者错误示范反而比标准答案好
    const worse = ans && ans.v != null && vDeep - ans.v > 0.5;
    const badBetter = ans && bad && ans.v != null && bad.v != null && bad.v >= ans.v - 0.1;
    const better = ans && ans.v != null && ans.v - vDeep > 0.5;
    const verdict = deepPass ? '✓ 深搜同意' : worse ? '⚠ 深搜不同意（深搜的着法判错，且它认为比标准答案好）'
      : better ? '✓ 标准答案比深搜自己走的更好（深搜没找到——这正是要考的毛病）' : '△ 深搜走了别的，但认为和标准答案差不多（判卷可能太严，或深搜还不够深）';
    if (!q.adjudicated && !deepPass && worse) disputed++;
    if (!q.adjudicated && badBetter) disputed++;
    console.log(`【${q.name}】${verdict}${badBetter ? '  ⚠ 错误示范不比标准答案差' : ''}${q.adjudicated ? '\n   （已裁决：' + q.adjudicated + '）' : ''}`);
    console.log(`   深搜走：${seq.map(a => desc(g0.S, a)).join(' + ')}（${fmt(vDeep)}，${L.depth} 层）`);
    if (ans) console.log(`   标准答案：${q.answer.map(a => desc(g0.S, a)).join(' + ')} → ${fmt(ans.v)}${ans.note ? '（' + ans.note + '）' : ''}`);
    if (bad) console.log(`   错误示范：${q.bad.map(a => desc(g0.S, a)).join(' + ')} → ${fmt(bad.v)}${bad.note ? '（' + bad.note + '）' : ''}`);
  }
  console.log(disputed ? `\n${disputed} 处需要人裁决` : '\n深搜全部同意');
}

// ---------- 开考 ----------
(async () => {
  if (opt.lint) return await lint();
  if (opt.verify) return verify();
  const list = (opt.only ? Q.filter(q => q.name.includes(opt.only) || q.cat === opt.only) : Q).filter(q => !q.disabled);
  for (const q of Q) if (q.disabled) console.log(`（停用：${q.name}——${q.disabled}）`);
  const AIs = opt.files.map(f => ({ file: f, AI: require(path.resolve(__dirname, '..', f)) }));
  for (const { AI } of AIs) applyNodes(AI.LEVELS, parseNodes(opt.nodes));
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
          pass = !!(await q.check(seq, g0));
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
