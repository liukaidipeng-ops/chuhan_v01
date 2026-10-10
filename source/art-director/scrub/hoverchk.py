import glob,pathlib,time
from playwright.sync_api import sync_playwright
url=pathlib.Path('scrub/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0])
    pg=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=2); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(url); time.sleep(.6)
    for k in (0,1):
        # 不放大时每枚的中点（基准），再把鼠标依次停在每枚中点上，看判出来的是不是这一枚，以及放大的是不是它
        cs=pg.evaluate(f"()=>[...document.querySelectorAll('#s{k} .tk')].map(t=>{{const r=t.getBoundingClientRect();return [r.left+r.width/2,r.bottom-8]}})")
        n=len(cs); bad=0; seen=[]
        for i in range(0,n, 1 if n<30 else 7):
            pg.mouse.move(cs[i][0],cs[i][1]); time.sleep(.05)
            h=pg.evaluate(f"()=>[...document.querySelectorAll('#s{k} .tk')].findIndex(t=>t.classList.contains('h0'))")
            sel=pg.evaluate(f"()=>strips[{k}].sel")
            ok = h==i or (i==sel and h==-1)
            bad+= not ok; seen.append((i,h))
        # 沿条慢慢移过去，h0 只能往右走、不能回跳
        r=pg.evaluate(f"()=>{{const a=document.getElementById('s{k}').getBoundingClientRect();return [a.left,a.right,a.bottom-8]}}")
        seq=[]
        for f in range(0,101):
            pg.mouse.move(r[0]+4+(r[1]-r[0]-8)*f/100,r[2]); seq.append(pg.evaluate(f"()=>[...document.querySelectorAll('#s{k} .tk')].findIndex(t=>t.classList.contains('h0'))"))
        seq=[x for x in seq if x>=0]; back=sum(1 for a,b2 in zip(seq,seq[1:]) if b2<a)
        print('strip',k,'n',n,'hover-on-center mismatches',bad,'sweep backsteps',back,'first/last',seq[:3],seq[-3:])
    pg.mouse.move(cs[0][0],cs[0][1]); 
    cs=pg.evaluate("()=>[...document.querySelectorAll('#s0 .tk')].map(t=>{const r=t.getBoundingClientRect();return [r.left+r.width/2,r.bottom-8]})")
    pg.mouse.move(cs[13][0],cs[13][1]); time.sleep(.4); pg.screenshot(path='scrub/pc2.png')
    print('h0 vs on size', pg.evaluate("()=>{const h=document.querySelector('#s0 .tk.h0').getBoundingClientRect(),o=document.querySelector('#s0 .tk.on').getBoundingClientRect();return [h.width,h.height,o.width,o.height]}"), 'errors',errs)
    b.close()
