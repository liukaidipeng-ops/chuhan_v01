"""观战全流程测试：房主 A + 加入方 B + 观众 C（本地 MQTT 中继 + 本地 HTTP）"""
import time, subprocess, json, os, sys
from playwright.sync_api import sync_playwright

D = os.path.dirname(os.path.abspath(__file__)) + '/..'
mq = subprocess.Popen(['node', 'tools/mqttsrv.js'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8000', '--bind', '127.0.0.1'], cwd=D + '/dist/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
BASE = 'http://127.0.0.1:8000/'
args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
ok = True
def check(cond, msg):
    global ok
    print(('PASS ' if cond else 'FAIL ') + msg, flush=True)
    ok = ok and bool(cond)
def wait(fn, secs=30, step=0.5):
    t = time.time()
    while time.time() - t < secs:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(step)
    return False
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-autostart','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
try:
    with sync_playwright() as p:
        brs = {k: p.chromium.launch(args=args) for k in 'ABC'}
        logs = {}
        def page(name, url):
            c = brs[name[0]].new_context(viewport={'width': 480, 'height': 360})
            c.add_init_script(INIT)
            pg = c.new_page(); pg.set_default_timeout(90000)
            logs.setdefault(name, [])
            pg.on('console', lambda m: logs[name].append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: logs[name].append('PAGEERROR ' + str(e)))
            pg.goto(url, wait_until='domcontentloaded')
            wait(lambda: pg.evaluate('!!window.__xq'), 30)
            return pg, c
        ev = lambda pg, js: pg.evaluate(js)
        A, _ = page('A', BASE)
        A.evaluate("document.querySelector('#bCreate').click()")
        A.evaluate("""['[data-k=undo] [data-v=\"3\"]','[data-k=side] [data-v=\"r\"]','[data-k=total] [data-v=\"15\"]','[data-k=step] [data-v=\"60\"]'].forEach(q=>document.querySelector(q).click())""")
        A.evaluate("document.querySelector('#bCreateGo').click()")
        check(wait(lambda: '·' not in A.inner_text('#roomCode'), 20), '房主拿到房间码')
        code = A.inner_text('#roomCode').strip()
        B, _ = page('B', BASE + '?room=' + code)
        check(wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(A, "window.__xq.mode") == 'host', 40), '两位棋手入局')
        for pg in (A, B): ev(pg, "window.__xq.Fx.level='low'; window.__xq.Core.Time.boost=6")
        # 观众：同一链接，房间已满 → 取名入席
        C, ctxC = page('C', BASE + '?room=' + code)
        check(wait(lambda: ev(C, "!document.getElementById('mName').classList.contains('hidden')"), 40), '第三人打开链接 → 弹出“观战入席”')
        C.evaluate("document.getElementById('nameIn').value='老樵'; document.getElementById('nameGo').click()")
        check(wait(lambda: ev(C, "window.__xq.mode") == 'watch', 30), '观众进入观战模式')
        ev(C, "window.__xq.Fx.level='low'; window.__xq.Core.Time.boost=6")
        check(ev(C, "document.getElementById('tUndo').classList.contains('hidden') && document.getElementById('tResign').classList.contains('hidden') && !document.getElementById('tLaugh').classList.contains('hidden')"), '观众界面：无悔棋/认输，有“笑”')
        check(wait(lambda: ev(A, "window.__xq.Spect.count") >= 1 and ev(B, "window.__xq.Spect.count") >= 1, 20), '双方棋手看到观众入席')
        check(wait(lambda: '观战 1' in ev(A, "document.getElementById('status').textContent"), 10), '房主状态条显示“观战 1”')
        # 观众走动：走楼梯上棋盘；两位棋手都看到；房主点一下把他弹飞，30 秒内上不去
        cpid = ev(C, "window.__xq.Net.myPid")
        n = ev(C, "(()=>{const X=__xq,S=X.Spect,id=X.Net.myPid; const r=S.plan(id,{x:1,z:3,L:1}); if(!r.wp) return 0; S.walk(id,r.wp); X.Net.sendSpec({t:'go',n:'老樵',a:'n',wp:r.wp}); return r.wp.length})()")
        check(n >= 3, '观众算出上棋盘的路线（经过楼梯）: %d 个路口' % n)
        onTop = "(()=>{const p=__xq.Spect.get('%s'); return !!p && p.pos.L===1 && !p.path})()" % cpid
        check(wait(lambda: ev(C, onTop), 60), '观众自己走上了棋盘')
        check(wait(lambda: ev(A, onTop) and ev(B, onTop), 30), '两位棋手都看到观众站在棋盘上')
        check(ev(A, "window.__xq.specFlick('%s', true)" % cpid), '房主点观众：弹飞')
        banned = "(()=>{const p=__xq.Spect.get('%s'); return !!p && p.pos.L===0 && p.ban>Date.now()})()" % cpid
        check(wait(lambda: ev(C, banned) and ev(B, banned), 20), '观众和另一位棋手都收到弹飞')
        check('秒后才能再上棋盘' in (ev(C, "(__xq.Spect.plan(__xq.Net.myPid,{x:1,z:3,L:1}).err)||''") or '') or wait(lambda: '秒后才能再上棋盘' in (ev(C, "(__xq.Spect.plan(__xq.Net.myPid,{x:1,z:3,L:1}).err)||''") or ''), 6), '被弹飞后 30 秒内不能再上棋盘')
        check(ev(A, "window.__xq.Spect.count") == 1 and ev(B, "window.__xq.Spect.count") == 1, '弹飞的消息没有把棋手登记成观众')
        IDLE = "window.__xq.busy===0 && window.__xq.started"
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)
        ev(A, "window.__xq.doMove({from:[7,2],to:[4,2]})")
        check(wait(lambda: ev(C, 'window.__xq.game.history.length') == 1, 20), '观众实时看到红方走子')
        wait(lambda: ev(B, IDLE) and 'B' and ev(B, "window.__xq.game.turn") == 'b', 40)
        ev(B, "window.__xq.doMove({from:[7,9],to:[6,7]})")
        check(wait(lambda: ev(C, 'window.__xq.game.history.length') == 2, 20), '观众实时看到黑方走子')
        check(ev(C, "window.__xq.notes.join(' ')") == ev(A, "window.__xq.notes.join(' ')"), '观众棋谱与棋手一致 ' + ev(C, "window.__xq.notes.join(' ')"))
        # 观众拱火、大笑、站队
        ev(C, "document.getElementById('tChat').click()")
        ev(C, "document.querySelector('#phr button[data-i=\"1\"]').click()")
        check(wait(lambda: '将他' in ev(A, "document.getElementById('specFeed').textContent") and '将他' in ev(B, "document.getElementById('specFeed').textContent"), 10), '观众发言双方都收到')
        cp = ev(C, "window.__xq.Net.myPid")
        check(wait(lambda: ev(A, f"(()=>{{const p=window.__xq.Spect.get('{cp}');return p && p.el.classList.contains('talk') && p.el.textContent.includes('将他')}})()"), 10), '观众士兵头顶冒出气泡')
        time.sleep(3.2)
        ev(C, "document.getElementById('tLaugh').click()")
        check(wait(lambda: '哈哈' in ev(A, "document.getElementById('specFeed').textContent"), 10), '观众哈哈大笑双方可见')
        ev(C, "document.getElementById('tChat').click(); document.querySelector('#wSide button[data-v=\"r\"]').click()")
        check(wait(lambda: ev(A, f"window.__xq.Spect.get('{cp}').a") == 'r', 10), '观众站队汉军（房主处同步）')
        check(ev(A, f"window.__xq.Spect.get('{cp}').name") == '老樵', '观众自取名号同步')
        ev(C, "document.getElementById('chatClose').click()")
        # 悔棋：观众同步退回
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)
        ev(A, "window.__xq.requestUndo()")
        wait(lambda: ev(B, "!document.getElementById('mAsk').classList.contains('hidden')"), 15)
        B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(C, 'window.__xq.game.history.length') == 0, 30), '棋手悔棋后观众同步退回')
        # 认输 → 观众看到结算，可一键跳过；“继续观战”
        wait(lambda: ev(A, IDLE) and ev(B, IDLE) and ev(C, IDLE), 40)
        B.evaluate("document.querySelector('#tResign').click()"); B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: 'resign' in json.dumps(ev(C, 'window.__xq.game.result')), 20), '观众看到认输结果')
        ev(C, "document.getElementById('skip').click()")
        check(wait(lambda: ev(C, "!document.getElementById('endcard').classList.contains('hidden')"), 20), '观众一键跳过 → 立刻出结算卡')
        check('继 续 观 战' in ev(C, "document.getElementById('endcard').textContent"), '观众结算卡为“继续观战”')
        # 房主跳过并开新局 → 观众跟着进新局
        ev(A, "document.getElementById('skip').click()")
        check(wait(lambda: ev(A, "!document.getElementById('endcard').classList.contains('hidden')"), 30), '房主一键跳过到结算卡')
        ev(A, "document.querySelector('#endcard .btn.red').click()")
        check(wait(lambda: ev(C, "window.__xq.game.history.length===0 && !window.__xq.game.result && document.getElementById('endcard').classList.contains('hidden')"), 40), '新开一局，观众自动跟进')
        check(ev(C, "window.__xq.Spect.count") >= 1, '新局观众仍在桥上')
        # 观众离席
        ev(C, "document.getElementById('tExit').click()")
        ev(C, "document.getElementById('askYes').click()")
        check(wait(lambda: ev(A, "window.__xq.Spect.count") == 0, 20), '观众离席后棋手处消失')
        for k, v in logs.items():
            errs = [l for l in v if 'PAGEERROR' in l or 'rror' in l]
            if errs: print(k, 'errors:', errs[:6])
        for b in brs.values(): b.close()
finally:
    mq.terminate(); http.terminate()
print('ALL PASS' if ok else 'SOME FAILED')
