import time,glob,pathlib,sys,json
from playwright.sync_api import sync_playwright
url=pathlib.Path('skillfx/index.html').resolve().as_uri()
SK=sys.argv[1].split(',') if len(sys.argv)>1 else ['jianta','qishe','hujia','juma']
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':900,'height':720}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:200])); pg.on('console',lambda m: m.type=='error' and errs.append(m.text[:200]))
    pg.goto(url); pg.wait_for_function("()=>window.fx"); time.sleep(1.5)
    for k in SK:
        for o in range(3):
            d=pg.evaluate(f"()=>fx.seek('{k}',{o},0)")
            ts=[round(d*f,2) for f in (0.12,0.3,0.45,0.55,0.65,0.8,0.95)]
            for i,t in enumerate(ts):
                pg.evaluate(f"()=>fx.seek('{k}',{o},{t})"); pg.screenshot(path=f'skillfx/frames/{k}_{o}_{i}.png')
            print(k,o,'dur',round(d,2),ts)
    print('errors',errs)
    b.close()
