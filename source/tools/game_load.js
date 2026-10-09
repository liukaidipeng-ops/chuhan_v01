// 把游戏里「导出本局」的文本还原成局面：node tools/game_load.js 文件.txt [--at N] [--all]
//   不带参数：打印终局（或当前）局面；--at N：打印走完第 N 条行动后的局面；--all：每一步都打印
//   文件里只要有 ---DATA--- 之后那一行 JSON 就行（前面的棋谱是给人看的）。也可以从标准输入读：pbpaste | node tools/game_load.js -
// 在别的脚本里用：const { load } = require('./game_load.js'); const { game, data, rules } = load(text, n);（rules：这局用的规则，自动判断，见 detectRules）
'use strict';
const fs = require('fs');
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
const XQ = global.XQ;
const NAME = { r: { k: '帥', a: '仕', e: '相', n: '傌', r: '俥', c: '炮', p: '兵' }, b: { k: '將', a: '士', e: '象', n: '馬', r: '車', c: '砲', p: '卒' } };

function parse(text) {
  const i = text.indexOf('---DATA---');
  const raw = (i >= 0 ? text.slice(i + 10) : text).trim();
  const j = raw.indexOf('{');
  return JSON.parse(raw.slice(j));
}
// 这局用的是哪套规则：bs = 背水一战（2026-10-05 起默认开，之前是破釜沉舟），r6 = 试行规则（?r6=1）。
//   导出里记了 opts.bs / opts.r6 就照它（TD 的导出从 C53 起才记）；没记的按顺序试：现行默认 → 背水关（破釜时代的对局）→ r6 开，
//   取第一套能把整局重放完、结局也对得上的。applyRules 改的是全局 BF.CFG（引擎、电脑都看它），用完要恢复的请调 applyRules(null)。
const DEFAULT_RULES = { bs: !!(BF.CFG.beishui && BF.CFG.beishui.on), r6: !!(BF.CFG.r6 && BF.CFG.r6.on) };
// 规则年代（era）：2026-10-09 起 Ham 一天改好几次规则，老对局要按当时的数值才重放得了（导出里没记这些）。
//   now = 现在的引擎默认；h51 = 拒马二级、管两回合、冷却 2、能动、反伤炮（H51～H55 之间）；h50 = 拒马三级、管一回合（H51 之前，象已经攻击 2）；
//   pre = 再往前：象攻击 1、第 16 回合起才每回合进账、没有第三阶段。“升了级能解将不算将死”（H52）是代码，退不回去——老对局最后一步的结局可能对不上，见 detectRules
const J0 = BF.CFG.skills && BF.CFG.skills.juma ? JSON.parse(JSON.stringify(BF.CFG.skills.juma)) : null;
const AE0 = BF.CFG.attack && BF.CFG.attack.e ? BF.CFG.attack.e.slice() : undefined;
const M0 = BF.CFG.merit ? { from: BF.CFG.merit.autoIncomeFromRound, p3: BF.CFG.merit.phase3FromRound } : null;
const ERAS = {
  now: () => {},
  h51: J => Object.assign(J, { level: 2, cooldown: 2, duration: 2, rooted: false, counterCannon: true }),
  h50: J => { Object.assign(J, { cooldown: 2, duration: 1, rooted: false, counterCannon: true }); delete J.level; },
  pre: J => { Object.assign(J, { cooldown: 2, duration: 1, rooted: false, counterCannon: true }); delete J.level; if (BF.CFG.attack) delete BF.CFG.attack.e; if (BF.CFG.merit) { BF.CFG.merit.autoIncomeFromRound = 16; BF.CFG.merit.phase3FromRound = 0; } },
};
function applyRules(r) {
  const x = { ...DEFAULT_RULES, ...(r || {}) };
  if (BF.CFG.beishui) BF.CFG.beishui.on = !!x.bs;
  if (BF.CFG.r6) BF.CFG.r6.on = !!x.r6;
  if (J0) { const J = BF.CFG.skills.juma; for (const k of Object.keys(J)) delete J[k]; Object.assign(J, JSON.parse(JSON.stringify(J0))); }
  if (BF.CFG.attack) { if (AE0) BF.CFG.attack.e = AE0.slice(); else delete BF.CFG.attack.e; }
  if (M0) { BF.CFG.merit.autoIncomeFromRound = M0.from; BF.CFG.merit.phase3FromRound = M0.p3; }
  if (x.era && x.era !== 'now' && J0) ERAS[x.era](BF.CFG.skills.juma);
  return x;
}
function replayBF(data, n) {
  const game = new BF.Game();
  if (data.base) game.reset(data.base);
  const es = data.entries || [];
  for (let k = 0; k < (n == null ? es.length : Math.min(n, es.length)); k++) if (!game.apply(es[k])) throw new Error('第 ' + (k + 1) + ' 条行动重放失败：' + JSON.stringify(es[k]));
  return game;
}
function detectRules(data) {
  const o = data.opts || {};
  const base = ('bs' in o || 'r6' in o) ? [{ bs: !!o.bs, r6: !!o.r6 }] : [{}, { bs: false }].concat(BF.CFG.r6 ? [{ r6: true }] : []);
  const tries = []; for (const era of Object.keys(ERAS)) for (const b of base) tries.push({ ...b, era });
  let err = null, loose = null;
  for (const r of tries) {
    applyRules(r);
    try {
      const g = replayBF(data);
      const want = data.result, got = g.result;
      if (want && (!got || got.winner !== want.winner || got.reason !== want.reason)) { err = new Error('结局对不上'); if (!loose) loose = r; continue; }
      return { ...DEFAULT_RULES, ...r };   // 写成明确的值：以后默认规则变了（比如 r6 默认打开），存下来的题照旧按当时的规则出
    } catch (e) { err = e; }
  }
  // 整局重放得完、只是结局对不上（多半是 H52“升了级能解将”：当年判了将死，现在的引擎不判）：也能用，局面都是对的
  if (loose) { applyRules(loose); return { ...DEFAULT_RULES, ...loose }; }
  applyRules(null);
  throw err || new Error('哪套规则都重放不了');
}
// n：只重放前 n 条（缺省 = 全部）；rules：指定规则（缺省 = 自动判断，见上）。返回的 rules 是实际用的那套，BF.CFG 留在那套规则上
function load(text, n, rules) {
  const data = typeof text === 'string' ? parse(text) : text;
  let game, used = null;
  if (data.kind === 'bf') {
    used = rules || detectRules(data);
    applyRules(used);
    game = replayBF(data, n);
  } else {
    game = data.kind === 'jq' ? new XQ.Game({ jq: 1, layout: data.layout }) : new XQ.Game();
    const ms = data.moves || [];
    for (let k = 0; k < (n == null ? ms.length : Math.min(n, ms.length)); k++) if (!game.play(ms[k])) throw new Error('第 ' + (k + 1) + ' 步重放失败：' + JSON.stringify(ms[k]));
  }
  return { game, data, rules: used };
}
const rulesText = r => (r ? [r.bs === false ? '破釜沉舟（背水关）' : r.bs ? '背水一战' : '', r.r6 ? '试行规则 r6' : ''].filter(Boolean).join(' + ') || '现行默认' : '');
// 棋盘画成文字：楚（黑）在上、汉（红）在下；技能模式里每枚子后面标 等级/血量
function draw(game) {
  const out = [];
  out.push('    ' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(f => String(f).padEnd(5)).join(''));
  for (let r = 9; r >= 0; r--) {
    let line = String(r).padStart(2) + '  ';
    for (let f = 0; f < 9; f++) {
      const p = game.board[r][f];
      if (!p) { line += '·    '; continue; }
      const nm = p.h ? '暗' : NAME[p.s][p.t];
      line += (p.s === 'r' ? nm : '[' + nm + ']').padEnd(p.s === 'r' ? 1 : 3) + (game.bf ? (p.t === 'k' && !p.w ? '' : p.lv + '/' + p.hp) : '').padEnd(p.s === 'r' ? 3 : 1) + ' ';
    }
    out.push(line + (r === 5 ? '   ← 楚' : r === 4 ? '   ← 汉' : ''));
  }
  out.push('（不带括号 = 汉 / 红，带 [] = 楚 / 黑' + (game.bf ? '；数字 = 等级/血量' : '') + '）');
  if (game.bf) out.push(`轮到 ${game.turn === 'r' ? '汉' : '楚'} · 第 ${game.round} 回合 · 军功 汉 ${game.merit.r} 楚 ${game.merit.b} · 兵法已用 ${JSON.stringify(game.used)}` + (game.final ? ' · 决战' : ''));
  else out.push(`轮到 ${game.turn === 'r' ? '红' : '黑'}`);
  if (game.result) out.push('结果：' + JSON.stringify(game.result));
  return out.join('\n');
}
if (require.main === module) {
  const argv = process.argv.slice(2);
  const file = argv.find(a => !a.startsWith('--') && a !== String(+a)) || '-';
  const at = argv.includes('--at') ? +argv[argv.indexOf('--at') + 1] : null;
  const text = fs.readFileSync(file === '-' ? 0 : file, 'utf8');
  const data = parse(text);
  const total = (data.entries || data.moves || []).length;
  const rules = data.kind === 'bf' ? detectRules(data) : null;
  console.log(`玩法 ${data.kind} · 模式 ${data.mode} · 版本 ${data.ver} · 共 ${total} 条行动` + (data.ai ? ' · 电脑 ' + JSON.stringify(data.ai) : '') + (data.me ? ' · 导出者执 ' + data.me : '') + (rules ? ' · 规则 ' + rulesText(rules) : ''));
  if (argv.includes('--all')) {
    for (let k = 0; k <= total; k++) { console.log(`\n—— 第 ${k} 条之后` + (k ? '：' + JSON.stringify((data.entries || data.moves)[k - 1]) : '（开局）')); console.log(draw(load(data, k, rules).game)); }
  } else console.log(draw(load(data, at, rules).game));
}
module.exports = { parse, load, draw, detectRules, applyRules, rulesText };
