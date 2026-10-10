// ===== 技能模式的电脑 =====
// 全宽 αβ 搜索（逐层加深、按时间收手）+ 吃子静态搜索（把“这一步之后谁的子会被白吃”算清楚）+ 带位置感的估值；
// 升级、拒马、主帅兵法、终极兵法另有各自的判断。整份代码既在页面里跑，也原样放进 Web Worker。
(function (global) {
  const BF = global.BF || require('./bingfa.js');
  const A = BF.ai, CFG = BF.CFG;
  const other = s => (s === 'r' ? 'b' : 'r');
  const WIN = 9000, INF = 1e9;
  const VAL = { r: 9, c: 4.6, n: 4.2, e: 2.3, a: 2.1, p: 1.1, k: 0 };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // ---------- 估值 ----------
  // 一枚子本身值多少。血量最要紧：两点血的子要打两下才死、来犯的还会被弹回去，所以每多一点血都很值钱；
  //   反过来，被“打中没吃掉”掉一点血，也是实打实的损失（两血的车掉一血 = 丢了三分之一个子）
  //   士、相 / 象是守家的子，多一点血用处不大（平时出不了九宫、过不了河）；到决战解禁之后才和进攻子一样算
  //   例外：对方有两点血以上的进攻子时，士的第二点血很要紧——二级士攻击 2，是唯一砍得死“贴脸将军的两血子”的守子
  const KD = (typeof process !== 'undefined' && process.env && process.env.BFAI_KD ? process.env.BFAI_KD.split(',').map(Number) : [2.0, 1.0, 0.4, 0.9, 1.2, 0.6]);   // 砍不死的子贴近对方主帅的加分：车贴身 / 隔一格 / 同线，马，兵贴身 / 隔一格
  const ENV = (typeof process !== 'undefined' && process.env) || {};
  // 破釜沉舟之后楚方兵种技能被封的那几回合，对汉方值多少分（封锁走完线性退掉）；PFD：这几回合里汉方多算几层。数值待量，先默认 0
  const CX = ENV.BFAI_CX != null ? +ENV.BFAI_CX : 2;   // 将军延伸最多几次
  const PFX = ENV.BFAI_PFX != null ? +ENV.BFAI_PFX : 1;   // 升级后的局面沿用未升级局面的破釜组合（1 开 0 关）
  const PFK = ENV.BFAI_PFK != null ? +ENV.BFAI_PFK : 1;   // 破釜组合枚举前先筛掉只碰到一个兵的（1 开 0 关）
  const PFG = ENV.BFAI_PFG != null ? +ENV.BFAI_PFG : 0;   // 提防破釜沉舟：每一层只细算排在前几位的走法（0 = 全都细算）
  const UPK = ENV.BFAI_UPK != null ? +ENV.BFAI_UPK : 4;   // “先升级再走”的走法：第 2 层起每种升法只留几步接着算（0 = 全算）
  // 背水一战（CFG.beishui.on，默认开）：开着就返回它的配置。BSMIN：楚方用背水要比最好的普通走法多赚几分（破釜沉舟是 5；背水是翻盘 / 救急用的，门槛低）
  const bsOn = () => (CFG.beishui && CFG.beishui.on ? CFG.beishui : null);
  const BSMIN = ENV.BFAI_BSMIN != null ? +ENV.BFAI_BSMIN : 1;
  const BSV = ENV.BFAI_BSV != null ? +ENV.BFAI_BSV : 3;   // 背水一战还没用时在估值里值几分（和破釜沉舟一样先记 3）
  const PFC = +(ENV.BFAI_PFC || 0), PFA = +(ENV.BFAI_PFA || 0), PFD = +(ENV.BFAI_PFD || 0);
  const HPF = [0, 1, 1.5, 1.9, 2.2], HPF_DEF = [0, 1, 1.15, 1.28, 1.36], HPF_ADV = [0, 1, 1.55, 1.75, 1.85];
  // 两点血以上的进攻子逼到了对方家门口：过了河，或者是占着九宫那三条竖线的车（它来贴脸将军，一级的士、帅砍不死它）
  //   （炮不算：它得隔着子才打得到；马、兵要真的贴到九宫边上才算）
  const heavyAt = (p, f, r) => { if (p.hp < 2) return false; const adv = p.s === 'r' ? r : 9 - r; return p.t === 'r' ? adv >= 5 || (f >= 3 && f <= 5) : (p.t === 'n' || p.t === 'p') && adv >= 6 && f >= 2 && f <= 6; };
  function baseVal(p, heavy) {
    if (p.t === 'a' && !p.j && heavy) return VAL.a * (HPF_ADV[Math.min(4, Math.max(1, p.hp))] + (p.lv >= 2 && p.hp < 2 ? 0.2 : 0)) + (p.lv >= 3 ? 0.4 : 0) + (p.lv >= 4 ? 0.9 : 0) + 0.14 * Math.min(6, p.xp || 0);
    const def = (p.t === 'a' || p.t === 'e') && !p.j;
    let v = VAL[p.t] * ((def ? HPF_DEF : HPF)[Math.min(4, Math.max(1, p.hp))] + (def ? 0.03 : 0.06) * (p.lv - 1));
    if (p.lv >= 3) v += def ? 0.4 : 0.9; if (p.lv >= 4) v += 0.9;   // 有技能、成名将
    return v + 0.14 * Math.min(6, p.xp || 0);                // 攒着的甲片
  }
  // 局面分（站在 me 这一方看）：子力 + 位置（出子、过河、对着对方主帅的压力）+ 军功 + 兵法 + 决战
  //   P（可选，只给 scoreParts 用）：顺手把每一项记进分项里；v 的算法、加法顺序都不变，所以带不带 P 算出来的分一模一样
  function score(S, me, P) {
    const b = S.board, fin = !!S.final;
    let kr = null, kb = null;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k') { if (p.s === 'r') kr = [f, r]; else kb = [f, r]; } }
    let v = 0, attR = 0, attB = 0;                          // attR / attB：压到对方主帅跟前的汉 / 楚进攻子
    let hvR = false, hvB = false;                           // 汉 / 楚有没有两点血以上的进攻子已经逼到对方家门口
    // 守方一下最多能砍掉几点血（帅将、士里攻击最高的）：贴上来的进攻子血比这多，就砍不死它——它可以赖在主帅身边一直将军
    let dR = 1, dB = 1;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = b[r][f]; if (!p) continue;
      if (heavyAt(p, f, r)) { if (p.s === 'r') hvR = true; else hvB = true; }
      if (p.t === 'k' || p.t === 'a') { const k = A.atk(p); if (p.s === 'r') { if (k > dR) dR = k; } else if (k > dB) dB = k; }
    }
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = b[r][f]; if (!p) continue;
      const s = p.s, adv = s === 'r' ? r : 9 - r, ek = s === 'r' ? kb : kr;
      let x, xb = 0, xp = 0;
      if (p.t === 'k') {
        if (fin) { const inside = f >= 3 && f <= 5 && adv >= 7; x = 6 + p.hp * 5 + adv * 0.35 + (inside ? 2.5 : 0) - Math.abs(f - 4) * 0.15; }
        else x = -0.22 * adv - (f !== 4 ? 0.12 : 0);          // 平时主帅老实待在原位
      } else {
        x = baseVal(p, s === 'r' ? hvB : hvR);
        if (P) xb = x;
        const dk = ek ? Math.abs(f - ek[0]) + Math.abs(r - ek[1]) : 9;
        switch (p.t) {
          case 'r': x += (adv > 0 || (f !== 0 && f !== 8) ? 0.3 : 0) + 0.03 * Math.min(adv, 6) + (ek && (f === ek[0] || r === ek[1]) ? 0.35 : 0) + 0.04 * Math.max(0, 8 - dk); break;
          case 'c': x += (ek && f === ek[0] ? 0.4 : 0) + (f === 4 ? 0.12 : 0) + (adv >= 1 && adv <= 4 ? 0.1 : 0) + 0.02 * Math.max(0, 8 - dk); break;
          case 'n': x += (adv >= 1 ? 0.3 : 0) + 0.04 * Math.min(adv, 6) + 0.06 * Math.max(0, 7 - dk) - (f === 0 || f === 8 ? 0.15 : 0); break;
          case 'p': x += (adv >= 5 ? 0.55 + (adv - 5) * 0.12 + 0.05 * Math.max(0, 5 - dk) : adv === 4 ? 0.12 : 0) + (f === 4 ? 0.08 : 0); break;
          default: if (fin) x += adv * 0.12 + 0.05 * Math.max(0, 8 - dk);   // 决战里士象也要压上去
        }
        if (p.jm && p.jm > S.cnt[other(s)]) x += 0.25;
        if (dk <= 4 && (p.t === 'r' || p.t === 'c' || p.t === 'n' || (p.t === 'p' && adv >= 5))) { if (s === 'r') attR++; else attB++; }
        if (P) xp = x;
        // 砍不死的进攻子贴到对方主帅身边：这是这个游戏里最主要的杀法（升了级的车马兵贴脸将军，一级的士、帅拿它没办法）
        if (!fin && ek && dk <= 4 && p.hp > (s === 'r' ? dB : dR)) {
          if (p.t === 'r') x += dk <= 1 ? KD[0] : dk === 2 ? KD[1] : (f === ek[0] || r === ek[1]) ? KD[2] : 0;
          else if (p.t === 'n') x += dk <= 3 ? KD[3] : 0;
          else if (p.t === 'p' && adv >= 5) x += dk <= 1 ? KD[4] : dk === 2 ? KD[5] : 0;
        }
      }
      v += s === me ? x : -x;
      if (P) { const g = s === me ? 1 : -1; if (p.t === 'k') P['帅'] += g * x; else { P['子力'] += g * xb; P['位置'] += g * (xp - xb); P['贴脸'] += g * (x - xp); } }
    }
    const mt = 0.3 * (S.merit[me] - S.merit[other(me)]);   // 军功能换成血量和等级
    v += mt; if (P) P['军功'] += mt;
    // 还没用的主帅兵法留着有价值（免得为了一个兵就把「召回良将」用掉）
    //   召回良将是汉军对付“被换掉一个大子”的保险，破釜沉舟是楚军的一次连击：都算一笔不小的本钱
    const art = s => (S.used.art[s] ? 0 : s === 'r' ? 4 : bsOn() ? BSV : 3);
    const at_ = art(me) - art(other(me));
    v += at_; if (P) P['兵法'] += at_;
    const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
    // 终极兵法生效中：值多少看有多少进攻子已经压在对方主帅跟前（没人跟上，困住对方也白搭）
    if (sm) { const u = (me === 'r' ? 1 : -1) * sm * (1.5 + 0.6 * Math.min(4, attR)); v += u; if (P) P['终极兵法'] += u; }
    if (hm) { const u = (me === 'b' ? 1 : -1) * hm * (0.35 + 0.55 * Math.min(4, attB)); v += u; if (P) P['终极兵法'] += u; }
    const pf = Math.max(0, (S.fx.pf || 0) - S.cnt.b);
    if (pf && (PFC || PFA)) { const u = (me === 'r' ? 1 : -1) * Math.min(1, pf / CFG.generalArts.pofu.skillLockRounds) * (PFC + PFA * Math.min(4, attR)); v += u; if (P) P['兵法'] += u; }
    if (fin && S.occ) { const u = 7 * ((S.occ[me] || 0) - (S.occ[other(me)] || 0)); v += u; if (P) P['决战'] += u; }
    return v;
  }
  // 估值拆分（给复盘工具用，C62 B2）：子力 / 位置 / 贴脸 / 帅 / 军功 / 兵法 / 终极兵法 / 决战，和 score 是同一段代码算出来的；
  //   各项相加和 合计（= score）只差浮点舍入（< 1e-9）
  function scoreParts(S, me) {
    const P = { '子力': 0, '位置': 0, '贴脸': 0, '帅': 0, '军功': 0, '兵法': 0, '终极兵法': 0, '决战': 0 };
    P['合计'] = score(S, me, P);
    return P;
  }
  // 这一步是不是直接分出了胜负（斩帅、夺营）
  function decided(S, ev) {
    if (!S.final) return null;
    for (const e of ev) if (e.e === 'kill' && e.t === 'k') return other(e.s);
    const N = CFG.finalOccupyRounds;
    if (S.occ) { if (S.occ.r >= N) return 'r'; if (S.occ.b >= N) return 'b'; }
    return null;
  }
  // 走子方已经无路可走（将死或困毙；引擎里“只剩打不死的攻击”也算困毙）。只在子很少的残局里细查
  function stuck(S) {
    const kids = A.expand(S);
    if (!kids.length) return true;
    if (kids.length === 1 && kids[0].a.k === 'pass') return false;
    if (A.inCheck(S, S.turn)) return false;
    for (const k of kids) {
      if (k.a.k !== 'mv') continue;
      const q = S.board[k.a.to[1]][k.a.to[0]], q2 = k.S.board[k.a.to[1]][k.a.to[0]];
      if (!q || !q2 || q2.s === S.turn) return false;
    }
    return !kids.some(k => k.a.k === 'pass');
  }
  const fewPieces = S => { let n = 0; for (const row of S.board) for (const p of row) if (p && p.s === S.turn) n++; return n <= 4; };

  // ---------- 搜索 ----------
  let nodes = 0, deadline = Infinity, qMax = 3, lmrOn = false;
  let nodeCap = Infinity;   // 测试用的“按搜索量收手”：搜过这么多节点就停（LEVELS.<档>.nodes），不看时间，结果可复现
  const TIMEOUT = { timeout: true };
  const hist = new Map();                     // 历史启发：哪些安静着法以前造成过剪枝
  const hk = a => (a.k === 'mv' ? a.from[0] + a.from[1] * 9 + (a.to[0] + a.to[1] * 9) * 90 : -1);
  function order(list, killer) {
    for (const it of list) {
      let w = 0;
      if (it.q) { const lethal = it.p && it.q.hp <= A.atk(it.p); w = 1000 + 10 * baseVal(it.q) * (lethal || it.sk ? 1 : 0.45) - (it.p ? VAL[it.p.t] : 0) + (it.q.t === 'k' ? 500 : 0); }
      else if (it.art) w = 600 + VAL[it.art] * 10;
      else if (it.ult) w = 500;
      else if (it.sk) w = 200;
      else { const k = hk(it.a); w = (killer && k === killer ? 400 : 0) + (hist.get(k) || 0); }
      it.w = w;
    }
    list.sort((x, y) => y.w - x.w);
    return list;
  }
  // 吃子静态搜索：只接着算“打到敌子”的着法，直到局面安静下来
  function qs(S, alpha, beta, ply, qd) {
    if (++nodes > nodeCap || ((nodes & 63) === 0 && now() > deadline)) throw TIMEOUT;
    const side = S.turn;
    const stand = score(S, side);
    if (qd >= qMax) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const caps = order(A.gen(S, true));
    let best = stand, n = 0;
    for (const it of caps) {
      if (n >= 6) break;
      const r = BF.attempt(S, it.a); if (!r || r.free) continue;
      n++;
      const w = decided(r.S, r.ev);
      const v = w ? (w === side ? WIN - ply : -WIN + ply) : -qs(r.S, -beta, -alpha, ply + 1, qd + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  const killers = [];
  let kdMe = null;   // 危险延伸只管“这一步是谁在想”的那一方（见 kdDanger）
  let upPly = -1;   // 在第几层考虑“对方先升级再走”（-1 = 不考虑）
  let upAll = false;   // 裁判开关 LEVELS.<档>.upAll（只给复盘工具用，默认关）：对方“先升级再走”所有升法都看，第 1、第 3 层都看
  const upAt = (S, ply) => (ply === upPly || (upAll && ply === 3 && upPly >= 0)) && !S.upgraded;
  let pfPly = -1;   // 在第几层考虑“对方（楚）用破釜沉舟连走两步”（-1 = 不考虑）
  const pfCache = new Map();   // 每个局面的破釜沉舟组合只算一次（逐层加深时重复用）
  const upCache = new Map();   // “对方先升级再走”的那几个局面，同样每个局面只生成一次
  const pfAlias = new Map();   // 只比另一个局面多升了一级子的局面 → 那个局面（破釜组合沿用它的）
  const pfUp = new Map();      // 楚方先升了一级再应的局面 → 升的那枚子的 id
  const keyA = a => JSON.stringify(a);
  // “走子方先给某枚子升一级再走”的那几个局面（静态收益最高的 3 个）。每个局面只生成一次：
  //   逐层加深时每一层都用同一批对象，破釜组合的缓存（按对象记）才接得上
  function upsOf(S, side) {
    let ups = upCache.get(S);
    if (ups) return ups;
    const base = score(S, side); ups = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k') continue;
      const T = A.upgradeState(S, [f, r]); if (T) ups.push({ S: T, g: score(T, side) - base, id: p.id });
    }
    ups.sort((x, y) => y.g - x.g); if (!upAll) ups = ups.slice(0, 3);
    if (side === 'b' && PFX) for (const u of ups) { pfAlias.set(u.S, S); pfUp.set(u.S, u.id); }
    upCache.set(S, ups);
    return ups;
  }
  // 某个局面（轮到楚）最狠的几种破釜组合（静态净赚 ≥ 3 或直接分出胜负的，最多 4 种），每个局面只算一次。
  //   完整枚举很贵（每次两三百个组合都要真走一遍）。“楚方先给某枚子升一级再应”的局面不重新枚举：
  //   把没升级时留下的组合拿来重走一遍，再补算“有刚升级的那枚子出手”的组合（两血的车连打两下……），量很小，只留最狠的两种
  //   （汉方“先升级再走”的局面照样完整枚举：汉方的子多了一点血，楚方最狠的打法会变——比如改成对着它连打两下）
  // 枚举之前先筛，只留“走一步办不到、连走两步才办得到”的组合，别的不用真走一遍：
  //   · 两步都打到子（连打两下、连吃两子）；
  //   · 打完同一枚子接着走（吃完就撤 / 打完再换地方）；
  //   · 第一步不打子、第二步打到的是原来打不到的子（先挪开挡路的、先架好炮架）；
  //   · 有一步落在汉帅两格之内（凑杀势、贴脸将军）。
  //   只碰到一个兵、又不在帅跟前的不算（净赚到不了 3 分）。“白走一步再照常吃一个子”这种也不留：那个吃子本来就在楚方的普通应着里。
  function pfKeep(S) {
    if (!PFK || S.final) return null;
    let kf = -9, kr = -9;
    const direct = new Set();   // 楚方现在一步就能打到的（from → to）
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p) continue;
      if (p.t === 'k' && p.s === 'r') { kf = f; kr = r; }
      if (p.s === 'b') for (const m of A.moveTargets(S, f, r)) if (S.board[m.to[1]][m.to[0]]) direct.add(f + r * 9 + (m.to[0] + m.to[1] * 9) * 90);
    }
    const near = m => Math.abs(m.to[0] - kf) + Math.abs(m.to[1] - kr) <= 2;
    const same = (m1, m2) => (m2.from[0] === m1.to[0] && m2.from[1] === m1.to[1]) || (m2.from[0] === m1.from[0] && m2.from[1] === m1.from[1]);
    return (m1, t1, m2, t2) => {
      if (near(m1) || near(m2)) return true;
      if (!t1 && !t2) return false;
      if (t1 && t2) return true;
      if (t1) return t1.t !== 'p' && same(m1, m2);
      return t2.t !== 'p' && !direct.has(m2.from[0] + m2.from[1] * 9 + (m2.to[0] + m2.to[1] * 9) * 90);
    };
  }
  const posKey = S => S.board.map(row => row.map(p => (p ? p.id + ':' + p.hp + ':' + p.lv : '')).join(',')).join('/');
  function pfOf(S) {
    let pf = pfCache.get(S);
    if (pf) return pf;
    const base = score(S, 'b'), src = PFX ? pfAlias.get(S) : null;
    const def = !!bsOn() && A.inCheck(S, 'b');   // 背水一战：楚方正被将军——两步不打子的解将办法也是它的应着，不筛、不设门槛
    if (def) {
      pf = A.pofuPairs(S); for (const k of pf) k.q = score(k.S, 'b') - base;
      const seen = new Set();
      pf = pf.sort((x, y) => y.q - x.q).filter(k => { const key = posKey(k.S); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 4);
      pfCache.set(S, pf);
      return pf;
    }
    if (src) {
      pf = [];
      for (const k of pfOf(src)) { const r = BF.attempt(S, k.a); if (r) pf.push({ a: k.a, S: r.S, ev: r.ev, q: score(r.S, 'b') - base }); }
      const upId = pfUp.get(S);
      if (upId != null) for (const k of A.pofuPairs(S, upId, pfKeep(S))) { if (!pf.some(x => keyA(x.a) === keyA(k.a))) { k.q = score(k.S, 'b') - base; pf.push(k); } }
    } else { pf = A.pofuPairs(S, null, pfKeep(S)); for (const k of pf) k.q = score(k.S, 'b') - base; }
    pf = pf.filter(k => k.q >= 3 || decided(k.S, k.ev)).sort((x, y) => y.q - x.q).slice(0, src ? 2 : 4);
    pfCache.set(S, pf);
    return pf;
  }
  // 危险延伸（2026-10-05，用户报的笨棋“实3 马挡帅前喂三血卒”）：轮到 side 走、它的帅被堵死（一步合法的帅步都没有），
  //   对方有砍不死的进攻子（血 > side 的帅、士里最高攻击）离帅不超过 2 步、而且那枚子下一步就能走到 / 吃到帅身边正将着帅。
  //   这种局面里贴脸杀常常在第 5～6 层，三层的校尉看不到（实3：挡马和炮回中路三层同分，随机挑中挡马）；ab() 里这时多算一层。
  //   只管电脑自己的帅（kdMe），去逼对方的帅时不延伸——两边都管、多算两层的版本网页里偶尔一步要 4～5 秒
  function kdDanger(S, side) {
    if (S.final) return false;
    let k = null, dmax = 1; const near = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (!p) continue; if (p.s === side && (p.t === 'k' || p.t === 'a')) { if (p.t === 'k') k = [f, r]; dmax = Math.max(dmax, A.atk(p)); } }
    if (!k) return false;
    for (let r = Math.max(0, k[1] - 2); r <= Math.min(9, k[1] + 2); r++) for (let f = Math.max(0, k[0] - 2); f <= Math.min(8, k[0] + 2); f++) { const p = S.board[r][f]; if (p && p.s !== side && p.t !== 'k' && p.hp > dmax && Math.abs(f - k[0]) + Math.abs(r - k[1]) <= 2) near.push(p); }
    if (!near.length) return false;
    for (const m of A.moveTargets(S, k[0], k[1])) { const x = BF.attempt(S, { k: 'mv', from: m.from, to: m.to }); if (x && !x.free) return false; }   // 帅还有路走
    // 对方下一步就能贴脸将军（砍不死的子走到 / 吃到帅身边，走完正将着帅）才算危险：换手看一眼（空着一手），只试这几枚子
    const T = BF.cloneState(S); T.turn = side === 'r' ? 'b' : 'r'; T.upgraded = false; T.freeUsed = false; T.jmLock = null;
    for (let r = Math.max(0, k[1] - 2); r <= Math.min(9, k[1] + 2); r++) for (let f = Math.max(0, k[0] - 2); f <= Math.min(8, k[0] + 2); f++) {
      const p = S.board[r][f]; if (!p || p.s === side || p.t === 'k' || p.hp <= dmax || Math.abs(f - k[0]) + Math.abs(r - k[1]) > 2) continue;
      for (const m of A.moveTargets(T, f, r)) {
        if (Math.abs(m.to[0] - k[0]) + Math.abs(m.to[1] - k[1]) !== 1) continue;
        const x = BF.attempt(T, { k: 'mv', from: m.from, to: m.to }); if (x && !x.free && A.inCheck(x.S, side)) return true;
      }
    }
    return false;
  }
  // 局面指纹（两个 32 位散列拼成 53 位的数）
  const TTB = new Map();
  function fp(S) {
    let h1 = 2166136261, h2 = 5381;
    const mix = x => { h1 = Math.imul(h1 ^ x, 16777619); h2 = (Math.imul(h2, 33) ^ x) | 0; };
    const mixS = t => { for (let i = 0; i < t.length; i++) mix(t.charCodeAt(i)); };
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p) continue;
      mix(1000 + r * 9 + f);
      for (const k in p) { mixS(k); const v = p[k]; if (typeof v === 'number') { mix(v | 0); mix(Math.round(v * 4096) | 0); } else if (typeof v === 'string') { mix(7); mixS(v); } else if (typeof v === 'boolean') mix(v ? 3 : 5); else if (v == null) mix(9); else mixS(JSON.stringify(v)); }
    }
    mixS(JSON.stringify([S.turn, S.cnt, S.merit, S.used, S.fx, S.crossed, S.dead, S.upgraded, S.ckHist, S.freeUsed, S.jmLock, S.final, S.occ, S.named]));
    return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151);
  }
  const toTT = (v, ply) => (v > WIN / 2 ? v + ply : v < -WIN / 2 ? v - ply : v), fromTT = (v, ply) => (v > WIN / 2 ? v - ply : v < -WIN / 2 ? v + ply : v);
  const mkey = a => (a.k === 'mv' ? hk(a) : JSON.stringify(a));
  function ab(S, depth, alpha, beta, ply, ext = 0) {
    if (++nodes > nodeCap || ((nodes & 63) === 0 && now() > deadline)) throw TIMEOUT;
    const side = S.turn, inChk = A.inCheck(S, side);
    // 将军延伸：正被将军的一方应这一步不算层数（一条线上最多延伸 CX 次）——“贴脸将军、逃、再贴”这种连杀，三层的校尉也能算到底
    const extd = ply >= 1 && ((inChk && ext < CX) || (!inChk && ext < CX + 1 && side === kdMe && kdDanger(S, side))) ? 1 : 0;   // 危险延伸：自己的帅被堵死、对方砍不死的子下一步就能贴脸将军时也延伸一层（见 kdDanger）
    depth += extd; ext += extd;
    if (depth <= 0) {
      if (inChk && ply < 8) depth = 1;          // 被将军时不能“站着不动”估值：再往下应一步
      else return qs(S, alpha, beta, ply, 0);
    }
    if (fewPieces(S) && stuck(S)) return -WIN + ply;
    // 查表——同一局面、同样剩余层数、同样的延伸次数和“这层要不要考虑对方升级 / 破釜”
    const tkey = fp(S) + ':' + depth + ':' + ext + ':' + (upAt(S, ply) ? 1 : 0) + (ply === pfPly ? 2 : 0), tte = TTB.get(tkey), a0 = alpha;
    if (tte) { const v = fromTT(tte.v, ply); if (tte.f === 0 || (tte.f === 1 && v >= beta) || (tte.f === 2 && v <= alpha)) return v; }
    let best = -INF, legal = 0, bm = null;
    // 对方应这一步时，也可能先花军功给某枚子升一级再走（多一点血：我方本来能吃掉的子就吃不掉了，打上去还会被弹回）
    if (upAt(S, ply)) {
      const ups = upsOf(S, side);
      for (const u of ups) {
        const v = ab(u.S, depth - extd, alpha, beta, ply, ext - extd);
        if (v > best) { best = v; bm = null; }
        if (v > alpha) alpha = v;
        if (alpha >= beta) { if (TTB.size < 300000) TTB.set(tkey, { v: toTT(best, ply), f: 1, m: null }); return best; }
      }
    }
    const list = order(A.gen(S, false), killers[ply]); let mi = 0;
    if (tte && tte.m != null) { const i = list.findIndex(it => mkey(it.a) === tte.m); if (i > 0) { const x = list[i]; list.splice(i, 1); list.unshift(x); } }   // 上次最好的一步先算
    for (const it of list) {
      const r = BF.attempt(S, it.a); if (!r || r.free) continue;
      legal++; mi++;
      const w = decided(r.S, r.ev);
      let v;   // 排在后面的安静着法先少算一层试一下
      if (w) v = w === side ? WIN - ply : -WIN + ply;
      else if (lmrOn && ply >= 1 && depth >= 2 && mi > 2 && !inChk && it.a.k === 'mv' && !it.q && !A.inCheck(r.S, r.S.turn)) { v = -ab(r.S, depth - 2, -alpha - 0.01, -alpha, ply + 1, ext); if (v > alpha) v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext); }
      else v = -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);
      if (v > best) { best = v; bm = it.a; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!it.q && it.a.k === 'mv') { const k = hk(it.a); killers[ply] = k; hist.set(k, Math.min(300, (hist.get(k) || 0) + depth * depth)); }
        break;
      }
    }
    // 楚军还留着破釜沉舟：把“连走两步”里最狠的几种也算作它的应对（先吃掉挡路的子再吃车、吃完就撤……）
    let pfHit = false;
    if (ply === pfPly && side === 'b' && (legal || (inChk && bsOn())) && alpha < beta && !S.used.art.b && (!A.artReady || A.artReady(S))) {
      const fresh = !pfCache.has(S), pf = pfOf(S);
      if (fresh && now() > deadline) throw TIMEOUT;   // 枚举破釜组合不计节点、可能很慢：算完看一眼表
      pfHit = pf.length > 0;
      for (const k of pf) {
        const w = decided(k.S, k.ev);
        const v = w ? (w === side ? WIN - ply : -WIN + ply) : -ab(k.S, Math.max(0, depth - 1), -beta, -alpha, ply + 1, ext);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
    }
    if (!legal) {
      if (pfHit) return best;                   // 普通着法解不了将，但背水一战的两步解得了：不是将死
      // 升了级才解得了将，也不算将死（Ham 10-09 规则）：被将军、本回合还没升过级，把每一种升法都试一遍（上面的升级名额只看前三种）
      if (inChk && !S.upgraded) {
        let bu = -INF;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
          const p = S.board[r][f]; if (!p || p.s !== side || p.t === 'k') continue;
          const T = A.upgradeState(S, [f, r]); if (!T) continue;
          const v = ab(T, depth - extd, alpha, beta, ply, ext - extd); if (v > bu) bu = v;
          if (bu >= beta) return bu;
        }
        if (bu > -INF) return bu;
      }
      const r = BF.attempt(S, { k: 'pass' });
      if (!r) return -WIN + ply;                // 将死 / 困毙
      return -ab(r.S, depth - 1, -beta, -alpha, ply + 1, ext);
    }
    if (TTB.size < 300000) TTB.set(tkey, { v: toTT(best, ply), f: best <= a0 ? 2 : best >= beta ? 1 : 0, m: bm ? mkey(bm) : null });   // 记下来
    return best;
  }

  // 新兵只看一步（但会把吃子算清）；校尉看两步；霸王逐层加深，能看多深看多深（至少三步），到点收手
  const LEVELS = {
    easy: { depth: 1, q: 2, noise: 1.3, top: 3, up: 0.5, budget: 500 },
    mid: { depth: 3, q: 3, noise: 0.3, top: 1, up: 1, budget: 2500 },
    hard: { depth: 7, q: 4, noise: 0.05, top: 1, up: 1, budget: 3000, minNodes: 20000 },
    ana: { depth: 3, q: 3, noise: 0, top: 1, up: 1, budget: 1200 },   // 对局分析用（TD，Ham 10-09）：不加噪声，每个局面限时 1.2 秒
  };

  // 压在对方主帅跟前的进攻子数（和估值里的 attR / attB 同一个算法）
  function pressure(S, side) {
    let k = null, n = 0;
    for (let r = 0; r < 10 && !k; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.t === 'k' && p.s !== side) { k = [f, r]; break; } }
    if (!k) return 0;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== side) continue;
      const adv = side === 'r' ? r : 9 - r;
      if (Math.abs(f - k[0]) + Math.abs(r - k[1]) <= 4 && (p.t === 'r' || p.t === 'c' || p.t === 'n' || (p.t === 'p' && adv >= 5))) n++;
    }
    return n;
  }
  // (f, r) 上的子现在是不是正被对方捉着、一下就能打死
  function threatened(S, at_) {
    const p = S.board[at_[1]][at_[0]]; if (!p) return false;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const e = S.board[r][f]; if (!e || e.s === p.s) continue;
      if (A.atk(e) < p.hp || !A.moveTargets(S, f, r).some(m => m.to[0] === at_[0] && m.to[1] === at_[1])) continue;
      // 这一口对方得真能合法地吃下去（不能是吃完自己被将军的假威胁）
      const V = Object.assign({}, S, { turn: e.s, freeUsed: false, upgraded: false, jmLock: null });
      if (BF.attempt(V, { k: 'mv', from: [f, r], to: [at_[0], at_[1]] })) return true;
    }
    return false;
  }
  // 这一回合值得考虑的升级（最多三种）。升不升、升哪个，不在这里定：
  //   每一种升法都和“不升”一起进根节点的搜索，按同样的深度比——
  //   正被捉的子升了就打不死、来犯的反而被弹回；对方二级的车要杀进九宫贴脸将军，被它盯着的士得先升二级（攻击 2 才砍得死它）。
  //   这些都要往下算好几步才看得出来，浅浅比一下会漏掉。
  //   rec（可选，思考记录用）：被筛掉的升级和原因记进去，不影响结果
  function upgradeCands(S, L, rec) {
    if (S.upgraded) return [];
    const me = S.turn, U = CFG.ultimates, fin = !!S.final;
    const base = score(S, me), chk = A.inCheck(S, me), cand = [];
    // 对方有没有两点血以上的进攻子（它来将军时，一级的士、帅砍不死它）
    let heavy = false; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s !== me && heavyAt(p, f, r)) heavy = true; }
    // 军功前期很紧，只能靠杀子挣：先紧着车升。车还能升、军功再攒一点就够时，别的子先不升（保命的除外）
    let rookNeed = 0;
    for (const row of S.board) for (const p of row) if (p && p.s === me && p.t === 'r' && p.lv < BF.maxLvOf('r')) { const c = A.upCost(p); if (c > S.merit[me] && (!rookNeed || c < rookNeed)) rookNeed = c; }
    const saving = rookNeed && rookNeed - S.merit[me] <= 3;
    // 攒终极兵法：已经有两枚以上进攻子压到对方主帅跟前、军功也快够了，就先攒着
    const ultLeft = S.used.ult[me] < U[me === 'r' ? 'simian' : 'hongmen'].usesPerGame;
    const hoard = L.depth >= 3 && ultLeft && S.merit[me] >= U.cost - 6 && S.merit[me] < U.cost && pressure(S, me) >= 2;
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== me || p.t === 'k') continue;
      const T = A.upgradeState(S, [f, r]); if (!T) continue;
      // 保命的升级（不受“给车攒军功”限制）：只算大子和守子正被捉、或者正被将军（相 / 象除外：它砍不了人；士升二级攻击 2，可能正好砍死将军的子）。
      //   兵被捉不算——兵老是被捉着，回回都救的话军功全填给兵了，车永远升不上去（对打里就是这么输的）
      const thr = p.t !== 'p' && threatened(S, [f, r]), must = thr || (chk && p.t !== 'e' && p.t !== 'p');
      const defender = (p.t === 'a' || p.t === 'e') && !fin;
      // 守子：被捉、被将军才升；对方有两血进攻子逼近时，士可以先升到二级（攻击 2 才砍得死它），再往上只加血、不急
      // 守子升到三级、四级会解锁技能（飞越、护驾、铁甲禁卫、齐射 / 践踏）：值不值看搜索，这里只留一个名额给它（见下）
      const unlock = defender && !must && p.lv >= 2 && !(saving || hoard);
      if (defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2)) { if (rec) rec.push({ at: [f, r], t: p.t, lv: p.lv, why: '守子没被捉、没被将军' }); continue; }
      if ((saving || hoard) && p.t !== 'r' && !must) { if (rec) rec.push({ at: [f, r], t: p.t, lv: p.lv, why: saving ? '攒军功先升车' : '攒军功放终极兵法' }); continue; }
      cand.push({ at: [f, r], S: T, gain: score(T, me) - base, must, unlock });
    }
    cand.sort((x, y) => (y.must ? 1 : 0) - (x.must ? 1 : 0) || y.gain - x.gain);
    // 前三个照旧；“守子升级解锁技能”的静态分低、排不进前三，另给一个名额（最多一个）
    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);
    if (ex) top.push(ex);
    if (rec) for (const c of cand) if (!top.includes(c)) { const p = S.board[c.at[1]][c.at[0]]; rec.push({ at: c.at, t: p.t, lv: p.lv, gain: +c.gain.toFixed(2), why: '名额满了（只留前三种）' }); }
    return top;
  }
  // 裁判开关 rootUpAll：根上自己的每一种升法都进搜索，不筛
  function upgradeAll(S) {
    if (S.upgraded) return [];
    const me = S.turn, base = score(S, me), out = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = S.board[r][f]; if (!p || p.s !== me || p.t === 'k') continue;
      const T = A.upgradeState(S, [f, r]); if (T) out.push({ at: [f, r], S: T, gain: score(T, me) - base, must: false, unlock: false });
    }
    return out.sort((x, y) => y.gain - x.gain);
  }
  // ---------- 思考记录（C62：BFAI.trace = true 时才记，默认关；只读搜索留下的表，不改任何会影响走法的东西，也不用随机数） ----------
  // 表里找这个局面（剩余 d 层左右）记下的最好一步
  function ttFind(S, d) {
    const f = fp(S); let best = null;
    for (let dd = d + 2; dd >= Math.max(1, d - 1); dd--) for (let ex = 0; ex <= 3; ex++) for (const fl of ['00', '10', '02', '12']) {
      const e = TTB.get(f + ':' + dd + ':' + ex + ':' + fl);
      if (e && e.m != null && (!best || dd > best.dd || (dd === best.dd && e.f === 0 && best.e.f !== 0))) best = { e, dd };
    }
    return best && best.e;
  }
  // 预想线：从 S 起顺着表里的最好一步往下走（最好的一步可能是“先升级再走”）；表里没有了就按眼前的局面分贪心补到 n 步（tail 标出来）
  function pvOf(S0, dr, n = 8) {
    const line = []; let S = S0, d = dr;
    while (line.length < n && S) {
      let e = d > 0 ? ttFind(S, d) : null, U = null;
      if (d > 0 && (!e || e.m == null) && !S.upgraded) {
        let bu = null;
        for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
          const p = S.board[r][f]; if (!p || p.s !== S.turn || p.t === 'k') continue;
          const T = A.upgradeState(S, [f, r]); if (!T) continue;
          const e2 = ttFind(T, d); if (e2 && e2.m != null && (!bu || e2.v > bu.e.v)) bu = { T, e: e2, at: [f, r] };
        }
        if (bu) { U = bu; e = bu.e; }
      }
      const X = U ? U.T : S;
      let a = null, R = null, tail = false;
      if (e && e.m != null) { const it = A.gen(X, false).find(x => mkey(x.a) === e.m); if (it) { R = BF.attempt(X, it.a); if (R) a = it.a; } }
      if (!a) {   // 表里没有：按走完的局面分挑一步（只是估计）
        let bk = null; const side = S.turn;
        for (const k of A.expand(S)) { if (k.a.k === 'pass') continue; const v = score(k.S, side); if (!bk || v > bk.v) bk = { k, v }; }
        if (!bk) break; a = bk.k.a; R = { S: bk.k.S }; U = null; tail = true;
      }
      line.push(Object.assign(U ? { up: U.at } : {}, a, tail ? { est: 1 } : {}));
      if (BF.evaluate(R.S).result) break;
      S = R.S; d--;
    }
    return line;
  }
  const actOf = k => JSON.parse(JSON.stringify(k.up ? { up: k.up.at, ...k.a } : k.a));
  // 根节点：返回一串要依次执行的行动（升级 → 拒马 → 主行动）
  async function think(S0, level, tick) {
    const L0 = LEVELS[level] || LEVELS.mid, t0 = now(), me = S0.turn, seq = [];
    let L = tick ? { ...L0, budget: Math.min(L0.budget, 1400) } : L0;   // 在主线程里算（开不了 Worker）时少想一会儿，免得卡画面
    const TR = BFAI.trace ? { v: 1, level, side: me, round: { ...S0.cnt }, iter: [] } : null;   // 思考记录（C62 A）
    upAll = !!L.upAll;
    if (L.fixedDepth) L = { ...L, depth: L.fixedDepth };   // 裁判开关：固定层数，不看时间也不看节点
    let S = S0, last = now();
    const breathe = async () => { if (tick && now() - last > 12) { await tick(); last = now(); } };
    lmrOn = L.depth > 3; kdMe = S0.turn; nodes = 0; qMax = L.q; hist.clear(); killers.length = 0; upPly = -1; pfPly = -1; pfCache.clear(); upCache.clear(); TTB.clear(); pfAlias.clear(); pfUp.clear(); deadline = Infinity; nodeCap = Infinity;
    const fin0 = !!S0.final, chk0 = A.inCheck(S0, me);
    if (PFD && me === 'r' && L.depth >= 3 && S0.cnt.b < (S0.fx.pf || 0)) L = { ...L, depth: L.depth + PFD };   // 楚方技能被封的反击窗口：多算一层
    const byNodes = L.nodes > 0;   // 设了 nodes：按搜索量收手，完全不看时间（对打、考卷、漏着率用，机器快慢不影响结果）
    // 新兵：凭眼前的局面分决定升不升（一半的时候懒得升）。校尉、霸王：把几种升法都放进搜索里比
    let ups = L.rootUpAll ? upgradeAll(S) : upgradeCands(S, L, TR ? (TR.upOff = []) : null);
    if (TR) TR.ups = ups.map(c => ({ at: c.at, gain: +c.gain.toFixed(2), must: !!c.must }));
    if (L.depth < 2) {
      const c = Math.random() <= L.up ? ups.find(x => x.must || x.gain > 0.25) : null;
      if (c) { seq.push({ k: 'up', at: c.at }); S = c.S; }
      ups = [];
    }
    if (L.depth >= 3) upPly = 1;
    const pfGuard = me === 'r' && L.depth >= 2 && !S.used.art.b;   // 汉军：对方的破釜沉舟还在手里，每一步都提防它
    if (pfGuard) pfPly = 1;
    let kids = A.expand(S), pofu = [], artOff = [];
    // “先升级再走”的走法：记下它对应的“不升级走同一步”（base）、是不是升的那枚子自己出手（own）
    const keyOf = a => JSON.stringify(a), plain = new Map(kids.map(k => [keyOf(k.a), k]));
    for (const c of ups) for (const k of A.expand(c.S)) {
      k.up = c; k.base = plain.get(keyOf(k.a)) || null;
      const at = k.a.k === 'mv' ? k.a.from : k.a.k === 'sk' ? k.a.at : null;
      k.own = !!at && at[0] === c.at[0] && at[1] === c.at[1];
      kids.push(k);
    }
    // 破釜沉舟（楚）：只留“连走两步能明显赚到子”的组合（比如先挪开再吃车），交给后面的搜索去核对值不值
    //   小卒（只看一层）平时不用主帅兵法；但背水一战开着、正被将军、普通走法又解不了将时，只有背水能救，也得会用
    if (me === 'b' && (L.depth >= 2 || (bsOn() && chk0 && !kids.length))) {
      try {
        const base = score(S, me);
        pofu = A.pofuPairs(S);
        for (const c of ups) for (const k of A.pofuPairs(c.S)) { k.up = c; pofu.push(k); }     // 先升级再连走两步（两血的车连打两下）
        const BS = bsOn();
        // 背水一战是落后时翻盘 / 救急用的：候选门槛低（2 分），正被将军时不设门槛（不打子的解将组合也在里面）；落到同一局面的只留一个
        pofu = pofu.map(k => { k.gain = score(k.S, me) - base; return k; }).filter(k => k.gain >= (BS ? 2 : 4.5) || decided(k.S, k.ev) === me || (BS && chk0));
        pofu.sort((x, y) => y.gain - x.gain);
        if (BS) { const seen = new Set(); pofu = pofu.filter(k => { const key = (k.up ? k.up.at.join(',') : '') + '|' + posKey(k.S); if (seen.has(key)) return false; seen.add(key); return true; }); }
        pofu = pofu.slice(0, 8);
      } catch (e) { pofu = []; }
    }
    // 召回良将（汉）：每局只有一次，是对付“被换掉一个大子”的保险——有车在场时只肯拿来救车；
    //   车都没了、或者楚军的破釜沉舟已经用掉，才肯救炮和马；士象兵不救。实在别无出路时不受此限
    if (me === 'r') {
      const tOf = id => { const d = S.dead.r.find(x => x.id === id); return d ? d.t : ''; };
      let rook = false; for (const row of S.board) for (const p of row) if (p && p.s === 'r' && p.t === 'r') rook = true;
      const ok = k => { const t = tOf(k.a.id); return t === 'r' || ((!rook || S.used.art.b > 0) && (t === 'c' || t === 'n')); };
      const rest = kids.filter(k => !(k.a.k === 'art' && k.a.id != null) || ok(k));
      if (rest.some(k => k.a.k !== 'art')) { artOff = kids.filter(k => !rest.includes(k)); kids = rest; }   // 平时不救的召回留给下面的一步杀保险兜底
      if (TR) TR.artOff = artOff.map(k => { const t = tOf(k.a.id); return { a: k.a, t, why: 'aep'.includes(t) ? '士象兵不救' : '车还在、楚的破釜没用：只救车' }; });
    }
    if (!kids.length) {
      // 普通着法一步都没有（被将死的样子），但背水一战还能解：就用它
      if (pofu.length) { const k = pofu[0]; if (k.up) seq.push({ k: 'up', at: k.up.at }); seq.push(k.a); }
      think.last = { nodes, ms: now() - t0, v: 0, n: 0, depth: 0, top: [] };   // 没有着可走（将死 / 困毙）时也换一份，别留着上一步的
      if (TR) { TR.why = pofu.length ? 'only-art' : 'no-move'; TR.seq = JSON.parse(JSON.stringify(seq)); think.last.trace = TR; }
      return seq;
    }
    for (const k of kids) { const w = decided(k.S, k.ev); k.done = !!w; k.q = w ? (w === me ? WIN : -WIN) : score(k.S, me); k.v = k.q; }
    kids.sort((x, y) => y.q - x.q);
    let depthDone = 0, why = 'depth';
    const n0 = nodes;
    // 逐层加深：每一层都把上一层最好的着法排在最前面先算
    for (let d = 1; d <= L.depth; d++) {
      const soft = t0 + L.budget;
      if (L.fixedDepth) { deadline = Infinity; nodeCap = Infinity; }
      else if (byNodes) {
        // 前两层一定算完（保证有着可走）；再往下每一层开始前看剩下的搜索量够不够，算到上限就停
        if (d > 2 && nodes - n0 > L.nodes * 0.5) { why = 'nodes'; break; }
        nodeCap = d <= 2 ? Infinity : n0 + L.nodes;
      } else {
        // 慢的设备上按时间收手会算得太浅：没搜够 minNodes 之前不因为时间到了就停（最多拖到 1.5 倍时间）
        const thin = L.minNodes > 0 && nodes - n0 < L.minNodes;
        if (d > 3 && !thin && now() - t0 > L.budget * 0.3) { why = 'time'; break; }       // 剩下的时间不够再深一层了
        deadline = d < 3 ? Infinity : d === 3 ? t0 + L.budget * 2 : thin ? t0 + L.budget * 1.5 : soft + L.budget * 0.3;   // 第 3 层也设个兜底（两倍预算）：个别局面枚举破釜组合特别慢，慢手机上别让一步拖到十秒
      }
      let alpha = -INF, n = 0, cut = false;
      const M = L.noise * 1.6 + 0.02;                          // 比当前最好的差不到 M 的着法也算出准确分数（最后要在它们之间挑）；更差的只要个上界
      // “先升级再走”的走法太多（每种升法都是一整套着法）：第 1 层全算（只是静态搜索，便宜），
      //   第 2 层起每种升法只接着算——升的那枚子自己出手的、上一层里它自己排前 UPK 的、以及“不升”时排前 UPK 的那几步；被将军时全算
      if (UPK > 0 && d >= 2 && ups.length) {
        const topPlain = new Set(kids.filter(k => !k.up).slice(0, UPK)), seen = new Map();
        for (const k of kids) {
          if (!k.up) { k.off = false; continue; }
          const i = seen.get(k.up) || 0; seen.set(k.up, i + 1);
          k.off = !(chk0 || k.own || k.done || i < UPK || (k.base && topPlain.has(k.base)));
        }
      }
      // 提防破釜沉舟很费时间（每个局面都要把楚方的连走两步枚举一遍），所以只对上一层排在前 PFG 位的走法这样细算；
      //   其余的先不管破釜（分数只会偏高），这一层算完要是它排到了第一，再补算一遍——最后选出来的那步一定是提防过的
      if (pfGuard) { let i = 0; for (const k of kids) k.gn = PFG <= 0 || (!k.off && i++ < PFG); }
      try {
        for (const k of kids) {
          if (k.off) { k.nv = -INF; n++; continue; }
          if (pfGuard) pfPly = k.gn ? 1 : -1;
          k.nv = k.done ? k.q : -ab(k.S, d - 1, -INF, -alpha + M, 1);
          if (k.nv > alpha) alpha = k.nv;
          n++;
          await breathe();
          if (!L.fixedDepth && !byNodes && d > 3 && now() > soft && (!(L.minNodes > 0 && nodes - n0 < L.minNodes) || now() > t0 + L.budget * 1.5)) { cut = true; break; }
        }
      } catch (e) { if (e !== TIMEOUT) throw e; cut = true; }
      deadline = Infinity; nodeCap = Infinity;
      if (cut) {
        // 这一层没算完：先算的是上一层最好的那步；算完的里头要是有更好的，就改用它
        const doneK = kids.slice(0, n);
        if (doneK.length) {
          const head = kids[0], better = doneK.filter(k => !pfGuard || k.gn).sort((x, y) => y.nv - x.nv)[0];
          if (better && better !== head && better.nv > head.nv) { better.v = head.v + 0.01; better.vg = true; }
        }
        for (const k of kids) k.nv = null;
        kids.sort((x, y) => y.v - x.v);
        why = byNodes ? 'nodes' : 'time';
        if (TR) TR.iter.push({ d, best: actOf(kids[0]), v: +kids[0].v.toFixed(3), done: n, of: kids.length, nodes: nodes - n0, ms: Math.round(now() - t0), cut: true });
        break;
      }
      for (const k of kids) { k.v = k.nv; k.nv = null; k.vg = !!k.gn; }
      kids.sort((x, y) => y.v - x.v);
      if (pfGuard && d >= 2) for (let i = 0; i < 8 && !kids[0].vg && !kids[0].done; i++) {
        const b = kids[0]; pfPly = 1; b.v = -ab(b.S, d - 1, -INF, INF, 1); b.vg = true;   // 排到第一的走法还没提防过破釜：补算
        kids.sort((x, y) => y.v - x.v);
      }
      depthDone = d;
      if (TR) TR.iter.push({ d, best: actOf(kids[0]), v: +kids[0].v.toFixed(3), nodes: nodes - n0, ms: Math.round(now() - t0) });
      if (kids[0].v > WIN / 2 || kids[0].v < -WIN / 2) { why = 'mate'; break; } // 已经看到杀棋 / 必败，不用再深
    }
    const bestV = kids[0].v;
    for (const k of kids) {
      // 只在分数算准了的那几步（和最好的差不到 M）之间加一点随机；其余的分数只是上界，不能拿来比
      k.w = k.v > bestV - (L.noise * 1.6 + 0.02) * 0.95 ? k.v + (Math.random() * 2 - 1) * L.noise : k.v - 100;
    }
    if (pfGuard && kids.some(k => k.vg)) for (const k of kids) if (!k.vg && !k.done) k.w = k.v - 100;   // 没提防过破釜的走法分数偏高，不参加挑选
    // 给士、相 / 象升级的走法：要比“不升”里最好的明显强才选（差不多的时候别让随机数挑中它，白花军功）
    const plainBest = kids.reduce((m, k) => (!k.up && k.v > m ? k.v : m), -INF);
    for (const k of kids) { if (!k.up || fin0) continue; const t = S0.board[k.up.at[1]][k.up.at[0]].t; if ((t === 'a' || t === 'e') && k.v < plainBest + 0.4) k.w = k.v - 100; }
    const pool = kids.slice().sort((x, y) => y.w - x.w);
    let pick = pool[0];
    if (L.top > 1 && pool.length > 1 && Math.random() < 0.3) { const c = pool.slice(0, L.top).filter(k => k.w > -50), i = Math.floor(Math.random() * c.length); if (c.length) pick = c[i]; }   // 前几名全是输棋（一个都不剩）时就用第一名，别挑出个空的
    const pick0 = pick;
    // 破釜沉舟每局只有一次：留着杀车这样的大子——同样的深度下，比最好的普通走法多赚不到一个大子的量就先不用
    //   （对方的召回良将还在手里时，杀了车也会被救回来，搜索里算得到，自然就不急着用）
    if (pofu.length && bestV < WIN / 2) {
      const PF_MIN = bsOn() ? BSMIN : 5, need = bestV + PF_MIN, d1 = Math.max(1, depthDone) - 1;
      let bp = null;
      if (byNodes) nodeCap = nodes + Math.round(L.nodes * 0.4); else deadline = now() + Math.max(400, L.budget * 0.4);
      try {
        for (const k of pofu) {
          const w = decided(k.S, k.ev);
          k.v = w ? (w === me ? WIN : -WIN) : -ab(k.S, d1, -INF, -need + 0.01, 1);
          if (k.v >= need && (!bp || k.v > bp.v)) bp = k;
          await breathe();
        }
      } catch (e) { if (e !== TIMEOUT) throw e; }
      deadline = Infinity; nodeCap = Infinity;
      if (bp) { pick = bp; kids = kids.concat([bp]); if (TR) TR.art = { a: actOf(bp), v: +bp.v.toFixed(3), need: +need.toFixed(3) }; }
    }
    // 一步杀保险：走完这一步以后，对方能不能一步将死我（可以先给一枚子升一级再走）；能就按排名往下换一个不送杀的
    //   （送一步杀等于必输，最多往下找 80 个；都送杀时再试平时不肯用的召回良将）。只在选中的这步送杀时才多花时间
    //   用户导出的第二局第 17 回合：霸王档走完给楚留了“升卒 + 贴脸”一步杀——升卒的走法不在搜索的升级名额里，搜索看不见
    if (L.depth >= 2 && !fin0 && pick && pick.S && !pick.done) {
      const mate1 = T => {
        if (!T || T.final) return false;
        const opp = T.turn, st = [T];
        if (!T.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.s === opp && p.t !== 'k') { const U = A.upgradeState(T, [f, r]); if (U) st.push(U); } }
        for (const X of st) for (const e of A.gen(X, false)) {
          const R = BF.attempt(X, e.a); if (!R || R.free || !A.inCheck(R.S, me)) continue;
          const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === opp) return true;
        }
        return false;
      };
      try {
        if (mate1(pick.S)) {
          const alt = pool.filter(k => k !== pick && k.S && !k.done).slice(0, 80).concat(artOff.filter(k => k.S)).find(k => !mate1(k.S));
          if (alt) { if (TR) TR.mateGuard = { from: actOf(pick), to: actOf(alt) }; pick = alt; think.mateGuard = (think.mateGuard || 0) + 1; }
        }
      } catch (e) { }
    }
    // 拒马（不占行动）：走完这一步之后，哪枚能架拒马的兵会被对方打到，就先给它架上
    //   Ham 10-10：拒马不反伤炮和将帅，只有被会挨反伤的子盯着才架（架了之后两回合不能走）
    if (pick.up) { seq.push({ k: 'up', at: pick.up.at }); S = pick.up.S; }
    if (L.depth >= 2 && !pick.done && !S.freeUsed && pick.a.k !== 'pass') {
      try {
        const T = pick.S;
        let jm = null;
        for (let r = 0; r < 10 && !jm; r++) for (let f = 0; f < 9; f++) {
          const p = S.board[r][f]; if (!p || p.s !== me || p.t !== 'p' || p.lv < ((CFG.skills.juma && CFG.skills.juma.level) || CFG.skillLevel)) continue;
          const q = T.board[r][f]; if (!q || q.id !== p.id) continue;                 // 这一步动的就是它
          let hit = false;
          for (let r2 = 0; r2 < 10 && !hit; r2++) for (let f2 = 0; f2 < 9; f2++) { const e = T.board[r2][f2]; if (e && e.s !== me && e.t !== 'k' && (e.t !== 'c' || CFG.skills.juma.counterCannon) && A.moveTargets(T, f2, r2).some(m => m.to[0] === f && m.to[1] === r)) { hit = true; break; } }
          if (!hit) continue;
          const J = A.jumaState(S, [f, r]);
          if (J && BF.attempt(J, pick.a)) { jm = { k: 'sk', at: [f, r] }; break; }
        }
        if (jm) seq.push(jm);
      } catch (e) { }
    }
    seq.push(pick.a);
    think.last = { nodes, ms: now() - t0, v: pick.v, n: kids.length, depth: depthDone, top: kids.slice(0, 5).map(k => [k.up ? { up: k.up.at, ...k.a } : k.a, +k.v.toFixed(2)]) };
    if (TR) {
      // 根上候选前 8 名：行动、分数、是不是准确分（和最好的差不到 M 才算准确，其余只是上界）、预想线
      const Mw = (L.noise * 1.6 + 0.02) * 0.95;
      try { TR.cand = kids.slice(0, 8).map(k => ({ a: actOf(k), v: +k.v.toFixed(3), exact: !k.off && (k === kids[0] || k.v > bestV - Mw), pv: k.S && !k.done ? pvOf(k.S, Math.max(0, depthDone - 1), 7) : [] })); } catch (e) { TR.cand = kids.slice(0, 8).map(k => ({ a: actOf(k), v: +k.v.toFixed(3) })); TR.pvErr = String(e); }
      TR.pofuN = pofu.length;
      TR.pick = { a: actOf(pick), rank: kids.indexOf(pick), best: actOf(kids[0]), random: pick0 !== kids[0], noise: L.noise, top: L.top };   // random：噪声或前几名随机让它没选第一名
      Object.assign(TR, { ms: Math.round(now() - t0), nodes, depth: depthDone, why: L.fixedDepth ? 'fixed' : why, seq: JSON.parse(JSON.stringify(seq)) });
      think.last.trace = TR;
    }
    return seq;
  }
  // apiVersion：这份电脑用到的 BF.ai 接口版本（BF.ai.version）；工具拉历史版本对打时拿它核对
  // obsVersion：观察接口（trace 思考记录、scoreParts、裁判开关 upAll / rootUpAll / fixedDepth）的版本，复盘工具按它判断能不能用（C62 B4）
  const BFAI = { think, score, scoreParts, LEVELS, apiVersion: 1, obsVersion: 1, trace: false };
  if (typeof module !== 'undefined' && module.exports) module.exports = BFAI; else global.BFAI = BFAI;
})(typeof window !== 'undefined' ? window : globalThis);
