# 自查：本地起页面（三维库从仓库 node_modules 里给），拍几个时刻
import time, pathlib, sys, os
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.abspath(H + '/../../node_modules') + '/three/build/three.min.js'
html = '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width">' + open(H + '/page.html', encoding='utf-8').read()
open(H + '/_t.html', 'w', encoding='utf-8').write(html)
scen = sys.argv[1] if len(sys.argv) > 1 else 'hurt'; times = [float(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '0.6,0.95,1.1,1.6,2.4').split(',')]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1200, 'height': 1100})
    pg.on('pageerror', lambda e: print('PAGEERROR', e)); pg.on('console', lambda m: print('CONSOLE', m.text[:200]))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    # 时钟换成可控的：页面用 performance.now 算帧间隔
    pg.add_init_script("(()=>{let T=0;window.__setT=v=>{T=v};performance.now=()=>T;const r=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>r(()=>f(T));})()")
    pg.goto(pathlib.Path(H + '/_t.html').as_uri() + os.environ.get('Q', '')); time.sleep(3)
    pg.click('[data-r="0"]'); time.sleep(0.3); pg.evaluate(f"()=>window.__scen('{scen}')"); pg.evaluate("()=>window.__reset()"); cur = 0.0
    for tt in times:
        n = 0
        pg.evaluate("(tt)=>{let k=0;while(window.__dbg().t<tt&&k++<2000)window.__step(0.01)}", tt)
        time.sleep(0.3)
        pg.locator('canvas').screenshot(path=f'{H}/chk_{scen}_{tt}.png'); print('shot', tt, flush=True)
    b.close()
