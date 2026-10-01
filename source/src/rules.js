// ===== 中国象棋规则引擎 =====
// 坐标：f = 列 0..8（红方从左到右），r = 行 0..9（红方底线为 0，黑方底线为 9）
// 红方 = 汉（先行），黑方 = 楚
// 揭棋：除将帅外 15 子反扣、随机摆在本方原有子位上；暗子按所在位置的兵种走法走，走动即翻开；
//       翻开的士、象可出九宫、过河；被吃的暗子只有吃子方知道是什么；40 回合无吃子判和；
//       同一子不得连续将军、连续捉同一子超过 6 回合。
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

  // ---------- 揭棋 ----------
  // 每方 15 个暗子位（按行、列顺序），以及各位置原本的兵种
  const JQ_SQ = { r: [], b: [] }, JQ_STD = { r: [], b: [] };
  (() => {
    const b = initialBoard();
    for (let r = 0; r < H; r++) for (let f = 0; f < W; f++) {
      const p = b[r][f];
      if (p && p.t !== 'k') { JQ_SQ[p.s].push([f, r]); JQ_STD[p.s].push(p.t); }
    }
  })();
  const JQ_COUNT = { r: 2, n: 2, e: 2, a: 2, c: 2, p: 5 };
  function rand(n) {
    try { const a = new Uint32Array(1); (global.crypto || require('crypto').webcrypto).getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); }
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const randomLayout = () => ({ r: shuffle(JQ_STD.r), b: shuffle(JQ_STD.b) });
  // layout: { r: [15 个兵种], b: [...] }；为 null 时身份未知（联机：靠双方密钥逐个揭开）
  function jieqiBoard(layout) {
    const b = initialBoard();
    for (const s of ['r', 'b']) JQ_SQ[s].forEach(([f, r], i) => {
      const p = b[r][f];
      p.pt = p.t; p.h = 1; p.j = 1; p.hi = i;
      p.t = layout && layout[s] ? layout[s][i] : '?';
    });
    for (let r = 0; r < H; r++) for (let f = 0; f < W; f++) { const p = b[r][f]; if (p && p.t === 'k') p.j = 1; }
    return b;
  }
  // 子的“走法兵种”：暗子按位置，明子按本身
  const et = p => (p.h ? p.pt : p.t);

  const inBoard = (f, r) => f >= 0 && f < W && r >= 0 && r < H;
  const inPalace = (s, f, r) => f >= 3 && f <= 5 && (s === 'r' ? r <= 2 : r >= 7);
  const ownHalf = (s, r) => (s === 'r' ? r <= 4 : r >= 5);
  const other = s => (s === 'r' ? 'b' : 'r');

  function pseudoMoves(b, f, r) {
    const p = b[r][f];
    if (!p) return [];
    const s = p.s, out = [];
    const free = p.j && !p.h; // 揭棋明子：士象不受九宫、河界限制
    const add = (tf, tr) => {
      if (!inBoard(tf, tr)) return;
      const q = b[tr][tf];
      if (q && q.s === s) return;
      out.push({ from: [f, r], to: [tf, tr] });
    };
    switch (et(p)) {
      case 'k':
        for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
          if (inPalace(s, f + df, r + dr)) add(f + df, r + dr);
        break;
      case 'a':
        for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
          if (free ? inBoard(f + df, r + dr) : inPalace(s, f + df, r + dr)) add(f + df, r + dr);
        break;
      case 'e':
        for (const [df, dr] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
          const tf = f + df, tr = r + dr;
          if (!inBoard(tf, tr) || (!free && !ownHalf(s, tr))) continue;
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
            if (q.s === o && et(q) === 'r') return true;
            screens = 1;
          } else {
            if (q.s === o && et(q) === 'c') return true;
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
      if (q && q.s === o && et(q) === 'n' && !b[kr + lr][kf + lf]) return true;
    }
    // 兵卒
    const ofwd = o === 'r' ? 1 : -1; // 对方兵前进方向
    const pr = kr - ofwd;
    if (inBoard(kf, pr)) { const q = b[pr][kf]; if (q && q.s === o && et(q) === 'p') return true; }
    for (const df of [1, -1]) {
      if (!inBoard(kf + df, kr)) continue;
      const q = b[kr][kf + df];
      if (q && q.s === o && et(q) === 'p' && !ownHalf(o, kr)) return true;
    }
    // 揭棋：翻开的士、象可以过河攻将
    for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const f1 = kf + df, r1 = kr + dr;
      if (!inBoard(f1, r1)) continue;
      const q = b[r1][f1];
      if (q && q.s === o && q.j && !q.h && q.t === 'a') return true;
      const f2 = kf + 2 * df, r2 = kr + 2 * dr;
      if (!q && inBoard(f2, r2)) { const e = b[r2][f2]; if (e && e.s === o && e.j && !e.h && e.t === 'e') return true; }
    }
    return false;
  }

  // s 方哪些子正在将军（用于“长将”限制）
  function checkers(b, s) {
    const k = findKing(b, other(s)); if (!k) return [];
    const out = [];
    for (let r = 0; r < H; r++) for (let f = 0; f < W; f++) {
      const p = b[r][f];
      if (p && p.s === s && pseudoMoves(b, f, r).some(m => m.to[0] === k[0] && m.to[1] === k[1])) out.push(p.id);
    }
    return out;
  }
  // 位于 (f,r) 的子此刻能合法吃到的敌方非将子（用于“长捉”限制）
  function threats(b, f, r) {
    const p = b[r][f]; if (!p) return [];
    return legalMovesFrom(b, f, r).map(m => b[m.to[1]][m.to[0]]).filter(q => q && q.s !== p.s && q.t !== 'k').map(q => q.id);
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
    // opts: { jq: true, layout } —— 揭棋；layout 缺省时暗子身份未知
    constructor(opts) { this.opts = opts && opts.jq ? { jq: true, layout: opts.layout || null } : null; this.reset(); }
    get jq() { return !!this.opts; }
    reset() {
      this.board = this.jq ? jieqiBoard(this.opts.layout) : initialBoard();
      this.turn = 'r';
      this.history = [];
      this.result = null; // {winner, loser, reason}；和棋时 winner 为 null
    }
    clone() {
      const g = new Game(this.opts);
      g.board = this.board.map(row => row.map(p => (p ? { ...p } : null)));
      g.turn = this.turn; g.history = this.history.slice(); g.result = this.result;
      return g;
    }
    at(f, r) { return inBoard(f, r) ? this.board[r][f] : null; }
    legalFrom(f, r) {
      const p = this.at(f, r);
      if (!p || p.s !== this.turn || this.result) return [];
      const ms = legalMovesFrom(this.board, f, r);
      return this.jq ? ms.filter(m => !this.forbidden(m)) : ms;
    }
    isLegal(m) {
      return this.legalFrom(m.from[0], m.from[1]).some(x => x.to[0] === m.to[0] && x.to[1] === m.to[1]);
    }
    // 揭棋：因长将/长捉被禁止的着法（用于提示）
    blockedFrom(f, r) {
      const p = this.at(f, r);
      if (!this.jq || !p || p.s !== this.turn || this.result) return [];
      return legalMovesFrom(this.board, f, r).map(m => ({ ...m, why: this.forbidden(m) })).filter(m => m.why);
    }
    // 揭棋：长将、长捉超过 6 回合的着法禁止。返回 'check' | 'chase' | null
    forbidden(m) {
      if (!this.jq) return null;
      const b = this.board, s = this.turn;
      const pid = b[m.from[1]][m.from[0]].id;
      const mine = [];
      for (let i = this.history.length - 2; i >= 0 && mine.length < 6; i -= 2) mine.push(this.history[i]);
      if (mine.length < 6) return null;
      const longCk = mine.every(h => h.ck && h.ck.length), longCh = mine.every(h => h.pid === pid && h.tg && h.tg.length);
      if (!longCk && !longCh) return null;
      const cap = applyMove(b, m);
      const ck = longCk ? checkers(b, s) : [], tg = longCh ? threats(b, m.to[0], m.to[1]) : [];
      undoMove(b, m, cap);
      for (const id of ck) if (mine.every(h => h.ck && h.ck.includes(id))) return 'check';
      for (const id of tg) if (mine.every(h => h.pid === pid && h.tg && h.tg.includes(id))) return 'chase';
      return null;
    }
    // 自上次吃子以来的步数（半回合）
    quietPlies() { let n = 0; for (let i = this.history.length - 1; i >= 0 && !this.history[i].cap; i--) n++; return n; }
    // 执行走子，返回详细信息供动画使用。揭棋暗子身份未知时需在 m.rv 给出翻开后的兵种
    play(m) {
      if (!this.isLegal(m)) return null;
      const src = this.at(m.from[0], m.from[1]);
      let reveal = null;
      if (src.h) {
        reveal = src.t !== '?' ? src.t : m.rv;
        if (!reveal || !'rnecap'.includes(reveal) || reveal.length !== 1) return null;
      }
      const mt = et(src);
      const before = { ...src };
      const captured = applyMove(this.board, m);
      const moved = this.board[m.to[1]][m.to[0]];
      if (reveal) { moved.t = reveal; moved.h = 0; }
      const mover = this.turn;
      this.turn = other(this.turn);
      const check = inCheck(this.board, this.turn);
      const replies = allLegalMoves(this.board, this.turn);
      const info = {
        from: m.from.slice(), to: m.to.slice(), piece: { ...moved }, mt,
        reveal: reveal ? { t: reveal, pt: before.pt } : null,
        captured: captured ? { ...captured } : null,
        check, mover,
        crossesRiver: (m.from[1] <= 4) !== (m.to[1] <= 4),
        ply: this.history.length,
      };
      const h = { from: m.from.slice(), to: m.to.slice(), cap: captured ? { ...captured } : null, pid: before.id };
      if (reveal) h.rv = reveal;
      if (m.cj != null) h.cj = m.cj;
      if (this.jq) { h.ck = checkers(this.board, mover); h.tg = threats(this.board, m.to[0], m.to[1]); }
      this.history.push(h);
      let legalReplies = replies.length;
      if (this.jq && legalReplies) legalReplies = replies.filter(x => !this.forbidden(x)).length;
      if (legalReplies === 0) {
        this.result = { winner: mover, loser: this.turn, reason: check ? 'checkmate' : 'stalemate' };
        info.result = this.result;
      } else if (this.jq && this.quietPlies() >= 80) {
        this.result = { winner: null, loser: null, reason: 'draw' };
        info.result = this.result;
      }
      return info;
    }
    // 撤销最后一步，返回撤销的记录（用于倒放动画）。揭棋翻开的子撤回后重新扣上（身份已为双方所知）
    undo() {
      const h = this.history.pop();
      if (!h) return null;
      const [ff, fr] = h.from, [tf, tr] = h.to;
      this.board[fr][ff] = this.board[tr][tf];
      if (h.rv) this.board[fr][ff].h = 1;
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

  const XQ = { Game, W, H, NAMES, TYPE_CN, other, inPalace, allLegalMoves, inCheck, initialBoard, JQ_SQ, JQ_STD, JQ_COUNT, randomLayout, jieqiBoard, shuffle, rand, et };
  if (typeof module !== 'undefined' && module.exports) module.exports = XQ;
  global.XQ = XQ;
})(typeof window !== 'undefined' ? window : globalThis);
