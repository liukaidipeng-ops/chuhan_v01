# 楚战象分级造型：python3 el.py a,b,c  → shots/plan_<x>_<cam>.png
import sys, time, os
EH = os.path.dirname(os.path.abspath(__file__))
src = open(EH + '/../juma/jm.py').read().split("if __name__")[0].replace("SRC = '/home/claude/chuhan_v01/source'", "SRC = '" + os.path.abspath(EH + '/../..') + "'").replace("HERE = os.path.dirname(os.path.abspath(__file__))", "HERE = '" + EH + "/../juma'")
exec(src)
plans = sys.argv[1].split(',')
os.makedirs(EH + '/shots', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide'); pg.evaluate("()=>document.body.classList.add('jmclean')")
    pg.add_script_tag(content=open(EH + '/eld.js', encoding='utf-8').read())
    for pl in plans:
        pg.evaluate("(p)=>ELD.lineup(p)", pl); time.sleep(1)
        for nm, c in [('front', {'d': 6.2, 'el': 0.28, 'az': 0.25}), ('side', {'d': 5.8, 'el': 0.2, 'az': -0.75})]:
            pg.evaluate("(c)=>ELD.cam(c)", c); time.sleep(2.5)
            pg.screenshot(path=f'{EH}/shots/plan_{pl}_{nm}.png'); print('shot', pl, nm, flush=True)
    b.close()
