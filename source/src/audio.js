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
  // 播放录音。i = 指定第几段（不给就随机挑一段）；dur = 放到第几秒收住，最后 fade 秒淡出
  function smp(id, { t = 0, vol = 0.5, rate = 1, rj = 0.08, pan, dest, loop = false, dur, lp, i, fade = 0.3 } = {}) {
    if (!ok()) return;
    const list = samples[id]; if (!list || !list.length) return;
    const buf = list[i == null ? Math.floor(Math.random() * list.length) : i % list.length]; if (!buf) return;
    const T = now() + Math.max(0, t);
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = loop;
    s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * rj);
    const g = ctx.createGain(); g.gain.value = vol;
    let node = s;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.connect(f); node = f; }
    node.connect(g); g.connect(out(dest || sfxBus, pan ?? R(-0.4, 0.4)));
    s.start(T);
    if (dur) { g.gain.setValueAtTime(vol, T + Math.max(0, dur - fade)); g.gain.linearRampToValueAtTime(0.0001, T + dur); s.stop(T + dur + 0.05); }
  }
  // 把一段录音铺满 dur 秒：录音不够长就接着再放一遍（首尾交叠一点），到点淡出
  function run(id, { t = 0, dur = 1, i, pan, rate = 1, fade = 0.4, ...o } = {}) {
    const list = samples[id]; if (!ok() || !list || !list.length) return;
    const k = i == null ? Math.floor(Math.random() * list.length) : i % list.length, buf = list[k]; if (!buf) return;
    const len = buf.duration / rate, hop = Math.max(0.5, len - 0.25); pan = pan ?? R(-0.4, 0.4);
    for (let a = 0; a < dur - 0.15; a += hop) smp(id, { ...o, i: k, rate, pan, t: t + a, dur: dur - a < len ? dur - a : undefined, fade: Math.min(fade, (dur - a) * 0.6) });
  }
  // 轮着用：同一组录音洗一遍牌挨个放，放完再洗（三门炮连着响，不会连出同一声）
  const bags = {};
  function pick(id) {
    const n = samples[id] ? samples[id].length : 0; if (!n) return 0;
    let b = bags[id]; if (!b || !b.length) { b = bags[id] = [...Array(n).keys()].sort(() => Math.random() - 0.5); }
    return b.pop();
  }
  // —— 兵种台词和音效的衔接 ——
  // 兵种一开口就登记“这句说到什么时候”；马、象、虎的脚步和叫声照着排：先台词，再脚步，最后叫声
  let cue = 0;
  const lineLeft = () => (ok() ? Math.max(0, cue - now()) : 0);
  // 脚步该在多少秒后起：压着台词的尾音（tight 秒）进来。小队照这个时间起步，画面和声音才对得上
  const after = (tight = 0.45) => { const L = lineLeft(); return L > tight ? L - tight : 0; };
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
  // 真实录音相对旧的合成音的音量系数（各处调用还是按旧的习惯传 v）
  const HOOF_GAIN = 1.7, NEIGH_GAIN = 5, CRY_GAIN = 2.6, MARCH_GAIN = 1.5;
  // 鼓点回调：每敲一下大鼓（音效也好、配乐也好）知会一声，场边擂鼓的士兵跟着动。t = 多少秒后响，v = 多响
  let drumCb = null;
  const drumHit = (t, v) => { if (drumCb) try { drumCb(Math.max(0, t || 0), v == null ? 0.8 : v); } catch (e) { } };
  const B = {
    // 战鼓：真实大鼓录音降调 + 鼓皮拍击，合成低频只作补底
    taiko(t = 0, v = 0.9, p = 1, pan, dest) {
      drumHit(t, v);
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
    // 行军脚步：真实脚步录音。5 人以上用“一队人行军”那条，1～3 人用对应人数的那条（都是不加处理的原声）
    march(t = 0, dur = 1.5, men = 12, v = 0.22, quick = false) {
      const id = men >= 5 ? 'troop' : 'foot' + Math.max(1, Math.min(3, Math.round(men)));
      run(id, { t, dur: dur + 0.35, vol: v * MARCH_GAIN * (men >= 5 ? 1 : [1.5, 1.5, 1.25, 1.1][Math.max(1, Math.min(3, Math.round(men)))]), rate: quick ? 1.18 : 1, rj: 0.02 });
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
    // 马蹄：真实录音（做过“踏在土上”的处理）。几匹马叠几层，最多三层：每层换一段录音、明显错开、快慢略有不同
    hooves(t = 0, dur = 1.5, horses = 1, v = 0.3) {
      const L = samples.hoofr ? samples.hoofr.length : 0; if (!L) return;
      const n = Math.max(1, Math.min(3, Math.round(horses))), first = Math.floor(Math.random() * L);
      const offs = [0, R(0.17, 0.3), R(0.38, 0.55)], rates = [1, R(0.9, 0.95), R(1.06, 1.12)], gains = [1, 0.8, 0.67];
      for (let i = 0; i < n; i++) run('hoofr', { i: first + i * 2, t: t + offs[i], dur: Math.max(0.6, dur - offs[i]), vol: v * HOOF_GAIN * gains[i], rate: rates[i], rj: 0, pan: [0, -0.45, 0.45][i] + R(-0.15, 0.15) });
    },
    // 马嘶：真实录音。kind：'m' 行进时、'a' 进攻、'd' 倒地
    neigh(t = 0, v = 0.12, kind = 'm') { smp(kind === 'a' ? 'neigha' : kind === 'd' ? 'neighd' : 'neighm', { t, vol: v * NEIGH_GAIN, rj: 0.03 }); },
    snort(t = 0, v = 0.2) { smp('breath', { t, vol: v, rate: R(0.6, 0.8) }); },
    // 虎啸 / 低吼：有真实录音（tiger、tigergrowl）就用，没有就拿现成的兽吼压低了顶上
    roar(t = 0, v = 0.6, fall = false, atk = false) { if (atk && has('tigeratk')) smp('tigeratk', { t, vol: v, rj: 0.02 }); else if (has('tiger')) smp('tiger', { t, vol: v, rate: fall ? 0.86 : 1, rj: 0.02 }); else smp('roar', { t, vol: v, rate: fall ? 0.6 : 0.78 }); },
    growl(t = 0, v = 0.3) { if (has('tigergrowl')) smp('tigergrowl', { t, vol: v, rate: R(0.92, 1.05) }); else smp('roar', { t, vol: v * 0.5, rate: 0.5, lp: 900 }); },
    wheels(t = 0, dur = 1.5, v = 0.4) { smp('rolling', { t, vol: v, loop: true, dur: dur + 0.2, rate: R(0.7, 0.9) }); nz({ t, dur, type: 'lowpass', f: 140, vol: v * 0.8, a: 0.2, hold: dur * 0.5 }); },
    whip(t = 0) { nz({ t, dur: 0.06, type: 'highpass', f: 2500, vol: 0.6 }); smp('swing', { t: t - 0.06, vol: 0.2, rate: 1.4 }); },
    horn(t = 0, dur = 2.2, f = 98, v = 0.2) { voiceOsc({ t, f, dur, vol: v, cut: 350, cut2: 1400, q: 2, a: 0.25, rel: 0.6, vib: 0.006, detune: 6, bend: 0.8 }); voiceOsc({ t, f: f / 2, dur, vol: v * 0.6, type: 'square', cut: 250, cut2: 600, a: 0.3, rel: 0.6, bend: 0.8 }); },
    boom(t = 0, big = 1) { smp('boom', { t, vol: 0.9 * big, rate: R(0.7, 0.9) }); tn({ t, f: 60, f2: 26, dur: 1.4 * big, vol: 0.9 }); nz({ t, dur: 1.6 * big, type: 'lowpass', f: 1400, f2: 90, vol: 0.5 }); smp('rockfall', { t: t + 0.4, vol: 0.25 * big }); },
    cannon(t = 0) { smp('cannon', { t, vol: 1, rate: R(0.85, 1) }); tn({ t, f: 55, f2: 30, dur: 1.1, vol: 0.8 }); nz({ t: t + 0.05, dur: 2.2, type: 'lowpass', f: 300, f2: 80, vol: 0.3, a: 0.1 }); },
    // 巨炮：三条成品（实录炮响 + 爆炸 + 火药爆炸叠出来的）轮着用；small = 技能模式一级的初级炮
    bigCannon(t = 0, v = 1, small = false) { if (small && has('cannon1')) smp('cannon1', { t, vol: v * 0.8, rj: 0.03 }); else if (has('bigcannon')) smp('bigcannon', { i: pick('bigcannon'), t, vol: v, rj: 0.03 }); else B.cannon(t); },
    // 炮弹炸开：三条成品（爆炸 + 投石命中）轮着用
    blast(t = 0, v = 1, small = false) { if (has('blast')) smp('blast', { i: pick('blast'), t, vol: v * (small ? 0.55 : 1), rate: small ? 1.15 : 1, rj: 0.03 }); else B.boom(t, v); },
    fuse(t = 0, dur = 0.5) { if (has('fuse')) { smp('fuse', { t, vol: 0.5, rj: 0.04, dur: Math.max(0.3, dur + 0.25), fade: 0.2 }); return; } for (let i = 0; i < dur / 0.03; i++) nz({ t: t + i * 0.03, dur: 0.02, type: 'highpass', f: R(3000, 7000), vol: R(0.05, 0.14) }); },
    whistle(t = 0, dur = 1) { tn({ t, f: 1500, f2: 520, dur, vol: 0.09, a: 0.1 }); nz({ t, dur, type: 'bandpass', f: 1200, f2: 500, q: 8, vol: 0.16, a: 0.1 }); },
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
    // 象鸣：真实大象录音，三声随机；i 指定用哪一声（0 = 行进时那声）。第二声录得偏响，压一点
    trumpet(t = 0, v = 0.22, i) {
      const n = samples.elecry ? samples.elecry.length : 0; if (!n) return;
      const k = i == null ? Math.floor(Math.random() * n) : i % n;
      smp('elecry', { i: k, t, vol: v * CRY_GAIN * (k === 1 ? 0.7 : 1), rj: 0.02 });
    },
    stompHeavy(t = 0, v = 0.6) {
      if (has('stomp')) { smp('stomp', { t, vol: v, rate: R(0.7, 0.85) }); smp('drum', { t, vol: v * 0.5, rate: 0.5, rj: 0.05 }); return; }
      tn({ t, f: 50, f2: 30, dur: 0.4, vol: v }); nz({ t, dur: 0.2, type: 'lowpass', f: 180, vol: v * 0.6 }); },
    heave(t = 0) { // 炮手号子"嘿——呦"（合成的人声，现在不用了：炮手有真人台词）
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
    // 兵：真实的行军脚步（不擂鼓）。n = 技能模式里这一队几个人（0 = 普通模式的整队）；冲锋：一队人跑步的原声；接敌：矛刺 + 兵器碰撞 + 喊杀
    inf: {
      move(dur = 1.3, n = 0) { B.march(0.05, dur, n || 12, 0.24); },
      charge(dur = 1, n = 0) { smp('trooprun', { t: 0, vol: 0.6 * (n ? [0.6, 0.6, 0.75, 0.9][Math.min(3, n)] : 1), rj: 0.02, dur: dur + 0.5, fade: 0.4 }); },
      impact() { for (let i = 0; i < 4; i++) B.stab(i * 0.08 + R(0, 0.04), 0.4); B.clang(0.02, 0.4); B.clang(0.12, 0.35); B.shout(0.05, 6, 0.08, 0.5); },
    },
    // 车：扬鞭 + 车轮滚滚 + 驷马小跑
    chariot: {
      move(dur = 1) { B.whip(0); B.wheels(0.05, dur + 0.2, 0.4); B.hooves(0.05, dur + 0.4, 2, 0.2); B.creak(0.2, 0.06); },
      charge(dur = 2) { B.horn(0, 1.4, 110, 0.18); for (let k = 0; k < 8; k++) B.taiko(0.1 + k * 0.14, 0.4, 1); B.whip(0.3); B.wheels(0.3, dur, 0.55); B.hooves(0.3, dur, 3, 0.3); B.neigh(0.5, 0.1, 'a'); B.shout(0.4, 6, 0.08); },
      impact() { B.woodbreak(0, 0.7); B.boom(0.02, 0.4); B.clang(0.03, 0.35); B.neigh(0.15, 0.09, 'a'); for (let i = 0; i < 5; i++) B.stab(R(0.02, 0.3), 0.3); },
      destroy() { B.woodbreak(0, 0.8); B.woodbreak(0.15, 0.6); smp('hit', { t: 0.3, vol: 0.4 }); B.neigh(0.1, 0.12, 'd'); smp('metalfall', { t: 0.4, vol: 0.3 }); },
    },
    // 马：全用真实录音。n = 叠几层马蹄（普通模式 3 层；技能模式一级 1 层、二级 2 层、三级起 3 层）
    cav: {
      // 移动：台词 → 马蹄（压着台词尾音起）→ 马嘶（马蹄过半之后）。返回马蹄几秒后起，马队照这个时间起步
      move(dur = 1.2, n = 3) { const w = after(), len = Math.max(2.2, dur + 0.7); B.hooves(w, len, n, 0.3); smp('chain', { t: w + 0.1, vol: 0.1 }); B.neigh(w + len * 0.62, 0.12, 'm'); return w; },
      // 进攻：战争马蹄垫在台词下面一起跑，台词一完马嘶就起
      charge(dur = 1.8, n = 3) { const L = lineLeft(); smp('hoofwar', { t: 0.1, vol: (L ? 0.36 : 0.55) * [1, 0.75, 0.88, 1][Math.min(3, n)], rj: 0.02, dur: Math.max(2, dur + 0.6), fade: 0.5 }); B.neigh(Math.max(L + 0.02, 0.9), 0.14, 'a'); },
      impact() { B.whoosh(0, 0.18, 0.5); smp('blade', { t: 0.08, vol: 0.5 }); B.stab(0.1, 0.5); B.shout(0.2, 4, 0.08, 0.4); },
      die() { B.neigh(0, 0.14, 'd'); B.thud(0.6, 0.6); },
    },
    // 炮：移动 = 炮车轮子滚动 + 吱呀；开炮 = 台词说完直接点引信 → 炮响；另一组 = 炮弹呼啸 → 落地炸开 + 碎石
    //   lv = 技能模式的等级（0 = 普通模式）：一级用初级炮，其余用巨炮
    cannon: {
      move(dur = 1) { const w = after(0.75); B.wheels(w, dur, 0.25); for (let k = 0; k * 0.7 < dur; k++) B.creak(w + k * 0.7, 0.07); return w; },
      ready() { B.creak(0.1, 0.08); },
      fire(i, lv = 0) { B.fuse(0, 0.14); B.bigCannon(0.14, 1, lv === 1); B.whistle(0.4, 0.9); },
      explode(big, lv = 0) { const sm = lv === 1; B.blast(0, big ? 1 : 0.75, sm); smp('rockfall', { t: 0.35, vol: (big ? 0.3 : 0.18) * (sm ? 0.6 : 1) }); },
      destroy() { B.boom(0.1, 0.7); B.woodbreak(0.05, 0.6); B.metalfall(0.3, 0.5); smp('metalfall', { t: 0.6, vol: 0.3, rate: 0.7 }); },
      impact() { B.blast(0, 0.9); },
    },
    // 相（汉弩）：轻步 + 弩机上弦；齐射：弦响 + 箭雨 + 钉入
    xbow: {
      move(dur = 0.8) { B.march(0, dur, 3, 0.2); smp('metal', { t: 0.1, vol: 0.1, rate: 1.8 }); },
      draw() { B.bowDraw(0); B.bowDraw(0.12); smp('metal', { t: 0.3, vol: 0.12, rate: 1.9 }); B.taiko(0, 0.4); },
      release() { B.twang(0, 8); B.arrows(0.06, 16); },
      impact() { B.thunks(0, 12); B.shout(0.1, 3, 0.06, 0.4); },
    },
    // 相（汉虎骑）：和马一个路数。移动：台词 → 慢步 → 一声压低了的虎啸；进攻：台词压着窜出的脚步，台词一完就是那声进攻的虎啸
    tiger: {
      move(dur = 1.2) { const w = after(), len = Math.min(2.8, dur + 0.8); run('paws', { t: w, dur: len, vol: 0.4, rj: 0.02 }); B.roar(w + len * 0.62, 0.36); return w; },
      roar() { B.roar(lineLeft() + 0.02, 0.8, false, true); },
      charge() { B.whoosh(0.05, 0.4, 0.4); smp('paws', { t: 0.1, vol: lineLeft() ? 0.3 : 0.45, rate: 1.5, rj: 0.02, dur: 1.3 }); },
      impact() { B.stab(0, 0.55); B.thud(0.02, 0.5); smp('slash', { t: 0, vol: 0.4 }); },
      die() { B.roar(0, 0.5, true); },
    },
    // 象（楚战象）：和马一个路数，全用真实录音。移动：台词 → 重步 → 象鸣；进攻：台词压着奔踏，台词一完象鸣；倒地也是一声象鸣（三声随机）
    ele: {
      move(dur = 1.4) { const w = after(), len = dur + 0.5; run('elestep', { t: w, dur: len, vol: 0.5, rj: 0.02 }); smp('chain', { t: w + 0.3, vol: 0.12, rate: 0.6 }); B.trumpet(w + Math.min(len * 0.62, 1.8), 0.2, 0); return w; },
      trumpet() { B.trumpet(0, 0.24); },
      charge(dur = 1.2) { smp('elerun', { t: 0.1, vol: lineLeft() ? 0.36 : 0.55, rj: 0.02, dur: Math.max(2, dur + 0.9), fade: 0.5 }); },
      cry() { B.trumpet(lineLeft() + 0.02, 0.24); },
      stomp() { B.boom(0, 0.5); B.stompHeavy(0, 0.9); smp('rockfall', { t: 0.05, vol: 0.5 }); for (let i = 0; i < 4; i++) B.stab(R(0.02, 0.2), 0.3); },
      dieCry() { B.trumpet(0, 0.26); },
      impact() { B.stompHeavy(0, 0.8); },
    },
    // 士：甲叶叮当 + 盾牌相击；近身：刀出鞘 + 盾撞 + 刀砍
    guard: {
      move(dur = 0.8, n = 2) { B.march(0, dur, n || 2, 0.26); smp('chain', { t: 0, vol: 0.2 }); B.plate(0.3, 0.2); },
      charge() { B.ring(0, 0.3); B.ring(0.08, 0.25); B.shout(0.2, 3, 0.1, 0.5); },
      impact() { B.whoosh(0, 0.12, 0.45); smp('blade', { t: 0.05, vol: 0.45 }); B.plate(0.1, 0.45); B.stab(0.14, 0.4); },
    },
    // 帅（刘邦）：一声铜锣 + 亲兵脚步；亲斩：号角 + 锣 + 拔剑 + 剑鸣 + 万人呐喊
    liu: {
      move(dur = 1) { B.gong(0, 0.35); B.march(0.05, dur, 3, 0.26); smp('chain', { t: 0.2, vol: 0.1 }); },
      charge() { B.horn(0, 1.6, 98, 0.2); B.gong(0.1, 0.8); for (let k = 0; k < 5; k++) B.taiko(0.2 + k * 0.15, 0.5, 0.9); },
      draw() { smp('unsheathe', { vol: 0.55, rate: 0.9 }); },
      impact() { B.whoosh(0, 0.2, 0.55); smp('blade', { t: 0.05, vol: 0.6, rate: 0.8 }); B.whoosh(0.2, 0.2, 0.5); smp('blade', { t: 0.25, vol: 0.5 }); B.shout(0.3, 14, 0.08, 1.0); },
    },
    // 将（项羽）：铜锣 + 乌骓马蹄；亲斩：号角 + 锣 + 大刀破风 + 裂地 + 万人呐喊
    xiang: {
      move(dur = 1) { B.gong(0, 0.4); B.hooves(0.05, dur + 0.4, 1, 0.3); B.snort(0.3, 0.2); },
      charge() { B.horn(0, 1.6, 87, 0.22); B.gong(0.1, 0.9); B.neigh(0.2, 0.12, 'a'); B.hooves(0.2, 1.4, 1, 0.36); for (let k = 0; k < 5; k++) B.taiko(0.2 + k * 0.14, 0.55, 0.85); },
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
  // 战意：一首录好的古风战斗曲（music-war.mp3，和网页放在一起，选了「战意」才去取）。循环播放，首尾交叠 1.6 秒；
  //   还没取回来时先不出声；确实取不到（比如把网页存到本地单独打开）才用下面合成的那一套顶着
  const WAR = { url: 'music-war.mp3?v=1', buf: null, loading: false, failed: false, gain: 0.5, xf: 1.6,
    hits: [0.36,0.8,0.59,0.6,1.95,0.7,2.14,0.6,2.47,1.0,2.74,0.8,4.15,0.7,4.34,0.5,4.71,0.8,4.94,0.5,5.16,0.5,6.28,0.7,6.55,0.5,7.33,0.7,7.52,0.5,8.97,0.7,9.28,0.6,9.94,0.5,11.0,0.8,11.37,0.6,13.06,0.8,13.25,0.5,13.46,0.5,15.22,0.8,15.62,0.5,17.23,0.7,17.44,0.6,17.64,0.5,18.04,0.5,19.31,0.8,19.54,0.6,19.95,0.5,20.39,0.6,21.23,0.5,21.43,0.6,21.63,0.7,22.27,0.5,22.79,0.5,23.51,0.6,23.69,0.5,23.89,0.5,24.17,0.5,24.48,0.5,25.34,0.5,25.59,0.7,25.89,0.5,26.1,0.5,26.32,0.5,26.57,0.5,27.66,1.0,27.84,0.5,28.17,0.5,28.63,0.5,29.0,0.6,29.75,0.8,31.83,1.0,33.84,0.6,34.21,0.6,35.03,0.5,35.31,0.5,35.6,0.6,35.99,0.8,36.29,0.6,36.53,0.5,37.2,0.5,37.67,0.5,38.0,0.7,38.22,0.5,38.44,0.6,38.78,0.5,39.68,0.5,40.02,0.5,40.3,0.7,40.56,0.5,41.25,0.6,41.89,0.5,42.23,0.7,42.47,0.6,43.05,0.5,43.41,0.5,43.6,0.5,43.82,0.5,44.12,0.5,44.31,0.7,44.53,0.5,44.83,0.5,45.26,0.5,45.66,0.6,45.85,0.6,46.39,0.7,46.66,0.5,48.41,0.6,48.59,0.5,48.77,0.5,50.48,0.7,50.86,0.5,52.56,0.8,52.76,0.5,52.94,0.5,54.64,0.6,55.01,0.5,56.73,0.7,56.91,0.5,58.88,0.8,59.11,0.5,60.89,0.7,61.07,0.5,62.95,0.9,63.17,0.6,65.0,0.7,65.28,0.5,67.08,0.7,67.33,0.6,67.97,0.5,68.48,0.5,68.93,0.5,69.16,0.7,69.42,0.6,69.74,0.6,69.92,0.5,70.46,0.5,70.82,0.5,71.06,0.6,71.31,0.7,71.61,0.5,72.21,0.5,72.68,0.5,73.3,0.8,73.56,0.6,73.85,0.5,74.17,0.5,74.49,0.5,74.97,0.5,75.19,0.5,75.47,0.8,75.75,0.6,76.12,0.5,76.46,0.5,77.45,0.7,77.82,0.6,78.35,0.5,78.59,0.5,79.33,0.6,79.53,0.8,79.94,0.5,80.2,0.6,80.88,0.5,81.61,0.6,81.82,0.6,82.05,0.5,82.31,0.5,82.51,0.5,82.74,0.5,83.71,0.9] };   // 曲子里的大鼓点 [秒, 力度, 秒, 力度…]：场边的擂鼓兵照着敲
  function loadWar() {
    if (WAR.buf || WAR.loading || WAR.failed || !ok() || typeof fetch !== 'function') return;
    WAR.loading = true;
    fetch(WAR.url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
      .then(buf => { WAR.buf = buf; WAR.loading = false; if (Music.on && Music.style === 'war' && !Music.track) Music.start(); })
      .catch(e => { WAR.loading = false; WAR.failed = true; console.warn('战意曲没取到，用合成的', e); if (Music.on && Music.style === 'war' && Music.wait) Music.start(); });
  }
  const Music = {
    track: false, wait: false, seg: null, srcs: [],
    style: 'zen', on: false, next: 0, bar: 0, timer: null, bus: null, idx: 5, intensity: 0.4, motif: null,
    start(style) {
      if (!ok()) return;
      if (style) this.style = style;
      this.stop(true);
      if (this.style === 'off') return;
      this.on = true; this.bar = 0; this.next = now() + 0.3;
      this.bus = ctx.createGain(); this.bus.gain.setValueAtTime(0.0001, now()); this.bus.gain.exponentialRampToValueAtTime(1, now() + 3); this.bus.connect(musicBus);
      const war = this.style === 'war';
      this.track = war && !!WAR.buf;
      this.wait = war && !WAR.buf && !WAR.failed;   // 曲子还在路上：先不出声（不拿合成的那版垫着，免得两版先后接上、听着像混在一起）
      if (this.track) this.seg = this.playSeg(now() + 0.3, 0.05);
      else if (!this.wait) this.startPad();
      if (this.wait) loadWar();
      this.timer = setInterval(() => this.tick(), 120);
    },
    // 放一遍录好的曲子：t0 开始，fade 秒淡入
    playSeg(t0, fade) {
      const src = ctx.createBufferSource(); src.buffer = WAR.buf;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(WAR.gain, t0 + Math.max(0.02, fade));
      src.connect(g); g.connect(this.bus); src.start(t0);
      this.srcs.push(src); src.onended = () => { const i = this.srcs.indexOf(src); if (i >= 0) this.srcs.splice(i, 1); try { g.disconnect(); } catch (e) { } };
      return { src, g, t0, end: t0 + WAR.buf.duration, hi: 0, next: false };
    },
    trackTick() {
      const s = this.seg; if (!s) return;
      const t = now(), pos = t - s.t0, H = WAR.hits;
      while (s.hi < H.length && H[s.hi] < pos + 0.6) { const d = H[s.hi] - pos; if (d > -0.05) drumHit(Math.max(0, d), H[s.hi + 1]); s.hi += 2; }
      if (!s.next && t > s.end - WAR.xf - 0.7) {   // 快到头了：下一遍提前交叠着进来
        s.next = true;
        const tN = s.end - WAR.xf;
        s.g.gain.setValueAtTime(WAR.gain, tN); s.g.gain.linearRampToValueAtTime(0.0001, s.end);
        try { s.src.stop(s.end + 0.05); } catch (e) { }
        this.seg = this.playSeg(tN, WAR.xf);
      }
    },
    stop(fast) {
      this.on = false; clearInterval(this.timer); this.timer = null;
      for (const src of this.srcs.splice(0)) { try { src.stop(ok() ? now() + (fast ? 0.5 : 2.6) : 0); } catch (e) { } }
      this.seg = null; this.track = false; this.wait = false;
      if (this.bus && ok()) { const b = this.bus; b.gain.cancelScheduledValues(now()); b.gain.setValueAtTime(b.gain.value, now()); b.gain.linearRampToValueAtTime(0.0001, now() + (fast ? 0.4 : 2.5)); setTimeout(() => { try { b.disconnect(); } catch (e) { } }, 3000); }
      this.bus = null;
    },
    duck(on) { if (this.bus && ok()) { this.bus.gain.cancelScheduledValues(now()); this.bus.gain.linearRampToValueAtTime(on ? 0.25 : 1, now() + 0.8); } },
    setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); },
    startPad() {
      if (this.style === 'final') return;   // 决战：只有鼓、锣、人声的录音，不垫合成音
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
      if (this.wait) return;
      if (this.track) { this.trackTick(); return; }
      while (this.next < now() + 0.8) {
        const t = this.next - now();
        this.next += this.style === 'zen' ? this.zenBar(t) : this.style === 'final' ? this.finalBar(t) : this.warBar(t);
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
    // —— 决战：一阵紧过一阵的战鼓（全用录音：大鼓、小鼓、滚奏、锣、呐喊），不用合成乐器 ——
    finalBar(t) {
      const dest = this.bus, beat = 60 / 132, st = beat / 4, bar = this.bar, ph = bar % 8;
      const big = (i, v, r = 0.62) => { drumHit(t + i * st, v); if (has('drum')) { smp('drum', { t: t + i * st, vol: v, rate: r, rj: 0.03, dest }); smp('soft', { t: t + i * st, vol: v * 0.2, rate: 0.5, dest }); } else taikoTo(dest, t + i * st, v, 0.9); };
      const small = (i, v) => { if (has('drum')) smp('drum', { t: t + i * st, vol: v, rate: 1.25, rj: 0.06, dest, pan: i % 2 ? 0.25 : -0.25 }); else taikoTo(dest, t + i * st, v * 0.6, 1.5); };
      // 大鼓：咚——咚咚 咚——咚咚咚；每四小节最后一小节打满
      const bigPat = ph % 4 === 3 ? [1, 0, 0.7, 0, 1, 0, 0.7, 0.7, 1, 0.7, 0.8, 0.7, 1, 0.9, 1, 1] : ph % 2 ? [1, 0, 0, 0.6, 0, 0, 0.9, 0, 1, 0, 0.6, 0, 0.9, 0, 0.7, 0.8] : [1, 0, 0, 0, 0.8, 0, 0.6, 0, 1, 0, 0, 0.6, 0.9, 0, 0.7, 0];
      bigPat.forEach((v, i) => { if (v) big(i, v * 0.8, i % 8 === 0 ? 0.56 : 0.66); });
      // 小鼓：十六分音符铺底，重拍加重
      for (let i = 0; i < 16; i++) small(i, i % 4 === 0 ? 0.3 : i % 2 === 0 ? 0.2 : 0.13);
      if (ph % 4 === 3) smp('drumroll', { t: t + beat * 2, vol: 0.5, rate: 0.9, dest });
      if (ph % 4 === 0) { if (has('gong')) smp('gong', { t, vol: 0.4, rate: 0.9, dest }); else B.gong(t, 0.5, dest); }
      if (ph === 2 || ph === 6) smp('warcry', { t: t + beat * 2, vol: 0.5, dest });
      if (ph === 4) smp('cheer', { t: t + beat, vol: 0.32, dest });
      return beat * 4;
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
      if (Math.random() < 0.012) B.neigh(0, 0.016);
      if (Math.random() < 0.04) smp('cloth', { vol: 0.05, rate: 0.6 });
      if (Math.random() < 0.02) smp('water', { vol: 0.05, dur: 2 });
    }, 900);
  }

  const S = {
    init, B, U, unit, river, Music, pluck, hurt, smp,
    // 兵种台词开口：delay 秒后开始说，说 dur 秒。不带参数 = 这一步没有台词
    line(delay = 0, dur = 0) { cue = ok() && dur > 0 ? now() + delay + dur : 0; }, lineLeft,
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
  S.onDrum = fn => { drumCb = fn; };
  return S;
})();

// ===== 配音：内嵌 MP3，按台词编号播放 =====
const Voice = (() => {
  const LINES = window.VOICE_LINES || {};
  const CLIPS = window.VOICE_CLIPS || {};
  const SPK = { narr: '', xiang: '项王', liu: '汉王', elder: '乌江亭长' };
  // 两套配音：原版（内嵌在页面里）和写实版（单独一个包，选了才取；没取到之前先用原版顶着）
  const REAL = window.VOICE_REAL || null;
  const bufs = new Map(), durs = new Map();
  let enabled = true, cur = null, barkSrc = null, mode = 'orig', pack = null, packP = null;
  function loadPack() {
    if (pack || !REAL) return Promise.resolve();
    if (!packP) packP = fetch(REAL.url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(b => { pack = b; }).catch(() => { packP = null; });
    return packP;
  }
  const useReal = id => mode === 'real' && pack && REAL.idx[id];
  const barkCut = () => { if (barkSrc) { try { barkSrc.stop(); } catch (e) { } barkSrc = null; } };
  function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decode(id) {
    const real = useReal(id), key = (real ? 'R:' : 'O:') + id;
    if (bufs.has(key)) return bufs.get(key);
    const ctx = Sfx.ctx;
    if (!ctx || (!real && !CLIPS[id])) return Promise.resolve(null);
    const raw = real ? pack.slice(real[0], real[0] + real[1]) : b64ToBuf(CLIPS[id]);
    const p = new Promise(res => { try { ctx.decodeAudioData(raw, b => { durs.set(key, b.duration); res(b); }, () => res(null)); } catch (e) { res(null); } });
    bufs.set(key, p);
    return p;
  }
  return {
    LINES, SPK,
    get enabled() { return enabled; }, set enabled(v) { enabled = v; if (!v) this.cancel(); },
    // 配音风格：'real' 写实版 / 'orig' 原版
    get mode() { return mode; }, set mode(v) { mode = v === 'real' && REAL ? 'real' : 'orig'; if (mode === 'real') loadPack(); },
    get realReady() { return !!pack; },
    preload(ids) { const go = () => (ids || Object.keys(CLIPS)).forEach(decode); if (mode === 'real' && !pack) loadPack().then(go); else go(); },
    has(id) { return !!LINES[id] || !!(REAL && REAL.idx[id]); },   // 写实版里单独有的句子（比如虎骑的台词）也算
    speaker(id) { return SPK[(LINES[id] || {}).spk] ?? ''; },
    text(id) { return (mode === 'real' && REAL.text[id]) || (LINES[id] || {}).text || ''; },
    async play(id, { onDur, minDur = 0, rate = 1 } = {}) {
      const est = Math.max(minDur, this.text(id).length * 0.24 + 0.6);
      if (!enabled || !Sfx.ctx) { onDur && onDur(est); return Core.sleep(est); }
      // 写实版的包还在路上：主帅、旁白最多等它两秒半（免得一局里前一句原版、后一句写实），再不来就先用原版
      if (mode === 'real' && !pack) await Promise.race([loadPack(), new Promise(r => setTimeout(r, 2500))]);
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
    get busy() { return !!cur; },   // 主帅 / 旁白正在说话
    // 这句有多长（秒）：解码过就是准的，还没解码先按字数估，顺手开始解码
    dur(id) { const k = (useReal(id) ? 'R:' : 'O:') + id; if (durs.has(k)) return durs.get(k); decode(id); return this.text(id).replace(/[，。！？、…—\s]/g, '').length * 0.2 + 0.45; },
    // 兵种台词：单独一路，不打断主帅/旁白，也不被它们打断；新的一句会接替上一句
    async bark(id, { vol = 0.9, pan = 0, skipIfBusy = false } = {}) {
      if (!enabled || !Sfx.ctx || !(CLIPS[id] || useReal(id))) return;
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
