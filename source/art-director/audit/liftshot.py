import time, glob, pathlib
from playwright.sync_api import sync_playwright
exe=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
base=pathlib.Path('dev/source/dist/site/index.html').resolve().as_uri()+'?relief=4&shd=3#local'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1440,'height':900}); pg.set_default_timeout(240000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('mid'))")
    pg.on('pageerror',lambda e:print('ERR',str(e)[:200]))
    pg.goto(base); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(6)
    pg.evaluate("()=>{const C=window.__xq.Core.Cam;C.radius*=0.4;C.target.set(0,0,3.4);C.pos.copy(C.orbitPos());C.look.copy(C.target)}"); time.sleep(3)
    for h in (0,0.2,0.5,1.0):
        print(h, pg.evaluate(f"""()=>{{const B=window.__xq.Board,g=window.__xq.game;let m=null;for(const row of g.board)for(const q of row)if(q&&q.s==='r'&&q.t==='k')m=B.pieces.get(q.id);
          m.position.y={0.25+h};return m.userData.blob?[m.userData.blob.position.y.toFixed(3),m.userData.blob.material.opacity.toFixed(2)].join(','):'noblob'}}"""))
        time.sleep(1.5); pg.screenshot(path=f'r2/lift_{h}.png')
        print(' after', pg.evaluate("()=>{const B=window.__xq.Board,g=window.__xq.game;let m=null;for(const row of g.board)for(const q of row)if(q&&q.s==='r'&&q.t==='k')m=B.pieces.get(q.id);const bl=m.userData.blob;const v=new (bl.position.constructor)();bl.getWorldPosition(v);return [v.y.toFixed(3),bl.material.opacity.toFixed(2)].join(',')}"))
    b.close()
