// 背水一战变体引擎自测
'use strict';
const assert = require('assert');
global.XQ = require(require('path').join(__dirname, '..', '..', 'src', 'rules.js'));
const BF = global.BF = require(require('./engine_beishui.js').enginePath());
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
let pid = 600; const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const pos = (pieces, o = {}) => { const g = new BF.Game(); g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of pieces) T.board[r][f] = p; T.turn = o.turn || 'b'; T.merit = { r: 0, b: 0, ...(o.merit || {}) }; T.used = { art: { r: 0, b: 0, ...(o.art || {}) }, ult: { r: 0, b: 0 } }; T.cnt = { r: 10, b: 10 }; if (o.dead) T.dead = o.dead; }); return g; };
const B = BF.CFG.beishui;
const cfg = (x) => { Object.assign(B, { on: false, twoPieces: true, maxKills: 1, check: 'none', freeze: 1 }, x); B.fewer = { r: false, b: false, ...(x.fewer || {}) }; };
const art = (s1, s2) => ({ k: 'art', steps: [{ from: s1[0], to: s1[1] }, { from: s2[0], to: s2[1] }] });
const find = (g, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.at(f, r); if (p && p.id === id) return { p, at: [f, r] }; } return null; };
const KR = () => P('r', 'k'), KB = () => P('b', 'k');

console.log('0. 全关：和原规则一样（同一枚子可以连走两步、吃两个子都行；有封锁）');
{ cfg({}); const R = P('b', 'r'), N = P('b', 'n');
  const g = pos([[3, 0, KR()], [5, 9, KB()], [0, 9, R], [6, 7, N], [0, 5, P('r', 'p')], [0, 3, P('r', 'p')], [5, 5, P('r', 'p')], [0, 0, P('r', 'r')], [8, 0, P('r', 'r')]]);
  ok(!!BF.attempt(g.S, art([[0, 9], [0, 5]], [[0, 5], [0, 3]])), '全关：同一枚车连吃两个兵合法');
  const i = g.apply(art([[0, 9], [0, 5]], [[6, 7], [5, 5]])); ok(i && g.fx.pf === 3, '全关：破釜后封锁 3 回合'); }

console.log('1. 少子才能用（fewer.b）');
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
console.log('通过', pass, '项');
