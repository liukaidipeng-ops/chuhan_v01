// 自动调估值权重：拿“安静局面 + 终局胜负”反推打分公式里每个数该给多少（逻辑回归，国际象棋界叫 Texel 调参）。
//   胜率 ≈ 1 / (1 + e^(−K × 分数))；先用现在的权重定 K，再在 K 不变的情况下调权重，让预测的胜率最贴近实际胜负。
//   每五局留一局（种子 % 5 == 0）不参与拟合，只用来检验：检验集上的误差也要降，才说明不是“背答案”。
//   权重往原值拉（LAMBDA）：数据少的特征不会乱跑。
//
// node tools/tune/fit.js 结果1.json.gz [结果2.json.gz …] [--lambda 0.001] [--iters 3000] [--out tools/tune/w_t1.json] [--min-round 0]
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
require('../game_load.js');
const BF = global.BF, T = require('./feats.js');

const argv = process.argv.slice(2), files = [], opt = { lambda: 0.001, iters: 3000, out: null, lr: 0.01, minRound: 0, check: false };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  if (k === '--lambda') opt.lambda = +argv[++i];
  else if (k === '--iters') opt.iters = +argv[++i];
  else if (k === '--out') opt.out = argv[++i];
  else if (k === '--lr') opt.lr = +argv[++i];
  else if (k === '--min-round') opt.minRound = +argv[++i];
  else if (k === '--check') opt.check = true;   // 每个局面核对：原权重的特征分 = 线上 score()
  else files.push(k);
}
if (!files.length) { console.error('用法见文件开头'); process.exit(1); }

// ---- 读数据 ----
const X = [], Y = [], VAL = [], GAME = [];
let games = 0, skipped = 0, chkN = 0, chkBad = 0, chkFin = 0;
const AI = opt.check ? require('../../src/bfai.js') : null, W00 = T.vec({});
for (const f of files) {
  const raw = fs.readFileSync(f), j = JSON.parse(f.endsWith('.gz') ? zlib.gunzipSync(raw) : raw);
  for (const g of j.results) {
    if (!g.pos) continue;
    if (g.reason === 'stuck' || g.reason === 'probe') { skipped++; continue; }
    games++;
    const y = g.winner === 'r' ? 1 : g.winner === 'b' ? 0 : 0.5, val = g.seed % 5 === 0;
    for (const [str] of g.pos) {
      const S = T.unpack(str);
      if (S.cnt.r + S.cnt.b < opt.minRound * 2) continue;
      const F = T.feats(S, BF.ai, BF.CFG);
      if (AI) { chkN++; if (S.final) chkFin++; if (Math.abs(AI.score(S, 'r') - T.dot(W00, F)) > 1e-9) chkBad++; }
      X.push(Float32Array.from(F)); Y.push(y); VAL.push(val); GAME.push(g.seed);
    }
  }
}
const n = X.length, N = T.N, nv = VAL.filter(Boolean).length;
console.log(`对局 ${games}（跳过 ${skipped}），局面 ${n}：拟合 ${n - nv}，检验 ${nv}；特征 ${N}`);
if (AI) console.log(`核对：${chkN} 个局面（决战 ${chkFin}），特征分和线上 score 不等的 ${chkBad} 个`);

// 每个特征在多少局面里出现过（没出现过的权重拟合不出来，原样保留）
const seen = new Float64Array(N);
for (const F of X) for (let i = 0; i < N; i++) if (F[i] !== 0) seen[i]++;
const free = T.NAMES.map((k, i) => !T.FIXED.has(k) && seen[i] >= 200);

const sig = z => 1 / (1 + Math.exp(-z));
const W0 = T.vec({});
function loss(W, K, useVal) {
  let e = 0, c = 0;
  for (let t = 0; t < n; t++) { if (VAL[t] !== useVal) continue; const p = sig(K * T.dot(W, X[t])); e += (Y[t] - p) ** 2; c++; }
  return e / c;
}
// ---- 定 K（黄金分割搜索） ----
let lo = 0.01, hi = 3;
for (let it = 0; it < 60; it++) { const a = lo + (hi - lo) * 0.382, b = lo + (hi - lo) * 0.618; if (loss(W0, a, false) < loss(W0, b, false)) hi = b; else lo = a; }
const K = (lo + hi) / 2;
const base = { train: loss(W0, K, false), val: loss(W0, K, true) };
console.log(`K = ${K.toFixed(4)}（分数 1 分 ≈ 胜率从 50% 变到 ${(100 * sig(K)).toFixed(1)}%）；原权重 误差 拟合 ${base.train.toFixed(5)} 检验 ${base.val.toFixed(5)}`);

// ---- 调权重（Adam，全量） ----
// 各特征的尺度差很多（xp 最多 6、merit 能到几十），按特征的标准差缩放学习率，免得大尺度特征乱跳
const sd = new Float64Array(N);
{ const m = new Float64Array(N); let c = 0; for (let t = 0; t < n; t++) { if (VAL[t]) continue; c++; for (let i = 0; i < N; i++) m[i] += X[t][i]; } for (let i = 0; i < N; i++) m[i] /= c; for (let t = 0; t < n; t++) { if (VAL[t]) continue; for (let i = 0; i < N; i++) sd[i] += (X[t][i] - m[i]) ** 2; } for (let i = 0; i < N; i++) sd[i] = Math.sqrt(sd[i] / c) || 1; }
const W = Float64Array.from(W0), mA = new Float64Array(N), vA = new Float64Array(N), b1 = 0.9, b2 = 0.999;
const ntr = n - nv;
let best = { val: base.val, W: Float64Array.from(W0), it: 0 };
for (let it = 1; it <= opt.iters; it++) {
  const g = new Float64Array(N);
  for (let t = 0; t < n; t++) {
    if (VAL[t]) continue;
    const F = X[t], p = sig(K * T.dot(W, F)), d = -2 * (Y[t] - p) * p * (1 - p) * K / ntr;
    for (let i = 0; i < N; i++) if (F[i] !== 0) g[i] += d * F[i];
  }
  for (let i = 0; i < N; i++) {
    if (!free[i]) continue;
    const gi = g[i] + 2 * opt.lambda * (W[i] - W0[i]) * sd[i] * sd[i];
    mA[i] = b1 * mA[i] + (1 - b1) * gi; vA[i] = b2 * vA[i] + (1 - b2) * gi * gi;
    const mh = mA[i] / (1 - b1 ** it), vh = vA[i] / (1 - b2 ** it);
    W[i] -= opt.lr / sd[i] * mh / (Math.sqrt(vh) + 1e-12);
  }
  if (it % 100 === 0 || it === opt.iters) {
    const tr = loss(W, K, false), va = loss(W, K, true);
    if (va < best.val) best = { val: va, W: Float64Array.from(W), it };
    if (it % 500 === 0 || it === opt.iters) console.log(`第 ${it} 轮 误差 拟合 ${tr.toFixed(5)} 检验 ${va.toFixed(5)}`);
  }
}
console.log(`检验集最好在第 ${best.it} 轮：${best.val.toFixed(5)}（原 ${base.val.toFixed(5)}，降 ${(100 * (1 - best.val / base.val)).toFixed(2)}%）`);
const rows = T.NAMES.map((k, i) => ({ k, w0: W0[i], w: best.W[i], seen: seen[i], free: free[i] })).filter(r => r.free).sort((a, b) => Math.abs(b.w - b.w0) * sd[T.IDX[b.k]] - Math.abs(a.w - a.w0) * sd[T.IDX[a.k]]);
console.log('变化最大的（按对分数的影响排）：');
for (const r of rows.slice(0, 30)) console.log(`  ${r.k.padEnd(14)} ${r.w0.toFixed(3).padStart(8)} → ${r.w.toFixed(3).padStart(8)}   出现 ${r.seen}`);
if (opt.out) {
  const o = { K, lambda: opt.lambda, iters: best.it, files: files.map(f => path.basename(f)), positions: n, loss: { base, best: best.val }, w: {} };
  T.NAMES.forEach((k, i) => { o.w[k] = T.FIT_ONLY.has(k) ? 0 : +best.W[i].toFixed(4); });
  o.fitOnly = Object.fromEntries([...T.FIT_ONLY].map(k => [k, +best.W[T.IDX[k]].toFixed(4)]));
  fs.writeFileSync(opt.out, JSON.stringify(o, null, 1));
  console.log('写到', opt.out);
}
