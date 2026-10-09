"""主帅头像（大厅 / 对局两侧的刘邦、项羽小像）事先画好：用浏览器打开 dist/site/?makefaces，取页面画出的两张图，存成 img/face-r.jpg、face-b.jpg。
主帅模型（models.js 的 makeLiuBang / makeXiangYu）改了以后跑一次：
  node build.js && python3 tools/faces.py && node build.js
用的是软件渲染（不靠显卡），画出来和有显卡的电脑一样。"""
import sys, os, time, base64, io, subprocess
from playwright.sync_api import sync_playwright
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
site, out = os.path.join(D, 'dist/site'), os.path.join(D, 'img')
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8071', '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        pg.goto('http://127.0.0.1:8071/?makefaces', wait_until='commit')
        t0 = time.time(); f = None
        while time.time() - t0 < 120:
            f = pg.evaluate("window.__faces || null")
            if f: break
            time.sleep(0.5)
        b.close()
finally: http.terminate()
if not f or 'err' in f: sys.exit('没画出来：' + str(f and f.get('err')))
os.makedirs(out, exist_ok=True)
for k in ('r', 'b'):
    im = Image.open(io.BytesIO(base64.b64decode(f[k].split(',', 1)[1]))).convert('RGB')
    im.save(os.path.join(out, f'face-{k}.jpg'), quality=88, optimize=True, progressive=True)
    print(k, im.size, os.path.getsize(os.path.join(out, f'face-{k}.jpg')), 'bytes')
