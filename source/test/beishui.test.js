// 背水一战（CFG.beishui）：引擎规则测试。由 Code 的模拟自测（tools/variants/test_beishui2.js）改来，配置换成 src/bingfa.js 里的写法
'use strict';
const assert = require('assert');
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
let pid = 600; const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const pos = (pieces, o = {}) => { const g = new BF.Game(); g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of pieces) T.board[r][f] = p; T.turn = o.turn || 'b'; T.merit = { r: 0, b: 0, ...(o.merit || {}) }; T.used = { art: { r: 0, b: 0, ...(o.art || {}) }, ult: { r: 0, b: 0 } }; T.cnt = { r: 10, b: 10 }; if (o.dead) T.dead = o.dead; }); return g; };
const B = BF.CFG.beishui;
// 每组测试前把配置拨回：on 关、不限“丢一半”（maxLeft: null）、宽松解将（strictEscape: false），再按需要改
const cfg = (x) => { const { fewer, ...rest } = x; Object.assign(B, { on: false, maxLeft: null, twoPieces: true, maxKills: 1, check: 'none', freeze: 1, strictEscape: false }, rest); B.fewer = { r: !!(fewer && fewer.r) }; };
const art = (s1, s2) => ({ k: 'art', steps: [{ from: s1[0], to: s1[1] }, { from: s2[0], to: s2[1] }] });
const find = (g, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.at(f, r); if (p && p.id === id) return { p, at: [f, r] }; } return null; };
const KR = () => P('r', 'k'), KB = () => P('b', 'k');

console.log('0. 全关：和原规则一样（同一枚子可以连走两步、吃两个子都行；有封锁）');
{ cfg({}); const R = P('b', 'r'), N = P('b', 'n');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [6, 7, N], [0, 5, P('r', 'p')], [0, 3, P('r', 'p')], [5, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  ok(!!BF.attempt(g.S, art([[0, 9], [0, 5]], [[0, 5], [0, 3]])), '全关：同一枚车连吃两个兵合法');
  const i = g.apply(art([[0, 9], [0, 5]], [[6, 7], [5, 5]])); ok(i && g.fx.pf === 3, '全关：破釜后封锁 3 回合'); }

console.log('1. 楚方车马炮比汉方少才能用');
{ cfg({ on: true, fewer: { b: true } });
  const mk = extra => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], ...extra]);
  const g1 = mk([]); ok(BF.ai.pofuPairs(g1.S).length > 0 && !!BF.attempt(g1.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚车马炮 1 < 汉 2：能用');
  const g2 = mk([[1, 9, P('b', 'n')]]); ok(BF.ai.pofuPairs(g2.S).length === 0 && !BF.attempt(g2.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚 2 = 汉 2：不能用');
  ok(!g2.pofuFirst().length, '界面的第一步候选也没有'); }

console.log('2. 两枚不同的子；最多吃一个子');
{ cfg({ on: true, fewer: { b: true } });
  const R = P('b', 'r'), N = P('b', 'n');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [6, 7, N], [0, 5, P('r', 'p')], [0, 3, P('r', 'p')], [5, 5, P('r', 'p')], [7, 4, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], [2, 0, P('r', 'c')]]);
  ok(!BF.attempt(g.S, art([[0, 9], [0, 7]], [[0, 7], [0, 5]])), '同一枚车走两步：不合法');
  ok(!BF.attempt(g.S, art([[0, 9], [0, 5]], [[6, 7], [5, 5]])), '车吃兵 + 马吃兵（两个）：不合法');
  ok(!!BF.attempt(g.S, art([[0, 9], [0, 5]], [[6, 7], [7, 5]])), '车吃兵 + 马走空格：合法');
  ok(BF.ai.pofuPairs(g.S).every(k => { const a = k.a.steps; return !(a[1].from[0] === a[0].to[0] && a[1].from[1] === a[0].to[1]); }), '电脑候选里没有同一枚子连走'); }

console.log('3. 将军：A 不许、B 可以');
{ const mk = () => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  cfg({ on: true, fewer: { b: true }, check: 'none' }); ok(!BF.attempt(mk().S, art([[0, 9], [3, 9]], [[8, 6], [8, 5]])), 'A：车平到帅所在的线将军 → 不合法');
  ok(!BF.attempt(mk().S, art([[8, 6], [8, 5]], [[0, 9], [3, 9]])), 'A：第二步将军也不合法');
  cfg({ on: true, fewer: { b: true }, check: 'allow' }); ok(!!BF.attempt(mk().S, art([[0, 9], [3, 9]], [[8, 6], [8, 5]])), 'B：可以将军'); }

console.log('4. 冻结一回合；被将军时可以吃子解将；没有技能封锁');
{ cfg({ on: true, fewer: { b: true } });
  const R = P('b', 'r'), Pn = P('b', 'p'), N = P('b', 'n'), RR = P('r', 'r');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [8, 6, Pn], [0, 5, P('r', 'p')], [1, 0, RR], [8, 0, P('r', 'r')], [6, 0, P('r', 'n')]]);
  const i = g.apply(art([[0, 9], [0, 5]], [[8, 6], [8, 5]])); ok(!!i && g.fx.pf === 0, '用了背水，没有技能封锁');
  ok(g.apply({ k: 'mv', from: [3, 0], to: [3, 1] }), '汉走一步');
  ok(!BF.attempt(g.S, { k: 'mv', from: [0, 5], to: [0, 6] }) && !BF.attempt(g.S, { k: 'mv', from: [8, 5], to: [8, 4] }), '楚下一回合：用过的车、兵都不能走');
  ok(g.apply({ k: 'mv', from: [5, 9], to: [4, 9] }), '楚只能走别的子（将）');
  ok(g.apply({ k: 'mv', from: [3, 1], to: [3, 0] }), '汉再走');
  ok(!!BF.attempt(g.S, { k: 'mv', from: [0, 5], to: [0, 6] }), '再下一回合：车解冻'); }
{ cfg({ on: true, fewer: { b: true } });   // 吃子解将
  const R = P('b', 'r', 1, { bz: 11 }), RR = P('r', 'r');
  const g = pos([[3, 0, KR()], [4, 9, KB()], [0, 5, R], [4, 5, RR], [8, 0, P('r', 'r')]]);
  ok(BF.ai.inCheck(g.S, 'b'), '楚将被汉车将军');
  ok(!!BF.attempt(g.S, { k: 'mv', from: [0, 5], to: [4, 5] }), '冻结的车吃掉将军的车：合法');
  const g2 = pos([[3, 0, KR()], [4, 9, KB()], [0, 7, P('b', 'r', 1, { bz: 11 })], [4, 5, P('r', 'r')], [8, 0, P('r', 'r')]]);
  ok(!BF.attempt(g2.S, { k: 'mv', from: [0, 7], to: [4, 7] }), '冻结的车去挡（不吃子）：不合法'); }

console.log('5. 将死判定认冻结');
{ cfg({ on: true, fewer: { b: true } });
  const base = bz => pos([[4, 0, KR()], [3, 9, KB()], [3, 5, P('r', 'r')], [4, 2, P('r', 'r')], [0, 7, P('b', 'r', 1, bz ? { bz: 11 } : {})]], { art: { b: 1 } });
  ok(BF.evaluate(base(true).S).result && BF.evaluate(base(true).S).result.reason === 'checkmate', '只能靠冻结的车挡将：判将死');
  ok(!(BF.evaluate(base(false).S).result), '车没冻结：能挡，不是将死');
  const g3 = pos([[4, 0, KR()], [3, 9, KB()], [3, 5, P('r', 'r')], [4, 2, P('r', 'r')], [0, 5, P('b', 'r', 1, { bz: 11 })]], { art: { b: 1 } });
  ok(!(BF.evaluate(g3.S).result), '冻结的车能吃掉将军的车：不是将死'); }

console.log('6. 冻结的子不能用会挪位置的技能');
{ cfg({ on: true, fewer: { b: true } });
  const mk = bz => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r', 3, bz ? { bz: 11 } : {})], [0, 6, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  const cz = S => BF.ai.expand(S).some(k => k.a.k === 'sk' && k.a.at[0] === 0 && k.a.at[1] === 9);
  ok(cz(mk(false).S), '没冻结：三级车能冲阵'); ok(!cz(mk(true).S), '冻结：不能冲阵'); }

console.log('7. 被将军时，电脑候选里也有不打子的两步（防守）');
{ cfg({ on: true, fewer: { b: true } });
  const g = pos([[3, 0, KR()], [4, 9, KB()], [4, 5, P('r', 'r')], [8, 0, P('r', 'r')], [0, 7, P('b', 'r')], [8, 6, P('b', 'p')], [0, 3, P('r', 'p')]]);
  const pf = BF.ai.pofuPairs(g.S); const quiet = pf.filter(k => k.ev.every(e => e.e !== 'kill' && e.e !== 'hit'));
  ok(pf.length > 0 && quiet.length > 0, `被将军：有 ${quiet.length} 种不打子的组合（共 ${pf.length}）`);
  const g2 = pos([[3, 0, KR()], [4, 9, KB()], [8, 0, P('r', 'r')], [1, 0, P('r', 'r')], [0, 7, P('b', 'r')], [8, 6, P('b', 'p')], [0, 3, P('r', 'p')]]);
  ok(BF.ai.pofuPairs(g2.S).every(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit')), '没被将军：只列打子的组合（和原来一样）'); }

console.log('8. 汉方召回也要少子（fewer.r）');
{ cfg({ fewer: { r: true } });
  const mk = extra => pos([[3, 0, KR()], [4, 9, KB()], [0, 9, P('b', 'r')], [8, 9, P('b', 'r')], [8, 0, P('r', 'r')], ...extra], { turn: 'r', dead: { r: [{ id: 0, t: 'r', s: 'r' }], b: [] } });
  ok(!!BF.attempt(mk([]).S, { k: 'art', id: 0 }), '汉 1 < 楚 2：能召回');
  ok(!BF.attempt(mk([[1, 2, P('r', 'c')]]).S, { k: 'art', id: 0 }), '汉 2 = 楚 2：不能召回');
  ok(!BF.ai.expand(mk([[1, 2, P('r', 'c')]]).S).some(k => k.a.k === 'art'), '电脑候选里也没有召回');
  cfg({}); ok(!!BF.attempt(mk([[1, 2, P('r', 'c')]]).S, { k: 'art', id: 0 }), '关掉 fewer.r：照常能召回'); }
cfg({});
const cfg2 = cfg;

console.log('11. 冻结的子只能吃掉将军的那枚（strictEscape）');
{ const mk = () => pos([[3, 0, KR()], [4, 9, KB()], [4, 7, P('b', 'r', 1, { bz: 11 })], [4, 4, P('r', 'c')], [0, 7, P('r', 'p')], [8, 0, P('r', 'r')], [1, 0, P('r', 'r')]]);
  cfg2({ on: true, fewer: { b: true }, strictEscape: true }); const g = mk();
  ok(BF.ai.inCheck(g.S, 'b'), '汉炮隔着冻结的楚车将军');
  ok(!BF.attempt(g.S, { k: 'mv', from: [4, 7], to: [0, 7] }), '冻结的车去吃别的兵（炮架没了、将也解了）：不合法');
  ok(!!BF.attempt(g.S, { k: 'mv', from: [4, 7], to: [4, 4] }), '冻结的车吃掉将军的炮：合法');
  cfg2({ on: true, fewer: { b: true } }); ok(!!BF.attempt(mk().S, { k: 'mv', from: [4, 7], to: [0, 7] }), '关掉 strictEscape：照第一版吃别的兵也行'); }
console.log('12. 至少丢了一半车马炮（maxLeft = 3）');
{ cfg2({ on: true, maxLeft: 3 });
  const base = [[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], [1, 0, P('r', 'n')], [7, 0, P('r', 'n')], [1, 2, P('r', 'c')]];
  const g3 = pos([...base, [1, 9, P('b', 'n')], [7, 9, P('b', 'n')]]); ok(!!BF.attempt(g3.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚剩 3 枚、汉 5 枚：能用');
  const g4 = pos([...base, [1, 9, P('b', 'n')], [7, 9, P('b', 'n')], [1, 7, P('b', 'c')]]); ok(!BF.attempt(g4.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚剩 4 枚（比汉少，但没丢一半）：不能用');
  B.maxLeft = null; ok(!!BF.attempt(g4.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '不设 maxLeft：照第一版能用'); }
console.log('13. 电脑候选（pofuPairs 快的写法）和逐个试走（pofuPairsRef）逐项相同——背水开着，两种将军规则都核对');
for (const check of ['none', 'allow']) {
  cfg2({ on: true, maxLeft: 3, strictEscape: true, check });
  let seed = 4242; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let positions = 0, pairs = 0, quiet = 0;
  for (let gi = 0; gi < 6; gi++) {
    const g = new BF.Game();
    // 开局先拿掉楚方两车一马一炮（剩 2 枚，比汉方少），让背水一开始就能用
    g.setup(S => { let n = { r: 2, n: 1, c: 1 }; for (const row of S.board) for (let f = 0; f < 9; f++) { const q = row[f]; if (q && q.s === 'b' && n[q.t]) { n[q.t]--; row[f] = null; } } S.merit.r = S.merit.b = 10; });
    for (let ply = 0; ply < 50 && !g.result; ply++) {
      const S = BF.cloneState(g.S);
      if (S.turn === 'b' && !S.used.art.b) {
        const A = BF.ai.pofuPairs(S), R = BF.ai.pofuPairsRef(S), key = k => JSON.stringify(k.a), mR = new Map(R.map(k => [key(k), k]));
        assert.ok(A.length === R.length, `背水组合个数不同：${A.length} 对 ${R.length}`);
        for (const k of A) { const o = mR.get(key(k)); assert.ok(o && JSON.stringify(o.S) === JSON.stringify(k.S) && JSON.stringify(o.ev) === JSON.stringify(k.ev), '背水组合结算不同：' + key(k)); }
        for (const k of A) {
          const st = k.a.steps, p1 = S.board[st[0].from[1]][st[0].from[0]];
          assert.ok(k.ev.filter(e => e.e === 'kill' && !e.friendly && e.s === 'r').length <= 1, '背水组合吃了不止一个子');
          if (check === 'none') assert.ok(!BF.ai.inCheck(k.S, 'r'), '不许将军的版本里出现了将军的组合');
          assert.ok(k.S.board.flat().filter(q => q && q.s === 'b' && q.bz).length === 2 || k.ev.some(e => e.e === 'kill' && e.s === 'b'), '应该正好冻结两枚子');
          if (!k.ev.some(e => e.e === 'kill' || e.e === 'hit')) quiet++;
        }
        if (A.length) { positions++; pairs += A.length; }
      }
      const kids = BF.ai.expand(g.S).filter(k => k.a.k === 'mv' || k.a.k === 'sk');
      if (!kids.length) break;
      const caps = kids.filter(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit'));
      const pick = caps.length && rnd() < 0.5 ? caps[Math.floor(rnd() * caps.length)] : kids[Math.floor(rnd() * kids.length)];
      if (!g.apply(pick.a)) break;
    }
  }
  ok(positions >= 20 && pairs > 500, `check=${check}：${positions} 个局面、${pairs} 个组合逐项相同（其中不打子的防守组合 ${quiet} 个）`);
}
cfg2({});
Object.assign(B, { on: false, maxLeft: 3, twoPieces: true, maxKills: 1, check: 'none', freeze: 1, strictEscape: true }); B.fewer = { r: false };
console.log('BEISHUI OK', pass, '项');
