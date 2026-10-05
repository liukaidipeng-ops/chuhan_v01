// engine_han.js 自测：默认关时和底版一样；reviveLevel、startBonus 生效
'use strict';
const assert = require('assert'), path = require('path');
global.XQ = require(path.join(__dirname, '..', '..', 'src', 'rules.js'));
const BF = global.BF = require(require('./engine_han.js').enginePath());
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };
const B = BF.CFG;
ok(B.generalArts.xiaohe.reviveLevel === 1 && B.merit.startBonus.r === 0 && B.merit.startBonus.b === 0, '默认：召回一级、没有开局加成');
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
console.log('通过', pass, '项');
