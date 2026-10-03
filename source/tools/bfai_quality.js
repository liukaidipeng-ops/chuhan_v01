// 技能模式电脑「漏着率」：自对弈时，每一步都用更深的搜索（霸王档、给足时间）复核，统计这一步比最好的着法差多少
// 用法：node tools/bfai_quality.js [--ai src/bfai.js] [--level mid] [--games 20] [--budget 1500] [--jobs 4] [--seed 1] [--out 文件.json]
//   损失 = 复核时最好着法的分 −（走完这一步后、复核对方最好应着时的分取反），都站在走棋方看；
//   损失 ≥ 2（约一个兵到半个马）记“失误”，≥ 4（约一个马炮）记“漏着”；看到杀没走、走了送杀另记。
//   输出每 100 步的失误 / 漏着次数，以及最严重的几个局面（带棋盘），可以直接拿去修电脑或改成考题。
// 注意：复核用的还是同一套估值，量的是“算得不够深”造成的错，量不出估值本身的偏差。
'use strict';
const path = require('path');
const os = require('os');
const { fork } = require('child_process');

const argv = process.argv.slice(2);
const opt = { ai: 'src/bfai.js', level: 'mid', games: 20, budget: 1500, jobs: os.cpus().length, seed: 1, out: null, open: 6, maxPlies: 160, worker: false };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--ai') opt.ai = v(); else if (k === '--level') opt.level = v(); else if (k === '--games') opt.games = +v();
  else if (k === '--budget') opt.budget = +v(); else if (k === '--jobs') opt.jobs = +v(); else if (k === '--seed') opt.seed = +v();
  else if (k === '--out') opt.out = v(); else if (k === '--open') opt.open = +v(); else if (k === '--max-plies') opt.maxPlies = +v();
  else if (k === '--worker') opt.worker = true; else throw new Error('未知参数 ' + k);
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const WIN = 9000;

// 棋盘画成文字：汉用 俥傌相仕帥炮兵，楚用 車馬象士將砲卒；二级以上在旁边标等级和血量
const GLYPH = { r: { r: '俥', n: '傌', e: '相', a: '仕', k: '帥', c: '炮', p: '兵' }, b: { r: '車', n: '馬', e: '象', a: '士', k: '將', c: '砲', p: '卒' } };
function drawBoard(S) {
  const L = [], notes = [];
  for (let r = 9; r >= 0; r--) {
    let line = r + ' ';
    for (let f = 0; f < 9; f++) { const p = S.board[r][f]; line += p ? GLYPH[p.s][p.t] : (r === 4 || r === 5 ? '～' : '・'); if (p && (p.lv > 1 || p.hp > 1 || p.jm)) notes.push(`${GLYPH[p.s][p.t]}(${f},${r}) ${p.lv}级${p.hp}血${p.jm ? ' 拒马' : ''}`); }
    L.push(line);
  }
  L.push('  ０１２３４５６７８');
  return L.join('\n') + (notes.length ? '\n  ' + notes.join('；') : '') + `\n  军功 汉${S.merit.r} 楚${S.merit.b}；兵法已用 汉${S.used.art.r} 楚${S.used.art.b}；终极已用 汉${S.used.ult.r} 楚${S.used.ult.b}；轮到${S.turn === 'r' ? '汉' : '楚'}`;
}

function worker() {
  global.XQ = require('../src/rules.js');
  const BF = global.BF = require('../src/bingfa.js');
  let AI = null;
  const N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' };
  const desc = (S, a) => {
    if (a.k === 'up') { const p = S.board[a.at[1]][a.at[0]]; return `升${p ? N[p.t] : '?'}${a.at}`; }
    if (a.k === 'mv') { const p = S.board[a.from[1]][a.from[0]], q = S.board[a.to[1]][a.to[0]]; return `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
    if (a.k === 'art') return a.steps ? '破釜沉舟' + JSON.stringify(a.steps.map(m => [m.from, m.to])) : '召回良将';
    if (a.k === 'sk') return '技能' + (a.sk || '') + a.at + (a.to ? '→' + a.to : '');
    return a.k;
  };
  async function game(job) {
    Math.random = mulberry32(job.seed * 2654435761);
    const g = new BF.Game();
    const moves = [];
    let plies = 0;
    while (!g.result && plies < job.maxPlies) {
      const side = g.turn;
      if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); plies++; continue; }
      const S0 = BF.cloneState(g.S);
      const lvl = plies < job.open ? 'open' : job.level;
      const seq = await AI.think(BF.cloneState(S0), lvl);
      if (plies >= job.open) {
        // 复核：走之前最好能拿几分；走完之后对方最好能拿几分
        const ref = await AI.think(BF.cloneState(S0), 'ref');
        const best = AI.think.last.v, bestSeq = ref;
        const T = new BF.Game(); T.setup(X => Object.assign(X, BF.cloneState(S0)));
        let ok = true; for (const a of seq) if (!T.apply(a)) { ok = false; break; }
        if (ok && !T.result && T.turn !== side) {
          await AI.think(BF.cloneState(T.S), 'ref');
          const got = -AI.think.last.v;
          const same = JSON.stringify(seq) === JSON.stringify(bestSeq);
          const loss = same ? 0 : Math.max(0, best - got);
          const missMate = best > WIN / 2 && got < WIN / 2, allowMate = got < -WIN / 2 && best > -WIN / 2;
          moves.push({ ply: plies, side, loss: Math.min(loss, 50), missMate, allowMate });
          if (loss >= 2 || missMate || allowMate) moves[moves.length - 1].detail = { board: drawBoard(S0), played: seq.map(a => desc(S0, a)).join(' + '), best: bestSeq.map(a => desc(S0, a)).join(' + '), vBest: +best.toFixed(2), vPlayed: +got.toFixed(2), seed: job.seed, round: Math.floor(plies / 2) + 1 };
        } else if (ok && T.result) moves.push({ ply: plies, side, loss: 0 });
      }
      for (const a of seq) if (!g.apply(a)) throw new Error('非法行动 ' + JSON.stringify(a));
      plies++;
    }
    return { seed: job.seed, result: g.result, plies, moves };
  }
  process.on('message', async m => {
    if (m.init) {
      AI = require(path.resolve(__dirname, '..', m.ai));
      AI.LEVELS.open = { ...AI.LEVELS.mid, noise: 0.9, top: 3 };
      AI.LEVELS.ref = { ...AI.LEVELS.hard, noise: 0, top: 1, budget: m.budget };
      process.send({ ready: true }); return;
    }
    if (m.job) { try { process.send({ result: await game(m.job) }); } catch (e) { process.send({ error: String(e && e.stack || e) }); } }
    if (m.exit) process.exit(0);
  });
}

async function main() {
  const jobs = []; for (let i = 0; i < opt.games; i++) jobs.push({ seed: opt.seed + i, level: opt.level, open: opt.open, maxPlies: opt.maxPlies });
  const results = [], errors = []; let next = 0;
  const t0 = Date.now();
  await new Promise(resolve => {
    const n = Math.max(1, Math.min(opt.jobs, jobs.length)); let alive = n;
    for (let w = 0; w < n; w++) {
      const c = fork(__filename, ['--worker'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      const feed = () => { if (next < jobs.length) c.send({ job: jobs[next++] }); else c.send({ exit: true }); };
      c.on('message', m => { if (m.ready) return feed(); if (m.result) results.push(m.result); if (m.error) errors.push(m.error); if (process.stderr.isTTY) process.stderr.write(`\r${results.length + errors.length}/${jobs.length}`); feed(); });
      c.on('exit', () => { if (--alive === 0) resolve(); });
      c.send({ init: true, ai: opt.ai, budget: opt.budget });
    }
  });
  const all = results.flatMap(r => r.moves);
  const n = all.length || 1;
  const mis = all.filter(m => m.loss >= 2).length, blunder = all.filter(m => m.loss >= 4).length;
  const missMate = all.filter(m => m.missMate).length, allowMate = all.filter(m => m.allowMate).length;
  const avg = all.reduce((t, m) => t + m.loss, 0) / n;
  console.log(`== 漏着率：${opt.ai} ${opt.level} 档自对弈 ${results.length} 局、复核 ${all.length} 步（霸王档每步 ${opt.budget}ms）| ${Math.round((Date.now() - t0) / 1000)}s ==`);
  console.log(`平均每步损失 ${avg.toFixed(2)} 分；每 100 步：失误（≥2 分）${(100 * mis / n).toFixed(1)}，漏着（≥4 分）${(100 * blunder / n).toFixed(1)}；看到杀没走 ${missMate} 次，走了送杀 ${allowMate} 次`);
  for (const s of ['r', 'b']) { const a = all.filter(m => m.side === s); console.log(`  ${s === 'r' ? '汉' : '楚'}方：${a.length} 步，漏着 ${a.filter(m => m.loss >= 4).length}，平均损失 ${(a.reduce((t, m) => t + m.loss, 0) / (a.length || 1)).toFixed(2)}`); }
  const worst = all.filter(m => m.detail).sort((x, y) => (y.allowMate || y.missMate ? 99 : y.loss) - (x.allowMate || x.missMate ? 99 : x.loss)).slice(0, 6);
  for (const m of worst) {
    const d = m.detail;
    console.log(`\n—— 第 ${d.seed} 局第 ${d.round} 回合，${m.side === 'r' ? '汉' : '楚'}方${m.missMate ? '【看到杀没走】' : m.allowMate ? '【走了送杀】' : ''} 损失 ${m.loss.toFixed(1)} 分`);
    console.log(d.board);
    console.log(`  走了：${d.played}（复核 ${d.vPlayed}）\n  该走：${d.best}（复核 ${d.vBest}）`);
  }
  if (errors.length) console.log('\n出错：', errors[0].split('\n')[0]);
  if (opt.out) require('fs').writeFileSync(opt.out, JSON.stringify({ opt, results }, null, 1));
}
if (opt.worker) worker(); else main().catch(e => { console.error(e); process.exit(1); });
