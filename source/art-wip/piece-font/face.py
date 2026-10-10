# 木棋子字面：起一局本地普通对局，拉近看汉方，换字面贴图出图
import sys, time, pathlib, os, json
from playwright.sync_api import sync_playwright
SRC = '/home/claude/chuhan_v01/source'; HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/shots'
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
G = "const $=id=>document.getElementById(id);"
def start(b, vp):
    w, h, d = {'pc': (1440, 900, 1), 'm': (390, 844, 2), 'big': (1600, 1000, 1.5)}[vp]
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=d); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s'))" % os.environ.get('Q', 'high'))
    if os.environ.get('KAI'):
        css = open(HERE + '/kai.css').read().replace('`', '')
        pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent=`" + css + "`;document.head.appendChild(st);document.fonts.load('bold 300px KaiTi','兵卒炮砲俥車傌馬相象仕士帥將').then(f=>console.log('kai',f.length))})")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:300]))
    pg.goto(url, wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')&&document.getElementById('loading').offsetParent===null}", timeout=300000); time.sleep(2)
    pg.evaluate("()=>{" + G + "$('bLocal').click();for(const [k,v] of [['v','std'],['total','0'],['step','0']]){const b=document.querySelector(`#pCreate .seg[data-k=${k}] [data-v=\"${v}\"]`);if(b)b.click()};$('bCreateGo').click()}")
    for i in range(40):
        time.sleep(2)
        pg.evaluate("()=>{" + G + "const k=$('skip');if(k&&!k.classList.contains('hidden'))k.click()}")
        if pg.evaluate("!!document.querySelector('.pcard.active')") and i > 2: break
    time.sleep(2)
    return pg
def view(pg, k):
    pg.evaluate("""(k)=>{const C=Core.Cam;C.cine=false;
      if(k==='top'){C.phi=0.0008;C.theta=C.homeTheta;C.radius=C.fitRadius()*1.06;C.target.copy(C.home0)}
      else if(k==='near'){C.phi=0.5;C.radius=C.fitRadius()*0.5;C.target.copy(C.home0);C.target.z+=2.2}
      else if(k==='nearb'){C.phi=0.5;C.radius=C.fitRadius()*0.5;C.target.copy(C.home0);C.target.z-=2.0}
      else if(k==='close'){C.phi=0.35;C.radius=C.fitRadius()*0.3;C.target.copy(C.home0);C.target.z+=2.6}
      else {C.phi=0.72;C.radius=C.fitRadius();C.target.copy(C.home0)}
      C.pos.copy(C.orbitPos());C.look.copy(C.target)}""", k)
if __name__ == '__main__':
    vp = sys.argv[1]; views = sys.argv[2].split(','); variants = sys.argv[3].split(',') if len(sys.argv) > 3 else ['cur']
    js = open(HERE + '/face.js', encoding='utf-8').read() if os.path.exists(HERE + '/face.js') else ''
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = start(b, vp)
        if js: pg.add_script_tag(content=js)
        b64 = open(HERE + '/../kai/xqkai.b64').read()
        pg.add_script_tag(content="window.__XQKAI_B64='" + b64 + "';")
        pg.add_script_tag(content=open(HERE + '/face2.js', encoding='utf-8').read())
        pg.evaluate("()=>FACE2.load()"); time.sleep(0.5)
        if os.environ.get('GLY'):
            import base64
            gd = '/tmp/claude-0/-home-claude-chuhan-v01/1d3f8c4c-8951-5403-8453-50756fb3a46d/scratchpad/fonts/glyphs/'
            def loadg(key):
                m = {ch: 'data:image/png;base64,' + base64.b64encode(open(gd + key + '/' + ch + '.png', 'rb').read()).decode() for ch in '帥仕相俥傌炮兵將士象車馬砲卒'}
                pg.evaluate("async ([m,k])=>{window.__GLYK=k;window.__GLY={};await Promise.all(Object.entries(m).map(([c,u])=>new Promise(r=>{const i=new Image();i.onload=r;i.src=u;window.__GLY[c]=i;})))}", [m, key])
            loadg(os.environ['GLY'].split(',')[0])
        if os.environ.get('SHEETS'):
            for key in os.environ['SHEETS'].split(','):
                loadg(key); pg.evaluate("(o)=>FACE2.sheet(o)", {'rows': 1}); time.sleep(0.4)
                pg.locator('#faceSheet').screenshot(path=f'{OUT}/fs_{key}.png'); pg.evaluate("()=>document.getElementById('faceSheet').remove()"); print('sheet', key, flush=True)
        if os.environ.get('OPT'): pg.evaluate("(o)=>Object.assign(FACE2.OPT,o)", json.loads(os.environ['OPT']))
        if os.environ.get('SHEET2'):
            print('font', json.dumps(pg.evaluate("()=>FACE2.verifyFont()"), ensure_ascii=False))
            for nm, o in [('guide', {'guide': True, 'rows': 1}), ('forms', {'forms': True, 'rows': 3}), ('rand', {'rows': 3})]:
                r = pg.evaluate("(o)=>FACE2.sheet(o)", o); time.sleep(0.4)
                pg.locator('#faceSheet').screenshot(path=f'{OUT}/s2_{nm}' + os.environ.get('TAG', '') + '.png')
                if nm == 'guide': print('info', json.dumps(r['info'], ensure_ascii=False))
                pg.evaluate("()=>document.getElementById('faceSheet').remove()")
        pg.add_style_tag(content='body.fclean .pcard,body.fclean #status,body.fclean .rbtns,body.fclean #ctrl{visibility:hidden!important}')
        pg.evaluate("()=>document.body.classList.add('fclean')")
        if os.environ.get('SKIN'):
            pg.evaluate("(k)=>{Board.setSkin(k);window.__wire=k==2?'silver':'gold';Board.setPosition(Board.lastGame)}", int(os.environ['SKIN'])); time.sleep(2)
        if os.environ.get('SHEET'):
            print('diag', pg.evaluate("()=>JSON.stringify(FACE.diag())"))
            wh = pg.evaluate("()=>FACE.sheet(%s)" % json.dumps(variants)); time.sleep(0.5)
            pg.locator('#faceSheet').screenshot(path=f'{OUT}/sheet' + os.environ.get('TAG', '') + '.png'); print('sheet', wh)
            pg.evaluate("()=>document.getElementById('faceSheet').remove()")
        for v in views:
            view(pg, v); time.sleep(1)
            for va in variants:
                if va.startswith('g:'): loadg(va[2:]); pg.evaluate("()=>FACE2.apply()")
                elif va == 'v2': pg.evaluate("()=>FACE2.apply()")
                elif va == 'en2': pg.evaluate("()=>FACE2.applyEnamel(window.__wire||'silver')")
                elif va != 'cur': pg.evaluate("(v)=>FACE.apply(v)", va)
                time.sleep(1.5)
                pg.screenshot(path=f'{OUT}/{vp}_{v}_{va}' + os.environ.get('TAG', '') + '.png'); print('shot', v, va, flush=True)
        b.close()
