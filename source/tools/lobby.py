"""大厅与界面截图：python3 tools/lobby.py name [hash] [waits...]  （环境变量 W H Q）"""
import sys, time, pathlib, os
from playwright.sync_api import sync_playwright
name = sys.argv[1]; hsh = sys.argv[2] if len(sys.argv) > 2 else ''
waits = [float(x) for x in sys.argv[3:]] or [4]
W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 760))
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
url = pathlib.Path(D + '/dist/site/index.html').resolve().as_uri() + hsh
js = os.environ.get('JS', '')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=float(os.environ.get('DPR', 1)))
    pg.set_default_timeout(240000)
    q = os.environ.get('Q', 'low')
    pg.add_init_script(f"localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('{q}'))")
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='domcontentloaded')
    for i, w in enumerate(waits):
        time.sleep(w)
        if js and i == 0:
            try: print('eval', pg.evaluate(js))
            except Exception as e: print('EVAL ERR', e)
        pg.screenshot(path=f'{D}/shots/{name}_{i}.png')
    for l in logs:
        if 'deprecated' not in l and 'AudioContext' not in l: print(l[:400])
    b.close()
print('saved', name)
