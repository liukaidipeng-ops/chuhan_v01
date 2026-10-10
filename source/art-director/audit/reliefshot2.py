import time, glob, pathlib, sys
from playwright.sync_api import sync_playwright
exe=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
base=pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()
skins=sys.argv[2].split(',') if len(sys.argv)>2 else ['0','3']
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for v in sys.argv[1].split(','):
        for sk in skins:
            pg=b.new_page(viewport={'width':1440,'height':900}); pg.set_default_timeout(240000)
            pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('mid'))")
            pg.on('pageerror',lambda e:print('ERR',str(e)[:200]))
            pg.goto(base+f'?relief={v}&shd=3',wait_until='domcontentloaded')
            pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(4)
            pg.evaluate(f"()=>window.__xq.startGame('local','r',{{undo:3,total:0,step:0,hints:1,skin:{sk},bf:0,jq:0}},{{intro:false}})"); time.sleep(8)
            pg.evaluate("()=>{const s=document.getElementById('skip');if(s&&!s.classList.contains('hidden'))s.click()}"); time.sleep(3)
            pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.3;C.phi=0.95;C.target.set(0,0,3.6);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(4)
            pg.screenshot(path=f'r2/r{v}_s{sk}.png'); pg.close()
    b.close()
