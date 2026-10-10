import time,glob,pathlib,sys
from playwright.sync_api import sync_playwright
url=pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()+'#local'
css=open('ban/ban.css').read()
VP={'pc':(1440,900,1),'m':(390,844,2)}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for vp in ['pc','m']:
        w,h,d=VP[vp]; pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=d); pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('low'))")
        pg.goto(url); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(4)
        pg.add_style_tag(content=css)
        for v in ['', 'vB', 'vC']:
            pg.evaluate("""(v)=>{const B=document.getElementById('banner');B.className='';void B.offsetWidth;
              document.getElementById('bannerT').textContent='楚汉相争';document.getElementById('bannerS').textContent='技能模式 · 红方先行';
              if(v)B.classList.add(v);B.classList.add('on')}""", v)
            frames=[]
            for t in [0.15,0.4,0.7,2.0]:
                time.sleep(t-(sum([0.15,0.4,0.7,2.0][:[0.15,0.4,0.7,2.0].index(t)]) if False else 0) if False else 0)
            t0=time.time()
            for t in [0.15,0.45,0.8,2.0]:
                dt=t-(time.time()-t0)
                if dt>0: time.sleep(dt)
                pg.screenshot(path=f'ban/{vp}_{v or "now"}_{int(t*100)}.png')
            pg.evaluate("()=>document.getElementById('banner').classList.remove('on')"); time.sleep(1)
        pg.close()
    b.close()
