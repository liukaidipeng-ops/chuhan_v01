# 楚战象分级造型：python3 el.py a,b,c  → shots/plan_<x>_<cam>.png
import sys, time, os
EH = os.path.dirname(os.path.abspath(__file__))
src = open(EH + '/../juma/jm.py').read().split("if __name__")[0].replace("SRC = '/home/claude/chuhan_v01/source'", "SRC = '" + os.path.abspath(EH + '/../..') + "'").replace("HERE = os.path.dirname(os.path.abspath(__file__))", "HERE = '" + EH + "/../juma'")
exec(src)
plans = sys.argv[1].split(',')
os.makedirs(EH + '/shots', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide'); pg.evaluate("()=>document.body.classList.add('jmclean')"); pg.add_style_tag(content='.cinebar{height:0!important}')
    pg.add_script_tag(content=open(EH + '/eld.js', encoding='utf-8').read())
    for pl in plans:
        pg.evaluate("(p)=>ELD.lineup(p)", pl); time.sleep(1)
        for nm, c in [('front', {'d': 5.6, 'el': 0.22, 'az': 0.15, 'lh': 0.45}), ('back', {'d': 5.6, 'el': 0.22, 'az': 3.4, 'lh': 0.45}), ('side', {'d': 6.4, 'el': 0.2, 'az': 1.75, 'lh': 0.45}), ('hero', {'d': 3.6, 'el': 0.2, 'az': 0.6, 'lx': 2.55, 'lh': 0.85}), ('hero_back', {'d': 3.4, 'el': 0.25, 'az': 3.75, 'lx': 2.55, 'lh': 0.85}), ('back2', {'d': 3.0, 'el': 0.22, 'az': 3.75, 'lx': -0.85, 'lh': 0.7})] + [('top%d' % (i + 1), {'d': 2.3 + i * 0.25, 'el': 0.7, 'az': 3.6, 'lx': (i - 1.5) * 1.7, 'lh': 0.95 + i * 0.08}) for i in range(4)]:
            if os.environ.get('ONLY') and nm not in os.environ['ONLY'].split(','): continue
            pg.evaluate("(c)=>ELD.cam(c)", c); time.sleep(2.5)
            pg.screenshot(path=f'{EH}/shots/plan_{pl}_{nm}.png'); print('shot', pl, nm, flush=True)
    b.close()
