# 用法：python3 shoot.py 镜号[,镜号…]  —— 镜头写在 shots.js 里（SHOTS[镜号] = () => ({ ctx, cam, post })）
import sys, time, pathlib, base64, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
SRC = '/home/claude/chuhan_v01/source'; HERE = os.path.dirname(os.path.abspath(__file__)); MD = HERE + '/../model'
OUT = HERE + '/frames'; os.makedirs(OUT, exist_ok=True)
ids = sys.argv[1].split(',')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 402}); pg.set_default_timeout(600000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:500])); pg.on('console', lambda m: print('LOG', m.text[:300]) if m.type in ('error', 'warning') and 'GPU stall' not in m.text else None)
    pg.goto(pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri(), wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(2)
    pg.evaluate("()=>{ Core.render = false; }")
    for f in (MD + '/lb2.js', MD + '/xy3.js', HERE + '/../ferry/keep/ferry.js', HERE + '/sb.js', HERE + '/shots.js'):
        pg.add_script_tag(content=open(f, encoding='utf-8').read())
    for k in ids:
        t0 = time.time()
        url = pg.evaluate("(k)=>{ const s = SHOTS[k](); return SB.shoot(s.ctx, s.cam, s.post); }", k)
        im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')
        im = im.resize((1920, round(1920 * im.height / im.width)), Image.LANCZOS)
        im.save(f'{OUT}/{k}.png'); print(k, im.size, round(time.time() - t0, 1), 's')
    b.close()
