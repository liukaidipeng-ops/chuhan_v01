from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
f1 = ImageFont.truetype(F, 26, index=2); f2 = ImageFont.truetype(F, 20, index=2)
BG, FG, DIM = (27, 26, 23), (240, 231, 210), (190, 180, 160)
def grid(items, cols, w=760, out='x.jpg'):
    h = w // 2; cap = 70; G = 12
    rows = (len(items) + cols - 1) // cols
    S = Image.new('RGB', (cols * (w + G) + G, rows * (h + cap + G) + G), BG); d = ImageDraw.Draw(S)
    for i, (k, t1, t2) in enumerate(items):
        x, y = G + (i % cols) * (w + G), G + (i // cols) * (h + cap + G)
        im = Image.open(f'shots/wide_{k}.png').convert('RGB').crop((0, 40, 1280, 680)).resize((w, h)); S.paste(im, (x, y))
        d.text((x, y + h + 10), t1, font=f1, fill=FG); d.text((x, y + h + 42), t2, font=f2, fill=DIM)
    S.save(out, quality=86); print(out, S.size)
grid([('s1', '① 迎敌', '敌骑冲来，持矛兵压低身子、弓步，长矛斜指前上方，盾顶在前'),
      ('s2', '② 撞上', '敌骑撞上矛尖：马人立、血溅，持矛兵被撞得往后一挫，脚不退'),
      ('s3', '③ 掉一滴血', '敌骑被逼退半步，头顶「−1 血」（棋盘上脚下血圈同时少一段）'),
      ('s4', '④ 退开', '敌骑面朝持矛兵往后退开、重整（不转身）'),
      ('s5', '⑤ 再冲', '持矛兵收起拒马阵站好，敌骑再冲，接平常的交战')], 3, out='out_seq.jpg')
grid([('L2', '二级 · 2 人', '并排，两杆矛'), ('L3', '三级 · 3 人 · 前二后一', '前排两人压低，后排一人站高、矛从中间伸出，两层矛'),
      ('L3a', '三级 · 3 人 · 一排', '照现在的站位，三人并排'), ('L4', '四级 · 3 名金甲', '斩马刀刃口朝上前指，大盾立在身前')], 2, out='out_lv.jpg')
