'use strict';
// C8 核查：校尉时间模式（mid，三层无上限）下 b18c278 比 25eb911 多出来的节点 / CPU，各改动各占多少
const path = require('path');
const SP = path.join(__dirname, '..');
const engDir = '/home/user/chuhan_v01/source/src';
global.XQ = require(path.join(engDir, 'rules.js'));
const BF = global.BF = require(path.join(engDir, 'bingfa.js'));
const old = require(path.join(SP, 'bfai_25eb911.js'));
const V = {
  old,
  full: require('./full.js'),
  noup: require('./noup.js'),
  nopf: require('./nopf.js'),
  noup_nopf: require('./noup_nopf.js'),
};
process.env.BFAI_CX = '0'; V.cx0 = require('./cx0.js'); delete process.env.BFAI_CX;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
const setLv = (X, lv, patch) => { const L = X.LEVELS[lv]; for (const k of Object.keys(patch)) { if (patch[k] === undefined) delete L[k]; else L[k] = patch[k]; } };
async function genPositions(seed, plies, every) {
  const X = old; setLv(X, 'mid', { nodes: 6000 });
  Math.random = mulberry32(seed * 2654435761);
  const g = new BF.Game(); const out = [];
  for (let ply = 0; ply < plies && !g.result; ply++) {
    if (ply % every === 0 && ply >= 4) out.push({ seed, ply, S: BF.cloneState(g.S) });
    if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); continue; }
    const seq = await X.think(BF.cloneState(g.S), 'mid');
    for (const a of seq) { if (!g.apply(a)) throw new Error('非法'); }
  }
  setLv(X, 'mid', { nodes: undefined });
  return out;
}
(async () => {
  const pos = [...(await genPositions(11, 66, 3)), ...(await genPositions(12, 66, 3))];
  console.log('局面数', pos.length);
  const names = Object.keys(V), tot = {}, rows = [];
  for (const nm of names) tot[nm] = { nodes: 0, cpu: 0 };
  for (const p of pos) {
    const row = { id: `${p.seed}/${p.ply}`, turn: p.S.turn };
    for (const nm of names) {
      const X = V[nm];
      Math.random = mulberry32(777 + p.ply);
      const c0 = cpuMs();
      await X.think(BF.cloneState(p.S), 'mid');
      const c = cpuMs() - c0, st = X.think.last;
      tot[nm].nodes += st.nodes; tot[nm].cpu += c;
      row[nm] = { n: st.n, nodes: st.nodes, d: st.depth, cpu: Math.round(c) };
    }
    rows.push(row);
    console.log(row.id, row.turn, names.map(nm => `${nm}:n${row[nm].n}/N${row[nm].nodes}/${row[nm].cpu}ms`).join(' '));
  }
  console.log('\n== 合计（40 局面）==');
  for (const nm of names) console.log(`${nm.padEnd(10)} 平均节点 ${Math.round(tot[nm].nodes / pos.length)}  平均CPU ${Math.round(tot[nm].cpu / pos.length)} ms`);
  const withUp = rows.filter(r => r.full.n > r.noup.n);
  console.log(`\n有升级候选进根的局面 ${withUp.length}/${rows.length}；根着法数 full/noup 比值：` + withUp.map(r => (r.full.n / r.noup.n).toFixed(2)).join(','));
  const rat = rows.map(r => r.full.n / r.noup.n); console.log('全部局面根着法数平均比值', (rat.reduce((a, b) => a + b, 0) / rat.length).toFixed(2));
})().catch(e => { console.error(e); process.exit(1); });
