'use strict';
// 最坏局面（Fable 的种子 21 第 16/18/20 步）+ 一批“汉走、楚破釜未用”的局面：按提交号整份取引擎和电脑，校尉按时间收手量 CPU
//   node worst_rev.js gen  → 生成局面存 worst_states.json（用当前工作区引擎 + 25eb911 电脑，和 c_worst.js 同法）
//   node worst_rev.js <提交号> → 用那个提交的 rules / bingfa / bfai 量
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const SP = __dirname, OUT = path.join(SP, 'worst_states.json');
function mulberry32(a){return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const cpuMs=()=>{const u=process.cpuUsage();return (u.user+u.system)/1000;};
(async () => {
  const arg = process.argv[2];
  if (arg === 'gen') {
    global.XQ = require('/home/user/chuhan_v01/source/src/rules.js'); const BF = global.BF = require('/home/user/chuhan_v01/source/src/bingfa.js');
    const OLD = require(path.join(SP, 'bfai_25eb911.js')); OLD.LEVELS.mid.nodes = 6000;
    const out = [];
    for (const seed of [21, 3, 7, 11, 15]) {
      Math.random = mulberry32(seed * 2654435761); const g = new BF.Game();
      for (let ply = 0; ply < 40 && !g.result; ply++) {
        if (g.turn === 'r' && !g.S.used.art.b && ply >= 10 && (seed === 21 ? [16, 18, 20].includes(ply) : ply % 4 === 0)) out.push({ seed, ply, S: BF.cloneState(g.S) });
        if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); continue; }
        const seq = await OLD.think(BF.cloneState(g.S), 'mid'); for (const a of seq) g.apply(a);
      }
    }
    fs.writeFileSync(OUT, JSON.stringify(out)); console.log('局面', out.length); return;
  }
  const rev = arg, dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worst-')), tar = path.join(dir, 's.tar');
  execFileSync('git', ['archive', '-o', tar, rev, 'source/src'], { cwd: '/home/user/chuhan_v01' }); execFileSync('tar', ['-xf', tar, '-C', dir]);
  global.XQ = require(path.join(dir, 'source/src/rules.js')); const BF = global.BF = require(path.join(dir, 'source/src/bingfa.js')); const AI = require(path.join(dir, 'source/src/bfai.js'));
  const pos = JSON.parse(fs.readFileSync(OUT, 'utf8')); const rows = [];
  for (const p of pos) { Math.random = mulberry32(31 + p.ply); const c0 = cpuMs(); await AI.think(BF.cloneState(p.S), 'mid'); rows.push({ seed: p.seed, ply: p.ply, ms: Math.round(cpuMs() - c0), nodes: AI.think.last.nodes, depth: AI.think.last.depth }); }
  const ms = rows.map(r => r.ms).sort((a, b) => a - b), q = x => ms[Math.min(ms.length - 1, Math.floor(x * ms.length))];
  console.log(`${rev}：${rows.length} 个局面 CPU 平均 ${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms，中位 ${q(0.5)}，P90 ${q(0.9)}，最慢 ${ms[ms.length - 1]}；种子 21：${rows.filter(r => r.seed === 21).map(r => `第 ${r.ply} 步 ${r.ms} ms`).join('，')}`);
})();
