from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
f1 = ImageFont.truetype(F, 30, index=2); f2 = ImageFont.truetype(F, 21, index=2)
BG, FG = (27, 26, 23), (240, 231, 210)
def rows(items, L=330, G=10, out='x.jpg', scale=1):
    w = max(im.width for _, im in items); h = sum(im.height + G for _, im in items)
    S = Image.new('RGB', (L + w, h), BG); d = ImageDraw.Draw(S); y = 0
    for lab, im in items:
        ls = lab.split('\n')
        for k, line in enumerate(ls): d.text((L // 2, y + im.height // 2 + (k - (len(ls) - 1) / 2) * 34), line, font=f1 if k == 0 else f2, fill=FG, anchor='mm')
        S.paste(im, (L, y)); y += im.height + G
    if scale != 1: S = S.resize((int(S.width * scale), int(S.height * scale)))
    S.save(out, quality=87); print(out, S.size)
old = Image.open('shots/sheet_kai3.png').convert('RGB'); new = Image.open('shots/s2_rand_c.png').convert('RGB')
oldrow = old.crop((0, 5, old.width, 165)).resize((2550, int(160 * 2550 / old.width)))
newrow = new.crop((0, 0, new.width, 196))
w2 = Image.open('shots/wcmp2.png').convert('RGB')
rows([('现在\n俥傌粗、其余细，字偏下', oldrow), ('改后\n同一个字体、一样粗、居中', newrow), ('粗细对照\n左二：你截图里的傌、相\n中二：新木棋子\n右四：银 改前/改后', w2.resize((2550, int(w2.height * 2550 / w2.width))))], out='o2_font.jpg', scale=0.8)
fm = Image.open('shots/s2_forms_c.png').convert('RGB'); rh = fm.height // 3
rows([('疏而粗', fm.crop((0, 0, fm.width, rh))), ('密而细', fm.crop((0, rh, fm.width, 2 * rh))), ('疏密相间\n髓心偏到一边', fm.crop((0, 2 * rh, fm.width, 3 * rh))), ('实际用法\n三种随机挑，再随机转、翻\n每颗子都不一样', new)], out='o2_rings.jpg', scale=0.8)
pc_r = Image.open('shots/pc_near_v2_c.png').convert('RGB').crop((0, 230, 1440, 900)); pc_b = Image.open('shots/pc_nearb_v2_c.png').convert('RGB').crop((0, 0, 1440, 640))
m = Image.open('shots/m_near_v2_c.png').convert('RGB').crop((0, 380, 780, 1450)).resize((600, 823))
S = Image.new('RGB', (1440 + 20 + 600, 1320), BG); S.paste(pc_r, (0, 0)); S.paste(pc_b, (0, 680)); S.paste(m, (1460, 0)); S = S.resize((S.width * 3 // 4, S.height * 3 // 4)); S.save('o2_3d.jpg', quality=87); print('3d', S.size)
cr = lambda f: Image.open(f).convert('RGB').crop((0, 560, 1440, 900))
rows([('银 · 现在', cr('shots/pc_near_cur_t2.png')), ('银 · 改后', cr('shots/pc_near_en2_u2.png')), ('金 · 现在', cr('shots/pc_near_cur_t3.png')), ('金 · 改后', cr('shots/pc_near_en2_u3.png')), ('玉 · 现在', cr('shots/pc_near_cur_t4.png')), ('玉 · 改后', cr('shots/pc_near_en2_u4.png'))], out='o2_metal.jpg', scale=0.6)
