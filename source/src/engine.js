// ===== 人机引擎：Alpha-Beta 搜索（PVS + 置换表 + 空着裁剪 + 迟着减枝 + 静态搜索 + 开局库） =====
// 整个工厂函数会被序列化后放进 Web Worker 里运行；Node 测试也可直接调用。
function XQEngineFactory() {
  'use strict';
  // 棋子：红 8+类型，黑 16+类型；类型 0帅 1仕 2相 3马 4车 5炮 6兵
  const PK = 0, PA = 1, PB = 2, PN = 3, PR = 4, PC = 5, PP = 6;
  const MATE = 10000, WIN = MATE - 200, BAN = MATE - 100, DRAW = -10;
  const MAX_PLY = 64;
  const IN_BOARD = new Uint8Array(256), IN_FORT = new Uint8Array(256), FLIP = new Uint8Array(256);
  const sqOf = (f, r) => (r + 3) * 16 + f + 3;
  const RANK = sq => (sq >> 4) - 3, FILE = sq => (sq & 15) - 3;
  for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
    const s = sqOf(f, r); IN_BOARD[s] = 1;
    if (f >= 3 && f <= 5 && (r <= 2 || r >= 7)) IN_FORT[s] = 1;
    FLIP[s] = sqOf(f, 9 - r);
  }
  const homeHalf = (sq, sd) => (sd === 0 ? RANK(sq) <= 4 : RANK(sq) >= 5);
  const KING_D = [1, -1, 16, -16], ADV_D = [15, 17, -15, -17], BIS_D = [30, 34, -30, -34];
  const KNI_D = [33, 31, -33, -31, 18, 14, -18, -14], KNI_LEG = [16, 16, -16, -16, 1, -1, -1, 1];
  const LINE_D = [1, -1, 16, -16];
  const FWD = [16, -16];

  // —— 子力位置分（红方视角，第 0 行为黑方底线，第 9 行为红方底线） ——
  const T_KP = [
    9, 9, 9, 11, 13, 11, 9, 9, 9,
    19, 24, 34, 42, 44, 42, 34, 24, 19,
    19, 24, 32, 37, 37, 37, 32, 24, 19,
    19, 23, 27, 29, 30, 29, 27, 23, 19,
    14, 18, 20, 27, 29, 27, 20, 18, 14,
    7, 0, 13, 0, 16, 0, 13, 0, 7,
    7, 0, 7, 0, 15, 0, 7, 0, 7,
    0, 0, 0, 1, 1, 1, 0, 0, 0,
    0, 0, 0, 2, 2, 2, 0, 0, 0,
    0, 0, 0, 11, 15, 11, 0, 0, 0];
  const T_AB = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 20, 0, 0, 0, 20, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    18, 0, 0, 20, 23, 20, 0, 0, 18,
    0, 0, 0, 0, 23, 0, 0, 0, 0,
    0, 0, 20, 20, 0, 20, 20, 0, 0];
  const T_N = [
    90, 90, 90, 96, 90, 96, 90, 90, 90,
    90, 96, 103, 97, 94, 97, 103, 96, 90,
    92, 98, 99, 103, 99, 103, 99, 98, 92,
    93, 108, 100, 107, 100, 107, 100, 108, 93,
    90, 100, 99, 103, 104, 103, 99, 100, 90,
    90, 98, 101, 102, 103, 102, 101, 98, 90,
    92, 94, 98, 95, 98, 95, 98, 94, 92,
    93, 92, 94, 95, 92, 95, 94, 92, 93,
    85, 90, 92, 93, 78, 93, 92, 90, 85,
    88, 85, 90, 88, 90, 88, 90, 85, 88];
  const T_R = [
    206, 208, 207, 213, 214, 213, 207, 208, 206,
    206, 212, 209, 216, 233, 216, 209, 212, 206,
    206, 208, 207, 214, 216, 214, 207, 208, 206,
    206, 213, 213, 216, 216, 216, 213, 213, 206,
    208, 211, 211, 214, 215, 214, 211, 211, 208,
    208, 212, 212, 214, 215, 214, 212, 212, 208,
    204, 209, 204, 212, 214, 212, 204, 209, 204,
    198, 208, 204, 212, 212, 212, 204, 208, 198,
    200, 208, 206, 212, 200, 212, 206, 208, 200,
    194, 206, 204, 212, 200, 212, 204, 206, 194];
  const T_C = [
    100, 100, 96, 91, 90, 91, 96, 100, 100,
    98, 98, 96, 92, 89, 92, 96, 98, 98,
    97, 97, 96, 91, 92, 91, 96, 97, 97,
    96, 99, 99, 98, 100, 98, 99, 99, 96,
    96, 96, 96, 96, 100, 96, 96, 96, 96,
    95, 96, 99, 96, 100, 96, 99, 96, 95,
    96, 96, 96, 96, 96, 96, 96, 96, 96,
    97, 96, 100, 99, 101, 99, 100, 96, 97,
    96, 97, 98, 98, 98, 98, 98, 97, 96,
    96, 96, 97, 99, 99, 99, 97, 96, 96];
  const TABLES = [T_KP, T_AB, T_AB, T_N, T_R, T_C, T_KP];
  // PST[type][sq]（红方）
  const PST = [];
  for (let t = 0; t < 7; t++) {
    const a = new Int16Array(256);
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) a[sqOf(f, r)] = TABLES[t][(9 - r) * 9 + f];
    PST.push(a);
  }
  const pstVal = (pc, sq) => (pc < 16 ? PST[pc - 8][sq] : PST[pc - 16][FLIP[sq]]);
  const MVV = [5, 1, 1, 3, 4, 3, 2]; // 被吃价值
  const LVA = [1, 1, 1, 3, 4, 3, 2];

  // —— Zobrist ——
  let seed = 0x2545F491;
  const rnd32 = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const ZK = new Int32Array(23 * 256), ZL = new Int32Array(23 * 256);
  for (let i = 0; i < ZK.length; i++) { ZK[i] = rnd32(); ZL[i] = rnd32(); }
  const ZK_SIDE = rnd32(), ZL_SIDE = rnd32();

  // —— 局面 ——
  const sq = new Int8Array(256);
  let sd = 0, zKey = 0, zLock = 0, vlRed = 0, vlBlack = 0, distance = 0;
  const keyStack = new Int32Array(1024), chkStack = new Uint8Array(1024), capStack = new Int8Array(1024), mvStack = new Int32Array(1024);
  let nStack = 0; // 历史长度（含对局已走的步）
  let rootStackBase = 0;
  const kingSq = new Int32Array(2);

  function addPiece(s, pc) {
    sq[s] = pc;
    if (pc < 16) vlRed += PST[pc - 8][s]; else vlBlack += PST[pc - 16][FLIP[s]];
    zKey ^= ZK[pc * 256 + s]; zLock ^= ZL[pc * 256 + s];
    if ((pc & 7) === PK) kingSq[pc < 16 ? 0 : 1] = s;
  }
  function delPiece(s, pc) {
    sq[s] = 0;
    if (pc < 16) vlRed -= PST[pc - 8][s]; else vlBlack -= PST[pc - 16][FLIP[s]];
    zKey ^= ZK[pc * 256 + s]; zLock ^= ZL[pc * 256 + s];
  }
  function reset() {
    sq.fill(0); sd = 0; zKey = 0; zLock = 0; vlRed = 0; vlBlack = 0; distance = 0; nStack = 0;
    const back = [PR, PN, PB, PA, PK, PA, PB, PN, PR];
    for (let f = 0; f < 9; f++) { addPiece(sqOf(f, 0), 8 + back[f]); addPiece(sqOf(f, 9), 16 + back[f]); }
    addPiece(sqOf(1, 2), 8 + PC); addPiece(sqOf(7, 2), 8 + PC); addPiece(sqOf(1, 7), 16 + PC); addPiece(sqOf(7, 7), 16 + PC);
    for (let f = 0; f < 9; f += 2) { addPiece(sqOf(f, 3), 8 + PP); addPiece(sqOf(f, 6), 16 + PP); }
  }
  const sideTag = s => 8 + (s << 3), oppTag = s => 16 - (s << 3);

  // 某方是否被将军
  function checked(s) {
    const self = sideTag(s), opp = oppTag(s);
    const k = kingSq[s];
    if (sq[k] !== self + PK) return true;
    // 兵
    if (sq[k + FWD[s]] === opp + PP) return true;
    if (sq[k - 1] === opp + PP || sq[k + 1] === opp + PP) return true;
    // 马
    for (let i = 0; i < 8; i++) {
      const n = k - KNI_D[i];
      if (sq[n] === opp + PN && sq[n + KNI_LEG[i]] === 0) return true;
    }
    // 车、炮、对脸
    for (let i = 0; i < 4; i++) {
      const d = LINE_D[i];
      let t = k + d;
      while (IN_BOARD[t]) { if (sq[t]) break; t += d; }
      if (!IN_BOARD[t]) continue;
      const p = sq[t];
      if (p === opp + PR || (p === opp + PK && (d === 16 || d === -16))) return true;
      t += d;
      while (IN_BOARD[t]) { if (sq[t]) { if (sq[t] === opp + PC) return true; break; } t += d; }
    }
    return false;
  }
  function makeMove(mv) {
    const src = mv & 255, dst = mv >> 8;
    const pc = sq[src], cap = sq[dst];
    keyStack[nStack] = zKey ^ 0; mvStack[nStack] = mv; capStack[nStack] = cap;
    if (cap) delPiece(dst, cap);
    delPiece(src, pc); addPiece(dst, pc);
    sd ^= 1; zKey ^= ZK_SIDE; zLock ^= ZL_SIDE;
    nStack++; distance++;
    chkStack[nStack - 1] = checked(sd) ? 1 : 0;
    return cap;
  }
  function undoMove() {
    nStack--; distance--;
    const mv = mvStack[nStack], cap = capStack[nStack];
    const src = mv & 255, dst = mv >> 8;
    sd ^= 1; zKey ^= ZK_SIDE; zLock ^= ZL_SIDE;
    const pc = sq[dst];
    delPiece(dst, pc); addPiece(src, pc);
    if (cap) addPiece(dst, cap);
  }
  // 走一步并检查合法；非法则还原返回 false
  function tryMove(mv) {
    makeMove(mv);
    if (checked(sd ^ 1)) { undoMove(); return false; }
    return true;
  }
  function nullMove() { keyStack[nStack] = zKey; mvStack[nStack] = 0; capStack[nStack] = 0; chkStack[nStack] = 0; nStack++; distance++; sd ^= 1; zKey ^= ZK_SIDE; zLock ^= ZL_SIDE; }
  function undoNull() { nStack--; distance--; sd ^= 1; zKey ^= ZK_SIDE; zLock ^= ZL_SIDE; }

  // —— 走法生成（伪合法）。capOnly：只生成吃子 ——
  function genMoves(out, capOnly) {
    let n = 0;
    const self = sideTag(sd), opp = oppTag(sd);
    for (let s = 51; s < 205; s++) {
      const pc = sq[s];
      if ((pc & self) === 0 || pc < 8) continue;
      if ((pc & 24) !== self) continue;
      const t = pc & 7;
      switch (t) {
        case PK: for (let i = 0; i < 4; i++) { const d = s + KING_D[i]; if (!IN_FORT[d]) continue; const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); } break;
        case PA: for (let i = 0; i < 4; i++) { const d = s + ADV_D[i]; if (!IN_FORT[d]) continue; const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); } break;
        case PB: for (let i = 0; i < 4; i++) { const d = s + BIS_D[i]; if (!IN_BOARD[d] || !homeHalf(d, sd) || sq[s + (BIS_D[i] >> 1)]) continue; const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); } break;
        case PN: for (let i = 0; i < 8; i++) { const d = s + KNI_D[i]; if (!IN_BOARD[d] || sq[s + KNI_LEG[i]]) continue; const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); } break;
        case PR: for (let i = 0; i < 4; i++) { const dd = LINE_D[i]; let d = s + dd; while (IN_BOARD[d]) { const q = sq[d]; if (!q) { if (!capOnly) out[n++] = s | (d << 8); } else { if (q & opp) out[n++] = s | (d << 8); break; } d += dd; } } break;
        case PC: for (let i = 0; i < 4; i++) { const dd = LINE_D[i]; let d = s + dd; while (IN_BOARD[d]) { if (sq[d]) break; if (!capOnly) out[n++] = s | (d << 8); d += dd; } d += dd; while (IN_BOARD[d]) { const q = sq[d]; if (q) { if (q & opp) out[n++] = s | (d << 8); break; } d += dd; } } break;
        case PP: {
          let d = s + FWD[sd];
          if (IN_BOARD[d]) { const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); }
          if (!homeHalf(s, sd)) { d = s - 1; if (IN_BOARD[d]) { const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); } d = s + 1; if (IN_BOARD[d]) { const q = sq[d]; if (capOnly ? (q & opp) : !(q & self)) out[n++] = s | (d << 8); } }
          break;
        }
      }
    }
    return n;
  }
  const evaluate = () => (sd === 0 ? vlRed - vlBlack : vlBlack - vlRed) + 3;
  // 重复局面：返回 0 无重复；否则按长将判负/判和
  function repStatus(recur) {
    let selfSide = false, perpCheckSelf = true, perpCheckOpp = true;
    let i = nStack - 1;
    while (i >= 0 && mvStack[i] && !capStack[i]) {
      if (selfSide) { perpCheckSelf = perpCheckSelf && chkStack[i]; if (keyStack[i] === zKey) { recur--; if (recur === 0) return 1 + (perpCheckSelf ? 2 : 0) + (perpCheckOpp ? 4 : 0); } }
      else perpCheckOpp = perpCheckOpp && chkStack[i];
      selfSide = !selfSide; i--;
    }
    return 0;
  }
  function repValue(st) {
    const v = ((st & 2) ? -BAN + distance : 0) + ((st & 4) ? BAN - distance : 0);
    return v === 0 ? (distance & 1 ? -DRAW : DRAW) : v;
  }

  // —— 置换表 ——
  const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttLock = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE), ttVal = new Int16Array(TT_SIZE);
  const HF_ALPHA = 1, HF_BETA = 2, HF_PV = 3;
  let ttHitMove = 0;
  function probeTT(alpha, beta, depth) {
    const i = zKey & TT_MASK;
    ttHitMove = 0;
    if (ttLock[i] !== zLock) return -MATE - 1;
    ttHitMove = ttMove[i];
    let v = ttVal[i];
    if (v > WIN) v -= distance; else if (v < -WIN) v += distance;
    if (ttDepth[i] >= depth) {
      const f = ttFlag[i];
      if (f === HF_PV) return v;
      if (f === HF_BETA && v >= beta) return v;
      if (f === HF_ALPHA && v <= alpha) return v;
    }
    return -MATE - 1;
  }
  function storeTT(flag, v, depth, mv) {
    const i = zKey & TT_MASK;
    if (ttLock[i] === zLock && ttDepth[i] > depth && flag !== HF_PV) return;
    if (v > WIN) v += distance; else if (v < -WIN) v -= distance;
    ttLock[i] = zLock; ttMove[i] = mv; ttDepth[i] = depth; ttFlag[i] = flag; ttVal[i] = v;
  }

  // —— 走法排序 ——
  const history = new Int32Array(65536);
  const killers = new Int32Array(MAX_PLY * 2);
  const moveBuf = [], scoreBuf = [];
  for (let i = 0; i < MAX_PLY + 8; i++) { moveBuf.push(new Int32Array(160)); scoreBuf.push(new Int32Array(160)); }
  function mvvlva(mv) { const a = sq[mv & 255] & 7, v = sq[mv >> 8] & 7; return (MVV[v] << 3) - LVA[a]; }

  let nodes = 0, stopAt = 0, stopped = false, tick = 0;
  function timeUp() {
    if (stopped) return true;
    if (((++tick) & 2047) === 0 && Date.now() > stopAt) stopped = true;
    return stopped;
  }
  const hasBigPieces = () => {
    const self = sideTag(sd);
    let n = 0;
    for (let s = 51; s < 205; s++) { const p = sq[s]; if ((p & 24) === self) { const t = p & 7; if (t === PR) n += 2; else if (t === PN || t === PC) n += 1; } }
    return n >= 3;
  };

  function quiesce(alpha, beta, qd) {
    nodes++;
    if (timeUp()) return 0;
    const rs = repStatus(1);
    if (rs) return repValue(rs);
    if (distance >= MAX_PLY) return evaluate();
    const inChk = chkStack[nStack - 1];
    let best = -MATE + distance;
    const ply = distance;
    const mvs = moveBuf[Math.min(ply, MAX_PLY + 7)], sc = scoreBuf[Math.min(ply, MAX_PLY + 7)];
    let n;
    if (inChk) {
      n = genMoves(mvs, false);
      for (let i = 0; i < n; i++) sc[i] = (sq[mvs[i] >> 8] ? 100000 + mvvlva(mvs[i]) : history[mvs[i] & 0xffff]);
    } else {
      const v = evaluate();
      if (v > best) { best = v; if (v >= beta) return v; if (v > alpha) alpha = v; }
      if (qd > 10) return best;
      n = genMoves(mvs, true);
      for (let i = 0; i < n; i++) sc[i] = mvvlva(mvs[i]);
    }
    for (let i = 0; i < n; i++) {
      let bi = i; for (let j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      const mv = mvs[bi]; mvs[bi] = mvs[i]; mvs[i] = mv; const t = sc[bi]; sc[bi] = sc[i]; sc[i] = t;
      if (!tryMove(mv)) continue;
      const v = -quiesce(-beta, -alpha, qd + 1);
      undoMove();
      if (stopped) return 0;
      if (v > best) { best = v; if (v >= beta) return v; if (v > alpha) alpha = v; }
    }
    return best;
  }

  function search(depth, alpha, beta, nullOk) {
    if (depth <= 0) return quiesce(alpha, beta, 0);
    nodes++;
    if (timeUp()) return 0;
    const ply = distance;
    if (ply > 0) {
      const rs = repStatus(1);
      if (rs) return repValue(rs);
      // 杀棋距离裁剪
      if (-MATE + ply >= beta) return -MATE + ply;
      if (MATE - ply - 1 <= alpha) return MATE - ply - 1;
    }
    if (ply >= MAX_PLY) return evaluate();
    const pv = beta - alpha > 1;
    const tv = probeTT(alpha, beta, depth);
    const hashMv = ttHitMove;
    if (tv > -MATE - 1 && ply > 0 && !pv) return tv;
    const inChk = chkStack[nStack - 1];
    // 空着裁剪
    if (nullOk && !pv && !inChk && depth >= 2 && ply > 0 && hasBigPieces() && evaluate() >= beta) {
      nullMove();
      const R = depth > 6 ? 3 : 2;
      const v = -search(depth - 1 - R, -beta, -beta + 1, false);
      undoNull();
      if (stopped) return 0;
      if (v >= beta && v < WIN) return v;
    }
    const mvs = moveBuf[ply], sc = scoreBuf[ply];
    const n = genMoves(mvs, false);
    const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    for (let i = 0; i < n; i++) {
      const mv = mvs[i];
      if (mv === hashMv) sc[i] = 1 << 30;
      else if (sq[mv >> 8]) sc[i] = (1 << 29) + mvvlva(mv) * 256;
      else if (mv === k1) sc[i] = (1 << 28) + 2;
      else if (mv === k2) sc[i] = (1 << 28) + 1;
      else sc[i] = history[mv & 0xffff];
    }
    let best = -MATE, bestMv = 0, flag = HF_ALPHA, legal = 0;
    for (let i = 0; i < n; i++) {
      let bi = i; for (let j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      const mv = mvs[bi]; mvs[bi] = mvs[i]; mvs[i] = mv; const ts = sc[bi]; sc[bi] = sc[i]; sc[i] = ts;
      const isCap = sq[mv >> 8] !== 0;
      if (!tryMove(mv)) continue;
      legal++;
      const givesChk = chkStack[nStack - 1];
      const ext = givesChk ? 1 : 0;
      let v;
      if (legal === 1) v = -search(depth - 1 + ext, -beta, -alpha, true);
      else {
        let red = 0;
        if (!ext && !inChk && !isCap && depth >= 3 && legal > 3 && mv !== k1 && mv !== k2) red = legal > 10 ? 2 : 1;
        v = -search(depth - 1 - red, -alpha - 1, -alpha, true);
        if (v > alpha && red) v = -search(depth - 1, -alpha - 1, -alpha, true);
        if (v > alpha && v < beta) v = -search(depth - 1 + ext, -beta, -alpha, true);
      }
      undoMove();
      if (stopped) return 0;
      if (v > best) {
        best = v; bestMv = mv;
        if (v > alpha) {
          alpha = v; flag = HF_PV;
          if (v >= beta) {
            flag = HF_BETA;
            if (!isCap) {
              if (killers[ply * 2] !== mv) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = mv; }
              history[mv & 0xffff] += depth * depth;
            }
            break;
          }
        }
      }
    }
    if (legal === 0) return -MATE + ply; // 将死或困毙
    storeTT(flag, best, depth, bestMv);
    return best;
  }

  // —— 根节点 ——
  function legalMoves() {
    const buf = new Int32Array(160);
    const n = genMoves(buf, false), out = [];
    for (let i = 0; i < n; i++) if (tryMove(buf[i])) { undoMove(); out.push(buf[i]); }
    return out;
  }
  function rootSearch(maxDepth, timeMs, fullScores) {
    stopAt = Date.now() + timeMs; stopped = false; nodes = 0; tick = 0;
    history.fill(0); killers.fill(0);
    let moves = legalMoves().map(mv => ({ mv, v: 0 }));
    if (!moves.length) return { best: 0, moves, depth: 0 };
    if (moves.length === 1 && !fullScores) return { best: moves[0].mv, moves, depth: 0, score: 0 };
    let best = moves[0].mv, bestV = 0, doneDepth = 0;
    const t0 = Date.now();
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -MATE, beta = MATE, curBest = 0, curV = -MATE;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        tryMove(m.mv);
        let v;
        if (fullScores || i === 0) v = -search(d - 1, -MATE, fullScores ? MATE : -alpha, true);
        else {
          v = -search(d - 1, -alpha - 1, -alpha, true);
          if (v > alpha && !stopped) v = -search(d - 1, -beta, -alpha, true);
        }
        undoMove();
        if (stopped) break;
        m.v = v;
        if (v > curV) { curV = v; curBest = m.mv; }
        if (v > alpha) alpha = v;
      }
      if (stopped && !curBest) break;
      if (curBest) {
        best = curBest; bestV = curV; doneDepth = d;
        // 下一轮先搜好的
        moves.sort((a, b) => b.v - a.v);
      }
      if (stopped) break;
      if (bestV > WIN || bestV < -WIN) break; // 已找到杀棋
      if (Date.now() - t0 > timeMs * 0.45) break; // 下一层大概率来不及
    }
    return { best, score: bestV, depth: doneDepth, moves, nodes };
  }

  // —— 开局库（中文记谱 → 坐标，红方文件从右往左 1-9，黑方从右往左 1-9） ——
  const BOOK = [
    // 中炮对屏风马
    [3, '7242 7967 7062 8979 8070 1927 2324 6665'],
    [2, '7242 7967 7062 8979 8070 1927 7076'],
    // 顺炮
    [2, '7242 7747 7062 7967 8070 8988'],
    // 中炮对反宫马 / 左马
    [1, '7242 1927 7062 7967 8070'],
    // 飞相局
    [2, '6042 6665 2324 7967'],
    [1, '6042 1747 1022'],
    // 仙人指路
    [2, '2324 6665 7062 7967'],
    [1, '2324 1727 7062'],
    // 起马局
    [1, '7062 6665 2324 7967'],
    // 过宫炮、士角炮等对黑方的常见应法
    [1, '1242 1927 1022 7967'],
    [1, '7252 7967 7062'],
  ].map(([w, s]) => [w, s.split(' ').map(x => { const a = x.split('').map(Number); return sqOf(a[0], a[1]) | (sqOf(a[2], a[3]) << 8); })]);
  function bookMove(hist) {
    const cands = new Map();
    for (const [w, line] of BOOK) {
      if (line.length <= hist.length) continue;
      let ok = true;
      for (let i = 0; i < hist.length; i++) if (line[i] !== hist[i]) { ok = false; break; }
      if (ok) cands.set(line[hist.length], (cands.get(line[hist.length]) || 0) + w);
    }
    if (!cands.size) return 0;
    const legal = new Set(legalMoves());
    let tot = 0; for (const [m, w] of cands) if (legal.has(m)) tot += w;
    let r = Math.random() * tot;
    for (const [m, w] of cands) { if (!legal.has(m)) continue; r -= w; if (r <= 0) return m; }
    return 0;
  }

  // —— 对外接口 ——
  const toCoord = mv => ({ from: [FILE(mv & 255), RANK(mv & 255)], to: [FILE(mv >> 8), RANK(mv >> 8)] });
  const fromCoord = m => sqOf(m.from[0], m.from[1]) | (sqOf(m.to[0], m.to[1]) << 8);
  const LEVELS = {
    easy: { depth: 2, time: 600, noise: 90, blunder: 0.16, book: false },
    mid: { depth: 4, time: 1500, noise: 25, blunder: 0.03, book: true },
    hard: { depth: 40, time: 5000, noise: 0, blunder: 0, book: true },
  };
  function setPosition(moves) {
    reset();
    const hist = [];
    for (const m of moves) { const mv = fromCoord(m); if (!tryMove(mv)) throw new Error('illegal history move'); hist.push(mv); }
    distance = 0;
    return hist;
  }
  function think(moves, level, opts = {}) {
    const L = Object.assign({}, LEVELS[level] || LEVELS.hard, opts);
    const hist = setPosition(moves);
    if (L.book && hist.length < 12) {
      const bm = bookMove(hist);
      if (bm) return { move: toCoord(bm), book: true, depth: 0, score: 0, nodes: 0 };
    }
    const full = L.noise > 0;
    const res = rootSearch(L.depth, L.time, full);
    if (!res.best) return { move: null };
    let pick = res.best;
    if (full && res.moves.length > 1) {
      // 加噪声：分数相近的着法里随机挑，偶尔犯错
      const scored = res.moves.map(m => ({ mv: m.mv, v: m.v + (Math.random() * 2 - 1) * L.noise })).sort((a, b) => b.v - a.v);
      pick = scored[0].mv;
      if (Math.random() < L.blunder) {
        const top = res.moves.slice().sort((a, b) => b.v - a.v).filter(m => m.v > -WIN).slice(1, 6);
        if (top.length) pick = top[Math.floor(Math.random() * top.length)].mv;
      }
      // 能直接杀棋就一定杀
      const mate = res.moves.find(m => m.v > WIN);
      if (mate && level !== 'easy') pick = mate.mv;
    }
    return { move: toCoord(pick), score: res.score, depth: res.depth, nodes: res.nodes };
  }
  // 对局分析（Ham 10-09 22:36）：给一个局面（从开局起已走的着法），算这一方最好的一步和局面分（轮到的一方看，正 = 它占优）。time 毫秒
  function analyzePos(moves, time = 400) {
    setPosition(moves);
    const lm = legalMoves();
    if (!lm.length) return { best: null, score: -MATE, depth: 0, over: true };   // 被将死 / 困毙：这一方输了
    const res = rootSearch(40, time, lm.length === 1);   // 只有一步可走时也要算出分数（不走捷径）
    return { best: res.best ? toCoord(res.best) : null, score: res.score, depth: res.depth };
  }
  // 对局分析 · 详解：同一个局面再细算一遍，给出
  //   best / score：最好的一步和分数；actualScore：实际走的那步的分数（根上每步都按完整窗口算，分数可比）
  //   bestPV：最好的一步往下几步；refute：实际走完以后双方各自最好的应法往下几步；after：实际走完后对方看的分
  //   threat：这一方如果“停一手”，对方最想走什么（= 对方已经在威胁什么）；被将军时没有
  //   往下的每一步都是在那个局面上重新搜一遍得到的（不顺着置换表捡——表里深处的记录可能是别的分支留下的，会编出不存在的丢子）
  function lineSearch(moves, first, n, per) {
    const seq = moves.slice(), out = [], scores = [];
    if (first) { seq.push(first); out.push(first); }
    while (out.length < n) {
      setPosition(seq); if (!legalMoves().length) break;
      const r = rootSearch(40, per, false); if (!r.best) break;
      const m = toCoord(r.best); seq.push(m); out.push(m); scores.push(r.score);
    }
    return { line: out, scores };
  }
  function explainPos(moves, actual, time = 1200) {
    setPosition(moves);
    if (!legalMoves().length) return { over: true };
    const res = rootSearch(40, time, true);
    const am = actual ? fromCoord(actual) : 0, ent = res.moves.find(m => m.mv === am);
    const per = Math.round(time * 0.13);
    const out = { best: res.best ? toCoord(res.best) : null, score: res.score, depth: res.depth, actualScore: ent ? ent.v : null,
      bestPV: res.best ? lineSearch(moves, toCoord(res.best), 7, per).line : [], alts: res.moves.slice(0, 4).map(m => ({ mv: toCoord(m.mv), v: m.v })) };
    if (am) { const L = lineSearch(moves, actual, 7, per); out.refute = L.line.slice(1); out.after = L.scores.length ? L.scores[0] : -MATE; }
    setPosition(moves);
    if (!checked(sd)) {
      nullMove();
      const r3 = rootSearch(40, Math.round(time * 0.35), true);
      if (r3.best) out.threat = { mv: toCoord(r3.best), score: r3.score };
      undoNull();
    }
    return out;
  }
  // 供测试：perft
  function perft(depth) {
    if (depth === 0) return 1;
    const buf = new Int32Array(160); const n = genMoves(buf, false); let c = 0;
    for (let i = 0; i < n; i++) { if (!tryMove(buf[i])) continue; c += depth === 1 ? 1 : perft(depth - 1); undoMove(); }
    return c;
  }
  return { think, analyzePos, explainPos, setPosition, perft, legalMoves: () => legalMoves().map(toCoord), evaluate, LEVELS, MATE, WIN };
}

// ===== 主线程封装：优先放进 Web Worker，失败则同步计算 =====
const AI = (() => {
  if (typeof window === 'undefined') return null;
  let worker = null, pending = null, seq = 0, local = null;
  function ensure() {
    if (worker || local) return;
    try {
      const src = '(' + XQEngineFactory.toString() + ')';
      const code = `const E = ${src}(); onmessage = e => { const d = e.data; let r; try { r = d.ex ? E.explainPos(d.moves, d.actual, d.time) : d.an ? E.analyzePos(d.moves, d.time) : E.think(d.moves, d.level); } catch (err) { r = { move: null, err: String(err) }; } postMessage({ id: d.id, r }); };`;
      worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      worker.onmessage = e => { if (pending && e.data.id === pending.id) { const p = pending; pending = null; p.res(e.data.r); } };
      worker.onerror = () => { worker = null; local = XQEngineFactory(); if (pending) { const p = pending; pending = null; p.res(local.think(p.moves, p.level, { time: 1500 })); } };
    } catch (e) { worker = null; local = XQEngineFactory(); }
  }
  return {
    warm() { ensure(); },
    think(moves, level) {
      ensure();
      const id = ++seq;
      const ms = moves.map(m => ({ from: m.from, to: m.to }));
      if (!worker) return new Promise(res => setTimeout(() => res(local.think(ms, level, level === 'hard' ? { time: 2000 } : {})), 30));
      return new Promise(res => { pending = { id, res, moves: ms, level }; worker.postMessage({ id, moves: ms, level }); });
    },
    // 对局分析：一个局面的最好一步和局面分（见 analyzePos）。和 think 共用一个工作线程（分析时不会有电脑在想）
    analyzePos(moves, time = 400) {
      ensure();
      const id = ++seq, ms = moves.map(m => ({ from: m.from, to: m.to }));
      if (!worker) return new Promise(res => setTimeout(() => res(local.analyzePos(ms, time)), 0));
      return new Promise(res => { pending = { id, res, moves: ms, level: 'hard' }; worker.postMessage({ id, an: 1, moves: ms, time }); });
    },
    // 对局分析 · 详解（见 explainPos）
    explainPos(moves, actual, time = 1200) {
      ensure();
      const id = ++seq, ms = moves.map(m => ({ from: m.from, to: m.to })), am = actual && { from: actual.from, to: actual.to };
      if (!worker) return new Promise(res => setTimeout(() => res(local.explainPos(ms, am, time)), 0));
      return new Promise(res => { pending = { id, res, moves: ms, level: 'hard' }; worker.postMessage({ id, ex: 1, moves: ms, actual: am, time }); });
    },
    // 取消正在进行的思考：直接终止工作线程，避免占用后续计算
    cancel() { if (pending && worker) { try { worker.terminate(); } catch (e) { } worker = null; } pending = null; },
    get busy() { return !!pending; },
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = { XQEngineFactory };
