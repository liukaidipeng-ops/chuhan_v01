// 思考时间值多少（Ham 10-10：不必担心思考时间，先做最强电脑；拍板单 ai_time1 = a 关键时刻多想）
//   在 C65（线上 + 更狠少算 + 让一步试试）上：BFAI_TIME_X=k 霸王的节点上限 ×k（= 同样的机器多想 k 倍时间）；BFAI_TIME_DYN=x 难走的局面再放宽到 x 倍（bfai_next 的 BFAI_DYN）。
//   对手用 bfai_c65.js（固定 10 万节点）。bfsim 的 --nodes 会给两边都设 hard=…，这里拦下来乘 k
'use strict';
const X = +(process.env.BFAI_TIME_X || 1), DYN = process.env.BFAI_TIME_DYN || '';
const M = require('./bfai_next.js').make({ BFAI_LMR2: '6', BFAI_NMP: '2', BFAI_DYN: DYN }, 'time');
const H = M.LEVELS.hard; let n = H.nodes;
Object.defineProperty(H, 'nodes', { enumerable: true, configurable: true, get() { return n; }, set(v) { n = v ? Math.round(v * X) : v; } });
module.exports = M;
