import sys, time, subprocess, os, json, collections
from playwright.sync_api import sync_playwright
site = sys.argv[1]; scen = sys.argv[2]
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8241', '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid')); localStorage.setItem('xq3d-models','%s');" % ('1' if 'models' in scen else '0'))
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:8241/', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        time.sleep(3)
        if scen != 'lobby':
            pg.evaluate("window.__xq.startGame('local','r',{undo:9,total:0,step:0,hints:1,bf:%d},{intro:false})" % (1 if 'bf' in scen else 0)); time.sleep(8)
            pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()")
            time.sleep(2)
        info = pg.evaluate("(() => { const r = __xq.Core.renderer; const i = r.info; const pr = r.getPixelRatio(), cv = r.domElement; return JSON.stringify({ q: __xq.Core.quality, pr, w: cv.width, h: cv.height, calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, shadow: r.shadowMap.enabled, render: __xq.Core.render, sleepy: __xq.Core.sleepy }); })()")
        print(scen, info)
        print('fpsreq', pg.evaluate('new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); })'))
        b.close(); sys.exit(0)
        cdp = c.new_cdp_session(pg)
        cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 500}); cdp.send('Profiler.start')
        time.sleep(8)
        prof = cdp.send('Profiler.stop')['profile']
        nodes = {n['id']: n for n in prof['nodes']}
        cnt = collections.Counter()
        for s in prof['samples']: cnt[s] += 1
        tot = sum(cnt.values()); agg = collections.Counter()
        for nid, k in cnt.items():
            n = nodes[nid]; f = n['callFrame']; agg[(f['functionName'] or '(anon)') + ':' + str(f['lineNumber'])] += k
        idle = sum(k for nid, k in cnt.items() if nodes[nid]['callFrame']['functionName'] in ('(idle)', '(program)', '(garbage collector)'))
        print('samples', tot, 'idle/program', idle)
        for k, v in agg.most_common(18): print(f'{v/tot*100:5.1f}%  {k}')
        b.close()
finally: http.terminate()
