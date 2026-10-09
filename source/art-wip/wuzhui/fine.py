# 精细版设计稿的画笔：三色卡通明暗（亮边 / 本色 / 暗面）、甲片和回纹的图案填充、关节、手
import math, random
INK = '#141311'
CX = 200

def rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def hexc(c): return '#%02x%02x%02x' % tuple(max(0, min(255, int(v))) for v in c)
def mul(h, k): return hexc([v * k for v in rgb(h)])
def mix(a, b, t): A, B = rgb(a), rgb(b); return hexc([A[i] + (B[i] - A[i]) * t for i in range(3)])

class Fig:
    def __init__(self, w=400, h=760, vb=None):
        self.w, self.h, self.vb = w, h, vb or (0, 0, w, h); self.defs = {}; self.L = []
    # 三色明暗：左缘亮边、中间本色、右侧暗面（光从左上来）
    def shade(self, c, cut=0.6, vertical=False, rim=True):
        gid = f'sh{c.lstrip("#")}{int(cut * 100)}{"v" if vertical else ""}{"r" if rim else ""}'
        if gid not in self.defs:
            x2, y2 = ('0', '1') if vertical else ('1', '0')
            stops = (f'<stop offset="0" stop-color="{mul(c, 1.22)}"/><stop offset="0.12" stop-color="{mul(c, 1.22)}"/><stop offset="0.12" stop-color="{c}"/>' if rim else f'<stop offset="0" stop-color="{c}"/>') + \
                    f'<stop offset="{cut}" stop-color="{c}"/><stop offset="{cut}" stop-color="{mul(c, 0.7)}"/><stop offset="1" stop-color="{mul(c, 0.6)}"/>'
            self.defs[gid] = f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{stops}</linearGradient>'
        return f'url(#{gid})'
    def vol(self):   # 叠在图案上的明暗
        if 'vol' not in self.defs:
            self.defs['vol'] = '<linearGradient id="vol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".12" stop-color="#fff" stop-opacity=".18"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity=".44"/></linearGradient>'
        return 'url(#vol)'
    def metal(self, c, gid=None):   # 金属：竖向渐变 + 一道高光
        gid = gid or 'mt' + c.lstrip('#')
        if gid not in self.defs:
            self.defs[gid] = f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{mul(c, 1.35)}"/><stop offset=".35" stop-color="{c}"/><stop offset=".5" stop-color="{mul(c, 1.5)}"/><stop offset=".62" stop-color="{c}"/><stop offset="1" stop-color="{mul(c, 0.6)}"/></linearGradient>'
        return f'url(#{gid})'
    def lamellar(self, pid, plate, lace, rivet, w=8, h=11):
        # 札甲：一片片圆头甲片，上下两排错开半片，甲片之间是彩绳
        if pid not in self.defs:
            hi, lo = mul(plate, 1.55), mul(plate, 0.55)
            one = lambda x, y: (f'<rect x="{x + 0.6}" y="{y + 0.5}" width="{w - 1.2}" height="{h - 1.6}" rx="{w * 0.38}" fill="{plate}" stroke="{lo}" stroke-width=".8"/>'
                                f'<path d="M{x + 1.6},{y + 2} L{x + 1.6},{y + h - 3}" stroke="{hi}" stroke-width="1.1" opacity=".75"/>'
                                f'<circle cx="{x + w / 2}" cy="{y + 2.4}" r=".95" fill="{rivet}"/><circle cx="{x + w / 2}" cy="{y + h - 3.4}" r=".95" fill="{rivet}"/>'
                                f'<path d="M{x},{y + h - 0.6} L{x + w},{y + h - 0.6}" stroke="{lace}" stroke-width="1.5"/>')
            body = one(0, 0) + one(w, 0) + one(-w / 2, h) + one(w / 2, h) + one(w * 1.5, h)
            self.defs[pid] = f'<pattern id="{pid}" width="{w * 2}" height="{h * 2}" patternUnits="userSpaceOnUse"><rect width="{w * 2}" height="{h * 2}" fill="{lo}"/>{body}</pattern>'
        return f'url(#{pid})'
    def keypat(self, pid, fg, bg, s=10):   # 回纹镶边
        if pid not in self.defs:
            self.defs[pid] = (f'<pattern id="{pid}" width="{s}" height="{s}" patternUnits="userSpaceOnUse"><rect width="{s}" height="{s}" fill="{bg}"/>'
                              f'<path d="M1,{s - 1} L1,1 L{s - 1},1 L{s - 1},{s - 3} L3,{s - 3} L3,3 L{s - 3},3 L{s - 3},{s - 5}" fill="none" stroke="{fg}" stroke-width="1.1"/></pattern>')
        return f'url(#{pid})'
    def weave(self, pid, c, s=6):   # 织物细纹
        if pid not in self.defs:
            self.defs[pid] = f'<pattern id="{pid}" width="{s}" height="{s}" patternUnits="userSpaceOnUse"><rect width="{s}" height="{s}" fill="{c}"/><path d="M0,{s / 2} L{s},{s / 2}" stroke="{mul(c, 0.86)}" stroke-width=".6"/><path d="M{s / 2},0 L{s / 2},{s}" stroke="{mul(c, 1.08)}" stroke-width=".5"/></pattern>'
        return f'url(#{pid})'
    # —— 画 ——
    def p(self, d, fill, sw=2.4, cut=0.6, stroke=INK, extra='', flat=False, vertical=False):
        f = fill if (flat or not fill.startswith('#')) else self.shade(fill, cut, vertical)
        self.L.append(f'<path d="{d}" fill="{f}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>')
    def pat(self, d, patfill, sw=2.4, shade=True):   # 图案填充 + 明暗 + 墨线
        self.L.append(f'<path d="{d}" fill="{patfill}"/>')
        if shade: self.L.append(f'<path d="{d}" fill="{self.vol()}"/>')
        self.L.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>')
    def ln(self, d, c=INK, sw=1.6, extra=''):
        self.L.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>')
    def raw(self, s): self.L.append(s)
    def svg(self, bg=None):
        x, y, w, h = self.vb
        b = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{self.w}" height="{self.h}"><defs>{"".join(self.defs.values())}</defs>{b}{"".join(self.L)}</svg>'

def smooth(pts, closed=True, corners=()):
    n = len(pts); d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(n if closed else n - 1):
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]; p1 = pts[i]; p2 = pts[(i + 1) % n]; p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        if i in corners: p0 = p1
        if (i + 1) % n in corners: p3 = p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d + (' Z' if closed else '')
def mir(half, sharp=(), cx=CX):
    pts, tag = [], []
    for i, (x, y) in enumerate(half): pts.append((cx + x, y)); tag.append(i)
    for i in range(len(half) - 1, -1, -1):
        x, y = half[i]
        if x == 0: continue
        pts.append((cx - x, y)); tag.append(i)
    return smooth(pts, True, {k for k, t in enumerate(tag) if t in sharp})
def side(pts, s, cx=CX): return [(cx + s * x, y) for x, y in pts]
def sm(pts, corners=(), closed=True): return smooth(pts, closed, set(corners))
def poly(pts): return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'
def ell(cx, cy, rx, ry): return f'M{cx - rx:.1f},{cy:.1f} a{rx:.1f},{ry:.1f} 0 1,0 {2 * rx:.1f},0 a{rx:.1f},{ry:.1f} 0 1,0 {-2 * rx:.1f},0 Z'
def capsule(a, b, ra, rb):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
    return (f'M{ax + nx * ra:.1f},{ay + ny * ra:.1f} L{bx + nx * rb:.1f},{by + ny * rb:.1f} A{rb:.1f},{rb:.1f} 0 0,1 {bx - nx * rb:.1f},{by - ny * rb:.1f} '
            f'L{ax - nx * ra:.1f},{ay - ny * ra:.1f} A{ra:.1f},{ra:.1f} 0 0,1 {ax + nx * ra:.1f},{ay + ny * ra:.1f} Z')
def limb(a, b, ra, rb):   # 不带圆头的锥形段（关节处另外画圆）
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
    return poly([(ax + nx * ra, ay + ny * ra), (bx + nx * rb, by + ny * rb), (bx - nx * rb, by - ny * rb), (ax - nx * ra, ay - ny * ra)])
def ik(sh, tg, l1, l2, out):
    # out：肘往哪边弯（+1 往画面右，-1 往画面左）
    dx, dy = tg[0] - sh[0], tg[1] - sh[1]; d = min(math.hypot(dx, dy), l1 + l2 - 0.5); ang = math.atan2(dy, dx)
    a = math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
    best = None
    for sg in (1, -1):
        k = ang + a * sg; e = (sh[0] + math.cos(k) * l1, sh[1] + math.sin(k) * l1)
        if best is None or (e[0] - sh[0]) * out > (best[0] - sh[0]) * out: best = e
    w = (sh[0] + math.cos(ang) * d, sh[1] + math.sin(ang) * d)
    return best, w
def rnd(seed): r = random.Random(seed); return r.random

# 拳头：握着竖杆（或空握），朝向 dir（+1 拳背朝画面右）
def fist(F, x, y, skin, s=1, grip=True, sz=1.0):
    w, h = 22 * sz, 25 * sz
    F.p(sm([(x - w / 2, y - h / 2 + 3), (x + w / 2 - 2, y - h / 2), (x + w / 2 + 1, y + h / 2 - 4), (x - w / 2 + 2, y + h / 2)], (0, 1, 2, 3)), skin, sw=2)
    for k in range(1, 4): F.ln(f'M{x - w / 2 + 2},{y - h / 2 + k * h / 4 + 1} L{x + w / 2 - 3},{y - h / 2 + k * h / 4}', mul(skin, 0.55), 1.3)
    F.p(sm([(x - s * w / 2 - s * 3, y - h / 2 + 4), (x - s * w / 2 + s * 8, y - 2), (x - s * w / 2 + s * 4, y + 4), (x - s * w / 2 - s * 5, y + 2)]), skin, sw=1.8)
