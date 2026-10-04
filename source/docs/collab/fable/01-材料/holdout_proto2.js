'use strict';
// 保留题原型 2（Fable，2026-10-04）：不筛“分差大”的局面，而是对抽到的每个局面都算“损失”——
//   裁判（固定版本的霸王档、按节点数、不带随机）找最好的一步，再分别走“裁判最好的一步”和“被测版本走的一步”，
//   都让裁判在走完之后的局面上深搜一次，两个分数之差 = 这一步的损失（和 bfai_quality.js 的量法一样，但局面固定、裁判固定、几版同题）。
// 用法：node holdout_proto2.js [--games 4] [--seed 777001] [--judge-nodes 150000] [--from 9] [--step 5] [--to 64] [--max-pos 36] [--out 文件.json]
global.XQ = require('/home/user/chuhan_v01/source/src/rules.js');
const BF = global.BF = require('/home/user/chuhan_v01/source/src/bingfa.js');
const SP = '/tmp/claude-0/-home-user-chuhan-v01/3feb1416-b151-5e3e-8678-5fbc17175485/scratchpad';
const fs = require('fs');
const argv = process.argv.slice(2);
const opt = { games: 4, seed: 777001, judgeNodes: 150000, from: 9, step: 5, to: 64, genNodes: 12000, testNodes: 60000, maxPos: 36, out: SP + '/fable/holdout_proto2.json' };
for (let i = 0; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''), v = argv[++i]; const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (!(key in opt)) throw new Error('未知参数 ' + k); opt[key] = typeof opt[key] === 'number' ? +v : v; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const AIS = { b18c278: require(SP + '/fable/bfai_b18c278.js'), v25eb911: require(SP + '/fable/bfai_25eb911.js'), v9ff64a4: require(SP + '/bfai_9ff.js') };
const GEN = AIS.v25eb911, J = AIS.b18c278;   // 出题用线上版；裁判用最强版（正式工具里裁判应是固定的、不是被测版本）
GEN.LEVELS.open = { ...GEN.LEVELS.mid, noise: 0.9, top: 3, nodes: opt.genNodes };
GEN.LEVELS.gen = { ...GEN.LEVELS.mid, nodes: opt.genNodes };
J.LEVELS.judge = { ...J.LEVELS.hard, noise: 0, top: 1, nodes: opt.judgeNodes, budget: 1e9 };
for (const A of Object.values(AIS)) A.LEVELS.test = { ...A.LEVELS.mid, nodes: opt.testNodes };
const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
const desc = (S, a) => {
  if (a.k === 'up') { const p = S.board[a.at[1]][a.at[0]]; return `升${p ? N[p.t] : '?'}(${a.at})`; }
  if (a.k === 'mv') { const p = S.board[a.from[1]][a.from[0]], q = S.board[a.to[1]][a.to[0]]; return `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  if (a.k === 'art') return a.steps ? '破釜[' + a.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回';
  if (a.k === 'ult') return '终极';
  if (a.k === 'sk') return '技能@' + a.at + (a.to ? '→' + a.to : '');
  if (a.k === 'pass') return '停着';
  return JSON.stringify(a);
};
const WIN = 9000;
const load = S => { const g = new BF.Game(); g.setup(T => Object.assign(T, BF.cloneState(S))); return g; };
// 走完 seq 之后、站在走棋方看值几分：分出胜负 ±9000，否则让裁判替对方找最好的应着再取反
async function valueAfter(S, seq) {
  const g = load(S); const me = g.turn;
  for (const a of seq) if (!g.apply(a)) return null;
  if (g.result) return g.result.winner === me ? WIN : -WIN;
  if (g.turn === me) return null;
  Math.random = mulberry32(4242);
  await J.think(BF.cloneState(g.S), 'judge');
  return -J.think.last.v;
}
const seqKey = seq => JSON.stringify(seq);
(async () => {
  const t00 = Date.now();
  const pos = [];
  for (let gi = 0; gi < opt.games; gi++) {
    const seed = opt.seed + gi;
    Math.random = mulberry32(seed * 2654435761);
    const g = new BF.Game(); let plies = 0;
    while (!g.result && plies < opt.to + 1) {
      if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); plies++; continue; }
      if (plies >= opt.from && (plies - opt.from) % opt.step === 0) pos.push({ seed, ply: plies, round: g.round, side: g.turn, S: BF.cloneState(g.S) });
      const seq = await GEN.think(BF.cloneState(g.S), plies < 6 ? 'open' : 'gen');
      for (const a of seq) if (!g.apply(a)) throw new Error('非法 ' + JSON.stringify(a));
      plies++;
    }
    console.log(`自对弈 ${seed}：${plies} 步，结果 ${JSON.stringify(g.result)}`);
  }
  const sample = pos.slice(0, opt.maxPos);
  console.log(`共 ${pos.length} 个局面，用前 ${sample.length} 个（汉走 ${sample.filter(p => p.side === 'r').length}、楚走 ${sample.filter(p => p.side === 'b').length}）；裁判 b18c278 霸王档 ${opt.judgeNodes} 节点\n`);
  const res = {}; for (const an of Object.keys(AIS)) res[an] = { n: 0, hit: 0, loss: 0, big2: 0, big4: 0, bySide: { r: [0, 0], b: [0, 0] }, rows: [] };
  const cache = new Map();
  for (const p of sample) {
    Math.random = mulberry32(4242);
    const bestSeq = await J.think(BF.cloneState(p.S), 'judge'); const depth = J.think.last.depth;
    const vBest = await valueAfter(p.S, bestSeq);
    cache.clear(); cache.set(seqKey(bestSeq), vBest);
    const line = [`${p.seed}/${p.ply}（第 ${p.round} 回合 ${p.side === 'r' ? '汉' : '楚'}走）裁判 ${bestSeq.map(a => desc(p.S, a)).join('+')} ${vBest == null ? '?' : vBest.toFixed(2)}（${depth} 层）`];
    for (const an of Object.keys(AIS)) {
      Math.random = mulberry32(9001);
      const seq = await AIS[an].think(BF.cloneState(p.S), 'test');
      const k = seqKey(seq);
      let v = cache.get(k); if (v === undefined) { v = await valueAfter(p.S, seq); cache.set(k, v); }
      const same = k === seqKey(bestSeq) || (seq[seq.length - 1] && bestSeq[bestSeq.length - 1] && JSON.stringify(seq[seq.length - 1]) === JSON.stringify(bestSeq[bestSeq.length - 1]) && v != null && vBest != null && v >= vBest - 0.05);
      const loss = same || v == null || vBest == null ? 0 : Math.min(20, Math.max(0, vBest - v));
      const r = res[an]; r.n++; if (same || loss < 0.05) r.hit++; r.loss += loss; if (loss >= 2) r.big2++; if (loss >= 4) r.big4++; r.bySide[p.side][0] += loss; r.bySide[p.side][1]++;
      r.rows.push({ id: `${p.seed}/${p.ply}`, side: p.side, played: seq.map(a => desc(p.S, a)).join('+'), v, loss: +loss.toFixed(2) });
      line.push(`${an} ${seq.map(a => desc(p.S, a)).join('+')} ${v == null ? '?' : v.toFixed(2)} 损失 ${loss.toFixed(2)}`);
    }
    console.log(line.join('  |  '));
  }
  console.log(`\n汇总（被测按校尉档 ${opt.testNodes} 节点；损失 = 裁判眼里“最好的一步”和“它走的一步”的分差，≥2 算失误、≥4 算漏着）：`);
  for (const [an, r] of Object.entries(res)) console.log(`  ${an}：和裁判一致 ${r.hit}/${r.n}  平均损失 ${(r.loss / r.n).toFixed(2)}  失误(≥2) ${r.big2}  漏着(≥4) ${r.big4}  汉走时平均损失 ${(r.bySide.r[0] / Math.max(1, r.bySide.r[1])).toFixed(2)}（${r.bySide.r[1]} 题） 楚走时 ${(r.bySide.b[0] / Math.max(1, r.bySide.b[1])).toFixed(2)}（${r.bySide.b[1]} 题）`);
  fs.writeFileSync(opt.out, JSON.stringify({ opt, positions: sample.map(p => ({ seed: p.seed, ply: p.ply, round: p.round, side: p.side, S: p.S })), res }, null, 1));
  console.log('写到 ' + opt.out + '，总用时 ' + Math.round((Date.now() - t00) / 1000) + 's');
})().catch(e => { console.error(e); process.exit(1); });
