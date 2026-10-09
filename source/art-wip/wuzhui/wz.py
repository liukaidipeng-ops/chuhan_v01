# 乌骓 · 设计稿：踏雪乌骓（通身乌黑、四蹄白），秦汉战马的样子——剪鬃、结尾、无马镫；朱红鞍鞯、铜当卢、S 形镳、颈下红缨
import math
from fine import *
C = dict(coat='#1d1b1f', coat2='#2b2a31', sheen='#5a6478', sock='#ece4d2', hoof='#4a4038', mane='#0e0d0f', felt='#9e2418', felt2='#6c160f',
         trim='#c9a14a', bronze='#b08a3e', leather='#3a2418', tassel='#b0261a', eye='#0b0a0a', mud='#6b5640', dust='#a8957a')
def pal(st):
    c = dict(C)
    if st >= 2: c['felt'] = '#86200f'; c['trim'] = '#a8894a'; c['bronze'] = '#94763a'
    return c
# 侧面（朝右）。坐标：地面 y=520，马肩高约 300px（和项羽 1.9 米 ≈ 365px 的比例一致）
def side_view(st=1, F=None, ox=0, oy=0, k=1.0, rider=False):
    F = F or Fig(940, 600, (0, 0, 940, 600)); c = pal(st)
    T = lambda pts: [(ox + x * k, oy + y * k) for x, y in pts]
    S = lambda pts, corners=(): sm(T(pts), corners)
    far = mul(c['coat'], 0.8)
    # —— 腿：前腿（前臂粗、膝扁、管骨细、球节鼓、系部斜）/ 后腿（胫斜、飞节尖、管骨竖）——
    def fleg(dx, col, dy=0):
        P = [(-24, 326), (6, 330), (10, 360), (6, 400), (4, 430), (6, 444), (1, 470), (3, 488), (11, 504), (18, 520), (-8, 520), (-7, 506), (-13, 490), (-12, 470), (-13, 444), (-15, 430), (-20, 396), (-30, 356)]
        Q = [(x + dx, y + dy) for x, y in P]
        F.p(S(Q, (9, 10)), col, sw=2.4, cut=0.55)
        return Q
    def hleg(dx, col, dy=0):
        P = [(26, 336), (20, 382), (6, 422), (4, 436), (3, 470), (5, 488), (12, 504), (19, 520), (-7, 520), (-6, 506), (-12, 490), (-12, 470), (-14, 438), (-22, 424), (-24, 404), (-34, 372), (-40, 344), (-20, 326)]
        Q = [(x + dx, y + dy) for x, y in P]
        F.p(S(Q, (7, 8, 13)), col, sw=2.4, cut=0.55)
        return Q
    def socks(dx, col_hoof):
        F.p(S([(dx - 13, 474), (dx + 4, 472), (dx + 6, 490), (dx + 13, 505), (dx - 8, 506), (dx - 14, 490)], ()), c['sock'], sw=2)
        F.p(poly(T([(dx - 9, 506), (dx + 13, 505), (dx + 19, 520), (dx - 8, 520)])), col_hoof, sw=2.2)
        F.ln(sm(T([(dx - 13, 490), (dx - 4, 486), (dx + 5, 489)]), closed=False), mul(c['sock'], 0.7), 1.2)
    fleg(642, far); socks(642, c['hoof'])
    hleg(352, far); socks(352, c['hoof'])
    # —— 尾巴：秦汉战马把尾巴挽成结 ——
    F.p(S([(328, 226), (300, 236), (282, 262), (290, 286), (310, 282), (318, 258), (336, 240)]), c['mane'], sw=2.2)
    F.p(ell(ox + 292 * k, oy + 292 * k, 15 * k, 12 * k), c['mane'], sw=2.2)
    F.p(S([(286, 300), (278, 340), (284, 372), (296, 370), (300, 336), (300, 302)]), c['mane'], sw=2.2)
    F.ln(sm(T([(296, 266), (292, 290), (290, 330)]), closed=False), mul(c['mane'], 2.2), 1.2)
    F.p(S([(282, 288), (304, 284), (306, 296), (282, 300)], (0, 1, 2, 3)), c['tassel'], sw=1.8)   # 扎尾的红绳
    # —— 近侧的两条腿（先画，躯干盖住腿根，看不到接缝）——
    fleg(600, c['coat']); socks(600, c['hoof'])
    hleg(382, c['coat']); socks(382, c['hoof'])
    # —— 躯干 + 颈 + 头（一整块剪影）——
    body = [(560, 202), (520, 214), (470, 222), (420, 216), (372, 206), (336, 214), (318, 242), (316, 284), (328, 324), (352, 352), (380, 372), (412, 368),
            (452, 366), (520, 368), (568, 366), (590, 376), (614, 360), (646, 322), (660, 290), (676, 262), (700, 246), (720, 254), (742, 270), (770, 276), (796, 270),
            (806, 252), (800, 230), (772, 196), (748, 164), (732, 146), (716, 142), (690, 150), (650, 172), (602, 190)]
    F.p(S(body), c['coat'], sw=2.6, cut=0.62)
    # 肌肉和毛色的反光（一点蓝）
    for d in ([(574, 236), (612, 252), (636, 290), (632, 330)], [(352, 236), (392, 228), (420, 250)], [(690, 168), (720, 160), (740, 176)], [(460, 330), (520, 340), (580, 334)]):
        F.ln(sm(T(d), closed=False), c['sheen'], 2.4, 'opacity=".7"')
    F.ln(sm(T([(640, 300), (606, 330), (600, 362)]), closed=False), mul(c['coat'], 0.55), 1.6)   # 肩线
    F.ln(sm(T([(372, 262), (394, 300), (404, 340), (408, 368)]), closed=False), mul(c['coat'], 0.55), 1.6)   # 大腿
    F.ln(sm(T([(600, 300), (588, 340), (586, 372)]), closed=False), mul(c['coat'], 0.55), 1.6)   # 前臂
    # —— 鬃毛：剪成一排短立鬃，额前一撮扎起来 ——
    pts = []
    for i in range(22):
        t = i / 21; x = 722 - t * 168; y = 148 + t * 50 + math.sin(t * math.pi) * -8
        pts.append((x, y))
    for i in range(len(pts) - 1):
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        F.p(poly(T([(x1, y1 + 2), (x1 - 2, y1 - 13), (x2 + 2, y2 - 12), (x2, y2 + 2)])), c['mane'], sw=1.6, flat=True)
    F.p(S([(724, 142), (732, 122), (744, 126), (738, 146)]), c['mane'], sw=1.6)   # 额鬃一撮
    F.p(poly(T([(729, 128), (741, 130), (740, 135), (728, 133)])), c['tassel'], sw=1.2, flat=True)
    # 耳朵
    F.p(S([(716, 146), (712, 116), (726, 140)], (1,)), c['coat'], sw=2)
    # 眼、鼻孔、嘴
    F.p(ell(ox + 752 * k, oy + 190 * k, 7 * k, 5 * k), c['eye'], sw=1.4, flat=True)
    F.raw(f'<circle cx="{ox + 754 * k}" cy="{oy + 188 * k}" r="{1.8 * k}" fill="#fff" opacity=".8"/>')
    F.ln(sm(T([(744, 182), (752, 180), (762, 186)]), closed=False), mul(c['coat'], 2.0), 1.4)
    F.p(ell(ox + 796 * k, oy + 250 * k, 5 * k, 3.5 * k), '#000', sw=1, flat=True)
    F.ln(sm(T([(774, 272), (790, 266), (800, 262)]), closed=False), '#000', 1.6)
    # —— 马具：笼头（皮带 + 铜扣）、当卢、S 形镳、衔 ——
    L = c['leather']
    F.ln(sm(T([(722, 150), (736, 196), (752, 236), (770, 256)]), closed=False), L, 5)   # 颊带
    F.ln(sm(T([(722, 152), (746, 160), (770, 176), (790, 214)]), closed=False), L, 4.5)  # 额带 → 鼻带
    F.ln(sm(T([(706, 160), (712, 214), (726, 252)]), closed=False), L, 4.5)              # 喉带
    F.ln(sm(T([(752, 236), (774, 232), (796, 234)]), closed=False), L, 4.5)              # 鼻革
    F.p(S([(750, 150), (766, 158), (778, 186), (770, 214), (760, 200), (752, 172)]), F.metal(c['bronze'], 'dl'), sw=1.8, flat=True)   # 当卢（额前铜饰）
    F.raw(f'<circle cx="{ox + 764 * k}" cy="{oy + 182 * k}" r="{4 * k}" fill="{c["felt"]}" stroke="{INK}" stroke-width="1.2"/>')
    F.ln(sm(T([(766, 246), (774, 256), (768, 266), (776, 278)]), closed=False), c['bronze'], 4)   # S 形镳
    F.raw(f'<circle cx="{ox + 772 * k}" cy="{oy + 260 * k}" r="{4.5 * k}" fill="{c["bronze"]}" stroke="{INK}" stroke-width="1.4"/>')
    # 缰绳（垂到鞍前）
    F.ln(sm(T([(772, 262), (720, 286), (650, 262), (600, 236)]), closed=False), L, 3.5)
    # 颈下红缨
    F.ln(sm(T([(712, 250), (708, 262)]), closed=False), L, 3)
    F.p(S([(698, 262), (718, 262), (722, 294), (712, 302), (702, 300), (694, 292)]), c['tassel'], sw=1.8)
    for xx in (700, 706, 712, 718): F.ln(f'M{ox + xx * k},{oy + 272 * k} L{ox + (xx - 2) * k},{oy + 298 * k}', mul(c['tassel'], 0.6), 1)
    # —— 攀胸（胸带）+ 后鞧，挂红缨 ——
    F.ln(sm(T([(566, 252), (612, 280), (650, 300), (664, 300)]), closed=False), L, 6)
    for xx, yy in ((604, 276), (628, 290), (652, 300)):
        F.p(S([(xx - 6, yy + 2), (xx + 6, yy + 2), (xx + 7, yy + 22), (xx, yy + 27), (xx - 7, yy + 22)]), c['tassel'], sw=1.4)
        F.raw(f'<circle cx="{ox + xx * k}" cy="{oy + (yy + 1) * k}" r="{3.4 * k}" fill="{c["bronze"]}" stroke="{INK}" stroke-width="1"/>')
    F.ln(sm(T([(452, 222), (390, 232), (340, 250), (326, 264)]), closed=False), L, 6)
    for xx, yy in ((410, 228), (372, 240), (342, 254)):
        F.p(S([(xx - 6, yy + 2), (xx + 6, yy + 2), (xx + 7, yy + 22), (xx, yy + 27), (xx - 7, yy + 22)]), c['tassel'], sw=1.4)
        F.raw(f'<circle cx="{ox + xx * k}" cy="{oy + (yy + 1) * k}" r="{3.4 * k}" fill="{c["bronze"]}" stroke="{INK}" stroke-width="1"/>')
    # —— 鞍：朱红鞍鞯（毡垫，墨边回纹）+ 低鞍桥，没有马镫 ——
    F.p(S([(464, 214), (564, 206), (578, 220), (582, 282), (570, 296), (472, 300), (458, 286), (452, 228)], (1, 2, 5, 6)), c['felt'], sw=2.4)
    F.pat(S([(456, 276), (580, 272), (582, 282), (570, 296), (472, 300), (458, 286)], (0, 1)), F.keypat('wzk', c['trim'], c['felt2'], 9), sw=2)
    F.p(S([(470, 196), (496, 186), (544, 186), (566, 196), (570, 214), (466, 218)], (0, 3)), c['leather'], sw=2.2)   # 鞍座
    F.p(S([(560, 196), (574, 176), (584, 182), (576, 214)], (1,)), c['leather'], sw=2)     # 前鞍桥
    F.p(S([(476, 198), (462, 182), (452, 188), (462, 214)], (1,)), c['leather'], sw=2)     # 后鞍桥
    F.ln(f'M{ox + 474 * k},{oy + 204 * k} L{ox + 562 * k},{oy + 204 * k}', c['trim'], 2.2)
    F.ln(sm(T([(522, 296), (524, 340), (528, 372)]), closed=False), L, 5)   # 肚带
    F.raw(f'<rect x="{ox + 516 * k}" y="{oy + 330 * k}" width="{16 * k}" height="{12 * k}" fill="{c["bronze"]}" stroke="{INK}" stroke-width="1.4"/>')
    # —— 第二阶段：腿上泥、肚皮溅泥、鞍鞯旧 ——
    if st >= 2:
        r = rnd(7)
        spots = [(380, 380, 500), (356, 380, 500), (596, 380, 500), (640, 380, 500)]
        for _ in range(90):
            if r() < 0.3: x = 440 + r() * 140; y = 352 + r() * 14
            else:
                lx, y0, y1 = spots[int(r() * 4)]; y = y0 + r() * (y1 - y0); x = lx + (r() - 0.5) * 18
            F.raw(f'<circle cx="{ox + x * k}" cy="{oy + y * k}" r="{(1 + r() * 2.4) * k}" fill="{c["mud"]}" opacity="{0.45 + r() * 0.4}"/>')
        for xx in (380, 356, 596, 640): F.p(S([(xx - 13, 470), (xx + 13, 470), (xx + 15, 506), (xx - 15, 506)], (0, 1)), c['mud'], sw=0, extra='opacity=".55"')
        F.raw(f'<path d="{S([(452, 360), (560, 362), (600, 352), (560, 376), (460, 372)])}" fill="{c["dust"]}" opacity=".35"/>')
    return F
def svg_side(st=1): return side_view(st).svg('#f0e7d2')

def front_view(st=1):
    F = Fig(300, 600, (0, 0, 300, 600)); c = pal(st); cx = 150
    M = lambda half, sharp=(): mir(half, sharp, cx)
    # 两条前腿
    for sx in (-1, 1):
        x = cx + sx * 34
        F.p(sm([(x - 16, 330), (x + 16, 330), (x + 12, 440), (x + 9, 470), (x + 10, 506), (x - 10, 506), (x - 9, 470), (x - 12, 440)], ()), c['coat'], sw=2.4)
        F.p(sm([(x - 11, 472), (x + 11, 472), (x + 12, 506), (x - 12, 506)], (0, 1)), c['sock'], sw=2)
        F.p(poly([(x - 13, 504), (x + 13, 504), (x + 15, 520), (x - 15, 520)]), c['hoof'], sw=2.2)
    # 胸 + 肩
    F.p(M([(0, 220), (40, 224), (62, 260), (66, 318), (52, 352), (0, 360)]), c['coat'], sw=2.6)
    F.ln(f'M{cx},250 L{cx},350', mul(c['coat'], 0.55), 1.6)
    # 鞍鞯从两侧垂下
    for sx in (-1, 1): F.p(sm([(cx + sx * 58, 214), (cx + sx * 74, 218), (cx + sx * 78, 290), (cx + sx * 62, 296)], (1, 2)), c['felt'], sw=2)
    # 颈 + 头（正面看，头朝镜头）
    F.p(M([(0, 120), (22, 128), (32, 170), (40, 220), (0, 226)]), c['coat'], sw=2.4)
    F.p(M([(0, 96), (20, 100), (26, 150), (20, 200), (14, 236), (0, 242)]), c['coat'], sw=2.4)
    for sx in (-1, 1): F.p(sm([(cx + sx * 12, 102), (cx + sx * 20, 72), (cx + sx * 24, 104)], (1,)), c['coat'], sw=2)
    F.p(M([(0, 84), (8, 82), (10, 102), (0, 106)]), c['mane'], sw=1.6)
    F.p(M([(0, 108), (14, 112), (12, 176), (0, 190)]), F.metal(c['bronze'], 'dlf'), sw=1.8, flat=True)
    F.raw(f'<circle cx="{cx}" cy="140" r="5" fill="{c["felt"]}" stroke="{INK}" stroke-width="1.2"/>')
    for sx in (-1, 1):
        F.p(ell(cx + sx * 22, 150, 4, 6), c['eye'], sw=1.2, flat=True)
        F.ln(f'M{cx + sx * 18},228 Q{cx + sx * 30},232 {cx + sx * 26},246', c['bronze'], 4)
        F.p(ell(cx + sx * 9, 232, 4, 3), '#000', sw=1, flat=True)
    F.ln(f'M{cx - 20},200 L{cx + 20},200', c['leather'], 4); F.ln(f'M{cx - 22},170 L{cx - 18},228 M{cx + 22},170 L{cx + 18},228', c['leather'], 4)
    F.p(M([(0, 250), (12, 250), (14, 286), (0, 294)]), c['tassel'], sw=1.8)
    # 攀胸 + 红缨
    F.ln(f'M{cx - 60},262 Q{cx},300 {cx + 60},262', c['leather'], 6)
    for xx in (-36, 0, 36): F.p(sm([(cx + xx - 6, 286 - abs(xx) * 0.3), (cx + xx + 6, 286 - abs(xx) * 0.3), (cx + xx + 7, 308 - abs(xx) * 0.3), (cx + xx, 314 - abs(xx) * 0.3), (cx + xx - 7, 308 - abs(xx) * 0.3)]), c['tassel'], sw=1.4)
    return F
def head_view(st=1):
    F = Fig(420, 360, (600, 100, 260, 222)); side_view(st, F)
    return F

def sheet():
    import html as H
    lab = lambda x, y, t, sz=15: f'<text x="{x}" y="{y}" font-family="Noto Serif CJK SC,serif" font-weight="900" font-size="{sz}" fill="#141311">{H.escape(t)}</text>'
    parts = []
    parts.append(f'<div style="display:flex;gap:14px;align-items:flex-end">{side_view(1).svg()}{front_view(1).svg()}</div>')
    parts.append(f'<div style="display:flex;gap:14px;align-items:flex-end">{side_view(2, Fig(620, 396, (260, 100, 600, 430))).svg()}{head_view(1).svg()}</div>')
    return '<div style="padding:10px;display:flex;flex-direction:column;gap:10px">' + ''.join(parts) + '</div>'
