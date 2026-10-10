function zmView(st, C) {
  var scr = st.scr, s = st.s, tr = C.TRMAP[scr] || null, T = tr ? C.TR[tr] : null;
  var E = 'cubic-bezier(.65,0,.35,1)', still = s === 0;
  var W = C.W, H = C.H, B = C.B, LW = C.LW, ys = C.RANKS;
  var imgBase = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;';
  var pages = {};
  ['main', 'ai', 'local', 'hall', 'wait'].forEach(function (k) {
    pages[k] = imgBase + 'opacity:' + (k === scr && s === 0 ? 1 : 0) + ';transition:opacity 350ms ease;';
  });
  // 画盘：两颗子各自生出半张盘。时间都从 s2 开始算（毫秒）
  var SP = C.SPEED;                 // 竖线生长速度：像素 / 毫秒
  var x0 = B[0], x8 = B[0] + B[2], dx = B[2] / 8, cx = (x0 + x8) / 2;
  var riverMid = (ys[4] + ys[5]) / 2;
  var drawn = s === 2, gone = s >= 3;
  var lines = [];
  function seg(css, from, to, delay, dur, ease) {
    var o = drawn ? 1 : 0;
    var tf = drawn ? to : from;
    var t = still ? 'none' : 'transform ' + dur + 'ms ' + ease + ' ' + delay + 'ms,opacity ' + (gone ? '450ms ease' : '80ms linear ' + delay + 'ms');
    lines.push({ style: 'position:absolute;background:#f0e7d2;pointer-events:none;' + css + 'transform:' + tf + ';opacity:' + o + ';transition:' + t + ';' });
  }
  var V0 = 200;                     // 竖线开始生长
  function rankDelay(k) { return k === 0 ? 0 : V0 + (ys[k] - ys[0]) / SP; }
  if (T) {
    for (var r = 0; r < 10; r++) {
      var k = r <= 4 ? r : 9 - r;   // 离自家底线第几行
      var d = r <= 4 ? rankDelay(r) : V0 + (ys[9] - ys[r]) / SP;
      if (k === 0) d = 0;
      seg('left:' + x0 + 'px;top:' + (ys[r] - LW / 2) + 'px;width:' + B[2] + 'px;height:' + LW + 'px;transform-origin:50% 50%;', 'scaleX(0)', 'scaleX(1)', Math.round(d), k === 0 ? 320 : 300, 'cubic-bezier(.2,.7,.3,1)');
    }
    for (var f = 0; f < 9; f++) {
      var x = x0 + f * dx - LW / 2, edge = f === 0 || f === 8;
      var topEnd = edge ? riverMid : ys[4], botEnd = edge ? riverMid : ys[5];
      seg('left:' + x + 'px;top:' + ys[0] + 'px;width:' + LW + 'px;height:' + (topEnd - ys[0]) + 'px;transform-origin:50% 0;', 'scaleY(0)', 'scaleY(1)', V0, Math.round((topEnd - ys[0]) / SP), 'linear');
      seg('left:' + x + 'px;top:' + botEnd + 'px;width:' + LW + 'px;height:' + (ys[9] - botEnd) + 'px;transform-origin:50% 100%;', 'scaleY(0)', 'scaleY(1)', V0, Math.round((ys[9] - botEnd) / SP), 'linear');
    }
    // 九宫斜线：从九宫中心往四角画
    [[ys[1], ys[0], ys[2]], [ys[8], ys[7], ys[9]]].forEach(function (pal) {
      var pcx = cx, pcy = pal[0];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
        var ex = cx + q[0] * dx, ey = q[1] < 0 ? pal[1] : pal[2];
        var len = Math.hypot(ex - pcx, ey - pcy), ang = Math.atan2(ey - pcy, ex - pcx) * 180 / Math.PI;
        seg('left:' + pcx + 'px;top:' + (pcy - LW / 2) + 'px;width:' + len + 'px;height:' + LW + 'px;transform-origin:0 50%;', 'rotate(' + ang + 'deg) scaleX(0)', 'rotate(' + ang + 'deg) scaleX(1)', 120, 320, 'cubic-bezier(.2,.7,.3,1)');
      });
    });
  }
  var meet = V0 + (riverMid - ys[0]) / SP;           // 两边的边线在河界会合
  var river = (C.RIVER || []).map(function (c) {
    return { tx: c[0], style: 'position:absolute;left:' + c[1] + 'px;top:' + riverMid + 'px;transform:translate(-50%,-50%);font-family:\'Noto Serif SC\',serif;font-weight:900;font-size:' + C.RFS + 'px;color:#f0e7d2;pointer-events:none;opacity:' + (drawn ? 1 : 0) + ';transition:' + (still ? 'none' : 'opacity ' + (gone ? 450 : 350) + 'ms ease ' + (drawn ? Math.round(meet) : 0) + 'ms') + ';' };
  });
  var fly = (T ? T.p : []).map(function (p) {
    var end = s >= 1, P = C.PIECE[p.to], tgt = p.to === 'K' ? C.K : C.J, D = C.D;
    var x = end ? tgt[0] : p.r[0] + p.r[2] / 2, y = end ? tgt[1] : p.r[1] + p.r[3] / 2;
    var w = end ? D : p.r[2], h = end ? D : p.r[3];
    var bg = end ? P.bg : p.bg, bd = end ? P.bd : p.bd;
    var o = (s === 1 || s === 2) ? 1 : 0, bw = end ? C.PBW : 3;
    var rad = p.round ? '50%' : (end ? D / 2 : 0) + 'px';
    var t = still ? 'none' : 'left 600ms ' + E + ',top 600ms ' + E + ',width 600ms ' + E + ',height 600ms ' + E + ',border-radius 600ms ' + E + ',background-color 160ms ease 480ms,border-color 160ms ease 480ms,opacity ' + (s >= 3 ? 500 : 200) + 'ms ease';
    var span = 'position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;';
    return {
      a: p.tx, b: P.tx,
      style: 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;transform:translate(-50%,-50%);box-sizing:border-box;border-radius:' + rad + ';background:' + bg + ';border:' + bw + 'px solid ' + bd + ';font-family:\'Noto Serif SC\',serif;font-weight:900;overflow:hidden;opacity:' + o + ';pointer-events:none;transition:' + t + ';',
      aStyle: span + 'color:' + p.fg + ';font-size:' + p.fs + 'px;letter-spacing:' + (p.ls || 0) + 'px;padding-bottom:' + (p.pb || 0) + 'px;opacity:' + (end ? 0 : 1) + ';transition:' + (still ? 'none' : 'opacity 160ms ease') + ';',
      bStyle: span + 'color:' + P.fg + ';font-size:' + C.PFS + 'px;opacity:' + (end ? 1 : 0) + ';transition:' + (still ? 'none' : 'opacity 160ms ease ' + (end ? 480 : 0) + 'ms') + ';'
    };
  });
  var top = imgBase + 'opacity:' + (s >= 3 ? 1 : 0) + ';transition:' + (still ? 'none' : 'opacity 700ms ease') + ';';
  var endS = imgBase + 'opacity:' + (s >= 4 ? 1 : 0) + ';transform:scale(' + (s >= 4 ? 1 : 1.08) + ');transform-origin:50% 42%;transition:' + (still ? 'none' : 'opacity 1100ms ease,transform 1400ms cubic-bezier(.2,.7,.2,1)') + ';';
  var hots = s === 0 ? C.HOTS[scr].map(function (h) {
    return { h: h, label: h.label, cls: 'zm-hot' + (h.hint ? ' hint' : ''), style: 'left:' + h.r[0] + 'px;top:' + h.r[1] + 'px;width:' + h.r[2] + 'px;height:' + h.r[3] + 'px;border-radius:' + (h.round ? '50%' : '0') + ';' };
  }) : [];
  return { pages: pages, lines: lines, river: river, fly: fly, top: top, end: endS, hots: hots, playing: s >= 1 && s <= 3, done: s === 4, drawEnd: Math.round(meet + 350) };
}
