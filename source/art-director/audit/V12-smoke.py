import time,glob,pathlib,sys
from playwright.sync_api import sync_playwright
url=pathlib.Path('dev2/source/dist/site/index.html').resolve().as_uri()+'#local'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for force in [False, True]:
        pg=b.new_page(viewport={'width':1440,'height':900}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:150]))
        if force: pg.add_init_script("Object.defineProperty(CanvasRenderingContext2D.prototype,'filter',{get(){return 'none'},set(v){},configurable:true})")
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('mid'))")
        pg.set_default_timeout(240000); pg.goto(url, timeout=240000); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(8)
        pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.3;C.phi=0.95;C.target.set(0,0,3.6);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(4)
        pg.screenshot(path=f'v12_{"nofilter" if force else "filter"}.png'); print(force, errs); pg.close()
    b.close()
