// 把自动调出来的权重写回线上电脑的打分公式（上线用）：生成一段 bfai.js 源码，替换 score()
//   结构和原公式一样（分项 P 照记，scoreParts 照用），只是公式里的数换成权重表 EW 里的值；潜力特征（第七版的想法）记进「军功」分项。
//   名字和 tools/tune/feats.js 一一对应：EW 用原权重 W0 时和原公式逐个局面相等（浮点加法顺序相同）。
//   用法：require('./score_w.js').source(权重对象) → 源码字符串（bfai_next 的 BFAI_TUNE_FAST、做补丁都用它）
'use strict';
const { W0 } = require('./feats.js');
function source(w) {
  const EW = {}; for (const k of Object.keys(W0)) EW[k] = w[k] != null ? w[k] : W0[k];
  delete EW.bias; delete EW.tempo; delete EW.fixed;   // 拟合用的常数项 / 先手项不进电脑；fixed 恒为 1
  const lit = JSON.stringify(EW).replace(/,"/g, ', "');
  return `  // ---------- 估值权重（自动调：tools/tune/，名字和 tools/tune/feats.js 一一对应；拟合数据、检验误差见 docs/ai-playbook.md）----------
  const EW = ${lit};
  const EHP = {}, ELV = {}, EUP = {};
  for (const t of ['r', 'c', 'n', 'p', 'a', 'e']) { EHP[t] = [0, EW[t + '_hp1'], EW[t + '_hp2'], EW[t + '_hp3'], EW[t + '_hp4']]; ELV[t] = EW[t + '_lv']; EUP[t] = EW['up_' + t] || 0; }
  const EAADV = [0, EW.aadv_hp1, EW.aadv_hp2, EW.aadv_hp3, EW.aadv_hp4];
  const EKD = [EW.kd_r1, EW.kd_r2, EW.kd_rline, EW.kd_n, EW.kd_p1, EW.kd_p2];
  const ESKR = { r: EW.skr_r || 0, n: EW.skr_n || 0, c: EW.skr_c || 0, p: EW.skr_p || 0, a: EW.skr_a || 0, e: EW.skr_e || 0 }, ESK = Object.values(ESKR).some(x => x);
  // 每个 [方][兵种] 的主技能：名字、几级解锁、是不是被动（think() 开始时随 potC 一起清掉）
  let skC = null;
  function skInfo(s, t) {
    if (!skC) skC = { r: {}, b: {} };
    let x = skC[s][t];
    if (x === undefined) { const sk = BF.SKILL_OF(t, s), C = sk && CFG.skills[sk]; x = skC[s][t] = sk && !(C && C.passive) ? ((C && C.level) || CFG.skillLevel) : 99; }
    return x;
  }
  const EPOT = ['up_r', 'up_n', 'up_c', 'up_p', 'up_a', 'up_e', 'r_gap3', 'skill_up', 'hurt_up', 'ult_ready', 'ult_near'].some(k => EW[k]);
  // 一枚子本身值多少（按权重表；和下面 baseVal 的结构相同。baseVal 还留给走法排序用）
  function baseValW(p, heavy) {
    const h = Math.min(4, Math.max(1, p.hp)), xp = EW.xp * Math.min(6, p.xp || 0);
    if (p.t === 'a' && !p.j && heavy) return EAADV[h] + (p.lv >= 2 && p.hp < 2 ? EW.aadv_lv2hp1 : 0) + (p.lv >= 3 ? EW.def_lv3 : 0) + (p.lv >= 4 ? EW.def_lv4 : 0) + xp;
    if (p.t === 'a' || p.t === 'e') {
      if (p.j) return VAL[p.t] * (HPF[h] + 0.06 * (p.lv - 1)) + (p.lv >= 3 ? 0.9 : 0) + (p.lv >= 4 ? 0.9 : 0) + xp;   // 决战解禁的士象：按进攻子算，不调
      return EHP[p.t][h] + ELV[p.t] * (p.lv - 1) + (p.lv >= 3 ? EW.def_lv3 : 0) + (p.lv >= 4 ? EW.def_lv4 : 0) + xp;
    }
    return EHP[p.t][h] + ELV[p.t] * (p.lv - 1) + (p.lv >= 3 ? EW.atk_lv3 : 0) + (p.lv >= 4 ? EW.atk_lv4 : 0) + xp;
  }
  // 潜力（汉方视角）：军功够升的子、车差 1～3 功、升一级解锁技能、升了回血、终极兵法够钱 / 快够
  //   每个 [方][兵种][级] 的“升一级解锁技能”“这一级满血几点”只算一次（think() 开始时清掉：规则开关可能变了）
  let potC = null;
  function potInfo(s, t, lv) {
    if (!potC) potC = { r: {}, b: {} };
    const a = potC[s][t] || (potC[s][t] = []);
    let x = a[lv];
    if (x === undefined) {
      const skLv = sk => (CFG.skills[sk] && CFG.skills[sk].level) || CFG.skillLevel;
      const info = BF.levelInfo ? BF.levelInfo(t, s, lv) : null;
      x = a[lv] = { sk: BF.SKILLS_OF(t, s).some(sk => skLv(sk) === lv + 1), hp: info && info.hp != null ? info.hp : -Infinity };
    }
    return x;
  }
  function potW(S) {
    const U = CFG.ultimates, mr = S.merit.r, mb = S.merit.b;
    let v = 0, gapR = 99, gapB = 99;
    for (const row of S.board) for (const p of row) {
      if (!p || p.t === 'k' || p.lv >= BF.maxLvOf(p.t)) continue;
      const c = A.upCost(p); if (c == null) continue;
      const red = p.s === 'r', m = red ? mr : mb;
      if (p.t === 'r') { const g = c - m; if (red) { if (g < gapR) gapR = g; } else if (g < gapB) gapB = g; }
      if (c > m) continue;
      const I = potInfo(p.s, p.t, p.lv), u = EUP[p.t] + (I.sk ? EW.skill_up : 0) + (p.hp < I.hp ? EW.hurt_up : 0);
      v += red ? u : -u;
    }
    if (gapR >= 1 && gapR <= 3) v += EW.r_gap3;
    if (gapB >= 1 && gapB <= 3) v -= EW.r_gap3;
    for (const s of ['r', 'b']) {
      const m = S.merit[s], left = (S.used.ult[s] || 0) < U[s === 'r' ? 'simian' : 'hongmen'].usesPerGame, sg = s === 'r' ? 1 : -1;
      if (left && m >= U.cost) v += sg * EW.ult_ready; else if (left && m >= U.cost - 5) v += sg * EW.ult_near;
    }
    return v;
  }
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
        if (fin) { const inside = f >= 3 && f <= 5 && adv >= 7; x = 6 + p.hp * EW.fk_hp + adv * EW.fk_adv + (inside ? EW.fk_in : 0) + Math.abs(f - 4) * EW.fk_off; }
        else x = EW.k_adv * adv + (f !== 4 ? EW.k_off : 0);   // 平时主帅老实待在原位
      } else {
        x = baseValW(p, s === 'r' ? hvB : hvR);
        if (P) xb = x;
        const dk = ek ? Math.abs(f - ek[0]) + Math.abs(r - ek[1]) : 9;
        switch (p.t) {
          case 'r': x += (adv > 0 || (f !== 0 && f !== 8) ? EW.r_out : 0) + EW.r_adv * Math.min(adv, 6) + (ek && (f === ek[0] || r === ek[1]) ? EW.r_line : 0) + EW.r_near * Math.max(0, 8 - dk); break;
          case 'c': x += (ek && f === ek[0] ? EW.c_file : 0) + (f === 4 ? EW.c_mid : 0) + (adv >= 1 && adv <= 4 ? EW.c_adv14 : 0) + EW.c_near * Math.max(0, 8 - dk); break;
          case 'n': x += (adv >= 1 ? EW.n_out : 0) + EW.n_adv * Math.min(adv, 6) + EW.n_near * Math.max(0, 7 - dk) + (f === 0 || f === 8 ? EW.n_edge : 0); break;
          case 'p': x += (adv >= 5 ? EW.p_cross + (adv - 5) * EW.p_deep + EW.p_near * Math.max(0, 5 - dk) : adv === 4 ? EW.p_adv4 : 0) + (f === 4 ? EW.p_mid : 0); break;
          default: if (fin) x += adv * EW.fin_def_adv + EW.fin_def_near * Math.max(0, 8 - dk);   // 决战里士象也要压上去
        }
        if (p.jm && p.jm > S.cnt[other(s)]) x += EW.jm;
        if (dk <= 4 && (p.t === 'r' || p.t === 'c' || p.t === 'n' || (p.t === 'p' && adv >= 5))) { if (s === 'r') attR++; else attB++; x += EW.att4; if (dk <= 2) x += EW.att2; }
        if (ESK && p.lv >= skInfo(s, p.t) && S.cnt[s] >= (p.cd || 0)) x += ESKR[p.t];   // 主技能冷却好了
        if (P) xp = x;
        // 砍不死的进攻子贴到对方主帅身边：这是这个游戏里最主要的杀法（升了级的车马兵贴脸将军，一级的士、帅拿它没办法）
        if (!fin && ek && dk <= 4 && p.hp > (s === 'r' ? dB : dR)) {
          if (p.t === 'r') x += dk <= 1 ? EKD[0] : dk === 2 ? EKD[1] : (f === ek[0] || r === ek[1]) ? EKD[2] : 0;
          else if (p.t === 'n') x += dk <= 3 ? EKD[3] : 0;
          else if (p.t === 'p' && adv >= 5) x += dk <= 1 ? EKD[4] : dk === 2 ? EKD[5] : 0;
        }
      }
      v += s === me ? x : -x;
      if (P) { const g = s === me ? 1 : -1; if (p.t === 'k') P['帅'] += g * x; else { P['子力'] += g * xb; P['位置'] += g * (xp - xb); P['贴脸'] += g * (x - xp); } }
    }
    if (EW.heavy && hvR !== hvB) { const u = (me === 'r' ? 1 : -1) * EW.heavy * (hvR ? 1 : -1); v += u; if (P) P['贴脸'] += u; }
    const mt = EW.merit * (S.merit[me] - S.merit[other(me)]);   // 军功能换成血量和等级
    v += mt; if (P) P['军功'] += mt;
    if (EPOT) { const u = (me === 'r' ? 1 : -1) * potW(S); v += u; if (P) P['军功'] += u; }
    // 还没用的主帅兵法留着有价值（免得为了一个兵就把「召回良将」用掉）
    const art = s => (S.used.art[s] ? 0 : s === 'r' ? EW.art_r : EW.art_b);
    const at_ = art(me) - art(other(me));
    v += at_; if (P) P['兵法'] += at_;
    const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
    // 终极兵法生效中：值多少看有多少进攻子已经压在对方主帅跟前（没人跟上，困住对方也白搭）
    if (sm) { const u = (me === 'r' ? 1 : -1) * sm * (EW.sm + EW.sm_att * Math.min(4, attR)); v += u; if (P) P['终极兵法'] += u; }
    if (hm) { const u = (me === 'b' ? 1 : -1) * hm * (EW.hm + EW.hm_att * Math.min(4, attB)); v += u; if (P) P['终极兵法'] += u; }
    const pf = Math.max(0, (S.fx.pf || 0) - S.cnt.b);
    if (pf && (PFC || PFA)) { const u = (me === 'r' ? 1 : -1) * Math.min(1, pf / CFG.generalArts.pofu.skillLockRounds) * (PFC + PFA * Math.min(4, attR)); v += u; if (P) P['兵法'] += u; }
    if (fin && S.occ) { const u = EW.occ * ((S.occ[me] || 0) - (S.occ[other(me)] || 0)); v += u; if (P) P['决战'] += u; }
    return v;
  }
`;
}
module.exports = { source };
