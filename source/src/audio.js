// ===== 声音：真实录音（CC0）+ 合成音效、各兵种音效套组、程序化配乐、配音 =====
const Sfx = (() => {
  let ctx = null, master, comp, sfxBus, musicBus, voiceBus, verb, sfxSend;
  const vol = { sfx: 0.9, music: 0.55, voice: 1 };
  let enabled = true;
  const R = (a, b) => a + Math.random() * (b - a);
  const NOAUDIO = (() => { try { return !!localStorage.getItem('xq3d-noaudio'); } catch (e) { return false; } })();

  function makeIR(sec = 2.2, decay = 3) {
    const sr = ctx.sampleRate, n = Math.floor(sr * sec);
    const buf = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) { const t = i / n; lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = lp * Math.pow(1 - t, decay) * (i < sr * 0.012 ? 0 : 1); }
      for (let k = 0; k < 10; k++) { const i = Math.floor(sr * (0.012 + k * 0.009 + Math.random() * 0.01)); if (i < n) d[i] += (Math.random() - 0.5) * 0.7; }
    }
    return buf;
  }
  // —— 录音素材 ——
  const samples = {};
  function b64(b) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function loadSamples() {
    const src = window.SFX_CLIPS || {};
    for (const [id, list] of Object.entries(src)) {
      samples[id] = [];
      list.forEach((d, i) => { try { ctx.decodeAudioData(b64(d), buf => { samples[id][i] = buf; }, () => { }); } catch (e) { } });
    }
  }
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
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.85; verb.connect(verbOut); verbOut.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = vol.music; musicBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = vol.voice; voiceBus.connect(master);
    sfxSend = ctx.createGain(); sfxSend.gain.value = 0.2; sfxBus.connect(sfxSend); sfxSend.connect(verb);
    const ms = ctx.createGain(); ms.gain.value = 0.5; musicBus.connect(ms); ms.connect(verb);
    const vs = ctx.createGain(); vs.gain.value = 0.12; voiceBus.connect(vs); vs.connect(verb);
    loadSamples();
    startAmbient();
    try { const a = document.createElement('audio'); a.setAttribute('playsinline', ''); a.loop = true; a.volume = 0.01; a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; a.play().catch(() => { }); } catch (e) { }
  }
  const now = () => ctx.currentTime;
  const ok = () => !!ctx;
  let _nb = null;
  const nb = () => { if (_nb) return _nb; const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (_nb = b); };
  function out(dest, pan) { if (pan === undefined || !ctx.createStereoPanner) return dest; const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(dest); return p; }
  function env(g, T, a, peak, dec, hold = 0) { g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), T + a); if (hold) g.gain.setValueAtTime(Math.max(0.0002, peak), T + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, T + a + hold + dec); }
  // 播放录音
  function smp(id, { t = 0, vol = 0.5, rate = 1, rj = 0.08, pan, dest, loop = false, dur, lp } = {}) {
    if (!ok()) return;
    const list = samples[id]; if (!list || !list.length) return;
    const buf = list[Math.floor(Math.random() * list.length)]; if (!buf) return;
    const T = now() + Math.max(0, t);
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = loop;
    s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * rj);
    const g = ctx.createGain(); g.gain.value = vol;
    let node = s;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); node = f; }
    node.connect(g); g.connect(out(dest || sfxBus, pan ?? R(-0.4, 0.4)));
    s.start(T);
    if (dur) { g.gain.setValueAtTime(vol, T + Math.max(0, dur - 0.3)); g.gain.linearRampToValueAtTime(0.0001, T + dur); s.stop(T + dur + 0.05); }
  }
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
  function tn({ t = 0, f = 200, f2, dur = 0.4, type = 'sine', vol = 0.3, a = 0.004, hold = 0, pan, dest, glide } = {}) {
    if (!ok()) return;
    const T = now() + Math.max(0, t);
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, T);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + (glide || (a + hold + dur)));
    const g = ctx.createGain(); env(g, T, a, vol, dur, hold);
    o.connect(g); g.connect(out(dest || sfxBus, pan)); o.start(T); o.stop(T + a + hold + dur + 0.05);
  }
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
  // 拨弦（Karplus-Strong）
  const ksCache = new Map();
  function ksBuf(freq, decay = 0.996, bright = 0.5, sec = 3.2) {
    const key = Math.round(freq * 10) + '_' + decay + '_' + bright;
    if (ksCache.has(key)) return ksCache.get(key);
    const sr = ctx.sampleRate, len = Math.floor(sr * sec);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.max(2, Math.floor(sr / freq)); const ring = new Float32Array(N);
    let lp = 0; for (let i = 0; i < N; i++) { lp = lp * (1 - bright) + (Math.random() * 2 - 1) * bright; ring[i] = lp; }
    let idx = 0;
    for (let i = 0; i < len; i++) { const nx = (idx + 1) % N; const v = (ring[idx] + ring[nx]) * 0.5 * decay; d[i] = ring[idx]; ring[idx] = v; idx = nx; }
    if (ksCache.size > 160) ksCache.delete(ksCache.keys().next().value);
    ksCache.set(key, buf);
    return buf;
  }
  function pluck(freq, { t = 0, vol = 0.3, decay = 0.996, bright = 0.5, pan, dest, slide, cut = 2600, body = false } = {}) {
    if (!ok()) return;
    const T = now() + Math.max(0, t);
    const s = ctx.createBufferSource(); s.buffer = ksBuf(freq, decay, bright);
    if (slide) { s.playbackRate.setValueAtTime(1, T + 0.25); s.playbackRate.linearRampToValueAtTime(slide, T + 0.8); }
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(lp);
    if (body) { // 古琴琴身共鸣
      const b1 = ctx.createBiquadFilter(); b1.type = 'peaking'; b1.frequency.value = 180; b1.Q.value = 2; b1.gain.value = 6;
      const b2 = ctx.createBiquadFilter(); b2.type = 'peaking'; b2.frequency.value = 420; b2.Q.value = 3; b2.gain.value = 4;
      lp.connect(b1); b1.connect(b2); b2.connect(g);
    } else lp.connect(g);
    g.connect(out(dest || sfxBus, pan)); s.start(T);
  }

  // ======================================================================
  //  基础音效
  // ======================================================================
  const has = id => !!(samples[id] && samples[id].length);
  const B = {
    // 战鼓：真实大鼓录音降调 + 鼓皮拍击，合成低频只作补底
    taiko(t = 0, v = 0.9, p = 1, pan, dest) {
      if (has('drum')) {
        smp('drum', { t, vol: v * 0.95, rate: 0.72 * p, rj: 0.05, pan, dest });
        smp('soft', { t, vol: v * 0.22, rate: 0.55 * p, pan, dest });
        tn({ t, f: 62 * p, f2: 40 * p, dur: 0.55, vol: v * 0.3, pan, glide: 0.3, dest });
        return;
      }
      tn({ t, f: 72 * p, f2: 44 * p, dur: 0.7, vol: v, pan, glide: 0.3, dest });
      tn({ t, f: 120 * p, f2: 80 * p, dur: 0.25, vol: v * 0.4, pan, dest });
      nz({ t, dur: 0.08, type: 'bandpass', f: 900 * p, q: 1.2, vol: v * 0.35, pan, dest });
      nz({ t, dur: 0.3, type: 'lowpass', f: 220, vol: v * 0.45, pan, dest });
    },
    shime(t = 0, v = 0.4, pan, dest) { tn({ t, f: 330, f2: 250, dur: 0.12, vol: v * 0.5, pan, dest }); nz({ t, dur: 0.05, type: 'bandpass', f: 2500, q: 2, vol: v * 0.5, pan, dest }); },
    step(t = 0, v = 0.3, pan) { smp('step', { t, vol: v, pan, rate: R(0.8, 1.1), lp: 2600 }); },
    march(t = 0, dur = 1.5, men = 12, v = 0.22, rate = 0.5) {
      const n = Math.min(men, 10);
      for (let i = 0; i < n; i++) { const off = R(0, 0.1), pan = R(-0.7, 0.7); for (let k = 0; k * rate < dur; k++) B.step(t + k * rate + off, v * R(0.5, 1), pan); }
      for (let k = 0; k * rate * 2 < dur; k++) smp('chain', { t: t + k * rate * 2 + R(0, 0.1), vol: 0.07, rate: R(0.9, 1.2) });
    },
    clang(t = 0, v = 0.4, pan) { smp(Math.random() < 0.5 ? 'metal' : 'blade', { t, vol: v, pan, rate: R(0.85, 1.15) }); },
    plate(t = 0, v = 0.4) { smp('plate', { t, vol: v }); },
    ring(t = 0, v = 0.3) { smp('unsheathe', { t, vol: v }); },
    whoosh(t = 0, dur = 0.35, v = 0.35, pan) { smp('swing', { t, vol: v, pan, rate: R(0.8, 1.1) / Math.max(0.5, dur / 0.4) }); },
    stab(t = 0, v = 0.45) { smp('punch', { t, vol: v, rate: R(0.9, 1.2) }); smp('chop', { t: t + 0.01, vol: v * 0.5 }); },
    thud(t = 0, v = 0.6) { smp('soft', { t, vol: v, rate: R(0.6, 0.9) }); tn({ t, f: 90, f2: 45, dur: 0.25, vol: v * 0.6 }); },
    // 人群呐喊：多人齐喊录音（Kokoro 多声线合成的真人声），没有素材时退回合成
    shout(t = 0, n = 8, v = 0.12, len = 0.6) {
      if (has('warcry')) {
        smp('warcry', { t, vol: Math.min(1, v * n * 0.55), rate: R(0.94, 1.06) * (len < 0.55 ? 1.12 : 1), rj: 0.03 });
        if (n >= 14) smp('warcry', { t: t + 0.14, vol: Math.min(0.8, v * n * 0.35), rate: R(0.88, 0.96), rj: 0.03 });
        return;
      }
      for (let i = 0; i < n; i++) {
        const tt = t + R(0, 0.15), f = R(95, 170), pan = R(-0.8, 0.8), d = len * R(0.7, 1.3);
        if (!ok()) return;
        const T = now() + tt;
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, T); o.frequency.exponentialRampToValueAtTime(f * 0.85, T + d);
        const gg = ctx.createGain(); env(gg, T, 0.05, v, d * 0.8, d * 0.2);
        const mix = ctx.createGain();
        for (const [fm, q, g] of [[R(650, 800), 6, 1], [R(1100, 1300), 7, 0.6], [2500, 5, 0.25]]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm; bp.Q.value = q; const bg = ctx.createGain(); bg.gain.value = g; o.connect(bp); bp.connect(bg); bg.connect(mix); }
        mix.connect(gg); gg.connect(out(sfxBus, pan)); o.start(T); o.stop(T + d + 0.1);
        nz({ t: tt, dur: d, type: 'bandpass', f: 1500, q: 1, vol: v * 0.2, a: 0.05, pan });
      }
    },
    hooves(t = 0, dur = 1.5, horses = 1, v = 0.3, rate = 0.36) {
      for (let h = 0; h < horses; h++) {
        const off = R(0, rate), pan = R(-0.6, 0.6);
        for (let k = 0; k * rate < dur; k++) for (const s of [0, 0.07, 0.15]) {
          const tt = t + off + k * rate + s + R(0, 0.012);
          // 马蹄：木块撞击录音升调（拟音师的老办法），加一点泥土低频
          if (has('wood')) { smp('wood', { t: tt, vol: v * 0.5, rate: R(1.5, 2.0), pan, lp: 2400, rj: 0.04 }); nz({ t: tt, dur: 0.05, type: 'lowpass', f: R(160, 220), vol: v * 0.45, pan }); }
          else nz({ t: tt, dur: 0.06, type: 'lowpass', f: R(170, 260), vol: v, pan });
          if (k % 2 === 0 && s === 0) smp('step', { t: tt, vol: v * 0.35, rate: R(0.5, 0.65), pan, lp: 1200 });
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
      smp('breath', { t: t + 0.9, vol: v * 1.5, rate: 0.7 });
    },
    snort(t = 0, v = 0.2) { smp('breath', { t, vol: v, rate: R(0.6, 0.8) }); },
    wheels(t = 0, dur = 1.5, v = 0.4) { smp('rolling', { t, vol: v, loop: true, dur: dur + 0.2, rate: R(0.7, 0.9) }); nz({ t, dur, type: 'lowpass', f: 140, vol: v * 0.8, a: 0.2, hold: dur * 0.5 }); },
    whip(t = 0) { nz({ t, dur: 0.06, type: 'highpass', f: 2500, vol: 0.6 }); smp('swing', { t: t - 0.06, vol: 0.2, rate: 1.4 }); },
    horn(t = 0, dur = 2.2, f = 98, v = 0.2) { voiceOsc({ t, f, dur, vol: v, cut: 350, cut2: 1400, q: 2, a: 0.25, rel: 0.6, vib: 0.006, detune: 6, bend: 0.8 }); voiceOsc({ t, f: f / 2, dur, vol: v * 0.6, type: 'square', cut: 250, cut2: 600, a: 0.3, rel: 0.6, bend: 0.8 }); },
    boom(t = 0, big = 1) { smp('boom', { t, vol: 0.9 * big, rate: R(0.7, 0.9) }); tn({ t, f: 60, f2: 26, dur: 1.4 * big, vol: 0.9 }); nz({ t, dur: 1.6 * big, type: 'lowpass', f: 1400, f2: 90, vol: 0.5 }); smp('rockfall', { t: t + 0.4, vol: 0.25 * big }); },
    cannon(t = 0) { smp('cannon', { t, vol: 1, rate: R(0.85, 1) }); tn({ t, f: 55, f2: 30, dur: 1.1, vol: 0.8 }); nz({ t: t + 0.05, dur: 2.2, type: 'lowpass', f: 300, f2: 80, vol: 0.3, a: 0.1 }); },
    fuse(t = 0, dur = 0.5) { for (let i = 0; i < dur / 0.03; i++) nz({ t: t + i * 0.03, dur: 0.02, type: 'highpass', f: R(3000, 7000), vol: R(0.05, 0.14) }); },
    whistle(t = 0, dur = 1) { tn({ t, f: 1500, f2: 520, dur, vol: 0.05, a: 0.1 }); nz({ t, dur, type: 'bandpass', f: 1200, f2: 500, q: 8, vol: 0.08, a: 0.1 }); },
    bowDraw(t = 0) { smp('creak', { t, vol: 0.15, rate: 1.6 }); nz({ t, dur: 0.4, type: 'bandpass', f: 900, q: 5, vol: 0.05, a: 0.3 }); },
    twang(t = 0, n = 7) { for (let i = 0; i < n; i++) smp('bow', { t: t + R(0, 0.12), vol: 0.4, rate: R(0.85, 1.2), pan: R(-0.7, 0.7) }); },
    arrows(t = 0, n = 14) { for (let i = 0; i < n; i++) nz({ t: t + i * 0.03 + R(0, 0.05), dur: 0.35, type: 'bandpass', f: R(1800, 3200), f2: 900, q: 6, vol: 0.09, pan: R(-0.8, 0.8) }); },
    thunks(t = 0, n = 10) { for (let i = 0; i < n; i++) smp('thunk', { t: t + i * 0.035 + R(0, 0.04), vol: 0.35, rate: R(0.8, 1.3) }); },
    splash(t = 0, v = 0.3) { smp('splash', { t, vol: v * 1.3, rate: R(0.8, 1.2) }); },
    water(t = 0, dur = 2.5, v = 0.3) { smp('water', { t, vol: v, loop: true, dur }); },
    creak(t = 0, v = 0.1) { smp('creak', { t, vol: v * 3, rate: R(0.7, 1.1) }); },
    sail(t = 0, dur = 2) { for (let k = 0; k < dur / 0.5; k++) smp('cloth', { t: t + k * 0.5 + R(0, 0.2), vol: 0.22, rate: R(0.6, 0.9) }); },
    wood(t = 0, v = 0.5) { smp('wood', { t, vol: v, rate: R(0.9, 1.1), pan: 0 }); },
    woodbreak(t = 0, v = 0.6) { smp('woodbreak', { t, vol: v, rate: R(0.7, 1) }); },
    crack(t = 0) { smp('woodbreak', { t, vol: 0.6 }); smp('hit', { t: t + 0.02, vol: 0.3 }); },
    metalfall(t = 0, v = 0.4) { smp('metalfall', { t, vol: v, rate: R(0.9, 1.2) }); },
    gong(t = 0, v = 1, dest) {
      if (has('gong')) { smp('gong', { t, vol: 0.85 * v, rate: 0.62, rj: 0.03, dest }); smp('gong', { t: t + 0.012, vol: 0.4 * v, rate: 0.45, rj: 0.02, dest }); tn({ t, f: 98, f2: 96, dur: 4, vol: 0.16 * v, a: 0.02, dest }); return; }
      for (const [f, g, d] of [[98, 0.45, 5], [147, 0.25, 4], [233, 0.15, 3.5], [311, 0.1, 3], [415, 0.06, 2]]) tn({ t, f, f2: f * 0.985, dur: d, vol: g * v, a: 0.01, dest }); nz({ t, dur: 0.3, type: 'bandpass', f: 600, q: 1, vol: 0.15 * v, dest }); },
    bell(t = 0, f = 880, v = 0.12) { for (const [r, g, d] of [[1, 1, 2.4], [2.7, 0.4, 1.4], [5.1, 0.2, 0.8]]) tn({ t, f: f * r, dur: d, vol: v * g, dest: musicBus }); },
    tick(t = 0, v = 0.3) { tn({ t, f: 1150, f2: 900, dur: 0.05, vol: v }); nz({ t, dur: 0.015, type: 'highpass', f: 4000, vol: v * 0.5 }); },
    trumpet(t = 0, v = 0.22, fall = false) { // 象鸣
      if (!ok()) return;
      const T = now() + t;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(fall ? 700 : 380, T); o.frequency.linearRampToValueAtTime(fall ? 900 : 760, T + 0.2); o.frequency.linearRampToValueAtTime(fall ? 260 : 640, T + (fall ? 1.6 : 1.1));
      const l = ctx.createOscillator(); l.frequency.value = 23; const lg = ctx.createGain(); lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency);
      const vs = has('trumpet') ? v * 0.45 : v;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(vs, T + 0.1); g.gain.setValueAtTime(vs, T + (fall ? 1.2 : 0.8)); g.gain.linearRampToValueAtTime(0.0001, T + (fall ? 1.8 : 1.2));
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.5;
      o.connect(bp); bp.connect(g); g.connect(sfxBus); o.start(T); l.start(T); o.stop(T + 2); l.stop(T + 2);
      if (has('trumpet')) smp('trumpet', { t, vol: v * 2.4, rate: fall ? 1.15 : R(1.55, 1.8), rj: 0.03 });
      else smp('roar', { t, vol: v * 0.8, rate: fall ? 0.9 : 1.3 });
    },
    stompHeavy(t = 0, v = 0.6) {
      if (has('stomp')) { smp('stomp', { t, vol: v, rate: R(0.7, 0.85) }); smp('drum', { t, vol: v * 0.5, rate: 0.5, rj: 0.05 }); return; }
      tn({ t, f: 50, f2: 30, dur: 0.4, vol: v }); nz({ t, dur: 0.2, type: 'lowpass', f: 180, vol: v * 0.6 }); },
    heave(t = 0) { // 炮手号子"嘿——呦"
      for (const [dt, f0, f1] of [[0, 180, 150], [0.5, 150, 200]]) for (let i = 0; i < 3; i++) voiceOsc({ t: t + dt + R(0, 0.04), f: f0 * R(0.95, 1.05), dur: 0.38, vol: 0.05, cut: 1100, q: 3, a: 0.04, rel: 0.2, bend: f1 / f0 });
    },
    cheer(t = 0, v = 1) {
      if (has('cheer')) { smp('cheer', { t, vol: 0.75 * v, rj: 0.04 }); for (let i = 0; i < 5; i++) smp('plate', { t: t + 0.1 + i * 0.17 + R(0, 0.05), vol: 0.12 * v, rate: R(0.8, 1.2) }); for (let i = 0; i < 3; i++) B.taiko(t + i * 0.2, 0.35 * v); return; }
      B.shout(t, 12, 0.07 * v, 1.0); for (let i = 0; i < 6; i++) smp('plate', { t: t + i * 0.16 + R(0, 0.05), vol: 0.14 * v, rate: R(0.8, 1.2) }); for (let i = 0; i < 3; i++) B.taiko(t + i * 0.2, 0.3 * v); },
  };

  // 受伤、惨叫（按血腥度）
  let lastHurt = 0;
  function hurt(hit) {
    if (!ok() || typeof Fx === 'undefined') return;
    const g = Fx.gore;
    const tt = now();
    if (tt - lastHurt < 0.12) return;
    lastHurt = tt;
    if (g >= 3) { smp(Math.random() < 0.4 ? 'death' : 'pain', { vol: 0.28, rate: R(0.75, 1.0) }); if (hit !== 'bolts' && Math.random() < 0.3) smp('chop', { vol: 0.25 }); if (hit === 'blast' && Math.random() < 0.3) smp('gibs', { vol: 0.25, rate: R(0.8, 1) }); }
    else if (g === 2) smp('pain', { vol: 0.14, rate: R(0.75, 0.95) });
    smp('soft', { t: 0.25, vol: 0.2, rate: R(0.7, 0.9) });
  }

  // ======================================================================
  //  各兵种音效套组（与方案表一致）
  // ======================================================================
  const U = {
    // 兵：慢鼓 + 大量整齐脚步 + 甲片；冲锋：急鼓 + 喊杀 + 矛刺 + 兵器碰撞
    inf: {
      move(dur = 1.3) { for (let k = 0; k * 0.62 < dur + 0.3; k++) B.taiko(k * 0.62, 0.45, 1.05); B.march(0.05, dur, 14, 0.24, 0.5); },
      charge(dur = 1) { for (let k = 0; k < 10; k++) B.taiko(k * 0.1, 0.35 + k * 0.03, 1.1); B.shout(0.1, 12, 0.1, 0.9); B.march(0, dur, 12, 0.3, 0.26); },
      impact() { for (let i = 0; i < 4; i++) B.stab(i * 0.08 + R(0, 0.04), 0.4); B.clang(0.02, 0.4); B.clang(0.12, 0.35); B.shout(0.05, 6, 0.08, 0.5); },
    },
    // 车：扬鞭 + 车轮滚滚 + 驷马小跑
    chariot: {
      move(dur = 1) { B.whip(0); B.wheels(0.05, dur + 0.2, 0.4); B.hooves(0.05, dur, 2, 0.2, 0.3); B.creak(0.2, 0.06); },
      charge(dur = 2) { B.horn(0, 1.4, 110, 0.18); for (let k = 0; k < 8; k++) B.taiko(0.1 + k * 0.14, 0.4, 1); B.whip(0.3); B.wheels(0.3, dur, 0.55); B.hooves(0.3, dur, 4, 0.3, 0.26); B.neigh(0.5, 0.1); B.shout(0.4, 6, 0.08); },
      impact() { B.woodbreak(0, 0.7); B.boom(0.02, 0.4); B.clang(0.03, 0.35); B.neigh(0.15, 0.09); for (let i = 0; i < 5; i++) B.stab(R(0.02, 0.3), 0.3); },
      destroy() { B.woodbreak(0, 0.8); B.woodbreak(0.15, 0.6); smp('hit', { t: 0.3, vol: 0.4 }); B.neigh(0.1, 0.12); smp('metalfall', { t: 0.4, vol: 0.3 }); },
    },
    // 马：单骑马蹄 + 鞍具叮当 + 马鼻息；冲锋：马嘶 + 拔刀 + 蹄声如雷
    cav: {
      move(dur = 1.2) { B.hooves(0, dur, 2, 0.28, 0.33); smp('chain', { t: 0.1, vol: 0.12 }); B.snort(0.4, 0.2); },
      charge(dur = 1.8) { B.neigh(0, 0.12); B.ring(0.3, 0.3); B.hooves(0.2, dur, 3, 0.34, 0.3); for (let k = 0; k < 6; k++) B.taiko(0.2 + k * 0.2, 0.35, 1.2); B.shout(0.5, 5, 0.08); },
      impact() { B.whoosh(0, 0.18, 0.5); smp('blade', { t: 0.08, vol: 0.5 }); B.stab(0.1, 0.5); B.shout(0.2, 4, 0.08, 0.4); },
      die() { B.neigh(0, 0.13); B.neigh(0.25, 0.1); B.thud(0.6, 0.6); },
    },
    // 炮：炮车吱呀 + 推车号子；开炮：三通鼓 + 引信 + 炮响 + 呼啸 + 爆炸
    cannon: {
      move(dur = 1) { B.wheels(0, dur, 0.25); for (let k = 0; k * 0.7 < dur; k++) B.creak(k * 0.7, 0.07); B.heave(0.1); if (dur > 1.2) B.heave(1.2); },
      ready() { B.taiko(0, 0.7); B.taiko(0.25, 0.7); B.taiko(0.5, 0.9, 0.9); B.creak(0.6, 0.08); },
      fire(i) { B.fuse(0, 0.12); B.cannon(0.12); B.whistle(0.35, 0.9); },
      explode(big) { B.boom(0, big ? 1.2 : 0.7); },
      destroy() { B.boom(0.1, 0.7); B.woodbreak(0.05, 0.6); B.metalfall(0.3, 0.5); smp('metalfall', { t: 0.6, vol: 0.3, rate: 0.7 }); },
      impact() { B.boom(0, 0.8); },
    },
    // 相（汉弩）：轻步 + 弩机上弦；齐射：弦响 + 箭雨 + 钉入
    xbow: {
      move(dur = 0.8) { B.march(0, dur, 5, 0.16, 0.4); smp('metal', { t: 0.1, vol: 0.1, rate: 1.8 }); },
      draw() { B.bowDraw(0); B.bowDraw(0.12); smp('metal', { t: 0.3, vol: 0.12, rate: 1.9 }); B.taiko(0, 0.4); },
      release() { B.twang(0, 8); B.arrows(0.06, 16); },
      impact() { B.thunks(0, 12); B.shout(0.1, 3, 0.06, 0.4); },
    },
    // 象（楚战象）：沉重低频脚步 + 象鸣；冲锋：象嘶 + 践踏 + 火把
    ele: {
      move(dur = 1.4) { for (let k = 0; k * 0.55 < dur; k++) B.stompHeavy(k * 0.55, 0.55); smp('rumble', { t: 0.15, vol: 0.4, rate: 0.75, dur: Math.min(3, dur + 0.6) }); B.trumpet(0.25, 0.14); smp('chain', { t: 0.3, vol: 0.12, rate: 0.6 }); smp('chain', { t: 0.3 + dur * 0.5, vol: 0.1, rate: 0.55 }); },
      trumpet() { B.trumpet(0, 0.24); },
      charge(dur = 1.2) { for (let k = 0; k * 0.3 < dur; k++) B.stompHeavy(k * 0.3, 0.55); nz({ dur, type: 'bandpass', f: 600, f2: 1400, q: 0.8, vol: 0.12, a: 0.3 }); B.shout(0.2, 5, 0.07); },
      stomp() { B.boom(0, 0.5); B.stompHeavy(0, 0.9); smp('rockfall', { t: 0.05, vol: 0.5 }); for (let i = 0; i < 4; i++) B.stab(R(0.02, 0.2), 0.3); },
      dieCry() { B.trumpet(0, 0.26, true); },
      impact() { B.stompHeavy(0, 0.8); },
    },
    // 士：甲叶叮当 + 盾牌相击；近身：刀出鞘 + 盾撞 + 刀砍
    guard: {
      move(dur = 0.8) { B.march(0, dur, 2, 0.3, 0.35); smp('chain', { t: 0, vol: 0.2 }); B.plate(0.3, 0.2); },
      charge() { B.ring(0, 0.3); B.ring(0.08, 0.25); B.shout(0.2, 3, 0.1, 0.5); },
      impact() { B.whoosh(0, 0.12, 0.45); smp('blade', { t: 0.05, vol: 0.45 }); B.plate(0.1, 0.45); B.stab(0.14, 0.4); },
    },
    // 帅（刘邦）：一声铜锣 + 亲兵脚步；亲斩：号角 + 锣 + 拔剑 + 剑鸣 + 万人呐喊
    liu: {
      move(dur = 1) { B.gong(0, 0.35); B.march(0.05, dur, 4, 0.28, 0.45); smp('chain', { t: 0.2, vol: 0.1 }); },
      charge() { B.horn(0, 1.6, 98, 0.2); B.gong(0.1, 0.8); for (let k = 0; k < 5; k++) B.taiko(0.2 + k * 0.15, 0.5, 0.9); },
      draw() { smp('unsheathe', { vol: 0.55, rate: 0.9 }); },
      impact() { B.whoosh(0, 0.2, 0.55); smp('blade', { t: 0.05, vol: 0.6, rate: 0.8 }); B.whoosh(0.2, 0.2, 0.5); smp('blade', { t: 0.25, vol: 0.5 }); B.shout(0.3, 14, 0.08, 1.0); },
    },
    // 将（项羽）：铜锣 + 乌骓马蹄；亲斩：号角 + 锣 + 大刀破风 + 裂地 + 万人呐喊
    xiang: {
      move(dur = 1) { B.gong(0, 0.4); B.hooves(0.05, dur, 1, 0.3, 0.4); B.snort(0.3, 0.2); },
      charge() { B.horn(0, 1.6, 87, 0.22); B.gong(0.1, 0.9); B.neigh(0.2, 0.12); B.hooves(0.2, 1, 1, 0.36, 0.28); for (let k = 0; k < 5; k++) B.taiko(0.2 + k * 0.14, 0.55, 0.85); },
      impact() { smp('twirl', { vol: 0.5, rate: 0.7 }); B.boom(0.1, 0.6); B.clang(0.1, 0.5); smp('rockfall', { t: 0.2, vol: 0.5 }); B.shout(0.35, 16, 0.08, 1.1); },
    },
  };
  const unit = k => U[k] || U.inf;
  // 渡河：水流 + 撑篙入水 + 船身吱呀 + 船帆猎猎
  function river(dur = 2.2) { B.water(0, dur + 0.8, 0.35); B.splash(0.1, 0.25); for (let k = 0; k < 3; k++) { B.splash(0.5 + k * 0.6, 0.15); B.creak(0.4 + k * 0.6, 0.05); } B.sail(0.2, dur); }

  // ======================================================================
  //  配乐
  // ======================================================================
  const N = { D2: 73.42, E2: 82.41, F2: 87.31, G2: 98, A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880 };
  // 五声音阶（D 商调）
  const PENTA = [N.D3, N.E3, N.G3, N.A3, N.C4, N.D4, N.E4, N.G4, N.A4, N.C5, N.D5];
  const Music = {
    style: 'zen', on: false, next: 0, bar: 0, timer: null, bus: null, idx: 5, intensity: 0.4, motif: null,
    start(style) {
      if (!ok()) return;
      if (style) this.style = style;
      this.stop(true);
      if (this.style === 'off') return;
      this.on = true; this.bar = 0; this.next = now() + 0.3;
      this.bus = ctx.createGain(); this.bus.gain.setValueAtTime(0.0001, now()); this.bus.gain.exponentialRampToValueAtTime(1, now() + 3); this.bus.connect(musicBus);
      this.startPad();
      this.timer = setInterval(() => this.tick(), 120);
    },
    stop(fast) {
      this.on = false; clearInterval(this.timer); this.timer = null;
      if (this.bus && ok()) { const b = this.bus; b.gain.cancelScheduledValues(now()); b.gain.setValueAtTime(b.gain.value, now()); b.gain.linearRampToValueAtTime(0.0001, now() + (fast ? 0.4 : 2.5)); setTimeout(() => { try { b.disconnect(); } catch (e) { } }, 3000); }
      this.bus = null;
    },
    duck(on) { if (this.bus && ok()) { this.bus.gain.cancelScheduledValues(now()); this.bus.gain.linearRampToValueAtTime(on ? 0.25 : 1, now() + 0.8); } },
    setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); },
    startPad() {
      const b = this.bus, zen = this.style === 'zen';
      const notes = zen ? [N.D2, N.A2, N.D3, N.E3] : [N.D2, N.A2];
      for (const f of notes) for (const d of [-6, 6]) {
        const o = ctx.createOscillator(); o.type = zen ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = d;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = zen ? 480 : 260;
        const l = ctx.createOscillator(); l.frequency.value = 0.05 + Math.random() * 0.05; const lg = ctx.createGain(); lg.gain.value = zen ? 180 : 120; l.connect(lg); lg.connect(lp.frequency);
        const g = ctx.createGain(); g.gain.value = zen ? 0.014 : 0.022;
        o.connect(lp); lp.connect(g); g.connect(b); o.start(); l.start();
        const bb = b; const iv = setInterval(() => { if (this.bus !== bb) { try { o.stop(now() + 3); l.stop(now() + 3); } catch (e) { } clearInterval(iv); } }, 500);
      }
      if (zen) { // 远处流水
        const s = ctx.createBufferSource(); s.buffer = nb(); s.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4;
        const g = ctx.createGain(); g.gain.value = 0.012; s.connect(bp); bp.connect(g); g.connect(b); s.start();
        const bb = b; const iv = setInterval(() => { if (this.bus !== bb) { try { s.stop(now() + 3); } catch (e) { } clearInterval(iv); } }, 500);
      }
    },
    tick() {
      if (!this.on || !ok()) return;
      while (this.next < now() + 0.8) {
        const t = this.next - now();
        this.next += this.style === 'zen' ? this.zenBar(t) : this.warBar(t);
        this.bar++;
      }
    },
    // —— 禅意：古琴（带琴身共鸣与走音）+ 泛音 + 箫 + 磬，句子有呼应 ——
    zenBar(t) {
      const dest = this.bus, len = 6.0;
      if (!this.motif || this.bar % 4 === 0) { // 新乐句
        const m = []; let i = 4 + Math.floor(Math.random() * 3);
        for (let k = 0; k < 4 + Math.floor(Math.random() * 2); k++) { i = Math.max(0, Math.min(PENTA.length - 1, i + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)])); m.push([i, [0.5, 0.75, 1, 1.25, 1.5][Math.floor(Math.random() * 5)]]); }
        this.motif = m;
      }
      let tt = t + 0.2;
      const shift = this.bar % 4 === 1 ? -1 : this.bar % 4 === 3 ? 1 : 0;
      for (const [i, du] of this.motif) {
        const f = PENTA[Math.max(0, Math.min(PENTA.length - 1, i + shift))];
        pluck(f, { t: tt, vol: 0.34, decay: 0.9978, bright: 0.32, dest, pan: R(-0.25, 0.25), slide: Math.random() < 0.2 ? (Math.random() < 0.5 ? 1.059 : 0.944) : 0, cut: 1900, body: true });
        if (Math.random() < 0.2) pluck(f / 2, { t: tt + 0.02, vol: 0.18, decay: 0.998, bright: 0.2, dest, body: true });
        tt += du * 0.9;
      }
      // 泛音：清亮的高音
      if (this.bar % 2 === 0) { const f = PENTA[5 + Math.floor(Math.random() * 5)] * 2; tn({ t: t + 3.2, f, dur: 2.2, vol: 0.035, dest }); tn({ t: t + 3.2, f: f * 2, dur: 1.2, vol: 0.012, dest }); }
      // 箫
      if (this.bar % 3 === 1) {
        const fs = [N.A4, N.G4, N.D5, N.E4, N.C5], f = fs[Math.floor(Math.random() * fs.length)];
        voiceOsc({ t: t + 1.0, f, dur: 3.4, vol: 0.05, type: 'sine', cut: 2400, a: 0.7, rel: 1.4, vib: 0.007, vibF: 4.6, dest });
        voiceOsc({ t: t + 1.0, f: f * 2, dur: 3.2, vol: 0.008, type: 'triangle', cut: 3000, a: 0.8, rel: 1.4, dest });
        nz({ t: t + 1.0, dur: 3.2, type: 'bandpass', f: f * 2, q: 12, vol: 0.014, a: 0.6, dest });
      }
      if (this.bar % 4 === 0) B.bell(t + 0.1, [N.A5, N.D5 * 2][this.bar % 8 ? 0 : 1] / 2, 0.055);
      return len;
    },
    // —— 战意：太鼓阵 + 低音弦乐 + 琵琶轮指 + 号角 + 呐喊；随局势加密 ——
    warBar(t) {
      const dest = this.bus, I = this.intensity;
      const beat = 60 / (94 + I * 20), len = beat * 4;
      const phrase = this.bar % 8;
      const pats = [
        [1, 0, 0, 0.5, 0, 0, 1, 0, 1, 0, 0, 0.5, 0, 0.6, 0.8, 0],
        [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0.6, 0.7, 0.8],
        [1, 0.4, 0.5, 0.4, 1, 0.4, 0.6, 0.4, 1, 0.5, 0.7, 0.5, 1, 0.7, 0.9, 1],
      ];
      let pat = pats[phrase % 2];
      if (I > 0.75) pat = pats[2];
      if (phrase === 7) pat = [1, 0.5, 0.6, 0.7, 1, 0.6, 0.7, 0.8, 1, 0.7, 0.8, 0.9, 1, 0.9, 1, 1];
      pat.forEach((v, i) => { if (v) taikoTo(dest, t + i * beat / 4, v * (0.45 + I * 0.2), i % 4 === 0 ? 0.95 : 1.1); });
      for (let i = 0; i < 8; i++) if (i % 2 || Math.random() < 0.4 + I * 0.4) shimeTo(dest, t + i * beat / 2 + beat / 4, 0.1 + I * 0.05);
      if (I > 0.6) for (let i = 0; i < 16; i++) if (Math.random() < 0.5) shimeTo(dest, t + i * beat / 4, 0.05);
      const bass = [[N.D2, N.D2, N.D2, N.F2], [N.C3 / 2, N.C3 / 2, N.D2, N.D2], [N.D2, N.D2, N.F2, N.G2], [N.A2, N.G2, N.F2, N.D2]][Math.floor(this.bar / 2) % 4];
      for (let i = 0; i < 8; i++) voiceOsc({ t: t + i * beat / 2, f: bass[Math.floor(i / 2)] * 2, dur: beat / 2 * 0.9, vol: 0.05 + I * 0.02, cut: 520, cut2: 300, a: 0.01, rel: 0.1, detune: 9, dest });
      if (I > 0.5) for (let i = 0; i < 8; i++) voiceOsc({ t: t + i * beat / 2, f: bass[Math.floor(i / 2)] * 4, dur: beat / 2 * 0.6, vol: 0.02, cut: 1200, a: 0.01, rel: 0.1, dest });
      if (phrase === 2 || phrase === 6 || (I > 0.7 && phrase === 4)) {
        const mel = phrase === 2 ? [N.D4, N.F4, N.G4, N.A4] : phrase === 6 ? [N.C5, N.A4, N.G4, N.F4] : [N.A4, N.C5, N.D5, N.A4];
        mel.forEach((f, j) => { for (let k = 0; k < 7; k++) pluck(f, { t: t + j * beat + k * 0.065, vol: 0.12 - k * 0.008, decay: 0.99, bright: 0.8, dest, pan: 0.3, cut: 4000 }); });
      }
      if (phrase === 0 && this.bar % 16 === 0) hornTo(dest, t, beat * 3, N.D3 * 0.75);
      if (phrase === 4) B.shout(t + beat * 3, 6 + Math.round(I * 6), 0.04, 0.5);
      if (phrase === 7) nz({ t: t + beat * 2, dur: beat * 2, type: 'highpass', f: 3000, f2: 8000, vol: 0.04, a: beat * 1.8, dest });
      return len;
    },
    stinger(kind) {
      if (!ok()) return;
      this.stop();
      const dest = musicBus;
      if (kind === 'win') {
        [0, 0.3, 0.6, 0.75, 0.9, 1.2].forEach((t, i) => taikoTo(dest, t, 0.8, i % 2 ? 1.1 : 0.9));
        B.gong(1.2, 1, dest);
        const mel = [[N.D4, 0.5], [N.Fs4, 0.5], [N.A4, 0.9], [N.D5, 1.4], [N.B4, 0.5], [N.A4, 0.5], [N.D5, 0.6], [N.E5, 0.6], [N.Fs5, 2.4]];
        let tt = 1.3;
        for (const [f, d] of mel) { voiceOsc({ t: tt, f, dur: d * 1.05, vol: 0.14, cut: 900, cut2: 2600, q: 1.5, a: 0.05, rel: 0.2, vib: 0.005, detune: 8, dest }); voiceOsc({ t: tt, f: f / 2, dur: d * 1.05, vol: 0.08, type: 'square', cut: 700, a: 0.05, rel: 0.2, dest }); tt += d; }
        for (let k = 0; k < 16; k++) taikoTo(dest, 1.3 + k * 0.33, k % 4 === 0 ? 0.7 : 0.35, k % 4 === 0 ? 0.9 : 1.15);
        hornTo(dest, 1.3, 3, N.D3);
        B.shout(2.0, 16, 0.08, 1.0); B.shout(5.0, 16, 0.09, 1.2);
        B.gong(tt - 0.4, 1, dest);
        [N.D3, N.A3, N.D4, N.Fs4].forEach(f => voiceOsc({ t: tt - 2.4, f, dur: 4, vol: 0.05, cut: 1200, a: 0.3, rel: 2, detune: 6, dest }));
      } else {
        const erhu = (t, f, d, v = 0.11) => voiceOsc({ t, f, dur: d, vol: v, cut: 1500, q: 3, a: 0.25, rel: 0.5, vib: 0.012, vibF: 5.5, dest, bend: 0.97 });
        const mel = [[N.A4, 1.6], [N.G4, 0.8], [N.F4, 1.2], [N.D4, 2.4], [N.F4, 0.8], [N.G4, 0.8], [N.A4, 1.2], [N.C5, 0.8], [N.A4, 1.2], [N.G4, 0.8], [N.F4, 0.8], [N.D4, 3.4]];
        let tt = 0.8;
        for (const [f, d] of mel) { erhu(tt, f, d * 1.05); tt += d; }
        [N.D2 * 2, N.A2, N.D2 * 2, N.F2 * 2].forEach((f, i) => pluck(f, { t: 0.4 + i * 3.4, vol: 0.3, decay: 0.9985, bright: 0.25, dest, body: true }));
        [N.D3, N.F3, N.A3].forEach(f => voiceOsc({ t: 0.5, f, dur: tt, vol: 0.03, type: 'triangle', cut: 700, a: 2, rel: 3, detune: 5, dest }));
        nz({ t: 0.5, dur: tt, type: 'bandpass', f: 400, f2: 900, q: 0.7, vol: 0.05, a: 2, dest });
        B.gong(tt - 1, 0.6, dest);
      }
    },
    chuSong(t = 0) {
      const dest = musicBus;
      const mel = [[N.A4, 1.2], [N.G4, 0.6], [N.E4, 1.2], [N.D4, 1.8], [N.E4, 0.6], [N.G4, 0.6], [N.A4, 1.2], [N.C5, 0.6], [N.A4, 1.8], [N.G4, 0.6], [N.E4, 0.6], [N.D4, 2.4]];
      let tt = t;
      for (const [f, d] of mel) { voiceOsc({ t: tt, f, dur: d * 0.98, vol: 0.07, type: 'sine', cut: 3000, a: 0.12, rel: 0.25, vib: 0.008, vibF: 5, dest }); nz({ t: tt, dur: d * 0.9, type: 'bandpass', f: f * 2, q: 9, vol: 0.015, a: 0.1, dest }); tt += d; }
      [N.D2 * 2, N.A2, N.D2 * 2, N.G2].forEach((f, i) => pluck(f, { t: t + i * 3, vol: 0.3, decay: 0.998, bright: 0.25, dest, body: true }));
      return tt - t;
    },
    warDrums(t = 0, bars = 4) {
      const beat = 60 / 108;
      for (let b = 0; b < bars; b++) for (let i = 0; i < 16; i++) { const v = [1, 0, 0.5, 0, 0.8, 0, 0.5, 0.4][i % 8]; if (v) taikoTo(musicBus, t + (b * 16 + i) * beat / 4, v * 0.6, i % 4 ? 1.1 : 0.9); }
      hornTo(musicBus, t, beat * 6, N.D3);
    },
  };
  function taikoTo(dest, t, v, p) { B.taiko(t, v, p, undefined, dest); }
  function shimeTo(dest, t, v) { B.shime(t, v, undefined, dest); }
  function hornTo(dest, t, dur, f) { voiceOsc({ t, f, dur, vol: 0.1, cut: 300, cut2: 1300, q: 2, a: 0.4, rel: 0.8, vib: 0.006, detune: 6, bend: 0.8, dest }); voiceOsc({ t, f: f / 2, dur, vol: 0.06, type: 'square', cut: 250, cut2: 500, a: 0.4, rel: 0.8, dest }); }

  // —— 环境声：流水、营火噼啪、远处马嘶、旗帜猎猎 ——
  function startAmbient() {
    const s = ctx.createBufferSource(); s.buffer = nb(); s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(bp.frequency);
    const g = ctx.createGain(); g.gain.value = 0.022;
    s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(); lfo.start();
    setInterval(() => {
      if (!ctx || ctx.state !== 'running' || !enabled) return;
      if (Math.random() < 0.6) nz({ t: R(0, 1), dur: 0.02, type: 'bandpass', f: R(1500, 3500), q: 2, vol: R(0.01, 0.03), pan: R(-0.8, 0.8) });
      if (Math.random() < 0.012) B.neigh(0, 0.02);
      if (Math.random() < 0.04) smp('cloth', { vol: 0.05, rate: 0.6 });
      if (Math.random() < 0.02) smp('water', { vol: 0.05, dur: 2 });
    }, 900);
  }

  const S = {
    init, B, U, unit, river, Music, pluck, hurt, smp,
    get ctx() { return ctx; }, get voiceBus() { return voiceBus; },
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 1 : 0, now(), 0.05); },
    setVol(k, v) { vol[k] = v; const bus = { sfx: sfxBus, music: musicBus, voice: voiceBus }[k]; if (bus) bus.gain.setTargetAtTime(v, now(), 0.05); },
    vol,
    place() { B.wood(0, 0.45); },
    // 吃子：战鼓擂动 + 全营欢呼；big=连吃时更响更长，还夹着喊杀
    celebrate(v = 1, big = false) {
      const n = big ? 14 : 9;
      for (let i = 0; i < n; i++) B.taiko(i * (big ? 0.13 : 0.16) + R(0, 0.02), (i % 4 === 0 ? 0.8 : 0.5) * v, i % 2 ? 1.1 : 0.9);
      smp('drumroll', { t: 0.05, vol: 0.45 * v, rate: 0.85 });
      if (big) { smp('drumroll', { t: 0.75, vol: 0.45 * v, rate: 0.8 }); smp('warcry', { t: 0.5, vol: 0.7 * v }); }
      smp('cheer', { t: 0.15, vol: 0.8 * v, rj: 0.04 });
      for (let i = 0; i < 5; i++) smp('plate', { t: 0.2 + i * 0.18 + R(0, 0.05), vol: 0.12 * v, rate: R(0.8, 1.2) });
    },
    groan(v = 0.45) { smp('groan', { vol: v, rj: 0.04 }); },
    jeer(side, v = 0.8) { smp(side === 'b' ? 'jeer_b' : 'jeer_r', { vol: v, rj: 0.03 }); smp('laugh', { t: 0.5, vol: v * 0.45 }); },
    desert(v = 0.5) { for (let i = 0; i < 5; i++) smp('metalfall', { t: R(0, 0.6), vol: 0.22 * v * 2, rate: R(0.8, 1.2) }); smp('groan', { t: 0.3, vol: 0.3 * v }); },
    lift() { nz({ dur: 0.05, type: 'highpass', f: 2500, vol: 0.08 }); },
    select() { B.wood(0, 0.3); tn({ f: 1320, dur: 0.5, vol: 0.025 }); },
    checkHit() { B.taiko(0, 1, 0.9); B.taiko(0.16, 0.9, 0.9); B.clang(0.02, 0.4); },
    tick(v) { B.tick(0, v); },
    cheer(t, v) { B.cheer(t, v); },
    roar() { B.shout(0, 24, 0.07, 1.4); B.shout(0.6, 24, 0.08, 1.6); for (let i = 0; i < 8; i++) B.taiko(i * 0.18, 0.6, i % 2 ? 1.1 : 0.9); B.horn(0.3, 2.2, 98, 0.18); for (let i = 0; i < 10; i++) smp('plate', { t: i * 0.12, vol: 0.12 }); },
    rout() { for (let i = 0; i < 10; i++) smp('metalfall', { t: R(0, 1.2), vol: 0.2, rate: R(0.8, 1.2) }); B.shout(0.2, 10, 0.05, 0.7); for (let i = 0; i < 12; i++) B.step(R(0.2, 2), 0.2); },
    guqin(t = 0) { const sc = [N.D3, N.E3, N.G3, N.A3, N.C4, N.D4]; [0, 2, 4, 3, 5, 4, 2].forEach((n, i) => pluck(sc[n], { t: t + i * 0.45, vol: 0.3, decay: 0.997, bright: 0.35, dest: musicBus, body: true })); },
    chuSong(t) { return Music.chuSong(t); },
    // 兼容旧接口
    drum(t = 0, v = 0.9) { B.taiko(t, v); }, boom(t, big) { B.boom(t, big); }, cannon(t) { B.cannon(t); }, crack(t) { B.crack(t); }, splash(t) { B.splash(t); },
    clang(t) { B.clang(t, 0.35); }, slash(t) { B.whoosh(t, 0.2, 0.5); }, gong(t, v) { B.gong(t, v); },
    hooves(t, d, n) { B.hooves(t, d, n, 0.28); }, rumble(t, d) { B.wheels(t, d); }, shout(t) { B.shout(t, 6, 0.08); },
    march(t, steps) { B.march(t, steps * 0.25, 10, 0.2); }, whoosh(t, d) { B.whoosh(t, d); }, arrows(t) { B.arrows(t); }, thunk(t) { B.thunks(t); },
    row(t) { B.splash(t, 0.1); }, wind(t = 0, dur = 6) { nz({ t, dur, type: 'bandpass', f: 400, f2: 900, q: 0.8, vol: 0.4, a: 1.5 }); nz({ t: t + 1, dur, type: 'lowpass', f: 300, vol: 0.4, a: 1.5 }); },
  };
  return S;
})();

// ===== 配音：内嵌 MP3，按台词编号播放 =====
const Voice = (() => {
  const LINES = window.VOICE_LINES || {};
  const CLIPS = window.VOICE_CLIPS || {};
  const SPK = { narr: '', xiang: '项王', liu: '汉王', elder: '乌江亭长' };
  const bufs = new Map();
  let enabled = true, cur = null, barkSrc = null;
  const barkCut = () => { if (barkSrc) { try { barkSrc.stop(); } catch (e) { } barkSrc = null; } };
  function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decode(id) {
    if (bufs.has(id)) return bufs.get(id);
    const ctx = Sfx.ctx;
    if (!ctx || !CLIPS[id]) return Promise.resolve(null);
    const p = new Promise(res => { try { ctx.decodeAudioData(b64ToBuf(CLIPS[id]), b => res(b), () => res(null)); } catch (e) { res(null); } });
    bufs.set(id, p);
    return p;
  }
  return {
    LINES, SPK,
    get enabled() { return enabled; }, set enabled(v) { enabled = v; if (!v) this.cancel(); },
    preload(ids) { (ids || Object.keys(CLIPS)).forEach(decode); },
    has(id) { return !!LINES[id]; },
    speaker(id) { return SPK[(LINES[id] || {}).spk] ?? ''; },
    text(id) { return (LINES[id] || {}).text || ''; },
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
      if (cur) { try { cur.stop(); } catch (e) { } }
      cur = s;
      s.start();
      return new Promise(res => { let done = false; const fin = () => { if (cur === s) cur = null; if (!done) { done = true; res(); } }; s.onended = fin; setTimeout(fin, (d + 0.5) * 1000); }).then(() => (minDur > d ? Core.sleep(minDur - d) : null));
    },
    cancel() { if (cur) { try { cur.stop(); } catch (e) { } cur = null; } barkCut(); },
    // 兵种台词：单独一路，不打断主帅/旁白，也不被它们打断；新的一句会接替上一句
    async bark(id, { vol = 0.9, pan = 0, skipIfBusy = false } = {}) {
      if (!enabled || !Sfx.ctx || !CLIPS[id]) return;
      if (skipIfBusy && cur) return;
      const buf = await decode(id); if (!buf) return;
      const ctx = Sfx.ctx;
      barkCut();
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = vol;
      let node = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
      s.connect(g); node.connect(Sfx.voiceBus);
      barkSrc = s; s.onended = () => { if (barkSrc === s) barkSrc = null; };
      s.start();
    },
  };
})();
