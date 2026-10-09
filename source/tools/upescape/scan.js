// 新兵自对打找“只有先升级才解得了将”的局面，并查电脑有没有一步都给不出来的时候（记下局面）。用法：node tools/upescape/scan.js 局数 输出.json
// 找“被将军、只有先升级才解得了将”的局面，看电脑给不给得出行动
const SRC = require('path').join(__dirname, '..', '..') + '/';
require(SRC + 'tools/game_load.js');
const BF = global.BF, AI = require(SRC + 'src/bfai.js');
const N = +process.argv[2] || 300;
const found = [];
(async () => {
  let games = 0, plies = 0;
  for (let g0 = 0; g0 < N && found.length < 12; g0++) {
    let seed = 1000 + g0; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const g = new BF.Game(); games++;
    for (let ply = 0; ply < 400 && !g.result; ply++) {
      plies++;
      if (g.status && g.status.mustPass) { g.apply({ k: 'pass' }); continue; }
      if (g.upOnly && g.upOnly()) { found.push(BF.cloneState(g.S)); console.log('upOnly', g0, ply, JSON.stringify(g.status), JSON.stringify(BF.evaluate(BF.cloneState(g.S)))); }
      const seq = await AI.think(BF.cloneState(g.S), 'easy');
      if (!seq.length) { found.push(BF.cloneState(g.S)); console.log('没给', g0, ply, JSON.stringify(g.status), JSON.stringify(g.result), JSON.stringify(BF.evaluate(BF.cloneState(g.S)))); break; }
      let ok = true; for (const x of seq) if (!g.apply(x)) { ok = false; break; }
      if (!ok) break;
    }
  }
  console.log('对局', games, '步', plies, '找到只能升级解将的局面', found.length);
  require('fs').writeFileSync(process.argv[3], JSON.stringify(found));
})();
