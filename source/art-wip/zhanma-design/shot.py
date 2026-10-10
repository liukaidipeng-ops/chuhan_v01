import time, pathlib, os
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.abspath(H + '/../../node_modules') + '/three/build/three.min.js'
open(H + '/_t.html', 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">' + open(H + '/index.html', encoding='utf-8').read())
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1280, 'height': 900}, device_scale_factor=2)
    pg.on('pageerror', lambda e: print('PAGEERROR', e)); pg.on('console', lambda m: m.type == 'error' and print('CONSOLE', m.text[:200]))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.goto(pathlib.Path(H + '/_t.html').as_uri()); time.sleep(4)
    pg.click('#spin'); time.sleep(0.5)
    for i, tt in enumerate([0, 3.5, 7, 10.5]):
        pg.evaluate(f"()=>window.__setT({tt})"); time.sleep(1.5)
        pg.screenshot(path=f'{H}/shot{i}.png', full_page=True); print('shot', i, flush=True)
    b.close()
