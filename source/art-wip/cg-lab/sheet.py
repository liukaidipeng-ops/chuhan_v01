# 拼对比图：python3 sheet.py 输出名 前缀A:标题A 前缀B:标题B 视图1:标签1 视图2:标签2 ...
import sys
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 26); Fs = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
out = sys.argv[1]; cols = [a.split(':') for a in sys.argv[2:4]]; rows = [a.split(':') for a in sys.argv[4:]]
W, H, G = 640, 268, 14
c = Image.new('RGB', (W * 2 + G, 46 + len(rows) * (H + 34)), (18, 16, 15)); d = ImageDraw.Draw(c)
for j, (_, t) in enumerate(cols): d.text((j * (W + G) + 12, 10), t, fill=(236, 227, 207), font=F)
for i, (v, lab) in enumerate(rows):
    y = 46 + i * (H + 34)
    d.text((12, y + 4), lab, fill=(157, 148, 131), font=Fs)
    for j, (p, _) in enumerate(cols): c.paste(Image.open(f'out/{p}_{v}.jpg').resize((W, H)), (j * (W + G), y + 30))
c.save(f'out/{out}.jpg', quality=88); print(out, c.size)
