# 拒马三段拆成游戏里按帧放的单个声音（S3）。声音和试听台 b44～b48 Ham 通过的一样，只是按“撞上那一刻 = 0”切开。
# 用法：python3 mkjuma.py <sfx 目录> <0ad audio/attack 目录> <CC0 碎裂落地目录 bfh> <输出目录>
import sys, glob
SFX, AD, BF, OUT = sys.argv[1:5]
src = open(__file__.rsplit('/', 1)[0] + '/mktimeline.py').read().split('import sys as _s')[0]
sys.argv = ['mktimeline.py', SFX, AD, OUT]; exec(src)
def B(name, k): fs = sorted(glob.glob(f'{BF}/bfh1_{name}_*.ogg')); p = fs[k % len(fs)]; CACHE.setdefault(p, V.load(p)); return CACHE[p]
def pile(t0, span, n, base, seed):
    r = np.random.default_rng(seed); kinds = ['wood_breaking', 'breaking', 'wood_falling', 'rock_breaking', 'rock_falling', 'falling', 'wood_hit']; c = []
    for j in range(n):
        k = kinds[j % len(kinds)]; t = t0 + (r.uniform(0, 0.12) if j < 7 else r.uniform(0.05, span))
        c.append((t, B(k, int(r.integers(9))), base - (0 if j < 7 else r.uniform(3, 9)), r.uniform(0.8, 1.2)))
    return c
def cut(x, sec): n = int(sec * SR); y = x[:n]; return y * np.minimum(1, (len(y) - np.arange(len(y))) / (0.4 * SR))
DEB = lambda t, db: (t, cut(A('destruction/explode_debris_20'), 1.6), db)
COL = lambda t, db: (t, cut(A('destruction/building_collapse_large_01'), 1.4), db)
def one(cues, name, pad=0.0):   # 一个声音：开头就是“那一刻”
    x = render([(c[0] + pad, *c[1:]) for c in cues], 2.5); V.save(x, f'{OUT}/{name}.mp3', '48k'); print(name, f'{len(x)/SR:.2f}s')
# 放箭（三种随机轮着用，b47）：只留“嘣”0.12 秒；乙加尖“咻”；丙加闷“咔”。放箭那一下在 0.03 秒
for n in range(5):
    y, off = snap(1 + n); one([(0.0, y, -2)], f'xbow_{n}')
for k in range(3): one([(0.0, zip_(k), -6)], f'arrowzip_{k}')
# 中箭：插盾 / 插木桩 / 入肉（+ 痛叫另放）
one([(0, A('impact/shield_wood_05'), -3), (0, A('impact/arrow_metal_04'), -12)], 'arrowhit_0')
one([(0, A('impact/shield_wood_13'), -3), (0, A('impact/arrow_metal_02'), -12)], 'arrowhit_1')
one([(0, A('impact/arrow_wood_12'), -3)], 'arrowwood_0'); one([(0, A('impact/arrow_wood_08'), -3)], 'arrowwood_1')
one([(0, A('impact/fleshimp_11'), -2)], 'arrowflesh_0'); one([(0, A('impact/fleshimp_10'), -2)], 'arrowflesh_1')
# 虎扑起跳咆哮、落地咆哮（b44 起，短促）
one([(0, LION(2), -1)], 'tigerpounce_0'); one([(0, LION(3), -1)], 'tigerpounce_1'); one([(0, LION(1), -2)], 'tigerland_0')
# 象顶路障、不碎（b44 象只掉血）：撞击 + 盾 + 甲片 + 路障吱呀晃两下（0 = 顶上那一刻）
for v in range(2):
    one([(0, S('punch', v), 0, 0.8), (0, S('soft', v), -2, 0.7), (0, S('wood', v), -2, 0.7), (0, S('plank', v), -4), (0.01, S('block', v), -4),
         (0.02, S('chain', v), -10), (0.3, S('creak', v), -8), (0.6, S('creak', v + 1), -12)], f'jumashake_{v}')
# 路障碎（虎扑砸碎，b47 / b48 两版随机）：0 = 砸上那一刻
base_t = [(0, S('boom', 0), -12), (0, S('punch', 0), -4), (0.1, S('stones', 0), -10), (0.2, S('plank', 0), -8), (0.35, S('wood', 0), -8)]
mw = lambda t0, n, b: [(t0 + 0.05 * k + 0.02 * (k % 2), S('woodbreak', k), b - 1.2 * k, (0.8, 1.15, 0.9, 1.25, 0.75)[k % 5]) for k in range(n)]
one(base_t + mw(0, 7, 3), 'jumabrk_0')
one(base_t + mw(0, 7, 3) + pile(0, 1.0, 24, 6, 1) + [DEB(0.02, 2)], 'jumabrk_1')
# 路障碎（象撞碎，更响更长，b47 / b48 两版随机）
base_e = [*mw(0, 16, 5), (0, S('boom', 1), -8), (0, S('rumble', 0), -10), (0.2, S('rockfall', 0), -10), (0.3, S('plank', 1), -2), (0.4, S('plank', 2), -4, 1.2),
          (0.45, S('wood', 1), -3), (0.55, S('wood', 2), -5, 1.3), (0.6, S('plank', 0), -5, 0.8), (0.7, S('wood', 3), -6), (0.82, S('soft', 0), -4, 0.8), (0.82, S('stones', 1), -6), (0.95, S('plank', 1), -8)]
one(base_e, 'jumabrkbig_0')
one(base_e + pile(0, 1.4, 34, 8, 2) + [DEB(0.02, 4), COL(0.05, 0)], 'jumabrkbig_1')
