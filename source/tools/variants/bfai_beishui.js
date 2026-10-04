// 电脑变体（只供模拟）：在 b18c278 的电脑上，让楚方把“背水一战”也当防守手段来比
//   原版只在破釜的两步能静态多赚 4.5 分以上（或直接分出胜负）时才把它放进搜索——那是“进攻专用”的设定。
//   背水一战是落后方的翻盘 / 救急手段，用户要的是“可以进攻也可以防守”，所以开了 CFG.beishui.on 时：
//     门槛降到 2 分；楚方被将军时不设门槛（引擎变体那边这时也会列出不打子的两步组合），最好的 8 种交给搜索去和普通着法比。
//   没开 beishui.on（或引擎里没有这一项）时和 b18c278 完全一样。
//   基础版本可用环境变量 BFAI_BS_BASE 换（默认 b18c278）。
// 用法：node tools/bfsim.js --ai tools/variants/bfai_beishui.js --preset bs-a …
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const base = process.env.BFAI_BS_BASE || 'b18c278';
let s = execFileSync('git', ['show', base + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_beishui：锚点出现 ${n} 次（${base} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
rep("        pofu = pofu.map(k => { k.gain = score(k.S, me) - base; return k; }).filter(k => k.gain >= 4.5 || decided(k.S, k.ev) === me);",
`        const BSv = !!(CFG.beishui && CFG.beishui.on), bsChk = BSv && A.inCheck(S, 'b');   // 变体·背水：也当防守手段
        pofu = pofu.map(k => { k.gain = score(k.S, me) - base; return k; }).filter(k => k.gain >= (BSv ? 2 : 4.5) || decided(k.S, k.ev) === me || bsChk);`);
const file = path.join(os.tmpdir(), `bfai_beishui_${base}_${process.pid}.js`);
fs.writeFileSync(file, s);
module.exports = require(file);
