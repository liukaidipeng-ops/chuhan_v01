# 步兵行军（试听台 b49）：Ham 10-10 “做一些真实的步兵行军声音”。
# 素材：0 A.D. 单步脚步（singlesteps fs_gravel / fs_sand，CC BY-SA 3.0，已署名）+ 库内 chain、metal（CC0）+ 0ad 盾牌轻碰。
# 用法：python3 mkmarch.py <0ad audio 目录> <sfx 目录> <输出目录>
import sys, json, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0]); import vproc as V
AU, SFX, O = sys.argv[1:4]; SR = V.SR
MAN = json.load(open(SFX + '/manifest.json', encoding='utf8')); C = {}
def L(p): C.setdefault(p, V.load(p)); return C[p]
STEP = {k: [L(f'{AU}/actor/singlesteps/fs_{k}{i}.ogg') for i in range(1, 9)] for k in ('gravel', 'sand')}
def lib(g): return [L(SFX + '/out/' + x['f']) for x in MAN[g]]
CHAIN, METAL = lib('chain'), lib('metal')
SH = [L(f'{AU}/attack/impact/shield_wood_{n:02d}.ogg') for n in (3, 5, 16)]
def rate(x, r): n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)
def lp(x, f):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(2, f, 'lp', fs=SR, output='sos'), x)
def add(buf, x, t, db):
    s = int(t * SR); n = min(len(x), len(buf) - s)
    if n > 0 and s >= 0: buf[s:s + n] += x[:n] * 10 ** (db / 20)
def march(men, dur, beat, instep, ground='gravel', gear=1.0, seed=0, drum=False, war=0):
    r = np.random.default_rng(seed); buf = np.zeros(int((dur + 1) * SR))
    for m in range(men):
        dist = r.uniform(0, 1)          # 远近：远的轻、闷
        ph = 0 if instep else r.uniform(0, beat); b = beat if instep else beat * r.uniform(0.92, 1.08)
        t = ph + r.uniform(0, 0.03); k = 0
        while t < dur:
            st = STEP[ground][int(r.integers(8))]; st = lp(rate(st, r.uniform(0.85, 1.0)), 6000 - 3500 * dist)
            add(buf, st, t + (r.uniform(-0.025, 0.025) if instep else 0), -6 - 8 * dist - (0 if k % 2 else 1.5))
            if r.random() < 0.55 * gear: add(buf, rate(CHAIN[int(r.integers(len(CHAIN)))], r.uniform(0.9, 1.2))[:int(0.25 * SR)], t + 0.02, -24 - 6 * dist)
            if r.random() < 0.12 * gear: add(buf, rate(METAL[int(r.integers(len(METAL)))], r.uniform(1.4, 1.9))[:int(0.15 * SR)], t + 0.03, -30 - 6 * dist)
            if r.random() < 0.08 * gear: add(buf, rate(SH[int(r.integers(3))], 1.3), t + 0.05, -26 - 6 * dist)
            t += b; k += 1
    if drum:
        D = lib('drum')
        for i in range(int(dur / (beat * 2)) + 1): add(buf, D[i % len(D)], i * beat * 2, -10 if i % 2 == 0 else -14)
    if war:   # 四级：真实战鼓（和游戏决战鼓同一套大鼓录音，降调更沉）。war=1 每步一下重鼓；war=2 “咚——咚咚”
        D, SO = lib('drum'), lib('soft')
        def big(t, db): add(buf, rate(D[int(r.integers(len(D)))], 0.62), t, db); add(buf, rate(SO[int(r.integers(len(SO)))], 0.5), t, db - 14)
        def small(t, db): add(buf, rate(D[int(r.integers(len(D)))], 1.25), t, db)
        i = 0
        while i * beat < dur:
            t = i * beat
            if war == 1: big(t, -6 if i % 4 == 0 else -9); small(t + beat / 2, -18)
            else:
                if i % 2 == 0: big(t, -5)
                else: big(t, -10); big(t + beat / 2, -8)
            i += 1
    e = np.ones(len(buf)); f = int(0.6 * SR); e[:f] = np.linspace(0, 1, f); e[int(dur * SR) - f:int(dur * SR)] = np.linspace(1, 0, f); e[int(dur * SR):] = 0
    return V.norm(V.reverb(buf * e, wet=0.12, rt=0.8)[:int((dur + 0.3) * SR)], 0.9)
V.save(march(12, 5, 0.55, True, 'gravel', 1.0, 1), O + '/march_step.mp3', '64k')        # 整齐行军：步调一致
V.save(march(12, 5, 0.55, False, 'gravel', 1.0, 2), O + '/march_loose.mp3', '64k')      # 散着走：各走各的
V.save(march(12, 5, 0.55, True, 'gravel', 1.0, 3, True), O + '/march_drum.mp3', '64k')  # 整齐行军 + 鼓点
V.save(march(20, 5, 0.5, True, 'sand', 1.6, 4), O + '/march_heavy.mp3', '64k')          # 重甲大队：人多、甲片响
V.save(march(3, 4, 0.55, False, 'gravel', 1.0, 5), O + '/march_three.mp3', '64k')        # 三个人
V.save(march(20, 5, 0.5, True, 'sand', 1.6, 4, war=1), O + '/march_heavy_war1.mp3', '64k')  # 四级：重甲 + 战鼓每步一下（b50）
V.save(march(20, 5, 0.5, True, 'sand', 1.6, 4, war=2), O + '/march_heavy_war2.mp3', '64k')  # 四级：重甲 + 战鼓“咚——咚咚”（b50）
