# 合成几段配乐素材：古琴般的拨弦（Karplus-Strong）、低沉的持续音、风声
import numpy as np, wave, os
SR = 44100
OUT = os.path.dirname(os.path.abspath(__file__)) + '/audio'
def save(name, x):
    x = np.clip(x, -1, 1); d = (x * 32000).astype(np.int16)
    if d.ndim == 1: d = np.stack([d, d], 1)
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())
rng = np.random.default_rng(3)
def pluck(f, dur=4.0, bright=0.5, slide=0.0):
    n = int(SR * dur); N = int(SR / f); buf = rng.uniform(-1, 1, N) * 0.5
    # 低通一下让音色闷一点（古琴不亮）
    for _ in range(int(3 * (1 - bright)) + 1): buf = 0.5 * (buf + np.roll(buf, 1))
    out = np.zeros(n); idx = 0; decay = 0.996
    for i in range(n):
        j = idx % len(buf); nj = (idx + 1) % len(buf)
        v = decay * 0.5 * (buf[j] + buf[nj]); out[i] = buf[j]; buf[j] = v; idx += 1
    env = np.exp(-np.linspace(0, dur, n) * 0.9)
    body = np.convolve(out, np.exp(-np.arange(400) / 60.0), 'same') * 0.02
    return (out * 0.7 + body) * env
def drone(f, dur, amp=0.12):
    t = np.arange(int(SR * dur)) / SR
    x = sum(np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6)) / k ** 1.6 for k in range(1, 6))
    lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t)
    fade = np.minimum(1, t / 4) * np.minimum(1, (dur - t) / 4)
    return x * amp * lfo * fade
def wind(dur, amp=0.18):
    n = int(SR * dur); w = rng.normal(0, 1, n)
    for _ in range(6): w = 0.5 * (w + np.roll(w, 1))
    t = np.arange(n) / SR; env = 0.55 + 0.45 * np.sin(2 * np.pi * 0.09 * t) * np.sin(2 * np.pi * 0.031 * t + 1)
    fade = np.minimum(1, t / 3) * np.minimum(1, (dur - t) / 3)
    return w * amp * env * fade / np.abs(w).max()
# 五声（D 宫）：D E F# A B
PENT = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0]
os.makedirs(OUT, exist_ok=True)
for i, f in enumerate(PENT): save(f'qin_{i}', pluck(f, 4.5, 0.35))
save('qin_low', pluck(73.42, 6.0, 0.2))
save('drone_d', drone(73.42, 60))
save('drone_a', drone(55.0, 60, 0.1))
save('wind', wind(60))
print('ok')
