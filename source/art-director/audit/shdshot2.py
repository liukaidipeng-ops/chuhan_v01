import time, glob, pathlib, sys
from playwright.sync_api import sync_playwright
exe=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
base=pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()+'?shd='+sys.argv[1]; tag='v'+sys.argv[1]
VP={'pc':(1440,900,1),'m':(390,844,2)}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for q in ['high','low']:
        for vp in ['pc','m']:
            w,h,d=VP[vp]; pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=d); pg.set_default_timeout(240000)
            pg.add_init_script(f"localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('{q}'))")
            pg.goto(base+'#local',wait_until='domcontentloaded'); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(6)
            pg.screenshot(path=f'shd/{tag}_{vp}_{q}.png')
            pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.4;C.target.set(0,0,3.4);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(3)
            pg.screenshot(path=f'shd/{tag}_{vp}_{q}_near.png'); pg.close()
    b.close()
