# 兵卒新模型定格：python3 shot.py → shot_duel.png、shot_turn.png、tris
import time, pathlib, os
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.abspath(H + '/../../node_modules') + '/three/build/three.min.js'
open(H + '/_t.html', 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">' + open(H + '/page.html', encoding='utf-8').read())
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.on('pageerror', lambda e: print('PAGEERROR', e, flush=True))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.goto(pathlib.Path(H + '/_t.html').as_uri()); time.sleep(4)
    for v in ['duel', 'turn']:
        pg.evaluate(f"()=>window.__view('{v}')"); time.sleep(3)
        pg.locator('canvas').screenshot(path=f'{H}/shot_{v}.png'); print('shot', v, flush=True)
    print('tris', pg.evaluate("()=>window.__tris()"), flush=True)
    b.close()
