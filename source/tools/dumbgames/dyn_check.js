// 难走多想补丁（bfai_dyn.patch）核对：node tools/dumbgames/dyn_check.js nodes｜time（补丁版先放到 BFAI_DYN_FILE 指的位置，默认草稿区）
const SRC = '/home/user/chuhan_v01/source'; process.chdir(SRC);
const fs = require('fs'); const { load } = require(SRC + '/tools/game_load.js'); const BF = global.BF;
const P = require(process.env.BFAI_DYN_FILE || '/tmp/dynp/bfai_dyn.js');
const V = require(SRC + '/tools/variants/bfai_next.js').make({ BFAI_UPESC: '1', BFAI_ROOTREL: '1', BFAI_ROOTATK: '1', BFAI_DYN: '2.7' }, 'dv');
const L = require(SRC + '/src/bfai.js');
const pos = [];
for (const g of ['g5-hard', 'g6-hard']) { const text = fs.readFileSync(SRC + '/tools/dumbgames/' + g + '.txt', 'utf8'); const d = JSON.parse(text.split('---DATA---\n')[1]); for (const k of Object.keys(d.think).map(Number)) pos.push(load(text, k).game.S); }
const seed = () => { let a = 7; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; }; };
(async () => {
  const mode = process.argv[2];
  if (mode === 'nodes') {
    for (const A of [P, V]) A.LEVELS.hard = { ...A.LEVELS.hard, nodes: 60000 };
    let same = 0, n = 0, dynP = 0;
    for (const S of pos.filter((x, i) => i % 3 === 0)) { const k = []; for (const A of [P, V]) { seed(); A.trace = true; k.push(JSON.stringify(await A.think(BF.cloneState(S), 'hard'))); } if (P.think.last.trace && P.think.last.trace.dyn) dynP++; n++; if (k[0] === k[1]) same++; }
    console.log('按节点（6 万）：局面', n, '补丁版 = 对打变体', same, '补丁版放宽', dynP, '次');
  } else {
    const out = {};
    for (const [nm, A] of [['线上', L], ['补丁', P]]) { const ms = []; let dn = 0; A.trace = true;
      for (const S of pos.filter((x, i) => i % 4 === 0)) { seed(); const t0 = Date.now(); await A.think(BF.cloneState(S), 'hard'); ms.push(Date.now() - t0); if (A.think.last.trace && A.think.last.trace.dyn) dn++; }
      ms.sort((a, b) => a - b); out[nm] = { n: ms.length, avg: (ms.reduce((a, b) => a + b, 0) / ms.length / 1000).toFixed(2), med: (ms[ms.length >> 1] / 1000).toFixed(2), max: (ms[ms.length - 1] / 1000).toFixed(1), dyn: dn }; }
    console.log('按时间（预算 3 秒，本机）：', JSON.stringify(out));
  }
})();
