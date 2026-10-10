# 把思源宋体 TC Bold 的十四个棋子字烘成 SVG 路径（字体单位，y 朝下），原点挪到「墨迹框中心（横）/ 墨迹框中心和重心各半（竖）」
# 输出 glyphs.json：{ K: 每字体单位占贴图边长多少, G: {字: 路径} }；和 078 送审的字模同一套算法（最大的字对角线 = 362/512 边长）
import json, sys, numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image, ImageDraw, ImageFont
FP = sys.argv[1]; OUT = sys.argv[2]
CHARS = '帥仕相俥傌炮兵將士象車馬砲卒'
f = TTFont(FP); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
S = 2000   # 栅格化用的字号（像素/em），算重心
pf = ImageFont.truetype(FP, S)
info = {}
for ch in CHARS:
    gn = cmap[ord(ch)]; bp = BoundsPen(gs); gs[gn].draw(bp); x0, y0, x1, y1 = bp.bounds
    # 栅格：anchor 'ls' = 笔位原点在基线左端
    im = Image.new('L', (S * 2, S * 2), 0); d = ImageDraw.Draw(im); ox, oy = S // 2, S + S // 2
    d.text((ox, oy), ch, font=pf, fill=255, anchor='ls'); a = np.asarray(im).astype(float)
    ys, xs = np.where(a > 40)
    # 像素 → 字体单位
    k = S / upm
    rb = ((xs.min() - ox) / k, (oy - ys.max()) / k, (xs.max() - ox) / k, (oy - ys.min()) / k)
    cyp = (a.sum(1) * np.arange(a.shape[0])).sum() / a.sum()
    cy_units = (oy - cyp) / k            # 重心（字体单位，y 朝上）
    info[ch] = dict(bounds=(x0, y0, x1, y1), raster=rb, cy=cy_units)
    assert all(abs(p - q) < 6 for p, q in zip((x0, y0, x1, y1), rb)), (ch, (x0, y0, x1, y1), rb)
maxdiag = max(((b[2] - b[0]) ** 2 + (b[3] - b[1]) ** 2) ** 0.5 for b in (v['bounds'] for v in info.values()))
K = 362 / 512 / maxdiag
G = {}
for ch in CHARS:
    x0, y0, x1, y1 = info[ch]['bounds']; cx = (x0 + x1) / 2
    # 竖直：墨迹框中心和重心各一半（y 朝上），落到原点
    my = ((y0 + y1) / 2 + info[ch]['cy']) / 2
    rp = RecordingPen(); gs[cmap[ord(ch)]].draw(rp)
    T = lambda p: (round(p[0] - cx), round(my - p[1]))   # y 翻成朝下
    out = []; cur = None
    for op, args in rp.value:
        if op == 'moveTo': p = T(args[0]); out.append('M%d %d' % p); cur = p
        elif op == 'lineTo': p = T(args[0]); out.append('L%d %d' % p); cur = p
        elif op == 'qCurveTo':
            pts = [T(q) for q in args if q is not None]
            # TrueType 隐含在线点：连续两个控制点之间取中点
            if args[-1] is None:   # 整条轮廓全是控制点的情况（极少）
                raise SystemExit('closed quad contour not handled: ' + ch)
            ctrl, end = pts[:-1], pts[-1]
            for i, c in enumerate(ctrl):
                e = end if i == len(ctrl) - 1 else ((c[0] + ctrl[i + 1][0]) / 2, (c[1] + ctrl[i + 1][1]) / 2)
                out.append('Q%d %d %g %g' % (c[0], c[1], e[0], e[1]))
        elif op == 'curveTo':
            c1, c2, e = [T(q) for q in args]; out.append('C%d %d %d %d %d %d' % (*c1, *c2, *e))
        elif op in ('closePath', 'endPath'): out.append('Z')
        else: raise SystemExit('op ' + op)
    G[ch] = ''.join(out).replace(' -', '-')
json.dump({'K': K, 'G': G, 'upm': upm}, open(OUT, 'w'), ensure_ascii=False)
print('K', K, 'maxdiag', round(maxdiag), 'bytes', sum(len(v) for v in G.values()))
