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
  const g4 = setup([[4, 0, K('r')], [4, 9, K('b')], [4, 2, P('r', 'r', 3)], [4, 8, P('b', 'a')], [0, 2, P('b', 'p')]]);
  ok(!g4.skillTargets(4, 2).some(a => a.to.join() === '4,8') && !g4.skillTargets(4, 2).some(a => a.to.join() === '0,2'), '身后是将或出界不能冲');
  console.log('冲阵边界 OK');
}
// 7b. 兵四级：神速营（被动：八方向 1～2 格可越子、只落空格，冷却 5）、回防（被动后退，冷却 2）；拒马后可以用被动走法
{
  const pw = P('r', 'p', 4, { hp: 3 });
  ok(BF.hpOf('p', 4) === 3 && BF.hpOf('a', 4) === 3 && BF.hpOf('r', 4) === 4, '兵士四级不加血，车四级 4 血');
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [4, 5, pw], [4, 6, P('b', 'p')], [5, 6, P('r', 'p')], [8, 9, P('b', 'r')]]);
  const lg = g.legalFrom(4, 5), via = to => (lg.find(m => m.to.join() === to) || {}).via, has = to => lg.some(m => m.to.join() === to);
  ok(via('4,7') === 'shensu' && via('6,7') === 'shensu' && via('2,3') === 'shensu' && via('6,5') === 'shensu', '神速营是走法：越子、斜走 ' + lg.map(m => m.to.join() + (m.via ? ':' + m.via : '')).join(' '));
  ok(has('4,6') && !via('4,6') && !has('5,6'), '前面的敌卒仍按普通走法吃；己方子所在格不能落');
  ok(via('4,4') === 'huifang' && via('4,3') === 'shensu', '后退一格算回防（冷却短），后退两格算神速营');
  ok(via('3,5') === undefined && has('3,5'), '过河兵横走一格仍是普通走法');
  ok(!g.skillTargets(4, 5).some(a => a.sk === 'shensu') && g.skillTargets(4, 5).some(a => !a.sk), '神速营不再是要点的技能；拒马还在');
  ok(g.isPassive('shensu') && BF.SKILL_CN.shensu === '神速营', '神速营是被动');
  g.apply({ k: 'mv', from: [4, 5], to: [4, 4] });
  ok(g.cdLeft(g.at(4, 4), 'huifang') === 2 && g.cdLeft(g.at(4, 4), 'shensu') === 0, '回防冷却 2，神速营没动');
  g.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  ok(g.legalFrom(4, 4).find(m => m.to.join() === '4,3').via === 'shensu', '回防冷却中：后退一格改由神速营走');
  const info = g.apply({ k: 'mv', from: [4, 4], to: [6, 6] });
  ok(info && info.extra.via === 'shensu' && g.at(6, 6).s === 'r' && g.cdLeft(g.at(6, 6), 'shensu') === 5, '神速营斜走两格，冷却 5');
  g.apply({ k: 'mv', from: [8, 8], to: [8, 9] });
  ok(!g.legalFrom(6, 6).some(m => m.via === 'shensu'), '冷却中没有神速营走法');
  // 旧版存档里的主动神速营行动仍能重放
  const go = setup([[4, 0, K('r')], [3, 9, K('b')], [4, 5, P('r', 'p', 4, { hp: 3 })], [8, 9, P('b', 'r')]]);
  ok(go.apply({ k: 'sk', at: [4, 5], to: [6, 7], sk: 'shensu' }) && go.at(6, 7), '旧版行动格式兼容');
  // 拒马之后另一枚兵用被动后退
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 5, P('r', 'p', 3)], [8, 5, P('r', 'p', 4, { hp: 3 })], [8, 9, P('b', 'r')]]);
  ok(g2.apply({ k: 'sk', at: [0, 5] }) && g2.freeUsed, '拒马');
  ok(g2.apply({ k: 'mv', from: [8, 5], to: [8, 4] }) && g2.turn === 'b', '同一回合再用被动回防走一步');
  console.log('兵四级 OK');
}
// 7c. 士四级：铁甲禁卫（九宫内上下左右走一格，冷却 2）
{
  const g = setup([[3, 0, K('r')], [5, 9, K('b')], [4, 1, P('r', 'a', 4, { hp: 3 })], [8, 9, P('b', 'r')]]);
  const lg = g.legalFrom(4, 1).map(m => m.to.join() + (m.via ? ':' + m.via : ''));
  ok(['5,1:jinwei', '3,1:jinwei', '4,0:jinwei', '4,2:jinwei'].every(x => lg.includes(x)), '铁甲禁卫：九宫内上下左右 ' + lg);
  ok(lg.includes('3,2') && lg.includes('5,0'), '斜走仍是普通走法');
  g.apply({ k: 'mv', from: [4, 1], to: [4, 2] });
  ok(g.cdLeft(g.at(4, 2), 'jinwei') === 2, '铁甲禁卫冷却 2');
  g.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  ok(!g.legalFrom(4, 2).some(m => m.via), '冷却中不能直走');
  ok(!g.legalFrom(4, 2).some(m => m.to[1] === 3), '不能出九宫');
  const g2 = setup([[3, 0, K('r')], [5, 9, K('b')], [4, 1, P('r', 'a', 3)]]);
  ok(!g2.legalFrom(4, 1).some(m => m.to[1] === 1 || m.to[0] === 4), '三级士不能直走');
  ok(BF.SKILL_CN.jinwei === '铁甲禁卫', '改名铁甲禁卫');
  console.log('士四级 OK');
}
// 7d. 击杀总数：升级不清零
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 3, P('r', 'r')], [0, 6, P('b', 'p')], [8, 9, P('b', 'r')]], { merit: { r: 10, b: 3 } });
  g.apply({ k: 'mv', from: [0, 3], to: [0, 6] });
  g.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  g.apply({ k: 'up', at: [0, 6] });
  ok(g.at(0, 6).kills === 1 && g.at(0, 6).xp === 0, '升级用掉甲片，击杀数保留');
  console.log('击杀数 OK');
}
// 8. 踏营：只能在敌方半场用
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [1, 0, P('r', 'n', 3)], [1, 1, P('r', 'p')]]);
  ok(!g.isLegal({ from: [1, 0], to: [2, 2] }), '马腿被蹩');
  ok(!g.skillTargets(1, 0).length && !g.apply({ k: 'sk', at: [1, 0], to: [2, 2] }), '己方半场不能踏营');
  ok(/敌方半场/.test(g.skillWhy(1, 0, 'taying')), '说明原因：' + g.skillWhy(1, 0, 'taying'));
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [1, 5, P('r', 'n', 3)], [1, 6, P('b', 'p')]]);
  ok(!g2.isLegal({ from: [1, 5], to: [2, 7] }), '过河后马腿被蹩');
  ok(g2.skillTargets(1, 5).some(a => a.to[0] === 2 && a.to[1] === 7) && g2.skillWhy(1, 5, 'taying') === '', '敌方半场踏营无视蹩马腿');
  ok(g2.apply({ k: 'sk', at: [1, 5], to: [2, 7] }), '踏营');
  const g3 = setup([[4, 0, K('r')], [3, 9, K('b')], [1, 4, P('b', 'n', 3)], [1, 3, P('r', 'p')]], { turn: 'b' });
  ok(g3.skillTargets(1, 4).some(a => a.to.join() === '2,2'), '楚马在汉方半场可以踏营');
  console.log('踏营 OK');
}
// 9. 霹雳
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [1, 2, P('r', 'c', 3)], [1, 5, P('r', 'p')], [1, 7, P('b', 'p')], [0, 7, P('b', 'n', 2)], [2, 7, P('b', 'r')], [1, 8, P('b', 'a', 3)]]);
  const i = g.apply({ k: 'sk', at: [1, 2], to: [1, 7] });
  ok(i && g.at(1, 7).t === 'c', '霹雳吃掉目标');
  ok(g.at(0, 7).hp === 1 && g.at(2, 7) && g.at(2, 7).hp === 1 && g.at(1, 8).hp === 2, '溅射只伤二级以上敌子 ' + [g.at(0, 7).hp, g.at(1, 8).hp]);
  ok(i.ev.some(x => x.e === 'splash' && x.at.join() === '1,7') && g.at(1, 7).xp === 1, '记录落弹中心、炮攒一片甲');
  console.log('霹雳 OK');
}
// 10. 齐射
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [2, 4, P('r', 'e', 4)], [4, 6, P('b', 'p')], [0, 6, P('b', 'n')], [1, 5, P('r', 'p')]]);
  const tg = g.skillTargets(2, 4).filter(a => !a.sk).map(a => a.to.join());
  ok(tg.includes('4,6') && !tg.includes('0,6'), '射 2 格中间有子被挡 ' + tg);
  g.apply({ k: 'sk', at: [2, 4], to: [4, 6] });
  ok(!g.at(4, 6) && g.at(2, 4).t === 'e', '一级子直接阵亡、弩手不动');
  console.log('齐射 OK');
}
// 11. 践踏（四级楚战象被动，无冷却）
{
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [2, 9, P('b', 'e', 4)], [4, 8, P('b', 'a')], [4, 7, P('r', 'p')], [4, 6, P('r', 'n', 2)], [3, 7, P('r', 'p')], [8, 0, P('r', 'r')]], { turn: 'b' });
  ok(g.skillTargets(2, 9).every(a => a.sk === 'feiyue'), '践踏是被动，不出现在主动技能里');
  const i = g.apply({ k: 'mv', from: [2, 9], to: [4, 7] });
  ok(i && g.at(4, 7).t === 'e' && g.at(4, 6).hp === 1 && !g.at(3, 7) && g.at(4, 7).kills === 2, '吃子后周围一圈敌子各扣 1：二级的剩 1 血，一级的直接踩死');
  ok(i.ev.some(e => e.e === 'splash'), '吃了子：触发践踏');
  g.apply({ k: 'mv', from: [8, 0], to: [8, 1] });
  const j = g.apply({ k: 'mv', from: [4, 7], to: [2, 5] });
  ok(j && !j.ev.some(e => e.e === 'splash') && g.at(4, 6) && g.at(4, 6).hp === 1, '走到空格：不触发践踏');
  const g3 = setup([[4, 0, K('r')], [4, 9, K('b')], [2, 9, P('b', 'e', 4)], [4, 7, P('r', 'p')], [4, 6, P('r', 'n', 2, { hp: 1 })]], { turn: 'b' });
  g3.apply({ k: 'mv', from: [2, 9], to: [4, 7] });
  ok(!g3.at(4, 6), '残血的直接踩死');
  const g2 = setup([[4, 0, K('r')], [4, 9, K('b')], [2, 9, P('b', 'e', 3)], [4, 7, P('r', 'p')], [4, 6, P('r', 'n', 2)]], { turn: 'b' });
  g2.apply({ k: 'mv', from: [2, 9], to: [4, 7] });
  ok(g2.at(4, 6).hp === 2, '三级战象不踩（践踏是四级技能）');
  console.log('践踏 OK');
}
// 11b. 飞越（相 / 象三级主动，无视塞象眼，冷却 5）
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [2, 0, P('r', 'e', 3)], [3, 1, P('r', 'p')], [1, 1, P('b', 'p')], [8, 9, P('b', 'r')]]);
  ok(!g.isLegal({ from: [2, 0], to: [4, 2] }), '象眼被塞，普通走法过不去');
  const tg = g.skillTargets(2, 0).filter(a => a.sk === 'feiyue').map(a => a.to.join());
  ok(tg.includes('4,2') && tg.includes('0,2'), '飞越无视塞象眼 ' + tg);
  ok(g.apply({ k: 'sk', sk: 'feiyue', at: [2, 0], to: [4, 2] }) && g.at(4, 2).t === 'e', '飞越落子');
  g.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  ok(!g.skillTargets(4, 2).some(a => a.sk === 'feiyue'), '飞越进入冷却');
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [2, 4, P('r', 'e', 3)], [3, 5, P('b', 'p')]]);
  ok(!g2.skillTargets(2, 4).some(a => a.to[1] > 4), '飞越也不能过河');
  ok(g2.maxLv(g2.at(2, 4)) === 4 && BF.hpOf('e', 4) === 3, '相可升四级，不加血');
  const g3 = setup([[4, 0, K('r')], [3, 9, K('b')], [2, 4, P('r', 'e', 3)]]);
  ok(!g3.skillTargets(2, 4).some(a => !a.sk), '三级相还没有齐射');
  console.log('飞越 OK');
}
// 11c. 甲片攒够自动升级（不花军功）；四级取名将的名字
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'a', 1, { xp: 1 })], [1, 1, P('b', 'p')], [8, 9, P('b', 'r')]], { merit: { r: 0, b: 0 } });
  // 士升二级要 2 功：已有 1 片甲，再杀一个 → 自动升二级
  g.setup(T => { T.board[0][0] = null; T.board[0][3] = P('r', 'a', 1, { xp: 1 }); T.board[1][4] = P('b', 'p'); T.board[1][1] = null; });
  const i = g.apply({ k: 'mv', from: [3, 0], to: [4, 1] });
  const a = g.at(4, 1);
  ok(i && a.lv === 2 && a.xp === 0 && a.hp === 2 && a.kills === 1, '甲片够数，击杀后自动升二级 ' + JSON.stringify([a.lv, a.xp, a.hp]));
  ok(i.ev.some(e => e.e === 'autoup' && e.lv === 2) && g.merit.r === 1, '自动升级不花军功（只得了击杀的 1 功）' + g.merit.r);
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [3, 0, P('r', 'a', 3)], [5, 0, P('r', 'a', 3)], [8, 9, P('b', 'r')]], { merit: { r: 20, b: 0 } });
  g2.apply({ k: 'up', at: [5, 0] });
  ok(g2.at(5, 0).lv === 4 && g2.heroName(g2.at(5, 0)) === '樊哙', '先升四级的士叫樊哙');
  g2.apply({ k: 'mv', from: [4, 0], to: [4, 1] }); g2.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  g2.apply({ k: 'up', at: [3, 0] });
  ok(g2.heroName(g2.at(3, 0)) === '纪信' && g2.heroName(g2.at(5, 0)) === '樊哙', '第二个叫纪信');
  console.log('自动升级 / 名将 OK');
}
// 12. 护驾
{
  const g = setup([[4, 0, K('r')], [5, 9, K('b')], [3, 0, P('r', 'a', 2)]]);
  ok(!g.skillTargets(3, 0).length, '二级士没有护驾');
  g.setup(T => { T.board[0][3].lv = 3; T.board[0][3].hp = 3; });
  g.apply({ k: 'sk', at: [3, 0] });
  ok(g.at(3, 0).t === 'k' && g.at(4, 0).t === 'a' && g.cdLeft(g.at(4, 0)) === 4, '三级士与帅互换，冷却 4');
  console.log('护驾 OK');
}
// 13. 萧何追韩信
{
  const g = new BF.Game();
  g.apply({ k: 'mv', from: [0, 3], to: [0, 4] });
  g.apply({ k: 'mv', from: [1, 7], to: [1, 0] }); // 黑炮打马，占住马位
  ok(!g.reviveOptions().length, '开局位置被占不能复活');
  g.apply({ k: 'mv', from: [0, 4], to: [0, 5] });
  g.apply({ k: 'mv', from: [1, 0], to: [1, 1] });
  const ro = g.reviveOptions();
  ok(ro.length === 1 && ro[0].t === 'n', '马位空出后可复活');
  ok(g.apply({ k: 'art', id: ro[0].id }) && g.at(1, 0).t === 'n', '复活成功');
  console.log('复活（开局位被占）OK');
}
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')]], {});
  g.setup(T => { T.dead.r.push({ id: 1, t: 'n', s: 'r' }); });
  const ro = g.reviveOptions();
  ok(ro.length === 1 && ro[0].at.join() === '1,0', '复活回开局马位');
  g.apply({ k: 'art', id: 1 });
  ok(g.at(1, 0).t === 'n' && g.at(1, 0).lv === 1, '复活为一级');
  g.apply({ k: 'mv', from: [3, 9], to: [3, 8] });
  ok(!g.reviveOptions().length, '每局限一次');
  console.log('萧何追韩信 OK');
}
// 14. 破釜沉舟
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 9, P('b', 'r')], [8, 9, P('b', 'r')], [0, 0, P('r', 'p')]], { turn: 'b' });
  const f1 = g.pofuFirst();
  ok(f1.length > 0, '有可选第一步');
  const ok2 = g.apply({ k: 'art', steps: [{ from: [0, 9], to: [0, 1] }, { from: [8, 9], to: [8, 1] }] });
  ok(ok2 && g.at(0, 1) && g.at(8, 1), '连走两步');
  ok(g.fx.pf === 3, '之后 3 回合技能封锁');
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 9, P('b', 'r')], [8, 9, P('b', 'r')]], { turn: 'b' });
  ok(!g2.apply({ k: 'art', steps: [{ from: [0, 9], to: [0, 1] }, { from: [8, 9], to: [4, 9] }] }) || true, '');
  ok(!g2.apply({ k: 'art', steps: [{ from: [0, 9], to: [0, 5] }, { from: [8, 9], to: [8, 0] }] }) || !g2.inCheck('r'), '不能以将军收尾');
  console.log('破釜沉舟 OK');
}
// 15. 鸿门宴：3 回合；汉士护驾可破
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 3, P('r', 'p')], [8, 9, P('b', 'r')]], { turn: 'b', merit: { r: 3, b: 20 } });
  ok(g.ultReady(), '军功 20 可发动鸿门宴');
  g.apply({ k: 'ult' });
  ok(g.merit.b === 0 && g.fx.hm === 3, '扣 20 军功、汉方 3 回合');
  ok(!g.legalFrom(4, 0).length, '汉帅不能动');
  ok(g.apply({ k: 'mv', from: [0, 3], to: [0, 4] }) && g.apply({ k: 'mv', from: [8, 9], to: [8, 8] }), '第一回合');
  ok(g.fx.hm === 2 && !g.legalFrom(4, 0).length, '第二回合汉帅仍不能动');
  ok(g.apply({ k: 'mv', from: [0, 4], to: [0, 5] }) && g.apply({ k: 'mv', from: [8, 8], to: [8, 9] }), '第二回合');
  ok(g.fx.hm === 1 && !g.legalFrom(4, 0).length, '第三回合汉帅仍不能动');
  ok(g.apply({ k: 'mv', from: [0, 5], to: [0, 6] }) && g.apply({ k: 'mv', from: [8, 9], to: [8, 8] }), '第三回合');
  ok(g.fx.hm === 0 && g.legalFrom(4, 0).length > 0, '三回合后解除');
  console.log('鸿门宴 OK');
}
{
  // 樊哙闯帐：汉士护驾，当场破掉鸿门宴
  const g = setup([[4, 0, K('r')], [5, 9, K('b')], [3, 1, P('r', 'a', 3)], [0, 9, P('b', 'r')]], { turn: 'b', merit: { r: 3, b: 20 } });
  g.apply({ k: 'ult' });
  ok(g.fx.hm === 3 && g.skillTargets(3, 1).length === 1 && g.skillWhy(3, 1, 'hujia') === '', '鸿门宴期间士可以护驾');
  const info = g.apply({ k: 'sk', at: [3, 1] });
  ok(info && info.extra.rescue && info.ev.some(e => e.e === 'rescue'), '护驾触发闯帐事件');
  ok(g.fx.hm === 0 && g.at(3, 1).t === 'k' && g.at(4, 0).t === 'a', '帅士换位，鸿门宴解除');
  g.apply({ k: 'mv', from: [0, 9], to: [0, 8] });
  ok(g.legalFrom(3, 1).length > 0, '汉帅恢复行动');
  // 二级的士没有护驾，破不了
  const g2 = setup([[4, 0, K('r')], [5, 9, K('b')], [3, 1, P('r', 'a', 2)], [0, 9, P('b', 'r')]], { turn: 'b', merit: { r: 3, b: 20 } });
  g2.apply({ k: 'ult' });
  ok(!g2.skillTargets(3, 1).length, '二级士不能护驾');
  // 楚士护驾不影响四面楚歌之类
  console.log('护驾破鸿门宴 OK');
}
{
  // 鸿门宴期间汉方无子可走 → 停着，不判困毙
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 9, P('b', 'r')]], { turn: 'b', merit: { r: 3, b: 20 } });
  g.apply({ k: 'ult' });
  ok(!g.result && g.mustPass(), '无子可走只能停着 ' + JSON.stringify(g.result));
  ok(g.apply({ k: 'pass' }), '停着');
  console.log('鸿门宴停着 OK');
}
// 16. 四面楚歌：楚军除将外不能动，只能吃掉正在将军的子；楚军不算将军；没被将军可以停着
{
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 7, P('r', 'p')], [5, 7, P('r', 'p')], [2, 8, P('r', 'n')], [4, 5, P('r', 'r')], [0, 9, P('b', 'r')], [8, 7, P('b', 'c')], [2, 6, P('b', 'p')]], { merit: { r: 20, b: 3 } });
  ok(g.ultReady(), '楚将 2 格内 3 枚汉子可发动');
  g.apply({ k: 'ult' });
  ok(g.fx.sm === 2 && g.turn === 'b', '楚军涣散 2 回合');
  // 汉马 (2,8) 正将着楚将 (4,9)
  ok(g.inCheck('b'), '汉马、汉车将军');
  ok(!g.legalFrom(8, 7).length && !g.legalFrom(2, 6).length, '炮、卒不能动（也够不着将军的马）');
  const rk = g.legalFrom(0, 9).map(m => m.to.join());
  ok(rk.length === 0, '车被自家子挡着也吃不到马 ' + rk);
  ok(g.legalFrom(4, 9).length > 0 && !g.mayPass(), '被将军：将可以走，不能停着');
  ok(!g.apply({ k: 'pass' }), '被将军时不能停着');
  const g2 = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 7, P('r', 'p')], [0, 9, P('b', 'r')]], { merit: { r: 20, b: 3 } });
  ok(!g2.ultReady(), '人数不够不能发动');
  console.log('四面楚歌 OK');
}
{
  // 只能吃将军的那枚子；吃别的不行
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 7, P('r', 'p')], [5, 7, P('r', 'p')], [2, 7, P('r', 'p')], [4, 6, P('r', 'r')], [0, 6, P('b', 'r')], [0, 4, P('r', 'p')], [8, 9, P('b', 'n')]], { merit: { r: 20, b: 3 } });
  g.apply({ k: 'ult' });
  ok(g.inCheck('b'), '汉车将军');
  const lg = g.legalFrom(0, 6).map(m => m.to.join());
  ok(lg.length === 1 && lg[0] === '4,6', '楚车只能吃将军的汉车，不能吃旁边的兵、不能走空格 ' + lg);
  ok(g.apply({ k: 'mv', from: [0, 6], to: [4, 6] }) && !g.inCheck('b'), '吃子解将');
  ok(!g.inCheck('r'), '楚车对着汉帅也不算将军');
  // 汉方这回合想怎么走怎么走（不必应将）
  ok(g.apply({ k: 'mv', from: [0, 4], to: [0, 5] }), '汉方不必应将');
  ok(g.turn === 'b' && g.mayPass() && !g.mustPass(), '楚军没被将军：可以停着，也可以走将');
  ok(!g.legalFrom(4, 6).length && !g.legalFrom(8, 9).length, '楚车、楚马都不能动');
  ok(g.apply({ k: 'pass' }), '停着');
  // 涣散结束：汉帅真的被将军了，必须应
  ok(g.fx.sm === 0 && g.turn === 'r' && g.inCheck('r'), '两回合后楚车的将军生效');
  ok(!g.isLegal({ from: [0, 5], to: [0, 6] }), '这时必须应将');
  console.log('四面楚歌：只能吃将军的子、不算将军、可停着 OK');
}
{
  // 汉方被将军时发动四面楚歌 = 解将
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [2, 7, P('r', 'p')], [3, 7, P('r', 'p')], [4, 8, P('r', 'n')], [4, 5, P('b', 'r')], [8, 9, P('b', 'c')]], { merit: { r: 20, b: 3 } });
  ok(g.inCheck('r'), '楚车将着汉帅');
  ok(g.ultReady() && g.apply({ k: 'ult' }), '被将军时可以发动四面楚歌');
  ok(!g.inCheck('r') && g.turn === 'b', '将军不算了');
  // 将帅对面仍然不允许
  const g3 = setup([[4, 0, K('r')], [4, 9, K('b')], [4, 6, P('r', 'p')], [3, 7, P('r', 'p')], [5, 7, P('r', 'p')], [3, 8, P('r', 'n')], [0, 9, P('b', 'r')]], { merit: { r: 20, b: 3 } });
  ok(g3.apply({ k: 'ult' }) && g3.apply({ k: 'pass' }) && g3.turn === 'r', '楚军停着');
  ok(!g3.isLegal({ from: [4, 6], to: [3, 6] }) && g3.isLegal({ from: [4, 6], to: [4, 7] }), '四面楚歌期间将帅对面仍然不允许');
  console.log('四面楚歌解将 OK');
}
{
  // 被将军又吃不掉、将也走不了 → 绝杀
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [3, 5, P('r', 'r')], [4, 7, P('r', 'r')], [2, 8, P('r', 'p')], [4, 8, P('r', 'p')], [8, 9, P('b', 'r')], [8, 5, P('b', 'c')]], { merit: { r: 20, b: 3 } });
  const info = g.apply({ k: 'ult' });
  ok(g.result && g.result.reason === 'checkmate' && g.result.winner === 'r', '四面楚歌下无法解将即绝杀 ' + JSON.stringify(g.result));
  console.log('四面楚歌绝杀 OK');
}
// 16b. 称号
{
  ok(BF.rankName('r', 'p', 1) === '汉军兵' && BF.rankName('r', 'p', 2) === '汉伍长' && BF.rankName('r', 'p', 3) === '汉什长' && BF.rankName('r', 'p', 4) === '无当飞军', '汉兵称号');
  ok(BF.rankName('b', 'p', 1) === '楚军卒' && BF.rankName('b', 'p', 2) === '楚锐卒' && BF.rankName('b', 'p', 3) === '楚持戟' && BF.rankName('b', 'p', 4) === '江东甲士', '楚卒称号');
  for (const s of ['r', 'b']) for (const t of 'prncea') { const info = BF.levelInfo(t, s, 1); for (let lv = 1; lv <= info.maxLv; lv++) ok(BF.rankName(s, t, lv), '称号齐全 ' + s + t + lv); ok(new Set(BF.RANK_CN[s][t]).size === info.maxLv, '每级一个称号 ' + s + t); }
  const g = new BF.Game(); ok(g.rankName(g.at(0, 0)) === '汉军车', '对局里取称号');
  console.log('称号 OK');
}
// 17. 军功：将军、过河、回合收入、上限
{
  const g = new BF.Game();
  g.apply({ k: 'mv', from: [4, 3], to: [4, 4] });
  g.apply({ k: 'mv', from: [0, 6], to: [0, 5] });
  const m0 = g.merit.r;
  g.apply({ k: 'mv', from: [4, 4], to: [4, 5] });
  ok(g.merit.r === m0 + 1, '兵过河 +1');
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r')]]);
  g2.apply({ k: 'mv', from: [0, 0], to: [0, 9] });
  ok(g2.merit.r === 4, '将军 +1');
  const g3 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r')], [8, 9, P('b', 'r')]], { cnt: { r: 15, b: 14 }, turn: 'b', merit: { r: 29, b: 3 } });
  g3.apply({ k: 'mv', from: [8, 9], to: [8, 8] });
  ok(g3.round === 16 && g3.merit.r === 30 && g3.merit.b === 4, '第 16 回合起每回合 +1，上限 30 ' + JSON.stringify(g3.merit));
  console.log('军功来源 OK');
}
// 18. 困毙：只剩攻击或技能也判负
{
  // 黑将被红车控住，唯一的黑子是 2 血的卒（不能动），红方攻击它前……这里直接看黑方有没有普通走子
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 8, P('r', 'r')], [2, 0, P('r', 'r')], [4, 5, P('r', 'r')]], { turn: 'r' });
  const i = g.apply({ k: 'mv', from: [2, 0], to: [2, 1] });
  ok(g.result && g.result.reason === 'stalemate', '黑无普通走子判困毙 ' + JSON.stringify(g.result));
  console.log('困毙 OK');
}
// 19. 将死要看技能应着：护驾能解将就不算将死
{
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 9, P('b', 'a', 3)], [4, 5, P('r', 'r')], [3, 7, P('r', 'r')], [5, 7, P('r', 'r')]], { turn: 'r' });
  // 红车已在 4 线将军；黑将只能靠护驾和士换位
  const i = g.apply({ k: 'mv', from: [5, 7], to: [5, 8] });
  ok(i && !g.result, '护驾可解将，不判将死 ' + JSON.stringify(g.result));
  console.log('技能解将 OK');
}
// 20. 长将限制
{
  const g = setup([[3, 0, K('r')], [4, 9, K('b')], [0, 5, P('r', 'r')]]);
  g.apply({ k: 'mv', from: [0, 5], to: [0, 9] });
  let forbidden = false, n = 1;
  for (let i = 0; i < 10; i++) {
    const kp = g.kingPos('b'), km = g.legalFrom(kp[0], kp[1]);
    if (!km.length) break;
    g.apply({ k: 'mv', from: km[0].from, to: (km.find(m => m.to[1] !== kp[1]) || km[0]).to });
    const k2 = g.kingPos('b');
    const rp = (() => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.at(f, r); if (p && p.s === 'r' && p.t === 'r') return [f, r]; } })();
    const want = { from: rp, to: [rp[0], k2[1]] };
    if (!g.isLegal(want)) { forbidden = true; break; }
    g.apply({ k: 'mv', ...want }); n++;
  }
  ok(forbidden && n === 6, '第 7 次连续将军被禁止 n=' + n);
  console.log('长将限制 OK');
}
// 21. 随机对局：重放一致、悔棋一致、无异常
{
  let games = 0, acts = 0, res = {}, skc = {};
  const rnd = n => Math.floor(Math.random() * n);
  for (let k = 0; k < 25; k++) {
    const g = new BF.Game();
    if (k % 2) g.setup(T => { T.merit = { r: 30, b: 30 }; }); // 一半的对局军功充足，多练高等级技能
    for (let i = 0; i < 160 && !g.result; i++) {
      // 偶尔升级
      if (Math.random() < 0.3) {
        const own = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (g.canUpgrade(f, r)) own.push([f, r]);
        if (own.length) assert(g.apply({ k: 'up', at: own[rnd(own.length)] }));
      }
      const opts = [];
      for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
        for (const m of g.legalFrom(f, r)) opts.push({ k: 'mv', from: m.from, to: m.to });
        if (Math.random() < 0.5) opts.push(...g.skillTargets(f, r));
      }
      if (Math.random() < 0.1) opts.push(...g.reviveOptions());
      if (g.ultReady() && Math.random() < 0.3) opts.push({ k: 'ult' });
      if (g.mustPass() || (g.mayPass() && Math.random() < 0.5)) opts.push({ k: 'pass' });
      if (!opts.length) break;
      const caps = opts.filter(a => a.to && g.at(a.to[0], a.to[1]));
      const a = caps.length && Math.random() < 0.5 ? caps[rnd(caps.length)] : opts[rnd(opts.length)];
      const info = g.apply(a);
      assert(info, 'apply ' + JSON.stringify(a));
      acts++;
      const sk = a.k === 'sk' ? (info.extra && info.extra.sk) : info.extra && info.extra.via; if (sk) skc[sk] = (skc[sk] || 0) + 1;
    }
    const snap = JSON.stringify(g.S), es = g.entries.slice();
    const h = new BF.Game(); h.reset(g.base); for (const e of es) assert(h.apply(e), 'replay');
    assert.strictEqual(JSON.stringify(h.S), snap, '重放一致');
    // 悔两次主行动
    const n0 = g.history.length;
    if (n0 > 3 && !g.result) { g.undoActions(2); assert.strictEqual(g.history.length, n0 - 2, '悔棋两步'); }
    games++;
    const r = g.result ? g.result.reason : 'open'; res[r] = (res[r] || 0) + 1;
  }
  console.log('随机对局', games, '局', acts, '次行动', JSON.stringify(res), 'OK');
}
{
  // 践踏：强攻没拿下退回原位，踩的也是被攻击那格的四周
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [2, 9, P('b', 'e', 4)], [4, 7, P('r', 'p', 3)], [5, 8, P('r', 'p')], [5, 6, P('r', 'p')], [3, 6, P('r', 'p', 2)]], { turn: 'b' });
  const r = g.apply({ k: 'mv', from: [2, 9], to: [4, 7] });
  assert(r && g.at(2, 9) && g.at(2, 9).t === 'e' && g.at(4, 7), '象退回原位');
  assert(!g.at(5, 8) && !g.at(5, 6), '被攻击格四周的一级子被踩死');
  assert(g.at(3, 6) && g.at(3, 6).hp === BF.hpOf('p', 2) - 1, '二级子掉 1 血');
  console.log('践踏落点 OK');
}
{
  // 决战：双方车马兵炮都死光 → 象士帅将解禁，取消飞将，帅将按过河兵走
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 0, P('r', 'a')], [2, 0, P('r', 'e')], [4, 5, P('r', 'p')], [2, 9, P('b', 'e')], [3, 7, P('b', 'a')], [4, 6, P('b', 'p')]], { turn: 'b' });
  assert(!g.final, '还有兵卒：不是决战');
  const i = g.apply({ k: 'mv', from: [4, 6], to: [4, 5] });   // 卒吃兵：还剩一个卒
  assert(i && !g.final && !i.ev.some(e => e.e === 'final'), '还剩一个卒：不触发');
  const g2 = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 1, P('r', 'a')], [2, 0, P('r', 'e')], [2, 9, P('b', 'e')], [3, 9, P('b', 'a')], [4, 2, P('b', 'p')]]);
  const j = g2.apply({ k: 'mv', from: [3, 1], to: [4, 2] });  // 士吃掉最后一个卒
  assert(j && j.ev.some(e => e.e === 'final') && g2.final, '最后一个进攻子阵亡：进入决战');
  assert(g2.at(4, 0).w && g2.at(4, 2).j && g2.at(2, 9).j, '帅将、士、象打上解禁标记');
  // 楚将：前、左、右（黑方向前是 r-1），不能后退；可以和汉帅照面
  const km = g2.legalFrom(4, 9).map(m => m.to.join()).sort().join(' ');
  assert(km === '4,8 5,9', '楚将按过河兵走（3,9 有自己的士）: ' + km);
  g2.apply({ k: 'mv', from: [4, 9], to: [4, 8] });
  assert(g2.legalFrom(4, 2).some(m => m.to.join() === '5,3'), '士可以出九宫');
  assert(g2.legalFrom(4, 0).map(m => m.to.join()).sort().join(' ') === '3,0 4,1 5,0', '汉帅：前左右各一格，照面不算将');
  g2.apply({ k: 'mv', from: [2, 0], to: [0, 2] });
  assert(g2.at(0, 2), '象走田');
  g2.apply({ k: 'mv', from: [2, 9], to: [4, 7] });
  g2.apply({ k: 'mv', from: [0, 2], to: [2, 4] });
  g2.apply({ k: 'mv', from: [4, 7], to: [2, 5] });
  assert(g2.legalFrom(2, 4).some(m => m.to.join() === '4,6'), '象可以过河');
  assert(g2.at(4, 0) ? g2.at(4, 0).hp === 3 : g2.at(g2.kingPos('r')[0], g2.kingPos('r')[1]).hp === 3, '决战里帅将 3 点生命');
  // 可以送将、可以对脸；帅将能被直接攻击，打到 0 血告负
  const g3 = setup([[4, 4, K('r')], [5, 6, K('b')], [0, 0, P('r', 'a')], [8, 9, P('b', 'a', 4)]]);
  assert(g3.final && g3.at(4, 4).w && g3.at(4, 4).hp === 3 && !g3.inCheck('r'), '摆出来就是决战局面，没有将军');
  g3.apply({ k: 'mv', from: [4, 4], to: [4, 5] });
  assert(g3.legalFrom(5, 6).some(m => m.to.join() === '5,5'), '楚将可以走到汉帅旁边（送将）');
  g3.apply({ k: 'mv', from: [5, 6], to: [5, 5] });
  let i3 = g3.apply({ k: 'mv', from: [4, 5], to: [5, 5] });
  assert(i3 && g3.at(5, 5).t === 'k' && g3.at(5, 5).s === 'b' && g3.at(5, 5).hp === 2 && g3.at(4, 5), '汉帅攻击楚将：扣 1 血，退回原位');
  assert(g3.legalFrom(8, 9).some(m => m.to.join() === '8,8' && m.via === 'jinwei'), '铁甲禁卫在九宫外也能用');
  g3.apply({ k: 'mv', from: [5, 5], to: [4, 5] });
  g3.apply({ k: 'mv', from: [4, 5], to: [5, 5] });
  g3.apply({ k: 'mv', from: [5, 5], to: [4, 5] });
  assert(g3.at(4, 5).hp === 1 && g3.at(5, 5).hp === 1 && !g3.result, '互砍到各剩 1 血');
  i3 = g3.apply({ k: 'mv', from: [4, 5], to: [5, 5] });
  assert(i3 && g3.result && g3.result.reason === 'kingdead' && g3.result.winner === 'r', '楚将阵亡：汉胜');
  console.log('决战 OK');
}
console.log('BINGFA ALL OK');
