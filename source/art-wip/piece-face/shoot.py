# 宋体字面交付前自查：用打了交付补丁的构建（../fb/dist）起一局本地对局，木 / 银 / 金 / 玉各拍电脑、手机；再和 078 送审的字模逐像素比
import sys, time, pathlib, os, json, base64, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/shots'; os.makedirs(OUT, exist_ok=True)
DIST = os.environ.get('DIST', HERE + '/../fb/dist/site/index.html')
url = pathlib.Path(DIST).resolve().as_uri()
MASKS = HERE + '/../fonts/glyphs/songm/'
G = "const $=id=>document.getElementById(id);"
def start(b, vp, mode='std'):
    w, h, d = {'pc': (1440, 900, 1), 'm': (390, 844, 2)}[vp]
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=d); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s'))" % os.environ.get('Q', 'high'))
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:300], flush=True))
    pg.on('console', lambda m: m.type == 'error' and print('CONSOLE', m.text[:200], flush=True))
    pg.goto(url, wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')&&document.getElementById('loading').offsetParent===null}", timeout=300000); time.sleep(2)
    pg.evaluate("(mode)=>{" + G + "$('bLocal').click();for(const [k,v] of [['v',mode],['total','0'],['step','0']]){const b=document.querySelector(`#pCreate .seg[data-k=${k}] [data-v=\"${v}\"]`);if(b)b.click()};$('bCreateGo').click()}", mode)
    for i in range(40):
        time.sleep(2)
        pg.evaluate("()=>{" + G + "const k=$('skip');if(k&&!k.classList.contains('hidden'))k.click()}")
        if pg.evaluate("!!document.querySelector('.pcard.active')") and i > 2: break
    time.sleep(2)
    pg.add_style_tag(content='body.fclean .pcard,body.fclean #status,body.fclean .rbtns,body.fclean #ctrl{visibility:hidden!important}')
    pg.evaluate("()=>document.body.classList.add('fclean')")
    return pg
def view(pg, k):
    pg.evaluate("""(k)=>{const C=Core.Cam;C.cine=false;
      if(k==='top'){C.phi=0.0008;C.theta=C.homeTheta;C.radius=C.fitRadius()*1.06;C.target.copy(C.home0)}
      else if(k==='near'){C.phi=0.5;C.radius=C.fitRadius()*0.5;C.target.copy(C.home0);C.target.z+=2.2}
      else if(k==='nearb'){C.phi=0.5;C.radius=C.fitRadius()*0.5;C.target.copy(C.home0);C.target.z-=2.0}
      else if(k==='close'){C.phi=0.35;C.radius=C.fitRadius()*0.3;C.target.copy(C.home0);C.target.z+=2.6}
      else {C.phi=0.72;C.radius=C.fitRadius();C.target.copy(C.home0)}
      C.pos.copy(C.orbitPos());C.look.copy(C.target)}""", k)
def compare(pg):
    out = pg.evaluate("""()=>{const r={};for(const ch of '帥仕相俥傌炮兵將士象車馬砲卒'){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,512,512);g.fillStyle='#fff';g.fill(Face.path(ch,512));r[ch]=c.toDataURL()}return r}""")
    res = {}
    for ch, du in out.items():
        a = np.asarray(Image.open(io.BytesIO(base64.b64decode(du.split(',')[1]))).convert('L')).astype(float)
        m = np.asarray(Image.open(MASKS + ch + '.png').convert('L')).astype(float)
        ya, xa = [np.average(np.arange(512), weights=a.sum(ax)) for ax in (1, 0)]; ym, xm = [np.average(np.arange(512), weights=m.sum(ax)) for ax in (1, 0)]
        res[ch] = dict(diff=round(np.abs(a - m).mean(), 2), ink=round(a.sum() / m.sum(), 3), dx=round(xa - xm, 1), dy=round(ya - ym, 1))
    return res
if __name__ == '__main__':
    vp = sys.argv[1]; views = sys.argv[2].split(','); skins = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '0').split(',')]
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = start(b, vp, os.environ.get('MODE', 'std'))
        if os.environ.get('CMP'): print('cmp', json.dumps(compare(pg), ensure_ascii=False), flush=True)
        for sk in skins:
            if sk: pg.evaluate("(k)=>{Board.setSkin(k);Board.setPosition(Board.lastGame)}", sk); time.sleep(3)
            for v in views:
                view(pg, v); time.sleep(1.5)
                pg.screenshot(path=f'{OUT}/{vp}_{v}_s{sk}' + os.environ.get('TAG', '') + '.png'); print('shot', vp, v, sk, flush=True)
        b.close()
