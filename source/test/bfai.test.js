// 技能模式电脑：自己和自己下，检查每一步都合法、不卡死，并统计用时
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
const AI = require('../src/bfai.js');
AI.LEVELS.hard.budget = 350;   // 测试里霸王少想一会儿
(async () => {
  const pairs = [['easy', 'easy', 2], ['mid', 'easy', 2], ['hard', 'mid', 1], ['mid', 'hard', 1]];
  for (const [lr, lb, n] of pairs) {
    const res = {}; let maxMs = 0, acts = 0, kinds = {};
    for (let gi = 0; gi < n; gi++) {
      const g = new BF.Game();
      let guard = 0;
      while (!g.result && guard++ < 260) {
        const side = g.turn;
        if (g.status && g.status.mustPass) { if (!g.apply({ k: 'pass' })) throw new Error('pass 失败'); continue; }
        const seq = await AI.think(BF.cloneState(g.S), side === 'r' ? lr : lb);
        maxMs = Math.max(maxMs, AI.think.last ? AI.think.last.ms : 0);
        if (!seq.length) throw new Error('电脑没有给出行动 ' + side + ' ' + JSON.stringify(g.status));
        for (const a of seq) { if (!g.apply(a)) throw new Error('非法行动 ' + JSON.stringify(a) + ' seq=' + JSON.stringify(seq)); acts++; const k = a.k === 'sk' ? 'sk' : a.k === 'art' ? 'art' : a.k; kinds[k] = (kinds[k] || 0) + 1; }
        if (g.turn === side && !g.result) throw new Error('走完没换手 ' + JSON.stringify(seq));
      }
      const key = g.result ? g.result.winner + ':' + g.result.reason : 'open'; res[key] = (res[key] || 0) + 1;
    }
    console.log(`汉 ${lr} vs 楚 ${lb}：`, JSON.stringify(res), '行动', acts, JSON.stringify(kinds), '最慢一步', Math.round(maxMs) + 'ms');
  }
  console.log('BFAI ALL OK');
})().catch(e => { console.error(e); process.exit(1); });
