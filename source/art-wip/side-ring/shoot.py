# 金银棋面加色圈三方案：本地对局里把棋子换成银（再换金），一枚汉兵近景，A / B / C 各拍一张；再拍一张对局视角里汉楚两边对照
import sys, time, os, json, pathlib
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/shots'; os.makedirs(OUT, exist_ok=True)
DIST = HERE + '/../fb/dist/site/index.html'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 900}); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:300], flush=True))
    pg.goto(pathlib.Path(DIST).resolve().as_uri() + '#local', wait_until='domcontentloaded')
    pg.wait_for_function("()=>window.__xq&&__xq.started&&__xq.game&&!__xq.busy", timeout=300000); time.sleep(3)
    pg.add_style_tag(content='.pcard,#status,.rbtns,#ctrl,#toast,.toast,#skip,#hud{visibility:hidden!important}.cinebar{height:0!important}')
    def cam(f, r, d, el, az=0):
        pg.evaluate("""([f,r,d,el,az])=>{const B=__xq.Board,C=__xq.Core.Cam,b=B.pos(f,r);const P=new THREE.Vector3(b.x+Math.sin(az)*Math.cos(el)*d,b.y+Math.sin(el)*d,b.z+Math.cos(az)*Math.cos(el)*d),L=new THREE.Vector3(b.x,b.y+0.1,b.z);
          if(!window.__hook){window.__hook=1;__xq.Core.addHook(()=>{if(window.__P){C.cine=true;C.pos.copy(window.__P);C.look.copy(window.__L)}})}window.__P=P;window.__L=L}""", [f, r, d, el, az])
    for skin in [int(x) for x in os.environ.get('SK', '2,3').split(',')]:
        for rs in ['', 'A', 'B', 'C']:
            pg.evaluate("([k,rs])=>{window.__RING=rs;__xq.Board.setSkin(k);__xq.Board.setPosition(__xq.Board.lastGame)}", [skin, rs]); time.sleep(2.5)
            cam(4, 3, float(os.environ.get('D', 3.2)), 1.0, 0); time.sleep(2)
            pg.screenshot(path=f'{OUT}/s{skin}_{rs or "0"}.png', clip={'x': 250, 'y': 250, 'width': 400, 'height': 400}); print('shot', skin, rs, flush=True)
            if skin == 2 and os.environ.get('BOARD'):
                cam(4, 4.5, 9.5, 1.0, 0); time.sleep(2)   # 对局视角：整盘
                pg.screenshot(path=f'{OUT}/board_{rs or "0"}.png'); print('board', rs, flush=True)
    b.close()
