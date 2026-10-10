import sys, time, pathlib, os, glob
from playwright.sync_api import sync_playwright
SRC='dev/source'; OUT='ana'; XCSS=os.environ.get('XCSS'); TAG=os.environ.get('TAG','now')
url=pathlib.Path(SRC+'/dist/site/index.html').resolve().as_uri()+'#local'
VP={'pc':(1440,900,1),'m':(390,844,2)}
PLAY="""async()=>{const X=window.__xq,g=X.game;for(let n=0;n<14;n++){const ms=[];for(let f=0;f<9;f++)for(let r=0;r<10;r++){const p=g.at(f,r);if(p&&p.s===g.turn)ms.push(...g.legalFrom(f,r))}
 ms.sort((a,b)=>(a.to[0]*7+a.to[1]*3+n)%11-(b.to[0]*7+b.to[1]*3+n)%11);X.doMove(ms[0]);await new Promise(r=>setTimeout(r,700))}}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for vp in sys.argv[1].split(','):
        w,h,d=VP[vp]; pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=d); pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('low'))")
        pg.on('pageerror',lambda e:print(vp,'ERR',str(e)[:200]))
        pg.goto(url); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(3)
        try: pg.evaluate(PLAY)
        except Exception as e: print('play',e)
        pg.evaluate("()=>{window.__xq.finishGame&&0}")
        pg.evaluate("()=>window.__xq.anaOpen()"); time.sleep(2)
        for i in range(60):
            t=pg.evaluate("()=>document.getElementById('anaProg').textContent")
            if not t or '分析' not in t: break
            time.sleep(2)
        print(vp,'prog',repr(t))
        if XCSS: pg.add_style_tag(content=open(XCSS).read())
        time.sleep(1); pg.screenshot(path=f'{OUT}/{vp}_{TAG}_list.png')
        pg.evaluate("()=>window.__xq.anaPick(5)"); time.sleep(2.5); pg.screenshot(path=f'{OUT}/{vp}_{TAG}_pick.png')
        pg.close()
    b.close()
