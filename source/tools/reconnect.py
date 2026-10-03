"""断线重连 / 回到对局 测试：本地 MQTT 中继（可杀掉重启）+ 本地 HTTP + 两个浏览器
覆盖：中继断开 → 双方显示断网、时钟暂停 → 中继恢复后自动续局；丢一步棋 → 心跳对账补发；
系统断网事件 → 立刻显示断网、恢复后续局；大厅「回到对局」（客人、房主、本地揭棋、本地兵法、人机）"""
import time, subprocess, json, sys
from playwright.sync_api import sync_playwright

D = '/home/claude/chuhan_v01/source'
def broker():
    return subprocess.Popen(['node', 'tools/mqttsrv.js'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
mq = broker()
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8000', '--bind', '127.0.0.1'], cwd=D + '/dist/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
BASE = 'http://127.0.0.1:8000/'
args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
ok = True
def check(cond, msg):
    global ok
    print(('PASS ' if cond else 'FAIL ') + msg, flush=True)
    ok = ok and bool(cond)
def wait(fn, secs=30, step=0.4):
    t = time.time()
    while time.time() - t < secs:
        try:
            if fn(): return True
        except Exception:
            pass
        time.sleep(step)
    return False
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-autostart','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
STATUS = "document.getElementById('statusT').textContent"
IDLE = "window.__xq.busy===0 && window.__xq.started"
HL = "window.__xq.game.history.length"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=args)
        b2 = p.chromium.launch(args=args)
        logs = {}
        def page(name, url, br):
            c = br.new_context(viewport={'width': 480, 'height': 320})
            c.add_init_script(INIT)
            pg = c.new_page(); pg.set_default_timeout(90000)
            logs.setdefault(name, [])
            pg.on('console', lambda m: logs[name].append(m.text) if m.type in ('error',) else None)
            pg.on('pageerror', lambda e: logs[name].append('PAGEERROR ' + str(e)))
            pg.goto(url, wait_until='domcontentloaded')
            wait(lambda: pg.evaluate('!!window.__xq'), 30)
            return pg, c
        nav = [0]
        def goto(pg, url):
            # 每次带一个不同的查询参数，保证是整页重新载入（只改 # 不会重载）
            nav[0] += 1
            u = url.split('#')
            url2 = u[0] + ('&' if '?' in u[0] else '?') + 'n=' + str(nav[0]) + ('#' + u[1] if len(u) > 1 else '')
            pg.goto(url2, wait_until='domcontentloaded')
            wait(lambda: pg.evaluate('!!window.__xq'), 30)
        ev = lambda pg, js: pg.evaluate(js)
        fast = lambda pg: ev(pg, "window.__xq.Fx.full=false; window.__xq.Core.Time.boost=6")

        A, ctxA = page('A', BASE, b)
        A.evaluate("document.querySelector('#bCreate').click()")
        A.evaluate("""['[data-k=v] [data-v=\"std\"]','[data-k=undo] [data-v=\"1\"]','[data-k=side] [data-v=\"r\"]','[data-k=total] [data-v=\"15\"]','[data-k=step] [data-v=\"0\"]'].forEach(q=>document.querySelector(q).click())""")
        A.evaluate("document.querySelector('#bCreateGo').click()")
        check(wait(lambda: '·' not in A.inner_text('#roomCode'), 20), '房主拿到房间码')
        code = A.inner_text('#roomCode').strip()
        check(wait(lambda: '等待对手' in A.inner_text('#waitNote'), 20), f'房主线路已连接 ({code})')
        B, ctxB = page('B', BASE + '?room=' + code, b2)
        check(wait(lambda: ev(B, "!document.getElementById('hud').classList.contains('hidden')"), 40), '客人通过链接入局')
        check(wait(lambda: ev(A, "!document.getElementById('hud').classList.contains('hidden')"), 20), '房主进入对局')
        for pg in (A, B): fast(pg)
        wait(lambda: ev(A, IDLE) and ev(B, IDLE) and '轮到你' in ev(A, STATUS), 40)
        ev(A, "window.__xq.doMove({from:[7,2],to:[4,2]})")
        check(wait(lambda: ev(B, HL) == 1, 20), '客人收到第 1 步')
        wait(lambda: ev(B, IDLE) and '轮到你' in ev(B, STATUS), 40)
        ev(B, "window.__xq.doMove({from:[7,9],to:[6,7]})")
        check(wait(lambda: ev(A, HL) == 2, 20), '房主收到第 2 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)

        # ---- 1. 中继断开：双方都显示断网、时钟暂停；中继恢复后自动续局 ----
        mq.kill(); mq.wait()
        check(wait(lambda: '网络断开' in ev(A, STATUS) and '网络断开' in ev(B, STATUS), 20), '中继断开后双方状态栏显示“网络断开，正在重连”')
        c0 = ev(A, "window.__xq.clock.r"); time.sleep(2.5); c1 = ev(A, "window.__xq.clock.r")
        check(abs(c0 - c1) < 1, f'断网期间房主（轮到他）的时钟暂停 {c0:.0f} → {c1:.0f}')
        check(ev(A, "document.getElementById('netDot').classList.contains('bad')"), '断网时网络指示灯变红')
        mq = broker()
        check(wait(lambda: ev(A, "window.__xq.Net.lineOk && window.__xq.Net.peerState==='ok'") and ev(B, "window.__xq.Net.lineOk && window.__xq.Net.peerState==='ok'"), 45), '中继恢复后双方自动重连、互相看到对方在线')
        check(wait(lambda: '轮到你' in ev(A, STATUS), 20), '房主状态恢复“轮到你走” → ' + ev(A, STATUS))
        time.sleep(1); c2 = ev(A, "window.__xq.clock.r"); time.sleep(1.2); c3 = ev(A, "window.__xq.clock.r")
        check(c2 - c3 > 500, f'重连后时钟继续走 {c2:.0f} → {c3:.0f}')
        ev(A, "window.__xq.doMove({from:[1,0],to:[2,2]})")
        check(wait(lambda: ev(B, HL) == 3, 20), '重连后继续对局：客人收到第 3 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)

        # ---- 2. 丢了一步棋：心跳对账发现步数不一致 → 自动补发 ----
        ev(B, """(()=>{ const N = window.__xq.Net, orig = N.send; window.__dropped = 0;
            N.send = function(o){ if (o && o.t === 'move' && !window.__dropped) { window.__dropped = 1; N.send = orig; return true; } return orig.apply(N, arguments); }; })()""")
        wait(lambda: '轮到你' in ev(B, STATUS), 20)
        ev(B, "window.__xq.doMove({from:[1,9],to:[2,7]})")
        time.sleep(1.2)
        check(ev(B, "window.__dropped") == 1 and ev(A, HL) == 3, '客人的第 4 步在路上丢了（房主还停在第 3 步）')
        check(wait(lambda: ev(A, HL) == 4, 25), '心跳对账后自动补发，房主收到第 4 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)

        # ---- 2b. 悔棋“同意”的回复丢了：房主已悔，客人靠对账照样悔棋（不会把那步又补发回去） ----
        ev(A, """(()=>{ const N = window.__xq.Net, orig = N.send; window.__droppedU = 0;
            N.send = function(o){ if (o && o.t === 'undoRes' && !window.__droppedU) { window.__droppedU = 1; N.send = orig; return true; } return orig.apply(N, arguments); }; })()""")
        ev(B, "window.__xq.requestUndo()")
        check(wait(lambda: ev(A, "!document.getElementById('mAsk').classList.contains('hidden')"), 15), '房主收到悔棋请求')
        A.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(A, HL) == 3, 15) and ev(A, "window.__droppedU") == 1, '房主同意并悔棋，回复在路上丢了')
        check(wait(lambda: ev(B, HL) == 3 and ev(B, IDLE), 30), '客人靠心跳对账照样悔棋（双方都回到第 3 步）')
        time.sleep(4)
        check(ev(A, HL) == 3 and ev(B, HL) == 3, '悔掉的那步没有被补发回来')
        wait(lambda: '轮到你' in ev(B, STATUS), 20)
        ev(B, "window.__xq.doMove({from:[1,9],to:[2,7]})")
        check(wait(lambda: ev(A, HL) == 4, 20), '客人重新走第 4 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)

        # ---- 3. 系统报告断网（手机切网络）→ 立刻显示断网；恢复后续局 ----
        ctxB.set_offline(True)
        ev(B, "window.dispatchEvent(new Event('offline'))")
        check(wait(lambda: '网络断开' in ev(B, STATUS), 10), '客人断网：状态栏立刻显示断网')
        check(wait(lambda: '对手掉线' in ev(A, STATUS), 25), '房主看到“对手掉线，等待重连”')
        a0 = ev(A, "window.__xq.clock.r"); time.sleep(2); a1 = ev(A, "window.__xq.clock.r")
        check(abs(a0 - a1) < 1, '对手掉线时房主时钟暂停')
        ctxB.set_offline(False)
        ev(B, "window.dispatchEvent(new Event('online'))")
        check(wait(lambda: ev(B, "window.__xq.Net.lineOk") and ev(A, "window.__xq.Net.peerState==='ok'"), 30), '网络恢复后客人自动重连')
        check(wait(lambda: '轮到你' in ev(A, STATUS), 20), '房主状态恢复')
        ev(A, "window.__xq.doMove({from:[0,0],to:[0,1]})")
        check(wait(lambda: ev(B, HL) == 5, 20), '恢复后继续对局：客人收到第 5 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)

        # ---- 4. 客人关掉页面、从首页「回到对局」回来 ----
        goto(B, BASE)
        check(wait(lambda: ev(B, "!document.getElementById('resume').classList.contains('hidden')"), 10), '客人回到首页：大厅出现「回到对局」')
        info = ev(B, "document.getElementById('resumeInfo').textContent")
        check(code in info and '象棋' in info, '入口写明房间与玩法：' + info)
        ev(B, "document.getElementById('bResume').click()")
        check(wait(lambda: ev(B, "!!window.__xq.started && window.__xq.mode==='guest'") and ev(B, HL) == 5, 40), '客人点「回到对局」重新入座，棋局 5 步')
        fast(B)
        wait(lambda: ev(B, IDLE) and '轮到你' in ev(B, STATUS), 40)
        ev(B, "window.__xq.doMove({from:[0,9],to:[0,8]})")
        check(wait(lambda: ev(A, HL) == 6, 20), '回来后继续下：房主收到第 6 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)

        # ---- 5. 房主离开（中继重启、房间快照丢失）→ 首页「回到对局」用本机存的棋局恢复 ----
        goto(A, BASE)
        mq.kill(); mq.wait(); mq = broker()
        check(wait(lambda: ev(A, "!document.getElementById('resume').classList.contains('hidden')"), 10), '房主回到首页：大厅出现「回到对局」')
        ev(A, "document.getElementById('bResume').click()")
        check(wait(lambda: ev(A, "!!window.__xq.started && window.__xq.mode==='host'") and ev(A, HL) == 6, 40), '房主点「回到对局」：中继丢了快照，用本机存的棋局恢复（6 步）')
        fast(A)
        check(wait(lambda: ev(A, "window.__xq.Net.peerState==='ok'") and ev(B, "window.__xq.Net.peerState==='ok'"), 45), '双方重新连上')
        wait(lambda: ev(A, IDLE) and '轮到你' in ev(A, STATUS), 40)
        ev(A, "window.__xq.doMove({from:[1,2],to:[1,1]})")
        check(wait(lambda: ev(B, HL) == 7, 25), '房主恢复后继续下：客人收到第 7 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 40)
        same = ev(A, "JSON.stringify(window.__xq.game.history.map(h=>[h.from,h.to]))") == ev(B, "JSON.stringify(window.__xq.game.history.map(h=>[h.from,h.to]))")
        check(same, '双方棋谱完全一致')

        # ---- 6. 终局后不再出现入口 ----
        ev(A, "document.getElementById('tResign').click()")
        wait(lambda: ev(A, "!document.getElementById('mAsk').classList.contains('hidden')"), 10)
        ev(A, "document.getElementById('askYes').click()")
        check(wait(lambda: ev(B, "!!window.__xq.game.result"), 20), '房主认输，客人收到结果')
        time.sleep(2)
        check(ev(A, "JSON.parse(localStorage.getItem('xq3d-resume')||'{}').done") == True, '终局后记录标记为已结束')
        goto(B, BASE)
        check(ev(B, "document.getElementById('resume').classList.contains('hidden')"), '已结束的对局不再显示「回到对局」')

        # ---- 7. 本地揭棋：随机布局也能原样恢复 ----
        C, ctxC = page('C', BASE + '#jq', b)
        fast(C)
        wait(lambda: ev(C, IDLE), 40)
        for m in ("{from:[7,2],to:[4,2]}", "{from:[7,9],to:[6,7]}", "{from:[1,0],to:[2,2]}"):
            wait(lambda: ev(C, IDLE), 40)
            ev(C, f"window.__xq.doMove({m})")
        wait(lambda: ev(C, IDLE) and ev(C, HL) == 3, 40)
        time.sleep(2)
        BOARD = "JSON.stringify(window.__xq.game.board.map(r=>r.map(p=>p?p.s+p.t+(p.h?'h':''):'')))"
        before = ev(C, BOARD); rvs = ev(C, "JSON.stringify(window.__xq.game.history.map(h=>h.rv||''))")
        goto(C, BASE)
        check(wait(lambda: ev(C, "!document.getElementById('resume').classList.contains('hidden')"), 10), '本地揭棋：首页出现「回到对局」 ' + ev(C, "document.getElementById('resumeInfo').textContent"))
        ev(C, "document.getElementById('bResume').click()")
        check(wait(lambda: ev(C, "!!window.__xq.started && window.__xq.mode==='local'") and ev(C, HL) == 3, 30), '本地揭棋恢复 3 步')
        check(ev(C, BOARD) == before and ev(C, "JSON.stringify(window.__xq.game.history.map(h=>h.rv||''))") == rvs, '暗子布局、翻开的兵种与离开前完全一致')

        # ---- 8. 本地兵法：升级、行动都能恢复 ----
        goto(C, BASE + '#bf')
        fast(C)
        wait(lambda: ev(C, IDLE), 40)
        ev(C, "window.__xq.doBF({k:'up',at:[4,3]})"); wait(lambda: ev(C, IDLE), 40)
        ev(C, "window.__xq.doBF({k:'mv',from:[1,2],to:[1,9]})"); wait(lambda: ev(C, IDLE), 40)
        time.sleep(2)
        BF = "JSON.stringify([window.__xq.game.entries.length, window.__xq.game.merit, window.__xq.game.at(4,3).lv, window.__xq.game.at(1,9) && window.__xq.game.at(1,9).xp])"
        bf0 = ev(C, BF)
        goto(C, BASE)
        check(wait(lambda: '技能模式' in ev(C, "document.getElementById('resumeInfo').textContent") and ev(C, "!document.getElementById('resume').classList.contains('hidden')"), 10), '本地兵法：首页出现「回到对局」')
        ev(C, "document.getElementById('bResume').click()")
        check(wait(lambda: ev(C, "!!window.__xq.started && !!window.__xq.game.bf"), 30) and ev(C, BF) == bf0, '兵法恢复：步数、军功、等级、甲片一致 ' + bf0)

        # ---- 9. 人机：轮到电脑时恢复后电脑接着走 ----
        goto(C, BASE + '#ai-easy-r')
        fast(C)
        wait(lambda: ev(C, IDLE) and '轮到你' in ev(C, STATUS), 40)
        ev(C, "window.__xq.doMove({from:[7,2],to:[4,2]})")
        check(wait(lambda: ev(C, HL) == 2, 60), '人机：电脑应了一手')
        time.sleep(2)
        goto(C, BASE)
        check(wait(lambda: '人机' in ev(C, "document.getElementById('resumeInfo').textContent"), 10), '人机：首页出现「回到对局」 ' + ev(C, "document.getElementById('resumeInfo').textContent"))
        ev(C, "document.getElementById('bResumeX').click()")
        check(ev(C, "document.getElementById('resume').classList.contains('hidden') && !localStorage.getItem('xq3d-resume')"), '点 × 不再显示，记录清掉')

        for k, v in logs.items():
            bad = [x for x in v if 'favicon' not in x and 'WebSocket' not in x and 'ERR_INTERNET_DISCONNECTED' not in x]
            check(not bad, f'{k} 无报错 ' + ('' if not bad else str(bad[:4])))
        b.close(); b2.close()
finally:
    mq.kill(); http.kill()
print('ALL PASS' if ok else 'SOME FAILED')
