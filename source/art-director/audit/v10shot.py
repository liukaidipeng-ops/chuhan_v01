import time, glob, pathlib
from playwright.sync_api import sync_playwright
exe=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
base=pathlib.Path('dev2/source/dist/site/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for name,models,q in [('models',1,'mid'),('wood',0,'mid'),('woodlow',0,'low')]:
        pg=b.new_page(viewport={'width':1440,'height':900}); pg.set_default_timeout(240000)
        pg.add_init_script(f"localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('{q}'));localStorage.setItem('xq3d-models','{models}')")
        pg.on('pageerror',lambda e:print('ERR',str(e)[:200]))
        pg.goto(base+'#local'); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(8)
        pg.screenshot(path=f'v10/{name}.png')
        pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.4;C.target.set(0,0,3.4);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(4)
        pg.screenshot(path=f'v10/{name}_near.png')
        print(name, pg.evaluate("()=>{let n=0,v=0;for(const m of window.__xq.Board.pieces.values()){if(m.userData.blob){n++;if(m.userData.blob.visible)v++}}return n+' blobs, '+v+' visible'}"))
        pg.close()
    pg=b.new_page(viewport={'width':1440,'height':900}); pg.set_default_timeout(240000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('mid'))")
    pg.goto(base); pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(4)
    pg.evaluate("()=>window.__xq.startGame('local','r',{undo:3,total:0,step:0,hints:1,skin:3,bf:0,jq:0},{intro:false})"); time.sleep(10)
    pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.3;C.phi=0.95;C.target.set(0,0,3.6);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(4)
    pg.screenshot(path='v10/gold_near.png'); b.close()
