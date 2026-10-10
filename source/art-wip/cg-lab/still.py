# 出定格：python3 still.py <场景js> <镜头名> [W] [输出名]
# 在游戏页面里加载 CG 资产，跑场景 js 里的 STILL[镜头名]()（返回 {ctx, cam, post, update?}），用 SB.shoot 出一张 2.39:1 的图
import sys, os, time, pathlib, base64, io
from playwright.sync_api import sync_playwright
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.abspath(H + '/../..'); A = SRC + '/art-wip/'
scene, shot = sys.argv[1], sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 1280; out = sys.argv[4] if len(sys.argv) > 4 else shot
HH = round(W / 2.39 / 2) * 2
os.makedirs(H + '/out', exist_ok=True)
LIBS = [A + 'liubang-v2/lb2.js', A + 'xiangyu-v3/xy3.js', A + 'ending-film/ferry2.js', A + 'ending-film/sb2.js', A + 'wuzhui3d/horse.js', A + 'wuzhui3d/xy4.js', H + '/cgify.js']
LIBS += [H + '/' + f for f in os.environ.get('EXTRA', '').split(',') if f]
EXP = {'lb2': 'window.LB2=LB2;', 'xy3': 'window.XY3=XY3;', 'horse': 'window.WuZhui=WuZhui;', 'xy4': 'window.XY4=XY4;'}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('PW_CHROME') or '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 402}); pg.set_default_timeout(1800000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:500], flush=True))
    pg.on('console', lambda m: m.type == 'error' and print('CONSOLE', m.text[:300], flush=True))
    pg.goto(pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri(), wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(2)
    pg.evaluate("()=>{ Core.render = false; }")
    for f in LIBS + [H + '/' + scene]:
        nm = os.path.basename(f).split('.')[0]
        pg.add_script_tag(content=open(f, encoding='utf-8').read() + '\n' + EXP.get(nm, ''))
    for one in shot.split(','):
        nm, _, tt = one.partition('@')
        t0 = time.time()
        try:
            url = pg.evaluate("([id,W,H,tt])=>{ const S = tt ? (()=>{ const F = FILM[id](), dt = 1/24; for (let x = 0; x <= +tt; x += dt) F.update(x, dt); return F; })() : STILL[id](); if (!tt && S.update) S.update(); return SB.shoot(S.ctx, S.cam, Object.assign({ W, H, ss: 1, gseed: 1 }, S.post)); }", [nm, W, HH, tt])
            Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB').save(f'{H}/out/{out if "," not in shot else "c_" + nm}.jpg', quality=90)
            print('ok', nm, round(time.time() - t0, 1), 's', flush=True)
        except Exception as e:
            print('FAIL', nm, str(e)[:400], flush=True)
    b.close()
