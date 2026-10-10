# 齐射乙丙自查：每 0.05 秒数一下画面里能看见几支箭（按两种画幅投影），落下时箭是不是竖直、落点离目标多远
import glob,pathlib,time,json
from playwright.sync_api import sync_playwright
url=pathlib.Path('skillfx/index.html').resolve().as_uri()
J="""(a)=>{const [o,t,asp]=a; fx.seek('qishe',o,t); const cam=new THREE.PerspectiveCamera(40,asp,.1,100); cam.position.set(0,6.6,6.2).multiplyScalar(asp<1?1.75:1); cam.lookAt(0,.4,.2); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
 const tg=fx.pieces()[1]; let inF=0, vis=0, info=[];
 fx.items().filter(g=>g.type==='Group'&&g.userData.streak).forEach(g=>{ if(!g.visible) return; vis++; const tipW=new THREE.Vector3(0,0,.67).applyMatrix4(g.matrixWorld), tailW=new THREE.Vector3(0,0,-.5).applyMatrix4(g.matrixWorld);
   const on=[tipW,tailW].some(p=>{const q=p.clone().project(cam); return Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z<1;}); if(on) inF++;
   const d=tipW.clone().sub(tailW).normalize(); info.push([+d.y.toFixed(2), +Math.hypot(tipW.x-tg.position.x,tipW.z-tg.position.z).toFixed(2), +tipW.y.toFixed(2)]); });
 return {vis,inF,info};}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':600,'height':480}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(url); pg.wait_for_function("()=>window.fx"); time.sleep(1)
    for o in (1,2):
        d=pg.evaluate("(o)=>fx.seek('qishe',o,0)",o); print('== 方案',o,'总长',round(d,2))
        line=[]
        for i in range(int(d/0.05)+1):
            t=round(i*0.05,2); r=pg.evaluate(J,[o,t,1.6]); r2=pg.evaluate(J,[o,t,.5])
            line.append(f"{t}:{r['vis']}/{r['inF']}/{r2['inF']}")
        print(' '.join(line))
        # 落地瞬间：竖直程度、离目标中心距离、尖端高度
        lands=pg.evaluate("(o)=>{fx.seek('qishe',o,0);return null}",o)
        r=pg.evaluate(J,[o,d-0.7,1.6]); print('落定后（方向y, 离中心, 尖端高）:',r['info'])
    print('errors',errs); b.close()
