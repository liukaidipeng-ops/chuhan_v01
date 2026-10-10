// 战局开场音乐草稿（声音部 10-10，Ham：“战局开场音乐可以做两版，注意时长，和现在的差不多即可。楚汉分别做一版。”）
// 现在的开场：一声锣 + 三下鼓（main.js 开局，约 1.5 秒，题字「楚汉相争」停 2.7 秒）。新的做 2.5～3 秒。
// 出试听样时注入页面，挂在 EndTunes.T.{r,b}.open 下（0、1 两版），再加 T.r.open[2] = 现在的开场作对照。
// 只用真鼓（决战鼓那套大鼓录音）、真锣、编钟、古筝、古琴；不用合成号角、唢呐（Ham 不要电子感）。汉 D 宫明亮，楚 D 羽沉。
(() => {
  const hz = n => { const m = /^([A-G])(s?)(\d)$/.exec(n); const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * 2 ** (((+m[3] + 1) * 12 + st - 69) / 12); };
  const I = (k, g = 1) => {
    const D = Sfx.ctx.createGain(); D.gain.value = g; D.connect(k.bus());
    const S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: D, i });
    const T0 = Sfx.ctx.currentTime;
    return {
      S,
      end: (t = 2.3) => { D.gain.setValueAtTime(g, T0 + t); D.gain.setTargetAtTime(0.0001, T0 + t, 0.22); },   // 统一收尾：t 秒起淡出，全长约 3 秒
      drum: (t, v = 0.8, r = 0.62) => { S('drum', t, v, r); S('soft', t, v * 0.25, 0.5); },   // 真大鼓（和决战鼓同一套）
      gong: (t, v = 0.5, r = 0.8, i = 0) => S('gong', t, v, r, i),
      zheng: (t, n, v = 0.2) => k.pluck(hz(n), { t, vol: v, decay: 0.996, bright: 0.6, dest: D }),
      qin: (t, n, v = 0.3) => k.pluck(hz(n), { t, vol: v, decay: 0.9975, bright: 0.3, dest: D, body: true }),
      bell: (t, n, v = 0.1, len = 2.6) => { const f = hz(n); for (const [r, gg, dd] of [[1, 1, len], [2.0, 0.35, len * 0.6], [2.76, 0.3, len * 0.45], [5.4, 0.12, len * 0.25]]) k.tn({ t, f: f * r, dur: dd, vol: v * gg, dest: D }); },
    };
  };
  const run = (x, t0, ns, gap = 0.06, v = 0.2) => ns.forEach((n, i) => x.zheng(t0 + i * gap, n, v * (0.7 + 0.3 * i / ns.length)));
  const T = EndTunes.T;
  // 时长：收尾一下落在 1 秒左右，锣和钟的余音控制在 2 秒内，全长约 2.6～3 秒（现在的是 2.6 秒）
  T.r.open = [
    { name: '汉 · 甲', desc: '两下真大鼓，古筝一串往上扬，编钟“当—当当—当”奏宫调，一声锣收住', play(k) {
      const x = I(k, 2.2);
      x.drum(0, 0.9); x.drum(0.25, 0.75); run(x, 0.2, ['D4', 'E4', 'Fs4', 'A4', 'B4', 'D5'], 0.045);
      [['A4', 0.5], ['D5', 0.68], ['E5', 0.8], ['Fs5', 0.95]].forEach(([n, t]) => x.bell(t, n, 0.1, n === 'Fs5' ? 1.8 : 1.0));
      x.drum(0.95, 1.0); x.gong(0.97, 0.4, 1.0); x.qin(0.95, 'D2', 0.3); x.bell(0.99, 'D4', 0.05, 1.8);
      x.end(2.3);
    } },
    { name: '汉 · 乙', desc: '真鼓由轻到重滚上来，三下齐鼓，编钟一个明亮的和弦，锣声', play(k) {
      const x = I(k, 1.6);
      for (let i = 0; i < 6; i++) x.drum(i * 0.1, 0.3 + 0.07 * i, 1.0 + 0.02 * i);
      [0.65, 0.8, 0.95].forEach(t => x.drum(t, 1.0));
      ['D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => x.bell(0.95 + i * 0.02, n, 0.07, 1.8)); x.gong(0.97, 0.45, 1.0);
      run(x, 1.0, ['A4', 'B4', 'D5', 'E5', 'Fs5'], 0.045, 0.14);
      x.end(2.3);
    } },
    { name: '现在的开场（对照）', desc: '一声锣 + 三下鼓', play(k) { k.B.gong(0, 0.9); k.B.taiko(0.5, 0.8); k.B.taiko(0.8, 0.8); k.B.taiko(1.05, 0.9); } },   // 和 main.js 开局一模一样
  ];
  T.b.open = [
    { name: '楚 · 甲', desc: '三下沉重的真大鼓（压低更沉），古琴低音，编钟奏羽调往下走，一声低锣', play(k) {
      const x = I(k, 1.8);
      [0, 0.32, 0.64].forEach((t, i) => x.drum(t, 0.85 + 0.05 * i, 0.55)); x.qin(0, 'D2', 0.34);
      [['A4', 0.2], ['G4', 0.4], ['F4', 0.6], ['D4', 0.8]].forEach(([n, t]) => x.bell(t, n, 0.09, n === 'D4' ? 1.8 : 0.9));
      x.drum(0.98, 1.0, 0.5); x.gong(1.0, 0.5, 0.9, 1); x.bell(1.02, 'D3', 0.05, 1.6);
      x.end(2.3);
    } },
    { name: '楚 · 乙', desc: '鼓点越打越急，古筝急促轮拨，三下重鼓，将士一声齐吼，低锣', play(k) {
      const x = I(k, 1.7);
      const ts = [0, 0.22, 0.4, 0.54, 0.64, 0.72]; ts.forEach((t, i) => x.drum(t, 0.4 + 0.08 * i, 0.7));
      for (let i = 0; i < 8; i++) x.zheng(0.3 + i * 0.055, ['D4', 'F4'][i % 2], 0.1 + 0.012 * i);
      [0.82, 0.96, 1.1].forEach(t => x.drum(t, 1.0, 0.55)); x.S('warcry', 1.1, 0.3, 1.0, 0); x.gong(1.12, 0.5, 0.95, 1); x.qin(1.1, 'D2', 0.32);
      x.end(2.3);
    } },
  ];
})();
