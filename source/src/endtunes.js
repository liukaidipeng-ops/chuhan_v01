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
          const x = I(k, 2.0); const b = 0.55;
          const end = seq([['D5', b * 2], ['A4', b], ['B4', b], ['D5', b * 2], ['E5', b], ['D5', b], ['B4', b * 2], ['A4', b * 2], ['Fs4', b], ['A4', b], ['D5', b * 4]], 0.4, (t, f, d) => x.bell(t, f, 0.11, Math.max(1.6, d * 2)));
          for (let i = 0; i < 16; i++) x.zheng(0.4 + i * b, hz(['D3', 'A3', 'D4', 'Fs4', 'A3', 'E4', 'A4', 'E4'][i % 8]), b, 0.16);
          for (let i = 0; i < 8; i++) x.taiko(0.4 + i * b * 2, i % 2 ? 0.35 : 0.55, 0.85);
          x.pad(end - b * 4, ['D3', 'A3', 'Fs4'], 3.6, 0.035); x.gong(end - 0.6, 0.5);
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
      ],
      lose: [
        { name: '垓下', desc: '二胡拉「力拔山兮」的悲歌，古琴低音垫底，最后一声沉沉的锣', play(k) {
          const x = I(k, 1.12);
          const end = seq([['D4', 0.8], ['F4', 0.8], ['G4', 0.8], ['A4', 1.6], ['C5', 0.8], ['A4', 0.8], ['G4', 1.6], ['F4', 0.8], ['G4', 0.8], ['A4', 0.8], ['F4', 0.8], ['D4', 2.2], ['F4', 0.6], ['D4', 0.6], ['C4', 0.6], ['D4', 2.6]], 0.8, x.erhu);
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
  const PICK = { r: { win: null, lose: null }, b: { win: null, lose: null } };
  return {
    T, PICK,
    // 放一首：side 'r' / 'b'，kind 'win' / 'lose'；n 不给就用挑定的那个。挑定之前返回 false（调用的地方照旧放老曲子）
    play(side, kind, n) { const L = (T[side] || {})[kind], i = n == null ? (PICK[side] || {})[kind] : n; if (!L || i == null || !L[i] || !Sfx.ctx) return false; Sfx.Music.stop(); L[i].play(Sfx.kit); return true; },
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
