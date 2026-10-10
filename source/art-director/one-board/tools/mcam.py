import sys, time
sys.argv=[sys.argv[0]]+sys.argv[1:]
exec(open('tools/shots.py').read().split('with sync_playwright')[0])
from playwright.sync_api import sync_playwright
V = [(0.45, 0.86, 0.15)]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=exe, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = open_(b, 390, 844, 2); game(pg)
    print(pg.evaluate("()=>{const C=window.__xq.Core.Cam;return [C.phi,C.radius,C.target.toArray()]}"))
    for i,(ph,rk,tz) in enumerate(V):
        pg.evaluate("([ph,rk,tz])=>{const C=window.__xq.Core.Cam;C.phi=ph;C.radius=C.fitRadius()*rk;C.target.set(0,0,0.2+tz);C.pos.copy(C.orbitPos());C.look.copy(C.target);window.__xq.Core.poke&&window.__xq.Core.poke(500)}", [ph,rk,tz]); time.sleep(4)
        pg.screenshot(path=f'{OUT}/m_camF.png')
    pg.close(); b.close()
