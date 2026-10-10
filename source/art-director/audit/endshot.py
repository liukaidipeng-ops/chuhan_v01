import time,glob,pathlib,sys
from playwright.sync_api import sync_playwright
VP={'pc':(1440,900,1),'m':(390,844,2)}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for tag in ['before','after']:
        url=pathlib.Path(f'endc/{tag}.html').resolve().as_uri()+'#local'
        for vp in ['pc','m']:
            w,h,d=VP[vp]; pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=d); pg.set_default_timeout(240000)
            pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('low'))")
            pg.on('pageerror',lambda e:print('ERR',str(e)[:200]))
            pg.goto(url); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(3)
            if tag=='after': pg.add_style_tag(path='endc/after.css')
            for k,res in [('slain',"{winner:'r',loser:'b',reason:'kingdead'}"),('r',"{winner:'b',loser:'r',reason:'mate'}")]:
                pg.evaluate("()=>{try{window.__xq.Ending.hideCard()}catch(e){}}")
                pg.evaluate(f"()=>{{window.__xq.Ending.play({res},{{instant:true}})}}"); time.sleep(5.5)
                pg.screenshot(path=f'endc/{vp}_{tag}_{k}.png')
            pg.close()
    b.close()
