'use strict';
const L = require('../tools/bfai_exam_lib.js');
const { Q, resetPid, desc } = L; const BF = global.BF;
const AI = require('../bfai_b18c278.js'); AI.LEVELS.mid.nodes = 60000;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mp = p => [8 - p[0], p[1]];
// id 对调表：开局位置左右对称的两枚子互换 id
const pos2id = {}; for (const [id, p] of Object.entries(BF.START)) pos2id[p + ''] = +id;
const swapId = id => (BF.START[id] ? pos2id[mp(BF.START[id]) + ''] : id);
const mirrorS = S => { const T = BF.cloneState(S); T.board = S.board.map(row => row.slice().reverse().map(p => (p ? { ...p } : null))); T.dead = { r: S.dead.r.map(d => ({ ...d, id: swapId(d.id) })), b: S.dead.b.map(d => ({ ...d, id: swapId(d.id) })) }; return T; };
const unmirrorA = a => { const b = { ...a }; if (b.from) b.from = mp(b.from); if (b.to) b.to = mp(b.to); if (b.at) b.at = mp(b.at); if (b.k === 'art' && b.id != null) b.id = swapId(b.id); if (b.steps) b.steps = b.steps.map(s => ({ from: mp(s.from), to: mp(s.to) })); return b; };
(async () => {
  const names = (process.argv[2] || '21').split(',');
  for (const q of Q.filter(q => names.some(n => q.name.startsWith(n + ' ')))) {
    let b = 0; const out = [];
    for (let run = 0; run < 3; run++) {
      Math.random = mulberry32(9001 + run * 7919); resetPid(); const g1 = q.build();
      const M = mirrorS(g1.S);
      const seqM = await AI.think(M, 'mid');
      const back = seqM.map(unmirrorA);
      const ok = await q.check(back, g1); if (ok) b++;
      out.push(JSON.stringify(seqM) + ' -> ' + back.map(x => desc(g1.S, x)).join('+'));
    }
    console.log(q.name, 'mirror+swap', b + '/3'); out.forEach(s => console.log('   ', s));
  }
})().catch(e => { console.error(e); process.exit(1); });
