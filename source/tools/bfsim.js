// 技能模式平衡模拟：用 src/bfai.js 的电脑自我对弈，统计汉楚胜率、对局节奏、技能 / 兵法使用率、翻盘率
// 不改任何游戏源码；调参通过 --set / --preset 在进程里覆盖 BF.CFG（和改 bingfa.js 里的 CFG 等效）
//
// 用法：node tools/bfsim.js [选项]
//   --games N        局数（默认 200）
//   --level L        双方电脑档位 easy | mid | hard（默认 mid；--red / --black 可分别指定）
//   --budget MS      霸王档每步时间上限（默认 600，原值 3800 太慢）
//   --ai FILE        双方用哪个电脑（默认 src/bfai.js；--ai-r / --ai-b 分别指定，可让两个版本对打）
//   --jobs N         并行进程数（默认 CPU 核数）
//   --max-rounds N   超过这么多回合算和（默认 150）
//   --open N         开局多样化：前 N 步（双方合计）在“差不到约 1.5 分”的着法里随机挑（默认 6；0 = 关）
//   --seed N         起始随机种子（第 i 局用 seed + i，可复现）
//   --preset NAME    预设配置（见下方 PRESETS；可多个，逗号分隔）：baseline（普通象棋对照）、no-pofu / no-revive / no-simian / no-hongmen
//                    （关掉某个兵法）、no-<技能>（如 no-chongzhen，关掉某个兵种技能）、
//                    pofu-a / pofu-b / pofu-a2pc / pofu-a16（破釜沉舟的规则变体，见 applyPatches）、
//                    revive-free / pofu-a+revive-free（召回良将不占行动，见 applyReviveFree）
//                    将帅攻击 2：--set attack.k=[2]
//   --set PATH=JSON  覆盖单个配置项，如 --set skills.jianta.splashMinLevel=2（可多次）
//   --save-ult       军功离终极兵法差 7 以内时不再升级、攒着放大招（霸王档本来就这样；校尉 / 新兵默认不攒）
//   --json FILE      把每局明细写到 FILE
//   --quiet          只输出汇总
//
// 对打（新旧电脑比强弱）：node tools/bfsim.js --match 新,旧 [--games 上限] [--sprt e0,e1] [--nodes N]
//   每个种子下两局、双方交换先后手；电脑可以写文件路径，也可以写 git:提交号（取那一版的 src/bfai.js，配当前的规则引擎）。
//   序贯检验（SPRT）：每下完一对就检验一次，能下结论就停。默认 e0,e1 = -30,10（Elo）：
//     “通过”= 新版不比旧版明显弱；“不通过”= 新版明显弱了。想证明“更强”用 --sprt 0,40。
//   --nodes N 或 mid=60000,hard=200000：电脑按搜索节点数收手（LEVELS.<档>.nodes），结果和机器快慢无关。
//   拉旧版电脑时，引擎里没有它要用的接口会直接报错（不会悄悄少功能）；版本号对不上会提示。
'use strict';
const path = require('path');
const os = require('os');
const { fork } = require('child_process');
const SRC = path.join(__dirname, '..', 'src');
// --nodes 的写法：一个数字（各档一样），或 mid=60000,hard=200000（分档）
const parseNodes = v => { if (v == null || v === '' || v === 0) return null; if (typeof v === 'object') return v; if (/^\d+$/.test(String(v))) return { '*': +v }; const o = {}; for (const kv of String(v).split(',')) { const [k, n] = kv.split('='); o[k.trim()] = +n; } return o; };
const applyNodes = (LEVELS, spec, extra = {}) => { if (!spec) return; for (const k of Object.keys(LEVELS)) { const base = k.replace(/Save$/, ''); const lv = extra[base] || base; const n = spec[lv] != null ? spec[lv] : spec['*']; if (n) LEVELS[k].nodes = n; } };


// ---------- 预设 ----------
// baseline：关掉一切技能系统（不给军功、不能升级、不能用兵法），得到同一个电脑下的“普通象棋”对照组
const PRESETS = {
  baseline: {
    set: {
      'merit.start': 0, 'merit.autoIncomeFromRound': 99999, 'merit.checkReward': 0, 'merit.pawnCrossRiverReward': 0,
      'merit.lostPieceCompensation': 0, 'merit.killRewardPerLevel': 0, 'merit.killReward': { p: 0, a: 0, e: 0, n: 0, c: 0, r: 0 },
      'upgrade.autoByPlates': false,
    },
    noArts: true,
  },
  // 单项消融：只关掉一样东西，看它对胜率的影响
  'no-simian': { set: { 'ultimates.simian.usesPerGame': 0 } },
  'no-hongmen': { set: { 'ultimates.hongmen.usesPerGame': 0 } },
  'no-ult': { set: { 'ultimates.simian.usesPerGame': 0, 'ultimates.hongmen.usesPerGame': 0 } },
  'no-revive': { set: { 'generalArts.xiaohe.usesPerGame': 0 } },
  'no-pofu': { set: { 'generalArts.pofu.usesPerGame': 0 } },
  'no-arts': { set: { 'generalArts.xiaohe.usesPerGame': 0, 'generalArts.pofu.usesPerGame': 0 } },
  'no-e4': { set: { 'upgrade.maxLevel': { r: 4, p: 4, a: 4, e: 3 } } },
};
// 规则变体（试新规则用，不改游戏源码）：在模拟进程里给引擎套一层规则，电脑和对局都受约束
//   pofu-noup（用户定的规则，2026-10-03）：同一回合不能“先升级再破釜沉舟”；破釜沉舟那一回合和之后 3 回合的封锁期里，
//              楚方不能升级（手动升级、甲片攒够的自动晋升都不行，甲片照攒），主动、被动技能都不能用
//              （践踏、神速营、回防、铁甲禁卫也封）；封锁一结束，甲片攒够的子立刻自动晋升
//   pofu-1kill：破釜沉舟两步加起来最多杀死一个敌子（践踏、溅射带走的也算；打伤不算）
//   pofu-2pc：两子合击——两步必须由两枚不同的子各走一步，同一枚子不能连走两步
//   pofu-fromN：第 N 回合起才能破釜沉舟（如 pofu-from16）
//   预设：pofu-a = noup（用户第一档）；pofu-b = noup + 1kill（用户第二档）；pofu-a2pc = noup + 2pc；pofu-a16 = noup + from16
//   注意：封锁期不封鸿门宴（终极兵法不算技能）。
//   这些变体定稿后应直接写进 bingfa.js 的 resolve()（界面上的破釜入口 pofuFirst / pofuSecond 才会一致），这里只供模拟。
//   revive-free（用户想试，2026-10-03）：召回良将不占行动——召回之后这一回合还能再走一步，召回的子这一步不能动；
//              召回的子可以当回合马上升一级（用户定的：“能，但是不能移动，这样做可以防止召回的棋子直接被秒”）（见 applyReviveFree）
PRESETS['pofu-noup'] = { set: {}, patches: ['pofu-noup'] };
PRESETS['pofu-1kill'] = { set: {}, patches: ['pofu-1kill'] };
PRESETS['pofu-2pc'] = { set: {}, patches: ['pofu-2pc'] };
PRESETS['pofu-a'] = { set: {}, patches: ['pofu-noup'] };
PRESETS['pofu-b'] = { set: {}, patches: ['pofu-noup', 'pofu-1kill'] };
PRESETS['pofu-a2pc'] = { set: {}, patches: ['pofu-noup', 'pofu-2pc'] };
PRESETS['pofu-a16'] = { set: {}, patches: ['pofu-noup', 'pofu-from16'] };
PRESETS['revive-free'] = { set: {}, patches: ['revive-free'] };
PRESETS['pofu-a+revive-free'] = { set: {}, patches: ['pofu-noup', 'revive-free'] };
function applyPatches(BF, names) {
  if (!names || !names.length) return;
  const has = n => names.includes(n);
  const fromN = (names.map(n => /^pofu-from(\d+)$/.exec(n)).find(Boolean) || [])[1];
  const isPofu = a => a && a.k === 'art' && a.steps;
  const eq = (x, y) => x[0] === y[0] && x[1] === y[1];
  const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
  const locked = S => S.turn === 'b' && S.cnt.b < S.fx.pf;                 // 破釜沉舟之后的封锁期
  const kills = ev => (ev || []).filter(e => e.e === 'kill' && !e.friendly && e.s === 'r').length;
  // 第二步是不是第一步那枚子走的：第一步之后它要么站在落点（走了 / 吃了），要么弹回原位（攻击没打死）
  const samePiece = a => eq(a.steps[1].from, a.steps[0].to) || eq(a.steps[1].from, a.steps[0].from);
  const gated = S => fromN && round(S) < +fromN;
  // 一条破釜沉舟按变体规则是否违规（S 是走之前的局面，r 是引擎结算结果，可以为空）
  const bad = (S, a, r) => isPofu(a) && ((has('pofu-noup') && S.upgraded) || gated(S) || (has('pofu-2pc') && samePiece(a)) || (has('pofu-1kill') && r && kills(r.ev) > 1));
  // 楚方破釜那一回合、封锁期里：临时关掉甲片自动晋升；封锁期里再临时封掉被动技能（把解锁等级设成 99）。
  //   bfsim 里引擎用的配置就是 BF.CFG，临时改、用完马上恢复
  const U = BF.CFG.upgrade, PASSIVE = ['jianta', 'shensu', 'huifang', 'jinwei'];
  const noAuto = (S, a, fn) => {
    if (!has('pofu-noup') || !S || S.turn !== 'b' || !(isPofu(a) || locked(S))) return fn();
    const saved = U.autoByPlates, lv = PASSIVE.map(k => BF.CFG.skills[k].level);
    U.autoByPlates = false;
    if (locked(S)) for (const k of PASSIVE) BF.CFG.skills[k].level = 99;
    try { return fn(); } finally { U.autoByPlates = saved; PASSIVE.forEach((k, i) => { BF.CFG.skills[k].level = lv[i]; }); }
  };
  // 封锁一结束（轮到楚方、楚方行动数刚好到 fx.pf）：甲片攒够下一级价钱的楚子立刻晋升（不花军功、甲片用掉、回满血）
  const promoteAfterLock = S => {
    if (!has('pofu-noup') || S.turn !== 'b' || !S.fx.pf || S.cnt.b !== S.fx.pf) return;
    for (const row of S.board) for (const p of row) {
      if (!p || p.s !== 'b' || p.t === 'k' || p.lv >= BF.maxLvOf(p.t)) continue;
      const cost = U.cost[p.t] && U.cost[p.t][p.lv - 1];
      if (cost && (p.xp || 0) * U.killDiscount >= cost) { p.lv++; p.hp = BF.hpOf(p.t, p.lv); p.xp = 0; }
    }
  };
  const attempt0 = BF.attempt;
  BF.attempt = (S, a) => { if (isPofu(a) && bad(S, a, null)) return null; const r = noAuto(S, a, () => attempt0(S, a)); return r && bad(S, a, r) ? null : r; };
  const pairs0 = BF.ai.pofuPairs;
  BF.ai.pofuPairs = (S, ...rest) => ((has('pofu-noup') && S.upgraded) || gated(S) ? [] : noAuto(S, { k: 'art', steps: [] }, () => pairs0(S, ...rest)).filter(x => !bad(S, x.a, x)));
  const exp0 = BF.ai.expand, gen0 = BF.ai.gen, mt0 = BF.ai.moveTargets;
  BF.ai.expand = S => noAuto(S, null, () => exp0(S));
  BF.ai.gen = (S, c) => noAuto(S, null, () => gen0(S, c));
  BF.ai.moveTargets = (S, f, r) => noAuto(S, null, () => mt0(S, f, r));
  if (has('pofu-noup')) {
    const up0 = BF.ai.upgradeState;
    BF.ai.upgradeState = (S, at) => (locked(S) ? null : up0(S, at));
    const can0 = BF.Game.prototype.canUpgrade;
    BF.Game.prototype.canUpgrade = function (f, r) { return locked(this.S) ? false : can0.call(this, f, r); };
  }
  const apply0 = BF.Game.prototype.apply;
  BF.Game.prototype.apply = function (e) {
    if (isPofu(e) && (bad(this.S, e, null) || bad(this.S, e, noAuto(this.S, e, () => attempt0(this.S, e))))) return null;
    const r = noAuto(this.S, e, () => apply0.call(this, e));
    if (r) promoteAfterLock(this.S);
    return r;
  };
  const legal0 = BF.Game.prototype.legalFrom;
  BF.Game.prototype.legalFrom = function (f, r) { return noAuto(this.S, null, () => legal0.call(this, f, r)); };
  if (has('revive-free')) applyReviveFree(BF);
}
// revive-free（用户想试的“召回不占行动”）：召回良将之后这一回合还能再走一步棋，召回的那枚子这一步不能动。
//   做法照抄不占行动的拒马：召回后 freeUsed = true（只能再走一步棋）、jmLock = 召回的子。
//   电脑和搜索里把“召回 + 后面那一步”当成一个组合行动 { k:'art', id, then:{k:'mv',…} }（像破釜沉舟的两步一样），
//   这样双方的搜索都知道召回不丢先手。对局里单发 { k:'art', id } 也行：先召回（不换手），下一条必须是走子。
//   召回之后只能走子：不能再架拒马、放技能、用终极兵法（和拒马之后一样）。
//   召回的子可以当回合马上升一级（每回合最多升一次，照常扣军功），升了也不能动：组合写成 { k:'art', id, up:true, then }。只供模拟。
function applyReviveFree(BF) {
  const A = BF.ai, isRevive = a => a && a.k === 'art' && a.id != null && !a.steps;
  const usesLeft = S => S.used.art.r < BF.CFG.generalArts.xiaohe.usesPerGame;
  // 召回之后（不换手）的状态；召不了返回 null。和引擎 resolve() 里的召回一样：每局次数、阵亡名单、原位要空。
  //   召回这一下本身不看将军（和不占行动的拒马一样）：被将军时“召回 + 应将的那一步”也合法
  const freeRevive = (S, id) => {
    if (S.turn !== 'r' || S.freeUsed || !usesLeft(S)) return null;
    const i = S.dead.r.findIndex(d => d.id === id); if (i < 0) return null;
    const d = S.dead.r[i], st = BF.START[d.id];
    if (!st || S.board[st[1]][st[0]]) return null;
    const T = BF.cloneState(S);
    T.dead.r.splice(i, 1);
    T.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: 1, hp: BF.hpOf(d.t, 1), cd: 0, jm: 0, xp: 0, kills: 0 };
    T.used.art.r++; T.freeUsed = true; T.jmLock = d.id;
    return { T, ev: [{ e: 'revive', id: d.id, t: d.t, at: st.slice() }] };
  };
  const reviveIds = S => { const seen = []; if (S.turn === 'r' && !S.freeUsed && usesLeft(S)) for (const d of S.dead.r) if (!seen.includes(d.id)) seen.push(d.id); return seen; };
  const attempt0 = BF.attempt;
  BF.attempt = (S, a) => {
    if (!isRevive(a) || S.turn !== 'r') return attempt0(S, a);
    if (!a.then || a.then.k !== 'mv') return null;               // 单独的召回（换手）在这个变体里不存在
    const f = freeRevive(S, a.id); if (!f) return null;
    const T = a.up ? A.upgradeState(f.T, f.ev[0].at) : f.T; if (!T) return null;
    const r = attempt0(T, a.then); if (!r || r.free) return null;
    return { ...r, kind: 'art', ev: f.ev.concat(r.ev) };
  };
  // 召回之后的两种走法：不升级 / 马上给召回的子升一级（军功够、本回合还没升过才有）。
  //   搜索内部（inner = true）只在召回的子原位会被楚方打到时才展开升级版——那正是“防止召回的棋子直接被秒”的时候；
  //   没人打得到时“先召回、以后再升”差不多，全展开会让搜索少算一层（第二轮核查实测）。根上（expand）照样全展开
  const threatened = (T, at_) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === 'b' && A.moveTargets(T, f, r).some(m => m.to[0] === at_[0] && m.to[1] === at_[1])) return true; } return false; };
  const variants = (f, inner) => { const U = A.upgradeState(f.T, f.ev[0].at); return U && (!inner || threatened(f.T, f.ev[0].at)) ? [[f.T, false], [U, true]] : [[f.T, false]]; };
  const compound = (id, up, then) => (up ? { k: 'art', id, up: true, then } : { k: 'art', id, then });
  // 搜索内部（gen）只展开电脑在根上真会召回的兵种：chat 的电脑有车在场只救车，车都没了或楚已用破釜才救炮、马，士象兵不救。
  //   每个能召回的兵种都要乘上约 40 种“后面那一步”，全展开会让汉方在攒着召回时少算一层（核查实测），
  //   跟根上的策略对齐既不丢它真会走的棋，楚方的搜索也按汉方真会做的去防
  const rookOn = S => S.board.some(row => row.some(p => p && p.s === 'r' && p.t === 'r'));
  const searchable = (S, t) => t === 'r' || ((t === 'c' || t === 'n') && (!rookOn(S) || S.used.art.b > 0));
  const gen0 = A.gen, exp0 = A.expand;
  A.gen = (S, caps) => {
    const out = gen0(S, caps);
    if (caps || S.turn !== 'r' || !out.some(it => isRevive(it.a))) return out;
    const res = out.filter(it => !isRevive(it.a));
    for (const id of reviveIds(S)) {
      const f = freeRevive(S, id); if (!f) continue;
      const t = f.ev[0].t; if (!searchable(S, t) && !A.inCheck(S, 'r')) continue;   // 被将军时什么兵种都展开（只剩召回能解将时不能当成将死）
      for (const [T, up] of variants(f, true)) for (const it of gen0(T, false)) if (it.a.k === 'mv' && it.p.id !== id) res.push({ a: compound(id, up, it.a), p: it.p, q: it.q, art: t });
    }
    return res;
  };
  // 根上（expand）全部展开：电脑自己的召回策略在 think() 里筛。不看引擎有没有列出单独召回（被将军时引擎不列，组合却可能合法）
  A.expand = S => {
    const out = exp0(S), ids = reviveIds(S);
    if (S.turn !== 'r' || !ids.length) return out;
    const res = out.filter(k => !isRevive(k.a));
    for (const id of ids) {
      const f = freeRevive(S, id); if (!f) continue;
      for (const [T, up] of variants(f, false)) for (const k of exp0(T)) if (k.a.k === 'mv') res.push({ a: compound(id, up, k.a), S: k.S, ev: f.ev.concat(k.ev) });
    }
    return res;
  };
  // 将死的判定按新规则重算：引擎的 evaluate() 还按“召回占行动”算（召回后仍被将军就不算出路）。
  //   轮到汉方、被将军时：有普通出路，或有“召回 + 应将”的组合，就不算将死；都没有才算
  const hasCompound = S => reviveIds(S).some(id => { const f = freeRevive(S, id); return f && exp0(f.T).some(k => k.a.k === 'mv'); });
  const fixMate = (g, info) => {
    const S = g.S; if (S.turn !== 'r' || S.freeUsed || !reviveIds(S).length) return;
    const mated = g.result && g.result.reason === 'checkmate' && g.result.loser === 'r';
    if (g.result ? !mated : !(g.status && g.status.check)) return;
    const alive = (!mated && exp0(S).some(k => !isRevive(k.a) && k.a.k !== 'pass')) || hasCompound(S);
    if (mated && alive) { g.result = null; g.status = { check: true }; info.result = null; }
    else if (!mated && !alive) { g.result = { winner: 'b', loser: 'r', reason: 'checkmate' }; g.status = { result: g.result }; info.result = g.result; }
  };
  // 对局：{k:'art', id} = 召回（不换手，记一条不结束回合的行动，下一条必须走子）；{k:'art', id, then} = 召回 + 那一步一起做
  const apply0 = BF.Game.prototype.apply;
  function applyRF(e) {
    if (this.result || !isRevive(e) || this.S.turn !== 'r') return apply0.call(this, e);
    const f = freeRevive(this.S, e.id); if (!f) return null;
    if (e.then ? !BF.attempt(this.S, e) : (e.up || !exp0(f.T).some(k => k.a.k === 'mv'))) return null;   // 召回之后要有一步合法的棋可走
    const before = this.S, n = this.entries.length, st0 = this.status, last0 = this.last;
    this.S = f.T;
    this.entries.push({ k: 'art', id: e.id }); this.sides.push('r'); this.ends.push(0);
    this.status = { free: true, check: this.inCheck('r') };
    const info = { k: 'art', free: true, side: 'r', mover: 'r', from: null, to: null, pid: e.id, cap: null, kills: [], ev: f.ev, extra: {}, e, check: false, result: null, before, after: this.S };
    this.last = info;
    if (!e.then) return info;
    const back = () => { this.S = before; this.entries.length = this.sides.length = this.ends.length = n; this.status = st0; this.last = last0; return null; };
    let upInfo = null;
    if (e.up && !(upInfo = apply0.call(this, { k: 'up', at: f.ev[0].at }))) return back();   // 不会发生（上面试走过）
    const r = apply0.call(this, e.then);
    if (!r) return back();
    const out = { ...r, ev: f.ev.concat(r.ev || []), revived: e.id, upInfo };
    this.last = out;
    return out;
  }
  BF.Game.prototype.apply = function (e) {
    const info = applyRF.call(this, e);
    if (info) fixMate(this, info);
    return info;
  };
}
// 电脑先定升不升级、再看破釜沉舟：pofu-noup 下它会为了升级白白放弃一次更好的破釜。
//   这里替楚方多想一次“这一回合不升级”（引擎在这一回合拒绝楚方升级，往后的回合照常），两次里取电脑自评更高的那一个。
//   破釜用掉之前，楚方每步多花一次思考。
function wrapThinkForNoUp(X, BF) {
  if (!BF.ai.__noUpHook) {
    const up0 = BF.ai.upgradeState;
    const hook = { cntb: null };
    BF.ai.upgradeState = (S2, at) => (hook.cntb != null && S2.turn === 'b' && S2.cnt.b === hook.cntb ? null : up0(S2, at));
    BF.ai.__noUpHook = hook;
  }
  const hook = BF.ai.__noUpHook, think0 = X.think;
  const wrapped = async (S, L, tick) => {
    const pofuLeft = S.turn === 'b' && S.used.art.b < BF.CFG.generalArts.pofu.usesPerGame && !S.upgraded && !(S.cnt.b < S.fx.pf);
    if (pofuLeft) {
      hook.cntb = S.cnt.b;
      let alt, lastAlt;
      try { alt = await think0(BF.cloneState(S), L, tick); lastAlt = think0.last; } finally { hook.cntb = null; }
      const m = alt[alt.length - 1];
      if (m && m.k === 'art' && m.steps) {
        const seq = await think0(S, L, tick), last = think0.last;
        if (lastAlt && last && lastAlt.v > last.v) { wrapped.last = lastAlt; return alt; }
        wrapped.last = last; return seq;
      }
    }
    const seq = await think0(S, L, tick); wrapped.last = think0.last; return seq;
  };
  X.think = wrapped;
}

// 每个兵种技能各一个“关掉”预设：把解锁等级设成 99（永远解锁不了），如 no-chongzhen、no-jianta
for (const sk of ['juma', 'chongzhen', 'taying', 'pili', 'feiyue', 'hujia', 'qishe', 'jianta', 'shensu', 'huifang', 'jinwei']) PRESETS['no-' + sk] = { set: { [`skills.${sk}.level`]: 99 } };

// ---------- 参数 ----------
function parseArgs(argv) {
  const o = { games: 200, level: 'mid', red: null, black: null, budget: 600, jobs: os.cpus().length, maxRounds: 150, open: 6, seed: 1, presets: [], sets: [], json: null, quiet: false, saveUlt: false, ai: 'src/bfai.js', aiR: null, aiB: null, match: null, sprt: null, nodes: 0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '--games') o.games = +v();
    else if (k === '--level') o.level = v();
    else if (k === '--red') o.red = v();
    else if (k === '--black') o.black = v();
    else if (k === '--budget') o.budget = +v();
    else if (k === '--jobs') o.jobs = +v();
    else if (k === '--max-rounds') o.maxRounds = +v();
    else if (k === '--open') o.open = +v();
    else if (k === '--seed') o.seed = +v();
    else if (k === '--preset') o.presets.push(...v().split(',').filter(Boolean));
    else if (k === '--set') o.sets.push(v());
    else if (k === '--json') o.json = v();
    else if (k === '--quiet') o.quiet = true;
    else if (k === '--save-ult') o.saveUlt = true;
    else if (k === '--ai') o.ai = v();
    else if (k === '--ai-r') o.aiR = v();
    else if (k === '--ai-b') o.aiB = v();
    else if (k === '--match') o.match = v().split(',');
    else if (k === '--sprt') o.sprt = v().split(',').map(Number);
    else if (k === '--nodes') o.nodes = v();
    else if (k === '--worker') o.worker = true;
    else throw new Error('未知参数 ' + k);
  }
  return o;
}
function setPath(obj, p, val) {
  const ks = p.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') throw new Error('配置里没有 ' + p); o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}
// 把预设和 --set 合成一份覆盖表
function overrides(o) {
  const set = {}; let noArts = false; const patches = [];
  for (const n of o.presets) { const P = PRESETS[n]; if (!P) throw new Error('没有这个预设 ' + n + '（可选：' + Object.keys(PRESETS).join(' ') + '）'); Object.assign(set, P.set); if (P.noArts) noArts = true; for (const x of P.patches || []) if (!patches.includes(x)) patches.push(x); }
  for (const s of o.sets) { const i = s.indexOf('='); if (i < 0) throw new Error('--set 要写成 PATH=JSON'); const raw = s.slice(i + 1); let v; try { v = JSON.parse(raw); } catch (e) { v = raw; } set[s.slice(0, i)] = v; }
  return { set, noArts, patches };
}

// ---------- 子进程：下棋 ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const VAL = { r: 9, c: 4.5, n: 4, e: 2, a: 2, p: 1, k: 0 };

function worker() {
  global.XQ = require(path.join(SRC, 'rules.js'));
  const BF = global.BF = require(path.join(SRC, 'bingfa.js'));
  let AIMAP = null;            // 名字 → 电脑模块；每局由 job.aiR / job.aiB 指定双方用哪个
  let ov = null;
  const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
  const other = s => (s === 'r' ? 'b' : 'r');
  // 中立的局面分（汉方视角）：子力按血量加价 + 军功；不用任何一个电脑自己的估值，免得两个版本对打时偏向一方
  const neutral = S => { let v = 0; for (const row of S.board) for (const p of row) if (p && p.t !== 'k') v += (p.s === 'r' ? 1 : -1) * VAL[p.t] * (1 + 0.45 * (p.hp - 1)); return v + 0.3 * (S.merit.r - S.merit.b); };
  const material = S => { const m = { r: 0, b: 0 }; for (const row of S.board) for (const p of row) if (p) m[p.s] += VAL[p.t]; return m; };

  async function play(job) {
    Math.random = mulberry32(job.seed * 2654435761);
    const lvl = { r: job.red, b: job.black };
    const AIS = { r: AIMAP[job.aiR], b: AIMAP[job.aiB] };
    const g = new BF.Game();
    if (ov.noArts) g.setup(T => { T.used.art = { r: 99, b: 99 }; T.used.ult = { r: 99, b: 99 }; });
    const side2 = () => ({ r: {}, b: {} });
    const R = {
      seed: job.seed, flip: !!job.flip, winner: null, reason: null, rounds: 0, plies: 0, final: false, finalRound: null,
      act: side2(), up: side2(), kills: side2(), hits: side2(), meritBy: side2(), friendly: side2(),
      ultRound: {}, artRound: {}, artKind: {}, firstLv: { r: {}, b: {} }, samples: [], rescue: 0, jumaCounter: side2(), msMax: 0, ms: 0,
    };
    let lastRound = 0, guard = 0;
    const sample = () => {
      const rd = g.round;
      if (rd !== lastRound && rd % 5 === 0) { lastRound = rd; const m = material(g.S); R.samples.push({ round: rd, score: +neutral(g.S).toFixed(2), mat: m, merit: { ...g.merit }, lv: lvSum(g.S) }); }
    };
    const lvSum = S => { const o = { r: 0, b: 0 }; for (const row of S.board) for (const p of row) if (p && p.t !== 'k') o[p.s] += p.lv - 1; return o; };
    const record = (a, info, side) => {
      const A = R.act[side];
      if (a.k === 'up') {
        inc(R.up[side], info.t + info.lv);
        if (R.firstLv[side][info.lv] == null) R.firstLv[side][info.lv] = g.round;
        return;
      }
      let key;
      if (a.k === 'mv') key = info.extra && info.extra.via ? 'via_' + info.extra.via : 'mv';
      else if (a.k === 'sk') key = 'sk_' + ((info.extra && info.extra.sk) || '?');
      else if (a.k === 'art') { key = a.steps ? 'art_pofu' : 'art_revive'; if (R.artRound[side] == null) { R.artRound[side] = g.round; R.artKind[side] = a.steps ? 'pofu' : (BF.START && info.ev.find(e => e.e === 'revive') || {}).t; } }
      else if (a.k === 'ult') { key = 'ult'; if (R.ultRound[side] == null) R.ultRound[side] = g.round; }
      else key = a.k;
      inc(A, key);
      if (a.k === 'art' && a.then) inc(A, info.extra && info.extra.via ? 'via_' + info.extra.via : 'mv');   // revive-free：召回之后那一步也记上
      if (a.k === 'art' && a.up && info.upInfo) { inc(A, 'art_revive_up'); inc(R.up[side], info.upInfo.t + info.upInfo.lv); if (R.firstLv[side][info.upInfo.lv] == null) R.firstLv[side][info.upInfo.lv] = g.round; }
      const via = info.extra && info.extra.via;
      for (const e of info.ev || []) {
        if (e.e === 'kill') {
          const killer = e.friendly ? e.s : other(e.s);
          let how = e.how || 'capture';
          if (how === 'capture' && via) how = 'via_' + via;
          if (e.friendly) inc(R.friendly[killer], how); else inc(R.kills[killer], how);
        } else if (e.e === 'hit') {
          inc(R.hits[side], e.how || 'attack');
        } else if (e.e === 'merit') inc(R.meritBy[e.s], e.why, e.n);
        else if (e.e === 'autoup') { inc(R.up[e.s], e.t + e.lv + '*'); if (R.firstLv[e.s][e.lv] == null) R.firstLv[e.s][e.lv] = g.round; }
        else if (e.e === 'final' && !R.final) { R.final = true; R.finalRound = g.round; }
        else if (e.e === 'rescue') R.rescue++;
        else if (e.e === 'counter') inc(R.jumaCounter[other(side)], 'hit');
      }
    };
    // 破釜沉舟前后（用户 2026-10-03：“执汉需要利用好破釜的 debuff 进行反击”）：楚那一回合开始前 s0、破釜之后 s1、
    //   封锁期结束（轮到楚、楚方行动数到 fx.pf）时 s2。分数 = 中性估值（+ 汉优），m* = 子力差（汉 − 楚）
    const matDiff = S => { const m = material(S); return m.r - m.b; };
    const pfEnd = () => { if (R.pf && R.pf.s2 == null) { R.pf.s2 = +neutral(g.S).toFixed(2); R.pf.m2 = matDiff(g.S); R.pf.endRound = g.round; } };
    while (!g.result) {
      if (g.round > job.maxRounds) { R.reason = 'cap'; break; }
      if (++guard > job.maxRounds * 6) { R.reason = 'stuck'; break; }
      const side = g.turn;
      if (side === 'b' && R.pf && g.S.cnt.b >= g.S.fx.pf) pfEnd();
      const pre = side === 'b' && !R.pf ? { s: +neutral(g.S).toFixed(2), m: matDiff(g.S) } : null;
      if (g.status && g.status.mustPass) { const info = g.apply({ k: 'pass' }); if (!info) throw new Error('pass 失败'); record({ k: 'pass' }, info, side); R.plies++; sample(); continue; }
      const t0 = Date.now();
      let L = R.plies < job.open ? 'open' : lvl[side];
      if (job.saveUlt && L !== 'hard') {
        const U = BF.CFG.ultimates, left = g.used.ult[side] < U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame;
        if (left && g.merit[side] >= U.cost - 7) L += 'Save';
      }
      const seq = await AIS[side].think(BF.cloneState(g.S), L);
      const dt = Date.now() - t0; R.ms += dt; if (dt > R.msMax) R.msMax = dt;
      const st = AIS[side].think.last; if (st && st.nodes != null) { R.nodes = (R.nodes || 0) + st.nodes; R.nodeMoves = (R.nodeMoves || 0) + 1; }
      if (!seq.length) throw new Error('电脑没有给出行动');
      for (const a of seq) {
        const info = g.apply(a);
        if (!info) throw new Error('非法行动 ' + JSON.stringify(a) + ' seed=' + job.seed);
        record(a, info, side);
      }
      if (pre && seq.some(a => a.k === 'art' && a.steps)) R.pf = { round: g.round, s0: pre.s, m0: pre.m, s1: +neutral(g.S).toFixed(2), m1: matDiff(g.S), lockTo: g.S.fx.pf };
      R.plies++;
      sample();
    }
    if (R.pf && R.pf.s2 == null) { pfEnd(); R.pf.ended = true; }   // 封锁期没过完就分了胜负（或到回合上限）
    if (g.result) { R.winner = g.result.winner; R.reason = g.result.reason; }
    // 将死时是谁在将军：将军的子有几点血、是不是贴在帅将身边（“升级后贴脸将军，一级士帅打不死”这类杀法）
    if (R.reason === 'checkmate') {
      const w = R.winner, k = global.XQ.findKing(g.board, other(w));
      const cks = global.XQ.checkers(g.board, w).map(id => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = g.board[r][f]; if (p && p.id === id) return { t: p.t, hp: p.hp, lv: p.lv, adj: k ? Math.max(Math.abs(f - k[0]), Math.abs(r - k[1])) <= 1 : false }; } return null; }).filter(Boolean);
      R.mate = { n: cks.length, hp: Math.max(0, ...cks.map(c => c.hp)), adj: cks.some(c => c.adj), hardAdj: cks.some(c => c.adj && c.hp >= 2), t: cks.map(c => c.t + c.lv).join(',') };
    }
    R.rounds = g.round;
    R.endMerit = { ...g.merit };
    R.endMat = material(g.S);
    return R;
  }

  process.on('message', async m => {
    if (m.init) try {
      ov = m.init;
      for (const [k, v] of Object.entries(ov.set)) setPath(BF.CFG, k, v);
      applyPatches(BF, ov.patches);
      const warns = [];
      // 旧版电脑：把 BF、BF.ai 包一层再加载——它用到引擎里已经没有的接口就当场报错，不会悄悄少功能
      const guard = (obj, name) => new Proxy(obj, { get(t, k) { if (k in t || typeof k === 'symbol' || k === 'then' || k === 'toJSON' || k === 'inspect') return k === 'ai' && name === 'BF' ? guard(t.ai, 'BF.ai') : t[k]; throw new Error(`电脑 ${cur} 用到了当前引擎里没有的接口 ${name}.${String(k)}`); } });
      let cur = '';
      const load = spec => {
        const file = path.resolve(__dirname, '..', spec.file);
        if (!spec.guard) return require(file);
        cur = spec.label;
        const real = global.BF; global.BF = guard(real, 'BF');
        try { delete require.cache[file]; return require(file); } finally { global.BF = real; }
      };
      AIMAP = {};
      for (const [k, spec] of Object.entries(m.ais)) {
        const X = AIMAP[k] = load(spec);
        if (BF.ai.version != null && X.apiVersion != null && X.apiVersion !== BF.ai.version) warns.push(`${spec.label} 按接口第 ${X.apiVersion} 版写的，当前引擎是第 ${BF.ai.version} 版`);
        // 25eb911 之前的电脑没有“按节点数收手”：给了 --nodes 它也照样按时间算（校尉 3 层算满），对打结果和机器快慢有关、不能精确复现
        if (parseNodes(m.nodes) && !/nodeCap|\bL\.nodes\b/.test(require('fs').readFileSync(path.resolve(__dirname, '..', spec.file), 'utf8'))) warns.push(`${spec.label} 不支持按节点数收手（--nodes 对它无效），它按时间算：结果和机器快慢有关，不能精确复现。和上一版比请用 git:25eb911 或更新的版本`);
      }
      for (const X of new Set(Object.values(AIMAP))) {
        X.LEVELS.hard.budget = m.budget;
        applyNodes(X.LEVELS, parseNodes(m.nodes), { open: 'mid' });   // 开局多样化那几步按校尉算
        // 开局多样化用：校尉的搜索深度，但在分差不大的着法里随机挑
        X.LEVELS.open = { ...X.LEVELS.mid, noise: 0.9, top: 3 };
        // 攒终极兵法：这一步不升级
        for (const k of ['easy', 'mid', 'open']) X.LEVELS[k + 'Save'] = { ...X.LEVELS[k], up: -1 };
      }
      if ((ov.patches || []).includes('pofu-noup')) for (const X of new Set(Object.values(AIMAP))) wrapThinkForNoUp(X, BF);
      process.send({ ready: true, warns });
      return;
    } catch (e) { process.send({ fatal: String(e && e.message || e) }); process.exit(1); }
    if (m.job) {
      try { process.send({ result: await play(m.job) }); }
      catch (e) { process.send({ error: String(e && e.stack || e), seed: m.job.seed }); }
    }
    if (m.exit) process.exit(0);
  });
}

// ---------- 主进程：分发、汇总 ----------
// 电脑的写法：文件路径（相对 source/），或 git:提交号（取那一版的 source/src/bfai.js 到临时文件）
function resolveAI(spec) {
  if (spec.startsWith('guard:')) return { file: spec.slice(6), label: spec, guard: true };   // 本地文件也按旧版检查接口（自测用）
  if (!spec.startsWith('git:')) return { file: spec, label: spec, guard: false };
  const rev = spec.slice(4), fs = require('fs');
  const code = require('child_process').execFileSync('git', ['show', rev + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  const file = path.join(os.tmpdir(), 'bfai-' + rev.replace(/[^\w.-]/g, '_') + '.js');
  fs.writeFileSync(file, code);
  return { file, label: spec, guard: true };
}
// 对打的统计：A 方每局得分（胜 1、和 0.5、负 0）→ Elo 差、95% 区间、序贯检验的对数似然比
const eloOf = p => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, p)) - 1);
function matchStats(rs, sprt) {
  const xs = rs.map(r => (!r.winner ? 0.5 : (r.winner === (r.flip ? 'b' : 'r') ? 1 : 0)));
  const n = xs.length, m = n ? xs.reduce((a, b) => a + b, 0) / n : 0.5, v = n ? xs.reduce((a, b) => a + b * b, 0) / n - m * m : 0.25;
  const se = Math.sqrt(Math.max(v, 1e-6) / Math.max(n, 1));
  const out = { n, score: m, elo: eloOf(m), lo: eloOf(m - 1.96 * se), hi: eloOf(m + 1.96 * se) };
  if (sprt) {
    const s0 = 1 / (1 + Math.pow(10, -sprt[0] / 400)), s1 = 1 / (1 + Math.pow(10, -sprt[1] / 400));
    out.llr = v > 1e-9 ? (s1 - s0) * (2 * m * n - n * (s0 + s1)) / (2 * v) : 0;
    out.bound = Math.log(0.95 / 0.05);   // α = β = 0.05
    out.verdict = out.llr >= out.bound ? 'H1' : out.llr <= -out.bound ? 'H0' : null;
  }
  const by = side => { const g = rs.filter(r => (r.flip ? 'b' : 'r') === side); return { n: g.length, w: g.filter(r => r.winner === side).length, d: g.filter(r => !r.winner).length }; };
  out.asR = by('r'); out.asB = by('b');
  return out;
}

async function run(o) {
  const ov = overrides(o);
  const jobs = [];
  let ais;
  if (o.match) {
    if (o.match.length !== 2) throw new Error('--match 要写成 新,旧');
    ais = { A: resolveAI(o.match[0]), B: resolveAI(o.match[1]) };
    if (!o.sprt) o.sprt = [-30, 10];
    // 每个种子两局：A 执汉一局、A 执楚一局
    for (let i = 0; i < Math.ceil(o.games / 2); i++) for (const flip of [false, true]) jobs.push({ seed: o.seed + i, flip, aiR: flip ? 'B' : 'A', aiB: flip ? 'A' : 'B', red: o.red || o.level, black: o.black || o.level, maxRounds: o.maxRounds, open: o.open, saveUlt: o.saveUlt });
  } else {
    ais = { R: resolveAI(o.aiR || o.ai), B: resolveAI(o.aiB || o.ai) };
    for (let i = 0; i < o.games; i++) jobs.push({ seed: o.seed + i, aiR: 'R', aiB: 'B', red: o.red || o.level, black: o.black || o.level, maxRounds: o.maxRounds, open: o.open, saveUlt: o.saveUlt });
  }
  const results = [], errors = [], warned = new Set();
  let next = 0, done = 0, stopped = null;
  const t0 = Date.now();
  await new Promise((resolve) => {
    const n = Math.max(1, Math.min(o.jobs, jobs.length));
    let alive = n;
    for (let w = 0; w < n; w++) {
      const c = fork(__filename, ['--worker'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      const feed = () => { if (next < jobs.length) c.send({ job: jobs[next++] }); else { c.send({ exit: true }); } };
      c.on('message', m => {
        if (m.ready) { for (const w of m.warns || []) if (!warned.has(w)) { warned.add(w); console.log('⚠ ' + w); } return feed(); }
        if (m.fatal) { if (!warned.has(m.fatal)) { warned.add(m.fatal); console.log('✗ 加载电脑失败：' + m.fatal); } next = jobs.length; return; }
        if (m.result) results.push(m.result);
        if (m.error) errors.push(m);
        done++;
        // 序贯检验：每下完一对就看一次，能下结论就不再发新局（正在下的下完为止）
        if (o.match && !stopped && done % 2 === 0) { const st = matchStats(results, o.sprt); if (st.verdict) { stopped = st; next = jobs.length; } }
        if (!o.quiet && process.stderr.isTTY) process.stderr.write(`\r${done}/${jobs.length}`);
        else if (done % 25 === 0 || done === jobs.length) process.stderr.write(`进度 ${done}/${jobs.length}  ${Math.round((Date.now() - t0) / 1000)}s` + (o.match ? (st => `  新版得分 ${pct(st.score)}  Elo ${st.elo.toFixed(0)}  LLR ${st.llr.toFixed(2)}`)(matchStats(results, o.sprt)) : '') + '\n');
        feed();
      });
      c.on('exit', () => { if (--alive === 0) resolve(); });
      c.send({ init: ov, budget: o.budget, ais, nodes: o.nodes });
    }
  });
  if (!o.quiet && process.stderr.isTTY) process.stderr.write('\n');
  results.sort((a, b) => a.seed - b.seed);
  if (o.json) require('fs').writeFileSync(o.json, JSON.stringify({ args: o, overrides: ov, results, errors }, null, 1));
  if (o.match) {
    const st = matchStats(results, o.sprt), f = x => (x >= 0 ? '+' : '') + x.toFixed(0);
    const nodeMoves = results.reduce((t, r) => t + (r.nodeMoves || 0), 0), nodes = results.reduce((t, r) => t + (r.nodes || 0), 0);
    console.log(`== 对打：新 ${o.match[0]} vs 旧 ${o.match[1]} | ${o.red || o.level} 档 | ${st.n} 局（每个种子换边各一局）| ${Math.round((Date.now() - t0) / 1000)}s ==`);
    console.log(`新版得分 ${pct(st.score)}，Elo 差 ${f(st.elo)}（95% 区间 ${f(st.lo)} ～ ${f(st.hi)}）`);
    console.log(`  新版执汉：${st.asR.n} 局 胜 ${st.asR.w} 和 ${st.asR.d}；新版执楚：${st.asB.n} 局 胜 ${st.asB.w} 和 ${st.asB.d}`);
    console.log(`序贯检验（Elo ${o.sprt[0]} 对 ${o.sprt[1]}）：LLR ${st.llr.toFixed(2)}（界 ±${st.bound.toFixed(2)}）→ ${st.verdict === 'H1' ? '通过（新版不比旧版明显弱' + (o.sprt[0] >= 0 ? '，而且更强' : '') + '）' : st.verdict === 'H0' ? '不通过（新版明显' + (o.sprt[0] >= 0 ? '没有更强' : '变弱') + '）' : '还没有结论（局数上限到了，加大 --games 再跑）'}`);
    if (o.nodes) console.log(nodeMoves ? `按节点数收手：平均每步 ${Math.round(nodes / nodeMoves)} 个节点（设定 ${o.nodes}）` : '⚠ 设了 --nodes，但电脑没有报告节点数，可能还不支持按节点数收手');
    if (errors.length) console.log(`✗ 有 ${errors.length} 局出错，这次对打的结论无效：`, errors.slice(0, 2).map(e => e.seed + ' ' + e.error.split('\n')[0]).join(' | '));
    if (o.json) require('fs').writeFileSync(o.json, JSON.stringify({ args: o, results, errors, stats: st }, null, 1));
    return st;
  }
  const sum = summarize(results);
  sum.errors = errors.length; sum.seconds = Math.round((Date.now() - t0) / 1000);
  sum.label = [o.presets.join('+'), ...o.sets, o.saveUlt ? 'save-ult' : ''].filter(Boolean).join(' ') || 'current';
  sum.level = (o.red || o.level) + ' vs ' + (o.black || o.level) + ((o.aiR || o.aiB || o.ai !== 'src/bfai.js') ? `  [汉 ${o.aiR || o.ai} | 楚 ${o.aiB || o.ai}]` : '');
  print(sum, o);
  if (errors.length) console.log('出错的局：', errors.slice(0, 3).map(e => e.seed + ' ' + e.error.split('\n')[0]).join(' | '));
  return sum;
}

function wilson(k, n) { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d]; }
const pct = x => (100 * x).toFixed(1) + '%';
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const quant = (a, q) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

function summarize(rs) {
  const N = rs.length, S = { n: N };
  const w = { r: 0, b: 0, draw: 0 };
  const reasons = {};
  for (const r of rs) { if (r.winner) w[r.winner]++; else w.draw++; reasons[(r.winner || '-') + ':' + r.reason] = (reasons[(r.winner || '-') + ':' + r.reason] || 0) + 1; }
  S.win = w; S.reasons = reasons;
  const dec = w.r + w.b;
  S.redShareDecisive = dec ? w.r / dec : 0; S.redCI = wilson(w.r, dec);
  const rounds = rs.map(r => r.rounds);
  S.rounds = { mean: mean(rounds), median: quant(rounds, 0.5), p90: quant(rounds, 0.9), within60: rounds.filter(x => x <= 60).length / N };
  S.final = rs.filter(r => r.final).length / N;
  const pfs = rs.filter(r => r.pf);
  if (pfs.length) {
    const avg = f => mean(pfs.map(f));
    S.pf = { n: pfs.length, gain: avg(r => r.pf.s1 - r.pf.s0), gainM: avg(r => r.pf.m1 - r.pf.m0), back: avg(r => r.pf.s2 - r.pf.s1), backM: avg(r => r.pf.m2 - r.pf.m1),
      half: pfs.filter(r => r.pf.s2 - r.pf.s1 >= -(r.pf.s1 - r.pf.s0) / 2).length / pfs.length, ended: pfs.filter(r => r.pf.ended).length,
      redWin: pfs.filter(r => r.winner === 'r').length / pfs.length };
  }
  const mates = rs.filter(r => r.mate);
  S.mate = { n: mates.length, hard: mates.filter(r => r.mate.hp >= 2).length, hardAdj: mates.filter(r => r.mate.hardAdj).length, double: mates.filter(r => r.mate.n >= 2).length };
  // 每方每种行动：用过的局占比、平均次数
  const keys = new Set();
  for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.act[s])) keys.add(k);
  S.act = {};
  for (const k of [...keys].sort()) S.act[k] = { r: use(rs, r => r.act.r[k]), b: use(rs, r => r.act.b[k]) };
  const ukeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.up[s])) ukeys.add(k);
  S.up = {}; for (const k of [...ukeys].sort()) S.up[k] = { r: use(rs, r => r.up.r[k]), b: use(rs, r => r.up.b[k]) };
  const kkeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.kills[s])) kkeys.add(k);
  S.kills = {}; for (const k of [...kkeys].sort()) S.kills[k] = { r: use(rs, r => r.kills.r[k]), b: use(rs, r => r.kills.b[k]) };
  const hkeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.hits[s])) hkeys.add(k);
  S.hits = {}; for (const k of [...hkeys].sort()) S.hits[k] = { r: use(rs, r => r.hits.r[k]), b: use(rs, r => r.hits.b[k]) };
  const mkeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.meritBy[s])) mkeys.add(k);
  S.merit = {}; for (const k of [...mkeys].sort()) S.merit[k] = { r: mean(rs.map(r => r.meritBy.r[k] || 0)), b: mean(rs.map(r => r.meritBy.b[k] || 0)) };
  // 兵法、终极兵法：用了的局里，用的一方赢了多少
  const usedWin = (pick) => { const g = { r: [0, 0], b: [0, 0] }; for (const r of rs) for (const s of ['r', 'b']) if (pick(r)[s] != null) { g[s][0]++; if (r.winner === s) g[s][1]++; } return g; };
  S.ult = { used: usedWin(r => r.ultRound), round: { r: mean(rs.filter(r => r.ultRound.r != null).map(r => r.ultRound.r)), b: mean(rs.filter(r => r.ultRound.b != null).map(r => r.ultRound.b)) } };
  S.art = { used: usedWin(r => r.artRound), round: { r: mean(rs.filter(r => r.artRound.r != null).map(r => r.artRound.r)), b: mean(rs.filter(r => r.artRound.b != null).map(r => r.artRound.b)) } };
  S.rescue = rs.filter(r => r.rescue).length;
  // 翻盘：第 R 回合时局面分落后 ≥ T 的一方，最后赢了的比例
  S.comeback = {};
  for (const rd of [10, 20, 30]) for (const T of [2, 4]) {
    let n = 0, k = 0, nd = 0;
    for (const r of rs) {
      const s = r.samples.find(x => x.round === rd); if (!s || Math.abs(s.score) < T) continue;
      n++; const behind = s.score < 0 ? 'r' : 'b'; if (r.winner === behind) k++; if (!r.winner) nd++;
    }
    S.comeback[`R${rd}≥${T}`] = { n, trailingWins: k, draws: nd };
  }
  // 局面分（汉方视角）随回合
  S.scoreByRound = {};
  for (const rd of [5, 10, 15, 20, 30, 40]) { const xs = rs.map(r => r.samples.find(x => x.round === rd)).filter(Boolean); if (xs.length >= N * 0.2) S.scoreByRound[rd] = { n: xs.length, score: mean(xs.map(x => x.score)), meritR: mean(xs.map(x => x.merit.r)), meritB: mean(xs.map(x => x.merit.b)), lvR: mean(xs.map(x => x.lv.r)), lvB: mean(xs.map(x => x.lv.b)) }; }
  S.firstLv = {};
  for (const L of [2, 3, 4]) S.firstLv[L] = { r: mean(rs.filter(r => r.firstLv.r[L] != null).map(r => r.firstLv.r[L])), b: mean(rs.filter(r => r.firstLv.b[L] != null).map(r => r.firstLv.b[L])), rn: rs.filter(r => r.firstLv.r[L] != null).length / N, bn: rs.filter(r => r.firstLv.b[L] != null).length / N };
  S.msPerPly = mean(rs.map(r => r.ms / Math.max(1, r.plies)));
  return S;
  function use(rs, f) { let g = 0, t = 0; for (const r of rs) { const v = f(r) || 0; if (v) g++; t += v; } return { games: g / N, avg: t / N }; }
}

const CN = {
  mv: '普通走子', pass: '停着', ult: '终极兵法', art_revive: '召回良将', art_revive_up: '召回后马上升级', art_pofu: '破釜沉舟',
  sk_juma: '拒马', sk_chongzhen: '冲阵', sk_taying: '踏营', sk_pili: '霹雳', sk_qishe: '齐射', sk_hujia: '护驾', sk_feiyue: '飞越',
  via_shensu: '神速营(被动)', via_huifang: '回防(被动)', via_jinwei: '铁甲禁卫(被动)',
  capture: '普通吃子', chongzhen: '冲阵', taying: '踏营', pili: '霹雳', qishe: '齐射', jianta: '践踏', juma: '拒马反伤', feiyue: '飞越', attack: '强攻',
};
function print(S, o) {
  const L = [];
  const cn = k => CN[k] || k;
  const ci = S.redCI.map(x => (100 * x).toFixed(0)).join('–');
  L.push(`== ${S.label} | ${S.level} | ${S.n} 局 | ${S.seconds}s ==`);
  L.push(`胜负：汉 ${S.win.r}  楚 ${S.win.b}  和/超时 ${S.win.draw}   汉方胜率（分胜负的局）${pct(S.redShareDecisive)}  95%CI ${ci}%`);
  L.push(`结局：${Object.entries(S.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join('  ')}`);
  L.push(`回合：平均 ${S.rounds.mean.toFixed(1)}  中位 ${S.rounds.median}  P90 ${S.rounds.p90}  60 回合内结束 ${pct(S.rounds.within60)}  进入决战 ${pct(S.final)}`);
  if (S.mate && S.mate.n) L.push(`将死 ${S.mate.n} 局：将军的子有 2 血以上 ${pct(S.mate.hard / S.mate.n)}（其中贴在帅将身边 ${pct(S.mate.hardAdj / S.mate.n)}），双将 ${pct(S.mate.double / S.mate.n)}`);
  if (o.quiet) { console.log(L.join('\n')); return; }
  L.push('行动（用过的局占比 / 每局平均次数）  汉 | 楚');
  for (const [k, v] of Object.entries(S.act)) L.push(`  ${cn(k).padEnd(10)} ${pct(v.r.games).padStart(6)} ${v.r.avg.toFixed(2).padStart(6)} | ${pct(v.b.games).padStart(6)} ${v.b.avg.toFixed(2).padStart(6)}`);
  L.push('升级（* = 甲片自动晋升）  汉 | 楚 （用过的局占比 / 每局平均）');
  for (const [k, v] of Object.entries(S.up)) L.push(`  ${k.padEnd(5)} ${pct(v.r.games).padStart(6)} ${v.r.avg.toFixed(2).padStart(5)} | ${pct(v.b.games).padStart(6)} ${v.b.avg.toFixed(2).padStart(5)}`);
  L.push('击杀来源（每局平均）  汉 | 楚');
  for (const [k, v] of Object.entries(S.kills)) L.push(`  ${cn(k).padEnd(10)} ${v.r.avg.toFixed(2).padStart(6)} | ${v.b.avg.toFixed(2).padStart(6)}`);
  L.push('造成伤害但没打死（每局平均）  汉 | 楚');
  for (const [k, v] of Object.entries(S.hits)) L.push(`  ${cn(k).padEnd(10)} ${v.r.avg.toFixed(2).padStart(6)} | ${v.b.avg.toFixed(2).padStart(6)}`);
  L.push('军功来源（每局平均）  汉 | 楚');
  for (const [k, v] of Object.entries(S.merit)) L.push(`  ${k.padEnd(6)} ${v.r.toFixed(1).padStart(6)} | ${v.b.toFixed(1).padStart(6)}`);
  const ur = S.ult.used, ar = S.art.used;
  L.push(`终极兵法：汉用 ${ur.r[0]} 局（平均第 ${S.ult.round.r.toFixed(1)} 回合，用了的局胜 ${ur.r[0] ? pct(ur.r[1] / ur.r[0]) : '-'}）  楚用 ${ur.b[0]} 局（第 ${S.ult.round.b.toFixed(1)} 回合，胜 ${ur.b[0] ? pct(ur.b[1] / ur.b[0]) : '-'}）  护驾破鸿门宴 ${S.rescue} 局`);
  L.push(`主帅兵法：汉召回 ${ar.r[0]} 局（第 ${S.art.round.r.toFixed(1)} 回合，胜 ${ar.r[0] ? pct(ar.r[1] / ar.r[0]) : '-'}）  楚破釜 ${ar.b[0]} 局（第 ${S.art.round.b.toFixed(1)} 回合，胜 ${ar.b[0] ? pct(ar.b[1] / ar.b[0]) : '-'}）`);
  if (S.pf) L.push(`破釜前后（${S.pf.n} 局，分数 + 汉优）：破釜那一手汉方 ${S.pf.gain.toFixed(2)} 分（子力 ${S.pf.gainM.toFixed(2)}）；之后封锁期汉方 ${S.pf.back >= 0 ? '+' : ''}${S.pf.back.toFixed(2)} 分（子力 ${S.pf.backM >= 0 ? '+' : ''}${S.pf.backM.toFixed(2)}）；追回一半以上 ${pct(S.pf.half)}；封锁期内就分了胜负 ${S.pf.ended} 局；这些局汉胜 ${pct(S.pf.redWin)}`);
  L.push('首次升到 N 级（平均回合 / 出现的局占比）  汉 | 楚');
  for (const [k, v] of Object.entries(S.firstLv)) L.push(`  ${k} 级  第 ${v.r.toFixed(1)} 回合 ${pct(v.rn)} | 第 ${v.b.toFixed(1)} 回合 ${pct(v.bn)}`);
  L.push('局面分随回合（汉方视角，正 = 汉优）/ 军功 / 等级总和');
  for (const [k, v] of Object.entries(S.scoreByRound)) L.push(`  R${k}（${v.n} 局在下）分 ${v.score.toFixed(2)}  军功 汉 ${v.meritR.toFixed(1)} 楚 ${v.meritB.toFixed(1)}  等级 汉 ${v.lvR.toFixed(1)} 楚 ${v.lvB.toFixed(1)}`);
  L.push('翻盘（某回合落后 ≥ T 分的一方最后赢了）');
  for (const [k, v] of Object.entries(S.comeback)) if (v.n) L.push(`  ${k}：${v.n} 局，落后方赢 ${v.trailingWins}（${pct(v.trailingWins / v.n)}），和 ${v.draws}`);
  L.push(`每步平均 ${S.msPerPly.toFixed(0)}ms`);
  console.log(L.join('\n'));
}

// 直接运行才开工；被别的脚本 require 时只导出工具函数（测试规则变体用）
if (require.main === module) {
  const o = parseArgs(process.argv.slice(2));
  if (o.worker) worker();
  else run(o).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { PRESETS, summarize, applyPatches, wrapThinkForNoUp };
