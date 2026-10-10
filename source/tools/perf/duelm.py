import time, pathlib, sys
from playwright.sync_api import sync_playwright
S = sys.argv[1]; THREE = '/home/user/chuhan_v01/source/node_modules/three/build/three.min.js'
open(S + '/duel/_t.html', 'w', encoding='utf-8').write('<!doctype html><meta charset=utf-8>' + open(S + '/duel/page.html', encoding='utf-8').read())
HOOK = """(() => { window.__gl = { calls: 0, tris: 0 }; for (const P of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
  const de = P.drawElements, da = P.drawArrays, dei = P.drawElementsInstanced, dai = P.drawArraysInstanced;
  P.drawElements = function (m, c, t, o) { __gl.calls++; if (m === 4) __gl.tris += c / 3; return de.apply(this, arguments); };
  P.drawArrays = function (m, f, c) { __gl.calls++; if (m === 4) __gl.tris += c / 3; return da.apply(this, arguments); };
  if (dei) P.drawElementsInstanced = function (m, c, t, o, n) { __gl.calls++; if (m === 4) __gl.tris += c / 3 * n; return dei.apply(this, arguments); };
  if (dai) P.drawArraysInstanced = function (m, f, c, n) { __gl.calls++; if (m === 4) __gl.tris += c / 3 * n; return dai.apply(this, arguments); };
} })()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE, content_type='application/javascript'))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    pg.add_init_script("(()=>{let T=0;performance.now=()=>T;})()"); pg.add_init_script(HOOK)
    pg.goto(pathlib.Path(S + '/duel/_t.html').as_uri()); time.sleep(2)
    pg.click('[data-r="0"]')
    for sc in ['2v2', '3v3']:
        pg.evaluate(f"()=>window.__scen('{sc}')")
        for tt in [0.5, 2.0, 4.0]:
            pg.evaluate("(tt)=>{let k=0;while(window.__dbg().t<tt&&k++<2000)window.__step(0.01)}", tt)
            time.sleep(0.6)   # 让页面自己画几帧（暂停中照样在画）
            pg.evaluate("__gl.calls = 0; __gl.tris = 0"); 
            n0 = pg.evaluate("new Promise(r => requestAnimationFrame(() => { __gl.calls = 0; __gl.tris = 0; requestAnimationFrame(() => r([__gl.calls, Math.round(__gl.tris)])); }))")
            print(sc, tt, '每帧绘制', n0[0], '三角形', n0[1])
    b.close()
