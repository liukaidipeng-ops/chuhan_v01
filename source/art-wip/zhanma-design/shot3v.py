import time, pathlib, os
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.abspath(H + '/../../node_modules') + '/three/build/three.min.js'
open(H + '/_t.html', 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">' + open(H + '/index.html', encoding='utf-8').read())
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1280, 'height': 900}, device_scale_factor=2)
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.goto(pathlib.Path(H + '/_t.html').as_uri()); time.sleep(4)
    for nm, r in [('front', 0), ('side', 1.5708), ('back', 3.1416), ('q', 0.6)]:
        pg.evaluate(f"()=>{{window.__rot={r}}}"); time.sleep(1.5)
        pg.locator('#cv_a').screenshot(path=f'{H}/zmA_{nm}.png'); print('shot', nm, flush=True)
    b.close()
