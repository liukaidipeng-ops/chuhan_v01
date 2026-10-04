'use strict';
const L = require('../tools/bfai_exam_lib.js');
const { Q, resetPid } = L; const BF = global.BF;
console.log('START ids rank0 red:', Object.entries(BF.START).filter(([id, p]) => p[1] === 0).map(([id, p]) => id + '@' + p).join(' '));
const mp = p => [8 - p[0], p[1]];
const mirrorS = S => { const T = BF.cloneState(S); T.board = S.board.map(row => row.slice().reverse().map(p => (p ? { ...p } : null))); if (Array.isArray(T.jmLock)) T.jmLock = mp(T.jmLock); return T; };
for (const q of Q) {
  if (q.multi || q.disabled) continue;
  resetPid(); const g = q.build(); const S = g.S;
  const dr = S.dead.r.map(d => d.id), db = S.dead.b.map(d => d.id);
  if (!dr.length && !db.length) continue;
  const M = mirrorS(S);
  const legal = S.dead.r.map(d => `${d.id}:${BF.attempt(BF.cloneState(S), { k: 'art', id: d.id }) ? 'Y' : 'N'}/${BF.attempt(BF.cloneState(M), { k: 'art', id: d.id }) ? 'Y' : 'N'}`);
  console.log(q.name, '| dead r', dr.join(','), 'dead b', db.join(','), '| art used r', S.used.art.r, '| revive legal orig/mirror', legal.join(' '));
}
