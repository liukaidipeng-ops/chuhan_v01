# 兵卒吆喝、欢呼（试听台 b40）：无台词，只要吆喝声。
# 素材：MegaGlest（CC BY-SA 3.0，需署名）techs/megapack/commondata/sounds 的 guard / swordman / horseman / stickfighter _attack；
#       Warfork（CC0）players/male 的 jump / dash。
# 用法：python3 mkshout.py <MegaGlest sounds 目录> <cc0 仓库目录> <输出目录>
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0]); import vproc as V
MG, C, O = sys.argv[1:4]; SR = V.SR; rng = np.random.default_rng(7)
L = lambda p: V.trim(V.load(p), lead=0.01, tailpad=0.08, db=-45)
def rate(x, r):   # 变调（同时变速）
    n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)
def level(x, db=-16): return x * 10 ** ((db - V.rms_db(x)) / 20)
def chain(parts, gap=0.55):
    out = np.concatenate([np.concatenate([p, np.zeros(int(max(0.05, gap - len(p) / SR) * SR))]) for p in parts]); return V.norm(out, 0.93)
G = {k: [L(f'{MG}/{k}_attack{i}.wav') for i in ids] for k, ids in {'guard': (2, 5, 9, 13, 14), 'swordman': (1, 2, 3, 8), 'horseman': (2, 11, 12), 'stickfighter': (2, 7, 8)}.items()}
WF = [L(f'{C}/warfork-cc0/sounds/players/male/{n}.ogg') for n in ('jump_1', 'jump_2', 'dash_1', 'dash_2')]
# 单人吆喝：每条连放几声，听随机感；降一点调更像披甲的壮汉
V.save(chain([level(rate(x, 0.92)) for x in G['guard']], 0.9), O + '/yell_guard.mp3', '64k')
V.save(chain([level(rate(x, 0.92)) for x in G['swordman']], 0.95), O + '/yell_sword.mp3', '64k')
V.save(chain([level(rate(x, 0.92)) for x in G['horseman'] + G['stickfighter']], 0.8), O + '/yell_mix.mp3', '64k')
V.save(chain([level(x) for x in WF], 0.7), O + '/yell_wf.mp3', '64k')
# 欢呼：七八个人的吆喝错开叠在一起（各自变调、远近不同），加一点空间
pool = [x for k in G for x in G[k]]
def crowd(n, spread, seed):
    r = np.random.default_rng(seed); buf = np.zeros(int((spread + 1.2) * SR))
    for j in range(n):
        x = level(rate(pool[r.integers(len(pool))], r.uniform(0.82, 1.05)), r.uniform(-22, -16))
        i = int(r.uniform(0, spread) * SR); buf[i:i + len(x)] += x[:len(buf) - i]
    return V.norm(V.reverb(V.trim(buf, lead=0.01, tailpad=0.3, db=-45), wet=0.22, rt=1.2), 0.93)
for s, (n, sp) in enumerate(((6, 0.35), (9, 0.6), (14, 0.9))):
    V.save(crowd(n, sp, 10 + s), O + f'/cheer_{s}.mp3', '64k')
