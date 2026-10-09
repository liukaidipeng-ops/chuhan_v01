import sys, time, os, json
sys.argv = ['x']
exec(open('../ui5/hp.py').read().split("if __name__")[0])
H2 = os.path.dirname(os.path.abspath(__file__))
PROJ = """(fr)=>{const p=Board.pos(fr[0],fr[1]);const v=new THREE.Vector3(p.x,Board.TOP+0.2,p.z).project(Core.camera);const c=Core.renderer.domElement.getBoundingClientRect();return [c.left+(v.x+1)/2*c.width,c.top+(1-v.y)/2*c.height];}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'm')
    info = {}
    for k in ('cardMe', 'cardOpp', 'status'):
        info[k] = pg.evaluate(f"()=>{{const r=document.getElementById('{k}').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}}")
    info['cap'] = pg.evaluate(PROJ, [4, 6]); info['upg'] = pg.evaluate(PROJ, [2, 5]); info['cap2'] = pg.evaluate(PROJ, [7, 6])
    pg.evaluate("()=>{document.querySelectorAll('.pcard,#status').forEach(e=>e.style.visibility='hidden')}"); time.sleep(0.8)
    pg.screenshot(path=H2 + '/bg_m.png')
    json.dump(info, open(H2 + '/bg_m.json', 'w')); print(info)
    b.close()
