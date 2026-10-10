# 逐帧录像拼成对比图：python3 sheet.py <输出> <列数> <目录:帧号:说明> ...（帧号按 10 帧/秒）
import sys
from PIL import Image, ImageDraw, ImageFont
import glob
out, cols = sys.argv[1], int(sys.argv[2]); items = [a.split(':', 2) for a in sys.argv[3:]]
fp = ['/usr/share/fonts/opentype/unifont/unifont.otf']
font = ImageFont.truetype(fp[0], 18) if fp else ImageFont.load_default(size=18)
W, H = 480, 270
ims = []
for d, i, cap in items:
    im = Image.open(f'{d}/f{int(i):04d}.jpg').convert('RGB').resize((W, H)); g = ImageDraw.Draw(im)
    txt = f'{int(i) / 10:.1f}s  {cap}'; g.rectangle((0, H - 28, W, H), fill=(20, 19, 17)); g.text((8, H - 25), txt, font=font, fill=(240, 231, 210)); ims.append(im)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * W + (cols - 1) * 6, rows * H + (rows - 1) * 6), (20, 19, 17))
for k, im in enumerate(ims): S.paste(im, ((k % cols) * (W + 6), (k // cols) * (H + 6)))
S.save(out, quality=85); print(out, S.size)
