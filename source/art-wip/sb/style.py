# 三种画风的后期：甲 电影正剧 / 乙 水墨长卷 / 丙 皮影
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageChops, ImageEnhance, ImageOps
W, H = 1280, 720
import os
# 字幕、片名用界面的粗宋（美术总监：fonts/songhei-subset.woff2，只含源码里出现过的字）；字库里没有的字逐字退到系统字体
_H = os.path.dirname(os.path.abspath(__file__)); _SH = _H + '/.cache/songhei.ttf'
def _songhei():
    if not os.path.exists(_SH):
        try:
            from fontTools.ttLib import TTFont
            os.makedirs(_H + '/.cache', exist_ok=True); f = TTFont(_H + '/../../fonts/songhei-subset.woff2'); f.flavor = None; f.save(_SH)
        except Exception: return None
    return _SH
_FB = [p for p in ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc') if os.path.exists(p)]
class _Font:   # 主字体 + 逐字回退
    def __init__(self, sz):
        self.size = sz; pri = _songhei(); self.pri = ImageFont.truetype(pri, sz) if pri else None; self.fb = ImageFont.truetype(_FB[0], sz)
        self.cmap = set()
        if pri:
            from fontTools.ttLib import TTFont
            self.cmap = set(TTFont(pri).getBestCmap().keys())
    def pick(self, ch): return self.pri if (self.pri and ord(ch) in self.cmap) else self.fb
_cache = {}
def font(sz, bold=True): return _cache.setdefault(sz, _Font(sz))
def _len(d, s, f): return sum(d.textlength(ch, font=f.pick(ch)) for ch in s) if isinstance(f, _Font) else d.textlength(s, font=f)
def _text(d, xy, s, f, fill):
    if not isinstance(f, _Font): return d.text(xy, s, font=f, fill=fill)
    x, y = xy
    for ch in s: d.text((x, y), ch, font=f.pick(ch), fill=fill); x += d.textlength(ch, font=f.pick(ch))
rng = np.random.default_rng(5)

# ---------- 甲：电影正剧 ----------
BAR = 92   # 2.39:1 的黑边
def gradeA(im, warm=1.0):
    im = im.convert('RGB')
    im = ImageEnhance.Contrast(im).enhance(1.12)
    a = np.asarray(im).astype(np.float32) / 255
    # 轻微的青橙：暗部偏青、亮部偏暖
    lum = a.mean(2, keepdims=True)
    tint = np.array([1.04, 1.0, 0.94]) * lum + np.array([0.97, 1.0, 1.04]) * (1 - lum)
    a = np.clip(a * (1 + (tint - 1) * warm), 0, 1)
    # 暗角
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    d = ((xx - a.shape[1] / 2) / (a.shape[1] / 2)) ** 2 + ((yy - a.shape[0] / 2) / (a.shape[0] / 2)) ** 2
    a *= (1 - 0.28 * np.clip(d - 0.25, 0, 1))[..., None]
    return Image.fromarray((a * 255).astype(np.uint8))
def letterbox(im):
    o = im.copy(); d = ImageDraw.Draw(o); d.rectangle((0, 0, W, BAR), fill=(0, 0, 0)); d.rectangle((0, H - BAR, W, H), fill=(0, 0, 0)); return o
def subA(im, spk, text):
    if not text: return im
    o = im.copy(); d = ImageDraw.Draw(o)
    f = font(30, False); fs = font(20)
    lines = wrap(text, 30)
    y = H - BAR + 12 if len(lines) == 1 else H - BAR + 4
    for ln in lines:
        w = _len(d, ln, f); _text(d, ((W - w) / 2, y), ln, f, (238, 230, 214)); y += 40
    if spk:
        pass
    return o
def titleA(text, sub=''):
    o = Image.new('RGB', (W, H), (8, 7, 6)); d = ImageDraw.Draw(o)
    f = font(84); w = _len(d, text, f); _text(d, ((W - w) / 2, H / 2 - 70), text, f, (232, 222, 200))
    if sub: f2 = font(26, False); w2 = _len(d, sub, f2); _text(d, ((W - w2) / 2, H / 2 + 40), sub, f2, (170, 160, 140))
    seal(d, W / 2 + _len(d, text, f) / 2 + 20, H / 2 - 54, 44, '史')
    return o
def seal(d, x, y, s, ch):
    d.rectangle((x, y, x + s, y + s), fill=(168, 40, 28)); f = font(int(s * 0.7)); w = _len(d, ch, f)
    _text(d, (x + (s - w) / 2, y + s * 0.08), ch, f, (240, 231, 210))
def wrap(t, n):
    out = []; cur = ''
    for ch in t:
        cur += ch
        if len(cur) >= n and ch in '，。！？；、' or len(cur) >= n + 6: out.append(cur); cur = ''
    if cur: out.append(cur)
    return out

# ---------- 乙：水墨长卷 ----------
def paper(w, h, seed=0):
    r = np.random.default_rng(seed)
    base = np.ones((h, w, 3), np.float32) * np.array([0.93, 0.89, 0.80])
    n = r.normal(0, 1, (h // 4 + 1, w // 4 + 1)); n = np.kron(n, np.ones((4, 4)))[:h, :w]
    base *= (1 - 0.025 * n)[..., None]
    for _ in range(int(w * h / 4000)):   # 纸的纤维
        x, y = r.integers(0, w), r.integers(0, h); L = r.integers(6, 30); a = r.uniform(0, 3.14)
        xs = (x + np.cos(a) * np.arange(L)).astype(int).clip(0, w - 1); ys = (y + np.sin(a) * np.arange(L)).astype(int).clip(0, h - 1)
        base[ys, xs] *= 0.96
    return base
def inkB(im, seed=0):
    im = im.convert('RGB'); a = np.asarray(im).astype(np.float32) / 255
    g = a @ np.array([0.3, 0.55, 0.15])
    lo, hi = np.percentile(g, 4), np.percentile(g, 97)
    if hi - lo > 0.05: g = np.clip((g - lo) / (hi - lo), 0, 1) * 0.92 + 0.04   # 夜景也拉回纸色上：水墨画里夜是淡墨，不是一片黑
    # 墨分五色：压成几级灰
    g2 = np.clip((g - 0.12) / 0.8, 0, 1) ** 0.8
    q = np.round(g2 * 5) / 5 * 0.85 + g2 * 0.15
    # 墨线：边缘检测
    gi = Image.fromarray((g * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    e = np.asarray(gi.filter(ImageFilter.FIND_EDGES)).astype(np.float32) / 255
    e = np.clip(e * 3.2, 0, 1)
    ink = np.clip(q * (1 - e * 0.85), 0, 1)
    # 晕染：模糊一点再和原图混
    soft = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32) / 255
    ink = ink * 0.6 + soft * 0.4
    P = paper(a.shape[1], a.shape[0], seed)
    out = P * (0.18 + 0.82 * ink[..., None])
    # 朱色保留：太阳、汉旗、红墨
    r, gg, b = a[..., 0], a[..., 1], a[..., 2]
    red = np.clip((r - np.maximum(gg, b) - 0.18) * 3.2, 0, 1)[..., None]
    zhu = np.array([0.66, 0.16, 0.11])
    out = out * (1 - red * 0.85) + (P * zhu * 1.15) * red * 0.85
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
def vtext(d, x, y, text, f, fill, step=None):
    step = step or f.size * 1.12
    for i, ch in enumerate(text):
        w = d.textlength(ch, font=f); d.text((x - w / 2, y + i * step), ch, font=f, fill=fill)
def subB(im, spk, text, side='left'):
    if not text: return im
    o = im.copy(); d = ImageDraw.Draw(o); f = font(30); cols = []; cur = ''
    for ch in text.replace('，', '').replace('。', '').replace('！', '').replace('？', '').replace('；', '').replace('、', ''):
        cur += ch
        if len(cur) >= 14: cols.append(cur); cur = ''
    if cur: cols.append(cur)
    n = len(cols); x0 = 70 if side == 'left' else W - 70 - (n - 1) * 44
    for i, c in enumerate(cols):                     # 竖排从右往左读：第一列在最右
        vtext(d, x0 + (n - 1 - i) * 44, 90, c, f, (40, 34, 28))
    if spk: seal(d, x0 + (n - 1) * 44 - 16, 90 - 44, 32, spk[0])
    return o

# ---------- 丙：皮影 ----------
def screen(w, h, warm=(0.98, 0.78, 0.45), seed=0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = ((xx - w * 0.5) / (w * 0.65)) ** 2 + ((yy - h * 0.42) / (h * 0.75)) ** 2
    lamp = np.clip(1.05 - d * 0.55, 0.35, 1.05)
    P = paper(w, h, seed + 7)
    base = np.array(warm) * lamp[..., None] * (0.9 + 0.1 * P / P.max())
    return base
def puppet(rgb, mask, w, h):
    m = np.asarray(mask.convert('L').resize((w, h))).astype(np.float32) / 255
    m = 1 - m   # 遮罩：黑 = 角色
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    col = np.asarray(rgb.convert('RGB').resize((w, h))).astype(np.float32) / 255
    # 皮影是半透明的彩色牛皮：取原色压暗、提饱和，叠在灯光上
    lum = col.mean(2, keepdims=True); sat = np.clip(lum + (col - lum) * 1.8, 0, 1)
    leather = 0.18 + 0.55 * sat
    # 镂空花纹：细碎的亮点
    holes = (rng.random((h, w)) > 0.995).astype(np.float32)
    holes = np.asarray(Image.fromarray((holes * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))).astype(np.float32) / 255
    return m, leather, holes
def compC(rgb, mask, deco=None, seed=0, title=None):
    S = screen(W, H, seed=seed)
    if deco: S = deco(S)
    m, leather, holes = puppet(rgb, mask, W, H)
    edge = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES)).astype(np.float32) / 255
    out = S * (1 - m[..., None]) + (S * leather * (1 - 0.6 * holes[..., None]) * 0.62) * m[..., None]
    out *= (1 - 0.6 * np.clip(edge * 3, 0, 1))[..., None]
    o = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    rods(o, m)
    return frameC(o)
def rods(o, m):
    # 操纵杆：从画面底边斜向伸到角色的脖子和手的高度
    d = ImageDraw.Draw(o)
    cols = np.where(m.max(0) > 0.5)[0]
    if len(cols) < 10: return
    from scipy import ndimage
    lab, n = ndimage.label(m > 0.5)
    sizes = ndimage.sum(m > 0.5, lab, range(1, n + 1))
    for k in np.argsort(sizes)[::-1][:3]:
        if sizes[k] < 2500: continue
        ys, xs = np.where(lab == k + 1); top, bot = ys.min(), ys.max(); cx = int(np.median(xs)); hgt = bot - top
        tx = cx; ty = top + int(0.3 * hgt)            # 一根操纵杆，从脖子斜到幕下
        d.line((tx, ty, tx + int(hgt * 0.25) + 20, H), fill=(70, 50, 30), width=2)
def frameC(o):
    d = ImageDraw.Draw(o)
    d.rectangle((0, 0, W, 26), fill=(92, 22, 16)); d.rectangle((0, H - 26, W, H), fill=(92, 22, 16))
    d.rectangle((0, 0, 26, H), fill=(92, 22, 16)); d.rectangle((W - 26, 0, W, H), fill=(92, 22, 16))
    d.rectangle((24, 24, W - 24, H - 24), outline=(196, 152, 72), width=3)
    return o
def subC(im, spk, text):
    if not text: return im
    o = im.copy(); d = ImageDraw.Draw(o); f = font(28); fs = font(22)
    lines = wrap(text, 26); hh = 40 * len(lines) + 20
    d.rectangle((W / 2 - 520, H - 26 - hh - 18, W / 2 + 520, H - 44), fill=(20, 12, 8))
    y = H - 26 - hh - 8
    for ln in lines:
        w = d.textlength(ln, font=f); d.text(((W - w) / 2, y), ln, font=f, fill=(240, 220, 170)); y += 40
    if spk: seal(d, W / 2 - 512, H - 26 - hh - 14, 34, spk[0])
    return o
def titleC(text):
    S = screen(W, H); o = Image.fromarray((np.clip(S, 0, 1) * 255).astype(np.uint8)); d = ImageDraw.Draw(o)
    f = font(96); w = d.textlength(text, font=f); d.text(((W - w) / 2, H / 2 - 66), text, font=f, fill=(48, 20, 12))
    return frameC(o)
