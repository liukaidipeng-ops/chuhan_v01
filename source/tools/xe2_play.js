// 极端诊断二的对局记录（用户 2026-10-05 提）：两边都是电脑，逐步记下
//   · 汉方什么时候第一次打到 / 打死楚象（“会不会上来先围剿象”）；
//   · 楚象怎么升的（电脑自己点的、还是甲片自动晋升）、最高升到几级；
//   · 有没有三级象落地秒杀全场、那一下踩死几个。
// 设定（XE2）：楚象一级 3 血 2 攻、二级 2 血 1 攻、三级 1 血 1 攻，最高三级，升级 0 功；三级象落地就践踏，范围全场、99 点（帅将除外，不伤己方）；
//   汉方车马炮攻击至少 2。引擎：tools/variants/engine_xe2.js（底版 ENGINE_REV，默认 9aca810 = 第七轮的引擎）。
// 用法（在 source/ 下）：node tools/xe2_play.js [--ai src/bfai.js | git:提交号] [--games 3] [--seed 1000] [--nodes 60000] [--mode xe2|xe3] [--normal] [--json 文件]
//   --mode xe3：再加码——两边开局各 30 功、楚象升级每级 10 功、汉方车马炮一级攻击 2 每升一级 +1（升级价照旧）。
//   --mode xe4：同 xe3，但楚开局只有 10 功（只够升到二级），给汉留出围剿的时间。
//   --mode xe5：两边 30 功；楚象一级 6 血 1 攻、二级 1 血 1 攻（无视塞象眼、落地秒杀），升级 30 功、第 7 回合起才能升；汉车马炮攻击、血都从 2 起，每级 +1。
//   --mode xe6：xe5 + 前 10 回合楚将无敌（不算被将军、不会被将死）。
//   --mode xe7：xe6 + 象升到二级后两回合无敌。
//   --normal：不开 XE2（现行规则），当对照——平常汉方打楚象有多早、多频繁。
'use strict';
process.env.ENGINE_REV = process.env.ENGINE_REV || '9aca810';
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const argv = process.argv.slice(2);
const opt = { ai: 'src/bfai.js', games: 3, seed: 1000, nodes: 60000, normal: false, mode: 'xe2', json: null, maxRounds: 150 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--ai') opt.ai = v(); else if (k === '--games') opt.games = +v(); else if (k === '--seed') opt.seed = +v();
  else if (k === '--nodes') opt.nodes = +v(); else if (k === '--normal') opt.normal = true; else if (k === '--mode') opt.mode = v(); else if (k === '--json') opt.json = v();
  else throw new Error('未知参数 ' + k);
}
const SRC = path.join(__dirname, '..', 'src');
global.XQ = require(path.join(SRC, 'rules.js'));
const BF = global.BF = require(require('./variants/engine_xe2.js').enginePath());
const XE2 = () => {
  const C = BF.CFG, J = C.skills.jianta;
  J.onMove = true; J.level = 3; J.radius = 9; J.splashDamage = 99; J.moveCooldown = 0;
  C.upgrade.cost.e = [0, 0, 0]; C.upgrade.maxLevel.e = 3;
  C.sideStats = { b: { e: { hp: [3, 2, 1], atk: [2, 1, 1] } }, r: { r: { atkMin: 2 }, n: { atkMin: 2 }, c: { atkMin: 2 } } };
};
// XE3（用户 2026-10-05 再加码）：两边开局各 30 功；楚象升级每级 10 功；汉方车马炮一级攻击 2、每升一级 +1（升级价照旧）
const XE3 = () => { XE2(); const C = BF.CFG; C.upgrade.cost.e = [10, 10, 10]; C.sideStats.r = { r: { atk: [2, 3, 4, 5] }, n: { atk: [2, 3, 4] }, c: { atk: [2, 3, 4] } }; };
// XE4（测汉会不会围剿）：同 XE3，但楚开局只有 10 功——只够把象升到二级（2 血），再攒 10 功才能秒杀；这几回合里汉该去杀象、楚该护象
// XE5（用户 2026-10-05 再加码，“看电脑会不会存钱”）：两边开局 30 功（军功上限也是 30）；楚象一级 6 血 1 攻，二级 1 血 1 攻、无视塞象眼、落地秒杀全场；
//   象升级 30 功，第 7 回合起（“6 回合以后”）才能升；汉车马炮一级攻击 2、血 2，每升一级攻击、血各 +1（升级价照旧）
const XE5 = () => {
  XE2(); const C = BF.CFG; C.skills.jianta.level = 2; C.upgrade.cost.e = [30, 30, 30]; C.upgrade.maxLevel.e = 2;
  C.sideStats = { b: { e: { hp: [6, 1], atk: [1, 1], noLegFrom: 2, upFromRound: 7 } }, r: { r: { atk: [2, 3, 4, 5], hp: [2, 3, 4, 5] }, n: { atk: [2, 3, 4], hp: [2, 3, 4] }, c: { atk: [2, 3, 4], hp: [2, 3, 4] } } };
};
// XE6（用户再加一条）：XE5 + 前 10 回合楚将无敌（不算被将军、不会被将死；500 点血只在决战里有用，这里不设）
const XE6 = () => { XE5(); BF.CFG.kingShield = { side: 'b', untilRound: 10 }; };
// XE7（用户再加一条）：XE6 + 象升到二级后两回合无敌（打不动、不掉血）
const XE7 = () => { XE6(); BF.CFG.sideStats.b.e.invOnUp = { lv: 2, rounds: 2 }; };
const START_MERIT = opt.normal ? null : ['xe3', 'xe5', 'xe6', 'xe7'].includes(opt.mode) ? { r: 30, b: 30 } : opt.mode === 'xe4' ? { r: 30, b: 10 } : null;
if (!opt.normal) ({ xe7: XE7, xe6: XE6, xe5: XE5, xe3: XE3, xe4: XE3 }[opt.mode] || XE2)();
function loadAI(spec) {
  if (!spec.startsWith('git:')) return require(path.resolve(path.join(__dirname, '..'), spec));
  const rev = spec.slice(4), file = path.join(os.tmpdir(), `bfai_${rev}_${process.pid}.js`);
  fs.writeFileSync(file, execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' }));
  process.on('exit', () => { try { fs.unlinkSync(file); } catch (e) { } });
  return require(file);
}
const AI = loadAI(opt.ai);
AI.LEVELS.mid = { ...AI.LEVELS.mid, nodes: opt.nodes };
const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
async function play(seed) {
  let a = seed >>> 0; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
  const g = new BF.Game();
  if (START_MERIT) { g.S.merit.r = START_MERIT.r; g.S.merit.b = START_MERIT.b; }
  const chuE = new Set(); for (const row of g.S.board) for (const p of row) if (p && p.s === 'b' && p.t === 'e') chuE.add(p.id);
  const R = { seed, winner: null, reason: null, rounds: 0, firstHit: null, hits: 0, kills: [], ups: [], autoups: [], maxLv: 1, wipes: [], note: '', meritB: {}, otherUpsB: 0 };
  while (!g.result) {
    if (round(g.S) > opt.maxRounds) { R.reason = 'cap'; break; }
    const side = g.S.turn;
    const seq = await AI.think(BF.cloneState(g.S), 'mid');
    if (!seq || !seq.length) { R.note = '电脑没给着'; break; }
    for (const act of seq) {
      const rd = round(g.S);
      const pc = act.k === 'up' ? g.S.board[act.at[1]][act.at[0]] : null, lv0 = pc ? pc.lv : 0;   // apply 会原地改这枚子，先记下升级前几级
      const info = g.apply(act);
      if (!info) { R.note = '非法行动 ' + JSON.stringify(act); break; }
      if (pc && chuE.has(pc.id)) R.ups.push({ round: rd, to: lv0 + 1 });
      else if (pc && pc.s === 'b') R.otherUpsB++;   // 楚把军功花在了别的子上
      let wipeKills = 0;
      for (const e of info.ev || []) {
        if (e.e === 'hit' && chuE.has(e.id) && side === 'r') { R.hits++; if (R.firstHit == null) R.firstHit = rd; }
        if (e.e === 'kill' && chuE.has(e.id)) { R.kills.push({ round: rd, how: e.how, by: side }); if (side === 'r' && R.firstHit == null) R.firstHit = rd; }
        if (e.e === 'autoup' && chuE.has(e.id)) R.autoups.push({ round: rd, lv: e.lv });
        if (e.e === 'kill' && e.how === 'jianta') wipeKills++;
      }
      if (wipeKills) R.wipes.push({ round: rd, kills: wipeKills });
      for (const row of g.S.board) for (const p of row) if (p && chuE.has(p.id) && p.lv > R.maxLv) R.maxLv = p.lv;
      if (g.result) break;
    }
    if (R.note) break;
    const rr = round(g.S); if ((rr <= 10 || rr % 5 === 0) && R.meritB[rr] == null) R.meritB[rr] = g.S.merit.b;   // 楚的军功走势（前 10 回合每回合、之后每 5 回合记一次）
  }
  R.rounds = round(g.S);
  if (g.result) { R.winner = g.result.winner; R.reason = g.result.reason; }
  return R;
}
(async () => {
  const out = [];
  for (let i = 0; i < opt.games; i++) {
    const R = await play(opt.seed + i); out.push(R);
    const killedBy = R.kills.filter(k => k.by === 'r').map(k => '第' + k.round + '回合').join('、') || '无';
    console.log(`种子 ${R.seed}：${R.winner === 'r' ? '汉胜' : R.winner === 'b' ? '楚胜' : '和/' + R.reason}（${R.reason}，${R.rounds} 回合）${R.note ? ' ' + R.note : ''}｜汉第一次打到楚象：${R.firstHit == null ? '没有' : '第 ' + R.firstHit + ' 回合'}，打中 ${R.hits} 下，杀死楚象：${killedBy}｜楚象最高 ${R.maxLv} 级，自己点升级 ${R.ups.map(u => '第' + u.round + '回合→' + u.to + '级').join('、') || '无'}，甲片自动 ${R.autoups.map(u => '第' + u.round + '回合→' + u.lv + '级').join('、') || '无'}｜秒杀全场 ${R.wipes.map(w => '第' + w.round + '回合踩死' + w.kills).join('、') || '无'}｜楚升别的子 ${R.otherUpsB} 次，楚军功 ${Object.entries(R.meritB).slice(0, 12).map(([k, v]) => k + '回合:' + v).join(' ')}`);
  }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out));
})();
