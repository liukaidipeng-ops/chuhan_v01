// 主将卡上的军功印：加功、花功的动画（美术管；Ham 10-10 选「乙 · 军功印」+「甲 · 金光」，审批台 art-070）
//   样子在 template.html 的 .pcard .bfm .mer（金色方印，数字写在印上，旁边「军功 / 满 30」）
//   加功：一团金光拖着尾巴从来处飞进印里，落下时金星四溅；印像盖章一样一顿、荡开一圈金光；卡片闪一圈金边；数字跳到新值；印上方飘「+n 功 · 原因」
//   花功：印抖一下、变红，金光从印里飞向花到的地方（升级的子 / 兵法签）；卡片闪一圈朱红；飘「−n 功 · 原因」
// 用法（TD 接）：
//   Merit.gain(side, n, why, from, v1)   side 'r'|'b'；from = [x, y] 屏幕坐标、DOM 元素，或 null（从顶上状态条飞来，如每回合进账）；v1 = 加完以后的军功（可省，省了就读印上现在的数）
//   Merit.spend(side, n, why, to, v1)    to 同上；v1 = 花完以后的军功
//   Merit.at(f, r)                       棋盘上第 f 列第 r 行在屏幕上的位置（给 from / to 用）
const Merit = (() => {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now = () => performance.now();
  const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  // ---- 极简动画循环：有动画才跑 ----
  const anims = []; let raf = 0;
  function loop() {
    const t = now();
    for (const a of [...anims]) { const k = (t - a.t0) / a.dur; a.fn(Math.min(1, k)); if (k >= 1) { anims.splice(anims.indexOf(a), 1); a.done && a.done(); } }
    raf = anims.length ? requestAnimationFrame(loop) : 0;
  }
  function run(dur, fn, done) { anims.push({ t0: now(), dur, fn, done }); fn(0); if (!raf) raf = requestAnimationFrame(loop); }
  // ---- 卡片上的印 ----
  const card = s => document.querySelector('.pcard.' + s);
  const parts = s => { const c = card(s); const m = c && c.querySelector('.bfm .mer'); return m && { c, m, seal: m.querySelector('.mseal'), num: m.querySelector('.mseal i'), rp: m.querySelector('.mseal .rp') }; };
  const center = el => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
  const pt = (x, fb) => Array.isArray(x) ? x : x && x.getBoundingClientRect ? center(x) : fb();
  const statusPt = () => { const st = document.getElementById('status'); return st && st.offsetParent ? center(st) : [innerWidth / 2, innerHeight * 0.3]; };
  function at(f, r) {
    const p = Board.pos(f, r), v = new THREE.Vector3(p.x, Board.TOP + 0.2, p.z).project(Core.camera), c = Core.renderer.domElement.getBoundingClientRect();
    return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height];
  }
  function show(P, o) {   // 画印：数字、缩放、转、外圈、变红
    P.num.textContent = o.shown;
    P.seal.style.transform = o.scale ? `scale(${o.scale}) rotate(${o.rot || 0}deg)` : '';
    P.seal.classList.toggle('red', !!o.red);
    if (P.rp) { P.rp.style.opacity = o.rpO || 0; P.rp.style.inset = `${-2 - (o.rpR || 0)}px`; }
  }
  // ---- 飞的金光：头 + 九节拖尾；落点四溅的金星 ----
  const fly = cls => { const d = document.createElement('div'); d.className = 'mfly ' + cls; document.body.appendChild(d); return d; };
  function glow() { return { head: fly('mglow'), tail: [...Array(9)].map(() => fly('mtail')) }; }
  function place(g, A, B, k, arc, sc, op) {
    const at = kk => [A[0] + (B[0] - A[0]) * kk, A[1] + (B[1] - A[1]) * kk - Math.sin(kk * Math.PI) * arc];
    const [x, y] = at(k); g.head.style.transform = `translate(${x}px,${y}px) scale(${sc})`; g.head.style.opacity = op;
    g.tail.forEach((e, j) => { const kk = Math.max(0, k - (j + 1) * 0.028), [tx, ty] = at(kk); e.style.transform = `translate(${tx}px,${ty}px) scale(${(1 - j / 9) * sc})`; e.style.opacity = op * (1 - j / 9) * (kk > 0 ? 0.9 : 0); });
  }
  const drop = g => { g.head.remove(); g.tail.forEach(e => e.remove()); };
  function burst(Q) {
    const sp = [...Array(10)].map((_, i) => ({ e: fly('mspark'), a: i / 10 * Math.PI * 2 + Math.random() * 0.4, r: 26 + Math.random() * 16 }));
    run(520, t => sp.forEach(o => { const r = 8 + (o.r - 8) * (1 - Math.pow(1 - t, 2)); o.e.style.transform = `translate(${Q[0] + Math.cos(o.a) * r}px,${Q[1] + Math.sin(o.a) * r}px) rotate(${o.a * 180 / Math.PI + 90}deg) scale(${1 - t * 0.6})`; o.e.style.opacity = 1 - t; }), () => sp.forEach(o => o.e.remove()));
  }
  function label(txt, why, kind) { const d = fly('mlab ' + kind); d.innerHTML = txt + (why ? `<small>${why}</small>` : ''); return d; }
  // ---- 加功 ----
  function gain(side, n, why, from, v1) {
    const P = parts(side); if (!P || !n) return;
    const cap = (window.BF && BF.CFG && BF.CFG.merit && BF.CFG.merit.cap) || 30;
    v1 = v1 ?? +P.num.textContent; const v0 = Math.max(0, v1 - n);
    if (reduce()) { show(P, { shown: v1 }); return; }
    const A = pt(from, statusPt), B = center(P.seal);
    const gs = [...Array(Math.min(n, 2))].map(glow); let hit = false;
    const lab = label(`+${n} 功`, why, 'g');
    run(1300, t => {
      gs.forEach((g, i) => { const k = ease(seg(t, i * 0.06, 0.38 + i * 0.06)); place(g, A, B, k, 90, 1.25 - 0.45 * k, k >= 1 ? 0 : 1); });
      if (!hit && t >= 0.38) { hit = true; burst(B); }
      const pop = Math.sin(seg(t, 0.38, 0.6) * Math.PI);
      P.c.classList.toggle('mglowc', t > 0.38 && t < 0.8);
      show(P, { shown: t > 0.45 ? Math.min(cap, v1) : v0, scale: 1 + 0.38 * pop - 0.1 * Math.sin(seg(t, 0.6, 0.75) * Math.PI), rot: -6 * pop, rpO: t > 0.4 ? 1 - seg(t, 0.4, 0.95) : 0, rpR: 14 * seg(t, 0.4, 0.95) });
      const lk = seg(t, 0.4, 1); lab.style.transform = `translate(${B[0]}px,${B[1] - 16 - 34 * ease(lk)}px) translate(-50%,-100%)`; lab.style.opacity = t < 0.4 ? 0 : 1 - seg(t, 0.82, 1);
    }, () => { gs.forEach(drop); lab.remove(); P.c.classList.remove('mglowc'); show(P, { shown: v1 }); });
  }
  // ---- 花功 ----
  function spend(side, n, why, to, v1) {
    const P = parts(side); if (!P || !n) return;
    v1 = v1 ?? +P.num.textContent; const v0 = v1 + n;
    if (reduce()) { show(P, { shown: v1 }); return; }
    const A = center(P.seal), B = pt(to, () => [A[0], A[1] - 160]);
    const gs = [...Array(Math.min(n, 3))].map(glow); let hit = false;
    const lab = label(`−${n} 功`, why, 's');
    run(1400, t => {
      P.c.classList.toggle('mhurt', t > 0.05 && t < 0.5);
      show(P, { shown: t > 0.25 ? v1 : v0, red: t < 0.5, scale: 1, rot: t < 0.4 ? Math.sin(t * 60) * 7 * (1 - t / 0.4) : 0 });
      gs.forEach((g, i) => { const k = ease(seg(t, 0.1 + i * 0.05, 0.6 + i * 0.05)); place(g, A, B, k, 68, 0.9 + 0.3 * k, t < 0.1 + i * 0.05 || k >= 1 ? 0 : 1); });
      if (!hit && t >= 0.62) { hit = true; burst(B); }
      const lk = seg(t, 0.05, 0.9); lab.style.transform = `translate(${A[0]}px,${A[1] - 50 + 30 * ease(lk)}px) translate(-50%,-100%)`; lab.style.opacity = 1 - seg(t, 0.75, 1);
    }, () => { gs.forEach(drop); lab.remove(); P.c.classList.remove('mhurt'); show(P, { shown: v1 }); });
  }
  return { gain, spend, at };
})();
