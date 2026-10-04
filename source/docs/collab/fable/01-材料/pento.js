// pentanomial (paired) vs trinomial (game-level) variance on real local match JSONs
const fs = require('fs');
const elo = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
const sig = e => 1 / (1 + Math.pow(10, -e / 400));
const s0 = sig(-30), s1 = sig(10), bound = Math.log(19);
for (const f of process.argv.slice(2)) {
  const J = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rs = J.results; const args = J.args || {};
  const sc = r => (!r.winner ? 0.5 : (r.winner === (r.flip ? 'b' : 'r') ? 1 : 0));
  const xs = rs.map(sc); const n = xs.length; const m = xs.reduce((a,b)=>a+b,0)/n; const v = xs.reduce((a,b)=>a+b*b,0)/n - m*m;
  // pairs by seed
  const by = {}; for (const r of rs) (by[r.seed] = by[r.seed] || []).push(r);
  const pairs = Object.values(by).filter(p => p.length === 2);
  const ps = pairs.map(p => (sc(p[0]) + sc(p[1])) / 2);   // pair mean score
  const np = ps.length, mp = ps.reduce((a,b)=>a+b,0)/np, vp = ps.reduce((a,b)=>a+b*b,0)/np - mp*mp;
  const asR = rs.filter(r => !r.flip), asB = rs.filter(r => r.flip);
  const pR = asR.map(sc).reduce((a,b)=>a+b,0)/asR.length, pB = asB.map(sc).reduce((a,b)=>a+b,0)/asB.length;
  const within = (pR*(1-pR) + pB*(1-pB))/2, between = ((pB-pR)/2)**2;
  const seG = Math.sqrt(v/n), seP = Math.sqrt(vp/np);   // SE of mean score: game-level vs pair-level
  const cnt = {}; for (const x of ps) cnt[x] = (cnt[x]||0)+1;
  const llrG = (s1-s0)*(2*m*n - n*(s0+s1))/(2*v);
  // pair-level LLR: same formula with pair scores (mean per pair, variance per pair, n = pairs); drift per game = same numerator / 2
  const llrP = (s1-s0)*(2*mp*np - np*(s0+s1))/(2*vp);
  console.log(`${f.split('/').slice(-2).join('/')}: ${args.match ? args.match.join(' vs ') : ''} n=${n} pairs=${np} score ${(100*m).toFixed(1)}% Elo ${elo(m).toFixed(0)}`);
  console.log(`  as 汉 ${(100*pR).toFixed(1)}%  as 楚 ${(100*pB).toFixed(1)}%  | game var ${v.toFixed(4)} = within ${within.toFixed(4)} + colour ${between.toFixed(4)}`);
  console.log(`  pair-score distribution (0 / .5 / 1 = LL / split / WW): ${JSON.stringify(cnt)}  pair var ${vp.toFixed(4)} (independent-games-expected ${(within/2).toFixed(4)})`);
  console.log(`  SE(score): game-level ${(100*seG).toFixed(2)} pts, pair-level ${(100*seP).toFixed(2)} pts  ratio ${(seP/seG).toFixed(2)}`);
  console.log(`  LLR game-level ${llrG.toFixed(2)}  pair-level ${llrP.toFixed(2)}  (bound ±${bound.toFixed(2)})  stoppedAt ${JSON.stringify(J.stats && J.stats.stoppedAt)}`);
}
