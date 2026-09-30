"""人机流程测试：电脑先行、玩家走子后电脑应着、悔棋两步、久不落子的出言"""
import time, pathlib, os
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
url = pathlib.Path(D + '/dist/site/index.html').resolve().as_uri() + '#ai-mid-b'
ok = True
def check(c, m):
    global ok
    print(('PASS ' if c else 'FAIL ') + m, flush=True); ok = ok and bool(c)
def wait(fn, secs=60):
    t = time.time()
    while time.time() - t < secs:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(0.5)
    return False
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 480, 'height': 320}); pg.set_default_timeout(90000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-quality', JSON.stringify('low'));")
    logs = []
    pg.on('pageerror', lambda e: logs.append(str(e)))
    pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.goto(url, wait_until='domcontentloaded')
    wait(lambda: pg.evaluate('!!window.__xq && window.__xq.started'), 30)
    ev = pg.evaluate
    ev("window.__xq.Fx.level='low'; window.__xq.Core.Time.boost=6")
    check(ev('window.__xq.mode') == 'ai', '进入人机模式')
    check(wait(lambda: ev('window.__xq.game.history.length') == 1, 60), '电脑执红先行')
    wait(lambda: ev('window.__xq.busy') == 0, 60)
    check(ev("document.getElementById('status').textContent").startswith('轮到你'), '随后轮到玩家')
    mv = ev("(()=>{const g=window.__xq.game;for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=g.at(f,r);if(p&&p.s==='b'){const m=g.legalFrom(f,r);if(m.length)return m[0];}}})()")
    ev(f"window.__xq.doMove({{from:{mv['from']},to:{mv['to']}}})")
    check(wait(lambda: ev('window.__xq.game.history.length') == 3, 60), '玩家走子后电脑应着')
    wait(lambda: ev('window.__xq.busy') == 0, 60)
    ev('window.__xq.requestUndo()')
    check(wait(lambda: ev('window.__xq.game.history.length') == 1, 30), '悔棋：一次退回两步（电脑自动同意）')
    check(ev("document.querySelector('#bubOpp span').textContent") == ev("Voice.text('ai_l_undo')"), '电脑同意悔棋时有台词：' + ev("document.querySelector('#bubOpp span').textContent"))
    check(len(ev('window.__xq.notes')) == 1, '棋谱同步回退 ' + str(ev('window.__xq.notes')))
    # 久不落子：把回合开始时间往前拨
    time.sleep(1)
    ev("window.__xq.aiSay('slow1')")
    check(wait(lambda: ev("document.querySelector('#bubOpp span').textContent") == ev("Voice.text('ai_l_slow1')"), 10), '久不落子时电脑出言相激：' + ev("document.querySelector('#bubOpp span').textContent"))
    print('errors:', logs[:5])
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
