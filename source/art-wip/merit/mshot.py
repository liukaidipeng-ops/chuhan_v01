# 主将卡军功三个样子：静止 / 加功两帧 / 花功两帧，手机和电脑
import sys, time, os, json
sys.argv = ['x']
exec(open('../ui5/hp.py').read().split("if __name__")[0])
HERE2 = os.path.dirname(os.path.abspath(__file__)); OUT2 = HERE2 + '/shots'; os.makedirs(OUT2, exist_ok=True)
MJS = open(HERE2 + '/mer.js', encoding='utf-8').read()
PROJ = """(fr)=>{const p=Board.pos(fr[0],fr[1]);const v=new THREE.Vector3(p.x,Board.TOP+0.2,p.z).project(Core.camera);const c=Core.renderer.domElement.getBoundingClientRect();return [c.left+(v.x+1)/2*c.width,c.top+(1-v.y)/2*c.height];}"""
vps = (sys.argv_real if hasattr(sys, 'argv_real') else None)
import sys as _s
VPS = os.environ.get('VPS', 'm,pc').split(','); STS = os.environ.get('STS', 'A,B,C').split(',')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp in VPS:
        pg = start(b, vp); pg.add_script_tag(content=MJS)
        # 坐标：被吃的楚卒（汉方视角下第 6 行中间）、要升级的汉车
        red_low = pg.evaluate("()=>{const G=Board.lastGame;for(let r=0;r<10;r++)for(let f=0;f<9;f++){const q=G.board[r][f];if(q&&q.t==='k'&&q.s==='r')return r<5}}")
        cap = [4, 6] if red_low else [4, 3]; upg = [2, 5] if red_low else [6, 4]
        pa = pg.evaluate(PROJ, cap); pb = pg.evaluate(PROJ, upg)
        for st in STS:
            pg.evaluate("(st)=>{MV.unfreeze();MV.mount(st);MV.set('r',12);MV.set('b',7)}", st); time.sleep(0.6)
            pg.screenshot(path=f'{OUT2}/{vp}_{st}_0.png')
            for ms in (250, 800):
                pg.evaluate("([st,pa])=>{MV.unfreeze();MV.mount(st);MV.set('r',12);MV.set('b',7);MV.gain('r',1,'斩敌 · 卒',pa)}", [st, pa]); pg.evaluate("(ms)=>MV.freeze(ms)", ms); time.sleep(0.4)
                pg.screenshot(path=f'{OUT2}/{vp}_{st}_g{ms}.png')
                pg.evaluate("()=>{document.querySelectorAll('.mvfly').forEach(e=>e.remove())}")
            for ms in (300, 700):
                pg.evaluate("([st,pb])=>{MV.unfreeze();MV.mount(st);MV.set('r',12);MV.set('b',7);MV.spend('r',7,'升级 · 车',pb)}", [st, pb]); pg.evaluate("(ms)=>MV.freeze(ms)", ms); time.sleep(0.4)
                pg.screenshot(path=f'{OUT2}/{vp}_{st}_s{ms}.png')
                pg.evaluate("()=>{document.querySelectorAll('.mvfly').forEach(e=>e.remove())}")
        pg.close()
    b.close()
