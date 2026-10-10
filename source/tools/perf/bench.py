# 优化部基准：手机尺寸 + CPU 降速，按场景每秒采样
# 用法：bench.py <site> <eco 0|1> <降速倍数> <stub|real> <画质> <输出.json>
import sys, time, subprocess, json, random
from playwright.sync_api import sync_playwright
site, eco, thr, stub, qual, outp = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4] == 'stub', sys.argv[5], sys.argv[6]
port = 8250 + random.randint(0, 40)
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
INIT = """
localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-eco', JSON.stringify(ECO)); localStorage.setItem('xq3d-quality', JSON.stringify('QUAL'));
window.__stub = STUB;
window.__pf = { raf: 0, draws: 0, real: 0, calls: 0, tris: 0, lt: [], hooked: false };
const _raf = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = f => _raf(t => { __pf.raf++; f(t); });
try { new PerformanceObserver(l => { for (const e of l.getEntries()) __pf.lt.push(e.duration); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
const hk = setInterval(() => { const C = window.__xq && __xq.Core; if (!C || __pf.hooked) return; const r = C.renderer, o = r.render.bind(r); let k = 0;
  r.render = (s, c) => { if (s !== C.scene) return o(s, c); __pf.draws++; if (window.__stub && (k++ % 15)) return; o(s, c); __pf.real++; __pf.calls += r.info.render.calls; __pf.tris += r.info.render.triangles; };
  __pf.hooked = true; clearInterval(hk); }, 20);
""".replace('ECO', eco).replace('QUAL', qual).replace('STUB', 'true' if stub else 'false')
TAKE = "(() => { const p = __pf, x = __xq; const r = { raf: p.raf, draws: p.draws, real: p.real, calls: p.calls, tris: p.tris, lt: p.lt.slice(), think: x ? x.aiThinking : false, busy: x ? !!x.busy : false, ended: x && x.game ? !!x.game.result : false }; p.raf = p.draws = p.real = p.calls = p.tris = 0; p.lt = []; return r; })()"
out = []
def sample(pg, cdp, tag, secs):
    pg.evaluate(TAKE); m0 = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
    for i in range(int(secs)):
        time.sleep(1)
        r = pg.evaluate(TAKE); m1 = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
        r.update(tag=tag, task=m1['TaskDuration'] - m0['TaskDuration'], script=m1['ScriptDuration'] - m0['ScriptDuration'], heap=m1['JSHeapUsedSize'] / 1e6)
        if tag == 'game': r['tag'] = 'think' if r['think'] else ('anim' if r['busy'] else 'idle-mid')
        m0 = m1; out.append(r)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36')
        c.add_init_script(INIT)
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        cdp = c.new_cdp_session(pg); cdp.send('Performance.enable'); cdp.send('Emulation.setCPUThrottlingRate', {'rate': thr})
        t0 = time.time(); pg.goto(f'http://127.0.0.1:{port}/', wait_until='commit')
        while time.time() - t0 < 180 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.1)
        print('READY', round(time.time() - t0, 1), pg.evaluate("JSON.stringify((e => ({dcl: Math.round(e.domContentLoadedEventEnd), load: Math.round(e.loadEventEnd)}))(performance.getEntriesByType('navigation')[0]))"), flush=True)
        time.sleep(3)
        sample(pg, cdp, 'lobby', 10)
        pg.evaluate("window.__xq.startGame('ai','r',{undo:0,total:0,step:0,hints:1,level:'mid',bf:1},{intro:false})"); time.sleep(8)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()"); time.sleep(3)
        print('INFO', pg.evaluate("JSON.stringify((() => { const r = __xq.Core.renderer; return { pr: r.getPixelRatio(), w: r.domElement.width, h: r.domElement.height, q: __xq.Core.quality, eco: __xq.Core.ECO, shadow: __xq.Core.sun.castShadow, geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: r.info.programs.length, upd: __xq.Core.nUpdaters }; })())"), flush=True)
        sample(pg, cdp, 'idle-start', 10)
        PLAY = """(() => { const x = __xq, g = x.game; if (!g || g.result || x.busy || x.aiThinking || g.turn !== 'r') return 'wait';
          const ms = []; for (let f = 0; f < 9; f++) for (let r = 0; r < 10; r++) for (const m of g.legalFrom(f, r)) ms.push(m);
          if (!ms.length) return 'none'; const cap = ms.filter(m => g.at(m.to[0], m.to[1])); const pool = cap.length && Math.random() < 0.7 ? cap : ms;
          const m = pool[Math.floor(Math.random() * pool.length)]; x.doBF({ k: 'mv', from: m.from, to: m.to }); return 'moved'; })()"""
        tend = time.time() + 120; nm = 0
        while time.time() < tend:
            try:
                if pg.evaluate(PLAY) == 'moved': nm += 1
            except Exception as e: print('play err', e)
            sample(pg, cdp, 'game', 2)
            if out[-1]['ended']: break
        print('MOVES', nm, flush=True)
        t1 = time.time()
        while time.time() - t1 < 30 and pg.evaluate("__xq.busy || __xq.aiThinking"): time.sleep(0.5)
        sample(pg, cdp, 'idle', 10)
        print('INFO2', pg.evaluate("JSON.stringify((() => { const r = __xq.Core.renderer; return { geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: r.info.programs.length, upd: __xq.Core.nUpdaters }; })())"), flush=True)
        if not pg.evaluate("!!__xq.game.result"): pg.evaluate("__xq.finishGame({ winner: 'r', loser: 'b', reason: 'mate' })")
        sample(pg, cdp, 'ending', 25)
        print('ERRS', errs[:5])
        b.close()
finally: http.terminate()
json.dump(out, open(outp, 'w'))
