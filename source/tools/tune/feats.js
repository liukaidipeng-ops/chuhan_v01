// 自动调估值权重（训练第一步）：把线上电脑的打分公式（src/bfai.js 的 score）拆成“特征 × 权重”。
//   feats(S) 返回汉方视角的特征向量；dot(W0, feats(S)) 和 BFAI.score(S, 'r') 逐个相等（check() 核对）。
//   W0：现在公式里的数；NAMES：每个权重的名字。拟合见 fit.js，局面怎么收见 bfsim.js --dump-pos。
//   不调的项（很少出现、或两边总相等）都记进特征 fixed，权重固定为 1。
'use strict';

const VAL = { r: 9, c: 4.6, n: 4.2, e: 2.3, a: 2.1, p: 1.1, k: 0 };
const HPF = [0, 1, 1.5, 1.9, 2.2], HPF_DEF = [0, 1, 1.15, 1.28, 1.36], HPF_ADV = [0, 1, 1.55, 1.75, 1.85];
const KD = [2.0, 1.0, 0.4, 0.9, 1.2, 0.6];

const W0 = {};
const add = (k, v) => { W0[k] = v; };
for (const t of ['r', 'c', 'n', 'p']) { for (let h = 1; h <= 4; h++) add(`${t}_hp${h}`, VAL[t] * HPF[h]); add(`${t}_lv`, VAL[t] * 0.06); }
for (const t of ['a', 'e']) { for (let h = 1; h <= 4; h++) add(`${t}_hp${h}`, VAL[t] * HPF_DEF[h]); add(`${t}_lv`, VAL[t] * 0.03); }
for (let h = 1; h <= 4; h++) add(`aadv_hp${h}`, VAL.a * HPF_ADV[h]);
add('aadv_lv2hp1', VAL.a * 0.2);
add('atk_lv3', 0.9); add('atk_lv4', 0.9); add('def_lv3', 0.4); add('def_lv4', 0.9); add('xp', 0.14);
add('r_out', 0.3); add('r_adv', 0.03); add('r_line', 0.35); add('r_near', 0.04);
add('c_file', 0.4); add('c_mid', 0.12); add('c_adv14', 0.1); add('c_near', 0.02);
add('n_out', 0.3); add('n_adv', 0.04); add('n_near', 0.06); add('n_edge', -0.15);
add('p_cross', 0.55); add('p_deep', 0.12); add('p_near', 0.05); add('p_adv4', 0.12); add('p_mid', 0.08);
add('fin_def_adv', 0.12); add('fin_def_near', 0.05);
add('jm', 0.25);
add('kd_r1', KD[0]); add('kd_r2', KD[1]); add('kd_rline', KD[2]); add('kd_n', KD[3]); add('kd_p1', KD[4]); add('kd_p2', KD[5]);
add('k_adv', -0.22); add('k_off', -0.12);
add('fk_hp', 5); add('fk_adv', 0.35); add('fk_in', 2.5); add('fk_off', -0.15);
add('merit', 0.3); add('art_r', 4); add('art_b', 3);
add('sm', 1.5); add('sm_att', 0.6); add('hm', 0.35); add('hm_att', 0.55);
add('occ', 7);
add('fixed', 1);
const NAMES = Object.keys(W0);
const IDX = Object.fromEntries(NAMES.map((k, i) => [k, i]));
const N = NAMES.length;
const FIXED = new Set(['fixed']);   // 不调

// A：引擎的 BF.ai（要 atk）；CFG：BF.CFG（背水开没开决定楚方兵法值几分，见 W0.art_b）
function feats(S, A, CFG) {
  const F = new Float64Array(N);
  const b = S.board, fin = !!S.final;
  const other = s => (s === 'r' ? 'b' : 'r');
  let kr = null, kb = null;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = b[r][f]; if (p && p.t === 'k') { if (p.s === 'r') kr = [f, r]; else kb = [f, r]; } }
  const heavyAt = (p, f, r) => { if (p.hp < 2) return false; const adv = p.s === 'r' ? r : 9 - r; return p.t === 'r' ? adv >= 5 || (f >= 3 && f <= 5) : (p.t === 'n' || p.t === 'p') && adv >= 6 && f >= 2 && f <= 6; };
  let attR = 0, attB = 0, hvR = false, hvB = false, dR = 1, dB = 1;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = b[r][f]; if (!p) continue;
    if (heavyAt(p, f, r)) { if (p.s === 'r') hvR = true; else hvB = true; }
    if (p.t === 'k' || p.t === 'a') { const k = A.atk(p); if (p.s === 'r') { if (k > dR) dR = k; } else if (k > dB) dB = k; }
  }
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const p = b[r][f]; if (!p) continue;
    const s = p.s, sg = s === 'r' ? 1 : -1, adv = s === 'r' ? r : 9 - r, ek = s === 'r' ? kb : kr;
    const e = (k, c) => { F[IDX[k]] += sg * c; };
    if (p.t === 'k') {
      if (fin) { const inside = f >= 3 && f <= 5 && adv >= 7; e('fixed', 6); e('fk_hp', p.hp); e('fk_adv', adv); if (inside) e('fk_in', 1); e('fk_off', Math.abs(f - 4)); }
      else { e('k_adv', adv); if (f !== 4) e('k_off', 1); }
      continue;
    }
    const h = Math.min(4, Math.max(1, p.hp)), heavy = s === 'r' ? hvB : hvR;
    // 子本身（baseVal）
    if (p.t === 'a' && !p.j && heavy) {
      e(`aadv_hp${h}`, 1); if (p.lv >= 2 && p.hp < 2) e('aadv_lv2hp1', 1);
      if (p.lv >= 3) e('def_lv3', 1); if (p.lv >= 4) e('def_lv4', 1);
    } else if ((p.t === 'a' || p.t === 'e') && !p.j) {
      e(`${p.t}_hp${h}`, 1); e(`${p.t}_lv`, p.lv - 1);
      if (p.lv >= 3) e('def_lv3', 1); if (p.lv >= 4) e('def_lv4', 1);
    } else if (p.t === 'a' || p.t === 'e') {   // 解禁了的士象按进攻子的血量表算：不调，记进 fixed
      e('fixed', VAL[p.t] * (HPF[h] + 0.06 * (p.lv - 1)) + (p.lv >= 3 ? 0.9 : 0) + (p.lv >= 4 ? 0.9 : 0));
    } else {
      e(`${p.t}_hp${h}`, 1); e(`${p.t}_lv`, p.lv - 1);
      if (p.lv >= 3) e('atk_lv3', 1); if (p.lv >= 4) e('atk_lv4', 1);
    }
    e('xp', Math.min(6, p.xp || 0));
    // 位置
    const dk = ek ? Math.abs(f - ek[0]) + Math.abs(r - ek[1]) : 9;
    switch (p.t) {
      case 'r': if (adv > 0 || (f !== 0 && f !== 8)) e('r_out', 1); e('r_adv', Math.min(adv, 6)); if (ek && (f === ek[0] || r === ek[1])) e('r_line', 1); e('r_near', Math.max(0, 8 - dk)); break;
      case 'c': if (ek && f === ek[0]) e('c_file', 1); if (f === 4) e('c_mid', 1); if (adv >= 1 && adv <= 4) e('c_adv14', 1); e('c_near', Math.max(0, 8 - dk)); break;
      case 'n': if (adv >= 1) e('n_out', 1); e('n_adv', Math.min(adv, 6)); e('n_near', Math.max(0, 7 - dk)); if (f === 0 || f === 8) e('n_edge', 1); break;
      case 'p': if (adv >= 5) { e('p_cross', 1); e('p_deep', adv - 5); e('p_near', Math.max(0, 5 - dk)); } else if (adv === 4) e('p_adv4', 1); if (f === 4) e('p_mid', 1); break;
      default: if (fin) { e('fin_def_adv', adv); e('fin_def_near', Math.max(0, 8 - dk)); }
    }
    if (p.jm && p.jm > S.cnt[other(s)]) e('jm', 1);
    if (dk <= 4 && (p.t === 'r' || p.t === 'c' || p.t === 'n' || (p.t === 'p' && adv >= 5))) { if (s === 'r') attR++; else attB++; }
    if (!fin && ek && dk <= 4 && p.hp > (s === 'r' ? dB : dR)) {
      if (p.t === 'r') { if (dk <= 1) e('kd_r1', 1); else if (dk === 2) e('kd_r2', 1); else if (f === ek[0] || r === ek[1]) e('kd_rline', 1); }
      else if (p.t === 'n') { if (dk <= 3) e('kd_n', 1); }
      else if (p.t === 'p' && adv >= 5) { if (dk <= 1) e('kd_p1', 1); else if (dk === 2) e('kd_p2', 1); }
    }
  }
  F[IDX.merit] += S.merit.r - S.merit.b;
  // 主帅兵法还没用：汉记 art_r，楚记 art_b（背水开着时线上默认值 BSV = 3，和破釜一样）
  if (!S.used.art.r) F[IDX.art_r] += 1;
  if (!S.used.art.b) F[IDX.art_b] -= 1;
  const sm = Math.max(0, S.fx.sm - S.cnt.b), hm = Math.max(0, S.fx.hm - S.cnt.r);
  if (sm) { F[IDX.sm] += sm; F[IDX.sm_att] += sm * Math.min(4, attR); }
  if (hm) { F[IDX.hm] -= hm; F[IDX.hm_att] -= hm * Math.min(4, attB); }
  if (fin && S.occ) F[IDX.occ] += (S.occ.r || 0) - (S.occ.b || 0);
  return F;
}
const dot = (W, F) => { let v = 0; for (let i = 0; i < N; i++) v += W[i] * F[i]; return v; };
const vec = obj => Float64Array.from(NAMES, k => obj[k] != null ? obj[k] : W0[k]);

// 局面压缩成一行字（收局面时用；只留打分和以后加特征可能用到的东西）
function pack(S) {
  const ps = [];
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p) ps.push([p.t + p.s, f, r, p.lv, p.hp, p.xp || 0, p.j ? 1 : 0, p.jm || 0, p.cd || 0, p.kills || 0].join(',')); }
  return [S.turn, S.cnt.r, S.cnt.b, S.merit.r, S.merit.b, S.used.art.r ? 1 : 0, S.used.art.b ? 1 : 0, S.used.ult.r || 0, S.used.ult.b || 0, S.fx.sm || 0, S.fx.hm || 0, S.fx.pf || 0, S.final ? 1 : 0, (S.occ && S.occ.r) || 0, (S.occ && S.occ.b) || 0, ps.join(';')].join('|');
}
function unpack(str) {
  const a = str.split('|');
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  for (const x of a[15].split(';')) {
    if (!x) continue;
    const [ts, f, r, lv, hp, xp, j, jm, cd, kills] = x.split(',');
    board[+r][+f] = { t: ts[0], s: ts[1], lv: +lv, hp: +hp, xp: +xp, j: j === '1', jm: +jm, cd: +cd, kills: +kills };
  }
  return { board, turn: a[0], cnt: { r: +a[1], b: +a[2] }, merit: { r: +a[3], b: +a[4] }, used: { art: { r: +a[5], b: +a[6] }, ult: { r: +a[7], b: +a[8] } }, fx: { sm: +a[9], hm: +a[10], pf: +a[11] }, final: a[12] === '1', occ: { r: +a[13], b: +a[14] } };
}

module.exports = { NAMES, IDX, N, W0, FIXED, feats, dot, vec, pack, unpack };
