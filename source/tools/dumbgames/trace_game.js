// 复盘：导出的一局里，电脑每一步“怎么想的”，再请裁判（霸王档长时间深搜）判它想得对不对
// 用法：node tools/dumbgames/trace_game.js 对局.txt [--side r|b] [--level mid|hard] [--from 回合] [--to 回合]
//                                         [--nodes mid=60000,hard=100000] [--judge-nodes 1500000] [--json 输出.json]
//   电脑那方、档位默认从导出里读（data.ai）。电脑用 tools/variants/bfai_trace.js（= 线上电脑 + 记录预想线和估值拆分，走法逐步相同）。
//   网页里电脑按时间收手，这里按节点数（--nodes）重算，所以“重算”可能和实战那步不同——不同时两步都标出来。
//   每一步输出：实走 / 重算、分数、层数、前三名候选（各自的预想线）、裁判的最好着和实走的分（落差 ≥ 1 分标 ⚠）。
//   标 ⚠ 的步再列：
//     · 原因：没考虑（根上被名额 / 规则筛掉）/ 粗算（升级走法名额外，只算了一层）/ 随机（分差在噪声内）/ 算浅（它算的层数里这步分低，裁判多算几层才看出更好）
//     · 两条预想线末局面的估值拆分（子力 / 位置 / 贴脸 / 帅 / 军功 / 兵法 / 其他），看它以为赚在哪
//   裁判对升级看得更全：根上自己的升级不筛、对方“先升级再走”所有升级都看（第 1 和第 3 层）；另外每一步都精确查一遍“走完给对方留了一步杀没有”。
//   裁判和电脑用的是同一套估值，所以这里能查出的是“算浅了、没考虑到”；估值本身给错了（裁判也跟着错）查不出来，要看实战结果和人的判断。
'use strict';
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', '..');
process.chdir(SRC);
const { load } = require(SRC + '/tools/game_load.js');
const BF = global.BF;
const AI = require(SRC + '/tools/variants/bfai_trace.js'), JD = AI.judge();

const argv = process.argv.slice(2);
const opt = { file: null, side: null, level: null, from: 1, to: 999, nodes: 'mid=60000,hard=100000', judge: 1000000, wide: 500000, dd: 4, dw: 3, json: null };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--side') opt.side = v(); else if (k === '--level') opt.level = v(); else if (k === '--from') opt.from = +v(); else if (k === '--to') opt.to = +v();
  else if (k === '--nodes') opt.nodes = v(); else if (k === '--judge-nodes') opt.judge = +v(); else if (k === '--wide-nodes') opt.wide = +v(); else if (k === '--deep-depth') opt.dd = +v(); else if (k === '--wide-depth') opt.dw = +v(); else if (k === '--json') opt.json = v(); else if (!opt.file) opt.file = k; else throw new Error('多余的参数 ' + k);
}
if (!opt.file) { console.log('用法见文件开头'); process.exit(1); }
for (const kv of opt.nodes.split(',')) { const [lv, n] = kv.split('='); AI.LEVELS[lv] = { ...AI.LEVELS[lv], nodes: +n }; }
JD.LEVELS.judge = { ...JD.LEVELS.hard, noise: 0, top: 1, nodes: opt.wide };      // 宽裁判：升级全看，算得浅
AI.LEVELS.deep = { ...AI.LEVELS.hard, noise: 0, top: 1, nodes: opt.judge };      // 深裁判：和电脑看法一样，算得深
// 比“最好的那步”和“实走那步”时，两步走完的局面用同样的固定层数各算一遍（不能拿根上 4 层的分去比走完后 5 层的分：
//   这个游戏里算到单数层还是双数层，分数差得很大——最后一层是不是吃子）。nodes 只是保险上限，正常都算满
AI.LEVELS.deepFix = { ...AI.LEVELS.hard, noise: 0, top: 1, depth: opt.dd, nodes: 4000000 };
JD.LEVELS.wideFix = { ...JD.LEVELS.hard, noise: 0, top: 1, depth: opt.dw, nodes: 4000000 };
const text = fs.readFileSync(opt.file, 'utf8');
const { data, rules } = load(text);
const side = opt.side || (data.ai ? Object.keys(data.ai)[0] : 'r'), level = opt.level || (data.ai && data.ai[side]) || 'mid';
const WIN = 9000;

const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' }, SIDE = { r: '汉', b: '楚' };
const desc = (S, a) => {
  if (!a) return '?';
  if (a.k === 'up') { const p = S.board[a.at[1]][a.at[0]]; return `升${p ? N[p.t] : '?'}${a.at}`; }
  if (a.k === 'mv') { const p = S.board[a.from[1]][a.from[0]], q = S.board[a.to[1]][a.to[0]]; return `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  if (a.k === 'art') return a.steps ? '破釜[' + a.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回';
  if (a.k === 'ult') return '终极兵法';
  if (a.k === 'sk') return '技能@' + a.at + (a.to ? '→' + a.to : '');
  if (a.k === 'pass') return '停着';
  return JSON.stringify(a);
};
// 在 S 上执行一个行动（升级 / 走子……），返回新局面；不合法返回 null
const step = (S, a) => { if (a.k === 'up') return A_up(S, a.at); const r = BF.attempt(S, a); return r ? r.S : null; };
const A_up = (S, at) => BF.ai.upgradeState(S, at);
// 一串行动的文字（边走边描述，描述用走之前的局面），并返回末局面
function line(S, seq, max = 6) {
  const out = []; let T = S;
  for (const a of seq) {
    if (!T) break;
    if (out.length < max) out.push((a.k === 'up' ? '' : SIDE[T.turn]) + desc(T, a));
    T = step(T, a);
  }
  return { text: out.join(' ') + (seq.length > max ? ' …' : ''), end: T };
}
const fmtV = v => (v >= WIN / 2 ? '必胜' : v <= -WIN / 2 ? '必败' : v.toFixed(2));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keyOf = (up, a) => JSON.stringify([up || null, a]);
// 轮到对方：有没有一步杀（可以先给一枚子升一级再走）；有就返回那一手的文字
function mate1(S, me) {
  const opp = S.turn; if (opp === me) return null;
  const st = [{ S, up: null }];
  if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === opp && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) st.push({ S: U, up: [f, r] }); } }
  for (const x of st) for (const e of BF.ai.gen(x.S, false)) {
    const R = BF.attempt(x.S, e.a); if (!R) continue;
    const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === opp) return (x.up ? desc(S, { k: 'up', at: x.up }) + ' + ' : '') + desc(x.S, e.a);
  }
  return null;
}
const seeded = s => { let a = s; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; }; };

// 整局切成回合（同 game2exam）
const entries = data.entries || [], turns = [];
{
  const g = load(data, 0, rules).game; let start = 0, n = 0;
  for (let i = 0; i < entries.length; i++) {
    const sd = g.turn; if (!n) start = i; n++;
    if (!g.apply(entries[i])) throw new Error('第 ' + (i + 1) + ' 条行动重放失败');
    if (g.turn !== sd || g.result) { turns.push({ round: Math.floor(turns.length / 2) + 1, side: sd, from: start, to: i + 1 }); n = 0; }
  }
}

(async () => {
  const rows = [], tally = {};
  console.log(`复盘 ${path.basename(opt.file)}：电脑执${SIDE[side]}（${level}，重算 ${AI.LEVELS[level].nodes} 节点；深裁判找着 ${opt.judge} 节点、比分时两步各算 ${opt.dd + 1} 层；宽裁判找着 ${opt.wide} 节点、比分 ${opt.dw + 1} 层）`);
  for (const t of turns) {
    if (t.side !== side || t.round < opt.from || t.round > opt.to) continue;
    const S0 = load(data, t.from, rules).game.S, me = side;
    const played = entries.slice(t.from, t.to);
    const pUp = (played.find(a => a.k === 'up') || {}).at || null, pMain = played[played.length - 1];
    // 电脑重算
    seeded(11); const seq = await AI.think(BF.cloneState(S0), level); const L = AI.think.last;
    const rUp = (seq.find(a => a.k === 'up') || {}).at || null, rMain = seq[seq.length - 1];
    const all = L.all || [], byKey = new Map(all.map(k => [keyOf(k.up, k.a), k]));
    const pk = byKey.get(keyOf(pUp, pMain));
    // 两个裁判各自：从走之前的局面找最好的；再单独算实走那步的分（从走完的局面让对方算，取反）
    let S1 = BF.cloneState(S0); for (const a of played) { S1 = step(S1, a); if (!S1) break; }
    async function judge(M, lv, lvFix, sd) {
      seeded(sd); const jseq = await M.think(BF.cloneState(S0), lv); const J = M.think.last;
      const up = (jseq.find(a => a.k === 'up') || {}).at || null, main = jseq[jseq.length - 1];
      const after = seq => { let T = BF.cloneState(S0); for (const a of seq) { T = step(T, a); if (!T) return null; } return T; };
      const val = async T => {
        if (!T) return { v: NaN, d: 0 };
        if (T.final || T.result) { const ev = BF.evaluate(T); return { v: ev && ev.result ? (ev.result.winner === me ? WIN : -WIN) : 0, d: 0 }; }
        seeded(sd + 4); await M.think(BF.cloneState(T), lvFix); return { v: -M.think.last.v, d: M.think.last.depth };
      };
      const b = await val(after(jseq)), p = same(up, pUp) && same(main, pMain) ? b : await val(S1);
      return { seq: jseq, up, main, v: b.v, depth: b.d + 1, pdepth: p.d + 1, pick: J.pick, played: p.v, drop: b.v - p.v };
    }
    const Jd = await judge(AI, 'deep', 'deepFix', 13), Jw = await judge(JD, 'judge', 'wideFix', 23);
    const lost = j => j.played <= -WIN / 2 && j.v > -WIN / 2;
    const m1 = S1 && !S1.final ? mate1(S1, me) : null, m1j = m1 ? (() => { let T = BF.cloneState(S0); for (const a of Jw.seq) { T = step(T, a); if (!T) return null; } return T && !T.final ? mate1(T, me) : null; })() : null;
    const badD = Jd.drop >= 1 || lost(Jd), badW = Jw.drop >= 1 || lost(Jw), bad = badD || badW || !!m1;
    const J = Jd, jUp = Jd.up, jMain = Jd.main, jPlayed = Jd.played, drop = Jd.drop;
    const out = [];
    const pText = (pUp ? desc(S0, { k: 'up', at: pUp }) + ' + ' : '') + desc(S0, pMain);
    const rText = same(rUp, pUp) && same(rMain, pMain) ? '同' : (rUp ? desc(S0, { k: 'up', at: rUp }) + ' + ' : '') + desc(S0, rMain);
    out.push(`${bad ? '⚠' : ' '} 第 ${t.round} 回合 实走 ${pText} | 重算 ${rText} | 它的分 ${fmtV(L.v)}（${L.depth} 层，${Math.round(L.nodes / 1000)}k 节点，${all.length} 个候选）`);
    out.push('    候选：' + all.slice(0, 3).map((k, i) => {
      const T0 = k.up ? A_up(S0, k.up) : S0, mv = (k.up ? desc(S0, { k: 'up', at: k.up }) + '+' : '') + desc(T0, k.a);
      const T1 = step(T0, k.a); const pv = T1 ? line(T1, k.pv, 4).text : '';
      return `${'①②③'[i]} ${mv} ${fmtV(k.v)}${k.exact ? '' : '(上界)'}${pv ? '［预想：' + pv + '］' : ''}`;
    }).join('  '));
    if (pk && all.indexOf(pk) > 2) out.push(`    实走那步在它的候选里排第 ${all.indexOf(pk) + 1}，分 ${fmtV(pk.v)}${pk.exact ? '' : '(上界)'}`);
    const jt = j => (j.up ? desc(S0, { k: 'up', at: j.up }) + ' + ' : '') + desc(S0, j.main);
    const dp = j => j.depth === j.pdepth ? `${j.depth} 层` : `${j.depth}/${j.pdepth} 层，层数不一，分数仅供参考`;
    out.push(`    深裁判（${dp(Jd)}）：最好 ${jt(Jd)} ${fmtV(Jd.v)}；实走 ${fmtV(Jd.played)}；落差 ${isFinite(Jd.drop) ? Jd.drop.toFixed(2) : '?'}` +
      `  ｜ 宽裁判（升级全看，${dp(Jw)}）：最好 ${jt(Jw)} ${fmtV(Jw.v)}；实走 ${fmtV(Jw.played)}；落差 ${isFinite(Jw.drop) ? Jw.drop.toFixed(2) : '?'}`);
    if (m1) out.push(`    送一步杀：实走完对方有 ${m1}${m1j ? '（裁判那步走完也有 ' + m1j + '，可能已经躲不开）' : '（裁判那步走完没有）'}`);
    let why = '';
    if (bad) {
      const jk = byKey.get(keyOf(jUp, jMain));
      if (m1 && !m1j) why = '送一步杀：对方先升级再走的那一手不在它搜索的升级名额里，看不见';
      else if (badW && !badD) why = `升级盲区：宽裁判（升级全看）认为差 ${fmtV(Jw.drop)}，和电脑看法一样的深裁判看不出——最好是 ${jt(Jw)}`;
      else if (!jk) why = '没考虑：裁判的那步不在它根上的候选里（被名额 / 规则筛掉）';
      else if (jk.off) why = '粗算：裁判的那步是名额外的升级走法，它只算了一层';
      else if (pk && jk.exact && pk.exact && Math.abs(jk.v - pk.v) <= (AI.LEVELS[level].noise * 1.6 + 0.02)) why = `随机：两步在它眼里分差 ${(pk.v - jk.v).toFixed(2)}，落在噪声里`;
      else why = `算浅：它算 ${L.depth} 层时给裁判那步 ${fmtV(jk.v)}${jk.exact ? '' : '(上界)'}、实走 ${pk ? fmtV(pk.v) : '?'}；深裁判算到 ${J.depth} 层才看出来`;
      out.push('    原因：' + why);
      tally[why.split('：')[0]] = (tally[why.split('：')[0]] || 0) + 1;
      // 两条预想线末局面的估值拆分（站在电脑这方看）
      const endOf = (up, a, pv) => { let T = up ? A_up(S0, up) : S0; T = T && step(T, a); return T ? line(T, pv || [], 99).end : null; };
      const terms = ['子力', '位置', '贴脸', '帅', '军功', '兵法', '其他'];
      const show = (name, E) => { if (!E) return; const r = AI.traceScore(E, me); out.push(`    ${name}末局面：` + terms.map(x => `${x} ${(r[x] || 0).toFixed(1)}`).join(' ') + ` = ${r.总.toFixed(2)}`); };
      if (pk) show('它预想的实走线', endOf(pUp, pMain, pk.pv));
      if (badW && !badD) show('宽裁判最好线  ', endOf(Jw.up, Jw.main, Jw.pick ? Jw.pick.pv : []));
      else show('深裁判最好线  ', endOf(jUp, jMain, J.pick ? J.pick.pv : []));
    }
    console.log(out.join('\n'));
    rows.push({ round: t.round, played, recomputed: seq, same: rText === '同', v: L.v, depth: L.depth, nodes: L.nodes, deep: { seq: Jd.seq, v: Jd.v, depth: Jd.depth, played: Jd.played }, wide: { seq: Jw.seq, v: Jw.v, depth: Jw.depth, played: Jw.played }, mate1: m1, drop, bad, why });
  }
  const nb = rows.filter(r => r.bad).length;
  console.log(`\n共 ${rows.length} 步，裁判认为走错（落差 ≥ 1 分或送成必败）${nb} 步：` + Object.entries(tally).map(([k, v]) => `${k} ${v}`).join('、'));
  console.log(`重算和实战走法相同 ${rows.filter(r => r.same).length}/${rows.length}（不同的多半是网页按时间收手、这里按节点数，或者随机）`);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(rows, null, 1));
})().catch(e => { console.error(e.stack || e); process.exit(1); });
