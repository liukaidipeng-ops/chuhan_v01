// 三局笨棋的关键局面：线上电脑 vs 变体，各走一步；再看走完以后楚有没有“一步杀”（含先升级）
const path = require('path'), fs = require('fs');
const SRC = '/home/user/chuhan_v01/source';
process.chdir(SRC);
const { load } = require(SRC + '/tools/game_load.js');
const BF = global.BF;
const SP = null; // 对局文件在 tools/dumbgames/
const AIs = { live: require(SRC + '/src/bfai.js'), fix: require(SRC + '/tools/variants/bfai_upfix.js') };
const NODES = { mid: +(process.env.MIDN || 60000), hard: +(process.env.HARDN || 100000) };
for (const A of Object.values(AIs)) { A.LEVELS.mid = { ...A.LEVELS.mid, nodes: NODES.mid }; A.LEVELS.hard = { ...A.LEVELS.hard, nodes: NODES.hard }; }
const POS = JSON.parse(process.env.POS || '[["dumb1",14,"mid"],["dumb1",15,"mid"],["dumb2",10,"hard"],["dumb2",16,"hard"],["dumb2",17,"hard"],["dumb3",17,"hard"],["dumb3",31,"hard"],["dumb3",32,"hard"]]');
function idxOf(text, R) {   // 第 R 回合汉方行动之前的 entries 下标
  const n = JSON.parse(text.split('---DATA---\n')[1]).entries.length;
  for (let k = 0; k <= n; k++) { const S = load(text, k).game.S; if (S.turn === 'r' && !S.upgraded && S.cnt.r === R - 1) return k; }
  return -1;
}
function mate1(S) {   // 轮到楚：有没有一步杀（可以先升级一枚子）
  const starts = [{ S, up: null }];
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === 'b' && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) starts.push({ S: U, up: [f, r] }); } }
  for (const st of starts) for (const e of BF.ai.gen(st.S, false)) {
    const R = BF.attempt(st.S, e.a); if (!R) continue;
    const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === 'b') return (st.up ? '升' + st.up + '+' : '') + JSON.stringify(e.a.from || e.a.at) + '→' + JSON.stringify(e.a.to || '');
  }
  return null;
}
const fmt = seq => seq.map(a => a.k === 'up' ? '升' + a.at : a.k === 'mv' ? a.from + '→' + a.to : a.k + (a.at ? '@' + a.at : '')).join(' + ');
(async () => {
  for (const [g, R, lv] of POS) {
    const text = fs.readFileSync(SRC + '/tools/dumbgames/' + ({ dumb1: 'g1-mid', dumb2: 'g2-hard', dumb3: 'g3-hard' })[g] + '.txt', 'utf8'), k = idxOf(text, R);
    const S0 = load(text, k).game.S;
    const line = [g + ' R' + R + '汉 (' + lv + ', 局面 #' + k + ')', '楚一步杀(走前): ' + (mate1({ ...BF.cloneState(S0), turn: 'b' }) ? '有' : '无')];
    for (const [nm, A] of Object.entries(AIs)) {
      const t0 = Date.now(); const seq = await A.think(BF.cloneState(S0), lv); const ms = Date.now() - t0;
      let S = BF.cloneState(S0); for (const a of seq) { if (a.k === 'up') S = { ...BF.cloneState(S), ...BF.ai.upgradeState(S, a.at) }; else { const r = BF.attempt(S, a); S = r.S; } }
      const m = mate1(S), L = A.think.last || {};
      line.push(`${nm}: ${fmt(seq)}  [分 ${L.v != null ? L.v.toFixed(2) : '?'}，${L.depth} 层，${L.nodes} 节点，${ms}ms] 走后楚一步杀: ${m || '无'}`);
    }
    console.log(line.join('\n   ') + '\n');
  }
})();
