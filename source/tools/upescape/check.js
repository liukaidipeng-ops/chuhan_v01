// 被将军、只有先升级才解得了将（H52）的局面：电脑三个档位给不给得出合法行动。用法：node tools/upescape/check.js tools/upescape/positions.json [电脑文件]
const SRC = require('path').join(__dirname, '..', '..') + '/';
require(SRC + 'tools/game_load.js');
const BF = global.BF, AI = require(process.argv[3] || SRC + 'src/bfai.js');
const st = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
(async () => {
  for (const [i, S] of st.entries()) {
    const row = [];
    for (const lv of ['easy', 'mid', 'hard']) {
      AI.LEVELS[lv] = { ...AI.LEVELS[lv], nodes: 20000 };
      const seq = await AI.think(BF.cloneState(S), lv);
      let ok = seq.length > 0; if (ok) { let T = BF.cloneState(S); for (const a of seq) { if (a.k === 'up') { const U = BF.ai.upgradeState(T, a.at); if (!U) { ok = false; break; } T = U; continue; } const r = BF.attempt(T, a); if (!r) { ok = false; break; } T = r.S; } if (ok && T.turn === S.turn && !seq.some(a => a.k !== 'up')) ok = false; }
      row.push(lv + ':' + (seq.length ? (ok ? '有着 ' : '非法 ') + seq.map(a => a.k === 'up' ? '升' + a.at : a.k).join('+') : '没给'));
    }
    const kids = BF.ai.expand(S).length;
    console.log('局面', i, BF.ai.inCheck(S, S.turn) ? '被将军' : '没被将', '普通着', kids, '|', row.join(' | '));
  }
})();
