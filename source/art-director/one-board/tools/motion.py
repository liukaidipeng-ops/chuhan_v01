import time, glob, json, math
from playwright.sync_api import sync_playwright
exe = glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
FLOWS={'ai':['人机','开战'],'local':['本地','开始'],'wait':['联机','创建房间','开始']}
SAMPLER="""()=>{window.__S=[];const t0=performance.now();const f=()=>{const els=[...document.querySelectorAll('div')].filter(d=>d.style.transform&&d.style.transform.includes('-50%')&&d.style.borderRadius);
window.__S.push({t:performance.now()-t0,p:els.map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return [r.left+r.width/2,r.top+r.height/2,r.width,r.height,(cs.borderTopLeftRadius.endsWith('%')?parseFloat(cs.borderTopLeftRadius)/100*r.width:parseFloat(cs.borderTopLeftRadius)),+cs.opacity]})});
if(performance.now()-t0<1000)requestAnimationFrame(f)};requestAnimationFrame(f)}"""
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe)
    for dev,(w,h) in {'Main':(1440,900),'Mobile':(390,844)}.items():
        pg=b.new_page(viewport={'width':w,'height':h}); pg.goto(f'http://127.0.0.1:8765/dctest/{dev}.html'); time.sleep(4)
        for name,clicks in FLOWS.items():
            pg.click('text=回主界面') if pg.locator('text=回主界面').count() else None
            time.sleep(.4)
            for c in clicks[:-1]: pg.click(f'button[aria-label="{c}"]'); time.sleep(.5)
            pg.click(f'button[aria-label="{clicks[-1]}"]'); pg.evaluate(SAMPLER); time.sleep(2.0)
            S=pg.evaluate('window.__S'); time.sleep(3)
            n=max(len(s['p']) for s in S)
            for k in range(n):
                seq=[s['p'][k] for s in S if len(s['p'])>k]
                x0,y0=seq[0][0],seq[0][1]; x1,y1=seq[-1][0],seq[-1][1]; L=math.hypot(x1-x0,y1-y0) or 1
                dev_max=max(abs((x1-x0)*(y0-q[1])-(x0-q[0])*(y1-y0))/L for q in seq)
                proj=[((q[0]-x0)*(x1-x0)+(q[1]-y0)*(y1-y0))/L for q in seq]
                back=max([proj[i]-proj[i+1] for i in range(len(proj)-1)]+[0])
                rat=[q[4]/min(q[2],q[3]) for q in seq]
                round0 = rat[0] > 0.49
                circ = max([0.5-x for x in rat]+[0]) if round0 else max([rat[i]-rat[i+1] for i in range(len(rat)-1)]+[0.5-rat[-1],0])  # 圆子全程正圆；方块圆角只增不减、最后成圆
                sizeup=max([seq[i+1][2]-seq[i][2] for i in range(len(seq)-1)]+[0])
                ok = dev_max<=1.5 and back<=0.5 and circ<=0.01 and sizeup<=0.5
                if not ok: bad+=1
                print(f'{dev} {name} piece{k}: 偏离直线 {dev_max:.2f}px 回退 {back:.2f}px 圆角欠 {circ:.2f}px 变大 {sizeup:.2f}px 帧数 {len(seq)} {"OK" if ok else "FAIL"}')
        pg.close()
    b.close()
print('FAIL count', bad)
