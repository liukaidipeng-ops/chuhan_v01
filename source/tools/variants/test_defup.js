// 不压制士象的电脑（bfai_defup.js，底版 git 98dd206 = 背水正式版电脑）自测
//   用法（在 source/ 下）：node tools/variants/test_defup.js
//   环境变量：BFAI_DEF_BASE = 电脑底版（默认 98dd206，和 bfai_defup.js 一样）；ENGINE_REV = 引擎底版（默认 98dd206）；
//             DEFUP_FAST=1 跳过最后用 bfsim 真下棋的两段；DEFUP_JOBS = bfsim 并行数（默认 2）；DEFUP_GAMES = 第 8 段每边几局（默认 4）
//   核对的东西：
//     · 开关全关：一批随机局面上估值 score() 和底版逐项相同，think() 按节点数收手时给的行动、搜索信息逐项相同；bfsim 6 局和底版逐局相同；
//     · 三个开关各管的那几处，在摆好的局面上逐条核对（数值按底版的公式手算）；
//     · 三个开关全开 + 象二级攻击 2：bfsim 能下完，士象升级次数比底版电脑多。
//   这里不碰 BFAI_DEFUP / BFAI_DGUARD / BFAI_DEFVAL 以外的环境变量；BFAI_KD 设了的话第 2 段按它算。
'use strict';
const assert = require('assert'), path = require('path'), os = require('os'), fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');
const SRC = path.join(__dirname, '..', '..');   // source/
const AIREV = process.env.BFAI_DEF_BASE || '98dd206', REV = process.env.ENGINE_REV || '98dd206';
const SW = ['BFAI_DEFUP', 'BFAI_DGUARD', 'BFAI_DEFVAL'];
for (const k of SW) delete process.env[k];   // 开关只由这里按段设
const J = JSON.stringify;
const tmp = [];   // 这里写的临时文件，退出时删掉（中途出错也删）
process.on('exit', () => { for (const f of tmp) try { fs.unlinkSync(f); } catch (e) { } });
const tmpWrite = (name, text) => { const f = path.join(os.tmpdir(), `dftest_${name}_${process.pid}.js`); fs.writeFileSync(f, text); tmp.push(f); return f; };
const show = (rev, file) => execFileSync('git', ['show', rev + ':source/src/' + file], { cwd: SRC, encoding: 'utf8' });

global.XQ = require(path.join(SRC, 'src', 'rules.js'));
const BF = global.BF = require(tmpWrite('bingfa_' + REV.replace(/[^\w.-]/g, '_'), show(REV, 'bingfa.js')));
// 配置：每段先拨回引擎默认值 + 新规则（背水开、同一枚子也能走两步），再按 { 'attack.e': [1, 2, 2, 2] } 改（和 bfsim 的 --set 一样的写法）
const C = BF.CFG, C0 = J(C);
const setPath = (o, k, v) => { const ks = k.split('.'); for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) throw new Error('配置里没有 ' + k); o = o[ks[i]]; } o[ks[ks.length - 1]] = v; };
const rules = (x = {}) => { const d = JSON.parse(C0); for (const k of Object.keys(d)) C[k] = d[k]; C.beishui.on = true; C.beishui.twoPieces = false; for (const [k, v] of Object.entries(x)) setPath(C, k, v); };

let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
let pid = 600; const P = (s, t, lv = 1, x = {}) => ({ s, t, id: pid++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
const pos = (pieces, o = {}) => { const g = new BF.Game(); g.setup(T => { for (const row of T.board) row.fill(null); for (const [f, r, p] of pieces) T.board[r][f] = p; T.turn = o.turn || 'b'; T.merit = { r: 0, b: 0, ...(o.merit || {}) }; T.used = { art: { r: 0, b: 0, ...(o.art || {}) }, ult: { r: 0, b: 0 } }; T.cnt = { r: 10, b: 10 }; }); return g; };
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- 加载电脑 ----------
// 多导出两个内部函数（baseVal、upgradeCands）给这里核对；底版和变体各自的那份照样改，别的一字不动
const EXP = '  const BFAI = { think, score, LEVELS, apiVersion: 1 };';
const expose = text => { assert.strictEqual(text.split(EXP).length - 1, 1, '电脑的导出那一行变了'); return text.split(EXP).join('  const BFAI = { think, score, LEVELS, apiVersion: 1, _t: { baseVal, upgradeCands } };'); };
const baseText = show(AIREV, 'bfai.js');
const BASE = require(tmpWrite('base', expose(baseText)));
// 照 bfsim 的样子经过 bfai_defup.js 加载（每次都重新生成、重新加载）；env = 这一次的开关
const WRAP = require.resolve('./bfai_defup.js');
const viaWrap = env => {
  for (const k of SW) delete process.env[k]; Object.assign(process.env, env);
  for (const k of Object.keys(require.cache)) if (k === WRAP || path.basename(k).startsWith('bfai_defup_')) delete require.cache[k];
  try {
    const AI = require(WRAP), m = Object.values(require.cache).find(x => x.exports === AI && x.filename !== WRAP);
    return { AI, file: m.filename, text: fs.readFileSync(m.filename, 'utf8') };
  } finally { for (const k of SW) delete process.env[k]; }
};
const W0 = viaWrap({});
let nv = 0;
const variant = (...on) => {   // 开关 on（'DEFUP'、'DGUARD'、'DEFVAL'）打开的变体电脑，同样多导出两个内部函数
  for (const k of on) process.env['BFAI_' + k] = '1';
  try { return require(tmpWrite('var' + (nv++), expose(W0.text))); } finally { for (const k of SW) delete process.env[k]; }
};
const OFF = variant(), UP = variant('DEFUP'), GD = variant('DGUARD'), DV = variant('DEFVAL'), ALL = variant('DEFUP', 'DGUARD', 'DEFVAL');
const think = async (X, S, nodes, rnd) => {   // 按节点数收手、随机数固定，结果可复现
  X.LEVELS.mid.nodes = nodes; const R = Math.random; Math.random = rnd || mulberry32(12345);
  try { const seq = await X.think(BF.cloneState(S), 'mid'); return { seq, last: { ...X.think.last, ms: 0 } }; } finally { Math.random = R; }
};

(async () => {
  console.log('0. 包装文件（底版电脑 ' + AIREV + '、引擎 ' + REV + '）');
  ok(Object.keys(W0.AI).join() === 'think,score,LEVELS,apiVersion' && W0.AI.apiVersion === 1 && J(W0.AI.LEVELS) === J(require(tmpWrite('base2', baseText)).LEVELS), '经过包装加载：导出的东西和底版一样（think / score / LEVELS / apiVersion 1）');
  ok(/nodeCap|\bL\.nodes\b/.test(fs.readFileSync(WRAP, 'utf8')), 'bfsim 认得出它支持按节点数收手（--nodes 有效）');
  { const b = baseText.split('\n'), v = W0.text.split('\n'), bs = new Set(b);
    const changed = b.filter(l => !v.includes(l)), added = v.filter(l => !bs.has(l));
    // 改的 6 行换成带开关的写法；加的是开头 14 行（开关、两个小工具和注释）+ baseVal 里一行 strong；不是注释的新行都用到了开关或这几个小工具
    //   第 348 行（被将军时相 / 象、兵不算保命的升级）故意不改，见 bfai_defup.js 开头“这一版没改”里第 348 行那条和下面第 4 段 e
    const code = added.filter(l => !/^\s*\/\//.test(l)), must348 = "must = thr || (chk && p.t !== 'e' && p.t !== 'p');";
    ok(changed.length === 6 && added.length === 6 + 14 + 1 && code.length === 12 && code.every(l => /DEFUP|DGUARD|DEFVAL|strong|swOn|guardZone|skLv|defStrong/.test(l)) && v.filter(l => l.includes(must348)).length === 1,
      `生成的电脑只改了 6 行（都换成带开关的写法）、加了 15 行（开关、小工具、注释）；其余 ${b.length - 6} 行原样（第 348 行“被将军时相 / 象不算保命的升级”也原样）`); }

  console.log('1. 开关全关：和底版逐项相同');
  { rules(); const rnd = mulberry32(2024), list = [];
    let g = new BF.Game();
    while (list.length < 400) {   // 随机下：偏向吃子、时常给走子方补点军功随机升一枚，局面里才有掉血、高等级、少子、被将军
      if (g.result || g.round > 70) g = new BF.Game();
      const S = g.S;
      if (rnd() < 0.5) {
        S.merit[S.turn] = Math.max(S.merit[S.turn], Math.floor(rnd() * 14));
        const mine = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') mine.push([f, r]); }
        const at = mine[Math.floor(rnd() * mine.length)]; if (at && g.canUpgrade(at[0], at[1])) g.apply({ k: 'up', at });
      }
      const kids = BF.ai.expand(g.S); if (!kids.length) { g = new BF.Game(); continue; }
      const caps = kids.filter(k => k.ev.some(e => e.e === 'kill' || e.e === 'hit')), from = caps.length && rnd() < 0.6 ? caps : kids;
      if (!g.apply(from[Math.floor(rnd() * from.length)].a)) { g = new BF.Game(); continue; }
      list.push(BF.cloneState(g.S));
    }
    const lv = list.reduce((t, S) => t + S.board.flat().filter(p => p && (p.t === 'a' || p.t === 'e') && p.lv >= 2).length, 0);
    for (const [name, x] of [['新规则', {}], ['象二级攻击 2', { 'attack.e': [1, 2, 2, 2] }], ['Plan A 的攻击力', { 'attack.r': [1, 1, 2, 2], 'attack.p': [1, 1, 2, 2], 'attack.n': [1, 1, 2], 'attack.c': [1, 1, 2], 'attack.e': [1, 1, 2, 2], 'attack.a': [1, 2, 3, 3] }]]) {
      rules(x); let same = 0, diff = { GD: 0, DV: 0, ALL: 0 };
      for (const S of list) for (const s of ['r', 'b']) {
        const b = BASE.score(S, s); if (OFF.score(S, s) === b && W0.AI.score(S, s) === b) same++;
        if (GD.score(S, s) !== b) diff.GD++; if (DV.score(S, s) !== b) diff.DV++; if (ALL.score(S, s) !== b) diff.ALL++;
      }
      ok(same === list.length * 2, `${name}：${list.length} 个随机局面（二级以上的士象共 ${lv} 枚）× 两方的 score() 逐项相同（打开开关时不同的：DGUARD ${diff.GD}、DEFVAL ${diff.DV}、全开 ${diff.ALL} 个）`);
    }
    rules(); let n = 0, upN = 0; const t0 = Date.now();
    for (let i = 7; i < list.length; i += 50) {
      const a = await think(BASE, list[i], 4000), b = await think(W0.AI, list[i], 4000);
      assert.strictEqual(J(b), J(a), '第 ' + i + ' 个局面 think() 不同'); n++; if (a.seq.some(x => x.k === 'up')) upN++;
    }
    ok(n === 8, `think()（校尉，按 4000 个节点收手）在 ${n} 个局面上逐项相同：给的行动、节点数、深度、前五名和分数（其中 ${upN} 个局面升了级）（${((Date.now() - t0) / 1000).toFixed(0)}s）`); }

  console.log('2. DGUARD：守方砍得动贴脸两血子的，看帅将 + 九宫里和紧挨九宫的所有子');
  { const KD0 = process.env.BFAI_KD ? +process.env.BFAI_KD.split(',')[0] : 2.0;   // 车贴身的加分（底版 KD[0]）
    // 汉帅 (3,0)，楚二级车 (3,1) 贴身将军；汉方的守子摆在 at
    const mk = (piece, at) => pos([[3, 0, P('r', 'k')], [4, 9, P('b', 'k')], [3, 1, P('b', 'r', 2)], [at[0], at[1], piece], [8, 9, P('b', 'p')]], { turn: 'r' });
    const d = (X, g) => X.score(g.S, 'r') - BASE.score(g.S, 'r');
    rules({ 'attack.e': [1, 2, 2, 2] });
    ok(Math.abs(d(GD, mk(P('r', 'e', 2), [4, 2])) - KD0) < 1e-9, `象二级攻击 2、站在九宫里 (4,2)：楚车贴身那 ${KD0} 分不再加（汉方视角多 ${KD0}）`);
    ok(Math.abs(d(GD, mk(P('r', 'e', 2), [2, 0])) - KD0) < 1e-9 && Math.abs(d(GD, mk(P('r', 'e', 2), [6, 0])) - KD0) < 1e-9, '紧挨九宫的 (2,0)、(6,0) 也算');
    ok(d(GD, mk(P('r', 'e', 2), [2, 4])) === 0 && d(GD, mk(P('r', 'e', 2), [0, 2])) === 0, '九宫外两格的 (2,4)、(0,2)：不算，和底版一样');
    rules(); ok(d(GD, mk(P('r', 'e', 2), [4, 2])) === 0, '现行规则（象攻击 1）：没有变化');
    rules({ 'attack.r': [1, 1, 2, 2] });
    ok(Math.abs(d(GD, mk(P('r', 'r', 3), [5, 1])) - KD0) < 1e-9 && d(GD, mk(P('r', 'r', 3), [7, 1])) === 0, 'Plan A 三级车攻击 2：守在九宫里 (5,1) 算，(7,1) 不算');
    // 第 3 行（九宫前一行）的边界：Plan A / B 三级攻击 2 的子常守在这一行
    ok([[4, 3], [2, 3], [6, 3]].every(at => Math.abs(d(GD, mk(P('r', 'r', 3), at)) - KD0) < 1e-9) && [[4, 4], [2, 4], [1, 3], [7, 3]].every(at => d(GD, mk(P('r', 'r', 3), at)) === 0),
      '九宫前一行（从己方底线数第 3 行）的 (4,3)、(2,3)、(6,3) 也算；再往前的 (4,4)、(2,4) 和这一行两边的 (1,3)、(7,3) 不算');
    { // 楚方：楚将 (4,9) 被汉二级车 (4,8) 贴身将着，楚方的 Plan A 三级车摆在 at
      const dB = at => { const g = pos([[3, 0, P('r', 'k')], [4, 9, P('b', 'k')], [4, 8, P('r', 'r', 2)], [at[0], at[1], P('b', 'r', 3)], [0, 0, P('r', 'p')]], { turn: 'b' }); return GD.score(g.S, 'b') - BASE.score(g.S, 'b'); };
      ok([[4, 6], [2, 6], [6, 6]].every(at => Math.abs(dB(at) - KD0) < 1e-9) && [[4, 5], [6, 5]].every(at => dB(at) === 0), '楚方从楚方底线数：第 3 行的 (4,6)、(2,6)、(6,6) 算，第 4 行的 (4,5)、(6,5) 不算'); }
    rules({ 'attack.e': [1, 2, 2, 2] });
    { const g = pos([[3, 0, P('r', 'k')], [4, 9, P('b', 'k')], [4, 8, P('r', 'r', 2)], [4, 7, P('b', 'e', 2)], [0, 0, P('r', 'p')]], { turn: 'b' });
      ok(Math.abs(GD.score(g.S, 'b') - BASE.score(g.S, 'b') - KD0) < 1e-9, '楚方一样（从楚方底线数：楚象 (4,7) 在九宫里）'); }
    rules(); }

  console.log('3. DEFVAL：能打的士象按进攻子算（攻击 ≥ 2，或者三级以上有解锁的技能）');
  { const VAL = { r: 9, c: 4.6, n: 4.2, e: 2.3, a: 2.1, p: 1.1 }, HPF = [0, 1, 1.5, 1.9, 2.2], HPF_DEF = [0, 1, 1.15, 1.28, 1.36], HPF_ADV = [0, 1, 1.55, 1.75, 1.85];
    const hpI = p => Math.min(4, Math.max(1, p.hp)), xp = p => 0.14 * Math.min(6, p.xp || 0);
    const reg = p => VAL[p.t] * (HPF[hpI(p)] + 0.06 * (p.lv - 1)) + (p.lv >= 3 ? 0.9 : 0) + (p.lv >= 4 ? 0.9 : 0) + xp(p);       // 进攻子的算法（底版第 37～39 行）
    const def = p => VAL[p.t] * (HPF_DEF[hpI(p)] + 0.03 * (p.lv - 1)) + (p.lv >= 3 ? 0.4 : 0) + (p.lv >= 4 ? 0.9 : 0) + xp(p);   // 守子的算法
    const adv = p => VAL.a * (HPF_ADV[hpI(p)] + (p.lv >= 2 && p.hp < 2 ? 0.2 : 0)) + (p.lv >= 3 ? 0.4 : 0) + (p.lv >= 4 ? 0.9 : 0) + xp(p);   // 对方有两血子逼近时的士（第 35 行）
    const eq = (a, b) => Math.abs(a - b) < 1e-9;
    // [说明, 规则, 子, heavy, 底版应得, DEFVAL 应得]
    const cases = [
      ['一级士、象（两张表本来一样）', {}, [P('b', 'a'), P('b', 'e'), P('r', 'e')], false, def, def],
      ['一级士、对方有两血子逼近', {}, [P('r', 'a')], true, adv, adv],
      ['二级象（攻击 1、没技能）', {}, [P('b', 'e', 2), P('r', 'e', 2, { hp: 1 })], false, def, def],
      ['二级象、象二级攻击 2', { 'attack.e': [1, 2, 2, 2] }, [P('b', 'e', 2), P('r', 'e', 2, { hp: 1, xp: 2 })], false, def, reg],
      ['三级象（飞越已解锁）', {}, [P('b', 'e', 3), P('r', 'e', 3, { hp: 2 })], false, def, reg],
      ['三级象、技能都改到四级才解锁', { skillLevel: 4 }, [P('b', 'e', 3)], false, def, def],
      ['四级相（齐射）、四级象（践踏）', {}, [P('r', 'e', 4), P('b', 'e', 4)], false, def, reg],
      ['二级士（现行规则就是攻击 2）', {}, [P('b', 'a', 2), P('r', 'a', 2, { hp: 1 })], false, def, reg],
      ['二级士、对方有两血子逼近（HPF_ADV 那一支也不走）', {}, [P('b', 'a', 2), P('r', 'a', 2, { hp: 1 })], true, adv, reg],
      ['三级士、Plan A 攻击 3', { 'attack.a': [1, 2, 3, 3] }, [P('b', 'a', 3)], false, def, reg],
      ['决战里解禁的士象（底版就按进攻子算）', {}, [P('b', 'a', 2, { j: 1 }), P('b', 'e', 3, { j: 1 })], false, reg, reg],
      ['车马炮兵（不受影响）', { 'attack.e': [1, 2, 2, 2] }, [P('b', 'r', 2), P('r', 'n', 2), P('b', 'c', 3), P('r', 'p', 4, { xp: 3 })], false, reg, reg],
    ];
    for (const [name, x, ps, heavy, wantB, wantV] of cases) {
      rules(x);
      const good = ps.every(p => eq(BASE._t.baseVal(p, heavy), wantB(p)) && eq(OFF._t.baseVal(p, heavy), wantB(p)) && eq(DV._t.baseVal(p, heavy), wantV(p)));
      ok(good, `${name}：底版 ${ps.map(p => BASE._t.baseVal(p, heavy).toFixed(2)).join(' / ')} → DEFVAL ${ps.map(p => DV._t.baseVal(p, heavy).toFixed(2)).join(' / ')}`);
    }
    rules(); }

  console.log('4. DEFUP：候选升级（upgradeCands）');
  { const L = BASE.LEVELS.mid, cands = (X, g) => X._t.upgradeCands(g.S, L).map(c => ({ t: g.S.board[c.at[1]][c.at[0]].t, at: c.at, must: c.must, unlock: c.unlock, gain: +c.gain.toFixed(3) }));
    const ts = cs => cs.map(c => c.t).join('');
    rules();
    // a. 平常局面：楚方 2 功，只升得起一级士象（各 2 功）；汉方没有两血子逼近
    { const g = pos([[4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [5, 9, P('b', 'a')], [2, 9, P('b', 'e')], [6, 9, P('b', 'e')], [3, 0, P('r', 'k')], [0, 0, P('r', 'r')], [4, 3, P('r', 'p')]], { merit: { b: 2 } });
      const b = cands(BASE, g), u = cands(UP, g);
      ok(b.length === 0 && J(cands(OFF, g)) === J(b), '平常局面、一级士象：底版一个都不列（不被捉、没被将军）');
      ok(u.length === 3 && u.every(c => (c.t === 'a' || c.t === 'e') && !c.must), `DEFUP：列进前三（${ts(u)}，静态分 ${u.map(c => c.gain).join(' / ')}）`); }
    // b. 被将军：楚将被汉车将着；楚方 4 功、有车（升一级要 6 功，差 2 功：给车攒军功）
    { const g = pos([[4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [2, 9, P('b', 'e')], [6, 9, P('b', 'e')], [0, 9, P('b', 'r')], [3, 0, P('r', 'k')], [4, 5, P('r', 'r')], [0, 3, P('r', 'p')]], { merit: { b: 4 } });
      const b = cands(BASE, g), u = cands(UP, g);
      ok(BF.ai.inCheck(g.S, 'b') && ts(b) === 'a' && b[0].must && J(cands(OFF, g)) === J(b), '被将军、在给车攒军功：底版只列士（保命的升级），相 / 象“砍不了人”不列');
      ok(J(u) === J(b), 'DEFUP 一样：被将军时相 / 象照样不算保命的升级（第 348 行不改），给车攒军功时照样跳过'); }
    // b2. 同一个局面去掉楚车（不用攒军功）：底版仍只列士；DEFUP 把两只象也列进来，但不算保命的、排在士后面
    { const g = pos([[4, 9, P('b', 'k')], [3, 9, P('b', 'a')], [2, 9, P('b', 'e')], [6, 9, P('b', 'e')], [3, 0, P('r', 'k')], [4, 5, P('r', 'r')], [0, 3, P('r', 'p')]], { merit: { b: 4 } });
      const b = cands(BASE, g), u = cands(UP, g);
      ok(BF.ai.inCheck(g.S, 'b') && ts(b) === 'a' && b[0].must && J(cands(OFF, g)) === J(b), '被将军、不用攒军功：底版还是只列士');
      ok(ts(u) === 'aee' && u[0].must && !u[1].must && !u[2].must && u[1].gain > u[0].gain,
        `DEFUP：象也列进来，但排在保命的士后面（${u.map(c => c.t + (c.must ? '!' : '') + ' ' + c.gain).join(' / ')}：象的静态分其实比士高，要是也算保命的就排到士前面去了）`); }
    // c. 二级士象（升三级解锁技能）和一级兵：楚方 10 功
    { const g = pos([[4, 9, P('b', 'k')], [3, 9, P('b', 'a', 2)], [2, 9, P('b', 'e', 2)], [6, 9, P('b', 'e', 2)], [0, 6, P('b', 'p')], [4, 6, P('b', 'p')], [8, 6, P('b', 'p')], [3, 0, P('r', 'k')], [0, 0, P('r', 'r')]], { merit: { b: 10 } });
      const b = cands(BASE, g), u = cands(UP, g);
      ok(ts(b) === 'pppe' && b[3].unlock && J(cands(OFF, g)) === J(b), `底版：前三个名额只给兵（${b.slice(0, 3).map(c => c.gain).join(' / ')}），士象只占额外的一个（${b[3].t} ${b[3].gain}）`);
      ok(u.length === 3 && u.every(c => c.t === 'a' || c.t === 'e'), `DEFUP：按静态分排，前三是士象（${ts(u)}：${u.map(c => c.gain).join(' / ')}，都比兵的 ${b[0].gain} 高）`); }
    // d. 额外名额照留：二级士象排不进前三时还给一个
    { const g = pos([[4, 9, P('b', 'k')], [2, 9, P('b', 'e', 2)], [0, 9, P('b', 'r')], [1, 9, P('b', 'n')], [7, 9, P('b', 'c')], [3, 0, P('r', 'k')], [8, 0, P('r', 'r')]], { merit: { b: 10 } });
      const u = cands(UP, g), b = cands(BASE, g);
      ok(J(u) === J(b) && ts(u) === 'rcne' && u[3].unlock, `车马炮静态分高：DEFUP 前三也是车马炮，二级象照样拿额外名额（${ts(u)}，和底版一样）`); }
    // e. 被将军时别把士挤掉（核查找到的）：汉帅 (4,0) 被楚二级车 (4,1) 贴脸将军；汉方 6 功，一级士 (3,0)、一级相 (2,0)、(6,0)、车 (0,0)、兵 (0,3)。
    //    象二级攻击 2、三个开关全开时，相升二级的静态分比士升二级还高（DGUARD、DEFVAL 都给它加分，虽然它够不着 (4,1)）。
    //    早先的版本让被将军时相 / 象也算保命的升级：前三个名额成了车、相、相，士被挤掉，“升士 + 士吃车”这一手看不见，电脑算出来被将死（-8998 分）
    rules({ 'attack.e': [1, 2, 2, 2] });
    { const g = pos([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [2, 0, P('r', 'e')], [6, 0, P('r', 'e')], [0, 0, P('r', 'r')], [0, 3, P('r', 'p')],
                     [4, 9, P('b', 'k')], [4, 1, P('b', 'r', 2)], [8, 6, P('b', 'p')], [0, 9, P('b', 'r')]], { turn: 'r', merit: { r: 6 } });
      const b = cands(BASE, g), a = cands(ALL, g), fmt = cs => cs.map(c => c.t + (c.must ? '!' : '') + ' ' + c.gain).join(' / ');
      ok(BF.ai.inCheck(g.S, 'r') && ts(b) === 'rap' && b[1].must && J(b[1].at) === '[3,0]', `底版：车、士是保命的升级（${fmt(b)}）`);
      ok(ts(a) === 'rae' && a[1].must && J(a[1].at) === '[3,0]' && !a[2].must && a[2].gain > a[1].gain, `三个全开：士 (3,0) 还在候选里，相排在它后面（${fmt(a)}）`);
      const want = J([{ k: 'up', at: [3, 0] }, { k: 'mv', from: [3, 0], to: [4, 1] }]), tb = await think(BASE, g.S, 20000), ta = await think(ALL, g.S, 20000);
      ok(J(tb.seq) === want && J(ta.seq) === want && ta.last.v > 0, `底版、三个全开都“升士 + 士吃车”（按 20000 个节点收手：${tb.last.v.toFixed(2)} / ${ta.last.v.toFixed(2)} 分）`); }
    rules(); }

  console.log('5. DEFUP：根节点（think，校尉，按 20000 个节点收手）');
  { // a. 象二级攻击 2：一级象先升二级再吃掉两血的车。底版不列这个升级（一级象、没被捉），只能空打一下；背水已经用过
    rules({ 'attack.e': [1, 2, 2, 2] });
    const g = pos([[4, 9, P('b', 'k')], [4, 7, P('b', 'e')], [3, 0, P('r', 'k')], [6, 5, P('r', 'r', 2)], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')]], { merit: { b: 2 }, art: { b: 1 } });
    const b = await think(BASE, g.S, 20000), u = await think(UP, g.S, 20000), a = await think(ALL, g.S, 20000), o = await think(OFF, g.S, 20000);
    const want = J([{ k: 'up', at: [4, 7] }, { k: 'mv', from: [4, 7], to: [6, 5] }]);
    ok(!b.seq.some(x => x.k === 'up') && J(o) === J(b), `底版：不升级（${J(b.seq)}，${b.last.v.toFixed(2)} 分）`);
    ok(J(u.seq) === want && J(a.seq) === want, `DEFUP（只开它 / 三个全开）：先升象再吃车（${u.last.v.toFixed(2)} / ${a.last.v.toFixed(2)} 分）`);
    // b. 升象只比不升多 0.168 分（象升三级 2 功，Plan A 的价钱）：底版的门槛是 0.4 分，DEFUP 没有门槛。随机数固定在中间（不加随机扰动）
    rules({ 'upgrade.cost.e': [2, 2, 5] });
    const g2 = pos([[4, 9, P('b', 'k')], [2, 9, P('b', 'e', 2)], [0, 6, P('b', 'p')], [8, 6, P('b', 'p')], [3, 0, P('r', 'k')], [0, 3, P('r', 'p')], [8, 3, P('r', 'p')], [4, 2, P('r', 'e')]], { merit: { b: 2 } });
    const c0 = BASE._t.upgradeCands(g2.S, BASE.LEVELS.mid), c1 = UP._t.upgradeCands(g2.S, UP.LEVELS.mid), mid = () => 0.5;
    ok(c0.length === 1 && J(c0.map(c => [c.at, c.gain])) === J(c1.map(c => [c.at, c.gain])) && Math.abs(c0[0].gain - 0.168) < 0.001, '两边的升级候选一样：只有二级象一个，静态多 0.168 分');
    const b2 = await think(BASE, g2.S, 20000, mid), u2 = await think(UP, g2.S, 20000, mid);
    const best = b2.last.top[0];
    ok(best[0].up && J(best[0].up) === '[2,9]' && !b2.seq.some(x => x.k === 'up') && J(b2.last.top) === J(u2.last.top), `两边搜出来一样，最好的是“升象 + 走一步”（${best[1]} 分），底版嫌它不到 0.4 分、不选（${J(b2.seq)}）`);
    ok(J(u2.seq) === J([{ k: 'up', at: [2, 9] }, best[0].k === 'mv' ? { k: 'mv', from: best[0].from, to: best[0].to } : null]), `DEFUP：选它（${J(u2.seq)}）`);
    rules(); }

  console.log('6. 经过包装加载、开关从环境变量读');
  { rules({ 'attack.e': [1, 2, 2, 2] });
    const g = pos([[3, 0, P('r', 'k')], [4, 9, P('b', 'k')], [3, 1, P('b', 'r', 2)], [4, 2, P('r', 'e', 2)], [8, 9, P('b', 'p')]], { turn: 'r' });
    const want = ALL.score(g.S, 'r'), b = BASE.score(g.S, 'r');
    const on = viaWrap({ BFAI_DEFUP: '1', BFAI_DGUARD: '1', BFAI_DEFVAL: '1' }), zero = viaWrap({ BFAI_DEFUP: '0', BFAI_DGUARD: 'false', BFAI_DEFVAL: '' }), none = viaWrap({});
    ok(want !== b && on.AI.score(g.S, 'r') === want, `三个都设成 1：和全开一样（${b.toFixed(3)} → ${want.toFixed(3)}）`);
    ok(zero.AI.score(g.S, 'r') === b && none.AI.score(g.S, 'r') === b, '设成 0 / false / 空串、或者不设：都是关');
    rules(); }

  // ---------- 7、8. bfsim 真下棋 ----------
  if (process.env.DEFUP_FAST) { console.log('7、8. 跳过（DEFUP_FAST）'); console.log('通过', pass, '项'); return; }
  const JOBS = String(process.env.DEFUP_JOBS || 2), NG = String(process.env.DEFUP_GAMES || 4), ENG = { BFSIM_ENGINE: 'tools/variants/engine_at.js', ENGINE_REV: REV };
  const RULES = ['--nodes', 'mid=20000', '--jobs', JOBS, '--set', 'beishui.on=true', '--set', 'beishui.twoPieces=false'];
  const bfsim = (env, args) => {
    const json = path.join(os.tmpdir(), `dftest_${process.pid}_${Date.now()}.json`), e = { ...process.env, ...env };
    const r = spawnSync(process.execPath, [path.join(SRC, 'tools', 'bfsim.js'), ...args, '--json', json], { cwd: SRC, env: e, encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(json)) throw new Error('bfsim 失败：' + r.stdout + r.stderr);
    const o = JSON.parse(fs.readFileSync(json, 'utf8')); fs.unlinkSync(json); o.text = r.stdout;
    return o;
  };
  console.log(`7. 开关全关：bfsim 6 局和底版逐局相同（--nodes mid=20000，新规则，引擎 ${REV}）`);
  { const t0 = Date.now(), args = ['--games', '6', '--seed', '1000', '--quiet', ...RULES];
    const base = bfsim(ENG, [...args, '--ai', 'git:' + AIREV]), vari = bfsim(ENG, [...args, '--ai', 'tools/variants/bfai_defup.js']);
    const sig = r => J([r.winner, r.reason, r.rounds, r.plies, r.act, r.kills, r.up]), all = r => J({ ...r, ms: 0, msMax: 0 });
    const mV = new Map(vari.results.map(r => [r.seed, r]));
    ok(base.results.length === 6 && vari.results.length === 6 && !base.errors.length && !vari.errors.length, '两边各下完 6 局、没有出错');
    ok(base.results.every(r => mV.has(r.seed) && sig(mV.get(r.seed)) === sig(r)), `逐局相同 [winner, reason, rounds, plies, act, kills, up]（种子 1000～1005：${base.results.map(r => (r.winner || '-') + r.rounds).join(' ')}）（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
    ok(base.results.every(r => all(mV.get(r.seed)) === all(r)), '除了用时，每局记下的所有东西（搜索节点数、局面分采样、军功来源……）也都一样'); }
  console.log(`8. 三个开关全开 + 象二级攻击 2：各下 ${NG} 局，比底版电脑多升士象`);
  { const t0 = Date.now(), args = ['--games', NG, '--seed', '3000', ...RULES, '--set', 'attack.e=[1,2,2,2]'];
    const base = bfsim(ENG, [...args, '--ai', 'git:' + AIREV]), du = bfsim({ ...ENG, BFAI_DEFUP: '1', BFAI_DGUARD: '1', BFAI_DEFVAL: '1' }, [...args, '--ai', 'tools/variants/bfai_defup.js']);
    const ups = (o, re) => o.results.reduce((t, r) => t + ['r', 'b'].reduce((u, s) => u + Object.entries(r.up[s]).filter(([k]) => re.test(k)).reduce((x, [, v]) => x + v, 0), 0), 0);
    const line = o => ['e2', 'e3', 'e4', 'a2', 'a3', 'a4'].map(k => `${k} ${ups(o, new RegExp('^' + k + '$'))}`).join('，');
    ok(du.results.length === +NG && !du.errors.length && du.results.every(r => r.reason) && J(du.overrides.set['attack.e']) === '[1,2,2,2]', `全开：${NG} 局下完、没有出错、--set 传到了（${du.results.map(r => (r.winner || '-') + ':' + r.reason + ':' + r.rounds).join(' ')}）`);
    const nb = ups(base, /^[ae][234]$/), nd = ups(du, /^[ae][234]$/);
    ok(!base.errors.length && nd > nb, `手动升士象（两方合计）：底版电脑 ${nb} 次（${line(base)}）→ 全开 ${nd} 次（${line(du)}）（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
    const rows = o => o.text.split('\n').filter(l => /^\s+[ae][234]\*?\s/.test(l)).join('\n');
    console.log('    bfsim 的升级统计（汉 | 楚：用过的局占比 / 每局平均）\n    底版电脑：\n' + rows(base) + '\n    全开：\n' + rows(du)); }
  console.log('通过', pass, '项');
})().catch(e => { console.error(e); process.exit(1); });
