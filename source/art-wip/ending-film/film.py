# 拍样片：python3 film.py <镜号> [fps] [W] [只拍这几帧，逗号分隔]
import sys, time, pathlib, base64, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
SRC = '/home/claude/chuhan_v01/source'; H = os.path.dirname(os.path.abspath(__file__)); SP = H + '/..'
A = SRC + '/art-wip/'
sid = sys.argv[1]; fps = int(sys.argv[2]) if len(sys.argv) > 2 else 24; W = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
only = [int(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else None
HH = round(W / 2.39 / 2) * 2; SS = float(os.environ.get('SS', '1'))
OUT = f'{H}/frames/{sid}'; os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 402}); pg.set_default_timeout(1800000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:500], flush=True))
    pg.goto(pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri(), wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(2)
    pg.evaluate("()=>{ Core.render = false; }")
    for f in (A + 'liubang-v2/lb2.js', A + 'xiangyu-v3/xy3.js', H + '/ferry2.js', H + '/sb2.js', SP + '/horse/horse.js', SP + '/horse/xy4.js', H + '/film.js'):
        nm = os.path.basename(f).split('.')[0]
        extra = {'lb2': 'window.LB2=LB2;', 'xy3': 'window.XY3=XY3;', 'horse': 'window.WuZhui=WuZhui;', 'xy4': 'window.XY4=XY4;'}.get(nm, '')
        pg.add_script_tag(content=open(f, encoding='utf-8').read() + '\n' + extra)
    dur = pg.evaluate("([id])=>{ window.__S = FILM[id](); return window.__S.dur; }", [sid])
    n = int(round(dur * fps)); dt = 1 / fps; print(sid, 'dur', dur, 'frames', n, flush=True)
    for i in range(n):
        t = i * dt
        pg.evaluate("([t,dt])=>window.__S.update(t, dt)", [t, dt])
        if only is not None and i not in only: continue
        t0 = time.time()
        url = pg.evaluate("([W,H,ss,i])=>{ const S=window.__S; return SB.shoot(S.ctx, S.cam, Object.assign({}, S.post, { W, H, ss, gseed: i })); }", [W, HH, SS, i])
        Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB').save(f'{OUT}/{i:04d}.jpg', quality=92)
        print('frame', i, round(time.time() - t0, 1), 's', flush=True)
    b.close()
