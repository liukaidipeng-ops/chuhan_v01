// 落子入局（美术总监 V1，Ham 10-10 审画布「一张盘」后点头）
// 点「开战 / 开始」或房间开局时：页面淡出，两颗子沿直线飞到帥位、將位并翻面，
// 两颗子各自生出半张盘（九宫 → 底线 → 竖线往河界长、横线跟着画开），两边边线在河界会合，「楚河 漢界」淡出，
// 然后朱底淡出，露出下面已经摆好的对局（镜头先放在正上方「定盘」视角，格线正好对上），调用方再把镜头抬回去。
//
// 用法（只依赖 DOM，不碰 three.js）：
//   await LuoZi.play({
//     pieces: [{ el: 按钮元素, to: 'K' }, { el: 难度按钮, to: 'J' }],   // to：K = 帥位（自己这边，屏幕下方），J = 將位
//                                                                      // 没有元素时给 rect：{ rect: {x, y, w, h}, round: true, text: '將' }
//     grid: () => ({ xs: [9 个 x], ys: [10 个 y] }),   // 正上方视角下 9 条竖线、10 条横线在屏幕上的像素位置；ys[0] 是屏幕最上面那条
//     ready: async () => {},                            // 可选：画盘开始时调用（这时候朱底已经盖满，可以在下面开局、把镜头切到正上方）
//     side: 'r',                                        // 自己执哪方：'r' 下方是帥（朱）、上方是將（墨）；'b' 反过来
//   });
//   // 返回时朱底已经淡出、遮罩已移除；调用方接着把镜头从正上方抬回原来的视角。
// 点一下遮罩任意处 = 跳过（直接淡出）。系统开了「减少动态效果」时不播，直接调用 ready 再返回。
const LuoZi = (() => {
  const E = 'cubic-bezier(.65,0,.35,1)', GROW = 'cubic-bezier(.2,.7,.3,1)';
  const css = (v, d) => (getComputedStyle(document.documentElement).getPropertyValue(v) || '').trim() || d;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function play(opt) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { if (opt.ready) await opt.ready(); return; }
    const G = css('--g', '#a8281c'), C = css('--c', '#f0e7d2'), K = css('--k', '#141311');
    const fontD = css('--ef', "'Noto Serif SC',serif");
    const narrow = innerWidth <= 640, LW = narrow ? 1.5 : 2;

    // 遮罩：朱底，先透明，跟页面一起淡入（页面本身也是朱底，看起来是页面上的字和格子退场）
    const ov = document.createElement('div');
    ov.setAttribute('aria-hidden', 'true');
    Object.assign(ov.style, { position: 'fixed', inset: '0', zIndex: 2147483000, background: G, opacity: '0', cursor: 'pointer', overflow: 'hidden' });
    const tip = document.createElement('div');
    tip.textContent = '点一下跳过';
    Object.assign(tip.style, { position: 'absolute', right: '20px', bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', font: '13px system-ui,sans-serif', letterSpacing: '3px', color: C, opacity: '.7' });
    ov.appendChild(tip);
    document.body.appendChild(ov);
    let skipped = false;
    const anims = [];
    const anim = (el, kf, o) => { const a = el.animate(kf, { fill: 'both', ...o }); anims.push(a); return a; };
    ov.addEventListener('pointerdown', () => { skipped = true; anims.forEach(a => { try { a.finish(); } catch (e) { } }); }, { once: true });

    // 子：从按钮当前位置、当前样子起飞
    const flies = (opt.pieces || []).map(p => {
      let r, round = !!p.round, bg = C, fg = K, bd = C, text = p.text || '', fs = 0;
      if (p.el) {
        const b = p.el.getBoundingClientRect(), cs = getComputedStyle(p.el);
        r = { x: b.left, y: b.top, w: b.width, h: b.height };
        round = p.round != null ? p.round : parseFloat(cs.borderTopLeftRadius) >= Math.min(b.width, b.height) / 2 - 1;
        bg = cs.backgroundColor; fg = cs.color; bd = cs.borderTopColor;
        if (!text) text = (p.el.querySelector('b,.rk') || p.el).textContent.trim();
        fs = parseFloat(getComputedStyle(p.el.querySelector('b,.rk') || p.el).fontSize);
      } else r = p.rect;
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'absolute', left: r.x + r.w / 2 + 'px', top: r.y + r.h / 2 + 'px', width: r.w + 'px', height: r.h + 'px', transform: 'translate(-50%,-50%)', boxSizing: 'border-box',
        borderRadius: round ? '50%' : '0', background: bg, border: '3px solid ' + bd, fontFamily: fontD, fontWeight: 900, overflow: 'hidden', pointerEvents: 'none' });
      const a = document.createElement('span'), b2 = document.createElement('span');
      for (const s of [a, b2]) Object.assign(s.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' });
      a.textContent = text; Object.assign(a.style, { color: fg, fontSize: (fs || Math.min(r.w, r.h) * 0.3) + 'px' });
      const mine = p.to === 'K', redHere = (opt.side || 'r') === 'r' ? mine : !mine;
      b2.textContent = redHere ? '帥' : '將'; b2.style.opacity = '0';
      d.append(a, b2); ov.appendChild(d);
      return { d, a, b: b2, r, round, to: p.to, bg, bd, red: redHere };
    });

    // 1. 落子（0.6 秒）
    anim(ov, [{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease' });
    let g = opt.grid();
    const place = () => {
      const dx = (g.xs[8] - g.xs[0]) / 8, D = Math.round(dx * 0.9);
      for (const f of flies) {
        const tx = g.xs[4], ty = f.to === 'K' ? g.ys[9] : g.ys[0], red = f.red;
        anim(f.d, [{ left: f.r.x + f.r.w / 2 + 'px', top: f.r.y + f.r.h / 2 + 'px', width: f.r.w + 'px', height: f.r.h + 'px', borderRadius: f.round ? '50%' : '0px' },
                   { left: tx + 'px', top: ty + 'px', width: D + 'px', height: D + 'px', borderRadius: f.round ? '50%' : D / 2 + 'px' }], { duration: 600, easing: E });
        anim(f.d, [{ backgroundColor: f.bg, borderColor: f.bd, borderWidth: '3px' }, { backgroundColor: C, borderColor: red ? G : K, borderWidth: (narrow ? 2 : 3) + 'px' }], { duration: 160, delay: 480, easing: 'ease' });
        anim(f.a, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease' });
        Object.assign(f.b.style, { color: red ? G : K, fontSize: Math.round(D * 0.47) + 'px' });
        anim(f.b, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 480, easing: 'ease' });
      }
    };
    place();
    await wait(skipped ? 0 : 650);

    // 2. 画盘（约 1.75 秒）：这时朱底已盖满，调用方可以在下面开局、把镜头放到正上方
    if (opt.ready) await opt.ready();
    g = opt.grid();
    const xs = g.xs, ys = g.ys, x0 = xs[0], x8 = xs[8], dx = (x8 - x0) / 8, cx = xs[4];
    const SP = (ys[4] - ys[0]) / 810;                 // 竖线从底线长到河岸用约 0.8 秒
    const V0 = 200, riverMid = (ys[4] + ys[5]) / 2, lines = [];
    const seg = (st, from, to, delay, dur, ease) => {
      const l = document.createElement('div');
      Object.assign(l.style, { position: 'absolute', background: C, pointerEvents: 'none', ...st });
      ov.insertBefore(l, ov.firstChild); lines.push(l);
      anim(l, [{ transform: from }, { transform: to }], { duration: dur, delay, easing: ease });
    };
    for (let r = 0; r < 10; r++) {
      const k = r <= 4 ? r : 9 - r, dist = r <= 4 ? ys[r] - ys[0] : ys[9] - ys[r];
      seg({ left: x0 + 'px', top: ys[r] - LW / 2 + 'px', width: x8 - x0 + 'px', height: LW + 'px', transformOrigin: '50% 50%' }, 'scaleX(0)', 'scaleX(1)', k === 0 ? 0 : Math.round(V0 + dist / SP), k === 0 ? 320 : 300, GROW);
    }
    for (let f = 0; f < 9; f++) {
      const x = xs[f] - LW / 2, edge = f === 0 || f === 8, te = edge ? riverMid : ys[4], be = edge ? riverMid : ys[5];
      seg({ left: x + 'px', top: ys[0] + 'px', width: LW + 'px', height: te - ys[0] + 'px', transformOrigin: '50% 0' }, 'scaleY(0)', 'scaleY(1)', V0, Math.round((te - ys[0]) / SP), 'linear');
      seg({ left: x + 'px', top: be + 'px', width: LW + 'px', height: ys[9] - be + 'px', transformOrigin: '50% 100%' }, 'scaleY(0)', 'scaleY(1)', V0, Math.round((ys[9] - be) / SP), 'linear');
    }
    for (const [pc, ea, eb] of [[ys[1], ys[0], ys[2]], [ys[8], ys[7], ys[9]]])        // 九宫斜线：从九宫中心往四角画
      for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const ex = cx + qx * dx, ey = qy < 0 ? ea : eb, len = Math.hypot(ex - cx, ey - pc), ang = Math.atan2(ey - pc, ex - cx) * 180 / Math.PI;
        seg({ left: cx + 'px', top: pc - LW / 2 + 'px', width: len + 'px', height: LW + 'px', transformOrigin: '0 50%' }, `rotate(${ang}deg) scaleX(0)`, `rotate(${ang}deg) scaleX(1)`, 120, 320, GROW);
      }
    const meet = V0 + (riverMid - ys[0]) / SP;
    const rf = Math.round(dx * 0.42);
    for (const [ch, f] of [['楚', 1.25], ['河', 2.5], ['漢', 5.5], ['界', 6.75]]) {
      const t = document.createElement('div'); t.textContent = ch;
      Object.assign(t.style, { position: 'absolute', left: x0 + f * dx + 'px', top: riverMid + 'px', transform: 'translate(-50%,-50%)', font: `900 ${rf}px ${fontD}`, color: C, pointerEvents: 'none' });
      ov.insertBefore(t, ov.firstChild);
      anim(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay: Math.round(meet), easing: 'ease' });
    }
    await wait(skipped ? 0 : Math.round(meet + 350 + 150));

    // 3. 朱底淡出，露出对局；之后由调用方抬镜头
    tip.remove();
    ov.style.pointerEvents = 'none';
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: skipped ? 250 : 700, easing: 'ease', fill: 'forwards' }).finished;
    ov.remove();
  }
  return { play };
})();
