# 长对局内存：不真画、演出加速，连走多步，看几何体 / 贴图 / 堆是否只涨不降
import sys, time, subprocess, json, random
from playwright.sync_api import sync_playwright
site = sys.argv[1]; port = 8400 + random.randint(0, 40)
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'])
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid'));")
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        time.sleep(2)
        pg.evaluate("window.__xq.startGame('ai','r',{undo:0,total:0,step:0,hints:1,level:'easy',bf:1},{intro:false})"); time.sleep(10)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()"); time.sleep(1)
        pg.evaluate("(() => { const C = __xq.Core, r = C.renderer, o = r.render.bind(r); let k = 0; r.render = (s, c) => { if (s !== C.scene || (k++ % 20)) return; o(s, c); }; })()")
        PLAY = """(() => { const x = __xq, g = x.game; x.Core.Time.skip = true; if (!g || g.result || x.busy || x.aiThinking || g.turn !== 'r') return 'wait';
          const ms = []; for (let f = 0; f < 9; f++) for (let r = 0; r < 10; r++) for (const m of g.legalFrom(f, r)) ms.push(m);
          if (!ms.length) return 'none'; const cap = ms.filter(m => g.at(m.to[0], m.to[1])); const pool = cap.length && Math.random() < 0.6 ? cap : ms;
          const m = pool[Math.floor(Math.random() * pool.length)]; x.doBF({ k: 'mv', from: m.from, to: m.to }); return 'moved'; })()"""
        ST = "(() => { gc && gc(); const r = __xq.Core.renderer, i = r.info.memory; let n = 0; __xq.Core.scene.traverse(() => n++); return [i.geometries, i.textures, r.info.programs.length, Math.round(performance.memory.usedJSHeapSize / 1e6), n, __xq.Core.nUpdaters, __xq.game.entries.length, document.getElementsByTagName('*').length]; })()"
        print('起点 [几何体, 贴图, 着色器, 堆MB, 场景物体, 每帧回调, 行动数, 页面元素]', pg.evaluate(ST), flush=True)
        nm = 0; t1 = time.time(); last = 0; games = 0
        while time.time() - t1 < 360:
            r = pg.evaluate(PLAY)
            if r == 'moved': nm += 1
            if pg.evaluate("!!__xq.game.result") or r == 'none':
                games += 1; print('一局结束', nm, pg.evaluate(ST), flush=True)
                pg.evaluate("window.__xq.startGame('ai','r',{undo:0,total:0,step:0,hints:1,level:'easy',bf:1},{intro:false})"); time.sleep(6)
            if nm - last >= 10: last = nm; print('走了', nm, pg.evaluate(ST), flush=True)
            time.sleep(0.3)
        print('终点', nm, pg.evaluate(ST), 'ERRS', errs[:3])
        b.close()
finally: http.terminate()
