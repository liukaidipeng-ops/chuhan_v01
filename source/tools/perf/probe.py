import sys, time, subprocess, json, random
from playwright.sync_api import sync_playwright
site, qual = sys.argv[1], sys.argv[2]
port = 8300 + random.randint(0, 40)
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s'));" % qual)
        pg = c.new_page()
        pg.goto(f'http://127.0.0.1:{port}/', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        time.sleep(2)
        pg.evaluate("window.__xq.startGame('ai','r',{undo:0,total:0,step:0,hints:1,level:'mid',bf:1},{intro:false})"); time.sleep(10)
        pg.screenshot(path='shot_'+qual+'.png'); print(pg.evaluate(open(sys.argv[3]).read()) if len(sys.argv) > 3 else pg.evaluate("""(() => { const C = __xq.Core, r = C.renderer, S = C.scene;
          const res = {}; r.render(S, C.camera); res.calls = r.info.render.calls; res.tris = r.info.render.triangles;
          C.sun.castShadow = false; r.render(S, C.camera); res.callsNoSh = r.info.render.calls; C.sun.castShadow = true;
          let vis = 0, mesh = 0; const by = {}; S.traverseVisible(o => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) { vis++; let q = o; while (q.parent && q.parent !== S) q = q.parent; const k = q.name || q.type + ':' + (q.children.length); by[k] = (by[k] || 0) + 1; } });
          res.visibleDrawables = vis; res.top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12); res.updaters = C.nUpdaters; return JSON.stringify(res); })()"""))
        b.close()
finally: http.terminate()
