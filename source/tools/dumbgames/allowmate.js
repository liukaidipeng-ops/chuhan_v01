// 三局里汉方每一手走完以后，楚有没有一步杀（含先升级）；有的话，汉当时有没有不送杀的走法
const fs = require('fs'), SRC = '/home/user/chuhan_v01/source';
process.chdir(SRC);
const { load } = require(SRC + '/tools/game_load.js');
const BF = global.BF;
function mate1(S) {
  const starts = [{ S, up: null }];
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) starts.push({ S: U, up: [f, r] }); } }
  for (const st of starts) for (const e of BF.ai.gen(st.S, false)) {
    const R = BF.attempt(st.S, e.a); if (!R) continue;
    if (!BF.ai.inCheck(R.S, R.S.turn)) continue;
    const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === S.turn) return (st.up ? '升' + st.up + ' + ' : '') + (e.a.from || e.a.at) + '→' + (e.a.to || '');
  }
  return null;
}
for (const g of ['dumb1', 'dumb2', 'dumb3']) {
  const text = fs.readFileSync(SRC + '/tools/dumbgames/' + ({ dumb1: 'g1-mid', dumb2: 'g2-hard', dumb3: 'g3-hard' })[g] + '.txt', 'utf8'), D = JSON.parse(text.split('---DATA---\n')[1]), n = D.entries.length;
  let prev = load(text, 0).game.S, R = 0;
  for (let k = 1; k <= n; k++) {
    const S = load(text, k).game.S;
    if (prev.turn === 'r' && S.turn === 'b') {   // 汉刚走完一回合
      R = S.cnt.r; const m = mate1(S);
      if (m) {   // 汉当时能不能不送：看走之前那个局面（汉这一回合开始）里有几种走法走完后楚没有一步杀
        let k0 = k - 1; while (k0 > 0 && load(text, k0 - 1).game.S.turn === 'r') k0--;
        const S0 = load(text, k0).game.S; let safe = 0, tot = 0;
        for (const e of BF.ai.expand(S0)) { tot++; if (!mate1(e.S)) safe++; }
        console.log(`${g} 汉第 ${R} 回合走完：楚有一步杀 ${m}；汉这一回合不升级的 ${tot} 种走法里 ${safe} 种不送杀`);
      }
    }
    prev = S;
  }
}
console.log('done');
