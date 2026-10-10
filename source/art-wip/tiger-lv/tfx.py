# 交付前自查：用打了交付补丁的构建（../fb/dist）起一局本地普通对局，按固定步长逐帧推进、逐帧截图，拼成 30fps 视频
#   python3 tfx.py up <lv0> <lv1> <tag>        —— 一枚汉兵翻面升级（UpFx.play，swap = Board.decorate）
#   python3 tfx.py blast|fall <lv> <tag>        —— 虎骑（真的 TigerRider 小队）两种死法
import sys, time, os, json, pathlib, subprocess
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/out'; os.makedirs(OUT, exist_ok=True)
DIST = os.environ.get('DIST', HERE + '/../fb/dist/site/index.html')
kind = sys.argv[1]; tag = sys.argv[-1]
W, H = int(os.environ.get('W', 1280)), int(os.environ.get('H', 720)); FPS = 30; DUR = float(os.environ.get('DUR', '1.6'))
fr = HERE + f'/frames_{tag}'; os.makedirs(fr, exist_ok=True)
for x in os.listdir(fr): os.remove(fr + '/' + x)
INIT = """(()=>{const o=THREE.Clock.prototype.getDelta;THREE.Clock.prototype.getDelta=function(){const r=o.call(this);return window.__fdt!=null?window.__fdt:r}})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:300], flush=True))
    pg.on('console', lambda m: m.type == 'error' and 'file' not in m.text and print('CONSOLE', m.text[:300], flush=True))
    pg.goto(pathlib.Path(DIST).resolve().as_uri() + '#local', wait_until='domcontentloaded')
    pg.wait_for_function("()=>window.__xq&&__xq.started&&__xq.game&&!__xq.busy", timeout=300000); time.sleep(3)
    pg.evaluate(INIT)
    pg.add_style_tag(content='.pcard,#status,.rbtns,#ctrl,#toast,.toast,#skip{visibility:hidden!important}.cinebar{height:0!important}')
    if kind == 'up':
        lv0, lv1 = int(sys.argv[2]), int(sys.argv[3])
        pg.evaluate("""([lv0,lv1])=>{const B=__xq.Board,g=__xq.game,p=g.board[3][4],m=B.pieces.get(p.id);window.__P={p,m,lv1};
          const q={...p,lv:lv0,hp:__xq.BF.hpOf(p.t,lv0)};if(lv0>1)B.decorate(m,q,{});
          const b=m.position,C=__xq.Core.Cam;C.cine=true;const d=2.0,el=0.48,az=-0.5;
          window.__CP=new THREE.Vector3(b.x+Math.sin(az)*Math.cos(el)*d,b.y+Math.sin(el)*d,b.z+Math.cos(az)*Math.cos(el)*d);window.__CL=new THREE.Vector3(b.x,b.y+0.25,b.z)}""", [lv0, lv1])
        go = """()=>{const {p,m,lv1}=window.__P;UpFx.play(m,{lv:lv1,swap:()=>__xq.Board.decorate(m,{...p,lv:lv1,hp:__xq.BF.hpOf(p.t,lv1)},{})})}"""
    else:
        lv = int(sys.argv[2])
        pg.evaluate("""([lv])=>{const B=__xq.Board,S=__xq.Squads,c=B.pos(4,5);
          for(const m of B.pieces.values())if(Math.hypot(m.position.x-c.x,m.position.z-c.z)<3.2)m.visible=false;
          const yaw=-Math.PI/2+0.35;const sq=S.make('e','r',c.clone(),yaw,'defend',lv,lv);window.__SQ={sq,c,yaw};
          const C=__xq.Core.Cam;C.cine=true;const d=2.6,el=0.4,az=0.15;
          window.__CP=new THREE.Vector3(c.x+Math.sin(az)*Math.cos(el)*d,c.y+Math.sin(el)*d,c.z+Math.cos(az)*Math.cos(el)*d);window.__CL=new THREE.Vector3(c.x,c.y+0.3,c.z)}""", [lv])
        go = """(k)=>{const {sq,c,yaw}=window.__SQ;if(window.__DS)Object.defineProperty(sq.m,'deadSide',{get:()=>window.__DS,set:()=>{}});const dir=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)).negate();sq.die(k,dir,1,c.clone())}"""
    time.sleep(3)
    pg.evaluate("""()=>{const C=__xq.Core.Cam;const P=window.__CP||C.pos.clone(),L=window.__CL||C.look.clone();window.__CP=P;window.__CL=L;__xq.Core.addHook(()=>{C.cine=true;C.pos.copy(P);C.look.copy(L)})}""")
    if os.environ.get('DS'): pg.evaluate('(d)=>{window.__DS=d}', int(os.environ['DS']))
    time.sleep(2)
    pg.screenshot(path=fr + '/0000.png')
    pg.evaluate("()=>{window.__fdt=0}")
    pg.evaluate(go, kind) if kind != 'up' else pg.evaluate(go)
    n = int(DUR * FPS)
    for i in range(1, n + 1):
        pg.evaluate("()=>new Promise(r=>{window.__fdt=1/30;requestAnimationFrame(()=>{window.__fdt=0;r()})})")
        pg.screenshot(path=fr + f'/{i:04d}.png')
    print('frames', n, flush=True)
    b.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', fr + '/%04d.png', '-vf', 'tpad=start_duration=0.4:start_mode=clone:stop_duration=0.6:stop_mode=clone,format=yuv420p', '-c:v', 'libx264', '-crf', '20', OUT + f'/{tag}.mp4'], check=True)
print('video', OUT + f'/{tag}.mp4')
