// Q3/Q4 arithmetic (Fable). Pure numbers, no game code.
const sig = e => 1 / (1 + Math.pow(10, -e / 400));
const elo = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
const f = x => (x >= 0 ? '+' : '') + x.toFixed(1);
console.log('== Q3: H15 decomposition ==');
const nR = 54, wR = 24, nB = 53, wB = 41;   // new as 汉 / as 楚
const pR = wR / nR, pB = wB / nB, n = nR + nB, m = (wR + wB) / n;
console.log(`new as 汉 ${wR}/${nR} = ${(100*pR).toFixed(1)}%  Elo ${f(elo(pR))};  new as 楚 ${wB}/${nB} = ${(100*pB).toFixed(1)}%  Elo ${f(elo(pB))}`);
console.log(`old as 汉 ${nB-wB}/${nB} = ${(100*(1-pB)).toFixed(1)}%;  old as 楚 ${nR-wR}/${nR} = ${(100*(1-pR)).toFixed(1)}%`);
console.log(`pooled ${wR+wB}/${n} = ${(100*m).toFixed(1)}%  Elo ${f(elo(m))}`);
const d = (elo(pB) + elo(pR)) / 2, c = (elo(pB) - elo(pR)) / 2;
console.log(`strength d = (Elo楚 + Elo汉)/2 = ${f(d)};  colour c = (Elo楚 - Elo汉)/2 = ${f(c)} (楚 advantage in this match)`);
const base = 0.36;
console.log(`baseline equal-AI 汉 ${base} -> colour Elo ${f(elo(base))} (i.e. 楚 ${f(-elo(base))})`);
console.log(`prediction if new is uniformly +${elo(m).toFixed(0)} Elo and colour = baseline: as 汉 ${(100*sig(elo(m)+elo(base))).toFixed(1)}%, as 楚 ${(100*sig(elo(m)-elo(base))).toFixed(1)}%`);
console.log(`prediction with d=${d.toFixed(0)}: as 汉 ${(100*sig(d+elo(base))).toFixed(1)}%, as 楚 ${(100*sig(d-elo(base))).toFixed(1)}%`);
console.log(`points over baseline: new as 汉 ${f(100*(pR-base))}, new as 楚 ${f(100*(pB-(1-base)))}; old as 汉 ${f(100*((1-pB)-base))}, old as 楚 ${f(100*((1-pR)-(1-base)))}`);
console.log(`Elo over baseline: new as 汉 ${f(elo(pR)-elo(base))}, new as 楚 ${f(elo(pB)+elo(base))}`);
// SEs
const seR = Math.sqrt(pR*(1-pR)/nR), seB = Math.sqrt(pB*(1-pB)/nB);
const eloSe = (p, se) => (elo(p+se) - elo(p-se)) / 2;
console.log(`SE per colour: 汉 ±${(100*seR).toFixed(1)} pts (≈±${eloSe(pR,seR).toFixed(0)} Elo), 楚 ±${(100*seB).toFixed(1)} pts (≈±${eloSe(pB,seB).toFixed(0)} Elo)`);
const seD = Math.sqrt(eloSe(pR,seR)**2 + eloSe(pB,seB)**2) / 2;
console.log(`SE of d and of c ≈ ±${seD.toFixed(0)} Elo; difference of colour-specific gains (114-61=53) / SE(${(2*seD).toFixed(0)}) = ${((elo(pB)+elo(base)-(elo(pR)-elo(base)))/(2*seD)).toFixed(2)} sigma`);
// variance decomposition
const vGame = m*(1-m), within = (pR*(1-pR)+pB*(1-pB))/2, between = ((pB-pR)/2)**2;
console.log(`game-level variance ${vGame.toFixed(4)} = within-colour ${within.toFixed(4)} + colour-split ${between.toFixed(4)} (${(100*between/vGame).toFixed(1)}% of total)`);
const se1 = Math.sqrt(vGame/n), se2 = Math.sqrt(within/n);
console.log(`95% CI (tool, game-level): ${(100*(m-1.96*se1)).toFixed(1)}–${(100*(m+1.96*se1)).toFixed(1)}% -> Elo ${f(elo(m-1.96*se1))} … ${f(elo(m+1.96*se1))}`);
console.log(`95% CI (colour-stratified): ${(100*(m-1.96*se2)).toFixed(1)}–${(100*(m+1.96*se2)).toFixed(1)}% -> Elo ${f(elo(m-1.96*se2))} … ${f(elo(m+1.96*se2))}`);

console.log('\n== Q4: SPRT [-30,10], alpha=beta=0.05 ==');
const s0 = sig(-30), s1 = sig(10), sbar = (s0+s1)/2, bound = Math.log(0.95/0.05);
console.log(`s0=${s0.toFixed(4)} s1=${s1.toFixed(4)} midpoint=${sbar.toFixed(4)} (= Elo ${elo(sbar).toFixed(0)}), bound=${bound.toFixed(3)}`);
const llr = (mm, nn) => { const v = mm*(1-mm); return (s1-s0)*(2*mm*nn - nn*(s0+s1))/(2*v); };
console.log(`H15 check: 64/106 -> LLR ${llr(64/106,106).toFixed(2)};  65/107 -> ${llr(65/107,107).toFixed(2)}`);
console.log(`H8 check: 52.9% at 288 -> LLR ${llr(0.529,288).toFixed(2)}`);
console.log(`H14 check: 70/120 -> LLR ${llr(70/120,120).toFixed(2)}`);
console.log('true score | true Elo | drift/game | expected games to decide | P(pass, no cap) | P(pass within 600)');
for (const p of [0.40, 0.4569, 0.48, 0.4856, 0.50, 0.5144, 0.53, 0.55, 0.58, 0.607, 0.65]) {
  const v = p*(1-p), mu = (s1-s0)*(p-sbar)/v, s2 = (s1-s0)**2/v;
  const a = bound, b = bound;
  const r = 2*mu/s2;
  const Ppass = Math.abs(mu) < 1e-9 ? 0.5 : (1 - Math.exp(-r*a)) / (1 - Math.exp(-r*(a+b)));
  const En = Math.abs(mu) < 1e-9 ? a*b/s2 : (Ppass*b - (1-Ppass)*a)/mu;
  // P(pass within 600) by simulation of a normal random walk, check every 2 games
  let pass = 0, fail = 0, N = 20000;
  for (let t = 0; t < N; t++) { let L = 0, k = 0; for (; k < 600; k += 2) { L += 2*mu + Math.sqrt(2*s2)*gauss(); if (L >= bound) { pass++; break; } if (L <= -bound) { fail++; break; } } }
  console.log(`${p.toFixed(4)} | ${elo(p).toFixed(0).padStart(5)} | ${mu.toFixed(4)} | ${En.toFixed(0).padStart(5)} | ${(100*Ppass).toFixed(0)}% | pass ${(100*pass/N).toFixed(0)}%  fail ${(100*fail/N).toFixed(0)}%  no-conclusion ${(100*(N-pass-fail)/N).toFixed(0)}%`);
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
// bias of the stopped estimate at true 0.58 / 0.607 (simulate Bernoulli games with early stop, cap 600)
console.log('\nwinner\'s-curse: mean score at stop when SPRT passes (Bernoulli sim, cap 600)');
for (const p of [0.55, 0.58, 0.607]) {
  let sum = 0, cnt = 0, sumN = 0, N = 4000;
  for (let t = 0; t < N; t++) { let w = 0, k = 0, stopped = false; for (k = 1; k <= 600; k++) { if (Math.random() < p) w++; if (k % 2 === 0) { const L = llr(w/k, k); if (L >= bound) { stopped = true; break; } if (L <= -bound) { stopped = 'fail'; break; } } } if (stopped === true) { sum += w/k; cnt++; sumN += k; } }
  console.log(`true ${p}: passes ${(100*cnt/N).toFixed(0)}%, mean score at pass ${(100*sum/cnt).toFixed(1)}% (Elo ${f(elo(sum/cnt))} vs true ${f(elo(p))}), mean games ${(sumN/cnt).toFixed(0)}`);
}
console.log('\n== alternative bounds ==');
for (const [e0,e1] of [[-30,10],[-20,20],[0,40],[-10,30],[-25,5]]) {
  const S0 = sig(e0), S1 = sig(e1), sb=(S0+S1)/2;
  const row = [0.5, 0.55, 0.607].map(p => { const v=p*(1-p), mu=(S1-S0)*(p-sb)/v, s2=(S1-S0)**2/v, r=2*mu/s2; const P = Math.abs(mu)<1e-9?0.5:(1-Math.exp(-r*bound))/(1-Math.exp(-2*r*bound)); const En = Math.abs(mu)<1e-9? bound*bound/s2 : (P*bound-(1-P)*bound)/mu; return `@${p}: pass ${(100*P).toFixed(0)}% E[n]=${En.toFixed(0)}`; });
  console.log(`[${e0},${e1}] midpoint Elo ${elo(sb).toFixed(0)}: ` + row.join(' | '));
}
console.log('\n== Q5: 60 games at seed 7001 ==');
const p0 = 65/107, se60 = Math.sqrt(p0*(1-p0)/60), seDiff = Math.sqrt(p0*(1-p0)/107 + p0*(1-p0)/60);
console.log(`if true = 60.7%: 60-game score 95% range ${(100*(p0-1.96*se60)).toFixed(1)}–${(100*(p0+1.96*se60)).toFixed(1)}% = ${Math.ceil(60*(p0-1.96*se60))}–${Math.floor(60*(p0+1.96*se60))} points of 60`);
console.log(`consistency test (two independent estimates): |diff| < 1.96*${(100*seDiff).toFixed(1)} = ${(100*1.96*seDiff).toFixed(1)} pts -> accept if 60-game score in ${(100*(p0-1.96*seDiff)).toFixed(1)}–${(100*(p0+1.96*seDiff)).toFixed(1)}% = ${Math.ceil(60*(p0-1.96*seDiff))}–${Math.floor(60*(p0+1.96*seDiff))} points`);
console.log(`60-game CI half-width if score ~60%: ±${(100*1.96*Math.sqrt(0.24/60)).toFixed(1)} pts ≈ ±${(elo(0.6+1.96*Math.sqrt(0.24/60))-elo(0.6)).toFixed(0)} Elo`);
console.log(`per colour (30 games): SE ±${(100*Math.sqrt(0.25/30)).toFixed(1)} pts`);
for (const w of [36,38,40,41,42]) console.log(`LLR at ${w}/60 = ${llr(w/60,60).toFixed(2)}`);
console.log(`P(SPRT passes within 60 games | true 0.607): see sim`);
{ let pass=0, N=20000; for (let t=0;t<N;t++){ let w=0; for(let k=1;k<=60;k++){ if(Math.random()<p0) w++; if(k%2===0 && llr(w/k,k)>=bound){pass++;break;} } } console.log(`  ≈ ${(100*pass/N).toFixed(0)}%`); }
console.log(`pooled 167 games if 60-game result ~ 36/60: ${((65+36)/167*100).toFixed(1)}%, CI ±${(100*1.96*Math.sqrt(0.24/167)).toFixed(1)} pts`);
