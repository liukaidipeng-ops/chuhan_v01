'use strict';
// 保留题原型（Fable，2026-10-04）：
//   1. 用线上电脑（25eb911）自对弈几局（开局 6 步高随机，之后校尉档省节点），每隔几步抽一个局面；
//   2. 两个裁判（b18c278、25eb911 的霸王档、按节点数深搜、不带随机）各自给出最好的一步和前几名的分；
//      两个裁判最好的一步一致、而且都比第二名好 ≥ MARGIN 分的局面才留下（“有明确最佳着法”）；
//   3. 三个版本（b18c278、25eb911、9ff64a4）按校尉档 6 万节点答题，记命中率和平均损失。
// 用法：node holdout_proto.js [--games 4] [--seed 777001] [--judge-nodes 250000] [--margin 1.0] [--step 6] [--runs 2] [--out 文件.json]
global.XQ = require('/home/user/chuhan_v01/source/src/rules.js');
const BF = global.BF = require('/home/user/chuhan_v01/source/src/bingfa.js');
const SP = '/tmp/claude-0/-home-user-chuhan-v01/3feb1416-b151-5e3e-8678-5fbc17175485/scratchpad';
const fs = require('fs');
const argv = process.argv.slice(2);
const opt = { games: 4, seed: 777001, judgeNodes: 250000, margin: 1.0, step: 6, runs: 2, out: SP + '/fable/holdout_proto.json', from: 10, to: 64, genNodes: 12000, testNodes: 60000, maxPos: 40 };
for (let i = 0; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''), v = argv[++i]; const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (!(key in opt)) throw new Error('未知参数 ' + k); opt[key] = typeof opt[key] === 'number' ? +v : v; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const AIS = { b18c278: require(SP + '/fable/bfai_b18c278.js'), v25eb911: require(SP + '/fable/bfai_25eb911.js'), v9ff64a4: require(SP + '/bfai_9ff.js') };
const GEN = AIS.v25eb911;
GEN.LEVELS.open = { ...GEN.LEVELS.mid, noise: 0.9, top: 3, nodes: opt.genNodes };
GEN.LEVELS.gen = { ...GEN.LEVELS.mid, nodes: opt.genNodes };
for (const [n, A] of Object.entries(AIS)) {
  A.LEVELS.judge = { ...A.LEVELS.hard, noise: 3, top: 1, nodes: opt.judgeNodes, budget: 1e9 };   // noise 3 → 根节点窗口 M=4.82：和最好的差 4.8 分以内的着法都算准确分（不然只有上界）；挑着法只看 top[0]，不看带随机的 pick
  A.LEVELS.test = { ...A.LEVELS.mid, nodes: opt.testNodes };
}
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
// 主行动的规范键（忽略前面的升级 / 拒马；裁判版本不同，升级的表示法也不同）
const mainOf = seq => seq[seq.length - 1];
const key = a => { const { up, ...rest } = a; return JSON.stringify(rest); };
const load = S => { const g = new BF.Game(); g.setup(T => Object.assign(T, BF.cloneState(S))); return g; };

(async () => {
  const t00 = Date.now();
  // 1. 自对弈抽局面
  const pos = [];
  for (let gi = 0; gi < opt.games; gi++) {
    const seed = opt.seed + gi;
    Math.random = mulberry32(seed * 2654435761);
    const g = new BF.Game();
    let plies = 0;
    while (!g.result && plies < opt.to + 1) {
      if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); plies++; continue; }
      if (plies >= opt.from && (plies - opt.from) % opt.step === 0) pos.push({ seed, ply: plies, round: g.round, side: g.turn, S: BF.cloneState(g.S) });
      const seq = await GEN.think(BF.cloneState(g.S), plies < 6 ? 'open' : 'gen');
      for (const a of seq) if (!g.apply(a)) throw new Error('非法 ' + JSON.stringify(a));
      plies++;
    }
    console.log(`自对弈 ${seed}：${plies} 步，结果 ${JSON.stringify(g.result)}，抽了 ${pos.filter(p => p.seed === seed).length} 个局面`);
  }
  const sample = pos.slice(0, opt.maxPos);
  console.log(`共 ${pos.length} 个局面，裁判前 ${sample.length} 个（每个裁判 ${opt.judgeNodes} 节点）\n`);
  // 2. 裁判
  const kept = [];
  for (const p of sample) {
    const J = {};
    for (const jn of ['b18c278', 'v25eb911']) {
      Math.random = mulberry32(4242);
      const seq = await AIS[jn].think(BF.cloneState(p.S), 'judge');
      const L = AIS[jn].think.last;
      const top = L.top.map(([a, v]) => [key(a), v, desc(p.S, a)]);
      // 最好的一步 = 前几名里分最高的（不是带随机挑出来的 pick）；分差 = 第一和第二的差（第二名的分可能只是上界，所以这是分差的下界）
      J[jn] = { best: top[0][0], bestDesc: top[0][2], v: top[0][1], depth: L.depth, n: L.n, top, margin: top.length > 1 ? +(top[0][1] - top[1][1]).toFixed(2) : 99 };
    }
    const agree = J.b18c278.best === J.v25eb911.best, ok = agree && J.b18c278.margin >= opt.margin && J.v25eb911.margin >= opt.margin && J.b18c278.n > 1;
    console.log(`${p.seed}/${p.ply}（第 ${p.round} 回合，${p.side === 'r' ? '汉' : '楚'}走）  b18c278：${J.b18c278.bestDesc} ${J.b18c278.v.toFixed(2)} 差 ${J.b18c278.margin} ${J.b18c278.depth} 层 | 25eb911：${J.v25eb911.bestDesc} ${J.v25eb911.v.toFixed(2)} 差 ${J.v25eb911.margin} ${J.v25eb911.depth} 层  → ${ok ? '留' : agree ? '弃（分差小）' : '弃（裁判不一致）'}`);
    if (ok) kept.push({ ...p, J });
  }
  console.log(`\n留下 ${kept.length}/${sample.length} 个“有明确最佳着法”的局面；用时 ${Math.round((Date.now() - t00) / 1000)}s\n`);
  // 3. 三个版本答题
  const res = {};
  for (const an of Object.keys(AIS)) res[an] = { hit: 0, n: 0, loss: 0, lossN: 0, lossLB: 0, rows: [] };
  for (const p of kept) {
    const line = [`${p.seed}/${p.ply} 答案 ${p.J.b18c278.bestDesc}（差 ${p.J.b18c278.margin}）`];
    for (const an of Object.keys(AIS)) {
      let hit = 0; const played = [];
      for (let run = 0; run < opt.runs; run++) {
        Math.random = mulberry32(9001 + run * 7919);
        const seq = await AIS[an].think(BF.cloneState(p.S), 'test');
        const k = key(mainOf(seq)); const ok = k === p.J.b18c278.best;
        if (ok) hit++;
        // 损失：按 b18c278 裁判的前几名算；不在前几名里的至少差 margin（下界）
        const t = p.J.b18c278.top.find(x => x[0] === k);
        const loss = ok ? 0 : t ? p.J.b18c278.top[0][1] - t[1] : null;
        if (loss != null) { res[an].loss += loss; res[an].lossN++; } else { res[an].lossLB++; }
        played.push((ok ? '✓' : '✗') + seq.map(a => desc(p.S, a)).join('+'));
      }
      res[an].hit += hit; res[an].n += opt.runs; res[an].rows.push({ id: `${p.seed}/${p.ply}`, hit, played });
      line.push(`${an} ${hit}/${opt.runs} ${[...new Set(played)].join(' ')}`);
    }
    console.log(line.join('  |  '));
  }
  console.log('\n汇总（校尉档 ' + opt.testNodes + ' 节点，每题 ' + opt.runs + ' 次）：');
  for (const [an, r] of Object.entries(res)) console.log(`  ${an}：命中 ${r.hit}/${r.n}（${r.n ? Math.round(100 * r.hit / r.n) : 0}%）  平均损失（能算出来的 ${r.lossN} 次）${r.lossN ? (r.loss / r.lossN).toFixed(2) : '—'}  不在裁判前五名里（损失至少 = 分差）${r.lossLB} 次`);
  fs.writeFileSync(opt.out, JSON.stringify({ opt, kept: kept.map(p => ({ seed: p.seed, ply: p.ply, round: p.round, side: p.side, S: p.S, J: p.J })), res }, null, 1));
  console.log('写到 ' + opt.out + '，总用时 ' + Math.round((Date.now() - t00) / 1000) + 's');
})().catch(e => { console.error(e); process.exit(1); });
