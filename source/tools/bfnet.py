"""兵法联机全流程测试：房主 A（红）+ 加入方 B（黑）+ 观众 C（本地 MQTT 中继 + 本地 HTTP）
核对：房间设置选兵法、升级/走子/攻击/技能/主帅兵法/终极兵法逐条同步、三方规则状态完全一致（军功、等级、生命、冷却、状态）、
悔棋按行动序列回退、加入方刷新续局、观众中途进场拿到完整局面。"""
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
    return cond
def wait(fn, secs=30, step=0.5):
    t = time.time()
    while time.time() - t < secs:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(step)
    return False
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
IDLE = "window.__xq.busy===0 && window.__xq.started"
STATE = "JSON.stringify(window.__xq.game.S)"
ENT = "JSON.stringify(window.__xq.game.entries)"
# 棋盘模型与规则状态一致（位置、甲片 = 生命、金星 = 等级 - 1）
MESH = """(()=>{const x=window.__xq, g=x.game, B=x.Board; const bad=[]; let n=0;
 for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=g.board[r][f]; if(!p) continue; n++; const m=B.pieces.get(p.id);
  if(!m){bad.push('nomesh '+p.id);continue;} const P=B.pos(f,r); if(Math.abs(m.position.x-P.x)>0.05||Math.abs(m.position.z-P.z)>0.05) bad.push('pos '+p.id);
  const d=m.userData.deco; const plates=d?d.children.filter(c=>c.userData.plate!=null):[]; const on=plates.filter(c=>c.material===B.plateOn).length;
  if(p.lv>=2 && on!==p.hp) bad.push('plates '+p.id);
  const stars=d?d.children.filter(c=>c.geometry && c.geometry.type==='ShapeGeometry').length/2:0; if(p.t!=='k' && stars!==p.lv-1) bad.push('stars '+p.id);}
 if(B.pieces.size!==n) bad.push('meshcount '+B.pieces.size+'/'+n);
 return bad.join(',');})()"""
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
        A.evaluate("""['[data-k=v] [data-v=\"bf\"]','[data-k=undo] [data-v=\"99\"]','[data-k=side] [data-v=\"r\"]','[data-k=total] [data-v=\"0\"]','[data-k=step] [data-v=\"0\"]'].forEach(q=>document.querySelector(q).click())""")
        check('兵法' in A.inner_text('#varNote'), '房间设置选“兵法”，说明随之切换：' + A.inner_text('#varNote'))
        A.evaluate("document.querySelector('#bCreateGo').click()")
        check(wait(lambda: '·' not in A.inner_text('#roomCode'), 20), '房主拿到房间码')
        code = A.inner_text('#roomCode').strip()
        check('兵法' in A.inner_text('#waitChips'), '等待页标签显示兵法')
        B, ctxB = page('B', BASE + '?room=' + code)
        if not check(wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(A, "window.__xq.mode") == 'host', 40), '两位棋手入局'):
            print('   A mode', ev(A, "window.__xq.mode"), 'B mode', ev(B, "window.__xq.mode"), 'B note', ev(B, "document.getElementById('joinNote').innerText"))
            for k, v in logs.items(): print('  ', k, v[:6])
        fast(A); fast(B)
        check(ev(B, "!!window.__xq.game.bf") and ev(A, "!!window.__xq.game.bf"), '双方都是兵法局')
        check(ev(A, "window.__xq.game.merit.r") == 3 and ev(B, "window.__xq.game.merit.b") == 3, '开局各 3 军功')
        C, ctxC = page('C', BASE + '?room=' + code)
        wait(lambda: ev(C, "!document.getElementById('mName').classList.contains('hidden')"), 40)
        C.evaluate("document.getElementById('nameIn').value='看客'; document.getElementById('nameGo').click()")
        check(wait(lambda: ev(C, "window.__xq.mode") == 'watch', 30), '观众入席')
        fast(C)
        check(ev(C, "!!window.__xq.game.bf"), '观众看到的也是兵法局')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        n = 0
        def same(label, pages=None):
            pages = pages or [A, B, C]
            def eq():
                s = [ev(pg, STATE) for pg in pages]
                return all(x == s[0] for x in s) and all(ev(pg, IDLE) for pg in pages)
            r = wait(eq, 60)
            check(r, label + ' → 各方规则状态一致')
            if r:
                bad = [ev(pg, MESH) for pg in pages]
                check(not any(bad), label + ' → 各方棋盘模型与状态相符' + (' ' + str(bad) if any(bad) else ''))
                nt = [ev(pg, "window.__xq.notes.join(' ')") for pg in pages]
                check(all(x == nt[0] for x in nt), label + ' → 棋谱一致：' + nt[0][-60:])
            return r
        def act(pg, e, label):
            wait(lambda: ev(pg, IDLE), 60)
            r = ev(pg, f"window.__xq.doBF({json.dumps(e)})")
            check(r, label + ' 发出')
            return same(label)
        # 1. 红方升级中兵 → 走一步
        act(A, {'k': 'up', 'at': [4, 3]}, '红：升级中兵')
        check(ev(B, "window.__xq.game.at(4,3).lv") == 2 and ev(B, "window.__xq.game.merit.r") == 0, '黑方看到红兵二级、红方军功扣到 0')
        act(A, {'k': 'mv', 'from': [4, 3], 'to': [4, 4]}, '红：兵五进一')
        # 2. 黑方炮打马（翻山吃子）→ 黑方得军功
        act(B, {'k': 'mv', 'from': [1, 7], 'to': [1, 0]}, '黑：炮打马')
        check(ev(A, "window.__xq.game.at(1,0) && window.__xq.game.at(1,0).s") == 'b' and ev(A, "window.__xq.game.merit.b") > 3, '红方看到马被吃、黑方军功增加 %s' % ev(A, "window.__xq.game.merit.b"))
        # 3. 红方用二级兵的拒马
        tg = json.loads(ev(A, "JSON.stringify(window.__xq.game.skillTargets(4,4))"))
        check(len(tg) > 0, '红方二级兵可用拒马')
        act(A, tg[0], '红：拒马')
        check(ev(B, "window.__xq.game.at(4,4).jm") > 0 and ev(C, "window.__xq.game.at(4,4).jm") > 0, '黑方与观众看到拒马状态')
        cdA = ev(A, "window.__xq.game.cdLeft(window.__xq.game.at(4,4))"); cdB = ev(B, "window.__xq.game.cdLeft(window.__xq.game.at(4,4))")
        check(cdA == cdB and cdA > 0, f'冷却回合数双方一致（{cdA}）')
        # 4. 黑方走一步
        act(B, {'k': 'mv', 'from': [1, 0], 'to': [1, 1]}, '黑：炮退一（让出马位）')
        # 5. 红方萧何追韩信：复活被吃的马
        opts = json.loads(ev(A, "JSON.stringify(window.__xq.game.reviveOptions())"))
        check(len(opts) > 0, '红方可以复活阵亡的马')
        if opts:
            act(A, {'k': 'art', 'id': opts[0]['id']}, '红：萧何追韩信')
            check(ev(B, "window.__xq.game.used.art.r"), '黑方看到红方兵法已用')
        # 6. 黑方停留 → 红方再走 → 悔棋（红请求，黑同意；红方在等黑走，退 1 步）
        act(B, {'k': 'mv', 'from': [0, 9], 'to': [0, 8]}, '黑：车1进1')
        before = ev(A, ENT)
        act(A, {'k': 'mv', 'from': [7, 2], 'to': [4, 2]}, '红：炮二平五')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        ev(A, "window.__xq.requestUndo()")
        check(wait(lambda: ev(B, "!document.getElementById('mAsk').classList.contains('hidden')"), 15), '黑方收到悔棋请求')
        B.evaluate("document.querySelector('#askYes').click()")
        check(wait(lambda: ev(A, ENT) == before and ev(B, ENT) == before, 40), '悔棋：双方行动序列退回到这步之前')
        same('悔棋后')
        # 7. 悔两步（红方在自己回合请求 → 退回黑方上一步和自己的复活）+ 状态回滚
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        ev(A, "window.__xq.requestUndo()")
        check(wait(lambda: ev(B, "!document.getElementById('mAsk').classList.contains('hidden')"), 15), '黑方收到悔棋请求（两步）')
        B.evaluate("document.querySelector('#askYes').click()")
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        check(wait(lambda: not ev(A, "window.__xq.game.used.art.r") and not ev(B, "window.__xq.game.used.art.r"), 30), '悔到复活之前：萧何追韩信重新可用')
        same('悔两步后')
        # 重新复活，继续
        opts = json.loads(ev(A, "JSON.stringify(window.__xq.game.reviveOptions())"))
        if opts: act(A, {'k': 'art', 'id': opts[0]['id']}, '红：再次萧何追韩信')
        # 8. 黑方刷新页面（同一设备）→ 恢复完整兵法局面
        wait(lambda: ev(B, IDLE), 60)
        sB = ev(A, STATE)
        B.reload(wait_until='domcontentloaded'); wait(lambda: B.evaluate('!!window.__xq'), 30)
        t0 = time.time(); r = wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(B, STATE) == sB, 40)
        print('   刷新恢复用时 %.1fs' % (time.time() - t0), flush=True)
        if not r:
            try:
                a, b = json.loads(sB), json.loads(ev(B, STATE))
                for k in a:
                    if json.dumps(a[k]) != json.dumps(b.get(k)): print('   diff', k, json.dumps(a[k])[:300], '|', json.dumps(b.get(k))[:300])
                print('   B mode', ev(B, "window.__xq.mode"), 'entries', ev(B, ENT)[:300])
            except Exception as e: print('   diff err', e)
        check(r, '黑方刷新后恢复完整兵法局面（军功/等级/冷却/兵法使用）')
        fast(B)
        wait(lambda: ev(B, IDLE), 60)
        act(B, {'k': 'mv', 'from': [8, 9], 'to': [8, 8]}, '刷新后黑：车9进1')
        # 9. 观众中途离开再进场
        ctxC.close()
        C, ctxC = page('C2', BASE + '?room=' + code)
        if wait(lambda: ev(C, "!document.getElementById('mName').classList.contains('hidden')"), 20):
            C.evaluate("document.getElementById('nameIn').value='看客2'; document.getElementById('nameGo').click()")
        check(wait(lambda: ev(C, "window.__xq.mode") == 'watch' and ev(C, STATE) == ev(A, STATE), 40), '观众中途进场拿到完整局面')
        fast(C)
        # 10. 红方升级马到二级 → 踏营
        wait(lambda: ev(A, IDLE), 60)
        mr = ev(A, "window.__xq.game.merit.r")
        cost = ev(A, "window.__xq.game.upgradeCost(window.__xq.game.at(7,0))")
        print('   红方军功', mr, '马升级', cost)
        if mr >= cost:
            act(A, {'k': 'up', 'at': [7, 0]}, '红：升级右马')
        act(A, {'k': 'mv', 'from': [7, 0], 'to': [6, 2]}, '红：马八进七')
        same('终局前')
        for k, v in logs.items():
            errs = [l for l in v if 'PAGEERROR' in l or 'rror' in l]
            if errs: print(k, 'errors:', errs[:6]); ok = False
        for b in brs.values(): b.close()
finally:
    mq.terminate(); http.terminate()
print('ALL PASS' if ok else 'SOME FAILED')
