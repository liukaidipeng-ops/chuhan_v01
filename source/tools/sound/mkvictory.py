# 士兵得胜齐吼（试听台 b42）：MiniMax（voicelab b42）六个男声吼的语气 + 兵器敲盾（盾挡声成品，0 A.D. / CC0）。
# 用法：python3 mkvictory.py <voicelab/out/b42 目录> <盾挡声成品目录 pending/block> <输出目录>
import sys, os, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0]); import vproc as V
SRC, BLK, O = sys.argv[1:4]; SR = V.SR
L = lambda i, k: V.trim(V.load(f'{SRC}/' + next(n for n in os.listdir(SRC) if n.endswith(f'vic_{i}_{k}.mp3'))), lead=0.01, tailpad=0.1, db=-42)
def rate(x, r): n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)
def level(x, db): return x * 10 ** ((db - V.rms_db(x)) / 20)
X = {(i, k): L(i, k) for i in range(6) for k in ('h3', 'he', 'wl', 'ao')}
B = [V.load(f'{BLK}/block_{n}.mp3') for n in range(12)]
def onsets(x, n=3):   # 找“吼！吼！吼！”三声的起点
    e = np.convolve(x ** 2, np.ones(int(0.02 * SR)) / (0.02 * SR), 'same'); th = e.max() * 0.15; on = []; i = 0
    while i < len(e) and len(on) < n:
        if e[i] > th: on.append(i / SR); i += int(0.18 * SR)
        else: i += 1
    return on
def add(buf, x, t, g=1.0):
    s = int(t * SR)
    if s < 0: x, s = x[-s:], 0
    n = max(0, min(len(x), len(buf) - s)); buf[s:s + n] += x[:n] * g
def syll(x, n=3):   # 把“吼！吼！吼！”切成三声：取能量最高、相距 0.2 秒以上的三个峰，峰之间最低处为界
    w = int(0.05 * SR); e = np.convolve(np.abs(x), np.ones(w) / w, 'same')
    order = np.argsort(e)[::-1]; pk = []
    for i in order:
        if all(abs(i - q) > 0.2 * SR for q in pk): pk.append(int(i))
        if len(pk) == n: break
    pk.sort(); cut = [0] + [int(pk[k] + np.argmin(e[pk[k]:pk[k + 1]])) for k in range(n - 1)] + [len(x)]
    return [(x[cut[k]:cut[k + 1]], (pk[k] - cut[k]) / SR) for k in range(n)]
def chant(n, seed, bang=True, beat=0.55):   # 号子：大家对齐拍子一起吼三声，每声兵器敲盾
    r = np.random.default_rng(seed); buf = np.zeros(int(3.5 * SR)); T0 = 0.4
    for j in range(n):
        x = level(rate(X[(j % 6, 'h3')], r.uniform(0.94, 1.04) if j >= 6 else 1), r.uniform(-22, -17))
        for k, (seg, pk) in enumerate(syll(x)): add(buf, seg * np.minimum(1, np.minimum(np.arange(len(seg)) / (0.005 * SR), (len(seg) - np.arange(len(seg))) / (0.04 * SR))), T0 + k * beat - pk + r.uniform(-0.025, 0.025))
    if bang:
        for k in range(3):
            for _ in range(4): add(buf, level(B[int(r.integers(12))], -24), T0 + k * beat - 0.03 + r.uniform(-0.03, 0.04))
    return V.norm(V.reverb(V.trim(buf, lead=0.01, tailpad=0.4, db=-45), wet=0.25, rt=1.3), 0.93)
def roar(n, kinds, seed, bang=True):   # 拖长的齐吼，开头一阵乱敲
    r = np.random.default_rng(seed); buf = np.zeros(int(3.5 * SR))
    for j in range(n):
        x = level(rate(X[(j % 6, kinds[j % len(kinds)])], r.uniform(0.92, 1.05) if j >= 6 else 1), r.uniform(-22, -17)); add(buf, x, 0.1 + r.uniform(0, 0.25))
    if bang:
        for _ in range(8): add(buf, level(B[int(r.integers(12))], -24), 0.05 + r.uniform(0, 0.6))
    return V.norm(V.reverb(V.trim(buf, lead=0.01, tailpad=0.4, db=-45), wet=0.25, rt=1.3), 0.93)
V.save(chant(10, 1), O + '/vic_chant.mp3', '64k')
V.save(roar(10, ('he',), 2), O + '/vic_he.mp3', '64k')
V.save(roar(10, ('wl',), 3), O + '/vic_wl.mp3', '64k')
V.save(roar(14, ('he', 'wl', 'ao'), 4), O + '/vic_mix.mp3', '64k')
V.save(chant(10, 5, False), O + '/vic_chant_dry.mp3', '64k')
