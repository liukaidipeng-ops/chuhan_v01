// 电脑变体（只供模拟）：背水一战第二版用的电脑 = b18c278 + 让楚方真会用背水（攻、守都算）
//   第一版（bfai_beishui.js）只降了候选的静态门槛，独立核查发现真正卡住的是后面那道“比最好的普通着法多赚 5 分才用”（PF_MIN），
//   再加上估值里“没用的主帅兵法”本身记 3 分——等于要多赚约 8 分，背水几乎从不出手（10 局用 0～2 次）。
//   这一版在 CFG.beishui.on 时：
//     1. 候选的静态门槛同第一版（2 分；被将军时不设门槛）；
//     2. 去重：落到同一个局面的组合只留一个（被将军时很多组合只是同一着解将 + 另一步顺序不同），再取最好的 8 种；
//     3. 出手门槛 PF_MIN 改用 CFG.beishui.aiMin（默认 1）：估值里留着它本来就值 3 分，再多 1 分就用。
//   没开 beishui.on 时和 b18c278 完全一样。按节点数收手照常有效（nodeCap / L.nodes 都在 b18c278 里；bfsim 会误报“不支持”）。
// 用法：node tools/bfsim.js --ai tools/variants/bfai_beishui2.js --preset bs2-a …
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const base = process.env.BFAI_BS_BASE || 'b18c278';
let s = execFileSync('git', ['show', base + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_beishui2：锚点出现 ${n} 次（${base} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
rep("        pofu = pofu.map(k => { k.gain = score(k.S, me) - base; return k; }).filter(k => k.gain >= 4.5 || decided(k.S, k.ev) === me);",
`        const BSv = !!(CFG.beishui && CFG.beishui.on), bsChk = BSv && A.inCheck(S, 'b');   // 变体·背水二：攻守都算
        pofu = pofu.map(k => { k.gain = score(k.S, me) - base; return k; }).filter(k => k.gain >= (BSv ? 2 : 4.5) || decided(k.S, k.ev) === me || bsChk);
        if (BSv) { const seen = new Set(); pofu = pofu.filter(k => { const key = (k.up ? k.up.at.join(',') : '') + '|' + k.S.board.map(row => row.map(p => (p ? p.id + ':' + p.hp + ':' + p.lv : '')).join(',')).join('/'); if (seen.has(key)) return false; seen.add(key); return true; }); }`);
rep("      const PF_MIN = 5, need = bestV + PF_MIN,",
    "      const PF_MIN = CFG.beishui && CFG.beishui.on ? (CFG.beishui.aiMin != null ? CFG.beishui.aiMin : 1) : 5 /* 变体·背水二 */, need = bestV + PF_MIN,");
const file = path.join(os.tmpdir(), `bfai_beishui2_${base}_${process.pid}.js`);
fs.writeFileSync(file, s);
module.exports = require(file);
