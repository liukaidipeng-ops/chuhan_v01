"""游戏大厅测试：A 建公开房间 → B 在大厅看到并点「加入」→ C 在大厅看到“对局中” → A 退出后名册清掉；私密房间不上名册"""
import time, subprocess, json, sys
from playwright.sync_api import sync_playwright
D = '/home/claude/chuhan_v01/source'
mq = subprocess.Popen(['node', 'tools/mqttsrv.js'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8000', '--bind', '127.0.0.1'], cwd=D + '/dist/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
ok = True
def check(c, m):
    global ok; print(('PASS ' if c else 'FAIL ') + m, flush=True); ok = ok and bool(c)
def wait(fn, secs=30):
    t = time.time()
    while time.time() - t < secs:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(0.4)
    return False
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        errs = []
        def page():
            c = b.new_context(viewport={'width': 480, 'height': 420}); c.add_init_script(INIT)
            pg = c.new_page(); pg.set_default_timeout(60000)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:8000/', wait_until='domcontentloaded'); wait(lambda: pg.evaluate('!!window.__xq'), 30); return pg
        A, B, C = page(), page(), page()
        ev = lambda pg, js: pg.evaluate(js)
        click = lambda pg, sel: pg.evaluate(f"document.querySelector('{sel}').click()")
        rows = lambda pg: ev(pg, "[...document.querySelectorAll('#hallList li')].map(x => x.className + '|' + x.textContent)")
        click(B, '#bHall')
        check(wait(lambda: ev(B, "!document.getElementById('pHall').classList.contains('hidden') && window.__xq.Net.hallOk")), 'B 进入游戏大厅并连上')
        check(len(rows(B)) == 0, '大厅起初没有房间')
        click(A, '#bHall'); click(A, '#bCreate')
        ev(A, "document.querySelector('#pCreate .seg[data-k=pub] button[data-v=\"1\"]').click(); document.querySelector('#pCreate .seg[data-k=v] button[data-v=std]').click(); document.querySelector('#pCreate .seg[data-k=side] button[data-v=r]').click()")
        click(A, '#bCreateGo')
        code = None
        def got():
            global code
            return len(rows(B)) == 1
        check(wait(got, 25), 'B 在大厅看到 A 的公开房间 ' + json.dumps(rows(B), ensure_ascii=False))
        check('open' in rows(B)[0] and '加 入' in rows(B)[0] and '你执黑' in rows(B)[0], '显示为等对手、可加入、告知执子')
        click(B, '#hallList li button')
        check(wait(lambda: ev(B, 'window.__xq.started') and ev(A, 'window.__xq.started'), 60), '点「加入」后双方开局')
        check(ev(B, "window.__xq.Net.role") == 'guest', 'B 为加入方')
        click(C, '#bHall')
        check(wait(lambda: len(rows(C)) == 1 and 'play' in rows(C)[0] and '观 战' in rows(C)[0], 30), 'C 在大厅看到“对局中 · 观战” ' + json.dumps(rows(C), ensure_ascii=False))
        # A 退出 → 名册清掉
        wait(lambda: ev(A, 'window.__xq.busy') == 0, 30)
        ev(A, "document.getElementById('tExit').click(); document.getElementById('askYes').click()")
        check(wait(lambda: len(rows(C)) == 0, 20), '房主退出后房间从大厅消失')
        check(wait(lambda: ev(A, "!document.getElementById('lobby').classList.contains('hidden')"), 10), '房主回到主菜单')
        # 私密房间不上名册
        click(A, '#bHall'); click(A, '#bCreate')
        ev(A, "document.querySelector('#pCreate .seg[data-k=pub] button[data-v=\"0\"]').click()")
        click(A, '#bCreateGo')
        wait(lambda: ev(A, "window.__xq.Net.lineOk"), 15); time.sleep(4)
        check(len(rows(C)) == 0, '私密房间不出现在大厅')
        check(not errs, '无报错 ' + ' | '.join(errs[:3]))
        b.close()
finally:
    mq.kill(); http.kill()
print('ALL PASS' if ok else 'SOME FAILED')
