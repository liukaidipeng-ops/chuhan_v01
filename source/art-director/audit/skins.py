import time, glob, pathlib, os
from playwright.sync_api import sync_playwright
exe = glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
url = pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()
OUT='audit'; os.makedirs(OUT, exist_ok=True)
def start(pg, skin, bf=0, models=0):
    pg.evaluate("""([skin,bf,models])=>{const X=window.__xq; localStorage.setItem('xq3d-models',JSON.stringify(models));
      X.startGame('local','r',{undo:3,total:0,step:0,hints:1,skin:skin,bf:bf,jq:0},{intro:false})}""", [skin,bf,models])
    time.sleep(7)
    pg.evaluate("()=>{const s=document.getElementById('skip'); if(s&&!s.classList.contains('hidden')) s.click()}"); time.sleep(4)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=exe, args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for name, skin, bf, models in [('wood',0,0,0),('silver',2,0,0),('gold',3,0,0),('jade',4,0,0),('bf',0,1,0),('models',0,0,1)]:
        pg = b.new_page(viewport={'width':1440,'height':900})
        pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid'))" + (";localStorage.setItem('xq3d-models','1')" if models else ""))
        pg.goto(url, wait_until='domcontentloaded')
        pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(5)
        start(pg, skin, bf, models)
        pg.screenshot(path=f'{OUT}/pc_{name}.png')
        # 近景：镜头拉近一点
        pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.55;C.target.set(0,0,2.2);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(3)
        pg.screenshot(path=f'{OUT}/pc_{name}_near.png')
        pg.close()
    b.close()
print('ok')
