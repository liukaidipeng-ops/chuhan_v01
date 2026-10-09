// 提速验收：固定层数（不按节点数收手、不加随机）时，提速版根上每步的分和原版逐个比；再比用了多少节点、多少毫秒
// 用法：node tools/dumbgames/fast_eq.js [层数=3] [每几个局面取一个=1]   （局面 = 三局笨棋里汉方每一回合开始）
'use strict';
const fs = require('fs'), path = require('path'); const SRC = path.join(__dirname, '..', '..'); process.chdir(SRC);
const { execFileSync } = require('child_process');
const { load } = require(SRC + '/tools/game_load.js'); const BF = global.BF;
const D = +(process.argv[2] || 3), STEP = +(process.argv[3] || 1);
const os = require('os'), live = path.join(os.tmpdir(), 'bfai_live_4db9f8c_' + process.pid + '.js');
fs.writeFileSync(live, execFileSync('git', ['show', '4db9f8c:source/src/bfai.js'], { cwd: path.join(SRC, '..'), encoding: 'utf8' })); process.on('exit', () => { try { fs.unlinkSync(live); } catch (e) { } });
const F = require(SRC + '/tools/variants/bfai_fast.js');
const AIs = { 原版: require(live), 提速: F, 只排序: F.make({ BFAI_TT: '0' }, 'mv') };
for (const A of Object.values(AIs)) A.LEVELS.fix = { ...A.LEVELS.hard, depth: D, noise: 0, top: 1, nodes: 1e9, minNodes: 0 };
const pos = [];
for (const f of ['g1-mid', 'g2-hard', 'g3-hard']) { const text = fs.readFileSync('tools/dumbgames/' + f + '.txt', 'utf8'), n = JSON.parse(text.split('---DATA---\n')[1]).entries.length;
  for (let k = 0; k <= n; k++) { const S = load(text, k).game.S; if (S.turn === 'r' && !S.upgraded && !S.final) pos.push(BF.cloneState(S)); } }
(async () => {
  const tot = {}, bad = [];
  for (const [i, S] of pos.entries()) { if (i % STEP) continue;
    const r = {};
    for (const [n, A] of Object.entries(AIs)) { let a = 7; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
      const t0 = Date.now(); const seq = await A.think(BF.cloneState(S), 'fix'); const L = A.think.last;
      r[n] = { seq: JSON.stringify(seq), v: L.v, top: JSON.stringify(L.top), nodes: L.nodes, ms: Date.now() - t0, depth: L.depth };
      tot[n] = tot[n] || { nodes: 0, ms: 0, n: 0 }; tot[n].nodes += L.nodes; tot[n].ms += Date.now() - t0; tot[n].n++; }
    for (const n of ['提速', '只排序']) { const a = r.原版, b = r[n];
      if (Math.abs(a.v - b.v) > 1e-9 || a.seq !== b.seq || a.depth !== b.depth) bad.push(`局面 ${i} ${n}：原版 ${a.v.toFixed(3)} ${a.seq.slice(0, 60)} | ${n} ${b.v.toFixed(3)} ${b.seq.slice(0, 60)}`); }
  }
  console.log(`固定 ${D} 层，${tot.原版.n} 个局面`);
  for (const [n, t] of Object.entries(tot)) console.log(`  ${n}：节点 合计 ${t.nodes}（${(100 * t.nodes / tot.原版.nodes).toFixed(0)}%），毫秒 合计 ${t.ms}（${(100 * t.ms / tot.原版.ms).toFixed(0)}%）`);
  console.log(bad.length ? `分数或走法不同 ${bad.length} 处：\n` + bad.join('\n') : '全部局面：根上的分、走法、层数和原版完全相同');
})();
