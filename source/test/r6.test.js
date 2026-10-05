// 试行规则 r6（CFG.r6，默认关）：车马炮兵攻击按等级、车血 1/2/3/3、车价 10/12/20、召回最多二级、召回当回合可升级、召回的子第一次升级半价
//   召回那几组照 Balance（原 Code）的变体自测 tools/variants/test_han.js 改写：那边的 generalArts.xiaohe.reviveLevel / reviveCap / reviveUp / reviveHalf 就是这边 r6 里的同名项
'use strict';
const assert = require('assert');
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };
const B = BF.CFG, R = B.r6, DEF = JSON.parse(JSON.stringify(R));
const reset = () => { for (const k of Object.keys(R)) delete R[k]; Object.assign(R, JSON.parse(JSON.stringify(DEF))); };
ok(R.on === false, '默认关');
ok(JSON.stringify(R.attack) === JSON.stringify({ r: [1, 1, 2, 2], p: [1, 1, 2, 2], n: [1, 1, 2], c: [1, 1, 2] }) && JSON.stringify(R.hpByType) === '{"r":[1,2,3,3]}' && JSON.stringify(R.cost) === '{"r":[10,12,20]}' && R.reviveLevel === 2 && R.reviveCap === true && R.reviveUp === true && R.reviveHalf === true, '开关里的五项数值');

// ---------- 开关关着：一切照旧 ----------
{
  const L = (t, lv) => BF.levelInfo(t, 'r', lv);
  ok(L('r', 3).atk === 1 && L('r', 4).atk === 1 && L('r', 4).hp === 4 && L('p', 4).atk === 1 && L('n', 3).atk === 1 && L('c', 3).atk === 1 && L('a', 2).atk === 2, '关：车马炮兵攻击都是 1，车四级 4 血，士二级起攻击 2');
  const g = new BF.Game(); const rook = g.at(0, 0);
  ok(g.baseCost(rook) === 6 && g.upgradeCost(rook) === 6, '关：车升二级 6 点');
  g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'r' && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; } T.dead.r = [{ id: 0, t: 'r', s: 'r', lv: 3 }]; T.merit.r = 30; T.turn = 'r'; });
  const o = g.reviveOptions();
  ok(o.length === 1 && o[0].lv === 1 && o[0].upCost === undefined, '关：召回选项回来一级、没有当场升级');
  ok(!BF.attempt(g.S, { k: 'art', id: 0, up: true }), '关：召回 + 升级不合法');
  ok(!BF.ai.expand(g.S).some(k => k.a.k === 'art' && k.a.up) && !BF.ai.gen(g.S, false).some(k => k.a.k === 'art' && k.a.up), '关：电脑候选里没有召回 + 升级');
  g.apply({ k: 'art', id: 0 }); const p = g.at(0, 0);
  ok(p && p.lv === 1 && p.hp === 1 && !p.rh && BF.ai.upCost(p) === 6, '关：死时三级的车召回来还是一级 1 血、没有半价记号、升级 6 点');
}

// ---------- 开关开着：攻击、血、车价 ----------
R.on = true;
{
  const L = (t, lv, s = 'r') => BF.levelInfo(t, s, lv);
  ok([1, 2, 3, 4].map(l => L('r', l).atk).join() === '1,1,2,2' && [1, 2, 3, 4].map(l => L('r', l).hp).join() === '1,2,3,3', '开：车攻击 1/1/2/2、血 1/2/3/3');
  ok([1, 2, 3, 4].map(l => L('p', l).atk).join() === '1,1,2,2' && [1, 2, 3, 4].map(l => L('p', l).hp).join() === '1,2,3,3', '开：兵攻击 1/1/2/2、血不变');
  ok([1, 2, 3].map(l => L('n', l).atk).join() === '1,1,2' && [1, 2, 3].map(l => L('c', l).atk).join() === '1,1,2' && [1, 2, 3].map(l => L('n', l).hp).join() === '1,2,3', '开：马、炮攻击 1/1/2');
  ok([1, 2, 3, 4].map(l => L('a', l).atk).join() === '1,2,2,2' && [1, 2, 3, 4].map(l => L('e', l).atk).join() === '1,1,1,1' && [1, 2, 3, 4].map(l => L('e', l, 'b').atk).join() === '1,1,1,1' && L('k', 1).atk === 1, '开：士、相 / 象、帅将攻击不变');
  ok(BF.hpOf('r', 4) === 3 && BF.hpOf('r', 3) === 3 && BF.hpOf('a', 4) === 3, '开：BF.hpOf 也是新值');
  const g = new BF.Game(); const rook = g.at(0, 0);
  ok(g.baseCost(rook) === 10, '开：车一升二 10');
  rook.lv = 2; ok(g.baseCost(rook) === 12 && g.upgradeCost(rook) === 12, '开：车二升三 12'); rook.lv = 3; ok(g.baseCost(rook) === 20, '开：车三升四 20'); rook.lv = 1;
  rook.xp = 3; ok(g.upgradeCost(rook) === 7, '开：甲片照常抵价 10 − 3 = 7'); rook.xp = 0;
  ok(g.baseCost(g.at(0, 3)) === B.upgrade.cost.p[0] && g.baseCost(g.at(1, 0)) === B.upgrade.cost.n[0], '开：别的兵种价钱不变');
  // 三级车一下打死 2 血的子；二级车打不死
  const fight = lv => { const h = new BF.Game(); h.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; }
      T.board[2][0] = { s: 'r', t: 'r', id: 0, lv, hp: BF.hpOf('r', lv), cd: 9, jm: 0, xp: 0, kills: 0 }; T.board[6][0] = { s: 'b', t: 'n', id: 24, lv: 2, hp: 2, cd: 0, jm: 0, xp: 0, kills: 0 }; T.turn = 'r'; });
    const info = h.apply({ k: 'mv', from: [0, 2], to: [0, 6] }); return { info, tgt: h.at(0, 6), src: h.at(0, 2) }; };
  { const x = fight(3); ok(x.info && x.tgt && x.tgt.s === 'r' && x.tgt.id === 0, '开：三级车（攻击 2）一下吃掉 2 血的马'); }
  { const x = fight(2); ok(x.info && x.tgt && x.tgt.s === 'b' && x.tgt.hp === 1 && x.src && x.src.id === 0, '开：二级车（攻击 1）打掉 1 血、退回原位'); }
  // 召回选项带上回来几级、当场升级要几点
  g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'r' && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; } T.dead.r = [{ id: 0, t: 'r', s: 'r', lv: 3 }, { id: 11, t: 'p', s: 'r', lv: 1 }]; T.merit.r = 5; T.turn = 'r'; });
  const o = g.reviveOptions(), a = o.find(x => x.id === 0), b = o.find(x => x.id === 11);
  ok(a && a.lv === 2 && a.upLv === 3 && a.upCost === 6 && a.canUp === false, '开：死时三级的车——回来二级，当场升三级半价 6，军功 5 不够');
  ok(b && b.lv === 1 && b.upLv === 2 && b.upCost === Math.ceil(B.upgrade.cost.p[0] / 2) && b.canUp === true, '开：死时一级的兵——回来一级，当场升二级半价 2，升得起');
}
reset();

// ---------- 以下照 Balance 的自测（各项可以单独开关） ----------
//   那份自测从“四项全关”开始、一项一项打开；这里先把 r6 里的四项拨到同样的起点
R.on = true; R.reviveLevel = 1; R.reviveCap = false; R.reviveUp = false; R.reviveHalf = false;
// 召回：汉车 id 找开局位置空着、车马炮少于楚且最多 3 枚（背水开着时的条件）
const setupRevive = lvl => {
  B.beishui.on = true; R.on = true; R.reviveLevel = lvl;
  const g = new BF.Game();
  g.setup(T => { const keep = new Set(); for (const row of T.board) for (const p of row) if (p && (p.t === 'k' || (p.s === 'b'))) keep.add(p.id);
    let rookId = null; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'r' && p.t === 'r' && rookId == null) rookId = p.id; if (p && !keep.has(p.id)) T.board[r][f] = null; }
    T.dead.r = [{ id: rookId, t: 'r', s: 'r' }]; T.turn = 'r'; });
  return g;
};
for (const lvl of [1, 2]) {
  const g = setupRevive(lvl); const opts = g.reviveOptions(); ok(opts.length === 1, `reviveLevel=${lvl}：有一个召回选项`);
  const info = g.apply({ k: 'art', id: opts[0].id }); ok(!!info, `reviveLevel=${lvl}：召回成功`);
  let p = null; for (const row of g.S.board) for (const q of row) if (q && q.id === opts[0].id) p = q;
  ok(p && p.lv === lvl && p.hp === BF.hpOf('r', lvl), `reviveLevel=${lvl}：召回的车 ${p && p.lv} 级 ${p && p.hp} 血`);
}
R.reviveLevel = 1; B.beishui.on = true;

// 召回封顶（reviveCap，用户 2026-10-05：最多召回二级；死时一级回来还是一级，死时二三四级回来都是二级）
//   阵亡名单里的 lv = 死时的等级；没有 lv 的老记录按一级算
const reviveAs = (t, deadLv, lvl, cap) => {
  B.beishui.on = true; R.on = true; R.reviveLevel = lvl; R.reviveCap = cap;
  const g = new BF.Game();
  let id = null;
  g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (!p || p.s !== 'r' || p.t === 'k') continue; if (p.t === t && id == null) id = p.id; T.board[r][f] = null; }
    T.dead.r = [deadLv == null ? { id, t, s: 'r' } : { id, t, s: 'r', lv: deadLv }]; T.turn = 'r'; });
  const opts = g.reviveOptions();
  const info = opts.length === 1 && g.apply({ k: 'art', id: opts[0].id });
  let p = null; for (const row of g.S.board) for (const q of row) if (q && q.id === id) p = q;
  return info && p ? { lv: p.lv, hp: p.hp } : null;
};
for (const [t, dl, lvl, cap, want] of [
  ['r', 1, 2, true, 1], ['r', 2, 2, true, 2], ['r', 3, 2, true, 2], ['r', 4, 2, true, 2],   // 车：死时 1 → 1，2/3/4 → 2
  ['n', 1, 2, true, 1], ['n', 3, 2, true, 2], ['c', 2, 2, true, 2], ['p', 4, 2, true, 2],   // 马（最高三级）、炮、兵
  ['r', null, 2, true, 1],                                                                  // 老记录没有 lv：按一级
  ['r', 4, 1, true, 1],                                                                     // reviveLevel 1 + 封顶 = 原规则
  ['r', 1, 2, false, 2], ['r', 4, 2, false, 2],                                             // 不封顶 = 第五轮的“召回二级”
]) {
  const got = reviveAs(t, dl, lvl, cap);
  ok(got && got.lv === want && got.hp === BF.hpOf(t, want), `reviveLevel=${lvl} reviveCap=${cap}：${t} 死时 ${dl == null ? '（没记）' : dl + ' 级'} → 回来 ${got && got.lv} 级 ${got && got.hp} 血（应 ${want} 级）`);
}
// 引擎吃子时把死时的等级记进阵亡名单：楚车吃掉一枚三级、只剩 1 血的汉车（编号 0 是汉左车，23 是楚左车，13 是汉中兵，挡在两王中间）
{
  B.beishui.on = true; R.on = true; R.reviveLevel = 2; R.reviveCap = true;
  const g = new BF.Game();
  g.setup(T => {
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; }
    T.board[4][0] = { s: 'r', t: 'r', id: 0, lv: 3, hp: 1, cd: 0, jm: 0, xp: 0, kills: 0 };
    T.board[7][0] = { s: 'b', t: 'r', id: 23, lv: 1, hp: 1, cd: 0, jm: 0, xp: 0, kills: 0 };
    T.turn = 'b';
  });
  const info = g.apply({ k: 'mv', from: [0, 7], to: [0, 4] });
  const d = g.S.dead.r.find(x => x.id === 0);
  ok(!!info && d && d.lv === 3 && d.t === 'r', `引擎吃子：阵亡名单记下死时 ${d && d.lv} 级（应 3 级）`);
  // 接着让汉方满足召回条件（汉车马炮 0 < 楚 1）、轮到汉：召回回来是二级
  const opts = g.reviveOptions();
  const ok2 = opts.length === 1 && g.apply({ k: 'art', id: 0 });
  let p = null; for (const row of g.S.board) for (const q of row) if (q && q.id === 0) p = q;
  ok(ok2 && p && p.lv === 2 && p.hp === BF.hpOf('r', 2), `吃掉三级车之后召回：回来 ${p && p.lv} 级 ${p && p.hp} 血（应 2 级）`);
}
R.reviveLevel = 1; R.reviveCap = false; B.beishui.on = true;

// 召回后当回合花军功升一级（reviveUp，第六轮 r6_help）：{ k:'art', id, up:true }
{
  R.cost.r = [10, 12, 20];   // 第六轮用的车价
  const mk = (deadLv, merit, opt = {}) => {
    B.beishui.on = true; R.on = true; R.reviveLevel = 2; R.reviveCap = true; R.reviveUp = opt.up !== false;
    const g = new BF.Game();
    g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'r' && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; }
      T.dead.r = [{ id: 0, t: 'r', s: 'r', lv: deadLv }]; T.merit.r = merit; T.turn = 'r'; });
    return g;
  };
  const rook = g => { for (const row of g.S.board) for (const q of row) if (q && q.id === 0) return q; return null; };
  const hasUp = list => list.some(k => (k.a || k).k === 'art' && (k.a || k).up);
  { const g = mk(1, 30, { up: false }); ok(!g.apply({ k: 'art', id: 0, up: true }), '开关关着：召回 + 升级不合法'); ok(!hasUp(BF.ai.expand(g.S)) && !hasUp(BF.ai.gen(g.S, false)), '开关关着：电脑候选里没有召回 + 升级'); }
  { const g = mk(1, 30); ok(hasUp(BF.ai.expand(g.S)) && hasUp(BF.ai.gen(g.S, false)), '开关开着：电脑候选里有召回 + 升级');
    const info = g.apply({ k: 'art', id: 0, up: true }), p = rook(g), rv = info && info.ev.find(e => e.e === 'revive'), up = info && info.ev.find(e => e.e === 'reviveUp');
    ok(!!info && p && p.lv === 2 && p.hp === BF.hpOf('r', 2) && g.S.merit.r === 30 - 10, `死时一级的车：召回一级、当场升二级（${p && p.lv} 级 ${p && p.hp} 血），扣 10 军功（剩 ${g.S.merit.r}）`);
    ok(rv && rv.lv === 1 && up && up.lv === 2 && up.cost === 10, '事件：召回 lv 1（升级前）、reviveUp lv 2 花 10');
    ok(g.S.turn === 'b' && g.S.upgraded === false, '召回 + 升级占这一回合：轮到楚，升级标记清掉'); }
  { const g = mk(2, 30); const info = g.apply({ k: 'art', id: 0, up: true }), p = rook(g);
    ok(!!info && p && p.lv === 3 && p.hp === BF.hpOf('r', 3) && g.S.merit.r === 30 - 12, `死时二级的车：召回二级、当场升三级（${p && p.lv} 级），扣 12 军功`); }
  { const g = mk(1, 9); ok(!g.apply({ k: 'art', id: 0, up: true }), '军功不够（9 < 10）：召回 + 升级不合法'); ok(!!g.apply({ k: 'art', id: 0 }), '军功不够时照样可以只召回'); }
  { const g = mk(1, 30); const up1 = g.apply({ k: 'up', at: [4, 3] });
    ok(!!up1 && !g.apply({ k: 'art', id: 0, up: true }), '这回合已经升过别的子：召回 + 升级不合法（每回合最多升一次）');
    ok(!hasUp(BF.ai.gen(g.S, false)), '升过级之后电脑的 gen 候选里也没有召回 + 升级');
    ok(!!g.apply({ k: 'art', id: 0 }), '升过别的子之后照样可以只召回'); }
  R.reviveUp = false;
}
R.reviveLevel = 1; R.reviveCap = false; B.beishui.on = true;

// 召回的子第一次升级半价（reviveHalf，用户 10/5 r6_up）：基础价减半（向上取整），甲片照常抵价；升过一次恢复原价
{
  R.cost.r = [10, 12, 20];
  const mk = (deadLv, merit, half, up) => {
    B.beishui.on = true; R.on = true; R.reviveLevel = 2; R.reviveCap = true; R.reviveUp = !!up; R.reviveHalf = !!half;
    const g = new BF.Game();
    g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'r' && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; }
      T.dead.r = [{ id: 0, t: 'r', s: 'r', lv: deadLv }]; T.merit.r = merit; T.turn = 'r'; });
    return g;
  };
  const rook = g => { for (const row of g.S.board) for (const q of row) if (q && q.id === 0) return q; return null; };
  const passB = g => { const mv = BF.ai.expand(g.S).find(k => k.a.k === 'mv'); return !!(mv && g.apply(mv.a)); };   // 楚方随便走一步，轮回汉方
  { const g = mk(1, 30, false); g.apply({ k: 'art', id: 0 }); ok(BF.ai.upCost(rook(g)) === 10 && !rook(g).rh, '开关关着：召回的一级车升二级照原价 10'); }
  { const g = mk(1, 30, true); g.apply({ k: 'art', id: 0 }); const p = rook(g);
    ok(p.rh === 1 && BF.ai.upCost(p) === 5, `召回一级车：第一次升级半价 ${BF.ai.upCost(p)}（原价 10）`);
    ok(BF.ai.upCost(BF.cloneState(g.S).board[0][0]) === 5, '复制局面（电脑搜索用）时半价记号跟着走');
    ok(passB(g) && g.S.turn === 'r', '楚走一步，轮回汉方');
    const m0 = g.S.merit.r, info = g.apply({ k: 'up', at: [0, 0] }), q = rook(g);
    ok(!!info && info.cost === 5 && g.S.merit.r === m0 - 5 && q.lv === 2 && !q.rh, `下一回合再升：花 ${info && info.cost}，升到 ${q.lv} 级，记号清掉`);
    ok(BF.ai.upCost(q) === 12, '升过一次之后恢复原价（二升三 12）'); }
  { const g = mk(2, 30, true); g.apply({ k: 'art', id: 0 }); ok(BF.ai.upCost(rook(g)) === 6, '召回二级车：第一次升级（二升三）半价 6（原价 12）'); }
  { const g = mk(1, 5, true, true); const info = g.apply({ k: 'art', id: 0, up: true }), p = rook(g), up = info && info.ev.find(e => e.e === 'reviveUp');
    ok(!!info && p.lv === 2 && !p.rh && g.S.merit.r === 0 && up && up.cost === 5, '和当场升级一起开：召回 + 当场升级只花 5（军功正好 5 也够）'); }
  { const g = mk(1, 4, true, true); ok(!g.apply({ k: 'art', id: 0, up: true }), '军功 4 < 5：当场半价升级也不够'); }
  // 甲片：召回的车吃了 3 个子（甲片 3）→ 半价 5 − 3 = 2；吃满 5 个直接自动晋升（门槛也减半）
  { const g = mk(1, 30, true); g.apply({ k: 'art', id: 0 }); const p = rook(g); p.xp = 3; ok(BF.ai.upCost(p) === 2, '半价再减甲片：5 − 3 = 2'); }
  { const g = mk(1, 30, true); g.setup(T => { T.board[2][0] = { s: 'b', t: 'p', id: 16, lv: 1, hp: 1, cd: 0, jm: 0, xp: 0, kills: 0 }; });
    g.apply({ k: 'art', id: 0 }); rook(g).xp = 4;
    const mv = BF.ai.expand(g.S).find(k => k.a.k === 'mv' && !(k.a.from[0] === 0 && k.a.from[1] === 2)); g.apply(mv.a);
    const info = g.apply({ k: 'mv', from: [0, 0], to: [0, 2] }), q = rook(g), au = info && info.ev.find(e => e.e === 'autoup');
    ok(!!info && au && q.lv === 2 && !q.rh && q.xp === 0, `甲片自动晋升的门槛也减半：吃到第 5 个就自动升二级（${q && q.lv} 级）`); }
  // 单数价向上取整：召回的一级兵（升二级原价 3）第一次升级 2
  { B.beishui.on = true; R.on = true; R.reviveLevel = 2; R.reviveCap = true; R.reviveHalf = true;
    const g = new BF.Game(); g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'r' && p.t !== 'k' && p.id !== 13) T.board[r][f] = null; }
      T.dead.r = [{ id: 11, t: 'p', s: 'r', lv: 1 }]; T.merit.r = 30; T.turn = 'r'; });
    g.apply({ k: 'art', id: 11 }); let p = null; for (const row of g.S.board) for (const q of row) if (q && q.id === 11) p = q;
    ok(p && BF.ai.upCost(p) === Math.ceil(B.upgrade.cost.p[0] / 2), `单数价向上取整：兵原价 ${B.upgrade.cost.p[0]} → 半价 ${p && BF.ai.upCost(p)}`); }
  R.reviveUp = false; R.reviveHalf = false;
}
R.reviveLevel = 1; R.reviveCap = false; B.beishui.on = true;
reset(); B.beishui.on = true;
console.log('R6 OK', pass, '项');
