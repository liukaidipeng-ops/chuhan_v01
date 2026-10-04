'use strict';
const L = require('../tools/bfai_exam_lib.js');
const { Q, resetPid } = L; const BF = global.BF;
console.log('START', JSON.stringify(Object.fromEntries(Object.entries(BF.START).filter(([id]) => +id <= 16))));
const q = Q.find(q => q.name.startsWith('实2'));
resetPid(); const g = q.build(); const S = g.S;
const st = BF.START[9]; console.log('实2 START[9]', st, 'orig occupied', !!S.board[st[1]][st[0]], 'mirror cell', [8 - st[0], st[1]], 'orig mirror-cell occupied', !!S.board[st[1]][8 - st[0]]);
console.log('turn', S.turn, 'used', JSON.stringify(S.used), 'check src:', q.check.toString().slice(0, 300));
