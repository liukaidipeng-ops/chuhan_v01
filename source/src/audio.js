// ===== 声音：合成音效、程序化配乐、配音播放（无外部音频文件，配音为内嵌 MP3） =====
const Sfx = (() => {
  let ctx = null, master, comp, sfxBus, musicBus, voiceBus, verb, sfxSend, musicSend;
  const vol = { sfx: 0.9, music: 0.55, voice: 1 };
  let enabled = true;
  const R = (a, b) => a + Math.random() * (b - a);

  function makeIR(sec = 2.0, decay = 3) {
    const sr = ctx.sampleRate, n = Math.floor(sr * sec);
    const buf = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; // 柔化高频
        d[i] = lp * Math.pow(1 - t, decay) * (i < sr * 0.01 ? 0 : 1);
      }
      // 早期反射
      for (let k = 0; k < 8; k++) { const i = Math.floor(sr * (0.012 + k * 0.011 + Math.random() * 0.01)); if (i < n) d[i] += (Math.random() - 0.5) * 0.8; }
    }
    return buf;
  }
  const NOAUDIO = (() => { try { return !!localStorage.getItem('xq3d-noaudio'); } catch (e) { return false; } })();
  function init() {
    if (NOAUDIO) return;
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    master = ctx.createGain(); master.gain.value = enabled ? 1 : 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = makeIR();
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.9;
    verb.connect(verbOut); verbOut.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = vol.music; musicBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = vol.voice; voiceBus.connect(master);
    sfxSend = ctx.createGain(); sfxSend.gain.value = 0.22; sfxBus.connect(sfxSend); sfxSend.connect(verb);
    musicSend = ctx.createGain(); musicSend.gain.value = 0.45; musicBus.connect(musicSend); musicSend.connect(verb);
    const vs = ctx.createGain(); vs.gain.value = 0.12; voiceBus.connect(vs); vs.connect(verb);
    startAmbient();
    // iOS 静音键：用一段无声 <audio> 把会话切到"播放"类别
    try {
      const a = document.createElement('audio');
      a.setAttribute('playsinline', ''); a.loop = true; a.volume = 0.01;
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      a.play().catch(() => { });
    } catch (e) { }
  }
  const now = () => ctx.currentTime;
  const ok = () => !!ctx;
  let _nb = null;
  function nb() {
    if (_nb) return _nb;
    const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (_nb = b);
  }
  function out(dest, pan) {
    if (pan === undefined || !ctx.createStereoPanner) return dest;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(dest); return p;
  }
  function env(g, T, a, peak, dec, hold = 0) {
    g.gain.setValueAtTime(0.0001, T);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), T + a);
    if (hold) g.gain.setValueAtTime(Math.max(0.0002, peak), T + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, T + a + hold + dec);
  }
  // 噪声
  function nz({ t = 0, dur = 0.3, type = 'lowpass', f = 800, f2, q = 1, vol = 0.4, a = 0.004, hold = 0, pan, dest } = {}) {
    if (!ok()) return;
    const T = now() + Math.max(0, t);
    const s = ctx.createBufferSource(); s.buffer = nb(); s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, T); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, T + a + hold + dur);
    const g = ctx.createGain(); env(g, T, a, vol, dur, hold);
    s.connect(fl); fl.connect(g); g.connect(out(dest || sfxBus, pan));
    s.start(T, Math.random() * 2); s.stop(T + a + hold + dur + 0.05);
  }
  // 音调
  function tn({ t = 0, f = 200, f2, dur = 0.4, type = 'sine', vol = 0.3, a = 0.004, hold = 0, pan, dest, vib = 0, vibF = 5.5, glide } = {}) {
    if (!ok()) return;
    const T = now() + Math.max(0, t);
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, T);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + (glide || (a + hold + dur)));
    if (vib) { const l = ctx.createOscillator(); l.frequency.value = vibF; const lg = ctx.createGain(); lg.gain.value = f * vib; l.connect(lg); lg.connect(o.frequency); l.start(T); l.stop(T + a + hold + dur + 0.1); }
    const g = ctx.createGain(); env(g, T, a, vol, dur, hold);
    o.connect(g); g.connect(out(dest || sfxBus, pan)); o.start(T); o.stop(T + a + hold + dur + 0.05);
  }
  // 滤波音色（号角、二胡、弦乐）
  function voiceOsc({ t = 0, f = 110, dur = 1, vol = 0.2, type = 'sawtooth', cut = 900, cut2, q = 1, a = 0.06, rel = 0.3, vib = 0, vibF = 5, detune = 0, pan, dest, bend } = {}) {
    if (!ok()) return;
    const T = now() + Math.max(0, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(vol, T + a); g.gain.setValueAtTime(vol, T + Math.max(a, dur - rel)); g.gain.linearRampToValueAtTime(0.0001, T + dur);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = q; fl.frequency.setValueAtTime(cut, T);
    if (cut2) fl.frequency.linearRampToValueAtTime(cut2, T + dur * 0.6);
    fl.connect(g); g.connect(out(dest || sfxBus, pan));
    for (const dt of detune ? [-detune, detune] : [0]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(bend ? f * bend : f, T); o.detune.value = dt;
      if (bend) o.frequency.exponentialRampToValueAtTime(f, T + Math.min(0.25, dur * 0.3));
      if (vib) { const l = ctx.createOscillator(); l.frequency.value = vibF; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, T); lg.gain.linearRampToValueAtTime(f * vib, T + dur * 0.4); l.connect(lg); lg.connect(o.frequency); l.start(T); l.stop(T + dur + 0.1); }
      o.connect(fl); o.start(T); o.stop(T + dur + 0.05);
    }
  }
  // 拨弦（Karplus-Strong）缓存
  const ksCache = new Map();
  function ksBuf(freq, decay = 0.996, bright = 0.5, sec = 3) {
    const key = Math.round(freq * 10) + '_' + decay + '_' + bright;
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.max(2, Math.floor(sr / freq)); const ring = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { lp = lp * (1 - bright) + (Math.random() * 2 - 1) * bright; ring[i] = lp; }
    let idx = 0;
    for (let i = 0; i < len; i++) { const nx = (idx + 1) % N; const v = (ring[idx] + ring[nx]) * 0.5 * decay; d[i] = ring[idx]; ring[idx] = v; idx = nx; }
    if (ksCache.size > 120) ksCache.delete(ksCache.keys().next().value);
    ksCache.set(key, buf);
    return buf;
  }
  function pluck(freq, { t = 0, vol = 0.3, decay = 0.996, bright = 0.5, pan, dest, slide, cut = 2600 } = {}) {
    if (!ok()) return;
    const T = now() + Math.max(0, t);
    const s = ctx.createBufferSource(); s.buffer = ksBuf(freq, decay, bright);
    if (slide) { s.playbackRate.setValueAtTime(1, T + 0.25); s.playbackRate.linearRampToValueAtTime(slide, T + 0.7); }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(lp); lp.connect(g); g.connect(out(dest || sfxBus, pan)); s.start(T);
  }

  // ---------- 基础音效 ----------
  const B = {
    taiko(t = 0, v = 0.9, p = 1, pan) {
      tn({ t, f: 72 * p, f2: 44 * p, dur: 0.7, vol: v, pan, glide: 0.3 });
      tn({ t, f: 120 * p, f2: 80 * p, dur: 0.25, vol: v * 0.4, pan });
      nz({ t, dur: 0.08, type: 'bandpass', f: 900 * p, q: 1.2, vol: v * 0.35, pan });
      nz({ t, dur: 0.3, type: 'lowpass', f: 220, vol: v * 0.45, pan });
    },
    shime(t = 0, v = 0.4, pan) { tn({ t, f: 330, f2: 250, dur: 0.12, vol: v * 0.5, pan }); nz({ t, dur: 0.05, type: 'bandpass', f: 2500, q: 2, vol: v * 0.5, pan }); },
    step(t = 0, v = 0.3, pan) { nz({ t, dur: 0.07, type: 'lowpass', f: R(300, 520), vol: v, pan }); nz({ t, dur: 0.02, type: 'bandpass', f: R(1500, 2500), q: 1.5, vol: v * 0.25, pan }); },
    march(t = 0, dur = 1.5, men = 12, v = 0.25) {
      for (let i = 0; i < men; i++) { const off = R(0, 0.12), pan = R(-0.7, 0.7); for (let k = 0; k * 0.5 < dur; k++) B.step(t + k * 0.5 + off, v * R(0.6, 1), pan); }
      for (let k = 0; k * 0.25 < dur; k++) nz({ t: t + k * 0.25 + R(0, 0.05), dur: 0.05, type: 'highpass', f: 5500, vol: 0.05 });
    },
    clang(t = 0, v = 0.3, pan) {
      const f0 = R(600, 1100);
      for (const [r, dv, d] of [[1, 1, 0.9], [2.76, 0.6, 0.6], [5.4, 0.45, 0.4], [8.93, 0.3, 0.25], [13.3, 0.2, 0.15]]) tn({ t, f: f0 * r, dur: d, vol: v * dv * 0.35, pan });
      nz({ t, dur: 0.04, type: 'highpass', f: 3000, vol: v * 0.8, pan });
    },
    ring(t = 0, v = 0.25) { nz({ t, dur: 0.4, type: 'bandpass', f: 1800, f2: 6500, q: 3, vol: v, a: 0.05 }); tn({ t: t + 0.25, f: 3300, dur: 1.2, vol: v * 0.25 }); tn({ t: t + 0.25, f: 5120, dur: 0.8, vol: v * 0.12 }); },
    whoosh(t = 0, dur = 0.35, v = 0.35, pan) { nz({ t, dur, type: 'bandpass', f: 350, f2: 2600, q: 2.5, vol: v, a: dur * 0.5, pan }); },
    thud(t = 0, v = 0.6) { tn({ t, f: 110, f2: 50, dur: 0.25, vol: v }); nz({ t, dur: 0.12, type: 'lowpass', f: 400, vol: v * 0.7 }); },
    shout(t = 0, n = 8, v = 0.12, len = 0.6) {
      for (let i = 0; i < n; i++) {
        const tt = t + R(0, 0.15), f = R(95, 170), pan = R(-0.8, 0.8), d = len * R(0.7, 1.3);
        for (const [fm, q, g] of [[R(650, 800), 6, 1], [R(1100, 1300), 7, 0.6], [2500, 5, 0.25]]) {
          if (!ok()) return;
          const T = now() + tt;
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, T); o.frequency.exponentialRampToValueAtTime(f * 0.85, T + d);
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm; bp.Q.value = q;
          const gg = ctx.createGain(); env(gg, T, 0.05, v * g, d * 0.8, d * 0.2);
          o.connect(bp); bp.connect(gg); gg.connect(out(sfxBus, pan)); o.start(T); o.stop(T + d + 0.1);
        }
        nz({ t: tt, dur: d, type: 'bandpass', f: 1500, q: 1, vol: v * 0.2, a: 0.05, pan });
      }
    },
    hooves(t = 0, dur = 1.5, horses = 1, v = 0.3, rate = 0.36) {
      for (let h = 0; h < horses; h++) {
        const off = R(0, rate), pan = R(-0.6, 0.6);
        for (let k = 0; k * rate < dur; k++) for (const s of [0, 0.07, 0.15]) {
          const tt = t + off + k * rate + s + R(0, 0.012);
          nz({ t: tt, dur: 0.06, type: 'lowpass', f: R(170, 260), vol: v, pan });
          nz({ t: tt, dur: 0.018, type: 'bandpass', f: R(900, 1400), q: 2, vol: v * 0.35, pan });
        }
      }
    },
    neigh(t = 0, v = 0.12) {
      if (!ok()) return;
      const T = now() + t;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, T); o.frequency.linearRampToValueAtTime(980, T + 0.18); o.frequency.linearRampToValueAtTime(760, T + 0.5); o.frequency.linearRampToValueAtTime(420, T + 1.0);
      const l = ctx.createOscillator(); l.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 70; l.connect(lg); lg.connect(o.frequency);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(v, T + 0.08); g.gain.setValueAtTime(v, T + 0.7); g.gain.linearRampToValueAtTime(0.0001, T + 1.05);
      const m = ctx.createGain();
      for (const [fm, q] of [[1100, 4], [2600, 5]]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm; bp.Q.value = q; o.connect(bp); bp.connect(m); }
      m.connect(g); g.connect(sfxBus);
      o.start(T); l.start(T); o.stop(T + 1.1); l.stop(T + 1.1);
      nz({ t: t + 0.9, dur: 0.35, type: 'bandpass', f: 700, q: 1, vol: v * 0.8 });
    },
    wheels(t = 0, dur = 1.5, v = 0.45) {
      nz({ t, dur, type: 'lowpass', f: 140, vol: v, a: 0.2, hold: dur * 0.5 });
      for (let k = 0; k < dur / 0.3; k++) tn({ t: t + k * 0.3 + R(0, 0.1), f: R(380, 560), f2: R(300, 700), dur: 0.12, type: 'sawtooth', vol: 0.025 });
    },
    whip(t = 0) { nz({ t, dur: 0.06, type: 'highpass', f: 2500, vol: 0.6 }); nz({ t: t - 0.08, dur: 0.08, type: 'bandpass', f: 800, f2: 3000, q: 2, vol: 0.2, a: 0.07 }); },
    horn(t = 0, dur = 2.2, f = 98, v = 0.2) {
      voiceOsc({ t, f, dur, vol: v, cut: 350, cut2: 1400, q: 2, a: 0.25, rel: 0.6, vib: 0.006, detune: 6, bend: 0.8 });
      voiceOsc({ t, f: f / 2, dur, vol: v * 0.6, type: 'square', cut: 250, cut2: 600, a: 0.3, rel: 0.6, bend: 0.8 });
    },
    boom(t = 0, big = 1) {
      tn({ t, f: 60, f2: 26, dur: 1.6 * big, vol: 1 });
      nz({ t, dur: 1.8 * big, type: 'lowpass', f: 1600, f2: 90, vol: 0.9 });
      nz({ t, dur: 0.2, type: 'highpass', f: 1800, vol: 0.45 });
      for (let i = 0; i < 12 * big; i++) nz({ t: t + 0.3 + R(0, 1.2), dur: 0.03, type: 'bandpass', f: R(1500, 4000), q: 2, vol: 0.12, pan: R(-1, 1) });
    },
    cannon(t = 0) { B.boom(t, 0.75); nz({ t, dur: 0.1, type: 'bandpass', f: 280, q: 0.7, vol: 1 }); nz({ t: t + 0.05, dur: 2.2, type: 'lowpass', f: 300, f2: 80, vol: 0.35, a: 0.1 }); },
    fuse(t = 0, dur = 0.5) { for (let i = 0; i < dur / 0.03; i++) nz({ t: t + i * 0.03, dur: 0.02, type: 'highpass', f: R(3000, 7000), vol: R(0.05, 0.14) }); },
    whistle(t = 0, dur = 1) { tn({ t, f: 1500, f2: 520, dur, vol: 0.05, a: 0.1 }); nz({ t, dur, type: 'bandpass', f: 1200, f2: 500, q: 8, vol: 0.08, a: 0.1 }); },
    bowDraw(t = 0) { for (let i = 0; i < 6; i++) tn({ t: t + i * 0.05, f: R(70, 95), dur: 0.06, type: 'sawtooth', vol: 0.03 }); nz({ t, dur: 0.4, type: 'bandpass', f: 900, q: 5, vol: 0.06, a: 0.3 }); },
    twang(t = 0, n = 7) { for (let i = 0; i < n; i++) { pluck(R(95, 140), { t: t + R(0, 0.12), vol: 0.35, decay: 0.985, bright: 0.9, pan: R(-0.7, 0.7) }); nz({ t: t + R(0, 0.1), dur: 0.02, type: 'highpass', f: 3000, vol: 0.12 }); } },
    arrows(t = 0, n = 14) { for (let i = 0; i < n; i++) nz({ t: t + i * 0.03 + R(0, 0.05), dur: 0.35, type: 'bandpass', f: R(1800, 3200), f2: 900, q: 6, vol: 0.1, pan: R(-0.8, 0.8) }); },
    thunks(t = 0, n = 10) { for (let i = 0; i < n; i++) { const tt = t + i * 0.035 + R(0, 0.04); nz({ t: tt, dur: 0.05, type: 'bandpass', f: R(500, 900), q: 3, vol: 0.28 }); tn({ t: tt, f: R(180, 260), f2: 120, dur: 0.08, type: 'triangle', vol: 0.1 }); } },
    splash(t = 0, v = 0.3) { nz({ t, dur: 0.45, type: 'highpass', f: 900, f2: 3200, vol: v }); nz({ t, dur: 0.3, type: 'lowpass', f: 600, vol: v * 0.8 }); for (let i = 0; i < 5; i++) tn({ t: t + R(0.05, 0.4), f: R(400, 900), f2: R(1000, 1800), dur: 0.03, vol: 0.04 }); },
    water(t = 0, dur = 2.5, v = 0.2) {
      nz({ t, dur, type: 'bandpass', f: 700, f2: 900, q: 0.8, vol: v, a: 0.4, hold: dur * 0.4 });
      for (let i = 0; i < dur * 9; i++) tn({ t: t + R(0, dur), f: R(300, 700), f2: R(800, 1600), dur: 0.035, vol: 0.035, pan: R(-0.6, 0.6) });
    },
    creak(t = 0, v = 0.05) { tn({ t, f: R(160, 220), f2: R(120, 300), dur: R(0.25, 0.5), type: 'sawtooth', vol: v, a: 0.05 }); },
    sail(t = 0, dur = 2) { for (let k = 0; k < dur / 0.13; k++) nz({ t: t + k * 0.13 + R(0, 0.04), dur: 0.1, type: 'lowpass', f: R(500, 900), vol: R(0.04, 0.1), a: 0.02 }); },
    wood(t = 0, v = 0.5) { nz({ t, dur: 0.06, type: 'bandpass', f: 1400, q: 2.5, vol: v }); tn({ t, f: 420, f2: 260, dur: 0.1, type: 'triangle', vol: v * 0.4 }); },
    crack(t = 0) { nz({ t, dur: 0.15, type: 'bandpass', f: 1800, q: 1.2, vol: 0.6 }); tn({ t, f: 180, f2: 90, dur: 0.2, type: 'triangle', vol: 0.3 }); for (let i = 0; i < 6; i++) nz({ t: t + R(0.05, 0.6), dur: 0.03, type: 'bandpass', f: R(900, 2000), q: 3, vol: 0.12 }); },
    gong(t = 0, v = 1) { for (const [f, g, d] of [[98, 0.45, 5], [147, 0.25, 4], [233, 0.15, 3.5], [311, 0.1, 3], [415, 0.06, 2]]) tn({ t, f, f2: f * 0.985, dur: d, vol: g * v, a: 0.01 }); nz({ t, dur: 0.3, type: 'bandpass', f: 600, q: 1, vol: 0.15 * v }); },
    bell(t = 0, f = 880, v = 0.12) { for (const [r, g, d] of [[1, 1, 2.4], [2.7, 0.4, 1.4], [5.1, 0.2, 0.8]]) tn({ t, f: f * r, dur: d, vol: v * g, dest: musicBus }); },
    tick(t = 0, v = 0.3) { tn({ t, f: 1150, f2: 900, dur: 0.05, vol: v }); nz({ t, dur: 0.015, type: 'highpass', f: 4000, vol: v * 0.5 }); },
    cheer(t = 0) { B.shout(t, 10, 0.07, 0.9); for (let i = 0; i < 3; i++) B.shime(t + i * 0.18, 0.3); },
  };

  // ---------- 各兵种音效套组 ----------
  const U = {
    // 兵卒：慢速擂鼓 + 大量脚步
    p: {
      move(dur = 1.3) { for (let k = 0; k * 0.62 < dur + 0.3; k++) B.taiko(k * 0.62, 0.45, 1.05); B.march(0.1, dur, 14, 0.2); },
      charge(dur = 1) { for (let k = 0; k < 10; k++) B.taiko(k * 0.1, 0.35 + k * 0.03, 1.1); B.shout(0.05, 12, 0.1, 0.8); B.march(0, dur, 12, 0.3); },
      impact() { B.clang(0, 0.4, -0.3); B.clang(0.07, 0.35, 0.3); B.clang(0.16, 0.3); B.thud(0.02, 0.5); B.shout(0.05, 6, 0.08, 0.5); },
    },
    // 车：车轮滚动、驷马小跑、扬鞭
    r: {
      move(dur = 1) { B.whip(0); B.wheels(0.05, dur + 0.2, 0.4); B.hooves(0.05, dur, 2, 0.18, 0.3); },
      charge(dur = 2) { B.horn(0, 1.4, 110, 0.18); for (let k = 0; k < 8; k++) B.taiko(0.1 + k * 0.14, 0.4, 1); B.whip(0.3); B.wheels(0.3, dur, 0.6); B.hooves(0.3, dur, 4, 0.3, 0.26); B.neigh(0.5, 0.1); B.shout(0.4, 6, 0.08); },
      impact() { B.crack(0); B.boom(0, 0.45); B.clang(0.03, 0.35); B.neigh(0.15, 0.09); for (let i = 0; i < 8; i++) B.wood(R(0.05, 0.6), 0.25); },
    },
    // 马：单骑奔驰、嘶鸣、拔刀
    n: {
      move() { B.hooves(0, 0.55, 1, 0.3, 0.3); nz({ t: 0.5, dur: 0.25, type: 'bandpass', f: 600, q: 1.5, vol: 0.12 }); },
      charge(dur = 1.8) { B.neigh(0, 0.12); B.ring(0.35, 0.25); B.hooves(0.2, dur, 3, 0.34, 0.3); for (let k = 0; k < 6; k++) B.taiko(0.2 + k * 0.2, 0.35, 1.2); B.shout(0.5, 5, 0.08); },
      impact() { B.whoosh(0, 0.18, 0.5); B.clang(0.12, 0.45); B.thud(0.13, 0.55); nz({ t: 0.14, dur: 0.2, type: 'bandpass', f: 500, q: 1, vol: 0.3 }); B.shout(0.2, 4, 0.08, 0.4); },
    },
    // 炮：炮车吱呀、点火、齐射
    c: {
      move(dur = 0.8) { B.wheels(0, dur, 0.35); B.creak(0.1, 0.06); B.creak(0.4, 0.05); },
      ready() { B.taiko(0, 0.7); B.taiko(0.25, 0.7); B.taiko(0.5, 0.9, 0.9); B.creak(0.6, 0.06); },
      fire(i) { B.fuse(0, 0.12); B.cannon(0.12); B.whistle(0.3, 0.9); },
      explode(big) { B.boom(0, big ? 1.3 : 0.8); },
    },
    // 相象：弓手步行、张弓、箭雨
    e: {
      move(dur = 0.7) { B.march(0, dur, 4, 0.15); nz({ t: 0, dur: dur, type: 'highpass', f: 5000, vol: 0.03 }); },
      draw() { B.bowDraw(0); B.bowDraw(0.1); B.taiko(0, 0.4); },
      release() { B.twang(0, 9); B.arrows(0.08, 18); },
      impact() { B.thunks(0, 14); B.shout(0.1, 3, 0.06, 0.4); },
    },
    // 士：甲叶叮当的步伐、刀盾
    a: {
      move() { for (let k = 0; k < 3; k++) { B.step(k * 0.15, 0.3); nz({ t: k * 0.15, dur: 0.05, type: 'highpass', f: 4500, vol: 0.08 }); } },
      charge() { B.ring(0, 0.22); B.ring(0.08, 0.2); B.shout(0.2, 3, 0.1, 0.5); B.march(0.2, 0.5, 2, 0.3); },
      impact() { B.whoosh(0, 0.12, 0.45); B.clang(0.05, 0.45, -0.4); B.clang(0.13, 0.45, 0.4); B.thud(0.14, 0.4); },
    },
    // 帅将：号角、铜锣、万钧一击
    k: {
      move() { B.gong(0, 0.35); B.step(0.05, 0.35); B.step(0.3, 0.3); },
      charge() { B.horn(0, 1.8, 98, 0.22); B.gong(0.1, 0.8); for (let k = 0; k < 6; k++) B.taiko(0.2 + k * 0.15, 0.5, 0.9); },
      impact() { B.whoosh(0, 0.25, 0.6); B.boom(0.05, 0.7); B.clang(0.06, 0.5); B.shout(0.2, 12, 0.08, 0.8); },
    },
  };
  // 渡河：水流、撑篙、船身吱呀、帆布
  function river(dur = 2.2) { B.water(0, dur + 0.5, 0.18); B.splash(0.1, 0.18); for (let k = 0; k < 3; k++) { B.splash(0.5 + k * 0.55, 0.12); B.creak(0.4 + k * 0.55, 0.05); } B.sail(0.2, dur); }

  // ---------- 程序化配乐 ----------
  const N = { D2: 73.42, F2: 87.31, G2: 98, A2: 110, C3: 130.81, D3: 146.83, F3: 174.61, G3: 196, A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880, Fs4: 369.99, Fs5: 739.99, B3: 246.94, E3: 164.81 };
  const ZEN_SCALE = [N.D3, N.F3, N.G3, N.A3, N.C4, N.D4, N.F4, N.G4, N.A4, N.C5, N.D5];
  const Music = {
    style: 'zen', on: false, next: 0, bar: 0, timer: null, pad: null, duckG: null, idx: 5,
    start(style) {
      if (!ok()) return;
      if (style) this.style = style;
      this.stop(true);
      if (this.style === 'off') return;
      this.on = true; this.bar = 0; this.next = now() + 0.2;
      this.bus = ctx.createGain(); this.bus.gain.setValueAtTime(0.0001, now()); this.bus.gain.exponentialRampToValueAtTime(1, now() + 3); this.bus.connect(musicBus);
      this.startPad();
      this.timer = setInterval(() => this.tick(), 120);
    },
    stop(fast) {
      this.on = false;
      clearInterval(this.timer); this.timer = null;
      if (this.bus && ok()) { const b = this.bus; b.gain.cancelScheduledValues(now()); b.gain.setValueAtTime(b.gain.value, now()); b.gain.linearRampToValueAtTime(0.0001, now() + (fast ? 0.4 : 2.5)); setTimeout(() => { try { b.disconnect(); } catch (e) { } }, 3000); }
      this.bus = null;
    },
    duck(on) { if (this.bus && ok()) { this.bus.gain.cancelScheduledValues(now()); this.bus.gain.linearRampToValueAtTime(on ? 0.25 : 1, now() + 0.8); } },
    startPad() {
      const b = this.bus;
      const notes = this.style === 'zen' ? [N.D2, N.A2, N.D3] : [N.D2 / 2 * 2, N.A2 / 2 * 2];
      for (const f of notes) {
        for (const d of [-7, 7]) {
          const o = ctx.createOscillator(); o.type = this.style === 'zen' ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = d;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = this.style === 'zen' ? 500 : 260;
          const l = ctx.createOscillator(); l.frequency.value = 0.07 + Math.random() * 0.05; const lg = ctx.createGain(); lg.gain.value = this.style === 'zen' ? 200 : 120; l.connect(lg); lg.connect(lp.frequency);
          const g = ctx.createGain(); g.gain.value = this.style === 'zen' ? 0.018 : 0.025;
          o.connect(lp); lp.connect(g); g.connect(b); o.start(); l.start();
          const stopAt = () => { try { o.stop(now() + 3); l.stop(now() + 3); } catch (e) { } };
          const bb = b; const iv = setInterval(() => { if (this.bus !== bb) { stopAt(); clearInterval(iv); } }, 500);
        }
      }
    },
    tick() {
      if (!this.on || !ok()) return;
      while (this.next < now() + 0.8) {
        const t = this.next - now();
        if (this.style === 'zen') this.next += this.zenBar(t); else this.next += this.warBar(t);
        this.bar++;
      }
    },
    // 禅意：古琴随性拨奏 + 箫 + 磬
    zenBar(t) {
      const dest = this.bus, len = 5.2;
      let tt = t + R(0, 0.3);
      const notes = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++) {
        this.idx = Math.max(0, Math.min(ZEN_SCALE.length - 1, this.idx + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
        const f = ZEN_SCALE[this.idx];
        pluck(f, { t: tt, vol: 0.32, decay: 0.9975, bright: 0.35, dest, pan: R(-0.3, 0.3), slide: Math.random() < 0.18 ? (Math.random() < 0.5 ? 1.059 : 0.944) : 0, cut: 2000 });
        if (Math.random() < 0.25) pluck(f / 2, { t: tt + 0.02, vol: 0.18, decay: 0.998, bright: 0.2, dest });
        tt += [0.55, 0.8, 1.1, 1.4][Math.floor(Math.random() * 4)];
      }
      if (this.bar % 3 === 1) {
        const f = [N.A4, N.G4, N.D5, N.F4][Math.floor(Math.random() * 4)];
        voiceOsc({ t: t + 1.2, f, dur: 3.2, vol: 0.05, type: 'sine', cut: 2400, a: 0.6, rel: 1.4, vib: 0.006, vibF: 4.8, dest });
        nz({ t: t + 1.2, dur: 3, type: 'bandpass', f: f * 2, q: 10, vol: 0.012, a: 0.6, dest });
      }
      if (this.bar % 4 === 0) B.bell(t + 0.1, [N.A5, N.D5 * 2][this.bar % 8 ? 0 : 1] / 2, 0.06);
      return len;
    },
    // 战意：太鼓阵 + 低音弦乐律动 + 琵琶轮指 + 号角与呐喊
    warBar(t) {
      const dest = this.bus, beat = 60 / 98, len = beat * 4;
      const phrase = this.bar % 8;
      const pats = [
        [1, 0, 0, 0.5, 0, 0, 1, 0, 1, 0, 0, 0.5, 0, 0.6, 0.8, 0],
        [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0.6, 0.7, 0.8],
      ];
      const pat = phrase === 7 ? [1, 0.5, 0.6, 0.7, 1, 0.6, 0.7, 0.8, 1, 0.7, 0.8, 0.9, 1, 0.9, 1, 1] : pats[phrase % 2];
      pat.forEach((v, i) => { if (v) taikoTo(dest, t + i * beat / 4, v * 0.55, i % 4 === 0 ? 0.95 : 1.1); });
      for (let i = 0; i < 8; i++) if (i % 2 || Math.random() < 0.4) shimeTo(dest, t + i * beat / 2 + beat / 4, 0.12);
      // 低音弦乐八分律动
      const bass = [[N.D2, N.D2, N.D2, N.F2], [N.C3 / 2, N.C3 / 2, N.D2, N.D2], [N.D2, N.D2, N.F2, N.G2], [N.A2 / 2 * 1, N.G2 / 2 * 1, N.F2, N.D2]][Math.floor(this.bar / 2) % 4];
      for (let i = 0; i < 8; i++) voiceOsc({ t: t + i * beat / 2, f: bass[Math.floor(i / 2)] * 2, dur: beat / 2 * 0.9, vol: 0.055, cut: 520, cut2: 300, a: 0.01, rel: 0.1, detune: 9, dest });
      // 琵琶轮指
      if (phrase === 2 || phrase === 6) {
        const mel = phrase === 2 ? [N.D4, N.F4, N.G4, N.A4] : [N.C5, N.A4, N.G4, N.F4];
        mel.forEach((f, j) => { for (let k = 0; k < 7; k++) pluck(f, { t: t + j * beat + k * 0.065, vol: 0.13 - k * 0.008, decay: 0.99, bright: 0.8, dest, pan: 0.3, cut: 4000 }); });
      }
      if (phrase === 0 && this.bar % 16 === 0) { hornTo(dest, t, beat * 3, N.D2 * 2 * 0.75 * 2 / 1.5); }
      if (phrase === 4) shoutTo(t + beat * 3, 8);
      if (phrase === 7) nz({ t: t + beat * 2, dur: beat * 2, type: 'highpass', f: 3000, f2: 8000, vol: 0.04, a: beat * 1.8, dest });
      return len;
    },
    // 胜负终曲
    stinger(kind) {
      if (!ok()) return;
      this.stop();
      const dest = musicBus;
      if (kind === 'win') {
        // 激昂：鼓阵 + 号角齐鸣 + 宫调凯歌
        [0, 0.3, 0.6, 0.75, 0.9, 1.2].forEach((t, i) => taikoTo(dest, t, 0.8, i % 2 ? 1.1 : 0.9));
        B.gong(1.2, 1);
        const mel = [[N.D4, 0.5], [N.Fs4, 0.5], [N.A4, 0.9], [N.D5, 1.4], [N.B4, 0.5], [N.A4, 0.5], [N.D5, 0.6], [N.E5, 0.6], [N.Fs5, 2.4]];
        let tt = 1.3;
        for (const [f, d] of mel) {
          voiceOsc({ t: tt, f, dur: d * 1.05, vol: 0.14, cut: 900, cut2: 2600, q: 1.5, a: 0.05, rel: 0.2, vib: 0.005, detune: 8, dest });
          voiceOsc({ t: tt, f: f / 2, dur: d * 1.05, vol: 0.08, type: 'square', cut: 700, a: 0.05, rel: 0.2, dest });
          tt += d;
        }
        for (let k = 0; k < 16; k++) taikoTo(dest, 1.3 + k * 0.33, k % 4 === 0 ? 0.7 : 0.35, k % 4 === 0 ? 0.9 : 1.15);
        hornTo(dest, 1.3, 3, N.D2 * 2);
        B.shout(2.0, 16, 0.08, 1.0); B.shout(5.0, 16, 0.09, 1.2);
        B.gong(tt - 0.4, 1);
        [N.D3, N.A3, N.D4, N.Fs4].forEach(f => voiceOsc({ t: tt - 2.4, f, dur: 4, vol: 0.05, cut: 1200, a: 0.3, rel: 2, detune: 6, dest }));
      } else {
        // 悲怆：二胡如泣 + 古琴低吟 + 风声
        const erhu = (t, f, d, v = 0.11) => voiceOsc({ t, f, dur: d, vol: v, cut: 1500, q: 3, a: 0.25, rel: 0.5, vib: 0.012, vibF: 5.5, dest, bend: 0.97 });
        const mel = [[N.A4, 1.6], [N.G4, 0.8], [N.F4, 1.2], [N.D4, 2.4], [N.F4, 0.8], [N.G4, 0.8], [N.A4, 1.2], [N.C5, 0.8], [N.A4, 1.2], [N.G4, 0.8], [N.F4, 0.8], [N.D4, 3.4]];
        let tt = 0.8;
        for (const [f, d] of mel) { erhu(tt, f, d * 1.05); tt += d; }
        [N.D2 * 2, N.A2, N.D2 * 2, N.F2 * 2].forEach((f, i) => pluck(f, { t: 0.4 + i * 3.4, vol: 0.3, decay: 0.9985, bright: 0.25, dest }));
        [N.D3, N.F3, N.A3].forEach(f => voiceOsc({ t: 0.5, f, dur: tt, vol: 0.03, type: 'triangle', cut: 700, a: 2, rel: 3, detune: 5, dest }));
        nz({ t: 0.5, dur: tt, type: 'bandpass', f: 400, f2: 900, q: 0.7, vol: 0.05, a: 2, dest });
        B.gong(tt - 1, 0.6);
      }
    },
    // 结算动画配乐
    chuSong(t = 0) {
      const dest = musicBus;
      const mel = [[N.A4, 1.2], [N.G4, 0.6], [N.E4, 1.2], [N.D4, 1.8], [N.E4, 0.6], [N.G4, 0.6], [N.A4, 1.2], [N.C5, 0.6], [N.A4, 1.8], [N.G4, 0.6], [N.E4, 0.6], [N.D4, 2.4]];
      let tt = t;
      for (const [f, d] of mel) { voiceOsc({ t: tt, f, dur: d * 0.98, vol: 0.07, type: 'sine', cut: 3000, a: 0.12, rel: 0.25, vib: 0.008, vibF: 5, dest }); nz({ t: tt, dur: d * 0.9, type: 'bandpass', f: f * 2, q: 9, vol: 0.015, a: 0.1, dest }); tt += d; }
      [N.D2 * 2, N.A2, N.D2 * 2, N.G2].forEach((f, i) => pluck(f, { t: t + i * 3, vol: 0.3, decay: 0.998, bright: 0.25, dest }));
      return tt - t;
    },
    warDrums(t = 0, bars = 4) {
      const beat = 60 / 108;
      for (let b = 0; b < bars; b++) for (let i = 0; i < 16; i++) { const v = [1, 0, 0.5, 0, 0.8, 0, 0.5, 0.4][i % 8]; if (v) taikoTo(musicBus, t + (b * 16 + i) * beat / 4, v * 0.6, i % 4 ? 1.1 : 0.9); }
      hornTo(musicBus, t, beat * 6, N.D2 * 2);
    },
  };
  function taikoTo(dest, t, v, p) {
    tn({ t, f: 70 * p, f2: 44 * p, dur: 0.7, vol: v, dest, glide: 0.3 });
    nz({ t, dur: 0.07, type: 'bandpass', f: 800 * p, q: 1.2, vol: v * 0.3, dest });
    nz({ t, dur: 0.25, type: 'lowpass', f: 200, vol: v * 0.4, dest });
  }
  function shimeTo(dest, t, v) { tn({ t, f: 340, f2: 260, dur: 0.1, vol: v * 0.5, dest }); nz({ t, dur: 0.04, type: 'bandpass', f: 2600, q: 2, vol: v * 0.5, dest }); }
  function hornTo(dest, t, dur, f) { voiceOsc({ t, f, dur, vol: 0.1, cut: 300, cut2: 1300, q: 2, a: 0.4, rel: 0.8, vib: 0.006, detune: 6, bend: 0.8, dest }); voiceOsc({ t, f: f / 2, dur, vol: 0.06, type: 'square', cut: 250, cut2: 500, a: 0.4, rel: 0.8, dest }); }
  function shoutTo(t, n) { B.shout(t, n, 0.05, 0.5); }

  // ---------- 环境声 ----------
  function startAmbient() {
    const s = ctx.createBufferSource(); s.buffer = nb(); s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 250;
    lfo.connect(lg); lg.connect(bp.frequency);
    const g = ctx.createGain(); g.gain.value = 0.028;
    s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(); lfo.start();
    // 营火噼啪、远处马嘶、旗帜猎猎
    setInterval(() => {
      if (!ctx || ctx.state !== 'running' || !enabled) return;
      if (Math.random() < 0.6) nz({ t: R(0, 1), dur: 0.02, type: 'bandpass', f: R(1500, 3500), q: 2, vol: R(0.01, 0.03), pan: R(-0.8, 0.8) });
      if (Math.random() < 0.015) B.neigh(0, 0.02);
      if (Math.random() < 0.05) B.sail(0, 1.2);
    }, 900);
  }

  const S = {
    init, B, U, river, Music, pluck,
    get ctx() { return ctx; }, get voiceBus() { return voiceBus; },
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 1 : 0, now(), 0.05); },
    setVol(k, v) { vol[k] = v; const bus = { sfx: sfxBus, music: musicBus, voice: voiceBus }[k]; if (bus) bus.gain.setTargetAtTime(v, now(), 0.05); },
    vol,
    // 兼容旧接口
    place() { B.wood(0, 0.5); },
    lift() { nz({ dur: 0.05, type: 'highpass', f: 2500, vol: 0.1 }); },
    select() { B.wood(0, 0.35); tn({ f: 1320, dur: 0.5, vol: 0.03 }); },
    drum(t = 0, v = 0.9) { B.taiko(t, v); },
    boom(t, big) { B.boom(t, big); }, cannon(t) { B.cannon(t); }, crack(t) { B.crack(t); }, splash(t) { B.splash(t); },
    clang(t) { B.clang(t, 0.35); }, slash(t) { B.whoosh(t, 0.2, 0.5); }, gong(t, v) { B.gong(t, v); },
    hooves(t, d, n) { B.hooves(t, d, n, 0.28); }, rumble(t, d) { B.wheels(t, d); }, shout(t) { B.shout(t, 6, 0.08); },
    march(t, steps) { B.march(t, steps * 0.25, 10, 0.2); }, whoosh(t, d) { B.whoosh(t, d); }, arrows(t) { B.arrows(t); }, thunk(t) { B.thunks(t); },
    row(t) { B.splash(t, 0.1); }, wind(t = 0, dur = 6) { nz({ t, dur, type: 'bandpass', f: 400, f2: 900, q: 0.8, vol: 0.4, a: 1.5 }); nz({ t: t + 1, dur, type: 'lowpass', f: 300, vol: 0.4, a: 1.5 }); },
    checkHit() { B.taiko(0, 1, 0.9); B.taiko(0.16, 0.9, 0.9); B.clang(0.02, 0.4); },
    tick(v) { B.tick(0, v); }, cheer(t) { B.cheer(t); },
    guqin(t = 0) { const sc = [N.D3, N.F3, N.G3, N.A3, N.C4, N.D4]; [0, 2, 4, 3, 5, 4, 2].forEach((n, i) => pluck(sc[n], { t: t + i * 0.45, vol: 0.3, decay: 0.997, bright: 0.35, dest: musicBus })); },
    chuSong(t) { return Music.chuSong(t); },
  };
  return S;
})();

// ===== 配音：内嵌 MP3，按台词编号播放 =====
const Voice = (() => {
  const LINES = window.VOICE_LINES || {};
  const CLIPS = window.VOICE_CLIPS || {};
  const SPK = { narr: '', xiang: '项王', liu: '汉王', elder: '乌江亭长' };
  const bufs = new Map();
  let enabled = true, cur = null;
  function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decode(id) {
    if (bufs.has(id)) return bufs.get(id);
    const ctx = Sfx.ctx;
    if (!ctx || !CLIPS[id]) return Promise.resolve(null);
    const p = new Promise(res => {
      try { ctx.decodeAudioData(b64ToBuf(CLIPS[id]), b => res(b), () => res(null)); } catch (e) { res(null); }
    });
    bufs.set(id, p);
    return p;
  }
  return {
    LINES, SPK,
    get enabled() { return enabled; }, set enabled(v) { enabled = v; if (!v) this.cancel(); },
    preload(ids) { (ids || Object.keys(CLIPS)).forEach(decode); },
    speaker(id) { return SPK[(LINES[id] || {}).spk] ?? ''; },
    text(id) { return (LINES[id] || {}).text || ''; },
    // 播放；返回 Promise（播完时 resolve）。onDur 回调告知时长
    async play(id, { onDur, minDur = 0, rate = 1 } = {}) {
      const est = Math.max(minDur, this.text(id).length * 0.24 + 0.6);
      if (!enabled || !Sfx.ctx) { onDur && onDur(est); return Core.sleep(est); }
      const buf = await decode(id);
      if (!buf) { onDur && onDur(est); return Core.sleep(est); }
      const ctx = Sfx.ctx;
      const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
      s.connect(Sfx.voiceBus);
      const d = buf.duration / rate;
      onDur && onDur(Math.max(d, minDur));
      this.cancel();
      cur = s;
      s.start();
      return new Promise(res => {
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        s.onended = fin;
        setTimeout(fin, (d + 0.5) * 1000);
      }).then(() => (minDur > d ? Core.sleep(minDur - d) : null));
    },
    cancel() { if (cur) { try { cur.stop(); } catch (e) { } cur = null; } },
  };
})();
