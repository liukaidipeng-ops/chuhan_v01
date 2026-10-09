# 拒马分镜：起一局技能对局，摆兵定格出图。用法：python3 jm.py <vp> <shots.json>
import sys, time, pathlib, os, json
from playwright.sync_api import sync_playwright
SRC = '/home/claude/chuhan_v01/source'; HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/shots'
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
G = "const $=id=>document.getElementById(id);"
def start(b, vp):
    w, h, d = {'pc': (1440, 900, 1), 'm': (390, 844, 2), 'wide': (1280, 720, 1)}[vp]
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=d); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high')); localStorage.setItem('xq3d-fx', JSON.stringify('cine'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:300]))
    pg.goto(url, wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(3)
    pg.evaluate("()=>{" + G + "$('bLocal').click();for(const [k,v] of [['v','bf'],['total','0'],['step','0']]){const b=document.querySelector(`#pCreate .seg[data-k=${k}] [data-v=\"${v}\"]`);if(b)b.click()};$('bCreateGo').click()}")
    for i in range(60):
        time.sleep(2)
        pg.evaluate("()=>{" + G + "const k=$('skip');if(k&&!k.classList.contains('hidden'))k.click();const o=$('bfTipOk');if(o&&!$('bfTip').classList.contains('hidden'))o.click()}")
        if pg.evaluate("!!document.querySelector('.pcard.active')") and i > 3: break
    time.sleep(2)
    pg.add_script_tag(content=open(HERE + '/jm.js', encoding='utf-8').read())
    pg.add_style_tag(content='body.jmclean .pcard,body.jmclean #status,body.jmclean #hud,body.jmclean .rbtns,body.jmclean #ctrl,body.jmclean #bfPanel{visibility:hidden!important}')
    return pg
if __name__ == '__main__':
    vp = sys.argv[1]; shots = json.load(open(sys.argv[2]))
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = start(b, vp)
        pg.evaluate("()=>document.body.classList.add('jmclean')")
        for s in shots:
            pg.evaluate("async (s)=>{ if (s.setup) await JM.setup(s.setup); if (s.pose) JM.pose(s.pose, s.po||{}); if (s.att) JM.attack(s.att); await JM.cam(s.cam||{}); }", s)
            time.sleep(s.get('wait', 2.5))
            if s.get('fx'): pg.evaluate("(o)=>JM.impact(o)", s['fx']); time.sleep(s.get('fxWait', 0.25))
            pg.evaluate("(s)=>JM.minus(s.minus||'', s.mo||{})", s)
            pg.screenshot(path=f"{OUT}/{vp}_{s['name']}.png"); print('shot', s['name'], flush=True)
        b.close()
