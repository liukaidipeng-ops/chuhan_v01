import time, glob, math
from playwright.sync_api import sync_playwright
exe = glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
FLOWS={'ai':['人机','开战'],'local':['本地','开始'],'wait':['联机','创建房间','开始']}
SAMPLER="""()=>{window.__L=[];const t0=performance.now();const f=()=>{const els=[...document.querySelectorAll('div')].filter(d=>d.style.background&&d.style.transformOrigin);
window.__L.push({t:performance.now()-t0,l:els.map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height,+getComputedStyle(e).opacity]})});
if(performance.now()-t0<3000)requestAnimationFrame(f)};requestAnimationFrame(f)}"""
bad=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe)
    for dev,(w,h) in {'Main':(1440,900),'Mobile':(390,844)}.items():
        pg=b.new_page(viewport={'width':w,'height':h}); pg.goto(f'http://127.0.0.1:8765/dctest/{dev}.html'); time.sleep(4)
        for name,clicks in FLOWS.items():
            if pg.locator('text=回主界面').count(): pg.click('text=回主界面')
            time.sleep(.4)
            for c in clicks[:-1]: pg.click(f'button[aria-label="{c}"]'); time.sleep(.5)
            pg.click(f'button[aria-label="{clicks[-1]}"]'); pg.evaluate(SAMPLER); time.sleep(3.3)
            L=pg.evaluate('window.__L'); time.sleep(3)
            n=len(L[0]['l']); errs=[]
            # 找到画完那一帧（所有线不透明度为 1 且尺寸不再变）
            full=[fr for fr in L if all(x[4]>0.99 for x in fr['l'])]
            if not full: errs.append('没有一帧画完整'); fin=L[-1]['l']
            else: fin=full[-1]['l']
            for k in range(n):
                seq=[fr['l'][k] for fr in L]
                F=fin[k]; horiz = F[2] > F[3]
                thick=[q[3] if horiz else q[2] for q in seq if (q[2]>0.5 and q[3]>0.5)]
                diag = min(F[2],F[3])>3
                if not diag and thick and (max(thick)-min(thick))>0.6: errs.append(f'线{k}粗细变了 {min(thick):.1f}-{max(thick):.1f}')
                ln=[(q[2] if horiz else q[3]) for q in seq]
                if not diag and any(ln[i+1]<ln[i]-0.5 for i in range(len(ln)-1) if seq[i+1][4]>0.99 and seq[i][4]>0.99): errs.append(f'线{k}长度回缩')
                # 生长过程中不越出最终位置
                for q in seq:
                    if q[2]>0.5 and q[3]>0.5 and (q[0]<F[0]-0.6 or q[1]<F[1]-0.6 or q[0]+q[2]>F[0]+F[2]+0.6 or q[1]+q[3]>F[1]+F[3]+0.6):
                        errs.append(f'线{k}越界'); break
            t_full = full[0]['t'] if full else -1
            print(f'{dev} {name}: {n} 根线, 画完 {t_full:.0f}ms, 问题 {len(errs)} {errs[:4]}')
            bad+=len(errs)
        pg.close()
    b.close()
print('问题总数', bad)
