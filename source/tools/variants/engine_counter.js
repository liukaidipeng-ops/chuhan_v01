// 规则变体引擎（只供模拟）：在某一版的 src/bingfa.js 上加两条用户 2026-10-04 提的规则，定下来后由 chat 写进 bingfa.js
//   底版用环境变量 ENGINE_REV 指定（git 提交号，默认 98dd206 = chat 的背水一战正式版），和 engine_at.js 一样用 git show 取，不碰工作区的 src/
//   1. 反击（CFG.counter）：士被近战打中后还手（炮、霹雳、齐射算远程，士不还手；冲阵算近战，被当跳板的士也还手）；
//      相 / 象被远程打中后还手（近战不还手）。远程 = 炮（普通的炮吃子 / 炮打也算，背水那两步里的也算）、霹雳、齐射。
//      溅射（霹雳、践踏）不触发。帅将攻击不挨反击（和拒马一样）。还手算被动：四面楚歌期间楚方不还手。
//      counter.a / counter.e 开关；counter.dmg = 还手伤害（数字，或 'atk' = 按守方自己的攻击力，跟着 CFG.attack 走，比如 --set attack.a=[1,2,3,3]）；
//      counter.onDeath = 这一下被打死了也还手（false = 活下来才还手）；counter.pfSeal = 破釜封锁期也封住楚方还手（方案 A；背水一战没有封锁期，开着也不起作用）
//      背水一战（98dd206 起）：两步里每一步都是同一个 strike()，照样会挨还手——引擎的 resolve() / attempt() 和电脑用的快写法 BF.ai.pofuPairs
//        结果逐项相同（test_counter.js 拿 BF.ai.pofuPairsRef 在一批局面上核对）。被还手打死的那枚子不能再走第二步（它已经不在棋盘上）。
//        还手打死的是背水一方自己的子，是对方的击杀，不算进“两步合计最多吃 maxKills 个子”（引擎只数死掉的汉方子），也不算背水一方的战果。
//   2. 回春（skills.huichun）：满级相 / 象的主动技能，周围一格（八个方向）的己方非帅子各回 1 血（不超过上限），
//      每只象每局一次（冷却 999）；周围没人掉血时不能用。默认解锁等级 99（关），用 --set skills.huichun.level=4 打开。
//      原地的技能：背水冻结的象也能用（和拒马、齐射一样）
//   默认全关：不开任何开关时和 ENGINE_REV 那一版引擎完全一样（test_counter.js 逐项、逐局核对）。
// 用法（在 source/ 下）：
//   BFSIM_ENGINE=tools/variants/engine_counter.js ENGINE_REV=98dd206 node tools/bfsim.js --ai git:98dd206 \
//     --set beishui.on=true --set beishui.twoPieces=false --set counter.a=true --set counter.e=true [--set counter.dmg=atk] [--set counter.onDeath=true] …
//   bfsim 的预设 ctr-survive / ctr-death / ctr-atk / huichun 也用这个引擎（不设 ENGINE_REV 就是 98dd206）。自测：node tools/variants/test_counter.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let built = null;
function enginePath() {
  if (built) return built;
  const rev = process.env.ENGINE_REV || '98dd206';
  let s = execFileSync('git', ['show', rev + ':source/src/bingfa.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`engine_counter：锚点在 ${rev} 的引擎里出现 ${n} 次（引擎改过了？）：${a.slice(0, 80)}`); s = s.replace(a, b); };
  rep("    longCheckLimit: 6,\n", "    longCheckLimit: 6,\n    counter: { a: false, e: false, dmg: 1, onDeath: false, pfSeal: false },   // 变体：士反击近战、象反击远程；pfSeal = 破釜封锁期也封住楚方还手（方案 A：被动也封）\n");
  rep("      hujia: { cooldown: 4 },\n", "      hujia: { cooldown: 4 },\n      huichun: { level: 99, cooldown: 999, heal: 1 },   // 变体：满级相 / 象回春\n");
  rep("e: [s === 'r' ? 'qishe' : 'jianta', 'feiyue'] }", "e: [s === 'r' ? 'qishe' : 'jianta', 'feiyue', 'huichun'] }");
  rep("feiyue: '飞越' };", "feiyue: '飞越', huichun: '回春' };");
  // 反击的判定和还手
  rep("  function strike(S, from, to, side, ev, how) {\n",
`  // 变体·反击：士挨近战、象挨远程时还手；帅将出手不挨反击（同拒马）。远程 = 炮（含普通的炮吃子、破釜 / 背水里的炮）、霹雳、齐射
  //   strike() 是走子、技能、破釜 / 背水两步（resolve 和 pofuPairs 两种写法）共用的，还手只在这里和冲阵跳板、齐射两处结算
  //   还手打死攻方记作守方的击杀（kill 的 how = 'fanji'，死的是攻方的子）：背水的“最多吃一个子”只数死掉的汉方子，不会算进去
  const rangedHit = (P, how) => P.t === 'c' || how === 'pili' || how === 'qishe';
  const counters = (S, T, P, how) => { const C = CFG_CUR.counter; if (!C || !T || !P || T.s === P.s || P.t === 'k') return false;
    if (T.s === 'b' && (smActive(S) || (C.pfSeal && pfActive(S)))) return false;   // 还手算被动：四面楚歌期间楚军没有技能；方案 A 破釜封锁期被动也封
    return T.t === 'a' ? !!C.a && !rangedHit(P, how) : T.t === 'e' ? !!C.e && rangedHit(P, how) : false; };
  // 还手打攻方（攻方站在 at_）；打死了返回 true
  const backDmg = T => (CFG_CUR.counter.dmg === 'atk' ? atk(T) : CFG_CUR.counter.dmg);
  function hitBack(S, at_, P, T, ev, pre) {
    const n = backDmg(T);
    if (!pre) P.hp -= n;   // pre：伤害已经先扣过了（被打死也还手那一路，见 strike）
    ev.push({ e: 'fanji', id: P.id, at: at_.slice(), by: T.id, n, hp: Math.max(0, P.hp) });
    if (P.hp <= 0) { kill(S, at_[0], at_[1], T.s, ev, 'fanji', T); return true; }
    return false;
  }
  let hitLanded = false;   // 变体：上一次 strike 打中了目标之后攻方才被还手打死（霹雳的溅射照样落地）
  function strike(S, from, to, side, ev, how) {
    hitLanded = false;
`);
  rep(`    const A = atk(P);
    if (T.hp <= A) { kill(S, to[0], to[1], side, ev, how || 'capture', P); moveTo(S, from, to, ev); return 'kill'; }
    T.hp -= A;
    ev.push({ e: 'hit', id: T.id, at: to.slice(), hp: T.hp, how: how || 'attack' });
    ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() });
    return 'hit';`,
`    const A = atk(P), ctr = counters(S, T, P, how);
    if (T.hp <= A) {
      // 变体·被打死也还手：这一下和还手算同一次交手——先把还手的伤害扣在攻方身上、守方血清零，再结算击杀奖励
      //   （攻方要是被还手打死，就拿不到甲片晋升回血；已死的守方也不会再晋升）
      const back = ctr && CFG_CUR.counter.onDeath;
      if (back) { P.hp -= backDmg(T); T.hp = 0; }
      kill(S, to[0], to[1], side, ev, how || 'capture', P);
      if (back) { hitLanded = true; if (hitBack(S, from, P, T, ev, true)) return 'died'; }
      moveTo(S, from, to, ev); return 'kill';
    }
    T.hp -= A;
    ev.push({ e: 'hit', id: T.id, at: to.slice(), hp: T.hp, how: how || 'attack' });
    if (ctr) { hitLanded = true; if (hitBack(S, from, P, T, ev)) return 'died'; }   // 变体：活下来还手
    ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() });
    return 'hit';`);
  // 冲阵：跳板是敌方士——冲阵算近战，士还手（还手打死了车，车就不落地了）
  //   被打死也还手时，这里和齐射都是先结算击杀、再还手（strike 里是先扣攻方）：差别只在攻方能不能先靠甲片晋升回血，
  //   可冲阵的车 3 升 4 要 20 片甲、齐射的相已是满级，碰不到
  rep(`          damage(S, a.to[0], a.to[1], CFG_CUR.skills.chongzhen.springDamage, side, ev, 'chongzhen', p);
          extra.spring = { at: a.to.slice(), killed: !S.board[a.to[1]][a.to[0]] };
          extra.res = strike(S, a.at, t.land, side, ev, 'chongzhen');`,
`          const q0 = S.board[a.to[1]][a.to[0]];
          damage(S, a.to[0], a.to[1], CFG_CUR.skills.chongzhen.springDamage, side, ev, 'chongzhen', p);
          extra.spring = { at: a.to.slice(), killed: !S.board[a.to[1]][a.to[0]] };
          if (counters(S, q0, p, 'chongzhen') && (S.board[a.to[1]][a.to[0]] === q0 || CFG_CUR.counter.onDeath) && hitBack(S, a.at, p, q0, ev)) extra.res = 'died';
          else extra.res = strike(S, a.at, t.land, side, ev, 'chongzhen');`);
  // 齐射：被射的是敌方象——远程，象还手
  rep(`        damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, 'qishe', p);`,
`        const q0 = S.board[a.to[1]][a.to[0]];
        damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, 'qishe', p);
        if (counters(S, q0, p, 'qishe') && (S.board[a.to[1]][a.to[0]] === q0 || CFG_CUR.counter.onDeath)) hitBack(S, a.at, p, q0, ev);`);
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
  rep("        if (res !== 'died') splash(S, a.to, side, ev, 'pili', p);",
      "        if (res !== 'died' || hitLanded) splash(S, a.to, side, ev, 'pili', p);   // 变体：炮弹已经打中，炮被象还手打死，溅射照样落地");
  // 回春没有目标，不进“只要打到敌子”的静态搜索
  rep("        if (capsOnly && sk === 'hujia') continue;", "        if (capsOnly && (sk === 'hujia' || sk === 'huichun')) continue;");
  // 回春是原地的技能：背水冻结的象也能用（98dd206 的冻结规则：冻结的子只能用原地的技能）
  rep("      if (frozen(S, p) && sk !== 'juma' && sk !== 'qishe') return null;",
      "      if (frozen(S, p) && sk !== 'juma' && sk !== 'qishe' && sk !== 'huichun') return null;   // 变体：回春也是原地的技能");
  const file = path.join(os.tmpdir(), `bingfa_counter_${rev.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
  fs.writeFileSync(file, s);
  built = file;
  return file;
}
module.exports = { enginePath };
