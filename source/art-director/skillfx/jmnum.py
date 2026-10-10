# 拒马甲乙切换自查：每个时刻数木拒马、矛影、示意兵模各看得见几个、透明度和高度
import glob,pathlib,time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
url=pathlib.Path('skillfx/index.html').resolve().as_uri()
J="""(t)=>{fx.seek('juma',2,t); const it=fx.items(); const ch=it.filter(g=>g.type==='Group'&&g.children.length===7), sp=it.filter(g=>g.type==='Group'&&g.children.length===2), sd=it.filter(g=>g.type==='Group'&&g.children.length===5);
 const op=g=>{let o=0;g.traverse(n=>n.material&&(o=Math.max(o,n.material.opacity)));return o.toFixed(2)};
 return `${t}s 木拒马 ${ch.filter(g=>g.visible).length}/3 y=${ch[0].position.y.toFixed(2)} 透明${op(ch[0])} | 矛影 ${sp.filter(g=>g.visible).length}/10 大小${sp[0].scale.x.toFixed(2)} 透明${op(sp[0])} | 兵模 ${sd[0].visible?op(sd[0]):'隐'}`}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':900,'height':720}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(url); pg.wait_for_function("()=>window.fx"); time.sleep(1.5)
    for t in (0,.5,1.2,2.0,2.3,2.4,2.5,2.7,3.2,3.7,3.8,3.9,4.1,4.7): print(pg.evaluate(J,t))
    box=pg.evaluate("()=>{const r=document.getElementById('stage').getBoundingClientRect();return [r.x,r.y,r.width,r.height]}")
    ims=[]
    for t in (.5,1.4,2.3,2.4,2.5,3.2,3.8,4.4):
        pg.evaluate(f"()=>fx.seek('juma',2,{t})"); pg.screenshot(path='/tmp/j.png',clip=dict(x=box[0],y=box[1],width=box[2],height=box[3]))
        im=Image.open('/tmp/j.png').convert('RGB'); ImageDraw.Draw(im).text((10,im.size[1]-40),f'{t:.2f}s',font=ImageFont.load_default(size=26),fill=(240,231,210)); ims.append(im)
    w,h=ims[0].size; w2,h2=w//2,h//2; g=Image.new('RGB',(w2*4+18,h2*2+6),(20,19,17))
    for i,im in enumerate(ims): g.paste(im.resize((w2,h2)),((i%4)*(w2+6),(i//4)*(h2+6)))
    g.save('skillfx/frames/jm_switch.jpg',quality=85); print('errors',errs); b.close()
