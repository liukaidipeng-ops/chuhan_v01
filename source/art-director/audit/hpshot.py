import time, glob, pathlib, sys
from playwright.sync_api import sync_playwright
exe=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
base=pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()
VP={'pc':(1440,900,1),'m':(390,844,2)}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for v in sys.argv[1].split(','):
        for vp in ['pc','m']:
            w,h,d=VP[vp]; pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=d); pg.set_default_timeout(240000)
            pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('mid'))")
            pg.on('pageerror',lambda e:print('ERR',str(e)[:200]))
            pg.goto(base+f'?hpd={v}#bf',wait_until='domcontentloaded')
            pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(6)
            pg.evaluate("()=>{const s=document.getElementById('skip');if(s&&!s.classList.contains('hidden'))s.click();const o=document.getElementById('bfTipOk');if(o)o.click()}"); time.sleep(2)
            pg.evaluate("""()=>{const X=window.__xq,g=X.game;let i=0;for(const row of g.board)for(const p of row){if(!p)continue;if(p.s==='r'&&p.t!=='k'){p.lv=2+(i%3);p.hp=Math.max(1,X.BF.hpOf(p.t,p.lv)-(i%2));i++}}
              X.Board.syncPosition(g)}"""); time.sleep(3)
            pg.screenshot(path=f'hp/{vp}_d{v}.png')
            pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.4;C.target.set(0,0,3.4);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(3)
            pg.screenshot(path=f'hp/{vp}_d{v}_near.png'); pg.close()
    b.close()
