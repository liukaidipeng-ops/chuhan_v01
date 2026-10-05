// engine_han.js 自测：默认关时和底版一样；reviveLevel、startBonus、reviveCap、reviveUp、reviveHalf 生效
'use strict';
const assert = require('assert'), path = require('path');
global.XQ = require(path.join(__dirname, '..', '..', 'src', 'rules.js'));
const BF = global.BF = require(require('./engine_han.js').enginePath());
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
const B = BF.CFG;
ok(B.generalArts.xiaohe.reviveLevel === 1 && B.generalArts.xiaohe.reviveCap === false && B.generalArts.xiaohe.reviveUp === false && B.generalArts.xiaohe.reviveHalf === false && B.merit.startBonus.r === 0 && B.merit.startBonus.b === 0, '默认：召回一级、不封顶、不能当场升级、没有开局加成');
{ const g = new BF.Game(); ok(g.merit.r === B.merit.start && g.merit.b === B.merit.start, '默认开局军功两边一样'); }
B.merit.startBonus.r = 1; { const g = new BF.Game(); ok(g.merit.r === B.merit.start + 1 && g.merit.b === B.merit.start, 'startBonus.r=1：汉开局多 1 点'); } B.merit.startBonus.r = 0;
// 召回：汉车 id 找开局位置空着、车马炮少于楚且最多 3 枚（背水开着时的条件）
const setupRevive = lvl => {
  B.beishui.on = true; B.generalArts.xiaohe.reviveLevel = lvl;
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
B.generalArts.xiaohe.reviveLevel = 1; B.beishui.on = true;

// 召回封顶（reviveCap，用户 2026-10-05：最多召回二级；死时一级回来还是一级，死时二三四级回来都是二级）
//   阵亡名单里的 lv = 死时的等级；没有 lv 的老记录按一级算
const reviveAs = (t, deadLv, lvl, cap) => {
  B.beishui.on = true; B.generalArts.xiaohe.reviveLevel = lvl; B.generalArts.xiaohe.reviveCap = cap;
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
  B.beishui.on = true; B.generalArts.xiaohe.reviveLevel = 2; B.generalArts.xiaohe.reviveCap = true;
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
B.generalArts.xiaohe.reviveLevel = 1; B.generalArts.xiaohe.reviveCap = false; B.beishui.on = true;

// 召回后当回合花军功升一级（reviveUp，第六轮 r6_help）：{ k:'art', id, up:true }
{
  const cost0 = B.upgrade.cost.r.slice(); B.upgrade.cost.r = [10, 12, 20];   // 第六轮用的车价
  const mk = (deadLv, merit, opt = {}) => {
    B.beishui.on = true; B.generalArts.xiaohe.reviveLevel = 2; B.generalArts.xiaohe.reviveCap = true; B.generalArts.xiaohe.reviveUp = opt.up !== false;
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
  B.upgrade.cost.r = cost0; B.generalArts.xiaohe.reviveUp = false;
}
B.generalArts.xiaohe.reviveLevel = 1; B.generalArts.xiaohe.reviveCap = false; B.beishui.on = true;

// 召回的子第一次升级半价（reviveHalf，用户 10/5 r6_up）：基础价减半（向上取整），甲片照常抵价；升过一次恢复原价
{
  const cost0 = B.upgrade.cost.r.slice(); B.upgrade.cost.r = [10, 12, 20];
  const mk = (deadLv, merit, half, up) => {
    B.beishui.on = true; B.generalArts.xiaohe.reviveLevel = 2; B.generalArts.xiaohe.reviveCap = true; B.generalArts.xiaohe.reviveUp = !!up; B.generalArts.xiaohe.reviveHalf = !!half;
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
  B.upgrade.cost.r = cost0; B.generalArts.xiaohe.reviveUp = false; B.generalArts.xiaohe.reviveHalf = false;
}
B.generalArts.xiaohe.reviveLevel = 1; B.generalArts.xiaohe.reviveCap = false; B.beishui.on = true;
console.log('通过', pass, '项');
