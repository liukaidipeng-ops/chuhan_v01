'use strict';
const L = require('./tools/bfai_exam_lib.js');
const { Q, play, desc, resetPid } = L;
const BF = global.BF;
(async () => {
  const want = ['7 ', '20 ', '23 ', '26 ', '实2 ', '30 ', '2 '];
  for (const q of Q) {
    if (!want.some(w => q.name.startsWith(w))) continue;
    resetPid(); const g0 = q.build(); const S0 = g0.S;
    // main actions only (no upgrade prefix)
    const kids = [...BF.ai.expand(S0), ...BF.ai.pofuPairs(S0)].filter(k => k.S.turn !== S0.turn);
    let ok = 0; const fails = [];
    for (const k of kids) { resetPid(); const g = q.build(); const r = await q.check([JSON.parse(JSON.stringify(k.a))], g); if (r === true) ok++; else fails.push(desc(S0, k.a)); }
    console.log(q.name, 'turn', S0.turn, 'main-only pass', ok + '/' + kids.length, 'fails:', fails.slice(0,6).join(' '));
  }
  const side = { r: 0, b: 0 };
  for (const q of Q) { if (q.multi || q.disabled) { console.log('skip', q.name); continue; } resetPid(); const g = q.build(); side[g.S.turn]++; if (g.S.turn==='b') console.log('楚走:', q.name); }
  console.log(side, 'total', Q.length);
})();
