# 复盘令牌条实机自查：python3 anascrub.py <源码目录> <输出目录> <步数>
#   电脑：拖动一路不回跳、悬停那枚和选中的一样大、令牌条不超出面板；手机：按住浮出放大镜、不出屏、居中的是选中那步；‹ › 单步
import sys, time, pathlib, glob, json
from playwright.sync_api import sync_playwright
SRC, OUT, NMV = sys.argv[1], sys.argv[2], int(sys.argv[3])
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri() + '#local'
PLAY = """async(N)=>{const X=window.__xq,g=X.game;for(let n=0;n<N;n++){const ms=[];for(let f=0;f<9;f++)for(let r=0;r<10;r++){const p=g.at(f,r);if(p&&p.s===g.turn)ms.push(...g.legalFrom(f,r))}
 if(!ms.length)break; ms.sort((a,b)=>(a.to[0]*7+a.to[1]*3+n)%11-(b.to[0]*7+b.to[1]*3+n)%11);X.doMove(ms[0]);await new Promise(r=>setTimeout(r,60));while(X.busy)await new Promise(r=>setTimeout(r,50))}}"""
TEV = """([type,x,y])=>{const L=document.getElementById('anaList');L.dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:true}));
 const lp=document.getElementById('anaLoupe'),r=lp.getBoundingClientRect(),t=[...lp.querySelectorAll('.tk')];return {sel:(window.__xq.RP.real||window.__xq.game).__ana.sel,lp:!lp.classList.contains('hidden'),L:Math.round(r.left),R:Math.round(r.right),T:Math.round(r.top),n:t.length,c:t.findIndex(q=>q.classList.contains('on')),lb:lp.querySelector('.lb').textContent}}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0], args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp, (w, h, d, touch) in {'pc': (1440, 900, 1, False), 'm': (390, 844, 2, True)}.items():
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=d, has_touch=touch, is_mobile=touch)
        pg = ctx.new_page(); pg.set_default_timeout(300000); errs = []
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1');localStorage.setItem('xq3d-quality',JSON.stringify('low'))")
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(url); pg.wait_for_function("()=>window.__xq&&window.__xq.started"); time.sleep(3)
        pg.evaluate("()=>{window.__xq.Core.Time.boost=8}")
        pg.evaluate(PLAY, NMV); pg.evaluate("()=>{window.__xq.Core.Time.boost=1}")
        pg.evaluate("()=>window.__xq.anaOpen()"); time.sleep(2)
        for i in range(150):
            t = pg.evaluate("()=>document.getElementById('anaProg').textContent")
            if not t or '分析' not in t: break
            time.sleep(2)
        pg.evaluate("()=>window.__xq.anaPick(5)"); time.sleep(2)
        geo = pg.evaluate("()=>{const L=document.getElementById('anaList'),a=document.getElementById('ana').getBoundingClientRect(),r=L.getBoundingClientRect(),t=[...L.querySelectorAll('.ar.tk')],l=t[t.length-1].getBoundingClientRect(),on=L.querySelector('.ar.tk.on').getBoundingClientRect();return {n:t.length,panel:[Math.round(a.left),Math.round(a.right)],strip:[Math.round(r.left),Math.round(r.right),Math.round(r.height)],last:Math.round(l.right),on:[Math.round(on.width),Math.round(on.height)],dense:L.classList.contains('dense'),gap:L.style.getPropertyValue('--gap'),scroll:L.scrollWidth>L.clientWidth+1}}")
        print(vp, 'prog', repr(t), 'geo', geo)
        pg.screenshot(path=f'{OUT}/{vp}_rest.png')
        r = pg.evaluate("()=>{const r=document.getElementById('anaList').getBoundingClientRect();return [r.left,r.right,r.top+r.height-10]}")
        if not touch:
            # 拖动：从左到右
            pg.mouse.move(r[0] + 3, r[2]); pg.mouse.down(); seq = []
            for k in range(31):
                pg.mouse.move(r[0] + 3 + (r[1] - r[0] - 6) * k / 30, r[2]); seq.append(pg.evaluate("()=>(window.__xq.RP.real||window.__xq.game).__ana.sel"))
            pg.mouse.up()
            print(vp, '拖动', seq[0], '→', seq[-1], '单调', all(seq[i] <= seq[i + 1] for i in range(len(seq) - 1)))
            pg.evaluate("()=>window.__xq.anaPick(3)"); time.sleep(1.5)
            tk = pg.evaluate("()=>{const t=document.querySelectorAll('#anaList .ar.tk')[9].getBoundingClientRect();return [t.left+t.width/2,t.top+t.height/2]}")
            pg.mouse.move(tk[0], tk[1]); time.sleep(3)   # 软件渲染一帧要很久，等过渡走完再量
            hv = pg.evaluate("()=>{const t=[...document.querySelectorAll('#anaList .ar.tk')];const h=t.findIndex(q=>q.classList.contains('h0'));const a=t[h].getBoundingClientRect(),o=document.querySelector('#anaList .ar.tk.on').getBoundingClientRect();return {h0:h,h0size:[Math.round(a.width),Math.round(a.height)],onsize:[Math.round(o.width),Math.round(o.height)],h1:t.filter(q=>q.classList.contains('h1')).length,h2:t.filter(q=>q.classList.contains('h2')).length}}")
            print(vp, '悬停', hv); pg.screenshot(path=f'{OUT}/{vp}_hover.png'); pg.mouse.move(10, 10)
        else:
            seq = []; pg.evaluate(TEV, ['pointerdown', r[0] + 3, r[2]])
            for k in range(31):
                o = pg.evaluate(TEV, ['pointermove', r[0] + 3 + (r[1] - r[0] - 6) * k / 30, r[2]]); seq.append(o['sel'])
                if k == 15: mid = o
            pg.evaluate(TEV, ['pointerup', r[1], r[2]])
            print(vp, '滑动', seq[0], '→', seq[-1], '单调', all(seq[i] <= seq[i + 1] for i in range(len(seq) - 1)), '放大镜', mid)
            pg.evaluate(TEV, ['pointerdown', (r[0] + r[1]) / 2, r[2]]); time.sleep(0.4); pg.screenshot(path=f'{OUT}/{vp}_loupe.png'); pg.evaluate(TEV, ['pointerup', (r[0] + r[1]) / 2, r[2]])
            o = pg.evaluate(TEV, ['pointerdown', r[0] + 1, r[2]]); time.sleep(0.4); print(vp, '最左', o); pg.screenshot(path=f'{OUT}/{vp}_loupe_edge.png'); pg.evaluate(TEV, ['pointerup', r[0] + 1, r[2]])
        s0 = pg.evaluate("()=>(window.__xq.RP.real||window.__xq.game).__ana.sel"); pg.click('#ana .anaNav [data-d="1"]'); time.sleep(0.8); pg.click('#ana .anaNav [data-d="1"]'); time.sleep(0.8); pg.click('#ana .anaNav [data-d="-1"]'); time.sleep(0.8)
        print(vp, '单步', s0, '→', pg.evaluate("()=>(window.__xq.RP.real||window.__xq.game).__ana.sel"), 'errors', errs)
        ctx.close()
    b.close()
