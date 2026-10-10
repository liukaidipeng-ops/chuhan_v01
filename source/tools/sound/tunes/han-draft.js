// 汉胜、汉败结算曲草稿（声音部 10-10，试听台第三十六批）。
// Ham 10-09 第二十八批：汉胜「方案三（礼乐）保留，再写俩方案」；汉败「原曲保留，再写俩」。10-10：“你先用代码编”。
// 不改 src/endtunes.js：这个文件在出试听样时注入页面，把新方案接到 EndTunes.T.r.win / r.lose 后面（汉胜 3、4，汉败 3、4）。
// Ham 的口味：弹拨、编钟、古琴、真鼓真锣，不要电子感；结尾要拉长、自然收，别“很硬”（楚凯的备注）。
// 宫调：汉用 D 宫（D E F# A B）。响度：胜约 -15 LUFS，败约 -21 LUFS。
(() => {
  const hz = n => { const m = /^([A-G])(s?)(\d)$/.exec(n); const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * 2 ** (((+m[3] + 1) * 12 + st - 69) / 12); };
  function seq(list, t0, play, k = 1) { let t = t0; for (const [n, d0] of list) { const d = d0 * k; if (n) play(t, hz(n), d); t += d; } return t; }
  const I = (k, g = 1) => {   // 和 endtunes.js 里的乐器一样（只取用得到的）
    const D = Sfx.ctx.createGain(); D.gain.value = g; D.connect(k.bus());
    return {
      D,
      flute: (t, f, d, v = 0.08) => { k.voiceOsc({ t, f, dur: d * 0.98, vol: v, type: 'sine', cut: 3000, a: 0.12, rel: 0.3, vib: 0.008, vibF: 5, dest: D }); k.nz({ t, dur: d * 0.9, type: 'bandpass', f: f * 2, q: 9, vol: 0.015, a: 0.1, dest: D }); },
      erhu: (t, f, d, v = 0.11) => k.voiceOsc({ t, f, dur: d * 1.05, vol: v, cut: 1500, q: 3, a: 0.25, rel: 0.5, vib: 0.012, vibF: 5.5, bend: 0.97, dest: D }),
      voice: (t, f, d, v = 0.06) => { for (const m of [1, 1.5]) k.voiceOsc({ t, f: f * m, dur: d * 1.05, vol: v * (m === 1 ? 1 : 0.45), cut: 800, cut2: 1100, q: 5, a: 0.35, rel: 0.6, vib: 0.01, vibF: 4.8, detune: 14, dest: D }); },
      zheng: (t, f, d, v = 0.22) => k.pluck(f, { t, vol: v, decay: 0.996, bright: 0.6, dest: D }),
      trem: (t, f, d, v = 0.11) => { const n = Math.max(1, Math.round(d / 0.065)); for (let i = 0; i < n; i++) k.pluck(f, { t: t + i * 0.065, vol: v * (1 - i / (n + 4)), decay: 0.99, bright: 0.8, dest: D, cut: 4000 }); },
      qin: (t, f, d, v = 0.3) => k.pluck(f, { t, vol: v, decay: 0.9975, bright: 0.3, dest: D, body: true }),
      bell: (t, f, v = 0.1, len = 2.6) => { for (const [r, g, dd] of [[1, 1, len], [2.0, 0.35, len * 0.6], [2.76, 0.3, len * 0.45], [5.4, 0.12, len * 0.25]]) k.tn({ t, f: f * r, dur: dd, vol: v * g, dest: D }); },
      taiko: (t, v = 0.8, p = 1) => k.taikoTo(D, t, v, p),
      shime: (t, v = 0.15) => k.shimeTo(D, t, v),
      pad: (t, notes, dur, v = 0.04, type = 'triangle') => notes.forEach(n => k.voiceOsc({ t, f: hz(n), dur, vol: v, type, cut: 1100, a: Math.min(1.5, dur * 0.3), rel: Math.min(2.5, dur * 0.4), detune: 6, dest: D })),
      wind: (t, dur, v = 0.05) => k.nz({ t, dur, type: 'bandpass', f: 400, f2: 900, q: 0.7, vol: v, a: 1.5, dest: D }),
      S: (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: D, i }),   // 真录音：gong 锣、drum 大鼓
    };
  };
  const NEW = {
    win: [
      { name: '未央', desc: '两声建鼓、一声锣开场；编钟和笛子齐奏一段明亮的宫调，古筝一串串往上拨，鼓点稳稳两下两下，最后一声长钟慢慢收', play(k) {
        const x = I(k, 1.8); const b = 0.42;
        x.taiko(0, 0.85, 0.8); x.taiko(0.42, 0.85, 0.8); x.S('gong', 0.84, 0.4, 0.8, 1);
        const mel = [['A4', b], ['B4', b], ['D5', b * 2], ['E5', b], ['Fs5', b], ['E5', b * 2], ['D5', b], ['B4', b], ['A4', b * 2], ['B4', b], ['D5', b], ['E5', b], ['Fs5', b], ['A5', b * 2], ['Fs5', b], ['E5', b], ['D5', b * 4]];
        const t0 = 1.3, end = seq(mel, t0, (t, f, d) => x.bell(t, f, 0.1, d >= b * 4 ? 6.5 : Math.max(1.5, d * 1.5)));
        seq(mel, t0, (t, f, d) => x.flute(t, f, d, 0.05));
        const last = end - b * 4;
        for (let i = 0; i < 6; i++) { const tt = t0 + i * b * 4; ['D4', 'Fs4', 'A4', 'D5'].forEach((n, j) => x.zheng(tt + j * 0.07, hz(n), 0.3, 0.14 + j * 0.02)); }
        for (let i = 0; i < 12; i++) { const tt = t0 + i * b * 2; x.taiko(tt, i % 2 ? 0.32 : 0.5, 0.85); x.shime(tt + b, 0.08); }
        x.qin(t0, hz('D2'), 1, 0.3); x.qin(t0 + b * 8, hz('A2'), 1, 0.28); x.qin(last, hz('D2'), 1, 0.32);
        x.taiko(last, 0.9, 0.75); x.S('gong', last + 0.02, 0.5, 0.75, 0);
        x.bell(last + 0.04, hz('D4'), 0.06, 7); x.bell(last + 0.06, hz('A4'), 0.04, 6);
        x.zheng(last + 0.8, hz('Fs5'), 1, 0.07); x.zheng(last + 1.15, hz('A5'), 1, 0.06);
        x.pad(last, ['D3', 'A3', 'Fs4'], 7, 0.026);
      } },
      { name: '大风歌', desc: '古琴低低起两声，编钟一字一顿奏《大风歌》的气魄，琵琶轮指托着，大鼓越来越重，结尾重鼓和锣落在最后一音上，钟声余音拉长', play(k) {
        const x = I(k, 1.7); const b = 0.5;
        x.qin(0, hz('D2'), 1, 0.34); x.qin(0.5, hz('A2'), 1, 0.3); x.S('drum', 0.9, 0.5, 0.9, 0);
        const mel = [['D5', b * 2], ['E5', b], ['Fs5', b], ['A5', b * 3], ['Fs5', b], ['E5', b * 2], ['D5', b], ['E5', b], ['B4', b * 2], ['A4', b * 2], ['B4', b], ['D5', b], ['E5', b * 2], ['D5', b * 4]];
        const t0 = 1.0, end = seq(mel, t0, (t, f, d) => { x.bell(t, f, 0.11, d >= b * 4 ? 7 : Math.max(1.8, d * 1.6)); if (d >= b * 2) x.trem(t, f / 2, d * 0.9, 0.06); });
        const last = end - b * 4;
        for (let i = 0; i < 12; i++) { const tt = t0 + i * b * 2; x.taiko(tt, 0.35 + 0.4 * i / 12, 0.82); if (i > 5) x.taiko(tt + b, 0.25 + 0.2 * i / 12, 0.9); }
        for (let i = 0; i < 12; i++) x.zheng(t0 + i * b * 2 + b, hz(['A3', 'D4', 'Fs4', 'A3', 'B3', 'E4'][i % 6]), b, 0.12);
        [0, 0.16, 0.32].forEach(dt => x.taiko(last + dt, 0.95, 0.75)); x.S('gong', last + 0.34, 0.6, 0.65, 0);
        x.bell(last + 0.36, hz('D4'), 0.07, 7.5); x.bell(last + 0.4, hz('A3'), 0.05, 6.5);
        x.qin(last + 0.36, hz('D2'), 1, 0.3); x.qin(last + 1.6, hz('A2'), 1, 0.14);
        x.pad(last, ['D3', 'A3', 'D4', 'Fs4'], 7.5, 0.026);
      } },
    ],
    lose: [
      { name: '荥阳', desc: '风声里一支洞箫低低地吹一段往下走的宫调，古琴隔一会儿拨一声低音，远处闷鼓像心跳，最后一声轻锣，余音很长', play(k) {
        const x = I(k, 1.0); const b = 0.8;
        x.wind(0, 16, 0.045);
        const mel = [['A4', b * 2], ['Fs4', b], ['E4', b], ['D4', b * 2.5], [null, b * 0.5], ['E4', b], ['Fs4', b], ['A4', b * 1.5], ['B4', b * 0.5], ['A4', b], ['Fs4', b], ['E4', b * 2], ['D4', b * 4]];
        const end = seq(mel, 0.6, (t, f, d) => x.flute(t, f / 2, d, 0.11));
        const last = end - b * 4;
        [['D2', 0.3], ['A2', 3.5], ['Fs2', 6.6], ['D2', last]].forEach(([n, t]) => x.qin(t, hz(n), 1, 0.3));
        for (let i = 0; i < 9; i++) { const tt = 1.0 + i * 1.5; x.taiko(tt, 0.22, 0.7); x.taiko(tt + 0.28, 0.14, 0.72); }
        x.S('gong', last + 0.1, 0.22, 0.7, 1); x.pad(last, ['D3', 'A3'], 6, 0.022);
      } },
      { name: '败走', desc: '琵琶轮指拉出一段颤抖的下行旋律，二胡低低地跟着，鼓点越来越稀，最后只剩一声低钟在风里散掉', play(k) {
        const x = I(k, 1.0); const b = 0.6;
        x.wind(0, 15, 0.04); x.qin(0.2, hz('D2'), 1, 0.32);
        const mel = [['D5', b * 2], ['B4', b], ['A4', b], ['Fs4', b * 2], ['E4', b * 2], ['Fs4', b], ['E4', b], ['D4', b * 2], ['B3', b * 2], ['D4', b], ['E4', b], ['D4', b * 4]];
        const end = seq(mel, 0.6, (t, f, d) => x.trem(t, f, d * 0.95, 0.08));
        seq(mel, 0.6, (t, f, d) => x.erhu(t, f / 2, d, 0.05));
        const last = end - b * 4;
        [0.6, 2.0, 3.6, 5.4, 7.6, 10.2].forEach((t, i) => x.taiko(t, 0.3 - i * 0.03, 0.72));
        x.bell(last + 0.3, hz('D4'), 0.05, 7); x.bell(last + 0.32, hz('A3'), 0.035, 6); x.pad(last, ['D3', 'Fs3', 'A3'], 6.5, 0.02);
      } },
    ],
  };
  for (const kind of ['win', 'lose']) EndTunes.T.r[kind].push(...NEW[kind]);
})();
