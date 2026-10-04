// 规则变体引擎（只供模拟）：在 src/bingfa.js 的基础上加两条用户 2026-10-04 提的规则，定下来后由 chat 写进 bingfa.js
//   1. 反击（CFG.counter）：士被近战打中后还手（炮、霹雳、齐射算远程，士不还手；冲阵算近战，被当跳板的士也还手）；
//      相 / 象被远程打中后还手（近战不还手）。溅射（霹雳、践踏）不触发。帅将攻击不挨反击（和拒马一样）。
//      counter.a / counter.e 开关；counter.dmg = 还手伤害（数字，或 'atk' = 按自己的攻击力）；
//      counter.onDeath = 这一下被打死了也还手（false = 活下来才还手）
//   2. 回春（skills.huichun）：满级相 / 象的主动技能，周围一格（八个方向）的己方非帅子各回 1 血（不超过上限），
//      每只象每局一次（冷却 999）；周围没人掉血时不能用。默认解锁等级 99（关），用 --set skills.huichun.level=4 打开
//   默认全关：不开任何开关时和原引擎完全一样。
// 用法：BFSIM_ENGINE=tools/variants/engine_counter.js node tools/bfsim.js ... --set counter.a=true --set counter.e=true
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
let built = null;
function enginePath() {
  if (built) return built;
  let s = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'bingfa.js'), 'utf8');
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`engine_counter：锚点出现 ${n} 次（引擎改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
  rep("    longCheckLimit: 6,\n", "    longCheckLimit: 6,\n    counter: { a: false, e: false, dmg: 1, onDeath: false },   // 变体：士反击近战、象反击远程\n");
  rep("      hujia: { cooldown: 4 },\n", "      hujia: { cooldown: 4 },\n      huichun: { level: 99, cooldown: 999, heal: 1 },   // 变体：满级相 / 象回春\n");
  rep("e: [s === 'r' ? 'qishe' : 'jianta', 'feiyue'] }", "e: [s === 'r' ? 'qishe' : 'jianta', 'feiyue', 'huichun'] }");
  rep("feiyue: '飞越' };", "feiyue: '飞越', huichun: '回春' };");
  // 反击的判定和还手
  rep("  function strike(S, from, to, side, ev, how) {\n",
`  // 变体·反击：士挨近战、象挨远程时还手；帅将出手不挨反击（同拒马）。远程 = 炮（含破釜里的炮）、霹雳、齐射
  const rangedHit = (P, how) => P.t === 'c' || how === 'pili' || how === 'qishe';
  const counters = (T, P, how) => { const C = CFG_CUR.counter; if (!C || !T || !P || T.s === P.s || P.t === 'k') return false; return T.t === 'a' ? !!C.a && !rangedHit(P, how) : T.t === 'e' ? !!C.e && rangedHit(P, how) : false; };
  // 还手打攻方（攻方站在 at_）；打死了返回 true
  function hitBack(S, at_, P, T, ev) {
    const n = CFG_CUR.counter.dmg === 'atk' ? atk(T) : CFG_CUR.counter.dmg;
    P.hp -= n;
    ev.push({ e: 'fanji', id: P.id, at: at_.slice(), by: T.id, n, hp: Math.max(0, P.hp) });
    if (P.hp <= 0) { kill(S, at_[0], at_[1], T.s, ev, 'fanji', T); return true; }
    return false;
  }
  function strike(S, from, to, side, ev, how) {
`);
  rep(`    const A = atk(P);
    if (T.hp <= A) { kill(S, to[0], to[1], side, ev, how || 'capture', P); moveTo(S, from, to, ev); return 'kill'; }
    T.hp -= A;
    ev.push({ e: 'hit', id: T.id, at: to.slice(), hp: T.hp, how: how || 'attack' });
    ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() });
    return 'hit';`,
`    const A = atk(P), ctr = counters(T, P, how);
    if (T.hp <= A) {
      kill(S, to[0], to[1], side, ev, how || 'capture', P);
      if (ctr && CFG_CUR.counter.onDeath && hitBack(S, from, P, T, ev)) return 'died';   // 变体：被打死也还手，把攻方打死了就不占位
      moveTo(S, from, to, ev); return 'kill';
    }
    T.hp -= A;
    ev.push({ e: 'hit', id: T.id, at: to.slice(), hp: T.hp, how: how || 'attack' });
    if (ctr && hitBack(S, from, P, T, ev)) return 'died';   // 变体：活下来还手
    ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() });
    return 'hit';`);
  // 冲阵：跳板是敌方士——冲阵算近战，士还手（还手打死了车，车就不落地了）
  rep(`          damage(S, a.to[0], a.to[1], CFG_CUR.skills.chongzhen.springDamage, side, ev, 'chongzhen', p);
          extra.spring = { at: a.to.slice(), killed: !S.board[a.to[1]][a.to[0]] };
          extra.res = strike(S, a.at, t.land, side, ev, 'chongzhen');`,
`          const q0 = S.board[a.to[1]][a.to[0]];
          damage(S, a.to[0], a.to[1], CFG_CUR.skills.chongzhen.springDamage, side, ev, 'chongzhen', p);
          extra.spring = { at: a.to.slice(), killed: !S.board[a.to[1]][a.to[0]] };
          if (counters(q0, p, 'chongzhen') && (S.board[a.to[1]][a.to[0]] === q0 || CFG_CUR.counter.onDeath) && hitBack(S, a.at, p, q0, ev)) extra.res = 'died';
          else extra.res = strike(S, a.at, t.land, side, ev, 'chongzhen');`);
  // 齐射：被射的是敌方象——远程，象还手
  rep(`        damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, 'qishe', p);`,
`        const q0 = S.board[a.to[1]][a.to[0]];
        damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, 'qishe', p);
        if (counters(q0, p, 'qishe') && (S.board[a.to[1]][a.to[0]] === q0 || CFG_CUR.counter.onDeath)) hitBack(S, a.at, p, q0, ev);`);
  // 回春
  rep(`        if (side === 'r' && hmActive(S)) { S.fx.hm = S.cnt.r; extra.rescue = true; ev.push({ e: 'rescue', id: p.id, at: k.slice() }); }
      } else return null;`,
`        if (side === 'r' && hmActive(S)) { S.fx.hm = S.cnt.r; extra.rescue = true; ev.push({ e: 'rescue', id: p.id, at: k.slice() }); }
      } else if (sk === 'huichun') {
        // 变体·回春：周围一格的己方非帅子各回 1 血（不超过上限）；没人掉血就不能用
        let n = 0;
        for (const [df, dr] of RING8) {
          const q = at(S, a.at[0] + df, a.at[1] + dr);
          if (!q || q.s !== side || q.t === 'k') continue;
          const mx = hpOf(q.t, q.lv); if (q.hp >= mx) continue;
          q.hp = Math.min(mx, q.hp + CFG_CUR.skills.huichun.heal); n++;
          ev.push({ e: 'heal', id: q.id, at: [a.at[0] + df, a.at[1] + dr], hp: q.hp });
        }
        if (!n) return null;
        extra.healed = n;
      } else return null;`);
  const file = path.join(os.tmpdir(), `bingfa_counter_${process.pid}.js`);
  fs.writeFileSync(file, s);
  built = file;
  return file;
}
module.exports = { enginePath };
