# 手机令牌条自查：放大镜在不在、有没有出屏、居中的是不是选中那步；甲乙两种拖法走过的步；单步按钮；有没有横向滚动
import glob,pathlib,time
from playwright.sync_api import sync_playwright
url=pathlib.Path('scrub/index.html').resolve().as_uri()
EV="""([k,type,x,y])=>{const s=document.getElementById('s'+k);s.dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:true}));
 const l=s.querySelector('.loupe'),r=l.getBoundingClientRect(),t=[...l.querySelectorAll('.tk')],c=t.findIndex(q=>q.classList.contains('on'));
 return {sel:strips[k].sel,lp:!l.hidden,L:Math.round(r.left),R:Math.round(r.right),slots:t.length,center:c,lb:l.querySelector('.lb').textContent}}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0])
    ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(url); time.sleep(.8)
    pg.screenshot(path='scrub/m_rest.png',clip=pg.evaluate("()=>{const r=document.querySelectorAll('.panel')[0].getBoundingClientRect(),q=document.querySelectorAll('.panel')[1].getBoundingClientRect();return {x:0,y:r.top-6,width:390,height:q.bottom-r.top+12}}"))
    print('横向溢出', pg.evaluate("()=>document.documentElement.scrollWidth>innerWidth"))
    for k in (0,1):
        a=pg.evaluate(f"()=>{{const r=document.getElementById('s{k}').getBoundingClientRect();return [r.left,r.right,r.top+r.height/2,r.height]}}")
        print(f'条{k} 左{a[0]:.0f} 右{a[1]:.0f} 高{a[3]:.0f}')
        for fine in (False,True):
            pg.evaluate(f"()=>{{window.scrubFine={str(fine).lower()}}}")
            seq=[]; r=pg.evaluate(EV,[k,'pointerdown',a[0]+3,a[2]]); first=r
            for f in [i/30 for i in range(31)]:
                r=pg.evaluate(EV,[k,'pointermove',a[0]+3+(a[1]-a[0]-6)*f,a[2]]); seq.append(r['sel'])
                if f==0.5: mid=r
            out=(min(mid['L'],first['L']),max(mid['R'],first['R']))
            pg.evaluate(EV,[k,'pointerup',a[1],a[2]])
            gaps=max(seq[i+1]-seq[i] for i in range(len(seq)-1))
            print(f"  {'乙细调' if fine else '甲跟手'}: 走过 {seq[0]}→{seq[-1]} 单调{all(seq[i]<=seq[i+1] for i in range(len(seq)-1))} 每 {(a[1]-a[0])/30:.0f}px 最多跳 {gaps} 步 | 放大镜 显示{mid['lp']} 格{mid['slots']} 居中第{mid['center']}格 左右{out} {mid['lb']}")
        # 放大镜截图：按在中间不松手
        pg.evaluate(EV,[k,'pointerdown',(a[0]+a[1])/2,a[2]])
        time.sleep(.3)
        if k==1: pg.screenshot(path='scrub/m_loupe.png',clip=pg.evaluate("()=>{const r=document.querySelectorAll('.panel')[1].getBoundingClientRect();return {x:0,y:r.top-70,width:390,height:r.height+80}}"))
        pg.evaluate(EV,[k,'pointerup',(a[0]+a[1])/2,a[2]])
        before=pg.evaluate(f"()=>strips[{k}].sel"); pg.click(f'.nav[data-s="{k}"][data-d="1"]'); pg.click(f'.nav[data-s="{k}"][data-d="1"]'); pg.click(f'.nav[data-s="{k}"][data-d="-1"]')
        print('  单步按钮', before,'→',pg.evaluate(f"()=>strips[{k}].sel"))
    # 贴边：按在最左
    a=pg.evaluate("()=>{const r=document.getElementById('s1').getBoundingClientRect();return [r.left,r.right,r.top+r.height/2]}")
    r=pg.evaluate(EV,[1,'pointerdown',a[0]+1,a[2]]); time.sleep(.3); print('最左按下 放大镜左右',r['L'],r['R'],'居中格',r['center'],r['lb']); pg.screenshot(path='scrub/m_loupe_edge.png',clip=pg.evaluate("()=>{const r=document.querySelectorAll('.panel')[1].getBoundingClientRect();return {x:0,y:r.top-70,width:390,height:r.height+80}}")); pg.evaluate(EV,[1,'pointerup',a[0]+1,a[2]])
    print('errors',errs); b.close()
