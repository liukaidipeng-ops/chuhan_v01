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
  // 第五十批（b53）：Ham 汉“可以不要这么吵”、楚“太急了，急死了”→ 少鼓、轻锣、放慢，以编钟古筝古琴为主
  T.r.open = [
    { name: '汉 · 丙', desc: '甲的安静版：一下轻鼓，古筝慢慢往上拨，编钟三声，轻锣', play(k) {
      const x = I(k, 1.6);
      x.drum(0, 0.45, 0.7); x.qin(0, 'D2', 0.26); run(x, 0.15, ['D4', 'Fs4', 'A4', 'D5'], 0.11, 0.16);
      [['A4', 0.7], ['D5', 1.05], ['Fs5', 1.4]].forEach(([n, t]) => x.bell(t, n, 0.08, n === 'Fs5' ? 1.8 : 1.1));
      x.gong(1.4, 0.18, 1.0); x.bell(1.42, 'D4', 0.04, 1.8); x.end(2.4);
    } },
    { name: '汉 · 丁', desc: '没有鼓：古琴一声低音，编钟和古筝对答一句宫调，一声很轻的锣', play(k) {
      const x = I(k, 1.7);
      x.qin(0, 'D3', 0.3); x.qin(0.02, 'A2', 0.22);
      [['D5', 0.3], ['E5', 0.55], ['A4', 0.8]].forEach(([n, t]) => x.bell(t, n, 0.08, 1.2));
      [['Fs4', 0.45], ['A4', 0.68], ['B4', 0.92], ['D5', 1.2]].forEach(([n, t]) => x.zheng(t, n, 0.16));
      x.bell(1.25, 'D5', 0.08, 1.8); x.gong(1.25, 0.14, 1.05); x.end(2.4);
    } },
    { name: '汉 · 甲（上一批“还行”）', desc: '对照', play(k) {
      const x = I(k, 2.2);
      x.drum(0, 0.9); x.drum(0.25, 0.75); run(x, 0.2, ['D4', 'E4', 'Fs4', 'A4', 'B4', 'D5'], 0.045);
      [['A4', 0.5], ['D5', 0.68], ['E5', 0.8], ['Fs5', 0.95]].forEach(([n, t]) => x.bell(t, n, 0.1, n === 'Fs5' ? 1.8 : 1.0));
      x.drum(0.95, 1.0); x.gong(0.97, 0.4, 1.0); x.qin(0.95, 'D2', 0.3); x.bell(0.99, 'D4', 0.05, 1.8); x.end(2.3);
    } },
  ];
  T.b.open = [
    { name: '楚 · 丙', desc: '慢：两下沉鼓隔得很开，古琴低音，编钟羽调慢慢往下，一声低锣', play(k) {
      const x = I(k, 1.7);
      x.drum(0, 0.7, 0.52); x.qin(0, 'D2', 0.32);
      [['A4', 0.35], ['G4', 0.75], ['D4', 1.15]].forEach(([n, t]) => x.bell(t, n, 0.08, n === 'D4' ? 1.8 : 1.3));
      x.drum(1.15, 0.85, 0.5); x.gong(1.17, 0.3, 0.85, 1); x.qin(1.15, 'A1', 0.22); x.end(2.5);
    } },
    { name: '楚 · 丁', desc: '更静：古琴两声低音，编钟三声，最后一下沉鼓和低锣', play(k) {
      const x = I(k, 1.7);
      x.qin(0, 'D2', 0.32); x.qin(0.5, 'A1', 0.26);
      [['F4', 0.25], ['D4', 0.6], ['C4', 0.95]].forEach(([n, t]) => x.bell(t, n, 0.08, 1.3));
      x.drum(1.25, 0.8, 0.5); x.bell(1.27, 'D4', 0.07, 1.8); x.gong(1.27, 0.25, 0.85, 1); x.end(2.5);
    } },
  ];
})();
