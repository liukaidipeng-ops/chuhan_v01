# 第 1、2、4 条：同一局、同一镜头，拍改前 / 改后（改后只在页面里临时套样式、重画河界字，不改代码）
import time, glob, pathlib, os, sys
from playwright.sync_api import sync_playwright
exe = glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
url = pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()
OUT='fix124'; os.makedirs(OUT, exist_ok=True)
CSS1 = open('tools/fix1.css').read()
CSS4 = open('tools/fix4.css').read()
RIVER = open('tools/fix2.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=exe, args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':int(sys.argv[1]) if len(sys.argv)>1 else 1440,'height':int(sys.argv[2]) if len(sys.argv)>2 else 900})
    pg.set_default_timeout(240000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid'))")
    pg.goto(url, wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(5)
    pg.evaluate("()=>window.__xq.startGame('local','r',{undo:3,total:0,step:0,hints:1,skin:0,bf:1,jq:0},{intro:false})"); time.sleep(7)
    pg.evaluate("()=>{const s=document.getElementById('skip'); if(s&&!s.classList.contains('hidden')) s.click(); const o=document.getElementById('bfTipOk'); if(o&&!document.getElementById('bfTip').classList.contains('hidden')) o.click()}"); time.sleep(4)
    pg.screenshot(path=f'{OUT}/before_{sys.argv[1] if len(sys.argv)>1 else 1440}.png')
    pg.add_style_tag(content=CSS1); pg.add_style_tag(content=CSS4); time.sleep(.5)
    pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=1.06;C.target.z+=0.45;C.pos.copy(C.orbitPos());C.look.copy(C.target)}")
    pg.evaluate('()=>{window.__RF=60;window.__RDY=-24;'+RIVER+'}'); time.sleep(2.5)
    pg.screenshot(path=f'{OUT}/after_{sys.argv[1] if len(sys.argv)>1 else 1440}.png')
    b.close()
print('ok')
