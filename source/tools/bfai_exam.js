// 技能模式电脑「智商考卷」（除第 6 题外，汉方走的题都把楚方破釜沉舟设为已用，一题只考一个机制）：一组摆好的局面，专考这套棋特有的机制（血量、打不死就弹回、升级不占行动、兵法时机）
// 用法：node tools/bfai_exam.js [电脑文件...] [--level mid] [--runs 3] [--verbose]
//   默认考 src/bfai.js（游戏里现用的）；可以一次给几个文件对比（比如 git show 出来的旧版本）。
//   每题按不同随机种子考 --runs 次，答对的次数记分。
'use strict';
const path = require('path');
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');

const argv = process.argv.slice(2);
const opt = { level: 'mid', runs: 3, verbose: false, files: [] };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--level') opt.level = argv[++i];
  else if (argv[i] === '--runs') opt.runs = +argv[++i];
  else if (argv[i] === '--verbose') opt.verbose = true;
  else opt.files.push(argv[i]);
}
if (!opt.files.length) opt.files = ['src/bfai.js'];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let pid = 500;
const P = (s, t, lv = 1) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0 });
const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
// 摆局面：pieces = [[f, r, piece]...]；f 0～8 从左到右，r 0～9 从汉方底线到楚方底线
function position(pieces, o = {}) {
  const g = new BF.Game();
  g.setup(T => {
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) T.board[r][f] = null;
    for (const [f, r, p] of pieces) T.board[r][f] = p;
    T.turn = o.turn || 'r';
    T.merit = { r: 0, b: 0, ...(o.merit || {}) };
    if (o.cnt) T.cnt = { ...o.cnt };
    if (o.dead) T.dead = { r: [], b: [], ...o.dead };
    if (o.used) T.used = { art: { r: 0, b: 0, ...(o.used.art || {}) }, ult: { r: 0, b: 0, ...(o.used.ult || {}) } };
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
const desc = (S, a) => {
  if (a.k === 'up') { const p = S.board[a.at[1]][a.at[0]]; return `升${p ? N[p.t] : '?'}(${a.at})`; }
  if (a.k === 'mv') { const p = S.board[a.from[1]][a.from[0]], q = S.board[a.to[1]][a.to[0]]; return `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  if (a.k === 'art') return a.steps ? '破釜沉舟[' + a.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回良将';
  if (a.k === 'ult') return '终极兵法';
  if (a.k === 'sk') return '技能' + (a.sk || '') + '@' + a.at + (a.to ? '→' + a.to : '');
  return JSON.stringify(a);
};
// 执行电脑给的一串行动，返回执行后的对局（失败返回 null）
function play(g, seq) { for (const a of seq) if (!g.apply(a)) return null; return g; }
const findId = (g, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.board[r][f]; if (p && p.id === id) return [f, r]; } return null; };
// 走子方能打到这枚子吗（打得死才算）
const killable = (S, id) => BF.ai.gen(S, true).some(it => it.q && it.q.id === id && it.q.hp <= (it.sk === 'qishe' || it.sk === 'chongzhen' ? 1 : BF.ai.atk(it.p)));

// ---------- 考题 ----------
// 每题：build() 摆局面；check(seq, g0) → true / false（g0 是摆好的局面，check 里可自行复制推演）
const Q = [];

Q.push({
  name: '1 先升级再吃',
  desc: '汉车能吃楚炮，但楚车在后面保着。汉有 6 功：先把车升二级（2 血）再吃，楚车回吃只能打掉 1 血、被弹回——白赚一炮。',
  build: () => position([[5, 0, P('r', 'k')], [0, 3, P('r', 'r')], [6, 3, P('r', 'p')], [4, 9, P('b', 'k')], [4, 8, P('b', 'a')], [0, 7, P('b', 'c')], [0, 9, P('b', 'r')], [6, 6, P('b', 'p')]], { merit: { r: 6 }, used: { art: { b: 1 } } }),
  check: seq => seq.some(a => a.k === 'up' && a.at[0] === 0 && a.at[1] === 3) && seq.some(a => a.k === 'mv' && a.from[0] === 0 && a.from[1] === 3 && a.to[0] === 0 && a.to[1] === 7),
});

{
  let cid;
  Q.push({
    name: '2 看穿对方先升级再吃',
    desc: '汉炮被楚车盯着，有汉车横向保护。楚有 6 功，可以先升车（2 血）再吃炮，汉车回吃打不死——汉炮得赶紧躲开。汉车边上有个白吃的卒是诱饵。',
    build: () => { const c = P('r', 'c'); cid = c.id; return position([[3, 0, P('r', 'k')], [0, 4, P('r', 'r')], [2, 4, c], [6, 3, P('r', 'p')], [5, 9, P('b', 'k')], [2, 8, P('b', 'r')], [0, 6, P('b', 'p')], [6, 6, P('b', 'p')], [8, 6, P('b', 'p')]], { merit: { b: 6 }, used: { art: { b: 1 } } }); },
    check: (seq, g0) => { const g = play(g0, seq); if (!g) return false; return !!findId(g, cid) && !killable(g.S, cid); },
  });
}

Q.push({
  name: '3 升级保命',
  desc: '汉车困在角上被楚马盯住，走不掉也挡不住马腿。汉有 6 功：给车升二级（2 血），马踏过来只扣 1 血、被弹回。',
  build: () => position([[4, 0, P('r', 'k')], [0, 0, P('r', 'r')], [1, 0, P('r', 'n')], [0, 1, P('r', 'p')], [6, 3, P('r', 'p')], [3, 9, P('b', 'k')], [1, 2, P('b', 'n')], [6, 6, P('b', 'p')]], { merit: { r: 6 }, used: { art: { b: 1 } } }),
  check: seq => seq.some(a => a.k === 'up' && a.at[0] === 0 && a.at[1] === 0),
});

Q.push({
  name: '4 开局不乱升相士',
  desc: '从开局双方各走 4 步（电脑对电脑）：相、士是守家的子，没被捉时花军功升它们是浪费，军功该留给车马炮、靠吃子攒（被捉住时升级保命不算错）。',
  multi: true,
  build: () => new BF.Game(),
  // 自己对弈 8 步，看有没有人升相 / 士
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
  name: '5a 只死了马：留着召回',
  desc: '开局汉方丢了一匹马，两个车都在（楚方破釜沉舟已用，只考召回本身）。召回良将一局只有一次，该留着等车阵亡再用，不该拿来复活一匹马。',
  build: () => fromStart({ remove: [[1, 0]], used: { art: { b: 1 } } }),
  check: seq => !seq.some(a => a.k === 'art'),
});

// 第 5b～5d 题：车阵亡后要不要马上召回，看局面（楚方破釜沉舟都设为已用，只考召回的时机）
//   底子：双方士、将帅、几个兵（4 路、8 路有兵隔着：将帅不照面，双方右车也不对吃）；汉方左车（开局 id 0，原位 (0,0)）已阵亡、原位空着
const deadRook = (extra, o = {}) => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [1, 0, P('r', 'n')], [8, 0, P('r', 'r')], [2, 3, P('r', 'p')], [4, 3, P('r', 'p')], [6, 3, P('r', 'p')], [8, 3, P('r', 'p')],
  [4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [8, 9, P('b', 'r')], [2, 6, P('b', 'p')], [4, 6, P('b', 'p')], [6, 6, P('b', 'p')], [8, 6, P('b', 'p')], ...extra],
  { dead: { r: [{ id: 0, t: 'r', s: 'r' }] }, used: { art: { b: 1 } }, ...o });
const revives = seq => seq.some(a => a.k === 'art' && a.id === 0);

Q.push({
  name: '5b 车阵亡：该马上召回',
  desc: '局面平静，楚炮从 0 路直插下来，随时能占住汉车原位（占住就召不回来了）；车召回来正好顺着 0 路捉这门炮。该马上召回。',
  build: () => deadRook([[0, 6, P('b', 'c')]]),
  check: seq => revives(seq),
});

Q.push({
  name: '5c 车阵亡：先办急事',
  desc: '汉车阵亡、原位安全，但楚车挂在汉炮口上（白吃一车）。召回不会跑，先吃车。',
  build: () => deadRook([[7, 2, P('r', 'c')], [7, 5, P('b', 'p')], [7, 7, P('b', 'r')]]),
  check: seq => seq.some(a => a.k === 'mv' && a.from[0] === 7 && a.from[1] === 2 && a.to[0] === 7 && a.to[1] === 7),
});

Q.push({
  name: '5d 车阵亡：召回就被吃',
  desc: '楚车正对着汉车原位（0 路一路空着），车一召回来就被吃掉、汉方没子能回吃——这一次召回就白送了。先别召回。',
  build: () => deadRook([[0, 7, P('b', 'r')]]),
  check: seq => !revives(seq),
});

{
  let rid;
  Q.push({
    name: '6 防破釜沉舟',
    desc: '汉车和楚车隔着一个汉兵对着。楚还有破釜沉舟：先吃兵、再吃车（连走两步，汉来不及回吃）。旁边有个白吃的卒是诱饵——汉车得先离开这条线。',
    build: () => { const R = P('r', 'r'); rid = R.id; return position([[3, 0, P('r', 'k')], [6, 4, R], [6, 6, P('r', 'p')], [0, 2, P('r', 'c')], [0, 3, P('r', 'p')], [4, 9, P('b', 'k')], [4, 8, P('b', 'a')], [4, 6, P('b', 'p')], [6, 8, P('b', 'r')], [0, 6, P('b', 'p')], [2, 6, P('b', 'p')]]); },
    check: (seq, g0) => {
      const g = play(g0, seq); if (!g || !findId(g, rid)) return false;
      if (killable(g.S, rid)) return false;
      return !BF.ai.pofuPairs(g.S).some(x => x.ev.some(e => e.e === 'kill' && e.id === rid));
    },
  });
}

Q.push({
  name: '7 吃子攒军功',
  desc: '汉马可以白吃楚马。前期军功只能靠吃子来：该吃，而且不该先花军功升相、士。',
  build: () => position([[4, 0, P('r', 'k')], [2, 3, P('r', 'n')], [2, 0, P('r', 'e')], [3, 0, P('r', 'a')], [6, 3, P('r', 'p')], [3, 9, P('b', 'k')], [3, 5, P('b', 'n')], [6, 6, P('b', 'p')], [8, 6, P('b', 'p')]], { merit: { r: 3 }, used: { art: { b: 1 } } }),
  check: seq => seq.some(a => a.k === 'mv' && a.from[0] === 2 && a.from[1] === 3 && a.to[0] === 3 && a.to[1] === 5) && !seq.some(a => a.k === 'up' && ((a.at[0] === 2 && a.at[1] === 0) || (a.at[0] === 3 && a.at[1] === 0))),
});

Q.push({
  name: '8 打不死就弹回',
  desc: '汉车能“攻击”楚方二级马（2 血，只能打掉 1 血、车弹回），汉炮能真正吃掉楚方一级炮。该吃炮。',
  build: () => position([[3, 0, P('r', 'k')], [7, 0, P('r', 'r')], [1, 2, P('r', 'c')], [5, 3, P('r', 'p')], [4, 9, P('b', 'k')], [7, 6, P('b', 'n', 2)], [1, 5, P('b', 'p')], [1, 7, P('b', 'c')], [5, 6, P('b', 'p')]], { used: { art: { b: 1 } } }),
  check: seq => seq.some(a => a.k === 'mv' && a.from[0] === 1 && a.from[1] === 2 && a.to[0] === 1 && a.to[1] === 7),
});

Q.push({
  name: '9a 鸿门宴不白放',
  desc: '楚有 20 功、鸿门宴没用，但楚军没有一个进攻子靠近汉帅：现在放鸿门宴（汉帅三回合不能动）毫无用处，20 功白花。',
  build: () => position([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')], [4, 9, P('b', 'k')], [0, 9, P('b', 'r')], [1, 9, P('b', 'n')], [0, 6, P('b', 'p')], [4, 6, P('b', 'p')]], { turn: 'b', merit: { b: 20 } }),
  check: seq => !seq.some(a => a.k === 'ult'),
});

Q.push({
  name: '9b 鸿门宴绝杀',
  desc: '汉帅身边没有士相，楚车只差一步就能沿底线将军；平时汉帅往上一闪就躲掉了。放鸿门宴（汉帅三回合不能动），下一步车沉底就是绝杀。',
  build: () => position([[4, 0, P('r', 'k')], [0, 6, P('r', 'p')], [2, 6, P('r', 'p')], [3, 9, P('b', 'k')], [8, 5, P('b', 'r')], [6, 6, P('b', 'p')]], { turn: 'b', merit: { b: 20 } }),
  check: seq => seq.some(a => a.k === 'ult'),
});

{
  let rid;
  Q.push({
    name: '10 破釜沉舟杀车',
    desc: '汉车有马保护，楚车直接吃就是一换一。汉方召回良将已经用掉，楚还有破釜沉舟：第一步吃车，第二步撤回安全地方——白杀一车。',
    build: () => { const R = P('r', 'r'); rid = R.id; return position([[3, 0, P('r', 'k')], [2, 4, R], [1, 2, P('r', 'n')], [6, 3, P('r', 'p')], [4, 9, P('b', 'k')], [2, 8, P('b', 'r')], [6, 6, P('b', 'p')], [0, 6, P('b', 'p')]], { turn: 'b', used: { art: { r: 1 } } }); },
    check: (seq, g0) => { const g = play(g0, seq); if (!g) return false; return !findId(g, rid) && g.board.flat().some(p => p && p.s === 'b' && p.t === 'r'); },
  });
}

// ---------- 开考 ----------
(async () => {
  const AIs = opt.files.map(f => ({ file: f, AI: require(path.resolve(__dirname, '..', f)) }));
  const score = AIs.map(() => 0);
  const rows = [];
  for (const q of Q) {
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
          if (opt.verbose && AI.think.last) note += `  （前几名：${AI.think.last.top.slice(0, 4).map(([a, v]) => (a.k === 'up' && a.then ? desc(g0.S, a) + '+' + desc(g0.S, a.then) : desc(g0.S, a)) + ' ' + v).join(' | ')}）`;
          pass = !!q.check(seq, g0);
        }
        if (pass) ok++;
        notes.push((pass ? '✓ ' : '✗ ') + note);
      }
      score[ai] += ok;
      row.cells.push({ ok, notes });
    }
    rows.push(row);
    console.log(`\n【${q.name}】${q.desc}`);
    row.cells.forEach((c, i) => { console.log(`  ${AIs[i].file}: ${c.ok}/${opt.runs}`); for (const n of [...new Set(c.notes)]) console.log('     ' + n); });
  }
  console.log('\n总分（每题 ' + opt.runs + ' 次）：' + AIs.map((a, i) => `${a.file} ${score[i]}/${Q.length * opt.runs}`).join('   '));
})().catch(e => { console.error(e); process.exit(1); });
