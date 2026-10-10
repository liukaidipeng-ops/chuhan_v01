from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'; f1 = ImageFont.truetype(F, 24, index=2); f2 = ImageFont.truetype(F, 18, index=2)
BG, FG, DIM = (27, 26, 23), (240, 231, 210), (190, 180, 160)
# 造型：正面一张大图 + 四级名字
a = Image.open('shots/lineup_front.png').convert('RGB').crop((0, 40, 1280, 680)); b = Image.open('shots/lineup_side.png').convert('RGB').crop((0, 40, 1280, 680))
S = Image.new('RGB', (1280, 640 * 2 + 70), BG); S.paste(a, (0, 70)); S.paste(b, (0, 710)); d = ImageDraw.Draw(S)
labs = [('一级 · 汉军相', '黑鞍鞯、素辔头'), ('二级 · 驭虎长史', '朱鞍鞯、铜肩甲、额带红缨'), ('三级 · 持节护军', '乌铁甲（肩、胯、颈）'), ('四级 · 白虎相国', '金甲（原样）')]
for i, (t1, t2) in enumerate(labs):
    x = 262 + i * 252; d.text((x, 14), t1, font=f1, fill=FG, anchor='mt'); d.text((x, 48), t2, font=f2, fill=DIM, anchor='mt')
S.save('out_lv.jpg', quality=86); print('lv', S.size)
def strip(k, idx, labs, out):
    W, H = 600, 300; S = Image.new('RGB', (len(idx) * (W + 8), H + 70), BG); d = ImageDraw.Draw(S)
    for j, (i, l) in enumerate(zip(idx, labs)):
        S.paste(Image.open(f'shots/{k}2_{i:03d}.png').convert('RGB').crop((0, 40, 1280, 680)).resize((W, H)), (j * (W + 8), 0)); d.text((j * (W + 8) + 10, H + 14), l, font=f2, fill=FG)
    S.save(out, quality=86); print(out, S.size)
strip('blast', [0, 1, 2, 3, 5, 8], ['① 炮弹落下', '② 炸开：一团火光', '③ 虎骑被掀翻，碎块、虎爪、节杖四散', '④ 烟尘里虎身翻倒', '⑤ 文臣摔在一边', '⑥ 烟散，地上一圈焦黑'], 'out_blast.jpg')
strip('fall', [0, 2, 3, 4, 5, 8], ['① 中刀', '② 虎仰头一挫，血溅', '③ 文臣被颠离鞍座', '④ 虎踉跄侧倒，文臣摔向另一边', '⑤ 节杖脱手落地', '⑥ 一虎一人倒在地上'], 'out_fall.jpg')
