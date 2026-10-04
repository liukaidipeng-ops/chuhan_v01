// independent re-check of B11: tool's SPRT (bfsim.js:538-548), check after every 2 games, cap 600
const sig = e => 1 / (1 + Math.pow(10, -e / 400));
const elo = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
const s0 = sig(-30), s1 = sig(10), B = Math.log(19);
function llr(xs, n, sum, sum2){ const m=sum/n, v=sum2/n-m*m; return v>1e-9 ? (s1-s0)*(2*m*n-n*(s0+s1))/(2*v) : 0; }
function one(pR, pB, draw, cap){ let n=0,s=0,s2=0; for(let i=0;i<cap/2;i++){ for(const p of [pR,pB]){ const u=Math.random(); const x = u<draw?0.5:(Math.random()<p?1:0); n++; s+=x; s2+=x*x; } const L=llr(null,n,s,s2); if(L>=B) return ['pass',n,s/n]; if(L<=-B) return ['fail',n,s/n]; } return ['none',n,s/n]; }
const N=20000;
for (const [name,pR,pB,draw] of [['iid 0.5',0.5,0.5,0],['colour 36/64',0.36,0.64,0],['colour 36/64 + 5% draws',0.36,0.64,0.05],['iid +10 Elo',sig(10),sig(10),0],['iid -10',sig(-10),sig(-10),0],['iid +20',sig(20),sig(20),0],['iid -30',sig(-30),sig(-30),0]]) {
  let c={pass:0,fail:0,none:0}, nsum=0, noneScores=[];
  for(let t=0;t<N;t++){ const [r,n,sc]=one(pR,pB,draw,600); c[r]++; nsum+=n; if(r==='none') noneScores.push(sc); }
  noneScores.sort((a,b)=>a-b); const q=f=>noneScores.length?elo(noneScores[Math.floor(f*(noneScores.length-1))]).toFixed(0):'-';
  console.log(`${name.padEnd(26)} pass ${(100*c.pass/N).toFixed(1)}% fail ${(100*c.fail/N).toFixed(1)}% none ${(100*c.none/N).toFixed(1)}% meanN ${(nsum/N).toFixed(0)} | none-case Elo 5/50/95%: ${q(.05)} ${q(.5)} ${q(.95)}`);
}
