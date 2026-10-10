import time,glob,pathlib,os,sys
from playwright.sync_api import sync_playwright
url=pathlib.Path('endc/before.html').resolve().as_uri()
XCSS=os.environ.get('XCSS'); TAG=os.environ.get('TAG','now')
VP={'pc':(1440,900,1),'m':(390,844,2)}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for vp in ['m','pc']:
        w,h,d=VP[vp]; pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=d); pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('low'))")
        pg.goto(url); pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(3)
        if XCSS: pg.add_style_tag(path=XCSS)
        for t in ['pic','snd','etc']:
            pg.evaluate("(t)=>{document.getElementById('bSetL').click();document.querySelector('#setTabs [data-t='+t+']').click();const s=document.querySelector('#mSet .scroll');s.scrollTop=99999}", t); time.sleep(1)
            pg.screenshot(path=f'set/{vp}_{TAG}_{t}.png')
        pg.close()
    b.close()
