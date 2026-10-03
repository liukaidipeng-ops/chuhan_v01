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
        SEATS = "[...document.querySelectorAll('#roomSeats .seat')].map(x => x.className + '|' + x.textContent).join(' / ')"
        check(wait(lambda: '对手' in ev(A, SEATS) and 'empty' not in ev(A, SEATS), 20), '房主的房间界面看到对手入座 ' + ev(A, SEATS))
        check(wait(lambda: ev(B, "!document.getElementById('pWait').classList.contains('hidden')") and '房主' in ev(B, SEATS) and '你' in ev(B, SEATS), 10), '加入方也进到房间界面，看到房主和自己 ' + ev(B, SEATS))
        check('后开局' in ev(A, "document.getElementById('waitNote').textContent"), '房间里倒数开局')
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
        # 带密码的公开房间：大厅里带锁；密码错进不去，密码对才入座；观战也要密码
        click(A, '#bBack2'); click(A, '#bCreate')
        ev(A, "document.querySelector('#pCreate .seg[data-k=pub] button[data-v=\"1\"]').click(); const c=document.getElementById('lockOn'); c.checked=true; c.onchange(); document.getElementById('lockPw').value='虎符'")
        click(A, '#bCreateGo')
        check(wait(lambda: len(rows(C)) == 1 and '🔒' in rows(C)[0], 25), '带密码的房间在大厅里带锁 ' + json.dumps(rows(C), ensure_ascii=False))
        click(C, '#hallList li button')
        ASK = "!document.getElementById('mAsk').classList.contains('hidden') && !document.getElementById('askInRow').classList.contains('hidden')"
        check(wait(lambda: ev(C, ASK), 20), '加入时要求输入密码')
        ev(C, "document.getElementById('askIn').value='错的'; document.getElementById('askYes').click()")
        check(wait(lambda: ev(C, ASK) and '不对' in ev(C, "document.getElementById('askP').textContent"), 20), '密码错：再次要求输入')
        check('empty' in ev(A, SEATS), '密码错的人没有占到座位')
        ev(C, "document.getElementById('askIn').value='虎符'; document.getElementById('askYes').click()")
        check(wait(lambda: 'empty' not in ev(A, SEATS), 20), '密码对：入座')
        check(wait(lambda: ev(A, 'window.__xq.started') and ev(C, 'window.__xq.started'), 40), '带密码的房间正常开局')
        D2 = page(); D2.goto('http://127.0.0.1:8000/?room=' + ev(A, 'window.__xq.Net.code'), wait_until='domcontentloaded'); wait(lambda: D2.evaluate('!!window.__xq'), 30)
        check(wait(lambda: ev(D2, ASK), 30), '第三个人（观战）进门也要输入密码')
        ev(D2, "document.getElementById('askIn').value='虎符'; document.getElementById('askYes').click()")
        check(wait(lambda: ev(D2, "!document.getElementById('mName').classList.contains('hidden')"), 30), '密码对：座位已满，转入观战席取名')
        ev(D2, "document.getElementById('nameGo').click()")
        check(wait(lambda: ev(D2, "window.__xq.mode") == 'watch', 30), '入席观战')
        check(not errs, '无报错 ' + ' | '.join(errs[:3]))
        b.close()
finally:
    mq.kill(); http.kill()
print('ALL PASS' if ok else 'SOME FAILED')
