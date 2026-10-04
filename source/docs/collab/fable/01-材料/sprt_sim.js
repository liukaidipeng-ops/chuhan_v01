// exact simulation of the tool's SPRT (bfsim.js matchStats, line 536-546): check at every even game count, variance from data, guard v<=1e-9 -> llr 0
const sig = e => 1 / (1 + Math.pow(10, -e / 400));
const elo = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
const s0 = sig(-30), s1 = sig(10), bound = Math.log(19);
const llr = (m, n) => { const v = m*(1-m); return v > 1e-9 ? (s1-s0)*(2*m*n - n*(s0+s1))/(2*v) : 0; };
const run = (p, cap, minN) => { let w = 0; for (let k = 1; k <= cap; k++) { if (Math.random() < p) w++; if (k % 2 === 0 && k >= minN) { const L = llr(w/k, k); if (L >= bound) return { r: 'pass', k, s: w/k }; if (L <= -bound) return { r: 'fail', k, s: w/k }; } } return { r: 'none', k: cap, s: w/cap }; };
const N = 20000;
for (const minN of [0, 20, 40]) {
  console.log(`\n-- minimum games before first check: ${minN}; cap 600 --`);
  console.log('true score (Elo) | pass | fail | none | mean n | pass within 30 games | mean score at pass (Elo)');
  for (const p of [0.4569, 0.4856, 0.50, 0.5144, 0.55, 0.607]) {
    let pass = 0, fail = 0, nsum = 0, early = 0, ssum = 0;
    for (let t = 0; t < N; t++) { const o = run(p, 600, minN); nsum += o.k; if (o.r === 'pass') { pass++; ssum += o.s; if (o.k <= 30) early++; } else if (o.r === 'fail') fail++; }
    console.log(`${p.toFixed(4)} (${elo(p).toFixed(0).padStart(4)}) | ${(100*pass/N).toFixed(1)}% | ${(100*fail/N).toFixed(1)}% | ${(100*(N-pass-fail)/N).toFixed(1)}% | ${(nsum/N).toFixed(0)} | ${(100*early/N).toFixed(1)}% | ${(100*ssum/Math.max(1,pass)).toFixed(1)}% (${elo(ssum/Math.max(1,pass)).toFixed(0)})`);
  }
}
// what lopsided small samples trigger a pass
console.log('\nsmall-n triggers: w/n with LLR >= bound');
for (let n = 2; n <= 30; n += 2) { const hits = []; for (let w = 0; w <= n; w++) if (llr(w/n, n) >= bound) hits.push(w); if (hits.length) console.log(`  n=${n}: pass if wins >= ${hits[0]} (${(100*hits[0]/n).toFixed(0)}%)`); }
