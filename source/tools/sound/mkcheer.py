# 兵卒欢呼（试听台 b41）：MiniMax 合成（voicelab b41）的不带词喊声，六个男声，叠成一群人。
# 用法：python3 mkcheer.py <voicelab/out/b41 目录> <输出目录>
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0]); import vproc as V
SRC, O = sys.argv[1:3]; SR = V.SR
L = lambda i, k: V.trim(V.load(f'{SRC}/' + next(n for n in __import__('os').listdir(SRC) if n.endswith(f'cheer_{i}_{k}.mp3'))), lead=0.01, tailpad=0.1, db=-42)
def rate(x, r): n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)
def level(x, db): return x * 10 ** ((db - V.rms_db(x)) / 20)
X = {(i, k): L(i, k) for i in range(6) for k in 'aohy'}
def crowd(n, kinds, spread, seed, wet=0.25):
    r = np.random.default_rng(seed); buf = np.zeros(int((spread + 3.0) * SR))
    for j in range(n):
        i = j % 6 if j < 6 else int(r.integers(6)); k = kinds[int(r.integers(len(kinds)))]
        x = level(rate(X[(i, k)], r.uniform(0.9, 1.08) if j >= 6 else 1.0), r.uniform(-24, -17))
        s = int(r.uniform(0, spread) * SR); buf[s:s + len(x)] += x[:len(buf) - s]
    return V.norm(V.reverb(V.trim(buf, lead=0.01, tailpad=0.4, db=-45), wet=wet, rt=1.3), 0.93)
V.save(crowd(6, 'aoy', 0.4, 1), O + '/cheer_s.mp3', '64k')
V.save(crowd(10, 'aohy', 0.6, 2), O + '/cheer_m.mp3', '64k')
V.save(crowd(16, 'aohy', 0.9, 3, 0.3), O + '/cheer_l.mp3', '64k')
V.save(crowd(8, 'h', 0.5, 4), O + '/cheer_laugh.mp3', '64k')
