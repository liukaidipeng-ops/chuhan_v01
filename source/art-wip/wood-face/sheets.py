from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
f1 = ImageFont.truetype(F, 30, index=2); f2 = ImageFont.truetype(F, 24, index=2)
BG, FG = (27, 26, 23), (240, 231, 210)
def rows(items, L=230, G=10, T=0):
    w = max(im.width for _, im in items); h = sum(im.height + G for _, im in items) + T
    S = Image.new('RGB', (L + w, h), BG); d = ImageDraw.Draw(S); y = T
    for lab, im in items:
        for k, line in enumerate(lab.split('\n')): d.text((L // 2, y + im.height // 2 + (k - (lab.count('\n')) / 2) * 34), line, font=f1 if k == 0 else f2, fill=FG, anchor='mm')
        S.paste(im, (L, y)); y += im.height + G
    return S
sh = Image.open('shots/sheet_kai3.png').convert('RGB'); rh = 160
row = lambda i: sh.crop((0, 10 + i * rh - 5, sh.width, 10 + i * rh + 155))
en = [Image.open(f'shots/pc_near_{v}_kai.png').convert('RGB').crop((0, 560, 1440, 900)) for v in ('en0', 'en1')]
en = [im.resize((im.width * 2140 // 1440 // 1, im.height * 2140 // 1440)) for im in en]
S = rows([('现在（木）\n字偏下，贴着里圈', row(0)), ('修正后（木）\n按字的墨迹居中', row(1)), ('现在（银）\n二到四级同样偏下', en[0]), ('修正后（银）', en[1])])
S.save('out_fix.jpg', quality=86); print('fix', S.size)
S = rows([('甲 · 黄杨木\n细直纹，最淡', row(2)), ('乙 · 榉木山纹\n山形纹，最像家具', row(3)), ('丙 · 年轮\n截一段树枝做的', row(4))])
S.save('out_flat.jpg', quality=86); print('flat', S.size)
pc = lambda v: Image.open(f'shots/pc_near_{v}_kai3.png').convert('RGB').crop((0, 230, 1440, 900))
S = rows([('甲 · 黄杨木', pc('A')), ('乙 · 榉木山纹', pc('B')), ('丙 · 年轮', pc('C'))], L=200)
S = S.resize((S.width * 2 // 3, S.height * 2 // 3)); S.save('out_pc.jpg', quality=86); print('pc', S.size)
ph = lambda v: Image.open(f'shots/m_near_{v}_kai.png').convert('RGB')
ims = [('现在', ph('now')), ('甲', ph('A')), ('乙', ph('B')), ('丙', ph('C'))]
w, h = ims[0][1].size; T = 56
S = Image.new('RGB', (4 * (w + 10), h + T), BG); d = ImageDraw.Draw(S)
for i, (lab, im) in enumerate(ims): d.text((i * (w + 10) + w // 2, T // 2), lab, font=f1, fill=FG, anchor='mm'); S.paste(im, (i * (w + 10), T))
S = S.resize((S.width // 2, S.height // 2)); S.save('out_m.jpg', quality=86); print('m', S.size)
