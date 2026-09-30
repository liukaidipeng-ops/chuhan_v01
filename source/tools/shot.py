"""截图：python3 tools/shot.py out.png [js] [等待秒] [hash] [W] [H]"""
import sys, time, pathlib, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; js = sys.argv[2] if len(sys.argv) > 2 else ''
wait = float(sys.argv[3]) if len(sys.argv) > 3 else 2
hsh = sys.argv[4] if len(sys.argv) > 4 else '#local'
w = int(sys.argv[5]) if len(sys.argv) > 5 else 1280; h = int(sys.argv[6]) if len(sys.argv) > 6 else 760
url = pathlib.Path(os.path.dirname(os.path.abspath(__file__)) + '/../dist/site/index.html').resolve().as_uri() + hsh
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': w, 'height': h}); pg.set_default_timeout(240000)
    q = os.environ.get('Q', 'high')
    pg.add_init_script(f"localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('{q}'))")
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='domcontentloaded'); time.sleep(3)
    if js:
        try:
            r = pg.evaluate(js)
            if r is not None: logs.append(f'eval -> {r}')
        except Exception as e: logs.append(f'EVAL ERROR: {e}')
    time.sleep(wait)
    pg.screenshot(path=out)
    for l in logs:
        if 'deprecated' not in l and 'AudioContext' not in l: print(l[:500])
    b.close()
