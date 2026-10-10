# 棋子字：按字体把十四个字画成 512×512 的灰度字模（白字黑底），统一大小、按墨迹居中；
# 字体里没有的字（俥、傌、砲）用同一字体的偏旁拼：亻 取自「仕」的左半，石 取自「破/砂/研」的左半，包 取自「炮」的右半。
# 用法：python3 glyphs.py  → glyphs/<字体键>/<字>.png 和 一张对照图
import os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
H = os.path.dirname(os.path.abspath(__file__))
FONTS = {
    'li': ('隶书 · 教育部隸書', H + '/fontpkg-tw-moe-li-3.0.0/package/MoeLI(隸書3.0版1080724上網).ttf'),
    'song': ('宋体 · 仙人掌明體', H + '/song_cactus.ttf'),
    'songm': ('宋体 · 思源宋体 Bold', H + '/song_noto700.ttf'),
    'xing': ('行书 · 英椎行書', H + '/fontpkg-acgyosyo-1.0.0/package/acgyosyo.ttf'),
    'kai': ('楷体 · 霞鹜文楷（上一版）', H + '/../kai/xqkai.ttf'),
}
CHARS = '帥仕相俥傌炮兵將士象車馬砲卒'
N = 512
def has(font_path, ch): return ord(ch) in TTFont(font_path, fontNumber=0, lazy=True).getBestCmap()
def raw(fp, ch, size=360):
    f = ImageFont.truetype(fp, size); im = Image.new('L', (N * 2, N * 2), 0); d = ImageDraw.Draw(im)
    d.text((N, N), ch, font=f, fill=255, anchor='mm'); a = np.asarray(im)
    ys, xs = np.where(a > 40)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
def split_col(im, lo=0.25, hi=0.6):   # 左右结构的字：找中间墨最少的那一列
    a = np.asarray(im).astype(float); col = a.sum(0); w = len(col); i0, i1 = int(w * lo), int(w * hi)
    return i0 + int(np.argmin(col[i0:i1]))
def compose(fp, left_src, right_src, right_from_src=False):
    L = raw(fp, left_src); sl = split_col(L); Lp = L.crop((0, 0, sl, L.height))
    R = raw(fp, right_src); full = R
    if right_from_src: sr = split_col(R, 0.3, 0.6); R = R.crop((sr, 0, R.width, R.height))
    # 拼成一个方块字：总宽、总高照右边那个字原来的大小，左旁约占三成，右边部件压窄
    Hh, W = full.height, full.width; k = Hh / L.height
    Lr = Lp.resize((max(1, int(Lp.width * k)), Hh)); lw = Lr.width; gap = int(W * 0.03)   # 左旁等比缩放，不变形
    Rr = R.resize((max(1, int(W * 1.04) - lw - gap), Hh)); W = lw + gap + Rr.width
    out = Image.new('L', (W, Hh), 0); out.paste(Lr, (0, 0)); out.paste(Rr, (lw + gap, 0), Rr)
    return out
COMP = {'俥': ('仕', '車', False), '傌': ('仕', '馬', False), '砲': (None, '炮', True)}
def glyph(fp, ch):
    if has(fp, ch): return raw(fp, ch), False
    l, r, rf = COMP[ch]
    if l is None: l = next(c for c in '破砂研' if has(fp, c))
    return compose(fp, l, r, rf), True
def place(g, s):   # 放进 512 方格：同一字体所有字用同一个缩放（字和字原本的大小差别保留），墨迹框中心和重心各一半，整体略往上提
    g = g.resize((max(1, int(g.width * s)), max(1, int(g.height * s))), Image.LANCZOS)
    a = np.asarray(g).astype(float); ys = np.arange(g.height); cy = (a.sum(1) * ys).sum() / a.sum(); mix = (g.height / 2 + cy) / 2
    out = Image.new('L', (N, N), 0); out.paste(g, (N // 2 - g.width // 2, int(N / 2 - mix - 6)))
    return out
if __name__ == '__main__':
    meta = {}
    for k, (label, fp) in FONTS.items():
        os.makedirs(f'{H}/glyphs/{k}', exist_ok=True); meta[k] = {'label': label, 'composed': []}
        gs = {ch: glyph(fp, ch) for ch in CHARS}
        sc = min(362 / (g.width ** 2 + g.height ** 2) ** 0.5 for g, c in gs.values())   # 按对角线：最大的那个字四角离里圈还留一点空
        for ch, (g, c) in gs.items():
            place(g, sc).save(f'{H}/glyphs/{k}/{ch}.png')
            if c: meta[k]['composed'].append(ch)
        print(k, label, '拼的字：', ''.join(meta[k]['composed']) or '无')
    json.dump(meta, open(H + '/glyphs/meta.json', 'w'), ensure_ascii=False)
    # 对照图
    S = Image.new('L', (len(CHARS) * 140 + 20, len(FONTS) * 150 + 10), 30)
    for i, k in enumerate(FONTS):
        for j, ch in enumerate(CHARS): S.paste(Image.open(f'{H}/glyphs/{k}/{ch}.png').resize((140, 140)), (10 + j * 140, 10 + i * 150))
    S.save(H + '/glyphs/sheet.png')
