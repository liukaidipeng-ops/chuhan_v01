// 独立核对：两版电脑在“按节点数收手”下是否逐步选同一着（chat H22 说修时间控制不改节点模式着法）
// node same_moves.js A.js B.js level nodes games maxPlies
const path = require('path');
const SRC = '/home/user/chuhan_v01/source/src';
global.XQ = require(SRC + '/rules.js');
const BF = global.BF = require(SRC + '/bingfa.js');
const [fa, fb, level = 'mid', nodes = '60000', games = '3', maxPlies = '60'] = process.argv.slice(2);
const A = require(path.resolve(fa)), B = require(path.resolve(fb));
for (const X of [A, B]) X.LEVELS[level] = { ...X.LEVELS[level], nodes: +nodes };
const mul = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
(async () => {
  let same = 0, diff = 0, nA = 0, nB = 0; const diffs = [];
  for (let g = 0; g < +games; g++) {
    const G = new BF.Game();
    Math.random = mul(1000 + g);
    // 开局随机走几步，局面才不一样
    for (let i = 0; i < 6 && !G.result; i++) { const ks = BF.ai.expand(G.S); const k = ks[Math.floor(Math.random() * ks.length)]; for (const a of k.seq || [k.a]) G.apply(a); }
    for (let ply = 0; ply < +maxPlies && !G.result; ply++) {
      if (G.status && G.status.mustPass) { G.apply({ k: 'pass' }); continue; }
      const seed = 7 * g + ply * 131;
      Math.random = mul(seed); const sa = await A.think(BF.cloneState(G.S), level); nA += A.think.last.nodes;
      Math.random = mul(seed); const sb = await B.think(BF.cloneState(G.S), level); nB += B.think.last.nodes;
      if (JSON.stringify(sa) === JSON.stringify(sb) && A.think.last.nodes === B.think.last.nodes) same++; else { diff++; diffs.push({ g, ply, a: sa, b: sb, na: A.think.last.nodes, nb: B.think.last.nodes }); }
      for (const a of sa) if (!G.apply(a)) throw new Error('illegal');
    }
  }
  console.log(`${level} nodes=${nodes}: 相同 ${same}，不同 ${diff}；节点合计 A ${nA} B ${nB}`);
  if (diffs.length) console.log(JSON.stringify(diffs.slice(0, 5)));
})();
