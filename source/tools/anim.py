"""动画联系表：python3 tools/anim.py name js n interval [start] [hash]  (环境变量 W H Q)"""
import sys, time, pathlib, os
from playwright.sync_api import sync_playwright
from PIL import Image
name, js = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
dt = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
d0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0.3
hsh = sys.argv[6] if len(sys.argv) > 6 else '#local'
W, H = int(os.environ.get('W', 800)), int(os.environ.get('H', 475))
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
url = pathlib.Path(D + '/dist/site/index.html').resolve().as_uri() + hsh
TMP = '/tmp/claude-0/frames'; os.makedirs(TMP, exist_ok=True)
frames = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}); pg.set_default_timeout(1500000)
    q = os.environ.get('Q', 'low')
    na = '' if os.environ.get('AUDIO') else "localStorage.setItem('xq3d-noaudio','1');"
    pg.add_init_script(na + f"localStorage.setItem('xq3d-quality', JSON.stringify('{q}'))")
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning', 'log') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='domcontentloaded'); time.sleep(3)
    try:
        r = pg.evaluate(js)
        if r is not None: logs.append(f'eval -> {r}')
    except Exception as e: logs.append(f'EVAL ERROR: {e}')
    time.sleep(d0)
    for i in range(n):
        f = f'{TMP}/{name}_{i}.png'
        pg.screenshot(path=f, animations='allow'); frames.append(f)
        time.sleep(dt)
    try: print('state:', pg.evaluate('JSON.stringify({t: window.__xq.game.turn, h: window.__xq.game.history.length, res: window.__xq.game.result})'))
    except Exception as e: print('state err', e)
    for l in logs:
        if 'deprecated' not in l and 'AudioContext' not in l: print(l[:500])
    b.close()
cols = 3 if n <= 12 else 4
tw, th = (W // 2, H // 2) if n <= 12 else (W // 3, H // 3)
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), 'white')
for i, f in enumerate(frames):
    sheet.paste(Image.open(f).resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
sheet.save(f'{D}/shots/{name}.png'); print('saved', name)
