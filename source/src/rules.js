// ===== 中国象棋规则引擎 =====
// 坐标：f = 列 0..8（红方从左到右），r = 行 0..9（红方底线为 0，黑方底线为 9）
// 红方 = 汉（先行），黑方 = 楚
(function (global) {
  const W = 9, H = 10;
  const TYPES = ['k', 'a', 'e', 'r', 'n', 'c', 'p'];
  const NAMES = {
    r: { k: '帥', a: '仕', e: '相', r: '俥', n: '傌', c: '炮', p: '兵' },
    b: { k: '將', a: '士', e: '象', r: '車', n: '馬', c: '砲', p: '卒' },
  };
  const TYPE_CN = { k: '帅', a: '士', e: '相', r: '车', n: '马', c: '炮', p: '兵' };

  function initialBoard() {
    const b = [];
    for (let r = 0; r < H; r++) b.push(new Array(W).fill(null));
    const back = ['r', 'n', 'e', 'a', 'k', 'a', 'e', 'n', 'r'];
    for (let f = 0; f < W; f++) {
      b[0][f] = { s: 'r', t: back[f] };
      b[9][f] = { s: 'b', t: back[f] };
    }
    b[2][1] = { s: 'r', t: 'c' }; b[2][7] = { s: 'r', t: 'c' };
    b[7][1] = { s: 'b', t: 'c' }; b[7][7] = { s: 'b', t: 'c' };
    for (let f = 0; f < W; f += 2) { b[3][f] = { s: 'r', t: 'p' }; b[6][f] = { s: 'b', t: 'p' }; }
    let id = 0;
    for (let r = 0; r < H; r++) for (let f = 0; f < W; f++) if (b[r][f]) b[r][f].id = id++;
    return b;
  }

  const inBoard = (f, r) => f >= 0 && f < W && r >= 0 && r < H;
  const inPalace = (s, f, r) => f >= 3 && f <= 5 && (s === 'r' ? r <= 2 : r >= 7);
  const ownHalf = (s, r) => (s === 'r' ? r <= 4 : r >= 5);
  const other = s => (s === 'r' ? 'b' : 'r');

  function pseudoMoves(b, f, r) {
    const p = b[r][f];
    if (!p) return [];
    const s = p.s, out = [];
    const add = (tf, tr) => {
      if (!inBoard(tf, tr)) return;
      const q = b[tr][tf];
      if (q && q.s === s) return;
      out.push({ from: [f, r], to: [tf, tr] });
    };
    switch (p.t) {
      case 'k':
        for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
          if (inPalace(s, f + df, r + dr)) add(f + df, r + dr);
        break;
      case 'a':
        for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
          if (inPalace(s, f + df, r + dr)) add(f + df, r + dr);
        break;
      case 'e':
        for (const [df, dr] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
          const tf = f + df, tr = r + dr;
          if (!inBoard(tf, tr) || !ownHalf(s, tr)) continue;
          if (b[r + dr / 2][f + df / 2]) continue; // 塞象眼
          add(tf, tr);
        }
        break;
      case 'n':
        for (const [df, dr, lf, lr] of [
          [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
          [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0]]) {
          if (!inBoard(f + df, r + dr)) continue;
          if (b[r + lr][f + lf]) continue; // 蹩马腿
          add(f + df, r + dr);
        }
        break;
      case 'r':
        for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let tf = f + df, tr = r + dr;
          while (inBoard(tf, tr)) {
            if (b[tr][tf]) { if (b[tr][tf].s !== s) out.push({ from: [f, r], to: [tf, tr] }); break; }
            out.push({ from: [f, r], to: [tf, tr] });
            tf += df; tr += dr;
          }
        }
        break;
      case 'c':
        for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let tf = f + df, tr = r + dr, jumped = false;
          while (inBoard(tf, tr)) {
            const q = b[tr][tf];
            if (!jumped) {
              if (q) jumped = true; else out.push({ from: [f, r], to: [tf, tr] });
            } else if (q) {
              if (q.s !== s) out.push({ from: [f, r], to: [tf, tr] });
              break;
            }
            tf += df; tr += dr;
          }
        }
        break;
      case 'p': {
        const fwd = s === 'r' ? 1 : -1;
        add(f, r + fwd);
        if (!ownHalf(s, r)) { add(f + 1, r); add(f - 1, r); }
        break;
      }
    }
    return out;
  }

  function findKing(b, s) {
    for (let r = 0; r < H; r++) for (let f = 3; f <= 5; f++) {
      const p = b[r][f];
      if (p && p.s === s && p.t === 'k') return [f, r];
    }
    return null;
  }

  // s 方的将是否被攻击（含将帅对面）
  function inCheck(b, s) {
    const k = findKing(b, s);
    if (!k) return true;
    const [kf, kr] = k;
    const o = other(s);
    // 对面笑（飞将）
    const dir = s === 'r' ? 1 : -1;
    for (let r = kr + dir; r >= 0 && r < H; r += dir) {
      const q = b[r][kf];
      if (q) { if (q.s === o && q.t === 'k') return true; break; }
    }
    // 车、炮（直线）
    for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let f = kf + df, r = kr + dr, screens = 0;
      while (inBoard(f, r)) {
        const q = b[r][f];
        if (q) {
          if (screens === 0) {
            if (q.s === o && q.t === 'r') return true;
            screens = 1;
          } else {
            if (q.s === o && q.t === 'c') return true;
            break;
          }
        }
        f += df; r += dr;
      }
    }
    // 马（从马的位置看，马腿在马身旁）
    for (const [df, dr, lf, lr] of [
      [1, 2, 1, 1], [-1, 2, -1, 1], [1, -2, 1, -1], [-1, -2, -1, -1],
      [2, 1, 1, 1], [2, -1, 1, -1], [-2, 1, -1, 1], [-2, -1, -1, -1]]) {
      const f = kf + df, r = kr + dr;
      if (!inBoard(f, r)) continue;
      const q = b[r][f];
      if (q && q.s === o && q.t === 'n' && !b[kr + lr][kf + lf]) return true;
    }
    // 兵卒
    const ofwd = o === 'r' ? 1 : -1; // 对方兵前进方向
    const pr = kr - ofwd;
    if (inBoard(kf, pr)) { const q = b[pr][kf]; if (q && q.s === o && q.t === 'p') return true; }
    for (const df of [1, -1]) {
      if (!inBoard(kf + df, kr)) continue;
      const q = b[kr][kf + df];
      if (q && q.s === o && q.t === 'p' && !ownHalf(o, kr)) return true;
    }
    return false;
  }

  function applyMove(b, m) {
    const [ff, fr] = m.from, [tf, tr] = m.to;
    const captured = b[tr][tf];
    b[tr][tf] = b[fr][ff];
    b[fr][ff] = null;
    return captured;
  }
  function undoMove(b, m, captured) {
    const [ff, fr] = m.from, [tf, tr] = m.to;
    b[fr][ff] = b[tr][tf];
    b[tr][tf] = captured;
  }

  function legalMovesFrom(b, f, r) {
    const p = b[r][f];
    if (!p) return [];
    return pseudoMoves(b, f, r).filter(m => {
      const cap = applyMove(b, m);
      const bad = inCheck(b, p.s);
      undoMove(b, m, cap);
      return !bad;
    });
  }
  function allLegalMoves(b, s) {
    const out = [];
    for (let r = 0; r < H; r++) for (let f = 0; f < W; f++) {
      const p = b[r][f];
      if (p && p.s === s) out.push(...legalMovesFrom(b, f, r));
    }
    return out;
  }

  class Game {
    constructor() { this.reset(); }
    reset() {
      this.board = initialBoard();
      this.turn = 'r';
      this.history = [];
      this.result = null; // {winner, reason}
    }
    clone() {
      const g = new Game();
      g.board = this.board.map(row => row.map(p => (p ? { ...p } : null)));
      g.turn = this.turn; g.history = this.history.slice(); g.result = this.result;
      return g;
    }
    at(f, r) { return inBoard(f, r) ? this.board[r][f] : null; }
    legalFrom(f, r) {
      const p = this.at(f, r);
      if (!p || p.s !== this.turn || this.result) return [];
      return legalMovesFrom(this.board, f, r);
    }
    isLegal(m) {
      return this.legalFrom(m.from[0], m.from[1]).some(x => x.to[0] === m.to[0] && x.to[1] === m.to[1]);
    }
    // 执行走子，返回详细信息供动画使用
    play(m) {
      if (!this.isLegal(m)) return null;
      const piece = { ...this.at(m.from[0], m.from[1]) };
      const captured = applyMove(this.board, m);
      const mover = this.turn;
      this.turn = other(this.turn);
      const check = inCheck(this.board, this.turn);
      const replies = allLegalMoves(this.board, this.turn);
      const info = {
        from: m.from.slice(), to: m.to.slice(), piece,
        captured: captured ? { ...captured } : null,
        check, mover,
        crossesRiver: (m.from[1] <= 4) !== (m.to[1] <= 4),
        ply: this.history.length,
      };
      this.history.push({ from: m.from.slice(), to: m.to.slice(), cap: captured ? { ...captured } : null, pid: piece.id });
      if (replies.length === 0) {
        this.result = { winner: mover, loser: this.turn, reason: check ? 'checkmate' : 'stalemate' };
        info.result = this.result;
      }
      return info;
    }
    // 撤销最后一步，返回撤销的记录（用于倒放动画）
    undo() {
      const h = this.history.pop();
      if (!h) return null;
      const [ff, fr] = h.from, [tf, tr] = h.to;
      this.board[fr][ff] = this.board[tr][tf];
      this.board[tr][tf] = h.cap ? { ...h.cap } : null;
      this.turn = other(this.turn);
      this.result = null;
      return h;
    }
    timeout(side) {
      if (this.result) return null;
      this.result = { winner: other(side), loser: side, reason: 'timeout' };
      return this.result;
    }
    resign(side) {
      if (this.result) return null;
      this.result = { winner: other(side), loser: side, reason: 'resign' };
      return this.result;
    }
    inCheck(s) { return inCheck(this.board, s || this.turn); }
    kingPos(s) { return findKing(this.board, s); }
  }

  const XQ = { Game, W, H, NAMES, TYPE_CN, other, inPalace, allLegalMoves, inCheck, initialBoard };
  if (typeof module !== 'undefined' && module.exports) module.exports = XQ;
  global.XQ = XQ;
})(typeof window !== 'undefined' ? window : globalThis);
