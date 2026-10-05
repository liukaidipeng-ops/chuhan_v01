// 电脑变体（只供模拟）：更懂“贴脸杀”的电脑（用户 2026-10-05 报笨棋“实3 马挡帅前喂三血卒”后同意做）。
//   底版：从 git 取 source/src/bfai.js（环境变量 BFAI_KD_BASE，默认 33942f1 = 线上 / dev 现在的电脑），按文字锚点改
//   （每个锚点必须正好出现一次，否则报错），写到临时文件再加载。不设任何开关时和底版电脑完全一样。
//
// 笨棋的原因：静态搜索 qs()（主搜索到底之后只看吃子的那几层）一进来就“站着不动”估值（stand pat）——
//   就算这时正被将军。实战里那条线是：汉挡马 → 楚卒打马 → 汉随便走 → 【qs】楚卒吃马、贴脸将军 → 汉被将军却“站着不动”估值，
//   于是三层的校尉看不出“卒吃马就是将死”（帅、仕攻击 1 砍不死 3 血的卒，帅又被自己的两个仕堵着）。
//
// 开关（环境变量，设成 1 打开）：
//   BFAI_QCHK=1    qs 里正被将军时不许站着不动：交给主搜索 ab() 往下应一步（ab 会列全部应着；一个合法应着都没有就是将死，-WIN）。
//                  主搜索自己到底时本来就是这样（ab 里 “被将军时不能站着不动估值”），这里把同样的规矩搬进 qs。
//   BFAI_QCHECKS=1 qs 第一层（qd = 0）除了吃子，再试“砍不死的进攻子走一步就将军”的着法（最多 4 个）：
//                  进攻子的血 > 对方帅、士里最高的攻击力，而且离对方帅不超过 3 步。这正是这个游戏最主要的杀法（贴脸将军）。
//                  配合 QCHK：将军之后对方在 qs 里也得应，应不了就算将死。
//   BFAI_TX=1      危险延伸：轮到某方走、它的帅（将）被堵死（一步合法的帅步都没有），而对方有砍不死的进攻子离帅不超过 2 步、
//                  而且那枚子下一步就能走到 / 吃到帅身边正将着帅时，
//                  这一层不算层数（像被将军时的将军延伸；一条线上最多再多延伸 TXN 次，默认 2，环境变量 BFAI_TXN 改）。
//                  实3 那步：挡马之后真正的杀在第 5～6 层，三层的校尉看不到；危险局面里多算两层就看得到。
// 用法（在 source/ 下）：BFAI_QCHK=1 BFAI_QCHECKS=1 node tools/bfsim.js --ai tools/variants/bfai_kd.js ...
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const ON = k => { const v = String(process.env[k] || '').toLowerCase(); return !!v && v !== '0' && v !== 'false' && v !== 'off'; };
const rev = process.env.BFAI_KD_BASE || '33942f1';
let s = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_kd：锚点出现 ${n} 次（${rev} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
const QCHK = ON('BFAI_QCHK'), QCHECKS = ON('BFAI_QCHECKS'), TX = ON('BFAI_TX'), TXN = process.env.BFAI_TXN != null ? +process.env.BFAI_TXN : 2;
if (TX) {
  // 危险：side 的帅被堵死，对方有砍不死的进攻子离帅不超过 2 步
  rep(`  function ab(S, depth, alpha, beta, ply, ext = 0) {`,
  `  function kdDanger(S, side) {
    if (S.final) return false;
    let k = null, dmax = 1; const near = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (!p) continue; if (p.s === side && (p.t === 'k' || p.t === 'a')) { if (p.t === 'k') k = [f, r]; dmax = Math.max(dmax, A.atk(p)); } }
    if (!k) return false;
    for (let r = Math.max(0, k[1] - 2); r <= Math.min(9, k[1] + 2); r++) for (let f = Math.max(0, k[0] - 2); f <= Math.min(8, k[0] + 2); f++) { const p = S.board[r][f]; if (p && p.s !== side && p.t !== 'k' && p.hp > dmax && Math.abs(f - k[0]) + Math.abs(r - k[1]) <= 2) near.push(p); }
    if (!near.length) return false;
    for (const m of A.moveTargets(S, k[0], k[1])) { const x = BF.attempt(S, { k: 'mv', from: m.from, to: m.to }); if (x && !x.free) return false; }   // 帅还有路走
    // 对方下一步就能贴脸将军（砍不死的子走到 / 吃到帅身边，走完正将着帅）才算危险：换手看一眼（空着一手），只试这几枚子
    const T = BF.cloneState(S); T.turn = side === 'r' ? 'b' : 'r'; T.upgraded = false; T.freeUsed = false; T.jmLock = null;
    for (let r = Math.max(0, k[1] - 2); r <= Math.min(9, k[1] + 2); r++) for (let f = Math.max(0, k[0] - 2); f <= Math.min(8, k[0] + 2); f++) {
      const p = S.board[r][f]; if (!p || p.s === side || p.t === 'k' || p.hp <= dmax || Math.abs(f - k[0]) + Math.abs(r - k[1]) > 2) continue;
      for (const m of A.moveTargets(T, f, r)) {
        if (Math.abs(m.to[0] - k[0]) + Math.abs(m.to[1] - k[1]) !== 1) continue;
        const x = BF.attempt(T, { k: 'mv', from: m.from, to: m.to }); if (x && !x.free && A.inCheck(x.S, side)) return true;
      }
    }
    return false;
  }
  function ab(S, depth, alpha, beta, ply, ext = 0) {`);
  rep(`    const extd = inChk && ext < CX && ply >= 1 ? 1 : 0;`,
  `    const extd = ply >= 1 && ((inChk && ext < CX) || (!inChk && ext < CX + ${TXN} && kdDanger(S, side))) ? 1 : 0;   // 变体 TX：帅被堵死、对方砍不死的子逼近时也延伸`);
}
if (QCHK || QCHECKS) {
  rep(`  function qs(S, alpha, beta, ply, qd) {
    if (++nodes > nodeCap || ((nodes & 63) === 0 && now() > deadline)) throw TIMEOUT;
    const side = S.turn;`,
  `  function qs(S, alpha, beta, ply, qd) {
    if (++nodes > nodeCap || ((nodes & 63) === 0 && now() > deadline)) throw TIMEOUT;
    const side = S.turn;
    if (${QCHK} && ply < 14 && A.inCheck(S, side)) return ab(S, 1, alpha, beta, ply, CX);   // 变体 QCHK：被将军时不许站着不动，应一步（没得应 = 将死）`);
}
if (QCHECKS) {
  rep(`      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  const killers = [];`,
  `      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    // 变体 QCHECKS：qs 第一层再试“砍不死的进攻子一步将军”（贴脸杀），最多 4 个
    if (qd === 0 && alpha < beta && !S.final) {
      const opp = side === 'r' ? 'b' : 'r';
      let ek = null, dmax = 1;
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (!p || p.s !== opp) continue; if (p.t === 'k') ek = [f, r]; if (p.t === 'k' || p.t === 'a') dmax = Math.max(dmax, A.atk(p)); }
      let tried = 0;
      if (ek) for (let r = 0; r < 10 && tried < 4 && alpha < beta; r++) for (let f = 0; f < 9 && tried < 4 && alpha < beta; f++) {
        const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k' || p.hp <= dmax) continue;
        if (Math.abs(f - ek[0]) + Math.abs(r - ek[1]) > 3) continue;
        for (const m of A.moveTargets(S, f, r)) {
          if (tried >= 4 || alpha >= beta) break;
          if (S.board[m.to[1]][m.to[0]]) continue;   // 吃子的上面已经算过
          const x = BF.attempt(S, { k: 'mv', from: m.from, to: m.to }); if (!x || x.free || !A.inCheck(x.S, opp)) continue;
          tried++;
          const w = decided(x.S, x.ev);
          const v = w ? (w === side ? WIN - ply : -WIN + ply) : -qs(x.S, -beta, -alpha, ply + 1, qd + 1);
          if (v > best) best = v;
          if (v > alpha) alpha = v;
        }
      }
    }
    return best;
  }
  const killers = [];`);
}
const out = path.join(os.tmpdir(), `bfai_kd_${rev}_${+QCHK}${+QCHECKS}${+TX}_${process.pid}.js`);
fs.writeFileSync(out, s);
module.exports = require(out);
