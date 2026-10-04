// Plan C 变体引擎（engine_planc.js，底版 git 98dd206 = 背水一战正式版）自测：相 / 象变强
//   用法（在 source/ 下）：node tools/variants/test_planc.js
//   环境变量：ENGINE_REV = 底版（默认 98dd206，和 engine_planc.js 一样）；PLANC_FAST=1 跳过最后用 bfsim 真下棋的两段；PLANC_JOBS = bfsim 并行数（默认 2）
//   逐条核对规则之外，还有几段大一点的：
//     · 齐射：随机摆子，三种方向下结算（resolve）、界面（skillTargets）、电脑（expand / gen / gen 只要打到的）列出的目标都和照规则写的模型一样；
//     · 背水两步里的践踏：电脑的快写法 BF.ai.pofuPairs 和逐个 attempt 的 BF.ai.pofuPairsRef 在一批随机局面上逐项相同（onMove 开着，冷却 0 / 2）；
//     · 开关全关时和底版引擎逐项相同（同一批局面的 expand / gen / evaluate / pofuPairs / 界面的背水候选）；
//     · 开关全关时 bfsim 6 局和底版逐局相同；全部开关 + 数值组合各下 2 局不出错。
'use strict';
const assert = require('assert'), path = require('path'), os = require('os'), fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');
const SRC = path.join(__dirname, '..', '..');   // source/
const REV = process.env.ENGINE_REV || '98dd206';
global.XQ = require(path.join(SRC, 'src', 'rules.js'));
const BF = require(require('./engine_planc.js').enginePath());
// 底版引擎（对照用）：同一个提交的 src/bingfa.js 原样
const baseFile = path.join(os.tmpdir(), `bingfa_pcbase_${REV.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
fs.writeFileSync(baseFile, execFileSync('git', ['show', REV + ':source/src/bingfa.js'], { cwd: SRC, encoding: 'utf8' }));
process.on('exit', () => { try { fs.unlinkSync(baseFile); } catch (e) { } });   // 中途出错退出也删掉（变体引擎的临时文件由 engine_planc.js 自己删）
const BASE = require(baseFile);
global.BF = BF;

let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
let pid = 600; const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const pos = (pieces, o = {}) => { const g = new BF.Game(); g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of pieces) T.board[r][f] = p; T.turn = o.turn || 'b'; T.merit = { r: 0, b: 0, ...(o.merit || {}) }; T.used = { art: { r: 0, b: 0, ...(o.art || {}) }, ult: { r: 0, b: 0 } }; T.cnt = { r: 10, b: 10 }; }); return g; };
const KG = (s, f, r) => [f, r, P(s, 'k')];
// 配置：每段测试前把两份引擎的配置都拨回各自的默认值（Plan C 开关全关），再按 { 'skills.qishe.dirs': 'ortho', … } 改（和 bfsim 的 --set 一样的写法）
const C = BF.CFG, C0 = JSON.parse(JSON.stringify(BF.CFG)), CB0 = JSON.parse(JSON.stringify(BASE.CFG));
const setPath = (o, k, v) => { const ks = k.split('.'); for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) throw new Error('配置里没有 ' + k); o = o[ks[i]]; } o[ks[ks.length - 1]] = v; };
const reset = (X, X0) => { for (const k of Object.keys(X0)) X[k] = JSON.parse(JSON.stringify(X0[k])); };
const cfg = (sets = {}) => { reset(C, C0); reset(BASE.CFG, CB0); for (const [k, v] of Object.entries(sets)) { setPath(C, k, v); if (!/^skills\.(qishe\.dirs|jianta\.(onMove|moveCooldown))$/.test(k)) setPath(BASE.CFG, k, v); } };
const L3 = { 'skills.qishe.level': 3, 'skills.jianta.level': 3 };   // 要跑的两组都把齐射、践踏提到三级解锁
const NEW = { 'beishui.on': true, 'beishui.twoPieces': false };    // 现在的规则：背水一战开着，两步可以是同一枚子
const ON = { 'skills.qishe.dirs': 'ortho', 'skills.jianta.onMove': true };
// 用户定的数值组合（和 Plan C 一起跑的 --set）
const COMBO = { 'attack.r': [1, 1, 2, 2], 'attack.p': [1, 1, 2, 2], 'attack.n': [1, 1, 2], 'attack.c': [1, 1, 2], 'attack.e': [1, 1, 2, 2], 'attack.a': [1, 2, 3, 3],
  'upgrade.cost.p': [3, 3, 8], 'upgrade.cost.a': [2, 2, 4], 'upgrade.cost.e': [2, 2, 5], 'upgrade.cost.n': [5, 5], 'upgrade.cost.c': [5, 5], 'upgrade.cost.r': [15, 15, 20] };
const sq = (f, r) => f + ',' + r, setOf = list => new Set(list.map(a => sq(a[0], a[1]))), same = (a, b) => a.size === b.size && [...a].every(x => b.has(x)), show = s => '{' + [...s].sort().join(' ') + '}';
const J = x => JSON.stringify(x);
const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hpOfId = (g, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const q = g.at(f, r); if (q && q.id === id) return q.hp; } return 0; };   // 0 = 死了
const hpIn = (S, id) => { for (const row of S.board) for (const q of row) if (q && q.id === id) return q.hp; return 0; };
const stomps = ev => ev.filter(e => e.e === 'splash' && e.how === 'jianta' && e.mv === 1).length;   // 踩空格（splash 事件标着 mv）
const art = (s1, s2) => ({ k: 'art', steps: [{ from: s1[0], to: s1[1] }, { from: s2[0], to: s2[1] }] });
const hasA = (list, a) => list.some(k => J(k.a) === J(a));
// 快慢两种写法逐项相同：个数一样，每个组合结算出的局面、事件都一样
const samePairs = (A, R) => { if (A.length !== R.length) return false; const m = new Map(R.map(k => [J(k.a), k])); return A.every(k => { const o = m.get(J(k.a)); return o && J(o.S) === J(k.S) && J(o.ev) === J(k.ev); }); };

console.log('0. 默认值：新开关全关');
{ cfg(); ok(C.skills.qishe.dirs === 'diag' && C.skills.jianta.onMove === false && C.skills.jianta.moveCooldown === 0, 'qishe.dirs = diag、jianta.onMove = false、jianta.moveCooldown = 0');
  ok(BF.SKILL_DESC.qishe === BASE.SKILL_DESC.qishe && BF.SKILL_DESC.jianta === BASE.SKILL_DESC.jianta, '技能说明和底版一字不差');
  cfg({ ...ON, 'skills.jianta.moveCooldown': 2 }); ok(/横竖/.test(BF.SKILL_DESC.qishe) && /空格/.test(BF.SKILL_DESC.jianta) && /每 2 回合/.test(BF.SKILL_DESC.jianta), '开了之后技能说明跟着改：' + BF.SKILL_DESC.qishe + ' / ' + BF.SKILL_DESC.jianta);
  cfg({ 'skills.qishe.dirs': 'orth', ...L3 }); let err = '';
  try { BF.ai.gen(pos([KG('r', 3, 0), KG('b', 5, 9), [4, 2, P('r', 'e', 3)], [0, 3, P('r', 'p')]], { turn: 'r' }).S, false); } catch (e) { err = e.message; }
  ok(/dirs/.test(err), 'dirs 写错（orth）直接报错，不会悄悄按斜线跑：' + err); }

// ---------- 1. 齐射 ----------
const DIRS = { diag: [[1, 1], [1, -1], [-1, 1], [-1, -1]], ortho: [[1, 0], [-1, 0], [0, 1], [0, -1]] }; DIRS.both = DIRS.diag.concat(DIRS.ortho);
// 照规则自己算一遍（不用引擎）：每个方向 1～2 格，碰到的第一枚子是敌方非帅将就能射，碰到子（哪方都算）就挡住后面
function model(S, f, r, dirs) {
  const me = S.board[r][f].s, out = new Set();
  for (const [df, dr] of DIRS[dirs]) for (let k = 1; k <= 2; k++) {
    const tf = f + df * k, tr = r + dr * k; if (tf < 0 || tf > 8 || tr < 0 || tr > 9) break;
    const q = S.board[tr][tf]; if (q) { if (q.s !== me && q.t !== 'k') out.add(sq(tf, tr)); break; }
  }
  return out;
}
// 齐射目标的五种列法：结算（每一格都拿 attempt 试）、界面（skillTargets）、电脑（expand、gen、gen 只要打到的）
function views(g, at_) {
  const S = g.S, isQ = a => a.k === 'sk' && a.at[0] === at_[0] && a.at[1] === at_[1] && (a.sk || 'qishe') === 'qishe';
  const rs = new Set(); for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { if (BF.attempt(S, { k: 'sk', at: at_, to: [f, r] })) rs.add(sq(f, r)); assert.ok(!!BF.attempt(S, { k: 'sk', at: at_, to: [f, r], sk: 'qishe' }) === rs.has(sq(f, r)), '写不写 sk 结果不同'); }
  return { rs, ui: setOf(g.skillTargets(at_[0], at_[1], 'qishe').map(a => a.to)), ex: setOf(BF.ai.expand(S).filter(k => isQ(k.a)).map(k => k.a.to)),
    gn: setOf(BF.ai.gen(S, false).filter(it => isQ(it.a)).map(it => it.a.to)), gc: setOf(BF.ai.gen(S, true).filter(it => isQ(it.a)).map(it => it.a.to)) };
}
const agree = v => same(v.rs, v.ui) && same(v.rs, v.ex) && same(v.rs, v.gn) && same(v.rs, v.gc);
const QB = () => [KG('r', 3, 0), KG('b', 5, 9), [0, 3, P('r', 'p')]];   // 帅、将都不在相 (4,2) 的线上；留一个兵，免得成了决战
console.log('1. 齐射：横竖（ortho）、斜线（diag，默认）、都行（both）');
{ cfg({ ...L3, 'skills.qishe.dirs': 'ortho' });
  const g1 = pos([...QB(), [4, 2, P('r', 'e', 3)], [4, 3, P('b', 'a')], [4, 1, P('b', 'a')], [3, 2, P('b', 'a')], [5, 2, P('b', 'a')]], { turn: 'r' });
  const v1 = views(g1, [4, 2]); ok(same(v1.rs, setOf([[4, 3], [4, 1], [3, 2], [5, 2]])) && agree(v1), 'ortho：上、下、左、右贴身（1 格）的敌子都能射 ' + show(v1.rs));
  const g2 = pos([...QB(), [4, 2, P('r', 'e', 3)], [4, 4, P('b', 'a')], [4, 0, P('b', 'a')], [2, 2, P('b', 'a')], [6, 2, P('b', 'a')]], { turn: 'r' });
  const v2 = views(g2, [4, 2]); ok(same(v2.rs, setOf([[4, 4], [4, 0], [2, 2], [6, 2]])) && agree(v2), 'ortho：上、下、左、右隔一格（2 格）的敌子都能射 ' + show(v2.rs));
  const g3 = pos([...QB(), [4, 2, P('r', 'e', 3)], [4, 5, P('b', 'a')], [1, 2, P('b', 'a')], [7, 2, P('b', 'a')], [5, 3, P('b', 'a')], [6, 4, P('b', 'a')], [3, 1, P('b', 'a')]], { turn: 'r' });
  const v3 = views(g3, [4, 2]); ok(v3.rs.size === 0 && agree(v3), 'ortho：横竖 3 格远的、斜线上的（1 格、2 格）都不射');
  C.skills.qishe.dirs = 'diag'; const v3d = views(g3, [4, 2]); ok(same(v3d.rs, setOf([[5, 3], [3, 1]])) && agree(v3d), 'diag（底版）：同一局面只射斜线 ' + show(v3d.rs));
  C.skills.qishe.dirs = 'both'; const v3b = views(g3, [4, 2]); ok(same(v3b.rs, setOf([[5, 3], [3, 1]])) && agree(v3b), 'both：横竖 3 格远的照样射不到 ' + show(v3b.rs)); }
{ // 挡子：同一套摆法分别摆在斜线上和横竖线上——第 0 路己方兵挡着敌子、第 1 路己方帅（或士）挡着、第 2 路两个敌子（射近的）、第 3 路空一格再敌子（射得到）
  const lay = (V, king) => { const at = (i, k) => [4 + V[i][0] * k, 2 + V[i][1] * k];
    return { pcs: [[...at(0, 1), P('r', 'p')], [...at(0, 2), P('b', 'a')], [...at(1, 1), king ? P('r', 'k') : P('r', 'a')], [...at(1, 2), P('b', 'a')], [...at(2, 1), P('b', 'a')], [...at(2, 2), P('b', 'a')], [...at(3, 2), P('b', 'a')]], want: setOf([at(2, 1), at(3, 2)]) }; };
  for (const d of ['diag', 'ortho']) {
    cfg({ ...L3, 'skills.qishe.dirs': d });
    const L = lay(DIRS[d], true), g = pos([[4, 2, P('r', 'e', 3)], KG('b', 4, 9), ...L.pcs], { turn: 'r' }), v = views(g, [4, 2]);
    ok(same(v.rs, L.want) && same(v.rs, model(g.S, 4, 2, d)) && agree(v), `${d}：己方兵、己方帅、近处的敌子都挡住后面，空一格照样射到 2 格远 ${show(v.rs)}`);
    C.skills.qishe.dirs = d === 'diag' ? 'ortho' : 'diag'; const v2 = views(g, [4, 2]);
    ok(v2.rs.size === 0 && agree(v2), `同一摆法换成 ${C.skills.qishe.dirs}：一个都不射（${d === 'diag' ? '横竖版不射斜线' : '斜线版不射横竖'}）`);
  }
  cfg({ ...L3, 'skills.qishe.dirs': 'both' });
  const A = lay(DIRS.ortho, true), D = lay(DIRS.diag, false), g = pos([[4, 2, P('r', 'e', 3)], KG('b', 4, 9), ...A.pcs, ...D.pcs], { turn: 'r' });
  for (const [d, want] of [['both', new Set([...A.want, ...D.want])], ['ortho', A.want], ['diag', D.want]]) {
    C.skills.qishe.dirs = d; const v = views(g, [4, 2]);
    ok(same(v.rs, want) && agree(v), `两套摆法放在一起，${d}：${show(v.rs)}`);
  } }
{ cfg({ ...L3 }); const rnd = mulberry(20261004), SPOTS = [[2, 0], [6, 0], [0, 2], [4, 2], [8, 2], [2, 4], [6, 4]]; let n = 0, tg = 0;
  // 随机摆子：相放在各个相位上（含棋盘边上），四周随机撒双方的子（楚方只放士象，免得将军干扰）；三种方向下五种列法都和规则模型一样
  for (let i = 0; i < 70; i++) {
    const [ef, er] = SPOTS[i % SPOTS.length], taken = new Set([sq(ef, er), sq(3, 0), sq(5, 9), sq(0, 3)]), pcs = [...QB(), [ef, er, P('r', 'e', 3)]];
    for (let k = 0; k < 16; k++) { const f = Math.floor(rnd() * 9), r = Math.floor(rnd() * 6); if (taken.has(sq(f, r))) continue; taken.add(sq(f, r)); const s = rnd() < 0.7 ? 'b' : 'r'; pcs.push([f, r, P(s, s === 'b' ? (rnd() < 0.5 ? 'a' : 'e') : ['p', 'a', 'e'][Math.floor(rnd() * 3)], 1 + Math.floor(rnd() * 3))]); }
    const g = pos(pcs, { turn: 'r' });
    for (const d of ['diag', 'ortho', 'both']) { C.skills.qishe.dirs = d; const v = views(g, [ef, er]); assert.ok(same(v.rs, model(g.S, ef, er, d)) && agree(v), `随机局面 ${i} ${d}：${show(v.rs)} / 模型 ${show(model(g.S, ef, er, d))} / 界面 ${show(v.ui)} / expand ${show(v.ex)} / gen ${show(v.gn)}`); n++; tg += v.rs.size; }
  }
  ok(n === 210 && tg > 200, `随机摆子 70 个局面 × 三种方向：结算、界面、电脑（expand / gen / gen 只要打到的）列出的目标都和规则模型一样（共 ${tg} 个目标）`); }
{ cfg({ ...L3, ...COMBO, 'skills.qishe.dirs': 'ortho' });
  const g = pos([...QB(), [4, 2, P('r', 'e', 3)], [4, 4, P('b', 'a', 2)]], { turn: 'r' });
  const i = g.apply({ k: 'sk', at: [4, 2], to: [4, 4] });
  ok(!!i && g.at(4, 4) && g.at(4, 4).hp === 1 && BF.ai.atk(g.at(4, 2)) === 2, '数值组合下（三级相攻击 2）：齐射照旧只扣 qishe.damage = 1 点（二血的士剩 1 血）');
  ok(g.cdLeft(g.at(4, 2), 'qishe') === 3, '齐射照旧冷却 3 回合'); }

// ---------- 2. 践踏踩空格 ----------
// 楚象 E（三级）在 (4,7)，走田字到 (2,5)，象眼 (3,6)。落点周围一圈：(1,4) (2,4) (3,4) (1,5) (3,5) (1,6) (2,6) (3,6)
//   X1 一血士 (1,4)、X3 一血相 (2,6)、X4 残血兵 (1,5)：踩死；X2 二血士 (3,4)：剩 1 血；OWN 楚卒 (1,6)：自己人不踩；F1 (0,4)、F2 (2,3)：隔一格，圈外
const TL = (o = {}) => {
  const p = { E: P('b', 'e', o.lv || 3), X1: P('r', 'a', 1), X2: P('r', 'a', 2), X3: P('r', 'e', 1), X4: P('r', 'p', 2, { hp: 1 }), OWN: P('b', 'p'), F1: P('r', 'a'), F2: P('r', 'a'), EYE: P('b', 'p') };
  const pcs = [KG('r', 4, 0), KG('b', 3, 9), [4, 7, p.E], [1, 4, p.X1], [3, 4, p.X2], [2, 6, p.X3], [1, 5, p.X4], [1, 6, p.OWN], [0, 4, p.F1], [2, 3, p.F2]];
  if (o.eye) pcs.push([3, 6, p.EYE]);
  return { g: pos(pcs, { merit: { b: 10 } }), p };
};
const trampledOk = (g, p) => !hpOfId(g, p.X1.id) && !hpOfId(g, p.X3.id) && !hpOfId(g, p.X4.id) && hpOfId(g, p.X2.id) === 1 && hpOfId(g, p.OWN.id) === 1 && hpOfId(g, p.F1.id) === 1 && hpOfId(g, p.F2.id) === 1;
console.log('2. 践踏踩空格（onMove）：普通走子、飞越、背水一战的每一步');
{ cfg({ ...L3, ...COMBO, 'skills.jianta.onMove': true });
  const { g, p } = TL(), i = g.apply({ k: 'mv', from: [4, 7], to: [2, 5] }), sp = i && i.ev.find(e => e.e === 'splash');
  ok(!!i && sp && sp.how === 'jianta' && sp.mv === 1 && J(sp.at) === '[2,5]', '普通走子到空格：在落点踩了一脚（splash 事件标着 mv = 1）');
  ok(!hpOfId(g, p.X1.id) && !hpOfId(g, p.X3.id) && !hpOfId(g, p.X4.id), '周围一血的士、相，残血的兵：都踩死');
  ok(hpOfId(g, p.X2.id) === 1, '二血的士扣 1 点（数值组合里三级象攻击 2，践踏照旧只扣 splashDamage = 1）');
  ok(hpOfId(g, p.OWN.id) === 1 && hpOfId(g, p.F1.id) === 1 && hpOfId(g, p.F2.id) === 1, '己方的卒不踩；隔一格（圈外）的敌子不踩');
  ok(i.ev.filter(e => e.e === 'kill' && e.how === 'jianta' && e.by === p.E.id).length === 3 && g.at(2, 5).xp === 3, '三个都记在象名下（击杀事件 how = jianta，攒 3 片甲）'); }
{ cfg({ ...L3 }); const { g, p } = TL(), i = g.apply({ k: 'mv', from: [4, 7], to: [2, 5] });
  ok(!!i && !i.ev.some(e => e.e === 'splash') && ['X1', 'X2', 'X3', 'X4'].every(k => hpOfId(g, p[k].id) === p[k].hp), 'onMove 关着：走到空格不踩（和底版一样）'); }
{ cfg({ ...L3, 'skills.jianta.onMove': true });
  const g2 = pos([KG('r', 4, 0), KG('b', 3, 9), [4, 7, P('b', 'e', 3)], [6, 5, P('r', 'p', 1)], [0, 3, P('r', 'p')]]), i2 = g2.apply({ k: 'mv', from: [4, 7], to: [2, 5] });
  ok(!!i2 && !i2.ev.some(e => e.e === 'splash') && g2.at(2, 5).cd === 0, '周围没有敌子：不算踩（不出事件）');
  const W = P('r', 'a', 3), N1 = P('r', 'a'), N2 = P('r', 'a', 2);
  const g3 = pos([KG('r', 4, 0), KG('b', 3, 9), [0, 3, P('r', 'p')], [4, 7, P('b', 'e', 3)], [2, 5, W], [1, 4, N1], [3, 4, N2]]), i3 = g3.apply({ k: 'mv', from: [4, 7], to: [2, 5] });
  ok(!!i3 && i3.ev.some(e => e.e === 'splash' && !e.mv) && i3.ev.some(e => e.e === 'hit' && e.how === 'attack') && hpOfId(g3, W.id) === 2 && g3.at(4, 7) && !hpOfId(g3, N1.id) && hpOfId(g3, N2.id) === 1,
    '攻击（打不死、退回原位）照旧踩被攻击那一格的四周（不标 mv）'); }
{ cfg({ ...L3, 'skills.jianta.onMove': true }); const { g, p } = TL({ eye: true });
  ok(!BF.attempt(g.S, { k: 'mv', from: [4, 7], to: [2, 5] }), '象眼 (3,6) 被自己的卒塞住：普通走不过去');
  const i = g.apply({ k: 'sk', at: [4, 7], to: [2, 5], sk: 'feiyue' });
  ok(!!i && stomps(i.ev) === 1 && trampledOk(g, p) && hpOfId(g, p.EYE.id) === 1, '飞越过去（落在空格）：照样踩——一血的踩死、二血的扣 1 点，塞象眼的卒和旁边的卒（自己人）不踩');
  ok(g.cdLeft(g.at(2, 5), 'feiyue') > 0, '飞越照旧进冷却'); }
{ cfg({ ...L3, 'skills.jianta.onMove': true });   // 决战：帅将出宫、贴着象的落点也不挨踩
  const g = pos([KG('r', 3, 4), KG('b', 4, 9), [4, 7, P('b', 'e', 3)], [1, 4, P('r', 'a')]]);
  ok(g.final, '只剩帅将、士象：决战');
  const kid = g.S.board[4][3].id, i = g.apply({ k: 'mv', from: [4, 7], to: [2, 5] });
  ok(!!i && stomps(i.ev) === 1 && !g.at(1, 4) && hpOfId(g, kid) === 3, '决战里帅贴着落点：士踩死了，帅一点血不掉（践踏不打帅将，和底版一样）'); }
// 背水一战（楚车马炮 1 < 汉 2，最多剩 3）：E 踩空格踩死一个、楚车再吃一个 = 两个，超过“最多吃一个子”
const BL = () => { const p = { E: P('b', 'e', 3), X1: P('r', 'a', 1), X2: P('r', 'a', 2), R: P('b', 'r'), RR: P('r', 'r') };
  return { g: pos([KG('r', 4, 0), KG('b', 3, 9), [4, 7, p.E], [1, 4, p.X1], [3, 4, p.X2], [1, 6, P('b', 'p')], [8, 9, p.R], [8, 3, p.RR], [0, 0, P('r', 'r')]]), p }; };
{ cfg({ ...L3, ...NEW, 'skills.jianta.onMove': true });
  const { g, p } = BL(), S = g.S;
  const a2 = art([[4, 7], [2, 5]], [[8, 9], [8, 8]]), a3 = art([[4, 7], [2, 5]], [[8, 9], [8, 3]]), a4 = art([[8, 9], [8, 8]], [[4, 7], [2, 5]]), a5 = art([[8, 9], [8, 3]], [[4, 7], [2, 5]]);
  const r2 = BF.attempt(S, a2);
  ok(!!r2 && stomps(r2.ev) === 1 && r2.ev.filter(e => e.e === 'kill').length === 1 && !hpIn(r2.S, p.X1.id) && hpIn(r2.S, p.X2.id) === 1, '背水第一步象踩空格（踩死一个士、另一个扣 1 点）+ 车走空格：合法，只死一个');
  ok(!BF.attempt(S, a3), '象踩死一个 + 车再吃一个：两个子，不合法（践踏踩死的也算）');
  const r4 = BF.attempt(S, a4); ok(!!r4 && stomps(r4.ev) === 1 && !hpIn(r4.S, p.X1.id), '第二步才踩空格：也踩');
  ok(!BF.attempt(S, a5), '车先吃一个、象再踩死一个：不合法');
  const pf = BF.ai.pofuPairs(S); ok(hasA(pf, a2) && hasA(pf, a4) && !hasA(pf, a3) && !hasA(pf, a5), `电脑的背水候选里有“踩空格”的组合（只踩不吃也算打到敌子），没有超过一个子的（共 ${pf.length} 个）`);
  ok(samePairs(pf, BF.ai.pofuPairsRef(S)), '这个局面快慢两种写法逐项相同');
  const m1 = { from: [4, 7], to: [2, 5] }, pv = g.pofuPreview(m1);
  ok(g.pofuFirst().some(m => J(m) === J(m1)) && !pv.S.board[4][1] && pv.S.board[4][3].hp === 1 && stomps(pv.ev) === 1, '界面：第一步候选里有它，预览是踩完的样子（士死了、二血士剩 1 血）');
  cfg({ ...L3, ...NEW }); const S0 = BL().g.S, r2off = BF.attempt(S0, a2);
  ok(!!r2off && !r2off.ev.some(e => e.e === 'splash' || e.e === 'kill'), 'onMove 关着：同一手背水，象不踩');
  ok(!hasA(BF.ai.pofuPairs(S0), a2) && !!BF.attempt(S0, a3) && hasA(BF.ai.pofuPairs(S0), a3), 'onMove 关着：两步都没打到子的组合不进电脑候选；象走空格 + 车吃一个 = 一个，合法（都和底版一样）'); }
// 第一步踩死的子让开了路：楚车 (3,8) 本来被 (3,5) 的汉兵挡着；象 (4,7)→(2,5) 踩死它之后，车能一路走到 (3,1)
//   （底版的界面第二步候选、老写法 pofuPairsRef 的第一步只走 strike，践踏踩死的兵还当它在；onMove 开着时这几处照 resolve() 原样结算）
const allSecond = (S, m1, T) => { const out = new Set(); for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const q = T.board[r][f]; if (!q || q.s !== 'b') continue; for (let r2 = 0; r2 < 10; r2++) for (let f2 = 0; f2 < 9; f2++) if (BF.attempt(S, art([m1.from, m1.to], [[f, r], [f2, r2]]))) out.add(`${sq(f, r)}>${sq(f2, r2)}`); } return out; };
const setOf2 = list => new Set(list.map(m => `${sq(m.from[0], m.from[1])}>${sq(m.to[0], m.to[1])}`));
{ cfg({ ...L3, ...NEW, 'skills.jianta.onMove': true });
  const g = pos([KG('r', 4, 0), KG('b', 5, 9), [4, 7, P('b', 'e', 3)], [3, 5, P('r', 'p')], [3, 8, P('b', 'r')], [0, 0, P('r', 'r')], [8, 1, P('r', 'r')]]), S = g.S, m1 = { from: [4, 7], to: [2, 5] };
  const far = art([[4, 7], [2, 5]], [[3, 8], [3, 1]]), pf = BF.ai.pofuPairs(S);
  ok(!!BF.attempt(S, far) && hasA(pf, far) && hasA(pf, art([[4, 7], [2, 5]], [[3, 8], [3, 3]])), '象踩死挡路的兵，车穿过那一格走到 (3,1)：合法，电脑候选里也有');
  ok(samePairs(pf, BF.ai.pofuPairsRef(S)) && samePairs(BF.ai.pofuPairs(S, S.board[8][3].id), BF.ai.pofuPairsRef(S, S.board[8][3].id)), `快慢两种写法逐项相同（共 ${pf.length} 个组合；only = 车也一样）`);
  const sec = setOf2(g.pofuSecond(m1)), want = allSecond(S, m1, g.pofuPreview(m1).S);
  ok(same(sec, want) && sec.has('3,8>3,1') && !sec.has('3,8>3,0'), `界面第二步候选 = 每一步都拿 attempt 试出来的（${sec.size} 个，含车穿过踩空的格子；(3,0) 会将军，不行）`);
  // 第一个背水局面也对一遍
  const b = BL(), sec2 = setOf2(b.g.pofuSecond(m1)), want2 = allSecond(b.g.S, m1, b.g.pofuPreview(m1).S);
  ok(same(sec2, want2) && sec2.has('8,9>8,8') && !sec2.has('8,9>8,3'), `另一个局面：界面第二步候选同样一致（${sec2.size} 个；车再吃一个就超了，不在里面）`); }

// ---------- 3. 踩空格的冷却 ----------
// 楚象 A (2,9)、B (6,9)；汉士都是三血（踩不死）：X (0,6)、Y (3,8)、Z (7,6)、T (5,8)、W (2,5)、V (3,6)。帅 (3,0)、将 (4,9)
const CL = () => { const p = { A: P('b', 'e', 3), B: P('b', 'e', 3), X: P('r', 'a', 3), Y: P('r', 'a', 3), Z: P('r', 'a', 3), T: P('r', 'a', 3), W: P('r', 'a', 3), V: P('r', 'a', 3) };
  return { g: pos([KG('r', 3, 0), KG('b', 4, 9), [0, 3, P('r', 'p')], [2, 9, p.A], [6, 9, p.B], [0, 6, p.X], [3, 8, p.Y], [7, 6, p.Z], [5, 8, p.T], [2, 5, p.W], [3, 6, p.V]]), p }; };
const mv = (a, b) => ({ k: 'mv', from: a, to: b });
console.log('3. 踩空格的冷却（moveCooldown = 2：每 2 回合最多踩一次空格；攻击、吃子后的践踏不受限）');
{ cfg({ ...L3, 'skills.jianta.onMove': true, 'skills.jianta.moveCooldown': 2 });
  const { g, p } = CL();
  const i1 = g.apply(mv([2, 9], [0, 7]));
  ok(!!i1 && stomps(i1.ev) === 1 && hpOfId(g, p.X.id) === 2 && g.at(0, 7).cd === 12, '象 A 踩空格（第 10 次行动）：X 扣 1 点，A 记下“第 12 次行动才能再踩空格”（主技能冷却位 cd）');
  ok(!!g.apply(mv([3, 0], [3, 1])) && g.cdLeft(g.at(0, 7), 'jianta') === 1, '汉走一步；界面上 A 的践踏显示还要冷却 1 回合');
  const rI = BF.attempt(g.S, mv([0, 7], [2, 9]));
  ok(!!rI && !rI.ev.some(e => e.e === 'splash') && hpIn(rI.S, p.Y.id) === 3, '下一回合 A 再走到空格（旁边有 Y）：不踩（冷却中），照样能走');
  const rII = BF.attempt(g.S, mv([6, 9], [8, 7]));
  ok(!!rII && stomps(rII.ev) === 1 && hpIn(rII.S, p.Z.id) === 2, '同一回合另一头象 B 踩空格：照踩（冷却各算各的）');
  const rIII = BF.attempt(g.S, mv([0, 7], [2, 5]));
  ok(!!rIII && rIII.ev.some(e => e.e === 'splash' && !e.mv) && hpIn(rIII.S, p.W.id) === 2 && hpIn(rIII.S, p.V.id) === 2 && rIII.S.board[7][0].cd === 12, 'A 冷却中去攻击 W：攻击后的践踏照踩（V 扣 1 点），也不动 A 的踩空格冷却');
  ok(!!g.apply(mv([6, 9], [8, 7])) && g.at(8, 7).cd === 13 && !!g.apply(mv([3, 1], [3, 0])), 'B 踩了空格（第 11 次行动，记 13）；汉再走一步');
  const r5 = BF.attempt(g.S, mv([0, 7], [2, 9]));
  ok(!!r5 && stomps(r5.ev) === 1 && hpIn(r5.S, p.Y.id) === 2 && r5.S.board[9][2].cd === 14, '再下一回合（第 12 次行动）：A 冷却好了，走到空格又踩（Y 扣 1 点），记 14');
  const r6 = BF.attempt(g.S, mv([8, 7], [6, 9]));
  ok(!!r6 && !r6.ev.some(e => e.e === 'splash') && hpIn(r6.S, p.T.id) === 3, '同一回合 B（上一回合刚踩过）走到空格：不踩'); }
{ cfg({ ...L3, 'skills.jianta.onMove': true, 'skills.jianta.moveCooldown': 0 });
  const { g, p } = CL(); g.apply(mv([2, 9], [0, 7])); g.apply(mv([3, 0], [3, 1]));
  const rI = BF.attempt(g.S, mv([0, 7], [2, 9]));
  ok(!!rI && stomps(rI.ev) === 1 && hpIn(rI.S, p.Y.id) === 2 && g.at(0, 7).cd === 0, 'moveCooldown = 0：连着两回合都踩，不记冷却'); }
for (const cdN of [0, 2]) {   // 背水一战两步都是同一头象（twoPieces = false）：冷却 2 时同一回合只踩一次空格
  cfg({ ...L3, ...NEW, 'skills.jianta.onMove': true, 'skills.jianta.moveCooldown': cdN });
  const A = P('b', 'e', 3), X = P('r', 'a', 3), V = P('r', 'a', 3);
  const g = pos([KG('r', 3, 0), KG('b', 4, 9), [2, 9, A], [0, 6, X], [3, 6, V], [8, 8, P('b', 'r')], [8, 0, P('r', 'r')], [7, 1, P('r', 'r')]]);
  const a = art([[2, 9], [0, 7]], [[0, 7], [2, 5]]), r = BF.attempt(g.S, a), n = r ? stomps(r.ev) : -1;
  ok(n === (cdN ? 1 : 2) && hpIn(r.S, X.id) === 2 && hpIn(r.S, V.id) === (cdN ? 3 : 2), `moveCooldown = ${cdN}：同一头象背水连走两步，踩了 ${n} 次空格`);
  const pf = BF.ai.pofuPairs(g.S); ok(hasA(pf, a) && samePairs(pf, BF.ai.pofuPairsRef(g.S)), `电脑候选里有这一手，快慢两种写法逐项相同（共 ${pf.length} 个）`);
}

// ---------- 4. 三级解锁 ----------
console.log('4. 三级解锁（--set skills.qishe.level=3 / skills.jianta.level=3）');
{ cfg({ ...ON });   // 解锁等级照底版（四级）
  const g = pos([...QB(), [4, 2, P('r', 'e', 3)], [4, 3, P('b', 'a')]], { turn: 'r' });
  ok(!g.skillTargets(4, 2, 'qishe').length && g.skillWhy(4, 2, 'qishe') === '升到四级解锁' && !BF.attempt(g.S, { k: 'sk', at: [4, 2], to: [4, 3] }), '底版四级解锁：三级相还不会齐射（界面说“升到四级解锁”）');
  ok(g.hasSkill(g.at(4, 2), 'feiyue') && !g.hasSkill(g.at(4, 2), 'qishe'), '三级相有飞越（三级解锁）、没有齐射');
  const t = TL(), i = t.g.apply(mv([4, 7], [2, 5])); ok(!!i && !i.ev.some(e => e.e === 'splash'), '底版四级解锁：三级象走到空格不踩（onMove 开着也不踩）');
  cfg({ ...L3, ...ON });
  ok(g.skillTargets(4, 2, 'qishe').length === 1 && !!BF.attempt(g.S, { k: 'sk', at: [4, 2], to: [4, 3] }), 'qishe.level = 3：三级相会齐射（横竖）');
  const t2 = TL(), i2 = t2.g.apply(mv([4, 7], [2, 5])); ok(!!i2 && stomps(i2.ev) === 1, 'jianta.level = 3：三级象踩空格');
  ok(J(BF.levelInfo('e', 'r', 3).skills) === '["qishe","feiyue"]' && J(BF.levelInfo('e', 'b', 3).skills) === '["jianta","feiyue"]' && !BF.levelInfo('e', 'b', 2).skills.length, 'levelInfo：三级相 / 象的技能是齐射 / 践踏 + 飞越，二级还没有'); }
{ cfg({ ...L3, ...COMBO, ...ON });
  const g = pos([...QB(), [4, 2, P('r', 'e', 2)], [4, 4, P('b', 'a')], [8, 7, P('b', 'p')]], { turn: 'r', merit: { r: 10 } });
  ok(!!g.apply({ k: 'up', at: [4, 2] }) && g.at(4, 2).lv === 3 && g.merit.r === 8, '二级相升三级（数值组合：二升三 2 功）');
  ok(!g.skillTargets(4, 2, 'qishe').length && /冷却/.test(g.skillWhy(4, 2, 'qishe')), '刚解锁的齐射这一回合先冷却（cooldownOnUnlock，和底版一样）：' + g.skillWhy(4, 2, 'qishe'));
  ok(!!g.apply(mv([3, 0], [3, 1])) && !!g.apply(mv([8, 7], [8, 6])) && g.skillTargets(4, 2, 'qishe').length === 1, '汉、楚各走一步，下一回合齐射能射 (4,4)');
  const { g: g2, p } = TL({ lv: 2 });
  ok(!!g2.apply({ k: 'up', at: [4, 7] }) && g2.at(4, 7).lv === 3 && !!g2.apply(mv([4, 7], [2, 5])) && trampledOk(g2, p), '二级象升三级，同一回合走到空格就踩（被动，没有解锁冷却）'); }

// ---------- 5、6. 电脑的候选；背水组合快慢两种写法 ----------
// 随机对局里取局面：楚方拿掉两车一马一炮（剩 2 枚车马炮，比汉少）→ 背水一开局就能用；双方相 / 象都升到三级；
//   楚方半场（第 5～7 行）的空格里撒几个汉方一血兵，楚象走田字常常落在它们旁边。随机走子（一半吃子），楚方常常挑象走空格（让冷却有机会挂着）
function randomPositions(seed, games, plies, pick) {
  const rnd = mulberry(seed), out = [];
  for (let gi = 0; gi < games; gi++) {
    const g = new BF.Game();
    g.setup(S => {
      const n = { r: 2, n: 1, c: 1 };
      for (const row of S.board) for (let f = 0; f < 9; f++) { const q = row[f]; if (q && q.s === 'b' && n[q.t]) { n[q.t]--; row[f] = null; } }
      for (const row of S.board) for (const q of row) if (q && q.t === 'e') { q.lv = 3; q.hp = BF.hpOf('e', 3); }
      for (let k = 0; k < 6; k++) { const f = Math.floor(rnd() * 9), r = 5 + Math.floor(rnd() * 3); if (!S.board[r][f]) S.board[r][f] = { s: 'r', t: 'p', id: 900 + gi * 10 + k, lv: 1, hp: 1, cd: 0, jm: 0, xp: 0, kills: 0 }; }
      S.merit.r = S.merit.b = 10;
    });
    for (let ply = 0; ply < plies && !g.result; ply++) {
      if (pick(g.S)) out.push(BF.cloneState(g.S));
      const kids = BF.ai.expand(g.S).filter(k => k.a.k === 'mv' || k.a.k === 'sk');
      if (!kids.length) break;
      if (rnd() < 0.2) { const ups = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (g.canUpgrade(f, r)) ups.push([f, r]); if (ups.length) g.apply({ k: 'up', at: ups[Math.floor(rnd() * ups.length)] }); }
      const kids2 = BF.ai.expand(g.S).filter(k => k.a.k === 'mv' || k.a.k === 'sk');
      const caps = kids2.filter(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit')), eles = kids2.filter(k => k.a.k === 'mv' && g.S.board[k.a.from[1]][k.a.from[0]].t === 'e' && !g.S.board[k.a.to[1]][k.a.to[0]]);
      const x = rnd(), choice = g.S.turn === 'b' && eles.length && x < 0.3 ? eles[Math.floor(rnd() * eles.length)] : caps.length && x < 0.65 ? caps[Math.floor(rnd() * caps.length)] : kids2[Math.floor(rnd() * kids2.length)];
      if (!g.apply(choice.a)) break;
    }
  }
  return out;
}
console.log('5. 电脑的候选：静态搜索（gen 只要打到敌子的）里有“踩空格踩得到敌子”的一步，和真结算一致');
{ cfg({ ...L3, 'skills.jianta.onMove': true });
  const { g } = TL(), S = g.S, caps = BF.ai.gen(S, true);
  ok(caps.some(it => J(it.a) === J(mv([4, 7], [2, 5]))) && !caps.some(it => J(it.a) === J(mv([4, 7], [6, 5]))), '(2,5) 旁边有敌子：在里面；(6,5) 旁边没有：不在');
  ok(caps.some(it => it.sk === 'feiyue' && J(it.a.to) === '[2,5]') && !caps.some(it => it.sk === 'feiyue' && J(it.a.to) === '[6,5]'), '飞越也一样');
  const k = BF.ai.expand(S).find(x => J(x.a) === J(mv([4, 7], [2, 5])));
  ok(!!k && !k.S.board[4][1] && k.S.board[4][3].hp === 1 && stomps(k.ev) === 1, 'expand 给的结算后局面里已经踩过了');
  cfg({ ...L3 }); ok(!BF.ai.gen(TL().g.S, true).some(it => it.a.to && J(it.a.to) === '[2,5]'), 'onMove 关着：静态搜索里没有走空格的（和底版一样）');
  cfg({ 'skills.jianta.onMove': true }); ok(!BF.ai.gen(TL().g.S, true).some(it => it.a.to && J(it.a.to) === '[2,5]'), 'onMove 开着、践踏照底版四级解锁：三级象走空格也不进静态搜索（还不会踩）'); }
for (const cdN of [0, 2]) {
  cfg({ ...L3, ...COMBO, ...NEW, ...ON, 'skills.jianta.moveCooldown': cdN });
  const t0 = Date.now(), ps = randomPositions(777 + cdN, 6, 50, S => true);
  let n = 0, yes = 0, cool = 0;
  for (const S of ps) {
    const caps = new Set(BF.ai.gen(S, true).map(it => J(it.a)));
    for (const it of BF.ai.gen(S, false)) {
      const to = it.a.to; if (!to || !it.p || it.p.t !== 'e' || it.p.s !== 'b' || S.board[to[1]][to[0]]) continue;   // 楚象走到空格（普通走子、飞越）
      const r = BF.attempt(S, it.a); if (!r) continue;
      const st = stomps(r.ev) > 0; assert.ok(st === caps.has(J(it.a)), '静态搜索的候选和真结算不一致：' + J(it.a)); n++; if (st) yes++;
      if (!st && it.p.cd > S.cnt.b) cool++;
    }
  }
  ok(n > 300 && yes > 20 && (!cdN || cool > 0), `moveCooldown = ${cdN}：${ps.length} 个随机局面里楚象走空格 ${n} 次，踩得到的 ${yes} 次都在静态搜索的候选里、踩不到的都不在${cdN ? `（因为冷却没踩的 ${cool} 次）` : ''}（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
}
console.log('6. 背水组合：电脑的快写法（pofuPairs）和逐个试走（pofuPairsRef）逐项相同——onMove 开着');
for (const [cdN, twoP] of [[0, false], [2, false], [0, true], [2, true]]) {
  cfg({ ...L3, ...COMBO, ...NEW, ...ON, 'skills.jianta.moveCooldown': cdN, 'beishui.twoPieces': twoP });
  const t0 = Date.now(), ps = randomPositions(4242 + cdN * 10 + (twoP ? 1 : 0), 6, 40, S => S.turn === 'b' && !S.used.art.b);
  let positions = 0, pairs = 0, st = 0, stKill = 0, stPos = 0, twice = 0;
  const keep = (m1, t1, m2, t2) => !!(t1 || t2) || (m1.to[0] + m2.to[1]) % 3 !== 0;   // 随便一个筛子（电脑会传 keep），两种写法要一样
  for (const S of ps) {
    const A = BF.ai.pofuPairs(S), R = BF.ai.pofuPairsRef(S);
    assert.ok(samePairs(A, R), `组合不同（moveCooldown = ${cdN}，twoPieces = ${twoP}）：${A.length} 对 ${R.length}`);
    const e = S.board.flat().find(x => x && x.s === 'b' && x.t === 'e');
    if (e) assert.ok(samePairs(BF.ai.pofuPairs(S, e.id), BF.ai.pofuPairsRef(S, e.id)), 'only（象）不同');
    assert.ok(samePairs(BF.ai.pofuPairs(S, null, keep), BF.ai.pofuPairsRef(S, null, keep)), 'keep 不同');
    for (const k of A) {
      assert.ok(k.ev.filter(x => x.e === 'kill' && !x.friendly && x.s === 'r').length <= 1, '背水组合吃了不止一个子（践踏踩死的也算）');
      assert.ok(!BF.ai.inCheck(k.S, 'r') && !BF.ai.inCheck(k.S, 'b'), '走完之后有一方被将着');
      const n = stomps(k.ev); if (n) { st++; if (k.ev.some(x => x.e === 'kill' && x.how === 'jianta')) stKill++; } if (n > 1) twice++;
    }
    if (A.some(k => stomps(k.ev))) stPos++;
    positions++; pairs += A.length;
  }
  ok(positions >= 60 && st >= 100 && stKill >= 10 && stPos >= 10 && (cdN || twoP || twice > 0), `moveCooldown = ${cdN}、twoPieces = ${twoP}：${positions} 个局面、${pairs} 个组合逐项相同（含 only、keep）；带踩空格的组合 ${st} 个（${stPos} 个局面），其中踩死过子的 ${stKill} 个${!cdN && !twoP ? `，同一回合踩两次空格的 ${twice} 个` : ''}（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
}

// ---------- 7. 开关全关时和底版逐项相同 ----------
console.log('7. 开关全关：同一批局面上 expand / gen / evaluate / pofuPairs / 界面的背水候选、齐射目标都和底版 ' + REV + ' 逐项相同');
for (const sets of [{ ...L3, ...COMBO, ...NEW }, { ...NEW }]) {
  cfg(sets);
  const t0 = Date.now(), ps = randomPositions(99 + Object.keys(sets).length, 6, 50, S => true);
  let n = 0, kids = 0, pairs = 0, live = 0;
  const gameOf = (E, S) => { const g = new E.Game(); g.S = S; return g; };
  for (const S of ps) {
    const eV = BF.ai.expand(S);
    assert.ok(J(BASE.ai.expand(S)) === J(eV), 'expand 不同');
    assert.ok(J(BASE.ai.gen(S, false)) === J(BF.ai.gen(S, false)) && J(BASE.ai.gen(S, true)) === J(BF.ai.gen(S, true)), 'gen 不同');
    assert.ok(J(BASE.evaluate(S)) === J(BF.evaluate(S)), 'evaluate 不同');
    const pB = BASE.ai.pofuPairs(S), pV = BF.ai.pofuPairs(S); assert.ok(J(pB) === J(pV), 'pofuPairs 不同');
    const gB = gameOf(BASE, S), gV = gameOf(BF, S), f1 = gV.pofuFirst(); assert.ok(J(gB.pofuFirst()) === J(f1), 'pofuFirst 不同');
    for (const m1 of f1.slice(0, 3)) assert.ok(J(gB.pofuSecond(m1)) === J(gV.pofuSecond(m1)) && J(BASE.pofuPreview(S, m1)) === J(BF.pofuPreview(S, m1)), 'pofuSecond / pofuPreview 不同');
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t === 'e') assert.ok(J(gB.skillTargets(f, r)) === J(gV.skillTargets(f, r)) && gB.skillWhy(f, r, BF.SKILL_OF('e', p.s)) === gV.skillWhy(f, r, BF.SKILL_OF('e', p.s)), '相 / 象的技能目标不同'); }
    n++; kids += eV.length; pairs += pV.length;
    // 同一个局面打开开关（并三级解锁）：有多少行动会踩空格 / 横竖齐射——证明这批局面碰得到这两样
    cfg({ ...L3, ...sets, ...ON }); live += BF.ai.expand(S).filter(k => stomps(k.ev) || (k.a.k === 'sk' && k.a.to && !k.a.sk && S.board[k.a.at[1]][k.a.at[0]].t === 'e')).length; cfg(sets);
  }
  ok(n >= 250 && pairs > 300 && live >= 50, `${Object.keys(sets).length > 2 ? '三级解锁 + 数值组合' : '只开背水（底版解锁等级）'}：${n} 个局面、${kids} 个普通行动、${pairs} 个背水组合逐项相同（同一批局面打开开关，有 ${live} 个行动会踩空格 / 横竖齐射）（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
}

// ---------- 8、9. bfsim 真下棋 ----------
function bfsim(env, args) {
  const json = path.join(os.tmpdir(), `pctest_${process.pid}_${Date.now()}.json`);
  const r = spawnSync(process.execPath, [path.join(SRC, 'tools', 'bfsim.js'), ...args, '--quiet', '--json', json], { cwd: SRC, env: { ...process.env, ...env }, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(json)) throw new Error('bfsim 失败：' + r.stdout + r.stderr);
  const o = JSON.parse(fs.readFileSync(json, 'utf8')); fs.unlinkSync(json);
  return o;
}
const JOBS = String(process.env.PLANC_JOBS || 2), RULES = ['--set', 'beishui.on=true', '--set', 'beishui.twoPieces=false'];
const setArgs = o => Object.entries(o).flatMap(([k, v]) => ['--set', `${k}=${typeof v === 'string' ? v : J(v)}`]);   // 字符串不加引号：bfsim 解析不了 JSON 时按字符串用
if (process.env.PLANC_FAST) console.log('8、9. 跳过（PLANC_FAST）');
else {
  console.log('8. 开关全关：bfsim 6 局和底版逐局相同（--nodes mid=20000，新规则，电脑 git:' + REV + '）');
  { const args = ['--games', '6', '--seed', '1000', '--nodes', 'mid=20000', '--ai', 'git:' + REV, '--jobs', JOBS, ...RULES], t0 = Date.now();
    const base = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_at.js', ENGINE_REV: REV }, args), vari = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_planc.js', ENGINE_REV: REV }, args);
    const sig = r => J([r.winner, r.reason, r.rounds, r.plies, r.act, r.kills, r.up]), all = r => J({ ...r, ms: 0, msMax: 0 });
    const mV = new Map(vari.results.map(r => [r.seed, r]));
    ok(base.results.length === 6 && vari.results.length === 6 && !base.errors.length && !vari.errors.length, '两边各下完 6 局、没有出错');
    ok(base.results.every(r => mV.has(r.seed) && sig(mV.get(r.seed)) === sig(r)), `逐局相同 [winner, reason, rounds, plies, act, kills, up]（种子 1000～1005：${base.results.map(r => (r.winner || '-') + r.rounds).join(' ')}）（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
    ok(base.results.every(r => all(mV.get(r.seed)) === all(r)), '除了用时，每局记下的所有东西（搜索节点数、局面分采样、军功来源……）也都一样'); }
  console.log('9. 要跑的两种配置（+ dirs = both）都能下完：全部开关 + 三级解锁 + 数值组合，各 2 局');
  for (const [name, extra] of [['横竖齐射、踩空格不限次', {}], ['横竖齐射、踩空格每 2 回合一次', { 'skills.jianta.moveCooldown': 2 }], ['横竖斜线都能射、踩空格每 2 回合一次', { 'skills.qishe.dirs': 'both', 'skills.jianta.moveCooldown': 2 }]]) {
    const args = ['--games', '2', '--seed', '2000', '--nodes', 'mid=20000', '--ai', 'git:' + REV, '--jobs', JOBS, ...RULES, ...setArgs({ ...L3, ...ON, ...COMBO, ...extra })];
    const t0 = Date.now(), o = bfsim({ BFSIM_ENGINE: 'tools/variants/engine_planc.js', ENGINE_REV: REV }, args);
    const sum = (f) => o.results.reduce((t, r) => t + f(r, 'r') + f(r, 'b'), 0);
    const jt = sum((r, s) => ((r.kills[s] || {}).jianta || 0) + ((r.hits[s] || {}).jianta || 0)), qs = sum((r, s) => (r.act[s] || {}).sk_qishe || 0), fy = sum((r, s) => (r.act[s] || {}).sk_feiyue || 0);
    const want = { ...L3, ...ON, ...COMBO, ...extra }, got = o.overrides.set;
    ok(o.results.length === 2 && !o.errors.length && o.results.every(r => r.reason) && Object.keys(want).every(k => J(got[k]) === J(want[k])),
      `${name}：2 局下完、没有出错、--set 都传到了（${o.results.map(r => (r.winner || '-') + ':' + r.reason + ':' + r.rounds).join(' ')}；践踏打中 ${jt} 次、齐射 ${qs} 次、飞越 ${fy} 次）（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
  }
}
cfg();
console.log('通过', pass, '项');
