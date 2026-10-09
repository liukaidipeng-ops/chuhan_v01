// 三局笨棋里汉方每一回合开始的局面（87 个）：各电脑（校尉 6 万节点）算到几层、用多少节点、和线上同一步的有几个
// 用法：先用 BFAI_UP_OUT=<目录>/<名字>.js（加各自开关）生成 upfix 变体，再 node tools/dumbgames/depth_cmp.js <目录> live <名字>...
const fs = require('fs'), SRC = '/home/user/chuhan_v01/source'; process.chdir(SRC);
const { load } = require(SRC + '/tools/game_load.js'); const BF = global.BF;
const SP = process.argv[2], names = process.argv.slice(3);
const LV = process.env.LV || 'mid', NODES = +(process.env.NODES || 60000);   // 档位和每步节点数（默认校尉 6 万）
const AIs = {}; for (const n of names) { AIs[n] = require(n === 'live' ? SRC + '/src/bfai.js' : SP + '/' + n + '.js'); AIs[n].LEVELS[LV] = { ...AIs[n].LEVELS[LV], nodes: NODES }; }
const pos = [];
for (const f of ['g1-mid', 'g2-hard', 'g3-hard']) {
  const text = fs.readFileSync('tools/dumbgames/' + f + '.txt', 'utf8'), n = JSON.parse(text.split('---DATA---\n')[1]).entries.length;
  for (let k = 0; k <= n; k++) { const S = load(text, k).game.S; if (S.turn === 'r' && !S.upgraded && !S.final) pos.push(BF.cloneState(S)); }
}
(async () => {
  const st = {}; for (const n of names) st[n] = { d: [], nodes: 0, ms: 0, same: 0 };
  const first = {};
  for (const S of pos) {
    for (const n of names) {
      let a = 7; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
      const t0 = Date.now(); const seq = await AIs[n].think(BF.cloneState(S), LV); const L = AIs[n].think.last || {};
      st[n].d.push(L.depth || 0); st[n].nodes += L.nodes || 0; st[n].ms += Date.now() - t0;
      const key = JSON.stringify(seq); if (n === names[0]) first.k = key; else if (key === first.k) st[n].same++;
    }
  }
  for (const n of names) { const d = st[n].d, h = {}; for (const x of d) h[x] = (h[x] || 0) + 1;
    console.log(n.padEnd(6), '局面', d.length, '平均层数', (d.reduce((s, x) => s + x, 0) / d.length).toFixed(2), '层数分布', JSON.stringify(h), '平均节点', Math.round(st[n].nodes / d.length), '平均毫秒', Math.round(st[n].ms / d.length), n === names[0] ? '' : '和线上同一步 ' + st[n].same); }
})();
