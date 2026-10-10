import time, pathlib, sys, os, json
scen = sys.argv[1] if len(sys.argv) > 1 else 'hurt'; N = int(float(sys.argv[2]) / 0.02) if len(sys.argv) > 2 else 150
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.abspath(H + '/../../node_modules') + '/three/build/three.min.js'
html = '<!doctype html><meta charset=utf-8>' + open(H + '/page.html', encoding='utf-8').read()
open(H + '/_t.html', 'w', encoding='utf-8').write(html)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 480, 'height': 270})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.add_init_script("(()=>{let T=0;performance.now=()=>T;const r=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>r(()=>f(T));})()")
    pg.goto(pathlib.Path(H + '/_t.html').as_uri()); time.sleep(2)
    pg.click('[data-r="0"]'); pg.evaluate(f"()=>window.__scen('{scen}')"); pg.evaluate("()=>window.__reset()")
    rows = pg.evaluate("(N)=>{const o=[];for(let i=0;i<N;i++){window.__step(0.02);o.push(window.__geo())}return o}", N)
    for r in rows: print(json.dumps(r, ensure_ascii=False))
    b.close()
