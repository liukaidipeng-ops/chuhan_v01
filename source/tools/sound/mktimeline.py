# 按角色部 M27 的时间点（“实际秒”）把兵卒对打、拒马三段的声音排成整段，挂试听台（b43）。
# 素材：游戏音效库 sfx/out（已入库、已署名）+ 0 A.D. attack/impact 的中箭、入肉（CC BY-SA 3.0，已署名）。
# 用法：python3 mktimeline.py <sfx 目录> <0ad audio/attack 目录> <输出目录>
import sys, json, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0]); import vproc as V
SFX, AD, O = sys.argv[1:4]; SR = V.SR; rng = np.random.default_rng(11)
MAN = json.load(open(SFX + '/manifest.json', encoding='utf8')); CACHE = {}
def S(gid, i=None):
    lst = MAN[gid]; i = int(rng.integers(len(lst))) if i is None else i % len(lst); p = SFX + '/out/' + lst[i]['f']
    if p not in CACHE: CACHE[p] = V.load(p)
    return CACHE[p]
def A(name):
    p = f'{AD}/{name}.ogg'
    if p not in CACHE: CACHE[p] = V.load(p)
    return CACHE[p]
def rate(x, r): n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)
def render(cues, total):
    buf = np.zeros(int((total + 1.5) * SR))
    for t, x, db, *r in cues:
        if r: x = rate(x, r[0])
        s = int(t * SR); n = min(len(x), len(buf) - s); buf[s:s + n] += x[:n] * 10 ** (db / 20)
    e = np.abs(buf) > 10 ** (-55 / 20) * np.abs(buf).max(); end = (np.nonzero(e)[0][-1] if e.any() else len(buf)) + int(0.3 * SR)
    return V.norm(buf[:end], 0.93)   # 开头不剪：时间要和动画的“实际秒”对上
blk = lambda t, db=-2: (t, S('block'), db)
duel_hit = [   # 扣血版
  *[(t, S('step'), -10) for t in (0.72, 0.84, 0.95, 1.06)],
  (1.00, S('sgrunt'), -6), blk(1.18),
  (1.66, S('swing'), -6), (1.82, S('plank'), -4), (1.82, S('thunk'), -10),
  (2.00, A('impact/fleshstab_02'), -2), (2.00, S('chop'), -8), (2.02, S('pain'), -6),
  *[(t, S('step'), -11) for t in (2.46, 2.66, 2.89)],
  *[(t, S('wood'), -6) for t in (3.13, 3.43)],
  (3.86, S('sgrunt'), -5), (4.46, S('chain'), -12), (4.46, S('cloth'), -12), (5.06, S('sgrunt'), -4)]
duel_kill = [   # 击杀版
  *[(t, S('step'), -10) for t in (0.72, 0.84, 0.95, 1.06)],
  (1.00, S('sgrunt'), -6), blk(1.17),
  (1.66, S('swing'), -6), (1.72, S('cloth'), -9), (1.72, S('step'), -10),
  (1.84, S('swing'), -3, 0.8), (1.98, S('sgrunt'), -4),
  (2.04, S('chop'), -1), (2.04, S('slash'), -4), (2.04, A('impact/fleshimp_10'), -2), (2.06, S('gibs'), -10), (2.06, S('death'), -6),
  (2.10, S('splash'), -16),
  (3.00, S('soft'), -8), (3.45, S('soft'), -4, 0.8), (3.45, S('chain'), -14),
  (3.41, S('step'), -10), (3.56, S('sgrunt'), -4), (3.76, S('step'), -10), (3.86, S('step'), -10), (3.96, S('sgrunt'), -4), (4.16, S('step'), -10),
  (4.3, S('victory'), -8)]
# 第四十一批（b44）按 Ham 备注改：“弩的声音不对”→ 真弩：弩炮发射声开头（调高变小）的“嘣”+ 箭飞“嗖”；
# “老虎的声音太慢了，不像攻击”→ 0 A.D. 狮子短促扑击咆哮；“需要有被打击的声音”→ 象顶上加撞击 + 兵挨撞；“木头声音听不到”→ 木头断裂提响拉长
def xbow(t, k=0):   # 一发弩：嘣（弦）+ 嗖（箭）
    tw = rate(A('siege/ballist_attack_0' + str(1 + k % 2))[:int(0.35 * SR)], 1.6)
    tw = tw * np.minimum(1, (len(tw) - np.arange(len(tw))) / (0.08 * SR))
    return [(t, tw, -2), (t + 0.03, A('weapon/arrowfly_0' + str(1 + k % 3)), -6)]
def xbow_volley(n=1):   # 弩手现身、上弦、三连射、中箭（插盾 / 插木桩 / 入肉）
  c = [(0.0, S('twirl'), -14), (0.45, S('creak'), -12), (0.55, S('chain'), -16)]
  for j, t in enumerate((0.70, 0.88, 1.06)):
    for k in range(n): c += xbow(t + k * 0.03, j + k)
  c += [(0.90, A('impact/shield_wood_05'), -3), (0.90, A('impact/arrow_metal_04'), -12),
        (1.08, A('impact/arrow_wood_12'), -3),
        (1.26, A('impact/fleshimp_11'), -2), (1.28, S('pain'), -5), (1.6, S('twirl'), -16)]
  return c
LION = lambda n: A(f'../actor/fauna/attack/lion{n}')
juma_xiang_hit = xbow_volley()
juma_xiang_kill = xbow_volley() + [(1.36, LION(2), -1), (1.42, S('paws'), -8),
  (1.70, S('woodbreak'), 2), (1.72, S('woodbreak'), -2, 0.85), (1.74, S('woodbreak'), -6, 1.15), (1.70, S('boom'), -12), (1.70, S('punch'), -4), (1.75, S('death'), -5), (1.8, S('stones'), -10),
  (2.2, LION(1), -2)]
juma_ele_hit = [(0.0, S('elecry'), -6), *[(t, S('stomp'), -6, 0.8) for t in (0.1, 0.35, 0.6)], (0.0, S('elerun'), -10),
  (0.80, S('punch'), 0, 0.8), (0.80, S('soft'), -2, 0.7), (0.80, S('wood'), -2, 0.7), (0.80, S('plank'), -4), (0.81, S('block'), -4),
  (0.82, S('chain'), -10), (0.84, S('pain'), -3), (1.1, S('creak'), -8), (1.4, S('creak'), -12),
  (1.0, S('elecry'), -4, 0.92), (1.3, S('stomp'), -8, 0.8)]
juma_ele_kill = [(0.0, S('elecry'), -8), *[(t, S('stomp'), -6, 0.8) for t in (0.1, 0.35, 0.6)], (0.0, S('elerun'), -10),
  (0.80, S('woodbreak'), 4), (0.82, S('woodbreak'), 1, 0.8), (0.86, S('woodbreak'), -1, 1.1), (0.95, S('woodbreak'), -3, 0.9), (1.1, S('woodbreak'), -6, 1.2),
  (0.80, S('punch'), -2, 0.8), (0.80, S('boom'), -10), (0.84, S('death'), -4), (0.9, S('sgrunt'), -6),
  (1.2, S('stones'), -8), (1.4, S('plank'), -8), (1.6, S('soft'), -4, 0.8), (1.62, S('wood'), -8),
  *[(t, S('stomp'), -6, 0.8) for t in (1.2, 1.5)], (1.8, S('elecry'), -6, 0.92)]
for name, cues, T in (('juma_xiang_hit', juma_xiang_hit, 2.4),
                      ('juma_xiang_kill', juma_xiang_kill, 3.0), ('juma_ele_hit', juma_ele_hit, 2.5), ('juma_ele_kill', juma_ele_kill, 2.6)):
    V.save(render(cues, T), O + f'/{name}.mp3', '64k'); print(name, 'ok')
