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
    generalArts: { xiaohe: { usesPerGame: 1 }, pofu: { usesPerGame: 1, steps: 2, mayEndInCheck: false, skillLockRounds: 3 } },
    ultimates: { cost: 20, hongmen: { usesPerGame: 1, rounds: 3 }, simian: { usesPerGame: 1, rounds: 2, radius: 2, minPiecesInRadius: 3 } },
    longCheckLimit: 6,
  };
  // 主技能（三级解锁）；SKILLS_OF 列出这一兵种全部技能（含四级的）
  const SKILL_OF = (t, s) => ({ p: 'juma', r: 'chongzhen', n: 'taying', c: 'pili', a: 'hujia', e: s === 'r' ? 'qishe' : 'jianta' })[t] || null;
  const SKILLS_OF = (t, s) => ({ p: ['juma', 'shensu', 'huifang'], a: ['hujia', 'jinwei'], e: [s === 'r' ? 'qishe' : 'jianta', 'feiyue'] })[t] || (SKILL_OF(t, s) ? [SKILL_OF(t, s)] : []);
  const SKILL_CN = { juma: '拒马', chongzhen: '冲阵', taying: '踏营', pili: '霹雳', qishe: '齐射', jianta: '践踏', hujia: '护驾', shensu: '神速营', huifang: '回防', jinwei: '铁甲禁卫', feiyue: '飞越' };
  const ART_CN = { r: '召回良将', b: '破釜沉舟' }, ULT_CN = { r: '四面楚歌', b: '鸿门宴' };
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
  const atk = p => (p.t === 'k' ? 1 : ((CFG_CUR.attack[p.t] || [])[p.lv - 1] || 1));
  const hpOf = (t, lv, cfg = CFG_CUR) => ((cfg.hpByType[t] || cfg.hp)[lv - 1]);
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
  const upCost = p => { const U = CFG_CUR.upgrade; if (!p || p.t === 'k' || p.lv >= maxLv(p.t)) return null; const base = U.cost[p.t][p.lv - 1]; return Math.max(U.minCost, base - (p.xp || 0) * U.killDiscount); };

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
    S.dead[v.s].push({ id: v.id, t: v.t, s: v.s });
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
      if (U.autoByPlates && by.hp > 0 && by.lv < maxLv(by.t) && by.xp * U.killDiscount >= U.cost[by.t][by.lv - 1]) {
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
      const m = findMove(S, a.from, a.to); if (!m) return null;
      extra.res = strike(S, a.from, a.to, side, ev);
      if (m.via) { setCd(S, p, m.via); extra.via = m.via; ev.push({ e: 'passive', sk: m.via, id: p.id }); }
      trample(S, p, a.to, extra.res, side, ev);
    } else if (a.k === 'sk') {
      const p = own(a.at[0], a.at[1]); if (!p) return null;
      const sk = a.sk || SKILL_OF(p.t, p.s); if (!sk || !skillOk(S, p, sk)) return null;
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
        S.board[k[1]][k[0]] = p; S.board[a.at[1]][a.at[0]] = K;
        ev.push({ e: 'swap', a: p.id, b: K.id, pa: a.at.slice(), pb: k.slice() });
        // 樊哙闯帐：汉士护驾，当场破掉鸿门宴
        if (side === 'r' && hmActive(S)) { S.fx.hm = S.cnt.r; extra.rescue = true; ev.push({ e: 'rescue', id: p.id, at: k.slice() }); }
      } else return null;
      cd();
    } else if (a.k === 'art') {
      if (S.used.art[side] >= CFG_CUR.generalArts[side === 'r' ? 'xiaohe' : 'pofu'].usesPerGame) return null;
      if (side === 'b' && smActive(S)) return null;
      if (side === 'r') {
        const i = S.dead.r.findIndex(d => d.id === a.id); if (i < 0) return null;
        const d = S.dead.r[i], st = START[d.id];
        if (!st || at(S, st[0], st[1])) return null;
        S.dead.r.splice(i, 1);
        S.board[st[1]][st[0]] = { s: 'r', t: d.t, id: d.id, lv: 1, hp: hpOf(d.t, 1), cd: 0, jm: 0, xp: 0, kills: 0 };
        ev.push({ e: 'revive', id: d.id, t: d.t, at: st.slice() });
      } else {
        const steps = a.steps || [];
        if (steps.length !== CFG_CUR.generalArts.pofu.steps) return null;
        extra.steps = [];
        for (const m of steps) {
          const p = own(m.from[0], m.from[1]); if (!p) return null;
          const mm = findMove(S, m.from, m.to); if (!mm) return null;
          const n0 = ev.length;
          const res = strike(S, m.from, m.to, side, ev);
          if (mm.via) { setCd(S, p, mm.via); ev.push({ e: 'passive', sk: mm.via, id: p.id }); }
          trample(S, p, m.to, res, side, ev);
          extra.steps.push({ from: m.from, to: m.to, res, ev0: n0, ev1: ev.length });
          if (inCheckF(S, side)) return null;
        }
        if (!CFG_CUR.generalArts.pofu.mayEndInCheck && inCheckF(S, 'r')) return null;
        S.fx.pf = S.cnt.b + 1 + CFG_CUR.generalArts.pofu.skillLockRounds;
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
  function reviveOptions(S) {
    if (S.turn !== 'r' || S.freeUsed || S.used.art.r >= CFG_CUR.generalArts.xiaohe.usesPerGame) return [];
    const seen = new Set(), out = [];
    for (const d of S.dead.r) { if (seen.has(d.id)) continue; seen.add(d.id); const a = { k: 'art', id: d.id }; if (attempt(S, a)) out.push({ ...a, t: d.t, at: START[d.id] }); }
    return out;
  }
  // 破釜沉舟第一步的可选着法（必须存在能合法走完的第二步）
  function pofuFirst(S) {
    if (S.turn !== 'b' || S.freeUsed || S.used.art.b >= CFG_CUR.generalArts.pofu.usesPerGame || smActive(S)) return [];
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
    if (!T.final && inCheck(T.board, 'b')) return [];
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
    ultReady() { return !this.result && ultReady(this.S); }
    upgradeCost(p) { CFG_CUR = this.cfg; return upCost(p); }
    baseCost(p) { if (!p || p.t === 'k' || p.lv >= maxLv(p.t)) return null; return this.cfg.upgrade.cost[p.t][p.lv - 1]; }
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
    };
  }
  // 破釜沉舟第一步走完后的局面（界面预览用）
  function pofuPreview(S, m1) {
    const T = cloneState(S), ev = [];
    strike(T, m1.from, m1.to, 'b', ev);
    return { S: T, ev };
  }
  // 某兵种某一级的数值（界面说明用）
  function levelInfo(t, s, lv, cfg = CFG) {
    const sk = t === 'k' ? null : SKILL_OF(t, s);
    const lvOf = k => (cfg.skills[k] && cfg.skills[k].level) || cfg.skillLevel;
    return {
      hp: (cfg.hpByType[t] || cfg.hp)[lv - 1], atk: t === 'k' ? 1 : ((cfg.attack[t] || [])[lv - 1] || 1),
      skill: sk && lv >= cfg.skillLevel ? sk : null, skills: t === 'k' ? [] : SKILLS_OF(t, s).filter(k => lv >= lvOf(k)),
      maxLv: t === 'k' ? 1 : (cfg.upgrade.maxLevel[t] || cfg.upgrade.defaultMaxLevel),
    };
  }
  const BF = { Game, CFG, view, pofuPreview, SKILL_OF, SKILLS_OF, SKILL_CN, SKILL_DESC, ART_CN, ULT_CN, RANK_CN, HERO_CN, heroName, rankName, START, newState, cloneState, attempt, evaluate, levelInfo, hpOf: (t, lv) => hpOf(t, lv, CFG) };
  if (typeof module !== 'undefined' && module.exports) module.exports = BF;
  global.BF = BF;
})(typeof window !== 'undefined' ? window : globalThis);
