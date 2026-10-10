import time, glob, sys, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
exe = glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
f=sys.argv[1]; w,h=(1440,900) if f=='Main' else (390,844)
TS=[0,150,400,650,850,1050,1250,1450,1650,1900,2150,2400,2700,3100,3700,4300,5000]
FLOWS={'ai':['人机','开战'],'local':['本地','开始'],'wait':['联机','创建房间','开始']}
os.makedirs('dcchk',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe); pg=b.new_page(viewport={'width':w,'height':h})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:8765/dctest/{f}.html'); time.sleep(4)
    for name,clicks in FLOWS.items():
        for c in clicks[:-1]:
            pg.click(f'button[aria-label="{c}"]'); time.sleep(.6)
        fr=[pg.screenshot()]
        t0=time.time(); pg.click(f'button[aria-label="{clicks[-1]}"]')
        for t in TS[1:]:
            dt=t/1000-(time.time()-t0)
            if dt>0: time.sleep(dt)
            fr.append(pg.screenshot())
        pg.click('text=再走一遍'); time.sleep(.15); fr.append(pg.screenshot()); time.sleep(.6); fr.append(pg.screenshot())
        time.sleep(4.5); fr.append(pg.screenshot())
        pg.click('text=回主界面'); time.sleep(.6); fr.append(pg.screenshot())
        ims=[Image.open(io.BytesIO(x)) for x in fr]
        sc=0.25 if f=='Main' else 0.45; tw,th=int(w*sc),int(h*sc); cols=6 if f=='Main' else 9; rows=(len(ims)+cols-1)//cols
        M=Image.new('RGB',(cols*(tw+6),rows*(th+6)),'white')
        for i,im in enumerate(ims): M.paste(im.resize((tw,th)),((i%cols)*(tw+6),(i//cols)*(th+6)))
        M.save(f'dcchk/{f}_{name}.jpg',quality=80)
    print('errors:',errs)
    b.close()
# 跳过：点开战后 1 秒点一下
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=exe); pg=b.new_page(viewport={'width':w,'height':h})
    pg.goto(f'http://127.0.0.1:8765/dctest/{f}.html'); time.sleep(4)
    pg.click('button[aria-label="人机"]'); time.sleep(.6); pg.click('button[aria-label="开战"]'); time.sleep(1.0)
    pg.click('button[aria-label="跳过过场"]'); time.sleep(1.4); pg.screenshot(path=f'dcchk/{f}_skip.png')
    print('skip ok, 再走一遍 visible:', pg.locator('text=再走一遍').count())
    b.close()
