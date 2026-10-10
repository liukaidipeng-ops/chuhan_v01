// g5 第 22 回合（楚走，review_g5-hard.json 里的局面）：线上 / UP3K / C65 / C65+UP3K 各选哪步。线上走车5,7→6,7（送车：对方第二手兵升四级神速营跳将），UP3K 走车5,7→5,4
const SRC = '/home/user/chuhan_v01/source'; process.chdir(SRC);
require(SRC + '/tools/game_load.js'); const BF = global.BF; BF.CFG.beishui.on = true; BF.CFG.r6.on = true;
const J = require(SRC + '/tools/dumbgames/review_g5-hard.json');
const N = require(SRC + '/tools/variants/bfai_next.js');
const rounds = (process.env.ROUNDS || '22').split(',').map(Number);
const NODES = +(process.env.NODES || 100000);
const vs = { live: N.make({}, 'l'), u3: N.make({ BFAI_UP3K: '2' }, 'u3'), c65: N.make({ BFAI_LMR2: '6', BFAI_NMP: '2' }, 'c65'), c65u3: N.make({ BFAI_LMR2: '6', BFAI_NMP: '2', BFAI_UP3K: '2' }, 'c65u3') };
const fmt = seq => JSON.stringify(seq).replace(/"/g, '').slice(0, 60);
(async () => {
  for (const rd of rounds) {
    const row = J.rows.find(x => x.round === rd); if (!row) continue;
    for (const [n, AI] of Object.entries(vs)) {
      AI.LEVELS.hard = { ...AI.LEVELS.hard, nodes: NODES };
      let a = 7; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
      const t0 = Date.now(); const seq = await AI.think(BF.cloneState(row.S0), 'hard'); const L = AI.think.last || {};
      console.log('第', rd, '回合', n.padEnd(6), fmt(seq || []).padEnd(28), '分', (L.score != null ? L.score : L.v != null ? L.v : '?'), '层', L.depth, '节点', L.nodes, (Date.now() - t0) + 'ms');
    }
  }
})();
