import time, subprocess, sys, json
from playwright.sync_api import sync_playwright
SITE = sys.argv[3] if len(sys.argv) > 3 else 'source/dist/site'
OUT = 'shots/'; import os; os.makedirs(OUT, exist_ok=True)
which = sys.argv[1]; entry = sys.argv[2] if len(sys.argv)>2 else 'ai'
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8031', '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
vp = {'pc': {'width': 1280, 'height': 800}, 'phone': {'width': 390, 'height': 844}}[which]; mob = which=='phone'
try:
  with sync_playwright() as p:
    b = p.chromium.launch(args=args)
    c = b.new_context(viewport=vp, device_scale_factor=1, is_mobile=mob, has_touch=mob)
    c.add_init_script("localStorage.setItem('xq3d-noaudio','1');")
    pg = c.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console:'+m.text) if m.type in ('error','warning') else None)
    pg.goto('http://127.0.0.1:8031/', wait_until='domcontentloaded')
    pg.wait_for_function("document.getElementById('loading')==null || getComputedStyle(document.getElementById('loading')).display=='none' || document.getElementById('loading').classList.contains('hidden')", timeout=90000)
    time.sleep(3)
    pg.evaluate('''(() => { const P = LuoZi.play; window.__g = []; LuoZi.play = o => { const g = o.grid; o.grid = () => { const r = g(); window.__g.push(JSON.stringify(r)); setTimeout(() => window.__g.push(JSON.stringify(g())), 400); return r; }; return P(o); }; })()''')
    if entry=='ai':
      pg.evaluate("document.getElementById('bAI').click()"); time.sleep(1.5)
      pg.screenshot(path=OUT+f'{which}_{entry}_0.png')
      pg.evaluate("document.getElementById('bAIGo').click()")
    else:
      pg.evaluate("document.getElementById('bLocal').click()"); time.sleep(1.5)
      pg.screenshot(path=OUT+f'{which}_{entry}_0.png')
      pg.evaluate("document.getElementById('bCreateGo').click()")
    t0=time.time(); k=1
    while time.time()-t0<9 and k<3:
      pg.screenshot(path=OUT+f'{which}_{entry}_{k}.png'); print(k, round(time.time()-t0,2), pg.evaluate("[!!document.querySelector('body>div[aria-hidden=true]'), Core.Cam.view, +Core.Cam.phi.toFixed(3), +Core.Cam.radius.toFixed(2)]")); k+=1
    time.sleep(3)
    pg.screenshot(path=OUT+f'{which}_{entry}_end.png')
    G=pg.evaluate('window.__g'); print('pre==post ready', G[0]==G[1])
    pg.evaluate('''(() => { const g = JSON.parse(window.__g[1]); Core.Cam.view = 2; Core.Cam.setSide(Board.viewSide || 'r', true);
      const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none';
      for (const x of g.xs) { const l = document.createElement('div'); l.style.cssText = `position:absolute;left:${x-1}px;top:${g.ys[0]}px;width:2px;height:${g.ys[9]-g.ys[0]}px;background:rgba(0,180,255,.8)`; ov.appendChild(l); }
      for (const y of g.ys) { const l = document.createElement('div'); l.style.cssText = `position:absolute;left:${g.xs[0]}px;top:${y-1}px;width:${g.xs[8]-g.xs[0]}px;height:2px;background:rgba(0,180,255,.8)`; ov.appendChild(l); }
      document.body.appendChild(ov); })()''')
    time.sleep(4); pg.screenshot(path=OUT+f'{which}_{entry}_align.png')
    print('grids', len(G), 'stable-after-ready', len(G)>=3 and G[1]==G[2] or G[1:3]); print(G[1][:200] if len(G)>1 else G)
    print('cam', pg.evaluate("[Core.Cam.view, Core.Cam.phi, Core.Cam.radius, Core.Cam.target.z, Core.Cam.portrait()]"))
    print('errs', errs[:8])
    b.close()
finally:
  http.kill()
