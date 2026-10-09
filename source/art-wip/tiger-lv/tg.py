# 虎骑造型 + 死法：python3 tg.py <what> ；what = lineup | blast | fall（可逗号分隔）
import sys, time, os, json
TGH = os.path.dirname(os.path.abspath(__file__))
src = open(TGH + '/../jm/jm.py').read().split("if __name__")[0].replace("HERE = os.path.dirname(os.path.abspath(__file__))", "HERE = '" + TGH + "/../jm'")
exec(src)
what = sys.argv[1].split(','); n = int(sys.argv[2]) if len(sys.argv) > 2 else 6; lv = int(os.environ.get('LV', '2'))
os.makedirs(TGH + '/shots', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide'); pg.evaluate("()=>document.body.classList.add('jmclean')")
    pg.add_script_tag(content=open(TGH + '/tiger2.js', encoding='utf-8').read() + "\nwindow.TigerLV = TigerLV;")
    pg.add_script_tag(content=open(TGH + '/tgd.js', encoding='utf-8').read())
    for w in what:
        if w == 'lineup':
            pg.evaluate("()=>TGD.lineup()"); time.sleep(1)
            for nm, c in [('front', {'d': 4.4, 'el': 0.3, 'az': 0.0}), ('high', {'d': 5.0, 'el': 0.75, 'az': 0.35}), ('side', {'d': 4.6, 'el': 0.25, 'az': -0.9})]:
                pg.evaluate("(c)=>TGD.cam(c)", c); time.sleep(2.5)
                pg.screenshot(path=f'{TGH}/shots/lineup_{nm}.png'); print('shot', nm, flush=True)
        else:
            pg.evaluate("([k,lv])=>TGD.stage({kind:k,lv})", [w, lv]); time.sleep(1)
            cam = json.loads(os.environ.get('CAM', '{"d":2.5,"el":0.3,"az":0.35,"lh":0.28}'))
            pg.evaluate("(c)=>TGD.cam(c)", cam); time.sleep(2)
            for i in range(n):
                t = i / (n - 1)
                pg.evaluate("(t)=>TGD.set(t)", t); time.sleep(0.5 if i else 1.2)
                pg.screenshot(path=f'{TGH}/shots/{w}{lv}_{i:03d}.png'); print('shot', w, i, flush=True)
    b.close()
