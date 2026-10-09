// 技能模式电脑的“兵法使用”策略：召回良将留着救车、破釜沉舟留着杀车、鸿门宴等进攻子到位再用
global.XQ = require('../src/rules.js');
const BF = global.BF = require('../src/bingfa.js');
const AI = require('../src/bfai.js');
const assert = require('assert');
// 按搜索节点数收手（和考卷、对打一样），结果和机器快慢无关：按时间收手时机器一忙，霸王只算到 4 层，H1、H3 就时过时不过
AI.LEVELS.mid.nodes = 60000;
AI.LEVELS.hard.nodes = 60000;
BF.CFG.r6.on = false;        // 同理：数值也照 r6 之前的那套
BF.CFG.beishui.on = false;   // 这一组是破釜沉舟那套规则下的策略题（召回不看兵力、破釜留着杀车）；背水一战的行为在 test/beishui.test.js 里核对
let id = 300;
const P = (s, t, lv = 1, x = {}) => ({ s, t, id: id++, lv, hp: BF.hpOf(t, lv), cd: 0, jm: 0, xp: 0, kills: 0, ...x });
function setup(list, turn, fn) { const g = new BF.Game(); g.setup(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) T.board[r][f] = null; for (const [f, r, p] of list) T.board[r][f] = p; T.turn = turn; if (fn) fn(T); }); return g; }
const think = async (g, lv = 'hard') => { const seq = await AI.think(BF.cloneState(g.S), lv); return seq; };
const isRevive = seq => seq.some(a => a.k === 'art' && a.id != null), isPofu = seq => seq.some(a => a.k === 'art' && a.steps), isUlt = seq => seq.some(a => a.k === 'ult');
(async () => {
  const base = [[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [5, 0, P('r', 'a')], [3, 9, P('b', 'k')], [4, 9, P('b', 'a')], [0, 3, P('r', 'p')], [8, 6, P('b', 'p')], [4, 3, P('r', 'p')], [4, 6, P('b', 'p')]];
  for (const lv of ['mid', 'hard']) {
    // P1 汉：死了一匹马（开局位 (1,0) 空着），车还在、楚军破釜沉舟没用过 → 不召回
    let g = setup([...base, [0, 0, P('r', 'r')], [8, 9, P('b', 'r')], [7, 7, P('b', 'c')]], 'r', T => { T.dead.r.push({ id: 1, t: 'n', s: 'r' }); });
    assert(g.reviveOptions().length > 0, 'P1 前提：能召回');
    let s = await think(g, lv); assert(!isRevive(s), lv + ' P1 不该为一匹马用掉召回良将: ' + JSON.stringify(s));
    // P2 汉：死的是车 → 召回
    g = setup([...base, [8, 0, P('r', 'r')], [8, 9, P('b', 'r')], [7, 7, P('b', 'c')]], 'r', T => { T.dead.r.push({ id: 0, t: 'r', s: 'r' }); });
    assert(g.reviveOptions().length > 0, 'P2 前提：能召回');
    s = await think(g, lv); assert(isRevive(s), lv + ' P2 车死了应该召回: ' + JSON.stringify(s));
    // P3 楚：汉军的召回已用，连走两步能吃掉车（炮先挪到车的那条线上、隔一个子再打）→ 用破釜沉舟
    const pf = [...base, [8, 2, P('r', 'r', 1, { id: 0 })], [6, 2, P('r', 'n')], [2, 5, P('b', 'c')], [0, 9, P('b', 'r')]];
    g = setup(pf, 'b', T => { T.used.art.r = 1; });
    s = await think(g, lv); assert(isPofu(s), lv + ' P3 该用破釜沉舟杀车: ' + JSON.stringify(s));
    // P4 楚：同样的局面，但汉军的召回还在手里 → 先不用（杀了也会被救回来）
    g = setup(pf, 'b');
    s = await think(g, lv); assert(!isPofu(s), lv + ' P4 对方召回还在，不急着用破釜沉舟: ' + JSON.stringify(s));
    // P5 楚：军功够发鸿门宴，但没有进攻子压上去 → 不发
    g = setup([...base, [0, 0, P('r', 'r')], [8, 9, P('b', 'r')], [0, 9, P('b', 'r')], [7, 7, P('b', 'c')]], 'b', T => { T.merit.b = 22; });
    s = await think(g, lv); assert(!isUlt(s), lv + ' P5 没人压上去不该发鸿门宴: ' + JSON.stringify(s));
    // P6 楚：三个进攻子已经压在汉帅跟前 → 发
    g = setup([[4, 0, P('r', 'k')], [3, 0, P('r', 'a')], [3, 9, P('b', 'k')], [0, 5, P('r', 'r')], [2, 2, P('b', 'r')], [6, 2, P('b', 'n')], [5, 3, P('b', 'c')], [8, 4, P('b', 'p')], [0, 3, P('r', 'p')]], 'b', T => { T.merit.b = 22; });
    s = await think(g, lv); console.log(lv, 'P6', JSON.stringify(s));
  }
  console.log('BFAI POLICY OK');
  // —— 血量与“打中弹回” ——
  const K = [[3, 0, P('r', 'k')], [5, 9, P('b', 'k')], [0, 3, P('r', 'p')], [8, 6, P('b', 'p')]];
  const usedB = T => { T.used.art.b = 1; };   // 这几条不测破釜沉舟
  for (const lv of ['mid', 'hard']) {
    // H1 楚炮窝在角上动不了（上面是自己的卒、旁边是自己的马），被汉马捉住；有 5 功 → 升一级多一点血：打不死，来犯的被弹回去
    let g = setup([...K, [0, 9, P('b', 'c')], [0, 8, P('b', 'p')], [1, 9, P('b', 'n')], [2, 8, P('r', 'n')], [8, 0, P('r', 'r')]], 'b', T => { T.merit.b = 5; usedB(T); });
    let s = await think(g, lv);
    assert(s[0].k === 'up' && s[0].at[0] === 0 && s[0].at[1] === 9, lv + ' H1 被捉又走不开的炮应该升级保命: ' + JSON.stringify(s));
    // H3 白打一下：汉马两点血，楚车打它不会有任何损失（下一步还能打死）→ 应该去打
    //   只考霸王：校尉只算 3 层，在它眼里车进 3 路将军（-1.54）比打马（-1.67）还高一点，加上噪声七成走将军；算到 5 层以上（8 层也是）才是打马最好
    g = setup([...K, [4, 5, P('r', 'n', 2)], [4, 8, P('b', 'r')], [8, 0, P('r', 'a')]], 'b', usedB);
    s = await think(g, lv);
    if (lv === 'hard') assert(s.some(a => a.k === 'mv' && a.to[0] === 4 && a.to[1] === 5), lv + ' H3 白打一下应该打: ' + JSON.stringify(s)); else console.log(lv, 'H3', JSON.stringify(s));
  }
  console.log('BFAI HP OK');
  // —— 观察接口（C62 B）：思考记录开、关，按节点数收手，走法和节点数逐个相同；估值拆分加起来等于 score ——
  {
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const R0 = Math.random;
    const run = async (S, lv, tr) => { seed = 12345; Math.random = rnd; AI.trace = tr; AI.think.last = null; try { const seq = await AI.think(BF.cloneState(S), lv); return { seq: JSON.stringify(seq), nodes: AI.think.last.nodes, depth: AI.think.last.depth, trace: AI.think.last.trace }; } finally { AI.trace = false; Math.random = R0; } };
    // 几个局面：开局；按新兵对校尉走几回合后的中局（技能、升级、兵法都会出现）
    const states = [];
    const g = new BF.Game(); states.push(BF.cloneState(g.S));
    seed = 777; Math.random = rnd;
    for (let k = 0; k < 24 && !g.result; k++) { const seq = await AI.think(BF.cloneState(g.S), k % 2 ? 'mid' : 'easy'); if (!seq) break; for (const a of seq) if (!g.apply(a)) break; if (k % 6 === 5 && !g.result) states.push(BF.cloneState(g.S)); }
    Math.random = R0;
    let nTr = 0;
    for (const S of states) for (const lv of ['easy', 'mid', 'hard']) {
      const off = await run(S, lv, false), on = await run(S, lv, true);
      assert.strictEqual(on.seq, off.seq, `trace 开关改了走法 ${lv}: ${off.seq} / ${on.seq}`);
      assert.strictEqual(on.nodes, off.nodes, `trace 开关改了节点数 ${lv}: ${off.nodes} / ${on.nodes}`);
      assert(!off.trace && on.trace && on.trace.seq, 'trace 只在开着时有 ' + lv + ' off:' + !!off.trace + ' on:' + JSON.stringify(on.trace || null).slice(0, 300));
      if (lv !== 'easy') { assert(on.trace.cand.length >= 1 && on.trace.iter.length >= 1, 'trace 里有候选和逐层轨迹'); nTr++; }
      const P = AI.scoreParts(S, S.turn), sum = Object.keys(P).filter(k => k !== '合计').reduce((a, k) => a + P[k], 0);
      assert(Math.abs(sum - P['合计']) < 1e-9 && P['合计'] === AI.score(S, S.turn), 'scoreParts 加起来等于 score');
    }
    console.log('BFAI TRACE OK', states.length, '个局面', nTr, '份记录');
  }
})().catch(e => { console.error(e.message || e); process.exit(1); });
