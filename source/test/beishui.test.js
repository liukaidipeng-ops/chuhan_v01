// 背水一战（CFG.beishui）：引擎规则测试。由 Code 的模拟自测（tools/variants/test_beishui2.js）改来，配置换成 src/bingfa.js 里的写法
'use strict';
const assert = require('assert');
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
let pid = 600; const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const pos = (pieces, o = {}) => { const g = new BF.Game(); g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of pieces) T.board[r][f] = p; T.turn = o.turn || 'b'; T.merit = { r: 0, b: 0, ...(o.merit || {}) }; T.used = { art: { r: 0, b: 0, ...(o.art || {}) }, ult: { r: 0, b: 0 } }; T.cnt = { r: 10, b: 10 }; if (o.dead) T.dead = o.dead; }); return g; };
const B = BF.CFG.beishui;
const DEF = { on: true, maxLeft: 3, twoPieces: false, maxKills: 1, freeze: 1, strictEscape: true };   // 正式默认（2026-10-05 起背水一战代替破釜沉舟；一枚子走两步、两枚子各走一步都行）
const DEF_AT_LOAD = JSON.stringify(B);
// 每组测试前把配置拨回：on 关、不限“丢一半”（maxLeft: null）、宽松解将（strictEscape: false），再按需要改
const cfg = (x) => { Object.assign(B, { on: false, maxLeft: null, twoPieces: true, maxKills: 1, freeze: 1, strictEscape: false }, x); };
const art = (s1, s2) => ({ k: 'art', steps: [{ from: s1[0], to: s1[1] }, { from: s2[0], to: s2[1] }] });
const find = (g, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.at(f, r); if (p && p.id === id) return { p, at: [f, r] }; } return null; };
const KR = () => P('r', 'k'), KB = () => P('b', 'k');

console.log('0. 全关：和原规则一样（同一枚子可以连走两步、吃两个子都行；有封锁）');
{ cfg({}); const R = P('b', 'r'), N = P('b', 'n');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [6, 7, N], [0, 5, P('r', 'p')], [0, 3, P('r', 'p')], [5, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  ok(!!BF.attempt(g.S, art([[0, 9], [0, 5]], [[0, 5], [0, 3]])), '全关：同一枚车连吃两个兵合法');
  const i = g.apply(art([[0, 9], [0, 5]], [[6, 7], [5, 5]])); ok(i && g.fx.pf === 3, '全关：破釜后封锁 3 回合'); }

console.log('1. 楚方车马炮比汉方少才能用');
{ cfg({ on: true });
  const mk = extra => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], ...extra]);
  const g1 = mk([]); ok(BF.ai.pofuPairs(g1.S).length > 0 && !!BF.attempt(g1.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚车马炮 1 < 汉 2：能用');
  const g2 = mk([[1, 9, P('b', 'n')]]); ok(BF.ai.pofuPairs(g2.S).length === 0 && !BF.attempt(g2.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚 2 = 汉 2：不能用');
  ok(!g2.pofuFirst().length, '界面的第一步候选也没有'); }

console.log('2. 两枚不同的子；最多吃一个子');
{ cfg({ on: true });
  const R = P('b', 'r'), N = P('b', 'n');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [6, 7, N], [0, 5, P('r', 'p')], [0, 3, P('r', 'p')], [5, 5, P('r', 'p')], [7, 4, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], [2, 0, P('r', 'c')]]);
  ok(!BF.attempt(g.S, art([[0, 9], [0, 7]], [[0, 7], [0, 5]])), '同一枚车走两步：不合法');
  ok(!BF.attempt(g.S, art([[0, 9], [0, 5]], [[6, 7], [5, 5]])), '车吃兵 + 马吃兵（两个）：不合法');
  ok(!!BF.attempt(g.S, art([[0, 9], [0, 5]], [[6, 7], [7, 5]])), '车吃兵 + 马走空格：合法');
  ok(BF.ai.pofuPairs(g.S).every(k => { const a = k.a.steps; return !(a[1].from[0] === a[0].to[0] && a[1].from[1] === a[0].to[1]); }), '电脑候选里没有同一枚子连走'); }

console.log('3. 只看结算：两步走完时楚将不被将、也不将着汉帅；过程不限');
{ cfg({ on: true });
  const mk = () => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  ok(!BF.attempt(mk().S, art([[8, 6], [8, 5]], [[0, 9], [3, 9]])), '第二步将军、走完还将着对方：不合法');
  ok(!BF.attempt(mk().S, art([[0, 9], [3, 9]], [[8, 6], [8, 5]])), '第一步将军、第二步没挡上：不合法');
  const chk = () => pos([[3, 0, KR()], [5, 9, KB()], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], [6, 0, P('r', 'n')], [0, 5, P('b', 'r')], [1, 4, P('b', 'n')]]);
  ok(!!BF.attempt(chk().S, art([[0, 5], [3, 5]], [[1, 4], [3, 3]])), '第一步将了对方、第二步自己挡上：合法');
  ok(!BF.attempt(chk().S, art([[1, 4], [2, 6]], [[0, 5], [3, 5]])), '走完将着对方：不合法');
  const dbl = () => pos([[3, 0, KR()], [4, 9, KB()], [0, 9, P('r', 'r')], [4, 4, P('r', 'r')], [6, 0, P('r', 'n')], [2, 7, P('b', 'r')], [6, 6, P('b', 'c')]]);
  ok(BF.ai.inCheck(dbl().S, 'b'), '楚将被两路车双将');
  ok(!!BF.attempt(dbl().S, art([[2, 7], [2, 9]], [[6, 6], [4, 6]])), '两枚子各挡一路解双将：合法');
  ok(BF.ai.pofuPairs(dbl().S).some(k => JSON.stringify(k.a) === JSON.stringify(art([[2, 7], [2, 9]], [[6, 6], [4, 6]]))), '电脑候选里有这一手');
  ok(!BF.evaluate(dbl().S).result, '有这一手，就不判将死');
  ok(dbl().pofuFirst().some(m => m.from[0] === 2 && m.from[1] === 7 && m.to[0] === 2 && m.to[1] === 9), '界面第一步候选里有“先挡一路”（走完第一步还被将着）');
  // 将先走进被将的格子，第二步再挡上
  const kin = () => pos([[3, 0, KR()], [4, 9, KB()], [5, 3, P('r', 'r')], [8, 0, P('r', 'r')], [6, 0, P('r', 'n')], [0, 8, P('b', 'r')]]);
  ok(!BF.attempt(kin().S, { k: 'mv', from: [4, 9], to: [5, 9] }), '平时：将不能走进车口');
  ok(!!BF.attempt(kin().S, art([[4, 9], [5, 9]], [[0, 8], [5, 8]])), '背水：将先走进车口、车再挡上：合法');
  ok(!BF.attempt(kin().S, art([[4, 9], [5, 9]], [[0, 8], [0, 7]])), '背水：将走进车口、第二步没挡：不合法'); }
console.log('3b. 最多死一个汉子：践踏踩死的也算');
{ cfg({ on: true });
  const E = P('b', 'e', 4), N = P('b', 'n');
  // 四级楚象（践踏）吃掉 (4,7) 的兵，周围一圈的一血汉兵也被踩死 → 两个子
  const g = pos([[3, 0, KR()], [5, 9, KB()], [2, 9, E], [7, 9, N], [4, 7, P('r', 'p')], [5, 6, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  const r1 = BF.attempt(g.S, { k: 'mv', from: [2, 9], to: [4, 7] });
  ok(r1 && r1.ev.filter(e => e.e === 'kill' && e.s === 'r').length === 2, '前提：象吃兵 + 践踏踩死旁边的兵（单走这一步死两个）');
  ok(!BF.attempt(g.S, art([[2, 9], [4, 7]], [[7, 9], [6, 7]])), '背水里这样走：死了两个子，不合法'); }

console.log('4. 冻结一回合；被将军时可以吃子解将；没有技能封锁');
{ cfg({ on: true });
  const R = P('b', 'r'), Pn = P('b', 'p'), N = P('b', 'n'), RR = P('r', 'r');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [8, 6, Pn], [0, 5, P('r', 'p')], [1, 0, RR], [8, 0, P('r', 'r')], [6, 0, P('r', 'n')]]);
  const i = g.apply(art([[0, 9], [0, 5]], [[8, 6], [8, 5]])); ok(!!i && g.fx.pf === 0, '用了背水，没有技能封锁');
  ok(g.apply({ k: 'mv', from: [3, 0], to: [3, 1] }), '汉走一步');
  ok(!BF.attempt(g.S, { k: 'mv', from: [0, 5], to: [0, 6] }) && !BF.attempt(g.S, { k: 'mv', from: [8, 5], to: [8, 4] }), '楚下一回合：用过的车、兵都不能走');
  ok(g.apply({ k: 'mv', from: [5, 9], to: [4, 9] }), '楚只能走别的子（将）');
  ok(g.apply({ k: 'mv', from: [3, 1], to: [3, 0] }), '汉再走');
  ok(!!BF.attempt(g.S, { k: 'mv', from: [0, 5], to: [0, 6] }), '再下一回合：车解冻'); }
{ cfg({ on: true });   // 吃子解将
  const R = P('b', 'r', 1, { bz: 11 }), RR = P('r', 'r');
  const g = pos([[3, 0, KR()], [4, 9, KB()], [0, 5, R], [4, 5, RR], [8, 0, P('r', 'r')]]);
  ok(BF.ai.inCheck(g.S, 'b'), '楚将被汉车将军');
  ok(!!BF.attempt(g.S, { k: 'mv', from: [0, 5], to: [4, 5] }), '冻结的车吃掉将军的车：合法');
  const g2 = pos([[3, 0, KR()], [4, 9, KB()], [0, 7, P('b', 'r', 1, { bz: 11 })], [4, 5, P('r', 'r')], [8, 0, P('r', 'r')]]);
  ok(!BF.attempt(g2.S, { k: 'mv', from: [0, 7], to: [4, 7] }), '冻结的车去挡（不吃子）：不合法'); }

console.log('5. 将死判定认冻结');
{ cfg({ on: true });
  const base = bz => pos([[4, 0, KR()], [3, 9, KB()], [3, 5, P('r', 'r')], [4, 2, P('r', 'r')], [0, 7, P('b', 'r', 1, bz ? { bz: 11 } : {})]], { art: { b: 1 } });
  ok(BF.evaluate(base(true).S).result && BF.evaluate(base(true).S).result.reason === 'checkmate', '只能靠冻结的车挡将：判将死');
  ok(!(BF.evaluate(base(false).S).result), '车没冻结：能挡，不是将死');
  const g3 = pos([[4, 0, KR()], [3, 9, KB()], [3, 5, P('r', 'r')], [4, 2, P('r', 'r')], [0, 5, P('b', 'r', 1, { bz: 11 })]], { art: { b: 1 } });
  ok(!(BF.evaluate(g3.S).result), '冻结的车能吃掉将军的车：不是将死'); }

console.log('6. 冻结的子不能用会挪位置的技能');
{ cfg({ on: true });
  const mk = bz => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r', 3, bz ? { bz: 11 } : {})], [0, 6, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  const cz = S => BF.ai.expand(S).some(k => k.a.k === 'sk' && k.a.at[0] === 0 && k.a.at[1] === 9);
  ok(cz(mk(false).S), '没冻结：三级车能冲阵'); ok(!cz(mk(true).S), '冻结：不能冲阵'); }

console.log('7. 被将军时，电脑候选里也有不打子的两步（防守）');
{ cfg({ on: true });
  const g = pos([[3, 0, KR()], [4, 9, KB()], [4, 5, P('r', 'r')], [8, 0, P('r', 'r')], [0, 7, P('b', 'r')], [8, 6, P('b', 'p')], [0, 3, P('r', 'p')]]);
  const pf = BF.ai.pofuPairs(g.S); const quiet = pf.filter(k => k.ev.every(e => e.e !== 'kill' && e.e !== 'hit'));
  ok(pf.length > 0 && quiet.length > 0, `被将军：有 ${quiet.length} 种不打子的组合（共 ${pf.length}）`);
  const g2 = pos([[3, 0, KR()], [4, 9, KB()], [8, 0, P('r', 'r')], [1, 0, P('r', 'r')], [0, 7, P('b', 'r')], [8, 6, P('b', 'p')], [0, 3, P('r', 'p')]]);
  ok(BF.ai.pofuPairs(g2.S).every(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit')), '没被将军：只列打子的组合（和原来一样）'); }

console.log('8. 背水开着时，汉方召回也看同一个条件（车马炮最多剩 maxLeft 枚且比楚方少）');
{ const mk = (extraR, extraB = []) => pos([[3, 0, KR()], [4, 9, KB()], [0, 9, P('b', 'r')], [8, 9, P('b', 'r')], [8, 0, P('r', 'r')], ...extraR, ...extraB], { turn: 'r', dead: { r: [{ id: 0, t: 'r', s: 'r' }], b: [] } });
  cfg({ on: true, maxLeft: 3 });
  ok(!!BF.attempt(mk([]).S, { k: 'art', id: 0 }), '汉 1 < 楚 2：能召回');
  ok(!BF.attempt(mk([[1, 2, P('r', 'c')]]).S, { k: 'art', id: 0 }), '汉 2 = 楚 2：不能召回');
  ok(!BF.ai.expand(mk([[1, 2, P('r', 'c')]]).S).some(k => k.a.k === 'art'), '电脑候选里也没有召回');
  ok(!mk([[1, 2, P('r', 'c')]]).reviveOptions().length && !BF.ai.artReady(mk([[1, 2, P('r', 'c')]]).S), '界面的召回候选、artReady 也是没有');
  const many = [[1, 2, P('r', 'c')], [7, 2, P('r', 'c')], [1, 0, P('r', 'n')]], manyB = [[1, 9, P('b', 'n')], [7, 9, P('b', 'n')], [1, 7, P('b', 'c')]];
  ok(!BF.attempt(mk(many, manyB).S, { k: 'art', id: 0 }), '汉 4 < 楚 5，但没丢到一半（剩 4 枚）：不能召回');
  cfg({}); ok(!!BF.attempt(mk([[1, 2, P('r', 'c')]]).S, { k: 'art', id: 0 }), '背水关着：照常能召回（没有这个条件）'); }
cfg({});
const cfg2 = cfg;

console.log('11. 冻结的子只能吃掉将军的那枚（strictEscape）');
{ const mk = () => pos([[3, 0, KR()], [4, 9, KB()], [4, 7, P('b', 'r', 1, { bz: 11 })], [4, 4, P('r', 'c')], [0, 7, P('r', 'p')], [8, 0, P('r', 'r')], [1, 0, P('r', 'r')]]);
  cfg2({ on: true, strictEscape: true }); const g = mk();
  ok(BF.ai.inCheck(g.S, 'b'), '汉炮隔着冻结的楚车将军');
  ok(!BF.attempt(g.S, { k: 'mv', from: [4, 7], to: [0, 7] }), '冻结的车去吃别的兵（炮架没了、将也解了）：不合法');
  ok(!!BF.attempt(g.S, { k: 'mv', from: [4, 7], to: [4, 4] }), '冻结的车吃掉将军的炮：合法');
  cfg2({ on: true }); ok(!!BF.attempt(mk().S, { k: 'mv', from: [4, 7], to: [0, 7] }), '关掉 strictEscape：照第一版吃别的兵也行'); }
console.log('12. 至少丢了一半车马炮（maxLeft = 3）');
{ cfg2({ on: true, maxLeft: 3 });
  const base = [[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')], [1, 0, P('r', 'n')], [7, 0, P('r', 'n')], [1, 2, P('r', 'c')]];
  const g3 = pos([...base, [1, 9, P('b', 'n')], [7, 9, P('b', 'n')]]); ok(!!BF.attempt(g3.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚剩 3 枚、汉 5 枚：能用');
  const g4 = pos([...base, [1, 9, P('b', 'n')], [7, 9, P('b', 'n')], [1, 7, P('b', 'c')]]); ok(!BF.attempt(g4.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '楚剩 4 枚（比汉少，但没丢一半）：不能用');
  B.maxLeft = null; ok(!!BF.attempt(g4.S, art([[0, 9], [0, 5]], [[8, 6], [8, 5]])), '不设 maxLeft：照第一版能用'); }
console.log('13. 电脑候选（pofuPairs 快的写法）和逐个试走（pofuPairsRef）逐项相同——背水开着');
for (const check of ['none']) {
  cfg2({ on: true, maxLeft: 3, strictEscape: true });
  let seed = 4242; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let positions = 0, pairs = 0, quiet = 0; const whys = {};
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
          assert.ok(!BF.ai.inCheck(k.S, 'r') && !BF.ai.inCheck(k.S, 'b'), '走完之后有一方被将着');
          assert.ok(k.S.board.flat().filter(q => q && q.s === 'b' && q.bz).length === 2 || k.ev.some(e => e.e === 'kill' && e.s === 'b'), '应该正好冻结两枚子');
          if (!k.ev.some(e => e.e === 'kill' || e.e === 'hit')) quiet++;
        }
        if (A.length) { positions++; pairs += A.length; }
        // 界面用的两个函数（不筛合法性的列法 + 判定）和引擎对得上：判“行”的正好是 attempt 认的；引擎认的组合都在列法里
        if (A.length) {
          const F1 = g.bsFree().list, has = (L, m) => L.some(x => x.from[0] === m.from[0] && x.from[1] === m.from[1] && x.to[0] === m.to[0] && x.to[1] === m.to[1]);
          for (const k of A.slice(0, 40)) assert.ok(has(F1, k.a.steps[0]) && has(g.bsFree(k.a.steps[0]).list, k.a.steps[1]), '引擎认的组合不在界面列法里：' + key(k));
          for (let i = 0; i < F1.length; i += 3) for (const m2 of g.bsFree(F1[i]).list) {
            const steps = [{ from: F1[i].from, to: F1[i].to }, { from: m2.from, to: m2.to }], j = g.bsJudge(steps), real = BF.attempt(S, { k: 'art', steps });
            assert.ok(j.ok === !!real, '界面判定和引擎不一致：' + JSON.stringify(steps));
            if (j.ok) continue;
            whys[j.why] = (whys[j.why] || 0) + 1;
            if (j.why === 'self' || j.why === 'give' || j.why === 'face') assert.ok(j.marks.length >= 2 && j.links.length >= 1, '将军类的不合法要标出将 / 帅和将军的子');
            if (j.why === 'kills') assert.ok(j.marks.length >= 2, '吃多了要标出被吃的子');
          }
        }
      }
      const kids = BF.ai.expand(g.S).filter(k => k.a.k === 'mv' || k.a.k === 'sk');
      if (!kids.length) break;
      const caps = kids.filter(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit'));
      const pick = caps.length && rnd() < 0.5 ? caps[Math.floor(rnd() * caps.length)] : kids[Math.floor(rnd() * kids.length)];
      if (!g.apply(pick.a)) break;
    }
  }
  ok((whys.self || 0) > 50 && (whys.other || 0) * 20 < Object.values(whys).reduce((x, y) => x + y, 0), '界面判定：不合法的原因 ' + JSON.stringify(whys));
  ok(positions >= 20 && pairs > 500, `${positions} 个局面、${pairs} 个组合逐项相同（其中不打子的防守组合 ${quiet} 个）`);
}
console.log('14. 正式默认：背水一战开着，一枚子走两步、两枚子各走一步都行');
{ ok(DEF_AT_LOAD === JSON.stringify(DEF), '引擎的默认配置就是正式规则：' + DEF_AT_LOAD);
  Object.assign(B, DEF);
  const mk = () => pos([[3, 0, KR()], [5, 9, KB()], [0, 9, P('b', 'r')], [8, 6, P('b', 'p')], [0, 5, P('r', 'p')], [0, 3, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  const g = mk(), hitRun = art([[0, 9], [0, 5]], [[0, 5], [0, 8]]), twoKills = art([[0, 9], [0, 5]], [[0, 5], [0, 3]]), two = art([[0, 9], [0, 5]], [[8, 6], [8, 5]]);
  ok(!!BF.attempt(g.S, hitRun), '同一辆车吃一个兵再撤回来：合法');
  ok(!BF.attempt(g.S, twoKills), '同一辆车连吃两个兵：不合法（最多吃一个）');
  ok(!!BF.attempt(g.S, two), '两枚不同的子各走一步：照样合法');
  const key = a => JSON.stringify(a.steps), pairs = BF.ai.pofuPairs(g.S).map(k => key(k.a));
  ok(pairs.includes(key(hitRun)) && pairs.includes(key(two)) && !pairs.includes(key(twoKills)), '电脑候选里有“吃完就撤”和“两枚子各一步”，没有“连吃两个”');
  const f2 = g.bsFree({ from: [0, 9], to: [0, 5] }).list;
  ok(f2.some(m => m.from[0] === 0 && m.from[1] === 5), '界面第二步：刚走过的那辆车还能再点');
  ok(g.bsJudge(hitRun.steps).ok && g.bsJudge(twoKills.steps).why === 'kills', '界面判定：吃完就撤合法；连吃两个说“吃多了”');
  B.twoPieces = true; ok(!g.bsFree({ from: [0, 9], to: [0, 5] }).list.some(m => m.from[0] === 0 && m.from[1] === 5) && !BF.attempt(g.S, hitRun), 'twoPieces 打开：同一枚子不能走两步'); B.twoPieces = false;
  ok(!!g.apply(hitRun), '走：车吃兵再撤回');
  const frozen = g.S.board.flat().filter(q => q && q.s === 'b' && q.bz);
  ok(frozen.length === 1 && frozen[0].t === 'r', '只用了一枚子，就只冻那一枚');
  ok(!!g.apply({ k: 'mv', from: [8, 0], to: [8, 1] }), '汉方走一步');
  ok(!BF.attempt(g.S, { k: 'mv', from: [0, 8], to: [0, 7] }) && !!BF.attempt(g.S, { k: 'mv', from: [8, 6], to: [8, 5] }), '下一回合：用过的车不能动，别的子照常'); }
cfg2({});
Object.assign(B, DEF);
console.log('BEISHUI OK', pass, '项');
