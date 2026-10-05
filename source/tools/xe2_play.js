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
//   --mode xe8：见下面 XE8 的说明（先升满两个士拿回血才能赢）；--plan A|B|C 让楚的升级按固定打法走（A 升士、B 攒钱、C 升马），走子仍是电脑；
//     --hanplan hunt 让汉“完美围剿”（每回合先升车再打象，打不到才交给电脑）——用来验证设定本身：A 应该稳赢、B / C 应该稳输。
//   --normal：不开 XE2（现行规则），当对照——平常汉方打楚象有多早、多频繁。
'use strict';
process.env.ENGINE_REV = process.env.ENGINE_REV || '9aca810';
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const argv = process.argv.slice(2);
const opt = { ai: 'src/bfai.js', games: 3, seed: 1000, nodes: 60000, normal: false, mode: 'xe2', plan: null, hanplan: null, json: null, maxRounds: 150, trace: false };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--ai') opt.ai = v(); else if (k === '--games') opt.games = +v(); else if (k === '--seed') opt.seed = +v();
  else if (k === '--nodes') opt.nodes = +v(); else if (k === '--normal') opt.normal = true; else if (k === '--mode') opt.mode = v(); else if (k === '--plan') opt.plan = v(); else if (k === '--hanplan') opt.hanplan = v(); else if (k === '--json') opt.json = v(); else if (k === '--trace') opt.trace = true; else if (k === '--rounds') opt.maxRounds = +v();
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
// XE8（用户提、Code 定数值，“楚想赢只有一种方法：先把两个士升满拿回血”）：
//   楚没有兵、车、炮；士 17/20/23/26 血（原定 2 血汉一下就打死、回血凑不齐，用户让提血）、2/4/6/8 攻，每级 5 功，两个士都到四级后楚全队每回合末回 8 血（回不过满血）；
//   马 50 血 0 攻，升一级（30 功）150 血 10 攻，只能往前直走一格；象一级 24 血 1 攻、不能动，第 9 回合起才能升（30 功），
//   二级 1 血、落地秒杀全场、两回合无敌、无视塞象眼；楚将前 20 回合无敌、不能动、不会被将死。
//   汉：兵、马、炮的位置都换成车（11 辆），车 5/7/9/11 血、2/4/6/8 攻，每级 2 功；帅仕相照旧。两边开局 30 功，第 10 回合末起每回合各加 30（上限仍是 30）。
//   为什么象 24 血：汉一步就打得到象，每回合最多打一下（4、6、8、8……）。先升满士（A）第 6 回合末开始回血，回血 8 = 汉单打最多 8，
//   活下来的那只象打不死，第 11 回合军功到账升象秒杀；攒钱等第 9 回合升象（B），汉第 7 回合就能打完两只象（48 血），差两回合；
//   升马（C）挡不住象。象血在 22～33 之间 A 稳活，24 让 B 也稳输（30 的话 B 要第 9 回合才刚好打死第二只，汉浪费一步 B 就赢了）。
const XE8 = () => {
  const C = BF.CFG, J = C.skills.jianta;
  J.onMove = true; J.level = 2; J.radius = 9; J.splashDamage = 99; J.moveCooldown = 0;
  Object.assign(C.upgrade.cost, { e: [30, 30, 30], a: [5, 5, 5], n: [30, 30], r: [2, 2, 2] });
  Object.assign(C.upgrade.maxLevel, { e: 2, a: 4, n: 2, r: 4 });
  if (C.r6 && C.r6.cost) C.r6.cost.r = [2, 2, 2];   // r6 的车价表优先，一起改
  C.sideStats = {
    b: { e: { hp: [24, 1], atk: [1, 1], noLegFrom: 2, upFromRound: 9, invOnUp: { lv: 2, rounds: 2 }, immobileBelow: 2 },
         a: { hp: [17, 20, 23, 26], atk: [2, 4, 6, 8] },   // 用户：“杀士就把士初始血量提上去”。A 打法里同一个士每两回合升一级（升级回满血），汉两下最多 16 → 17 血打不死
         n: { hp: [50, 150], atk: [0, 10], fwdOnly: true } },
    r: { r: { hp: [5, 7, 9, 11], atk: [2, 4, 6, 8] } },
  };
  C.kingShield = { side: 'b', untilRound: 20, immobile: true };
  C.healAura = { side: 'b', t: 'a', lv: 4, count: 2, amount: 8 };
  C.merit.autoIncomeFromRound = 11; C.merit.autoIncomePerRound = 30;
  C.chuRecall = { side: 'b', fromRound: 30, t: 'r', at: [[0, 9], [8, 9]] };   // 用户：楚第 30 回合起每回合都能召回车（踩完以后好收尾）   // 第 10 回合末起（之后每回合）两边各加 30
};
// 极端诊断九（XE9，用户 2026-10-05：“先测吧”——用最早那版的摆阵羁绊）：XE8 + 两处
//   · 楚士：斜走、横走一格，不受九宫限制，只在己方半场（不过河）；
//   · 羁绊：两个四级士都贴着同一只象（上下左右相邻）才每回合回 8 血——光升满不贴着没有。
// 2026-10-05 更正：上面第一次做 XE9 时象 24 血、士 17 血沿用了 XE8（Code 定的数），没按用户原题；用户：“这是我的测试题！……我的象是6血！”
//   现在照原题：象一级 6 血（二级 1 血）、士 2/5/8/11 血 2/4/6/8 攻；其余（马、象二级、楚将前 20 回合、提速、汉 11 车、两边 30 功）和 XE8 相同。
//   楚的车炮兵：用户“楚有炮车兵”——照常留着、数值照常（开局摆子里不拿掉）；用户为 XE8 加的“第 30 回合起楚可召回车”保留（只影响踩完后收尾）。旧的那版（24 / 17 血、没有车炮兵）留作 xe9old。
const XE9old = () => { XE8(); const C = BF.CFG; C.sideStats.b.a.freeMove = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0]]; C.healAura.adj = 'e'; };
//   用户再定：“士的升级成长提上去每级加5。目的是唯一解法就是先把最近的士挡在象头上，然后一直升级，远处的士尽快赶过来，挡在侧面”→ 士血 2/7/12/17（攻击照旧每级 +2）。
//   用户：“关掉冲阵”——车的三级技能冲阵（撞开前方第一枚子、落到它身后打那格）会跳过象头的士 / 象旁的马直接打象；XE9 里关掉（两边的车都没有）。
const XE9 = () => { XE9old(); const C = BF.CFG; C.sideStats.b.e.hp = [6, 1]; C.sideStats.b.a.hp = [2, 7, 12, 17]; C.skills.chongzhen.level = 99; };
const setupXE8 = g => g.setup(T => {
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = T.board[r][f]; if (!p) continue;
    if (p.s === 'b' && (p.t === 'p' || p.t === 'r' || p.t === 'c')) { if (opt.mode !== 'xe9') T.board[r][f] = null; }   // 楚：兵、车、炮拿掉（XE9 用户：“楚有炮车兵”，照常留着）
    else if (p.s === 'r' && (p.t === 'p' || p.t === 'n' || p.t === 'c')) { p.t = 'r'; p.lv = 1; p.hp = 5; }   // 汉：兵、马、炮的位置换成车
  }
});
const START_MERIT = opt.normal ? null : ['xe3', 'xe5', 'xe6', 'xe7', 'xe8', 'xe9', 'xe9old'].includes(opt.mode) ? { r: 30, b: 30 } : opt.mode === 'xe4' ? { r: 30, b: 10 } : null;
if (!opt.normal) ({ xe9old: XE9old, xe9: XE9, xe8: XE8, xe7: XE7, xe6: XE6, xe5: XE5, xe3: XE3, xe4: XE3 }[opt.mode] || XE2)();
// --plan A|B|C（只管楚的升级，走子仍是电脑）：A 先升满两个士；B 只攒钱；C 先升马。三套都是“象能升就升”，升完电脑自己走象。
function planUp(S) {
  if (S.upgraded) return null;
  const find = t => { const o = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === 'b' && p.t === t) o.push({ p, at: [f, r] }); } return o; };
  const can = x => !!BF.ai.upgradeState(S, x.at);
  const el = find('e').filter(can); if (el.length) return el[0].at;
  if (opt.plan === 'AF' || opt.plan === 'AFP') { const F = formTarget(S); const order = F ? [F.headA, F.sideA].filter(Boolean) : []; for (const x of order) if (x.p.lv < 4 && can(x)) return x.at; return null; }   // 象头那个士先升满
  if (opt.plan === 'A' || opt.plan === 'AF2') { const a = find('a').filter(x => x.p.lv < 4 && can(x)).sort((x, y) => x.p.lv - y.p.lv)[0]; return a ? a.at : null; }
  if (opt.plan === 'C') { const n = find('n').filter(x => x.p.lv < 2 && can(x))[0]; return n ? n.at : null; }
  return null;
}
// XE9 固定打法的“摆阵”（用户的解法）：选一只楚象（先选 (2,9) 那只，死了换另一只）；离它最近的士先走到象头（朝汉那一格），
//   远处的士再走到象的侧面（左右两格里空着的那格，或者已经站着士的那格）；一回合走一步（最短路，绕开别的子）。
//   两个都到位后把这两个士、连同贴着这只象的马冻住（p.bz，引擎里背水一战冻结的记号）不再动，走子交给电脑。
//   升级：AF = 先把象头那个士一路升满，再升另一个；AF2 = 两个士轮流升（对照：看顺序要不要紧）；F = 不升士。
//   AFP = AF + 用户定的第三步：两个士到位后，象头士前面那格空着就挑一枚一步走得到的炮 / 兵 / 车垫上去（垫好也冻住），替象头士挨一下、多撑一回合。
function formTarget(S) {
  const all = t => { const o = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === 'b' && p.t === t) o.push({ p, at: [f, r] }); } return o; };
  const els = all('e').sort((x, y) => (x.at[0] === 2 ? 0 : 1) - (y.at[0] === 2 ? 0 : 1)); if (!els.length) return null;
  const E = els[0], head = [E.at[0], E.at[1] - 1], sides = [[E.at[0] - 1, E.at[1]], [E.at[0] + 1, E.at[1]]].filter(([f, r]) => f >= 0 && f < 9);
  const advs = all('a'), same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const dist = a => Math.max(Math.abs(a.at[0] - head[0]), Math.abs(a.at[1] - head[1]));
  const onHead = advs.find(a => same(a.at, head)) || null;
  const headA = onHead || advs.slice().sort((x, y) => dist(x) - dist(y))[0] || null;
  const sideA = advs.find(a => a !== headA) || null;
  return { E, head, sides, advs, all, same, onHead, headA, sideA };
}
function bfsStep(S, a, targets) {   // a 这枚子走一步、朝 targets 里最近的空格（最短路）；已经在 targets 上返回 null
  const key = q => q[0] + ',' + q[1], prev = new Map([[key(a.at), null]]), Q = [a.at];
  const H = BF.cloneState(S); H.board[a.at[1]][a.at[0]] = null;
  while (Q.length) {
    const c = Q.shift();
    if (targets.some(t => t[0] === c[0] && t[1] === c[1]) && (c === a.at || !S.board[c[1]][c[0]])) { if (c === a.at) return null; let x = c, y = prev.get(key(c)); while (y && key(y) !== key(a.at)) { x = y; y = prev.get(key(y)); } return { k: 'mv', from: a.at.slice(), to: x.slice() }; }
    H.board[c[1]][c[0]] = a.p;
    for (const m of BF.ai.moveTargets(H, c[0], c[1])) { const t = m.to; if (H.board[t[1]][t[0]] || prev.has(key(t))) continue; prev.set(key(t), c); Q.push(t); }
    H.board[c[1]][c[0]] = null;
  }
  return null;
}
function formStep(S) {
  const F = formTarget(S); if (!F || !F.headA) return null;
  const { E, head, sides, all, same, headA, sideA } = F;
  if (!same(headA.at, head)) { const mv = bfsStep(S, headA, [head]); return mv ? { mv } : null; }   // 先上象头
  if (!sideA) return null;
  const sideOk = sides.filter(([f, r]) => { const q = S.board[r][f]; return !q || (q.s === 'b' && q.t === 'a'); });
  if (!sideOk.some(t => same(sideA.at, t))) { const mv = bfsStep(S, sideA, sideOk); return mv ? { mv } : null; }   // 远士再去侧面
  const keep = [headA, sideA]; for (const x of all('n')) if (sides.some(t => same(x.at, t))) keep.push(x);   // 贴着这只象的马也冻住
  if (opt.plan === 'AFP') {   // 用户的解法第三步：象头士前面垫一个子（炮 / 兵 / 车），替它挨一下
    const front = [head[0], head[1] - 1], q = S.board[front[1]] && S.board[front[1]][front[0]];
    if (q && q.s === 'b') keep.push({ p: q, at: front });
    else if (!q) for (const t of ['c', 'p', 'r']) for (const x of all(t)) { const mv = { k: 'mv', from: x.at.slice(), to: front.slice() }; if (BF.ai.moveTargets(S, x.at[0], x.at[1]).some(m => same(m.to, front)) && BF.attempt(S, mv)) return { done: keep, mv, pad: true }; }
  }
  return { done: keep };
}
// --hanplan hunt（验证设定用的“完美围剿”）：汉每回合只要有车打得到楚象，就先把那辆车升一级再打（先打血少的那只）；打不到才交给电脑
// --hanplan huntA：先打士（拆回血光环），打不到士再打象
// --hanplan huntW：会拆墙的汉——能直接打到象就先升车再打象；打不到就拆墙：从象往上下左右看过去，一路上的楚子算一串（帅将那条线不算），
//   先拆整串血最少的那条线、从最外面那枚（垫子）打起；现在打不到就挪一辆车到那条线上、墙后面的空格（下回合打）。
function wallSeq(S) {
  const x = huntType(S, 'e'); if (x) return x;
  const els = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === 'b' && p.t === 'e') els.push([f, r]); }
  // 从象往四个方向看过去：一路上的楚子算一串墙（碰到帅将这条线就不算——打不动；碰到汉子或出界就停），
  //   目标是这串最外面的那一枚（垫子），先拆整串血最少的那条线
  const walls = [];
  for (const [ef, er] of els) for (const [df, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    let f = ef + df, r = er + dr, chain = [], king = false;
    while (f >= 0 && f < 9 && r >= 0 && r < 10) { const q = S.board[r][f]; if (q) { if (q.s !== 'b') break; if (q.t === 'k') { king = true; break; } chain.push({ q, at: [f, r] }); } f += df; r += dr; }
    if (king || !chain.length) continue;
    const o = chain[chain.length - 1], beyond = []; let bf = o.at[0] + df, br = o.at[1] + dr; while (bf >= 0 && bf < 9 && br >= 0 && br < 10 && !S.board[br][bf]) { beyond.push([bf, br]); bf += df; br += dr; }
    walls.push({ q: o.q, at: o.at, beyond, tot: chain.reduce((t, c) => t + c.q.hp, 0) });
  }
  walls.sort((a, b) => a.tot - b.tot || a.q.hp - b.q.hp);
  const rooks = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === 'r' && p.t === 'r') rooks.push({ p, at: [f, r], mt: BF.ai.moveTargets(S, f, r) }); }
  for (const w of walls) {   // 现在就打得到：先升车再打
    let best = null;
    for (const k of rooks) { if (!k.mt.some(m => m.to[0] === w.at[0] && m.to[1] === w.at[1])) continue; const a = { k: 'mv', from: k.at, to: w.at.slice() }; if (!BF.attempt(S, a)) continue; if (!best || k.p.lv > best.p.lv) best = { ...k, a }; }
    if (best) { const seq = []; if (!S.upgraded && best.p.lv < 4 && BF.ai.upgradeState(S, best.at)) seq.push({ k: 'up', at: best.at }); seq.push(best.a); return seq; }
  }
  for (const w of walls) for (const k of rooks) for (const m of k.mt) {   // 挪到墙后面的线上，下回合打
    if (!w.beyond.some(b => b[0] === m.to[0] && b[1] === m.to[1]) || S.board[m.to[1]][m.to[0]]) continue;
    const a = { k: 'mv', from: k.at, to: m.to.slice() }; if (!BF.attempt(S, a)) continue;
    const seq = []; if (!S.upgraded && k.p.lv < 4 && BF.ai.upgradeState(S, k.at)) seq.push({ k: 'up', at: k.at }); seq.push(a); return seq;
  }
  return null;
}
function huntSeq(S) {
  if (opt.hanplan === 'huntW') return wallSeq(S);
  for (const t of opt.hanplan === 'huntA' ? ['a', 'e'] : ['e']) { const x = huntType(S, t); if (x) return x; }
  return null;
}
function huntType(S, ty) {
  const els = []; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === 'b' && p.t === ty) els.push({ p, at: [f, r] }); }
  if (!els.length) return null;
  els.sort((x, y) => x.p.hp - y.p.hp);
  for (const t of els) {
    let best = null;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== 'r' || p.t !== 'r') continue;
      if (!BF.ai.moveTargets(S, f, r).some(m => m.to[0] === t.at[0] && m.to[1] === t.at[1])) continue;
      const a = { k: 'mv', from: [f, r], to: t.at.slice() }; if (!BF.attempt(S, a)) continue;
      if (!best || p.lv > best.lv) best = { a, at: [f, r], lv: p.lv };
    }
    if (best) { const seq = []; if (!S.upgraded && best.lv < 4 && BF.ai.upgradeState(S, best.at)) seq.push({ k: 'up', at: best.at }); seq.push(best.a); return seq; }
  }
  return null;
}
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
  if (['xe8', 'xe9', 'xe9old'].includes(opt.mode) && !opt.normal) setupXE8(g);
  if (START_MERIT) { g.S.merit.r = START_MERIT.r; g.S.merit.b = START_MERIT.b; }
  const chuE = new Set(); for (const row of g.S.board) for (const p of row) if (p && p.s === 'b' && p.t === 'e') chuE.add(p.id);
  const R = { seed, winner: null, reason: null, rounds: 0, firstHit: null, hits: 0, kills: [], ups: [], autoups: [], maxLv: 1, wipes: [], note: '', meritB: {}, otherUpsB: 0, upsB: [], healFrom: null, rc: [], formAt: null, bondAt: null };
  while (!g.result) {
    if (round(g.S) > opt.maxRounds) { R.reason = 'cap'; break; }
    const side = g.S.turn;
    let pre = [];
    if (opt.plan && side === 'b') { const at = planUp(g.S); if (at) pre = [{ k: 'up', at }]; }   // 固定打法：楚的升级按计划来
    let seq;
    if ((opt.hanplan === 'hunt' || opt.hanplan === 'huntA' || opt.hanplan === 'huntW') && side === 'r' && (seq = huntSeq(g.S))) { /* 完美围剿 */ }
    else if (pre.length || (opt.plan && side === 'b')) {
      const S1 = BF.cloneState(g.S); if (pre.length) { const U = BF.ai.upgradeState(S1, pre[0].at); if (U) { Object.assign(S1, U); } } S1.upgraded = true;   // 电脑只管走子
      let fm = null;
      if (opt.plan === 'AF' || opt.plan === 'AF2' || opt.plan === 'F' || opt.plan === 'AFP') {
        const fs1 = formStep(S1);
        if (fs1 && fs1.done) for (const x of fs1.done) { const q = g.S.board[x.at[1]][x.at[0]]; if (q && !q.bz) { q.bz = 1e9; const q1 = S1.board[x.at[1]][x.at[0]]; if (q1) q1.bz = 1e9; if (R.formAt == null) R.formAt = round(g.S); } }
        if (fs1 && fs1.done) { const U = BF.CFG.generalArts.pofu.usesPerGame; g.S.used.art.b = U; S1.used.art.b = U; }   // 摆好阵后楚不再用破釜沉舟：它的两步不管冻结，会把象头的士挪走（验证脚本的漏洞，不是规则）
        if (fs1 && fs1.mv && BF.attempt(S1, fs1.mv)) { fm = fs1.mv; if (fs1.pad) { R.pads = (R.pads || 0) + 1; if (R.padAt == null) R.padAt = round(g.S); } }
      }
      seq = pre.concat(fm ? [fm] : (await AI.think(S1, 'mid')).filter(a => a.k !== 'up'));
    } else seq = await AI.think(BF.cloneState(g.S), 'mid');
    if (opt.trace && AI.think.ups) console.error(`  R${round(g.S)} ${side} 候选升级 ${JSON.stringify(AI.think.ups)} 试算 ${AI.think.last && AI.think.last.potMs}ms 用时 ${AI.think.last && AI.think.last.ms}ms`);
    if (!seq || !seq.length) { R.note = '电脑没给着'; break; }
    for (const act of seq) {
      const rd = round(g.S);
      const pc = act.k === 'up' ? g.S.board[act.at[1]][act.at[0]] : null, lv0 = pc ? pc.lv : 0;   // apply 会原地改这枚子，先记下升级前几级
      const info = g.apply(act);
      if (!info) { R.note = '非法行动 ' + JSON.stringify(act); break; }
      if (act.k === 'rc') R.rc.push(rd);
      if (pc && pc.s === 'b') R.upsB.push({ round: rd, t: pc.t, to: lv0 + 1 });
      if (pc && chuE.has(pc.id)) R.ups.push({ round: rd, to: lv0 + 1 });
      else if (pc && pc.s === 'b') R.otherUpsB++;   // 楚把军功花在了别的子上
      let wipeKills = 0;
      for (const e of info.ev || []) {
        if (e.e === 'hit' && chuE.has(e.id) && side === 'r') { R.hits++; if (R.firstHit == null) R.firstHit = rd; }
        if (e.e === 'kill' && chuE.has(e.id)) { R.kills.push({ round: rd, how: e.how, by: side }); if (side === 'r' && R.firstHit == null) R.firstHit = rd; }
        if (e.e === 'autoup' && chuE.has(e.id)) R.autoups.push({ round: rd, lv: e.lv });
        if (e.e === 'kill' && e.how === 'jianta') wipeKills++;
        if (e.e === 'heal' && R.healFrom == null) R.healFrom = rd;
      }
      if (wipeKills) R.wipes.push({ round: rd, kills: wipeKills });
      if (R.bondAt == null && BF.CFG.healAura) {   // 羁绊第一次成立（和引擎同一判法：XE8 数四级士，XE9 要贴着同一只象）
        const H = BF.CFG.healAura, ok = q => !!(q && q.s === H.side && q.t === H.t && q.lv >= H.lv); let n = 0;
        if (!H.adj) { for (const row of g.S.board) for (const q of row) if (ok(q)) n++; }
        else for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const e = g.S.board[r][f]; if (!e || e.s !== H.side || e.t !== H.adj) continue; let k = 0; for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = f + df >= 0 && f + df < 9 && r + dr >= 0 && r + dr < 10 ? g.S.board[r + dr][f + df] : null; if (ok(q)) k++; } if (k > n) n = k; }
        if (n >= H.count) R.bondAt = rd;
      }
      if (opt.trace) {   // --trace：逐着打出来（第几回合、哪方、什么着、杀了什么、回血几枚）
        const nm = id => { for (const row of g.S.board) for (const q of row) if (q && q.id === id) return q.s + q.t + q.lv; return id; };
        const ks = (info.ev || []).filter(e => e.e === 'kill').map(e => (e.how || '') + ':' + e.id), hs = (info.ev || []).filter(e => e.e === 'heal').length, rp = (info.ev || []).filter(e => e.e === 'repel').length;
        console.error(`  R${rd} ${side} ${act.k === 'up' ? 'up ' + act.at + '→' + nm(pc.id) : act.k + ' ' + (act.from || act.at || '') + '→' + (act.to || '')}${ks.length ? ' 杀' + ks.join(',') : ''}${hs ? ' 回血' + hs : ''}${rp ? ' 弹回' : ''}`);
      }
      for (const row of g.S.board) for (const p of row) if (p && chuE.has(p.id) && p.lv > R.maxLv) R.maxLv = p.lv;
      if (g.result) break;
    }
    if (R.note) break;
    const rr = round(g.S); if ((rr <= 10 || rr % 5 === 0) && R.meritB[rr] == null) R.meritB[rr] = g.S.merit.b;   // 楚的军功走势（前 10 回合每回合、之后每 5 回合记一次）
  }
  R.rounds = round(g.S);
  if (opt.trace) { console.error('  终局棋盘（大写汉、小写楚，数字=等级）：'); for (let r = 9; r >= 0; r--) console.error('  ' + g.S.board[r].map(p => !p ? ' .' : (p.s === 'r' ? p.t.toUpperCase() : p.t) + p.lv).join(' ')); console.error('  轮到 ' + g.S.turn + '，结果 ' + JSON.stringify(g.result));
    if (process.env.XE_DUMP) fs.writeFileSync(process.env.XE_DUMP, JSON.stringify(g.S)); }
  if (g.result) { R.winner = g.result.winner; R.reason = g.result.reason; }
  return R;
}
(async () => {
  const out = [];
  for (let i = 0; i < opt.games; i++) {
    const R = await play(opt.seed + i); out.push(R);
    const killedBy = R.kills.filter(k => k.by === 'r').map(k => '第' + k.round + '回合').join('、') || '无';
    if (['xe8', 'xe9', 'xe9old'].includes(opt.mode)) {
      const ups = R.upsB.map(u => ({ a: '士', n: '马', e: '象' }[u.t] || u.t) + u.to + '@' + u.round).join(' ');
      console.log(`种子 ${R.seed}：${R.winner === 'r' ? '汉胜' : R.winner === 'b' ? '楚胜' : '和/' + R.reason}（${R.reason}，${R.rounds} 回合）${R.note ? ' ' + R.note : ''}｜楚升级 ${ups || '无'}｜回血从第 ${R.healFrom == null ? '—' : R.healFrom} 回合｜象被汉打中 ${R.hits} 下，第一下第 ${R.firstHit == null ? '—' : R.firstHit} 回合，被杀 ${R.kills.filter(k => k.by === 'r').map(k => '第' + k.round + '回合').join('、') || '无'}｜秒杀 ${R.wipes.map(w => '第' + w.round + '回合踩死' + w.kills).join('、') || '无'}｜召回车 ${R.rc.length ? R.rc.length + ' 次（第 ' + R.rc[0] + ' 回合起）' : '无'}${R.formAt != null ? '｜摆好阵 第 ' + R.formAt + ' 回合' : ''}｜羁绊成立 ${R.bondAt == null ? '无' : '第 ' + R.bondAt + ' 回合'}${R.pads ? '｜垫子 ' + R.pads + ' 次（第 ' + R.padAt + ' 回合起）' : ''}`);
      continue;
    }
    console.log(`种子 ${R.seed}：${R.winner === 'r' ? '汉胜' : R.winner === 'b' ? '楚胜' : '和/' + R.reason}（${R.reason}，${R.rounds} 回合）${R.note ? ' ' + R.note : ''}｜汉第一次打到楚象：${R.firstHit == null ? '没有' : '第 ' + R.firstHit + ' 回合'}，打中 ${R.hits} 下，杀死楚象：${killedBy}｜楚象最高 ${R.maxLv} 级，自己点升级 ${R.ups.map(u => '第' + u.round + '回合→' + u.to + '级').join('、') || '无'}，甲片自动 ${R.autoups.map(u => '第' + u.round + '回合→' + u.lv + '级').join('、') || '无'}｜秒杀全场 ${R.wipes.map(w => '第' + w.round + '回合踩死' + w.kills).join('、') || '无'}｜楚升别的子 ${R.otherUpsB} 次，楚军功 ${Object.entries(R.meritB).slice(0, 12).map(([k, v]) => k + '回合:' + v).join(' ')}`);
  }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out));
})();
