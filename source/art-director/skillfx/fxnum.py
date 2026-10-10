import glob,pathlib,time
from playwright.sync_api import sync_playwright
url=pathlib.Path('skillfx/index.html').resolve().as_uri()
J="""(a)=>{const [k,o,t]=a;fx.seek(k,o,t);const ps=fx.pieces().map(p=>p.userData.ch+'@'+p.position.x.toFixed(2)+','+p.position.y.toFixed(2)+','+p.position.z.toFixed(2)+(p.visible?'':'(隐)')+(p.scale.y<.99?'(扁'+p.scale.y.toFixed(2)+')':''));
 const it=fx.items().filter(o=>o.visible).length; return t+'s: '+ps.join(' ')+' | 可见特效 '+it}"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0],args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':600,'height':480}); pg.goto(url); pg.wait_for_function("()=>window.fx"); time.sleep(1)
    for k,o,ts in [('jianta',0,[0,.3,.6,1.55,1.75,3.4]),('jianta',1,[2.1,2.3,4]),('hujia',0,[0,.9,1.4,3.2]),('hujia',2,[0,1.3,2.0,3.2]),('qishe',1,[0,1.5,2.9]),('juma',2,[0,1.1,3.2])]:
        for t in ts: print(k,o,pg.evaluate(J,[k,o,t]))
    # 象腿落地那一刻的高度
    print('leg y at impact', pg.evaluate("()=>{fx.seek('jianta',0,1.55);const L=fx.items().find(o=>o.type==='Group'&&o.children.length>=5);return L.position.y.toFixed(3)}"))
    print('leg y at 1.2', pg.evaluate("()=>{fx.seek('jianta',0,1.2);const L=fx.items().find(o=>o.type==='Group'&&o.children.length>=5);return L.position.y.toFixed(3)}"))
    b.close()
