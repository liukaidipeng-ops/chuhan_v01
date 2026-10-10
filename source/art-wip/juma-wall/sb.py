# H29 分镜出图：python3 sb.py <shots.json>；每一镜一段 js（在页面里跑），等一会儿截图
import sys, time, os, json
sys.path.insert(0, '/home/claude/chuhan_v01/source/art-wip/juma')
import jm
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
shots = json.load(open(sys.argv[1]))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = jm.start(b, 'wide')
    pg.add_script_tag(content=open('/home/claude/chuhan_v01/source/src/juma.js', encoding='utf-8').read())
    pg.add_script_tag(content=open(HERE + '/sb.js', encoding='utf-8').read())
    pg.evaluate("()=>document.body.classList.add('jmclean')")
    pg.add_style_tag(content='#skillBar,.sbar,#rside,.rside,#tools,.tools{visibility:hidden!important}')
    for s in shots:
        for step in s['js'] if isinstance(s['js'], list) else [s['js']]:
            if isinstance(step, (int, float)): time.sleep(step); continue
            pg.evaluate("async ()=>{" + step + "}")
        time.sleep(s.get('wait', 1.5))
        pg.screenshot(path=f"{HERE}/shots/{s['name']}.png"); print('shot', s['name'], flush=True)
    b.close()
