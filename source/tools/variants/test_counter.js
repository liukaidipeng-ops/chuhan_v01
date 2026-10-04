// 反击变体引擎（engine_counter.js，底版 git 98dd206 = 背水一战正式版）自测
//   用法（在 source/ 下）：node tools/variants/test_counter.js
//   环境变量：ENGINE_REV = 底版（默认 98dd206，和 engine_counter.js 一样；这份自测要用到背水一战和 BF.ai.pofuPairsRef，底版得是 98dd206 那样的）；
//             CTR_FAST=1 跳过最后用 bfsim 的三段（逐局核对、两种配置试跑、配置写错时每局报错；这三段约 3 分钟，其余约 20 秒）；CTR_JOBS = bfsim 并行数（默认 2）
//   规则层逐条核对之外，还有三段大一点的：
//     · 背水两步里的还手：电脑用的快写法 BF.ai.pofuPairs 和逐个 attempt 的 BF.ai.pofuPairsRef 在一批局面上逐项相同（反击开着）；
//     · 开关全关时和底版引擎逐项相同（同一批局面的 expand / gen / pofuPairs / evaluate）；
//     · 开关全关时 bfsim 6 局和底版逐局相同（[winner, reason, rounds, plies, act, kills, up]）。
'use strict';
const assert = require('assert'), path = require('path'), os = require('os'), fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');
const SRC = path.join(__dirname, '..', '..');   // source/
const REV = process.env.ENGINE_REV || '98dd206';
global.XQ = require(path.join(SRC, 'src', 'rules.js'));
const ENG = require('./engine_counter.js').enginePath(), BF = require(ENG);
const DEF = { counter: JSON.stringify(BF.CFG.counter), huichun: JSON.stringify(BF.CFG.skills.huichun) };   // 一开始的默认值（下面会改配置）
// 底版引擎（对照用）：同一个提交的 src/bingfa.js 原样
const baseFile = path.join(os.tmpdir(), `bingfa_ctrbase_${REV.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
fs.writeFileSync(baseFile, execFileSync('git', ['show', REV + ':source/src/bingfa.js'], { cwd: SRC, encoding: 'utf8' }));
process.on('exit', () => { for (const f of [ENG, baseFile]) try { fs.unlinkSync(f); } catch (e) { } });   // 临时文件：通过、失败都删
const BASE = require(baseFile);
global.BF = BF;

let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
let pid = 600; const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const pos = (pieces, o = {}) => { const g = new BF.Game(); g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of pieces) T.board[r][f] = p; T.turn = o.turn || 'b'; T.merit = { r: 0, b: 0, ...(o.merit || {}) }; T.used = { art: { r: 0, b: 0, ...(o.art || {}) }, ult: { r: 0, b: 0 } }; T.cnt = { r: 10, b: 10 }; if (o.fx) Object.assign(T.fx, o.fx); }); return g; };
const C = BF.CFG.counter, B = BF.CFG.beishui, SK = BF.CFG.skills, ATK_A = BF.CFG.attack.a.slice();
const NEW_RULES = { on: true, maxLeft: 3, twoPieces: false, maxKills: 1, freeze: 1, strictEscape: true };   // 现在的规则：背水开着、两种走法都可以
// 每段测试前把配置拨回：新规则，反击、回春全关；再按需要改（x.bs 改背水，x.atkA 改士的攻击力，x.huichun / x.qishe 改解锁等级）
const cfg = (c = {}, x = {}) => {
  Object.assign(C, { a: false, e: false, dmg: 1, onDeath: false, pfSeal: false }, c);
  Object.assign(B, NEW_RULES, x.bs || {});
  BF.CFG.attack.a = (x.atkA || ATK_A).slice(); SK.huichun.level = x.huichun || 99; SK.qishe.level = x.qishe || 4;
};
const ON = { a: true, e: true };
const mv = (from, to) => ({ k: 'mv', from, to }), sk = (at, to, s) => { const a = { k: 'sk', at }; if (to) a.to = to; if (s) a.sk = s; return a; };
const art = (s1, s2) => ({ k: 'art', steps: [{ from: s1[0], to: s1[1] }, { from: s2[0], to: s2[1] }] });
const fj = r => r.ev.filter(e => e.e === 'fanji');
const find = (S, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.id === id) return { p, at: [f, r] }; } return null; };
const at2 = x => (x ? x.at.join(',') : '-');
const KR = () => P('r', 'k'), KB = () => P('b', 'k');
const HAN4 = () => [[0, 0, P('r', 'r')], [8, 0, P('r', 'r')], [1, 0, P('r', 'n')], [7, 0, P('r', 'n')]];   // 汉方四枚车马（背水要楚方车马炮比汉少）
// 局面甲：汉帅 (4,0)、汉士 (4,1)，楚车从 (4,5) 直冲九宫打士（近战）
const posA = (rLv, aLv, rx = {}, ax = {}) => { const R = P('b', 'r', rLv, rx), A = P('r', 'a', aLv, ax); return { g: pos([[4, 0, KR()], [4, 1, A], ...HAN4(), [3, 9, KB()], [4, 5, R]]), R, A }; };
// 局面乙：楚象 (4,7)、炮架（楚卒）(4,5)，汉炮在 (4,2) 隔着炮架打象（远程）；extra 另摆子（如象左右的楚士）
const posB = (cLv, eLv, cx = {}, extra = []) => { const Cn = P('r', 'c', cLv, cx), E = P('b', 'e', eLv); return { g: pos([[5, 0, KR()], [4, 2, Cn], [3, 9, KB()], [4, 7, E], [4, 5, P('b', 'p')], ...extra], { turn: 'r' }), Cn, E }; };

console.log('0. 默认全关：配置项都在、默认关；不开开关时和原来一样');
{ ok(DEF.counter === '{"a":false,"e":false,"dmg":1,"onDeath":false,"pfSeal":false}' && DEF.huichun === '{"level":99,"cooldown":999,"heal":1}', '默认 CFG.counter 全关、回春解锁等级 99');
  cfg(); const { g, R } = posA(2, 2); const r = BF.attempt(g.S, mv([4, 5], [4, 1]));
  ok(r && r.extra.res === 'hit' && !fj(r).length && find(r.S, R.id).p.hp === 2, '开关全关：车打二级士，士不还手'); }

console.log('1. 士挨近战、活下来就还手（汉楚都一样）');
{ cfg(ON); const { g, R, A } = posA(2, 2); const r = BF.attempt(g.S, mv([4, 5], [4, 1])), f = fj(r);
  ok(r && r.extra.res === 'hit' && f.length === 1 && f[0].id === R.id && f[0].by === A.id && f[0].n === 1, '二级楚车打二级汉士：士剩 1 血，还手 1 点');
  ok(find(r.S, R.id).p.hp === 1 && at2(find(r.S, R.id)) === '4,5' && find(r.S, A.id).p.hp === 1, '车掉 1 血、弹回原位');
  ok(r.ev.map(e => e.e).join() === 'hit,fanji,repel', '事件顺序：打中 → 还手 → 弹回');
  const R2 = P('r', 'r', 2), A2 = P('b', 'a', 2);
  const r2 = BF.attempt(pos([[5, 0, KR()], [4, 4, R2], [3, 9, KB()], [4, 8, A2]], { turn: 'r' }).S, mv([4, 4], [4, 8]));
  ok(r2 && fj(r2).length === 1 && fj(r2)[0].by === A2.id && find(r2.S, R2.id).p.hp === 1, '反过来：汉车打二级楚士，楚士也还手'); }

console.log('2. 相 / 象挨远程（炮、霹雳、齐射）还手');
{ cfg(ON); const { g, Cn, E } = posB(2, 2); const r = BF.attempt(g.S, mv([4, 2], [4, 7]));
  ok(r && r.extra.res === 'hit' && fj(r).length === 1 && fj(r)[0].by === E.id && find(r.S, Cn.id).p.hp === 1, '二级汉炮隔着炮架打二级楚象（普通的炮打）：象还手，炮掉 1 血');
  const A1 = P('b', 'a', 2), A2 = P('b', 'a', 2);
  const b2 = posB(3, 2, {}, [[3, 7, A1], [5, 7, A2]]); const r2 = BF.attempt(b2.g.S, sk([4, 2], [4, 7]));
  ok(r2 && r2.extra.sk === 'pili' && fj(r2).length === 1 && fj(r2)[0].by === b2.E.id && find(r2.S, b2.Cn.id).p.hp === 2, '三级汉炮霹雳打二级楚象：象还手，炮 3 → 2 血');
  ok(find(r2.S, A1.id).p.hp === 1 && find(r2.S, A2.id).p.hp === 1 && r2.ev.some(e => e.e === 'splash'), '霹雳溅射打伤象左右的二级士，士不还手（溅射不触发）');
  // 齐射：相、象各自只站同一种颜色的格子，实战里齐射打不到象；这里把象直接摆在相的斜线上
  const X = P('r', 'e', 4), E3 = P('b', 'e', 2), A3 = P('b', 'a', 2);
  const g3 = pos([[5, 0, KR()], [4, 2, X], [3, 3, A3], [5, 3, E3], [0, 3, P('r', 'p')], [3, 9, KB()]], { turn: 'r' });
  const r3 = BF.attempt(g3.S, sk([4, 2], [5, 3]));
  ok(r3 && fj(r3).length === 1 && fj(r3)[0].by === E3.id && find(r3.S, X.id).p.hp === 2 && find(r3.S, E3.id).p.hp === 1, '四级汉相齐射二级楚象：象还手，相 3 → 2 血');
  const r4 = BF.attempt(g3.S, sk([4, 2], [3, 3]));
  ok(r4 && !fj(r4).length && find(r4.S, A3.id).p.hp === 1 && find(r4.S, X.id).p.hp === 3, '齐射二级楚士：远程，士不还手'); }

console.log('3. 象挨近战、士挨远程：不还手');
{ cfg(ON); const R = P('r', 'r'), E = P('b', 'e', 2);
  const r = BF.attempt(pos([[5, 0, KR()], [4, 3, R], [3, 9, KB()], [4, 7, E]], { turn: 'r' }).S, mv([4, 3], [4, 7]));
  ok(r && r.extra.res === 'hit' && !fj(r).length && find(r.S, R.id).p.hp === 1 && find(r.S, E.id).p.hp === 1, '汉车（近战）打二级楚象：象不还手');
  const Cn = P('r', 'c'), A = P('b', 'a', 2);
  const r2 = BF.attempt(pos([[5, 0, KR()], [4, 2, Cn], [4, 5, P('b', 'p')], [3, 9, KB()], [4, 8, A]], { turn: 'r' }).S, mv([4, 2], [4, 8]));
  ok(r2 && r2.extra.res === 'hit' && !fj(r2).length && find(r2.S, Cn.id).p.hp === 1 && find(r2.S, A.id).p.hp === 1, '汉炮（远程）打二级楚士：士不还手'); }

console.log('4. 被打死时还不还手（onDeath）');
{ const mk = rLv => { const R = P('r', 'r', rLv), A = P('b', 'a', 1); return { g: pos([[5, 0, KR()], [4, 2, R], [3, 9, KB()], [4, 8, A]], { turn: 'r' }), R, A }; };
  cfg(ON); let { g, R } = mk(1); let r = BF.attempt(g.S, mv([4, 2], [4, 8]));
  ok(r && r.extra.res === 'kill' && !fj(r).length && at2(find(r.S, R.id)) === '4,8', 'onDeath 关（活下来才还手）：一级车吃掉一级士，士不还手，车占位');
  cfg({ ...ON, onDeath: true }); ({ g, R } = mk(1)); r = BF.attempt(g.S, mv([4, 2], [4, 8]));
  ok(r && r.extra.res === 'died' && fj(r).length === 1 && !find(r.S, R.id) && !r.S.board[8][4], 'onDeath 开：士死前还手，把一级车也打死了（两边同归于尽，(4,8) 空着）');
  ok(r.ev.filter(e => e.e === 'kill').map(e => e.t + ':' + e.how).join() === 'a:capture,r:fanji', '两条击杀：士被车吃（capture），车被士还手打死（fanji）');
  ({ g, R } = mk(2)); r = BF.attempt(g.S, mv([4, 2], [4, 8]));
  ok(r && r.extra.res === 'kill' && fj(r).length === 1 && find(r.S, R.id).p.hp === 1 && at2(find(r.S, R.id)) === '4,8', 'onDeath 开：二级车吃掉士、挨 1 点，还剩 1 血占位'); }

console.log('5. 还手按攻击力（dmg = \'atk\'），跟着 CFG.attack 走');
{ cfg({ ...ON, dmg: 'atk' }); let { g, R } = posA(2, 2); let r = BF.attempt(g.S, mv([4, 5], [4, 1]));
  ok(r && r.extra.res === 'died' && fj(r)[0].n === 2 && !find(r.S, R.id), '二级士攻击 2：还手 2 点，把二级车打死');
  cfg({ ...ON, dmg: 1 }); ({ g, R } = posA(2, 2)); r = BF.attempt(g.S, mv([4, 5], [4, 1]));
  ok(r && fj(r)[0].n === 1 && find(r.S, R.id).p.hp === 1, '对照 dmg = 1：同一局面车剩 1 血');
  cfg({ ...ON, dmg: 'atk' }); ({ g, R } = posA(3, 3)); r = BF.attempt(g.S, mv([4, 5], [4, 1]));
  ok(r && fj(r)[0].n === 2 && find(r.S, R.id).p.hp === 1, '三级士（默认攻击 2）还手 2 点：三级车 3 → 1 血');
  cfg({ ...ON, dmg: 'atk' }, { atkA: [1, 2, 3, 3] }); ({ g, R } = posA(3, 3)); r = BF.attempt(g.S, mv([4, 5], [4, 1]));
  ok(r && r.extra.res === 'died' && fj(r)[0].n === 3 && !find(r.S, R.id), '--set attack.a=[1,2,3,3]：三级士还手 3 点，打死三级车');
  cfg({ ...ON, dmg: 'atk' }); const b = posB(2, 2); r = BF.attempt(b.g.S, mv([4, 2], [4, 7]));
  ok(r && fj(r)[0].n === 1 && find(r.S, b.Cn.id).p.hp === 1, '象的攻击力默认 1：还手 1 点'); }

console.log('6. 帅将出手不挨还手');
{ cfg({ ...ON, dmg: 'atk', onDeath: true }); const K = P('r', 'k'), A = P('b', 'a', 2);
  const g = pos([[4, 1, K], [4, 2, A], [0, 0, P('r', 'r')], [3, 9, KB()], [8, 9, P('b', 'r')]], { turn: 'r' });
  const r = BF.attempt(g.S, mv([4, 1], [4, 2]));
  ok(r && r.extra.res === 'hit' && !fj(r).length && find(r.S, K.id).p.hp === 1 && find(r.S, A.id).p.hp === 1, '汉帅打（摆进九宫的）二级楚士：士活下来，也不还手'); }

console.log('7. 溅射不触发：践踏');
{ cfg({ ...ON, onDeath: true }); const E = P('b', 'e', 4), X = P('r', 'e', 2), A = P('r', 'a', 2);
  const g = pos([[4, 0, KR()], [6, 4, X], [7, 4, A], [6, 5, P('r', 'p')], ...HAN4(), [3, 9, KB()], [4, 7, E]]);
  const r = BF.attempt(g.S, mv([4, 7], [6, 5]));
  ok(r && r.extra.res === 'kill' && r.ev.some(e => e.e === 'splash' && e.how === 'jianta') && find(r.S, X.id).p.hp === 1 && find(r.S, A.id).p.hp === 1, '四级楚象吃兵、践踏打伤旁边的二级相和（摆过去的）二级士');
  ok(!fj(r).length && find(r.S, E.id).p.hp === 3, '践踏打到的士、相都不还手'); }

console.log('8. 冲阵算近战：被当跳板的士也还手');
{ const mk = (rx, aLv) => { const R = P('b', 'r', 3, rx), A = P('r', 'a', aLv); return { g: pos([[4, 0, KR()], [3, 2, A], ...HAN4(), [5, 9, KB()], [3, 6, R]]), R, A }; };
  cfg(ON); let { g, R, A } = mk({}, 2); let r = BF.attempt(g.S, sk([3, 6], [3, 2]));
  ok(r && r.extra.res === 'move' && fj(r).length === 1 && fj(r)[0].by === A.id && find(r.S, A.id).p.hp === 1, '三级楚车冲阵，二级汉士当跳板挨 1 点、活下来还手');
  ok(find(r.S, R.id).p.hp === 2 && at2(find(r.S, R.id)) === '3,1', '车 3 → 2 血，照样落到跳板身后');
  ({ g, R, A } = mk({ hp: 1 }, 2)); r = BF.attempt(g.S, sk([3, 6], [3, 2]));
  ok(r && r.extra.res === 'died' && !find(r.S, R.id) && !r.S.board[1][3] && find(r.S, A.id).p.hp === 1, '只剩 1 血的车：被跳板士还手打死，不落地');
  ({ g, R } = mk({}, 1)); r = BF.attempt(g.S, sk([3, 6], [3, 2]));
  ok(r && !fj(r).length && r.extra.spring.killed && find(r.S, R.id).p.hp === 3, '跳板是一级士（被撞死）、onDeath 关：不还手');
  cfg({ ...ON, onDeath: true }); ({ g, R } = mk({}, 1)); r = BF.attempt(g.S, sk([3, 6], [3, 2]));
  ok(r && fj(r).length === 1 && r.extra.spring.killed && find(r.S, R.id).p.hp === 2 && at2(find(r.S, R.id)) === '3,1', 'onDeath 开：被撞死的跳板士也还手，车 3 → 2 血、落地'); }

console.log('9. 还手打死攻方：记作守方的击杀');
{ cfg(ON); const { g, R, A } = posA(1, 2); const r = BF.attempt(g.S, mv([4, 5], [4, 1]));
  const k = r && r.ev.find(e => e.e === 'kill');
  ok(r && r.extra.res === 'died' && !find(r.S, R.id) && !r.ev.some(e => e.e === 'repel'), '一级楚车打二级汉士：被还手打死，不弹回');
  ok(k && k.id === R.id && k.s === 'b' && k.how === 'fanji' && k.by === A.id && !k.friendly, '击杀事件：死的是楚车，how = fanji，by = 汉士');
  ok(find(r.S, A.id).p.xp === 1 && r.S.merit.r === 5 && r.S.merit.b === 1, '汉士攒一片甲，汉方拿击杀军功 5、楚方哀兵 1'); }

console.log('10. 还手算被动：四面楚歌期间楚方不还手；pfSeal（方案 A）破釜封锁期也封');
{ const mk = fx => { const R = P('r', 'r', 2), A = P('b', 'a', 2); return { g: pos([[5, 0, KR()], [4, 4, R], [3, 9, KB()], [4, 8, A], [0, 9, P('b', 'r')]], { turn: 'r', fx }) }; };
  cfg(ON); ok(fj(BF.attempt(mk({}).g.S, mv([4, 4], [4, 8]))).length === 1, '平时：汉车打二级楚士，楚士还手');
  ok(!fj(BF.attempt(mk({ sm: 12 }).g.S, mv([4, 4], [4, 8]))).length, '四面楚歌期间：楚士不还手');
  cfg({ ...ON, pfSeal: true }, { bs: { on: false } }); ok(!fj(BF.attempt(mk({ pf: 13 }).g.S, mv([4, 4], [4, 8]))).length, '破釜封锁期 + pfSeal：楚士不还手');
  cfg(ON, { bs: { on: false } }); ok(fj(BF.attempt(mk({ pf: 13 }).g.S, mv([4, 4], [4, 8]))).length === 1, '破釜封锁期、pfSeal 关：照常还手'); }

console.log('11. 霹雳：炮弹打中后炮被象还手打死，溅射照样落地');
{ cfg(ON); const A = P('b', 'a', 2); const b = posB(3, 2, { hp: 1 }, [[3, 7, A]]); const r = BF.attempt(b.g.S, sk([4, 2], [4, 7]));
  ok(r && r.extra.res === 'died' && !find(r.S, b.Cn.id) && find(r.S, b.E.id).p.hp === 1, '只剩 1 血的三级炮霹雳二级象：被象还手打死');
  ok(r.ev.some(e => e.e === 'splash') && find(r.S, A.id).p.hp === 1, '溅射照样打伤象旁边的二级士'); }

console.log('12. 被打死也还手 = 同一次交手：先扣攻方的血、再结算击杀（攻方被还手打死就拿不到甲片晋升回血）——走子、冲阵、齐射都一样');
{ cfg({ ...ON, onDeath: true });
  const mkR = (lv, x) => { const R = P('r', 'r', lv, x); return { g: pos([[5, 0, KR()], [4, 2, R], [3, 9, KB()], [4, 8, P('b', 'a', 1)]], { turn: 'r' }), R }; };
  let { g, R } = mkR(1, { xp: 5 }); let r = BF.attempt(g.S, mv([4, 2], [4, 8]));
  ok(r && r.extra.res === 'died' && !r.ev.some(e => e.e === 'autoup'), '走子：一级车（再攒 1 片甲就自动升二级）吃士，被还手打死，不会先升级回血');
  ({ g, R } = mkR(2, { xp: 7 })); r = BF.attempt(g.S, mv([4, 2], [4, 8]));
  ok(r && r.extra.res === 'kill' && r.ev.some(e => e.e === 'autoup') && find(r.S, R.id).p.lv === 3 && find(r.S, R.id).p.hp === 3, '走子：二级车先挨 1 点、再吃士攒够甲片升三级回满血');
  // 齐射：把解锁等级降到 3（三级相还能升级），相再攒 1 片甲就升四级
  cfg({ ...ON, onDeath: true }, { qishe: 3 });
  const mkX = hp => { const X = P('r', 'e', 3, { xp: 4, hp }), E = P('b', 'e', 1); return { g: pos([[5, 0, KR()], [4, 2, X], [5, 3, E], [0, 3, P('r', 'p')], [3, 9, KB()]], { turn: 'r' }), X, E }; };
  let m = mkX(1); r = BF.attempt(m.g.S, sk([4, 2], [5, 3]));
  ok(r && !find(r.S, m.X.id) && !find(r.S, m.E.id) && !r.ev.some(e => e.e === 'autoup'), '齐射：只剩 1 血的三级相射死一级象，被还手打死，不会先升级回血');
  m = mkX(3); r = BF.attempt(m.g.S, sk([4, 2], [5, 3]));
  ok(r && find(r.S, m.X.id).p.lv === 4 && find(r.S, m.X.id).p.hp === 3, '齐射：满血三级相先挨 1 点、再射死象升四级回满血');
  cfg({ ...ON, onDeath: true });
  const R3 = P('b', 'r', 3, { hp: 1, xp: 19 }), g3 = pos([[4, 0, KR()], [3, 2, P('r', 'a', 1)], ...HAN4(), [5, 9, KB()], [3, 6, R3]]);
  r = BF.attempt(g3.S, sk([3, 6], [3, 2]));
  ok(r && r.extra.res === 'died' && !find(r.S, R3.id) && !r.ev.some(e => e.e === 'autoup') && !r.S.board[2][3], '冲阵：1 血的三级车撞死一级跳板士（再攒 1 片甲就升四级），被还手打死，不会先升级回血'); }

console.log('13. 背水一战两步里的还手：照样结算；还手打死的是背水一方自己的子（对方的击杀），不算进“最多吃一个子”');
{ cfg(ON);
  // 汉帅 (4,0)、二级汉士 (4,1)、汉兵 (0,4)，楚车 (4,5)、楚马 (2,5)：楚方车马 2 枚 < 汉方 4 枚，背水能用
  const mk = (rLv = 1, more = []) => { const R = P('b', 'r', rLv), N = P('b', 'n'), A = P('r', 'a', 2), Pw = P('r', 'p'); return { g: pos([[4, 0, KR()], [4, 1, A], ...HAN4(), [0, 4, Pw], [3, 9, KB()], [4, 5, R], [2, 5, N], ...more]), R, N, A, Pw }; };
  const same = (S, a, r) => { const k = BF.ai.pofuPairs(S).find(x => JSON.stringify(x.a) === JSON.stringify(a)); return !!k && JSON.stringify(k.S) === JSON.stringify(r.S) && JSON.stringify(k.ev) === JSON.stringify(r.ev); };
  let { g, R, N, A } = mk(); const a1 = art([[4, 5], [4, 1]], [[2, 5], [0, 4]]); let r = BF.attempt(g.S, a1);
  const kills = r ? r.ev.filter(e => e.e === 'kill') : [];
  ok(r && kills.length === 2 && kills.filter(e => e.s === 'r').length === 1 && kills.some(e => e.s === 'b' && e.how === 'fanji'), '第一步一级车打二级士被还手打死、第二步马吃兵：死了两个子，可汉方只死一个 → 合法');
  ok(!find(r.S, R.id) && find(r.S, N.id).p.bz === 12 && find(r.S, A.id).p.hp === 1 && r.S.used.art.b === 1, '车死了；马冻结；汉士剩 1 血；背水用掉');
  ok(same(g.S, a1, r), '电脑用的 pofuPairs 里有这一手，结算后的局面、事件和 attempt 逐项相同');
  const a2 = art([[2, 5], [0, 4]], [[4, 5], [4, 1]]); r = BF.attempt(g.S, a2);
  ok(r && fj(r).length === 1 && same(g.S, a2, r), '反过来（先吃兵、再打士被还手打死）：也合法，pofuPairs 里结算相同');
  ok(!BF.attempt(g.S, art([[4, 5], [4, 1]], [[4, 5], [4, 4]])), '被还手打死的车不能再走第二步');
  ({ g, R } = mk(2)); const a3 = art([[4, 5], [4, 1]], [[4, 5], [5, 5]]); r = BF.attempt(g.S, a3);
  ok(r && fj(r).length === 1 && find(r.S, R.id).p.hp === 1 && at2(find(r.S, R.id)) === '5,5' && find(r.S, R.id).p.bz === 12 && same(g.S, a3, r), '同一枚二级车走两步：打士挨还手（剩 1 血）弹回，再挪开；冻结；和 pofuPairs 相同');
  ({ g } = mk(1, [[6, 5, P('r', 'p')]]));
  ok(!BF.attempt(g.S, art([[4, 5], [6, 5]], [[2, 5], [0, 4]])) && !!BF.attempt(g.S, art([[4, 5], [6, 5]], [[2, 5], [1, 7]])), '对照：车吃兵 + 马吃兵（汉方死两个）不合法；车吃兵 + 马走空格合法'); }

console.log('14. 回春（满级相 / 象，默认关）');
{ cfg(ON, { huichun: 4 });
  const X = P('r', 'e', 4), A = P('r', 'a', 2, { hp: 1 }), R = P('r', 'r');
  const g = pos([[4, 0, KR()], [4, 2, X], [4, 1, A], [3, 2, R], [3, 9, KB()], [8, 9, P('b', 'r')]], { turn: 'r' });
  const r = BF.attempt(g.S, sk([4, 2], null, 'huichun'));
  ok(r && r.extra.healed === 1 && find(r.S, A.id).p.hp === 2 && r.ev.filter(e => e.e === 'heal').length === 1, '四级汉相回春：旁边掉了血的士回 1 血（满血的车不算）');
  ok(!BF.ai.gen(g.S, true).some(it => it.sk === 'huichun') && BF.ai.gen(g.S, false).some(it => it.sk === 'huichun'), '回春不进“只要打到敌子”的静态搜索，普通候选里有');
  const S2 = { ...BF.cloneState(r.S), turn: 'r' }; S2.board[1][4].hp = 1;   // 再轮到汉方、士又掉了血
  ok(!BF.attempt(S2, sk([4, 2], null, 'huichun')) && S2.board[2][4].c_huichun > 900, '每局一次（冷却 999）：士又掉了血也不能再用');
  const g2 = pos([[4, 0, KR()], [4, 2, P('r', 'e', 4)], [4, 1, P('r', 'a', 2)], [3, 9, KB()], [8, 9, P('b', 'r')]], { turn: 'r' });
  ok(!BF.attempt(g2.S, sk([4, 2], null, 'huichun')), '周围没人掉血：不能用');
  const E = P('b', 'e', 4, { bz: 12 }), A2 = P('b', 'a', 2, { hp: 1 });
  const g3 = pos([[4, 0, KR()], [0, 0, P('r', 'r')], [3, 9, KB()], [4, 7, E], [4, 8, A2], [8, 9, P('b', 'r')]]);
  ok(g3.frozen(E) && !!BF.attempt(g3.S, sk([4, 7], null, 'huichun')) && !BF.attempt(g3.S, sk([4, 7], [2, 5], 'feiyue')), '背水冻结的楚象：回春（原地）能用，飞越（要挪位置）不能用');
  cfg(ON); ok(!BF.ai.expand(g.S).some(k => k.a.sk === 'huichun') && !BF.attempt(g.S, sk([4, 2], null, 'huichun')), '默认等级 99：没有回春'); }

// ---------- 两段大的：随机局面 ----------
// 注意：下面两种局面里都没有四级楚象（践踏）。底版 98dd206 的 pofuPairsRef（还有界面的 pofuSecond）列第二步时，第一步只走了 strike、没算践踏：
//   践踏踩死挡路的子之后、从那一格穿过去的第二步它列不出来（attempt 判合法、pofuPairs 也有）。这是底版引擎的事，和反击无关，别把它当成反击的错
const mkRnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const lvUp = (p, lv) => { p.lv = lv; p.hp = BF.hpOf(p.t, lv); };
// (一) 从开局随机走（偏向打子）：楚方先拿掉两车一马（剩一马两炮，3 枚 < 汉 6 枚，背水一开始就能用）；
//      双方士象一开局就是二 / 三级（挨一下还活着才会还手），楚方的子四成升到二级（挨了还手不一定死）。每到楚方、背水能用时交给 visit
function selfPlay(E, seed, games, plies, visit) {
  const rnd = mkRnd(seed);
  for (let gi = 0; gi < games; gi++) {
    const g = new E.Game();
    g.setup(S => {
      const n = { r: 2, n: 1 };
      for (const row of S.board) for (let f = 0; f < 9; f++) {
        const q = row[f]; if (!q) continue;
        if (q.s === 'b' && n[q.t]) { n[q.t]--; row[f] = null; continue; }
        if (q.t === 'a' || q.t === 'e') lvUp(q, 2 + Math.floor(rnd() * 2));
        else if (q.s === 'b' && q.t !== 'k' && rnd() < 0.4) lvUp(q, 2);
      }
      S.merit.r = S.merit.b = 10;
    });
    for (let ply = 0; ply < plies && !g.result; ply++) {
      if (g.S.turn === 'b' && E.ai.artReady(g.S)) visit(E.cloneState(g.S));
      const kids = E.ai.expand(g.S).filter(k => k.a.k === 'mv' || k.a.k === 'sk');
      if (!kids.length) break;
      const caps = kids.filter(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit'));
      const pick = caps.length && rnd() < 0.5 ? caps[Math.floor(rnd() * caps.length)] : kids[Math.floor(rnd() * kids.length)];
      if (!g.apply(pick.a)) break;
    }
  }
}
// (二) 随机摆的残局（专门让楚方的子扑到汉方九宫跟前）：汉帅、两士、两相在原位（一到三级，有的掉了血），汉方四枚车马炮在后面；
//      楚将在九宫，三枚车马炮（一、二级）、三个卒散在汉方半场附近。汉方被将着、背水用不了的不要
const HAN_A = [[3, 0], [5, 0], [4, 1], [3, 2], [5, 2]], HAN_E = [[2, 0], [6, 0], [4, 2], [0, 2], [8, 2], [2, 4], [6, 4]];
function randomEnding(E, rnd) {
  const pick = a => a[Math.floor(rnd() * a.length)], used = new Set(), put = [];
  const place = (sq, p) => { if (used.has(sq + '')) return false; used.add(sq + ''); put.push([sq[0], sq[1], p]); return true; };
  const piece = (s, t, lo, hi) => { const p = P(s, t, lo + Math.floor(rnd() * (hi - lo + 1))); if (p.hp > 1 && rnd() < 0.25) p.hp--; return p; };
  const scatter = (s, t, lo, hi, r0, r1) => { for (;;) { const sq = [Math.floor(rnd() * 9), r0 + Math.floor(rnd() * (r1 - r0 + 1))]; if (place(sq, piece(s, t, lo, hi))) return; } };
  place(pick([[3, 0], [4, 0], [5, 0]]), KR());
  for (let i = 0; i < 2; i++) for (;;) if (place(pick(HAN_A), piece('r', 'a', 1, 3))) break;
  for (let i = 0; i < 2; i++) for (;;) if (place(pick(HAN_E), piece('r', 'e', 1, 3))) break;
  for (let i = 0; i < 4; i++) scatter('r', pick(['r', 'n', 'c']), 1, 2, 0, 3);
  place(pick([[3, 9], [4, 9], [5, 9], [4, 8]]), KB());
  for (let i = 0; i < 3; i++) scatter('b', pick(['r', 'n', 'c']), 1, 2, 1, 6);
  for (let i = 0; i < 3; i++) scatter('b', 'p', 1, 2, 2, 5);
  const g = new E.Game();
  g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of put) T.board[r][f] = p; T.turn = 'b'; T.cnt = { r: 10, b: 10 }; T.merit = { r: 10, b: 10 }; });
  const S = g.S;
  return !S.final && !E.ai.inCheck(S, 'r') && E.ai.artReady(S) ? E.cloneState(S) : null;
}
function positions(E, seed, nEnd, games, plies) {
  const out = [], rnd = mkRnd(seed);
  for (let tries = 0; out.filter(x => x.k === 'end').length < nEnd && tries < nEnd * 20; tries++) { const S = randomEnding(E, rnd); if (S) out.push({ k: 'end', S }); }
  selfPlay(E, seed + 1, games, plies, S => out.push({ k: 'play', S }));
  return out;
}

console.log('15. 背水两步里的还手：pofuPairs（电脑用的快写法）和 pofuPairsRef（逐个 attempt）逐项相同（反击开着）');
const fjOf = k => k.ev.some(e => e.e === 'fanji');
for (const [name, c, x] of [['还手 1 点、活下来才还手', { ...ON, dmg: 1 }, {}], ['按攻击力还手、士攻击 1/2/3/3', { ...ON, dmg: 'atk' }, { atkA: [1, 2, 3, 3] }],
  ['还手 1 点、被打死也还手', { ...ON, dmg: 1, onDeath: true }, {}], ['还手 1 点、背水必须两枚子', { ...ON, dmg: 1 }, { bs: { twoPieces: true } }]]) {
  cfg(c, x);
  const t0 = Date.now(), ps = positions(BF, 777, 150, 6, 50), rnd = mkRnd(99);
  let n = 0, pairs = 0, withFj = 0, fjKill = 0, saved = 0, onlyN = 0;
  const same = (A, R, what) => {
    const key = k => JSON.stringify(k.a), mR = new Map(R.map(k => [key(k), k]));
    assert.ok(A.length === R.length, `${name}：${what}背水组合个数不同 ${A.length} 对 ${R.length}`);
    for (const k of A) { const o = mR.get(key(k)); assert.ok(o && JSON.stringify(o.S) === JSON.stringify(k.S) && JSON.stringify(o.ev) === JSON.stringify(k.ev), `${name}：${what}背水组合结算不同 ${key(k)}`); }
  };
  for (const { S } of ps) {
    const A = BF.ai.pofuPairs(S); same(A, BF.ai.pofuPairsRef(S), '');
    for (const k of A) {
      const kl = k.ev.filter(e => e.e === 'kill' && !e.friendly);
      assert.ok(kl.filter(e => e.s === 'r').length <= 1, '背水组合吃了不止一个汉方子');
      if (fjOf(k)) withFj++;
      if (kl.some(e => e.how === 'fanji')) { fjKill++; if (kl.length > 1) saved++; }
    }
    // 电脑还会只要“有一步是某枚子走的”组合（only，先升级再背水时用）：也核对
    const ids = S.board.flat().filter(p => p && p.s === 'b').map(p => p.id), only = ids[Math.floor(rnd() * ids.length)];
    const Ao = BF.ai.pofuPairs(S, only); same(Ao, BF.ai.pofuPairsRef(S, only), 'only：'); onlyN += Ao.length;
    if (A.length) { n++; pairs += A.length; }
  }
  ok(n >= 150 && withFj >= 500 && fjKill >= 100 && saved >= 10, `${name}：${n} 个局面、${pairs} 个组合（另 only ${onlyN} 个）逐项相同；其中挨还手的 ${withFj} 个、攻方被还手打死的 ${fjKill} 个（死的子不止一个、可汉方最多死一个而合法的 ${saved} 个）（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
}

console.log('16. 开关全关：和底版引擎（' + REV + '）逐项相同（同一批局面的 expand、gen、pofuPairs、evaluate）');
{ cfg(); Object.assign(BASE.CFG.beishui, NEW_RULES);
  const t0 = Date.now(), ps = positions(BASE, 4242, 150, 6, 50);
  let n = 0, kids = 0, pairs = 0, live = 0;
  for (const { S } of ps) {
    const eB = BASE.ai.expand(S), eV = BF.ai.expand(S);
    assert.ok(JSON.stringify(eB) === JSON.stringify(eV), 'expand 不同');
    assert.ok(JSON.stringify(BASE.ai.gen(S, false)) === JSON.stringify(BF.ai.gen(S, false)) && JSON.stringify(BASE.ai.gen(S, true)) === JSON.stringify(BF.ai.gen(S, true)), 'gen 不同');
    assert.ok(JSON.stringify(BASE.evaluate(S)) === JSON.stringify(BF.evaluate(S)), 'evaluate 不同');
    const pB = BASE.ai.pofuPairs(S), pV = BF.ai.pofuPairs(S);
    assert.ok(JSON.stringify(pB) === JSON.stringify(pV), 'pofuPairs 不同');
    n++; kids += eV.length; pairs += pV.length;
    cfg(ON); live += BF.ai.expand(S).filter(fjOf).length + BF.ai.pofuPairs(S).filter(fjOf).length; cfg();   // 同一个局面打开反击：有多少会挨还手（证明这批局面碰得到反击）
  }
  ok(n >= 150 && live >= 100, `${n} 个局面、${kids} 个普通行动、${pairs} 个背水组合逐项相同（同一批局面打开反击，有 ${live} 个行动 / 组合会挨还手）（${((Date.now() - t0) / 1000).toFixed(1)}s）`); }

console.log('17. counter 配置写错就报错（原来攻方的血会变成 NaN、开关会悄悄打开）：每局开始（new Game）查，用到还手伤害时再查');
{ const parse = raw => { try { return JSON.parse(raw); } catch (e) { return raw; } };   // 和 bfsim 的 --set 一样：不是合法 JSON 就原样当字符串（ci_sim 的请求按空格切参数、不认引号）
  const why = f => { try { f(); } catch (e) { return e.message; } return ''; };
  const bad = (c, k) => { cfg(c); return why(() => new BF.Game()).includes('counter.' + k); };
  for (const [raw, hp] of [['1', 2], ['atk', 1], ['"atk"', 1]]) {
    cfg({ ...ON, dmg: parse(raw) }); const { g, R } = posA(3, 3); const r = BF.attempt(g.S, mv([4, 5], [4, 1]));
    ok(r && fj(r).length === 1 && find(r.S, R.id).p.hp === hp, `--set counter.dmg=${raw} 能用：三级士还手，三级车剩 ${hp} 血`);
  }
  const dmgBad = ["'atk'", 'ATK', '"1"', '1.5', '-1', 'null'];
  ok(dmgBad.every(raw => bad({ ...ON, dmg: parse(raw) }, 'dmg')) && bad({ dmg: 'ATK' }, 'dmg'), `--set counter.dmg=${dmgBad.join(' / ')}：new Game 就报错（反击关着也报错）`);
  ok(bad({ ...ON, onDeath: parse("'false'") }, 'onDeath') && bad({ ...ON, a: parse('"true"') }, 'a') && bad({ ...ON, e: 1 }, 'e') && bad({ ...ON, pfSeal: parse('False') }, 'pfSeal'),
    "开关只认 true / false：--set counter.onDeath='false'（非空字符串算“真”）、a=\"true\"、e=1、pfSeal=False 都在 new Game 就报错");
  cfg(ON); const { g } = posA(3, 3); C.dmg = "'atk'";   // 局开始以后才改坏：绕过 new Game 那一查
  ok(why(() => BF.attempt(g.S, mv([4, 5], [4, 1]))).includes('counter.dmg') && why(() => BF.ai.expand(g.S)).includes('counter.dmg'), '开局以后才把 counter.dmg 改坏：用到还手伤害时报错（attempt、电脑的 expand 都一样），不会算出 NaN');
  cfg(); }

// ---------- bfsim 真下棋 ----------
function bfsim(env, args) {
  const json = path.join(os.tmpdir(), `ctrtest_${process.pid}_${Date.now()}.json`);
  const r = spawnSync(process.execPath, [path.join(SRC, 'tools', 'bfsim.js'), ...args, '--quiet', '--json', json], { cwd: SRC, env: { ...process.env, ...env }, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(json)) throw new Error('bfsim 失败：' + r.stdout + r.stderr);
  const o = JSON.parse(fs.readFileSync(json, 'utf8')); fs.unlinkSync(json);
  return o;
}
const JOBS = String(process.env.CTR_JOBS || 2), RULES = ['--set', 'beishui.on=true', '--set', 'beishui.twoPieces=false'];
if (process.env.CTR_FAST) console.log('18～20. 跳过（CTR_FAST）');
else {
  console.log('18. 开关全关：bfsim 6 局和底版逐局相同（--nodes mid=20000，新规则，电脑 git:' + REV + '）');
  { const args = ['--games', '6', '--seed', '1000', '--nodes', 'mid=20000', '--ai', 'git:' + REV, '--jobs', JOBS, ...RULES], t0 = Date.now();
    const base = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_at.js', ENGINE_REV: REV }, args), vari = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_counter.js', ENGINE_REV: REV }, args);
    const sig = r => JSON.stringify([r.winner, r.reason, r.rounds, r.plies, r.act, r.kills, r.up]);
    const mV = new Map(vari.results.map(r => [r.seed, r]));
    ok(base.results.length === 6 && vari.results.length === 6 && !base.errors.length && !vari.errors.length, '两边各下完 6 局、没有出错');
    ok(base.results.every(r => mV.has(r.seed) && sig(mV.get(r.seed)) === sig(r)), `逐局相同（种子 1000～1005：${base.results.map(r => (r.winner || '-') + r.rounds).join(' ')}）（${((Date.now() - t0) / 1000).toFixed(0)}s）`); }
  console.log('19. 要跑的两种配置都能下完（各 2 局；第二种同时加 --set attack.a=[1,2,3,3]）');
  for (const [name, sets] of [['还手 1 点、活下来才还手', ['counter.dmg=1']], ['按攻击力还手 + 士攻击 1/2/3/3', ['counter.dmg="atk"', 'attack.a=[1,2,3,3]']]]) {
    const args = ['--games', '2', '--seed', '2000', '--nodes', 'mid=20000', '--ai', 'git:' + REV, '--jobs', JOBS, ...RULES, '--set', 'counter.a=true', '--set', 'counter.e=true', '--set', 'counter.onDeath=false', ...sets.flatMap(s => ['--set', s])];
    const t0 = Date.now(), o = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_counter.js', ENGINE_REV: REV }, args);
    const fjN = o.results.reduce((t, r) => t + ((r.jumaCounter.r.fanji || 0) + (r.jumaCounter.b.fanji || 0)), 0);
    ok(o.results.length === 2 && !o.errors.length && o.results.every(r => r.reason), `${name}：2 局下完、没有出错（${o.results.map(r => (r.winner || '-') + ':' + r.reason).join(' ')}；还手 ${fjN} 次）（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
  }
  console.log('20. 配置写错时 bfsim 每局一开始就报错、一局也不算（不会悄悄下完；ci_sim 的请求里写成 counter.dmg=\'atk\' 就是这样）');
  { const args = ['--games', '2', '--seed', '2000', '--nodes', 'mid=20000', '--ai', 'git:' + REV, '--jobs', JOBS, ...RULES, '--set', 'counter.a=true', '--set', 'counter.e=true', '--set', "counter.dmg='atk'"];
    const o = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_counter.js', ENGINE_REV: REV }, args);
    ok(!o.results.length && o.errors.length === 2 && o.errors.every(e => e.error.includes('counter.dmg')), `--set counter.dmg='atk'：0 局下完、2 局报错（${o.errors.length ? o.errors[0].error.split('\n')[0] : ''}）`); }
}
cfg();
console.log('通过', pass, '项');
