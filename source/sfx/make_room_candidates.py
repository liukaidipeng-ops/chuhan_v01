"""b30：联机房间的两种提示音，各五个候选——有人进房、有人准备。录音素材都是 CC0（公共领域），合成的是我用代码做的"""
import sys, os, json, numpy as np
sys.path.insert(0, '..'); import vproc as V
SR = V.SR; SX = '/home/claude/chuhan_v01/source/sfx'; DL = '../roomsfx/dl'
OUT = '../voicedesk/audio/b30'; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
def L(p): return V.load(p)
def trim(x, db=-45): a, b = V.voiced(x, db); return x[int(a * SR): int(b * SR) + int(0.05 * SR)]
def fade(x, t=0.15): n = min(len(x), int(t * SR)); x = x.copy(); x[-n:] *= np.linspace(1, 0, n) ** 2; return x
def cut(x, sec): return fade(x[:int(sec * SR)])
def at(total, parts):   # parts: [(秒, 信号, 增益)]
    out = np.zeros(int(total * SR))
    for t, x, g in parts:
        i = int(t * SR); n = min(len(x), len(out) - i)
        if n > 0: out[i:i + n] += x[:n] * g
    return out
def level(x, db=-17.5):   # 按响度对齐（试听时各条一样响）
    pk = np.abs(x).max() or 1; x = x / pk
    r = np.sqrt(np.mean(x[np.abs(x) > 0.02] ** 2)) if np.any(np.abs(x) > 0.02) else 0.1
    x = x * 10 ** (db / 20) / r
    return np.tanh(x * 1.1) / np.tanh(1.1) * min(1, 0.95 / max(1e-9, np.abs(x).max())) if np.abs(x).max() > 0.95 else x
T = lambda n: np.arange(int(n * SR)) / SR
# ---------- 合成 ----------
def bell(f0, dur=2.4):   # 编钟：青铜钟的非谐泛音，各自衰减；敲击一瞬有点金属噪声
    t = T(dur); x = np.zeros_like(t)
    for r, a, d in [(0.5, 0.35, 1.6), (1.0, 1.0, 1.2), (1.19, 0.55, 0.9), (1.5, 0.4, 0.7), (2.0, 0.35, 0.5), (2.52, 0.25, 0.35), (3.01, 0.18, 0.25), (4.1, 0.1, 0.15)]:
        x += a * np.sin(2 * np.pi * f0 * r * t + rng.random() * 6) * np.exp(-t / d)
    n = rng.standard_normal(len(t)) * np.exp(-t / 0.012) * 0.6
    return x + n
def qin(f0, dur=2.2):   # 古琴拨弦：Karplus-Strong，带一点按音下滑
    n = int(dur * SR); N = int(SR / f0); buf = rng.uniform(-1, 1, N); out = np.zeros(n)
    for i in range(n):
        j = i % N; out[i] = buf[j]; buf[j] = 0.4985 * (buf[j] + buf[(j + 1) % N])
    t = T(dur); slide = np.interp(t, [0, 0.25, dur], [1.0, 1.0, 0.985])
    idx = np.clip(np.cumsum(slide), 0, n - 1).astype(int)
    body = V.butter(2, [90, 2400], btype='band', fs=SR, output='sos')
    return V.sosfilt(body, out[idx]) * np.exp(-t / 1.4)
def block(f, dur=0.25):  # 梆子 / 木鱼：两三个快速衰减的共振 + 一下敲击声
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * f * 2.3 * t) * np.exp(-t / 0.025) + 0.25 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t / 0.015)
    return x + rng.standard_normal(len(t)) * np.exp(-t / 0.004) * 0.4
def taiko(f0=105, dur=0.9, big=1.0):   # 战鼓：鼓皮的低音（敲下去音高往下掉）+ 第二模态 + 鼓槌的一下噪声
    t = T(dur); f = f0 * (1 + 0.6 * np.exp(-t / 0.03)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / (0.32 * big)) + 0.35 * np.sin(ph * 1.59) * np.exp(-t / 0.12) + 0.2 * np.sin(ph * 2.13) * np.exp(-t / 0.06)
    n = V.sosfilt(V.butter(2, [200, 1800], btype='band', fs=SR, output='sos'), rng.standard_normal(len(t))) * np.exp(-t / 0.02) * 0.8
    return x + n
# ---------- 素材 ----------
gong = L(f'{SX}/raw/gong_0.ogg'); drum = trim(L(f'{SX}/raw/drum_0.wav')); drum2 = trim(L(f'{SX}/raw/drum_2.wav'))
uns = trim(L(f'{SX}/raw/unsheathe_0.wav')); mail = trim(L(f'{SX}/raw/chain_2.wav')); rim = trim(L(f'{SX}/raw/wood_1.ogg'))
cloth = trim(L(f'{SX}/raw/cloth_1.ogg')); steps = [trim(L(f'{SX}/raw/step_{i}.ogg')) for i in (0, 2)]
hoof = trim(L(f'{SX}/out/hoofr_1.mp3')); neigh = trim(L(f'{SX}/out/neigha_0.mp3'))
C = {
 # 有人进房
 'join_1': ('铜锣一声', '录音（CC0）：一记铜锣，余音一秒多', cut(trim(gong), 1.9)),
 'join_2': ('战鼓两声', '我合成的：咚、咚两下战鼓，像通报来客', at(1.4, [(0, taiko(100), 0.85), (0.32, taiko(96, big=1.3), 1.0)])),
 'join_3': ('掀帘入帐', '录音（CC0）：帐帘一掀，两步脚步', at(1.1, [(0, cloth, 1.0), (0.42, steps[0], 0.7), (0.7, steps[1], 0.6)])),
 'join_4': ('编钟两声', '我合成的：两声编钟，一低一高', at(2.6, [(0, bell(587.3), 0.8), (0.32, bell(880), 0.6)])),
 'join_5': ('马到营前', '录音（CC0）：一串马蹄停住，一声马嘶', at(2.4, [(0, hoof, 0.8), (0.75, cut(neigh, 1.6), 0.7)])),
 # 准备
 'ready_1': ('拔刀出鞘', '录音（CC0）：刀出鞘，金属一响', cut(uns, 0.9)),
 'ready_2': ('甲叶一抖', '录音（CC0）：披甲起身，甲片哗啦一下', cut(mail, 0.9)),
 'ready_3': ('擂鼓一声', '我合成的：一记重鼓，再敲一下鼓边', at(1.0, [(0, taiko(92, big=1.2), 1.0), (0.24, rim, 0.5)])),
 'ready_4': ('古琴一拨', '我合成的：低音弦拨一下，带一点按音下滑', qin(196.0)),
 'ready_5': ('梆子两响', '我合成的：笃、笃两下，像更夫的梆子', at(0.6, [(0, block(820), 0.9), (0.17, block(900), 1.0)])),
}
meta = []
for k, (name, desc, x) in C.items():
    x = level(np.asarray(x, dtype=np.float64)); V.save(x, f'{OUT}/{k}.mp3', br='96k')
    meta.append(dict(id=k, name=name, desc=desc, dur=round(len(x) / SR, 2)))
json.dump(meta, open('meta.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(f"{m['id']} {m['name']} {m['dur']}s" for m in meta))
