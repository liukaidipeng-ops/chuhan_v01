// 电脑变体（只供模拟）：“潜力估值”第四版——在 bfai_pot.js 第三版的基础上，按代码审查（wf_800ed4d5-e90）和极端诊断 XE5 的结果改：
//   底版：git 上的 source/src/bfai.js（BFAI_POT_BASE，默认 ecf1ddd = 线上电脑），按文字锚点改（每个锚点必须正好出现一次）。BFAI_POT=0 时和底版完全一样。
//
// 潜力：每回合 think() 开头用引擎替双方每枚子试算——一级一级升上去（现在不能升就把回合往后拨着问，问出最早哪回合能升），
//   每一级看“轮到它这一方时，它这一下最多能净赚多少子力、打的是哪几枚子”。叶子上的潜力 =
//   max over 更高的级 L：(G[L] − G[根上那一级]) × POTD^还要几回合 × 目标还活着的比例 × 血量比例；还要几回合 = 差几级 + 等规则开放 + 攒够军功。
// 第四版改了什么（括号里是审查的编号）：
//   1. 军功：叶子上只认“比根上少”的军功（花了钱潜力就跌，白捡的补偿军功不涨）；收入按规则算：每回合约 BFAI_POTR0（默认 0.5，吃子 / 将军）
//      + 到了 merit.autoIncomeFromRound 之后每回合的固定收入（①：之前 1 功能值十几分，丢子换补偿反而加分）。
//   2. 冷却：根上那一级也把冷却清零再量（同样的条件比），“技能冷却中”不再算成升级潜力（④）。
//   3. 升上来的那一级不再归零：刚升上来、技能还在冷却，按“差一回合”给；打的目标已经不在了就不给（②：之前升到顶级反而扣分）。
//   4. 同一方几枚子：按潜力从大到小，打的目标和前面重叠的部分只算 BFAI_POTOVL（默认 0.15），不重叠的全算（③：两只象共用一份军功、
//      只能秒杀一次）。试过“最大的全算、其余 ×0.25 / ×0.7”：×0.7 时两只象的潜力合计（87）超过真秒杀打得出来的（68），
//      电脑宁可攒着不动手（XE7 第 7 回合不升象）；按目标去重后合计不会超过真打得出来的。
//   5. 根上被将军：这一方沿用上一步的潜力表（⑤：之前被将军那一步整方潜力变 0）。
//   6. 升级候选：守子“解锁”名额照旧；潜力涨得最多、或者升完当场就能多赚一大块的升级另给一个专用名额
//      （⑥ + XE5：几个子被捉时保命升级占满名额，升象没进搜索；XE7：第 7 回合“马上能升、升完当场秒杀”时潜力不涨，升象反而进不了候选）。
//   7. 血量：潜力 × 现在的血 / 这一级满血（XE5：汉要连打几下才能杀掉的子，打掉的血也要看得到——汉才会去围剿）。
//   8. 军功远远够不着（攒钱要 40 回合以上）的级不试算（⑦）。
// 用法（在 source/ 下）：node tools/bfsim.js --ai tools/variants/bfai_pot4.js …；调参：BFAI_POTW / POTD / POTC / POTUP / POTWAIT / POTR0 / POTSIDE。
// 调试：think.pot = 这一步的潜力表（Map：id → 条目），think.last.potMs = 试算毫秒。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_POT_BASE || 'ecf1ddd';
let s = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_pot4：锚点出现 ${n} 次（${rev} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, () => b); };

// ---- 潜力：参数、试算、叶子上的取值 ----
rep('  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战\n  function score(S, me) {',
`  // ---- 潜力估值第四版（变体 bfai_pot4）----
  const POTON = ENV.BFAI_POT == null || !/^(0|false|off)$/i.test(String(ENV.BFAI_POT));
  const num = (k, d) => (ENV[k] != null ? +ENV[k] : d);
  const POTW = num('BFAI_POTW', 1), POTD = num('BFAI_POTD', 0.75), POTC = num('BFAI_POTC', 60), POTUP = num('BFAI_POTUP', 0.8);
  const POTWAIT = num('BFAI_POTWAIT', 12), POTR0 = num('BFAI_POTR0', 0.5), POTOVL = num('BFAI_POTOVL', 0.15);
  let POT = new Map(), lastPot = new Map(), potMs = 0;
  const matOf = (S, side) => { let v = 0; for (const row of S.board) for (const p of row) if (p && p.s === side && p.t !== 'k') v += baseVal(p, false); return v; };
  const findId = (S, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.id === id) return { p, at: [f, r] }; } return null; };
  const clearCd = p => { if (!p) return; p.cd = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; };
  const roundOf = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
  // 攒够 short 功要几回合：每回合约 POTR0（吃子、将军）+ 到了规则里的“每回合固定收入”那一回合之后再加上它
  function earnTurns(short, rd) {
    if (short <= 0) return 0;
    const M = CFG.merit || {}, from = M.autoIncomeFromRound || 999, per = M.autoIncomePerRound || 0;
    let t = 0, acc = 0;
    while (acc < short && t < 40) { t++; acc += POTR0 + (rd + t >= from ? per : 0); }
    return acc >= short ? t : 99;
  }
  // 轮到 side 时，id 这枚子这一下（走子或技能）最多净赚多少子力，打的是对方哪几枚子
  function bestGain(H, id, side) {
    const o0 = matOf(H, other(side)), m0 = matOf(H, side), enemy = new Set();
    for (const row of H.board) for (const p of row) if (p && p.s !== side) enemy.add(p.id);
    let best = 0, tg = [];
    for (const e of A.gen(H, false)) {
      if (!e.p || e.p.id !== id) continue;
      const R = BF.attempt(H, e.a); if (!R) continue;
      if (R.ev && R.ev.some(x => x.e === 'kill' && x.t === 'k')) return { g: POTC, tg: [] };
      const g = (o0 - matOf(R.S, other(side))) - (m0 - matOf(R.S, side));
      if (g > best) { best = g; tg = []; for (const x of R.ev || []) if ((x.e === 'kill' || x.e === 'hit') && enemy.has(x.id) && !tg.includes(x.id)) tg.push(x.id); }
    }
    return { g: best, tg };
  }
  const asTurn = (S, side) => { const H = BF.cloneState(S); H.turn = side; H.upgraded = false; H.freeUsed = false; H.jmLock = null; return H; };
  function computePot(S0) {
    const out = new Map();
    for (const side of ['r', 'b']) {
      const H0 = asTurn(S0, side), M0 = S0.merit[side];
      // 根上正被将军：这一方的子这一步什么都干不了，量出来全是 0——沿用上一步的表（同一枚子、等级没变）
      if (side === S0.turn && A.inCheck(S0, side)) {
        for (const row of S0.board) for (const p of row) if (p && p.s === side) { const e = lastPot.get(p.id); if (e && e.lv0 === p.lv) out.set(p.id, e); }
        continue;
      }
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
        const p0 = S0.board[r][f]; if (!p0 || p0.s !== side || p0.t === 'k') continue;
        const maxL = BF.maxLvOf(p0.t); if (p0.lv >= maxL) continue;
        const G = [], spent = [], wait = [], tg = [], hpL = [];
        let H = BF.cloneState(H0); clearCd(findId(H, p0.id).p);   // 根上那一级也清冷却：同样的条件比
        let lv = p0.lv, cum = 0;
        let x = bestGain(H, p0.id, side); G[lv] = x.g; tg[lv] = x.tg; spent[lv] = 0; wait[lv] = 0; hpL[lv] = p0.hp;
        while (lv < maxL) {
          const y = findId(H, p0.id); if (!y) break;
          const c = A.upCost(y.p); if (c == null) break;
          if (cum + c - M0 > 40 * Math.max(POTR0, 0.1) + 30) break;   // 军功远远够不着：不试算
          const H1 = BF.cloneState(H); H1.merit = { ...H1.merit, [side]: 999 }; H1.upgraded = false;
          let T = A.upgradeState(H1, y.at), w = 0;
          if (!T) for (let k = 1; k <= POTWAIT; k++) {   // 现在不能升：问问过几回合能不能（规则的时间限制）
            const H2 = BF.cloneState(H1); H2.cnt = { r: H1.cnt.r + k, b: H1.cnt.b + k };
            T = A.upgradeState(H2, y.at); if (T) { w = k; break; }
          }
          if (!T) break;
          T.merit = { ...T.merit, [side]: H.merit[side] }; T.upgraded = false; T.turn = side;
          const z = findId(T, p0.id); clearCd(z && z.p);
          cum += c; lv++;
          x = bestGain(T, p0.id, side); G[lv] = x.g; tg[lv] = x.tg; spent[lv] = cum; wait[lv] = wait[lv - 1] + w; hpL[lv] = z ? z.p.hp : 1;
          H = T;
        }
        let any = false; for (let L = p0.lv + 1; L <= lv; L++) if (G[L] > G[p0.lv] + 0.05) any = true;   // 浮点误差不算
        if (any) out.set(p0.id, { side, lv0: p0.lv, top: lv, G, spent, wait, tg, hpL, m0: M0 });
      }
    }
    lastPot = out;
    return out;
  }
  // 叶子局面 S 上，这枚子（条目 e）的潜力。alive：S 上还在的子的 id
  function potAt(e, p, S, alive) {
    const l = p.lv; if (l < e.lv0 || e.G[l] == null && l < e.top) return { v: 0, tg: null };
    const m = Math.min(S.merit[e.side], e.m0), rd = Math.floor((S.cnt.r + S.cnt.b) / 2) + 1, base = e.G[e.lv0];
    const al = L => { const t = e.tg[L]; if (!t || !t.length) return 1; let n = 0; for (const id of t) if (alive.has(id)) n++; return n / t.length; };
    let best = 0, btg = null;
    if (l > e.lv0 && e.G[l] != null) { best = Math.max(0, e.G[l] - base) * POTD * al(l); btg = e.tg[l]; }   // 刚升上来、技能还在冷却：按差一回合给
    for (let L = l + 1; L <= e.top; L++) {
      if (e.G[L] == null) break;
      const gain = e.G[L] - base; if (!(gain > 0)) continue;
      const turns = (L - l) + ((e.wait[L] || 0) - (e.wait[l] || 0)) + earnTurns(Math.max(0, (e.spent[L] - e.spent[l]) - m), rd);
      const v = gain * Math.pow(POTD, turns) * al(L);
      if (v > best) { best = v; btg = e.tg[L]; }
    }
    const hpF = e.hpL[l] > 0 ? Math.min(1, p.hp / e.hpL[l]) : 1;   // 被打掉的血：它活到用上的机会小了
    return { v: Math.min(POTC, best * hpF), tg: btg };
  }
  // 同一方几枚子的潜力合计：从大到小，打的目标和前面重叠的那部分只算 POTOVL（同一批子只能被打掉一次），不重叠的照常全算。
  //   这样合计永远不超过真打得出来的（两只象秒杀的是同一批子：一只全算、另一只只算一小截）
  function potAgg(a) {
    if (!a.length) return 0;
    a.sort((x, y) => y.v - x.v);
    const cov = new Set(); let t = 0;
    for (const x of a) {
      let nov = 1;
      if (x.tg && x.tg.length) { let n = 0; for (const id of x.tg) if (!cov.has(id)) n++; nov = n / x.tg.length; for (const id of x.tg) cov.add(id); }
      t += x.v * (nov + POTOVL * (1 - nov));
    }
    return t;
  }
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  function score(S, me) {`);

// ---- 局面分：第一遍循环记下还在的子；主循环里收集潜力；最后按方合计 ----
rep('    let dR = 1, dB = 1;\n',
  '    let dR = 1, dB = 1;\n    const PA = POT.size ? new Set() : null, potR = [], potB = [];   // 变体 bfai_pot4\n');
rep('      if (heavyAt(p, f, r)) { if (p.s === \'r\') hvR = true; else hvB = true; }',
  '      if (PA) PA.add(p.id);\n      if (heavyAt(p, f, r)) { if (p.s === \'r\') hvR = true; else hvB = true; }');
rep('        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;',
  '        if (PA) { const e = POT.get(p.id); if (e) { const pv = potAt(e, p, S, PA); if (pv.v > 0) (s === \'r\' ? potR : potB).push(pv); } }   // 变体 bfai_pot4\n        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;');
rep('    v += 0.3 * (S.merit[me] - S.merit[other(me)]);',
  '    if (PA) v += POTW * (me === \'r\' ? potAgg(potR) - potAgg(potB) : potAgg(potB) - potAgg(potR));   // 变体 bfai_pot4：同一方按目标去重合计\n    v += 0.3 * (S.merit[me] - S.merit[other(me)]);');

// ---- 升级候选：守子“解锁”名额照旧；潜力涨得最多的升级另给一个专用名额 ----
rep('      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);\n      if (defender && !must && !unlock && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n      if ((saving || hoard) && p.t !== \'r\' && !must) continue;\n      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });',
  '      let pg = 0;   // 变体 bfai_pot4：升这一级潜力涨多少\n' +
  '      let ig = 0;   // 升完这一级当场能多赚多少（根上试算的 G[lv+1] − G[lv]）：当场就用得上的升级，潜力不涨也要进搜索比\n' +
  '      if (POTON && POT.size) { const PE = POT.get(p.id); if (PE) { const AL = new Set(); for (const row of S.board) for (const q of row) if (q) AL.add(q.id); pg = POTW * (potAt(PE, T.board[r][f], T, AL).v - potAt(PE, p, S, AL).v); if (PE.G[p.lv + 1] != null && PE.G[p.lv] != null) ig = PE.G[p.lv + 1] - PE.G[p.lv]; } }\n' +
  '      const potUp = pg >= POTUP || ig >= POTUP; pg = Math.max(pg, ig);\n' +
  '      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);\n' +
  '      if (defender && !must && !unlock && !potUp && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n' +
  '      if ((saving || hoard) && p.t !== \'r\' && !must && !potUp) continue;\n' +
  '      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock, pot: potUp, pg });');
rep('    if (ex) top.push(ex);\n    return top;',
  '    if (ex) top.push(ex);\n    const px = cand.filter(c => c.pot && !top.includes(c)).sort((x, y) => y.pg - x.pg)[0];   // 变体 bfai_pot4：潜力升级的专用名额\n    if (px) top.push(px);\n    return top;');

// ---- 调试：根上的升级候选（think.ups） ----
rep('    let ups = upgradeCands(S, L);',
  '    let ups = upgradeCands(S, L);\n    think.ups = ups.map(c => ({ at: c.at, gain: +c.gain.toFixed(2), must: !!c.must, unlock: !!c.unlock, pot: !!c.pot, pg: +(c.pg || 0).toFixed(2) }));   // 变体 bfai_pot4：调试用');

// ---- 每回合开头先试算潜力 ----
rep('nodes = 0; qMax = L.q; hist.clear();',
  '{ const tp = now(); POT = POTON ? computePot(S0) : new Map(); potMs = now() - tp; think.pot = POT; }   /* 变体 bfai_pot4：每回合先试算潜力 */ nodes = 0; qMax = L.q; hist.clear();');
rep('    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone,',
  '    think.last = { nodes, ms: now() - t0, potMs, v: pick.v, n: kids.length, depth: depthDone,');

const out = process.env.BFAI_POT_OUT || path.join(os.tmpdir(), `bfai_pot4_${rev}_${process.pid}.js`);   // BFAI_POT_OUT：把改好的电脑存到这里（网页实测、交给 TD 用），不删
fs.writeFileSync(out, s);
if (!process.env.BFAI_POT_OUT) process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
module.exports = require(out);
