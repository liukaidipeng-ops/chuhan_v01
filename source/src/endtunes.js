// ===== 终局小曲：汉、楚各一套「胜」「败」（Ham 10-09：联机模式下楚和汉的胜利、失败各写一首，每首三个方案，时长和原来差不多）=====
//   原来不分阵营：胜一首约 11 秒（鼓、号角、铜管旋律、锣）、败一首约 18 秒（二胡、古琴）。
//   这里每种 3 个方案，先放到试听台让 Ham 挑（tools/tunes.py 用离线渲染出试听样），挑定后 PICK 里写上选中的第几个。
//   宫调：汉用 D 宫（D E F# A B，明亮）；楚用 D 羽（D F G A C，悲壮）
const EndTunes = (() => {
  const hz = n => { const m = /^([A-G])(s?)(\d)$/.exec(n); const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * 2 ** (((+m[3] + 1) * 12 + st - 69) / 12); };
  // 依次奏一串音：[[音名或 null, 拍长秒数], ...]，k = 整体放慢/加快的倍数，返回结束时刻
  function seq(list, t0, play, k = 1) { let t = t0; for (const [n, d0] of list) { const d = d0 * k; if (n) play(t, hz(n), d); t += d; } return t; }
  // g = 这首整体的音量（各首响度对齐原来那两首：胜约 -15 LUFS，败约 -21 LUFS）
  const I = (k, g = 1) => {
    const D = Sfx.ctx.createGain(); D.gain.value = g; D.connect(k.bus());
    return {
      D,
      brass: (t, f, d, v = 0.13) => { k.voiceOsc({ t, f, dur: d * 1.04, vol: v, cut: 900, cut2: 2600, q: 1.5, a: 0.05, rel: 0.2, vib: 0.005, detune: 8, dest: D }); k.voiceOsc({ t, f: f / 2, dur: d * 1.04, vol: v * 0.55, type: 'square', cut: 700, a: 0.05, rel: 0.2, dest: D }); },
      low: (t, f, d, v = 0.12) => { k.voiceOsc({ t, f, dur: d * 1.04, vol: v, cut: 500, cut2: 1400, q: 2, a: 0.03, rel: 0.15, detune: 10, dest: D }); k.voiceOsc({ t, f: f / 2, dur: d * 1.04, vol: v * 0.7, type: 'square', cut: 400, a: 0.03, rel: 0.15, dest: D }); },
      suona: (t, f, d, v = 0.1) => k.voiceOsc({ t, f, dur: d * 1.02, vol: v, type: 'square', cut: 1800, cut2: 3400, q: 4, a: 0.03, rel: 0.12, vib: 0.011, vibF: 6.2, bend: 0.94, dest: D }),
      erhu: (t, f, d, v = 0.11) => k.voiceOsc({ t, f, dur: d * 1.05, vol: v, cut: 1500, q: 3, a: 0.25, rel: 0.5, vib: 0.012, vibF: 5.5, bend: 0.97, dest: D }),
      flute: (t, f, d, v = 0.08) => { k.voiceOsc({ t, f, dur: d * 0.98, vol: v, type: 'sine', cut: 3000, a: 0.12, rel: 0.3, vib: 0.008, vibF: 5, dest: D }); k.nz({ t, dur: d * 0.9, type: 'bandpass', f: f * 2, q: 9, vol: 0.015, a: 0.1, dest: D }); },
      voice: (t, f, d, v = 0.06) => { for (const m of [1, 1.5]) k.voiceOsc({ t, f: f * m, dur: d * 1.05, vol: v * (m === 1 ? 1 : 0.45), cut: 800, cut2: 1100, q: 5, a: 0.35, rel: 0.6, vib: 0.01, vibF: 4.8, detune: 14, dest: D }); },
      zheng: (t, f, d, v = 0.22) => k.pluck(f, { t, vol: v, decay: 0.996, bright: 0.6, dest: D }),
      trem: (t, f, d, v = 0.11) => { const n = Math.max(1, Math.round(d / 0.065)); for (let i = 0; i < n; i++) k.pluck(f, { t: t + i * 0.065, vol: v * (1 - i / (n + 4)), decay: 0.99, bright: 0.8, dest: D, cut: 4000 }); },
      qin: (t, f, d, v = 0.3) => k.pluck(f, { t, vol: v, decay: 0.9975, bright: 0.3, dest: D, body: true }),
      bell: (t, f, v = 0.1, len = 2.6) => { for (const [r, g, dd] of [[1, 1, len], [2.0, 0.35, len * 0.6], [2.76, 0.3, len * 0.45], [5.4, 0.12, len * 0.25]]) k.tn({ t, f: f * r, dur: dd, vol: v * g, dest: D }); },
      taiko: (t, v = 0.8, p = 1) => k.taikoTo(D, t, v, p),
      shime: (t, v = 0.15) => k.shimeTo(D, t, v),
      horn: (t, dur, f) => k.hornTo(D, t, dur, f),
      gong: (t, v = 1) => k.B.gong(t, v, D),
      cym: (t, v = 0.06, dur = 1.4) => k.nz({ t, dur, type: 'highpass', f: 5000, vol: v, a: 0.004, dest: D }),
      pad: (t, notes, dur, v = 0.04, type = 'triangle') => notes.forEach(n => k.voiceOsc({ t, f: hz(n), dur, vol: v, type, cut: 1100, a: Math.min(1.5, dur * 0.3), rel: Math.min(2.5, dur * 0.4), detune: 6, dest: D })),
      wind: (t, dur, v = 0.05) => k.nz({ t, dur, type: 'bandpass', f: 400, f2: 900, q: 0.7, vol: v, a: 1.5, dest: D }),
      water: (t, dur, v = 0.05) => { k.nz({ t, dur, type: 'lowpass', f: 700, f2: 500, q: 0.5, vol: v, a: 1.2, dest: D }); k.nz({ t, dur, type: 'bandpass', f: 1800, f2: 1300, q: 1.2, vol: v * 0.5, a: 1.2, dest: D }); },
      shout: (t, n = 14, v = 0.08, len = 1) => k.B.shout(t, n, v, len),
    };
  };
  const roll = (x, t0, n, gap, v = 0.75) => { for (let i = 0; i < n; i++) x.taiko(t0 + i * gap, v * (0.6 + 0.4 * i / n), i % 2 ? 1.1 : 0.9); };
  const march = (x, t0, beats, beat, v = 0.4) => { for (let i = 0; i < beats; i++) { x.taiko(t0 + i * beat, i % 4 === 0 ? v * 1.6 : v, i % 4 === 0 ? 0.9 : 1.15); x.shime(t0 + i * beat + beat / 2, 0.1); } };

  const T = {
    r: {   // 汉
      win: [
        { name: '大风', desc: '鼓声滚进来，一声锣，铜管奏出开阔的旋律，众军齐呼', play(k) {
          const x = I(k, 1.1); roll(x, 0, 6, 0.2); x.gong(1.2, 0.9);
          const end = seq([['A4', 0.6], ['B4', 0.3], ['A4', 0.3], ['Fs4', 0.6], ['E4', 0.3], ['D4', 0.9], ['E4', 0.4], ['Fs4', 0.4], ['A4', 0.6], ['D5', 1.2], ['B4', 0.4], ['A4', 0.4], ['Fs4', 0.4], ['A4', 0.5], ['D5', 2.2]], 1.3, x.brass, 0.9);
          march(x, 1.3, 20, 0.37, 0.35); x.horn(1.3, 3, hz('D3')); x.shout(2.2, 16, 0.08, 1); x.shout(6.4, 16, 0.09, 1.2);
          x.pad(end - 2.4, ['D3', 'A3', 'D4', 'Fs4'], 4, 0.05); x.gong(end - 0.3, 0.8);
        } },
        { name: '凯旋', desc: '小鼓、大鼓打着进行曲，唢呐吹得欢，镲片一响收住', play(k) {
          const x = I(k, 1.2); const b = 0.3;
          for (let i = 0; i < 28; i++) { if (i % 2 === 0) x.taiko(0.2 + i * b, i % 8 === 0 ? 0.8 : 0.45, i % 8 === 0 ? 0.9 : 1.2); x.shime(0.2 + i * b + b / 2, 0.12); }
          const end = seq([['D5', 0.3], ['E5', 0.3], ['Fs5', 0.6], ['A5', 0.6], ['Fs5', 0.3], ['E5', 0.3], ['D5', 0.6], ['B4', 0.6], ['A4', 0.3], ['B4', 0.3], ['D5', 0.6], ['E5', 0.3], ['D5', 0.3], ['B4', 0.6], ['A4', 0.6], ['Fs4', 0.3], ['A4', 0.3], ['B4', 0.6], ['D5', 2.0]], 0.8, x.suona);
          seq([['D4', 1.2], ['A3', 1.2], ['B3', 1.2], ['Fs3', 1.2], ['D4', 1.2], ['A3', 1.2], ['D4', 2.0]], 0.8, (t, f, d) => x.low(t, f, d, 0.07));
          x.cym(0.8, 0.05); x.cym(5.6, 0.05); x.cym(end - 2.0, 0.08, 2.2); [0, 0.15, 0.3].forEach(dt => x.taiko(end - 2.0 + dt, 0.9, 0.9)); x.shout(end - 1.9, 18, 0.09, 1.2);
        } },
        { name: '礼乐', desc: '编钟奏主旋律，古筝拨着和声，低鼓稳稳地打拍子，像庆功的礼乐', play(k) {
          const x = I(k, 2); const b = 0.5;
          const end = seq([['D5', b * 2], ['A4', b], ['B4', b], ['D5', b * 2], ['E5', b], ['D5', b], ['B4', b * 2], ['A4', b * 2], ['Fs4', b], ['A4', b], ['D5', b * 4]], 0.4, (t, f, d) => x.bell(t, f, 0.11, Math.max(1.6, d * 2)));
          for (let i = 0; i < 16; i++) x.zheng(0.4 + i * b, hz(['D3', 'A3', 'D4', 'Fs4', 'A3', 'E4', 'A4', 'E4'][i % 8]), b, 0.16);
          for (let i = 0; i < 8; i++) x.taiko(0.4 + i * b * 2, i % 2 ? 0.35 : 0.55, 0.85);
          x.pad(end - b * 4, ['D3', 'A3', 'Fs4'], 3.6, 0.035); x.gong(end - 0.6, 0.5);
        } },
        // 声音部 10-10 试听台第三十六批：Ham 选「未央」，和「礼乐」随机放（“这俩随机放”）
        { name: '未央', desc: '两声建鼓、一声锣开场；编钟和笛子齐奏一段明亮的宫调，古筝一串串往上拨，鼓点稳稳两下两下，最后一声长钟慢慢收', play(k) {
        const x = I(k, 1.8); const S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: x.D, i }); const b = 0.42;
        x.taiko(0, 0.85, 0.8); x.taiko(0.42, 0.85, 0.8); S('gong', 0.84, 0.4, 0.8, 1);
        const mel = [['A4', b], ['B4', b], ['D5', b * 2], ['E5', b], ['Fs5', b], ['E5', b * 2], ['D5', b], ['B4', b], ['A4', b * 2], ['B4', b], ['D5', b], ['E5', b], ['Fs5', b], ['A5', b * 2], ['Fs5', b], ['E5', b], ['D5', b * 4]];
        const t0 = 1.3, end = seq(mel, t0, (t, f, d) => x.bell(t, f, 0.1, d >= b * 4 ? 6.5 : Math.max(1.5, d * 1.5)));
        seq(mel, t0, (t, f, d) => x.flute(t, f, d, 0.05));
        const last = end - b * 4;
        for (let i = 0; i < 6; i++) { const tt = t0 + i * b * 4; ['D4', 'Fs4', 'A4', 'D5'].forEach((n, j) => x.zheng(tt + j * 0.07, hz(n), 0.3, 0.14 + j * 0.02)); }
        for (let i = 0; i < 12; i++) { const tt = t0 + i * b * 2; x.taiko(tt, i % 2 ? 0.32 : 0.5, 0.85); x.shime(tt + b, 0.08); }
        x.qin(t0, hz('D2'), 1, 0.3); x.qin(t0 + b * 8, hz('A2'), 1, 0.28); x.qin(last, hz('D2'), 1, 0.32);
        x.taiko(last, 0.9, 0.75); S('gong', last + 0.02, 0.5, 0.75, 0);
        x.bell(last + 0.04, hz('D4'), 0.06, 7); x.bell(last + 0.06, hz('A4'), 0.04, 6);
        x.zheng(last + 0.8, hz('Fs5'), 1, 0.07); x.zheng(last + 1.15, hz('A5'), 1, 0.06);
        x.pad(last, ['D3', 'A3', 'Fs4'], 7, 0.026);
      } },
      ],
      lose: [
        { name: '残阳', desc: '二胡慢慢拉一段往下走的旋律，底下低低的心跳鼓，最后一声轻锣', play(k) {
          const x = I(k, 1.2);
          const end = seq([['A4', 1.4], ['Fs4', 0.7], ['E4', 1.0], ['D4', 2.0], ['E4', 0.7], ['Fs4', 0.7], ['A4', 1.2], ['B4', 0.7], ['A4', 1.0], ['Fs4', 0.7], ['E4', 0.8], ['D4', 3.0]], 0.8, x.erhu, 1.1);
          for (let t = 0.4; t < end - 1; t += 1.7) { x.taiko(t, 0.3, 0.75); x.taiko(t + 0.28, 0.18, 0.75); }
          x.pad(0.6, ['D3', 'A3'], end, 0.03); x.wind(0.5, end, 0.03); x.gong(end - 1, 0.5);
        } },
        { name: '鸣金收兵', desc: '三声鸣金（收兵的铜钲），号角低低一声，再一支笛子独自吹完', play(k) {
          const x = I(k, 1.35);
          [0, 0.9, 1.8].forEach((t, i) => { x.bell(t, hz('A5') * 0.98, 0.09, 1.4); x.bell(t, hz('E5'), 0.05, 1.2); x.gong(t, 0.25 - i * 0.05); });
          x.horn(2.8, 3.2, hz('A2'));
          const end = seq([['B4', 1.0], ['A4', 0.6], ['Fs4', 1.2], ['E4', 0.6], ['D4', 1.6], [null, 0.4], ['E4', 0.6], ['Fs4', 0.6], ['A4', 1.0], ['Fs4', 0.6], ['E4', 0.8], ['D4', 2.6]], 4.2, x.flute);
          x.qin(4.2, hz('D3'), 1); x.qin(8.6, hz('A2'), 1); x.wind(3, end - 2.5, 0.035); x.gong(end - 0.8, 0.35);
        } },
        { name: '孤琴', desc: '一张古琴，弹几句缓慢的散音，夹着风声，冷清收尾', play(k) {
          const x = I(k, 1.6);
          const end = seq([['D4', 1.0], ['A3', 1.0], ['B3', 0.6], ['A3', 0.6], ['Fs3', 1.4], ['E3', 0.8], ['D3', 2.2], ['Fs3', 0.8], ['A3', 0.8], ['B3', 0.6], ['D4', 1.2], ['A3', 0.9], ['D3', 3.0]], 0.6, (t, f, d) => { x.qin(t, f, d, 0.32); if (d > 1) x.qin(t + 0.02, f * 2, d, 0.06); }, 1.08);
          x.wind(0.2, end + 1, 0.05); x.pad(end - 4, ['D3', 'A3'], 5, 0.025);
        } },
        // 声音部 10-10 试听台第三十六批：Ham 选「荥阳」，和原曲随机放（“这俩随机放”）
        { name: '荥阳', desc: '风声里一支洞箫低低地吹一段往下走的宫调，古琴隔一会儿拨一声低音，远处闷鼓像心跳，最后一声轻锣，余音很长', play(k) {
        const x = I(k, 1.0); const S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: x.D, i }); const b = 0.8;
        x.wind(0, 16, 0.045);
        const mel = [['A4', b * 2], ['Fs4', b], ['E4', b], ['D4', b * 2.5], [null, b * 0.5], ['E4', b], ['Fs4', b], ['A4', b * 1.5], ['B4', b * 0.5], ['A4', b], ['Fs4', b], ['E4', b * 2], ['D4', b * 4]];
        const end = seq(mel, 0.6, (t, f, d) => x.flute(t, f / 2, d, 0.11));
        const last = end - b * 4;
        [['D2', 0.3], ['A2', 3.5], ['Fs2', 6.6], ['D2', last]].forEach(([n, t]) => x.qin(t, hz(n), 1, 0.3));
        for (let i = 0; i < 9; i++) { const tt = 1.0 + i * 1.5; x.taiko(tt, 0.22, 0.7); x.taiko(tt + 0.28, 0.14, 0.72); }
        S('gong', last + 0.1, 0.22, 0.7, 1); x.pad(last, ['D3', 'A3'], 6, 0.022);
      } },
      ],
    },
    b: {   // 楚
      win: [
        { name: '霸王', desc: '重鼓越打越密，低沉的号角，铜管压着低音吼出旋律，楚军吶喊', play(k) {
          const x = I(k, 1); for (let i = 0; i < 10; i++) x.taiko(i * Math.max(0.09, 0.22 - i * 0.014), 0.5 + i * 0.04, 0.85);
          x.horn(1.2, 3.4, hz('D3') * 0.75); x.gong(1.2, 1);
          const end = seq([['D4', 0.3], ['D4', 0.3], ['F4', 0.3], ['G4', 0.6], ['A4', 0.9], ['C5', 0.3], ['A4', 0.3], ['G4', 0.6], ['F4', 0.3], ['G4', 0.3], ['A4', 1.2], ['D5', 0.6], ['C5', 0.3], ['A4', 0.3], ['G4', 0.6], ['A4', 0.3], ['D5', 2.0]], 1.3, (t, f, d) => x.low(t, f, d, 0.13), 0.9);
          for (let i = 0; i < 30; i++) { const t = 1.3 + i * 0.28; x.taiko(t, i % 4 === 0 ? 0.75 : 0.4, i % 4 === 0 ? 0.8 : 1.05); if (i % 2) x.taiko(t + 0.15, 0.25, 1.1); }
          x.shout(1.6, 18, 0.1, 1.2); x.shout(5.8, 18, 0.1, 1.3); x.gong(end - 0.6, 1); x.pad(end - 2, ['D3', 'A3', 'D4'], 3.5, 0.05, 'sawtooth');
        } },
        { name: '破釜', desc: '鼓点由慢到快像冲锋，琵琶急促地轮指，最后三下齐鼓一声锣', play(k) {
          const x = I(k, 1); let t = 0, g = 0.5;
          while (t < 6.4) { x.taiko(t, 0.5 + (0.5 - g) * 0.8, 0.95); t += g; g = Math.max(0.16, g * 0.9); }
          const end = seq([['A4', 0.45], ['C5', 0.45], ['D5', 0.9], ['C5', 0.45], ['A4', 0.45], ['G4', 0.9], ['F4', 0.45], ['G4', 0.45], ['A4', 0.9], ['C5', 0.45], ['D5', 0.45], ['F5', 0.9], ['D5', 1.2]], 0.6, x.trem);
          seq([['D3', 1.8], ['C3', 1.8], ['F3', 1.8], ['D3', 2.1]], 0.6, (tt, f, d) => x.low(tt, f, d, 0.08));
          [0, 0.18, 0.36].forEach(dt => x.taiko(end + dt, 1, 0.85)); x.gong(end + 0.4, 1); x.cym(end + 0.4, 0.07, 2); x.shout(end + 0.45, 20, 0.1, 1.2);
        } },
        { name: '江东子弟', desc: '号角开场，众声铺底，唢呐唱一段宽广的旋律，鼓声稳稳收尾', play(k) {
          const x = I(k, 1.15); x.horn(0, 2.4, hz('D3')); x.horn(0.6, 2.2, hz('A2'));
          const end = seq([['D4', 0.8], ['F4', 0.4], ['G4', 0.4], ['A4', 1.2], ['G4', 0.4], ['F4', 0.4], ['D4', 0.8], ['C4', 0.4], ['D4', 0.4], ['F4', 0.8], ['G4', 0.4], ['A4', 0.4], ['C5', 0.8], ['A4', 0.4], ['D5', 2.2]], 1.0, x.suona, 0.85);
          x.pad(1.0, ['D3', 'A3'], 2.8, 0.04); x.pad(3.7, ['F3', 'C4'], 2.8, 0.04); x.pad(6.4, ['D3', 'A3', 'D4'], 3.4, 0.045);
          march(x, 1.0, 20, 0.36, 0.38); x.shout(2.6, 14, 0.07, 1); x.gong(end - 0.4, 0.9);
        } },
        // —— 第二批（Ham 10-10 08:31「楚胜结算曲你再编几个」）：上一批三首都没过；汉胜挑中的「礼乐」、楚败挑中的「乌江」都是弹拨、钟、鼓这类，
        //   这批不用合成的铜管、唢呐、人声，改用古筝 / 琵琶轮指、编钟、真鼓、真锣，几首各有性子 ——
        { name: '彭城', desc: '鼓点一路催上来，琵琶轮指奏一段昂扬的楚调，低音古琴压阵，最后三下重鼓、一声锣、远处将士齐呼', play(k) {
          const x = I(k, 1.25), S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: x.D, i });
          let t = 0, g = 0.34; while (t < 1.45) { x.taiko(t, 0.35 + t * 0.3, 1); t += g; g = Math.max(0.1, g * 0.8); }
          x.taiko(1.6, 1, 0.8); S('gong', 1.6, 0.5, 0.8, 0);
          const end = seq([['D5', 0.8], ['C5', 0.4], ['A4', 0.4], ['G4', 0.4], ['A4', 0.4], ['C5', 0.4], ['D5', 0.4], ['F5', 0.8], ['D5', 0.4], ['C5', 0.4], ['A4', 1.2], ['G4', 0.4], ['A4', 0.4], ['C5', 0.4], ['A4', 0.4], ['D5', 1.6]], 1.6, (tt, f, d) => x.trem(tt, f, d, 0.12));
          for (let i = 0; i < 12; i++) { const tt = 1.6 + i * 0.8; x.qin(tt, hz(['D3', 'A2', 'C3', 'A2'][i % 4]), 0.8, 0.28); x.taiko(tt, i % 2 ? 0.45 : 0.7, 0.85); x.shime(tt + 0.4, 0.09); }
          [0, 0.2, 0.4].forEach(dt => x.taiko(end - 0.4 + dt, 1, 0.8)); S('gong', end + 0.05, 0.7, 0.75, 1); S('warcry', end + 0.1, 0.22, 0.92, 0);
          x.bell(end + 0.05, hz('D4'), 0.08, 3); x.bell(end + 0.05, hz('A4'), 0.05, 2.6); x.pad(end - 1.6, ['D3', 'A3', 'D4'], 4, 0.035);
        } },
        { name: '乌骓', desc: '一声马嘶、马蹄奔来，古筝一串串往上扬，鼓点像马蹄一样三连，最后马蹄停住、一声钟', play(k) {
          const x = I(k, 1.5), S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: x.D, i });
          S('neigha', 0, 0.45, 1, 0); S('hoofwar', 0.3, 0.4, 1, 0); S('hoofwar', 3.4, 0.32, 1, 0);
          for (let i = 0; i < 16; i++) { const tt = 0.6 + i * 0.48; x.taiko(tt, i % 4 === 0 ? 0.6 : 0.32, 1.05); x.taiko(tt + 0.12, 0.2, 1.15); x.taiko(tt + 0.24, 0.26, 1.1); }
          const run = (t0, ns, v = 0.2) => ns.forEach((n, i) => x.zheng(t0 + i * 0.08, hz(n), 0.3, v * (0.75 + 0.25 * i / ns.length)));
          run(0.6, ['D4', 'F4', 'G4', 'A4', 'C5', 'D5']); run(2.52, ['G4', 'A4', 'C5', 'D5', 'F5', 'G5']); run(4.44, ['A4', 'C5', 'D5', 'F5', 'G5', 'A5']);
          const end = seq([['D5', 0.48], ['C5', 0.24], ['D5', 0.24], ['F5', 0.48], ['G5', 0.48], ['A5', 0.72], ['G5', 0.24], ['F5', 0.24], ['D5', 0.24], ['C5', 0.48], ['D5', 1.6]], 5.4, (tt, f, d) => d >= 0.7 ? x.trem(tt, f, d, 0.12) : x.zheng(tt, f, d, 0.22));
          for (let i = 0; i < 6; i++) x.qin(1.56 + i * 1.92, hz(['D3', 'C3', 'D3', 'A2', 'C3', 'D3'][i]), 1, 0.26);
          S('neighm', end - 1.0, 0.3, 1, 0); x.taiko(end - 0.2, 0.9, 0.85); x.bell(end, hz('D5'), 0.09, 3); x.bell(end, hz('A4'), 0.06, 2.4); S('gong', end, 0.45, 0.85, 0);
        } },
        { name: '楚凯', desc: '编钟奏一段庄重的楚调（羽调，比汉的「礼乐」低沉），古筝拨和声，大鼓两下两下地打，一声深锣收住', play(k) {
          const x = I(k, 1.85), S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: x.D, i }); const b = 0.55;
          x.taiko(0, 0.8, 0.8); S('gong', 0, 0.35, 0.7, 1);
          // 最后一音（D5）拉长：钟声余韵 6 秒，下面低八度、五度的钟和一层长长的和声慢慢收（Ham 10-10 试听台：「结尾那一声收尾可以拉得再长一点，现在结束得非常硬」）
          const end = seq([['D5', b * 2], ['A4', b], ['C5', b], ['D5', b * 2], ['F5', b], ['D5', b], ['C5', b * 2], ['A4', b * 2], ['G4', b], ['A4', b], ['D5', b * 4]], 0.5, (t, f, d) => x.bell(t, f, 0.11, d >= b * 4 ? 6.5 : Math.max(1.6, d * 1.4)));
          for (let i = 0; i < 16; i++) x.zheng(0.5 + i * b, hz(['D3', 'A3', 'D4', 'F4', 'C3', 'G3', 'C4', 'G3'][i % 8]), b, 0.15);
          for (let i = 0; i < 8; i++) { const tt = 0.5 + i * b * 2; x.taiko(tt, 0.6, 0.8); x.taiko(tt + 0.22, 0.35, 0.85); }
          const last = end - b * 4;   // 最后一音落下的时刻
          x.qin(0.5, hz('D2'), 1, 0.3); x.qin(0.5 + b * 8, hz('A2'), 1, 0.28); x.qin(last, hz('D2'), 1, 0.32); x.qin(last + 1.1, hz('A2'), 1, 0.16);
          x.taiko(last, 0.95, 0.75); S('gong', last + 0.02, 0.6, 0.6, 0);   // 重鼓和锣落在最后一音上，不再在末尾补一下硬的
          x.bell(last + 0.04, hz('D4'), 0.07, 7); x.bell(last + 0.06, hz('A3'), 0.05, 6.5); x.bell(end + 0.4, hz('A5'), 0.018, 4.5);   // 低钟托底；尾巴上极轻的一点泛音
          x.zheng(last + 0.9, hz('A4'), 1, 0.08); x.zheng(last + 1.25, hz('D5'), 1, 0.07);
          x.pad(last, ['D3', 'A3', 'D4'], 7, 0.028);
        } },
        { name: '霸王怒', desc: '低音古琴弹一段带脾气的重复短句，重鼓砸在句头，琵琶在高处嘶喊，越来越紧，最后将士一吼、三下重鼓、一声锣', play(k) {
          const x = I(k, 1.1), S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: x.D, i });
          const riff = [['D3', 0.3], ['D3', 0.15], ['F3', 0.15], ['D3', 0.3], ['G3', 0.3], ['F3', 0.3], ['C3', 0.3], ['D3', 0.3]];   // 一句 2.1 秒
          let t = 0.2;
          for (let r = 0; r < 4; r++) {
            x.taiko(t, 1, 0.75); x.taiko(t + 1.05, 0.7, 0.8); if (r >= 2) { x.taiko(t + 0.6, 0.45, 0.9); x.taiko(t + 1.65, 0.45, 0.9); }
            seq(riff, t, (tt, f, d) => { x.qin(tt, f, d, 0.34); x.zheng(tt, f * 2, d, 0.06); });
            t += 2.1;
          }
          seq([[null, 2.1], ['A5', 0.6], ['G5', 0.3], ['F5', 0.3], ['D5', 0.9], [null, 0.3], ['C6', 0.6], ['A5', 0.3], ['G5', 0.3], ['A5', 1.0], ['D6', 1.4]], 0.2, (tt, f, d) => x.trem(tt, f, d, 0.1));
          const end = t;
          S('warcry', end - 0.1, 0.4, 0.88, 1); [0, 0.18, 0.36].forEach(dt => x.taiko(end + dt, 1, 0.75)); S('gong', end + 0.4, 0.8, 0.7, 0);
          x.qin(end + 0.4, hz('D2'), 1, 0.36); x.pad(end - 0.2, ['D2', 'A2', 'D3'], 2.6, 0.04);
        } },
      ],
      lose: [
        { name: '垓下', desc: '二胡拉「力拔山兮」的悲歌，古琴低音垫底，最后一声沉沉的锣', play(k) {
          const x = I(k, 1.12);
          const end = seq([['D4', 0.8], ['F4', 0.8], ['G4', 0.8], ['A4', 1.6], ['C5', 0.8], ['A4', 0.8], ['G4', 1.6], ['F4', 0.8], ['G4', 0.8], ['A4', 0.8], ['F4', 0.8], ['D4', 2.2], ['F4', 0.6], ['D4', 0.6], ['C4', 0.6], ['D4', 2.6]], 0.8, x.erhu, 0.92);
          [['D3', 0.4], ['A2', 3.6], ['C3', 7.0], ['D3', 10.4]].forEach(([n, t]) => x.qin(t, hz(n), 1, 0.3));
          x.pad(0.5, ['D3', 'A3'], end, 0.03); x.wind(0.5, end, 0.035); x.gong(end - 1, 0.6);
        } },
        { name: '四面楚歌', desc: '远处有人齐声唱楚地的歌，忽远忽近，风声里慢慢散掉', play(k) {
          const x = I(k, 1.3);
          const end = seq([['A4', 1.2], ['G4', 0.6], ['F4', 1.2], ['D4', 1.8], ['F4', 0.6], ['G4', 0.6], ['A4', 1.2], ['C5', 0.6], ['A4', 1.8], ['G4', 0.6], ['F4', 0.6], ['D4', 2.6]], 1.0, (t, f, d) => x.voice(t, f, d, 0.06), 1.15);
          seq([[null, 3.0], ['D4', 1.8], [null, 1.8], ['A3', 1.8], [null, 1.2], ['D4', 2.6]], 1.0, (t, f, d) => x.voice(t, f, d, 0.035), 1.15);
          x.wind(0.2, end + 1, 0.06); x.pad(0.5, ['D3'], end, 0.03); x.qin(end - 2.6, hz('D3'), 1, 0.22);
        } },
        { name: '乌江', desc: '江水声，琵琶拨几句往下走的旋律，远处一声钟，江水接着流', play(k) {
          const x = I(k, 2.1); x.water(0, 17, 0.05);
          const end = seq([['A4', 0.9], ['G4', 0.45], ['F4', 0.9], ['D4', 1.8], [null, 0.6], ['C5', 0.9], ['A4', 0.45], ['G4', 0.9], ['F4', 0.9], ['D4', 1.8], [null, 0.4], ['F4', 0.6], ['D4', 0.6], ['C4', 0.6], ['D4', 2.4]], 1.2, (t, f, d) => x.zheng(t, f, d, d >= 1.8 ? 0.2 : 0.17), 1.08);
          x.bell(5.4, hz('D3'), 0.12, 4); x.bell(end - 2.4, hz('A2'), 0.1, 4); x.pad(1, ['D3', 'A3'], end, 0.025);
        } },
      ],
    },
  };
  // 挑定之前用原来那两首（Music.stinger 的老曲子）；PICK.r.win = 1 表示汉胜用第二个方案，以此类推
  //   Ham 10-09 21:38 试听台第二十八批：汉胜用方案三「礼乐」、楚败用方案三「乌江」；汉败留原曲，楚胜三个都没过，也先用原曲
  //   Ham 10-10 试听台第三十批：楚胜挑了「乌骓」「楚凯」两首，随机放（数组 = 从里面随机挑一首）
  //   声音部 10-10 试听台第三十六批：汉胜「礼乐」「未央」随机；汉败原曲（null = 老曲子）和「荥阳」随机
  // 战局开场曲用的乐器（声音部 10-10）：真大鼓（决战鼓那套录音）、真锣、编钟、古筝、古琴；end(t) = t 秒起整体淡出，全长约 3 秒
  const OI = (k, g = 1) => {
    const D = Sfx.ctx.createGain(); D.gain.value = g; D.connect(k.bus());
    const S = (id, t, vol, rate = 1, i) => k.smp(id, { t, vol, rate, rj: 0, pan: 0, dest: D, i });
    const T0 = Sfx.ctx.currentTime;
    return {
      S,
      end: (t = 2.3) => { D.gain.setValueAtTime(g, T0 + t); D.gain.setTargetAtTime(0.0001, T0 + t, 0.22); },
      drum: (t, v = 0.8, r = 0.62) => { S('drum', t, v, r); S('soft', t, v * 0.25, 0.5); },
      gong: (t, v = 0.5, r = 0.8, i = 0) => S('gong', t, v, r, i),
      zheng: (t, n, v = 0.2) => k.pluck(hz(n), { t, vol: v, decay: 0.996, bright: 0.6, dest: D }),
      qin: (t, n, v = 0.3) => k.pluck(hz(n), { t, vol: v, decay: 0.9975, bright: 0.3, dest: D, body: true }),
      bell: (t, n, v = 0.1, len = 2.6) => { const f = hz(n); for (const [r, gg, dd] of [[1, 1, len], [2.0, 0.35, len * 0.6], [2.76, 0.3, len * 0.45], [5.4, 0.12, len * 0.25]]) k.tn({ t, f: f * r, dur: dd, vol: v * gg, dest: D }); },
    };
  };
  const orun = (x, t0, ns, gap = 0.06, v = 0.2) => ns.forEach((n, i) => x.zheng(t0 + i * gap, n, v * (0.7 + 0.3 * i / ns.length)));
  // 战局开场曲（Ham 10-10 试听台第五十批 b53：汉“这俩都行，随机播放”；楚选丙）。开局出「楚汉相争」题字时放，替掉原来的一声锣 + 三下鼓
  T.r.open = [
    { name: '汉 · 丙', desc: '甲的安静版：一下轻鼓，古筝慢慢往上拨，编钟三声，轻锣', play(k) {
      const x = OI(k, 1.6);
      x.drum(0, 0.45, 0.7); x.qin(0, 'D2', 0.26); orun(x, 0.15, ['D4', 'Fs4', 'A4', 'D5'], 0.11, 0.16);
      [['A4', 0.7], ['D5', 1.05], ['Fs5', 1.4]].forEach(([n, t]) => x.bell(t, n, 0.08, n === 'Fs5' ? 1.8 : 1.1));
      x.gong(1.4, 0.18, 1.0); x.bell(1.42, 'D4', 0.04, 1.8); x.end(2.4);
    } },
    { name: '汉 · 丁', desc: '没有鼓：古琴一声低音，编钟和古筝对答一句宫调，一声很轻的锣', play(k) {
      const x = OI(k, 1.7);
      x.qin(0, 'D3', 0.3); x.qin(0.02, 'A2', 0.22);
      [['D5', 0.3], ['E5', 0.55], ['A4', 0.8]].forEach(([n, t]) => x.bell(t, n, 0.08, 1.2));
      [['Fs4', 0.45], ['A4', 0.68], ['B4', 0.92], ['D5', 1.2]].forEach(([n, t]) => x.zheng(t, n, 0.16));
      x.bell(1.25, 'D5', 0.08, 1.8); x.gong(1.25, 0.14, 1.05); x.end(2.4);
    } },
  ];
  T.b.open = [
    { name: '楚 · 丙', desc: '慢：两下沉鼓隔得很开，古琴低音，编钟羽调慢慢往下，一声低锣', play(k) {
      const x = OI(k, 1.7);
      x.drum(0, 0.7, 0.52); x.qin(0, 'D2', 0.32);
      [['A4', 0.35], ['G4', 0.75], ['D4', 1.15]].forEach(([n, t]) => x.bell(t, n, 0.08, n === 'D4' ? 1.8 : 1.3));
      x.drum(1.15, 0.85, 0.5); x.gong(1.17, 0.3, 0.85, 1); x.qin(1.15, 'A1', 0.22); x.end(2.5);
    } },
  ];
  const PICK = { r: { win: [2, 3], lose: [null, 3], open: [0, 1] }, b: { win: [4, 5], lose: 2, open: 0 } };
  return {
    T, PICK,
    // 放一首：side 'r' / 'b'，kind 'win' / 'lose'；n 不给就用挑定的那个。挑定之前返回 false（调用的地方照旧放老曲子）
    play(side, kind, n) { const L = (T[side] || {})[kind]; let i = n == null ? (PICK[side] || {})[kind] : n; if (Array.isArray(i)) i = i[Math.floor(Math.random() * i.length)]; if (!L || i == null || !L[i] || !Sfx.ctx) return false; Sfx.Music.stop(); L[i].play(Sfx.kit); return true; },
    // 放战局开场曲：side 'r' / 'b'。和 play 不同，不停背景音乐（开局时背景音乐已经起了）；没有就返回 false（调用处照旧放锣鼓）
    open(side) { const L = (T[side] || {}).open; let i = (PICK[side] || {}).open; if (Array.isArray(i)) i = i[Math.floor(Math.random() * i.length)]; if (!L || i == null || !L[i] || !Sfx.ctx) return false; L[i].play(Sfx.kit); return true; },
    // 出试听样：离线渲染一首，返回 16 位 WAV 的 base64（tools/tunes.py 调）
    async renderWav(side, kind, n, sec = 22) {
      const buf = await Sfx.renderOffline(() => { if (side === 'old') Sfx.Music.stinger(kind); else T[side][kind][n].play(Sfx.kit); }, sec);
      const ch = [buf.getChannelData(0), buf.getChannelData(1)], len = buf.length, out = new DataView(new ArrayBuffer(44 + len * 4));
      const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); out.setUint32(4, 36 + len * 4, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
      out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * 4, true);
      for (let i = 0, o = 44; i < len; i++) for (let c = 0; c < 2; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
      let s = ''; const u = new Uint8Array(out.buffer); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    },
  };
})();
