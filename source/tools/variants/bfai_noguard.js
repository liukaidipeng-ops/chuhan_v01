// 电脑变体（只供模拟）：chat 的背水正式版电脑（默认 dev 98dd206，可用环境变量 BFAI_NG_BASE 换）
//   + 环境变量 BFAI_BS_NOGUARD=1 时，汉方完全不提防楚方的背水（pfGuard 恒为假：搜索里不把背水当楚方的应着，被将军时的两步解将也不算）。
//   不设 BFAI_BS_NOGUARD 时和那一版电脑完全一样。用途：对照“汉方是不是防背水防过头了”（用户 2026-10-04 同意跑）。
//   按节点数收手照常有效（nodeCap / L.nodes 都在那一版里）。
// 用法：BFSIM_ENGINE=tools/variants/engine_at.js ENGINE_REV=98dd206 BFAI_BS_NOGUARD=1 node tools/bfsim.js --ai tools/variants/bfai_noguard.js --set beishui.on=true …
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const base = process.env.BFAI_NG_BASE || '98dd206';
let s = execFileSync('git', ['show', base + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_noguard：锚点出现 ${n} 次（${base} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
rep("    const pfGuard = me === 'r' && L.depth >= 2 && !S.used.art.b;",
    "    const pfGuard = me === 'r' && L.depth >= 2 && !S.used.art.b && !(typeof process !== 'undefined' && process.env && process.env.BFAI_BS_NOGUARD);");
const file = path.join(os.tmpdir(), `bfai_noguard_${base}_${process.pid}.js`);
fs.writeFileSync(file, s);
module.exports = require(file);
