# 血条样图：技能对局中局，各方案在手机 / 电脑、沙盘 / 俯瞰下截图
import sys, time, pathlib, os, json
from playwright.sync_api import sync_playwright
SRC = '/home/claude/chuhan_v01/source'; HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/shots'
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
G = "const $=id=>document.getElementById(id);"
JS = open(HERE + '/hp.js', encoding='utf-8').read()
def start(b, vp):
    w, h, d = {'pc': (1440, 900, 1), 'm': (390, 844, 2)}[vp]
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=d); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s'))" % ('mid' if vp == 'm' else 'high'))
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:300]))
    pg.goto(url, wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(3)
    pg.evaluate("()=>{" + G + "$('bLocal').click();for(const [k,v] of [['v','bf'],['total','0'],['step','0']]){const b=document.querySelector(`#pCreate .seg[data-k=${k}] [data-v=\"${v}\"]`);if(b)b.click()};$('bCreateGo').click()}")
    for i in range(60):
        time.sleep(2)
        pg.evaluate("()=>{" + G + "const k=$('skip');if(k&&!k.classList.contains('hidden'))k.click();const o=$('bfTipOk');if(o&&!$('bfTip').classList.contains('hidden'))o.click()}")
        if pg.evaluate("!!document.querySelector('.pcard.active')") and i > 3: break
    time.sleep(3)
    pg.add_script_tag(content=JS)
    pg.evaluate("()=>{" + G + "const o=$('bfTipOk');if(o)o.click();HP.setup()}")
    return pg
def view(pg, k):
    pg.evaluate("""(k)=>{const C=Core.Cam;C.cine=false;
      if(k==='top'){C.phi=0.0008;C.theta=C.homeTheta;C.radius=C.fitRadius()*1.06;C.target.copy(C.home0)}
      else if(k==='near'){C.phi=0.62;C.radius=C.fitRadius()*0.62;C.target.copy(C.home0);C.target.z+=0.4}
      else {C.phi=0.72;C.radius=C.fitRadius();C.target.copy(C.home0)}
      C.pos.copy(C.orbitPos());C.look.copy(C.target)}""", k)
if __name__ == '__main__':
    vps = sys.argv[1].split(','); sts = sys.argv[2].split(','); views = sys.argv[3].split(',') if len(sys.argv) > 3 else ['def', 'top']
    opt = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    tag = sys.argv[5] if len(sys.argv) > 5 else ''
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for vp in vps:
            pg = start(b, vp)
            for v in views:
                view(pg, v); time.sleep(0.8)
                for st in sts:
                    o = opt.get(st, opt.get('*', {}))
                    pg.evaluate("([s,o])=>HP.style(s,o)", [st, o]); time.sleep(1.2)
                    pg.screenshot(path=f'{OUT}/{vp}_{v}_{st}{tag}.png')
            pg.close()
        b.close()
