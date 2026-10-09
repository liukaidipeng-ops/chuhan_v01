from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
f1, f2 = ImageFont.truetype(F, 30, index=2), ImageFont.truetype(F, 24, index=2)
BG, FG = (27, 26, 23), (240, 231, 210)
ST = [('A', '甲 · 军功条'), ('B', '乙 · 军功印'), ('C', '丙 · 正字计功')]
def sheet(dev, cols, crop, scale, out):
    tiles = {(s, k): Image.open(f'shots/{dev}_{s}_{k}.png').convert('RGB').crop(crop) for s, _ in ST for k, _ in cols}
    w, h = tiles[('A', cols[0][0])].size; w, h = int(w * scale), int(h * scale)
    L, T, G = 190, 56, 10
    S = Image.new('RGB', (L + len(cols) * (w + G), T + 3 * (h + G)), BG); d = ImageDraw.Draw(S)
    for j, (_, lab) in enumerate(cols): d.text((L + j * (w + G) + w // 2, T // 2), lab, font=f2, fill=FG, anchor='mm')
    for i, (s, lab) in enumerate(ST):
        d.text((L // 2, T + i * (h + G) + h // 2), lab, font=f1, fill=FG, anchor='mm')
        for j, (k, _) in enumerate(cols): S.paste(tiles[(s, k)].resize((w, h), Image.LANCZOS), (L + j * (w + G), T + i * (h + G)))
    S.save(out, quality=86); print(out, S.size)
C5 = [('0', '平时'), ('g250', '加功 · 铜钱飞来'), ('g800', '加功 · 到账'), ('s300', '花功 · 扣下'), ('s700', '花功 · 飞走')]
sheet('m', C5, (0, 0, 780, 1688), 0.34, 'sheet_m.jpg')
sheet('m', C5, (0, 1250, 780, 1600), 0.62, 'sheet_m_zoom.jpg')
sheet('pc', [('0', '平时'), ('g250', '加功 · 铜钱飞来'), ('g800', '加功 · 到账'), ('s300', '花功 · 扣下')], (0, 560, 760, 900), 0.62, 'sheet_pc.jpg')
