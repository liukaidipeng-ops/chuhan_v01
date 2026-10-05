// 电脑变体（只供模拟）：“潜力估值”——让电脑看懂技能（用户 2026-10-05：“攻防很好理解，但怎么理解技能？”“请立即开始做估值方案”）。
//   底版：git 上的 source/src/bfai.js（环境变量 BFAI_POT_BASE，默认 ecf1ddd = 线上电脑），按文字锚点改（每个锚点必须正好出现一次）。
//   BFAI_POT=0 时和底版完全一样（只多几个不起作用的变量）。
//
// 为什么要它：攻防是数字（血、攻击），直接进局面分，搜索也算得清；技能的价值却是“这枚子现在 / 升几级以后能干出什么”，
//   底版只给“有技能”加一个固定小分（三级以上守子 +0.4、进攻子 +0.9），戳一下和秒杀全场一个价；三步以内用不上就看不出差别。
//   极端诊断（tools/xe2_play.js）里，能秒杀全场的楚象 12 局一次都没被主动升过，汉也从不先去杀它。
//
// 做法：每回合 think() 开头，用引擎替双方每枚子试算一遍——
//   · 让这枚子一级一级升上去（每回合只能升一级；试算时不管军功、刚解锁的技能当作已经能用），
//     每一级都看“轮到它这一方时，它这一下（走子或技能）最多能净赚多少子力”（用引擎真走：攻击、技能、践踏全按规则结算）；
//   · 潜力 = 升到更高一级后比现在这一级多赚的 × BFAI_POTD^(还差几级)（默认 0.5：每晚一回合打一半折），
//     只算军功够得着的级（现有军功 + 每回合约 1 功），封顶 BFAI_POTC（默认 30）；
//   · 潜力按“这枚子（id）在几级”记成表，局面分里自己的子加、对方的子减（× BFAI_POTW，默认 1）。
//   于是：自己的子潜力大 → 更值钱、要护着、升级会涨分；对方的子潜力大 → 先吃掉它最划算（吃掉它，它的潜力就没了）。
//   升级候选：潜力涨得多的升级（潜力涨 × POTW ≥ BFAI_POTUP，默认 0.8）也进根节点的搜索，不受“一级士象没被捉不升”“给车攒军功”这些老规矩挡。
//   对方“先升级再应”那一层（upsOf）本来就按局面分挑，潜力进了局面分，它也跟着懂了。
// 第 2 版（默认，BFAI_POTV=1 回到第 1 版）：潜力按当时军功现算、按“还要几回合”打折（升级回合 + 攒钱回合），见 potAt()。
// 只算“打掉多少”：进攻类技能、升级后攻击力 / 血量变化带来的吃子都算得到；护驾、铁甲禁卫、拒马、神速营这类防守 / 走位的价值第一版不算。
// 用法（在 source/ 下）：node tools/bfsim.js --ai tools/variants/bfai_pot.js …；调参：BFAI_POTW / BFAI_POTD / BFAI_POTC / BFAI_POTUP。
// 调试：电脑模块上 think.pot = 这一步算出的潜力表（Map：id → 按等级的潜力），think.last.potMs = 试算花的毫秒。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const rev = process.env.BFAI_POT_BASE || 'ecf1ddd';
let s = execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_pot：锚点出现 ${n} 次（${rev} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.replace(a, () => b); };

// ---- 潜力表和试算 ----
rep('  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战\n  function score(S, me) {',
`  // ---- 潜力估值（变体 bfai_pot）----
  const POTON = ENV.BFAI_POT == null || !/^(0|false|off)$/i.test(String(ENV.BFAI_POT));
  // 第 1 版（BFAI_POTV=1）：潜力在根上按当时的军功算死一张表，够不着的级（现有军功 + 每回合约 1 功）一律不算，每差一级 × 0.5，封顶 30。
  // 第 2 版（默认）：只在根上试算“每级能多赚多少、累计要花多少”，潜力在局面分里按当时的军功现算——
  //   还要几回合 = 差几级 + 攒够军功要几回合（每回合约 BFAI_POTR 功，默认 1），每晚一回合 × BFAI_POTD（默认 0.75），封顶 60。
  //   钱花在别处，潜力就跌（电脑会为了大招攒钱）；对方军功越攒越多，它那枚子的威胁也越来越大。
  const POTV = ENV.BFAI_POTV != null ? +ENV.BFAI_POTV : 2;
  const POTW = ENV.BFAI_POTW != null ? +ENV.BFAI_POTW : 1, POTD = ENV.BFAI_POTD != null ? +ENV.BFAI_POTD : POTV === 1 ? 0.5 : 0.75;
  const POTC = ENV.BFAI_POTC != null ? +ENV.BFAI_POTC : POTV === 1 ? 30 : 60, POTUP = ENV.BFAI_POTUP != null ? +ENV.BFAI_POTUP : 0.8;
  const POTR = ENV.BFAI_POTR != null ? +ENV.BFAI_POTR : 1;
  let POT = new Map(), potMs = 0;
  const matOf = (S, side) => { let v = 0; for (const row of S.board) for (const p of row) if (p && p.s === side && p.t !== 'k') v += baseVal(p, false); return v; };
  const findId = (S, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.id === id) return { p, at: [f, r] }; } return null; };
  // 轮到 side 时，id 这枚子这一下（走子或技能）最多净赚多少子力（对方少的 − 自己少的）；吃掉对方主帅（决战里）算封顶
  function bestGain(H, id, side) {
    const o0 = matOf(H, other(side)), m0 = matOf(H, side);
    let best = 0;
    for (const e of A.gen(H, false)) {
      if (!e.p || e.p.id !== id) continue;
      const R = BF.attempt(H, e.a); if (!R) continue;
      if (R.ev && R.ev.some(x => x.e === 'kill' && x.t === 'k')) return POTC;
      const g = (o0 - matOf(R.S, other(side))) - (m0 - matOf(R.S, side));
      if (g > best) best = g;
    }
    return best;
  }
  // 换成轮到 side 走的假想局面（棋子不动）：试算这一方的子能干什么
  const asTurn = (S, side) => { const H = BF.cloneState(S); H.turn = side; H.upgraded = false; H.freeUsed = false; H.jmLock = null; return H; };
  function computePot(S0) {
    const out = new Map();
    for (const side of ['r', 'b']) {
      const H0 = asTurn(S0, side);
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
        const p0 = S0.board[r][f]; if (!p0 || p0.s !== side || p0.t === 'k') continue;
        const maxL = BF.maxLvOf(p0.t); if (p0.lv >= maxL) continue;
        const G = [], spent = [];
        let H = H0, lv = p0.lv, cum = 0;
        G[lv] = bestGain(H, p0.id, side); spent[lv] = 0;
        while (lv < maxL) {
          const x = findId(H, p0.id); if (!x) break;
          const c = A.upCost(x.p); if (c == null) break;
          const H1 = BF.cloneState(H); H1.merit = { ...H1.merit, [side]: 999 }; H1.upgraded = false;
          const T = A.upgradeState(H1, x.at); if (!T) break;
          T.merit = { ...T.merit, [side]: H.merit[side] }; T.upgraded = false; T.turn = side;
          const y = findId(T, p0.id); if (y) { y.p.cd = 0; for (const k of Object.keys(y.p)) if (k.startsWith('c_')) y.p[k] = 0; }   // 刚解锁的技能当作已经能用
          cum += c; lv++;
          G[lv] = bestGain(T, p0.id, side); spent[lv] = cum;
          H = T;
        }
        let any = false; for (let l = p0.lv; l < lv; l++) for (let L = l + 1; L <= lv; L++) if (G[L] > G[l] + 0.05) any = true;   // 浮点误差不算
        if (!any) continue;   // 升上去也多赚不到什么：不记
        const e = { side, lv0: p0.lv, top: lv, G, spent };
        if (POTV === 1) {
          e.P = [];
          for (let l = p0.lv; l <= lv; l++) {
            let best = 0;
            for (let L = l + 1; L <= lv; L++) {
              if (spent[L] - spent[l] > S0.merit[side] - spent[l] + (L - l)) break;   // 军功够不着（现有的先付掉升到 l 级的钱，之后每回合约 1 功）
              const v = (G[L] - G[l]) * Math.pow(POTD, L - l);
              if (v > best) best = v;
            }
            e.P[l] = Math.min(POTC, best);
          }
        }
        out.set(p0.id, e);
      }
    }
    return out;
  }
  // 这枚子现在是 l 级、它这一方有 m 功时的潜力（第 2 版）：升到 L 级多赚 G[L] − G[l]，要 (L − l) 回合升级 + 攒够差的军功的回合，每回合打 POTD 折
  function potAt(e, l, m) {
    if (POTV === 1) return (e.P && e.P[l]) || 0;
    if (l < e.lv0 || l >= e.top || e.G[l] == null) return 0;
    let best = 0;
    for (let L = l + 1; L <= e.top; L++) {
      const gain = e.G[L] - e.G[l]; if (!(gain > 0)) continue;
      const need = e.spent[L] - e.spent[l], turns = (L - l) + Math.ceil(Math.max(0, need - m) / POTR);
      const v = gain * Math.pow(POTD, turns);
      if (v > best) best = v;
    }
    return Math.min(POTC, best);
  }
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  function score(S, me) {`);

// ---- 局面分里加上每枚子的潜力 ----
rep('        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;',
  '        if (POT.size) { const e = POT.get(p.id); if (e) x += POTW * potAt(e, p.lv, S.merit[s]); }   // 变体 bfai_pot：这枚子的潜力\n        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;');

// ---- 升级候选：潜力涨得多的升级不受老规矩挡 ----
rep('      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);\n      if (defender && !must && !unlock && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n      if ((saving || hoard) && p.t !== \'r\' && !must) continue;\n      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });',
  '      const PE = POT.get(p.id), potUp = POTON && !!PE && POTW * (potAt(PE, p.lv + 1, S.merit[me] - (A.upCost(p) || 0)) - potAt(PE, p.lv, S.merit[me])) >= POTUP;   // 变体 bfai_pot：升这一级潜力涨得多\n' +
  '      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard) && !potUp;\n' +
  '      if (defender && !must && !unlock && !potUp && !(p.t === \'a\' && heavy && p.lv < 2)) continue;\n' +
  '      if ((saving || hoard) && p.t !== \'r\' && !must && !potUp) continue;\n' +
  '      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock, pot: potUp });');

// ---- 每回合开头先试算潜力 ----
rep('nodes = 0; qMax = L.q; hist.clear();',
  '{ const tp = now(); POT = POTON ? computePot(S0) : new Map(); potMs = now() - tp; think.pot = POT; }   /* 变体 bfai_pot：每回合先试算潜力 */ nodes = 0; qMax = L.q; hist.clear();');
rep('    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone,',
  '    think.last = { nodes, ms: now() - t0, potMs, v: pick.v, n: kids.length, depth: depthDone,');

const out = path.join(os.tmpdir(), `bfai_pot_${rev}_${process.pid}.js`);
fs.writeFileSync(out, s);
process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
module.exports = require(out);
