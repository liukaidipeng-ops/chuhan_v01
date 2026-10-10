import sys, time, subprocess, os, base64
from playwright.sync_api import sync_playwright
site, out, v, scen = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
N = int(os.environ.get('N', '28')); FPS = 14
port = 8260 + int(v) * 3 + (1 if scen == 'fy' else 0)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': 760, 'height': 480})
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid')); localStorage.setItem('xq3d-confirm','0'); localStorage.setItem('xq3d-models','0');")
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/?nopaper&nobd&arcv={v}', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        pg.evaluate("window.__xq.startGame('local','r',{undo:9,total:0,step:0,hints:1,bf:1},{intro:false})"); time.sleep(5)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()")
        pg.evaluate("""(() => { const X = __xq, g = X.game, BF = X.BF, B = g.S.board; const up = (f, r, lv) => { const q = B[r][f]; q.lv = lv; q.hp = BF.hpOf(q.t, lv); };
          up(1, 2, 3); up(6, 0, 3); B[1][5] = B[0][5]; B[0][5] = null; X.Board.setPosition(g); X.Board.faceViewer('r'); })()""")
        time.sleep(2)
        CAMS = { 'pili': "(() => { const X = __xq, B = X.Board, V = B.pos(1, 2).constructor; const look = B.pos(1, 2).lerp(B.pos(1, 9), 0.42); look.y = B.TOP + 0.5; const pos = look.clone().add(new V(1.4, 6.6, 7.4)); X.Core.Cam.cine = true; X.Core.Cam.to(pos, look, 0.01, undefined, true); })()",
                 'fy': "(() => { const X = __xq, B = X.Board, V = B.pos(1, 2).constructor; const look = B.pos(5, 1); look.y = B.TOP + 0.4; const pos = look.clone().add(new V(0.3, 3.4, 3.4)); X.Core.Cam.cine = true; X.Core.Cam.to(pos, look, 0.01, undefined, true); })()" }
        pg.evaluate(CAMS[scen]); time.sleep(2.5)
        if scen == 'pili':
            pg.evaluate("__xq.bfClick([1, 2])"); time.sleep(1); pg.evaluate("document.querySelector('[data-sk=\"pili\"]').click()")
        else:
            pg.evaluate("__xq.bfClick([6, 0])")
        time.sleep(2)
        pg.evaluate("""(() => { const pn = performance.now.bind(performance); window.__vt = pn(); performance.now = () => window.__vt; THREE.Clock.prototype.getDelta = function () { return window.__dt || 0; }; window.__dt = 0; Core.render = false; })()""")
        for i in range(N):
            pg.evaluate(f"new Promise(res => {{ window.__vt += {1000 / FPS}; window.__dt = {1 / FPS}; requestAnimationFrame(() => {{ window.__dt = 0; res(); }}); }})")
            d = pg.evaluate("(() => { const r = Core.renderer; r.render(Core.scene, Core.camera); return r.domElement.toDataURL('image/jpeg', 0.9); })()")
            open(f"{out}/f{i:04d}.jpg", 'wb').write(base64.b64decode(d.split(',')[1]))
        print(v, scen, 'done', errs[:3], flush=True)
        b.close()
finally: http.terminate()
