# 不真画，只数：游戏每秒想画几帧、每帧脚本花多少（CPU 降速 4 倍）
import sys, time, subprocess, json, random
from playwright.sync_api import sync_playwright
site = sys.argv[1]; thr = float(sys.argv[2]) if len(sys.argv) > 2 else 4
port = 8350 + random.randint(0, 40)
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
INIT = """localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid'));
window.__pf = { raf: 0, draws: 0 }; const _raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => _raf(t => { __pf.raf++; f(t); });"""
def metrics(cdp): return {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')
        c.add_init_script(INIT); pg = c.new_page(); cdp = c.new_cdp_session(pg); cdp.send('Performance.enable')
        pg.goto(f'http://127.0.0.1:{port}/', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        time.sleep(2)
        pg.evaluate("window.__xq.startGame('ai','r',{undo:0,total:0,step:0,hints:1,level:'mid',bf:1},{intro:false})"); time.sleep(10)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()"); time.sleep(2)
        pg.evaluate("(() => { const C = __xq.Core, r = C.renderer; r.render = (s) => { if (s === C.scene) __pf.draws++; }; })()")
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': thr})
        def run(label, js='', secs=6):
            if js: pg.evaluate(js)
            time.sleep(1); pg.evaluate("__pf.raf = __pf.draws = 0"); m0 = metrics(cdp); time.sleep(secs); m1 = metrics(cdp)
            r = pg.evaluate("[__pf.raf, __pf.draws]")
            print(f"{label}: rAF {r[0]/secs:.0f}/秒, 想画 {r[1]/secs:.1f} 帧/秒, 主线程 {100*(m1['TaskDuration']-m0['TaskDuration'])/secs:.0f}%, 脚本 {100*(m1['ScriptDuration']-m0['ScriptDuration'])/secs:.0f}%, 每帧脚本 {1000*(m1['ScriptDuration']-m0['ScriptDuration'])/max(r[1],1):.1f}ms", flush=True)
        run('对局静止 省电开', '__xq.Core.setEco(true)')
        run('对局静止 省电关', '__xq.Core.setEco(false)')
        run('对局静止 省电开 关轮到谁格线', "__xq.Core.setEco(true); try { TurnGlow.set(null) } catch (e) {}")
        pg.evaluate("__xq.Core.setEco(true)")
        pg.evaluate("document.getElementById('lobby').classList.remove('hidden')"); run('大厅（盖着）')
        b.close()
finally: http.terminate()
