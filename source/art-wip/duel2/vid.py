# 自查：按 1/30 秒一步走完一遍，逐帧截画面，拼成视频和联系表
import time, pathlib, sys, os, subprocess
from playwright.sync_api import sync_playwright
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); THREE = '/home/claude/chuhan_v01/source/node_modules/three/build/three.min.js'
scen = sys.argv[1]; T = float(sys.argv[2]) if len(sys.argv) > 2 else 5.6; VW = int(os.environ.get('VW', 700))
html = '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">' + open(H + '/index.html', encoding='utf-8').read()
open(H + '/_t.html', 'w', encoding='utf-8').write(html)
fr = f'{H}/v_{scen}'; os.makedirs(fr, exist_ok=True)
for x in os.listdir(fr): os.remove(fr + '/' + x)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': VW, 'height': 1000})
    pg.on('pageerror', lambda e: print('PAGEERROR', e, flush=True))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.goto(pathlib.Path(H + '/_t.html').as_uri()); time.sleep(2.5)
    pg.click(f'[data-s={scen}]')
    pg.click('[data-r="0"]'); time.sleep(0.3)
    n = int(T * 30)
    for i in range(n):
        pg.evaluate("()=>window.__step(1/30)")
        pg.locator('canvas').screenshot(path=f'{fr}/{i:04d}.png')
    b.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', f'{fr}/%04d.png', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-c:v', 'libx264', '-crf', '22', f'{H}/v_{scen}.mp4'], check=True)
# 联系表：从 a 到 b 每 k 帧一张
a, bb, k = [int(x) for x in os.environ.get('SHEET', '30,90,3').split(',')]
ims = [Image.open(f'{fr}/{i:04d}.png') for i in range(a, min(bb, n), k)]
w, h = ims[0].size; s = 0.36; W, HH = int(w * s), int(h * s); cols = 5
S = Image.new('RGB', (W * cols, HH * ((len(ims) + cols - 1) // cols)))
for j, im in enumerate(ims): S.paste(im.resize((W, HH)), ((j % cols) * W, (j // cols) * HH))
S.save(f'{H}/sheet_{scen}.jpg', quality=80); print('ok', n, len(ims))
