"""联机全流程测试：本地 MQTT 中继 + 本地 HTTP + 两个浏览器"""
import time, subprocess, json, os, sys
from playwright.sync_api import sync_playwright

D = '/home/claude/chuhan_v01/source'
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
        except Exception as e: pass
        time.sleep(step)
    return False
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-autostart','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=args)
        b2 = p.chromium.launch(args=args)
        logs = {}
        def page(name, url, ctx=None):
            br = b if name == 'A' else b2
            c = ctx or br.new_context(viewport={'width': 480, 'height': 320})
            c.add_init_script(INIT)
            pg = c.new_page(); pg.set_default_timeout(90000)
            logs.setdefault(name, [])
            pg.on('console', lambda m: logs[name].append(m.text) if m.type in ('error',) else None)
            pg.on('pageerror', lambda e: logs[name].append('PAGEERROR ' + str(e)))
            pg.goto(url, wait_until='domcontentloaded')
            wait(lambda: pg.evaluate('!!window.__xq'), 30)
            return pg, c
        A, ctxA = page('A', BASE)
        ev = lambda pg, js: pg.evaluate(js)
        # 房主：创建房间（悔棋 1 次，15 分钟，每步 60 秒）
        A.evaluate("document.querySelector('#bCreate').click()")
        A.evaluate("""['[data-k=undo] [data-v=\"1\"]','[data-k=side] [data-v=\"r\"]','[data-k=total] [data-v=\"15\"]','[data-k=step] [data-v=\"60\"]'].forEach(q=>document.querySelector(q).click())""")
        A.evaluate("document.querySelector('#bCreateGo').click()")
        check(wait(lambda: '·' not in A.inner_text('#roomCode'), 20), '房主拿到房间码')
        code = A.inner_text('#roomCode').strip()
        check(wait(lambda: '等待对手' in A.inner_text('#waitNote'), 20), f'房主线路已连接 ({code})')
        check(A.evaluate("!document.getElementById('qrWrap').classList.contains('hidden') && !!document.querySelector('#qr canvas')"), '显示邀请二维码')
        # 加入方：通过邀请链接直接入局
        B, ctxB = page('B', BASE + '?room=' + code)
        check(wait(lambda: ev(B, "!document.getElementById('hud').classList.contains('hidden')"), 40), '加入方通过链接自动入局')
        check(wait(lambda: ev(A, "!document.getElementById('hud').classList.contains('hidden')"), 20), '房主进入对局')
        check(ev(B, "JSON.stringify(window.__xq.opts)") == ev(A, "JSON.stringify(window.__xq.opts)"), '双方房间选项一致 ' + ev(B, "JSON.stringify(window.__xq.opts)"))
        for pg in (A, B): ev(pg, "window.__xq.Fx.full=false; window.__xq.Core.Time.boost=6")
        wait(lambda: ev(A, "document.getElementById('status').textContent.includes('轮到你')"), 75)   # 开局有落子入局过场（实时动画，无头浏览器里要多十来秒）
        check('轮到你' in ev(A, "document.getElementById('status').textContent"), '房主（红）先行')
        B.evaluate("window.__xq.doMove({from:[7,6],to:[7,5]})")
        time.sleep(1)
        check(ev(A, 'window.__xq.game.history.length') == 0, '非己方回合无法走子')
        ev(A, "window.__xq.doMove({from:[7,2],to:[4,2]})")
        check(wait(lambda: ev(B, 'window.__xq.game.history.length') == 1, 20), '加入方收到红方走子')
        wait(lambda: ev(B, "document.getElementById('status').textContent.includes('轮到你')") and ev(B, "window.__xq.busy===0"), 40)
        ev(B, "window.__xq.doMove({from:[7,9],to:[6,7]})")
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 2, 20), '房主收到黑方走子')
        wait(lambda: ev(A, "document.getElementById('status').textContent.includes('轮到你')"), 75)   # 开局有落子入局过场（实时动画，无头浏览器里要多十来秒）
        # 悔棋：房主请求，加入方同意
        IDLE = "window.__xq.busy===0 && window.__xq.started"
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)
        ev(A, "window.__xq.requestUndo()")
        check(wait(lambda: ev(B, "!document.getElementById('mAsk').classList.contains('hidden')"), 15), '加入方收到悔棋请求弹窗')
        B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 0 and ev(B, 'window.__xq.game.history.length') == 0, 30), '同意后双方都退回 2 步')
        time.sleep(1.5)
        wait(lambda: ev(A, "document.getElementById('status').textContent.includes('轮到你')"), 75)   # 开局有落子入局过场（实时动画，无头浏览器里要多十来秒）
        check(ev(A, "document.getElementById('tUndo').disabled") == True, '悔棋次数（1 次）用完后按钮禁用')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)
        # 喊话：加入方发送，房主在"对手"气泡看到
        ev(B, "window.__xq.sendEmote(2)")
        check(wait(lambda: '竖子' in ev(A, "document.querySelector('#bubOpp span').textContent") and ev(A, "document.getElementById('bubOpp').classList.contains('on')"), 10), '房主在对手气泡看到喊话')
        check('竖子' in ev(B, "document.querySelector('#bubMe span').textContent"), '加入方在自己的气泡看到喊话')
        # 加入方掉线 → 房主走一步 → 加入方重新打开链接
        ctxB.close()
        time.sleep(1)
        wait(lambda: ev(A, IDLE), 40)
        ev(A, "window.__xq.doMove({from:[1,0],to:[2,2]})")
        check(wait(lambda: ev(A, "window.__xq.Net.peerState") == 'lost', 30), '房主察觉对手掉线')
        B, ctxB = page('B2', BASE + '?room=' + code)
        # 换了浏览器（本地记录不同）：对手座位空着时，选择“接替入座”
        check(wait(lambda: ev(B, "!document.getElementById('mAsk').classList.contains('hidden')"), 40), '换设备重开链接：询问接替入座还是观战')
        B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(B, 'window.__xq.game && window.__xq.game.history.length') == 1, 40), '加入方重开链接后恢复棋局（1 步）')
        check(ev(B, "window.__xq.Net.role") == 'guest', '重连后仍为同一座位（黑方）')
        # 房主刷新页面 → 从中继恢复房间
        A.reload(wait_until='domcontentloaded')
        wait(lambda: A.evaluate('!!window.__xq'), 30)
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 1 and ev(A, "!document.getElementById('hud').classList.contains('hidden')"), 40), '房主刷新后恢复房间与棋局')
        check(wait(lambda: ev(A, "window.__xq.Net.peerState") == 'ok', 20), '房主刷新后与对手重新连上')
        for pg in (A, B): ev(pg, "window.__xq.Fx.full=false; window.__xq.Core.Time.boost=6")
        wait(lambda: ev(B, "document.getElementById('status').textContent.includes('轮到你')") and ev(B, IDLE), 40)
        ev(B, "window.__xq.doMove({from:[1,7],to:[1,3]})")
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 2, 20), '刷新后继续对弈（黑方走子到达）')
        # 暂停：加入方叫暂停 → 房主看到暂停幕、时钟停住、不能替对手继续；加入方继续 → 双方恢复；每人 3 次
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 20)
        HID = "document.getElementById('pauseOv').classList.contains('hidden')"
        ev(B, "document.getElementById('tPause').click()")
        check(wait(lambda: ev(A, "!" + HID + " && document.getElementById('pauseOv').classList.contains('opp')"), 10), '对手叫暂停：房主看到暂停幕，且没有「继续」按钮')
        CL = "JSON.stringify([Math.round(window.__xq.clock.r), Math.round(window.__xq.clock.b), Math.round(window.__xq.clock.step)])"
        c0 = ev(A, CL); time.sleep(2.5); c1 = ev(A, CL)
        check(c0 == c1, f'暂停期间时钟不走（{c0}）')
        ev(A, "document.getElementById('tPause').click()")
        check(ev(A, "!" + HID), '房主点「停」不能解除对手的暂停')
        ev(B, "document.getElementById('pzGo').click()")
        check(wait(lambda: ev(A, HID) and ev(B, HID), 10), '叫暂停的一方继续后，双方都恢复')
        for i in range(2):
            ev(B, "document.getElementById('tPause').click()"); wait(lambda: ev(A, "!" + HID), 10)
            ev(B, "document.getElementById('pzGo').click()"); wait(lambda: ev(A, HID), 10)
        ev(B, "document.getElementById('tPause').click()"); time.sleep(0.8)
        check(ev(B, HID) and ev(A, HID), '第 4 次暂停被拒绝（每人每局 3 次）')
        # 认输
        wait(lambda: ev(B, "!document.getElementById('skip').classList.contains('hidden')") == False, 20)
        B.evaluate("document.querySelector('#tResign').click()"); B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: 'resign' in json.dumps(ev(A, 'window.__xq.game.result')), 15), '认输同步到房主')
        # 再来一局：加入方跳过结算后点"再来一局"，房主此时仍在看结算动画
        wait(lambda: ev(B, "window.__xq.Ending.running"), 30)
        ev(B, "window.__xq.Ending.skip()")
        check(wait(lambda: ev(B, "!document.getElementById('endcard').classList.contains('hidden') && !!document.querySelector('#endcard .btn.red')"), 60), '加入方看到结算卡')
        ev(B, "document.querySelector('#endcard .btn.red').click()")
        check(wait(lambda: ev(A, "window.__xq.started && !window.__xq.game.result && window.__xq.game.history.length===0") and ev(B, "window.__xq.started && !window.__xq.game.result && window.__xq.game.history.length===0"), 90), '双方进入新的一局')
        check(ev(A, "document.getElementById('endcard').classList.contains('hidden')") and ev(B, "document.getElementById('endcard').classList.contains('hidden')"), '结算卡已关闭')
        for pg in (A, B): ev(pg, 'window.__xq.Core.render=true')
        time.sleep(3)
        A.screenshot(path=D + '/shots/net_A.png'); B.screenshot(path=D + '/shots/net_B.png')
        for k, v in logs.items():
            errs = [l for l in v if 'PAGEERROR' in l or 'rror' in l]
            if errs: print(k, 'errors:', errs[:5])
        b.close(); b2.close()
finally:
    mq.terminate(); http.terminate()
print('ALL PASS' if ok else 'SOME FAILED')
