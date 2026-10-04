// 路线 C：b18c278 里“节点数之外”的开销——pofuPairs（提防破釜）在汉方思考里占多少 CPU；将军延伸（CX=2 对 CX=0）让三层树大多少
'use strict';
const path = require('path');
const fs = require('fs');
const SP = __dirname;
global.XQ = require('/home/user/chuhan_v01/source/src/rules.js');
const BF = global.BF = require('/home/user/chuhan_v01/source/src/bingfa.js');
const OLD = require(path.join(SP, 'bfai_25eb911.js'));
const NEW = require(path.join(SP, 'bfai_b18c278.js'));
process.env.BFAI_CX = '0';
fs.copyFileSync(path.join(SP, 'bfai_b18c278.js'), path.join(SP, 'bfai_b18c278_cx0.js'));
const NEW0 = require(path.join(SP, 'bfai_b18c278_cx0.js'));
delete process.env.BFAI_CX;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
// 给 pofuPairs 计数、计时
const A = BF.ai; const real = A.pofuPairs; let pfCalls = 0, pfMs = 0, pfOut = 0;
A.pofuPairs = function (S) { const c0 = cpuMs(); const r = real.call(this, S); pfMs += cpuMs() - c0; pfCalls++; pfOut += r.length; return r; };
async function genPositions(seed, plies, every) {
  OLD.LEVELS.mid.nodes = 6000;
  Math.random = mulberry32(seed * 2654435761);
  const g = new BF.Game(); const out = [];
  for (let ply = 0; ply < plies && !g.result; ply++) {
    if (ply % every === 0 && ply >= 4) out.push({ seed, ply, side: g.turn, S: BF.cloneState(g.S), pofuLeft: !g.S.used.art.b, meritB: g.S.merit.b });
    if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); continue; }
    const seq = await OLD.think(BF.cloneState(g.S), 'mid');
    for (const a of seq) { if (!g.apply(a)) throw new Error('非法 ' + JSON.stringify(a)); }
  }
  delete OLD.LEVELS.mid.nodes;
  return out;
}
(async () => {
  const pos = [...(await genPositions(21, 60, 2)), ...(await genPositions(22, 60, 2))];
  console.log(`局面 ${pos.length}；其中汉方走且楚方破釜还在手里 ${pos.filter(p => p.side === 'r' && p.pofuLeft).length}`);
  // 1. 汉方思考（校尉，时间模式）：pofuPairs 占的 CPU 份额
  const rows = [];
  for (const p of pos) {
    if (p.side !== 'r') continue;
    pfCalls = 0; pfMs = 0; pfOut = 0;
    Math.random = mulberry32(31 + p.ply);
    const c0 = cpuMs(); await NEW.think(BF.cloneState(p.S), 'mid'); const tot = cpuMs() - c0;
    rows.push({ ply: p.ply, seed: p.seed, pofuLeft: p.pofuLeft, meritB: p.meritB, tot: Math.round(tot), pf: Math.round(pfMs), calls: pfCalls, pairs: pfOut, nodes: NEW.think.last.nodes });
  }
  console.log('\n== 汉方走（候选 b18c278，校尉时间模式）：pofuPairs 开销 ==');
  console.log('seed/ply  破釜在手  楚军功  总CPUms  pofuPairs ms  调用次数  组合数  节点');
  for (const r of rows) console.log(`${r.seed}/${String(r.ply).padStart(2)}   ${r.pofuLeft ? '是' : '否'}       ${String(r.meritB).padStart(2)}    ${String(r.tot).padStart(6)}   ${String(r.pf).padStart(8)}     ${String(r.calls).padStart(4)}    ${String(r.pairs).padStart(5)}  ${r.nodes}`);
  const w = rows.filter(r => r.pofuLeft);
  if (w.length) console.log(`破釜在手的 ${w.length} 个局面：pofuPairs 占总 CPU ${(100 * w.reduce((a, r) => a + r.pf, 0) / w.reduce((a, r) => a + r.tot, 0)).toFixed(0)}%；平均每次思考调用 ${(w.reduce((a, r) => a + r.calls, 0) / w.length).toFixed(0)} 次`);
  // 2. 将军延伸 CX=2 对 CX=0：同一局面三层树的节点数（时间模式，确定性的）
  let n2 = 0, n0 = 0, c2 = 0, c0s = 0, same = 0;
  for (const p of pos) {
    Math.random = mulberry32(41 + p.ply); let t = cpuMs(); const s2 = await NEW.think(BF.cloneState(p.S), 'mid'); c2 += cpuMs() - t; n2 += NEW.think.last.nodes;
    Math.random = mulberry32(41 + p.ply); t = cpuMs(); const s0 = await NEW0.think(BF.cloneState(p.S), 'mid'); c0s += cpuMs() - t; n0 += NEW0.think.last.nodes;
    if (JSON.stringify(s2) === JSON.stringify(s0)) same++;
  }
  console.log(`\n== 将军延伸（校尉时间模式，${pos.length} 个局面）==`);
  console.log(`CX=2：总节点 ${n2}，CPU ${Math.round(c2)} ms；CX=0：总节点 ${n0}，CPU ${Math.round(c0s)} ms；节点 +${(100 * (n2 / n0 - 1)).toFixed(0)}%；着法相同 ${same}/${pos.length}`);
  // 3. 每节点 CPU 成本：旧 vs 新（节点模式 60000，同局面）
  let on = 0, oc = 0, nn = 0, nc = 0;
  OLD.LEVELS.mid.nodes = 60000; NEW.LEVELS.mid.nodes = 60000;
  for (const p of pos.filter((_, i) => i % 3 === 0)) {
    Math.random = mulberry32(51 + p.ply); let t = cpuMs(); await OLD.think(BF.cloneState(p.S), 'mid'); oc += cpuMs() - t; on += OLD.think.last.nodes;
    Math.random = mulberry32(51 + p.ply); t = cpuMs(); await NEW.think(BF.cloneState(p.S), 'mid'); nc += cpuMs() - t; nn += NEW.think.last.nodes;
  }
  console.log(`\n== 每节点 CPU（节点模式 mid=60000）== 旧：${Math.round(on / (oc / 1000))} 节点/秒（${on} 节点 / ${Math.round(oc)} ms）；新：${Math.round(nn / (nc / 1000))} 节点/秒（${nn} 节点 / ${Math.round(nc)} ms）；新每节点贵 ${(100 * ((nc / nn) / (oc / on) - 1)).toFixed(0)}%`);
})().catch(e => { console.error(e); process.exit(1); });
