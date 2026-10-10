# 交付前自查：用打了交付补丁的构建（../fb/dist）起一局本地普通对局，按固定步长逐帧推进、逐帧截图，拼成 30fps 视频
#   python3 tfx.py up <lv0> <lv1> <tag>        —— 一枚汉兵翻面升级（UpFx.play，swap = Board.decorate）
#   python3 tfx.py blast|fall <lv> <tag>        —— 虎骑（真的 TigerRider 小队）两种死法
import sys, time, os, json, pathlib, subprocess
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/out'; os.makedirs(OUT, exist_ok=True)
DIST = os.environ.get('DIST', HERE + '/../fb2/dist/site/index.html')
kind = sys.argv[1]; tag = sys.argv[-1]
# 用法：python3 tel.py el|stomp <tag>   —— 战象正面踩死一队兵 / 践踏把旁边一队掀上天
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
    pg.evaluate("""(kind)=>{const B=__xq.Board,S=__xq.Squads,A=B.pos(6,7),T=B.pos(6,6),V3=THREE.Vector3;
      for(const m of B.pieces.values())if(Math.hypot(m.position.x-A.x,m.position.z-A.z)<3.4)m.visible=false;
      const d=T.clone().sub(A).setY(0).normalize();
      const el=S.make('e','b',A.clone(),S.yawOf(d),'attack',1,1), inf=S.make('p','r',T.clone(),S.yawOf(d.clone().negate()),'defend',3,3);
      el.setVis(1);inf.setVis(1);window.__EL={el,inf,A,T,d};
      const mid=A.clone().lerp(T,0.5),side=new V3(d.z,0,-d.x),cd=window.__CD||3.6;
      window.__CP=mid.clone().addScaledVector(side,cd).add(new V3(0,cd*0.55,0)).addScaledVector(d,-0.4);window.__CL=mid.clone().add(new V3(0,0.35,0))}""", kind)
    go = """(kind)=>{const {el,inf,A,T,d}=window.__EL,TOP=__xq.Board.TOP,Core=__xq.Core,S=__xq.Squads;
      if(kind==='el'){el.attack(inf,{B:T.clone(),d:d.clone(),dist:A.distanceTo(T)});return}
      // 践踏：就地人立、跺下，碎石崩飞，旁边那队被掀上天（照 bfx.js trampleFx 的节奏）
      const m=el.m;Core.tween(0.38,k=>{m.rearK=k;m.trumpetK=k}).then(()=>Core.sleep(0.16)).then(()=>Core.tween(0.12,k=>{m.rearK=1-k})).then(()=>{
        m.rearK=0;m.trumpetK=0;Core.Cam.shake(0.6);const c=A.clone().setY(TOP);Fx.ring(c.clone().setY(TOP+0.02),5.2,1.0,0x8b7e68,0.7);Fx.Marks.crack(c,2.6);Fx.P.dust(A,24,null,0.6);
        S.rubble(c,44,1.4,1.35);Core.sleep(0.12).then(()=>inf.die('crush',d.clone(),2.25,T.clone().addScaledVector(d,-0.35)))})}"""
    time.sleep(3)
    pg.evaluate("""()=>{const C=__xq.Core.Cam;const P=window.__CP||C.pos.clone(),L=window.__CL||C.look.clone();window.__CP=P;window.__CL=L;__xq.Core.addHook(()=>{C.cine=true;C.pos.copy(P);C.look.copy(L)})}""")
    time.sleep(2)
    pg.screenshot(path=fr + '/0000.png')
    pg.evaluate("()=>{window.__fdt=0}")
    pg.evaluate(go, kind)
    n = int(DUR * FPS)
    for i in range(1, n + 1):
        pg.evaluate("()=>new Promise(r=>{window.__fdt=1/30;requestAnimationFrame(()=>{window.__fdt=0;r()})})")
        pg.screenshot(path=fr + f'/{i:04d}.png')
    print('frames', n, flush=True)
    b.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', fr + '/%04d.png', '-vf', 'tpad=start_duration=0.4:start_mode=clone:stop_duration=0.6:stop_mode=clone,format=yuv420p', '-c:v', 'libx264', '-crf', '20', OUT + f'/{tag}.mp4'], check=True)
print('video', OUT + f'/{tag}.mp4')
