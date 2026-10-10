import time, pathlib, sys, os, json
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.abspath(H + '/../../node_modules') + '/three/build/three.min.js'
open(H + '/_t.html', 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8>' + open(H + '/page_5s.html', encoding='utf-8').read())
scen, times, expr = sys.argv[1], [float(x) for x in sys.argv[2].split(',')], sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.add_init_script("(()=>{let T=0;performance.now=()=>T;})()")
    pg.goto(pathlib.Path(H + '/_t.html').as_uri()); time.sleep(2)
    pg.click('[data-r="0"]'); pg.evaluate(f"()=>window.__scen('{scen}')")
    for tt in times:
        pg.evaluate("(tt)=>{let k=0;while(window.__dbg().t<tt&&k++<2000)window.__step(0.01)}", tt)
        print(tt, pg.evaluate(expr))
    b.close()
