"""配音后期小工具：读写、拖尾音、压缩前半、混响、拼接。采样率统一 32 kHz 单声道。"""
import subprocess, numpy as np, os, tempfile
from scipy.signal import fftconvolve, butter, sosfilt
SR = 32000

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def save(x, p, br='128k'):
    x = np.clip(x, -1, 1).astype(np.float32)
    args = ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-']
    if p.endswith('.mp3'): args += ['-c:a', 'libmp3lame', '-b:a', br]
    subprocess.run(args + [p], input=x.tobytes(), check=True)

def env(x, win=0.02):
    n = int(win * SR); k = np.ones(n) / n
    return np.sqrt(np.convolve(x * x, k, mode='same') + 1e-12)

def voiced(x, db=-32):
    """有声段的起止（秒）"""
    e = env(x); th = e.max() * 10 ** (db / 20); idx = np.where(e > th)[0]
    return idx[0] / SR, idx[-1] / SR

def stretch(seg, factor):
    """把一段拉长 factor 倍（<1 就是压短），音高不变"""
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        save(seg, a)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a, '-af', 'rubberband=tempo=%.4f:formant=preserved' % (1 / factor), b], check=True)
        return load(b)

def xjoin(parts, xf=0.012):
    """首尾相接，接缝处交叉淡化"""
    n = int(xf * SR); out = parts[0].copy()
    for p in parts[1:]:
        if len(out) < n or len(p) < n: out = np.concatenate([out, p]); continue
        r = np.linspace(0, 1, n)
        out[-n:] = out[-n:] * (1 - r) + p[:n] * r
        out = np.concatenate([out, p[n:]])
    return out

def tail(x, factor=2.0, back=0.34, keep=0.07, db=-20):
    """拖尾音：把最后一个字韵母的那一段拉长"""
    t0, t1 = voiced(x, db)
    a, b = int((t1 - back) * SR), int((t1 - keep) * SR)
    return xjoin([x[:a], stretch(x[a:b], factor), x[b:]])

def dip(x, lo=0.25, hi=0.75):
    """有声段中间能量最低的位置（两个字的交界），秒"""
    t0, t1 = voiced(x); e = env(x, 0.03)
    a, b = int((t0 + (t1 - t0) * lo) * SR), int((t0 + (t1 - t0) * hi) * SR)
    return (a + int(np.argmin(e[a:b]))) / SR

def reverb(x, wet=0.30, rt=1.5, pre=0.018, seed=7):
    """合成的大殿混响：指数衰减的噪声做脉冲响应"""
    rng = np.random.default_rng(seed); n = int(rt * 1.2 * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-6.91 * t / rt)
    ir = sosfilt(butter(2, [180, 5200], btype='band', fs=SR, output='sos'), ir)
    ir[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    ir = np.concatenate([np.zeros(int(pre * SR)), ir]); ir /= np.sqrt((ir ** 2).sum())
    w = fftconvolve(x, ir)
    y = np.concatenate([x, np.zeros(len(w) - len(x))]) + wet * w
    # 尾巴收到 -55 dB 为止
    e = env(y, 0.05); idx = np.where(e > e.max() * 10 ** (-55 / 20))[0]
    y = y[: idx[-1] + int(0.05 * SR)]
    f = int(0.08 * SR); y[-f:] *= np.linspace(1, 0, f)
    return y

def norm(x, peak=0.93):
    m = np.abs(x).max(); return x * (peak / m) if m > 0 else x

def rms_db(x):
    t0, t1 = voiced(x); s = x[int(t0 * SR): int(t1 * SR)]
    return 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9)

def gaps(x, db=-36, minlen=0.06):
    """有声段内部的静音段 [(起, 止)]（秒）"""
    e = env(x, 0.012); th = e.max() * 10 ** (db / 20); t0, t1 = voiced(x, db)
    q = e < th; out = []; i = int(t0 * SR); n = int(t1 * SR)
    while i < n:
        if q[i]:
            j = i
            while j < n and q[j]: j += 1
            if (j - i) / SR >= minlen: out.append((i / SR, j / SR))
            i = j
        else: i += 1
    return out

def setgaps(x, want, db=-36, minlen=0.06):
    """把第 k 个静音段改成 want[k] 秒（None = 不动）；只会剪短，不会加长到超过原长"""
    g = gaps(x, db, minlen); parts = []; pos = 0
    for k, (a, b) in enumerate(g):
        w = want.get(k) if isinstance(want, dict) else (want[k] if k < len(want) else None)
        if w is None or w >= b - a: continue
        cut = (b - a) - w; mid = (a + b) / 2
        ca, cb = int((mid - cut / 2) * SR), int((mid + cut / 2) * SR)
        parts.append(x[pos:ca]); pos = cb
    parts.append(x[pos:])
    return xjoin(parts, 0.008)

def trim(x, lead=0.06, tailpad=0.22, db=-40):
    t0, t1 = voiced(x, db); a = max(0, int((t0 - lead) * SR)); b = min(len(x), int((t1 + tailpad) * SR))
    y = x[a:b].copy(); f = int(0.01 * SR); y[:f] *= np.linspace(0, 1, f); f = int(0.05 * SR); y[-f:] *= np.linspace(1, 0, f)
    return y
