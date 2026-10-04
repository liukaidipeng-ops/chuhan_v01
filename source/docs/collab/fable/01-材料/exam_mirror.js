'use strict';
// 镜像考：把每道题左右翻转（f → 8−f）给电脑做，答案翻回来再判。棋规左右对称，会做的题翻过来也该会；
//   翻过来就不会的，说明原题答对有运气成分（着法顺序、平分时的随机）。用法：node exam_mirror.js <电脑文件> [--nodes 60000] [--runs 3]
const L = require('./tools/bfai_exam_lib.js');
const { Q, play, desc, resetPid } = L;
const BF = global.BF;
const path = require('path');
const argv = process.argv.slice(2);
const o = { file: null, nodes: 60000, runs: 3 };
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--nodes') o.nodes = +argv[++i]; else if (argv[i] === '--runs') o.runs = +argv[++i]; else o.file = argv[i]; }
const AI = require(path.resolve(o.file));
AI.LEVELS.mid.nodes = o.nodes;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mf = f => 8 - f;
const mp = p => [mf(p[0]), p[1]];
const mirrorS = S => { const T = BF.cloneState(S); T.board = S.board.map(row => row.slice().reverse().map(p => (p ? { ...p } : null))); if (Array.isArray(T.jmLock)) T.jmLock = mp(T.jmLock); return T; };
const unmirrorA = a => { const b = { ...a }; if (b.from) b.from = mp(b.from); if (b.to) b.to = mp(b.to); if (b.at) b.at = mp(b.at); if (b.steps) b.steps = b.steps.map(s => ({ from: mp(s.from), to: mp(s.to) })); return b; };
(async () => {
  let okPlain = 0, okMir = 0, n = 0; const diffs = [];
  for (const q of Q) {
    if (q.multi || q.disabled) continue;
    let a = 0, b = 0;
    for (let run = 0; run < o.runs; run++) {
      // 原题
      Math.random = mulberry32(9001 + run * 7919); resetPid(); const g0 = q.build();
      const seq = await AI.think(BF.cloneState(g0.S), 'mid');
      if (await q.check(seq, g0)) a++;
      // 镜像题
      Math.random = mulberry32(9001 + run * 7919); resetPid(); const g1 = q.build();
      const seqM = await AI.think(mirrorS(g1.S), 'mid');
      const back = seqM.map(unmirrorA);
      const ok = await q.check(back, g1);
      if (ok) b++; else if (run === 0) diffs.push(`${q.name}：镜像走 ${back.map(x => desc(g0.S, x)).join('+')}`);
    }
    okPlain += a; okMir += b; n += o.runs;
    if (a !== b) console.log(`${q.name}（${q.cat}）原题 ${a}/${o.runs}  镜像 ${b}/${o.runs}`);
  }
  console.log(`\n${o.file}  ${o.nodes} 节点：原题 ${okPlain}/${n}  镜像 ${okMir}/${n}`);
  for (const d of diffs) console.log('  ' + d);
})().catch(e => { console.error(e); process.exit(1); });
