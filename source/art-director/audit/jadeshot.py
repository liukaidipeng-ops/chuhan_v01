import time, glob, pathlib, sys
from playwright.sync_api import sync_playwright
exe=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
base=pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for v in sys.argv[1].split(','):
        pg=b.new_page(viewport={'width':1440,'height':900}); pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('mid'))")
        pg.goto(base+f'?jadev={v}',wait_until='domcontentloaded')
        pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(4)
        pg.evaluate("()=>window.__xq.startGame('local','r',{undo:3,total:0,step:0,hints:1,skin:4,bf:0,jq:0},{intro:false})"); time.sleep(8)
        pg.evaluate("()=>{const s=document.getElementById('skip');if(s&&!s.classList.contains('hidden'))s.click()}"); time.sleep(3)
        pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.42;C.target.set(0,0,3.2);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(4)
        pg.screenshot(path=f'jade/v{v}.png')
        pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.target.set(0,0,-3.2);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(4)
        pg.screenshot(path=f'jade/v{v}b.png'); pg.close()
    b.close()
