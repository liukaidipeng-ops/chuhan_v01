// 电脑变体（只供模拟 / 测速）：校尉档多算一层（用户在拍板单定 ai_depth1=a：量“多算一层”值多少、慢多少，2026-10-09）。
//   底版：git 上的 source/src/bfai.js（BFAI_M4_BASE，默认 ecf1ddd = 线上电脑），按文字锚点改。
//   BFAI_MIDD（默认 4）：校尉档算几层。BFAI_NODEX（默认 12）：按节点数收手时（模拟）给的搜索量是 --nodes 的几倍——
//   三局笨棋里 29 个局面实测算满 4 层要 3 层的 6.3 倍（中位）/ 9.9 倍（P90）节点，12 倍基本都能算满，量的是“多一层”本身值多少。
//   BFAI_MIDB（默认不改）：网页按时间收手时校尉每步的预算毫秒（测速用：给够时间才算得满 4 层）。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const E = process.env, rev = E.BFAI_M4_BASE || 'ecf1ddd';
let s = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_mid4：锚点出现 ${n} 次：${a.slice(0, 80)}`); s = s.replace(a, () => b); };
const D = +(E.BFAI_MIDD || 4), NX = +(E.BFAI_NODEX || 12), MB = E.BFAI_MIDB ? +E.BFAI_MIDB : null;
rep("    mid: { depth: 3, q: 3, noise: 0.3, top: 1, up: 1, budget: 2500 },",
  `    mid: { depth: ${D}, q: 3, noise: 0.3, top: 1, up: 1, budget: ${MB || 2500}, nodex: ${NX} },   // 变体 mid4`);
rep("        if (d > 2 && nodes - n0 > L.nodes * 0.5) break;\n        nodeCap = d <= 2 ? Infinity : n0 + L.nodes;",
  "        if (d > 2 && nodes - n0 > L.nodes * (L.nodex || 1) * 0.5) break;\n        nodeCap = d <= 2 ? Infinity : n0 + L.nodes * (L.nodex || 1);   // 变体 mid4：校尉的搜索量放大");
const out = E.BFAI_M4_OUT || path.join(os.tmpdir(), `bfai_mid4_${rev}_${process.pid}.js`);
fs.writeFileSync(out, s);
if (!E.BFAI_M4_OUT) process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
module.exports = require(out);
