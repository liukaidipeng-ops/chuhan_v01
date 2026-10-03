// 楚汉·兵法 规则测试
global.XQ = require('../src/rules.js');
const BF = require('../src/bingfa.js');
const assert = require('assert');
let id = 200;
const P = (s, t, lv = 1, extra = {}) => ({ s, t, id: id++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...extra });
// 摆局面：pieces = [[f, r, piece]...]
function setup(pieces, opt = {}) {
  const g = new BF.Game();
  g.setup(T => {
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) T.board[r][f] = null;
    for (const [f, r, p] of pieces) T.board[r][f] = p;
    T.turn = opt.turn || 'r';
    if (opt.merit) T.merit = { ...opt.merit };
    if (opt.cnt) T.cnt = { ...opt.cnt };
    if (opt.fx) T.fx = { ...T.fx, ...opt.fx };
  });
  return g;
}
const K = s => P(s, 'k');
const ok = (x, msg) => { assert(x, msg); };

// 1. 开局
{
  const g = new BF.Game();
  ok(g.merit.r === 3 && g.merit.b === 3, '开局军功 3');
  ok(g.board.flat().filter(Boolean).every(p => p.lv === 1 && p.hp === 1), '全部一级 1 血');
  console.log('开局 OK');
}
// 2. 普通吃子与军功
{
  const g = new BF.Game();
  const i = g.apply({ k: 'mv', from: [1, 2], to: [1, 9] });
  ok(i && i.cap && i.cap.t === 'n', '炮打马');
  ok(g.merit.r === 3 + 3 && g.merit.b === 3 + 1, '击杀马 +3，被吃方 +1 ' + JSON.stringify(g.merit));
  console.log('吃子军功 OK');
}
// 3. 升级
{
  const g = new BF.Game();
  ok(g.canUpgrade(0, 3), '兵可升（3 军功）');
  ok(!g.canUpgrade(4, 0), '帅不能升');
  const u = g.apply({ k: 'up', at: [0, 3] });
  ok(u && g.at(0, 3).lv === 2 && g.at(0, 3).hp === 2 && g.merit.r === 0, '升二级回满 2 血、扣 3 军功');
  ok(!g.apply({ k: 'up', at: [2, 3] }), '每次行动最多升一次');
  g.apply({ k: 'mv', from: [2, 3], to: [2, 4] });
  g.apply({ k: 'mv', from: [0, 6], to: [0, 5] });
  ok(!g.skillTargets(0, 3).length, '二级只长血、没有技能');
  // 三级解锁技能，刚升三级当次不能用
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 3, P('r', 'p', 2)], [8, 3, P('r', 'p')], [5, 9, P('b', 'a')]], { merit: { r: 5, b: 3 } });
  ok(g2.upgradeCost(g2.at(0, 3)) === 5 && g2.apply({ k: 'up', at: [0, 3] }) && g2.at(0, 3).lv === 3 && g2.at(0, 3).hp === 3, '升三级 5 功、3 血');
  ok(!g2.skillTargets(0, 3).length, '刚升三级当次不能用技能');
  g2.apply({ k: 'mv', from: [8, 3], to: [8, 4] });
  g2.apply({ k: 'mv', from: [5, 9], to: [4, 8] });
  ok(g2.skillTargets(0, 3).length === 1, '下一次行动起可用拒马');
  // 只有车能升四级（20 功、4 血）
  const g3 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 3)], [1, 0, P('r', 'n', 3)]], { merit: { r: 25, b: 3 } });
  ok(g3.upgradeCost(g3.at(1, 0)) === null && !g3.canUpgrade(1, 0), '马最高三级');
  ok(g3.upgradeCost(g3.at(0, 0)) === 20 && g3.apply({ k: 'up', at: [0, 0] }) && g3.at(0, 0).lv === 4 && g3.at(0, 0).hp === 4 && g3.merit.r === 5, '车升四级 20 功、4 血');
  ok(g3.upgradeCost(g3.at(0, 0)) === null, '车最高四级');
  // 士象相降价
  const g4 = new BF.Game();
  ok(g4.upgradeCost(g4.at(3, 0)) === 2 && g4.upgradeCost(g4.at(2, 0)) === 2, '士、相升二级 2 功');
  console.log('升级 OK');
}
// 4. 攻击：目标 2 血只扣 1，攻方退回
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r')], [0, 5, P('b', 'p', 2)]]);
  const i = g.apply({ k: 'mv', from: [0, 0], to: [0, 5] });
  ok(i && g.at(0, 0) && g.at(0, 0).t === 'r' && g.at(0, 5).hp === 1, '攻击后攻方在原位、目标剩 1 血');
  ok(g.merit.r === 3, '只扣血不给军功');
  g.apply({ k: 'mv', from: [3, 9], to: [3, 8] });
  g.apply({ k: 'mv', from: [0, 0], to: [0, 5] });
  ok(g.at(0, 5).t === 'r' && g.merit.r === 3 + 1 + 1, '再打就吃掉占位（兵 +1、二级 +1）' + g.merit.r);
  console.log('攻击 OK');
}
// 5. 打不死将军的子不算解将
{
  // 黑车（2 血）将军红帅，红车只能攻击它 → 不合法
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [4, 7, P('b', 'r', 2)], [0, 7, P('r', 'r')], [8, 1, P('r', 'p')]]);
  ok(g.inCheck('r'), '红被将军');
  ok(!g.isLegal({ from: [0, 7], to: [4, 7] }), '攻击将军的子不算解将');
  console.log('解将判定 OK');
}
// 5b. 士二级起攻击 2：一刀砍死 2 血的子，可以硬解 2 血单位的将军
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [4, 1, P('b', 'r', 2)], [3, 0, P('r', 'a', 2)], [8, 3, P('r', 'p')]]);
  ok(g.inCheck('r'), '2 血黑车贴脸将军');
  ok(g.atkOf(g.at(3, 0)) === 2 && g.atkOf(P('r', 'a', 1)) === 1, '二级士攻击 2，一级士攻击 1');
  ok(g.isLegal({ from: [3, 0], to: [4, 1] }), '二级士一刀砍死 2 血车解将');
  const i = g.apply({ k: 'mv', from: [3, 0], to: [4, 1] });
  ok(i && g.at(4, 1).t === 'a' && g.at(4, 1).s === 'r' && g.at(4, 1).xp === 1, '士吃车占位、攒一片甲');
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [4, 1, P('b', 'r', 3)], [3, 0, P('r', 'a', 2)], [8, 3, P('r', 'p')]]);
  ok(!g2.isLegal({ from: [3, 0], to: [4, 1] }), '3 血车只被砍掉 2 点、将军仍在，不合法');
  console.log('士攻击 2 OK');
}
// 5c. 击杀攒甲片，抵下次升级价，升级后清零，最少 1 功
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 3, P('r', 'r')], [0, 6, P('b', 'p')], [0, 7, P('b', 'p')], [0, 8, P('b', 'p')], [8, 9, P('b', 'r')]], { merit: { r: 3, b: 3 } });
  g.apply({ k: 'mv', from: [0, 3], to: [0, 6] });
  ok(g.at(0, 6).xp === 1 && g.upgradeCost(g.at(0, 6)) === 5, '车杀一个：升二级 6→5 功');
  g.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  g.apply({ k: 'mv', from: [0, 6], to: [0, 7] });
  g.apply({ k: 'mv', from: [8, 8], to: [8, 9] });
  ok(g.at(0, 7).xp === 2 && g.upgradeCost(g.at(0, 7)) === 4, '杀两个：4 功');
  const m = g.merit.r;
  g.apply({ k: 'up', at: [0, 7] });
  ok(g.at(0, 7).lv === 2 && g.at(0, 7).xp === 0 && g.merit.r === m - 4, '升级用掉甲片');
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 3, P('r', 'p', 1, { xp: 9 })]]);
  ok(g2.upgradeCost(g2.at(0, 3)) === 1, '最少 1 功');
  console.log('击杀抵扣 OK');
}
// 6. 拒马：不占行动，架完还要再走一步，架拒马的兵本回合不能动
{
  const pawn = P('b', 'p', 3);
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 4, P('r', 'r')], [0, 6, pawn], [8, 0, P('r', 'r', 2)], [5, 9, P('b', 'a')]], { turn: 'b' });
  ok(g.apply({ k: 'sk', at: [0, 6] }), '黑卒拒马');
  ok(g.turn === 'b' && g.freeUsed, '拒马不换手，还要再走一步');
  ok(!g.legalFrom(0, 6).length, '架拒马的卒本回合不能动');
  ok(!g.skillTargets(0, 6).length && !g.apply({ k: 'pass' }), '不能再用技能或停着');
  ok(g.apply({ k: 'mv', from: [5, 9], to: [4, 8] }) && g.turn === 'r', '再走一步后换手');
  const i = g.apply({ k: 'mv', from: [0, 4], to: [0, 6] });
  ok(i && !g.at(0, 4) && g.at(0, 6).hp === 3, '一级车撞拒马直接阵亡，卒无损');
  ok(i.kills.some(k => k.t === 'r') && g.at(0, 6).xp === 1, '车阵亡记为卒的击杀');
  ok(g.history.length === 2 && g.entries.length === 3, '拒马不算一步棋谱');
  g.undoActions(1);
  ok(g.entries.length === 2 && g.turn === 'r', '悔一步只退红方');
  g.undoActions(1);
  ok(g.entries.length === 0 && g.turn === 'b', '再悔一步连拒马一起退回');
  console.log('拒马 OK');
}
{
  // 二级攻方撞拒马：扣 1 后继续结算
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 4, P('r', 'r', 2)], [0, 6, { ...P('b', 'p', 3), hp: 1 }], [5, 9, P('b', 'a')]], { turn: 'b' });
  ok(g.apply({ k: 'sk', at: [0, 6] }), '1 血的三级卒也能拒马');
  g.apply({ k: 'mv', from: [5, 9], to: [4, 8] });
  const i = g.apply({ k: 'mv', from: [0, 4], to: [0, 6] });
  ok(i && g.at(0, 6).t === 'r' && g.at(0, 6).hp === 1, '二级车扣 1 血后吃掉卒');
  console.log('拒马反伤后继续 OK');
}
{
  // 被将军时也能架拒马，但后面那一步必须应将；没有别的子能走就不能架
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [0, 6, P('b', 'p', 3)], [4, 5, P('r', 'r')]], { turn: 'b' });
  ok(g.inCheck('b'), '黑将被将');
  ok(g.skillTargets(0, 6).length === 1, '被将时可架拒马（之后将要走开）');
  g.apply({ k: 'sk', at: [0, 6] });
  ok(g.legalFrom(4, 9).length > 0 && !g.legalFrom(0, 6).length, '之后只能走将应将');
  console.log('拒马应将 OK');
}
// 7. 冲阵
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 3)], [0, 5, P('b', 'p')], [0, 6, P('b', 'n')], [0, 8, P('b', 'c', 2)]]);
  const tg = g.skillTargets(0, 0);
  ok(tg.length === 1 && tg[0].to[1] === 5, '冲阵只能对敌子发动');
  const i = g.apply({ k: 'sk', at: [0, 0], to: [0, 5] });
  ok(i && g.at(0, 6).t === 'r' && !g.at(0, 5), '吃卒后再碾一格吃掉一级马');
  ok(i.kills.length === 2, '连破两阵');
  console.log('冲阵 OK');
}
{
  // 跳板 2 血敌子挨 1 点，身后空格 → 车落到它身后
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 3)], [0, 5, P('b', 'n', 2)], [8, 9, P('b', 'r')]]);
  ok(g.apply({ k: 'sk', at: [0, 0], to: [0, 5] }), '冲阵');
  ok(g.at(0, 5).hp === 1 && g.at(0, 6).t === 'r' && !g.at(0, 0), '跳板扣 1 血，车落到它身后一格');
  // 身后有 2 血敌子 → 只扣血，车退回原位
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 3)], [0, 5, P('b', 'p')], [0, 6, P('b', 'n', 2)]]);
  g2.apply({ k: 'sk', at: [0, 0], to: [0, 5] });
  ok(!g2.at(0, 5) && g2.at(0, 6).hp === 1 && g2.at(0, 0).t === 'r', '跳板阵亡，身后 2 血打不死：扣血、车回原位');
  // 己方子也能当跳板（会被误伤），不给军功
  const g3 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 3)], [0, 3, P('r', 'p')], [0, 4, P('b', 'p')]], { merit: { r: 3, b: 3 } });
  ok(g3.skillTargets(0, 0).some(a => a.to.join() === '0,3'), '己方子可作跳板');
  g3.apply({ k: 'sk', at: [0, 0], to: [0, 3] });
  ok(!g3.at(0, 3) && g3.at(0, 4).t === 'r' && g3.merit.r === 3 + 1, '误伤己方兵（不给功），吃掉身后黑卒（+1 功）' + JSON.stringify(g3.merit));
  // 身后是帅将或出界不能用
  const g4 = setup([[4, 6, K('r')], [8, 5, K('b')], [0, 0, P('r', 'a')], [0, 9, P('b', 'a')]]);
  const bm = [[[0, 9], [1, 8]], [[1, 8], [0, 9]]]; let bi = 0;
  const black = () => { const m = bm[bi++ % 2]; return g4.apply({ k: 'mv', from: m[0], to: m[1] }); };
  g4.apply({ k: 'mv', from: [4, 6], to: [4, 7] });   // 汉帅进楚九宫
  assert(g4.occ.r === 0 && !g4.result, '刚进去：0/3');
  black(); assert(g4.occ.r === 1, '对方走一步：1/3');
  g4.apply({ k: 'mv', from: [4, 7], to: [3, 7] });   // 在九宫里挪动不清零
  black(); assert(g4.occ.r === 2 && !g4.result, '2/3');
  g4.apply({ k: 'mv', from: [3, 7], to: [2, 7] });   // 走出九宫：清零
  black(); assert(g4.occ.r === 0, '走出九宫清零');
  g4.apply({ k: 'mv', from: [2, 7], to: [3, 7] });
  black(); g4.apply({ k: 'mv', from: [0, 0], to: [1, 1] });
  black(); g4.apply({ k: 'mv', from: [1, 1], to: [0, 0] });
  assert(g4.occ.r === 2 && !g4.result, '再进去重新数: ' + JSON.stringify(g4.occ));
  const i4 = black();
  assert(i4 && i4.ev.some(e => e.e === 'occupy' && e.n === 3) && g4.result && g4.result.reason === 'occupy' && g4.result.winner === 'r', '满三回合：夺营获胜 ' + JSON.stringify(g4.result));
  console.log('决战 OK');
}
console.log('BINGFA ALL OK');
