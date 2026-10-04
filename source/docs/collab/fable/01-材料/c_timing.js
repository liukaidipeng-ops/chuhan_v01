// 路线 C：b18c278 与线上 25eb911 在“按时间收手”（网页实际模式）和“按节点收手”（测试模式）下的表现对比
// 用法：node c_timing.js [engineDir] [--quick]
//   engineDir 默认 /home/user/chuhan_v01/source/src（dev 引擎）；传 live_engine 用线上 686d6b3 的引擎
'use strict';
const path = require('path');
const SP = __dirname;
const argv = process.argv.slice(2);
const engDir = argv.find(a => !a.startsWith('--')) || '/home/user/chuhan_v01/source/src';
const quick = argv.includes('--quick');
global.XQ = require(path.join(engDir, 'rules.js'));
const BF = global.BF = require(path.join(engDir, 'bingfa.js'));
const AIS = { old: require(path.join(SP, 'bfai_25eb911.js')), new: require(path.join(SP, 'bfai_b18c278.js')) };
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const realNow = performance.now.bind(performance);
let scale = 1;   // 模拟慢设备：电脑眼里的时间走得快 scale 倍
performance.now = () => realNow() * scale;
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
const setLv = (X, lv, patch) => { const L = X.LEVELS[lv]; for (const k of Object.keys(patch)) { if (patch[k] === undefined) delete L[k]; else L[k] = patch[k]; } };
const keyA = a => JSON.stringify(a);

async function genPositions(seed, plies, every) {
  // 用旧电脑（线上版）低节点自对弈产生局面，每 every 步存一个
  const X = AIS.old; setLv(X, 'mid', { nodes: 6000 });
  Math.random = mulberry32(seed * 2654435761);
  const g = new BF.Game(); const out = [];
  for (let ply = 0; ply < plies && !g.result; ply++) {
    if (ply % every === 0 && ply >= 4) out.push({ seed, ply, S: BF.cloneState(g.S) });
    if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); continue; }
    const seq = await X.think(BF.cloneState(g.S), 'mid');
    for (const a of seq) { if (!g.apply(a)) throw new Error('非法 ' + JSON.stringify(a)); }
  }
  setLv(X, 'mid', { nodes: undefined });
  return out;
}
async function runOne(X, S, lv, seed) {
  Math.random = mulberry32(seed);
  const c0 = cpuMs(), w0 = realNow();
  const seq = await X.think(BF.cloneState(S), lv);
  const c1 = cpuMs(), w1 = realNow();
  const st = X.think.last || {};
  return { seq, nodes: st.nodes, depth: st.depth, cpu: c1 - c0, wall: w1 - w0, msSeen: st.ms, n: st.n };
}
const stat = xs => { const s = xs.slice().sort((a, b) => a - b); const q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return { n: s.length, mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(0), med: q(0.5), p90: q(0.9), max: s[s.length - 1] }; };
const fmt = o => `n=${o.n} 平均 ${o.mean} 中位 ${o.med} P90 ${o.p90} 最大 ${o.max}`;

(async () => {
  console.log(`引擎目录：${engDir}  BF.ai.version=${BF.ai.version}  旧 apiVersion=${AIS.old.apiVersion} 新 apiVersion=${AIS.new.apiVersion}`);
  console.log(`LEVELS 旧 hard=${JSON.stringify(AIS.old.LEVELS.hard)}  新 hard=${JSON.stringify(AIS.new.LEVELS.hard)}`);
  const pos = [...(await genPositions(11, 66, 3)), ...(await genPositions(12, 66, 3))];
  console.log(`局面数 ${pos.length}（两局旧电脑自对弈，每 3 步取一个，第 4 步起）`);
  // A. 校尉档：时间模式（网页实际）vs 节点模式（测试）；同一个随机种子
  for (const name of ['old', 'new']) {
    const X = AIS[name];
    const T = { nodes: [], cpu: [], depth: [] }, N = { nodes: [], depth: [] };
    let diff = 0, cut = 0;
    for (const p of pos) {
      setLv(X, 'mid', { nodes: undefined });
      const t = await runOne(X, p.S, 'mid', 777 + p.ply);
      setLv(X, 'mid', { nodes: 60000 });
      const n = await runOne(X, p.S, 'mid', 777 + p.ply);
      setLv(X, 'mid', { nodes: undefined });
      T.nodes.push(t.nodes); T.cpu.push(t.cpu); T.depth.push(t.depth); N.nodes.push(n.nodes); N.depth.push(n.depth);
      if (n.depth < 3) cut++;
      if (keyA(t.seq) !== keyA(n.seq)) { diff++; if (diff <= 3) console.log(`  [${name}] 局面 seed${p.seed}/ply${p.ply}：时间模式 ${keyA(t.seq)}（${t.nodes} 节点，${t.depth} 层） ≠ 节点模式 ${keyA(n.seq)}（${n.nodes} 节点，${n.depth} 层）`); }
    }
    const nps = T.nodes.reduce((a, b) => a + b, 0) / (T.cpu.reduce((a, b) => a + b, 0) / 1000);
    console.log(`\n== 校尉 ${name === 'old' ? '线上 25eb911' : '候选 b18c278'} ==`);
    console.log(`时间模式（网页实际；校尉三层必算完）：节点 ${fmt(stat(T.nodes))}；CPU 毫秒 ${fmt(stat(T.cpu))}；每秒节点（CPU 时间）≈ ${Math.round(nps)}；三层算满 ${T.depth.filter(d => d >= 3).length}/${pos.length}`);
    console.log(`节点模式 mid=60000（测试）：节点 ${fmt(stat(N.nodes))}；没算满三层 ${cut}/${pos.length}；和时间模式选的着法不同 ${diff}/${pos.length}`);
  }
  // B. 霸王档：节点模式 200000 的 CPU 成本；时间模式 budget 3000（Worker 里）在正常 / 3 倍慢设备下的表现
  const sub = pos.filter((_, i) => i % (quick ? 8 : 4) === 2);
  for (const name of ['old', 'new']) {
    const X = AIS[name];
    console.log(`\n== 霸王 ${name === 'old' ? '线上 25eb911' : '候选 b18c278'}（${sub.length} 个局面）==`);
    setLv(X, 'hard', { nodes: 200000 });
    const H = [];
    for (const p of sub) H.push(await runOne(X, p.S, 'hard', 999 + p.ply));
    setLv(X, 'hard', { nodes: undefined });
    const nps = H.reduce((a, b) => a + b.nodes, 0) / (H.reduce((a, b) => a + b.cpu, 0) / 1000);
    console.log(`节点模式 hard=200000：节点 ${fmt(stat(H.map(h => h.nodes)))}；层数 ${H.map(h => h.depth).join(',')}；每秒节点（CPU）≈ ${Math.round(nps)}`);
    for (const sc of [1, 3]) {
      scale = sc;
      const R = [];
      for (const p of sub) R.push(await runOne(X, p.S, 'hard', 999 + p.ply));
      scale = 1;
      console.log(`时间模式 budget=${X.LEVELS.hard.budget}（设备慢 ${sc} 倍）：电脑眼里的毫秒 ${fmt(stat(R.map(r => Math.round(r.msSeen))))}；实际墙钟毫秒 ${fmt(stat(R.map(r => Math.round(r.wall))))}；节点 ${fmt(stat(R.map(r => r.nodes)))}；层数 ${R.map(r => r.depth).join(',')}`);
    }
  }
  // C. 主线程兜底（tick 存在：budget 压到 1400）：霸王档
  for (const name of ['old', 'new']) {
    const X = AIS[name]; const R = [];
    scale = 3;
    for (const p of sub) { Math.random = mulberry32(5 + p.ply); const c0 = cpuMs(), w0 = realNow(); let ticks = 0; await X.think(BF.cloneState(p.S), 'hard', () => { ticks++; return new Promise(r => setImmediate(r)); }); R.push({ wall: realNow() - w0, cpu: cpuMs() - c0, nodes: X.think.last.nodes, depth: X.think.last.depth, msSeen: X.think.last.ms, ticks }); }
    scale = 1;
    console.log(`\n主线程兜底 霸王 ${name === 'old' ? '线上' : '候选'}（设备慢 3 倍，budget 1400）：电脑眼里的毫秒 ${fmt(stat(R.map(r => Math.round(r.msSeen))))}；节点 ${fmt(stat(R.map(r => r.nodes)))}；层数 ${R.map(r => r.depth).join(',')}；让出主线程次数 ${fmt(stat(R.map(r => r.ticks)))}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
