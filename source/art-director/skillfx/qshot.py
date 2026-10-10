import glob,pathlib,time,sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
url=pathlib.Path('skillfx/index.html').resolve().as_uri()
F=ImageFont.load_default(size=26)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for vw,vh,tag in [(900,720,'pc'),(390,780,'m')]:
        pg=b.new_page(viewport={'width':vw,'height':vh}); pg.goto(url); pg.wait_for_function("()=>window.fx"); time.sleep(1.5)
        box=pg.evaluate("()=>{const r=document.getElementById('stage').getBoundingClientRect();return [r.x,r.y,r.width,r.height]}")
        for o in (1,2):
            d=pg.evaluate(f"()=>fx.seek('qishe',{o},0)")
            ts=[.45,.8,1.5,2.05,2.6,3.1, d-1.45, d-1.0] if o==1 else [.5,.8,1.5,2.3,2.9,3.4,d-1.4,d-1.0]
            ims=[]
            for t in ts:
                pg.evaluate(f"()=>fx.seek('qishe',{o},{t})"); pg.screenshot(path='/tmp/q.png',clip=dict(x=box[0],y=box[1],width=box[2],height=box[3]))
                im=Image.open('/tmp/q.png').convert('RGB'); ImageDraw.Draw(im).text((10,im.size[1]-40),f'{t:.2f}s',font=F,fill=(240,231,210)); ims.append(im)
            w,h=ims[0].size; sc=0.5 if tag=='pc' else 0.6; w2,h2=int(w*sc),int(h*sc); cols=4
            g=Image.new('RGB',(w2*cols+6*(cols-1),h2*2+6),(20,19,17))
            for i,im in enumerate(ims): g.paste(im.resize((w2,h2)),((i%cols)*(w2+6),(i//cols)*(h2+6)))
            g.save(f'skillfx/frames/qs_{tag}_{o}.jpg',quality=85); print(tag,o,round(d,2),g.size)
        pg.close()
    b.close()
