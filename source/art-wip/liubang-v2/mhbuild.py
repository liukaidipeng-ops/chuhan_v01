# MakeHuman 基础网格（CC0）→ 按角色配方变形 → 精简骨架 + 权重 → 导出给 three.js 用的 JSON
import json, os, sys, re, numpy as np, base64, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
RAWB = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/'

def load_obj(p):
    V, VT, F, FT, G = [], [], [], [], []
    g = None
    for line in open(p):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '): VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '): g = line.split()[1]
        elif line.startswith('f '):
            a = [x.split('/') for x in line.split()[1:]]
            F.append([int(x[0]) - 1 for x in a]); FT.append([int(x[1]) - 1 for x in a]); G.append(g)
    return np.array(V, np.float64), np.array(VT, np.float64), F, FT, G

V0, VT, F, FT, G = load_obj(HERE + '/base.obj')
NV = len(V0)

def target(name):
    p = HERE + '/t/' + name + '.target'
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        try: urllib.request.urlretrieve(RAWB + 'targets/' + name + '.target', p)
        except Exception as e: print('missing target', name, e); open(p, 'w').write('')
    d = np.zeros((NV, 3))
    for line in open(p):
        if not line.strip() or line[0] == '#' or line.startswith('404:'): continue
        a = line.split(); d[int(a[0])] = [float(a[1]), float(a[2]), float(a[3])]
    return d

def morph(recipe):
    v = V0.copy()
    for k, w in recipe.items():
        if w: v += target(k) * w
    return v

SK = json.load(open(HERE + '/rigs/default.mhskel'))
WT = json.load(open(HERE + '/rigs/default_weights.mhw'))['weights']

# 精简骨架：保留的骨头；其余骨头的权重并到 KEEP 里最近的祖先（手指按段合并、脸上的并到头）
def parent(b): return SK['bones'][b]['parent']
KEEP = set('''root spine05 spine04 spine03 spine02 spine01 neck01 neck02 neck03 head jaw eye.L eye.R
clavicle.L shoulder01.L upperarm01.L upperarm02.L lowerarm01.L lowerarm02.L wrist.L
clavicle.R shoulder01.R upperarm01.R upperarm02.R lowerarm01.R lowerarm02.R wrist.R
pelvis.L upperleg01.L upperleg02.L lowerleg01.L lowerleg02.L foot.L toe1-1.L
pelvis.R upperleg01.R upperleg02.R lowerleg01.R lowerleg02.R foot.R toe1-1.R
finger1-1.L finger1-2.L finger1-1.R finger1-2.R finger3-1.L finger3-2.L finger3-1.R finger3-2.R breast.L breast.R'''.split())
KEEP0 = KEEP; KEEP = []
def _topo(b):
    if b in KEEP: return
    pb = SK['bones'][b]['parent']
    while pb and pb not in KEEP0: pb = SK['bones'][pb]['parent']
    if pb: _topo(pb)
    KEEP.append(b)
for _b in SK['bones']:
    if _b in KEEP0: _topo(_b)
def mapbone(b):
    s = b.replace('.L', '').replace('.R', ''); side = '.L' if b.endswith('.L') else '.R' if b.endswith('.R') else ''
    m = re.match(r'finger(\d)-(\d)', s)
    if m:
        f, seg = int(m.group(1)), int(m.group(2))
        if f == 1: return 'finger1-1' + side if seg == 1 else 'finger1-2' + side
        return 'finger3-1' + side if seg == 1 else 'finger3-2' + side
    if s.startswith('metacarpal'): return 'wrist' + side
    if s.startswith('toe'): return 'toe1-1' + side
    while b not in KEEP: b = parent(b)
    return b

def joint_pos(v, name):
    if name.endswith('____plane'): raise ValueError
    idx = SK['joints'][name]
    return v[idx].mean(0)

def bone_frames(v):
    # 每根骨头的头、尾和局部坐标系（照 MakeHuman：y 轴沿骨，z 轴由 rotation_plane 三点定的平面法线）
    out = {}
    for b in KEEP:
        d = SK['bones'][b]
        h = joint_pos(v, d['head']); t = joint_pos(v, d['tail'])
        y = t - h; y /= (np.linalg.norm(y) + 1e-12)
        pl = d.get('rotation_plane')
        z = None
        if pl and pl in SK['planes']:
            a, bb, c = [joint_pos(v, j) for j in SK['planes'][pl]]
            n = np.cross(bb - a, c - bb); n /= (np.linalg.norm(n) + 1e-12)
            x = n; z = np.cross(x, y); z /= (np.linalg.norm(z) + 1e-12); x = np.cross(y, z)
        if z is None:
            x = np.cross(y, [0, 0, 1.0]); x /= (np.linalg.norm(x) + 1e-12); z = np.cross(x, y)
        out[b] = dict(head=h.tolist(), tail=t.tolist(), x=x.tolist(), y=y.tolist(), z=z.tolist(), parent=(mapbone(d['parent']) if d['parent'] else None) if b != 'root' else None)
    return out

def skin(nv_keep_map):
    W = {}
    for b, lst in WT.items():
        nb = mapbone(b)
        for vi, w in lst:
            if vi in nv_keep_map:
                dct = W.setdefault(nv_keep_map[vi], {}); dct[nb] = dct.get(nb, 0) + w
    return W

def extract(groups):
    keepF = [i for i, g in enumerate(G) if g in groups]
    # 以 (顶点, uv) 对拆点，保证 UV 接缝正确
    key = {}; pos_i = []; uv_i = []; tris = []
    for fi in keepF:
        ids = []
        for a, t in zip(F[fi], FT[fi]):
            k = (a, t)
            if k not in key: key[k] = len(pos_i); pos_i.append(a); uv_i.append(t)
            ids.append(key[k])
        if len(ids) == 4: tris += [ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]]
        else: tris += ids[:3]
    return np.array(pos_i), np.array(uv_i), np.array(tris)

def b64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()

def build(name, recipe, morphs=None, groups=('body',), scale=0.1, extra_groups=None):
    v = morph(recipe)
    frames = bone_frames(v)
    pos_i, uv_i, tris = extract(set(groups))
    vm = {}
    for new, old in enumerate(pos_i): vm.setdefault(old, []).append(new)
    W = {}
    for b, lst in WT.items():
        nb = mapbone(b)
        for vi, w in lst:
            for nvi in vm.get(vi, ()):
                d = W.setdefault(nvi, {}); d[nb] = d.get(nb, 0) + w
    bones = KEEP; bi = {b: i for i, b in enumerate(bones)}
    n = len(pos_i); SI = np.zeros((n, 4), np.uint8); SW = np.zeros((n, 4), np.float32)
    for i in range(n):
        d = sorted((W.get(i) or {'root': 1}).items(), key=lambda x: -x[1])[:4]
        s = sum(w for _, w in d)
        for j, (b, w) in enumerate(d): SI[i, j] = bi[b]; SW[i, j] = w / s
    P = (v[pos_i] * scale).astype(np.float32)
    # 法线按原始顶点（焊接后）算，UV 接缝处不出缝
    keepF = [i for i, g in enumerate(G) if g in set(groups)]
    Nw = np.zeros_like(v)
    for fi in keepF:
        f = F[fi]; pts = v[f]
        if len(f) == 4: n_ = np.cross(pts[2] - pts[0], pts[3] - pts[1])
        else: n_ = np.cross(pts[1] - pts[0], pts[2] - pts[0])
        for a in f: Nw[a] += n_
    Nw /= (np.linalg.norm(Nw, axis=1, keepdims=True) + 1e-12)
    NN = Nw[pos_i].astype(np.float32)
    LM = {}
    for k in SK['joints']:
        if k.endswith('____head') or k.endswith('____tail'):
            LM[k.replace('____', ':')] = (joint_pos(v, k) * scale).round(5).tolist()
    for gname in ('helper-l-eye', 'helper-r-eye'):
        idx = sorted(set(i for f, gg in zip(F, G) if gg == gname for i in f)); LM[gname] = (v[idx].mean(0) * scale).round(5).tolist(); LM[gname + ':r'] = float(((v[idx].max(0) - v[idx].min(0)) * scale).mean() / 2)
    UV = VT[uv_i].astype(np.float32)
    out = dict(name=name, n=n, pos=b64(P), nrm=b64(NN), lm=LM, uv=b64(UV), idx=b64(tris.astype(np.uint16 if n < 65536 else np.uint32)), idx32=n >= 65536,
               si=b64(SI), sw=b64(SW), bones=[dict(name=b, **{k: (np.array(val) * (scale if k in ('head', 'tail') else 1)).tolist() if k in ('head', 'tail') else val for k, val in frames[b].items()}) for b in bones])
    # 表情等形变：给每个 morph 只存有位移的顶点（稀疏）
    if morphs:
        M = {}
        for mk, parts in morphs.items():
            d = np.zeros_like(V0)
            for t, w in parts.items(): d += target(t) * w
            dd = (d[pos_i] * scale).astype(np.float32)
            nz = np.where(np.abs(dd).sum(1) > 1e-6)[0].astype(np.uint16 if n < 65536 else np.uint32)
            M[mk] = dict(i=b64(nz), d=b64(dd[nz]))
        out['morphs'] = M
    return out, v

if __name__ == '__main__':
    pass
