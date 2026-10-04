// skeptic B8: coverage of the tool's naive 95% CI after SPRT[-30,10] early stop; P(pass & CI lo>0)
const sig = e => 1/(1+Math.pow(10,-e/400)); const bound=Math.log(19);
const s0=sig(-30), s1=sig(10);
const llr=(m,n)=>{const v=m*(1-m);return v>1e-9?(s1-s0)*(2*m*n-n*(s0+s1))/(2*v):0;};
const N=+process.argv[2]||5000;
for (const e of [-30,-20,-10,0,10,35,55,76]) {
  const p=sig(e); let pass=0, passLo0=0, cover=0, covN=0, sumElo=0;
  for (let t=0;t<N;t++){ let w=0,k=0,st=null; for(k=1;k<=600;k++){ if(Math.random()<p) w++; if(k%2===0){const L=llr(w/k,k); if(L>=bound){st='H1';break;} if(L<=-bound){st='H0';break;}} }
    if(k>600)k=600; const m=w/k, se=Math.sqrt(m*(1-m)/k), lo=m-1.96*se, hi=m+1.96*se;
    covN++; if(p>=lo&&p<=hi) cover++;
    if(st==='H1'){pass++; if(lo>0.5) passLo0++;}
  }
  console.log(`true ${e>=0?'+':''}${e} Elo: pass ${(100*pass/N).toFixed(1)}%  pass&CI-lo>0 ${(100*passLo0/N).toFixed(1)}%  naive-CI coverage (all runs) ${(100*cover/covN).toFixed(1)}%`);
}
// fixed 200 games, rule: point>=55% and lo>50%
console.log('-- fixed 200, rule point>=55% & lo>50% --');
for (const e of [0,10,20,35,55,76]) { const p=sig(e); let ok=0, okLo=0; for(let t=0;t<N;t++){let w=0;for(let k=0;k<200;k++) if(Math.random()<p)w++; const m=w/200, lo=m-1.96*Math.sqrt(m*(1-m)/200); if(lo>0.5){okLo++; if(m>=0.55) ok++;}} console.log(`true +${e}: P(lo>50%) ${(100*okLo/N).toFixed(1)}%  P(both) ${(100*ok/N).toFixed(1)}%`); }
