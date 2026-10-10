# 升级变身特效：逐帧出图。用法：python3 uf.py <kinds> <lv> <frames> [tag]
import sys, time, os, json
UF = HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/frames'; os.makedirs(OUT, exist_ok=True)
src = open(HERE + '/../jm/jm.py').read().split("if __name__")[0].replace("HERE = os.path.dirname(os.path.abspath(__file__))", "HERE = '" + HERE + "/../jm'")
exec(src)
kinds = sys.argv[1].split(','); lv = int(sys.argv[2]); n = int(sys.argv[3]); tag = sys.argv[4] if len(sys.argv) > 4 else ''
ts = [i / (n - 1) for i in range(n)] if n > 1 else [0.5]
CAM = json.loads(os.environ.get('CAM', '{}'))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide'); pg.evaluate("()=>document.body.classList.add('jmclean')")
    pg.add_script_tag(content=open(UF + '/upfx.js', encoding='utf-8').read())
    for k in kinds:
        print('setup', pg.evaluate("([k,lv])=>JSON.stringify(UPFX.setup({kind:k,lv,t:'p',i:2}))", [k, lv]), flush=True)
        pg.evaluate("(c)=>UPFX.cam(c)", CAM); time.sleep(1.5)
        for i, t in enumerate(ts):
            pg.evaluate("(t)=>UPFX.set(t)", t); time.sleep(0.35 if i else 1.0)
            pg.screenshot(path=f'{UF}/frames/{k}{lv}{tag}_{i:03d}.png', clip={'x': 240, 'y': 60, 'width': 800, 'height': 600})
        print('done', k, flush=True)
    b.close()
