// 多核分头算（原型）值多少：g5 的局面上比“和深算参考答案选同一步”的比例
//   参考：单核 REF 节点；单核 N / 2N / 4N；K 核分头算（每核 N 节点，第 3 层起根上的走法按第 2 层排名轮流分给各核）
//   用法：node tools/psplit/bench.js [N=100000] [K=4] [REF=1600000] [SHARE=0|1]
//   SHARE=1：各核每算完一层把自己的最好分数发给主线程，主线程转给别的核当下一层的下限（同一层才用）
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path'), SRC = path.join(__dirname, '..', '..');
if (!isMainThread) {
  // 线程里不能 chdir：主线程已在 source/ 下启动
  require(SRC + '/tools/game_load.js'); const BF = global.BF; BF.CFG.beishui.on = true; BF.CFG.r6.on = true;
  const AI = require(SRC + '/tools/variants/bfai_next.js').make({ BFAI_LMR2: '6', BFAI_NMP: '2', BFAI_PSPLIT: '1' }, 'ps' + workerData.id);
  const ext = {};   // 别的核同一层的最好分数
  parentPort.on('message', async m => {
    if (m.type === 'alpha') { if (!(m.d in ext) || m.v > ext[m.d]) ext[m.d] = m.v; return; }
    for (const k in ext) delete ext[k];
    AI.LEVELS.hard = { ...AI.LEVELS.hard, nodes: m.nodes };
    const iters = [];
    AI.part = m.k > 1 ? { i: m.i, k: m.k, onIter: it => { iters.push(it); if (m.share) parentPort.postMessage({ type: 'iter', it }); }, alpha: m.share ? d => (d in ext ? ext[d] - 0.3 : -1e9) : null } : null;
    let a = 7; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
    const t0 = Date.now();
    const seq = await AI.think(BF.cloneState(m.S), 'hard', async () => { await new Promise(r => setImmediate(r)); });
    parentPort.postMessage({ type: 'done', seq, iters, depth: AI.think.last.depth, nodes: AI.think.last.nodes, ms: Date.now() - t0 });
  });
  return;
}
process.chdir(SRC);
const N = +(process.argv[2] || 100000), K = +(process.argv[3] || 4), REF = +(process.argv[4] || 1600000), SHARE = +(process.argv[5] || 0);
const J = require(SRC + '/tools/dumbgames/review_g5-hard.json');
const pos = J.rows.map(r => r.S0);
const W = Array.from({ length: K }, (_, id) => new Worker(__filename, { workerData: { id } }));
const run = (w, msg) => new Promise(res => { const h = m => { if (m.type === 'done') { w.off('message', h); res(m); } }; w.on('message', h); w.postMessage(msg); });
const key = seq => JSON.stringify(seq);
(async () => {
  // 1. 参考答案、单核 N / 2N / 4N：K 个核各拿一部分局面
  const res = pos.map(() => ({}));
  const jobs = []; pos.forEach((S, p) => { for (const [name, nodes] of [['ref', REF], ['n1', N], ['n2', 2 * N], ['n4', 4 * N]]) jobs.push({ p, name, nodes }); });
  let next = 0;
  await Promise.all(W.map(async w => { while (next < jobs.length) { const j = jobs[next++]; const r = await run(w, { S: pos[j.p], nodes: j.nodes, k: 1, i: 0 }); res[j.p][j.name] = r; } }));
  // 2. K 核分头算：每个局面 K 个核一起上
  for (let p = 0; p < pos.length; p++) {
    const fwd = m => { if (m.type === 'iter') for (const w of W) w.postMessage({ type: 'alpha', d: m.it.d, v: m.it.v }); };
    if (SHARE) W.forEach(w => w.on('message', fwd));
    const t0 = Date.now();
    const rs = await Promise.all(W.map((w, i) => run(w, { S: pos[p], nodes: N, k: K, i, share: SHARE })));
    if (SHARE) W.forEach(w => w.off('message', fwd));
    const ms = Date.now() - t0;
    // 合并：各核都算完的最深一层 D，在这一层里分数最高的那个核的最好着法
    const D = Math.min(...rs.map(r => r.iters.length ? r.iters[r.iters.length - 1].d : 0));
    let best = null; for (const r of rs) { const it = r.iters.find(x => x.d === D); if (it && (!best || it.v > best.v)) best = it; }
    res[p].par = { seq: best ? [best.best] : rs[0].seq, depth: D, ms, nodes: rs.reduce((s, r) => s + r.nodes, 0), maxd: Math.max(...rs.map(r => r.iters.length ? r.iters[r.iters.length - 1].d : 0)) };
  }
  // 参考答案的“第一步”：升级 + 走子算一整步，比较时只比最后那个走子 / 技能（合并的结果只记了 actOf，也是整步）
  const canon = o => JSON.stringify(o, Object.keys(o).sort());
  const norm = seq => !Array.isArray(seq) ? canon(seq) : seq.length === 2 && seq[0].k === 'up' ? canon({ up: seq[0].at, ...seq[1] }) : canon(seq[0] || {});
  const agree = name => res.filter(r => norm(r[name].seq) === norm(r.ref.seq)).length;
  const avg = (name, f) => (res.reduce((s, r) => s + f(r[name]), 0) / res.length);
  console.log('局面', res.length, `N=${N} K=${K} 参考 ${REF} 共享下限 ${SHARE}`);
  for (const name of ['n1', 'n2', 'n4', 'par']) console.log(name.padEnd(4), '和参考同一步', agree(name), '平均层数', avg(name, r => r.depth || 0).toFixed(2), name === 'par' ? '最深的核 ' + avg(name, r => r.maxd).toFixed(2) : '', '平均毫秒', Math.round(avg(name, r => r.ms)), '平均节点', Math.round(avg(name, r => r.nodes)));
  console.log('ref ', '平均层数', avg('ref', r => r.depth).toFixed(2), '平均毫秒', Math.round(avg('ref', r => r.ms)));
  process.exit(0);
})();
