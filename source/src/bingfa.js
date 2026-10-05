// ===== 楚汉·兵法 模式规则引擎（规则底稿 v2） =====
// 走法、将死、困毙不变；技能和生命值只改“吃子的结果”和“每回合能做什么”。没有随机数，同样的行动序列结果永远相同。
// 一方一次行动 = 可选一次升级（不占行动）+ 走子 / 兵种技能 / 兵法 三选一。
// v2：二级只长血，三级长血并解锁技能；车可升四级；士二级起攻击 2；击杀攒甲片抵升级价；拒马不占行动；楚战象践踏改为三级被动。
// v4：兵种随等级换称号；神速营改被动；士四级「铁甲禁卫」九宫内上下左右走；马「踏营」只能在敌方半场用；
//     四面楚歌——楚军除将外不能动、只能吃掉正在将军的子，且不算将军；鸿门宴 3 回合，汉士「护驾」可破。
(function (global) {
  const XQ = global.XQ || require('./rules.js');
  const { pseudoMoves, inCheck, findKing, inBoard, ownHalf, other, initialBoard, checkers, inPalace } = XQ;

  // ---------- 数值配置（初版，集中在这里调） ----------
  const CFG = {
    finalKingHp: 3, // 决战时帅将的生命
    finalOccupyRounds: 3, // 决战：帅将进了对方九宫，对方再走这么多步还没把它打死 / 它自己没走出去，就算夺营获胜
    merit: {
      start: 3, cap: 30, autoIncomeFromRound: 16, autoIncomePerRound: 1,
      killReward: { p: 1, a: 2, e: 2, n: 3, c: 3, r: 5 }, killRewardPerLevel: 1,
      checkReward: 1, pawnCrossRiverReward: 1, lostPieceCompensation: 1,
    },
    // cost[兵种] = [升二级, 升三级, 升四级]；每击杀一个单位攒一片甲，下次升级少花 killDiscount 功，升级后清零，最少 minCost 功
    upgrade: { cost: { p: [3, 5, 8], a: [2, 3, 4], e: [2, 3, 5], n: [5, 7], c: [5, 7], r: [6, 8, 20] }, maxLevel: { r: 4, p: 4, a: 4, e: 4 }, autoByPlates: true, defaultMaxLevel: 3, maxPerTurn: 1, healOnUpgrade: true, cooldownOnUnlock: 1, killDiscount: 1, minCost: 1 },
    hp: [1, 2, 3, 4],
    hpByType: { p: [1, 2, 3, 3], a: [1, 2, 3, 3], e: [1, 2, 3, 3] }, // 兵、士、相/象四级不再加血
    attack: { a: [1, 2, 2, 2] }, // 按等级的攻击力（一次攻击扣的血）；没列出的兵种都是 1
    skillLevel: 3, // 几级解锁兵种技能（单个技能可用 level 另定）
    skills: {
      juma: { cooldown: 2, duration: 1, damage: 1, free: true }, // free：不占行动，架完还要再走一步棋（这枚兵本回合不能动）
      shensu: { level: 4, passive: true, move: true, cooldown: 5, range: 2 }, // 兵四级被动：八方向直线 1～2 格，可越子，只能落空格
      huifang: { level: 4, passive: true, move: true, cooldown: 2 }, // 兵四级被动：可后退一格
      jinwei: { level: 4, passive: true, move: true, cooldown: 2 }, // 士四级被动「铁甲禁卫」：九宫内上下左右走一格
      chongzhen: { cooldown: 3, springDamage: 1 }, // 车：前方第一枚子当跳板（挨 1 点），落到它身后一格
      taying: { cooldown: 2, enemyHalfOnly: true }, // 马：只能在敌方半场用
      pili: { cooldown: 4, splashDamage: 1, splashMinLevel: 2 },
      feiyue: { cooldown: 5 }, // 相 / 象三级主动：这一步无视塞象眼
      qishe: { level: 4, cooldown: 3, range: 2, damage: 1 }, // 汉相四级
      jianta: { level: 4, passive: true, splashDamage: 1, splashMinLevel: 1, ring8: true }, // 楚象四级被动：攻击 / 吃子后踩那一格周围一圈，各扣 1 点（残血的直接踩死），走空格不踩，无冷却
      hujia: { cooldown: 4 },
    },
    generalArts: { fromRound: 1, xiaohe: { usesPerGame: 1 }, pofu: { usesPerGame: 1, steps: 2, mayEndInCheck: false, skillLockRounds: 3 } },
    ultimates: { cost: 20, hongmen: { usesPerGame: 1, rounds: 3 }, simian: { usesPerGame: 1, rounds: 2, radius: 2, minPiecesInRadius: 3 } },
    longCheckLimit: 6,
    // 背水一战（on = true 时代替楚方的破釜沉舟；2026-10-05 起默认开，on = false 回到破釜沉舟）。开着时两边的主帅兵法都只给弱势方用：
    //   轮到自己时，己方车马炮最多还剩 maxLeft 枚、而且比对方的车马炮少，才能用——楚方的背水一战、汉方的召回良将都看这一条（每局一次照旧）；
    //   连走两步：同一枚子走两步，或两枚子各走一步（twoPieces = true 时必须是两枚不同的子）；两步合计最多吃掉 maxKills 个子（践踏踩死的也算，打伤不算）；
    //   只看结算：两步走完时楚将不被将军、也不将着汉帅；过程不限（可以各挡一路解双将，第一步可以先走进被将的格子、先将一下对方）；
    //   用完没有技能封锁，但用过的子（一枚或两枚）在楚方之后 freeze 个回合里不能动（原地的拒马、齐射能用）——
    //   例外：楚方被将军时，冻结的子可以去吃正在将军的那枚（strictEscape：只能吃它，而且要吃死；false = 吃哪个子都行，只要解了将）
    beishui: { on: true, maxLeft: 3, twoPieces: false, maxKills: 1, freeze: 1, strictEscape: true },
    // 试行规则「r6」（用户 2026-10-05 定：先做成开关试玩，满意再上线）。on = true 时，在背水规则之上五处一起变；默认关，每局由对局选项 opts.r6 决定：
    //   1. attack / hpByType：车、马、炮、兵的攻击按等级 1 / 1 / 2 / 2（马、炮最高三级）；车的血 1 / 2 / 3 / 3（四级不再是 4 血）。士、相 / 象、帅将不变
    //   2. cost：车的升级价 10 / 12 / 20（原来 6 / 8 / 20）
    //   3. reviveLevel + reviveCap：召回的子回来的等级 = min(死时的等级, reviveLevel)，血按回来的等级回满（阵亡名单每项记着死时的等级 lv；没记的旧记录按一级）
    //   4. reviveUp：多一种行动 { k:'art', id, up:true }——召回之后当回合马上花军功给它升一级。照常扣军功、每回合最多升一次；召回占这一回合，所以它这回合动不了
    //   5. reviveHalf：召回的子第一次升级半价（单数向上取整）。召回时给它记 rh；甲片照常抵价，甲片攒够自动晋升的门槛也按半价；第一次晋升（手动、当场、甲片自动都算）之后清掉，恢复原价
    r6: { on: false, attack: { r: [1, 1, 2, 2], p: [1, 1, 2, 2], n: [1, 1, 2], c: [1, 1, 2] }, hpByType: { r: [1, 2, 3, 3] }, cost: { r: [10, 12, 20] }, reviveLevel: 2, reviveCap: true, reviveUp: true, reviveHalf: true },
  };
  // 主技能（三级解锁）；SKILLS_OF 列出这一兵种全部技能（含四级的）
  const SKILL_OF = (t, s) => ({ p: 'juma', r: 'chongzhen', n: 'taying', c: 'pili', a: 'hujia', e: s === 'r' ? 'qishe' : 'jianta' })[t] || null;
  const SKILLS_OF = (t, s) => ({ p: ['juma', 'shensu', 'huifang'], a: ['hujia', 'jinwei'], e: [s === 'r' ? 'qishe' : 'jianta', 'feiyue'] })[t] || (SKILL_OF(t, s) ? [SKILL_OF(t, s)] : []);
  const SKILL_CN = { juma: '拒马', chongzhen: '冲阵', taying: '踏营', pili: '霹雳', qishe: '齐射', jianta: '践踏', hujia: '护驾', shensu: '神速营', huifang: '回防', jinwei: '铁甲禁卫', feiyue: '飞越' };
  const ART_CN = { r: '召回良将', get b() { return CFG.beishui && CFG.beishui.on ? '背水一战' : '破釜沉舟'; } }, ULT_CN = { r: '四面楚歌', b: '鸿门宴' };
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const RING8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  // 称号：兵种随等级晋升（界面显示、升级演出用）
  const RANK_CN = {
    r: { p: ['汉军兵', '汉伍长', '汉什长', '无当飞军'], r: ['汉军车', '汉轻车', '汉武刚车', '虎贲车骑'], n: ['汉军马', '汉骁骑', '郎中骑'], c: ['汉军炮', '汉抛石', '汉霹雳车'], e: ['汉军相', '汉材官', '蹶张强弩', '大黄弩士'], a: ['汉军士', '汉郎卫', '汉中涓', '参乘虎卫'], k: ['汉王刘邦'] },
    b: { p: ['楚军卒', '楚锐卒', '楚持戟', '江东甲士'], r: ['楚军车', '楚戎车', '楚陷阵车', '霸王车骑'], n: ['楚军马', '楚骁骑', '乌骓骑'], c: ['楚军炮', '楚抛石', '楚霹雳炮'], e: ['楚军象', '楚战象', '云梦巨象', '金甲象军'], a: ['楚军士', '楚郎卫', '楚执戟郎', '重瞳亲卫'], k: ['西楚霸王'] },
  };
  const rankName = (s, t, lv) => { const a = (RANK_CN[s] || {})[t] || []; return a[Math.max(1, Math.min(a.length, lv || 1)) - 1] || ''; };
  // 四级名将：升到四级的子各得一个楚汉名将的名字（按晋升先后依次取；名字用完就只显示称号）
  const HERO_CN = {
    r: { r: ['韩信', '夏侯婴'], p: ['周勃', '曹参', '王陵', '卢绾', '傅宽'], a: ['樊哙', '纪信'], e: ['张良', '萧何'] },
    b: { r: ['龙且', '钟离昧'], p: ['季布', '英布', '虞子期', '桓楚', '周殷'], a: ['项庄', '项伯'], e: ['范增', '项佗'] },
  };
  const heroName = p => (p && p.nm != null ? (((HERO_CN[p.s] || {})[p.t] || [])[p.nm] || '') : '');
  // 晋升一级（手动升级、甲片攒够自动升级共用）：回满血；刚解锁的主动技能先冷却；升到四级时取名
  function promote(S, p) {
    if (p.rh) delete p.rh;   // 试行规则：召回的子第一次晋升之后恢复原价
    p.lv++; p.hp = CFG_CUR.upgrade.healOnUpgrade ? hpOf(p.t, p.lv) : p.hp + 1;
    for (const sk of SKILLS_OF(p.t, p.s)) if (skLevel(sk) === p.lv && !isPassive(sk)) { const k = cdKey(p, sk); p[k] = Math.max(p[k] || 0, S.cnt[p.s] + CFG_CUR.upgrade.cooldownOnUnlock); }
    if (p.lv === 4 && p.nm == null) { const N = S.named || (S.named = { r: {}, b: {} }), i = N[p.s][p.t] || 0; if (i < (((HERO_CN[p.s] || {})[p.t] || []).length)) { p.nm = i; N[p.s][p.t] = i + 1; } }
  }
  // 技能说明（界面悬停 / 长按用）
  const SKILL_DESC = {
    juma: '原地架矛，不占行动，架完还能再走一步。对方下一步来犯的敌子先挨 1 点伤害。',
    chongzhen: '撞开前方第一枚子（它挨 1 点），冲到它身后一格；那格有子，能杀就杀，杀不了就扣血退回。',
    shensu: '八个方向疾行 1～2 格，可以越子，只能落在空格。',
    huifang: '可以后退一格。',
    jinwei: '士在田字格内获得自由移动的能力：可上下左右走一格。',
    taying: '这一步无视蹩马腿。只能在敌方半场用。',
    feiyue: '这一步无视塞象眼（仍不能过河）。',
    pili: '炮击一个敌子，落点四周二级以上的敌子各扣 1 点。',
    qishe: '不动身，射斜线 1～2 格内的一个敌子，扣 1 点。',
    jianta: '攻击或吃掉敌子后就地跺脚：那一格周围一圈（含斜向）的敌子各扣 1 点，只剩 1 血的直接踩死。走到空格不触发。',
    hujia: '与帅（将）互换位置，可解将；鸿门宴期间可救出汉王。',
  };
  // 每枚子的开局位置（复活用）
  const START = {};
  (() => { const b = initialBoard(); for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (b[r][f]) START[b[r][f].id] = [f, r]; })();

  // ---------- 状态 ----------
  function newState(cfg) {
    const b = initialBoard();
    for (const row of b) for (const p of row) if (p) { p.lv = 1; p.hp = 1; p.cd = 0; p.jm = 0; p.xp = 0; p.kills = 0; }
    return {
      board: b, turn: 'r', cnt: { r: 0, b: 0 }, merit: { r: cfg.merit.start, b: cfg.merit.start },
      used: { art: { r: 0, b: 0 }, ult: { r: 0, b: 0 } }, fx: { hm: 0, sm: 0, pf: 0 },
      crossed: {}, dead: { r: [], b: [] }, upgraded: false, ckHist: { r: [], b: [] },
      named: { r: {}, b: {} }, // 四级名将已经取到第几个
      occ: { r: 0, b: 0 }, // 决战：帅将已经在对方九宫里撑过了对方几步
      final: false, // 决战：双方车马兵炮都死光之后，象、士、帅将解禁
      freeUsed: false, jmLock: null, // 本回合已用过不占行动的拒马（还得再走一步棋）；架拒马的那枚兵本回合不能动
    };
  }
  function cloneState(S) {
    return {
      board: S.board.map(row => row.map(p => (p ? { ...p } : null))), turn: S.turn, cnt: { ...S.cnt }, merit: { ...S.merit },
      used: { art: { ...S.used.art }, ult: { ...S.used.ult } }, fx: { ...S.fx }, crossed: { ...S.crossed },
      dead: { r: S.dead.r.slice(), b: S.dead.b.slice() }, upgraded: S.upgraded, ckHist: { r: S.ckHist.r.slice(), b: S.ckHist.b.slice() },
      freeUsed: !!S.freeUsed, jmLock: S.jmLock == null ? null : S.jmLock, final: !!S.final, occ: { r: (S.occ || {}).r || 0, b: (S.occ || {}).b || 0 },
      named: { r: { ...((S.named || {}).r || {}) }, b: { ...((S.named || {}).b || {}) } },
    };
  }
  const at = (S, f, r) => (inBoard(f, r) ? S.board[r][f] : null);
  const round = S => Math.floor((S.cnt.r + S.cnt.b) / 2) + 1;
  const BSon = () => (CFG_CUR.beishui && CFG_CUR.beishui.on ? CFG_CUR.beishui : null);   // 背水一战开着就返回它的配置
  // 车马炮的枚数（只数棋盘上的，不看等级血量）：[己方, 对方]
  const majors = (S, s) => { let m = 0, o = 0; for (const row of S.board) for (const p of row) if (p && (p.t === 'r' || p.t === 'n' || p.t === 'c')) { if (p.s === s) m++; else o++; } return [m, o]; };
  // 主帅兵法（召回良将、破釜沉舟 / 背水一战）现在能不能用：从第几回合起；
  //   背水一战开着时，走子方的车马炮要丢了一半（最多剩 maxLeft 枚）且比对方少——楚方的背水、汉方的召回共用这一条
  const artOpen = S => {
    if (round(S) < (CFG_CUR.generalArts.fromRound || 1)) return false;
    const B = BSon(); if (!B) return true;
    const [m, o] = majors(S, S.turn);
    return m < o && (B.maxLeft == null || m <= B.maxLeft);
  };
  // 背水一战：用过的子在冻结期里不能动（己方行动数还没到 p.bz）
  const frozen = (S, p) => !!(p && p.bz && S.cnt[p.s] < p.bz);
  const revived = (S, p) => !!(p && p.rv && S.cnt.r === p.rv && S.turn === 'b');   // 刚召回、还没轮到汉方再走的那一回合
  const hmActive = S => S.cnt.r < S.fx.hm; // 鸿门宴：汉帅不能动
  const smActive = S => S.cnt.b < S.fx.sm; // 四面楚歌：楚军涣散
  const pfActive = S => S.cnt.b < S.fx.pf; // 破釜沉舟后楚方兵种技能封锁
  const restricted = (S, s) => (s === 'r' ? hmActive(S) : smActive(S));
  // 将帅对面
  const facing = b => { const k = findKing(b, 'r'), K = findKing(b, 'b'); if (!k || !K || k[0] !== K[0] || b[k[1]][k[0]].w) return false; for (let r = Math.min(k[1], K[1]) + 1; r < Math.max(k[1], K[1]); r++) if (b[r][k[0]]) return false; return true; };
  // 带状态的将军判定：四面楚歌期间楚军“不算将军”——汉帅被楚子攻击也不必应将（只需避开将帅对面）
  //   决战里没有“将军”这回事：帅将有 3 点生命，可以对脸、可以送将，被打到 0 血就输
  const inCheckS = (S, s) => (S.final ? false : s === 'r' && smActive(S) ? facing(S.board) : inCheck(S.board, s));
  const inCheckF = (S, s) => !S.final && inCheck(S.board, s);
  const jmActive = (S, p) => p && p.t === 'p' && p.jm > S.cnt[other(p.s)];
  const maxLv = t => (t === 'k' ? 1 : CFG_CUR.upgrade.maxLevel[t] || CFG_CUR.upgrade.defaultMaxLevel);
  // 试行规则 r6 开着就返回它的配置；攻击、血、升级价都先看它里面有没有这一兵种的表，没有再用平常的
  const R6 = (cfg = CFG_CUR) => (cfg.r6 && cfg.r6.on ? cfg.r6 : null);
  const atkTbl = (t, cfg = CFG_CUR) => { const R = R6(cfg); return (R && R.attack && R.attack[t]) || cfg.attack[t] || []; };
  const hpTbl = (t, cfg = CFG_CUR) => { const R = R6(cfg); return (R && R.hpByType && R.hpByType[t]) || cfg.hpByType[t] || cfg.hp; };
  const costTbl = (t, cfg = CFG_CUR) => { const R = R6(cfg); return (R && R.cost && R.cost[t]) || cfg.upgrade.cost[t]; };
  const atk = p => (atkTbl(p.t)[(p.lv || 1) - 1] || 1); // 将帅默认 1，可用 CFG.attack.k = [n] 调
  const hpOf = (t, lv, cfg = CFG_CUR) => hpTbl(t, cfg)[lv - 1];
  const isPassive = sk => !!(sk && CFG_CUR.skills[sk] && CFG_CUR.skills[sk].passive);
  const skLevel = sk => (CFG_CUR.skills[sk] && CFG_CUR.skills[sk].level) || CFG_CUR.skillLevel;
  // 冷却：主技能记在 p.cd，其他技能记在 p['c_' + 技能]（都是“到第几次行动才能再用”）
  const cdKey = (p, sk) => (sk === SKILL_OF(p.t, p.s) ? 'cd' : 'c_' + sk);
  const cdReady = (S, p, sk) => S.cnt[p.s] >= (p[cdKey(p, sk)] || 0);
  const setCd = (S, p, sk) => { p[cdKey(p, sk)] = S.cnt[p.s] + CFG_CUR.skills[sk].cooldown + 1; };
  const hasSkill = (p, sk) => SKILLS_OF(p.t, p.s).includes(sk) && p.lv >= skLevel(sk);
  // 主动技能能不能用（被动技能另算：不受拒马后的限制，也不受封锁）
  const skillOk = (S, p, sk) => hasSkill(p, sk) && !isPassive(sk) && cdReady(S, p, sk) && !S.freeUsed && !(p.s === 'b' && (pfActive(S) || smActive(S)));
  const skillReady = (S, p, sk) => skillOk(S, p, sk || SKILL_OF(p.t, p.s));
  // 升级价：基础价减去攒下的甲片（击杀数），最少 minCost
  //   baseCostOf：没算甲片的基础价（试行规则：召回的子第一次升级半价，单数向上取整）
  const baseCostOf = p => { const b = costTbl(p.t)[p.lv - 1], R = R6(); return p.rh && R && R.reviveHalf ? Math.ceil(b / 2) : b; };
  const upCost = p => { const U = CFG_CUR.upgrade; if (!p || p.t === 'k' || p.lv >= maxLv(p.t)) return null; const base = baseCostOf(p); return Math.max(U.minCost, base - (p.xp || 0) * U.killDiscount); };

  // ---------- 军功 ----------
  function addMerit(S, s, n, ev, why) {
    if (!n) return;
    const before = S.merit[s];
    S.merit[s] = Math.min(CFG_CUR.merit.cap, S.merit[s] + n);
    if (ev && S.merit[s] !== before) ev.push({ e: 'merit', s, n: S.merit[s] - before, why });
  }
  let CFG_CUR = CFG;
  // by：出手的那枚子（攒一片甲 = 击杀数，抵下次升级价）
  function kill(S, f, r, killerSide, ev, how, by) {
    const v = S.board[r][f];
    if (!v) return null;
    S.board[r][f] = null;
    S.dead[v.s].push({ id: v.id, t: v.t, s: v.s, lv: v.lv });   // lv：死时的等级（试行规则里召回封顶用；电脑的局面键只看棋盘，不受影响）
    const m = CFG_CUR.merit, friendly = v.s === killerSide, gain = friendly ? 0 : (m.killReward[v.t] || 0) + (v.lv - 1) * m.killRewardPerLevel;
    ev.push({ e: 'kill', id: v.id, t: v.t, s: v.s, lv: v.lv, at: [f, r], how, by: by ? by.id : null, gain, friendly });
    // 误伤己方：不给军功、不攒甲
    if (friendly) return v;
    addMerit(S, killerSide, gain, ev, '击杀');
    addMerit(S, v.s, m.lostPieceCompensation, ev, '哀兵');
    if (by && by.s === killerSide && by.t !== 'k') {
      by.xp = (by.xp || 0) + 1; by.kills = (by.kills || 0) + 1; ev.push({ e: 'xp', id: by.id, xp: by.xp });
      // 甲片攒够了下一级的价钱：当场自动晋升，不花军功（甲片用掉）
      const U = CFG_CUR.upgrade;
      if (U.autoByPlates && by.hp > 0 && by.lv < maxLv(by.t) && by.xp * U.killDiscount >= baseCostOf(by)) {
        const used = by.xp; by.xp = 0; promote(S, by);
        ev.push({ e: 'autoup', id: by.id, s: by.s, t: by.t, lv: by.lv, hp: by.hp, usedXp: used, nm: by.nm });
      }
    }
    return v;
  }
  function damage(S, f, r, n, killerSide, ev, how, by) {
    const v = S.board[r][f];
    if (!v || v.t === 'k') return;
    v.hp -= n;
    if (v.hp <= 0) kill(S, f, r, killerSide, ev, how, by);
    else ev.push({ e: 'hit', id: v.id, at: [f, r], hp: v.hp, how });
  }
  function moveTo(S, from, to, ev) {
    const p = S.board[from[1]][from[0]];
    S.board[to[1]][to[0]] = p; S.board[from[1]][from[0]] = null;
    ev.push({ e: 'move', id: p.id, from: from.slice(), to: to.slice() });
    // 兵卒过河（每枚只计一次）
    if (p.t === 'p' && !ownHalf(p.s, to[1]) && !S.crossed[p.id]) { S.crossed[p.id] = 1; addMerit(S, p.s, CFG_CUR.merit.pawnCrossRiverReward, ev, '过河'); }
  }
  // 走到敌子所在格：拒马先反伤；剩 1 点就吃掉占位，2 点以上就是攻击（攻方退回）。返回 'kill' | 'hit' | 'died' | 'move'
  function strike(S, from, to, side, ev, how) {
    const P = S.board[from[1]][from[0]], T = S.board[to[1]][to[0]];
    if (!T) { moveTo(S, from, to, ev); return 'move'; }
    if (jmActive(S, T) && P.t !== 'k' && T.s !== P.s) {
      ev.push({ e: 'counter', id: P.id, at: from.slice(), by: T.id, target: to.slice() });
      P.hp -= CFG_CUR.skills.juma.damage;
      if (P.hp <= 0) { kill(S, from[0], from[1], T.s, ev, 'juma', T); return 'died'; }
    }
    const A = atk(P);
    if (T.hp <= A) { kill(S, to[0], to[1], side, ev, how || 'capture', P); moveTo(S, from, to, ev); return 'kill'; }
    T.hp -= A;
    ev.push({ e: 'hit', id: T.id, at: to.slice(), hp: T.hp, how: how || 'attack' });
    ev.push({ e: 'repel', id: P.id, from: from.slice(), to: to.slice() });
    return 'hit';
  }
  function splash(S, c, side, ev, how, by) {
    const minLv = CFG_CUR.skills[how].splashMinLevel, n = CFG_CUR.skills[how].splashDamage;
    ev.push({ e: 'splash', how, at: c.slice() });
    const K = CFG_CUR.skills[how];
    for (const [df, dr] of (K.ring8 ? RING8 : ORTHO)) {
      const f = c[0] + df, r = c[1] + dr, q = at(S, f, r);
      if (!q || q.s === side || q.t === 'k') continue;
      if (q.lv >= minLv) damage(S, f, r, n, side, ev, how, by);
    }
  }
  // 楚战象被动「践踏」：三级战象落子（走到空格或吃掉）后溅伤四周
  function trample(S, P, to, res, side, ev) {
    if (!P || SKILL_OF(P.t, P.s) !== 'jianta' || P.lv < skLevel('jianta')) return;
    if (side === 'b' && smActive(S)) return; // 四面楚歌期间楚军没有技能
    // 不管这一步杀没杀子，都以象冲到的那一格为中心踩一圈（强攻没拿下、退回原位，踩的也是被攻击的那格四周）
    const c = to;
    // 落子处得有敌子（打伤或吃掉了它）才踩；走到空格不踩
    if (res !== 'kill' && res !== 'hit') return;
    if (c && P.hp > 0) splash(S, c, side, ev, 'jianta', P);
  }

  // ---------- 走法 ----------
  // 普通走子的伪合法目标（不能吃帅将；鸿门宴期间汉帅不能动；涣散期间楚方非将子只能吃子或攻击）
  function moveTargets(S, f, r, ignoreLeg = false) {
    const p = at(S, f, r); if (!p) return [];
    let ms;
    if (ignoreLeg && p.t === 'n') {
      ms = [];
      for (const [df, dr] of [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]]) {
        const tf = f + df, tr = r + dr; if (!inBoard(tf, tr)) continue;
        const q = S.board[tr][tf]; if (q && q.s === p.s) continue;
        ms.push({ from: [f, r], to: [tf, tr] });
      }
    } else if (ignoreLeg && p.t === 'e') {
      // 飞越：田字照走，象眼被塞也能过；仍然不能过河
      ms = [];
      for (const [df, dr] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
        const tf = f + df, tr = r + dr; if (!inBoard(tf, tr) || (!p.j && !ownHalf(p.s, tr))) continue;
        const q = S.board[tr][tf]; if (q && q.s === p.s) continue;
        ms.push({ from: [f, r], to: [tf, tr] });
      }
    } else ms = pseudoMoves(S.board, f, r);
    // 被动走法（不用点技能，冷却好了就能走）：兵四级回防后退一格、神速营八方向疾行；士四级铁甲禁卫九宫内上下左右走一格
    //   同一个落点普通走法能到就算普通走法；回防和神速营都能到时用回防（冷却短）
    const seen = new Set(ms.map(m => m.to[0] + ',' + m.to[1]));
    const extra = (sk, tf, tr, emptyOnly) => {
      if (!inBoard(tf, tr) || !hasSkill(p, sk) || !cdReady(S, p, sk) || seen.has(tf + ',' + tr)) return;
      const q = S.board[tr][tf]; if (q && (q.s === p.s || emptyOnly)) return;
      seen.add(tf + ',' + tr); ms.push({ from: [f, r], to: [tf, tr], via: sk });
    };
    if (!ignoreLeg && p.t === 'p') {
      extra('huifang', f, r + (p.s === 'r' ? -1 : 1));
      if (hasSkill(p, 'shensu') && cdReady(S, p, 'shensu')) for (const m of dashTargets(S, f, r)) extra('shensu', m.to[0], m.to[1], true);
    }
    // 铁甲禁卫：平时只在九宫内；决战解禁后在哪儿都能上下左右走一格
    if (!ignoreLeg && p.t === 'a' && (p.j || inPalace(p.s, f, r))) for (const [df, dr] of ORTHO) if (p.j || inPalace(p.s, f + df, r + dr)) extra('jinwei', f + df, r + dr);
    // 四面楚歌：楚军除将外不能移动，只能吃掉正在将军的那枚子
    const sm = p.s === 'b' && p.t !== 'k' && smActive(S), ck = sm ? checkers(S.board, 'r') : null;
    return ms.filter(m => {
      const q = S.board[m.to[1]][m.to[0]];
      if (q && q.t === 'k' && !S.final) return false;   // 平时不能吃帅将；决战里可以直接攻击
      if (p.s === 'r' && p.t === 'k' && hmActive(S)) return false;
      if (sm && (!q || !ck.includes(q.id))) return false;
      return true;
    });
  }
  function cannonShots(S, f, r) { return pseudoMoves(S.board, f, r).filter(m => { const q = S.board[m.to[1]][m.to[0]]; return q && q.s !== S.board[r][f].s && q.t !== 'k'; }); }
  function arrowTargets(S, f, r) {
    const p = at(S, f, r), out = [];
    for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k <= CFG_CUR.skills.qishe.range; k++) {
        const tf = f + df * k, tr = r + dr * k; if (!inBoard(tf, tr)) break;
        const q = S.board[tr][tf];
        if (q) { if (q.s !== p.s && q.t !== 'k') out.push({ from: [f, r], to: [tf, tr] }); break; }
      }
    }
    return out;
  }

  // 车冲阵：四个方向上第一枚子（帅将除外）当跳板，身后一格必须在棋盘内且不是帅将
  function springTargets(S, f, r) {
    const out = [];
    for (const [df, dr] of ORTHO) {
      let tf = f + df, tr = r + dr;
      while (inBoard(tf, tr) && !S.board[tr][tf]) { tf += df; tr += dr; }
      if (!inBoard(tf, tr)) continue;
      const q = S.board[tr][tf]; if (q.t === 'k') continue;
      const lf = tf + df, lr = tr + dr; if (!inBoard(lf, lr)) continue;
      const lp = S.board[lr][lf]; if (lp && lp.t === 'k') continue;
      out.push({ from: [f, r], to: [tf, tr], land: [lf, lr] });
    }
    return out;
  }
  // 兵神速营：八方向直线 1～2 格，可越子，只能落空格
  function dashTargets(S, f, r) {
    const out = [], R = CFG_CUR.skills.shensu.range;
    for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let k = 1; k <= R; k++) {
      const tf = f + df * k, tr = r + dr * k; if (inBoard(tf, tr) && !S.board[tr][tf]) out.push({ from: [f, r], to: [tf, tr] });
    }
    return out;
  }
  const findMove = (S, from, to) => moveTargets(S, from[0], from[1]).find(m => m.to[0] === to[0] && m.to[1] === to[1]) || null;

  // ---------- 行动结算（在 S 上直接改；不合法返回 null） ----------
  // 破釜沉舟 / 背水一战两步走完之后的收尾（resolve 和 pofuPairs 共用）：合不合规矩、封锁 / 冻结
  function bsFinish(S, BS, ids, ev, ev00) {
    if (BS && ev.slice(ev00).filter(e => e.e === 'kill' && !e.friendly && e.s === 'r').length > BS.maxKills) return false;   // 最多吃掉几个子
    if ((BS || !CFG_CUR.generalArts.pofu.mayEndInCheck) && inCheckF(S, 'r')) return false;   // 走完不能将着对方（背水一战一律不许）
    S.fx.pf = S.cnt.b + 1 + (BS ? 0 : CFG_CUR.generalArts.pofu.skillLockRounds);   // 背水一战没有技能封锁
    if (BS) for (const row of S.board) for (const q of row) if (q && q.s === 'b' && ids.includes(q.id)) q.bz = S.cnt.b + 1 + BS.freeze;   // 用过的两枚子冻结
    return true;
  }
  function resolve(S, a) {
    const side = S.turn, ev = [];
    const own = (f, r) => { const p = at(S, f, r); return p && p.s === side ? p : null; };
    const has = (list, to) => list.some(m => m.to[0] === to[0] && m.to[1] === to[1]);
    let kind = a.k, extra = {};
    // 用过拒马后只能再走一步棋，且架拒马的兵不能动
    if (S.freeUsed && a.k !== 'mv') return null;
    if (a.k === 'mv') {
      const p = own(a.from[0], a.from[1]); if (!p) return null;
      if (S.jmLock != null && p.id === S.jmLock) return null;
      const fz = frozen(S, p);
      if (fz) {   // 背水一战用过的子：只有被将军时去吃子解将才行
        const q = at(S, a.to[0], a.to[1]), strict = CFG_CUR.beishui && CFG_CUR.beishui.strictEscape;
        if (!(inCheckF(S, side) && q && q.s !== side && (!strict || checkers(S.board, other(side)).includes(q.id)))) return null;
      }
      const m = findMove(S, a.from, a.to); if (!m) return null;
      extra.res = strike(S, a.from, a.to, side, ev);
      if (fz && CFG_CUR.beishui && CFG_CUR.beishui.strictEscape && extra.res !== 'kill') return null;   // 要吃死
      if (m.via) { setCd(S, p, m.via); extra.via = m.via; ev.push({ e: 'passive', sk: m.via, id: p.id }); }
      trample(S, p, a.to, extra.res, side, ev);
    } else if (a.k === 'sk') {
      const p = own(a.at[0], a.at[1]); if (!p) return null;
      const sk = a.sk || SKILL_OF(p.t, p.s); if (!sk || !skillOk(S, p, sk)) return null;
      if (frozen(S, p) && sk !== 'juma' && sk !== 'qishe') return null;   // 冻结的子只能用原地的技能
      extra.sk = sk;
      const cd = () => { const q = S.board.flat().find(x => x && x.id === p.id); if (q) setCd(S, q, sk); };
      if (sk === 'juma') {
        p.jm = S.cnt[other(side)] + CFG_CUR.skills.juma.duration;
        ev.push({ e: 'juma', id: p.id, at: a.at.slice() });
        if (CFG_CUR.skills.juma.free) { cd(); S.freeUsed = true; S.jmLock = p.id; return { kind, ev, extra, free: true }; }
      } else if (sk === 'chongzhen') {
        const t = a.to && springTargets(S, a.at[0], a.at[1]).find(m => m.to[0] === a.to[0] && m.to[1] === a.to[1]);
        if (!t) return null;
        const q = S.board[a.to[1]][a.to[0]];
        extra.land = t.land.slice();
        // 跳板是敌方拒马：车先挨反伤
        let dead = false;
        if (q.s !== side && jmActive(S, q)) {
          ev.push({ e: 'counter', id: p.id, at: a.at.slice(), by: q.id, target: a.to.slice() });
          p.hp -= CFG_CUR.skills.juma.damage;
          if (p.hp <= 0) { kill(S, a.at[0], a.at[1], q.s, ev, 'juma', q); dead = true; extra.res = 'died'; }
        }
        if (!dead) {
          damage(S, a.to[0], a.to[1], CFG_CUR.skills.chongzhen.springDamage, side, ev, 'chongzhen', p);
          extra.spring = { at: a.to.slice(), killed: !S.board[a.to[1]][a.to[0]] };
          extra.res = strike(S, a.at, t.land, side, ev, 'chongzhen');
        }
      } else if (sk === 'taying') {
        if (CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(side, a.at[1])) return null;
        if (!a.to || !has(moveTargets(S, a.at[0], a.at[1], true), a.to)) return null;
        extra.res = strike(S, a.at, a.to, side, ev, 'taying');
      } else if (sk === 'feiyue') {
        if (!a.to || !has(moveTargets(S, a.at[0], a.at[1], true), a.to)) return null;
        extra.res = strike(S, a.at, a.to, side, ev, 'feiyue');
        trample(S, p, a.to, extra.res, side, ev);
      } else if (sk === 'pili') {
        if (!a.to || !has(cannonShots(S, a.at[0], a.at[1]), a.to)) return null;
        if (p.s === 'b' && smActive(S)) return null;
        const res = strike(S, a.at, a.to, side, ev, 'pili');
        extra.res = res;
        if (res !== 'died') splash(S, a.to, side, ev, 'pili', p);
      } else if (sk === 'qishe') {
        if (!a.to || !has(arrowTargets(S, a.at[0], a.at[1]), a.to)) return null;
        damage(S, a.to[0], a.to[1], CFG_CUR.skills.qishe.damage, side, ev, 'qishe', p);
      } else if (sk === 'hujia') {
        const k = findKing(S.board, side); if (!k) return null;
        const K = S.board[k[1]][k[0]];
        if (frozen(S, K)) return null;   // 冻结的帅将不能被护驾换走
        S.board[k[1]][k[0]] = p; S.board[a.at[1]][a.at[0]] = K;
        ev.push({ e: 'swap', a: p.id, b: K.id, pa: a.at.slice(), pb: k.slice() });
        // 樊哙闯帐：汉士护驾，当场破掉鸿门宴
        if (side === 'r' && hmActive(S)) { S.fx.hm = S.cnt.r; extra.rescue = true; ev.push({ e: 'rescue', id: p.id, at: k.slice() }); }
      } else return null;
      cd();
    } else if (a.k === 'art') {
      if (!artOpen(S) || S.used.art[side] >= CFG_CUR.generalArts[side === 'r' ? 'xiaohe' : 'pofu'].usesPerGame) return null;
      if (side === 'b' && smActive(S)) return null;
      if (side === 'r') {
        const i = S.dead.r.findIndex(d => d.id === a.id); if (i < 0) return null;
        const d = S.dead.r[i], st = START[d.id];
        if (!st || at(S, st[0], st[1])) return null;
        S.dead.r.splice(i, 1);
        // 试行规则：回来的等级 = min(死时的等级, reviveLevel)；平常一律一级
        const R = R6(), top = R ? Math.max(1, Math.min(maxLv(d.t), R.reviveLevel || 1)) : 1, rlv = R && R.reviveCap ? Math.max(1, Math.min(top, d.lv || 1)) : top;
        const pr = S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: rlv, hp: hpOf(d.t, rlv), cd: 0, jm: 0, xp: 0, kills: 0, rv: S.cnt.r + 1 };   // rv：刚被召回的记号（只给界面用：这一回合它还动不了，身上绕一圈金光）
        if (R && R.reviveHalf) pr.rh = 1;   // 第一次升级半价的记号
        ev.push({ e: 'revive', id: d.id, t: d.t, at: st.slice(), lv: rlv });
        if (a.up) {   // 试行规则：召回后当回合花军功给它升一级（照常扣军功、每回合最多升一次；召回占了这一回合，所以它动不了）
          const c = upCost(pr);
          if (!R || !R.reviveUp || S.upgraded || c == null || S.merit.r < c) return null;
          S.merit.r -= c; promote(S, pr); pr.xp = 0; S.upgraded = true;
          ev.push({ e: 'reviveUp', id: d.id, t: d.t, lv: pr.lv, hp: pr.hp, cost: c, nm: pr.nm });
        }
      } else {
        const steps = a.steps || [];
        if (steps.length !== CFG_CUR.generalArts.pofu.steps) return null;
        extra.steps = [];
        const BS = BSon(), ids = [], ev00 = ev.length;
        for (const m of steps) {
          const p = own(m.from[0], m.from[1]); if (!p) return null;
          if (BS && BS.twoPieces && ids.includes(p.id)) return null;   // 背水一战：两枚不同的子各走一步
          ids.push(p.id);
          const mm = findMove(S, m.from, m.to); if (!mm) return null;
          const n0 = ev.length;
          const res = strike(S, m.from, m.to, side, ev);
          if (mm.via) { setCd(S, p, mm.via); ev.push({ e: 'passive', sk: mm.via, id: p.id }); }
          trample(S, p, m.to, res, side, ev);
          extra.steps.push({ from: m.from, to: m.to, res, ev0: n0, ev1: ev.length });
          if (!BS && inCheckF(S, side)) return null;   // 破釜沉舟：每一步走完己方都不能被将军；背水一战只看两步走完之后
        }
        if (!bsFinish(S, BS, ids, ev, ev00)) return null;
      }
      S.used.art[side]++;
    } else if (a.k === 'ult') {
      const U = CFG_CUR.ultimates;
      if (S.merit[side] < U.cost || S.used.ult[side] >= U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame) return null;
      if (side === 'b' && smActive(S)) return null;
      if (side === 'r') {
        const k = findKing(S.board, 'b'); if (!k) return null;
        if (simianCount(S) < U.simian.minPiecesInRadius) return null;
        S.fx.sm = S.cnt.b + U.simian.rounds;
      } else S.fx.hm = S.cnt.r + U.hongmen.rounds;
      S.merit[side] -= U.cost;
      S.used.ult[side]++;
      ev.push({ e: 'ult', s: side });
    } else if (a.k === 'pass') {
      // 四面楚歌期间的楚军：没被将军就可以停着（也可以走将）；鸿门宴期间的汉军：无子可走才停着
      if (side === 'b' && smActive(S)) { if (inCheckF(S, 'b')) return null; }
      else if (!restricted(S, side) || legalMoves(S, side, true).length) return null;
    } else return null;
    // 行动结束：己方帅将不能被将军（含将帅对面）
    if (inCheckS(S, side)) return null;
    return { kind, ev, extra };
  }
  // 四面楚歌：楚将周围横竖 2 格内（5×5）的汉方棋子数
  function simianCount(S) {
    const k = findKing(S.board, 'b'), R = CFG_CUR.ultimates.simian.radius; if (!k) return 0;
    let n = 0;
    for (let r = k[1] - R; r <= k[1] + R; r++) for (let f = k[0] - R; f <= k[0] + R; f++) { const p = at(S, f, r); if (p && p.s === 'r') n++; }
    return n;
  }
  const posOf = (S, id) => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.id === id) return [f, r]; } return null; };

  // 行动后的结算：计数、将军军功、长将记录、回合收入、换手
  // 决战：棋盘上双方的车马兵炮都死光了——象、士、帅将都可以过河进攻（象仍走田、士仍走斜一格，只是不受河界九宫限制），
  //   取消飞将，帅将按过河兵走（前、左、右各一格）。一旦开始就不再取消（之后召回的子照常用）
  const ATTACKERS = 'rncp';
  function syncFinal(S, ev) {
    if (!S.final) {
      for (const row of S.board) for (const p of row) if (p && ATTACKERS.includes(p.t)) return;
      S.final = true; if (ev) ev.push({ e: 'final' });
    }
    for (const row of S.board) for (const p of row) if (p) { if (p.t === 'k') { if (!p.w) { p.w = 1; p.hp = CFG_CUR.finalKingHp; } } else if (p.t === 'a' || p.t === 'e') p.j = 1; }
  }
  function settle(S, side, ev) {
    const opp = other(side);
    syncFinal(S, ev);
    // 决战·夺营：帅将站在对方九宫里，对方每走完一步记一回合；自己走出去就清零
    if (S.final) {
      if (!S.occ) S.occ = { r: 0, b: 0 };
      for (const s of ['r', 'b']) {
        const k = findKing(S.board, s), inside = k && inPalace(other(s), k[0], k[1]);
        if (!inside) S.occ[s] = 0;
        else if (s !== side) { S.occ[s]++; ev.push({ e: 'occupy', s, n: S.occ[s] }); }
      }
    }
    const ck = S.final || (side === 'b' && smActive(S)) ? [] : checkers(S.board, side);
    S.ckHist[side].push(ck);
    S.cnt[side]++;
    if (inCheckS(S, opp)) { addMerit(S, side, CFG_CUR.merit.checkReward, ev, '将军'); ev.push({ e: 'check', s: opp }); }
    S.upgraded = false; S.freeUsed = false; S.jmLock = null;
    S.turn = opp;
    if (side === 'b' && round(S) >= CFG_CUR.merit.autoIncomeFromRound) {
      addMerit(S, 'r', CFG_CUR.merit.autoIncomePerRound, ev, '回合'); addMerit(S, 'b', CFG_CUR.merit.autoIncomePerRound, ev, '回合');
    }
  }
  // 试走：不合法返回 null；合法返回结算后的新状态（不改原状态）
  function attempt(S, a) {
    const T = cloneState(S);
    const r = resolve(T, a);
    if (!r) return null;
    // 不占行动的拒马：之后必须还有一步合法的棋可走（含应将），不换手
    if (r.free) { if (!legalMoves(T, T.turn).length) return null; return { S: T, ...r }; }
    // 长将：同一子连续将军不能超过 6 回合
    const lim = CFG_CUR.longCheckLimit, side = S.turn;
    if (lim) {
      const hist = S.ckHist[side];
      if (hist.length >= lim) {
        const ck = side === 'b' && smActive(T) ? [] : checkers(T.board, side);
        const last = hist.slice(-lim);
        if (ck.some(id => last.every(h => h.includes(id)))) return null;
      }
    }
    settle(T, side, r.ev);
    return { S: T, ...r };
  }

  // ---------- 枚举 ----------
  function legalMoves(S, side, normalOnly = false) {
    const out = [];
    const Sx = S.turn === side ? S : { ...cloneState(S), turn: side };
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = Sx.board[r][f]; if (!p || p.s !== side) continue;
      for (const m of moveTargets(Sx, f, r)) {
        const a = { k: 'mv', from: m.from, to: m.to };
        if (attempt(Sx, a)) out.push(a);
      }
    }
    return out;
  }
  function skillActions(S, f, r, only) {
    const p = at(S, f, r); if (!p || p.s !== S.turn) return [];
    const out = [], main = SKILL_OF(p.t, p.s);
    for (const sk of SKILLS_OF(p.t, p.s)) {
      if ((only && sk !== only) || !skillOk(S, p, sk)) continue;
      const tg = sk === 'chongzhen' ? springTargets(S, f, r)
        : sk === 'taying' ? (CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r) ? [] : moveTargets(S, f, r, true))
          : sk === 'feiyue' ? moveTargets(S, f, r, true)
          : sk === 'pili' ? cannonShots(S, f, r)
            : sk === 'qishe' ? arrowTargets(S, f, r) : null;
      const mk = to => { const a = { k: 'sk', at: [f, r] }; if (to) a.to = to; if (sk !== main) a.sk = sk; return a; };
      if (tg) { for (const m of tg) { const a = mk(m.to); if (attempt(S, a)) out.push(a); } }
      else { const a = mk(null); if (attempt(S, a)) out.push(a); }
    }
    return out;
  }
  // —— 电脑用：枚举当前走子方的全部主行动（走子、主动技能、召回良将、终极兵法、停着），连同结算后的状态 ——
  //   不含升级和不占行动的拒马（那两样由电脑另行决定），也不含破釜沉舟（组合太多，见 pofuPairs）
  function expand(S) {
    const out = [], side = S.turn;
    const push = a => { const r = attempt(S, a); if (r && !r.free) out.push({ a, S: r.S, ev: r.ev }); };
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== side) continue;
      for (const m of moveTargets(S, f, r)) push({ k: 'mv', from: m.from, to: m.to });
      if (p.t === 'k' || p.lv < 3 || S.freeUsed) continue;
      const main = SKILL_OF(p.t, p.s);
      for (const sk of SKILLS_OF(p.t, p.s)) {
        if (sk === 'juma' || !skillOk(S, p, sk)) continue;
        const tg = sk === 'chongzhen' ? springTargets(S, f, r)
          : sk === 'taying' ? (CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r) ? [] : moveTargets(S, f, r, true))
            : sk === 'feiyue' ? moveTargets(S, f, r, true)
              : sk === 'pili' ? cannonShots(S, f, r)
                : sk === 'qishe' ? arrowTargets(S, f, r) : null;
        const mk = to => { const a = { k: 'sk', at: [f, r] }; if (to) a.to = to; if (sk !== main) a.sk = sk; return a; };
        if (tg) for (const m of tg) push(mk(m.to)); else push(mk(null));
      }
    }
    if (!S.freeUsed) {
      if (side === 'r' && artOpen(S) && S.used.art.r < CFG_CUR.generalArts.xiaohe.usesPerGame) { const seen = new Set(); for (const d of S.dead.r) { if (seen.has(d.id)) continue; seen.add(d.id); push({ k: 'art', id: d.id }); if (R6() && R6().reviveUp) push({ k: 'art', id: d.id, up: true }); } }   // 试行规则：召回 + 当回合升级
      const U = CFG_CUR.ultimates;
      if (S.merit[side] >= U.cost && S.used.ult[side] < U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame) push({ k: 'ult' });
    }
    if (!out.length) push({ k: 'pass' });
    return out;
  }
  // 电脑用：只列出候选行动、不试走（搜索时按需一个个试，剪枝掉的就省了）。capsOnly = 只要打到敌子的
  //   每项 { a, p: 出手的子, q: 被打的敌子或 null }
  function gen(S, capsOnly) {
    const out = [], side = S.turn, b = S.board;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = b[r][f]; if (!p || p.s !== side) continue;
      for (const m of moveTargets(S, f, r)) { const q = b[m.to[1]][m.to[0]]; if (capsOnly && !q) continue; out.push({ a: { k: 'mv', from: m.from, to: m.to }, p, q: q || null }); }
      if (p.t === 'k' || p.lv < 3 || S.freeUsed) continue;
      const main = SKILL_OF(p.t, p.s);
      for (const sk of SKILLS_OF(p.t, p.s)) {
        if (sk === 'juma' || !skillOk(S, p, sk)) continue;
        if (capsOnly && sk === 'hujia') continue;
        const tg = sk === 'chongzhen' ? springTargets(S, f, r)
          : sk === 'taying' ? (CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r) ? [] : moveTargets(S, f, r, true))
            : sk === 'feiyue' ? moveTargets(S, f, r, true)
              : sk === 'pili' ? cannonShots(S, f, r)
                : sk === 'qishe' ? arrowTargets(S, f, r) : null;
        const mk = to => { const a = { k: 'sk', at: [f, r] }; if (to) a.to = to; if (sk !== main) a.sk = sk; return a; };
        if (tg) for (const m of tg) { const q = b[m.to[1]][m.to[0]]; if (capsOnly && !(q && q.s !== side)) continue; out.push({ a: mk(m.to), p, q: q && q.s !== side ? q : null, sk }); }
        else out.push({ a: mk(null), p, q: null, sk });
      }
    }
    if (!capsOnly && !S.freeUsed) {
      if (side === 'r' && artOpen(S) && S.used.art.r < CFG_CUR.generalArts.xiaohe.usesPerGame) { const seen = new Set(); for (const d of S.dead.r) { if (seen.has(d.id)) continue; seen.add(d.id); out.push({ a: { k: 'art', id: d.id }, p: null, q: null, art: d.t }); if (R6() && R6().reviveUp && !S.upgraded) out.push({ a: { k: 'art', id: d.id, up: true }, p: null, q: null, art: d.t }); } }   // 试行规则：召回 + 当回合升级
      const U = CFG_CUR.ultimates;
      if (S.merit[side] >= U.cost && S.used.ult[side] < U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame) out.push({ a: { k: 'ult' }, p: null, q: null, ult: true });
    }
    return out;
  }
  // 电脑用：架拒马（不占行动）之后的状态；不能架返回 null
  function jumaState(S, at_) { const r = attempt(S, { k: 'sk', at: at_ }); return r && r.free ? r.S : null; }
  // 电脑用：升级之后的状态；不能升返回 null
  function upgradeState(S, at_) {
    const p0 = at(S, at_[0], at_[1]);
    if (!p0 || p0.s !== S.turn || p0.t === 'k' || p0.lv >= maxLv(p0.t) || S.upgraded || S.merit[p0.s] < upCost(p0)) return null;
    const T = cloneState(S), p = T.board[at_[1]][at_[0]];
    T.merit[p.s] -= upCost(p); promote(T, p); p.xp = 0; T.upgraded = true;
    return T;
  }
  // 电脑用：破釜沉舟的两步组合——两步里至少有一步打到敌子（先挪开再打、先打再打、打完再撤都算）
  // only（可选）：只列“有一步是这枚子（按 id）走的”组合——电脑用来只补算刚升了级的那枚子带来的新组合
  // keep（可选）：keep(m1, 第一步打到的子 | null, m2, 第二步打到的子 | null) 返回 false 的组合不去试走（电脑用来先筛掉明显没油水的，省时间）
  function pofuPairs(S, only, keep) {
    if (S.turn !== 'b' || S.freeUsed || !artOpen(S) || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
    // 结果和“每个组合都 attempt 一遍”完全一样（test/bingfa.test.js 里逐个核对），只是省掉了重复劳动：
    //   第一步只结算一次，第二步从第一步结算完的局面接着走；每一步照 resolve() 里破釜沉舟那一段原样结算
    const out = [], side = 'b', lim = CFG_CUR.longCheckLimit, hist = S.ckHist[side];
    const BS = BSon(), bsDef = !!BS && inCheckF(S, 'b');   // 背水一战：楚方被将军时，不打子的两步（防守）也列出来
    const step = (T, m, ev) => {
      const p = T.board[m.from[1]][m.from[0]];
      const res = strike(T, m.from, m.to, side, ev);
      if (m.via) { setCd(T, p, m.via); ev.push({ e: 'passive', sk: m.via, id: p.id }); }
      trample(T, p, m.to, res, side, ev);
      return !!BS || !inCheckF(T, side);   // 背水一战中途不查将军，只看两步走完
    };
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== 'b') continue;
      const mine1 = only == null || p.id === only;
      for (const m1 of moveTargets(S, f, r)) {
        const t1 = at(S, m1.to[0], m1.to[1]), hit1 = !!t1;
        const T = cloneState(S), ev1 = [];
        if (!step(T, m1, ev1)) continue;
        for (let r2 = 0; r2 < 10; r2++) for (let f2 = 0; f2 < 9; f2++) {
          const q = T.board[r2][f2]; if (!q || q.s !== 'b') continue;
          if (!mine1 && q.id !== only) continue;
          if (BS && BS.twoPieces && q.id === p.id) continue;
          for (const m2 of moveTargets(T, f2, r2)) {
            const t2 = at(T, m2.to[0], m2.to[1]);
            if (!hit1 && !t2 && !bsDef) continue;
            if (keep && !keep(m1, t1, m2, t2)) continue;
            const U = cloneState(T), ev = ev1.slice();
            if (!step(U, m2, ev)) continue;
            if (!bsFinish(U, BS, [p.id, q.id], ev, 0)) continue;
            U.used.art[side]++;
            if (inCheckS(U, side)) continue;
            if (lim && hist.length >= lim) {     // 长将（和 attempt() 里一样）
              const ck = smActive(U) ? [] : checkers(U.board, side), last = hist.slice(-lim);
              if (ck.some(id => last.every(h => h.includes(id)))) continue;
            }
            settle(U, side, ev);
            out.push({ a: { k: 'art', steps: [{ from: m1.from, to: m1.to }, { from: m2.from, to: m2.to }] }, S: U, ev });
          }
        }
      }
    }
    return out;
  }
  // 老写法（每个组合都 attempt 一遍），留着给测试核对上面那份
  function pofuPairsRef(S, only, keep) {
    if (S.turn !== 'b' || S.freeUsed || !artOpen(S) || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
    const out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== 'b') continue;
      const mine1 = only == null || p.id === only;
      for (const m1 of moveTargets(S, f, r)) {
        const t1 = at(S, m1.to[0], m1.to[1]), hit1 = !!t1;
        const T = cloneState(S), ev = [];
        strike(T, m1.from, m1.to, 'b', ev);
        if (!T.final && inCheck(T.board, 'b') && !BSon()) continue;
        for (let r2 = 0; r2 < 10; r2++) for (let f2 = 0; f2 < 9; f2++) {
          const q = T.board[r2][f2]; if (!q || q.s !== 'b') continue;
          if (!mine1 && q.id !== only) continue;
          for (const m2 of moveTargets(T, f2, r2)) {
            const t2 = at(T, m2.to[0], m2.to[1]);
            if (!hit1 && !t2 && !(BSon() && inCheckF(S, 'b'))) continue;
            if (keep && !keep(m1, t1, m2, t2)) continue;
            const a = { k: 'art', steps: [{ from: m1.from, to: m1.to }, { from: m2.from, to: m2.to }] };
            const res = attempt(S, a); if (res) out.push({ a, S: res.S, ev: res.ev });
          }
        }
      }
    }
    return out;
  }
  function reviveOptions(S) {
    if (S.turn !== 'r' || S.freeUsed || !artOpen(S) || S.used.art.r >= CFG_CUR.generalArts.xiaohe.usesPerGame) return [];
    const seen = new Set(), out = [];
    const R = R6();
    for (const d of S.dead.r) {
      if (seen.has(d.id)) continue; seen.add(d.id);
      const a = { k: 'art', id: d.id }, T = attempt(S, a); if (!T) continue;
      const st = START[d.id], pr = T.S.board[st[1]][st[0]], o = { ...a, t: d.t, at: st, lv: pr ? pr.lv : 1 };   // lv：回来是几级
      // 试行规则：召回后当场升一级要几点军功（已经是半价）、现在升不升得起
      if (R && R.reviveUp && pr) { const c = upCost(pr); if (c != null) { o.upCost = c; o.upLv = pr.lv + 1; o.canUp = !!attempt(S, { ...a, up: true }); } }
      out.push(o);
    }
    return out;
  }
  // 破釜沉舟第一步的可选着法（必须存在能合法走完的第二步）
  function pofuFirst(S) {
    if (S.turn !== 'b' || S.freeUsed || !artOpen(S) || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
    const out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== 'b') continue;
      for (const m of moveTargets(S, f, r)) if (pofuSecond(S, m, true).length) out.push(m);
    }
    return out;
  }
  function pofuSecond(S, m1, any = false) {
    const T = cloneState(S), ev = [];
    if (!at(T, m1.from[0], m1.from[1])) return [];
    strike(T, m1.from, m1.to, 'b', ev);
    if (!T.final && inCheck(T.board, 'b') && !BSon()) return [];   // 背水一战：第一步走完被将也行，只看两步走完
    const out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = T.board[r][f]; if (!p || p.s !== 'b') continue;
      for (const m2 of moveTargets(T, f, r)) {
        if (attempt(S, { k: 'art', steps: [{ from: m1.from, to: m1.to }, { from: m2.from, to: m2.to }] })) { out.push(m2); if (any) return out; }
      }
    }
    return out;
  }
  function ultReady(S) {
    const side = S.turn, U = CFG_CUR.ultimates;
    if (S.freeUsed) return false;
    if (S.merit[side] < U.cost || S.used.ult[side] >= U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame) return false;
    return !!attempt(S, { k: 'ult' });
  }
  function hasAnyAction(S) {
    if (legalMoves(S, S.turn).length) return true;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === S.turn && skillActions(S, f, r).length) return true; }
    if (reviveOptions(S).length || pofuFirst(S).length || ultReady(S)) return true;
    return false;
  }
  // 普通走子里“非攻击”的（空格或只剩 1 点的敌子）——困毙只看这些
  function plainMoves(S) {
    return legalMoves(S, S.turn).filter(a => { const q = at(S, a.to[0], a.to[1]); return !q || q.hp <= atk(at(S, a.from[0], a.from[1])); });
  }
  // 轮到 S.turn 时：将死 / 困毙 / 只能停着
  function evaluate(S) {
    const side = S.turn, opp = other(side);
    // 决战：帅将被打到 0 血即告负
    if (S.final) for (const s of ['r', 'b']) if (!findKing(S.board, s)) return { result: { winner: other(s), loser: s, reason: 'kingdead' } };
    if (S.final && S.occ) for (const s of [opp, side]) if (S.occ[s] >= CFG_CUR.finalOccupyRounds) return { result: { winner: s, loser: other(s), reason: 'occupy' } };
    if (inCheckS(S, side)) {
      if (!hasAnyAction(S)) return { result: { winner: opp, loser: side, reason: 'checkmate' } };
      return { check: true };
    }
    // 四面楚歌：楚军没被将军时可以走将，也可以直接停着
    if (side === 'b' && smActive(S)) return { mayPass: true, mustPass: !legalMoves(S, side).length };
    if (!plainMoves(S).length) {
      if (restricted(S, side)) return { mustPass: !legalMoves(S, side).length, mayPass: !legalMoves(S, side).length };
      return { result: { winner: opp, loser: side, reason: 'stalemate' } };
    }
    return {};
  }

  // 这枚子的这个技能现在为什么不能用（界面说明用）；能用返回 ''
  const LVCN = ['', '一', '二', '三', '四'];
  function skillWhy(S, f, r, sk) {
    const p = at(S, f, r); if (!p || !SKILLS_OF(p.t, p.s).includes(sk)) return '';
    if (p.lv < skLevel(sk)) return `升到${LVCN[skLevel(sk)]}级解锁`;
    const left = Math.max(0, (p[cdKey(p, sk)] || 0) - S.cnt[p.s]);
    if (isPassive(sk)) {
      if (p.s === 'b' && smActive(S)) return CFG_CUR.skills[sk].move ? '四面楚歌期间楚军不能移动' : '四面楚歌期间楚军没有技能';
      return CFG_CUR.skills[sk].cooldown && left ? `冷却中，还要 ${left} 回合` : '';
    }
    if (p.s === 'b' && smActive(S)) return '四面楚歌期间楚军不能用技能';
    if (p.s === 'b' && pfActive(S)) return '破釜沉舟之后楚军暂时不能用技能';
    if (S.freeUsed) return '已经架了拒马，这回合只能再走一步棋';
    if (left) return `冷却中，还要 ${left} 回合`;
    if (sk === 'taying' && CFG_CUR.skills.taying.enemyHalfOnly && ownHalf(p.s, r)) return '踏营只能在敌方半场使用——这匹马要先过河';
    if (p.s === S.turn && !skillActions(S, f, r, sk).length) return sk === 'juma' ? '架了拒马就无棋可走' : '现在没有可用的目标';
    return '';
  }

  // ---------- 对局 ----------
  class Game {
    constructor(cfg) { this.cfg = cfg || CFG; CFG_CUR = this.cfg; this.reset(); }
    reset(base) {
      this.base = base ? cloneState(base) : newState(this.cfg);
      this.S = cloneState(this.base);
      // ends[i]：第 i 条行动是否结束了这一方的回合（升级、拒马不结束）
      this.entries = []; this.sides = []; this.ends = []; this.history = []; this.result = null; this.last = null; this.status = evaluate(this.S);
    }
    get bf() { return true; }
    get board() { return this.S.board; }
    get turn() { return this.S.turn; }
    get round() { return round(this.S); }
    at(f, r) { return at(this.S, f, r); }
    inCheck(s) { return inCheckS(this.S, s || this.S.turn); }
    kingPos(s) { return findKing(this.S.board, s); }
    // 普通走子目标（含攻击）
    legalFrom(f, r) { const p = this.at(f, r); if (!p || p.s !== this.turn || this.result) return []; return moveTargets(this.S, f, r).filter(m => attempt(this.S, { k: 'mv', from: m.from, to: m.to })); }
    isLegal(m) { return this.legalFrom(m.from[0], m.from[1]).some(x => x.to[0] === m.to[0] && x.to[1] === m.to[1]); }
    // 按走法能走、但走了自己会被将军的着法（界面提示用）；why 同 XQ：'face' 将帅照面 / 'self' 被对方的子将着
    selfCheckFrom(f, r) {
      CFG_CUR = this.cfg;
      const p = this.at(f, r), S = this.S;
      if (!p || p.s !== this.turn || this.result || S.final || (S.jmLock != null && p.id === S.jmLock) || frozen(S, p)) return [];
      const out = [];
      for (const m of moveTargets(S, f, r)) {
        const T = cloneState(S);
        if (resolve(T, { k: 'mv', from: m.from, to: m.to })) continue;   // resolve 只在“走完自己被将军”时才拒绝一步符合走法的棋
        out.push({ ...m, why: XQ.kingsFace(T.board) ? 'face' : 'self' });
      }
      return out;
    }
    skillTargets(f, r, sk) { CFG_CUR = this.cfg; return this.result ? [] : skillActions(this.S, f, r, sk); }
    skillOf(p) { return p && p.t !== 'k' ? SKILL_OF(p.t, p.s) : null; }
    skillsOf(p) { return p && p.t !== 'k' ? SKILLS_OF(p.t, p.s) : []; }
    skLevel(sk) { CFG_CUR = this.cfg; return skLevel(sk); }
    hasSkill(p, sk) { CFG_CUR = this.cfg; return !!p && hasSkill(p, sk); }
    skillReady(p, sk) { CFG_CUR = this.cfg; return !!p && skillReady(this.S, p, sk); }
    skillWhy(f, r, sk) { CFG_CUR = this.cfg; return skillWhy(this.S, f, r, sk); }
    rankName(p, lv) { return p ? rankName(p.s, p.t, lv || p.lv) : ''; }
    heroName(p) { return heroName(p); }
    reviveOptions() { return this.result ? [] : reviveOptions(this.S); }
    pofuFirst() { return this.result ? [] : pofuFirst(this.S); }
    pofuSecond(m1) { return pofuSecond(this.S, m1); }
    pofuPreview(m1) { return pofuPreview(this.S, m1); }
    revived(p) { return revived(this.S, p); }
    bsFree(m1) { CFG_CUR = this.cfg; return bsFree(this.S, m1); }
    bsJudge(steps) { CFG_CUR = this.cfg; return bsJudge(this.S, steps); }
    ultReady() { return !this.result && ultReady(this.S); }
    upgradeCost(p) { CFG_CUR = this.cfg; return upCost(p); }
    baseCost(p) { CFG_CUR = this.cfg; if (!p || p.t === 'k' || p.lv >= maxLv(p.t)) return null; return baseCostOf(p); }
    maxLv(p) { CFG_CUR = this.cfg; return p ? maxLv(p.t) : 1; }
    atkOf(p) { CFG_CUR = this.cfg; return p ? atk(p) : 1; }
    isPassive(sk) { CFG_CUR = this.cfg; return isPassive(sk); }
    get freeUsed() { return !!this.S.freeUsed; }
    get jmLock() { return this.S.jmLock; }
    canUpgrade(f, r) {
      CFG_CUR = this.cfg;
      const p = this.at(f, r), S = this.S;
      if (this.result || !p || p.s !== S.turn || p.t === 'k' || p.lv >= maxLv(p.t) || S.upgraded) return false;
      return S.merit[p.s] >= upCost(p);
    }
    // 记录一条行动（升级或主行动）并执行；返回动画信息
    // 调试「无冷却」：每次行动后把全盘冷却清零
    apply(e) {
      const r = this._apply(e);
      if (r && this.noCd) for (const row of this.S.board) for (const p of row) if (p) { p.cd = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; }
      return r;
    }
    _apply(e) {
      CFG_CUR = this.cfg;
      if (this.result) return null;
      const S = this.S;
      // 旧版存档里的神速营是主动技能，现在是走法
      if (e.k === 'sk' && e.sk === 'shensu' && e.to) e = { k: 'mv', from: e.at, to: e.to };
      if (e.k === 'up') {
        if (!this.canUpgrade(e.at[0], e.at[1])) return null;
        const p = this.at(e.at[0], e.at[1]);
        const cost = upCost(p), xp = p.xp || 0;
        S.merit[p.s] -= cost;
        promote(S, p);
        p.xp = 0; // 甲片在升级时用掉
        S.upgraded = true;
        this.entries.push({ k: 'up', at: e.at.slice() }); this.sides.push(p.s); this.ends.push(0);
        const info = { k: 'up', side: p.s, id: p.id, t: p.t, at: e.at.slice(), lv: p.lv, hp: p.hp, cost, usedXp: xp, nm: p.nm, ev: [], after: S };
        this.last = info;
        return info;
      }
      const before = S, side = S.turn;
      const r = attempt(S, e);
      if (!r) return null;
      this.S = r.S;
      this.entries.push(JSON.parse(JSON.stringify(e))); this.sides.push(side); this.ends.push(r.free ? 0 : 1);
      if (r.free) {
        // 不占行动的拒马：不进棋谱主行动、不换手，状态只记“还要再走一步”
        const piece = before.board[e.at[1]][e.at[0]];
        this.status = { free: true, check: inCheckS(this.S, side) };
        const info = { k: 'sk', free: true, side, mover: side, from: e.at.slice(), to: null, pid: piece ? piece.id : null, cap: null, kills: [], ev: r.ev, extra: r.extra, e, check: false, result: null, before, after: this.S };
        this.last = info;
        return info;
      }
      const kills = r.ev.filter(x => x.e === 'kill');
      const capE = kills.find(x => x.s !== side);
      const piece = e.from ? before.board[e.from[1]][e.from[0]] : e.at ? before.board[e.at[1]][e.at[0]] : null;
      const h = { k: e.k, side, from: e.from || e.at || null, to: e.to || null, pid: piece ? piece.id : null, cap: capE ? { s: capE.s, t: capE.t, id: capE.id, lv: capE.lv } : null, kills, ev: r.ev, extra: r.extra, e };
      this.history.push(h);
      const st = evaluate(this.S);
      this.status = st;
      if (st.result) this.result = st.result;
      const info = { ...h, mover: side, check: inCheckS(this.S, other(side)), result: this.result, ply: this.history.length - 1, before, after: this.S };
      this.last = info;
      return info;
    }
    // 从头重放到第 n 条（悔棋、断线重连都走这里）
    rebuild(n) {
      const es = this.entries.slice(0, n);
      const base = this.base;
      this.reset(base);
      for (const e of es) if (!this.apply(e)) return false;
      return true;
    }
    // 悔掉最近 k 次主行动（连同其前面的升级）
    undoActions(k) { return this.rebuild(this.undoTarget(k)); }
    // 悔 k 次主行动应退回到第几条（连同同一回合里前面的升级、拒马）
    undoTarget(k) {
      let n = this.entries.length, left = k;
      while (n > 0 && left > 0) { n--; if (this.ends[n]) left--; }
      while (n > 0 && !this.ends[n - 1]) n--;
      return n;
    }
    timeout(side) { if (this.result) return null; this.result = { winner: other(side), loser: side, reason: 'timeout' }; return this.result; }
    resign(side) { if (this.result) return null; this.result = { winner: other(side), loser: side, reason: 'resign' }; return this.result; }
    // 调试：直接摆局面
    setup(fn) {
      CFG_CUR = this.cfg;
      const T = cloneState(this.S); fn(T);
      // 摆子之后重新判断是不是决战局面；不是了就把解禁标记和帅将的 3 点血收回
      const still = !T.board.some(row => row.some(p => p && ATTACKERS.includes(p.t)));
      if (!still) { T.final = false; T.occ = { r: 0, b: 0 }; for (const row of T.board) for (const p of row) if (p) { if (p.w) p.hp = 1; delete p.w; delete p.j; } }
      syncFinal(T); this.reset(T); this.status = evaluate(this.S);
    }
    get final() { return !!this.S.final; }
    get occ() { return this.S.occ || { r: 0, b: 0 }; }
    get merit() { return this.S.merit; }
    get used() { return this.S.used; }
    get fx() { return { hm: Math.max(0, this.S.fx.hm - this.S.cnt.r), sm: Math.max(0, this.S.fx.sm - this.S.cnt.b), pf: Math.max(0, this.S.fx.pf - this.S.cnt.b) }; }
    get dead() { return this.S.dead; }
    get upgraded() { return this.S.upgraded; }
    jmActive(p) { return jmActive(this.S, p); }
    frozen(p) { return frozen(this.S, p); }   // 背水一战用过的子：这一回合不能动
    simianCount() { return simianCount(this.S); }
    cdLeft(p, sk) { if (!p) return 0; const k = sk ? cdKey(p, sk) : 'cd'; return Math.max(0, (p[k] || 0) - this.S.cnt[p.s]); }
    mustPass() { return !!this.status.mustPass; }
    mayPass() { return !this.result && !!(this.status.mustPass || this.status.mayPass); }
    quietPlies() { return 0; }
  }

  // 只读视图：动画结束时按这一刻的状态对齐棋盘（装饰需要的效果剩余回合等）
  function view(S) {
    return {
      bf: true, board: S.board,
      fx: { hm: Math.max(0, S.fx.hm - S.cnt.r), sm: Math.max(0, S.fx.sm - S.cnt.b), pf: Math.max(0, S.fx.pf - S.cnt.b) },
      jmActive: p => jmActive(S, p),
      frozen: p => frozen(S, p),
    };
  }
  // 破釜沉舟第一步走完后的局面（界面预览用）
  function pofuPreview(S, m1) {
    const T = cloneState(S), ev = [];
    strike(T, m1.from, m1.to, 'b', ev);
    return { S: T, ev };
  }
  // 背水一战（界面用）：不筛合不合法，把能走的步都列出来——没给 m1 是第一步；给了就是第一步走完之后、别的子的第二步
  //   返回 { S: 第一步走完的局面, ev, list }
  function bsFree(S, m1) {
    const BS = BSon(), list = [];
    let T = S, ev = [], moved = null;
    if (m1) {
      T = cloneState(S);
      const p = at(T, m1.from[0], m1.from[1]), mm = p && p.s === 'b' && findMove(T, m1.from, m1.to);
      if (!mm) return { S: T, ev, list };
      moved = p.id;
      const res = strike(T, m1.from, m1.to, 'b', ev);
      if (mm.via) { setCd(T, p, mm.via); ev.push({ e: 'passive', sk: mm.via, id: p.id }); }
      trample(T, p, m1.to, res, 'b', ev);
    }
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const q = T.board[r][f]; if (!q || q.s !== 'b') continue;
      if (moved != null && BS && BS.twoPieces && q.id === moved) continue;
      for (const m of moveTargets(T, f, r)) list.push(m);
    }
    return { S: T, ev, list };
  }
  // 背水一战（界面用）：这两步行不行；不行的话为什么、是哪几枚子造成的
  //   行 → { ok: true }；不行 → { ok: false, why: 'self' 被将军 | 'face' 将帅照面 | 'give' 将着对方 | 'kills' 吃多了 | 'long' 长将 | 'other', marks: [[f,r]…], links: [[从, 到]…], S: 两步走完的局面, ev }
  function bsJudge(S, steps) {
    if (attempt(S, { k: 'art', steps })) return { ok: true };
    const BS = BSon(), T = cloneState(S), ev = [], out = { ok: false, why: 'other', marks: [], links: [], S: T, ev };
    for (const m of steps) {
      const p = at(T, m.from[0], m.from[1]), mm = p && p.s === 'b' && findMove(T, m.from, m.to);
      if (!mm) return out;
      const res = strike(T, m.from, m.to, 'b', ev);
      if (mm.via) { setCd(T, p, mm.via); ev.push({ e: 'passive', sk: mm.via, id: p.id }); }
      trample(T, p, m.to, res, 'b', ev);
    }
    const where = id => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const q = T.board[r][f]; if (q && q.id === id) return [f, r]; } return null; };
    const kb = findKing(T.board, 'b'), kr = findKing(T.board, 'r');
    const byCheck = (why, king, ids) => { out.why = why; if (king) out.marks.push(king); for (const id of ids) { const c = where(id); if (c) { out.marks.push(c); if (king) out.links.push([c, king]); } } return out; };
    if (T.final) return out;
    if (kb && kr && facing(T.board)) { out.why = 'face'; out.marks.push(kb, kr); out.links.push([kb, kr]); return out; }
    if (inCheckF(T, 'b')) return byCheck('self', kb, checkers(T.board, 'r'));
    if (inCheckF(T, 'r')) return byCheck('give', kr, checkers(T.board, 'b'));
    const dead = ev.filter(e => e.e === 'kill' && !e.friendly && e.s === 'r');
    if (BS && dead.length > BS.maxKills) { out.why = 'kills'; for (const e of dead) if (e.at) out.marks.push(e.at.slice()); return out; }
    const lim = CFG_CUR.longCheckLimit, hist = S.ckHist.b;
    if (lim && hist.length >= lim) out.why = 'long';
    return out;
  }
  // 某兵种某一级的数值（界面说明用）
  function levelInfo(t, s, lv, cfg = CFG) {
    const sk = t === 'k' ? null : SKILL_OF(t, s);
    const lvOf = k => (cfg.skills[k] && cfg.skills[k].level) || cfg.skillLevel;
    return {
      hp: hpTbl(t, cfg)[lv - 1], atk: (atkTbl(t, cfg)[lv - 1] || 1),
      skill: sk && lv >= cfg.skillLevel ? sk : null, skills: t === 'k' ? [] : SKILLS_OF(t, s).filter(k => lv >= lvOf(k)),
      maxLv: t === 'k' ? 1 : (cfg.upgrade.maxLevel[t] || cfg.upgrade.defaultMaxLevel),
    };
  }
  const BF = { Game, CFG, view, pofuPreview, SKILL_OF, SKILLS_OF, SKILL_CN, SKILL_DESC, ART_CN, ULT_CN, RANK_CN, HERO_CN, heroName, rankName, START, newState, cloneState, attempt, evaluate, levelInfo, maxLvOf: t => maxLv(t),
    // 电脑用（调用前会把配置指到默认值）
    // version：接口每加一个函数就 +1；只增不改，已有函数的参数和返回值不动
    ai: { version: 1, gen: (S, c) => { CFG_CUR = CFG; return gen(S, c); }, atk: p => { CFG_CUR = CFG; return atk(p); }, expand: S => { CFG_CUR = CFG; return expand(S); }, upgradeState: (S, a) => { CFG_CUR = CFG; return upgradeState(S, a); }, jumaState: (S, a) => { CFG_CUR = CFG; return jumaState(S, a); }, pofuPairs: (S, only, keep) => { CFG_CUR = CFG; return pofuPairs(S, only, keep); }, pofuPairsRef: (S, only, keep) => { CFG_CUR = CFG; return pofuPairsRef(S, only, keep); }, artReady: S => { CFG_CUR = CFG; const sd = S.turn; return !S.freeUsed && artOpen(S) && S.used.art[sd] < CFG.generalArts[sd === 'r' ? 'xiaohe' : 'pofu'].usesPerGame && !(sd === 'b' && smActive(S)); }, inCheck: (S, s) => inCheckS(S, s), upCost: p => { CFG_CUR = CFG; return upCost(p); }, moveTargets: (S, f, r) => { CFG_CUR = CFG; return moveTargets(S, f, r); } }, hpOf: (t, lv) => hpOf(t, lv, CFG) };
  if (typeof module !== 'undefined' && module.exports) module.exports = BF;
  global.BF = BF;
})(typeof window !== 'undefined' ? window : globalThis);
