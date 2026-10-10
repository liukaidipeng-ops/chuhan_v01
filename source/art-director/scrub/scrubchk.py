import glob,pathlib,time
from playwright.sync_api import sync_playwright
url=pathlib.Path('scrub/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0])
    for W,H,touch in [(1440,900,False),(390,844,True)]:
        ctx=b.new_context(viewport={'width':W,'height':H},has_touch=touch,device_scale_factor=2); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(url); time.sleep(.8)
        for k in (0,1):
            r=pg.evaluate(f"()=>{{const s=document.getElementById('s{k}'),a=s.getBoundingClientRect(),t=[...s.querySelectorAll('.tk')],l=t[t.length-1].getBoundingClientRect();return [a.left,a.right,a.top+a.height-10,l.right,s.scrollWidth,s.clientWidth]}}")
            print(W,'strip',k,'left/right',round(r[0]),round(r[1]),'last tk right',round(r[3]),'overflow',r[4]>r[5]+1)
            # drag across with mouse (or touch-like pointer) and record selection sequence
            pg.mouse.move(r[0]+5,r[2]); pg.mouse.down(); seq=[]
            for f in [i/20 for i in range(21)]:
                pg.mouse.move(r[0]+5+(r[1]-r[0]-10)*f,r[2]); seq.append(pg.evaluate(f"()=>strips[{k}].sel"))
            pg.mouse.up()
            mono=all(seq[i]<=seq[i+1] for i in range(len(seq)-1))
            print('  drag seq',seq[:4],'...',seq[-3:],'monotonic',mono)
        if not touch:
            r=pg.evaluate("()=>{const t=document.querySelectorAll('#s0 .tk')[12].getBoundingClientRect();return [t.left+t.width/2,t.top+t.height/2]}")
            pg.mouse.move(r[0],r[1]); time.sleep(.3)
            print('  hover scales', pg.evaluate("()=>[...document.querySelectorAll('#s0 .tk')].slice(9,16).map(t=>t.style.transform||'1')"))
            pg.screenshot(path='scrub/pc.png')
        else: pg.screenshot(path='scrub/m.png')
        print('errors',errs); ctx.close()
    b.close()
