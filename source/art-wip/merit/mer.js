// 主将卡军功三个样子（甲 军功条 / 乙 军功印 / 丙 正字计功）+ 加功、花功的动画。
// 用法：MV.mount('A'|'B'|'C'); MV.set(side, v); MV.gain(side, n, why, [x,y]); MV.spend(side, n, why, [x,y]); MV.freeze(ms) 定格（截图用）
window.MV = (() => {
  const MAX = 30, ULT = 20;
  const css = document.createElement('style'); document.head.appendChild(css);
  css.textContent = `
  .pcard .bfm .mer{display:none!important}
  .mv{--gold:#c9a14a;--gold2:#e9c46a;--gold3:#9a7228;--ink:#141311;--paper:#f0e7d2;--ver:#a8281c}
  .pcard .bfm .mv{flex-basis:100%;order:-1}
  .mvfly{position:fixed;z-index:80;pointer-events:none;left:0;top:0;will-change:transform,opacity}
  .mvcoin{width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3c4,#e9c46a 40%,#a87a22 100%);border:1.5px solid #5a3e10;box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .mvcoin::after{content:"";position:absolute;left:6px;top:6px;width:5px;height:5px;border:1.5px solid #5a3e10;background:#f0e7d2}
  .mvlab{font:900 calc(16px * var(--fs,1))/1 var(--ef,serif);letter-spacing:.06em;white-space:nowrap;padding:3px 8px;transform:translate(-50%,-100%)}
  .mvlab.g{background:var(--ink,#141311);color:#f3d27a;box-shadow:0 0 0 1.5px #c9a14a}
  .mvlab.s{background:#a8281c;color:#f0e7d2;box-shadow:0 0 0 1.5px #141311}
  .mvlab small{font:500 .78em var(--es,sans-serif);margin-left:6px;letter-spacing:0;opacity:.9}
  .pcard.mvglow{box-shadow:inset 0 0 0 3px var(--c),inset 0 0 0 5px var(--k),0 0 0 3px #e9c46a,0 0 26px rgba(233,196,106,.85)!important}
  .pcard.mvhurt{box-shadow:inset 0 0 0 3px var(--c),inset 0 0 0 5px var(--k),0 0 0 3px #a8281c,0 0 22px rgba(168,40,28,.6)!important}

  /* 飞的东西（接 art-070：铜钱太廉价，换四种）*/
  .mvglow1{width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:radial-gradient(circle,#fffbe8 0 30%,#ffe08a 55%,rgba(233,180,60,0) 72%);filter:drop-shadow(0 0 6px rgba(255,214,110,.95))}
  .mvtail{width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(circle,rgba(255,240,190,.95),rgba(233,180,60,0) 70%)}
  .mvspark{width:4px;height:12px;margin:-6px 0 0 -2px;border-radius:2px;background:linear-gradient(#fff6d0,#e9b84a)}
  .mvseal1{width:24px;height:24px;margin:-12px 0 0 -12px;background:#a8281c;box-shadow:inset 0 0 0 2px #a8281c,inset 0 0 0 3.5px #f3d27a,0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font:900 15px/1 var(--ef,serif);color:#f3d27a}
  .mvslip{width:12px;height:38px;margin:-19px 0 0 -6px;background:linear-gradient(90deg,#b98b45,#e8c987 35%,#d9b06a 70%,#a87a36);box-shadow:inset 0 0 0 1px #6e4d1c,0 2px 5px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:900 10px/1 var(--ef,serif);color:#1a1714}
  .mvslip::before,.mvslip::after{content:"";position:absolute;left:-1px;right:-1px;height:1.5px;background:#a8281c}
  .mvslip::before{top:6px}.mvslip::after{bottom:6px}
  .mvgold{width:30px;height:30px;margin:-15px 0 0 -15px;display:flex;align-items:center;justify-content:center;font:900 26px/1 var(--ef,serif);background:linear-gradient(#fff6cf,#f0c95a 45%,#b8862a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 1px #6b4a14) drop-shadow(0 0 5px rgba(255,214,110,.95)) drop-shadow(0 0 12px rgba(255,190,70,.6))}
  .mvring{width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;box-shadow:0 0 0 2px #f3d27a}
  /* 甲 · 军功条 */
  .mvA{display:flex;align-items:center;gap:8px;min-width:0}
  .mvA .lab{font:900 calc(12px * var(--fs,1))/1 var(--ef,serif);background:var(--ink);color:var(--paper);padding:3px 5px;letter-spacing:.1em}
  .mvA .num{font:900 calc(24px * var(--fs,1))/1 var(--num,serif);color:var(--ink);min-width:1.4em;text-align:right;font-variant-numeric:tabular-nums;display:inline-block;transform-origin:70% 60%}
  .mvA .num small{font:500 calc(11px * var(--fs,1)) var(--es,sans-serif);color:#5b564c;margin-left:1px}
  .mvA .bar{position:relative;flex:1;height:12px;border:2px solid var(--ink);background:#e2d6ba;min-width:90px}
  .mvA .fill,.mvA .gh,.mvA .sp{position:absolute;left:0;top:0;bottom:0}
  .mvA .fill{background:linear-gradient(#f0cf7c,#c9a14a 55%,#a07426)}
  .mvA .gh{background:#fff6d2;opacity:0}
  .mvA .sp{background:#a8281c;opacity:0}
  .mvA .tk{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(100%/6 - 1.5px),rgba(20,19,17,.55) calc(100%/6 - 1.5px) calc(100%/6))}
  .mvA .mk{position:absolute;top:-6px;bottom:-6px;width:3px;margin-left:-1.5px;background:var(--ver)}
  .mvA .mk em{position:absolute;top:-15px;left:50%;transform:translateX(-50%);font:900 calc(10px * var(--fs,1))/1 var(--es,sans-serif);color:var(--ver);font-style:normal;white-space:nowrap}
  .mvA.ready .mk{box-shadow:0 0 6px 2px rgba(233,196,106,.9)}
  /* 乙 · 军功印 */
  .mvB{display:flex;align-items:center;gap:7px}
  .mvB .mseal{position:relative;width:calc(38px * var(--fs,1));height:calc(38px * var(--fs,1));background:linear-gradient(145deg,#f3d27a,#c9a14a 55%,#94681e);box-shadow:inset 0 0 0 2px #f8e7b0,inset 0 0 0 3.5px #6b4a14,0 0 0 2px var(--ink);display:flex;align-items:center;justify-content:center;transform-origin:50% 60%}
  .mvB .mseal i{font:900 calc(22px * var(--fs,1))/1 var(--num,serif);font-style:normal;color:var(--ink);font-variant-numeric:tabular-nums}
  .mvB .mseal .rp{position:absolute;inset:-2px;box-shadow:0 0 0 2px #e9c46a;opacity:0}
  .mvB .txt{display:flex;flex-direction:column;line-height:1.1}
  .mvB .txt b{font:900 calc(13px * var(--fs,1)) var(--ef,serif);letter-spacing:.2em;color:var(--ink)}
  .mvB .txt small{font:500 calc(11px * var(--fs,1)) var(--es,sans-serif);color:#5b564c}
  .pcard .bfm .mvB{flex-basis:auto;order:-1}
  /* 丙 · 正字计功 */
  .mvC{display:flex;align-items:center;gap:8px}
  .mvC .lab{font:900 calc(12px * var(--fs,1))/1 var(--ef,serif);background:var(--ink);color:var(--paper);padding:3px 5px;letter-spacing:.1em}
  .mvC svg{height:calc(20px * var(--fs,1));overflow:visible}
  .mvC svg path{fill:none;stroke-linecap:round;stroke-linejoin:round}
  .mvC .num{font:900 calc(20px * var(--fs,1))/1 var(--num,serif);color:var(--ink);font-variant-numeric:tabular-nums;display:inline-block;transform-origin:30% 60%}
  .mvC .num small{font:500 calc(11px * var(--fs,1)) var(--es,sans-serif);color:#5b564c;margin-left:1px}
  `;
  let style = 'A';
  const cards = {};
  const now = () => (frozen != null ? frozen : performance.now());
  let frozen = null, anims = [];
  const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3), seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  // —— 正字的五笔（20×20 一格）——
  const ZH = ['M3,3.5 L17,3', 'M10,3.4 L10,17', 'M10,10 L16,10', 'M5,10 L5,17', 'M2,17.2 L18,17'];
  function zhSvg(v, extra = {}) {
    const n = Math.max(v, extra.ghostTo || 0, extra.strikeFrom || 0), G = Math.ceil(Math.max(n, 5) / 5), W = G * 24;
    let s = '';
    for (let k = 0; k < Math.max(n, 1) && k < MAX; k++) {
      const g = Math.floor(k / 5), j = k % 5, d = ZH[j].replace(/(\d+(\.\d+)?),/g, (m, x) => (+x + g * 24) + ',');
      let op = 1, col = '#141311', dash = '';
      if (k >= v && extra.ghostTo && k < extra.ghostTo) { col = '#141311'; const p = extra.ghostP ?? 1; dash = ` stroke-dasharray="20" stroke-dashoffset="${20 * (1 - Math.max(0, Math.min(1, p * (extra.ghostTo - v) - (k - v))))}"`; }
      else if (k >= v) continue;
      s += `<path d="${d}" stroke="${col}" stroke-width="2.6" opacity="${op}"${dash}/>`;
    }
    if (extra.strikeFrom) {   // 花掉的那几笔：朱笔划掉，再淡出
      for (let k = v; k < extra.strikeFrom; k++) {
        const g = Math.floor(k / 5), j = k % 5, d = ZH[j].replace(/(\d+(\.\d+)?),/g, (m, x) => (+x + g * 24) + ',');
        s += `<path d="${d}" stroke="#141311" stroke-width="2.6" opacity="${1 - (extra.fade || 0)}"/>`;
      }
      const g0 = Math.floor(v / 5), g1 = Math.floor((extra.strikeFrom - 1) / 5), x0 = g0 * 24 + (v % 5 ? 1 : 0), x1 = g1 * 24 + 20, p = extra.strikeP ?? 1;
      s += `<path d="M${x0},14 L${x0 + (x1 - x0) * p},6" stroke="#a8281c" stroke-width="3.4" opacity="${1 - (extra.fade || 0)}"/>`;
    }
    return `<svg viewBox="-2 0 ${W} 20" width="${W * 1.0}">${s}</svg>`;
  }
  function build(c) {
    const host = c.card.querySelector('.bfm'); c.el && c.el.remove();
    const el = document.createElement('div'); el.className = 'mv mv' + style; c.el = el;
    if (style === 'A') el.innerHTML = `<span class="lab">军功</span><span class="num"><i>0</i><small>/30</small></span><div class="bar"><div class="fill"></div><div class="gh"></div><div class="sp"></div><div class="tk"></div><div class="mk" style="left:${ULT / MAX * 100}%"><em>兵法 20</em></div></div>`;
    if (style === 'B') el.innerHTML = `<div class="mseal"><i>0</i><div class="rp"></div></div><div class="txt"><b>军功</b><small>满 30</small></div>`;
    if (style === 'C') el.innerHTML = `<span class="lab">军功</span><span class="num"><i>0</i><small>/30</small></span><span class="zh"></span>`;
    host.insertBefore(el, host.firstChild);
    draw(c, {});
  }
  function draw(c, o) {
    const el = c.el, v = o.v ?? c.v;
    const numEl = el.querySelector('i'); numEl.textContent = Math.round(o.shown ?? v);
    const num = style === 'B' ? el.querySelector('.mseal') : el.querySelector('.num');
    num.style.transform = o.scale ? `scale(${o.scale}) rotate(${o.rot || 0}deg)` : '';
    numEl.style.color = o.red ? '#a8281c' : '';
    if (style === 'A') {
      el.querySelector('.fill').style.width = ((o.fill ?? v) / MAX * 100) + '%';
      const gh = el.querySelector('.gh'); gh.style.left = ((o.ghA ?? 0) / MAX * 100) + '%'; gh.style.width = (((o.ghB ?? 0) - (o.ghA ?? 0)) / MAX * 100) + '%'; gh.style.opacity = o.ghO ?? 0;
      const sp = el.querySelector('.sp'); sp.style.left = ((o.spA ?? 0) / MAX * 100) + '%'; sp.style.width = (((o.spB ?? 0) - (o.spA ?? 0)) / MAX * 100) + '%'; sp.style.opacity = o.spO ?? 0; sp.style.transform = `translateY(${o.spY || 0}px)`;
      el.classList.toggle('ready', (o.fill ?? v) >= ULT);
    }
    if (style === 'B') { const rp = el.querySelector('.rp'); rp.style.opacity = o.rpO ?? 0; rp.style.inset = `${-2 - (o.rpR || 0)}px`; el.querySelector('.mseal').style.filter = o.red ? 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(.85)' : ''; }
    if (style === 'C') el.querySelector('.zh').innerHTML = zhSvg(o.zv ?? v, o.zx || {});
  }
  function anchor(c) {   // 加减功的落点：条的末端 / 印 / 最后一笔
    const el = c.el;
    if (style === 'A') { const b = el.querySelector('.bar').getBoundingClientRect(); return [b.left + b.width * Math.min(1, c.v / MAX), b.top + b.height / 2]; }
    if (style === 'B') { const b = el.querySelector('.mseal').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }
    const b = el.querySelector('svg').getBoundingClientRect(), n = Math.max(1, c.v); return [b.left + Math.min(b.width, (Math.floor((n - 1) / 5) * 24 + 12) / ((Math.ceil(Math.max(n, 5) / 5)) * 24) * b.width), b.top + b.height / 2];
  }
  function fly(cls, html) { const d = document.createElement('div'); d.className = 'mvfly ' + cls; d.innerHTML = html || ''; document.body.appendChild(d); return d; }
  function run(dur, fn, done) { const a = { t0: now(), dur, fn, done }; anims.push(a); fn(0); return a; }
  function tick() {
    if (frozen == null) { const t = performance.now(); for (const a of [...anims]) { const k = (t - a.t0) / a.dur; a.fn(Math.min(1, k)); if (k >= 1) { anims.splice(anims.indexOf(a), 1); a.done && a.done(); } } }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  function freeze(ms) { frozen = 1; for (const a of anims) a.fn(Math.min(1, ms / a.dur)); }
  function unfreeze() { frozen = null; }
  const key = side => document.querySelector('.pcard.' + side);
  function mount(st) { style = st; for (const s of ['r', 'b']) { const card = key(s); if (!card) continue; cards[s] = cards[s] || { card, v: 0 }; cards[s].card = card; build(cards[s]); } }
  function set(side, v) { const c = cards[side]; c.v = v; draw(c, {}); }
  function label(side, txt, small, kind, x, y, dir) {
    const d = fly('mvlab ' + kind, `${txt}${small ? `<small>${small}</small>` : ''}`); return d;
  }

  // 四种飞的东西：glow 金光（拖尾）/ seal 「功」字小印 / slip 竹简功牌 / gold 金字「功」；coin 是原来的铜钱
  let tok = 'coin';
  const TK = {
    coin: { cls: 'mvcoin', n: 3, arc: 120 },
    glow: { cls: 'mvglow1', n: 2, arc: 90, tail: 9, spark: 10 },
    seal: { cls: 'mvseal1', html: '功', n: 1, arc: 110, spin: 1, stamp: 1 },
    slip: { cls: 'mvslip', html: '功', n: 2, arc: 130, spin: 2 },
    gold: { cls: 'mvgold', html: '功', n: 2, arc: 120, spark: 6 },
  };
  function token() { const T = TK[tok]; const head = fly(T.cls, T.html); const tail = T.tail ? [...Array(T.tail)].map(() => fly('mvtail')) : []; return { head, tail, T }; }
  function placeTok(o, P, Q, k, arc, sc, op, i) {
    const at = kk => { const x = P[0] + (Q[0] - P[0]) * kk, y = P[1] + (Q[1] - P[1]) * kk - Math.sin(kk * Math.PI) * arc; return [x, y]; };
    const [x, y] = at(k), T = o.T; const rot = T.spin === 1 ? -25 * (1 - k) : T.spin === 2 ? 720 * k + (i || 0) * 30 : 0;
    o.head.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg) scale(${sc})`; o.head.style.opacity = op;
    o.tail.forEach((tl, j) => { const kk = Math.max(0, k - (j + 1) * 0.028); const [tx, ty] = at(kk); tl.style.transform = `translate(${tx}px,${ty}px) scale(${(1 - j / o.tail.length) * sc})`; tl.style.opacity = op * (1 - j / o.tail.length) * (kk > 0 ? 0.9 : 0); });
  }
  function burst(Q, kind) {   // 落点的一下：金星四溅 / 盖印的一圈
    const T = TK[tok]; const els = [];
    if (T.spark) for (let i = 0; i < T.spark; i++) els.push({ e: fly('mvspark'), a: i / T.spark * Math.PI * 2 + Math.random() * 0.4, r: 26 + Math.random() * 16 });
    if (T.stamp || kind === 'ring') els.push({ e: fly('mvring'), ring: 1 });
    run(520, t => els.forEach(o => { if (o.ring) { o.e.style.transform = `translate(${Q[0]}px,${Q[1]}px) scale(${1 + 5 * t})`; o.e.style.opacity = 1 - t; return; }
      const r = o.r * (1 - Math.pow(1 - t, 2)); o.e.style.transform = `translate(${Q[0] + Math.cos(o.a) * r}px,${Q[1] + Math.sin(o.a) * r}px) rotate(${o.a * 180 / Math.PI + 90}deg) scale(${1 - t * 0.6})`; o.e.style.opacity = 1 - t; }), () => els.forEach(o => o.e.remove()));
  }
  function gain(side, n, why, from) {
    const c = cards[side], v0 = c.v, v1 = Math.min(MAX, v0 + n); c.v = v1;
    const a1 = (() => { const k = c.v; c.v = v0; const p = anchor(c); c.v = k; return p; })(), a2 = anchor(c);
    const coins = [...Array(Math.min(n, TK[tok].n))].map(() => token()); let burstDone = false;
    const lab = fly('mvlab g', `+${n} 功<small>${why || ''}</small>`);
    const P = from || [innerWidth / 2, innerHeight / 2];
    return run(1300, t => {
      coins.forEach((cn, i) => { const k = ease(seg(t, i * 0.06, 0.38 + i * 0.06)); placeTok(cn, P, a2, k, TK[tok].arc, 1.25 - 0.45 * k, k >= 1 ? 0 : 1, i); });
      if (!burstDone && t >= 0.38) { burstDone = true; burst(a2); }
      const hit = seg(t, 0.38, 0.62), pop = Math.sin(seg(t, 0.38, 0.6) * Math.PI);
      c.card.classList.toggle('mvglow', t > 0.38 && t < 0.8);
      if (style === 'A') draw(c, { v: v1, shown: v0 + (v1 - v0) * ease(hit), scale: 1 + 0.45 * pop, fill: v0 + (v1 - v0) * ease(hit), ghA: v0, ghB: v1, ghO: t > 0.38 ? 1 - seg(t, 0.55, 0.95) : 0 });
      if (style === 'B') draw(c, { v: v1, shown: t > 0.45 ? v1 : v0, scale: 1 + 0.38 * pop - 0.1 * Math.sin(seg(t, 0.6, 0.75) * Math.PI), rot: -6 * pop, rpO: t > 0.4 ? 1 - seg(t, 0.4, 0.95) : 0, rpR: 14 * seg(t, 0.4, 0.95) });
      if (style === 'C') draw(c, { v: v1, shown: v0 + (v1 - v0) * ease(hit), scale: 1 + 0.4 * pop, zv: v0, zx: { ghostTo: v1, ghostP: seg(t, 0.38, 0.78) } });
      const lk = seg(t, 0.4, 1); lab.style.transform = `translate(${a2[0]}px,${a2[1] - 16 - 34 * ease(lk)}px) translate(-50%,-100%)`; lab.style.opacity = t < 0.4 ? 0 : 1 - seg(t, 0.82, 1);
    }, () => { coins.forEach(x => { x.head.remove(); x.tail.forEach(e => e.remove()); }); lab.remove(); c.card.classList.remove('mvglow'); draw(c, {}); });
  }
  function spend(side, n, why, to) {
    const c = cards[side], v0 = c.v, v1 = Math.max(0, v0 - n); const a0 = anchor(c); c.v = v1; const a1 = anchor(c);
    const coins = [...Array(Math.min(n, TK[tok].n + 1))].map(() => token()); let burstDone = false;
    const lab = fly('mvlab s', `−${n} 功<small>${why || ''}</small>`);
    const T = to || [innerWidth / 2, innerHeight / 2];
    return run(1400, t => {
      const k0 = seg(t, 0.12, 0.45);
      c.card.classList.toggle('mvhurt', t > 0.05 && t < 0.5);
      if (style === 'A') draw(c, { v: v1, shown: v0 - (v0 - v1) * ease(k0), red: t < 0.6, scale: 1 + 0.25 * Math.sin(seg(t, 0, 0.3) * Math.PI), fill: v1, spA: v1, spB: v0, spO: t < 0.12 ? seg(t, 0, 0.06) : 1 - seg(t, 0.35, 0.8), spY: 10 * ease(seg(t, 0.3, 0.8)) });
      if (style === 'B') draw(c, { v: v1, shown: t > 0.25 ? v1 : v0, red: t < 0.5, scale: 1, rot: t < 0.4 ? Math.sin(t * 60) * 7 * (1 - t / 0.4) : 0 });
      if (style === 'C') draw(c, { v: v1, shown: v0 - (v0 - v1) * ease(k0), red: t < 0.6, zv: v1, zx: { strikeFrom: v0, strikeP: seg(t, 0.02, 0.3), fade: seg(t, 0.45, 0.85) } });
      coins.forEach((cn, i) => { const k = ease(seg(t, 0.1 + i * 0.05, 0.6 + i * 0.05)); placeTok(cn, a0, T, k, TK[tok].arc * 0.75, 0.9 + 0.3 * k, t < 0.1 + i * 0.05 || k >= 1 ? 0 : 1, i); });
      if (!burstDone && t >= 0.62) { burstDone = true; burst(T); }
      const lk = seg(t, 0.05, 0.9); lab.style.transform = `translate(${a0[0]}px,${a0[1] - 50 + 30 * ease(lk)}px) translate(-50%,-100%)`; lab.style.opacity = 1 - seg(t, 0.75, 1);
    }, () => { coins.forEach(x => { x.head.remove(); x.tail.forEach(e => e.remove()); }); lab.remove(); c.card.classList.remove('mvhurt'); draw(c, {}); });
  }
  return { mount, set, gain, spend, freeze, unfreeze, cards, get style() { return style; }, get tok() { return tok; }, set tok(v) { tok = TK[v] ? v : 'coin'; }, TK };
})();
