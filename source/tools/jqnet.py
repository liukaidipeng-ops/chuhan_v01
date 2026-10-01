"""揭棋联机全流程测试：房主 A（红）+ 加入方 B（黑）+ 观众 C（本地 MQTT 中继 + 本地 HTTP）
核对：双方密钥洗牌、翻子身份一致且符合承诺、被吃暗子只有吃子方知道、观众看不到、悔棋、刷新续局、换设备入座重新洗牌。"""
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
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
IDLE = "window.__xq.busy===0 && window.__xq.started && !window.__xq.pendingJ"
try:
    with sync_playwright() as p:
        brs = {k: p.chromium.launch(args=args) for k in 'ABCD'}
        logs = {}
        def page(name, url, ctx=None):
            c = ctx or brs[name[0]].new_context(viewport={'width': 480, 'height': 360})
            if not ctx: c.add_init_script(INIT)
            pg = c.new_page(); pg.set_default_timeout(90000)
            logs.setdefault(name, [])
            pg.on('console', lambda m: logs[name].append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: logs[name].append('PAGEERROR ' + str(e)))
            pg.goto(url, wait_until='domcontentloaded')
            wait(lambda: pg.evaluate('!!window.__xq'), 30)
            return pg, c
        ev = lambda pg, js: pg.evaluate(js)
        fast = lambda pg: ev(pg, "window.__xq.Fx.level='low'; window.__xq.Core.Time.boost=8")
        A, ctxA = page('A', BASE)
        A.evaluate("document.querySelector('#bCreate').click()")
        A.evaluate("""['[data-k=v] [data-v=\"jq\"]','[data-k=undo] [data-v=\"99\"]','[data-k=side] [data-v=\"r\"]','[data-k=total] [data-v=\"0\"]','[data-k=step] [data-v=\"0\"]'].forEach(q=>document.querySelector(q).click())""")
        check('揭棋' in A.inner_text('#pCreate'), '房间设置里有“揭棋”玩法')
        A.evaluate("document.querySelector('#bCreateGo').click()")
        check(wait(lambda: '·' not in A.inner_text('#roomCode'), 20), '房主拿到房间码')
        code = A.inner_text('#roomCode').strip()
        check('揭棋' in A.inner_text('#waitChips'), '等待页标签显示揭棋')
        B, ctxB = page('B', BASE + '?room=' + code)
        check(wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(A, "window.__xq.mode") == 'host', 40), '两位棋手入局')
        fast(A); fast(B)
        check(ev(B, "window.__xq.game.jq") and ev(B, "window.__xq.game.at(1,2).t") == '?', '加入方是揭棋，暗子身份未知')
        check(ev(A, "window.__xq.game.at(1,2).t") == '?', '房主也不知道自己暗子的身份')
        check(wait(lambda: ev(A, "window.__xq.jqReady()") and ev(B, "window.__xq.jqReady()"), 30), '双方交换承诺完成（洗牌就绪）')
        gid = ev(A, "window.__xq.JK.gid")
        check(ev(B, "window.__xq.JK.gid") == gid, '双方局号一致 ' + gid)
        C, ctxC = page('C', BASE + '?room=' + code)
        wait(lambda: ev(C, "!document.getElementById('mName').classList.contains('hidden')"), 40)
        C.evaluate("document.getElementById('nameIn').value='看客'; document.getElementById('nameGo').click()")
        check(wait(lambda: ev(C, "window.__xq.mode") == 'watch', 30), '观众入席')
        fast(C)
        check(ev(C, "window.__xq.game.jq && !window.__xq.JK"), '观众是揭棋局，且没有任何密钥')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        # 1. 红方：炮位暗子隔子打马位暗子（翻自己 + 吃对方暗子）
        hiA = ev(A, "window.__xq.game.at(1,2).hi"); hiB = ev(A, "window.__xq.game.at(1,9).hi")
        check(ev(A, "window.__xq.doMove({from:[1,2],to:[1,9]})"), '红方发出揭子着法')
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 1 and ev(B, 'window.__xq.game.history.length') == 1, 30), '双方都落下这步')
        rvA = ev(A, "window.__xq.game.history[0].rv"); rvB = ev(B, "window.__xq.game.history[0].rv")
        check(rvA and rvA == rvB, f'翻出的兵种双方一致：{rvA}')
        # 用双方密钥核对：红子身份 = 黑方 outer[ 红方 inner[i] ]
        jr = ev(A, f"window.__xq.JK.inner.perm[{hiA}]")
        check(ev(B, f"window.__xq.JK.outer.arr[{jr}]") == rvA, '翻出的兵种与双方洗牌结果相符')
        capA = ev(A, "window.__xq.game.history[0].cap.t"); capB = ev(B, "window.__xq.game.history[0].cap.t")
        jb = ev(B, f"window.__xq.JK.inner.perm[{hiB}]")
        check(capA != '?' and capA == ev(A, f"window.__xq.JK.outer.arr[{jb}]"), f'吃子方（红）知道被吃暗子是：{capA}')
        check(capB == '?', '被吃方（黑）不知道自己被吃的暗子是什么')
        check('know' in ev(A, "document.getElementById('cardMe').querySelector('.caps').innerHTML"), '红方吃子栏显示真身（虚线框）')
        check('>暗<' in ev(B, "document.getElementById('cardOpp').querySelector('.caps').innerHTML"), '黑方看到的是“暗”')
        check(wait(lambda: ev(C, 'window.__xq.game.history.length') == 1, 20), '观众看到这步')
        check(ev(C, "window.__xq.game.history[0].rv") == rvA and ev(C, "window.__xq.game.history[0].cap.t") == '?', '观众看到翻出的子，但看不到被吃暗子')
        check(ev(A, "window.__xq.jqBad") == 0 and ev(B, "window.__xq.jqBad") == 0, '双方校验全部通过')
        # 2. 黑方：车位暗子走一步（只翻自己）
        wait(lambda: ev(B, IDLE) and ev(B, "window.__xq.game.turn") == 'b', 60)
        check(ev(B, "window.__xq.doMove({from:[0,9],to:[0,8]})"), '黑方发出揭子着法')
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 2 and ev(B, 'window.__xq.game.history.length') == 2, 30), '黑方翻子双方同步')
        rv2 = ev(B, "window.__xq.game.history[1].rv")
        check(rv2 and rv2 == ev(A, "window.__xq.game.history[1].rv"), f'黑方翻出：{rv2}')
        wait(lambda: ev(C, 'window.__xq.game.history.length') == 2, 20)
        check(ev(C, "window.__xq.notes.join(' ')") == ev(A, "window.__xq.notes.join(' ')") == ev(B, "window.__xq.notes.join(' ')"), '三方棋谱一致：' + ev(A, "window.__xq.notes.join(' ')"))
        # 3. 悔棋：退回两步，翻开的子重新扣上，被吃的暗子回到棋盘
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        ev(A, "window.__xq.requestUndo()")
        wait(lambda: ev(B, "!document.getElementById('mAsk').classList.contains('hidden')"), 15)
        B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 0 and ev(B, 'window.__xq.game.history.length') == 0, 40), '悔棋双方退回 2 步')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        check(ev(A, "window.__xq.game.at(1,2).h") == 1 and ev(B, "window.__xq.game.at(1,2).t") == rvA, '翻开的子重新扣上（身份双方已知）')
        check(ev(A, "window.__xq.game.at(1,9).t") == capA and ev(B, "window.__xq.game.at(1,9).t") == '?', '被吃的暗子回到棋盘：仍只有红方知道')
        check(ev(A, "window.__xq.Board.pieces.get(window.__xq.game.at(1,2).id).userData.h") == True, '红方棋盘上该子是漆背')
        # 4. 同一着法再走：身份已知，不再需要揭示
        ev(A, "window.__xq.doMove({from:[1,2],to:[1,9]})")
        check(wait(lambda: ev(B, 'window.__xq.game.history.length') == 1, 20) and ev(B, "window.__xq.game.history[0].rv") == rvA, '已知身份的暗子再走，直接同步')
        # 5. 黑方刷新页面（同一设备）→ 用保存的密钥接着下
        wait(lambda: ev(B, IDLE), 60)
        t0 = time.time()
        B.reload(wait_until='domcontentloaded'); wait(lambda: B.evaluate('!!window.__xq'), 30)
        t1 = time.time(); wait(lambda: ev(B, "window.__xq.mode") == 'guest', 60, 0.2); t2 = time.time()
        check(wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(B, 'window.__xq.game.history.length') == 1, 40), '黑方刷新后恢复棋局')
        print('   页面就绪 %.1fs，入座 %.1fs，局面 %.1fs' % (t1 - t0, t2 - t1, time.time() - t2), flush=True)
        print('   刷新恢复用时 %.1fs mode=%s n=%s' % (time.time() - t0, ev(B, "window.__xq.mode"), ev(B, 'window.__xq.game.history.length')), flush=True)
        fast(B)
        check(ev(B, "window.__xq.JK && window.__xq.JK.gid") == gid and ev(A, "window.__xq.JK.gid") == gid, '刷新后仍是同一局（没有重新洗牌）')
        wait(lambda: ev(B, IDLE) and ev(B, "window.__xq.jqReady()"), 60)
        check(ev(B, "window.__xq.doMove({from:[2,6],to:[2,5]})"), '刷新后黑方再翻一子')
        check(wait(lambda: ev(A, 'window.__xq.game.history.length') == 2 and ev(B, 'window.__xq.game.history.length') == 2, 30), '刷新后揭子正常')
        check(ev(A, "window.__xq.game.history[1].rv") == ev(B, "window.__xq.game.history[1].rv"), '刷新后翻出的兵种一致')
        # 6. 黑方换设备（新浏览器）接替入座 → 没有这局的密钥 → 房主重新洗牌开局
        ctxB.close()
        check(wait(lambda: ev(A, "window.__xq.Net.peerState") == 'lost', 40), '房主察觉黑方掉线')
        B2, ctxB2 = page('D', BASE + '?room=' + code)
        if wait(lambda: ev(B2, "!document.getElementById('mAsk').classList.contains('hidden')"), 40):
            B2.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(B2, "window.__xq.mode") == 'guest', 40), '新设备入座')
        check(wait(lambda: ev(A, "window.__xq.JK && window.__xq.JK.gid") != gid and ev(A, 'window.__xq.game.history.length') == 0, 40), '房主重新洗牌开新局')
        fast(B2)
        check(wait(lambda: ev(B2, "window.__xq.JK && window.__xq.JK.gid") == ev(A, "window.__xq.JK.gid") and ev(A, "window.__xq.jqReady()") and ev(B2, "window.__xq.jqReady()"), 40), '新局双方洗牌就绪')
        wait(lambda: ev(A, IDLE) and ev(B2, IDLE), 80)
        ev(A, "window.__xq.doMove({from:[4,3],to:[4,4]})")
        check(wait(lambda: ev(B2, 'window.__xq.game.history.length') == 1 and ev(A, 'window.__xq.game.history.length') == 1, 30), '新局揭子正常')
        check(ev(A, "window.__xq.jqBad") == 0 and ev(B2, "window.__xq.jqBad") == 0, '全程校验通过')
        for k, v in logs.items():
            errs = [l for l in v if 'PAGEERROR' in l or 'rror' in l]
            if errs: print(k, 'errors:', errs[:6]); ok = False
        for b in brs.values(): b.close()
finally:
    mq.terminate(); http.terminate()
print('ALL PASS' if ok else 'SOME FAILED')
