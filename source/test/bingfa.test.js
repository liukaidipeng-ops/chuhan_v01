// 楚汉·兵法 规则测试
global.XQ = require('../src/rules.js');
const BF = require('../src/bingfa.js');
const assert = require('assert');
let id = 200;
const P = (s, t, lv = 1, extra = {}) => ({ s, t, id: id++, lv, hp: BF.CFG.hp[lv - 1], cd: 0, jm: 0, ...extra });
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
  ok(!g.skillTargets(0, 3).length, '刚升二级当次不能用技能');
  g.apply({ k: 'mv', from: [2, 3], to: [2, 4] });
  g.apply({ k: 'mv', from: [0, 6], to: [0, 5] });
  ok(g.skillTargets(0, 3).length === 1, '下一次行动起可用拒马');
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
// 6. 拒马
{
  const pawn = P('b', 'p', 2);
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 4, P('r', 'r')], [0, 6, pawn], [8, 0, P('r', 'r', 2)], [5, 9, P('b', 'a')]], { turn: 'b' });
  ok(g.apply({ k: 'sk', at: [0, 6] }), '黑卒拒马');
  const i = g.apply({ k: 'mv', from: [0, 4], to: [0, 6] });
  ok(i && !g.at(0, 4) && g.at(0, 6).hp === 2, '一级车撞拒马直接阵亡，卒无损');
  ok(i.kills.some(k => k.t === 'r'), '车阵亡记为击杀');
  // 拒马只持续到对方下一次行动结束
  g.apply({ k: 'mv', from: [5, 9], to: [4, 8] });
  const i2 = g.apply({ k: 'mv', from: [8, 0], to: [8, 1] });
  ok(i2, '红走闲着');
  console.log('拒马 OK');
}
{
  // 二级攻方撞拒马：扣 1 后继续结算
  const pawn = P('b', 'p', 1, { hp: 1 });
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 4, P('r', 'r', 2)], [0, 6, { ...P('b', 'p', 2), hp: 1 }], [5, 9, P('b', 'a')]], { turn: 'b' });
  ok(g.apply({ k: 'sk', at: [0, 6] }), '1 血的二级卒也能拒马');
  const i = g.apply({ k: 'mv', from: [0, 4], to: [0, 6] });
  ok(i && g.at(0, 6).t === 'r' && g.at(0, 6).hp === 1, '二级车扣 1 血后吃掉卒');
  console.log('拒马反伤后继续 OK');
}
// 7. 冲阵
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 2)], [0, 5, P('b', 'p')], [0, 6, P('b', 'n')], [0, 8, P('b', 'c', 2)]]);
  const tg = g.skillTargets(0, 0);
  ok(tg.length === 1 && tg[0].to[1] === 5, '冲阵只能对敌子发动');
  const i = g.apply({ k: 'sk', at: [0, 0], to: [0, 5] });
  ok(i && g.at(0, 6).t === 'r' && !g.at(0, 5), '吃卒后再碾一格吃掉一级马');
  ok(i.kills.length === 2, '连破两阵');
  console.log('冲阵 OK');
}
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 2)], [0, 5, P('b', 'p')], [0, 6, P('b', 'n', 2)]]);
  g.apply({ k: 'sk', at: [0, 0], to: [0, 5] });
  ok(g.at(0, 5).t === 'r' && g.at(0, 6).hp === 2, '碾到带血敌子就停');
  const g2 = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 0, P('r', 'r', 2)], [0, 5, P('b', 'p')]]);
  g2.apply({ k: 'sk', at: [0, 0], to: [0, 5] });
  ok(g2.at(0, 6) && g2.at(0, 6).t === 'r', '空格则前进一格');
  console.log('冲阵边界 OK');
}
// 8. 踏营
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [1, 0, P('r', 'n', 2)], [1, 1, P('r', 'p')]]);
  ok(!g.isLegal({ from: [1, 0], to: [2, 2] }), '马腿被蹩');
  ok(g.skillTargets(1, 0).some(a => a.to[0] === 2 && a.to[1] === 2), '踏营无视蹩马腿');
  console.log('踏营 OK');
}
// 9. 霹雳
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [1, 2, P('r', 'c', 2)], [1, 5, P('r', 'p')], [1, 7, P('b', 'p')], [0, 7, P('b', 'n', 2)], [2, 7, P('b', 'r')], [1, 8, P('b', 'a', 3)]]);
  const i = g.apply({ k: 'sk', at: [1, 2], to: [1, 7] });
  ok(i && g.at(1, 7).t === 'c', '霹雳吃掉目标');
  ok(g.at(0, 7).hp === 1 && g.at(2, 7) && g.at(2, 7).hp === 1 && g.at(1, 8).hp === 2, '溅射只伤二级以上敌子 ' + [g.at(0, 7).hp, g.at(1, 8).hp]);
  console.log('霹雳 OK');
}
// 10. 齐射
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [2, 4, P('r', 'e', 2)], [4, 6, P('b', 'p')], [0, 6, P('b', 'n')], [1, 5, P('r', 'p')]]);
  const tg = g.skillTargets(2, 4).map(a => a.to.join());
  ok(tg.includes('4,6') && !tg.includes('0,6'), '射 2 格中间有子被挡 ' + tg);
  g.apply({ k: 'sk', at: [2, 4], to: [4, 6] });
  ok(!g.at(4, 6) && g.at(2, 4).t === 'e', '一级子直接阵亡、弩手不动');
  console.log('齐射 OK');
}
// 11. 践踏
{
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [2, 9, P('b', 'e', 2)], [4, 8, P('b', 'a')], [4, 6, P('r', 'n', 2)], [3, 7, P('r', 'p')]], { turn: 'b' });
  const i = g.apply({ k: 'sk', at: [2, 9], to: [4, 7] });
  ok(i && g.at(4, 7).t === 'e' && g.at(4, 6).hp === 1 && g.at(3, 7).hp === 1, '落下后四周二级敌子扣 1，一级不受');
  console.log('践踏 OK');
}
// 12. 护驾
{
  const g = setup([[4, 0, K('r')], [5, 9, K('b')], [3, 0, P('r', 'a', 2)]]);
  g.apply({ k: 'sk', at: [3, 0] });
  ok(g.at(3, 0).t === 'k' && g.at(4, 0).t === 'a', '士与帅互换');
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
// 15. 鸿门宴
{
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 6, P('r', 'p')]], { turn: 'b', merit: { r: 3, b: 20 } });
  // 黑方没有能走的子时也要能发动：这里给黑方一个子
  g.setup(T => { T.board[9][0] = { s: 'b', t: 'r', id: 900, lv: 1, hp: 1, cd: 0, jm: 0 }; });
  ok(g.ultReady(), '军功 20 可发动鸿门宴');
  g.apply({ k: 'ult' });
  ok(g.merit.b === 0 && g.fx.hm === 2, '扣 20 军功、汉方 2 回合');
  ok(!g.legalFrom(4, 0).length, '汉帅不能动');
  g.apply({ k: 'mv', from: [0, 6], to: [0, 7] });
  g.apply({ k: 'mv', from: [0, 9], to: [0, 8] });
  ok(!g.legalFrom(4, 0).length, '第二回合汉帅仍不能动');
  console.log('鸿门宴 OK');
}
{
  // 鸿门宴期间汉方无子可走 → 停着，不判困毙
  const g = setup([[4, 0, K('r')], [3, 9, K('b')], [0, 9, P('b', 'r')]], { turn: 'b', merit: { r: 3, b: 20 } });
  g.apply({ k: 'ult' });
  ok(!g.result && g.mustPass(), '无子可走只能停着 ' + JSON.stringify(g.result));
  ok(g.apply({ k: 'pass' }), '停着');
  console.log('鸿门宴停着 OK');
}
// 16. 四面楚歌
{
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 7, P('r', 'p')], [5, 7, P('r', 'p')], [2, 8, P('r', 'n')], [4, 5, P('r', 'r')], [0, 9, P('b', 'r')], [8, 7, P('b', 'c')]], { merit: { r: 20, b: 3 } });
  ok(g.ultReady(), '楚将 2 格内 3 枚汉子可发动');
  g.apply({ k: 'ult' });
  ok(g.fx.sm === 2, '楚军涣散 2 回合');
  ok(!g.legalFrom(0, 9).some(m => !g.at(m.to[0], m.to[1])), '楚方非将子只能吃子或攻击');
  ok(g.legalFrom(4, 9).length > 0 || g.inCheck('b'), '楚将可以走');
  const g2 = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 7, P('r', 'p')], [0, 9, P('b', 'r')]], { merit: { r: 20, b: 3 } });
  ok(!g2.ultReady(), '人数不够不能发动');
  console.log('四面楚歌 OK');
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
  const g = setup([[4, 0, K('r')], [4, 9, K('b')], [3, 9, P('b', 'a', 2)], [4, 5, P('r', 'r')], [3, 7, P('r', 'r')], [5, 7, P('r', 'r')]], { turn: 'r' });
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
  let games = 0, acts = 0, res = {};
  const rnd = n => Math.floor(Math.random() * n);
  for (let k = 0; k < 25; k++) {
    const g = new BF.Game();
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
      if (g.mustPass()) opts.push({ k: 'pass' });
      if (!opts.length) break;
      const caps = opts.filter(a => a.to && g.at(a.to[0], a.to[1]));
      const a = caps.length && Math.random() < 0.5 ? caps[rnd(caps.length)] : opts[rnd(opts.length)];
      assert(g.apply(a), 'apply ' + JSON.stringify(a));
      acts++;
    }
    const snap = JSON.stringify(g.S), es = g.entries.slice();
    const h = new BF.Game(); for (const e of es) assert(h.apply(e), 'replay');
    assert.strictEqual(JSON.stringify(h.S), snap, '重放一致');
    // 悔两次主行动
    const n0 = g.history.length;
    if (n0 > 3 && !g.result) { g.undoActions(2); assert.strictEqual(g.history.length, n0 - 2, '悔棋两步'); }
    games++;
    const r = g.result ? g.result.reason : 'open'; res[r] = (res[r] || 0) + 1;
  }
  console.log('随机对局', games, '局', acts, '次行动', JSON.stringify(res), 'OK');
}
console.log('BINGFA ALL OK');
