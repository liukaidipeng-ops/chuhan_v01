"""逐步走子测试：python3 tools/movetest.py level [moves-json]  （打印每步耗时与报错；AUDIO=1 开声音）"""
import sys, time, pathlib, os, json
from playwright.sync_api import sync_playwright
lv = sys.argv[1] if len(sys.argv) > 1 else 'cine'
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
url = pathlib.Path(D + '/dist/site/index.html').resolve().as_uri() + '#local'
seq = [[[4,3],[4,4]],[[4,6],[4,5]],[[1,0],[2,2]],[[1,9],[2,7]],[[0,0],[0,1]],[[0,9],[0,8]],[[2,0],[4,2]],[[2,9],[4,7]],[[3,0],[4,1]],[[3,9],[4,8]],[[4,0],[3,0]],[[4,9],[3,9]],[[1,2],[1,6]],[[7,7],[7,3]],[[4,4],[4,5]],[[4,7],[6,5]]]
if len(sys.argv) > 2: seq = json.loads(sys.argv[2])
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 400}); pg.set_default_timeout(120000)
    na = '' if os.environ.get('AUDIO') else "localStorage.setItem('xq3d-noaudio','1');"
    pg.add_init_script(na + "localStorage.setItem('xq3d-quality', JSON.stringify('low'));")
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='domcontentloaded'); time.sleep(4)
    pg.evaluate(f"(()=>{{const x=window.__xq; x.opts.step=0; x.opts.total=0; x.Core.Time.scale=4; x.Fx.level='{lv}'; x.Fx.gore=3; try{{Sfx.init()}}catch(e){{}} }})()")
    for a, bb in seq:
        t0 = time.time()
        ok = pg.evaluate(f"window.__xq.doMove({{from:{a},to:{bb}}})")
        while time.time() - t0 < 150:
            time.sleep(0.5)
            if pg.evaluate('window.__xq.busy') == 0: break
        busy = pg.evaluate('window.__xq.busy')
        print(f'{a}->{bb} ok={ok} {time.time()-t0:.1f}s busy={busy}', flush=True)
        while logs: print('   ', logs.pop(0)[:300], flush=True)
    pg.screenshot(path=D + '/shots/movetest.png')
    b.close()
